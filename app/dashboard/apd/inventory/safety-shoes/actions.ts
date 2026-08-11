"use server";

import { db } from "@/db";
import { employeeAssets, sites, employees, masterDepartments } from "@/db/schema/hero";
import { eq, ilike, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateAssetSize(assetId: number, size: string) {
  await db.update(employeeAssets).set({ size }).where(eq(employeeAssets.id, assetId));
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function updateAssetAttachment(assetId: number, attachmentUrl: string | null) {
  await db.update(employeeAssets).set({ attachmentUrl }).where(eq(employeeAssets.id, assetId));
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function addManualSafetyShoes({
  employeeId,
  assignedAt,
  size,
  attachmentUrl,
}: {
  employeeId: number;
  assignedAt: Date;
  size?: string;
  attachmentUrl?: string;
}) {
  const nextReplacementDue = new Date(assignedAt);
  nextReplacementDue.setMonth(nextReplacementDue.getMonth() + 8);

  await db.insert(employeeAssets).values({
    employeeId,
    itemCategory: "APD",
    itemName: "Sepatu Safety", // Ensure it contains "Sepatu Safety"
    quantity: 1,
    assignedAt,
    nextReplacementDue,
    size,
    attachmentUrl,
    status: "ACTIVE",
  });
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function deleteSite(siteName: string) {
  await db.update(sites).set({ isActive: false }).where(eq(sites.name, siteName));
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function addEmployeeFast(data: { name: string; employeeSn: string; siteId: number }) {
  // Find central service department
  const centralServiceDepts = await db
    .select({ id: masterDepartments.id })
    .from(masterDepartments)
    .where(ilike(masterDepartments.name, "%central service%"))
    .limit(1);

  const deptId = centralServiceDepts[0]?.id;

  // Insert to hero_employees
  await db.insert(employees).values({
    name: data.name,
    email: `${data.employeeSn}@hero.com`, // Dummy email
    employeeSn: data.employeeSn,
    siteId: data.siteId,
    departmentId: deptId,
    joinYear: new Date().getFullYear(),
    role: "Staff",
    department: "Central Services"
  });
  
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function updateEmployeeFast(id: number, data: { name: string; employeeSn: string; siteId: number }) {
  await db.update(employees).set({
    name: data.name,
    employeeSn: data.employeeSn,
    siteId: data.siteId,
  }).where(eq(employees.id, id));
  
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function deleteSafetyShoesHistory(employeeId: number) {
  await db.delete(employeeAssets)
    .where(
      and(
        eq(employeeAssets.employeeId, employeeId),
        ilike(employeeAssets.itemName, "%sepatu safety%")
      )
    );
  
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}
