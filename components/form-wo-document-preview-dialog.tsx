'use client'

import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ServiceItemRow {
  id: string
  description?: string
  job?: string
  customer?: string
  site?: string
  serialNo?: string
  refNo?: string
  noWoCp?: string
  price?: string
}

export interface RepairItemRow {
  id: string
  description?: string
  noUnit?: string
  pos?: string
  size?: string
  site?: string
  customer?: string
  category?: string
  price?: string
  noWoCp?: string
}

export interface FormWoApprovalStepData {
  level: number
  approverName: string | null
  jobTitle?: string | null
  status?: string | null
  decision?: string | null
  decisionNote?: string | null
  reviewedAt?: Date | string | null
  signatureUrl?: string | null
}

export interface FormWoDocumentData {
  id?: number
  noPengajuan?: string | null
  jenisPengajuan?: string | null
  hari?: string | null
  tanggal?: string | null
  tanggalPengajuan?: Date | string | null
  pemohon?: string | null
  pemohonJobTitle?: string | null
  customer?: string | null
  site?: string | null
  deskripsiPekerjaan?: string | null
  catatanPengajuan?: string | null
  totalAmount?: string | null
  items?: string | null
  tireSn?: string | null
  storeLoc?: string | null
  brand?: string | null
  pattern?: string | null
  size?: string | null
  jobType?: string | null
  noWoTerbit?: string | null
  statusPengajuan?: string | null
  signatureUrl?: string | null
  submitterSignatureUrl?: string | null
  approverName?: string | null
  reviewedAt?: Date | string | null
  steps?: FormWoApprovalStepData[]
}

function parseItems<T>(rawItems: string | null | undefined, fallback: T[]): T[] {
  if (!rawItems || !rawItems.trim()) return fallback
  try {
    const parsed = JSON.parse(rawItems)
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

function formatCurrency(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '-'
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
  if (isNaN(num)) return String(val)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function extractCleanNote(rawNote: string | null | undefined): string {
  if (!rawNote || !rawNote.trim()) return '-'
  const trimmed = rawNote.trim()
  if (trimmed.startsWith('{') || trimmed.includes('"message"')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed.message === 'string') {
        return parsed.message || '-'
      }
    } catch {
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const p = JSON.parse(lines[i])
          if (p && typeof p.message === 'string' && p.message) return p.message
        } catch {}
      }
    }
  }
  return trimmed || '-'
}

function formatIndoDay(dateVal: Date | string | null | undefined, fallback = '-'): string {
  if (!dateVal) return fallback
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return fallback
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[d.getDay()] || fallback
}

