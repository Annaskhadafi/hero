import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  // Check if already exists
  const existing = await db.select().from(approvalMatrices).where(eq(approvalMatrices.transactionType, 'apd-summary')).limit(1);
  if (existing.length > 0) {
    console.log('Matrix already exists, skipping');
    return;
  }

  // Create matrix
  const [matrix] = await db.insert(approvalMatrices).values({
    name: 'Summary Permintaan Barang',
    transactionType: 'apd-summary',
    structureId: null,
    siteId: null,
    sectionId: null,
    priority: 'Normal',
    isActive: true,
  }).returning();

  console.log(`Matrix #${matrix.id} created: ${matrix.name}`);

  // Step 1: Section Head
  await db.insert(approvalMatrixSteps).values({
    matrixId: matrix.id,
    stepOrder: 1,
    label: 'Section Head (Diperiksa Oleh)',
    nodeId: null,
    fallbackNodeId: null,
    escalationNodeId: null,
    approvalMode: 'sequential',
    slaHours: 48,
    canDelegate: true,
    isRequired: true,
  });
  console.log('  Step 1: Section Head (Diperiksa Oleh)');

  // Step 2: Department Head
  await db.insert(approvalMatrixSteps).values({
    matrixId: matrix.id,
    stepOrder: 2,
    label: 'Department Head (Disetujui Oleh)',
    nodeId: null,
    fallbackNodeId: null,
    escalationNodeId: null,
    approvalMode: 'sequential',
    slaHours: 48,
    canDelegate: true,
    isRequired: true,
  });
  console.log('  Step 2: Department Head (Disetujui Oleh)');

  console.log('\nDone! Matrix dan steps sudah dibuat.');
}
main().catch(console.error).finally(() => process.exit(0));
