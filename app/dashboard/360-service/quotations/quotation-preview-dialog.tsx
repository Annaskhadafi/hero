"use client"

import * as React from "react"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"

export function QuotationPreviewDialog({ quotationId }: { quotationId: number }) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" className="h-8 w-8" title="Preview">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl max-w-[1200px] w-[95vw] h-[95vh] p-0 overflow-hidden bg-slate-100/50">
        <div className="w-full h-full flex flex-col">
          <div className="bg-white px-4 py-2 flex items-center justify-between border-b shrink-0">
            <DialogTitle className="text-sm font-semibold tracking-tight text-slate-800">Quotation Preview</DialogTitle>
          </div>
          <div className="flex-1 w-full relative">
            {open && (
              <iframe 
                src={`/dashboard/360-service/quotations/${quotationId}`}
                className="w-full h-full border-0 absolute inset-0 rounded-b-lg"
                title="Quotation Preview"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
