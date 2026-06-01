import {
  convertLikelihoodToSystem,
  convertSeverityToSystem,
  computeRiskScore,
  resolveRiskLevel,
  type LikelihoodLetter,
  type SeverityNumber,
  type SystemRiskLevel,
} from "@/lib/hiradc/risk"

export function cleanText(value: unknown): string {
  return `${value ?? ""}`
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
}

/**
 * Canonical department names. Source data has many typos
 * (Miantenance, Maintennaice, Runtin, ...) that must collapse.
 */
const DEPARTMENT_CANONICAL: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "HSE", aliases: ["hse"] },
  { canonical: "Maintenance", aliases: ["maintenance", "miantenance", "maintennaice", "maintenace", "maintanance"] },
  { canonical: "Repair", aliases: ["repair", "repaire"] },
  { canonical: "Training Center", aliases: ["training center", "training centre", "trainingcenter"] },
  { canonical: "Technical", aliases: ["technical", "technic", "teknik"] },
]

export function normalizeDepartment(value: unknown): string {
  const raw = cleanText(value)
  if (!raw) return ""
  const key = raw.toLowerCase().replace(/\s+/g, " ").trim()
  for (const entry of DEPARTMENT_CANONICAL) {
    if (entry.aliases.includes(key)) return entry.canonical
  }
  // Fallback: Title Case the raw token so unknown departments stay readable.
  return raw
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ")
}

/** Normalize routine type to "Rutin" | "Tidak Rutin". */
export function normalizeRoutineType(value: unknown): string {
  const raw = cleanText(value).toLowerCase().replace(/\s+/g, " ").trim()
  if (!raw) return ""
  const nonRoutine = ["tidak rutin", "non rutin", "no rutin", "nonrutin", "non-rutin"]
  if (nonRoutine.includes(raw)) return "Tidak Rutin"
  // routine variants: rutin, runtin, ruti, routine
  return "Rutin"
}

export type HiradcParsedEntry = {
  sourceRowNumber: number
  department: string
  location: string
  activityName: string
  routineType: string
  equipment: string
  hazardCategory: string
  hazardDetails: string
  riskConsequence: string
  likelihoodBefore: LikelihoodLetter | ""
  severityBefore: SeverityNumber | null
  scoreBefore: number | null
  riskLevelBefore: SystemRiskLevel | ""
  existingControl: string
  legalReference: string
  likelihoodAfter: LikelihoodLetter | ""
  severityAfter: SeverityNumber | null
  scoreAfter: number | null
  riskLevelAfter: SystemRiskLevel | ""
  additionalControl: string
  rawDepartment: string
  rawRoutineType: string
  rawLikelihoodBefore: string
  rawSeverityBefore: string
  rawLikelihoodAfter: string
  rawSeverityAfter: string
  rawScoreBefore: string
  rawScoreAfter: string
}

/**
 * Column order in the "HIRA Import Data" sheet (0-based):
 * 0 Departemen, 1 Lokasi, 2 Nama Kegiatan, 3 Rutin/Tidak Rutin, 4 Alat,
 * 5 Bahaya, 6 Rincian Bahaya, 7 Resiko/Konsekuensi,
 * 8 Peluang(before), 9 Akibat(before), 10 Nilai Risiko(before), 11 Tingkat(before),
 * 12 Pengendalian yang Ada, 13 Referensi Legal,
 * 14 Peluang(after), 15 Akibat(after), 16 Nilai Risiko(after), 17 Tingkat(after),
 * 18 Pengendalian Tambahan.
 *
 * NOTE: source likelihood is numeric (1..5) and severity is a letter (A..E);
 * both are converted to the system scale here.
 */
export function parseHiradcRow(row: unknown[], sourceRowNumber: number): HiradcParsedEntry {
  const cell = (i: number) => cleanText(row[i])

  const rawLikelihoodBefore = cell(8)
  const rawSeverityBefore = cell(9)
  const rawLikelihoodAfter = cell(14)
  const rawSeverityAfter = cell(15)

  // The source "Nilai Risiko" column uses the HIRA-internal matrix which is
  // inverted vs the system scale, so it cannot be reused directly. Recompute the
  // system score from the converted likelihood x severity and keep the source
  // numbers only as raw audit values.
  const likelihoodBefore = convertLikelihoodToSystem(rawLikelihoodBefore)
  const severityBefore = convertSeverityToSystem(rawSeverityBefore)
  const scoreBefore = computeRiskScore(likelihoodBefore, severityBefore)

  const likelihoodAfter = convertLikelihoodToSystem(rawLikelihoodAfter)
  const severityAfter = convertSeverityToSystem(rawSeverityAfter)
  const scoreAfter = computeRiskScore(likelihoodAfter, severityAfter)

  return {
    sourceRowNumber,
    department: normalizeDepartment(cell(0)),
    location: cell(1),
    activityName: cell(2),
    routineType: normalizeRoutineType(cell(3)),
    equipment: cell(4),
    hazardCategory: cell(5),
    hazardDetails: cell(6),
    riskConsequence: cell(7),
    likelihoodBefore,
    severityBefore,
    scoreBefore,
    riskLevelBefore: resolveRiskLevel(cell(11), scoreBefore),
    existingControl: cell(12),
    legalReference: cell(13),
    likelihoodAfter,
    severityAfter,
    scoreAfter,
    riskLevelAfter: resolveRiskLevel(cell(17), scoreAfter),
    additionalControl: cell(18),
    rawDepartment: cell(0),
    rawRoutineType: cell(3),
    rawLikelihoodBefore,
    rawSeverityBefore,
    rawLikelihoodAfter,
    rawSeverityAfter,
    rawScoreBefore: cell(10),
    rawScoreAfter: cell(16),
  }
}

/** A data row is meaningful only if it has activity or hazard text. */
export function isMeaningfulRow(entry: HiradcParsedEntry): boolean {
  return Boolean(entry.activityName || entry.hazardCategory || entry.hazardDetails || entry.riskConsequence)
}

export const HIRADC_DATA_SHEET = "HIRA Import Data"
/** First two rows are the title + group band, third row is the column header. */
export const HIRADC_HEADER_ROWS = 3
