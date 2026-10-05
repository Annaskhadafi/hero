import {
  RawTireCheckItem,
  TireCheckApiResponse,
  TireCheckData,
  TireCheckFilterSite,
} from './types'
import rawDataJson from './raw-tire-check-data.json'

export const RAW_TIRE_CHECK_ITEMS: RawTireCheckItem[] =
  rawDataJson.data as RawTireCheckItem[]

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

export const AVAILABLE_SITES: TireCheckFilterSite[] = [
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
    plant: 'Site BIB GH',
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

export const AVAILABLE_PERIODS = [
  { id: '2026-02', label: 'Februari 2026', range: '1 – 26 Februari 2026' },
  { id: '2026-01', label: 'Januari 2026', range: '1 – 31 Januari 2026' },
]

const MONTH_NAMES_ID: Record<string, string> = {
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

function formatDateIndo(dateStr: string): string {
  // dateStr: "2026-02-15"
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  const day = parseInt(parts[2], 10)
  const month = MONTH_NAMES_ID[parts[1]] || parts[1]
  const year = parts[0]
  return `${day} ${month} ${year}`
}

/**
 * Generator dan transformer data berbasis raw dataset user
 */
export function getTireCheckMockData(
  siteCode: string = 'CK-BIB GH',
  periodId: string = '2026-02'
): TireCheckApiResponse {
  const selectedMeta =
    SITE_METADATA_MAP[siteCode] || SITE_METADATA_MAP['CK-BIB GH']

  // Filter dataset berdasarkan site dan periode
  const filteredRaw = RAW_TIRE_CHECK_ITEMS.filter((item) => {
    const matchSite = siteCode === 'ALL' || item.site === siteCode
    const matchPeriod = item.date2.startsWith(periodId)
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

      return {
        no: index + 1,
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
          ).toFixed(1)
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
          ).toFixed(1)
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
      companyName: selectedMeta.name,
      plantName: selectedMeta.plant,
      location: selectedMeta.location,
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
  }

  return {
    success: true,
    message: `Data Tire Check untuk site ${siteCode} periode ${periodId} berhasil dimuat (${filteredRaw.length} baris data)`,
    timestamp: new Date().toISOString(),
    data,
  }
}
