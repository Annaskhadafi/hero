import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { inArray, eq } from "drizzle-orm";
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
    const { action, itemIds, targetSection, isVisible } = body as {
      action: "move" | "toggle_visibility" | "delete";
      itemIds: number[];
      targetSection?: string;
      isVisible?: boolean;
    };

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds array wajib diisi." }, { status: 400 });
    }

    if (action === "move") {
      if (!targetSection) {
        return NextResponse.json({ error: "targetSection wajib diisi untuk aksi move." }, { status: 400 });
      }
      await db
        .update(navbarMenuItems)
        .set({ section: targetSection.trim() })
        .where(inArray(navbarMenuItems.id, itemIds));

      return NextResponse.json({
        success: true,
        message: `${itemIds.length} menu berhasil dipindahkan ke group "${targetSection}".`,
      });
    }

    if (action === "toggle_visibility") {
      const state = isVisible ?? true;
      await db
        .update(navbarMenuItems)
        .set({ isVisible: state })
        .where(inArray(navbarMenuItems.id, itemIds));

      return NextResponse.json({
        success: true,
        message: `${itemIds.length} menu berhasil di-${state ? "tampilkan" : "sembunyikan"}.`,
      });
    }

    if (action === "delete") {
      await db.delete(navbarMenuItems).where(inArray(navbarMenuItems.id, itemIds));
      return NextResponse.json({
        success: true,
        message: `${itemIds.length} menu berhasil dihapus.`,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/menu/bulk] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses aksi massal" },
      { status: 500 }
    );
  }
}
