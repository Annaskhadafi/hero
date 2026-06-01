"use server";

import { db } from "@/db";
import { hcCertificates } from "@/db/schema/hero";
import { eq, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCertificates() {
  return await db
    .select()
    .from(hcCertificates)
    .orderBy(asc(hcCertificates.expiryDate));
}

export async function createCertificate(data: any) {
  const [created] = await db.insert(hcCertificates).values({
    employeeId: parseInt(data.employeeId, 10),
    employeeName: data.employeeName,
    certificateType: data.certificateType,
    licenseNumber: data.licenseNumber,
    issuedDate: new Date(data.issuedDate),
    expiryDate: new Date(data.expiryDate),
    status: data.status || 'Active',
  }).returning();
  
  revalidatePath("/dashboard/hc/certificate");
  return created;
}

export async function updateCertificate(id: number, data: any) {
  const [updated] = await db
    .update(hcCertificates)
    .set({
      employeeId: parseInt(data.employeeId, 10),
      employeeName: data.employeeName,
      certificateType: data.certificateType,
      licenseNumber: data.licenseNumber,
      issuedDate: new Date(data.issuedDate),
      expiryDate: new Date(data.expiryDate),
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(hcCertificates.id, id))
    .returning();
    
  revalidatePath("/dashboard/hc/certificate");
  return updated;
}

export async function deleteCertificate(id: number) {
  await db.delete(hcCertificates).where(eq(hcCertificates.id, id));
  revalidatePath("/dashboard/hc/certificate");
  return { success: true };
}
