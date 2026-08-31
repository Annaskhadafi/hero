'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Camera,
  Check,
  ChevronDown,
  ImagePlus,
  ListFilter,
  Navigation,
  Save,
  Search,
  SendHorizontal,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  assignments: AssignmentOption[]
  availableLibrary: LibraryOption[]
  defaultStartTime: string
  defaultEndTime: string
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
    name?: string | null
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
  restored?: QueuedFilePayload | null
) {
  const selectedFiles = files?.length ? files : fallbackFile ? [fallbackFile] : []
  if (selectedFiles.length > 0) {
    // ponytail: failed submissions may leave orphaned evidence; add cleanup when storage growth warrants it.
    return { payloads: [], urls: await Promise.all(selectedFiles.map(uploadActivityPhoto)) }
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

export function MobileDailyActivityForm({
  employeeId,
  assignments,
  availableLibrary,
  defaultStartTime,
  defaultEndTime,
  availableRouteFolders,
  routeChecklist,
  standaloneOvertimeChecklist,
  site,
  teamMembers = [],
}: MobileDailyActivityFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queuedDraftKey = searchParams.get('draft')?.trim() || ''

  const [sourceMode, setSourceMode] = useState<'assigned' | 'self_input' | 'custom'>('self_input')
  const [assignmentId, setAssignmentId] = useState('')
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([])
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [selfInputEntries, setSelfInputEntries] = useState<Record<string, SelfInputEntryState>>({})
  const [customActivityName, setCustomActivityName] = useState('')
  const [customActivityDescription, setCustomActivityDescription] = useState('')
  const [equipmentNo, setEquipmentNo] = useState('')
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [materialUsed, setMaterialUsed] = useState('')
  const [notes, setNotes] = useState('')
  const [manualLocation, setManualLocation] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoName, setPhotoName] = useState('')
  const [restoredPhotoPayload, setRestoredPhotoPayload] = useState<QueuedFilePayload | null>(null)
  const [photoCaptureMode, setPhotoCaptureMode] = useState<'camera' | 'gallery'>('gallery')
  const [activePhotoTarget, setActivePhotoTarget] = useState<string | null>(null)
  const [geo, setGeo] = useState<GeoState>(initialGeo)
  const [submitState, setSubmitState] = useState<{
    kind: 'idle' | 'success' | 'error'
    message: string
  }>({ kind: 'idle', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [routeItemState, setRouteItemState] = useState<Record<number, RouteItemState>>({})

  const [isTeamLog, setIsTeamLog] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)

  const filteredTeamMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return teamMembers
    return teamMembers.filter((m) => m.name.toLowerCase().includes(q))
  }, [teamMembers, memberSearch])

  const availableLibraryMap = useMemo(
    () => new Map(availableLibrary.map((item) => [`${item.id}`, item])),
    [availableLibrary]
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
      return availableLibrary
    }

    return availableLibrary.filter((item) =>
      normalizeSearch(`${item.activityCode} ${item.activityName} ${item.basePoints}`).includes(
        normalizedSearch
      )
    )
  }, [availableLibrary, librarySearch])
  const needsGlobalPhoto = selectedLibraries.some((item) => item.requiresPhoto)
  const selectedAssignment = useMemo(
    () => assignments.find((item) => `${item.id}` === assignmentId) ?? null,
    [assignmentId, assignments]
  )
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
            requiresTireCount: item.requiresTireCount,
            requiresMaterialUsed: item.requiresMaterialUsed,
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
          requiresTireCount: item.requiresTireCount,
          requiresMaterialUsed: item.requiresMaterialUsed,
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
    currentPhotoName?: string
  ) => (
    <div className="mt-3 space-y-2 rounded-xl border border-[#e9f6fd] bg-[#f6fbff] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
          <Camera className="size-3.5 text-[#003f78]" />
          Photo Evidence
        </p>
        {requiresPhoto ? (
          <Badge className="border-0 bg-[#fff1cf] px-1.5 py-0 text-[9px] font-black tracking-[0.14em] text-[#8a5a00] uppercase">
            Wajib
          </Badge>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-0 bg-[#e9f6fd] text-xs text-[#003f78]"
          onClick={() => {
            setActivePhotoTarget(targetId)
            setPhotoCaptureMode('camera')
            document.getElementById('mobile-activity-photo')?.click()
          }}
        >
          <Camera className="size-3.5" />
          Kamera
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-0 bg-[#e9f6fd] text-xs text-[#003f78]"
          onClick={() => {
            setActivePhotoTarget(targetId)
            setPhotoCaptureMode('gallery')
            document.getElementById('mobile-activity-photo')?.click()
          }}
        >
          <ImagePlus className="size-3.5" />
          Galeri
        </Button>
      </div>
      {currentPhotoName ? (
        <p className="truncate text-[11px] font-semibold break-words text-[#003f78]">
          ✓ {currentPhotoName}
        </p>
      ) : null}
    </div>
  )

  const needsAnyPhoto = needsGlobalPhoto || assignmentNeedsPhoto || checkedChecklistNeedsPhoto

  const selfInputNeedsGps = selectedLibraries.some((item) => item.requiresLocationGps)
  const assignmentNeedsGps = Boolean((selectedAssignment as any)?.requiresLocationGps)
  const checkedChecklistNeedsGps = checklistContext?.groups.some((group) =>
    group.items.some((item) => routeItemState[item.id]?.isChecked && Boolean(item.requiresLocationGps))
  ) ?? false
  const needsGps = selfInputNeedsGps || assignmentNeedsGps || checkedChecklistNeedsGps

  useEffect(() => {
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
  }, [checklistContext, defaultEndTime, defaultStartTime, queuedDraftKey])

  useEffect(() => {
    if (!checklistContext) {
      setRouteItemState({})
      return
    }

    setRouteItemState((current) => {
      if (Object.keys(current || {}).length > 0) {
        return current
      }

      return Object.fromEntries(
        checklistContext.groups.flatMap((group) =>
          group.items.map((item) => [
            item.id,
            {
              isChecked: item.isChecked,
              unitNumber: item.unitNumber,
              remark: item.remark,
              startedAt: toDateTimeLocalValue(item.startedAt),
              endedAt: toDateTimeLocalValue(item.endedAt),
              actualPoints: `${item.actualPoints || item.pointOverride || item.libraryPoints || 0}`,
            },
          ])
        )
      ) as Record<number, RouteItemState>
    })
  }, [checklistContext])

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
    routeTemplateId: checklistContext?.routeTemplateId ? `${checklistContext.routeTemplateId}` : '',
    overtimeCommandLetterId: checklistContext?.overtimeCommandLetterId
      ? `${checklistContext.overtimeCommandLetterId}`
      : '',
    routeShiftCode: checklistContext?.shiftCode ?? '',
    routeSummaryRemark: '',
    routeSessionItems,
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
    if (
      checklistContext?.overtimeCommandLetterId &&
      startTime.slice(0, 10) !== defaultStartTime.slice(0, 10)
    ) {
      return 'Tanggal aktivitas tidak sesuai dengan jadwal SPL.'
    }

    if (
      checklistContext &&
      routeSessionItems.length > 0 &&
      routeSessionItems.every((item) => !item.isChecked)
    ) {
      return checklistContext.kind === 'spl'
        ? 'Centang minimal satu item checklist SPL.'
        : 'Centang minimal satu item checklist route.'
    }

    if (sourceMode === 'assigned') {
      if (!assignmentId) {
        return 'Pilih assignment dulu.'
      }

      if (!startTime || !endTime) {
        return 'Waktu mulai dan selesai wajib diisi.'
      }

      if (new Date(endTime) <= new Date(startTime)) {
        return 'Waktu selesai harus setelah waktu mulai.'
      }

      if (selectedAssignment?.requiresPhoto && !photoFile && !restoredPhotoPayload) {
        return 'Foto wajib diupload karena assignment yang dipilih butuh image evidence.'
      }
      if (checklistContext) {
        let missingChecklistPhoto = false
        checklistContext.groups.forEach((group) =>
          group.items.forEach((item) => {
            const state = routeItemState[item.id]
            if (
              state?.isChecked &&
              item.requiresPhoto &&
              !state?.photoFile &&
              !state?.restoredPhotoPayload
            )
              missingChecklistPhoto = true
          })
        )
        if (missingChecklistPhoto)
          return 'Foto wajib diupload karena checklist yang dipilih butuh image evidence.'
      }

      return ''
    }

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

      if (checklistContext) {
        let missingChecklistPhoto = false
        checklistContext.groups.forEach((group) =>
          group.items.forEach((item) => {
            const state = routeItemState[item.id]
            if (
              state?.isChecked &&
              item.requiresPhoto &&
              !state?.photoFile &&
              !state?.restoredPhotoPayload
            )
              missingChecklistPhoto = true
          })
        )
        if (missingChecklistPhoto)
          return 'Foto wajib diupload karena checklist yang dipilih butuh image evidence.'
      }

      return ''
    }

    if (selectedLibraries.length === 0 && !hasCheckedChecklist) {
      return 'Pilih minimal satu activity library.'
    }

    let missingLibraryPhoto = false
    selectedLibraries.forEach((lib) => {
      const entry = selfInputEntries[`${lib.id}`]
      if (lib.requiresPhoto && !entry?.photoFile && !entry?.restoredPhotoPayload)
        missingLibraryPhoto = true
    })
    if (missingLibraryPhoto)
      return 'Foto wajib diupload karena activity yang dipilih butuh image evidence.'

    if (checklistContext) {
      let missingChecklistPhoto = false
      let missingChecklistTire = false
      let missingChecklistMaterial = false
      checklistContext.groups.forEach((group) =>
        group.items.forEach((item) => {
          const state = routeItemState[item.id]
          if (
            state?.isChecked &&
            item.requiresPhoto &&
            !state?.photoFile &&
            !state?.restoredPhotoPayload
          )
            missingChecklistPhoto = true

          if (
            state?.isChecked &&
            item.requiresTireCount &&
            (!state?.tireCount || state?.tireCount <= 0)
          )
            missingChecklistTire = true

          if (
            state?.isChecked &&
            item.requiresMaterialUsed &&
            !state?.materialUsed?.trim()
          )
            missingChecklistMaterial = true
        })
      )
      if (missingChecklistPhoto)
        return 'Foto wajib diupload karena checklist yang dipilih butuh image evidence.'
      if (missingChecklistTire)
        return 'Jumlah tire wajib diisi untuk item checklist yang dipilih.'
      if (missingChecklistMaterial)
        return 'Material / tools wajib diisi untuk item checklist yang dipilih.'
    }

    const ranges: Array<{ code: string; start: Date; end: Date }> = []

    for (const [index, library] of selectedLibraries.entries()) {
      const libraryId = `${library.id}`
      const entry =
        selfInputEntries[libraryId] ??
        buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)

      if (library.requiresEquipmentNo && !entry.equipmentNo.trim()) {
        return `${library.activityCode} wajib isi nomor equipment / unit.`
      }

      if (library.requiresMaterialUsed && !entry.materialUsed.trim()) {
        return `${library.activityCode} wajib isi material / tools.`
      }

      if (library.requiresTireCount && (!entry.tireCount || entry.tireCount <= 0)) {
        return `${library.activityCode} wajib isi jumlah tire yang dikerjakan.`
      }

      if (!entry.startTime || !entry.endTime) {
        return `${library.activityCode} wajib isi waktu mulai dan selesai.`
      }

      const start = new Date(entry.startTime)
      const end = new Date(entry.endTime)

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return `${library.activityCode} punya format waktu tidak valid.`
      }

      if (end <= start) {
        return `${library.activityCode} punya waktu selesai lebih kecil dari mulai.`
      }

      ranges.push({ code: library.activityCode, start, end })
    }

    const sortedRanges = [...ranges].sort(
      (left, right) => left.start.getTime() - right.start.getTime()
    )
    for (let index = 1; index < sortedRanges.length; index += 1) {
      const previous = sortedRanges[index - 1]
      const current = sortedRanges[index]

      if (current.start < previous.end) {
        return `Waktu ${current.code} bentrok dengan ${previous.code}.`
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

    const result = (await response.json()) as {
      success: boolean
      message?: string
      conflict?: boolean
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
        checkedState?.restoredPhotoPayload
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
        const entryEvidence = await prepareEvidence(
          entry.photoFiles,
          entry.photoFile,
          entry.restoredPhotoPayload
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
            routeTemplateId: index === 0 ? draftPayload.routeTemplateId : '',
            overtimeCommandLetterId: index === 0 ? draftPayload.overtimeCommandLetterId : '',
            routeShiftCode: index === 0 ? draftPayload.routeShiftCode : '',
            routeSummaryRemark: '',
            routeSessionItems: index === 0 ? routeSessionItems : [],
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
      return
    }

    setIsSubmitting(true)
    try {
      if (sourceMode === 'self_input') {
        const payloads = await buildSelfInputPayloads()

        for (const item of payloads) {
          try {
            await sendPayload(item.payload)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Submit activity gagal.'
            throw new Error(`Gagal kirim ${item.label}. ${message}`)
          }
        }

        setSubmitState({
          kind: 'success',
          message: `${payloads.length} activity library berhasil dikirim.`,
        })
      } else {
        const sharedEvidence = await prepareEvidence(photoFiles, photoFile, restoredPhotoPayload)
        const payloadToSubmit = {
          ...draftPayload,
          photo: sharedEvidence.payloads[0] ?? null,
          photos: sharedEvidence.payloads,
          photoUrls: sharedEvidence.urls,
          libraryActivityId: '',
        }

        if (checklistContext && payloadToSubmit.routeSessionItems) {
          const checklistEvidence = await Promise.all(
            payloadToSubmit.routeSessionItems.map((item) => {
              const state = routeItemState[item.routeItemId!]
              return prepareEvidence(
                state?.photoFiles,
                state?.photoFile,
                state?.restoredPhotoPayload
              )
            })
          )
          payloadToSubmit.photos = [
            ...sharedEvidence.payloads,
            ...checklistEvidence.flatMap((item) => item.payloads),
          ]
          payloadToSubmit.photoUrls = [
            ...sharedEvidence.urls,
            ...checklistEvidence.flatMap((item) => item.urls),
          ]
          payloadToSubmit.photo = payloadToSubmit.photos[0] ?? null
        }

        await sendPayload(payloadToSubmit)

        setSubmitState({
          kind: 'success',
          message: 'Activity berhasil dikirim ke Daily Activity System.',
        })
      }

      clearDraft(ACTIVITY_DRAFT_STORAGE_KEY)
      if (queuedDraftKey) {
        clearDraft(queuedDraftKey)
      }

      window.setTimeout(() => {
        router.push(
          `/mobile/activity?submitted=1${checklistContext?.overtimeCommandLetterId ? '&spl=1' : ''}`
        )
        router.refresh()
      }, 1200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submit activity gagal.'
      setSubmitState({ kind: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={libraryPickerOpen} onOpenChange={setLibraryPickerOpen}>
        <DialogContent className="max-h-[calc(100vh-1rem)] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-[1.6rem] border-0 bg-white p-0 shadow-[0_28px_80px_rgba(8,32,51,0.22)] sm:max-w-xl">
          <DialogHeader className="bg-[linear-gradient(135deg,rgba(0,52,97,0.96),rgba(0,75,135,0.92))] px-5 py-5 text-left text-white">
            <DialogTitle className="text-xl font-black">Pilih Kamus Aktivitas</DialogTitle>
            <DialogDescription className="text-white/80"></DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-[1.05rem] bg-[#e9f6fd] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
              <div className="flex items-center gap-3">
                <Search className="size-4 text-[#486275]" />
                <input
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Cari kode atau nama activity..."
                  className="w-full bg-transparent text-sm font-semibold text-[#082033] outline-none placeholder:text-[#6c8799]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[1rem] bg-[#f6fbff] px-4 py-3 text-xs font-semibold text-[#486275]">
              <span>{filteredLibraries.length} library tampil</span>
              <span>{selectedLibraryIds.length} dipilih</span>
            </div>

            <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {availableRouteFolders && availableRouteFolders.length > 0 ? (
                <RouteFolderTree
                  routeFolders={availableRouteFolders}
                  availableLibraryMap={availableLibraryMap}
                  selectedLibraryIds={selectedLibraryIds}
                  toggleLibrarySelection={toggleLibrarySelection}
                  toggleGroupSelection={toggleGroupSelection}
                  librarySearch={librarySearch}
                />
              ) : filteredLibraries.length > 0 ? (
                filteredLibraries.map((item) => {
                  const isSelected = selectedLibraryIds.includes(`${item.id}`)
                  const requirementBadges = [
                    item.isGroupActivity ? 'Group' : null,
                    item.requiresEquipmentNo ? 'Equipment' : null,
                    item.requiresDuration ? 'Duration' : null,
                    item.requiresMaterialUsed ? 'Material' : null,
                    item.requiresPhoto ? 'Photo' : null,
                  ].filter(Boolean)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleLibrarySelection(`${item.id}`)}
                      className={
                        isSelected
                          ? 'w-full rounded-[1rem] bg-[#003f78] px-4 py-4 text-left text-white shadow-[0_16px_30px_rgba(0,63,120,0.18)]'
                          : 'w-full rounded-[1rem] bg-[#f6fbff] px-4 py-4 text-left text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)]'
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black">{item.activityCode}</p>
                          <p className="mt-1 text-sm leading-5 font-semibold">
                            {item.activityName}
                          </p>
                          <p
                            className={
                              isSelected
                                ? 'mt-1 text-xs text-white/80'
                                : 'mt-1 text-xs text-[#486275]'
                            }
                          >
                            {item.basePoints} pts • max {item.maxPointsPerDay} pts / hari
                          </p>
                          {requirementBadges.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {requirementBadges.map((badge) => (
                                <span
                                  key={badge}
                                  className={
                                    isSelected
                                      ? 'rounded-full bg-white/16 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-white uppercase'
                                      : 'rounded-full bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-[#003f78] uppercase'
                                  }
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <span
                          className={
                            isSelected
                              ? 'flex size-8 items-center justify-center rounded-full bg-white text-[#003f78]'
                              : 'flex size-8 items-center justify-center rounded-full bg-white text-[#9eb6c5]'
                          }
                        >
                          {isSelected ? (
                            <Check className="size-4" />
                          ) : (
                            <ListFilter className="size-4" />
                          )}
                        </span>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="rounded-[1rem] bg-[#f6fbff] px-4 py-8 text-center text-sm font-semibold text-[#486275]">
                  Tidak ada activity library yang cocok dengan search.
                </div>
              )}
            </div>

            <Button
              type="button"
              className="h-12 w-full rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)]"
              onClick={() => setLibraryPickerOpen(false)}
            >
              Pakai {selectedLibraryIds.length} Activity
            </Button>
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
                  ? renderPhotoWidget('single', !!selectedAssignment.requiresPhoto, photoName)
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
                    <p className="mt-1 text-xs leading-5 font-semibold text-[#486275]"></p>
                  </div>
                  <Badge className="border-0 bg-[#eaf4fb] text-[10px] font-black tracking-[0.12em] text-[#003f78] uppercase">
                    {selectedLibraryIds.length} dipilih
                  </Badge>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-between rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                  onClick={() => setLibraryPickerOpen(true)}
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
                {renderPhotoWidget('single', false, photoName)}
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
                        {library.requiresEquipmentNo ? (
                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Equipment / unit no.
                            </span>
                            <Input
                              value={entry.equipmentNo}
                              onChange={(event) =>
                                updateSelfInputEntry(libraryId, { equipmentNo: event.target.value })
                              }
                              placeholder="Unit / equipment number"
                              className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
                            />
                          </Label>
                        ) : null}

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
                          entry.photoName
                        )}
                        <Label className="block space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Catatan item
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
                            placeholder="Hasil kerja, temuan, atau catatan singkat."
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
                              {item.requiresUnit ? (
                                <Label className="block space-y-2">
                                  <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                                    Unit
                                  </span>
                                  <Input
                                    value={itemState.unitNumber}
                                    onChange={(event) =>
                                      updateRouteItem(item.id, { unitNumber: event.target.value })
                                    }
                                    placeholder="Unit number"
                                    className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                                  />
                                </Label>
                              ) : null}

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
                                itemState.photoName
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
                      setNotes((prev) => (prev ? prev + ' ' + text : text))
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
            className="h-14 rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)]"
            disabled={isSubmitting}
          >
            <SendHorizontal className="size-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Activity'}
          </Button>
        </div>
        <input
          id="mobile-activity-photo"
          type="file"
          accept="image/*"
          multiple
          capture={photoCaptureMode === 'camera' ? 'environment' : undefined}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            const file = files[0] ?? null
            if (!file || !activePhotoTarget) return
            const names = files.map((item) => item.name).join(', ')

            if (activePhotoTarget === 'single') {
              setPhotoFile(file)
              setPhotoFiles(files)
              setPhotoName(names)
              setRestoredPhotoPayload(null)
            } else if (activePhotoTarget.startsWith('route:')) {
              const id = parseInt(activePhotoTarget.split(':')[1], 10)
              setRouteItemState((prev) => ({
                ...prev,
                [id]: {
                  ...prev[id],
                  photoFile: file,
                  photoFiles: files,
                  photoName: names,
                  restoredPhotoPayload: null,
                },
              }))
            } else if (activePhotoTarget.startsWith('library:')) {
              const id = activePhotoTarget.split(':')[1]
              setSelfInputEntries((prev) => ({
                ...prev,
                [id]: {
                  ...prev[id],
                  photoFile: file,
                  photoFiles: files,
                  photoName: names,
                  restoredPhotoPayload: null,
                },
              }))
            }
          }}
        />
      </form>
    </>
  )
}
