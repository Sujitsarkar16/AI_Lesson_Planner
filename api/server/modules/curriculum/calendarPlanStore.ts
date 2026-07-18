// MongoDB persistence for Academic Calendar Optimization plans (task 5 of the
// academic-calendar-optimization spec). Kept separate from `calendarOptimization.ts`,
// which documents itself as pure (no MongoDB) - see that file's header comment.
//
// Storage model (design.md "Design decisions": store declared inputs separately from
// immutable calculated versions; persist only IDs/revision counters/current pointers on
// the plan document):
//   academic_calendar_plans         - owner + plan pointer document (small, mutable pointers only)
//   academic_calendar_plan_inputs   - one immutable document per input revision
//   academic_calendar_plan_versions - one immutable document per calculated version
//
// Every exported function requires `userId` and every Mongo filter includes it
// (Requirement 8.1) so a caller (task 6) can never read/mutate another owner's plan.
import { ObjectId } from 'mongodb';
import { getDatabase, getMongoClient, id } from '../../shared/database.js';
import { recalculatePlan, type AcademicPlanInput, type ComputedPlanVersion, type PlanVersion } from './calendarOptimization.js';

export const PLANS_COLLECTION = 'academic_calendar_plans';
export const PLAN_INPUTS_COLLECTION = 'academic_calendar_plan_inputs';
export const PLAN_VERSIONS_COLLECTION = 'academic_calendar_plan_versions';

/** Plan pointer document - see module header. `_id` doubles as `planId` (documents/students precedent: owner-scoped collections key lookups off `_id` + `userId`, not a separate generated field). */
interface PlanDocument {
  _id: ObjectId;
  userId: ObjectId;
  currentInputRevision: number;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Immutable input-revision document. Never updated or deleted once inserted. */
interface PlanInputDocument extends AcademicPlanInput {
  _id: ObjectId;
  userId: ObjectId;
  planId: ObjectId;
  revision: number;
  createdAt: Date;
}

/** Immutable calculated-version document. Never updated or deleted once inserted. */
interface PlanVersionDocument extends ComputedPlanVersion {
  _id: ObjectId;
  userId: ObjectId;
  planId: ObjectId;
  version: number;
}

/** A plan's current input and version together, or `null` when not found/not owned. */
export interface CurrentPlan {
  planId: string;
  currentInputRevision: number;
  currentVersion: number;
  input: AcademicPlanInput;
  version: PlanVersion;
}

/** Compact per-version summary for history listings (Requirement 7.4: prior versions remain available for audit). */
export interface PlanVersionSummary {
  version: number;
  input_revision: number;
  calculated_at: string;
  syllabus_completion_risk: PlanVersion['syllabus_completion_risk'];
  period_shortfall: number;
}

/**
 * Thrown by `replacePlanInput` when the caller's `expectedInputRevision` does not match
 * the plan's current revision (Requirement 8.4). Distinguishable by type/`code` so the
 * route handler (task 6) can map it to `409` without string-matching a message.
 */
export class InputRevisionConflictError extends Error {
  readonly code = 'input_revision_conflict' as const;
  constructor(readonly expectedInputRevision: number, readonly currentInputRevision: number) {
    super(`Expected input revision ${expectedInputRevision} but current revision is ${currentInputRevision}.`);
  }
}

/** Thrown by `replacePlanInput`/read helpers when the plan does not exist or is not owned by `userId` (Requirement 8.2). */
export class PlanNotFoundError extends Error {
  readonly code = 'plan_not_found' as const;
  constructor() {
    super('Plan not found.');
  }
}

const toPlanVersion = (doc: PlanVersionDocument): PlanVersion => {
  const { _id, userId, planId, version, ...rest } = doc;
  return { version, ...rest };
};

const toPlanInput = (doc: PlanInputDocument): AcademicPlanInput => {
  const { _id, userId, planId, revision, createdAt, ...input } = doc;
  return input;
};

/**
 * Creates a new plan: validated+normalized input becomes revision 1, immediately
 * recalculated into version 1. Runs in a single transaction (Requirement 8.5: if
 * anything fails, nothing partially persists).
 */
export async function createPlan(userId: ObjectId, normalizedInput: AcademicPlanInput): Promise<CurrentPlan> {
  const db = await getDatabase();
  const client = await getMongoClient();
  const planId = new ObjectId();
  const now = new Date();
  const calculatedAt = now.toISOString();

  const inputDoc: PlanInputDocument = { _id: new ObjectId(), userId, planId, revision: 1, createdAt: now, ...normalizedInput };
  const computed = recalculatePlan(normalizedInput, { input_revision: 1, calculated_at: calculatedAt });
  const versionDoc: PlanVersionDocument = { _id: new ObjectId(), userId, planId, version: 1, ...computed };
  const planDoc: PlanDocument = { _id: planId, userId, currentInputRevision: 1, currentVersion: 1, createdAt: now, updatedAt: now };

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection<PlanDocument>(PLANS_COLLECTION).insertOne(planDoc, { session });
      await db.collection<PlanInputDocument>(PLAN_INPUTS_COLLECTION).insertOne(inputDoc, { session });
      await db.collection<PlanVersionDocument>(PLAN_VERSIONS_COLLECTION).insertOne(versionDoc, { session });
    });
  } finally {
    await session.endSession();
  }

  return { planId: id(planId), currentInputRevision: 1, currentVersion: 1, input: toPlanInput(inputDoc), version: toPlanVersion(versionDoc) };
}

