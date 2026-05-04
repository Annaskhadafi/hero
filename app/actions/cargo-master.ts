"use server";

import { db } from "@/db";
import { cargoMasterLocations, cargoMasterGoods } from "@/db/schema/hero";
import { eq, ilike, or, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
