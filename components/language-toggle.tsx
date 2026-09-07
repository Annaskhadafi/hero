'use client'

import * as React from 'react'
import { Languages, Check, Globe } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useTheme } from '@/components/theme-provider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LanguageToggle({
  className,
  variant = 'desktop',
}: {
  className?: string
  variant?: 'desktop' | 'mobile-header' | 'mobile-drawer'
}) {
  const { language, setLanguage, t, isIndonesian } = useLanguage()
  const { resolvedTheme } = useTheme()
  const [open, setOpen] = React.useState(false)

  const isDark = resolvedTheme === 'dark'
  const glassButtonClassName = isDark
    ? 'bg-slate-900 text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-slate-800 hover:text-white'
    : 'bg-white text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)] hover:bg-slate-100 hover:text-slate-900'

  if (variant === 'mobile-drawer') {
    return (
      <div className={cn('flex items-center gap-1.5 rounded-xl bg-white/70 p-1 border border-[#003461]/10 shadow-xs', className)}>
        <button
          type="button"
          onClick={() => setLanguage('id')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition active:scale-[0.98]',
            isIndonesian
              ? 'bg-[#003f78] text-white shadow-xs'
              : 'text-[#486275] hover:bg-black/5'
          )}
        >
          <span className="text-sm">🇮🇩</span>
          <span>Indonesia</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition active:scale-[0.98]',
            !isIndonesian
              ? 'bg-[#003f78] text-white shadow-xs'
              : 'text-[#486275] hover:bg-black/5'
          )}
        >
          <span className="text-sm">🇬🇧</span>
          <span>English</span>
        </button>
      </div>
    )
  }

  if (variant === 'mobile-header') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pilih Bahasa / Select Language"
            className={cn(
              'flex h-8 items-center gap-1 rounded-full bg-white px-2 text-[11px] font-black text-[#004b87] border border-[#004b87]/15 shadow-2xs transition active:scale-[0.96] active:bg-[#e6f2fb]',
              className
            )}
          >
            <span className="text-xs">{isIndonesian ? '🇮🇩' : '🇬🇧'}</span>
            <span className="uppercase tracking-wider">{isIndonesian ? 'ID' : 'EN'}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-48 rounded-2xl border border-border/80 bg-white p-1.5 shadow-xl"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isIndonesian ? 'Pilih Bahasa' : 'Select Language'}
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setLanguage('id')
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition',
                isIndonesian
                  ? 'bg-blue-50 text-[#003f78] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🇮🇩</span>
                <span>Bahasa Indonesia</span>
              </div>
              {isIndonesian && <Check className="size-3.5 text-[#003f78]" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('en')
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition',
                !isIndonesian
                  ? 'bg-blue-50 text-[#003f78] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🇬🇧</span>
                <span>English</span>
              </div>
              {!isIndonesian && <Check className="size-3.5 text-[#003f78]" />}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={isIndonesian ? 'Ganti Bahasa (Indonesia / English)' : 'Change Language (Indonesian / English)'}
          aria-label={isIndonesian ? 'Ganti Bahasa' : 'Change Language'}
          className={cn(
            'size-9 min-h-9 min-w-9 rounded-xl transition sm:size-11 sm:min-h-11 sm:min-w-11 sm:rounded-2xl',
            glassButtonClassName,
            className
          )}
        >
          <div className="flex items-center justify-center gap-0.5 text-xs font-bold">
            <span className="text-sm leading-none">{isIndonesian ? '🇮🇩' : '🇬🇧'}</span>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight ml-0.5">
              {isIndonesian ? 'ID' : 'EN'}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          'w-52 rounded-2xl p-2 shadow-xl backdrop-blur-xl transition',
          isDark
            ? 'border-white/10 bg-slate-950/95 text-slate-100'
            : 'border-border/80 bg-white/95 text-slate-900'
        )}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Globe className="size-3" />
          <span>{isIndonesian ? 'Bahasa / Language' : 'Language / Bahasa'}</span>
        </div>
        <div className="mt-1 space-y-1">
          <button
            type="button"
            onClick={() => {
              setLanguage('id')
              setOpen(false)
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition',
              isIndonesian
                ? isDark
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-blue-50 text-[#003461] font-bold'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-900'
                  : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🇮🇩</span>
              <div className="text-left">
                <p className="font-bold leading-tight">Bahasa Indonesia</p>
                <p className="text-[10px] opacity-70">Indonesian</p>
              </div>
            </div>
            {isIndonesian && <Check className="size-4 text-sky-500" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage('en')
              setOpen(false)
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition',
              !isIndonesian
                ? isDark
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-blue-50 text-[#003461] font-bold'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-900'
                  : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🇬🇧</span>
              <div className="text-left">
                <p className="font-bold leading-tight">English</p>
                <p className="text-[10px] opacity-70">Inggris</p>
              </div>
            </div>
            {!isIndonesian && <Check className="size-4 text-sky-500" />}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
