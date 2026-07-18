/**
 * EWH (Effective Working Hours) Calculation Engine
 *
 * Formula (basis 24 jam = 1440 menit, standar pertambangan):
 *   clockDurationMinutes = clockOut - clockIn (dalam menit)
 *   effectiveMinutes     = clockDurationMinutes - breakMinutes
 *   idleMinutes          = 1440 - clockDurationMinutes
 *   ewhPercent           = (effectiveMinutes / 1440) × 100
 *
 * Untuk Shift Malam (NS) yang melintasi tengah malam:
 *   workDate mengikuti workDate dari dailyActivitySession (hari sebelumnya),
 *   sehingga NS 22:00–06:00 masuk ke workDate hari NS mulai.
 */

export const AVAILABILITY_MINUTES = 1440 // 24 jam

export interface EwhDayInput {
  clockIn: string | null   // "07:00" atau null jika tidak hadir
  clockOut: string | null  // "19:00" atau null
  breakMinutes: number     // dari ewhShiftConfig, default 60
  activitySessionCount?: number
  checkedItemCount?: number
  totalItemCount?: number
  overtimeMinutes?: number
}

export interface EwhDayResult {
  availabilityMinutes: number   // selalu 1440
  clockDurationMinutes: number  // total jam hadir
  breakMinutes: number          // jam break dikurangkan
  effectiveMinutes: number      // jam kerja efektif
  idleMinutes: number           // jam tidak hadir (1440 - clockDuration)
  ewhPercent: number            // persentase EWH (0–100, 2 desimal)
  ewhPercentStr: string         // "54.17"
}

/**
 * Parse waktu "HH:MM" ke menit sejak tengah malam.
 * Mendukung format 24 jam.
 */
export function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const mins = parseInt(match[2], 10)
  if (hours > 23 || mins > 59) return null
  return hours * 60 + mins
}

/**
 * Hitung durasi dari clockIn ke clockOut dalam menit.
 * Mendukung shift malam yang melewati tengah malam (clockOut < clockIn).
 */
export function calcClockDuration(clockIn: string | null, clockOut: string | null): number {
  const inMin = parseTimeToMinutes(clockIn)
  const outMin = parseTimeToMinutes(clockOut)
  if (inMin === null || outMin === null) return 0

  if (outMin >= inMin) {
    return outMin - inMin
  } else {
    // Shift malam melewati tengah malam: e.g. 22:00 → 06:00 = 8 jam
    return 1440 - inMin + outMin
  }
}

/**
 * Kalkulasi EWH untuk satu karyawan satu hari kerja.
 *
 * Catatan: effectiveMinutes tidak bisa negatif (jika clockDuration < breakMinutes,
 * berarti karyawan tidak masuk / clockOut belum tercatat → effective = 0).
 */
export function calculateEwhDay(input: EwhDayInput): EwhDayResult {
  const clockDurationMinutes = calcClockDuration(input.clockIn, input.clockOut)
  const effectiveMinutes = Math.max(0, clockDurationMinutes - input.breakMinutes)
  const idleMinutes = AVAILABILITY_MINUTES - clockDurationMinutes
  const ewhPercent = Math.round((effectiveMinutes / AVAILABILITY_MINUTES) * 10000) / 100 // 2 desimal

  return {
    availabilityMinutes: AVAILABILITY_MINUTES,
    clockDurationMinutes,
    breakMinutes: input.breakMinutes,
    effectiveMinutes,
    idleMinutes: Math.max(0, idleMinutes),
    ewhPercent,
    ewhPercentStr: ewhPercent.toFixed(2),
  }
}

/**
 * Klasifikasi EWH untuk display (color coding).
 */
export function classifyEwh(ewhPercent: number): 'excellent' | 'good' | 'fair' | 'low' | 'absent' {
  if (ewhPercent === 0) return 'absent'
  if (ewhPercent >= 70) return 'excellent'
  if (ewhPercent >= 55) return 'good'
  if (ewhPercent >= 40) return 'fair'
  return 'low'
}

/**
 * Format menit ke string jam:menit yang mudah dibaca.
 * contoh: 480 → "8j 0m" / 545 → "9j 5m"
 */
export function formatMinutesToHours(minutes: number): string {
  if (minutes <= 0) return '0j'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}j`
  return `${h}j ${m}m`
}
