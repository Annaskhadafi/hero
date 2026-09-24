import { z } from 'zod'

export const ACTIVITY_DRAFT_STORAGE_KEY = 'hero:draft:activity'
export const ACTIVITY_DRAFT_INDEX_STORAGE_KEY = 'hero:draft:activity:index'
export const ACTIVITY_DRAFTS_CHANGED_EVENT = 'hero:activity-drafts-changed'
export const HSE_OBSERVATION_DRAFT_STORAGE_KEY = 'hero:draft:hse-observation'
export const HSE_EMERGENCY_DRAFT_STORAGE_KEY = 'hero:draft:hse-emergency'

export const OFFLINE_SYNC_MAX_IMAGE_BYTES = 5 * 1024 * 1024

const queuedImageFileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().startsWith('image/', 'File harus berupa gambar.'),
  size: z.number().int().positive().max(OFFLINE_SYNC_MAX_IMAGE_BYTES, 'Ukuran foto maksimal 5MB.'),
  dataUrl: z
    .string()
    .trim()
    .regex(/^data:image\/.+;base64,.+$/, 'Payload foto offline tidak valid.'),
})

const trimmedCoordinate = z
  .string()
  .trim()
  .max(80)
  .optional()
  .default('')
  .refine(
    (value) => !value || Number.isFinite(Number(value)),
    'Koordinat GPS tidak valid.'
  )

const trimmedOptionalText = (max: number) => z.string().trim().max(max).optional().default('')

export type QueuedFilePayload = {
  name: string
  type: string
  size: number
  dataUrl: string
}

export type RouteSessionSyncItem = {
  routeItemId: number | null
  overtimeCommandLetterItemId?: number | null
  libraryActivityId: number | null
  snapshotLabel: string
  snapshotGroupName: string
  snapshotPayload: Record<string, unknown>
  unitNumber: string
  remark: string
  startedAt: string
  endedAt: string
  isChecked: boolean
  actualPoints: number
  tireCount?: number
  materialUsed?: string
  sortOrder: number
  photo?: QueuedFilePayload | null
}

export type ActivitySyncPayload = {
  employeeId: number
  workDate?: string
  draftTitle?: string
  sourceMode: 'assigned' | 'self_input' | 'custom'
  assignmentId: string
  libraryActivityId: string
  selectedLibraryActivityIds?: string[]
  selfInputActivities?: Array<{
    libraryActivityId: string
    equipmentNo: string
    startTime: string
    endTime: string
    materialUsed: string
    tireCount?: number
    notes: string
  }>
  routeTemplateId: string
  overtimeCommandLetterId: string
  routeShiftCode: string
  routeSummaryRemark: string
  routeSessionItems: RouteSessionSyncItem[]
  customActivityName: string
  customActivityDescription: string
  equipmentNo: string
  tireCount?: number
  startTime: string
  endTime: string
  materialUsed: string
  notes: string
  manualLocation: string
  locationName: string
  gpsLat: string
  gpsLng: string
  gpsValid: boolean
  boundaryStatus: 'inside' | 'outside' | 'unconfigured' | 'unknown'
  boundaryMessage: string
  photo: QueuedFilePayload | null
  photos?: QueuedFilePayload[]
  photoUrls?: string[]
  teamMemberEmployeeIds?: number[]
}

export type ActivityDraftIndexEntry = {
  key: string
  title: string
  workDate: string
  updatedAt: string
  itemCount: number
}

function activityDraftTitle(payload: Partial<ActivitySyncPayload>) {
  return (
    payload.draftTitle?.trim() ||
    payload.customActivityName?.trim() ||
    payload.routeSessionItems?.find((item) => item.isChecked)?.snapshotLabel?.trim() ||
    payload.libraryActivityId?.trim() ||
    'Daily Activity'
  )
}

function activityDraftItemCount(payload: Partial<ActivitySyncPayload>) {
  const checkedCount = payload.routeSessionItems?.filter((item) => item.isChecked).length ?? 0
  return checkedCount || payload.selectedLibraryActivityIds?.length || (payload.libraryActivityId ? 1 : 0)
}

