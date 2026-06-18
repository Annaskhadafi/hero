"use server"

import { db } from "@/db"
import { safetyInspections } from "@/db/schema/hero"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { buildHseSafetyEmail, sendHseSafetyEmail } from "@/lib/hse-safety-email"

export type SafetyInspection = typeof safetyInspections.$inferSelect
export type SafetyInspectionInsert = typeof safetyInspections.$inferInsert

export async function getSafetyInspections() {
  return await db.select().from(safetyInspections).orderBy(desc(safetyInspections.date))
}

export async function createSafetyInspection(data: SafetyInspectionInsert) {
  const [record] = await db.insert(safetyInspections).values(data).returning()

  const emailContent = buildHseSafetyEmail({
    title: "Safety inspection baru",
    intro: "Laporan safety inspection baru telah dibuat di HERO.",
    details: [
      `Judul: ${record.title}`,
      `Tanggal: ${record.date.toLocaleDateString("id-ID")}`,
      `Lokasi: ${record.location || "-"}`,
      `Kategori: ${record.category || "-"}`,
      `Status: ${record.status || "-"}`,
      `PIC: ${record.picName || "-"}`,
    ],
  })

  await sendHseSafetyEmail({
    templateCode: "hse_safety_inspection_created",
    templateName: "HSE Safety Inspection Created",
    variables: {
      title: record.title,
      inspectionDate: record.date,
      location: record.location,
      category: record.category,
      status: record.status,
      picName: record.picName,
    },
    fallbackSubject: `Safety inspection baru: ${record.title}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  })

  revalidatePath("/dashboard/safety/inspections")
  return record
}

export async function updateSafetyInspection(id: number, data: Partial<SafetyInspectionInsert>) {
  const [previous] = await db.select().from(safetyInspections).where(eq(safetyInspections.id, id)).limit(1)
  const [record] = await db.update(safetyInspections).set({ ...data, updatedAt: new Date() }).where(eq(safetyInspections.id, id)).returning()

  if (previous && data.status && data.status !== previous.status) {
    const emailContent = buildHseSafetyEmail({
      title: "Update status safety inspection",
      intro: "Status safety inspection berubah dan perlu diketahui tim HSE Safety.",
      details: [
        `Judul: ${record.title}`,
        `Lokasi: ${record.location || "-"}`,
        `Status lama: ${previous.status || "-"}`,
        `Status baru: ${record.status || "-"}`,
        `PIC: ${record.picName || "-"}`,
      ],
    })

    await sendHseSafetyEmail({
      templateCode: "hse_safety_inspection_status_update",
      templateName: "HSE Safety Inspection Status Update",
      variables: {
        title: record.title,
        location: record.location,
        previousStatus: previous.status,
        status: record.status,
        picName: record.picName,
      },
      fallbackSubject: `Update inspection: ${record.title}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    })
  }

  revalidatePath("/dashboard/safety/inspections")
  return record
}

export async function deleteSafetyInspection(id: number) {
  await db.delete(safetyInspections).where(eq(safetyInspections.id, id))
  revalidatePath("/dashboard/safety/inspections")
  return { success: true }
}
