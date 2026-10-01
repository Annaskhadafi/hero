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

export const EWH_ACTIVITY_COLUMNS = [
  { key: 'p5m', label: 'P5M/Safety Talk', short: 'P5M' },
  { key: 'checkPressure', label: 'Check Pressure/Day', short: 'Check Pressure' },
  { key: 'adjustPressure', label: 'Adjust Pressure/Tire', short: 'Adjust Pressure' },
  { key: 'reseal', label: 'Reseal/Tire', short: 'Reseal' },
  { key: 'assembly', label: 'Assembly/Tire', short: 'Assembly' },
  { key: 'disassembly', label: 'Disassembly/Tire', short: 'Disassembly' },
  { key: 'mounting', label: 'Mounting/Tire', short: 'Mounting' },
  { key: 'dismounting', label: 'Dismounting/Tire', short: 'Dismounting' },
  { key: 'pmCheck', label: 'PM Check/Unit', short: 'PM Check' },
  { key: 'cleanUp', label: 'Clean Up/Day', short: 'Clean Up' },
  { key: 'maintenanceRim', label: 'Maintenance Rim', short: 'Maint Rim' },
  { key: 'retorque', label: 'Retorque/Tire', short: 'Retorque' },
] as const

export type EwhActivityKey = (typeof EWH_ACTIVITY_COLUMNS)[number]['key']

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

/**
 * Normalisasi dan ekstraksi komponen tahun, bulan, hari dari Date / ISO string.
 * Menghindari offset pergeseran timezone (UTC vs Local).
 */
export function parseDateYMD(d: Date | string | null | undefined): { year: number; month: number; day: number } | null {
  if (!d) return null
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    }
  }
  const str = String(d).trim()
  if (!str) return null
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
      day: parseInt(match[3], 10),
    }
  }
  const dateObj = new Date(str)
  if (isNaN(dateObj.getTime())) return null
  return {
    year: dateObj.getFullYear(),
    month: dateObj.getMonth() + 1,
    day: dateObj.getDate(),
  }
}

/**
 * Mengkategorikan label task/aktivitas daily activity session item atau direct activity
 * ke salah satu dari 12 kolom standar EWH Matriks.
 */
export function categorizeSessionActivity(label: string): EwhActivityKey {
  const l = (label || '').toLowerCase().trim()

  // 1. P5M & Safety
  if (
    l.includes('p5m') ||
    l.includes('safety') ||
    l.includes('briefing') ||
    l.includes('toolbox') ||
    l.includes('meeting') ||
    l.includes('loto') ||
    l.includes('lock out') ||
    l.includes('hse') ||
    l.includes('k3') ||
    l.includes('bbs') ||
    l.includes('apd')
  ) {
    return 'p5m'
  }

  // 2. Adjust Pressure (diperiksa sebelum check pressure bila mengandung kata adjust / pump / isi angin)
  if (
    l.includes('adjust') ||
    l.includes('penyesuaian tekanan') ||
    l.includes('tambah angin') ||
    l.includes('kurang angin') ||
    l.includes('pump') ||
    l.includes('pompa') ||
    l.includes('isi angin') ||
    l.includes('buang angin')
  ) {
    return 'adjustPressure'
  }

  // 3. Check Pressure & Inspection
  if (
    l.includes('pressure') ||
    l.includes('tekanan') ||
    l.includes('tyre inspection') ||
    l.includes('tire inspection') ||
    l.includes('cek angin') ||
    l.includes('ukur angin')
  ) {
    return 'checkPressure'
  }

  // 4. Reseal
  if (
    l.includes('reseal') ||
    l.includes('re-seal') ||
    l.includes('resea') ||
    l.includes('seal') ||
    l.includes('o-ring') ||
    l.includes('oring') ||
    l.includes('gasket')
  ) {
    return 'reseal'
  }

  // 5. Retorque
  if (
    l.includes('retorque') ||
    l.includes('re-torque') ||
    l.includes('retorqe') ||
    l.includes('torsi') ||
    l.includes('torque') ||
    l.includes('torq') ||
    l.includes('kencangkan baut') ||
    l.includes('cek baut')
  ) {
    return 'retorque'
  }

  // 6. Disassembly (Copot/bongkar velg dan ban)
  if (
    l.includes('disassembly') ||
    l.includes('bongkar ban') ||
    l.includes('dismantle') ||
    l.includes('lepas velg') ||
    l.includes('strip down') ||
    l.includes('disas')
  ) {
    return 'disassembly'
  }

  // 7. Assembly (Rakit ban dan velg)
  if (
    l.includes('assembly') ||
    l.includes('rakit ban') ||
    l.includes('perakitan') ||
    l.includes('pasang velg') ||
    l.includes('build up') ||
    l.includes('rakit')
  ) {
    return 'assembly'
  }

  // 8. Dismounting (Lepas ban dari unit)
  if (
    l.includes('dismount') ||
    l.includes('lepas ban') ||
    l.includes('copot ban') ||
    l.includes('remove tire') ||
    l.includes('remove tyre') ||
    l.includes('bongkar roda') ||
    l.includes('turun ban') ||
    l.includes('lepas roda')
  ) {
    return 'dismounting'
  }

  // 9. Mounting & Tyre Change & Rotation (Pasang ban ke unit)
  if (
    l.includes('mount') ||
    l.includes('pasang ban') ||
    l.includes('install tire') ||
    l.includes('install tyre') ||
    l.includes('pasang roda') ||
    l.includes('tyre change') ||
    l.includes('tire change') ||
    l.includes('ganti ban') ||
    l.includes('replacement tyre') ||
    l.includes('replacement tire') ||
    l.includes('rotasi') ||
    l.includes('rotation')
  ) {
    return 'mounting'
  }

  // 10. Maintenance Rim & Wheel
  if (
    l.includes('rim') ||
    l.includes('velg') ||
    l.includes('wheel') ||
    l.includes('brushing') ||
    l.includes('cat rim') ||
    l.includes('sandblast') ||
    l.includes('gerinda')
  ) {
    return 'maintenanceRim'
  }

  // 11. PM Check & Inspeksi / Pemeriksaan Rutin
  if (
    l.includes('pm') ||
    l.includes('preventive') ||
    l.includes('pemeriksaan') ||
    l.includes('inspeksi') ||
    l.includes('inspection') ||
    l.includes('survey') ||
    l.includes('audit') ||
    l.includes('daily check') ||
    l.includes('cek rutin') ||
    l.includes('trouble') ||
    l.includes('investigasi')
  ) {
    return 'pmCheck'
  }

  // 12. Clean Up, Housekeeping, Support, Admin & Others
  if (
    l.includes('clean') ||
    l.includes('housekeeping') ||
    l.includes('pembersihan') ||
    l.includes('5r') ||
    l.includes('kebersihan') ||
    l.includes('cuci') ||
    l.includes('admin') ||
    l.includes('report') ||
    l.includes('laporan') ||
    l.includes('invoice') ||
    l.includes('wo') ||
    l.includes('work order') ||
    l.includes('support') ||
    l.includes('liaison')
  ) {
    return 'cleanUp'
  }

  // Fallback default: jika ada aktivitas yang tidak masuk kategori di atas,
  // dialokasikan ke cleanUp agar tidak hilang dari matriks dan durasi kerja tetap tercatat
  return 'cleanUp'
}
