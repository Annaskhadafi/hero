import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals } from "../db/schema/hero";
import { eq, inArray, asc, desc } from "drizzle-orm";

async function testDirect() {
  const rawRows = await db
    .select({
      approvalId: sopWinRequestApprovals.id,
      requestId: sopWinRequests.id,
      requestNumber: sopWinRequests.requestNumber,
      approverName: sopWinRequestApprovals.approverName,
      approverEmail: sopWinRequestApprovals.approverEmail,
      approvalStatus: sopWinRequestApprovals.status,
      status: sopWinRequests.status,
    })
    .from(sopWinRequestApprovals)
    .innerJoin(
      sopWinRequests,
      eq(sopWinRequestApprovals.requestId, sopWinRequests.id)
    )
    .where(
      inArray(sopWinRequests.status, ["pending_ria", "pending_owner", "submitted", "in_review", "reverted", "rejected"])
    )
    .orderBy(desc(sopWinRequestApprovals.createdAt));

  console.log(`Found ${rawRows.length} rawRows matching non-approved requests.`);

  const candidateReqIds = [...new Set(rawRows.map((r) => r.requestId))];
  const allReqStepsMap = new Map<number, Array<{ id: number; stepOrder: number; status: string; approverName: string; approverEmail: string }>>();

  if (candidateReqIds.length > 0) {
    const candidateSteps = await db
      .select({
        id: sopWinRequestApprovals.id,
        requestId: sopWinRequestApprovals.requestId,
        stepOrder: sopWinRequestApprovals.stepOrder,
        status: sopWinRequestApprovals.status,
        approverName: sopWinRequestApprovals.approverName,
        approverEmail: sopWinRequestApprovals.approverEmail,
      })
      .from(sopWinRequestApprovals)
      .where(inArray(sopWinRequestApprovals.requestId, candidateReqIds))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    for (const s of candidateSteps) {
      const existing = allReqStepsMap.get(s.requestId) || [];
      existing.push(s);
      allReqStepsMap.set(s.requestId, existing);
    }
  }

  const canonicalRows: typeof rawRows = [];
  const processedReqIds = new Set<number>();

  for (const row of rawRows) {
    if (processedReqIds.has(row.requestId)) continue;

    const reqStatusLower = (row.status || '').toLowerCase();
    const steps = allReqStepsMap.get(row.requestId) || [];
    steps.sort((a, b) => a.stepOrder - b.stepOrder);

    if (reqStatusLower === 'reverted' || reqStatusLower === 'rejected') {
      processedReqIds.add(row.requestId);
      const targetStep = steps.find((s) => s.status === 'reverted' || s.status === 'rejected');
      if (targetStep) {
        const stepRow = rawRows.find((r) => r.approvalId === targetStep.id) || row;
        canonicalRows.push(stepRow);
      } else {
        canonicalRows.push(row);
      }
    } else {
      const activeStep = steps.find((s) => s.status !== 'approved');
      if (activeStep && (activeStep.status === 'submitted' || activeStep.status === 'pending')) {
        const prevSteps = steps.filter((s) => s.stepOrder < activeStep.stepOrder);
        const allPrevApproved = prevSteps.length === 0 || prevSteps.every((s) => s.status === 'approved');
        if (allPrevApproved) {
          processedReqIds.add(row.requestId);
          const activeRow = rawRows.find((r) => r.approvalId === activeStep.id);
          if (activeRow) {
            canonicalRows.push(activeRow);
          }
        }
      }
    }
  }

  console.log(`\nCanonical Rows count: ${canonicalRows.length}`);
  for (const c of canonicalRows) {
    console.log(`- REQ #${c.requestId} (${c.requestNumber}) | ReqStatus: ${c.status} | Approver: ${c.approverName} (${c.approverEmail}) | ApprovalStatus: ${c.approvalStatus}`);
  }
}

testDirect().catch(console.error);
