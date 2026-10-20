'use server'

export interface CtsSiteItem {
  id_site: string
  site: string
  id_company: string
  last_update?: string
  spm?: string
  cts?: string
}

export interface TireScrapSummaryItem {
  value: number
  unit: string
  change_percentage: number
  change_direction: 'positive' | 'negative' | 'neutral'
  previous_value: number
  formatted?: string
}

export interface TireScrapSummary {
  total_scrap_tires: TireScrapSummaryItem
  average_tire_life: TireScrapSummaryItem
  life_achievement: TireScrapSummaryItem
  estimated_scrap_loss: TireScrapSummaryItem
  top_scrap_reason: {
    reason: string
    count: number
    percentage: number
  }
}

export interface ScrapByBrandItem {
  brand: string
  count: number
}

export interface ScrapByReasonItem {
  reason: string
  count: number
  percentage: number
  category?: string
  color?: string
}

export interface TargetVsActualBrandItem {
  brand: string
  actual_life: number
  target_life: number
  achievement: number
}

export interface ScrapBySizeItem {
  size: string
  count: number
}

export interface ScrapTrendItem {
  month: number
  month_name: string
  scrap_count: number
  avg_life: number
}

export interface TireScrapCharts {
  scrap_by_brand: ScrapByBrandItem[]
  scrap_by_reason: ScrapByReasonItem[]
  target_vs_actual_by_brand: TargetVsActualBrandItem[]
  scrap_by_tire_size: ScrapBySizeItem[]
  scrap_trend: ScrapTrendItem[]
}

export interface TireScrapRecentEvent {
  serial_number: string
  brand: string
  size: string
  reason: string
  actual_life: number
  site: string
  date: string
  date_raw?: string
}

export interface TireScrapDetailRecord {
  brand: string
  tire_size: string
  pattern: string
  unit_number: string
  equipment: string
  site: string
  serial_number: string
  install_date: string
  scrap_date: string
  actual_life: number
  actual_life_text: string
  target_life: number
  target_life_text: string
  achievement: number
  achievement_text: string
  tread_remaining: number
  tread_remaining_text: string
  scrap_reason: string
  scrap_category: string
  position: string
  position_raw?: string
  status: string
  lossgain?: number
}

export interface AvailableFilters {
  sites: string[]
  siteDetails?: CtsSiteItem[]
  brands: string[]
  sizes: string[]
  patterns: string[]
  reasons: string[]
}

export interface TireScrapPagination {
  total_records: number
  limit: number
  offset: number
  page: number
  total_pages: number
}

export interface TireScrapResponse {
  status: number
  message?: string
  filters?: {
    site: string
    id_site?: string
    id_company?: string
    brand: string
    size: string
    pattern: string
    reason: string
    period: string
    start_date: string
    end_date: string
    unit: string
  }
  summary: TireScrapSummary
  charts: TireScrapCharts
  recent_events: TireScrapRecentEvent[]
  details: TireScrapDetailRecord[]
  available_filters: AvailableFilters
  pagination: TireScrapPagination
}

export interface TireScrapFilterParams {
  site?: string
  idsite?: string
  id_company?: string
  brand?: string
  size?: string
  pattern?: string
  reason?: string
  unit?: 'HM' | 'KM'
  startDate?: string
  endDate?: string
  year?: string | number
  limit?: number
  offset?: number
}

export interface RawTireScrapItem {
  serial_number?: string
  sn?: string
  kunci?: string | number
  brand?: string
  tire_size?: string
  size?: string
  pattern?: string
  site?: string
  unit_number?: string
  equipment?: string
  position?: string
  posisi?: string
  install_date?: string
  scrap_date?: string
  date?: string
  actual_life?: number | string
  lifetime?: number | string
  lifetime2?: number | string
  target_life?: number | string
  trgt?: number | string
  achievement?: number | string
  tread_remaining?: number | string
  rtd?: number | string
  scrap_reason?: string
  alasan?: string
  scrap_category?: string
  cause?: string
  lossgain?: number | string
  status?: string
}

const CTS_SCRAP_API_URL = 'https://cts-chitraparatama.co.id/ChitraTireMngr/product/api_get.php?function=get_tire_scrap_performance'
const CTS_SITE_API_URL = 'https://cts-chitraparatama.co.id/ChitraTireMngr/product/api_get.php?function=get_site'

// Fetch all available sites from CTS
export async function fetchCtsSites(): Promise<{ success: boolean; data: CtsSiteItem[]; error?: string }> {
  try {
    const res = await fetch(CTS_SITE_API_URL, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return { success: false, data: [], error: `CTS Site API error: ${res.statusText}` }
    }

    const json = await res.json()
    if (json.status === 1 && Array.isArray(json.data)) {
      return { success: true, data: json.data }
    }
    return { success: false, data: [], error: json.message || 'Gagal memuat sites' }
  } catch (err: any) {
    console.error('Failed to fetch CTS sites:', err)
    return { success: false, data: [], error: err.message || 'Koneksi ke CTS Site API gagal' }
  }
}

