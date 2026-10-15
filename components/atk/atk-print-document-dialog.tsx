'use client'

import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { AtkStatusBadge } from './atk-status-badge'

type AtkPrintItem = {
  id: number
  displayName: string
  customItemName?: string
  quantity: number
  displayUnit: string
  notes?: string
}

type AtkPrintData = {
  id: number
  requestNumber: string
  requestType: string
  targetRecipientName?: string
  requestDate: Date | string
  status: string
  notes?: string
  requesterSignatureUrl?: string | null
  reviewerNote?: string | null
  reviewedAt?: Date | string | null
  recipientSignatureUrl?: string | null
  recipientName?: string | null
  completedAt?: Date | string | null
  employeeName: string
  employeeSn: string
  employeePosition?: string | null
  siteName: string
  departmentName?: string | null
  reviewerName?: string | null
  items: AtkPrintItem[]
}

export function AtkPrintDocumentDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: AtkPrintData | null
}) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!data) return null

  const handlePrint = () => {
    window.print()
  }

  const formattedDate = new Date(data.requestDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const reviewedDate = data.reviewedAt
    ? new Date(data.reviewedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const completedDate = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-7xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between no-print sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              Formulir Permintaan & Serah Terima ATK ({data.requestNumber})
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 font-semibold text-xs"
            >
              <Printer className="size-4" />
              Cetak Dokumen (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Printable WYSIWYG Document Area */}
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-900/50 flex justify-center">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              body * {
                visibility: hidden;
              }
              .pdf-wrapper,
              .pdf-wrapper * {
                visibility: visible;
              }
              .pdf-wrapper {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                padding: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div
            ref={printRef}
            className="pdf-wrapper bg-white text-slate-900 rounded-lg shadow-sm border border-slate-200 p-8 w-full max-w-[210mm] font-sans text-[10pt] leading-normal"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* Header Document */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black tracking-wide text-slate-900 uppercase">
                    PT. CHITRA PARATAMA
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    GENERAL AFFAIRS (GA) DIVISION — HERO OPERATION PLATFORM
                  </p>
                  <p className="text-[9pt] text-slate-500 mt-0.5">
                    Operational Site: {data.siteName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white font-bold px-3 py-1 text-xs tracking-wider rounded">
                    FORMULIR ATK
                  </span>
                  <p className="text-xs font-mono font-bold mt-2 text-slate-800">
                    No: {data.requestNumber}
                  </p>
                  <p className="text-[9pt] text-slate-500">Tanggal: {formattedDate}</p>
                </div>
              </div>
              <div className="mt-3 text-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-t pt-2">
                  SURAT PERMINTAAN & BUKTI SERAH TERIMA ALAT TULIS KANTOR
                </h2>
              </div>
            </div>

            {/* Metadata Pemohon */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-[9.5pt] bg-slate-50 p-4 rounded border border-slate-200">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Nama Pemohon:</span>
                  <span className="font-bold text-slate-900">{data.employeeName}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">NIK / SN:</span>
                  <span className="text-slate-900">{data.employeeSn || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Departemen:</span>
                  <span className="text-slate-900">{data.departmentName || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Lokasi / Site:</span>
                  <span className="text-slate-900">{data.siteName}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Peruntukan:</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {data.requestType === 'department'
                      ? `Departemen (${data.targetRecipientName || data.departmentName || 'Divisi'})`
                      : 'Kebutuhan Pribadi (Personal)'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Status Terkini:</span>
                  <div>
                    <AtkStatusBadge status={data.status} />
                  </div>
                </div>
                {data.notes && (
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-600">Catatan Pemohon:</span>
                    <span className="italic text-slate-700">{data.notes}</span>
                  </div>
                )}
                {data.reviewerNote && (
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-600">Catatan GA:</span>
                    <span className="text-slate-800 font-medium">{data.reviewerNote}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabel Rincian Barang ATK */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase text-slate-800 mb-2">
                Rincian Barang yang Diminta:
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-[9pt]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 px-3 py-2 text-center w-10">No</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">
                      Nama Barang / Spesifikasi
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-center w-24">Jumlah</th>
                    <th className="border border-slate-300 px-3 py-2 text-center w-20">Satuan</th>
                    <th className="border border-slate-300 px-3 py-2 text-left w-48">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items && data.items.length > 0 ? (
                    data.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 px-3 py-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">
                          {item.displayName}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center text-slate-700">
                          {item.displayUnit}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-600">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-slate-400">
                        Tidak ada item barang
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Kolom Tanda Tangan (3 Kolom: Pemohon, PIC GA, Penerima Barang) */}
            <div className="mt-8 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-3 gap-4 text-center text-[9pt]">
                {/* 1. Diajukan Oleh */}
                <div className="flex flex-col items-center">
                  <p className="font-semibold text-slate-700 mb-1">Diajukan Oleh (Pemohon),</p>
                  <p className="text-[8pt] text-slate-400 mb-2">{formattedDate}</p>
                  <div className="h-24 w-36 border border-dashed border-slate-200 rounded flex items-center justify-center bg-slate-50 overflow-hidden mb-2">
                    {data.requesterSignatureUrl ? (
                      <img
                        src={resolveUploadUrl(data.requesterSignatureUrl)}
                        alt="Tanda Tangan Pemohon"
                        className="max-h-20 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[8pt] text-slate-400 italic">
                        (Tanda Tangan Digital)
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 underline">{data.employeeName}</p>
                  <p className="text-[8.5pt] text-slate-600">SN: {data.employeeSn || '-'}</p>
                </div>

                {/* 2. Disetujui / Disiapkan Oleh */}
                <div className="flex flex-col items-center">
                  <p className="font-semibold text-slate-700 mb-1">
                    Disetujui / Disiapkan (PIC GA),
                  </p>
                  <p className="text-[8pt] text-slate-400 mb-2">
                    {reviewedDate || 'Belum Ditinjau'}
                  </p>
                  <div className="h-24 w-36 border border-dashed border-slate-200 rounded flex items-center justify-center bg-slate-50 overflow-hidden mb-2">
                    {data.status === 'approved' ||
                    data.status === 'ready_for_pickup' ||
                    data.status === 'completed' ? (
                      <div className="text-center p-2">
                        <CheckCircle2 className="size-6 text-emerald-600 mx-auto mb-1" />
                        <span className="text-[7.5pt] font-bold text-emerald-700 block uppercase">
                          GA APPROVED
                        </span>
                      </div>
                    ) : (
                      <span className="text-[8pt] text-slate-400 italic">(Verifikasi GA)</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 underline">
                    {data.reviewerName || 'Petugas GA'}
                  </p>
                  <p className="text-[8.5pt] text-slate-600">General Affairs Officer</p>
                </div>

                {/* 3. Diterima Oleh */}
                <div className="flex flex-col items-center">
                  <p className="font-semibold text-slate-700 mb-1">
                    Diterima Oleh (Serah Terima),
                  </p>
                  <p className="text-[8pt] text-slate-400 mb-2">
                    {completedDate || 'Belum Diambil'}
                  </p>
                  <div className="h-24 w-36 border border-dashed border-slate-200 rounded flex items-center justify-center bg-slate-50 overflow-hidden mb-2">
                    {data.recipientSignatureUrl ? (
                      <img
                        src={resolveUploadUrl(data.recipientSignatureUrl)}
                        alt="Tanda Tangan Penerima"
                        className="max-h-20 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[8pt] text-slate-400 italic">
                        (Tanda Tangan Penerima)
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 underline">
                    {data.recipientName || data.employeeName}
                  </p>
                  <p className="text-[8.5pt] text-slate-600">Penerima Barang</p>
                </div>
              </div>
            </div>

            {/* Footer Dokumen */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex justify-between items-center text-[8pt] text-slate-400">
              <span>Sistem Operasional HERO &bull; PT Chitra Paratama</span>
              <span>Dokumen Bukti Serah Terima Resmi &bull; GA-ATK</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
