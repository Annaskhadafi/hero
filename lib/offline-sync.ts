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
  previewUrl?: string
  url?: string
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
  photos?: QueuedFilePayload[]
  photoUrls?: string[]
  photoUrl?: string | null
  previewUrls?: string[]
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
    photoName?: string
    photoUrl?: string | null
    photoUrls?: string[]
    previewUrls?: string[]
    photo?: QueuedFilePayload | null
    photos?: QueuedFilePayload[]
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
  photoName?: string
  teamMemberEmployeeIds?: number[]
  serverDraftSessionId?: number
  leaderEmployeeId?: string | number
  leaderName?: string
  superiorEmployeeId?: string | number
  superiorName?: string
  additionalApprovers?: Array<{
    id: string
    employeeId: string
    role?: string
    stepLabel?: string
  }>
}

export type ActivityDraftIndexEntry = {
  key: string
  title: string
  workDate: string
  updatedAt: string
  itemCount: number
  serverDraftSessionId?: number
  photoUrls?: string[]
}

export function extractDraftPhotos(payload: Partial<ActivitySyncPayload>): string[] {
  const remoteUrls: string[] = []
  const dataUrls: string[] = []

  const addUrl = (u: unknown) => {
    if (typeof u !== 'string') return
    const trimmed = u.trim()
    if (!trimmed || trimmed.startsWith('blob:')) return
    if (trimmed.startsWith('/api/') || trimmed.startsWith('http')) {
      if (!remoteUrls.includes(trimmed)) remoteUrls.push(trimmed)
    } else if (trimmed.startsWith('data:')) {
      if (!dataUrls.includes(trimmed)) dataUrls.push(trimmed)
    }
  }

  if (Array.isArray(payload.photoUrls)) {
    payload.photoUrls.forEach(addUrl)
  }

  if (Array.isArray(payload.photos)) {
    for (const p of payload.photos) {
      addUrl(p?.previewUrl || p?.url || p?.dataUrl)
    }
  }

  if (payload.photo) {
    addUrl(payload.photo.previewUrl || payload.photo.url || payload.photo.dataUrl)
  }

  if (Array.isArray(payload.selfInputActivities)) {
    for (const act of payload.selfInputActivities) {
      if (Array.isArray(act.previewUrls)) act.previewUrls.forEach(addUrl)
      if (Array.isArray(act.photoUrls)) act.photoUrls.forEach(addUrl)
      if (act.photoUrl) addUrl(act.photoUrl)
      if (act.photo) addUrl(act.photo.previewUrl || act.photo.url || act.photo.dataUrl)
      if (Array.isArray(act.photos)) {
        for (const p of act.photos) {
          addUrl(p?.previewUrl || p?.url || p?.dataUrl)
        }
      }
    }
  }

  if (Array.isArray(payload.routeSessionItems)) {
    for (const item of payload.routeSessionItems) {
      if (Array.isArray(item.previewUrls)) item.previewUrls.forEach(addUrl)
      if (Array.isArray(item.photoUrls)) item.photoUrls.forEach(addUrl)
      if (item.photoUrl) addUrl(item.photoUrl)
      if (item.photo) addUrl(item.photo.previewUrl || item.photo.url || item.photo.dataUrl)
      if (Array.isArray(item.photos)) {
        for (const p of item.photos) {
          addUrl(p?.previewUrl || p?.url || p?.dataUrl)
        }
      }
    }
  }

  // Jika sudah ada remote cloud URL, HANYA gunakan remote cloud URL agar tidak dobel dengan base64 lokal
  return remoteUrls.length > 0 ? remoteUrls : dataUrls
}

function activityDraftTitle(payload: Partial<ActivitySyncPayload>) {
  return (
    payload.draftTitle?.trim() ||
    payload.customActivityName?.trim() ||
    (payload.selfInputActivities && payload.selfInputActivities.length > 0
      ? `${payload.selfInputActivities.length} Aktivitas Mandiri`
      : '') ||
    payload.routeSessionItems?.find((item) => item.isChecked)?.snapshotLabel?.trim() ||
    payload.libraryActivityId?.trim() ||
    'Daily Activity'
  )
}

