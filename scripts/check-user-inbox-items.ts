import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals, employees } from "../db/schema/hero";
import { eq, asc } from "drizzle-orm";

async function checkInbox() {
  const reqs = await db.select().from(sopWinRequests);
  console.log(`Checking ${reqs.length} SOP/WIN requests in DB:`);

  for (const r of reqs) {
    const steps = await db
      .select()
      .from(sopWinRequestApprovals)
      .where(eq(sopWinRequestApprovals.requestId, r.id))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    const activeStep = steps.find((s) => s.status === 'submitted' || s.status === 'pending');
    console.log(`REQ #${r.id} (${r.requestNumber}) | Status: ${r.status} | Requester: ${r.requesterName} (${r.requesterEmail})`);
    if (activeStep) {
      console.log(`   ---> Active Step ${activeStep.stepOrder}: ${activeStep.stepLabel} | Approver: ${activeStep.approverName} (${activeTurnEmail(activeStep)}) | Status: ${activeStep.status}`);
    } else {
      console.log(`   ---> No active pending/submitted step (all completed or none).`);
    }
  }
}

function activeTurnEmail(step: any) {
  return step.approverEmail || 'N/A';
}

checkInbox().catch(console.error);
