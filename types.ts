


export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  grade: string;
  dateCreated: string;
  imageUrl?: string; 
  content?: string; 
  duration?: string;
  topic?: string;
  type?: 'lesson-plan' | 'syllabus' | 'paper' | 'quiz' | 'study-notes' | 'concept-map' | 'other';
  templateId?: string; // ID of the visual template used
  metadata?: any; // Store specific form fields (school, teacher, etc) needed for the template
}

export type AppType = 'lesson-plan' | 'syllabus' | 'paper' | 'quiz' | 'study-notes' | 'concept-map';

export interface Template {
  id: string;
  title: string;
  description: string;
  appType: AppType;
  promptContext: string; // The specific instructions injected into the prompt
  previewPrompt: string; // The prompt used to generate the preview image
  tags: string[];
}

export enum AuthMode {
  LOGIN = 'Log In',
  SIGNUP = 'Sign Up'
}

export interface UserSubscription {
  tier: 'free' | 'pro' | 'school';
  status: string;
  currentPeriodEnd?: string;
  usageCount: number;
  usageLimit: number;
}