/**
 * Replaces an existing plan's input with a new revision and recalculates, but only if
 * `expectedInputRevision` matches the plan's current revision at the moment of the
 * transaction (optimistic concurrency precondition, Requirement 8.4). Throws
 * `PlanNotFoundError` if `planId` is unknown/not owned by `userId`, or
 * `InputRevisionConflictError` on a stale revision - callers must not treat either as a
 * generic error since the route handler maps them to `404`/`409` respectively.
 *
 * On success: inserts input revision `currentInputRevision + 1`, recalculates into
 * version `currentVersion + 1`, and advances the plan document's pointers - all inside
 * the same transaction (Requirement 8.5).
 */
export async function replacePlanInput(userId: ObjectId, planId: ObjectId, normalizedInput: AcademicPlanInput, expectedInputRevision: number): Promise<CurrentPlan> {
  const db = await getDatabase();
  const client = await getMongoClient();
  const now = new Date();
  const calculatedAt = now.toISOString();

  let result: CurrentPlan | undefined;
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const plan = await db.collection<PlanDocument>(PLANS_COLLECTION).findOne({ _id: planId, userId }, { session });
      if (!plan) throw new PlanNotFoundError();
      if (plan.currentInputRevision !== expectedInputRevision) throw new InputRevisionConflictError(expectedInputRevision, plan.currentInputRevision);

      const nextRevision = plan.currentInputRevision + 1;
      const nextVersion = plan.currentVersion + 1;
      const inputDoc: PlanInputDocument = { _id: new ObjectId(), userId, planId, revision: nextRevision, createdAt: now, ...normalizedInput };
      const computed = recalculatePlan(normalizedInput, { input_revision: nextRevision, calculated_at: calculatedAt });
      const versionDoc: PlanVersionDocument = { _id: new ObjectId(), userId, planId, version: nextVersion, ...computed };

      await db.collection<PlanInputDocument>(PLAN_INPUTS_COLLECTION).insertOne(inputDoc, { session });
      await db.collection<PlanVersionDocument>(PLAN_VERSIONS_COLLECTION).insertOne(versionDoc, { session });
      await db.collection<PlanDocument>(PLANS_COLLECTION).updateOne({ _id: planId, userId }, { $set: { currentInputRevision: nextRevision, currentVersion: nextVersion, updatedAt: now } }, { session });

      result = { planId: id(planId), currentInputRevision: nextRevision, currentVersion: nextVersion, input: toPlanInput(inputDoc), version: toPlanVersion(versionDoc) };
    });
  } finally {
    await session.endSession();
  }

  return result!;
}

/** Owner-scoped read of a plan's current input + version. Returns `null` (never throws) so callers can 404 without existence leakage (Requirement 8.2). */
export async function getCurrentPlan(userId: ObjectId, planId: ObjectId): Promise<CurrentPlan | null> {
  const db = await getDatabase();
  const plan = await db.collection<PlanDocument>(PLANS_COLLECTION).findOne({ _id: planId, userId });
  if (!plan) return null;
  const [inputDoc, versionDoc] = await Promise.all([
    db.collection<PlanInputDocument>(PLAN_INPUTS_COLLECTION).findOne({ userId, planId, revision: plan.currentInputRevision }),
    db.collection<PlanVersionDocument>(PLAN_VERSIONS_COLLECTION).findOne({ userId, planId, version: plan.currentVersion }),
  ]);
  if (!inputDoc || !versionDoc) return null;
  return { planId: id(planId), currentInputRevision: plan.currentInputRevision, currentVersion: plan.currentVersion, input: toPlanInput(inputDoc), version: toPlanVersion(versionDoc) };
}

/** Owner-scoped read of one immutable historical version. Returns `null` when not found/not owned (Requirement 8.2). */
export async function getPlanVersion(userId: ObjectId, planId: ObjectId, version: number): Promise<PlanVersion | null> {
  const db = await getDatabase();
  const doc = await db.collection<PlanVersionDocument>(PLAN_VERSIONS_COLLECTION).findOne({ userId, planId, version });
  return doc ? toPlanVersion(doc) : null;
}

/** Owner-scoped compact version history, newest first. Returns `[]` when the plan is unknown/not owned rather than throwing. */
export async function listPlanVersionSummaries(userId: ObjectId, planId: ObjectId): Promise<PlanVersionSummary[]> {
  const db = await getDatabase();
  const docs = await db.collection<PlanVersionDocument>(PLAN_VERSIONS_COLLECTION).find({ userId, planId }).sort({ version: -1 }).toArray();
  return docs.map((doc) => ({ version: doc.version, input_revision: doc.input_revision, calculated_at: doc.calculated_at, syllabus_completion_risk: doc.syllabus_completion_risk, period_shortfall: doc.period_shortfall }));
}
