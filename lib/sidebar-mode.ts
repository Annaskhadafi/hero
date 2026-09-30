"use client"

import * as React from "react"
import {
  IconDashboard,
  IconFileCheck,
  IconChecklist,
  IconTools,
  IconUsers,
  IconShieldHalfFilled,
  IconDatabase,
  IconReport,
  IconSettings,
  IconHelp,
} from "@tabler/icons-react"

export type SidebarLayoutMode = "classic" | "modern"

const STORAGE_KEY = "hero_sidebar_layout_mode"
const EVENT_NAME = "hero_sidebar_layout_mode_changed"

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  try {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
    return match ? match[2] : null
  } catch {
    return null
  }
}

export function getSidebarLayoutMode(): SidebarLayoutMode {
  if (typeof window === "undefined") return "classic"
  try {
    const cookieVal = getCookie(STORAGE_KEY)
    if (cookieVal === "modern" || cookieVal === "classic") return cookieVal

    const localVal = localStorage.getItem(STORAGE_KEY)
    if (localVal === "modern" || localVal === "classic") return localVal
  } catch {}
  return "classic"
}

export function setSidebarLayoutMode(mode: SidebarLayoutMode) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, mode)
    document.cookie = `${STORAGE_KEY}=${mode}; path=/; max-age=31536000; SameSite=Lax`
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mode }))
  } catch (e) {
    console.error("Failed to set sidebar layout mode", e)
  }
}

export function useSidebarLayoutMode(initialMode?: SidebarLayoutMode): [SidebarLayoutMode, (mode: SidebarLayoutMode) => void] {
  const [mode, setModeState] = React.useState<SidebarLayoutMode>(() => initialMode || getSidebarLayoutMode())

  React.useEffect(() => {
    const stored = getSidebarLayoutMode()
    if (stored && stored !== mode) {
      setModeState(stored)
    }

    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<SidebarLayoutMode>
      if (customEvent.detail) {
        setModeState(customEvent.detail)
      } else {
        setModeState(getSidebarLayoutMode())
      }
    }

    window.addEventListener(EVENT_NAME, handleModeChange)
    return () => window.removeEventListener(EVENT_NAME, handleModeChange)
  }, [])

  const setMode = React.useCallback((newMode: SidebarLayoutMode) => {
    setModeState(newMode)
    setSidebarLayoutMode(newMode)
  }, [])

  return [mode, setMode]
}

export const MODERN_SECTION_ORDER = [
  "Workspace",
  "Approval",
  "Operasional",
  "Central Service",
  "Human Capital",
  "HSE",
  "Aset",
  "Laporan",
  "Pengaturan",
] as const

export const sectionCategoryMap: Record<string, string> = {
  Workspace: "WORKSPACE (GLOBAL)",
  Approval: "WORKSPACE (GLOBAL)",
  Operasional: "DEPARTEMEN",
  "Central Service": "DEPARTEMEN",
  "Human Capital": "DEPARTEMEN",
  HSE: "DEPARTEMEN",
  Aset: "UMUM & SISTEM",
  Laporan: "UMUM & SISTEM",
  Pengaturan: "UMUM & SISTEM",
}

export const modernSectionIconMap: Record<string, any> = {
  Workspace: IconDashboard,
  Approval: IconFileCheck,
  Operasional: IconChecklist,
  "Central Service": IconTools,
  "Human Capital": IconUsers,
  HSE: IconShieldHalfFilled,
  Aset: IconDatabase,
  Laporan: IconReport,
  Pengaturan: IconSettings,
}

export type ItemClassification = {
  section: string
  category: string
  groupLabel: string
}

