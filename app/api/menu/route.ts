import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
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
    })
    .returning();

  return NextResponse.json(created);
}
