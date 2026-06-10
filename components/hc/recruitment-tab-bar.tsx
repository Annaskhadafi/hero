"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconBriefcase, IconUsers, IconFileText, IconStack2, IconMail, IconBuilding, IconCalendarEvent, IconStethoscope, IconDashboard, IconSettings, IconChevronDown } from "@tabler/icons-react";

const MAIN_TABS = [
  { href: "/dashboard/hc/recruitment/dashboard", icon: IconDashboard, label: "Dashboard" },
  { href: "/dashboard/hc/recruitment?view=vacancies", icon: IconBriefcase, label: "Vacancies", view: "vacancies" },
  { href: "/dashboard/hc/recruitment?view=pipeline", icon: IconUsers, label: "Pipeline", view: "pipeline" },
  { href: "/dashboard/hc/recruitment/calendar", icon: IconCalendarEvent, label: "Calendar" },
];

const SETTINGS_TABS = [
  { href: "/dashboard/hc/recruitment/mcu-results", icon: IconStethoscope, label: "MCU Results" },
  { href: "/dashboard/hc/recruitment/tests", icon: IconFileText, label: "Online Tests" },
  { href: "/dashboard/hc/recruitment/test-groups", icon: IconStack2, label: "Test Groups" },
  { href: "/dashboard/hc/settings/email-templates", icon: IconMail, label: "Email Templates" },
  { href: "/dashboard/hc/settings/mcu-clinics", icon: IconBuilding, label: "Clinics" },
];

export function RecruitmentTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") || "vacancies";
  const isSettingsActive = SETTINGS_TABS.some((tab) => pathname === tab.href || pathname.startsWith(tab.href));

  return (
    <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-2xl border bg-muted/30 p-1.5 shadow-sm backdrop-blur-sm">
      {MAIN_TABS.map((tab) => {
        const isRecruitmentTab = tab.view && pathname === "/dashboard/hc/recruitment";
        const isActive = isRecruitmentTab
          ? activeView === tab.view
          : pathname === tab.href || (tab.href !== "/dashboard/hc/recruitment" && pathname.startsWith(tab.href));
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative z-10 flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300",
              isSettingsActive
                ? "bg-background text-foreground shadow-md ring-1 ring-border/50"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <IconSettings className="w-4 h-4" />
            Settings
            <IconChevronDown className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {SETTINGS_TABS.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href);
            return (
              <DropdownMenuItem key={tab.href} asChild className={cn(isActive && "bg-accent text-accent-foreground")}>
                <Link href={tab.href} className="flex w-full items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
