"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { IconBriefcase, IconUsers, IconFileText, IconStack2, IconMail, IconBuilding, IconCalendarEvent, IconStethoscope, IconDashboard } from "@tabler/icons-react";

const TABS = [
  { href: "/dashboard/hc/recruitment/dashboard", icon: IconDashboard, label: "Dashboard" },
  { href: "/dashboard/hc/recruitment", icon: IconBriefcase, label: "Recruitment" },
  { href: "/dashboard/hc/recruitment/calendar", icon: IconCalendarEvent, label: "Calendar" },
  { href: "/dashboard/hc/recruitment/mcu-results", icon: IconStethoscope, label: "MCU Results" },
  { href: "/dashboard/hc/recruitment/tests", icon: IconFileText, label: "Online Tests" },
  { href: "/dashboard/hc/recruitment/test-groups", icon: IconStack2, label: "Test Groups" },
  { href: "/dashboard/hc/settings/email-templates", icon: IconMail, label: "Email Templates" },
  { href: "/dashboard/hc/settings/mcu-clinics", icon: IconBuilding, label: "Clinics" },
];

export function RecruitmentTabBar() {
  const pathname = usePathname();

  return (
    <div className="flex bg-muted/30 p-1.5 rounded-2xl border backdrop-blur-sm shadow-sm overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== "/dashboard/hc/recruitment" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative z-10 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
              isActive
                ? "bg-background text-foreground shadow-md ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
