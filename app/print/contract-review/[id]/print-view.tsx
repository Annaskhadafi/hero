'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Download, ArrowLeft, Loader2 } from 'lucide-react'
import { ContractReviewPrintableDoc } from '@/components/contract-review/contract-review-printable-doc'
import { downloadMultiPageElementAsPdf } from '@/lib/pdf-download'
import { toast } from 'sonner'

export function ContractReviewPrintView({
  review,
  selectedEmp,
  approvals,
  isEmbedded = false,
}: {
  review: any
  selectedEmp: any
  approvals: any[]
  isEmbedded?: boolean
}) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    try {
      const pageNodes = Array.from(
        document.querySelectorAll<HTMLElement>('.contract-review-print-container .contract-review-page, .contract-review-page, .pdf-wrapper')
      )
      if (!pageNodes.length) {
        toast.error('Halaman dokumen tidak ditemukan.')
        return
      }
      const empName = (selectedEmp?.name || review.employeeNameStr || 'Document').replace(/\s+/g, '_')
      await downloadMultiPageElementAsPdf(pageNodes, `Contract_Review_${empName}.pdf`)
      toast.success('File PDF berhasil didownload.')
    } catch (e: any) {
      console.error('Error downloading PDF:', e)
      toast.error('Gagal download PDF: ' + (e.message || 'Terjadi kesalahan'))
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'DOWNLOAD_PDF') {
        handleDownloadPdf()
      } else if (e.data?.type === 'PRINT') {
        handlePrint()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [selectedEmp, review.employeeNameStr])

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait !important;
              margin: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: Arial, sans-serif !important;
            }
            @media print {
              html, body {
                background-color: #ffffff !important;
              }
              .no-print-toolbar {
                display: none !important;
              }
              .contract-review-print-container {
                gap: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .contract-review-page {
                position: relative !important;
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 auto !important;
                overflow: hidden !important;
                background-image: url('/ChitraParatama_Stationery_Letterhead_jkt.jpg') !important;
                background-size: 210mm 297mm !important;
                background-repeat: no-repeat !important;
                background-position: top center !important;
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
              }
              .contract-review-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .contract-review-page > img.absolute {
                display: none !important;
              }
              .pdf-wrapper-content {
                position: relative !important;
                width: 210mm !important;
                box-sizing: border-box !important;
              }
            }
          `,
        }}
      />
      {!isEmbedded && (
        <div className="no-print-toolbar sticky top-0 z-50 flex items-center justify-between border-b bg-white/95 px-6 py-3 backdrop-blur shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.opener) window.close()
                else window.history.back()
              }}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            <span className="text-sm font-semibold text-slate-800">
              Contract Review - {selectedEmp?.name || review.employeeNameStr || 'Dokumen'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="size-4" /> Cetak / Save PDF
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isDownloading}
              onClick={handleDownloadPdf}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isDownloading ? 'Menyiapkan PDF...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:min-h-0 print:p-0 print:bg-white flex justify-center items-start">
        <ContractReviewPrintableDoc
          form={review}
          selectedEmp={selectedEmp}
          approvalsList={approvals}
        />
      </div>
    </>
  )
}
