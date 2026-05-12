import Fuse from 'fuse.js'
import * as XLSX from 'xlsx'
import {
  normalizeAttendanceImportIdentity,
  type AttendanceImportEmployee,
  type AttendanceImportRawRow,
} from '@/lib/timesheet/attendance-import'
import { normalizeAttendanceStatus } from '@/lib/timesheet/attendance-real'

export type AttendanceTemplateKind =
  | 'matrix'
  | 'row-log'
  | 'fingerprint-detail'
  | 'contractor-detail'
export type AttendanceTemplateColumnMapping = Partial<
  Record<
    | 'employeeSn'
    | 'employeeName'
    | 'siteName'
    | 'date'
    | 'day'
    | 'clockIn'
    | 'clockOut'
    | 'scanTime'
    | 'eventType'
    | 'status'
    | 'absentFlag',
    number
  >
>
export type AttendanceTemplateDetection = {
  sheetName: string
  kind: AttendanceTemplateKind
  headerRowIndex: number
  columnMapping: AttendanceTemplateColumnMapping
  confidence: number
  warnings: string[]
}
export type AttendanceTemplateParseResult = {
  rows: AttendanceImportRawRow[]
  detection: AttendanceTemplateDetection
  warnings: string[]
}

type RawSheet = Array<Array<string>>
type EmployeeMatcher = {
  employee: AttendanceImportEmployee
  normalizedName: string
  normalizedSn: string
}

const fieldAliases: Record<keyof AttendanceTemplateColumnMapping, string[]> = {
  employeeSn: [
    'empno',
    'emp no',
    'sn',
    'pin',
    'noid',
    'no id',
    'nik',
    'userid',
    'user id',
    'badgeno',
    'badge no',
    'acno',
    'ac no',
    'id',
  ],
  employeeName: ['nama', 'name', 'employee', 'employee name', 'karyawan', 'personnel'],
  siteName: ['site', 'project', 'lokasi', 'location', 'departemen', 'department'],
  date: ['tanggal', 'tgl', 'date', 'waktuabsen', 'waktu absen'],
  day: ['day', 'hari'],
  clockIn: [
    'scanmasuk',
    'scan masuk',
    'checkin',
    'check in',
    'clockin',
    'clock in',
    'masuk',
    'in',
    'jammasuk',
    'jam masuk',
  ],
  clockOut: [
    'scanpulang',
    'scan pulang',
    'checkout',
    'check out',
    'clockout',
    'clock out',
    'keluar',
    'pulang',
    'out',
    'jampulang',
    'jam pulang',
  ],
  scanTime: ['jam', 'time', 'waktu', 'scan', 'datetime', 'waktuabsen', 'waktu absen'],
  eventType: ['inout', 'event', 'tipe', 'type'],
  status: ['status', 'normal', 'catatan', 'keterangan', 'autoassign', 'auto assign'],
  absentFlag: ['absent', 'absen'],
}

const employeeSnPriority = ['sn', 'noid', 'nik', 'pin', 'userid', 'badgeno', 'acno', 'id', 'empno']

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function normalizeCell(value: unknown) {
  return String(value ?? '').trim()
}

function readRows(workbook: XLSX.WorkBook, sheetName: string): RawSheet {
  return XLSX.utils
    .sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false })
    .map((row) => (row as unknown[]).map(normalizeCell))
}

function aliasField(header: string): keyof AttendanceTemplateColumnMapping | null {
  const normalized = normalizeHeader(header)
  if (!normalized) return null

  for (const [field, aliases] of Object.entries(fieldAliases) as Array<
    [keyof AttendanceTemplateColumnMapping, string[]]
  >) {
    if (aliases.some((alias) => normalized === normalizeHeader(alias))) return field
  }

  return null
}

