'use client'

import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  FileText,
  HelpCircle,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ==========================================
// 1. HERO FORM DIALOG (MODAL FORM TEMPLATE)
// ==========================================
export interface HeroFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: (e: React.FormEvent) => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function HeroFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Simpan Data',
  cancelLabel = 'Batal',
  isSubmitting = false,
  maxWidth = 'md',
}: HeroFormDialogProps) {
  const maxClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth]

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('p-6 overflow-hidden flex flex-col max-h-[90vh]', maxClass)}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base font-bold text-slate-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-slate-500">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[68vh] flex-1 space-y-4 overflow-y-auto py-3 pr-2">
            {children}
          </div>

          <DialogFooter className="mt-4 shrink-0 gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="dense"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="h-9 px-4 font-medium"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant="default"
              size="dense"
              disabled={isSubmitting}
              className="h-9 px-5 font-semibold"
            >
              {isSubmitting ? 'Memproses...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// 2. HERO CONFIRM DIALOG (ALERT / DELETE / APPROVE)
// ==========================================
export type HeroConfirmTone = 'destructive' | 'warning' | 'primary' | 'success'

export interface HeroConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: HeroConfirmTone
  isProcessing?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export function HeroConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'destructive',
  isProcessing = false,
  onConfirm,
  onCancel,
}: HeroConfirmDialogProps) {
  const icon = {
    destructive: <AlertCircle className="size-5 text-rose-600" />,
    warning: <AlertTriangle className="size-5 text-amber-600" />,
    primary: <HelpCircle className="size-5 text-blue-600" />,
    success: <CheckCircle2 className="size-5 text-emerald-600" />,
  }[tone]

  const buttonVariant = tone === 'destructive' ? 'destructive' : 'default'

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            {icon}
            <DialogTitle className="text-base font-bold text-slate-900">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-1.5 text-xs text-slate-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            size="dense"
            disabled={isProcessing}
            onClick={handleCancel}
            className="h-9 px-4 font-medium"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            size="dense"
            disabled={isProcessing}
            onClick={onConfirm}
            className="h-9 px-4 font-semibold"
          >
            {isProcessing ? 'Memproses...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// 3. HERO DETAIL MODAL (OFFICIAL DOCUMENT-STYLE)
// ==========================================
export interface HeroDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  statusBadge?: React.ReactNode
  onEdit?: () => void
  children: React.ReactNode
  actions?: React.ReactNode
}

export function HeroDetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  statusBadge,
  onEdit,
  children,
  actions,
}: HeroDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-6 sm:max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="border-b pb-4 shrink-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
                {statusBadge}
              </div>
              {subtitle && (
                <DialogDescription className="text-xs text-slate-500 font-mono">
                  {subtitle}
                </DialogDescription>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="dense"
                  onClick={onEdit}
                  className="h-9 gap-1.5 font-medium"
                >
                  <Edit2 className="size-3.5 text-blue-600" />
                  <span>Ubah Data</span>
                </Button>
              )}
              {actions}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-1">
          {children}
        </div>

        <DialogFooter className="border-t pt-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
