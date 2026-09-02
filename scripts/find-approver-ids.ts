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
    })
    .from(employees)
    .where(
      or(
        ilike(employees.name, '%rendra%'),
        ilike(employees.name, '%iqbal%'),
        ilike(employees.name, '%ary%'),
        ilike(employees.name, '%apriyanto%'),
        ilike(employees.name, '%abian%'),
        ilike(employees.name, '%karmiyanto%'),
        ilike(employees.name, '%junaidi%'),
        ilike(employees.name, '%febrial%'),
        ilike(employees.name, '%refaldi%'),
        ilike(employees.name, '%saipudin%'),
        ilike(employees.name, '%fathur%'),
        ilike(employees.name, '%danny%'),
        ilike(employees.name, '%irfan%'),
        ilike(employees.name, '%adit%'),
        ilike(employees.name, '%dowy%'),
        ilike(employees.name, '%tommy%'),
        ilike(employees.name, '%singgih%'),
        ilike(employees.name, '%ade saharu%')
      )
    )

  console.table(emps)
}

main().then(() => process.exit(0)).catch(console.error)
