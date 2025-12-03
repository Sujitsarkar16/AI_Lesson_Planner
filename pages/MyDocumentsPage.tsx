




import React, { useState, useEffect } from 'react';
import { AppType, LessonPlan } from '../types';
import DynamicPreview from '../components/DynamicPreview';

const MyDocumentsPage: React.FC = () => {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

  useEffect(() => {
    const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    setPlans(savedPlans);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("Are you sure you want to delete this document?")) {
        const updatedPlans = plans.filter(plan => plan.id !== id);
        setPlans(updatedPlans);
        localStorage.setItem('savedPlans', JSON.stringify(updatedPlans));
        if (selectedPlan?.id === id) {
          setSelectedPlan(null);
        }
    }
  };
  
  const getCardStyle = (type?: string) => {
    switch (type) {
      case 'lesson-plan': return { bg: 'bg-brand-blue', label: 'Lesson Plan' };
      case 'syllabus': return { bg: 'bg-brand-pink', label: 'Syllabus' };
      case 'paper': return { bg: 'bg-brand-yellow', label: 'Exam Paper' };
      case 'quiz': return { bg: 'bg-brand-green', label: 'Quiz' };
      case 'study-notes': return { bg: 'bg-indigo-400', label: 'Notes' };
      case 'concept-map': return { bg: 'bg-brand-orange', label: 'Concept Map' };
      default: return { bg: 'bg-slate-400', label: 'Document' };
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white">My Documents</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage and review your saved lesson plans, quizzes, and papers.</p>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4 border-2 border-slate-200">
             <span className="material-symbols-outlined text-4xl text-slate-400">folder_open</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-display">No documents saved</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Generate your first document to get started.</p>
          <a href="#/dashboard/generate" className="px-6 py-3 bg-brand-black text-white rounded-xl font-bold border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">Generate New</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {plans.map((plan) => {
            const style = getCardStyle(plan.type);
            return (
              <div 
                key={plan.id} 
                onClick={() => setSelectedPlan(plan)}
                className="group cursor-pointer flex flex-col justify-between rounded-xl border-2 border-black bg-white dark:bg-[#1e293b] p-5 shadow-neo-sm hover:shadow-neo hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                     <span className={`px-2 py-1 rounded border-2 border-black text-xs font-black uppercase tracking-wide ${style.bg}`}>
                       {style.label}
                     </span>
                     <span className="text-xs font-bold text-slate-400">{plan.dateCreated}</span>
                  </div>
                  <h3 className="text-xl font-black font-display text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:underline decoration-2 underline-offset-2">
                    {plan.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                     <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">school</span>
                        <span>{plan.grade}</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">category</span>
                        <span>{plan.subject}</span>
                     </div>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-center">
                   <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors">View Details</span>
                   <button 
                      onClick={(e) => handleDelete(plan.id, e)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors border-2 border-transparent hover:border-black"
                   >
                      <span className="material-symbols-outlined text-lg">delete</span>
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal View */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPlan(null)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-2 border-black">
             <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-white dark:bg-[#1e293b] z-10">
                <div>
                   <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white truncate max-w-md">{selectedPlan.title}</h2>
                   <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{selectedPlan.subject} • {selectedPlan.grade}</p>
                </div>
                <button onClick={() => setSelectedPlan(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 border-2 border-transparent hover:border-black transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-[#0f172a]">
                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-xl shadow-neo-sm border-2 border-black min-h-full">
                   {selectedPlan.content ? (
                      <DynamicPreview 
                        templateId={selectedPlan.templateId || null}
                        appType={selectedPlan.type as AppType}
                        generatedContent={selectedPlan.content}
                        imageUrl={selectedPlan.imageUrl}
                        data={selectedPlan.metadata || {
                           title: selectedPlan.title,
                           subject: selectedPlan.subject,
                           grade: selectedPlan.grade,
                           duration: selectedPlan.duration,
                           date: selectedPlan.dateCreated,
                           topic: selectedPlan.topic,
                           teacher: 'Educator', 
                           school: 'School'
                        }}
                     />
                   ) : (
                     <p className="text-slate-500 italic">No content available.</p>
                   )}
                </div>
             </div>
             <div className="px-6 py-4 border-t-2 border-black bg-white dark:bg-[#1e293b] flex justify-end gap-3">
                <button onClick={() => setSelectedPlan(null)} className="px-4 py-2 rounded-lg text-black font-bold border-2 border-transparent hover:bg-slate-100 transition-colors">Close</button>
                <button className="px-4 py-2 rounded-lg bg-brand-yellow text-black border-2 border-black hover:bg-yellow-400 font-bold transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2" onClick={() => window.print()}>
                  <span className="material-symbols-outlined text-lg">print</span> Print
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MyDocumentsPage;