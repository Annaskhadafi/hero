"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
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
  UserPlus
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

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: "New User Registered",
    description: "Ani Wijaya has joined the platform.",
    time: "2 minutes ago",
    unread: true,
    icon: UserPlus,
    color: "text-blue-500 bg-blue-50",
  },
  {
    id: 2,
    title: "System Update",
    description: "Security patch v2.4.1 has been applied.",
    time: "1 hour ago",
    unread: true,
    icon: ShieldCheck,
    color: "text-emerald-500 bg-emerald-50",
  },
  {
    id: 3,
    title: "Export Failed",
    description: "Monthly analytics export encountered an error.",
    time: "5 hours ago",
    unread: false,
    icon: Activity,
    color: "text-rose-500 bg-rose-50",
  },
];

export function HeaderThemeControls() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const notifications = React.useMemo(() => MOCK_NOTIFICATIONS, []);

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

  const unreadCount = notifications.filter((n) => n.unread).length;

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <div className="flex w-full items-center justify-end gap-2 lg:gap-3">
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
            className="relative size-11 rounded-2xl bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition hover:bg-white/16 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[390px] p-2" align="end">
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
            {unreadCount > 0 && (
              notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`surface-module-card rounded-2xl p-4 transition-transform hover:-translate-y-0.5 ${n.unread ? "bg-surface-container-lowest" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-2xl p-2.5 ${n.color}`}>
                        <n.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold leading-none text-foreground">{n.title}</p>
                          <span className="text-xs text-muted-foreground">{n.time}</span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{n.description}</p>
                      </div>
                      {n.unread && (
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="surface-module-card flex flex-col items-center justify-center rounded-2xl py-12 text-center">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              )
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

      <div className="[&_button]:size-11 [&_button]:rounded-2xl [&_button]:bg-white/12 [&_button]:text-white [&_button]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] [&_button]:hover:bg-white/16 [&_button]:hover:text-white">
        <SimpleThemeToggle />
      </div>
    </div>
  );
}
