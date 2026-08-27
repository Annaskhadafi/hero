import { db } from '../db';
import { orgNodeAssignments } from '../db/schema/hero';
import { eq, and } from 'drizzle-orm';
async function main() {
  // Assign Khadafi (emp 5) to node 303 (PJO for site 138 / CK MHU)
  const existing = await db.select().from(orgNodeAssignments)
    .where(and(eq(orgNodeAssignments.employeeId, 5), eq(orgNodeAssignments.nodeId, 303))).limit(1);
  
  if (existing.length === 0) {
    await db.insert(orgNodeAssignments).values({ employeeId: 5, nodeId: 303 });
    console.log('Khadafi assigned to Node#303 (PJO CK MHU)');
  } else {
    console.log('Already assigned');
  }
  
  // Also check other nodes that might need Khadafi
  // Node 303 = site 138 (CK MHU), 304 = site 144, etc.
  // Let's assign Khadafi to a few key sites for testing
  const keyNodes = [303, 304, 305, 306, 307, 308, 309, 310]; // first 8 sites
  for (const nodeId of keyNodes) {
    const exists = await db.select().from(orgNodeAssignments)
      .where(and(eq(orgNodeAssignments.employeeId, 5), eq(orgNodeAssignments.nodeId, nodeId))).limit(1);
    if (exists.length === 0) {
      await db.insert(orgNodeAssignments).values({ employeeId: 5, nodeId });
      console.log(`Khadafi assigned to Node#${nodeId}`);
    }
  }
  console.log('Done!');
}
main().catch(console.error).finally(() => process.exit(0));
