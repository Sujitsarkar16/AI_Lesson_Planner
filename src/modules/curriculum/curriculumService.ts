import { apiRequest } from '@/shared/api/apiClient';
import type {
  AcademicPlanInput,
  CalendarBlock,
  PlanVersion,
  SyllabusCompletionRisk
} from '../../../api/server/modules/curriculum/calendarOptimization.js';

// Calendar-plan contract types are defined once on the server and re-exported here (type-only,
// erased at build time) so the client and API share a single source of truth.
// See api/server/modules/curriculum/calendarOptimization.ts and the design doc's Data Models section.
export type {
  IsoDate,
  IsoTimestamp,
  Weekday,
  WeeklyPeriods,
  Chapter,
  CalendarBlockKind,
  CalendarBlock,
  HolidayBlock,
  ExaminationBlock,
  SchoolEventBlock,
  TeacherLeaveBlock,
  RevisionRequirement,
  AllocationTargetKind,
  LockedAllocation,
  PeriodAllocation,
  ScheduledPeriodAllocation,
  BlockedPeriodAllocation,
  LockedPeriodAllocation,
  DiagnosticCode,
  Diagnostic,
  RecommendationType,
  RecommendationSlot,
  Recommendation,
  AcademicPlanInput,
  SyllabusCompletionRisk,
  PlanVersion
} from '../../../api/server/modules/curriculum/calendarOptimization.js';

export type CurriculumBoard = 'CBSE' | 'ICSE' | 'State Board' | 'IB' | 'Cambridge' | 'Common Core' | 'Other';
export type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
export type EmphasisType = 'Conceptual' | 'Procedural' | 'Values' | 'Mixed';
export type CoverageLevel = 'Introduced' | 'Developing' | 'Mastered';
export type CoverageStatus = 'Pending' | 'Covered' | 'Reviewed';

export interface CurriculumStandard {
  id: string;
  board: CurriculumBoard;
  grade: string;
  subject: string;
  standard_code: string;
  standard_description: string;
  category?: string;
  parent_standard_id?: string;
  metadata?: any;
}

export interface CoverageTracking {
  id?: string;
  user_id: string;
  board: string;
  grade: string;
  subject: string;
  standard_id: string;
  total_lessons: number;
  last_covered_at: string;
  coverage_status: CoverageStatus;
}

export interface CoverageSummary {
  total_standards: number;
  covered_standards: number;
  coverage_percentage: number;
}

export interface ConceptMapNode {
  id?: string;
  user_id: string;
  map_id: string;
  node_key: string;
  label: string;
  position_x: number;
  position_y: number;
  metadata?: any;
}

export interface ConceptMapEdge {
  id?: string;
  map_id: string;
  edge_key: string;
  source_node_key: string;
  target_node_key: string;
  relationship_type?: string;
}

export interface LessonSequence {
  id?: string;
  user_id: string;
  map_id: string;
  sequence_name: string;
  subject: string;
  grade: string;
  board?: string;
  lesson_order: string[];
  metadata?: any;
}

type CoverageResponse = { summary?: CoverageSummary; details?: CoverageTracking[] } & Partial<CoverageSummary>;
const noCoverage = { total_standards: 0, covered_standards: 0, coverage_percentage: 0 };
const isCoverageSummary = (value: unknown): value is CoverageSummary => Boolean(value && typeof value === 'object' && ['total_standards', 'covered_standards', 'coverage_percentage'].every((key) => typeof (value as Record<string, unknown>)[key] === 'number'));
const coverage = (board: string, grade: string, subject: string) => apiRequest<CoverageResponse>(`/curriculum/coverage?${new URLSearchParams({ board, grade, subject })}`);
const coverageSummary = (response: CoverageResponse): CoverageSummary => isCoverageSummary(response.summary) ? response.summary : isCoverageSummary(response) ? response : noCoverage;

// --- Academic Calendar Optimization -----------------------------------------
// Calendar plans are auditable, so these methods intentionally do NOT swallow errors or
// fall back to localStorage. `apiRequest` throws `CalendarPlanApiError` (carrying the HTTP
// status and field diagnostics) which callers surface for 400 (invalid input) / 409 (stale
// revision) / 404 (unknown plan) handling.

/** Compact per-version history entry returned alongside the current plan. */
export interface CalendarPlanVersionSummary {
  version: number;
  input_revision: number;
  calculated_at: string;
  syllabus_completion_risk: SyllabusCompletionRisk;
  period_shortfall: number;
}

/** A plan's current input + calculated version, as returned by create/replace/block mutations. */
export interface CalendarPlan {
  planId: string;
  currentInputRevision: number;
  currentVersion: number;
  input: AcademicPlanInput;
  version: PlanVersion;
}

/** The current plan plus its compact version history (returned by the read-current endpoint). */
export interface CalendarPlanWithHistory extends CalendarPlan {
  history: CalendarPlanVersionSummary[];
}

