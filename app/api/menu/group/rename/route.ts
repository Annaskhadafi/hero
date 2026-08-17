import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession();
    } catch {
      // safe fallback
    }

    const body = await request.json();
    const { oldName, newName, type = "section" } = body;

    if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
      return NextResponse.json(
        { error: "oldName dan newName wajib diisi." },
        { status: 400 }
      );
    }

    const trimmedNew = newName.trim();
    const trimmedOld = oldName.trim();

    if (!trimmedNew) {
      return NextResponse.json(
        { error: "Nama baru tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (type === "groupLabel") {
      // Update groupLabel (scoped to section if provided)
      if (body.section) {
        await db
          .update(navbarMenuItems)
          .set({ groupLabel: trimmedNew })
          .where(
            and(
              eq(navbarMenuItems.groupLabel, trimmedOld),
              eq(navbarMenuItems.section, String(body.section).trim())
            )
          );
      } else {
        await db
          .update(navbarMenuItems)
          .set({ groupLabel: trimmedNew })
          .where(eq(navbarMenuItems.groupLabel, trimmedOld));
      }
    } else {
      // Update section
      await db
        .update(navbarMenuItems)
        .set({ section: trimmedNew })
        .where(eq(navbarMenuItems.section, trimmedOld));
    }

    return NextResponse.json({
      success: true,
      message: `Group "${trimmedOld}" berhasil diubah menjadi "${trimmedNew}".`,
      oldName: trimmedOld,
      newName: trimmedNew,
    });
  } catch (error: any) {
    console.error("[POST /api/menu/group/rename] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengubah nama group menu" },
      { status: 500 }
    );
  }
}