function aliasPriority(field: keyof AttendanceTemplateColumnMapping, header: string) {
  const normalized = normalizeHeader(header)
  if (field === 'employeeSn') {
    const priority = employeeSnPriority.findIndex((alias) => normalized === normalizeHeader(alias))
    return priority === -1 ? employeeSnPriority.length : priority
  }
  if ((field === 'clockIn' || field === 'clockOut') && normalized.startsWith('scan')) return -1
  return 0
}

function buildMapping(header: string[]) {
  const mapping: AttendanceTemplateColumnMapping = {}
  const priorities: Partial<Record<keyof AttendanceTemplateColumnMapping, number>> = {}
  header.forEach((cell, index) => {
    const field = aliasField(cell)
    if (!field) return
    const priority = aliasPriority(field, cell)
    if (mapping[field] === undefined || priority < (priorities[field] ?? Number.MAX_SAFE_INTEGER)) {
      mapping[field] = index
      priorities[field] = priority
    }
  })
  return mapping
}

function mappingScore(mapping: AttendanceTemplateColumnMapping) {
  let score = 0
  if (mapping.employeeSn !== undefined) score += 3
  if (mapping.employeeName !== undefined) score += 3
  if (mapping.date !== undefined || mapping.day !== undefined) score += 3
  if (
    mapping.clockIn !== undefined ||
    mapping.clockOut !== undefined ||
    mapping.scanTime !== undefined
  )
    score += 2
  return score
}

function detectRowLog(rows: RawSheet, sheetName: string): AttendanceTemplateDetection | null {
  let best: AttendanceTemplateDetection | null = null

  rows.slice(0, 20).forEach((row, index) => {
    const mapping = buildMapping(row)
    const score = mappingScore(mapping)
    if (score < 7) return

    const kind: AttendanceTemplateKind =
      mapping.clockIn !== undefined || mapping.clockOut !== undefined ? 'row-log' : 'row-log'
    const detection = {
      sheetName,
      kind,
      headerRowIndex: index,
      columnMapping: mapping,
      confidence: score,
      warnings: [`Detected ${kind} sheet ${sheetName}`],
    }
    if (!best || detection.confidence > best.confidence) best = detection
  })

  return best
}

function detectMatrix(rows: RawSheet, sheetName: string): AttendanceTemplateDetection | null {
  let best: AttendanceTemplateDetection | null = null

  rows.slice(0, 20).forEach((row, index) => {
    const currentMapping = buildMapping(row)
    const nextRow = rows[index + 1] ?? []
    const previousRow = rows[index - 1] ?? []
    const nextMapping = buildMapping(nextRow)
    const previousMapping = buildMapping(previousRow)
    const mapping =
      mappingScore(currentMapping) >= mappingScore(previousMapping)
        ? currentMapping
        : previousMapping
    const fallbackMapping =
      mappingScore(mapping) >= mappingScore(nextMapping) ? mapping : nextMapping
    const dayColumns = row
      .map((cell, cellIndex) => ({ cell, cellIndex }))
      .filter(({ cell }) => /^\d{1,2}$/.test(cell))
    const nextRowDayColumns = nextRow
      .map((cell, cellIndex) => ({ cell, cellIndex }))
      .filter(({ cell }) => /^\d{1,2}$/.test(cell))
    const detectedDayColumns = dayColumns.length >= 5 ? dayColumns : nextRowDayColumns

    if (
      (fallbackMapping.employeeSn === undefined && fallbackMapping.employeeName === undefined) ||
      detectedDayColumns.length < 5
    )
      return

    const detection = {
      sheetName,
      kind: 'matrix' as const,
      headerRowIndex: dayColumns.length >= 5 ? index : index + 1,
      columnMapping: fallbackMapping,
      confidence: 8 + detectedDayColumns.length,
      warnings: [`Detected matrix sheet ${sheetName}`],
    }
    if (!best || detection.confidence > best.confidence) best = detection
  })

  return best
}

