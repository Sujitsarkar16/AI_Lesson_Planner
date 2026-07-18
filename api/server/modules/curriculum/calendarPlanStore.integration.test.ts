// Authenticated-API integration coverage for Academic Calendar Optimization persistence
// (task 10). Runs against a DEDICATED non-production database (`<db>_caltest`, dropped on
// completion) using the configured MONGODB_URI. Exercises the store layer that the
// authenticated route handler calls with its auth-derived userId, so owner isolation,
// 404 concealment, 409 stale-write / no-write rollback, version-history audit, and
// per-disruption recalculation are all verified against real MongoDB transactions.
//
// Run with: npm run test:integration
//   (node --env-file=.env --experimental-strip-types --test .../calendarPlanStore.integration.test.ts)
// Skips gracefully (with a clear message) when MONGODB_URI is not configured.

// Use a dedicated non-production database name BEFORE any store call (getDatabase reads
// this env var at call time). This never touches the real application database.
process.env.MONGODB_DB_NAME = `${process.env.MONGODB_DB_NAME || 'ai_lesson_planner'}_caltest`;

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ObjectId } from 'mongodb';
import { getDatabase, getMongoClient } from '../../shared/database.js';
import {
  createPlan,
  getCurrentPlan,
  getPlanVersion,
  listPlanVersionSummaries,
  replacePlanInput,
  InputRevisionConflictError,
  PlanNotFoundError,
  PLANS_COLLECTION,
  PLAN_INPUTS_COLLECTION,
  PLAN_VERSIONS_COLLECTION,
} from './calendarPlanStore.js';
import type { AcademicPlanInput, CalendarBlock } from './calendarOptimization.js';

const HAS_DB = Boolean(process.env.MONGODB_URI);
const runOptions = HAS_DB ? {} : { skip: 'MONGODB_URI not configured; skipping live-database integration tests.' };

function baseInput(overrides: Partial<AcademicPlanInput> = {}): AcademicPlanInput {
  return {
    plan_id: 'draft',
    board: 'CBSE',
    grade: '10',
    subject: 'Mathematics',
    academic_year_start: '2024-01-01',
    academic_year_end: '2024-12-31',
    required_completion_date: '2024-02-05', // 6 Mondays: Jan1/8/15/22/29, Feb5.
    weekly_periods: { Monday: 1 },
    chapters: [
      { chapter_id: 'ch1', title: 'Ch1', difficulty: 3, required_periods: 2, prerequisite_ids: [], sequence_order: 1, standard_ids: [] },
      { chapter_id: 'ch2', title: 'Ch2', difficulty: 4, required_periods: 2, prerequisite_ids: ['ch1'], sequence_order: 2, standard_ids: [] },
    ],
    holidays: [],
    examinations: [],
    school_events: [],
    teacher_leave: [],
    revision_requirements: [],
    locked_allocations: [],
    ...overrides,
  };
}

const stripVolatile = (version: { calculated_at?: string }) => { const { calculated_at, ...rest } = version; return rest; };

before(async () => {
  if (!HAS_DB) return;
  // Start from a clean dedicated database.
  const db = await getDatabase();
  await db.dropDatabase();
});

after(async () => {
  if (!HAS_DB) return;
  const db = await getDatabase();
  await db.dropDatabase();
  await (await getMongoClient()).close();
});

test('create persists revision 1 / version 1 and returns the calculated plan', runOptions, async () => {
  const userId = new ObjectId();
  const plan = await createPlan(userId, baseInput());
  assert.equal(plan.currentInputRevision, 1);
  assert.equal(plan.currentVersion, 1);
  assert.equal(plan.version.total_periods_available, 6);
  assert.equal(plan.version.total_periods_required, 4);
  assert.equal(plan.version.period_shortfall, 0);
  assert.equal(plan.version.syllabus_completion_risk, 'Low');
});

test('owner isolation: another user cannot read the plan (404 concealment via null)', runOptions, async () => {
  const owner = new ObjectId();
  const other = new ObjectId();
  const plan = await createPlan(owner, baseInput());
  assert.ok(await getCurrentPlan(owner, new ObjectId(plan.planId)));
  assert.equal(await getCurrentPlan(other, new ObjectId(plan.planId)), null);
  assert.equal(await getPlanVersion(other, new ObjectId(plan.planId), 1), null);
  assert.deepEqual(await listPlanVersionSummaries(other, new ObjectId(plan.planId)), []);
});

test('unknown plan id returns null (never throws) for the owner too', runOptions, async () => {
  const userId = new ObjectId();
  assert.equal(await getCurrentPlan(userId, new ObjectId()), null);
});

test('replace advances the version and keeps prior versions for audit', runOptions, async () => {
  const userId = new ObjectId();
  const created = await createPlan(userId, baseInput());
  const planId = new ObjectId(created.planId);

  const replaced = await replacePlanInput(userId, planId, baseInput({ subject: 'Physics' }), created.currentInputRevision);
  assert.equal(replaced.currentInputRevision, 2);
  assert.equal(replaced.currentVersion, 2);

  // Prior immutable version 1 remains retrievable (Requirement 7.4 / 8.3).
  const v1 = await getPlanVersion(userId, planId, 1);
  assert.ok(v1);
  assert.equal(v1!.version, 1);
  const history = await listPlanVersionSummaries(userId, planId);
  assert.deepEqual(history.map((h) => h.version), [2, 1]);
});

