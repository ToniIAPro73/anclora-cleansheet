import React, { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Cloud, History, Layers, Menu, PlayCircle, Sliders, UploadCloud, Webhook, LayoutDashboard, Sparkles } from "lucide-react";

const navButton = (active) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#38BDF8] ${active ? "bg-[#3B82F6]/10 text-[#0284C7] ring-1 ring-[#3B82F6]/20 dark:text-[#38BDF8]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"}`;
const advancedNavButton = (active) => `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition focus:outline-none focus:ring-2 focus:ring-[#38BDF8] ${active ? "bg-[#3B82F6]/10 text-[#0284C7] ring-1 ring-[#3B82F6]/20 dark:text-[#38BDF8]" : "text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"}`;

// Core items dominate the nav visually; Advanced groups the technical/low-frequency
// capabilities (automations, connectors, stream CSV, schedules) under one lower-weight
// section instead of listing all 8 tabs as equals.
const CORE_ITEMS = [
  { id: "clean", icon: LayoutDashboard, labelKey: "dashboard", reset: false },
  { id: "clean", icon: UploadCloud, labelKey: "new_cleaning", reset: true },
  { id: "recipes", icon: PlayCircle, labelKey: "recipes" },
  { id: "batch", icon: Layers, labelKey: "batch" },
  { id: "history", icon: History, labelKey: "history" }
];

const ADVANCED_ITEMS = [
  { id: "automations", icon: Webhook, labelKey: "automations" },
  { id: "schedules", icon: CalendarClock, labelKey: "schedules" },
  { id: "connectors", icon: Cloud, labelKey: "connectors" },
  { id: "stream", icon: Sliders, labelKey: "stream" }
];

export default function WorkspaceSidebar({ t, activeTab, setActiveTab, onNewCleaning }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("cleansheet_sidebar_collapsed") === "true");
  const toggleCollapsed = () => setCollapsed((value) => { const next = !value; localStorage.setItem("cleansheet_sidebar_collapsed", String(next)); return next; });

  const goTo = (item) => {
    if (item.reset && onNewCleaning) {
      onNewCleaning();
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <aside data-testid="workspace-sidebar" className={`hidden shrink-0 border-r border-slate-200/80 bg-white/70 px-3 py-4 transition-[width] duration-200 dark:border-slate-800/80 dark:bg-[#0E1525]/70 md:block ${collapsed ? "w-[76px]" : "w-[248px]"}`}>
      <div className="mb-5 flex items-center justify-between px-2">
        {!collapsed && <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</span>}
        <button type="button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} onClick={toggleCollapsed} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav aria-label="Main navigation" className="space-y-1">
        {CORE_ITEMS.map(({ id, icon: Icon, labelKey, reset }, idx) => {
          const label = t.nav[labelKey];
          const isActive = activeTab === id && !reset;
          return (
            <button
              key={`${id}-${labelKey}-${idx}`}
              type="button"
              data-testid={`sidebar-${labelKey}`}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? label : undefined}
              onClick={() => goTo({ id, reset })}
              className={navButton(isActive)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 mb-2 px-2">
        {!collapsed ? (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Sparkles className="h-3 w-3" />
            {t.nav.advanced_group}
          </span>
        ) : (
          <div className="border-t border-slate-200 dark:border-slate-800 mt-2" />
        )}
      </div>
      <nav aria-label="Advanced navigation" className="space-y-0.5">
        {ADVANCED_ITEMS.map(({ id, icon: Icon, labelKey }) => {
          const label = t.nav[labelKey];
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`sidebar-${id}`}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? label : undefined}
              onClick={() => setActiveTab(id)}
              className={advancedNavButton(isActive)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-8 rounded-xl border border-[#38BDF8]/15 bg-[#38BDF8]/5 p-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-200">{t.dashboard?.status_ready || "Workspace ready"}</p>
          <p className="mt-1">Transforma datos, conserva tus recetas y exporta resultados reproducibles.</p>
        </div>
      )}
    </aside>
  );
}

export function MobileWorkspaceNav({ t, activeTab, setActiveTab, onNewCleaning }) {
  const [open, setOpen] = useState(false);
  const coreItems = [
    { id: "clean", labelKey: "dashboard" },
    { id: "clean", labelKey: "new_cleaning", reset: true },
    { id: "recipes", labelKey: "recipes" },
    { id: "batch", labelKey: "batch" },
    { id: "history", labelKey: "history" }
  ];
  const advancedItems = ["automations", "schedules", "connectors", "stream"].map((id) => ({ id, labelKey: id }));

  const handleSelect = (item) => {
    if (item.reset && onNewCleaning) {
      onNewCleaning();
    } else {
      setActiveTab(item.id);
    }
    setOpen(false);
  };

  return (
    <div className="border-b border-slate-200/80 bg-white/80 px-4 py-2 dark:border-slate-800/80 dark:bg-[#0E1525]/80 md:hidden">
      <button type="button" aria-expanded={open} aria-controls="cleansheet-mobile-nav" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#38BDF8] dark:text-slate-300">
        <span>Workspace navigation</span>
        <Menu className="h-4 w-4" />
      </button>
      {open && (
        <nav id="cleansheet-mobile-nav" aria-label="Mobile navigation" className="space-y-3 pb-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {coreItems.map((item, idx) => (
              <button
                type="button"
                key={`${item.id}-${item.labelKey}-${idx}`}
                aria-current={activeTab === item.id && !item.reset ? "page" : undefined}
                onClick={() => handleSelect(item)}
                className={`rounded-lg px-3 py-2 text-left text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#38BDF8] ${activeTab === item.id && !item.reset ? "bg-[#3B82F6]/10 text-[#0284C7] dark:text-[#38BDF8]" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
              >
                {t.nav[item.labelKey]}
              </button>
            ))}
          </div>
          <div>
            <span className="block px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t.nav.advanced_group}</span>
            <div className="grid grid-cols-2 gap-2">
              {advancedItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-current={activeTab === item.id ? "page" : undefined}
                  onClick={() => handleSelect(item)}
                  className={`rounded-lg px-3 py-2 text-left text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#38BDF8] ${activeTab === item.id ? "bg-[#3B82F6]/10 text-[#0284C7] dark:text-[#38BDF8]" : "bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"}`}
                >
                  {t.nav[item.labelKey]}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
