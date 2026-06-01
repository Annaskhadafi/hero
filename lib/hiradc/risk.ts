/**
 * HIRADC risk scale + conversion helpers.
 *
 * Two scales exist:
 * - HIRA Internal (source workbook): Likelihood = number 1..5 (1 = almost certain),
 *   Severity = letter A..E (A = most severe). Risk level in Indonesian
 *   (SIGNIFIKAN / TINGGI / SEDANG / RENDAH).
 * - HSE Insight PRO (this system): Likelihood = letter A..E (A = almost certain),
 *   Severity = number 1..5 (5 = fatal). Risk level in English
 *   (EXTREME / HIGH / MODERATE / LOW).
 *
 * Conversion (per "Mapping Guide" + "Risk Matrix Conversion" sheets):
 * - Likelihood: 1->A, 2->B, 3->C, 4->D, 5->E
 * - Severity:   A->5, B->4, C->3, D->2, E->1
 * - Risk level: SIGNIFIKAN->EXTREME, TINGGI->HIGH, SEDANG->MODERATE, RENDAH->LOW
 */

export const LIKELIHOOD_LETTERS = ["A", "B", "C", "D", "E"] as const
export type LikelihoodLetter = (typeof LIKELIHOOD_LETTERS)[number]

export const SEVERITY_NUMBERS = [1, 2, 3, 4, 5] as const
export type SeverityNumber = (typeof SEVERITY_NUMBERS)[number]

export type SystemRiskLevel = "EXTREME" | "HIGH" | "MODERATE" | "LOW"

export const LIKELIHOOD_DESCRIPTIONS: Record<LikelihoodLetter, string> = {
  A: "Hampir pasti akan terjadi",
  B: "Cenderung untuk dapat terjadi",
  C: "Mungkin dapat terjadi",
  D: "Kecil kemungkinan terjadi",
  E: "Sangat jarang terjadi",
}

export const SEVERITY_DESCRIPTIONS: Record<SeverityNumber, string> = {
  5: "Fatal / kerugian material sangat besar",
  4: "Cacat / kerugian material besar",
  3: "Hilang hari kerja / kerugian cukup besar",
  2: "Cedera ringan/P3K / kerugian material sedang",
  1: "Tidak ada cidera / kerugian material kecil",
}

export const RISK_LEVEL_DESCRIPTIONS: Record<SystemRiskLevel, string> = {
  EXTREME: "Risiko tidak dapat diterima, hentikan aktivitas",
  HIGH: "Risiko tidak dapat diterima, butuh pengendalian segera",
  MODERATE: "Risiko dapat diterima dengan pengendalian tambahan",
  LOW: "Risiko dapat diterima",
}

/** Likelihood numeric weight used by the risk matrix (A = 5 .. E = 1). */
const LIKELIHOOD_WEIGHT: Record<LikelihoodLetter, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 }

function cleanCell(value: unknown): string {
  return `${value ?? ""}`.replace(/\u00a0/g, " ").trim()
}

/** Convert source likelihood (number 1..5) to system letter A..E. */
export function convertLikelihoodToSystem(value: unknown): LikelihoodLetter | "" {
  const raw = cleanCell(value).toUpperCase()
  if (!raw) return ""
  // Already a letter in source data (be defensive about mixed inputs).
  if ((LIKELIHOOD_LETTERS as readonly string[]).includes(raw)) {
    return raw as LikelihoodLetter
  }
  const num = Number(raw.replace(/[^0-9]/g, ""))
  if (num >= 1 && num <= 5) {
    return LIKELIHOOD_LETTERS[num - 1]
  }
  return ""
}

/** Convert source severity (letter A..E) to system number 1..5. */
export function convertSeverityToSystem(value: unknown): SeverityNumber | null {
  const raw = cleanCell(value).toUpperCase()
  if (!raw) return null
  const letterIndex = (LIKELIHOOD_LETTERS as readonly string[]).indexOf(raw)
  if (letterIndex >= 0) {
    // A->5, B->4, C->3, D->2, E->1
    return (5 - letterIndex) as SeverityNumber
  }
  const num = Number(raw.replace(/[^0-9]/g, ""))
  if (num >= 1 && num <= 5) {
    return num as SeverityNumber
  }
  return null
}

/** Risk matrix score = likelihood weight (A=5..E=1) x severity (1..5). Range 1..25. */
export function computeRiskScore(
  likelihood: LikelihoodLetter | "",
  severity: SeverityNumber | null,
): number | null {
  if (!likelihood || severity == null) return null
  return LIKELIHOOD_WEIGHT[likelihood] * severity
}

/**
 * Derive system risk level from the system score (1..25) using a standard
 * 5x5 matrix banding: 16-25 EXTREME, 10-15 HIGH, 5-9 MODERATE, 1-4 LOW.
 */
export function riskLevelFromScore(score: number | null): SystemRiskLevel | "" {
  if (score == null) return ""
  if (score >= 16) return "EXTREME"
  if (score >= 10) return "HIGH"
  if (score >= 5) return "MODERATE"
  return "LOW"
}

const RISK_LEVEL_ALIASES: Record<string, SystemRiskLevel> = {
  SIGNIFIKAN: "EXTREME",
  SIGNIFICANT: "EXTREME",
  EXTREME: "EXTREME",
  EXTREEM: "EXTREME",
  TINGGI: "HIGH",
  HIGH: "HIGH",
  SEDANG: "MODERATE",
  MODERATE: "MODERATE",
  MEDIUM: "MODERATE",
  RENDAH: "LOW",
  LOW: "LOW",
}

/** Convert an Indonesian/English risk-level label to the system level. */
export function convertRiskLevelToSystem(value: unknown): SystemRiskLevel | "" {
  const raw = cleanCell(value).toUpperCase()
  if (!raw) return ""
  return RISK_LEVEL_ALIASES[raw] ?? ""
}

/**
 * Resolve the final risk level: prefer an explicit source label, otherwise
 * derive it from the computed score.
 */
export function resolveRiskLevel(
  sourceLabel: unknown,
  score: number | null,
): SystemRiskLevel | "" {
  return convertRiskLevelToSystem(sourceLabel) || riskLevelFromScore(score)
}

export const RISK_LEVEL_TONE: Record<SystemRiskLevel, "danger" | "warning" | "info" | "success"> = {
  EXTREME: "danger",
  HIGH: "warning",
  MODERATE: "info",
  LOW: "success",
}
