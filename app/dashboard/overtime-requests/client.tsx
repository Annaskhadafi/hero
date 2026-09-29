'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Loader2,
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
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { downloadElementAsPdf, downloadHtmlAsPdf, generateElementAsPdfBlob, generateHtmlAsPdfBlob, downloadFilesAsZip } from '@/lib/pdf-download'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import type { RouteFolder } from '@/lib/daily-activity'
import { SplEvidenceQrBox } from '@/components/overtime-document-qr'
import QRCode from 'qrcode'

import { AdminPageShell } from '@/components/admin-page-shell'
import { MissingSignatureDialog } from '@/components/missing-signature-dialog'
import { HcWorkspaceBanner, hcPrimaryActionClassName } from '@/components/hc/hc-workspace-banner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EnterpriseActionButtons, type TableRbacAccess } from '@/components/ui/enterprise-table-kit'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
// MultiSelect filter dropdown
import { MultiSelectFilterDropdown } from '@/components/ui/multi-select-filter-dropdown'
import { AdminImportDialog } from '@/components/admin/admin-import-dialog'
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
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import {
  batchApproveOvertimeRequestsAction,
  batchRejectOvertimeRequestsAction,
  batchRevertOvertimeRequestsAction,
  batchDeleteOvertimeRequestsAction,
  singleApproveOvertimeRequestAction,
  singleRejectOvertimeRequestAction,
  singleRevertOvertimeRequestAction,
  createOvertimeCommandLetterAction,
  deleteOvertimeCommandLetterAction,
  generateTestOvertimeApproval,
  sendDueOvertimeReminders,
  saveOvertimeWorkflowSettings,
} from '@/app/dashboard/overtime-requests/actions'
import {
  type OvertimeWorkflowSettings,
  DEFAULT_OVERTIME_SETTINGS,
} from '@/lib/workflow-settings-defaults'
import {
  resolveEmployeeApproverHierarchy,
  type EmployeeHierarchyInfo,
} from '@/lib/overtime-hierarchy'

export type OvertimeActivityLibraryItem = {
  id: number
  activityCode: string
  activityName: string
  category?: string | null
  basePoints?: number | string | null
  slaHours?: number | string | null
  requiresEquipmentNo?: boolean | null
}

export type OvertimeCreateLineItem = {
  lineLabel: string
  code?: string
  name?: string
  unitNumber?: string
  materialUsed?: string
  tireCount?: number
  startTime?: string
  endTime?: string
  duration?: string
  points?: number
  targetUnit?: string
  estimatedMinutes?: number
  plannedPoints?: number
  remark?: string
  photoUrl?: string | null
  photos?: string[]
  libraryActivityId?: number
  requiresEquipmentNo?: boolean
  requiresDuration?: boolean
  requiresLocationGps?: boolean
  requiresTireCount?: boolean
  requiresMaterialUsed?: boolean
  requiresPhoto?: boolean
}