function detectFingerprintDetail(
  rows: RawSheet,
  sheetName: string
): AttendanceTemplateDetection | null {
  const normalizedSheetName = normalizeHeader(sheetName)
  const hasDetailMarker = rows
    .slice(0, 8)
    .some((row) => row.some((cell) => normalizeHeader(cell).includes('lapdetailabsensi')))
  const firstDayRow = rows.findIndex(
    (row) => row.slice(0, 14).filter((cell, index) => cell === String(index + 1)).length >= 5
  )
  const hasEmployeeBlocks = rows.some(
    (row) =>
      normalizeHeader(row[0]) === 'id' && row.some((cell) => normalizeHeader(cell) === 'nama')
  )
  const isLogSheet =
    normalizedSheetName.includes('logabsen') ||
    normalizedSheetName.includes('detaillog') ||
    hasDetailMarker
  if (!isLogSheet || firstDayRow === -1 || !hasEmployeeBlocks) return null

  return {
    sheetName,
    kind: 'fingerprint-detail',
    headerRowIndex: Math.max(0, firstDayRow),
    columnMapping: {},
    confidence: 100,
    warnings: [`Detected fingerprint detail sheet ${sheetName}`],
  }
}

function detectContractorDetail(
  rows: RawSheet,
  sheetName: string
): AttendanceTemplateDetection | null {
  // Detect "Contractor Attendance Detail Report" format:
  // Columns: Date | Badge Number | Employee Name | Contract No | ... |
  //          Check-In Datetime | Check-In Point Name | Check-Out Datetime | Check-Out Point Name | ...
  // Header row may appear after several title rows — scan up to row 20
  for (let index = 0; index < Math.min(rows.length, 20); index++) {
    const row = rows[index]
    const normalized = row.map(normalizeHeader)
    const hasDate = normalized.some((cell) => cell === 'date' || cell === 'tanggal')
    const hasBadge = normalized.some(
      (cell) => cell.includes('badge') || cell.includes('badgenumber') || cell.includes('badgeno')
    )
    const hasCheckIn = normalized.some(
      (cell) =>
        cell.includes('checkin') || cell.includes('checkindatetime') || cell.includes('checkindate')
    )
    const hasCheckOut = normalized.some(
      (cell) =>
        cell.includes('checkout') ||
        cell.includes('checkoutdatetime') ||
        cell.includes('checkoutdate')
    )
    const hasEmployeeName = normalized.some(
      (cell) => cell.includes('employeename') || cell === 'nama' || cell === 'name'
    )

    if (!hasDate) continue
    if (!hasBadge && !hasEmployeeName) continue
    if (!hasCheckIn && !hasCheckOut) continue

    const mapping: AttendanceTemplateColumnMapping = {}
    normalized.forEach((cell, colIndex) => {
      if (cell === 'date' || cell === 'tanggal') mapping.date = colIndex
      else if (
        (cell.includes('badge') || cell.includes('badgenumber') || cell.includes('badgeno')) &&
        !cell.includes('name') &&
        !cell.includes('nama')
      )
        mapping.employeeSn = colIndex // badge slot — NOT used as internal SN for matching
      else if (cell.includes('employeename') || cell === 'name' || cell === 'nama')
        mapping.employeeName = colIndex
      else if (
        cell === 'checkindatetime' ||
        cell === 'checkindate' ||
        (cell.includes('checkin') && !cell.includes('point') && !cell.includes('name'))
      )
        mapping.clockIn = colIndex
      else if (
        cell === 'checkoutdatetime' ||
        cell === 'checkoutdate' ||
        (cell.includes('checkout') && !cell.includes('point') && !cell.includes('name'))
      )
        mapping.clockOut = colIndex
      else if (
        cell.includes('sitename') ||
        (cell.includes('location') && !cell.includes('name')) ||
        cell.includes('lokasi')
      )
        mapping.siteName = colIndex
    })

    if (mapping.date === undefined) continue
    if (mapping.employeeName === undefined && mapping.employeeSn === undefined) continue

    return {
      sheetName,
      kind: 'contractor-detail',
      headerRowIndex: index,
      columnMapping: mapping,
      confidence: 95,
      warnings: [`Detected contractor detail report: ${sheetName} (header row ${index})`],
    }
  }
  return null
}