export function getActivityDraftIndex(): ActivityDraftIndexEntry[] {
  if (typeof window === 'undefined') return []

  let parsed: unknown
  try {
    const raw = window.localStorage.getItem(ACTIVITY_DRAFT_INDEX_STORAGE_KEY)
    parsed = raw ? JSON.parse(raw) : []
  } catch {
    parsed = []
  }

  const entries = Array.isArray(parsed)
    ? parsed.filter(
        (entry): entry is ActivityDraftIndexEntry =>
          Boolean(entry) &&
          typeof entry.key === 'string' &&
          typeof entry.updatedAt === 'string'
      )
    : []

  if (entries.some((entry) => entry.key === ACTIVITY_DRAFT_STORAGE_KEY)) return entries

  try {
    const legacyRaw = window.localStorage.getItem(ACTIVITY_DRAFT_STORAGE_KEY)
    if (!legacyRaw) return entries
    const legacy = JSON.parse(legacyRaw) as Partial<ActivitySyncPayload>
    return [
      {
        key: ACTIVITY_DRAFT_STORAGE_KEY,
        title: activityDraftTitle(legacy),
        workDate: legacy.workDate || '',
        updatedAt: new Date().toISOString(),
        itemCount: activityDraftItemCount(legacy),
      },
      ...entries,
    ]
  } catch {
    return entries
  }
}

