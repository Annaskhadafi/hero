"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  MessageSquare, 
  Inbox, 
  CheckCircle2, 
  MoreHorizontal,
  FileSignature,
  FileText,
  CalendarRange,
  Bell,
  User,
  Dumbbell,
  Trophy,
  Route
} from "lucide-react";
import {
  IconBook,
  IconChartBar,
  IconChecklist,
  IconClockHour4,
  IconDashboard,
  IconDatabase,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconMail,
  IconReport,
  IconSettings,
  IconShieldHalfFilled,
  IconUsers,
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isMobileHrefAllowed, type MobileAllowedLink } from "@/lib/mobile-access";

const iconMap = {
  "book-open": IconBook,
  "chart-bar": IconChartBar,
  checklist: IconChecklist,
  clock: IconClockHour4,
  dashboard: IconDashboard,
  database: IconDatabase,
  "file-word": IconFileWord,
  folder: IconFolder,
  help: IconHelp,
  "list-details": IconListDetails,
  mail: IconMail,
  report: IconReport,
  settings: IconSettings,
  shield: IconShieldHalfFilled,
  "shield-alert": IconShieldHalfFilled,
  users: IconUsers,
} as const;

type NavItem = {
  title: string;
  url: string;
  section?: string;
  iconName?: string;
  resource?: string;
};

type DashboardServicesProps = {
  isHR: boolean;
  sidebarItems: NavItem[];
  allowedLinks: MobileAllowedLink[];
};

