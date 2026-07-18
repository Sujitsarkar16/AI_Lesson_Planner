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
  defaultSubject: '',
};

const normaliseSettings = (value: Partial<UserSettings> | null): UserSettings => ({
  ...DEFAULT_SETTINGS,
  ...value,
});

export const getSettings = (): UserSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem('userSettings');
    return normaliseSettings(saved ? JSON.parse(saved) : null);
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: UserSettings): void => {
  try {
    localStorage.setItem('userSettings', JSON.stringify(normaliseSettings(settings)));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const loadSettings = getSettings;
