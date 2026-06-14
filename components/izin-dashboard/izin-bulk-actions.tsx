"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, X, Loader2 } from "lucide-react"
import { bulkDeleteAttendancePermissionRequests } from "@/app/actions/attendance"

export function IzinBulkDeleteBar({
  selectedIds,
  onClear,
}: {
  selectedIds: number[]
  onClear: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!selectedIds.length) return null

  const handleDelete = () => {
    if (!confirm(`Hapus ${selectedIds.length} data izin?`)) return
    startTransition(async () => {
      const result = await bulkDeleteAttendancePermissionRequests(selectedIds)
      if (result.success) {
        onClear()
        router.refresh()
      } else {
        alert(result.error || "Gagal menghapus data.")
      }
    })
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-container-lowest px-5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Trash2 className="size-3.5" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} dipilih
          </span>
        </div>
        <div className="h-5 w-px bg-border" />
        <Button
          size="sm"
          variant="destructive"
          className="h-8 gap-1.5"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Hapus
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={onClear}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function BulkCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 rounded border-border accent-primary cursor-pointer"
    />
  )
}