export function classifyItem(item: { section?: string; title: string; url: string }): ItemClassification {
  const url = (item.url || "").trim().toLowerCase()

  // 1. WORKSPACE
  if (url === "/dashboard/attendance" || url === "/dashboard/attendance/live-map" || url === "/dashboard/attendance/records") {
    return { section: "Workspace", category: "WORKSPACE (GLOBAL)", groupLabel: "Kehadiran & Absen" }
  }
  if (url === "/dashboard/activity-hub/my-day" || url === "/dashboard/daily-activity" || url === "/dashboard/timesheet") {
    return { section: "Workspace", category: "WORKSPACE (GLOBAL)", groupLabel: "Aktivitas Harian" }
  }
  if (url === "/dashboard/request-center" || url === "/dashboard/overtime-requests" || url === "/dashboard/hc/permission" || url === "/dashboard/curhat" || url === "/dashboard/hr-counseling" || url === "/dashboard/apd") {
    return { section: "Workspace", category: "WORKSPACE (GLOBAL)", groupLabel: "Pengajuan Saya" }
  }
  if (url.startsWith("/dashboard/chitralearning-lms") || url === "/dashboard/portal-chitra") {
    return { section: "Workspace", category: "WORKSPACE (GLOBAL)", groupLabel: "Learning & Portal" }
  }

  // 2. APPROVAL
  if (url.startsWith("/dashboard/approval") || url === "/dashboard/activity-hub/approval" || url === "/dashboard/workflow-studio" || url === "/dashboard/notifications") {
    return { section: "Approval", category: "WORKSPACE (GLOBAL)", groupLabel: "Keputusan & Notifikasi" }
  }

  // 3. OPERASIONAL
  if (url === "/dashboard/activity-hub/team-board" || url === "/dashboard/activity-hub/library" || url === "/dashboard/activity-hub/routes" || url === "/dashboard/activity-hub/configuration") {
    return { section: "Operasional", category: "DEPARTEMEN", groupLabel: "Monitoring Tim" }
  }
  if (url.startsWith("/dashboard/scheduling-timesheet")) {
    return { section: "Operasional", category: "DEPARTEMEN", groupLabel: "Roster & Timesheet" }
  }
  if (url === "/dashboard/ewh" || url === "/dashboard/unit-utility" || url === "/dashboard/central-service/refueling" || url === "/dashboard/utilities") {
    return { section: "Operasional", category: "DEPARTEMEN", groupLabel: "Efisiensi Unit" }
  }

  // 4. CENTRAL SERVICE
  if (url.startsWith("/dashboard/repair-retread/wip-repair") || url === "/dashboard/repair-retread/form-wo" || url === "/dashboard/repair-retread/pattern-designer") {
    return { section: "Central Service", category: "DEPARTEMEN", groupLabel: "Repair & Retread" }
  }
  if (url.startsWith("/dashboard/warehouse-repair") || url.startsWith("/dashboard/repair-retread/master-barang") || url.startsWith("/dashboard/repair-retread/stock-material")) {
    return { section: "Central Service", category: "DEPARTEMEN", groupLabel: "Gudang & Material" }
  }
  if (url === "/dashboard/cargo-manifest" || url.startsWith("/dashboard/central-service/forecast") || url.startsWith("/dashboard/central-service/site-condition") || url === "/dashboard/central-service") {
    return { section: "Central Service", category: "DEPARTEMEN", groupLabel: "Logistik & Fleet" }
  }
  if (url.startsWith("/dashboard/360-service")) {
    return { section: "Central Service", category: "DEPARTEMEN", groupLabel: "Commercial 360" }
  }

  // 5. HUMAN CAPITAL
  if (url === "/dashboard/hc/employee" || url === "/dashboard/hc/org-chart-v2" || url === "/dashboard/hc/contract-review" || url === "/dashboard/hc") {
    return { section: "Human Capital", category: "DEPARTEMEN", groupLabel: "Data Karyawan" }
  }
  if (url.startsWith("/dashboard/hc/rfr") || url.startsWith("/dashboard/hc/recruitment")) {
    return { section: "Human Capital", category: "DEPARTEMEN", groupLabel: "Rekrutmen" }
  }
  if (url.startsWith("/dashboard/hc/performance") || url.startsWith("/dashboard/hc/leader-performance") || url === "/dashboard/leaderboard") {
    return { section: "Human Capital", category: "DEPARTEMEN", groupLabel: "Kinerja & KPI" }
  }
  if (url.startsWith("/dashboard/hc/disciplinary") || url.startsWith("/dashboard/hc/surat") || url.startsWith("/dashboard/hc/mcu-wellness") || url === "/dashboard/training-records") {
    return { section: "Human Capital", category: "DEPARTEMEN", groupLabel: "Pembinaan & Layanan" }
  }

  // 6. HSE
  if (url === "/dashboard/safety" || url === "/dashboard/safety/data" || url === "/dashboard/hse" || url === "/dashboard/hse/incident-report" || url === "/dashboard/safety-induction") {
    return { section: "HSE", category: "DEPARTEMEN", groupLabel: "Safety Control" }
  }
  if (url === "/dashboard/hse/izin-kerja-ptw" || url === "/dashboard/hse/tire-inspection" || url === "/dashboard/safety/inspections" || url === "/dashboard/hse/checklist-generator" || url === "/dashboard/summary") {
    return { section: "HSE", category: "DEPARTEMEN", groupLabel: "Izin & Inspeksi" }
  }
  if (url === "/dashboard/hse/hiradc" || url === "/dashboard/hse/jsa" || url === "/dashboard/sop-win" || url === "/dashboard/quality/5r" || url.includes("sia-sio") || url === "/dashboard/hse/inventaris") {
    return { section: "HSE", category: "DEPARTEMEN", groupLabel: "Risk & Standar" }
  }

  // 7. ASET & DATA INDUK
  if (url.startsWith("/dashboard/central-service/assets") || url.startsWith("/dashboard/central-service/sap-assets") || url === "/dashboard/master-data" || url === "/dashboard/customers" || url === "/dashboard/form-studio") {
    return { section: "Aset", category: "UMUM & SISTEM", groupLabel: "Manajemen Aset" }
  }

  // 8. LAPORAN
  if (url.startsWith("/dashboard/analytics") || url.startsWith("/dashboard/reports") || url === "/dashboard/command-center" || url.startsWith("/dashboard/marketing")) {
    return { section: "Laporan", category: "UMUM & SISTEM", groupLabel: "Analytics & Laporan" }
  }

  // 9. PENGATURAN
  if (url.startsWith("/dashboard/security")) {
    return { section: "Pengaturan", category: "UMUM & SISTEM", groupLabel: "Akses & Keamanan" }
  }
  if (url.startsWith("/dashboard/settings")) {
    return { section: "Pengaturan", category: "UMUM & SISTEM", groupLabel: "Pengaturan Sistem" }
  }
  if (url.startsWith("/dashboard/hero-genius") || url === "/dashboard/documentation" || url === "/dashboard/feature-map") {
    return { section: "Pengaturan", category: "UMUM & SISTEM", groupLabel: "AI & Dokumentasi" }
  }

  return { section: item.section || "Lainnya", category: "UMUM & SISTEM", groupLabel: "Lainnya" }
}

