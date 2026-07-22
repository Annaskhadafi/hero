import { desc, eq, inArray } from 'drizzle-orm'
import sharp from 'sharp'
import * as XLSX from 'xlsx'
import { db } from '@/db'
import {
  centralServiceForecastActuals,
  centralServiceForecastItems,
  centralServiceForecastPeriods,
} from '@/db/schema/central-service'
import { csForecastDailyReportConfig } from '@/db/schema/hero'
import { fetchSapRevenue } from '@/lib/cs-sap-db'
import {
  buildWorkflowEmailContent,
  getAppUrl,
  sendWorkflowEmailToMany,
} from '@/lib/workflow-email'
import type { EmailAttachment } from '@/lib/email-delivery'

const TEMPLATE_CODE = 'cs_forecast_daily_report'

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeEmail).filter(Boolean)))
}

export function parseEmailList(value?: string | string[] | null) {
  if (Array.isArray(value)) return uniqueEmails(value)
  if (!value) return []
  return uniqueEmails(value.split(/[,;\n]+/).map((item) => item.trim()))
}

export function parseSendTimes(value?: string | null) {
  const times = (value || '08:00')
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const m = t.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return null
      const hh = Math.min(23, Math.max(0, Number(m[1])))
      const mm = Math.min(59, Math.max(0, Number(m[2])))
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    })
    .filter((t): t is string => Boolean(t))
  return Array.from(new Set(times.length ? times : ['08:00'])).sort()
}

function isCarryOverStatus(status?: string | null) {
  return (status || '').trim().toLowerCase() === 'carry over'
}

function isCancelStatusDoc(status?: string | null) {
  return (status || '').trim().toLowerCase() === 'cancel'
}

function normalizeStatusDoc(status?: string | null) {
  if (status === 'Complete') return 'Invoice'
  if (status === 'Pending') return 'Waiting PO'
  return status || '-'
}

function formatStatusDoc(status?: string | null, poNumber?: string | null) {
  const normalized = normalizeStatusDoc(status)
  const po = (poNumber || '').trim()
  return normalized === 'PO Release' && po ? `${normalized} / ${po}` : normalized
}

function resolveLatestNonCancelStatusDoc(actuals: any[], category: string) {
  const categoryActuals = actuals.filter((actual) => actual.category === category)
  const latestNonCancel = categoryActuals.find((actual) => !isCancelStatusDoc(actual.itemStatus))
  const latestAny = categoryActuals[0]
  const source = latestNonCancel ?? latestAny

  return {
    status: normalizeStatusDoc(source?.itemStatus || '-'),
    poNumber: source?.invoiceNumber || '',
  }
}

function escapeXml(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncateText(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  const trimmed = String(str).trim()
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.substring(0, maxLen - 3) + '...'
}

function wrapText(str: string | null | undefined, maxCharsPerLine: number, maxLines = 2): string[] {
  if (!str) return ['']
  const trimmed = String(str).trim()
  if (trimmed.length <= maxCharsPerLine) return [trimmed]

  const words = trimmed.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      if (word.length > maxCharsPerLine) {
        let remaining = word
        while (remaining.length > maxCharsPerLine && lines.length < maxLines - 1) {
          lines.push(remaining.substring(0, maxCharsPerLine))
          remaining = remaining.substring(maxCharsPerLine)
        }
        currentLine = remaining
      } else {
        currentLine = word
      }
      if (lines.length >= maxLines - 1) break
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }

  if (lines.length === maxLines) {
    const totalChars = lines.join(' ').length
    if (totalChars < trimmed.length) {
      lines[maxLines - 1] = truncateText(lines[maxLines - 1], maxCharsPerLine)
    }
  }

  return lines.filter(Boolean)
}

// ponytail: fixed UTC+8 wall clock (Asia/Singapore = UTC+8, no DST)
const TZ_UTC8 = 'Asia/Singapore'

function getUtc8Parts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_UTC8,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

function fmtIdr(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)
}

