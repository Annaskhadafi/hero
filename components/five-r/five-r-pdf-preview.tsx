'use client'

import { FiveRDocumentPreview } from './five-r-document-preview'

export function FiveRPdfPreview({ data }: { data: any }) {
  if (!data || !data.report) return null

  return (
    <div className="min-h-screen bg-slate-100 py-3 print:bg-white print:py-0">
      <FiveRDocumentPreview
        report={data.report}
        findings={data.findings}
        approvalLogs={data.approvalLogs}
        approvalRoute={data.approvalRoute}
      />
    </div>
  )
}
