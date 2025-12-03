
export interface UserSettings {
  displayName: string;
  email: string;
  institution: string;
  defaultGrade: string;
  defaultSubject: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: 'Educator',
  email: 'educator@school.org',
  institution: 'Narayana Group',
  defaultGrade: '',
  defaultSubject: ''
};

export const getSettings = (): UserSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const saved = localStorage.getItem('userSettings');
  return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem('userSettings', JSON.stringify(settings));
};
