'use server'

import { db } from '@/db'
import { attendanceRecords, employees } from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { rarayVerifyFace, rarayRecognizeFace, rarayCheckAntiSpoofUniFaceV2 } from '@/lib/raray-vision/client'
import { syncFaceAttendanceToTimesheet } from '@/lib/timesheet/face-attendance-sync'
import { revalidatePath } from 'next/cache'

export interface FaceAttendanceParams {
  imageDataUrl: string
  eventType: 'checked-in' | 'checked-out'
  shiftCode: string
  workMode?: string
  latitude?: number
  longitude?: number
  locationNote?: string
}

export async function verifyAndSubmitFaceAttendanceAction(params: FaceAttendanceParams) {
  const {
    imageDataUrl,
    eventType,
    shiftCode,
    workMode = 'On Site',
    latitude = -1.2653,
    longitude = 116.8312,
    locationNote = 'Balikpapan Base',
  } = params

  try {
    const currentEmp = await getCurrentEmployee()
    if (!currentEmp) {
      return { success: false, error: 'Sesi login tidak ditemukan. Mohon login kembali.' }
    }

    // 1. Parse Base64 image
    const matches = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!matches) {
      return { success: false, error: 'Format foto selfie tidak valid.' }
    }

    const mimeType = matches[1] || 'image/jpeg'
    const base64Data = matches[2]
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // 2. Anti-Spoofing Check via UniFace-v2 API
    const antiSpoofRes = await rarayCheckAntiSpoofUniFaceV2({
      imageBuffer,
      mimeType,
    }).catch(() => null)

    if (antiSpoofRes && (antiSpoofRes.status === 'spoof_detected' || (antiSpoofRes.status === 'success' && !antiSpoofRes.is_real))) {
      console.warn('[face-attendance-action] Spoof detected:', antiSpoofRes.verdict, antiSpoofRes.confidence)
      return {
        success: false,
        error: antiSpoofRes.message || '🚨 Terdeteksi foto/layar HP (Anti-Spoofing Gagal). Harap gunakan wajah asli secara langsung.',
      }
    }

    // 3. Call vision.chitraparatama.com API v1 verify endpoint directly
    const rvResult = await rarayVerifyFace({
      employeeId: currentEmp.id,
      employeeSn: currentEmp.employeeSn || String(currentEmp.id),
      faceRarayId: currentEmp.faceRarayId || undefined,
      imageBuffer,
      mimeType,
    }).catch(() => null)

    if (!rvResult) {
      return {
        success: false,
        error: 'Gagal terhubung ke layanan verifikasi wajah (Vision AI). Mohon coba lagi.',
      }
    }

    if (rvResult.status === 'spoofing_detected' || rvResult.is_live === false) {
      return {
        success: false,
        error: rvResult.message || '🚨 Terdeteksi foto/layar HP (Anti-Spoofing Gagal). Harap gunakan wajah asli secara langsung.',
      }
    }

    if (rvResult.status === 'not_registered') {
      return {
        success: false,
        error: 'Wajah Anda belum terdaftar di sistem biometrik. Silakan lakukan registrasi wajah terlebih dahulu.',
      }
    }

    const confidence = rvResult.confidence || 0
    if (!rvResult.verified || confidence < 0.45) {
      return {
        success: false,
        error: `Wajah tidak cocok dengan data biometrik ${currentEmp.name} (Kecocokan: ${(confidence * 100).toFixed(0)}%, minimal 45%).`,
      }
    }

    const verified = true

    const eventTime = new Date()
    const nowStr = eventTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const shiftLabel = shiftCode === 'night' ? 'Shift Malam' : 'Shift Pagi'

    const targetSiteId = currentEmp.siteId || 1

    // 3. Save attendance record directly to database
    const [record] = await db
      .insert(attendanceRecords)
      .values({
        employeeId: currentEmp.id,
        siteId: targetSiteId,
        eventType,
        eventTime,
        status: 'approved',
        locationNote: `${locationNote} | Shift: ${shiftLabel} | Mode: ${workMode} | Vision AI Verified (${(confidence * 100).toFixed(0)}%)`,
        latitude: String(latitude),
        longitude: String(longitude),
        clientRequestId: `web-desk-v1-${Date.now()}`,
      })
      .returning()

    // 4. Sync to timesheet overrides (handling night shift cross-day checkout automatically)
    try {
      await syncFaceAttendanceToTimesheet(currentEmp.id, targetSiteId, eventTime)
    } catch (syncErr) {
      console.error('[face-attendance-action] Timesheet sync failed:', syncErr)
    }

    revalidatePath('/dashboard/analytics')
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/scheduling-timesheet')
    revalidatePath('/mobile/attendance')

    return {
      success: true,
      verified,
      confidence,
      employeeName: currentEmp.name,
      employeeSn: currentEmp.employeeSn,
      timeStr: nowStr,
      eventTypeLabel: eventType === 'checked-out' ? 'Check-Out' : 'Check-In',
      locationName: locationNote,
    }
  } catch (error: any) {
    console.error('verifyAndSubmitFaceAttendanceAction error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memproses verifikasi presensi biometrik.',
    }
  }
}
