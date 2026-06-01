import * as xlsx from "xlsx"

import type { HiradcEntryRow } from "@/lib/hiradc/queries"

const EXPORT_HEADERS = [
  "Departemen",
  "Lokasi",
  "Nama Kegiatan",
  "Rutin/Tidak Rutin",
  "Alat",
  "Bahaya",
  "Rincian Bahaya",
  "Resiko/Konsekuensi",
  "Peluang (Before)",
  "Akibat (Before)",
  "Nilai Risiko (Before)",
  "Tingkat Risiko (Before)",
  "Pengendalian yang Ada",
  "Referensi Legal",
  "Peluang (After)",
  "Akibat (After)",
  "Nilai Risiko (After)",
  "Tingkat Risiko (After)",
  "Pengendalian Tambahan",
]

export function exportHiradcToExcel(entries: HiradcEntryRow[], fileName = "HIRADC-export.xlsx") {
  const rows = entries.map((e) => [
    e.department,
    e.location,
    e.activityName,
    e.routineType,
    e.equipment,
    e.hazardCategory,
    e.hazardDetails,
    e.riskConsequence,
    e.likelihoodBefore,
    e.severityBefore ?? "",
    e.scoreBefore ?? "",
    e.riskLevelBefore,
    e.existingControl,
    e.legalReference,
    e.likelihoodAfter,
    e.severityAfter ?? "",
    e.scoreAfter ?? "",
    e.riskLevelAfter,
    e.additionalControl,
  ])

  const worksheet = xlsx.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows])
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, "HIRADC")
  xlsx.writeFile(workbook, fileName)
}