function detectTemplate(workbook: XLSX.WorkBook): {
  detection: AttendanceTemplateDetection
  rows: RawSheet
} {
  const candidates = workbook.SheetNames.flatMap((sheetName) => {
    const rows = readRows(workbook, sheetName)
    return [
      detectContractorDetail(rows, sheetName),
      detectRowLog(rows, sheetName),
      detectMatrix(rows, sheetName),
      detectFingerprintDetail(rows, sheetName),
    ]
      .filter((detection): detection is AttendanceTemplateDetection => Boolean(detection))
      .map((detection) => ({ detection, rows }))
  })

  const best = candidates.sort(
    (left, right) => right.detection.confidence - left.detection.confidence
  )[0]
  if (!best)
    throw new Error(
      'Template attendance tidak dikenali. Cek header Excel atau pilih template mapping manual.'
    )
  return best
}

function getCell(row: string[], index?: number) {
  return index === undefined ? '' : normalizeCell(row[index])
}

function parseDateDay(value: string, period: string) {
  if (!value) return null
  const trimmed = value.trim()
  const excelDate = Number(trimmed)
  if (Number.isFinite(excelDate) && excelDate > 20000) {
    const parsed = XLSX.SSF.parse_date_code(excelDate)
    if (parsed)
      return parsed.m === Number(period.slice(5, 7)) && parsed.y === Number(period.slice(0, 4))
        ? parsed.d
        : null
  }

  // Format: "01-Apr-2026" or "01-Apr-2026 06:23:25" (dd-Mon-yyyy with optional time)
  const monthNames: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }
  const ddMonYyyy = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/)
  if (ddMonYyyy) {
    const day = Number(ddMonYyyy[1])
    const month = monthNames[ddMonYyyy[2].toLowerCase()] ?? 0
    const year = Number(ddMonYyyy[3])
    const periodYear = Number(period.slice(0, 4))
    const periodMonth = Number(period.slice(5, 7))
    if (year === periodYear && month === periodMonth && day >= 1 && day <= 31) return day
    return null
  }

  const normalized = trimmed.replace(/\./g, '/').replace(/-/g, '/')
  const parts = normalized
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 3) {
    const [first, second, third] = parts.map(Number)
    const month = first > 12 ? second : first
    const day = first > 12 ? first : second
    const year = third < 100 ? 2000 + third : third
    if (
      year === Number(period.slice(0, 4)) &&
      month === Number(period.slice(5, 7)) &&
      day >= 1 &&
      day <= 31
    )
      return day
  }

  const isoDay = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDay && `${isoDay[1]}-${isoDay[2]}` === period) return Number(isoDay[3])

  return null
}

function normalizeTimeValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const time = trimmed.match(/(\d{1,2})[:.](\d{2})/)
  if (!time) return ''
  const hour = Number(time[1])
  const minute = Number(time[2])
  if (hour > 23 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseCompressedTimes(value: string) {
  const matches = value.match(/\d{1,2}[:.]\d{2}/g) ?? []
  if (matches.length) {
    const times = matches.map(normalizeTimeValue).filter(Boolean)
    return { clockIn: times[0] ?? '', clockOut: times[times.length - 1] ?? '' }
  }

  const compact = value.replace(/\D/g, '')
  if (compact.length < 8) return { clockIn: '', clockOut: '' }
  const chunks = compact.match(/\d{4}/g) ?? []
  const times = chunks
    .map((chunk) => normalizeTimeValue(`${chunk.slice(0, 2)}:${chunk.slice(2, 4)}`))
    .filter(Boolean)
  return { clockIn: times[0] ?? '', clockOut: times[times.length - 1] ?? '' }
}

function buildMatcher(employees: AttendanceImportEmployee[]) {
  const matchers = employees.map((employee) => ({
    employee,
    normalizedName: normalizeAttendanceImportIdentity(employee.name),
    normalizedSn: normalizeAttendanceImportIdentity(employee.employeeSn),
  }))
  const bySn = new Map(
    matchers.filter((item) => item.normalizedSn).map((item) => [item.normalizedSn, item.employee])
  )
  const byName = new Map(
    matchers
      .filter((item) => item.normalizedName)
      .map((item) => [item.normalizedName, item.employee])
  )
  const fuse = new Fuse(matchers, {
    keys: ['normalizedName', 'normalizedSn'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 3,
    includeScore: true,
  })

  return { bySn, byName, fuse }
}

function matchEmployee(
  input: { employeeSn: string; employeeName: string },
  employees: AttendanceImportEmployee[]
) {
  const { bySn, byName, fuse } = buildMatcher(employees)
  const snKey = normalizeAttendanceImportIdentity(input.employeeSn)
  if (snKey && bySn.has(snKey)) return bySn.get(snKey)!
  const nameKey = normalizeAttendanceImportIdentity(input.employeeName)
  if (nameKey && byName.has(nameKey)) return byName.get(nameKey)!
  const result = fuse.search([snKey, nameKey].filter(Boolean).join(' '))[0]
  return result && (result.score ?? 1) <= 0.35 ? (result.item as EmployeeMatcher).employee : null
}

function parseRowLog(
  rows: RawSheet,
  detection: AttendanceTemplateDetection,
  period: string
): AttendanceImportRawRow[] {
  const mapping = detection.columnMapping
  return rows.slice(detection.headerRowIndex + 1).flatMap((row) => {
    const employeeSn = getCell(row, mapping.employeeSn)
    const employeeName = getCell(row, mapping.employeeName)
    const day =
      mapping.day !== undefined
        ? Number(getCell(row, mapping.day))
        : parseDateDay(getCell(row, mapping.date), period)
    if (!day || day < 1 || day > 31 || (!employeeSn && !employeeName)) return []

    const scanTime = normalizeTimeValue(getCell(row, mapping.scanTime))
    const clockIn = normalizeTimeValue(getCell(row, mapping.clockIn)) || scanTime
    const clockOut = normalizeTimeValue(getCell(row, mapping.clockOut))
    const absentFlag = getCell(row, mapping.absentFlag).toLowerCase()
    const isAbsent = absentFlag === 'true' || absentFlag === '1' || absentFlag === 'yes'
    const statusValue =
      clockIn || clockOut ? 'Masuk' : isAbsent ? 'Absent' : getCell(row, mapping.status)

    return [
      {
        employeeSn,
        employeeName,
        siteName: getCell(row, mapping.siteName),
        day,
        status: normalizeAttendanceStatus(statusValue),
        clockIn,
        clockOut,
        note: statusValue,
      },
    ]
  })
}

function parseMatrix(
  rows: RawSheet,
  detection: AttendanceTemplateDetection,
  period: string
): AttendanceImportRawRow[] {
  const headerRow = rows[detection.headerRowIndex] ?? []
  const labelRow = rows[detection.headerRowIndex - 1] ?? []
  const nextRow = rows[detection.headerRowIndex + 1] ?? []
  const dayColumns = headerRow
    .map((cell, index) => ({ day: Number(cell), index }))
    .filter(({ day }) => Number.isInteger(day) && day >= 1 && day <= 31)
  const detectedMapping = detection.columnMapping
  const labelMapping = buildMapping(labelRow.length ? labelRow : headerRow)
  const nextMapping = buildMapping(nextRow)
  const mapping =
    mappingScore(detectedMapping) >= mappingScore(labelMapping) &&
    mappingScore(detectedMapping) >= mappingScore(nextMapping)
      ? detectedMapping
      : mappingScore(labelMapping) >= mappingScore(nextMapping)
        ? labelMapping
        : nextMapping
  const employeeSnIndex =
    mapping.employeeSn ?? labelRow.findIndex((cell) => normalizeHeader(cell) === 'sn')
  const employeeNameIndex =
    mapping.employeeName ?? labelRow.findIndex((cell) => normalizeHeader(cell) === 'nama')

  return rows.slice(detection.headerRowIndex + 1).flatMap((row) => {
    const employeeSn = getCell(row, employeeSnIndex >= 0 ? employeeSnIndex : undefined)
    const employeeName = getCell(row, employeeNameIndex >= 0 ? employeeNameIndex : undefined)
    if (!employeeSn && !employeeName) return []

    return dayColumns.flatMap(({ day, index }) => {
      const raw = getCell(row, index)
      if (!raw) return []
      return [
        {
          employeeSn,
          employeeName,
          siteName: '',
          day,
          status: normalizeAttendanceStatus(raw || 'Masuk'),
          clockIn: '',
          clockOut: '',
          note: raw,
        },
      ]
    })
  })
}

function parseFingerprintDetail(
  rows: RawSheet,
  detection: AttendanceTemplateDetection,
  period: string,
  employees: AttendanceImportEmployee[]
): AttendanceImportRawRow[] {
  const dayRow = rows[detection.headerRowIndex] ?? []
  const dayColumns = dayRow
    .map((cell, index) => ({ day: Number(cell), index }))
    .filter(({ day }) => Number.isInteger(day) && day >= 1 && day <= 31)
  const parsedRows: AttendanceImportRawRow[] = []

  for (let index = detection.headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]
    if (normalizeHeader(row[0]) !== 'id') continue

    const employeeSn = row.find((cell, cellIndex) => cellIndex > 0 && /^\d+$/.test(cell)) ?? ''
    const nameLabelIndex = row.findIndex((cell) => normalizeHeader(cell) === 'nama')
    const employeeName =
      nameLabelIndex >= 0
        ? getCell(row, nameLabelIndex + 2) || getCell(row, nameLabelIndex + 1)
        : ''
    const scans = rows[index + 1] ?? []
    const employee = matchEmployee({ employeeSn, employeeName }, employees)

    for (const { day, index: dayIndex } of dayColumns) {
      const raw = getCell(scans, dayIndex)
      if (!raw) continue
      const { clockIn, clockOut } = parseCompressedTimes(raw)
      if (!clockIn && !clockOut) continue
      parsedRows.push({
        employeeSn: employee?.employeeSn ?? employeeSn,
        employeeName: employee?.name ?? employeeName,
        siteName: '',
        day,
        status: 'present',
        clockIn,
        clockOut,
        note: raw,
      })
    }
  }

  return parsedRows.filter((row) => row.day >= 1 && row.day <= 31 && `${period}-`.length > 0)
}

// Parse datetime string like "01-Apr-2026 06:23:25" or "2026-04-01 06:23:25"
function parseContractorDatetime(
  value: string,
  period: string
): { day: number | null; time: string } {
  if (!value) return { day: null, time: '' }
  const trimmed = value.trim()

  // Format: "01-Apr-2026 06:23:25"
  const ddMonYyyy = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})/)
  if (ddMonYyyy) {
    const monthNames: Record<string, number> = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    }
    const day = Number(ddMonYyyy[1])
    const month = monthNames[ddMonYyyy[2].toLowerCase()] ?? 0
    const year = Number(ddMonYyyy[3])
    const hour = String(Number(ddMonYyyy[4])).padStart(2, '0')
    const minute = ddMonYyyy[5]
    const periodYear = Number(period.slice(0, 4))
    const periodMonth = Number(period.slice(5, 7))
    if (year === periodYear && month === periodMonth && day >= 1 && day <= 31) {
      return { day, time: `${hour}:${minute}` }
    }
    return { day: null, time: '' }
  }

  // Format: "2026-04-01 06:23:25"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    const hour = String(Number(isoMatch[4])).padStart(2, '0')
    const minute = isoMatch[5]
    const periodYear = Number(period.slice(0, 4))
    const periodMonth = Number(period.slice(5, 7))
    if (year === periodYear && month === periodMonth && day >= 1 && day <= 31) {
      return { day, time: `${hour}:${minute}` }
    }
    return { day: null, time: '' }
  }

  return { day: null, time: '' }
}

