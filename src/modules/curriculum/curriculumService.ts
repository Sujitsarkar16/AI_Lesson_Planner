import { apiRequest } from '@/shared/api/apiClient';

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

type CoverageResponse = { summary: CoverageSummary; details: CoverageTracking[] };
const noCoverage = { total_standards: 0, covered_standards: 0, coverage_percentage: 0 };
const coverage = (board: string, grade: string, subject: string) => apiRequest<CoverageResponse>(`/curriculum/coverage?${new URLSearchParams({ board, grade, subject })}`);

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
      return (await coverage(board, grade, subject)).summary;
    } catch (error) {
      console.error('Error fetching curriculum coverage:', error);
      return noCoverage;
    }
  },

  async getCoverageDetails(_userId: string, board: string, grade: string, subject: string): Promise<CoverageTracking[]> {
    try {
      return (await coverage(board, grade, subject)).details;
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
  }
};
