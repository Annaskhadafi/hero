import { db } from '../db'
import { employees } from '../db/schema/hero'
import { eq } from 'drizzle-orm'

async function run() {
  const emp = await db
    .select()
    .from(employees)
    .where(eq(employees.id, 5))
    .limit(1)
    .then((r) => r[0])

  console.log('Employee #5:', emp?.name, emp?.email, emp?.phone)
}

run().catch(console.error)
