"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type SafetyFilterProps = {
  filterOptions: {
    years: string[]
    locations: string[]
  }
}

export function SafetyDashboardFilter({ filterOptions }: SafetyFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const year = searchParams.get("year") || ""
  const location = searchParams.get("location") || ""

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-surface-container-low/30 p-2 rounded-xl border border-border/50">
      <Select value={year || "all"} onValueChange={(val) => updateParam("year", val)}>
        <SelectTrigger className="w-[140px] bg-surface-container-lowest font-medium shadow-sm">
          <SelectValue placeholder="Semua Tahun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="font-semibold text-primary">Semua Tahun</SelectItem>
          {filterOptions.years.map(y => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={location || "all"} onValueChange={(val) => updateParam("location", val)}>
        <SelectTrigger className="w-[180px] bg-surface-container-lowest font-medium shadow-sm">
          <SelectValue placeholder="Semua Lokasi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="font-semibold text-primary">Semua Lokasi</SelectItem>
          {filterOptions.locations.map(loc => (
            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
