
import { Template } from '../types';

export const SYLLABUS_TEMPLATES: Template[] = [
  {
    id: 'red-header-syl',
    title: 'Modern Red Syllabus',
    description: 'A clean, modern layout with red accents, clear instructor contact info columns, and a structured weekly schedule.',
    appType: 'syllabus',
    promptContext: 'Create a syllabus with sections: Description, Expectations and Goals, Course Materials (Required/Optional), and a Course Schedule Table (Columns: Week, Topic, Reading, Exercises).',
    previewPrompt: 'A syllabus with a large red title, three-column instructor info, and red subheaders.',
    tags: ['Modern', 'Red', 'Visual']
  },
  {
    id: 'clock-hours-syl',
    title: 'Credit Hour / Formal',
    description: 'A formal academic layout focusing on clock hours, student learning outcomes, and detailed tables.',
    appType: 'syllabus',
    promptContext: 'Formal academic tone. Sections: Student Learning Outcomes, Textbook, and a Table showing "Minimum Clock Hours" or a detailed Schedule. Use standard headers.',
    previewPrompt: 'A formal syllabus with centered headers and a detailed clock-hours table.',
    tags: ['Formal', 'Academic', 'Table']
  },
  {
    id: 'policy-syl',
    title: 'Policy / Compliance',
    description: 'Text-heavy template suitable for university policy requirements with underlined headers.',
    appType: 'syllabus',
    promptContext: 'Strict policy format. Use uppercase headers: BASIC INFORMATION, BULLETIN DESCRIPTION, COURSE OBJECTIVES, REQUIRED STUDENT RESOURCES, COURSE SCHEDULE/OUTLINE.',
    previewPrompt: 'A text-heavy syllabus with underlined uppercase headers.',
    tags: ['Policy', 'Text-Heavy', 'University']
  }
];
