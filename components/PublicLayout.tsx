import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const PublicLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full flex-col font-body bg-background-light dark:bg-background-dark text-slate-900">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b-2 border-black bg-white/90 backdrop-blur-md py-4 px-6 lg:px-12 transition-all duration-300">
        
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center size-10 md:size-11 bg-brand-black text-white rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none">
            <span className="material-symbols-outlined text-2xl">auto_stories</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black font-display tracking-tight text-slate-900 group-hover:text-primary transition-colors">AI Lesson Planner</h2>
        </Link>
        
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          {['Features', 'Pricing', 'Community'].map((item) => (
             <Link 
               key={item}
               to={item === 'Pricing' ? '/pricing' : '#'} 
               className="relative px-4 py-2 text-base font-bold text-slate-700 hover:text-primary transition-colors group"
             >
               {item}
               <span className="absolute bottom-1 left-4 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-[calc(100%-32px)]"></span>
             </Link>
          ))}
        </div>
        
        {/* Auth Buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/auth" className="hidden sm:flex items-center justify-center h-10 px-4 font-bold text-slate-700 hover:text-primary transition-colors">
            Log In
          </Link>
          <Link to="/auth" className="flex items-center justify-center h-11 px-6 bg-brand-yellow text-brand-black text-base font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
            Sign Up
          </Link>
        </div>
      </header>
      
      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="py-12 border-t-2 border-black bg-white px-4 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-brand-black text-white rounded-md flex items-center justify-center border border-black">
               <span className="material-symbols-outlined text-lg">auto_stories</span>
            </div>
            <span className="text-sm font-bold text-brand-black">© 2024 AI Lesson Planner.</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-sm font-bold text-slate-600 hover:text-brand-pink transition-colors">Terms</a>
            <a href="#" className="text-sm font-bold text-slate-600 hover:text-brand-pink transition-colors">Privacy</a>
            <a href="#" className="text-sm font-bold text-slate-600 hover:text-brand-pink transition-colors">Contact</a>
            <a href="#" className="text-sm font-bold text-slate-600 hover:text-brand-pink transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;