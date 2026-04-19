"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  notificationCount = 0,
}: {
  children: ReactNode;
  userName: string;
  notificationCount?: number;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const hadLight = root.classList.contains("light");
    const hadDark = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;

    const forceLightMode = () => {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    };

    forceLightMode();

    const observer = new MutationObserver(forceLightMode);
    observer.observe(root, {
      attributeFilter: ["class", "style"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
      root.classList.remove("light", "dark");
      if (hadLight) root.classList.add("light");
      if (hadDark) root.classList.add("dark");
      root.style.colorScheme = previousColorScheme;
    };
  }, []);

  useEffect(() => {
    if (!pendingHref) {
      return;
    }

    const timeout = window.setTimeout(() => setPendingHref(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [pendingHref]);

  function beginNavigation(href: string) {
    const targetPath = href.split("?")[0];
    if (pathname === targetPath) {
      return;
    }

    setPendingHref(href);
  }

  return (
    <div className="mobile-light-scope min-h-dvh bg-[#dfe8ef] text-[#082033]">
      <div className="mx-auto min-h-dvh max-w-[430px] bg-[#f6fbff] shadow-[0_24px_80px_rgba(8,32,51,0.18)]">
        <header className="sticky top-0 z-40 border-b border-[#d8e8f3]/80 bg-[#f6fbff]/92 px-4 py-3 backdrop-blur-xl">
          {pendingHref ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[#d8e8f3]">
              <span className="block h-full w-1/2 animate-pulse bg-[#003f78]" />
            </span>
          ) : null}
          <div className="flex h-11 items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open mobile menu"
                  className="flex size-10 items-center justify-center rounded-lg text-[#004b87] transition active:scale-95 active:bg-[#e6f2fb]"
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(320px,88vw)] border-0 bg-[#f6fbff] p-0">
                <SheetHeader className="border-b border-[#d8e8f3] px-5 py-5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#486275]">
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
                        className="flex size-10 items-center justify-center rounded-lg bg-[#eaf4fb] text-[#004b87] transition active:scale-95"
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
                          prefetch={false}
                          href={item.href}
                          onClick={() => beginNavigation(item.href)}
                          className={cn(
                            "flex min-h-12 touch-manipulation items-center gap-3 rounded-lg px-3 text-sm font-bold transition active:scale-[0.98]",
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

            <Link
              prefetch={false}
              href="/mobile/dashboard"
              onClick={() => beginNavigation("/mobile/dashboard")}
              className="text-sm font-black uppercase tracking-[0.12em] text-[#003f78]"
            >
              HERO
            </Link>

            <Link
              prefetch={false}
              href="/mobile/notifications"
              aria-label="Open notifications"
              onClick={() => beginNavigation("/mobile/notifications")}
              className="relative flex size-10 items-center justify-center rounded-lg text-[#004b87] transition active:scale-95 active:bg-[#e6f2fb]"
            >
              <Bell className="size-5" />
              {notificationCount > 0 ? (
                <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-[#5a2200] px-1 text-[9px] font-black leading-4 text-white shadow-[0_6px_14px_rgba(90,34,0,0.24)]">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Link>
          </div>
        </header>

        <main aria-busy={pendingHref ? "true" : undefined} className="px-4 pb-28 pt-4">
          {pendingHref ? (
            <div className="mb-3 rounded-lg bg-[#e9f6fd] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#003f78] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
              Memuat halaman
            </div>
          ) : null}
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-[#d8e8f3]/90 bg-white/94 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  prefetch={false}
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => beginNavigation(item.href)}
                  className={cn(
                    "flex min-h-12 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg px-1 text-[9px] font-black uppercase tracking-[0.02em] transition active:scale-95",
                    isActive
                      ? "bg-[#003f78] text-white shadow-[0_12px_26px_rgba(0,63,120,0.22)]"
                      : pendingHref === item.href
                        ? "bg-[#e9f6fd] text-[#003f78]"
                        : "text-[#486275] active:bg-[#eaf4fb]",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="max-w-full truncate leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
