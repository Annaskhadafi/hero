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
  User
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type DashboardServicesProps = {
  isHR: boolean;
};

export function MobileDashboardServices({ isHR }: DashboardServicesProps) {
  const [open, setOpen] = useState(false);

  const mainServices = [
    {
      title: "Check-In",
      href: "/mobile/attendance",
      icon: MapPin,
      bg: "bg-sky-500/10 text-sky-600",
    },
    {
      title: "HSE Report",
      href: "/mobile/hse",
      icon: ShieldCheck,
      bg: "bg-emerald-500/10 text-emerald-600",
    },
    {
      title: "Input Progress",
      href: "/mobile/activity/input",
      icon: FileSignature,
      bg: "bg-amber-500/10 text-amber-600",
    },
    {
      title: "Chitra LMS",
      href: "/api/lms/sso",
      target: "_blank",
      icon: Sparkles,
      bg: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Curhat HR",
      href: "/mobile/curhat",
      icon: MessageSquare,
      bg: "bg-pink-500/10 text-pink-600",
    },
    ...(isHR ? [{
      title: "Inbox HR",
      href: "/mobile/hr-counseling",
      icon: Inbox,
      bg: "bg-indigo-500/10 text-indigo-600",
    }] : []),
    {
      title: "Approval",
      href: "/mobile/approval",
      icon: CheckCircle2,
      bg: "bg-rose-500/10 text-rose-600",
    },
  ];

  // If list is shorter than 8 (when not HR, it's 6), we can fill it or put "Lainnya" as the last item.
  // We'll show up to 7 items directly, and the 8th item is always "Lainnya".
  const visibleServices = mainServices.slice(0, 7);

  const extraServices = [
    {
      title: "Daily Activity Log",
      href: "/mobile/activity",
      icon: FileText,
      description: "Lihat riwayat progress aktivitas harian Anda",
      bg: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Attendance History",
      href: "/mobile/attendance",
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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between pl-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Layanan Chitra</p>
      </div>

      {/* Gopay/Gojek grid layout (4 columns) */}
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

        {/* Lainnya Trigger */}
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
          <SheetContent side="bottom" className="rounded-t-[2rem] px-6 pb-8 pt-4 max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4" />
              <SheetTitle className="text-lg font-black text-[#003461]">Semua Layanan Chitra</SheetTitle>
            </SheetHeader>

            <div className="space-y-6">
              {/* Direct links */}
              <div className="grid grid-cols-4 gap-4">
                {mainServices.map((service, index) => (
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

              {/* Utility / Secondary links */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">Fitur Tambahan</h3>
                <div className="grid gap-3">
                  {extraServices.map((service, index) => (
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
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
