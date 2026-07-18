import React, { useEffect, useState } from 'react';
import { UserSettings, getSettings, saveSettings } from '@/modules/user/settings';
import { useAuth } from '@/modules/auth/AuthContext';
import { UserProfileService } from '@/modules/user/userProfileService';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="flex flex-col gap-1.5"><span className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</span>{children}</label>;
const inputClass = 'dashboard-input';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [docCount, setDocCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSettings(getSettings());
    setDocCount(JSON.parse(localStorage.getItem('savedPlans') || '[]').length);
    setIsLoading(false);
  }, [user]);

  const handleChange = (field: keyof UserSettings, value: string) => {
    setSettings((previous) => ({ ...previous, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.sub) {
      alert('Please log in again before saving your settings.');
      return;
    }
    try {
      const userProfile = await UserProfileService.getOrCreateUser(user.sub, user.email || 'unknown@email.com', user.name || settings.displayName);
      if (!userProfile) throw new Error('Unable to verify your user profile.');
      saveSettings(settings);
      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Settings save failed:', error);
      alert('Settings could not be saved. Please try again.');
    }
  };

  const handleClearData = () => {
    if (window.confirm('Delete all saved lesson plans and documents? This cannot be undone.')) {
      localStorage.removeItem('savedPlans');
      setDocCount(0);
    }
  };

  if (isLoading) return <div className="flex min-h-48 items-center justify-center text-sm font-bold text-slate-500"><span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>Loading settings…</div>;

  return <div className="mx-auto flex max-w-4xl flex-col gap-6">
    <div><p className="dashboard-kicker">Workspace</p><h1 className="mt-1 text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Settings</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your profile, planning defaults, and locally stored documents.</p></div>
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <section className="dashboard-panel"><div className="dashboard-panel-heading"><span className="dashboard-icon bg-brand-blue"><span className="material-symbols-outlined">person</span></span><div><h2>Profile information</h2><p>These details appear on generated documents.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Display name"><input className={inputClass} value={settings.displayName} onChange={(event) => handleChange('displayName', event.target.value)} /></Field><Field label="Email address"><input className={inputClass} type="email" value={settings.email} onChange={(event) => handleChange('email', event.target.value)} /></Field><div className="md:col-span-2"><Field label="Institution or school name"><input className={inputClass} value={settings.institution} onChange={(event) => handleChange('institution', event.target.value)} placeholder="e.g. Springfield High School" /></Field></div></div></section>
      <section className="dashboard-panel"><div className="dashboard-panel-heading"><span className="dashboard-icon bg-brand-pink"><span className="material-symbols-outlined">tune</span></span><div><h2>Generator defaults</h2><p>Pre-fill common details when you create new content.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Default grade level"><input className={inputClass} value={settings.defaultGrade} onChange={(event) => handleChange('defaultGrade', event.target.value)} placeholder="e.g. 10th Grade" /></Field><Field label="Default subject"><input className={inputClass} value={settings.defaultSubject} onChange={(event) => handleChange('defaultSubject', event.target.value)} placeholder="e.g. Mathematics" /></Field></div></section>
      <div className="flex justify-end"><button type="submit" className={`dashboard-button ${isSaved ? 'bg-brand-green' : 'bg-brand-yellow'}`}><span className="material-symbols-outlined">{isSaved ? 'check' : 'save'}</span>{isSaved ? 'Settings saved' : 'Save changes'}</button></div>
    </form>
    <section className="dashboard-danger"><div><p className="font-extrabold text-red-900 dark:text-red-300">Clear stored documents</p><p className="mt-1 text-sm text-red-700 dark:text-red-300/80">Permanently delete all {docCount} saved documents from this browser.</p></div><button type="button" onClick={handleClearData} className="dashboard-danger-button">Delete all data</button></section>
  </div>;
};
export default SettingsPage;
