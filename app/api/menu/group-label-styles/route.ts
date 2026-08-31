import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navbarGroupLabelStyles } from "@/db/schema/hero";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";

export async function GET() {
  const styles = await db.select().from(navbarGroupLabelStyles);
  return NextResponse.json(styles);
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

  const existing = await db
    .select()
    .from(navbarGroupLabelStyles)
    .where(
      and(
        eq(navbarGroupLabelStyles.section, body.section),
        eq(navbarGroupLabelStyles.groupLabel, body.groupLabel)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(navbarGroupLabelStyles)
      .set({
        textColor: body.textColor,
        backgroundColor: body.backgroundColor,
        fontWeight: body.fontWeight,
        fontSize: body.fontSize,
      })
      .where(eq(navbarGroupLabelStyles.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db
      .insert(navbarGroupLabelStyles)
      .values({
        section: body.section,
        groupLabel: body.groupLabel,
        textColor: body.textColor ?? "#6B7280",
        backgroundColor: body.backgroundColor,
        fontWeight: body.fontWeight ?? "semibold",
        fontSize: body.fontSize ?? "10px",
      })
      .returning();
    return NextResponse.json(created);
  }
}
