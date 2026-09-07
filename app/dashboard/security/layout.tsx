"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const tabs = [
  { labelId: "Ringkasan Keamanan", labelEn: "Security Overview", href: "/dashboard/security" },
  { labelId: "Manajemen Pengguna", labelEn: "User Management", href: "/dashboard/security/users" },
  { labelId: "Peran & Hak Akses", labelEn: "Roles & Permissions", href: "/dashboard/security/roles" },
  { labelId: "Log Audit", labelEn: "Audit Logs", href: "/dashboard/security/audit-logs" },
];

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = useLanguage();

  return (
    <div className="space-y-5 p-3 sm:p-5 lg:p-6">
      <nav className="surface-muted-card flex flex-wrap items-center gap-2 rounded-[1rem] p-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-surface-container-lowest text-primary shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
          <ShieldCheck className="size-4" aria-hidden="true" />
        </span>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] transition hover:text-foreground"
          >
            <span suppressHydrationWarning>
              {language === "en" ? tab.labelEn : tab.labelId}
            </span>
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
