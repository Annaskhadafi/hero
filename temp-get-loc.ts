import { db } from "./db/index.js"
import { employees, sites } from "./db/schema/hero.js"
import { eq } from "drizzle-orm"

async function main() {
  try {
    const data = await db.select({
      name: employees.name,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
      siteName: sites.name
    })
    .from(employees)
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.department, "Central Services"))
    .limit(10)

    console.log(data)
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
