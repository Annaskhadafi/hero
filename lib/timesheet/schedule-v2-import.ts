import {
  getScheduleV2DayCount,
  type ScheduleV2Code,
  type ScheduleV2Row,
} from '@/lib/timesheet/schedule-v2'

type ImportEmployee = { id: number; name: string }
type SheetRows = { name: string; rows: unknown[][] }

export type ScheduleV2ImportResult = {
  period: string
  detectedPeriod: string | null
  rows: ScheduleV2Row[]
  matchedNames: string[]
  unmatchedNames: string[]
  unknownCodes: string[]
  importedCells: number
  sheetNames: string[]
}

const monthAliases: Record<string, number> = {
  januari: 1,
  january: 1,
  jan: 1,
  februari: 2,
  february: 2,
  feb: 2,
  maret: 3,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  june: 6,
  jun: 6,
  juli: 7,
  july: 7,
  jul: 7,
  agustus: 8,
  august: 8,
  agu: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  october: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  desember: 12,
  december: 12,
  des: 12,
  dec: 12,
}

const nameHeaders = new Set([
  'nama',
  'name',
  'employee',
  'karyawan',
  'namakaryawan',
  'employeename',
])
const dayHeaders = new Set(['tanggal', 'date', 'hari', 'day'])
const codeHeaders = new Set(['shift', 'kode', 'code', 'schedule', 'roster', 'jadwal', 'status'])
const excelEpoch = Date.UTC(1899, 11, 30)

function text(value: unknown) {
  return `${value ?? ''}`.trim()
}

export function normalizeScheduleV2ImportName(value: unknown) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function normalizeHeader(value: unknown) {
  return normalizeScheduleV2ImportName(value)
}

function dayFromDate(value: Date) {
  if (value.getFullYear() <= 1900) {
    return Math.round((value.getTime() - excelEpoch) / 86_400_000)
  }
  return value.getDate()
}

export function normalizeScheduleV2ImportCode(value: unknown): ScheduleV2Code | null {
  // ponytail: deterministic aliases cover known roster codes; add admin mapping only when a real unsupported code appears.
  const code = text(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
  if (!code) return ''
  if (['DS', 'DG', 'D', 'DAY', 'DAYSHIFT', 'PAGI', 'SHIFT1', 'IND', 'INDUCTION'].includes(code))
    return 'DS'
  if (['NS', 'NG', 'N', 'NIGHT', 'NIGHTSHIFT', 'MALAM', 'SHIFT2'].includes(code)) return 'NS'
  if (['OFF', 'O', 'LIBUR', 'REST', 'RDO'].includes(code)) return 'OFF'
  if (['FB', 'FIELDBREAK', 'CT', 'CUTI', 'LEAVE', 'AL'].includes(code)) return 'FB'
  return null
}

function detectPeriod(sheets: SheetRows[]) {
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const value of row) {
        if (
          value instanceof Date &&
          !Number.isNaN(value.getTime()) &&
          value.getFullYear() > 1900
        ) {
          return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
        }
        const valueText = text(value).toLowerCase()
        const year = valueText.match(/(?:19|20)\d{2}/)?.[0]
        if (!year) continue
        const normalized = valueText.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        const month = Object.entries(monthAliases).find(([alias]) =>
          new RegExp(`(^|[^a-z])${alias}([^a-z]|$)`, 'i').test(normalized)
        )?.[1]
        if (month) return `${year}-${String(month).padStart(2, '0')}`
      }
    }
  }
  return null
}

function employeeLookup(employees: ImportEmployee[]) {
  const exact = new Map<string, ImportEmployee[]>()
  for (const employee of employees) {
    const key = normalizeScheduleV2ImportName(employee.name)
    if (!key) continue
    exact.set(key, [...(exact.get(key) ?? []), employee])
  }
  return { exact, employees }
}

function nameTokens(value: unknown) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? []
}

function isOneEditAway(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 1) return false
  let leftIndex = 0
  let rightIndex = 0
  let edits = 0
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex++
      rightIndex++
      continue
    }
    if (++edits > 1) return false
    if (left.length >= right.length) leftIndex++
    if (right.length >= left.length) rightIndex++
  }
  if (leftIndex < left.length || rightIndex < right.length) edits++
  return edits <= 1
}

function namesMatch(left: unknown, right: unknown) {
  const leftTokens = nameTokens(left)
  const rightTokens = nameTokens(right)
  if (!leftTokens.length || leftTokens.length !== rightTokens.length) return false
  return leftTokens.every((token, index) => {
    const other = rightTokens[index]
    if (token === other) return true
    if ((token.length === 1 || other.length === 1) && token[0] === other[0]) return true
    return token.length >= 4 && other.length >= 4 && isOneEditAway(token, other)
  })
}

function uniqueEmployee(value: unknown, lookup: ReturnType<typeof employeeLookup>) {
  const exact = lookup.exact.get(normalizeScheduleV2ImportName(value)) ?? []
  if (exact.length) return exact.length === 1 ? exact[0] : null
  // ponytail: initials and one-character typos are accepted only when they resolve to one employee.
  const candidates = lookup.employees.filter((employee) => namesMatch(value, employee.name))
  return candidates.length === 1 ? candidates[0] : null
}

function dayFromHeader(value: unknown, dayCount: number) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = dayFromDate(value)
    return day >= 1 && day <= dayCount ? day : null
  }
  const raw = text(value)
  if (!/^\d{1,2}$/.test(raw)) return null
  const day = Number(raw)
  return day >= 1 && day <= dayCount ? day : null
}

