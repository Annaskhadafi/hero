"use server";

import { db } from "@/db";
import { hcRecruitments } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getRecruitments() {
  return await db
    .select()
    .from(hcRecruitments)
    .orderBy(desc(hcRecruitments.createdAt));
}

export async function getRecruitmentById(id: number) {
  const [data] = await db
    .select()
    .from(hcRecruitments)
    .where(eq(hcRecruitments.id, id))
    .limit(1);
  return data;
}

export async function createRecruitment(data: any) {
  const [created] = await db.insert(hcRecruitments).values({
    jobTitle: data.jobTitle,
    totalRequested: parseInt(data.totalRequested, 10),
    section: data.section,
    status: data.status || 'Sourcing',
    dueDate: new Date(data.dueDate),
  }).returning();
  
  revalidatePath("/dashboard/hc/recruitment");
  return created;
}

export async function updateRecruitment(id: number, data: any) {
  const [updated] = await db
    .update(hcRecruitments)
    .set({
      jobTitle: data.jobTitle,
      totalRequested: parseInt(data.totalRequested, 10),
      section: data.section,
      status: data.status,
      dueDate: new Date(data.dueDate),
      updatedAt: new Date(),
    })
    .where(eq(hcRecruitments.id, id))
    .returning();
    
  revalidatePath("/dashboard/hc/recruitment");
  return updated;
}

export async function deleteRecruitment(id: number) {
  await db.delete(hcRecruitments).where(eq(hcRecruitments.id, id));
  revalidatePath("/dashboard/hc/recruitment");
  return { success: true };
}
