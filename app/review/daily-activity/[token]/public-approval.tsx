'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import SignatureCanvas from 'react-signature-canvas'
import { approveDailyActivityStepByToken, rejectDailyActivityStepByToken, revertDailyActivityStepByToken } from '@/app/dashboard/activity-hub/actions'
import { DailyActivityEvidenceModal } from '@/components/daily-activity-evidence-modal'
import { MissingSignatureDialog } from '@/components/missing-signature-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import {
  Download,
  CheckCircle2,
  XCircle,
  PenTool,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  Eye,
  FileText,
  CheckSquare,
  Square,
  BarChart2,
  Clock,
  Briefcase,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { downloadElementAsPdf } from '@/lib/pdf-download'

type PublicApprovalProps = {
  token: string
  approval: {
    id: number
    sessionId: number
    stepOrder: number
    stepLabel: string
    approverName: string
    approverEmail: string
    approverRole: string
    status: string
    signatureDataUrl: string | null
    remarks: string
    signedAt: Date | string | null
    approvalToken: string
  }
  session: {
    id: number
    sessionCode: string
    workDate: Date | string | null
    shiftCode: string
    status: string
    submittedAt: Date | string | null
    approvedAt: Date | string | null
    employeeId: number
    siteId: number
    teamMembersSummary?: string | null
    splNumber?: string | null
  }
  employee: {
    id: number
    name: string
    sn: string
    jobTitle: string
    department: string
    section: string
  }
  site: {
    id: number
    name: string
    customerName: string
  }
  sessionItems: Array<{
    id: number
    label: string
    group: string
    unitNumber: string
    remark: string
    duration: string
    points: number
    sortOrder: number
  }>
  allApprovals: Array<{
    id: number
    sessionId: number
    stepOrder: number
    stepLabel: string
    approverName: string
    approverEmail: string
    approverRole: string
    status: string
    signatureDataUrl: string | null
    remarks: string
    signedAt: Date | string | null
    approvalToken: string
  }>
  totals: {
    itemCount: number
    totalPoints: number
  }
  registeredSignature?: string | null
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Karyawan',
  leader: 'Leader / Supervisor',
  pjo_or_te_initial: 'PJO / TE',
  section_head: 'Section Head',
  section_head_confirmation: 'Section Head',
  manager: 'Department Head / Manager',
  central_service_manager: 'Department Head',
  hr: 'HR / HC',
}

function getSignatureStep(approvals: any[], ...roles: string[]) {
  return approvals.find(
    (s: any) =>
      Boolean(s.signatureDataUrl) &&
      roles.includes(s.approverRole)
  )
}

function hasVisibleCanvasInk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return false
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) return true
  }
  return false
}

