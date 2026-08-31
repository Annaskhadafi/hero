'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Bug,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  Download,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  FileText,
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
  X,
  XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { downloadElementAsPdf, downloadHtmlAsPdf, generateElementAsPdfBlob, generateHtmlAsPdfBlob, downloadFilesAsZip } from '@/lib/pdf-download'

import { AdminPageShell } from '@/components/admin-page-shell'
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
  generateTestDailyActivityApproval,
  sendDueDailyActivityReminders,
  saveDailyActivityWorkflowSettings,
} from '@/app/dashboard/activity-hub/actions'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import {
  type DailyActivityWorkflowSettings,
  DEFAULT_DAILY_ACTIVITY_SETTINGS,
} from '@/lib/workflow-settings-defaults'

export type SessionApprovalRow = {
  sessionId: number
  sessionCode: string
  workDate: Date | string | null
  shiftCode: string
  sessionStatus: string
  employeeName: string
  employeeSn: string
  department?: string
  section?: string
  jobTitle?: string
  customerName?: string
  siteName: string
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
    status: string
    approverName: string | null
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
  sectionHeadMap = {},
  deptHeadMap = {},
  initialSettings,
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
  activityPresets?: Array<{ id: number; code: string; name: string; basePoints?: number | null }>
  sectionHeadMap?: Record<string, number | null>
  deptHeadMap?: Record<string, number | null>
  initialSettings?: DailyActivityWorkflowSettings
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
    items: [
      { label: 'P5M & Briefing Keselamatan Kerja', unitNumber: '', duration: '30m', points: 5, remark: 'Selesai briefing & hazard review' },
      { label: 'Pemeriksaan / Inspeksi Lapangan Rutin', unitNumber: 'WS-01', duration: '60m', points: 10, remark: 'Kondisi operasional normal' },
    ],
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
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBatchApproving, setIsBatchApproving] = useState(false)
  const [isSignatureWarningOpen, setIsSignatureWarningOpen] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [openDirectSignatureModal, setOpenDirectSignatureModal] = useState(false)
  const [hasRegisteredSignature, setHasRegisteredSignature] = useState(true)

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

  const selectedBatchRows = useMemo(
    () => (rows || []).filter((r) => selectedIds.includes(r.sessionId)),
    [rows, selectedIds]
  )
  const currentBatchDoc = selectedBatchRows[batchReviewIndex] || selectedBatchRows[0] || null

  const handleOpenBatchReview = () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu aktivitas untuk direview')
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
      const currentRemark = approvalRemarks[currentBatchDoc.sessionId] || ''
      const res = await singleApproveDailyActivityAction(currentBatchDoc.sessionId, currentRemark)
      if (res.success) {
        toast.success(`Dokumen ${currentBatchDoc.sessionCode} berhasil disetujui.`)
        if (batchReviewIndex < selectedBatchRows.length - 1) {
          setBatchReviewIndex((prev) => prev + 1)
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
    const customRemark = approvalRemarks[currentBatchDoc.sessionId] || prompt('Masukkan alasan pengembalian dokumen (revert) untuk revisi:')
    if (customRemark === null) return
    setIsBatchActionRunning(true)
    try {
      const res = await singleRevertDailyActivityAction(currentBatchDoc.sessionId, customRemark || 'Dokumen dikembalikan untuk revisi.')
      if (res.success) {
        toast.success(`Dokumen ${currentBatchDoc.sessionCode} dikembalikan.`)
        if (batchReviewIndex < selectedBatchRows.length - 1) {
          setBatchReviewIndex((prev) => prev + 1)
        } else {
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
    const customRemark = approvalRemarks[currentBatchDoc.sessionId] || prompt('Masukkan alasan penolakan dokumen (reject):')
    if (customRemark === null) return
    setIsBatchActionRunning(true)
    try {
      const res = await singleRejectDailyActivityAction(currentBatchDoc.sessionId, customRemark || 'Dokumen ditolak.')
      if (res.success) {
        toast.success(`Dokumen ${currentBatchDoc.sessionCode} ditolak.`)
        if (batchReviewIndex < selectedBatchRows.length - 1) {
          setBatchReviewIndex((prev) => prev + 1)
        } else {
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

  const handleCreateSession = async () => {
    if (!createForm.employeeId) {
      toast.error('Pilih karyawan terlebih dahulu')
      return
    }
    const validItems = createForm.items.filter((it) => it.label.trim().length > 0)
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 item aktivitas')
      return
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
        items: validItems,
      })
      if (res.success && res.sessionId) {
        const emp = employees.find((e) => String(e.id) === createForm.employeeId)
        const st = sites.find((s) => String(s.id) === createForm.siteId)
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
            { stepOrder: 1, stepLabel: 'Karyawan Sign', status: 'pending', approverName: createForm.employeeName || emp?.name || 'Karyawan', signedAt: null },
            { stepOrder: 2, stepLabel: 'Leader / PJO', status: 'waiting', approverName: createForm.leaderName || 'Leader', signedAt: null },
            { stepOrder: 3, stepLabel: 'Section Head', status: 'waiting', approverName: createForm.superiorName || 'Section Head', signedAt: null },
          ],
        }
        setRows((prev) => [newRow, ...prev])
        toast.success('Sesi Daily Activity berhasil disimpan!')
        setCreateOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal membuat sesi aktivitas')
      }
    } catch {
      toast.error('Terjadi kesalahan saat membuat sesi aktivitas')
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
      const batchEl = document.getElementById('batch-activity-preview-sheet')
      const previewEl = document.getElementById('activity-preview-sheet')
      const targetEl = (batchEl && currentBatchDoc?.sessionId === row.sessionId) ? batchEl : (previewEl && previewTarget?.sessionId === row.sessionId ? previewEl : null)
      if (targetEl) {
        await downloadElementAsPdf(targetEl, `DailyActivity_${row.sessionCode.replace(/[\/\\]/g, '_')}.pdf`)
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
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: center; text-transform: capitalize; font-weight: bold;">${step.status}</td>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: center; font-size: 7pt; font-family: monospace;">${formatTimestamp(step.signedAt)}</td>
                  <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-size: 7.5pt; font-style: italic;">${step.remarks || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="font-weight: bold; margin-bottom: 0.25rem;">B. Signatories & Verification Matrix</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center;">
            <thead>
              <tr style="background: #f8fafc; font-weight: bold;">
                <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Pemohon / Karyawan</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Leader / Pengawas</th>
                <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Section Head</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                ${row.approvals.map((a) => `
                  <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                    <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                      ${a.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">Menunggu TTD</span>'}
                    </div>
                    <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                      <p style="font-weight: bold; font-size: 8pt;">${a.approverName || '—'}</p>
                      <p style="font-size: 7pt; color: #64748b;">${formatTimestamp(a.signedAt)}</p>
                    </div>
                  </td>
                `).join('')}
              </tr>
            </tbody>
          </table>

          <div style="text-align: right; font-size: 7pt; color: #64748b; margin-top: 8px;">
            F.HC.DAR.001.01 • PT Chitra Paratama
          </div>
        `
        await downloadHtmlAsPdf(contentHtml, `DailyActivity_${row.sessionCode.replace(/[\/\\]/g, '_')}.pdf`)
      }
      toast.success('PDF berhasil diunduh!', { id: 'act-pdf-dl' })
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
                <td style="border: 1px solid black; padding: 3px 5px; text-align: center; text-transform: capitalize; font-weight: bold;">${step.status}</td>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: center; font-size: 7pt; font-family: monospace;">${formatTimestamp(step.signedAt)}</td>
                <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-size: 7.5pt; font-style: italic;">${step.remarks || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="font-weight: bold; margin-bottom: 0.25rem;">B. Signatories & Verification Matrix</div>
        <table style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead>
            <tr style="background: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Pemohon / Karyawan</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Leader / Pengawas</th>
              <th style="border: 1px solid black; padding: 3px 5px; width: 33%;">Section Head</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              ${(row.approvals || []).map((a) => `
                <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
                  <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 8px;">
                    ${a.status === 'approved' ? 'Tanda Tangan Sah' : '<span style="color: #94a3b8; font-style: italic;">Menunggu TTD</span>'}
                  </div>
                  <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                    <p style="font-weight: bold; font-size: 8pt;">${a.approverName || '—'}</p>
                    <p style="font-size: 7pt; color: #64748b;">${formatTimestamp(a.signedAt)}</p>
                  </div>
                </td>
              `).join('')}
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
            <Button onClick={() => setCreateOpen(true)} className={hcPrimaryActionClassName}>
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
              <Button
                size="sm"
                onClick={handleOpenBatchReview}
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
                    <EnterpriseActionButtons
                      access={access}
                      labels={{ view: 'Print Preview', edit: 'Edit', delete: 'Hapus' }}
                      onView={() => setPreviewTarget(row)}
                      onEdit={() => router.push(`/dashboard/activity-hub/document/${row.sessionId}/approval`)}
                      onDelete={() => setDeleteTarget(row)}
                    />
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
                    <h2 className="text-center font-bold text-[12pt] mb-3">DAILY ACTIVITY APPROVAL REPORT</h2>

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
                      </tbody>
                    </table>

                    {/* A. Daily Activity Items */}
                    <div className="font-bold mb-1">
                      A. Daily Activity Items (Total: {(currentBatchDoc.items || []).length} item, {(currentBatchDoc.items || []).reduce((s, i) => s + (Number(i?.points) || 0), 0) || currentBatchDoc.totalPoints} poin)
                    </div>
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-50 text-center font-bold">
                          <th className="w-[8%]">#</th>
                          <th className="text-left w-[36%]">Aktivitas</th>
                          <th className="w-[14%]">Unit</th>
                          <th className="w-[12%]">Durasi</th>
                          <th className="w-[10%]">Poin</th>
                          <th className="text-left w-[20%]">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBatchDoc.items && currentBatchDoc.items.length > 0 ? (
                          currentBatchDoc.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="text-center">{idx + 1}</td>
                              <td>{item.label}</td>
                              <td className="text-center">{item.unitNumber || '-'}</td>
                              <td className="text-center">{item.duration || '-'}</td>
                              <td className="text-center font-semibold">{item.points}</td>
                              <td>{item.remark || '-'}</td>
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
                                <td className="text-left">{step.approverName || '-'}</td>
                                <td className="capitalize font-semibold">{step.status}</td>
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
                        return (
                          <div>
                            <div className="text-[7pt] text-gray-500 mb-1">Employee Signature</div>
                            <div className="h-16 flex items-end">
                              {step1?.signatureDataUrl && (
                                <img src={step1.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                              )}
                            </div>
                            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                              {currentBatchDoc.employeeName}
                            </div>
                            <div className="text-[7pt]">{currentBatchDoc.jobTitle || 'Employee'}</div>
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
                        return (
                          <div>
                            <div className="text-[7pt] text-gray-500 mb-1">Leader / Supervisor Signature</div>
                            <div className="h-16 flex items-end">
                              {step2?.signatureDataUrl && (
                                <img src={step2.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                              )}
                            </div>
                            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                              {step2?.approverName || 'Leader / Supervisor'}
                            </div>
                            <div className="text-[7pt]">{step2?.stepLabel || 'Leader'}</div>
                            <div className="text-[6.5pt] text-gray-500">{formatTimestamp(step2?.signedAt)}</div>
                            {remark2 ? <div className="text-[6.5pt] italic text-slate-600 mt-0.5 max-w-[160px] leading-tight break-words whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Catatan: {remark2}</div> : null}
                          </div>
                        )
                      })()}

                      {/* 3. Section Head */}
                      {(() => {
                        const activeStep = currentBatchDoc.approvals.find(a => a.status === 'pending') || currentBatchDoc.approvals[0]
                        const step3 = currentBatchDoc.approvals.find(a => a.stepOrder === 3)
                        const isStep3Active = step3 && step3.status === 'pending' && step3.stepOrder === activeStep?.stepOrder
                        const remark3 = isStep3Active && approvalRemarks[currentBatchDoc.sessionId]
                          ? approvalRemarks[currentBatchDoc.sessionId]
                          : step3?.remarks
                        return (
                          <div>
                            <div className="text-[7pt] text-gray-500 mb-1">Section Head Signature</div>
                            <div className="h-16 flex items-end">
                              {step3?.signatureDataUrl && (
                                <img src={step3.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                              )}
                            </div>
                            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                              {step3?.approverName || 'Section Head'}
                            </div>
                            <div className="text-[7pt]">{step3?.stepLabel || 'Section Head'}</div>
                            <div className="text-[6.5pt] text-gray-500">{formatTimestamp(step3?.signedAt)}</div>
                            {remark3 ? <div className="text-[6.5pt] italic text-slate-600 mt-0.5 max-w-[160px] leading-tight break-words whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Catatan: {remark3}</div> : null}
                          </div>
                        )
                      })()}
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

      {/* PDF Quick Preview Dialog - Overtime Record Viewer Style */}
      <Dialog open={Boolean(previewTarget)} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent showCloseButton={false} className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-[#2d3238] border-slate-700 shadow-2xl rounded-xl">
          {/* Top Viewer Toolbar */}
          <div className="bg-[#1e232a] px-4 py-2.5 flex items-center justify-between border-b border-slate-700/80 select-none text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">📄</span>
              <span className="font-semibold text-xs text-slate-100 truncate">
                Daily Activity Report • {previewTarget?.sessionCode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                1 / 1
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs rounded font-semibold gap-1.5 bg-slate-700 hover:bg-slate-600 text-white border-0"
                disabled={isDownloadingPdf}
                onClick={() => previewTarget && handleDownloadActivityPdf(previewTarget)}
              >
                <Download className="size-3.5" /> Unduh PDF
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs rounded font-bold gap-1 bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => previewTarget && router.push(`/dashboard/activity-hub/document/${previewTarget.sessionId}/approval`)}
              >
                Buka Form Approval ↗
              </Button>
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Viewer Canvas Area */}
          {previewTarget && (
            <div className="flex-1 overflow-y-auto overflow-x-auto bg-[#383d47] p-5 flex justify-center items-start">
              <div
                id="activity-preview-sheet"
                className="relative mx-auto w-[210mm] min-h-[297mm] shrink-0 overflow-hidden bg-white shadow-[0_10px_35px_rgba(0,0,0,0.5)] rounded-xs"
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
                  <h2 className="text-center font-bold text-[12pt] mb-3">DAILY ACTIVITY APPROVAL REPORT</h2>

                  {/* Section 1: Details */}
                  <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8.5pt]">
                    <tbody>
                      <tr>
                        <td colSpan={2} className="font-bold bg-slate-50">Details</td>
                      </tr>
                      <tr>
                        <td className="w-1/2">Tanggal Kerja: {formatDate(previewTarget.workDate)}</td>
                        <td className="w-1/2">Shift: {previewTarget.shiftCode || '—'}</td>
                      </tr>
                      <tr>
                        <td>Kode Sesi: {previewTarget.sessionCode}</td>
                        <td>Status: <span className="capitalize font-semibold">{previewTarget.sessionStatus}</span></td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="font-bold bg-slate-50">Employee Profile</td>
                      </tr>
                      <tr>
                        <td>Nama: {previewTarget.employeeName}</td>
                        <td>SN: {previewTarget.employeeSn}</td>
                      </tr>
                      <tr>
                        <td>Job Title: {previewTarget.jobTitle || 'Serviceman'}</td>
                        <td>Dept / Section: {[previewTarget.department, previewTarget.section].filter(Boolean).join(' / ') || '—'}</td>
                      </tr>
                      <tr>
                        <td>Site: {previewTarget.siteName || '—'}</td>
                        <td>Customer: {previewTarget.customerName || '—'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* A. Daily Activity Items */}
                  <div className="font-bold mb-1">
                    A. Daily Activity Items (Total: {(previewTarget.items || []).length} item, {(previewTarget.items || []).reduce((s, i) => s + (Number(i?.points) || 0), 0) || previewTarget.totalPoints} poin)
                  </div>
                  <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                    <thead>
                      <tr className="bg-slate-50 text-center font-bold">
                        <th className="w-[8%]">#</th>
                        <th className="text-left w-[36%]">Aktivitas</th>
                        <th className="w-[14%]">Unit</th>
                        <th className="w-[12%]">Durasi</th>
                        <th className="w-[10%]">Poin</th>
                        <th className="text-left w-[20%]">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTarget.items && previewTarget.items.length > 0 ? (
                        previewTarget.items.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="text-center">{idx + 1}</td>
                            <td>{item.label}</td>
                            <td className="text-center">{item.unitNumber || '-'}</td>
                            <td className="text-center">{item.duration || '-'}</td>
                            <td className="text-center font-semibold">{item.points}</td>
                            <td>{item.remark || '-'}</td>
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
                  <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]">
                    <thead>
                      <tr className="bg-slate-50 font-bold">
                        <th className="w-[8%]">#</th>
                        <th className="text-left w-[28%]">Tahap</th>
                        <th className="text-left w-[28%]">Approver</th>
                        <th className="w-[16%]">Status</th>
                        <th className="w-[20%]">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTarget.approvals.map((step) => (
                        <tr key={step.stepOrder}>
                          <td>{step.stepOrder}</td>
                          <td className="text-left">{step.stepLabel}</td>
                          <td className="text-left">{step.approverName || '-'}</td>
                          <td className="capitalize font-semibold">{step.status}</td>
                          <td className="text-[7pt]">{step.signedAt ? new Date(step.signedAt).toLocaleDateString('id-ID') : '—'}</td>
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
                        {previewTarget.approvals.find(a => a.stepOrder === 1)?.signatureDataUrl && (
                          <img src={previewTarget.approvals.find(a => a.stepOrder === 1)!.signatureDataUrl!} alt="TTD" className="h-14 object-contain" />
                        )}
                      </div>
                      <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                        {previewTarget.employeeName}
                      </div>
                      <div className="text-[7pt]">{previewTarget.jobTitle || 'Employee'}</div>
                    </div>

                    {/* 2. Leader */}
                    <div>
                      <div className="text-[7pt] text-gray-500 mb-1">Leader / Supervisor Signature</div>
                      <div className="h-16 flex items-end">
                        {previewTarget.approvals.find(a => a.stepOrder === 2)?.signatureDataUrl && (
                          <img src={previewTarget.approvals.find(a => a.stepOrder === 2)!.signatureDataUrl!} alt="TTD" className="h-14 object-contain" />
                        )}
                      </div>
                      <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                        {previewTarget.approvals.find(a => a.stepOrder === 2)?.approverName || 'Leader / Supervisor'}
                      </div>
                      <div className="text-[7pt]">{previewTarget.approvals.find(a => a.stepOrder === 2)?.stepLabel || 'Leader'}</div>
                    </div>

                    {/* 3. Section Head */}
                    <div>
                      <div className="text-[7pt] text-gray-500 mb-1">Section Head Signature</div>
                      <div className="h-16 flex items-end">
                        {previewTarget.approvals.find(a => a.stepOrder === 3)?.signatureDataUrl && (
                          <img src={previewTarget.approvals.find(a => a.stepOrder === 3)!.signatureDataUrl!} alt="TTD" className="h-14 object-contain" />
                        )}
                      </div>
                      <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                        {previewTarget.approvals.find(a => a.stepOrder === 3)?.approverName || 'Section Head'}
                      </div>
                      <div className="text-[7pt]">{previewTarget.approvals.find(a => a.stepOrder === 3)?.stepLabel || 'Section Head'}</div>
                    </div>
                  </div>

                  <div className="text-right text-[7pt] text-gray-500 mt-2">
                    F.HC.DAR.001.01 • PT Chitra Paratama
                  </div>
                </div>
              </div>
            </div>
          )}
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
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs">F.HC.DAR</span>
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

            {/* 2. Daftar Aktivitas Harian (Items) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-600"></span>
                  A. Daily Activity Items (Aktivitas & Pekerjaan)
                </span>
                <Badge variant="secondary" className="text-[11px] font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {(createForm.items || []).filter((i) => i?.label?.trim()).length} Aktivitas • {(createForm.items || []).reduce((s, i) => s + (Number(i?.points) || 0), 0)} Poin
                </Badge>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">Preset Cepat:</span>
                {[
                  { name: 'P5M & Safety Briefing Awal Shift', pts: 5 },
                  { name: 'P2H & Pemeriksaan Alat Kerja', pts: 5 },
                  { name: 'Inspeksi Tekanan & Kondisi Tyre Unit HD', pts: 10 },
                  { name: 'Pemasangan & Dismounting Tyre OTR', pts: 15 },
                  { name: 'Housekeeping & 5R Area Workshop', pts: 5 },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => addPresetActivity(preset.name, preset.pts)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-900 transition-colors shadow-2xs"
                  >
                    <Plus className="size-3 text-teal-600" /> {preset.name}
                  </button>
                ))}
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-12 gap-2 bg-slate-100/80 px-3 py-2 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-4">Uraian Aktivitas / Pekerjaan *</div>
                  <div className="col-span-2">No. Unit</div>
                  <div className="col-span-1 text-center">Durasi</div>
                  <div className="col-span-1 text-center">Poin</div>
                  <div className="col-span-2">Remark / Catatan</div>
                  <div className="col-span-1 text-center">Aksi</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {createForm.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-50/50">
                      <div className="col-span-1 text-center font-bold text-slate-500 text-[11px]">
                        {idx + 1}
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Nama aktivitas / pekerjaan..."
                          value={item.label}
                          onChange={(e) => updateItemRow(idx, 'label', e.target.value)}
                          className="h-8 text-xs border-slate-200"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="e.g. HD-785-01"
                          value={item.unitNumber}
                          onChange={(e) => updateItemRow(idx, 'unitNumber', e.target.value)}
                          className="h-8 text-xs border-slate-200 font-mono"
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          className="w-full h-8 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] shadow-2xs"
                          value={item.duration}
                          onChange={(e) => updateItemRow(idx, 'duration', e.target.value)}
                        >
                          <option value="30m">30m</option>
                          <option value="60m">60m</option>
                          <option value="90m">90m</option>
                          <option value="120m">120m</option>
                          <option value="180m">180m</option>
                          <option value="240m">240m</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={item.points}
                          onChange={(e) => updateItemRow(idx, 'points', Number(e.target.value))}
                          className="h-8 text-xs text-center border-slate-200 font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="Catatan hasil..."
                          value={item.remark}
                          onChange={(e) => updateItemRow(idx, 'remark', e.target.value)}
                          className="h-8 text-xs border-slate-200"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                          onClick={() => removeItemRow(idx)}
                          disabled={createForm.items.length <= 1}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                  className="h-8 text-xs font-semibold gap-1.5 border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-white"
                >
                  <Plus className="size-3.5 text-slate-500" /> Tambah Baris Aktivitas
                </Button>
                <p className="text-[11px] text-slate-400">
                  Item aktivitas akan masuk ke daftar review & dokumen PDF Daily Activity.
                </p>
              </div>
            </div>

            {/* 3. Signatories & Verification Matrix (Approval) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-600"></span>
                  B. Signatories & Verification Matrix (Penandatangan Approval)
                </span>
                <span className="text-[11px] font-mono text-slate-400">2-Tier Verification (Leader & Section Head)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Leader / Supervisor</Label>
                  <SearchableSelect
                    label="Leader"
                    placeholder="PILIH LEADER..."
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
                  <p className="text-[10px] text-slate-400">Verifikasi tahap 1 (Leader Lapangan / PJO)</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Section Head</Label>
                  <SearchableSelect
                    label="Section Head"
                    placeholder="PILIH SECTION HEAD..."
                    value={createForm.superiorEmployeeId}
                    onValueChange={(val) => {
                      const emp = employees.find((e) => String(e.id) === val)
                      setCreateForm((p) => ({
                        ...p,
                        superiorEmployeeId: val,
                        superiorName: emp?.name || '',
                      }))
                    }}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <p className="text-[10px] text-slate-400">Verifikasi tahap 2 (Kepala Seksi)</p>
                </div>
              </div>
            </div>
          </div>

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

      {/* 4. Missing Signature Warning Dialog */}
      <Dialog open={isSignatureWarningOpen} onOpenChange={setIsSignatureWarningOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Tanda Tangan Belum Didaftarkan
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 my-2">
            <p className="text-xs text-amber-900 font-medium">
              Daftarkan?
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSignatureWarningOpen(false)}
              className="text-xs"
            >
              Nanti
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleProceedToRegisterSignature}
              className="bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <PenTool className="mr-1.5 h-3.5 w-3.5" />
              Ya, Daftarkan Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </AdminPageShell>
  )
}
