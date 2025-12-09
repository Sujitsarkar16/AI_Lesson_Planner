
import React, { useRef, useEffect, useState } from 'react';
import LessonPlanRenderer from './LessonPlanRenderer';

interface GeneratorLayoutProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  generatedContent: string;
  isLoading: boolean;
  onBack: () => void;
  onSave: () => void;
  isSaved: boolean;
  customPreview?: React.ReactNode;
  onContentChange?: (content: string) => void;
}

const GeneratorLayout: React.FC<GeneratorLayoutProps> = ({
  title,
  icon,
  children,
  generatedContent,
  isLoading,
  onBack,
  onSave,
  isSaved,
  customPreview,
  onContentChange
}) => {
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (outputContainerRef.current && isLoading) {
      outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
    }
  }, [generatedContent, isLoading]);

  const renderContent = () => {
    // If Editing, show Textarea
    if (isEditing) {
      return (
        <textarea
          className="w-full h-full min-h-[500px] p-6 font-mono text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-none border-none"
          value={generatedContent}
          onChange={(e) => onContentChange && onContentChange(e.target.value)}
          placeholder="Generated content will appear here..."
        />
      );
    }

    // If Custom Preview (Visual Template)
    if (customPreview) {
      return customPreview;
    }
    
    // Default Markdown View
    if (generatedContent) {
      return (
        <div className="bg-white dark:bg-[#1e293b] p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           {isLoading && (
             <div className="flex items-center gap-2 mb-4 text-primary text-sm font-bold animate-pulse">
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                AI is crafting your content...
             </div>
           )}
          <LessonPlanRenderer content={generatedContent} />
        </div>
      );
    }

    // Empty State
    return (
       <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 min-h-[400px]">
          <div className="size-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center mb-4 transform rotate-3">
             <span className="material-symbols-outlined text-4xl opacity-50">article</span>
          </div>
          <p className="text-xl font-bold font-display text-slate-900 dark:text-white">Ready to generate</p>
          <p className="text-sm max-w-xs text-center mt-2 font-medium">Fill out the details on the left and hit the generate button.</p>
       </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 text-slate-500 dark:text-[#94a3b8] font-bold text-sm">
          <button onClick={onBack} className="hover:text-black dark:hover:text-white hover:underline uppercase tracking-wide">Tools</button>
          <span>/</span>
          <span className="text-black dark:text-white uppercase tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-yellow border-2 border-black shadow-neo-sm text-black">
             <span className="material-symbols-outlined text-3xl">{icon}</span>
          </div>
          <h1 className="text-4xl font-black font-display text-gray-900 dark:text-white">{title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Left Column: Form */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-neo border-2 border-black overflow-y-auto">
          {children}
        </div>

        {/* Right Column: Preview */}
        <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-white dark:bg-[#1e293b] shadow-neo">
          <div className="flex items-center justify-between border-b-2 border-black px-6 py-4 bg-slate-50 dark:bg-[#1e293b]">
             <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {isLoading && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-pink opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 border border-black ${isLoading ? 'bg-brand-pink' : generatedContent ? 'bg-brand-green' : 'bg-slate-300'}`}></span>
                </span>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  {isEditing ? 'Edit Source' : 'Output Preview'}
                </h3>
             </div>
             <div className="flex gap-2">
                {generatedContent && !isLoading && (
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${isEditing ? 'bg-brand-black text-white border-black' : 'bg-white text-black border-black'}`}
                  >
                     <span className="material-symbols-outlined text-lg">{isEditing ? 'visibility' : 'edit_note'}</span>
                     {isEditing ? 'Preview' : 'Edit'}
                  </button>
                )}
                
                <button 
                  onClick={() => setIsFullScreen(true)}
                  disabled={!generatedContent || isEditing}
                  className="flex items-center gap-2 rounded-lg bg-blue-50 text-blue-700 border-2 border-black dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                >
                   <span className="material-symbols-outlined text-lg">visibility</span>
                   <span>Full Page</span>
                </button>
                <button 
                  onClick={onSave}
                  disabled={!generatedContent || isSaved}
                  className="flex items-center gap-2 rounded-lg bg-brand-yellow border-2 border-black px-3 py-1.5 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-50 transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                >
                   <span className="material-symbols-outlined text-lg">{isSaved ? 'check' : 'save'}</span>
                   {isSaved ? 'Saved' : 'Save'}
                </button>
             </div>
          </div>
          
          <div ref={outputContainerRef} className="flex-1 overflow-y-auto p-0 bg-slate-100 dark:bg-[#0f172a]">
             {renderContent()}
          </div>
        </div>
      </div>

      {/* Full Screen Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-[#0f172a] animate-in fade-in duration-200">
           <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1e293b] border-b-2 border-black shadow-sm z-10">
              <div className="flex items-center gap-3">
                 <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">Full Page Preview</h2>
                 <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 border-2 border-black uppercase tracking-wider">{title}</span>
              </div>
              <div className="flex gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border-2 border-black px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                  >
                     <span className="material-symbols-outlined text-lg">print</span>
                     Print
                  </button>
                  <button 
                    onClick={() => setIsFullScreen(false)}
                    className="flex items-center gap-2 rounded-lg bg-brand-black px-4 py-2 text-sm font-bold text-white border-2 border-black hover:bg-slate-800 transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                  >
                     <span className="material-symbols-outlined text-lg">close</span>
                     Close
                  </button>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
              {customPreview ? (
                <div className="mx-auto max-w-fit shadow-2xl min-h-full border-2 border-black">
                   {customPreview}
                </div>
              ) : (
                <div className="max-w-[210mm] mx-auto bg-white dark:bg-[#1e293b] shadow-neo border-2 border-black min-h-full p-12">
                   <LessonPlanRenderer content={generatedContent} />
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default GeneratorLayout;
