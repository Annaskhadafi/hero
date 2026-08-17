import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems, roleMenuPermissions, securityRoles } from "@/db/schema/hero";
import { ensureHeroGovernanceSeedData } from "@/lib/hero-admin";

export async function GET() {
  try {
    const items = await db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder);

    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      system: "HERO - PT Chitra Paratama",
      totalItems: items.length,
      menuItems: items,
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hero-sidebar-config-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/menu/backup] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, backupData } = body;

    if (action === "reset") {
      // Re-seed default HERO governance navigation
      await db.delete(navbarMenuItems);
      await ensureHeroGovernanceSeedData();

      return NextResponse.json({
        success: true,
        message: "Struktur menu sidebar berhasil di-reset ke konfigurasi default HERO.",
      });
    }

    if (action === "import") {
      if (!backupData || !Array.isArray(backupData.menuItems)) {
        return NextResponse.json(
          { error: "Format file backup tidak valid. Pastikan terdapat array menuItems." },
          { status: 400 }
        );
      }

      // Delete existing and insert imported items
      await db.delete(navbarMenuItems);

      const itemsToInsert = backupData.menuItems.map((item: any, idx: number) => ({
        menuArea: item.menuArea || "main",
        section: item.section || "Menu",
        title: item.title,
        url: item.url,
        iconName: item.iconName || "dashboard",
        resource: item.resource || `res_${idx}`,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : idx,
        isVisible: item.isVisible !== false,
        openInNewTab: Boolean(item.openInNewTab),
        itemType: item.itemType || "menu",
        parentId: item.parentId || null,
        groupLabel: item.groupLabel || null,
        isIframe: Boolean(item.isIframe),
      }));

      const inserted = await db.insert(navbarMenuItems).values(itemsToInsert).returning();

      // Ensure super admin permissions
      const roles = await db.select().from(securityRoles);
      const superAdminRole = roles.find((r) => r.name === "Super Admin");
      if (superAdminRole && inserted.length > 0) {
        const perms = inserted.map((m) => ({
          roleId: superAdminRole.id,
          menuItemId: m.id,
          canView: true,
          canEdit: true,
          canDelete: true,
          canSelectAll: true,
          dataScope: "global",
        }));
        await db.insert(roleMenuPermissions).values(perms);
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil mengimpor ${inserted.length} menu items dari backup.`,
        total: inserted.length,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/menu/backup] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses backup/restore" },
      { status: 500 }
    );
  }
}
