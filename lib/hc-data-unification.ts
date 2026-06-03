import { db } from "@/db";
import { employees, hrDepartments, hrEmployees, hrPositions, hrSections, hrWorkLocations } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export type HcEmployeeUnifiedRow = Awaited<ReturnType<typeof getUnifiedHcEmployees>>[number];

/**
 * Read-side single source of truth for HC modules.
 *
 * HERO currently has two employee tables:
 * - hero_hr_employees: canonical HC profile/demographic/org data
 * - hero_employees: operational identity used by attendance/activity modules
 *
 * Until a destructive migration is explicitly approved, HC modules should read
 * from hero_hr_employees through this helper and only bridge to hero_employees
 * when operational integration is required.
 */
export async function getUnifiedHcEmployees() {
  return db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      email: hrEmployees.email,
      accountStatus: hrEmployees.accountStatus,
      isActive: hrEmployees.isActive,
      joinDate: hrEmployees.joinDate,
      contractStart: hrEmployees.contractStart,
      contractEnd: hrEmployees.contractEnd,
      departmentId: hrEmployees.departmentId,
      departmentName: hrDepartments.name,
      sectionId: hrEmployees.sectionId,
      sectionName: hrSections.name,
      workLocationId: hrEmployees.workLocationId,
      workLocationName: hrWorkLocations.name,
      positionId: hrEmployees.positionId,
      positionName: hrPositions.rankName,
    })
    .from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .leftJoin(hrWorkLocations, eq(hrEmployees.workLocationId, hrWorkLocations.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id));
}

/**
 * Best-effort bridge lookup from HC employee to operational employee.
 * Matching order: email, then employeeId/employeeSn. This avoids creating or
 * mutating operational identities automatically until HR confirms a migration.
 */
export async function resolveOperationalEmployeeForHr(hrEmployeeId: number) {
  const [hr] = await db.select().from(hrEmployees).where(eq(hrEmployees.id, hrEmployeeId)).limit(1);
  if (!hr) return null;

  if (hr.email) {
    const [byEmail] = await db.select().from(employees).where(eq(employees.email, hr.email)).limit(1);
    if (byEmail) return byEmail;
  }

  const [bySn] = await db.select().from(employees).where(eq(employees.employeeSn, hr.employeeId)).limit(1);
  return bySn ?? null;
}