test('409 stale write throws and does NOT advance pointers or write new docs (rollback)', runOptions, async () => {
  const userId = new ObjectId();
  const created = await createPlan(userId, baseInput());
  const planId = new ObjectId(created.planId);

  await assert.rejects(
    () => replacePlanInput(userId, planId, baseInput({ subject: 'Chemistry' }), 99),
    (error: unknown) => error instanceof InputRevisionConflictError && error.currentInputRevision === 1,
  );

  // Pointers unchanged and no orphaned revision/version documents were committed.
  const current = await getCurrentPlan(userId, planId);
  assert.equal(current!.currentInputRevision, 1);
  assert.equal(current!.currentVersion, 1);
  const db = await getDatabase();
  assert.equal(await db.collection(PLAN_INPUTS_COLLECTION).countDocuments({ userId, planId }), 1);
  assert.equal(await db.collection(PLAN_VERSIONS_COLLECTION).countDocuments({ userId, planId }), 1);
});

test('replace on an unknown/non-owned plan throws PlanNotFoundError', runOptions, async () => {
  const owner = new ObjectId();
  const other = new ObjectId();
  const created = await createPlan(owner, baseInput());
  await assert.rejects(() => replacePlanInput(other, new ObjectId(created.planId), baseInput(), 1), PlanNotFoundError);
});

test('recalculates after each disruption type and preserves an unaffected lock', runOptions, async () => {
  const userId = new ObjectId();
  // Lock ch1 on Jan1; add a disruption on a DIFFERENT date so the lock is unaffected.
  const withLock = baseInput({
    required_completion_date: '2024-03-04', // more Mondays for slack
    locked_allocations: [{ lock_id: 'lk1', date: '2024-01-01', period_index: 0, allocation_kind: 'Chapter', target_id: 'ch1' }],
  });
  const created = await createPlan(userId, withLock);
  const planId = new ObjectId(created.planId);

  const disruptions: Array<{ key: keyof AcademicPlanInput; block: CalendarBlock }> = [
    { key: 'holidays', block: { block_id: 'h1', kind: 'Holiday', start_date: '2024-01-15', end_date: '2024-01-15', blocks_subject: true } },
    { key: 'examinations', block: { block_id: 'e1', kind: 'Examination', start_date: '2024-01-22', end_date: '2024-01-22', blocks_subject: true } },
    { key: 'school_events', block: { block_id: 's1', kind: 'SchoolEvent', start_date: '2024-01-29', end_date: '2024-01-29', blocks_subject: true } },
    { key: 'teacher_leave', block: { block_id: 't1', kind: 'TeacherLeave', start_date: '2024-02-05', end_date: '2024-02-05', blocks_subject: true } },
  ];

  let revision = created.currentInputRevision;
  let expectedVersion = created.currentVersion;
  let accumulated = withLock;
  for (const { key, block } of disruptions) {
    accumulated = { ...accumulated, [key]: [...(accumulated[key] as CalendarBlock[]), block] };
    const result = await replacePlanInput(userId, planId, accumulated, revision);
    expectedVersion += 1;
    assert.equal(result.currentVersion, expectedVersion, `${block.kind} must produce a new version`);
    // The lock on Jan1 (never blocked by any of these disruptions) is preserved.
    const lockAllocation = result.version.allocations.find((a) => a.date === '2024-01-01' && a.status === 'Locked');
    assert.ok(lockAllocation, `${block.kind}: unaffected lock must persist`);
    assert.equal(lockAllocation!.target_id, 'ch1');
    // The disrupted date carries no scheduled/locked allocation.
    assert.ok(!result.version.allocations.some((a) => a.date === block.start_date), `${block.kind}: blocked date must be cleared`);
    revision += 1;
  }
});

test('normalized duplicate submissions are identical regardless of array order', runOptions, async () => {
  const userId = new ObjectId();
  const ordered = baseInput();
  const shuffled = baseInput({ chapters: [...baseInput().chapters].reverse() });
  const a = await createPlan(userId, ordered);
  const b = await createPlan(userId, shuffled);
  // Different plan ids / timestamps, but the deterministic computed content is identical.
  assert.deepEqual(stripVolatile(a.version), stripVolatile(b.version));
});

// Non-generation boundary (Requirement 9.3): a source-level assertion that the calendar
// feature never reaches a generative-AI provider or the /generate endpoint.
test('no calendar module references Gemini / genai / the /generate endpoint', async () => {
  // Read the real source files from the repo root (npm scripts run from there), not the
  // compiled dist-test location.
  const sourceDir = join(process.cwd(), 'api', 'server', 'modules', 'curriculum');
  const files = ['handler.ts', 'calendarPlanStore.ts', 'calendarOptimization.ts'];
  for (const file of files) {
    const source = await readFile(join(sourceDir, file), 'utf8');
    assert.ok(!/gemini/i.test(source), `${file} must not reference Gemini`);
    assert.ok(!/genai/i.test(source), `${file} must not reference genai`);
    assert.ok(!/['"`]\/generate/.test(source), `${file} must not reference the /generate endpoint`);
    assert.ok(!/handleGeneration|geminiService/.test(source), `${file} must not import a generation service`);
  }
});
