"use client";

import { Bell, Search } from "lucide-react";
import { SimpleThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeaderThemeControls() {
    return (
        <div className="flex w-full items-center justify-end gap-2 lg:gap-3">
            <div className="relative hidden min-w-[220px] max-w-[320px] flex-1 lg:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search menu, page, or command..."
                    className="h-10 rounded-full border-border bg-muted/50 pl-10 text-sm text-foreground shadow-none backdrop-blur"
                />
            </div>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative rounded-full border-border bg-muted/50 text-foreground hover:bg-muted"
            >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
                <span className="sr-only">Notifications</span>
            </Button>
            <div className="[&_button]:rounded-full [&_button]:border-border [&_button]:bg-muted/50 [&_button]:text-foreground [&_button]:hover:bg-muted">
                <SimpleThemeToggle />
            </div>
        </div>
    );
}