import {
  computeRiskScore,
  convertLikelihoodToSystem,
  convertRiskLevelToSystem,
  convertSeverityToSystem,
  resolveRiskLevel,
  riskLevelFromScore,
} from "@/lib/hiradc/risk"
import {
  normalizeDepartment,
  normalizeRoutineType,
  parseHiradcRow,
} from "@/lib/hiradc/parsing"

describe("hiradc risk conversion", () => {
  it("converts source likelihood number to system letter", () => {
    expect(convertLikelihoodToSystem(1)).toBe("A")
    expect(convertLikelihoodToSystem("3")).toBe("C")
    expect(convertLikelihoodToSystem(5)).toBe("E")
    expect(convertLikelihoodToSystem("")).toBe("")
  })

  it("converts source severity letter to system number", () => {
    expect(convertSeverityToSystem("A")).toBe(5)
    expect(convertSeverityToSystem("c")).toBe(3)
    expect(convertSeverityToSystem("E")).toBe(1)
    expect(convertSeverityToSystem("")).toBeNull()
  })

  it("computes matrix score and derives level", () => {
    // likelihood A (weight 5) x severity 5 = 25 => EXTREME
    expect(computeRiskScore("A", 5)).toBe(25)
    expect(riskLevelFromScore(25)).toBe("EXTREME")
    expect(riskLevelFromScore(16)).toBe("EXTREME")
    expect(riskLevelFromScore(15)).toBe("HIGH")
    expect(riskLevelFromScore(6)).toBe("MODERATE")
    expect(riskLevelFromScore(3)).toBe("LOW")
  })

  it("maps Indonesian risk levels to system levels", () => {
    expect(convertRiskLevelToSystem("SIGNIFIKAN")).toBe("EXTREME")
    expect(convertRiskLevelToSystem("Tinggi")).toBe("HIGH")
    expect(convertRiskLevelToSystem("sedang")).toBe("MODERATE")
    expect(convertRiskLevelToSystem("RENDAH")).toBe("LOW")
    expect(convertRiskLevelToSystem("???")).toBe("")
  })

  it("prefers explicit source label, falls back to score", () => {
    expect(resolveRiskLevel("Sedang", 25)).toBe("MODERATE")
    expect(resolveRiskLevel("", 25)).toBe("EXTREME")
    expect(resolveRiskLevel("", null)).toBe("")
  })
})

describe("hiradc normalization", () => {
  it("collapses department typos", () => {
    expect(normalizeDepartment("Miantenance")).toBe("Maintenance")
    expect(normalizeDepartment("Maintennaice")).toBe("Maintenance")
    expect(normalizeDepartment("HSE")).toBe("HSE")
    expect(normalizeDepartment("repair")).toBe("Repair")
  })

  it("normalizes routine type variants", () => {
    expect(normalizeRoutineType("Runtin")).toBe("Rutin")
    expect(normalizeRoutineType("No Rutin")).toBe("Tidak Rutin")
    expect(normalizeRoutineType("Non Rutin")).toBe("Tidak Rutin")
    expect(normalizeRoutineType("Tidak Rutin")).toBe("Tidak Rutin")
  })
})

describe("parseHiradcRow", () => {
  it("parses a row using source scales and converts to system scale", () => {
    // Mirrors a real source row: likelihood=5 (num), severity=A (letter)
    const row = [
      "Miantenance", // 0 dept
      "Facility", // 1 location
      "Inspeksi Hydrant", // 2 activity
      "Runtin", // 3 routine
      "Hydrant", // 4 equipment
      "Area jepit", // 5 hazard category
      "Tangan terjepit", // 6 hazard details
      "Cidera memar", // 7 risk consequence
      "5", // 8 likelihood before (num)
      "A", // 9 severity before (letter)
      "15", // 10 score before
      "", // 11 level before (empty -> derive)
      "PPE: gloves", // 12 existing control
      "UU No.1 1970", // 13 legal
      "5", // 14 likelihood after
      "D", // 15 severity after
      "", // 16 score after (empty -> compute)
      "Rendah", // 17 level after
      "SOP", // 18 additional control
    ]
    const parsed = parseHiradcRow(row, 4)
    expect(parsed.department).toBe("Maintenance")
    expect(parsed.routineType).toBe("Rutin")
    expect(parsed.likelihoodBefore).toBe("E") // 5 -> E
    expect(parsed.severityBefore).toBe(5) // A -> 5
    expect(parsed.scoreBefore).toBe(5) // computed: E(weight 1) x 5
    expect(parsed.rawScoreBefore).toBe("15") // source kept as audit
    expect(parsed.riskLevelBefore).toBe("MODERATE") // score 5 -> MODERATE
    expect(parsed.likelihoodAfter).toBe("E")
    expect(parsed.severityAfter).toBe(2) // D -> 2
    expect(parsed.scoreAfter).toBe(2) // computed E(1)x2
    expect(parsed.riskLevelAfter).toBe("LOW") // source "Rendah" -> LOW
  })
})
