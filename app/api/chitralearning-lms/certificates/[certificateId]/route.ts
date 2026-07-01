import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  chitraLearningCertificates,
  chitraLearningCourses,
  employees,
} from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const session = await getServerSession();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { certificateId: certificateIdParam } = await params;
  const certificateId = Number(certificateIdParam);

  if (!Number.isFinite(certificateId) || certificateId <= 0) {
    return NextResponse.json({ message: "Invalid certificate id" }, { status: 400 });
  }

  const [viewer] = await db
    .select({
      id: employees.id,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);

  if (!viewer) {
    return NextResponse.json({ message: "Employee not found" }, { status: 404 });
  }

  const [certificate] = await db
    .select()
    .from(chitraLearningCertificates)
    .where(eq(chitraLearningCertificates.id, certificateId))
    .limit(1);

  if (!certificate) {
    return NextResponse.json({ message: "Certificate not found" }, { status: 404 });
  }

  const isOwner = certificate.employeeId === viewer.id;
  const isAdmin = /admin/i.test(viewer.accessRole || "");

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [[course], [employee]] = await Promise.all([
    db
      .select({
        title: chitraLearningCourses.title,
        category: chitraLearningCourses.category,
      })
      .from(chitraLearningCourses)
      .where(eq(chitraLearningCourses.id, certificate.courseId))
      .limit(1),
    db
      .select({
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
      })
      .from(employees)
      .where(eq(employees.id, certificate.employeeId))
      .limit(1),
  ]);

  if (!course || !employee) {
    return NextResponse.json({ message: "Certificate data incomplete" }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 28,
    y: 28,
    width: 786,
    height: 539,
    borderColor: rgb(0.1, 0.24, 0.34),
    borderWidth: 2,
    color: rgb(0.98, 0.99, 0.99),
  });
  page.drawRectangle({
    x: 46,
    y: 46,
    width: 750,
    height: 503,
    borderColor: rgb(0.76, 0.85, 0.89),
    borderWidth: 1,
  });

  drawCentered(page, "CHITRALEARNING LMS", 508, 16, boldFont, rgb(0.1, 0.24, 0.34));
  drawCentered(page, "CERTIFICATE OF COMPLETION", 454, 28, boldFont, rgb(0.06, 0.12, 0.16));
  drawCentered(page, "This certificate is awarded to", 402, 13, regularFont, rgb(0.33, 0.4, 0.45));
  drawCentered(page, employee.name, 358, 30, boldFont, rgb(0.04, 0.09, 0.13));
  drawCentered(page, `${employee.employeeSn} | ${employee.department || "-"} | ${employee.section || "-"}`, 331, 11, regularFont, rgb(0.33, 0.4, 0.45));
  drawCentered(page, "for successfully completing", 286, 13, regularFont, rgb(0.33, 0.4, 0.45));
  drawCentered(page, course.title, 248, 24, boldFont, rgb(0.07, 0.18, 0.26));
  drawCentered(page, `Category: ${course.category || "Internal"}`, 219, 11, regularFont, rgb(0.33, 0.4, 0.45));

  page.drawText(`Certificate No: ${certificate.certificateNumber}`, {
    x: 76,
    y: 126,
    size: 11,
    font: boldFont,
    color: rgb(0.12, 0.18, 0.22),
  });
  page.drawText(`Issued: ${formatDate(certificate.issuedAt)}`, {
    x: 76,
    y: 104,
    size: 10,
    font: regularFont,
    color: rgb(0.33, 0.4, 0.45),
  });
  page.drawText("Internal training certificate generated from HERO.", {
    x: 537,
    y: 104,
    size: 10,
    font: regularFont,
    color: rgb(0.33, 0.4, 0.45),
  });
  page.drawLine({
    start: { x: 586, y: 143 },
    end: { x: 744, y: 143 },
    thickness: 1,
    color: rgb(0.2, 0.28, 0.34),
  });
  page.drawText("Management", {
    x: 629,
    y: 122,
    size: 11,
    font: boldFont,
    color: rgb(0.12, 0.18, 0.22),
  });

  const pdfBytes = await pdfDoc.save();
  const safeNumber = certificate.certificateNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="chitralearning-certificate-${safeNumber || certificate.id}.pdf"`,
    },
  });
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (842 - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Makassar",
  });
}
