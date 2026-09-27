import React from "react";
import { Clock } from "lucide-react";

export default function RecentActivityList({ title, items, emptyLabel, renderItem, testId }) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0B1220] bg-white overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#38BDF8]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      </div>
      {!items || items.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-400">{emptyLabel}</div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {items.map((item, idx) => (
            <li key={item.id ?? idx} className="px-4 py-2.5 text-xs">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
