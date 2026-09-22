"use server";

import { db } from "@/db";
import { employeeAssets, sites, employees, masterDepartments } from "@/db/schema/hero";
import { eq, ilike, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateAssetSize(
  arg1: number | { assetId?: number | null; employeeId: number; size: string },
  arg2?: string
) {
  if (typeof arg1 === "number") {
    const assetId = arg1;
    const size = arg2 || "";
    await db.update(employeeAssets).set({ size }).where(eq(employeeAssets.id, assetId));
  } else {
    const { assetId, employeeId, size } = arg1;
    if (assetId) {
      await db.update(employeeAssets).set({ size }).where(eq(employeeAssets.id, assetId));
    } else {
      const [existing] = await db
        .select({ id: employeeAssets.id })
        .from(employeeAssets)
        .where(
          and(
            eq(employeeAssets.employeeId, employeeId),
            ilike(employeeAssets.itemName, "%sepatu safety%")
          )
        )
        .limit(1);

      if (existing) {
        await db.update(employeeAssets).set({ size }).where(eq(employeeAssets.id, existing.id));
      } else {
        await db.insert(employeeAssets).values({
          employeeId,
          itemCategory: "APD",
          itemName: "Sepatu Safety",
          quantity: 1,
          assignedAt: new Date(),
          size,
          status: "ACTIVE",
        } as any);
      }
    }
  }
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function updateAssetAttachment(
  arg1: number | { assetId?: number | null; employeeId: number; attachmentUrl: string | null },
  arg2?: string | null
) {
  if (typeof arg1 === "number") {
    const assetId = arg1;
    const attachmentUrl = arg2 ?? null;
    await db.update(employeeAssets).set({ attachmentUrl }).where(eq(employeeAssets.id, assetId));
  } else {
    const { assetId, employeeId, attachmentUrl } = arg1;
    if (assetId) {
      await db.update(employeeAssets).set({ attachmentUrl }).where(eq(employeeAssets.id, assetId));
    } else {
      const [existing] = await db
        .select({ id: employeeAssets.id })
        .from(employeeAssets)
        .where(
          and(
            eq(employeeAssets.employeeId, employeeId),
            ilike(employeeAssets.itemName, "%sepatu safety%")
          )
        )
        .limit(1);

      if (existing) {
        await db.update(employeeAssets).set({ attachmentUrl }).where(eq(employeeAssets.id, existing.id));
      } else {
        await db.insert(employeeAssets).values({
          employeeId,
          itemCategory: "APD",
          itemName: "Sepatu Safety",
          quantity: 1,
          assignedAt: new Date(),
          attachmentUrl,
          status: "ACTIVE",
        } as any);
      }
    }
  }
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
  } as any);
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function deleteSite(siteName: string) {
  await db.update(sites).set({ isActive: false }).where(eq(sites.name, siteName));
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function addEmployeeFast(data: { name: string; employeeSn: string; siteId: number }) {
  // Find central service department
  const centralServiceDepts = await db
    .select({ id: masterDepartments.id, name: masterDepartments.name })
    .from(masterDepartments)
    .where(ilike(masterDepartments.name, "%central service%"))
    .limit(1);

  const deptId = centralServiceDepts[0]?.id;
  const deptName = centralServiceDepts[0]?.name || "Central Services";

  // Insert to hero_employees
  await db.insert(employees).values({
    name: data.name,
    email: `${data.employeeSn.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}@hero.com`,
    employeeSn: data.employeeSn,
    siteId: data.siteId,
    departmentId: deptId,
    department: deptName,
    joinYear: new Date().getFullYear(),
    role: "Staff",
    employmentStatus: "active",
    isActive: true,
  });
  
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
  revalidatePath("/dashboard/hc/employee");
}

export async function updateEmployeeFast(id: number, data: { name: string; employeeSn: string; siteId: number }) {
  await db.update(employees).set({
    name: data.name,
    employeeSn: data.employeeSn,
    siteId: data.siteId,
  }).where(eq(employees.id, id));
  
  revalidatePath("/dashboard/apd/inventory/safety-shoes");
  revalidatePath("/dashboard/hc/employee");
}

export async function updateSafetyShoesDate(assetId: number, newDate: Date) {
  const nextReplacementDue = new Date(newDate);
  nextReplacementDue.setMonth(nextReplacementDue.getMonth() + 8);

  await db
    .update(employeeAssets)
    .set({
      assignedAt: newDate,
      nextReplacementDue,
    })
    .where(eq(employeeAssets.id, assetId));

  revalidatePath("/dashboard/apd/inventory/safety-shoes");
}

export async function deleteSafetyShoesRecord(assetId: number) {
  await db.delete(employeeAssets).where(eq(employeeAssets.id, assetId));
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
