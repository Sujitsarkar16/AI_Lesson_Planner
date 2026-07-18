


// ============================================
// DOCUMENT TYPE SYSTEM
// ============================================

/**
 * Document type discriminator
 */
export type DocumentType = 'lesson-plan' | 'syllabus' | 'paper' | 'quiz' | 'study-notes' | 'concept-map' | 'other';
export type AppType = 'lesson-plan' | 'syllabus' | 'paper' | 'quiz' | 'study-notes' | 'concept-map';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'lesson-plan': 'Lesson Plan',
  syllabus: 'Syllabus',
  paper: 'Exam Paper',
  quiz: 'Quiz',
  'study-notes': 'Study Notes',
  'concept-map': 'Concept Map',
  other: 'Document'
};

export const getDocumentTypeLabel = (type?: DocumentType): string => DOCUMENT_TYPE_LABELS[type || 'other'];

/**
 * Base document interface - shared fields across all document types
 */
export interface BaseDocument {
  id: string;
  type: DocumentType;
  title: string;
  subject: string;
  grade: string;
  dateCreated: string;
  content?: string;
  templateId?: string;
  imageUrl?: string;
  userId?: string; // For database integration
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

/**
 * Lesson Plan specific metadata
 */
export interface LessonPlanMetadata {
  teacher?: string;
  school?: string;
  date?: string;
  duration?: string;
  topic?: string;
  board?: string; // Curriculum board
  bloomLevels?: string[]; // Bloom's taxonomy targets
  emphasis?: string; // Conceptual/Procedural/Values/Mixed
  objectives?: string; // Learning objectives
  standards?: string[]; // Curriculum standard IDs
}

/**
 * Syllabus specific metadata
 */
export interface SyllabusMetadata {
  courseTitle?: string;
  courseCode?: string;
  instructor?: string;
  institution?: string;
  term?: string;
  duration?: string; // e.g., "12 Weeks"
  creditHours?: number;
}

/**
 * Quiz/MCQ specific metadata
 */
export interface QuizMetadata {
  examTitle?: string;
  subtitle?: string;
  school?: string;
  topic?: string;
  numQuestions?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  timeLimit?: string;
  passingScore?: number;
}

/**
 * Question Paper specific metadata
 */
export interface QuestionPaperMetadata {
  examType?: string; // e.g., "Mid-term", "Final"
  board?: string;
  duration?: string;
  maxMarks?: number;
  parts?: string[]; // e.g., ["Part A", "Part B"]
  instructions?: string;
}

/**
 * Study Notes specific metadata
 */
export interface StudyNotesMetadata {
  notesType?: string; // e.g., "Chapter Summary", "Revision Notes"
  board?: string;
  scope?: string; // e.g., "Single Chapter", "Entire Unit"
  depth?: string; // e.g., "Brief", "Detailed"
  style?: string; // e.g., "Point-form", "Narrative"
  audience?: string; // e.g., "Students", "Teachers"
  keyConcepts?: string;
}

/**
 * Concept Map specific metadata
 */
export interface ConceptMapMetadata {
  topic?: string;
  mapId?: string; // Unique identifier for database storage
  nodeCount?: number;
  edgeCount?: number;
  complexity?: 'Simple' | 'Moderate' | 'Complex';
}

/**
 * Unified document metadata type
 */
export type DocumentMetadata = 
  | LessonPlanMetadata 
  | SyllabusMetadata 
  | QuizMetadata 
  | QuestionPaperMetadata 
  | StudyNotesMetadata 
  | ConceptMapMetadata;

/**
 * Typed document interfaces using discriminated union
 */
export interface LessonPlanDocument extends BaseDocument {
  type: 'lesson-plan';
  duration?: string;
  metadata?: LessonPlanMetadata;
}

export interface SyllabusDocument extends BaseDocument {
  type: 'syllabus';
  metadata?: SyllabusMetadata;
}

export interface QuizDocument extends BaseDocument {
  type: 'quiz';
  duration?: string; // e.g., "30 Questions"
  metadata?: QuizMetadata;
}

export interface QuestionPaperDocument extends BaseDocument {
  type: 'paper';
  duration?: string;
  metadata?: QuestionPaperMetadata;
}

export interface StudyNotesDocument extends BaseDocument {
  type: 'study-notes';
  metadata?: StudyNotesMetadata;
}

export interface ConceptMapDocument extends BaseDocument {
  type: 'concept-map';
  metadata?: ConceptMapMetadata;
}

/**
 * Union type for all document types
 */
export type Document = 
  | LessonPlanDocument 
  | SyllabusDocument 
  | QuizDocument 
  | QuestionPaperDocument 
  | StudyNotesDocument 
  | ConceptMapDocument;

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use specific document types instead
 */
export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  grade: string;
  dateCreated: string;
  type?: DocumentType;
  content?: string;
  duration?: string;
  topic?: string;
  templateId?: string;
  imageUrl?: string;
  metadata?: any;
}

// ============================================
// TEMPLATE SYSTEM
// ============================================

export interface Template {
  id: string;
  title: string;
  description: string;
  appType: AppType;
  promptContext: string;
  previewPrompt: string;
  tags: string[];
}

// ============================================
// AUTHENTICATION & USER
// ============================================

export enum AuthMode {
  LOGIN = 'Log In',
  SIGNUP = 'Sign Up'
}