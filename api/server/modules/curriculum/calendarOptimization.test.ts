// Dependency-free scheduler checks for the Academic Calendar Optimization pure module
// (task 9 of the academic-calendar-optimization spec). Uses Node's built-in test runner
// (`node:test`) with fixed deterministic fixtures - no test framework, no fast-check.
// Run with: npm run test:scheduler
//   (node --experimental-strip-types --test api/server/modules/curriculum/calendarOptimization.test.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlanInput,
  validatePlanInput,
  recalculatePlan,
  type AcademicPlanInput,
  type Chapter,
  type RevisionRequirement,
  type LockedAllocation,
} from './calendarOptimization.js';

const CTX = { input_revision: 1, calculated_at: '2024-01-01T00:00:00.000Z' };

// --- Fixtures for validation tests (full academic year) ---
function validationInput(): AcademicPlanInput {
  return {
    plan_id: 'plan-1',
    board: 'CBSE',
    grade: '8',
    subject: 'Mathematics',
    academic_year_start: '2026-04-01',
    academic_year_end: '2027-03-31',
    required_completion_date: '2027-02-15',
    weekly_periods: { Monday: 2, Wednesday: 1, Friday: 2 },
    chapters: [
      { chapter_id: 'fractions', title: 'Fractions', difficulty: 3, required_periods: 8, prerequisite_ids: [], sequence_order: 1, standard_ids: [] },
      { chapter_id: 'algebra', title: 'Algebra', difficulty: 5, required_periods: 12, prerequisite_ids: ['fractions'], sequence_order: 2, standard_ids: [] },
    ],
    holidays: [{ block_id: 'winter-break', kind: 'Holiday', start_date: '2027-01-12', end_date: '2027-01-16', blocks_subject: true }],
    examinations: [],
    school_events: [],
    teacher_leave: [],
    revision_requirements: [{ revision_id: 'final', title: 'Final Revision', required_periods: 4, deadline: '2027-02-15', chapter_ids: ['fractions', 'algebra'] }],
    locked_allocations: [],
  };
}

// --- Fixtures for scheduling/recommendation tests (Monday-only, short horizon) ---
function scheduleInput(overrides: Partial<AcademicPlanInput> = {}): AcademicPlanInput {
  return {
    plan_id: 'plan-1',
    board: 'CBSE',
    grade: '8',
    subject: 'Mathematics',
    academic_year_start: '2024-01-01',
    academic_year_end: '2024-12-31',
    required_completion_date: '2024-01-22',
    weekly_periods: { Monday: 1 },
    chapters: [],
    holidays: [],
    examinations: [],
    school_events: [],
    teacher_leave: [],
    revision_requirements: [],
    locked_allocations: [],
    ...overrides,
  };
}

function chapter(id: string, required: number, opts: Partial<Chapter> = {}): Chapter {
  return { chapter_id: id, title: id, difficulty: 3, required_periods: required, prerequisite_ids: [], sequence_order: 0, standard_ids: [], ...opts };
}

// ===========================================================================
// Normalization + validation (Requirement 1, 4, 8)
// ===========================================================================

test('valid input normalizes (sorted by id) and validates with no diagnostics', () => {
  const normalized = normalizePlanInput(validationInput());
  assert.deepEqual(normalized.chapters.map((c) => c.chapter_id), ['algebra', 'fractions']);
  assert.deepEqual(validatePlanInput(normalized), []);
});

test('out-of-range completion date and out-of-year block are both reported', () => {
  const input = validationInput();
  input.required_completion_date = '2027-04-01';
  input.holidays = [{ block_id: 'oob', kind: 'Holiday', start_date: '2025-01-01', end_date: '2025-01-02', blocks_subject: true }];
  const codes = validatePlanInput(normalizePlanInput(input)).map((d) => d.code);
  assert.ok(codes.includes('invalid_date_range'));
  assert.ok(codes.includes('out_of_year_calendar_block'));
});

