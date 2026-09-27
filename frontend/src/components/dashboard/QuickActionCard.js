import React from "react";

export default function QuickActionCard({ icon: Icon, label, description, onClick, testId, active }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 group w-full cursor-pointer ${
        active
          ? "border-[#3B82F6]/60 bg-[#3B82F6]/10"
          : "border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white hover:border-[#3B82F6]/40"
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center shrink-0 group-hover:bg-[#3B82F6]/25 transition-colors">
        {Icon && <Icon className="w-4 h-4 text-[#38BDF8]" />}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold dark:text-white text-slate-900">{label}</div>
        {description && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {description}
          </div>
        )}
      </div>
    </button>
  );
}
