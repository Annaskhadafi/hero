"use server"

import { db } from "@/db"
import { safetyInspections } from "@/db/schema/hero"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type SafetyInspection = typeof safetyInspections.$inferSelect
export type SafetyInspectionInsert = typeof safetyInspections.$inferInsert

export async function getSafetyInspections() {
  return await db.select().from(safetyInspections).orderBy(desc(safetyInspections.date))
}

export async function createSafetyInspection(data: SafetyInspectionInsert) {
  const [record] = await db.insert(safetyInspections).values(data).returning()
  revalidatePath("/dashboard/safety/inspections")
  return record
}

export async function updateSafetyInspection(id: number, data: Partial<SafetyInspectionInsert>) {
  const [record] = await db.update(safetyInspections).set({ ...data, updatedAt: new Date() }).where(eq(safetyInspections.id, id)).returning()
  revalidatePath("/dashboard/safety/inspections")
  return record
}

export async function deleteSafetyInspection(id: number) {
  await db.delete(safetyInspections).where(eq(safetyInspections.id, id))
  revalidatePath("/dashboard/safety/inspections")
  return { success: true }
}
