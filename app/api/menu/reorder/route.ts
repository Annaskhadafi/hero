import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { items } = body;

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  for (const item of items) {
    if (item.id && item.sortOrder !== undefined) {
      await db
        .update(navbarMenuItems)
        .set({ sortOrder: item.sortOrder })
        .where(eq(navbarMenuItems.id, item.id));
    }
  }

  return NextResponse.json({ success: true });
}
