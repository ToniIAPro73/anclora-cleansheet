import React, { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "./BrandMark";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";

export default function Header({ t }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = async () => { await logout(); navigate("/login"); };
  return (
    <header data-testid="app-sticky-header" className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0E1525]/90">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button type="button" data-testid="brand-logo-placeholder" onClick={() => navigate("/app")} className="flex min-w-0 items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-[#38BDF8]/30 shadow-sm shadow-[#38BDF8]/10"><BrandMark className="h-full w-full" /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold tracking-tight text-slate-950 dark:text-white">Anclora <span className="text-[#38BDF8]">CleanSheet</span></span><span className="block truncate text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">{t?.subtitle || "Deterministic data transformation"}</span></span>
        </button>
        <div className="flex shrink-0 items-center gap-2"><LangToggle /><ThemeToggle />{user && <div className="relative ml-1 border-l border-slate-200 pl-3 dark:border-slate-700/70"><button type="button" data-testid="user-menu-trigger" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2.5 text-left transition hover:border-[#38BDF8] dark:border-slate-700 dark:bg-slate-950/70"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6]/15 text-xs font-bold text-[#0284C7] dark:text-[#38BDF8]">{(user.email || "?").slice(0, 1).toUpperCase()}</span><span className="hidden max-w-[150px] truncate text-xs font-medium text-slate-600 dark:text-slate-300 lg:inline-block">{user.email}</span><ChevronDown className="h-3.5 w-3.5 text-slate-500" /></button>{menuOpen && <div role="menu" aria-label="User menu" className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-[#0E1525]"><div className="px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0284C7] dark:text-[#38BDF8]">Anclora CleanSheet</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p></div><button type="button" role="menuitem" data-testid="auth-logout-button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-300"><LogOut className="h-4 w-4" />{t?.nav?.logout || "Logout"}</button></div>}</div>}</div>
      </div>
    </header>
  );
}
