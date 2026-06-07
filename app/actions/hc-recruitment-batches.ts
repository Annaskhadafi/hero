"use server";

import { db } from "@/db";
import { hcRecruitmentBatches } from "@/db/schema/hero";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function ensureBatchesTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hc_recruitment_batches (
      id SERIAL PRIMARY KEY,
      recruitment_id INTEGER NOT NULL REFERENCES hero_hc_recruitments(id) ON DELETE CASCADE,
      batch_name TEXT NOT NULL,
      batch_type TEXT NOT NULL,
      scheduled_at TIMESTAMP NOT NULL,
      scheduled_end_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

export type BatchData = {
  recruitmentId: number;
  batchName: string;
  batchType: string;
  scheduledAt: Date;
  scheduledEndAt?: Date | null;
};

export async function getBatchesByRecruitment(recruitmentId: number) {
  await ensureBatchesTable();
  return db
    .select()
    .from(hcRecruitmentBatches)
    .where(eq(hcRecruitmentBatches.recruitmentId, recruitmentId))
    .orderBy(hcRecruitmentBatches.scheduledAt);
}

export async function createBatch(data: BatchData) {
  await ensureBatchesTable();
  const [batch] = await db
    .insert(hcRecruitmentBatches)
    .values({
      recruitmentId: data.recruitmentId,
      batchName: data.batchName,
      batchType: data.batchType,
      scheduledAt: data.scheduledAt,
      scheduledEndAt: data.scheduledEndAt || null,
    })
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return batch;
}

export async function updateBatch(
  id: number,
  data: Partial<BatchData>
) {
  await ensureBatchesTable();
  const payload: Record<string, unknown> = {};
  if (data.batchName !== undefined) payload.batchName = data.batchName;
  if (data.batchType !== undefined) payload.batchType = data.batchType;
  if (data.scheduledAt !== undefined) payload.scheduledAt = data.scheduledAt;
  if (data.scheduledEndAt !== undefined) payload.scheduledEndAt = data.scheduledEndAt || null;
  
  const [batch] = await db
    .update(hcRecruitmentBatches)
    .set(payload)
    .where(eq(hcRecruitmentBatches.id, id))
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return batch;
}

export async function deleteBatch(id: number) {
  await ensureBatchesTable();
  await db.delete(hcRecruitmentBatches).where(eq(hcRecruitmentBatches.id, id));
  revalidatePath("/dashboard/hc/recruitment");
  return { success: true };
}
