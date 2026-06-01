"use server";

import { db } from "@/db";
import { hrEmployees, hrDepartments, hrSections, hrSites, hrPositions, hrWorkLocations } from "@/db/schema/hero";
import { eq, desc, ilike, or } from "drizzle-orm";

export async function getTechnicalEngineers() {
  return await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      department: hrDepartments.name,
      section: hrSections.name,
      site: hrSites.name,
      workLocation: hrWorkLocations.name,
      position: hrPositions.rankName,
      joinDate: hrEmployees.joinDate,
      isActive: hrEmployees.isActive,
    })
    .from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .leftJoin(hrSites, eq(hrEmployees.siteId, hrSites.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .leftJoin(hrWorkLocations, eq(hrEmployees.workLocationId, hrWorkLocations.id))
    // We can filter on the server or return all and filter on the client. 
    // Let's filter broadly on server for anyone in Repair, Maintenance, or Engineering
    .where(
      or(
        ilike(hrDepartments.name, "%Repair%"),
        ilike(hrSections.name, "%Repair%"),
        ilike(hrDepartments.name, "%Technical%"),
        ilike(hrSections.name, "%Technical%"),
        ilike(hrDepartments.name, "%Maintenance%"),
        ilike(hrSections.name, "%Maintenance%")
      )
    )
    .orderBy(desc(hrEmployees.id));
}
