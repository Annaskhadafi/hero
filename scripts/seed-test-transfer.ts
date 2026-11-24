import { db } from '../db';
import { assetTransfers } from '../db/schema/asset-transfer';
import { approvals } from '../db/schema/hero';
import { eq, and } from 'drizzle-orm';

async function main() {
  // 1. Ensure TRF-202611-0001 (Step 1: In Review)
  const [t1] = await db.select().from(assetTransfers).where(eq(assetTransfers.transferNumber, 'TRF-202611-0001'));
  if (t1) {
    console.log('TRF-202611-0001 exists, resetting...');
    await db.update(assetTransfers).set({
      status: 'in_review',
      currentStepOrder: 1,
      currentApproverTitle: 'Step 1: Atasan Langsung Pemegang Lama (Pelepasan Aset)',
      currentApproverName: 'Gilang Suryo Wirawan',
      currentApproverEmployeeId: 1255,
      applicantEmployeeId: 1255,
      currentHolderEmployeeId: 1255,
      currentHolderName: 'Gilang Suryo Wirawan',
      updatedAt: new Date()
    }).where(eq(assetTransfers.transferNumber, 'TRF-202611-0001'));

    // Reset approvals rows
    await db.update(approvals).set({
      status: 'Pending',
      decisionNote: '',
      reviewedAt: null
    }).where(and(eq(approvals.assetTransferId, t1.id), eq(approvals.level, 1)));

    await db.update(approvals).set({
      status: 'Draft',
      decisionNote: '',
      reviewedAt: null
    }).where(and(eq(approvals.assetTransferId, t1.id), eq(approvals.level, 2)));

    await db.update(approvals).set({
      status: 'Draft',
      decisionNote: '',
      reviewedAt: null
    }).where(and(eq(approvals.assetTransferId, t1.id), eq(approvals.level, 3)));

    await db.update(approvals).set({
      status: 'Draft',
      decisionNote: '',
      reviewedAt: null,
      rejectionReason: ''
    }).where(and(eq(approvals.assetTransferId, t1.id), eq(approvals.level, 4)));

    console.log('Approvals reset for transfer', t1.id);
  }

  console.log('Done ensuring test transfers and approvals!');
  process.exit(0);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
