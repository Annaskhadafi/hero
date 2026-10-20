'use client'

import * as React from 'react'
import { HelpCircle, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ==========================================
// 1. HERO FORM FIELD (WRAPPER)
// ==========================================
export interface HeroFormFieldProps {
  label?: string
  required?: boolean
  tooltip?: string
  helperText?: string
  error?: string
  className?: string
  children: React.ReactNode
}

export function HeroFormField({
  label,
  required,
  tooltip,
  helperText,
  error,
  className,
  children,
}: HeroFormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </Label>

          {tooltip && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <HelpCircle className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {children}

      {error ? (
        <span className="text-[11px] font-medium text-rose-500 animate-in fade-in-50">{error}</span>
      ) : helperText ? (
        <span className="text-[11px] text-slate-400">{helperText}</span>
      ) : null}
    </div>
  )
}

// ==========================================
// 2. HERO INPUT (UNIFIED H-9)
// ==========================================
export interface HeroInputProps extends React.ComponentProps<typeof Input> {
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
  prefixText?: string
  suffixText?: string
  clearable?: boolean
  onClear?: () => void
}

export function HeroInput({
  prefixIcon,
  suffixIcon,
  prefixText,
  suffixText,
  clearable,
  onClear,
  value,
  className,
  ...props
}: HeroInputProps) {
  const hasPrefix = Boolean(prefixIcon || prefixText)
  const hasSuffix = Boolean(suffixIcon || suffixText || (clearable && value))

  return (
    <div className="relative flex items-center w-full">
      {prefixIcon && (
        <div className="pointer-events-none absolute left-3 text-slate-400 [&_svg]:size-4">
          {prefixIcon}
        </div>
      )}

      {prefixText && (
        <span className="pointer-events-none absolute left-3 text-xs font-semibold text-slate-500 select-none">
          {prefixText}
        </span>
      )}

      <Input
        value={value}
        className={cn(
          'h-9 rounded-lg border-border/70 bg-white text-[13px] shadow-xs transition-colors focus-visible:ring-ring/50 placeholder:text-slate-400',
          hasPrefix && (prefixText ? 'pl-9' : 'pl-9.5'),
          hasSuffix && 'pr-9',
          className
        )}
        {...props}
      />

      {clearable && value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600"
        >
          <X className="size-3.5" />
        </button>
      )}

      {!clearable && suffixIcon && (
        <div className="pointer-events-none absolute right-3 text-slate-400 [&_svg]:size-4">
          {suffixIcon}
        </div>
      )}

      {suffixText && (
        <span className="pointer-events-none absolute right-3 text-xs font-semibold text-slate-500 select-none">
          {suffixText}
        </span>
      )}
    </div>
  )
}

// ==========================================
// 3. HERO NUMBER / CURRENCY INPUT (RP)
// ==========================================
export interface HeroNumberInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value?: number | string
  onChange?: (val: number | undefined) => void
  isCurrency?: boolean
  prefix?: string
}

export function HeroNumberInput({
  value,
  onChange,
  isCurrency = true,
  prefix = 'Rp',
  className,
  ...props
}: HeroNumberInputProps) {
  const rawNum = typeof value === 'number' ? value : value ? Number(value) : undefined

  const formatDisplay = (num?: number) => {
    if (num == null || isNaN(num)) return ''
    return num.toLocaleString('id-ID')
  }

  const [displayValue, setDisplayValue] = React.useState(formatDisplay(rawNum))

  React.useEffect(() => {
    setDisplayValue(formatDisplay(rawNum))
  }, [rawNum])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^0-9]/g, '')
    if (!clean) {
      setDisplayValue('')
      onChange?.(undefined)
      return
    }
    const parsed = parseInt(clean, 10)
    setDisplayValue(parsed.toLocaleString('id-ID'))
    onChange?.(parsed)
  }

  return (
    <HeroInput
      value={displayValue}
      onChange={handleChange}
      prefixText={isCurrency ? prefix : undefined}
      className={cn('font-mono font-medium', className)}
      {...props}
    />
  )
}

// ==========================================
// 4. HERO TEXTAREA (CLEAN & AUTO-EXPAND)
// ==========================================
export interface HeroTextareaProps extends React.ComponentProps<typeof Textarea> {
  maxLength?: number
  showCount?: boolean
}

export function HeroTextarea({
  maxLength,
  showCount = false,
  value,
  className,
  ...props
}: HeroTextareaProps) {
  const currentLength = String(value ?? '').length

  return (
    <div className="relative flex flex-col w-full">
      <Textarea
        value={value}
        maxLength={maxLength}
        className={cn(
          'rounded-lg border-border/70 bg-white text-[13px] shadow-xs transition-colors focus-visible:ring-ring/50 placeholder:text-slate-400 resize-none',
          className
        )}
        {...props}
      />

      {showCount && maxLength && (
        <span className="mt-1 text-right text-[10px] text-slate-400">
          {currentLength} / {maxLength}
        </span>
      )}
    </div>
  )
}

// ==========================================
// 5. HERO SWITCH TOGGLE (DESCRIPTIVE)
// ==========================================
export interface HeroSwitchProps {
  label: string
  description?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function HeroSwitch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: HeroSwitchProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border border-border/70 bg-slate-50/60 p-3.5 transition-colors',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <div className="space-y-0.5 pr-4">
        <div className="text-xs font-semibold text-slate-800">{label}</div>
        {description && <div className="text-[11px] text-slate-500">{description}</div>}
      </div>

      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
