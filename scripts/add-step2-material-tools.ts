import { db } from '../db';
import { 
  approvalMatrices, 
  approvalMatrixSteps, 
  orgChartNodes, 
  orgChartStructures,
  employees,
  sites
} from '../db/schema/hero';
import { eq, and, asc } from 'drizzle-orm';

async function main() {
  console.log('=== Adding Step 2 (Head Section) to Material & Tools matrices ===\n');

  // Get all Head Section employees per site
  const headSectionEmployees = await db.select({
    id: employees.id,
    name: employees.name,
    siteId: employees.siteId,
    accessRole: employees.accessRole,
  }).from(employees).where(eq(employees.accessRole, 'Head Section'));

  console.log(`Found ${headSectionEmployees.length} Head Section employees`);
  
  // Group by siteId
  const headSectionBySite = new Map<number, typeof headSectionEmployees[0]>();
  for (const emp of headSectionEmployees) {
    if (emp.siteId) {
      headSectionBySite.set(emp.siteId, emp);
    }
  }

  // Process Material matrices
  const materialMatrices = await db.select().from(approvalMatrices).where(
    and(
      eq(approvalMatrices.transactionType, 'apd-request-material'),
      eq(approvalMatrices.isActive, true)
    )
  );

  console.log(`\nMaterial matrices: ${materialMatrices.length}`);
  
  let materialAdded = 0;
  for (const matrix of materialMatrices) {
    // Check if Step 2 already exists
    const existingSteps = await db.select().from(approvalMatrixSteps).where(
      eq(approvalMatrixSteps.matrixId, matrix.id)
    ).orderBy(asc(approvalMatrixSteps.stepOrder));

    if (existingSteps.length >= 2) {
      console.log(`  [matrix#${matrix.id}] site=${matrix.siteId} - Already has ${existingSteps.length} steps, skipping`);
      continue;
    }

    // Find Head Section employee for this site
    const headSection = headSectionBySite.get(matrix.siteId!);
    if (!headSection) {
      console.log(`  [matrix#${matrix.id}] site=${matrix.siteId} - No Head Section employee found, skipping`);
      continue;
    }

    // Create orgChartNode for Head Section
    const [node] = await db.insert(orgChartNodes).values({
      structureId: matrix.structureId,
      employeeId: headSection.id,
      nodeCode: `material-head-section-${headSection.id}-${matrix.siteId}`,
      nodeType: 'employee',
      approvalRole: 'Head Section',
      canApprove: true,
      canDelegate: true,
      slaHours: 24,
      label: `Head Section - ${headSection.name}`,
      sortOrder: 2,
      isActive: true,
      updatedAt: new Date(),
    }).returning();

    if (!node) continue;

    // Create Step 2
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 2,
      label: 'Head Section',
      nodeId: node.id,
      approvalMode: 'sequential',
      slaHours: 24,
      canDelegate: true,
      isRequired: true,
      updatedAt: new Date(),
    });

    console.log(`  [matrix#${matrix.id}] site=${matrix.siteId} - Added Step 2: Head Section (${headSection.name})`);
    materialAdded++;
  }

  console.log(`\nMaterial: Added Step 2 to ${materialAdded} matrices`);

  // Process Tools matrices
  const toolsMatrices = await db.select().from(approvalMatrices).where(
    and(
      eq(approvalMatrices.transactionType, 'apd-request-tools'),
      eq(approvalMatrices.isActive, true)
    )
  );

  console.log(`\nTools matrices: ${toolsMatrices.length}`);
  
  let toolsAdded = 0;
  for (const matrix of toolsMatrices) {
    // Check if Step 2 already exists
    const existingSteps = await db.select().from(approvalMatrixSteps).where(
      eq(approvalMatrixSteps.matrixId, matrix.id)
    ).orderBy(asc(approvalMatrixSteps.stepOrder));

    if (existingSteps.length >= 2) {
      console.log(`  [matrix#${matrix.id}] site=${matrix.siteId} - Already has ${existingSteps.length} steps, skipping`);
      continue;
    }

    // Find Head Section employee for this site
    const headSection = headSectionBySite.get(matrix.siteId!);
    if (!headSection) {
      console.log(`  [matrix#${matrix.id}] site=${matrix.siteId} - No Head Section employee found, skipping`);
      continue;
    }

    // Create orgChartNode for Head Section
    const [node] = await db.insert(orgChartNodes).values({
      structureId: matrix.structureId,
      employeeId: headSection.id,
      nodeCode: `tools-head-section-${headSection.id}-${matrix.siteId}`,
      nodeType: 'employee',
      approvalRole: 'Head Section',
      canApprove: true,
      canDelegate: true,
      slaHours: 24,
      label: `Head Section - ${headSection.name}`,
      sortOrder: 2,
      isActive: true,
      updatedAt: new Date(),
    }).returning();

    if (!node) continue;

    // Create Step 2
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 2,
      label: 'Head Section',
      nodeId: node.id,
      approvalMode: 'sequential',
      slaHours: 24,
      canDelegate: true,
      isRequired: true,
      updatedAt: new Date(),
    });

    console.log(`  [matrix#${matrix.id}] site=${matrix.siteId} - Added Step 2: Head Section (${headSection.name})`);
    toolsAdded++;
  }

  console.log(`\nTools: Added Step 2 to ${toolsAdded} matrices`);

  // Verify final state
  console.log('\n=== Verification ===');
  
  const finalMaterial = await db.select().from(approvalMatrices).where(
    eq(approvalMatrices.transactionType, 'apd-request-material')
  );
  const finalTools = await db.select().from(approvalMatrices).where(
    eq(approvalMatrices.transactionType, 'apd-request-tools')
  );

  for (const m of finalMaterial) {
    const steps = await db.select().from(approvalMatrixSteps).where(
      eq(approvalMatrixSteps.matrixId, m.id)
    ).orderBy(asc(approvalMatrixSteps.stepOrder));
    console.log(`Material [matrix#${m.id}] site=${m.siteId}: ${steps.length} steps - ${steps.map(s => s.label).join(' → ')}`);
  }

  for (const m of finalTools.slice(0, 5)) { // Show first 5
    const steps = await db.select().from(approvalMatrixSteps).where(
      eq(approvalMatrixSteps.matrixId, m.id)
    ).orderBy(asc(approvalMatrixSteps.stepOrder));
    console.log(`Tools [matrix#${m.id}] site=${m.siteId}: ${steps.length} steps - ${steps.map(s => s.label).join(' → ')}`);
  }
  if (finalTools.length > 5) {
    console.log(`... and ${finalTools.length - 5} more Tools matrices`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
