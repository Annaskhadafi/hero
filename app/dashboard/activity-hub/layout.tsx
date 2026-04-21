import Link from "next/link";
import { Activity } from "lucide-react";

const tabs = [
  {
    label: "Daily Checklist",
    href: "/dashboard/activity-hub/my-day",
  },
  {
    label: "SPL",
    href: "/dashboard/activity-hub/team-board",
  },
  {
    label: "Library",
    href: "/dashboard/activity-hub/library",
  },
  {
    label: "Route Builder",
    href: "/dashboard/activity-hub/routes",
  },
  {
    label: "Blueprint",
    href: "/dashboard/activity-hub/blueprint",
  },
  {
    label: "Configuration",
    href: "/dashboard/activity-hub/configuration",
  },
];

export default function ActivityHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 p-3 sm:p-5 lg:p-6">
      <header className="surface-muted-card flex flex-col gap-4 rounded-[1rem] p-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
          <span className="grid size-9 place-items-center rounded-xl bg-surface-container-lowest text-primary shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
            <Activity className="size-4" aria-hidden="true" />
          </span>
          Daily Activity System
        </h1>
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] transition hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
