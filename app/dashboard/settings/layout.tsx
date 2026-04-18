import Link from "next/link";

const tabs = [
  { label: "Navbar Setting", href: "/dashboard/settings/navbar" },
  { label: "Email Delivery Log", href: "/dashboard/settings/email" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        <div className="space-y-3">
          <p className="industrial-label">System Controls</p>
          <h1 className="font-display text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            Admin settings studio
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Kelola konfigurasi komunikasi, navigasi, dan kendali visual untuk operasi HERO.
          </p>
        </div>
        <div className="command-panel rounded-lg bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_72%,var(--tertiary)_150%)] p-5 text-primary-foreground shadow-[0_20px_34px_rgba(0,52,97,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-foreground/70">
            Control Mode
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-normal">
            Governed
          </p>
        </div>
      </header>

      <nav className="surface-muted-card flex flex-wrap gap-3 rounded-lg p-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="min-h-12 rounded-lg bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-muted-foreground shadow-[0_10px_20px_rgba(0,52,97,0.06)] transition hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
