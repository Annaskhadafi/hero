"use client"

import * as React from "react"
import { Eye, FilePenLine, MoreHorizontal, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type TableRbacAccess = {
  canView?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canSelectAll?: boolean
}

export type EnterpriseScorecardItem = {
  label: string
  value: React.ReactNode
  description?: string
  icon?: React.ReactNode
  tone?: "default" | "success" | "warning" | "danger" | "info"
}

export type EnterpriseColumnOption = {
  key: string
  label: string
  defaultVisible?: boolean
  required?: boolean
}

const scorecardToneClassName: Record<NonNullable<EnterpriseScorecardItem["tone"]>, string> = {
  default: "bg-white text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_12px_28px_rgba(0,52,97,0.06)]",
  success: "bg-emerald-50 text-emerald-950 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.16),0_12px_28px_rgba(5,150,105,0.08)]",
  warning: "bg-amber-50 text-amber-950 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.16),0_12px_28px_rgba(217,119,6,0.08)]",
  danger: "bg-rose-50 text-rose-950 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.16),0_12px_28px_rgba(225,29,72,0.08)]",
  info: "bg-sky-50 text-sky-950 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.16),0_12px_28px_rgba(2,132,199,0.08)]",
}

export function EnterpriseScorecards({
  items,
  className,
}: {
  items: EnterpriseScorecardItem[]
  className?: string
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-[1.1rem] p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
            scorecardToneClassName[item.tone ?? "default"],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
              <div className="font-display text-2xl font-semibold tabular-nums tracking-tight">{item.value}</div>
            </div>
            {item.icon ? (
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/70 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                {item.icon}
              </span>
            ) : null}
          </div>
          {item.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
        </div>
      ))}
    </div>
  )
}

export function EnterpriseColumnVisibility({
  columns,
  tableRoot,
  onVisibleKeysChange,
}: {
  columns: EnterpriseColumnOption[]
  tableRoot?: React.RefObject<HTMLElement | null>
  onVisibleKeysChange?: (keys: string[]) => void
}) {
  const [visibleKeys, setVisibleKeys] = React.useState(() =>
    columns.filter((column) => column.defaultVisible !== false).map((column) => column.key),
  )

  React.useEffect(() => {
    const root = tableRoot?.current
    if (!root) {
      onVisibleKeysChange?.(visibleKeys)
      return
    }

    columns.forEach((column, index) => {
      const isVisible = visibleKeys.includes(column.key)
      root.querySelectorAll<HTMLElement>(`thead tr > *:nth-child(${index + 1}), tbody tr > *:nth-child(${index + 1})`).forEach((cell) => {
        cell.toggleAttribute("hidden", !isVisible)
      })
    })
    onVisibleKeysChange?.(visibleKeys)
  }, [columns, onVisibleKeysChange, tableRoot, visibleKeys])

  if (columns.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="dense">
          <MoreHorizontal className="size-4" />
          Kolom
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-xl">
        <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visibleKeys.includes(column.key)}
            disabled={column.required}
            onCheckedChange={(checked) => {
              setVisibleKeys((current) => {
                if (checked) {
                  return Array.from(new Set([...current, column.key]))
                }
                return current.filter((key) => key !== column.key)
              })
            }}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function EnterpriseActionButtons({
  access,
  onView,
  onEdit,
  onDelete,
  labels = {},
}: {
  access?: TableRbacAccess
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  labels?: { view?: string; edit?: string; delete?: string }
}) {
  const canView = access?.canView ?? true
  const canEdit = access?.canEdit ?? false
  const canDelete = access?.canDelete ?? false

  return (
    <div className="flex min-w-max items-center justify-end gap-1.5">
      {onView ? (
        <Button type="button" variant="ghost" size="denseIcon" onClick={onView} disabled={!canView} aria-label={labels.view ?? "View detail"}>
          <Eye className="size-4" />
        </Button>
      ) : null}
      {onEdit ? (
        <Button type="button" variant="ghost" size="denseIcon" onClick={onEdit} disabled={!canEdit} aria-label={labels.edit ?? "Edit data"}>
          <FilePenLine className="size-4" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button type="button" variant="ghost" size="denseIcon" onClick={onDelete} disabled={!canDelete} aria-label={labels.delete ?? "Delete data"}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ) : null}
    </div>
  )
}

export function EnterpriseRecordDialog({
  trigger,
  title,
  description,
  mode = "view",
  children,
  footer,
  access,
}: {
  trigger: React.ReactNode
  title: string
  description?: string
  mode?: "view" | "edit" | "delete" | "form"
  children: React.ReactNode
  footer?: React.ReactNode
  access?: TableRbacAccess
}) {
  const allowed = mode === "delete" ? (access?.canDelete ?? true) : mode === "edit" || mode === "form" ? (access?.canEdit ?? true) : (access?.canView ?? true)

  return (
    <Dialog>
      <DialogTrigger asChild disabled={!allowed}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="grid max-h-[calc(100vh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b border-border/70 bg-surface-container-low px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-wrap-balance">{title}</DialogTitle>
            <Badge variant="outline" className="rounded-full border-0 bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]">
              {mode}
            </Badge>
          </div>
          {description ? <DialogDescription className="text-wrap-pretty leading-6">{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="max-h-[min(68vh,620px)] overflow-y-auto px-5 py-4">
          <div className="grid gap-4 rounded-[1rem] bg-white">{children}</div>
        </div>
        {footer ? <DialogFooter className="border-t border-border/70 bg-surface-container-low p-4">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}

export function EnterpriseFormGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("grid gap-4 md:grid-cols-2 [&>*]:min-w-0", className)}>{children}</div>
}
