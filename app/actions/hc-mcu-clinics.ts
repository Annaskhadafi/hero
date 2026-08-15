"use server";

import { db } from "@/db";
import { hcMcuClinics } from "@/db/schema/hero";
import { eq, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function ensureMcuClinicsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_hc_mcu_clinics (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        contact_person TEXT NOT NULL DEFAULT '',
        paket_options JSONB,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch {
    // ignore
  }
}

export type McuClinicData = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  contactPerson?: string;
  paketOptions?: string[];
  isActive?: boolean;
};

export async function getMcuClinics() {
  await ensureMcuClinicsTable();
  const rows = await db
    .select({
      id: hcMcuClinics.id,
      name: hcMcuClinics.name,
      email: hcMcuClinics.email,
      phone: hcMcuClinics.phone,
      address: hcMcuClinics.address,
      city: hcMcuClinics.city,
      contactPerson: hcMcuClinics.contactPerson,
      paketOptions: hcMcuClinics.paketOptions,
      isActive: hcMcuClinics.isActive,
    })
    .from(hcMcuClinics)
    .orderBy(asc(hcMcuClinics.name));
  return rows.map((r) => ({
    ...r,
    paketOptions: Array.isArray(r.paketOptions) ? (r.paketOptions as string[]) : [],
  }));
}

export async function getActiveMcuClinics() {
  await ensureMcuClinicsTable();
  const rows = await db
    .select({
      id: hcMcuClinics.id,
      name: hcMcuClinics.name,
      email: hcMcuClinics.email,
      phone: hcMcuClinics.phone,
      address: hcMcuClinics.address,
      city: hcMcuClinics.city,
      contactPerson: hcMcuClinics.contactPerson,
      paketOptions: hcMcuClinics.paketOptions,
      isActive: hcMcuClinics.isActive,
    })
    .from(hcMcuClinics)
    .where(eq(hcMcuClinics.isActive, true))
    .orderBy(asc(hcMcuClinics.name));
  return rows.map((r) => ({
    ...r,
    paketOptions: Array.isArray(r.paketOptions) ? (r.paketOptions as string[]) : [],
  }));
}

export async function getMcuClinicById(id: number) {
  await ensureMcuClinicsTable();
  const [clinic] = await db.select().from(hcMcuClinics).where(eq(hcMcuClinics.id, id)).limit(1);
  return clinic ?? null;
}

export async function saveMcuClinic(id: number | null, data: McuClinicData) {
  await ensureMcuClinicsTable();
  const payload = {
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    address: data.address ?? "",
    city: data.city ?? "",
    contactPerson: data.contactPerson ?? "",
    paketOptions: data.paketOptions ?? [],
    isActive: data.isActive ?? true,
  };
  if (id) {
    const [updated] = await db
      .update(hcMcuClinics)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(hcMcuClinics.id, id))
      .returning();
    revalidatePath("/dashboard/hc/settings/mcu-clinics");
    return updated;
  }
  const [created] = await db.insert(hcMcuClinics).values(payload).returning();
  revalidatePath("/dashboard/hc/settings/mcu-clinics");
  return created;
}

export async function deleteMcuClinic(id: number) {
  await ensureMcuClinicsTable();
  await db.delete(hcMcuClinics).where(eq(hcMcuClinics.id, id));
  revalidatePath("/dashboard/hc/settings/mcu-clinics");
  return { success: true };
}
