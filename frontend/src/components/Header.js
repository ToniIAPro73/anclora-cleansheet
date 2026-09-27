import React from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "./BrandMark";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";

export default function Header({ t }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/login"); };
  return (
    <header data-testid="app-sticky-header" className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0E1525]/90">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button type="button" data-testid="brand-logo-placeholder" onClick={() => navigate("/app")} className="flex min-w-0 items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-[#38BDF8]/30 shadow-sm shadow-[#38BDF8]/10"><BrandMark className="h-full w-full" /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold tracking-tight text-slate-950 dark:text-white">Anclora <span className="text-[#38BDF8]">CleanSheet</span></span><span className="block truncate text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">{t?.subtitle || "Deterministic data transformation"}</span></span>
        </button>
        <div className="flex shrink-0 items-center gap-2"><LangToggle /><ThemeToggle />{user && <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700/70"><span className="hidden max-w-[180px] truncate text-xs font-medium text-slate-500 dark:text-slate-400 lg:inline-block">{user.email}</span><button type="button" data-testid="auth-logout-button" onClick={handleLogout} title={t?.nav?.logout || "Logout"} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-slate-400"><LogOut className="h-4 w-4" /></button></div>}</div>
      </div>
    </header>
  );
}
