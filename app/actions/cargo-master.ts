"use server";

import { db } from "@/db";
import { cargoMasterLocations, cargoMasterGoods, cargoMasterRecipients, cargoMasterSites } from "@/db/schema/hero";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function ensureCargoMasterTables() {
  await db.execute(sql`
    create table if not exists hero_cargo_master_sites (
      id serial primary key,
      site_name text not null unique,
      location text not null default '',
      notes text not null default '',
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

export type MasterLocationRecord = {
  id: number;
  locationName: string;
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  contactPerson: string;
  contactPhone: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterGoodsRecord = {
  id: number;
  goodsName: string;
  category: string;
  brand: string;
  unit: string;
  weight: string;
  dimensions: string;
  hsCode: string;
  description: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterDataMutationState = {
  status: "idle" | "success" | "error";
  message: string;
  id?: number;
};

export async function getMasterLocations(search?: string): Promise<MasterLocationRecord[]> {
  const query = db.select().from(cargoMasterLocations).orderBy(desc(cargoMasterLocations.createdAt));
  if (search) {
    return query.where(
      or(
        ilike(cargoMasterLocations.locationName, `%$search%`),
        ilike(cargoMasterLocations.city, `%$search%`),
        ilike(cargoMasterLocations.province, `%$search%`)
      )
    );
  }
  return query;
}

export async function getMasterGoods(search?: string): Promise<MasterGoodsRecord[]> {
  const query = db.select().from(cargoMasterGoods).orderBy(desc(cargoMasterGoods.createdAt));
  if (search) {
    return query.where(
      or(
        ilike(cargoMasterGoods.goodsName, `%$search%`),
        ilike(cargoMasterGoods.category, `%$search%`),
        ilike(cargoMasterGoods.brand, `%$search%`)
      )
    );
  }
  return query;
}

export type MasterRecipientRecord = {
  id: number;
  recipientName: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getMasterRecipients(search?: string): Promise<MasterRecipientRecord[]> {
  const query = db.select().from(cargoMasterRecipients).orderBy(desc(cargoMasterRecipients.createdAt));
  if (search) {
    return query.where(
      or(
        ilike(cargoMasterRecipients.recipientName, `%${search}%`),
        ilike(cargoMasterRecipients.companyName, `%${search}%`),
        ilike(cargoMasterRecipients.city, `%${search}%`)
      )
    );
  }
  return query;
}

// === CRUD for Master Goods ===
export async function createMasterGoods(data: Omit<MasterGoodsRecord, "id" | "createdAt" | "updatedAt">): Promise<MasterDataMutationState> {
  try {
    const [result] = await db.insert(cargoMasterGoods).values(data).returning();
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Barang berhasil ditambahkan", id: result.id };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal menambahkan barang" };
  }
}

export async function updateMasterGoods(id: number, data: Partial<Omit<MasterGoodsRecord, "id" | "createdAt" | "updatedAt">>): Promise<MasterDataMutationState> {
  try {
    await db.update(cargoMasterGoods).set({ ...data, updatedAt: new Date() }).where(eq(cargoMasterGoods.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Barang berhasil diupdate" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal update barang" };
  }
}

export async function deleteMasterGoods(id: number): Promise<MasterDataMutationState> {
  try {
    await db.delete(cargoMasterGoods).where(eq(cargoMasterGoods.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Barang berhasil dihapus" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal hapus barang" };
  }
}

// === CRUD for Master Locations ===
export async function createMasterLocation(data: Omit<MasterLocationRecord, "id" | "createdAt" | "updatedAt">): Promise<MasterDataMutationState> {
  try {
    const [result] = await db.insert(cargoMasterLocations).values(data).returning();
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Lokasi berhasil ditambahkan", id: result.id };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal menambahkan lokasi" };
  }
}

export async function updateMasterLocation(id: number, data: Partial<Omit<MasterLocationRecord, "id" | "createdAt" | "updatedAt">>): Promise<MasterDataMutationState> {
  try {
    await db.update(cargoMasterLocations).set({ ...data, updatedAt: new Date() }).where(eq(cargoMasterLocations.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Lokasi berhasil diupdate" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal update lokasi" };
  }
}

export async function deleteMasterLocation(id: number): Promise<MasterDataMutationState> {
  try {
    await db.delete(cargoMasterLocations).where(eq(cargoMasterLocations.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Lokasi berhasil dihapus" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal hapus lokasi" };
  }
}

// === CRUD for Master Recipients ===
export async function createMasterRecipient(data: Omit<MasterRecipientRecord, "id" | "createdAt" | "updatedAt">): Promise<MasterDataMutationState> {
  try {
    const [result] = await db.insert(cargoMasterRecipients).values(data).returning();
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Penerima berhasil ditambahkan", id: result.id };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal menambahkan penerima" };
  }
}

export async function updateMasterRecipient(id: number, data: Partial<Omit<MasterRecipientRecord, "id" | "createdAt" | "updatedAt">>): Promise<MasterDataMutationState> {
  try {
    await db.update(cargoMasterRecipients).set({ ...data, updatedAt: new Date() }).where(eq(cargoMasterRecipients.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Penerima berhasil diupdate" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal update penerima" };
  }
}

export async function deleteMasterRecipient(id: number): Promise<MasterDataMutationState> {
  try {
    await db.delete(cargoMasterRecipients).where(eq(cargoMasterRecipients.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Penerima berhasil dihapus" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal hapus penerima" };
  }
}

// === Master Sites ===
export type MasterSiteRecord = {
  id: number;
  siteName: string;
  location: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getMasterSites(search?: string): Promise<MasterSiteRecord[]> {
  await ensureCargoMasterTables();
  const query = db.select().from(cargoMasterSites).orderBy(desc(cargoMasterSites.createdAt));
  if (search) {
    return query.where(
      or(
        ilike(cargoMasterSites.siteName, `%${search}%`),
        ilike(cargoMasterSites.location, `%${search}%`)
      )
    );
  }
  return query;
}

export async function createMasterSite(data: Omit<MasterSiteRecord, "id" | "createdAt" | "updatedAt">): Promise<MasterDataMutationState> {
  try {
    const [result] = await db.insert(cargoMasterSites).values(data).returning();
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Site berhasil ditambahkan", id: result.id };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal menambahkan site" };
  }
}

export async function updateMasterSite(id: number, data: Partial<Omit<MasterSiteRecord, "id" | "createdAt" | "updatedAt">>): Promise<MasterDataMutationState> {
  try {
    await db.update(cargoMasterSites).set({ ...data, updatedAt: new Date() }).where(eq(cargoMasterSites.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Site berhasil diupdate" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal update site" };
  }
}

export async function deleteMasterSite(id: number): Promise<MasterDataMutationState> {
  try {
    await db.delete(cargoMasterSites).where(eq(cargoMasterSites.id, id));
    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: "Site berhasil dihapus" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Gagal hapus site" };
  }
}
