'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Bug,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  Download,
  Eye,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  Settings,
  Trash2,
  ChevronDown,
  Sparkles,
  UploadCloud,
  X,
  XCircle,
  Building2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { downloadElementAsPdf, downloadHtmlAsPdf, generateElementAsPdfBlob, generateHtmlAsPdfBlob, downloadFilesAsZip } from '@/lib/pdf-download'

import { AdminPageShell } from '@/components/admin-page-shell'
import { HcWorkspaceBanner, hcPrimaryActionClassName } from '@/components/hc/hc-workspace-banner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EnterpriseActionButtons, type TableRbacAccess } from '@/components/ui/enterprise-table-kit'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { MultiSelectFilterDropdown } from '@/components/ui/multi-select-filter-dropdown'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  createPtwPermitAction,
  deletePtwPermitAction,
  generateTestPtwApproval,
  sendDuePtwReminders,
  batchApprovePtwPermitsAction,
  batchRejectPtwPermitsAction,
  batchRevertPtwPermitsAction,
  singleApprovePtwPermitAction,
  singleRejectPtwPermitAction,
  singleRevertPtwPermitAction,
  savePtwWorkflowSettings,
} from '@/app/dashboard/hse/izin-kerja-ptw/actions'
import {
  DEFAULT_PTW_SETTINGS,
  type PtwWorkflowSettings,
} from '@/lib/workflow-settings-defaults'
import {
  PERMIT_TYPE_OPTIONS,
  EQUIPMENT_CHECKLIST_PER_TYPE,
  HIRADC_PRESETS,
  normalizePermitType,
  normalizePermitTypes,
  getActivePermitTypeKeys,
  getDefaultEquipmentItems as getSharedDefaultEquipmentItems,
  extractCheckedEquipment,
  isItemChecked as isSharedItemChecked,
  getDefaultSubTypes,
  getPermitSubTypes,
  parseApplicantEntry,
  formatVendorApplicantEntry,
  cleanPtwDescription,
} from '@/lib/ptw-helpers'
import { PtwSubTypesEditor } from '@/components/ptw-sub-types-editor'
import { PtwChecklistTable } from '@/components/ptw-checklist-table'

export type PtwListingRow = {
  id: number
  permitNumber: string
  projectName: string
  permitType: string
  location: string
  area: string
  startAt: Date | string | null
  endAt: Date | string | null
  status: string
  riskLevel: string
  applicantName: string
  fieldPicName: string
  authorizedByName: string
  description?: string
  controlSteps?: string
  ppe?: string[]
  subTypes?: Record<string, string[]> | string[]
  gasTestRequired?: boolean
  isolationRequired?: boolean
  hiradcReference?: string
  approvals: Array<{
    stepOrder: number
    stepLabel: string
    status: string
    approverName: string
    approverRole?: string
    signatureDataUrl?: string | null
    signedAt: Date | string | null
    remarks?: string | null
  }>
}

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const APD_OPTIONS = [
  'Helmet',
  'Safety Shoes',
  'Respirator',
  'Full Body Harness',
  'Safety Glasses',
  'Ear Plug',
  'Face Shield',
  'Welding Gloves',
  'Leather Gloves',
  'Dust Mask',
]



function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatPtwDate = formatDate