export function buildModernSidebarGroups(desktopItems: any[]) {
  const modernItems = desktopItems.map((item) => {
    const classification = classifyItem(item)
    return {
      ...item,
      modernSection: classification.section,
      modernCategory: classification.category,
      groupLabel: classification.groupLabel, // Crucial: sets groupLabel for sub-group headers!
    }
  })

  const extraSections = Array.from(
    new Set(
      modernItems
        .map((item) => item.modernSection)
        .filter((sec) => !MODERN_SECTION_ORDER.includes(sec as any))
    )
  )

  const orderedSections = [...MODERN_SECTION_ORDER, ...extraSections]

  return orderedSections
    .map((section) => {
      const sectionItems = modernItems.filter((item) => item.modernSection === section)

      const itemMap = new Map<number, any>()
      const rootItems: any[] = []

      sectionItems.forEach((item) => {
        if (item.id !== undefined) {
          itemMap.set(item.id, { ...item, children: [] })
        }
      })

      sectionItems.forEach((item) => {
        if (item.id !== undefined) {
          const mappedItem = itemMap.get(item.id)
          if (item.parentId && itemMap.has(item.parentId)) {
            itemMap.get(item.parentId).children.push(mappedItem)
          } else {
            rootItems.push(mappedItem)
          }
        }
      })

      const category = sectionCategoryMap[section] || "UMUM & SISTEM"

      return {
        category,
        rawTitle: section,
        title: section,
        icon: modernSectionIconMap[section] ?? IconHelp,
        items: rootItems.sort((left, right) => {
          // Sort primarily by groupLabel so sub-groups cluster cleanly together
          if (left.groupLabel !== right.groupLabel) {
            return (left.groupLabel || "").localeCompare(right.groupLabel || "")
          }
          return (left.sortOrder ?? 999) - (right.sortOrder ?? 999)
        }),
      }
    })
    .filter((group) => group.items.length > 0)
}
