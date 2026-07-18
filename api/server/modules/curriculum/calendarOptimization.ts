// Shared calendar-plan contract for the deterministic Academic Calendar Optimization engine.
// This module is pure (no MongoDB, no auth, no generation calls) so its types and, once
// implemented in later tasks, its normalization/scheduling functions stay dependency-free.
// See .kiro/specs/academic-calendar-optimization/design.md "Data Models" for the source shapes.

/** Validated `YYYY-MM-DD` calendar date. Derive/compare using UTC date arithmetic only. */
export type IsoDate = string;

/** ISO-8601 timestamp, e.g. a `calculated_at` value. */
export type IsoTimestamp = string;

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** Configured subject periods per weekday. A missing weekday has zero periods. */
export type WeeklyPeriods = Partial<Record<Weekday, number>>;

export interface Chapter {
  chapter_id: string;
  title: string;
  /** Integer 1..5. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Positive integer. */
  required_periods: number;
  prerequisite_ids: string[];
  sequence_order: number;
  standard_ids: string[];
  /** Declares the chapter as introductory so it is eligible for session-combination advice. */
  is_introductory?: boolean;
  /** Non-negative integer teacher-declared capacity: periods combinable across introductory sessions. */
  introductory_combinable_periods?: number;
  /** Non-negative integer teacher-declared capacity: activity periods eligible to move to homework. */
  homework_eligible_activity_periods?: number;
}

export type CalendarBlockKind = 'Holiday' | 'Examination' | 'SchoolEvent' | 'TeacherLeave';

interface CalendarBlockBase {
  block_id: string;
  start_date: IsoDate;
  end_date: IsoDate;
  /** Examination blocks always consume slots; other kinds only consume slots when true. */
  blocks_subject: boolean;
  /** Narrows (never expands) the block's inclusive date range to these weekdays. */
  affected_weekdays?: Weekday[];
}

export interface HolidayBlock extends CalendarBlockBase {
  kind: 'Holiday';
}

export interface ExaminationBlock extends CalendarBlockBase {
  kind: 'Examination';
}

export interface SchoolEventBlock extends CalendarBlockBase {
  kind: 'SchoolEvent';
}

export interface TeacherLeaveBlock extends CalendarBlockBase {
  kind: 'TeacherLeave';
}

export type CalendarBlock = HolidayBlock | ExaminationBlock | SchoolEventBlock | TeacherLeaveBlock;

export interface RevisionRequirement {
  revision_id: string;
  title: string;
  /** Positive integer. */
  required_periods: number;
  deadline: IsoDate;
  chapter_ids: string[];
}

/** What a scheduled or locked period is allocated to. */
export type AllocationTargetKind = 'Chapter' | 'Revision' | 'LockedActivity';

export interface LockedAllocation {
  lock_id: string;
  date: IsoDate;
  period_index: number;
  allocation_kind: AllocationTargetKind;
  target_id: string;
}

interface PeriodAllocationBase {
  allocation_id: string;
  date: IsoDate;
  weekday: Weekday;
  period_index: number;
  allocation_kind: AllocationTargetKind;
  target_id: string;
}

export interface ScheduledPeriodAllocation extends PeriodAllocationBase {
  status: 'Scheduled';
}

/** Excluded from feasible capacity/scheduled totals; must be linked to a capacity-exclusion diagnostic. */
export interface BlockedPeriodAllocation extends PeriodAllocationBase {
  status: 'Blocked';
}

export interface LockedPeriodAllocation extends PeriodAllocationBase {
  status: 'Locked';
}

export type PeriodAllocation = ScheduledPeriodAllocation | BlockedPeriodAllocation | LockedPeriodAllocation;

export type DiagnosticCode =
  | 'invalid_date_range'
  | 'out_of_year_calendar_block'
  | 'unknown_prerequisite'
  | 'self_referencing_prerequisite'
  | 'duplicate_id'
  | 'cyclic_prerequisite'
  | 'invalid_numeric_value'
  | 'lock_target_unavailable'
  | 'unmet_periods'
  | 'deadline_miss'
  | 'blocked_slot_exception'
  | 'lock_conflict';

export interface Diagnostic {
  diagnostic_id: string;
  code: DiagnosticCode;
  /** Field path for validation diagnostics, e.g. `chapters[2].required_periods`. */
  path?: string;
  message: string;
  target_id?: string;
}

export type RecommendationType =
  | 'AllocateFirstCompatiblePeriods'
  | 'CombineIntroductorySessions'
  | 'MoveEligibleActivitiesToHomework'
  | 'ReserveFinalRevisionPeriods';

export interface RecommendationSlot {
  date: IsoDate;
  period_index: number;
}

export interface Recommendation {
  recommendation_id: string;
  type: RecommendationType;
  target_id: string;
  affected_periods: number;
  earliest_compatible_slots?: RecommendationSlot[];
  diagnostic_ids: string[];
  projected_shortfall_if_accepted: number;
}

export interface AcademicPlanInput {
  plan_id: string;
  board: string;
  grade: string;
  subject: string;
  academic_year_start: IsoDate;
  academic_year_end: IsoDate;
  required_completion_date: IsoDate;
  weekly_periods: WeeklyPeriods;
  chapters: Chapter[];
  holidays: HolidayBlock[];
  examinations: ExaminationBlock[];
  school_events: SchoolEventBlock[];
  teacher_leave: TeacherLeaveBlock[];
  revision_requirements: RevisionRequirement[];
  locked_allocations: LockedAllocation[];
}

export type SyllabusCompletionRisk = 'Low' | 'Medium' | 'High' | 'Critical';

export interface PlanVersion {
  version: number;
  input_revision: number;
  calculated_at: IsoTimestamp;
  total_periods_available: number;
  total_periods_required: number;
  total_periods_scheduled: number;
  period_shortfall: number;
  completion_date?: IsoDate;
  syllabus_completion_risk: SyllabusCompletionRisk;
  allocations: PeriodAllocation[];
  recommendations: Recommendation[];
  diagnostics: Diagnostic[];
}

