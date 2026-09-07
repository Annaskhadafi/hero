export type AttendanceCellStatus =
  | 'present'
  | 'empty'
  | 'sick'
  | 'leave'
  | 'absent'
  | 'off'
  | 'standby'
  | 'field_break'

export type AttendanceCell = {
  status: AttendanceCellStatus
  clockIn: string
  clockOut: string
  note: string
  source?: 'attendance' | 'manual' | 'excel'
}

export function normalizeAttendanceStatus(value?: string | null): AttendanceCellStatus {
  const normalized = (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
  if (!normalized) return 'empty'
  if (normalized === 'empty') return 'empty'
  if (normalized.includes('off') || normalized.includes('libur')) return 'off'
  if (normalized === 'st' || normalized.includes('standby')) return 'standby'
  if (normalized === 'gb' || normalized === 'fb' || normalized.includes('fieldbreak'))
    return 'field_break'
  if (normalized.includes('sakit') || normalized.includes('sick')) return 'sick'
  if (normalized.includes('izin') || normalized.includes('leave') || normalized.includes('cuti'))
    return 'leave'
  if (
    normalized.includes('alpha') ||
    normalized.includes('alfa') ||
    normalized.includes('alpa') ||
    normalized.includes('absent')
  )
    return 'absent'
  return 'present'
}

export function attendanceStatusLabel(status: AttendanceCellStatus) {
  if (status === 'present') return 'Masuk'
  if (status === 'sick') return 'Sakit'
  if (status === 'leave') return 'Izin'
  if (status === 'absent') return 'Alpha'
  if (status === 'off') return 'OFF'
  if (status === 'standby') return 'ST'
  if (status === 'field_break') return 'GB'
  return '-'
}

export function minutesFromTime(value?: string | null): number | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Check for 12-hour AM/PM format (e.g. "06:24 PM", "6:24 AM", "12:30:00 PM", "6.24 pm")
  const ampmMatch = trimmed.match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s*([aApP][mM])$/i)
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10)
    const minutes = parseInt(ampmMatch[2], 10)
    const isPm = ampmMatch[3].toUpperCase() === 'PM'

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null

    if (isPm && hours < 12) {
      hours += 12
    } else if (!isPm && hours === 12) {
      hours = 0
    }
    return hours * 60 + minutes
  }

  // Check for 24-hour format (e.g. "18:24", "08:00", "18:24:00", "08.00")
  const h24Match = trimmed.match(/^([01]?\d|2[0-3])[:.](\d{2})(?:[:.]\d{2})?$/)
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10)
    const minutes = parseInt(h24Match[2], 10)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
    return hours * 60 + minutes
  }

  return null
}

/**
 * Normalizes any time string (12h AM/PM or 24h) into standard 24-hour "HH:mm" format.
 * "06:24 PM" -> "18:24"
 * "6:24 AM" -> "06:24"
 * "18:24" -> "18:24"
 */
export function normalizeTo24HourTime(value?: string | null): string {
  const minutes = minutesFromTime(value)
  if (minutes === null) return value?.trim() || ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Formats minutes (0-1439) or any time string into 12-hour AM/PM format ("hh:mm A").
 * "18:24" -> "06:24 PM"
 * "08:00" -> "08:00 AM"
 */
export function formatTo12HourTime(value?: string | number | null): string {
  const minutes = typeof value === 'number' ? value : minutesFromTime(value)
  if (minutes === null) return ''
  const h24 = Math.floor(minutes / 60)
  const m = minutes % 60
  const isPm = h24 >= 12
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const suffix = isPm ? 'PM' : 'AM'
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}

export function attendanceHours(cell: AttendanceCell) {
  if (cell.status !== 'present') return 0
  const clockIn = minutesFromTime(cell.clockIn)
  const clockOut = minutesFromTime(cell.clockOut)
  if (clockIn === null || clockOut === null) return 0
  const duration = clockOut >= clockIn ? clockOut - clockIn : clockOut + 24 * 60 - clockIn
  return Math.max(0, Math.round((duration / 60) * 100) / 100)
}

export function calculateAttendanceOvertime(cells: AttendanceCell[], baseHours: number) {
  const totalHours = cells.reduce((sum, cell) => sum + attendanceHours(cell), 0)
  const rawOvertime = Math.max(0, totalHours - baseHours)
  // Rounding rules:
  // decimal >= 0.8 -> round up to next whole number
  // decimal >= 0.5 -> round to x.5
  // decimal < 0.5  -> round down to whole number
  const whole = Math.floor(rawOvertime)
  const decimal = rawOvertime - whole
  const overtime = decimal >= 0.8 ? whole + 1 : decimal >= 0.5 ? whole + 0.5 : whole
  return { totalHours, baseHours, overtime }
}