// Helper to transform raw records array into full dashboard metrics & charts
function transformRawRecordsToScrapResponse(
  rawList: RawTireScrapItem[],
  params: TireScrapFilterParams = {},
  availableSites: CtsSiteItem[] = []
): TireScrapResponse {
  const unit = params.unit || 'HM'
  const unitText = unit === 'KM' ? 'km' : 'hrs'

  const details: TireScrapDetailRecord[] = rawList.map((item, idx) => {
    const sn = item.serial_number || item.sn || `SN-${item.kunci || idx + 1}`
    const brand = item.brand || 'Unknown'
    const size = item.tire_size || item.size || '-'
    const pattern = item.pattern || '-'
    const site = item.site || '-'
    const unitNo = item.unit_number || '-'
    const equip = item.equipment || '-'
    const pos = item.position || item.posisi || '-'
    const installDate = item.install_date || '-'
    const scrapDate = item.scrap_date || item.date || '-'
    const actual = Number(item.actual_life ?? (unit === 'KM' ? item.lifetime2 : item.lifetime) ?? 0)
    const target = Number(item.target_life ?? item.trgt ?? 6000)
    const ach = target > 0 ? Math.round((actual / target) * 1000) / 10 : 0
    const tread = Number(item.tread_remaining ?? item.rtd ?? 0)
    const reason = item.scrap_reason || item.alasan || 'Worn Out'
    const cat = item.scrap_category || item.cause || 'Normal Wear'
    const loss = Number(item.lossgain ?? 0)
    const status = item.status || 'Scrap'

    return {
      brand,
      tire_size: size,
      pattern,
      unit_number: unitNo,
      equipment: equip,
      site,
      serial_number: sn,
      install_date: installDate,
      scrap_date: scrapDate,
      actual_life: actual,
      actual_life_text: `${actual.toLocaleString('en-US')} ${unitText}`,
      target_life: target,
      target_life_text: `${target.toLocaleString('en-US')} ${unitText}`,
      achievement: ach,
      achievement_text: `${ach}%`,
      tread_remaining: tread,
      tread_remaining_text: `${tread} mm`,
      scrap_reason: reason,
      scrap_category: cat,
      position: pos,
      status,
      lossgain: loss,
    }
  })

  // 1. Summary Calculations
  const totalScrap = details.length
  const avgLife = totalScrap > 0 ? Math.round(details.reduce((acc, cur) => acc + cur.actual_life, 0) / totalScrap) : 0
  const avgAchievement =
    totalScrap > 0 ? Math.round((details.reduce((acc, cur) => acc + cur.achievement, 0) / totalScrap) * 10) / 10 : 0
  const totalLoss = Math.abs(details.reduce((acc, cur) => acc + (cur.lossgain && cur.lossgain < 0 ? cur.lossgain : 0), 0))

  // Reason counts
  const reasonMap: Record<string, { count: number; category: string }> = {}
  const brandMap: Record<string, number> = {}
  const brandLifeMap: Record<string, { totalActual: number; totalTarget: number; count: number }> = {}
  const sizeMap: Record<string, number> = {}
  const monthMap: Record<number, { scrap: number; totalLife: number }> = {}

  for (let m = 1; m <= 12; m++) {
    monthMap[m] = { scrap: 0, totalLife: 0 }
  }

  details.forEach((d) => {
    // Reason
    if (!reasonMap[d.scrap_reason]) {
      reasonMap[d.scrap_reason] = { count: 0, category: d.scrap_category }
    }
    reasonMap[d.scrap_reason].count++

    // Brand
    brandMap[d.brand] = (brandMap[d.brand] || 0) + 1

    // Brand Target vs Actual
    if (!brandLifeMap[d.brand]) {
      brandLifeMap[d.brand] = { totalActual: 0, totalTarget: 0, count: 0 }
    }
    brandLifeMap[d.brand].totalActual += d.actual_life
    brandLifeMap[d.brand].totalTarget += d.target_life
    brandLifeMap[d.brand].count++

    // Size
    sizeMap[d.tire_size] = (sizeMap[d.tire_size] || 0) + 1

    // Month trend
    if (d.scrap_date && d.scrap_date !== '-') {
      const parsedDate = new Date(d.scrap_date)
      if (!isNaN(parsedDate.getTime())) {
        const m = parsedDate.getMonth() + 1
        if (monthMap[m]) {
          monthMap[m].scrap++
          monthMap[m].totalLife += d.actual_life
        }
      }
    }
  })

  // Top Reason
  let topReasonName = 'Cut Separation'
  let topReasonCount = 0
  Object.entries(reasonMap).forEach(([r, info]) => {
    if (info.count > topReasonCount) {
      topReasonCount = info.count
      topReasonName = r
    }
  })
  const topReasonPct = totalScrap > 0 ? Math.round((topReasonCount / totalScrap) * 1000) / 10 : 0

  // Scrap by Brand
  const scrap_by_brand: ScrapByBrandItem[] = Object.entries(brandMap)
    .map(([b, cnt]) => ({ brand: b, count: cnt }))
    .sort((a, b) => b.count - a.count)

  // Scrap by Reason
  const scrap_by_reason: ScrapByReasonItem[] = Object.entries(reasonMap)
    .map(([r, info]) => ({
      reason: r,
      count: info.count,
      percentage: totalScrap > 0 ? Math.round((info.count / totalScrap) * 1000) / 10 : 0,
      category: info.category,
    }))
    .sort((a, b) => b.count - a.count)

  // Target vs Actual by Brand
  const target_vs_actual_by_brand: TargetVsActualBrandItem[] = Object.entries(brandLifeMap)
    .map(([b, info]) => {
      const act = Math.round(info.totalActual / info.count)
      const trg = Math.round(info.totalTarget / info.count)
      return {
        brand: b,
        actual_life: act,
        target_life: trg,
        achievement: trg > 0 ? Math.round((act / trg) * 1000) / 10 : 0,
      }
    })
    .sort((a, b) => b.actual_life - a.actual_life)

  // Scrap by Tire Size
  const scrap_by_tire_size: ScrapBySizeItem[] = Object.entries(sizeMap)
    .map(([sz, cnt]) => ({ size: sz, count: cnt }))
    .sort((a, b) => b.count - a.count)

  // Scrap Trend
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const scrap_trend: ScrapTrendItem[] = Object.entries(monthMap).map(([mStr, val]) => {
    const m = Number(mStr)
    return {
      month: m,
      month_name: monthNames[m] || `M${m}`,
      scrap_count: val.scrap,
      avg_life: val.scrap > 0 ? Math.round(val.totalLife / val.scrap) : 0,
    }
  })

  // Recent Events (5 newest)
  const recent_events: TireScrapRecentEvent[] = details.slice(0, 5).map((d) => ({
    serial_number: d.serial_number,
    brand: d.brand,
    size: d.tire_size,
    reason: d.scrap_reason,
    actual_life: d.actual_life,
    site: d.site,
    date: d.scrap_date,
  }))

  // Available filters from unique values + CTS Site API
  const siteList = availableSites.length > 0
    ? availableSites.map((s) => s.site).sort()
    : Array.from(new Set(details.map((d) => d.site).filter((s) => s && s !== '-'))).sort()

  const available_filters: AvailableFilters = {
    sites: siteList,
    siteDetails: availableSites,
    brands: Array.from(new Set(details.map((d) => d.brand).filter((b) => b && b !== 'Unknown'))).sort(),
    sizes: Array.from(new Set(details.map((d) => d.tire_size).filter((s) => s && s !== '-'))).sort(),
    patterns: Array.from(new Set(details.map((d) => d.pattern).filter((p) => p && p !== '-'))).sort(),
    reasons: Array.from(new Set(details.map((d) => d.scrap_reason).filter(Boolean))).sort(),
  }

  // Format currency
  let formattedLoss = 'Rp 0'
  if (totalLoss >= 1_000_000_000) {
    formattedLoss = `Rp ${(totalLoss / 1_000_000_000).toFixed(1)} Billion`
  } else if (totalLoss >= 1_000_000) {
    formattedLoss = `Rp ${(totalLoss / 1_000_000).toFixed(1)} Million`
  } else if (totalLoss > 0) {
    formattedLoss = `Rp ${totalLoss.toLocaleString('en-US')}`
  }

  return {
    status: 1,
    message: 'Success',
    filters: {
      site: params.site || 'CK-KIM',
      id_site: params.idsite || '33',
      id_company: params.id_company || '2',
      brand: params.brand || 'All Brands',
      size: params.size || 'All Sizes',
      pattern: params.pattern || 'All Patterns',
      reason: params.reason || 'All Reasons',
      period: params.year ? `Year ${params.year}` : 'All Time',
      start_date: params.startDate || '',
      end_date: params.endDate || '',
      unit,
    },
    summary: {
      total_scrap_tires: {
        value: totalScrap,
        unit: 'units',
        change_percentage: 0,
        change_direction: 'neutral',
        previous_value: 0,
      },
      average_tire_life: {
        value: avgLife,
        unit: unitText,
        change_percentage: 0,
        change_direction: 'neutral',
        previous_value: 0,
      },
      life_achievement: {
        value: avgAchievement,
        unit: '%',
        change_percentage: 0,
        change_direction: 'neutral',
        previous_value: 0,
      },
      estimated_scrap_loss: {
        value: totalLoss,
        unit: 'USD',
        formatted: formattedLoss,
        change_percentage: 0,
        change_direction: 'neutral',
        previous_value: 0,
      },
      top_scrap_reason: {
        reason: topReasonName,
        count: topReasonCount,
        percentage: topReasonPct,
      },
    },
    charts: {
      scrap_by_brand,
      scrap_by_reason,
      target_vs_actual_by_brand,
      scrap_by_tire_size,
      scrap_trend,
    },
    recent_events,
    details,
    available_filters,
    pagination: {
      total_records: totalScrap,
      limit: params.limit || 500,
      offset: params.offset || 0,
      page: 1,
      total_pages: Math.ceil(totalScrap / (params.limit || 500)),
    },
  }
}

