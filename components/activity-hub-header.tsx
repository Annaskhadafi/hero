"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronRight } from "lucide-react";
import { activityHubTabs } from "@/lib/activity-navigation";
import { cn } from "@/lib/utils";

export function ActivityHubHeader() {
  const pathname = usePathname();

  const currentTab = activityHubTabs.find((tab) => {
    if (tab.href === "/dashboard/activity-hub/my-day") {
      return pathname === tab.href || pathname.startsWith("/dashboard/activity-hub/my-day");
    }
    return pathname === tab.href || (tab.href !== "/dashboard/daily-activity" && pathname.startsWith(tab.href));
  }) ?? activityHubTabs[1];

  return (
    <header className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Breadcrumb & Title */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/daily-activity"
            className="inline-flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 transition-colors"
          >
            <Activity className="size-4 text-blue-600 dark:text-blue-400" />
            Activity Hub
          </Link>
          <ChevronRight className="size-3 text-slate-300" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {currentTab.label}
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Activity Hub Tabs" className="flex min-w-0 flex-wrap items-center gap-1">
          {activityHubTabs.map((tab) => {
            const isActive =
              tab.href === "/dashboard/activity-hub/my-day"
                ? pathname === tab.href || pathname.startsWith("/dashboard/activity-hub/my-day")
                : pathname === tab.href ||
                  (tab.href !== "/dashboard/daily-activity" && pathname.startsWith(tab.href));

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                )}
              >
                {tab.compactLabel}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