function formatPtwTime(value: Date | string | null | undefined) {
  if (!value) return '08:00'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '08:00'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  if (s === 'approved' || s === 'completed') {
    return (
      <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none">
        Approved
      </Badge>
    )
  }
  if (s === 'rejected') {
    return (
      <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border-rose-200 shadow-none">
        Rejected
      </Badge>
    )
  }
  if (s === 'reverted') {
    return (
      <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 border-orange-200 shadow-none">
        Reverted
      </Badge>
    )
  }
  if (s === 'in progress' || s === 'in_progress') {
    return (
      <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 border-sky-200 shadow-none">
        In Progress
      </Badge>
    )
  }
  if (s === 'submitted') {
    return (
      <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 shadow-none">
        Submitted
      </Badge>
    )
  }
  if (s === 'draft') {
    return (
      <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200 shadow-none">
        Draft
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200 shadow-none">
      Pending Approval
    </Badge>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const r = (risk || '').toLowerCase()
  if (r === 'critical') {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-tight">
        Critical
      </span>
    )
  }
  if (r === 'high') {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-tight">
        High
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-slate-50 text-slate-600 border border-slate-200 uppercase tracking-tight">
      {risk || 'Medium'}
    </span>
  )
}



function PtwLandscapePdfSheet({
  elementId,
  doc,
  liveRemarks,
  checkedEquipmentOverride,
}: {
  elementId: string
  doc: PtwListingRow
  liveRemarks?: Record<number, string>
  checkedEquipmentOverride?: string[]
}) {
  const step1 = doc.approvals?.find((a) => a.stepOrder === 1 || a.approverRole === 'safety_officer' || a.approverRole === 'pemberi_kerja')
  const pelaksanaApprovals = doc.approvals?.filter((a) => a.approverRole === 'applicant' || a.approverRole === 'pelaksana' || a.approverRole === 'pelaksana_kerja') || []
  const step2 = pelaksanaApprovals[0] || doc.approvals?.find((a) => a.stepOrder === 2)
  const step3 = doc.approvals?.find((a) => a.approverRole === 'field_pic' || a.approverRole === 'safety_dept' || a.approverRole === 'authorized' || a.stepOrder === (doc.approvals?.length || 3))

  const remark1 = (liveRemarks && liveRemarks[1]) || step1?.remarks
  const remark2 = (liveRemarks && liveRemarks[2]) || step2?.remarks
  const remark3 = (liveRemarks && liveRemarks[3]) || step3?.remarks

  const activeKeys = getActivePermitTypeKeys(doc.permitType)
  const columnsToShow = activeKeys.length > 0
    ? activeKeys.map((k) => {
        if (k.includes('Hot')) return 'HOT'
        if (k.includes('Confined')) return 'CONFINED'
        if (k.includes('Digging')) return 'DIGGING'
        if (k.includes('Cold')) return 'COLD'
        return 'ELECTRICAL'
      })
    : ['HOT']
  const gridColsClass =
    columnsToShow.length === 1
      ? 'grid-cols-1'
      : columnsToShow.length === 2
      ? 'grid-cols-2'
      : columnsToShow.length === 3
      ? 'grid-cols-3'
      : columnsToShow.length === 4
      ? 'grid-cols-4'
      : 'grid-cols-5'

  const checkedEquipmentList = checkedEquipmentOverride && checkedEquipmentOverride.length > 0
    ? checkedEquipmentOverride
    : extractCheckedEquipment(doc?.controlSteps, (doc as any)?.checkedEquipment, doc?.permitType)

  return (
    <div
      id={elementId}
      className="pdf-wrapper relative mx-auto w-full max-w-[1122px] min-h-[793px] shrink-0 bg-white shadow-md border-2 border-slate-900 text-slate-900 font-sans text-[8.5pt] p-6 rounded-sm flex flex-col justify-between"
    >
      {/* ── HEADER TABLE ── */}
      <div className="grid grid-cols-[180px_1fr] border-b-2 border-slate-900">
        <div className="flex items-center justify-center p-2 border-r-2 border-slate-900 bg-white">
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-12 object-contain" />
        </div>
        <div className="bg-[#bfe6ff] flex items-center justify-center font-bold text-base tracking-wider uppercase py-2.5 text-slate-900">
          IJIN KERJA BERBAHAYA ( Work Permit )
        </div>
      </div>

      {/* ── FORM META FIELDS ── */}
      <div className="grid grid-cols-12 border-b-2 border-slate-900 text-[8pt]">
        <div className="col-span-4 border-r border-slate-900 p-1.5 bg-slate-50">
          <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{doc?.permitNumber || '—'}</span>
        </div>
        <div className="col-span-8 p-1.5 bg-slate-50">
          <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{(doc?.permitNumber || '').replace('PTW', 'WO')}</span>
        </div>

        <div className="col-span-4 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
          <span className="font-bold block text-[7.5pt] text-slate-500">Nama Pekerja :</span>
          <span className="font-semibold text-slate-900">{doc.applicantName || '—'}</span>
        </div>
        <div className="col-span-3 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
          <span className="font-bold block text-[7.5pt] text-slate-500">Lokasi :</span>
          <span className="font-semibold text-slate-900">{doc.location} {doc.area ? `(${doc.area})` : ''}</span>
        </div>
        <div className="col-span-5 border-t border-slate-900 p-1.5 min-h-[44px]">
          <span className="font-bold block text-[7.5pt] text-slate-500">Uraian Pekerjaan :</span>
          <span className="font-semibold text-slate-900">{doc.projectName || doc.description || '—'}</span>
        </div>

        <div className="col-span-6 border-r border-slate-900 border-t border-slate-900 p-1.5 bg-blue-50/50">
          <span className="font-bold text-slate-800">Referensi HIRADC :</span>{' '}
          <span className="font-semibold text-blue-900">
            {doc.hiradcReference || (doc.description?.match(/\[Referensi HIRADC:\s*(.*?)\]/)?.[1]) || 'JSA-HSE-PTW-2026-001'}
          </span>
        </div>
        <div className="col-span-6 border-t border-slate-900 p-1.5 bg-blue-50/50">
          <span className="font-bold text-slate-800">Tipe Izin Kerja Terpilih :</span>{' '}
          <span className="font-semibold uppercase text-slate-900">{doc.permitType || 'Cold Permit'}</span>
        </div>
      </div>

      {/* ── TABLE TITLE: JENIS PEKERJAAN ── */}
      <div className="bg-[#e2e8f0] text-center font-bold uppercase text-[8.5pt] py-1 border-b-2 border-slate-900">
        JENIS PEKERJAAN
      </div>

      {/* ── UNIFIED TABLE FOR PERMIT TYPES (PERFECT HORIZONTAL & BOTTOM ALIGNMENT) ── */}
      <PtwChecklistTable
        permitType={doc.permitType}
        subTypes={doc?.subTypes}
        checkedEquipment={checkedEquipmentList}
        columnsToShow={columnsToShow}
      />

      {/* ── ALAT PELINDUNG DIRI (APD) WAJIB ── */}
      <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80 flex items-center justify-between">
        <div>
          <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
          <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
            {(doc.ppe && doc.ppe.length > 0 ? doc.ppe : ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness']).map((apd) => (
              <span key={apd} className="inline-block bg-white border border-slate-400 rounded px-2 py-0.5 text-[7.5pt] shadow-2xs">
                ☑ {apd}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 font-bold text-[7.5pt] text-slate-800 shrink-0">
          <span>Gas Test: <strong className="text-emerald-700">{doc.gasTestRequired ? 'WAJIB' : 'TIDAK'}</strong></span>
          <span>LOTO / Isolasi: <strong className="text-emerald-700">{doc.isolationRequired ? 'WAJIB' : 'TIDAK'}</strong></span>
          <span>Risk Level: <strong className="text-rose-700 uppercase">{doc.riskLevel || 'MEDIUM'}</strong></span>
        </div>
      </div>

      {/* ── DESKRIPSI PEKERJAAN ── */}
      <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-white">
        <span className="font-bold block text-[7.5pt] text-slate-900 uppercase tracking-wide">
          DESKRIPSI PEKERJAAN :
        </span>
        <div className="text-[7.5pt] text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap font-medium">
          {cleanPtwDescription(doc.description) || doc.description || doc.additionalNotes || doc.controlSteps || <span className="text-slate-400 italic text-[7pt]">— Tidak ada deskripsi pekerjaan —</span>}
        </div>
      </div>

      {/* ── 3 KOLOM CATATAN VERIFIKASI & QR CODE ── */}
      <div className="grid grid-cols-12 border-b-2 border-slate-900 bg-slate-50/90 text-[8pt] items-stretch min-h-[75px] divide-x divide-slate-900">
        {/* 1. Catatan Pemberi Kerja */}
        <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
          <div>
            <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
              CATATAN PEMBERI KERJA
            </span>
            <div className="text-[7pt] text-slate-700 leading-snug break-words">
              {remark2 || <span className="text-slate-400 italic text-[6.5pt]">Area kerja aman & barikade terpasang.</span>}
            </div>
          </div>
        </div>

        {/* 2. Catatan Pelaksana Pekerjaan */}
        <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
          <div>
            <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
              CATATAN PELAKSANA PEKERJAAN
            </span>
            <div className="text-[7pt] text-slate-700 leading-snug break-words">
              {remark1 || <span className="text-slate-400 italic text-[6.5pt]">Wajib ikuti SOP K3 lokasi kerja.</span>}
            </div>
          </div>
        </div>

        {/* 3. Catatan Safety Dept */}
        <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
          <div>
            <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
              CATATAN SAFETY DEPT
            </span>
            <div className="text-[7pt] text-slate-700 leading-snug break-words">
              {remark3 || <span className="text-slate-400 italic text-[6.5pt]">Peralatan & APAR standby di lokasi.</span>}
            </div>
          </div>
        </div>

        {/* 4. QR Code */}
        {(() => {
          const qrBaseUrl = typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'https://hero.chitraparatama.com'
          const qrTargetUrl = `${qrBaseUrl}/review/ptw/${encodeURIComponent(doc.permitNumber)}`
          return (
            <a
              href={qrTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-3 flex flex-col items-center justify-center p-1.5 border-slate-900 bg-white hover:bg-blue-50/50 cursor-pointer transition-colors no-underline text-slate-900"
              title="Klik / Scan untuk membuka lampiran PTW"
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrTargetUrl)}`}
                alt="QR Code Lampiran PTW"
                className="size-12 object-contain border border-slate-900 p-0.5 bg-white rounded shadow-2xs hover:scale-105 transition-transform"
              />
              <span className="text-[6pt] font-bold text-slate-900 mt-0.5 uppercase text-center underline underline-offset-1">
                Klik / Scan QR
              </span>
            </a>
          )
        })()}
      </div>

      {/* ── MASA BERLAKU IKB ── */}
      <div className="border-b-2 border-slate-900 text-[8pt]">
        <div className="bg-slate-100 text-center font-bold uppercase py-0.5 border-b border-slate-900 text-[8pt]">
          MASA BERLAKU IKB (IJIN KERJA BERBAHAYA)
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-900">
          <div className="grid grid-cols-2 divide-x divide-slate-900 border-r border-slate-900">
            <div className="p-1 text-center">
              <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL MULAI</span>
              <span className="font-semibold">{formatDate(doc.startAt)}</span>
            </div>
            <div className="p-1 text-center">
              <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU MULAI</span>
              <span className="font-semibold">{formatPtwTime(doc.startAt)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-900">
            <div className="p-1 text-center">
              <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL BERAKHIR</span>
              <span className="font-semibold">{formatDate(doc.endAt)}</span>
            </div>
            <div className="p-1 text-center">
              <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU BERAKHIR</span>
              <span className="font-semibold">{formatPtwTime(doc.endAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── VERIFIKASI & TANDA TANGAN (3 COLUMNS: Pemberi Kerja -> Pelaksana Kerja -> Safety Dept) ── */}
      <div className="grid grid-cols-3 divide-x-2 divide-slate-900 border-b-2 border-slate-900 text-[8pt]">
        {/* 1. PEMBERI KERJA */}
        <div className="p-1.5 text-center flex flex-col justify-between">
          <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PEMBERI KERJA</div>
          <div className="h-14 flex items-center justify-center my-1">
            {step1?.status === 'rejected' ? (
              <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak</span>
            ) : step1?.status === 'reverted' ? (
              <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan</span>
            ) : step1?.status === 'approved' && step1?.signatureDataUrl ? (
              <img src={step1.signatureDataUrl} alt="TTD" className="max-h-12 object-contain" />
            ) : step1?.status === 'approved' ? (
              <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui</span>
            ) : (
              <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
            )}
          </div>
          <div className="border-t border-slate-900 pt-1 font-bold">
            {step1?.approverName || doc.fieldPicName || 'NAMA & TANDA TANGAN'}
          </div>
        </div>

        {/* 2. PELAKSANA PEKERJAAN (MULTI) */}
        <div className="p-1.5 text-center flex flex-col justify-between">
          <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PELAKSANA PEKERJAAN</div>
          <div className="min-h-14 flex flex-wrap items-center justify-center gap-2 my-1">
            {pelaksanaApprovals.length > 0 ? (
              pelaksanaApprovals.map((pStep, pIdx) => (
                <div key={pStep.id || pIdx} className="flex flex-col items-center justify-center text-center">
                  {pStep.status === 'rejected' ? (
                    <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak</span>
                  ) : pStep.status === 'reverted' ? (
                    <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan</span>
                  ) : pStep.signatureDataUrl ? (
                    <img src={pStep.signatureDataUrl} alt="TTD" className="max-h-10 object-contain" />
                  ) : pStep.status === 'approved' ? (
                    <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui</span>
                  ) : (
                    <span className="text-[6.5pt] text-slate-400 italic">(Belum Disetujui)</span>
                  )}
                  <span className="text-[6.5pt] text-slate-600 font-semibold mt-0.5">{pStep.approverName}</span>
                </div>
              ))
            ) : (
              <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
            )}
          </div>
          <div className="border-t border-slate-900 pt-1 font-bold text-[7.5pt] truncate" title={pelaksanaApprovals.map((p) => p.approverName).join(', ') || doc.applicantName}>
            {pelaksanaApprovals.map((p) => p.approverName).join(', ') || doc.applicantName || 'NAMA & TANDA TANGAN'}
          </div>
        </div>

        {/* 3. VERIFIKASI (SAFETY DEPT) */}
        <div className="p-1.5 text-center flex flex-col justify-between">
          <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">VERIFIKASI (SAFETY DEPT)</div>
          <div className="h-14 flex items-center justify-center my-1">
            {step3?.status === 'rejected' ? (
              <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak</span>
            ) : step3?.status === 'reverted' ? (
              <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan</span>
            ) : step3?.status === 'approved' && step3?.signatureDataUrl ? (
              <img src={step3.signatureDataUrl} alt="TTD" className="max-h-12 object-contain" />
            ) : step3?.status === 'approved' ? (
              <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui</span>
            ) : (
              <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
            )}
          </div>
          <div className="border-t border-slate-900 pt-1 font-bold">
            {step3?.approverName || doc.authorizedByName || 'NAMA & TANDA TANGAN'}
          </div>
        </div>
      </div>

      {/* ── CATATAN FOOTER ── */}
      <div className="p-2 text-[7pt] space-y-0.5 bg-slate-50 flex items-start justify-between">
        <div>
          <span className="font-bold block text-slate-900">CATATAN :</span>
          <div>1. Ijin kerja ini hanya berlaku untuk satu area kerja saja.</div>
          <div>2. Ijin kerja ini selalu berada ditempat kerja</div>
          <div>3. Dilarang melakukan pekerjaan sebelum ada ijin kerja</div>
        </div>
        <div className="text-right text-slate-500 font-mono text-[6.5pt] pt-1 shrink-0">
          No. Form: CP-F-SHE-026 / P-HSE-SOP-031.00
        </div>
      </div>
    </div>
  )
}

function ApprovalProgressBadge({ approvals }: { approvals: PtwListingRow['approvals'] }) {
  const approved = approvals.filter((a) => a.status === 'approved').length
  const total = approvals.length
  const anyRejected = approvals.some((a) => a.status === 'rejected')

  if (total === 0) {
    return <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs text-slate-400">Belum diajukan</Badge>
  }
  if (anyRejected) {
    return <Badge className="rounded-full px-3 py-0.5 text-xs bg-rose-50 text-rose-700 border-0">Rejected</Badge>
  }
  if (approved === total) {
    return <Badge className="rounded-full px-3 py-0.5 text-xs bg-emerald-50 text-emerald-700 border-0">Completed</Badge>
  }
  return (
    <Badge className="rounded-full px-3 py-0.5 text-xs bg-amber-50 text-amber-700 border-0">
      {approved}/{total} Approved
    </Badge>
  )
}

export function PtwListingClient({
  rows,
  employees = [],
  initialSettings,
}: {
  rows: PtwListingRow[]
  employees?: Array<{ id: number; name: string; position?: string; rank?: string; email?: string }>
  initialSettings?: PtwWorkflowSettings
}) {
  const router = useRouter()
  const access: TableRbacAccess = { canView: true, canEdit: true, canDelete: true }

  // Workflow Settings State
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState<PtwWorkflowSettings>(initialSettings || DEFAULT_PTW_SETTINGS)
  const [approvalRemarks, setApprovalRemarks] = useState<Record<number, string>>({})

  const handleSaveSettings = async () => {
    try {
      const res = await savePtwWorkflowSettings(settingsForm)
      if (res.success) {
        toast.success('Pengaturan workflow PTW berhasil disimpan.')
        setSettingsOpen(false)
      } else {
        toast.error(res.error || 'Gagal menyimpan pengaturan.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan pengaturan.')
    }
  }

  const updateApproverField = (role: 'safetyOfficer' | 'fieldPic' | 'authorizedBy' | 'manager', empId: string) => {
    const emp = employees.find((e: any) => String(e.id) === empId)
    const fieldMap: Record<string, { nameKey: string; emailKey: string }> = {
      safetyOfficer: { nameKey: 'safetyOfficerName', emailKey: 'safetyOfficerEmail' },
      fieldPic: { nameKey: 'fieldPicName', emailKey: 'fieldPicEmail' },
      authorizedBy: { nameKey: 'authorizedByName', emailKey: 'authorizedByEmail' },
      manager: { nameKey: 'managerName', emailKey: 'managerEmail' },
    }
    const mapping = fieldMap[role]
    if (mapping) {
      setSettingsForm((prev) => ({
        ...prev,
        approvalMatrix: {
          ...prev.approvalMatrix,
          [mapping.nameKey]: emp ? emp.name : '',
          [mapping.emailKey]: emp ? (emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@chitraparatama.com`) : '',
        },
      }))
    }
  }

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedRisks, setSelectedRisks] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])

  const typeFilterOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.permitType) set.add(r.permitType)
    })
    return Array.from(set).sort().map((val) => ({ value: val, label: val }))
  }, [rows])

  const statusFilterOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.status) set.add(r.status)
    })
    return Array.from(set).sort().map((val) => ({
      value: val,
      label: val.toUpperCase(),
    }))
  }, [rows])

  const riskFilterOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.riskLevel) set.add(r.riskLevel)
    })
    return Array.from(set).sort().map((val) => ({
      value: val,
      label: val.toUpperCase(),
    }))
  }, [rows])

  const locationFilterOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.location) set.add(r.location)
    })
    return Array.from(set).sort().map((val) => ({ value: val, label: val }))
  }, [rows])

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedTypes.length > 0 ||
      selectedStatuses.length > 0 ||
      selectedRisks.length > 0 ||
      selectedLocations.length > 0
  )

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedTypes([])
    setSelectedStatuses([])
    setSelectedRisks([])
    setSelectedLocations([])
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          (row.permitNumber && row.permitNumber.toLowerCase().includes(q)) ||
          (row.projectName && row.projectName.toLowerCase().includes(q)) ||
          (row.applicantName && row.applicantName.toLowerCase().includes(q)) ||
          (row.fieldPicName && row.fieldPicName.toLowerCase().includes(q)) ||
          (row.location && row.location.toLowerCase().includes(q)) ||
          (row.area && row.area.toLowerCase().includes(q)) ||
          (row.permitType && row.permitType.toLowerCase().includes(q))
        if (!match) return false
      }

      if (selectedTypes.length > 0 && (!row.permitType || !selectedTypes.includes(row.permitType))) {
        return false
      }

      if (selectedStatuses.length > 0 && (!row.status || !selectedStatuses.includes(row.status))) {
        return false
      }

      if (selectedRisks.length > 0 && (!row.riskLevel || !selectedRisks.includes(row.riskLevel))) {
        return false
      }

      if (selectedLocations.length > 0 && (!row.location || !selectedLocations.includes(row.location))) {
        return false
      }

      return true
    })
  }, [rows, searchQuery, selectedTypes, selectedStatuses, selectedRisks, selectedLocations])

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({
      value: String(e.id),
      label: `${e.name} — ${e.rank || e.position || 'Staff'}`,
    }))
  }, [employees])

  const applicantOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: Array<{ value: string; label: string }> = []
    for (const e of employees) {
      if (!e.name) continue
      const label = `${e.name} — ${e.rank || e.position || 'Staff'}`
      const key = `${e.name}|${label}`
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          value: e.name,
          label,
        })
      }
    }
    return list
  }, [employees])

  const employeeNameOptions = applicantOptions

  // Test approval state
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testLinks, setTestLinks] = useState<Array<{ step: number; role: string; name: string; url: string }>>([])
  const [isGeneratingTest, setIsGeneratingTest] = useState(false)

  // Reminders state
  const [isSendingReminders, setIsSendingReminders] = useState(false)

  // 18-Field Create/Edit PTW Modal State
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    projectName: 'Perbaikan Silo Material Kering No. 3 & Corong Inlet',
    hiradcReference: '',
    permitType: 'Cold Permit',
    location: 'Silo Material Kering No. 3',
    area: 'Tire Repair Bay - Sector Utara',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '17:00',
    description: 'Mengeluarkan sisa material yang menggumpal di area corong silo bawah dan inspeksi manual keretakan dinding bagian dalam.',
    controlSteps: '1. Gas test O2, LEL, H2S, CO sebelum masuk.\n2. Blower aktif selama pekerjaan.\n3. Hole watcher standby.\n4. Full body harness dan rescue line wajib.\n5. LOTO area inlet dan outlet.',
    applicantName: 'Budi — Technician',
    fieldPicName: 'Workshop Supervisor Tire Repair',
    status: 'Pending Approval',
    authorizedByName: 'HSE Superintendent',
    riskLevel: 'Critical',
    ppe: ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness'],
    additionalNotes: '',
    gasTestRequired: false,
    isolationRequired: false,
  })

  // External Vendor Worker Form State
  const [vendorModalOpen, setVendorModalOpen] = useState(false)
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    company: '',
  })

  const handleAddVendorApplicant = () => {
    const name = vendorForm.name.trim()
    const email = vendorForm.email.trim().toLowerCase()
    const company = vendorForm.company.trim()

    if (!name) {
      toast.error('Nama pelaksana kerja vendor wajib diisi')
      return
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      toast.error('Email pelaksana kerja vendor tidak valid')
      return
    }

    const formattedEntry = formatVendorApplicantEntry(name, email, company || undefined)
    const current = (createForm.applicantName || '').split(',').map((s) => s.trim()).filter(Boolean)

    if (current.some((c) => c.toLowerCase() === formattedEntry.toLowerCase())) {
      toast.error('Pelaksana kerja vendor ini sudah ditambahkan')
      return
    }

    const next = [...current, formattedEntry]
    setCreateForm({ ...createForm, applicantName: next.join(', ') })
    setVendorForm({ name: '', email: '', company: '' })
    setVendorModalOpen(false)
    toast.success(`Pelaksana vendor ${name} berhasil ditambahkan!`)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedFileName, setAttachedFileName] = useState<string>('')
  const [createAttachments, setCreateAttachments] = useState<string[]>([])
  const [origin, setOrigin] = useState<string>('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedFileName(file.name)
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const entry = `${file.name}||${dataUrl}`
        setCreateAttachments((prev) => [...prev, entry])
        toast.success(`Dokumen pendukung ${file.name} berhasil dilampirkan!`)
      }
      reader.readAsDataURL(file)
    }
  }

  const [checkedEquipment, setCheckedEquipment] = useState<string[]>(() =>
    getSharedDefaultEquipmentItems('Cold Permit')
  )
  const [createSubTypes, setCreateSubTypes] = useState<Record<string, string[]>>(() => getDefaultSubTypes())

  const getDefaultEquipmentItems = (permitTypeStr: string): string[] => {
    return getSharedDefaultEquipmentItems(permitTypeStr)
  }

  const togglePermitTypeOption = (typeValue: string) => {
    let currentTypes = getActivePermitTypeKeys(createForm.permitType)
    let updatedTypes: string[]
    const isRemoving = currentTypes.includes(typeValue)
    if (isRemoving) {
      updatedTypes = currentTypes.filter(t => t !== typeValue)
    } else {
      updatedTypes = [...currentTypes, typeValue]
    }
    const newPermitTypeStr = updatedTypes.join(', ') || 'Cold Permit'

    if (isRemoving) {
      const removedTypeItems = EQUIPMENT_CHECKLIST_PER_TYPE[typeValue]?.items.map((i) => i.label) || []
      setCheckedEquipment((prev) => prev.filter((item) => !removedTypeItems.includes(item)))
    } else {
      const addedTypeItems = EQUIPMENT_CHECKLIST_PER_TYPE[typeValue]?.items.map((i) => i.label) || []
      setCheckedEquipment((prev) => Array.from(new Set([...prev, ...addedTypeItems])))
    }
    setCreateForm((prev) => ({ ...prev, permitType: newPermitTypeStr }))
  }

  const toggleEquipmentItem = (itemLabel: string) => {
    setCheckedEquipment(prev => {
      const next = prev.includes(itemLabel) ? prev.filter(i => i !== itemLabel) : [...prev, itemLabel]
      const formattedLines = next.map((label, idx) => `${idx + 1}. ${label}`).join('\n')
      setCreateForm(f => ({ ...f, controlSteps: formattedLines }))
      return next
    })
  }

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<PtwListingRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  // Batch Multi-Document Approval State
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false)
  const [batchReviewIndex, setBatchReviewIndex] = useState(0)
  const [isBatchActionRunning, setIsBatchActionRunning] = useState(false)

  const selectedBatchRows = useMemo(() => {
    return rows.filter((r) => selectedIds.includes(r.id))
  }, [rows, selectedIds])

  const currentBatchDoc = selectedBatchRows[batchReviewIndex] || selectedBatchRows[0] || null

  const handleSingleApproveCurrent = async () => {
    if (!currentBatchDoc) return
    setIsBatchActionRunning(true)
    try {
      const remarks = approvalRemarks[currentBatchDoc.id]
      const res = await singleApprovePtwPermitAction(currentBatchDoc.id, remarks)
      if (res.success) {
        toast.success(`Izin Kerja ${currentBatchDoc.permitNumber} berhasil disetujui!`)
        if (batchReviewIndex < selectedBatchRows.length - 1) {
          setBatchReviewIndex((prev) => prev + 1)
        } else {
          setIsBatchReviewOpen(false)
          setSelectedIds([])
        }
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menyetujui dokumen.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat approve dokumen.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleSingleRevertCurrent = async () => {
    if (!currentBatchDoc) return
    const reason = approvalRemarks[currentBatchDoc.id] || prompt('Masukkan alasan pengembalian dokumen PTW untuk revisi:')
    if (reason === null) return
    setIsBatchActionRunning(true)
    try {
      const res = await singleRevertPtwPermitAction(currentBatchDoc.id, reason)
      if (res.success) {
        toast.success(`Izin Kerja ${currentBatchDoc.permitNumber} berhasil dikembalikan untuk revisi.`)
        if (batchReviewIndex < selectedBatchRows.length - 1) {
          setBatchReviewIndex((prev) => prev + 1)
        } else {
          setIsBatchReviewOpen(false)
          setSelectedIds([])
        }
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal mengembalikan dokumen.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleSingleRejectCurrent = async () => {
    if (!currentBatchDoc) return
    const reason = approvalRemarks[currentBatchDoc.id]
    if (!confirm(`Apakah Anda yakin ingin menolak Izin Kerja PTW ${currentBatchDoc.permitNumber}?`)) return
    setIsBatchActionRunning(true)
    try {
      const res = await singleRejectPtwPermitAction(currentBatchDoc.id, reason)
      if (res.success) {
        toast.success(`Izin Kerja ${currentBatchDoc.permitNumber} berhasil ditolak.`)
        if (batchReviewIndex < selectedBatchRows.length - 1) {
          setBatchReviewIndex((prev) => prev + 1)
        } else {
          setIsBatchReviewOpen(false)
          setSelectedIds([])
        }
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menolak dokumen.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleBatchApproveAll = async () => {
    if (selectedIds.length === 0) return
    setIsBatchActionRunning(true)
    try {
      const remarks = currentBatchDoc ? approvalRemarks[currentBatchDoc.id] : undefined
      const res = await batchApprovePtwPermitsAction(selectedIds, remarks)
      if (res.success) {
        toast.success(`${res.approvedCount} dari ${selectedIds.length} Izin Kerja PTW berhasil disetujui!`)
        setIsBatchReviewOpen(false)
        setSelectedIds([])
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menyetujui batch PTW.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat batch approve.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleBatchRevertAll = async () => {
    if (selectedIds.length === 0) return
    const reason = prompt(`Masukkan alasan pengembalian ${selectedIds.length} dokumen PTW untuk revisi:`)
    if (reason === null) return
    setIsBatchActionRunning(true)
    try {
      const res = await batchRevertPtwPermitsAction(selectedIds, reason)
      if (res.success) {
        toast.success(`${selectedIds.length} Izin Kerja PTW berhasil dikembalikan untuk revisi.`)
        setIsBatchReviewOpen(false)
        setSelectedIds([])
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal mengembalikan batch.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleBatchRejectAll = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Apakah Anda yakin ingin menolak ${selectedIds.length} Izin Kerja PTW terpilih?`)) return
    setIsBatchActionRunning(true)
    try {
      const res = await batchRejectPtwPermitsAction(selectedIds)
      if (res.success) {
        toast.success(`${selectedIds.length} Izin Kerja PTW berhasil ditolak.`)
        setIsBatchReviewOpen(false)
        setSelectedIds([])
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menolak batch.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  // PDF Preview Dialog
  const [previewPtwTarget, setPreviewPtwTarget] = useState<PtwListingRow | null>(null)

  const handleDownloadPtwPdf = async (row: PtwListingRow) => {
    setIsDownloadingPdf(true)
    toast.loading('Menyiapkan file PDF...', { id: 'ptw-pdf-dl' })
    try {
      const batchEl = document.getElementById('batch-ptw-preview-sheet')
      const previewEl = document.getElementById('ptw-preview-sheet')
      const targetEl = (batchEl && currentBatchDoc?.id === row.id) ? batchEl : (previewEl && previewPtwTarget?.id === row.id ? previewEl : null)
      
      if (targetEl) {
        await downloadElementAsPdf(targetEl, `PTW_${row.permitNumber.replace(/[\/\\]/g, '_')}.pdf`, { orientation: 'landscape' })
      } else {
        const contentHtml = `
          <h1 class="text-center font-bold" style="font-size: 11pt; margin-bottom: 2px;">PERMIT TO WORK (PTW)</h1>
          <p class="text-center font-bold" style="font-size: 8pt; color: #475569; margin-bottom: 12px;">SURAT IZIN KERJA AMAN • PT CHITRAPARATAMA</p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
            <tbody>
              <tr><td colspan="4" style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Details & Permit Information</td></tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">No. Dokumen PTW</td>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-family: monospace; font-weight: bold;">${row.permitNumber}</td>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">Tipe Izin Kerja</td>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; text-transform: uppercase;">${row.permitType}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Nama Proyek / Pekerjaan</td>
                <td colspan="3" style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.projectName}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Lokasi Kerja</td>
                <td style="border: 1px solid black; padding: 3px 5px;">${row.location}</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Area / Bay</td>
                <td style="border: 1px solid black; padding: 3px 5px;">${row.area || '—'}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Masa Berlaku</td>
                <td colspan="3" style="border: 1px solid black; padding: 3px 5px;">${formatDate(row.startAt)} s.d. ${formatDate(row.endAt)}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Pelaksana Kerja</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.applicantName || '—'}</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Safety Dept</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.fieldPicName || '—'}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Status Approval</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; text-transform: uppercase; color: #065f46;">${row.status}</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Tingkat Risiko</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; text-transform: uppercase; color: #991b1b;">${row.riskLevel}</td>
              </tr>
            </tbody>
          </table>

          <div style="font-weight: bold; margin-bottom: 0.25rem;">A. Deskripsi & Ruang Lingkup Pekerjaan</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
            <tbody><tr><td style="border: 1px solid black; padding: 3px 5px;">${row.description || 'Pekerjaan perbaikan dan inspeksi sesuai standar K3.'}</td></tr></tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 8.5pt;">
            <tbody><tr><td style="border: 1px solid black; padding: 3px 5px; white-space: pre-wrap; font-family: monospace;">${row.controlSteps || '1. Barricade safety line.\n2. APAR standby.\n3. APD lengkap wajib.'}</td></tr></tbody>
          </table>

          <div style="font-weight: bold; margin-bottom: 0.25rem; font-size: 8.5pt;">C. Alat Pelindung Diri (APD) Wajib & Critical Checks</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 8pt;">
            <tbody>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; width: 70%;">
                  <strong>APD Wajib:</strong> ${(row.ppe && row.ppe.length > 0 ? row.ppe : ['Helmet', 'Safety Shoes', 'Safety Glasses']).join(', ')}
                </td>
                <td style="border: 1px solid black; padding: 3px 5px; width: 30%;">
                  <div><strong>Gas Test:</strong> ${row.gasTestRequired ? 'Wajib (Required)' : 'N/A'}</div>
                  <div><strong>LOTO / Isolasi:</strong> ${row.isolationRequired ? 'Wajib (Required)' : 'N/A'}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style="font-weight: bold; margin-bottom: 0.25rem; font-size: 8.5pt;">D. Signatories & Approval Steps</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 8pt;">
            <thead>
              <tr style="background: #f8fafc; font-weight: bold;">
                <th style="border: 1px solid black; padding: 3px 5px; width: 33.3%;">Pelaksana Kerja</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 33.3%;">Pemberi Kerja</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 33.3%;">Safety Dept</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                ${(row.approvals && row.approvals.length > 0 ? row.approvals.filter(a => a.stepOrder <= 3) : [
                  { approverName: row.applicantName, status: 'pending', signatureDataUrl: null, signedAt: null },
                  { approverName: 'Pemberi Kerja', status: 'waiting', signatureDataUrl: null, signedAt: null },
                  { approverName: 'Safety Dept', status: 'waiting', signatureDataUrl: null, signedAt: null },
                ]).map((a) => `
                  <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                    <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                      ${a.signatureDataUrl ? `<img src="${a.signatureDataUrl}" style="max-height: 40px; max-width: 100px; display: block; margin: 0 auto;" alt="TTD" />` : a.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">(Belum Disetujui)</span>'}
                    </div>
                    <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                      <p style="font-weight: bold; font-size: 8pt;">${a.approverName || '—'}</p>
                      <p style="font-size: 7pt; color: #64748b;">${a.signedAt ? new Date(a.signedAt).toLocaleDateString('id-ID') : '—'}</p>
                    </div>
                  </td>
                `).join('')}
              </tr>
            </tbody>
          </table>

          <div style="text-align: right; font-size: 7pt; color: #64748b; margin-top: 8px;">
            F.HSE.PTW.001.01 • PT Chitra Paratama
          </div>
        `
        await downloadHtmlAsPdf(contentHtml, `PTW_${row.permitNumber.replace(/[\/\\]/g, '_')}.pdf`, undefined, { orientation: 'landscape' })
      }
      toast.success('PDF berhasil diunduh!', { id: 'ptw-pdf-dl' })
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh PDF', { id: 'ptw-pdf-dl' })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleDownloadSelectedExcel = () => {
    if (selectedIds.length === 0) return
    const selectedRows = filteredRows.filter((r) => selectedIds.includes(r.id))
    if (selectedRows.length === 0) return

    const data = selectedRows.map((row, idx) => ({
      'No': idx + 1,
      'No. Dokumen PTW': row.permitNumber,
      'Tipe Izin': row.permitType,
      'Proyek': row.projectName,
      'Lokasi': row.location,
      'Area': row.area || '—',
      'Pelaksana Kerja': row.applicantName || '—',
      'Pemberi Kerja': row.fieldPicName || '—',
      'Safety Dept': row.authorizedByName || '—',
      'Risk Level': row.riskLevel || '—',
      'Status': row.status,
      'Tanggal Mulai': row.startAt ? formatTimestamp(row.startAt) : '—',
      'Tanggal Selesai': row.endAt ? formatTimestamp(row.endAt) : '—',
      'Tanggal Dibuat': (row as any).createdAt ? formatTimestamp((row as any).createdAt) : '—',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'PTW Terpilih')
    XLSX.writeFile(wb, `PTW_Selected_${selectedRows.length}_items_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Berhasil mengunduh Excel untuk ${selectedRows.length} PTW terpilih!`)
  }

  const getPtwPdfBlob = async (row: PtwListingRow): Promise<{ name: string; blob: Blob }> => {
    const fileName = `PTW_${row.permitNumber.replace(/[\/\\]/g, '_')}.pdf`
    const batchEl = document.getElementById('batch-ptw-preview-sheet')
    const previewEl = document.getElementById('ptw-preview-sheet')
    const targetEl = (batchEl && currentBatchDoc?.id === row.id) ? batchEl : (previewEl && previewPtwTarget?.id === row.id ? previewEl : null)
    
    if (targetEl) {
      const blob = await generateElementAsPdfBlob(targetEl, { orientation: 'landscape' })
      return { name: fileName, blob }
    } else {
      const contentHtml = `
        <h1 class="text-center font-bold" style="font-size: 11pt; margin-bottom: 2px;">PERMIT TO WORK (PTW)</h1>
        <p class="text-center font-bold" style="font-size: 8pt; color: #475569; margin-bottom: 12px;">SURAT IZIN KERJA AMAN • PT CHITRAPARATAMA</p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
          <tbody>
            <tr><td colspan="4" style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Details & Permit Information</td></tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">No. Dokumen PTW</td>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-family: monospace; font-weight: bold;">${row.permitNumber}</td>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">Tipe Izin Kerja</td>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; text-transform: uppercase;">${row.permitType}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Nama Proyek / Pekerjaan</td>
              <td colspan="3" style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.projectName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Lokasi Kerja</td>
              <td style="border: 1px solid black; padding: 3px 5px;">${row.location}</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Area / Bay</td>
              <td style="border: 1px solid black; padding: 3px 5px;">${row.area || '—'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Masa Berlaku</td>
              <td colspan="3" style="border: 1px solid black; padding: 3px 5px;">${formatDate(row.startAt)} s.d. ${formatDate(row.endAt)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Pelaksana Kerja</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.applicantName || '—'}</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Safety Dept</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.fieldPicName || '—'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Status Approval</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; text-transform: uppercase; color: #065f46;">${row.status}</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Tingkat Risiko</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; text-transform: uppercase; color: #991b1b;">${row.riskLevel}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: bold; margin-bottom: 0.25rem;">A. Deskripsi & Ruang Lingkup Pekerjaan</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
          <tbody><tr><td style="border: 1px solid black; padding: 3px 5px;">${row.description || 'Pekerjaan perbaikan dan inspeksi sesuai standar K3.'}</td></tr></tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 8.5pt;">
          <tbody><tr><td style="border: 1px solid black; padding: 3px 5px; white-space: pre-wrap; font-family: monospace;">${row.controlSteps || '1. Barricade safety line.\n2. APAR standby.\n3. APD lengkap wajib.'}</td></tr></tbody>
        </table>

        <div style="font-weight: bold; margin-bottom: 0.25rem; font-size: 8.5pt;">C. Alat Pelindung Diri (APD) Wajib & Critical Checks</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 8pt;">
          <tbody>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; width: 70%;">
                <strong>APD Wajib:</strong> ${(row.ppe && row.ppe.length > 0 ? row.ppe : ['Helmet', 'Safety Shoes', 'Safety Glasses']).join(', ')}
              </td>
              <td style="border: 1px solid black; padding: 3px 5px; width: 30%;">
                <div><strong>Gas Test:</strong> ${row.gasTestRequired ? 'Wajib (Required)' : 'N/A'}</div>
                <div><strong>LOTO / Isolasi:</strong> ${row.isolationRequired ? 'Wajib (Required)' : 'N/A'}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: bold; margin-bottom: 0.25rem; font-size: 8.5pt;">D. Signatories & Approval Steps</div>
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 8pt;">
          <thead>
            <tr style="background: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid black; padding: 3px 5px; width: 33.3%;">Pelaksana Kerja</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 33.3%;">Pemberi Kerja</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 33.3%;">Safety Dept</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              ${(row.approvals && row.approvals.length > 0 ? row.approvals.filter(a => a.stepOrder <= 3) : [
                { approverName: row.applicantName, status: 'pending', signatureDataUrl: null, signedAt: null },
                { approverName: 'Pemberi Kerja', status: 'waiting', signatureDataUrl: null, signedAt: null },
                { approverName: 'Safety Dept', status: 'waiting', signatureDataUrl: null, signedAt: null },
              ]).map((a) => `
                <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                  <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                    ${a.signatureDataUrl ? `<img src="${a.signatureDataUrl}" style="max-height: 40px; max-width: 100px; display: block; margin: 0 auto;" alt="TTD" />` : a.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">(Belum Disetujui)</span>'}
                  </div>
                  <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                    <p style="font-weight: bold; font-size: 8pt;">${a.approverName || '—'}</p>
                    <p style="font-size: 7pt; color: #64748b;">${a.signedAt ? new Date(a.signedAt).toLocaleDateString('id-ID') : '—'}</p>
                  </div>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>

        <div style="text-align: right; font-size: 7pt; color: #64748b; margin-top: 8px;">
          F.HSE.PTW.001.01 • PT Chitra Paratama
        </div>
      `
      const blob = await generateHtmlAsPdfBlob(contentHtml, undefined, { orientation: 'landscape' })
      return { name: fileName, blob }
    }
  }

  const handleDownloadSelectedPdf = async () => {
    if (selectedIds.length === 0) return
    const selectedRows = filteredRows.filter((r) => selectedIds.includes(r.id))
    if (selectedRows.length === 0) return

    setIsDownloadingPdf(true)
    const toastId = 'bulk-ptw-pdf-dl'

    try {
      if (selectedRows.length === 1) {
        toast.loading('Menyiapkan file PDF...', { id: toastId })
        await handleDownloadPtwPdf(selectedRows[0])
        toast.success('PDF PTW berhasil diunduh!', { id: toastId })
      } else {
        toast.loading(`Menyiapkan ${selectedRows.length} dokumen PDF PTW ke dalam ZIP...`, { id: toastId })
        const pdfFiles: Array<{ name: string; blob: Blob }> = []
        for (let i = 0; i < selectedRows.length; i++) {
          const row = selectedRows[i]
          toast.loading(`Memproses PDF (${i + 1}/${selectedRows.length}): ${row.permitNumber}...`, { id: toastId })
          const item = await getPtwPdfBlob(row)
          pdfFiles.push(item)
        }
        toast.loading(`Mengompres ${pdfFiles.length} file ke format ZIP...`, { id: toastId })
        await downloadFilesAsZip(pdfFiles, `PTW_Selected_${pdfFiles.length}_items_${new Date().toISOString().slice(0, 10)}.zip`)
        toast.success(`Berhasil mengunduh ZIP berisi ${pdfFiles.length} file PDF PTW!`, { id: toastId })
      }
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh file PDF PTW', { id: toastId })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleHiradcSelect = (val: string) => {
    const matched = HIRADC_PRESETS.find((p) => p.value === val)
    if (matched) {
      const normType = normalizePermitTypes(matched.permitType)
      const newChecked = getDefaultEquipmentItems(normType)
      setCheckedEquipment(newChecked)
      const formattedControls = newChecked.length > 0
        ? newChecked.map((l, i) => `${i + 1}. ${l}`).join('\n')
        : matched.controlSteps

      setCreateForm((prev) => ({
        ...prev,
        hiradcReference: val,
        permitType: normType,
        location: matched.location,
        area: matched.area,
        riskLevel: matched.riskLevel,
        description: matched.description,
        controlSteps: formattedControls,
        ppe: matched.ppe && matched.ppe.length > 0 ? matched.ppe : ['Helmet', 'Safety Shoes', 'Face Shield'],
      }))
      toast.success(`Autofill HIRADC diterapkan: ${matched.label}`)
    }
  }

  const toggleCreatePpe = (item: string) => {
    setCreateForm((prev) => ({
      ...prev,
      ppe: prev.ppe.includes(item) ? prev.ppe.filter((p) => p !== item) : [...prev.ppe, item],
    }))
  }

  const handleGenerateTest = async () => {
    setIsGeneratingTest(true)
    try {
      const res = await generateTestPtwApproval()
      if (res.success && res.data) {
        setTestLinks(res.data.links)
        setTestModalOpen(true)
        toast.success('Test PTW approval berhasil di-generate!')
      } else {
        toast.error(res.error || 'Gagal generate test approval')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsGeneratingTest(false)
    }
  }

  const handleSendReminders = async () => {
    setIsSendingReminders(true)
    try {
      const res = await sendDuePtwReminders()
      if (res.success) {
        toast.success(`Reminder terkirim ke ${res.sent} approver (${res.skipped} skipped)`)
      } else {
        toast.error(res.error || 'Gagal mengirim reminder')
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengirim reminder')
    } finally {
      setIsSendingReminders(false)
    }
  }

  const resetCreateForm = () => {
    const defaultPermitType = 'Cold Permit'
    setAttachedFileName('')
    setCreateAttachments([])
    setCheckedEquipment(getDefaultEquipmentItems(defaultPermitType))
    setCreateSubTypes(getDefaultSubTypes())

    setCreateForm({
      projectName: 'Perbaikan Silo Material Kering No. 3 & Corong Inlet',
      hiradcReference: '',
      permitType: defaultPermitType,
      location: 'Silo Material Kering No. 3',
      area: 'Tire Repair Bay - Sector Utara',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '17:00',
      description: 'Mengeluarkan sisa material yang menggumpal di area corong silo bawah dan inspeksi manual keretakan dinding bagian dalam.',
      controlSteps: '1. Gas test O2, LEL, H2S, CO sebelum masuk.\n2. Blower aktif selama pekerjaan.\n3. Hole watcher standby.\n4. Full body harness dan rescue line wajib.\n5. LOTO area inlet dan outlet.',
      applicantName: 'Budi — Technician',
      fieldPicName: 'Workshop Supervisor Tire Repair',
      status: 'Pending Approval',
      authorizedByName: 'HSE Superintendent',
      riskLevel: 'Critical',
      ppe: ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness'],
      additionalNotes: '',
      gasTestRequired: false,
      isolationRequired: false,
    })
  }

  const handleCreatePtw = async () => {
    if (!createForm.projectName.trim()) {
      toast.error('Nama proyek / kontrak wajib diisi')
      return
    }
    setIsCreating(true)
    try {
      let startAt = new Date(`${createForm.startDate}T${createForm.startTime || '08:00'}:00`)
      let endAt = new Date(`${createForm.endDate}T${createForm.endTime || '17:00'}:00`)
      if (isNaN(startAt.getTime())) startAt = new Date()
      if (isNaN(endAt.getTime())) endAt = new Date(Date.now() + 8 * 3600 * 1000)

      const finalDescription = createForm.hiradcReference.trim()
        ? `[Referensi HIRADC: ${createForm.hiradcReference.trim()}]\n${createForm.description}`
        : createForm.description

      const finalControlSteps = checkedEquipment.length > 0
        ? checkedEquipment.map((l, i) => `${i + 1}. ${l}`).join('\n')
        : createForm.controlSteps

      const res = await createPtwPermitAction({
        projectName: createForm.projectName,
        permitType: createForm.permitType,
        location: createForm.location,
        area: createForm.area,
        riskLevel: createForm.riskLevel,
        applicantName: createForm.applicantName,
        fieldPicName: createForm.fieldPicName,
        authorizedByName: createForm.authorizedByName,
        description: finalDescription,
        controlSteps: finalControlSteps,
        additionalNotes: createForm.additionalNotes,
        ppe: createForm.ppe,
        subTypes: createSubTypes,
        attachments: createAttachments,
        gasTestRequired: createForm.gasTestRequired,
        isolationRequired: createForm.isolationRequired,
        startAt,
        endAt,
      })
      if (res.success) {
        toast.success('Izin Kerja Aman (PTW) berhasil diajukan!')
        setCreateOpen(false)
        resetCreateForm()
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal membuat PTW')
      }
    } catch (err: any) {
      console.error('Error in handleCreatePtw:', err)
      toast.error(err?.message || 'Terjadi kesalahan saat membuat PTW')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await deletePtwPermitAction(deleteTarget.id)
      if (res.success) {
        toast.success('Izin Kerja PTW berhasil dihapus')
        setDeleteTarget(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menghapus Izin Kerja PTW')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminPageShell
      eyebrow="HSE • Permit to Work"
      title="Izin Kerja PTW Approval"
      description="Pusat approval dan pengelolaan Izin Kerja Aman (Permit to Work) dengan verifikasi tanda tangan digital bertingkat."
    >
      <HcWorkspaceBanner
        badge="HSE PERMIT TO WORK"
        title="Izin Kerja PTW Approval & Review"
        description="Review pengajuan izin kerja aman untuk hot work, confined space, lifting operation, dan pekerjaan critical workshop dengan verifikasi safety & authorized signatories."
        metrics={[
          { label: 'Total PTW', value: rows.length },
          { label: 'Menunggu Approval', value: rows.filter((r) => ['submitted', 'pending'].includes(r.status.toLowerCase())).length },
          { label: 'Disetujui', value: rows.filter((r) => r.status.toLowerCase() === 'approved').length },
          { label: 'Critical Risk', value: rows.filter((r) => r.riskLevel?.toLowerCase() === 'critical').length },
        ]}
      />

      <MinimalTableShell
        label="izin kerja ptw"
        title="Daftar Review"
        description="Daftar historis evaluasi izin kerja aman."
        fileName="izin-kerja-ptw-hse"
        searchEnabled={false}
        access={access}
        filters={
          <>
            <div className="relative w-full sm:w-[220px] sm:flex-none">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Cari PTW..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="bg-surface-container-lowest h-9 rounded-xl border-0 pl-9 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
              />
            </div>
            <MultiSelectFilterDropdown
              options={typeFilterOptions}
              selected={selectedTypes}
              onChange={setSelectedTypes}
              placeholder="Semua tipe"
              label="Tipe"
            />
            <MultiSelectFilterDropdown
              options={statusFilterOptions}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Semua status"
              label="Status"
            />
            <MultiSelectFilterDropdown
              options={riskFilterOptions}
              selected={selectedRisks}
              onChange={setSelectedRisks}
              placeholder="Semua risiko"
              label="Risiko"
            />
            <MultiSelectFilterDropdown
              options={locationFilterOptions}
              selected={selectedLocations}
              onChange={setSelectedLocations}
              placeholder="Semua lokasi"
              label="Lokasi"
            />
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 rounded-xl border-0 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
              >
                <RotateCcw className="size-3 mr-1" /> Reset Filter
              </Button>
            )}
          </>
        }
        showImport={false}
        showExport={false}
        primaryAction={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)} className="h-8 px-2.5 text-[11px] font-bold">
              <Settings className="size-3.5 mr-1" /> SETTINGS
            </Button>
            <Button size="sm" variant="secondary" onClick={handleGenerateTest} disabled={isGeneratingTest} className="h-8 px-2.5 text-[11px] font-bold">
              <Bug className="size-3.5 mr-1" /> {isGeneratingTest ? 'Generating...' : 'TEST APPROVAL'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleSendReminders} disabled={isSendingReminders} className="h-8 px-2.5 text-[11px] font-bold">
              <Send className="size-3.5 mr-1" /> {isSendingReminders ? 'Sending...' : 'SEND REMINDERS'}
            </Button>
            <Button size="sm" onClick={() => { resetCreateForm(); setCreateOpen(true); }} className={cn(hcPrimaryActionClassName, "h-8 px-3 text-[11px] font-bold")}>
              <Plus className="size-3.5 mr-1" /> TAMBAH PTW
            </Button>
          </div>
        }
        columnOptions={[]}
      >
        {/* Sticky Multi-Select Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50/90 border border-indigo-200/80 rounded-xl px-4 py-2.5 mb-3 shadow-xs">
            <span className="text-xs font-semibold text-indigo-900">
              {selectedIds.length} dari {filteredRows.length} Izin Kerja PTW terpilih
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setBatchReviewIndex(0)
                  setIsBatchReviewOpen(true)
                }}
                className="h-8 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white uppercase shadow-sm hover:bg-indigo-700"
              >
                REVIEW
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadSelectedPdf}
                disabled={isDownloadingPdf}
                className="h-8 rounded-lg border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 uppercase shadow-sm hover:bg-slate-50"
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
                UNDUH
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadSelectedExcel}
                className="h-8 rounded-lg border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 uppercase shadow-sm hover:bg-emerald-50"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                EXCEL
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs font-bold text-indigo-700 uppercase hover:bg-indigo-100/70"
              >
                BATAL
              </Button>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <Table className="w-full text-xs">
            <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-9 pl-3.5 py-2.5">
                  <Checkbox
                    checked={selectedIds.length === filteredRows.length && filteredRows.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedIds(checked ? filteredRows.map((r) => r.id) : [])
                    }}
                    aria-label="Pilih semua baris"
                  />
                </TableHead>
                <TableHead className="font-bold text-slate-600 text-[10.5px] uppercase tracking-wider py-2.5 min-w-[140px] max-w-[180px]">PERMIT INFO</TableHead>
                <TableHead className="font-bold text-slate-600 text-[10.5px] uppercase tracking-wider py-2.5 min-w-[150px] max-w-[200px]">TYPE & LOCATION</TableHead>
                <TableHead className="font-bold text-slate-600 text-[10.5px] uppercase tracking-wider py-2.5 whitespace-nowrap">DURATION</TableHead>
                <TableHead className="font-bold text-slate-600 text-[10.5px] uppercase tracking-wider py-2.5 min-w-[160px] max-w-[220px]">PELAKSANA KERJA</TableHead>
                <TableHead className="font-bold text-slate-600 text-[10.5px] uppercase tracking-wider py-2.5 whitespace-nowrap">STATUS</TableHead>
                <TableHead className="font-bold text-slate-600 text-[10.5px] uppercase tracking-wider py-2.5 text-right whitespace-nowrap">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    Belum ada data Izin Kerja PTW.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  const applicantName = row.applicantName || 'Budi — Technician'
                  const initials = applicantName
                    .split('—')[0]
                    .trim()
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'PT'

                  const isChecked = selectedIds.includes(row.id)

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        'hover:bg-slate-50/60 transition-colors cursor-pointer border-b border-slate-100',
                        isChecked && 'bg-indigo-50/40'
                      )}
                      onClick={() => router.push(`/dashboard/hse/izin-kerja-ptw/${row.id}/approval`)}
                    >
                      {/* Checkbox */}
                      <TableCell className="pl-3.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) =>
                              checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                            )
                          }}
                          aria-label={`Pilih PTW ${row.permitNumber}`}
                        />
                      </TableCell>

                      {/* 1. PERMIT INFO */}
                      <TableCell className="py-2.5 max-w-[180px]">
                        <div className="font-bold text-slate-900 text-[12px] leading-tight line-clamp-2" title={row.projectName || row.description}>
                          {row.projectName || row.description || 'Pekerjaan Workshop'}
                        </div>
                        <div className="font-mono text-[11px] text-blue-600 font-semibold mt-0.5">{row.permitNumber}</div>
                      </TableCell>

                      {/* 2. TYPE & LOCATION */}
                      <TableCell className="py-2.5 max-w-[200px]">
                        <div className="flex items-center gap-1 font-bold text-slate-900 text-[11.5px]">
                          <MapPin className="size-3 text-blue-600 shrink-0" />
                          <span className="truncate">{row.permitType}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5 leading-tight line-clamp-2" title={`${row.location}${row.area ? ` • ${row.area}` : ''}`}>
                          {row.location}{row.area ? ` • ${row.area}` : ''}
                        </div>
                        <div className="mt-1">
                          <RiskBadge risk={row.riskLevel} />
                        </div>
                      </TableCell>

                      {/* 3. DURATION */}
                      <TableCell className="py-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-[11.5px]">{formatPtwDate(row.startAt)}</div>
                        <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                          {formatPtwTime(row.startAt)} - {formatPtwTime(row.endAt)}
                        </div>
                      </TableCell>

                      {/* 4. PELAKSANA KERJA */}
                      <TableCell className="py-2.5 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700 shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-[11.5px] leading-tight truncate">{row.applicantName || '—'}</div>
                            <div className="text-[10.5px] text-slate-500 mt-0.5 leading-tight space-y-0.5">
                              <div className="truncate">Pemberi Kerja: <span className="font-medium text-slate-700">{row.fieldPicName || '—'}</span></div>
                              <div className="truncate">Safety Dept: <span className="font-medium text-slate-700">{row.authorizedByName || '—'}</span></div>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* 5. STATUS */}
                      <TableCell className="py-2.5 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </TableCell>

                      {/* 6. ACTIONS */}
                      <TableCell className="py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6.5 px-2 rounded-md text-[10.5px] font-bold gap-0.5 text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs"
                            onClick={() => setPreviewPtwTarget(row)}
                          >
                            <Eye className="size-3 text-slate-500" /> VIEW
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6.5 px-2 rounded-md text-[10.5px] font-bold gap-0.5 text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs"
                            onClick={() => router.push(`/dashboard/hse/izin-kerja-ptw/${row.id}/approval`)}
                          >
                            <Pencil className="size-3 text-slate-500" /> EDIT
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6.5 px-2 rounded-md text-[10.5px] font-bold gap-0.5 text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-2xs"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="size-3 text-rose-500" /> DELETE
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </MinimalTableShell>

      {/* ── BATCH MULTI-DOCUMENT PREVIEW & APPROVAL MODAL (PTW PARITY) ── */}
      <Dialog open={isBatchReviewOpen && Boolean(currentBatchDoc)} onOpenChange={(open) => !open && setIsBatchReviewOpen(false)}>
        <DialogContent className="max-w-[96vw] xl:max-w-6xl 2xl:max-w-7xl max-h-[94vh] h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-2xl" showCloseButton={false}>
          {/* Top Viewer Toolbar */}
          <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-200 text-slate-900 shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">
                  Review & Approval Dokumen PTW • <span className="font-mono text-indigo-600">{currentBatchDoc?.permitNumber}</span>
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {currentBatchDoc?.applicantName} • {formatPtwDate(currentBatchDoc?.startAt)} • {currentBatchDoc?.permitType}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pagination Controls */}
              <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1 border border-slate-200 shadow-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={batchReviewIndex === 0 || isBatchActionRunning}
                  onClick={() => setBatchReviewIndex((prev) => Math.max(0, prev - 1))}
                  className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-30"
                  title="Dokumen Sebelumnya"
                >
                  ‹
                </Button>
                <span className="text-xs font-mono font-semibold text-slate-700 px-1">
                  Dokumen {batchReviewIndex + 1} dari {selectedBatchRows.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={batchReviewIndex >= selectedBatchRows.length - 1 || isBatchActionRunning}
                  onClick={() => setBatchReviewIndex((prev) => Math.min(selectedBatchRows.length - 1, prev + 1))}
                  className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-30"
                  title="Dokumen Berikutnya"
                >
                  ›
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-8.5 text-xs rounded-xl font-medium gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                disabled={isDownloadingPdf}
                onClick={() => currentBatchDoc && handleDownloadPtwPdf(currentBatchDoc)}
              >
                <Download className="size-3.5" /> Unduh PDF
              </Button>

              <button
                type="button"
                onClick={() => setIsBatchReviewOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Body: Split 2 columns (Left: Preview Sheet, Right: Action Sidebar) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100">
            {/* Left: Preview Sheet */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 flex justify-center items-start bg-slate-200/60 border-r border-slate-200/80">
              {currentBatchDoc && (
                <PtwLandscapePdfSheet
                  elementId="batch-ptw-preview-sheet"
                  doc={currentBatchDoc}
                  liveRemarks={approvalRemarks[currentBatchDoc.id]}
                />
              )}
            </div>

            {/* Right: Action Sidebar */}
            <div className="w-full lg:w-84 shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 flex flex-col justify-between overflow-y-auto text-slate-800">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-xs">Informasi Dokumen</p>
                    <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                      {currentBatchDoc?.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <p><span className="text-slate-400">Pelaksana:</span> <span className="font-semibold text-slate-900">{currentBatchDoc?.applicantName}</span></p>
                    <p><span className="text-slate-400">No. PTW:</span> <span className="font-mono text-indigo-700 font-semibold">{currentBatchDoc?.permitNumber}</span></p>
                    <p><span className="text-slate-400">Proyek:</span> <span className="text-slate-800">{currentBatchDoc?.projectName || '-'}</span></p>
                    <p><span className="text-slate-400">Tipe:</span> <span className="text-slate-800 font-medium">{currentBatchDoc?.permitType}</span></p>
                  </div>
                </div>

                {/* Catatan Approval Textarea */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-slate-700">Catatan Approval (Opsional)</Label>
                  <Textarea
                    placeholder="Tuliskan catatan atau rekomendasi khusus..."
                    rows={2}
                    value={currentBatchDoc ? approvalRemarks[currentBatchDoc.id] || '' : ''}
                    onChange={(e) => {
                      if (currentBatchDoc) {
                        setApprovalRemarks((prev) => ({ ...prev, [currentBatchDoc.id]: e.target.value }))
                      }
                    }}
                    className="bg-slate-50 border-slate-200 text-xs resize-none rounded-xl"
                  />
                </div>

                {/* Section 1: Aksi Dokumen Ini */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Aksi Dokumen Ini ({batchReviewIndex + 1} / {selectedBatchRows.length})
                  </p>

                  <Button
                    type="button"
                    disabled={isBatchActionRunning}
                    onClick={handleSingleApproveCurrent}
                    className="w-full h-10 bg-[#003461] hover:bg-[#002647] text-white font-bold text-xs shadow-xs rounded-xl justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="size-4" />
                    APPROVE
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBatchActionRunning}
                      onClick={handleSingleRevertCurrent}
                      className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl justify-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="size-3.5" /> REVERT
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBatchActionRunning}
                      onClick={handleSingleRejectCurrent}
                      className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl justify-center gap-1.5 transition-all"
                    >
                      <XCircle className="size-3.5" /> REJECT
                    </Button>
                  </div>
                </div>

                {/* Divider: Aksi Massal */}
                <div className="border-t border-slate-200/80 pt-3.5 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Aksi Massal ({selectedBatchRows.length} Dokumen)
                  </p>

                  <Button
                    type="button"
                    disabled={isBatchActionRunning}
                    onClick={handleBatchApproveAll}
                    className="w-full h-10 bg-[#003461] hover:bg-[#002647] text-white font-bold text-xs shadow-xs rounded-xl justify-center gap-2 transition-all"
                  >
                    <CheckCheck className="size-4" />
                    APPROVE ALL ({selectedBatchRows.length})
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBatchActionRunning}
                      onClick={handleBatchRevertAll}
                      className="h-8.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl justify-center transition-all"
                    >
                      REVERT ALL
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBatchActionRunning}
                      onClick={handleBatchRejectAll}
                      className="h-8.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl justify-center transition-all"
                    >
                      REJECT ALL
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBatchReviewOpen(false)}
                  className="w-full text-xs text-slate-600 hover:text-slate-900 border-slate-200 rounded-xl h-9"
                >
                  Tutup Reviewer
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Quick Preview Dialog - Clean Light Theme */}
      <Dialog open={Boolean(previewPtwTarget)} onOpenChange={(open) => !open && setPreviewPtwTarget(null)}>
        <DialogContent className="max-w-[96vw] w-[1320px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-2xl" showCloseButton={false}>
          {/* Top Viewer Toolbar */}
          <div className="bg-white px-5 py-3 flex items-center justify-between border-b border-slate-200 select-none text-slate-900 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileCheck className="size-4" />
              </div>
              <span className="font-bold text-xs text-slate-900 truncate">
                Permit to Work (PTW) • <span className="font-mono text-indigo-600">{previewPtwTarget?.permitNumber}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-[11px] font-mono text-slate-600 border border-slate-200 font-semibold">
                1 / 1
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-xl font-medium gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                disabled={isDownloadingPdf}
                onClick={() => previewPtwTarget && handleDownloadPtwPdf(previewPtwTarget)}
              >
                <Download className="size-3.5" /> Unduh PDF
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs rounded-xl font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                onClick={() => previewPtwTarget && router.push(`/dashboard/hse/izin-kerja-ptw/${previewPtwTarget.id}/approval`)}
              >
                Buka Form Approval ↗
              </Button>
              <button
                type="button"
                onClick={() => setPreviewPtwTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Viewer Canvas Area */}
          {previewPtwTarget && (
            <div className="flex-1 overflow-auto bg-slate-200/80 p-4 sm:p-6 flex justify-center items-start border-t border-slate-200">
              <PtwLandscapePdfSheet
                elementId="ptw-preview-sheet"
                doc={previewPtwTarget}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 18-FIELD CREATE/EDIT PTW MODAL (Exact Screenshot Parity) ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Pengajuan Izin Kerja Aman (PTW)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Field PTW dibuat lebih lengkap untuk kontrol pekerjaan berisiko di workshop mining.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2 text-xs">
            {/* Field 1: Nama Proyek / Kontrak */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Nama proyek / kontrak</Label>
              <Input
                placeholder="Ketik nama proyek / kontrak"
                value={createForm.projectName}
                onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>

            {/* Field 2: Referensi HIRADC */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Referensi HIRADC</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="size-3 text-blue-600" />
                      <span>Pilih dari Preset HIRADC</span>
                      <ChevronDown className="size-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-2 z-50">
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 px-2">Klik Preset untuk Autofill Form:</p>
                    <div className="space-y-1 max-h-56 overflow-auto">
                      {HIRADC_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleHiradcSelect(preset.value)}
                          className="w-full text-left p-2 rounded-lg hover:bg-blue-50 text-xs transition-colors border border-transparent hover:border-blue-100"
                        >
                          <div className="font-semibold text-slate-900">{preset.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Input
                placeholder="Ketik referensi HIRADC / judul aktivitas pekerjaan..."
                value={createForm.hiradcReference}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, hiradcReference: e.target.value }))}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />

              {/* Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400">Preset Cepat:</span>
                {HIRADC_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleHiradcSelect(p.value)}
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all",
                      createForm.hiradcReference === p.value
                        ? "bg-blue-600 text-white border-blue-600 font-semibold"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    )}
                  >
                    {p.label.split('/')[0].trim()}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-medium text-slate-400">
                Ketik langsung referensi HIRADC (langsung tersimpan real-time), atau klik preset di atas untuk autofill detail pekerjaan.
              </p>
            </div>

            {/* Field 3: Tipe Izin Kerja (Multi-Select) & Dynamic Checklist */}
            <div className="space-y-2 md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Tipe Izin Kerja (Dapat Pilih Lebih Dari Satu)</span>
                </Label>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {createForm.permitType ? createForm.permitType.split(', ').length : 0} Tipe Terpilih
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Pilih satu atau beberapa jenis pekerjaan berisiko yang akan dilaksanakan:
              </p>
              
              {/* Multi-select Chips Grid */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PERMIT_TYPE_OPTIONS.map((opt) => {
                  const activeTypes = createForm.permitType ? createForm.permitType.split(', ').map(t => t.trim()) : []
                  const isSelected = activeTypes.includes(opt.value)
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => togglePermitTypeOption(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs",
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span>{isSelected ? "☑" : "☐"}</span>
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Rincian Sub-Jenis Pekerjaan (Aktivitas Pekerjaan) Manual CRUD */}
              <PtwSubTypesEditor
                activePermitTypes={getActivePermitTypeKeys(createForm.permitType)}
                subTypes={createSubTypes}
                onChange={setCreateSubTypes}
                className="mt-3 pt-3 border-t border-slate-200"
              />

              {/* Dynamic Peralatan & Checklist K3 Section (Minimalist & Without Emojis) */}
              {(() => {
                const activeTypes = getActivePermitTypeKeys(createForm.permitType)
                if (activeTypes.length === 0) return null
                return (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900">
                        Peralatan & Checklist K3 Yang Dibutuhkan
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Centang peralatan yang disiapkan
                      </span>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {activeTypes.map((pType) => {
                        const data = EQUIPMENT_CHECKLIST_PER_TYPE[pType]
                        if (!data) return null
                        return (
                          <div key={pType} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2">
                            <div className="font-bold text-[11px] text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
                              <span className="uppercase text-slate-900">{pType}</span>
                              <span className="text-[9px] font-mono text-slate-400 font-normal">{data.items.length} Item</span>
                            </div>
                            <div className="text-[10px] italic text-slate-500 font-medium leading-tight">
                              {data.subHeader}
                            </div>
                            <div className="space-y-1 pt-1">
                              {data.items.map((item) => {
                                const isChecked = isSharedItemChecked(item.label, checkedEquipment)
                                return (
                                  <label
                                    key={item.id}
                                    className={cn(
                                      "flex items-start gap-2 p-1.5 rounded-md border cursor-pointer transition-all text-[11px] font-medium leading-tight",
                                      isChecked
                                        ? "bg-slate-900 border-slate-900 text-white font-semibold"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleEquipmentItem(item.label)}
                                      className="mt-0.5 size-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 shrink-0"
                                    />
                                    <span>{item.label}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Lokasi spesifik</Label>
              <Input
                placeholder="Contoh: Silo Material Kering No. 3"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>

            {/* Field 5 & 6: Area Kerja & Tgl Mulai */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Area kerja</Label>
              <Input
                placeholder="Contoh: Tire Repair Bay - Sector Utara"
                value={createForm.area}
                onChange={(e) => setCreateForm({ ...createForm, area: e.target.value })}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tgl mulai</Label>
              <Input
                type="date"
                value={createForm.startDate}
                onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>

            {/* Field 7 & 8: Jam Mulai & Tgl Selesai */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Jam mulai</Label>
              <Input
                type="time"
                value={createForm.startTime}
                onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tgl selesai</Label>
              <Input
                type="date"
                value={createForm.endDate}
                onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>

            {/* Field 9: Jam Selesai */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Jam selesai</Label>
              <Input
                type="time"
                value={createForm.endTime}
                onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                className="h-10 bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>

            {/* Field 10: Deskripsi Pekerjaan */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Deskripsi pekerjaan</Label>
              <Textarea
                placeholder="Jelaskan detail pekerjaan yang akan dilakukan..."
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="bg-slate-50/70 border-slate-200 text-xs"
              />
            </div>

            {/* Signatories Section: Pemberi Kerja -> Pelaksana Kerja (Multi) -> Safety Dept */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nama pemberi kerja</Label>
              <SearchableSelect
                label="Pemberi Kerja"
                placeholder="PILIH PEMBERI KERJA..."
                value={createForm.fieldPicName}
                onValueChange={(val) => setCreateForm({ ...createForm, fieldPicName: val })}
                options={employeeNameOptions}
                widthClassName="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nama safety dept / pengawas</Label>
              <SearchableSelect
                label="Safety Dept"
                placeholder="PILIH SAFETY DEPT..."
                value={createForm.authorizedByName}
                onValueChange={(val) => setCreateForm({ ...createForm, authorizedByName: val })}
                options={employeeNameOptions}
                widthClassName="w-full"
              />
            </div>

            {/* Pelaksana Kerja (Multi-Person) */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Nama pelaksana kerja (Multi-person)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setVendorModalOpen(true)}
                    className="h-6 px-2 text-[10.5px] font-bold border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100/90 shadow-2xs gap-1"
                  >
                    <Building2 className="w-3 h-3 text-amber-700" />
                    + Vendor Luar
                  </Button>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                    {(createForm.applicantName ? createForm.applicantName.split(',').map(s => s.trim()).filter(Boolean).length : 0)} Orang Ditugaskan
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50/70 min-h-10">
                {(createForm.applicantName ? createForm.applicantName.split(',').map(s => s.trim()).filter(Boolean) : []).map((rawEntry) => {
                  const parsed = parseApplicantEntry(rawEntry)
                  if (parsed.isExternalVendor) {
                    return (
                      <span
                        key={rawEntry}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold bg-amber-600 text-white shadow-2xs border border-amber-700"
                      >
                        <Building2 className="w-3 h-3 text-amber-200 shrink-0" />
                        <span>{parsed.name}</span>
                        {parsed.company && (
                          <span className="text-[9.5px] bg-amber-800/60 px-1 py-0.2 rounded font-medium text-amber-100">
                            {parsed.company}
                          </span>
                        )}
                        <span className="text-[9.5px] text-amber-100/90 font-mono">({parsed.email})</span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = createForm.applicantName.split(',').map(s => s.trim()).filter(Boolean)
                            const next = current.filter(n => n !== rawEntry)
                            setCreateForm({ ...createForm, applicantName: next.join(', ') })
                          }}
                          className="hover:text-rose-200 font-bold ml-1 text-xs"
                          title={`Hapus ${parsed.name}`}
                        >
                          ×
                        </button>
                      </span>
                    )
                  }
                  return (
                    <span
                      key={rawEntry}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold bg-slate-900 text-white shadow-2xs"
                    >
                      <span>{parsed.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = createForm.applicantName.split(',').map(s => s.trim()).filter(Boolean)
                          const next = current.filter(n => n !== rawEntry)
                          setCreateForm({ ...createForm, applicantName: next.join(', ') })
                        }}
                        className="hover:text-rose-300 font-bold ml-1 text-xs"
                        title={`Hapus ${parsed.name}`}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                <div className="flex-1 min-w-[220px]">
                  <SearchableSelect
                    label="Tambah Pelaksana"
                    placeholder="+ PILIH / TAMBAH PELAKSANA KERJA..."
                    value=""
                    onValueChange={(val) => {
                      if (!val) return
                      const clean = val.includes(' — ') ? val.split(' — ')[0].trim() : val.trim()
                      const current = createForm.applicantName.split(',').map(s => s.trim()).filter(Boolean)
                      if (clean && !current.includes(clean)) {
                        const next = [...current, clean]
                        setCreateForm({ ...createForm, applicantName: next.join(', ') })
                      }
                    }}
                    options={employeeNameOptions}
                    widthClassName="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Field 14: Status Persetujuan & Risk Level */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status persetujuan</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1 text-xs shadow-sm font-semibold"
                value={createForm.status}
                onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
              >
                <option value="Pending Approval">Pending Approval</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Risk level</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1 text-xs shadow-sm font-semibold"
                value={createForm.riskLevel}
                onChange={(e) => setCreateForm({ ...createForm, riskLevel: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Field APD Wajib */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">APD wajib</Label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50/70 min-h-10">
                {APD_OPTIONS.map((item) => {
                  const isChecked = createForm.ppe.includes(item)
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => toggleCreatePpe(item)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all',
                        isChecked
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {item} {isChecked && <span className="text-[10px]">×</span>}
                    </button>
                  )
                })}
              </div>
            </div>


            {/* Field 18: Lampiran JSA / Work Plan */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Lampiran JSA / Work Plan</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="grid min-h-24 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center text-xs font-semibold text-slate-500 hover:bg-slate-100/80 cursor-pointer transition-colors"
              >
                {attachedFileName ? (
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300">
                    <FileText className="size-4 text-emerald-600" />
                    <span className="font-bold text-xs">{attachedFileName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAttachedFileName('')
                      }}
                      className="ml-1.5 text-slate-400 hover:text-slate-700 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <UploadCloud className="size-6 text-slate-400" />
                    <span>Pilih dokumen pendukung (PDF, DOCX, PNG, JPG)</span>
                    <span className="text-[10px] font-normal text-slate-400">Otomatis terhubung dengan QR Code PDF</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreatePtw} disabled={isCreating} className={hcPrimaryActionClassName}>
              {isCreating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Approval Modal (Contract Review Parity) */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Approval Links</DialogTitle>
            <DialogDescription>
              Gunakan link di bawah ini untuk mensimulasikan alur review & tanda tangan dari masing-masing role:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {testLinks.map((link) => (
              <div key={link.step} className="flex items-center justify-between rounded-lg border p-3 bg-white">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Step {link.step}: {link.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {link.role}
                  </p>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-teal-800 hover:bg-teal-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  Buka Approval ↗
                </a>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal (Contract Review Parity) */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Izin Kerja (PTW) Workflow Settings</DialogTitle>
            <DialogDescription>Atur approval matrix dan template email tanpa hardcode.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Approval Matrix ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Approval Matrix</h3>
              <div className="space-y-3">
                <div>
                  <Label>HO Sites (pisahkan koma)</Label>
                  <Input
                    value={(settingsForm.approvalMatrix?.hoSites || []).join(', ')}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        approvalMatrix: {
                          ...settingsForm.approvalMatrix,
                          hoSites: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Roles: Safety Officer (Pemberi Kerja), Safety Dept / Field PIC, Authorized By, Manager */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key Approvers & Roles</p>
                <div className="space-y-1">
                  <Label>Default Pemberi Kerja (Safety Officer / HSE)</Label>
                  <SearchableSelect
                    label="Safety Officer"
                    placeholder="Pilih Safety Officer..."
                    value={(() => {
                      const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix?.safetyOfficerName)
                      return emp ? String(emp.id) : ''
                    })()}
                    onValueChange={(val) => updateApproverField('safetyOfficer', val)}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <Input
                    value={settingsForm.approvalMatrix?.safetyOfficerEmail || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        approvalMatrix: { ...settingsForm.approvalMatrix, safetyOfficerEmail: e.target.value },
                      })
                    }
                    placeholder="Email..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Default Safety Dept (Field PIC / Pengawas)</Label>
                  <SearchableSelect
                    label="Safety Dept"
                    placeholder="Pilih Safety Dept / PIC..."
                    value={(() => {
                      const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix?.fieldPicName)
                      return emp ? String(emp.id) : ''
                    })()}
                    onValueChange={(val) => updateApproverField('fieldPic', val)}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <Input
                    value={settingsForm.approvalMatrix?.fieldPicEmail || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        approvalMatrix: { ...settingsForm.approvalMatrix, fieldPicEmail: e.target.value },
                      })
                    }
                    placeholder="Email..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Default Authorized By</Label>
                  <SearchableSelect
                    label="Authorized By"
                    placeholder="Pilih Authorized..."
                    value={(() => {
                      const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix?.authorizedByName)
                      return emp ? String(emp.id) : ''
                    })()}
                    onValueChange={(val) => updateApproverField('authorizedBy', val)}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <Input
                    value={settingsForm.approvalMatrix?.authorizedByEmail || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        approvalMatrix: { ...settingsForm.approvalMatrix, authorizedByEmail: e.target.value },
                      })
                    }
                    placeholder="Email..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Default HSE Manager</Label>
                  <SearchableSelect
                    label="Manager"
                    placeholder="Pilih Manager..."
                    value={(() => {
                      const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix?.managerName)
                      return emp ? String(emp.id) : ''
                    })()}
                    onValueChange={(val) => updateApproverField('manager', val)}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <Input
                    value={settingsForm.approvalMatrix?.managerEmail || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        approvalMatrix: { ...settingsForm.approvalMatrix, managerEmail: e.target.value },
                      })
                    }
                    placeholder="Email..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Reminder SLA Days (pisahkan koma)</Label>
                <Input
                  value={(settingsForm.reminderDaysBefore ?? [1, 2, 3]).join(', ')}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      reminderDaysBefore: e.target.value
                        .split(',')
                        .map((value: string) => Number(value.trim()))
                        .filter((value: number) => Number.isFinite(value) && value >= 0),
                    })
                  }
                  placeholder="1, 2, 3"
                />
                <p className="text-[10px] text-muted-foreground">Pengingat otomatis dikirim saat approval pending mendekati SLA ini.</p>
              </div>
            </div>

            {/* ── Email Templates ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Email Templates</h3>
              {(['approvalStep', 'approvalCompleted', 'reminder'] as const).map((key) => {
                const labels: Record<string, string> = {
                  approvalStep: 'Notifikasi Giliran Approval PTW',
                  approvalCompleted: 'Notifikasi Izin Kerja Terbit',
                  reminder: `Reminder SLA (${(settingsForm.reminderDaysBefore ?? [1, 2, 3]).map((d: number) => `H+${d}`).join('/')})`,
                }
                const tmpl = settingsForm.emailTemplates?.[key] || { subject: '', body: '' }
                return (
                  <div key={key} className="space-y-2 rounded-xl border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{labels[key]}</p>
                    <div>
                      <Label className="text-xs">Subject</Label>
                      <Input
                        value={tmpl.subject}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            emailTemplates: {
                              ...settingsForm.emailTemplates,
                              [key]: { ...tmpl, subject: e.target.value },
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Textarea
                        rows={7}
                        value={tmpl.body}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            emailTemplates: {
                              ...settingsForm.emailTemplates,
                              [key]: { ...tmpl, body: e.target.value },
                            },
                          })
                        }
                        className="text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Variables: {'{{permitNumber}}, {{projectName}}, {{permitType}}, {{location}}, {{applicantName}}, {{approverName}}, {{approvalStep}}, {{approvalLink}}'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSettings} className={hcPrimaryActionClassName}>
              Simpan Pengaturan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Hapus Izin Kerja PTW?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="h-8.5 rounded-lg border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8.5 rounded-lg bg-red-600 px-3.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus Dokumen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Tambah Pelaksana Kerja Vendor Luar ── */}
      <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="size-4 text-amber-600" />
              Tambah Pelaksana Kerja (Vendor Luar)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pekerja vendor luar akan menerima link approval khusus via email untuk review & tanda tangan digital PTW.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Nama Lengkap Pelaksana <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Joko Santoso"
                value={vendorForm.name}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Email / Gmail <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="Contoh: joko.santoso@gmail.com"
                value={vendorForm.email}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                className="h-9 text-xs"
              />
              <p className="text-[10.5px] text-slate-400">
                Link review publik PTW akan dikirimkan otomatis ke alamat email ini.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Nama Perusahaan / Vendor <span className="text-slate-400 font-normal">(Opsional)</span>
              </Label>
              <Input
                placeholder="Contoh: PT Surya Teknik Mandiri"
                value={vendorForm.company}
                onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setVendorModalOpen(false)
                setVendorForm({ name: '', email: '', company: '' })
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddVendorApplicant}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Tambahkan Pelaksana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
