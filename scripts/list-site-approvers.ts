import fs from 'fs'
import path from 'path'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'

async function main() {
  const [asar] = await db.select().from(employees).where(eq(employees.id, 1099))
  const [apriyanto] = await db.select().from(employees).where(eq(employees.id, 955))
  console.log("Asar ID 1099:", asar?.name, "| SN:", asar?.employeeSn, "| Email:", asar?.email)
  console.log("Apriyanto ID 955:", apriyanto?.name, "| SN:", apriyanto?.employeeSn, "| Email:", apriyanto?.email)
  process.exit(0)
}

main().catch(console.error)
