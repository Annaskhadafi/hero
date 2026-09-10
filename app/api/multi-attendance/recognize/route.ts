/**
 * Multi Attendance — Face Recognition API Route
 * POST /api/multi-attendance/recognize
 *
 * Public endpoint (no auth required — terminal kiosk).
 * Receives a camera frame, calls Raray Vision for 1:N recognition,
 * auto-determines Clock In / Clock Out, and inserts attendance record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  attendanceRecords,
  employees,
  masterAttendanceShifts,
  sites,
} from '@/db/schema/hero'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { endOfDay, startOfDay, subHours } from 'date-fns'
import { rarayRecognizeFace, rarayCheckAntiSpoofUniFaceV2 } from '@/lib/raray-vision/client'
import { checkEmployeeOffDayStatus } from '@/lib/timesheet/attendance-punctuality'
import {
  getSiteAttendanceClockConfig,
  resolveSiteAttendancePunctuality,
} from '@/lib/timesheet/site-attendance-punctuality'
import { syncFaceAttendanceToTimesheet } from '@/lib/timesheet/face-attendance-sync'
import { revalidatePath } from 'next/cache'

// ponytail: upgrade to per-terminal secret if needed
const TERMINAL_SECRET = process.env.MULTI_ATTENDANCE_SECRET

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MultiAttendanceRecognizeResponse {
  recognized: boolean
  employee_id?: number
  employee_name?: string
  employee_sn?: string
  job_title?: string
  event_type?: 'checked-in' | 'checked-out'
  confidence?: number
  timestamp?: string
  record_id?: number
  error?: string
  reason?: 'cooldown' | 'no_face' | 'not_registered' | 'recognition_failed' | 'db_error' | 'spoof_detected'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayWindow() {
  const now = new Date()
  return {
    start: subHours(startOfDay(now), 8),
    end: endOfDay(now),
  }
}

function buildTerminalNote(params: {
  shiftLabel: string
  siteLabel: string
  confidence: number
}): string {
  const confPct = Math.round(params.confidence * 100)
  return [
    `Multi Attendance Terminal`,
    `Site: ${params.siteLabel}`,
    `Shift: ${params.shiftLabel}`,
    `Face Recognition | Confidence: ${confPct}%`,
  ].join(' | ')
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // Optional secret check (if configured)
    if (TERMINAL_SECRET) {
      const providedSecret = req.headers.get('x-terminal-secret') ?? ''
      if (providedSecret !== TERMINAL_SECRET) {
        return NextResponse.json({ recognized: false, error: 'Unauthorized terminal' }, { status: 401 })
      }
    }

    const file = formData.get('file')
    const shiftCode = (formData.get('shiftCode') as string | null) ?? 'day'
    const siteId = Number((formData.get('siteId') as string | null) ?? '0')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json<MultiAttendanceRecognizeResponse>({
        recognized: false,
        error: 'No image file provided',
        reason: 'no_face',
      })
    }

    // Convert Blob → Buffer for Raray Vision client
    const arrayBuffer = await file.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    const mimeType = file.type || 'image/jpeg'

    // ── 0. UniFace-v2 Anti-Spoofing Check ─────────────────────────────────────
    const antiSpoofRes = await rarayCheckAntiSpoofUniFaceV2({ imageBuffer, mimeType }).catch(() => null)
    if (antiSpoofRes && (antiSpoofRes.status === 'spoof_detected' || (antiSpoofRes.status === 'success' && !antiSpoofRes.is_real))) {
      console.warn('[multi-attendance/recognize] Spoof attempt detected:', antiSpoofRes.verdict, antiSpoofRes.confidence)
      return NextResponse.json<MultiAttendanceRecognizeResponse>({
        recognized: false,
        confidence: antiSpoofRes.confidence,
        reason: 'spoof_detected',
        error: antiSpoofRes.message || '🚨 Terdeteksi foto/layar HP (Anti-Spoofing Gagal). Harap gunakan wajah asli secara langsung.',
      })
    }

    // ── 1. Raray Vision: 1:N Recognition ──────────────────────────────────────
    const rarayResult = await rarayRecognizeFace({ imageBuffer, mimeType })

    if (!rarayResult.recognized || !rarayResult.employee_id || (rarayResult.confidence ?? 0) < 0.45) {
      return NextResponse.json<MultiAttendanceRecognizeResponse>({
        recognized: false,
        confidence: rarayResult.confidence ?? 0,
        reason: rarayResult.status === 'no_faces_registered' ? 'not_registered' : 'recognition_failed',
        error: rarayResult.message ?? 'Wajah tidak dikenali atau tingkat kecocokan di bawah standar keamanan (minimal 45%).',
      })
    }

    const rawIdOrSn = String(rarayResult.employee_id || rarayResult.face_id || '').trim()
    const numericId = Number(rawIdOrSn)

    // ── 2. Lookup employee in HERO DB (by id, employeeSn, or faceRarayId) ───
    const employeeFields = {
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      siteId: employees.siteId,
      workLocation: employees.workLocation,
    } as const

    let resolvedEmployee = null

    // Try by DB primary key ID (if numeric)
    if (!isNaN(numericId) && numericId > 0) {
      const [byPk] = await db
        .select(employeeFields)
        .from(employees)
        .where(and(eq(employees.id, numericId), eq(employees.isActive, true)))
        .limit(1)
      if (byPk) resolvedEmployee = byPk
    }

    // Try by employee_sn (e.g. "71261")
    if (!resolvedEmployee && rawIdOrSn) {
      const cleanSn = rawIdOrSn.replace(/^emp-/, '')
      const [bySn] = await db
        .select(employeeFields)
        .from(employees)
        .where(and(eq(employees.employeeSn, cleanSn), eq(employees.isActive, true)))
        .limit(1)
      if (bySn) resolvedEmployee = bySn
    }

    // Try by faceRarayId
    if (!resolvedEmployee && rawIdOrSn) {
      const cleanFaceId = rawIdOrSn.replace(/^emp-/, '')
      const [byFaceId] = await db
        .select(employeeFields)
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            sql`(${employees.faceRarayId} = ${rawIdOrSn} OR ${employees.faceRarayId} = ${cleanFaceId})`
          )
        )
        .limit(1)
      if (byFaceId) resolvedEmployee = byFaceId
    }

    if (!resolvedEmployee) {
      console.warn('[multi-attendance/recognize] Face matched in Raray Vision but employee not found in HERO DB:', rawIdOrSn)
      return NextResponse.json<MultiAttendanceRecognizeResponse>({
        recognized: false,
        reason: 'not_registered',
        error: `Wajah terdeteksi (${rawIdOrSn}) tetapi data karyawan tidak ditemukan di DB HERO`,
      })
    }

    // ── 3. Resolve site info ───────────────────────────────────────────────────
    const targetSiteId = siteId > 0 ? siteId : resolvedEmployee.siteId
    const [site] = await db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(eq(sites.id, targetSiteId))
      .limit(1)

    const siteLabel = site?.name ?? resolvedEmployee.workLocation ?? 'Unknown Site'

    // ── 4. Resolve shift label ─────────────────────────────────────────────────
    const [shift] = await db
      .select({ label: masterAttendanceShifts.label })
      .from(masterAttendanceShifts)
      .where(eq(masterAttendanceShifts.code, shiftCode))
      .limit(1)

    const shiftLabel = shift?.label ?? shiftCode

    // ── 5. Determine Clock In / Clock Out (auto) ───────────────────────────────
    const window = todayWindow()
    const [lastRecord] = await db
      .select({ eventType: attendanceRecords.eventType })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, resolvedEmployee.id),
          gte(attendanceRecords.eventTime, window.start),
          lte(attendanceRecords.eventTime, window.end)
        )
      )
      .orderBy(desc(attendanceRecords.eventTime))
      .limit(1)

    const eventType: 'checked-in' | 'checked-out' =
      lastRecord?.eventType === 'checked-in' ? 'checked-out' : 'checked-in'

    // ── 6. Cooldown check (3 minutes / 180s per employee) ────────────────────
    const COOLDOWN_MS = 180_000 // 3 minutes
    const [recentRecord] = await db
      .select({ id: attendanceRecords.id, eventTime: attendanceRecords.eventTime })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, resolvedEmployee.id),
          gte(attendanceRecords.eventTime, new Date(Date.now() - COOLDOWN_MS))
        )
      )
      .limit(1)

    if (recentRecord) {
      const remainingMs = COOLDOWN_MS - (Date.now() - recentRecord.eventTime.getTime())
      const remainingSec = Math.ceil(remainingMs / 1000)
      return NextResponse.json<MultiAttendanceRecognizeResponse>({
        recognized: true,
        employee_id: resolvedEmployee.id,
        employee_name: resolvedEmployee.name,
        employee_sn: resolvedEmployee.employeeSn,
        job_title: resolvedEmployee.jobTitle,
        event_type: eventType,
        confidence: rarayResult.confidence,
        reason: 'cooldown',
        error: `${resolvedEmployee.name} sudah melakukan absensi. Tunggu ${remainingSec}s untuk absen lagi.`,
      })
    }

    const eventTime = new Date()

    // Off-day policy check: Non-staff can record on off-days, staff is blocked by default
    const siteConfig = await getSiteAttendanceClockConfig(targetSiteId)
    const offDayCheck = checkEmployeeOffDayStatus({
      eventTime,
      role: resolvedEmployee.jobTitle,
      scheduleType: siteConfig.scheduleType,
      rosterType: siteConfig.rosterType,
      timeZone: siteConfig.timezone,
    })

    if (!offDayCheck.allowAttendance && offDayCheck.reason) {
      return NextResponse.json<MultiAttendanceRecognizeResponse>({
        recognized: true,
        employee_id: resolvedEmployee.id,
        employee_name: resolvedEmployee.name,
        employee_sn: resolvedEmployee.employeeSn,
        job_title: resolvedEmployee.jobTitle,
        event_type: eventType,
        error: offDayCheck.reason,
      })
    }

    const punctuality = await resolveSiteAttendancePunctuality({
      siteId: targetSiteId,
      eventType,
      eventTime,
      shiftCode: shiftCode || null,
    })

    // ── 7. Insert attendance record ───────────────────────────────────────────
    const baseTerminalNote = buildTerminalNote({
      shiftLabel,
      siteLabel,
      confidence: rarayResult.confidence ?? 0,
    })
    const offDayLabel = offDayCheck.isOffDay ? ' [Hari OFF / Lembur]' : ''
    const locationNote = [baseTerminalNote + offDayLabel, punctuality?.note]
      .filter(Boolean)
      .join(' | ')

    const [record] = await db
      .insert(attendanceRecords)
      .values({
        employeeId: resolvedEmployee.id,
        siteId: targetSiteId,
        eventType,
        eventTime,
        status: 'pending',
        locationNote,
        photoUrl: null, // terminal mode: no selfie photo
        confidenceScore: rarayResult.confidence ? String(rarayResult.confidence.toFixed(3)) : null,
        deviceType: 'multi-terminal',
        source: 'face-v2',
        clientRequestId: `multi-${resolvedEmployee.id}-${Date.now()}`,
      })
      .returning()

    // Sync to timesheet overrides (handling night shift cross-day checkout automatically)
    void (async () => {
      try {
        await syncFaceAttendanceToTimesheet(resolvedEmployee.id, targetSiteId, record.eventTime)
      } catch (syncError) {
        console.error('[multi-attendance/recognize] Timesheet sync failed:', syncError)
      }
    })()

    // Invalidate all attendance-related pages so dashboards reflect the new record
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/attendance/records')
    revalidatePath('/dashboard/scheduling-timesheet')
    revalidatePath('/dashboard/scheduling-timesheet/attendance')
    revalidatePath('/mobile/attendance')

    return NextResponse.json<MultiAttendanceRecognizeResponse>({
      recognized: true,
      employee_id: resolvedEmployee.id,
      employee_name: resolvedEmployee.name,
      employee_sn: resolvedEmployee.employeeSn,
      job_title: resolvedEmployee.jobTitle,
      event_type: eventType,
      confidence: rarayResult.confidence,
      timestamp: record.eventTime.toISOString(),
      record_id: record.id,
    })
  } catch (err) {
    console.error('[multi-attendance/recognize]', err)
    return NextResponse.json<MultiAttendanceRecognizeResponse>(
      {
        recognized: false,
        error: err instanceof Error ? err.message : 'Internal server error',
        reason: 'db_error',
      },
      { status: 500 }
    )
  }
}
