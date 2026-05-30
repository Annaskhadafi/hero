import { sql, type SQLWrapper } from "drizzle-orm"

export function normalizeSloc(value: string | null | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return ""

  if (/^\d+$/.test(raw)) {
    const normalizedDigits = raw.replace(/^0+/, "") || "0"
    return normalizedDigits.padStart(3, "0")
  }

  return raw.toUpperCase()
}

export function normalizeSlocForSearch(value: string | null | undefined) {
  return normalizeSloc(value).toLowerCase()
}

export function normalizedSlocSql(value: SQLWrapper) {
  return sql<string>`
    CASE
      WHEN ${value} IS NULL THEN ''
      WHEN BTRIM(CAST(${value} AS text)) = '' THEN ''
      WHEN BTRIM(CAST(${value} AS text)) ~ '^[0-9]+$' THEN LPAD(
        COALESCE(NULLIF(REGEXP_REPLACE(BTRIM(CAST(${value} AS text)), '^0+', ''), ''), '0'),
        3,
        '0'
      )
      ELSE UPPER(BTRIM(CAST(${value} AS text)))
    END
  `
}
