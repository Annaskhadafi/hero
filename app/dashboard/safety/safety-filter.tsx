'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SafetyFilterProps = {
  filterOptions: {
    years: string[]
    months: { value: string; label: string }[]
    locations: string[]
  }
}

export function SafetyDashboardFilter({ filterOptions }: SafetyFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const year = searchParams.get('year') || ''
  const month = searchParams.get('month') || ''
  const location = searchParams.get('location') || ''

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="bg-surface-container-low/30 border-border/50 flex flex-wrap items-center gap-3 rounded-xl border p-2">
      <Select value={year || 'all'} onValueChange={(val) => updateParam('year', val)}>
        <SelectTrigger className="bg-surface-container-lowest w-[140px] font-medium shadow-sm">
          <SelectValue placeholder="Semua Tahun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-primary font-semibold">
            Semua Tahun
          </SelectItem>
          {filterOptions.years.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month || 'all'} onValueChange={(val) => updateParam('month', val)}>
        <SelectTrigger className="bg-surface-container-lowest w-[140px] font-medium shadow-sm">
          <SelectValue placeholder="Semua Bulan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-primary font-semibold">
            Semua Bulan
          </SelectItem>
          {filterOptions.months?.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={location || 'all'} onValueChange={(val) => updateParam('location', val)}>
        <SelectTrigger className="bg-surface-container-lowest w-[180px] font-medium shadow-sm">
          <SelectValue placeholder="Semua Lokasi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-primary font-semibold">
            Semua Lokasi
          </SelectItem>
          {filterOptions.locations.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {loc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
