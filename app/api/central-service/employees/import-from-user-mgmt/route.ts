import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { and, eq, inArray } from "drizzle-orm";

async function requireCentralServiceAccess() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(eq(employees.email, session.user.email.trim().toLowerCase()))
    .limit(1);

  const allowedRoles = new Set(["Super Admin", "Admin", "HC Admin", "HR Admin", "Site Admin"]);
  if (!employee?.accessRole || !allowedRoles.has(employee.accessRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireCentralServiceAccess();
    if (access.error) return access.error;

    const body = await request.json();
    const { department } = body;

    const conditions = [eq(employees.isActive, true)];
    if (department) {
      conditions.push(eq(employees.department, department));
    }

    const userMgmtEmployees = await db
      .select()
      .from(employees)
      .where(and(...conditions));

    if (userMgmtEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        totalProcessed: 0,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
      });
    }

    const employeeSns = userMgmtEmployees.map((emp) => emp.employeeSn);
    const existingEmployees = await db
      .select({ employeeSn: centralServiceEmployees.employeeSn })
      .from(centralServiceEmployees)
      .where(inArray(centralServiceEmployees.employeeSn, employeeSns));

    const existingSnSet = new Set(existingEmployees.map((emp) => emp.employeeSn));
    const newEmployees = userMgmtEmployees.filter((emp) => !existingSnSet.has(emp.employeeSn));

    if (newEmployees.length > 0) {
      await db.insert(centralServiceEmployees).values(
        newEmployees.map((emp) => ({
          employeeSn: emp.employeeSn,
          fullName: emp.name,
          email: emp.email,
          phoneNumber: emp.phoneNumber,
          siteId: emp.siteId,
          siteName: emp.workLocation,
          department: emp.department,
          section: emp.section,
          position: emp.jobTitle,
          employmentStatus: emp.employmentStatus,
          employmentType: "permanent",
          authUserId: emp.authUserId,
          isSyncedToUserManagement: true,
          syncedAt: new Date(),
        })),
      ).onConflictDoNothing({ target: centralServiceEmployees.employeeSn });
    }

    return NextResponse.json({
      success: true,
      totalProcessed: userMgmtEmployees.length,
      importedCount: newEmployees.length,
      skippedCount: userMgmtEmployees.length - newEmployees.length,
      errorCount: 0,
    });
  } catch (error) {
    console.error("Import from User Management error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
