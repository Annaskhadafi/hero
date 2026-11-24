export type DefaultRepairSite = {
  siteCode: string
  siteName: string
}

export const DEFAULT_REPAIR_SITES: DefaultRepairSite[] = [
  { siteCode: "0201", siteName: "CP BUMA TANJUNG" },
  { siteCode: "0202", siteName: "CP SBS" },
  { siteCode: "0203", siteName: "CP Malinau" },
  { siteCode: "0204", siteName: "CP Banyuwangi" },
  { siteCode: "0205", siteName: "CP Sorowako" },
  { siteCode: "0206", siteName: "CP Bengkulu" },
  { siteCode: "CONS", siteName: "CP MHU" },
  { siteCode: "RS01", siteName: "CP Balikpapan" },
  { siteCode: "RS02", siteName: "CP Sangatta" },
  { siteCode: "RS03", siteName: "CP BMB" },
  { siteCode: "RS04", siteName: "CP BIB" },
  { siteCode: "RS07", siteName: "CP KIM" },
  { siteCode: "RS08", siteName: "CP Berau" },
  { siteCode: "RS14", siteName: "CP SIS TANJUNG" },
]

export function normalizeRepairMasterCode(value: string) {
  return value.trim().toUpperCase()
}

export function resolveRepairSiteFromText(
  text: string | null | undefined
): DefaultRepairSite | null {
  if (!text) return null
  const cleaned = text.trim().toLowerCase()
  if (!cleaned) return null

  // Direct code match
  for (const site of DEFAULT_REPAIR_SITES) {
    if (site.siteCode.toLowerCase() === cleaned) return site
  }

  // Keyword match
  if (cleaned.includes('sangatta') || cleaned.includes('rs02')) {
    return { siteCode: 'RS02', siteName: 'CP Sangatta' }
  }
  if (cleaned.includes('balikpapan') || cleaned.includes('rs01')) {
    return { siteCode: 'RS01', siteName: 'CP Balikpapan' }
  }
  if (cleaned.includes('bmb') || cleaned.includes('rs03')) {
    return { siteCode: 'RS03', siteName: 'CP BMB' }
  }
  if (cleaned.includes('bib') || cleaned.includes('rs04')) {
    return { siteCode: 'RS04', siteName: 'CP BIB' }
  }
  if (cleaned.includes('kim') || cleaned.includes('rs07')) {
    return { siteCode: 'RS07', siteName: 'CP KIM' }
  }
  if (cleaned.includes('berau') || cleaned.includes('rs08')) {
    return { siteCode: 'RS08', siteName: 'CP Berau' }
  }
  if (cleaned.includes('sis tanjung') || cleaned.includes('rs14')) {
    return { siteCode: 'RS14', siteName: 'CP SIS TANJUNG' }
  }
  if (
    cleaned.includes('buma') ||
    cleaned.includes('adaro') ||
    cleaned.includes('tanjung') ||
    cleaned.includes('0201')
  ) {
    return { siteCode: '0201', siteName: 'CP BUMA TANJUNG' }
  }
  if (cleaned.includes('sbs') || cleaned.includes('0202')) {
    return { siteCode: '0202', siteName: 'CP SBS' }
  }
  if (cleaned.includes('malinau') || cleaned.includes('kpuc') || cleaned.includes('0203')) {
    return { siteCode: '0203', siteName: 'CP Malinau' }
  }
  if (cleaned.includes('banyuwangi') || cleaned.includes('0204')) {
    return { siteCode: '0204', siteName: 'CP Banyuwangi' }
  }
  if (cleaned.includes('sorowako') || cleaned.includes('vale') || cleaned.includes('0205')) {
    return { siteCode: '0205', siteName: 'CP Sorowako' }
  }
  if (cleaned.includes('bengkulu') || cleaned.includes('0206')) {
    return { siteCode: '0206', siteName: 'CP Bengkulu' }
  }
  if (cleaned.includes('mhu') || cleaned.includes('cons')) {
    return { siteCode: 'CONS', siteName: 'CP MHU' }
  }

  // Fallback match on siteName
  for (const site of DEFAULT_REPAIR_SITES) {
    if (cleaned.includes(site.siteName.toLowerCase())) return site
  }

  return null
}

type RepairMasterStockFields = {
  materialCode: string
  valuationStockValue?: string | null
  currency?: string | null
  valuatedStock?: string | null
  uom?: string | null
}

type StockSapMatch = {
  materialNo: string | null
  totalStock: string | number | null
  valueStock: string | number | null
  currency: string | null
  baseUnitOfMeasure: string | null
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatStockNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0"
  }

  return Number(value.toFixed(3)).toString()
}

export function mergeRepairMasterItemsWithStockSap<TItem extends RepairMasterStockFields>(
  items: TItem[],
  stockRows: StockSapMatch[],
) {
  const stockByMaterial = new Map<string, {
    totalStock: number
    valueStock: number
    currency: string | null
    baseUnitOfMeasure: string | null
  }>()

  for (const row of stockRows) {
    const materialCode = normalizeRepairMasterCode(row.materialNo ?? "")
    if (!materialCode) {
      continue
    }

    const existing = stockByMaterial.get(materialCode)
    if (existing) {
      existing.totalStock += toNumber(row.totalStock)
      existing.valueStock += toNumber(row.valueStock)
      existing.currency = existing.currency || row.currency?.trim() || null
      existing.baseUnitOfMeasure = existing.baseUnitOfMeasure || row.baseUnitOfMeasure?.trim() || null
      continue
    }

    stockByMaterial.set(materialCode, {
      totalStock: toNumber(row.totalStock),
      valueStock: toNumber(row.valueStock),
      currency: row.currency?.trim() || null,
      baseUnitOfMeasure: row.baseUnitOfMeasure?.trim() || null,
    })
  }

  return items.map((item) => {
    const stock = stockByMaterial.get(normalizeRepairMasterCode(item.materialCode))
    if (!stock) {
      return item
    }

    return {
      ...item,
      valuationStockValue: formatStockNumber(stock.totalStock),
      valuatedStock: formatStockNumber(stock.valueStock),
      currency: stock.currency || item.currency,
      uom: stock.baseUnitOfMeasure || item.uom,
    }
  })
}
