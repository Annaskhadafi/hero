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
    <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:m-0 print:h-auto print:min-h-0 print:bg-white flex justify-center print:block overflow-x-auto print:overflow-hidden no-scrollbar">
      <PrintAction />
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          .pdf-wrapper {
            box-shadow: none !important;
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            padding: 10mm 12mm 10mm 12mm !important;
            margin: 0 auto !important;
          }
        }
      `}} />

      <JsaDocumentSheet data={data} />
    </div>
  )
}
