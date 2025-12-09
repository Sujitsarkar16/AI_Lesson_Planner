
export interface UserSettings {
  displayName: string;
  email: string;
  institution: string;
  defaultGrade: string;
  defaultSubject: string;
  geminiApiKey: string;
  geminiModel: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: 'Educator',
  email: 'educator@school.org',
  institution: 'Narayana Group',
  defaultGrade: '',
  defaultSubject: '',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash-exp'
};

export const getSettings = (): UserSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const saved = localStorage.getItem('userSettings');
  return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem('userSettings', JSON.stringify(settings));
};
