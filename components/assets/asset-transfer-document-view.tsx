'use client'

import React from 'react'

export interface AssetTransferDocumentData {
  transferNumber: string
  submittedAt?: string | Date | null
  transferredAt?: string | Date | null
  status: string
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  currentHolderName: string
  currentHolderJobTitle?: string | null
  currentLocationName: string
  newHolderName: string
  newHolderJobTitle?: string | null
  targetLocationName: string
  equipmentChecklist?: string[] | null
  equipmentOtherNote?: string | null
  notes?: string | null
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

export function AssetTransferDocumentView({
  doc,
  containerRef,
  liveSignatureUrl,
  currentLevel,
}: {
  doc: AssetTransferDocumentData
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

        let header = 'DISETUJUI OLEH'
        if (app.title.toLowerCase().includes('holder') || app.title.toLowerCase().includes('penerima')) {
          header = 'DITERIMA OLEH (HOLDER BARU)'
        } else if (app.title.toLowerCase().includes('atasan') || app.title.toLowerCase().includes('head')) {
          header = 'DIKETAHUI OLEH'
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
    : [
        {
          key: 'new-holder',
          header: 'DITERIMA OLEH (HOLDER BARU)',
          name: doc.newHolderName,
          jobTitle: doc.newHolderJobTitle || 'Pemegang Baru',
          sigUrl: doc.status === 'completed' ? doc.submitterSignatureUrl : (liveSignatureUrl || null),
          isApproved: doc.status === 'completed' || Boolean(liveSignatureUrl),
          dateTime: doc.transferredAt ? formatIndoDateTime(doc.transferredAt) : null,
          note: null,
        },
      ]

  const signatureColumns = [
    {
      key: 'current-holder',
      header: 'DIAJUKAN OLEH (HOLDER ASAL)',
      name: doc.currentHolderName,
      jobTitle: doc.currentHolderJobTitle || 'Pemegang Asal',
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
                Total Tire Solution • Asset Transfer &amp; Mutation
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black text-slate-900 tracking-wide uppercase">
              BERITA ACARA MUTASI / TRANSFER ASET
            </h1>
            <div className="mt-1 flex flex-col text-[11px] text-slate-700">
              <span className="font-semibold">
                No. Mutasi:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {doc.transferNumber}
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
                Tanggal Pengajuan
              </span>
              <span className="font-bold text-slate-900">
                {formatIndoDate(doc.submittedAt)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Pemegang Asal (Lokasi Asal)
              </span>
              <span className="font-bold text-slate-900">
                {doc.currentHolderName}
              </span>
              <span className="block text-[10px] text-slate-600">
                Site: {doc.currentLocationName}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Pemegang Baru (Lokasi Tujuan)
              </span>
              <span className="font-bold text-slate-900">{doc.newHolderName}</span>
              <span className="block text-[10px] text-slate-600">
                Site: {doc.targetLocationName}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Status Pemindahan
              </span>
              <span className="font-bold text-emerald-800 uppercase">
                {doc.status === 'completed' ? 'Mutasi Selesai' : 'Dalam Proses'}
              </span>
              <span className="block text-[10px] text-slate-600">
                Tgl: {doc.transferredAt ? formatIndoDate(doc.transferredAt) : '-'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
              Alasan &amp; Catatan Mutasi:
            </span>
            <span className="font-medium text-slate-800">{doc.notes || '-'}</span>
          </div>
        </div>

        {/* Rincian Aset */}
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
            DETAIL ASET YANG DIMUTASI
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="w-10 px-2.5 py-1.5 text-center">NO</th>
                  <th className="px-2.5 py-1.5">NAMA ASET</th>
                  <th className="px-2.5 py-1.5">NOMOR ASET</th>
                  <th className="px-2.5 py-1.5">SERIAL NUMBER</th>
                  <th className="px-2.5 py-1.5">LOKASI ASAL &rarr; TUJUAN</th>
                  <th className="px-2.5 py-1.5">KELENGKAPAN FISIK</th>
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
                  <td className="px-2.5 py-2 font-medium text-slate-800">
                    {doc.currentLocationName} &rarr; {doc.targetLocationName}
                  </td>
                  <td className="px-2.5 py-2 text-slate-700 text-[11px]">
                    {doc.equipmentChecklist && doc.equipmentChecklist.length > 0
                      ? doc.equipmentChecklist.join(', ')
                      : 'Lengkap'}
                    {doc.equipmentOtherNote ? ` (${doc.equipmentOtherNote})` : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-md border border-amber-300 bg-[#ffd700] px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs">
            <span className="text-[10px] tracking-wide uppercase">
              BERITA ACARA RESMI: KEPEMILIKAN FISIK &amp; TANGGUNG JAWAB BERALIH
            </span>
            <span className="text-[10px] font-semibold text-slate-900 italic">
              Dengan disetujuinya dokumen ini, status lokasi aset di sistem pusat otomatis diperbarui
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
