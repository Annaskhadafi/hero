import { db } from "../db";
import { dailyActivitySessions, dailyActivityApprovals } from "../db/schema/hero";
import { eq, sql, and } from "drizzle-orm";

async function main() {
  console.log("=== CLEANING UP LEGACY STEP 4 (MANAGER) FOR DAILY ACTIVITY IN DB ===");

  // 1. Delete orphan Step 4
  const deleted = await db
    .delete(dailyActivityApprovals)
    .where(
      and(
        sql`${dailyActivityApprovals.stepOrder} > 3`,
        eq(dailyActivityApprovals.approverRole, 'manager')
      )
    )

  console.log("Deleted legacy step 4 approvals.");

  // 2. For sessions where Step 3 (Section Head) is approved, mark session as 'Approved'
  const step3Approved = await db
    .select({ sessionId: dailyActivityApprovals.sessionId })
    .from(dailyActivityApprovals)
    .where(
      and(
        eq(dailyActivityApprovals.stepOrder, 3),
        eq(dailyActivityApprovals.status, 'approved')
      )
    )

  for (const item of step3Approved) {
    await db
      .update(dailyActivitySessions)
      .set({ status: 'Approved', approvedAt: new Date() })
      .where(eq(dailyActivitySessions.id, item.sessionId))
  }

  console.log(`Updated ${step3Approved.length} sessions with Step 3 approved to 'Approved' status.`);
}

main().catch(console.error).finally(() => process.exit(0));
