
import { Template } from '@/shared/types/document';

export const MCQ_TEMPLATES: Template[] = [
  {
    id: 'formal-assessment-mcq',
    title: 'Formal Assessment',
    description: 'Clean, table-based layout suitable for formal exams and assessments. Options aligned vertically.',
    appType: 'quiz',
    promptContext: 'Format as a Formal Assessment. Strict Requirement: Create a Markdown Table with 3 columns: "Q.No", "Question & Options", "Marks". In "Question & Options", list options vertically using <br> tags.',
    previewPrompt: 'A formal assessment paper with questions in a clean table layout.',
    tags: ['Table', 'Formal', 'Clean']
  },
  {
    id: 'standard-worksheet-mcq',
    title: 'Standard Worksheet',
    description: 'Standard layout for class worksheets.',
    appType: 'quiz',
    promptContext: 'Create a Standard Worksheet. Structure using a markdown table with columns: Q.No, Question, Marks. Use <br> for vertical option alignment.',
    previewPrompt: 'A school worksheet with multiple choice questions.',
    tags: ['Worksheet', 'Standard', 'School']
  },
  {
    id: 'rapid-fire-mcq',
    title: 'Rapid Fire',
    description: 'Dark mode style for quick projection quizzes.',
    appType: 'quiz',
    promptContext: 'Short questions, bold answers key at the bottom. No table required for this format.',
    previewPrompt: 'A dark background quiz slide.',
    tags: ['Dark', 'Projection', 'Quick']
  }
];