export function MobileDashboardServices({ isHR, sidebarItems, allowedLinks }: DashboardServicesProps) {
  const [open, setOpen] = useState(false);
  const allowedResources = new Set(allowedLinks.map((link) => link.resource).filter(Boolean));
  const isServiceAllowed = (service: { href: string; resource?: string }) => {
    if (service.resource && allowedResources.has(service.resource)) return true;
    return isMobileHrefAllowed(service.href, allowedLinks);
  };

  const mainServices: Array<{
    title: string;
    href: string;
    resource?: string;
    icon: typeof MapPin;
    bg: string;
    target?: string;
  }> = [
    {
      title: "Check-In",
      href: "/mobile/attendance",
      resource: "attendance",
      icon: MapPin,
      bg: "bg-sky-500/10 text-sky-600",
    },
    {
      title: "HSE Report",
      href: "/mobile/hse",
      resource: "hse",
      icon: ShieldCheck,
      bg: "bg-emerald-500/10 text-emerald-600",
    },
    {
      title: "Site Condition",
      href: "/mobile/reports/road-condition",
      resource: "hse_road_condition_analysis",
      icon: Route,
      bg: "bg-cyan-500/10 text-cyan-600",
    },
    {
      title: "Input Progress",
      href: "/mobile/activity/input",
      resource: "tire_service",
      icon: FileSignature,
      bg: "bg-amber-500/10 text-amber-600",
    },
    {
      title: "Izin & Terlambat",
      href: "/mobile/attendance/permission",
      resource: "hc_attendance_permission",
      icon: ShieldCheck,
      bg: "bg-rose-500/10 text-rose-600",
    },
    {
      title: "Chitra LMS",
      href: "/api/lms/sso",
      resource: "lms_integration",
      target: "_blank",
      icon: Sparkles,
      bg: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Curhat HR",
      href: "/mobile/curhat",
      resource: "hr_counseling_user",
      icon: MessageSquare,
      bg: "bg-pink-500/10 text-pink-600",
    },
    {
      title: "Informasi HO",
      href: "/mobile/information",
      icon: Bell,
      bg: "bg-amber-500/10 text-amber-600",
    },
    {
      title: "Wellness",
      href: "/mobile/wellness",
      resource: "hc_mcu_wellness",
      icon: Dumbbell,
      bg: "bg-teal-500/10 text-teal-600",
    },
    {
      title: "Roster",
      href: "/mobile/timesheet",
      resource: "scheduling_timesheet",
      icon: CalendarRange,
      bg: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Leaderboard",
      href: "/mobile/gamification",
      resource: "point_setting",
      icon: Trophy,
      bg: "bg-yellow-500/10 text-yellow-600",
    },
    ...(isHR ? [{
      title: "Inbox HR",
      href: "/mobile/hr-counseling",
      resource: "hr_counseling_admin",
      icon: Inbox,
      bg: "bg-indigo-500/10 text-indigo-600",
    }] : []),
    {
      title: "Approval",
      href: "/mobile/approval",
      resource: "approval_inbox",
      icon: CheckCircle2,
      bg: "bg-rose-500/10 text-rose-600",
    },
  ];

  const visibleServices = mainServices.filter(isServiceAllowed);

  const extraServices = [
    {
      title: "Daily Activity Log",
      href: "/mobile/activity",
      resource: "tire_service",
      icon: FileText,
      description: "Lihat riwayat progress aktivitas harian Anda",
      bg: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Attendance History",
      href: "/mobile/attendance",
      resource: "attendance",
      icon: CalendarRange,
      description: "Riwayat absen dan keandalan bulanan",
      bg: "bg-teal-500/10 text-teal-600",
    },
    {
      title: "Notifikasi",
      href: "/mobile/notifications",
      icon: Bell,
      description: "Pusat notifikasi dan pengumuman",
      bg: "bg-yellow-500/10 text-yellow-600",
    },
    {
      title: "Profile & Account",
      href: "/mobile/profile",
      icon: User,
      description: "Kelola profil dan pengaturan akun",
      bg: "bg-slate-500/10 text-slate-600",
    },
  ];
  const visibleExtraServices = extraServices.filter(isServiceAllowed);

  // Group sidebarItems by section
  const groupedSidebarItems = sidebarItems.reduce((acc, item) => {
    const secName = item.section || "Lainnya";
    if (!acc[secName]) {
      acc[secName] = [];
    }
    acc[secName].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between pl-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Layanan Chitra</p>
      </div>

      <div className="grid grid-cols-4 gap-y-5 gap-x-2 rounded-[1.5rem] bg-white p-5 shadow-[0_12px_32px_rgba(8,32,51,0.06)] border border-slate-100">
        {visibleServices.map((service, index) => (
          <Link
            key={index}
            href={service.href}
            target={service.target}
            className="flex flex-col items-center justify-center text-center group active:scale-95 transition-transform"
          >
            <div className={`flex size-12 items-center justify-center rounded-2xl ${service.bg} transition-colors duration-200`}>
              <service.icon className="size-5" />
            </div>
            <span className="mt-2 text-[11px] font-bold text-slate-700 leading-tight group-hover:text-primary transition-colors">
              {service.title}
            </span>
          </Link>
        ))}

        {/* Lainnya Trigger Sheet */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center text-center group active:scale-95 transition-transform">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
                <MoreHorizontal className="size-5" />
              </div>
              <span className="mt-2 text-[11px] font-bold text-slate-700 leading-tight">
                Lainnya
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[2rem] px-6 pb-8 pt-4 max-h-[85vh] overflow-y-auto space-y-6">
            <SheetHeader className="mb-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4" />
              <SheetTitle className="text-lg font-black text-[#003461]">Semua Layanan Chitra</SheetTitle>
            </SheetHeader>

            {/* Direct Core Services */}
            <div className="grid grid-cols-4 gap-4">
              {visibleServices.map((service, index) => (
                <Link
                  key={index}
                  href={service.href}
                  target={service.target}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center justify-center text-center group"
                >
                  <div className={`flex size-12 items-center justify-center rounded-2xl ${service.bg}`}>
                    <service.icon className="size-5" />
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-slate-700 leading-tight">
                    {service.title}
                  </span>
                </Link>
              ))}
            </div>



            {/* Dynamic RBAC Sidebar Items - Grouped and Rendered as Grid of Icons */}
            {Object.keys(groupedSidebarItems).map((sectionName) => {
              const items = groupedSidebarItems[sectionName];
              return (
                <div key={sectionName} className="border-t border-slate-100 pt-5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">{sectionName}</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {items.map((item, index) => {
                      const TablerIcon = iconMap[item.iconName as keyof typeof iconMap] ?? IconFolder;
                      return (
                        <Link
                          key={index}
                          href={item.url}
                          onClick={() => setOpen(false)}
                          className="flex flex-col items-center justify-center text-center group active:scale-95 transition-transform"
                        >
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 group-hover:bg-sky-500/20 transition-colors">
                            <TablerIcon className="size-5" />
                          </div>
                          <span className="mt-2 text-[10px] font-bold text-slate-700 leading-tight line-clamp-1 w-full px-1">
                            {item.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Extra/Utility Services */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">Aktivitas & Akun</h3>
              <div className="grid gap-3">
                {visibleExtraServices.map((service, index) => (
                  <Link
                    key={index}
                    href={service.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 rounded-2xl bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${service.bg}`}>
                      <service.icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#003461]">{service.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{service.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
