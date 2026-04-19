import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FileText,
  Grid3X3,
  ShieldCheck,
  Timer,
  Trophy,
  UserRound,
} from "lucide-react";

import { getServerSession } from "@/lib/auth-session";

const menuItems = [
  { label: "Daily Activity", detail: "Assignment, check-in, dan log kerja", href: "/mobile/activity", icon: ClipboardList },
  {
    label: "Approval",
    detail: "Inbox grouped per user dan history hasil approval activity",
    href: "/mobile/approval",
    icon: CheckCircle2,
  },
  { label: "Activity Input", detail: "Submit aktivitas real ke database", href: "/mobile/activity/input", icon: Grid3X3 },
  { label: "HSE Report", detail: "Observasi dan incident site", href: "/mobile/hse", icon: ShieldCheck },
  { label: "Daily Report", detail: "Summary laporan site harian", href: "/mobile/reports", icon: FileText },
  { label: "Timesheet", detail: "Jam kerja dan overtime", href: "/mobile/timesheet", icon: Timer },
  { label: "Training", detail: "Sertifikasi dan masa berlaku", href: "/mobile/training", icon: ShieldCheck },
  { label: "Wellness", detail: "Health tracking dan fit status", href: "/mobile/wellness", icon: Dumbbell },
  { label: "Gamification", detail: "Rank dan point performer", href: "/mobile/gamification", icon: Trophy },
  { label: "Executive", detail: "Ringkasan manajemen mobile", href: "/mobile/executive", icon: Bell },
  { label: "Notifications", detail: "Signal dan reminder sistem", href: "/mobile/notifications", icon: Bell },
  { label: "Profile", detail: "Data employee dan role", href: "/mobile/profile", icon: UserRound },
];

export default async function MobileMenuPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Native Menu</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Menu HERO</h1>
      </section>

      <section className="space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              prefetch={false}
              key={item.label}
              href={item.href}
              className="flex min-h-16 items-center gap-3 rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] active:scale-[0.98]"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[#082033]">{item.label}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-[#5d7485]">{item.detail}</span>
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
