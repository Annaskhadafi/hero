import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, action = "move_to_default", fallbackSection = "Menu" } = body;

    if (!section || typeof section !== "string") {
      return NextResponse.json({ error: "section wajib diisi." }, { status: 400 });
    }

    const trimmedSection = section.trim();

    if (action === "delete_all") {
      // Delete all menu items in this section
      await db.delete(navbarMenuItems).where(eq(navbarMenuItems.section, trimmedSection));
      return NextResponse.json({
        success: true,
        message: `Seluruh menu dalam group "${trimmedSection}" berhasil dihapus.`,
      });
    } else {
      // Move all items to fallback section
      await db
        .update(navbarMenuItems)
        .set({ section: fallbackSection })
        .where(eq(navbarMenuItems.section, trimmedSection));
      return NextResponse.json({
        success: true,
        message: `Seluruh menu dari "${trimmedSection}" dipindahkan ke "${fallbackSection}".`,
      });
    }
  } catch (error: any) {
    console.error("[POST /api/menu/group/delete] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus group" },
      { status: 500 }
    );
  }
}
