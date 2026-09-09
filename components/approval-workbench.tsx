'use client'

// Universal Centralized Approval Workbench
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import {
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileDown,
  FileSignature,
  FileSpreadsheet,
  FileText,
  HardHat,
  MapPin,
  PenTool,
  RotateCcw,
  Search,
  Square,
  Settings,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { DailyActivityEvidenceModal } from '@/components/daily-activity-evidence-modal'
import { SopWinAccessSettingsModal } from '@/components/sop-win/sop-win-access-settings-modal'
import { getDepartmentSignatories, getDepartmentWorkflowSteps } from '@/components/sop-win/sop-win-approval-workspace'
import { approveApprovalGroupAction, reviewApprovalAction } from '@/app/dashboard/admin-actions'
// User signature action for approval workspace signoffs
import { getUserSignatureAction } from '@/app/actions/user-signature'
import {
  singleApproveDailyActivityAction,
  singleRejectDailyActivityAction,
  singleRevertDailyActivityAction,
  batchApproveDailyActivitySessionsAction,
  batchRevertDailyActivitySessionsAction,
  batchRejectDailyActivitySessionsAction,
} from '@/app/dashboard/activity-hub/actions'
import {
  singleApproveOvertimeRequestAction,
  singleRejectOvertimeRequestAction,
  singleRevertOvertimeRequestAction,
  batchApproveOvertimeRequestsAction,
  batchRevertOvertimeRequestsAction,
  batchRejectOvertimeRequestsAction,
} from '@/app/dashboard/overtime-requests/actions'
import {
  singleApprovePtwPermitAction,
  singleRejectPtwPermitAction,
  singleRevertPtwPermitAction,
  batchApprovePtwPermitsAction,
  batchRevertPtwPermitsAction,
  batchRejectPtwPermitsAction,
} from '@/app/dashboard/hse/izin-kerja-ptw/actions'
import { EQUIPMENT_CHECKLIST_PER_TYPE, isItemChecked, getPermitSubTypes, cleanPtwDescription, extractCheckedEquipment } from '@/lib/ptw-helpers'
import { PtwChecklistTable } from '@/components/ptw-checklist-table'
import { reviewSopWinDocumentRequestAction } from '@/app/dashboard/sop-win/actions'
import { AdminDetailDrawer } from '@/components/admin/admin-detail-drawer'
import { ApprovalRequestDetails } from '@/components/approval-request-details'
import { ApdApprovalDialog } from '@/components/admin/apd-approval-dialog'
import { FiveRApprovalDialog } from '@/components/admin/five-r-approval-dialog'
import { FiveRDocumentPreview } from '@/components/five-r/five-r-document-preview'
import {
  approveFiveRReportAction,
  revertFiveRReportAction,
  rejectFiveRReportAction,
} from '@/app/dashboard/quality/5r/actions'
import { FormWoApprovalDialog } from '@/components/admin/form-wo-approval-dialog'
import { FormWoDocumentView } from '@/components/form-wo-document-preview-dialog'
import { RfrApprovalDialog } from '@/components/admin/rfr-approval-dialog'
import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { ApprovalReviewDrawerForm } from '@/components/approval-review-drawer-form'
import { MissingSignatureDialog } from '@/components/missing-signature-dialog'
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'
import { TableFilterPresets } from '@/components/table-filter-presets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { downloadElementAsPdf, downloadFilesAsZip } from '@/lib/pdf-download'
import { cn } from '@/lib/utils'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatTime(value: Date | string | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (!date || isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
}

function formatPtwTime(value: Date | string | null | undefined) {
  if (!value) return '08:00'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '08:00'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
}

async function withActionRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const errStr = String(err?.message || err?.cause?.message || err || "").toLowerCase()
      const isNetworkError =
        errStr.includes("network error") ||
        errStr.includes("failed to fetch") ||
        errStr.includes("econnreset") ||
        errStr.includes("network")
      if (attempt <= retries && isNetworkError) {
        console.warn(`[withActionRetry] Network error detected (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
        continue
      }
      throw err
    }
  }
}

function ApprovalFilterBar({
  sites,
  priorities,
  statusOptions,
}: {
  sites: string[]
  priorities: string[]
  statusOptions: string[]
}) {
  return (
    <>
      <select
        data-table-filter-key="site"
        defaultValue=""
        className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
      >
        <option value="">Semua site</option>
        {sites.map((site) => (
          <option key={site} value={site}>
            {site}
          </option>
        ))}
      </select>
      <select
        data-table-filter-key="priority"
        defaultValue=""
        className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
      >
        <option value="">Semua prioritas</option>
        {priorities.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <select
        data-table-filter-key="status"
        defaultValue=""
        className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
      >
        <option value="">Semua status</option>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </>
  )
}

function RfrInboxTab({ items }: { items: ApprovalCenterData['rfrInboxItems'] }) {
  if (!items || items.length === 0) {
    return (
      <Card className="bg-surface-container-lowest rounded-[1.6rem] shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>RFR Approval</CardTitle>
          <CardDescription>Belum ada Request for Recruitment yang menunggu persetujuan Anda.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-surface-container-lowest rounded-[1.4rem] border-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
      <CardContent className="pt-6">
        <MinimalTableShell
          title="RFR yang harus saya approve"
          description="Request for Recruitment (RFR) yang memerlukan persetujuan Anda pada tahap ini."
          label="rfr items"
          fileName="rfr-inbox"
          searchPlaceholder="Cari nomor RFR, posisi, section/department, atau approver..."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor RFR</TableHead>
                <TableHead>Pemohon</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Section / Dept</TableHead>
                <TableHead>Tahap</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="align-top">
                    <p className="text-foreground font-semibold text-sm">{item.rfrNumber}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.submittedAt.toLocaleDateString('id-ID')}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-foreground text-sm">{item.requestorName}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-foreground text-sm font-medium">{item.positionTitle}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.numberOfPersons} orang
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-foreground text-sm">{item.sectionDepartment}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-foreground text-sm font-medium">
                      {item.roleLabel}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Step {item.stepOrder}/{item.totalSteps}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <AdminStatusBadge value={item.dueState} />
                    <p className="text-muted-foreground mt-1 text-xs">
                      Due {item.dueAt.toLocaleString('id-ID')}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <Link href={item.url} target="_blank">
                      <Button type="button" variant="outline" size="dense">
                        Review & Tanda Tangan
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </CardContent>
    </Card>
  )
}

export function InboxTab({
  groups,
  rfrItems = [],
  dailyActivityItems = [],
  overtimeItems = [],
  ptwItems = [],
  contractReviewItems = [],
  sopWinRequestItems = [],
  filterCategory,
  viewMode = 'desktop',
}: {
  groups: ApprovalCenterData['inboxGroups']
  rfrItems?: ApprovalCenterData['rfrInboxItems']
  dailyActivityItems?: ApprovalCenterData['dailyActivityInboxItems']
  overtimeItems?: ApprovalCenterData['overtimeInboxItems']
  ptwItems?: ApprovalCenterData['ptwInboxItems']
  contractReviewItems?: ApprovalCenterData['contractReviewInboxItems']
  sopWinRequestItems?: ApprovalCenterData['sopWinRequestInboxItems']
  filterCategory?: string
  viewMode?: 'desktop' | 'mobile'
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mobileSearch, setMobileSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(filterCategory || 'ALL')

  // Batch Review Modal State
  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false)
  const [batchReviewIndex, setBatchReviewIndex] = useState(0)
  const [viewerZoom, setViewerZoom] = useState(1.0)
  const [approvalRemarks, setApprovalRemarks] = useState<Record<string, string>>({})
  const [isBatchActionRunning, setIsBatchActionRunning] = useState(false)
  const [processedBatchIds, setProcessedBatchIds] = useState<Set<string>>(new Set())
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  // Confirmation dialogs & validation state
  const [confirmActionType, setConfirmActionType] = useState<'approve' | 'revert' | 'reject' | null>(null)
  const [confirmBatchActionType, setConfirmBatchActionType] = useState<'approve' | 'revert' | 'reject' | null>(null)
  const [actionReasonInput, setActionReasonInput] = useState('')
  const [remarkFieldError, setRemarkFieldError] = useState(false)

  // Signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [isMissingSignatureDialogOpen, setIsMissingSignatureDialogOpen] = useState(false)
  const [isAccessSettingsOpen, setIsAccessSettingsOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Document Preview Scaling & Zoom State (Matching Mobile Daily Activity approval)
  const [previewZoom, setPreviewZoom] = useState<number>(1.0)

  useEffect(() => {
    async function loadSig() {
      try {
        const res = await getUserSignatureAction()
        if (res.success) {
          if (res.signatureDataUrl) {
            setSignatureDataUrl(res.signatureDataUrl)
          }
          if (res.employeeName) {
            setCurrentUserName(res.employeeName)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadSig()
  }, [])

  useEffect(() => {
    function handleIframeMsg(e: MessageEvent) {
      if (e.data && e.data.type === 'readyForSignature') {
        const iframe = document.querySelector('#unified-batch-preview-sheet iframe') as HTMLIFrameElement
        if (iframe?.contentWindow && signatureDataUrl) {
          iframe.contentWindow.postMessage({ type: 'previewSignature', dataUrl: signatureDataUrl }, '*')
        }
      }
    }
    window.addEventListener('message', handleIframeMsg)
    return () => window.removeEventListener('message', handleIframeMsg)
  }, [signatureDataUrl])

  useEffect(() => {
    const sendToIframe = () => {
      const iframe = document.querySelector('#unified-batch-preview-sheet iframe') as HTMLIFrameElement
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'previewSignature', dataUrl: signatureDataUrl || '' }, '*')
      }
    }
    sendToIframe()
    const t1 = setTimeout(sendToIframe, 150)
    const t2 = setTimeout(sendToIframe, 500)
    const t3 = setTimeout(sendToIframe, 1200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [signatureDataUrl, isBatchReviewOpen, batchReviewIndex])

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    setHasDrawn(true)
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000000'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'))
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setSignatureDataUrl(null)
  }

  // All unified items
  const allUnifiedItems = useMemo(() => {
    const list: Array<{
      id: string
      category: 'DAILY_ACTIVITY' | 'OVERTIME' | 'PTW' | 'CONTRACT_REVIEW' | 'SOP_WIN_REQUEST' | 'RFR' | 'GENERAL'
      categoryLabel: string
      documentNumber: string
      title: string
      employeeName: string
      department?: string
      section?: string
      siteName?: string
      location?: string
      workDate?: Date | string | null
      shiftCode?: string
      stepLabel: string
      approverName?: string | null
      approverRole?: string | null
      dueState: string
      dueAt: Date
      submittedAt: Date
      url: string
      isReverted?: boolean
      actionLabel?: string
      rawDaily?: (typeof dailyActivityItems)[number]
      rawOvertime?: (typeof overtimeItems)[number]
      rawPtw?: (typeof ptwItems)[number]
      rawContractReview?: (typeof contractReviewItems)[number]
      rawSopWinRequest?: (typeof sopWinRequestItems)[number]
      rawRfr?: (typeof rfrItems)[number]
      rawGeneralGroup?: (typeof groups)[number]
    }> = []

    for (const d of dailyActivityItems) {
      const isReverted = Boolean((d as any).isReverted || (d as any).sessionStatus === 'reverted' || (d as any).status === 'reverted')
      list.push({
        id: d.id,
        category: 'DAILY_ACTIVITY',
        categoryLabel: 'Daily Activity',
        documentNumber: d.documentNumber,
        title: d.title,
        employeeName: d.employeeName,
        department: (d as any).department,
        section: (d as any).section,
        siteName: d.siteName,
        customerName: (d as any).customerName,
        summaryRemark: (d as any).summaryRemark,
        teamMembersSummary: (d as any).teamMembersSummary,
        employeeSn: (d as any).employeeSn,
        jobTitle: (d as any).jobTitle,
        workDate: (d as any).workDate || d.submittedAt,
        shiftCode: d.shiftCode,
        stepLabel: d.stepLabel,
        approverName: d.approverName,
        approverRole: d.approverRole,
        dueState: d.dueState,
        dueAt: d.dueAt,
        submittedAt: d.submittedAt,
        url: d.url,
        isReverted,
        actionLabel: (d as any).actionLabel || (isReverted ? 'Revisi Dokumen' : 'Buka TTD ↗'),
        rawDaily: d,
      })
    }

    for (const ot of overtimeItems) {
      const isReverted = Boolean((ot as any).isReverted || (ot as any).splStatus === 'reverted' || (ot as any).status === 'reverted')
      list.push({
        id: ot.id,
        category: 'OVERTIME',
        categoryLabel: 'Lembur (SPL)',
        documentNumber: ot.documentNumber,
        title: ot.title,
        employeeName: ot.employeeName,
        department: (ot as any).department,
        section: (ot as any).section,
        siteName: ot.siteName,
        workDate: (ot as any).workDate || ot.submittedAt,
        stepLabel: ot.stepLabel,
        approverName: ot.approverName,
        approverRole: ot.approverRole,
        dueState: ot.dueState,
        dueAt: ot.dueAt,
        submittedAt: ot.submittedAt,
        url: ot.url,
        isReverted,
        actionLabel: (ot as any).actionLabel || (isReverted ? 'Revisi Dokumen' : 'Buka TTD ↗'),
        rawOvertime: ot,
      })
    }

    for (const p of ptwItems) {
      list.push({
        id: p.id,
        category: 'PTW',
        categoryLabel: 'Izin Kerja (PTW)',
        documentNumber: p.documentNumber,
        title: p.title,
        employeeName: p.employeeName,
        location: p.location,
        stepLabel: p.stepLabel,
        approverName: p.approverName,
        approverRole: p.approverRole,
        dueState: p.dueState,
        dueAt: p.dueAt,
        submittedAt: p.submittedAt,
        url: p.url,
        rawPtw: p,
      })
    }

    for (const cr of contractReviewItems) {
      list.push({
        id: cr.id,
        category: 'CONTRACT_REVIEW',
        categoryLabel: 'Contract Review',
        documentNumber: `CR-${cr.approvalId}`,
        title: cr.title,
        employeeName: cr.employeeName,
        stepLabel: cr.stepLabel,
        approverName: cr.approverName,
        approverRole: cr.approverRole,
        dueState: cr.dueState,
        dueAt: cr.dueAt,
        submittedAt: cr.submittedAt,
        url: cr.url,
        rawContractReview: cr,
      })
    }

    const sopWinItems = sopWinRequestItems || []
    for (const sr of sopWinItems) {
      list.push({
        id: sr.id,
        category: 'SOP_WIN_REQUEST',
        categoryLabel: 'Permintaan Dokumen SOP/WIN',
        documentNumber: sr.documentNumber,
        title: sr.title,
        employeeName: sr.employeeName,
        department: sr.department,
        stepLabel: sr.stepLabel,
        approverName: sr.approverName,
        dueState: sr.dueState,
        dueAt: sr.dueAt,
        submittedAt: sr.submittedAt,
        url: sr.url || '/dashboard/sop-win?tab=approval',
        rawSopWinRequest: sr,
      })
    }

    for (const g of groups) {
      const formWoItem = g.items.find(
        (i: any) =>
          i.repairFormWo ||
          i.activityType === 'Form WO' ||
          i.activityType === 'Work Order' ||
          (i as any).requestKindLabel === 'Form WO' ||
          (i as any).repairFormWoId != null ||
          (i as any).title?.toLowerCase().includes('work order') ||
          (i as any).title?.toLowerCase().includes('wo ')
      )
      const isFormWo = Boolean(
        formWoItem &&
          (formWoItem.repairFormWo ||
            formWoItem.activityType === 'Work Order' ||
            (formWoItem as any).repairFormWoId != null)
      )
      const woData =
        formWoItem?.repairFormWo ||
        (isFormWo && formWoItem
          ? {
              id: (formWoItem as any).repairFormWoId || formWoItem.activityId,
              noPengajuan: formWoItem.requestNumber || formWoItem.title || `WO-${formWoItem.activityId}`,
              jenisPengajuan: formWoItem.title?.toLowerCase().includes('service') ? 'service' : 'repair',
              pemohon: formWoItem.requesterName || g.requesterName,
              pemohonJobTitle: formWoItem.requesterJobTitle || 'Pemohon',
              customer: formWoItem.unitNumber || g.siteName || 'Customer',
              site: formWoItem.siteName || g.siteName,
              deskripsiPekerjaan:
                formWoItem.description && formWoItem.description !== '-'
                  ? formWoItem.description
                  : formWoItem.title || formWoItem.remarks || 'Work Order Request',
              totalAmount: String((formWoItem as any).totalAmount || 0),
              submitterSignatureUrl: formWoItem.signatureUrl || null,
              steps: (formWoItem as any).steps || [],
            }
          : null)

      if (isFormWo && woData) {
        list.push({
          id: `form-wo-${woData.id}`,
          category: 'FORM_WO',
          categoryLabel: 'Form Permintaan Work Order',
          documentNumber: woData.noPengajuan || `WO-${woData.id}`,
          title: `Work Order: ${(woData.jenisPengajuan || 'WO').toUpperCase()} - ${woData.customer || g.siteName || 'Customer'}`,
          employeeName: woData.pemohon || g.requesterName,
          siteName: woData.site || g.siteName,
          workDate: woData.tanggalPengajuan ? new Date(woData.tanggalPengajuan) : g.workDate,
          stepLabel: formWoItem?.currentStepLabel || `${g.items.length} Step Pending`,
          dueState: g.overdueCount > 0 ? 'overdue' : g.dueSoonCount > 0 ? 'due_soon' : 'open',
          dueAt: g.items[0]?.dueAt || new Date(),
          submittedAt: g.items[0]?.submittedAt || new Date(),
          url: '#',
          approvalId: formWoItem?.approvalId,
          level: formWoItem?.level || g.items[0]?.level || 1,
          repairFormWo: woData,
          customerName: woData.customer,
          totalAmount: woData.totalAmount,
          signatureUrl: woData.submitterSignatureUrl,
          approverName: g.items[0]?.approverName || formWoItem?.approverName || null,
          rawFormWo: {
            ...woData,
            steps:
              formWoItem?.steps?.map((s: any) => ({
                level: s.level,
                approverName: s.approverName,
                jobTitle: s.label || s.jobTitle,
                status: s.status,
                decision: s.status,
                reviewedAt: s.reviewedAt,
                signatureUrl: s.signatureUrl || null,
              })) || (woData.steps || []),
          },
          rawGeneralGroup: g,
        })
      } else {
        const apdItem = g.items.find(
          (i: any) =>
            i.activityType?.toLowerCase().includes('request apd') ||
            i.activityType?.toLowerCase().includes('request tools') ||
            i.activityType?.toLowerCase().includes('request material') ||
            i.title?.toLowerCase().includes('request apd') ||
            i.title?.toLowerCase().includes('request tools') ||
            i.title?.toLowerCase().includes('request material') ||
            i.activityType === 'Summary APD' ||
            i.title?.toLowerCase().includes('summary')
        )

        const isApd = Boolean(apdItem)
        const isSummary = apdItem?.activityType === 'Summary APD' || apdItem?.title?.toLowerCase().includes('summary')
        const isMaterial = apdItem?.activityType?.toLowerCase().includes('material') || apdItem?.title?.toLowerCase().includes('material')
        const isTools = apdItem?.activityType?.toLowerCase().includes('tools') || apdItem?.title?.toLowerCase().includes('tools')

        const resolvedCategory = isSummary
          ? 'SUMMARY'
          : isMaterial
          ? 'MATERIAL'
          : isTools
          ? 'TOOLS'
          : isApd
          ? 'APD'
          : 'GENERAL'

        const resolvedCategoryLabel = isSummary
          ? 'Summary Permintaan Barang'
          : isMaterial
          ? 'Permintaan Material'
          : isTools
          ? 'Permintaan Tools'
          : isApd
          ? 'Permintaan APD'
          : 'Form Activity'

        const resolvedDocNumber = isApd
          ? (apdItem?.requestNumber ||
              (apdItem?.title?.includes(' - ')
                ? apdItem.title.split(' - ')[1]
                : isSummary
                ? `SUM-${apdItem?.activityId}`
                : isMaterial
                ? `MAT-${apdItem?.activityId}`
                : isTools
                ? `TLS-${apdItem?.activityId}`
                : `APD-${apdItem?.activityId}`) ||
              `GRP-${g.id}`)
          : `GRP-${g.id}`

        const resolvedTitle = isApd
          ? (apdItem?.title || `${resolvedCategoryLabel} - ${g.requesterName}`)
          : `${g.requesterName} - ${g.activityCount} Item Activity`

        list.push({
          id: `general-group-${g.id}`,
          category: resolvedCategory,
          categoryLabel: resolvedCategoryLabel,
          documentNumber: resolvedDocNumber,
          title: resolvedTitle,
          employeeName: g.requesterName,
          siteName: g.siteName,
          workDate: g.workDate,
          stepLabel: isApd && apdItem?.currentStepLabel ? apdItem.currentStepLabel : `${g.items.length} Step Pending`,
          dueState: g.overdueCount > 0 ? 'overdue' : g.dueSoonCount > 0 ? 'due_soon' : 'open',
          dueAt: g.items[0]?.dueAt || new Date(),
          submittedAt: g.items[0]?.submittedAt || new Date(),
          url: isApd ? (isSummary ? `/print/summary/${apdItem?.activityId}` : `/print/apd/${apdItem?.activityId}`) : '#',
          activityType: isSummary ? 'Summary APD' : (apdItem?.activityType || (isApd ? (isMaterial ? 'Request Material' : isTools ? 'Request Tools' : 'Request APD') : 'Form Activity')),
          activityId: apdItem?.activityId || g.id,
          approvalId: apdItem?.approvalId || g.items[0]?.approvalId,
          approverName: g.items[0]?.approverName || null,
          rawGeneralGroup: g,
        })
      }
    }

    for (const rfr of rfrItems) {
      list.push({
        id: `rfr-${rfr.approvalId || rfr.id}`,
        category: 'RFR',
        categoryLabel: 'Request for Recruitment',
        documentNumber: rfr.rfrNumber,
        title: `RFR: ${rfr.positionTitle} (${rfr.numberOfPersons} orang)`,
        employeeName: rfr.requestorName,
        department: rfr.sectionDepartment,
        stepLabel: `${rfr.roleLabel} (Step ${rfr.stepOrder}/${rfr.totalSteps})`,
        approverName: rfr.approverName,
        dueState: rfr.dueState,
        dueAt: rfr.dueAt,
        submittedAt: rfr.submittedAt,
        url: rfr.url,
        actionLabel: 'Review & Tanda Tangan',
        rawRfr: rfr,
      })
    }

    const sorted = list.sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
      return timeB - timeA
    })

    if (filterCategory) {
      return sorted.filter((it) => it.category === filterCategory)
    }

    return sorted
  }, [dailyActivityItems, overtimeItems, ptwItems, contractReviewItems, sopWinRequestItems, rfrItems, groups, filterCategory])

  const searchParams = useSearchParams()
  const [autoOpenedDoc, setAutoOpenedDoc] = useState<string | null>(null)

  // Adaptive category summary dynamically computed from all items (only categories with count > 0)
  const categorySummary = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    for (const item of allUnifiedItems) {
      const catKey = item.category || 'OTHER'
      const label = item.categoryLabel || catKey
      const existing = map.get(catKey)
      if (existing) {
        existing.count += 1
      } else {
        map.set(catKey, { label, count: 1 })
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      count: value.count,
    }))
  }, [allUnifiedItems])

  // Automatically reset selected category to 'ALL' if the active category no longer exists
  useEffect(() => {
    if (selectedCategory !== 'ALL' && !categorySummary.some((c) => c.key === selectedCategory)) {
      setSelectedCategory('ALL')
    }
  }, [categorySummary, selectedCategory])

  const categoryFilteredItems = useMemo(() => {
    if (selectedCategory === 'ALL') return allUnifiedItems
    return allUnifiedItems.filter((it) => it.category === selectedCategory)
  }, [allUnifiedItems, selectedCategory])

  const selectedItems = useMemo(() => {
    return allUnifiedItems.filter((it) => selectedIds.has(it.id))
  }, [allUnifiedItems, selectedIds])

  // Automatically open "BUKA TTD" floating review modal if opened via email or URL search params
  useEffect(() => {
    const openDocParam =
      searchParams?.get('openDoc') ||
      searchParams?.get('doc') ||
      searchParams?.get('documentNumber') ||
      searchParams?.get('reviewId') ||
      searchParams?.get('sessionId') ||
      searchParams?.get('id')

    if (openDocParam && allUnifiedItems.length > 0 && autoOpenedDoc !== openDocParam) {
      const paramNorm = openDocParam.trim().toLowerCase()
      const matchingItem = allUnifiedItems.find((it) => {
        const docNumNorm = (it.documentNumber || '').toLowerCase()
        const reqNumNorm = (((it as any).requestNumber || '') as string).toLowerCase()
        const itemIdNorm = (it.id || '').toLowerCase()
        const rawDailyId = String(it.rawDaily?.id || '')
        const rawOvertimeId = String(it.rawOvertime?.id || '')
        const rawPtwId = String(it.rawPtw?.id || '')

        return (
          docNumNorm === paramNorm ||
          reqNumNorm === paramNorm ||
          itemIdNorm === paramNorm ||
          rawDailyId === paramNorm ||
          rawOvertimeId === paramNorm ||
          rawPtwId === paramNorm ||
          (docNumNorm && paramNorm.includes(docNumNorm)) ||
          (docNumNorm && docNumNorm.includes(paramNorm))
        )
      })

      if (matchingItem) {
        setAutoOpenedDoc(openDocParam)
        setSelectedIds(new Set([matchingItem.id]))
        setBatchReviewIndex(0)
        setIsBatchReviewOpen(true)
      }
    }
  }, [searchParams, allUnifiedItems, autoOpenedDoc])

  const currentBatchDoc = selectedItems[batchReviewIndex] || null

  const isAllSelected = categoryFilteredItems.length > 0 && categoryFilteredItems.every((it) => selectedIds.has(it.id))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(categoryFilteredItems.map((it) => it.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleOpenBatchReview = () => {
    if (selectedItems.length === 0) {
      toast.warning('Pilih minimal 1 pengajuan untuk ditinjau.')
      return
    }
    setBatchReviewIndex(0)
    setIsBatchReviewOpen(true)
  }

  // Action dispatchers for current batch document
  const handleExecuteApprovalAction = async (action: 'approve' | 'revert' | 'reject', reason?: string) => {
    if (!currentBatchDoc) return

    if (action === 'approve' && !signatureDataUrl) {
      setIsMissingSignatureDialogOpen(true)
      return
    }

    setIsBatchActionRunning(true)
    const docId = currentBatchDoc.id
    const currentRemark = approvalRemarks[docId] || reason || ''

    try {
      if (currentBatchDoc.category === 'DAILY_ACTIVITY' && currentBatchDoc.rawDaily) {
        const sessId = currentBatchDoc.rawDaily.sessionId
        if (action === 'approve') {
          const res = await singleApproveDailyActivityAction(sessId, currentRemark)
          if (!res.success) throw new Error(res.error || 'Gagal menyetujui Daily Activity')
          toast.success(`Daily Activity #${currentBatchDoc.documentNumber} berhasil disetujui.`)
        } else if (action === 'revert') {
          const res = await singleRevertDailyActivityAction(sessId, currentRemark || 'Dokumen dikembalikan.')
          if (!res.success) throw new Error(res.error || 'Gagal mengembalikan Daily Activity')
          toast.info(`Daily Activity #${currentBatchDoc.documentNumber} dikembalikan.`)
        } else if (action === 'reject') {
          const res = await singleRejectDailyActivityAction(sessId, currentRemark || 'Dokumen ditolak.')
          if (!res.success) throw new Error(res.error || 'Gagal menolak Daily Activity')
          toast.error(`Daily Activity #${currentBatchDoc.documentNumber} ditolak.`)
        }
      } else if (currentBatchDoc.category === 'OVERTIME' && currentBatchDoc.rawOvertime) {
        const splId = currentBatchDoc.rawOvertime.splId
        if (action === 'approve') {
          const res = await singleApproveOvertimeRequestAction(splId, currentRemark)
          if (!res.success) throw new Error(res.error || 'Gagal menyetujui SPL')
          toast.success(`Surat Lembur (SPL) #${currentBatchDoc.documentNumber} berhasil disetujui.`)
        } else if (action === 'revert') {
          const res = await singleRevertOvertimeRequestAction(splId, currentRemark || 'SPL dikembalikan.')
          if (!res.success) throw new Error(res.error || 'Gagal mengembalikan SPL')
          toast.info(`Surat Lembur (SPL) #${currentBatchDoc.documentNumber} dikembalikan.`)
        } else if (action === 'reject') {
          const res = await singleRejectOvertimeRequestAction(splId, currentRemark || 'SPL ditolak.')
          if (!res.success) throw new Error(res.error || 'Gagal menolak SPL')
          toast.error(`Surat Lembur (SPL) #${currentBatchDoc.documentNumber} ditolak.`)
        }
      } else if (currentBatchDoc.category === 'PTW' && currentBatchDoc.rawPtw) {
        const ptwId = currentBatchDoc.rawPtw.ptwId
        if (action === 'approve') {
          const res = await singleApprovePtwPermitAction(ptwId, currentRemark)
          if (!res.success) throw new Error(res.error || 'Gagal menyetujui Izin Kerja PTW')
          toast.success(`Izin Kerja (PTW) #${currentBatchDoc.documentNumber} berhasil disetujui.`)
        } else if (action === 'revert') {
          const res = await singleRevertPtwPermitAction(ptwId, currentRemark || 'PTW dikembalikan.')
          if (!res.success) throw new Error(res.error || 'Gagal mengembalikan PTW')
          toast.info(`Izin Kerja (PTW) #${currentBatchDoc.documentNumber} dikembalikan.`)
        } else if (action === 'reject') {
          const res = await singleRejectPtwPermitAction(ptwId, currentRemark || 'PTW ditolak.')
          if (!res.success) throw new Error(res.error || 'Gagal menolak PTW')
          toast.error(`Izin Kerja (PTW) #${currentBatchDoc.documentNumber} ditolak.`)
        }
      } else if (currentBatchDoc.category === 'SOP_WIN_REQUEST' && currentBatchDoc.rawSopWinRequest) {
        const req = currentBatchDoc.rawSopWinRequest
        const res = await withActionRetry(() =>
          reviewSopWinDocumentRequestAction({
            requestId: req.requestId,
            action: action === 'approve' ? 'approve' : action === 'revert' ? 'revert' : 'reject',
            remarks: currentRemark || `Proses ${action} via Inbox Approval`,
            expiryDays: req.expiryDays || 3,
            signatureDataUrl: signatureDataUrl || undefined,
          })
        )
        if (!res.success) throw new Error(res.error || 'Gagal memproses permohonan dokumen SOP/WIN')
        toast.success(`Permintaan dokumen #${req.documentNumber} berhasil diproses (${action}).`)
      } else if (
        currentBatchDoc.category === 'QUALITY_5R' ||
        Boolean((currentBatchDoc as any).rawFiveR) ||
        Boolean((currentBatchDoc as any).fiveRReport) ||
        Boolean(
          currentBatchDoc.rawGeneralGroup?.items?.some(
            (i: any) =>
              i.fiveRReport ||
              i.activityType === '5R Audit Report' ||
              (i as any).requestKindLabel === '5R Audit' ||
              i.title?.toLowerCase().includes('5r')
          )
        )
      ) {
        const fiveRItem =
          (currentBatchDoc as any).rawFiveR ||
          (currentBatchDoc as any).fiveRReport ||
          currentBatchDoc.rawGeneralGroup?.items?.find(
            (i: any) =>
              i.fiveRReport ||
              i.activityType === '5R Audit Report' ||
              (i as any).requestKindLabel === '5R Audit' ||
              i.title?.toLowerCase().includes('5r')
          )?.fiveRReport

        const reportId =
          fiveRItem?.report?.id ||
          fiveRItem?.id ||
          (currentBatchDoc as any).fiveRReportId ||
          Number(currentBatchDoc.id)

        if (!reportId) throw new Error('ID Laporan 5R tidak valid')

        let res: { success: boolean; message?: string }
        if (action === 'approve') {
          res = await approveFiveRReportAction(reportId, currentRemark, signatureDataUrl || undefined)
        } else if (action === 'revert') {
          res = await revertFiveRReportAction(reportId, currentRemark)
        } else {
          res = await rejectFiveRReportAction(reportId, currentRemark)
        }

        if (!res.success) throw new Error(res.message || 'Gagal memproses approval 5R')
        toast.success(`Laporan 5R #${currentBatchDoc.documentNumber} berhasil diproses (${action}).`)
      } else if (
        (currentBatchDoc.category === 'GENERAL' ||
          currentBatchDoc.category === 'APD' ||
          currentBatchDoc.category === 'MATERIAL' ||
          currentBatchDoc.category === 'TOOLS' ||
          currentBatchDoc.category === 'SUMMARY') &&
        currentBatchDoc.rawGeneralGroup
      ) {
        const grp = currentBatchDoc.rawGeneralGroup
        const formData = new FormData()
        for (const it of grp.items) {
          if (it.approvalId) {
            formData.append('approvalIds', String(it.approvalId))
          }
        }
        formData.append('groupId', grp.id)
        formData.append('decision', action === 'approve' ? 'approved' : action === 'revert' ? 'revision_requested' : 'rejected')
        formData.append('note', currentRemark || `Keputusan ${action}`)
        if (signatureDataUrl) {
          formData.append('signatureUrl', signatureDataUrl)
        }
        await withActionRetry(() => approveApprovalGroupAction(formData))
        toast.success(`Pengajuan #${currentBatchDoc.documentNumber} berhasil diproses.`)
      }

      setProcessedBatchIds((prev) => new Set([...prev, docId]))

      // Auto advance to next item
      if (batchReviewIndex < selectedItems.length - 1) {
        setBatchReviewIndex((prev) => prev + 1)
      } else {
        toast.success('Semua dokumen yang dipilih telah selesai diproses.')
        setIsBatchReviewOpen(false)
        router.refresh()
      }
    } catch (e: any) {
      console.error(e)
      const errStr = String(e?.message || e || '').toLowerCase()
      const isNetErr = errStr.includes('network') || errStr.includes('failed to fetch') || errStr.includes('econnreset')
      toast.error(isNetErr ? 'Koneksi terputus sementara (Network Error). Silakan klik ulang tombol persetujuan.' : (e.message || 'Terjadi kesalahan saat memproses approval.'))
    } finally {
      setIsBatchActionRunning(false)
      setConfirmActionType(null)
      setActionReasonInput('')
    }
  }

  // Execute Batch Action for ALL selected items
  const handleExecuteBatchAllAction = async (action: 'approve' | 'revert' | 'reject', reason?: string) => {
    const itemsToProcess = selectedItems.length > 0 ? selectedItems : allUnifiedItems
    if (itemsToProcess.length === 0) return

    if (action === 'approve' && !signatureDataUrl) {
      setIsMissingSignatureDialogOpen(true)
      return
    }

    setIsBatchActionRunning(true)

    let successCount = 0
    let failCount = 0

    try {
      const dailyItems = itemsToProcess.filter(it => it.category === 'DAILY_ACTIVITY' && it.rawDaily)
      const overtimeItems = itemsToProcess.filter(it => it.category === 'OVERTIME' && it.rawOvertime)
      const ptwItems = itemsToProcess.filter(it => it.category === 'PTW' && it.rawPtw)
      const sopWinItems = itemsToProcess.filter(it => it.category === 'SOP_WIN_REQUEST' && it.rawSopWinRequest)
      const generalItems = itemsToProcess.filter(
        (it) =>
          (it.category === 'GENERAL' ||
            it.category === 'APD' ||
            it.category === 'MATERIAL' ||
            it.category === 'TOOLS' ||
            it.category === 'SUMMARY') &&
          it.rawGeneralGroup
      )

      // Daily Activity Batch
      if (dailyItems.length > 0) {
        const sessionIds = dailyItems.map(it => it.rawDaily!.sessionId)
        const remarkText = reason || (action === 'approve' ? 'Approved' : action === 'revert' ? 'Reverted' : 'Rejected')
        let res: { success: boolean; error?: string } = { success: false }
        if (action === 'approve') {
          res = await batchApproveDailyActivitySessionsAction(sessionIds, remarkText)
        } else if (action === 'revert') {
          res = await batchRevertDailyActivitySessionsAction(sessionIds, remarkText)
        } else if (action === 'reject') {
          res = await batchRejectDailyActivitySessionsAction(sessionIds, remarkText)
        }
        if (res.success) successCount += dailyItems.length
        else {
          failCount += dailyItems.length
          toast.error(res.error || 'Gagal memproses batch Daily Activity')
        }
      }

      // Overtime Batch
      if (overtimeItems.length > 0) {
        const splIds = overtimeItems.map(it => it.rawOvertime!.splId)
        const remarkText = reason || (action === 'approve' ? 'Approved' : action === 'revert' ? 'Reverted' : 'Rejected')
        let res: { success: boolean; error?: string } = { success: false }
        if (action === 'approve') {
          res = await batchApproveOvertimeRequestsAction(splIds, remarkText)
        } else if (action === 'revert') {
          res = await batchRevertOvertimeRequestsAction(splIds, remarkText)
        } else if (action === 'reject') {
          res = await batchRejectOvertimeRequestsAction(splIds, remarkText)
        }
        if (res.success) successCount += overtimeItems.length
        else {
          failCount += overtimeItems.length
          toast.error(res.error || 'Gagal memproses batch Overtime SPL')
        }
      }

      // PTW Batch
      if (ptwItems.length > 0) {
        const ptwIds = ptwItems.map(it => it.rawPtw!.ptwId)
        const remarkText = reason || (action === 'approve' ? 'Approved' : action === 'revert' ? 'Reverted' : 'Rejected')
        let res: { success: boolean; error?: string } = { success: false }
        if (action === 'approve') {
          res = await batchApprovePtwPermitsAction(ptwIds, remarkText)
        } else if (action === 'revert') {
          res = await batchRevertPtwPermitsAction(ptwIds, remarkText)
        } else if (action === 'reject') {
          res = await batchRejectPtwPermitsAction(ptwIds, remarkText)
        }
        if (res.success) successCount += ptwItems.length
        else {
          failCount += ptwItems.length
          toast.error(res.error || 'Gagal memproses batch PTW')
        }
      }

      // SOP WIN Items
      for (const item of sopWinItems) {
        const req = item.rawSopWinRequest!
        const res = await reviewSopWinDocumentRequestAction({
          requestId: req.requestId,
          action: action === 'approve' ? 'approve' : action === 'revert' ? 'revert' : 'reject',
          remarks: reason || `${action === 'approve' ? 'Approve' : action === 'revert' ? 'Revert' : 'Reject'} All via Inbox`,
          expiryDays: req.expiryDays || 3,
          signatureDataUrl: signatureDataUrl || undefined,
        })
        if (res.success) successCount++
        else failCount++
      }

      // General Items
      for (const item of generalItems) {
        const grp = item.rawGeneralGroup!
        const formData = new FormData()
        for (const it of grp.items) {
          if (it.approvalId) {
            formData.append('approvalIds', String(it.approvalId))
          }
        }
        formData.append('groupId', grp.id)
        formData.append('decision', action === 'approve' ? 'approved' : action === 'revert' ? 'revision_requested' : 'rejected')
        formData.append('note', reason || `${action === 'approve' ? 'Approve' : action === 'revert' ? 'Revert' : 'Reject'} All via Inbox`)
        if (signatureDataUrl) {
          formData.append('signatureUrl', signatureDataUrl)
        }
        await approveApprovalGroupAction(formData)
        successCount++
      }

      if (successCount > 0) {
        toast.success(`Berhasil memproses ${successCount} pengajuan (${action.toUpperCase()} ALL).`)
        setIsBatchReviewOpen(false)
        setSelectedIds(new Set())
        router.refresh()
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Terjadi kesalahan saat memproses aksi massal.')
    } finally {
      setIsBatchActionRunning(false)
      setConfirmBatchActionType(null)
      setActionReasonInput('')
    }
  }

  // Direct action triggers (validating Catatan Approval field without popup modal)
  const executeDirectSingleAction = (action: 'approve' | 'revert' | 'reject') => {
    if (!currentBatchDoc) return
    const currentRemark = (approvalRemarks[currentBatchDoc.id] || '').trim()

    if ((action === 'revert' || action === 'reject') && !currentRemark) {
      setRemarkFieldError(true)
      toast.warning(
        action === 'revert'
          ? 'Mohon cantumkan rincian revisi pada Catatan Approval terlebih dahulu.'
          : 'Mohon cantumkan alasan penolakan pada Catatan Approval terlebih dahulu.'
      )
      return
    }

    setRemarkFieldError(false)
    handleExecuteApprovalAction(action, currentRemark)
  }

  const executeDirectBatchAllAction = (action: 'approve' | 'revert' | 'reject') => {
    const currentRemark = currentBatchDoc ? (approvalRemarks[currentBatchDoc.id] || '').trim() : ''

    if ((action === 'revert' || action === 'reject') && !currentRemark) {
      setRemarkFieldError(true)
      toast.warning(
        action === 'revert'
          ? 'Mohon cantumkan rincian revisi pada Catatan Approval terlebih dahulu.'
          : 'Mohon cantumkan alasan penolakan pada Catatan Approval terlebih dahulu.'
      )
      return
    }

    setRemarkFieldError(false)
    handleExecuteBatchAllAction(action, currentRemark)
  }

  // Export Excel
  const handleExportExcel = () => {
    const itemsToExport = selectedItems.length > 0 ? selectedItems : allUnifiedItems
    if (itemsToExport.length === 0) {
      toast.warning('Tidak ada data untuk diekspor.')
      return
    }

    const rows = itemsToExport.map((it, idx) => ({
      No: idx + 1,
      Kategori: it.categoryLabel,
      'No. Dokumen': it.documentNumber,
      Judul: it.title,
      'Pemohon / Karyawan': it.employeeName,
      'Departemen / Section': [it.department, it.section].filter(Boolean).join(' / ') || '-',
      'Site / Lokasi': it.siteName || it.location || '-',
      'Tahap Approval': it.stepLabel,
      'Approver Tertuju': it.approverName || '-',
      'Status SLA': it.dueState,
      'Batas Waktu (Due)': formatDate(it.dueAt),
      'Tanggal Pengajuan': formatDate(it.submittedAt),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inbox Approval')
    XLSX.writeFile(wb, `Inbox_Approval_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`${itemsToExport.length} data approval berhasil diekspor ke Excel.`)
  }

  // Download PDF Single / Current
  const handleDownloadCurrentPdf = async (item: typeof currentBatchDoc) => {
    if (!item) return
    setIsDownloadingPdf(true)
    try {
      const el = document.querySelector('#unified-batch-preview-sheet') as HTMLElement
      if (!el) {
        toast.error('Elemen preview dokumen tidak ditemukan.')
        return
      }
      await downloadElementAsPdf(el, `${item.category}_${item.documentNumber || item.id}.pdf`)
      toast.success(`PDF ${item.documentNumber} berhasil diunduh.`)
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // ZIP All Selected
  const handleDownloadZip = async () => {
    const itemsToZip = selectedItems.length > 0 ? selectedItems : allUnifiedItems
    if (itemsToZip.length === 0) {
      toast.warning('Pilih minimal 1 dokumen untuk diunduh ZIP.')
      return
    }

    toast.loading('Menyiapkan file arsip ZIP...', { id: 'zip-progress' })
    try {
      const summaryCsv = itemsToZip.map((it, idx) => `"${idx + 1}","${it.categoryLabel}","${it.documentNumber}","${it.title}","${it.employeeName}","${it.siteName || it.location || '-'}","${it.stepLabel}","${it.dueState}"`).join('\n')
      const files = [
        {
          name: 'ringkasan_inbox_approval.csv',
          blob: new Blob([`No,Kategori,No Dokumen,Judul,Pemohon,Lokasi,Step,Status\n${summaryCsv}`], { type: 'text/csv' }),
        },
      ]
      await downloadFilesAsZip(files, `Arsip_Inbox_Approval_${new Date().toISOString().slice(0, 10)}.zip`)
      toast.success('File ZIP berhasil dibuat dan diunduh.', { id: 'zip-progress' })
    } catch (e) {
      console.error(e)
      toast.error('Gagal membuat file ZIP.', { id: 'zip-progress' })
    }
  }

  const sites = useMemo(() => {
    return Array.from(new Set(allUnifiedItems.map((it) => it.siteName || it.location).filter(Boolean))).sort() as string[]
  }, [allUnifiedItems])

  const filteredMobileItems = useMemo(() => {
    let list = allUnifiedItems
    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.category === selectedCategory)
    }
    if (!mobileSearch.trim()) return list
    const q = mobileSearch.toLowerCase()
    return list.filter((item) => {
      return (
        item.employeeName?.toLowerCase().includes(q) ||
        item.documentNumber?.toLowerCase().includes(q) ||
        item.siteName?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.categoryLabel?.toLowerCase().includes(q) ||
        item.stepLabel?.toLowerCase().includes(q)
      )
    })
  }, [allUnifiedItems, selectedCategory, mobileSearch])

  const isAllMobileSelected =
    filteredMobileItems.length > 0 &&
    filteredMobileItems.every((item) => selectedIds.has(item.id))

  const handleToggleMobileSelectAll = () => {
    if (isAllMobileSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMobileItems.map((item) => item.id)))
    }
  }

  const emptyContent =
    viewMode === 'mobile' ? (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
        Belum ada pengajuan yang menunggu keputusan Anda.
      </div>
    ) : (
      <Card className="bg-surface-container-lowest rounded-[1.6rem] shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>Inbox approval</CardTitle>
          <CardDescription>Belum ada pengajuan yang menunggu keputusan Anda.</CardDescription>
        </CardHeader>
      </Card>
    )

  const content = allUnifiedItems.length === 0 ? emptyContent : viewMode === 'mobile' ? (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="size-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Cari pemohon, nomor, unit, site..."
          value={mobileSearch}
          onChange={(e) => setMobileSearch(e.target.value)}
          className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none shadow-xs focus:border-[#003461]"
        />
      </div>

      {/* Adaptive Category Filter Chips */}
      {categorySummary.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-none select-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              selectedCategory === 'ALL'
                ? "bg-[#003461] text-white shadow-xs ring-1 ring-[#003461]"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-2xs"
            )}
          >
            <span>Semua</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none",
                selectedCategory === 'ALL'
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {allUnifiedItems.length}
            </span>
          </button>
          {categorySummary.map((cat) => {
            const isSelected = selectedCategory === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-[#003461] text-white shadow-xs ring-1 ring-[#003461]"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-2xs"
                )}
              >
                <span>{cat.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none",
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Select All & Batch Actions */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs">
        <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAllMobileSelected}
            onChange={handleToggleMobileSelectAll}
            className="size-4.5 rounded border-slate-300 text-[#003461] focus:ring-[#003461] cursor-pointer"
          />
          <span>Pilih Semua ({filteredMobileItems.length})</span>
        </label>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleOpenBatchReview}
              className="h-8 text-xs font-bold bg-[#003461] hover:bg-[#00274a] text-white rounded-xl shadow-xs"
            >
              Review ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="h-8 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
            >
              Batal
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Cards List */}
      {filteredMobileItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          Tidak ada dokumen approval yang cocok dengan pencarian.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMobileItems.map((item) => {
            const isSelected = selectedIds.has(item.id)
            const isReverted = Boolean((item as any).isReverted)
            const dueLabel =
              item.dueState === 'overdue'
                ? 'TERLAMBAT'
                : item.dueState === 'due_soon'
                  ? 'SEGERA JATUH TEMPO'
                  : 'OPEN'
            const dueColor =
              item.dueState === 'overdue'
                ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                : item.dueState === 'due_soon'
                  ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/70'

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-2xl bg-white p-4 shadow-sm border border-slate-100/90 space-y-3 transition-all',
                  isSelected && 'ring-2 ring-[#003461] bg-blue-50/20'
                )}
              >
                {/* Top Row: Checkbox, Badge, Doc Number, Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.id)}
                      className="size-4.5 rounded border-slate-300 text-[#003461] focus:ring-[#003461] cursor-pointer shrink-0"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0 border',
                          item.category === 'SUMMARY' || item.activityType === 'Summary APD'
                            ? 'bg-purple-50 text-purple-800 border-purple-200/80'
                            : item.category === 'APD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : item.category === 'MATERIAL'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                            : item.category === 'TOOLS'
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-200/80'
                            : item.category === 'OVERTIME'
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : item.category === 'PTW'
                            ? 'bg-rose-50 text-rose-800 border-rose-200/80'
                            : item.category === 'FORM_WO'
                            ? 'bg-teal-50 text-teal-800 border-teal-200/80'
                            : item.category === 'RFR'
                            ? 'bg-purple-50 text-purple-800 border-purple-200/80'
                            : item.category === 'CONTRACT_REVIEW'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
                            : item.category === 'SOP_WIN' || item.category === 'SOP_WIN_REQUEST'
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-200/80'
                            : 'bg-blue-50 text-blue-700 border-blue-200/60'
                        )}
                      >
                        {item.category === 'FORM_WO' ? (
                          <Wrench className="size-3" />
                        ) : (
                          <FileText className="size-3" />
                        )}
                        {item.categoryLabel}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 font-mono truncate">
                        {item.documentNumber}
                      </span>
                    </div>
                  </div>

                  <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border shrink-0', dueColor)}>
                    {dueLabel}
                  </span>
                </div>

                {/* Requester Name & Location */}
                <div className="space-y-0.5 pl-6.5">
                  <p className="text-base font-black text-slate-900 leading-snug">
                    {item.employeeName}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <MapPin className="size-3 text-slate-400" />
                    <span>{item.siteName || item.location || 'Semua Site'}</span>
                    {item.shiftCode && <span>• Shift {item.shiftCode}</span>}
                  </p>
                </div>

                {/* Details Box */}
                <div className="space-y-1.5 rounded-xl bg-slate-50/80 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tahap Approval:</span>
                    <span className="font-bold text-purple-700">{item.stepLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Batas Waktu:</span>
                    <span className="font-bold text-slate-700">Due {formatDate(item.dueAt)}</span>
                  </div>
                </div>

                {/* Action Button */}
                {item.category === 'RFR' && item.rawRfr ? (
                  <RfrApprovalDialog item={item.rawRfr} />
                ) : isReverted ? (
                  <Button
                    size="sm"
                    asChild
                    className="w-full h-11 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-2"
                  >
                    <a
                      href={
                        item.category === 'DAILY_ACTIVITY'
                          ? `/mobile/activity?edit=${(item as any).sessionId || (item as any).rawDaily?.sessionId || item.id.replace('daily-activity-', '')}`
                          : item.url || '#'
                      }
                    >
                      Revisi Dokumen ↗
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set([item.id]))
                      setBatchReviewIndex(0)
                      setIsBatchReviewOpen(true)
                    }}
                    className="w-full h-11 text-sm font-black bg-[#003461] hover:bg-[#00274a] text-white rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99]"
                  >
                    {item.actionLabel || 'BUKA TTD ↗'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  ) : (
    <Card className="bg-surface-container-lowest rounded-[1.4rem] border-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)] relative">
      <CardContent className="pt-6">
        <MinimalTableShell
          title="Tugas yang harus saya approve"
          description="Approval Inbox hanya berisi tugas approval yang menunggu keputusan Anda. Request yang Anda buat ada di Request Center."
          label="approval items"
          fileName="approval-inbox"
          searchPlaceholder="Cari requester, site, pengajuan, unit/area, atau step approval..."
          dateFilter
          filters={
            <ApprovalFilterBar
              sites={sites}
              priorities={['normal', 'urgent']}
              statusOptions={['on_track', 'due_soon', 'overdue']}
            />
          }
          presets={
            <TableFilterPresets
              presets={[
                { label: 'Terlambat', filters: { status: 'overdue' } },
                { label: 'Segera jatuh tempo', filters: { status: 'due_soon' } },
              ]}
            />
          }
        >
          {/* Adaptive Category Filter Chips for Desktop */}
          {categorySummary.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 select-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  selectedCategory === 'ALL'
                    ? "bg-[#003461] text-white shadow-xs"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60 shadow-2xs"
                )}
              >
                <span>Semua</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none",
                    selectedCategory === 'ALL'
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  )}
                >
                  {allUnifiedItems.length}
                </span>
              </button>
              {categorySummary.map((cat) => {
                const isSelected = selectedCategory === cat.key
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      isSelected
                        ? "bg-[#003461] text-white shadow-xs"
                        : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60 shadow-2xs"
                    )}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      )}
                    >
                      {cat.count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── TOP INLINE MULTI-SELECT ACTION BAR (BELOW ROWS CONTROLS) ── */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-[#EEF2FF] border border-indigo-100/90 shadow-2xs transition-all animate-in fade-in slide-in-from-top-2 duration-200 select-none">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs sm:text-sm tracking-tight">
                <Check className="size-4 text-[#4F46E5] stroke-[3] shrink-0" />
                <span>
                  {selectedIds.size} dari {categoryFilteredItems.length} aktivitas terpilih
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleOpenBatchReview}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-2xs gap-1.5"
                >
                  REVIEW
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadZip}
                  className="bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-3.5 rounded-xl shadow-2xs gap-1.5"
                >
                  <FileText className="size-3.5 text-rose-500" />
                  UNDUH
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  className="bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-3.5 rounded-xl shadow-2xs gap-1.5"
                >
                  <FileSpreadsheet className="size-3.5 text-emerald-600" />
                  EXCEL
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 font-extrabold text-xs h-9 px-2.5 rounded-xl uppercase tracking-wider"
                >
                  BATAL
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Pilih Semua"
                  />
                </TableHead>
                <TableHead>Tipe & Requester</TableHead>
                <TableHead>Site / Lokasi</TableHead>
                <TableHead>Pengajuan / Dokumen</TableHead>
                <TableHead>Step Approval</TableHead>
                <TableHead>SLA / Due Date</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryFilteredItems.map((item) => {
                const isSelected = selectedIds.has(item.id)
                return (
                  <TableRow
                    key={item.id}
                    data-date-value={item.submittedAt ? new Date(item.submittedAt).toISOString() : new Date().toISOString()}
                    data-filter-site={item.siteName || item.location || ''}
                    data-filter-priority="normal"
                    data-filter-status={item.dueState}
                    className={cn(
                      'transition-colors',
                      isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-slate-50/70'
                    )}
                  >
                    <TableCell className="align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase border',
                            item.category === 'DAILY_ACTIVITY' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            item.category === 'OVERTIME' && 'bg-amber-50 text-amber-700 border-amber-200',
                            item.category === 'PTW' && 'bg-rose-50 text-rose-700 border-rose-200',
                            item.category === 'CONTRACT_REVIEW' && 'bg-blue-50 text-blue-700 border-blue-200',
                            item.category === 'RFR' && 'bg-purple-50 text-purple-700 border-purple-200',
                            item.category === 'FORM_WO' && 'bg-teal-50 text-teal-700 border-teal-200',
                            item.category === 'APD' && 'bg-amber-50 text-amber-800 border-amber-200',
                            item.category === 'MATERIAL' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            item.category === 'TOOLS' && 'bg-cyan-50 text-cyan-800 border-cyan-200',
                            item.category === 'SUMMARY' && 'bg-purple-50 text-purple-800 border-purple-200',
                            item.category === 'GENERAL' && 'bg-slate-100 text-slate-700 border-slate-200'
                          )}
                        >
                          {item.categoryLabel}
                        </span>
                        <p className="text-foreground font-semibold">{item.employeeName}</p>
                        <p className="text-muted-foreground text-xs font-mono">{item.documentNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-foreground text-sm">{item.siteName || item.location || item.rawGeneralGroup?.siteName || '—'}</p>
                        {item.shiftCode && <p className="text-muted-foreground text-xs">Shift {item.shiftCode}</p>}
                        {item.rawGeneralGroup?.items?.some(i => i.activityType === 'Daily Activity') && item.rawGeneralGroup.totalOvertimeLabel ? (
                          <p className="text-muted-foreground text-xs">
                            Overtime {item.rawGeneralGroup.totalOvertimeLabel}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-foreground font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">{item.department ? `Dept: ${item.department}` : 'Pengajuan operasional'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-foreground text-sm font-semibold text-indigo-700">{item.stepLabel}</p>
                        {item.approverRole && <p className="text-muted-foreground text-xs capitalize">{item.approverRole.replace(/_/g, ' ')}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <AdminStatusBadge value={item.dueState} />
                        <p className="text-muted-foreground text-xs">Due {formatDate(item.dueAt)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      {item.category === 'RFR' && item.rawRfr ? (
                        <RfrApprovalDialog item={item.rawRfr} />
                      ) : (item as any).activityType === 'Work Order' ||
                        (item as any).repairFormWo ||
                        (item as any).title?.toLowerCase().includes('wo') ? (
                        <FormWoApprovalDialog item={item as any} group={(item as any).rawGeneralGroup || item} />
                      ) : (item as any).activityType === '5R Audit Report' ||
                        (item as any).fiveRReport ||
                        (item as any).title?.toLowerCase().includes('5r') ? (
                        <FiveRApprovalDialog item={item as any} group={(item as any).rawGeneralGroup || item} />
                      ) : (item as any).isReverted ? (
                        <Button
                          size="sm"
                          asChild
                          className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                        >
                          <a href={item.url || '#'}>
                            {item.actionLabel || 'Revisi Dokumen'} ↗
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedIds(new Set([item.id]))
                            setBatchReviewIndex(0)
                            setIsBatchReviewOpen(true)
                          }}
                          className="h-8 text-xs font-bold text-indigo-700 hover:bg-indigo-50 border-indigo-200 cursor-pointer shadow-xs"
                        >
                          {item.actionLabel || 'Buka TTD ↗'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </CardContent>
    </Card>
  )

  return (
    <>
      {content}

        {/* ── BATCH MULTI-DOCUMENT PREVIEW & APPROVAL MODAL ── */}
        <Dialog
          open={isBatchReviewOpen && Boolean(currentBatchDoc)}
          onOpenChange={(open) => !open && setIsBatchReviewOpen(false)}
        >
          {(() => {
            const isLandscapeDoc =
              (currentBatchDoc?.category as any) === 'PTW' ||
              (currentBatchDoc?.category as any) === 'FORM_WO' ||
              Boolean((currentBatchDoc as any)?.rawFormWo) ||
              Boolean(currentBatchDoc?.rawGeneralGroup?.items?.some((i: any) => i.repairFormWo || i.activityType === 'Form WO' || (i as any).requestKindLabel === 'Form WO'))

            const isFiveRDoc =
              (currentBatchDoc?.category as any) === 'QUALITY_5R' ||
              Boolean((currentBatchDoc as any)?.rawFiveR) ||
              Boolean((currentBatchDoc as any)?.fiveRReport) ||
              Boolean(
                currentBatchDoc?.rawGeneralGroup?.items?.some(
                  (i: any) =>
                    i.fiveRReport ||
                    i.activityType === '5R Audit Report' ||
                    (i as any).requestKindLabel === '5R Audit' ||
                    i.title?.toLowerCase().includes('5r')
                )
              )

            const isApdDoc =
              (currentBatchDoc?.category as any) === 'APD' ||
              (currentBatchDoc?.category as any) === 'MATERIAL' ||
              (currentBatchDoc?.category as any) === 'TOOLS' ||
              (currentBatchDoc?.category as any) === 'SUMMARY' ||
              Boolean(
                currentBatchDoc?.rawGeneralGroup?.items?.some(
                  (i: any) =>
                    i.activityType?.toLowerCase().includes('request apd') ||
                    i.activityType?.toLowerCase().includes('request tools') ||
                    i.activityType?.toLowerCase().includes('request material') ||
                    i.title?.toLowerCase().includes('request apd') ||
                    i.title?.toLowerCase().includes('request tools') ||
                    i.title?.toLowerCase().includes('request material') ||
                    i.activityType === 'Summary APD'
                )
              )

            const isCleanCustomDoc = isLandscapeDoc || isFiveRDoc || isApdDoc
            return (
              <DialogContent
                showCloseButton={false}
                className={cn(
                  viewMode === 'mobile'
                    ? "max-w-[430px] w-full sm:max-w-[430px] mx-auto h-[92dvh] sm:h-[86dvh] max-h-[92dvh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl z-50"
                    : "max-h-[94vh] h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-2xl transition-all",
                  viewMode !== 'mobile' && (isLandscapeDoc ? "max-w-[98vw] 2xl:max-w-[1600px]" : "max-w-[96vw] xl:max-w-6xl 2xl:max-w-7xl")
                )}
              >
                {/* Top Viewer Toolbar */}
                <div className="bg-white px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between border-b border-slate-200 text-slate-900 shrink-0 select-none gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="size-8 sm:size-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                      <FileText className="size-4 sm:size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        Review • <span className="text-[#003461]">{currentBatchDoc?.documentNumber}</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                        {currentBatchDoc?.employeeName} • {formatDate(currentBatchDoc?.workDate || currentBatchDoc?.submittedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {/* Stepper (Only show if > 1 document) */}
                    {selectedItems.length > 1 && (
                      <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-2 py-1 border border-slate-200 shadow-xs">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={batchReviewIndex === 0 || isBatchActionRunning}
                          onClick={() => setBatchReviewIndex((prev) => Math.max(0, prev - 1))}
                          className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-30"
                        >
                          ‹
                        </Button>
                        <span className="text-[11px] font-mono font-semibold text-slate-700 px-1 whitespace-nowrap">
                          {batchReviewIndex + 1}/{selectedItems.length}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={batchReviewIndex >= selectedItems.length - 1 || isBatchActionRunning}
                          onClick={() => setBatchReviewIndex((prev) => Math.min(selectedItems.length - 1, prev + 1))}
                          className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-30"
                        >
                          ›
                        </Button>
                      </div>
                    )}

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-1.5 py-1 border border-slate-200">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewerZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                        className="h-6 w-6 p-0 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold"
                        title="Zoom Out"
                      >
                        -
                      </Button>
                      <span className="text-[10px] font-mono font-bold text-slate-600 px-1 min-w-7 text-center">
                        {Math.round(viewerZoom * 100)}%
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewerZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                        className="h-6 w-6 p-0 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold"
                        title="Zoom In"
                      >
                        +
                      </Button>
                      {viewerZoom !== 1.0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewerZoom(1.0)}
                          className="h-6 px-1.5 text-[9px] font-bold text-slate-500 hover:text-slate-900 rounded-md"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 sm:h-9 text-xs rounded-xl font-medium gap-1.5 border-slate-200 bg-[#e2e8f0] text-slate-800 hover:bg-slate-300 shadow-xs px-2 sm:px-3"
                      disabled={isDownloadingPdf}
                      onClick={() => currentBatchDoc && handleDownloadCurrentPdf(currentBatchDoc)}
                      title="Unduh PDF"
                    >
                      <Download className="size-3.5" />
                      <span className="hidden sm:inline">UNDUH PDF</span>
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

                {/* Body: 2 Columns on Desktop, Continuous Vertical Scroll on Mobile */}
                <div
                  className={cn(
                    "flex-1 overflow-y-auto bg-slate-100",
                    viewMode === 'mobile'
                      ? "overflow-x-hidden p-2 sm:p-3 space-y-3 flex flex-col"
                      : "flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
                  )}
                >
                  {/* Top Section (Mobile) / Left Column (Desktop): Live Letterhead PDF Preview */}
                  <div
                    className={cn(
                      "flex flex-col items-center",
                      viewMode === 'mobile'
                        ? "w-full p-0 shrink-0 space-y-3"
                        : "w-full lg:flex-1 p-2 sm:p-4 bg-slate-200/70 overflow-x-hidden shrink-0 lg:shrink"
                    )}
                  >
                    {/* Zoom Action Bar */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 shadow-2xs max-w-lg w-full mb-2 mx-auto">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="size-3.5 text-[#003461]" /> Preview Dokumen Surat / PDF
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setViewerZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                          className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Zoom Out"
                        >
                          -
                        </Button>
                        <span className="text-[11px] font-mono font-bold text-slate-600 px-1 min-w-10 text-center">
                          {Math.round(viewerZoom * 100)}%
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setViewerZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
                          className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Zoom In"
                        >
                          +
                        </Button>
                        {viewerZoom !== 1.0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewerZoom(1.0)}
                            className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 1. PDF Letterhead Document Preview Container */}
                    {currentBatchDoc && (() => {
                      const baseScale = isLandscapeDoc ? 0.31 : (viewMode === 'mobile' ? 0.44 : 0.46)
                      const effectiveScale = baseScale * viewerZoom
                      const originalHeightMm = isLandscapeDoc ? 210 : 297
                      const marginOffsetMm = -Math.round(originalHeightMm * (1 - effectiveScale))

                      return (
                        <div className="flex justify-center items-start overflow-hidden p-1 w-full max-w-full">
                          <div
                            id="unified-batch-preview-sheet"
                            className={cn(
                              "relative mx-auto shrink-0 bg-white shadow-md border border-slate-200 rounded-sm origin-top transition-transform duration-200",
                              isLandscapeDoc ? "w-[297mm] min-h-[210mm]" : "w-[210mm] min-h-[297mm]"
                            )}
                            style={{
                              backgroundImage: isCleanCustomDoc ? 'none' : 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                              backgroundSize: '100% 100%',
                              transform: `scale(${effectiveScale})`,
                              transformOrigin: 'top center',
                              marginBottom: `${marginOffsetMm}mm`,
                            }}
                          >
                          <div
                            className="relative z-10 outline-none text-[8.5pt] font-sans leading-tight text-black"
                            style={{
                              paddingTop: isLandscapeDoc || isCleanCustomDoc ? '0mm' : '38mm',
                              paddingBottom: isLandscapeDoc || isCleanCustomDoc ? '0mm' : '35mm',
                              paddingLeft: isLandscapeDoc || isCleanCustomDoc ? '0mm' : '20mm',
                              paddingRight: isLandscapeDoc || isCleanCustomDoc ? '0mm' : '20mm',
                              minHeight: isLandscapeDoc ? '210mm' : '297mm',
                            }}
                          >
                      {/* Document Type Specific Content */}
                      {currentBatchDoc.category === 'DAILY_ACTIVITY' && currentBatchDoc.rawDaily && (
                        <div>
                          <div className="text-center mb-3">
                            <p className="font-bold text-[10pt] text-black mb-0.5 uppercase">PT. CHITRA PARATAMA</p>
                            <h2 className="font-bold text-[11.5pt] text-black uppercase tracking-wider">
                              {(currentBatchDoc as any).spl ? 'SURAT PERINTAH LEMBUR' : 'DAILY ACTIVITY APPROVAL REPORT'}
                            </h2>
                          </div>

                          <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 text-[8.5pt]">
                            <tbody>
                              <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Details</td></tr>
                              <tr>
                                <td className="w-1/2">Tanggal Kerja: <strong>{formatDate(currentBatchDoc.workDate)}</strong></td>
                                <td className="w-1/2">Shift: <strong>{currentBatchDoc.shiftCode || 'ALL'}</strong></td>
                              </tr>
                              <tr>
                                <td>Kode Sesi: <strong>{currentBatchDoc.documentNumber}</strong></td>
                                <td>Status: <span className={cn("capitalize font-bold", currentBatchDoc.isReverted ? "text-amber-700 font-extrabold" : "text-black")}>{currentBatchDoc.isReverted ? 'Reverted' : 'Submitted'}</span></td>
                              </tr>
                              <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Employee Profile</td></tr>
                              <tr>
                                <td>Nama: <strong>{currentBatchDoc.employeeName}</strong></td>
                                <td>SN: <strong>{(currentBatchDoc.rawDaily as any).employeeSn || '-'}</strong></td>
                              </tr>
                              <tr>
                                <td>Job Title: <strong>{(currentBatchDoc.rawDaily as any).jobTitle || (currentBatchDoc as any).position || 'Staff'}</strong></td>
                                <td>Dept / Section: <strong>{[currentBatchDoc.department, currentBatchDoc.section].filter(Boolean).join(' / ') || '—'}</strong></td>
                              </tr>
                              <tr>
                                <td>Site: <strong>{currentBatchDoc.siteName || (currentBatchDoc.rawDaily as any)?.siteName || '—'}</strong></td>
                                <td>Customer: <strong>{(currentBatchDoc.rawDaily as any)?.customerName || (currentBatchDoc as any)?.customerName || (currentBatchDoc.rawDaily as any)?.site?.customerName || 'Default Customer'}</strong></td>
                              </tr>
                              {((currentBatchDoc.rawDaily as any)?.teamMembersSummary || (currentBatchDoc as any)?.teamMembersSummary || ((currentBatchDoc.rawDaily as any)?.summaryRemark || '').match(/\[Team:\s*([^\]]+)\]/i)?.[1] || ((currentBatchDoc as any)?.summaryRemark || '').match(/\[Team:\s*([^\]]+)\]/i)?.[1]) ? (
                                <tr>
                                  <td colSpan={2}>
                                    Anggota Tim: <strong className="text-blue-900">{(currentBatchDoc.rawDaily as any)?.teamMembersSummary || (currentBatchDoc as any)?.teamMembersSummary || ((currentBatchDoc.rawDaily as any)?.summaryRemark || '').match(/\[Team:\s*([^\]]+)\]/i)?.[1] || ((currentBatchDoc as any)?.summaryRemark || '').match(/\[Team:\s*([^\]]+)\]/i)?.[1]}</strong>
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>

                          {/* A. Daily Activity Items */}
                          {(() => {
                            const items = (currentBatchDoc.rawDaily as any)?.items || (currentBatchDoc.rawDaily as any)?.sessionItems || (currentBatchDoc as any)?.items || []
                            return (
                              <>
                                <div className="font-bold mb-1 text-[8.5pt]">
                                  A. Daily Activity Items (Total: {items.length} item)
                                </div>
                                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
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
                                    {items.length > 0 ? (
                                      items.map((it: any, idx: number) => {
                                        return (
                                          <tr key={it.id || idx}>
                                            <td className="text-center align-middle">{idx + 1}</td>
                                            <td className="align-middle">{it.label || it.snapshotLabel || 'Aktivitas'}</td>
                                            <td className="text-center align-middle">{it.unitNumber || '-'}</td>
                                            <td className="text-center align-middle">{it.duration || '-'}</td>
                                            <td className="text-center font-bold align-middle">{it.points || it.actualPoints || 0}</td>
                                            <td className="text-left text-[7.5pt] align-middle">{it.remark || it.remarks || '-'}</td>
                                          </tr>
                                        )
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={6} className="text-center text-slate-400 py-3">Belum ada item aktivitas.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </>
                            )
                          })()}

                          {/* B. Approval Steps Table & Signatories */}
                          {(() => {
                            const approvals = (currentBatchDoc.rawDaily as any).approvals || []
                            const step1 = approvals.find((s: any) => s.stepOrder === 1)
                            const step2 = approvals.find((s: any) => s.stepOrder === 2)
                            const step3 = approvals.find((s: any) => s.stepOrder === 3)
                            const isSigned1 = step1?.status === 'approved' || step1?.status === 'signed' || step1?.status === 'completed' || Boolean(step1?.signatureDataUrl || step1?.signatureUrl)
                            const isApproved2 = step2?.status === 'approved'
                            const isApproved3 = step3?.status === 'approved'
                            const isReverted2 = step2?.status === 'reverted'
                            const isReverted3 = step3?.status === 'reverted'
                            const currentSig = step1?.signatureDataUrl || step1?.signatureUrl || (currentBatchDoc.rawDaily as any).employee?.signatureDataUrl || null
                            const sig2 = step2?.signatureDataUrl || step2?.signatureUrl || null
                            const sig3 = step3?.signatureDataUrl || step3?.signatureUrl || null

                            const rawSessionId = (currentBatchDoc.rawDaily as any)?.sessionId || (currentBatchDoc.rawDaily as any)?.id || currentBatchDoc.id
                            const sessionId = typeof rawSessionId === 'string' ? rawSessionId.replace(/^daily-activity-/, '') : rawSessionId

                            return (
                              <>
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
                                    {approvals.length > 0 ? (
                                      approvals.map((step: any) => {
                                        const isCurrentStepActive = step.status === 'pending'
                                        const liveRemark = isCurrentStepActive && approvalRemarks[currentBatchDoc.id]
                                          ? approvalRemarks[currentBatchDoc.id]
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
                                            <td className="text-[7pt] font-mono">{formatTimestamp(step.signedAt)}</td>
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

                                <div className="font-bold mb-2 text-[8.5pt]">Signatories</div>
                                <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-3">
                                  {/* Karyawan */}
                                  <div>
                                    <div className="text-[7pt] text-slate-500 mb-1">Employee Signature</div>
                                    <div className="h-14 flex items-end">
                                      {currentSig ? (
                                        <img src={currentSig} alt="TTD" className="h-10 object-contain" />
                                      ) : isSigned1 ? (
                                        <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">{currentBatchDoc.employeeName}</span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[7.5pt]"></span>
                                      )}
                                    </div>
                                    <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                      {currentBatchDoc.employeeName}
                                    </div>
                                    <div className="text-[7pt] text-slate-600 font-medium">{(currentBatchDoc.rawDaily as any).jobTitle || (currentBatchDoc as any).position || 'Staff'}</div>
                                    {step1?.signedAt && (
                                      <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                        {step1?.status === 'reverted' ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                        {formatTimestamp(step1.signedAt)}
                                      </div>
                                    )}
                                  </div>

                                  {/* Leader / PJO */}
                                  <div>
                                    <div className="text-[7pt] text-slate-500 mb-1">Leader / PJO Signature</div>
                                    <div className="h-14 flex items-end">
                                      {sig2 ? (
                                        <img src={sig2} alt="TTD" className="h-10 object-contain" />
                                      ) : isApproved2 ? (
                                        <div className="flex flex-col items-center justify-center text-center">
                                          <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step2?.signedAt)})</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[7.5pt]"></span>
                                      )}
                                    </div>
                                    <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                      {step2?.approverName || currentBatchDoc.employeeName}
                                    </div>
                                    <div className="text-[7pt] text-slate-600 font-medium">Leader / PJO</div>
                                    {step2?.signedAt && (
                                      <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                        {isReverted2 ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                        {formatTimestamp(step2.signedAt)}
                                      </div>
                                    )}
                                  </div>

                                  {/* Section Head */}
                                  <div>
                                    <div className="text-[7pt] text-slate-500 mb-1">Section Head Signature</div>
                                    <div className="h-14 flex items-end">
                                      {sig3 ? (
                                        <img src={sig3} alt="TTD" className="h-10 object-contain" />
                                      ) : isApproved3 ? (
                                        <div className="flex flex-col items-center justify-center text-center">
                                          <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step3?.signedAt)})</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[7.5pt]"></span>
                                      )}
                                    </div>
                                    <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                      {step3?.approverName || currentBatchDoc.employeeName}
                                    </div>
                                    <div className="text-[7pt] text-slate-600 font-medium">Section Head</div>
                                    {step3?.signedAt && (
                                      <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                        {isReverted3 ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                        {formatTimestamp(step3.signedAt)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Evidence QR in Bottom Right Corner (Clickable to open floating modal) */}
                                <div className="absolute right-[20mm] bottom-[18mm]">
                                  <DailyActivityEvidenceQr sessionId={sessionId} />
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      )}

                      {/* Overtime SPL */}
                      {currentBatchDoc.category === 'OVERTIME' && currentBatchDoc.rawOvertime && (
                        <div>
                          <h1 className="text-center font-bold text-[11pt] mb-1 uppercase">SURAT PERINTAH LEMBUR (SPL)</h1>
                          <p className="text-center font-semibold text-[8pt] text-slate-700 mb-3">PT CHITRA PARATAMA • HUMAN CAPITAL</p>

                          <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8.5pt]">
                            <tbody>
                              <tr>
                                <td colSpan={4} className="font-bold bg-slate-50">Details & Request Profile</td>
                              </tr>
                              <tr>
                                <td className="w-1/4 font-bold bg-slate-50">SPL Number</td>
                                <td className="w-1/4 font-mono font-semibold">{currentBatchDoc.documentNumber}</td>
                                <td className="w-1/4 font-bold bg-slate-50">Work Date</td>
                                <td className="w-1/4 font-semibold">{formatDate(currentBatchDoc.workDate)}</td>
                              </tr>
                              <tr>
                                <td className="font-bold bg-slate-50">Title / Keperluan</td>
                                <td colSpan={3} className="font-semibold">{currentBatchDoc.rawOvertime.title || currentBatchDoc.title || '—'}</td>
                              </tr>
                              <tr>
                                <td className="font-bold bg-slate-50">Requester Name</td>
                                <td>{currentBatchDoc.employeeName}</td>
                                <td className="font-bold bg-slate-50">Department</td>
                                <td>{currentBatchDoc.department || 'Central Services'}</td>
                              </tr>
                              <tr>
                                <td className="font-bold bg-slate-50">Planned Schedule</td>
                                <td colSpan={3}>
                                  {formatDate(currentBatchDoc.workDate)} ({formatTime(currentBatchDoc.rawOvertime.plannedStartAt)} s.d. {formatTime(currentBatchDoc.rawOvertime.plannedEndAt)})
                                </td>
                              </tr>
                              {Boolean((currentBatchDoc.rawOvertime as any).requestNotes || (currentBatchDoc.rawOvertime as any).notes) && (
                                <tr>
                                  <td className="font-bold bg-slate-50">Request Notes</td>
                                  <td colSpan={3}>{(currentBatchDoc.rawOvertime as any).requestNotes || (currentBatchDoc.rawOvertime as any).notes}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          {/* Section 2: Workers */}
                          {(() => {
                            const participants = (currentBatchDoc.rawOvertime as any).participants || []
                            return (
                              <>
                                <div className="font-bold mb-1">A. Workers ({participants.length} Orang)</div>
                                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-center text-[8pt]">
                                  <thead>
                                    <tr className="bg-slate-50 font-bold">
                                      <th className="w-[8%]">#</th>
                                      <th className="text-left w-[42%]">Name</th>
                                      <th className="w-[15%]">Shift</th>
                                      <th className="w-[15%]">Roster</th>
                                      <th className="w-[20%]">Category</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {participants.length === 0 ? (
                                      <tr>
                                        <td colSpan={5} className="py-2 text-slate-400 italic">Belum ada peserta lembur.</td>
                                      </tr>
                                    ) : (
                                      participants.map((p: any, idx: number) => (
                                        <tr key={idx}>
                                          <td className="text-center">{idx + 1}</td>
                                          <td className="text-left font-semibold">{p.employeeName}</td>
                                          <td>{p.shiftCode || '-'}</td>
                                          <td>{p.rosterType || p.roster || '-'}</td>
                                          <td className="capitalize text-[7.5pt]">{(p.category || '-').replace(/_/g, ' ')}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </>
                            )
                          })()}

                          {/* Section 3: Line Items */}
                          {(() => {
                            const lineItems = (currentBatchDoc.rawOvertime as any).lineItems || []
                            return (
                              <>
                                <div className="font-bold mb-1">B. Line Items (Aktivitas Pekerjaan)</div>
                                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-[8pt]">
                                  <thead>
                                    <tr className="bg-slate-50 text-center font-bold">
                                      <th className="w-[8%]">#</th>
                                      <th className="text-left w-[40%]">Activity</th>
                                      <th className="w-[18%]">Target</th>
                                      <th className="w-[14%]">Minutes</th>
                                      <th className="w-[20%]">Points</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lineItems.length === 0 ? (
                                      <tr>
                                        <td colSpan={5} className="text-center text-slate-400 py-2">Belum ada rincian tugas lembur.</td>
                                      </tr>
                                    ) : (
                                      lineItems.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                          <td className="text-center">{idx + 1}</td>
                                          <td className="font-medium">{item.lineLabel}</td>
                                          <td className="text-center">{item.targetUnit || '—'}</td>
                                          <td className="text-center">{item.estimatedMinutes} m</td>
                                          <td className="text-center font-bold">{item.plannedPoints} pts</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </>
                            )
                          })()}

                          {/* Section 4: Approval Steps Table */}
                          <div className="font-bold mb-1">C. Approval Steps</div>
                          <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]" style={{ tableLayout: 'fixed' }}>
                            <thead>
                              <tr className="bg-slate-50 font-bold">
                                <th style={{ width: '6%' }}>#</th>
                                <th className="text-left" style={{ width: '20%' }}>Tahap</th>
                                <th className="text-left" style={{ width: '22%' }}>Approver</th>
                                <th style={{ width: '14%' }}>Status</th>
                                <th style={{ width: '16%' }}>Waktu</th>
                                <th className="text-left" style={{ width: '22%' }}>Catatan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                                const activeReviewStep = approvals.find((a: any) => a.status === 'pending' || a.status === 'reverted') || approvals[0]

                                return approvals.map((step: any) => {
                                  const isThisActiveStep = (step.status === 'pending' || step.status === 'reverted') && (step.id === activeReviewStep?.id || step.stepOrder === activeReviewStep?.stepOrder)
                                  const liveRemark = isThisActiveStep && approvalRemarks[currentBatchDoc.id]
                                    ? approvalRemarks[currentBatchDoc.id]
                                    : step.remarks || '—'
                                  const isRevertedStep = step.status === 'reverted'
                                  const isApprovedStep = step.status === 'approved' || step.status === 'signed' || step.status === 'completed'

                                  return (
                                    <tr key={step.stepOrder} className={isRevertedStep ? "bg-amber-50/70" : undefined}>
                                      <td>{step.stepOrder}</td>
                                      <td className="text-left">{step.stepLabel}</td>
                                      <td className="text-left">{step.approverName || '-'}</td>
                                      <td className={cn(
                                        "capitalize font-bold",
                                        isApprovedStep ? "text-emerald-700" :
                                        isRevertedStep ? "text-amber-700" :
                                        step.status === 'rejected' ? "text-rose-700" :
                                        "text-slate-700"
                                      )}>
                                        {isRevertedStep ? 'Reverted' : step.status}
                                      </td>
                                      <td className="text-[7pt]">{isApprovedStep && step.signedAt ? formatTimestamp(step.signedAt) : '—'}</td>
                                      <td className="text-left italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight font-medium" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{liveRemark}</td>
                                    </tr>
                                  )
                                })
                              })()}
                            </tbody>
                          </table>

                          {/* Section 5: Signatories */}
                          <div className="font-bold mb-2 text-[8.5pt]">Signatories</div>
                          <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4 text-center">
                            {/* 1. Serviceman / Karyawan */}
                            {(() => {
                              const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                              const step1 = approvals.find((s: any) => s.stepOrder === 1)
                              const isSigned1 = step1?.status === 'approved' || step1?.status === 'signed' || step1?.status === 'completed' || Boolean(step1?.signedAt)
                              const sigUrl1 = step1?.signatureDataUrl

                              return (
                                <div className="flex flex-col items-center text-center">
                                  <div className="text-[7pt] text-slate-500 font-semibold mb-1">Employee Signature</div>
                                  <div className="h-16 w-full flex items-center justify-center my-1">
                                    {sigUrl1 ? (
                                      <img src={sigUrl1} alt="TTD" className="max-h-14 max-w-full object-contain" />
                                    ) : isSigned1 ? (
                                      <div className="flex flex-col items-center justify-center text-center">
                                        <span className="text-[6.5pt] font-bold text-emerald-600">✓ Digitally Signed ({formatTimestamp(step1?.signedAt || new Date())})</span>
                                      </div>
                                    ) : step1?.status === 'reverted' ? (
                                      <span className="text-amber-600 font-semibold italic text-[7pt]">(Perlu Revisi)</span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                                    )}
                                  </div>
                                  <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                                    {step1?.approverName || currentBatchDoc.employeeName}
                                  </div>
                                  <div className="text-[7pt] text-slate-600 font-medium">Serviceman / Pemohon</div>
                                  <div className="text-[6.5pt] text-slate-400 mt-0.5">
                                    {step1?.signedAt ? `Waktu TTD: ${formatTimestamp(step1.signedAt)}` : '—'}
                                  </div>
                                </div>
                              )
                            })()}

                            {/* 2. Leader / Pengawas */}
                            {(() => {
                              const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                              const step2 = approvals.find((s: any) => s.stepOrder === 2)
                              const isApproved2 = step2?.status === 'approved' || Boolean(step2?.signedAt)
                              const sigUrl2 = step2?.signatureDataUrl

                              return (
                                <div className="flex flex-col items-center text-center">
                                  <div className="text-[7pt] text-slate-500 font-semibold mb-1">Leader / Supervisor Signature</div>
                                  <div className="h-16 w-full flex items-center justify-center my-1">
                                    {sigUrl2 ? (
                                      <img src={sigUrl2} alt="TTD" className="max-h-14 max-w-full object-contain" />
                                    ) : isApproved2 ? (
                                      <div className="flex flex-col items-center justify-center text-center">
                                        <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step2?.signedAt)})</span>
                                      </div>
                                    ) : step2?.status === 'reverted' ? (
                                      <span className="text-amber-600 font-semibold italic text-[7pt]">(Dikembalikan)</span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                                    )}
                                  </div>
                                  <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                                    {step2?.approverName || 'Leader / Supervisor'}
                                  </div>
                                  <div className="text-[7pt] text-slate-600 font-medium">{step2?.stepLabel || 'Leader / Supervisor'}</div>
                                  <div className="text-[6.5pt] text-slate-400 mt-0.5">
                                    {isApproved2 && step2?.signedAt ? `Waktu TTD: ${formatTimestamp(step2.signedAt)}` : '—'}
                                  </div>
                                </div>
                              )
                            })()}

                            {/* 3. Section Head */}
                            {(() => {
                              const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                              const step3 = approvals.find((s: any) => s.stepOrder === 3)
                              const isApproved3 = step3?.status === 'approved' || Boolean(step3?.signedAt)
                              const sigUrl3 = step3?.signatureDataUrl

                              return (
                                <div className="flex flex-col items-center text-center">
                                  <div className="text-[7pt] text-slate-500 font-semibold mb-1">Section Head Signature</div>
                                  <div className="h-16 w-full flex items-center justify-center my-1">
                                    {sigUrl3 ? (
                                      <img src={sigUrl3} alt="TTD" className="max-h-14 max-w-full object-contain" />
                                    ) : isApproved3 ? (
                                      <div className="flex flex-col items-center justify-center text-center">
                                        <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step3?.signedAt)})</span>
                                      </div>
                                    ) : step3?.status === 'reverted' ? (
                                      <span className="text-amber-600 font-semibold italic text-[7pt]">(Dikembalikan)</span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                                    )}
                                  </div>
                                  <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                                    {step3?.approverName || 'Section Head'}
                                  </div>
                                  <div className="text-[7pt] text-slate-600 font-medium">{step3?.stepLabel || 'Section Head'}</div>
                                  <div className="text-[6.5pt] text-slate-400 mt-0.5">
                                    {isApproved3 && step3?.signedAt ? `Waktu TTD: ${formatTimestamp(step3.signedAt)}` : '—'}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>

                          <div className="text-right text-[7pt] text-slate-400 mt-4">PT Chitra Paratama • HERO Platform</div>
                        </div>
                      )}

                      {/* PTW */}
                      {currentBatchDoc.category === 'PTW' && currentBatchDoc.rawPtw && (() => {
                        const doc: any = currentBatchDoc.rawPtw
                        const ptwApprovals = (doc as any).approvals || []
                        const step1 = ptwApprovals.find((a: any) => a.stepOrder === 1 || a.approverRole === 'applicant')
                        const step2 = ptwApprovals.find((a: any) => a.stepOrder === 2 || a.approverRole === 'safety_officer')
                        const step3 = ptwApprovals.find((a: any) => a.stepOrder === 3 || a.approverRole === 'field_pic' || a.approverRole === 'authorized')

                        const remark1 = (step1 && step1.status === 'pending' && approvalRemarks[currentBatchDoc.id]) || step1?.remarks
                        const remark2 = (step2 && step2.status === 'pending' && approvalRemarks[currentBatchDoc.id]) || step2?.remarks
                        const remark3 = (step3 && step3.status === 'pending' && approvalRemarks[currentBatchDoc.id]) || step3?.remarks

                        const permitTypeNorm = (doc.permitType || '').toUpperCase()
                        const activeTypes: string[] = []
                        if (permitTypeNorm.includes('HOT')) activeTypes.push('HOT')
                        if (permitTypeNorm.includes('CONFINED')) activeTypes.push('CONFINED')
                        if (permitTypeNorm.includes('DIGGING')) activeTypes.push('DIGGING')
                        if (permitTypeNorm.includes('COLD')) activeTypes.push('COLD')
                        if (permitTypeNorm.includes('ELECTRICAL') || permitTypeNorm.includes('MECHANICAL')) activeTypes.push('ELECTRICAL')

                        const columnsToShow = activeTypes.length > 0 ? activeTypes : ['HOT', 'CONFINED', 'DIGGING', 'COLD', 'ELECTRICAL']
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

                        return (
                          <div className="-mx-5 -my-9 text-slate-900 w-[1122px] min-h-[793px] flex flex-col justify-between">
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
                                <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{doc?.permitNumber || currentBatchDoc?.documentNumber || '—'}</span>
                              </div>
                              <div className="col-span-8 p-1.5 bg-slate-50">
                                <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{(doc?.permitNumber || currentBatchDoc?.documentNumber || '').replace('PTW', 'WO')}</span>
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
                            {(() => {
                              const checkedEquipment: string[] = extractCheckedEquipment(
                                doc.controlSteps || (currentBatchDoc as any)?.rawPtw?.controlSteps,
                                (doc as any)?.checkedEquipment || (currentBatchDoc as any)?.rawPtw?.checkedEquipment,
                                doc.permitType || (currentBatchDoc as any)?.rawPtw?.permitType
                              )

                              return (
                                <PtwChecklistTable
                                  permitType={doc.permitType}
                                  subTypes={(currentBatchDoc as any)?.rawPtw?.subTypes || (currentBatchDoc as any)?.subTypes || (doc as any)?.subTypes}
                                  checkedEquipment={checkedEquipment}
                                  columnsToShow={columnsToShow}
                                />
                              )
                            })()}

                            {/* ── ALAT PELINDUNG DIRI (APD) WAJIB ── */}
                            <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80 flex items-center justify-between">
                              <div>
                                <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
                                <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
                                  {(doc.ppe && doc.ppe.length > 0 ? doc.ppe : ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness']).map((apd: string) => (
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
                                {cleanPtwDescription(doc?.description || (currentBatchDoc as any)?.rawPtw?.description) || doc?.description || (doc as any)?.additionalNotes || (currentBatchDoc as any)?.rawPtw?.additionalNotes || doc?.controlSteps || <span className="text-slate-400 italic text-[7pt]">— Tidak ada deskripsi pekerjaan —</span>}
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
                                    {remark2 || null}
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
                                    {remark1 || null}
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
                                    {remark3 || null}
                                  </div>
                                </div>
                              </div>

                              {/* 4. QR Code */}
                              {(() => {
                                const qrBaseUrl = 'https://hero.chitraparatama.com'
                                const qrTargetUrl = `${qrBaseUrl}/review/ptw/${encodeURIComponent(doc.permitNumber)}`
                                return (
                                  <a
                                    href={qrTargetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="col-span-3 flex flex-col items-center justify-center p-1.5 border-slate-900 bg-white hover:bg-blue-50/50 cursor-pointer transition-colors no-underline text-slate-900"
                                    title="Klik / Scan untuk membuka lampiran PTW"
                                    suppressHydrationWarning
                                  >
                                    <img
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrTargetUrl)}`}
                                      alt="QR Code Lampiran PTW"
                                      className="size-12 object-contain border border-slate-900 p-0.5 bg-white rounded shadow-2xs hover:scale-105 transition-transform"
                                      suppressHydrationWarning
                                    />
                                    <span className="text-[6pt] font-bold text-slate-900 mt-0.5 uppercase text-center underline underline-offset-1" suppressHydrationWarning>
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
                                <div className="h-14 flex flex-col items-center justify-center my-1">
                                  {step1?.status === 'rejected' ? (
                                    <>
                                      {step1?.signatureDataUrl && <img src={step1.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                      <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak ({formatTimestamp(step1?.signedAt)})</span>
                                    </>
                                  ) : step1?.status === 'reverted' ? (
                                    <>
                                      {step1?.signatureDataUrl && <img src={step1.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                      <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan ({formatTimestamp(step1?.signedAt)})</span>
                                    </>
                                  ) : step1?.signatureDataUrl ? (
                                    <img src={step1.signatureDataUrl} alt="TTD" className="max-h-12 object-contain" />
                                  ) : step1?.status === 'approved' ? (
                                    <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui ({formatTimestamp(step1?.signedAt)})</span>
                                  ) : (
                                    <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                                  )}
                                </div>
                                <div className="border-t border-slate-900 pt-1 font-bold">
                                  {step1?.approverName || doc.fieldPicName || 'NAMA & TANDA TANGAN'}
                                </div>
                              </div>

                              {/* 2. PELAKSANA PEKERJAAN */}
                              <div className="p-1.5 text-center flex flex-col justify-between">
                                <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PELAKSANA PEKERJAAN</div>
                                <div className="h-14 flex flex-col items-center justify-center my-1">
                                  {step2?.signatureDataUrl ? (
                                    <img src={step2.signatureDataUrl} alt="TTD" className="max-h-10 object-contain" />
                                  ) : null}
                                  {step2?.status === 'rejected' ? (
                                    <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak ({formatTimestamp(step2?.signedAt)})</span>
                                  ) : step2?.status === 'reverted' ? (
                                    <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan ({formatTimestamp(step2?.signedAt)})</span>
                                  ) : step2?.status === 'approved' && !step2?.signatureDataUrl ? (
                                    <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui ({formatTimestamp(step2?.signedAt)})</span>
                                  ) : !step2?.signatureDataUrl ? (
                                    <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                                  ) : null}
                                </div>
                                <div className="border-t border-slate-900 pt-1 font-bold">
                                  {step2?.approverName || doc.applicantName || 'NAMA & TANDA TANGAN'}
                                </div>
                              </div>

                              {/* 3. VERIFIKASI (SAFETY DEPT) */}
                              <div className="p-1.5 text-center flex flex-col justify-between">
                                <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">VERIFIKASI (SAFETY DEPT)</div>
                                <div className="h-14 flex flex-col items-center justify-center my-1">
                                  {step3?.status === 'rejected' ? (
                                    <>
                                      {step3?.signatureDataUrl && <img src={step3.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                      <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak ({formatTimestamp(step3?.signedAt)})</span>
                                    </>
                                  ) : step3?.status === 'reverted' ? (
                                    <>
                                      {step3?.signatureDataUrl && <img src={step3.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                      <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan ({formatTimestamp(step3?.signedAt)})</span>
                                    </>
                                  ) : step3?.signatureDataUrl ? (
                                    <img src={step3.signatureDataUrl} alt="TTD" className="max-h-12 object-contain" />
                                  ) : step3?.status === 'approved' ? (
                                    <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui ({formatTimestamp(step3?.signedAt)})</span>
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
                      })()}

                      {/* SOP / WIN Request Official Document Preview */}
                      {currentBatchDoc.category === 'SOP_WIN_REQUEST' && (
                        <div>
                          {/* Header Title (Matching Daily Activity Format Exactly) */}
                          <div className="text-center mb-4">
                            <h1 className="font-bold text-[11pt] uppercase text-black mb-0.5 tracking-wide">
                              PT. CHITRA PARATAMA
                            </h1>
                            <h2 className="font-bold text-[12pt] uppercase text-black tracking-wide">
                              PERMOHONAN AKSES DOKUMEN SOP / WIN / POL
                            </h2>
                          </div>

                          {/* Table 1: Details & Requester Profile */}
                          <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1.5 text-[8.5pt]">
                            <tbody>
                              <tr>
                                <td colSpan={2} className="font-bold bg-slate-100 text-black py-1 uppercase">
                                  1. INFORMASI PEMOHON DOKUMEN ({(currentBatchDoc as any).isExternal ? "PIHAK EKSTERNAL" : "PIHAK INTERNAL"})
                                </td>
                              </tr>
                              <tr>
                                <td className="w-1/2">
                                  Nama Pemohon: <strong>{currentBatchDoc.employeeName || '—'}</strong>
                                </td>
                                <td className="w-1/2">
                                  No. Registrasi: <strong className="font-mono text-indigo-900">{currentBatchDoc.documentNumber}</strong>
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  Departemen / Section: <strong>{currentBatchDoc.department || '—'}</strong>
                                </td>
                                <td>
                                  Tanggal Pengajuan: <strong>{(currentBatchDoc as any).requestDate ? new Date((currentBatchDoc as any).requestDate).toLocaleDateString('id-ID') : formatDate(currentBatchDoc.submittedAt)}</strong>
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  Prosedur Yang Diminta: <strong>{(currentBatchDoc as any).procedureName || '—'}</strong>
                                </td>
                                <td>
                                  Departemen Sendiri: <strong>{(currentBatchDoc as any).ownDepartment || currentBatchDoc.department || '—'}</strong>
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  Jenis Dokumen: <strong className="font-mono font-bold">[{ (currentBatchDoc as any).requestedDocType || 'SOP' }]</strong>
                                </td>
                                <td>
                                  Apakah Pemilik Proses?: <strong>{(currentBatchDoc as any).isProcessOwner ? 'Ya' : 'Tidak'}</strong>
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  Jenis Akses: <strong className="uppercase">{(currentBatchDoc as any).requestType === 'softcopy' ? 'Soft Copy (PDF Watermark)' : 'Hard Copy (Cetak Fisik)'}</strong>
                                </td>
                                <td>
                                  Masa Berlaku Akses: <strong>{(currentBatchDoc as any).expiryDays || 3} Hari Kerja</strong>
                                </td>
                              </tr>
                              {(currentBatchDoc as any).isExternal && (
                                <tr>
                                  <td>
                                    Instansi / Perusahaan: <strong>{(currentBatchDoc as any).externalCompany || '—'}</strong>
                                  </td>
                                  <td>
                                    Nama Contact Person: <strong>{(currentBatchDoc as any).externalName || '—'}</strong>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          {/* Table 2: Rincian Dokumen yang Diminta & Catatan Approval */}
                          {(() => {
                            const deptRaw = (currentBatchDoc as any).ownDepartment || currentBatchDoc.department || 'CPI';
                            const dbApprovals = (currentBatchDoc as any).approvals || (currentBatchDoc.rawSopWinRequest as any)?.approvals;
                            const defaultWf = getDepartmentWorkflowSteps(
                              deptRaw,
                              currentBatchDoc.employeeName,
                              currentBatchDoc.department,
                              (currentBatchDoc as any).requestedDocTitleAndNumber || currentBatchDoc.title
                            );

                            const wfSteps = (Array.isArray(dbApprovals) && dbApprovals.length > 0)
                              ? dbApprovals.map((a: any) => ({
                                  stepNumber: a.stepOrder,
                                  role: a.stepLabel,
                                  name: a.approverName || "Approver",
                                }))
                              : defaultWf.steps;

                            const wf = {
                              departmentCode: defaultWf.departmentCode,
                              departmentName: defaultWf.departmentName,
                              steps: wfSteps,
                            };

                            const gridColsClass =
                              wf.steps.length === 3
                                ? "grid-cols-3"
                                : wf.steps.length === 4
                                ? "grid-cols-2"
                                : wf.steps.length === 5
                                ? "grid-cols-3"
                                : "grid-cols-2";

                            const reqStatus = (currentBatchDoc as any).status || (currentBatchDoc.rawSopWinRequest as any)?.status;
                            const adminApprovedAt = (currentBatchDoc as any).adminApprovedAt || (currentBatchDoc.rawSopWinRequest as any)?.adminApprovedAt;
                            const reqRemarks = (currentBatchDoc as any).remarks || (currentBatchDoc.rawSopWinRequest as any)?.remarks;
                            const isReverted = reqStatus === "reverted" || reqStatus === "needs_revision" || (currentBatchDoc as any).status === "reverted" || (currentBatchDoc as any).status === "needs_revision";
                            const isRejected = reqStatus === "rejected" || (currentBatchDoc as any).status === "rejected";

                            const activeStepIdx = wf.steps.findIndex((s, i) => {
                              const stepOrder = i + 1;
                              const approvalRecord = (currentBatchDoc as any).approvals?.find((a: any) => a.stepOrder === stepOrder) || (currentBatchDoc.rawSopWinRequest as any)?.approvals?.find((a: any) => a.stepOrder === stepOrder);
                              if (approvalRecord) return approvalRecord.status === "pending";
                              if (i === 0 && (reqStatus === "pending_ria" || reqStatus === "submitted")) return true;
                              if (i === 1 && (reqStatus === "pending_creator" || reqStatus === "pending_owner")) return true;
                              if (i === 2 && reqStatus === "pending_bardynia") return true;
                              return false;
                            });

                            const currentActiveIdx = activeStepIdx >= 0 ? activeStepIdx : (reqStatus === "pending_ria" || reqStatus === "submitted" ? 0 : -1);

                            return (
                              <>
                                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1.5 text-[8.5pt]">
                                  <tbody>
                                    <tr>
                                      <td colSpan={2} className="font-bold bg-slate-100 text-black py-1 uppercase">
                                        2. RINCIAN DOKUMEN DAN CATATAN APPROVAL
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan={2}>
                                        Jumlah Prosedur Yang Diminta: <strong>{(currentBatchDoc as any).requestedDocCount || 1} Prosedur</strong>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan={2} className="bg-white p-2">
                                        <span className="font-bold block mb-1">Judul & Nomor Prosedur / Dokumen:</span>
                                        <div className="font-mono text-[8.5pt] bg-amber-50/80 p-2 border border-black rounded-xs font-semibold whitespace-pre-wrap leading-relaxed">
                                          {(currentBatchDoc as any).requestedDocTitleAndNumber || currentBatchDoc.title?.replace('Permintaan Dokumen: ', '') || currentBatchDoc.documentNumber}
                                        </div>
                                        {(currentBatchDoc as any).requestReason && (
                                          <div className="mt-2 text-slate-800 italic">
                                            <span className="font-bold not-italic text-slate-900 block text-[7.5pt]">ALASAN PERMINTAAN:</span>
                                            "{(currentBatchDoc as any).requestReason}"
                                          </div>
                                        )}
                                      </td>
                                    </tr>

                                    {/* Embedded Catatan Approval Table */}
                                    <tr>
                                      <td colSpan={2} className="bg-white p-2">
                                        <div className="font-bold mb-1.5 text-[8.5pt]">Catatan Approval</div>
                                        <table className="w-full border-collapse border border-black [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]" style={{ tableLayout: 'fixed' }}>
                                          <thead>
                                            <tr className="bg-white font-bold text-center">
                                              <th style={{ width: '6%' }}>#</th>
                                              <th className="text-left" style={{ width: '24%' }}>Tahap</th>
                                              <th className="text-left" style={{ width: '26%' }}>Approver</th>
                                              <th style={{ width: '14%' }}>Status</th>
                                              <th style={{ width: '15%' }}>Waktu</th>
                                              <th className="text-left" style={{ width: '15%' }}>Catatan</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {wf.steps.map((step, idx) => {
                                              let statusText = "Pending";
                                              let statusClass = "text-amber-700 font-bold";
                                              let signedTime = "—";
                                              const stepOrder = idx + 1;
                                              const approvalRecord = (currentBatchDoc as any).approvals?.find((a: any) => a.stepOrder === stepOrder) || (currentBatchDoc.rawSopWinRequest as any)?.approvals?.find((a: any) => a.stepOrder === stepOrder);
                                              const formatDateTimeUI = (dVal: any) => dVal ? new Date(dVal).toLocaleString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : "—";

                                              const rawStepRemark = (idx === currentActiveIdx && approvalRemarks[currentBatchDoc.id]?.trim())
                                                ? approvalRemarks[currentBatchDoc.id].trim()
                                                : (approvalRecord?.remarks || (idx === 0 ? reqRemarks : (step as any).remarks) || "");

                                              const displayStepRemark =
                                                rawStepRemark &&
                                                rawStepRemark !== "undefined" &&
                                                rawStepRemark !== "Proses approve via Inbox Approval" &&
                                                rawStepRemark.trim() !== ""
                                                  ? rawStepRemark.trim()
                                                  : "-";

                                              if (reqStatus === "approved" || (approvalRecord && approvalRecord.status === "approved")) {
                                                statusText = "Approved";
                                                statusClass = "text-emerald-700 font-bold";
                                                signedTime = formatDateTimeUI(approvalRecord?.signedAt || approvalRecord?.updatedAt || currentBatchDoc.submittedAt);
                                              } else if (idx === 0) {
                                                const isStep1Approved = Boolean(
                                                  adminApprovedAt ||
                                                  reqStatus === "pending_creator" ||
                                                  reqStatus === "pending_owner" ||
                                                  reqStatus === "pending_bardynia" ||
                                                  reqStatus === "approved_by_ria" ||
                                                  reqStatus === "pending_manager" ||
                                                  reqStatus === "pending_director" ||
                                                  (approvalRecord && (approvalRecord.status === "approved" || approvalRecord.status === "submitted" || Boolean(approvalRecord.signedAt))) ||
                                                  Boolean((currentBatchDoc as any).approvals?.some((a: any) => a.stepOrder > 1))
                                                );
                                                if (isStep1Approved) {
                                                  statusText = "Submitted";
                                                  statusClass = "text-emerald-700 font-bold";
                                                  signedTime = formatDateTimeUI(approvalRecord?.signedAt || adminApprovedAt || currentBatchDoc.submittedAt || (currentBatchDoc as any).createdAt);
                                                  
                                                  return (
                                                    <tr key={idx}>
                                                      <td className="text-center">{step.stepNumber}</td>
                                                      <td className="text-left font-medium">{step.role}</td>
                                                      <td className="text-left font-medium">{step.name}</td>
                                                      <td className={`text-center capitalize ${statusClass}`}>{statusText}</td>
                                                      <td className="text-center text-[7pt]">{signedTime}</td>
                                                      <td className="italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight text-center">
                                                        {displayStepRemark}
                                                      </td>
                                                    </tr>
                                                  );
                                                } else {
                                                  statusText = "Pending";
                                                }
                                              }

                                              return (
                                                <tr key={idx}>
                                                  <td className="text-center">{step.stepNumber}</td>
                                                  <td className="text-left font-medium">{step.role}</td>
                                                  <td className="text-left font-medium">{step.name}</td>
                                                  <td className={`text-center capitalize ${statusClass}`}>{statusText}</td>
                                                  <td className="text-center text-[7pt]">{signedTime}</td>
                                                  <td className="italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight text-center">
                                                    {displayStepRemark}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                {/* Section 3: Dynamic Department Workflow Signatories */}
                                <div>
                                  <div className="font-bold mb-3 text-[8.5pt]">Signatories</div>
                                  <div className={`grid ${gridColsClass} gap-x-6 gap-y-4 mb-4`}>
                                    {wf.steps.map((step, idx) => {
                                      let isSigned = false;
                                      const stepOrder = idx + 1;
                                      const approvalRecord = (currentBatchDoc as any).approvals?.find((a: any) => a.stepOrder === stepOrder) || (currentBatchDoc.rawSopWinRequest as any)?.approvals?.find((a: any) => a.stepOrder === stepOrder);

                                      if (approvalRecord?.status === "approved") {
                                        isSigned = true;
                                      } else if (idx === 0) {
                                        isSigned = Boolean(
                                          (adminApprovedAt || reqStatus === "pending_creator" || reqStatus === "approved_by_ria") &&
                                          approvalRecord?.status === "approved"
                                        );
                                      }

                                      const rawSigUrl = isSigned
                                        ? (approvalRecord?.signatureDataUrl || (idx === 0 ? ((currentBatchDoc as any).adminSignatureUrl || (currentBatchDoc.rawSopWinRequest as any)?.adminSignatureUrl) : null) || (step as any).signatureDataUrl)
                                        : null;

                                      const isValidImageSig = Boolean(
                                        rawSigUrl &&
                                        typeof rawSigUrl === "string" &&
                                        (rawSigUrl.startsWith("data:image/") || rawSigUrl.startsWith("http://") || rawSigUrl.startsWith("https://") || rawSigUrl.startsWith("/api/uploads/") || rawSigUrl.startsWith("/uploads/"))
                                      );

                                      return (
                                        <div key={idx}>
                                          <div className="text-[7pt] text-slate-500 font-medium mb-1">
                                            {step.role}
                                          </div>
                                          <div className="h-14 flex items-end">
                                            {isSigned ? (
                                              isValidImageSig ? (
                                                <img src={rawSigUrl} alt="TTD" className="h-10 object-contain" />
                                              ) : (
                                                <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">✓ Disetujui ({step.name})</span>
                                              )
                                            ) : isReverted ? (
                                              <span className="text-amber-700 font-bold text-[8pt]">↺ Diminta Revisi</span>
                                            ) : isRejected ? (
                                              <span className="text-rose-700 font-bold text-[8pt]">✗ Ditolak</span>
                                            ) : (
                                              <span className="text-slate-400 italic text-[7.5pt]">(Belum Disetujui)</span>
                                            )}
                                          </div>
                                          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                            {step.name}
                                          </div>
                                          <div className="text-[7pt] text-slate-600 font-medium">{step.role}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          <div className="text-right text-[7pt] text-slate-400 mt-2">PT Chitra Paratama • HERO Platform</div>
                        </div>
                      )}

                      {/* Form Permintaan Work Order (Landscape Document) */}
                      {((currentBatchDoc.category as any) === 'FORM_WO' ||
                        Boolean((currentBatchDoc as any).rawFormWo) ||
                        Boolean(currentBatchDoc.rawGeneralGroup?.items?.some((i: any) => i.repairFormWo))) && (() => {
                        const formWoRaw =
                          (currentBatchDoc as any).rawFormWo ||
                          currentBatchDoc.rawGeneralGroup?.items?.find((i: any) => i.repairFormWo)?.repairFormWo
                        if (!formWoRaw) return null
                        return (
                          <div className="w-full flex justify-center overflow-x-auto">
                            <FormWoDocumentView
                              doc={{
                                ...formWoRaw,
                                steps: (currentBatchDoc as any).rawFormWo?.steps || formWoRaw.steps || [],
                              }}
                              liveSignatureUrl={signatureDataUrl}
                            />
                          </div>
                        )
                      })()}

                      {/* Laporan Audit 5R Document (Standard A4 / Official CPI Document) */}
                      {((currentBatchDoc.category as any) === 'QUALITY_5R' ||
                        Boolean((currentBatchDoc as any).rawFiveR) ||
                        Boolean((currentBatchDoc as any).fiveRReport) ||
                        Boolean(
                          currentBatchDoc.rawGeneralGroup?.items?.some(
                            (i: any) =>
                              i.fiveRReport ||
                              i.activityType === '5R Audit Report' ||
                              (i as any).requestKindLabel === '5R Audit' ||
                              i.title?.toLowerCase().includes('5r')
                          )
                        )) && (() => {
                        const fiveRItem =
                          (currentBatchDoc as any).rawFiveR ||
                          (currentBatchDoc as any).fiveRReport ||
                          currentBatchDoc.rawGeneralGroup?.items?.find(
                            (i: any) =>
                              i.fiveRReport ||
                              i.activityType === '5R Audit Report' ||
                              (i as any).requestKindLabel === '5R Audit' ||
                              i.title?.toLowerCase().includes('5r')
                          )?.fiveRReport

                        if (!fiveRItem) return null

                        const reportObj = fiveRItem.report || fiveRItem
                        const findingsList = reportObj.findings || fiveRItem.findings || []
                        const logsList = reportObj.approvalLogs || fiveRItem.approvalLogs || []
                        const routeSteps = reportObj.steps || reportObj.approvalRoute || fiveRItem.steps || []
                        const activeStepLevel =
                          (reportObj as any).currentApprovalLevel ||
                          (reportObj as any).currentStepLevel ||
                          (reportObj.status === 'pending_bardynia' || reportObj.status === 'pending_step_2' ? 2 : 1)

                        return (
                          <div className="w-full">
                            <FiveRDocumentPreview
                              report={reportObj}
                              findings={findingsList}
                              approvalLogs={logsList}
                              approvalRoute={routeSteps}
                              currentStepLevel={activeStepLevel}
                              liveSignatureUrl={signatureDataUrl}
                              isEmbedded={true}
                            />
                          </div>
                        )
                      })()}

                      {/* APD / Tools / Material Document Preview (Exact Form as in Request Page) */}
                      {isApdDoc && (() => {
                        const apdItem = currentBatchDoc.rawGeneralGroup?.items?.find(
                          (i: any) =>
                            i.activityType?.toLowerCase().includes('request apd') ||
                            i.activityType?.toLowerCase().includes('request tools') ||
                            i.activityType?.toLowerCase().includes('request material') ||
                            i.title?.toLowerCase().includes('request apd') ||
                            i.title?.toLowerCase().includes('request tools') ||
                            i.title?.toLowerCase().includes('request material') ||
                            i.activityType === 'Summary APD'
                        ) || currentBatchDoc.rawGeneralGroup?.items?.[0]
                        if (!apdItem) return null
                        const printUrl = apdItem.activityType === 'Summary APD'
                          ? `/print/summary/${apdItem.activityId}?embed=1`
                          : `/print/apd/${apdItem.activityId}?embed=1`

                        return (
                          <div className="w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] overflow-hidden flex justify-center p-0 m-0">
                            <iframe
                              src={printUrl}
                              className="w-[210mm] min-h-[297mm] h-[297mm] border-0 bg-white shadow-none p-0 m-0 block"
                              title="Preview Dokumen Permintaan Barang"
                              onLoad={(e) => {
                                const iframe = e.target as HTMLIFrameElement
                                const sendSig = () => {
                                  if (signatureDataUrl && iframe?.contentWindow) {
                                    iframe.contentWindow.postMessage(
                                      { type: 'previewSignature', dataUrl: signatureDataUrl },
                                      '*'
                                    )
                                  }
                                }
                                sendSig()
                                setTimeout(sendSig, 200)
                                setTimeout(sendSig, 600)
                                setTimeout(sendSig, 1200)
                              }}
                            />
                          </div>
                        )
                      })()}

                      {/* General Group (Form Activity) */}
                      {!isApdDoc &&
                        currentBatchDoc.category === 'GENERAL' &&
                        !Boolean(currentBatchDoc.rawGeneralGroup?.items?.some((i: any) => i.repairFormWo)) &&
                        !Boolean(
                          currentBatchDoc.rawGeneralGroup?.items?.some(
                            (i: any) =>
                              i.fiveRReport ||
                              i.activityType === '5R Audit Report' ||
                              (i as any).requestKindLabel === '5R Audit' ||
                              i.title?.toLowerCase().includes('5r')
                          )
                        ) &&
                        currentBatchDoc.rawGeneralGroup && (
                        <div>
                          <div className="text-center mb-3">
                            <h2 className="text-xs font-bold tracking-wider text-[#0d3b66] border-b-2 border-[#0d3b66] inline-block pb-0.5 uppercase">
                              FORM DAILY ACTIVITY
                            </h2>
                          </div>

                          <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 text-[8.5pt]">
                            <tbody>
                              <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Informasi Sesi Pengajuan</td></tr>
                              <tr>
                                <td className="w-1/2">Nomor Sesi: <strong>{currentBatchDoc.documentNumber}</strong></td>
                                <td className="w-1/2">Tanggal Kerja: <strong>{formatDate(currentBatchDoc.workDate || currentBatchDoc.submittedAt)}</strong></td>
                              </tr>
                              <tr>
                                <td>Nama Karyawan: <strong>{currentBatchDoc.employeeName}</strong></td>
                                <td>Site / Lokasi: <strong>{currentBatchDoc.siteName || currentBatchDoc.location || '—'}</strong></td>
                              </tr>
                              <tr>
                                <td>Shift: <strong>{currentBatchDoc.shiftCode || 'ALL'}</strong></td>
                                <td>Total Aktivitas: <strong>{currentBatchDoc.rawGeneralGroup.items?.length || 0} Item</strong></td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Daftar Aktivitas */}
                          <div className="font-bold mb-1 text-[8.5pt]">
                            Rincian Aktivitas Pekerjaan ({currentBatchDoc.rawGeneralGroup.items?.length || 0} Item)
                          </div>
                          <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                            <thead>
                              <tr className="bg-slate-50 font-bold text-center">
                                <th className="w-[5%]">#</th>
                                <th className="text-left w-[25%]">Tipe Aktivitas</th>
                                <th className="w-[15%]">Unit / Equipment</th>
                                <th className="text-left w-[35%]">Deskripsi / Judul</th>
                                <th className="w-[10%]">Jam</th>
                                <th className="w-[10%]">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(currentBatchDoc.rawGeneralGroup.items || []).map((it: any, idx: number) => {
                                const desc = it.description && it.description !== '-' ? it.description : (it.title || it.remarks || '-')
                                const hasDifferentRemarks = it.remarks && it.remarks !== desc && it.remarks !== '-'
                                return (
                                  <tr key={it.activityId || idx}>
                                    <td className="text-center">{idx + 1}</td>
                                    <td className="font-semibold">{it.activityType || 'Aktivitas'}</td>
                                    <td className="text-center">{it.unitNumber || it.equipmentNo || '-'}</td>
                                    <td className="text-left">
                                      <div className="font-medium">{desc}</div>
                                      {hasDifferentRemarks && (
                                        <div className="text-[7pt] text-slate-500 italic mt-0.5">{it.remarks}</div>
                                      )}
                                    </td>
                                    <td className="text-center text-[7.5pt]">{it.timeRange || (it.startTime && it.endTime ? `${formatTime(it.startTime)} - ${formatTime(it.endTime)}` : '-')}</td>
                                    <td className="text-center capitalize text-[7.5pt]">{it.dailyActivityStatus || it.activityStatus || 'Submitted'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>

                          {/* Matriks Tanda Tangan & Persetujuan */}
                          <div className="font-bold mb-1 text-[8.5pt]">Matriks Persetujuan</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            <div className="border border-black p-2 text-center text-[8pt] bg-white relative">
                              <p className="font-bold text-[7.5pt] text-slate-600 mb-6">Diajukan Oleh (Karyawan)</p>
                              {((currentBatchDoc as any).signatureUrl || (currentBatchDoc as any).submitterSignatureUrl || (currentBatchDoc.rawGeneralGroup as any)?.submitterSignatureUrl || (currentBatchDoc.rawGeneralGroup?.items?.[0] as any)?.signatureUrl) && (
                                <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
                                  <img src={(currentBatchDoc as any).signatureUrl || (currentBatchDoc as any).submitterSignatureUrl || (currentBatchDoc.rawGeneralGroup as any)?.submitterSignatureUrl || (currentBatchDoc.rawGeneralGroup?.items?.[0] as any)?.signatureUrl} alt="TTD" className="h-10 object-contain" />
                                </div>
                              )}
                              <p className="font-bold underline">{currentBatchDoc.employeeName || 'Karyawan'}</p>
                              <p className="text-[7pt] text-slate-500">{formatDate(currentBatchDoc.submittedAt)}</p>
                            </div>
                            <div className="border border-black p-2 text-center text-[8pt] bg-white relative">
                              <p className="font-bold text-[7.5pt] text-slate-600 mb-6">Persetujuan / Atasan</p>
                              {(signatureDataUrl || (currentBatchDoc as any).approverSignatureUrl || (currentBatchDoc.rawGeneralGroup?.items?.[0] as any)?.approverSignatureUrl) && (
                                <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
                                  <img src={signatureDataUrl || (currentBatchDoc as any).approverSignatureUrl || (currentBatchDoc.rawGeneralGroup?.items?.[0] as any)?.approverSignatureUrl} alt="Live TTD" className="h-10 object-contain" />
                                </div>
                              )}
                              <p className="font-bold underline">{currentUserName || currentBatchDoc.approverName || 'Approver'}</p>
                              <p className="text-[7pt] text-indigo-700 font-semibold">{currentBatchDoc.stepLabel || 'Persetujuan Atasan'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contract Review Fallback */}
                      {currentBatchDoc.category === 'CONTRACT_REVIEW' && (
                        <div>
                          <div className="text-center mb-3">
                            <h2 className="text-xs font-bold tracking-wider text-[#0d3b66] border-b-2 border-[#0d3b66] inline-block pb-0.5 uppercase">
                              CONTRACT REVIEW
                            </h2>
                          </div>
                          <div className="border border-black p-3 text-[8.5pt] space-y-2">
                            <p><strong>Nomor Pengajuan:</strong> {currentBatchDoc.documentNumber}</p>
                            <p><strong>Nama Karyawan:</strong> {currentBatchDoc.employeeName}</p>
                            <p><strong>Site:</strong> {currentBatchDoc.siteName || '—'}</p>
                            <p><strong>Tahap Approval:</strong> {currentBatchDoc.stepLabel}</p>
                          </div>
                        </div>
                      )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

              {/* Right Column (Desktop) / Bottom Section (Mobile): Reviewer Action Sidebar */}
              <div
                className={cn(
                  "bg-white text-slate-800",
                  viewMode === 'mobile'
                    ? "w-full max-w-lg mx-auto p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                    : "w-full lg:w-96 shrink-0 p-4 sm:p-5 flex flex-col justify-between space-y-4"
                )}
              >
                <div className="space-y-4">
                  {/* Card 1: Informasi Dokumen */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 text-xs">Informasi Dokumen</p>
                      <span className={cn(
                        "capitalize text-[10px] font-bold px-2 py-0.5 rounded-md border",
                        currentBatchDoc?.isReverted
                          ? "bg-amber-100 border-amber-300 text-amber-800"
                          : "bg-blue-100 border-blue-300 text-blue-800"
                      )}>
                        {currentBatchDoc?.isReverted ? 'Reverted' : 'Submitted'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1 pt-1">
                      <p><span className="text-slate-400">Karyawan:</span> <span className="font-semibold text-slate-900">{currentBatchDoc?.employeeName}</span></p>
                      <p><span className="text-slate-400">Kode Sesi:</span> <span className="font-mono text-indigo-700 font-semibold">{currentBatchDoc?.documentNumber}</span></p>
                      <p><span className="text-slate-400">Tanggal:</span> <span className="font-semibold text-slate-900">{formatDate(currentBatchDoc?.workDate || currentBatchDoc?.submittedAt)}</span></p>
                      <p><span className="text-slate-400">Shift:</span> <span className="font-semibold text-slate-900">{currentBatchDoc?.shiftCode || 'ALL'}</span></p>
                    </div>

                    {currentBatchDoc?.category === 'SOP_WIN_REQUEST' && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/80 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAccessSettingsOpen(true)}
                          className="w-full h-8 text-[11px] font-bold border-blue-200 bg-blue-50/50 text-[#003461] hover:bg-blue-100/60 rounded-xl gap-1.5"
                        >
                          <Settings className="size-3.5 text-[#003461]" /> Pengaturan Akses Dokumen
                        </Button>

                        {((currentBatchDoc as any).accessToken || (currentBatchDoc as any).rawSopWinRequest?.accessToken) && (
                          <div className="p-2.5 bg-[#003461]/5 border border-[#003461]/20 rounded-xl space-y-1.5 text-xs">
                            <span className="font-bold text-[#003461] block flex items-center gap-1.5 text-[11px]">
                              <ExternalLink className="size-3 text-[#003461]" />
                              Link Portal Akses Dokumen
                            </span>
                            <a
                              href={`/sop-win/request/${(currentBatchDoc as any).accessToken || (currentBatchDoc as any).rawSopWinRequest?.accessToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#003461] underline font-mono break-all hover:text-indigo-900 block bg-white p-1.5 rounded-md border border-slate-200"
                            >
                              {typeof window !== 'undefined'
                                ? `${window.location.origin}/sop-win/request/${(currentBatchDoc as any).accessToken || (currentBatchDoc as any).rawSopWinRequest?.accessToken}`
                                : `/sop-win/request/${(currentBatchDoc as any).accessToken || (currentBatchDoc as any).rawSopWinRequest?.accessToken}`}
                            </a>
                            <Button
                              type="button"
                              size="sm"
                              asChild
                              className="w-full h-7.5 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-[11px] rounded-lg gap-1.5 shadow-2xs mt-1"
                            >
                              <a
                                href={`/sop-win/request/${(currentBatchDoc as any).accessToken || (currentBatchDoc as any).rawSopWinRequest?.accessToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="size-3" /> BUKA PORTAL AKSES DOKUMEN
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card: Tanda Tangan Approver */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <PenTool className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">Tanda Tangan Approver</p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {signatureDataUrl ? 'TTD Digital Aktif' : 'Belum Ada TTD'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMissingSignatureDialogOpen(true)}
                      className="h-8 text-xs font-bold border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl cursor-pointer"
                    >
                      UBAH TTD
                    </Button>
                  </div>

                  {/* Card 2: Catatan Approval */}
                  <div className={cn(
                    "rounded-xl border p-3.5 bg-white space-y-1.5 transition-all duration-200",
                    remarkFieldError ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200" : "border-slate-200"
                  )}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 text-xs">Catatan Approval</p>
                      {remarkFieldError && (
                        <span className="text-[10px] font-bold text-rose-600 animate-pulse">Wajib Diisi</span>
                      )}
                    </div>
                    <Textarea
                      placeholder="Mohon cantumkan rincian revisi atau catatan approval di sini..."
                      value={currentBatchDoc ? approvalRemarks[currentBatchDoc.id] || '' : ''}
                      onChange={(e) => {
                        if (currentBatchDoc) {
                          setApprovalRemarks((prev) => ({
                            ...prev,
                            [currentBatchDoc.id]: e.target.value,
                          }))
                          if (e.target.value.trim()) setRemarkFieldError(false)
                        }
                      }}
                      className={cn(
                        "text-xs min-h-[85px] resize-none rounded-xl bg-slate-50/50",
                        remarkFieldError ? "border-rose-400 focus-visible:ring-rose-400" : "border-slate-200"
                      )}
                    />
                  </div>
                </div>

                {/* Section: Action Buttons */}
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  {/* AKSI DOKUMEN INI */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      AKSI DOKUMEN INI ({batchReviewIndex + 1} / {selectedItems.length})
                    </p>
                    <Button
                      type="button"
                      onClick={() => executeDirectSingleAction('approve')}
                      disabled={isBatchActionRunning}
                      className="w-full h-11 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                    >
                      <CheckCircle2 className="size-4" /> APPROVE
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => executeDirectSingleAction('revert')}
                        disabled={isBatchActionRunning}
                        className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5"
                      >
                        <RotateCcw className="size-3.5 text-slate-500" /> REVERT
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => executeDirectSingleAction('reject')}
                        disabled={isBatchActionRunning}
                        className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5"
                      >
                        <XCircle className="size-3.5 text-slate-500" /> REJECT
                      </Button>
                    </div>
                  </div>

                  {/* AKSI MASSAL */}
                  {selectedItems.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        AKSI MASSAL ({selectedItems.length} DOKUMEN)
                      </p>
                      <Button
                        type="button"
                        onClick={() => executeDirectBatchAllAction('approve')}
                        disabled={isBatchActionRunning}
                        className="w-full h-11 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                      >
                        <CheckCheck className="size-4" /> APPROVE ALL ({selectedItems.length})
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => executeDirectBatchAllAction('revert')}
                          disabled={isBatchActionRunning}
                          className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl"
                        >
                          REVERT ALL
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => executeDirectBatchAllAction('reject')}
                          disabled={isBatchActionRunning}
                          className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl"
                        >
                          REJECT ALL
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* TUTUP REVIEWER BUTTON */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsBatchReviewOpen(false)}
                    className="w-full h-10 bg-[#e5f0ec] text-[#003461] hover:bg-[#d6e7e1] font-bold text-xs rounded-xl mt-2"
                  >
                    TUTUP REVIEWER
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )
      })()}
    </Dialog>

        <MissingSignatureDialog
          isOpen={isMissingSignatureDialogOpen}
          onClose={() => setIsMissingSignatureDialogOpen(false)}
          onSignatureRegistered={(newSigUrl) => {
            setSignatureDataUrl(newSigUrl)
            toast.success('Tanda tangan digital berhasil didaftarkan! Silakan tekan tombol APPROVE untuk menyetujui dokumen.')
          }}
        />

        {currentBatchDoc?.category === 'SOP_WIN_REQUEST' && currentBatchDoc.rawSopWinRequest && (
          <SopWinAccessSettingsModal
            isOpen={isAccessSettingsOpen}
            onClose={() => setIsAccessSettingsOpen(false)}
            requestId={Number(currentBatchDoc.rawSopWinRequest.requestId || currentBatchDoc.id)}
            requestNumber={currentBatchDoc.documentNumber}
            docTitle={currentBatchDoc.title || 'Dokumen SOP/WIN'}
            currentExpiryDays={currentBatchDoc.rawSopWinRequest.expiryDays || 3}
            currentCanDownload={(currentBatchDoc.rawSopWinRequest as any).canDownload ?? true}
          />
        )}
    </>
  )
}

export function HistoryTab({
  groups,
  viewMode = 'desktop',
}: {
  groups: ApprovalCenterData['historyGroups']
  viewMode?: 'desktop' | 'mobile'
}) {
  if (groups.length === 0) {
    if (viewMode === 'mobile') {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          Belum ada riwayat pengajuan yang tercatat.
        </div>
      )
    }
    return (
      <Card className="bg-surface-container-lowest rounded-[1.6rem] shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>Riwayat</CardTitle>
          <CardDescription>Belum ada riwayat pengajuan yang tercatat.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const safeGroups = Array.isArray(groups) ? groups : []
  const sites = Array.from(new Set(safeGroups.map((group) => (group as any)?.siteName || 'Site Operasional'))).sort()
  const priorities = Array.from(
    new Set(safeGroups.flatMap((group) => (group?.items || []).map((item) => item?.priority || 'normal')))
  ).sort()
  const statuses = Array.from(
    new Set(safeGroups.flatMap((group) => (group?.items || []).map((item) => item?.status || 'open')))
  ).sort()

  const allHistoryItems = safeGroups.flatMap((group) =>
    (group?.items || []).map((item) => ({ ...item, workDateLabel: group.workDateLabel }))
  )

  if (viewMode === 'mobile') {
    return (
      <div className="space-y-3">
        {allHistoryItems.map((item) => (
          <div
            key={item.activityId}
            className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100/90 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  <FileText className="size-3" />
                  {item.activityType || 'Dokumen'}
                </span>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {item.workDateLabel} • {item.siteName}
                </p>
              </div>

              <div className="shrink-0">
                <AdminStatusBadge value={item.status} />
              </div>
            </div>

            <div className="space-y-1 rounded-xl bg-slate-50/80 p-2.5 text-xs">
              <div className="flex items-center justify-between">
                 <span className="text-slate-500 font-medium">Posisi Terakhir:</span>
                 <span className="font-bold text-slate-700">{(item as any).currentStage || 'Selesai'}</span>
               </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Diajukan:</span>
                <span className="font-semibold text-slate-600">{formatDate(item.submittedAt)}</span>
              </div>
            </div>

            <Button
              size="sm"
              asChild
              className="w-full h-10 text-xs font-bold bg-[#003461] hover:bg-[#00274a] text-white rounded-xl shadow-xs flex items-center justify-center gap-2"
            >
              <a href={`/dashboard/daily-activity/${item.activityId}`}>
                Lihat Detail ↗
              </a>
            </Button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="bg-surface-container-lowest rounded-[1.4rem] border-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
      <CardContent className="pt-6">
        <MinimalTableShell
          title="Riwayat"
          description="Seluruh jejak persetujuan dan riwayat dokumen operasional dapat dipantau dari sini."
          label="approval history"
          fileName="approval-history"
          searchPlaceholder="Cari riwayat pengajuan, requester, unit, atau status..."
          dateFilter
          filters={
            <ApprovalFilterBar
              sites={sites}
              priorities={priorities}
              statusOptions={statuses}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengajuan</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posisi Terakhir</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeGroups.flatMap((group) =>
                (group?.items || []).map((item) => (
                  <TableRow
                    key={item.activityId}
                    data-date-value={item.submittedAt ? new Date(item.submittedAt).toISOString() : new Date().toISOString()}
                    data-filter-site={item.siteName || ''}
                    data-filter-priority={item.priority || 'normal'}
                    data-filter-status={item.status || 'open'}
                  >
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-foreground font-semibold">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.activityType} • {item.unitNumber}{(item as any).tireCount ? ` • ${(item as any).tireCount} Tire` : ''} • {group.workDateLabel}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusBadge value={item.priority} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground align-top text-sm">
                      {item.siteName}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <AdminStatusBadge value={item.status} />
                        <p className="text-muted-foreground text-xs">{item.lastDecision}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground">{item.pendingWith}</p>
                        <p className="text-muted-foreground text-xs">
                          Tahap {item.currentStepLabel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground">{item.workflowLabel}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.shiftLabel} • {item.timeRange}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <AdminDetailDrawer
                        title={`Trail ${item.title}`}
                        description={`${item.siteName} • ${item.workflowLabel}`}
                        width="wide"
                        trigger={
                          <Button type="button" variant="outline" size="dense">
                            Trail
                          </Button>
                        }
                      >
                        <div className="space-y-3">
                          <div className="bg-surface-container-low rounded-lg p-3">
                            <p className="text-foreground text-sm font-semibold">Jejak approval</p>
                            <div className="mt-2 space-y-2">
                              {(item.notes || []).map((note) => (
                                <div
                                  key={note.id}
                                  className="bg-surface-container-lowest rounded-lg px-3 py-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-foreground text-sm font-medium">
                                      {note.actor}
                                    </p>
                                    <AdminStatusBadge value={note.kind} />
                                  </div>
                                  <p className="text-foreground mt-2 text-sm">{note.message}</p>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {note.at ? new Date(note.at).toLocaleString('id-ID') : '-'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-surface-container-low rounded-lg p-3">
                            <p className="text-foreground text-sm font-semibold">Status per step</p>
                            <div className="mt-2 space-y-2">
                              {(item.steps || []).map((step) => (
                                <div
                                  key={step.approvalId}
                                  className="bg-surface-container-lowest rounded-lg px-3 py-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-foreground text-sm font-medium">
                                      L{step.level} • {step.label}
                                    </p>
                                    <AdminStatusBadge value={step.status} />
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {step.approverName} •{' '}
                                    {step.reviewedAt
                                      ? new Date(step.reviewedAt).toLocaleString('id-ID')
                                      : 'Belum diputuskan'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AdminDetailDrawer>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </CardContent>
    </Card>
  )
}

export function ApprovalWorkbench({
  data,
  filterCategory,
  title,
  eyebrow,
  description,
  customActions,
}: {
  data: ApprovalCenterData
  filterCategory?: string
  title?: string
  eyebrow?: string
  description?: string
  customActions?: React.ReactNode
}) {
  const safeData = data || {
    inboxMetrics: { pendingGroups: 0, pendingActivities: 0, dueSoon: 0, overdue: 0 },
    historyMetrics: { approved: 0, rejected: 0 },
    inboxGroups: [],
    historyGroups: [],
    dailyActivityInboxItems: [],
    overtimeInboxItems: [],
    ptwInboxItems: [],
    contractReviewInboxItems: [],
    sopWinRequestInboxItems: [],
  }

  const isDailyOnly = filterCategory === 'DAILY_ACTIVITY'
  const dailyCount = safeData.dailyActivityInboxItems?.length ?? 0
  const dailyDueSoon = safeData.dailyActivityInboxItems?.filter((d) => d.dueState === 'due_soon').length ?? 0
  const dailyOverdue = safeData.dailyActivityInboxItems?.filter((d) => d.dueState === 'overdue').length ?? 0

  return (
    <AdminPageShell
      eyebrow={eyebrow || 'Approval'}
      title={title || 'Approval Inbox'}
      description={
        description ||
        'Tugas yang harus saya approve. Gunakan halaman ini untuk mengambil keputusan sebagai approver, bukan untuk memantau request yang saya buat.'
      }
      actions={customActions}
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          {
            label: isDailyOnly ? 'Total Sesi' : 'Grup menunggu',
            value: `${isDailyOnly ? dailyCount : safeData.inboxMetrics?.pendingGroups ?? 0}`,
            meta: isDailyOnly ? 'Seluruh pengajuan DAR aktif' : 'Requester-hari yang masih perlu keputusan',
          },
          {
            label: isDailyOnly ? 'Menunggu Approval' : 'Item pending',
            value: `${isDailyOnly ? dailyCount : safeData.inboxMetrics?.pendingActivities ?? 0}`,
            meta: isDailyOnly ? 'Dokumen butuh tanda tangan Anda' : 'Pengajuan yang bisa diputuskan sekarang',
          },
          {
            label: 'Segera jatuh tempo',
            value: `${isDailyOnly ? dailyDueSoon : safeData.inboxMetrics?.dueSoon ?? 0}`,
            meta: 'Butuh diprioritaskan di shift ini',
          },
          {
            label: 'Terlambat',
            value: `${isDailyOnly ? dailyOverdue : safeData.inboxMetrics?.overdue ?? 0}`,
            meta: 'Sudah melewati SLA review',
          },
          {
            label: 'Riwayat disetujui',
            value: `${safeData.historyMetrics?.approved ?? 0}`,
            meta: 'Seluruh pengajuan & persetujuan yang disetujui',
          },
          {
            label: 'Riwayat ditolak',
            value: `${safeData.historyMetrics?.rejected ?? 0}`,
            meta: 'Butuh tindak lanjut, ditolak, atau dikembalikan',
          },
        ]}
      />

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="inbox">
            Approval Inbox {((safeData.rfrInboxItems?.length ?? 0) > 0 || (safeData.inboxGroups?.length ?? 0) > 0) ? `(${(safeData.inboxGroups?.length ?? 0) + (safeData.rfrInboxItems?.length ?? 0)})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history">Riwayat pengajuan</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <InboxTab
            groups={isDailyOnly ? [] : safeData.inboxGroups || []}
            rfrItems={safeData.rfrInboxItems || []}
            dailyActivityItems={safeData.dailyActivityInboxItems || []}
            overtimeItems={isDailyOnly ? [] : safeData.overtimeInboxItems || []}
            ptwItems={isDailyOnly ? [] : safeData.ptwInboxItems || []}
            contractReviewItems={isDailyOnly ? [] : safeData.contractReviewInboxItems || []}
            sopWinRequestItems={isDailyOnly ? [] : safeData.sopWinRequestInboxItems || []}
            filterCategory={filterCategory}
          />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab groups={safeData.historyGroups || []} />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  )
}

function DailyActivityEvidenceQr({ sessionId }: { sessionId?: number | string | null }) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)
  const cleanSessionId = typeof sessionId === 'string' ? sessionId.replace(/^daily-activity-/, '') : sessionId

  useEffect(() => {
    if (!cleanSessionId) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    QRCode.toDataURL(`${origin}/activity-evidence/${cleanSessionId}`, { margin: 1, width: 140, errorCorrectionLevel: 'M' })
      .then(setQrUrl)
      .catch((e) => console.error('Failed to generate evidence QR in approval workbench:', e))
  }, [cleanSessionId])

  return (
    <>
      <div
        onClick={() => setIsEvidenceModalOpen(true)}
        className="flex flex-col items-center justify-start text-center border-l border-slate-200 pl-2 cursor-pointer group select-none transition-transform hover:scale-105 active:scale-95"
        title="Klik untuk membuka galeri foto bukti pekerjaan"
      >
        <div className="h-14 flex items-center justify-center">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Evidence" className="h-12 w-12 object-contain rounded border border-slate-200 p-0.5 bg-white shadow-xs group-hover:border-indigo-500 group-hover:shadow-md transition-all" />
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

      <DailyActivityEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        sessionId={sessionId}
      />
    </>
  )
}