export function createActivityDraftKey() {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${ACTIVITY_DRAFT_STORAGE_KEY}:${id}`
}

export function saveActivityDraftIndexEntry(
  key: string,
  payload: Partial<ActivitySyncPayload>
) {
  if (typeof window === 'undefined') return
  const nextEntry: ActivityDraftIndexEntry = {
    key,
    title: activityDraftTitle(payload),
    workDate: payload.workDate || '',
    updatedAt: new Date().toISOString(),
    itemCount: activityDraftItemCount(payload),
  }
  const next = [nextEntry, ...getActivityDraftIndex().filter((entry) => entry.key !== key)]
  try {
    window.localStorage.setItem(ACTIVITY_DRAFT_INDEX_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(ACTIVITY_DRAFTS_CHANGED_EVENT))
  } catch {
    // The draft payload itself has already been saved; history can retry on the next edit.
  }
}

export function removeActivityDraft(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
    const next = getActivityDraftIndex().filter((entry) => entry.key !== key)
    window.localStorage.setItem(ACTIVITY_DRAFT_INDEX_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(ACTIVITY_DRAFTS_CHANGED_EVENT))
  } catch {}
}

export type AttendanceSyncPayload = {
  clientRequestId?: string
  type: 'checked-in' | 'checked-out'
  latitude: string
  longitude: string
  locationName: string
  shiftCode: string
  workMode: string
  attendanceContext: string
  overtimeMinutes: string
  operationalNote: string
  photo: QueuedFilePayload
}

const optionalClientRequestId = z.string().trim().max(120).optional().default('')

export const attendanceSyncPayloadSchema = z.object({
  clientRequestId: optionalClientRequestId,
  type: z.enum(['checked-in', 'checked-out']),
  latitude: trimmedCoordinate,
  longitude: trimmedCoordinate,
  locationName: z.string().trim().min(2).max(160),
  shiftCode: z.string().trim().min(1).max(40),
  workMode: z.string().trim().min(2).max(80),
  attendanceContext: z.string().trim().min(2).max(120),
  overtimeMinutes: z
    .string()
    .trim()
    .refine(
      (value) =>
        value.length > 0 &&
        Number.isInteger(Number(value)) &&
        Number(value) >= 0 &&
        Number(value) <= 1440,
      'Lembur harus berupa angka 0-1440 menit.'
    ),
  operationalNote: z.string().trim().max(160).optional().default(''),
  photo: queuedImageFileSchema,
})

export type HseObservationSyncPayload = {
  title: string
  category: string
  severity: string
  notes: string
  location: string
  latitude: string
  longitude: string
}

export const hseObservationSyncPayloadSchema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  severity: z.string().trim().min(2).max(40),
  notes: z.string().trim().min(3).max(1200),
  location: z.string().trim().min(2).max(160),
  latitude: trimmedCoordinate,
  longitude: trimmedCoordinate,
})

export type EmergencyIncidentSyncPayload = {
  clientRequestId?: string
  title: string
  type: string
  impact: string
  status: string
  unitNumber: string
  location: string
  notes: string
  latitude: string
  longitude: string
  photo: QueuedFilePayload | null
}

export const emergencyIncidentSyncPayloadSchema = z.object({
  clientRequestId: optionalClientRequestId,
  title: z.string().trim().min(3).max(160),
  type: z.string().trim().min(2).max(80),
  impact: z.string().trim().min(2).max(80),
  status: z.string().trim().min(2).max(40),
  unitNumber: trimmedOptionalText(80),
  location: z.string().trim().min(2).max(160),
  notes: z.string().trim().min(3).max(1200),
  latitude: trimmedCoordinate,
  longitude: trimmedCoordinate,
  photo: queuedImageFileSchema.nullable(),
})

export const activitySyncPayloadSchema = z.object({
  employeeId: z.number().int().positive(),
  workDate: z.string().trim().max(40).optional().default(''),
  sourceMode: z.enum(['assigned', 'self_input', 'custom']),
  assignmentId: trimmedOptionalText(80),
  libraryActivityId: trimmedOptionalText(80),
  selectedLibraryActivityIds: z.array(z.string().trim().min(1).max(80)).optional(),
  selfInputActivities: z
    .array(
      z.object({
        libraryActivityId: z.string().trim().min(1).max(80),
        equipmentNo: trimmedOptionalText(80),
        startTime: z.string().trim().min(1).max(80),
        endTime: z.string().trim().min(1).max(80),
        materialUsed: trimmedOptionalText(500),
        tireCount: z.number().int().min(0).max(100).optional().default(0),
        notes: trimmedOptionalText(1200),
      })
    )
    .optional(),
  routeTemplateId: trimmedOptionalText(80),
  overtimeCommandLetterId: trimmedOptionalText(80),
  routeShiftCode: trimmedOptionalText(24),
  routeSummaryRemark: trimmedOptionalText(1200),
  routeSessionItems: z.array(
    z.object({
      routeItemId: z.number().int().positive().nullable(),
      overtimeCommandLetterItemId: z.number().int().positive().nullable().optional(),
      libraryActivityId: z.number().int().positive().nullable(),
      snapshotLabel: z.string().trim().min(1).max(160),
      snapshotGroupName: trimmedOptionalText(160),
      snapshotPayload: z.record(z.string(), z.unknown()),
      unitNumber: trimmedOptionalText(80),
      remark: trimmedOptionalText(1200),
      startedAt: trimmedOptionalText(80),
      endedAt: trimmedOptionalText(80),
      isChecked: z.boolean(),
      actualPoints: z.number().int().min(0).max(5000),
      tireCount: z.number().int().min(0).max(100).optional().default(0),
      materialUsed: trimmedOptionalText(500),
      sortOrder: z.number().int().min(0).max(9999),
    })
  ),
  customActivityName: trimmedOptionalText(160),
  customActivityDescription: trimmedOptionalText(1200),
  equipmentNo: trimmedOptionalText(80),
  tireCount: z.number().int().min(0).max(100).optional().default(0),
  startTime: z.string().trim().min(1).max(80),
  endTime: z.string().trim().min(1).max(80),
  materialUsed: trimmedOptionalText(500),
  notes: trimmedOptionalText(1200),
  manualLocation: trimmedOptionalText(160),
  locationName: trimmedOptionalText(160),
  gpsLat: trimmedCoordinate,
  gpsLng: trimmedCoordinate,
  gpsValid: z.boolean(),
  boundaryStatus: z.enum(['inside', 'outside', 'unconfigured', 'unknown']),
  boundaryMessage: trimmedOptionalText(240),
  photo: queuedImageFileSchema.nullable(),
  photos: z.array(queuedImageFileSchema).optional().default([]),
  photoUrls: z.array(z.string().url().max(2000)).optional().default([]),
  teamMemberEmployeeIds: z.array(z.number().int().positive()).optional().default([]),
})

export function parseOfflineSyncPayload<T>(schema: z.ZodType<T>, payload: unknown): T {
  return schema.parse(payload)
}
