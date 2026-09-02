import { db } from '../db'
import { employees } from '../db/schema/hero'
import { or, ilike, eq } from 'drizzle-orm'

async function main() {
  const emps = await db
    .select({
      id: employees.id,
      sn: employees.employeeSn,
      name: employees.name,
      jobTitle: employees.jobTitle,
      department: employees.department,
      siteId: employees.siteId,
    })
    .from(employees)
    .where(
      or(
        ilike(employees.department, '%human capital%'),
        ilike(employees.department, '%ga%'),
        ilike(employees.department, '%general%'),
        ilike(employees.department, '%admin%'),
        ilike(employees.jobTitle, '%supervisor%'),
        ilike(employees.jobTitle, '%spv%'),
        ilike(employees.jobTitle, '%leader%'),
        ilike(employees.name, '%iqbal%'),
        ilike(employees.name, '%kesuma%'),
        ilike(employees.name, '%silvi%'),
        ilike(employees.name, '%sandi%')
      )
    )

  console.table(emps)
}

main().then(() => process.exit(0)).catch(console.error)
