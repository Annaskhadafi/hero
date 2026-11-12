import { eq } from 'drizzle-orm';
import { db } from '../db';
import { apdSummaries, apdSummaryItems, apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals as heroApprovals } from '../db/schema/hero';
import { submitSummary, approveSummaryStep, generateSummary, returnSummaryForRevision } from '../lib/summary-engine';

const TINY_PNG_SIG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function main() {
  const [cmd, arg] = process.argv.slice(2);

  if (cmd === 'seed') {
    const uniqueNum = `SUM-E2E-VALE-${Date.now()}`;
    const [inserted] = await db
      .insert(apdSummaries)
      .values({
        summaryNumber: uniqueNum,
        sectionId: 33,
        targetSite: 'VALE',
        status: 'draft',
        generatedByEmployeeId: 5,
      })
      .returning({ id: apdSummaries.id });

    await db.insert(apdSummaryItems).values({
      summaryId: inserted.id,
      apdRequestId: 278,
      employeeId: 1168,
      employeeName: 'Ilzam Afrilana',
      employeeSn: '72702',
      siteName: 'Vale - Sorowako',
      itemName: 'Sarung Tangan Kulit (Vale)',
      quantity: 1,
      requestType: 'baru',
      remarks: 'E2E Vale Flow Check',
    });

    const submitRes = await submitSummary(inserted.id, TINY_PNG_SIG);
    const approvals = await db
      .select({
        level: apdSummaryApprovals.level,
        approverEmployeeId: apdSummaryApprovals.approverEmployeeId,
        status: apdSummaryApprovals.status,
      })
      .from(apdSummaryApprovals)
      .where(eq(apdSummaryApprovals.summaryId, inserted.id));

    console.log(JSON.stringify({ summaryId: inserted.id, summaryNumber: uniqueNum, submitRes, approvals }));
    process.exit(0);
  }

  if (cmd === 'seed-revisi') {
    const gen = await generateSummary(33, 5, 'VALE', {
      selectedRequests: [{ requestId: 277, remarks: 'Initial remark' }],
    });
    if ('error' in gen) {
      throw new Error(gen.error);
    }
    await submitSummary(gen.summaryId, TINY_PNG_SIG);
    await returnSummaryForRevision(gen.summaryId, 1, 15, 'Mohon hapus Apron dan perbaiki Remarks', 'Junaidi');
    console.log(JSON.stringify({ summaryId: gen.summaryId, summaryNumber: gen.summaryNumber }));
    process.exit(0);
  }

  if (cmd === 'latest-draft') {
    const { desc } = await import('drizzle-orm');
    const [latest] = await db
      .select({ id: apdSummaries.id, summaryNumber: apdSummaries.summaryNumber })
      .from(apdSummaries)
      .where(eq(apdSummaries.status, 'draft'))
      .orderBy(desc(apdSummaries.id))
      .limit(1);
    console.log(JSON.stringify(latest || null));
    process.exit(0);
  }

  const summaryId = Number(arg);
  if (!summaryId) {
    throw new Error(`Invalid summaryId for ${cmd}: ${arg}`);
  }

  if (cmd === 'approve-flow') {
    const l1 = await approveSummaryStep(summaryId, 1, 15, TINY_PNG_SIG, 'OK Junaidi');
    const l2 = await approveSummaryStep(summaryId, 2, 972, TINY_PNG_SIG, 'OK Romy');
    console.log(JSON.stringify({ l1, l2 }));
    process.exit(0);
  }

  if (cmd === 'approve-l1') {
    const res = await approveSummaryStep(summaryId, 1, 15, TINY_PNG_SIG, 'OK Junaidi');
    console.log(JSON.stringify(res));
    process.exit(0);
  }

  if (cmd === 'approve-l2') {
    const res = await approveSummaryStep(summaryId, 2, 972, TINY_PNG_SIG, 'OK Romy');
    console.log(JSON.stringify(res));
    process.exit(0);
  }

  if (cmd === 'inspect-items') {
    const rows = await db
      .select({
        apdRequestId: apdSummaryItems.apdRequestId,
        itemName: apdSummaryItems.itemName,
        quantity: apdSummaryItems.quantity,
      })
      .from(apdSummaryItems)
      .where(eq(apdSummaryItems.summaryId, summaryId));
    console.log(JSON.stringify({ rows }));
    process.exit(0);
  }

  if (cmd === 'cleanup') {
    await db.delete(heroApprovals).where(eq(heroApprovals.apdSummaryId, summaryId)).catch(() => {});
    await db.delete(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, summaryId)).catch(() => {});
    await db.delete(apdSummaryItems).where(eq(apdSummaryItems.summaryId, summaryId)).catch(() => {});
    await db.delete(apdSummaries).where(eq(apdSummaries.id, summaryId)).catch(() => {});
    console.log(JSON.stringify({ cleaned: summaryId }));
    process.exit(0);
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

