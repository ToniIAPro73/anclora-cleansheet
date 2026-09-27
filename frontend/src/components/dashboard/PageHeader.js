import React from "react";

export default function PageHeader({ title, subtitle, status, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <h1
          data-testid="hero-main-title"
          className="text-2xl sm:text-3xl font-extrabold tracking-tight dark:text-white text-slate-950"
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {status && (
          <span
            data-testid="dashboard-status-badge"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {status}
          </span>
        )}
        {actions}
      </div>
    </div>
  );
}
