/**
 * Advanced Generator Configuration System
 * Provides structured controls for language, tone, classroom context, and teaching style
 */

// ============================================
// LANGUAGE & TONE CONFIGURATION
// ============================================

export type LanguageOption = 'English' | 'Spanish' | 'French' | 'German' | 'Hindi' | 'Mandarin' | 'Arabic' | 'Other';
export type ToneStyle = 'Formal' | 'Informal' | 'Conversational' | 'Academic' | 'Friendly' | 'Professional';
export type BilingualMode = 'None' | 'Side-by-Side' | 'Interspersed' | 'Translations-Only';

export interface LanguageConfig {
  primaryLanguage: LanguageOption;
  secondaryLanguage?: LanguageOption;
  bilingualMode?: BilingualMode;
  tone: ToneStyle;
  vocabularyLevel?: 'Simple' | 'Standard' | 'Advanced';
  includeTranslations?: boolean;
}

// ============================================
// CLASSROOM CONTEXT CONFIGURATION
// ============================================

export type ClassroomSize = 'Small (1-15)' | 'Medium (16-30)' | 'Large (31-50)' | 'Very Large (50+)';
export type DeliveryMode = 'In-Person' | 'Online' | 'Hybrid' | 'Asynchronous';
export type ResourceLevel = 'Minimal' | 'Standard' | 'Well-Resourced' | 'Technology-Rich';

export interface ClassroomContext {
  size: ClassroomSize;
  deliveryMode: DeliveryMode;
  resourceLevel: ResourceLevel;
  hasInternetAccess?: boolean;
  hasProjector?: boolean;
  hasLab?: boolean;
  specialNeeds?: string[]; // e.g., ["Visual Impairment", "ESL Students"]
  availableTime?: number; // minutes per session
}

// ============================================
// TEACHING STYLE CONFIGURATION
// ============================================

export type TeachingApproach =
  | 'Direct Instruction'
  | 'Inquiry-Based'
  | 'Problem-Based Learning'
  | 'Project-Based Learning'
  | 'Flipped Classroom'
  | 'Socratic Method'
  | 'Collaborative Learning'
  | 'Differentiated Instruction'
  | 'Montessori'
  | 'Waldorf';

export type AssessmentStrategy =
  | 'Formative Only'
  | 'Summative Only'
  | 'Balanced Mix'
  | 'Self-Assessment'
  | 'Peer Assessment'
  | 'Portfolio-Based'
  | 'Standards-Based';

export type LearningModality = 'Visual' | 'Auditory' | 'Kinesthetic' | 'Reading/Writing' | 'Multimodal';

export interface TeachingStyle {
  approach: TeachingApproach;
  assessmentStrategy: AssessmentStrategy;
  preferredModalities: LearningModality[];
  pacePreference: 'Slow & Thorough' | 'Moderate' | 'Fast-Paced';
  interactionLevel: 'Low' | 'Medium' | 'High'; // Student-teacher interaction
  technologyIntegration: 'Minimal' | 'Moderate' | 'Heavy';
}

// ============================================
// COMPLETE GENERATOR CONFIGURATION
// ============================================

export interface GeneratorConfig {
  language?: LanguageConfig;
  classroom?: ClassroomContext;
  teaching?: TeachingStyle;
  metadata?: {
    generatedBy?: string;
    version?: string;
    timestamp?: string;
  };
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const DEFAULT_LANGUAGE_CONFIG: LanguageConfig = {
  primaryLanguage: 'English',
  tone: 'Professional',
  vocabularyLevel: 'Standard',
  bilingualMode: 'None',
  includeTranslations: false
};

export const DEFAULT_CLASSROOM_CONTEXT: ClassroomContext = {
  size: 'Medium (16-30)',
  deliveryMode: 'In-Person',
  resourceLevel: 'Standard',
  hasInternetAccess: true,
  hasProjector: true,
  hasLab: false,
  specialNeeds: [],
  availableTime: 60
};

export const DEFAULT_TEACHING_STYLE: TeachingStyle = {
  approach: 'Direct Instruction',
  assessmentStrategy: 'Balanced Mix',
  preferredModalities: ['Multimodal'],
  pacePreference: 'Moderate',
  interactionLevel: 'Medium',
  technologyIntegration: 'Moderate'
};

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  language: DEFAULT_LANGUAGE_CONFIG,
  classroom: DEFAULT_CLASSROOM_CONTEXT,
  teaching: DEFAULT_TEACHING_STYLE
};

