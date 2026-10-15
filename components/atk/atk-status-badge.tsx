'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, PackageCheck, CheckCheck, XCircle } from 'lucide-react'

export type AtkStatus =
  | 'pending_approval'
  | 'approved'
  | 'ready_for_pickup'
  | 'completed'
  | 'rejected'

export const atkStatusConfig: Record<
  AtkStatus,
  {
    label: string
    color: string
    bgColor: string
    borderColor: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  pending_approval: {
    label: 'Menunggu Review',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  approved: {
    label: 'Disetujui / Disiapkan',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: CheckCircle2,
  },
  ready_for_pickup: {
    label: 'Siap Diambil di GA',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: PackageCheck,
  },
  completed: {
    label: 'Selesai / Diterima',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCheck,
  },
  rejected: {
    label: 'Ditolak',
    color: 'text-rose-700 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800',
    icon: XCircle,
  },
}

export function AtkStatusBadge({
  status,
  className = '',
}: {
  status: string
  className?: string
}) {
  const config = atkStatusConfig[status as AtkStatus] || {
    label: status,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-700',
    icon: Clock,
  }

  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.color} ${config.borderColor} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  )
}
