import { db } from '../db';
import { employees, masterSections, masterDepartments, approvalMatrices, orgNodeAssignments, orgChartNodes } from '../db/schema/hero';
import { eq, ne, and, isNotNull } from 'drizzle-orm';

async function main() {
  console.log('=== KHADAFI DIAGNOSTIC REPORT ===\n');

  // 1. Check Khadafi's employee record
  const [khadafi] = await db.select({
    id: employees.id,
    name: employees.name,
    accessRole: employees.accessRole,
    email: employees.email,
  }).from(employees).where(eq(employees.id, 5));
  console.log('1. Khadafi employee record:', khadafi);

  // 2. Check master sections where Khadafi is head
  const khadafiSections = await db.select({
    id: masterSections.id,
    code: masterSections.code,
    name: masterSections.name,
    headEmployeeId: masterSections.headEmployeeId,
  }).from(masterSections).where(eq(masterSections.headEmployeeId, 5));
  console.log(`\n2. Sections where Khadafi is head (${khadafiSections.length}):`);
  for (const s of khadafiSections) {
    console.log(`   - [${s.code}] ${s.name}`);
  }

  // 3. Check master departments where Khadafi is head
  const khadafiDepts = await db.select({
    id: masterDepartments.id,
    code: masterDepartments.code,
    name: masterDepartments.name,
    headEmployeeId: masterDepartments.headEmployeeId,
  }).from(masterDepartments).where(eq(masterDepartments.headEmployeeId, 5));
  console.log(`\n3. Departments where Khadafi is head (${khadafiDepts.length}):`);
  for (const d of khadafiDepts) {
    console.log(`   - [${d.code}] ${d.name}`);
  }

  // 4. Check all sections with their current heads
  const allSections = await db.select({
    id: masterSections.id,
    code: masterSections.code,
    name: masterSections.name,
    headEmployeeId: masterSections.headEmployeeId,
    departmentId: masterSections.departmentId,
  }).from(masterSections);
  console.log(`\n4. All sections with heads (${allSections.length}):`);
  for (const s of allSections) {
    const headLabel = s.headEmployeeId === 5 ? '⚠️ KHADAFI' : s.headEmployeeId ? `emp#${s.headEmployeeId}` : 'NULL';
    console.log(`   - [${s.code}] ${s.name} → Head: ${headLabel}`);
  }

  // 5. Check all departments with their current heads
  const allDepts = await db.select({
    id: masterDepartments.id,
    code: masterDepartments.code,
    name: masterDepartments.name,
    headEmployeeId: masterDepartments.headEmployeeId,
  }).from(masterDepartments);
  console.log(`\n5. All departments with heads (${allDepts.length}):`);
  for (const d of allDepts) {
    const headLabel = d.headEmployeeId === 5 ? '⚠️ KHADAFI' : d.headEmployeeId ? `emp#${d.headEmployeeId}` : 'NULL';
    console.log(`   - [${d.code}] ${d.name} → Head: ${headLabel}`);
  }

  // 6. Check org node assignments for Khadafi
  const khadafiNodes = await db.select({
    nodeId: orgNodeAssignments.nodeId,
    nodeName: orgChartNodes.label,
    nodeType: orgChartNodes.nodeType,
  }).from(orgNodeAssignments)
    .innerJoin(orgChartNodes, eq(orgNodeAssignments.nodeId, orgChartNodes.id))
    .where(eq(orgNodeAssignments.employeeId, 5));
  console.log(`\n6. Org node assignments for Khadafi (${khadafiNodes.length}):`);
  for (const n of khadafiNodes) {
    console.log(`   - Node#${n.nodeId}: ${n.nodeName} (${n.nodeType})`);
  }

  // 7. Check approval matrices referencing Khadafi
  const khadafiMatrices = await db.execute<{ id: number; name: string; site_id: number | null }>(
    db._.fullSchema.approvalMatrices
      ? undefined as any
      : undefined as any
  ).catch(() => ({ rows: [] }));

  // Simpler approach - count matrices with steps pointing to Khadafi nodes
  const khadafiNodeIds = khadafiNodes.map(n => n.nodeId);
  if (khadafiNodeIds.length > 0) {
    const { sql } = await import('drizzle-orm');
    const matrixCount = await db.execute(sql`
      SELECT COUNT(DISTINCT ams.matrix_id) as count
      FROM hero_approval_matrix_steps ams
      JOIN hero_org_chart_nodes ocn ON ams.node_id = ocn.id
      WHERE ocn.employee_id = 5
    `);
    console.log(`\n7. Approval matrices with Khadafi as approver: ${(matrixCount.rows[0] as any)?.count ?? 0}`);
  }

  console.log('\n=== END DIAGNOSTIC ===');
}

main().catch(console.error).finally(() => process.exit(0));
