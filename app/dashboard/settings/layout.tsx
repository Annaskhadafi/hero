import Link from "next/link";
import { Settings2 } from "lucide-react";

const tabs = [
  { label: "Navbar Setting", href: "/dashboard/settings/navbar" },
  { label: "Portal Chitra", href: "/dashboard/settings/portal-chitra" },
  { label: "Email Delivery Log", href: "/dashboard/settings/email" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 p-3 sm:p-5 lg:p-6">
      <header className="border-b border-border/70 pb-4">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Settings2 className="size-4" aria-hidden="true" />
          </span>
          Admin settings studio
        </h1>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:text-foreground hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