export type OvertimeListingRow = {
  id: number
  splNumber: string
  title: string
  workDate: Date | string
  plannedStartAt: Date | string | null
  plannedEndAt: Date | string | null
  status: string
  requestedByEmployeeId?: number | null
  requesterName: string
  requesterDepartment: string
  requestNotes?: string | null
  workerCount: number
  participants?: Array<{
    employeeName: string
    shiftCode: string
    rosterType: string
    category: string
  }>
  lineItems?: Array<{
    lineLabel: string
    targetUnit?: string | null
    estimatedMinutes: number
    plannedPoints: number
    code?: string
    name?: string
    unitNumber?: string | null
    tireCount?: number | null
    materialUsed?: string | null
    startTime?: string | null
    endTime?: string | null
    duration?: string | null
    remark?: string | null
    photoUrl?: string | null
    photos?: string[]
  }>
  approvals: Array<{
    stepOrder: number
    stepLabel: string
    approverRole?: string | null
    status: string
    approverName: string
    approverEmail?: string | null
    approverEmployeeId?: number | null
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

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

function formatTime(value: Date | string | null | undefined) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-0',
    submitted: 'bg-blue-50 text-blue-700 border-0',
    rejected: 'bg-rose-50 text-rose-700 border-0',
    returned: 'bg-amber-50 text-amber-700 border-0',
    draft: 'bg-slate-100 text-slate-600 border-0',
  }
  const s = status.toLowerCase()
  return (
    <Badge className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize tracking-normal ${map[s] || map.draft}`}>
      {s === 'approved' ? 'Completed' : s === 'submitted' ? 'Submitted' : status}
    </Badge>
  )
}

function ApprovalProgressBadge({ approvals }: { approvals: OvertimeListingRow['approvals'] }) {
  const approved = approvals.filter((a) => a.status === 'approved' || a.status === 'signed' || a.status === 'completed' || Boolean(a.signatureDataUrl) || Boolean(a.signedAt)).length
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
      {approved}/{total} APPROVED
    </Badge>
  )
}

export function OvertimeListingClient({
  rows: propRows,
  employees = [],
  activityLibraries = [],
  routeFolders = [],
  initialSettings,
  currentEmployeeId,
  currentEmployeeEmail = null,
  currentEmployeeName = '',
  isAdmin = false,
}: {
  rows: OvertimeListingRow[]
  employees?: EmployeeHierarchyInfo[]
  activityLibraries?: OvertimeActivityLibraryItem[]
  routeFolders?: RouteFolder[]
  initialSettings?: OvertimeWorkflowSettings
  currentEmployeeId?: number | null
  currentEmployeeEmail?: string | null
  currentEmployeeName?: string | null
  isAdmin?: boolean
}) {
  const router = useRouter()
  const access: TableRbacAccess = { canView: true, canEdit: true, canDelete: true }

  const [rows, setRows] = useState<OvertimeListingRow[]>(propRows)
  useEffect(() => {
    setRows(propRows)
  }, [propRows])

  // Test approval state
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testLinks, setTestLinks] = useState<Array<{ step: number; role: string; name: string; url: string }>>([])
  const [isGeneratingTest, setIsGeneratingTest] = useState(false)

  // Reminders state
  const [isSendingReminders, setIsSendingReminders] = useState(false)

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState<OvertimeWorkflowSettings>(
    () => initialSettings || DEFAULT_OVERTIME_SETTINGS
  )

  const updateSectionHead = (key: string, employeeIdStr: string) => {
    const emp: any = employees.find((e) => String(e.id) === employeeIdStr)
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

  const updateApproverField = (role: 'manager' | 'hr' | 'leader', employeeIdStr: string) => {
    const emp: any = employees.find((e) => String(e.id) === employeeIdStr)
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
          leaderName: emp.name,
          leaderEmail: emp.email || (prev.approvalMatrix as any)?.leaderEmail,
        },
      }
    })
  }

  const handleSaveSettings = async () => {
    const res = await saveOvertimeWorkflowSettings(settingsForm)
    if (res.success) {
      toast.success('Overtime (SPL) workflow settings saved')
      setSettingsOpen(false)
    } else {
      toast.error(res.error || 'Failed to save settings')
    }
  }

  const [approvalRemarks, setApprovalRemarks] = useState<Record<number, string>>({})

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<{
    title: string
    workDate: string
    plannedStartDate: string
    plannedStartTime: string
    plannedEndDate: string
    plannedEndTime: string
    requesterEmployeeId: string
    requesterName: string
    requesterDepartment: string
    requestNotes: string
    executionNotes: string
    leaderEmployeeId: string
    leaderName: string
    superiorEmployeeId: string
    superiorName: string
    managerEmployeeId: string
    managerName: string
    photoUrl: string
    sourceMode?: 'self_input' | 'assigned' | 'custom'
    assignmentId?: string
    customDescription?: string
    workers: Array<{
      employeeId: string
      employeeName: string
      shiftCode: string
      rosterType: string
      category: string
    }>
    lineItems: OvertimeCreateLineItem[]
  }>({
    title: '',
    workDate: new Date().toISOString().split('T')[0],
    plannedStartDate: new Date().toISOString().split('T')[0],
    plannedStartTime: '17:00',
    plannedEndDate: new Date().toISOString().split('T')[0],
    plannedEndTime: '21:00',
    requesterEmployeeId: '',
    requesterName: '',
    requesterDepartment: '',
    requestNotes: '',
    executionNotes: '',
    leaderEmployeeId: '',
    leaderName: '',
    superiorEmployeeId: '',
    superiorName: '',
    managerEmployeeId: '',
    managerName: '',
    photoUrl: '',
    sourceMode: 'self_input',
    assignmentId: '',
    customDescription: '',
    workers: [
      { employeeId: '', employeeName: '', shiftCode: 'DS', rosterType: '5:2', category: 'after_mandatory_ot' },
    ],
    lineItems: [],
  })
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const employeeOptions = useMemo(() => {
    return employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.name} — ${emp.position || emp.department || 'Employee'} (${emp.employeeId || emp.id})`,
    }))
  }, [employees])

  // Floating Window: Kamus Aktivitas route picker dialog
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [expandedPickerGroups, setExpandedPickerGroups] = useState<Set<string>>(new Set())

  const normalizedPickerSearch = useMemo(() => {
    return (pickerSearch || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  }, [pickerSearch])

  const availableLibraryMap = useMemo(() => {
    const map = new Map<string, OvertimeActivityLibraryItem>()
    for (const p of activityLibraries || []) {
      map.set(String(p.id), p)
      if (p.activityCode) map.set(p.activityCode.toLowerCase(), p)
      if (p.activityName) map.set(p.activityName.toLowerCase(), p)
    }
    return map
  }, [activityLibraries])

  const groupedLibraryIdSet = useMemo(() => {
    const set = new Set<string>()
    for (const folder of routeFolders || []) {
      const folderCode = (folder.routeCode || '').trim().toLowerCase()
      const folderName = (folder.routeName || '').trim().toLowerCase()

      for (const lib of availableLibraryMap.values()) {
        const libCode = (lib.activityCode || '').trim().toLowerCase()
        const libName = (lib.activityName || '').trim().toLowerCase()

        if (
          (libCode && (folderCode === `grp-${libCode}` || folderCode === libCode)) ||
          (libName && (folderName === `group: ${libName}` || folderName === libName))
        ) {
          set.add(String(lib.id))
        }
      }

      for (const group of folder.groups || []) {
        const groupKey = ((group as any).groupKey || '').trim().toLowerCase()
        const groupName = (group.groupName || '').trim().toLowerCase()

        for (const lib of availableLibraryMap.values()) {
          const libCode = (lib.activityCode || '').trim().toLowerCase()
          const libName = (lib.activityName || '').trim().toLowerCase()

          if (
            (libCode && (groupKey === `grp-${libCode}` || groupKey === libCode)) ||
            (libName && (groupName === `group: ${libName}` || groupName === libName))
          ) {
            set.add(String(lib.id))
          }
        }

        for (const item of group.items || []) {
          if (item.libraryActivityId != null) {
            set.add(String(item.libraryActivityId))
          }
        }
      }
    }
    return set
  }, [routeFolders, availableLibraryMap])

  const matchingRouteFolders = useMemo(() => {
    return (routeFolders || [])
      .map((route) => {
        const matchingGroups = (route.groups || [])
          .map((group) => {
            const matchingItems = (group.items || [])
              .map((i) => {
                if (i.libraryActivityId != null) {
                  const lib = availableLibraryMap.get(String(i.libraryActivityId))
                  if (lib) {
                    const isTire = (i.itemLabel || lib.activityName || '').toLowerCase().includes('tire') || (i.itemLabel || lib.activityName || '').toLowerCase().includes('ban')
                    return {
                      id: lib.id,
                      code: i.itemCode || lib.activityCode,
                      name: i.itemLabel || lib.activityName,
                      basePoints: i.pointOverride != null ? i.pointOverride : (lib.basePoints ? Number(lib.basePoints) : 10),
                      category: lib.category || 'Route Activity',
                      requiresEquipmentNo: i.requiresUnit != null ? i.requiresUnit : Boolean(lib.requiresEquipmentNo),
                      requiresDuration: i.requiresTime != null ? i.requiresTime : true,
                      requiresPhoto: i.requiresPhoto != null ? i.requiresPhoto : false,
                      requiresTireCount: isTire,
                      requiresMaterialUsed: false,
                    }
                  }
                }
                const isTire = (i.itemLabel || '').toLowerCase().includes('tire') || (i.itemLabel || '').toLowerCase().includes('ban')
                return {
                  id: -(i.id || Math.abs((i.itemCode || i.itemLabel || 'item').split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0))),
                  code: i.itemCode || 'CUSTOM',
                  name: i.itemLabel || 'Aktivitas Route',
                  basePoints: i.pointOverride ?? 10,
                  category: 'Route Activity',
                  requiresEquipmentNo: i.requiresUnit ?? false,
                  requiresDuration: i.requiresTime ?? true,
                  requiresPhoto: i.requiresPhoto ?? false,
                  requiresTireCount: isTire,
                  requiresMaterialUsed: false,
                }
              })
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
    const presets = activityLibraries || []
    return presets
      .filter((p) => !groupedLibraryIdSet.has(String(p.id)))
      .filter((p) => {
        if (!normalizedPickerSearch) return true
        const nCode = (p.activityCode || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const nName = (p.activityName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        return nCode.includes(normalizedPickerSearch) || nName.includes(normalizedPickerSearch)
      })
      .sort((a, b) => (Number(b.basePoints) || 0) - (Number(a.basePoints) || 0))
  }, [activityLibraries, groupedLibraryIdSet, normalizedPickerSearch])

  const totalVisibleLibraryCount = useMemo(() => {
    const groupCount = (matchingRouteFolders || []).reduce(
      (sum, r) => sum + (r?.matchingGroups || []).reduce((gSum, g) => gSum + (g?.matchingItems?.length || 0), 0),
      0
    )
    return groupCount + (standaloneLibraries || []).length
  }, [matchingRouteFolders, standaloneLibraries])

  const [isUploadingLinePhoto, setIsUploadingLinePhoto] = useState<Record<number | string, boolean>>({})

  const toggleGroupItems = (items: Array<{ id: number; name: string; code?: string; basePoints?: number | string | null; requiresEquipmentNo?: boolean; requiresDuration?: boolean; requiresTireCount?: boolean; requiresMaterialUsed?: boolean; requiresPhoto?: boolean }>) => {
    const isAllSelected = items.every((sub) =>
      (createForm.lineItems || []).some(
        (i) => i.lineLabel === sub.name || (sub.code && i.lineLabel.includes(sub.code)) || i.lineLabel.includes(sub.name)
      )
    )

    if (isAllSelected) {
      setCreateForm((p) => ({
        ...p,
        lineItems: p.lineItems.filter(
          (i) => !items.some((sub) => i.lineLabel === sub.name || (sub.code && i.lineLabel.includes(sub.code)) || i.lineLabel.includes(sub.name))
        ),
      }))
    } else {
      const missing = items.filter(
        (sub) => !(createForm.lineItems || []).some(
          (i) => i.lineLabel === sub.name || (sub.code && i.lineLabel.includes(sub.code)) || i.lineLabel.includes(sub.name)
        )
      )
      setCreateForm((p) => ({
        ...p,
        lineItems: [
          ...p.lineItems,
          ...missing.map((sub) => ({
            lineLabel: `${sub.code ? `${sub.code} - ` : ''}${sub.name}`,
            code: sub.code,
            name: sub.name,
            unitNumber: '',
            materialUsed: '',
            tireCount: sub.requiresTireCount ? 1 : 0,
            startTime: p.plannedStartTime || '17:00',
            endTime: p.plannedEndTime || '21:00',
            duration: '120m',
            points: Number(sub.basePoints) || 10,
            targetUnit: '1 Job',
            estimatedMinutes: 120,
            plannedPoints: Number(sub.basePoints) || 10,
            remark: '',
            photoUrl: null,
            photos: [],
            libraryActivityId: sub.id > 0 ? sub.id : undefined,
            requiresEquipmentNo: sub.requiresEquipmentNo ?? false,
            requiresDuration: sub.requiresDuration ?? true,
            requiresTireCount: sub.requiresTireCount ?? false,
            requiresMaterialUsed: sub.requiresMaterialUsed ?? false,
            requiresPhoto: sub.requiresPhoto ?? false,
          })),
        ],
      }))
    }
  }

  const toggleLineItem = (name: string, code?: string, basePoints?: number | string | null, meta?: Partial<{ requiresEquipmentNo: boolean; requiresDuration: boolean; requiresTireCount: boolean; requiresMaterialUsed: boolean; requiresPhoto: boolean }>) => {
    setCreateForm((p) => {
      const existingIdx = p.lineItems.findIndex(
        (i) => i.lineLabel === name || (code && i.lineLabel.includes(code)) || i.lineLabel.includes(name)
      )
      if (existingIdx >= 0) {
        return {
          ...p,
          lineItems: p.lineItems.filter((_, idx) => idx !== existingIdx),
        }
      }
      const isTire = meta?.requiresTireCount ?? ((name || '').toLowerCase().includes('tire') || (name || '').toLowerCase().includes('ban'))
      return {
        ...p,
        lineItems: [
          ...p.lineItems,
          {
            lineLabel: `${code ? `${code} - ` : ''}${name}`,
            code,
            name,
            unitNumber: '',
            materialUsed: '',
            tireCount: isTire ? 1 : 0,
            startTime: p.plannedStartTime || '17:00',
            endTime: p.plannedEndTime || '21:00',
            duration: '120m',
            points: Number(basePoints) || 10,
            targetUnit: '1 Job',
            estimatedMinutes: 120,
            plannedPoints: Number(basePoints) || 10,
            remark: '',
            photoUrl: null,
            photos: [],
            requiresEquipmentNo: meta?.requiresEquipmentNo ?? false,
            requiresDuration: meta?.requiresDuration ?? true,
            requiresTireCount: isTire,
            requiresMaterialUsed: meta?.requiresMaterialUsed ?? false,
            requiresPhoto: meta?.requiresPhoto ?? false,
          },
        ],
      }
    })
  }

  const updateLineItemRow = (idx: number, field: string, val: any) => {
    setCreateForm((p) => {
      const next = [...p.lineItems]
      if (next[idx]) {
        next[idx] = { ...next[idx], [field]: val }
      }
      return { ...p, lineItems: next }
    })
  }

  const handleLinePhotoUpload = async (targetIdx: number, file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5MB')
      return
    }

    setIsUploadingLinePhoto((prev) => ({ ...prev, [targetIdx]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadTarget', 'activity-photos')
      const res = await uploadFile(formData)
      if (res.success && (res.readableUrl || res.url)) {
        const finalUrl = res.readableUrl || res.url
        updateLineItemRow(targetIdx, 'photoUrl', finalUrl)
        updateLineItemRow(targetIdx, 'photos', [finalUrl])
        toast.success('Foto evidence berhasil diunggah')
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          const base64Url = reader.result as string
          updateLineItemRow(targetIdx, 'photoUrl', base64Url)
          updateLineItemRow(targetIdx, 'photos', [base64Url])
          toast.success('Foto evidence tersimpan')
        }
        reader.readAsDataURL(file)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        const base64Url = reader.result as string
        updateLineItemRow(targetIdx, 'photoUrl', base64Url)
        updateLineItemRow(targetIdx, 'photos', [base64Url])
        toast.success('Foto evidence tersimpan')
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploadingLinePhoto((prev) => ({ ...prev, [targetIdx]: false }))
    }
  }

  const removeLineItemRow = (idx: number) => {
    setCreateForm((p) => ({
      ...p,
      lineItems: p.lineItems.filter((_, i) => i !== idx),
    }))
  }

  const addCustomLineItemRow = () => {
    setCreateForm((p) => ({
      ...p,
      lineItems: [
        ...p.lineItems,
        {
          lineLabel: '',
          name: '',
          targetUnit: '1 Unit',
          estimatedMinutes: 120,
          plannedPoints: 10,
          startTime: p.plannedStartTime || '17:00',
          endTime: p.plannedEndTime || '21:00',
          duration: '120m',
          points: 10,
          remark: '',
        },
      ],
    }))
  }

  const addAssignedLineItemRow = () => {
    setCreateForm((p) => ({
      ...p,
      lineItems: [
        ...p.lineItems,
        {
          lineLabel: '',
          name: '',
          targetUnit: '1 Unit',
          estimatedMinutes: 120,
          plannedPoints: 10,
          startTime: p.plannedStartTime || '17:00',
          endTime: p.plannedEndTime || '21:00',
          duration: '120m',
          points: 10,
          remark: '',
        },
      ],
    }))
  }

  const activitySelectOptions = useMemo(() => {
    return (activityLibraries || []).map((lib) => ({
      value: `${lib.activityCode ? `${lib.activityCode} - ` : ''}${lib.activityName}`,
      label: `${lib.activityCode ? `[${lib.activityCode}] ` : ''}${lib.activityName}`,
    }))
  }, [activityLibraries])

  const addWorkerRow = () => {
    setCreateForm((p) => ({
      ...p,
      workers: [...p.workers, { employeeId: '', employeeName: '', shiftCode: 'DS', rosterType: '5:2', category: 'after_mandatory_ot' }],
    }))
  }

  const removeWorkerRow = (idx: number) => {
    setCreateForm((p) => ({
      ...p,
      workers: p.workers.filter((_, i) => i !== idx),
    }))
  }

  const updateWorkerRow = (idx: number, field: string, val: any) => {
    setCreateForm((p) => {
      const newWorkers = [...p.workers]
      let autoRequester = p.requesterEmployeeId
      let autoRequesterName = p.requesterName
      let autoDepartment = p.requesterDepartment
      let autoLeaderId = p.leaderEmployeeId
      let autoLeaderName = p.leaderName
      let autoSuperiorId = p.superiorEmployeeId
      let autoSuperiorName = p.superiorName

      if (field === 'employeeId') {
        const emp = employees.find((e) => String(e.id) === val)
        newWorkers[idx] = {
          ...newWorkers[idx],
          employeeId: val,
          employeeName: emp?.name || '',
        }
        if (val) {
          const hierarchy = resolveEmployeeApproverHierarchy(val, employees, settingsForm)
          if (idx === 0 && (!p.requesterEmployeeId || p.requesterEmployeeId === p.workers[0]?.employeeId)) {
            autoRequester = val
            autoRequesterName = hierarchy.requester?.name || ''
            if (hierarchy.department) autoDepartment = hierarchy.department
          }
          if (hierarchy.leader && (!autoLeaderId || idx === 0)) {
            autoLeaderId = String(hierarchy.leader.id)
            autoLeaderName = hierarchy.leader.name
          }
          if (hierarchy.superior && (!autoSuperiorId || idx === 0)) {
            autoSuperiorId = String(hierarchy.superior.id)
            autoSuperiorName = hierarchy.superior.name
          }
        }
      } else {
        newWorkers[idx] = {
          ...newWorkers[idx],
          [field]: val,
        }
      }
      return {
        ...p,
        workers: newWorkers,
        requesterEmployeeId: autoRequester,
        requesterName: autoRequesterName,
        requesterDepartment: autoDepartment,
        leaderEmployeeId: autoLeaderId,
        leaderName: autoLeaderName,
        superiorEmployeeId: autoSuperiorId,
        superiorName: autoSuperiorName,
      }
    })
  }

  // Import modal
  const [importOpen, setImportOpen] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<OvertimeListingRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  // PDF Preview Dialog
  const [previewSplTarget, setPreviewSplTarget] = useState<OvertimeListingRow | null>(null)

  // Batch Approval & Signature Registry State
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
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedWorkerCounts, setSelectedWorkerCounts] = useState<string[]>([])

  const departmentFilterOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.requesterDepartment) set.add(r.requesterDepartment)
    })
    employees?.forEach((e) => {
      if (e.department) set.add(e.department)
    })
    return Array.from(set).filter(Boolean).sort()
  }, [rows, employees])

  const statusFilterOptions = ['Approved', 'Submitted', 'Draft', 'Rejected']
  const workerCountFilterOptions = ['1 - 3 Orang', '4 - 10 Orang', '> 10 Orang']

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDepartments.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedWorkerCounts.length > 0

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedDepartments([])
    setSelectedStatuses([])
    setSelectedWorkerCounts([])
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchSearch =
          (row.requesterName || '').toLowerCase().includes(q) ||
          (row.splNumber || '').toLowerCase().includes(q) ||
          (row.title || '').toLowerCase().includes(q) ||
          (row.requesterDepartment || '').toLowerCase().includes(q) ||
          (row.requestNotes || '').toLowerCase().includes(q) ||
          ((row as any).workers || row.participants || []).some((w: any) => (w.employeeName || '').toLowerCase().includes(q))
        if (!matchSearch) return false
      }

      if (selectedDepartments.length > 0) {
        if (!selectedDepartments.includes(row.requesterDepartment || '')) return false
      }

      if (selectedStatuses.length > 0) {
        const rowStatus = (row.status || '').toLowerCase()
        const match = selectedStatuses.some((status) => {
          const s = status.toLowerCase()
          if (s.includes('approved')) return rowStatus === 'approved'
          if (s.includes('submitted')) return rowStatus === 'submitted'
          if (s.includes('draft')) return rowStatus === 'draft'
          if (s.includes('rejected')) return rowStatus === 'rejected'
          return rowStatus === s
        })
        if (!match) return false
      }

      if (selectedWorkerCounts.length > 0) {
        const count = row.workerCount || 0
        const match = selectedWorkerCounts.some((range) => {
          if (range.includes('1 - 3') && count >= 1 && count <= 3) return true
          if (range.includes('4 - 10') && count >= 4 && count <= 10) return true
          if (range.includes('> 10') && count > 10) return true
          return false
        })
        if (!match) return false
      }

      return true
    })
  }, [rows, searchQuery, selectedDepartments, selectedStatuses, selectedWorkerCounts])

  const approvedRows = rows.filter(
    (r) =>
      r.status.toLowerCase() === 'approved' ||
      (r.approvals && r.approvals.length > 0 && r.approvals.every((a) => a.status === 'approved'))
  )

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRows.map((r) => r.id))
    }
  }

  const toggleSelectRow = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false)
  const [batchReviewIndex, setBatchReviewIndex] = useState(0)
  const [isBatchActionRunning, setIsBatchActionRunning] = useState(false)

  const isRowReviewableByCurrentUser = (row: OvertimeListingRow) => {
    const status = (row.status || '').toLowerCase()
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
    const matchesEmail = Boolean(currentEmpEmail) && Boolean(activeStep.approverEmail) && (activeStep.approverEmail || '').toLowerCase().trim() === currentEmpEmail
    const matchesName = Boolean(currentEmpName) && Boolean(activeStep.approverName) && (activeStep.approverName || '').toLowerCase().trim() === currentEmpName

    return Boolean(matchesId || matchesEmail || matchesName)
  }

  const selectedBatchRows = useMemo(
    () => (rows || []).filter((r) => selectedIds.includes(r.id)),
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
      toast.error('Pilih minimal satu dokumen SPL untuk direview')
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
      const docId = currentBatchDoc.id
      const splNum = currentBatchDoc.splNumber
      const remarks = approvalRemarks[docId]
      const res = await singleApproveOvertimeRequestAction(docId, remarks)
      if (res.success) {
        toast.success(`Dokumen SPL ${splNum} berhasil disetujui.`)
        const remainingIds = selectedIds.filter((id) => id !== docId)
        setSelectedIds(remainingIds)
        const remainingRows = selectedBatchRows.filter((r) => r.id !== docId)
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
        toast.error(res.error || 'Gagal menyetujui dokumen SPL.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleSingleRevertCurrent = async () => {
    if (!currentBatchDoc) return
    setIsBatchActionRunning(true)
    try {
      const docId = currentBatchDoc.id
      const splNum = currentBatchDoc.splNumber
      const remarks = approvalRemarks[docId]
      const res = await singleRevertOvertimeRequestAction(docId, remarks)
      if (res.success) {
        toast.success(`Dokumen SPL ${splNum} dikembalikan.`)
        const remainingIds = selectedIds.filter((id) => id !== docId)
        setSelectedIds(remainingIds)
        const remainingRows = selectedBatchRows.filter((r) => r.id !== docId)
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
        toast.error(res.error || 'Gagal mengembalikan dokumen SPL.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsBatchActionRunning(false)
    }
  }

  const handleSingleRejectCurrent = async () => {
    if (!currentBatchDoc) return
    setIsBatchActionRunning(true)
    try {
      const docId = currentBatchDoc.id
      const splNum = currentBatchDoc.splNumber
      const remarks = approvalRemarks[docId]
      const res = await singleRejectOvertimeRequestAction(docId, remarks)
      if (res.success) {
        toast.success(`Dokumen SPL ${splNum} ditolak.`)
        const remainingIds = selectedIds.filter((id) => id !== docId)
        setSelectedIds(remainingIds)
        const remainingRows = selectedBatchRows.filter((r) => r.id !== docId)
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
        toast.error(res.error || 'Gagal menolak dokumen SPL.')
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
      const remarks = currentBatchDoc ? approvalRemarks[currentBatchDoc.id] : undefined
      const res = await batchApproveOvertimeRequestsAction(selectedIds, remarks)
      if (res.success) {
        toast.success(`${res.approvedCount} dokumen SPL berhasil disetujui!`)
        setIsBatchReviewOpen(false)
        setSelectedIds([])
        router.refresh()
      } else if ((res as any).needsSignatureRegistration) {
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
      const remarks = currentBatchDoc ? approvalRemarks[currentBatchDoc.id] : undefined
      const res = await batchRevertOvertimeRequestsAction(selectedIds, remarks)
      if (res.success) {
        toast.success(`${res.revertedCount} dokumen SPL berhasil dikembalikan!`)
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
      const remarks = currentBatchDoc ? approvalRemarks[currentBatchDoc.id] : undefined
      const res = await batchRejectOvertimeRequestsAction(selectedIds, remarks)
      if (res.success) {
        toast.success(`${res.rejectedCount} dokumen SPL berhasil ditolak!`)
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

  function renderSplHtmlTemplate(row: OvertimeListingRow, qrImgHtml: string) {
    const requesterApproval = (row.approvals || []).find((a) => a.stepOrder === 1)
    const leaderApproval = (row.approvals || []).find((a) => a.stepOrder === 2 || a.stepOrder === 3)
    const isLeaderApproved = leaderApproval?.status === 'approved'

    const participantsListHtml = row.participants && row.participants.length > 0
      ? row.participants.map((p, idx) => `
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-weight: bold;">${p.employeeName}</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${p.shiftCode || 'DS'}</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${p.rosterType || '5:2'}</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center; text-transform: capitalize; font-size: 7.5pt;">${(p.category || 'after_mandatory_ot').replace(/_/g, ' ')}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">1</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: left; font-weight: bold;">${row.requesterName}</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">DS</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">5:2</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center; text-transform: capitalize; font-size: 7.5pt;">After Mandatory OT</td>
          </tr>
        `

    const lineItemsListHtml = row.lineItems && row.lineItems.length > 0
      ? row.lineItems.map((item, idx) => {
          const actName = item.name || item.lineLabel || row.title
          const actCode = item.code ? `<strong>[${item.code}]</strong> ` : ''
          const tireMat = [
            item.tireCount ? `${item.tireCount} Ban` : null,
            item.materialUsed ? item.materialUsed : null,
          ].filter(Boolean).join(' • ') || '—'
          const timeStr = item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.estimatedMinutes ? `${item.estimatedMinutes} m` : '—')
          const hasPhoto = item.photoUrl || (Array.isArray(item.photos) && item.photos.length > 0)
          return `
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${idx + 1}</td>
              <td style="border: 1px solid black; padding: 3px 5px; text-align: left;">
                <div style="font-weight: 600;">${actCode}${actName}</div>
              </td>
              <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${item.unitNumber || item.targetUnit || '—'}</td>
              <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${timeStr}</td>
              <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">${tireMat}</td>
              <td style="border: 1px solid black; padding: 3px 5px; text-align: center; font-weight: bold;">${item.plannedPoints || 0} pts</td>
              <td style="border: 1px solid black; padding: 3px 5px; text-align: center; font-size: 7pt;">
                ${hasPhoto ? '<span style="color: #059669; font-weight: bold;">📷 Ada Foto</span>' : '<span style="color: #94a3b8;">—</span>'}
                ${item.remark ? `<div style="color: #475569; font-size: 6.5pt; margin-top: 1px;">${item.remark}</div>` : ''}
              </td>
            </tr>
          `
        }).join('')
      : `
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">1</td>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: 500;">${row.title}</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">—</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">60 m</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center;">—</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center; font-weight: bold;">10 pts</td>
            <td style="border: 1px solid black; padding: 3px 5px; text-align: center; color: #94a3b8; font-size: 7pt;">—</td>
          </tr>
        `

    return `
      <div style="text-align: center; margin-bottom: 12px;">
        <h1 style="text-align: center; font-weight: bold; font-size: 11pt; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">SURAT PERINTAH LEMBUR (SPL)</h1>
        <p style="text-align: center; font-weight: bold; font-size: 8pt; color: #475569; margin: 0; letter-spacing: 0.5px;">PT CHITRAPARATAMA • HUMAN CAPITAL</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
        <tbody>
          <tr><td colspan="4" style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Details & Request Profile</td></tr>
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">SPL Number</td>
            <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-family: monospace; font-weight: bold;">${row.splNumber}</td>
            <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold; background: #f8fafc;">Work Date</td>
            <td style="border: 1px solid black; padding: 3px 5px; width: 25%; font-weight: bold;">${formatDate(row.workDate)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Title / Keperluan</td>
            <td colspan="3" style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.title || 'Overtime Command'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Requester Name</td>
            <td style="border: 1px solid black; padding: 3px 5px;">${row.requesterName || '—'}</td>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Department</td>
            <td style="border: 1px solid black; padding: 3px 5px;">${row.requesterDepartment || 'Central Services'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Planned Schedule</td>
            <td colspan="3" style="border: 1px solid black; padding: 3px 5px;">${formatDate(row.workDate)} (${formatTime(row.plannedStartAt)} s.d. ${formatTime(row.plannedEndAt)})</td>
          </tr>
          ${row.requestNotes ? `
            <tr>
              <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Request Notes</td>
              <td colspan="3" style="border: 1px solid black; padding: 3px 5px;">${row.requestNotes}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Status Dokumen</td>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; text-transform: uppercase; color: #065f46;">${row.status}</td>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold; background: #f8fafc;">Total Pekerja</td>
            <td style="border: 1px solid black; padding: 3px 5px; font-weight: bold;">${row.workerCount} Orang</td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight: bold; margin-bottom: 0.25rem;">A. Workers (${row.workerCount} Orang)</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; text-align: center;">
        <thead>
          <tr style="background: #f8fafc; font-weight: bold;">
            <th style="border: 1px solid black; padding: 3px 5px; width: 8%;">#</th>
            <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 42%;">Name</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 15%;">Shift</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 15%;">Roster</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 20%;">Category</th>
          </tr>
        </thead>
        <tbody>
          ${participantsListHtml}
        </tbody>
      </table>

      <div style="font-weight: bold; margin-bottom: 0.25rem;">B. Line Items (Aktivitas Pekerjaan)</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
        <thead>
          <tr style="background: #f8fafc; font-weight: bold; text-align: center;">
            <th style="border: 1px solid black; padding: 3px 5px; width: 6%;">#</th>
            <th style="border: 1px solid black; padding: 3px 5px; text-align: left; width: 34%;">Activity</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 15%;">Target / Unit</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 15%;">Waktu</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 12%;">Tire / Material</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 8%;">Poin</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 10%;">Evidence</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsListHtml}
        </tbody>
      </table>

      <div style="font-weight: bold; margin-bottom: 0.25rem;">C. Signatories & Approval Steps</div>
      <table style="width: 100%; border-collapse: collapse; text-align: center;">
        <thead>
          <tr style="background: #f8fafc; font-weight: bold;">
            <th style="border: 1px solid black; padding: 3px 5px; width: 50%;">Pemohon (Serviceman)</th>
            <th style="border: 1px solid black; padding: 3px 5px; width: 50%;">Leader / PJO (Site Lead)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
              <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-bottom: 6px;">
                ${requesterApproval?.signatureDataUrl ? `<img src="${requesterApproval.signatureDataUrl}" style="height: 32px; max-width: 120px; object-fit: contain; display: block; margin: 0 auto 2px;" />` : ''}
                <div>Tanda Tangan Sah</div>
              </div>
              <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                <p style="font-weight: bold; font-size: 8pt; margin: 0;">${requesterApproval?.approverName || row.requesterName}</p>
                <p style="font-size: 7pt; color: #64748b; margin: 0;">${requesterApproval?.signedAt ? new Date(requesterApproval.signedAt).toLocaleDateString('id-ID') : formatDate(row.workDate)}</p>
              </div>
            </td>
            <td style="border: 1px solid black; height: 60px; vertical-align: bottom; padding: 4px;">
              <div style="font-size: 7.5pt; color: ${isLeaderApproved ? '#059669' : '#94a3b8'}; font-weight: bold; margin-bottom: 6px;">
                ${leaderApproval?.signatureDataUrl ? `<img src="${leaderApproval.signatureDataUrl}" style="height: 32px; max-width: 120px; object-fit: contain; display: block; margin: 0 auto 2px;" />` : ''}
                <div>${isLeaderApproved ? 'Tanda Tangan Sah' : '<span style="font-style: italic;">Menunggu Persetujuan</span>'}</div>
              </div>
              <div style="border-top: 1px solid #cbd5e1; padding-top: 2px;">
                <p style="font-weight: bold; font-size: 8pt; margin: 0;">${leaderApproval?.approverName || 'Leader / PJO Site'}</p>
                <p style="font-size: 7pt; color: #64748b; margin: 0;">${leaderApproval?.signedAt ? new Date(leaderApproval.signedAt).toLocaleDateString('id-ID') : '—'}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
        <div style="font-size: 6.5pt; color: #64748b;">
          * Dokumen ini sah dan diterbitkan secara digital oleh HERO System PT Chitra Paratama.
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          ${qrImgHtml}
          <div style="text-align: right; font-size: 7pt; color: #64748b; font-family: monospace;">
            F.HC.SPL.001.01 • PT Chitra Paratama
          </div>
        </div>
      </div>
    `
  }

  const handleDownloadSplPdf = async (row: OvertimeListingRow) => {
    setIsDownloadingPdf(true)
    toast.loading('Menyiapkan file PDF...', { id: 'spl-pdf-dl' })
    try {
      const batchEl = document.getElementById('batch-spl-preview-sheet')
      const previewEl = document.getElementById('spl-preview-sheet')
      const targetEl = (batchEl && currentBatchDoc?.id === row.id) ? batchEl : (previewEl && previewSplTarget?.id === row.id ? previewEl : null)
      if (targetEl) {
        await downloadElementAsPdf(targetEl, `SPL_${row.splNumber.replace(/[\/\\]/g, '_')}.pdf`)
      } else {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const evidenceUrl = `${origin}/overtime-evidence/${row.id}`
        let qrImgHtml = ''
        try {
          const qrDataUrl = await QRCode.toDataURL(evidenceUrl, { margin: 1, width: 140, errorCorrectionLevel: 'M' })
          qrImgHtml = `
            <a href="${evidenceUrl}" target="_blank" style="text-decoration: none; color: inherit; display: inline-block; text-align: center; border: 1px solid #cbd5e1; padding: 3px; border-radius: 6px; background: #ffffff;">
              <img src="${qrDataUrl}" width="50" height="50" style="display: block; margin: 0 auto;" alt="QR Evidence" />
              <div style="font-size: 5.5pt; font-weight: bold; color: #003f78; margin-top: 2px;">Scan / Klik Foto Bukti ↗</div>
            </a>
          `
        } catch (e) {
          console.error('QR code generation error:', e)
        }

        const contentHtml = renderSplHtmlTemplate(row, qrImgHtml)
        await downloadHtmlAsPdf(contentHtml, `SPL_${row.splNumber.replace(/[\/\\]/g, '_')}.pdf`)
      }
      toast.success('PDF berhasil diunduh!', { id: 'spl-pdf-dl' })
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh PDF', { id: 'spl-pdf-dl' })
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
      'No. SPL': row.splNumber,
      'Judul Pekerjaan': row.title,
      'Tanggal Lembur': row.workDate ? new Date(row.workDate).toLocaleDateString('id-ID') : '—',
      'Jam Mulai': row.plannedStartAt ? new Date(row.plannedStartAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—',
      'Jam Selesai': row.plannedEndAt ? new Date(row.plannedEndAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—',
      'Pemohon': row.requesterName || '—',
      'Site / Lokasi': (row as any).siteName || '—',
      'Jumlah Peserta': (row as any).participantsCount || (row.participants?.length ?? 0),
      'Status Approval': (row as any).approvalStatus || row.status,
      'Status Dokumen': row.status,
      'Tanggal Dibuat': (row as any).createdAt ? formatTimestamp((row as any).createdAt) : '—',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SPL Terpilih')
    XLSX.writeFile(wb, `SPL_Selected_${selectedRows.length}_items_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Berhasil mengunduh Excel untuk ${selectedRows.length} SPL terpilih!`)
  }

  const getSplPdfBlob = async (row: OvertimeListingRow): Promise<{ name: string; blob: Blob }> => {
    const fileName = `SPL_${row.splNumber.replace(/[\/\\]/g, '_')}.pdf`
    const batchEl = document.getElementById('batch-spl-preview-sheet')
    const previewEl = document.getElementById('spl-preview-sheet')
    const targetEl = (batchEl && currentBatchDoc?.id === row.id) ? batchEl : (previewEl && previewSplTarget?.id === row.id ? previewEl : null)
    if (targetEl) {
      const blob = await generateElementAsPdfBlob(targetEl)
      return { name: fileName, blob }
    } else {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const evidenceUrl = `${origin}/overtime-evidence/${row.id}`
      let qrImgHtml = ''
      try {
        const qrDataUrl = await QRCode.toDataURL(evidenceUrl, { margin: 1, width: 140, errorCorrectionLevel: 'M' })
        qrImgHtml = `
          <a href="${evidenceUrl}" target="_blank" style="text-decoration: none; color: inherit; display: inline-block; text-align: center; border: 1px solid #cbd5e1; padding: 3px; border-radius: 6px; background: #ffffff;">
            <img src="${qrDataUrl}" width="50" height="50" style="display: block; margin: 0 auto;" alt="QR Evidence" />
            <div style="font-size: 5.5pt; font-weight: bold; color: #003f78; margin-top: 2px;">Scan / Klik Foto Bukti ↗</div>
          </a>
        `
      } catch (e) {
        console.error('QR code generation error:', e)
      }

      const contentHtml = renderSplHtmlTemplate(row, qrImgHtml)
      const blob = await generateHtmlAsPdfBlob(contentHtml)
      return { name: fileName, blob }
    }
  }

  const handleDownloadSelectedPdf = async () => {
    if (selectedIds.length === 0) return
    const selectedRows = filteredRows.filter((r) => selectedIds.includes(r.id))
    if (selectedRows.length === 0) return

    setIsDownloadingPdf(true)
    const toastId = 'bulk-spl-pdf-dl'

    try {
      if (selectedRows.length === 1) {
        toast.loading('Menyiapkan file PDF...', { id: toastId })
        await handleDownloadSplPdf(selectedRows[0])
        toast.success('PDF SPL berhasil diunduh!', { id: toastId })
      } else {
        toast.loading(`Menyiapkan ${selectedRows.length} dokumen PDF SPL ke dalam ZIP...`, { id: toastId })
        const pdfFiles: Array<{ name: string; blob: Blob }> = []
        for (let i = 0; i < selectedRows.length; i++) {
          const row = selectedRows[i]
          toast.loading(`Memproses PDF (${i + 1}/${selectedRows.length}): ${row.splNumber}...`, { id: toastId })
          const item = await getSplPdfBlob(row)
          pdfFiles.push(item)
        }
        toast.loading(`Mengompres ${pdfFiles.length} file ke format ZIP...`, { id: toastId })
        await downloadFilesAsZip(pdfFiles, `SPL_Selected_${pdfFiles.length}_items_${new Date().toISOString().slice(0, 10)}.zip`)
        toast.success(`Berhasil mengunduh ZIP berisi ${pdfFiles.length} file PDF SPL!`, { id: toastId })
      }
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh file PDF SPL', { id: toastId })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleGenerateTest = async () => {
    setIsGeneratingTest(true)
    try {
      const res = await generateTestOvertimeApproval()
      if (res.success && res.data) {
        setTestLinks(res.data.links)
        setTestModalOpen(true)
        toast.success(res.message || 'Test SPL approval berhasil di-generate!')
      } else {
        toast.error(res.message || res.error || 'Gagal generate test approval')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat membuat test approval')
    } finally {
      setIsGeneratingTest(false)
    }
  }

  const handleSendReminders = async () => {
    setIsSendingReminders(true)
    try {
      const res = await sendDueOvertimeReminders()
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

  const handleCreateSpl = async () => {
    if (!createForm.title.trim()) {
      toast.error('Judul / uraian lembur wajib diisi')
      return
    }
    const validWorkers = createForm.workers.filter((w) => w.employeeId)
    if (validWorkers.length === 0) {
      toast.error('Tambahkan minimal 1 peserta lembur (worker)')
      return
    }
    const validLineItems = createForm.lineItems.filter((item) => item.lineLabel.trim())
    if (validLineItems.length === 0) {
      toast.error('Tambahkan minimal 1 aktivitas pekerjaan lembur')
      return
    }

    // Validasi ketat: Foto Evidence WAJIB diunggah untuk setiap aktivitas lembur
    for (let i = 0; i < validLineItems.length; i++) {
      const item = validLineItems[i]
      const hasPhoto = Boolean(item.photoUrl?.trim() || (Array.isArray(item.photos) && item.photos.length > 0 && item.photos[0]?.trim()))
      if (!hasPhoto) {
        toast.error(`Foto evidence wajib diunggah untuk aktivitas #${i + 1} (${item.name || item.lineLabel})`)
        return
      }
      if (item.requiresEquipmentNo && !item.unitNumber?.trim()) {
        toast.error(`No. Equipment / Unit wajib diisi untuk aktivitas #${i + 1}`)
        return
      }
      if (item.requiresTireCount && (!item.tireCount || item.tireCount < 1)) {
        toast.error(`Jumlah Tire wajib diisi minimal 1 untuk aktivitas #${i + 1}`)
        return
      }
      if (item.requiresMaterialUsed && !item.materialUsed?.trim()) {
        toast.error(`Material Used wajib diisi untuk aktivitas #${i + 1}`)
        return
      }
    }

    setIsCreating(true)
    try {
      const startDateTime = new Date(`${createForm.plannedStartDate}T${createForm.plannedStartTime}:00`)
      const endDateTime = new Date(`${createForm.plannedEndDate}T${createForm.plannedEndTime}:00`)
      const firstPhoto = validLineItems.find((i) => i.photoUrl || (i.photos && i.photos.length > 0))?.photoUrl || createForm.photoUrl || undefined

      const res = await createOvertimeCommandLetterAction({
        title: createForm.title,
        workDate: createForm.workDate,
        plannedStartAt: startDateTime,
        plannedEndAt: endDateTime,
        photoUrl: firstPhoto,
        requestedByEmployeeId: createForm.requesterEmployeeId ? Number(createForm.requesterEmployeeId) : undefined,
        requestNotes: createForm.requestNotes,
        executionNotes: createForm.executionNotes,
        workerParticipants: validWorkers.map((w) => ({
          employeeId: Number(w.employeeId),
          shiftCode: w.shiftCode,
          rosterType: w.rosterType,
          category: w.category,
        })),
        workerEmployeeIds: validWorkers.map((w) => Number(w.employeeId)),
        lineItems: validLineItems.map((item) => ({
          lineLabel: item.lineLabel,
          code: item.code,
          name: item.name || item.lineLabel,
          unitNumber: item.unitNumber || item.targetUnit || undefined,
          tireCount: item.tireCount,
          materialUsed: item.materialUsed,
          startTime: item.startTime || createForm.plannedStartTime || '17:00',
          endTime: item.endTime || createForm.plannedEndTime || '21:00',
          duration: item.duration || (item.estimatedMinutes ? `${item.estimatedMinutes}m` : undefined),
          targetUnit: item.unitNumber || item.targetUnit || '1 Unit',
          estimatedMinutes: item.estimatedMinutes || 60,
          plannedPoints: item.plannedPoints || item.points || 10,
          points: item.points || item.plannedPoints || 10,
          lineDescription: item.remark || undefined,
          remark: item.remark,
          photoUrl: item.photoUrl,
          photos: item.photos || (item.photoUrl ? [item.photoUrl] : []),
        })),
        leaderEmployeeId: createForm.leaderEmployeeId ? Number(createForm.leaderEmployeeId) : undefined,
        leaderName: createForm.leaderName || undefined,
        superiorEmployeeId: createForm.superiorEmployeeId ? Number(createForm.superiorEmployeeId) : undefined,
        superiorName: createForm.superiorName || undefined,
        managerEmployeeId: createForm.managerEmployeeId ? Number(createForm.managerEmployeeId) : undefined,
        managerName: createForm.managerName || undefined,
      })

      if (res.success && res.data) {
        toast.success('Surat Perintah Lembur berhasil disimpan!')
        setCreateOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal membuat SPL')
      }
    } catch (err) {
      console.error('Error creating SPL:', err)
      toast.error('Terjadi kesalahan: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await deleteOvertimeCommandLetterAction(deleteTarget.id)
      if (res.success) {
        toast.success('Dokumen SPL berhasil dihapus')
        setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id))
        setDeleteTarget(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menghapus dokumen SPL')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus SPL')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    setIsBatchDeleting(true)
    try {
      const res = await batchDeleteOvertimeRequestsAction(selectedIds)
      if (res.success) {
        if (res.skippedCount && res.skippedCount > 0) {
          toast.success(`${res.deletedCount} dokumen SPL berhasil dihapus (${res.skippedCount} dokumen berstatus Approved dilewati/terkunci).`)
        } else {
          toast.success(`${res.deletedCount} dokumen SPL berhasil dihapus.`)
        }
        setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)))
        setSelectedIds([])
        setIsBatchDeleteModalOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menghapus dokumen SPL terpilih.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus dokumen SPL terpilih.')
    } finally {
      setIsBatchDeleting(false)
    }
  }

  return (
    <AdminPageShell
      eyebrow="HC • Overtime"
      title="Overtime Requests Approval"
      description="Pusat approval dan pengelolaan Surat Perintah Lembur (SPL) karyawan dengan verifikasi tanda tangan digital bertingkat."
    >
      <HcWorkspaceBanner
        badge="SURAT PERINTAH LEMBUR"
        title="Overtime Approval & Review"
        description="Review pengajuan lembur tim, tanda tangani digital secara berjenjang (Leader -> PJO / Site Lead), dan kelola penugasan lembur operasional."
        metrics={[
          { label: 'Total Pengajuan', value: rows.length },
          { label: 'Menunggu Review', value: rows.filter((r) => r.status.toLowerCase() === 'submitted').length },
          { label: 'Disetujui', value: rows.filter((r) => r.status.toLowerCase() === 'approved').length },
          { label: 'Draft', value: rows.filter((r) => r.status.toLowerCase() === 'draft').length },
        ]}
      />

      <MinimalTableShell
        label="surat perintah lembur"
        title="Daftar Review"
        description="Daftar historis evaluasi surat perintah lembur."
        fileName="overtime-requests-spl"
        searchEnabled={false}
        access={access}
        filters={
          <>
            <div className="relative w-full sm:w-[220px] sm:flex-none">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Cari SPL..."
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
              options={statusFilterOptions}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Semua status"
              label="Status"
            />
            <MultiSelectFilterDropdown
              options={workerCountFilterOptions}
              selected={selectedWorkerCounts}
              onChange={setSelectedWorkerCounts}
              placeholder="Jumlah pekerja"
              label="Pekerja"
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
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings className="size-4 mr-1.5" /> SETTINGS
            </Button>
            <Button variant="secondary" onClick={handleGenerateTest} disabled={isGeneratingTest}>
              <Bug className="size-4 mr-1.5" /> {isGeneratingTest ? 'Generating...' : 'TEST APPROVAL'}
            </Button>
            <Button variant="outline" onClick={handleSendReminders} disabled={isSendingReminders}>
              <Send className="size-4 mr-1.5" /> {isSendingReminders ? 'Sending reminders...' : 'SEND REMINDERS'}
            </Button>
            <Button onClick={() => setCreateOpen(true)} className={hcPrimaryActionClassName}>
              <Plus className="size-4 mr-1.5" /> TAMBAH SPL
            </Button>
          </div>
        }
        columnOptions={[]}
      >
        {/* Sticky Batch Approval Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <CheckCheck className="h-4 w-4 text-indigo-600" />
              <span>{selectedIds.length} dari {filteredRows.length} dokumen SPL terpilih</span>
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
                className="h-8 rounded-lg border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 uppercase shadow-sm hover:bg-rose-100 hover:text-rose-800"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
                HAPUS ({selectedIds.length})
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
              <TableHead>Karyawan / Pemohon</TableHead>
              <TableHead>Jenis Review</TableHead>
              <TableHead>Tanggal Lembur</TableHead>
              <TableHead>Jumlah Pekerja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress Approval</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-500">
                  {hasActiveFilters
                    ? 'Tidak ada Surat Perintah Lembur yang sesuai dengan filter pencarian.'
                    : 'Belum ada data Surat Perintah Lembur.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const isSelected = selectedIds.includes(row.id)
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'hover:bg-slate-50/80 transition-colors cursor-pointer',
                      isSelected && 'bg-indigo-50/40 hover:bg-indigo-50/60'
                    )}
                    onClick={() => router.push(`/dashboard/overtime-requests/${row.id}/approval`)}
                  >
                    <TableCell className="w-10 text-center" onClick={(e) => toggleSelectRow(row.id, e)}>
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
                      {row.requesterName || row.splNumber || '-'}
                    </TableCell>
                    <TableCell className="capitalize">
                      <div className="font-medium text-slate-900">{row.title || 'Overtime Command'}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{row.requesterDepartment || 'Central Services'} • {row.splNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(row.workDate)}</div>
                      {row.plannedStartAt && (
                        <div className="text-slate-400 text-[10px]">
                          {formatTime(row.plannedStartAt)} - {formatTime(row.plannedEndAt)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-semibold text-xs">
                        {row.workerCount} Orang
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <ApprovalProgressBadge approvals={row.approvals} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const isComplete = ['approved', 'closed', 'completed'].includes(row.status.toLowerCase())
                        const isRequester = Boolean(
                          currentEmployeeId &&
                            row.requestedByEmployeeId &&
                            Number(row.requestedByEmployeeId) === Number(currentEmployeeId)
                        )
                        const canEdit =
                          ['draft', 'returned', 'reverted', 'needs_revision'].includes(row.status.toLowerCase()) &&
                          isRequester

                        const canDeleteThisRow = isAdmin || isRequester
                        const isDeleteDisabled = !isAdmin && isComplete

                        return (
                          <div className="flex min-w-max items-center justify-end gap-1">
                            {/* Tombol Unduh PDF Resmi */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="denseIcon"
                              onClick={() => handleDownloadSplPdf(row)}
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
                              onClick={() => setPreviewSplTarget(row)}
                              title="Lihat Preview SPL"
                              className="text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              <Eye className="size-4" />
                            </Button>

                            {/* Tombol Edit Form HANYA JIKA DRAFT, REVISI, ATAU REJECT (TIDAK MUNCUL JIKA SUBMITTED / APPROVED) */}
                            {canEdit && access?.canEdit ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="denseIcon"
                                onClick={() => router.push(`/dashboard/overtime-requests/${row.id}/approval`)}
                                title="Edit & Review SPL"
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
                              title="Hapus SPL"
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
              })
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      {/* ── BATCH MULTI-DOCUMENT PREVIEW & APPROVAL MODAL (SPL) ── */}
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
                  Review & Approval Dokumen SPL • <span className="font-mono text-indigo-600">{currentBatchDoc?.splNumber}</span>
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {currentBatchDoc?.requesterName} • {formatDate(currentBatchDoc?.workDate || '')} • {currentBatchDoc?.workerCount} Pekerja
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
                onClick={() => currentBatchDoc && handleDownloadSplPdf(currentBatchDoc)}
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
                <div
                  id="batch-spl-preview-sheet"
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
                    <div className="text-center mb-3">
                      <h1 className="text-center font-bold text-[11.5pt] mb-1 uppercase tracking-wide">SURAT PERINTAH LEMBUR (SPL)</h1>
                      <p className="text-center font-semibold text-[8pt] text-slate-700">PT CHITRA PARATAMA • HUMAN CAPITAL</p>
                    </div>

                    {/* Section 1: Details */}
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8.5pt]">
                      <tbody>
                        <tr>
                          <td colSpan={4} className="font-bold bg-slate-50">Details & Request Profile</td>
                        </tr>
                        <tr>
                          <td className="w-1/4 font-bold bg-slate-50">SPL Number</td>
                          <td className="w-1/4 font-mono font-semibold">{currentBatchDoc.splNumber}</td>
                          <td className="w-1/4 font-bold bg-slate-50">Work Date</td>
                          <td className="w-1/4 font-semibold">{formatDate(currentBatchDoc.workDate)}</td>
                        </tr>
                        <tr>
                          <td className="font-bold bg-slate-50">Title / Keperluan</td>
                          <td colSpan={3} className="font-semibold">{currentBatchDoc.title || '—'}</td>
                        </tr>
                        <tr>
                          <td className="font-bold bg-slate-50">Requester Name</td>
                          <td>{currentBatchDoc.requesterName || '—'}</td>
                          <td className="font-bold bg-slate-50">Department</td>
                          <td>{currentBatchDoc.requesterDepartment || 'Central Services'}</td>
                        </tr>
                        <tr>
                          <td className="font-bold bg-slate-50">Planned Schedule</td>
                          <td colSpan={3}>
                            {formatDate(currentBatchDoc.workDate)} ({formatTime(currentBatchDoc.plannedStartAt)} s.d. {formatTime(currentBatchDoc.plannedEndAt)})
                          </td>
                        </tr>
                        {currentBatchDoc.requestNotes && (
                          <tr>
                            <td className="font-bold bg-slate-50">Request Notes</td>
                            <td colSpan={3}>{currentBatchDoc.requestNotes}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Section 2: Workers */}
                    <div className="font-bold mb-1">A. Workers ({currentBatchDoc.workerCount} Orang)</div>
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
                        {currentBatchDoc.participants && currentBatchDoc.participants.length > 0 ? (
                          currentBatchDoc.participants.map((p, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td className="text-left font-semibold">{p.employeeName}</td>
                              <td>{p.shiftCode}</td>
                              <td>{p.rosterType}</td>
                              <td className="capitalize text-[7.5pt]">{p.category.replace(/_/g, ' ')}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-2 text-slate-400 italic">Belum ada peserta lembur.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Section 3: Line Items */}
                    <div className="font-bold mb-1">B. Line Items (Aktivitas Pekerjaan)</div>
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-50 text-center font-bold">
                          <th className="w-[6%]">#</th>
                          <th className="text-left w-[34%]">Activity</th>
                          <th className="w-[15%]">Target / Unit</th>
                          <th className="w-[15%]">Waktu</th>
                          <th className="w-[12%]">Tire / Material</th>
                          <th className="w-[8%]">Poin</th>
                          <th className="w-[10%]">Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBatchDoc.lineItems && currentBatchDoc.lineItems.length > 0 ? (
                          currentBatchDoc.lineItems.map((item, idx) => {
                            const actName = item.name || item.lineLabel || currentBatchDoc.title
                            const actCode = item.code ? `[${item.code}] ` : ''
                            const tireMat = [
                              item.tireCount ? `${item.tireCount} Ban` : null,
                              item.materialUsed ? item.materialUsed : null,
                            ].filter(Boolean).join(' • ') || '—'
                            const timeStr = item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.estimatedMinutes ? `${item.estimatedMinutes} m` : '—')
                            const hasPhoto = item.photoUrl || (Array.isArray(item.photos) && item.photos.length > 0)
                            return (
                              <tr key={idx}>
                                <td className="text-center">{idx + 1}</td>
                                <td className="font-medium text-left">
                                  {actCode ? <strong className="font-mono">{actCode}</strong> : null}
                                  {actName}
                                </td>
                                <td className="text-center">{item.unitNumber || item.targetUnit || '—'}</td>
                                <td className="text-center">{timeStr}</td>
                                <td className="text-center">{tireMat}</td>
                                <td className="text-center font-bold">{item.plannedPoints || 0} pts</td>
                                <td className="text-center text-[7pt]">
                                  {hasPhoto ? (
                                    <span className="font-bold text-emerald-600">📷 Ada Foto</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                  {item.remark && (
                                    <div className="text-[6.5pt] text-slate-500 truncate max-w-[80px] mx-auto">{item.remark}</div>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center text-slate-400 py-2">Belum ada rincian tugas lembur.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

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
                          const activeStep = currentBatchDoc.approvals.find(a => a.status === 'pending') || currentBatchDoc.approvals[0]
                          return currentBatchDoc.approvals.map((step) => {
                            const isCurrentActiveStep = step.status === 'pending' && step.stepOrder === activeStep?.stepOrder
                            const liveRemark = isCurrentActiveStep && currentBatchDoc && approvalRemarks[currentBatchDoc.id]
                              ? approvalRemarks[currentBatchDoc.id]
                              : step.remarks || '—'
                            return (
                              <tr key={step.stepOrder}>
                                <td>{step.stepOrder}</td>
                                <td className="text-left">{step.stepLabel}</td>
                                <td className="text-left">{step.approverName || '-'}</td>
                                <td className="capitalize font-semibold">{step.status}</td>
                                <td className="text-[7pt]">{formatTimestamp(step.signedAt)}</td>
                                <td className="text-left italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight font-medium" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{liveRemark}</td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>

                    {/* Section 5: Signatories (2-Grid Pemohon & Leader/PJO) */}
                    <div className="font-bold mb-2 text-[8.5pt]">Signatories</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4 text-center">
                      {/* 1. Serviceman / Karyawan */}
                      {(() => {
                        const step1 = currentBatchDoc.approvals.find(a => a.stepOrder === 1)
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
                              ) : (
                                <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                              )}
                            </div>
                            <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                              {step1?.approverName || currentBatchDoc.requesterName}
                            </div>
                            <div className="text-[7pt] text-slate-600 font-medium">Serviceman / Pemohon</div>
                            <div className="text-[6.5pt] text-slate-400 mt-0.5">
                              {step1?.signedAt ? `Waktu TTD: ${formatTimestamp(step1.signedAt)}` : '—'}
                            </div>
                          </div>
                        )
                      })()}

                      {/* 2. Leader / PJO */}
                      {(() => {
                        const step2 = currentBatchDoc.approvals.find(a => a.stepOrder === 2 || a.stepOrder === 3)
                        const isApproved2 = step2?.status === 'approved' || Boolean(step2?.signedAt)
                        const sigUrl2 = step2?.signatureDataUrl

                        return (
                          <div className="flex flex-col items-center text-center">
                            <div className="text-[7pt] text-slate-500 font-semibold mb-1">Leader / PJO Signature</div>
                            <div className="h-16 w-full flex items-center justify-center my-1">
                              {sigUrl2 ? (
                                <img src={sigUrl2} alt="TTD" className="max-h-14 max-w-full object-contain" />
                              ) : isApproved2 ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                  <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step2?.signedAt)})</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                              )}
                            </div>
                            <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                              {step2?.approverName || 'Leader / PJO Site'}
                            </div>
                            <div className="text-[7pt] text-slate-600 font-medium">{step2?.stepLabel || 'Leader / PJO Site'}</div>
                            <div className="text-[6.5pt] text-slate-400 mt-0.5">
                              {step2?.signedAt ? `Waktu TTD: ${formatTimestamp(step2.signedAt)}` : '—'}
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Bottom Info & Evidence QR Code */}
                    <div className="flex items-end justify-between mt-3 pt-1">
                      <div className="text-[6.5pt] text-slate-500 font-sans max-w-[100mm]">
                        * Dokumen ini sah dan diterbitkan secara digital oleh HERO System PT Chitra Paratama.
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <SplEvidenceQrBox splId={currentBatchDoc.id} splNumber={currentBatchDoc.splNumber} />
                        <div className="text-right text-[7pt] text-gray-500 font-mono mt-0.5">
                          F.HC.SPL.001.01 • PT Chitra Paratama
                        </div>
                      </div>
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
                      {currentBatchDoc?.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <p><span className="text-slate-400">Pemohon:</span> <span className="font-semibold text-slate-900">{currentBatchDoc?.requesterName}</span></p>
                    <p><span className="text-slate-400">No. SPL:</span> <span className="font-mono text-indigo-700 font-semibold">{currentBatchDoc?.splNumber}</span></p>
                    <p><span className="text-slate-400">Keperluan:</span> <span className="text-slate-800">{currentBatchDoc?.title || '-'}</span></p>
                    <p><span className="text-slate-400">Pekerja:</span> <span className="text-slate-800 font-medium">{currentBatchDoc?.workerCount} Orang</span></p>
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

      {/* PDF Quick Preview Dialog - Overtime Record Viewer Style */}
      <Dialog open={Boolean(previewSplTarget)} onOpenChange={(open) => !open && setPreviewSplTarget(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-[#2d3238] border-slate-700 shadow-2xl rounded-xl" showCloseButton={false}>
          {/* Top Viewer Toolbar */}
          <div className="bg-[#1e232a] px-4 py-2.5 flex items-center justify-between border-b border-slate-700/80 select-none text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">📄</span>
              <span className="font-semibold text-xs text-slate-100 truncate">
                Surat Perintah Lembur (SPL) • {previewSplTarget?.splNumber}
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
                onClick={() => previewSplTarget && handleDownloadSplPdf(previewSplTarget)}
              >
                <Download className="size-3.5" /> Unduh PDF
              </Button>
              <button
                type="button"
                onClick={() => setPreviewSplTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Viewer Canvas Area */}
          {previewSplTarget && (
            <div className="flex-1 overflow-y-auto overflow-x-auto bg-[#383d47] p-5 flex justify-center items-start">
              <div
                id="spl-preview-sheet"
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
                  <div className="text-center mb-3">
                    <h1 className="text-center font-bold text-[11.5pt] mb-1 uppercase tracking-wide">SURAT PERINTAH LEMBUR (SPL)</h1>
                    <p className="text-center font-semibold text-[8pt] text-slate-700">PT CHITRA PARATAMA • HUMAN CAPITAL</p>
                  </div>

                  {/* Section 1: Details */}
                  <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8.5pt]">
                    <tbody>
                      <tr>
                        <td colSpan={4} className="font-bold bg-slate-50">Details & Request Profile</td>
                      </tr>
                      <tr>
                        <td className="w-1/4 font-bold bg-slate-50">SPL Number</td>
                        <td className="w-1/4 font-mono font-semibold">{previewSplTarget.splNumber}</td>
                        <td className="w-1/4 font-bold bg-slate-50">Work Date</td>
                        <td className="w-1/4 font-semibold">{formatDate(previewSplTarget.workDate)}</td>
                      </tr>
                      <tr>
                        <td className="font-bold bg-slate-50">Title / Keperluan</td>
                        <td colSpan={3} className="font-semibold">{previewSplTarget.title || '—'}</td>
                      </tr>
                      <tr>
                        <td className="font-bold bg-slate-50">Requester Name</td>
                        <td>{previewSplTarget.requesterName || '—'}</td>
                        <td className="font-bold bg-slate-50">Department</td>
                        <td>{previewSplTarget.requesterDepartment || 'Central Services'}</td>
                      </tr>
                      <tr>
                        <td className="font-bold bg-slate-50">Planned Schedule</td>
                        <td colSpan={3}>
                          {formatDate(previewSplTarget.workDate)} ({formatTime(previewSplTarget.plannedStartAt)} s.d. {formatTime(previewSplTarget.plannedEndAt)})
                        </td>
                      </tr>
                      {previewSplTarget.requestNotes && (
                        <tr>
                          <td className="font-bold bg-slate-50">Request Notes</td>
                          <td colSpan={3}>{previewSplTarget.requestNotes}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Section 2: Workers */}
                  <div className="font-bold mb-1">A. Workers ({previewSplTarget.workerCount} Orang)</div>
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
                      {previewSplTarget.participants && previewSplTarget.participants.length > 0 ? (
                        previewSplTarget.participants.map((p, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="text-left font-semibold">{p.employeeName}</td>
                            <td>{p.shiftCode}</td>
                            <td>{p.rosterType}</td>
                            <td className="capitalize text-[7.5pt]">{p.category.replace(/_/g, ' ')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-2 text-slate-400 italic">Belum ada peserta lembur.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Section 3: Line Items */}
                  <div className="font-bold mb-1">B. Line Items (Aktivitas Pekerjaan)</div>
                  <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-[8pt]">
                    <thead>
                      <tr className="bg-slate-50 text-center font-bold">
                        <th className="w-[6%]">#</th>
                        <th className="text-left w-[34%]">Activity</th>
                        <th className="w-[15%]">Target / Unit</th>
                        <th className="w-[15%]">Waktu</th>
                        <th className="w-[12%]">Tire / Material</th>
                        <th className="w-[8%]">Poin</th>
                        <th className="w-[10%]">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewSplTarget.lineItems && previewSplTarget.lineItems.length > 0 ? (
                        previewSplTarget.lineItems.map((item, idx) => {
                          const actName = item.name || item.lineLabel || previewSplTarget.title
                          const actCode = item.code ? `[${item.code}] ` : ''
                          const tireMat = [
                            item.tireCount ? `${item.tireCount} Ban` : null,
                            item.materialUsed ? item.materialUsed : null,
                          ].filter(Boolean).join(' • ') || '—'
                          const timeStr = item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.estimatedMinutes ? `${item.estimatedMinutes} m` : '—')
                          const hasPhoto = item.photoUrl || (Array.isArray(item.photos) && item.photos.length > 0)
                          return (
                            <tr key={idx}>
                              <td className="text-center">{idx + 1}</td>
                              <td className="font-medium text-left">
                                {actCode ? <strong className="font-mono">{actCode}</strong> : null}
                                {actName}
                              </td>
                              <td className="text-center">{item.unitNumber || item.targetUnit || '—'}</td>
                              <td className="text-center">{timeStr}</td>
                              <td className="text-center">{tireMat}</td>
                              <td className="text-center font-bold">{item.plannedPoints || 0} pts</td>
                              <td className="text-center text-[7pt]">
                                {hasPhoto ? (
                                  <span className="font-bold text-emerald-600">📷 Ada Foto</span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                                {item.remark && (
                                  <div className="text-[6.5pt] text-slate-500 truncate max-w-[80px] mx-auto">{item.remark}</div>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center text-slate-400 py-2">Belum ada rincian tugas lembur.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Section 4: Approval Steps Table */}
                  <div className="font-bold mb-1">C. Approval Steps</div>
                  <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]">
                    <thead>
                      <tr className="bg-slate-50 font-bold">
                        <th className="w-[6%]">#</th>
                        <th className="text-left w-[22%]">Tahap</th>
                        <th className="text-left w-[22%]">Approver</th>
                        <th className="w-[14%]">Status</th>
                        <th className="w-[18%]">Waktu</th>
                        <th className="text-left w-[18%]">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewSplTarget.approvals.map((step) => (
                        <tr key={step.stepOrder}>
                          <td>{step.stepOrder}</td>
                          <td className="text-left">{step.stepLabel}</td>
                          <td className="text-left">{step.approverName || '-'}</td>
                          <td className="capitalize font-semibold">{step.status}</td>
                          <td className="text-[7pt]">{formatTimestamp(step.signedAt)}</td>
                          <td className="text-left text-[7pt] text-slate-600">{step.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Section 5: Signatories (2-Grid Pemohon & Leader/PJO) */}
                  <div className="font-bold mb-3">Signatories</div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
                    {/* 1. Serviceman / Karyawan */}
                    <div>
                      <div className="text-[7pt] text-gray-500 mb-1">Employee Signature</div>
                      <div className="h-16 flex items-end">
                        {previewSplTarget.approvals.find(a => a.stepOrder === 1)?.signatureDataUrl && (
                          <img src={previewSplTarget.approvals.find(a => a.stepOrder === 1)!.signatureDataUrl!} alt="TTD" className="h-14 object-contain" />
                        )}
                      </div>
                      <div className="mb-1 border-b" style={{ width: '65%', borderColor: '#9ca3af' }}>
                        {previewSplTarget.approvals.find(a => a.stepOrder === 1)?.approverName || createForm.requesterName || previewSplTarget.requesterName}
                      </div>
                      <div className="text-[7pt]">Serviceman / Pemohon</div>
                    </div>

                    {/* 2. Leader / PJO */}
                    <div>
                      <div className="text-[7pt] text-gray-500 mb-1">Leader / PJO Signature</div>
                      <div className="h-16 flex items-end">
                        {(previewSplTarget.approvals.find(a => a.stepOrder === 2)?.signatureDataUrl || previewSplTarget.approvals.find(a => a.stepOrder === 3)?.signatureDataUrl) && (
                          <img src={(previewSplTarget.approvals.find(a => a.stepOrder === 2)?.signatureDataUrl || previewSplTarget.approvals.find(a => a.stepOrder === 3)?.signatureDataUrl)!} alt="TTD" className="h-14 object-contain" />
                        )}
                      </div>
                      <div className="mb-1 border-b" style={{ width: '65%', borderColor: '#9ca3af' }}>
                        {previewSplTarget.approvals.find(a => a.stepOrder === 2)?.approverName || previewSplTarget.approvals.find(a => a.stepOrder === 3)?.approverName || createForm.leaderName || createForm.superiorName || 'Leader / PJO Site'}
                      </div>
                      <div className="text-[7pt]">{previewSplTarget.approvals.find(a => a.stepOrder === 2)?.stepLabel || 'Leader / PJO'}</div>
                    </div>
                  </div>

                  {/* Bottom Info & Evidence QR Code */}
                  <div className="flex items-end justify-between mt-3 pt-1">
                    <div className="text-[6.5pt] text-slate-500 font-sans max-w-[100mm]">
                      * Dokumen ini sah dan diterbitkan secara digital oleh HERO System PT Chitra Paratama.
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <SplEvidenceQrBox splId={previewSplTarget.id} splNumber={previewSplTarget.splNumber} />
                      <div className="text-right text-[7pt] text-gray-500 font-mono mt-0.5">
                        F.HC.SPL.001.01 • PT Chitra Paratama
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tambah SPL Modal matching PDF / Document standard */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs">F.HC.SPL</span>
                  Tambah Surat Perintah Lembur (SPL)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Form pembuatan penugasan lembur operasional & pengajuan persetujuan berjenjang sesuai dokumen resmi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* 1. Details & Request Profile */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-600"></span>
                  1. Details & Request Profile
                </span>
                <span className="text-[11px] font-mono text-slate-400">Header & Schedule</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Judul / Keperluan Lembur *</Label>
                  <Input
                    placeholder="Contoh: Overtime Pemasangan Tyre OTR Unit HD-785..."
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="bg-white border-slate-200 h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tanggal Pekerjaan (Work Date) *</Label>
                  <Input
                    type="date"
                    value={createForm.workDate}
                    onChange={(e) => setCreateForm({ ...createForm, workDate: e.target.value, plannedStartDate: e.target.value, plannedEndDate: e.target.value })}
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Pemohon (Requester)</Label>
                  <SearchableSelect
                    label="Pemohon"
                    placeholder="PILIH PEMOHON..."
                    value={createForm.requesterEmployeeId}
                    onValueChange={(val) => {
                      const hierarchy = resolveEmployeeApproverHierarchy(val, employees, settingsForm)
                      setCreateForm((p) => ({
                        ...p,
                        requesterEmployeeId: val,
                        requesterName: hierarchy.requester?.name || '',
                        requesterDepartment: hierarchy.department || p.requesterDepartment,
                        leaderEmployeeId: hierarchy.leader ? String(hierarchy.leader.id) : p.leaderEmployeeId,
                        leaderName: hierarchy.leader?.name || p.leaderName,
                        superiorEmployeeId: hierarchy.superior ? String(hierarchy.superior.id) : p.superiorEmployeeId,
                        superiorName: hierarchy.superior?.name || p.superiorName,
                      }))
                    }}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Departemen Pemohon</Label>
                  <Input
                    value={createForm.requesterDepartment}
                    onChange={(e) => setCreateForm({ ...createForm, requesterDepartment: e.target.value })}
                    placeholder="Central Services"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Jadwal Mulai (Planned Start) *</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="date"
                      value={createForm.plannedStartDate}
                      onChange={(e) => setCreateForm({ ...createForm, plannedStartDate: e.target.value })}
                      className="bg-white border-slate-200 h-9 text-xs w-3/5"
                    />
                    <Input
                      type="time"
                      value={createForm.plannedStartTime}
                      onChange={(e) => setCreateForm({ ...createForm, plannedStartTime: e.target.value })}
                      className="bg-white border-slate-200 h-9 text-xs w-2/5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Jadwal Selesai (Planned End) *</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="date"
                      value={createForm.plannedEndDate}
                      onChange={(e) => setCreateForm({ ...createForm, plannedEndDate: e.target.value })}
                      className="bg-white border-slate-200 h-9 text-xs w-3/5"
                    />
                    <Input
                      type="time"
                      value={createForm.plannedEndTime}
                      onChange={(e) => setCreateForm({ ...createForm, plannedEndTime: e.target.value })}
                      className="bg-white border-slate-200 h-9 text-xs w-2/5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Catatan Khusus / Alasan Lembur</Label>
                  <Input
                    placeholder="Instruksi operasional, nomor SPK terkait, atau justifikasi kebutuhan lembur..."
                    value={createForm.requestNotes}
                    onChange={(e) => setCreateForm({ ...createForm, requestNotes: e.target.value })}
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. A. Workers (Peserta Lembur) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-600"></span>
                  A. Workers (Peserta Lembur)
                </span>
                <Badge variant="secondary" className="text-[11px] font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {createForm.workers.filter((w) => w.employeeId).length} Peserta Terdaftar
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-12 gap-2 bg-slate-100/80 px-3 py-2 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-4">Nama Karyawan (Worker) *</div>
                  <div className="col-span-2">Shift</div>
                  <div className="col-span-2">Roster</div>
                  <div className="col-span-2">Kategori Lembur</div>
                  <div className="col-span-1 text-center">Aksi</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {createForm.workers.map((w, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-50/50">
                      <div className="col-span-1 text-center font-bold text-slate-500 text-[11px]">
                        {idx + 1}
                      </div>
                      <div className="col-span-4">
                        <SearchableSelect
                          label="Worker"
                          placeholder="PILIH WORKER..."
                          value={w.employeeId}
                          onValueChange={(val) => updateWorkerRow(idx, 'employeeId', val)}
                          options={employeeOptions}
                          widthClassName="w-full"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold shadow-2xs"
                          value={w.shiftCode}
                          onChange={(e) => updateWorkerRow(idx, 'shiftCode', e.target.value)}
                        >
                          <option value="DS">Shift DS (Day)</option>
                          <option value="NS">Shift NS (Night)</option>
                          <option value="ALL">Shift ALL</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <select
                          className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold shadow-2xs"
                          value={w.rosterType}
                          onChange={(e) => updateWorkerRow(idx, 'rosterType', e.target.value)}
                        >
                          <option value="5:2">5:2</option>
                          <option value="6:1">6:1</option>
                          <option value="10:2">10:2</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <select
                          className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold shadow-2xs"
                          value={w.category}
                          onChange={(e) => updateWorkerRow(idx, 'category', e.target.value)}
                        >
                          <option value="after_mandatory_ot">After Mandatory OT</option>
                          <option value="off_day_ot">Off Day OT</option>
                          <option value="emergency_callout">Emergency Callout</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                          onClick={() => removeWorkerRow(idx)}
                          disabled={createForm.workers.length <= 1}
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
                  onClick={addWorkerRow}
                  className="h-8 text-xs font-semibold gap-1.5 border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-white"
                >
                  <UserPlus className="size-3.5 text-slate-500" /> Tambah Peserta Lembur
                </Button>
                <p className="text-[11px] text-slate-400">
                  Worker akan otomatis menerima notifikasi dan penugasan lembur di dashboard & mobile.
                </p>
              </div>
            </div>

            {/* 1.5. SOURCE MODE SELECTION (SINKRON DENGAN MOBILE & DAILY ACTIVITY) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Source Mode *</Label>
              <select
                value={createForm.sourceMode || 'self_input'}
                onChange={(e) => {
                  const mode = e.target.value as 'self_input' | 'assigned' | 'custom'
                  setCreateForm((p) => ({
                    ...p,
                    sourceMode: mode,
                    lineItems:
                      mode === 'custom' && p.lineItems.length === 0
                        ? [
                            {
                              lineLabel: '',
                              name: '',
                              targetUnit: '1 Unit',
                              estimatedMinutes: 120,
                              plannedPoints: 10,
                              startTime: p.plannedStartTime || '17:00',
                              endTime: p.plannedEndTime || '21:00',
                              duration: '120m',
                              points: 10,
                              remark: '',
                            },
                          ]
                        : mode === 'assigned' && p.lineItems.length === 0
                          ? [
                              {
                                lineLabel: '',
                                name: '',
                                targetUnit: '1 Unit',
                                estimatedMinutes: 120,
                                plannedPoints: 10,
                                startTime: p.plannedStartTime || '17:00',
                                endTime: p.plannedEndTime || '21:00',
                                duration: '120m',
                                points: 10,
                                remark: '',
                              },
                            ]
                          : p.lineItems,
                  }))
                }}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="self_input">Self-input activity (Kamus Aktivitas)</option>
                <option value="assigned">Assigned activity (Penugasan)</option>
                <option value="custom">Custom activity (Bebas / Kustom)</option>
              </select>
            </div>

            {/* 3. B. Line Items (Aktivitas Pekerjaan Lembur) - Adaptive per Source Mode */}
            {createForm.sourceMode === 'custom' ? (
              /* ── CUSTOM ACTIVITY MODE ── */
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500"></span>
                    B. Line Items (Aktivitas Kustom / Bebas)
                  </span>
                  <Badge variant="secondary" className="text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                    {createForm.lineItems.filter((i) => i.lineLabel.trim()).length} Aktivitas Kustom
                  </Badge>
                </div>

                <div className="space-y-3">
                  {createForm.lineItems.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Aktivitas Kustom #{idx + 1}</span>
                        {createForm.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItemRow(idx)}
                            className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition-colors text-xs font-bold"
                            title="Hapus baris"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Uraian Aktivitas Pekerjaan Lembur <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          placeholder="Contoh: Overtime Fabrikasi Bracket & Welding Workshop..."
                          value={item.lineLabel}
                          onChange={(e) => {
                            updateLineItemRow(idx, 'lineLabel', e.target.value)
                            updateLineItemRow(idx, 'name', e.target.value)
                          }}
                          className="h-8 text-xs bg-slate-50/50 border-slate-200 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Target / Unit</Label>
                          <Input
                            placeholder="Contoh: 1 Unit HD / 2 Pcs"
                            value={item.targetUnit || ''}
                            onChange={(e) => {
                              updateLineItemRow(idx, 'targetUnit', e.target.value)
                              updateLineItemRow(idx, 'unitNumber', e.target.value)
                            }}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Durasi (Mnt)</Label>
                          <Input
                            type="number"
                            min={15}
                            value={item.estimatedMinutes || 120}
                            onChange={(e) => updateLineItemRow(idx, 'estimatedMinutes', Number(e.target.value))}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 font-semibold text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Poin</Label>
                          <Input
                            type="number"
                            min={0}
                            value={item.plannedPoints || 10}
                            onChange={(e) => updateLineItemRow(idx, 'plannedPoints', Number(e.target.value))}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 font-bold text-center"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Mulai <span className="text-red-500 font-bold">*</span></Label>
                          <Input
                            type="time"
                            value={item.startTime || createForm.plannedStartTime || '17:00'}
                            onChange={(e) => updateLineItemRow(idx, 'startTime', e.target.value)}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Selesai <span className="text-red-500 font-bold">*</span></Label>
                          <Input
                            type="time"
                            value={item.endTime || createForm.plannedEndTime || '21:00'}
                            onChange={(e) => updateLineItemRow(idx, 'endTime', e.target.value)}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* Photo Evidence Box */}
                      <div className={cn(
                        "rounded-lg border p-2.5 space-y-2 bg-white",
                        !item.photoUrl && (!item.photos || item.photos.length === 0) ? "border-rose-200 bg-rose-50/10" : "border-slate-200"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Camera className="size-3.5 text-slate-500" /> Photo Evidence <span className="text-rose-500 font-bold text-[10px]">* (Wajib Diunggah)</span>
                          </span>
                          {item.photoUrl || (Array.isArray(item.photos) && item.photos.length > 0) ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                              Foto Terunggah
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                              Wajib Diunggah
                            </Badge>
                          )}
                        </div>

                        {item.photoUrl ? (
                          <div className="relative inline-block border border-slate-200 rounded-lg p-1 bg-slate-50">
                            <img
                              src={resolveUploadUrl(item.photoUrl)}
                              alt={`Evidence #${idx + 1}`}
                              className="size-20 object-cover rounded-md border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateLineItemRow(idx, 'photoUrl', '')
                                updateLineItemRow(idx, 'photos', [])
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700 transition-colors"
                              title="Hapus foto"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <label className={cn(
                              "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors",
                              isUploadingLinePhoto[idx] && "opacity-50 pointer-events-none"
                            )}>
                              <Camera className="size-3.5 text-slate-600" />
                              {isUploadingLinePhoto[idx] ? "Mengunggah..." : "Kamera"}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                disabled={isUploadingLinePhoto[idx]}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleLinePhotoUpload(idx, file)
                                  e.target.value = ''
                                }}
                                className="hidden"
                              />
                            </label>
                            <label className={cn(
                              "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors",
                              isUploadingLinePhoto[idx] && "opacity-50 pointer-events-none"
                            )}>
                              <ImagePlus className="size-3.5 text-slate-600" />
                              {isUploadingLinePhoto[idx] ? "Mengunggah..." : "Galeri"}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingLinePhoto[idx]}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleLinePhotoUpload(idx, file)
                                  e.target.value = ''
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Keterangan / Catatan Tambahan</Label>
                        <Input
                          placeholder="Instruksi khusus, lokasi unit, atau catatan hasil kerja..."
                          value={item.remark || ''}
                          onChange={(e) => updateLineItemRow(idx, 'remark', e.target.value)}
                          className="h-8 text-xs bg-slate-50/50 border-slate-200"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomLineItemRow}
                    className="w-full h-9 rounded-xl border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold gap-1.5"
                  >
                    <Plus className="size-3.5 text-slate-500" /> + Tambah Baris Aktivitas Kustom
                  </Button>
                </div>
              </div>
            ) : createForm.sourceMode === 'assigned' ? (
              /* ── ASSIGNED ACTIVITY MODE ── */
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-600"></span>
                    B. Line Items (Penugasan Aktivitas Lembur)
                  </span>
                  <Badge variant="secondary" className="text-[11px] font-semibold bg-blue-50 text-blue-700 border-blue-200">
                    {createForm.lineItems.filter((i) => i.lineLabel.trim()).length} Penugasan Terpilih
                  </Badge>
                </div>

                <div className="space-y-3">
                  {createForm.lineItems.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Penugasan #{idx + 1}</span>
                        {createForm.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItemRow(idx)}
                            className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition-colors text-xs font-bold"
                            title="Hapus baris"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Pilih Aktivitas Penugasan <span className="text-rose-500">*</span>
                        </Label>
                        <SearchableSelect
                          label="Aktivitas"
                          placeholder="PILIH DARI DAFTAR AKTIVITAS / JOB..."
                          value={item.lineLabel}
                          onValueChange={(val) => {
                            const lib = activityLibraries.find(
                              (l) => `${l.activityCode ? `${l.activityCode} - ` : ''}${l.activityName}` === val || l.activityName === val || (l.activityCode && val.includes(l.activityCode))
                            )
                            updateLineItemRow(idx, 'lineLabel', val)
                            updateLineItemRow(idx, 'name', lib?.activityName || val)
                            if (lib?.activityCode) updateLineItemRow(idx, 'code', lib.activityCode)
                            if (lib?.basePoints) {
                              updateLineItemRow(idx, 'plannedPoints', Number(lib.basePoints))
                              updateLineItemRow(idx, 'points', Number(lib.basePoints))
                            }
                          }}
                          options={activitySelectOptions}
                          allowCustom={true}
                          widthClassName="w-full"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Target Unit / Equipment</Label>
                          <Input
                            placeholder="e.g. Unit HD-785"
                            value={item.targetUnit || ''}
                            onChange={(e) => {
                              updateLineItemRow(idx, 'targetUnit', e.target.value)
                              updateLineItemRow(idx, 'unitNumber', e.target.value)
                            }}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Durasi (Mnt)</Label>
                          <Input
                            type="number"
                            min={15}
                            value={item.estimatedMinutes || 120}
                            onChange={(e) => updateLineItemRow(idx, 'estimatedMinutes', Number(e.target.value))}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 font-semibold text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Poin</Label>
                          <Input
                            type="number"
                            min={0}
                            value={item.plannedPoints || 10}
                            onChange={(e) => updateLineItemRow(idx, 'plannedPoints', Number(e.target.value))}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 font-bold text-center"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Mulai <span className="text-red-500 font-bold">*</span></Label>
                          <Input
                            type="time"
                            value={item.startTime || createForm.plannedStartTime || '17:00'}
                            onChange={(e) => updateLineItemRow(idx, 'startTime', e.target.value)}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Selesai <span className="text-red-500 font-bold">*</span></Label>
                          <Input
                            type="time"
                            value={item.endTime || createForm.plannedEndTime || '21:00'}
                            onChange={(e) => updateLineItemRow(idx, 'endTime', e.target.value)}
                            className="h-8 text-xs bg-slate-50/50 border-slate-200 text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* Photo Evidence Box */}
                      <div className={cn(
                        "rounded-lg border p-2.5 space-y-2 bg-white",
                        !item.photoUrl && (!item.photos || item.photos.length === 0) ? "border-rose-200 bg-rose-50/10" : "border-slate-200"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Camera className="size-3.5 text-slate-500" /> Photo Evidence <span className="text-rose-500 font-bold text-[10px]">* (Wajib Diunggah)</span>
                          </span>
                          {item.photoUrl || (Array.isArray(item.photos) && item.photos.length > 0) ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                              Foto Terunggah
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                              Wajib Diunggah
                            </Badge>
                          )}
                        </div>

                        {item.photoUrl ? (
                          <div className="relative inline-block border border-slate-200 rounded-lg p-1 bg-slate-50">
                            <img
                              src={resolveUploadUrl(item.photoUrl)}
                              alt={`Evidence #${idx + 1}`}
                              className="size-20 object-cover rounded-md border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateLineItemRow(idx, 'photoUrl', '')
                                updateLineItemRow(idx, 'photos', [])
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700 transition-colors"
                              title="Hapus foto"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <label className={cn(
                              "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors",
                              isUploadingLinePhoto[idx] && "opacity-50 pointer-events-none"
                            )}>
                              <Camera className="size-3.5 text-slate-600" />
                              {isUploadingLinePhoto[idx] ? "Mengunggah..." : "Kamera"}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                disabled={isUploadingLinePhoto[idx]}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleLinePhotoUpload(idx, file)
                                  e.target.value = ''
                                }}
                                className="hidden"
                              />
                            </label>
                            <label className={cn(
                              "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors",
                              isUploadingLinePhoto[idx] && "opacity-50 pointer-events-none"
                            )}>
                              <ImagePlus className="size-3.5 text-slate-600" />
                              {isUploadingLinePhoto[idx] ? "Mengunggah..." : "Galeri"}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingLinePhoto[idx]}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleLinePhotoUpload(idx, file)
                                  e.target.value = ''
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Keterangan SPK / Instruksi Leader</Label>
                        <Input
                          placeholder="Nomor SPK / instruksi penugasan kerja..."
                          value={item.remark || ''}
                          onChange={(e) => updateLineItemRow(idx, 'remark', e.target.value)}
                          className="h-8 text-xs bg-slate-50/50 border-slate-200"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAssignedLineItemRow}
                    className="w-full h-9 rounded-xl border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold gap-1.5"
                  >
                    <Plus className="size-3.5 text-slate-500" /> + Tambah Penugasan Aktivitas
                  </Button>
                </div>
              </div>
            ) : (
              /* ── SELF-INPUT (KAMUS AKTIVITAS) MODE ── */
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-600"></span>
                  B. Line Items (Aktivitas Pekerjaan Lembur)
                </span>
                <Badge variant="secondary" className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                  {createForm.lineItems.filter((i) => i.lineLabel.trim()).length} Aktivitas Terpilih
                </Badge>
              </div>

              {/* LIBRARY ACTIVITY & GROUP KAMUS AKTIVITAS TRIGGER BOX */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    LIBRARY ACTIVITY &amp; GROUP KAMUS AKTIVITAS
                  </span>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    {createForm.lineItems.filter((i) => i?.lineLabel?.trim()).length} DIPILIH
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setPickerSearch('')
                      setIsPickerModalOpen(true)
                    }}
                    className="h-9 text-xs font-bold gap-2 bg-[#003f78] hover:bg-[#002f5a] text-white rounded-xl shadow-xs px-4 transition-all"
                  >
                    <ListFilter className="size-4 text-blue-200" />
                    Buka Kamus Aktivitas (Route Group Tree)
                  </Button>
                </div>
              </div>

              {/* SELECTED LIBRARY CHECKLIST CARDS */}
              {createForm.lineItems.filter((i) => i?.lineLabel?.trim()).length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">SELECTED LIBRARY CHECKLIST</span>
                      <h5 className="text-xs font-bold text-slate-800">
                        {createForm.lineItems.filter((i) => i?.lineLabel?.trim()).length} activity siap diisi
                      </h5>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setPickerSearch('')
                        setIsPickerModalOpen(true)
                      }}
                      className="h-8 text-xs font-semibold gap-1.5 bg-[#003f78] hover:bg-[#002f5a] text-white shadow-xs rounded-lg px-3.5 transition-all"
                    >
                      <Layers className="size-3.5 text-blue-200" />
                      + Tambah Dari Kamus
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {createForm.lineItems
                      .filter((i) => i?.lineLabel?.trim())
                      .map((item, idx) => {
                        const requirementBadges = [
                          item.requiresDuration !== false ? 'DURATION' : null,
                          item.requiresTireCount ? 'TIRE' : null,
                          item.requiresEquipmentNo ? 'EQUIPMENT' : null,
                          item.requiresMaterialUsed ? 'MATERIAL' : null,
                          'PHOTO (WAJIB)',
                        ].filter(Boolean)

                        const codeLabel = item.code || (item.lineLabel.includes(' - ') ? item.lineLabel.split(' - ')[0] : 'SVC')
                        const nameLabel = item.name || (item.lineLabel.includes(' - ') ? item.lineLabel.split(' - ')[1] : item.lineLabel)

                        return (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5 relative">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-bold font-mono text-slate-500">
                                  #{idx + 1} • {codeLabel}
                                </p>
                                <h6 className="text-xs font-bold text-slate-800">{nameLabel}</h6>
                                {requirementBadges.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {requirementBadges.map((badge, bIdx) => (
                                      <span
                                        key={bIdx}
                                        className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[8.5px] font-bold text-[#003f78] uppercase tracking-wider"
                                      >
                                        {badge}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeLineItemRow(idx)}
                                className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition-colors text-xs font-bold"
                                title="Hapus activity"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>

                            {item.requiresEquipmentNo ? (
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">No. Equipment / Unit <span className="text-red-500 font-bold">*</span></Label>
                                <Input
                                  placeholder="Contoh: DT-451 / BAY-03..."
                                  value={item.unitNumber || ''}
                                  onChange={(e) => updateLineItemRow(idx, 'unitNumber', e.target.value)}
                                  className="h-8 text-xs bg-white border-slate-200"
                                />
                              </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Mulai <span className="text-red-500 font-bold">*</span></Label>
                                <Input
                                  type="time"
                                  value={item.startTime || createForm.plannedStartTime || '17:00'}
                                  onChange={(e) => updateLineItemRow(idx, 'startTime', e.target.value)}
                                  className="h-8 text-xs bg-white border-slate-200 text-center font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Selesai <span className="text-red-500 font-bold">*</span></Label>
                                <Input
                                  type="time"
                                  value={item.endTime || createForm.plannedEndTime || '21:00'}
                                  onChange={(e) => updateLineItemRow(idx, 'endTime', e.target.value)}
                                  className="h-8 text-xs bg-white border-slate-200 text-center font-mono"
                                />
                              </div>
                            </div>

                            {item.requiresTireCount ? (
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Jumlah Tire <span className="text-red-500 font-bold">*</span></Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.tireCount ?? 1}
                                  onChange={(e) => updateLineItemRow(idx, 'tireCount', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  className="h-8 text-xs bg-white border-slate-200"
                                />
                              </div>
                            ) : null}

                            {item.requiresMaterialUsed ? (
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Material Used <span className="text-red-500 font-bold">*</span></Label>
                                <Input
                                  placeholder="Material / tools dipakai..."
                                  value={item.materialUsed || ''}
                                  onChange={(e) => updateLineItemRow(idx, 'materialUsed', e.target.value)}
                                  className="h-8 text-xs bg-white border-slate-200"
                                />
                              </div>
                            ) : null}

                            <div className={cn(
                              "rounded-lg border p-2.5 space-y-2 bg-white",
                              !item.photoUrl && (!item.photos || item.photos.length === 0) ? "border-rose-200 bg-rose-50/10" : "border-slate-200"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                  <Camera className="size-3.5 text-slate-500" /> Photo Evidence <span className="text-rose-500 font-bold text-[10px]">* (Wajib Diunggah)</span>
                                </span>
                                {item.photoUrl || (Array.isArray(item.photos) && item.photos.length > 0) ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                                    Foto Terunggah
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                                    Wajib Diunggah
                                  </Badge>
                                )}
                              </div>

                              {item.photoUrl ? (
                                <div className="relative inline-block border border-slate-200 rounded-lg p-1 bg-slate-50">
                                  <img
                                    src={resolveUploadUrl(item.photoUrl)}
                                    alt={`Evidence #${idx + 1}`}
                                    className="size-20 object-cover rounded-md border border-slate-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateLineItemRow(idx, 'photoUrl', '')
                                      updateLineItemRow(idx, 'photos', [])
                                    }}
                                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700 transition-colors"
                                    title="Hapus foto"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <label className={cn(
                                    "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors",
                                    isUploadingLinePhoto[idx] && "opacity-50 pointer-events-none"
                                  )}>
                                    <Camera className="size-3.5 text-slate-600" />
                                    {isUploadingLinePhoto[idx] ? "Mengunggah..." : "Kamera"}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      disabled={isUploadingLinePhoto[idx]}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleLinePhotoUpload(idx, file)
                                        e.target.value = ''
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                  <label className={cn(
                                    "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors",
                                    isUploadingLinePhoto[idx] && "opacity-50 pointer-events-none"
                                  )}>
                                    <ImagePlus className="size-3.5 text-slate-600" />
                                    {isUploadingLinePhoto[idx] ? "Mengunggah..." : "Galeri"}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={isUploadingLinePhoto[idx]}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleLinePhotoUpload(idx, file)
                                        e.target.value = ''
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Catatan Item</Label>
                              <Input
                                placeholder="Hasil kerja, temuan, atau catatan lembur..."
                                value={item.remark || ''}
                                onChange={(e) => updateLineItemRow(idx, 'remark', e.target.value)}
                                className="h-8 text-xs bg-white border-slate-200"
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ) : null}
            </div>
            )}



            {/* 4. C. Signatories & Verification Matrix (Approval) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-600"></span>
                  C. Signatories & Verification Matrix (Penandatangan Approval SPL)
                </span>
                <span className="text-[11px] font-mono text-slate-400">1-Tier Approver (Leader / PJO)</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Leader / PJO (Site Lead / Pengawas)</Label>
                <SearchableSelect
                  label="Leader / PJO"
                  placeholder="PILIH LEADER / PJO..."
                  value={createForm.leaderEmployeeId || createForm.superiorEmployeeId}
                  onValueChange={(val) => {
                    const emp = employees.find((e) => String(e.id) === val)
                    setCreateForm((p) => ({
                      ...p,
                      leaderEmployeeId: val,
                      leaderName: emp?.name || '',
                      superiorEmployeeId: val,
                      superiorName: emp?.name || '',
                    }))
                  }}
                  options={employeeOptions}
                  widthClassName="w-full"
                />
                <p className="text-[10px] text-slate-400">Verifikasi & persetujuan SPL langsung (Pemohon &rarr; Leader / PJO &rarr; Selesai)</p>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateSpl} disabled={isCreating} className={hcPrimaryActionClassName}>
              {isCreating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FLOATING WINDOW: PILIH KAMUS AKTIVITAS (PARITY WITH DAILY ACTIVITY ROUTE GROUPS) */}
      <Dialog open={isPickerModalOpen} onOpenChange={setIsPickerModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header Dark Minimalist */}
          <div className="bg-[#003f78] px-5 py-3.5 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-white">Pilih Kamus Aktivitas Lembur</DialogTitle>
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
              <span>{(createForm.lineItems || []).filter((i) => i?.lineLabel?.trim()).length} dipilih</span>
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
                          {(route?.matchingGroups || []).reduce((acc, g) => acc + (g?.matchingItems?.length || 0), 0)} Activity
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
                              (createForm.lineItems || []).some(
                                (i) => i?.lineLabel === sub.name || (sub.code && i?.lineLabel?.includes(sub.code)) || i?.lineLabel?.includes(sub.name)
                              )
                            )
                          const selectedInGroupCount = group.matchingItems.filter((sub) =>
                            (createForm.lineItems || []).some(
                              (i) => i?.lineLabel === sub.name || (sub.code && i?.lineLabel?.includes(sub.code)) || i?.lineLabel?.includes(sub.name)
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
                                  const isSelected = (createForm.lineItems || []).some(
                                    (i) => i?.lineLabel === sub.name || (sub.code && i?.lineLabel?.includes(sub.code)) || i?.lineLabel?.includes(sub.name)
                                  )

                                  return (
                                    <div
                                      key={sub.id}
                                      onClick={() => {
                                        toggleLineItem(sub.name, sub.code, sub.basePoints, sub)
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
                                        </div>
                                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-100' : 'text-slate-800'}`}>
                                          {sub.name}
                                        </p>
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
                      const isSelected = (createForm.lineItems || []).some(
                        (i) => i?.lineLabel === item.activityName || (item.activityCode && i?.lineLabel?.includes(item.activityCode)) || i?.lineLabel?.includes(item.activityName)
                      )

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            toggleLineItem(item.activityName, item.activityCode, item.basePoints, {
                              requiresEquipmentNo: Boolean(item.requiresEquipmentNo),
                              requiresDuration: true,
                              requiresTireCount: (item.activityName || '').toLowerCase().includes('tire') || (item.activityName || '').toLowerCase().includes('ban'),
                              requiresMaterialUsed: false,
                              requiresPhoto: false,
                            })
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
                                {item.activityCode}
                              </span>
                              {item.category ? (
                                <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-[#eaf4fb] text-[#003f78]'
                                }`}>
                                  {item.category}
                                </span>
                              ) : null}
                            </div>
                            <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-100' : 'text-slate-800'}`}>
                              {item.activityName}
                            </p>
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
              PAKAI {(createForm.lineItems || []).filter((i) => i?.lineLabel?.trim()).length} AKTIVITAS
            </Button>
          </div>
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
            <DialogTitle>Overtime Requests (SPL) Workflow Settings</DialogTitle>
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

              {/* Leader / PJO */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leader / PJO</p>
                <div className="space-y-1">
                  <Label>Default Leader / Supervisor</Label>
                  <SearchableSelect
                    label="Leader"
                    placeholder="Pilih Leader..."
                    value={(() => {
                      const emp = employees.find((e: any) => e.name === (settingsForm.approvalMatrix as any)?.leaderName)
                      return emp ? String(emp.id) : ''
                    })()}
                    onValueChange={(val) => updateApproverField('leader', val)}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <Input
                    value={(settingsForm.approvalMatrix as any)?.leaderEmail || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        approvalMatrix: { ...settingsForm.approvalMatrix, leaderEmail: e.target.value } as any,
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
                  approvalStep: 'Notifikasi Giliran Approval',
                  approvalCompleted: 'Notifikasi Persetujuan Lembur',
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
                      Variables: {'{{splNumber}}, {{requesterName}}, {{overtimeDate}}, {{reason}}, {{approverName}}, {{approvalStep}}, {{approvalLink}}'}
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
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <Trash2 className="size-5 text-rose-600" />
              Hapus Dokumen SPL?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Tindakan ini tidak dapat dibatalkan. Seluruh data item pekerjaan dan alur persetujuan dokumen ini akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 my-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nomor SPL:</span>
                <span className="font-mono font-bold text-slate-900">{deleteTarget.splNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Judul:</span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[220px]">{deleteTarget.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pemohon:</span>
                <span className="font-medium text-slate-800">{deleteTarget.requesterName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold border-slate-200">
                  {deleteTarget.status}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex items-center justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus Dokumen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Modal */}
      <Dialog open={isBatchDeleteModalOpen} onOpenChange={(open) => !open && setIsBatchDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <Trash2 className="size-5 text-rose-600" />
              Hapus {selectedIds.length} Dokumen SPL Terpilih?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Tindakan ini akan menghapus permanen <strong>{selectedIds.length} dokumen SPL</strong> yang dipilih beserta seluruh rincian penugasan dan persetujuannya.{!isAdmin && ' Dokumen yang telah berstatus Approved akan otomatis dilewati untuk menjaga integritas data audit.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 my-2 text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-rose-800">
              Total {selectedIds.length} Dokumen dalam antrian penghapusan.
            </p>
            <p className="text-[11px] text-slate-500">
              Apakah Anda yakin ingin melanjutkan proses penghapusan massal ini?
            </p>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchDeleteModalOpen(false)}
              disabled={isBatchDeleting}
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
            >
              {isBatchDeleting ? 'Menghapus...' : `Ya, Hapus (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Signature Warning Dialog */}
      <Dialog open={isSignatureWarningOpen} onOpenChange={setIsSignatureWarningOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Tanda Tangan Belum Didaftarkan
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 my-2">
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Anda belum mendaftarkan tanda tangan digital. Daftarkan tanda tangan Anda sekarang agar dapat menyetujui dokumen ini?
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
              Nanti Saja
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

      {/* Approved Documents Summary Modal */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Ringkasan Dokumen SPL Disetujui ({approvedRows.length})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Daftar seluruh Surat Perintah Lembur (SPL) yang telah disetujui secara lengkap dan sah dengan tanda tangan digital terverifikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 my-2">
            {approvedRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada dokumen SPL yang berstatus Approved.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {approvedRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{row.splNumber}</span>
                        <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] py-0 px-2">Approved</Badge>
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{row.title} • {row.requesterName}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(row.workDate)} • {row.requesterDepartment || 'Central Services'} • {row.workerCount} pekerja
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsSummaryOpen(false)
                          setPreviewSplTarget(row)
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
