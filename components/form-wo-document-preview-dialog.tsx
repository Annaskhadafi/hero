'use client'

import React, { useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isCiptaKridatamaCustomer } from '@/lib/form-wo-customer'

export interface ServiceItemRow {
  id: string
  description?: string
  job?: string
  customer?: string
  site?: string
  serialNo?: string
  refNo?: string
  noPo?: string
  tanggalPo?: string
  noWoCp?: string
  price?: string
}

export interface RepairItemRow {
  id: string
  description?: string
  noUnit?: string
  pos?: string
  size?: string
  brand?: string
  site?: string
  customer?: string
  category?: string
  noPo?: string
  tanggalPo?: string
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
  idWo?: string | number | null
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
  noPo?: string | null
  tanggalPo?: string | null
  tireSn?: string | null
  storeLoc?: string | null
  brand?: string | null
  pattern?: string | null
  size?: string | null
  jobType?: string | null
  noWoTerbit?: string | null
  noWoCp?: string | null
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
      const lines = trimmed
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
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
  const lower = noteText.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (
    !noteText ||
    lower === 'disetujui' ||
    lower === 'wodisetujui' ||
    lower === 'formwodisetujui' ||
    lower === 'approved' ||
    lower === 'woapproved' ||
    lower === 'formwoapproved' ||
    lower === 'approve' ||
    lower === 'ok' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'tidakadacatatan' ||
    lower.includes('disetujui') ||
    lower.includes('approved')
  ) {
    return ''
  }

  return noteText
}

function formatIndoDay(dateVal: Date | string | null | undefined, fallback = '-'): string {
  if (!dateVal) return fallback
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }) || fallback
}

