import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { readFileSync } from "fs";
import { resolve } from "path";

import { db } from "@/db";
import {
  chitraLearningCertificates,
  chitraLearningCourses,
  employees,
} from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
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

  const [[courseInfo], [employee]] = await Promise.all([
    db
      .select({
        title: chitraLearningCourses.title,
        category: chitraLearningCourses.category,
        creatorName: employees.name,
      })
      .from(chitraLearningCourses)
      .leftJoin(employees, eq(chitraLearningCourses.createdByEmployeeId, employees.id))
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

  if (!courseInfo || !employee) {
    return NextResponse.json({ message: "Certificate data incomplete" }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  // Landscape A4
  const page = pdfDoc.addPage([842, 595]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Load and draw background
  try {
    const bgImageBytes = readFileSync(resolve(process.cwd(), "public/CERTIFICATE-LMS-CLEAR.png"));
    const bgImage = await pdfDoc.embedPng(bgImageBytes);
    page.drawImage(bgImage, { x: 0, y: 0, width: 842, height: 595 });
  } catch (err) {
    console.warn("Failed to load background image:", err);
  }

  const url = new URL(request.url);
  const verifyUrl = `${url.origin}/dashboard/chitralearning-lms/certificates/${certificate.id}`; // simple verification link
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: 'M', margin: 1 });
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // Typography Settings
  const primaryBlue = rgb(0.13, 0.45, 0.68); // ~ #2173ae
  const darkGray = rgb(0.1, 0.1, 0.1);
  const black = rgb(0, 0, 0);

  // Layout dynamic texts based on the template

  // Student Name
  // Positioned around Y=260 (adjust based on where the line is in the image)
  // Since the line is already in the image, we don't draw it. We just place the text above it.
  const studentNameY = 250;
  drawCentered(page, employee.name.toUpperCase(), studentNameY, 28, boldFont, black);

  // Course Name
  // Positioned below "FOR SUCCESFULLY COMPLETED TRAINING IN"
  const courseNameY = 175;
  drawCentered(page, courseInfo.title.toUpperCase(), courseNameY, 20, boldFont, black);
  
  // End Date
  // Next to "ON"
  const dateStr = formatDate(certificate.issuedAt);
  // "ON" is probably around Y=110, X=290 or so. Let's place the date text precisely.
  page.drawText(dateStr, {
    x: 345, // roughly next to "ON "
    y: 115,
    size: 16,
    font: regularFont,
    color: darkGray,
  });

  // QR Code bottom left
  page.drawImage(qrImage, {
    x: 80,
    y: 70,
    width: 90,
    height: 90,
  });

  // Instructor text
  const instructorY = 50;
  const instructorName = (courseInfo.creatorName || "Management").toUpperCase();
  const instrWidth = regularFont.widthOfTextAtSize(instructorName, 12);
  page.drawText(instructorName, {
    x: 80 + 45 - (instrWidth / 2),
    y: instructorY,
    size: 12,
    font: regularFont,
    color: black
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
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).toUpperCase();
}
