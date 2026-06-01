"use client"

import * as React from "react"
import Image from "next/image"
import { Printer, ShieldAlert, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { RiskScoreCell } from "./risk-badge"

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
  likelihoodAfter: string
  severityAfter: number | null
  scoreAfter: number | null
  riskLevelAfter: string
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

  const riskLevel = entry.riskLevelBefore?.toUpperCase() || ""
  const isHighRisk = riskLevel === "HIGH" || riskLevel === "EXTREME"
  const documentNo = entry.register?.documentNo || `HSE/HIRADC/00${entry.id}`
  const dateStr = entry.register?.effectiveDate
    ? new Date(entry.register.effectiveDate).toLocaleDateString("id-ID")
    : new Date().toLocaleDateString("id-ID")
  const picName = entry.register?.preparedBy || "PIC / Auditor"

  const handlePrint = () => {
    // Navigate to the printable report view
    if (entry.register) {
      window.open(`/dashboard/hse/hiradc/report/${entry.register.id}`, "_blank")
    } else {
      window.print() // Fallback if no register attached
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="bg-slate-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 p-2 rounded-lg">📄</span>
                HIRADC (Design 1)
              </DialogTitle>
              <p className="text-sm text-slate-500 font-medium tracking-wider mt-1">STANDARD ATTACHMENT</p>
            </div>
            <Button onClick={handlePrint} className="bg-[#1a2332] hover:bg-[#1a2332]/90 text-white rounded-lg px-6">
              <Printer className="w-4 h-4 mr-2" />
              Cetak Dokumen
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] bg-slate-50 p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
            {/* Watermark / Stamp */}
            <div className="absolute top-12 right-12 opacity-10 pointer-events-none">
              <ShieldCheck className="w-48 h-48" />
            </div>

            {/* Header Document */}
            <div className="flex items-center gap-6 pb-6 border-b border-slate-200">
              <div className="shrink-0">
                <Image 
                  src="/cp_logo-removebg-preview.png" 
                  alt="PT Chitra Paratama Logo" 
                  width={120} 
                  height={60} 
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">PT. CHITRA PARATAMA</h1>
                <p className="text-blue-700 font-bold text-sm tracking-wide">SAFETY FIRST | COLLABORATE -INNOVATE - DOMINATE</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-1">
                  <span className="font-bold">OFFICIAL HSE SYSTEM</span>
                </div>
              </div>
              <div className="ml-auto">
                <div className="w-16 h-16 border-2 border-slate-800 rounded-full flex items-center justify-center rotate-12">
                  <div className="text-[10px] font-bold text-center leading-tight">VERIFIED<br/>DOCUMENT</div>
                </div>
              </div>
            </div>

            {/* Meta Info Row */}
            <div className="grid grid-cols-6 gap-4 py-6 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NO. DOKUMEN</p>
                <p className="font-bold text-slate-900 text-sm">{documentNo}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CLASSIFICATION</p>
                <p className="font-bold text-slate-900 text-sm">HIRADC REPORT</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">LOCATION / SITE</p>
                <p className="font-bold text-slate-900 text-sm truncate" title={entry.location}>{entry.location || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DATE / PERIOD</p>
                <p className="font-bold text-slate-900 text-sm">{dateStr}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PIC / AUDITOR</p>
                <p className="font-bold text-slate-900 text-sm">{picName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DOC STATUS</p>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase">ACTIVE</Badge>
              </div>
            </div>

            {/* Title Area */}
            <div className="py-8 flex justify-between items-start">
              <div className="max-w-2xl">
                <p className="text-blue-600 font-bold text-sm tracking-widest uppercase mb-2">HAZARD IDENTIFICATION & RISK ASSESSMENT</p>
                <h2 className="text-3xl font-black text-slate-900 leading-tight uppercase mb-4">
                  {entry.activityName}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-slate-900 text-white rounded-md">ID: {entry.id}</Badge>
                  <Badge variant="outline" className="rounded-md bg-slate-50 uppercase">{entry.department || "ACTIVE"}</Badge>
                  <Badge variant="outline" className="rounded-md bg-blue-50 text-blue-700 border-blue-200">
                    <span className="mr-2">📍</span> {entry.location}
                  </Badge>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CURRENT RISK STATUS</p>
                <div className={cn(
                  "px-6 py-4 rounded-xl border-2 shadow-sm text-center",
                  isHighRisk ? "bg-red-50 border-red-200 text-red-700" :
                  riskLevel === "MODERATE" ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                  "bg-green-50 border-green-200 text-green-700"
                )}>
                  <p className="text-2xl font-black leading-none">{riskLevel || "N/A"}</p>
                  <p className="text-xs font-bold mt-1 opacity-80">RISK</p>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column (Hazards & Controls) */}
              <div className="col-span-2 space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-amber-500">⚠️</span>
                    <h3 className="font-bold text-slate-700 tracking-wide uppercase text-sm">HAZARD & CONSEQUENCE</h3>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">HAZARD DETAIL (BAHAYA)</p>
                    <p className="text-slate-900 font-bold uppercase leading-relaxed">
                      {entry.hazardDetails || entry.hazardCategory || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CONSEQUENCE / IMPACT (DAMPAK)</p>
                    <p className="text-slate-600 italic leading-relaxed">
                      "{entry.riskConsequence || "N/A"}"
                    </p>
                  </div>
                </div>

                <div className="border border-blue-100 bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-blue-700 tracking-wide uppercase text-sm">CONTROL MEASURES (PENGENDALIAN RISIKO)</h3>
                  </div>
                  <div className="text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                    {entry.existingControl || "Belum ada tindakan pengendalian."}
                  </div>
                </div>
              </div>

              {/* Right Column (Analysis & Verification) */}
              <div className="space-y-6">
                <div className="border border-slate-200 rounded-2xl p-6 bg-white text-center shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">RISK MATRIX ANALYSIS</p>
                  <div className="text-6xl font-black text-slate-900 tracking-tighter mb-6">
                    {entry.scoreBefore || "-"}
                  </div>
                  <div className="flex items-center justify-center gap-6 border-t border-slate-100 pt-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">LIKELIHOOD</p>
                      <p className="text-xl font-bold text-slate-800">{entry.likelihoodBefore || "-"}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">SEVERITY</p>
                      <p className="text-xl font-bold text-slate-800">{entry.severityBefore || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a2332] rounded-2xl p-6 text-white shadow-lg">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">VERIFICATION INFO</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-slate-400">👤</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">PIC REPORTER</p>
                        <p className="font-bold text-slate-100 text-sm">{picName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-slate-400">📅</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">LAST REVIEW</p>
                        <p className="font-bold text-slate-100 text-sm">{dateStr}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
