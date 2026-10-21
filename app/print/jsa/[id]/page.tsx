import React from 'react'
import { notFound } from 'next/navigation'
import { getJsaById } from '@/app/dashboard/hse/jsa/actions'
import { JsaDocumentSheet } from '@/components/hse/jsa-document-sheet'
import { PrintAction } from './print-action'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PrintJsaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getJsaById(id)
  if (!data) return notFound()

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:bg-white flex justify-center overflow-x-auto">
      <PrintAction />
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          .pdf-wrapper {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

      <JsaDocumentSheet data={data} />
    </div>
  )
}
