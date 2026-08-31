import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals } from "../db/schema/hero";
import { eq, asc } from "drizzle-orm";

async function checkReq() {
  const reqs = await db.select().from(sopWinRequests);
  console.log(`Found ${reqs.length} requests in DB:`);
  for (const r of reqs) {
    const apps = await db.select().from(sopWinRequestApprovals).where(eq(sopWinRequestApprovals.requestId, r.id)).orderBy(asc(sopWinRequestApprovals.stepOrder));
    console.log(`\nREQ ID ${r.id} (${r.requestNumber}) | Dept: ${r.requesterDepartment} | Req Status: ${r.status}`);
    for (const a of apps) {
      console.log(`   Step ${a.stepOrder}: ${a.stepLabel} | Approver: ${a.approverName} | Status: ${a.status}`);
    }
  }
}

checkReq().catch(console.error);
