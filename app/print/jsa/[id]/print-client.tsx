'use client'

import * as React from 'react'
import { Printer, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JsaDocumentSheet, type JsaDocumentData } from '@/components/hse/jsa-document-sheet'

interface PrintJsaClientProps {
  data: JsaDocumentData
  initialOrientation?: 'portrait' | 'landscape'
}

export function PrintJsaClient({ data, initialOrientation = 'portrait' }: PrintJsaClientProps) {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>(initialOrientation)

  const handlePrint = () => {
    window.print()
  }

  const isLandscape = orientation === 'landscape'

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:m-0 print:h-auto print:min-h-0 print:bg-white flex justify-center print:block overflow-x-auto print:overflow-hidden no-scrollbar">
      {/* Fixed Print Control Bar */}
      <div className="fixed top-4 right-4 print:hidden z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-xl">
        {/* Orientation Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setOrientation('portrait')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              !isLandscape
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Format Cetak Portrait (Tegak A4)"
          >
            <RectangleVertical className="w-3.5 h-3.5" />
            <span>Portrait</span>
          </button>
          <button
            type="button"
            onClick={() => setOrientation('landscape')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isLandscape
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Format Cetak Landscape (Mendatar A4)"
          >
            <RectangleHorizontal className="w-3.5 h-3.5" />
            <span>Landscape</span>
          </button>
        </div>

        <Button onClick={handlePrint} className="gap-2 shadow-xs h-9 cursor-pointer">
          <Printer className="w-4 h-4" />
          Cetak PDF
        </Button>
      </div>

      {/* Dynamic Print Styles for Exact 1-Page A4 Sheet */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
            size: A4 ${orientation};
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
            width: ${isLandscape ? '297mm' : '210mm'} !important;
            max-width: ${isLandscape ? '297mm' : '210mm'} !important;
            height: ${isLandscape ? '210mm' : '297mm'} !important;
            max-height: ${isLandscape ? '210mm' : '297mm'} !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            padding: ${isLandscape ? '8mm 12mm 8mm 12mm' : '10mm 12mm 10mm 12mm'} !important;
            margin: 0 auto !important;
          }
        }
      `}} />

      <JsaDocumentSheet data={data} orientation={orientation} />
    </div>
  )
}
