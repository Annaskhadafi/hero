import { db } from '../db';
import { apdRequestItems, apdRequests, employees } from '../db/schema/hero';
import { eq, and, inArray } from 'drizzle-orm';

async function main() {
  // Check all approved APD items for Marketing & Corporate Comm (section 23)
  const items = await db.select({
    empName: employees.name,
    itemType: apdRequestItems.itemType,
    qty: apdRequestItems.quantity,
    reqStatus: apdRequests.status,
  }).from(apdRequestItems)
    .innerJoin(apdRequests, eq(apdRequestItems.requestId, apdRequests.id))
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .where(and(eq(employees.sectionId, 23), inArray(apdRequests.status, ['approved', 'proses_order'])));
  
  for (const i of items) {
    console.log(`${i.empName}: "${i.itemType}" x${i.qty} (${i.reqStatus})`);
  }
}
main().then(() => process.exit(0));