test('duplicate chapter ids are reported', () => {
  const input = validationInput();
  input.chapters = [...input.chapters, { ...input.chapters[0] }];
  assert.ok(validatePlanInput(normalizePlanInput(input)).some((d) => d.code === 'duplicate_id' && d.target_id === 'fractions'));
});

test('difficulty outside 1..5 is reported', () => {
  const input = validationInput();
  (input.chapters.find((c) => c.chapter_id === 'fractions') as any).difficulty = 9;
  assert.ok(validatePlanInput(normalizePlanInput(input)).some((d) => d.code === 'invalid_numeric_value' && d.target_id === 'fractions' && d.path?.endsWith('.difficulty')));
});

test('non-positive required_periods is reported', () => {
  const input = validationInput();
  input.chapters.find((c) => c.chapter_id === 'fractions')!.required_periods = 0;
  assert.ok(validatePlanInput(normalizePlanInput(input)).some((d) => d.code === 'invalid_numeric_value' && d.target_id === 'fractions' && d.path?.endsWith('.required_periods')));
});

test('prerequisite cycle is detected for every member of the cycle', () => {
  const input = validationInput();
  input.chapters = [
    { chapter_id: 'a', title: 'A', difficulty: 1, required_periods: 1, prerequisite_ids: ['b'], sequence_order: 1, standard_ids: [] },
    { chapter_id: 'b', title: 'B', difficulty: 1, required_periods: 1, prerequisite_ids: ['a'], sequence_order: 2, standard_ids: [] },
  ];
  input.revision_requirements = [];
  const cyclic = validatePlanInput(normalizePlanInput(input)).filter((d) => d.code === 'cyclic_prerequisite').map((d) => d.target_id);
  assert.deepEqual(new Set(cyclic), new Set(['a', 'b']));
});

test('unknown prerequisite is reported without a false cycle positive', () => {
  const input = validationInput();
  input.chapters[1].prerequisite_ids = ['fractions', 'does-not-exist'];
  const diagnostics = validatePlanInput(normalizePlanInput(input));
  assert.ok(diagnostics.some((d) => d.code === 'unknown_prerequisite' && d.target_id === 'algebra'));
  assert.ok(!diagnostics.some((d) => d.code === 'cyclic_prerequisite'));
});

test('lock targeting a blocked slot is rejected', () => {
  const input = validationInput();
  input.locked_allocations = [{ lock_id: 'lock-1', date: '2027-01-13', period_index: 0, allocation_kind: 'Chapter', target_id: 'fractions' }];
  assert.ok(validatePlanInput(normalizePlanInput(input)).some((d) => d.code === 'lock_target_unavailable' && d.target_id === 'lock-1'));
});

test('lock violating prerequisite-completion ordering is rejected', () => {
  const input = validationInput();
  input.locked_allocations = [
    { lock_id: 'lock-algebra', date: '2026-04-06', period_index: 0, allocation_kind: 'Chapter', target_id: 'algebra' },
    { lock_id: 'lock-fractions', date: '2026-04-08', period_index: 0, allocation_kind: 'Chapter', target_id: 'fractions' },
  ];
  assert.ok(validatePlanInput(normalizePlanInput(input)).some((d) => d.code === 'lock_conflict' && d.target_id === 'lock-algebra'));
});

// ===========================================================================
// Scheduling engine (Requirements 2, 3, 4, 5)
// ===========================================================================