function bestDayColumns(rows: unknown[][], dayCount: number) {
  let best = { rowIndex: -1, columns: new Map<number, number>() }
  rows.forEach((row, rowIndex) => {
    const columns = new Map<number, number>()
    row.forEach((value, columnIndex) => {
      const day = dayFromHeader(value, dayCount)
      if (day && !columns.has(day)) columns.set(day, columnIndex)
    })
    if (columns.size > best.columns.size) best = { rowIndex, columns }
  })
  return best
}

function parseDay(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    if (value.getFullYear() <= 1900) return { day: dayFromDate(value), period: null }
    return {
      day: value.getDate(),
      period: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`,
    }
  }
  const raw = text(value)
  if (/^\d{1,2}$/.test(raw)) return { day: Number(raw), period: null }
  const iso = raw.match(/^((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) return { day: Number(iso[3]), period: `${iso[1]}-${iso[2].padStart(2, '0')}` }
  const local = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)\d{2})$/)
  if (local) return { day: Number(local[1]), period: `${local[3]}-${local[2].padStart(2, '0')}` }
  return null
}

function emptySchedule(dayCount: number) {
  return Array.from({ length: dayCount }, () => '') as ScheduleV2Code[]
}

export function parseScheduleV2Import(
  sheets: SheetRows[],
  employees: ImportEmployee[],
  fallbackPeriod: string
): ScheduleV2ImportResult {
  const detectedPeriod = detectPeriod(sheets)
  // ponytail: selected schedule month is authoritative because roster title cells are often copied without being updated.
  const period = fallbackPeriod
  const dayCount = getScheduleV2DayCount(period)
  const lookup = employeeLookup(employees)
  const schedules = new Map<number, ScheduleV2Code[]>()
  const matchedNames = new Set<string>()
  const unmatchedNames = new Set<string>()
  const unknownCodes = new Set<string>()
  const sheetNames = new Set<string>()
  let importedCells = 0

  const put = (employee: ImportEmployee, day: number, rawCode: unknown, sheetName: string) => {
    if (day < 1 || day > dayCount) return
    const code = normalizeScheduleV2ImportCode(rawCode)
    if (code === null) {
      const raw = text(rawCode)
      if (raw) unknownCodes.add(raw)
      return
    }
    if (!code) return
    const schedule = schedules.get(employee.id) ?? emptySchedule(dayCount)
    schedule[day - 1] = code
    schedules.set(employee.id, schedule)
    matchedNames.add(employee.name)
    sheetNames.add(sheetName)
    importedCells++
  }

  for (const sheet of sheets) {
    const { rowIndex: dayRowIndex, columns: dayColumns } = bestDayColumns(sheet.rows, dayCount)
    const matrixMatches: Array<{ rowIndex: number; nameColumn: number; employee: ImportEmployee }> =
      []

    if (dayColumns.size >= 2) {
      sheet.rows.forEach((row, rowIndex) => {
        for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
          const employee = uniqueEmployee(row[columnIndex], lookup)
          if (!employee) continue
          matrixMatches.push({ rowIndex, nameColumn: columnIndex, employee })
          for (const [day, dayColumn] of dayColumns) put(employee, day, row[dayColumn], sheet.name)
          break
        }
      })
    }

    if (matrixMatches.length) {
      const nameColumnCounts = new Map<number, number>()
      matrixMatches.forEach(({ nameColumn }) =>
        nameColumnCounts.set(nameColumn, (nameColumnCounts.get(nameColumn) ?? 0) + 1)
      )
      const nameColumn = [...nameColumnCounts].sort((left, right) => right[1] - left[1])[0][0]
      sheet.rows.slice(dayRowIndex + 1).forEach((row) => {
        const rawName = row[nameColumn]
        if (!text(rawName) || uniqueEmployee(rawName, lookup)) return
        const hasSchedule = [...dayColumns.values()].some((column) =>
          normalizeScheduleV2ImportCode(row[column])
        )
        if (hasSchedule) unmatchedNames.add(text(rawName))
      })
      continue
    }

    const headerIndex = sheet.rows.findIndex((row) => {
      const headers = row.map(normalizeHeader)
      return (
        headers.some((header) => nameHeaders.has(header)) &&
        headers.some((header) => dayHeaders.has(header)) &&
        headers.some((header) => codeHeaders.has(header))
      )
    })
    if (headerIndex < 0) continue
    const headers = sheet.rows[headerIndex].map(normalizeHeader)
    const nameColumn = headers.findIndex((header) => nameHeaders.has(header))
    const dayColumn = headers.findIndex((header) => dayHeaders.has(header))
    const codeColumn = headers.findIndex((header) => codeHeaders.has(header))
    for (const row of sheet.rows.slice(headerIndex + 1)) {
      const rawName = row[nameColumn]
      const employee = uniqueEmployee(rawName, lookup)
      if (!employee) {
        if (text(rawName)) unmatchedNames.add(text(rawName))
        continue
      }
      const parsedDay = parseDay(row[dayColumn])
      if (!parsedDay || (parsedDay.period && parsedDay.period !== period)) continue
      put(employee, parsedDay.day, row[codeColumn], sheet.name)
    }
  }

  return {
    period,
    detectedPeriod,
    rows: [...schedules].map(([employeeId, schedule]) => ({ employeeId, schedule })),
    matchedNames: [...matchedNames],
    unmatchedNames: [...unmatchedNames],
    unknownCodes: [...unknownCodes],
    importedCells,
    sheetNames: [...sheetNames],
  }
}

export function mergeScheduleV2Import(baseRows: ScheduleV2Row[], importedRows: ScheduleV2Row[]) {
  const imported = new Map(importedRows.map((row) => [row.employeeId, row.schedule]))
  return baseRows.map((row) => {
    const schedule = imported.get(row.employeeId)
    if (!schedule) return row
    return {
      ...row,
      schedule: row.schedule.map((code, index) => schedule[index] || code),
    }
  })
}
