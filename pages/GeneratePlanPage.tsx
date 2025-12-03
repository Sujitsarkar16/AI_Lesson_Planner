


import React, { useState } from 'react';
import LessonPlanGenerator from '../components/apps/LessonPlanGenerator';
import SyllabusGenerator from '../components/apps/SyllabusGenerator';
import QuestionPaperGenerator from '../components/apps/QuestionPaperGenerator';
import QuizGenerator from '../components/apps/QuizGenerator';
import StudyNotesGenerator from '../components/apps/StudyNotesGenerator';
import ConceptMapGenerator from '../components/apps/ConceptMapGenerator';
import { AppType } from '../types';

type GeneratorApp = AppType | null;

const GeneratePlanPage: React.FC = () => {
  const [activeApp, setActiveApp] = useState<GeneratorApp>(null);

  if (activeApp === 'lesson-plan') return <LessonPlanGenerator onBack={() => setActiveApp(null)} />;
  if (activeApp === 'syllabus') return <SyllabusGenerator onBack={() => setActiveApp(null)} />;
  if (activeApp === 'paper') return <QuestionPaperGenerator onBack={() => setActiveApp(null)} />;
  if (activeApp === 'quiz') return <QuizGenerator onBack={() => setActiveApp(null)} />;
  if (activeApp === 'study-notes') return <StudyNotesGenerator onBack={() => setActiveApp(null)} />;
  if (activeApp === 'concept-map') return <ConceptMapGenerator onBack={() => setActiveApp(null)} />;

  // Default: Show App Selector
  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a href="/dashboard" className="text-slate-500 dark:text-[#92a4c9] text-sm font-bold uppercase tracking-wide hover:text-black dark:hover:text-white">Dashboard</a>
        <span className="text-slate-400 dark:text-[#92a4c9] text-sm font-bold">/</span>
        <span className="text-black dark:text-white text-sm font-bold uppercase tracking-wide">Generate New</span>
      </div>
      
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border-2 border-black bg-brand-yellow text-black text-xs font-black uppercase tracking-widest shadow-neo-sm transform -rotate-2">
            AI Powered Tools
        </div>
        <h1 className="text-5xl font-black font-display text-gray-900 dark:text-white mb-6">What are we teaching today?</h1>
        <p className="text-gray-500 dark:text-gray-400 text-xl font-medium">Select a tool below to start generating high-quality content for your classroom.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Lesson Plan Card */}
        <button 
          onClick={() => setActiveApp('lesson-plan')}
          className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-black shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-blue border-b-2 border-black"></div>
          <div className="size-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-brand-blue border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-neo-sm">
             <span className="material-symbols-outlined text-4xl">auto_stories</span>
          </div>
          <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white mb-3">Lesson Plan</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">Comprehensive structured lesson plans with objectives and procedures.</p>
        </button>

        {/* Syllabus Card */}
        <button 
          onClick={() => setActiveApp('syllabus')}
          className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-black shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-pink border-b-2 border-black"></div>
          <div className="size-20 rounded-2xl bg-pink-50 dark:bg-pink-900/20 text-brand-pink border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-neo-sm">
             <span className="material-symbols-outlined text-4xl">calendar_month</span>
          </div>
          <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white mb-3">Syllabus</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">Full course outlines, weekly schedules, and curriculum mapping.</p>
        </button>

        {/* Question Paper Card */}
        <button 
          onClick={() => setActiveApp('paper')}
          className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-black shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-yellow border-b-2 border-black"></div>
          <div className="size-20 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-neo-sm">
             <span className="material-symbols-outlined text-4xl">description</span>
          </div>
          <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white mb-3">Exam Paper</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">Standard university or school exam papers with various sections.</p>
        </button>

        {/* Quiz Card */}
        <button 
          onClick={() => setActiveApp('quiz')}
          className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-black shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-green border-b-2 border-black"></div>
          <div className="size-20 rounded-2xl bg-green-50 dark:bg-green-900/20 text-brand-green border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-neo-sm">
             <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white mb-3">MCQ Quiz</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">Multiple choice quizzes with answer keys for quick assessment.</p>
        </button>
        
        {/* Study Notes Card */}
        <button 
          onClick={() => setActiveApp('study-notes')}
          className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-black shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500 border-b-2 border-black"></div>
          <div className="size-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-neo-sm">
             <span className="material-symbols-outlined text-4xl">menu_book</span>
          </div>
          <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white mb-3">Study Notes</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">Clear, structured revision notes and summaries for students.</p>
        </button>

         {/* Concept Map Card */}
        <button 
          onClick={() => setActiveApp('concept-map')}
          className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-black shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-orange border-b-2 border-black"></div>
          <div className="size-20 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-neo-sm">
             <span className="material-symbols-outlined text-4xl">account_tree</span>
          </div>
          <h3 className="text-2xl font-black font-display text-gray-900 dark:text-white mb-3">Concept Map</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">Generate interactive, node-based diagrams to visualize concepts.</p>
        </button>
      </div>
    </div>
  );
};

export default GeneratePlanPage;