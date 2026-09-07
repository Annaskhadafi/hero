/**
 * Centralized Indonesian Timezone Utility (WIB, WITA, WIT)
 * HERO Multi-Timezone & Site Attendance Engine
 */

export type IndonesiaTimezoneCode = 'WIB' | 'WITA' | 'WIT'

export interface IndonesiaTimezoneInfo {
  code: IndonesiaTimezoneCode
  label: string
  iana: string
  offsetHours: number
  offsetString: string
  description: string
}

export const INDONESIA_TIMEZONES: Record<IndonesiaTimezoneCode, IndonesiaTimezoneInfo> = {
  WIB: {
    code: 'WIB',
    label: 'WIB (UTC+7 - Barat)',
    iana: 'Asia/Jakarta',
    offsetHours: 7,
    offsetString: '+07:00',
    description: 'Waktu Indonesia Barat (Sumatera, Jawa, Kalbar, Kalteng)',
  },
  WITA: {
    code: 'WITA',
    label: 'WITA (UTC+8 - Tengah)',
    iana: 'Asia/Makassar',
    offsetHours: 8,
    offsetString: '+08:00',
    description: 'Waktu Indonesia Tengah (Kalsel, Kaltim, Kaltara, Bali, Nusa Tenggara, Sulawesi)',
  },
  WIT: {
    code: 'WIT',
    label: 'WIT (UTC+9 - Timur)',
    iana: 'Asia/Jayapura',
    offsetHours: 9,
    offsetString: '+09:00',
    description: 'Waktu Indonesia Timur (Maluku, Maluku Utara, Papua)',
  },
}

export const DEFAULT_INDONESIA_TIMEZONE: IndonesiaTimezoneCode = 'WITA'

/**
 * Normalizes any string representation of a timezone into a standard IndonesiaTimezoneInfo.
 */
export function normalizeIndonesiaTimezone(value: unknown): IndonesiaTimezoneInfo {
  if (typeof value !== 'string') {
    return INDONESIA_TIMEZONES[DEFAULT_INDONESIA_TIMEZONE]
  }

  const clean = value.trim().toUpperCase()

  if (clean === 'WIB' || clean.includes('JAKARTA') || clean.includes('UTC+7') || clean.includes('+07')) {
    return INDONESIA_TIMEZONES.WIB
  }
  if (clean === 'WIT' || clean.includes('JAYAPURA') || clean.includes('UTC+9') || clean.includes('+09')) {
    return INDONESIA_TIMEZONES.WIT
  }
  if (
    clean === 'WITA' ||
    clean.includes('MAKASSAR') ||
    clean.includes('UJUNG_PANDANG') ||
    clean.includes('BALI') ||
    clean.includes('UTC+8') ||
    clean.includes('+08')
  ) {
    return INDONESIA_TIMEZONES.WITA
  }

  return INDONESIA_TIMEZONES[DEFAULT_INDONESIA_TIMEZONE]
}

/**
 * Resolves the IANA timezone identifier for a given timezone code or string.
 */
export function resolveTimezoneIana(value?: string | null): string {
  return normalizeIndonesiaTimezone(value).iana
}

/**
 * Resolves the timezone code ('WIB' | 'WITA' | 'WIT').
 */
export function resolveTimezoneCode(value?: string | null): IndonesiaTimezoneCode {
  return normalizeIndonesiaTimezone(value).code
}

/**
 * Infers the Indonesian timezone based on Province Name, Regency, or Site Location text.
 */
