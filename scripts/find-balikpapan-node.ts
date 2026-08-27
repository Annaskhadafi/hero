import { db } from '../db';
import { approvalMatrices, orgChartNodes, orgNodeAssignments, employees } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  // Find matrix for site 126 (Balikpapan)
  const matrices = await db.select().from(approvalMatrices).where(eq(approvalMatrices.siteId, 126));
  console.log('Matrices for site 126 (Balikpapan):');
  for (const m of matrices) {
    console.log(`  #${m.id} ${m.name} type:${m.transactionType}`);
    const nodes = await db.select().from(orgChartNodes).where(eq(orgChartNodes.id, m.stepResolverNodeId || 0));
    if (nodes.length > 0) {
      console.log(`    stepResolverNodeId: ${m.stepResolverNodeId} label:${nodes[0].label}`);
    }
  }
  
  // Find all nodes with "Balikpapan" or "site 126"
  const bpNodes = await db.select().from(orgChartNodes);
  for (const n of bpNodes) {
    if (n.label?.toLowerCase().includes('balikpapan') || n.label?.toLowerCase().includes('site 126')) {
      console.log(`\nNode #${n.id}: ${n.label} (${n.nodeType})`);
      const assigns = await db.select({ empId: orgNodeAssignments.employeeId, name: employees.name }).from(orgNodeAssignments).innerJoin(employees, eq(orgNodeAssignments.employeeId, employees.id)).where(eq(orgNodeAssignments.nodeId, n.id));
      for (const a of assigns) console.log(`  Assigned: ${a.name} (${a.empId})`);
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
