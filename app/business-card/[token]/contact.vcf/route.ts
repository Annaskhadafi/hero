import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{64}$/.test(token)) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const [employee] = await db.select({
    name: employees.name,
    jobTitle: employees.jobTitle,
    role: employees.role,
    email: employees.email,
    phoneNumber: employees.phoneNumber,
    sharingEnabled: employees.businessCardPublicEnabled,
    isActive: employees.isActive,
  }).from(employees).where(eq(employees.businessCardPublicToken, token)).limit(1);

  if (!employee || !employee.sharingEnabled || !employee.isActive) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const [givenName, ...familyParts] = employee.name.trim().split(/\s+/);
  const familyName = familyParts.join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCard(familyName)};${escapeVCard(givenName || "")}`,
    `FN:${escapeVCard(employee.name)}`,
    `ORG:${escapeVCard("PT Chitra Paratama")}`,
    `TITLE:${escapeVCard(employee.jobTitle || employee.role)}`,
    `EMAIL;TYPE=WORK:${escapeVCard(employee.email)}`,
    ...(employee.phoneNumber ? [`TEL;TYPE=WORK,VOICE:${escapeVCard(employee.phoneNumber)}`] : []),
    "END:VCARD",
    "",
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${employee.name.replace(/[^A-Za-z0-9_-]/g, "_")}.vcf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
