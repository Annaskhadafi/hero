import { importSafetyDashboardWorkbook } from "@/lib/safety-dashboard/importer"

async function main() {
  const workbookPath = process.argv[2] ?? "SAFETY DASHBOARD V2.xlsx"
  const summary = await importSafetyDashboardWorkbook(workbookPath)
  console.table(summary.map((sheet) => ({
    sheet: sheet.sheet,
    read: sheet.read,
    inserted: sheet.inserted,
    skipped: sheet.skipped,
    errors: sheet.errors.length,
  })))

  for (const sheet of summary) {
    if (sheet.errors.length > 0) {
      console.warn(`[${sheet.sheet}] skipped rows:`)
      for (const error of sheet.errors) {
        console.warn(`- ${error}`)
      }
    }
  }
}

main().catch((error) => {
  console.error("[safety-import] failed", error)
  process.exit(1)
})
