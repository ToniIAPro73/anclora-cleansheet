import React, { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Cloud, History, Layers, Menu, PlayCircle, Sliders, UploadCloud, Webhook } from "lucide-react";

export default function WorkspaceSidebar({ t, activeTab, setActiveTab }) {
  const [collapsed, setCollapsed] = useState(false);
  const groups = [
    { id: "clean", icon: UploadCloud, label: t.nav.clean },
    { id: "batch", icon: Layers, label: t.nav.batch },
    { id: "recipes", icon: PlayCircle, label: t.nav.recipes },
    { id: "stream", icon: Sliders, label: t.nav.stream },
    { id: "automations", icon: Webhook, label: t.nav.automations },
    { id: "connectors", icon: Cloud, label: t.nav.connectors },
    { id: "schedules", icon: CalendarClock, label: t.nav.schedules },
    { id: "history", icon: History, label: t.nav.history },
  ];
  return <aside data-testid="workspace-sidebar" className={`hidden shrink-0 border-r border-slate-200/80 bg-white/70 px-3 py-4 transition-[width] duration-200 dark:border-slate-800/80 dark:bg-[#0E1525]/70 md:block ${collapsed ? "w-[76px]" : "w-[248px]"}`}><div className="mb-5 flex items-center justify-between px-2">{!collapsed && <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</span>}<button type="button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={() => setCollapsed((value) => !value)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#38BDF8] dark:hover:bg-slate-800">{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button></div><nav aria-label="Main navigation" className="space-y-1">{groups.map(({ id, icon: Icon, label }) => <button key={id} type="button" data-testid={`sidebar-${id}`} onClick={() => setActiveTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${activeTab === id ? "bg-[#3B82F6]/10 text-[#0284C7] ring-1 ring-[#3B82F6]/20 dark:text-[#38BDF8]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" />{!collapsed && <span className="truncate">{label}</span>}</button>)}</nav>{!collapsed && <div className="mt-8 rounded-xl border border-[#38BDF8]/15 bg-[#38BDF8]/5 p-3 text-xs leading-5 text-slate-500 dark:text-slate-400"><p className="font-semibold text-slate-700 dark:text-slate-200">{t.dashboard?.status_ready || "Workspace ready"}</p><p className="mt-1">Transforma datos, conserva tus recetas y exporta resultados reproducibles.</p></div>}</aside>;
}

export function MobileWorkspaceNav({ t, activeTab, setActiveTab }) {
  const [open, setOpen] = useState(false);
  const items = [{ id: "clean", label: t.nav.clean }, { id: "batch", label: t.nav.batch }, { id: "recipes", label: t.nav.recipes }, { id: "stream", label: t.nav.stream }, { id: "automations", label: t.nav.automations }, { id: "connectors", label: t.nav.connectors }, { id: "schedules", label: t.nav.schedules }, { id: "history", label: t.nav.history }];
  return <div className="border-b border-slate-200/80 bg-white/80 px-4 py-2 dark:border-slate-800/80 dark:bg-[#0E1525]/80 md:hidden"><button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><span>Workspace navigation</span><Menu className="h-4 w-4" /></button>{open && <nav className="grid grid-cols-2 gap-2 pb-2 pt-2">{items.map((item) => <button type="button" key={item.id} onClick={() => { setActiveTab(item.id); setOpen(false); }} className={`rounded-lg px-3 py-2 text-left text-xs font-semibold ${activeTab === item.id ? "bg-[#3B82F6]/10 text-[#0284C7] dark:text-[#38BDF8]" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{item.label}</button>)}</nav>}</div>;
}
