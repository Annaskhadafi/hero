'use client'

import React from 'react'

export interface AssetDisposalItem {
  id?: number | null
  assetId?: number | null
  assetName: string
  assetNumber?: string | null
  purchaseYear?: string | null
  bookValue?: number | null
  estimatedSalePrice?: number | null
  notes?: string | null
}

export interface AssetDisposalDocumentData {
  disposalNumber: string
  disposalDate: string | Date
  disposalType?: string | null
  status: string
  applicantName: string
  applicantSn?: string | null
  applicantJobTitle?: string | null
  departmentName: string
  sectionName?: string | null
  siteName: string
  assetName: string
  assetNumber?: string | null
  purchaseYear?: string | null
  totalBookValue?: number | null
  totalEstimatedSalePrice?: number | null
  notes: string
  items?: AssetDisposalItem[] | null
  attachments?: Array<{
    fileName: string
    fileUrl: string
    fileSize?: number
  }> | null
  submittedAt?: string | Date | null
  approvedAt?: string | Date | null
  approvals?: Array<{
    level: number
    title: string
    approverName: string
    jobTitle?: string | null
    status: string
    reviewedAt?: string | Date | null
    signatureUrl?: string | null
    decisionNote?: string | null
  }>
  submitterSignatureUrl?: string | null
}