export const DEFAULT_CONFIG = DEFAULT_GENERATOR_CONFIG;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert configuration to prompt instructions
 */
export function configToPromptInstructions(config: GeneratorConfig): string {
  const parts: string[] = [];

  // Language instructions
  if (config.language) {
    const lang = config.language;
    parts.push(`LANGUAGE & TONE:`);
    parts.push(`- Primary Language: ${lang.primaryLanguage}`);
    parts.push(`- Tone: ${lang.tone}`);
    parts.push(`- Vocabulary Level: ${lang.vocabularyLevel || 'Standard'}`);

    if (lang.secondaryLanguage && lang.bilingualMode !== 'None') {
      parts.push(`- Secondary Language: ${lang.secondaryLanguage}`);
      parts.push(`- Bilingual Mode: ${lang.bilingualMode}`);
    }
    parts.push('');
  }

  // Classroom context instructions
  if (config.classroom) {
    const classroom = config.classroom;
    parts.push(`CLASSROOM CONTEXT:`);
    parts.push(`- Class Size: ${classroom.size}`);
    parts.push(`- Delivery Mode: ${classroom.deliveryMode}`);
    parts.push(`- Resource Level: ${classroom.resourceLevel}`);

    const resources: string[] = [];
    if (classroom.hasInternetAccess) resources.push('Internet');
    if (classroom.hasProjector) resources.push('Projector');
    if (classroom.hasLab) resources.push('Lab');
    if (resources.length > 0) {
      parts.push(`- Available Resources: ${resources.join(', ')}`);
    }

    if (classroom.specialNeeds && classroom.specialNeeds.length > 0) {
      parts.push(`- Special Considerations: ${classroom.specialNeeds.join(', ')}`);
    }

    if (classroom.availableTime) {
      parts.push(`- Time Available: ${classroom.availableTime} minutes`);
    }
    parts.push('');
  }

  // Teaching style instructions
  if (config.teaching) {
    const teaching = config.teaching;
    parts.push(`TEACHING APPROACH:`);
    parts.push(`- Primary Method: ${teaching.approach}`);
    parts.push(`- Assessment Strategy: ${teaching.assessmentStrategy}`);
    parts.push(`- Preferred Modalities: ${teaching.preferredModalities.join(', ')}`);
    parts.push(`- Pace: ${teaching.pacePreference}`);
    parts.push(`- Interaction Level: ${teaching.interactionLevel}`);
    parts.push(`- Technology Use: ${teaching.technologyIntegration}`);
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Merge partial config with defaults
 */
export function mergeWithDefaults(partial: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    language: { ...DEFAULT_LANGUAGE_CONFIG, ...(partial.language || {}) },
    classroom: { ...DEFAULT_CLASSROOM_CONTEXT, ...(partial.classroom || {}) },
    teaching: { ...DEFAULT_TEACHING_STYLE, ...(partial.teaching || {}) },
    metadata: partial.metadata
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: GeneratorConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate language config
  if (config.language?.bilingualMode !== 'None' && !config.language?.secondaryLanguage) {
    errors.push('Bilingual mode requires a secondary language');
  }

  // Validate classroom context
  if (config.classroom?.deliveryMode === 'Online' && !config.classroom?.hasInternetAccess) {
    errors.push('Online delivery requires internet access');
  }

  // Validate teaching style
  if (config.teaching?.technologyIntegration === 'Heavy' &&
    config.classroom?.resourceLevel === 'Minimal') {
    errors.push('Heavy technology integration conflicts with minimal resources');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get config summary for display
 */
export function getConfigSummary(config: GeneratorConfig): string {
  const parts: string[] = [];

  if (config.language) {
    parts.push(`${config.language.tone} ${config.language.primaryLanguage}`);
  }

  if (config.classroom) {
    parts.push(config.classroom.size);
    parts.push(config.classroom.deliveryMode);
  }

  if (config.teaching) {
    parts.push(config.teaching.approach);
  }

  return parts.join(' • ');
}
