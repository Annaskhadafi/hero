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
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Admin settings studio</h1>
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
