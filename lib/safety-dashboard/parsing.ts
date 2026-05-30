const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  january: 0,
  januari: 0,
  feb: 1,
  february: 1,
  februari: 1,
  mar: 2,
  march: 2,
  maret: 2,
  apr: 3,
  april: 3,
  may: 4,
  mei: 4,
  jun: 5,
  june: 5,
  juni: 5,
  jul: 6,
  july: 6,
  juli: 6,
  aug: 7,
  august: 7,
  agustus: 7,
  sep: 8,
  sept: 8,
  september: 8,
  okt: 9,
  oct: 9,
  october: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
  desember: 11,
}

export function normalizeSafetyText(value: unknown) {
  return value == null ? "" : String(value).replace(/\s+/g, " ").trim()
}

export function normalizeSafetyNumber(value: unknown) {
  const text = normalizeSafetyText(value)
  if (!text || text === "-" || text === "\\") {
    return null
  }

  const onlyNumber = text.replace(/[^0-9,.-]/g, "")
  if (!onlyNumber || onlyNumber === "-" || onlyNumber === "." || onlyNumber === ",") {
    return null
  }

  const commaCount = (onlyNumber.match(/,/g) ?? []).length
  const dotCount = (onlyNumber.match(/\./g) ?? []).length
  let normalized = onlyNumber

  if (commaCount > 0 && dotCount > 0) {
    normalized = onlyNumber.replace(/,/g, "")
  } else if (commaCount === 1 && dotCount === 0) {
    const [left, right] = onlyNumber.split(",")
    normalized = right.length === 3 && left.length <= 3 ? `${left}${right}` : `${left}.${right}`
  } else if (commaCount > 1 && dotCount === 0) {
    normalized = onlyNumber.replace(/,/g, "")
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseSafetyDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  const text = normalizeSafetyText(value)
  if (!text) {
    return null
  }

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoDate) {
    const [, year, month, day] = isoDate
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const namedMonth = text.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{2,4})$/)
  if (namedMonth) {
    const [, day, monthName, rawYear] = namedMonth
    const month = MONTH_LOOKUP[monthName.toLowerCase()]
    if (month != null) {
      const yearNumber = Number(rawYear)
      return new Date(yearNumber < 100 ? 2000 + yearNumber : yearNumber, month, Number(day))
    }
  }

  const numeric = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (numeric) {
    const [, first, second, rawYear] = numeric
    const yearNumber = Number(rawYear)
    return new Date(yearNumber < 100 ? 2000 + yearNumber : yearNumber, Number(first) - 1, Number(second))
  }

  const direct = new Date(text)
  return Number.isNaN(direct.getTime()) ? null : direct
}

export function toDateOnly(value: unknown) {
  const date = parseSafetyDate(value)
  if (!date) {
    return null
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function normalizeSafetyStatus(value: unknown) {
  const text = normalizeSafetyText(value).toUpperCase()
  return text || "UNKNOWN"
}

export function isValidHttpUrl(value: unknown) {
  const text = normalizeSafetyText(value)
  if (!text) {
    return false
  }

  try {
    const url = new URL(text)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
