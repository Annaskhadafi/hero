import { db } from "./db/index.js"
import { employees } from "./db/schema/hero.js"
import { service360EmployeeLevels, service360RateSettings } from "./db/schema/service360.js"
import { eq, and, sql } from "drizzle-orm"

async function main() {
  try {
    const allEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      level: service360EmployeeLevels.level,
      price: service360RateSettings.price
    })
    .from(employees)
    .where(and(eq(employees.workLocation, 'CK BMB'), eq(employees.section, 'Repair / Retread Operation')))
    .leftJoin(service360EmployeeLevels, eq(employees.id, service360EmployeeLevels.employeeId))
    .leftJoin(
      service360RateSettings, 
      and(
        eq(employees.workLocation, service360RateSettings.workLocation),
        eq(employees.section, service360RateSettings.section),
        eq(sql`COALESCE(${service360EmployeeLevels.level}, 1)`, service360RateSettings.level)
      )
    )

    console.log(allEmployees)
  } catch (e) {
    console.error("Error:", e)
  }
  process.exit(0)
}
main()
