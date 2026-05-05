import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const [employee] = await db.select().from(centralServiceEmployees).where(eq(centralServiceEmployees.id, id)).limit(1);
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get employee" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const [employee] = await db.update(centralServiceEmployees).set({ ...body, updatedAt: new Date() }).where(eq(centralServiceEmployees.id, id)).returning();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const [employee] = await db.delete(centralServiceEmployees).where(eq(centralServiceEmployees.id, id)).returning();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
