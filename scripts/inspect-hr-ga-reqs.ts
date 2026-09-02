import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals } from "../db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function inspectHrGa() {
  const reqs = await db.select().from(sopWinRequests).where(inArray(sopWinRequests.requestNumber, ["REQ-DOC-2026-6337", "REQ-DOC-2026-6368"]));
  console.log("Found requests:", reqs.map((r) => `${r.id} (${r.requestNumber}) Dept: ${r.requesterDepartment}`));

  for (const r of reqs) {
    const steps = await db.select().from(sopWinRequestApprovals).where(eq(sopWinRequestApprovals.requestId, r.id));
    console.log(`Steps for REQ #${r.id} (${r.requestNumber}):`);
    for (const s of steps) {
      console.log(`  Step ${s.stepOrder}: ${s.stepLabel} | Approver: ${s.approverName} <${s.approverEmail}> | Status: ${s.status}`);
    }
  }
}

inspectHrGa().catch(console.error);
