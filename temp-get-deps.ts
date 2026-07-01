import { db } from "./db/index.js"
import { employees } from "./db/schema/hero.js"

async function main() {
  try {
    const deps = await db.selectDistinct({ dep: employees.department }).from(employees)
    console.log("Departments in DB:", deps.map(d => `"${d.dep}"`).join(", "))
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
