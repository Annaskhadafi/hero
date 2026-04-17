"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activityHubViews } from "@/lib/activity-hub-data";
import { cn } from "@/lib/utils";

export function ActivityHubSwitcher() {
  const pathname = usePathname();

  return (
    <div className="surface-tab-shell grid grid-cols-2 gap-2 rounded-3xl p-1">
      {activityHubViews.map((view) => {
        const isActive = pathname === view.href;

        return (
          <Link
            key={view.href}
            href={view.href}
            className={cn(
              "rounded-[1.25rem] px-3 py-3 text-left transition-all",
              isActive
                ? "bg-surface-container-lowest text-foreground shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
                : "text-muted-foreground hover:bg-surface-container-lowest/70 hover:text-foreground",
            )}
          >
            <div className="text-sm font-semibold">{view.label}</div>
            <p
              className={cn(
                "mt-1 text-[11px] leading-4",
                isActive ? "text-muted-foreground" : "text-muted-foreground/80",
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
