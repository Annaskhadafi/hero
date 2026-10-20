import {
  RawTireCheckItem,
  TireCheckApiResponse,
  TireCheckData,
  TireCheckFilterPeriod,
  TireCheckFilterSite,
} from './types'

export const CTS_TIRE_CHECK_API_URL =
  'https://cts-chitraparatama.co.id/ChitraTireMngr/product/api_get.php?function=get_daily_and_target'

export const SITE_METADATA_MAP: Record<
  string,
  { name: string; plant: string; location: string }
> = {
  ALL: {
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Konsolidasi Seluruh Site',
    location: 'Kalimantan & Sumatera',
  },
  'CK-BIB GH': {
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BIB Port / GH',
    location: 'Tanah Bumbu, Kalimantan Selatan',
  },
  'CK-BIB KGB': {
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BIB KGB',
    location: 'Tanah Bumbu, Kalimantan Selatan',
  },
  'CK-BMB Sitarum': {
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BMB Sitarum',
    location: 'Rantau, Tapin, Kalimantan Selatan',
  },
  'CK-BMB Tabuhan': {
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BMB Tabuhan',
    location: 'Rantau, Tapin, Kalimantan Selatan',
  },
  'CK-KIM': {
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site KIM',
    location: 'Muara Bungo, Jambi',
  },
  'CK-MHU Mining': {
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site MHU Mining',
    location: 'Kutai Kartanegara, Kalimantan Timur',
  },
}

export const DEFAULT_SITES: TireCheckFilterSite[] = [
  {
    id: 'ALL',
    code: 'ALL',
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Semua Site (Konsolidasi)',
    location: 'Kalimantan & Sumatera',
  },
  {
    id: 'CK-BIB GH',
    code: 'CK-BIB GH',
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BIB Port / GH',
    location: 'Tanah Bumbu, Kalimantan Selatan',
  },
  {
    id: 'CK-BIB KGB',
    code: 'CK-BIB KGB',
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BIB KGB',
    location: 'Tanah Bumbu, Kalimantan Selatan',
  },
  {
    id: 'CK-BMB Sitarum',
    code: 'CK-BMB Sitarum',
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BMB Sitarum',
    location: 'Rantau, Tapin, Kalimantan Selatan',
  },
  {
    id: 'CK-BMB Tabuhan',
    code: 'CK-BMB Tabuhan',
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site BMB Tabuhan',
    location: 'Rantau, Tapin, Kalimantan Selatan',
  },
  {
    id: 'CK-KIM',
    code: 'CK-KIM',
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site KIM',
    location: 'Muara Bungo, Jambi',
  },
  {
    id: 'CK-MHU Mining',
    code: 'CK-MHU Mining',
    name: 'PT CIPTA KRIDATAMA',
    plant: 'Site MHU Mining',
    location: 'Kutai Kartanegara, Kalimantan Timur',
  },
]

export const DEFAULT_PERIODS: TireCheckFilterPeriod[] = [
  {
    id: '2026-02',
    label: 'Februari 2026',
    range: '1 – 28 Februari 2026',
    year: 2026,
    month: 2,
    count: 0,
  },
  {
    id: '2026-01',
    label: 'Januari 2026',
    range: '1 – 31 Januari 2026',
    year: 2026,
    month: 1,
    count: 0,
  },
]

export const MONTH_NAMES_LONG_ID: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
}

export const MONTH_NAMES_SHORT_ID: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'Mei',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ags',
  '09': 'Sep',
  '10': 'Okt',
  '11': 'Nov',
  '12': 'Des',
}

export function formatDateIndo(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  const day = parseInt(parts[2], 10)
  const month = MONTH_NAMES_SHORT_ID[parts[1]] || parts[1]
  const year = parts[0]
  return `${day} ${month} ${year}`
}

/**
 * Format angka ribuan dengan pemisah titik (.) secara deterministik
 * Mencegah hydration mismatch antara SSR Server (en-US) dan Client Browser (id-ID)
 */
