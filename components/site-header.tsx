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
  backgroundColor = "#FFFFFF",
  textColor = "#1E293B",
}: {
  title: string
  subtitle?: string
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
      className="sticky top-0 z-30 mx-2 mt-2 sm:mx-3 sm:mt-3"
      style={{
        ["--header-accent" as string]: isDark ? "#1b415b" : backgroundColor,
        ["--header-text" as string]: isDark ? "#f3faff" : textColor,
      }}
    >
      <div
        className="glass-command flex min-h-14 items-center rounded-[1.05rem] px-3 py-2 shadow-[0_16px_30px_rgba(0,52,97,0.1)] ring-1 ring-white/10 sm:min-h-(--header-height) sm:px-4 sm:py-3 lg:px-5"
        style={{
          background: isDark
            ? "linear-gradient(135deg, rgba(8,24,38,0.94) 0%, rgba(14,34,50,0.92) 56%, rgba(27,65,91,0.82) 100%)"
            : "linear-gradient(135deg, rgba(0,52,97,0.9) 0%, rgba(0,75,135,0.84) 58%, color-mix(in srgb, var(--header-accent) 34%, transparent) 100%)",
          color: "var(--header-text)",
        }}
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-2 lg:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <SidebarTrigger
              className={cn(
                "size-9 min-h-9 min-w-9 rounded-lg border-0 shadow-[0_14px_26px_rgba(0,0,0,0.18)] sm:size-11 sm:min-h-11 sm:min-w-11",
                isDark
                  ? "bg-surface-container-lowest text-slate-950 hover:bg-surface-bright hover:text-slate-900"
                  : "bg-surface-container-lowest text-primary hover:bg-surface-bright hover:text-primary-container",
              )}
            />
            <Separator orientation="vertical" className="hidden h-8 bg-white/14 lg:block" />
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/62">
                Operations Workspace
              </p>
              <h1 className="font-display truncate text-base font-semibold tracking-normal sm:text-xl lg:text-[1.6rem]">
                {title}
              </h1>
              {subtitle ? (
                <p className="max-w-3xl truncate text-sm text-white/72">{subtitle}</p>
              ) : null}
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
