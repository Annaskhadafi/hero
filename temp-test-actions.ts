import { getEmployeeLabours, getRateSettings } from "./app/actions/service360.ts"

async function main() {
  try {
    console.log("Fetching employee labours...")
    const labours = await getEmployeeLabours()
    console.log("Labours count:", labours.length)

    console.log("Fetching rate settings...")
    const settings = await getRateSettings()
    console.log("Settings count:", settings.length)

  } catch (e) {
    console.error("Error:", e)
  }
  process.exit(0)
}
main()
