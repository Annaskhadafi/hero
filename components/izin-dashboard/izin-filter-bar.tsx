"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, MapPin, X } from "lucide-react"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

type Site = { id: number; name: string }

export function IzinFilterBar({ sites }: { sites: Site[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const dateFrom = searchParams.get("dateFrom") || ""
  const dateTo = searchParams.get("dateTo") || ""
  const siteId = searchParams.get("siteId") || ""

  const range: DateRange | undefined = {
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  }

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const setDateRange = useCallback(
    (r: DateRange | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (r?.from) params.set("dateFrom", format(r.from, "yyyy-MM-dd"))
      else params.delete("dateFrom")
      if (r?.to) params.set("dateTo", format(r.to, "yyyy-MM-dd"))
      else params.delete("dateTo")
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const setQuickRange = useCallback(
    (days: number) => {
      const from = subDays(new Date(), days)
      const to = new Date()
      const params = new URLSearchParams(searchParams.toString())
      params.set("dateFrom", format(from, "yyyy-MM-dd"))
      params.set("dateTo", format(to, "yyyy-MM-dd"))
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const resetAll = useCallback(() => {
    router.push(window.location.pathname)
  }, [router])

  const hasFilters = dateFrom || dateTo || siteId

  const dateLabel = dateFrom
    ? dateTo
      ? `${format(new Date(dateFrom), "dd MMM yyyy", { locale: idLocale })} — ${format(new Date(dateTo), "dd MMM yyyy", { locale: idLocale })}`
      : format(new Date(dateFrom), "dd MMM yyyy", { locale: idLocale })
    : "Semua tanggal"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-lg border-0 bg-surface-container-lowest text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]"
          >
            <CalendarDays className="size-4 text-primary" />
            <span className="truncate max-w-[200px]">{dateLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickRange(0)}>
              Hari ini
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickRange(6)}>
              7 hari
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickRange(29)}>
              30 hari
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickRange(89)}>
              3 bulan
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange(undefined)}>
              Reset
            </Button>
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Site Filter */}
      <Select value={siteId || "all"} onValueChange={(v) => updateParam("siteId", v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-auto min-w-[160px] gap-2 rounded-lg border-0 bg-surface-container-lowest text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
          <MapPin className="size-4 text-primary" />
          <SelectValue placeholder="Semua lokasi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua lokasi</SelectItem>
          {sites.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive"
          onClick={resetAll}
        >
          <X className="size-3.5" />
          Reset
        </Button>
      )}
    </div>
  )
}