function formatIndoDate(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return '-'
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatIndoTime(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return '-'
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
}

function formatIndoDateTime(dateVal: Date | string | null | undefined): { date: string; time: string } {
  if (!dateVal) return { date: '-', time: '-' }
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return { date: String(dateVal), time: '-' }
  return {
    date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: `${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
  }
}

const JENIS_CONFIG: Record<string, { label: string; cls: string }> = {
  repair: { label: 'Repair', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  service: { label: 'Service', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  retread: { label: 'Retread', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  non_repair: { label: 'Non Repair', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
}

export function FormWoDocumentView({
  doc,
  containerRef,
  liveSignatureUrl,
  currentLevel = 1,
}: {
  doc: FormWoDocumentData
  containerRef?: React.Ref<HTMLDivElement>
  liveSignatureUrl?: string | null
  currentLevel?: number
}) {
  const isService = doc.jenisPengajuan === 'service'
  const serviceItemsList = parseItems<ServiceItemRow>(doc.items, [
    {
      id: '1',
      description: doc.deskripsiPekerjaan || 'Labour Service',
      job: doc.jobType || '',
      customer: doc.customer || '',
      site: doc.site || '',
      serialNo: doc.tireSn || '',
      refNo: doc.storeLoc || '',
      noWoCp: doc.noWoTerbit || '',
      price: doc.totalAmount || '',
    },
  ])

  const repairItemsList = parseItems<RepairItemRow>(doc.items, [
    {
      id: '1',
      description: doc.tireSn || doc.deskripsiPekerjaan || '',
      noUnit: doc.storeLoc || '',
      pos: doc.pattern || '',
      size: doc.size || '',
      site: doc.site || '',
      customer: doc.customer || '',
      category: doc.brand || 'R1',
      price: doc.totalAmount || '',
      noWoCp: doc.noWoTerbit || '',
    },
  ])

  const serviceTotal = serviceItemsList.reduce(
    (sum, r) => sum + (parseFloat((r.price || '').replace(/[^0-9.-]+/g, '')) || 0),
    0
  )
  const repairTotal = repairItemsList.reduce(
    (sum, r) => sum + (parseFloat((r.price || '').replace(/[^0-9.-]+/g, '')) || 0),
    0
  )

  const rawTotal = isService ? serviceTotal : repairTotal
  const displayTotal =
    rawTotal > 0 ? formatCurrency(rawTotal) : formatCurrency(doc.totalAmount)

  const jenisMeta = JENIS_CONFIG[doc.jenisPengajuan || ''] || {
    label: doc.jenisPengajuan?.toUpperCase() || 'WORK ORDER',
    cls: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  const steps = doc.steps || []
  const step1 = steps.find((s) => s.level === 1)
  const step2 = steps.find((s) => s.level === 2)
  const step3 = steps.find((s) => s.level === 3)
  const step4 = steps.find((s) => s.level === 4)
  const step5 = steps.find((s) => s.level === 5)

  const signatureColumns = [
    {
      key: 'col-1',
      header: 'DIAJUKAN OLEH',
      signerName: doc.pemohon || step1?.approverName || 'Admin CP Site',
      jobTitle: step1?.jobTitle || doc.pemohonJobTitle || 'Admin CP Site',
      signatureUrl:
        currentLevel === 1 && liveSignatureUrl
          ? liveSignatureUrl
          : doc.submitterSignatureUrl || step1?.signatureUrl || null,
      isApproved: true,
      dateTime: formatIndoDateTime(doc.tanggalPengajuan || doc.tanggal),
      note: doc.catatanPengajuan || step1?.decisionNote || null,
    },
    {
      key: 'col-2',
      header: 'DISETUJUI OLEH',
      signerName: step2?.approverName || 'QC / Leader',
      jobTitle: step2?.jobTitle || 'QC / Leader',
      signatureUrl:
        currentLevel === 2 && liveSignatureUrl
          ? liveSignatureUrl
          : step2?.signatureUrl || null,
      isApproved: step2?.status === 'approved' || (currentLevel === 2 && Boolean(liveSignatureUrl)),
      dateTime: step2?.reviewedAt
        ? formatIndoDateTime(step2.reviewedAt)
        : currentLevel === 2 && liveSignatureUrl
          ? formatIndoDateTime(new Date())
          : null,
      note: step2?.decisionNote || null,
    },
    {
      key: 'col-3',
      header: 'DISETUJUI OLEH',
      signerName: step3?.approverName || 'Repair / Retread Operation SPV',
      jobTitle: step3?.jobTitle || 'Repair / Retread Operation SPV',
      signatureUrl:
        currentLevel === 3 && liveSignatureUrl
          ? liveSignatureUrl
          : step3?.signatureUrl || null,
      isApproved: step3?.status === 'approved' || (currentLevel === 3 && Boolean(liveSignatureUrl)),
      dateTime: step3?.reviewedAt
        ? formatIndoDateTime(step3.reviewedAt)
        : currentLevel === 3 && liveSignatureUrl
          ? formatIndoDateTime(new Date())
          : null,
      note: step3?.decisionNote || null,
    },
    {
      key: 'col-4',
      header: 'DIPERIKSA OLEH',
      signerName: step4?.approverName || 'Team Billing',
      jobTitle: step4?.jobTitle || 'Team Billing',
      signatureUrl:
        currentLevel === 4 && liveSignatureUrl
          ? liveSignatureUrl
          : step4?.signatureUrl || null,
      isApproved: step4?.status === 'approved' || (currentLevel === 4 && Boolean(liveSignatureUrl)),
      dateTime: step4?.reviewedAt
        ? formatIndoDateTime(step4.reviewedAt)
        : currentLevel === 4 && liveSignatureUrl
          ? formatIndoDateTime(new Date())
          : null,
      note: step4?.decisionNote || null,
    },
    {
      key: 'col-5',
      header: 'MENGETAHUI',
      signerName: step5?.approverName || 'Inventory & Warehouse Management SPV',
      jobTitle: step5?.jobTitle || 'Inventory & Warehouse Management SPV',
      signatureUrl:
        currentLevel === 5 && liveSignatureUrl
          ? liveSignatureUrl
          : step5?.signatureUrl || null,
      isApproved: step5?.status === 'approved' || (currentLevel === 5 && Boolean(liveSignatureUrl)),
      dateTime: step5?.reviewedAt
        ? formatIndoDateTime(step5.reviewedAt)
        : currentLevel === 5 && liveSignatureUrl
          ? formatIndoDateTime(new Date())
          : null,
      note: step5?.decisionNote || null,
    },
  ]

  const rawDateVal = doc.tanggal || doc.tanggalPengajuan
  const displayDay = doc.hari && doc.hari !== '-' ? doc.hari : formatIndoDay(rawDateVal)
  const displayDate = formatIndoDate(rawDateVal)

  return (
    <div
      ref={containerRef}
      className="print-area bg-white p-6 sm:p-8 space-y-6 text-slate-900 font-sans border border-slate-200 rounded-xl shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-5 gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/cp_logo-removebg-preview.png"
            alt="PT Chitra Paratama"
            className="h-12 w-auto object-contain shrink-0"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
              PT. CHITRA PARATAMA
            </h2>
            <p className="text-xs font-semibold text-teal-700 tracking-wide">
              Total Tire Solution
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">
            Form Permintaan Work Order
          </h1>
          <p className="text-xs font-mono text-slate-600 mt-0.5">
            No. Pengajuan:{' '}
            <strong className="text-slate-900">{doc.noPengajuan || '-'}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-500 font-medium block">Hari</span>
          <strong className="text-slate-900 text-sm">{displayDay}</strong>
        </div>
        <div>
          <span className="text-slate-500 font-medium block">Tanggal</span>
          <strong className="text-slate-900 text-sm">
            {displayDate}
          </strong>
        </div>
        <div>
          <span className="text-slate-500 font-medium block">Jenis Form</span>
          <div className={`text-xs font-semibold px-2 py-0.5 mt-0.5 border rounded ${jenisMeta.cls}`}>
            {jenisMeta.label}
          </div>
        </div>
        <div>
          <span className="text-slate-500 font-medium block">Pemohon</span>
          <strong className="text-slate-900 text-sm">{doc.pemohon || '-'}</strong>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200">
        <div>
          <span className="text-slate-500">Customer: </span>
          <strong className="text-slate-900">{doc.customer || '-'}</strong>
        </div>
        <div>
          <span className="text-slate-500">Site: </span>
          <strong className="text-slate-900">{doc.site || '-'}</strong>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Rincian Permintaan Pekerjaan (Items)
        </h3>

        {isService ? (
          <div className="border border-slate-300 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">NO</th>
                  <th className="py-2.5 px-3">DESCRIPTION</th>
                  <th className="py-2.5 px-3">JOB</th>
                  <th className="py-2.5 px-3">CUSTOMER</th>
                  <th className="py-2.5 px-3">SITE</th>
                  <th className="py-2.5 px-3">SERIAL NO</th>
                  <th className="py-2.5 px-3">REF NO</th>
                  <th className="py-2.5 px-3">NO WO CP</th>
                  <th className="py-2.5 px-3 text-right">PRICE / AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {serviceItemsList.map((row: any, idx: number) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{row.description || '-'}</td>
                    <td className="py-2 px-3">{row.job || '-'}</td>
                    <td className="py-2 px-3">{row.customer || '-'}</td>
                    <td className="py-2 px-3">{row.site || '-'}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{row.serialNo || '-'}</td>
                    <td className="py-2 px-3">{row.refNo || '-'}</td>
                    <td className="py-2 px-3 font-mono">{row.noWoCp || '-'}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(row.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-slate-300 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">NO</th>
                  <th className="py-2.5 px-3">DESCRIPTION (TIRE SN)</th>
                  <th className="py-2.5 px-3">NO UNIT</th>
                  <th className="py-2.5 px-3">POS</th>
                  <th className="py-2.5 px-3">SIZE</th>
                  <th className="py-2.5 px-3">SITE</th>
                  <th className="py-2.5 px-3">CUSTOMER</th>
                  <th className="py-2.5 px-3">CATEGORY</th>
                  <th className="py-2.5 px-3">NO WO CP</th>
                  <th className="py-2.5 px-3 text-right">PRICE / AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {repairItemsList.map((row: any, idx: number) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{row.description || '-'}</td>
                    <td className="py-2 px-3">{row.noUnit || '-'}</td>
                    <td className="py-2 px-3">{row.pos || '-'}</td>
                    <td className="py-2 px-3">{row.size || '-'}</td>
                    <td className="py-2 px-3">{row.site || '-'}</td>
                    <td className="py-2 px-3">{row.customer || '-'}</td>
                    <td className="py-2 px-3 font-semibold">{row.category || '-'}</td>
                    <td className="py-2 px-3 font-mono">{row.noWoCp || '-'}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(row.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-[#ffd700] text-slate-900 font-bold px-4 py-2 flex items-center justify-between border-t border-slate-300 text-xs sm:text-sm">
          <span className="tracking-wide uppercase">TOTAL AMOUNT</span>
          <span className="font-mono text-sm sm:text-base">{displayTotal}</span>
        </div>
      </div>

      <div className="border border-slate-300 rounded-lg overflow-x-auto bg-white text-xs">
        <table className="w-full border-collapse table-fixed min-w-[700px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[11px] divide-x divide-slate-300">
              {signatureColumns.map((col) => (
                <th key={col.key} className="py-2 px-2 text-center w-1/5">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="divide-x divide-slate-300 bg-white border-b border-slate-300">
              {signatureColumns.map((col) => (
                <td key={col.key} className="h-24 sm:h-28 p-2 text-center align-middle">
                  {col.signatureUrl ? (
                    <img
                      src={col.signatureUrl}
                      alt={`Tanda Tangan ${col.jobTitle}`}
                      className="h-16 sm:h-20 w-auto max-w-[95%] mx-auto object-contain"
                    />
                  ) : col.isApproved ? (
                    <span className="text-xs font-bold text-emerald-700">✓ Disetujui</span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 italic">
                      (Menunggu persetujuan)
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => (
                <td key={col.key} className="pt-2 px-2 pb-0.5 text-center">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    ( {col.signerName} )
                  </p>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => (
                <td key={col.key} className="px-2 py-0.5 text-center">
                  <p className="text-[11px] text-slate-600 font-medium truncate">
                    {col.jobTitle}
                  </p>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => (
                <td key={col.key} className="px-2 py-0.5 text-center">
                  <p className="text-[10px] text-slate-500 font-mono">
                    {col.dateTime ? `${col.dateTime.date} • ${col.dateTime.time}` : '-'}
                  </p>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => (
                <td key={col.key} className="px-2 pt-0.5 pb-2 text-center align-top">
                  <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                    {col.note ? `Catatan: ${extractCleanNote(col.note)}` : '-'}
                  </p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useReactToPrint } from 'react-to-print'

export function FormWoDocumentPreviewDialog({
  open,
  onOpenChange,
  doc,
  liveSignatureUrl,
  currentLevel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: FormWoDocumentData | null
  liveSignatureUrl?: string | null
  currentLevel?: number
}) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: doc?.noPengajuan || 'Form WO',
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `
  })

  if (!doc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[96vw] lg:max-w-[1280px] w-[96vw] max-h-[92vh] overflow-y-auto p-0 border border-slate-300 rounded-2xl shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Preview Dokumen Form WO</DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 bg-slate-100">
          <div className="flex justify-end gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Cetak / Unduh PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </Button>
          </div>

          <FormWoDocumentView
            doc={doc}
            containerRef={printRef}
            liveSignatureUrl={liveSignatureUrl}
            currentLevel={currentLevel}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

