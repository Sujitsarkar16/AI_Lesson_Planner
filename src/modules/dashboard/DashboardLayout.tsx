import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/modules/auth/AuthContext";

const navItems = [
  ["/dashboard", "dashboard", "Dashboard"],
  ["/dashboard/generate", "auto_awesome", "Generate new"],
  ["/dashboard/documents", "folder_open", "My documents"],
  ["/dashboard/templates", "store", "Templates"],
  ["/dashboard/parent-communication", "email", "Parent comms"],
  ["/dashboard/integrations", "power", "Integrations"],
];
const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(
    () =>
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);
  const navClass = (path: string) =>
    `dashboard-nav-link ${location.pathname === path ? "dashboard-nav-link-active" : ""}`;
  return (
    <div className="dashboard-shell flex h-screen w-full overflow-hidden bg-background-light font-body text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <aside className="flex h-full w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1d1d25]">
        <div>
          <Link to="/" className="flex items-center gap-2.5 px-1">
            <span className="brand-mark flex size-9 items-center justify-center rounded-lg text-white">
              <span className="material-symbols-outlined text-lg">
                auto_stories
              </span>
            </span>
            <span>
              <span className="block font-display text-base font-extrabold">
                AI Planner
              </span>
              <span className="block text-xs text-slate-500">
                Educator edition
              </span>
            </span>
          </Link>
          <nav className="mt-7 flex flex-col gap-1">
            {navItems.map(([path, icon, label]) => (
              <Link key={path} to={path} className={navClass(path)}>
                <span className="material-symbols-outlined text-lg">
                  {icon}
                </span>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
            {user?.picture ? (
              <img
                className="size-8 rounded-full object-cover"
                src={user.picture}
                alt=""
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-yellow text-sm font-bold text-primary">
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {user?.name || "Educator"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user?.email || "Pro plan"}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/settings"
            className={navClass("/dashboard/settings")}
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            Settings
          </Link>
          <button
            onClick={logout}
            className="dashboard-nav-link w-full text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <span className="material-symbols-outlined text-lg">logout</span>Log
            out
          </button>
        </div>
      </aside>
      <main className="dashboard-canvas flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex justify-end px-5 py-3 lg:px-7">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="material-symbols-outlined text-base">
              {isDarkMode ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </header>
        <div className="dashboard-content flex-1 overflow-y-auto px-5 pb-7 lg:px-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
export default DashboardLayout;
