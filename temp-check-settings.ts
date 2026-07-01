import { db } from "./db/index.js"
import { service360RateSettings } from "./db/schema/service360.js"

async function main() {
  try {
    const settings = await db.select().from(service360RateSettings)
    console.log(settings)
  } catch (e) {
    console.error("Error:", e)
  }
  process.exit(0)
}
main()
