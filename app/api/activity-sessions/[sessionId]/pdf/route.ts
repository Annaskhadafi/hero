import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivitySessionDocumentData } from "@/lib/daily-activity-documents";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const ROWS_PER_PAGE = 6;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession();
  const email = session?.user?.email?.trim();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const url = new URL(_request.url);
  const isPreview = url.searchParams.get('preview') === '1';
  const data = await getDailyActivitySessionDocumentData(Number(sessionId), email);

  if (!data) {
    return NextResponse.json({ message: "Document data not found" }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const backgroundImage = await loadLetterheadImage(pdfDoc);

  const rows =
    data.items.length > 0
      ? data.items
      : [
          {
            id: 0,
            dateLabel: data.workDate.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            dayLabel: data.workDate.toLocaleDateString("id-ID", { weekday: "long" }),
            startLabel: "-",
            endLabel: "-",
            durationLabel: "-",
            workSummary: "Belum ada item checklist yang dicentang.",
            actualPoints: 0,
            photoUrl: null,
          },
        ];

  const rowPages = chunk(rows, ROWS_PER_PAGE);

  for (const [pageIndex, pageRows] of rowPages.entries()) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    if (backgroundImage) {
      page.drawImage(backgroundImage, {
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        opacity: 0.13,
      });
    }

    const tableStartY = drawDocumentHeader(page, data, boldFont, regularFont, pageIndex + 1, rowPages.length);
    await drawWorkTable(page, pdfDoc, pageRows, tableStartY, boldFont, regularFont);

    if (pageIndex === rowPages.length - 1) {
      await drawSignatureArea(page, pdfDoc, data, boldFont, regularFont);
    }
  }

  const pdfBytes = await pdfDoc.save();
  const safeEmployeeName = data.employee.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const disposition = isPreview
    ? `inline; filename="daily-activity-${data.sessionId}.pdf"`
    : `attachment; filename="spl-user-${safeEmployeeName || "employee"}-${data.sessionId}.pdf"`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

async function loadLetterheadImage(pdfDoc: PDFDocument) {
  const imagePath = path.join(process.cwd(), "public", "ChitraParatama_Stationery_Letterhead_jkt.jpg");

  try {
    const bytes = await readFile(imagePath);
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

function drawDocumentHeader(
  page: PDFPage,
  data: Awaited<ReturnType<typeof getDailyActivitySessionDocumentData>>,
  boldFont: PDFFont,
  regularFont: PDFFont,
  pageNumber: number,
  totalPages: number,
): number {
  if (!data) {
    return 600;
  }

  const startX = 36;
  const boxWidth = 523.28;

  // Title centered
  page.drawText("PT. CHITRA PARATAMA", {
    x: (PAGE_WIDTH - boldFont.widthOfTextAtSize("PT. CHITRA PARATAMA", 11)) / 2,
    y: 775,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const docTitle = data.spl ? "SURAT PERINTAH LEMBUR" : "DAILY ACTIVITY APPROVAL REPORT";
  page.drawText(docTitle, {
    x: (PAGE_WIDTH - boldFont.widthOfTextAtSize(docTitle, 13)) / 2,
    y: 759,
    size: 13,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Page indicator top right
  page.drawText(`Halaman ${pageNumber}/${totalPages}`, {
    x: 485,
    y: 775,
    size: 7.5,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.4),
  });

  // 2-Column Boxed Table (Details & Employee Profile)
  let boxY = 744;
  const rowH = 15;
  const halfW = boxWidth / 2;

  // Section 1: Details Header
  page.drawRectangle({
    x: startX,
    y: boxY - rowH,
    width: boxWidth,
    height: rowH,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.6,
  });
  page.drawText("Details", {
    x: startX + 6,
    y: boxY - 11,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  boxY -= rowH;

  // Row 1: Tanggal Kerja | Shift
  drawBoxRow(
    page,
    startX,
    boxY,
    halfW,
    rowH,
    "Tanggal Kerja:",
    data.workDate.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }),
    "Shift:",
    data.shiftCode || "ALL",
    boldFont,
    regularFont,
  );
  boxY -= rowH;

  // Row 2: Kode Sesi | Status
  drawBoxRow(
    page,
    startX,
    boxY,
    halfW,
    rowH,
    "Kode Sesi:",
    data.sessionCode,
    "Status:",
    (data.status || "COMPLETED").toUpperCase(),
    boldFont,
    regularFont,
  );
  boxY -= rowH;

  // Section 2: Employee Profile Header
  page.drawRectangle({
    x: startX,
    y: boxY - rowH,
    width: boxWidth,
    height: rowH,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.6,
  });
  page.drawText("Employee Profile", {
    x: startX + 6,
    y: boxY - 11,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  boxY -= rowH;

  // Row 3: Nama | SN
  drawBoxRow(
    page,
    startX,
    boxY,
    halfW,
    rowH,
    "Nama:",
    data.employee.name || "-",
    "SN:",
    data.employee.employeeSn || "-",
    boldFont,
    regularFont,
  );
  boxY -= rowH;

  // Row 4: Job Title | Dept / Section
  const deptSec = [data.employee.department, data.employee.section].filter(Boolean).join(" / ") || "-";
  drawBoxRow(
    page,
    startX,
    boxY,
    halfW,
    rowH,
    "Job Title:",
    data.employee.jobTitle || "Staff",
    "Dept / Section:",
    deptSec,
    boldFont,
    regularFont,
  );
  boxY -= rowH;

  // Row 5: Site | Customer
  drawBoxRow(
    page,
    startX,
    boxY,
    halfW,
    rowH,
    "Site:",
    data.site.name || "-",
    "Customer:",
    data.site.customerName || "PT Chitra Paratama",
    boldFont,
    regularFont,
  );
  boxY -= rowH;

  // Optional Row: Anggota Tim
  if (data.teamMembersSummary) {
    page.drawRectangle({
      x: startX,
      y: boxY - rowH,
      width: boxWidth,
      height: rowH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.6,
    });
    page.drawText("Anggota Tim:", {
      x: startX + 6,
      y: boxY - 11,
      size: 7.5,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    page.drawText(data.teamMembersSummary.slice(0, 95), {
      x: startX + 70,
      y: boxY - 11,
      size: 7.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    boxY -= rowH;
  }

  return boxY - 12;
}

function drawBoxRow(
  page: PDFPage,
  x: number,
  y: number,
  halfW: number,
  height: number,
  label1: string,
  val1: string,
  label2: string,
  val2: string,
  boldFont: PDFFont,
  regularFont: PDFFont,
) {
  // Left cell
  page.drawRectangle({
    x,
    y: y - height,
    width: halfW,
    height,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.6,
  });
  page.drawText(label1, {
    x: x + 6,
    y: y - 11,
    size: 7.5,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  const l1W = regularFont.widthOfTextAtSize(label1, 7.5);
  page.drawText(val1.slice(0, 36), {
    x: x + 8 + l1W,
    y: y - 11,
    size: 7.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Right cell
  page.drawRectangle({
    x: x + halfW,
    y: y - height,
    width: halfW,
    height,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.6,
  });
  page.drawText(label2, {
    x: x + halfW + 6,
    y: y - 11,
    size: 7.5,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  const l2W = regularFont.widthOfTextAtSize(label2, 7.5);
  page.drawText(val2.slice(0, 36), {
    x: x + halfW + 8 + l2W,
    y: y - 11,
    size: 7.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
}

async function drawWorkTable(
  page: PDFPage,
  pdfDoc: PDFDocument,
  rows: Array<{
    id: number;
    dateLabel: string;
    dayLabel: string;
    startLabel: string;
    endLabel: string;
    durationLabel: string;
    workSummary: string;
    actualPoints: number;
    photoUrl?: string | null;
  }>,
  startY: number,
  boldFont: PDFFont,
  regularFont: PDFFont,
) {
  const startX = 36;
  const tableWidth = 523.28;
  const headerHeight = 18;

  // Section title above table
  page.drawText(`A. Daily Activity Items (${rows.length} item)`, {
    x: startX,
    y: startY + 2,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  const currentY = startY - 12;

  // Columns: # (24), Aktivitas (195), Unit (64), Durasi (55), Poin (45), Remark (140.28)
  const columns = [
    { title: "#", width: 24, align: "center" as const },
    { title: "Aktivitas", width: 195, align: "left" as const },
    { title: "Unit", width: 64, align: "center" as const },
    { title: "Durasi", width: 55, align: "center" as const },
    { title: "Poin", width: 45, align: "center" as const },
    { title: "Remark", width: 140.28, align: "left" as const },
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.6,
  });

  let colX = startX;
  for (const col of columns) {
    const textX =
      col.align === "center"
        ? colX + (col.width - boldFont.widthOfTextAtSize(col.title, 8)) / 2
        : colX + 6;

    page.drawText(col.title, {
      x: textX,
      y: currentY - 12,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    colX += col.width;
  }

  let rowTopY = currentY - headerHeight;
  const rowHeight = 26;

  for (const [rowIndex, item] of rows.entries()) {
    page.drawRectangle({
      x: startX,
      y: rowTopY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
      color: rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.99, 0.99, 0.99),
    });

    let cellX = startX;

    // Col 0: #
    const numText = String(rowIndex + 1);
    page.drawText(numText, {
      x: cellX + (columns[0].width - regularFont.widthOfTextAtSize(numText, 8)) / 2,
      y: rowTopY - rowHeight / 2 - 3,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    cellX += columns[0].width;

    // Col 1: Aktivitas
    const activityLines = splitText(item.workSummary || "-", 34);
    let actY = rowTopY - 11;
    for (const line of activityLines.slice(0, 2)) {
      page.drawText(line, {
        x: cellX + 6,
        y: actY,
        size: 7.5,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      actY -= 9;
    }
    cellX += columns[1].width;

    // Col 2: Unit
    const unitText = item.workSummary?.match(/Unit:\s*([^,\-]+)/i)?.[1]?.trim() || "-";
    page.drawText(unitText, {
      x: cellX + (columns[2].width - regularFont.widthOfTextAtSize(unitText, 7.5)) / 2,
      y: rowTopY - rowHeight / 2 - 3,
      size: 7.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    cellX += columns[2].width;

    // Col 3: Durasi
    const durText = item.durationLabel && item.durationLabel !== "-" ? item.durationLabel : `${item.startLabel} - ${item.endLabel}`;
    page.drawText(durText, {
      x: cellX + (columns[3].width - regularFont.widthOfTextAtSize(durText, 7.5)) / 2,
      y: rowTopY - rowHeight / 2 - 3,
      size: 7.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    cellX += columns[3].width;

    // Col 4: Poin
    const pointsText = String(item.actualPoints || 0);
    page.drawText(pointsText, {
      x: cellX + (columns[4].width - boldFont.widthOfTextAtSize(pointsText, 8)) / 2,
      y: rowTopY - rowHeight / 2 - 3,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    cellX += columns[4].width;

    // Col 5: Remark
    const remarkText = item.workSummary?.match(/Remark:\s*([^,\-]+)/i)?.[1]?.trim() || "-";
    const remarkLines = splitText(remarkText, 24);
    let remY = rowTopY - 11;
    for (const line of remarkLines.slice(0, 2)) {
      page.drawText(line, {
        x: cellX + 6,
        y: remY,
        size: 7,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      remY -= 9;
    }

    rowTopY -= rowHeight;
  }
}

async function drawSignatureArea(
  page: PDFPage,
  pdfDoc: PDFDocument,
  data: NonNullable<Awaited<ReturnType<typeof getDailyActivitySessionDocumentData>>>,
  boldFont: PDFFont,
  regularFont: PDFFont,
) {
  const approvals = data.approvals || [];
  const employeeStep = approvals.find((a) => a.stepOrder === 1);
  const leaderStep = approvals.find((a) => a.stepOrder === 2 || a.approverRole === 'leader');
  const sectionHeadStep = approvals.find((a) => a.stepOrder === 3 || a.approverRole === 'section_head' || a.approverRole === 'superior');

  const isEmployeeApproved = employeeStep ? employeeStep.status === 'approved' : Boolean(data.signoff.employeeSignedAt);
  const isLeaderApproved = leaderStep?.status === 'approved';
  const isSectionHeadApproved = sectionHeadStep?.status === 'approved';

  const blocks = [
    {
      title: "Employee Signature",
      signerName: employeeStep?.approverName || data.employee.name,
      signedAt: isEmployeeApproved ? (employeeStep?.signedAt ? new Date(employeeStep.signedAt) : data.signoff.employeeSignedAt) : null,
      signatureUrl: isEmployeeApproved ? (employeeStep?.signatureDataUrl || data.signoff.employeeSignatureUrl || "") : "",
      footer: data.employee.name,
      roleLabel: "Karyawan",
      jobTitle: data.employee.jobTitle || "Staff",
      status: employeeStep?.status || (data.signoff.employeeSignedAt ? "approved" : "pending"),
    },
    {
      title: "Leader / PJO Signature",
      signerName: leaderStep?.approverName || "Leader Lapangan / PJO",
      signedAt: isLeaderApproved && leaderStep?.signedAt ? new Date(leaderStep.signedAt) : null,
      signatureUrl: isLeaderApproved ? (leaderStep?.signatureDataUrl || "") : "",
      footer: leaderStep?.approverName || "Leader Lapangan",
      roleLabel: "Leader / PJO",
      jobTitle: "Leader / PJO",
      status: leaderStep?.status || "pending",
    },
    {
      title: "Section Head Signature",
      signerName: sectionHeadStep?.approverName || "Section Head",
      signedAt: isSectionHeadApproved && sectionHeadStep?.signedAt ? new Date(sectionHeadStep.signedAt) : null,
      signatureUrl: isSectionHeadApproved ? (sectionHeadStep?.signatureDataUrl || "") : "",
      footer: sectionHeadStep?.approverName || "Kepala Seksi",
      roleLabel: "Section Head",
      jobTitle: "Section Head",
      status: sectionHeadStep?.status || "pending",
    },
  ];

  const blockWidth = 145;
  const startX = 36;
  const startY = 70;

  for (const [index, block] of blocks.entries()) {
    const x = startX + index * 155;

    // Header label
    page.drawText(block.title, {
      x,
      y: startY + 88,
      size: 7.5,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Signature image or text
    if (block.signatureUrl) {
      const image = await loadPdfImage(pdfDoc, block.signatureUrl);
      if (image) {
        page.drawImage(image, {
          x,
          y: startY + 36,
          width: 80,
          height: 38,
        });
      }
    } else if (block.status === 'approved') {
      page.drawText(block.signerName, {
        x,
        y: startY + 45,
        size: 9,
        font: boldFont,
        color: rgb(0.06, 0.45, 0.35),
      });
    }

    // Underline
    page.drawLine({
      start: { x, y: startY + 30 },
      end: { x: x + blockWidth * 0.8, y: startY + 30 },
      thickness: 0.6,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Name
    page.drawText(block.footer, {
      x,
      y: startY + 18,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Role
    page.drawText(block.jobTitle || block.roleLabel, {
      x,
      y: startY + 8,
      size: 7,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Date
    if (block.signedAt) {
      const dateText = `Waktu TTD: ${block.signedAt.toLocaleDateString("id-ID")}`;
      page.drawText(dateText, {
        x,
        y: startY - 1,
        size: 6.5,
        font: regularFont,
        color: rgb(0.45, 0.45, 0.45),
      });
    }
  }

  // Evidence QR Code in bottom right
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://hero.chitraparatama.co.id';
    const qrDataUrl = await QRCode.toDataURL(`${origin}/activity-evidence/${data.sessionId}`, {
      margin: 1,
      width: 140,
      errorCorrectionLevel: 'M',
    });
    const qrImage = await loadPdfImage(pdfDoc, qrDataUrl);
    if (qrImage) {
      const qrX = 502;
      const qrY = startY + 28;
      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: 48,
        height: 48,
      });
      page.drawText("Scan Bukti Kerja", {
        x: qrX - 5,
        y: qrY - 8,
        size: 6,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      page.drawText("Validasi Digital", {
        x: qrX - 2,
        y: qrY - 15,
        size: 5.5,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  } catch (e) {
    console.error('Failed to draw QR in PDF:', e);
  }
}

async function loadPdfImage(pdfDoc: PDFDocument, imageUrl: string) {
  try {
    if (!imageUrl) return null;

    let bytes: Uint8Array | ArrayBuffer;
    let isPng = true;

    if (imageUrl.startsWith('data:image/')) {
      const parts = imageUrl.split(',');
      const meta = parts[0];
      const base64Data = parts[1];
      if (!base64Data) return null;
      isPng = meta.includes('png');
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        u8[i] = binaryStr.charCodeAt(i);
      }
      bytes = u8;
    } else {
      const readableUrl = await getS3ObjectReadUrl(imageUrl);
      if (!readableUrl) return null;
      const response = await fetch(readableUrl);
      if (!response.ok) return null;
      bytes = await response.arrayBuffer();
      isPng = !imageUrl.endsWith('.jpg') && !imageUrl.endsWith('.jpeg');
    }

    try {
      if (isPng) {
        return await pdfDoc.embedPng(bytes);
      } else {
        return await pdfDoc.embedJpg(bytes);
      }
    } catch {
      try {
        return await pdfDoc.embedPng(bytes);
      } catch {
        return await pdfDoc.embedJpg(bytes);
      }
    }
  } catch (e) {
    console.error('Error embedding image in PDF:', e);
    return null;
  }
}

function splitText(value: string, maxCharsPerLine: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : ["-"];
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }

  return pages;
}

