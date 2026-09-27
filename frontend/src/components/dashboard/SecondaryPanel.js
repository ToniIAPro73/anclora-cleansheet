import React from "react";

export default function SecondaryPanel({ icon: Icon, title, children, action, testId }) {
  return (
    <div
      data-testid={testId}
      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-[#38BDF8] shrink-0" />}
          <h4 className="text-xs font-bold dark:text-white text-slate-900 truncate">{title}</h4>
        </div>
        {action}
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">{children}</div>
    </div>
  );
}
