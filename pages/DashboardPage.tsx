

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LessonPlan } from '../types';

const DashboardPage: React.FC = () => {
  const [recentDocs, setRecentDocs] = useState<LessonPlan[]>([]);
  const [stats, setStats] = useState({ total: 0, plans: 0, papers: 0, quizzes: 0, notes: 0 });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    setRecentDocs(saved.slice(0, 4));
    
    // Calculate Stats
    setStats({
      total: saved.length,
      plans: saved.filter((p: LessonPlan) => p.type === 'lesson-plan' || !p.type).length,
      papers: saved.filter((p: LessonPlan) => p.type === 'paper').length,
      quizzes: saved.filter((p: LessonPlan) => p.type === 'quiz').length,
      notes: saved.filter((p: LessonPlan) => p.type === 'study-notes').length
    });
  }, []);

  return (
    <div className="flex flex-col gap-10">
      {/* Welcome Section */}
      <div className="flex flex-wrap items-end justify-between gap-4 bg-white dark:bg-[#1e293b] p-8 rounded-2xl border-2 border-black shadow-neo">
        <div className="flex flex-col gap-2">
          <h1 className="text-slate-900 dark:text-white text-4xl font-black font-display tracking-tight">Welcome back, Educator!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">You've saved {stats.total * 15} minutes of planning time this week.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard/generate" className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 px-6 bg-brand-black text-white text-base font-bold tracking-wide border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            <span className="material-symbols-outlined text-xl">add</span>
            <span className="truncate">Create New</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div className="bg-brand-yellow p-6 rounded-2xl border-2 border-black shadow-neo-sm hover:-translate-y-1 transition-transform">
             <p className="text-black text-xs font-black uppercase tracking-widest mb-2 opacity-75">Total Docs</p>
             <p className="text-5xl font-black font-display text-black">{stats.total}</p>
          </div>
          <div className="bg-brand-blue p-6 rounded-2xl border-2 border-black shadow-neo-sm hover:-translate-y-1 transition-transform">
             <p className="text-black text-xs font-black uppercase tracking-widest mb-2 opacity-75">Lesson Plans</p>
             <p className="text-5xl font-black font-display text-black">{stats.plans}</p>
          </div>
          <div className="bg-brand-pink p-6 rounded-2xl border-2 border-black shadow-neo-sm hover:-translate-y-1 transition-transform">
             <p className="text-black text-xs font-black uppercase tracking-widest mb-2 opacity-75">Exam Papers</p>
             <p className="text-5xl font-black font-display text-black">{stats.papers}</p>
          </div>
          <div className="bg-brand-green p-6 rounded-2xl border-2 border-black shadow-neo-sm hover:-translate-y-1 transition-transform">
             <p className="text-black text-xs font-black uppercase tracking-widest mb-2 opacity-75">Quizzes</p>
             <p className="text-5xl font-black font-display text-black">{stats.quizzes}</p>
          </div>
          <div className="bg-indigo-400 p-6 rounded-2xl border-2 border-black shadow-neo-sm hover:-translate-y-1 transition-transform">
             <p className="text-black text-xs font-black uppercase tracking-widest mb-2 opacity-75">Study Notes</p>
             <p className="text-5xl font-black font-display text-black">{stats.notes}</p>
          </div>
      </div>

      {/* Recent Activity */}
      <section>
        <h2 className="text-slate-900 dark:text-white text-2xl font-black font-display tracking-tight pb-6">Recent Documents</h2>
        {recentDocs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {recentDocs.map((doc, i) => (
              <div key={i} className="flex flex-col gap-4 rounded-xl bg-white dark:bg-[#1e293b] p-5 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-y-1 transition-all group relative overflow-hidden">
                  <div className={`h-32 w-full rounded-lg flex items-center justify-center border-2 border-black ${doc.type === 'quiz' ? 'bg-brand-green' : doc.type === 'paper' ? 'bg-brand-pink' : doc.type === 'study-notes' ? 'bg-indigo-400' : 'bg-brand-blue'}`}>
                     <span className="material-symbols-outlined text-5xl text-black opacity-20">
                        {doc.type === 'quiz' ? 'check_circle' : doc.type === 'paper' ? 'description' : doc.type === 'study-notes' ? 'menu_book' : 'auto_stories'}
                     </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-900 dark:text-white text-lg font-bold font-display leading-tight line-clamp-1">{doc.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{doc.dateCreated} • {doc.subject}</p>
                  </div>
                  <Link to="/dashboard/documents" className="mt-auto pt-4 border-t-2 border-slate-100 dark:border-slate-800 text-sm font-bold text-black dark:text-white hover:text-primary flex items-center gap-1">
                    View Document <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
             <p className="text-slate-500 mb-4 font-medium">You haven't generated any documents yet.</p>
             <Link to="/dashboard/generate" className="inline-block px-6 py-3 bg-brand-yellow border-2 border-black rounded-xl font-bold text-black shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">Create your first one</Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;