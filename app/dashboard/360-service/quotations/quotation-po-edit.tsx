"use client"

import { useRef, useState, useTransition } from "react"
import { updateQuotationPoNumber } from "@/app/actions/service360"
import { toast } from "sonner"

export function QuotationPoEdit({ quotationId, value }: { quotationId: number; value: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const save = () => {
    const trimmed = editValue.trim()
    if (trimmed === value.trim()) { setIsEditing(false); return }
    startTransition(async () => {
      try {
        await updateQuotationPoNumber(quotationId, trimmed)
        toast.success("PO Customer updated")
      } catch { toast.error("Failed to update PO") }
    })
    setIsEditing(false)
  }

  if (isEditing)
    return (
      <input
        ref={inputRef}
        className="border-input bg-background h-7 w-32 rounded border px-1.5 text-xs"
        value={editValue}
        disabled={isPending}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditValue(value); setIsEditing(false) } }}
        autoFocus
      />
    )

  return (
    <span
      className="cursor-pointer rounded px-1 text-xs hover:bg-muted"
      title="Click to edit"
      onClick={() => { setEditValue(value); setIsEditing(true) }}
    >
      {value || '-'}
    </span>
  )
}