function fmtUsd(v: number) {
  return (
    '$' +
    v.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function formatShortUsd(val: number) {
  if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'K'
  return '$' + val.toFixed(0)
}

export type CategoryRow = {
  category: string
  forecastIdr: number
  actualIdr: number
  forecastUsd: number
  actualUsd: number
  remarkMonthly: string
  remarkDaily: string
  sectionDaily: string
  status: string
  poNumber: string
}

export type CustomerGroup = {
  key: string
  customer: string
  pic: string
  month: string
  remarkMonthly: string
  categories: CategoryRow[]
  totalAmountIdr: number
  totalAmountUsd: number
  forecastStatus: string
}

function getRemainingAmount(cat: CategoryRow) {
  return Math.max(0, cat.forecastIdr - cat.actualIdr)
}

function getRemarkDaily(cat: CategoryRow) {
  return cat.category === 'Outstanding' && cat.sectionDaily
    ? [cat.sectionDaily, cat.remarkDaily].filter(Boolean).join(' / ')
    : cat.remarkDaily
}

export async function getCsForecastDailyReportConfig() {
  const [config] = await db
    .select()
    .from(csForecastDailyReportConfig)
    .orderBy(desc(csForecastDailyReportConfig.updatedAt))
    .limit(1)

  return (
    config ?? {
      id: 0,
      recipientEmails: '',
      ccEmails: '',
      sendTimes: '08:00',
      timezone: 'UTC+8',
      isActive: false,
      lastSentKey: '',
      lastSentAt: null as Date | null,
      updatedAt: new Date(),
    }
  )
}

function buildGroups(
  itemsList: any[],
  actualsByItem: Map<number, any[]>,
  rate: number,
  monthYear: string
): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>()

  itemsList.forEach((item) => {
    const key = `${item.customer}-${item.id}`
    const isAcc = item.isProductAccessories
    if (map.has(key)) return

    const itemActuals = actualsByItem.get(item.id) || []
    const categories: CategoryRow[] = []

    if (isAcc) {
      const forecastIdr = Number(item.accessoriesAmountIdr || 0)
      const forecastUsd = Number(item.accessoriesAmountUsd || 0)
      if (forecastIdr > 0) {
        categories.push({
          category: 'Accessories',
          forecastIdr,
          actualIdr: 0,
          forecastUsd,
          actualUsd: 0,
          remarkMonthly: item.remark || '',
          remarkDaily: '',
          sectionDaily: '',
          status: '-',
          poNumber: '',
        })
      }
    } else {
      const os = Number(item.osInvoicePrevMonth || 0)
      const repair = Number(item.repairForecast || 0)
      const service = Number(item.serviceForecast || 0)
      const retread = Number(item.retreadForecast || 0)

      if (os > 0) {
        categories.push({
          category: 'Outstanding',
          forecastIdr: os,
          actualIdr: 0,
          forecastUsd: os / rate,
          actualUsd: 0,
          remarkMonthly: item.osRemark || '',
          remarkDaily: '',
          sectionDaily: '',
          status: '-',
          poNumber: '',
        })
      }
      if (repair > 0) {
        categories.push({
          category: 'Repair',
          forecastIdr: repair,
          actualIdr: 0,
          forecastUsd: repair / rate,
          actualUsd: 0,
          remarkMonthly: item.repairRemark || '',
          remarkDaily: '',
          sectionDaily: '',
          status: '-',
          poNumber: '',
        })
      }
      if (retread > 0) {
        categories.push({
          category: 'Retread',
          forecastIdr: retread,
          actualIdr: 0,
          forecastUsd: retread / rate,
          actualUsd: 0,
          remarkMonthly: item.retreadRemark || '',
          remarkDaily: '',
          sectionDaily: '',
          status: '-',
          poNumber: '',
        })
      }
      if (service > 0) {
        categories.push({
          category: 'Service',
          forecastIdr: service,
          actualIdr: 0,
          forecastUsd: service / rate,
          actualUsd: 0,
          remarkMonthly: item.serviceRemark || '',
          remarkDaily: '',
          sectionDaily: '',
          status: '-',
          poNumber: '',
        })
      }
    }

    const seenDailyRemark = new Set<string>()
    itemActuals.forEach((a) => {
      const existing = categories.find((c) => c.category === a.category)
      if (existing) {
        if (!isCancelStatusDoc(a.itemStatus)) {
          existing.actualIdr += Number(a.amountIdr || 0)
          existing.actualUsd += Number(a.amountUsd || 0)
        }
        if (!seenDailyRemark.has(a.category)) {
          existing.remarkDaily = a.remark || existing.remarkDaily
          existing.sectionDaily = a.jobCode || existing.sectionDaily
          const latestStatus = resolveLatestNonCancelStatusDoc(itemActuals, a.category)
          existing.status = latestStatus.status || existing.status
          existing.poNumber = latestStatus.poNumber || existing.poNumber
          seenDailyRemark.add(a.category)
        }
      } else {
        const latestStatus = resolveLatestNonCancelStatusDoc(itemActuals, a.category)
        if (!seenDailyRemark.has(a.category)) {
          seenDailyRemark.add(a.category)
        }
        categories.push({
          category: a.category,
          forecastIdr: 0,
          actualIdr: isCancelStatusDoc(a.itemStatus) ? 0 : Number(a.amountIdr || 0),
          forecastUsd: 0,
          actualUsd: isCancelStatusDoc(a.itemStatus) ? 0 : Number(a.amountUsd || 0),
          remarkMonthly: '',
          remarkDaily: a.remark || '',
          sectionDaily: a.jobCode || '',
          status: latestStatus.status,
          poNumber: latestStatus.poNumber,
        })
      }
    })

    if (categories.length === 0) return

    const totalAmountIdr = categories.reduce((s, c) => s + c.forecastIdr, 0)
    const totalAmountUsd = totalAmountIdr / rate

    map.set(key, {
      key,
      customer: item.customer,
      pic: item.picSales || '',
      month: monthYear,
      remarkMonthly: item.remark || '',
      categories,
      totalAmountIdr,
      totalAmountUsd,
      forecastStatus: item.status || '',
    })
  })

  const groups = Array.from(map.values())
  groups.sort((a, b) => a.customer.localeCompare(b.customer))
  return groups
}

async function loadLatestPeriodReport() {
  const [period] = await db
    .select()
    .from(centralServiceForecastPeriods)
    .orderBy(desc(centralServiceForecastPeriods.monthYear))
    .limit(1)

  if (!period) return null

  const items = await db
    .select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.periodId, period.id))

  const itemIds = items.map((i) => i.id)
  const actuals =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(centralServiceForecastActuals)
          .where(inArray(centralServiceForecastActuals.forecastItemId, itemIds))
          .orderBy(desc(centralServiceForecastActuals.updateDate))

  const actualsByItem = new Map<number, typeof actuals>()
  for (const a of actuals) {
    if (!a.forecastItemId) continue
    const list = actualsByItem.get(a.forecastItemId) || []
    list.push(a)
    actualsByItem.set(a.forecastItemId, list)
  }

  const sap = await fetchSapRevenue(period.monthYear)
  const rate = Number(period.exchangeRateIdrToUsd) || 15000

  const pendingItems = items.filter((i) => !isCarryOverStatus(i.status))
  const carryOverItems = items.filter((i) => isCarryOverStatus(i.status))

  const pendingGrouped = buildGroups(pendingItems, actualsByItem, rate, period.monthYear)
  const carryOverGrouped = buildGroups(carryOverItems, actualsByItem, rate, period.monthYear)

  const serviceFc = pendingItems.reduce((s, i) => s + Number(i.serviceForecast || 0), 0)
  const repairFc = pendingItems.reduce((s, i) => s + Number(i.repairForecast || 0), 0)
  const retreadFc = pendingItems.reduce((s, i) => s + Number(i.retreadForecast || 0), 0)
  const osFc = pendingItems.reduce((s, i) => s + Number(i.osInvoicePrevMonth || 0), 0)
  const accessoriesFc = pendingItems.reduce((s, i) => s + Number(i.accessoriesAmountIdr || 0), 0)

  const sapService = Number(sap.service?.idr || 0)
  const sapServiceUsd = Number(sap.service?.usd || 0)
  const sapRepair = Number(sap.repair?.idr || 0)
  const sapRepairUsd = Number(sap.repair?.usd || 0)
  const sapRetread = Number(sap.retread?.idr || 0)
  const sapRetreadUsd = Number(sap.retread?.usd || 0)

  const totals = {
    serviceFc,
    repairFc,
    retreadFc,
    osFc,
    accessoriesFc,
    totalForecast: osFc + serviceFc + repairFc + retreadFc + accessoriesFc,
    sapService,
    sapServiceUsd,
    sapRepair,
    sapRepairUsd,
    sapRetread,
    sapRetreadUsd,
    sapTotal: sapService + sapRepair + sapRetread,
    sapTotalUsd: sapServiceUsd + sapRepairUsd + sapRetreadUsd,
  }

  const totalScore = {
    forecast: totals.totalForecast,
    forecastUsd: totals.totalForecast / rate,
    actual: totals.sapTotal,
    actualUsd: totals.sapTotalUsd || totals.sapTotal / rate,
  }

  return {
    period,
    rate,
    totals,
    totalScore,
    pendingGrouped,
    carryOverGrouped,
    pendingCount: pendingItems.length,
    carryCount: carryOverItems.length,
  }
}

