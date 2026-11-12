'use client'

import React from 'react'

export interface CerBastDocumentData {
  cerNumber: string
  bastNumber?: string
  dateRequired?: string | Date | null
  receivedAt?: string | Date | null
  applicantName: string
  applicantSn?: string | null
  applicantJobTitle?: string | null
  departmentName?: string | null
  sectionName?: string | null
  siteName?: string | null
  assetCategory?: string | null
  subject?: string | null
  vendorName?: string | null
  totalEstimatedPrice?: string | number | null
  kelompokAset?: string | null
  items?: Array<{
    itemDescription: string
    quantity: number
    estimatedPrice: number
    currency?: string
    allocation?: string
    holderName?: string
    notes?: string
    assetNumber?: string
    kelompokAset?: string
  }>
  receiverNotes?: string | null
  receiverSignatureUrl?: string | null
  financeCheckerName?: string | null
  financeCheckedAt?: string | Date | null
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

export function CerBastDocumentView({
  data,
  containerRef,
  liveSignatureUrl,
}: {
  data: CerBastDocumentData
  containerRef?: React.Ref<HTMLDivElement>
  liveSignatureUrl?: string | null
}) {
  const bastNo = data.bastNumber || `BAST-${data.cerNumber.replace(/^CER\//, '')}`
  const effectiveReceiverSig = liveSignatureUrl || data.receiverSignatureUrl

  return (
    <div
      ref={containerRef}
      className="print-area w-[297mm] min-w-[297mm] max-w-[297mm] min-h-[210mm] bg-white text-slate-900 border border-slate-300 p-8 shadow-md font-sans text-xs flex flex-col justify-between"
      style={{ boxSizing: 'border-box' }}
    >
      <div>
        {/* Header: Logo & Title (Work Order Style) */}
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
                Total Tire Solution • Operational & Asset Management
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black text-slate-900 tracking-wide uppercase">
              BERITA ACARA SERAH TERIMA (BAST) ASET
            </h1>
            <div className="mt-1 flex flex-col text-[11px] text-slate-700">
              <span className="font-semibold">
                No. BAST:{' '}
                <span className="font-mono font-bold text-slate-900">{bastNo}</span>
              </span>
              <span>
                Ref. No. CER:{' '}
                <span className="font-mono text-slate-900">{data.cerNumber}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Section (Work Order Style Grid) */}
        <div className="mt-3.5 rounded-lg border border-slate-300 bg-slate-50/70 p-3">
          <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Tanggal Penerimaan
              </span>
              <span className="font-bold text-slate-900">
                {formatIndoDate(data.receivedAt || new Date())}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Penerima (PIC Lokasi)
              </span>
              <span className="font-bold text-slate-900">
                {data.applicantName} {data.applicantSn ? `(${data.applicantSn})` : ''}
              </span>
              <span className="block text-[10px] text-slate-600">
                {data.applicantJobTitle || 'Karyawan'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Departemen &amp; Section
              </span>
              <span className="font-bold text-slate-900">
                {data.departmentName || '-'}
              </span>
              <span className="block text-[10px] text-slate-600">
                {data.sectionName || '-'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                Cabang / Site &amp; Vendor
              </span>
              <span className="font-bold text-slate-900">{data.siteName || '-'}</span>
              <span className="block text-[10px] text-slate-600">
                Vendor: {data.vendorName || '-'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-[11px]">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
                Kategori Aset:
              </span>
              <span className="font-bold text-slate-900">
                {data.assetCategory || 'Capex Device'}
              </span>
              {data.kelompokAset ? (
                <span className="ml-2 font-medium text-slate-600">
                  (Kelompok: {data.kelompokAset})
                </span>
              ) : null}
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1.5">
                Subjek Pengadaan:
              </span>
              <span className="font-medium text-slate-800">{data.subject || '-'}</span>
            </div>
          </div>
        </div>

        {/* Rincian Aset yang Diterima (Table Work Order Style) */}
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
            RINCIAN UNIT ASET YANG DISERAHTERIMAKAN
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="w-10 px-2.5 py-1.5 text-center">NO</th>
                  <th className="px-2.5 py-1.5">DESKRIPSI BARANG / ASET</th>
                  <th className="px-2.5 py-1.5">KELOMPOK ASET</th>
                  <th className="px-2.5 py-1.5">NOMOR ASET</th>
                  <th className="w-16 px-2.5 py-1.5 text-center">QTY</th>
                  <th className="w-24 px-2.5 py-1.5 text-center">KONDISI</th>
                  <th className="px-2.5 py-1.5">CATATAN PEMERIKSAAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.items && data.items.length > 0 ? (
                  data.items.map((it, idx) => (
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
                        {it.kelompokAset || data.kelompokAset || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900">
                        {it.assetNumber || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-semibold text-slate-800">
                        {it.quantity} Unit
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-bold text-emerald-700">
                        Baik &amp; Lengkap
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-600 text-[11px]">
                        {it.notes || data.receiverNotes || 'Sesuai pesanan & berfungsi normal'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-2.5 py-1.5 text-center font-medium text-slate-500">
                      1
                    </td>
                    <td className="px-2.5 py-1.5 font-bold text-slate-900">
                      {data.subject || 'Pengadaan Capex Unit'}
                    </td>
                    <td className="px-2.5 py-1.5 font-medium text-slate-700">
                      {data.kelompokAset || '-'}
                    </td>
                    <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900">-</td>
                    <td className="px-2.5 py-1.5 text-center font-semibold text-slate-800">
                      1 Unit
                    </td>
                    <td className="px-2.5 py-1.5 text-center font-bold text-emerald-700">
                      Baik &amp; Lengkap
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-600 text-[11px]">
                      {data.receiverNotes || 'Sesuai pesanan & berfungsi normal'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Yellow Banner / Pernyataan Resmi */}
          <div className="mt-2.5 flex items-center justify-between rounded-md border border-amber-300 bg-[#ffd700] px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs">
            <span className="text-[10px] tracking-wide uppercase">
              STATUS FISIK BARANG: TELAH DITERIMA &amp; TERVERIFIKASI
            </span>
            <span className="text-[10px] font-semibold text-slate-900 italic">
              Dokumen ini merupakan bukti sah serah terima inventaris aset PT Chitra Paratama
            </span>
          </div>
        </div>
      </div>

      {/* Signature Grid (Work Order Style Horizontal Multi-Column) */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-white/95 text-xs shadow-xs">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="divide-x divide-slate-300 border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-800 uppercase">
              <th className="px-2 py-1.5 text-center">YANG MENYERAHKAN</th>
              <th className="px-2 py-1.5 text-center">DIPERIKSA OLEH (FINANCE)</th>
              <th className="px-2 py-1.5 text-center">DIKETAHUI OLEH (ATASAN)</th>
              <th className="px-2 py-1.5 text-center bg-emerald-50 text-emerald-900">
                YANG MENERIMA (PIC LOKASI)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="divide-x divide-slate-300 border-b border-slate-300 bg-white">
              {/* Yang Menyerahkan */}
              <td className="h-18 p-1.5 text-center align-middle sm:h-20">
                <span className="text-xs font-bold text-slate-800">
                  {data.vendorName || 'Vendor / Supplier'}
                </span>
                <span className="block text-[9px] text-slate-400">Penyerah Barang</span>
              </td>

              {/* Diperiksa Oleh Finance */}
              <td className="h-18 p-1.5 text-center align-middle sm:h-20">
                <span className="text-xs font-bold text-emerald-700">✓ Disetujui</span>
                <span className="block text-[9px] text-slate-500">Finance &amp; Accounting</span>
              </td>

              {/* Diketahui Oleh Atasan */}
              <td className="h-18 p-1.5 text-center align-middle sm:h-20">
                <span className="text-xs font-bold text-emerald-700">✓ Disetujui</span>
                <span className="block text-[9px] text-slate-500">Direksi &amp; Manajemen</span>
              </td>

              {/* Yang Menerima */}
              <td className="h-18 p-1.5 text-center align-middle sm:h-20 bg-emerald-50/20">
                {effectiveReceiverSig ? (
                  <img
                    src={effectiveReceiverSig}
                    alt="Tanda Tangan Penerima"
                    className="mx-auto h-12 w-auto max-w-[95%] object-contain sm:h-14"
                  />
                ) : (
                  <span className="text-[10px] font-medium text-slate-400 italic">
                    (Menunggu tanda tangan penerima)
                  </span>
                )}
              </td>
            </tr>

            <tr className="divide-x divide-slate-300 border-t border-slate-300 bg-slate-50/70">
              {/* Box 1 */}
              <td className="space-y-0.5 px-2 py-2 text-center align-top">
                <p className="truncate text-[11px] leading-snug font-bold text-slate-900">
                  ( {data.vendorName || 'Vendor Rekanan'} )
                </p>
                <p className="truncate text-[10px] leading-snug font-medium text-slate-600">
                  Supplier / Ekspedisi
                </p>
                <p className="font-mono text-[9px] text-slate-500">
                  {formatIndoDate(data.receivedAt || new Date())}
                </p>
              </td>

              {/* Box 2 */}
              <td className="space-y-0.5 px-2 py-2 text-center align-top">
                <p className="truncate text-[11px] leading-snug font-bold text-slate-900">
                  ( {data.financeCheckerName || 'Syamsul Bahri / Evo Dwi'} )
                </p>
                <p className="truncate text-[10px] leading-snug font-medium text-slate-600">
                  Finance &amp; Accounting Specialist
                </p>
                <p className="font-mono text-[9px] text-slate-500">
                  {data.financeCheckedAt ? formatIndoDateTime(data.financeCheckedAt) : '-'}
                </p>
              </td>

              {/* Box 3 */}
              <td className="space-y-0.5 px-2 py-2 text-center align-top">
                <p className="truncate text-[11px] leading-snug font-bold text-slate-900">
                  ( Manajemen PT Chitra Paratama )
                </p>
                <p className="truncate text-[10px] leading-snug font-medium text-slate-600">
                  Approval Direksi Lengkap
                </p>
                <p className="font-mono text-[9px] text-slate-500">Full Approved</p>
              </td>

              {/* Box 4 */}
              <td className="space-y-0.5 px-2 py-2 text-center align-top bg-emerald-50/30">
                <p className="truncate text-[11px] leading-snug font-bold text-emerald-950">
                  ( {data.applicantName} )
                </p>
                <p className="truncate text-[10px] leading-snug font-medium text-emerald-800">
                  {data.applicantJobTitle || 'Penerima Barang / PIC Lokasi'}
                </p>
                <p className="font-mono text-[9px] text-emerald-700">
                  {formatIndoDateTime(data.receivedAt || new Date())}
                </p>
                {data.receiverNotes ? (
                  <p className="line-clamp-2 text-[9px] leading-snug text-slate-600 italic">
                    Catatan: {data.receiverNotes}
                  </p>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
