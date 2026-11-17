'use client'

import React from 'react'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

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
  assetPhotos?: Array<{ fileName: string; fileUrl: string }> | null
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
  applicantSignatureUrl?: string | null
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
  let signatureColumns: Array<{
    key: string
    header: string
    name: string
    jobTitle: string
    sigUrl: string | null
    isApproved: boolean
    dateTime: string | null
    note: string | null
  }> = []

  if (doc.approvals && doc.approvals.length >= 4) {
    signatureColumns = doc.approvals.slice(0, 4).map((app) => {
      const isCurrent = currentLevel === app.level && app.status !== 'approved'
      const isApp = app.status === 'approved' || app.status === 'Approved'
      const sigUrl =
        isApp && app.signatureUrl
          ? app.signatureUrl
          : isCurrent && liveSignatureUrl
            ? liveSignatureUrl
            : app.signatureUrl || (app.level === 1 ? doc.applicantSignatureUrl : null)

      let header = 'DISETUJUI OLEH'
      if (app.level === 1) header = 'DIAJUKAN (HOLDER ASAL)'
      else if (app.level === 2) header = 'DISETUJUI (ATASAN HOLDER ASAL)'
      else if (app.level === 3) header = 'DITERIMA (HOLDER BARU)'
      else if (app.level === 4) header = 'DISETUJUI (ATASAN HOLDER BARU)'

      return {
        key: `step-${app.level}`,
        header,
        name: app.approverName || (app.level === 1 ? doc.currentHolderName : app.level === 3 ? doc.newHolderName : 'Approver'),
        jobTitle: app.jobTitle || (app.level === 1 ? doc.currentHolderJobTitle || 'Pemegang Asal' : app.level === 3 ? doc.newHolderJobTitle || 'Pemegang Baru' : 'Approver'),
        sigUrl,
        isApproved: isApp || (app.level === 1 && Boolean(doc.applicantSignatureUrl)),
        dateTime: app.reviewedAt ? formatIndoDateTime(app.reviewedAt) : (app.level === 1 && doc.submittedAt ? formatIndoDateTime(doc.submittedAt) : null),
        note: app.decisionNote || null,
      }
    })
  } else {
    // 3-step or legacy fallback
    const step1App = doc.approvals?.find((a) => a.level === 1)
    const step2App = doc.approvals?.find((a) => a.level === 2)
    const step3App = doc.approvals?.find((a) => a.level === 3)

    const resolveAppCol = (level: number, defaultHeader: string, defaultName: string, defaultJob: string, app?: any) => {
      const isCurrent = currentLevel === level && app?.status !== 'approved'
      const isApp = app?.status === 'approved' || app?.status === 'Approved'
      const sigUrl =
        isApp && app?.signatureUrl
          ? app.signatureUrl
          : isCurrent && liveSignatureUrl
            ? liveSignatureUrl
            : app?.signatureUrl || null

      return {
        key: `step-${level}`,
        header: defaultHeader,
        name: app?.approverName || defaultName,
        jobTitle: app?.jobTitle || defaultJob,
        sigUrl,
        isApproved: isApp,
        dateTime: app?.reviewedAt ? formatIndoDateTime(app.reviewedAt) : null,
        note: app?.decisionNote || null,
      }
    }

    signatureColumns = [
      {
        key: 'current-holder',
        header: 'DIAJUKAN (HOLDER ASAL)',
        name: doc.currentHolderName,
        jobTitle: doc.currentHolderJobTitle || 'Pemegang Asal',
        sigUrl: doc.applicantSignatureUrl || doc.submitterSignatureUrl || null,
        isApproved: Boolean(doc.applicantSignatureUrl || doc.submitterSignatureUrl),
        dateTime: doc.submittedAt ? formatIndoDateTime(doc.submittedAt) : null,
        note: null,
      },
      resolveAppCol(1, 'DISETUJUI (ATASAN HOLDER ASAL)', 'Atasan Langsung', 'Atasan Langsung', step1App),
      resolveAppCol(2, 'DITERIMA (HOLDER BARU)', doc.newHolderName, doc.newHolderJobTitle || 'Pemegang Baru', step2App),
      resolveAppCol(3, 'DISETUJUI (ATASAN HOLDER BARU)', 'Atasan Penerima', 'Atasan Penerima', step3App),
    ]
  }

  const completenessText =
    doc.equipmentOtherNote ||
    (doc.equipmentChecklist && doc.equipmentChecklist.length > 0
      ? doc.equipmentChecklist.join(', ')
      : 'Unit Lengkap beserta perlengkapan standar')

  return (
    <div
      ref={containerRef}
      className="print-area w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-slate-900 border border-slate-300 p-6 sm:p-7 shadow-md font-sans text-xs flex flex-col justify-between"
      style={{ boxSizing: 'border-box' }}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <img
              src="/cp_logo-removebg-preview.png"
              alt="Logo PT Chitra Paratama"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                PT. CHITRA PARATAMA
              </h2>
              <p className="text-[9px] font-semibold text-slate-600 tracking-wide uppercase">
                Total Tire Solution • Asset Transfer &amp; Mutation
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-black text-slate-900 tracking-wide uppercase">
              BERITA ACARA MUTASI ASET
            </h1>
            <div className="mt-0.5 flex flex-col text-[10.5px] text-slate-700">
              <span className="font-semibold">
                No:{' '}
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

        {/* Metadata Section: Pihak Asal vs Pihak Tujuan (Side-by-Side) */}
        <div className="mt-3.5 grid grid-cols-2 gap-3">
          {/* Pihak Asal */}
          <div className="rounded-lg border border-slate-300 bg-slate-50/80 p-3 space-y-1">
            <span className="block text-[9.5px] font-bold text-slate-500 uppercase">
              PIHAK ASAL (PEMEGANG LAMA)
            </span>
            <p className="text-xs font-bold text-slate-900">
              {doc.currentHolderName}
            </p>
            <p className="text-[10px] text-slate-600">
              Lokasi Asal: <span className="font-semibold text-slate-800">{doc.currentLocationName}</span>
            </p>
            <p className="text-[10px] text-slate-500">
              Tgl Pengajuan: {formatIndoDate(doc.submittedAt)}
            </p>
          </div>

          {/* Pihak Tujuan */}
          <div className="rounded-lg border border-slate-300 bg-slate-50/80 p-3 space-y-1">
            <span className="block text-[9.5px] font-bold text-emerald-700 uppercase">
              PIHAK PENERIMA (PEMEGANG BARU)
            </span>
            <p className="text-xs font-bold text-slate-900">
              {doc.newHolderName}
            </p>
            <p className="text-[10px] text-slate-600">
              Lokasi Tujuan: <span className="font-semibold text-slate-800">{doc.targetLocationName}</span>
            </p>
            <p className="text-[10px] text-slate-500">
              Status Serah Terima: Hak Guna &amp; Fisik Dialihkan
            </p>
          </div>
        </div>

        {/* Rincian Aset */}
        <div className="mt-3.5 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            DETAIL ASET YANG DIMUTASI
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="w-8 px-2 py-1.5 text-center">NO</th>
                  <th className="px-2.5 py-1.5">NAMA ASET</th>
                  <th className="px-2.5 py-1.5">NOMOR ASET</th>
                  <th className="px-2.5 py-1.5">SERIAL NUMBER</th>
                  <th className="px-2.5 py-1.5">LOKASI ASAL &rarr; TUJUAN</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50/80">
                  <td className="px-2 py-2 text-center font-medium text-slate-500">
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
                </tr>
              </tbody>
            </table>

            {/* Kelengkapan Fisik Aset */}
            <div className="border-t border-slate-200 bg-slate-50/50 p-2.5 text-xs">
              <span className="font-bold text-[10px] text-slate-600 uppercase block mb-0.5">
                Kelengkapan Fisik Aset:
              </span>
              <p className="text-slate-800 text-[11px] leading-relaxed">
                {completenessText}
              </p>
            </div>
          </div>

          {/* Side-by-Side: Foto Fisik Aset & Catatan Tambahan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Foto Fisik Aset */}
            <div className="rounded-lg border border-slate-300 bg-slate-50/70 p-2.5 space-y-1.5 flex flex-col justify-between">
              <span className="font-bold text-[10px] text-slate-700 uppercase block">
                FOTO KONDISI FISIK ASET:
              </span>
              {doc.assetPhotos && doc.assetPhotos.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {doc.assetPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-slate-300 bg-white p-1 shadow-2xs space-y-0.5"
                    >
                      <img
                        src={resolveUploadUrl(photo.fileUrl)}
                        alt={photo.fileName || `Foto Fisik Aset ${idx + 1}`}
                        className="h-20 w-auto max-w-[150px] object-contain rounded"
                      />
                      <span className="block text-[7.5px] font-mono text-center text-slate-500 truncate max-w-[150px]">
                        {photo.fileName || `Foto ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-dashed border-slate-300 bg-white/60 p-3 text-center text-[10px] text-slate-400 italic">
                  (Foto kondisi fisik tidak dilampirkan)
                </div>
              )}
              <span className="text-[8px] text-slate-500 italic block">
                Dokumentasi kondisi fisik sebelum serah terima.
              </span>
            </div>

            {/* Catatan / Keterangan Tambahan */}
            <div className="rounded-lg border border-slate-300 bg-slate-50/70 p-2.5 space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="font-bold text-[10px] text-slate-700 uppercase block mb-1">
                  CATATAN / KETERANGAN TAMBAHAN:
                </span>
                <p className="text-[10px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {doc.notes || 'Tidak ada catatan atau instruksi tambahan.'}
                </p>
              </div>
              <span className="text-[8px] text-slate-500 italic block">
                Alasan mutasi &amp; keterangan teknis pemindahan aset.
              </span>
            </div>
          </div>

          {/* Banner Kuning Ketentuan Mutasi */}
          <div className="rounded-md border border-amber-300 bg-[#ffd700] px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-wide uppercase">
                PERNYATAAN RESMI SERAH TERIMA &amp; MUTASI ASET
              </span>
            </div>
            <p className="text-[9.5px] font-medium text-slate-900">
              Catatan: Berita Acara ini diterbitkan sah. Hak guna dan tanggung jawab fisik resmi beralih ke Pemegang Baru setelah seluruh pihak menyelesaikan persetujuan di bawah ini.
            </p>
          </div>
        </div>
      </div>

      {/* Signature Grid (4 Columns in A4 Portrait) */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-white/95 text-xs shadow-xs">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="divide-x divide-slate-300 border-b border-slate-300 bg-slate-100/90 text-[9.5px] font-bold text-slate-800 uppercase">
              {signatureColumns.map((col) => (
                <th key={col.key} className="px-1.5 py-1.5 text-center">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="divide-x divide-slate-300 border-b border-slate-300 bg-white">
              {signatureColumns.map((col) => (
                <td key={col.key} className="h-16 p-1 text-center align-middle">
                  {col.sigUrl ? (
                    <img
                      src={col.sigUrl}
                      alt={`TTD ${col.name}`}
                      className="mx-auto h-12 w-auto max-w-[95%] object-contain"
                    />
                  ) : col.isApproved ? (
                    <span className="text-xs font-bold text-emerald-700">✓ Disetujui</span>
                  ) : (
                    <span className="text-[9px] font-medium text-slate-400 italic">
                      (Menunggu)
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 border-t border-slate-300 bg-slate-50/70">
              {signatureColumns.map((col) => (
                <td key={col.key} className="space-y-0.5 px-1.5 py-1.5 text-center align-top">
                  <p className="truncate text-[10px] leading-snug font-bold text-slate-900">
                    ( {col.name} )
                  </p>
                  <p className="truncate text-[8.5px] leading-snug font-medium text-slate-600">
                    {col.jobTitle}
                  </p>
                  <p className="font-mono text-[8px] text-slate-500">
                    {col.dateTime || '-'}
                  </p>
                  {col.note ? (
                    <p className="line-clamp-2 text-[7.5px] leading-snug text-slate-500 italic">
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
