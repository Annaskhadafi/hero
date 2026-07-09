import { parseCsvToRecords } from '@/lib/security-user-import'

export const CS_FORECAST_IMPORT_FIELDS = [
  {
    key: 'customer',
    label: 'Customer',
    required: true,
    aliases: ['customer', 'pelanggan', 'nama customer'],
  },
  { key: 'picSales', label: 'PIC Sales', required: true, aliases: ['pic sales', 'pic', 'sales'] },
  {
    key: 'isProductAccessories',
    label: 'Is Accessories',
    required: false,
    aliases: ['is_product_accessories', 'accessories', 'aksesoris'],
  },
  {
    key: 'osInvoicePrevMonth',
    label: 'O/S Prev Month (IDR)',
    required: false,
    aliases: ['os invoice', 'os invoice prev month', 'os'],
  },
  {
    key: 'osRemark',
    label: 'O/S Remark',
    required: false,
    aliases: ['os remark', 'outstanding remark', 'os_remark'],
  },
  {
    key: 'repairForecast',
    label: 'Repair (IDR)',
    required: false,
    aliases: ['repair', 'repair forecast'],
  },
  {
    key: 'repairRemark',
    label: 'Repair Remark',
    required: false,
    aliases: ['repair remark', 'repair_remark'],
  },
  {
    key: 'retreadForecast',
    label: 'Retread (IDR)',
    required: false,
    aliases: ['retread', 'retread forecast'],
  },
  {
    key: 'retreadRemark',
    label: 'Retread Remark',
    required: false,
    aliases: ['retread remark', 'retread_remark'],
  },
  {
    key: 'serviceForecast',
    label: 'Service (IDR)',
    required: false,
    aliases: ['service', 'service forecast'],
  },
  {
    key: 'serviceRemark',
    label: 'Service Remark',
    required: false,
    aliases: ['service remark', 'service_remark'],
  },
  {
    key: 'accessoriesAmountIdr',
    label: 'Amount (IDR)',
    required: false,
    aliases: ['amount idr', 'amount_idr', 'accessories idr'],
  },
  {
    key: 'accessoriesAmountUsd',
    label: 'Amount (USD)',
    required: false,
    aliases: ['amount usd', 'amount_usd', 'accessories usd'],
  },
  { key: 'remark', label: 'Remark', required: false, aliases: ['remark', 'catatan', 'note'] },
] as const

export type CsForecastImportFieldKey = (typeof CS_FORECAST_IMPORT_FIELDS)[number]['key']

export type CsForecastCsvRow = Partial<
  Record<CsForecastImportFieldKey, string | number | boolean | null | undefined>
>

export const CS_FORECAST_EXAMPLE_CSV = buildCsForecastCsv([
  {
    customer: 'PETROSEA PSF',
    picSales: 'AGUNG',
    isProductAccessories: false,
    osInvoicePrevMonth: 0,
    osRemark: '',
    repairForecast: 0,
    repairRemark: '',
    retreadForecast: 0,
    retreadRemark: '',
    serviceForecast: 21345208,
    serviceRemark: 'MPS',
    accessoriesAmountIdr: 0,
    accessoriesAmountUsd: 0,
    remark: '',
  },
  {
    customer: 'AMMPT TABANG',
    picSales: 'AGUNG',
    isProductAccessories: false,
    osInvoicePrevMonth: 0,
    osRemark: '',
    repairForecast: 0,
    repairRemark: '',
    retreadForecast: 0,
    retreadRemark: '',
    serviceForecast: 98920000,
    serviceRemark: 'SSA TIREMAN JUNI 2026',
    accessoriesAmountIdr: 0,
    accessoriesAmountUsd: 0,
    remark: '',
  },
  {
    customer: 'CKB JAKARTA',
    picSales: 'MICHAEL',
    isProductAccessories: false,
    osInvoicePrevMonth: 0,
    osRemark: '',
    repairForecast: 0,
    repairRemark: '',
    retreadForecast: 0,
    retreadRemark: '',
    serviceForecast: 24000000,
    serviceRemark: 'SSA TIREMAN JUNI 2026',
    accessoriesAmountIdr: 0,
    accessoriesAmountUsd: 0,
    remark: '',
  },
])

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const text = `${value ?? ''}`
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildCsForecastCsv(rows: CsForecastCsvRow[]) {
  const columns = CS_FORECAST_IMPORT_FIELDS.map((field) => field.label)

  return [
    columns.join(','),
    ...rows.map((row) =>
      CS_FORECAST_IMPORT_FIELDS.map((field) => escapeCsvCell(row[field.key])).join(',')
    ),
  ].join('\n')
}

export function parseCsForecastCsv(raw: string) {
  return parseCsvToRecords(raw)
}

export function getCsForecastImportValue(
  row: Record<string, string>,
  key: CsForecastImportFieldKey
) {
  const field = CS_FORECAST_IMPORT_FIELDS.find((item) => item.key === key)
  if (!field) return ''

  const normalizedHeaders = new Map(
    Object.keys(row).map((header) => [normalizeHeader(header), header])
  )

  const header =
    normalizedHeaders.get(normalizeHeader(field.label)) ??
    normalizedHeaders.get(normalizeHeader(field.key)) ??
    field.aliases.map((alias) => normalizedHeaders.get(normalizeHeader(alias))).find(Boolean)

  return header ? (row[header]?.trim() ?? '') : ''
}

export function parseCsForecastBoolean(value: string, defaultValue: boolean) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return defaultValue
  if (['1', 'true', 'yes', 'y', 'ya', 'aktif', 'active', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'tidak', 'nonaktif', 'inactive', 'off'].includes(normalized))
    return false
  return defaultValue
}

export function parseCsForecastNumber(value: string, defaultValue: number) {
  if (!value) return defaultValue
  const numericValue = Number(value.replace(/[^0-9.-]+/g, ''))
  if (!Number.isFinite(numericValue)) return defaultValue
  return numericValue
}
