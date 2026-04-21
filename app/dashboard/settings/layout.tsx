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
      <header className="surface-muted-card rounded-[1rem] p-4">
        <h1 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
          <span className="grid size-9 place-items-center rounded-xl bg-surface-container-lowest text-primary shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
            <Settings2 className="size-4" aria-hidden="true" />
          </span>
          Admin settings studio
        </h1>
      </header>

      <nav className="surface-muted-card flex flex-wrap gap-2 rounded-[1rem] p-2.5">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] transition hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
