
import React, { useState, useEffect } from 'react';
import { UserSettings, getSettings, saveSettings } from '../settings';
import { validateApiKey, GEMINI_MODELS } from '../utils/apiKeyManager';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [docCount, setDocCount] = useState(0);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidation, setKeyValidation] = useState<{ isValid: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load doc count for the danger zone
    const savedDocs = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    setDocCount(savedDocs.length);
  }, []);

  const handleChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
    
    // Reset validation when API key changes
    if (field === 'geminiApiKey') {
      setKeyValidation(null);
    }
  };

  const handleValidateKey = async () => {
    if (!settings.geminiApiKey) {
      setKeyValidation({ isValid: false, message: 'Please enter an API key first' });
      return;
    }

    setIsValidatingKey(true);
    setKeyValidation(null);

    try {
      const result = await validateApiKey(settings.geminiApiKey);
      
      if (result.isValid) {
        setKeyValidation({ 
          isValid: true, 
          message: '✅ API key is valid and working!' 
        });
      } else {
        setKeyValidation({ 
          isValid: false, 
          message: result.error || 'Invalid API key' 
        });
      }
    } catch (error) {
      setKeyValidation({ 
        isValid: false, 
        message: 'Failed to validate API key. Please check your internet connection.' 
      });
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to delete all saved lesson plans and documents? This cannot be undone.")) {
      localStorage.removeItem('savedPlans');
      setDocCount(0);
      alert("All documents have been cleared.");
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage your profile, defaults, and data preferences.</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-8">
        {/* Profile Section */}
        <section className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black p-8 shadow-neo">
           <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-brand-blue border-2 border-black text-black rounded-xl shadow-neo-sm">
                <span className="material-symbols-outlined text-2xl">person</span>
              </div>
              <div>
                <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white">Profile Information</h2>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">These details will appear on your generated documents.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Display Name</label>
                 <input 
                    type="text" 
                    value={settings.displayName} 
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 focus:border-black p-3 font-medium transition-colors" 
                  />
              </div>
              <div className="flex flex-col">
                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Email Address</label>
                 <input 
                    type="email" 
                    value={settings.email} 
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 focus:border-black p-3 font-medium transition-colors" 
                  />
              </div>
              <div className="flex flex-col md:col-span-2">
                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Institution / School Name</label>
                 <input 
                    type="text" 
                    value={settings.institution} 
                    onChange={(e) => handleChange('institution', e.target.value)}
                    className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 focus:border-black p-3 font-medium transition-colors" 
                    placeholder="e.g. Springfield High School"
                  />
              </div>
           </div>
        </section>

        {/* API Configuration Section */}
        <section className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black p-8 shadow-neo">
           <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-brand-green border-2 border-black text-black rounded-xl shadow-neo-sm">
                <span className="material-symbols-outlined text-2xl">key</span>
              </div>
              <div>
                <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white">API Configuration</h2>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Add your Google Gemini API key to enable AI generation.</p>
              </div>
           </div>
           
           <div className="flex flex-col gap-6">
              {/* API Key Input */}
              <div className="flex flex-col">
                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Google Gemini API Key</label>
                 <div className="flex gap-3">
                   <input 
                      type="password" 
                      value={settings.geminiApiKey} 
                      onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                      className="flex-1 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 focus:border-black p-3 font-mono text-sm transition-colors" 
                      placeholder="AIza...your-api-key-here"
                    />
                    <button
                      type="button"
                      onClick={handleValidateKey}
                      disabled={isValidatingKey || !settings.geminiApiKey}
                      className="px-6 py-3 rounded-xl border-2 border-black bg-brand-blue text-white font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] whitespace-nowrap"
                    >
                      {isValidatingKey ? (
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined animate-spin">progress_activity</span>
                          Validating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined">verified</span>
                          Validate
                        </span>
                      )}
                    </button>
                 </div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                   Get your free API key from{' '}
                   <a 
                     href="https://aistudio.google.com/app/apikey" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-brand-blue hover:underline font-bold"
                   >
                     Google AI Studio →
                   </a>
                 </p>

                 {/* Validation Message */}
                 {keyValidation && (
                   <div className={`mt-3 p-3 rounded-xl border-2 flex items-start gap-2 ${
                     keyValidation.isValid 
                       ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700' 
                       : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-700'
                   }`}>
                     <span className={`material-symbols-outlined ${
                       keyValidation.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                     }`}>
                       {keyValidation.isValid ? 'check_circle' : 'error'}
                     </span>
                     <p className={`text-sm font-bold ${
                       keyValidation.isValid 
                         ? 'text-green-800 dark:text-green-300' 
                         : 'text-red-800 dark:text-red-300'
                     }`}>
                       {keyValidation.message}
                     </p>
                   </div>
                 )}
              </div>

              {/* Model Selection */}
              <div className="flex flex-col">
                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Gemini Model</label>
                 <select
                    value={settings.geminiModel}
                    onChange={(e) => handleChange('geminiModel', e.target.value)}
                    className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 focus:border-black p-3 font-medium transition-colors cursor-pointer"
                 >
                   {GEMINI_MODELS.filter(m => !m.id.includes('image')).map(model => (
                     <option key={model.id} value={model.id}>
                       {model.name} - {model.description}
                     </option>
                   ))}
                 </select>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                   Select the AI model to use for content generation. Faster models respond quicker, while Pro models provide more detailed outputs.
                 </p>
              </div>
           </div>
        </section>

        {/* Preferences Section */}
        <section className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black p-8 shadow-neo">
           <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-brand-pink border-2 border-black text-black rounded-xl shadow-neo-sm">
                <span className="material-symbols-outlined text-2xl">tune</span>
              </div>
              <div>
                <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white">Generator Defaults</h2>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Pre-fill these fields when creating new content.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Default Grade Level</label>
                 <input 
                    type="text" 
                    value={settings.defaultGrade} 
                    onChange={(e) => handleChange('defaultGrade', e.target.value)}
                    className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 focus:border-black p-3 font-medium transition-colors" 
                    placeholder="e.g. 10th Grade"
                  />
              </div>
              <div className="flex flex-col">
                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Default Subject</label>
                 <input 
                    type="text" 
                    value={settings.defaultSubject} 
                    onChange={(e) => handleChange('defaultSubject', e.target.value)}
                    className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 focus:border-black p-3 font-medium transition-colors" 
                    placeholder="e.g. Mathematics"
                  />
              </div>
           </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
           <button 
             type="submit" 
             className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-black border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${isSaved ? 'bg-brand-green' : 'bg-brand-yellow'}`}
           >
             <span className="material-symbols-outlined">{isSaved ? 'check' : 'save'}</span>
             {isSaved ? 'Settings Saved' : 'Save Changes'}
           </button>
        </div>
      </form>

      {/* Danger Zone */}
      <section className="bg-red-50 dark:bg-red-900/10 rounded-2xl border-2 border-red-500 dark:border-red-900/50 p-6 mt-4 border-dashed">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg border-2 border-red-500">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <h2 className="text-lg font-black font-display text-red-900 dark:text-red-400">Danger Zone</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-300">Clear All Stored Data</p>
                <p className="text-sm text-red-600 dark:text-red-400/80">Permanently delete all {docCount} saved documents. This action cannot be undone.</p>
             </div>
             <button 
               onClick={handleClearData}
               className="px-6 py-3 bg-white dark:bg-red-950 border-2 border-red-500 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
             >
               Delete All Data
             </button>
          </div>
      </section>
    </div>
  );
};

export default SettingsPage;
