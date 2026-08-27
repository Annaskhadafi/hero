import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, sites, employees } from '../db/schema/hero';
import { eq, and, asc } from 'drizzle-orm';

async function main() {
  // 1. Get all active sites
  const allSites = await db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name));
  console.log('Total active sites:', allSites.length);

  // 2. Get existing Tools matrices
  const toolsMatrices = await db.select({
    id: approvalMatrices.id,
    siteId: approvalMatrices.siteId,
    structureId: approvalMatrices.structureId,
  }).from(approvalMatrices).where(eq(approvalMatrices.transactionType, 'apd-request-tools'));

  const existingSiteIds = new Set(toolsMatrices.map(m => m.siteId));
  console.log('Existing Tools matrices:', toolsMatrices.length);

  // 3. Find missing sites
  const missingSites = allSites.filter(s => !existingSiteIds.has(s.id));
  console.log('Sites missing Tools matrix:', missingSites.length);

  if (missingSites.length === 0) {
    console.log('All sites already have Tools matrices!');
    return;
  }

  // 4. Get sample matrix to replicate (from existing Tools matrix)
  const [sampleMatrix] = await db.select().from(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'apd-request-tools'))
    .limit(1);

  if (!sampleMatrix) {
    console.log('No existing Tools matrix found!');
    return;
  }

  const sampleSteps = await db.select().from(approvalMatrixSteps)
    .where(eq(approvalMatrixSteps.matrixId, sampleMatrix.id))
    .orderBy(asc(approvalMatrixSteps.stepOrder));

  console.log('Sample matrix from site', sampleMatrix.siteId, 'with', sampleSteps.length, 'steps');

  // 5. Get the orgChartStructure from the sample
  const structureId = sampleMatrix.structureId;

  const now = new Date();
  let created = 0;

  for (const site of missingSites) {
    // Find PJO for this site (site headEmployeeId)
    const pjoEmployee = site.headEmployeeId
      ? await db.select({ id: employees.id, name: employees.name })
          .from(employees)
          .where(and(eq(employees.id, site.headEmployeeId), eq(employees.isActive, true)))
          .limit(1)
          .then(r => r[0])
      : null;

    if (!pjoEmployee) {
      console.log(`  ⚠️ Skipped ${site.name} — no PJO found (headEmployeeId: ${site.headEmployeeId})`);
      continue;
    }

    // Create matrix
    const [matrix] = await db.insert(approvalMatrices).values({
      name: sampleMatrix.name,
      structureId: structureId,
      transactionType: 'apd-request-tools',
      siteId: site.id,
      activityType: '',
      priority: 'any',
      description: sampleMatrix.description ?? '',
      effectiveFrom: now,
      effectiveTo: null,
      isActive: true,
      updatedAt: now,
    }).returning();

    if (!matrix) {
      console.log(`  ❌ Failed to create matrix for ${site.name}`);
      continue;
    }

    // Create node + step for each sample step
    for (const step of sampleSteps) {
      const [node] = await db.insert(orgChartNodes).values({
        structureId: structureId,
        employeeId: pjoEmployee.id,
        nodeCode: `tools-${site.id}-${pjoEmployee.id}-${step.stepOrder}`,
        nodeType: 'employee',
        approvalRole: step.label,
        canApprove: true,
        canDelegate: true,
        slaHours: 24,
        label: `${step.label} - ${pjoEmployee.name}`,
        sortOrder: step.stepOrder,
        isActive: true,
        updatedAt: now,
      }).returning();

      if (node) {
        await db.insert(approvalMatrixSteps).values({
          matrixId: matrix.id,
          stepOrder: step.stepOrder,
          label: step.label,
          nodeId: node.id,
          approvalMode: step.approvalMode,
          slaHours: 24,
          canDelegate: true,
          isRequired: true,
          updatedAt: now,
        });
      }
    }

    created++;
    console.log(`  ✅ Created Tools matrix for ${site.name} (PJO: ${pjoEmployee.name})`);
  }

  console.log(`\nDone! Created ${created} Tools matrices.`);
}

main().catch(console.error);
