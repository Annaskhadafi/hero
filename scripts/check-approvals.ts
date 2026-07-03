import { db } from "../db";
import { approvals, apdRequests } from "../db/schema/hero";
import { desc } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      id: approvals.id,
      apdRequestId: approvals.apdRequestId,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      approverEmployeeId: approvals.approverEmployeeId,
      submittedAt: approvals.submittedAt,
    })
    .from(approvals)
    .orderBy(desc(approvals.id))
    .limit(5);
  
  console.log("Recent approvals:", JSON.stringify(rows, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
