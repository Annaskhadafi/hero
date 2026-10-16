'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { AdminStatusBadge } from '@/components/admin-status-badge'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface HeroStatusOption {
  value: string
  label: string
}

export interface HeroStatusBadgeProps {
  status: string
  editable?: boolean
  options?: HeroStatusOption[]
  onChange?: (newStatus: string) => void
  className?: string
}

export function HeroStatusBadge({
  status,
  editable = false,
  options = [],
  onChange,
  className,
}: HeroStatusBadgeProps) {
  const [open, setOpen] = React.useState(false)

  if (!editable || options.length === 0) {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <AdminStatusBadge status={status} />
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex items-center gap-1 rounded-md transition-all hover:ring-2 hover:ring-blue-400/40 focus:outline-hidden',
            className
          )}
        >
          <AdminStatusBadge status={status} />
          <ChevronDown className="size-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="center" className="w-[180px] p-1.5 shadow-lg z-50 rounded-xl border border-border/80 bg-white">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Ubah Status Langsung
        </div>
        <div className="space-y-0.5 mt-1">
          {options.map((opt) => {
            const isSelected = opt.value.toLowerCase() === status.toLowerCase()
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange?.(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors',
                  isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="size-3.5 text-blue-600" />}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
