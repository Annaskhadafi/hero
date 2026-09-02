import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getCurrentEmployeeAccessRole();
  if (!role || (role !== "Super Admin" && role !== "HC Manager")) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const menuItemId = parseInt(id);

  if (isNaN(menuItemId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [updated] = await db
    .update(navbarMenuItems)
    .set(body)
    .where(eq(navbarMenuItems.id, menuItemId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getCurrentEmployeeAccessRole();
  if (!role || (role !== "Super Admin" && role !== "HC Manager")) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const menuItemId = parseInt(id);

  if (isNaN(menuItemId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(navbarMenuItems)
    .where(eq(navbarMenuItems.id, menuItemId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

