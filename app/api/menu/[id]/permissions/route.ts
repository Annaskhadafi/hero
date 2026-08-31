import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { securityRoles, roleMenuPermissions, navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuItemId = parseInt(id);

    if (isNaN(menuItemId)) {
      return NextResponse.json({ error: "Invalid Menu Item ID" }, { status: 400 });
    }

    const [menu] = await db
      .select()
      .from(navbarMenuItems)
      .where(eq(navbarMenuItems.id, menuItemId))
      .limit(1);

    if (!menu) {
      return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
    }

    const roles = await db.select().from(securityRoles).orderBy(securityRoles.name);
    const existingPerms = await db
      .select()
      .from(roleMenuPermissions)
      .where(eq(roleMenuPermissions.menuItemId, menuItemId));

    const permMap = new Map(existingPerms.map((p) => [p.roleId, p]));

    const result = roles.map((role) => {
      const perm = permMap.get(role.id);
      return {
        roleId: role.id,
        roleName: role.name,
        canView: perm ? perm.canView : role.name === "Super Admin",
        canEdit: perm ? perm.canEdit : role.name === "Super Admin",
        canDelete: perm ? perm.canDelete : role.name === "Super Admin",
      };
    });

    return NextResponse.json({
      success: true,
      menuTitle: menu.title,
      roles: result,
    });
  } catch (error: any) {
    console.error("[GET /api/menu/[id]/permissions] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil hak akses menu" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      return NextResponse.json({ error: "Invalid Menu Item ID" }, { status: 400 });
    }

    const body = await request.json();
    const { permissions } = body as {
      permissions: Array<{
        roleId: number;
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
      }>;
    };

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "Permissions array required" }, { status: 400 });
    }

    for (const p of permissions) {
      const existing = await db
        .select()
        .from(roleMenuPermissions)
        .where(
          eq(roleMenuPermissions.menuItemId, menuItemId) &&
            eq(roleMenuPermissions.roleId, p.roleId)
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(roleMenuPermissions)
          .set({
            canView: p.canView,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
          })
          .where(eq(roleMenuPermissions.id, existing[0].id));
      } else {
        await db.insert(roleMenuPermissions).values({
          menuItemId,
          roleId: p.roleId,
          canView: p.canView,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Hak akses role untuk menu berhasil diperbarui.",
    });
  } catch (error: any) {
    console.error("[POST /api/menu/[id]/permissions] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan hak akses menu" },
      { status: 500 }
    );
  }
}
