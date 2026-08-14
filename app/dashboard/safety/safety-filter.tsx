'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronDown, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
  const locationParam = searchParams.get('location') || ''

  const selectedLocations = React.useMemo(() => {
    return locationParam
      ? locationParam.split(',').map((s) => s.trim()).filter(Boolean)
      : []
  }, [locationParam])

  const [openLocationPopover, setOpenLocationPopover] = React.useState(false)
  const [searchLocationQuery, setSearchLocationQuery] = React.useState('')

  const filteredLocations = React.useMemo(() => {
    const q = searchLocationQuery.trim().toLowerCase()
    if (!q) return filterOptions.locations
    return filterOptions.locations.filter((loc) => loc.toLowerCase().includes(q))
  }, [filterOptions.locations, searchLocationQuery])

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  const toggleLocation = (loc: string) => {
    let next: string[]
    if (selectedLocations.includes(loc)) {
      next = selectedLocations.filter((l) => l !== loc)
    } else {
      next = [...selectedLocations, loc]
    }
    updateParam('location', next.join(','))
  }

  const clearLocations = () => {
    updateParam('location', '')
  }

  const locationTriggerLabel = React.useMemo(() => {
    if (selectedLocations.length === 0) return 'Semua Lokasi'
    if (selectedLocations.length === 1) return selectedLocations[0]
    return `${selectedLocations.length} Lokasi Terpilih`
  }, [selectedLocations])

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

      <Popover open={openLocationPopover} onOpenChange={setOpenLocationPopover}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="bg-surface-container-lowest border-input min-w-[180px] max-w-[280px] justify-between font-medium shadow-sm"
          >
            <span className="truncate">{locationTriggerLabel}</span>
            <div className="flex items-center gap-1">
              {selectedLocations.length > 0 ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    clearLocations()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      clearLocations()
                    }
                  }}
                  className="hover:bg-muted rounded-full p-0.5"
                >
                  <X className="size-3.5 text-muted-foreground" />
                </span>
              ) : null}
              <ChevronDown className="size-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[260px] p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchLocationQuery}
              onChange={(e) => setSearchLocationQuery(e.target.value)}
              placeholder="Cari lokasi..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center justify-between px-1 py-1 text-xs text-muted-foreground border-b border-border/50 mb-1">
            <span>{selectedLocations.length > 0 ? `${selectedLocations.length} terpilih` : 'Pilih Lokasi'}</span>
            {selectedLocations.length > 0 ? (
              <button
                type="button"
                onClick={clearLocations}
                className="text-primary hover:underline font-semibold"
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            <button
              type="button"
              onClick={clearLocations}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                selectedLocations.length === 0 ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
              )}
            >
              <span>Semua Lokasi</span>
              {selectedLocations.length === 0 ? <Check className="size-3.5" /> : null}
            </button>
            {filteredLocations.map((loc) => {
              const isSelected = selectedLocations.includes(loc)
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggleLocation(loc)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
                  )}
                >
                  <span className="truncate">{loc}</span>
                  {isSelected ? <Check className="size-3.5" /> : null}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

