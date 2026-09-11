'use client'

import { useState, useTransition, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import SignatureCanvas from 'react-signature-canvas'
import {
  ArrowLeft,
  Printer,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PenLine,
  Trash2,
  Plus,
  FileSignature,
  PenTool,
  RotateCcw,
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ImagePlus,
  Layers,
  ListFilter,
  Search,
  SendHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { downloadElementAsPdf } from '@/lib/pdf-download'

import {
  saveDailyActivityApprovalForm,
  submitDailyActivityApprovalStepAction,
  saveDailyActivityItemRemarksAction,
} from '@/app/dashboard/activity-hub/actions'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { uploadFile } from '@/app/actions/upload'
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'
import { MissingSignatureDialog } from '@/components/missing-signature-dialog'
import { DailyActivityEvidenceModal } from '@/components/daily-activity-evidence-modal'
import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EnterpriseFormGrid } from '@/components/ui/enterprise-table-kit'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type ModalPreset = {
  id: number
  code: string
  name: string
  basePoints?: number
  category?: string
  requiresPhoto?: boolean
  requiresEquipmentNo?: boolean
  requiresDuration?: boolean
  requiresLocationGps?: boolean
  requiresTireCount?: boolean
  requiresMaterialUsed?: boolean
}

type RouteFolder = {
  id: number
  routeCode: string
  routeName: string
  groups: Array<{
    id: number
    groupName: string
    items: Array<{
      id: number
      routeGroupId: number
      libraryActivityId: number | null
      itemCode?: string | null
      itemLabel?: string | null
      sortOrder?: number | null
    }>
  }>
}

type ApprovalStep = {
  id: number
  stepOrder: number
  stepLabel: string
  approverEmployeeId?: number | null
  approverEmail?: string | null
  approverName: string
  approverRole: string
  status: string
  signatureDataUrl: string | null
  remarks: string
  signedAt: Date | string | null
}

type SessionItem = {
  id: number
  label: string
  group: string
  unitNumber: string
  remark: string
  duration: string
  points: number
  sortOrder: number
  startTime?: string
  endTime?: string
  photoUrl?: string | null
}

type ApprovalData = {
  sessionId: number
  sessionCode: string
  workDate: Date | string
  shiftCode: string
  status: string
  summaryRemark?: string | null
  submittedAt: Date | string | null
  approvedAt: Date | string | null
  teamMembersSummary?: string | null
  spl?: any | null
  employee: {
    id?: number
    name: string
    sn: string
    department: string
    section: string
    jobTitle: string
  }
  site: {
    id?: number
    name: string
    customerName: string
  }
  totals: {
    itemCount: number
    totalPoints: number
  }
  sessionItems: SessionItem[]
  approvals: ApprovalStep[]
  permissions: {
    canApprove: boolean
    isCurrentEmployee: boolean
    currentEmployeeId?: number
    currentEmployeeEmail?: string
    currentEmployeeName?: string
    accessRole: string
  }
}

function fmtDt(v: Date | string | null | undefined) {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function hasVisibleCanvasInk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || canvas.width === 0 || canvas.height === 0) return false
  try {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]
      const isDarkInk = pixels[i] < 245 || pixels[i + 1] < 245 || pixels[i + 2] < 245
      if (alpha > 12 && isDarkInk) return true
    }
  } catch {
    return false
  }
  return false
}