function formatIndoDate(val?: string | Date | null): string {
  if (!val) return '-'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatIndoDateTime(val?: string | Date | null): string {
  if (!val) return '-'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return String(val)
  const dateStr = d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = d
    .toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(':', '.')
  return `${dateStr} • ${timeStr} WITA`
}

export function AssetDisposalDocumentView({
  doc,
  containerRef,
  liveSignatureUrl,
  currentLevel,
}: {
  doc: AssetDisposalDocumentData
  containerRef?: React.Ref<HTMLDivElement>
  liveSignatureUrl?: string | null
  currentLevel?: number
}) {
  const isSale = doc.disposalType === 'Penjualan'

  const approvalCols = doc.approvals && doc.approvals.length > 0
    ? doc.approvals
        // Procurement does not sign in the formal managerial signature block
        .filter(
          (app) =>
            !app.title.toLowerCase().includes('procurement') &&
            !app.approverName.toLowerCase().includes('rajab') &&
            !app.approverName.toLowerCase().includes('sofyan')
        )
        .map((app) => {
        const isCurrent = currentLevel === app.level && app.status !== 'approved'
        const sigUrl =
          app.status === 'approved' && app.signatureUrl
            ? app.signatureUrl
            : isCurrent && liveSignatureUrl
              ? liveSignatureUrl
              : app.signatureUrl || null

        let header = 'DISETUJUI OLEH'
        const lowerTitle = (app.title || '').toLowerCase()
        const lowerName = (app.approverName || '').toLowerCase()
        const lowerJob = (app.jobTitle || '').toLowerCase()

        if (lowerName.includes('amama ira') || (lowerTitle.includes('finance') && (lowerTitle.includes('supervisor') || lowerJob.includes('supervisor') || lowerTitle.includes('spv')))) {
          header = 'DIPERIKSA OLEH (FINANCE SPV)'
        } else if (lowerName.includes('febrian dani') || (lowerTitle.includes('finance') && (lowerTitle.includes('manager') || lowerJob.includes('manager') || lowerTitle.includes('mgr')))) {
          header = 'DISETUJUI OLEH (FINANCE MGR)'
        } else if (lowerTitle.includes('finance') || lowerTitle.includes('verifikasi')) {
          header = 'DIPERIKSA OLEH (FINANCE)'
        } else if (lowerTitle.includes('general manager') || lowerTitle.includes('gm')) {
          header = 'DISETUJUI OLEH (GM)'
        } else if (lowerTitle.includes('director') || lowerTitle.includes('direktur')) {
          header = 'DISETUJUI OLEH (DIREKSI)'
        } else if (lowerTitle.includes('manager') || lowerTitle.includes('dept')) {
          header = 'DISETUJUI OLEH (DEPT HEAD)'
        }

        return {
          key: `appr-${app.level}`,
          header,
          name: app.approverName,
          jobTitle: app.jobTitle || app.title,
          sigUrl,
          isApproved: app.status === 'approved' || (isCurrent && Boolean(liveSignatureUrl)),
          dateTime: app.reviewedAt
            ? formatIndoDateTime(app.reviewedAt)
            : isCurrent && liveSignatureUrl
              ? formatIndoDateTime(new Date())
              : null,
          note: app.decisionNote || null,
        }
      })
    : []

  const signatureColumns = [
    {
      key: 'submitter',
      header: 'DIAJUKAN OLEH',
      name: doc.applicantName,
      jobTitle: doc.applicantJobTitle || 'Pemohon Disposal',
      sigUrl: doc.submitterSignatureUrl || null,
      isApproved: true,
      dateTime: doc.submittedAt ? formatIndoDateTime(doc.submittedAt) : null,
      note: null,
    },
    ...approvalCols,
  ]

  return (
    <div
      ref={containerRef}
      className="print-area w-[297mm] min-w-[297mm] max-w-[297mm] min-h-[210mm] bg-white text-slate-900 border border-slate-300 p-8 shadow-md font-sans text-xs flex flex-col justify-between"
      style={{ boxSizing: 'border-box' }}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <img
              src="/cp_logo-removebg-preview.png"
              alt="Logo PT Chitra Paratama"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                PT. CHITRA PARATAMA
              </h2>
              <p className="text-[10px] font-semibold text-slate-600 tracking-wide uppercase">
                Total Tire Solution • Asset Retirement &amp; Disposal
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black text-slate-900 tracking-wide uppercase">
              FORMULIR PENGHENTIAN &amp; PENGHAPUSAN ASET (DISPOSAL)
            </h1>
            <div className="mt-1 flex flex-col text-[11px] text-slate-700">
              <span className="font-semibold">
                No. Form:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {doc.disposalNumber}
                </span>
              </span>
              <span>
                Status:{' '}
                <span className="font-bold text-emerald-800 uppercase">
                  {doc.status}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="mt-3.5 rounded-lg border border-slate-300 bg-slate-50/70 p-3">
          <div className="grid grid-cols-5 gap-x-4 gap-y-2 text-[11px]">
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Tanggal Pengajuan
              </span>
              <span className="font-bold text-slate-900">
                {formatIndoDate(doc.disposalDate)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Jenis Disposal
              </span>
              <span className="font-extrabold uppercase text-slate-900">
                {doc.disposalType || 'Penghapusan'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Nama Pemohon
              </span>
              <span className="font-bold text-slate-900">
                {doc.applicantName} {doc.applicantSn ? `(${doc.applicantSn})` : ''}
              </span>
              <span className="block text-[10px] text-slate-600">
                {doc.applicantJobTitle || 'Karyawan'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Departemen &amp; Section
              </span>
              <span className="font-bold text-slate-900">{doc.departmentName}</span>
              <span className="block text-[10px] text-slate-600">
                {doc.sectionName || '-'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Cabang / Site
              </span>
              <span className="font-bold text-slate-900">{doc.siteName}</span>
              <span className="block text-[10px] text-slate-600">
                Tahun Beli: {doc.purchaseYear || '-'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
              Alasan Penghapusan / Catatan Kerusakan:
            </span>
            <span className="font-medium text-slate-800">{doc.notes}</span>
          </div>
        </div>

        {/* Rincian Aset */}
        <div className="mt-3">
          {(() => {
            const rawItems = doc.items && doc.items.length > 0
              ? doc.items
              : [
                  {
                    assetName: doc.assetName,
                    assetNumber: doc.assetNumber,
                    purchaseYear: doc.purchaseYear,
                    notes: doc.notes,
                  },
                ]
            return (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    DETAIL RINCIAN ASET YANG DIHAPUS (DISPOSAL ASSETS)
                  </p>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    Total {rawItems.length} Unit Aset
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-700 uppercase">
                        <th className="w-10 px-2.5 py-1.5 text-center">NO</th>
                        <th className="px-2.5 py-1.5">NAMA ASET</th>
                        <th className="px-2.5 py-1.5">NOMOR ASET</th>
                        <th className="w-20 px-2.5 py-1.5 text-center">TAHUN BELI</th>
                        <th className="px-2.5 py-1.5 text-right">NILAI TERAKHIR (SAP)</th>
                        {isSale && (
                          <th className="px-2.5 py-1.5 text-right font-extrabold text-blue-900">
                            ESTIMASI HARGA PENJUALAN
                          </th>
                        )}
                        <th className="px-2.5 py-1.5">DEPARTEMEN / LOKASI</th>
                        <th className="px-2.5 py-1.5">KONDISI FISIK / ALASAN PENGHAPUSAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 border-b border-slate-200 last:border-b-0">
                          <td className="px-2.5 py-2 text-center font-medium text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-2.5 py-2 font-bold text-slate-900">
                            {it.assetName}
                          </td>
                          <td className="px-2.5 py-2 font-mono font-bold text-slate-900">
                            {it.assetNumber || '-'}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono text-slate-800">
                            {it.purchaseYear || '-'}
                          </td>
                          <td className="px-2.5 py-2 font-mono font-bold text-slate-900 text-right">
                            {it.bookValue ? `Rp ${new Intl.NumberFormat('id-ID').format(it.bookValue)}` : 'Rp 0'}
                          </td>
                          {isSale && (
                            <td className="px-2.5 py-2 font-mono font-bold text-blue-900 text-right">
                              {it.estimatedSalePrice ? `Rp ${new Intl.NumberFormat('id-ID').format(it.estimatedSalePrice)}` : 'Rp 0'}
                            </td>
                          )}
                          <td className="px-2.5 py-2 text-slate-800">
                            {doc.departmentName} • {doc.siteName}
                          </td>
                          <td className="px-2.5 py-2 text-rose-800 font-medium text-[11px]">
                            {it.notes || doc.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-400 bg-slate-50 font-bold text-slate-900 text-xs">
                        <td colSpan={4} className="px-2.5 py-1.5 text-right uppercase text-[10px] tracking-wider text-slate-700">
                          {isSale ? 'TOTAL NILAI AKUMULASI:' : 'TOTAL NILAI TERAKHIR ASET:'}
                        </td>
                        <td className="px-2.5 py-1.5 font-mono font-extrabold text-emerald-900 text-right">
                          Rp {new Intl.NumberFormat('id-ID').format(
                            doc.totalBookValue ||
                            rawItems.reduce((acc: number, it: any) => acc + (Number(it.bookValue) || 0), 0)
                          )}
                        </td>
                        {isSale && (
                          <td className="px-2.5 py-1.5 font-mono font-extrabold text-blue-900 text-right">
                            Rp {new Intl.NumberFormat('id-ID').format(
                              doc.totalEstimatedSalePrice ||
                              rawItems.reduce((acc: number, it: any) => acc + (Number(it.estimatedSalePrice) || 0), 0)
                            )}
                          </td>
                        )}
                        <td colSpan={2} className="px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
                          {isSale ? '(Total Nilai Buku SAP & Estimasi Penjualan)' : `(Akumulasi Book Value ${rawItems.length} Unit Aset)`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )
          })()}

          <div className="mt-2.5 flex items-center justify-between rounded-md border border-amber-300 bg-[#ffd700] px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs">
            <span className="text-[10px] tracking-wide uppercase">
              BERITA ACARA PENGHENTIAN ASET: ASET DIHAPUS DARI DAFTAR INVENTARIS AKTIF
            </span>
            <span className="text-[10px] font-semibold text-slate-900 italic">
              Disetujui berjenjang hingga Direksi &amp; diverifikasi oleh Tim Finance &amp; Accounting
            </span>
          </div>
        </div>
      </div>

      {/* Signature Grid */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-white/95 text-xs shadow-xs">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="divide-x divide-slate-300 border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-800 uppercase">
              {signatureColumns.map((col) => (
                <th key={col.key} className="px-2 py-1.5 text-center">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="divide-x divide-slate-300 border-b border-slate-300 bg-white">
              {signatureColumns.map((col) => (
                <td key={col.key} className="h-16 p-1 text-center align-middle sm:h-18">
                  {col.sigUrl ? (
                    <img
                      src={col.sigUrl}
                      alt={`TTD ${col.name}`}
                      className="mx-auto h-11 w-auto max-w-[95%] object-contain sm:h-13"
                    />
                  ) : col.isApproved ? (
                    <span className="text-xs font-bold text-emerald-700">✓ Disetujui</span>
                  ) : (
                    <span className="text-[9px] font-medium text-slate-400 italic">
                      (Menunggu persetujuan)
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 border-t border-slate-300 bg-slate-50/70">
              {signatureColumns.map((col) => (
                <td key={col.key} className="space-y-0.5 px-1.5 py-2 text-center align-top">
                  <p className="truncate text-[10px] leading-snug font-bold text-slate-900">
                    ( {col.name} )
                  </p>
                  <p className="truncate text-[9px] leading-snug font-medium text-slate-600">
                    {col.jobTitle}
                  </p>
                  <p className="font-mono text-[8.5px] text-slate-500">
                    {col.dateTime || '-'}
                  </p>
                  {col.note ? (
                    <p className="line-clamp-2 text-[8px] leading-snug text-slate-500 italic">
                      Catatan: {col.note}
                    </p>
                  ) : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