function activityDraftItemCount(payload: Partial<ActivitySyncPayload>) {
  const checkedCount = payload.routeSessionItems?.filter((item) => item.isChecked).length ?? 0
  return (
    checkedCount ||
    payload.selectedLibraryActivityIds?.length ||
    payload.selfInputActivities?.length ||
    (payload.customActivityName ? 1 : 0) ||
    (payload.libraryActivityId ? 1 : 0)
  )
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
    const legacyPhotos = extractDraftPhotos(legacy)
    return [
      {
        key: ACTIVITY_DRAFT_STORAGE_KEY,
        title: activityDraftTitle(legacy),
        workDate: legacy.workDate || '',
        updatedAt: new Date().toISOString(),
        itemCount: activityDraftItemCount(legacy),
        serverDraftSessionId: legacy.serverDraftSessionId,
        photoUrls: legacyPhotos.length > 0 ? legacyPhotos : undefined,
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
  payload: Partial<ActivitySyncPayload>,
  serverDraftSessionId?: number
) {
  if (typeof window === 'undefined') return
  const extractedPhotos = extractDraftPhotos(payload)
  const nextEntry: ActivityDraftIndexEntry = {
    key,
    title: activityDraftTitle(payload),
    workDate: payload.workDate || '',
    updatedAt: new Date().toISOString(),
    itemCount: activityDraftItemCount(payload),
    serverDraftSessionId: serverDraftSessionId ?? payload.serverDraftSessionId,
    photoUrls: extractedPhotos.length > 0 ? extractedPhotos : undefined,
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
    if (key === ACTIVITY_DRAFT_STORAGE_KEY) {
      window.localStorage.removeItem(ACTIVITY_DRAFT_STORAGE_KEY)
    }

    let parsed: any[] = []
    try {
      const raw = window.localStorage.getItem(ACTIVITY_DRAFT_INDEX_STORAGE_KEY)
      parsed = raw ? JSON.parse(raw) : []
    } catch {
      parsed = []
    }

    const next = Array.isArray(parsed) ? parsed.filter((entry: any) => entry && entry.key !== key) : []
    window.localStorage.setItem(ACTIVITY_DRAFT_INDEX_STORAGE_KEY, JSON.stringify(next))

    // Also check and clean legacy draft if it matches the key or has same id
    try {
      const legacyRaw = window.localStorage.getItem(ACTIVITY_DRAFT_STORAGE_KEY)
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw)
        if (
          key === ACTIVITY_DRAFT_STORAGE_KEY ||
          (legacy?.serverDraftSessionId && key.includes(String(legacy.serverDraftSessionId))) ||
          next.length === 0
        ) {
          window.localStorage.removeItem(ACTIVITY_DRAFT_STORAGE_KEY)
        }
      }
    } catch {}

    window.dispatchEvent(new CustomEvent(ACTIVITY_DRAFTS_CHANGED_EVENT, { detail: { deletedKey: key } }))
  } catch {}
}

export function readDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function stripHeavyBase64FromDraft<T>(value: T): T {
  if (!value || typeof value !== 'object') return value

  try {
    const clone = JSON.parse(JSON.stringify(value))

    const cleanQueuedPhoto = (p: any) => {
      if (!p || typeof p !== 'object') return p
      // Jika sudah ada URL remote cloud (/api/ atau http), buang string dataUrl base64
      if (p.previewUrl || p.url) {
        p.dataUrl = ''
      } else if (typeof p.dataUrl === 'string' && p.dataUrl.length > 50000) {
        // Jika dataUrl base64 terlalu besar (>50KB), kosongkan agar tidak memakan kuota 5MB localStorage
        p.dataUrl = ''
      }
      return p
    }

    const cleanUrls = (urls: any[]) => {
      if (!Array.isArray(urls)) return urls
      const hasRemote = urls.some((u) => typeof u === 'string' && (u.startsWith('/api/') || u.startsWith('http')))
      return urls.filter((u) => {
        if (typeof u !== 'string') return false
        if (hasRemote && u.startsWith('data:')) return false
        if (u.startsWith('data:') && u.length > 50000) return false
        return true
      })
    }

    if (clone.photo) clone.photo = cleanQueuedPhoto(clone.photo)
    if (Array.isArray(clone.photos)) clone.photos = clone.photos.map(cleanQueuedPhoto)
    if (Array.isArray(clone.photoUrls)) clone.photoUrls = cleanUrls(clone.photoUrls)
    if (Array.isArray(clone.previewUrls)) clone.previewUrls = cleanUrls(clone.previewUrls)

    if (Array.isArray(clone.selfInputActivities)) {
      clone.selfInputActivities = clone.selfInputActivities.map((act: any) => {
        if (act.photo) act.photo = cleanQueuedPhoto(act.photo)
        if (Array.isArray(act.photos)) act.photos = act.photos.map(cleanQueuedPhoto)
        if (Array.isArray(act.photoUrls)) act.photoUrls = cleanUrls(act.photoUrls)
        if (Array.isArray(act.previewUrls)) act.previewUrls = cleanUrls(act.previewUrls)
        return act
      })
    }

    if (Array.isArray(clone.routeSessionItems)) {
      clone.routeSessionItems = clone.routeSessionItems.map((item: any) => {
        if (item.photo) item.photo = cleanQueuedPhoto(item.photo)
        if (Array.isArray(item.photos)) item.photos = item.photos.map(cleanQueuedPhoto)
        if (Array.isArray(item.photoUrls)) item.photoUrls = cleanUrls(item.photoUrls)
        if (Array.isArray(item.previewUrls)) item.previewUrls = cleanUrls(item.previewUrls)
        return item
      })
    }

    return clone as T
  } catch {
    return value
  }
}

export function writeDraft<T>(key: string, value: T): { ok: true; error?: never } | { ok: false; error: string } {
  if (typeof window === 'undefined') return { ok: true }
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (error) {
    // If quota exceeded or write failed, strip heavy base64 strings and retry
    try {
      const lightweight = stripHeavyBase64FromDraft(value)
      window.localStorage.setItem(key, JSON.stringify(lightweight))
      return { ok: true }
    } catch (retryError) {
      const detail = retryError instanceof Error && retryError.message.trim() ? ` (${retryError.message.trim()})` : ''
      return {
        ok: false,
        error: `Draft tidak dapat disimpan di perangkat ini. Penyimpanan browser mungkin diblokir atau penuh${detail}.`,
      }
    }
  }
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
        photoName: trimmedOptionalText(200).optional(),
        photoUrl: z.string().optional().nullable(),
        previewUrls: z.array(z.string()).optional().default([]),
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
      photo: queuedImageFileSchema.nullable().optional().default(null),
      photos: z.array(queuedImageFileSchema).optional().default([]),
      photoUrls: z.array(z.string().url().max(2000)).optional().default([]),
      sortOrder: z.number().int().min(0).max(9999),
      photoUrl: z.string().optional().nullable(),
      previewUrls: z.array(z.string()).optional().default([]),
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
