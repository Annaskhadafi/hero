import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarGroupLabelStyles } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export async function GET() {
  const [style] = await db
    .select()
    .from(navbarGroupLabelStyles)
    .where(eq(navbarGroupLabelStyles.section, "__global__"))
    .limit(1);

  return NextResponse.json({ color: style?.textColor ?? "#6B7280" });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { color } = body;

  const [existing] = await db
    .select()
    .from(navbarGroupLabelStyles)
    .where(eq(navbarGroupLabelStyles.section, "__global__"))
    .limit(1);

  if (existing) {
    await db
      .update(navbarGroupLabelStyles)
      .set({ textColor: color })
      .where(eq(navbarGroupLabelStyles.id, existing.id));
  } else {
    await db.insert(navbarGroupLabelStyles).values({
      section: "__global__",
      groupLabel: "__global__",
      textColor: color,
    });
  }

  return NextResponse.json({ success: true, color });
}
