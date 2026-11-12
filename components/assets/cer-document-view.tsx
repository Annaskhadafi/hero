'use client'

import React from 'react'

export interface CerDocumentItem {
  id?: string | number
  itemDescription: string
  quantity: number
  estimatedPrice: number
  currency?: string
  allocation?: string
  holderName?: string
  notes?: string
  assetNumber?: string
  kelompokAset?: string
}

export interface CerApprovalStepView {
  level: number
  title: string
  approverName: string
  jobTitle?: string | null
  status: string
  reviewedAt?: string | Date | null
  signatureUrl?: string | null
  decisionNote?: string | null
}

export interface CerDocumentData {
  id?: number
  cerNumber: string
  subject: string
  purchaseType?: string | null
  budgetSource?: string | null
  budgetCode?: string | null
  budgetName?: string | null
  dateRequired?: string | Date | null
  submittedAt?: string | Date | null
  approvedAt?: string | Date | null
  applicantName: string
  applicantSn?: string | null
  applicantJobTitle?: string | null
  departmentName?: string | null
  sectionName?: string | null
  siteName?: string | null
  assetCategory?: string | null
  purchasePurpose?: string | null
  vendorName?: string | null
  totalEstimatedPrice: string | number
  kelompokAset?: string | null
  status: string
  items: CerDocumentItem[]
  approvals: CerApprovalStepView[]
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

function formatCurrency(val?: string | number | null): string {
  if (val === null || val === undefined || val === '') return 'Rp 0'
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
  if (isNaN(num)) return String(val)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function CerDocumentView({
  doc,
  containerRef,
  liveSignatureUrl,
  currentLevel,
}: {
  doc: CerDocumentData
  containerRef?: React.Ref<HTMLDivElement>
  liveSignatureUrl?: string | null
  currentLevel?: number
}) {
  // Build horizontal signature columns: Submitter + Approvals
  const signatureColumns = [
    {
      key: 'submitter',
      header: 'DIAJUKAN OLEH',
      name: doc.applicantName,
      jobTitle: doc.applicantJobTitle || 'Pemohon Capex',
      sigUrl: doc.submitterSignatureUrl || null,
      isApproved: true,
      dateTime: doc.submittedAt ? formatIndoDateTime(doc.submittedAt) : null,
      note: null,
    },
    ...doc.approvals.map((app) => {
      const isCurrent = currentLevel === app.level && app.status !== 'approved'
      const sigUrl =
        app.status === 'approved' && app.signatureUrl
          ? app.signatureUrl
          : isCurrent && liveSignatureUrl
            ? liveSignatureUrl
            : app.signatureUrl || null

      let header = 'DISETUJUI OLEH'
      if (app.title.toLowerCase().includes('acknowledge') || app.title.toLowerCase().includes('bima')) {
        header = 'DIKETAHUI OLEH'
      } else if (app.title.toLowerCase().includes('finance') || app.title.toLowerCase().includes('checked')) {
        header = 'DIPERIKSA OLEH'
      }

      return {
        key: `appr-${app.level}`,
        header,
        name: app.approverName || 'Approver',
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
    }),
  ]

  return (
    <div
      ref={containerRef}
      className="print-area w-[297mm] min-w-[297mm] max-w-[297mm] min-h-[210mm] bg-white text-slate-900 border border-slate-300 p-8 shadow-md font-sans text-xs flex flex-col justify-between"
      style={{ boxSizing: 'border-box' }}
    >
      <div>
        {/* Header: Logo PT Chitra Paratama & Title Work Order Style */}
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
                Total Tire Solution • Capital Expenditure Request
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black text-slate-900 tracking-wide uppercase">
              FORM CAPITAL EXPENDITURE REQUEST (CER)
            </h1>
            <div className="mt-1 flex flex-col text-[11px] text-slate-700">
              <span className="font-semibold">
                No. CER:{' '}
                <span className="font-mono font-bold text-slate-900">{doc.cerNumber}</span>
              </span>
              <span>
                Status:{' '}
                <span className="font-bold text-emerald-800 uppercase">
                  {doc.status.replace(/_/g, ' ')}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Section (Work Order Style Grid) */}
        <div className="mt-3.5 rounded-lg border border-slate-300 bg-slate-50/70 p-3">
          <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Tanggal Pengajuan
              </span>
              <span className="font-bold text-slate-900">
                {formatIndoDate(doc.submittedAt || doc.dateRequired)}
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
                {doc.applicantJobTitle || 'Pemohon'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Departemen &amp; Section
              </span>
              <span className="font-bold text-slate-900">
                {doc.departmentName || '-'}
              </span>
              <span className="block text-[10px] text-slate-600">
                {doc.sectionName || '-'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Cabang / Site &amp; Vendor
              </span>
              <span className="font-bold text-slate-900">{doc.siteName || '-'}</span>
              <span className="block text-[10px] text-slate-600">
                Vendor: {doc.vendorName || '-'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-3 gap-4 text-[11px]">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
                Kategori Aset:
              </span>
              <span className="font-bold text-slate-900">
                {doc.assetCategory || 'Capex Device'}
              </span>
              {doc.kelompokAset ? (
                <span className="ml-1.5 font-medium text-slate-600">
                  ({doc.kelompokAset})
                </span>
              ) : null}
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
                Jenis Pengadaan:
              </span>
              <span className="font-medium text-slate-800">
                {doc.purchaseType || 'Baru'} ({doc.budgetSource || 'Anggaran'}
                {doc.budgetCode ? ` • ${doc.budgetCode} - ${doc.budgetName}` : ''})
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
                Subjek:
              </span>
              <span className="font-medium text-slate-800">{doc.subject}</span>
            </div>
          </div>

          {doc.purchasePurpose ? (
            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px]">
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
                Tujuan &amp; Justifikasi Pembelian:
              </span>
              <span className="font-medium text-slate-800">{doc.purchasePurpose}</span>
            </div>
          ) : null}
        </div>

        {/* Capex Items Table */}
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
            RINCIAN UNIT PERMINTAAN PENGADAAN (CAPEX ITEMS)
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="w-10 px-2.5 py-1.5 text-center">NO</th>
                  <th className="px-2.5 py-1.5">DESKRIPSI BARANG</th>
                  <th className="px-2.5 py-1.5">KELOMPOK ASET</th>
                  <th className="px-2.5 py-1.5">NOMOR ASET</th>
                  <th className="w-16 px-2.5 py-1.5 text-center">QTY</th>
                  <th className="w-32 px-2.5 py-1.5 text-right">ESTIMASI HARGA</th>
                  <th className="w-36 px-2.5 py-1.5 text-right">TOTAL HARGA</th>
                  <th className="px-2.5 py-1.5">CATATAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {doc.items && doc.items.length > 0 ? (
                  doc.items.map((it, idx) => {
                    const lineTotal = Number(it.quantity || 1) * Number(it.estimatedPrice || 0)
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-2.5 py-1.5 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-2.5 py-1.5 font-bold text-slate-900">
                          <div>{it.itemDescription}</div>
                          {(it.allocation || it.holderName) && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-normal text-slate-500">
                              {it.allocation && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.2 border border-emerald-200 text-emerald-800 font-medium">
                                  Site: {it.allocation}
                                </span>
                              )}
                              {it.holderName && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.2 border border-blue-200 text-blue-800 font-medium">
                                  Holder: {it.holderName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 font-medium text-slate-700">
                          {it.kelompokAset || doc.kelompokAset || '-'}
                        </td>
                        <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900">
                          {it.assetNumber || '-'}
                        </td>
                        <td className="px-2.5 py-1.5 text-center font-semibold text-slate-800">
                          {it.quantity} Unit
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-slate-700">
                          {formatCurrency(it.estimatedPrice)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-600 text-[11px]">
                          {it.notes || '-'}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td className="px-2.5 py-1.5 text-center font-medium text-slate-500">
                      1
                    </td>
                    <td className="px-2.5 py-1.5 font-bold text-slate-900">
                      {doc.subject}
                    </td>
                    <td className="px-2.5 py-1.5 font-medium text-slate-700">
                      {doc.kelompokAset || '-'}
                    </td>
                    <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900">-</td>
                    <td className="px-2.5 py-1.5 text-center font-semibold text-slate-800">
                      1 Unit
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-slate-700">
                      {formatCurrency(doc.totalEstimatedPrice)}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(doc.totalEstimatedPrice)}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-600 text-[11px]">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Yellow Total Bar (Work Order Style) */}
          <div className="mt-2.5 flex items-center justify-between rounded-md border border-amber-300 bg-[#ffd700] px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs">
            <span className="text-[10px] tracking-wide uppercase">
              TOTAL ESTIMASI NILAI INVESTASI (CAPEX)
            </span>
            <span className="font-mono text-sm font-black text-slate-950">
              {formatCurrency(doc.totalEstimatedPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Signature Grid (Work Order Style Horizontal Multi-Column) */}
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
