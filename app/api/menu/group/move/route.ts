import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getCurrentEmployeeAccessRole();
    if (!role || (role !== "Super Admin" && role !== "HC Manager")) {
      return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
    }

    const body = await request.json();
    const { itemId, targetSection, targetGroupLabel, targetMenuArea } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId wajib diisi." }, { status: 400 });
    }

    if (!targetSection || typeof targetSection !== "string") {
      return NextResponse.json({ error: "targetSection wajib diisi." }, { status: 400 });
    }

    const id = typeof itemId === "string" ? parseInt(itemId) : itemId;

    const updatePayload: Record<string, any> = {
      section: targetSection.trim(),
    };

    if (targetGroupLabel !== undefined) {
      updatePayload.groupLabel = targetGroupLabel ? String(targetGroupLabel).trim() : null;
    }

    if (targetMenuArea) {
      updatePayload.menuArea = targetMenuArea;
    }

    const [updated] = await db
      .update(navbarMenuItems)
      .set(updatePayload)
      .where(eq(navbarMenuItems.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Menu item tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Menu "${updated.title}" berhasil dipindahkan ke group "${targetSection}".`,
      item: updated,
    });
  } catch (error: any) {
    console.error("[POST /api/menu/group/move] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memindahkan menu item" },
      { status: 500 }
    );
  }
}
