import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees as heroEmployees } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { eq } from "drizzle-orm";

async function requireCentralServiceAccess() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [employee] = await db
    .select({ accessRole: heroEmployees.accessRole })
    .from(heroEmployees)
    .where(eq(heroEmployees.email, session.user.email.trim().toLowerCase()))
    .limit(1);

  const allowedRoles = new Set(["Super Admin", "Admin", "HC Admin", "HR Admin", "Site Admin"]);
  if (!employee?.accessRole || !allowedRoles.has(employee.accessRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCentralServiceAccess();
    if (access.error) return access.error;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const [employee] = await db.select().from(centralServiceEmployees).where(eq(centralServiceEmployees.id, id)).limit(1);
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get employee" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCentralServiceAccess();
    if (access.error) return access.error;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const [employee] = await db.update(centralServiceEmployees).set({ ...body, updatedAt: new Date() }).where(eq(centralServiceEmployees.id, id)).returning();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    // Sync email FROM hero_employees (User Management is single source of truth)
    // Do NOT write email back to hero_employees from Central Service
    if (employee.employeeSn) {
      const [heroEmp] = await db
        .select({ email: heroEmployees.email })
        .from(heroEmployees)
        .where(eq(heroEmployees.employeeSn, employee.employeeSn))
        .limit(1)
      if (heroEmp?.email) {
        await db
          .update(centralServiceEmployees)
          .set({ email: heroEmp.email })
          .where(eq(centralServiceEmployees.id, id))
      }
    }
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCentralServiceAccess();
    if (access.error) return access.error;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const [employee] = await db.delete(centralServiceEmployees).where(eq(centralServiceEmployees.id, id)).returning();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
