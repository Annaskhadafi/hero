"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  BellRing,
  Check,
  CheckCheck,
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
  Trash2,
} from "lucide-react";
import { SimpleThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoutButton } from "@/components/logout-button";
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
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  href: string;
  channel: string;
  status: string;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
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
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isNotificationBusy, setIsNotificationBusy] = React.useState(false);

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

  const syncNotifications = React.useCallback((payload: NotificationResponse) => {
    setNotifications(payload.notifications);
    setUnreadCount(payload.count);
  }, []);

  const loadNotifications = React.useCallback(async () => {
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
      syncNotifications(payload);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }, [syncNotifications]);

  React.useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadNotifications]);

  React.useEffect(() => {
    const handleNotificationsUpdated = () => {
      void loadNotifications();
    };

    window.addEventListener("hero:notifications-updated", handleNotificationsUpdated);
    return () => window.removeEventListener("hero:notifications-updated", handleNotificationsUpdated);
  }, [loadNotifications]);

  const runNotificationAction = React.useCallback(
    async (action: "mark-read" | "clear", options?: { ids?: number[]; scope?: "all" }) => {
      setIsNotificationBusy(true);

      try {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ids: options?.ids,
            scope: options?.scope,
          }),
        });

        if (!response.ok) {
          throw new Error("Notification action failed.");
        }

        const payload = (await response.json()) as NotificationResponse;
        syncNotifications(payload);
        window.dispatchEvent(new Event("hero:notifications-updated"));
      } catch {
        await loadNotifications();
      } finally {
        setIsNotificationBusy(false);
      }
    },
    [loadNotifications, syncNotifications],
  );

  const handleOpenNotification = React.useCallback(
    async (notification: NotificationItem) => {
      if (!notification.isRead) {
        try {
          await runNotificationAction("mark-read", { ids: [notification.id] });
        } catch {
          // Keep navigation responsive even if the read sync fails.
        }
      }

      setOpen(false);
      router.push(notification.href || "/dashboard/notifications");
    },
    [router, runNotificationAction],
  );

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const isDark = resolvedTheme === "dark";
  const glassButtonClassName = isDark
    ? "bg-slate-900 text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-slate-800 hover:text-white"
    : "bg-white text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)] hover:bg-slate-100 hover:text-slate-900";
  const searchClassName = isDark
    ? "bg-slate-900 text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-slate-800"
    : "bg-white text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)] hover:bg-slate-100";

  return (
    <div className="flex w-auto items-center justify-end gap-1.5 sm:gap-2 lg:w-full lg:gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("hidden min-w-[220px] flex-1 items-center gap-3 rounded-xl px-4 py-2.5 text-left transition lg:flex", searchClassName)}
      >
        <Search className={cn("h-4 w-4", isDark ? "text-slate-400" : "text-slate-500")} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Search page, command, or module</p>
        </div>
        <span className={cn("rounded-full px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]", isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500")}>
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
            className={cn("relative size-9 min-h-9 min-w-9 rounded-xl transition sm:size-11 sm:min-h-11 sm:min-w-11 sm:rounded-2xl", glassButtonClassName)}
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                {unreadCount > 0 ? (
                  <Badge variant="secondary" className="rounded-full">
                    {unreadCount} New
                  </Badge>
                ) : null}
                {notifications.length > 0 ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isNotificationBusy || unreadCount === 0}
                      className="h-8 rounded-xl px-3 text-xs"
                      onClick={() => void runNotificationAction("mark-read", { scope: "all" })}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Read all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isNotificationBusy}
                      className="h-8 rounded-xl px-3 text-xs text-[#5a2200] hover:text-[#5a2200]"
                      onClick={() => void runNotificationAction("clear", { scope: "all" })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-2 max-h-[420px] space-y-2 overflow-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="surface-module-card rounded-2xl bg-surface-container-lowest p-4 transition-transform hover:-translate-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => void handleOpenNotification(notification)}
                    className="w-full text-left"
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
                      {!notification.isRead && notification.status !== "failed" ? (
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      ) : null}
                    </div>
                  </button>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {notification.isRead ? (
                      <Badge variant="secondary" className="rounded-full">
                        Read
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isNotificationBusy}
                        className="h-8 rounded-xl px-3 text-xs"
                        onClick={() => void runNotificationAction("mark-read", { ids: [notification.id] })}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark read
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isNotificationBusy}
                      className="h-8 rounded-xl px-3 text-xs text-[#5a2200] hover:text-[#5a2200]"
                      onClick={() => void runNotificationAction("clear", { ids: [notification.id] })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                  </div>
                </div>
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

      <LogoutButton
        variant="ghost"
        size="icon"
        label="Keluar"
        className={cn("size-9 min-h-9 min-w-9 rounded-xl transition sm:size-11 sm:min-h-11 sm:min-w-11 sm:rounded-2xl", glassButtonClassName)}
      />

      <div
        className={cn(
          "[&_button]:size-9 [&_button]:min-h-9 [&_button]:min-w-9 [&_button]:rounded-xl sm:[&_button]:size-11 sm:[&_button]:min-h-11 sm:[&_button]:min-w-11 sm:[&_button]:rounded-2xl",
          isDark
            ? "[&_button]:bg-slate-900 [&_button]:text-slate-100 [&_button]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [&_button]:hover:bg-slate-800 [&_button]:hover:text-white"
            : "[&_button]:bg-white [&_button]:text-slate-700 [&_button]:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)] [&_button]:hover:bg-slate-100 [&_button]:hover:text-slate-900",
        )}
      >
        <SimpleThemeToggle />
      </div>
    </div>
  );
}
