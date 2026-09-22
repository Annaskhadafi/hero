import { haversineDistanceMeters } from '@/lib/location'
import { resolveTimezoneIana } from '@/lib/indonesia-timezone'
import { minutesFromTime } from './attendance-real'

export type AttendancePunch = {
  id?: number | string | null
  eventType: string
  eventTime: Date | string
  latitude?: string | number | null
  longitude?: string | number | null
  locationNote?: string | null
}

export type AttendanceSiteBoundary = {
  geoLatitude?: string | number | null
  geoLongitude?: string | number | null
  geoRadiusMeters?: string | number | null
}

export type AttendancePunchSelection<T extends AttendancePunch> = {
  checkIn: T | null
  checkOut: T | null
  checkIns: T[]
  checkOuts: T[]
}

type Candidate<T extends AttendancePunch> = {
  record: T
  time: number | null
  distance: number | null
  hasGps: boolean
  sourceIndex: number
}

function numberValue(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function coordinate(value: string | number | null | undefined, min: number, max: number) {
  const parsed = numberValue(value)
  return parsed !== null && parsed >= min && parsed <= max ? parsed : null
}

function eventTimeValue(value: Date | string) {
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function clockMinutes(value: Date | string, timeZone?: string) {
  if (typeof value === 'string') {
    const direct = minutesFromTime(value)
    if (direct !== null && /^\d{1,2}[:.]\d{2}$/.test(value.trim())) return direct
    const parsed = new Date(value)
    if (!Number.isFinite(parsed.getTime())) return null
    value = parsed
  }

  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return null
  if (timeZone) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: resolveTimezoneIana(timeZone),
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(value)
    return (
      Number(parts.find((part) => part.type === 'hour')?.value) * 60 +
      Number(parts.find((part) => part.type === 'minute')?.value)
    )
  }
  return value.getHours() * 60 + value.getMinutes()
}

function circularMinutesDifference(actual: number, scheduled: number) {
  const difference = Math.abs(actual - scheduled)
  return Math.min(difference, 24 * 60 - difference)
}

function isAttendanceCheckout(eventType: string) {
  const normalized = eventType.toLowerCase()
  return (
    normalized.includes('out') || normalized.includes('pulang') || normalized.includes('checkout')
  )
}

function compareTime(
  a: Candidate<AttendancePunch>,
  b: Candidate<AttendancePunch>,
  checkout: boolean
) {
  if (a.time === null && b.time === null) return a.sourceIndex - b.sourceIndex
  if (a.time === null) return 1
  if (b.time === null) return -1
  return checkout ? b.time - a.time : a.time - b.time
}

function rankCandidates<T extends AttendancePunch>(
  records: T[],
  checkout: boolean,
  boundary: { latitude: number; longitude: number } | null,
  scheduledMinutes: number | null,
  timeZone?: string
) {
  const candidates = records.map((record, sourceIndex): Candidate<T> => {
    const latitude = coordinate(record.latitude, -90, 90)
    const longitude = coordinate(record.longitude, -180, 180)
    const hasGps = latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0)
    return {
      record,
      time: eventTimeValue(record.eventTime),
      distance:
        hasGps && boundary
          ? haversineDistanceMeters(latitude!, longitude!, boundary.latitude, boundary.longitude)
          : null,
      hasGps,
      sourceIndex,
    }
  })

  const hasUsableGps = boundary !== null && candidates.some((candidate) => candidate.hasGps)
  candidates.sort((a, b) => {
    if (hasUsableGps) {
      if (a.hasGps !== b.hasGps) return a.hasGps ? -1 : 1
      if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
        return a.distance - b.distance
      }
      return compareTime(a, b, checkout)
    }

    if (!checkout && scheduledMinutes !== null) {
      const aMinutes = clockMinutes(a.record.eventTime, timeZone)
      const bMinutes = clockMinutes(b.record.eventTime, timeZone)
      if (aMinutes !== null && bMinutes !== null) {
        const difference =
          circularMinutesDifference(aMinutes, scheduledMinutes) -
          circularMinutesDifference(bMinutes, scheduledMinutes)
        if (difference !== 0) return difference
      } else if (aMinutes !== null || bMinutes !== null) {
        return aMinutes !== null ? -1 : 1
      }
    }
    return compareTime(a, b, checkout)
  })

  return candidates.map((candidate) => candidate.record)
}

export function selectAttendancePunches<T extends AttendancePunch>(
  records: readonly T[],
  options: {
    site?: AttendanceSiteBoundary | null
    scheduledClockIn?: string | null
    timeZone?: string
  } = {}
): AttendancePunchSelection<T> {
  const checkIns = records.filter((record) => !isAttendanceCheckout(record.eventType))
  const checkOuts = records.filter((record) => isAttendanceCheckout(record.eventType))
  const latitude = coordinate(options.site?.geoLatitude, -90, 90)
  const longitude = coordinate(options.site?.geoLongitude, -180, 180)
  const radius = numberValue(options.site?.geoRadiusMeters)
  const boundary =
    latitude !== null &&
    longitude !== null &&
    radius !== null &&
    radius > 0 &&
    !(latitude === 0 && longitude === 0)
      ? { latitude, longitude }
      : null
  const scheduledMinutes = options.scheduledClockIn
    ? minutesFromTime(options.scheduledClockIn)
    : null
  const rankedCheckIns = rankCandidates(
    checkIns,
    false,
    boundary,
    scheduledMinutes,
    options.timeZone
  )
  const rankedCheckOuts = rankCandidates(
    checkOuts,
    true,
    boundary,
    scheduledMinutes,
    options.timeZone
  )

  return {
    checkIn: rankedCheckIns[0] ?? null,
    checkOut: rankedCheckOuts[0] ?? null,
    checkIns: rankedCheckIns,
    checkOuts: rankedCheckOuts,
  }
}
