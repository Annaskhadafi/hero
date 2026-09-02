'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SearchableSelectOption = {
  value: string
  label: string
}

export function SearchableSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  widthClassName = 'min-w-[220px]',
  allowCustom = false,
  disabled = false,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  widthClassName?: string
  allowCustom?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) return
    setOpen(nextOpen)
    if (nextOpen && allowCustom) {
      setQuery(value || '')
    }
  }

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalized))
  }, [options, query])

  // Compute label for selected value or custom input fallback
  const matchedOption = options.find((option) => option.value === value)
  const defaultPlaceholder = placeholder || `Semua ${label}`
  const selectedLabel = matchedOption ? matchedOption.label : (value ? value : defaultPlaceholder)

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label={label}
          variant="outline"
          disabled={disabled}
          className={cn(
            'border-border/70 text-foreground hover:bg-muted/40 h-9 justify-between rounded-lg border bg-white px-3 text-[13px] font-medium shadow-none',
            disabled && 'opacity-60 cursor-not-allowed bg-slate-100/90 text-slate-500',
            widthClassName
          )}
        >
          <span className="truncate text-left">{selectedLabel}</span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="border-border/80 w-[--radix-popover-trigger-width] min-w-[280px] rounded-xl border bg-white p-2 shadow-lg z-50"
      >
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => {
              const val = event.target.value
              setQuery(val)
              if (allowCustom) {
                onValueChange(val)
              }
            }}
            placeholder={allowCustom ? `Ketik custom ${label.toLowerCase()} atau pilih preset...` : `Cari ${label.toLowerCase()}...`}
            className="border-border/70 bg-muted/30 h-9 rounded-lg pl-9 pr-8 shadow-none text-xs"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                if (allowCustom) {
                  onValueChange('')
                }
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="border-border/60 mt-2 max-h-64 overflow-auto rounded-lg border bg-white p-1 space-y-0.5">
          <button
            type="button"
            className="text-foreground hover:bg-muted/50 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm"
            onClick={() => {
              onValueChange('')
              setOpen(false)
              setQuery('')
            }}
          >
            <span>{placeholder ?? `Semua ${label}`}</span>
            {value ? <X className="text-muted-foreground size-4" /> : null}
          </button>

          {filteredOptions.map((option, idx) => {
            const isSelected = option.value === value
            return (
              <button
                key={`${option.value}-${idx}`}
                type="button"
                className="text-foreground hover:bg-muted/50 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm"
                onClick={() => {
                  onValueChange(option.value)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span
                  className={cn(
                    'border-border/80 grid size-4 place-items-center rounded border bg-white shrink-0',
                    isSelected && 'border-primary bg-primary text-primary-foreground'
                  )}
                >
                  {isSelected ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
