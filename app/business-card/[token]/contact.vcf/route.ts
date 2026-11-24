import { NextResponse } from "next/server";

import { getPublicEmployeeEcard } from '@/lib/public-employee-ecard';

export const dynamic = "force-dynamic";
export const revalidate = 0;

function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const employee = await getPublicEmployeeEcard(token);
  if (!employee) {
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
    `URL:https://hero.chitraparatama.com/business-card/${employee.publicIdentifier}`,
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
