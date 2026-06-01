import { readFileSync } from "node:fs"

import { importHiradcWorkbook } from "@/lib/hiradc/importer"

async function main() {
  const workbookPath = process.argv[2] ?? "HIRA_Service_Import_v2_completed.xlsx"
  const grouping = (process.argv[3] as "department" | "single") ?? "department"

  console.log(`[hiradc-import] reading ${workbookPath} (grouping=${grouping})`)
  const buffer = readFileSync(workbookPath)

  const summary = await importHiradcWorkbook(buffer, {
    grouping,
    replaceExisting: true,
    originalFilename: workbookPath,
  })

  console.log("\n[hiradc-import] done")
  console.table({
    totalRows: summary.totalRows,
    inserted: summary.successCount,
    errors: summary.errorCount,
    registers: summary.registerCount,
  })
  console.table(summary.registers)

  if (summary.errors.length > 0) {
    console.warn("\n[hiradc-import] skipped rows:")
    for (const error of summary.errors) {
      console.warn(`- ${error}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[hiradc-import] failed", error)
    process.exit(1)
  })