// ---------------------------------------------------------------------------
// Date helpers (UTC-only; never use locale-dependent `Date` parsing)
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS_BY_UTC_DAY: Weekday[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseIsoDate(date: unknown): { y: number; m: number; d: number } | null {
  if (typeof date !== 'string' || !ISO_DATE_RE.test(date)) return null;
  const [y, m, d] = date.split('-').map(Number);
  const epochMs = Date.UTC(y, m - 1, d);
  const roundTrip = new Date(epochMs);
  // Date.UTC silently rolls over out-of-range components (e.g. Feb 30 -> Mar 2); reject those.
  if (roundTrip.getUTCFullYear() !== y || roundTrip.getUTCMonth() !== m - 1 || roundTrip.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** True when `date` is a real, canonically formatted `YYYY-MM-DD` calendar date. */
export function isValidIsoDate(date: unknown): date is IsoDate {
  return parseIsoDate(date) !== null;
}

/** Days since the Unix epoch (UTC), for order/range comparisons. `NaN` when `date` is invalid. */
export function toEpochDay(date: IsoDate): number {
  const parsed = parseIsoDate(date);
  if (!parsed) return NaN;
  return Date.UTC(parsed.y, parsed.m - 1, parsed.d) / 86_400_000;
}

/** Weekday of `date`, derived with UTC date arithmetic only. `null` when `date` is invalid. */
export function weekdayOf(date: IsoDate): Weekday | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;
  return WEEKDAYS_BY_UTC_DAY[new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).getUTCDay()];
}

/** Inverse of `toEpochDay`: formats an epoch day back into a canonical `YYYY-MM-DD` string. */
function isoDateFromEpochDay(epochDay: number): IsoDate {
  const date = new Date(epochDay * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * True when `weekday`/`date` falls inside a blocking calendar block: an `Examination`
 * always blocks; `Holiday`/`SchoolEvent`/`TeacherLeave` block only when `blocks_subject`
 * is true. A non-empty `affected_weekdays` narrows (never expands) the inclusive range.
 * Exported so the scheduling engine (task 3) can reuse this instead of duplicating it.
 */
export function isSlotBlocked(date: IsoDate, weekday: Weekday, blocks: readonly CalendarBlock[]): boolean {
  const epoch = toEpochDay(date);
  return blocks.some((block) => {
    if (block.kind !== 'Examination' && !block.blocks_subject) return false;
    if (epoch < toEpochDay(block.start_date) || epoch > toEpochDay(block.end_date)) return false;
    if (block.affected_weekdays && block.affected_weekdays.length > 0 && !block.affected_weekdays.includes(weekday)) return false;
    return true;
  });
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function sortById<T, K extends keyof T>(list: readonly T[], key: K): T[] {
  return [...list].sort((a, b) => {
    const av = String(a[key]);
    const bv = String(b[key]);
    return av < bv ? -1 : av > bv ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Pure normalization: canonicalizes array ordering by each collection's stable ID so
 * that downstream validation, scheduling, and diagnostics are deterministic regardless
 * of submission order. Does not mutate `input`. Coerces missing/non-array collections
 * to `[]` (and a missing `weekly_periods` to `{}`) so malformed JSON from the trust
 * boundary produces validation diagnostics instead of a thrown error.
 */
export function normalizePlanInput(input: AcademicPlanInput): AcademicPlanInput {
  const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  return {
    ...input,
    weekly_periods: input.weekly_periods ?? {},
    chapters: sortById(arr<Chapter>(input.chapters), 'chapter_id'),
    holidays: sortById(arr<HolidayBlock>(input.holidays), 'block_id'),
    examinations: sortById(arr<ExaminationBlock>(input.examinations), 'block_id'),
    school_events: sortById(arr<SchoolEventBlock>(input.school_events), 'block_id'),
    teacher_leave: sortById(arr<TeacherLeaveBlock>(input.teacher_leave), 'block_id'),
    revision_requirements: sortById(arr<RevisionRequirement>(input.revision_requirements), 'revision_id'),
    locked_allocations: sortById(arr<LockedAllocation>(input.locked_allocations), 'lock_id'),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Pure validation of a normalized `AcademicPlanInput`. Never throws on invalid input;
 * returns structured `{ path, code, message }` diagnostics (empty when the input is
 * valid) so the route handler can respond with `400` field diagnostics instead of an
 * exception. Call `normalizePlanInput` first so iteration order (and therefore
 * diagnostic order) is deterministic.
 */
export function validatePlanInput(input: AcademicPlanInput): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let seq = 0;
  const report = (code: DiagnosticCode, message: string, path?: string, target_id?: string) => {
    diagnostics.push({ diagnostic_id: `d${seq++}`, code, message, path, target_id });
  };

  // -- Academic year & completion date -------------------------------------
  const yearStartValid = isValidIsoDate(input.academic_year_start);
  const yearEndValid = isValidIsoDate(input.academic_year_end);
  const completionValid = isValidIsoDate(input.required_completion_date);
  if (!yearStartValid) report('invalid_date_range', 'academic_year_start is not a valid YYYY-MM-DD date.', 'academic_year_start');
  if (!yearEndValid) report('invalid_date_range', 'academic_year_end is not a valid YYYY-MM-DD date.', 'academic_year_end');
  if (!completionValid) report('invalid_date_range', 'required_completion_date is not a valid YYYY-MM-DD date.', 'required_completion_date');
  if (yearStartValid && yearEndValid && toEpochDay(input.academic_year_start) > toEpochDay(input.academic_year_end)) {
    report('invalid_date_range', 'academic_year_start must be on or before academic_year_end.', 'academic_year_start');
  }
  if (yearStartValid && completionValid && toEpochDay(input.required_completion_date) < toEpochDay(input.academic_year_start)) {
    report('invalid_date_range', 'required_completion_date must be on or after academic_year_start.', 'required_completion_date');
  }
  if (yearEndValid && completionValid && toEpochDay(input.required_completion_date) > toEpochDay(input.academic_year_end)) {
    report('invalid_date_range', 'required_completion_date must be on or before academic_year_end.', 'required_completion_date');
  }

  // -- Weekly period counts -------------------------------------------------
  for (const [weekday, count] of Object.entries(input.weekly_periods ?? {})) {
    if (!isNonNegativeInteger(count)) {
      report('invalid_numeric_value', `weekly_periods.${weekday} must be a non-negative integer.`, `weekly_periods.${weekday}`);
    }
  }

  // -- Chapters --------------------------------------------------------------
  const chapters = input.chapters ?? [];
  const chapterIds = new Set<string>();
  const duplicateChapterIds = new Set<string>();
  for (const chapter of chapters) {
    if (chapterIds.has(chapter.chapter_id)) duplicateChapterIds.add(chapter.chapter_id);
    chapterIds.add(chapter.chapter_id);
  }
  chapters.forEach((chapter, index) => {
    const path = `chapters[${index}]`;
    if (duplicateChapterIds.has(chapter.chapter_id)) {
      report('duplicate_id', `chapter_id "${chapter.chapter_id}" is duplicated.`, `${path}.chapter_id`, chapter.chapter_id);
    }
    if (!Number.isInteger(chapter.difficulty) || chapter.difficulty < 1 || chapter.difficulty > 5) {
      report('invalid_numeric_value', `Chapter "${chapter.chapter_id}" difficulty must be an integer from 1 through 5.`, `${path}.difficulty`, chapter.chapter_id);
    }
    if (!isPositiveInteger(chapter.required_periods)) {
      report('invalid_numeric_value', `Chapter "${chapter.chapter_id}" required_periods must be a positive integer.`, `${path}.required_periods`, chapter.chapter_id);
    }
    if (chapter.is_introductory !== undefined && typeof chapter.is_introductory !== 'boolean') {
      report('invalid_numeric_value', `Chapter "${chapter.chapter_id}" is_introductory must be a boolean.`, `${path}.is_introductory`, chapter.chapter_id);
    }
    if (chapter.introductory_combinable_periods !== undefined && !isNonNegativeInteger(chapter.introductory_combinable_periods)) {
      report('invalid_numeric_value', `Chapter "${chapter.chapter_id}" introductory_combinable_periods must be a non-negative integer.`, `${path}.introductory_combinable_periods`, chapter.chapter_id);
    }
    if (chapter.homework_eligible_activity_periods !== undefined && !isNonNegativeInteger(chapter.homework_eligible_activity_periods)) {
      report('invalid_numeric_value', `Chapter "${chapter.chapter_id}" homework_eligible_activity_periods must be a non-negative integer.`, `${path}.homework_eligible_activity_periods`, chapter.chapter_id);
    }
    (chapter.prerequisite_ids ?? []).forEach((prerequisiteId, prerequisiteIndex) => {
      if (prerequisiteId === chapter.chapter_id) {
        report('self_referencing_prerequisite', `Chapter "${chapter.chapter_id}" cannot list itself as a prerequisite.`, `${path}.prerequisite_ids[${prerequisiteIndex}]`, chapter.chapter_id);
      } else if (!chapterIds.has(prerequisiteId)) {
        report('unknown_prerequisite', `Chapter "${chapter.chapter_id}" references unknown prerequisite "${prerequisiteId}".`, `${path}.prerequisite_ids[${prerequisiteIndex}]`, chapter.chapter_id);
      }
    });
  });

  // -- Prerequisite DAG cycle detection (Kahn's algorithm over valid edges) --
  // Only known, non-self edges are considered; malformed edges are already reported above.
  const dependencyCount = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  chapters.forEach((chapter) => {
    dependencyCount.set(chapter.chapter_id, 0);
    dependents.set(chapter.chapter_id, []);
  });
  chapters.forEach((chapter) => {
    const validPrerequisites = (chapter.prerequisite_ids ?? []).filter((p) => p !== chapter.chapter_id && chapterIds.has(p));
    dependencyCount.set(chapter.chapter_id, validPrerequisites.length);
    for (const prerequisiteId of validPrerequisites) {
      dependents.get(prerequisiteId)?.push(chapter.chapter_id);
    }
  });
  const resolvable = new Set<string>();
  const queue = [...dependencyCount.entries()].filter(([, count]) => count === 0).map(([chapterId]) => chapterId);
  while (queue.length) {
    const current = queue.shift()!;
    resolvable.add(current);
    for (const dependentId of dependents.get(current) ?? []) {
      const remaining = (dependencyCount.get(dependentId) ?? 0) - 1;
      dependencyCount.set(dependentId, remaining);
      if (remaining === 0) queue.push(dependentId);
    }
  }
  chapters
    .filter((chapter) => !resolvable.has(chapter.chapter_id))
    .forEach((chapter) => report('cyclic_prerequisite', `Chapter "${chapter.chapter_id}" participates in a cyclic prerequisite chain.`, undefined, chapter.chapter_id));

  // -- Calendar blocks (uniqueness is scoped per collection) -----------------
  const blockCollections: Array<[string, CalendarBlock[]]> = [
    ['holidays', input.holidays ?? []],
    ['examinations', input.examinations ?? []],
    ['school_events', input.school_events ?? []],
    ['teacher_leave', input.teacher_leave ?? []],
  ];
  for (const [collectionName, blocks] of blockCollections) {
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();
    for (const block of blocks) {
      if (seenIds.has(block.block_id)) duplicateIds.add(block.block_id);
      seenIds.add(block.block_id);
    }
    blocks.forEach((block, index) => {
      const path = `${collectionName}[${index}]`;
      if (duplicateIds.has(block.block_id)) {
        report('duplicate_id', `${collectionName} block_id "${block.block_id}" is duplicated.`, `${path}.block_id`, block.block_id);
      }
      const startValid = isValidIsoDate(block.start_date);
      const endValid = isValidIsoDate(block.end_date);
      if (!startValid) report('invalid_date_range', `${collectionName} block "${block.block_id}" start_date is invalid.`, `${path}.start_date`, block.block_id);
      if (!endValid) report('invalid_date_range', `${collectionName} block "${block.block_id}" end_date is invalid.`, `${path}.end_date`, block.block_id);
      if (startValid && endValid) {
        if (toEpochDay(block.start_date) > toEpochDay(block.end_date)) {
          report('invalid_date_range', `${collectionName} block "${block.block_id}" start_date must be on or before end_date.`, `${path}.start_date`, block.block_id);
        }
        if (yearStartValid && toEpochDay(block.start_date) < toEpochDay(input.academic_year_start)) {
          report('out_of_year_calendar_block', `${collectionName} block "${block.block_id}" starts before the academic year.`, `${path}.start_date`, block.block_id);
        }
        if (yearEndValid && toEpochDay(block.end_date) > toEpochDay(input.academic_year_end)) {
          report('out_of_year_calendar_block', `${collectionName} block "${block.block_id}" ends after the academic year.`, `${path}.end_date`, block.block_id);
        }
      }
    });
  }

  // -- Revision requirements --------------------------------------------------
  const revisions = input.revision_requirements ?? [];
  const revisionIds = new Set<string>();
  const duplicateRevisionIds = new Set<string>();
  for (const revision of revisions) {
    if (revisionIds.has(revision.revision_id)) duplicateRevisionIds.add(revision.revision_id);
    revisionIds.add(revision.revision_id);
  }
  revisions.forEach((revision, index) => {
    const path = `revision_requirements[${index}]`;
    if (duplicateRevisionIds.has(revision.revision_id)) {
      report('duplicate_id', `revision_id "${revision.revision_id}" is duplicated.`, `${path}.revision_id`, revision.revision_id);
    }
    if (!isPositiveInteger(revision.required_periods)) {
      report('invalid_numeric_value', `Revision "${revision.revision_id}" required_periods must be a positive integer.`, `${path}.required_periods`, revision.revision_id);
    }
    const deadlineValid = isValidIsoDate(revision.deadline);
    if (!deadlineValid) {
      report('invalid_date_range', `Revision "${revision.revision_id}" deadline is invalid.`, `${path}.deadline`, revision.revision_id);
    } else {
      if (yearStartValid && toEpochDay(revision.deadline) < toEpochDay(input.academic_year_start)) {
        report('invalid_date_range', `Revision "${revision.revision_id}" deadline is before the academic year.`, `${path}.deadline`, revision.revision_id);
      }
      if (yearEndValid && toEpochDay(revision.deadline) > toEpochDay(input.academic_year_end)) {
        report('invalid_date_range', `Revision "${revision.revision_id}" deadline is after the academic year.`, `${path}.deadline`, revision.revision_id);
      }
    }
    (revision.chapter_ids ?? []).forEach((chapterId, chapterIndex) => {
      if (!chapterIds.has(chapterId)) {
        report('unknown_prerequisite', `Revision "${revision.revision_id}" references unknown chapter "${chapterId}".`, `${path}.chapter_ids[${chapterIndex}]`, revision.revision_id);
      }
    });
  });

  // -- Locked allocations ------------------------------------------------------
  const locks = input.locked_allocations ?? [];
  const allBlocks: CalendarBlock[] = [...(input.holidays ?? []), ...(input.examinations ?? []), ...(input.school_events ?? []), ...(input.teacher_leave ?? [])];
  const lockIds = new Set<string>();
  const duplicateLockIds = new Set<string>();
  for (const lock of locks) {
    if (lockIds.has(lock.lock_id)) duplicateLockIds.add(lock.lock_id);
    lockIds.add(lock.lock_id);
  }
  const slotOwnerCounts = new Map<string, number>();
  for (const lock of locks) {
    if (!isValidIsoDate(lock.date)) continue;
    const key = `${lock.date}#${lock.period_index}`;
    slotOwnerCounts.set(key, (slotOwnerCounts.get(key) ?? 0) + 1);
  }

  locks.forEach((lock, index) => {
    const path = `locked_allocations[${index}]`;
    if (duplicateLockIds.has(lock.lock_id)) {
      report('duplicate_id', `lock_id "${lock.lock_id}" is duplicated.`, `${path}.lock_id`, lock.lock_id);
    }
    if (lock.allocation_kind === 'Chapter' && !chapterIds.has(lock.target_id)) {
      report('lock_target_unavailable', `Lock "${lock.lock_id}" targets unknown chapter "${lock.target_id}".`, `${path}.target_id`, lock.lock_id);
    }
    if (lock.allocation_kind === 'Revision' && !revisionIds.has(lock.target_id)) {
      report('lock_target_unavailable', `Lock "${lock.lock_id}" targets unknown revision "${lock.target_id}".`, `${path}.target_id`, lock.lock_id);
    }

    const dateValid = isValidIsoDate(lock.date);
    if (!dateValid) {
      report('invalid_date_range', `Lock "${lock.lock_id}" date is invalid.`, `${path}.date`, lock.lock_id);
      return;
    }
    const weekday = weekdayOf(lock.date) as Weekday;
    const withinHorizon = yearStartValid && completionValid
      && toEpochDay(lock.date) >= toEpochDay(input.academic_year_start)
      && toEpochDay(lock.date) <= toEpochDay(input.required_completion_date);
    const configuredCount = input.weekly_periods?.[weekday] ?? 0;
    const periodIndexValid = isNonNegativeInteger(lock.period_index) && lock.period_index < configuredCount;
    if (!withinHorizon || !periodIndexValid) {
      report('lock_target_unavailable', `Lock "${lock.lock_id}" targets a slot that does not exist.`, path, lock.lock_id);
    } else if (isSlotBlocked(lock.date, weekday, allBlocks)) {
      report('lock_target_unavailable', `Lock "${lock.lock_id}" targets a blocked slot.`, path, lock.lock_id);
    }

    const key = `${lock.date}#${lock.period_index}`;
    if ((slotOwnerCounts.get(key) ?? 0) > 1) {
      report('lock_conflict', `Lock "${lock.lock_id}" conflicts with another lock on the same slot.`, path, lock.lock_id);
    }
  });

  // Prerequisite-completion ordering across locks: a lock on a dependent chapter or a
  // revision must not be scheduled at or before a lock on one of its prerequisite
  // chapters. This only catches violations that are decidable from lock placement alone;
  // full runtime prerequisite safety (Property 4) is enforced by the scheduling engine.
  const compareLockOrder = (a: LockedAllocation, b: LockedAllocation): number => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.period_index - b.period_index);
  const chapterLocksById = new Map<string, LockedAllocation[]>();
  for (const lock of locks) {
    if (lock.allocation_kind !== 'Chapter' || !isValidIsoDate(lock.date)) continue;
    const list = chapterLocksById.get(lock.target_id) ?? [];
    list.push(lock);
    chapterLocksById.set(lock.target_id, list);
  }
  const chapterById = new Map(chapters.map((chapter) => [chapter.chapter_id, chapter]));
  const revisionById = new Map(revisions.map((revision) => [revision.revision_id, revision]));

  locks.forEach((lock, index) => {
    if (!isValidIsoDate(lock.date)) return;
    const path = `locked_allocations[${index}]`;
    let prerequisiteChapterIds: string[] = [];
    if (lock.allocation_kind === 'Chapter') {
      prerequisiteChapterIds = chapterById.get(lock.target_id)?.prerequisite_ids ?? [];
    } else if (lock.allocation_kind === 'Revision') {
      prerequisiteChapterIds = revisionById.get(lock.target_id)?.chapter_ids ?? [];
    }
    for (const prerequisiteId of prerequisiteChapterIds) {
      for (const prerequisiteLock of chapterLocksById.get(prerequisiteId) ?? []) {
        if (compareLockOrder(prerequisiteLock, lock) >= 0) {
          report('lock_conflict', `Lock "${lock.lock_id}" is scheduled before prerequisite chapter "${prerequisiteId}" (lock "${prerequisiteLock.lock_id}") completes.`, path, lock.lock_id);
        }
      }
    }
  });

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Deterministic scheduling engine (task 3)
// ---------------------------------------------------------------------------
//
// `recalculatePlan` is the pure implementation of design.md's `recalculatePlan`
// procedure. It assumes `input` is already normalized (via `normalizePlanInput`)
// and valid (via `validatePlanInput` returning no diagnostics) - this module has
// no MongoDB/HTTP access and never throws on malformed input; that trust-boundary
// work is task 2's separate concern. `recommendations` (task 4's `recommendAdjustments`)
// reuses the same ordered/unmet/diagnostic data this function already produces.
//
// Design choice - `version`/`calculated_at`/`input_revision`: `PlanVersion.version`
// is assigned by the persistence layer (task 5) once a version is actually stored,
// so this pure function returns a `ComputedPlanVersion` (`PlanVersion` minus
// `version`). `input_revision` and `calculated_at` are accepted via `context`
// rather than read from a clock or a database, so the engine itself stays a pure,
// referentially-transparent function of its arguments (Property 1).

/** A single `(date, period_index)` teaching slot before any allocation decision. */
interface Slot {
  date: IsoDate;
  weekday: Weekday;
  period_index: number;
}

const slotKey = (date: IsoDate, periodIndex: number): string => `${date}#${periodIndex}`;

/**
 * `expandSubjectSlots`: every `(date, period_index)` pair from `startDate` through
 * `deadline` (inclusive) for weekdays with a configured, non-zero period count.
 * Dates are generated in strictly increasing order (loop invariant from design.md).
 */
function expandSubjectSlots(startDate: IsoDate, deadline: IsoDate, weeklyPeriods: WeeklyPeriods): Slot[] {
  const slots: Slot[] = [];
  const startEpoch = toEpochDay(startDate);
  const endEpoch = toEpochDay(deadline);
  for (let epoch = startEpoch; epoch <= endEpoch; epoch++) {
    const date = isoDateFromEpochDay(epoch);
    const weekday = weekdayOf(date) as Weekday;
    const count = weeklyPeriods[weekday] ?? 0;
    for (let periodIndex = 0; periodIndex < count; periodIndex++) {
      slots.push({ date, weekday, period_index: periodIndex });
    }
  }
  return slots;
}

/**
 * `reserveLockedAllocations`: turns each locked allocation whose slot is usable into
 * a `Locked` `PeriodAllocation` and removes that slot from the returned remaining
 * pool. `scheduledCountByTarget` seeds the allocation loop with periods a Chapter/
 * Revision lock already accounts for, so the loop below never assigns more than
 * `required_periods` in total. `LockedActivity` locks consume capacity (their slot
 * is removed) but are not syllabus work, so they are not added to that map.
 * Assumes (per task 2 validation) that every lock targets a real, usable, unique
 * slot; a lock that does not is defensively skipped rather than thrown on.
 */
function reserveLockedAllocations(
  locks: readonly LockedAllocation[],
  usableSlots: readonly Slot[],
): { reserved: LockedPeriodAllocation[]; remainingSlots: Slot[]; scheduledCountByTarget: Map<string, number> } {
  const usableByKey = new Map(usableSlots.map((slot) => [slotKey(slot.date, slot.period_index), slot]));
  const reservedKeys = new Set<string>();
  const reserved: LockedPeriodAllocation[] = [];
  const scheduledCountByTarget = new Map<string, number>();

  for (const lock of locks) {
    const key = slotKey(lock.date, lock.period_index);
    const slot = usableByKey.get(key);
    if (!slot || reservedKeys.has(key)) continue;
    reservedKeys.add(key);
    reserved.push({
      allocation_id: `lock-${lock.lock_id}`,
      date: slot.date,
      weekday: slot.weekday,
      period_index: slot.period_index,
      allocation_kind: lock.allocation_kind,
      target_id: lock.target_id,
      status: 'Locked',
    });
    if (lock.allocation_kind !== 'LockedActivity') {
      scheduledCountByTarget.set(lock.target_id, (scheduledCountByTarget.get(lock.target_id) ?? 0) + 1);
    }
  }

  const remainingSlots = usableSlots.filter((slot) => !reservedKeys.has(slotKey(slot.date, slot.period_index)));
  return { reserved, remainingSlots, scheduledCountByTarget };
}

/** A chapter or revision requirement normalized to a common shape for ordered allocation. */
interface ScheduleItem {
  kind: 'Chapter' | 'Revision';
  id: string;
  /** Effective deadline: `required_completion_date` for a chapter, the revision's own deadline otherwise. */
  deadline: IsoDate;
  required_periods: number;
  /** Chapter prerequisite_ids, or a revision's chapter_ids - all must be fully scheduled first. */
  prerequisite_ids: string[];
}

/**
 * Topological order of chapters (Kahn's algorithm) where, among chapters whose
 * prerequisites are already placed, the next one picked is the Requirement 3.3
 * priority: greater difficulty, then declared sequence_order, then chapter_id.
 * (All chapters share the same effective deadline, so that tie key is a no-op
 * here; it participates in `firstEligibleSlot`-style ordering for revisions.)
 * Assumes an acyclic graph (validated by task 2); any unresolved leftover (only
 * possible on unvalidated input) is defensively appended in a stable order so
 * this function still returns every chapter exactly once.
 */
function topoOrderChapters(chapters: readonly Chapter[]): Chapter[] {
  const byId = new Map(chapters.map((chapter) => [chapter.chapter_id, chapter]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const chapter of chapters) {
    dependents.set(chapter.chapter_id, []);
  }
  for (const chapter of chapters) {
    const validPrerequisites = chapter.prerequisite_ids.filter((p) => p !== chapter.chapter_id && byId.has(p));
    indegree.set(chapter.chapter_id, validPrerequisites.length);
    for (const prerequisiteId of validPrerequisites) {
      dependents.get(prerequisiteId)?.push(chapter.chapter_id);
    }
  }

  const priorityCompare = (a: Chapter, b: Chapter): number =>
    b.difficulty - a.difficulty ||
    a.sequence_order - b.sequence_order ||
    (a.chapter_id < b.chapter_id ? -1 : a.chapter_id > b.chapter_id ? 1 : 0);

  const ready = chapters.filter((chapter) => (indegree.get(chapter.chapter_id) ?? 0) === 0);
  const ordered: Chapter[] = [];
  while (ready.length) {
    ready.sort(priorityCompare);
    const next = ready.shift()!;
    ordered.push(next);
    for (const dependentId of dependents.get(next.chapter_id) ?? []) {
      const remaining = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, remaining);
      if (remaining === 0) ready.push(byId.get(dependentId)!);
    }
  }

  if (ordered.length < chapters.length) {
    const placed = new Set(ordered.map((c) => c.chapter_id));
    const leftover = chapters.filter((c) => !placed.has(c.chapter_id)).sort(priorityCompare);
    ordered.push(...leftover);
  }
  return ordered;
}

/**
 * `orderedRequirements`: chapters in prerequisite-safe topological+priority order,
 * followed by revision requirements (each depends on its chapters being scheduled
 * first, so revisions always run after every chapter), tied by deadline then
 * revision_id (design.md's "Ordering" note).
 */
function orderedRequirements(chapters: readonly Chapter[], revisions: readonly RevisionRequirement[], completionDeadline: IsoDate): ScheduleItem[] {
  const chapterItems: ScheduleItem[] = topoOrderChapters(chapters).map((chapter) => ({
    kind: 'Chapter',
    id: chapter.chapter_id,
    deadline: completionDeadline,
    required_periods: chapter.required_periods,
    prerequisite_ids: chapter.prerequisite_ids,
  }));
  const revisionItems: ScheduleItem[] = [...revisions]
    .sort((a, b) => toEpochDay(a.deadline) - toEpochDay(b.deadline) || (a.revision_id < b.revision_id ? -1 : a.revision_id > b.revision_id ? 1 : 0))
    .map((revision) => ({
      kind: 'Revision',
      id: revision.revision_id,
      deadline: revision.deadline,
      required_periods: revision.required_periods,
      prerequisite_ids: revision.chapter_ids,
    }));
  return [...chapterItems, ...revisionItems];
}

export interface RecalculatePlanContext {
  input_revision: number;
  calculated_at: IsoTimestamp;
}

/** `PlanVersion` without `version`, which the persistence layer assigns (task 5). */
export type ComputedPlanVersion = Omit<PlanVersion, 'version'>;

/**
 * Pure deterministic scheduling engine (design.md `recalculatePlan`). Expands usable
 * subject slots, reserves valid locks, then allocates chapters and eligible revisions
 * in `orderedRequirements` order, assigning each requirement's earliest remaining
 * on-or-before-deadline slot (design.md `firstEligibleSlot`) until it is fully
 * scheduled or no eligible slot remains. Never mutates `input`.
 */
export function recalculatePlan(input: AcademicPlanInput, context: RecalculatePlanContext): ComputedPlanVersion {
  const allBlocks: CalendarBlock[] = [...input.holidays, ...input.examinations, ...input.school_events, ...input.teacher_leave];
  const slots = expandSubjectSlots(input.academic_year_start, input.required_completion_date, input.weekly_periods);
  // Property 2: total_periods_available is the count of non-blocked slots; a lock
  // (Chapter/Revision or LockedActivity) still occupies a usable slot, so it stays
  // part of this count even though it is removed from the free-allocation pool below.
  const usableSlots = slots.filter((slot) => !isSlotBlocked(slot.date, slot.weekday, allBlocks));

  const { reserved, remainingSlots, scheduledCountByTarget } = reserveLockedAllocations(input.locked_allocations, usableSlots);
  const requirements = orderedRequirements(input.chapters, input.revision_requirements, input.required_completion_date);
  const requiredPeriodsById = new Map(requirements.map((item) => [item.id, item.required_periods]));

  const allocations: PeriodAllocation[] = [...reserved];
  const unmetByTarget = new Map<string, number>();
  let cursor = 0; // Shared pointer into `remainingSlots` (kept sorted ascending) across every requirement in turn.

  for (const item of requirements) {
    let scheduledForItem = scheduledCountByTarget.get(item.id) ?? 0;
    // Property 4: a dependent target may not receive any period until every one of
    // its prerequisites has had ALL of its required periods scheduled. Because
    // `orderedRequirements` places prerequisites first, an incomplete prerequisite at
    // this point means it never will complete, so this target makes zero progress.
    const prerequisitesComplete = item.prerequisite_ids.every((prerequisiteId) => scheduledCountByTarget.get(prerequisiteId) === (requiredPeriodsById.get(prerequisiteId) ?? 0));

    if (prerequisitesComplete) {
      const deadlineEpoch = toEpochDay(item.deadline);
      while (scheduledForItem < item.required_periods && cursor < remainingSlots.length) {
        const slot = remainingSlots[cursor];
        if (toEpochDay(slot.date) > deadlineEpoch) break; // `remainingSlots` is ascending, so no later slot is eligible either.
        allocations.push({
          allocation_id: `alloc-${item.kind.toLowerCase()}-${item.id}-${scheduledForItem}`,
          date: slot.date,
          weekday: slot.weekday,
          period_index: slot.period_index,
          allocation_kind: item.kind,
          target_id: item.id,
          status: 'Scheduled',
        });
        cursor++;
        scheduledForItem++;
      }
    }

    scheduledCountByTarget.set(item.id, scheduledForItem);
    unmetByTarget.set(item.id, Math.max(0, item.required_periods - scheduledForItem));
  }

  allocations.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.period_index - b.period_index));

  const totalPeriodsAvailable = usableSlots.length;
  const totalPeriodsRequired = input.chapters.reduce((sum, c) => sum + c.required_periods, 0) + input.revision_requirements.reduce((sum, r) => sum + r.required_periods, 0);
  const totalPeriodsScheduled = allocations.filter((a) => a.allocation_kind !== 'LockedActivity' && (a.status === 'Scheduled' || a.status === 'Locked')).length;
  const periodShortfall = [...unmetByTarget.values()].reduce((sum, unmet) => sum + unmet, 0);

  // completion_date is only meaningful once every chapter and revision is fully
  // scheduled (Requirement 5.1's "projected syllabus-completion date when
  // calculable"); otherwise there is no single date at which the syllabus completes.
  const isFullyScheduled = periodShortfall === 0;
  const syllabusAllocationDates = allocations.filter((a) => a.allocation_kind !== 'LockedActivity').map((a) => a.date);
  const completionDate = isFullyScheduled && syllabusAllocationDates.length > 0 ? syllabusAllocationDates.reduce((latest, d) => (toEpochDay(d) > toEpochDay(latest) ? d : latest)) : undefined;

  const diagnostics = diagnoseUnmetRequirements(requirements, unmetByTarget);
  // design.md's `recommendAdjustments(requirements, remaining_slots, diagnostics)`:
  // `remainingSlots.slice(cursor)` is exactly the never-claimed tail of the shared-cursor
  // pool above - no requirement (chapter or revision) consumed any of these slots.
  const recommendations = recommendAdjustments(input.chapters, input.revision_requirements, requirements, unmetByTarget, diagnostics, remainingSlots.slice(cursor));

  // Risk classification. design.md Property 6 / Requirements 5.3-5.4 anchor the ends
  // precisely; the High/Medium split follows Requirement 5.3 ("missed deadlines MAY be
  // Medium when completion remains feasible") and the design error table ("insufficient
  // capacity -> High/Critical"):
  //   Low      - periodShortfall === 0. The allocation loop never assigns a slot past a
  //              target's own deadline, so zero shortfall means every chapter and
  //              revision is complete and on time (Req 5.3, Property 6).
  //   Critical - a required target (required_periods > 0) received ZERO scheduled
  //              periods: a hard structural infeasibility - an unsatisfiable prerequisite
  //              chain or a preserved lock that leaves a target unschedulable. This is
  //              Req 5.4's "a required target or preserved lock makes completion
  //              infeasible".
  //   High     - not Critical, but total_periods_available < total_periods_required:
  //              a genuine capacity deficit that no reordering can recover.
  //   Medium   - not Critical/High, but shortfall > 0: overall capacity is sufficient
  //              (available >= required) and the shortfall is a deadline/ordering miss,
  //              so completion may remain feasible (Req 5.3).
  const zeroProgressTargetExists = requirements.some((item) => item.required_periods > 0 && (scheduledCountByTarget.get(item.id) ?? 0) === 0);
  let risk: SyllabusCompletionRisk;
  if (isFullyScheduled) {
    risk = 'Low';
  } else if (zeroProgressTargetExists) {
    risk = 'Critical';
  } else if (totalPeriodsAvailable < totalPeriodsRequired) {
    risk = 'High';
  } else {
    risk = 'Medium';
  }

  return {
    input_revision: context.input_revision,
    calculated_at: context.calculated_at,
    total_periods_available: totalPeriodsAvailable,
    total_periods_required: totalPeriodsRequired,
    total_periods_scheduled: totalPeriodsScheduled,
    period_shortfall: periodShortfall,
    completion_date: completionDate,
    syllabus_completion_risk: risk,
    allocations,
    recommendations,
    diagnostics,
  };
}

/**
 * `diagnoseUnmetRequirements`: an `unmet_periods` diagnostic for every target with
 * remaining work, plus a `deadline_miss` diagnostic - in this single-pass engine,
 * unmet work always means the target's deadline could not be met (the allocation
 * loop only stops on full completion or on running out of eligible before-deadline
 * slots), so the two conditions always co-occur here.
 */
function diagnoseUnmetRequirements(requirements: readonly ScheduleItem[], unmetByTarget: ReadonlyMap<string, number>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let seq = 0;
  for (const item of requirements) {
    const unmet = unmetByTarget.get(item.id) ?? 0;
    if (unmet <= 0) continue;
    diagnostics.push({
      diagnostic_id: `sd${seq++}`,
      code: 'unmet_periods',
      message: `${item.kind} "${item.id}" has ${unmet} unmet period(s).`,
      target_id: item.id,
    });
    diagnostics.push({
      diagnostic_id: `sd${seq++}`,
      code: 'deadline_miss',
      message: `${item.kind} "${item.id}" cannot complete by its deadline (${item.deadline}) with ${unmet} period(s) remaining.`,
      target_id: item.id,
    });
  }
  return diagnostics;
}

// ---------------------------------------------------------------------------
// Deterministic recommendations (task 4)
// ---------------------------------------------------------------------------

/**
 * `recommendAdjustments` (design.md's procedure of the same name): derives advisory
 * recovery options purely from `recalculatePlan`'s own unmet/diagnostic state. It
 * reads already-computed data (`requirements`, `unmetByTarget`, `diagnostics`,
 * `unclaimedSlots`) and returns a new array; it never mutates them or `allocations`.
 * `unclaimedSlots` must be the tail of `remainingSlots` no requirement ever claimed,
 * so `AllocateFirstCompatiblePeriods` never suggests a slot another target already
 * occupies. Only applicable recommendation types are emitted per target (e.g. no
 * `CombineIntroductorySessions` for a non-introductory chapter, no
 * `AllocateFirstCompatiblePeriods` when no compatible slot remains before the deadline).
 */
function recommendAdjustments(
  chapters: readonly Chapter[],
  revisions: readonly RevisionRequirement[],
  requirements: readonly ScheduleItem[],
  unmetByTarget: ReadonlyMap<string, number>,
  diagnostics: readonly Diagnostic[],
  unclaimedSlots: readonly Slot[],
): Recommendation[] {
  const chapterById = new Map(chapters.map((chapter) => [chapter.chapter_id, chapter]));
  const deadlineById = new Map(requirements.map((item) => [item.id, item.deadline]));
  const diagnosticsByTarget = new Map<string, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    if (!diagnostic.target_id) continue;
    const list = diagnosticsByTarget.get(diagnostic.target_id) ?? [];
    list.push(diagnostic);
    diagnosticsByTarget.set(diagnostic.target_id, list);
  }
  const diagnosticIdsFor = (targetId: string) => (diagnosticsByTarget.get(targetId) ?? []).map((d) => d.diagnostic_id);

  // Interpretation of "projected_shortfall_if_accepted" (design.md leaves the exact
  // arithmetic to implementation): the plan's current total period_shortfall minus
  // this single recommendation's own affected_periods, floored at zero - i.e. the
  // shortfall that would remain if just this recommendation's periods were resolved,
  // without re-running the scheduler (a recommendation is advisory-only).
  const totalShortfall = [...unmetByTarget.values()].reduce((sum, unmet) => sum + unmet, 0);
  const projectedShortfall = (affectedPeriods: number) => Math.max(0, totalShortfall - affectedPeriods);

  let seq = 0;
  const nextId = () => `rec${seq++}`;
  const sortByDeadlineThenUnmetDescThenId = (a: ScheduleItem, b: ScheduleItem) =>
    toEpochDay(a.deadline) - toEpochDay(b.deadline) ||
    (unmetByTarget.get(b.id) ?? 0) - (unmetByTarget.get(a.id) ?? 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  const chapterRecommendations: Recommendation[] = [];
  const unmetChapterItems = requirements
    .filter((item) => item.kind === 'Chapter' && (unmetByTarget.get(item.id) ?? 0) > 0)
    .sort(sortByDeadlineThenUnmetDescThenId);

  for (const item of unmetChapterItems) {
    const chapter = chapterById.get(item.id);
    if (!chapter) continue; // Defensive: every Chapter ScheduleItem originates from a real chapter.
    const unmet = unmetByTarget.get(item.id) ?? 0;
    const diagnosticIds = diagnosticIdsFor(item.id);
    const deadlineEpoch = toEpochDay(item.deadline);

    const compatibleSlots = unclaimedSlots.filter((slot) => toEpochDay(slot.date) <= deadlineEpoch).slice(0, unmet);
    if (compatibleSlots.length > 0) {
      chapterRecommendations.push({
        recommendation_id: nextId(),
        type: 'AllocateFirstCompatiblePeriods',
        target_id: item.id,
        affected_periods: unmet,
        earliest_compatible_slots: compatibleSlots.map((slot) => ({ date: slot.date, period_index: slot.period_index })),
        diagnostic_ids: diagnosticIds,
        projected_shortfall_if_accepted: projectedShortfall(unmet),
      });
    }

    if (chapter.is_introductory && (chapter.introductory_combinable_periods ?? 0) > 0) {
      chapterRecommendations.push({
        recommendation_id: nextId(),
        type: 'CombineIntroductorySessions',
        target_id: item.id,
        affected_periods: unmet,
        diagnostic_ids: diagnosticIds,
        projected_shortfall_if_accepted: projectedShortfall(unmet),
      });
    }

    if ((chapter.homework_eligible_activity_periods ?? 0) > 0) {
      chapterRecommendations.push({
        recommendation_id: nextId(),
        type: 'MoveEligibleActivitiesToHomework',
        target_id: item.id,
        affected_periods: unmet,
        diagnostic_ids: diagnosticIds,
        projected_shortfall_if_accepted: projectedShortfall(unmet),
      });
    }
  }

  const revisionRecommendations: Recommendation[] = [];
  const atRiskRevisionItems = requirements
    .filter((item) => item.kind === 'Revision')
    .filter((item) => (unmetByTarget.get(item.id) ?? 0) > 0 || (diagnosticsByTarget.get(item.id) ?? []).some((d) => d.code === 'deadline_miss'))
    .sort(sortByDeadlineThenUnmetDescThenId);

  for (const item of atRiskRevisionItems) {
    const unmet = unmetByTarget.get(item.id) ?? 0;
    const deadlineEpoch = toEpochDay(item.deadline);
    const compatibleSlots = unclaimedSlots.filter((slot) => toEpochDay(slot.date) <= deadlineEpoch).slice(0, unmet);
    revisionRecommendations.push({
      recommendation_id: nextId(),
      type: 'ReserveFinalRevisionPeriods',
      target_id: item.id,
      affected_periods: unmet,
      ...(compatibleSlots.length > 0 ? { earliest_compatible_slots: compatibleSlots.map((slot) => ({ date: slot.date, period_index: slot.period_index })) } : {}),
      diagnostic_ids: diagnosticIdsFor(item.id),
      projected_shortfall_if_accepted: projectedShortfall(unmet),
    });
  }

  // Requirement 6.6 / design.md: the FINAL order is across ALL recommendations by
  // deadline, then descending unmet periods, then stable target_id - not grouped by
  // type. `Array#sort` is a stable sort, so ties (same target's several recommendation
  // types) keep the per-target emission order established above.
  return [...chapterRecommendations, ...revisionRecommendations].sort((a, b) => {
    const deadlineDiff = toEpochDay(deadlineById.get(a.target_id) ?? '') - toEpochDay(deadlineById.get(b.target_id) ?? '');
    if (deadlineDiff !== 0) return deadlineDiff;
    const unmetDiff = (unmetByTarget.get(b.target_id) ?? 0) - (unmetByTarget.get(a.target_id) ?? 0);
    if (unmetDiff !== 0) return unmetDiff;
    return a.target_id < b.target_id ? -1 : a.target_id > b.target_id ? 1 : 0;
  });
}
