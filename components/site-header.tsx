"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { HeaderThemeControls } from "@/components/header-theme-controls"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  title,
  subtitle,
  eyebrow = "Desktop Workspace",
  backgroundColor = "#FFFFFF",
  textColor = "#1E293B",
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  backgroundColor?: string
  textColor?: string
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <header
      className="sticky top-0 z-30 border-b border-outline-ghost/60 bg-surface-container-lowest/88 backdrop-blur-xl"
      style={{
        ["--header-accent" as string]: isDark ? "#1b415b" : backgroundColor,
        ["--header-text" as string]: isDark ? "#f3faff" : textColor,
      }}
    >
      <div
        className="flex min-h-12 items-center px-3 py-1.5 shadow-none sm:px-4 lg:px-5"
        style={{
          color: isDark ? "#f3faff" : "var(--foreground)",
        }}
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-2 lg:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <SidebarTrigger
              className={cn(
                "size-9 min-h-9 min-w-9 rounded-md border-0 shadow-none",
                isDark
                  ? "bg-surface-container-lowest text-slate-950 hover:bg-surface-bright hover:text-slate-900"
                  : "bg-surface-container-lowest text-primary hover:bg-surface-bright hover:text-primary-container",
              )}
            />
            <Separator orientation="vertical" className="hidden h-7 bg-outline-ghost lg:block" />
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow}
              </p>
              <p className="font-display truncate text-sm font-semibold tracking-normal text-foreground sm:text-base">
                {title}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:min-w-[420px] lg:justify-end">
            <HeaderThemeControls />
          </div>
        </div>
      </div>
    </header>
  )
}
