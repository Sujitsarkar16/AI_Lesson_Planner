import React, { useEffect, useState } from 'react';
import { TEMPLATES } from '@/modules/templates/data/templates';
import { AppType, Template } from '@/shared/types/document';

const tabs: { id: AppType; label: string; icon: string }[] = [
  { id: 'lesson-plan', label: 'Lesson plans', icon: 'auto_stories' }, { id: 'syllabus', label: 'Syllabus', icon: 'calendar_month' }, { id: 'paper', label: 'Question papers', icon: 'description' }, { id: 'quiz', label: 'Quizzes', icon: 'check_circle' }, { id: 'study-notes', label: 'Study notes', icon: 'menu_book' }, { id: 'concept-map', label: 'Concept maps', icon: 'account_tree' },
];

const TemplatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppType>('lesson-plan');
  const [selectedTemplates, setSelectedTemplates] = useState<Record<AppType, string>>({ 'lesson-plan': '', syllabus: '', paper: '', quiz: '', 'study-notes': '', 'concept-map': '' });
  useEffect(() => {
    setSelectedTemplates({
      'lesson-plan': localStorage.getItem('selected_template_lesson-plan') || '', syllabus: localStorage.getItem('selected_template_syllabus') || '', paper: localStorage.getItem('selected_template_paper') || '', quiz: localStorage.getItem('selected_template_quiz') || '', 'study-notes': localStorage.getItem('selected_template_study-notes') || '', 'concept-map': localStorage.getItem('selected_template_concept-map') || '',
    });
  }, []);
  const handleSelect = (template: Template) => {
    const value = selectedTemplates[activeTab] === template.id ? '' : template.id;
    setSelectedTemplates((previous) => ({ ...previous, [activeTab]: value }));
    localStorage.setItem(`selected_template_${activeTab}`, value);
  };
  const filteredTemplates = TEMPLATES.filter((template) => template.appType === activeTab);
  return <div className="flex h-full flex-col gap-6"><div><p className="dashboard-kicker">Planning library</p><h1 className="mt-1 text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Templates</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a starting structure for each type of generated material.</p></div><div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`dashboard-tab ${activeTab === tab.id ? 'dashboard-tab-active' : ''}`}><span className="material-symbols-outlined text-base">{tab.icon}</span>{tab.label}</button>)}</div><div className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredTemplates.map((template) => { const isSelected = selectedTemplates[activeTab] === template.id; return <article key={template.id} className={`dashboard-template ${isSelected ? 'dashboard-template-selected' : ''}`}><div className="dashboard-template-preview"><span className="material-symbols-outlined text-4xl opacity-25">article</span><span className="mt-2 rounded bg-white/70 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{template.appType}</span>{isSelected && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-brand-green px-2 py-1 text-xs font-bold"><span className="material-symbols-outlined text-sm">check</span>Selected</span>}</div><div className="flex flex-1 flex-col p-4"><div className="mb-2 flex flex-wrap gap-1.5">{template.tags.map((tag) => <span key={tag} className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{tag}</span>)}</div><h2 className="text-lg font-extrabold font-display leading-tight text-slate-900 dark:text-white">{template.title}</h2><p className="mt-2 line-clamp-3 flex-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{template.description}</p><button onClick={() => handleSelect(template)} className={`dashboard-button mt-4 w-full ${isSelected ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-brand-black text-white'}`}>{isSelected ? 'Deselect template' : 'Use template'}</button></div></article>; })}</div></div>;
};
export default TemplatesPage;
