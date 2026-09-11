'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Bug,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Download,
  Eye,
  FileCheck,
  FileDown,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Layers,
  ListFilter,
  Move,
  PenTool,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Users,
  ChevronDown,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { downloadElementAsPdf, downloadHtmlAsPdf, generateElementAsPdfBlob, generateHtmlAsPdfBlob, downloadFilesAsZip } from '@/lib/pdf-download'

import { AdminPageShell } from '@/components/admin-page-shell'
import { DailyActivityEvidenceModal } from '@/components/daily-activity-evidence-modal'
import { MissingSignatureDialog } from '@/components/missing-signature-dialog'
import { HcWorkspaceBanner, hcPrimaryActionClassName } from '@/components/hc/hc-workspace-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { EnterpriseActionButtons } from '@/components/ui/enterprise-table-kit'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { cn } from '@/lib/utils'
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'
import {
  batchApproveDailyActivitySessionsAction,
  batchRejectDailyActivitySessionsAction,
  batchRevertDailyActivitySessionsAction,
  singleApproveDailyActivityAction,
  singleRejectDailyActivityAction,
  singleRevertDailyActivityAction,
  createDailyActivitySessionAction,
  deleteDailyActivitySessionAction,
  deleteBatchDailyActivitySessionsAction,
  generateTestDailyActivityApproval,
  sendDueDailyActivityReminders,
  saveDailyActivityWorkflowSettings,
} from '@/app/dashboard/activity-hub/actions'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import {
  type DailyActivityWorkflowSettings,
  DEFAULT_DAILY_ACTIVITY_SETTINGS,
} from '@/lib/workflow-settings-defaults'
import type { RouteFolder } from '@/lib/daily-activity'

export type SessionApprovalRow = {
  sessionId: number
  sessionCode: string
  workDate: Date | string | null
  shiftCode: string
  sessionStatus: string
  employeeId?: number | null
  employeeName: string
  employeeSn: string
  department?: string
  section?: string
  jobTitle?: string
  customerName?: string
  siteName: string
  teamMembersSummary?: string
  totalItems: number
  totalPoints: number
  items?: Array<{
    id: number
    label: string
    unitNumber?: string
    duration?: string
    points: number
    remark?: string
  }>
  approvals: Array<{
    stepOrder: number
    stepLabel: string
    approverRole?: string | null
    status: string
    approverName: string | null
    approverEmail?: string | null
    approverEmployeeId?: number | null
    signatureDataUrl?: string | null
    remarks?: string | null
    signedAt: Date | string | null
  }>
}

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

function SessionStatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-0',
    completed: 'bg-emerald-50 text-emerald-700 border-0',
    submitted: 'bg-blue-50 text-blue-700 border-0',
    pending: 'bg-amber-50 text-amber-700 border-0',
    rejected: 'bg-rose-50 text-rose-700 border-0',
    draft: 'bg-slate-100 text-slate-600 border-0',
  }
  const s = (status || '').toLowerCase()
  return (
    <Badge className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize tracking-normal ${map[s] || map.draft}`}>
      {s === 'approved' ? 'Completed' : s === 'submitted' ? 'Submitted' : (status || 'Draft')}
    </Badge>
  )
}

function ApprovalProgressBadge({ approvals = [] }: { approvals?: SessionApprovalRow['approvals'] }) {
  const list = Array.isArray(approvals) ? approvals : []
  const approved = list.filter((a) => a?.status === 'approved').length
  const total = list.length
  const anyRejected = list.some((a) => a?.status === 'rejected')

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
    <Badge className="rounded-full px-3 py-0.5 text-xs bg-amber-50 text-amber-700 border-0 font-medium">
      {approved}/{total} steps
    </Badge>
  )
}

export function ApprovalListingClient({
  rows: initialRows = [],
  employees = [],
  sites = [],
  activityPresets = [],
  routeFolders = [],
  sectionHeadMap = {},
  deptHeadMap = {},
  initialSettings,
  currentEmployeeId = null,
  currentEmployeeEmail = null,
  currentEmployeeName = '',
  isAdmin = false,
  accessRole = '',
}: {
  rows?: SessionApprovalRow[]
  employees?: Array<{
    id: number
    name: string
    employeeId: string
    email: string | null
    jobTitle: string | null
    department: string | null
    section?: string | null
    siteId?: number | null
    directManagerId?: number | null
    sectionId?: number | null
    departmentId?: number | null
  }>
  sites?: Array<{ id: number; name: string; code?: string | null; location?: string | null }>
  activityPresets?: Array<{
    id: number
    code: string
    name: string
    basePoints?: number | null
    category?: string | null
    requiresPhoto?: boolean
    requiresEquipmentNo?: boolean
    requiresDuration?: boolean
    requiresLocationGps?: boolean
    requiresTireCount?: boolean
    requiresMaterialUsed?: boolean
  }>
  routeFolders?: RouteFolder[]
  sectionHeadMap?: Record<string, number | null>
  deptHeadMap?: Record<string, number | null>
  initialSettings?: DailyActivityWorkflowSettings
  currentEmployeeId?: number | null
  currentEmployeeEmail?: string | null
  currentEmployeeName?: string | null
  isAdmin?: boolean
  accessRole?: string
}) {
  const router = useRouter()
  const [rows, setRows] = useState<SessionApprovalRow[]>(() => initialRows || [])
  useEffect(() => {
    setRows(initialRows || [])
  }, [initialRows])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [testLinks, setTestLinks] = useState<Array<{ step: number; role: string; name: string; url: string }> | null>(null)
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [isReminderRunning, setIsReminderRunning] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isTeamLog, setIsTeamLog] = useState(false)
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<number[]>([])
  const [teamMemberPickerOpen, setTeamMemberPickerOpen] = useState(false)
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('')
async function uploadActivityPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Evidence harus berupa gambar.')

  const formData = new FormData()
  formData.append('file', file)
  const uploadResponse = await fetch('/api/uploads/activity-presign', {
    method: 'POST',
    body: formData,
  })
  const result = (await uploadResponse.json()) as {
    url?: string
    error?: string
  }
  if (!uploadResponse.ok || !result.url) {
    throw new Error(result.error || `Gagal upload evidence ${file.name}.`)
  }

  return result.url
}

  const [createForm, setCreateForm] = useState({
    employeeId: '',
    employeeName: '',
    employeeSn: '',
    jobTitle: '',
    department: '',
    section: '',
    siteId: '',
    siteName: '',
    customerName: '',
    workDate: new Date().toISOString().split('T')[0],
    shiftCode: 'ALL',
    leaderEmployeeId: '',
    leaderName: '',
    superiorEmployeeId: '',
    superiorName: '',
    managerEmployeeId: '',
    managerName: '',
    sourceMode: 'self_input' as 'self_input' | 'assigned' | 'custom',
    assignmentId: '',
    customName: '',
    customDescription: '',
    customUnit: '',
    customPhotoUrl: '',
    customPhotos: [] as string[],
    customPhotoName: '',
    customPreviewUrls: [] as string[],
    customUploading: false,
    assignedPhotoUrl: '',
    assignedPhotos: [] as string[],
    assignedPhotoName: '',
    assignedPreviewUrls: [] as string[],
    assignedUploading: false,
    items: [] as Array<{
      label: string
      unitNumber?: string
      duration?: string
      startTime?: string
      endTime?: string
      points?: number
      remark?: string
      photoUrl?: string
      photos?: string[]
      photoName?: string
      previewUrls?: string[]
      uploading?: boolean
    }>,
  })

  const [settingsForm, setSettingsForm] = useState<DailyActivityWorkflowSettings>(
    () => initialSettings || DEFAULT_DAILY_ACTIVITY_SETTINGS
  )

  const updateSectionHead = (key: string, employeeIdStr: string) => {
    const emp = employees.find((e) => String(e.id) === employeeIdStr)
    if (!emp) return
    setSettingsForm((prev: any) => ({
      ...prev,
      approvalMatrix: {
        ...prev.approvalMatrix,
        sectionHeads: {
          ...(prev.approvalMatrix?.sectionHeads || {}),
          [key]: { name: emp.name, email: emp.email || (prev.approvalMatrix?.sectionHeads as any)?.[key]?.email || '' },
        },
      },
    }))
  }

  const updateApproverField = (role: 'manager' | 'hr' | 'pjoTe', employeeIdStr: string) => {
    const emp = employees.find((e) => String(e.id) === employeeIdStr)
    if (!emp) return
    setSettingsForm((prev: any) => {
      if (role === 'manager') {
        return {
          ...prev,
          approvalMatrix: {
            ...prev.approvalMatrix,
            managerName: emp.name,
            managerEmail: emp.email || prev.approvalMatrix?.managerEmail,
          },
        }
      }
      if (role === 'hr') {
        return {
          ...prev,
          approvalMatrix: {
            ...prev.approvalMatrix,
            hrName: emp.name,
            hrEmail: emp.email || prev.approvalMatrix?.hrEmail,
          },
        }
      }
      return {
        ...prev,
        approvalMatrix: {
          ...prev.approvalMatrix,
          pjoTe: { name: emp.name, email: emp.email || (prev.approvalMatrix as any)?.pjoTe?.email || '' },
        },
      }
    })
  }

  const [previewTarget, setPreviewTarget] = useState<SessionApprovalRow | null>(null)
  const [previewTargetQrDataUrl, setPreviewTargetQrDataUrl] = useState<string | null>(null)
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)
  const [evidenceModalSessionId, setEvidenceModalSessionId] = useState<number | null>(null)

  // Zoom & Pan state for preview modal & batch viewer
  const [viewerZoom, setViewerZoom] = useState(1.0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ startX: number; startY: number; initialPanX: number; initialPanY: number } | null>(null)

  useEffect(() => {
    setViewerZoom(1.0)
    setPanOffset({ x: 0, y: 0 })
  }, [previewTarget?.sessionId])

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select') || target.closest('textarea')) {
      return
    }
    setIsDragging(true)
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.startX
    const dy = e.clientY - dragStartRef.current.startY
    setPanOffset({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    dragStartRef.current = null
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select') || target.closest('textarea')) {
      return
    }
    if (e.touches.length === 1) {
      setIsDragging(true)
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragStartRef.current || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - dragStartRef.current.startX
    const dy = e.touches[0].clientY - dragStartRef.current.startY
    setPanOffset({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    dragStartRef.current = null
  }

  const handleResetView = () => {
    setViewerZoom(1.0)
    setPanOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (!previewTarget?.sessionId) {
      setPreviewTargetQrDataUrl(null)
      return
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    QRCode.toDataURL(`${origin}/activity-evidence/${previewTarget.sessionId}`, {
      margin: 1,
      width: 140,
      errorCorrectionLevel: 'M',
    })
      .then((url) => setPreviewTargetQrDataUrl(url))
      .catch((err) => console.error('Failed to generate preview QR:', err))
  }, [previewTarget?.sessionId])

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBatchApproving, setIsBatchApproving] = useState(false)
  const [isSignatureWarningOpen, setIsSignatureWarningOpen] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [openDirectSignatureModal, setOpenDirectSignatureModal] = useState(false)
  const [hasRegisteredSignature, setHasRegisteredSignature] = useState(true)
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [expandedPickerGroups, setExpandedPickerGroups] = useState<Set<string>>(new Set())
  const [createError, setCreateError] = useState<string | null>(null)

  const handleOpenCreateModal = () => {
    setCreateError(null)
    const firstEmp = employees && employees.length > 0 ? employees[0] : null
    const matchedSite = firstEmp?.siteId ? sites.find((s) => s.id === firstEmp.siteId) : null
    setCreateForm({
      employeeId: String(firstEmp?.id || ''),
      employeeName: firstEmp?.name || '',
      employeeSn: firstEmp?.employeeId || '',
      jobTitle: firstEmp?.jobTitle || 'Staff',
      department: firstEmp?.department || '',
      section: firstEmp?.section || '',
      siteId: String(firstEmp?.siteId || ''),
      siteName: matchedSite?.name || '',
      customerName: '',
      workDate: new Date().toISOString().split('T')[0],
      shiftCode: 'ALL',
      leaderEmployeeId: '',
      leaderName: '',
      superiorEmployeeId: '',
      superiorName: '',
      managerEmployeeId: '',
      managerName: '',
      items: [],
      sourceMode: 'self_input',
      assignmentId: '',
      customName: '',
      customDescription: '',
      customUnit: '',
      customPhotoUrl: '',
      customPhotos: [],
      customPhotoName: '',
      customPreviewUrls: [],
      customUploading: false,
      assignedPhotoUrl: '',
      assignedPhotos: [],
      assignedPhotoName: '',
      assignedPreviewUrls: [],
      assignedUploading: false,
    } as any)
    setPickerSearch('')
    setExpandedPickerGroups(new Set())
    setCreateOpen(true)
  }

  useEffect(() => {
    getUserSignatureAction().then((res) => {
      if (res.success) {
        setHasRegisteredSignature(Boolean(res.hasSignature))
      }
    })
  }, [])

  // Filters State (as seen in Direktori Pengguna / User Management)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])

  const access = { canView: true, canEdit: true, canDelete: true }

  const departmentFilterOptions = useMemo(() => {
    const set = new Set<string>()
    ;(rows || []).forEach((r) => {
      if (r.department) set.add(r.department)
    })
    ;(employees || []).forEach((e) => {
      if (e.department) set.add(e.department)
    })
    return Array.from(set).filter(Boolean).sort()
  }, [rows, employees])

  const sectionFilterOptions = useMemo(() => {
    const set = new Set<string>()
    ;(rows || []).forEach((r) => {
      if (r.section) set.add(r.section)
    })
    ;(employees || []).forEach((e) => {
      if (e.section) set.add(e.section)
    })
    return Array.from(set).filter(Boolean).sort()
  }, [rows, employees])

  const statusFilterOptions = ['Approved', 'Pending / Submitted', 'Draft', 'Rejected']

  const siteFilterOptions = useMemo(() => {
    const set = new Set<string>()
    ;(rows || []).forEach((r) => {
      if (r.siteName) set.add(r.siteName)
    })
    ;(sites || []).forEach((s) => {
      if (s.name) set.add(s.name)
    })
    return Array.from(set).filter(Boolean).sort()
  }, [rows, sites])

  const shiftFilterOptions = ['ALL', 'DS', 'NS']

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDepartments.length > 0 ||
    selectedSections.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedSites.length > 0 ||
    selectedShifts.length > 0

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedDepartments([])
    setSelectedSections([])
    setSelectedStatuses([])
    setSelectedSites([])
    setSelectedShifts([])
  }

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return (rows || []).filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchSearch =
          (row.employeeName || '').toLowerCase().includes(q) ||
          (row.employeeSn || '').toLowerCase().includes(q) ||
          (row.sessionCode || '').toLowerCase().includes(q) ||
          (row.siteName || '').toLowerCase().includes(q) ||
          (row.shiftCode || '').toLowerCase().includes(q) ||
          (row.department || '').toLowerCase().includes(q) ||
          (row.section || '').toLowerCase().includes(q) ||
          (row.items || []).some((item: any) =>
            (item.activityName || item.snapshotLabel || item.label || item.remark || '').toLowerCase().includes(q)
          )
        if (!matchSearch) return false
      }

      if (selectedDepartments.length > 0) {
        if (!selectedDepartments.includes(row.department || '')) return false
      }

      if (selectedSections.length > 0) {
        if (!selectedSections.includes(row.section || '')) return false
      }

      if (selectedStatuses.length > 0) {
        const rowStatus = (row.sessionStatus || '').toLowerCase()
        const match = selectedStatuses.some((status) => {
          const s = status.toLowerCase()
          if (s.includes('approved')) return rowStatus === 'approved' || rowStatus === 'completed'
          if (s.includes('pending') || s.includes('submitted')) return rowStatus.includes('pending') || rowStatus.includes('submitted')
          if (s.includes('draft')) return rowStatus === 'draft'
          if (s.includes('rejected')) return rowStatus === 'rejected'
          return rowStatus === s
        })
        if (!match) return false
      }

      if (selectedSites.length > 0) {
        if (!selectedSites.includes(row.siteName || '')) return false
      }

      if (selectedShifts.length > 0) {
        if (!selectedShifts.includes(row.shiftCode || '')) return false
      }

      return true
    })
  }, [
    rows,
    searchQuery,
    selectedDepartments,
    selectedSections,
    selectedStatuses,
    selectedSites,
    selectedShifts,
  ])

  const approvedRows = (rows || []).filter(
    (r) =>
      (r.sessionStatus || '').toLowerCase() === 'approved' ||
      (r.sessionStatus || '').toLowerCase() === 'completed' ||
      (r.approvals && r.approvals.length > 0 && r.approvals.every((a) => a.status === 'approved'))
  )

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRows.map((r) => r.sessionId))
    }
  }

  const toggleSelectRow = (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    )
  }

  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false)
  const [batchReviewIndex, setBatchReviewIndex] = useState(0)
  const [isBatchActionRunning, setIsBatchActionRunning] = useState(false)
  const [approvalRemarks, setApprovalRemarks] = useState<Record<number, string>>({})

  const isRowReviewableByCurrentUser = (row: SessionApprovalRow) => {
    const status = (row.sessionStatus || '').toLowerCase()
    // Dokumen selesai, ditolak, atau draft/revisi tidak bisa direview oleh approver
    if (['approved', 'completed', 'closed', 'rejected', 'draft', 'returned', 'reverted', 'needs_revision'].includes(status)) {
      return false
    }

    const approvals = Array.isArray(row.approvals) ? row.approvals : []
    const activeStep = approvals.find((a) => (a.status || '').toLowerCase() === 'pending')
    if (!activeStep) return false

    const currentEmpId = currentEmployeeId ? Number(currentEmployeeId) : null
    const currentEmpEmail = (currentEmployeeEmail || '').toLowerCase().trim()
    const currentEmpName = (currentEmployeeName || '').toLowerCase().trim()

    const matchesId = currentEmpId != null && activeStep.approverEmployeeId != null && Number(activeStep.approverEmployeeId) === currentEmpId
    const matchesEmail = Boolean(currentEmpEmail) && Boolean(activeStep.approverEmail) && activeStep.approverEmail.toLowerCase().trim() === currentEmpEmail
    const matchesName = Boolean(currentEmpName) && Boolean(activeStep.approverName) && activeStep.approverName.toLowerCase().trim() === currentEmpName

    return Boolean(matchesId || matchesEmail || matchesName)
  }

  const selectedBatchRows = useMemo(
    () => (rows || []).filter((r) => selectedIds.includes(r.sessionId)),
    [rows, selectedIds]
  )
  const currentBatchDoc = selectedBatchRows[batchReviewIndex] || selectedBatchRows[0] || null

  const canBatchReview = useMemo(
    () =>
      selectedBatchRows.length > 0 &&
      selectedBatchRows.every((row) => isRowReviewableByCurrentUser(row)),
    [selectedBatchRows, currentEmployeeId, currentEmployeeEmail, currentEmployeeName]
  )

  const handleOpenBatchReview = () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu aktivitas untuk direview')
      return
    }
    if (!canBatchReview) {
      toast.error('Tombol review hanya aktif jika semua dokumen yang dipilih sedang menunggu giliran tanda tangan Anda.')
      return
    }
    if (!hasRegisteredSignature) {
      setIsSignatureWarningOpen(true)
      return
    }
    setBatchReviewIndex(0)
    setIsBatchReviewOpen(true)
  }

  const handleSingleApproveCurrent = async () => {
    if (!currentBatchDoc) return
    setIsBatchActionRunning(true)
    try {
      const sessId = currentBatchDoc.sessionId
      const sessCode = currentBatchDoc.sessionCode
      const currentRemark = approvalRemarks[sessId] || ''
      const res = await singleApproveDailyActivityAction(sessId, currentRemark)
      if (res.success) {
        toast.success(`Dokumen ${sessCode} berhasil disetujui.`)
        const remainingIds = selectedIds.filter((id) => id !== sessId)
        setSelectedIds(remainingIds)
        const remainingRows = selectedBatchRows.filter((r) => r.sessionId !== sessId)
        if (remainingRows.length > 0) {
          const nextIndex = Math.min(batchReviewIndex, remainingRows.length - 1)
          setBatchReviewIndex(Math.max(0, nextIndex))
          setIsBatchReviewOpen(true)
          router.refresh()
        } else {
          toast.success('Semua dokumen dalam antrian telah selesai direview.')
          setIsBatchReviewOpen(false)
          setSelectedIds([])
          router.refresh()
        }
      } else if ((res as any).needsSignatureRegistration) {
        setIsSignatureWarningOpen(true)
      } else {
        toast.error(res.error || 'Gagal menyetujui dokumen.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleSingleRevertCurrent = async () => {
    if (!currentBatchDoc) return
    const sessId = currentBatchDoc.sessionId
    const sessCode = currentBatchDoc.sessionCode
    const customRemark = approvalRemarks[sessId] || prompt('Masukkan alasan pengembalian dokumen (revert) untuk revisi:')
    if (customRemark === null) return
    setIsBatchActionRunning(true)
    try {
      const res = await singleRevertDailyActivityAction(sessId, customRemark || 'Dokumen dikembalikan untuk revisi.')
      if (res.success) {
        toast.success(`Dokumen ${sessCode} dikembalikan.`)
        const remainingIds = selectedIds.filter((id) => id !== sessId)
        setSelectedIds(remainingIds)
        const remainingRows = selectedBatchRows.filter((r) => r.sessionId !== sessId)
        if (remainingRows.length > 0) {
          const nextIndex = Math.min(batchReviewIndex, remainingRows.length - 1)
          setBatchReviewIndex(Math.max(0, nextIndex))
          setIsBatchReviewOpen(true)
          router.refresh()
        } else {
          toast.success('Semua dokumen dalam antrian telah selesai direview.')
          setIsBatchReviewOpen(false)
          setSelectedIds([])
          router.refresh()
        }
      } else {
        toast.error(res.error || 'Gagal mengembalikan dokumen.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleSingleRejectCurrent = async () => {
    if (!currentBatchDoc) return
    const sessId = currentBatchDoc.sessionId
    const sessCode = currentBatchDoc.sessionCode
    const customRemark = approvalRemarks[sessId] || prompt('Masukkan alasan penolakan dokumen (reject):')
    if (customRemark === null) return
    setIsBatchActionRunning(true)
    try {
      const res = await singleRejectDailyActivityAction(sessId, customRemark || 'Dokumen ditolak.')
      if (res.success) {
        toast.success(`Dokumen ${sessCode} ditolak.`)
        const remainingIds = selectedIds.filter((id) => id !== sessId)
        setSelectedIds(remainingIds)
        const remainingRows = selectedBatchRows.filter((r) => r.sessionId !== sessId)
        if (remainingRows.length > 0) {
          const nextIndex = Math.min(batchReviewIndex, remainingRows.length - 1)
          setBatchReviewIndex(Math.max(0, nextIndex))
          setIsBatchReviewOpen(true)
          router.refresh()
        } else {
          toast.success('Semua dokumen dalam antrian telah selesai direview.')
          setIsBatchReviewOpen(false)
          setSelectedIds([])
          router.refresh()
        }
      } else {
        toast.error(res.error || 'Gagal menolak dokumen.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleBatchApproveAll = async () => {
    if (selectedIds.length === 0) return
    setIsBatchActionRunning(true)
    try {
      const currentRemark = approvalRemarks[currentBatchDoc?.sessionId || 0] || ''
      const res = await batchApproveDailyActivitySessionsAction(selectedIds, currentRemark)
      if (res.success) {
        toast.success(`${res.approvedCount} aktivitas berhasil disetujui!`)
        setIsBatchReviewOpen(false)
        setSelectedIds([])
        router.refresh()
      } else if (res.needsSignatureRegistration) {
        setIsSignatureWarningOpen(true)
      } else {
        toast.error(res.error || 'Gagal melakukan approve all.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleBatchRevertAll = async () => {
    if (selectedIds.length === 0) return
    setIsBatchActionRunning(true)
    try {
      const res = await batchRevertDailyActivitySessionsAction(selectedIds)
      if (res.success) {
        toast.success(`${res.revertedCount} aktivitas berhasil dikembalikan!`)
        setIsBatchReviewOpen(false)
        setSelectedIds([])
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal melakukan revert all.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleBatchRejectAll = async () => {
    if (selectedIds.length === 0) return
    setIsBatchActionRunning(true)
    try {
      const res = await batchRejectDailyActivitySessionsAction(selectedIds)
      if (res.success) {
        toast.success(`${res.rejectedCount} aktivitas berhasil ditolak!`)
        setIsBatchReviewOpen(false)
        setSelectedIds([])
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal melakukan reject all.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleProceedToRegisterSignature = () => {
    setIsSignatureWarningOpen(false)
    setOpenDirectSignatureModal(true)
  }

  const handleSignatureSaved = async () => {
    setOpenDirectSignatureModal(false)
    if (selectedIds.length > 0) {
      setBatchReviewIndex(0)
      setIsBatchReviewOpen(true)
    }
  }

  const employeeOptions = (employees || []).map((emp) => ({
    value: String(emp?.id || ''),
    label: `${emp?.name || 'Employee'} — ${emp?.jobTitle || emp?.department || 'Staff'} (${emp?.employeeId || emp?.id || '-'})`,
  }))

  const addItemRow = () => {
    setCreateForm((p) => ({
      ...p,
      items: [...p.items, { label: '', unitNumber: '', duration: '60m', points: 5, remark: '' }],
    }))
  }

  const removeItemRow = (idx: number) => {
    setCreateForm((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx),
    }))
  }

  const updateItemRow = (idx: number, field: string, val: any) => {
    setCreateForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [field]: val } : it)),
    }))
  }

  const addPresetActivity = (name: string, points = 5) => {
    setCreateForm((p) => ({
      ...p,
      items: [...p.items, { label: name, unitNumber: '', duration: '60m', points, remark: '' }],
    }))
  }

  useEffect(() => {
    if (createOpen && !createForm.employeeId && employees && employees.length > 0) {
      const firstEmp = employees[0]
      if (firstEmp) {
        const site = sites.find((s) => s.id === firstEmp.siteId)
        const defLeader = firstEmp.directManagerId ? employees.find((e) => e.id === firstEmp.directManagerId) : null
        const defSectionHeadId = firstEmp.sectionId ? sectionHeadMap[String(firstEmp.sectionId)] : null
        const defSectionHead = defSectionHeadId ? employees.find((e) => e.id === defSectionHeadId) : null
        const defManagerId = firstEmp.departmentId ? deptHeadMap[String(firstEmp.departmentId)] : null
        const defManager = defManagerId ? employees.find((e) => e.id === defManagerId) : null

        setCreateForm((p) => ({
          ...p,
          employeeId: String(firstEmp.id),
          employeeName: firstEmp.name,
          employeeSn: firstEmp.employeeId || '',
          jobTitle: firstEmp.jobTitle || '',
          department: firstEmp.department || '',
          section: firstEmp.section || '',
          siteId: firstEmp.siteId ? String(firstEmp.siteId) : (sites[0]?.id ? String(sites[0].id) : p.siteId),
          siteName: site?.name || sites[0]?.name || p.siteName,
          leaderEmployeeId: defLeader ? String(defLeader.id) : p.leaderEmployeeId,
          leaderName: defLeader?.name || p.leaderName,
          superiorEmployeeId: defSectionHead ? String(defSectionHead.id) : p.superiorEmployeeId,
          superiorName: defSectionHead?.name || p.superiorName,
          managerEmployeeId: defManager ? String(defManager.id) : p.managerEmployeeId,
          managerName: defManager?.name || p.managerName,
        }))
      }
    }
  }, [createOpen, employees, sites, sectionHeadMap, deptHeadMap, createForm.employeeId])

  const filteredModalEmployees = useMemo(() => {
    let list = employees
    if (createForm.siteId) {
      list = list.filter((e) => !e.siteId || String(e.siteId) === createForm.siteId)
    }
    if (!teamMemberSearchQuery) return list
    const q = teamMemberSearchQuery.toLowerCase()
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(q))
    )
  }, [employees, createForm.siteId, teamMemberSearchQuery])

  const normalizedPickerSearch = useMemo(() => {
    return (pickerSearch || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  }, [pickerSearch])

  const availableLibraryMap = useMemo(() => {
    const map = new Map<string, (typeof activityPresets)[0]>()
    for (const p of activityPresets || []) {
      map.set(String(p.id), p)
      if (p.code) map.set(p.code.toLowerCase(), p)
    }
    return map
  }, [activityPresets])

  const groupedLibraryIdSet = useMemo(() => {
    const set = new Set<string>()
    for (const folder of routeFolders || []) {
      for (const group of folder.groups || []) {
        for (const item of group.items || []) {
          if (item.libraryActivityId != null) {
            set.add(String(item.libraryActivityId))
          }
        }
      }
    }
    return set
  }, [routeFolders])

  const matchingRouteFolders = useMemo(() => {
    return (routeFolders || [])
      .map((route) => {
        const matchingGroups = (route.groups || [])
          .map((group) => {
            const matchingItems = (group.items || [])
              .map((i) => (i.libraryActivityId != null ? availableLibraryMap.get(String(i.libraryActivityId)) : null))
              .filter((lib): lib is (typeof activityPresets)[0] => Boolean(lib))
              .filter((lib) => {
                if (!normalizedPickerSearch) return true
                const nCode = (lib.code || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                const nName = (lib.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                return nCode.includes(normalizedPickerSearch) || nName.includes(normalizedPickerSearch)
              })
            return { ...group, matchingItems }
          })
          .filter((group) => (normalizedPickerSearch ? group.matchingItems.length > 0 : true))

        return { ...route, matchingGroups }
      })
      .filter((route) => route.matchingGroups.length > 0)
  }, [routeFolders, availableLibraryMap, normalizedPickerSearch])

  const standaloneLibraries = useMemo(() => {
    const presets = activityPresets || []
    return presets
      .filter((p) => !groupedLibraryIdSet.has(String(p.id)))
      .filter((p) => {
        if (!normalizedPickerSearch) return true
        const nCode = (p.code || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const nName = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        return nCode.includes(normalizedPickerSearch) || nName.includes(normalizedPickerSearch)
      })
      .sort((a, b) => (b.basePoints || 0) - (a.basePoints || 0))
  }, [activityPresets, groupedLibraryIdSet, normalizedPickerSearch])

  const totalVisibleLibraryCount = useMemo(() => {
    const groupCount = matchingRouteFolders.reduce(
      (sum, r) => sum + r.matchingGroups.reduce((gSum, g) => gSum + g.matchingItems.length, 0),
      0
    )
    return groupCount + standaloneLibraries.length
  }, [matchingRouteFolders, standaloneLibraries])

  const toggleGroupItems = (items: typeof activityPresets) => {
    const isAllSelected = items.every((sub) =>
      (createForm.items || []).some(
        (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
      )
    )

    if (isAllSelected) {
      setCreateForm((p) => ({
        ...p,
        items: p.items.filter(
          (i) => !items.some((sub) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name))
        ),
      }))
    } else {
      const missing = items.filter(
        (sub) => !(createForm.items || []).some(
          (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
        )
      )
      setCreateForm((p) => ({
        ...p,
        items: [
          ...p.items,
          ...missing.map((sub) => ({
            label: `${sub.code} - ${sub.name}`,
            unitNumber: '',
            duration: '60m',
            points: sub.basePoints || 5,
            remark: '',
          })),
        ],
      }))
    }
  }

  const handleItemPhotoSelect = async (idx: number, files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    const previewUrls = fileArray.map((f) => URL.createObjectURL(f))
    const names = fileArray.map((f) => f.name).join(', ')

    updateItemRow(idx, 'previewUrls', previewUrls)
    updateItemRow(idx, 'photoName', names)
    updateItemRow(idx, 'uploading', true)

    try {
      toast.loading('Mengunggah foto evidence...', { id: `upload-${idx}` })
      const urls = await Promise.all(fileArray.map(uploadActivityPhoto))
      updateItemRow(idx, 'photos', urls)
      updateItemRow(idx, 'photoUrl', urls[0] || '')
      updateItemRow(idx, 'uploading', false)
      toast.success('Foto evidence berhasil diunggah!', { id: `upload-${idx}` })
    } catch (err: any) {
      updateItemRow(idx, 'uploading', false)
      toast.error(err?.message || 'Gagal mengunggah foto evidence', { id: `upload-${idx}` })
    }
  }

  const handleItemPhotoRemove = (idx: number) => {
    setCreateForm((p) => ({
      ...p,
      items: p.items.map((it, i) =>
        i === idx
          ? {
              ...it,
              photos: [],
              photoUrl: '',
              photoName: '',
              previewUrls: [],
              uploading: false,
            }
          : it
      ),
    }))
  }

  const handleCustomPhotoSelect = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    const previewUrls = fileArray.map((f) => URL.createObjectURL(f))
    const names = fileArray.map((f) => f.name).join(', ')

    setCreateForm((p) => ({
      ...p,
      customPreviewUrls: previewUrls,
      customPhotoName: names,
      customUploading: true,
    }))

    try {
      toast.loading('Mengunggah foto evidence...', { id: 'upload-custom' })
      const urls = await Promise.all(fileArray.map(uploadActivityPhoto))
      setCreateForm((p) => ({
        ...p,
        customPhotos: urls,
        customPhotoUrl: urls[0] || '',
        customUploading: false,
      }))
      toast.success('Foto evidence berhasil diunggah!', { id: 'upload-custom' })
    } catch (err: any) {
      setCreateForm((p) => ({
        ...p,
        customUploading: false,
      }))
      toast.error(err?.message || 'Gagal mengunggah foto evidence', { id: 'upload-custom' })
    }
  }

  const handleCustomPhotoRemove = () => {
    setCreateForm((p) => ({
      ...p,
      customPhotos: [],
      customPhotoUrl: '',
      customPhotoName: '',
      customPreviewUrls: [],
      customUploading: false,
    }))
  }

  const handleAssignedPhotoSelect = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    const previewUrls = fileArray.map((f) => URL.createObjectURL(f))
    const names = fileArray.map((f) => f.name).join(', ')

    setCreateForm((p) => ({
      ...p,
      assignedPreviewUrls: previewUrls,
      assignedPhotoName: names,
      assignedUploading: true,
    }))

    try {
      toast.loading('Mengunggah foto evidence...', { id: 'upload-assigned' })
      const urls = await Promise.all(fileArray.map(uploadActivityPhoto))
      setCreateForm((p) => ({
        ...p,
        assignedPhotos: urls,
        assignedPhotoUrl: urls[0] || '',
        assignedUploading: false,
      }))
      toast.success('Foto evidence berhasil diunggah!', { id: 'upload-assigned' })
    } catch (err: any) {
      setCreateForm((p) => ({
        ...p,
        assignedUploading: false,
      }))
      toast.error(err?.message || 'Gagal mengunggah foto evidence', { id: 'upload-assigned' })
    }
  }

  const handleAssignedPhotoRemove = () => {
    setCreateForm((p) => ({
      ...p,
      assignedPhotos: [],
      assignedPhotoUrl: '',
      assignedPhotoName: '',
      assignedPreviewUrls: [],
      assignedUploading: false,
    }))
  }

  const handleCreateSession = async () => {
    setCreateError(null)
    if (!createForm.employeeId) {
      const msg = 'Pilih karyawan terlebih dahulu di bagian atas formulir'
      setCreateError(msg)
      toast.error(msg, { duration: 5000 })
      return
    }

    let validItems: Array<{
      label: string
      unitNumber?: string
      remark?: string
      duration?: string
      points?: number
      photoUrl?: string | null
      photos?: string[]
      startedAt?: string | Date
      endedAt?: string | Date
    }> = []

    if (createForm.sourceMode === 'custom') {
      if (!createForm.customName?.trim()) {
        const msg = 'Isi nama Custom Activity terlebih dahulu'
        setCreateError(msg)
        toast.error(msg, { duration: 5000 })
        return
      }
      if (!createForm.customPhotoUrl?.trim() && (!createForm.customPhotos || createForm.customPhotos.length === 0)) {
        const msg = 'Photo Evidence untuk Custom Activity wajib diunggah!'
        setCreateError(msg)
        toast.error(msg, { duration: 5000 })
        return
      }
      validItems = [
        {
          label: createForm.customName.trim(),
          unitNumber: createForm.customUnit?.trim() || '-',
          remark: createForm.customDescription?.trim() || createForm.customName.trim(),
          duration: '60m',
          points: 10,
          photoUrl: createForm.customPhotoUrl || null,
          photos: createForm.customPhotos || (createForm.customPhotoUrl ? [createForm.customPhotoUrl] : []),
        },
      ]
    } else if (createForm.sourceMode === 'assigned') {
      if (!createForm.assignmentId) {
        const msg = 'Pilih Assignment terlebih dahulu'
        setCreateError(msg)
        toast.error(msg, { duration: 5000 })
        return
      }
      if (!createForm.assignedPhotoUrl?.trim() && (!createForm.assignedPhotos || createForm.assignedPhotos.length === 0)) {
        const msg = 'Photo Evidence untuk Assigned Activity wajib diunggah!'
        setCreateError(msg)
        toast.error(msg, { duration: 5000 })
        return
      }
      validItems = [
        {
          label: `Assignment #${createForm.assignmentId}`,
          unitNumber: '-',
          remark: 'Penugasan resmi',
          duration: '60m',
          points: 10,
          photoUrl: createForm.assignedPhotoUrl || null,
          photos: createForm.assignedPhotos || (createForm.assignedPhotoUrl ? [createForm.assignedPhotoUrl] : []),
        },
      ]
    } else {
      validItems = (createForm.items || [])
        .filter((it) => it.label && it.label.trim().length > 0)
        .map((it) => ({
          label: it.label.trim(),
          unitNumber: it.unitNumber?.trim() || '-',
          remark: it.remark?.trim() || it.label.trim(),
          duration: it.duration || '60m',
          points: it.points || 5,
          photoUrl: it.photoUrl || (it.photos && it.photos[0]) || null,
          photos: it.photos || (it.photoUrl ? [it.photoUrl] : []),
        }))
    }

    if (validItems.length === 0) {
      const msg =
        createForm.sourceMode === 'custom'
          ? 'Isi nama Custom Activity terlebih dahulu'
          : 'Buka Kamus Aktivitas dan pilih minimal 1 item aktivitas'
      setCreateError(msg)
      toast.error(msg, { duration: 5000 })
      return
    }

    for (let idx = 0; idx < validItems.length; idx++) {
      const it = validItems[idx]
      const hasPhoto = Boolean((it.photoUrl && it.photoUrl.trim().length > 0) || (it.photos && it.photos.length > 0))
      if (!hasPhoto) {
        const itemLabel = it.label || 'Aktivitas'
        const msg =
          validItems.length === 1
            ? `Photo Evidence untuk "${itemLabel}" wajib diunggah!`
            : `Photo Evidence pada item #${idx + 1} (${itemLabel}) wajib diunggah!`
        setCreateError(msg)
        toast.error(msg, { duration: 5000 })
        return
      }
    }
    setIsCreating(true)
    try {
      const res = await createDailyActivitySessionAction({
        employeeId: Number(createForm.employeeId),
        workDate: createForm.workDate,
        shiftCode: createForm.shiftCode,
        siteId: createForm.siteId ? Number(createForm.siteId) : undefined,
        leaderEmployeeId: createForm.leaderEmployeeId ? Number(createForm.leaderEmployeeId) : undefined,
        leaderName: createForm.leaderName || undefined,
        superiorEmployeeId: createForm.superiorEmployeeId ? Number(createForm.superiorEmployeeId) : undefined,
        superiorName: createForm.superiorName || undefined,
        managerEmployeeId: createForm.managerEmployeeId ? Number(createForm.managerEmployeeId) : undefined,
        managerName: createForm.managerName || undefined,
        teamMemberEmployeeIds: isTeamLog ? selectedTeamMemberIds : [],
        customerName: createForm.customerName?.trim() || undefined,
        notes: createForm.customerName ? `Customer: ${createForm.customerName.trim()}` : undefined,
        items: validItems,
      })
      if (res.success && res.sessionId) {
        const emp = employees.find((e) => String(e.id) === createForm.employeeId)
        const st = sites.find((s) => String(s.id) === createForm.siteId)
        const teamMembersSummary =
          isTeamLog && selectedTeamMemberIds.length > 0
            ? employees
                .filter((e) => selectedTeamMemberIds.includes(e.id))
                .map((e) => e.name)
                .join(', ')
            : undefined

        const newRow: SessionApprovalRow = {
          sessionId: res.sessionId,
          sessionCode: `DAS-${createForm.workDate.replace(/-/g, '')}-${emp?.employeeId || createForm.employeeId}-${Math.floor(100 + Math.random() * 900)}`,
          workDate: createForm.workDate,
          shiftCode: createForm.shiftCode,
          sessionStatus: 'submitted',
          employeeName: createForm.employeeName || emp?.name || 'Karyawan',
          employeeSn: createForm.employeeSn || emp?.employeeId || '-',
          department: createForm.department || emp?.department || 'Operasional',
          section: createForm.section || emp?.section || '-',
          jobTitle: createForm.jobTitle || emp?.jobTitle || 'Teknisi',
          siteName: createForm.siteName || st?.name || 'Central Site',
          teamMembersSummary,
          totalItems: validItems.length,
          totalPoints: validItems.reduce((acc, item) => acc + (item.points || 0), 0),
          items: validItems.map((item, index) => ({
            id: index + 1,
            label: item.label,
            unitNumber: item.unitNumber || '-',
            duration: item.duration || '60m',
            points: item.points || 5,
            remark: item.remark || '-',
          })),
          approvals: [
            { stepOrder: 1, stepLabel: 'Karyawan Sign', approverRole: 'employee', status: 'pending', approverName: createForm.employeeName || emp?.name || 'Karyawan', signatureDataUrl: null, signedAt: null },
            { stepOrder: 2, stepLabel: 'Leader / PJO', approverRole: 'leader', status: 'waiting', approverName: createForm.leaderName || 'Leader', signatureDataUrl: null, signedAt: null },
          ],
        }
        setRows((prev) => [newRow, ...prev])
        toast.success('Sesi Daily Activity berhasil disimpan!')
        setCreateError(null)
        setCreateForm({
          employeeId: '',
          employeeName: '',
          employeeSn: '',
          jobTitle: '',
          department: '',
          section: '',
          workDate: new Date().toISOString().split('T')[0],
          shiftCode: 'ALL',
          siteId: '',
          siteName: '',
          customerName: '',
          leaderEmployeeId: '',
          leaderName: '',
          superiorEmployeeId: '',
          superiorName: '',
          managerEmployeeId: '',
          managerName: '',
          sourceMode: 'self_input',
          assignmentId: '',
          customName: '',
          customDescription: '',
          customUnit: '',
          customPhotoUrl: '',
          customPhotos: [],
          customPhotoName: '',
          customPreviewUrls: [],
          customUploading: false,
          assignedPhotoUrl: '',
          assignedPhotos: [],
          assignedPhotoName: '',
          assignedPreviewUrls: [],
          assignedUploading: false,
          items: [],
        })
        setIsTeamLog(false)
        setSelectedTeamMemberIds([])
        setTeamMemberSearchQuery('')
        setCreateOpen(false)
        router.refresh()
      } else {
        const msg = res.error || 'Gagal membuat sesi aktivitas'
        setCreateError(msg)
        toast.error(msg, { duration: 5000 })
      }
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat membuat sesi aktivitas'
      setCreateError(msg)
      toast.error(msg, { duration: 5000 })
    } finally {
      setIsCreating(false)
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<SessionApprovalRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await deleteDailyActivitySessionAction(deleteTarget.sessionId)
      if (res.success) {
        toast.success('Sesi Daily Activity berhasil dihapus')
        setRows((prev) => prev.filter((r) => r.sessionId !== deleteTarget.sessionId))
        setDeleteTarget(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menghapus sesi.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menghapus sesi.')
    } finally {
      setIsDeleting(false)
    }
  }

  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    setIsBatchDeleting(true)
    try {
      const res = await deleteBatchDailyActivitySessionsAction(selectedIds)
      if (res.success) {
        toast.success(`${res.deletedCount ?? selectedIds.length} sesi Daily Activity berhasil dihapus`)
        setRows((prev) => prev.filter((r) => !selectedIds.includes(r.sessionId)))
        setSelectedIds([])
        setIsBatchDeleteModalOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menghapus sesi batch.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menghapus sesi batch.')
    } finally {
      setIsBatchDeleting(false)
    }
  }

  const handleTestApproval = async () => {
    setIsTestRunning(true)
    try {
      const result = await generateTestDailyActivityApproval()
      if (result.success && result.data) {
        setTestLinks(result.data.links)
        toast.success(result.message || 'Test approval session berhasil dibuat!')
        router.refresh()
      } else {
        toast.error(result.message || result.error || 'Gagal membuat test approval')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat membuat test approval')
    } finally {
      setIsTestRunning(false)
    }
  }

  const handleSendReminders = async () => {
    setIsReminderRunning(true)
    try {
      const result = await sendDueDailyActivityReminders()
      if (result.success) {
        toast.success(`Reminder approval terkirim: ${result.sent}, dilewati: ${result.skipped}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Gagal mengirim reminder approval')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mengirim reminder approval')
    } finally {
      setIsReminderRunning(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      const result = await saveDailyActivityWorkflowSettings(settingsForm)
      if (result.success) {
        toast.success('Daily Activity settings saved')
        setIsSettingsOpen(false)
      } else {
        toast.error(result.error || 'Failed to save settings')
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengaturan workflow')
    }
  }

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const handleDownloadActivityPdf = async (row: SessionApprovalRow) => {
    setIsDownloadingPdf(true)
    toast.loading('Menyiapkan file PDF...', { id: 'act-pdf-dl' })
    try {
      if (row.sessionId) {
        try {
          const res = await fetch(`/api/activity-sessions/${row.sessionId}/pdf`)
          if (res.ok) {
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `DailyActivity_${row.sessionCode.replace(/[\/\\]/g, '_')}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            toast.success('PDF berhasil diunduh!', { id: 'act-pdf-dl' })
            return
          }
        } catch (apiErr) {
          console.warn('API PDF download failed, falling back to DOM rendering:', apiErr)
        }
      }

      const batchEl = document.getElementById('batch-activity-preview-sheet')
      const previewEl = document.getElementById('activity-preview-sheet')
      const targetEl = (batchEl && currentBatchDoc?.sessionId === row.sessionId) ? batchEl : (previewEl && previewTarget?.sessionId === row.sessionId ? previewEl : null)
      if (targetEl) {
        await downloadElementAsPdf(targetEl, `DailyActivity_${row.sessionCode.replace(/[\/\\]/g, '_')}.pdf`)
        toast.success('PDF berhasil diunduh!', { id: 'act-pdf-dl' })
      } else {
        const contentHtml = `
          <h1 class="text-center font-bold" style="font-size: 11pt; margin-bottom: 2px; text-transform: uppercase;">PT. CHITRA PARATAMA</h1>
          <h2 class="text-center font-bold" style="font-size: 12pt; margin-bottom: 12px; text-transform: uppercase;">DAILY ACTIVITY APPROVAL REPORT</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
            <tbody>
              <tr><td colspan="4" style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Details & Employee Profile</td></tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">Kode Sesi Dokumen</td>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-family: monospace; font-weight: bold;">${row.sessionCode}</td>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">Tanggal Aktivitas</td>
                <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold;">${formatDate(row.workDate)}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Nama Karyawan</td>
                <td style="border: 1px solid black; padding: 3px 5px;">${row.employeeName} (${row.employeeSn})</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Shift Kerja</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.shiftCode}</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Site / Lokasi</td>
                <td style="border: 1px solid black; padding: 3px 5px;">${row.siteName || '—'}</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Status Approval</td>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; text-transform: uppercase; color: #065f46;">${row.sessionStatus}</td>
              </tr>
              ${row.teamMembersSummary ? `
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Anggota Tim</td>
                <td colspan="3" style="border: 1px solid black; padding: 3px 5px; font-weight: 600; color: #1e3a8a;">${row.teamMembersSummary}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <div style="font-weight: bold; margin-bottom: 0.25rem;">A. Daftar Approval Step</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
            <thead>
              <tr style="background: #f8fafc; font-weight: bold; text-align: center;">
                <th style="border: 1px solid black; padding: 3px 5px; width: 6%;">#</th>
                <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 26%;">Tahap Approval</th>
                <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 26%;">Approver</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 14%;">Status</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 14%;">Waktu</th>
                <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 14%;">Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${row.approvals.map((step) => `
                <tr>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${step.stepOrder}</td>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-weight: 500;">${step.stepLabel}</td>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: left;">${step.approverName || '—'}</td>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: center; text-transform: capitalize; font-weight: bold;">${step.stepOrder === 1 && step.status === 'approved' ? 'Signed (Diajukan)' : step.status}</td>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: center; font-size: 7pt; font-family: monospace;">${formatTimestamp(step.signedAt)}</td>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-size: 7.5pt; font-style: italic;">${step.remarks || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="font-weight: bold; margin-bottom: 0.25rem;">B. Signatories</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center;">
            <thead>
              <tr style="background: #f8fafc; font-weight: bold;">
                <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Pemohon / Karyawan</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Leader / PJO</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Customer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                  <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                    ${(row.approvals || []).find(a => a.stepOrder === 1)?.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">Menunggu TTD</span>'}
                  </div>
                  <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                    <p style="font-weight: bold; font-size: 8pt;">${(row.approvals || []).find(a => a.stepOrder === 1)?.approverName || row.employeeName || '—'}</p>
                    <p style="font-size: 7pt; color: #64748b;">${formatTimestamp((row.approvals || []).find(a => a.stepOrder === 1)?.signedAt)}</p>
                  </div>
                </td>
                <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                  <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                    ${(row.approvals || []).find(a => a.stepOrder === 2)?.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">Menunggu TTD</span>'}
                  </div>
                  <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                    <p style="font-weight: bold; font-size: 8pt;">${(row.approvals || []).find(a => a.stepOrder === 2)?.approverName || 'Leader Lapangan'}</p>
                    <p style="font-size: 7pt; color: #64748b;">${formatTimestamp((row.approvals || []).find(a => a.stepOrder === 2)?.signedAt)}</p>
                  </div>
                </td>
                <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                  <div style="font-size: 7.5pt; color: #94a3b8; font-style: italic; margin-bottom: 8px;">
                    Tanda Tangan Basah
                  </div>
                  <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                    <p style="font-weight: bold; font-size: 8pt;">&nbsp;</p>
                    <p style="font-size: 7pt; color: #64748b;">Customer</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: right; font-size: 7pt; color: #64748b; margin-top: 8px;">
            F.HC.DAR.001.01 • PT Chitra Paratama
          </div>
        `
        await downloadHtmlAsPdf(contentHtml, `DailyActivity_${row.sessionCode.replace(/[\/\\]/g, '_')}.pdf`)
        toast.success('PDF berhasil diunduh!', { id: 'act-pdf-dl' })
      }
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh PDF', { id: 'act-pdf-dl' })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleDownloadSelectedExcel = () => {
    if (selectedIds.length === 0) return
    const selectedRows = filteredRows.filter((r) => selectedIds.includes(r.sessionId))
    if (selectedRows.length === 0) return

    const data = selectedRows.map((row, idx) => ({
      'No': idx + 1,
      'Kode Sesi': row.sessionCode,
      'Nama Karyawan': row.employeeName,
      'SN Karyawan': row.employeeSn,
      'Tanggal Kerja': row.workDate ? new Date(row.workDate).toLocaleDateString('id-ID') : '—',
      'Shift': row.shiftCode,
      'Site / Lokasi': row.siteName || '—',
      'Total Poin': row.totalPoints ?? 0,
      'Status Sesi': (row as any).sessionStatus || (row as any).status || '—',
      'Status Approval': (row as any).approvalStatus || (row as any).status || '—',
      'Approver Terakhir': (row as any).currentApproverName || (row as any).firstApproverName || '—',
      'Tanggal Submit': (row as any).submittedAt ? formatTimestamp((row as any).submittedAt) : '—',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Activity Terpilih')
    XLSX.writeFile(wb, `Daily_Activity_Selected_${selectedRows.length}_items_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Berhasil mengunduh Excel untuk ${selectedRows.length} aktivitas terpilih!`)
  }

  const getActivityPdfBlob = async (row: SessionApprovalRow): Promise<{ name: string; blob: Blob }> => {
    const fileName = `DailyActivity_${row.sessionCode.replace(/[\/\\]/g, '_')}.pdf`
    const batchEl = document.getElementById('batch-activity-preview-sheet')
    const previewEl = document.getElementById('activity-preview-sheet')
    const targetEl = (batchEl && currentBatchDoc?.sessionId === row.sessionId) ? batchEl : (previewEl && previewTarget?.sessionId === row.sessionId ? previewEl : null)
    if (targetEl) {
      const blob = await generateElementAsPdfBlob(targetEl)
      return { name: fileName, blob }
    } else {
      const contentHtml = `
        <h1 class="text-center font-bold" style="font-size: 11pt; margin-bottom: 2px;">DAILY ACTIVITY REPORT</h1>
        <p class="text-center font-bold" style="font-size: 8pt; color: #475569; margin-bottom: 12px;">PT CHITRAPARATAMA • OPERATIONAL REVIEW</p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
          <tbody>
            <tr><td colspan="4" style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Details & Employee Profile</td></tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">Kode Sesi Dokumen</td>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-family: monospace; font-weight: bold;">${row.sessionCode}</td>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">Tanggal Aktivitas</td>
              <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold;">${formatDate(row.workDate)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Nama Karyawan</td>
              <td style="border: 1px solid black; padding: 3px 5px;">${row.employeeName} (${row.employeeSn})</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Shift Kerja</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.shiftCode}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Site / Lokasi</td>
              <td style="border: 1px solid black; padding: 3px 5px;">${row.siteName || '—'}</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Status Approval</td>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; text-transform: uppercase; color: #065f46;">${row.sessionStatus}</td>
            </tr>
            ${row.teamMembersSummary ? `
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Anggota Tim</td>
              <td colspan="3" style="border: 1px solid black; padding: 3px 5px; font-weight: 600; color: #1e3a8a;">${row.teamMembersSummary}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>

        <div style="font-weight: bold; margin-bottom: 0.25rem;">A. Daftar Approval Step</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
          <thead>
            <tr style="background: #f8fafc; font-weight: bold; text-align: center;">
              <th style="border: 1px solid black; padding: 3px 5px; width: 6%;">#</th>
              <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 26%;">Tahap Approval</th>
              <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 26%;">Approver</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 14%;">Status</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 14%;">Waktu</th>
              <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 14%;">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${(row.approvals || []).map((step) => `
              <tr>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${step.stepOrder}</td>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-weight: 500;">${step.stepLabel}</td>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: left;">${step.approverName || '—'}</td>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: center; text-transform: capitalize; font-weight: bold;">${step.stepOrder === 1 && step.status === 'approved' ? 'Signed (Diajukan)' : step.status}</td>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: center; font-size: 7pt; font-family: monospace;">${formatTimestamp(step.signedAt)}</td>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-size: 7.5pt; font-style: italic;">${step.remarks || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="font-weight: bold; margin-bottom: 0.25rem;">B. Signatories</div>
        <table style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead>
            <tr style="background: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Pemohon / Karyawan</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Leader / PJO</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Customer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                  ${(row.approvals || []).find(a => a.stepOrder === 1)?.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">Menunggu TTD</span>'}
                </div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                  <p style="font-weight: bold; font-size: 8pt;">${(row.approvals || []).find(a => a.stepOrder === 1)?.approverName || row.employeeName || '—'}</p>
                  <p style="font-size: 7pt; color: #64748b;">${formatTimestamp((row.approvals || []).find(a => a.stepOrder === 1)?.signedAt)}</p>
                </div>
              </td>
              <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                  ${(row.approvals || []).find(a => a.stepOrder === 2)?.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">Menunggu TTD</span>'}
                </div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                  <p style="font-weight: bold; font-size: 8pt;">${(row.approvals || []).find(a => a.stepOrder === 2)?.approverName || 'Leader Lapangan'}</p>
                  <p style="font-size: 7pt; color: #64748b;">${formatTimestamp((row.approvals || []).find(a => a.stepOrder === 2)?.signedAt)}</p>
                </div>
              </td>
              <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                <div style="font-size: 7.5pt; color: #94a3b8; font-style: italic; margin-bottom: 8px;">
                  Tanda Tangan Basah
                </div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                  <p style="font-weight: bold; font-size: 8pt;">&nbsp;</p>
                  <p style="font-size: 7pt; color: #64748b;">Customer</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: right; font-size: 7pt; color: #64748b; margin-top: 8px;">
          F.HC.DAR.001.01 • PT Chitra Paratama
        </div>
      `
      const blob = await generateHtmlAsPdfBlob(contentHtml)
      return { name: fileName, blob }
    }
  }

  const handleDownloadSelectedPdf = async () => {
    if (selectedIds.length === 0) return
    const selectedRows = filteredRows.filter((r) => selectedIds.includes(r.sessionId))
    if (selectedRows.length === 0) return

    setIsDownloadingPdf(true)
    const toastId = 'bulk-pdf-dl'

    try {
      if (selectedRows.length === 1) {
        toast.loading('Menyiapkan file PDF...', { id: toastId })
        await handleDownloadActivityPdf(selectedRows[0])
        toast.success('PDF berhasil diunduh!', { id: toastId })
      } else {
        toast.loading(`Menyiapkan ${selectedRows.length} dokumen PDF ke dalam ZIP...`, { id: toastId })
        const pdfFiles: Array<{ name: string; blob: Blob }> = []
        for (let i = 0; i < selectedRows.length; i++) {
          const row = selectedRows[i]
          toast.loading(`Memproses PDF (${i + 1}/${selectedRows.length}): ${row.sessionCode}...`, { id: toastId })
          const item = await getActivityPdfBlob(row)
          pdfFiles.push(item)
        }
        toast.loading(`Mengompres ${pdfFiles.length} file ke format ZIP...`, { id: toastId })
        await downloadFilesAsZip(pdfFiles, `Daily_Activity_Selected_${pdfFiles.length}_items_${new Date().toISOString().slice(0, 10)}.zip`)
        toast.success(`Berhasil mengunduh ZIP berisi ${pdfFiles.length} file PDF!`, { id: toastId })
      }
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh file PDF', { id: toastId })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  return (
    <AdminPageShell
      eyebrow="Human Capital • Workflow Approval"
      title="Daily Activity Approval"
      description="Pusat validasi dan evaluasi aktivitas harian karyawan dengan alur verifikasi bertingkat dan audit trail lengkap."
    >
      <HcWorkspaceBanner
        badge="DAILY ACTIVITY APPROVAL"
        title="Evaluasi Aktivitas Harian Karyawan"
        description="Review pengajuan aktivitas harian teknisi dan staf site dengan verifikasi tanda tangan digital berjenjang, integrasi reminder otomatis, dan audit trail transparan."
        metrics={[
          { label: 'Total Sesi', value: (rows || []).length },
          { label: 'Menunggu Approval', value: (rows || []).filter((r) => (r.sessionStatus || '').toLowerCase().includes('pending') || (r.sessionStatus || '').toLowerCase().includes('submitted')).length },
          { label: 'Disetujui', value: (rows || []).filter((r) => (r.sessionStatus || '').toLowerCase() === 'approved' || (r.sessionStatus || '').toLowerCase() === 'completed').length },
          { label: 'Draft', value: (rows || []).filter((r) => (r.sessionStatus || '').toLowerCase() === 'draft').length },
        ]}
      />

      <MinimalTableShell
        label="daily activity approval"
        title="Daftar Review"
        description="Daftar historis evaluasi aktivitas harian."
        fileName="daily-activity-approvals"
        searchEnabled={false}
        access={access}
        filters={
          <>
            <div className="relative w-full sm:w-[220px] sm:flex-none">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Cari aktivitas..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="bg-surface-container-lowest h-9 rounded-xl border-0 pl-9 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
              />
            </div>
            <MultiSelectFilterDropdown
              options={departmentFilterOptions}
              selected={selectedDepartments}
              onChange={setSelectedDepartments}
              placeholder="Semua departemen"
              label="Departemen"
            />
            <MultiSelectFilterDropdown
              options={sectionFilterOptions}
              selected={selectedSections}
              onChange={setSelectedSections}
              placeholder="Semua section"
              label="Section"
            />
            <MultiSelectFilterDropdown
              options={statusFilterOptions}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Semua status"
              label="Status"
            />
            <MultiSelectFilterDropdown
              options={siteFilterOptions}
              selected={selectedSites}
              onChange={setSelectedSites}
              placeholder="Semua site"
              label="Site"
            />
            <MultiSelectFilterDropdown
              options={shiftFilterOptions}
              selected={selectedShifts}
              onChange={setSelectedShifts}
              placeholder="Semua shift"
              label="Shift"
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="size-4 mr-1.5" /> Settings
            </Button>
            <Button variant="secondary" onClick={handleTestApproval} disabled={isTestRunning}>
              <Bug className="size-4 mr-1.5" /> {isTestRunning ? 'Generating...' : 'Test Approval'}
            </Button>
            <Button variant="outline" onClick={handleSendReminders} disabled={isReminderRunning}>
              <Send className="size-4 mr-1.5" /> {isReminderRunning ? 'Sending...' : 'Send Reminders'}
            </Button>
            <Button onClick={handleOpenCreateModal} className={hcPrimaryActionClassName}>
              <Plus className="size-4 mr-1.5" /> TAMBAH AKTIVITAS
            </Button>
          </div>
        }
        // Integrated Import and Export available via MinimalTableShell
        columnOptions={[]}
      >
        {/* Sticky Batch Approval Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <CheckCheck className="h-4 w-4 text-indigo-600" />
              <span>{selectedIds.length} dari {filteredRows.length} aktivitas terpilih</span>
            </div>
            <div className="flex items-center gap-2">
              {canBatchReview && (
                <Button
                  size="sm"
                  onClick={handleOpenBatchReview}
                  className="h-8 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white uppercase shadow-sm hover:bg-indigo-700"
                >
                  REVIEW
                </Button>
              )}
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
                variant="outline"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="h-8 rounded-lg border-red-200 bg-white px-3.5 text-xs font-bold text-red-600 uppercase shadow-sm hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-600" />
                HAPUS
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center text-slate-400 hover:text-slate-700"
                  title="Pilih Semua"
                >
                  {filteredRows.length > 0 && selectedIds.length === filteredRows.length ? (
                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Karyawan</TableHead>
              <TableHead>Kode Sesi</TableHead>
              <TableHead>Tgl Masuk</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Site / Lokasi</TableHead>
              <TableHead>Progress Approval</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters
                    ? 'Tidak ada aktivitas yang sesuai dengan filter pencarian.'
                    : 'Belum ada data review aktivitas harian.'}
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map((row) => {
              const isSelected = selectedIds.includes(row.sessionId)
              return (
                <TableRow
                  key={row.sessionId}
                  className={cn(
                    'hover:bg-slate-50/80 transition-colors cursor-pointer',
                    isSelected && 'bg-indigo-50/40 hover:bg-indigo-50/60'
                  )}
                  onClick={() => router.push(`/dashboard/activity-hub/document/${row.sessionId}/approval`)}
                >
                  <TableCell className="w-10 text-center" onClick={(e) => toggleSelectRow(row.sessionId, e)}>
                    <button
                      type="button"
                      className="flex items-center justify-center text-slate-400 hover:text-slate-700"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold text-slate-900">{row.employeeName}</p>
                      <p className="text-xs text-slate-500">{row.employeeSn}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{row.sessionCode}</TableCell>
                  <TableCell>{formatDate(row.workDate)}</TableCell>
                  <TableCell className="font-semibold text-xs">{row.shiftCode}</TableCell>
                  <TableCell className="text-xs">{row.siteName}</TableCell>
                  <TableCell>
                    <ApprovalProgressBadge approvals={row.approvals} />
                  </TableCell>
                  <TableCell>
                    <SessionStatusBadge status={row.sessionStatus} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const isComplete = ['approved', 'closed', 'completed'].includes((row.sessionStatus || '').toLowerCase())
                      const isRequester = Boolean(
                        currentEmployeeId &&
                          row.employeeId &&
                          Number(row.employeeId) === Number(currentEmployeeId)
                      )
                      const canEdit =
                        ['draft', 'returned', 'reverted', 'needs_revision'].includes((row.sessionStatus || '').toLowerCase()) &&
                        isRequester

                      const canDeleteThisRow = true
                      const isDeleteDisabled = false

                      return (
                        <div className="flex min-w-max items-center justify-end gap-1">
                          {/* Tombol Unduh PDF Dokumen Resmi */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => handleDownloadActivityPdf(row)}
                            disabled={isDownloadingPdf}
                            title="Unduh PDF Dokumen Resmi"
                            className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          >
                            <Download className="size-4" />
                          </Button>

                          {/* Tombol Print / Live Preview */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => setPreviewTarget(row)}
                            title="Lihat Preview Dokumen"
                            className="text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Eye className="size-4" />
                          </Button>

                          {/* Tombol Edit Form HANYA JIKA DRAFT, REVISI, ATAU REJECT (TIDAK MUNCUL JIKA SUBMITTED / APPROVED) */}
                          {canEdit ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="denseIcon"
                              onClick={() => router.push(`/dashboard/activity-hub/document/${row.sessionId}/approval`)}
                              title="Edit & Revisi Aktivitas"
                              className="text-slate-600 hover:text-[#003461] cursor-pointer"
                            >
                              <FilePenLine className="size-4" />
                            </Button>
                          ) : null}

                          {/* Tombol Hapus */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => setDeleteTarget(row)}
                            title="Hapus Aktivitas"
                            className="text-slate-600 hover:text-destructive hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )
                    })()}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </MinimalTableShell>

      {/* ── BATCH MULTI-DOCUMENT PREVIEW & APPROVAL MODAL ── */}
      <Dialog open={isBatchReviewOpen && Boolean(currentBatchDoc)} onOpenChange={(open) => !open && setIsBatchReviewOpen(false)}>
        <DialogContent showCloseButton={false} className="max-w-[96vw] xl:max-w-6xl 2xl:max-w-7xl max-h-[94vh] h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-2xl">
          {/* Top Viewer Toolbar */}
          <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-200 text-slate-900 shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">
                  Review & Approval Dokumen • <span className="font-mono text-indigo-600">{currentBatchDoc?.sessionCode}</span>
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {currentBatchDoc?.employeeName} ({currentBatchDoc?.employeeSn}) • {formatDate(currentBatchDoc?.workDate || '')} • Shift {currentBatchDoc?.shiftCode}
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
                onClick={() => currentBatchDoc && handleDownloadActivityPdf(currentBatchDoc)}
              >
                <Download className="size-3.5" /> Unduh PDF
              </Button>

              <button
                type="button"
                onClick={() => setIsBatchReviewOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Tutup Reviewer"
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
                <div
                  id="batch-activity-preview-sheet"
                  className="relative mx-auto w-[210mm] min-h-[297mm] shrink-0 overflow-hidden bg-white shadow-md border border-slate-200/90 rounded-sm"
                  style={{
                    backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                    backgroundSize: '100% 100%',
                  }}
                >
                  <div
                    className="relative z-10 outline-none text-[8.5pt] font-sans leading-tight"
                    style={{
                      color: 'black',
                      paddingTop: '38mm',
                      paddingBottom: '35mm',
                      paddingLeft: '20mm',
                      paddingRight: '20mm',
                      minHeight: '297mm',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header Document */}
                    <h1 className="text-center font-bold text-[11pt] mb-1">PT. CHITRA PARATAMA</h1>
                    <h2 className="text-center font-bold text-[12pt] mb-3 uppercase">FORM DAILY ACTIVITY</h2>

                    {/* Section 1: Details */}
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8.5pt]">
                      <tbody>
                        <tr>
                          <td colSpan={2} className="font-bold bg-slate-50">Details</td>
                        </tr>
                        <tr>
                          <td className="w-1/2">Tanggal Kerja: {formatDate(currentBatchDoc.workDate)}</td>
                          <td className="w-1/2">Shift: {currentBatchDoc.shiftCode || '—'}</td>
                        </tr>
                        <tr>
                          <td>Kode Sesi: {currentBatchDoc.sessionCode}</td>
                          <td>Status: <span className="capitalize font-semibold">{currentBatchDoc.sessionStatus}</span></td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="font-bold bg-slate-50">Employee Profile</td>
                        </tr>
                        <tr>
                          <td>Nama: {currentBatchDoc.employeeName}</td>
                          <td>SN: {currentBatchDoc.employeeSn}</td>
                        </tr>
                        <tr>
                          <td>Job Title: {currentBatchDoc.jobTitle || 'Serviceman'}</td>
                          <td>Dept / Section: {[currentBatchDoc.department, currentBatchDoc.section].filter(Boolean).join(' / ') || '—'}</td>
                        </tr>
                        <tr>
                          <td>Site: {currentBatchDoc.siteName || '—'}</td>
                          <td>Customer: {currentBatchDoc.customerName || '—'}</td>
                        </tr>
                        {currentBatchDoc.teamMembersSummary ? (
                          <tr>
                            <td colSpan={2}>
                              Anggota Tim: <span className="text-black font-normal">{currentBatchDoc.teamMembersSummary}</span>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>

                    {/* A. Daily Activity Items */}
                    <div className="font-bold mb-1 text-[8.5pt]">
                      A. Daily Activity Items (Total: {(currentBatchDoc.items || []).length} item, {(currentBatchDoc.items || []).reduce((s, i) => s + (Number(i?.points) || 0), 0) || currentBatchDoc.totalPoints} poin)
                    </div>
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-50 text-center font-bold">
                          <th className="w-[5%]">#</th>
                          <th className="text-left w-[38%]">Aktivitas</th>
                          <th className="w-[14%]">Unit</th>
                          <th className="w-[12%]">Durasi</th>
                          <th className="w-[10%]">Poin</th>
                          <th className="text-left w-[21%]">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBatchDoc.items && currentBatchDoc.items.length > 0 ? (
                          currentBatchDoc.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="text-center align-middle">{idx + 1}</td>
                              <td className="align-middle">{item.label}</td>
                              <td className="text-center align-middle">{item.unitNumber || '-'}</td>
                              <td className="text-center align-middle">{item.duration || '-'}</td>
                              <td className="text-center font-semibold align-middle">{item.points}</td>
                              <td className="text-left text-[7.5pt] align-middle">{item.remark || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center text-gray-400 py-2">Belum ada item aktivitas.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* B. Approval Steps */}
                    <div className="font-bold mb-1">B. Approval Steps</div>
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
                          const activeStep = currentBatchDoc.approvals.find(a => a.status === 'pending') || currentBatchDoc.approvals[0]
                          return currentBatchDoc.approvals.map((step) => {
                            const isCurrentActiveStep = step.status === 'pending' && step.stepOrder === activeStep?.stepOrder
                            const liveRemark = isCurrentActiveStep && approvalRemarks[currentBatchDoc.sessionId]
                              ? approvalRemarks[currentBatchDoc.sessionId]
                              : step.remarks || '—'
                            return (
                              <tr key={step.stepOrder}>
                                <td>{step.stepOrder}</td>
                                <td className="text-left">{step.stepLabel}</td>
                                <td className="text-left font-semibold">{step.approverName || '-'}</td>
                                <td className="capitalize font-semibold">
                                  {step.stepOrder === 1 && step.status === 'approved'
                                    ? 'Signed (Diajukan)'
                                    : step.status}
                                </td>
                                <td className="text-[7pt] font-mono">{formatTimestamp(step.signedAt)}</td>
                                <td className="text-left italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{liveRemark}</td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>

                    {/* Signatories */}
                    <div className="font-bold mb-3">Signatories</div>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
                      {/* 1. Karyawan */}
                      {(() => {
                        const activeStep = currentBatchDoc.approvals.find(a => a.status === 'pending') || currentBatchDoc.approvals[0]
                        const step1 = currentBatchDoc.approvals.find(a => a.stepOrder === 1)
                        const isStep1Active = step1 && step1.status === 'pending' && step1.stepOrder === activeStep?.stepOrder
                        const remark1 = isStep1Active && approvalRemarks[currentBatchDoc.sessionId]
                          ? approvalRemarks[currentBatchDoc.sessionId]
                          : step1?.remarks
                        const isApproved1 = step1?.status === 'approved' && Boolean(step1?.signatureDataUrl)
                        return (
                          <div>
                            <div className="text-[7pt] text-gray-500 mb-1">Employee Signature</div>
                            <div className="h-16 flex items-end">
                              {isApproved1 && step1?.signatureDataUrl ? (
                                <img src={step1.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                              ) : (
                                <span className="text-slate-400 italic text-[7.5pt]">(Belum Disetujui)</span>
                              )}
                            </div>
                            <div className="mb-1 border-b font-bold text-[8.5pt]" style={{ width: '80%', borderColor: '#9ca3af' }}>
                              {currentBatchDoc.employeeName}
                            </div>
                            <div className="text-[7pt] text-gray-600">{currentBatchDoc.jobTitle || 'Employee'}</div>
                            <div className="text-[6.5pt] text-gray-500">{formatTimestamp(step1?.signedAt)}</div>
                            {remark1 ? <div className="text-[6.5pt] italic text-slate-600 mt-0.5 max-w-[160px] leading-tight break-words whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Catatan: {remark1}</div> : null}
                          </div>
                        )
                      })()}

                      {/* 2. Leader */}
                      {(() => {
                        const activeStep = currentBatchDoc.approvals.find(a => a.status === 'pending') || currentBatchDoc.approvals[0]
                        const step2 = currentBatchDoc.approvals.find(a => a.stepOrder === 2)
                        const isStep2Active = step2 && step2.status === 'pending' && step2.stepOrder === activeStep?.stepOrder
                        const remark2 = isStep2Active && approvalRemarks[currentBatchDoc.sessionId]
                          ? approvalRemarks[currentBatchDoc.sessionId]
                          : step2?.remarks
                        const isApproved2 = step2?.status === 'approved' && Boolean(step2?.signatureDataUrl)
                        return (
                          <div>
                            <div className="text-[7pt] text-gray-500 mb-1">Leader / Supervisor Signature</div>
                            <div className="h-16 flex items-end">
                              {isApproved2 && step2?.signatureDataUrl ? (
                                <img src={step2.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                              ) : (
                                <span className="text-slate-400 italic text-[7.5pt]"></span>
                              )}
                            </div>
                            <div className="mb-1 border-b font-bold text-[8.5pt]" style={{ width: '80%', borderColor: '#9ca3af' }}>
                              {step2?.approverName || 'Leader / Supervisor'}
                            </div>
                            <div className="text-[7pt] text-gray-600">{step2?.stepLabel || 'Leader'}</div>
                            <div className="text-[6.5pt] text-gray-500">{formatTimestamp(step2?.signedAt)}</div>
                            {remark2 ? <div className="text-[6.5pt] italic text-slate-600 mt-0.5 max-w-[160px] leading-tight break-words whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Catatan: {remark2}</div> : null}
                          </div>
                        )
                      })()}

                      {/* 3. Customer */}
                      <div>
                        <div className="text-[7pt] text-gray-500 mb-1">Customer Signature</div>
                        <div className="h-16 flex items-end">
                          <span className="text-slate-400 italic text-[7.5pt]"></span>
                        </div>
                        <div className="mb-1 border-b font-bold text-[8.5pt]" style={{ width: '80%', borderColor: '#9ca3af' }}>
                          &nbsp;
                        </div>
                        <div className="text-[7pt] text-gray-600">Customer</div>
                      </div>
                    </div>

                    <div className="text-right text-[7pt] text-gray-500 mt-2">
                      F.HC.DAR.001.01 • PT Chitra Paratama
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Action Sidebar */}
            <div className="w-full lg:w-84 shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 flex flex-col justify-between overflow-y-auto text-slate-800">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-xs">Informasi Dokumen</p>
                    <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                      {currentBatchDoc?.sessionStatus}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <p><span className="text-slate-400">Karyawan:</span> <span className="font-semibold text-slate-900">{currentBatchDoc?.employeeName}</span></p>
                    <p><span className="text-slate-400">Kode Sesi:</span> <span className="font-mono text-indigo-700 font-semibold">{currentBatchDoc?.sessionCode}</span></p>
                    <p><span className="text-slate-400">Tanggal:</span> <span className="text-slate-800">{formatDate(currentBatchDoc?.workDate || '')}</span></p>
                    <p><span className="text-slate-400">Shift:</span> <span className="text-slate-800 font-medium">{currentBatchDoc?.shiftCode || '—'}</span></p>
                  </div>
                </div>

                {/* Catatan Approval Input */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Catatan Approval</Label>
                  <Textarea
                    placeholder="Tulis catatan / feedback approval di sini (opsional)..."
                    rows={2}
                    value={approvalRemarks[currentBatchDoc?.sessionId ?? 0] || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setApprovalRemarks((prev) => ({ ...prev, [currentBatchDoc?.sessionId ?? 0]: val }))
                    }}
                    className="bg-white border-slate-200 text-xs resize-none"
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

      {/* PDF Quick Preview Dialog - Modern Zoomable & Draggable Viewer */}
      <Dialog open={Boolean(previewTarget)} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent showCloseButton={false} className="max-w-[96vw] xl:max-w-6xl 2xl:max-w-7xl max-h-[94vh] h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-2xl">
          {/* Top Viewer Toolbar */}
          <div className="bg-white px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-200 text-slate-900 shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  Daily Activity Report • <span className="font-mono text-indigo-600">{previewTarget?.sessionCode}</span>
                </p>
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                  {previewTarget?.employeeName} ({previewTarget?.employeeSn}) • {formatDate(previewTarget?.workDate || '')} • Shift {previewTarget?.shiftCode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewerZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                  title="Zoom Out"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <span className="text-[11px] font-mono font-semibold text-slate-700 px-1 min-w-[38px] text-center select-none">
                  {Math.round(viewerZoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewerZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                  title="Zoom In"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                {(viewerZoom !== 1.0 || panOffset.x !== 0 || panOffset.y !== 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetView}
                    className="h-6 px-1.5 text-[9px] font-bold text-slate-500 hover:text-slate-900 rounded-md ml-0.5"
                  >
                    Reset
                  </Button>
                )}
              </div>

              {/* Preset Buttons */}
              <div className="hidden lg:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                {[
                  { label: '60%', val: 0.6 },
                  { label: '80%', val: 0.8 },
                  { label: '100%', val: 1.0 },
                  { label: '125%', val: 1.25 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setViewerZoom(p.val); setPanOffset({ x: 0, y: 0 }); }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors",
                      Math.abs(viewerZoom - p.val) < 0.05
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-xl font-medium gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
                disabled={isDownloadingPdf}
                onClick={() => previewTarget && handleDownloadActivityPdf(previewTarget)}
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Unduh PDF</span>
              </Button>

              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Viewer Canvas Area */}
          {previewTarget && (() => {
            const baseScale = 0.80
            const effectiveScale = baseScale * viewerZoom
            const originalHeightMm = 297
            const marginOffsetMm = -Math.round(originalHeightMm * (1 - effectiveScale))

            const step1 = previewTarget.approvals.find(a => a.stepOrder === 1)
            const step2 = previewTarget.approvals.find(a => a.stepOrder === 2)
            const step3 = previewTarget.approvals.find(a => a.stepOrder === 3)
            const isSigned1 = step1?.status === 'approved' && Boolean(step1?.signatureDataUrl)
            const isApproved2 = step2?.status === 'approved' && Boolean(step2?.signatureDataUrl)
            const isApproved3 = step3?.status === 'approved' && Boolean(step3?.signatureDataUrl)

            return (
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={cn(
                  "relative flex-1 flex justify-center items-start overflow-hidden p-4 sm:p-6 select-none bg-slate-200/70",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
                title="Klik dan tahan untuk menggeser preview dokumen"
              >
                <div
                  id="activity-preview-sheet"
                  className={cn(
                    "relative mx-auto w-[210mm] min-h-[297mm] shrink-0 bg-white shadow-2xl border border-slate-200/90 rounded-sm origin-top",
                    isDragging ? "transition-none" : "transition-transform duration-150 ease-out"
                  )}
                  style={{
                    backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                    backgroundSize: '100% 100%',
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${effectiveScale})`,
                    transformOrigin: 'top center',
                    marginBottom: `${marginOffsetMm}mm`,
                  }}
                >
                  <div
                    className="relative z-10 outline-none text-[8.5pt] font-sans leading-tight text-black"
                    style={{
                      paddingTop: '38mm',
                      paddingBottom: '35mm',
                      paddingLeft: '20mm',
                      paddingRight: '20mm',
                      minHeight: '297mm',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header Document */}
                    <div className="text-center mb-3">
                      <h1 className="font-bold text-[11pt] mb-0.5 uppercase">PT. CHITRA PARATAMA</h1>
                      <h2 className="font-bold text-[12pt] uppercase tracking-wider">{((previewTarget as any).splId || (previewTarget as any).spl) ? 'SURAT PERINTAH LEMBUR' : 'DAILY ACTIVITY APPROVAL REPORT'}</h2>
                    </div>

                    {/* Section 1: Details */}
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8.5pt]">
                      <tbody>
                        <tr>
                          <td colSpan={2} className="font-bold bg-slate-50">Details</td>
                        </tr>
                        <tr>
                          <td className="w-1/2">Tanggal Kerja: <strong>{formatDate(previewTarget.workDate)}</strong></td>
                          <td className="w-1/2">Shift: <strong>{previewTarget.shiftCode || 'ALL'}</strong></td>
                        </tr>
                        <tr>
                          <td>Kode Sesi: <strong>{previewTarget.sessionCode}</strong></td>
                          <td>Status: <span className="capitalize font-bold text-black">{previewTarget.sessionStatus}</span></td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="font-bold bg-slate-50">Employee Profile</td>
                        </tr>
                        <tr>
                          <td>Nama: <strong>{previewTarget.employeeName}</strong></td>
                          <td>SN: <strong>{previewTarget.employeeSn}</strong></td>
                        </tr>
                        <tr>
                          <td>Job Title: <strong>{previewTarget.jobTitle || 'Serviceman'}</strong></td>
                          <td>Dept / Section: <strong>{[previewTarget.department, previewTarget.section].filter(Boolean).join(' / ') || '—'}</strong></td>
                        </tr>
                        <tr>
                          <td>Site: <strong>{previewTarget.siteName || '—'}</strong></td>
                          <td>Customer: <strong>{previewTarget.customerName || 'Default Customer'}</strong></td>
                        </tr>
                        {previewTarget.teamMembersSummary ? (
                          <tr>
                            <td colSpan={2}>
                              Anggota Tim: <span className="text-black font-normal">{previewTarget.teamMembersSummary}</span>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>

                    {/* A. Daily Activity Items */}
                    <div className="font-bold mb-1">
                      A. Daily Activity Items (Total: {(previewTarget.items || []).length} item, {(previewTarget.items || []).reduce((s, i) => s + (Number(i?.points) || 0), 0) || previewTarget.totalPoints} poin)
                    </div>
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-50 text-center font-bold">
                          <th className="w-[5%]">#</th>
                          <th className="text-left w-[46%]">Aktivitas</th>
                          <th className="w-[14%]">Durasi</th>
                          <th className="w-[12%]">Poin</th>
                          <th className="text-left w-[23%]">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTarget.items && previewTarget.items.length > 0 ? (
                          previewTarget.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="text-center align-middle">{idx + 1}</td>
                              <td className="align-middle">{item.label}</td>
                              <td className="text-center align-middle">{item.duration || '-'}</td>
                              <td className="text-center font-bold align-middle">{item.points}</td>
                              <td className="align-middle text-[7.5pt]">{item.remark || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center text-gray-400 py-2">Belum ada item aktivitas.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* B. Approval Steps */}
                    <div className="font-bold mb-1">B. Approval Steps</div>
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="bg-slate-50 font-bold">
                          <th className="w-[6%]">#</th>
                          <th className="text-left w-[22%]">Tahap</th>
                          <th className="text-left w-[22%]">Approver</th>
                          <th className="w-[14%]">Status</th>
                          <th className="w-[16%]">Waktu</th>
                          <th className="text-left w-[20%]">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTarget.approvals
                          .filter((step) => (step.stepOrder ?? 0) <= 2 && step.approverRole !== 'section_head' && step.approverRole !== 'manager')
                          .map((step) => (
                          <tr key={step.stepOrder}>
                            <td>{step.stepOrder}</td>
                            <td className="text-left">{step.stepLabel}</td>
                            <td className="text-left font-semibold">{step.approverName || '-'}</td>
                            <td className="capitalize font-semibold">
                              {step.stepOrder === 1 && step.status === 'approved'
                                ? 'Signed (Diajukan)'
                                : step.status}
                            </td>
                            <td className="text-[7pt] font-mono">{step.signedAt ? new Date(step.signedAt).toLocaleDateString('id-ID') : '—'}</td>
                            <td className="text-left italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              {step.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Signatories */}
                    <div className="font-bold mb-3">Signatories</div>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
                      {/* 1. Karyawan */}
                      <div>
                        <div className="text-[7pt] text-gray-500 mb-1">Employee Signature</div>
                        <div className="h-16 flex items-end">
                          {isSigned1 && step1?.signatureDataUrl ? (
                            <img src={step1.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                          ) : (
                            <span className="text-slate-400 italic text-[7.5pt]">(Belum Disetujui)</span>
                          )}
                        </div>
                        <div className="mb-1 border-b font-bold text-[8.5pt]" style={{ width: '80%', borderColor: '#9ca3af' }}>
                          {previewTarget.employeeName}
                        </div>
                        <div className="text-[7pt] text-gray-600">{previewTarget.jobTitle || 'Employee'}</div>
                      </div>

                      {/* 2. Leader / PJO */}
                      <div>
                        <div className="text-[7pt] text-gray-500 mb-1">Leader / PJO Signature</div>
                        <div className="h-16 flex items-end">
                          {isApproved2 && step2?.signatureDataUrl ? (
                            <img src={step2.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                          ) : (
                            <span className="text-slate-400 italic text-[7.5pt]"></span>
                          )}
                        </div>
                        <div className="mb-1 border-b font-bold text-[8.5pt]" style={{ width: '80%', borderColor: '#9ca3af' }}>
                          {step2?.approverName || 'Leader / PJO'}
                        </div>
                        <div className="text-[7pt] text-gray-600">{step2?.stepLabel || 'Leader / PJO'}</div>
                      </div>

                      {/* 3. Customer (Manual Wet Signature) */}
                      <div>
                        <div className="text-[7pt] text-gray-500 mb-1">Customer Signature</div>
                        <div className="h-16 flex items-end">
                          {/* Ruang kosong untuk tanda tangan manual basah */}
                        </div>
                        <div className="mb-1 border-b font-bold text-[8.5pt] min-h-[14px]" style={{ width: '80%', borderColor: '#9ca3af' }}>
                          &nbsp;
                        </div>
                        <div className="text-[7pt] text-gray-600">Customer</div>
                      </div>
                    </div>

                    {/* Evidence QR in Bottom Right Corner (Clickable to open floating modal) */}
                    <div className="absolute right-[20mm] bottom-[18mm]">
                      <div
                        onClick={() => {
                          setEvidenceModalSessionId(previewTarget.sessionId)
                          setIsEvidenceModalOpen(true)
                        }}
                        className="flex flex-col items-center justify-start text-center border-l border-slate-200 pl-2 cursor-pointer group select-none transition-transform hover:scale-105 active:scale-95"
                        title="Klik untuk membuka galeri foto bukti pekerjaan"
                      >
                        <div className="h-14 flex items-center justify-center">
                          {previewTargetQrDataUrl ? (
                            <img src={previewTargetQrDataUrl} alt="QR Evidence" className="h-12 w-12 object-contain rounded border border-slate-200 p-0.5 bg-white shadow-xs group-hover:border-indigo-500 group-hover:shadow-md transition-all" />
                          ) : (
                            <div className="h-12 w-12 rounded border border-dashed border-slate-300 flex items-center justify-center text-[6pt] text-slate-400">
                              QR Code
                            </div>
                          )}
                        </div>
                        <span className="text-[6.5pt] font-bold text-slate-800 mt-0.5 group-hover:text-indigo-600 leading-tight">Scan / Klik Bukti Kerja</span>
                        <span className="text-[5.5pt] text-slate-500 leading-tight">Validasi Dokumen Digital</span>
                      </div>
                    </div>

                    <div className="text-right text-[7pt] text-gray-500 mt-2">
                      F.HC.DAR.001.01 • PT Chitra Paratama
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog (Contract Review Parity) */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Daily Activity Workflow Settings</DialogTitle>
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

              {/* Section Heads */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section Heads</p>
                {(['repairRetread', 'serviceMvc', 'serviceOthers'] as const).map((key) => {
                  const labels: Record<string, string> = {
                    repairRetread: 'Repair/Retread',
                    serviceMvc: 'Service MVC',
                    serviceOthers: 'Service Others',
                  }
                  const sh = (settingsForm.approvalMatrix?.sectionHeads as any)?.[key] || { name: '', email: '' }
                  const matchedEmp = employees.find((e: any) => e.name === sh.name)
                  return (
                    <div key={key} className="space-y-1">
                      <Label>{labels[key]} Section Head</Label>
                      <SearchableSelect
                        label={labels[key]}
                        placeholder={`Pilih ${labels[key]} Head...`}
                        value={matchedEmp ? String(matchedEmp.id) : ''}
                        onValueChange={(val) => updateSectionHead(key, val)}
                        options={employeeOptions}
                        widthClassName="w-full"
                      />
                      <Input
                        value={sh.email}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            approvalMatrix: {
                              ...settingsForm.approvalMatrix,
                              sectionHeads: {
                                ...((settingsForm.approvalMatrix?.sectionHeads as any) || {}),
                                [key]: { ...sh, email: e.target.value },
                              },
                            },
                          })
                        }
                        placeholder="Email..."
                        className="h-8 text-xs"
                      />
                    </div>
                  )
                })}
              </div>

              {/* Manager & HR */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manager & HR</p>
                <div className="space-y-1">
                  <Label>Central Service Manager</Label>
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
                <div className="space-y-1">
                  <Label>Default HR</Label>
                  <SearchableSelect
                    label="HR"
                    placeholder="Pilih HR..."
                    value={(() => {
                      const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix?.hrName)
                      return emp ? String(emp.id) : ''
                    })()}
                    onValueChange={(val) => updateApproverField('hr', val)}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <Input
                    value={settingsForm.approvalMatrix?.hrEmail || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        approvalMatrix: { ...settingsForm.approvalMatrix, hrEmail: e.target.value },
                      })
                    }
                    placeholder="Email..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Reminder Days Before / Interval (pisahkan koma)</Label>
                <Input
                  value={(settingsForm.reminderDaysBefore ?? [1, 3, 7]).join(', ')}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      reminderDaysBefore: e.target.value
                        .split(',')
                        .map((value: string) => Number(value.trim()))
                        .filter((value: number) => Number.isFinite(value) && value >= 0),
                    })
                  }
                  placeholder="1, 3, 7"
                />
                <p className="text-[10px] text-muted-foreground">Pengingat otomatis dikirim saat approval pending mendekati SLA ini.</p>
              </div>
            </div>

            {/* ── Email Templates ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Email Templates</h3>
              {(['approvalStep', 'approvalCompleted', 'reminder'] as const).map((key) => {
                const labels: Record<string, string> = {
                  approvalStep: 'Notifikasi Giliran Approval',
                  approvalCompleted: 'Notifikasi Persetujuan Akhir',
                  reminder: `Reminder SLA (${(settingsForm.reminderDaysBefore ?? [1, 3, 7]).map((d: number) => `H+${d}`).join('/')})`,
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
                      Variables: {'{{employeeName}}, {{employeeSn}}, {{sessionCode}}, {{workDate}}, {{approverName}}, {{approvalStep}}, {{approvalLink}}'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSettings}>
              Simpan Pengaturan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data Review Aktivitas</DialogTitle>
            <DialogDescription>
              Upload file spreadsheet Excel atau CSV untuk impor massal sesi aktivitas harian.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 cursor-pointer">
              <Upload className="size-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-700">Pilih atau seret file ke sini</p>
              <p className="text-[10px] text-slate-400 mt-1">Format didukung: .xlsx, .csv (Maks. 10MB)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              Tutup
            </Button>
            <Button
              onClick={() => {
                toast.success('Fitur import batch data sedang diproses.')
                setIsImportOpen(false)
              }}
              className="bg-slate-900 text-white"
            >
              Upload & Proses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Links Modal (Contract Review Parity) */}
      <Dialog
        open={!!testLinks}
        onOpenChange={(open) => {
          if (!open) setTestLinks(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Approval Links</DialogTitle>
            <DialogDescription>
              Klik link untuk menguji alur approval TTD digital pada setiap tahap sequential.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {testLinks?.map((link) => (
              <div
                key={link.step}
                className="flex items-center justify-between rounded-lg border p-3 bg-white"
              >
                <div>
                  <p className="text-sm font-medium">
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
                  Buka Link Approval
                </a>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestLinks(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Activity Modal matching PDF / Document standard */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs">FJ.IC.DAR</span>
                  Tambah Dokumen Daily Activity Report
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Form evaluasi aktivitas harian teknisi & pengajuan approval berjenjang sesuai dokumen resmi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* 1. Details & Employee Profile */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-600"></span>
                  1. Details & Employee Profile
                </span>
                <span className="text-[11px] font-mono text-slate-400">Section Profile</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Pilih Karyawan *</Label>
                  <SearchableSelect
                    label="Karyawan"
                    placeholder="PILIH KARYAWAN..."
                    value={createForm.employeeId}
                    onValueChange={(val) => {
                      const emp = employees.find((e) => String(e.id) === val)
                      if (emp) {
                        const site = sites.find((s) => s.id === emp.siteId)
                        const defLeader = emp.directManagerId ? employees.find((e) => e.id === emp.directManagerId) : null
                        const defSectionHeadId = emp.sectionId ? sectionHeadMap[String(emp.sectionId)] : null
                        const defSectionHead = defSectionHeadId ? employees.find((e) => e.id === defSectionHeadId) : null
                        const defManagerId = emp.departmentId ? deptHeadMap[String(emp.departmentId)] : null
                        const defManager = defManagerId ? employees.find((e) => e.id === defManagerId) : null

                        setCreateForm((p) => ({
                          ...p,
                          employeeId: val,
                          employeeName: emp.name,
                          employeeSn: emp.employeeId || '',
                          jobTitle: emp.jobTitle || '',
                          department: emp.department || '',
                          section: emp.section || '',
                          siteId: emp.siteId ? String(emp.siteId) : p.siteId,
                          siteName: site?.name || p.siteName,
                          leaderEmployeeId: defLeader ? String(defLeader.id) : p.leaderEmployeeId,
                          leaderName: defLeader?.name || p.leaderName,
                          superiorEmployeeId: defSectionHead ? String(defSectionHead.id) : p.superiorEmployeeId,
                          superiorName: defSectionHead?.name || p.superiorName,
                          managerEmployeeId: defManager ? String(defManager.id) : p.managerEmployeeId,
                          managerName: defManager?.name || p.managerName,
                        }))
                      }
                    }}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tanggal Kerja (Work Date) *</Label>
                  <Input
                    type="date"
                    value={createForm.workDate}
                    onChange={(e) => setCreateForm((p) => ({ ...p, workDate: e.target.value }))}
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Shift Kerja</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold"
                    value={createForm.shiftCode}
                    onChange={(e) => setCreateForm((p) => ({ ...p, shiftCode: e.target.value }))}
                  >
                    <option value="ALL">ALL (Semua Shift)</option>
                    <option value="Shift 1">Shift 1</option>
                    <option value="Shift 2">Shift 2</option>
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Site / Lokasi</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold"
                    value={createForm.siteId}
                    onChange={(e) => {
                      const st = sites.find((s) => String(s.id) === e.target.value)
                      setCreateForm((p) => ({ ...p, siteId: e.target.value, siteName: st?.name || p.siteName }))
                    }}
                  >
                    <option value="">Pilih Site / Lokasi...</option>
                    {sites.map((st) => (
                      <option key={st.id} value={String(st.id)}>
                        {st.name} ({st.code || 'SITE'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Job Title / Posisi</Label>
                  <Input
                    value={createForm.jobTitle}
                    onChange={(e) => setCreateForm((p) => ({ ...p, jobTitle: e.target.value }))}
                    placeholder="Contoh: Tyre Technician"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Departemen & Seksi</Label>
                  <Input
                    value={createForm.section ? `${createForm.department} / ${createForm.section}` : createForm.department}
                    onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))}
                    placeholder="Dept / Section"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer / Partner</Label>
                  <Input
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customerName: e.target.value }))}
                    placeholder="Nama Customer (Opsional)"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 1.1 Team Logging / Input Sekaligus untuk Tim */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-teal-700" />
                  <div>
                    <span className="font-bold text-slate-800 text-xs">Team Logging (Input Sekaligus untuk Tim)</span>
                    <p className="text-[10px] text-slate-500">Pilih rekan kerja untuk dimasukkan ke dokumen aktivitas ini</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                  <span>Input untuk Tim</span>
                  <input
                    type="checkbox"
                    checked={isTeamLog}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setIsTeamLog(checked)
                      if (!checked && createForm.employeeId) {
                        setSelectedTeamMemberIds([Number(createForm.employeeId)])
                      }
                    }}
                    className="size-4 accent-teal-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {isTeamLog ? (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <Popover open={teamMemberPickerOpen} onOpenChange={setTeamMemberPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between rounded-xl bg-white text-xs font-semibold text-slate-800 h-9 border-slate-200"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="size-3.5 text-teal-600" />
                          {selectedTeamMemberIds.length > 0
                            ? `${selectedTeamMemberIds.length} Anggota Tim Dipilih`
                            : 'Pilih Anggota Tim...'}
                        </span>
                        <ChevronDown className="size-4 text-slate-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3 space-y-2 bg-white shadow-xl rounded-xl" align="start">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                        <Input
                          placeholder="Cari nama atau NIK..."
                          value={teamMemberSearchQuery}
                          onChange={(e) => setTeamMemberSearchQuery(e.target.value)}
                          className="h-8 pl-8 text-xs bg-white"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                        {filteredModalEmployees.map((emp) => {
                          const isSelected = selectedTeamMemberIds.includes(emp.id)
                          const isPrimary = String(emp.id) === createForm.employeeId
                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                if (isPrimary) return
                                setSelectedTeamMemberIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                                )
                              }}
                              className={cn(
                                'flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors',
                                isSelected ? 'bg-teal-50 text-teal-900 font-semibold' : 'hover:bg-slate-100',
                                isPrimary && 'opacity-80'
                              )}
                            >
                              <div className="space-y-0.5">
                                <p className="font-medium text-slate-800">
                                  {emp.name} {isPrimary ? '(Pembuat/Primary)' : ''}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {emp.employeeId || '-'} • {emp.jobTitle || emp.department || 'Staff'}
                                </p>
                              </div>
                              {isSelected ? <Check className="size-4 text-teal-600" /> : null}
                            </div>
                          )
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {selectedTeamMemberIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {employees
                        .filter((e) => selectedTeamMemberIds.includes(e.id))
                        .map((e) => (
                          <Badge
                            key={e.id}
                            variant="secondary"
                            className="text-[11px] font-medium py-1 px-2.5 flex items-center gap-1.5 bg-teal-50 text-teal-900 border border-teal-200"
                          >
                            <span>{e.name}</span>
                            {String(e.id) !== createForm.employeeId ? (
                              <X
                                className="size-3 cursor-pointer hover:text-red-600"
                                onClick={() => setSelectedTeamMemberIds((prev) => prev.filter((id) => id !== e.id))}
                              />
                            ) : null}
                          </Badge>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* 1.5. SOURCE MODE SELECTION (SINKRON DENGAN MOBILE) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Source Mode *</Label>
              <select
                value={createForm.sourceMode || 'self_input'}
                onChange={(e) => setCreateForm((p) => ({ ...p, sourceMode: e.target.value as 'self_input' | 'assigned' | 'custom' }))}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="self_input">Self-input activity</option>
                <option value="assigned">Assigned activity</option>
                <option value="custom">Custom activity</option>
              </select>
            </div>

            {/* CONDITIONAL RENDER: ASSIGNED ACTIVITY MODE */}
            {createForm.sourceMode === 'assigned' && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Assigned Activity (Assignment Penugasan)</span>
                  <Badge className="bg-blue-600 text-white border-0 text-[10px]">Tugas Resmi</Badge>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">ASSIGNMENT *</Label>
                  <select
                    value={createForm.assignmentId || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, assignmentId: e.target.value }))}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih assignment</option>
                    <option value="1">ASG-001 • Perbaikan Tire Unit HD-785 (Andana Gustafianto)</option>
                    <option value="2">ASG-002 • Mounting OTR Wheel Workshop Site Pekanbaru (Rizal Mahendra)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">Pilih assignment yang sedang dikerjakan.</p>
                </div>

                {/* Photo Evidence Section */}
                <div className="rounded-xl border border-blue-100 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Camera className="size-3.5 text-slate-500" /> Photo Evidence <span className="text-rose-500 font-bold">*</span>
                    </span>
                    {createForm.assignedPhotoUrl || (createForm.assignedPhotos && createForm.assignedPhotos.length > 0) ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold">
                        ✓ Terunggah
                      </Badge>
                    ) : createForm.assignedUploading ? (
                      <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold animate-pulse">
                        Mengunggah...
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-700 border-0 text-[10px] font-bold">
                        Wajib Diunggah
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 py-2 text-xs font-semibold text-blue-800 transition-colors">
                      <Camera className="size-3.5 text-blue-700" /> Kamera
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          handleAssignedPhotoSelect(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 py-2 text-xs font-semibold text-blue-800 transition-colors">
                      <ImagePlus className="size-3.5 text-blue-700" /> Galeri
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleAssignedPhotoSelect(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                  {createForm.assignedPreviewUrls && createForm.assignedPreviewUrls.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {createForm.assignedPreviewUrls.map((url, pIdx) => (
                          <div key={pIdx} className="relative group size-14 rounded-lg overflow-hidden border border-slate-200 bg-black/5 shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Evidence ${pIdx + 1}`} className="size-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                        <span className="truncate max-w-[200px]">{createForm.assignedPhotoName}</span>
                        <button
                          type="button"
                          onClick={handleAssignedPhotoRemove}
                          className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  ) : createForm.assignedPhotoUrl ? (
                    <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700 pt-1">
                      <span>✓ Foto terlampir</span>
                      <button
                        type="button"
                        onClick={handleAssignedPhotoRemove}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Start Time</Label>
                    <Input
                      type="time"
                      defaultValue="08:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">End Time</Label>
                    <Input
                      type="time"
                      defaultValue="17:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Material Used</Label>
                  <Input
                    placeholder="Material / tools dipakai"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Notes / Hasil Kerja</Label>
                  <Textarea
                    placeholder="Ringkas pekerjaan, hasil, kendala, bukti penting."
                    className="bg-white border-slate-200 text-xs"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* CONDITIONAL RENDER: CUSTOM ACTIVITY MODE */}
            {createForm.sourceMode === 'custom' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Custom Activity (Aktivitas Mandiri)</span>
                  <Badge className="bg-sky-600 text-white border-0 text-xs">Custom Mode</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Custom Activity *</Label>
                  <Input
                    placeholder="Custom activity name"
                    value={createForm.customName || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customName: e.target.value }))}
                    className="bg-white border-slate-200 h-9 text-xs font-semibold text-slate-800"
                  />
                </div>

                {/* Photo Evidence Section */}
                <div className="rounded-xl border border-sky-100 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Camera className="size-3.5 text-slate-500" /> Photo Evidence <span className="text-rose-500 font-bold">*</span>
                    </span>
                    {createForm.customPhotoUrl || (createForm.customPhotos && createForm.customPhotos.length > 0) ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold">
                        ✓ Terunggah
                      </Badge>
                    ) : createForm.customUploading ? (
                      <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold animate-pulse">
                        Mengunggah...
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-700 border-0 text-[10px] font-bold">
                        Wajib Diunggah
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 py-2 text-xs font-semibold text-sky-800 transition-colors">
                      <Camera className="size-3.5 text-sky-700" /> Kamera
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          handleCustomPhotoSelect(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 py-2 text-xs font-semibold text-sky-800 transition-colors">
                      <ImagePlus className="size-3.5 text-sky-700" /> Galeri
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleCustomPhotoSelect(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                  {createForm.customPreviewUrls && createForm.customPreviewUrls.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {createForm.customPreviewUrls.map((url, pIdx) => (
                          <div key={pIdx} className="relative group size-14 rounded-lg overflow-hidden border border-slate-200 bg-black/5 shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Evidence ${pIdx + 1}`} className="size-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                        <span className="truncate max-w-[200px]">{createForm.customPhotoName}</span>
                        <button
                          type="button"
                          onClick={handleCustomPhotoRemove}
                          className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  ) : createForm.customPhotoUrl ? (
                    <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700 pt-1">
                      <span>✓ Foto terlampir</span>
                      <button
                        type="button"
                        onClick={handleCustomPhotoRemove}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Description</Label>
                  <Textarea
                    placeholder="Jelaskan aktivitas custom."
                    value={createForm.customDescription || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customDescription: e.target.value }))}
                    className="bg-white border-slate-200 text-xs"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Start Time</Label>
                    <Input
                      type="time"
                      defaultValue="08:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">End Time</Label>
                    <Input
                      type="time"
                      defaultValue="17:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Material Used</Label>
                  <Input
                    placeholder="Material / tools dipakai"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Notes / Hasil Kerja</Label>
                  <Textarea
                    placeholder="Ringkas pekerjaan, hasil, kendala, bukti penting."
                    className="bg-white border-slate-200 text-xs"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* CONDITIONAL RENDER: SELF INPUT ACTIVITY MODE */}
            {(!createForm.sourceMode || createForm.sourceMode === 'self_input') && (
              <div className="space-y-4">
                {/* LIBRARY ACTIVITY & GROUP KAMUS AKTIVITAS */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Library Activity & Group Kamus Aktivitas</span>
                    <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {(createForm.items || []).filter(i => i?.label?.trim()).length} DIPILIH
                    </span>
                  </div>

                  {/* Trigger Button Buka Kamus Aktivitas (Route Group Tree Modal) */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => setIsPickerModalOpen(true)}
                      className="h-9 text-xs font-bold gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs px-4"
                    >
                      <ListFilter className="size-4 text-white" /> Buka Kamus Aktivitas (Route Group Tree)
                    </Button>
                  </div>
                </div>

                {/* MODAL DIALOG: PILIH KAMUS AKTIVITAS (PARITY WITH MOBILE) */}
                <Dialog open={isPickerModalOpen} onOpenChange={setIsPickerModalOpen}>
                  <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    {/* Header Dark Minimalist */}
                    <div className="bg-[#003f78] px-5 py-3.5 text-white flex items-center justify-between">
                      <div>
                        <DialogTitle className="text-base font-bold text-white">Pilih Kamus Aktivitas</DialogTitle>
                        <p className="text-xs text-blue-100 mt-0.5">Pilih aktivitas berdasarkan route group &amp; aktivitas mandiri</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPickerModalOpen(false)}
                        className="text-blue-200 hover:text-white p-1 rounded-md transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Search Bar */}
                      <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 flex items-center gap-2 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                        <Search className="size-4 text-slate-400" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Cari kode atau nama activity..."
                          className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                        />
                        {pickerSearch ? (
                          <button
                            type="button"
                            onClick={() => setPickerSearch('')}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="size-3.5" />
                          </button>
                        ) : null}
                      </div>

                      {/* Status Count Bar */}
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 border border-slate-200/80">
                        <span>{totalVisibleLibraryCount} library tampil</span>
                        <span>{(createForm.items || []).filter((i) => i?.label?.trim()).length} dipilih</span>
                      </div>

                      {/* Scrollable Content */}
                      <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
                        {/* 1. Dynamic Route Groups & Folders Accordion */}
                        {matchingRouteFolders.map((route) => {
                          const isRouteExpanded = expandedPickerGroups.has(route.routeName) || Boolean(pickerSearch)
                          return (
                            <div key={route.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedPickerGroups((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(route.routeName)) next.delete(route.routeName)
                                    else next.add(route.routeName)
                                    return next
                                  })
                                }}
                                className="w-full flex items-center justify-between bg-slate-50/90 hover:bg-slate-100/90 px-3.5 py-2.5 text-left font-bold text-slate-800 text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Layers className="size-4 text-[#003f78] shrink-0" />
                                  <span className="truncate">{route.routeName}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {route.matchingGroups.reduce((acc, g) => acc + g.matchingItems.length, 0)} Activity
                                  </span>
                                  <ChevronRight className={`size-4 transition-transform text-slate-500 ${isRouteExpanded ? 'rotate-90' : ''}`} />
                                </div>
                              </button>

                              {isRouteExpanded && (
                                <div className="p-2 space-y-2.5 bg-slate-50/40 border-t border-slate-100">
                                  {route.matchingGroups.map((group) => {
                                    const isAllGroupSelected =
                                      group.matchingItems.length > 0 &&
                                      group.matchingItems.every((sub) =>
                                        (createForm.items || []).some(
                                          (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
                                        )
                                      )
                                    const selectedInGroupCount = group.matchingItems.filter((sub) =>
                                      (createForm.items || []).some(
                                        (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
                                      )
                                    ).length

                                    return (
                                      <div key={group.id} className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                                        <div className="flex w-full items-center justify-between px-1 text-left text-xs font-bold text-slate-700">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="truncate">{group.groupName}</span>
                                            {group.matchingItems.length > 0 && (
                                              <span className="text-[10px] font-bold text-[#003f78] bg-[#eaf4fb] px-1.5 py-0.5 rounded-full shrink-0">
                                                {selectedInGroupCount}/{group.matchingItems.length}
                                              </span>
                                            )}
                                          </div>
                                          {group.matchingItems.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                toggleGroupItems(group.matchingItems)
                                              }}
                                              className={
                                                isAllGroupSelected
                                                  ? 'text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 transition shrink-0'
                                                  : 'text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-[#003f78] text-white hover:bg-[#002f5a] active:scale-95 transition shadow-xs shrink-0'
                                              }
                                            >
                                              {isAllGroupSelected ? 'Hapus Semua' : 'Pilih Group (Semua)'}
                                            </button>
                                          )}
                                        </div>

                                        <div className="space-y-1.5 pt-1">
                                          {group.matchingItems.map((sub) => {
                                            const isSelected = (createForm.items || []).some(
                                              (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
                                            )
                                            const requirementBadges = [
                                              sub.requiresEquipmentNo ? 'Equipment' : null,
                                              sub.requiresDuration ? 'Duration' : null,
                                              sub.requiresTireCount ? 'Tire' : null,
                                              sub.requiresLocationGps ? 'GPS' : null,
                                              sub.requiresPhoto ? 'Photo' : null,
                                            ].filter(Boolean)

                                            return (
                                              <div
                                                key={sub.id}
                                                onClick={() => {
                                                  if (isSelected) {
                                                    const idxToRemove = (createForm.items || []).findIndex(
                                                      (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
                                                    )
                                                    if (idxToRemove >= 0) removeItemRow(idxToRemove)
                                                  } else {
                                                    addPresetActivity(`${sub.code} - ${sub.name}`, sub.basePoints || 5)
                                                  }
                                                }}
                                                className={`flex items-center justify-between rounded-xl p-3 cursor-pointer transition border ${
                                                  isSelected
                                                    ? 'bg-[#003f78] text-white border-[#003f78] shadow-sm'
                                                    : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
                                                }`}
                                              >
                                                <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-black tracking-wider uppercase ${isSelected ? 'text-white' : 'text-[#003f78]'}`}>
                                                      {sub.code}
                                                    </span>
                                                    {(sub.basePoints || 0) > 0 ? (
                                                      <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#003f78]'
                                                      }`}>
                                                        +{sub.basePoints} pts
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                  <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-100' : 'text-slate-800'}`}>
                                                    {sub.name}
                                                  </p>
                                                  {requirementBadges.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                      {requirementBadges.map((badge, bIdx) => (
                                                        <span
                                                          key={bIdx}
                                                          className={`rounded-md px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                                                            isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                                                          }`}
                                                        >
                                                          {badge}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  ) : null}
                                                </div>
                                                <span
                                                  className={`size-6 shrink-0 flex items-center justify-center rounded-full transition ${
                                                    isSelected
                                                      ? 'bg-white text-[#003f78]'
                                                      : 'bg-white border border-slate-200 text-slate-400'
                                                  }`}
                                                >
                                                  {isSelected ? <Check className="size-3.5 stroke-[3]" /> : <ListFilter className="size-3.5" />}
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* 2. Standalone / Aktivitas Mandiri Section */}
                        {standaloneLibraries.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-1.5 px-1 py-1 text-xs font-bold text-[#486275] uppercase tracking-wider">
                              <Sparkles className="size-3.5 text-amber-500" />
                              <span>Aktivitas Mandiri / Kamus Lainnya ({standaloneLibraries.length})</span>
                            </div>

                            <div className="space-y-1.5">
                              {standaloneLibraries.map((item) => {
                                const isSelected = (createForm.items || []).some(
                                  (i) => i?.label?.includes(item.code) || i?.label?.includes(item.name)
                                )
                                const requirementBadges = [
                                  item.requiresEquipmentNo ? 'Equipment' : null,
                                  item.requiresDuration ? 'Duration' : null,
                                  item.requiresTireCount ? 'Tire' : null,
                                  item.requiresLocationGps ? 'GPS' : null,
                                  item.requiresPhoto ? 'Photo' : null,
                                ].filter(Boolean)

                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        const idxToRemove = (createForm.items || []).findIndex(
                                          (i) => i?.label?.includes(item.code) || i?.label?.includes(item.name)
                                        )
                                        if (idxToRemove >= 0) removeItemRow(idxToRemove)
                                      } else {
                                        addPresetActivity(`${item.code} - ${item.name}`, item.basePoints || 10)
                                      }
                                    }}
                                    className={`flex items-center justify-between rounded-xl p-3 cursor-pointer transition border ${
                                      isSelected
                                        ? 'bg-[#003f78] text-white border-[#003f78] shadow-sm'
                                        : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-black tracking-wider uppercase ${isSelected ? 'text-white' : 'text-[#003f78]'}`}>
                                          {item.code}
                                        </span>
                                        {(item.basePoints || 0) > 0 ? (
                                          <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                            isSelected ? 'bg-white/20 text-white' : 'bg-[#eaf4fb] text-[#003f78]'
                                          }`}>
                                            +{item.basePoints} pts
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-100' : 'text-slate-800'}`}>
                                        {item.name}
                                      </p>
                                      {requirementBadges.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                          {requirementBadges.map((b, bIdx) => (
                                            <span
                                              key={bIdx}
                                              className={`rounded-md px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                                                isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                                              }`}
                                            >
                                              {b}
                                            </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                    <span
                                      className={`size-6 shrink-0 flex items-center justify-center rounded-full transition ${
                                        isSelected
                                          ? 'bg-white text-[#003f78]'
                                          : 'bg-white border border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      {isSelected ? <Check className="size-3.5 stroke-[3]" /> : <ListFilter className="size-3.5" />}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {totalVisibleLibraryCount === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs font-semibold text-slate-500">
                            Tidak ada kamus aktivitas yang cocok dengan pencarian &quot;{pickerSearch}&quot;.
                          </div>
                        )}
                      </div>

                      {/* Bottom Submit Button */}
                      <Button
                        type="button"
                        onClick={() => setIsPickerModalOpen(false)}
                        className="h-10 w-full rounded-xl bg-[#003f78] hover:bg-[#00315c] text-white font-bold text-xs shadow-xs mt-2"
                      >
                        PAKAI {(createForm.items || []).filter((i) => i?.label?.trim()).length} ACTIVITY
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* SELECTED LIBRARY CHECKLIST CARDS */}
                {(createForm.items || []).filter(i => i?.label?.trim()).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">SELECTED LIBRARY CHECKLIST</span>
                        <h5 className="text-xs font-bold text-slate-800">
                          {(createForm.items || []).filter(i => i?.label?.trim()).length} activity siap diisi
                        </h5>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {createForm.items.filter(i => i?.label?.trim()).map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5 relative">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold font-mono text-slate-500">#{idx + 1} • {item.label.split(' - ')[0] || 'SVC'}</p>
                              <h6 className="text-xs font-bold text-slate-800">{item.label.split(' - ')[1] || item.label}</h6>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition-colors text-xs font-bold"
                              title="Hapus activity"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Mulai</Label>
                              <Input
                                type="time"
                                value={(item as any).startTime || '08:00'}
                                onChange={(e) => updateItemRow(idx, 'startTime', e.target.value)}
                                className="h-8 text-xs bg-white border-slate-200 text-center font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Selesai</Label>
                              <Input
                                type="time"
                                value={(item as any).endTime || '08:30'}
                                onChange={(e) => updateItemRow(idx, 'endTime', e.target.value)}
                                className="h-8 text-xs bg-white border-slate-200 text-center font-mono"
                              />
                            </div>
                          </div>

                          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Camera className="size-3.5 text-sky-600" /> Photo Evidence <span className="text-rose-500 font-bold">*</span>
                              </span>
                              {item.photoUrl || (item.photos && item.photos.length > 0) ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold">
                                  ✓ Terunggah
                                </Badge>
                              ) : item.uploading ? (
                                <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold animate-pulse">
                                  Mengunggah...
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-700 border-0 text-[10px] font-bold">
                                  Wajib Diunggah
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-2xs transition-all active:scale-95">
                                <Camera className="size-3.5 text-sky-600" /> Kamera
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => {
                                    handleItemPhotoSelect(idx, e.target.files)
                                    e.target.value = ''
                                  }}
                                />
                              </label>
                              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-2xs transition-all active:scale-95">
                                <ImagePlus className="size-3.5 text-sky-600" /> Galeri
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    handleItemPhotoSelect(idx, e.target.files)
                                    e.target.value = ''
                                  }}
                                />
                              </label>
                            </div>

                            {item.previewUrls && item.previewUrls.length > 0 ? (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex flex-wrap gap-2">
                                  {item.previewUrls.map((url, pIdx) => (
                                    <div key={pIdx} className="relative group size-14 rounded-lg overflow-hidden border border-slate-200 bg-black/5 shadow-2xs">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={url} alt={`Evidence ${pIdx + 1}`} className="size-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                                  <span className="truncate max-w-[200px]">{item.photoName}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleItemPhotoRemove(idx)}
                                    className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer"
                                  >
                                    Hapus Foto
                                  </button>
                                </div>
                              </div>
                            ) : item.photoUrl ? (
                              <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700 pt-1">
                                <span>✓ Foto terlampir</span>
                                <button
                                  type="button"
                                  onClick={() => handleItemPhotoRemove(idx)}
                                  className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Catatan Item</Label>
                            <Input
                              placeholder="Hasil kerja, temuan, atau catatan singkat."
                              value={item.remark || ''}
                              onChange={(e) => updateItemRow(idx, 'remark', e.target.value)}
                              className="h-8 text-xs bg-white border-slate-200"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Signatories & Verification Matrix (Approval) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-700"></span>
                  B. Penandatangan Approval (Signatories)
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">Approval Leader / PJO</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Leader / Supervisor / PJO</Label>
                <SearchableSelect
                  label="Leader"
                  placeholder="PILIH LEADER / PJO..."
                  value={createForm.leaderEmployeeId}
                  onValueChange={(val) => {
                    const emp = employees.find((e) => String(e.id) === val)
                    setCreateForm((p) => ({
                      ...p,
                      leaderEmployeeId: val,
                      leaderName: emp?.name || '',
                    }))
                  }}
                  options={employeeOptions}
                  widthClassName="w-full"
                />
              </div>
            </div>
          </div>

          {createError ? (
            <div className="mx-6 mb-3 rounded-xl border-2 border-red-400 bg-red-50 p-3.5 text-xs flex items-start gap-2.5 shadow-md animate-in fade-in duration-200">
              <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <p className="font-extrabold text-red-900">Perhatian: Formulir Belum Lengkap</p>
                <p className="font-semibold text-red-700 leading-relaxed">{createError}</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateError(null)}
                className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateSession} disabled={isCreating} className={hcPrimaryActionClassName}>
              {isCreating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Hapus Sesi Daily Activity?</DialogTitle>
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
              {isDeleting ? 'Menghapus...' : 'Hapus Sesi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Modal */}
      <Dialog open={isBatchDeleteModalOpen} onOpenChange={(open) => !open && !isBatchDeleting && setIsBatchDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Trash2 className="size-5 text-red-600" />
              Hapus {selectedIds.length} Sesi Terpilih?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Tindakan ini akan menghapus permanen <b>{selectedIds.length} sesi Daily Activity</b> yang dipilih beserta seluruh item aktivitas dan histori approval terkait. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchDeleteModalOpen(false)}
              disabled={isBatchDeleting}
              className="h-8.5 rounded-lg border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="h-8.5 rounded-lg bg-red-600 px-3.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isBatchDeleting ? 'Menghapus...' : `Ya, Hapus (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Missing Signature Warning Dialog */}
      <MissingSignatureDialog
        isOpen={isSignatureWarningOpen}
        onClose={() => setIsSignatureWarningOpen(false)}
        onSignatureRegistered={(sigUrl) => {
          setHasRegisteredSignature(true)
          setIsSignatureWarningOpen(false)
          toast.success('Tanda tangan digital berhasil didaftarkan! Silakan lanjutkan persetujuan dokumen.')
        }}
      />

      {/* 5. Approved Documents Summary Modal */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Ringkasan Dokumen Aktivitas Disetujui ({approvedRows.length})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Daftar seluruh dokumen Daily Activity yang telah disetujui secara lengkap dan sah dengan tanda tangan digital terverifikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 my-2">
            {approvedRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada dokumen aktivitas yang berstatus Approved.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {approvedRows.map((row) => (
                  <div key={row.sessionId} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{row.sessionCode}</span>
                        <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] py-0 px-2">Approved</Badge>
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{row.employeeName} ({row.employeeSn})</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(row.workDate)} • Shift {row.shiftCode} • {row.siteName} • {row.totalItems} aktivitas ({row.totalPoints} pts)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsSummaryOpen(false)
                          setPreviewTarget(row)
                        }}
                        className="h-8 text-xs font-medium"
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Lihat PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-3 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSummaryOpen(false)}
              className="text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Signature Widget for User Profile Signature Management */}
      <SignatureFloatingWidget
        onSignatureUpdated={handleSignatureSaved}
        openModalDirectly={openDirectSignatureModal}
        onCloseDirectModal={() => setOpenDirectSignatureModal(false)}
      />

      {/* Evidence Viewer Modal */}
      <DailyActivityEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        sessionId={evidenceModalSessionId || previewTarget?.sessionId || null}
      />
    </AdminPageShell>
  )
}