export async function fetchTireScrapPerformance(
  params: TireScrapFilterParams = {}
): Promise<{ success: boolean; data?: TireScrapResponse; error?: string }> {
  try {
    // 1. Fetch available sites first to map site name to idsite & id_company
    const sitesRes = await fetchCtsSites()
    const sites = sitesRes.success ? sitesRes.data : []

    // 2. Resolve idsite & id_company
    let resolvedIdSite = params.idsite
    let resolvedIdCompany = params.id_company

    // If site name is provided (e.g. 'CK-KIM'), find matching idsite & id_company
    if (params.site && params.site !== 'All Sites') {
      const match = sites.find((s) => s.site.toLowerCase() === params.site!.toLowerCase())
      if (match) {
        resolvedIdSite = match.id_site
        resolvedIdCompany = match.id_company
      }
    }

    // Default to CK-KIM (idsite: '33', id_company: '2') if not specified
    if (!resolvedIdSite || !resolvedIdCompany) {
      const kimSite = sites.find((s) => s.site === 'CK-KIM') || sites[0]
      if (kimSite) {
        resolvedIdSite = kimSite.id_site
        resolvedIdCompany = kimSite.id_company
      } else {
        resolvedIdSite = '33'
        resolvedIdCompany = '2'
      }
    }

    const url = new URL(CTS_SCRAP_API_URL)
    url.searchParams.set('idsite', resolvedIdSite)
    url.searchParams.set('id_company', resolvedIdCompany)

    if (params.brand && params.brand !== 'All Brands' && params.brand !== 'all') {
      url.searchParams.set('brand', params.brand)
    }
    if (params.size && params.size !== 'All Sizes' && params.size !== 'all') {
      url.searchParams.set('size', params.size)
    }
    if (params.pattern && params.pattern !== 'All Patterns' && params.pattern !== 'all') {
      url.searchParams.set('pattern', params.pattern)
    }
    if (params.reason && params.reason !== 'All Reasons' && params.reason !== 'all') {
      url.searchParams.set('reason', params.reason)
    }
    if (params.unit) {
      url.searchParams.set('unit', params.unit)
    }
    if (params.startDate) {
      url.searchParams.set('start_date', params.startDate)
    }
    if (params.endDate) {
      url.searchParams.set('end_date', params.endDate)
    }
    if (params.year && params.year !== 'all') {
      url.searchParams.set('year', String(params.year))
    }

    // Request up to 1000 records so dashboard gets rich real data
    const requestLimit = params.limit ? Math.max(params.limit, 500) : 500
    url.searchParams.set('limit', String(requestLimit))

    if (params.offset !== undefined) {
      url.searchParams.set('offset', String(params.offset))
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return {
        success: false,
        error: `CTS API responded with status ${res.status}: ${res.statusText}`,
      }
    }

    const rawJson = await res.json()

    if (rawJson.status === 0) {
      return {
        success: false,
        error: rawJson.message || 'API returned status 0',
      }
    }

    // AUTO-DETECTION: If the API returns raw records array (e.g. data: [...] or array root),
    // automatically transform and compute all dashboard KPI & charts!
    if (Array.isArray(rawJson.data) && rawJson.data.length > 0) {
      const transformed = transformRawRecordsToScrapResponse(rawJson.data, params, sites)
      return {
        success: true,
        data: transformed,
      }
    } else if (Array.isArray(rawJson) && rawJson.length > 0) {
      const transformed = transformRawRecordsToScrapResponse(rawJson, params, sites)
      return {
        success: true,
        data: transformed,
      }
    }

    const data: TireScrapResponse = rawJson

    return {
      success: true,
      data,
    }
  } catch (err: any) {
    console.error('Failed to fetch tire scrap performance from CTS API:', err)
    return {
      success: false,
      error: err.message || 'Network error fetching tire scrap performance',
    }
  }
}
