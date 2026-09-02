import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems, securityRoles, roleMenuPermissions, employees } from "@/db/schema/hero";
import { user as authUser } from "@/db/schema/auth";
import { eq, or } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [employee] = await db
    .select({
      accessRole: employees.accessRole,
    })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(or(eq(employees.email, session.user.email), eq(authUser.email, session.user.email)))
    .limit(1);

  const roleName = employee?.accessRole ?? 'User';
  const [role] = await db
    .select()
    .from(securityRoles)
    .where(eq(securityRoles.name, roleName))
    .limit(1);

  if (!role) {
    return NextResponse.json([]);
  }

  // If mobile app allows passing a query param `all=true` we could allow super admins to see all.
  // But for now, we just apply the same filtering as the web dashboard.
  const permittedMenuItems = await db
    .select({
      id: navbarMenuItems.id,
      canView: roleMenuPermissions.canView,
      menuArea: navbarMenuItems.menuArea,
      section: navbarMenuItems.section,
      title: navbarMenuItems.title,
      url: navbarMenuItems.url,
      iconName: navbarMenuItems.iconName,
      resource: navbarMenuItems.resource,
      sortOrder: navbarMenuItems.sortOrder,
      isVisible: navbarMenuItems.isVisible,
      openInNewTab: navbarMenuItems.openInNewTab,
      itemType: navbarMenuItems.itemType,
      parentId: navbarMenuItems.parentId,
      groupLabel: navbarMenuItems.groupLabel,
      isIframe: navbarMenuItems.isIframe,
    })
    .from(roleMenuPermissions)
    .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
    .where(eq(roleMenuPermissions.roleId, role.id))
    .orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder);

  const visibleItems = permittedMenuItems.filter((item) => item.isVisible && item.canView);

  return NextResponse.json(visibleItems);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getCurrentEmployeeAccessRole();
  if (!role || (role !== "Super Admin" && role !== "HC Manager")) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

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