function buildDocSheetRows(groups: CustomerGroup[], rate: number) {
  const headers = [
    'No',
    'Customer',
    'PIC',
    'Remark Monthly',
    'Forecast IDR',
    'Forecast USD',
    'Category',
    'Remark Daily',
    'Amount',
    'Amount USD',
    'Status Doc',
    'Sisa Amount',
    'Sisa USD',
    'Status Forecast',
  ]
  const dataRows: any[][] = []
  groups.forEach((group, gi) => {
    group.categories.forEach((cat, ci) => {
      const isFirst = ci === 0
      dataRows.push([
        isFirst ? gi + 1 : '',
        isFirst ? group.customer : '',
        isFirst ? group.pic : '',
        isFirst ? group.remarkMonthly || '' : '',
        isFirst && group.totalAmountIdr > 0 ? group.totalAmountIdr : '',
        isFirst && group.totalAmountUsd > 0 ? Math.round(group.totalAmountUsd) : '',
        cat.category,
        getRemarkDaily(cat) || '',
        cat.forecastIdr > 0 ? cat.forecastIdr : '',
        cat.forecastIdr > 0 ? Math.round(cat.forecastIdr / rate) : '',
        formatStatusDoc(cat.status, cat.poNumber),
        cat.forecastIdr > 0 ? getRemainingAmount(cat) : '',
        cat.forecastIdr > 0 ? Math.round(getRemainingAmount(cat) / rate) : '',
        isFirst ? group.forecastStatus : '',
      ])
    })
  })
  dataRows.push([
    '',
    '',
    '',
    'TOTAL',
    groups.reduce((s, g) => s + g.totalAmountIdr, 0),
    Math.round(groups.reduce((s, g) => s + g.totalAmountUsd, 0)),
    '',
    '',
    groups.reduce((s, g) => s + g.categories.reduce((cs, c) => cs + c.forecastIdr, 0), 0),
    Math.round(
      groups.reduce((s, g) => s + g.categories.reduce((cs, c) => cs + c.forecastIdr, 0), 0) / rate
    ),
    '',
    groups.reduce((s, g) => s + g.categories.reduce((cs, c) => cs + getRemainingAmount(c), 0), 0),
    Math.round(
      groups.reduce(
        (s, g) => s + g.categories.reduce((cs, c) => cs + getRemainingAmount(c), 0),
        0
      ) / rate
    ),
    '',
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  const mergeCols = [0, 1, 2, 3, 4, 5, 13]
  let currentRow = 1
  groups.forEach((group) => {
    const catLen = group.categories.length
    if (catLen > 1) {
      ws['!merges'] = ws['!merges'] || []
      mergeCols.forEach((col) => {
        ws['!merges']!.push({
          s: { r: currentRow, c: col },
          e: { r: currentRow + catLen - 1, c: col },
        })
      })
    }
    currentRow += catLen
  })
  ws['!cols'] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
  ]
  return ws
}

function buildExcelBuffer(report: NonNullable<Awaited<ReturnType<typeof loadLatestPeriodReport>>>) {
  const wb = XLSX.utils.book_new()
  const { period, rate, totals, totalScore, pendingGrouped, carryOverGrouped } = report

  const revenueRows = [
    ['Revenue SAP - Daily Report', '', '', '', '', '', ''],
    [`Period: ${period.monthYear}`, '', '', '', '', '', ''],
    [],
    ['Category', 'Forecast IDR', 'Forecast USD', 'Actual IDR (SAP)', 'Actual USD (SAP)'],
    [
      'Total',
      totalScore.forecast,
      totalScore.forecast / rate,
      totalScore.actual,
      totalScore.actualUsd,
    ],
    [
      'Service',
      totals.serviceFc,
      totals.serviceFc / rate,
      totals.sapService,
      totals.sapServiceUsd,
    ],
    [
      'Repair',
      totals.repairFc,
      totals.repairFc / rate,
      totals.sapRepair,
      totals.sapRepairUsd,
    ],
    [
      'Retread',
      totals.retreadFc,
      totals.retreadFc / rate,
      totals.sapRetread,
      totals.sapRetreadUsd,
    ],
  ]
  const wsRevenue = XLSX.utils.aoa_to_sheet(revenueRows)
  wsRevenue['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
  ]
  XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue SAP')
  XLSX.utils.book_append_sheet(wb, buildDocSheetRows(pendingGrouped, rate), 'Pending Document')
  XLSX.utils.book_append_sheet(wb, buildDocSheetRows(carryOverGrouped, rate), 'Carry Over')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

function buildSummarySvgString(report: NonNullable<Awaited<ReturnType<typeof loadLatestPeriodReport>>>) {
  const { period, rate, totals, totalScore, pendingGrouped, carryOverGrouped } = report

  const width = 1680

  // 1. Calculate Scorecard percentages
  const totalPct = totalScore.forecast > 0 ? (totalScore.actual / totalScore.forecast) * 100 : 0
  const servicePct = totals.serviceFc > 0 ? (totals.sapService / totals.serviceFc) * 100 : 0
  const repairPct = totals.repairFc > 0 ? (totals.sapRepair / totals.repairFc) * 100 : 0
  const retreadPct = totals.retreadFc > 0 ? (totals.sapRetread / totals.retreadFc) * 100 : 0

  const getPctColor = (p: number) => (p >= 100 ? '#047857' : p >= 80 ? '#1d4ed8' : p >= 50 ? '#b45309' : '#b91c1c')
  const getBarColor = (p: number) => (p >= 100 ? '#10b981' : p >= 80 ? '#3b82f6' : p >= 50 ? '#f59e0b' : '#ef4444')

  const scorecards = [
    {
      title: 'TOTAL',
      accent: '#f59e0b',
      pct: totalPct,
      pctColor: getPctColor(totalPct),
      fcIdr: totalScore.forecast,
      fcUsd: totalScore.forecastUsd,
      actIdr: totalScore.actual,
      actUsd: totalScore.actualUsd,
      barColor: getBarColor(totalPct),
    },
    {
      title: 'FORECAST SERVICE',
      accent: '#3b82f6',
      pct: servicePct,
      pctColor: getPctColor(servicePct),
      fcIdr: totals.serviceFc,
      fcUsd: totals.serviceFc / rate,
      actIdr: totals.sapService,
      actUsd: totals.sapServiceUsd,
      barColor: getBarColor(servicePct),
    },
    {
      title: 'FORECAST REPAIR',
      accent: '#d97706',
      pct: repairPct,
      pctColor: getPctColor(repairPct),
      fcIdr: totals.repairFc,
      fcUsd: totals.repairFc / rate,
      actIdr: totals.sapRepair,
      actUsd: totals.sapRepairUsd,
      barColor: getBarColor(repairPct),
    },
    {
      title: 'FORECAST RETREAD',
      accent: '#10b981',
      pct: retreadPct,
      pctColor: getPctColor(retreadPct),
      fcIdr: totals.retreadFc,
      fcUsd: totals.retreadFc / rate,
      actIdr: totals.sapRetread,
      actUsd: totals.sapRetreadUsd,
      barColor: getBarColor(retreadPct),
    },
  ]

  // 2. Bar chart categories
  const barCategories = [
    { name: 'Outstanding', fcUsd: totals.osFc / rate, actUsd: 0 },
    { name: 'Repair', fcUsd: totals.repairFc / rate, actUsd: totals.sapRepairUsd || totals.sapRepair / rate },
    { name: 'Retread', fcUsd: totals.retreadFc / rate, actUsd: totals.sapRetreadUsd || totals.sapRetread / rate },
    { name: 'Service', fcUsd: totals.serviceFc / rate, actUsd: totals.sapServiceUsd || totals.sapService / rate },
  ]

  const maxValUsd = Math.max(...barCategories.flatMap((c) => [c.fcUsd, c.actUsd]), 1000)
  const chartBottomY = 530
  const chartMaxH = 150

  const getBarH = (val: number) => Math.max(4, Math.round((val / maxValUsd) * chartMaxH))

  // 3. Pie chart segments
  const pieSegments = [
    { name: 'Service', value: totals.serviceFc / rate, color: '#FF8042' },
    { name: 'Repair', value: totals.repairFc / rate, color: '#00C49F' },
    { name: 'Outstanding', value: totals.osFc / rate, color: '#0088FE' },
    { name: 'Retread', value: totals.retreadFc / rate, color: '#FFBB28' },
  ].filter((s) => s.value > 0)

  const totalPieValue = pieSegments.reduce((s, c) => s + c.value, 0)

  let currentAngle = -Math.PI / 2
  const piePaths = pieSegments.map((seg) => {
    const angle = totalPieValue > 0 ? (seg.value / totalPieValue) * 2 * Math.PI : 0
    const startA = currentAngle
    const endA = currentAngle + angle
    currentAngle = endA

    const cx = 1248
    const cy = 445
    const rOuter = 85
    const rInner = 38

    const x1 = cx + rOuter * Math.cos(startA)
    const y1 = cy + rOuter * Math.sin(startA)
    const x2 = cx + rOuter * Math.cos(endA)
    const y2 = cy + rOuter * Math.sin(endA)

    const x3 = cx + rInner * Math.cos(endA)
    const y3 = cy + rInner * Math.sin(endA)
    const x4 = cx + rInner * Math.cos(startA)
    const y4 = cy + rInner * Math.sin(startA)

    const largeArc = angle > Math.PI ? 1 : 0

    const pathD = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`
    return { ...seg, pathD }
  })

  // 4. Calculate Table Positions & Dynamic Heights
  let currentY = 604

  // Function to build SVG markup for a document table (Pending or Carry Over) with generous spacing across 1616px
  function renderTableSvg(
    title: string,
    groups: CustomerGroup[],
    startY: number,
    headerBg: string
  ) {
    let y = startY

    // Section Header Box
    const headerMarkup = `
      <rect x="32" y="${y}" width="1616" height="38" rx="8" fill="${headerBg}"/>
      <text x="48" y="${y + 24}" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="0.5">${title} (${groups.length} Customers)</text>
    `
    y += 44

    // Table Column Headers (14 columns, total width = 1616px, x=32 to x=1648)
    const colHeaderY = y
    const colHeaderMarkup = `
      <rect x="32" y="${colHeaderY}" width="1616" height="32" fill="#facc15"/>
      <text x="50" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="middle">No</text>
      <text x="73" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800">Customer</text>
      <text x="263" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800">PIC</text>
      <text x="373" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800">Remark Monthly</text>
      <text x="623" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">Forecast IDR</text>
      <text x="708" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">Forecast USD</text>
      <text x="718" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800">Category</text>
      <text x="813" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800">Remark Daily</text>
      <text x="1093" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">Amount</text>
      <text x="1178" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">Amount USD</text>
      <text x="1250" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="middle">Status Doc</text>
      <text x="1428" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">Sisa Amount</text>
      <text x="1523" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">Sisa USD</text>
      <text x="1588" y="${colHeaderY + 20}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="middle">Status FC</text>
    `
    y += 32

    let rowsMarkup = ''
    let totalForecastIdr = 0
    let totalForecastUsd = 0
    let totalAmountIdr = 0
    let totalAmountUsd = 0
    let totalSisaIdr = 0
    let totalSisaUsd = 0

    if (groups.length === 0) {
      rowsMarkup += `
        <rect x="32" y="${y}" width="1616" height="36" fill="#ffffff"/>
        <text x="840" y="${y + 22}" fill="#64748b" font-family="Arial, sans-serif" font-size="11" text-anchor="middle">Tidak ada dokumen pada kategori ini</text>
      `
      y += 36
    } else {
      groups.forEach((group, gi) => {
        totalForecastIdr += group.totalAmountIdr
        totalForecastUsd += group.totalAmountUsd

        group.categories.forEach((cat, ci) => {
          const isFirst = ci === 0
          const rowY = y
          const bg = (gi + ci) % 2 === 0 ? '#ffffff' : '#f8fafc'
          const rowH = 34

          const remAmount = getRemainingAmount(cat)
          const fcUsd = cat.forecastIdr > 0 ? cat.forecastIdr / rate : 0
          const remUsd = cat.forecastIdr > 0 ? remAmount / rate : 0

          totalAmountIdr += cat.forecastIdr
          totalAmountUsd += fcUsd
          totalSisaIdr += remAmount
          totalSisaUsd += remUsd

          const isGroupHeader = isFirst
          const topBorder = isGroupHeader ? `<line x1="32" y1="${rowY}" x2="1648" y2="${rowY}" stroke="#cbd5e1" stroke-width="1"/>` : ''

          // Truncate PIC to max 14 chars to prevent overlapping into Remark Monthly
          const truncatedPic = isFirst ? truncateText(group.pic, 14) : ''

          // Cell multi-line render helper
          function renderCell(textVal: string, posX: number, maxChars: number, align: 'left' | 'center' | 'right', isBold = false) {
            const lines = wrapText(textVal, maxChars, 2)
            const anchor = align === 'right' ? 'end' : align === 'center' ? 'middle' : 'start'
            const fw = isBold ? '700' : '400'
            if (lines.length <= 1) {
              return `<text x="${posX}" y="${rowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="${fw}" text-anchor="${anchor}">${escapeXml(lines[0] || '')}</text>`
            } else {
              return `<text x="${posX}" y="${rowY + 14}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="${fw}" text-anchor="${anchor}">${escapeXml(lines[0])}<tspan x="${posX}" dy="13">${escapeXml(lines[1])}</tspan></text>`
            }
          }

          const colCustomer = isFirst ? renderCell(group.customer, 73, 25, 'left', true) : ''
          const colPic = isFirst ? `<text x="263" y="${rowY + 21}" fill="#334155" font-family="Arial, sans-serif" font-size="10">${escapeXml(truncatedPic)}</text>` : ''
          const colRemarkMonthly = isFirst ? renderCell(group.remarkMonthly, 373, 18, 'left') : ''
          const colCategory = renderCell(cat.category, 718, 12, 'left', true)
          const colRemarkDaily = renderCell(getRemarkDaily(cat), 813, 24, 'left')
          const colStatusDoc = renderCell(formatStatusDoc(cat.status, cat.poNumber), 1250, 17, 'center', true)
          const colStatusFc = isFirst ? renderCell(group.forecastStatus, 1588, 14, 'center') : ''

          rowsMarkup += `
            ${topBorder}
            <rect x="32" y="${rowY}" width="1616" height="${rowH}" fill="${bg}"/>
            <line x1="32" y1="${rowY + rowH}" x2="1648" y2="${rowY + rowH}" stroke="#e2e8f0" stroke-width="1"/>

            <!-- No -->
            <text x="50" y="${rowY + 21}" fill="#334155" font-family="Arial, sans-serif" font-size="10" font-weight="${isFirst ? '700' : '400'}" text-anchor="middle">${isFirst ? gi + 1 : ''}</text>

            <!-- Customer -->
            ${colCustomer}

            <!-- PIC -->
            ${colPic}

            <!-- Remark Monthly -->
            ${colRemarkMonthly}

            <!-- Forecast IDR -->
            <text x="623" y="${rowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="${isFirst ? '700' : '400'}" text-anchor="end">${isFirst && group.totalAmountIdr > 0 ? fmtIdr(group.totalAmountIdr) : ''}</text>

            <!-- Forecast USD -->
            <text x="708" y="${rowY + 21}" fill="#475569" font-family="Arial, sans-serif" font-size="10" font-weight="${isFirst ? '600' : '400'}" text-anchor="end">${isFirst && group.totalAmountUsd > 0 ? fmtUsd(group.totalAmountUsd) : ''}</text>

            <!-- Category -->
            ${colCategory}

            <!-- Remark Daily -->
            ${colRemarkDaily}

            <!-- Amount -->
            <text x="1093" y="${rowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" text-anchor="end">${cat.forecastIdr > 0 ? fmtIdr(cat.forecastIdr) : ''}</text>

            <!-- Amount USD -->
            <text x="1178" y="${rowY + 21}" fill="#475569" font-family="Arial, sans-serif" font-size="10" text-anchor="end">${cat.forecastIdr > 0 ? fmtUsd(fcUsd) : ''}</text>

            <!-- Status Doc -->
            ${colStatusDoc}

            <!-- Sisa Amount -->
            <text x="1428" y="${rowY + 21}" fill="#b45309" font-family="Arial, sans-serif" font-size="10" font-weight="600" text-anchor="end">${cat.forecastIdr > 0 ? fmtIdr(remAmount) : ''}</text>

            <!-- Sisa USD -->
            <text x="1523" y="${rowY + 21}" fill="#b45309" font-family="Arial, sans-serif" font-size="10" font-weight="600" text-anchor="end">${cat.forecastIdr > 0 ? fmtUsd(remUsd) : ''}</text>

            <!-- Status Forecast -->
            ${colStatusFc}
          `
          y += rowH
        })
      })
    }

    // TOTAL Row
    const totalRowY = y
    const totalRowMarkup = `
      <rect x="32" y="${totalRowY}" width="1616" height="34" fill="#fef08a"/>
      <line x1="32" y1="${totalRowY}" x2="1648" y2="${totalRowY}" stroke="#eab308" stroke-width="1.5"/>
      <line x1="32" y1="${totalRowY + 34}" x2="1648" y2="${totalRowY + 34}" stroke="#eab308" stroke-width="1.5"/>

      <text x="373" y="${totalRowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="11" font-weight="800">TOTAL</text>
      <text x="623" y="${totalRowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">${fmtIdr(totalForecastIdr)}</text>
      <text x="708" y="${totalRowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">${fmtUsd(totalForecastUsd)}</text>
      <text x="1093" y="${totalRowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">${fmtIdr(totalAmountIdr)}</text>
      <text x="1178" y="${totalRowY + 21}" fill="#0f172a" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">${fmtUsd(totalAmountUsd)}</text>
      <text x="1428" y="${totalRowY + 21}" fill="#b45309" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">${fmtIdr(totalSisaIdr)}</text>
      <text x="1523" y="${totalRowY + 21}" fill="#b45309" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="end">${fmtUsd(totalSisaUsd)}</text>
    `
    y += 34

    return {
      markup: headerMarkup + colHeaderMarkup + rowsMarkup + totalRowMarkup,
      endY: y,
    }
  }

  // Render Pending Document Table
  const pendingTable = renderTableSvg(
    'PENDING DOCUMENT',
    pendingGrouped,
    currentY,
    '#0052cc'
  )
  currentY = pendingTable.endY + 24

  // Render Carry Over Document Table (if carryOverGrouped exists)
  let carryTableMarkup = ''
  if (carryOverGrouped.length > 0) {
    const carryTable = renderTableSvg(
      'CARRY OVER DOCUMENT',
      carryOverGrouped,
      currentY,
      '#d97706'
    )
    carryTableMarkup = carryTable.markup
    currentY = carryTable.endY + 24
  }

  // Footer Section
  const footerY = currentY
  const footerMarkup = `
    <rect x="32" y="${footerY}" width="1616" height="52" rx="10" fill="#ffffff" stroke="#e2e8f0"/>
    <text x="52" y="${footerY + 31}" fill="#64748b" font-family="Arial, sans-serif" font-size="11" font-weight="600">CS Forecast Daily Report — ${period.monthYear}</text>
    <text x="1628" y="${footerY + 31}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="11" font-weight="600" text-anchor="end">Auto-generated by HERO System · UTC+8</text>
  `
  currentY += 68

  const height = currentY

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>

  <!-- Top Header Bar -->
  <rect x="32" y="24" width="1616" height="56" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="52" y="59" fill="#0f172a" font-family="Arial, sans-serif" font-size="20" font-weight="800">Daily Report</text>
  <rect x="180" y="38" width="110" height="28" rx="14" fill="#f1f5f9"/>
  <text x="235" y="56" fill="#475569" font-family="Arial, sans-serif" font-size="12" font-weight="700" text-anchor="middle">${period.monthYear}</text>

  <!-- Section: REVENUE SAP -->
  <text x="36" y="112" fill="#0284c7" font-family="Arial, sans-serif" font-size="12" font-weight="900" letter-spacing="1">REVENUE SAP</text>

  <!-- 4 Scorecards Row -->
  ${scorecards
    .map((c, idx) => {
      const cardX = 32 + idx * 408
      const cardY = 124
      const barW = Math.min(356, Math.max(0, (c.pct / 100) * 356))
      return `
    <rect x="${cardX}" y="${cardY}" width="392" height="140" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
    <rect x="${cardX}" y="${cardY}" width="6" height="140" rx="3" fill="${c.accent}"/>
    <text x="${cardX + 18}" y="${cardY + 28}" fill="#64748b" font-family="Arial, sans-serif" font-size="11" font-weight="800">${c.title}</text>
    <text x="${cardX + 374}" y="${cardY + 30}" fill="${c.pctColor}" font-family="Arial, sans-serif" font-size="24" font-weight="900" text-anchor="end">${c.pct.toFixed(1)}%</text>

    <text x="${cardX + 18}" y="${cardY + 62}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="9" font-weight="700">FORECAST</text>
    <text x="${cardX + 18}" y="${cardY + 80}" fill="#0f172a" font-family="Arial, sans-serif" font-size="14" font-weight="800">${fmtIdr(c.fcIdr)}</text>
    <text x="${cardX + 18}" y="${cardY + 96}" fill="#64748b" font-family="Arial, sans-serif" font-size="11" font-weight="600">${fmtUsd(c.fcUsd)}</text>

    <text x="${cardX + 374}" y="${cardY + 62}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="9" font-weight="700" text-anchor="end">REVENUE (IDR)</text>
    <text x="${cardX + 374}" y="${cardY + 80}" fill="#0f172a" font-family="Arial, sans-serif" font-size="14" font-weight="800" text-anchor="end">${fmtIdr(c.actIdr)}</text>
    <text x="${cardX + 374}" y="${cardY + 96}" fill="#64748b" font-family="Arial, sans-serif" font-size="11" font-weight="600" text-anchor="end">${fmtUsd(c.actUsd)}</text>

    <rect x="${cardX + 18}" y="${cardY + 118}" width="356" height="6" rx="3" fill="#f1f5f9"/>
    <rect x="${cardX + 18}" y="${cardY + 118}" width="${barW}" height="6" rx="3" fill="${c.barColor}"/>
  `
    })
    .join('')}

  <!-- Section: DOCUMENT COMPLETED -->
  <text x="36" y="294" fill="#0284c7" font-family="Arial, sans-serif" font-size="12" font-weight="900" letter-spacing="1">DOCUMENT COMPLETED</text>

  <!-- Left Card: Bar Chart -->
  <rect x="32" y="306" width="800" height="280" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="52" y="336" fill="#0f172a" font-family="Arial, sans-serif" font-size="14" font-weight="700">Forecast vs Actual (By Category)</text>
  <text x="52" y="352" fill="#64748b" font-family="Arial, sans-serif" font-size="11">Comparison in USD</text>

  <!-- Grid lines -->
  <line x1="100" y1="390" x2="780" y2="390" stroke="#f1f5f9" stroke-dasharray="3 3"/>
  <line x1="100" y1="436" x2="780" y2="436" stroke="#f1f5f9" stroke-dasharray="3 3"/>
  <line x1="100" y1="483" x2="780" y2="483" stroke="#f1f5f9" stroke-dasharray="3 3"/>
  <line x1="100" y1="530" x2="780" y2="530" stroke="#cbd5e1" stroke-width="1"/>

  <text x="92" y="394" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10" text-anchor="end">${formatShortUsd(maxValUsd)}</text>
  <text x="92" y="440" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10" text-anchor="end">${formatShortUsd(maxValUsd * 0.66)}</text>
  <text x="92" y="487" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10" text-anchor="end">${formatShortUsd(maxValUsd * 0.33)}</text>
  <text x="92" y="534" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10" text-anchor="end">$0</text>

  <!-- Category Bars -->
  ${barCategories
    .map((cat, idx) => {
      const groupX = 190 + idx * 155
      const fcH = getBarH(cat.fcUsd)
      const actH = getBarH(cat.actUsd)

      const fcY = chartBottomY - fcH
      const actY = chartBottomY - actH

      return `
      <!-- Forecast Bar -->
      <rect x="${groupX}" y="${fcY}" width="28" height="${fcH}" rx="3" fill="#8884d8"/>
      ${cat.fcUsd > 0 ? `<text x="${groupX + 14}" y="${fcY - 6}" fill="#475569" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle">${formatShortUsd(cat.fcUsd)}</text>` : ''}

      <!-- Actual Bar -->
      <rect x="${groupX + 32}" y="${actY}" width="28" height="${actH}" rx="3" fill="#82ca9d"/>
      ${cat.actUsd > 0 ? `<text x="${groupX + 46}" y="${actY - 6}" fill="#475569" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle">${formatShortUsd(cat.actUsd)}</text>` : ''}

      <!-- Category Label -->
      <text x="${groupX + 30}" y="550" fill="#475569" font-family="Arial, sans-serif" font-size="11" font-weight="600" text-anchor="middle">${cat.name}</text>
    `
    })
    .join('')}

  <!-- Bar Chart Legend -->
  <rect x="350" y="565" width="12" height="12" rx="2" fill="#8884d8"/>
  <text x="368" y="575" fill="#475569" font-family="Arial, sans-serif" font-size="11">Forecast</text>
  <rect x="450" y="565" width="12" height="12" rx="2" fill="#82ca9d"/>
  <text x="468" y="575" fill="#475569" font-family="Arial, sans-serif" font-size="11">Actual</text>

  <!-- Right Card: Pie Chart -->
  <rect x="848" y="306" width="800" height="280" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="868" y="336" fill="#0f172a" font-family="Arial, sans-serif" font-size="14" font-weight="700">Forecast Composition</text>
  <text x="868" y="352" fill="#64748b" font-family="Arial, sans-serif" font-size="11">Share of forecast per category</text>

  <!-- Donut slices -->
  ${piePaths.map((seg) => `<path d="${seg.pathD}" fill="${seg.color}"/>`).join('')}

  <!-- Pie Chart Legend -->
  ${pieSegments
    .map((seg, idx) => {
      const legX = 878 + (idx % 2) * 330
      const legY = 548 + Math.floor(idx / 2) * 20
      return `
    <rect x="${legX}" y="${legY}" width="10" height="10" rx="2" fill="${seg.color}"/>
    <text x="${legX + 16}" y="${legY + 9}" fill="#475569" font-family="Arial, sans-serif" font-size="11" font-weight="600">${seg.name}: ${formatShortUsd(seg.value)}</text>
  `
    })
    .join('')}

  <!-- Tables Markup -->
  ${pendingTable.markup}
  ${carryTableMarkup}

  <!-- Footer Markup -->
  ${footerMarkup}
</svg>`
}

async function buildSummaryJpegBuffer(report: NonNullable<Awaited<ReturnType<typeof loadLatestPeriodReport>>>) {
  const svg = buildSummarySvgString(report)
  return sharp(Buffer.from(svg))
    .jpeg({ quality: 92 })
    .toBuffer()
}

export async function sendCsForecastDailyReportEmail(options?: {
  force?: boolean
  actorEmail?: string | null
  slotKey?: string | null
}) {
  const config = await getCsForecastDailyReportConfig()
  if (!options?.force && !config.isActive) {
    return { status: 'skipped' as const, reason: 'Schedule nonaktif.' }
  }

  const to = parseEmailList(config.recipientEmails)
  const cc = parseEmailList(config.ccEmails)
  if (to.length === 0) {
    return { status: 'skipped' as const, reason: 'Penerima belum dikonfigurasi.' }
  }

  const report = await loadLatestPeriodReport()
  if (!report) {
    return { status: 'skipped' as const, reason: 'Belum ada periode forecast.' }
  }

  const { period, totals, pendingCount, carryCount } = report
  const ach =
    totals.totalForecast > 0 ? ((totals.sapTotal / totals.totalForecast) * 100).toFixed(1) : '0.0'
  const reportUrl = getAppUrl('/dashboard/central-service/forecast/report')
  const body = buildWorkflowEmailContent({
    title: `CS Forecast Daily Report — ${period.monthYear}`,
    intro:
      'Yth. Bapak/Ibu Management, Team Central Service, & Team Sales,\n\n' +
      'Berikut kami sampaikan laporan CS Forecast Daily Report per tanggal ' +
      getUtc8Parts().date +
      ' dengan rincian kinerja terlampir.\n\n' +
      'Mohon bantuan bagi Team Sales / Account Executive untuk dapat mem-follow up customer-customer yang terdaftar pada dokumen pending & carry over di bawah ini guna percepatan proses penerbitan PO / Invoice dan pencapaian target revenue.',
    details: [
      `Periode: ${period.monthYear}`,
      `Tanggal: ${getUtc8Parts().date}`,
      `Total Forecast: ${fmtIdr(totals.totalForecast)}`,
      `Revenue SAP: ${fmtIdr(totals.sapTotal)}`,
      `Achievement: ${ach}%`,
      `Pending Document: ${pendingCount} item`,
      `Carry Over: ${carryCount} item`,
    ],
    ctaLabel: 'Buka Daily Report',
    ctaUrl: reportUrl,
  })

  const xlsx = buildExcelBuffer(report)
  const jpeg = await buildSummaryJpegBuffer(report)

  const sanitizedPeriod = period.monthYear.replace(/[\s/]+/g, '-')

  const attachments: EmailAttachment[] = [
    {
      filename: `cs-forecast-daily-report-${sanitizedPeriod}.jpeg`,
      content: jpeg,
      contentType: 'image/jpeg',
    },
    {
      filename: `cs-forecast-daily-report-${sanitizedPeriod}.xlsx`,
      content: xlsx,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  ]

  const result = await sendWorkflowEmailToMany({
    recipients: to,
    cc,
    actorEmail: options?.actorEmail,
    templateCode: TEMPLATE_CODE,
    templateName: 'CS Forecast Daily Report',
    variables: {
      periodLabel: period.monthYear,
      reportDate: getUtc8Parts().date,
      totalForecast: fmtIdr(totals.totalForecast),
      revenueSap: fmtIdr(totals.sapTotal),
      achievement: `${ach}%`,
      pendingCount,
      carryOverCount: carryCount,
      reportUrl,
    },
    fallbackSubject: `CS Forecast Daily Report ${period.monthYear} — ${getUtc8Parts().date}`,
    fallbackHtml: body.html,
    fallbackText: body.text,
    attachments,
  })

  if (result.status === 'sent') {
    const now = new Date()
    const utc8 = getUtc8Parts(now)
    const key = options?.slotKey || `${utc8.date}|manual`
    const values = {
      recipientEmails: config.recipientEmails,
      ccEmails: config.ccEmails,
      sendTimes: config.sendTimes,
      timezone: 'UTC+8',
      isActive: config.isActive,
      lastSentKey: key,
      lastSentAt: now,
      updatedAt: now,
    }
    if (config.id) {
      await db
        .update(csForecastDailyReportConfig)
        .set(values)
        .where(eq(csForecastDailyReportConfig.id, config.id))
    } else {
      await db.insert(csForecastDailyReportConfig).values(values)
    }
  }

  return result
}

export async function runCsForecastDailyReportTick(referenceDate = new Date()) {
  const config = await getCsForecastDailyReportConfig()
  if (!config.isActive) {
    return { status: 'skipped' as const, reason: 'inactive', sent: false }
  }

  const to = parseEmailList(config.recipientEmails)
  if (to.length === 0) {
    return { status: 'skipped' as const, reason: 'no_recipients', sent: false }
  }

  const utc8 = getUtc8Parts(referenceDate)
  const times = parseSendTimes(config.sendTimes)
  // pick latest due slot for today (UTC+8) that is <= now and not yet sent
  const dueSlots = times.filter((t) => t <= utc8.time)
  if (dueSlots.length === 0) {
    return { status: 'skipped' as const, reason: 'before_send_time', sent: false, now: utc8 }
  }

  const slot = dueSlots[dueSlots.length - 1]
  const key = `${utc8.date}|${slot}`
  if (config.lastSentKey === key) {
    return { status: 'skipped' as const, reason: 'already_sent', sent: false, key }
  }

  // also skip if a later manual/send already covered a later slot same day
  if (config.lastSentKey?.startsWith(`${utc8.date}|`)) {
    const lastSlot = config.lastSentKey.split('|')[1] || ''
    if (lastSlot && lastSlot >= slot && lastSlot !== 'manual') {
      return { status: 'skipped' as const, reason: 'later_slot_sent', sent: false, key }
    }
  }

  const result = await sendCsForecastDailyReportEmail({ force: true, slotKey: key })
  return { ...result, sent: result.status === 'sent', key, now: utc8 }
}
