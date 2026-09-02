import { db } from '../db'
import { employees } from '../db/schema/hero'
import { or, ilike } from 'drizzle-orm'

async function main() {
  const emps = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      siteId: employees.siteId,
    })
    .from(employees)
    .where(
      or(
        ilike(employees.name, '%taufik%'),
        ilike(employees.name, '%akbar%'),
        ilike(employees.name, '%said%'),
        ilike(employees.name, '%sultan%')
      )
    )

  console.log('Employees found:', emps)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
