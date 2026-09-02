import { db } from "../db";
import { overtimeApprovals, overtimeCommandLetters } from "../db/schema/hero";
import { eq, and, asc } from "drizzle-orm";

async function repairSplApprovals() {
  const allSpls = await db.select().from(overtimeCommandLetters);
  console.log(`Auditing ${allSpls.length} SPL (Surat Perintah Lembur) documents...`);

  let resetCount = 0;

  for (const spl of allSpls) {
    if (spl.status === "approved" || spl.status === "closed" || spl.status === "rejected") {
      continue;
    }

    const steps = await db
      .select()
      .from(overtimeApprovals)
      .where(eq(overtimeApprovals.overtimeCommandLetterId, spl.id))
      .orderBy(asc(overtimeApprovals.stepOrder));

    if (steps.length === 0) continue;

    const step1 = steps.find((s) => s.stepOrder === 1);
    const step2 = steps.find((s) => s.stepOrder === 2);

    // If step 1 has status approved but has no signatureDataUrl or explicit approval record while SPL is submitted/draft
    if (step1 && step1.status === "approved" && !step1.signatureDataUrl) {
      console.log(`[REPAIR] SPL #${spl.id} (${spl.splNumber}) Step 1 was auto-approved without signature. Resetting Step 1 to 'pending'.`);
      await db
        .update(overtimeApprovals)
        .set({ status: "pending", signedAt: null })
        .where(eq(overtimeApprovals.id, step1.id));

      if (step2 && step2.status === "pending") {
        await db
          .update(overtimeApprovals)
          .set({ status: "waiting" })
          .where(eq(overtimeApprovals.id, step2.id));
      }

      resetCount++;
    }
  }

  console.log(`SPL repair completed. ${resetCount} premature SPL step 1 auto-approvals reset to 'pending'.`);
}

repairSplApprovals().catch(console.error);
