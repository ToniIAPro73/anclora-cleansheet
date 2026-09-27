import React from "react";

export default function MetricCard({ icon: Icon, label, value, testId }) {
  return (
    <div
      data-testid={testId}
      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white shadow-sm flex items-center gap-3 min-w-0"
    >
      <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center shrink-0">
        {Icon && <Icon className="w-4 h-4 text-[#38BDF8]" />}
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold dark:text-white text-slate-900 leading-none tabular-nums">
          {value}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