export function DailyActivityPublicApproval({
  token,
  approval = {} as any,
  session = {} as any,
  employee = {} as any,
  site = {} as any,
  sessionItems = [],
  allApprovals = [],
  totals = { itemCount: 0, totalPoints: 0 },
  registeredSignature: initialRegisteredSignature,
}: PublicApprovalProps) {
  const [registeredSignature, setRegisteredSignature] = useState(initialRegisteredSignature)
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [done, setDone] = useState(approval?.status === 'approved')
  const [rejected, setRejected] = useState(approval?.status === 'rejected')
  const [reverted, setReverted] = useState(false)
  const [approvalHistory, setApprovalHistory] = useState(allApprovals || [])
  const [remarks, setRemarks] = useState(approval?.remarks || '')
  const [error, setError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeMobileView, setActiveMobileView] = useState<'form' | 'letter'>('form')

  const initialSig = approval?.signatureDataUrl || registeredSignature || ''
  const [previewSignatureDataUrl, setPreviewSignatureDataUrl] = useState(initialSig)
  const [previewSignedAt, setPreviewSignedAt] = useState<string | Date | null>(
    approval?.signedAt || null
  )
  const [isManualDraw, setIsManualDraw] = useState(!initialSig)
  const [isPending, startTransition] = useTransition()

  const [selectedItemIds, setSelectedItemIds] = useState<number[]>(() =>
    (sessionItems || []).map((i) => i.id)
  )

  const isAllItemsSelected =
    sessionItems.length > 0 && selectedItemIds.length === sessionItems.length

  const toggleSelectAllItems = () => {
    if (isAllItemsSelected) {
      setSelectedItemIds([])
    } else {
      setSelectedItemIds((sessionItems || []).map((i) => i.id))
    }
  }

  const toggleItem = (id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const [itemRemarks, setItemRemarks] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    ;(sessionItems || []).forEach((i) => {
      if (i && i.id) {
        init[i.id] = i.remark || ''
      }
    })
    return init
  })

  const [evidenceQrDataUrl, setEvidenceQrDataUrl] = useState<string>('')
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)
  const [isMissingSignatureDialogOpen, setIsMissingSignatureDialogOpen] = useState(false)

  useEffect(() => {
    if (!session?.id) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const targetUrl = `${origin}/activity-evidence/${session.id}`
    QRCode.toDataURL(targetUrl, { margin: 1, width: 140, errorCorrectionLevel: 'M' })
      .then((url) => setEvidenceQrDataUrl(url))
      .catch((err) => console.error('Failed to generate evidence QR code:', err))
  }, [session?.id])

  function getSignatureDataUrl() {
    const signature = signatureRef.current
    if (!signature) return ''
    const canvas = signature.getCanvas()
    if (!hasVisibleCanvasInk(canvas) && signature.isEmpty()) return ''
    try {
      return signature.getTrimmedCanvas().toDataURL('image/png')
    } catch {
      return signature.toDataURL('image/png')
    }
  }

  function updateSignaturePreview() {
    const signatureDataUrl = getSignatureDataUrl()
    if (!signatureDataUrl) return
    setPreviewSignatureDataUrl(signatureDataUrl)
    setPreviewSignedAt((current) => current || new Date())
  }

  function handleSubmit() {
    setError('')
    const drawn = getSignatureDataUrl()
    const signatureDataUrl = drawn || previewSignatureDataUrl || registeredSignature || ''
    if (!signatureDataUrl) {
      setIsMissingSignatureDialogOpen(true)
      return
    }
    const signedAt = new Date()
    setPreviewSignatureDataUrl(signatureDataUrl)
    setPreviewSignedAt(signedAt)
    startTransition(async () => {
      const result = await approveDailyActivityStepByToken(token, {
        signatureDataUrl,
        remarks,
        itemRemarks,
      })
      if (result.success) {
        setDone(true)
        setApprovalHistory((current) =>
          current.map((step: any) =>
            step.id === approval.id
              ? { ...step, status: 'approved', signatureDataUrl, remarks, signedAt }
              : step
          )
        )
        toast.success('Approval Daily Activity berhasil disetujui & ditandatangani!')
      } else {
        setError(result.error || 'Gagal menyimpan approval.')
        toast.error(result.error || 'Gagal menyimpan approval.')
      }
    })
  }

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    actionType: 'reject' | 'revert'
  } | null>(null)

  function executeReject() {
    setError('')
    startTransition(async () => {
      const result = await rejectDailyActivityStepByToken(token, { remarks })
      if (result.success) {
        setRejected(true)
        setApprovalHistory((current) =>
          current.map((step: any) =>
            step.id === approval.id
              ? { ...step, status: 'rejected', remarks, signedAt: new Date() }
              : step
          )
        )
        toast.success('Approval Daily Activity ditolak.')
      } else {
        setError(result.error || 'Gagal menolak approval.')
        toast.error(result.error || 'Gagal menolak approval.')
      }
    })
  }

  function executeRevert() {
    setError('')
    startTransition(async () => {
      const result = await revertDailyActivityStepByToken(token, { remarks: remarks || 'Dokumen dikembalikan untuk revisi.' })
      if (result.success) {
        setReverted(true)
        toast.success('Dokumen Daily Activity berhasil dikembalikan untuk revisi.')
      } else {
        setError(result.error || 'Gagal mengembalikan dokumen.')
        toast.error(result.error || 'Gagal mengembalikan dokumen.')
      }
    })
  }

  function handleReject() {
    setConfirmDialog({ isOpen: true, actionType: 'reject' })
  }

  function handleRevert() {
    setConfirmDialog({ isOpen: true, actionType: 'revert' })
  }

  const handleExportExcel = () => {
    const headers = ['No', 'Aktivitas', 'Grup Pekerjaan', 'Unit', 'Durasi', 'Poin', 'Catatan']
    const rows = (sessionItems || []).map((item, idx) => [
      idx + 1,
      item.label || '-',
      item.group || '-',
      item.unitNumber || '-',
      item.duration || '-',
      item.points || 0,
      itemRemarks[item.id] || item.remark || '-',
    ])
    exportToCsv(`Daily_Activity_${session.sessionCode || 'Export'}.csv`, headers, rows)
    toast.success('Data aktivitas berhasil diekspor.')
  }

  const handleDirectDownloadPdf = async () => {
    const el = document.getElementById('pdf-page-1')
    if (!el) {
      handlePrintPdf()
      return
    }
    setIsDownloading(true)
    try {
      await downloadElementAsPdf(el, `DailyActivity_${session.sessionCode || 'Document'}.pdf`)
      toast.success('PDF berhasil diunduh.')
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  const shouldShowCurrentPreview = done || Boolean(previewSignatureDataUrl || remarks.trim())
  const approvalHistoryForDisplay = shouldShowCurrentPreview
    ? approvalHistory.map((step: any) =>
        step.id === approval.id
          ? {
              ...step,
              status: done ? 'approved' : 'preview',
              signatureDataUrl: previewSignatureDataUrl || step.signatureDataUrl,
              remarks,
              signedAt: previewSignedAt || step.signedAt,
            }
          : step
      )
    : approvalHistory

  const employeeSig = getSignatureStep(approvalHistoryForDisplay, 'employee')
  const leaderSig = getSignatureStep(approvalHistoryForDisplay, 'leader', 'pjo_or_te_initial')
  const sectionHeadSig = getSignatureStep(approvalHistoryForDisplay, 'section_head', 'section_head_confirmation')
  const managerSig = getSignatureStep(approvalHistoryForDisplay, 'manager', 'central_service_manager', 'hr')

  function renderApprovalMeta(step: any) {
    if (!step?.signedAt && !step?.remarks) return null
    return (
      <div className="mt-1 space-y-0.5 text-[7pt] text-slate-500 max-w-[160px] leading-tight">
        {step?.signedAt && <div>Waktu TTD: {formatDateTime(step.signedAt)}</div>}
        {step?.remarks && (
          <div className="italic break-words whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            Catatan: {step.remarks}
          </div>
        )}
      </div>
    )
  }

  const handlePrintPdf = () => {
    const html = document.querySelector('#pdf-content')?.innerHTML || ''
    const letterheadUrl = new URL('/ChitraParatama_Stationery_Letterhead_jkt.jpg', window.location.origin).toString()
    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(`<!doctype html><html><head><title>Daily Activity - ${employee.name} (${session.sessionCode})</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Manrope', 'Inter', Arial, sans-serif; }
        .page { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; background-size: 100% 100%; background-repeat: no-repeat; background-position: top center; }
        .content { position: relative; z-index: 10; padding: 38mm 20mm 35mm 20mm; font-size: 8pt; line-height: 1.25; color: black; height: 100%; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; }
        td, th { border: 1px solid black; padding: 3px 5px; font-size: 8pt; }
        th { font-weight: bold; background: #f8fafc; }
        .font-bold { font-weight: bold; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .flex { display: flex; }
        .items-end { align-items: flex-end; }
        .h-16 { height: 4rem; }
        .mt-4 { margin-top: 1rem; }
        .text-gray-400 { color: #9ca3af; }
        .text-gray-500 { color: #6b7280; }
        .mb-1 { margin-bottom: 0.25rem; }
        .border-b { border-bottom: 1px solid black; }
      </style>
    </head><body>
      <div class="page" style="background-image: url('${letterheadUrl}');">
        <div class="content">
          ${html}
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 300);
        };
      </script>
    </body></html>`)
    printWindow.document.close()
  }

  const documentContent = (
    <div
      id="pdf-content"
      className="relative z-10 text-[8.5pt] font-sans leading-tight text-black"
      style={{
        paddingTop: '38mm',
        paddingBottom: '35mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Document with Scan Evidence QR */}
      <div className="relative mb-3">
        <div className="text-center">
          <h1 className="font-bold text-[11pt] text-black mb-0.5 uppercase">PT. CHITRA PARATAMA</h1>
          <h2 className="font-bold text-[12pt] text-black uppercase">{session.splNumber ? 'SURAT PERINTAH LEMBUR' : 'DAILY ACTIVITY APPROVAL REPORT'}</h2>
        </div>

        <div
          onClick={() => setIsEvidenceModalOpen(true)}
          className="absolute right-0 top-0 flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded shadow-xs cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group select-none"
          title="Klik untuk membuka galeri foto bukti pekerjaan"
        >
          {evidenceQrDataUrl ? (
            <img src={evidenceQrDataUrl} alt="Evidence QR" className="w-11 h-11 object-contain" />
          ) : (
            <div className="w-11 h-11 bg-slate-100 flex items-center justify-center text-[6pt] text-slate-400">
              QR Code
            </div>
          )}
          <span className="text-[6pt] font-bold text-slate-800 mt-0.5 group-hover:text-indigo-600 leading-tight">Scan Evidence</span>
          <span className="text-[5pt] text-slate-500 leading-tight">Klik Bukti</span>
        </div>
      </div>

      {/* Details & Profile Box */}
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 text-[8.5pt]">
        <tbody>
          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Details</td></tr>
          <tr>
            <td className="w-1/2">Tanggal Kerja: <strong>{formatDate(session.workDate)}</strong></td>
            <td className="w-1/2">Shift: <strong>{session.shiftCode || 'ALL'}</strong></td>
          </tr>
          <tr>
            <td>Kode Sesi: <strong>{session.sessionCode}</strong></td>
            <td>Status: <span className="capitalize font-bold text-black">{session.status || 'COMPLETED'}</span></td>
          </tr>
          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Employee Profile</td></tr>
          <tr>
            <td>Nama: <strong>{employee.name}</strong></td>
            <td>SN: <strong>{employee.sn}</strong></td>
          </tr>
          <tr>
            <td>Job Title: <strong>{employee.jobTitle || 'Staff'}</strong></td>
            <td>Dept / Section: <strong>{[employee.department, employee.section].filter(Boolean).join(' / ') || '—'}</strong></td>
          </tr>
          <tr>
            <td>Site: <strong>{site.name || '—'}</strong></td>
            <td>Customer: <strong>{site.customerName || 'PT Chitra Paratama'}</strong></td>
          </tr>
          {session.teamMembersSummary ? (
            <tr>
              <td colSpan={2}>
                Anggota Tim: <strong className="text-blue-900">{session.teamMembersSummary}</strong>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Activities Table */}
      <div className="font-bold mb-1 text-[8.5pt]">
        A. Daily Activity Items (Total: {(sessionItems || []).length} item)
      </div>
      <table className="w-full border-collapse border border-black mb-4 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
        <thead>
          <tr className="bg-gray-100 font-bold text-center">
            <th className="w-[5%]">#</th>
            <th className="text-left w-[38%]">Aktivitas</th>
            <th className="w-[14%]">Unit</th>
            <th className="w-[12%]">Durasi</th>
            <th className="w-[10%]">Poin</th>
            <th className="text-left w-[21%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          {(sessionItems || []).length > 0 ? (
            (sessionItems || []).map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="text-center align-middle">{idx + 1}</td>
                <td className="align-middle">{item.label}</td>
                <td className="text-center align-middle">{item.unitNumber || '-'}</td>
                <td className="text-center align-middle">{item.duration}</td>
                <td className="text-center font-bold align-middle">{item.points || 0}</td>
                <td className="text-left text-[7.5pt] align-middle">{item.remark || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-3">Belum ada item aktivitas.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* B. Approval Steps */}
      <div className="font-bold mb-1 text-[8.5pt]">
        B. Approval Steps
      </div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-gray-100 font-bold">
            <th style={{ width: '6%' }}>#</th>
            <th className="text-left" style={{ width: '22%' }}>Tahap</th>
            <th className="text-left" style={{ width: '22%' }}>Approver</th>
            <th style={{ width: '14%' }}>Status</th>
            <th style={{ width: '16%' }}>Waktu</th>
            <th className="text-left" style={{ width: '20%' }}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {(approvalHistoryForDisplay || []).length > 0 ? (
            (approvalHistoryForDisplay || []).map((step: any) => {
              const isCurrentStep = step.id === approval?.id
              const liveRemark = isCurrentStep && remarks
                ? remarks
                : step.remarks || '—'
              const isApproved = step.status === 'approved' || step.status === 'signed'
              return (
                <tr key={step.stepOrder || step.id}>
                  <td>{step.stepOrder}</td>
                  <td className="text-left">{step.stepLabel}</td>
                  <td className="text-left font-semibold">{step.approverName || '-'}</td>
                  <td className={cn("capitalize font-semibold", isApproved ? "text-emerald-700 font-bold" : "")}>
                    {step.stepOrder === 1 && isApproved
                      ? 'Approved'
                      : step.status}
                  </td>
                  <td className="text-[7pt] font-mono">{formatDateTime(step.signedAt)}</td>
                  <td className="text-left italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {liveRemark}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-slate-400 py-2">Belum ada riwayat persetujuan.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signatories */}
      <div className="font-bold mb-2 text-[8.5pt]">Signatories</div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 text-[8pt] mb-3">
        {/* Employee */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Employee Signature</div>
          <div className="h-14 flex items-end">
            {employeeSig?.signatureDataUrl ? (
              <img src={employeeSig.signatureDataUrl} alt="TTD" className="h-10 object-contain" />
            ) : employeeSig?.status === 'approved' ? (
              <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">{employee.name}</span>
            ) : (
              <span className="text-slate-400 italic text-[7.5pt]"></span>
            )}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
            {employeeSig?.approverName || employee.name}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">{employee.jobTitle || 'Staff'}</div>
          {renderApprovalMeta(employeeSig)}
        </div>

        {/* Leader / PJO */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Leader / PJO Signature</div>
          <div className="h-14 flex items-end">
            {leaderSig?.signatureDataUrl ? (
              <img src={leaderSig.signatureDataUrl} alt="TTD" className="h-10 object-contain" />
            ) : leaderSig?.status === 'approved' ? (
              <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">{leaderSig.approverName || 'Leader / PJO'}</span>
            ) : (
              <span className="text-slate-400 italic text-[7.5pt]"></span>
            )}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
            {leaderSig?.approverName || 'Leader Lapangan'}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">{leaderSig?.stepLabel || 'Leader / PJO'}</div>
          {renderApprovalMeta(leaderSig)}
        </div>

        {/* Section Head */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Section Head Signature</div>
          <div className="h-14 flex items-end">
            {sectionHeadSig?.signatureDataUrl ? (
              <img src={sectionHeadSig.signatureDataUrl} alt="TTD" className="h-10 object-contain" />
            ) : sectionHeadSig?.status === 'approved' ? (
              <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">{sectionHeadSig.approverName || 'Section Head'}</span>
            ) : (
              <span className="text-slate-400 italic text-[7.5pt]"></span>
            )}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
            {sectionHeadSig?.approverName || 'Section Head'}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">{sectionHeadSig?.stepLabel || 'Section Head'}</div>
          {renderApprovalMeta(sectionHeadSig)}
        </div>
      </div>

      {/* Evidence QR in Bottom Right Corner (Clickable to open floating modal) */}
      <div className="absolute right-[20mm] bottom-[18mm]">
        <div
          onClick={() => setIsEvidenceModalOpen(true)}
          className="flex flex-col items-center justify-start text-center border-l border-slate-200 pl-2 cursor-pointer group select-none transition-transform hover:scale-105 active:scale-95"
          title="Klik untuk membuka galeri foto bukti pekerjaan"
        >
          <div className="h-14 flex items-center justify-center">
            {evidenceQrDataUrl ? (
              <img src={evidenceQrDataUrl} alt="QR Evidence" className="h-12 w-12 object-contain rounded border border-slate-200 p-0.5 bg-white shadow-xs group-hover:border-indigo-500 group-hover:shadow-md transition-all" />
            ) : (
              <div className="h-12 w-12 rounded border border-dashed border-slate-300 flex items-center justify-center text-[6pt] text-slate-400">
                QR Code
              </div>
            )}
          </div>
          <div className="font-bold text-[7.5pt] text-slate-800 mt-0.5 group-hover:text-indigo-600 transition-colors">
            Scan / Klik Bukti Kerja
          </div>
          <div className="text-[6.5pt] text-slate-500 leading-tight">
            Validasi Dokumen Digital
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-5 md:p-8">
      <div className="mx-auto max-w-[1700px] space-y-4 sm:space-y-6">
        {/* ── Top Header & Action Bar ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/mobile/approval"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1 transition"
              >
                <ChevronLeft className="size-3.5" />
                Inbox Approval
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold uppercase text-teal-800 border border-teal-200">
                  <Briefcase className="size-3" /> Daily Activity Hub
                </span>
                <span className="font-mono text-xs font-bold text-slate-600">
                  #{session.sessionCode || 'DRAFT'}
                </span>
                <Badge
                  variant="outline"
                  className="rounded-full border-teal-200 bg-teal-50 text-xs font-bold text-teal-700"
                >
                  {approval.stepLabel || 'Review & Approval'}
                </Badge>
              </div>
              <h1 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
                {employee.name} — {employee.jobTitle || 'Activity Report'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Site: <span className="font-semibold text-slate-700">{site.name || '-'}</span> • Tanggal:{' '}
                <span className="font-semibold text-slate-700">{formatDate(session.workDate)}</span> • Shift:{' '}
                <span className="font-semibold text-slate-700">{session.shiftCode || '-'}</span> • Total Poin:{' '}
                <span className="font-semibold text-slate-700">{totals.totalPoints} pts</span>
              </p>
            </div>

            {/* Actions & View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Segmented View Switcher on Mobile/Tablet */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 xl:hidden">
                <button
                  type="button"
                  onClick={() => setActiveMobileView('form')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
                    activeMobileView === 'form'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <FileText className="size-3.5" /> Form & TTD
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMobileView('letter')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
                    activeMobileView === 'letter'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <Eye className="size-3.5" /> Preview Surat
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <FileSpreadsheet className="size-3.5 mr-1 text-emerald-600" /> Excel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDirectDownloadPdf}
                disabled={isDownloading}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <Download className="size-3.5 mr-1 text-teal-600" />
                {isDownloading ? 'Mengunduh...' : 'Download PDF'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintPdf}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hidden sm:inline-flex"
              >
                <Printer className="size-3.5 mr-1 text-slate-500" /> Print
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main Content Layout ── */}
        <div className="flex w-full flex-col items-stretch gap-6 xl:flex-row xl:items-start">
          {/* ── KIRI: Form, Status & TTD ── */}
          <div
            className={cn(
              'w-full shrink-0 space-y-4 xl:w-[460px]',
              activeMobileView === 'form' ? 'block' : 'hidden xl:block'
            )}
          >
            {/* Status Alert */}
            {done ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-800 text-xs flex items-center gap-3 shadow-xs">
                <CheckCircle2 className="size-5 shrink-0 text-teal-600" />
                <div>
                  <p className="font-bold">Approval Telah Disetujui</p>
                  <p className="text-[11px] text-teal-700">
                    Anda telah menyetujui dan menandatangani laporan kerja harian ini.
                  </p>
                </div>
              </div>
            ) : rejected ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs flex items-center gap-3 shadow-xs">
                <XCircle className="size-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold">Approval Ditolak</p>
                  <p className="text-[11px] text-rose-700">
                    Laporan aktivitas harian ini telah ditolak.
                  </p>
                </div>
              </div>
            ) : reverted ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <RotateCcw className="size-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-bold">Dikembalikan untuk Revisi</p>
                    <p className="text-[11px] text-amber-700">
                      Dokumen telah dikembalikan ke pemohon untuk revisi.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  asChild
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
                >
                  <Link href={`/dashboard/activity-hub/document/${session?.id || ''}/approval`}>
                    Buka Form Edit ↗
                  </Link>
                </Button>
              </div>
            ) : null}

            {/* Status Approval Timeline Card */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="size-3.5 text-slate-500" /> Tahapan & Status Approval
              </h2>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {approvalHistoryForDisplay.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{step.approverName || '—'}</p>
                      <p className="text-[10px] text-slate-500">
                        {ROLE_LABELS[step.approverRole] || step.stepLabel || step.approverRole}
                      </p>
                      {['approved', 'preview'].includes(step.status) ? (
                        <div className="mt-0.5 space-y-0.5 text-[9.5px] text-slate-500">
                          <p suppressHydrationWarning>Waktu: {formatDateTime(step.signedAt)}</p>
                          {step.remarks ? <p className="line-clamp-1 italic text-slate-600">Catatan: {step.remarks}</p> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {step.status === 'approved' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 rounded-full border-0 px-2 text-[10px]">
                          Disetujui
                        </Badge>
                      ) : step.status === 'preview' ? (
                        <Badge className="bg-sky-50 text-sky-700 rounded-full border-0 px-2 text-[10px]">
                          Preview Anda
                        </Badge>
                      ) : step.status === 'rejected' ? (
                        <Badge className="bg-red-50 text-red-700 rounded-full border-0 px-2 text-[10px]">
                          Ditolak
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-slate-400">
                          Menunggu
                        </Badge>
                      )}
                      {step.signatureDataUrl && (
                        <img src={step.signatureDataUrl} alt="TTD" className="h-5 object-contain" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Multi-Select Activity Verification Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="size-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Aktivitas ({sessionItems.length} item • {totals.totalPoints} pts)
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAllItems}
                  className="h-7 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 px-2"
                >
                  {isAllItemsSelected ? 'Batal Semua' : 'Pilih Semua'}
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                {(sessionItems || []).map((item, idx) => {
                  const isSelected = selectedItemIds.includes(item.id)
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        'p-2 rounded-xl cursor-pointer transition text-xs space-y-1',
                        isSelected ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="size-4 text-teal-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="size-4 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 leading-tight">
                              {item.label}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {item.group} {item.unitNumber ? `• Unit ${item.unitNumber}` : ''} • Durasi: {item.duration}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-bold bg-white">
                          +{item.points} pts
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Approval & Signature Card */}
            {!done && !rejected && !reverted && (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <PenTool className="size-4 text-teal-600" /> Tanda Tangan & Persetujuan
                </h3>

                {/* Digital Signature */}
                {previewSignatureDataUrl && !isManualDraw ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-xs">
                        <img
                          src={previewSignatureDataUrl}
                          alt="Tanda Tangan Terdaftar"
                          className="max-h-11 max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Tanda Tangan Digital Terdaftar
                        </p>
                        <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="size-3.5" /> Siap ditempelkan otomatis ke laporan
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManualDraw(true)}
                      className="h-8 rounded-lg border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white shrink-0"
                    >
                      <PenTool className="size-3 mr-1 text-slate-500" /> Ubah TTD
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        Gambar Tanda Tangan
                      </label>
                      <div className="flex items-center gap-2">
                        {previewSignatureDataUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-teal-700 hover:text-teal-800 p-0"
                            onClick={() => setIsManualDraw(false)}
                          >
                            Pakai TTD Terdaftar
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] text-slate-500 hover:text-slate-800 p-0"
                          onClick={() => {
                            signatureRef.current?.clear()
                            setPreviewSignatureDataUrl('')
                            setPreviewSignedAt(null)
                          }}
                        >
                          Bersihkan
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-300 bg-white p-1 shadow-inner">
                      <SignatureCanvas
                        ref={signatureRef}
                        onEnd={updateSignaturePreview}
                        canvasProps={{
                          className: 'h-36 w-full touch-none rounded-lg bg-white',
                        }}
                        backgroundColor="rgba(255,255,255,0)"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Catatan Approval (Remarks)
                  </label>
                  <Textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Tuliskan catatan atau rekomendasi khusus..."
                    rows={2}
                    className="text-xs rounded-xl border-slate-200 focus-visible:ring-teal-500"
                  />
                </div>
                {error ? <p className="text-xs font-bold text-red-600">{error}</p> : null}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs h-9 px-4"
                      onClick={handleReject}
                      disabled={isPending}
                    >
                      <XCircle className="mr-1 size-3.5" /> Tolak
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 font-bold text-xs h-9 px-4"
                      onClick={handleRevert}
                      disabled={isPending}
                    >
                      <RotateCcw className="mr-1 size-3.5" /> Revisi
                    </Button>
                  </div>

                  <Button
                    type="button"
                    className="rounded-xl bg-[#003461] hover:bg-[#002647] text-white font-bold text-xs h-9 px-5 shadow-xs"
                    onClick={handleSubmit}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="mr-1.5 size-4" />
                    {isPending ? 'Menyimpan...' : 'Setujui & Tanda Tangani'}
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* ── KANAN: Preview Surat Resmi ── */}
          <div
            className={cn(
              'min-w-0 flex-1 rounded-2xl bg-slate-200/70 p-3 sm:p-5 shadow-inner overflow-x-auto print:p-0 print:bg-white',
              activeMobileView !== 'form' ? 'block' : 'hidden xl:block'
            )}
          >
            <div className="flex min-w-max flex-col gap-6">
              <div
                id="pdf-page-1"
                className="relative mx-auto shrink-0 min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-md text-xs print:shadow-none"
                style={{
                  backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                  backgroundSize: '100% 100%',
                }}
              >
                {documentContent}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Confirmation Dialog for Reject / Revert */}
      <Dialog
        open={Boolean(confirmDialog?.isOpen)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6 shadow-xl bg-white border border-slate-200">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  confirmDialog?.actionType === 'reject'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
                )}
              >
                {confirmDialog?.actionType === 'reject' ? (
                  <XCircle className="size-5" />
                ) : (
                  <RotateCcw className="size-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {confirmDialog?.actionType === 'reject'
                    ? 'Apakah Anda yakin ingin menolak approval ini?'
                    : 'Apakah Anda yakin ingin mengembalikan approval ini?'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
            <span className="font-semibold text-slate-700">Catatan tersimpan:</span>{' '}
            {remarks ? (
              <span>{remarks}</span>
            ) : (
              <span className="italic text-slate-400">Tidak ada catatan tambahan.</span>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-xs rounded-xl h-9 px-4 font-semibold text-slate-600 border-slate-200"
              onClick={() => setConfirmDialog(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className={cn(
                'text-xs rounded-xl h-9 px-4 font-bold text-white shadow-sm',
                confirmDialog?.actionType === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              )}
              onClick={() => {
                if (!confirmDialog) return
                const { actionType } = confirmDialog
                setConfirmDialog(null)
                if (actionType === 'reject') {
                  executeReject()
                } else {
                  executeRevert()
                }
              }}
            >
              {confirmDialog?.actionType === 'reject' ? 'Ya, Tolak' : 'Ya, Kembalikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Evidence Modal */}
      <DailyActivityEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        sessionId={session?.id}
      />

      {/* Floating Missing Signature Warning Dialog */}
      <MissingSignatureDialog
        isOpen={isMissingSignatureDialogOpen}
        onClose={() => setIsMissingSignatureDialogOpen(false)}
        onSignatureRegistered={(sigUrl) => {
          setRegisteredSignature(sigUrl)
          setPreviewSignatureDataUrl(sigUrl)
          setPreviewSignedAt(new Date())
          setIsMissingSignatureDialogOpen(false)
          toast.success('Tanda tangan digital berhasil didaftarkan! Silakan tekan tombol Setujui.')
        }}
      />
    </main>
  )
}
