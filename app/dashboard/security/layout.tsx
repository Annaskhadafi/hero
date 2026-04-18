import Link from "next/link";
import { ShieldCheck } from "lucide-react";

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
    <div className="space-y-5 p-3 sm:p-5 lg:p-6">
      <nav className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-4">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <ShieldCheck className="size-4" aria-hidden="true" />
        </span>
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
