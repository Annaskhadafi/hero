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
      <nav className="flex flex-wrap gap-3 rounded-[1.4rem] bg-surface-container-low p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="min-h-12 rounded-full bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-muted-foreground shadow-[0_10px_20px_rgba(0,52,97,0.06)] transition hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
