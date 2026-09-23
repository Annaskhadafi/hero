import 'server-only'

import { onechitaDb } from '@/db/onechitra-db'

export type SapAssetInventoryRow = {
  assetNo: string
  subNumber: string
  assetClass: string
  assetClassName: string
  assetDescription: string
  assetMainNoText: string
  acquisitionYear: number | null
  assetLocation: string
  assetLocationName: string
  assetRoom: string
  personelNo: string
  holderName: string
  holderPosition: string
  costCenter: string
  costCenterDescription: string
  inventoryNumber: string
  serialNumber: string
  firstAcquisitionOn: string | null
  acquisitionValue: number
  depreciation: number
  bookValue: number
  extractedAt: string | null
}

export type SapAssetSummaryRow = {
  code: string
  name: string
  extra: string
  assetCount: number
  acquisitionValue: number
  bookValue: number
}

export type SapAssetInventoryData = {
  success: boolean
  error?: string
  assets: SapAssetInventoryRow[]
  byLocation: SapAssetSummaryRow[]
  byClass: SapAssetSummaryRow[]
  byHolder: SapAssetSummaryRow[]
  byCostCenter: SapAssetSummaryRow[]
  stats: {
    totalAssets: number
    assignedAssets: number
    assetsWithBookValue: number
    totalAcquisitionValue: number
    totalBookValue: number
    lastExtractedAt: string | null
  }
}

