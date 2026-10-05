'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSignature,
  FileText,
  ImagePlus,
  Layers,
  ListFilter,
  Loader2,
  Navigation,
  Plus,
  RotateCcw,
  Save,
  Search,
  SendHorizontal,
  Trash2,
  Truck,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createDailyActivitySessionAction,
  deleteServerActivityDraftAction,
  getDailyActivityApproverCandidatesAction,
  resubmitDailyActivityApprovalFormAction,
  saveActivityDraftToServerAction,
} from '@/app/dashboard/activity-hub/actions'
import { uploadFile } from '@/app/actions/upload'
import { downloadElementAsPdf } from '@/lib/pdf-download'
import { MobileSignatureSection } from '@/components/mobile/mobile-signature-section'
import { DailyActivityEvidenceModal } from '@/components/daily-activity-evidence-modal'
import { cn } from '@/lib/utils'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { compressImageFile, compressImageFiles } from '@/lib/client-image-compression'

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
  ACTIVITY_DRAFTS_CHANGED_EVENT,
  createActivityDraftKey,
  readDraft,
  removeActivityDraft,
  saveActivityDraftIndexEntry,
  writeDraft,
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
  isSelfInput?: boolean
  isAssignable?: boolean
  approvalRequired?: boolean
  autoApproveIfGpsValid?: boolean
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
    headEmployeeId?: number | null
  } | null
  teamMembers?: Array<{
    id: number
    name: string
    employeeSn?: string | null
    role: string
    department: string
    siteId?: number | null
    siteName?: string | null
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
  onOpenDraftTab?: () => void
  initialDraftKey?: string
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
  queuedPhotoPayloads?: QueuedFilePayload[]
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
  queuedPhotoPayloads?: QueuedFilePayload[]
}

const emptyRouteItemState: RouteItemState = {
  isChecked: false,
  unitNumber: '',
  remark: '',
  startedAt: '',
  endedAt: '',
  actualPoints: '0',
  tireCount: 0,
}

const initialGeo: GeoState = {
  latitude: '',
  longitude: '',
  accuracy: '',
  locationName: '',
  message: 'GPS standby',
}

async function uploadActivityPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Evidence harus berupa gambar.')

  const compressed = await compressImageFile(file, { maxWidthOrHeight: 1280, quality: 0.75 })
  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('uploadTarget', 'activity-photos')

  const result = await uploadFile(formData)
  if (!result.success || !result.url) {
    throw new Error(result.error || `Gagal upload evidence ${file.name}.`)
  }

  return result.readableUrl || result.url
}

async function fileToQueuedPhoto(file: File): Promise<QueuedFilePayload> {
  if (!file.type.startsWith('image/')) throw new Error('Evidence harus berupa gambar.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5MB.')
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Gagal membaca foto untuk draft.'))
    reader.readAsDataURL(file)
  })
  return { name: file.name, type: file.type, size: file.size, dataUrl }
}

function queuedPhotoToFile(payload: QueuedFilePayload): File {
  const match = payload.dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) throw new Error('Payload foto draft tidak valid.')
  const binary = atob(match[2])
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new File([bytes], payload.name, { type: payload.type || match[1] })
}

