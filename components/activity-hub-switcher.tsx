"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activityHubViews } from "@/lib/activity-hub-data";
import { cn } from "@/lib/utils";

export function ActivityHubSwitcher() {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-950/10 p-1 backdrop-blur-sm">
      {activityHubViews.map((view) => {
        const isActive = pathname === view.href;

        return (
          <Link
            key={view.href}
            href={view.href}
            className={cn(
              "rounded-[1.25rem] px-3 py-3 text-left transition-all",
              isActive
                ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <div className="text-sm font-semibold">{view.label}</div>
            <p
              className={cn(
                "mt-1 text-[11px] leading-4",
                isActive ? "text-slate-600" : "text-white/70",
              )}
            >
              {view.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
