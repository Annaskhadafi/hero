"use client"

import { useTransition } from "react"
import { updateQuotationStatus } from "@/app/actions/service360"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_OPTIONS = ["Draft", "Pending", "Sent", "Approved", "Rejected"]

export function QuotationStatusSelect({ quotationId, initialStatus }: { quotationId: number, initialStatus: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Select 
      defaultValue={initialStatus} 
      disabled={isPending}
      onValueChange={(val) => {
        startTransition(async () => {
          try {
            await updateQuotationStatus(quotationId, val)
            toast.success(`Status updated to ${val}`)
          } catch (error) {
            toast.error("Failed to update status")
          }
        })
      }}
    >
      <SelectTrigger className="w-[120px] h-8 text-xs">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status} className="text-xs">
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
