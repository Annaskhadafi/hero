"use client";

import { Activity, Inbox, ListTodo, ShieldAlert, Sparkles } from "lucide-react";

export type EmptyIconType = "inbox" | "jobs" | "activity" | "points" | "penalty";

const iconMap: Record<EmptyIconType, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  jobs: ListTodo,
  activity: Activity,
  points: Sparkles,
  penalty: ShieldAlert,
};

interface EmptyStateProps {
  iconType?: EmptyIconType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function MyDayEmptyState({
  iconType = "inbox",
  title,
  description,
  action,
}: EmptyStateProps) {
  const Icon = iconMap[iconType] ?? Inbox;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs dark:bg-blue-950/60 dark:text-blue-400">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-3.5 text-sm font-bold text-slate-900 dark:text-white sm:text-base">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
