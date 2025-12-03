

import { Template } from '../types';

export const STUDY_NOTES_TEMPLATES: Template[] = [
  {
    id: 'exam-revision-notes',
    title: 'Exam Revision Sheet',
    description: 'Concise, high-yield notes focusing on key formulas, definitions, and quick summaries. Perfect for last-minute review.',
    appType: 'study-notes',
    promptContext: 'Strictly follow the "Revision" format. Include a "Quick Revision Sheet" at the top. Focus on high-frequency exam topics, mnemonics, and cheat-sheet style summaries. Keep explanations brief.',
    previewPrompt: 'A condensed one-page exam revision sheet with highlighted formulas and key terms.',
    tags: ['Revision', 'Concise', 'Exam']
  },
  {
    id: 'detailed-textbook-notes',
    title: 'Textbook Chapter',
    description: 'Comprehensive, deep-dive notes covering a chapter in detail with examples and explanations.',
    appType: 'study-notes',
    promptContext: 'Provide "Detailed" depth. Structure like a textbook chapter: Introduction, deeply explained Concepts with sub-sections, multiple Examples, and extensive Diagrams descriptions. Use a formal, academic tone.',
    previewPrompt: 'A detailed textbook page layout with headers, paragraphs, and diagrams.',
    tags: ['Detailed', 'Academic', 'Chapter']
  },
  {
    id: 'visual-flowchart-notes',
    title: 'Visual / Flowchart',
    description: 'Notes structured around processes, timelines, and connections between concepts.',
    appType: 'study-notes',
    promptContext: 'Focus on "Flowchart" and "Visual" style. Present information as step-by-step processes, timelines, or hierarchy lists. Use MermaidJS syntax (```mermaid ... ```) heavily for all diagrams. Minimize long paragraphs.',
    previewPrompt: 'A visual study guide with flowcharts and diagrammatic layouts.',
    tags: ['Visual', 'Process', 'Flowchart']
  }
];