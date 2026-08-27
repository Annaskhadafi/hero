import { db } from '../db';
import { sites, employees, approvalMatrices, approvalMatrixSteps, orgChartNodes } from '../db/schema/hero';
import { eq, asc } from 'drizzle-orm';

async function main() {
  // Step 1: Show all sites and their headEmployeeId
  const allSites = await db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name));
  
  console.log('=== PJO PER SITE (dari master sites) ===\n');
  for (const s of allSites) {
    let name = 'NULL';
    if (s.headEmployeeId) {
      const [e] = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, s.headEmployeeId)).limit(1);
      name = e?.name ?? 'NOT FOUND';
    }
    console.log(`  ${s.name} | headEmployeeId: ${s.headEmployeeId} | PJO: ${name}`);
  }

  // Step 2: Get unique PJO employee IDs from Material matrices (these should have the original PJOs)
  console.log('\n=== Cek PJO dari Material matrices (asli) ===\n');
  const materialMatrices = await db.select().from(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'apd-request-material'))
    .orderBy(asc(approvalMatrices.siteId));

  const pjoPerSiteFromMaterial = new Map<number, number>();

  for (const m of materialMatrices) {
    const [step] = await db.select().from(approvalMatrixSteps)
      .where(eq(approvalMatrixSteps.matrixId, m.id))
      .orderBy(asc(approvalMatrixSteps.stepOrder))
      .limit(1);

    if (step?.nodeId) {
      const [node] = await db.select({ employeeId: orgChartNodes.employeeId })
        .from(orgChartNodes).where(eq(orgChartNodes.id, step.nodeId)).limit(1);
      if (node?.employeeId) {
        pjoPerSiteFromMaterial.set(m.siteId ?? 0, node.employeeId);
      }
    }
  }

  // Show PJO from material per site
  for (const [siteId, empId] of pjoPerSiteFromMaterial) {
    const site = allSites.find(s => s.id === siteId);
    const [emp] = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, empId)).limit(1);
    console.log(`  ${site?.name ?? siteId} → PJO (Material): ${emp?.name ?? empId}`);
  }

  // Step 3: Update Tools matrices to use correct PJOs from Material
  console.log('\n=== UPDATE TOOLS MATRICES ===\n');
  
  const toolsMatrices = await db.select().from(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'apd-request-tools'))
    .orderBy(asc(approvalMatrices.siteId));

  let updated = 0;
  for (const m of toolsMatrices) {
    const correctPjoId = pjoPerSiteFromMaterial.get(m.siteId ?? 0);
    if (!correctPjoId) {
      console.log(`  ⚠️ Skipped ${m.siteId} — no PJO from Material matrix`);
      continue;
    }

    // Get current step
    const [step] = await db.select().from(approvalMatrixSteps)
      .where(eq(approvalMatrixSteps.matrixId, m.id))
      .orderBy(asc(approvalMatrixSteps.stepOrder))
      .limit(1);

    if (!step?.nodeId) continue;

    // Get current node
    const [node] = await db.select({ employeeId: orgChartNodes.employeeId })
      .from(orgChartNodes).where(eq(orgChartNodes.id, step.nodeId)).limit(1);

    if (node?.employeeId === correctPjoId) continue; // Already correct

    // Get employee name
    const [emp] = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, correctPjoId)).limit(1);
    const [site] = await db.select({ name: sites.name }).from(sites).where(eq(sites.id, m.siteId ?? 0)).limit(1);

    // Update orgChartNodes
    await db.update(orgChartNodes).set({
      employeeId: correctPjoId,
      label: `PJO (Head Lokasi) - ${emp?.name ?? 'Unknown'}`,
    }).where(eq(orgChartNodes.id, step.nodeId));

    updated++;
    console.log(`  ✅ ${site?.name ?? m.siteId} | Updated PJO → ${emp?.name}`);
  }

  console.log(`\nDone! Updated ${updated} Tools matrices.`);
}

main().catch(console.error);
