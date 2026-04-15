"use client"

import { useTheme } from "next-themes"
import { HeaderThemeControls } from "@/components/header-theme-controls"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import Link from "next/link"

export function SiteHeader({
  title,
  subtitle,
  backgroundColor = "#FFFFFF",
  textColor = "#1E293B",
}: {
  title: string
  subtitle?: string
  backgroundColor?: string
  textColor?: string
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Light mode: force dark text (DB may store light colors intended for dark headers)
  // Dark mode: force light text on dark background
  const resolvedBg = isDark ? "#0F172A" : backgroundColor
  const resolvedText = isDark ? "#F8FAFC" : "#0F172A"

  return (
    <header
      className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center border-b backdrop-blur-xl"
      style={{
        backgroundColor: resolvedBg,
        color: resolvedText,
        borderColor: `${resolvedText}18`,
      }}
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className={cn(
            "size-9 rounded-xl shadow-sm",
            isDark
              ? "bg-slate-50 text-slate-900 hover:bg-slate-200 hover:text-slate-800"
              : "bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
          )} />
          <Separator orientation="vertical" className="h-5 bg-current/15" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {subtitle ? (
              <p className="truncate text-sm text-current/65">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "hidden rounded-full border px-3 py-1.5 text-xs md:flex",
            isDark
              ? "border-current/10 bg-current/10 text-current/70"
              : "border-current/10 bg-black/5 text-current/70"
          )}>
            RBAC synced workspace
          </div>
          <HeaderThemeControls />
          <Button asChild variant="outline" size="sm" className={cn(
            "rounded-full px-4",
            isDark
              ? "border-current/15 bg-current/10 text-current hover:bg-current/20"
              : "border-current/15 bg-white/60 text-current hover:bg-white/80"
          )}>
            <Link href="/">Dashboard Home</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}