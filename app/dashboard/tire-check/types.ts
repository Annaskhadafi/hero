/**
 * Definisi Type dan Kontrak Struktur Respons JSON API untuk Tire Check
 */

/**
 * Format Data Mentah dari Backend API (sesuai data user)
 */
export interface RawTireCheckItem {
  date: string // e.g. "20260101"
  date2: string // e.g. "2026-01-01"
  trgt: string // e.g. "516"
  trgt2: string | null // e.g. null, "0", "30"
  checked_tires: string // e.g. "512"
  low_press_tires: string // e.g. "0"
  site: string // e.g. "CK-BIB GH"
}

export interface RawTireCheckApiResponse {
  data: RawTireCheckItem[]
}

/**
 * Metadata Site & Filter
 */
export interface TireCheckFilterSite {
  id: string
  code: string
  name: string
  plant: string
  location: string
}

export interface TireCheckSiteInfo {
  siteId: string
  companyName: string
  plantName: string
  location: string
  serviceProvider: string
  bannerImageUrl?: string
  equipmentCountTotal: number
}

export interface TireCheckTargetConfig {
  targetLowPressurePct: number
  targetLabel: string
  description: string
}

export interface TireCheckKpiSummary {
  totalCheckToday: number
  totalCheckYesterday: number
  totalCheckGrowthPct: number
  totalCheckGrowthType: 'increase' | 'decrease' | 'neutral'

  lowPressureToday: number
  lowPressureYesterday: number
  lowPressureGrowthPct: number
  lowPressureGrowthType: 'increase' | 'decrease' | 'neutral'

  lowPressurePercentage: number
  isWithinTarget: boolean

  totalEquipment: number
  equipmentBreakdown: {
    normal: number
    low: number
    maintenance: number
  }
}

export interface TireCheckDailyTrendItem {
  day: number
  date: string
  formattedDate: string
  totalChecked: number
  lowPressureQty: number
  targetChecked: number
  adjustedQty: number
  lowPressurePct: number
  normalPct: number
  warningPct: number
  lowPct: number
  status: 'normal' | 'warning' | 'low'
}

export interface TireCheckRekapRow {
  no: number
  site: string
  date: string
  tanggal: string
  totalTireChecked: number
  lowPressureQty: number
  targetCheckedQty: number
  adjustedQty: number
  status: 'normal' | 'warning' | 'alert'
  notes?: string
}

export interface TireCheckData {
  siteInfo: TireCheckSiteInfo
  targetConfig: TireCheckTargetConfig
  kpiSummary: TireCheckKpiSummary
  chartTrend: TireCheckDailyTrendItem[]
  rekapTable: TireCheckRekapRow[]
  rawItems?: RawTireCheckItem[]
  allRawItems?: RawTireCheckItem[]
}

export interface TireCheckFilterPeriod {
  id: string
  label: string
  range: string
  year: number
  month: number
  count: number
}

export interface TireCheckApiResponse {
  success: boolean
  message: string
  timestamp: string
  isLiveApi?: boolean
  apiEndpoint?: string
  totalRecordsInApi?: number
  availableSites?: TireCheckFilterSite[]
  availablePeriods?: TireCheckFilterPeriod[]
  data: TireCheckData
}

export type TireCheckSummaryPeriodType = 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type TireCheckTireSize = 'all_stacked' | '24.00R35' | '27.00R49' | 'consolidation'

export interface TireCheckSummaryBucket {
  key: string
  label: string
  fullLabel: string
  targetTires: number
  checkedTires: number
  checkedPct: number
  lowPressureTires: number
  lowPressurePct: number
  targetLowPressurePct: number
}

export interface TireCheckSiteSummaryGroup {
  siteCode: string
  siteName: string
  buckets: TireCheckSummaryBucket[]
  totalTarget: number
  totalChecked: number
  avgCheckedPct: number
  totalLowPressure: number
  avgLowPressurePct: number
  isAchieved: boolean
}

export interface TireCheckSizeSummaryDataset {
  sizeKey: string
  sizeLabel: string
  sites: TireCheckSiteSummaryGroup[]
  yLeftMax: number
  yRightMax: number
  targetBenchmarkPct: number
}
