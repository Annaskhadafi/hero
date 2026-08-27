import { db } from '../db';
import { apdRequests, apdRequestItems, employees } from '../db/schema/hero';
import { eq, and, desc } from 'drizzle-orm';
async function main() {
  const approved = await db.select().from(apdRequests)
    .where(eq(apdRequests.status, 'proses_order'))
    .orderBy(desc(apdRequests.id)).limit(5);
  
  for (const r of approved) {
    const emp = await db.select({ name: employees.name, section: employees.section }).from(employees).where(eq(employees.id, r.employeeId)).limit(1);
    const items = await db.select().from(apdRequestItems).where(eq(apdRequestItems.requestId, r.id));
    console.log(`\n#${r.id} ${r.requestNumber} | ${emp[0]?.name} (${emp[0]?.section}) | Items:`);
    for (const i of items) {
      console.log(`  - ${i.itemType} x${i.quantity} (${i.requestType})`);
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
