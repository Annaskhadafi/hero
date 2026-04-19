"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FileText,
  Grid3X3,
  Home,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import { MobileOfflineIndicator } from "@/components/offline-sync-provider";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { label: "Dashboard", href: "/mobile/dashboard", icon: Home },
  { label: "Activity", href: "/mobile/activity", icon: ClipboardList },
  { label: "Menu", href: "/mobile/menu", icon: Grid3X3 },
  { label: "Profile", href: "/mobile/profile", icon: UserRound },
];

const drawerItems = [
  { label: "Mobile Dashboard", href: "/mobile/dashboard", icon: Home },
  { label: "Daily Activity", href: "/mobile/activity", icon: ClipboardList },
  { label: "Approval", href: "/mobile/approval", icon: CheckCircle2 },
  { label: "Activity Input", href: "/mobile/activity/input", icon: Grid3X3 },
  { label: "HSE Report", href: "/mobile/hse", icon: ShieldCheck },
  { label: "Daily Report", href: "/mobile/reports", icon: FileText },
  { label: "Timesheet", href: "/mobile/timesheet", icon: Timer },
  { label: "Training", href: "/mobile/training", icon: ShieldAlert },
  { label: "Wellness", href: "/mobile/wellness", icon: Dumbbell },
  { label: "Gamification", href: "/mobile/gamification", icon: Trophy },
  { label: "Executive", href: "/mobile/executive", icon: Bell },
  { label: "Profile", href: "/mobile/profile", icon: UserRound },
];

export function MobileAppShell({
  children,
  userName,
}: {
  children: ReactNode;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[#dfe8ef] text-[#082033]">
      <div className="mx-auto min-h-dvh max-w-[430px] bg-[#f6fbff] shadow-[0_24px_80px_rgba(8,32,51,0.18)]">
        <header className="sticky top-0 z-40 border-b border-[#d8e8f3]/80 bg-[#f6fbff]/92 px-4 py-3 backdrop-blur-xl">
          <div className="flex h-11 items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open mobile menu"
                  className="flex size-10 items-center justify-center rounded-2xl text-[#004b87] transition active:scale-95 active:bg-[#e6f2fb]"
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(320px,88vw)] border-0 bg-[#f6fbff] p-0">
                <SheetHeader className="border-b border-[#d8e8f3] px-5 py-5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#5d7485]">
                        HERO Mobile
                      </p>
                      <SheetTitle className="mt-1 text-xl font-black tracking-tight text-[#082033]">
                        {userName}
                      </SheetTitle>
                    </div>
                    <SheetClose asChild>
                      <button
                        type="button"
                        aria-label="Close mobile menu"
                        className="flex size-10 items-center justify-center rounded-2xl bg-[#eaf4fb] text-[#004b87] transition active:scale-95"
                      >
                        <X className="size-4" />
                      </button>
                    </SheetClose>
                  </div>
                </SheetHeader>
                <nav className="space-y-2 px-4 py-5">
                  {drawerItems.map((item) => {
                    const Icon = item.icon;
                    const itemPath = item.href.split("?")[0];
                    const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);

                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition active:scale-[0.98]",
                            isActive
                              ? "bg-[#003f78] text-white shadow-[0_14px_28px_rgba(0,63,120,0.2)]"
                              : "bg-white text-[#153249] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.07)]",
                          )}
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/mobile/dashboard"
                className="truncate text-sm font-black uppercase tracking-[0.12em] text-[#003f78]"
              >
                HERO
              </Link>
              <MobileOfflineIndicator />
            </div>

            <Link
              href="/mobile/notifications"
              aria-label="Open notifications"
              className="flex size-10 items-center justify-center rounded-2xl text-[#004b87] transition active:scale-95 active:bg-[#e6f2fb]"
            >
              <Bell className="size-5" />
            </Link>
          </div>
        </header>

        <main className="px-4 pb-28 pt-4">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-[#d8e8f3]/90 bg-white/94 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.08em] transition active:scale-95",
                    isActive
                      ? "bg-[#003f78] text-white shadow-[0_12px_26px_rgba(0,63,120,0.22)]"
                      : "text-[#5d7485] active:bg-[#eaf4fb]",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
