'use client'

// MultiSelectFilterDropdown component for multi-value filtering
import * as React from 'react'
import { Check, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type MultiSelectOption = string | { value: string; label?: string }

export interface MultiSelectFilterDropdownProps {
  title?: string
  options?: MultiSelectOption[]
  selected?: string[]
  selectedValues?: string[]
  onChange?: (selected: string[]) => void
  onSelectionChange?: (selected: string[]) => void
  placeholder?: string
  label?: string
  className?: string
}

export function MultiSelectFilterDropdown({
  options = [],
  selected,
  selectedValues,
  onChange,
  onSelectionChange,
  placeholder,
  title,
  label,
  className,
}: MultiSelectFilterDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const activeSelected = React.useMemo(() => {
    return Array.isArray(selected) ? selected : Array.isArray(selectedValues) ? selectedValues : []
  }, [selected, selectedValues])

  const activeOnChange = React.useMemo(() => {
    return onChange || onSelectionChange || (() => {})
  }, [onChange, onSelectionChange])

  const activePlaceholder = placeholder || title || 'Pilih...'
  const activeLabel = label || title || 'Item'

  const normalizedOptions = React.useMemo(() => {
    return (options || []).map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt }
      }
      if (opt && typeof opt === 'object') {
        return {
          value: String(opt.value ?? ''),
          label: String(opt.label ?? opt.value ?? ''),
        }
      }
      return { value: String(opt ?? ''), label: String(opt ?? '') }
    })
  }, [options])

  const filteredOptions = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return normalizedOptions
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
    )
  }, [normalizedOptions, searchQuery])

  const selectedLabels = React.useMemo(() => {
    return activeSelected.map((val) => {
      const found = normalizedOptions.find((opt) => opt.value === val)
      return found ? found.label : val
    })
  }, [activeSelected, normalizedOptions])

  const displayText =
    activeSelected.length === 0
      ? activePlaceholder
      : activeSelected.length === 1
        ? selectedLabels[0]
        : `${activeSelected.length} ${activeLabel}`

  const isSelected = activeSelected.length > 0

  function toggleOption(optionValue: string) {
    if (activeSelected.includes(optionValue)) {
      activeOnChange(activeSelected.filter((item) => item !== optionValue))
      return
    }
    activeOnChange([...activeSelected, optionValue])
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    activeOnChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 min-w-[140px] max-w-[200px] justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium shadow-sm hover:bg-slate-50 transition-colors',
            isSelected && 'border-indigo-300 bg-indigo-50/50 text-indigo-900 font-semibold',
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <div className="flex items-center gap-1 ml-1.5 shrink-0">
            {isSelected ? (
              <span
                onClick={clearAll}
                className="rounded-full p-0.5 hover:bg-indigo-200/60 text-indigo-700 cursor-pointer"
                title="Hapus filter ini"
              >
                <X className="size-3" />
              </span>
            ) : (
              <Filter className="size-3 opacity-40 text-slate-500" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 shadow-lg rounded-xl" align="start">
        <Command>
          <CommandInput
            placeholder={`Cari ${activeLabel.toLowerCase()}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9 text-xs"
          />
          <CommandList className="max-h-[220px] p-1">
            <CommandEmpty className="py-4 text-center text-xs text-slate-400">
              Tidak ada {activeLabel.toLowerCase()}.
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => {
                const checked = activeSelected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
                  >
                    <Checkbox checked={checked} className="rounded" />
                    <span className="flex-1 truncate">{option.label}</span>
                    {checked && <Check className="size-3.5 text-indigo-600 ml-auto" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {activeSelected.length > 0 && (
            <div className="p-1.5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 font-medium pl-1.5">
                {activeSelected.length} dipilih
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => activeOnChange([])}
                className="h-6 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
              >
                Reset
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
