export type AttendanceSource = 'attendance' | 'excel' | 'manual'

export const SOURCE_PRIORITY: Record<AttendanceSource, number> = {
  attendance: 3, // highest — face/device attendance
  excel: 2,
  manual: 1, // lowest
}

export interface SourceRecord {
  source: AttendanceSource
  clockIn: string
  clockOut: string
  updatedAt: Date
}

export interface ConflictResolution {
  winner: AttendanceSource
  hasConflict: boolean
  allSources: SourceRecord[]
}

/**
 * Given multiple override records for the same employee+day,
 * returns the winning source based on priority.
 * If priorities are equal, the most recently updated record wins.
 */
export function resolveAttendanceConflict(overrides: SourceRecord[]): ConflictResolution {
  if (overrides.length <= 1) {
    return {
      winner: overrides[0]?.source ?? 'manual',
      hasConflict: false,
      allSources: overrides,
    }
  }

  // Sort by priority descending, then by updatedAt descending as tiebreaker
  const sorted = [...overrides].sort((a, b) => {
    const priorityDiff = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]
    if (priorityDiff !== 0) return priorityDiff
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  return {
    winner: sorted[0].source,
    hasConflict: true,
    allSources: overrides,
  }
}

/**
 * Returns true if the incoming source has equal or higher priority
 * than the existing source — meaning it should overwrite.
 */
export function shouldOverwrite(
  existingSource: AttendanceSource,
  incomingSource: AttendanceSource
): boolean {
  return SOURCE_PRIORITY[incomingSource] >= SOURCE_PRIORITY[existingSource]
}
