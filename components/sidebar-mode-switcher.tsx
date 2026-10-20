"use client"

import * as React from "react"
import { useSidebarLayoutMode, type SidebarLayoutMode } from "@/lib/sidebar-mode"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconLayoutSidebar, IconLayoutDashboard, IconCheck } from "@tabler/icons-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function SidebarModeSettingsCard() {
  const [mode, setMode] = useSidebarLayoutMode()

  const handleSelect = (newMode: SidebarLayoutMode) => {
    setMode(newMode)
    toast.success(
      newMode === "modern"
        ? "Beralih ke Mode Baru (Workspace & Departemen)"
        : "Beralih ke Mode Klasik (18 Kategori Awal)"
    )
  }

  return (
    <Card className="rounded-2xl border bg-card shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconLayoutSidebar className="size-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Mode Tampilan Sidebar</CardTitle>
          </div>
          <Badge variant={mode === "modern" ? "default" : "secondary"}>
            {mode === "modern" ? "Mode Baru Aktif" : "Mode Klasik Aktif"}
          </Badge>
        </div>
        <CardDescription>
          Pilih gaya tata letak menu navigasi. Anda dapat berganti mode kapan saja secara instan tanpa ada fitur yang hilang.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Opsi 1: Mode Klasik */}
          <div
            onClick={() => handleSelect("classic")}
            className={cn(
              "relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all duration-200",
              mode === "classic"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900"
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Mode Klasik (Default Awal)</span>
                {mode === "classic" && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <IconCheck className="size-3" />
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Struktur original dengan 18 kategori terpisah (Aktivitas Harian, Roster, Attendance, Central Service, HSE, dll).
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-block size-2 rounded-full bg-slate-400" />
              18 Kategori Terpisah
            </div>
          </div>

          {/* Opsi 2: Mode Baru */}
          <div
            onClick={() => handleSelect("modern")}
            className={cn(
              "relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all duration-200",
              mode === "modern"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900"
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">Mode Baru (Rekomendasi)</span>
                  <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">Ringkas</Badge>
                </div>
                {mode === "modern" && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <IconCheck className="size-3" />
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Struktur terorganisir per <b>Workspace</b> (Global Karyawan), <b>Approval</b>, <b>Departemen</b> (Operasional, Central Service, HC, HSE), dan <b>Aset/Laporan</b>.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Bebas Duplikasi & Ringan
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SidebarModeQuickToggle() {
  const [mode, setMode] = useSidebarLayoutMode()

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = mode === "modern" ? "classic" : "modern"
    setMode(next)
    toast.success(
      next === "modern"
        ? "Beralih ke Mode Baru (Workspace & Departemen)"
        : "Beralih ke Mode Klasik (18 Kategori Awal)"
    )
  }

  return (
    <button
      onClick={toggle}
      type="button"
      className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <div className="flex items-center gap-2">
        <IconLayoutSidebar className="size-4 text-muted-foreground" />
        <span>Layout Sidebar</span>
      </div>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        {mode === "modern" ? "Mode Baru" : "Mode Klasik"}
      </Badge>
    </button>
  )
}
