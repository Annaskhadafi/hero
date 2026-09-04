"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { useLanguage } from "@/components/language-provider"
import { translateMenuTitle, translateSectionTitle } from "@/lib/i18n"
import { HeaderThemeControls } from "@/components/header-theme-controls"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export type NavItem = {
  title: string
  url: string
  section?: string
  iconName?: string
  sortOrder?: number
  menuArea?: string
  id?: number
  resource?: string
  isVisible?: boolean
  openInNewTab?: boolean
}

export function SiteHeader({
  title,
  subtitle,
  eyebrow = "Desktop Workspace",
  backgroundColor = "#FFFFFF",
  textColor = "#1E293B",
  navMain = [],
  navSecondary = [],
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  backgroundColor?: string
  textColor?: string
  navMain?: NavItem[]
  navSecondary?: NavItem[]
}) {
  const { resolvedTheme } = useTheme()
  const { language, t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const shellClassName = isDark
    ? "border-b border-white/10 bg-slate-950/92"
    : "border-b border-border/80 bg-white/92"
  const triggerClassName = isDark
    ? "bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white border-white/10"
    : "bg-white text-foreground hover:bg-muted/50 hover:text-foreground border-border/70"

  const displayEyebrow = eyebrow === "Desktop Workspace" ? t("desktop_workspace", "Desktop Workspace") : eyebrow
  const displayTitle = translateMenuTitle(title, language)
  const displaySubtitle = subtitle ? translateMenuTitle(subtitle, language) : null

  return (
    <header
      className={cn("sticky top-0 z-30 backdrop-blur-xl", shellClassName)}
      style={{
        ["--header-accent" as string]: isDark ? "#1b415b" : backgroundColor,
        ["--header-text" as string]: isDark ? "#f3faff" : textColor,
      }}
    >
      <div
        className="flex min-h-14 items-center px-3 py-2 shadow-none sm:px-4 lg:px-6"
        style={{
          color: isDark ? "#f3faff" : "var(--foreground)",
        }}
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-2 lg:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <SidebarTrigger
              className={cn(
                "size-9 min-h-9 min-w-9 rounded-lg border border-border/70 shadow-none",
                triggerClassName,
              )}
            />
            <Separator orientation="vertical" className={cn("hidden h-7 lg:block", isDark ? "bg-white/12" : "bg-border")} />
            <div className="min-w-0">
              <p className={cn("text-[0.62rem] font-semibold uppercase tracking-[0.16em]", isDark ? "text-slate-400" : "text-muted-foreground")}>
                {displayEyebrow}
              </p>
              <p className={cn("font-display truncate text-sm font-semibold tracking-normal sm:text-[1rem]", isDark ? "text-slate-50" : "text-foreground")}>
                {displayTitle}
              </p>
              {displaySubtitle ? <p className={cn("truncate text-xs", isDark ? "text-slate-400" : "text-muted-foreground")}>{displaySubtitle}</p> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:min-w-[420px] lg:justify-end">
            <HeaderThemeControls navMain={navMain} navSecondary={navSecondary} />
          </div>
        </div>
      </div>
    </header>
  )
}
