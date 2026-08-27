import { db } from '../db';
import { employees, orgChartNodes, orgNodeAssignments } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  // Check Khadafi's org chart assignments
  const assignments = await db.select({
    nodeId: orgNodeAssignments.nodeId,
    nodeName: orgChartNodes.label,
    nodeType: orgChartNodes.nodeType,
  }).from(orgNodeAssignments)
    .innerJoin(orgChartNodes, eq(orgNodeAssignments.nodeId, orgChartNodes.id))
    .where(eq(orgNodeAssignments.employeeId, 5));
  
  console.log('Khadafi org assignments:');
  for (const a of assignments) {
    console.log(`  Node#${a.nodeId}: ${a.nodeName} (${a.nodeType})`);
  }
  
  // Check which node the first pending approval (for APD #26) resolves to
  const nodes = await db.select().from(orgChartNodes).where(eq(orgChartNodes.id, 303)).limit(1);
  console.log('\nNode#303 (first matrix step):', nodes[0]?.label, nodes[0]?.nodeType);
  
  // Check who is assigned to node 303
  const nodeAssignments = await db.select({ empId: orgNodeAssignments.employeeId, name: employees.name })
    .from(orgNodeAssignments)
    .innerJoin(employees, eq(orgNodeAssignments.employeeId, employees.id))
    .where(eq(orgNodeAssignments.nodeId, 303));
  console.log('Assigned to Node#303:');
  for (const n of nodeAssignments) {
    console.log(`  Emp#${n.empId}: ${n.name}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
