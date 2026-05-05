import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

/**
 * POST /api/central-service/employees/sync
 * Sync employee to User Management (create user account)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, email } = body;

    if (!employeeId || !email) {
      return NextResponse.json(
        { error: "Employee ID and email are required" },
        { status: 400 }
      );
    }

    // Get Central Service employee
    const [csEmployee] = await db
      .select()
      .from(centralServiceEmployees)
      .where(eq(centralServiceEmployees.id, employeeId))
      .limit(1);

    if (!csEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if already synced
    if (csEmployee.isSyncedToUserManagement) {
      return NextResponse.json(
        { error: "Employee already synced to User Management" },
        { status: 400 }
      );
    }

    // Update email if provided
    if (email !== csEmployee.email) {
      await db
        .update(centralServiceEmployees)
        .set({ email })
        .where(eq(centralServiceEmployees.id, employeeId));
    }

    // Check if employee already exists in User Management by SN
    const [existingEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeSn, csEmployee.employeeSn))
      .limit(1);

    let userManagementEmployeeId: number;

    if (existingEmployee) {
      // Update existing employee
      const [updated] = await db
        .update(employees)
        .set({
          name: csEmployee.fullName,
          email: email,
          phoneNumber: csEmployee.phoneNumber || "",
          department: csEmployee.department || "Central Services",  // Keep original or default
          jobTitle: csEmployee.position,
          workLocation: csEmployee.siteName,
          employmentStatus: csEmployee.employmentStatus,
        })
        .where(eq(employees.id, existingEmployee.id))
        .returning();
      userManagementEmployeeId = updated.id;
    } else {
      // Create new employee in User Management
      const [newEmployee] = await db
        .insert(employees)
        .values({
          siteId: csEmployee.siteId || 1, // Default site if not set
          name: csEmployee.fullName,
          email: email,
          employeeSn: csEmployee.employeeSn,
          phoneNumber: csEmployee.phoneNumber || "",
          department: csEmployee.department || "Central Services",  // Keep original or default
          section: "",
          role: "employee",
          jobTitle: csEmployee.position,
          workLocation: csEmployee.siteName,
          employmentStatus: csEmployee.employmentStatus,
          isActive: true,
        })
        .returning();
      userManagementEmployeeId = newEmployee.id;
    }

    // Mark as synced in Central Service
    await db
      .update(centralServiceEmployees)
      .set({
        isSyncedToUserManagement: true,
        syncedAt: new Date(),
      })
      .where(eq(centralServiceEmployees.id, employeeId));

    return NextResponse.json({
      success: true,
      message: "Employee synced to User Management successfully",
      userManagementEmployeeId,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
