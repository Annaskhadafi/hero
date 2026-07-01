import { db } from "./db/index.js"
import { employees } from "./db/schema/hero.js"
import { eq, isNotNull } from "drizzle-orm"

async function main() {
  try {
    const data = await db.selectDistinct({ section: employees.section })
      .from(employees)
      .where(eq(employees.department, "Central Services"))
      
    console.log(data)
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
