"use server"

import { db } from "@/db"
import { employees, sites, masterDepartments } from "@/db/schema/hero"
import { centralServiceAssets } from "@/db/schema/central-service"
import { and, eq, asc, ilike } from "drizzle-orm"

export async function getEmployees() {
  try {
    const data = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .orderBy(asc(employees.name))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}

export async function getSites() {
  try {
    const data = await db
      .select({ id: sites.id, name: sites.name, location: sites.location })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}

export async function getManualTorqueAssets(location?: string) {
  try {
    const conditions = [eq(centralServiceAssets.section, "MANUAL TORQUE")]
    if (location?.trim()) {
      conditions.push(ilike(centralServiceAssets.location, `%${location.trim()}%`))
    }
    const data = await db
      .select({
        id: centralServiceAssets.id,
        serialNumber: centralServiceAssets.serialNumber,
        description: centralServiceAssets.description,
        assetNumber: centralServiceAssets.assetNumber,
        location: centralServiceAssets.location,
      })
      .from(centralServiceAssets)
      .where(and(...conditions))
      .orderBy(asc(centralServiceAssets.serialNumber))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}

export async function getDepartments() {
  try {
    const data = await db
      .select({ id: masterDepartments.id, name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(asc(masterDepartments.name))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}