const CALENDAR_PLANS_PATH = '/curriculum/calendar-plans';

export const CurriculumService = {
  async getStandards(board: CurriculumBoard, grade: string, subject: string): Promise<CurriculumStandard[]> {
    try {
      return await apiRequest<CurriculumStandard[]>(`/curriculum/standards?${new URLSearchParams({ board, grade, subject })}`);
    } catch (error) {
      console.error('Error fetching standards:', error);
      return [];
    }
  },

  async getCoverageSummary(_userId: string, board: string, grade: string, subject: string): Promise<CoverageSummary> {
    try {
      return coverageSummary(await coverage(board, grade, subject));
    } catch (error) {
      console.error('Error fetching curriculum coverage:', error);
      return noCoverage;
    }
  },

  async getCoverageDetails(_userId: string, board: string, grade: string, subject: string): Promise<CoverageTracking[]> {
    try {
      const response = await coverage(board, grade, subject);
      return Array.isArray(response.details) ? response.details : [];
    } catch (error) {
      console.error('Error fetching coverage details:', error);
      return [];
    }
  },

  async recordCoverage(_userId: string, documentId: string, standardIds: string[]): Promise<boolean> {
    try {
      await apiRequest('/curriculum/coverage', { method: 'POST', body: JSON.stringify({ documentId, standardIds }) });
      return true;
    } catch (error) {
      console.error('Error recording coverage:', error);
      return false;
    }
  },

  async saveConceptMapNodes(nodes: ConceptMapNode[]): Promise<boolean> {
    try {
      await apiRequest('/concept-maps/nodes', { method: 'POST', body: JSON.stringify({ nodes }) });
      return true;
    } catch (error) {
      console.error('Error saving concept map nodes:', error);
      return false;
    }
  },

  async saveConceptMapEdges(edges: ConceptMapEdge[]): Promise<boolean> {
    try {
      await apiRequest('/concept-maps/edges', { method: 'POST', body: JSON.stringify({ edges }) });
      return true;
    } catch (error) {
      console.error('Error saving concept map edges:', error);
      return false;
    }
  },

  async loadConceptMap(mapId: string): Promise<{ nodes: any[]; edges: any[] } | null> {
    try {
      return await apiRequest(`/concept-maps/${encodeURIComponent(mapId)}`);
    } catch (error) {
      console.error('Error loading concept map:', error);
      return null;
    }
  },

  async createLessonSequence(sequence: Omit<LessonSequence, 'id'>): Promise<LessonSequence | null> {
    try {
      return await apiRequest<LessonSequence>('/lesson-sequences', { method: 'POST', body: JSON.stringify(sequence) });
    } catch (error) {
      console.error('Error creating lesson sequence:', error);
      return null;
    }
  },

  // Calendar-plan methods let CalendarPlanApiError propagate (see block comment above).

  createCalendarPlan(input: AcademicPlanInput): Promise<CalendarPlan> {
    return apiRequest<CalendarPlan>(CALENDAR_PLANS_PATH, { method: 'POST', body: JSON.stringify({ input }) });
  },

  getCalendarPlan(planId: string): Promise<CalendarPlanWithHistory> {
    return apiRequest<CalendarPlanWithHistory>(`${CALENDAR_PLANS_PATH}/${encodeURIComponent(planId)}`);
  },

  getCalendarPlanVersion(planId: string, version: number): Promise<PlanVersion> {
    return apiRequest<PlanVersion>(`${CALENDAR_PLANS_PATH}/${encodeURIComponent(planId)}/versions/${version}`);
  },

  replaceCalendarPlanInput(planId: string, input: AcademicPlanInput, expectedInputRevision: number): Promise<CalendarPlan> {
    return apiRequest<CalendarPlan>(`${CALENDAR_PLANS_PATH}/${encodeURIComponent(planId)}`, { method: 'PUT', body: JSON.stringify({ input, expectedInputRevision }) });
  },

  upsertCalendarBlock(planId: string, block: CalendarBlock, expectedInputRevision: number): Promise<CalendarPlan> {
    return apiRequest<CalendarPlan>(`${CALENDAR_PLANS_PATH}/${encodeURIComponent(planId)}/calendar-blocks/${encodeURIComponent(block.block_id)}`, { method: 'PUT', body: JSON.stringify({ block, expectedInputRevision }) });
  },

  removeCalendarBlock(planId: string, block: Pick<CalendarBlock, 'block_id' | 'kind'>, expectedInputRevision: number): Promise<CalendarPlan> {
    return apiRequest<CalendarPlan>(`${CALENDAR_PLANS_PATH}/${encodeURIComponent(planId)}/calendar-blocks/${encodeURIComponent(block.block_id)}?kind=${encodeURIComponent(block.kind)}`, { method: 'DELETE', body: JSON.stringify({ expectedInputRevision }) });
  }
};
