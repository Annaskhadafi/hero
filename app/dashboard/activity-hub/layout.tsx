import Link from "next/link";

const tabs = [
  {
    label: "Activity Queue",
    href: "/dashboard/activity-hub/my-day",
  },
  {
    label: "Operations Board",
    href: "/dashboard/activity-hub/team-board",
  },
];

export default function ActivityHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Activity administration</h1>
        <nav className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-full border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
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
