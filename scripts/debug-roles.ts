import { db } from '../db'
import { employees } from '../db/schema/hero'
import { eq } from 'drizzle-orm'

async function main() {
  const rows = await db
    .select({
      name: employees.name,
      email: employees.email,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .limit(30)

  console.log('EMPLOYEE ROLES:')
  for (const row of rows) {
    console.log(`  ${row.name} (${row.email}) → role: "${row.accessRole}"`)
  }
  
  const uniqueRoles = [...new Set(rows.map(r => r.accessRole))]
  console.log('\nUNIQUE ROLES:', uniqueRoles)
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