async function prepareEvidence(
  files: File[] | undefined,
  fallbackFile?: File | null,
  restored?: QueuedFilePayload | null,
  existingPreviewUrls?: string[]
) {
  const selectedFiles = files?.length ? files : fallbackFile ? [fallbackFile] : []
  if (selectedFiles.length > 0) {
    return { payloads: [], urls: await Promise.all(selectedFiles.map(uploadActivityPhoto)) }
  }
  if (restored) {
    return { payloads: [], urls: [await uploadActivityPhoto(queuedPhotoToFile(restored))] }
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function processPhotosForDraft(
  files: File[] | undefined,
  fallbackFile: File | null | undefined,
  existingPreviewUrls: string[] | undefined,
  restored: QueuedFilePayload | null | undefined
): Promise<{ urls: string[]; payloads: QueuedFilePayload[]; photoName: string }> {
  const resultUrls: string[] = []
  const resultPayloads: QueuedFilePayload[] = []

  // 1. Keep existing valid URLs (server uploads or permanent links, resolve to persistent proxy path)
  if (existingPreviewUrls && existingPreviewUrls.length > 0) {
    for (const url of existingPreviewUrls) {
      if (
        typeof url === 'string' &&
        !url.startsWith('blob:') &&
        (url.startsWith('/api/') || url.startsWith('http') || url.startsWith('data:image/'))
      ) {
        resultUrls.push(url)
      }
    }
  }

  // 2. Upload new files if possible, or convert to compressed base64 dataUrl as offline fallback
  const selectedFiles = files?.length ? files : fallbackFile ? [fallbackFile] : []
  for (const file of selectedFiles) {
    try {
      const uploadedUrl = await uploadActivityPhoto(file)
      if (uploadedUrl) {
        resultUrls.push(uploadedUrl)
      }
    } catch (uploadErr) {
      console.warn('[processPhotosForDraft] Photo upload to server failed, falling back to local compressed base64:', uploadErr)
      try {
        const compressedOffline = await compressImageFile(file, { maxDimension: 640, quality: 0.6 })
        const dataUrl = await fileToDataUrl(compressedOffline)
        resultPayloads.push({
          name: file.name,
          type: 'image/jpeg',
          size: compressedOffline.size,
          dataUrl,
        })
        resultUrls.push(dataUrl)
      } catch (err) {
        console.error('[processPhotosForDraft] Base64 conversion failed:', err)
      }
    }
  }

  // 3. Fallback restored payload if no other photos
  if (resultUrls.length === 0 && resultPayloads.length === 0 && restored?.dataUrl) {
    resultPayloads.push(restored)
    resultUrls.push(restored.dataUrl)
  }

  const photoCount = resultUrls.length || resultPayloads.length
  const photoName = photoCount > 0 ? `${photoCount} foto terlampir` : ''

  return { urls: resultUrls, payloads: resultPayloads, photoName }
}

interface EquipmentMultiUnitInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function EquipmentMultiUnitInput({
  value,
  onChange,
  placeholder = 'Nomor unit / equipment (contoh: DT-451)',
  className,
}: EquipmentMultiUnitInputProps) {
  const [inputValue, setInputValue] = useState('')

  // Units list parsed from value
  const units = useMemo(() => {
    if (!value) return []
    return value
      .split(/[,;\n\r]+/)
      .map((u) => u.trim())
      .filter(Boolean)
  }, [value])

  const commitUnits = (rawToAdd: string) => {
    const rawParts = rawToAdd
      .split(/[,;\n\r]+/)
      .map((u) => u.trim().toUpperCase())
      .filter(Boolean)
    if (rawParts.length === 0) return

    const existingUpper = new Set(units.map((u) => u.toUpperCase()))
    const nextUnits = [...units]
    for (const part of rawParts) {
      if (!existingUpper.has(part)) {
        existingUpper.add(part)
        nextUnits.push(part)
      }
    }
    onChange(nextUnits.join(', '))
    setInputValue('')
  }

  const removeUnit = (unitToRemove: string) => {
    const remaining = units.filter((u) => u.toUpperCase() !== unitToRemove.toUpperCase())
    onChange(remaining.join(', '))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitUnits(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && units.length > 0) {
      removeUnit(units[units.length - 1])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.includes(',') || val.includes('\n') || val.includes(';')) {
      commitUnits(val)
    } else {
      setInputValue(val)
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      commitUnits(inputValue)
    }
  }

  return (
    <div className="space-y-2">
      <Input
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={units.length === 0 ? placeholder : 'Ketik nomor unit lain lalu koma / Enter...'}
        className={cn(
          'h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]',
          className
        )}
      />

      {units.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100/90 border border-sky-200/80 px-2 py-0.5 rounded-full mr-0.5">
            <Truck className="w-3 h-3 text-sky-600" />
            {units.length} Unit Terdeteksi
          </span>
          {units.map((u) => (
            <span
              key={u}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 text-white font-mono text-xs font-bold shadow-xs animate-in fade-in-50 duration-150"
            >
              <span>{u}</span>
              <button
                type="button"
                onClick={() => removeUnit(u)}
                className="size-3.5 rounded-full hover:bg-white/20 inline-flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={`Hapus ${u}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 font-medium leading-relaxed pl-1">
        💡 <span className="font-semibold text-slate-700">Pemisah Unit:</span> Ketik <kbd className="px-1 py-0.2 bg-slate-200 text-slate-800 rounded font-mono text-[10px]">koma (,)</kbd> atau <kbd className="px-1 py-0.2 bg-slate-200 text-slate-800 rounded font-mono text-[10px]">Enter</kbd> untuk menambahkan unit berikutnya jika mengerjakan lebih dari 1 unit.
      </p>
    </div>
  )
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
    tireCount: 0,
    notes: '',
  }
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function cleanPhotoUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  return resolveUploadUrl(trimmed)
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
  onOpenDraftTab,
  initialDraftKey,
}: MobileDailyActivityFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queuedDraftKey = initialDraftKey?.trim() || searchParams.get('draft')?.trim() || ''
  const [activeDraftKey, setActiveDraftKey] = useState(
    () => queuedDraftKey || ACTIVITY_DRAFT_STORAGE_KEY
  )
  const [isDraftSavedModalOpen, setIsDraftSavedModalOpen] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  useEffect(() => {
    const key = initialDraftKey?.trim() || queuedDraftKey || ACTIVITY_DRAFT_STORAGE_KEY
    setActiveDraftKey(key)
  }, [initialDraftKey, queuedDraftKey])

  const rawSession = initialSessionData?.data || initialSessionData?.session || initialSessionData
  const rawItems = useMemo(
    () => (rawSession?.sessionItems || rawSession?.items || []) as any[],
    [rawSession?.sessionItems, rawSession?.items]
  )

  const initialDraft = useMemo(() => {
    if (typeof window === 'undefined') return null
    if (!initialDraftKey && !queuedDraftKey && (rawSession || revisionSessionId)) {
      return null
    }
    const key = initialDraftKey?.trim() || queuedDraftKey || activeDraftKey || ACTIVITY_DRAFT_STORAGE_KEY
    return readDraft<ActivitySyncPayload>(key)
  }, [initialDraftKey, queuedDraftKey, activeDraftKey, rawSession, revisionSessionId])

  const [workDate, setWorkDate] = useState<string>(() => {
    if (initialDraft?.workDate) return initialDraft.workDate
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
    initialDraft?.routeShiftCode || rawSession?.shiftCode || routeChecklist?.shiftCode || 'ALL'
  )
  const [sourceMode, setSourceMode] = useState<'assigned' | 'self_input' | 'custom'>(() => {
    if (initialDraft?.sourceMode) {
      return initialDraft.sourceMode
    }
    if (initialDraft?.customActivityName) {
      return 'custom'
    }
    if (
      (initialDraft?.selectedLibraryActivityIds && initialDraft.selectedLibraryActivityIds.length > 0) ||
      (initialDraft?.selfInputActivities && initialDraft.selfInputActivities.length > 0)
    ) {
      return 'self_input'
    }
    if (rawSession?.submissionSource === 'custom' || rawSession?.submissionSource === 'assigned' || rawSession?.submissionSource === 'self_input') {
      return rawSession.submissionSource
    }
    if (rawSession?.routeTemplateId || rawSession?.overtimeCommandLetterId) {
      return 'assigned'
    }
    return 'self_input'
  })
  const [assignmentId, setAssignmentId] = useState(() => initialDraft?.assignmentId || '')
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(() => {
    if (initialDraft?.selectedLibraryActivityIds && initialDraft.selectedLibraryActivityIds.length > 0) {
      return initialDraft.selectedLibraryActivityIds.map(String)
    }
    if (initialDraft?.selfInputActivities && initialDraft.selfInputActivities.length > 0) {
      return initialDraft.selfInputActivities.map((s) => String(s.libraryActivityId)).filter(Boolean)
    }
    if (initialDraft?.libraryActivityId) {
      return [String(initialDraft.libraryActivityId)]
    }
    if (rawItems && rawItems.length > 0) {
      const ids: string[] = []
      for (const item of rawItems) {
        const idStr = String(item.libraryActivityId || '')
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
    if (initialDraft?.selfInputActivities && initialDraft.selfInputActivities.length > 0) {
      return Object.fromEntries(
        initialDraft.selfInputActivities.map((item, index) => {
          const previewUrls =
            item.previewUrls && item.previewUrls.length > 0
              ? item.previewUrls
              : item.photoUrl
                ? [item.photoUrl]
                : item.photo?.dataUrl
                  ? [item.photo.dataUrl]
                  : []
          const photoName =
            item.photoName ||
            (previewUrls.length > 0 ? `${previewUrls.length} foto terlampir` : '')

          return [
            String(item.libraryActivityId),
            {
              equipmentNo: item.equipmentNo ?? '',
              startTime:
                item.startTime ||
                buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime).startTime,
              endTime:
                item.endTime ||
                buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime).endTime,
              materialUsed: item.materialUsed ?? '',
              tireCount: item.tireCount ?? 0,
              notes: item.notes ?? '',
              photoFiles: [],
              photoName,
              previewUrls,
              restoredPhotoPayload: item.photo ?? null,
            },
          ]
        })
      )
    }
    if (initialDraft?.libraryActivityId) {
      return {
        [String(initialDraft.libraryActivityId)]: {
          equipmentNo: initialDraft.equipmentNo ?? '',
          startTime: initialDraft.startTime || defaultStartTime,
          endTime: initialDraft.endTime || defaultEndTime,
          materialUsed: initialDraft.materialUsed ?? '',
          tireCount: initialDraft.tireCount ?? 0,
          notes: initialDraft.notes ?? '',
          photoFiles: [],
          photoName: initialDraft.photo?.name || '',
          previewUrls: initialDraft.photoUrls || (initialDraft.photo?.dataUrl ? [initialDraft.photo.dataUrl] : []),
          restoredPhotoPayload: initialDraft.photo ?? null,
        },
      }
    }
    if (rawItems && rawItems.length > 0) {
      const entries: Record<string, SelfInputEntryState> = {}
      for (const item of rawItems) {
        const idStr = String(item.libraryActivityId || '')
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
            tireCount: item.tireCount ?? 0,
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
  const initialRawCustomUrls: string[] = initialCustomItem ? extractItemPhotos(initialCustomItem) : []
  const draftCustomUrls =
    initialDraft?.photoUrls && initialDraft.photoUrls.length > 0
      ? initialDraft.photoUrls
      : initialDraft?.photo?.dataUrl
        ? [initialDraft.photo.dataUrl]
        : []
  const effectiveInitialCustomUrls = draftCustomUrls.length > 0 ? draftCustomUrls : initialRawCustomUrls

  const [customActivityName, setCustomActivityName] = useState(
    () => initialDraft?.customActivityName || initialCustomItem?.label || initialCustomItem?.snapshotLabel || ''
  )
  const [customActivityDescription, setCustomActivityDescription] = useState(
    () => initialDraft?.customActivityDescription || initialCustomItem?.remark || ''
  )
  const [equipmentNo, setEquipmentNo] = useState(
    () => initialDraft?.equipmentNo || initialCustomItem?.unitNumber || ''
  )
  const [startTime, setStartTime] = useState(
    () => initialDraft?.startTime || (initialCustomItem?.startedAt ? toDateTimeLocalValue(initialCustomItem.startedAt) : defaultStartTime)
  )
  const [endTime, setEndTime] = useState(
    () => initialDraft?.endTime || (initialCustomItem?.endedAt ? toDateTimeLocalValue(initialCustomItem.endedAt) : defaultEndTime)
  )
  const [materialUsed, setMaterialUsed] = useState(
    () => initialDraft?.materialUsed || initialCustomItem?.materialUsed || ''
  )
  const [notes, setNotes] = useState(
    () => initialDraft?.notes || rawSession?.summaryRemark || rawSession?.notes || ''
  )
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

  // Resolusi Head Location dari Master Data Location (sites.headEmployeeId)
  const siteHeadEmployeeId = site?.headEmployeeId || hierarchy?.superior?.id || null

  const [leaderEmployeeId, setLeaderEmployeeId] = useState<string>(() => {
    if (existingLeaderApproval?.approverEmployeeId) return String(existingLeaderApproval.approverEmployeeId)
    // Sesuai Master Data Location: PJO Activities disesuaikan dengan Head Location di Master Data Location
    if (siteHeadEmployeeId && siteHeadEmployeeId !== employeeId) {
      return String(siteHeadEmployeeId)
    }
    return hierarchy?.leader?.id ? String(hierarchy.leader.id) : ''
  })
  const [superiorEmployeeId, setSuperiorEmployeeId] = useState<string>(() => {
    if (existingSuperiorApproval?.approverEmployeeId) return String(existingSuperiorApproval.approverEmployeeId)
    return hierarchy?.superior?.id ? String(hierarchy.superior.id) : ''
  })

  // Additional Approvers state (multi-step signatories)
  interface AdditionalApproverItem {
    id: string
    employeeId: string
    role: string
    stepLabel: string
  }

  const [additionalApprovers, setAdditionalApprovers] = useState<AdditionalApproverItem[]>(() => {
    if (rawSession?.approvals && Array.isArray(rawSession.approvals)) {
      const extraSteps = rawSession.approvals
        .filter((a: any) => a.stepOrder > 2 && a.approverRole !== 'employee')
        .sort((a: any, b: any) => a.stepOrder - b.stepOrder)
      if (extraSteps.length > 0) {
        return extraSteps.map((a: any, idx: number) => ({
          id: `step-${a.id || idx}`,
          employeeId: a.approverEmployeeId ? String(a.approverEmployeeId) : '',
          role: a.approverRole || 'additional_approver',
          stepLabel: a.stepLabel || `Approver Tambahan (Tahap ${a.stepOrder || idx + 3})`,
        }))
      }
    }
    return []
  })

  // Fallback candidate employees if not passed via allEmployees prop
  const [candidateEmployees, setCandidateEmployees] = useState<any[]>([])

  useEffect(() => {
    // If allEmployees is already provided via props, no need to fetch
    if (allEmployees && allEmployees.length > 0) {
      return
    }

    let isMounted = true
    getDailyActivityApproverCandidatesAction()
      .then((res) => {
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setCandidateEmployees(res.data)
        }
      })
      .catch((e) => console.error('Error fetching approver candidates:', e))

    return () => {
      isMounted = false
    }
  }, [])

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
            tireCount: item.tireCount ?? 0,
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
  const [photoName, setPhotoName] = useState(
    initialDraft?.photoName ||
    (effectiveInitialCustomUrls.length > 0 ? `${effectiveInitialCustomUrls.length} foto terlampir` : initialDraft?.photo?.name || '')
  )
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>(effectiveInitialCustomUrls)
  const [restoredPhotoPayload, setRestoredPhotoPayload] = useState<QueuedFilePayload | null>(
    () => initialDraft?.photo ?? null
  )
  const [queuedPhotoPayloads, setQueuedPhotoPayloads] = useState<QueuedFilePayload[]>(
    () => initialDraft?.photos || (initialDraft?.photo ? [initialDraft.photo] : [])
  )
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

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(event.target.files ?? [])
    if (rawFiles.length === 0) return

    const targetId = activePhotoTargetRef.current || activePhotoTarget
    if (!targetId) return

    const compressedFiles = await compressImageFiles(rawFiles, { maxWidthOrHeight: 1280, quality: 0.75 })
    const file = compressedFiles[0] ?? null
    const names = compressedFiles.map((item) => item.name).join(', ')
    const previewUrls = compressedFiles.map((f) => URL.createObjectURL(f))
    let queuedPayloads: QueuedFilePayload[] = []
    try {
      queuedPayloads = await Promise.all(compressedFiles.map(fileToQueuedPhoto))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan foto ke draft.')
      return
    }

    if (targetId === 'single') {
      setPhotoFile(file)
      setPhotoFiles(compressedFiles)
      setPhotoName(names)
      setPhotoPreviewUrls(previewUrls)
      setRestoredPhotoPayload(null)
      setQueuedPhotoPayloads(queuedPayloads)
    } else if (targetId.startsWith('route:')) {
      const id = parseInt(targetId.split(':')[1], 10)
      setRouteItemState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          photoFile: file,
          photoFiles: compressedFiles,
          photoName: names,
          previewUrls: previewUrls,
          restoredPhotoPayload: null,
          queuedPhotoPayloads: queuedPayloads,
        },
      }))
    } else if (targetId.startsWith('library:')) {
      const id = targetId.split(':')[1]
      setSelfInputEntries((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          photoFile: file,
          photoFiles: compressedFiles,
          photoName: names,
          previewUrls: previewUrls,
          restoredPhotoPayload: null,
          queuedPhotoPayloads: queuedPayloads,
        },
      }))
    }

    // Process photo uploads in background so Save Draft and Submit are fast
    void (async () => {
      try {
        const uploaded = await Promise.all(
          compressedFiles.map(async (cf) => {
            try {
              return await uploadActivityPhoto(cf)
            } catch {
              return null
            }
          })
        )
        const validUploaded = uploaded.filter((u): u is string => typeof u === 'string' && u.length > 0)
        if (validUploaded.length > 0) {
          if (targetId === 'single') {
            setPhotoPreviewUrls(validUploaded)
          } else if (targetId.startsWith('route:')) {
            const id = parseInt(targetId.split(':')[1], 10)
            setRouteItemState((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                previewUrls: validUploaded,
              },
            }))
          } else if (targetId.startsWith('library:')) {
            const id = targetId.split(':')[1]
            setSelfInputEntries((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                previewUrls: validUploaded,
              },
            }))
          }
        }
      } catch (err) {
        console.warn('Background photo upload failed:', err)
      }
    })()

    toast.success(`${compressedFiles.length} foto evidence berhasil dilampirkan`)
    event.target.value = ''
  }

  const handleRemovePhoto = (targetId: string) => {
    if (targetId === 'single') {
      setPhotoFile(null)
      setPhotoFiles([])
      setPhotoName('')
      setPhotoPreviewUrls([])
      setRestoredPhotoPayload(null)
      setQueuedPhotoPayloads([])
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
          queuedPhotoPayloads: [],
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
          queuedPhotoPayloads: [],
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
  // Tracks the server-side draft session ID so autosave updates the same record
  const [serverDraftSessionId, setServerDraftSessionId] = useState<number | null>(() => {
    if (initialDraft?.serverDraftSessionId) return Number(initialDraft.serverDraftSessionId)
    const activeKey = initialDraftKey?.trim() || queuedDraftKey
    if (activeKey?.startsWith('hero:draft:activity:server-')) {
      const parsed = Number(activeKey.replace('hero:draft:activity:server-', ''))
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
    return null
  })
  const serverAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    return pool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.employeeSn && m.employeeSn.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q)) ||
        (m.section && m.section.toLowerCase().includes(q)) ||
        (m.siteName && m.siteName.toLowerCase().includes(q))
    )
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
            requiresPhoto: Boolean(item.requiresPhoto ?? (item.photos?.length || item.photoUrl || extractItemPhotos(item).length > 0)),
            requiresEquipmentNo: Boolean((item as any).requiresEquipmentNo ?? item.requiresUnit),
            requiresDuration: (item as any).requiresDuration ?? true,
            requiresMaterialUsed: Boolean((item as any).requiresMaterialUsed || item.materialUsed),
            requiresLocationGps: Boolean((item as any).requiresLocationGps),
            requiresTireCount: Boolean((item as any).requiresTireCount),
            maxDailyCount: (item as any).maxDailyCount ?? 99,
            maxPointsPerDay: (item as any).maxPointsPerDay ?? 999,
            departmentId: (item as any).departmentId ?? null,
            sectionId: (item as any).sectionId ?? null,
            isSelfInput: (item as any).isSelfInput ?? true,
            isAssignable: (item as any).isAssignable ?? true,
            approvalRequired: (item as any).approvalRequired ?? true,
            autoApproveIfGpsValid: (item as any).autoApproveIfGpsValid ?? false,
          })
          existingIds.add(idStr)
        }
      }
    }
    if (availableRouteFolders && availableRouteFolders.length > 0) {
      for (const folder of availableRouteFolders) {
        for (const group of folder.groups || []) {
          for (const item of group.items || []) {
            const idStr = String(item.libraryActivityId ?? `route-item-${item.id}`)
            const numId = item.libraryActivityId ?? (-item.id)
            if (!existingIds.has(idStr) && !existingIds.has(String(numId))) {
              list.push({
                id: numId as any,
                activityCode: item.itemCode || item.libraryCode || 'CUSTOM',
                activityName: item.itemLabel || item.libraryName || 'Aktivitas',
                basePoints: Number(item.pointOverride ?? item.libraryPoints) || 5,
                requiresPhoto: Boolean(item.requiresPhoto),
                requiresEquipmentNo: Boolean(item.requiresUnit),
                requiresDuration: item.requiresTime ?? true,
                requiresMaterialUsed: Boolean(item.requiresMaterialUsed),
                requiresLocationGps: Boolean(item.requiresLocationGps),
                requiresTireCount: Boolean(item.requiresTireCount),
                maxDailyCount: 99,
                maxPointsPerDay: 999,
                departmentId: null,
                sectionId: null,
                isSelfInput: true,
                isAssignable: true,
                approvalRequired: true,
                autoApproveIfGpsValid: false,
              })
              existingIds.add(idStr)
              existingIds.add(String(numId))
          }
        }
      }
    }
  }

  if (initialDraft?.selfInputActivities && initialDraft.selfInputActivities.length > 0) {
      for (const item of initialDraft.selfInputActivities) {
        const idStr = String(item.libraryActivityId || '')
        if (idStr && !existingIds.has(idStr)) {
          list.push({
            id: Number(idStr) || (idStr as any),
            activityCode: 'ACT',
            activityName: item.notes || `Aktivitas #${idStr}`,
            basePoints: 5,
            requiresPhoto: Boolean(item.previewUrls?.length || item.photoUrl),
            requiresEquipmentNo: Boolean(item.equipmentNo),
            requiresDuration: true,
            requiresMaterialUsed: Boolean(item.materialUsed),
            requiresLocationGps: false,
            requiresTireCount: Boolean(item.tireCount),
            maxDailyCount: 99,
            maxPointsPerDay: 999,
            departmentId: null,
            sectionId: null,
            isSelfInput: true,
            isAssignable: true,
            approvalRequired: true,
            autoApproveIfGpsValid: false,
          })
          existingIds.add(idStr)
        }
      }
    }

    return list
  }, [availableLibrary, rawItems, availableRouteFolders, initialDraft])

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

  const totalVisibleLibraryCount = useMemo(() => {
    const normalizedSearch = (librarySearch || '').toLowerCase().replace(/[^a-z0-9]/g, '')

    const groupedLibraryIdSet = new Set<string>()
    for (const folder of availableRouteFolders || []) {
      const folderCode = (folder.routeCode || '').trim().toLowerCase()
      const folderName = (folder.routeName || '').trim().toLowerCase()

      for (const lib of availableLibraryMap.values()) {
        const libCode = (lib.activityCode || '').trim().toLowerCase()
        const libName = (lib.activityName || '').trim().toLowerCase()

        if (
          (libCode && (folderCode === `grp-${libCode}` || folderCode === libCode)) ||
          (libName && (folderName === `group: ${libName}` || folderName === libName))
        ) {
          groupedLibraryIdSet.add(String(lib.id))
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
            groupedLibraryIdSet.add(String(lib.id))
          }
        }

        // Note: Do NOT add item.libraryActivityId to groupedLibraryIdSet.
        // Individual child activities must remain selectable and counted in the library.
      }
    }

    let groupMatchingCount = 0
    for (const folder of availableRouteFolders || []) {
      for (const group of folder.groups || []) {
        const matchingGroupItems = (group.items || [])
          .map((i) => (i.libraryActivityId != null ? availableLibraryMap.get(String(i.libraryActivityId)) : null))
          .filter((lib): lib is LibraryOption => Boolean(lib))
          .filter((lib) => {
            if (!normalizedSearch) return true
            const nCode = (lib.activityCode || '').toLowerCase().replace(/[^a-z0-9]/g, '')
            const nName = (lib.activityName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
            return nCode.includes(normalizedSearch) || nName.includes(normalizedSearch)
          })
        groupMatchingCount += matchingGroupItems.length
      }
    }

    const standaloneMatchingCount = Array.from(availableLibraryMap.values())
      .filter((lib) => !groupedLibraryIdSet.has(String(lib.id)))
      .filter((lib) => {
        if (!normalizedSearch) return true
        const nCode = (lib.activityCode || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const nName = (lib.activityName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        return nCode.includes(normalizedSearch) || nName.includes(normalizedSearch)
      }).length

    return groupMatchingCount + standaloneMatchingCount
  }, [availableRouteFolders, availableLibraryMap, librarySearch])

  const needsGlobalPhoto = selectedLibraries.some((item) => item.requiresPhoto)
  const selectedAssignment = useMemo(
    () => assignments.find((item) => `${item.id}` === assignmentId) ?? null,
    [assignmentId, assignments]
  )

  const employeeOptions = useMemo(() => {
    const list = (allEmployees && allEmployees.length > 0)
      ? allEmployees
      : (candidateEmployees.length > 0 ? candidateEmployees : teamMembers) || []

    const map = new Map<string, { value: string; label: string }>()

    // PJO / Head Location dari Master Data Location (sites.headEmployeeId)
    const pjoId = site?.headEmployeeId || hierarchy?.superior?.id
    if (pjoId) {
      const pjoEmp = list.find((m: any) => m.id === pjoId) || hierarchy?.superior
      if (pjoEmp) {
        map.set(String(pjoEmp.id), {
          value: String(pjoEmp.id),
          label: `${pjoEmp.name.toUpperCase()} — PJO / HEAD LOCATION [${(site?.name || 'SITE').toUpperCase()}]`,
        })
      }
    }

    if (hierarchy?.leader && !map.has(String(hierarchy.leader.id))) {
      map.set(String(hierarchy.leader.id), {
        value: String(hierarchy.leader.id),
        label: `${hierarchy.leader.name.toUpperCase()} — (ATASAN LANGSUNG)`,
      })
    }

    if (hierarchy?.superior && !map.has(String(hierarchy.superior.id))) {
      map.set(String(hierarchy.superior.id), {
        value: String(hierarchy.superior.id),
        label: `${hierarchy.superior.name.toUpperCase()} — (SECTION HEAD / PJO)`,
      })
    }

    list.forEach((m: any) => {
      const idStr = String(m.id)
      if (!map.has(idStr)) {
        const pos = m.position || m.jobTitle || m.role || 'STAFF'
        const loc = m.siteName ? `[${m.siteName.toUpperCase()}]` : m.department ? `[${m.department.toUpperCase()}]` : ''
        map.set(idStr, {
          value: idStr,
          label: `${m.name.toUpperCase()} — ${pos.toUpperCase()}${loc ? ` ${loc}` : ''}`,
        })
      }
    })

    return Array.from(map.values())
  }, [candidateEmployees, allEmployees, teamMembers, hierarchy])

  const leaderOptions = employeeOptions
  const superiorOptions = employeeOptions

  const handleAddApprover = () => {
    const nextStep = additionalApprovers.length + 2
    setAdditionalApprovers((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId: '',
        role: 'additional_approver',
        stepLabel: `Tahap ${nextStep} - Approver Tambahan`,
      },
    ])
  }

  const handleUpdateApprover = (id: string, updates: Partial<AdditionalApproverItem>) => {
    setAdditionalApprovers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const handleRemoveApprover = (id: string) => {
    setAdditionalApprovers((prev) => prev.filter((item) => item.id !== id))
  }
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
            <Badge className="border-0 bg-slate-100 px-1.5 py-0 text-[9px] font-medium tracking-[0.14em] text-slate-600 uppercase">
              Opsional
            </Badge>
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
              {effectivePreviewUrls.map((url, idx) => {
                const resolvedUrl = url.startsWith('blob:') || url.startsWith('data:') ? url : resolveUploadUrl(url)
                return (
                  <a
                    key={idx}
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="relative group block overflow-hidden rounded-lg border border-slate-200 bg-black/5 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                    title="Klik untuk melihat foto penuh"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedUrl}
                      alt={`Evidence preview ${idx + 1}`}
                      className="h-16 w-16 object-cover rounded-lg border border-slate-200"
                      loading="lazy"
                    />
                  </a>
                )
              })}
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

  const hasRestoredDraftKeyRef = useRef<string | null>(null)

  useEffect(() => {
    // If we are editing/revising an existing document and no explicit draft key was specified, do not clobber with old draft
    if (!initialDraftKey && !queuedDraftKey && (rawSession || revisionSessionId)) {
      return
    }

    const keyToRead = initialDraftKey?.trim() || activeDraftKey || queuedDraftKey || ACTIVITY_DRAFT_STORAGE_KEY
    if (hasRestoredDraftKeyRef.current === keyToRead) {
      return
    }
    const draft = readDraft<ActivitySyncPayload>(keyToRead)

    if (!draft) {
      return
    }

    hasRestoredDraftKeyRef.current = keyToRead

    const restoredSourceMode =
      draft.sourceMode === 'assigned' ||
      draft.sourceMode === 'self_input' ||
      draft.sourceMode === 'custom'
        ? draft.sourceMode
        : 'self_input'
    const restoredSelectedLibraryIds =
      Array.isArray(draft.selectedLibraryActivityIds) && draft.selectedLibraryActivityIds.length > 0
        ? draft.selectedLibraryActivityIds.map(String)
        : Array.isArray(draft.selfInputActivities) && draft.selfInputActivities.length > 0
          ? draft.selfInputActivities.map((s) => String(s.libraryActivityId)).filter(Boolean)
          : draft.libraryActivityId
            ? [String(draft.libraryActivityId)]
            : []
    const restoredSelfInputEntries = Array.isArray(draft.selfInputActivities)
      ? Object.fromEntries(
          draft.selfInputActivities.map((item, index) => {
            const previewUrls =
              item.previewUrls && item.previewUrls.length > 0
                ? item.previewUrls
                : item.photoUrls && item.photoUrls.length > 0
                  ? item.photoUrls
                  : item.photoUrl
                    ? [item.photoUrl]
                    : item.photo?.dataUrl
                      ? [item.photo.dataUrl]
                      : []
            const photoCount = previewUrls.length || (item.photos?.length ?? (item.photo ? 1 : 0))
            const photoName =
              item.photoName ||
              (photoCount > 0 ? `${photoCount} foto terlampir` : item.photo?.name || '')

            return [
              String(item.libraryActivityId),
              {
                equipmentNo: item.equipmentNo ?? '',
                startTime:
                  item.startTime ||
                  buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime).startTime,
                endTime:
                  item.endTime ||
                  buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime).endTime,
                materialUsed: item.materialUsed ?? '',
                tireCount: item.tireCount ?? 0,
                notes: item.notes ?? '',
                photoFiles: [],
                photoName,
                previewUrls,
                photo: item.photo ?? null,
                photos: item.photos ?? (item.photo ? [item.photo] : []),
                restoredPhotoPayload: item.photo ?? item.photos?.[0] ?? null,
                queuedPhotoPayloads: item.photos ?? (item.photo ? [item.photo] : []),
              },
            ]
          })
        )
      : draft.libraryActivityId
        ? {
            [draft.libraryActivityId]: {
              equipmentNo: draft.equipmentNo ?? '',
              startTime: draft.startTime || defaultStartTime,
              endTime: draft.endTime || defaultEndTime,
              materialUsed: draft.materialUsed ?? '',
              tireCount: draft.tireCount ?? 0,
              notes: draft.notes ?? '',
              photoFiles: [],
              photoName: draft.photo?.name || '',
              previewUrls: draft.photoUrls || (draft.photo?.dataUrl ? [draft.photo.dataUrl] : []),
              restoredPhotoPayload: draft.photo ?? null,
            },
          }
        : {}
    const restoredRouteSessionItems: RouteSessionSyncItem[] = Array.isArray(
      (draft as Partial<ActivitySyncPayload>).routeSessionItems
    )
      ? ((draft as Partial<ActivitySyncPayload>).routeSessionItems as RouteSessionSyncItem[])
      : []

    setSourceMode(restoredSourceMode)
    if (draft.workDate) {
      setWorkDate(draft.workDate)
    } else if (draft.startTime) {
      setWorkDate(draft.startTime.slice(0, 10))
    }
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
    // Restore custom activity photos
    const customUrls =
      draft.photoUrls && draft.photoUrls.length > 0
        ? draft.photoUrls
        : draft.photo?.dataUrl
          ? [draft.photo.dataUrl]
          : []
    setPhotoPreviewUrls(customUrls)
    const customPhotoCount = customUrls.length || (draft.photos?.length ?? (draft.photo ? 1 : 0))
    setPhotoName(
      draft.photoName ||
      (customPhotoCount > 0 ? `${customPhotoCount} foto terlampir` : draft.photo?.name || '')
    )
    setRestoredPhotoPayload(draft.photo ?? draft.photos?.[0] ?? null)
    setQueuedPhotoPayloads(draft.photos ?? (draft.photo ? [draft.photo] : []))
    if (restoredRouteSessionItems.length > 0) {
      setRouteItemState(
        Object.fromEntries(
          restoredRouteSessionItems.flatMap((item) => {
            const itemKey = item.overtimeCommandLetterItemId ?? item.routeItemId
            if (itemKey == null) {
              return []
            }

            const itemUrls =
              item.previewUrls && item.previewUrls.length > 0
                ? item.previewUrls
                : item.photoUrl
                  ? [item.photoUrl]
                  : item.photo?.dataUrl
                    ? [item.photo.dataUrl]
                    : []

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
                  tireCount: item.tireCount ?? 0,
                  materialUsed: item.materialUsed || '',
                  photoFiles: [],
                  photoName: itemUrls.length > 0 ? `${itemUrls.length} foto terlampir` : (item.photoUrls?.length || item.photo || item.photos?.length ? String(item.photoUrls?.length || item.photos?.length || 1) + ' foto terlampir' : ''),
                  previewUrls: itemUrls.length > 0 ? itemUrls : (item.photoUrls || []),
                  restoredPhotoPayload: item.photo || item.photos?.[0] || null,
                  queuedPhotoPayloads: item.photos || (item.photo ? [item.photo] : []),
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

    if (draft.serverDraftSessionId) {
      setServerDraftSessionId(Number(draft.serverDraftSessionId))
    }

    if (initialDraftKey || queuedDraftKey) {
      toast.success('Draft berhasil dimuat ke formulir ✓')
    }
  }, [initialDraftKey, activeDraftKey, checklistContext, defaultEndTime, defaultStartTime, rawSession, revisionSessionId, queuedDraftKey])

  useEffect(() => {
    if (!checklistContext) {
      setRouteItemState((current) => (Object.keys(current || {}).length === 0 ? current : {}))
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
                tireCount: matched?.tireCount ?? 0,
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
          tireCount: stateForItem?.isChecked && item.requiresTireCount ? stateForItem.tireCount ?? 0 : 0,
          photo: stateForItem?.queuedPhotoPayloads?.[0] ?? null,
          photos: stateForItem?.queuedPhotoPayloads ?? [],
          photoUrls: stateForItem?.previewUrls ?? [],
          sortOrder: item.sortOrder,
        }
      })
    ) ?? []
  const hasCheckedChecklist = routeSessionItems.some((item) => item.isChecked)

  const draftPayload: ActivitySyncPayload = {
    employeeId,
    workDate,
    draftTitle:
      customActivityName.trim() ||
      routeSessionItems.find((item) => item.isChecked)?.snapshotLabel ||
      availableLibrary.find((item: any) => String(item.id) === selectedLibraryIds[0])?.activityName ||
      'Daily Activity',
    sourceMode,
    assignmentId,
    libraryActivityId: selectedLibraryIds[0] ?? '',
    selectedLibraryActivityIds: selectedLibraryIds,
    selfInputActivities: selectedLibraryIds.map((libraryId, index) => {
      const entry =
        selfInputEntries[libraryId] ??
        buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)
      const photos = entry.previewUrls || []
      return {
        libraryActivityId: libraryId,
        equipmentNo: entry.equipmentNo,
        startTime: entry.startTime,
        endTime: entry.endTime,
        materialUsed: entry.materialUsed,
        tireCount: entry.tireCount ?? 0,
        notes: entry.notes,
        photo: entry.queuedPhotoPayloads?.[0] ?? entry.restoredPhotoPayload ?? null,
        photos: entry.queuedPhotoPayloads ?? (entry.restoredPhotoPayload ? [entry.restoredPhotoPayload] : []),
        photoUrls: entry.previewUrls ?? [],
        photoName: entry.photoName || (photos.length > 0 ? `${photos.length} foto terlampir` : ''),
        photoUrl: photos[0] || null,
        previewUrls: photos,
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
    photo: queuedPhotoPayloads[0] ?? restoredPhotoPayload ?? null,
    photos: queuedPhotoPayloads.length > 0 ? queuedPhotoPayloads : (restoredPhotoPayload ? [restoredPhotoPayload] : []),
    photoUrls: photoPreviewUrls.filter((url) => typeof url === 'string' && (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:'))),
    photoName,
    teamMemberEmployeeIds: selectedMemberIds,
  }

  const isFirstMountRef = useRef(true)

  useEffect(() => {
    // Prevent wiping active draft on initial mount!
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      return
    }

    // Do NOT autosave if the form is empty, to prevent wiping specific draft keys
    const hasAnyContent =
      selectedLibraryIds.length > 0 ||
      Boolean(customActivityName.trim()) ||
      Boolean(notes.trim()) ||
      Boolean(assignmentId) ||
      photoPreviewUrls.length > 0

    if (!hasAnyContent) return

    // 1. Immediate localStorage save (instant, no network needed)
    const result = writeDraft(activeDraftKey, draftPayload)
    if (!result.ok) {
      console.warn('[MobileDailyActivityForm] Draft autosave failed:', result.error)
    } else if (activeDraftKey !== ACTIVITY_DRAFT_STORAGE_KEY) {
      try {
        saveActivityDraftIndexEntry(activeDraftKey, draftPayload)
      } catch (error) {
        console.warn('[MobileDailyActivityForm] Draft index update failed:', error)
      }
    }

    // 2. Debounced server-side save every 90s — protects against browser kill / session expire
    if (serverAutosaveTimerRef.current) {
      clearTimeout(serverAutosaveTimerRef.current)
    }
    serverAutosaveTimerRef.current = setTimeout(async () => {
      if (!employeeId || !workDate || isSubmitting) return
      try {
        const itemsSnapshot = selectedLibraries.length > 0
          ? selectedLibraries.flatMap((lib) => {
              const entry = selfInputEntries[`${lib.id}`]
              const pUrls = entry?.previewUrls || []
              const unitList = (entry?.equipmentNo || '')
                .split(/[,;\n\r]+/)
                .map((u) => u.trim())
                .filter(Boolean)
              const unitsToCreate = unitList.length > 0 ? unitList : ['']
              return unitsToCreate.map((u: string) => ({
                label: `${lib.activityCode} - ${lib.activityName}`,
                group: lib.activityCode || 'Technical',
                libraryActivityId: lib.id,
                unitNumber: u,
                startedAt: entry?.startTime || defaultStartTime,
                endedAt: entry?.endTime || defaultEndTime,
                points: lib.basePoints || 5,
                remark: entry?.notes || '',
                materialUsed: entry?.materialUsed || '',
                photoUrl: pUrls[0] || null,
                photos: pUrls,
              }))
            })
          : sourceMode === 'custom' && customActivityName.trim()
            ? (() => {
                const customUnits = (equipmentNo || '')
                  .split(/[,;\n\r]+/)
                  .map((u: string) => u.trim())
                  .filter(Boolean)
                const unitsToCreate = customUnits.length > 0 ? customUnits : ['']
                return unitsToCreate.map((u: string) => ({
                  label: customActivityName.trim(),
                  group: 'Custom',
                  libraryActivityId: null,
                  unitNumber: u,
                  startedAt: startTime || defaultStartTime,
                  endedAt: endTime || defaultEndTime,
                  points: 5,
                  remark: notes.trim() || customActivityDescription.trim(),
                  materialUsed: materialUsed.trim(),
                  photoUrl: photoPreviewUrls[0] || null,
                  photos: photoPreviewUrls,
                }))
              })()
            : []

        const res = await saveActivityDraftToServerAction({
          employeeId,
          workDate,
          shiftCode,
          submissionSource: sourceMode,
          siteId: site?.id,
          notes: notes.trim(),
          summaryRemark: notes.trim(),
          teamMemberEmployeeIds: isTeamLog ? selectedMemberIds : [],
          items: itemsSnapshot,
          existingDraftSessionId: serverDraftSessionId,
        })
        if (res.success) {
          setServerDraftSessionId(res.sessionId)
        }
      } catch {
        // Silent — server draft is best-effort, localStorage is primary
      }
    }, 90_000) // 90 seconds debounce

    return () => {
      if (serverAutosaveTimerRef.current) {
        clearTimeout(serverAutosaveTimerRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDraftKey, draftPayload])

  function validatePayload() {
    // 1. Validasi Header & Source Mode
    if (!workDate) {
      return 'Tanggal kerja wajib diisi.'
    }

    if (!sourceMode) {
      return 'Pilih Source Mode aktivitas terlebih dahulu.'
    }

    if (
      sourceMode !== 'self_input' &&
      checklistContext?.overtimeCommandLetterId &&
      startTime.slice(0, 10) !== defaultStartTime.slice(0, 10)
    ) {
      return 'Tanggal aktivitas tidak sesuai dengan jadwal SPL.'
    }

    // 2. Validasi Mode Assigned (Wajib pilih assignment & penjelasan pekerjaan)
    if (sourceMode === 'assigned') {
      if (!assignmentId) {
        return 'Pilih assignment penugasan terlebih dahulu.'
      }

      if (!notes.trim()) {
        return 'Penjelasan / catatan hasil kerja wajib diisi.'
      }

      if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
        return 'Waktu selesai harus setelah waktu mulai.'
      }

      return ''
    }

    // 3. Validasi Mode Custom (Wajib nama custom & penjelasan deskripsi)
    if (sourceMode === 'custom') {
      if (!customActivityName.trim()) {
        return 'Nama custom activity wajib diisi.'
      }

      if (!customActivityDescription.trim() && !notes.trim()) {
        return 'Penjelasan / deskripsi aktivitas custom wajib diisi.'
      }

      if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
        return 'Waktu selesai harus setelah waktu mulai.'
      }

      return ''
    }

    // 4. Validasi Mode Kamus Aktivitas (Self Input) & Checklist (Wajib 1 library & penjelasan diisi)
    if (selectedLibraries.length === 0 && !hasCheckedChecklist) {
      return 'Pilih minimal satu aktivitas dari Kamus Aktivitas sebelum submit.'
    }

    for (const [index, library] of (selectedLibraries || []).entries()) {
      const libraryId = `${library.id}`
      const entry =
        selfInputEntries[libraryId] ??
        buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)

      if (library.requiresEquipmentNo && !entry.equipmentNo?.trim()) {
        return `Nomor Equipment / Unit wajib diisi untuk "${library.activityCode} - ${library.activityName}".`
      }

      if (library.requiresMaterialUsed && !entry.materialUsed?.trim()) {
        return `Material used wajib diisi untuk "${library.activityCode} - ${library.activityName}".`
      }

      if (library.requiresTireCount && (!entry.tireCount || entry.tireCount < 1)) {
        return `Jumlah tire wajib diisi (minimal 1) untuk "${library.activityCode} - ${library.activityName}".`
      }

      if (library.requiresDuration !== false) {
        if (!entry.startTime || !entry.endTime) {
          return `Durasi waktu mulai dan selesai wajib diisi untuk "${library.activityCode} - ${library.activityName}".`
        }
      }

      if (library.requiresLocationGps && (!geo.latitude || !geo.longitude)) {
        return `Validasi GPS wajib aktif untuk aktivitas "${library.activityCode} - ${library.activityName}".`
      }

      if (entry.startTime && entry.endTime) {
        const start = new Date(entry.startTime)
        const end = new Date(entry.endTime)

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
          return `Waktu selesai harus setelah waktu mulai pada aktivitas ${library.activityCode}.`
        }
      }
    }

    // Checklist fields and evidence are fully optional

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
            tireCount: entry.tireCount ?? 0,
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
        itemsToSubmit = (
          await Promise.all(
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

              const unitList = (entry.equipmentNo || '')
                .split(/[,;\n\r]+/)
                .map((u: string) => u.trim())
                .filter(Boolean)
              const unitsToCreate = unitList.length > 0 ? unitList : ['']

              return unitsToCreate.map((u: string, uIdx: number) => ({
                id: uIdx === 0 ? matchingSessionItem?.id : undefined,
                label: `${library.activityCode} - ${library.activityName}`,
                group: library.activityCode || 'Technical',
                libraryActivityId: validLibraryId,
                unitNumber: u,
                startedAt: formatSubmitDateTime(entry.startTime, workDate),
                endedAt: formatSubmitDateTime(entry.endTime, workDate),
                points: library.basePoints || 5,
                remark: entry.notes || '',
                materialUsed: entry.materialUsed || '',
                tireCount: library.requiresTireCount ? (entry.tireCount ?? 0) : (entry.tireCount ?? null),
                photoUrl: entryEvidence.urls[0] || null,
                photos: entryEvidence.urls,
              }))
            })
          )
        ).flat()
      } else if (sourceMode === 'custom' && customActivityName) {
        const customEvidence = await prepareEvidence(
          photoFiles,
          photoFile,
          restoredPhotoPayload,
          photoPreviewUrls
        )
        const matchingCustomItem = initialSessionData?.sessionItems?.find((i: any) => !i.libraryActivityId)
        const customUnits = (equipmentNo || '')
          .split(/[,;\n\r]+/)
          .map((u: string) => u.trim())
          .filter(Boolean)
        const unitsToCreate = customUnits.length > 0 ? customUnits : ['']

        itemsToSubmit = unitsToCreate.map((u: string, uIdx: number) => ({
          id: uIdx === 0 ? matchingCustomItem?.id : undefined,
          label: customActivityName.trim(),
          group: 'Custom',
          libraryActivityId: null,
          unitNumber: u,
          startedAt: formatSubmitDateTime(startTime, workDate),
          endedAt: formatSubmitDateTime(endTime, workDate),
          points: 5,
          remark: notes.trim(),
          materialUsed: materialUsed.trim(),
          photoUrl: customEvidence.urls[0] || null,
          photos: customEvidence.urls,
        }))
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
                tireCount: item.tireCount ?? 0,
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
            tireCount: it.tireCount ?? 0,
            photoUrl: it.photoUrl,
            photos: it.photos,
          }))
        } else {
          throw new Error('Mohon pilih minimal 1 aktivitas.')
        }
      }

      const selectedLeader = leaderOptions.find((l) => l.value === leaderEmployeeId)
      const selectedSuperior = superiorOptions.find((s) => s.value === superiorEmployeeId)

      const formattedAdditionalApprovers = additionalApprovers
        .filter((a) => a.employeeId && a.employeeId.trim())
        .map((a, idx) => {
          const empMatch = employeeOptions.find((e) => e.value === a.employeeId)
          return {
            employeeId: Number(a.employeeId),
            name: empMatch?.label?.split('—')[0]?.trim() || undefined,
            stepLabel: a.stepLabel?.trim() || `Approver Tambahan (Tahap ${idx + 3})`,
            role: a.role || 'additional_approver',
          }
        })

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
          additionalApprovers: formattedAdditionalApprovers,
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
          additionalApprovers: formattedAdditionalApprovers,
          teamMemberEmployeeIds: isTeamLog ? selectedMemberIds : [],
          items: itemsToSubmit,
          existingDraftSessionId: serverDraftSessionId,
        })

        if (!res.success) {
          throw new Error(res.error || 'Gagal membuat dokumen Daily Activity.')
        }

        setSubmitState({
          kind: 'success',
          message: `${itemsToSubmit.length} aktivitas berhasil diajukan dalam 1 dokumen DAR.`,
        })
      }

      const draftSessionIdToDelete =
        serverDraftSessionId ||
        (initialDraft?.serverDraftSessionId ? Number(initialDraft.serverDraftSessionId) : null) ||
        (activeDraftKey?.startsWith('hero:draft:activity:server-')
          ? Number(activeDraftKey.replace('hero:draft:activity:server-', ''))
          : null)

      if (draftSessionIdToDelete) {
        deleteServerActivityDraftAction(draftSessionIdToDelete).catch((err) =>
          console.warn('[handleSubmit] deleteServerActivityDraftAction error:', err)
        )
      }

      removeActivityDraft(activeDraftKey)
      if (initialDraftKey && initialDraftKey !== activeDraftKey) {
        removeActivityDraft(initialDraftKey)
      }
      if (queuedDraftKey && queuedDraftKey !== activeDraftKey) {
        removeActivityDraft(queuedDraftKey)
      }
      if (draftSessionIdToDelete) {
        removeActivityDraft(`hero:draft:activity:server-${draftSessionIdToDelete}`)
      }
      try {
        window.localStorage.removeItem(ACTIVITY_DRAFT_STORAGE_KEY)
      } catch {}
      window.dispatchEvent(new CustomEvent(ACTIVITY_DRAFTS_CHANGED_EVENT))

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
              <span>{totalVisibleLibraryCount} library tampil</span>
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
                          <Search className="size-4 text-gray-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Cari nama atau SN anggota..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                          />
                          {memberSearch && (
                            <button
                              type="button"
                              onClick={() => setMemberSearch('')}
                              className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                              title="Hapus pencarian"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
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
                                      {member.employeeSn ? `SN: ${member.employeeSn} • ` : ''}
                                      {member.role}
                                      {member.section ? ` • ${member.section}` : ''}
                                      {member.siteName ? ` • ${member.siteName}` : site?.name ? ` • ${site.name}` : ''}
                                    </span>
                                  </div>
                                  <Checkbox checked={isChecked} onCheckedChange={() => {}} className="pointer-events-none rounded-md" />
                                </div>
                              )
                            })
                          ) : (
                            <div className="text-center py-4 space-y-1">
                              <p className="text-xs font-semibold text-gray-700">
                                Tidak ada anggota tim yang cocok
                              </p>
                              {memberSearch ? (
                                <p className="text-[11px] text-gray-400">
                                  Tidak ditemukan untuk kata kunci &ldquo;{memberSearch}&rdquo;. Silakan hapus atau ketik nama/SN rekan tim.
                                </p>
                              ) : (
                                <p className="text-[11px] text-gray-400">
                                  Belum ada rekan tim lain yang terdaftar aktif di site ini.
                                </p>
                              )}
                            </div>
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
                    ? 'Foto bukti (evidence) opsional.'
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
                      onFinalTranscript={(text: string) =>
                        setCustomActivityDescription((prev: string) => (prev ? prev + ' ' + text : text))
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
            </div>

            {selectedLibraries.length > 0 ? (
              <div className="space-y-3">
                {selectedLibraries.map((library, index) => {
                  const libraryId = `${library.id}`
                  const entry =
                    selfInputEntries[libraryId] ??
                    buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)
                  const requirementBadges = [
                    library.requiresEquipmentNo ? 'Equipment' : null,
                    library.requiresDuration !== false ? 'Waktu' : null,
                    library.requiresTireCount ? 'Tire' : null,
                    library.requiresMaterialUsed ? 'Material' : null,
                    library.requiresLocationGps ? 'GPS' : null,
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
                              No. Equipment / Unit <span className="text-rose-500">*</span>
                            </span>
                            <EquipmentMultiUnitInput
                              value={entry.equipmentNo || ''}
                              onChange={(val) =>
                                updateSelfInputEntry(libraryId, {
                                  equipmentNo: val,
                                })
                              }
                              placeholder="Nomor unit / equipment (contoh: DT-451)"
                              className="bg-white"
                            />
                          </Label>
                        ) : null}

                        {library.requiresDuration !== false ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Label className="block space-y-2">
                              <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                                Mulai <span className="text-rose-500">*</span>
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
                                Selesai <span className="text-rose-500">*</span>
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
                        ) : null}

                        {library.requiresMaterialUsed ? (
                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                              Material Used <span className="text-rose-500">*</span>
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
                              Jumlah Tire <span className="text-rose-500">*</span>
                            </span>
                            <Input
                              type="number"
                              min={0}
                              value={entry.tireCount ?? 0}
                              onChange={(event) =>
                                updateSelfInputEntry(libraryId, {
                                  tireCount: Math.max(0, parseInt(event.target.value, 10) || 0),
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
                              Catatan item (Opsional)
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
                            placeholder="Hasil kerja, temuan, atau catatan singkat (opsional)."
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
                                <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium tracking-[0.08em] text-slate-600 uppercase">
                                  Foto opsional
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
                                    Equipment / Unit No.
                                  </span>
                                  <Input
                                    value={itemState.unitNumber ?? ''}
                                    onChange={(event) =>
                                      updateRouteItem(item.id, { unitNumber: event.target.value })
                                    }
                                    placeholder="Contoh: DT-451 / BAY-03"
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
                                    min={0}
                                    value={itemState.tireCount ?? 0}
                                    onChange={(event) =>
                                      updateRouteItem(item.id, {
                                        tireCount: Math.max(0, parseInt(event.target.value, 10) || 0),
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
                <EquipmentMultiUnitInput
                  value={equipmentNo}
                  onChange={(val) => setEquipmentNo(val)}
                  placeholder="Contoh: DT-451, BAY-03"
                  className="bg-[#e9f6fd]"
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
              ALUR BERJENJANG
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Tahap 1: Leader / PJO (Head Location) */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-black text-white">
                    1
                  </span>
                  <label className="block text-xs font-bold text-slate-800">
                    Leader / PJO {site?.name ? `(Head Location: ${site.name})` : '(Approver Utama)'}
                  </label>
                </div>
                {existingLeaderApproval?.status === 'approved' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    SUDAH DISETUJUI (TERKUNCI)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Wajib
                  </span>
                )}
              </div>

              <SearchableSelect
                label="Pilih Leader / PJO"
                value={leaderEmployeeId}
                onValueChange={(val) => setLeaderEmployeeId(val)}
                options={employeeOptions}
                placeholder="-- PILIH LEADER / PJO (DEFAULT: HEAD LOCATION) --"
                widthClassName="w-full"
                disabled={existingLeaderApproval?.status === 'approved'}
              />
              <p className="text-[10px] text-slate-500 italic">
                Secara otomatis disesuaikan dengan Head Location / PJO di Master Data Lokasi, atau Anda dapat memilih pengawas lain.
              </p>
            </div>

            {/* Approver Tambahan (Tahap 2+) */}
            {additionalApprovers.map((item, idx) => {
              const stepNumber = idx + 2
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-sky-200/90 bg-sky-50/30 p-3 space-y-2 relative animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-black text-white">
                        {stepNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Approver Tambahan (Tahap {stepNumber})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveApprover(item.id)}
                      className="size-7 flex items-center justify-center rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
                      title="Hapus Approver Tambahan"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        Peran / Label Tahap
                      </label>
                      <input
                        type="text"
                        value={item.stepLabel}
                        onChange={(e) => handleUpdateApprover(item.id, { stepLabel: e.target.value })}
                        placeholder="Contoh: Section Head / HSE / PJO"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        Pilih Karyawan
                      </label>
                      <SearchableSelect
                        label={`Pilih Approver Tahap ${stepNumber}`}
                        value={item.employeeId}
                        onValueChange={(val) => handleUpdateApprover(item.id, { employeeId: val })}
                        options={employeeOptions}
                        placeholder="-- PILIH KARYAWAN --"
                        widthClassName="w-full"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-sky-700/80">
                    Approver ini akan menerima hak persetujuan setelah tahap sebelumnya selesai disetujui.
                  </p>
                </div>
              )
            })}

            {/* Button Tambah Approver Tambahan */}
            <button
              type="button"
              onClick={handleAddApprover}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 text-sky-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="size-3.5" />
              + Tambah Approval Tambahan (Pilih Orang)
            </button>
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
            className="h-14 rounded-2xl border-0 bg-[#eaf4fb] text-[#003f78] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            disabled={isSubmitting || isSavingDraft}
            onClick={async () => {
              setIsSavingDraft(true)

              try {
                // 1. Construct complete draft payload immediately from current form state
                const completeDraftPayload: ActivitySyncPayload = {
                  ...draftPayload,
                  photo: queuedPhotoPayloads[0] ?? restoredPhotoPayload ?? null,
                  photos: queuedPhotoPayloads.length > 0 ? queuedPhotoPayloads : (restoredPhotoPayload ? [restoredPhotoPayload] : []),
                  photoUrls: photoPreviewUrls,
                  photoName,
                  serverDraftSessionId: serverDraftSessionId || undefined,
                  selfInputActivities: selectedLibraries.map((lib, index) => {
                    const entry =
                      selfInputEntries[`${lib.id}`] ??
                      buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime)
                    const photos = entry.previewUrls || []
                    return {
                      libraryActivityId: `${lib.id}`,
                      equipmentNo: entry.equipmentNo,
                      startTime: entry.startTime,
                      endTime: entry.endTime,
                      materialUsed: entry.materialUsed,
                      tireCount: entry.tireCount ?? 0,
                      notes: entry.notes,
                      photoName: entry.photoName || (photos.length > 0 ? `${photos.length} foto terlampir` : ''),
                      photoUrl: photos[0] || null,
                      previewUrls: photos,
                      photo: entry.queuedPhotoPayloads?.[0] ?? entry.restoredPhotoPayload ?? null,
                      photos: entry.queuedPhotoPayloads ?? (entry.restoredPhotoPayload ? [entry.restoredPhotoPayload] : []),
                      photoUrls: entry.previewUrls ?? [],
                    }
                  }),
                  routeSessionItems: routeSessionItems.map((item) => {
                    const s = routeItemState[item.routeItemId ?? item.overtimeCommandLetterItemId ?? -1]
                    return {
                      ...item,
                      photoUrl: s?.previewUrls?.[0] || null,
                      previewUrls: s?.previewUrls || [],
                    }
                  }),
                }

                // 2. Save locally immediately (instant response < 50ms)
                const draftKey =
                  activeDraftKey === ACTIVITY_DRAFT_STORAGE_KEY
                    ? createActivityDraftKey()
                    : activeDraftKey
                const localResult = writeDraft(draftKey, completeDraftPayload)
                if (!localResult.ok) {
                  setSubmitState({ kind: 'error', message: localResult.error })
                  toast.error(localResult.error, { duration: 5000 })
                } else {
                  if (draftKey !== ACTIVITY_DRAFT_STORAGE_KEY) {
                    saveActivityDraftIndexEntry(draftKey, completeDraftPayload, serverDraftSessionId || undefined)
                    if (activeDraftKey === ACTIVITY_DRAFT_STORAGE_KEY) {
                      removeActivityDraft(ACTIVITY_DRAFT_STORAGE_KEY)
                    }
                    setActiveDraftKey(draftKey)
                  }
                }

                // 3. Open Success Modal immediately - do NOT make the user wait for network
                window.dispatchEvent(new CustomEvent(ACTIVITY_DRAFTS_CHANGED_EVENT))
                setIsDraftSavedModalOpen(true)
                toast.success('Draft berhasil disimpan!')

                // 4. Background sync to server without blocking the UI
                const currentDraftSessionId = serverDraftSessionId
                void (async () => {
                  try {
                    const itemsSnapshot = selectedLibraries.length > 0
                      ? selectedLibraries.flatMap((lib) => {
                          const entry = selfInputEntries[`${lib.id}`]
                          const unitList = (entry?.equipmentNo || '')
                            .split(/[,;\n\r]+/)
                            .map((u: string) => u.trim())
                            .filter(Boolean)
                          const unitsToCreate = unitList.length > 0 ? unitList : ['']
                          return unitsToCreate.map((u: string) => ({
                            label: `${lib.activityCode} - ${lib.activityName}`,
                            group: lib.activityCode || 'Technical',
                            libraryActivityId: lib.id,
                            unitNumber: u,
                            startedAt: entry?.startTime || defaultStartTime,
                            endedAt: entry?.endTime || defaultEndTime,
                            points: lib.basePoints || 5,
                            remark: entry?.notes || '',
                            materialUsed: entry?.materialUsed || '',
                            photoUrl: entry?.previewUrls?.[0] || null,
                            photos: entry?.previewUrls || [],
                          }))
                        })
                      : sourceMode === 'custom' && customActivityName
                        ? (() => {
                            const customUnits = (equipmentNo || '')
                              .split(/[,;\n\r]+/)
                              .map((u: string) => u.trim())
                              .filter(Boolean)
                            const unitsToCreate = customUnits.length > 0 ? customUnits : ['']
                            return unitsToCreate.map((u: string) => ({
                              label: customActivityName.trim(),
                              group: 'Custom',
                              libraryActivityId: null,
                              unitNumber: u,
                              startedAt: startTime || defaultStartTime,
                              endedAt: endTime || defaultEndTime,
                              points: 5,
                              remark: notes.trim() || customActivityDescription.trim(),
                              materialUsed: materialUsed.trim(),
                              photoUrl: photoPreviewUrls[0] || null,
                              photos: photoPreviewUrls,
                            }))
                          })()
                        : []

                    const res = await saveActivityDraftToServerAction({
                      employeeId,
                      workDate,
                      shiftCode,
                      submissionSource: sourceMode,
                      siteId: site?.id,
                      notes: notes.trim(),
                      summaryRemark: notes.trim(),
                      teamMemberEmployeeIds: isTeamLog ? selectedMemberIds : [],
                      items: itemsSnapshot,
                      existingDraftSessionId: currentDraftSessionId,
                    })

                    if (res.success) {
                      setServerDraftSessionId(res.sessionId)
                      const updatedWithServer = {
                        ...completeDraftPayload,
                        serverDraftSessionId: res.sessionId,
                      }
                      writeDraft(draftKey, updatedWithServer)
                      saveActivityDraftIndexEntry(draftKey, updatedWithServer, res.sessionId)
                      window.dispatchEvent(new CustomEvent(ACTIVITY_DRAFTS_CHANGED_EVENT))
                      toast.success('Draft tersimpan aman di server & lokal!', { id: 'draft-server-sync' })
                    }
                  } catch (srvErr) {
                    console.warn('[MobileDailyActivityForm] Background server draft save warning:', srvErr)
                  }
                })()
              } catch (saveErr: any) {
                console.error('[SaveDraft] Error saving draft:', saveErr)
                toast.error(saveErr?.message || 'Gagal menyimpan draft.')
              } finally {
                setIsSavingDraft(false)
              }
            }}
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            type="submit"
            className="h-14 rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)] font-bold text-xs"
            disabled={isSubmitting || isSavingDraft}
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

        {/* ── Popup Modal Sukses: Draft Berhasil di Simpan ── */}
        <Dialog open={isDraftSavedModalOpen} onOpenChange={setIsDraftSavedModalOpen}>
          <DialogContent
            showCloseButton={true}
            className="max-w-[min(400px,92vw)] p-6 rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-2xl z-50 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-2 ring-8 ring-emerald-50/50 shadow-xs">
              <CheckCircle2 className="size-9 stroke-[2.5]" />
            </div>

            <DialogHeader className="space-y-1.5 text-center sm:text-center mt-2">
              <DialogTitle className="text-lg font-black tracking-tight text-[#003461]">
                Draft Berhasil di Simpan
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-600">
                Data aktivitas harian dan foto evidence Anda telah tersimpan dengan aman.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 w-full rounded-2xl bg-slate-50/80 border border-slate-100 p-3.5 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold text-slate-500">Tanggal Kerja:</span>
                <span className="font-bold text-slate-900">{workDate || 'Hari ini'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold text-slate-500">Total Aktivitas:</span>
                <span className="font-bold text-slate-900">
                  {selectedLibraries.length || (sourceMode === 'custom' ? 1 : 0) || routeSessionItems.filter((i) => i.isChecked).length || 1} item
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold text-slate-500">Foto Evidence:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  ✓ Tersimpan di Draft
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-1">
              <Button
                type="button"
                className="h-12 w-full rounded-2xl bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs shadow-md shadow-blue-900/10 cursor-pointer active:scale-95 transition-all"
                onClick={() => {
                  setIsDraftSavedModalOpen(false)
                  if (onOpenDraftTab) {
                    onOpenDraftTab()
                  }
                }}
              >
                <FileText className="size-4 mr-1.5" />
                Buka Tab Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer active:scale-95 transition-all"
                onClick={() => setIsDraftSavedModalOpen(false)}
              >
                Lanjut Mengedit
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                  ? selectedLibraries.flatMap((lib, idx) => {
                      const entry = selfInputEntries[`${lib.id}`]
                      const durationStr = lib.requiresDuration && entry?.startTime && entry?.endTime ? `${entry.startTime} - ${entry.endTime}` : '-'
                      const photoUrl = entry?.previewUrls?.[0] || null
                      const unitList = (entry?.equipmentNo || '')
                        .split(/[,;\n\r]+/)
                        .map((u) => u.trim())
                        .filter(Boolean)
                      const unitsToCreate = unitList.length > 0 ? unitList : ['—']
                      return unitsToCreate.map((u: string, uIdx: number) => ({
                        id: `${lib.id}-${uIdx}`,
                        label: `${lib.activityCode} - ${lib.activityName}`,
                        unitNumber: lib.requiresEquipmentNo ? u : '—',
                        duration: lib.requiresDuration ? durationStr : '—',
                        tireCount: lib.requiresTireCount ? (entry?.tireCount ?? 0) : 0,
                        materialUsed: lib.requiresMaterialUsed ? (entry?.materialUsed || '-') : '—',
                        requiresEquipmentNo: lib.requiresEquipmentNo,
                        requiresDuration: lib.requiresDuration,
                        requiresTireCount: lib.requiresTireCount,
                        requiresMaterialUsed: lib.requiresMaterialUsed,
                        points: lib.basePoints || 5,
                        remark: entry?.notes || '-',
                        photoUrl,
                      }))
                    })
                  : sourceMode === 'custom' && customActivityName
                  ? (() => {
                      const customUnits = (equipmentNo || '')
                        .split(/[,;\n\r]+/)
                        .map((u: string) => u.trim())
                        .filter(Boolean)
                      const unitsToCreate = customUnits.length > 0 ? customUnits : ['—']
                      const durationStr = startTime && endTime ? `${startTime} - ${endTime}` : '-'
                      return unitsToCreate.map((u: string, uIdx: number) => ({
                        id: `custom-${uIdx}`,
                        label: customActivityName.trim(),
                        unitNumber: u,
                        duration: durationStr,
                        tireCount: 0,
                        materialUsed: materialUsed || '—',
                        requiresEquipmentNo: true,
                        requiresDuration: true,
                        requiresTireCount: false,
                        requiresMaterialUsed: Boolean(materialUsed),
                        points: 5,
                        remark: notes.trim() || customActivityDescription.trim() || '-',
                        photoUrl: photoPreviewUrls[0] || null,
                      }))
                    })()
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
                const initialTeamNames = Array.isArray(initialSessionData?.teamMembers)
                  ? initialSessionData.teamMembers.map((m: any) => m.name || m.employeeName).filter(Boolean).join(', ')
                  : (initialSessionData?.teamMembersSummary || initialSessionData?.teamNameList || '')

                const fallbackTeamMatch = (initialSessionData?.summaryRemark || initialSessionData?.notes || '').match(/\[Team:\s*([^\]]+)\]/i)
                const teamSummary = (isTeamLog && selectedMemberIds.length > 0)
                  ? teamMembers?.filter((m) => selectedMemberIds.includes(m.id)).map((m) => m.name).join(', ') || initialTeamNames || (fallbackTeamMatch ? fallbackTeamMatch[1].trim() : '')
                  : (initialTeamNames || (fallbackTeamMatch ? fallbackTeamMatch[1].trim() : ''))

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
                                <td className="text-left font-medium text-slate-900">
                                  <div>{item.label}</div>
                                  {(item.requiresTireCount || item.requiresMaterialUsed || item.requiresEquipmentNo) ? (
                                    <div className="text-[6.5pt] font-semibold text-slate-500 mt-0.5 leading-tight">
                                      {item.requiresEquipmentNo ? `Unit: ${item.unitNumber} • ` : ''}
                                      {item.requiresTireCount ? `Tire: ${item.tireCount} • ` : ''}
                                      {item.requiresMaterialUsed ? `Material: ${item.materialUsed}` : ''}
                                    </div>
                                  ) : null}
                                </td>
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
                          {teamSummary ? (
                            <div className="mt-1 px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-[6.5pt] text-purple-900 max-w-[90%] leading-tight text-center">
                              <span className="font-bold">Mewakili Tim:</span>
                              <div className="truncate text-purple-800">{teamSummary}</div>
                            </div>
                          ) : null}
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

                      {/* Evidence QR in Bottom Right Corner (Clickable to open floating modal, only if photo evidence exists) */}
                      {(() => {
                        const hasEvidence = (previewItemsList || []).some((item: any) =>
                          Boolean(
                            (typeof item?.photoUrl === 'string' && item.photoUrl.trim().length > 0) ||
                            (Array.isArray(item?.photos) && item.photos.length > 0) ||
                            (Array.isArray(item?.evidenceUrls) && item.evidenceUrls.length > 0)
                          )
                        )
                        if (!hasEvidence) return null

                        return (
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
                        )
                      })()}

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
