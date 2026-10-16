'use client'

import * as React from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type HeroSearchableSelectOption = {
  value: string
  label: string
  description?: string
  badge?: string
  badgeColor?: string
}

export interface HeroSearchableSelectProps {
  label?: string
  placeholder?: string
  options: HeroSearchableSelectOption[]
  value?: string | string[]
  onChange?: (value: any) => void
  isMulti?: boolean
  disabled?: boolean
  className?: string
  width?: string
  error?: string
}

export function HeroSearchableSelect({
  label,
  placeholder = 'Pilih opsi...',
  options = [],
  value,
  onChange,
  isMulti = false,
  disabled = false,
  className,
  width = 'w-full',
  error,
}: HeroSearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const activeValues = React.useMemo(() => {
    if (Array.isArray(value)) return value
    if (value) return [value]
    return []
  }, [value])

  const filteredOptions = React.useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return options
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        opt.description?.toLowerCase().includes(q)
    )
  }, [options, query])

  const selectedOptions = React.useMemo(() => {
    return options.filter((opt) => activeValues.includes(opt.value))
  }, [options, activeValues])

  const handleSelect = (val: string) => {
    if (isMulti) {
      const next = activeValues.includes(val)
        ? activeValues.filter((v) => v !== val)
        : [...activeValues, val]
      onChange?.(next)
    } else {
      onChange?.(val === activeValues[0] ? '' : val)
      setOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(isMulti ? [] : '')
  }

  return (
    <div className={cn('relative flex flex-col gap-1.5', width, className)}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          {label}
        </label>
      )}

      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-9 justify-between rounded-lg border border-border/70 bg-white px-3 text-[13px] font-normal shadow-xs transition-colors hover:bg-slate-50',
              open && 'border-blue-500 ring-2 ring-blue-500/20',
              error && 'border-rose-500 ring-2 ring-rose-500/20',
              disabled && 'cursor-not-allowed opacity-60 bg-slate-100',
              'min-w-0 w-full'
            )}
          >
            <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
              {activeValues.length === 0 ? (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              ) : isMulti ? (
                <div className="flex flex-wrap items-center gap-1">
                  {selectedOptions.map((opt) => (
                    <span
                      key={opt.value}
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200"
                    >
                      <span>{opt.label}</span>
                      <X
                        className="size-3 cursor-pointer hover:text-blue-900"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(opt.value)
                        }}
                      />
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium text-slate-800">{selectedOptions[0]?.label ?? activeValues[0]}</span>
                  {selectedOptions[0]?.badge && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.2 text-[10px] font-medium',
                        selectedOptions[0].badgeColor || 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {selectedOptions[0].badge}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="ml-2 flex items-center gap-1 shrink-0">
              {activeValues.length > 0 && !disabled && (
                <X
                  className="text-muted-foreground hover:text-foreground size-3.5 cursor-pointer"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="text-muted-foreground size-4" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] min-w-[260px] p-2 shadow-lg z-50 rounded-xl border border-border/80 bg-white"
        >
          {/* Search box inside dropdown */}
          <div className="relative mb-2">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Cari ${label ? label.toLowerCase() : 'opsi'}...`}
              className="h-8 rounded-lg pl-8 text-xs border-border/70"
            />
          </div>

          {/* Options List */}
          <div className="max-h-[220px] space-y-0.5 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">
                Tidak ada opsi yang cocok.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = activeValues.includes(opt.value)

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors',
                      isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span>{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.2 text-[10px] font-medium',
                              opt.badgeColor || 'bg-slate-100 text-slate-600'
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <span className="text-[11px] text-slate-400">{opt.description}</span>
                      )}
                    </div>

                    {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                  </div>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && <span className="text-[11px] text-rose-500 font-medium">{error}</span>}
    </div>
  )
}
