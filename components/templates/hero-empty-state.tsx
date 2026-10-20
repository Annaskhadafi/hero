'use client'

import * as React from 'react'
import { Inbox } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface HeroEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function HeroEmptyState({
  icon = <Inbox className="size-8 text-slate-400" />,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: HeroEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition-all',
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200 text-slate-600 mb-3">
        {icon}
      </div>

      <h3 className="text-sm font-bold text-slate-900">{title}</h3>

      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={onSecondaryAction}
              className="h-9 px-4 font-medium"
            >
              {secondaryActionLabel}
            </Button>
          )}

          {actionLabel && onAction && (
            <Button
              type="button"
              variant="default"
              size="dense"
              onClick={onAction}
              className="h-9 px-4 font-semibold"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
