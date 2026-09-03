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
import { Printer, Download } from 'lucide-react'
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
  if (!rawNote || !rawNote.trim()) return ''
  const trimmed = rawNote.trim()
  let noteText = trimmed
  if (trimmed.startsWith('{') || trimmed.includes('"message"')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed.message === 'string') {
        noteText = parsed.message.trim()
      }
    } catch {
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const p = JSON.parse(lines[i])
          if (p && typeof p.message === 'string' && p.message) {
            noteText = p.message.trim()
            break
          }
        } catch {}
      }
    }
  }

  // Jika catatan hanya template bawaan otomatis (bukan ketikan manual approver), jangan tampilkan
  const lower = noteText.toLowerCase().replace(/[.\s]/g, '')
  if (
    !noteText ||
    lower === 'disetujui' ||
    lower === 'wodisetujui' ||
    lower === 'approved' ||
    lower === '-' ||
    lower === 'none'
  ) {
    return ''
  }

  return noteText
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
  let signatureColumns: Array<{
    key: string
    header: string
    signerName: string
    jobTitle: string
    signatureUrl: string | null
    isApproved: boolean
    dateTime: { date: string; time: string } | null
    note: string | null
  }> = []

  const submitterCol = {
    key: 'col-submitter',
    header: 'DIAJUKAN OLEH',
    signerName: doc.pemohon || 'Pemohon',
    jobTitle: doc.pemohonJobTitle || 'Pemohon',
    signatureUrl: doc.submitterSignatureUrl || null,
    isApproved: true,
    dateTime: formatIndoDateTime(doc.tanggalPengajuan || doc.tanggal),
    note: doc.catatanPengajuan || null,
  }

  let approverCols: Array<{
    key: string
    header: string
    signerName: string
    jobTitle: string
    signatureUrl: string | null
    isApproved: boolean
    dateTime: { date: string; time: string } | null
    note: string | null
  }> = []

  if (steps.length > 0) {
    approverCols = steps.map((s, idx) => {
      let header = 'DISETUJUI OLEH'
      if (isService) {
        if (s.level === 1) header = 'DISETUJUI OLEH'
        else if (s.level === 2) header = 'DIPERIKSA OLEH'
        else if (s.level === 3) header = 'DISETUJUI OLEH'
      } else {
        if (s.level === 1) header = 'DIKETAHUI OLEH'
        else if (s.level === 2) header = 'DISETUJUI OLEH'
        else if (s.level === 3) header = 'DIPERIKSA OLEH'
        else if (s.level === 4) header = 'DISETUJUI OLEH'
      }

      const stepLevel = s.level || idx + 1
      const isCurrentActiveStep =
        s.status === 'pending' ||
        (currentLevel === stepLevel && s.status !== 'approved')

      const signerName = s.approverName || s.jobTitle || 'Approver'
      const jobTitle = s.jobTitle || s.label || 'Approver'

      const sigUrl =
        s.status === 'approved' && s.signatureUrl
          ? s.signatureUrl
          : isCurrentActiveStep && liveSignatureUrl
            ? liveSignatureUrl
            : s.signatureUrl || null

      const isApproved =
        s.status === 'approved' || (isCurrentActiveStep && Boolean(liveSignatureUrl))

      const dateTime = s.reviewedAt
        ? formatIndoDateTime(s.reviewedAt)
        : isCurrentActiveStep && liveSignatureUrl
          ? formatIndoDateTime(new Date())
          : null

      const note = s.decisionNote || null

      return {
        key: `step-${stepLevel}`,
        header,
        signerName,
        jobTitle,
        signatureUrl: sigUrl,
        isApproved,
        dateTime,
        note,
      }
    })
  } else {
    if (isService) {
      approverCols = [
        {
          key: 'col-2',
          header: 'DISETUJUI OLEH',
          signerName: 'Service Operation Others Coord. SPV',
          jobTitle: 'Service Operation Others Coord. SPV',
          signatureUrl: (currentLevel === 1 || currentLevel === 0) && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: (currentLevel === 1 || currentLevel === 0) && Boolean(liveSignatureUrl),
          dateTime: (currentLevel === 1 || currentLevel === 0) && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-3',
          header: 'DIPERIKSA OLEH',
          signerName: 'Team Billing',
          jobTitle: 'Team Billing',
          signatureUrl: currentLevel === 2 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 2 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 2 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-4',
          header: 'DISETUJUI OLEH',
          signerName: 'Inventory & Warehouse Management SPV',
          jobTitle: 'Inventory & Warehouse Management SPV',
          signatureUrl: currentLevel === 3 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 3 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 3 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
      ]
    } else {
      approverCols = [
        {
          key: 'col-2',
          header: 'DIKETAHUI OLEH',
          signerName: 'QC / Leader',
          jobTitle: 'QC / Leader',
          signatureUrl: (currentLevel === 1 || currentLevel === 0) && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: (currentLevel === 1 || currentLevel === 0) && Boolean(liveSignatureUrl),
          dateTime: (currentLevel === 1 || currentLevel === 0) && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-3',
          header: 'DISETUJUI OLEH',
          signerName: 'Repair / Retread Operation SPV',
          jobTitle: 'Repair / Retread Operation SPV',
          signatureUrl: currentLevel === 2 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 2 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 2 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-4',
          header: 'DIPERIKSA OLEH',
          signerName: 'Team Billing',
          jobTitle: 'Team Billing',
          signatureUrl: currentLevel === 3 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 3 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 3 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-5',
          header: 'DISETUJUI OLEH',
          signerName: 'Inventory & Warehouse Management SPV',
          jobTitle: 'Inventory & Warehouse Management SPV',
          signatureUrl: currentLevel === 4 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 4 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 4 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
      ]
    }
  }

  signatureColumns = [submitterCol, ...approverCols]

  const rawDateVal = doc.tanggal || doc.tanggalPengajuan
  const displayDay = doc.hari && doc.hari !== '-' ? doc.hari : formatIndoDay(rawDateVal)
  const displayDate = formatIndoDate(rawDateVal)

  return (
    <div
      ref={containerRef}
      className="print-area relative mx-auto bg-white w-full max-w-[297mm] min-h-[200mm] p-4 sm:p-6 space-y-2.5 text-slate-900 font-sans border border-slate-300 rounded-lg shadow-sm overflow-hidden flex flex-col justify-between"
    >
      <div className="space-y-3.5">
        {/* Top Header: Logo on left, Title on far right */}
        <div className="flex items-center justify-between border-b border-slate-300/80 pb-3 gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/cp_logo-removebg-preview.png"
              alt="PT Chitra Paratama"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                PT. CHITRA PARATAMA
              </h2>
              <p className="text-[11px] font-semibold text-teal-700 tracking-wide">
                Total Tire Solution
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight uppercase">
              FORM PERMINTAAN WORK ORDER
            </h1>
            <div className="flex flex-col items-end gap-0.5 text-right font-mono text-[11px] mt-0.5">
              <p className="text-slate-600">
                No. Pengajuan: <strong className="text-slate-900">{doc.noPengajuan || '-'}</strong>
              </p>
              {doc.noWoTerbit ? (
                <p className="text-emerald-700 font-bold">
                  No. WO Terbit: <strong className="text-emerald-950 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">{doc.noWoTerbit}</strong>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Structured Meta Info Box */}
        <div className="border border-slate-300 bg-white/95 rounded-lg p-3 text-xs shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-500 font-medium block text-[11px]">Hari / Tanggal</span>
              <strong className="text-slate-900 text-xs">{displayDay}, {displayDate}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block text-[11px]">Jenis Form</span>
              <div className={`text-[11px] font-semibold px-2 py-0.5 mt-0.5 border rounded w-fit ${jenisMeta.cls}`}>
                {jenisMeta.label}
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-medium block text-[11px]">Nama Pemohon</span>
              <strong className="text-slate-900 text-xs truncate block">{doc.pemohon || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block text-[11px]">Customer & Site</span>
              <strong className="text-slate-900 text-xs truncate block">
                {doc.customer || '-'} {doc.site ? `• ${doc.site}` : ''}
              </strong>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Rincian Permintaan Pekerjaan (Items)
          </h3>

          {isService ? (
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white/95 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-2.5 w-8 text-center">NO</th>
                    <th className="py-2 px-2.5">DESCRIPTION</th>
                    <th className="py-2 px-2.5">JOB</th>
                    <th className="py-2 px-2.5">CUSTOMER</th>
                    <th className="py-2 px-2.5">SITE</th>
                    <th className="py-2 px-2.5">SERIAL NO</th>
                    <th className="py-2 px-2.5">REF NO</th>
                    <th className="py-2 px-2.5">NO WO CP</th>
                    <th className="py-2 px-2.5 text-right">PRICE / AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {serviceItemsList.map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-1.5 px-2.5 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800">{row.description || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.job || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.customer || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.site || '-'}</td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-600">{row.serialNo || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.refNo || '-'}</td>
                      <td className="py-1.5 px-2.5 font-mono">{row.noWoCp || doc.noWoTerbit || doc.idWo || '-'}</td>
                      <td className="py-1.5 px-2.5 text-right font-medium">{formatCurrency(row.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white/95 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-2.5 w-8 text-center">NO</th>
                    <th className="py-2 px-2.5">DESCRIPTION (TIRE SN)</th>
                    <th className="py-2 px-2.5">NO UNIT</th>
                    <th className="py-2 px-2.5">POS</th>
                    <th className="py-2 px-2.5">SIZE</th>
                    <th className="py-2 px-2.5">SITE</th>
                    <th className="py-2 px-2.5">CUSTOMER</th>
                    <th className="py-2 px-2.5">CATEGORY</th>
                    <th className="py-2 px-2.5">NO WO CP</th>
                    <th className="py-2 px-2.5 text-right">PRICE / AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {repairItemsList.map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-1.5 px-2.5 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800">{row.description || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.noUnit || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.pos || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.size || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.site || '-'}</td>
                      <td className="py-1.5 px-2.5">{row.customer || '-'}</td>
                      <td className="py-1.5 px-2.5 font-semibold">{row.category || '-'}</td>
                      <td className="py-1.5 px-2.5 font-mono">{row.noWoCp || doc.noWoTerbit || doc.idWo || '-'}</td>
                      <td className="py-1.5 px-2.5 text-right font-medium">{formatCurrency(row.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-[#ffd700] text-slate-950 font-bold px-3.5 py-1.5 flex items-center justify-between border border-amber-300 rounded-md text-xs sm:text-sm shadow-xs">
            <span className="tracking-wide uppercase text-[11px]">TOTAL AMOUNT</span>
            <span className="font-mono text-xs sm:text-sm font-black">{displayTotal}</span>
          </div>
        </div>
      </div>

      {/* Signature Grid */}
      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white/95 text-xs shadow-xs mt-3">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px] divide-x divide-slate-300">
              {signatureColumns.map((col) => (
                <th key={col.key} className="py-1.5 px-2 text-center">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="divide-x divide-slate-300 bg-white border-b border-slate-300">
              {signatureColumns.map((col) => (
                <td key={col.key} className="h-18 sm:h-22 p-1.5 text-center align-middle">
                  {col.signatureUrl ? (
                    <img
                      src={col.signatureUrl}
                      alt={`Tanda Tangan ${col.jobTitle}`}
                      className="h-12 sm:h-16 w-auto max-w-[95%] mx-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" width="160" height="50"><path d="M 15 35 C 30 10, 45 40, 65 20 C 85 5, 95 38, 115 18 C 130 5, 140 30, 150 25" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>'
                      }}
                    />
                  ) : col.isApproved ? (
                    <span className="text-xs font-bold text-emerald-700">✓ Disetujui</span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 italic">
                      (Menunggu persetujuan)
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => (
                <td key={col.key} className="pt-1.5 px-1.5 pb-0.5 text-center">
                  <p className="text-[11px] font-bold text-slate-900 truncate">
                    ( {col.signerName} )
                  </p>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => (
                <td key={col.key} className="px-1.5 py-0.5 text-center">
                  <p className="text-[10px] text-slate-600 font-medium truncate">
                    {col.jobTitle}
                  </p>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => (
                <td key={col.key} className="px-1.5 py-0.5 text-center">
                  <p className="text-[9px] text-slate-500 font-mono">
                    {col.dateTime ? `${col.dateTime.date} • ${col.dateTime.time}` : '-'}
                  </p>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-300 bg-slate-50/60">
              {signatureColumns.map((col) => {
                const cleanNote = extractCleanNote(col.note)
                return (
                  <td key={col.key} className="px-1.5 pt-0.5 pb-1.5 text-center align-top">
                    <p className="text-[9px] text-slate-500 line-clamp-2 italic">
                      {cleanNote ? `Catatan: ${cleanNote}` : '-'}
                    </p>
                  </td>
                )
              })}
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
      @page { 
        size: landscape !important; 
        margin: 0 !important; 
      }
      @page :left {
        size: landscape !important;
      }
      @page :right {
        size: landscape !important;
      }
      html, body { 
        margin: 0 !important; 
        padding: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
      @media print {
        body * {
          visibility: hidden;
        }
        .print-area, .print-area * {
          visibility: visible;
        }
        .print-area {
          position: fixed !important;
          inset: 0 !important;
          margin: 0 !important;
          padding: 6mm 10mm 6mm 10mm !important;
          width: 297mm !important;
          height: 210mm !important;
          max-width: 297mm !important;
          max-height: 210mm !important;
          box-shadow: none !important;
          border: none !important;
          overflow: hidden !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          page-break-inside: avoid !important;
        }
      }
    `
  })

  if (!doc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[96vw] lg:max-w-[1340px] w-[96vw] max-h-[94vh] overflow-y-auto p-0 border border-slate-300 rounded-2xl shadow-2xl bg-slate-200/80">
        <DialogHeader className="sr-only">
          <DialogTitle>Preview Dokumen Form WO</DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 flex flex-col items-center">
          <div className="w-full max-w-[297mm] flex flex-wrap items-center justify-end gap-2 mb-4">
            {doc.id ? (
              <a
                href={`/api/form-wo/${doc.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-sky-300 bg-sky-50 font-semibold text-sky-800 hover:bg-sky-100 shadow-xs"
                >
                  <Download className="mr-1.5 h-4 w-4 text-sky-600" />
                  Download PDF Lanskap
                </Button>
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Cetak Printer
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