export function DailyActivityApprovalForm({
  data,
  employees: employeesProp = [],
  orgNodes = [],
  masterHeadMap,
  activityPresets = [],
  routeFolders = [],
}: {
  data: ApprovalData
  employees?: any[]
  orgNodes?: any[]
  masterHeadMap?: any
  activityPresets?: ModalPreset[]
  routeFolders?: RouteFolder[]
}) {
  const router = useRouter()
  let sidebarSetOpen: ((open: boolean) => void) | undefined
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sidebar = useSidebar()
    sidebarSetOpen = sidebar.setOpen
  } catch (e) {
    sidebarSetOpen = undefined
  }

  const hasAutoClosed = useRef(false)

  useEffect(() => {
    if (!hasAutoClosed.current && sidebarSetOpen) {
      sidebarSetOpen(false)
      hasAutoClosed.current = true
    }
  }, [sidebarSetOpen])

  const [isPending, startTransition] = useTransition()
  const sigRef = useRef<SignatureCanvas | null>(null)
  const [signaturesByStepId, setSignaturesByStepId] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    ;(data?.approvals || []).forEach((a) => {
      if (a?.signatureDataUrl) {
        map[a.id] = a.signatureDataUrl
      }
    })
    return map
  })

  useEffect(() => {
    if (data?.approvals && data.approvals.length > 0) {
      setSignaturesByStepId((prev) => {
        const next = { ...prev }
        data.approvals.forEach((a) => {
          if (a?.signatureDataUrl) {
            next[a.id] = a.signatureDataUrl
          }
        })
        return next
      })
    }
  }, [data?.approvals])
  const [previewSig, setPreviewSig] = useState<string>('')
  const [previewSignedAt, setPreviewSignedAt] = useState<Date | null>(null)
  const [registeredSignature, setRegisteredSignature] = useState<string | null>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isMissingSignatureDialogOpen, setIsMissingSignatureDialogOpen] = useState(false)
  const [evidenceQrDataUrl, setEvidenceQrDataUrl] = useState<string>('')
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)

  useEffect(() => {
    if (!data?.sessionId) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const targetUrl = `${origin}/activity-evidence/${data.sessionId}`
    QRCode.toDataURL(targetUrl, { margin: 1, width: 140, errorCorrectionLevel: 'M' })
      .then((url) => setEvidenceQrDataUrl(url))
      .catch((err) => console.error('Failed to generate evidence QR code:', err))
  }, [data?.sessionId])

  useEffect(() => {
    getUserSignatureAction().then((res) => {
      if (res.success && res.signatureDataUrl) {
        setRegisteredSignature(res.signatureDataUrl)
        setPreviewSig(res.signatureDataUrl)
        setPreviewSignedAt(new Date())
      }
    })
  }, [])

  const isComplete = ['approved', 'closed', 'completed'].includes((data?.status || '').toLowerCase())
  const isRejected = (data?.status || '').toLowerCase() === 'rejected'
  const isReverted = (data?.status || '').toLowerCase() === 'reverted' || (data?.status || '').toLowerCase() === 'needs_revision'
  const isDraftOrRevision = ['draft', 'returned', 'reverted', 'needs_revision'].includes((data?.status || '').toLowerCase())
  const canEditItems = isDraftOrRevision && Boolean(data?.permissions?.isCurrentEmployee)

  const [activeStepId, setActiveStepId] = useState<number>(() => {
    const pending = (data?.approvals || []).find((a) => a?.status === 'pending')
    return pending ? pending.id : (data?.approvals?.[0]?.id ?? 1)
  })
  const [stepRemarks, setStepRemarks] = useState<Record<number, string>>({})
  const [itemRemarks, setItemRemarks] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    ;(data?.sessionItems || []).forEach((i) => {
      if (i) init[i.id] = i.remark || ''
    })
    return init
  })
  const sanitizedInitialCustomer = useMemo(() => {
    return (data.site?.customerName || '')
      .replace(/\s*\|\s*\[Team:\s*[^\]]+\]/gi, '')
      .replace(/\s*\[Team:\s*[^\]]+\]/gi, '')
      .replace(/\s*\|\s*$/, '')
      .trim()
  }, [data.site?.customerName])

  const [profileForm, setProfileForm] = useState({
    employeeId: data.employee.id ? String(data.employee.id) : '',
    employeeName: data.employee.name,
    employeeSn: data.employee.sn,
    jobTitle: data.employee.jobTitle || '',
    department: data.employee.department || '',
    section: data.employee.section || '',
    workDate: formatDateInput(data.workDate) || formatDateInput(new Date()),
    shiftCode: data.shiftCode || 'ALL',
    siteName: data.site.name || '',
    customerName: sanitizedInitialCustomer,
  })
  const initialTeamMatch = (data.summaryRemark || '').match(/\[Team:\s*([^\]]+)\]/i)
  const initialTeamNames = useMemo(
    () => (initialTeamMatch ? initialTeamMatch[1].split(',').map((s) => s.trim()) : []),
    [data.summaryRemark]
  )
  const [isTeamLog, setIsTeamLog] = useState<boolean>(() => initialTeamNames.length > 0)
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<number[]>(() => {
    if (initialTeamNames.length > 0) {
      const ids: number[] = []
      initialTeamNames.forEach((name) => {
        const found = employeesProp.find((e) => e.name.toLowerCase() === name.toLowerCase())
        if (found) ids.push(found.id)
      })
      if (data.employee.id && !ids.includes(data.employee.id)) {
        ids.unshift(data.employee.id)
      }
      return ids
    }
    return data.employee.id ? [data.employee.id] : []
  })
  const [teamMemberPickerOpen, setTeamMemberPickerOpen] = useState(false)
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('')

  const filteredFormEmployees = useMemo(() => {
    if (!teamMemberSearchQuery) return employeesProp
    const q = teamMemberSearchQuery.toLowerCase()
    return employeesProp.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeSn && e.employeeSn.toLowerCase().includes(q)) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(q))
    )
  }, [employeesProp, teamMemberSearchQuery])

  const currentTeamMembersSummary = useMemo(() => {
    if (isTeamLog && selectedTeamMemberIds.length > 0) {
      const names = employeesProp
        .filter((e) => selectedTeamMemberIds.includes(e.id))
        .map((e) => e.name)
        .join(', ')
      if (names) return names
    }
    if (data.teamMembersSummary) return data.teamMembersSummary
    if (initialTeamMatch) return initialTeamMatch[1].trim()
    return null
  }, [isTeamLog, selectedTeamMemberIds, employeesProp, data.teamMembersSummary, initialTeamMatch])

  const [itemsList, setItemsList] = useState<SessionItem[]>(data.sessionItems);
  const [sourceMode, setSourceMode] = useState<'self_input' | 'assigned' | 'custom'>('self_input');
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandedPickerGroups, setExpandedPickerGroups] = useState<Set<string>>(new Set());

  const normalizedPickerSearch = useMemo(() => {
    return (pickerSearch || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  }, [pickerSearch])

  const availableLibraryMap = useMemo(() => {
    const map = new Map<string, ModalPreset>()
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
              .filter((lib): lib is ModalPreset => Boolean(lib))
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
    const groupCount = (matchingRouteFolders || []).reduce(
      (sum, r) => sum + (r?.matchingGroups || []).reduce((gSum, g) => gSum + (g?.matchingItems?.length || 0), 0),
      0
    )
    return groupCount + (standaloneLibraries || []).length
  }, [matchingRouteFolders, standaloneLibraries])

  const toggleGroupItems = (groupItems: ModalPreset[]) => {
    const isAllSelected = groupItems.every((sub) =>
      (itemsList || []).some(
        (i) => (i?.label && sub.code && i.label.includes(sub.code)) || (i?.label && sub.name && i.label.includes(sub.name))
      )
    )

    if (isAllSelected) {
      setItemsList((prev) =>
        prev.filter(
          (i) => !groupItems.some((sub) => (i?.label && sub.code && i.label.includes(sub.code)) || (i?.label && sub.name && i.label.includes(sub.name)))
        )
      )
    } else {
      const missing = groupItems.filter(
        (sub) => !(itemsList || []).some(
          (i) => (i?.label && sub.code && i.label.includes(sub.code)) || (i?.label && sub.name && i.label.includes(sub.name))
        )
      )
      setItemsList((prev) => [
        ...prev,
        ...missing.map((sub, idx) => ({
          id: -Date.now() - Math.floor(Math.random() * 10000) - idx,
          label: `${sub.code} - ${sub.name}`,
          group: sub.category || 'Technical',
          unitNumber: '',
          duration: '30m',
          points: sub.basePoints || 5,
          remark: '',
          sortOrder: prev.length + idx + 1,
          startTime: '08:00',
          endTime: '08:30',
          photoUrl: null,
        })),
      ])
    }
  }

  const addPresetActivity = (label: string, points = 10, category = 'Technical') => {
    setItemsList((prev) => {
      const exists = prev.some((i) => i.label === label)
      if (exists) return prev
      const newItem: SessionItem = {
        id: -Date.now() - Math.floor(Math.random() * 1000),
        label,
        group: category,
        unitNumber: '',
        remark: '',
        duration: '30m',
        points,
        sortOrder: prev.length + 1,
        startTime: '08:00',
        endTime: '08:30',
        photoUrl: null,
      }
      return [...prev, newItem]
    })
  }
  
  const initialLeader = data.approvals.find((a) => a.approverRole === 'leader')
  const initialSuperior = data.approvals.find((a) => a.approverRole === 'section_head')
  const initialManager = data.approvals.find((a) => a.approverRole === 'manager')

  const [selectedLeaderId, setSelectedLeaderId] = useState<string>(() => {
    if (initialLeader?.approverEmployeeId) return String(initialLeader.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialLeader?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [selectedSuperiorId, setSelectedSuperiorId] = useState<string>(() => {
    if (initialSuperior?.approverEmployeeId) return String(initialSuperior.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialSuperior?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [selectedManagerId, setSelectedManagerId] = useState<string>(() => {
    if (initialManager?.approverEmployeeId) return String(initialManager.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialManager?.approverName)
    return matched ? String(matched.id) : ''
  })

  const [leaderTitle, setLeaderTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedLeaderId || e.name === initialLeader?.approverName)
    return matched?.rank || matched?.position || matched?.jobTitle || ''
  })
  const [superiorTitle, setSuperiorTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedSuperiorId || e.name === initialSuperior?.approverName)
    return matched?.rank || matched?.position || matched?.jobTitle || ''
  })
  const [managerTitle, setManagerTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedManagerId || e.name === initialManager?.approverName)
    return matched?.rank || matched?.position || matched?.jobTitle || ''
  })

  const handleAddItem = () => {
    const newItem: SessionItem = {
      id: -Date.now(),
      label: '',
      group: 'Technical',
      unitNumber: '',
      remark: '',
      duration: '1j 0m',
      points: 5,
      sortOrder: itemsList.length + 1,
    }
    setItemsList((prev) => [...prev, newItem])
  }

  const handleRemoveItem = (index: number) => {
    setItemsList((prev) => prev.filter((_, i) => i !== index))
  }

  const [uploadingItemIdx, setUploadingItemIdx] = useState<number | null>(null)

  const handleUpdateItem = (index: number, field: keyof SessionItem, value: any) => {
    setItemsList((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    )
  }

  const handleItemPhotoUpload = async (index: number, file: File | null) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 10MB')
      return
    }

    setUploadingItemIdx(index)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadTarget', 'daily_activity')
      const res = await uploadFile(formData)
      if (res.success && (res.readableUrl || res.url)) {
        const finalUrl = res.readableUrl || res.url
        handleUpdateItem(index, 'photoUrl', finalUrl)
        toast.success('Foto bukti pekerjaan berhasil diunggah!')
      } else {
        // Fallback to local base64 reader
        const reader = new FileReader()
        reader.onload = () => {
          const base64Url = reader.result as string
          handleUpdateItem(index, 'photoUrl', base64Url)
          toast.success('Foto bukti pekerjaan berhasil disimpan!')
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      const reader = new FileReader()
      reader.onload = () => {
        const base64Url = reader.result as string
        handleUpdateItem(index, 'photoUrl', base64Url)
        toast.success('Foto bukti pekerjaan berhasil disimpan!')
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingItemIdx(null)
    }
  }

  const handleLeaderChange = (val: string) => {
    setSelectedLeaderId(val)
    const matched = employeesProp.find((e) => String(e.id) === val)
    if (matched) {
      setLeaderTitle(matched.rank || matched.position || matched.jobTitle || '')
    }
  }

  const handleSuperiorChange = (val: string) => {
    setSelectedSuperiorId(val)
    const matched = employeesProp.find((e) => String(e.id) === val)
    if (matched) {
      setSuperiorTitle(matched.rank || matched.position || matched.jobTitle || '')
    }
  }

  const handleManagerChange = (val: string) => {
    setSelectedManagerId(val)
    const matched = employeesProp.find((e) => String(e.id) === val)
    if (matched) {
      setManagerTitle(matched.rank || matched.position || matched.jobTitle || '')
    }
  }

  const getCanvasSignatureDataUrl = () => {
    const signature = sigRef.current
    if (!signature) return ''
    const canvas = signature.getCanvas()
    if (!hasVisibleCanvasInk(canvas) && signature.isEmpty()) return ''
    try {
      return signature.getTrimmedCanvas().toDataURL('image/png')
    } catch {
      return signature.toDataURL('image/png')
    }
  }

  const updateSignaturePreview = () => {
    const dataUrl = getCanvasSignatureDataUrl()
    if (dataUrl) {
      if (activeStepId) {
        setSignaturesByStepId((prev) => ({ ...prev, [activeStepId]: dataUrl }))
      }
      setPreviewSig(dataUrl)
      setPreviewSignedAt(new Date())
    }
    return dataUrl
  }

  const allApproved = data.approvals.length > 0 && data.approvals.every((a) => a.status === 'approved')

  const handleSaveForm = () => {
    // 1. Minimum items check
    if (!itemsList || itemsList.length === 0) {
      toast.error('Minimal harus ada 1 aktivitas dalam laporan.')
      return
    }

    // 2. Strict evidence photo check for each activity item
    for (let idx = 0; idx < itemsList.length; idx++) {
      const item = itemsList[idx]
      const itemNumber = idx + 1
      const itemLabel = item.label?.includes(' - ')
        ? item.label.split(' - ').slice(1).join(' - ')
        : (item.label || `Item #${itemNumber}`)

      const hasPhoto = Boolean(
        (typeof item.photoUrl === 'string' && item.photoUrl.trim().length > 0) ||
        (Array.isArray((item as any).photos) && (item as any).photos.length > 0) ||
        (Array.isArray((item as any).photoUrls) && (item as any).photoUrls.length > 0)
      )

      if (!hasPhoto) {
        toast.error(
          `Foto bukti pekerjaan (evidence) pada item #${itemNumber} (${itemLabel}) wajib diunggah sebelum ${isReverted ? 'mengirim ulang revisi' : 'menyimpan form'}!`
        )
        return
      }
    }

    startTransition(async () => {
      const leaderSignatureDataUrl = (activeStepId ? signaturesByStepId[activeStepId] : undefined) || getCanvasSignatureDataUrl() || previewSig
      const selectedLeader = employeesProp.find((e) => String(e.id) === selectedLeaderId)
      const selectedSuperior = employeesProp.find((e) => String(e.id) === selectedSuperiorId)
      const selectedManager = employeesProp.find((e) => String(e.id) === selectedManagerId)
      const res = await saveDailyActivityApprovalForm({
        sessionId: data.sessionId,
        employeeId: profileForm.employeeId ? Number(profileForm.employeeId) : undefined,
        workDate: profileForm.workDate || undefined,
        shiftCode: profileForm.shiftCode || undefined,
        customerName: profileForm.customerName?.trim() || undefined,
        items: itemsList,
        itemRemarks,
        leaderSignatureDataUrl: leaderSignatureDataUrl || undefined,
        leaderEmployeeId: selectedLeader ? selectedLeader.id : undefined,
        leaderName: selectedLeader?.name || undefined,
        leaderEmail: selectedLeader?.email || undefined,
        leaderTitle: leaderTitle || selectedLeader?.rank || selectedLeader?.position || undefined,
        superiorEmployeeId: selectedSuperior ? selectedSuperior.id : undefined,
        superiorName: selectedSuperior?.name || undefined,
        superiorEmail: selectedSuperior?.email || undefined,
        superiorTitle: superiorTitle || selectedSuperior?.rank || selectedSuperior?.position || undefined,
        managerEmployeeId: selectedManager ? selectedManager.id : undefined,
        managerName: selectedManager?.name || undefined,
        managerEmail: selectedManager?.email || undefined,
        managerTitle: managerTitle || selectedManager?.rank || selectedManager?.position || undefined,
        signatures: signaturesByStepId,
        stepRemarks,
        teamMemberEmployeeIds: isTeamLog ? selectedTeamMemberIds : [],
      })
      if (res.success) {
        toast.success(isReverted ? 'Revisi Daily Activity berhasil dikirim ulang!' : 'Daily Activity Report berhasil disimpan!')
        router.push('/dashboard/activity-hub/approval')
        router.refresh()
      } else {
        toast.error('Gagal menyimpan: ' + (res.error || 'Terjadi kesalahan'))
      }
    })
  }

  const handleApproveStep = (stepId: number) => {
    const signatureDataUrl = signaturesByStepId[stepId] || getCanvasSignatureDataUrl() || previewSig || registeredSignature
    if (!signatureDataUrl) {
      setIsMissingSignatureDialogOpen(true)
      return
    }

    startTransition(async () => {
      // Persist any form changes together with the signature approval
      const selectedLeader = employeesProp.find((e) => String(e.id) === selectedLeaderId)
      const selectedSuperior = employeesProp.find((e) => String(e.id) === selectedSuperiorId)
      const selectedManager = employeesProp.find((e) => String(e.id) === selectedManagerId)

      await saveDailyActivityApprovalForm({
        sessionId: data.sessionId,
        employeeId: profileForm.employeeId ? Number(profileForm.employeeId) : undefined,
        workDate: profileForm.workDate || undefined,
        shiftCode: profileForm.shiftCode || undefined,
        customerName: profileForm.customerName?.trim() || undefined,
        items: itemsList,
        itemRemarks,
        leaderEmployeeId: selectedLeader ? selectedLeader.id : undefined,
        leaderName: selectedLeader?.name || undefined,
        leaderEmail: selectedLeader?.email || undefined,
        leaderTitle: leaderTitle || selectedLeader?.rank || selectedLeader?.position || undefined,
        superiorEmployeeId: selectedSuperior ? selectedSuperior.id : undefined,
        superiorName: selectedSuperior?.name || undefined,
        superiorEmail: selectedSuperior?.email || undefined,
        superiorTitle: superiorTitle || selectedSuperior?.rank || selectedSuperior?.position || undefined,
        managerEmployeeId: selectedManager ? selectedManager.id : undefined,
        managerName: selectedManager?.name || undefined,
        managerEmail: selectedManager?.email || undefined,
        managerTitle: managerTitle || selectedManager?.rank || selectedManager?.position || undefined,
        teamMemberEmployeeIds: isTeamLog ? selectedTeamMemberIds : [],
      })

      const fd = new FormData()
      fd.set('sessionId', String(data.sessionId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'approve')
      fd.set('signatureDataUrl', signatureDataUrl)
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitDailyActivityApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success('Persetujuan berhasil ditandatangani!')
        router.push('/dashboard/activity-hub/approval')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal memproses approval.')
      }
    })
  }

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    actionType: 'reject' | 'revert'
    stepId: number
  } | null>(null)

  const executeRejectStep = (stepId: number) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('sessionId', String(data.sessionId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'reject')
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitDailyActivityApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success('Aktivitas ditolak.')
        router.push('/dashboard/activity-hub/approval')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal menolak approval.')
      }
    })
  }

  const executeRevertStep = (stepId: number) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('sessionId', String(data.sessionId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'revert')
      fd.set('remarks', stepRemarks[stepId] || 'Dokumen dikembalikan oleh Department Head untuk revisi.')

      const res = await submitDailyActivityApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success(res.message || 'Dokumen berhasil dikembalikan untuk revisi.')
        router.push('/dashboard/activity-hub/approval')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal mengembalikan dokumen.')
      }
    })
  }

  const handleRejectStep = (stepId: number) => {
    setConfirmDialog({ isOpen: true, actionType: 'reject', stepId })
  }

  const handleRevertStep = (stepId: number) => {
    setConfirmDialog({ isOpen: true, actionType: 'revert', stepId })
  }

  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    toast.loading('Menyiapkan file PDF...', { id: 'act-form-dl' })
    try {
      const el = document.querySelector('.pdf-wrapper') as HTMLElement
      if (el) {
        await downloadElementAsPdf(el, `DailyActivity_${data.sessionCode.replace(/[\/\\]/g, '_')}.pdf`)
        toast.success('PDF berhasil diunduh!', { id: 'act-form-dl' })
      } else {
        toast.error('Gagal menemukan template PDF', { id: 'act-form-dl' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF', { id: 'act-form-dl' })
    } finally {
      setIsDownloading(false)
    }
  }

  // Display approval history with preview injection (2 sequential digital steps)
  const approvalHistoryForDisplay = useMemo(() => {
    const defaultSteps = [
      { stepOrder: 1, stepLabel: 'Karyawan Sign', approverRole: 'employee', id: 1, status: 'pending', approverName: profileForm.employeeName || data.employee.name || 'Karyawan', signatureDataUrl: null, remarks: '', signedAt: null },
      { stepOrder: 2, stepLabel: 'Leader / PJO', approverRole: 'leader', id: 2, status: 'waiting', approverName: employeesProp.find((e) => String(e.id) === selectedLeaderId)?.name || 'Leader Lapangan', signatureDataUrl: null, remarks: '', signedAt: null },
    ]

    const filteredApprovals = (data.approvals || []).filter((a) => (a.stepOrder ?? 0) <= 2 && a.approverRole !== 'section_head' && a.approverRole !== 'manager')

    const merged = defaultSteps.map((def) => {
      const match = filteredApprovals.find((a) => a.stepOrder === def.stepOrder || a.approverRole === def.approverRole)
      if (match) {
        return {
          ...def,
          ...match,
        }
      }
      return def
    })

    return merged
      .filter((step) => step.stepOrder <= 2)
      .map((step) => {
        const rawStatus = (step.status || '').toLowerCase()
        const isApproved = ['approved', 'signed', 'completed'].includes(rawStatus)
        const isReverted = rawStatus === 'reverted' || rawStatus === 'needs_revision'
        const isActivelySigning = activeStepId === step.id && Boolean(previewSig)

        const currentSig = isApproved
          ? (signaturesByStepId[step.id] || step.signatureDataUrl || null)
          : isActivelySigning
          ? previewSig
          : null

        const currentRemark = stepRemarks[step.id] !== undefined ? stepRemarks[step.id] : step.remarks
        const currentSignedAt =
          step.signedAt ||
          (isReverted ? ((data as any).updatedAt || new Date()) : null) ||
          (isActivelySigning ? (previewSignedAt || new Date()) : null)

        return {
          ...step,
          status: rawStatus,
          signatureDataUrl: currentSig,
          remarks: currentRemark || step.remarks,
          signedAt: currentSignedAt,
        }
      })
  }, [data.approvals, data.status, data.submittedAt, data.workDate, (data as any).updatedAt, activeStepId, previewSig, previewSignedAt, stepRemarks, signaturesByStepId, profileForm.employeeName, data.employee, selectedLeaderId, employeesProp])

  const employeeSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'employee')
  const leaderSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'leader' || a.approverRole === 'pjo_or_te_initial')
  const sectionHeadSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'section_head' || a.approverRole === 'section_head_confirmation')
  const managerSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'manager' || a.approverRole === 'central_service_manager' || a.approverRole === 'hr')

  function renderApprovalMeta(step: any) {
    if (!step?.signedAt && !step?.remarks) return null
    return (
      <div className="mt-1 space-y-0.5 text-[7pt] text-slate-500">
        {step?.signedAt && <div>Waktu TTD: {fmtDt(step.signedAt)}</div>}
        {step?.remarks && <div className="italic text-slate-600">Catatan: {step.remarks}</div>}
      </div>
    )
  }

  // ── Document Content for Preview ──
  const pdfDocumentContent = (
    <div
      id="pdf-content"
      className="relative z-10 text-[8.5pt] font-sans leading-tight text-black"
      style={{
        paddingTop: '38mm',
        paddingBottom: '35mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        minHeight: '297mm',
      }}
    >
      {/* Header Document */}
      <div className="text-center mb-3">
        <h1 className="font-bold text-[11pt] text-black mb-0.5 uppercase">PT. CHITRA PARATAMA</h1>
        <h2 className="font-bold text-[12pt] text-black uppercase tracking-wider">{data.spl ? 'SURAT PERINTAH LEMBUR' : 'DAILY ACTIVITY APPROVAL REPORT'}</h2>
      </div>

      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 text-[8.5pt]">
        <tbody>
          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Details</td></tr>
          <tr>
            <td className="w-1/2">Tanggal Kerja: <strong>{profileForm.workDate ? fmtDate(profileForm.workDate) : '—'}</strong></td>
            <td className="w-1/2">Shift: <strong>{profileForm.shiftCode || 'ALL'}</strong></td>
          </tr>
          <tr>
            <td>Kode Sesi: <strong>{data.sessionCode}</strong></td>
            <td>Status: <span className="capitalize font-bold text-black">{data.status}</span></td>
          </tr>
          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Employee Profile</td></tr>
          <tr>
            <td>Nama: <strong>{profileForm.employeeName}</strong></td>
            <td>SN: <strong>{profileForm.employeeSn}</strong></td>
          </tr>
          <tr>
            <td>Job Title: <strong>{profileForm.jobTitle || 'Staff'}</strong></td>
            <td>Dept / Section: <strong>{[profileForm.department, profileForm.section].filter(Boolean).join(' / ') || '—'}</strong></td>
          </tr>
          <tr>
            <td>Site: <strong>{profileForm.siteName || '—'}</strong></td>
            <td>Customer: <strong>{profileForm.customerName || 'Default Customer'}</strong></td>
          </tr>
          {currentTeamMembersSummary ? (
            <tr>
              <td colSpan={2}>
                Anggota Tim: <span className="text-black font-normal">{currentTeamMembersSummary}</span>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* A. Daily Activity Items */}
      <div className="font-bold mb-1 text-[8.5pt]">
        A. Daily Activity Items (Total: {itemsList.length} item, {itemsList.reduce((s, i) => s + (Number(i.points) || 0), 0)} poin)
      </div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
        <thead>
          <tr className="bg-gray-100 font-bold text-center">
            <th className="w-[5%]">#</th>
            <th className="text-left w-[46%]">Aktivitas</th>
            <th className="w-[14%]">Durasi</th>
            <th className="w-[12%]">Poin</th>
            <th className="text-left w-[23%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          {itemsList.length > 0 ? (
            itemsList.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="text-center align-middle">{idx + 1}</td>
                <td className="align-middle">{item.label}</td>
                <td className="text-center align-middle">{item.duration}</td>
                <td className="text-center font-bold align-middle">{item.points || 0}</td>
                <td className="text-left text-[7.5pt] align-middle">{itemRemarks[item.id] || item.remark || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center text-gray-400 py-3">Belum ada item aktivitas.</td>
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
          {approvalHistoryForDisplay.length > 0 ? (
            approvalHistoryForDisplay.map((step) => {
              const liveRemark = stepRemarks[step.id] || step.remarks || '—'
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
                  <td className="text-[7pt] font-mono">{fmtDt(step.signedAt)}</td>
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

      {/* Signatories (3 Roles: Employee, Leader/PJO, Customer) */}
      <div className="font-bold mb-2 text-[8.5pt]">Signatories</div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-3">
        {/* Karyawan */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Employee Signature</div>
          <div className="h-14 flex items-end">
            {employeeSig?.signatureDataUrl ? (
              <img src={employeeSig.signatureDataUrl} alt="TTD" className="h-10 object-contain" />
            ) : employeeSig?.status === 'approved' ? (
              <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">{data.employee.name}</span>
            ) : (
              <span className="text-slate-400 italic text-[7.5pt]"></span>
            )}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
            {data.employee.name}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">{data.employee.jobTitle || 'Staff'}</div>
          {employeeSig?.signedAt && (
            <div className="text-[6.5pt] text-slate-500 mt-0.5">
              {employeeSig?.status === 'reverted' ? 'Waktu Revert: ' : 'Waktu TTD: '}
              {fmtDt(employeeSig.signedAt)}
            </div>
          )}
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
            {leaderSig?.approverName || 'Leader / PJO'}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">Leader / PJO</div>
          {leaderSig?.signedAt && (
            <div className="text-[6.5pt] text-slate-500 mt-0.5">
              {leaderSig?.status === 'reverted' ? 'Waktu Revert: ' : 'Waktu TTD: '}
              {fmtDt(leaderSig.signedAt)}
            </div>
          )}
        </div>

        {/* Customer (Manual Wet Signature) */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Customer Signature</div>
          <div className="h-14 flex items-end">
            {/* Kolom tanda tangan manual basah */}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt] min-h-[14px]" style={{ width: '80%' }}>
            &nbsp;
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">Customer</div>
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

  const activeStep = data.approvals.find((a) => a.id === activeStepId) || data.approvals.find((a) => a.status === 'pending') || data.approvals[0]
  const currentEmpId = data.permissions.currentEmployeeId
  const currentEmpEmail = (data.permissions.currentEmployeeEmail || '').toLowerCase().trim()
  const currentEmpName = (data.permissions.currentEmployeeName || '').toLowerCase().trim()

  // STRICT IDENTITY CHECK: Only true if logged in user is the designated approver for the active step
  const isMyTurn = Boolean(
    activeStep &&
      (activeStep.status === 'pending' || activeStep.status === 'preview') &&
      ((activeStep.approverEmployeeId != null && activeStep.approverEmployeeId === currentEmpId) ||
        (Boolean(activeStep.approverEmail) &&
          activeStep.approverEmail?.toLowerCase().trim() === currentEmpEmail) ||
        (Boolean(activeStep.approverName) &&
          activeStep.approverName?.toLowerCase().trim() === currentEmpName))
  )

  const isStepActionable = isMyTurn
  const canUserSignActiveStep = isMyTurn
  const isCurrentStepPending = activeStep && (activeStep.status === 'pending' || activeStep.status === 'preview')
  const activeSignerName = isMyTurn
    ? (currentEmpName ? data.permissions.currentEmployeeName : activeStep?.approverName)
    : (activeStep?.approverName || 'Approver')

  const [activeView, setActiveView] = useState<'form' | 'preview'>('form')

  return (
    <AdminPageShell
      eyebrow="HC • Form"
      title="Daily Activity Approval & Review"
      description="Evaluasi laporan aktivitas harian teknisi dan tanda tangan verifikasi bertingkat."
    >
      <div className="space-y-4">
      {/* Mobile/Tablet View Toggle */}
      <div className="flex xl:hidden items-center justify-center p-1 bg-slate-100 rounded-full max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => setActiveView('form')}
          className={cn(
            'flex-1 py-1.5 text-xs font-bold rounded-full transition-all text-center',
            activeView === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          )}
        >
          📝 Formulir Input
        </button>
        <button
          type="button"
          onClick={() => setActiveView('preview')}
          className={cn(
            'flex-1 py-1.5 text-xs font-bold rounded-full transition-all text-center',
            activeView === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          )}
        >
          📄 Live PDF Preview
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── KIRI: Header + Form + TTD ── */}
        <div className={cn('flex flex-col gap-6 print:hidden', activeView === 'preview' ? 'hidden xl:flex' : 'flex')}>
          {/* Status Alert Banners */}
          {isRejected && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm text-rose-900">Dokumen ini telah ditolak (Rejected)</p>
                <p className="text-xs text-rose-700 mt-0.5">Dokumen yang sudah di-reject tidak dapat diedit atau diajukan ulang. Silakan buat laporan Daily Activity baru.</p>
              </div>
              <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0">
                <Link href="/dashboard/activity-hub/my-day">Buat Baru</Link>
              </Button>
            </div>
          )}

          {isReverted && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 flex items-start gap-3 shadow-xs">
              <RotateCcw className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-900">Dokumen ini dikembalikan untuk revisi (Reverted)</p>
                <p className="text-xs text-amber-700 mt-0.5">Silakan sesuaikan data aktivitas atau catatan pekerjaan, lalu klik <strong>"Kirim Ulang"</strong> untuk meneruskan kembali ke atasan yang meminta revisi.</p>
              </div>
            </div>
          )}

          {/* Top Action Bar (Contract Review Parity) */}
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/activity-hub/approval">
                <ArrowLeft className="mr-2 size-4" /> Kembali
              </Link>
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="gap-2"
            >
              <Download className="size-4" /> {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
            </Button>
            {canEditItems && !isRejected && (
              <Button
                className={cn(
                  'ml-auto font-bold text-white',
                  isReverted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                )}
                onClick={handleSaveForm}
                disabled={isPending}
              >
                {isReverted ? (
                  <>
                    <SendHorizontal className="mr-2 size-4" /> {isPending ? 'Mengirim Ulang...' : 'Kirim Ulang'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" /> {isPending ? 'Menyimpan...' : 'Simpan Form'}
                  </>
                )}
              </Button>
            )}
          </div>

        {/* Details & Employee Profile */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Details & Employee Profile</CardTitle>
              <Badge variant="outline" className="capitalize">{data.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <EnterpriseFormGrid>
              <div className="space-y-2">
                <Label>Tanggal Kerja</Label>
                <Input
                  type="date"
                  value={profileForm.workDate}
                  onChange={(e) => setProfileForm((p) => ({ ...p, workDate: e.target.value }))}
                  disabled={!canEditItems}
                  readOnly={!canEditItems}
                />
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select
                  value={profileForm.shiftCode}
                  onValueChange={(val) => setProfileForm((p) => ({ ...p, shiftCode: val }))}
                  disabled={!canEditItems}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih Shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">ALL</SelectItem>
                    <SelectItem value="Shift 1">Shift 1</SelectItem>
                    <SelectItem value="Shift 2">Shift 2</SelectItem>
                    <SelectItem value="Day">Day Shift</SelectItem>
                    <SelectItem value="Night">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Pilih Karyawan</Label>
                <SearchableSelect
                  label="Karyawan"
                  placeholder="Pilih Karyawan..."
                  value={profileForm.employeeId}
                  disabled={!canEditItems}
                  onValueChange={(val) => {
                    const emp = employeesProp.find((e) => String(e.id) === val || String(e.employeeId) === val || String(e.employeeSn) === val)
                    if (emp) {
                      setProfileForm((p) => ({
                        ...p,
                        employeeId: String(emp.id),
                        employeeName: emp.name,
                        employeeSn: emp.employeeId || emp.employeeSn || p.employeeSn,
                        jobTitle: emp.position || emp.rank || emp.jobTitle || p.jobTitle,
                        department: emp.department || p.department,
                        section: emp.section || p.section,
                        siteName: emp.siteName || p.siteName,
                      }))
                      if (emp.directManagerId) {
                        setSelectedLeaderId(String(emp.directManagerId))
                        const mgr = employeesProp.find((e) => e.id === emp.directManagerId)
                        if (mgr) setLeaderTitle(mgr.rank || mgr.position || mgr.jobTitle || '')
                      }
                      if (emp.sectionId && masterHeadMap?.sections?.[String(emp.sectionId)]?.headEmployeeId) {
                        const sHeadId = masterHeadMap.sections[String(emp.sectionId)].headEmployeeId
                        setSelectedSuperiorId(String(sHeadId))
                        const sHead = employeesProp.find((e) => e.id === sHeadId)
                        if (sHead) setSuperiorTitle(sHead.rank || sHead.position || sHead.jobTitle || '')
                      }
                      if (emp.departmentId && masterHeadMap?.departments?.[String(emp.departmentId)]?.headEmployeeId) {
                        const dHeadId = masterHeadMap.departments[String(emp.departmentId)].headEmployeeId
                        setSelectedManagerId(String(dHeadId))
                        const dHead = employeesProp.find((e) => e.id === dHeadId)
                        if (dHead) setManagerTitle(dHead.rank || dHead.position || dHead.jobTitle || '')
                      }
                    }
                  }}
                  options={employeesProp.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.name} (${emp.employeeId || emp.employeeSn || emp.sn || '-'})`,
                  }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={profileForm.jobTitle}
                  onChange={(e) => setProfileForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  placeholder="Job Title"
                  disabled={!canEditItems}
                  readOnly={!canEditItems}
                />
              </div>
              <div className="space-y-2">
                <Label>Dept / Section</Label>
                <Input
                  value={profileForm.section ? `${profileForm.department} / ${profileForm.section}` : profileForm.department}
                  onChange={(e) => setProfileForm((p) => ({ ...p, department: e.target.value, section: '' }))}
                  placeholder="Dept / Section"
                  disabled={!canEditItems}
                  readOnly={!canEditItems}
                />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input
                  value={profileForm.siteName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, siteName: e.target.value }))}
                  placeholder="Nama Site"
                  disabled={!canEditItems}
                  readOnly={!canEditItems}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input
                  value={profileForm.customerName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, customerName: e.target.value }))}
                  placeholder="Nama Customer"
                  disabled={!canEditItems}
                  readOnly={!canEditItems}
                />
              </div>
            </EnterpriseFormGrid>
          </CardContent>
        </Card>

        {/* Team Logging Card */}
        <Card className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <div>
                <span className="font-bold text-slate-800 text-xs">Team Logging (Input Sekaligus untuk Tim)</span>
                <p className="text-[10px] text-slate-500">Pilih anggota tim yang bekerja bersama pada aktivitas ini</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-100 transition-colors">
              <span>Input untuk Tim</span>
              <input
                type="checkbox"
                checked={isTeamLog}
                disabled={!canEditItems}
                onChange={(e) => {
                  const checked = e.target.checked
                  setIsTeamLog(checked)
                  if (!checked && profileForm.employeeId) {
                    setSelectedTeamMemberIds([Number(profileForm.employeeId)])
                  }
                }}
                className="size-4 accent-primary rounded cursor-pointer"
              />
            </label>
          </div>

          {isTeamLog ? (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Popover open={teamMemberPickerOpen} onOpenChange={setTeamMemberPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEditItems}
                    className="w-full justify-between rounded-xl bg-white text-xs font-semibold text-slate-800 h-9 border-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="size-3.5 text-primary" />
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
                    {filteredFormEmployees.map((emp) => {
                      const isSelected = selectedTeamMemberIds.includes(emp.id)
                      const isPrimary = String(emp.id) === profileForm.employeeId
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
                            isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-slate-100',
                            isPrimary && 'opacity-80'
                          )}
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-800">
                              {emp.name} {isPrimary ? '(Pembuat/Primary)' : ''}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {emp.employeeSn || emp.employeeId || '-'} • {emp.jobTitle || emp.department || 'Staff'}
                            </p>
                          </div>
                          {isSelected ? <Check className="size-4 text-primary" /> : null}
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {selectedTeamMemberIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {employeesProp
                    .filter((e) => selectedTeamMemberIds.includes(e.id))
                    .map((e) => (
                      <Badge
                        key={e.id}
                        variant="secondary"
                        className="text-[11px] font-medium py-1 px-2.5 flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200"
                      >
                        <span>{e.name}</span>
                        {String(e.id) !== profileForm.employeeId && canEditItems ? (
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
        </Card>

        {/* SOURCE MODE SELECTION */}
        {canEditItems && (
          <Card className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Source Mode *</Label>
            <select
              value={sourceMode}
              onChange={(e) => setSourceMode(e.target.value as any)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="self_input">Self-input activity</option>
              <option value="assigned">Assigned activity</option>
              <option value="custom">Custom activity</option>
            </select>
          </Card>
        )}

          {/* KAMUS AKTIVITAS & LIBRARY INTEGRATION DI DESKTOP (DROPDOWN RAPI) */}
          {canEditItems && sourceMode === 'self_input' && (
            <Card className="rounded-[1.2rem] border border-indigo-100 bg-indigo-50/30 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Kamus Aktivitas & Library Integration</span>
                  <h4 className="text-xs font-semibold text-slate-800">Pilih dari Library Aktivitas Standar</h4>
                </div>
                <Badge variant="secondary" className="rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold border-0">
                  {itemsList.length} Aktivitas Dipilih
                </Badge>
              </div>

              {/* Modal Trigger Button */}
              <Button
                type="button"
                onClick={() => setIsPickerModalOpen(true)}
                className="w-full h-11 rounded-xl bg-[#003461] hover:bg-[#002647] text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <Search className="size-4" /> PILIH ACTIVITY LIBRARY
              </Button>

              {/* MODAL DIALOG: PILIH KAMUS AKTIVITAS (PARITY WITH CREATE MODAL) */}
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
                      <span>{(itemsList || []).filter((i) => i?.label?.trim()).length} dipilih</span>
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
                                      (itemsList || []).some(
                                        (i) => (i?.label && sub.code && i.label.includes(sub.code)) || (i?.label && sub.name && i.label.includes(sub.name))
                                      )
                                    )
                                  const selectedInGroupCount = group.matchingItems.filter((sub) =>
                                    (itemsList || []).some(
                                      (i) => (i?.label && sub.code && i.label.includes(sub.code)) || (i?.label && sub.name && i.label.includes(sub.name))
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
                                          const isSelected = (itemsList || []).some(
                                            (i) => (i?.label && sub.code && i.label.includes(sub.code)) || (i?.label && sub.name && i.label.includes(sub.name))
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
                                                  const idxToRemove = (itemsList || []).findIndex(
                                                    (i) => (i?.label && sub.code && i.label.includes(sub.code)) || (i?.label && sub.name && i.label.includes(sub.name))
                                                  )
                                                  if (idxToRemove >= 0) handleRemoveItem(idxToRemove)
                                                } else {
                                                  addPresetActivity(`${sub.code} - ${sub.name}`, sub.basePoints || 5, sub.category || 'Technical')
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
                              const isSelected = (itemsList || []).some(
                                (i) => (i?.label && item.code && i.label.includes(item.code)) || (i?.label && item.name && i.label.includes(item.name))
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
                                      const idxToRemove = (itemsList || []).findIndex(
                                        (i) => (i?.label && item.code && i.label.includes(item.code)) || (i?.label && item.name && i.label.includes(item.name))
                                      )
                                      if (idxToRemove >= 0) handleRemoveItem(idxToRemove)
                                    } else {
                                      addPresetActivity(`${item.code} - ${item.name}`, item.basePoints || 10, item.category || 'Technical')
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
                      PAKAI {(itemsList || []).filter((i) => i?.label?.trim()).length} ACTIVITY
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Active Selected Checklist Box */}
              {itemsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-indigo-100">
                  {itemsList.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white border border-indigo-200 rounded-md px-2 py-1 text-[11px] text-indigo-900 font-medium shadow-2xs">
                      <b>{item.label}</b> ({item.points} pts)
                      <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:text-rose-700 font-bold ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* A. Daily Activity Items — Table (PDF Matched) */}
          <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">A. Daily Activity Items</CardTitle>
                  <CardDescription className="text-xs">
                    Rincian pekerjaan & aktivitas harian (format sesuai tabel PDF).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                    {itemsList.length} Item • {itemsList.reduce((s, i) => s + (Number(i.points) || 0), 0)} Poin
                  </Badge>
                  {canEditItems ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddItem}
                      className="h-8 text-xs font-semibold gap-1.5 bg-white border-slate-300 hover:bg-slate-50 shadow-2xs"
                    >
                      <Plus className="size-3.5" /> Tambah Baris
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Quick Presets */}
              {canEditItems ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2 border-t border-slate-100">
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
                      onClick={() => {
                        const newItem: SessionItem = {
                          id: -Date.now(),
                          label: preset.name,
                          group: 'Technical',
                          unitNumber: '',
                          remark: '',
                          duration: '30m',
                          points: preset.pts,
                          sortOrder: itemsList.length + 1,
                        }
                        setItemsList((prev) => [...prev, newItem])
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-900 transition-colors shadow-2xs"
                    >
                      <Plus className="size-3 text-teal-600" /> {preset.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {itemsList.length > 0 ? (
                <div className="space-y-3">
                  {itemsList.map((item, idx) => (
                    <div key={item.id || idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3 relative shadow-2xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold font-mono text-slate-500">
                            #{idx + 1} • {item.label.includes(' - ') ? item.label.split(' - ')[0] : 'SVC'}
                          </p>
                          <h6 className="text-xs font-extrabold text-slate-900 mt-0.5">
                            {item.label.includes(' - ') ? item.label.split(' - ').slice(1).join(' - ') : item.label}
                          </h6>
                        </div>
                        {canEditItems ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition-colors text-xs font-bold cursor-pointer"
                            title="Hapus activity"
                          >
                            <X className="size-3.5" />
                          </button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Mulai</Label>
                          <Input
                            type="time"
                            disabled={!canEditItems}
                            value={(item as any).startTime || '08:00'}
                            onChange={(e) => handleUpdateItem(idx, 'startTime', e.target.value)}
                            className="h-8.5 text-xs bg-white border-slate-200 text-center font-mono disabled:opacity-80 disabled:bg-slate-50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Selesai</Label>
                          <Input
                            type="time"
                            disabled={!canEditItems}
                            value={(item as any).endTime || '08:30'}
                            onChange={(e) => handleUpdateItem(idx, 'endTime', e.target.value)}
                            className="h-8.5 text-xs bg-white border-slate-200 text-center font-mono disabled:opacity-80 disabled:bg-slate-50"
                          />
                        </div>
                      </div>

                      {(() => {
                        const itemPhotoUrl = (item as any).photoUrl || (Array.isArray((item as any).photos) ? (typeof (item as any).photos[0] === 'string' ? (item as any).photos[0] : (item as any).photos[0]?.url) : null) || (Array.isArray((item as any).photoUrls) ? (typeof (item as any).photoUrls[0] === 'string' ? (item as any).photoUrls[0] : (item as any).photoUrls[0]?.url) : null) || null
                        return (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Camera className="size-3.5 text-slate-500" /> Photo Evidence
                              </span>
                              {itemPhotoUrl && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shadow-2xs">
                                  <CheckCircle2 className="size-3 text-emerald-600" /> Ter-upload
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {itemPhotoUrl ? (
                                <div className="flex items-center gap-3 w-full bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                                  <a href={itemPhotoUrl} target="_blank" rel="noreferrer" className="shrink-0 group relative overflow-hidden rounded-md border border-slate-200">
                                    <img src={itemPhotoUrl} alt="Evidence" className="size-12 object-cover rounded-md group-hover:scale-105 transition-transform" />
                                  </a>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">Foto Bukti Terlampir</p>
                                    <p className="text-[10px] text-slate-400 truncate">Klik gambar untuk melihat ukuran penuh</p>
                                  </div>
                                  {canEditItems ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors">
                                        <RotateCcw className="size-3 text-slate-500" /> Ganti
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleItemPhotoUpload(idx, file)
                                            e.target.value = ''
                                          }}
                                        />
                                      </label>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          handleUpdateItem(idx, 'photoUrl', null)
                                          handleUpdateItem(idx, 'photos', [])
                                        }}
                                        className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg cursor-pointer"
                                      >
                                        <Trash2 className="size-3 mr-0.5" /> Hapus
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : canEditItems ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className={cn(
                                    "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all",
                                    uploadingItemIdx === idx
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 active:scale-95"
                                  )}>
                                    <Camera className="size-3.5 text-indigo-600" />
                                    <span>{uploadingItemIdx === idx ? 'Mengunggah...' : 'Kamera'}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      disabled={uploadingItemIdx === idx}
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleItemPhotoUpload(idx, file)
                                        e.target.value = ''
                                      }}
                                    />
                                  </label>

                                  <label className={cn(
                                    "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all",
                                    uploadingItemIdx === idx
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 active:scale-95"
                                  )}>
                                    <ImagePlus className="size-3.5 text-sky-600" />
                                    <span>{uploadingItemIdx === idx ? 'Mengunggah...' : 'Galeri'}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={uploadingItemIdx === idx}
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleItemPhotoUpload(idx, file)
                                        e.target.value = ''
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Tidak ada lampiran foto</p>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Catatan Item</Label>
                        <Input
                          placeholder="Hasil kerja, temuan, atau catatan singkat."
                          readOnly={!canEditItems}
                          disabled={!canEditItems}
                          value={itemRemarks[item.id] !== undefined ? itemRemarks[item.id] : (item.remark || '')}
                          onChange={(e) => {
                            const val = e.target.value
                            handleUpdateItem(idx, 'remark', val)
                            if (item.id) {
                              setItemRemarks((prev) => ({ ...prev, [item.id]: val }))
                            }
                          }}
                          className="h-8.5 text-xs bg-white border-slate-200 disabled:opacity-85 disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada item aktivitas. Klik <span className="font-semibold text-slate-700">"Tambah Baris"</span> atau gunakan <span className="font-semibold text-indigo-700">"Pilih Activity Library"</span>.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Approval */}
          <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Status Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {approvalHistoryForDisplay.map((step, idx) => {
                const roleLabels: Record<string, string> = {
                  employee: 'Karyawan',
                  leader: 'PJO/TE',
                  section_head: 'Section Head',
                  manager: 'Department Head',
                  hr: 'HR',
                }
                const displayName =
                  step.approverName ||
                  (step.approverRole === 'leader'
                    ? (employeesProp.find((e) => String(e.id) === selectedLeaderId)?.name || 'PJO/TE')
                    : step.approverRole === 'section_head'
                    ? (employeesProp.find((e) => String(e.id) === selectedSuperiorId)?.name || 'Section Head')
                    : step.approverRole === 'manager'
                    ? (employeesProp.find((e) => String(e.id) === selectedManagerId)?.name || 'Department Head')
                    : step.approverRole === 'employee'
                    ? (profileForm.employeeName || data.employee.name || 'Karyawan')
                    : 'Belum ditentukan')

                const displayRole = roleLabels[step.approverRole] || step.stepLabel || 'Approver'

                return (
                  <div
                    key={step.id || idx}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-4 bg-white transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] border-slate-200/80'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-400">{displayRole}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {step.status === 'approved' ? (
                        <Badge className="bg-emerald-50 text-emerald-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                          DISETUJUI
                        </Badge>
                      ) : step.status === 'pending' ? (
                        <Badge className="bg-amber-50 text-amber-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                          MENUNGGU
                        </Badge>
                      ) : step.status === 'rejected' ? (
                        <Badge className="bg-rose-50 text-rose-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                          DITOLAK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-slate-400 font-bold text-[10px] tracking-wide border-slate-200">
                          MENUNGGU
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Signatories */}
          <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Signatories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Leader / PJO Name</Label>
                    {initialLeader?.status === 'approved' ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        SUDAH DISETUJUI (TERKUNCI)
                      </span>
                    ) : null}
                  </div>
                  <SearchableSelect
                    label="Leader / PJO"
                    placeholder="PILIH LEADER / PJO..."
                    value={selectedLeaderId}
                    onValueChange={handleLeaderChange}
                    options={employeesProp.map((emp) => ({
                      value: String(emp.id),
                      label: `${emp.name} - ${emp.rank || emp.position || emp.jobTitle || 'Staff'}`,
                    }))}
                    widthClassName="w-full"
                    disabled={initialLeader?.status === 'approved'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Leader Title</Label>
                  <Input
                    value={leaderTitle}
                    onChange={(e) => setLeaderTitle(e.target.value)}
                    placeholder="Leader Title / PJO Title"
                    className="h-10 bg-slate-50/60 border-slate-200 text-xs"
                    disabled={initialLeader?.status === 'approved'}
                  />
                </div>
                {/* Superior Title Support */}
                <div className="space-y-1.5 hidden">
                  <Label className="text-xs font-semibold text-slate-700">Superior Title</Label>
                  <Input
                    value={superiorTitle}
                    onChange={(e) => setSuperiorTitle(e.target.value)}
                    placeholder="Superior Title"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TTD Digital / Status Persetujuan */}
          <Card className={cn("rounded-[1.2rem] shadow-sm ring-1", isMyTurn ? "ring-amber-300/80 bg-white" : "ring-slate-200/70 bg-slate-50/40")}>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">
                    {isMyTurn ? `TTD Digital - ${activeSignerName}` : `Status Persetujuan - ${activeStep?.approverName || 'Approver'}`}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tahap: <strong>{activeStep?.stepLabel}</strong> ({activeStep?.approverName || 'Approver'})
                  </p>
                </div>
                {activeStep?.status === 'approved' ? (
                  <Badge className="bg-emerald-50 text-emerald-600 rounded-full border-0 px-3 py-1 font-bold text-[10px]">
                    DISETUJUI
                  </Badge>
                ) : isMyTurn ? (
                  <Badge className="bg-amber-500 text-white rounded-full border-0 px-3 py-1 font-bold text-[10px] shadow-xs animate-pulse">
                    GILIRAN ANDA
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-300 bg-white rounded-full px-3 py-1 font-bold text-[10px]">
                    MENUNGGU APPROVER
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {activeStep?.status === 'approved' ? (
                <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/70 p-4 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  Tahap ini telah disetujui oleh {activeStep.approverName || 'Approver'}.
                </div>
              ) : isMyTurn ? (
                <>
                  {/* Auto-Sign Digital Signature Indicator */}
                  {registeredSignature ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-inner">
                          <img src={registeredSignature} alt="Tanda Tangan Saya" className="max-h-11 max-w-full object-contain" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Tanda Tangan Digital Anda</p>
                          <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="size-3.5" /> Siap ditempelkan otomatis ke PDF
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="h-8 rounded-lg border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white"
                      >
                        <PenTool className="size-3 mr-1 text-slate-500" /> Ubah TTD
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-950">Belum Ada Tanda Tangan Terdaftar</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm"
                      >
                        <PenTool className="size-3.5 mr-1" /> Daftar TTD Sekarang
                      </Button>
                    </div>
                  )}

                  {/* Catatan Approval (Opsional) */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold text-slate-700">Catatan Approval (Opsional)</Label>
                    <Textarea
                      placeholder="Tuliskan catatan atau rekomendasi khusus..."
                      rows={2}
                      value={activeStepId ? stepRemarks[activeStepId] || '' : ''}
                      onChange={(e) => {
                        if (activeStepId) {
                          setStepRemarks((prev) => ({ ...prev, [activeStepId]: e.target.value }))
                        }
                      }}
                      className="bg-slate-50 border-slate-200 text-xs resize-none rounded-xl"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {/* Tombol Reject */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs uppercase px-4 py-2"
                      onClick={() => {
                        const id = activeStepId || activeStep?.id
                        if (id) handleRejectStep(id)
                      }}
                    >
                      <XCircle className="mr-1 size-3.5" /> REJECT
                    </Button>

                    {/* Tombol Revert */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-bold text-xs uppercase px-4 py-2"
                      onClick={() => {
                        const id = activeStepId || activeStep?.id
                        if (id) handleRevertStep(id)
                      }}
                    >
                      <RotateCcw className="mr-1 size-3.5" /> REVERT
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      className="rounded-full bg-[#115e59] hover:bg-[#0f766e] text-white font-bold text-xs uppercase px-5 py-2.5 shadow-sm ml-auto"
                      onClick={() => {
                        const sig = registeredSignature || (activeStepId ? signaturesByStepId[activeStepId] : '') || previewSig
                        if (!sig) {
                          toast.error('Anda belum mendaftarkan tanda tangan. Silakan daftarkan tanda tangan Anda terlebih dahulu.')
                          setIsRegisterModalOpen(true)
                          return
                        }
                        if (activeStepId) {
                          handleApproveStep(activeStepId)
                        } else {
                          handleSaveForm()
                        }
                      }}
                    >
                      {isPending ? 'MENYIMPAN & MENYETUJUI...' : 'TAMBAHKAN KE PDF & SETUJUI'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-xs text-slate-700 flex items-start gap-3 shadow-xs">
                  <svg className="size-5 text-amber-600 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Menunggu persetujuan dari {activeStep?.approverName || 'Approver'}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Dokumen saat ini sedang menunggu persetujuan pada tahap <strong>{activeStep?.stepLabel}</strong>. Hanya penandatangan yang ditugaskan (<strong>{activeStep?.approverName}</strong>) yang dapat menandatangani dokumen ini.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <SignatureFloatingWidget
            isOpenDirectModal={isRegisterModalOpen}
            onCloseDirectModal={() => setIsRegisterModalOpen(false)}
            onSignatureUpdated={(dataUrl) => {
              setRegisteredSignature(dataUrl)
              setPreviewSig(dataUrl)
              setPreviewSignedAt(new Date())
              if (activeStepId) {
                setSignaturesByStepId((prev) => ({ ...prev, [activeStepId]: dataUrl }))
              }
            }}
          />
        </div>

        {/* ── KANAN: Preview Surat (Live A4 Preview) ── */}
        <div className={cn("rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:hidden overflow-auto", activeView === 'form' ? 'hidden xl:block' : 'block')}>
          <div
            id="pdf-page-1"
            className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
            style={{
              backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
              backgroundSize: '100% 100%',
            }}
          >
            {pdfDocumentContent}
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
            {confirmDialog && stepRemarks[confirmDialog.stepId] ? (
              <span>{stepRemarks[confirmDialog.stepId]}</span>
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
                const { actionType, stepId } = confirmDialog
                setConfirmDialog(null)
                if (actionType === 'reject') {
                  executeRejectStep(stepId)
                } else {
                  executeRevertStep(stepId)
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
        sessionId={data?.sessionId}
        fallbackData={(() => {
          if (!data) return null
          const processedItems = (itemsList || []).map((item, index) => {
            const photoUrl = (item as any).photoUrl || null
            return {
              id: item.id || index + 1,
              itemIndex: index + 1,
              snapshotLabel: item.label,
              snapshotGroupName: item.group || null,
              unitNumber: item.unitNumber || null,
              remark: itemRemarks[item.id] || item.remark || null,
              actualPoints: Number(item.points) || 0,
              isChecked: true,
              startedAt: (item as any).startedAt || null,
              endedAt: (item as any).endedAt || null,
              startLabel: '-',
              endLabel: '-',
              durationLabel: item.duration || '-',
              photoUrl,
            }
          })
          return {
            header: {
              sessionId: data.sessionId,
              sessionCode: data.sessionCode,
              workDate: data.workDate,
              shiftCode: data.shiftCode,
              status: data.status,
              summaryRemark: data.summaryRemark ?? null,
              submittedAt: data.submittedAt,
              employeeId: data.employee.id ?? 0,
              employeeName: data.employee.name,
              employeeSn: data.employee.sn,
              employeeDepartment: data.employee.department,
              employeeSection: data.employee.section,
              employeeJobTitle: data.employee.jobTitle,
              siteId: data.site.id ?? 0,
              siteName: data.site.name,
              customerName: data.site.customerName,
              contractNumber: null,
              splId: null,
              splNumber: null,
              splTitle: null,
            },
            allItems: processedItems,
            evidenceItems: processedItems.filter((i) => Boolean(i.photoUrl)),
            approvals: data.approvals.map((a) => ({
              id: a.id,
              stepOrder: a.stepOrder,
              stepLabel: a.stepLabel,
              status: a.status,
              approverName: a.approverName || '',
              approverRole: a.approverRole || '',
              signedAt: a.signedAt || null,
            })),
          }
        })()}
      />
      {/* Missing Signature Floating Dialog */}
      <MissingSignatureDialog
        isOpen={isMissingSignatureDialogOpen}
        onClose={() => setIsMissingSignatureDialogOpen(false)}
        onSignatureRegistered={(sigUrl) => {
          setRegisteredSignature(sigUrl)
          setPreviewSig(sigUrl)
          setPreviewSignedAt(new Date())
          if (activeStepId) {
            setSignaturesByStepId((prev) => ({ ...prev, [activeStepId]: sigUrl }))
          }
          toast.success('Tanda tangan digital berhasil didaftarkan! Silakan tekan tombol Setujui & TTD.')
        }}
      />

      {/* Signature Floating Widget for Direct Register */}
      {isRegisterModalOpen && (
        <SignatureFloatingWidget
          openModalDirectly
          onCloseDirectModal={() => setIsRegisterModalOpen(false)}
          onSignatureUpdated={(sigUrl) => {
            setRegisteredSignature(sigUrl)
            setPreviewSig(sigUrl)
            setPreviewSignedAt(new Date())
            if (activeStepId) {
              setSignaturesByStepId((prev) => ({ ...prev, [activeStepId]: sigUrl }))
            }
            setIsRegisterModalOpen(false)
            toast.success('Tanda tangan digital siap digunakan.')
          }}
        />
      )}
    </div>
  </AdminPageShell>
)
}