export function formatNumberIndo(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0'
  const num = Math.round(Number(val))
  if (isNaN(num)) return String(val)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Ekstrak daftar Site yang tersedia dari dataset aktif
 */
export function extractAvailableSites(items: RawTireCheckItem[]): TireCheckFilterSite[] {
  if (!items || items.length === 0) return DEFAULT_SITES

  const siteCodeSet = new Set<string>()
  items.forEach((item) => {
    if (item.site && item.site.trim()) {
      siteCodeSet.add(item.site.trim())
    }
  })

  const sortedSiteCodes = Array.from(siteCodeSet).sort()

  const list: TireCheckFilterSite[] = [
    {
      id: 'ALL',
      code: 'ALL',
      name: 'PT CIPTA KRIDATAMA',
      plant: 'Semua Site (Konsolidasi)',
      location: 'Kalimantan & Sumatera',
    },
  ]

  sortedSiteCodes.forEach((code) => {
    const meta = SITE_METADATA_MAP[code] || {
      name: 'PT CIPTA KRIDATAMA',
      plant: `Site ${code}`,
      location: 'Indonesia',
    }
    list.push({
      id: code,
      code,
      name: meta.name,
      plant: meta.plant,
      location: meta.location,
    })
  })

  return list
}

/**
 * Ekstrak daftar Periode (YYYY-MM) dari dataset aktif secara dinamis
 */
export function extractAvailablePeriods(items: RawTireCheckItem[]): TireCheckFilterPeriod[] {
  if (!items || items.length === 0) return DEFAULT_PERIODS

  const periodMap = new Map<string, { days: Set<number>; count: number }>()

  items.forEach((item) => {
    if (!item.date2 || item.date2.length < 7) return
    const periodKey = item.date2.slice(0, 7) // e.g. "2026-02"
    const day = parseInt(item.date2.slice(8, 10), 10)

    const existing = periodMap.get(periodKey) || { days: new Set<number>(), count: 0 }
    if (!isNaN(day)) existing.days.add(day)
    existing.count += 1
    periodMap.set(periodKey, existing)
  })

  const sortedKeys = Array.from(periodMap.keys()).sort().reverse()
  if (sortedKeys.length === 0) return DEFAULT_PERIODS

  return sortedKeys.map((key) => {
    const [yearStr, monthStr] = key.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const monthName = MONTH_NAMES_LONG_ID[monthStr] || `Bulan ${monthStr}`
    const meta = periodMap.get(key)!

    const sortedDays = Array.from(meta.days).sort((a, b) => a - b)
    const minDay = sortedDays[0] || 1
    const maxDay = sortedDays[sortedDays.length - 1] || 28

    return {
      id: key,
      label: `${monthName} ${year}`,
      range: `${minDay} – ${maxDay} ${monthName} ${year}`,
      year,
      month,
      count: meta.count,
    }
  })
}

export function getCurrentMonthPeriodId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Transform dataset menjadi metrik dashboard, tren harian & tabel rekap
 */
export function transformTireCheckData(
  allItems: RawTireCheckItem[],
  siteCode: string = 'CK-BIB GH',
  periodId?: string,
  isLive: boolean = true,
): TireCheckApiResponse {
  const availableSites = extractAvailableSites(allItems)
  const availablePeriods = extractAvailablePeriods(allItems)

  // Default periode ke bulan berjalan saat ini
  const currentMonthId = getCurrentMonthPeriodId()
  const requestedPeriodId = periodId || currentMonthId

  // Pastikan periodId valid, fallback ke requestedPeriodId jika ada di list, atau periode pertama yang tersedia di dataset
  const effectivePeriodId =
    availablePeriods.some((p) => p.id === requestedPeriodId)
      ? requestedPeriodId
      : availablePeriods[0]?.id || currentMonthId

  const selectedMeta =
    SITE_METADATA_MAP[siteCode] ||
    availableSites.find((s) => s.id === siteCode) ||
    SITE_METADATA_MAP['CK-BIB GH']

  // Filter dataset berdasarkan site dan periode
  const filteredRaw = allItems.filter((item) => {
    const matchSite = siteCode === 'ALL' || item.site === siteCode
    const matchPeriod = item.date2 && item.date2.startsWith(effectivePeriodId)
    return matchSite && matchPeriod
  })

  // Group by date2 (karena bisa ada multiple records jika konsolidasi ALL)
  const dateMap = new Map<
    string,
    {
      date: string
      date2: string
      trgt: number
      checked: number
      low: number
    }
  >()

  filteredRaw.forEach((row) => {
    const existing = dateMap.get(row.date2) || {
      date: row.date,
      date2: row.date2,
      trgt: 0,
      checked: 0,
      low: 0,
    }

    existing.trgt += Number(row.trgt || 0)
    existing.checked += Number(row.checked_tires || 0)
    existing.low += Number(row.low_press_tires || 0)
    dateMap.set(row.date2, existing)
  })

  // Urutkan tanggal ascending untuk chart
  const sortedDatesAsc = Array.from(dateMap.keys()).sort()

  const chartTrend = sortedDatesAsc.map((dateStr) => {
    const item = dateMap.get(dateStr)!
    const day = parseInt(dateStr.split('-')[2], 10)
    const formattedDate = formatDateIndo(dateStr)

    const pct =
      item.checked > 0 ? Number(((item.low / item.checked) * 100).toFixed(2)) : 0

    let status: 'normal' | 'warning' | 'low' = 'normal'
    let normalPct = 0
    let warningPct = 0
    let lowPct = 0

    if (pct > 3.0) {
      status = 'low'
      lowPct = pct
    } else if (pct >= 1.0) {
      status = 'warning'
      normalPct = 0.8
      warningPct = Number((pct - 0.8).toFixed(2))
    } else {
      status = 'normal'
      normalPct = pct
    }

    return {
      day,
      date: dateStr,
      formattedDate,
      totalChecked: item.checked,
      lowPressureQty: item.low,
      targetChecked: item.trgt,
      adjustedQty: item.low,
      lowPressurePct: pct,
      normalPct,
      warningPct,
      lowPct,
      status,
    }
  })

  // Rekap tabel diurutkan descending (tanggal paling akhir di atas)
  const rekapTable = [...chartTrend]
    .reverse()
    .map((item, index) => {
      let status: 'normal' | 'warning' | 'alert' = 'normal'
      if (item.lowPressureQty >= 4 || item.lowPressurePct > 3.0) {
        status = 'alert'
      } else if (item.lowPressureQty >= 2 || item.lowPressurePct >= 1.0) {
        status = 'warning'
      }

      const matchingRaw = filteredRaw.find((r) => r.date2 === item.date)
      const rowSite = matchingRaw?.site || (siteCode === 'ALL' ? 'Semua Site' : siteCode)

      return {
        no: index + 1,
        site: rowSite,
        date: item.date,
        tanggal: item.formattedDate,
        totalTireChecked: item.totalChecked,
        lowPressureQty: item.lowPressureQty,
        targetCheckedQty: item.targetChecked,
        adjustedQty: item.adjustedQty,
        status,
        notes:
          item.lowPressureQty >= 10
            ? 'Spike tinggi: Penyesuaian tekanan & inspeksi valve massal'
            : undefined,
      }
    })

  // Hitung metrik KPI dari hari terakhir dan hari sebelumnya
  const latestItem = chartTrend[chartTrend.length - 1]
  const previousItem =
    chartTrend.length > 1 ? chartTrend[chartTrend.length - 2] : latestItem

  const totalCheckToday = latestItem ? latestItem.totalChecked : 0
  const totalCheckYesterday = previousItem ? previousItem.totalChecked : 0
  const totalCheckGrowthPct =
    totalCheckYesterday > 0
      ? Number(
          (
            ((totalCheckToday - totalCheckYesterday) / totalCheckYesterday) *
            100
          ).toFixed(1),
        )
      : 0

  const lowPressureToday = latestItem ? latestItem.lowPressureQty : 0
  const lowPressureYesterday = previousItem ? previousItem.lowPressureQty : 0
  const lowPressureGrowthPct =
    lowPressureYesterday > 0
      ? Number(
          (
            ((lowPressureToday - lowPressureYesterday) / lowPressureYesterday) *
            100
          ).toFixed(1),
        )
      : 0

  const lowPressurePercentage = latestItem ? latestItem.lowPressurePct : 0
  const isWithinTarget = lowPressurePercentage < 1.0

  // Estimasi unit alat aktif
  const estimatedTotalEquipment =
    siteCode === 'ALL'
      ? 1280
      : Math.max(Math.round((latestItem?.targetChecked || 500) / 4), 85)

  const data: TireCheckData = {
    siteInfo: {
      siteId: siteCode,
      companyName: selectedMeta.name || 'PT CIPTA KRIDATAMA',
      plantName: selectedMeta.plant || `Site ${siteCode}`,
      location: selectedMeta.location || 'Indonesia',
      serviceProvider: 'Chitra Paratama – Service & Monitoring',
      bannerImageUrl: '/images/tire-check-banner.jpg',
      equipmentCountTotal: estimatedTotalEquipment,
    },
    targetConfig: {
      targetLowPressurePct: 1.0,
      targetLabel: '< 1%',
      description: 'dari total check per hari',
    },
    kpiSummary: {
      totalCheckToday,
      totalCheckYesterday,
      totalCheckGrowthPct: Math.abs(totalCheckGrowthPct),
      totalCheckGrowthType: totalCheckGrowthPct >= 0 ? 'increase' : 'decrease',

      lowPressureToday,
      lowPressureYesterday,
      lowPressureGrowthPct,
      lowPressureGrowthType: lowPressureGrowthPct <= 0 ? 'decrease' : 'increase',

      lowPressurePercentage,
      isWithinTarget,

      totalEquipment: estimatedTotalEquipment,
      equipmentBreakdown: {
        normal: Math.max(estimatedTotalEquipment - lowPressureToday, 0),
        low: lowPressureToday,
        maintenance: 0,
      },
    },
    chartTrend,
    rekapTable,
    rawItems: filteredRaw,
    allRawItems: allItems,
  }

  return {
    success: true,
    message: isLive
      ? `Data Tire Check dari Live API (${filteredRaw.length} record ditampilkan dari total ${allItems.length} records)`
      : `Data Tire Check (${filteredRaw.length} records)`,
    timestamp: new Date().toISOString(),
    isLiveApi: isLive,
    apiEndpoint: CTS_TIRE_CHECK_API_URL,
    totalRecordsInApi: allItems.length,
    availableSites,
    availablePeriods,
    data,
  }
}
