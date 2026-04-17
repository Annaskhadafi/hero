"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
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
      className="sticky top-0 z-30 mx-3 mt-3"
      style={{
        ["--header-accent" as string]: isDark ? "#1b415b" : backgroundColor,
        ["--header-text" as string]: isDark ? "#f3faff" : textColor,
      }}
    >
      <div
        className="glass-command flex min-h-(--header-height) items-center rounded-[1.35rem] px-4 py-3 shadow-[0_18px_34px_rgba(0,52,97,0.12)] ring-1 ring-white/10 lg:px-6"
        style={{
          background: isDark
            ? "linear-gradient(135deg, rgba(8,24,38,0.94) 0%, rgba(15,38,56,0.9) 55%, rgba(27,65,91,0.84) 100%)"
            : "linear-gradient(135deg, rgba(0,52,97,0.94) 0%, rgba(0,75,135,0.88) 56%, color-mix(in srgb, var(--header-accent) 48%, transparent) 100%)",
          color: "var(--header-text)",
        }}
      >
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger
              className={cn(
                "size-11 rounded-2xl border-0 shadow-[0_14px_26px_rgba(0,0,0,0.18)]",
                isDark
                  ? "bg-surface-container-lowest text-slate-950 hover:bg-surface-bright hover:text-slate-900"
                  : "bg-surface-container-lowest text-primary hover:bg-surface-bright hover:text-primary-container",
              )}
            />
            <Separator orientation="vertical" className="hidden h-8 bg-white/14 lg:block" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="industrial-label text-white/68">Operations Network</p>
                <span className="surface-chip hidden rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground lg:inline-flex">
                  Live Command
                </span>
              </div>
              <h1 className="font-display truncate text-xl font-semibold tracking-[-0.04em] lg:text-2xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="max-w-3xl truncate text-sm text-white/72">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 lg:min-w-[420px] lg:justify-end">
            <HeaderThemeControls />
          </div>
        </div>
      </div>
    </header>
  )
}
