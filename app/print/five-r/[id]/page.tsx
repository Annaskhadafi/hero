import { notFound } from 'next/navigation'
import { getFiveRReportDetailAction } from '@/app/dashboard/quality/5r/actions'
import { FiveRDocumentPreview } from '@/components/five-r/five-r-document-preview'

export const dynamic = 'force-dynamic'

export default async function PrintFiveRStandalonePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await getFiveRReportDetailAction(Number(id))

  if (!res.success || !res.report) {
    notFound()
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait !important;
              margin: 0 !important;
            }
            @page :left {
              size: A4 portrait !important;
              margin: 0 !important;
            }
            @page :right {
              size: A4 portrait !important;
              margin: 0 !important;
            }
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              body * {
                visibility: hidden !important;
              }
              .pdf-wrapper, .pdf-wrapper * {
                visibility: visible !important;
              }
              .pdf-wrapper {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 210mm !important;
                max-width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                padding-top: 42mm !important;
                padding-bottom: 20mm !important;
                padding-left: 14mm !important;
                padding-right: 14mm !important;
                box-sizing: border-box !important;
                background-image: url(/ChitraParatama_Stationery_Letterhead_jkt.jpg) !important;
                background-size: 210mm 297mm !important;
                background-repeat: no-repeat !important;
                background-position: top center !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                overflow: hidden !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />
      <div className="min-h-screen bg-white p-0 m-0 flex justify-center items-start print:min-h-0 print:h-[297mm]">
        <FiveRDocumentPreview
          report={res.report}
          findings={res.findings}
          approvalLogs={res.approvalLogs}
          approvalRoute={res.approvalRoute}
          isEmbedded={true}
          hideToolbar={true}
        />
      </div>
    </>
  )
}
