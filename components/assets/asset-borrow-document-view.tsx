'use client'

import React from 'react'

export interface AssetBorrowDocumentData {
  borrowNumber: string
  borrowDate: string | Date
  expectedReturnDate?: string | Date | null
  actualReturnDate?: string | Date | null
  status: string
  borrowerName: string
  borrowerJobTitle?: string | null
  holderName: string
  holderJobTitle?: string | null
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  equipmentNotes?: string | null
  purpose: string
  returnNotes?: string | null
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

export function AssetBorrowDocumentView({
  doc,
  containerRef,
  liveSignatureUrl,
  currentLevel,
}: {
  doc: AssetBorrowDocumentData
  containerRef?: React.Ref<HTMLDivElement>
  liveSignatureUrl?: string | null
  currentLevel?: number
}) {
  const approvalCols = doc.approvals && doc.approvals.length > 0
    ? doc.approvals.map((app) => {
        const isCurrent = currentLevel === app.level && app.status !== 'approved'
        const sigUrl =
          app.status === 'approved' && app.signatureUrl
            ? app.signatureUrl
            : isCurrent && liveSignatureUrl
              ? liveSignatureUrl
              : app.signatureUrl || null

        return {
          key: `appr-${app.level}`,
          header: 'DISETUJUI OLEH',
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
    : [
        {
          key: 'holder',
          header: 'DISETUJUI OLEH (PEMEGANG SAAT INI)',
          name: doc.holderName,
          jobTitle: doc.holderJobTitle || 'Pemegang Aset',
          sigUrl: doc.approvedAt ? doc.submitterSignatureUrl : (liveSignatureUrl || null),
          isApproved: doc.status === 'borrowed' || doc.status === 'approved' || Boolean(liveSignatureUrl),
          dateTime: doc.approvedAt ? formatIndoDateTime(doc.approvedAt) : null,
          note: null,
        },
      ]

  const signatureColumns = [
    {
      key: 'borrower',
      header: 'DIAJUKAN OLEH (PEMINJAM)',
      name: doc.borrowerName,
      jobTitle: doc.borrowerJobTitle || 'Peminjam Aset',
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
                Total Tire Solution • Asset Management
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black text-slate-900 tracking-wide uppercase">
              SURAT PERMINTAAN PEMINJAMAN ASET
            </h1>
            <div className="mt-1 flex flex-col text-[11px] text-slate-700">
              <span className="font-semibold">
                No. Form:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {doc.borrowNumber}
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
          <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Tanggal Pinjam
              </span>
              <span className="font-bold text-slate-900">
                {formatIndoDate(doc.borrowDate)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Estimasi Kembali
              </span>
              <span className="font-bold text-slate-900">
                {formatIndoDate(doc.expectedReturnDate)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Peminjam (Borrower)
              </span>
              <span className="font-bold text-slate-900">{doc.borrowerName}</span>
              <span className="block text-[10px] text-slate-600">
                {doc.borrowerJobTitle || 'Karyawan'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Pemegang Asal (Holder)
              </span>
              <span className="font-bold text-slate-900">{doc.holderName}</span>
              <span className="block text-[10px] text-slate-600">
                {doc.holderJobTitle || 'Karyawan'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
              Tujuan Peminjaman:
            </span>
            <span className="font-medium text-slate-800">{doc.purpose}</span>
          </div>
        </div>

        {/* Rincian Aset */}
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
            DETAIL ASET YANG DIPINJAM
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="w-10 px-2.5 py-1.5 text-center">NO</th>
                  <th className="px-2.5 py-1.5">NAMA ASET</th>
                  <th className="px-2.5 py-1.5">NOMOR ASET</th>
                  <th className="px-2.5 py-1.5">SERIAL NUMBER</th>
                  <th className="px-2.5 py-1.5">KELENGKAPAN / AKSESORIS</th>
                  <th className="w-24 px-2.5 py-1.5 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50/80">
                  <td className="px-2.5 py-2 text-center font-medium text-slate-500">
                    1
                  </td>
                  <td className="px-2.5 py-2 font-bold text-slate-900">
                    {doc.assetName}
                  </td>
                  <td className="px-2.5 py-2 font-mono font-bold text-slate-900">
                    {doc.assetNumber || '-'}
                  </td>
                  <td className="px-2.5 py-2 font-mono text-slate-700">
                    {doc.serialNumber || '-'}
                  </td>
                  <td className="px-2.5 py-2 text-slate-700 text-[11px]">
                    {doc.equipmentNotes || 'Lengkap & berfungsi normal'}
                  </td>
                  <td className="px-2.5 py-2 text-center font-bold text-sky-700">
                    Dipinjam
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-md border border-amber-300 bg-[#ffd700] px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs">
            <span className="text-[10px] tracking-wide uppercase">
              KETENTUAN PEMINJAMAN: HARUS DIKEMBALIKAN SESUAI KONDISI ASAL
            </span>
            <span className="text-[10px] font-semibold text-slate-900 italic">
              Peminjam bertanggung jawab penuh atas keamanan dan perawatan aset selama masa pinjam
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