test('exact totals, unique slots, weekday expansion, and prerequisite-safe ordering', () => {
  const input = scheduleInput({ chapters: [chapter('ch1', 2, { sequence_order: 1 }), chapter('ch2', 2, { prerequisite_ids: ['ch1'], sequence_order: 2 })] });
  const plan = recalculatePlan(input, CTX);
  assert.equal(plan.total_periods_available, 4);
  assert.equal(plan.total_periods_required, 4);
  assert.equal(plan.total_periods_scheduled, 4);
  assert.equal(plan.period_shortfall, 0);
  assert.equal(plan.syllabus_completion_risk, 'Low');
  assert.equal(plan.completion_date, '2024-01-22');
  const keys = plan.allocations.map((a) => `${a.date}#${a.period_index}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(plan.allocations.map((a) => a.weekday), ['Monday', 'Monday', 'Monday', 'Monday']);
  assert.deepEqual(plan.allocations.filter((a) => a.target_id === 'ch1').map((a) => a.date), ['2024-01-01', '2024-01-08']);
  assert.deepEqual(plan.allocations.filter((a) => a.target_id === 'ch2').map((a) => a.date), ['2024-01-15', '2024-01-22']);
  assert.deepEqual(plan.diagnostics, []);
});

test('inclusive block removes exactly the covered slot', () => {
  const input = scheduleInput({
    chapters: [chapter('ch1', 2)],
    holidays: [{ block_id: 'h1', kind: 'Holiday', start_date: '2024-01-08', end_date: '2024-01-08', blocks_subject: true }],
  });
  const plan = recalculatePlan(input, CTX);
  assert.equal(plan.total_periods_available, 3);
  assert.ok(!plan.allocations.some((a) => a.date === '2024-01-08'));
});

test('locked Chapter allocation reserves capacity and pre-fills scheduled count', () => {
  const locks: LockedAllocation[] = [{ lock_id: 'lock-1', date: '2024-01-01', period_index: 0, allocation_kind: 'Chapter', target_id: 'ch1' }];
  const plan = recalculatePlan(scheduleInput({ chapters: [chapter('ch1', 2)], locked_allocations: locks }), CTX);
  const locked = plan.allocations.find((a) => a.date === '2024-01-01');
  assert.equal(locked?.status, 'Locked');
  assert.equal(locked?.target_id, 'ch1');
  assert.deepEqual(plan.allocations.filter((a) => a.target_id === 'ch1').map((a) => a.date), ['2024-01-01', '2024-01-08']);
  assert.equal(plan.total_periods_scheduled, 2);
  assert.equal(plan.period_shortfall, 0);
});

test('LockedActivity consumes capacity but is not syllabus work', () => {
  const locks: LockedAllocation[] = [{ lock_id: 'lock-a', date: '2024-01-08', period_index: 0, allocation_kind: 'LockedActivity', target_id: 'assembly' }];
  const plan = recalculatePlan(scheduleInput({
    chapters: [chapter('ch1', 2, { sequence_order: 1 }), chapter('ch2', 2, { prerequisite_ids: ['ch1'], sequence_order: 2 })],
    locked_allocations: locks,
  }), CTX);
  assert.equal(plan.total_periods_available, 4);
  assert.equal(plan.total_periods_required, 4);
  assert.equal(plan.total_periods_scheduled, 3);
  assert.equal(plan.period_shortfall, 1);
  const activity = plan.allocations.find((a) => a.date === '2024-01-08');
  assert.equal(activity?.status, 'Locked');
  assert.equal(activity?.allocation_kind, 'LockedActivity');
  assert.ok(plan.diagnostics.some((d) => d.code === 'unmet_periods' && d.target_id === 'ch2'));
  assert.ok(plan.diagnostics.some((d) => d.code === 'deadline_miss' && d.target_id === 'ch2'));
});

test('risk Critical when a required target cannot be scheduled at all (structural deadlock)', () => {
  // A single Monday slot; ch1 consumes it and ch2 (depends on ch1) receives zero periods.
  const plan = recalculatePlan(scheduleInput({
    required_completion_date: '2024-01-01',
    chapters: [chapter('ch1', 1, { sequence_order: 1 }), chapter('ch2', 1, { prerequisite_ids: ['ch1'], sequence_order: 2 })],
  }), CTX);
  assert.equal(plan.total_periods_available, 1);
  assert.equal(plan.total_periods_required, 2);
  assert.equal(plan.allocations.filter((a) => a.target_id === 'ch2').length, 0);
  assert.equal(plan.syllabus_completion_risk, 'Critical');
  assert.equal(plan.completion_date, undefined);
});

test('risk High when capacity is insufficient but every target makes some progress', () => {
  const plan = recalculatePlan(scheduleInput({ required_completion_date: '2024-01-08', chapters: [chapter('ch1', 5)] }), CTX);
  assert.equal(plan.total_periods_available, 2);
  assert.equal(plan.total_periods_required, 5);
  assert.equal(plan.allocations.filter((a) => a.target_id === 'ch1').length, 2); // partial, not zero -> not Critical
  assert.equal(plan.syllabus_completion_risk, 'High');
  assert.equal(plan.completion_date, undefined);
});

test('risk Medium when capacity is sufficient overall but a revision deadline is missed', () => {
  const revision: RevisionRequirement = { revision_id: 'final', title: 'Final', required_periods: 3, deadline: '2024-02-05', chapter_ids: ['ch1', 'ch2'] };
  const plan = recalculatePlan(scheduleInput({
    required_completion_date: '2024-04-01',
    chapters: [chapter('ch1', 2, { sequence_order: 1 }), chapter('ch2', 2, { prerequisite_ids: ['ch1'], sequence_order: 2 })],
    revision_requirements: [revision],
  }), CTX);
  assert.equal(plan.total_periods_required, 7);
  assert.equal(plan.period_shortfall, 1);
  assert.equal(plan.syllabus_completion_risk, 'Medium');
});

test('determinism: identical input yields identical output and does not mutate input', () => {
  const input = scheduleInput({ chapters: [chapter('ch1', 2, { sequence_order: 1 }), chapter('ch2', 2, { prerequisite_ids: ['ch1'], sequence_order: 2 })] });
  const first = recalculatePlan(input, CTX);
  const second = recalculatePlan(input, CTX);
  assert.deepEqual(first, second);
  assert.deepEqual(input.chapters.map((c) => c.chapter_id), ['ch1', 'ch2']);
});

// ===========================================================================
// Recommendations (Requirement 6)
// ===========================================================================

test('a feasible plan produces zero recommendations', () => {
  const plan = recalculatePlan(scheduleInput({ chapters: [chapter('ch1', 2, { sequence_order: 1 }), chapter('ch2', 2, { prerequisite_ids: ['ch1'], sequence_order: 2 })] }), CTX);
  assert.equal(plan.period_shortfall, 0);
  assert.deepEqual(plan.recommendations, []);
});

test('no AllocateFirstCompatiblePeriods when no unclaimed slot remains before the deadline', () => {
  const plan = recalculatePlan(scheduleInput({ required_completion_date: '2024-01-29', chapters: [chapter('ch1', 6)] }), CTX);
  assert.equal(plan.period_shortfall, 1);
  assert.ok(!plan.recommendations.some((r) => r.type === 'AllocateFirstCompatiblePeriods'));
});

test('CombineIntroductorySessions and MoveEligibleActivitiesToHomework gate on declared capacity', () => {
  const plan = recalculatePlan(scheduleInput({
    required_completion_date: '2024-01-08',
    chapters: [chapter('intro', 3, { is_introductory: true, introductory_combinable_periods: 2, homework_eligible_activity_periods: 1, sequence_order: 1 })],
  }), CTX);
  assert.equal(plan.period_shortfall, 1);
  const types = plan.recommendations.map((r) => r.type);
  assert.ok(types.includes('CombineIntroductorySessions'));
  assert.ok(types.includes('MoveEligibleActivitiesToHomework'));
  assert.ok(!types.includes('AllocateFirstCompatiblePeriods'));
  for (const rec of plan.recommendations) {
    assert.equal(rec.target_id, 'intro');
    assert.equal(rec.affected_periods, 1);
    assert.ok(rec.diagnostic_ids.length > 0);
    assert.equal(rec.projected_shortfall_if_accepted, 0);
  }
});

test('zero declared capacity suppresses the capacity-based recommendations', () => {
  const plan = recalculatePlan(scheduleInput({
    required_completion_date: '2024-01-08',
    chapters: [chapter('plain', 3, { is_introductory: true, introductory_combinable_periods: 0, homework_eligible_activity_periods: 0 })],
  }), CTX);
  const types = plan.recommendations.map((r) => r.type);
  assert.ok(!types.includes('CombineIntroductorySessions'));
  assert.ok(!types.includes('MoveEligibleActivitiesToHomework'));
});

test('ReserveFinalRevisionPeriods is emitted for an at-risk revision', () => {
  const revision: RevisionRequirement = { revision_id: 'final', title: 'Final', required_periods: 8, deadline: '2024-02-05', chapter_ids: ['ch1', 'ch2'] };
  const plan = recalculatePlan(scheduleInput({
    required_completion_date: '2024-04-01',
    chapters: [chapter('ch1', 2, { sequence_order: 1 }), chapter('ch2', 2, { prerequisite_ids: ['ch1'], sequence_order: 2 })],
    revision_requirements: [revision],
  }), CTX);
  const rec = plan.recommendations.find((r) => r.type === 'ReserveFinalRevisionPeriods' && r.target_id === 'final');
  assert.ok(rec);
  assert.ok(rec!.diagnostic_ids.length > 0);
});

test('recommendations sort by deadline, then unmet desc, then target id', () => {
  const plan = recalculatePlan(scheduleInput({
    required_completion_date: '2024-01-08',
    chapters: [chapter('bbb', 2, { sequence_order: 1 }), chapter('aaa', 5, { sequence_order: 1 })],
  }), CTX);
  assert.equal(plan.period_shortfall, 5);
  const targetOrder = plan.recommendations.map((r) => r.target_id);
  const firstBbb = targetOrder.indexOf('bbb');
  const lastAaa = targetOrder.lastIndexOf('aaa');
  assert.ok(firstBbb === -1 || lastAaa < firstBbb, 'aaa (higher unmet) must sort before bbb');
});

test('recommendations are pure and deterministic across repeated calls', () => {
  const input = scheduleInput({
    required_completion_date: '2024-01-08',
    chapters: [chapter('intro', 3, { is_introductory: true, introductory_combinable_periods: 2, homework_eligible_activity_periods: 1 })],
  });
  const first = recalculatePlan(input, CTX);
  const second = recalculatePlan(input, CTX);
  assert.deepEqual(first.recommendations, second.recommendations);
});

// ===========================================================================
// Task 11 end-to-end fixture: 118 available / 126 required
// ===========================================================================

test('118-available / 126-required fixture returns High risk, shortfall 8, and ordered recovery advice', () => {
  // Monday x2 periods across 59 Mondays (2024-01-01 .. 2025-02-10) = 118 usable slots.
  // Seven independent 18-period chapters = 126 required. The last chapter by id (c7)
  // absorbs the 8-period deficit and carries teacher-declared recovery capacity.
  const chapters = Array.from({ length: 7 }, (_, i) =>
    chapter(`c${i + 1}`, 18, { sequence_order: i + 1, ...(i === 6 ? { is_introductory: true, introductory_combinable_periods: 4, homework_eligible_activity_periods: 2 } : {}) })
  );
  const plan = recalculatePlan(scheduleInput({
    academic_year_start: '2024-01-01',
    academic_year_end: '2025-12-31',
    required_completion_date: '2025-02-10',
    weekly_periods: { Monday: 2 },
    chapters,
  }), CTX);
  assert.equal(plan.total_periods_available, 118);
  assert.equal(plan.total_periods_required, 126);
  assert.equal(plan.total_periods_scheduled, 118);
  assert.equal(plan.period_shortfall, 8);
  assert.equal(plan.syllabus_completion_risk, 'High');
  // c7 is the only unmet target and produces deterministic, applicable recovery advice
  // (no AllocateFirstCompatiblePeriods since every usable slot is already consumed).
  assert.ok(plan.recommendations.length > 0);
  assert.ok(plan.recommendations.every((r) => r.target_id === 'c7'));
  assert.deepEqual(plan.recommendations.map((r) => r.type), ['CombineIntroductorySessions', 'MoveEligibleActivitiesToHomework']);
});
