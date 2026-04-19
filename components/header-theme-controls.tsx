"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  BellRing,
  Search, 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Settings, 
  History, 
  HelpCircle,
  Mail,
  FileText,
  Activity,
} from "lucide-react";
import { SimpleThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  href: string;
  channel: string;
  status: string;
  createdAt: string;
};

type NotificationResponse = {
  count: number;
  notifications: NotificationItem[];
};

function formatNotificationTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HeaderThemeControls() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as NotificationResponse;
        if (isMounted) {
          setNotifications(payload.notifications);
          setUnreadCount(payload.count);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <div className="flex w-auto items-center justify-end gap-1.5 sm:gap-2 lg:w-full lg:gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-[240px] flex-1 items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-white/82 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition hover:bg-white/16 lg:flex"
      >
        <Search className="h-4 w-4 text-white/65" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Search page, command, or module</p>
        </div>
        <span className="rounded-full bg-white/12 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white/72">
          Ctrl K
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Cari menu atau aksi..." />
        <CommandList>
          <CommandEmpty>Tidak ada hasil.</CommandEmpty>
          <CommandGroup heading="Navigasi">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/analytics"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Ringkasan Analytics</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/security/users"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Manajemen Pengguna</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/security/roles"))}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Peran & Akses</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/hc"))}>
              <Activity className="mr-2 h-4 w-4" />
              <span>Pusat Performance</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Aksi Cepat">
            <CommandItem>
              <FileText className="mr-2 h-4 w-4" />
              <span>Buat Laporan Harian</span>
            </CommandItem>
            <CommandItem>
              <Mail className="mr-2 h-4 w-4" />
              <span>Lihat Riwayat Email</span>
            </CommandItem>
            <CommandItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Pengaturan Sistem</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Sistem">
            <CommandItem>
              <History className="mr-2 h-4 w-4" />
              <span>Catatan Aktivitas</span>
            </CommandItem>
            <CommandItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Bantuan</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-9 min-h-9 min-w-9 rounded-xl bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition hover:bg-white/16 hover:text-white sm:size-11 sm:min-h-11 sm:min-w-11 sm:rounded-2xl"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 sm:right-2 sm:top-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(390px,calc(100vw-1rem))] p-2" align="end">
          <div className="surface-module-card rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="industrial-label">Signal Queue</p>
                <h4 className="mt-1 font-display text-lg font-semibold">Notifications</h4>
              </div>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="rounded-full">
                  {unreadCount} New
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-2 max-h-[420px] space-y-2 overflow-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => router.push(notification.href || "/dashboard/notifications")}
                  className="surface-module-card w-full rounded-2xl bg-surface-container-lowest p-4 text-left transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-2xl bg-surface-container-low p-2.5 text-primary">
                      <BellRing className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold leading-none text-foreground">
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {notification.body}
                      </p>
                    </div>
                    {notification.status !== "failed" ? (
                      <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <div className="surface-module-card flex flex-col items-center justify-center rounded-2xl py-12 text-center">
                <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Belum ada notification.</p>
              </div>
            )}
          </div>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-2xl text-xs text-foreground"
              onClick={() => router.push("/dashboard/notifications")}
            >
              View all notifications
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="[&_button]:size-9 [&_button]:min-h-9 [&_button]:min-w-9 [&_button]:rounded-xl [&_button]:bg-white/12 [&_button]:text-white [&_button]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] [&_button]:hover:bg-white/16 [&_button]:hover:text-white sm:[&_button]:size-11 sm:[&_button]:min-h-11 sm:[&_button]:min-w-11 sm:[&_button]:rounded-2xl">
        <SimpleThemeToggle />
      </div>
    </div>
  );
}
