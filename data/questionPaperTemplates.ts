import { Template } from '../types';

export const QUESTION_PAPER_TEMPLATES: Template[] = [
  {
    id: 'university-exam-qp',
    title: 'University Exam',
    description: 'Formal serif layout with Part A, B, C structure.',
    appType: 'paper',
    promptContext: 'Formal university exam format. Use Part A (Short), Part B (Paragraph), Part C (Essay).',
    previewPrompt: 'A formal university examination paper.',
    tags: ['Formal', 'University', 'Serif']
  },
  {
    id: 'entrance-test-qp',
    title: 'Entrance Test (2-Col)',
    description: 'Compact two-column layout for high-density questions.',
    appType: 'paper',
    promptContext: 'Compact layout. Dense questions. No essay sections.',
    previewPrompt: 'A two-column dense question paper.',
    tags: ['Entrance', 'Compact', '2-Column']
  }
];