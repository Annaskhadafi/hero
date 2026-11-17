import type {
  ActivityTaskItem,
  EmployeeActivityRow,
} from '@/lib/daily-activity-dashboard'

export interface MobileDarSourceEmployeeFallback {
  id?: number | null
  name?: string | null
  employeeSn?: string | null
  sn?: string | null
  jobTitle?: string | null
  department?: string | null
  section?: string | null
  siteId?: number | null
  siteName?: string | null
}

export function formatTimestampToHHmm(value?: Date | string | null): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const timeOnly = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
    if (timeOnly) {
      return `${timeOnly[1].padStart(2, '0')}:${timeOnly[2]}`
    }
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const hh = parts.find((p) => p.type === 'hour')?.value
    const mm = parts.find((p) => p.type === 'minute')?.value
    if (hh && mm) {
      const normalizedHour = hh === '24' ? '00' : hh
      return `${normalizedHour}:${mm}`
    }
  } catch {
    // Fallback to local time
  }
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function normalizeMobileDateToYmd(value?: Date | string | null): string {
  if (!value) return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim()
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function normalizeMobileShiftLabel(shiftCode?: string | null): 'Pagi' | 'Siang' | 'Malam' {
  const s = (shiftCode || '').trim().toLowerCase()
  if (s === '2' || s === 'ns' || s.includes('malam') || s.includes('night')) return 'Malam'
  if (s === 'siang' || s === 's2' || s.includes('afternoon')) return 'Siang'
  return 'Pagi'
}

function extractItemPhotos(it: any): string[] {
  const urls: string[] = []
  const pushUrl = (u: any) => {
    const str = typeof u === 'string' ? u : u?.url || u?.dataUrl || ''
    if (typeof str === 'string' && str.trim()) {
      urls.push(str.trim())
    }
  }
  if (it?.photoUrl) pushUrl(it.photoUrl)
  if (Array.isArray(it?.photos)) it.photos.forEach(pushUrl)
  if (Array.isArray(it?.photoUrls)) it.photoUrls.forEach(pushUrl)
  if (it?.snapshotPayload) {
    try {
      const parsed = typeof it.snapshotPayload === 'string'
        ? JSON.parse(it.snapshotPayload)
        : it.snapshotPayload
      if (parsed?.photoUrl) pushUrl(parsed.photoUrl)
      if (Array.isArray(parsed?.photos)) parsed.photos.forEach(pushUrl)
      if (Array.isArray(parsed?.photoUrls)) parsed.photoUrls.forEach(pushUrl)
    } catch {
      // Ignore malformed JSON payload
    }
  }
  return Array.from(new Set(urls))
}

/**
 * Maps a mobile DAR history item or approval/review session document into
 * the unified EmployeeActivityRow shape consumed by DailyActivityCreateSplModal.
 */
export function mapMobileDarToEmployeeActivityRow(
  source: any,
  fallbackEmployee?: MobileDarSourceEmployeeFallback | null
): EmployeeActivityRow {
  const sessionId = Number(source?.sessionId || source?.id || 0) || undefined
  const rawItems: any[] = Array.isArray(source?.items)
    ? source.items
    : Array.isArray(source?.sessionItems)
      ? source.sessionItems
      : []

  const workDateYmd = normalizeMobileDateToYmd(source?.workDate || source?.rawWorkDate)
  const shift = normalizeMobileShiftLabel(source?.shiftCode || source?.shift)

  const tasks: ActivityTaskItem[] = rawItems.map((it, idx) => {
    const photos = extractItemPhotos(it)
    const label = it?.label || it?.snapshotLabel || source?.title || 'Pekerjaan Harian'
    const unit = (it?.unitNumber || '').trim()
    const startedAt = formatTimestampToHHmm(it?.startedAt) || it?.startTime || undefined
    const endedAt = formatTimestampToHHmm(it?.endedAt) || it?.endTime || undefined

    return {
      id: Number(it?.id || idx + 1),
      sessionId,
      sessionCode: source?.sessionCode,
      label,
      groupName: it?.snapshotGroupName || it?.group || 'Technical',
      unitNumber: unit || '-',
      status: 'Selesai',
      progress: 100,
      startedAt,
      endedAt,
      durationLabel: it?.duration || undefined,
      points: Number(it?.actualPoints ?? it?.points ?? 10) || 10,
      remarks: (it?.remark || it?.remarks || '').trim(),
      photoUrl: photos[0] || null,
      photos,
    }
  })

  const allUnits = Array.from(
    new Set(
      tasks
        .map((t) => (t.unitNumber || '').trim())
        .filter((u) => Boolean(u) && u !== '-')
    )
  )

  const checkInTime =
    tasks.map((t) => t.startedAt).filter((v): v is string => Boolean(v))[0] ||
    formatTimestampToHHmm(source?.startTime) ||
    '-'
  const endedTimes = tasks.map((t) => t.endedAt).filter((v): v is string => Boolean(v))
  const checkOutTime =
    endedTimes[endedTimes.length - 1] ||
    formatTimestampToHHmm(source?.endTime) ||
    '-'

  const empObj = source?.employee || {}
  const empDbId = Number(
    empObj?.id || source?.employeeId || source?.authorEmployeeId || fallbackEmployee?.id || 0
  ) || undefined
  const empSn = String(
    empObj?.employeeSn || empObj?.sn || source?.employeeSn || fallbackEmployee?.employeeSn || fallbackEmployee?.sn || '-'
  )
  const empName = String(
    empObj?.name || source?.employeeName || fallbackEmployee?.name || 'Karyawan'
  )
  const jobTitle = String(
    empObj?.jobTitle || source?.jobTitle || fallbackEmployee?.jobTitle || 'Serviceman'
  )
  const department = String(
    empObj?.department || source?.department || fallbackEmployee?.department || 'Operations'
  )
  const siteId = Number(
    source?.site?.id || source?.siteId || fallbackEmployee?.siteId || 0
  ) || undefined
  const siteName = String(
    source?.site?.name || source?.siteName || fallbackEmployee?.siteName || 'Site Operasional'
  )

  return {
    sessionId,
    employeeDbId: empDbId,
    rawWorkDate: workDateYmd,
    employeeId: empSn,
    name: empName,
    jobTitle,
    department,
    section: empObj?.section || fallbackEmployee?.section || undefined,
    siteId,
    siteName,
    customerName: source?.customerName || source?.site?.customerName || undefined,
    workDate: workDateYmd,
    shift,
    checkInTime,
    checkOutTime,
    primaryActivity: tasks[0]?.label || source?.title || source?.label || 'Aktivitas Operasional',
    unitTireId: allUnits[0] || source?.unitNumber || '-',
    allUnits,
    status: 'Selesai',
    progress: 100,
    lastUpdate: workDateYmd,
    sessionsCount: 1,
    tasksCount: tasks.length,
    totalPoints: tasks.reduce((sum, t) => sum + (t.points || 0), 0),
    tasks,
    sessions: sessionId
      ? [
          {
            id: sessionId,
            sessionCode: source?.sessionCode || `DAS-${sessionId}`,
            shiftCode: source?.shiftCode || '1',
            workDate: workDateYmd,
            status: source?.status || 'submitted',
            summaryRemark: source?.summaryRemark || source?.notes || source?.remarks || '',
            unitNumbers: allUnits,
            taskCount: tasks.length,
          },
        ]
      : [],
    ewhActualHours: 0,
    ewhTargetHours: 8,
    ewhLabel: '-',
    ewhPercentage: 100,
    isRosterOff: (source?.shiftCode || '').toUpperCase() === 'OFF',
    splId: source?.splId || source?.overtimeCommandLetterId || undefined,
    splNumber: source?.splNumber || undefined,
    splStatus: source?.splStatus || undefined,
  }
}
