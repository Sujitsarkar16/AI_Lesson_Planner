
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  // Dark Mode Toggle Logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('theme');
       if (saved) return saved === 'dark';
       return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const navItemClass = (path: string) => `
    flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 border-2 
    ${isActive(path) 
      ? 'bg-brand-yellow border-black shadow-neo-sm text-brand-black font-bold translate-x-[2px] translate-y-[2px] shadow-none' 
      : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-black/10'
    }
  `;

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-body">
      {/* SideNavBar */}
      <aside className="flex h-full w-72 flex-col justify-between border-r-2 border-black bg-white dark:bg-[#0f172a] p-5 flex-shrink-0 transition-colors duration-200 z-20">
        <div className="flex flex-col gap-8">
          <Link to="/" className="flex items-center gap-3 px-2 group">
             <div className="flex items-center justify-center size-10 bg-brand-black text-white rounded-lg border-2 border-black shadow-neo-sm transition-all group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px]">
                <span className="material-symbols-outlined text-xl">auto_stories</span>
             </div>
             <div className="flex flex-col">
               <h1 className="text-brand-black dark:text-white text-xl font-black font-display leading-none tracking-tight">AI Planner</h1>
               <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1">Educator Edition</p>
             </div>
          </Link>

          <nav className="flex flex-col gap-2">
            <Link to="/dashboard" className={navItemClass('/dashboard')}>
              <span className="material-symbols-outlined text-xl">dashboard</span>
              <p className="text-sm font-display font-bold">Dashboard</p>
            </Link>
             <Link to="/dashboard/generate" className={navItemClass('/dashboard/generate')}>
              <span className="material-symbols-outlined text-xl fill">auto_awesome</span>
              <p className="text-sm font-display font-bold">Generate New</p>
            </Link>
            <Link to="/dashboard/documents" className={navItemClass('/dashboard/documents')}>
              <span className="material-symbols-outlined text-xl">folder_open</span>
              <p className="text-sm font-display font-bold">My Documents</p>
            </Link>
            <Link to="/dashboard/templates" className={navItemClass('/dashboard/templates')}>
              <span className="material-symbols-outlined text-xl">store</span>
              <p className="text-sm font-display font-bold">Templates</p>
            </Link>
             <Link to="/dashboard/integrations" className={navItemClass('/dashboard/integrations')}>
              <span className="material-symbols-outlined text-xl">power</span>
              <p className="text-sm font-display font-bold">Integrations</p>
            </Link>
          </nav>
        </div>
        
        <div className="flex flex-col gap-4">
             {/* User Card */}
             <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-black bg-blue-50 dark:bg-slate-800 shadow-neo-sm">
                {user?.picture ? (
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-10 border-2 border-black" style={{backgroundImage: `url("${user.picture}")`}}></div>
                ) : (
                  <div className="flex items-center justify-center size-10 bg-brand-yellow text-brand-black rounded-lg border-2 border-black font-bold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <p className="text-sm font-bold truncate text-brand-black dark:text-white">{user?.name || user?.email || 'User'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'Pro Plan'}</p>
                </div>
             </div>

             <Link to="/dashboard/settings" className={navItemClass('/dashboard/settings')}>
              <span className="material-symbols-outlined text-xl">settings</span>
              <p className="text-sm font-display font-bold">Settings</p>
            </Link>

             {/* Logout Button */}
             <button
               onClick={logout}
               className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 border-2 border-transparent text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400"
             >
               <span className="material-symbols-outlined text-xl">logout</span>
               <p className="text-sm font-display font-bold">Logout</p>
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex w-full flex-1 flex-col overflow-y-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]">
        {/* TopNavBar */}
        <header className="flex items-center justify-end whitespace-nowrap px-8 py-4 sticky top-0 z-10 pointer-events-none">
          <div className="flex flex-1 justify-end gap-4 pointer-events-auto">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-black shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <span className="material-symbols-outlined text-xl">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>
        </header>
        <div className="px-8 pb-8 lg:px-12 lg:pb-12 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
