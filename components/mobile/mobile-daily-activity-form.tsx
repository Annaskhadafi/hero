'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileSignature,
  FileText,
  ImagePlus,
  Layers,
  ListFilter,
  Navigation,
  Plus,
  RotateCcw,
  Save,
  Search,
  SendHorizontal,
  Trash2,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createDailyActivitySessionAction,
  resubmitDailyActivityApprovalFormAction,
} from '@/app/dashboard/activity-hub/actions'
import { downloadElementAsPdf } from '@/lib/pdf-download'
import { MobileSignatureSection } from '@/components/mobile/mobile-signature-section'
import { DailyActivityEvidenceModal } from '@/components/daily-activity-evidence-modal'
import { cn } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SpeechInputButton } from '@/components/ui/speech-input-button'
import { GpsLocationPreviewCard } from '@/components/ui/gps-location-preview-card'
import { validateSiteBoundary } from '@/lib/location'
import {
  ACTIVITY_DRAFT_STORAGE_KEY,
  type ActivitySyncPayload,
  type RouteSessionSyncItem,
  type QueuedFilePayload,
} from '@/lib/offline-sync'
import type { RouteFolder } from '@/lib/daily-activity'
import { RouteFolderTree } from '@/components/mobile/route-folder-tree'

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtDt(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`
}

type AssignmentOption = {
  id: number
  activityName: string | null
  customJobName: string
  priority?: string | null
  assignedByName?: string | null
  libraryActivityId?: number | null
  requiresPhoto?: boolean | null
}

export type LibraryOption = {
  id: number
  activityCode: string
  activityName: string
  basePoints: number
  requiresPhoto: boolean
  requiresEquipmentNo: boolean
  requiresDuration: boolean
  requiresMaterialUsed: boolean
  requiresLocationGps: boolean
  requiresTireCount: boolean
  maxDailyCount: number
  maxPointsPerDay: number
  departmentId: number | null
  sectionId: number | null
  isGroupActivity?: boolean
}

type ChecklistRenderItem = {
  id: number
  routeItemId: number | null
  overtimeCommandLetterItemId: number | null
  libraryActivityId: number | null
  itemCode: string | null
  itemLabel: string
  itemDescription: string | null
  sortOrder: number
  requiresUnit: boolean
  requiresTime: boolean
  requiresRemark: boolean
  requiresPhoto: boolean
  requiresChecklistEvidence: boolean
  requiresTireCount?: boolean
  requiresMaterialUsed?: boolean
  pointOverride: number | null
  libraryCode: string | null
  libraryName: string | null
  libraryPoints: number | null
  isChecked: boolean
  unitNumber: string
  remark: string
  startedAt: string | Date | null
  endedAt: string | Date | null
  actualPoints: number
}

type ChecklistRenderGroup = {
  id: number
  groupKey: string
  groupName: string
  description: string | null
  items: ChecklistRenderItem[]
}

type MobileDailyActivityFormProps = {
  employeeId: number
  employee?: {
    id: number
    name: string
    employeeSn?: string | null
    jobTitle?: string | null
    department?: string | null
    section?: string | null
    signatureDataUrl?: string | null
    signatureRegisteredAt?: string | null
  }
  hierarchy?: {
    requester: any
    leader: any
    superior: any
    department: string
    section: string
  }
  assignments?: AssignmentOption[]
  availableLibrary?: LibraryOption[]
  defaultStartTime?: string
  defaultEndTime?: string
  availableRouteFolders?: RouteFolder[]
  routeChecklist: {
    id: number
    routeCode: string
    routeName: string
    shiftCode: string
    activeSpl: {
      id: number
      splNumber: string
      title: string
      status: string
      lineCount: number
      plannedPointsTotal: number
      requestNotes: string
      items: Array<{
        id: number
        lineLabel: string
        targetUnit: string
        plannedPoints: number
      }>
    } | null
    groups: Array<{
      id: number
      groupKey: string
      groupName: string
      description: string | null
      items: Array<{
        id: number
        libraryActivityId: number | null
        itemCode: string | null
        itemLabel: string
        itemDescription: string | null
        sortOrder: number
        requiresUnit: boolean
        requiresTime: boolean
        requiresRemark: boolean
        requiresPhoto: boolean
        requiresChecklistEvidence: boolean
        pointOverride: number | null
        libraryCode: string | null
        libraryName: string | null
        libraryPoints: number | null
        isChecked: boolean
        unitNumber: string
        remark: string
        startedAt: string | Date | null
        endedAt: string | Date | null
        actualPoints: number
      }>
    }>
  } | null
  standaloneOvertimeChecklist: {
    id: number
    splNumber: string
    title: string
    status: string
    requestNotes: string
    executionNotes: string
    lineCount: number
    plannedPointsTotal: number
    sessionId: number | null
    sessionStatus: string | null
    checkedCount: number
    progressPercent: number
    items: Array<{
      id: number
      routeItemId: number | null
      libraryActivityId: number | null
      requiresPhoto: boolean
      lineLabel: string
      lineDescription: string
      targetUnit: string
      estimatedMinutes: number
      plannedPoints: number
      sortOrder: number
      isCustomLine: boolean
      isChecked: boolean
      unitNumber: string
      remark: string
      startedAt: string | Date | null
      endedAt: string | Date | null
      actualPoints: number
    }>
  } | null
  site: {
    id?: number | null
    name?: string | null
    customerName?: string | null
    geoLatitude?: string | null
    geoLongitude?: string | null
    geoRadiusMeters?: number | null
  } | null
  teamMembers?: Array<{
    id: number
    name: string
    role: string
    department: string
    siteId?: number | null
    sectionId?: number | null
    section?: string | null
  }>
  allEmployees?: Array<{
    id: number
    name: string
    position?: string | null
    department?: string | null
    section?: string | null
  }>
  revisionSessionId?: number
  initialSessionData?: any
}

type GeoState = {
  latitude: string
  longitude: string
  accuracy: string
  locationName: string
  message: string
}

type RouteItemState = {
  isChecked: boolean
  unitNumber: string
  remark: string
  startedAt: string
  endedAt: string
  actualPoints: string
  tireCount?: number
  materialUsed?: string

  photoFile?: File | null
  photoFiles?: File[]
  photoName?: string
  previewUrls?: string[]
  restoredPhotoPayload?: QueuedFilePayload | null
}

type SelfInputEntryState = {
  equipmentNo: string
  startTime: string
  endTime: string
  materialUsed: string
  tireCount?: number
  notes: string

  photoFile?: File | null
  photoFiles?: File[]
  photoName?: string
  previewUrls?: string[]
  restoredPhotoPayload?: QueuedFilePayload | null
}

const emptyRouteItemState: RouteItemState = {
  isChecked: false,
  unitNumber: '',
  remark: '',
  startedAt: '',
  endedAt: '',
  actualPoints: '0',
}

const initialGeo: GeoState = {
  latitude: '',
  longitude: '',
  accuracy: '',
  locationName: '',
  message: 'GPS standby',
}

async function uploadActivityPhoto(file: File) {
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

async function prepareEvidence(
  files: File[] | undefined,
  fallbackFile?: File | null,
  restored?: QueuedFilePayload | null,
  existingPreviewUrls?: string[]
) {
  const selectedFiles = files?.length ? files : fallbackFile ? [fallbackFile] : []
  if (selectedFiles.length > 0) {
    // ponytail: failed submissions may leave orphaned evidence; add cleanup when storage growth warrants it.
    return { payloads: [], urls: await Promise.all(selectedFiles.map(uploadActivityPhoto)) }
  }
  if (existingPreviewUrls && existingPreviewUrls.length > 0) {
    const validExistingUrls = existingPreviewUrls.filter(
      (url) => typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'))
    )
    if (validExistingUrls.length > 0) {
      return { payloads: [], urls: validExistingUrls }
    }
  }
  return { payloads: restored ? [restored] : [], urls: [] }
}

function readDraft<T>(key: string) {
  if (typeof window === 'undefined') return null as T | null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeDraft<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function clearDraft(key: string) {
  window.localStorage.removeItem(key)
}

function toDateTimeLocalValue(value?: string | Date | null) {
  if (!value) return ''
  const dateValue = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dateValue.getTime())) return ''
  const local = new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function timeInputValue(value: string) {
  return value.slice(11, 16)
}

function replaceTimeValue(value: string, time: string) {
  return `${value.slice(0, 10)}T${time}`
}

function shiftDateTimeLocalValue(value: string, minutes: number) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  parsed.setMinutes(parsed.getMinutes() + minutes)
  return toDateTimeLocalValue(parsed)
}

function alignDateTimeToReference(value: string, reference: string) {
  const time = value.match(/^\d{4}-\d{2}-\d{2}(T.+)$/)?.[1]
  return time ? `${reference.slice(0, 10)}${time}` : reference
}

function formatSubmitDateTime(val: string | Date | null | undefined, baseDate: string): string | undefined {
  if (!val) return undefined
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val.toISOString()
  }
  const trimmed = String(val).trim()
  if (!trimmed) return undefined
  if (trimmed.includes('T')) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d.toISOString()
    const cleaned = trimmed.replace(/:00:00$/, ':00')
    const d2 = new Date(cleaned)
    if (!isNaN(d2.getTime())) return d2.toISOString()
  }
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const timePart = trimmed.length === 5 ? `${trimmed}:00` : trimmed
    const d = new Date(`${baseDate}T${timePart}`)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  const d = new Date(trimmed)
  return !isNaN(d.getTime()) ? d.toISOString() : undefined
}

function getDurationMinutes(startTime: string, endTime: string) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 60
  }

  const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
  return minutes > 0 ? minutes : 60
}

function buildDefaultSelfInputEntry(
  index: number,
  defaultStartTime: string,
  defaultEndTime: string
): SelfInputEntryState {
  const durationMinutes = getDurationMinutes(defaultStartTime, defaultEndTime)
  const offsetMinutes = index * durationMinutes

  return {
    equipmentNo: '',
    startTime: shiftDateTimeLocalValue(defaultStartTime, offsetMinutes),
    endTime: shiftDateTimeLocalValue(defaultEndTime, offsetMinutes),
    materialUsed: '',
    tireCount: 1,
    notes: '',
  }
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function cleanPhotoUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (trimmed.includes('is3.cloudhost.id') && (trimmed.includes('X-Amz-') || trimmed.includes('?'))) {
    return trimmed.split('?')[0]
  }
  return trimmed
}

function extractItemPhotos(item: any): string[] {
  if (!item) return []
  const urls: string[] = []
  if (Array.isArray(item.photos)) {
    item.photos.forEach((p: any) => {
      const u = typeof p === 'string' ? p : p?.url || p?.dataUrl || ''
      if (u && typeof u === 'string' && u.trim().length > 0) urls.push(cleanPhotoUrl(u))
    })
  }
  if (Array.isArray(item.photoUrls)) {
    item.photoUrls.forEach((p: any) => {
      const u = typeof p === 'string' ? p : p?.url || p?.dataUrl || ''
      if (u && typeof u === 'string' && u.trim().length > 0) urls.push(cleanPhotoUrl(u))
    })
  }
  if (item.photoUrl && typeof item.photoUrl === 'string' && item.photoUrl.trim().length > 0) {
    urls.push(cleanPhotoUrl(item.photoUrl))
  }
  if (item.photo) {
    const u = typeof item.photo === 'string' ? item.photo : item.photo?.url || item.photo?.dataUrl || ''
    if (u && typeof u === 'string' && u.trim().length > 0) urls.push(cleanPhotoUrl(u))
  }
  if (item.evidencePhotoUrl && typeof item.evidencePhotoUrl === 'string' && item.evidencePhotoUrl.trim().length > 0) {
    urls.push(cleanPhotoUrl(item.evidencePhotoUrl))
  }
  if (item.snapshotPayload) {
    try {
      const parsed = typeof item.snapshotPayload === 'string' ? JSON.parse(item.snapshotPayload) : item.snapshotPayload
      if (parsed) {
        const sub = extractItemPhotos(parsed)
        urls.push(...sub)
      }
    } catch {}
  }
  return Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.trim().length > 0)))
}

export function MobileDailyActivityForm({
  employeeId,
  employee,
  hierarchy,
  assignments = [],
  availableLibrary = [],
  defaultStartTime = '',
  defaultEndTime = '',
  availableRouteFolders = [],
  routeChecklist,
  standaloneOvertimeChecklist,
  site,
  teamMembers = [],
  allEmployees = [],
  revisionSessionId,
  initialSessionData,
}: MobileDailyActivityFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queuedDraftKey = searchParams.get('draft')?.trim() || ''

  const rawSession = initialSessionData?.data || initialSessionData?.session || initialSessionData
  const rawItems = (rawSession?.sessionItems || rawSession?.items || []) as any[]

  const [workDate, setWorkDate] = useState<string>(() => {
    if (rawSession?.workDate) {
      const d = new Date(rawSession.workDate)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
    return new Date().toISOString().slice(0, 10)
  })

  const [evidenceQrDataUrl, setEvidenceQrDataUrl] = useState<string>('')
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)

  useEffect(() => {
    const targetSessionId = rawSession?.sessionId || rawSession?.id || revisionSessionId
    if (!targetSessionId) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    QRCode.toDataURL(`${origin}/activity-evidence/${targetSessionId}`, { margin: 1, width: 140, errorCorrectionLevel: 'M' })
      .then(setEvidenceQrDataUrl)
      .catch((e) => console.error('Failed to generate evidence QR in mobile form:', e))
  }, [rawSession?.sessionId, rawSession?.id, revisionSessionId])

  const [shiftCode, setShiftCode] = useState<string>(
    rawSession?.shiftCode || routeChecklist?.shiftCode || 'ALL'
  )
  const [sourceMode, setSourceMode] = useState<'assigned' | 'self_input' | 'custom'>(() => {
    if (rawSession?.submissionSource === 'custom' || rawSession?.submissionSource === 'assigned' || rawSession?.submissionSource === 'self_input') {
      return rawSession.submissionSource
    }
    if (rawSession?.routeTemplateId || rawSession?.overtimeCommandLetterId) {
      return 'assigned'
    }
    return 'self_input'
  })
  const [assignmentId, setAssignmentId] = useState('')
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(() => {
    if (rawItems && rawItems.length > 0) {
      const ids: string[] = []
      for (const item of rawItems) {
        const idStr = String(item.libraryActivityId || item.id || '')
        if (idStr) {
          ids.push(idStr)
        }
      }
      return Array.from(new Set(ids))
    }
    return []
  })

  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')

  const [selfInputEntries, setSelfInputEntries] = useState<Record<string, SelfInputEntryState>>(() => {
    if (rawItems && rawItems.length > 0) {
      const entries: Record<string, SelfInputEntryState> = {}
      for (const item of rawItems) {
        const idStr = String(item.libraryActivityId || item.id || '')
        if (idStr) {
          const startVal = item.startedAt
            ? typeof item.startedAt === 'string' && item.startedAt.includes(':') && !item.startedAt.includes('T')
              ? item.startedAt.slice(0, 5)
              : toDateTimeLocalValue(item.startedAt)
            : defaultStartTime
          const endVal = item.endedAt
            ? typeof item.endedAt === 'string' && item.endedAt.includes(':') && !item.endedAt.includes('T')
              ? item.endedAt.slice(0, 5)
              : toDateTimeLocalValue(item.endedAt)
            : defaultEndTime

          const existingUrls = extractItemPhotos(item)

          const entryData: SelfInputEntryState = {
            equipmentNo: item.unitNumber || '',
            startTime: startVal,
            endTime: endVal,
            materialUsed: item.materialUsed || '',
            tireCount: item.tireCount || 1,
            notes: item.remark || item.notes || '',
            photoFiles: [],
            photoName: existingUrls.length > 0 ? `${existingUrls.length} foto terlampir` : '',
            previewUrls: existingUrls,
          }

          entries[idStr] = entryData
          if (item.libraryActivityId) {
            entries[String(item.libraryActivityId)] = entryData
          }
          if (item.id) {
            entries[String(item.id)] = entryData
          }
        }
      }
      return entries
    }
    return {}
  })

  const initialCustomItem = rawItems?.find((i: any) => !i.libraryActivityId)
  const initialCustomUrls: string[] = initialCustomItem ? extractItemPhotos(initialCustomItem) : []

  const [customActivityName, setCustomActivityName] = useState(initialCustomItem?.label || initialCustomItem?.snapshotLabel || '')
  const [customActivityDescription, setCustomActivityDescription] = useState(initialCustomItem?.remark || '')
  const [equipmentNo, setEquipmentNo] = useState(initialCustomItem?.unitNumber || '')
  const [startTime, setStartTime] = useState(initialCustomItem?.startedAt ? toDateTimeLocalValue(initialCustomItem.startedAt) : defaultStartTime)
  const [endTime, setEndTime] = useState(initialCustomItem?.endedAt ? toDateTimeLocalValue(initialCustomItem.endedAt) : defaultEndTime)
  const [materialUsed, setMaterialUsed] = useState(initialCustomItem?.materialUsed || '')
  const [notes, setNotes] = useState(rawSession?.summaryRemark || rawSession?.notes || '')
  const [manualLocation, setManualLocation] = useState('')
  const initialCustomerName =
    rawSession?.customerName ||
    rawSession?.site?.customerName ||
    (site?.customerName && site.customerName !== 'Default Customer' ? site.customerName : '')
  const [customerName, setCustomerName] = useState(initialCustomerName)

  const existingLeaderApproval =
    rawSession?.approvals?.find((a: any) => a.approverRole === 'leader' || a.stepOrder === 2) ||
    rawSession?.approvals?.find((a: any) => a.stepOrder === 1)
  const existingSuperiorApproval =
    rawSession?.approvals?.find((a: any) => a.approverRole === 'section_head' || a.stepOrder === 3) ||
    rawSession?.approvals?.find((a: any) => a.stepOrder === 2)

  const [leaderEmployeeId, setLeaderEmployeeId] = useState<string>(() => {
    if (existingLeaderApproval?.approverEmployeeId) return String(existingLeaderApproval.approverEmployeeId)
    return hierarchy?.leader?.id ? String(hierarchy.leader.id) : ''
  })
  const [superiorEmployeeId, setSuperiorEmployeeId] = useState<string>(() => {
    if (existingSuperiorApproval?.approverEmployeeId) return String(existingSuperiorApproval.approverEmployeeId)
    return hierarchy?.superior?.id ? String(hierarchy.superior.id) : ''
  })

  const initializedSessionIdRef = useRef<number | string | null>(null)
  const currentSessionKey = rawSession?.sessionId || rawSession?.id || revisionSessionId || null

  useEffect(() => {
    if (!rawSession) return

    // Only synchronize from rawSession once per session to avoid overwriting user edits on re-render
    if (initializedSessionIdRef.current === currentSessionKey) {
      return
    }
    initializedSessionIdRef.current = currentSessionKey

    const cust =
      rawSession.customerName ||
      rawSession.site?.customerName ||
      (site?.customerName && site.customerName !== 'Default Customer' ? site.customerName : '')
    if (cust) {
      setCustomerName(cust)
    }
    if (rawSession.shiftCode) {
      setShiftCode(rawSession.shiftCode)
    }
    if (rawSession.submissionSource === 'custom' || rawSession.submissionSource === 'assigned' || rawSession.submissionSource === 'self_input') {
      setSourceMode(rawSession.submissionSource)
    } else if (rawSession.routeTemplateId || rawSession.overtimeCommandLetterId) {
      setSourceMode('assigned')
    } else if (rawItems.length > 0) {
      setSourceMode('self_input')
    }

    if (rawSession.summaryRemark || rawSession.notes) {
      setNotes(rawSession.summaryRemark || rawSession.notes)
      const teamMatch = (rawSession.summaryRemark || rawSession.notes || '').match(/\[Team:\s*([^\]]+)\]/i)
      if (teamMatch && teamMembers && teamMembers.length > 0) {
        const memberNames = teamMatch[1].split(',').map((s: string) => s.trim().toLowerCase())
        const matchedIds = teamMembers
          .filter((m) => memberNames.includes(m.name.trim().toLowerCase()))
          .map((m) => m.id)
        if (matchedIds.length > 0) {
          setIsTeamLog(true)
          setSelectedMemberIds(matchedIds)
        }
      }
    }
    if (rawSession.workDate) {
      try {
        const d = new Date(rawSession.workDate)
        if (!isNaN(d.getTime())) {
          setWorkDate(d.toISOString().slice(0, 10))
        }
      } catch {}
    }
    const leaderApp =
      rawSession.approvals?.find((a: any) => a.approverRole === 'leader' || a.stepOrder === 2) ||
      rawSession.approvals?.find((a: any) => a.stepOrder === 1)
    if (leaderApp?.approverEmployeeId) {
      setLeaderEmployeeId(String(leaderApp.approverEmployeeId))
    }
    const superiorApp =
      rawSession.approvals?.find((a: any) => a.approverRole === 'section_head' || a.stepOrder === 3) ||
      rawSession.approvals?.find((a: any) => a.stepOrder === 2)
    if (superiorApp?.approverEmployeeId) {
      setSuperiorEmployeeId(String(superiorApp.approverEmployeeId))
    }

    // Sync sessionItems into selfInputEntries and selectedLibraryIds
    if (rawItems && rawItems.length > 0) {
      const ids: string[] = []
      const entries: Record<string, SelfInputEntryState> = {}

      for (const item of rawItems) {
        const idStr = String(item.libraryActivityId || item.id || '')
        if (idStr) {
          ids.push(idStr)
          const startVal = item.startedAt
            ? typeof item.startedAt === 'string' && item.startedAt.includes(':') && !item.startedAt.includes('T')
              ? item.startedAt.slice(0, 5)
              : toDateTimeLocalValue(item.startedAt)
            : defaultStartTime
          const endVal = item.endedAt
            ? typeof item.endedAt === 'string' && item.endedAt.includes(':') && !item.endedAt.includes('T')
              ? item.endedAt.slice(0, 5)
              : toDateTimeLocalValue(item.endedAt)
            : defaultEndTime

          const existingUrls = extractItemPhotos(item)

          const entryData: SelfInputEntryState = {
            equipmentNo: item.unitNumber || '',
            startTime: startVal,
            endTime: endVal,
            materialUsed: item.materialUsed || '',
            tireCount: item.tireCount || 1,
            notes: item.remark || item.notes || '',
            photoFiles: [],
            photoName: existingUrls.length > 0 ? `${existingUrls.length} foto terlampir` : '',
            previewUrls: existingUrls,
          }

          entries[idStr] = entryData
          if (item.libraryActivityId) {
            entries[String(item.libraryActivityId)] = entryData
          }
          if (item.id) {
            entries[String(item.id)] = entryData
          }
        }
      }

      setSelectedLibraryIds(Array.from(new Set(ids)))
      setSelfInputEntries((prev) => ({ ...prev, ...entries }))

      const customItem = rawItems.find((i: any) => !i.libraryActivityId)
      if (customItem) {
        setCustomActivityName(customItem.label || customItem.snapshotLabel || '')
        setCustomActivityDescription(customItem.remark || '')
        setEquipmentNo(customItem.unitNumber || '')
        if (customItem.startedAt) setStartTime(toDateTimeLocalValue(customItem.startedAt))
        if (customItem.endedAt) setEndTime(toDateTimeLocalValue(customItem.endedAt))
        if (customItem.materialUsed) setMaterialUsed(customItem.materialUsed)

        const customUrls = extractItemPhotos(customItem)
        if (customUrls.length > 0) {
          setPhotoPreviewUrls(customUrls)
          setPhotoName(`${customUrls.length} foto terlampir`)
        }
      }
    }
  }, [rawSession, currentSessionKey, site?.customerName, defaultStartTime, defaultEndTime, rawItems, teamMembers])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoName, setPhotoName] = useState(initialCustomUrls.length > 0 ? `${initialCustomUrls.length} foto terlampir` : '')
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>(initialCustomUrls)
  const [restoredPhotoPayload, setRestoredPhotoPayload] = useState<QueuedFilePayload | null>(null)
  const [photoCaptureMode, setPhotoCaptureMode] = useState<'camera' | 'gallery'>('gallery')
  const [activePhotoTarget, setActivePhotoTarget] = useState<string | null>(null)
  const activePhotoTargetRef = useRef<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleTriggerCamera = (targetId: string) => {
    activePhotoTargetRef.current = targetId
    setActivePhotoTarget(targetId)
    setPhotoCaptureMode('camera')
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
      cameraInputRef.current.click()
    }
  }

  const handleTriggerGallery = (targetId: string) => {
    activePhotoTargetRef.current = targetId
    setActivePhotoTarget(targetId)
    setPhotoCaptureMode('gallery')
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
      galleryInputRef.current.click()
    }
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const targetId = activePhotoTargetRef.current || activePhotoTarget
    if (!targetId) return

    const file = files[0] ?? null
    const names = files.map((item) => item.name).join(', ')
    const previewUrls = files.map((f) => URL.createObjectURL(f))

    if (targetId === 'single') {
      setPhotoFile(file)
      setPhotoFiles(files)
      setPhotoName(names)
      setPhotoPreviewUrls(previewUrls)
      setRestoredPhotoPayload(null)
    } else if (targetId.startsWith('route:')) {
      const id = parseInt(targetId.split(':')[1], 10)
      setRouteItemState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          photoFile: file,
          photoFiles: files,
          photoName: names,
          previewUrls: previewUrls,
          restoredPhotoPayload: null,
        },
      }))
    } else if (targetId.startsWith('library:')) {
      const id = targetId.split(':')[1]
      setSelfInputEntries((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          photoFile: file,
          photoFiles: files,
          photoName: names,
          previewUrls: previewUrls,
          restoredPhotoPayload: null,
        },
      }))
    }

    toast.success(`${files.length} foto evidence berhasil dilampirkan`)
    event.target.value = ''
  }

  const handleRemovePhoto = (targetId: string) => {
    if (targetId === 'single') {
      setPhotoFile(null)
      setPhotoFiles([])
      setPhotoName('')
      setPhotoPreviewUrls([])
      setRestoredPhotoPayload(null)
    } else if (targetId.startsWith('route:')) {
      const id = parseInt(targetId.split(':')[1], 10)
      setRouteItemState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          photoFile: null,
          photoFiles: [],
          photoName: '',
          previewUrls: [],
          restoredPhotoPayload: null,
        },
      }))
    } else if (targetId.startsWith('library:')) {
      const id = targetId.split(':')[1]
      setSelfInputEntries((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          photoFile: null,
          photoFiles: [],
          photoName: '',
          previewUrls: [],
          restoredPhotoPayload: null,
        },
      }))
    }
    toast.info('Foto evidence dihapus')
  }
  const [geo, setGeo] = useState<GeoState>(initialGeo)
  const [submitState, setSubmitState] = useState<{
    kind: 'idle' | 'success' | 'error'
    message: string
  }>({ kind: 'idle', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [routeItemState, setRouteItemState] = useState<Record<number, RouteItemState>>({})

  const pdfPreviewRef = useRef<HTMLDivElement>(null)
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [previewZoom, setPreviewZoom] = useState<number>(1.0)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initialPinchDistRef = useRef<number | null>(null)
  const initialZoomRef = useRef<number>(1.0)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  function resetZoomAndPan() {
    setPreviewZoom(1.0)
    setPanOffset({ x: 0, y: 0 })
    setIsDragging(false)
  }

  useEffect(() => {
    if (!isPdfOpen) {
      resetZoomAndPan()
    }
  }, [isPdfOpen])


  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    }
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false)
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      initialPinchDistRef.current = dist
      initialZoomRef.current = previewZoom
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      setIsDragging(true)
      dragStartRef.current = {
        x: t.clientX - panOffset.x,
        y: t.clientY - panOffset.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const scaleFactor = dist / initialPinchDistRef.current
      const newZoom = Math.min(3.5, Math.max(0.6, Number((initialZoomRef.current * scaleFactor).toFixed(2))))
      setPreviewZoom(newZoom)
    } else if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0]
      setPanOffset({
        x: t.clientX - dragStartRef.current.x,
        y: t.clientY - dragStartRef.current.y,
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    initialPinchDistRef.current = null
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      setPreviewZoom((prev) => Math.min(3.5, Math.max(0.6, Number((prev + delta).toFixed(2)))))
    }
  }

  async function handleDownloadPdf() {
    if (!pdfPreviewRef.current) return
    setIsDownloadingPdf(true)
    try {
      await downloadElementAsPdf(
        pdfPreviewRef.current,
        `${initialSessionData?.sessionCode || 'DailyActivity'}-Document.pdf`
      )
      toast.success('PDF Daily Activity berhasil diunduh.')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunduh PDF.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const initialTeamMatch = (initialSessionData?.summaryRemark || initialSessionData?.notes || '').match(/\[Team:\s*([^\]]+)\]/i)
  const initialMemberIds = (() => {
    if (initialTeamMatch && teamMembers && teamMembers.length > 0) {
      const memberNames = initialTeamMatch[1].split(',').map((s: string) => s.trim().toLowerCase())
      return teamMembers
        .filter((m) => memberNames.includes(m.name.trim().toLowerCase()))
        .map((m) => m.id)
    }
    return []
  })()

  const [isTeamLog, setIsTeamLog] = useState(Boolean(initialTeamMatch && initialMemberIds.length > 0))
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(initialMemberIds)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)

  // Safeguard: auto-recover document.body pointer-events if frozen by Radix scroll-lock
  useEffect(() => {
    const cleanupBodyPointer = () => {
      if (typeof document !== 'undefined' && document.body.style.pointerEvents === 'none') {
        if (!libraryPickerOpen && !isPdfOpen && !memberPickerOpen) {
          document.body.style.pointerEvents = ''
        }
      }
    }
    cleanupBodyPointer()
    const timer = setInterval(cleanupBodyPointer, 400)
    return () => clearInterval(timer)
  }, [libraryPickerOpen, isPdfOpen, memberPickerOpen])

  const filteredTeamMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    const pool = (teamMembers || []).filter((m) => m.id !== employeeId)
    if (!q) return pool
    return pool.filter((m) => m.name.toLowerCase().includes(q))
  }, [teamMembers, memberSearch, employeeId])

  const safeAvailableLibrary = useMemo(() => {
    const list = [...(availableLibrary || [])]
    const existingIds = new Set(list.map((item) => `${item.id}`))

    if (rawItems && rawItems.length > 0) {
      for (const item of rawItems) {
        const idStr = String(item.libraryActivityId || item.id || '')
        if (idStr && !existingIds.has(idStr)) {
          const rawLabel = String(item.label || item.snapshotLabel || 'Aktivitas')
          const splitLabel = rawLabel.includes(' - ')
            ? rawLabel.split(' - ')
            : [item.group || 'ACT', rawLabel]
          const code = splitLabel[0]?.trim() || item.group || 'ACT'
          const name = splitLabel.slice(1).join(' - ').trim() || rawLabel

          list.push({
            id: Number(item.libraryActivityId || item.id) || (idStr as any),
            activityCode: code,
            activityName: name,
            basePoints: Number(item.points || item.actualPoints) || 5,
            requiresPhoto: Boolean(item.photos?.length || item.photoUrl || extractItemPhotos(item).length > 0),
            requiresEquipmentNo: false,
            requiresDuration: true,
            requiresMaterialUsed: Boolean(item.materialUsed),
            requiresLocationGps: false,
            requiresTireCount: false,
            maxDailyCount: 99,
            maxPointsPerDay: 999,
            departmentId: null,
            sectionId: null,
          })
          existingIds.add(idStr)
        }
      }
    }
    return list
  }, [availableLibrary, rawItems])

  const availableLibraryMap = useMemo(
    () => new Map(safeAvailableLibrary.map((item) => [`${item.id}`, item])),
    [safeAvailableLibrary]
  )
  const selectedLibraries = useMemo(
    () =>
      selectedLibraryIds
        .map((id) => availableLibraryMap.get(id))
        .filter((item): item is LibraryOption => Boolean(item)),
    [availableLibraryMap, selectedLibraryIds]
  )
  const filteredLibraries = useMemo(() => {
    const normalizedSearch = normalizeSearch(librarySearch)
    if (!normalizedSearch) {
      return safeAvailableLibrary
    }

    return safeAvailableLibrary.filter((item) =>
      normalizeSearch(`${item.activityCode} ${item.activityName} ${item.basePoints}`).includes(
        normalizedSearch
      )
    )
  }, [safeAvailableLibrary, librarySearch])
  const needsGlobalPhoto = selectedLibraries.some((item) => item.requiresPhoto)
  const selectedAssignment = useMemo(
    () => assignments.find((item) => `${item.id}` === assignmentId) ?? null,
    [assignmentId, assignments]
  )

  const leaderOptions = useMemo(() => {
    const list = (allEmployees.length > 0 ? allEmployees : teamMembers) || []
    const opts: { value: string; label: string }[] = []

    if (hierarchy?.leader && !list.some((o: any) => String(o.id) === String(hierarchy.leader.id))) {
      opts.push({
        value: String(hierarchy.leader.id),
        label: `${hierarchy.leader.name.toUpperCase()} — (ATASAN LANGSUNG)`,
      })
    }

    list.forEach((m: any) => {
      opts.push({
        value: String(m.id),
        label: `${m.name.toUpperCase()} — ${(m.position || m.role || 'STAFF').toUpperCase()}`,
      })
    })

    return opts
  }, [allEmployees, teamMembers, hierarchy])

  const superiorOptions = useMemo(() => {
    const list = (allEmployees.length > 0 ? allEmployees : teamMembers) || []
    const opts: { value: string; label: string }[] = []

    if (hierarchy?.superior && !list.some((o: any) => String(o.id) === String(hierarchy.superior.id))) {
      opts.push({
        value: String(hierarchy.superior.id),
        label: `${hierarchy.superior.name.toUpperCase()} — (SECTION HEAD / MANAGER)`,
      })
    }

    list.forEach((m: any) => {
      opts.push({
        value: String(m.id),
        label: `${m.name.toUpperCase()} — ${(m.position || m.role || 'STAFF').toUpperCase()}`,
      })
    })

    return opts
  }, [allEmployees, teamMembers, hierarchy])
  const checklistContext = useMemo(() => {
    if (routeChecklist) {
      return {
        kind: 'route' as const,
        routeTemplateId: routeChecklist.id,
        overtimeCommandLetterId: routeChecklist.activeSpl?.id ?? null,
        shiftCode: routeChecklist.shiftCode,
        title: routeChecklist.routeName,
        code: routeChecklist.routeCode,
        summaryLabel: 'Route checklist',
        activeSpl: routeChecklist.activeSpl,
        groups: routeChecklist.groups.map((group) => ({
          ...group,
          items: group.items.map((item) => ({
            ...item,
            routeItemId: item.id,
            overtimeCommandLetterItemId: null,
            requiresTireCount: (item as any).requiresTireCount ?? false,
            requiresMaterialUsed: (item as any).requiresMaterialUsed ?? false,
          })),
        })),
      }
    }

    if (!standaloneOvertimeChecklist) {
      return null
    }

    const groups: ChecklistRenderGroup[] = [
      {
        id: standaloneOvertimeChecklist.id,
        groupKey: 'SPL',
        groupName: 'Checklist lembur',
        description:
          standaloneOvertimeChecklist.requestNotes ||
          standaloneOvertimeChecklist.executionNotes ||
          null,
        items: standaloneOvertimeChecklist.items.map((item) => ({
          id: item.id,
          routeItemId: item.routeItemId,
          overtimeCommandLetterItemId: item.id,
          libraryActivityId: item.libraryActivityId,
          itemCode: null,
          itemLabel: item.lineLabel,
          itemDescription: item.lineDescription || item.targetUnit || null,
          sortOrder: item.sortOrder,
          requiresUnit: true,
          requiresTime: true,
          requiresRemark: true,
          requiresPhoto: item.requiresPhoto,
          requiresChecklistEvidence: true,
          requiresTireCount: (item as any).requiresTireCount ?? false,
          requiresMaterialUsed: (item as any).requiresMaterialUsed ?? false,
          pointOverride: item.plannedPoints,
          libraryCode: null,
          libraryName: null,
          libraryPoints: item.plannedPoints,
          isChecked: item.isChecked,
          unitNumber: item.unitNumber,
          remark: item.remark,
          startedAt: item.startedAt,
          endedAt: item.endedAt,
          actualPoints: item.actualPoints,
        })),
      },
    ]

    return {
      kind: 'spl' as const,
      routeTemplateId: null,
      overtimeCommandLetterId: standaloneOvertimeChecklist.id,
      shiftCode: 'SPL',
      title: standaloneOvertimeChecklist.title,
      code: standaloneOvertimeChecklist.splNumber,
      summaryLabel: 'Checklist SPL',
      activeSpl: {
        id: standaloneOvertimeChecklist.id,
        splNumber: standaloneOvertimeChecklist.splNumber,
        title: standaloneOvertimeChecklist.title,
        status: standaloneOvertimeChecklist.status,
        lineCount: standaloneOvertimeChecklist.lineCount,
        plannedPointsTotal: standaloneOvertimeChecklist.plannedPointsTotal,
        requestNotes: standaloneOvertimeChecklist.requestNotes,
        items: standaloneOvertimeChecklist.items.map((item) => ({
          id: item.id,
          lineLabel: item.lineLabel,
          targetUnit: item.targetUnit,
          plannedPoints: item.plannedPoints,
        })),
      },
      groups,
    }
  }, [routeChecklist, standaloneOvertimeChecklist])
  const assignmentNeedsPhoto =
    sourceMode === 'assigned' && Boolean(selectedAssignment?.requiresPhoto)
  const checkedChecklistNeedsPhoto =
    checklistContext?.groups.some((group) =>
      group.items.some((item) => {
        const itemState = routeItemState[item.id]
        return (itemState?.isChecked ?? false) && item.requiresPhoto
      })
    ) ?? false

  const renderPhotoWidget = (
    targetId: string,
    requiresPhoto: boolean,
    currentPhotoName?: string,
    previewUrls?: string[]
  ) => {
    const rawId = targetId.replace(/^(library:|route:)/, '')
    const matchingSessionItem = initialSessionData?.sessionItems?.find((it: any) => {
      const itLibId = it.libraryActivityId ? String(it.libraryActivityId) : ''
      const itId = it.id ? String(it.id) : ''
      return (itLibId && itLibId === rawId) || (itId && itId === rawId)
    })
    const sessionPhotos = matchingSessionItem ? extractItemPhotos(matchingSessionItem) : []
    const effectivePreviewUrls =
      previewUrls && previewUrls.length > 0
        ? previewUrls
        : sessionPhotos.length > 0
          ? sessionPhotos
          : targetId === 'single' && photoPreviewUrls.length > 0
            ? photoPreviewUrls
            : []
    const effectivePhotoName =
      currentPhotoName ||
      (effectivePreviewUrls.length > 0
        ? `${effectivePreviewUrls.length} foto terlampir`
        : '')
    const hasPhoto = Boolean(effectivePhotoName || effectivePreviewUrls.length > 0)

    return (
      <div className="mt-3 space-y-2.5 rounded-xl border border-[#cbe4f6] bg-[#f6fbff] p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
            <Camera className="size-3.5 text-[#003f78]" />
            Photo Evidence
          </p>
          <div className="flex items-center gap-1.5">
            {hasPhoto ? (
              <Badge className="border-0 bg-[#dff4e8] px-2 py-0.5 text-[9px] font-black tracking-[0.1em] text-[#14532d] uppercase">
                ✓ Terlampir
              </Badge>
            ) : null}
            {requiresPhoto ? (
              <Badge className="border-0 bg-[#fff1cf] px-1.5 py-0 text-[9px] font-black tracking-[0.14em] text-[#8a5a00] uppercase">
                Wajib
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border border-sky-200 bg-white hover:bg-[#e9f6fd] text-xs font-bold text-[#003f78] shadow-2xs active:scale-95 transition-all cursor-pointer"
            onClick={() => handleTriggerCamera(targetId)}
          >
            <Camera className="size-3.5 mr-1" />
            Kamera
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border border-sky-200 bg-white hover:bg-[#e9f6fd] text-xs font-bold text-[#003f78] shadow-2xs active:scale-95 transition-all cursor-pointer"
            onClick={() => handleTriggerGallery(targetId)}
          >
            <ImagePlus className="size-3.5 mr-1" />
            Galeri
          </Button>
        </div>
        {effectivePreviewUrls && effectivePreviewUrls.length > 0 ? (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              {effectivePreviewUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative group block overflow-hidden rounded-lg border border-slate-200 bg-black/5 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                  title="Klik untuk melihat foto penuh"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Evidence preview ${idx + 1}`}
                    className="h-16 w-16 object-cover rounded-lg border border-slate-200"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#003f78]">
              <span className="truncate max-w-[200px]">{effectivePhotoName}</span>
              <button
                type="button"
                onClick={() => handleRemovePhoto(targetId)}
                className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer"
              >
                Hapus Foto
              </button>
            </div>
          </div>
        ) : effectivePhotoName ? (
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#003f78]">
            <p className="truncate break-words">
              ✓ {effectivePhotoName}
            </p>
            <button
              type="button"
              onClick={() => handleRemovePhoto(targetId)}
              className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer shrink-0 ml-2"
            >
              Hapus
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  const needsAnyPhoto = needsGlobalPhoto || assignmentNeedsPhoto || checkedChecklistNeedsPhoto

  const selfInputNeedsGps = selectedLibraries.some((item) => item.requiresLocationGps)
  const assignmentNeedsGps = Boolean((selectedAssignment as any)?.requiresLocationGps)
  const checkedChecklistNeedsGps = checklistContext?.groups.some((group) =>
    group.items.some((item) => routeItemState[item.id]?.isChecked && Boolean((item as any).requiresLocationGps))
  ) ?? false
  const needsGps = selfInputNeedsGps || assignmentNeedsGps || checkedChecklistNeedsGps

  useEffect(() => {
    // If we are editing/revising an existing document and no explicit draft key was specified, do not clobber with old draft
    if (!queuedDraftKey && (rawSession || revisionSessionId)) {
      return
    }

    const draft = queuedDraftKey
      ? readDraft<ActivitySyncPayload>(queuedDraftKey)
      : readDraft<ActivitySyncPayload>(ACTIVITY_DRAFT_STORAGE_KEY)

    if (!draft) {
      return
    }

    const restoredSourceMode =
      draft.sourceMode === 'assigned' ||
      draft.sourceMode === 'self_input' ||
      draft.sourceMode === 'custom'
        ? draft.sourceMode
        : 'self_input'
    const restoredSelectedLibraryIds =
      Array.isArray(draft.selectedLibraryActivityIds) && draft.selectedLibraryActivityIds.length > 0
        ? draft.selectedLibraryActivityIds
        : draft.libraryActivityId
          ? [draft.libraryActivityId]
          : []
    const restoredSelfInputEntries = Array.isArray(draft.selfInputActivities)
      ? Object.fromEntries(
          draft.selfInputActivities.map((item, index) => [
            item.libraryActivityId,
            {
              equipmentNo: item.equipmentNo ?? '',
              startTime:
                item.startTime ||
                buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime).startTime,
              endTime:
                item.endTime ||
                buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime).endTime,
              materialUsed: item.materialUsed ?? '',
              notes: item.notes ?? '',
            },
          ])
        )
      : draft.libraryActivityId
        ? {
            [draft.libraryActivityId]: {
              equipmentNo: draft.equipmentNo ?? '',
              startTime: draft.startTime || defaultStartTime,
              endTime: draft.endTime || defaultEndTime,
              materialUsed: draft.materialUsed ?? '',
              notes: draft.notes ?? '',
            },
          }
        : {}
    const restoredRouteSessionItems: RouteSessionSyncItem[] = Array.isArray(
      (draft as Partial<ActivitySyncPayload>).routeSessionItems
    )
      ? ((draft as Partial<ActivitySyncPayload>).routeSessionItems as RouteSessionSyncItem[])
      : []

    setSourceMode(restoredSourceMode)
    setAssignmentId(draft.assignmentId ?? '')
    setSelectedLibraryIds(restoredSelectedLibraryIds)
    setSelfInputEntries(restoredSelfInputEntries)
    setCustomActivityName(draft.customActivityName ?? '')
    setCustomActivityDescription(draft.customActivityDescription ?? '')
    setEquipmentNo(draft.equipmentNo ?? '')
    setStartTime(
      checklistContext
        ? alignDateTimeToReference(draft.startTime, defaultStartTime)
        : draft.startTime || defaultStartTime
    )
    setEndTime(
      checklistContext
        ? alignDateTimeToReference(draft.endTime, defaultEndTime)
        : draft.endTime || defaultEndTime
    )
    setMaterialUsed(draft.materialUsed ?? '')
    setNotes(draft.notes ?? '')
    setManualLocation(draft.manualLocation ?? '')
    setPhotoName(draft.photo?.name ?? '')
    setRestoredPhotoPayload(draft.photo ?? null)
    if (restoredRouteSessionItems.length > 0) {
      setRouteItemState(
        Object.fromEntries(
          restoredRouteSessionItems.flatMap((item) => {
            const itemKey = item.overtimeCommandLetterItemId ?? item.routeItemId
            if (itemKey == null) {
              return []
            }

            return [
              [
                itemKey,
                {
                  isChecked: item.isChecked,
                  unitNumber: item.unitNumber,
                  remark: item.remark,
                  startedAt: checklistContext
                    ? alignDateTimeToReference(item.startedAt, defaultStartTime)
                    : item.startedAt,
                  endedAt: checklistContext
                    ? alignDateTimeToReference(item.endedAt, defaultEndTime)
                    : item.endedAt,
                  actualPoints: `${item.actualPoints}`,
                  tireCount: item.tireCount ?? 1,
                  materialUsed: item.materialUsed || '',
                },
              ],
            ]
          })
        ) as Record<number, RouteItemState>
      )
    }
    if (Array.isArray(draft.teamMemberEmployeeIds) && draft.teamMemberEmployeeIds.length > 0) {
      setSelectedMemberIds(draft.teamMemberEmployeeIds)
      setIsTeamLog(true)
    }
  }, [checklistContext, defaultEndTime, defaultStartTime, queuedDraftKey, rawSession, revisionSessionId])

  useEffect(() => {
    if (!checklistContext) {
      setRouteItemState({})
      return
    }

    setRouteItemState((current) => {
      if (Object.keys(current || {}).length > 0) {
        return current
      }

      const matchMap = new Map<number, any>()
      rawItems.forEach((si: any) => {
        if (si.routeItemId) matchMap.set(Number(si.routeItemId), si)
        if (si.overtimeCommandLetterItemId) matchMap.set(Number(si.overtimeCommandLetterItemId), si)
        if (si.libraryActivityId) matchMap.set(Number(si.libraryActivityId), si)
        if (si.id) matchMap.set(Number(si.id), si)
      })

      return Object.fromEntries(
        checklistContext.groups.flatMap((group) =>
          group.items.map((item) => {
            const matched =
              matchMap.get(item.id) ||
              (item.routeItemId ? matchMap.get(item.routeItemId) : null) ||
              (item.overtimeCommandLetterItemId ? matchMap.get(item.overtimeCommandLetterItemId) : null)
            const matchedPhotos = matched ? extractItemPhotos(matched) : []

            return [
              item.id,
              {
                isChecked: matched ? true : item.isChecked,
                unitNumber: matched?.unitNumber ?? item.unitNumber ?? '',
                remark: matched?.remark ?? item.remark ?? '',
                startedAt: matched?.startedAt
                  ? toDateTimeLocalValue(matched.startedAt)
                  : toDateTimeLocalValue(item.startedAt),
                endedAt: matched?.endedAt
                  ? toDateTimeLocalValue(matched.endedAt)
                  : toDateTimeLocalValue(item.endedAt),
                actualPoints: `${
                  matched?.actualPoints ??
                  matched?.points ??
                  item.actualPoints ??
                  item.pointOverride ??
                  item.libraryPoints ??
                  0
                }`,
                tireCount: matched?.tireCount ?? 1,
                materialUsed: matched?.materialUsed ?? '',
                photoName: matchedPhotos.length > 0 ? `${matchedPhotos.length} foto terlampir` : '',
                previewUrls: matchedPhotos,
              },
            ]
          })
        )
      ) as Record<number, RouteItemState>
    })
  }, [checklistContext, rawItems])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((current) => ({ ...current, message: 'GPS tidak didukung browser.' }))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeo({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          accuracy: `${Math.round(position.coords.accuracy)}m`,
          locationName: '',
          message: 'GPS lock aktif',
        })
      },
      (error) => {
        setGeo((current) => ({
          ...current,
          message: error.message || 'GPS butuh izin browser.',
        }))
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 12000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  function handleRefreshGps() {
    if (!navigator.geolocation) return
    setGeo((current) => ({ ...current, message: 'Mencari sinyal GPS...' }))
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          accuracy: `${Math.round(position.coords.accuracy)}m`,
          locationName: '',
          message: 'GPS lock aktif',
        })
      },
      (error) => {
        setGeo((current) => ({
          ...current,
          message: error.message || 'Akses GPS ditolak.',
        }))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  const boundary = validateSiteBoundary(
    site,
    geo.latitude ? Number(geo.latitude) : null,
    geo.longitude ? Number(geo.longitude) : null
  )

  function updateRouteItem(itemId: number, nextValue: Partial<RouteItemState>) {
    setRouteItemState((current) => ({
      ...current,
      [itemId]: {
        ...emptyRouteItemState,
        ...current[itemId],
        ...nextValue,
      },
    }))
  }

  function updateSelfInputEntry(libraryId: string, nextValue: Partial<SelfInputEntryState>) {
    setSelfInputEntries((current) => ({
      ...current,
      [libraryId]: {
        ...(current[libraryId] ??
          buildDefaultSelfInputEntry(
            selectedLibraryIds.indexOf(libraryId),
            defaultStartTime,
            defaultEndTime
          )),
        ...nextValue,
      },
    }))
  }

  function toggleLibrarySelection(libraryId: string) {
    setSelectedLibraryIds((current) => {
      const exists = current.includes(libraryId)
      const nextIds = exists
        ? current.filter((item) => item !== libraryId)
        : [...current, libraryId]

      setSelfInputEntries((previous) => {
        if (exists) {
          const { [libraryId]: _removed, ...rest } = previous
          return rest
        }

        return {
          ...previous,
          [libraryId]:
            previous[libraryId] ??
            buildDefaultSelfInputEntry(current.length, defaultStartTime, defaultEndTime),
        }
      })

      return nextIds
    })
  }

  function toggleGroupSelection(libraryIds: string[]) {
    if (libraryIds.length === 0) return
    setSelectedLibraryIds((current) => {
      const allSelected = libraryIds.every((id) => current.includes(id))
      let nextIds: string[]
      if (allSelected) {
        nextIds = current.filter((id) => !libraryIds.includes(id))
      } else {
        const toAdd = libraryIds.filter((id) => !current.includes(id))
        nextIds = [...current, ...toAdd]
      }

      setSelfInputEntries((previous) => {
        const next = { ...previous }
        if (allSelected) {
          libraryIds.forEach((id) => delete next[id])
        } else {
          libraryIds.forEach((id, idx) => {
            if (!next[id]) {
              next[id] = buildDefaultSelfInputEntry(Object.keys(next || {}).length + idx, defaultStartTime, defaultEndTime)
            }
          })
        }
        return next
      })

      return nextIds
    })
  }

  const routeSessionItems: RouteSessionSyncItem[] =
    checklistContext?.groups.flatMap((group) =>
      group.items.map((item) => {
        const stateForItem = routeItemState[item.id]
        const basePoints = item.pointOverride ?? item.libraryPoints ?? 0

        return {
          routeItemId: item.routeItemId,
          overtimeCommandLetterItemId: item.overtimeCommandLetterItemId,
          libraryActivityId: item.libraryActivityId,
          snapshotLabel: item.itemLabel,
          snapshotGroupName: group.groupName,
          snapshotPayload: {
            itemCode: item.itemCode,
            libraryCode: item.libraryCode,
            libraryName: item.libraryName,
            requiresUnit: item.requiresUnit,
            requiresTime: item.requiresTime,
            requiresRemark: item.requiresRemark,
            requiresPhoto: item.requiresPhoto,
            requiresTireCount: item.requiresTireCount,
            requiresMaterialUsed: item.requiresMaterialUsed,
            requiresChecklistEvidence: item.requiresChecklistEvidence,
          },
          unitNumber: stateForItem?.unitNumber || '',
          materialUsed: stateForItem?.materialUsed || '',
          remark: stateForItem?.remark || '',
          startedAt:
            stateForItem?.isChecked && item.requiresTime
              ? stateForItem.startedAt || defaultStartTime
              : '',
          endedAt:
            stateForItem?.isChecked && item.requiresTime
              ? stateForItem.endedAt || defaultEndTime
              : '',
          isChecked: stateForItem?.isChecked ?? false,
          actualPoints: stateForItem?.isChecked
            ? Number(stateForItem.actualPoints || basePoints || 0)
            : 0,
          tireCount: stateForItem?.isChecked && item.requiresTireCount ? stateForItem.tireCount ?? 1 : 0,
          sortOrder: item.sortOrder,
        }
      })
    ) ?? []
  const hasCheckedChecklist = routeSessionItems.some((item) => item.isChecked)

  const draftPayload: ActivitySyncPayload = {
    employeeId,
    sourceMode,
    assignmentId,
    libraryActivityId: selectedLibraryIds[0] ?? '',
    selectedLibraryActivityIds: selectedLibraryIds,
    selfInputActivities: selectedLibraryIds.map((libraryId, index) => {
      const entry =
        selfInputEntries[libraryId] ??
        buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)
      return {
        libraryActivityId: libraryId,
        equipmentNo: entry.equipmentNo,
        startTime: entry.startTime,
        endTime: entry.endTime,
        materialUsed: entry.materialUsed,
        notes: entry.notes,
      }
    }),
    routeTemplateId:
      sourceMode === 'self_input' && !hasCheckedChecklist
        ? ''
        : checklistContext?.routeTemplateId
          ? `${checklistContext.routeTemplateId}`
          : '',
    overtimeCommandLetterId:
      sourceMode === 'self_input' && !hasCheckedChecklist
        ? ''
        : checklistContext?.overtimeCommandLetterId
          ? `${checklistContext.overtimeCommandLetterId}`
          : '',
    routeShiftCode:
      sourceMode === 'self_input' && !hasCheckedChecklist
        ? ''
        : (checklistContext?.shiftCode ?? ''),
    routeSummaryRemark: '',
    routeSessionItems:
      sourceMode === 'self_input' && !hasCheckedChecklist ? [] : routeSessionItems,
    customActivityName,
    customActivityDescription,
    equipmentNo,
    startTime,
    endTime,
    materialUsed,
    notes,
    manualLocation,
    locationName:
      geo.locationName ||
      (geo.latitude && geo.longitude ? `${geo.latitude}, ${geo.longitude}` : '') ||
      manualLocation ||
      site?.name ||
      '',
    gpsLat: geo.latitude,
    gpsLng: geo.longitude,
    gpsValid: boundary.gpsValid,
    boundaryStatus: boundary.status,
    boundaryMessage: boundary.message,
    photo: null,
    photos: [],
    teamMemberEmployeeIds: selectedMemberIds,
  }

  useEffect(() => {
    writeDraft(ACTIVITY_DRAFT_STORAGE_KEY, draftPayload)
  }, [draftPayload])

  function validatePayload() {
    // 1. Validasi Header & Profil Pengajuan
    if (!workDate) {
      return 'Tanggal kerja wajib diisi.'
    }

    if (!shiftCode) {
      return 'Shift kerja wajib dipilih.'
    }

    if (!customerName?.trim()) {
      return 'Nama Customer / Pelanggan wajib diisi.'
    }

    if (!leaderEmployeeId) {
      return 'Pilih Leader / Supervisor / PJO untuk persetujuan dokumen.'
    }

    if (superiorOptions.length > 0 && !superiorEmployeeId) {
      return 'Pilih Section Head / Superior untuk persetujuan dokumen.'
    }

    if (isTeamLog && selectedMemberIds.length === 0) {
      return 'Pilih minimal satu anggota tim untuk aktivitas kelompok / tim.'
    }

    if (
      sourceMode !== 'self_input' &&
      checklistContext?.overtimeCommandLetterId &&
      startTime.slice(0, 10) !== defaultStartTime.slice(0, 10)
    ) {
      return 'Tanggal aktivitas tidak sesuai dengan jadwal SPL.'
    }

    if (
      checklistContext &&
      sourceMode !== 'self_input' &&
      !assignmentId &&
      !customActivityName.trim() &&
      routeSessionItems.length > 0 &&
      routeSessionItems.every((item) => !item.isChecked)
    ) {
      return checklistContext.kind === 'spl'
        ? 'Centang minimal satu item checklist SPL.'
        : 'Centang minimal satu item checklist route.'
    }

    // 2. Validasi Mode Assigned
    if (sourceMode === 'assigned') {
      if (!assignmentId) {
        return 'Pilih assignment terlebih dahulu.'
      }

      if (!startTime || !endTime) {
        return 'Waktu mulai dan selesai wajib diisi.'
      }

      if (new Date(endTime) <= new Date(startTime)) {
        return 'Waktu selesai harus setelah waktu mulai.'
      }

      const hasAssignedPhoto =
        Boolean(photoFile) ||
        Boolean(photoFiles && photoFiles.length > 0) ||
        Boolean(restoredPhotoPayload) ||
        Boolean(photoPreviewUrls && photoPreviewUrls.length > 0) ||
        Boolean(photoName) ||
        initialCustomUrls.length > 0
      if (!hasAssignedPhoto) {
        return 'Foto bukti pekerjaan (evidence) wajib diunggah untuk assignment ini.'
      }

      return ''
    }

    // 3. Validasi Mode Custom
    if (sourceMode === 'custom') {
      if (!customActivityName.trim()) {
        return 'Nama custom activity wajib diisi.'
      }

      if (!startTime || !endTime) {
        return 'Waktu mulai dan selesai wajib diisi.'
      }

      if (new Date(endTime) <= new Date(startTime)) {
        return 'Waktu selesai harus setelah waktu mulai.'
      }

      const hasCustomPhoto =
        Boolean(photoFile) ||
        Boolean(photoFiles && photoFiles.length > 0) ||
        Boolean(restoredPhotoPayload) ||
        Boolean(photoPreviewUrls && photoPreviewUrls.length > 0) ||
        Boolean(photoName) ||
        initialCustomUrls.length > 0
      if (!hasCustomPhoto) {
        return 'Foto bukti pekerjaan (evidence) wajib diunggah untuk aktivitas custom.'
      }

      return ''
    }

    // 4. Validasi Mode Kamus Aktivitas (Self Input) & Checklist
    if (selectedLibraries.length === 0 && !hasCheckedChecklist) {
      return 'Pilih minimal satu aktivitas dari Kamus Aktivitas sebelum submit.'
    }

    // Validasi setiap aktivitas terpilih: field wajib dan foto evidence
    for (const [index, library] of (selectedLibraries || []).entries()) {
      const libraryId = `${library.id}`
      const entry =
        selfInputEntries[libraryId] ??
        buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)

      const matchingSessionItem = initialSessionData?.sessionItems?.find(
        (it: any) => String(it.libraryActivityId) === libraryId || String(it.id) === libraryId
      )
      const sessionPhotos = matchingSessionItem ? extractItemPhotos(matchingSessionItem) : []
      const hasPhoto = Boolean(
        entry?.photoFile ||
        (entry?.photoFiles && entry.photoFiles.length > 0) ||
        entry?.restoredPhotoPayload ||
        (entry?.previewUrls && entry.previewUrls.length > 0) ||
        entry?.photoName ||
        sessionPhotos.length > 0
      )

      if (!hasPhoto) {
        return `Foto bukti pekerjaan (evidence) wajib diunggah untuk aktivitas "${library.activityCode} - ${library.activityName}".`
      }

      if (!entry.notes?.trim()) {
        return `Catatan item wajib diisi untuk aktivitas "${library.activityCode} - ${library.activityName}".`
      }

      if (library.requiresEquipmentNo && !entry.equipmentNo.trim()) {
        return `Nomor Unit / Equipment wajib diisi untuk aktivitas ${library.activityCode}.`
      }

      if (library.requiresMaterialUsed && !entry.materialUsed.trim()) {
        return `Material / tools wajib diisi untuk aktivitas ${library.activityCode}.`
      }

      if (library.requiresTireCount && (!entry.tireCount || entry.tireCount <= 0)) {
        return `Jumlah tire wajib diisi untuk aktivitas ${library.activityCode}.`
      }

      if (!entry.startTime || !entry.endTime) {
        return `Waktu mulai dan selesai wajib diisi untuk aktivitas ${library.activityCode}.`
      }

      const start = new Date(entry.startTime)
      const end = new Date(entry.endTime)

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return `Format waktu tidak valid pada aktivitas ${library.activityCode}.`
      }

      if (end <= start) {
        return `Waktu selesai harus setelah waktu mulai pada aktivitas ${library.activityCode}.`
      }
    }

    // Validasi Checklist jika ada yang dicentang
    if (checklistContext && hasCheckedChecklist) {
      for (const group of checklistContext.groups) {
        for (const item of group.items) {
          const state = routeItemState[item.id]
          if (state?.isChecked) {
            const hasChecklistPhoto = Boolean(
              state?.photoFile ||
              (state?.photoFiles && state.photoFiles.length > 0) ||
              state?.restoredPhotoPayload ||
              (state?.previewUrls && state.previewUrls.length > 0) ||
              state?.photoName
            )
            if (!hasChecklistPhoto) {
              return `Foto bukti pekerjaan wajib diunggah untuk item checklist "${item.label || item.activityName || 'Checklist'}".`
            }

            if (item.requiresEquipmentNo && !state?.unitNumber?.trim()) {
              return `Nomor unit/equipment wajib diisi untuk item checklist "${item.label || item.activityName || 'Checklist'}".`
            }

            if (item.requiresTireCount && (!state?.tireCount || state?.tireCount <= 0)) {
              return `Jumlah tire wajib diisi untuk item checklist "${item.label || item.activityName || 'Checklist'}".`
            }

            if (item.requiresMaterialUsed && !state?.materialUsed?.trim()) {
              return `Material / tools wajib diisi untuk item checklist "${item.label || item.activityName || 'Checklist'}".`
            }
          }
        }
      }
    }

    // Validasi rentang waktu bentrok antar aktivitas
    const ranges: Array<{ code: string; start: Date; end: Date }> = []
    for (const [index, library] of (selectedLibraries || []).entries()) {
      const libraryId = `${library.id}`
      const entry =
        selfInputEntries[libraryId] ??
        buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)

      if (entry.startTime && entry.endTime) {
        const start = new Date(entry.startTime)
        const end = new Date(entry.endTime)
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
          ranges.push({ code: library.activityCode, start, end })
        }
      }
    }

    const sortedRanges = [...ranges].sort(
      (left, right) => left.start.getTime() - right.start.getTime()
    )
    for (let index = 1; index < sortedRanges.length; index += 1) {
      const previous = sortedRanges[index - 1]
      const current = sortedRanges[index]

      if (current.start < previous.end) {
        return `Waktu aktivitas ${current.code} bentrok dengan ${previous.code}.`
      }
    }

    return ''
  }

  async function sendPayload(submitPayload: ActivitySyncPayload) {
    const response = await fetch('/api/mobile/sync/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitPayload),
    })

    const text = await response.text()
    let result: { success?: boolean; message?: string; conflict?: boolean } = {}
    try {
      result = JSON.parse(text)
    } catch {
      throw new Error(`Server status ${response.status}: ${text.slice(0, 120)}`)
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Submit activity gagal.')
    }

    return result
  }

  async function buildSelfInputPayloads() {
    if (selectedLibraries.length === 0 && checklistContext && hasCheckedChecklist) {
      const checkedItem = checklistContext.groups
        .flatMap((group) => group.items)
        .find((item) => routeItemState[item.id]?.isChecked)
      const checkedState = checkedItem ? routeItemState[checkedItem.id] : null
      const checklistEvidence = await prepareEvidence(
        checkedState?.photoFiles,
        checkedState?.photoFile,
        checkedState?.restoredPhotoPayload,
        checkedState?.previewUrls
      )

      return [
        {
          label: checklistContext.summaryLabel,
          payload: {
            ...draftPayload,
            sourceMode: 'self_input' as const,
            libraryActivityId: '',
            assignmentId: '',
            photo: checklistEvidence.payloads[0] ?? null,
            photos: checklistEvidence.payloads,
            photoUrls: checklistEvidence.urls,
          },
        },
      ]
    }

    return Promise.all(
      selectedLibraries.map(async (library, index) => {
        const libraryId = `${library.id}`
        const entry =
          selfInputEntries[libraryId] ??
          buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)
        const matchingSessionItem = initialSessionData?.sessionItems?.find(
          (it: any) => String(it.libraryActivityId) === libraryId || String(it.id) === libraryId
        )
        const sessionPhotos = matchingSessionItem ? extractItemPhotos(matchingSessionItem) : []
        const effectiveUrls =
          entry.previewUrls && entry.previewUrls.length > 0
            ? entry.previewUrls
            : sessionPhotos

        const entryEvidence = await prepareEvidence(
          entry.photoFiles,
          entry.photoFile,
          entry.restoredPhotoPayload,
          effectiveUrls
        )

        return {
          label: `${library.activityCode} - ${library.activityName}`,
          payload: {
            ...draftPayload,
            sourceMode: 'self_input' as const,
            libraryActivityId: libraryId,
            assignmentId: '',
            equipmentNo: entry.equipmentNo,
            startTime: entry.startTime,
            endTime: entry.endTime,
            materialUsed: entry.materialUsed,
            tireCount: entry.tireCount ?? 1,
            notes: entry.notes,
            routeTemplateId: '',
            overtimeCommandLetterId: '',
            routeShiftCode: '',
            routeSummaryRemark: '',
            routeSessionItems: [],
            photo: entryEvidence.payloads[0] ?? null,
            photos: entryEvidence.payloads,
            photoUrls: entryEvidence.urls,
          },
        }
      })
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitState({ kind: 'idle', message: '' })

    const validationError = validatePayload()
    if (validationError) {
      setSubmitState({ kind: 'error', message: validationError })
      toast.error(validationError, {
        duration: 5000,
      })
      return
    }

    setIsSubmitting(true)
    try {
      let itemsToSubmit: any[] = []

      if (selectedLibraries.length > 0) {
        itemsToSubmit = await Promise.all(
          selectedLibraries.map(async (library, index) => {
            const libraryId = `${library.id}`
            const entry =
              selfInputEntries[libraryId] ??
              buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)
            const matchingSessionItem = initialSessionData?.sessionItems?.find(
              (it: any) => String(it.libraryActivityId) === libraryId || String(it.id) === libraryId
            )
            const sessionPhotos = matchingSessionItem ? extractItemPhotos(matchingSessionItem) : []
            const effectiveUrls =
              entry.previewUrls && entry.previewUrls.length > 0
                ? entry.previewUrls
                : sessionPhotos

            const entryEvidence = await prepareEvidence(
              entry.photoFiles,
              entry.photoFile,
              entry.restoredPhotoPayload,
              effectiveUrls
            )

            const validLibraryId =
              matchingSessionItem?.libraryActivityId
                ? Number(matchingSessionItem.libraryActivityId)
                : availableLibrary.some((lib) => String(lib.id) === libraryId)
                  ? Number(library.id)
                  : null

            return {
              id: matchingSessionItem?.id,
              label: `${library.activityCode} - ${library.activityName}`,
              group: library.activityCode || 'Technical',
              libraryActivityId: validLibraryId,
              unitNumber: entry.equipmentNo || '',
              startedAt: formatSubmitDateTime(entry.startTime, workDate),
              endedAt: formatSubmitDateTime(entry.endTime, workDate),
              points: library.basePoints || 5,
              remark: entry.notes || '',
              materialUsed: entry.materialUsed || '',
              photoUrl: entryEvidence.urls[0] || null,
              photos: entryEvidence.urls,
            }
          })
        )
      } else if (sourceMode === 'custom' && customActivityName) {
        const customEvidence = await prepareEvidence(
          photoFiles,
          photoFile,
          restoredPhotoPayload,
          photoPreviewUrls
        )
        const matchingCustomItem = initialSessionData?.sessionItems?.find((i: any) => !i.libraryActivityId)
        itemsToSubmit = [
          {
            id: matchingCustomItem?.id,
            label: customActivityName.trim(),
            group: 'Custom',
            libraryActivityId: null,
            unitNumber: equipmentNo.trim(),
            startedAt: formatSubmitDateTime(startTime, workDate),
            endedAt: formatSubmitDateTime(endTime, workDate),
            points: 5,
            remark: notes.trim(),
            materialUsed: materialUsed.trim(),
            photoUrl: customEvidence.urls[0] || null,
            photos: customEvidence.urls,
          },
        ]
      } else if (checklistContext && routeSessionItems.length > 0) {
        const checkedRouteItems = routeSessionItems.filter((item) => item.isChecked)
        if (checkedRouteItems.length > 0) {
          const checklistItems = await Promise.all(
            checkedRouteItems.map(async (item) => {
              const state = routeItemState[item.routeItemId!]
              const evidence = await prepareEvidence(
                state?.photoFiles,
                state?.photoFile,
                state?.restoredPhotoPayload,
                state?.previewUrls
              )
              return {
                routeItemId: item.routeItemId,
                overtimeCommandLetterItemId: item.overtimeCommandLetterItemId,
                label: item.snapshotLabel || 'Checklist Item',
                group: item.snapshotGroupName || 'Checklist',
                unitNumber: item.unitNumber || '',
                startedAt: formatSubmitDateTime(item.startedAt, workDate),
                endedAt: formatSubmitDateTime(item.endedAt, workDate),
                points: item.actualPoints || 5,
                remark: item.remark || '',
                materialUsed: item.materialUsed || '',
                photoUrl: evidence.urls[0] || null,
                photos: evidence.urls,
              }
            })
          )
          itemsToSubmit = [...itemsToSubmit, ...checklistItems]
        }
      }

      if (itemsToSubmit.length === 0) {
        if (initialSessionData?.sessionItems && initialSessionData.sessionItems.length > 0) {
          itemsToSubmit = initialSessionData.sessionItems.map((it: any) => ({
            id: it.id,
            label: it.label,
            group: it.group,
            libraryActivityId: it.libraryActivityId,
            unitNumber: it.unitNumber,
            startedAt: formatSubmitDateTime(it.startedAt, workDate),
            endedAt: formatSubmitDateTime(it.endedAt, workDate),
            points: it.points,
            remark: it.remark,
            materialUsed: it.materialUsed,
            photoUrl: it.photoUrl,
            photos: it.photos,
          }))
        } else {
          throw new Error('Mohon pilih minimal 1 aktivitas.')
        }
      }

      const selectedLeader = leaderOptions.find((l) => l.value === leaderEmployeeId)
      const selectedSuperior = superiorOptions.find((s) => s.value === superiorEmployeeId)

      if (revisionSessionId) {
        const res = await resubmitDailyActivityApprovalFormAction({
          sessionId: revisionSessionId,
          employeeId: employeeId,
          workDate,
          shiftCode,
          notes: notes.trim(),
          summaryRemark: notes.trim(),
          customerName: customerName ? customerName.trim() : undefined,
          teamMemberEmployeeIds: isTeamLog ? selectedMemberIds : [],
          items: itemsToSubmit,
          leaderEmployeeId: leaderEmployeeId ? Number(leaderEmployeeId) : undefined,
          leaderName: selectedLeader?.label?.split('—')[0]?.trim() || undefined,
          superiorEmployeeId: superiorEmployeeId ? Number(superiorEmployeeId) : undefined,
          superiorName: selectedSuperior?.label?.split('—')[0]?.trim() || undefined,
        })

        if (!res.success) {
          throw new Error(res.error || 'Gagal menyimpan revisi.')
        }

        setSubmitState({
          kind: 'success',
          message: 'Revisi Daily Activity berhasil disimpan dan diajukan ulang.',
        })
      } else {
        const res = await createDailyActivitySessionAction({
          employeeId,
          workDate,
          shiftCode,
          siteId: site?.id,
          customerName: customerName ? customerName.trim() : undefined,
          notes: notes.trim(),
          summaryRemark: notes.trim(),
          leaderEmployeeId: leaderEmployeeId ? Number(leaderEmployeeId) : undefined,
          leaderName: selectedLeader?.label?.split('—')[0]?.trim() || undefined,
          superiorEmployeeId: superiorEmployeeId ? Number(superiorEmployeeId) : undefined,
          superiorName: selectedSuperior?.label?.split('—')[0]?.trim() || undefined,
          teamMemberEmployeeIds: isTeamLog ? selectedMemberIds : [],
          items: itemsToSubmit,
        })

        if (!res.success) {
          throw new Error(res.error || 'Gagal membuat dokumen Daily Activity.')
        }

        setSubmitState({
          kind: 'success',
          message: `${itemsToSubmit.length} aktivitas berhasil diajukan dalam 1 dokumen DAR.`,
        })
      }

      clearDraft(ACTIVITY_DRAFT_STORAGE_KEY)
      if (queuedDraftKey) {
        clearDraft(queuedDraftKey)
      }

      window.setTimeout(() => {
        const targetUrl = `/mobile/activity?tab=approval&submitted=1${checklistContext?.overtimeCommandLetterId ? '&spl=1' : ''}`
        window.location.href = targetUrl
      }, 1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submit activity gagal.'
      setSubmitState({ kind: 'error', message })
      toast.error(message, {
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={libraryPickerOpen} onOpenChange={setLibraryPickerOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[88dvh] max-w-[min(420px,94vw)] sm:max-w-[420px] w-full gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl flex flex-col z-50"
        >
          <DialogHeader className="bg-[linear-gradient(135deg,#003461,#004b87)] px-4 py-3 text-left text-white flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-sky-200" />
              <DialogTitle className="text-sm sm:text-base font-extrabold text-white">
                Pilih Kamus Aktivitas
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setLibraryPickerOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>
            <DialogDescription className="sr-only">Pilih aktivitas dari kamus</DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2.5 overflow-hidden">
            <div className="rounded-xl bg-slate-100/90 px-3 py-2 shadow-2xs shrink-0 border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Search className="size-3.5 text-slate-400 shrink-0" />
                <input
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Cari kode atau nama aktivitas..."
                  className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
                {librarySearch && (
                  <button
                    type="button"
                    onClick={() => setLibrarySearch('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shrink-0 border border-slate-100">
              <span>{filteredLibraries.length} library tersedia</span>
              <span className="font-bold text-[#003461] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                {selectedLibraryIds.length} dipilih
              </span>
            </div>

            <div className="flex-1 max-h-[50dvh] sm:max-h-[55dvh] space-y-2 overflow-y-auto pr-0.5">
              <RouteFolderTree
                routeFolders={availableRouteFolders || []}
                availableLibraryMap={availableLibraryMap}
                selectedLibraryIds={selectedLibraryIds}
                toggleLibrarySelection={toggleLibrarySelection}
                toggleGroupSelection={toggleGroupSelection}
                librarySearch={librarySearch}
              />
            </div>

            <div className="pt-1 shrink-0">
              <Button
                type="button"
                className="h-10 sm:h-11 w-full rounded-xl bg-[#003461] hover:bg-[#00274a] text-xs font-bold text-white shadow-xs cursor-pointer"
                onClick={() => setLibraryPickerOpen(false)}
              >
                Pakai {selectedLibraryIds.length} Activity
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-4">
        {submitState.kind !== 'idle' ? (
          <div
            className={
              submitState.kind === 'success'
                ? 'rounded-[1.1rem] bg-[#dff4e8] px-4 py-3 text-xs font-semibold text-[#14532d]'
                : 'rounded-[1.1rem] bg-[#f4ddce] px-4 py-3 text-xs font-semibold text-[#5a2200]'
            }
          >
            {submitState.message}
          </div>
        ) : null}

        {/* Details & Employee Profile */}
        <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                {revisionSessionId ? 'Revisi Formulir Aktivitas' : 'Formulir Aktivitas'}
              </p>
              <h2 className="text-base font-extrabold text-[#003461]">
                Details & Employee Profile
              </h2>
            </div>
            <Button
              type="button"
              onClick={() => setIsPdfOpen(true)}
              size="sm"
              variant="outline"
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-bold gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer",
                revisionSessionId
                  ? "border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 ring-2 ring-amber-200/70"
                  : "border-sky-200 bg-[#eaf4fb] hover:bg-sky-100 text-[#003f78]"
              )}
            >
              <Eye className="size-3.5" />
              Preview
            </Button>
          </div>

          {/* Tanggal & Shift Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Label className="block space-y-1.5">
              <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                Tanggal Kerja
              </span>
              <Input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-[#082033]"
              />
            </Label>
            <Label className="block space-y-1.5">
              <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                Shift
              </span>
              <select
                value={shiftCode}
                onChange={(e) => setShiftCode(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-[#082033]"
              >
                <option value="ALL">ALL (Semua Shift)</option>
                <option value="Day">Day Shift</option>
                <option value="Night">Night Shift</option>
                <option value="Shift 1">Shift 1</option>
                <option value="Shift 2">Shift 2</option>
              </select>
            </Label>
          </div>

          {/* Profil Karyawan Box */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#eaf4fb] text-[#003f78]">
                  <UserRound className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#082033]">{employee?.name || 'Karyawan'}</p>
                  <p className="text-[10px] font-mono font-semibold text-slate-500">SN: {employee?.employeeSn || employeeId}</p>
                </div>
              </div>
              <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {employee?.jobTitle || 'Staff'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-400">Dept / Section</p>
                <p className="font-semibold text-slate-800 text-[11px] truncate">
                  {employee?.department || '-'} / {employee?.section || '-'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-400">Site</p>
                <p className="font-semibold text-slate-800 text-[11px] truncate">
                  {site?.name || 'Site'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <Label className="block space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-400">Customer / Partner</span>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama Customer / Partner (Opsional)"
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#082033]"
                />
              </Label>
            </div>
          </div>
        </section>

        {teamMembers && teamMembers.length > 0 ? (
          <section className="space-y-3 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Team Logging
                </span>
                <p className="text-sm font-semibold text-gray-900">Input Sekaligus untuk Tim</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTeamLog(!isTeamLog)
                  if (isTeamLog) {
                    setSelectedMemberIds([])
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isTeamLog ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isTeamLog ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isTeamLog && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <Label className="block space-y-2">
                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                    Pilih Anggota Tim
                  </span>
                  <Popover open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex h-12 w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 text-left text-sm font-semibold text-[#082033]"
                      >
                        <span className="truncate">
                          {selectedMemberIds.length > 0
                            ? `${selectedMemberIds.length} anggota tim dipilih`
                            : 'Pilih anggota tim...'}
                        </span>
                        <ChevronDown className="size-4 text-gray-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-2.5rem)] max-w-sm rounded-[1.25rem] border border-gray-100 bg-white p-3 shadow-lg" align="start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                          <Search className="size-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Cari nama anggota..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {filteredTeamMembers.length > 0 ? (
                            filteredTeamMembers.map((member) => {
                              const isChecked = selectedMemberIds.includes(member.id)
                              return (
                                <div
                                  key={member.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== member.id))
                                    } else {
                                      setSelectedMemberIds([...selectedMemberIds, member.id])
                                    }
                                  }}
                                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-900">{member.name}</span>
                                    <span className="text-[10px] text-gray-500">
                                      {member.role}
                                      {member.section ? ` • ${member.section}` : ''}
                                      {site?.name ? ` • ${site.name}` : ''}
                                    </span>
                                  </div>
                                  <Checkbox checked={isChecked} onCheckedChange={() => {}} className="pointer-events-none rounded-md" />
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-center py-4 text-xs font-medium text-gray-500">
                              Tidak ada anggota tim yang cocok
                            </p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </Label>

                {selectedMemberIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedMemberIds.map((id) => {
                      const member = teamMembers.find((m) => m.id === id)
                      if (!member) return null
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-50 border border-blue-100 text-blue-800 rounded-full px-2.5 py-1 text-xs font-semibold"
                        >
                          {member.name}
                          <button
                            type="button"
                            onClick={() => setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id))}
                            className="rounded-full hover:bg-blue-100 p-0.5"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        ) : null}

        <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
            <Label className="block space-y-2">
              <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                Source mode
              </span>
              <select
                value={sourceMode}
                onChange={(event) => setSourceMode(event.target.value as typeof sourceMode)}
                className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
              >
                <option value="assigned">Assigned activity</option>
                <option value="self_input">Self-input activity</option>
                <option value="custom">Custom activity</option>
              </select>
            </Label>

            {sourceMode === 'assigned' ? (
              <Label className="block space-y-2">
                <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Assignment
                </span>
                <select
                  value={assignmentId}
                  onChange={(event) => setAssignmentId(event.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                >
                  <option value="">Pilih assignment</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {(assignment.activityName ?? assignment.customJobName) ||
                        `Assignment #${assignment.id}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 font-semibold text-[#486275]">
                  {selectedAssignment?.requiresPhoto
                    ? 'Assignment ini wajib upload foto evidence.'
                    : 'Pilih assignment yang sedang dikerjakan.'}
                </p>
                {selectedAssignment
                  ? renderPhotoWidget('single', !!selectedAssignment.requiresPhoto, photoName, photoPreviewUrls)
                  : null}
              </Label>
            ) : null}

            {sourceMode === 'self_input' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                      Library activity
                    </span>
                  </div>
                  <Badge className="border-0 bg-[#eaf4fb] text-[10px] font-black tracking-[0.12em] text-[#003f78] uppercase">
                    {selectedLibraryIds.length} dipilih
                  </Badge>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-between rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033] cursor-pointer touch-manipulation select-none active:scale-[0.99] transition-transform"
                  onClick={() => {
                    if (typeof document !== 'undefined') {
                      document.body.style.pointerEvents = ''
                    }
                    setLibraryPickerOpen(true)
                  }}
                >
                  <span className="truncate text-left">
                    {selectedLibraries.length > 0
                      ? `${selectedLibraries.length} activity dipilih`
                      : 'Pilih activity library'}
                  </span>
                  <Search className="size-4 text-[#486275]" />
                </Button>

                {selectedLibraries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedLibraries.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleLibrarySelection(`${item.id}`)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#f6fbff] px-3 py-2 text-[11px] font-black tracking-[0.08em] text-[#003f78] uppercase shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)]"
                      >
                        <span>{item.activityCode}</span>
                        <X className="size-3.5" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {sourceMode === 'custom' ? (
              <>
                <Label className="block space-y-2">
                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                    Custom activity
                  </span>
                  <Input
                    value={customActivityName}
                    onChange={(event) => setCustomActivityName(event.target.value)}
                    placeholder="Custom activity name"
                    className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                  />
                </Label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Label className="block space-y-2">
                    <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                      Mulai
                    </span>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                    />
                  </Label>
                  <Label className="block space-y-2">
                    <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                      Selesai
                    </span>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                    />
                  </Label>
                </div>

                <Label className="block space-y-2">
                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                    Material used
                  </span>
                  <Input
                    value={materialUsed}
                    onChange={(event) => setMaterialUsed(event.target.value)}
                    placeholder="Material / tools dipakai"
                    className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                  />
                </Label>

                {renderPhotoWidget('single', false, photoName, photoPreviewUrls)}

                <Label className="block space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                      Description
                    </span>
                    <SpeechInputButton
                      onFinalTranscript={(text) =>
                        setCustomActivityDescription((prev) => (prev ? prev + ' ' + text : text))
                      }
                      className="size-7"
                    />
                  </div>
                  <Textarea
                    value={customActivityDescription}
                    onChange={(event) => setCustomActivityDescription(event.target.value)}
                    rows={4}
                    placeholder="Jelaskan aktivitas custom."
                    className="rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#082033]"
                  />
                </Label>
              </>
            ) : null}
          </section>

        {sourceMode === 'self_input' ? (
          <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Selected library checklist
                </p>
                <p className="mt-1 text-base font-black text-[#082033]">
                  {selectedLibraries.length > 0
                    ? `${selectedLibraries.length} activity siap diisi`
                    : 'Belum ada activity dipilih'}
                </p>
              </div>
              {needsGlobalPhoto ? (
                <Badge className="border-0 bg-[#fff1cf] text-[9px] font-black tracking-[0.14em] text-[#8a5a00] uppercase">
                  Butuh foto
                </Badge>
              ) : null}
            </div>

            {selectedLibraries.length > 0 ? (
              <div className="space-y-3">
                {selectedLibraries.map((library, index) => {
                  const libraryId = `${library.id}`
                  const entry =
                    selfInputEntries[libraryId] ??
                    buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)
                  const requirementBadges = [
                    library.requiresEquipmentNo ? 'Equipment wajib' : null,
                    library.requiresTireCount ? 'Tire wajib' : null,
                    library.requiresDuration ? 'Waktu wajib' : null,
                    library.requiresMaterialUsed ? 'Material wajib' : null,
                    library.requiresPhoto ? 'Foto umum wajib' : null,
                  ].filter(Boolean)

                  return (
                    <div key={library.id} className="rounded-[1rem] bg-[#f6fbff] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                            #{index + 1} • {library.activityCode}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#082033]">
                            {library.activityName}
                          </p>
                          <p className="mt-1 text-xs leading-5 font-semibold text-[#486275]">
                            {library.basePoints} pts • max {library.maxPointsPerDay} pts / hari
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLibrarySelection(libraryId)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#486275] shadow-[0_10px_22px_rgba(8,32,51,0.08)]"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {requirementBadges.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {requirementBadges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-[#003f78] uppercase"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Mulai
                            </span>
                            <Input
                              type="datetime-local"
                              value={entry.startTime}
                              onChange={(event) =>
                                updateSelfInputEntry(libraryId, { startTime: event.target.value })
                              }
                              className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
                            />
                          </Label>
                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Selesai
                            </span>
                            <Input
                              type="datetime-local"
                              value={entry.endTime}
                              onChange={(event) =>
                                updateSelfInputEntry(libraryId, { endTime: event.target.value })
                              }
                              className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
                            />
                          </Label>
                        </div>

                        {library.requiresMaterialUsed ? (
                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Material used
                            </span>
                            <Input
                              value={entry.materialUsed}
                              onChange={(event) =>
                                updateSelfInputEntry(libraryId, {
                                  materialUsed: event.target.value,
                                })
                              }
                              placeholder="Material / tools dipakai"
                              className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
                            />
                          </Label>
                        ) : null}

                        {library.requiresTireCount ? (
                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Jumlah tire
                            </span>
                            <Input
                              type="number"
                              min={1}
                              value={entry.tireCount ?? 1}
                              onChange={(event) =>
                                updateSelfInputEntry(libraryId, {
                                  tireCount: Math.max(1, parseInt(event.target.value, 10) || 1),
                                })
                              }
                              placeholder="Jumlah tire yang dikerjakan"
                              className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
                            />
                          </Label>
                        ) : null}

                        {renderPhotoWidget(
                          `library:${libraryId}`,
                          !!library.requiresPhoto,
                          entry.photoName,
                          entry.previewUrls
                        )}
                        <Label className="block space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Catatan item *
                            </span>
                            <SpeechInputButton
                              onFinalTranscript={(text) =>
                                updateSelfInputEntry(libraryId, {
                                  notes: entry.notes ? entry.notes + ' ' + text : text,
                                })
                              }
                              className="size-7"
                            />
                          </div>
                          <Textarea
                            rows={3}
                            value={entry.notes}
                            onChange={(event) =>
                              updateSelfInputEntry(libraryId, { notes: event.target.value })
                            }
                            placeholder="Wajib diisi: Hasil kerja, temuan, atau catatan singkat."
                            className="rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold text-[#082033]"
                          />
                        </Label>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-[1rem] bg-[#f6fbff] px-4 py-8 text-center text-sm font-semibold text-[#486275]"></div>
            )}
          </section>
        ) : null}


        {checklistContext && sourceMode !== 'self_input' ? (
          <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                {checklistContext.summaryLabel}
              </p>
              <p className="mt-1 text-base font-black text-[#082033]">{checklistContext.title}</p>
              <p className="mt-2 text-xs leading-5 font-semibold text-[#486275]">
                {checklistContext.code} • {checklistContext.shiftCode}
              </p>
              {checklistContext.activeSpl ? (
                <>
                  <p className="mt-2 text-xs leading-5 font-semibold text-[#486275]">
                    SPL aktif: {checklistContext.activeSpl.splNumber} •{' '}
                    {checklistContext.activeSpl.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 font-semibold text-[#486275]">
                    {checklistContext.activeSpl.lineCount} line •{' '}
                    {checklistContext.activeSpl.plannedPointsTotal} pts
                  </p>
                </>
              ) : null}
            </div>

            {checklistContext.activeSpl ? (
              <div className="space-y-2 rounded-[1rem] bg-[#f6fbff] px-4 py-3">
                {checklistContext.activeSpl.items.map((item) => (
                  <div key={item.id}>
                    <p className="text-sm font-semibold text-[#082033]">{item.lineLabel}</p>
                    <p className="text-xs leading-5 font-semibold text-[#486275]">
                      {item.targetUnit || '-'} • {item.plannedPoints} pts
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-3">
              {checklistContext.groups.map((group) => (
                <div key={group.id} className="rounded-[1rem] bg-[#f6fbff] px-4 py-3">
                  <p className="text-[10px] font-black tracking-[0.14em] text-[#486275] uppercase">
                    {group.groupKey}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#082033]">{group.groupName}</p>
                  {group.description ? (
                    <p className="mt-1 text-xs leading-5 font-semibold text-[#486275]">
                      {group.description}
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-3">
                    {group.items.map((item) => {
                      const itemState = routeItemState[item.id] ?? {
                        isChecked: false,
                        unitNumber: '',
                        remark: '',
                        startedAt: '',
                        endedAt: '',
                        actualPoints: `${item.pointOverride ?? item.libraryPoints ?? 0}`,
                      }

                      return (
                        <div key={item.id} className="rounded-[0.9rem] bg-white px-3 py-3">
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={itemState.isChecked}
                              onChange={(event) =>
                                updateRouteItem(item.id, {
                                  isChecked: event.target.checked,
                                })
                              }
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-[#082033]">
                                {item.itemLabel}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-[#486275]">
                                {item.itemDescription || item.libraryName || 'Checklist item'}
                              </span>
                              {item.requiresPhoto ? (
                                <span className="mt-1 inline-flex rounded-full bg-[#fff1cf] px-2 py-1 text-[10px] font-black tracking-[0.08em] text-[#8a5a00] uppercase">
                                  Foto wajib
                                </span>
                              ) : null}
                              <span className="mt-1 block text-[11px] font-black tracking-[0.12em] text-[#003f78] uppercase">
                                {item.pointOverride ?? item.libraryPoints ?? 0} pts
                              </span>
                            </span>
                          </label>

                          {itemState.isChecked ? (
                            <div className="mt-3 grid gap-3">
                              {item.requiresMaterialUsed ? (
                                <Label className="block space-y-2">
                                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                                    Material used
                                  </span>
                                  <Input
                                    value={itemState.materialUsed ?? ''}
                                    onChange={(event) =>
                                      updateRouteItem(item.id, { materialUsed: event.target.value })
                                    }
                                    placeholder="Material / tools dipakai"
                                    className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                                  />
                                </Label>
                              ) : null}

                              {item.requiresTireCount ? (
                                <Label className="block space-y-2">
                                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                                    Jumlah tire
                                  </span>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={itemState.tireCount ?? 1}
                                    onChange={(event) =>
                                      updateRouteItem(item.id, {
                                        tireCount: Math.max(1, parseInt(event.target.value, 10) || 1),
                                      })
                                    }
                                    placeholder="Jumlah tire yang dikerjakan"
                                    className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                                  />
                                </Label>
                              ) : null}

                              {item.requiresTime ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Label className="block space-y-2">
                                    <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                                      Mulai
                                    </span>
                                    <Input
                                      type="time"
                                      value={timeInputValue(
                                        itemState.startedAt || defaultStartTime
                                      )}
                                      onChange={(event) =>
                                        updateRouteItem(item.id, {
                                          startedAt: replaceTimeValue(
                                            itemState.startedAt || defaultStartTime,
                                            event.target.value
                                          ),
                                        })
                                      }
                                      className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                                    />
                                  </Label>
                                  <Label className="block space-y-2">
                                    <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                                      Selesai
                                    </span>
                                    <Input
                                      type="time"
                                      value={timeInputValue(itemState.endedAt || defaultEndTime)}
                                      onChange={(event) =>
                                        updateRouteItem(item.id, {
                                          endedAt: replaceTimeValue(
                                            itemState.endedAt || defaultEndTime,
                                            event.target.value
                                          ),
                                        })
                                      }
                                      className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                                    />
                                  </Label>
                                </div>
                              ) : null}

                              {renderPhotoWidget(
                                `route:${item.id}`,
                                !!item.requiresPhoto,
                                itemState.photoName,
                                itemState.previewUrls
                              )}
                              {item.requiresRemark ? (
                                <Label className="block space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                                      Keterangan
                                    </span>
                                    <SpeechInputButton
                                      onFinalTranscript={(text) =>
                                        updateRouteItem(item.id, {
                                          remark: itemState.remark
                                            ? itemState.remark + ' ' + text
                                            : text,
                                        })
                                      }
                                      className="size-7"
                                    />
                                  </div>
                                  <Textarea
                                    rows={3}
                                    value={itemState.remark}
                                    onChange={(event) =>
                                      updateRouteItem(item.id, { remark: event.target.value })
                                    }
                                    placeholder="Checklist notes"
                                    className="rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#082033]"
                                  />
                                </Label>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sourceMode !== 'self_input' ? (
          <>
            <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <Label className="block space-y-2">
                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                    Start time
                  </span>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                  />
                </Label>
                <Label className="block space-y-2">
                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                    End time
                  </span>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                  />
                </Label>
              </div>

              <Label className="block space-y-2">
                <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Equipment / unit no.
                </span>
                <Input
                  value={equipmentNo}
                  onChange={(event) => setEquipmentNo(event.target.value)}
                  placeholder="Contoh: DT-451 / BAY-03"
                  className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                />
              </Label>

              <Label className="block space-y-2">
                <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Material used
                </span>
                <Input
                  value={materialUsed}
                  onChange={(event) => setMaterialUsed(event.target.value)}
                  placeholder="Material / tools dipakai"
                  className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                />
              </Label>
            </section>

            <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
              <Label className="block space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                    Notes / hasil kerja
                  </span>
                  <SpeechInputButton
                    onFinalTranscript={(text) =>
                      setNotes((prev: string) => (prev ? prev + ' ' + text : text))
                    }
                    className="size-7"
                  />
                </div>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  placeholder="Ringkas pekerjaan, hasil, kendala, bukti penting."
                  className="rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#082033]"
                />
              </Label>
            </section>
          </>
        ) : null}

        {/* C. Penandatangan Approval (Signatories) */}
        <section className="rounded-xl bg-white p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-600"></span>
              <h2 className="text-xs font-bold text-slate-800">
                C. Penandatangan Approval (Signatories)
              </h2>
            </div>
            <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
              LEADER / PJO APPROVAL
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Leader / Supervisor (Tahap 1) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Leader / Supervisor / PJO
                </label>
                {existingLeaderApproval?.status === 'approved' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    SUDAH DISETUJUI (TERKUNCI)
                  </span>
                ) : null}
              </div>
              <SearchableSelect
                label="Leader / Supervisor"
                value={leaderEmployeeId}
                onValueChange={(val) => setLeaderEmployeeId(val)}
                options={leaderOptions}
                placeholder="-- PILIH LEADER / PJO --"
                widthClassName="w-full"
                disabled={existingLeaderApproval?.status === 'approved'}
              />
            </div>
          </div>
        </section>

        {/* Tanda Tangan Digital Karyawan */}
        <MobileSignatureSection
          initialSignatureDataUrl={employee?.signatureDataUrl || (initialSessionData?.employee as any)?.signatureDataUrl || null}
          initialRegisteredAt={employee?.signatureRegisteredAt || (initialSessionData?.employee as any)?.signatureRegisteredAt || null}
        />

        <GpsLocationPreviewCard
          needsGps={needsGps}
          latitude={geo.latitude}
          longitude={geo.longitude}
          accuracy={geo.accuracy}
          message={geo.message}
          locationName={geo.locationName}
          manualLocation={manualLocation}
          onManualLocationChange={setManualLocation}
          onRefreshGps={handleRefreshGps}
          boundaryStatus={boundary.status}
          boundaryMessage={boundary.message}
          gpsValid={boundary.gpsValid}
          siteName={site?.name}
        />

        {submitState.kind === 'error' ? (
          <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 text-xs shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 mt-0.5">
              <AlertCircle className="size-4" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="font-extrabold text-red-900 text-xs">Perhatian: Formulir Belum Lengkap</p>
              <p className="font-semibold text-red-700 text-xs leading-relaxed">{submitState.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitState({ kind: 'idle', message: '' })}
              className="text-red-400 hover:text-red-700 p-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-14 rounded-2xl border-0 bg-[#eaf4fb] text-[#003f78]"
            onClick={() => {
              writeDraft(ACTIVITY_DRAFT_STORAGE_KEY, draftPayload)
              setSubmitState({
                kind: 'success',
                message: 'Draft activity disimpan ke local storage.',
              })
            }}
          >
            <Save className="size-4" />
            Save Draft
          </Button>
          <Button
            type="submit"
            className="h-14 rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)] font-bold text-xs"
            disabled={isSubmitting}
          >
            <SendHorizontal className="size-4" />
            {isSubmitting
              ? revisionSessionId
                ? 'Menyimpan Revisi...'
                : 'Submitting...'
              : revisionSessionId
                ? 'Simpan & Ajukan Ulang Revisi'
                : 'Submit Activity'}
          </Button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotoChange}
        />

        {/* ── Zoomable Formal PDF Preview Modal Dialog (SPL & DAR Standard) ── */}
        <Dialog open={isPdfOpen} onOpenChange={setIsPdfOpen}>
          <DialogContent
            showCloseButton={false}
            className="max-w-4xl w-[96vw] max-h-[92vh] p-0 rounded-2xl overflow-hidden flex flex-col bg-white border border-slate-200 text-slate-900 shadow-2xl z-50"
          >
            <DialogHeader className="p-3 bg-[linear-gradient(135deg,#003461,#004b87)] border-b border-blue-900 flex flex-row items-center justify-between space-y-0 shrink-0 text-white">
              <DialogTitle className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="size-4 text-sky-200" />
                Preview Dokumen Daily Activity {initialSessionData?.sessionCode ? `(#${initialSessionData.sessionCode})` : ''}
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewZoom((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))))}
                  className="h-7 w-7 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetZoomAndPan}
                  className="h-7 px-2 text-[10px] font-bold bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer"
                  title="Reset Zoom & Pan"
                >
                  {Math.round(previewZoom * 100)}%
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewZoom((prev) => Math.min(3.0, Number((prev + 0.15).toFixed(2))))}
                  className="h-7 w-7 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadPdf}
                  className="h-7 px-2.5 text-[10px] font-bold bg-white text-[#003461] hover:bg-sky-50 shadow-2xs ml-1 flex items-center gap-1 cursor-pointer border-0"
                >
                  <Download className="size-3" />
                  {isDownloadingPdf ? 'Unduh...' : 'Unduh PDF'}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsPdfOpen(false)}
                  className="p-1 rounded-md text-sky-200 hover:text-white hover:bg-white/10 ml-1 cursor-pointer transition-colors"
                  aria-label="Tutup Preview"
                >
                  <X className="size-4" />
                </button>
              </div>
            </DialogHeader>

            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onWheel={handleWheel}
              className={cn(
                "flex-1 overflow-hidden p-2 sm:p-4 bg-slate-100 flex justify-center items-start touch-none select-none relative",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
            >
              {(() => {
                const previewItemsList = selectedLibraries.length > 0
                  ? selectedLibraries.map((lib, idx) => {
                      const entry = selfInputEntries[`${lib.id}`]
                      const durationStr = entry?.startTime && entry?.endTime ? `${entry.startTime} - ${entry.endTime}` : '-'
                      const photoUrl = entry?.previewUrls?.[0] || null
                      return {
                        id: lib.id,
                        label: `${lib.activityCode} - ${lib.activityName}`,
                        unitNumber: entry?.equipmentNo || '-',
                        duration: durationStr,
                        points: lib.basePoints || 5,
                        remark: entry?.notes || '-',
                        photoUrl,
                      }
                    })
                  : initialSessionData?.sessionItems && initialSessionData.sessionItems.length > 0
                  ? initialSessionData.sessionItems.map((it: any) => ({
                      id: it.id,
                      label: it.label || it.snapshotLabel || '-',
                      unitNumber: it.unitNumber || '-',
                      duration: it.duration || (it.startedAt && it.endedAt ? `${it.startedAt} - ${it.endedAt}` : '-'),
                      points: it.points || it.actualPoints || 5,
                      remark: it.remark || '-',
                      photoUrl: it.photoUrl || it.photo?.url || it.photo?.dataUrl || it.photos?.[0]?.url || it.photos?.[0]?.dataUrl || null,
                    }))
                  : []

                const leaderName =
                  leaderOptions.find((l) => l.value === leaderEmployeeId)?.label?.split('—')[0]?.trim() ||
                  existingLeaderApproval?.approverName ||
                  'Leader Lapangan'
                const superiorName =
                  superiorOptions.find((s) => s.value === superiorEmployeeId)?.label?.split('—')[0]?.trim() ||
                  existingSuperiorApproval?.approverName ||
                  'Section Head'

                const totalPts = previewItemsList.reduce((s: number, i: any) => s + (i.points || 0), 0)
                const fallbackTeamMatch = (initialSessionData?.summaryRemark || initialSessionData?.notes || '').match(/\[Team:\s*([^\]]+)\]/i)
                const teamSummary = (isTeamLog && selectedMemberIds.length > 0)
                  ? teamMembers?.filter((m) => selectedMemberIds.includes(m.id)).map((m) => m.name).join(', ') || (fallbackTeamMatch ? fallbackTeamMatch[1].trim() : '')
                  : (fallbackTeamMatch ? fallbackTeamMatch[1].trim() : '')

                const isSplDoc = Boolean(initialSessionData?.splId || initialSessionData?.splNumber)
                const isSubmittedDoc = Boolean(
                  initialSessionData?.submittedAt ||
                  (initialSessionData?.status && !['draft'].includes(String(initialSessionData.status).toLowerCase()))
                )

                return (
                  <div
                    ref={pdfPreviewRef}
                    id="mobile-daily-activity-preview-sheet"
                    className="relative mx-auto shrink-0 bg-white shadow-lg border border-slate-300 rounded-sm origin-top transition-transform duration-100 w-[210mm] min-h-[297mm] will-change-transform"
                    style={{
                      backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                      backgroundSize: '100% 100%',
                      transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${0.44 * previewZoom})`,
                      marginBottom: `${-160 + (previewZoom - 1.0) * 125}mm`,
                    }}
                  >
                    <div
                      className="relative z-10 text-[8pt] sm:text-[8.5pt] font-sans leading-tight text-slate-900"
                      style={{
                        color: '#0f172a',
                        paddingTop: '38mm',
                        paddingBottom: '35mm',
                        paddingLeft: '20mm',
                        paddingRight: '20mm',
                        minHeight: '297mm',
                      }}
                    >
                      {/* Header Document */}
                      <div className="text-center mb-3">
                        <h1 className="font-bold text-[11pt] uppercase text-slate-900 leading-tight">
                          {isSplDoc ? 'SURAT PERINTAH LEMBUR (SPL)' : 'LAPORAN AKTIVITAS HARIAN (DAR)'}
                        </h1>
                        <p className="font-semibold text-[8pt] text-slate-700 uppercase tracking-wide">
                          {isSplDoc ? 'PT CHITRA PARATAMA • HUMAN CAPITAL' : 'PT CHITRA PARATAMA • OPERATION & SERVICES'}
                        </p>
                      </div>

                      {/* Section 1: Details & Request Profile (4 columns table matching SPL format) */}
                      <table className="w-full border-collapse border border-slate-400 mb-3 [&_td]:border [&_td]:border-slate-400 [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-slate-400 [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                        <tbody>
                          <tr>
                            <td colSpan={4} className="font-bold bg-slate-100 text-slate-900 py-0.5">Details &amp; Request Profile</td>
                          </tr>
                          <tr>
                            <td className="w-1/4 font-bold bg-slate-100 text-slate-900">Kode Sesi / Dokumen</td>
                            <td className="w-1/4 font-mono font-semibold text-slate-900">{initialSessionData?.sessionCode || (initialSessionData?.id ? 'ACT-DRAFT-REVISI' : 'ACT-DRAFT')}</td>
                            <td className="w-1/4 font-bold bg-slate-100 text-slate-900">Tanggal Kerja</td>
                            <td className="w-1/4 font-semibold text-slate-900">{workDate ? fmtDate(workDate) : '—'}</td>
                          </tr>
                          <tr>
                            <td className="font-bold bg-slate-100 text-slate-900">Status / Shift</td>
                            <td className="capitalize font-semibold text-slate-900">{initialSessionData?.status || 'Draft'} • Shift {shiftCode || 'ALL'}</td>
                            <td className="font-bold bg-slate-100 text-slate-900">Customer / Site</td>
                            <td className="text-slate-900 font-semibold">{customerName || site?.customerName || initialSessionData?.customerName || 'Default Customer'} ({site?.name || initialSessionData?.site?.name || '—'})</td>
                          </tr>
                          <tr>
                            <td className="font-bold bg-slate-100 text-slate-900">Nama Pemohon</td>
                            <td className="text-slate-900 font-semibold">{employee?.name || initialSessionData?.employee?.name || '—'} (SN: {employee?.employeeSn || (initialSessionData?.employee as any)?.sn || employeeId || '—'})</td>
                            <td className="font-bold bg-slate-100 text-slate-900">Dept / Section</td>
                            <td className="text-slate-900">{[employee?.department || initialSessionData?.employee?.department, employee?.section || initialSessionData?.employee?.section].filter(Boolean).join(' / ') || 'Central Services'}</td>
                          </tr>
                          {teamSummary ? (
                            <tr>
                              <td className="font-bold bg-slate-100 text-slate-900">Anggota Tim</td>
                              <td colSpan={3} className="text-slate-900 font-normal">{teamSummary}</td>
                            </tr>
                          ) : null}
                          {notes ? (
                            <tr>
                              <td className="font-bold bg-slate-100 text-slate-900">Catatan Aktivitas</td>
                              <td colSpan={3} className="text-slate-900">{notes}</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>

                      {/* Section A: Daily Activity Items */}
                      <div className="font-bold mb-1 text-[8pt] text-slate-900">
                        A. Daily Activity Items ({previewItemsList.length} Item • Total {totalPts} Poin)
                      </div>
                      <table className="w-full border-collapse border border-slate-400 mb-3 [&_td]:border [&_td]:border-slate-400 [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-slate-400 [&_th]:px-1.5 [&_th]:py-1 text-[7.5pt] sm:text-[8pt]">
                        <thead>
                          <tr className="bg-slate-100 text-center font-bold text-slate-900">
                            <th className="w-[6%]">#</th>
                            <th className="text-left w-[42%]">Aktivitas</th>
                            <th className="w-[14%]">Unit</th>
                            <th className="w-[14%]">Durasi</th>
                            <th className="w-[10%]">Poin</th>
                            <th className="text-left w-[14%]">Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewItemsList.length > 0 ? (
                            previewItemsList.map((item: any, idx: number) => (
                              <tr key={item.id || idx}>
                                <td className="text-center font-mono">{idx + 1}</td>
                                <td className="text-left font-medium text-slate-900">{item.label}</td>
                                <td className="text-center font-mono text-slate-900">{item.unitNumber || '—'}</td>
                                <td className="text-center font-mono text-slate-900">{item.duration}</td>
                                <td className="text-center font-bold font-mono text-slate-900">{item.points || 0} pts</td>
                                <td className="text-left text-[7pt] text-slate-600">{item.remark || '—'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center text-slate-400 py-2 italic">Belum ada item aktivitas.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Section B: Approval Steps (2 Tahap: Pemohon -> Leader / PJO) */}
                      <div className="font-bold mb-1 text-[8pt] text-slate-900">
                        B. Approval Steps
                      </div>
                      <table className="w-full border-collapse border border-slate-400 mb-3 [&_td]:border [&_td]:border-slate-400 [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-slate-400 [&_th]:px-1.5 [&_th]:py-1 text-center text-[7.5pt] sm:text-[8pt]" style={{ tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <th style={{ width: '6%' }}>#</th>
                            <th className="text-left" style={{ width: '20%' }}>Tahap</th>
                            <th className="text-left" style={{ width: '22%' }}>Approver</th>
                            <th style={{ width: '14%' }}>Status</th>
                            <th style={{ width: '16%' }}>Waktu</th>
                            <th className="text-left" style={{ width: '22%' }}>Catatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* 1. Pemohon / Karyawan */}
                          <tr>
                            <td>1</td>
                            <td className="text-left">Karyawan Sign</td>
                            <td className="text-left font-semibold">{employee?.name || initialSessionData?.employee?.name || '—'}</td>
                            <td className={cn("capitalize font-bold", isSubmittedDoc ? "text-emerald-700" : "text-slate-500")}>
                              {isSubmittedDoc ? "Approved" : "Draft"}
                            </td>
                            <td className="text-[7pt] font-mono">{initialSessionData?.submittedAt ? fmtDt(initialSessionData.submittedAt) : '—'}</td>
                            <td className="text-left italic text-slate-500 text-[7pt]">—</td>
                          </tr>
                          {/* 2. Leader / Supervisor / PJO */}
                          <tr className={existingLeaderApproval?.status === 'reverted' ? 'bg-amber-50/70' : undefined}>
                            <td>2</td>
                            <td className="text-left">Leader / PJO</td>
                            <td className="text-left font-semibold">{leaderName || '—'}</td>
                            <td className={cn("capitalize font-bold", existingLeaderApproval?.status === 'approved' || existingLeaderApproval?.status === 'signed' ? "text-emerald-700" : existingLeaderApproval?.status === 'reverted' ? "text-amber-700" : "text-slate-600")}>
                              {existingLeaderApproval?.status === 'reverted' ? 'Reverted' : existingLeaderApproval?.status === 'approved' || existingLeaderApproval?.status === 'signed' ? 'Approved' : 'Waiting'}
                            </td>
                            <td className="text-[7pt] font-mono">{existingLeaderApproval?.signedAt ? fmtDt(existingLeaderApproval.signedAt) : '—'}</td>
                            <td className="text-left italic text-slate-600 text-[7pt] break-words whitespace-normal leading-tight font-medium" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              {existingLeaderApproval?.remarks || '—'}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Section C: Signatories (3 Kolom: Employee, Leader / PJO, Customer) */}
                      <div className="font-bold mb-2 text-[8pt] text-slate-900">Signatories</div>
                      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                        {/* 1. Pemohon / Serviceman */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-[7pt] text-slate-500 font-semibold mb-1">Employee Signature</div>
                          <div className="h-14 w-full flex items-center justify-center my-1">
                            {isSubmittedDoc && ((employee as any)?.signatureDataUrl || (initialSessionData?.employee as any)?.signatureDataUrl) ? (
                              <img
                                src={(employee as any)?.signatureDataUrl || (initialSessionData?.employee as any)?.signatureDataUrl}
                                alt="TTD Pemohon"
                                className="max-h-12 max-w-full object-contain"
                              />
                            ) : isSubmittedDoc ? (
                              <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-[6.5pt] font-bold text-emerald-600">✓ Digitally Signed</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[7pt]">(Draft)</span>
                            )}
                          </div>
                          <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                            {employee?.name || initialSessionData?.employee?.name || '—'}
                          </div>
                          <div className="text-[7pt] text-slate-600 font-medium">{employee?.jobTitle || initialSessionData?.employee?.jobTitle || 'Serviceman / Pemohon'}</div>
                          <div className="text-[6.5pt] text-slate-400 mt-0.5">
                            {initialSessionData?.submittedAt ? `Waktu Pengajuan: ${fmtDt(initialSessionData.submittedAt)}` : 'Waktu Pengajuan: —'}
                          </div>
                        </div>

                        {/* 2. Leader / Supervisor / PJO */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-[7pt] text-slate-500 font-semibold mb-1">Leader / PJO Signature</div>
                          <div className="h-14 w-full flex items-center justify-center my-1">
                            {existingLeaderApproval?.signatureDataUrl ? (
                              <img
                                src={existingLeaderApproval.signatureDataUrl}
                                alt="TTD Leader"
                                className="max-h-12 max-w-full object-contain"
                              />
                            ) : existingLeaderApproval?.status === 'approved' || existingLeaderApproval?.status === 'signed' ? (
                              <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved</span>
                              </div>
                            ) : existingLeaderApproval?.status === 'reverted' ? (
                              <span className="text-amber-600 font-semibold italic text-[7pt]">(Dikembalikan)</span>
                            ) : (
                              <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                            )}
                          </div>
                          <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                            {leaderName || '—'}
                          </div>
                          <div className="text-[7pt] text-slate-600 font-medium">Leader / PJO</div>
                          <div className="text-[6.5pt] text-slate-400 mt-0.5">
                            {existingLeaderApproval?.signedAt ? `Waktu TTD: ${fmtDt(existingLeaderApproval.signedAt)}` : '—'}
                          </div>
                        </div>

                        {/* 3. Customer (Manual / Fisik) */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-[7pt] text-slate-500 font-semibold mb-1">Customer Signature</div>
                          <div className="h-14 w-full flex items-center justify-center my-1">
                            <span className="text-slate-400 italic text-[7pt]"></span>
                          </div>
                          <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                            &nbsp;
                          </div>
                          <div className="text-[7pt] text-slate-600 font-medium">Customer</div>
                        </div>
                      </div>

                      {/* Evidence QR in Bottom Right Corner (Clickable to open floating modal) */}
                      <div
                        onClick={() => setIsEvidenceModalOpen(true)}
                        className="absolute right-[20mm] bottom-[18mm] flex flex-col items-center text-center cursor-pointer group select-none transition-transform hover:scale-105 active:scale-95"
                        title="Klik untuk membuka galeri foto bukti pekerjaan"
                      >
                        <div className="p-1 bg-white border border-slate-300 rounded shadow-2xs group-hover:border-indigo-500 group-hover:shadow-md transition-all">
                          {evidenceQrDataUrl ? (
                            <img src={evidenceQrDataUrl} alt="QR Evidence" className="h-14 w-14 object-contain" />
                          ) : (
                            <div className="h-14 w-14 flex items-center justify-center text-[6pt] text-slate-400 border border-dashed border-slate-200">
                              QR Code
                            </div>
                          )}
                        </div>
                        <div className="text-[6.5pt] font-bold text-slate-700 mt-0.5 group-hover:text-indigo-600 transition-colors">Scan / Klik Bukti Kerja</div>
                        <div className="text-[6pt] text-gray-400 mt-0.5">PT Chitra Paratama • HERO Platform</div>
                      </div>

                      <div className="text-right text-[7pt] text-slate-500 mt-2 font-mono">
                        {isSplDoc ? 'F.HC.SPL.001.01 • PT Chitra Paratama' : 'F.OP.DAR.001.01 • PT Chitra Paratama'}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating Evidence Modal */}
        <DailyActivityEvidenceModal
          isOpen={isEvidenceModalOpen}
          onClose={() => setIsEvidenceModalOpen(false)}
          sessionId={initialSessionData?.sessionId || initialSessionData?.id || revisionSessionId}
        />
      </form>
    </>
  )
}
