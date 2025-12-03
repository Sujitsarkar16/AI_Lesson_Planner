import React, { useState, useEffect } from 'react';
import { LessonPlan } from '../types';
import LessonPlanRenderer from '../components/LessonPlanRenderer';
import ExportModal from '../components/ExportModal';
import { useAuth } from '../utils/AuthContext';

const MyLessonPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    setPlans(savedPlans);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPlans = plans.filter(plan => plan.id !== id);
    setPlans(updatedPlans);
    localStorage.setItem('savedPlans', JSON.stringify(updatedPlans));
    if (selectedPlan?.id === id) {
      setSelectedPlan(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Lesson Plans</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage and review your saved lesson plans.</p>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 bg-white dark:bg-[#111722] rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
             <span className="material-symbols-outlined text-4xl text-slate-400">folder_open</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No plans saved yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Generate your first lesson plan to get started.</p>
          <a href="#/dashboard/generate" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">Generate New</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              onClick={() => setSelectedPlan(plan)}
              className="group cursor-pointer flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111722] p-5 hover:shadow-md hover:border-primary/50 transition-all duration-200"
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                   <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide">
                     {plan.subject}
                   </span>
                   <span className="text-xs text-slate-400">{plan.dateCreated}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {plan.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                   <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">school</span>
                      <span>{plan.grade}</span>
                   </div>
                   {plan.duration && (
                     <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{plan.duration} min</span>
                     </div>
                   )}
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">View Details</span>
                 <button 
                    onClick={(e) => handleDelete(plan.id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                 >
                    <span className="material-symbols-outlined text-lg">delete</span>
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && selectedPlan && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          document={selectedPlan}
          userTier={user?.subscription_tier || 'free'}
        />
      )}

      {/* Modal View */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSelectedPlan(null)}
          ></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#111722] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             {/* Header */}
             <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111722] z-10">
                <div>
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-md">{selectedPlan.title}</h2>
                   <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPlan.subject} • {selectedPlan.grade}</p>
                </div>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
             </div>
             
             {/* Content */}
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0d1218]">
                <div className="bg-white dark:bg-[#111722] p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-full">
                   {selectedPlan.content ? (
                     <LessonPlanRenderer content={selectedPlan.content} />
                   ) : (
                     <p className="text-slate-500 italic">No content available.</p>
                   )}
                </div>
             </div>

             {/* Footer Actions */}
             <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111722] flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  Close
                </button>
                <button 
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors flex items-center gap-2"
                  onClick={() => setShowExportModal(true)}
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export
                </button>
                <button 
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium transition-colors flex items-center gap-2"
                  onClick={() => window.print()}
                >
                  <span className="material-symbols-outlined text-lg">print</span>
                  Print
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLessonPlansPage;