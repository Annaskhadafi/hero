import { db } from "@/db";
import { employees, hrPositions, masterDepartments, masterSections } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export type HcEmployeeUnifiedRow = Awaited<ReturnType<typeof getUnifiedHcEmployees>>[number];

/**
 * Read-side single source of truth for HC modules.
 *
 * All employee data now lives in hero_employees. This helper enriches
 * operational employee rows with master-data names (department, section, position).
 */
export async function getUnifiedHcEmployees() {
  return db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      name: employees.name,
      email: employees.email,
      employmentStatus: employees.employmentStatus,
      isActive: employees.isActive,
      joinDate: employees.joinDate,
      contractDurationStart: employees.contractDurationStart,
      contractDurationEnd: employees.contractDurationEnd,
      departmentId: employees.departmentId,
      departmentName: masterDepartments.name,
      sectionId: employees.sectionId,
      sectionName: masterSections.name,
      positionId: employees.positionId,
      positionName: hrPositions.rankName,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id));
}

/**
 * Best-effort lookup for an employee by ID, with fallback to email/employeeSn.
 */
export async function resolveOperationalEmployeeForHr(hrEmployeeId: number) {
  const [hr] = await db.select().from(employees).where(eq(employees.id, hrEmployeeId)).limit(1);
  if (!hr) return null;

  if (hr.email) {
    const [byEmail] = await db.select().from(employees).where(eq(employees.email, hr.email)).limit(1);
    if (byEmail) return byEmail;
  }

  const [bySn] = await db.select().from(employees).where(eq(employees.employeeSn, hr.employeeSn)).limit(1);
  return bySn ?? null;
}
