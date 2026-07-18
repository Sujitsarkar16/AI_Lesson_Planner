

import { Template } from '@/shared/types/document';
import { LESSON_PLAN_TEMPLATES } from './lessonPlanTemplates';
import { SYLLABUS_TEMPLATES } from './syllabusTemplates';
import { QUESTION_PAPER_TEMPLATES } from './questionPaperTemplates';
import { MCQ_TEMPLATES } from './mcqTemplates';
import { STUDY_NOTES_TEMPLATES } from './studyNotesTemplates';

export const TEMPLATES: Template[] = [
  ...LESSON_PLAN_TEMPLATES,
  ...SYLLABUS_TEMPLATES,
  ...QUESTION_PAPER_TEMPLATES,
  ...MCQ_TEMPLATES,
  ...STUDY_NOTES_TEMPLATES
];