function parseContractorDetail(
  rows: RawSheet,
  detection: AttendanceTemplateDetection,
  period: string,
  employees: AttendanceImportEmployee[]
): AttendanceImportRawRow[] {
  const mapping = detection.columnMapping
  const matchers = employees.map((emp) => ({
    employee: emp,
    normalizedName: normalizeAttendanceImportIdentity(emp.name),
    normalizedSn: normalizeAttendanceImportIdentity(emp.employeeSn),
  }))
  const byName = new Map(matchers.map((m) => [m.normalizedName, m.employee]))
  const fuse = new Fuse(matchers, {
    keys: ['normalizedName'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 3,
    includeScore: true,
  })

  function matchByName(rawName: string): AttendanceImportEmployee | null {
    const key = normalizeAttendanceImportIdentity(rawName)
    if (!key) return null
    if (byName.has(key)) return byName.get(key)!
    const result = fuse.search(key)[0]
    return result && (result.score ?? 1) <= 0.35 ? result.item.employee : null
  }

  const dataRows = rows.slice(detection.headerRowIndex + 1)
  const result: AttendanceImportRawRow[] = []

  for (const row of dataRows) {
    // Skip empty rows, total rows, or footer rows
    const firstCell = (row[0] ?? '').trim()
    if (!firstCell || normalizeHeader(firstCell) === 'total') continue

    const rawName = getCell(row, mapping.employeeName)
    const badgeNumber = getCell(row, mapping.employeeSn) // customer badge — used as note only
    const checkInRaw = getCell(row, mapping.clockIn)
    const checkOutRaw = getCell(row, mapping.clockOut)
    const dateRaw = getCell(row, mapping.date)

    if (!rawName && !checkInRaw && !checkOutRaw) continue

    // Derive day from Check-In datetime first, fallback to Date column
    const checkIn = parseContractorDatetime(checkInRaw, period)
    const checkOut = parseContractorDatetime(checkOutRaw, period)
    const dateDay = parseDateDay(dateRaw, period)
    const day = checkIn.day ?? checkOut.day ?? dateDay
    if (!day) continue

    // Match employee by name using Fuse.js — Badge Number is NOT used for SN matching
    const matched = matchByName(rawName)

    result.push({
      employeeSn: '', // intentionally blank — badge ≠ internal SN
      employeeName: matched?.name ?? rawName, // prefer matched canonical name
      siteName: getCell(row, mapping.siteName),
      day,
      status: checkIn.time || checkOut.time ? 'present' : 'empty',
      clockIn: checkIn.time,
      clockOut: checkOut.time,
      // Store badge number in note for traceability
      note: badgeNumber ? `Badge: ${badgeNumber}` : '',
    })
  }

  return result
}

export function parseAttendanceWorkbook(params: {
  workbook: XLSX.WorkBook
  period: string
  employees: AttendanceImportEmployee[]
}): AttendanceTemplateParseResult {
  const { detection, rows } = detectTemplate(params.workbook)
  const parsedRows =
    detection.kind === 'contractor-detail'
      ? parseContractorDetail(rows, detection, params.period, params.employees)
      : detection.kind === 'matrix'
        ? parseMatrix(rows, detection, params.period)
        : detection.kind === 'fingerprint-detail'
          ? parseFingerprintDetail(rows, detection, params.period, params.employees)
          : parseRowLog(rows, detection, params.period)

  const warnings = [
    ...detection.warnings,
    `Parsed ${parsedRows.length} attendance rows from ${detection.sheetName}`,
  ]
  if (parsedRows.length === 0) warnings.push('Tidak ada data attendance terbaca dari template ini.')

  return { rows: parsedRows, detection, warnings }
}
