'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  MapPin,
  Printer,
  ShieldAlert,
  User,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export interface DisciplinaryLetterData {
  id: number
  letterNumber?: string | null
  spLevel: string
  employeeName: string | null
  employeeSn?: string | null
  department?: string | null
  position?: string | null
  jobTitle?: string | null
  siteName?: string | null
  categoryCode?: string | null
  categoryName?: string | null
  severity?: string | null
  violationDate: Date | string
  effectiveDate: Date | string
  expiryDate?: Date | string | null
  description?: string | null
  actionTaken?: string | null
  issuedBy?: string | null
  issuerDepartment?: string | null
  issuerSignature?: string | null
  useLetterhead?: boolean | null
  notes?: string | null
  status?: string | null
}

interface DisciplinaryLetterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: DisciplinaryLetterData | null
}

export function DisciplinaryLetterDialog({
  open,
  onOpenChange,
  data,
}: DisciplinaryLetterDialogProps) {
  const [useLetterheadPreview, setUseLetterheadPreview] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (data) {
      setUseLetterheadPreview(Boolean(data.useLetterhead))
    }
  }, [data])

  if (!data) return null

  const handlePrint = () => {
    const printableElement = document.getElementById('printable-disciplinary-letter')
    if (!printableElement) {
      window.print()
      return
    }

    // Buat iframe terisolasi agar dialog dan navbar aplikasi tidak tercetak / menjadi 4 halaman
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      window.print()
      return
    }

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.letterNumber || 'Surat Sanksi Disiplin'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              height: 297mm;
              max-height: 297mm;
              overflow: hidden;
            }
            * {
              box-sizing: border-box;
            }
            #printable-disciplinary-letter {
              width: 100% !important;
              max-width: 100% !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              border: none !important;
              box-shadow: none !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          </style>
          <link rel="stylesheet" href="/_next/static/css/app/layout.css" />
        </head>
        <body>
          ${printableElement.outerHTML}
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      try {
        iframe.contentWindow?.print()
      } catch {
        window.print()
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1500)
      }
    }, 400)
  }

  const spTitle = getSpFullTitle(data.spLevel)
  const letterNo =
    data.letterNumber?.trim() ||
    `CP/HC-DISC/${new Date().getFullYear()}/${String(data.id).padStart(4, '0')}`

  const violationFormatted = formatDateIndo(data.violationDate)
  const effectiveFormatted = formatDateIndo(data.effectiveDate)
  const expiryFormatted = data.expiryDate ? formatDateIndo(data.expiryDate) : 'Selesai / Sesuai Ketentuan'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden sm:max-w-4xl max-h-[95vh] flex flex-col bg-slate-100"
        data-testid="disciplinary-letter-modal"
      >
        {/* Modal Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <FileText className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide">
                Pratinjau Surat Sanksi Disiplin
              </h3>
              <p className="text-[11px] text-slate-400">
                Format Standar Dokumen Human Capital PT Chitra Paratama
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Background Letterhead */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              <span className="text-[11px] text-slate-300 font-medium">Letterhead BG</span>
              <button
                type="button"
                role="switch"
                aria-checked={useLetterheadPreview}
                onClick={() => setUseLetterheadPreview((prev) => !prev)}
                className={`w-8 h-4 rounded-full transition-colors relative focus:outline-none ${
                  useLetterheadPreview ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`block w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                    useLetterheadPreview ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={handlePrint}
              className="h-8 px-3 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-blue-500 font-semibold"
            >
              <Printer className="size-3.5" />
              <span>Cetak (1 Lembar A4)</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-200/70">
          {/* A4 Paper Sheet (Exact Single Page Proportions) */}
          <div
            id="printable-disciplinary-letter"
            className={`w-full max-w-[760px] bg-white text-slate-900 shadow-xl rounded-sm border border-slate-300 relative text-[11px] leading-relaxed transition-all ${
              useLetterheadPreview
                ? 'pt-28 pb-16 px-10'
                : 'p-8 sm:p-10'
            }`}
            style={{
              minHeight: '1000px',
              backgroundImage: useLetterheadPreview ? 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)' : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Kop Surat Bersih (Muncul hanya jika tidak pakai letterhead) */}
            {!useLetterheadPreview && (
              <div className="border-b-2 border-slate-900 pb-3 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-44 h-12">
                      <Image
                        src="/cp_logo-removebg-preview.png"
                        alt="PT Chitra Paratama"
                        fill
                        className="object-contain object-left"
                        priority
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <h1 className="text-sm font-extrabold tracking-tight text-slate-900 uppercase">
                      PT CHITRA PARATAMA
                    </h1>
                    <p className="text-[10px] font-bold text-slate-700">
                      HUMAN CAPITAL & INDUSTRIAL RELATIONS DEPARTMENT
                    </p>
                    <p className="text-[9px] text-slate-500 max-w-xs mt-0.5">
                      Gedung TMT 1, Lantai 7, Jl. Cilandak KKO No. 1, Jakarta Selatan 12560
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Judul & Nomor Surat */}
            <div className={`text-center ${useLetterheadPreview ? 'mb-3' : 'my-3'}`}>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 underline decoration-2 underline-offset-4">
                {spTitle}
              </h2>
              <p className="text-[10.5px] font-semibold text-slate-700 mt-0.5 font-mono">
                Nomor: {letterNo}
              </p>
            </div>

            {/* Diktum Pembuka */}
            <div className="space-y-2.5 mb-3 text-justify">
              <p className="text-[11px]">
                Surat ini diterbitkan oleh Manajemen Human Capital PT Chitra Paratama
                berdasarkan ketentuan Peraturan Perusahaan (PP) / Perjanjian Kerja Bersama (PKB) yang
                berlaku, ditujukan kepada karyawan:
              </p>

              {/* Tabel Identitas Karyawan */}
              <div className="bg-slate-50/90 border border-slate-200 rounded p-2.5 space-y-1 text-[10.5px]">
                <div className="grid grid-cols-12 gap-1.5">
                  <span className="col-span-4 sm:col-span-3 font-semibold text-slate-700">
                    Nama Karyawan
                  </span>
                  <span className="col-span-1 text-center font-bold">:</span>
                  <span className="col-span-7 sm:col-span-8 font-bold text-slate-900">
                    {data.employeeName || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1.5">
                  <span className="col-span-4 sm:col-span-3 font-semibold text-slate-700">
                    Nomor Induk / SN
                  </span>
                  <span className="col-span-1 text-center font-bold">:</span>
                  <span className="col-span-7 sm:col-span-8 font-mono font-medium text-slate-800">
                    {data.employeeSn || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1.5">
                  <span className="col-span-4 sm:col-span-3 font-semibold text-slate-700">
                    Jabatan / Posisi
                  </span>
                  <span className="col-span-1 text-center font-bold">:</span>
                  <span className="col-span-7 sm:col-span-8 text-slate-800">
                    {data.position || data.jobTitle || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1.5">
                  <span className="col-span-4 sm:col-span-3 font-semibold text-slate-700">
                    Departemen
                  </span>
                  <span className="col-span-1 text-center font-bold">:</span>
                  <span className="col-span-7 sm:col-span-8 text-slate-800">
                    {data.department || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1.5">
                  <span className="col-span-4 sm:col-span-3 font-semibold text-slate-700">
                    Lokasi Penempatan (Site)
                  </span>
                  <span className="col-span-1 text-center font-bold">:</span>
                  <span className="col-span-7 sm:col-span-8 text-slate-800">
                    {data.siteName || 'Head Office / Central Operation'}
                  </span>
                </div>
              </div>

              {/* Bagian Menimbang / Latar Belakang */}
              <div className="space-y-1 mt-2.5">
                <p className="font-bold text-slate-900 text-[10.5px] tracking-wide">MENIMBANG & MENGINGAT:</p>
                <ol className="list-decimal pl-5 space-y-1 text-[10.5px] text-slate-700">
                  <li>
                    Bahwa pada tanggal{' '}
                    <strong className="text-slate-900">{violationFormatted}</strong>, Saudara/i telah
                    terbukti melakukan tindakan indisipliner / pelanggaran tata tertib kerja dengan
                    klasifikasi{' '}
                    <strong className="text-slate-900">
                      [{data.categoryCode || 'KODE'}] {data.categoryName || 'Pelanggaran Disiplin'}
                    </strong>{' '}
                    (Tingkat Keparahan / Severity:{' '}
                    <span className="uppercase font-semibold text-slate-900">
                      {data.severity || 'Medium'}
                    </span>
                    ).
                  </li>
                  <li>
                    Bahwa rincian kronologi atau bentuk tindakan pelanggaran yang dilakukan adalah
                    sebagai berikut:
                    <div className="mt-0.5 p-1.5 bg-slate-50 border-l-2 border-amber-500 rounded text-slate-800 italic text-[10px]">
                      &quot;{data.description || 'Pelanggaran ketentuan tata tertib kerja perusahaan.'}&quot;
                    </div>
                  </li>
                  {data.actionTaken && (
                    <li>
                      Tindakan pembinaan langsung yang telah dilakukan:{' '}
                      <strong className="text-slate-900">{data.actionTaken}</strong>.
                    </li>
                  )}
                  <li>
                    Bahwa perbuatan tersebut melanggar ketentuan tata tertib serta kode etik
                    perusahaan yang termaktub dalam Peraturan Perusahaan PT Chitra Paratama.
                  </li>
                </ol>
              </div>

              {/* Diktum Memutuskan */}
              <div className="space-y-1 mt-2.5">
                <p className="font-bold text-slate-900 text-[10.5px] tracking-wide">MEMUTUSKAN:</p>
                <div className="p-2 bg-blue-50/70 border border-blue-200 rounded text-[10.5px] space-y-1 text-slate-800">
                  <p>
                    1. Menjatuhkan sanksi administratif berupa{' '}
                    <strong className="text-blue-900 uppercase underline">
                      {spTitle}
                    </strong>{' '}
                    kepada Saudara/i yang bersangkutan.
                  </p>
                  <p>
                    2. Masa berlaku sanksi ini terhitung efektif sejak tanggal{' '}
                    <strong className="text-slate-900">{effectiveFormatted}</strong> sampai dengan{' '}
                    <strong className="text-slate-900">{expiryFormatted}</strong> (masa evaluasi pembinaan).
                  </p>
                  <p>
                    3. Apabila selama masa berlakunya sanksi ini Saudara/i kembali melakukan pelanggaran
                    disiplin kerja dalam bentuk apapun, maka Manajemen Perusahaan akan memberikan sanksi
                    yang lebih berat hingga Pemutusan Hubungan Kerja (PHK) sesuai ketentuan perundang-undangan.
                  </p>
                </div>
              </div>

              <p className="text-[10px] pt-0.5">
                Demikian surat sanksi disipliner ini diterbitkan untuk menjadi perhatian serius dan
                dijadikan momentum perbaikan kinerja, dedikasi, serta kepatuhan di lingkungan kerja PT
                Chitra Paratama.
              </p>
            </div>

            {/* Tanggal & Tempat Terbit (Tanpa kata "Diterbitkan di:") */}
            <div className="text-right text-[11px] text-slate-700 mb-3">
              <p>
                <span className="font-medium text-slate-900">
                  {data.siteName || 'Jakarta'}
                </span>
                , {effectiveFormatted}
              </p>
            </div>

            {/* Blok Tanda Tangan: HANYA TTD HUMAN CAPITAL (Pembuat Surat), TANPA TTD Karyawan Pelanggar */}
            <div className="flex justify-end pt-1 text-center text-[11px]">
              <div className="flex flex-col items-center min-w-[200px]">
                <p className="font-semibold text-slate-700">Diterbitkan Oleh,</p>
                <div className="h-16 flex items-center justify-center my-0.5">
                  {data.issuerSignature && data.issuerSignature.startsWith('data:image/') ? (
                    <img
                      src={data.issuerSignature}
                      alt="Tanda Tangan Human Capital"
                      className="max-h-16 max-w-[150px] object-contain"
                    />
                  ) : (
                    <div className="h-12 w-36 border-b border-dashed border-slate-300" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {data.issuedBy || 'Human Capital Dept'}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {data.issuerDepartment || 'Human Capital & Industrial Relations'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Lembar Cetak (Hanya tampil bila tanpa letterhead) */}
            {!useLetterheadPreview && (
              <div className="mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
                <span>Dokumen HC PT Chitra Paratama • Dicetak via HERO Desktop</span>
                <span className="font-mono">ID: {data.id} • {data.status?.toUpperCase() || 'ACTIVE'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Global Print Style: Enforce exact 1 Page A4 */}
        <style jsx global>{`
          @media print {
            html, body {
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
            }
            body * {
              visibility: hidden !important;
            }
            #printable-disciplinary-letter,
            #printable-disciplinary-letter * {
              visibility: visible !important;
            }
            #printable-disciplinary-letter {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              max-width: 100% !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}

function getSpFullTitle(spLevel: string): string {
  const norm = (spLevel || '').toLowerCase()
  if (norm === 'teguran' || norm.includes('lisan') || norm.includes('pembinaan')) {
    return 'SURAT TEGURAN TERTULIS / PEMBINAAN'
  }
  if (norm === 'sp1') return 'SURAT PERINGATAN PERTAMA (SP I)'
  if (norm === 'sp2') return 'SURAT PERINGATAN KEDUA (SP II)'
  if (norm === 'sp3') return 'SURAT PERINGATAN KETIGA / TERAKHIR (SP III)'
  if (norm === 'skorsing') return 'SURAT KEPUTUSAN SKORSING SEMENTARA'
  if (norm === 'termination' || norm === 'phk') {
    return 'SURAT PEMUTUSAN HUBUNGAN KERJA (PHK)'
  }
  return `SURAT TINDAKAN DISIPLIN (${(spLevel || '').toUpperCase()})`
}

function formatDateIndo(value?: Date | string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

