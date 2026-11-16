"use client"

import * as React from "react"
import Link from "next/link"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HiradcDesignOneReport } from "./hiradc-design-one-report"
import type { HiradcEntryReportData } from "@/lib/hiradc/queries"

interface HiradcEntry {
  id: number
  activityName: string
  location: string
  department: string
  hazardCategory: string
  hazardDetails: string | null
  riskConsequence: string
  likelihoodBefore: string
  severityBefore: number | null
  scoreBefore: number | null
  riskLevelBefore: string
  existingControl: string
  legalReference?: string | null
  likelihoodAfter: string
  severityAfter: number | null
  scoreAfter: number | null
  riskLevelAfter: string
  additionalControl?: string | null
  register?: {
    id: number
    documentNo: string
    title: string
    revision: string
    status: string
    preparedBy: string
    effectiveDate: Date | null
  } | null
}

interface HiradcDetailDialogProps {
  entry: HiradcEntry
  children: React.ReactNode
}

export function HiradcDetailDialog({ entry, children }: HiradcDetailDialogProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden bg-slate-100 border-slate-200">
        <DialogHeader className="p-4 sm:p-6 bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 p-2 rounded-lg">📄</span>
                HIRADC (Design 1)
              </DialogTitle>
              <p className="text-sm text-slate-500 font-medium tracking-wider mt-1">STANDARD ATTACHMENT</p>
            </div>
            <Button asChild className="bg-[#1a2332] hover:bg-[#1a2332]/90 text-white rounded-lg px-6 no-print">
              <Link href={`/print/hiradc-entry/${entry.id}?print=1`} target="_blank" rel="noreferrer">
                <Printer className="w-4 h-4 mr-2" />
                Cetak / Simpan PDF
              </Link>
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-85px)] bg-slate-100 p-4 sm:p-6">
          <div className="max-w-[210mm] mx-auto">
            <HiradcDesignOneReport entry={entry as unknown as HiradcEntryReportData} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