function numberValue(value: unknown) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function nullableIso(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function summaryRows(rows: Array<Record<string, unknown>>): SapAssetSummaryRow[] {
  return rows.map((row) => ({
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    extra: String(row.extra ?? ''),
    assetCount: numberValue(row.asset_count),
    acquisitionValue: numberValue(row.acquisition_value),
    bookValue: numberValue(row.book_value),
  }))
}

export async function getSapAssetInventory(): Promise<SapAssetInventoryData> {
  try {
    const [
      assetsResult,
      locationsResult,
      classesResult,
      holdersResult,
      costCentersResult,
      statsResult,
    ] = await Promise.all([
      onechitaDb.query(`
          SELECT
            ab.asset_no AS "assetNo",
            COALESCE(ab.sub_number, '') AS "subNumber",
            COALESCE(ab.asset_class, '') AS "assetClass",
            COALESCE(ac.asset_class_name, '') AS "assetClassName",
            COALESCE(ab.asset_description, '') AS "assetDescription",
            COALESCE(ab.asset_main_no_text, '') AS "assetMainNoText",
            ab.acquisition_year AS "acquisitionYear",
            COALESCE(ab.asset_location, '') AS "assetLocation",
            COALESCE(al.asset_location_name, '') AS "assetLocationName",
            COALESCE(ab.asset_room, '') AS "assetRoom",
            COALESCE(ab.personel_no, '') AS "personelNo",
            COALESCE(ah.emp_name, '') AS "holderName",
            COALESCE(ah.emp_position, '') AS "holderPosition",
            COALESCE(ab.cost_center, '') AS "costCenter",
            COALESCE(acc.asset_cost_center_desc, '') AS "costCenterDescription",
            COALESCE(ab.asset_inventory_number, '') AS "inventoryNumber",
            COALESCE(ab.asset_serial_number, '') AS "serialNumber",
            ab.first_acquisition_on AS "firstAcquisitionOn",
            COALESCE(ab.curr_acquis_value, 0) AS "acquisitionValue",
            COALESCE(ab.curr_depreciation, 0) AS depreciation,
            COALESCE(ab.curr_book_value, 0) AS "bookValue",
            ab.extracted_at AS "extractedAt"
          FROM public.cp_asset_balances ab
          LEFT JOIN public.cp_asset_class ac ON ac.asset_class_no = ab.asset_class
          LEFT JOIN (
            SELECT asset_location_code, MAX(asset_location_name) AS asset_location_name
            FROM public.cp_asset_location
            GROUP BY asset_location_code
          ) al ON al.asset_location_code = ab.asset_location
          LEFT JOIN public.cp_asset_holder ah ON ah.emp_sn = ab.personel_no
          LEFT JOIN public.cp_asset_cost_center acc ON acc.asset_cost_center_name = ab.cost_center
          ORDER BY ab.asset_no, ab.sub_number
        `),
      onechitaDb.query(`
          SELECT
            COALESCE(ab.asset_location, '') AS code,
            COALESCE(al.asset_location_name, 'Belum dipetakan') AS name,
            '' AS extra,
            COUNT(*) AS asset_count,
            COALESCE(SUM(ab.curr_acquis_value), 0) AS acquisition_value,
            COALESCE(SUM(ab.curr_book_value), 0) AS book_value
          FROM public.cp_asset_balances ab
          LEFT JOIN (
            SELECT asset_location_code, MAX(asset_location_name) AS asset_location_name
            FROM public.cp_asset_location
            GROUP BY asset_location_code
          ) al ON al.asset_location_code = ab.asset_location
          GROUP BY ab.asset_location, al.asset_location_name
          ORDER BY COUNT(*) DESC, name
        `),
      onechitaDb.query(`
          SELECT
            COALESCE(ab.asset_class, '') AS code,
            COALESCE(ac.asset_class_name, 'Belum dipetakan') AS name,
            '' AS extra,
            COUNT(*) AS asset_count,
            COALESCE(SUM(ab.curr_acquis_value), 0) AS acquisition_value,
            COALESCE(SUM(ab.curr_book_value), 0) AS book_value
          FROM public.cp_asset_balances ab
          LEFT JOIN public.cp_asset_class ac ON ac.asset_class_no = ab.asset_class
          GROUP BY ab.asset_class, ac.asset_class_name
          ORDER BY COUNT(*) DESC, name
        `),
      onechitaDb.query(`
          SELECT
            COALESCE(ab.personel_no, '') AS code,
            COALESCE(ah.emp_name, 'Belum ditetapkan') AS name,
            COALESCE(ah.emp_position, '') AS extra,
            COUNT(*) AS asset_count,
            COALESCE(SUM(ab.curr_acquis_value), 0) AS acquisition_value,
            COALESCE(SUM(ab.curr_book_value), 0) AS book_value
          FROM public.cp_asset_balances ab
          LEFT JOIN public.cp_asset_holder ah ON ah.emp_sn = ab.personel_no
          GROUP BY ab.personel_no, ah.emp_name, ah.emp_position
          ORDER BY COUNT(*) DESC, name
        `),
      onechitaDb.query(`
          SELECT
            COALESCE(ab.cost_center, '') AS code,
            COALESCE(acc.asset_cost_center_desc, 'Belum dipetakan') AS name,
            '' AS extra,
            COUNT(*) AS asset_count,
            COALESCE(SUM(ab.curr_acquis_value), 0) AS acquisition_value,
            COALESCE(SUM(ab.curr_book_value), 0) AS book_value
          FROM public.cp_asset_balances ab
          LEFT JOIN public.cp_asset_cost_center acc ON acc.asset_cost_center_name = ab.cost_center
          GROUP BY ab.cost_center, acc.asset_cost_center_desc
          ORDER BY COUNT(*) DESC, name
        `),
      onechitaDb.query(`
          SELECT
            COUNT(*) AS total_assets,
            COUNT(*) FILTER (WHERE NULLIF(TRIM(COALESCE(personel_no, '')), '') IS NOT NULL) AS assigned_assets,
            COUNT(*) FILTER (WHERE COALESCE(curr_book_value, 0) > 0) AS assets_with_book_value,
            COALESCE(SUM(curr_acquis_value), 0) AS total_acquisition_value,
            COALESCE(SUM(curr_book_value), 0) AS total_book_value,
            MAX(extracted_at) AS last_extracted_at
          FROM public.cp_asset_balances
        `),
    ])

    const assets = assetsResult.rows.map((row) => ({
      assetNo: String(row.assetNo ?? ''),
      subNumber: String(row.subNumber ?? ''),
      assetClass: String(row.assetClass ?? ''),
      assetClassName: String(row.assetClassName ?? ''),
      assetDescription: String(row.assetDescription ?? ''),
      assetMainNoText: String(row.assetMainNoText ?? ''),
      acquisitionYear: row.acquisitionYear == null ? null : Number(row.acquisitionYear),
      assetLocation: String(row.assetLocation ?? ''),
      assetLocationName: String(row.assetLocationName ?? ''),
      assetRoom: String(row.assetRoom ?? ''),
      personelNo: String(row.personelNo ?? ''),
      holderName: String(row.holderName ?? ''),
      holderPosition: String(row.holderPosition ?? '').trim(),
      costCenter: String(row.costCenter ?? ''),
      costCenterDescription: String(row.costCenterDescription ?? ''),
      inventoryNumber: String(row.inventoryNumber ?? ''),
      serialNumber: String(row.serialNumber ?? ''),
      firstAcquisitionOn: nullableIso(row.firstAcquisitionOn),
      acquisitionValue: numberValue(row.acquisitionValue),
      depreciation: numberValue(row.depreciation),
      bookValue: numberValue(row.bookValue),
      extractedAt: nullableIso(row.extractedAt),
    }))

    const stats = statsResult.rows[0] ?? {}
    return {
      success: true,
      assets,
      byLocation: summaryRows(locationsResult.rows),
      byClass: summaryRows(classesResult.rows),
      byHolder: summaryRows(holdersResult.rows),
      byCostCenter: summaryRows(costCentersResult.rows),
      stats: {
        totalAssets: numberValue(stats.total_assets),
        assignedAssets: numberValue(stats.assigned_assets),
        assetsWithBookValue: numberValue(stats.assets_with_book_value),
        totalAcquisitionValue: numberValue(stats.total_acquisition_value),
        totalBookValue: numberValue(stats.total_book_value),
        lastExtractedAt: nullableIso(stats.last_extracted_at),
      },
    }
  } catch (error) {
    console.warn('[sap-asset-inventory] Failed to read One Chitra asset tables:', error)
    return {
      success: false,
      error: 'SAP asset data could not be read from the One Chitra database.',
      assets: [],
      byLocation: [],
      byClass: [],
      byHolder: [],
      byCostCenter: [],
      stats: {
        totalAssets: 0,
        assignedAssets: 0,
        assetsWithBookValue: 0,
        totalAcquisitionValue: 0,
        totalBookValue: 0,
        lastExtractedAt: null,
      },
    }
  }
}