export function inferTimezoneFromLocation(locationText?: string | null): IndonesiaTimezoneCode {
  if (!locationText || typeof locationText !== 'string') {
    return DEFAULT_INDONESIA_TIMEZONE
  }

  const text = locationText.toLowerCase()

  // 1. Check WIT (Maluku & Papua)
  const witKeywords = [
    'papua',
    'jayapura',
    'merauke',
    'nabire',
    'mimika',
    'timika',
    'biak',
    'sorong',
    'manokwari',
    'fakfak',
    'wamena',
    'maluku',
    'ambon',
    'ternate',
    'halmahera',
    'tidore',
    'seram',
    'buru',
    'tual',
  ]
  if (witKeywords.some((keyword) => text.includes(keyword))) {
    return 'WIT'
  }

  // 2. Check WIB (Sumatera, Jawa, Kalbar, Kalteng)
  const wibKeywords = [
    // Sumatera
    'aceh',
    'aceh barat',
    'meulaboh',
    'nagan raya',
    'mifa',
    'sumatera',
    'sumatra',
    'medan',
    'padang',
    'riau',
    'pekanbaru',
    'batam',
    'kepulauan riau',
    'jambi',
    'bengkulu',
    'palembang',
    'bangka',
    'belitung',
    'lampung',
    'bandar lampung',
    // Jawa
    'jakarta',
    'dki',
    'banten',
    'tangerang',
    'serang',
    'cilegon',
    'lebak',
    'pandeglang',
    'jawa barat',
    'jabar',
    'bandung',
    'bekasi',
    'bogor',
    'depok',
    'karawang',
    'purwakarta',
    'sukabumi',
    'cirebon',
    'tasikmalaya',
    'jawa tengah',
    'jateng',
    'semarang',
    'surakarta',
    'solo',
    'magelang',
    'pekalongan',
    'tegal',
    'banyumas',
    'purwokerto',
    'cilacap',
    'kudus',
    'yogyakarta',
    'jogja',
    'sleman',
    'bantul',
    'jawa timur',
    'jatim',
    'surabaya',
    'malang',
    'sidoarjo',
    'gresik',
    'pasuruan',
    'probolinggo',
    'kediri',
    'jember',
    'banyuwangi',
    'madiun',
    // Kalimantan (Barat & Tengah)
    'kalimantan barat',
    'kalbar',
    'pontianak',
    'singkawang',
    'ketapang',
    'sintang',
    'sambas',
    'kalimantan tengah',
    'kalteng',
    'palangkaraya',
    'palangka raya',
    'kotawaringin',
    'sampit',
    'pangkalan bun',
    'kapuas',
    'barito',
  ]
  if (wibKeywords.some((keyword) => text.includes(keyword))) {
    return 'WIB'
  }

  // 3. Check WITA (Sulawesi, Kalsel, Kaltim, Kaltara, Bali, NTB, NTT)
  const witaKeywords = [
    'kalimantan selatan',
    'kalsel',
    'banjarmasin',
    'banjarbaru',
    'tabalong',
    'tanah bumbu',
    'batulicin',
    'kotabaru',
    'kalimantan timur',
    'kaltim',
    'balikpapan',
    'samarinda',
    'bontang',
    'kutai',
    'sangatta',
    'berau',
    'paser',
    'penajam',
    'kalimantan utara',
    'kaltara',
    'tarakan',
    'bulungan',
    'nunukan',
    'bali',
    'denpasar',
    'badung',
    'gianyar',
    'buleleng',
    'nusa tenggara',
    'ntb',
    'lombok',
    'mataram',
    'sumbawa',
    'bima',
    'ntt',
    'kupang',
    'flores',
    'labuan bajo',
    'sumba',
    'sulawesi',
    'makassar',
    'gowa',
    'maros',
    'parepare',
    'palopo',
    'luwu',
    'sorowako',
    'manado',
    'bitung',
    'tomohon',
    'minahasa',
    'palu',
    'morowali',
    'poso',
    'kendari',
    'kolaka',
    'konawe',
    'gorontalo',
    'mamuju',
  ]
  if (witaKeywords.some((keyword) => text.includes(keyword))) {
    return 'WITA'
  }

  return DEFAULT_INDONESIA_TIMEZONE
}

/**
 * Returns date parts { year, month, day, hours, minutes, seconds } for a Date object in the target timezone.
 */
export function getTimezoneDateParts(date: Date, timezone?: string | null) {
  const tzInfo = normalizeIndonesiaTimezone(timezone)
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tzInfo.iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = fmt.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour'),
    minutes: get('minute'),
    seconds: get('second'),
    timezoneInfo: tzInfo,
  }
}

/**
 * Formats a Date to HH:mm in the specified Indonesian timezone.
 */
export function formatTimeHHMMInTimezone(date: Date, timezone?: string | null): string {
  const { hours, minutes } = getTimezoneDateParts(date, timezone)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Extracts YYYY-MM period and day number from a Date in the specified Indonesian timezone.
 */
export function derivePeriodAndDayInTimezone(date: Date, timezone?: string | null): {
  period: string
  day: number
} {
  const { year, month, day } = getTimezoneDateParts(date, timezone)
  const period = `${year}-${String(month).padStart(2, '0')}`
  return { period, day }
}

/**
 * Returns [startOfDay, startOfNextDay] as UTC Date objects representing local midnight
 * boundaries in the specified Indonesian timezone.
 */
export function getTimezoneDayBoundaries(date: Date, timezone?: string | null): {
  startOfDay: Date
  startOfNextDay: Date
} {
  const { year, month, day, timezoneInfo } = getTimezoneDateParts(date, timezone)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateString = `${year}-${pad(month)}-${pad(day)}T00:00:00${timezoneInfo.offsetString}`
  const startOfDay = new Date(dateString)
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  return { startOfDay, startOfNextDay }
}
