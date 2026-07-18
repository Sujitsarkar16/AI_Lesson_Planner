




import React, { useState, useEffect } from 'react';
import { AppType, getDocumentTypeLabel, LessonPlan } from '@/shared/types/document';
import DynamicPreview from '@/modules/generation/DynamicPreview';
import ExportModal from '@/modules/documents/ExportModal';
import ClassroomPresenter from '@/modules/documents/ClassroomPresenter';
import { useAuth } from '@/modules/auth/AuthContext';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';
import { getSavedPlans, replaceSavedPlans } from '@/modules/documents/savedPlansStorage';
import { calculateDocumentExpiry, formatTimeRemaining, getExpiryBadgeClasses, getExpiryWarningMessage } from '@/modules/documents/documentExpiry';
import { exportLessonAsSlides } from '@/modules/documents/exports/slideExport';

const MyDocumentsPage: React.FC = () => {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showClassroomPresenter, setShowClassroomPresenter] = useState(false);
  const [databaseUserId, setDatabaseUserId] = useState<string | null>(null);
  const [localPlanIds, setLocalPlanIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    let isCurrent = true;

    const setLocalPlans = () => {
      const localPlans = getSavedPlans();
      if (isCurrent) {
        setDatabaseUserId(null);
        setLocalPlanIds(new Set(localPlans.map((plan) => plan.id)));
        setPlans(localPlans);
      }
    };

    const loadPlans = async () => {
      if (!user?.sub) {
        setLocalPlans();
        return;
      }

      const profile = await UserProfileService.getUserByAuth0Id(user.sub);
      if (!profile) {
        setLocalPlans();
        return;
      }

      await DocumentService.migrateLocalStorageData(profile.id);
      const [documents, localPlans] = await Promise.all([
        DocumentService.getDocuments(profile.id),
        Promise.resolve(getSavedPlans())
      ]);

      if (isCurrent) {
        setDatabaseUserId(profile.id);
        setLocalPlanIds(new Set(localPlans.map((plan) => plan.id)));
        setPlans([...documents, ...localPlans]);
      }
    };

    void loadPlans();
    return () => {
      isCurrent = false;
    };
  }, [user?.sub]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    const isLocalPlan = localPlanIds.has(id);
    if (!isLocalPlan && databaseUserId && !(await DocumentService.deleteDocument(id))) return;

    const updatedPlans = plans.filter((plan) => plan.id !== id);
    if (isLocalPlan) {
      const updatedLocalPlans = getSavedPlans().filter((plan) => plan.id !== id);
      replaceSavedPlans(updatedLocalPlans);
      setLocalPlanIds(new Set(updatedLocalPlans.map((plan) => plan.id)));
    }

    setPlans(updatedPlans);
    if (selectedPlan?.id === id) {
      setSelectedPlan(null);
    }
  };
  
  const getCardStyle = (type?: LessonPlan['type']) => {
    switch (type) {
      case 'lesson-plan': return { bg: 'bg-brand-blue' };
      case 'syllabus': return { bg: 'bg-brand-pink' };
      case 'paper': return { bg: 'bg-brand-yellow' };
      case 'quiz': return { bg: 'bg-brand-green' };
      case 'study-notes': return { bg: 'bg-indigo-400' };
      case 'concept-map': return { bg: 'bg-brand-orange' };
      default: return { bg: 'bg-slate-400' };
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white">My Documents</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage and review your saved lesson plans, quizzes, and papers.</p>
        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl flex items-start gap-2">
          <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-500">schedule</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Auto-Deletion Policy</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Documents are automatically deleted after 3 days. Export important documents to save them permanently.
            </p>
          </div>
        </div>
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
            const expiry = calculateDocumentExpiry(plan.dateCreated);
            const warningMessage = getExpiryWarningMessage(expiry);
            
            return (
              <div 
                key={plan.id} 
                onClick={() => setSelectedPlan(plan)}
                className="group cursor-pointer flex flex-col justify-between rounded-xl border-2 border-black bg-white dark:bg-[#1e293b] p-5 shadow-neo-sm hover:shadow-neo hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                     <span className={`px-2 py-1 rounded border-2 border-black text-xs font-black uppercase tracking-wide ${style.bg}`}>
                       {getDocumentTypeLabel(plan.type)}
                     </span>
                     <span className={`px-2 py-1 rounded border-2 text-xs font-black flex items-center gap-1 ${getExpiryBadgeClasses(expiry.warningLevel)}`}>
                       <span className="material-symbols-outlined text-xs">schedule</span>
                       {formatTimeRemaining(expiry)}
                     </span>
                  </div>
                  
                  {warningMessage && (
                    <div className={`p-2 rounded-lg border-2 text-xs font-bold ${getExpiryBadgeClasses(expiry.warningLevel)}`}>
                      {warningMessage}
                    </div>
                  )}
                  
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
                
                {/* Classroom Presenter Button (Lesson Plans Only) */}
                {selectedPlan.type === 'lesson-plan' && (
                  <button 
                    className="px-4 py-2 rounded-lg bg-brand-pink text-white border-2 border-black hover:bg-pink-600 font-bold transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2"
                    onClick={() => setShowClassroomPresenter(true)}
                  >
                    <span className="material-symbols-outlined text-lg">presentation</span> Present
                  </button>
                )}
                
                {/* Slide Export Button (Lesson Plans Only) */}
                {selectedPlan.type === 'lesson-plan' && (
                  <button 
                    className="px-4 py-2 rounded-lg bg-purple-500 text-white border-2 border-black hover:bg-purple-600 font-bold transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2"
                    onClick={() => {
                      const format = window.confirm('Export as interactive HTML? (Cancel for Markdown)') ? 'reveal' : 'markdown';
                      exportLessonAsSlides(selectedPlan, format);
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">slideshow</span> Slides
                  </button>
                )}
                
                <button 
                  className="px-4 py-2 rounded-lg bg-brand-blue text-white border-2 border-black hover:bg-blue-600 font-bold transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2"
                  onClick={() => {
                    console.log('📤 Export button clicked', selectedPlan);
                    setShowExportModal(true);
                  }}
                >
                  <span className="material-symbols-outlined text-lg">download</span> Export
                </button>
                <button className="px-4 py-2 rounded-lg bg-brand-yellow text-black border-2 border-black hover:bg-yellow-400 font-bold transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2" onClick={() => window.print()}>
                  <span className="material-symbols-outlined text-lg">print</span> Print
                </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Classroom Presenter */}
      {showClassroomPresenter && selectedPlan && (
        <ClassroomPresenter 
          lessonPlan={selectedPlan} 
          onClose={() => setShowClassroomPresenter(false)} 
        />
      )}
    </div>
  );
};
export default MyDocumentsPage;
