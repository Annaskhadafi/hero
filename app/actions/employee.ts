"use server";

import { db } from "@/db";
import { hrEmployees, hrPositions, hrWorkLocations } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getEmployeesForContract() {
  return await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      joinDate: hrEmployees.joinDate,
      contractStart: hrEmployees.contractStart,
      contractEnd: hrEmployees.contractEnd,
      accountStatus: hrEmployees.accountStatus,
      genderCode: hrEmployees.genderCode,
      jobTitle: hrPositions.rankName,
      location: hrWorkLocations.name,
    })
    .from(hrEmployees)
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .leftJoin(hrWorkLocations, eq(hrEmployees.workLocationId, hrWorkLocations.id))
    .where(eq(hrEmployees.isActive, true))
    .orderBy(desc(hrEmployees.id));
}

export async function updateEmployeeContract(id: number, data: any) {
  const [updated] = await db
    .update(hrEmployees)
    .set({
      joinDate: data.joinDate,
      contractStart: data.contractStart,
      contractEnd: data.contractEnd,
      updatedAt: new Date(),
    })
    .where(eq(hrEmployees.id, id))
    .returning();
    
  revalidatePath("/dashboard/hc/employee");
  return updated;
}

export async function deleteEmployee(id: number) {
  const [deleted] = await db
    .update(hrEmployees)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(hrEmployees.id, id))
    .returning();
    
  revalidatePath("/dashboard/hc/employee");
  return deleted;
}
