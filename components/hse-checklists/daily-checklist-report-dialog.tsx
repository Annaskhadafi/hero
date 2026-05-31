'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Download, FileText, Printer } from 'lucide-react'
import html2canvas from 'html2canvas-pro'
import jsPDF from 'jspdf'

import { logDailyChecklistAccess } from '@/app/actions/hse-checklists'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ReportItem = {
  id: number
  orderIndex: number
  prompt: string
  inputType: string
  answer: {
    inputType: string
    valueChoice: string
    valueText: string
    valueNumber: number | null
  } | null
}

export function DailyChecklistReportDialog({
  open,
  onOpenChange,
  report,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: {
    header: {
      id: number
      titleSnapshot: string
      descriptionSnapshot: string
      area: string
      status: string
      scorePercent: number | null
      createdAt: Date
      completedAt: Date | null
      responsibleName: string | null
      responsibleEmail: string | null
      responsibleRole: string | null
    }
    items: ReportItem[]
  } | null
}) {
  const documentRef = React.useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [isPrinting, setIsPrinting] = React.useState(false)

  React.useEffect(() => {
    if (open && report?.header?.id) {
      void logDailyChecklistAccess({ checklistId: report.header.id, event: 'viewed' })
    }
  }, [open, report?.header?.id])

  if (!report) return null

  const renderDocumentCanvas = async () => {
    const element = documentRef.current
    if (!element) return null

    const images = Array.from(element.querySelectorAll('img'))
    await Promise.all(
      images.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true })
              img.addEventListener('error', () => resolve(), { once: true })
            })
      )
    )

    return html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })
  }

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return
    setIsDownloading(true)
    try {
      const canvas = await renderDocumentCanvas()
      if (!canvas) return

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0
      const imgData = canvas.toDataURL('image/png')

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`Checklist_${report.header.id}_${format(new Date(), 'yyyyMMdd')}.pdf`)
      await logDailyChecklistAccess({ checklistId: report.header.id, event: 'pdf_downloaded' })
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = async () => {
    if (!documentRef.current) return
    setIsPrinting(true)
    try {
      const canvas = await renderDocumentCanvas()
      if (!canvas) return

      const imgData = canvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank', 'width=900,height=1200')
      if (!printWindow) {
        alert('Popup diblokir. Izinkan popup untuk mencetak dokumen.')
        return
      }

      printWindow.document
        .write(`<!doctype html><html><head><title>Checklist_${report.header.id}</title>
<style>
  @page { size: A4; margin: 10mm; }
  html, body { margin: 0; padding: 0; }
  img { display: block; width: 100%; height: auto; }
</style>
</head><body><img src="${imgData}" /></body></html>`)
      printWindow.document.close()

      const triggerPrint = async () => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
        await logDailyChecklistAccess({ checklistId: report.header.id, event: 'printed' })
      }

      const img = printWindow.document.querySelector('img')
      if (img && !img.complete) {
        img.addEventListener('load', () => void triggerPrint(), { once: true })
      } else {
        setTimeout(() => void triggerPrint(), 200)
      }
    } finally {
      setIsPrinting(false)
    }
  }

  const header = report.header
  const completedAt = header.completedAt ? new Date(header.completedAt) : null
  const createdAt = new Date(header.createdAt)
  const stampDate = completedAt ?? createdAt

  const formatChoice = (value: string) => {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'yes') return 'YES'
    if (normalized === 'no') return 'NO'
    if (normalized === 'na') return 'N/A'
    return value
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-container-low border-border/70 max-h-[90vh] overflow-y-auto p-0 shadow-xl sm:max-w-5xl">
        <DialogHeader className="sticky top-0 z-50 flex flex-row items-center justify-between border-b bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-low text-primary grid size-10 place-items-center rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-foreground text-base font-semibold tracking-tight sm:text-lg">
                {header.titleSnapshot}
              </DialogTitle>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.08em] uppercase">
                Laporan inspeksi digital
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-2">
            <Button
              size="dense"
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isDownloading || isPrinting}
            >
              <Download className="size-4" />
              {isDownloading ? 'Memproses...' : 'Unduh PDF'}
            </Button>
            <Button size="dense" onClick={handlePrint} disabled={isDownloading || isPrinting}>
              <Printer className="size-4" />
              {isPrinting ? 'Menyiapkan...' : 'Cetak'}
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-8">
          <div
            ref={documentRef}
            className="border-border/70 mx-auto max-w-4xl overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="border-border/70 flex items-start justify-between gap-6 border-b p-6">
              <div className="flex items-center gap-4">
                <img
                  src="/cp_logo-removebg-preview.png"
                  alt="Logo"
                  className="h-12 w-auto object-contain"
                />
                <div className="space-y-1">
                  <div className="text-foreground text-lg font-semibold tracking-tight">
                    PT. CHITRA PARATAMA
                  </div>
                  <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                    OFFICIAL HSE SYSTEM
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                  Score
                </div>
                <div className="text-foreground mt-1 text-3xl font-semibold tabular-nums">
                  {header.scorePercent ?? 0}%
                </div>
              </div>
            </div>

            <div className="border-border/70 bg-surface-container-low grid gap-4 border-b px-6 py-5 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                  Lokasi Pemeriksaan
                </div>
                <div className="text-foreground text-sm font-semibold">{header.area}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                  Waktu Inspeksi
                </div>
                <div className="text-foreground text-sm font-semibold">
                  {completedAt
                    ? format(completedAt, 'd/M/yyyy, HH.mm.ss')
                    : format(createdAt, 'd/M/yyyy, HH.mm.ss')}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                  Status
                </div>
                <Badge variant="secondary" className="w-fit rounded-full">
                  {header.status}
                </Badge>
              </div>
            </div>

            <div className="p-6">
              <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                Rincian Poin Pemeriksaan
              </div>

              <div className="border-border/70 mt-4 overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-low">
                    <tr className="text-muted-foreground text-left text-xs font-semibold tracking-[0.08em] uppercase">
                      <th className="w-10 px-4 py-3">No</th>
                      <th className="px-4 py-3">Poin</th>
                      <th className="w-[140px] px-4 py-3 text-right">Jawaban</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.map((item, index) => {
                      const answer = item.answer
                      const rendered =
                        item.inputType === 'yes_no_na'
                          ? formatChoice(answer?.valueChoice ?? '')
                          : item.inputType === 'scale_1_5'
                            ? answer?.valueNumber != null
                              ? String(answer.valueNumber)
                              : ''
                            : (answer?.valueText ?? '')
                      const badgeTone =
                        item.inputType === 'yes_no_na' && rendered === 'YES'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.inputType === 'yes_no_na' && rendered === 'NO'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-surface-container-low text-foreground'

                      return (
                        <tr key={item.id} className="border-border/70 border-b last:border-b-0">
                          <td className="text-muted-foreground px-4 py-3">{index + 1}</td>
                          <td className="text-foreground px-4 py-3 font-medium">{item.prompt}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex min-w-[64px] justify-center rounded-md px-2.5 py-1 text-xs font-semibold ${badgeTone}`}
                            >
                              {rendered || '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-10 grid gap-10 sm:grid-cols-2">
                <div className="space-y-2 text-center">
                  <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                    Dilaporkan Oleh
                  </div>
                  <div className="h-10" />
                  <div className="border-border/70 text-foreground border-t pt-3 text-sm font-semibold">
                    {header.responsibleName ?? '—'}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {header.responsibleRole ? `${header.responsibleRole} • ` : ''}Penanggung jawab
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                    Diverifikasi Sistem
                  </div>
                  <div className="h-10" />
                  <div className="border-border/70 text-primary border-t pt-3 text-sm font-semibold">
                    DIGITAL SIGNATURE
                  </div>
                  <div className="text-muted-foreground text-[11px]">Verified by system</div>
                </div>
              </div>

              <div className="border-border/70 bg-surface-container-low text-muted-foreground mt-10 rounded-xl border px-4 py-3 text-xs">
                Stempel tanggal: {format(stampDate, 'd/M/yyyy, HH.mm.ss')}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
