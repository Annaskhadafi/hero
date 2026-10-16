'use client'

import * as React from 'react'
import {
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type HeroKpiTone =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'cyan'
  | 'slate'

export type HeroKpiVariant = 'colorful' | 'glass' | 'outline' | 'solid'

export interface HeroKpiCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  watermarkIcon?: React.ReactNode
  tone?: HeroKpiTone
  variant?: HeroKpiVariant
  trend?: {
    value: string | number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  description?: string
  badge?: string
  className?: string
  onClick?: () => void
}

const toneStyles: Record<
  HeroKpiTone,
  {
    colorfulBg: string
    solidBg: string
    outlineBorder: string
    border: string
    iconBg: string
    iconText: string
    iconShadow: string
    watermarkColor: string
    valueColor: string
    titleColor: string
    trendUpColor: string
    trendDownColor: string
    badgeBg: string
  }
> = {
  blue: {
    colorfulBg: 'bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50',
    solidBg: 'bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-700 text-white',
    outlineBorder: 'border-t-4 border-t-blue-500',
    border: 'border-blue-100 hover:border-blue-300',
    iconBg: 'bg-gradient-to-tr from-blue-600 to-indigo-600',
    iconText: 'text-white',
    iconShadow: 'shadow-md shadow-blue-500/25',
    watermarkColor: 'text-blue-600',
    valueColor: 'text-slate-900',
    titleColor: 'text-blue-900/75',
    trendUpColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    trendDownColor: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  emerald: {
    colorfulBg: 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50',
    solidBg: 'bg-gradient-to-tr from-emerald-600 via-emerald-700 to-teal-700 text-white',
    outlineBorder: 'border-t-4 border-t-emerald-500',
    border: 'border-emerald-100 hover:border-emerald-300',
    iconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-600',
    iconText: 'text-white',
    iconShadow: 'shadow-md shadow-emerald-500/25',
    watermarkColor: 'text-emerald-600',
    valueColor: 'text-emerald-950',
    titleColor: 'text-emerald-900/80',
    trendUpColor: 'text-emerald-700 bg-emerald-100/70 border-emerald-300',
    trendDownColor: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  amber: {
    colorfulBg: 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50',
    solidBg: 'bg-gradient-to-tr from-amber-500 via-amber-600 to-orange-600 text-white',
    outlineBorder: 'border-t-4 border-t-amber-500',
    border: 'border-amber-100 hover:border-amber-300',
    iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-500',
    iconText: 'text-white',
    iconShadow: 'shadow-md shadow-amber-500/25',
    watermarkColor: 'text-amber-600',
    valueColor: 'text-amber-950',
    titleColor: 'text-amber-900/80',
    trendUpColor: 'text-amber-700 bg-amber-100/70 border-amber-300',
    trendDownColor: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  rose: {
    colorfulBg: 'bg-gradient-to-br from-rose-50/80 via-white to-pink-50/50',
    solidBg: 'bg-gradient-to-tr from-rose-600 via-rose-700 to-red-700 text-white',
    outlineBorder: 'border-t-4 border-t-rose-500',
    border: 'border-rose-100 hover:border-rose-300',
    iconBg: 'bg-gradient-to-tr from-rose-500 to-red-600',
    iconText: 'text-white',
    iconShadow: 'shadow-md shadow-rose-500/25',
    watermarkColor: 'text-rose-600',
    valueColor: 'text-rose-950',
    titleColor: 'text-rose-900/80',
    trendUpColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    trendDownColor: 'text-rose-700 bg-rose-100/70 border-rose-300',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  purple: {
    colorfulBg: 'bg-gradient-to-br from-purple-50/80 via-white to-fuchsia-50/50',
    solidBg: 'bg-gradient-to-tr from-purple-600 via-purple-700 to-indigo-700 text-white',
    outlineBorder: 'border-t-4 border-t-purple-500',
    border: 'border-purple-100 hover:border-purple-300',
    iconBg: 'bg-gradient-to-tr from-purple-600 to-indigo-600',
    iconText: 'text-white',
    iconShadow: 'shadow-md shadow-purple-500/25',
    watermarkColor: 'text-purple-600',
    valueColor: 'text-purple-950',
    titleColor: 'text-purple-900/80',
    trendUpColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    trendDownColor: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  cyan: {
    colorfulBg: 'bg-gradient-to-br from-cyan-50/80 via-white to-sky-50/50',
    solidBg: 'bg-gradient-to-tr from-cyan-600 via-cyan-700 to-blue-700 text-white',
    outlineBorder: 'border-t-4 border-t-cyan-500',
    border: 'border-cyan-100 hover:border-cyan-300',
    iconBg: 'bg-gradient-to-tr from-cyan-500 to-blue-600',
    iconText: 'text-white',
    iconShadow: 'shadow-md shadow-cyan-500/25',
    watermarkColor: 'text-cyan-600',
    valueColor: 'text-cyan-950',
    titleColor: 'text-cyan-900/80',
    trendUpColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    trendDownColor: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  slate: {
    colorfulBg: 'bg-gradient-to-br from-slate-50 via-white to-slate-100/50',
    solidBg: 'bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-900 text-white',
    outlineBorder: 'border-t-4 border-t-slate-500',
    border: 'border-slate-200 hover:border-slate-300',
    iconBg: 'bg-gradient-to-tr from-slate-600 to-slate-800',
    iconText: 'text-white',
    iconShadow: 'shadow-md shadow-slate-500/20',
    watermarkColor: 'text-slate-500',
    valueColor: 'text-slate-900',
    titleColor: 'text-slate-600',
    trendUpColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    trendDownColor: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
  },
}

export function HeroKpiCard({
  title,
  value,
  unit,
  icon,
  watermarkIcon,
  tone = 'blue',
  variant = 'colorful',
  trend,
  description,
  badge,
  className,
  onClick,
}: HeroKpiCardProps) {
  const isClickable = Boolean(onClick)
  const styles = toneStyles[tone] || toneStyles.blue

  const isSolid = variant === 'solid'
  const isOutline = variant === 'outline'

  const cardBackground = isSolid
    ? styles.solidBg
    : variant === 'glass'
    ? 'bg-white/80 backdrop-blur-md'
    : styles.colorfulBg

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-4 shadow-xs transition-all duration-300',
        cardBackground,
        isOutline ? styles.outlineBorder : styles.border,
        isClickable &&
          'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-opacity-100',
        className
      )}
    >
      {/* Decorative Watermark Icon in background */}
      {(watermarkIcon || icon) && (
        <div
          className={cn(
            'pointer-events-none absolute -right-3 -bottom-3 size-24 opacity-[0.07] transition-transform duration-300 group-hover:scale-110 group-hover:opacity-[0.11] [&_svg]:size-full',
            isSolid ? 'text-white' : styles.watermarkColor
          )}
        >
          {watermarkIcon || icon}
        </div>
      )}

      <CardContent className="relative z-10 p-0 flex flex-col justify-between h-full space-y-3">
        {/* Top Row: Title + Icon Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider block truncate',
                isSolid ? 'text-white/80' : styles.titleColor
              )}
            >
              {title}
            </span>

            {badge && (
              <span
                className={cn(
                  'inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border',
                  isSolid ? 'bg-white/20 text-white border-white/30' : styles.badgeBg
                )}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Prominent Colored Icon Badge */}
          {icon && (
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 [&_svg]:size-5.5',
                isSolid
                  ? 'bg-white/20 text-white backdrop-blur-xs border border-white/30 shadow-xs'
                  : cn(styles.iconBg, styles.iconText, styles.iconShadow)
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Center: Large Formatted Metric Value */}
        <div className="flex items-baseline gap-1.5 pt-0.5">
          <span
            className={cn(
              'font-display text-2xl sm:text-[1.75rem] font-extrabold tracking-tight leading-none',
              isSolid ? 'text-white' : styles.valueColor
            )}
          >
            {value}
          </span>
          {unit && (
            <span
              className={cn(
                'text-xs font-semibold',
                isSolid ? 'text-white/70' : 'text-slate-400'
              )}
            >
              {unit}
            </span>
          )}
        </div>

        {/* Bottom Row: Trend Pill or Contextual Description */}
        {(trend || description) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-black/[0.04]">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold border text-[10px]',
                  isSolid
                    ? 'bg-white/20 text-white border-white/20'
                    : trend.direction === 'up'
                    ? styles.trendUpColor
                    : trend.direction === 'down'
                    ? styles.trendDownColor
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                {trend.direction === 'up' && <TrendingUp className="size-3" />}
                {trend.direction === 'down' && <TrendingDown className="size-3" />}
                <span>{trend.value}</span>
              </span>
            )}

            {description && (
              <span
                className={cn(
                  'truncate font-medium text-[11px]',
                  isSolid ? 'text-white/75' : 'text-slate-500'
                )}
              >
                {trend?.label || description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
