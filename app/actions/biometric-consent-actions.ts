'use server'

import { db } from '@/db'
import { biometricConsents, employees } from '@/db/schema/hero'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export const BIOMETRIC_CONSENT_NOTICE_V1 = `
PERSETUJUAN PEMROSESAN DATA PRIBADI SPESIFIK (BIOMETRIK WAJAH)
Sesuai Ketentuan Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).

1. Karakteristik & Jenis Data:
   Sistem HERO menggunakan model pemrosesan wajah aman (In-Memory). Foto mentah tidak disimpan permanen di disk atau basis data, melainkan hanya diekstraksi ke dalam representasi vektor matematis (512-D embedding) yang bersifat non-reversibel (tidak dapat direkonstruksi ulang menjadi foto asli).

2. Pengamanan Data:
   Vektor biometrik disimpan dalam keadaan terenkripsi dengan standar kriptografi industri AES-256 (Pasal 35 UU PDP).

3. Tujuan Pemrosesan:
   Data biometrik semata-mata diproses untuk keperluan verifikasi kehadiran kerja (presensi karyawan), pencegahan pemalsuan kehadiran, serta keselamatan kerja operasional PT Chitra Paratama.

4. Hak Subjek Data (Hak Menarik Persetujuan & Hak Hapus):
   Karyawan memiliki hak penuh untuk mencabut izin persetujuan ini dan menghapus representasi vektor biometrik mereka sewaktu-waktu melalui menu Pengaturan Privasi HERO atau permohonan ke Tim Human Capital (Pasal 8 & 9 UU PDP).
`.trim()

/**
 * Check if an employee has given explicit active biometric consent
 */
export async function getEmployeeBiometricConsentAction(employeeId: number) {
  if (!employeeId || employeeId <= 0) {
    return { hasConsent: false, consent: null }
  }

  try {
    const records = await db
      .select()
      .from(biometricConsents)
      .where(
        and(
          eq(biometricConsents.employeeId, employeeId),
          eq(biometricConsents.status, 'agreed')
        )
      )
      .orderBy(desc(biometricConsents.consentedAt))
      .limit(1)

    if (records.length > 0) {
      return {
        hasConsent: true,
        consent: records[0],
      }
    }

    return { hasConsent: false, consent: null }
  } catch (err) {
    console.error('[biometric-consent] getEmployeeBiometricConsentAction error:', err)
    return { hasConsent: false, consent: null }
  }
}

/**
 * Record explicit biometric consent for an employee
 */
export async function recordBiometricConsentAction(params: {
  employeeId: number
  consentVersion?: string
  legalNoticeText?: string
}) {
  const { employeeId, consentVersion = 'v1.0-uupdp', legalNoticeText = BIOMETRIC_CONSENT_NOTICE_V1 } = params

  if (!employeeId || employeeId <= 0) {
    return { success: false, error: 'Employee ID tidak valid.' }
  }

  try {
    const reqHeaders = await headers()
    const forwardedFor = reqHeaders.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    const [inserted] = await db
      .insert(biometricConsents)
      .values({
        employeeId,
        consentType: 'face_recognition',
        status: 'agreed',
        consentVersion,
        legalNoticeText,
        ipAddress,
        userAgent,
        consentedAt: new Date(),
      })
      .returning()

    return { success: true, consent: inserted }
  } catch (err) {
    console.error('[biometric-consent] recordBiometricConsentAction error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menyimpan persetujuan.' }
  }
}

/**
 * Right to Erasure / Revoke Consent:
 * Permanently removes face vector embeddings and marks consent status as revoked.
 * Preserves all attendance records, payroll, and timesheets (required by labour regulations).
 */
export async function revokeBiometricConsentAndPurgeAction(params: {
  employeeId: number
  reason?: string
}) {
  const { employeeId, reason = 'Permintaan pencabutan izin oleh pengguna (Right to Erasure UU PDP)' } = params

  if (!employeeId || employeeId <= 0) {
    return { success: false, error: 'Employee ID tidak valid.' }
  }

  try {
    const now = new Date()

    // 1. Mark existing active consents as revoked
    await db
      .update(biometricConsents)
      .set({
        status: 'revoked',
        revokedAt: now,
      })
      .where(
        and(
          eq(biometricConsents.employeeId, employeeId),
          eq(biometricConsents.status, 'agreed')
        )
      )

    // 2. Insert audit log of the revocation
    const reqHeaders = await headers()
    const forwardedFor = reqHeaders.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    await db.insert(biometricConsents).values({
      employeeId,
      consentType: 'face_recognition',
      status: 'revoked',
      consentVersion: 'v1.0-uupdp',
      legalNoticeText: `Pencabutan Izin Biometrik: ${reason}`,
      ipAddress,
      userAgent,
      consentedAt: now,
      revokedAt: now,
    })

    // 3. Purge biometric embeddings from employee record (Hard Purge)
    await db
      .update(employees)
      .set({
        faceEmbedding: null,
        faceRarayId: null,
        faceRarayRegisteredAt: null,
        faceRegisteredAt: null,
      })
      .where(eq(employees.id, employeeId))

    revalidatePath('/mobile/attendance')
    revalidatePath('/mobile/attendance/face-v2')
    revalidatePath('/mobile/attendance/face-v2/register')
    revalidatePath('/dashboard/master/employees')

    return {
      success: true,
      message: 'Persetujuan biometrik berhasil dicabut dan data vektor wajah Anda telah dihapus secara permanen dari basis data.',
    }
  } catch (err) {
    console.error('[biometric-consent] revokeBiometricConsentAndPurgeAction error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memproses pencabutan persetujuan.' }
  }
}
