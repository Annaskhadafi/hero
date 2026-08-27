import { db } from '../db';
import { employees } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  const hseEmps = await db.select({ id: employees.id, name: employees.name, email: employees.email, section: employees.section })
    .from(employees).where(eq(employees.section, 'HSE')).limit(10);
  console.log('HSE employees:');
  for (const e of hseEmps) {
    console.log(`  #${e.id} ${e.name} | ${e.email} | Section: ${e.section}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
