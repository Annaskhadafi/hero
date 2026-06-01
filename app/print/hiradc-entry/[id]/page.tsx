import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getHiradcEntryReport } from "@/lib/hiradc/queries"
import { Button } from "@/components/ui/button"
import { PrintButton } from "@/components/hiradc/print-button"
import { HiradcDesignOneReport } from "@/components/hiradc/hiradc-design-one-report"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function HiradcEntryPrintPage({ params }: PageProps) {
  const { id } = await params
  const entry = await getHiradcEntryReport(parseInt(id, 10))

  if (!entry) notFound()

  return (
    <div className="min-h-screen bg-slate-100 pb-10 print:bg-white print:pb-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 6mm 8mm 8mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-shell { padding: 0 !important; margin: 0 !important; }
          .hiradc-design-one-sheet { width: 194mm !important; max-width: 194mm !important; min-height: auto !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
          .hiradc-design-one-sheet .absolute { position: absolute !important; }
          .hiradc-design-one-sheet > .absolute:first-child { top: 0 !important; }
          .hiradc-design-one-sheet .grid { gap: 4mm !important; }
          .hiradc-design-one-sheet .rounded-2xl { border-radius: 10px !important; }
          .hiradc-print-section { break-inside: avoid !important; page-break-inside: avoid !important; }
          .hiradc-print-section--major { break-before: auto !important; page-break-before: auto !important; }
          .hiradc-print-content { align-items: start !important; }
        }
      ` }} />
      <div className="no-print bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
            <Link href="/dashboard/hse/hiradc">
              <ArrowLeft className="mr-2 size-4" />
              Kembali
            </Link>
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="font-bold text-slate-800">{entry.activityName}</h1>
            <p className="text-xs text-slate-500">Design 1 HIRADC PDF</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <main className="print-shell mx-auto max-w-[210mm] p-8 print:max-w-none">
        <HiradcDesignOneReport entry={entry} />
      </main>
    </div>
  )
}
