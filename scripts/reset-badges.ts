import { db } from '@/db';
import { timesheetSchedulingPlansV2 } from '@/db/schema/timesheet';
import { eq } from 'drizzle-orm';

async function run() {
  const plans = await db.select().from(timesheetSchedulingPlansV2);
  let updatedCount = 0;
  for (const plan of plans) {
    let changed = false;
    const draftSchedule = (plan.draftSchedule || []) as any[];
    for (const row of draftSchedule) {
      if (row.kimperLv || row.kimperTh) {
        row.kimperLv = false;
        row.kimperTh = false;
        changed = true;
      }
    }
    const activeSchedule = (plan.activeSchedule || []) as any[];
    for (const row of activeSchedule) {
      if (row.kimperLv || row.kimperTh) {
        row.kimperLv = false;
        row.kimperTh = false;
        changed = true;
      }
    }
    if (changed) {
      await db.update(timesheetSchedulingPlansV2)
        .set({ draftSchedule, activeSchedule })
        .where(eq(timesheetSchedulingPlansV2.id, plan.id));
      updatedCount++;
    }
  }
  console.log('Fixed', updatedCount, 'plans');
}
run().catch(console.error).then(() => process.exit(0));
