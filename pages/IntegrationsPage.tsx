
import React, { useState, useEffect } from 'react';

const IntegrationsPage: React.FC = () => {
  // Simulate connection states
  const [connections, setConnections] = useState<Record<string, boolean>>({
    google_classroom: false,
    microsoft_teams: false,
    google_docs: false,
  });

  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // PDF Presets
  const [pdfSettings, setPdfSettings] = useState({
    paperSize: 'A4',
    orientation: 'Portrait',
    includeWatermark: true,
    highContrast: false,
  });

  useEffect(() => {
    // Load from local storage
    const savedConns = localStorage.getItem('integration_connections');
    if (savedConns) setConnections(JSON.parse(savedConns));

    const savedPdf = localStorage.getItem('integration_pdf_settings');
    if (savedPdf) setPdfSettings(JSON.parse(savedPdf));
  }, []);

  const toggleConnection = (key: string) => {
    if (connections[key]) {
      // Disconnect immediately
      const newState = { ...connections, [key]: false };
      setConnections(newState);
      localStorage.setItem('integration_connections', JSON.stringify(newState));
    } else {
      // Simulate OAuth loading
      setLoading(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        const newState = { ...connections, [key]: true };
        setConnections(newState);
        localStorage.setItem('integration_connections', JSON.stringify(newState));
        setLoading(prev => ({ ...prev, [key]: false }));
      }, 1500);
    }
  };

  const handlePdfChange = (key: string, value: any) => {
    const newState = { ...pdfSettings, [key]: value };
    setPdfSettings(newState);
    localStorage.setItem('integration_pdf_settings', JSON.stringify(newState));
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white">Integrations</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Connect your classroom tools and configure export destinations.</p>
      </div>

      {/* LMS Integrations */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 border-b-2 border-black inline-block pb-1">Learning Management Systems</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Google Classroom */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black p-6 flex items-center justify-between shadow-neo hover:translate-y-[-2px] transition-transform">
             <div className="flex items-center gap-4">
               <div className="size-14 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center border-2 border-black">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/5/59/Google_Classroom_Logo.png" alt="Google Classroom" className="w-8 h-8 object-contain" onError={(e) => {e.currentTarget.style.display='none';}} />
               </div>
               <div>
                 <h3 className="text-lg font-black font-display text-slate-900 dark:text-white">Google Classroom</h3>
                 <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sync assignments and rosters</p>
               </div>
             </div>
             <button 
               onClick={() => toggleConnection('google_classroom')}
               disabled={loading['google_classroom']}
               className={`px-4 py-2 rounded-xl text-sm font-bold border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all min-w-[110px] flex justify-center ${connections['google_classroom'] 
                 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                 : 'bg-brand-green text-black'}`}
             >
               {loading['google_classroom'] ? (
                 <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
               ) : connections['google_classroom'] ? 'Disconnect' : 'Connect'}
             </button>
          </div>

          {/* Microsoft Teams */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black p-6 flex items-center justify-between shadow-neo hover:translate-y-[-2px] transition-transform">
             <div className="flex items-center gap-4">
               <div className="size-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center border-2 border-black">
                  <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-3xl">groups</span>
               </div>
               <div>
                 <h3 className="text-lg font-black font-display text-slate-900 dark:text-white">Microsoft Teams</h3>
                 <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Post updates to channels</p>
               </div>
             </div>
             <button 
               onClick={() => toggleConnection('microsoft_teams')}
               disabled={loading['microsoft_teams']}
               className={`px-4 py-2 rounded-xl text-sm font-bold border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all min-w-[110px] flex justify-center ${connections['microsoft_teams'] 
                 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                 : 'bg-indigo-500 text-white'}`}
             >
               {loading['microsoft_teams'] ? (
                 <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
               ) : connections['microsoft_teams'] ? 'Disconnect' : 'Connect'}
             </button>
          </div>
        </div>
      </section>

      {/* Cloud & Export */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 border-b-2 border-black inline-block pb-1">Export Destinations</h2>
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black p-6 shadow-neo">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-brand-blue flex items-center justify-center border-2 border-black">
                    <span className="material-symbols-outlined text-white text-3xl">description</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-display text-slate-900 dark:text-white">Google Docs</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Save lesson plans directly to Drive</p>
                  </div>
              </div>
              <button 
                onClick={() => toggleConnection('google_docs')}
                disabled={loading['google_docs']}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all min-w-[110px] flex justify-center ${connections['google_docs'] 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                  : 'bg-brand-blue text-white'}`}
              >
                {loading['google_docs'] ? (
                  <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                ) : connections['google_docs'] ? 'Disconnect' : 'Connect'}
              </button>
           </div>
           
           {connections['google_docs'] && (
             <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Connected to user@school.org
                </p>
             </div>
           )}
        </div>
      </section>

      {/* PDF Presets */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 border-b-2 border-black inline-block pb-1">PDF Export Presets</h2>
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black p-6 shadow-neo">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Default Paper Size</span>
                    <select 
                      value={pdfSettings.paperSize} 
                      onChange={(e) => handlePdfChange('paperSize', e.target.value)}
                      className="rounded-xl border-2 border-black bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-0 p-3 font-bold"
                    >
                      <option>A4</option>
                      <option>Letter</option>
                      <option>Legal</option>
                    </select>
                 </label>
                 <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Default Orientation</span>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handlePdfChange('orientation', 'Portrait')}
                         className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${pdfSettings.orientation === 'Portrait' ? 'bg-brand-yellow border-black text-black shadow-neo-sm' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}
                       >
                         <span className="material-symbols-outlined">crop_portrait</span>
                         Portrait
                       </button>
                       <button 
                         onClick={() => handlePdfChange('orientation', 'Landscape')}
                         className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${pdfSettings.orientation === 'Landscape' ? 'bg-brand-yellow border-black text-black shadow-neo-sm' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}
                       >
                         <span className="material-symbols-outlined">crop_landscape</span>
                         Landscape
                       </button>
                    </div>
                 </label>
              </div>
              
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 rounded-xl border-2 border-black bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex flex-col">
                       <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Include Watermark</span>
                       <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Add school branding to background</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={pdfSettings.includeWatermark} 
                        onChange={(e) => handlePdfChange('includeWatermark', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none border-2 border-black rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-black after:border-2 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-green"></div>
                    </label>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 rounded-xl border-2 border-black bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex flex-col">
                       <span className="text-sm font-black text-slate-900 dark:text-white uppercase">High Contrast Mode</span>
                       <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Optimize for black & white printing</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={pdfSettings.highContrast} 
                        onChange={(e) => handlePdfChange('highContrast', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none border-2 border-black rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-black after:border-2 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-green"></div>
                    </label>
                 </div>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default IntegrationsPage;
