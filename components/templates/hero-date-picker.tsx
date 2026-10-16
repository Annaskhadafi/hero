'use client'

import * as React from 'react'
import { endOfDay, format, startOfDay, subDays } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ==========================================
// 1. HERO SINGLE DATE PICKER (H-9)
// ==========================================
export interface HeroDatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
}

export function HeroDatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
  disabled = false,
  className,
  clearable = true,
}: HeroDatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  const formattedDate = selectedDate
    ? format(selectedDate, 'dd MMM yyyy', { locale: localeId })
    : null

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-between rounded-lg border border-border/70 bg-white px-3 text-[13px] font-normal shadow-xs hover:bg-slate-50',
            !selectedDate && 'text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-60 bg-slate-100',
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon className="size-4 text-slate-400 shrink-0" />
            <span className="truncate">{formattedDate || placeholder}</span>
          </div>

          {clearable && selectedDate && !disabled && (
            <X
              className="size-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-2 shadow-lg z-50 rounded-xl border border-border/80 bg-white">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          locale={localeId}
        />
      </PopoverContent>
    </Popover>
  )
}

// ==========================================
// 2. HERO DATE RANGE PICKER (H-9 WITH PRESETS)
// ==========================================
export interface HeroDateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: 'start' | 'center' | 'end'
}

export function HeroDateRangePicker({
  value,
  onChange,
  placeholder = 'Rentang Tanggal',
  disabled = false,
  className,
  align = 'start',
}: HeroDateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const label = value?.from
    ? value.to
      ? `${format(value.from, 'dd MMM yyyy', { locale: localeId })} - ${format(
          value.to,
          'dd MMM yyyy',
          { locale: localeId }
        )}`
      : format(value.from, 'dd MMM yyyy', { locale: localeId })
    : placeholder

  const isSelected = Boolean(value?.from)

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 justify-start gap-2 rounded-lg border border-border/70 bg-white px-3 text-[13px] font-medium shadow-xs hover:bg-slate-50 min-w-[210px]',
            isSelected && 'border-blue-400 bg-blue-50/40 text-blue-900',
            disabled && 'cursor-not-allowed opacity-60 bg-slate-100',
            className
          )}
        >
          <CalendarIcon className="size-4 text-slate-400 shrink-0" />
          <span className="truncate">{label}</span>
          {isSelected && (
            <X
              className="ml-auto size-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(undefined)
              }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align={align} className="w-auto p-3 shadow-lg z-50 rounded-xl border border-border/80 bg-white">
        {/* Quick Presets */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b pb-2.5">
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={() => {
              onChange?.({ from: startOfDay(new Date()), to: endOfDay(new Date()) })
            }}
            className="h-7 px-2.5 text-xs text-slate-700"
          >
            Hari Ini
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={() => {
              onChange?.({ from: subDays(new Date(), 6), to: new Date() })
            }}
            className="h-7 px-2.5 text-xs text-slate-700"
          >
            7 Hari
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={() => {
              onChange?.({ from: subDays(new Date(), 29), to: new Date() })
            }}
            className="h-7 px-2.5 text-xs text-slate-700"
          >
            30 Hari
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={() => onChange?.(undefined)}
            className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            Reset
          </Button>
        </div>

        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          locale={localeId}
        />
      </PopoverContent>
    </Popover>
  )
}
