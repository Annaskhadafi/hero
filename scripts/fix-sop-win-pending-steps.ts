import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals } from "../db/schema/hero";
import { eq, asc } from "drizzle-orm";

async function repairSteps() {
  const allReqs = await db.select().from(sopWinRequests);
  console.log(`Auditing ${allReqs.length} SOP/WIN requests...`);

  let repairedCount = 0;

  for (const req of allReqs) {
    const steps = await db
      .select()
      .from(sopWinRequestApprovals)
      .where(eq(sopWinRequestApprovals.requestId, req.id))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    if (steps.length === 0) continue;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.stepOrder > 1) {
        const prevSteps = steps.slice(0, i);
        const allPrevApproved = prevSteps.every((p) => p.status === "approved");

        if (!allPrevApproved && step.status === "pending") {
          console.log(`[REPAIR] REQ #${req.id} (${req.requestNumber}) Step ${step.stepOrder} (${step.approverName}) was premature 'pending'. Setting to 'waiting'.`);
          await db
            .update(sopWinRequestApprovals)
            .set({ status: "waiting" })
            .where(eq(sopWinRequestApprovals.id, step.id));
          repairedCount++;
        }
      }
    }
  }

  console.log(`Repair completed. ${repairedCount} premature pending steps fixed to 'waiting'.`);
}

repairSteps().catch(console.error);
