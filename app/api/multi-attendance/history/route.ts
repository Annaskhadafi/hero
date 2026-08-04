/**
 * Multi Attendance — Today's History Feed API
 * GET /api/multi-attendance/history?siteId=X
 *
 * Returns today's attendance records for display on the terminal sidebar.
 * Strictly filters by today's date and deduplicates to keep 1 latest 'checked-in'
 * and 1 latest 'checked-out' entry per employee today.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendanceRecords, employees, sites } from '@/db/schema/hero'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { endOfDay, startOfDay, subHours } from 'date-fns'

export interface MultiAttendanceHistoryEntry {
  id: number
  employee_id: number
  employee_name: string
  employee_sn: string
  job_title: string
  site_name: string
  event_type: string
  event_time: string
  confidence_score: string | null
  location_note: string
}

export interface MultiAttendanceHistoryResponse {
  records: MultiAttendanceHistoryEntry[]
  total: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const siteId = Number(searchParams.get('siteId') ?? '0')

    const now = new Date()
    // Window covers today (with 12h padding for UTC vs WITA/WIB offset)
    const window = {
      start: subHours(startOfDay(now), 12),
      end: endOfDay(now),
    }

    const rows = await db
      .select({
        id: attendanceRecords.id,
        employeeId: attendanceRecords.employeeId,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        siteName: sites.name,
        eventType: attendanceRecords.eventType,
        eventTime: attendanceRecords.eventTime,
        confidenceScore: attendanceRecords.confidenceScore,
        locationNote: attendanceRecords.locationNote,
        deviceType: attendanceRecords.deviceType,
      })
      .from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(sites, eq(attendanceRecords.siteId, sites.id))
      .where(
        and(
          gte(attendanceRecords.eventTime, window.start),
          lte(attendanceRecords.eventTime, window.end),
          // Filter by site if provided
          siteId > 0 ? eq(attendanceRecords.siteId, siteId) : undefined
        )
      )
      .orderBy(desc(attendanceRecords.eventTime))
      .limit(200)

    // Deduplicate: Keep 1 latest 'checked-in' and 1 latest 'checked-out' per employee for today
    const seenKeys = new Set<string>()
    const dedupedRows = []

    for (const row of rows) {
      const key = `${row.employeeId}_${row.eventType}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        dedupedRows.push(row)
      }
    }

    const records: MultiAttendanceHistoryEntry[] = dedupedRows.map((row) => ({
      id: row.id,
      employee_id: row.employeeId,
      employee_name: row.employeeName ?? 'Unknown',
      employee_sn: row.employeeSn ?? '',
      job_title: row.jobTitle ?? '',
      site_name: row.siteName ?? '',
      event_type: row.eventType,
      event_time: row.eventTime.toISOString(),
      confidence_score: row.confidenceScore ?? null,
      location_note: row.locationNote,
    }))

    return NextResponse.json<MultiAttendanceHistoryResponse>({
      records,
      total: records.length,
    })
  } catch (err) {
    console.error('[multi-attendance/history]', err)
    return NextResponse.json(
      { records: [], total: 0, error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    )
  }
}
