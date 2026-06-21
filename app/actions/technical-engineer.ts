"use server";

import { db } from "@/db";
import { employees, masterDepartments, masterSections, sites, hrPositions } from "@/db/schema/hero";
import { eq, desc, ilike, or } from "drizzle-orm";

export async function getTechnicalEngineers() {
  return await db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      department: masterDepartments.name,
      section: masterSections.name,
      site: sites.name,
      position: hrPositions.rankName,
      joinDate: employees.joinDate,
      isActive: employees.isActive,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    // We can filter on the server or return all and filter on the client. 
    // Let's filter broadly on server for anyone in Repair, Maintenance, or Engineering
    .where(
      or(
        ilike(masterDepartments.name, "%Repair%"),
        ilike(masterSections.name, "%Repair%"),
        ilike(masterDepartments.name, "%Technical%"),
        ilike(masterSections.name, "%Technical%"),
        ilike(masterDepartments.name, "%Maintenance%"),
        ilike(masterSections.name, "%Maintenance%")
      )
    )
    .orderBy(desc(employees.id));
}
