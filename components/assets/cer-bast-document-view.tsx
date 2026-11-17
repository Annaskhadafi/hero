'use client'

import React, { useState } from 'react'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Maximize2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

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
  goodsPhotoUrl?: string | null
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
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
                  <th className="px-2.5 py-1.5">CATATAN PENERIMAAN / BAST</th>
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
                      <td className="px-2.5 py-1.5 text-slate-600 text-[11px]">
                        {data.receiverNotes || it.notes || 'Sesuai pesanan & berfungsi normal'}
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
                    <td className="px-2.5 py-1.5 text-slate-600 text-[11px]">
                      {data.receiverNotes || 'Sesuai pesanan & berfungsi normal'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Lampiran Dokumentasi Fisik Aset */}
          <div className="mt-2.5 rounded-lg border border-slate-300 bg-slate-50/80 p-2 text-xs">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500"></span>
                LAMPIRAN DOKUMENTASI FISIK ASET (FOTO PENERIMAAN)
              </span>
              <span className="text-[9px] text-slate-500 italic">
                Bukti visual kondisi fisik saat serah terima di lokasi
              </span>
            </div>
            {data.goodsPhotoUrl ? (
              <div className="flex items-start gap-4">
                <div
                  onClick={() => setIsLightboxOpen(true)}
                  className="h-72 w-[460px] shrink-0 rounded-lg border border-slate-300 bg-white p-2 overflow-hidden shadow-xs flex items-center justify-center cursor-zoom-in group relative hover:border-sky-400 transition-colors"
                  title="Klik untuk memperbesar foto aset (resolusi penuh)"
                >
                  <img
                    src={resolveUploadUrl(data.goodsPhotoUrl)}
                    alt="Foto Fisik Aset"
                    className="h-full w-full object-contain rounded transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-md font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-sm pointer-events-none">
                    <Maximize2 className="h-3 w-3 text-sky-400" />
                    <span>Lihat Ukuran Penuh</span>
                  </div>
                </div>
                <div className="space-y-2 text-[11px] text-slate-700 py-1 flex-1">
                  <p className="font-bold text-slate-900 text-xs">Verifikasi Kondisi Fisik Barang:</p>
                  <div className="rounded-md border border-slate-200 bg-white/90 p-3 shadow-2xs">
                    <p className="text-slate-700 italic leading-relaxed text-xs">
                      "{data.receiverNotes || 'Barang telah diterima lengkap, segel utuh, dan berfungsi normal sesuai spesifikasi.'}"
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-emerald-800 font-semibold pt-1">
                    Status: Foto Fisik Terlampir • {formatIndoDateTime(data.receivedAt || new Date())}
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    * Klik bingkai foto di samping untuk melihat tampilan foto aset dalam resolusi penuh.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 rounded border border-dashed border-slate-300 bg-white/70 text-slate-400 text-[10px] italic">
                (Foto fisik barang belum diunggah — silakan ambil / unggah foto pada panel kanan)
              </div>
            )}
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

      {/* Signature Grid (Work Order Style Horizontal 2-Column) */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-white/95 text-xs shadow-xs">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="divide-x divide-slate-300 border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-800 uppercase">
              <th className="w-1/2 px-2 py-1.5 text-center">YANG MENYERAHKAN</th>
              <th className="w-1/2 px-2 py-1.5 text-center bg-emerald-50 text-emerald-900">
                YANG MENERIMA
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
              {/* Box 1: Yang Menyerahkan */}
              <td className="space-y-0.5 px-3 py-2 text-center align-top">
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

              {/* Box 2: Yang Menerima */}
              <td className="space-y-0.5 px-3 py-2 text-center align-top bg-emerald-50/30">
                <p className="truncate text-[11px] leading-snug font-bold text-emerald-950">
                  ( {data.applicantName} )
                </p>
                <p className="truncate text-[10px] leading-snug font-semibold text-emerald-800">
                  {data.applicantJobTitle || 'Pemohon Pengadaan'}
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

      {/* Lightbox Dialog untuk Pratinjau Resolusi Penuh Foto Fisik Aset */}
      {data.goodsPhotoUrl && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-4xl p-2 bg-slate-950/95 border-slate-800 text-white flex flex-col items-center">
            <DialogTitle className="sr-only">Pratinjau Foto Fisik Aset Resolusi Penuh</DialogTitle>
            <div className="relative w-full max-h-[82vh] flex items-center justify-center overflow-hidden p-2">
              <img
                src={resolveUploadUrl(data.goodsPhotoUrl)}
                alt="Foto Fisik Aset Resolusi Penuh"
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
            <div className="w-full px-4 pb-2 text-center text-xs text-slate-300">
              <p className="font-semibold text-white">{data.subject || 'Foto Fisik Serah Terima Aset'}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{data.receiverNotes || 'Kondisi barang telah diverifikasi.'}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
