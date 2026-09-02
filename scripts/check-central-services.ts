import { db } from '@/db'
import { employees, masterDepartments, masterSections } from '@/db/schema/hero'
import { requestApds } from '@/db/schema/apd'
import { eq, inArray } from 'drizzle-orm'

async function main() {
  const [csDept] = await db.select().from(masterDepartments).where(eq(masterDepartments.id, 2)).limit(1)
  console.log('CS Dept:', csDept)

  if (csDept?.headEmployeeId) {
    const [deptHead] = await db.select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email }).from(employees).where(eq(employees.id, csDept.headEmployeeId)).limit(1)
    console.log('Dept Head (Central Services):', deptHead)
  }

  const sections = await db.select().from(masterSections).where(eq(masterSections.departmentId, 2))
  console.log('Central Services Sections:')
  for (const s of sections) {
    let head = null
    if (s.headEmployeeId) {
      const [h] = await db.select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email }).from(employees).where(eq(employees.id, s.headEmployeeId)).limit(1)
      head = h
    }
    console.log(`- Section [${s.id}] ${s.name}: Head = ${head ? `${head.name} (${head.jobTitle}, ID: ${head.id})` : 'NONE'}`)
  }

  // Check sample request APD in database
  const sampleApds = await db.select().from(requestApds).limit(3)
  console.log('Sample Request APDs in DB:', sampleApds)

  process.exit(0)
}

main().catch(console.error)
