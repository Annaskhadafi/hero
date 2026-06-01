import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { AdminPageShell } from "@/components/admin-page-shell"
import { getHiradcReport } from "@/lib/hiradc/queries"
import { Button } from "@/components/ui/button"
import { HiradcPrintableReport } from "@/components/hiradc/hiradc-printable-report"
import { PrintButton } from "@/components/hiradc/print-button"

export const dynamic = "force-dynamic"

export default async function HiradcReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getHiradcReport(parseInt(id, 10))

  if (!data) {
    notFound()
  }

  const { register, entries } = data

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
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
            <h1 className="font-bold text-slate-800">{register.title}</h1>
            <p className="text-xs text-slate-500">Document No: {register.documentNo || `HSE/HIRADC/00${register.id}`}</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="pt-8">
        <HiradcPrintableReport register={register} entries={entries} />
      </div>
    </div>
  )
}
