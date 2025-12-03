import { Template } from '../types';

export const LESSON_PLAN_TEMPLATES: Template[] = [
  {
    id: 'simple-purple-lp',
    title: 'Simple Lesson Plan',
    description: 'A clean, purple-accented template with clear sections for objectives, activities, and assessment.',
    appType: 'lesson-plan',
    promptContext: 'Format the lesson plan with these specific sections: Objectives, Activities, and Assessment. Keep it concise.',
    previewPrompt: 'A simple lesson plan document with a purple header and three main sections.',
    tags: ['Simple', 'Purple', 'Standard']
  },
  {
    id: 'small-group-purple-lp',
    title: 'Small Group Plan',
    description: 'Designed for small group instruction with focus on skills and feedback.',
    appType: 'lesson-plan',
    promptContext: 'Focus on small group instruction. Sections: Focus/Skill, Activities, and Feedback.',
    previewPrompt: 'A small group lesson plan with a purple header and focus on feedback.',
    tags: ['Small Group', 'Purple', 'Intervention']
  },
  {
    id: 'daily-grid-lp',
    title: 'Daily Grid Plan',
    description: 'Detailed daily planner with sections for materials, learning objectives, and a timed activity structure.',
    appType: 'lesson-plan',
    promptContext: 'Create a daily lesson plan. Sections needed: Lesson focus & goals, Materials, Learning objective, Structure/Activity (with timing), Starter, Plenary, Homework.',
    previewPrompt: 'A complex grid layout lesson plan for daily tracking.',
    tags: ['Daily', 'Grid', 'Detailed']
  },
  {
    id: 'bi-weekly-grid-lp',
    title: 'Bi-Weekly Plan',
    description: 'Two-week overview template focusing on learning expectations and assessment alignment.',
    appType: 'lesson-plan',
    promptContext: 'Create a bi-weekly plan overview. Sections: Objectives, Specific Learning Expectations, Learning Activities, Assessment.',
    previewPrompt: 'A landscape oriented lesson plan for bi-weekly planning.',
    tags: ['Bi-Weekly', 'Overview', 'Landscape']
  }
];