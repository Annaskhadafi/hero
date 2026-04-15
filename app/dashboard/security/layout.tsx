import Link from "next/link";

const tabs = [
  { label: "Security Overview", href: "/dashboard/security" },
  { label: "User Management", href: "/dashboard/security/users" },
  { label: "Roles & Permissions", href: "/dashboard/security/roles" },
  { label: "Audit Logs", href: "/dashboard/security/audit-logs" },
];

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <nav className="flex flex-wrap gap-3 rounded-2xl border bg-card p-4 shadow-sm">
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

      {children}
    </div>
  );
}
