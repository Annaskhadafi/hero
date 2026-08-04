/**
 * Multi Attendance — Setup Data API
 * GET /api/multi-attendance/setup
 *
 * Returns available sites from Master Data (`hero_sites`) and shift options
 * from Attendance Master Shift configuration (`hero_master_attendance_shifts`).
 * Public endpoint (no auth required).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { masterAttendanceShifts, sites } from '@/db/schema/hero'
import { asc } from 'drizzle-orm'

export interface MultiAttendanceSetupResponse {
  sites: { id: number; name: string; location: string }[]
  shifts: { code: string; label: string; windowLabel: string; helper: string }[]
}

const DEFAULT_SHIFTS = [
  { code: 'day', label: 'Morning Shift', windowLabel: '07:00 - 15:00', helper: 'Shift Pagi (Sesuai Roster)' },
  { code: 'afternoon', label: 'Afternoon Shift', windowLabel: '15:00 - 23:00', helper: 'Shift Sore (Sesuai Roster)' },
  { code: 'night', label: 'Night Shift', windowLabel: '23:00 - 07:00', helper: 'Shift Malam (Sesuai Roster)' },
]

export async function GET(req: NextRequest) {
  let siteList: { id: number; name: string; location: string }[] = []
  let shiftList: { code: string; label: string; windowLabel: string; helper: string }[] = []

  // 1. Fetch Master Data Sites
  try {
    const rawSites = await db
      .select({
        id: sites.id,
        name: sites.name,
        location: sites.location,
      })
      .from(sites)
      .orderBy(asc(sites.name))

    siteList = rawSites.map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location || s.name || 'Lokasi Site Master Data',
    }))
  } catch (err: any) {
    console.error('[multi-attendance/setup] sites direct query failed:', err)
  }

  // 2. Fetch Master Attendance Shifts & Rosters
  try {
    const rawShifts = await db
      .select({
        code: masterAttendanceShifts.code,
        label: masterAttendanceShifts.label,
        startTime: masterAttendanceShifts.startTime,
        endTime: masterAttendanceShifts.endTime,
        windowLabel: masterAttendanceShifts.windowLabel,
        helper: masterAttendanceShifts.helper,
      })
      .from(masterAttendanceShifts)
      .orderBy(asc(masterAttendanceShifts.sortOrder), asc(masterAttendanceShifts.label))

    if (rawShifts && rawShifts.length > 0) {
      shiftList = rawShifts.map((s) => {
        let window = s.windowLabel ? s.windowLabel.trim() : ''
        if (!window && s.startTime && s.endTime) {
          window = `${s.startTime} - ${s.endTime}`
        }
        if (!window) {
          window = 'Jam kerja sesuai roster'
        }
        return {
          code: s.code,
          label: s.label,
          windowLabel: window,
          helper: s.helper || 'Sesuai Roster & Konfigurasi Attendance',
        }
      })
    }
  } catch (err: any) {
    console.error('[multi-attendance/setup] shifts direct query failed:', err)
  }

  // Fallback shifts if DB table is empty
  if (shiftList.length === 0) {
    shiftList = DEFAULT_SHIFTS
  }

  return NextResponse.json<MultiAttendanceSetupResponse>(
    {
      sites: siteList,
      shifts: shiftList,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
