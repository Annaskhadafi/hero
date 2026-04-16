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
  const [notifications, setNotifications] = React.useState(MOCK_NOTIFICATIONS);

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
      <div 
        className="relative hidden min-w-[220px] max-w-[320px] flex-1 cursor-pointer lg:block"
        onClick={() => setOpen(true)}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search menu, page, or command... (⌘K)"
          readOnly
          className="h-10 cursor-pointer rounded-full border-border bg-muted/50 pl-10 text-sm text-foreground shadow-none backdrop-blur transition-all hover:bg-muted"
        />
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/analytics"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Analytics Overview</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/security/users"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>User Management</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/security/roles"))}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Role & Permissions</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/hc"))}>
              <Activity className="mr-2 h-4 w-4" />
              <span>Performance Hub</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem>
              <FileText className="mr-2 h-4 w-4" />
              <span>Generate Daily Report</span>
            </CommandItem>
            <CommandItem>
              <Mail className="mr-2 h-4 w-4" />
              <span>View Email Logs</span>
            </CommandItem>
            <CommandItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>System Settings</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="System">
            <CommandItem>
              <History className="mr-2 h-4 w-4" />
              <span>Audit logs</span>
            </CommandItem>
            <CommandItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help & Support</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative rounded-full border-border bg-muted/50 text-foreground transition-all hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
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
        <PopoverContent className="w-[380px] p-0" align="end">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-600">
                {unreadCount} New
              </Badge>
            )}
          </div>
          <div className="max-h-[400px] overflow-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`flex items-start gap-3 border-b border-border p-4 transition-colors hover:bg-muted/50 ${n.unread ? "bg-muted/20" : ""}`}
                >
                  <div className={`mt-0.5 rounded-full p-2 ${n.color}`}>
                    <n.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium leading-none">{n.title}</p>
                      <span className="text-xs text-muted-foreground">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.description}</p>
                  </div>
                  {n.unread && (
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            )}
          </div>
          <div className="border-t border-border p-3 text-center">
            <Button variant="ghost" size="sm" className="w-full text-xs font-medium text-muted-foreground hover:text-foreground">
              View all notifications
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="[&_button]:rounded-full [&_button]:border-border [&_button]:bg-muted/50 [&_button]:text-foreground [&_button]:hover:bg-muted">
        <SimpleThemeToggle />
      </div>
    </div>
  );
}