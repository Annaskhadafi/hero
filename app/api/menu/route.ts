import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems, securityRoles, roleMenuPermissions } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select()
    .from(navbarMenuItems)
    .orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder);

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const [created] = await db
    .insert(navbarMenuItems)
    .values({
      menuArea: body.menuArea ?? "main",
      section: body.section,
      title: body.title,
      url: body.url,
      iconName: body.iconName ?? "dashboard",
      resource: body.resource,
      sortOrder: body.sortOrder ?? 0,
      isVisible: body.isVisible ?? true,
      openInNewTab: body.openInNewTab ?? false,
      itemType: body.itemType ?? "menu",
      parentId: body.parentId ?? null,
      groupLabel: body.groupLabel ?? null,
      isIframe: body.isIframe ?? false,
    })
    .returning();

  // Automatically insert permissions for this new menu item
  try {
    const roles = await db.select().from(securityRoles);
    if (roles.length > 0) {
      const defaultPermissions = roles.map((role) => ({
        roleId: role.id,
        menuItemId: created.id,
        canView: role.name === "Super Admin",
        canEdit: role.name === "Super Admin",
        canDelete: role.name === "Super Admin",
        canSelectAll: role.name === "Super Admin",
        dataScope: role.name === "Super Admin" ? "global" : "own",
      }));
      await db.insert(roleMenuPermissions).values(defaultPermissions);
    }
  } catch (err) {
    console.error("Failed to seed permission for new menu item:", err);
  }

  return NextResponse.json(created);
}