function formatIndoDate(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return '-'
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatIndoTime(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return '-'
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' }).replace(':', '.')} WITA`
}

function formatIndoDateTime(dateVal: Date | string | null | undefined): {
  date: string
  time: string
} {
  if (!dateVal) return { date: '-', time: '-' }
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return { date: String(dateVal), time: '-' }
  return {
    date: d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Makassar',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    time: `${d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' }).replace(':', '.')} WITA`,
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
  const docNoWo = String(doc.noWoTerbit || doc.noWoCp || doc.idWo || '')

  const serviceItemsList = parseItems<ServiceItemRow>(doc.items, [
    {
      id: '1',
      description: doc.deskripsiPekerjaan || 'Labour Service',
      job: doc.jobType || '',
      customer: doc.customer || '',
      site: doc.site || '',
      serialNo: doc.tireSn || '',
      refNo: doc.storeLoc || '',
      noPo: doc.noPo || '',
      tanggalPo: doc.tanggalPo || '',
      noWoCp: docNoWo,
      price: doc.totalAmount || '',
    },
  ]).map((r) => ({
    ...r,
    noWoCp: r.noWoCp || docNoWo || '',
  }))

  const repairItemsList = parseItems<RepairItemRow>(doc.items, [
    {
      id: '1',
      description: doc.tireSn || doc.deskripsiPekerjaan || '',
      noUnit: doc.storeLoc || '',
      brand: doc.brand || '',
      pos: doc.pattern || '',
      size: doc.size || '',
      site: doc.site || '',
      customer: doc.customer || '',
      category: 'R1',
      noPo: doc.noPo || '',
      tanggalPo: doc.tanggalPo || '',
      price: doc.totalAmount || '',
      noWoCp: docNoWo,
    },
  ]).map((r) => ({
    ...r,
    noWoCp: r.noWoCp || docNoWo || '',
  }))

  const isCk =
    !isService &&
    (isCiptaKridatamaCustomer(doc.customer) ||
      repairItemsList.some((r) => isCiptaKridatamaCustomer(r.customer)))

  const serviceTotal = serviceItemsList.reduce(
    (sum, r) => sum + (parseFloat((r.price || '').replace(/[^0-9.-]+/g, '')) || 0),
    0
  )
  const repairTotal = repairItemsList.reduce(
    (sum, r) => sum + (parseFloat((r.price || '').replace(/[^0-9.-]+/g, '')) || 0),
    0
  )

  const rawTotal = isService ? serviceTotal : repairTotal
  const displayTotal = rawTotal > 0 ? formatCurrency(rawTotal) : formatCurrency(doc.totalAmount)

  const headerNoPo = doc.noPo || (isService ? serviceItemsList[0]?.noPo : repairItemsList[0]?.noPo)
  const headerTglPo =
    doc.tanggalPo || (isService ? serviceItemsList[0]?.tanggalPo : repairItemsList[0]?.tanggalPo)

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
    const sortedSteps = [...steps].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    approverCols = sortedSteps.map((s, idx) => {
      const stepLevel = s.level ?? idx + 1
      let header = 'DISETUJUI OLEH'
      let defaultRoleName = 'Approver'

      if (isService) {
        if (stepLevel === 1) {
          header = 'DISETUJUI OLEH'
          defaultRoleName = 'Service Operation Others Coord. SPV'
        } else if (stepLevel === 2) {
          header = 'DIPERIKSA OLEH'
          defaultRoleName = 'Team Billing'
        } else if (stepLevel === 3) {
          header = 'DISETUJUI OLEH'
          defaultRoleName = 'Inventory & Warehouse Management SPV'
        }
      } else {
        if (stepLevel === 1) {
          header = 'DIKETAHUI OLEH'
          defaultRoleName = 'QC / Leader'
        } else if (stepLevel === 2) {
          header = 'DISETUJUI OLEH'
          defaultRoleName = 'Repair / Retread Operation SPV'
        } else if (stepLevel === 3) {
          header = 'DIPERIKSA OLEH'
          defaultRoleName = 'Team Billing'
        } else if (stepLevel === 4) {
          header = 'DISETUJUI OLEH'
          defaultRoleName = 'Inventory & Warehouse Management SPV'
        }
      }

      // Live signature only attaches to the exact step being reviewed by the current user
      const isCurrentActiveStep = Boolean(
        currentLevel && currentLevel > 0 && currentLevel === stepLevel && s.status !== 'approved'
      )

      const signerName = s.approverName || s.jobTitle || defaultRoleName
      const jobTitle = s.jobTitle && s.jobTitle !== 'Approver' ? s.jobTitle : defaultRoleName

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
          key: 'col-1',
          header: 'DISETUJUI OLEH',
          signerName: 'Service Operation Others Coord. SPV',
          jobTitle: 'Service Operation Others Coord. SPV',
          signatureUrl: currentLevel === 1 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 1 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 1 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-2',
          header: 'DIPERIKSA OLEH',
          signerName: 'Team Billing',
          jobTitle: 'Team Billing',
          signatureUrl: currentLevel === 2 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 2 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 2 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-3',
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
          key: 'col-1',
          header: 'DIKETAHUI OLEH',
          signerName: 'QC / Leader',
          jobTitle: 'QC / Leader',
          signatureUrl: currentLevel === 1 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 1 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 1 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-2',
          header: 'DISETUJUI OLEH',
          signerName: 'Repair / Retread Operation SPV',
          jobTitle: 'Repair / Retread Operation SPV',
          signatureUrl: currentLevel === 2 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 2 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 2 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-3',
          header: 'DIPERIKSA OLEH',
          signerName: 'Team Billing',
          jobTitle: 'Team Billing',
          signatureUrl: currentLevel === 3 && liveSignatureUrl ? liveSignatureUrl : null,
          isApproved: currentLevel === 3 && Boolean(liveSignatureUrl),
          dateTime: currentLevel === 3 && liveSignatureUrl ? formatIndoDateTime(new Date()) : null,
          note: null,
        },
        {
          key: 'col-4',
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
      className="print-area relative mx-auto flex min-h-[200mm] w-full max-w-[297mm] flex-col justify-between space-y-2.5 overflow-hidden rounded-lg border border-slate-300 bg-white p-4 font-sans text-slate-900 shadow-sm sm:p-6"
    >
      <div className="space-y-3.5">
        {/* Top Header: Logo on left, Title on far right */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-300/80 pb-3">
          <div className="flex items-center gap-3">
            <img
              src="/cp_logo-removebg-preview.png"
              alt="PT Chitra Paratama"
              className="h-10 w-auto shrink-0 object-contain"
            />
            <div>
              <h2 className="text-sm leading-tight font-bold tracking-tight text-slate-900">
                PT. CHITRA PARATAMA
              </h2>
              <p className="text-[11px] font-semibold tracking-wide text-teal-700">
                Total Tire Solution
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black tracking-tight text-slate-950 uppercase sm:text-lg">
              FORM PERMINTAAN WORK ORDER
            </h1>
            <div className="mt-0.5 flex flex-col items-end gap-0.5 text-right font-mono text-[11px]">
              <p className="text-slate-600">
                No. Pengajuan: <strong className="text-slate-900">{doc.noPengajuan || '-'}</strong>
              </p>
              {docNoWo || serviceItemsList.some((s) => s.noWoCp) || repairItemsList.some((r) => r.noWoCp) ? (
                <p className="font-bold text-emerald-700">
                  No. WO Terbit:{' '}
                  <strong className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-emerald-950">
                    {docNoWo || serviceItemsList.find((s) => s.noWoCp)?.noWoCp || repairItemsList.find((r) => r.noWoCp)?.noWoCp}
                  </strong>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Structured Meta Info Box */}
        <div className="rounded-lg border border-slate-300 bg-white/95 p-3 text-xs shadow-xs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Hari / Tanggal</span>
              <strong className="text-xs text-slate-900">
                {displayDay}, {displayDate}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Jenis Form</span>
              <div
                className={`mt-0.5 w-fit rounded border px-2 py-0.5 text-[11px] font-semibold ${jenisMeta.cls}`}
              >
                {jenisMeta.label}
              </div>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Nama Pemohon</span>
              <strong className="block truncate text-xs text-slate-900">
                {doc.pemohon || '-'}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Customer & Site</span>
              <strong className="block truncate text-xs text-slate-900">
                {doc.customer || '-'} {doc.site ? `• ${doc.site}` : ''}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Nomor & Tgl PO</span>
              <strong className="block truncate font-mono text-xs text-slate-900">
                {headerNoPo ? `${headerNoPo}${headerTglPo ? ` (${headerTglPo})` : ''}` : '-'}
              </strong>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Rincian Permintaan Pekerjaan (Items)
          </h3>

          {isService ? (
            <div className="overflow-hidden rounded-lg border border-slate-300 bg-white/95 shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-semibold text-slate-700 uppercase">
                    <th className="w-8 px-2.5 py-2 text-center">NO</th>
                    <th className="px-2.5 py-2">DESCRIPTION</th>
                    <th className="px-2.5 py-2">JOB</th>
                    <th className="px-2.5 py-2">CUSTOMER</th>
                    <th className="px-2.5 py-2">SITE</th>
                    <th className="px-2.5 py-2">SERIAL NO</th>
                    <th className="px-2.5 py-2">REF NO</th>
                    <th className="px-2.5 py-2">NO PO</th>
                    <th className="px-2.5 py-2">NO WO CP</th>
                    <th className="px-2.5 py-2 text-right">PRICE / AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {serviceItemsList.map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-2.5 py-1.5 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-2.5 py-1.5 font-semibold text-slate-800">
                        {row.description || '-'}
                      </td>
                      <td className="px-2.5 py-1.5">{row.job || '-'}</td>
                      <td className="px-2.5 py-1.5">{row.customer || '-'}</td>
                      <td className="px-2.5 py-1.5">{row.site || '-'}</td>
                      <td className="px-2.5 py-1.5 font-mono text-slate-600">
                        {row.serialNo || '-'}
                      </td>
                      <td className="px-2.5 py-1.5">{row.refNo || '-'}</td>
                      <td className="px-2.5 py-1.5 font-mono">{row.noPo || doc.noPo || '-'}</td>
                      <td className="px-2.5 py-1.5 font-mono">
                        {row.noWoCp || docNoWo || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-medium">
                        {formatCurrency(row.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-300 bg-white/95 shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-semibold text-slate-700 uppercase">
                    <th className="w-8 px-2.5 py-2 text-center">NO</th>
                    <th className="px-2.5 py-2">DESCRIPTION (TIRE SN)</th>
                    {isCk && <th className="px-2.5 py-2">ID UNIT</th>}
                    <th className="px-2.5 py-2">BRAND</th>
                    <th className="px-2.5 py-2">POS</th>
                    <th className="px-2.5 py-2">SIZE</th>
                    <th className="px-2.5 py-2">SITE</th>
                    <th className="px-2.5 py-2">CUSTOMER</th>
                    <th className="px-2.5 py-2">CATEGORY</th>
                    <th className="px-2.5 py-2">NO PO</th>
                    <th className="px-2.5 py-2">NO WO CP</th>
                    <th className="px-2.5 py-2 text-right">PRICE / AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {repairItemsList.map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-2.5 py-1.5 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-2.5 py-1.5 font-semibold text-slate-800">
                        {row.description || '-'}
                      </td>
                      {isCk && <td className="px-2.5 py-1.5">{row.noUnit || '-'}</td>}
                      <td className="px-2.5 py-1.5">{row.brand || '-'}</td>
                      <td className="px-2.5 py-1.5">{row.pos || '-'}</td>
                      <td className="px-2.5 py-1.5">{row.size || '-'}</td>
                      <td className="px-2.5 py-1.5">{row.site || '-'}</td>
                      <td className="px-2.5 py-1.5">{row.customer || '-'}</td>
                      <td className="px-2.5 py-1.5 font-semibold">{row.category || '-'}</td>
                      <td className="px-2.5 py-1.5 font-mono">{row.noPo || doc.noPo || '-'}</td>
                      <td className="px-2.5 py-1.5 font-mono">
                        {row.noWoCp || docNoWo || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-medium">
                        {formatCurrency(row.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-amber-300 bg-[#ffd700] px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs sm:text-sm">
            <span className="text-[11px] tracking-wide uppercase">TOTAL AMOUNT</span>
            <span className="font-mono text-xs font-black sm:text-sm">{displayTotal}</span>
          </div>
        </div>
      </div>

      {/* Signature Grid */}
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-300 bg-white/95 text-xs shadow-xs">
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
                <td key={col.key} className="h-18 p-1.5 text-center align-middle sm:h-22">
                  {col.signatureUrl ? (
                    <img
                      src={col.signatureUrl}
                      alt={`Tanda Tangan ${col.jobTitle}`}
                      className="mx-auto h-12 w-auto max-w-[95%] object-contain sm:h-16"
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
            <tr className="divide-x divide-slate-300 border-t border-slate-300 bg-slate-50/70">
              {signatureColumns.map((col) => {
                const cleanNote = extractCleanNote(col.note)
                return (
                  <td key={col.key} className="space-y-1 px-2 py-2.5 text-center align-top">
                    <p className="truncate text-[11px] leading-snug font-bold text-slate-900">
                      ( {col.signerName} )
                    </p>
                    <p className="truncate text-[10px] leading-snug font-medium text-slate-600">
                      {col.jobTitle}
                    </p>
                    <p className="font-mono text-[9px] leading-snug text-slate-500">
                      {col.dateTime ? `${col.dateTime.date} • ${col.dateTime.time}` : '-'}
                    </p>
                    {cleanNote ? (
                      <p className="line-clamp-2 text-[9px] leading-snug text-slate-500 italic">
                        Catatan: {cleanNote}
                      </p>
                    ) : null}
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
  onEdit,
  canEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: FormWoDocumentData | null
  liveSignatureUrl?: string | null
  currentLevel?: number
  onEdit?: () => void
  canEdit?: boolean
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
    `,
  })

  if (!doc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[96vw] overflow-y-auto rounded-2xl border border-slate-300 bg-slate-200/80 p-0 shadow-2xl sm:max-w-[96vw] lg:max-w-[1340px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Preview Dokumen Form WO</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center p-4 sm:p-6">
          <div className="mb-4 flex w-full max-w-[297mm] flex-wrap items-center justify-end gap-2">
            {doc.id ? (
              <a href={`/api/form-wo/${doc.id}/pdf`} download={`Form_WO_${doc.id}.pdf`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer border-sky-300 bg-sky-50 font-semibold text-sky-800 shadow-xs hover:bg-sky-100"
                >
                  <Download className="mr-1.5 h-4 w-4 text-sky-600" />
                  Download PDF
                </Button>
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="border-slate-300 bg-white font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Cetak Printer
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
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
