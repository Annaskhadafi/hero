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
          } as any,
        ];

  const itemsWithPhotos = data.items.filter((item) => Boolean(item.photoUrl));
  const photoPages = chunk(itemsWithPhotos, 4);
  const totalPages = rowPages.length + photoPages.length;

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

    const tableStartY = drawDocumentHeader(page, data, boldFont, regularFont, pageIndex + 1, totalPages);
    const tableEndY = await drawWorkTable(page, pdfDoc, pageRows, tableStartY, boldFont, regularFont);

    if (pageIndex === rowPages.length - 1) {
      drawApprovalStepsTable(page, data, tableEndY, boldFont, regularFont);
      await drawSignatureArea(page, pdfDoc, data, boldFont, regularFont);
    }
  }

  if (itemsWithPhotos.length > 0) {
    await drawEvidencePhotoPages(
      pdfDoc,
      itemsWithPhotos,
      data,
      boldFont,
      regularFont,
      rowPages.length + 1,
      totalPages,
    );
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

  // Optional Row: Catatan Sesi / Notes
  const rawSessionNote = (data.summaryRemark || "")
    .replace(/\s*\|\s*\[Team:\s*[^\]]+\]/gi, "")
    .replace(/\s*\[Team:\s*[^\]]+\]/gi, "")
    .replace(/\s*\|\s*\[Customer:\s*[^\]]+\]/gi, "")
    .replace(/\s*\[Customer:\s*[^\]]+\]/gi, "")
    .trim();

  if (rawSessionNote) {
    page.drawRectangle({
      x: startX,
      y: boxY - rowH,
      width: boxWidth,
      height: rowH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.6,
    });
    page.drawText("Catatan Sesi:", {
      x: startX + 6,
      y: boxY - 11,
      size: 7.5,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    page.drawText(rawSessionNote.slice(0, 95), {
      x: startX + 70,
      y: boxY - 11,
      size: 7.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    boxY -= rowH;
  }

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
    remark?: string | null;
    snapshotLabel?: string | null;
    unitNumber?: string | null;
  }>,
  startY: number,
  boldFont: PDFFont,
  regularFont: PDFFont,
): Promise<number> {
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

  // Columns: # (24), Aktivitas (220), Durasi (60), Poin (45), Catatan (174.28)
  const columns = [
    { title: "#", width: 24, align: "center" as const },
    { title: "Aktivitas", width: 220, align: "left" as const },
    { title: "Durasi", width: 60, align: "center" as const },
    { title: "Poin", width: 45, align: "center" as const },
    { title: "Catatan", width: 174.28, align: "left" as const },
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
    const actLabel = [item.snapshotLabel || item.workSummary || "-", item.unitNumber].filter(Boolean).join(" - ");
    const activityLines = splitText(actLabel, 38);
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

    // Col 2: Durasi
    const durText = item.durationLabel && item.durationLabel !== "-" ? item.durationLabel : `${item.startLabel} - ${item.endLabel}`;
    page.drawText(durText, {
      x: cellX + (columns[2].width - regularFont.widthOfTextAtSize(durText, 7.5)) / 2,
      y: rowTopY - rowHeight / 2 - 3,
      size: 7.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    cellX += columns[2].width;

    // Col 3: Poin
    const pointsText = String(item.actualPoints || 0);
    page.drawText(pointsText, {
      x: cellX + (columns[3].width - boldFont.widthOfTextAtSize(pointsText, 8)) / 2,
      y: rowTopY - rowHeight / 2 - 3,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    cellX += columns[3].width;

    // Col 4: Catatan
    const remarkText = (item.remark?.trim() || (item as any).remarks?.trim() || item.workSummary?.match(/Remark:\s*([^,\-]+)/i)?.[1]?.trim() || "-");
    const remarkLines = splitText(remarkText, 30);
    let remY = rowTopY - 11;
    for (const line of remarkLines.slice(0, 2)) {
      page.drawText(line, {
        x: cellX + 6,
        y: remY,
        size: 7,
        font: regularFont,
        color: rgb(0.25, 0.25, 0.25),
      });
      remY -= 9;
    }

    rowTopY -= rowHeight;
  }

  return rowTopY - 10;
}

function drawApprovalStepsTable(
  page: PDFPage,
  data: NonNullable<Awaited<ReturnType<typeof getDailyActivitySessionDocumentData>>>,
  startY: number,
  boldFont: PDFFont,
  regularFont: PDFFont,
): number {
  const startX = 36;
  const tableWidth = 523.28;
  const headerHeight = 16;
  const approvals = (data.approvals || []).filter(
    (a) => Number(a.stepOrder) <= 2 && a.approverRole !== 'section_head' && a.approverRole !== 'manager'
  );

  page.drawText("B. Approval Steps", {
    x: startX,
    y: startY + 2,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  const currentY = startY - 10;
  const stepCols = [
    { title: "#", width: 24, align: "center" as const },
    { title: "Tahap", width: 115, align: "left" as const },
    { title: "Approver", width: 125, align: "left" as const },
    { title: "Status", width: 75, align: "center" as const },
    { title: "Waktu", width: 80, align: "center" as const },
    { title: "Catatan", width: 104.28, align: "left" as const },
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
  for (const col of stepCols) {
    const textX =
      col.align === "center"
        ? colX + (col.width - boldFont.widthOfTextAtSize(col.title, 7.5)) / 2
        : colX + 5;
    page.drawText(col.title, {
      x: textX,
      y: currentY - 11,
      size: 7.5,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    colX += col.width;
  }

  let rowTopY = currentY - headerHeight;
  const rowHeight = 18;

  for (const [idx, step] of (approvals.length > 0 ? approvals : [
    { stepOrder: 1, stepLabel: 'Karyawan Sign', approverName: data.employee.name, status: 'approved', signedAt: data.signoff.employeeSignedAt, remarks: '-' },
    { stepOrder: 2, stepLabel: 'Leader / PJO', approverName: 'Leader Lapangan', status: 'pending', signedAt: null, remarks: '-' }
  ]).entries()) {
    page.drawRectangle({
      x: startX,
      y: rowTopY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
      color: idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.99, 0.99, 0.99),
    });

    let cellX = startX;
    // #
    const numText = String(step.stepOrder || idx + 1);
    page.drawText(numText, {
      x: cellX + (stepCols[0].width - regularFont.widthOfTextAtSize(numText, 7.5)) / 2,
      y: rowTopY - 12,
      size: 7.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    cellX += stepCols[0].width;

    // Tahap
    page.drawText((step.stepLabel || "-").slice(0, 20), {
      x: cellX + 5,
      y: rowTopY - 12,
      size: 7.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    cellX += stepCols[1].width;

    // Approver
    const appName = (step.approverName || (step.stepOrder === 1 ? data.employee.name : "-")).slice(0, 22);
    page.drawText(appName, {
      x: cellX + 5,
      y: rowTopY - 12,
      size: 7.5,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    cellX += stepCols[2].width;

    // Status
    const isApp = step.status === "approved" || step.status === "signed";
    const stText = isApp ? "Approved" : (step.status || "Pending");
    page.drawText(stText, {
      x: cellX + (stepCols[3].width - (isApp ? boldFont : regularFont).widthOfTextAtSize(stText, 7.5)) / 2,
      y: rowTopY - 12,
      size: 7.5,
      font: isApp ? boldFont : regularFont,
      color: isApp ? rgb(0.06, 0.45, 0.25) : rgb(0.2, 0.2, 0.2),
    });
    cellX += stepCols[3].width;

    // Waktu
    const timeText = step.signedAt
      ? new Date(step.signedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "-";
    page.drawText(timeText, {
      x: cellX + (stepCols[4].width - regularFont.widthOfTextAtSize(timeText, 7)) / 2,
      y: rowTopY - 12,
      size: 7,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    cellX += stepCols[4].width;

    // Catatan
    const remText = (step.remarks || "-").slice(0, 20);
    page.drawText(remText, {
      x: cellX + 5,
      y: rowTopY - 12,
      size: 7,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    rowTopY -= rowHeight;
  }

  return rowTopY - 10;
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
      title: "Customer Signature",
      signerName: "",
      signedAt: null,
      signatureUrl: "",
      footer: "",
      roleLabel: "Customer",
      jobTitle: "Customer",
      status: "pending",
    },
  ];

  const blockWidth = 145;
  const startX = 36;
  const startY = 70;

  // Signatories title
  page.drawText("Signatories", {
    x: startX,
    y: startY + 104,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

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

async function drawEvidencePhotoPages(
  pdfDoc: PDFDocument,
  itemsWithPhotos: Array<{
    id: number;
    sortOrder?: number;
    snapshotLabel?: string;
    workSummary?: string;
    unitNumber?: string | null;
    remark?: string | null;
    durationLabel?: string;
    startLabel?: string;
    endLabel?: string;
    actualPoints?: number;
    photoUrl?: string | null;
  }>,
  data: NonNullable<Awaited<ReturnType<typeof getDailyActivitySessionDocumentData>>>,
  boldFont: PDFFont,
  regularFont: PDFFont,
  startPageNumber: number,
  totalPages: number,
) {
  const photoPages = chunk(itemsWithPhotos, 4);

  for (const [pageIdx, pageItems] of photoPages.entries()) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const currentPageNumber = startPageNumber + pageIdx;
    const startX = 36;
    const boxWidth = 523.28;

    // Header title
    page.drawText("PT. CHITRA PARATAMA", {
      x: (PAGE_WIDTH - boldFont.widthOfTextAtSize("PT. CHITRA PARATAMA", 11)) / 2,
      y: 805,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const headerTitle = "LAMPIRAN BUKTI FOTO PEKERJAAN";
    page.drawText(headerTitle, {
      x: (PAGE_WIDTH - boldFont.widthOfTextAtSize(headerTitle, 12)) / 2,
      y: 790,
      size: 12,
      font: boldFont,
      color: rgb(0, 0.2, 0.38),
    });

    page.drawText(`Halaman ${currentPageNumber}/${totalPages}`, {
      x: 485,
      y: 805,
      size: 7.5,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Sub-header Info Box
    const infoY = 774;
    page.drawRectangle({
      x: startX,
      y: infoY - 18,
      width: boxWidth,
      height: 18,
      color: rgb(0.95, 0.96, 0.98),
      borderColor: rgb(0.7, 0.75, 0.82),
      borderWidth: 0.6,
    });

    const formattedWorkDate = data.workDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const infoText = `Kode Sesi: ${data.sessionCode}  |  Karyawan: ${data.employee.name} (${data.employee.employeeSn || "-"})  |  Tanggal: ${formattedWorkDate}  |  Foto: ${itemsWithPhotos.length} Lampiran`;
    page.drawText(infoText, {
      x: startX + 8,
      y: infoY - 12,
      size: 7.5,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });

    // 2x2 Grid for 4 photos
    const colWidth = 254;
    const cardHeight = 350;
    const gapX = 15;
    const gapY = 15;
    const topGridY = infoY - 26;

    for (const [itemIdx, item] of pageItems.entries()) {
      const colIndex = itemIdx % 2;
      const rowIndex = Math.floor(itemIdx / 2);
      const cardX = startX + colIndex * (colWidth + gapX);
      const cardY = topGridY - rowIndex * (cardHeight + gapY);

      // Card boundary
      page.drawRectangle({
        x: cardX,
        y: cardY - cardHeight,
        width: colWidth,
        height: cardHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.83, 0.88),
        borderWidth: 0.6,
      });

      // Card title bar
      page.drawRectangle({
        x: cardX,
        y: cardY - 22,
        width: colWidth,
        height: 22,
        color: rgb(0.94, 0.96, 0.98),
        borderColor: rgb(0.8, 0.83, 0.88),
        borderWidth: 0.6,
      });

      const itemNumber = pageIdx * 4 + itemIdx + 1;
      const itemTitle = `#${itemNumber} ${item.snapshotLabel || item.workSummary || "Aktivitas"}`;
      page.drawText(itemTitle.slice(0, 42), {
        x: cardX + 6,
        y: cardY - 15,
        size: 8,
        font: boldFont,
        color: rgb(0, 0.2, 0.38),
      });

      // Image Box
      const imgBoxX = cardX + 7;
      const imgBoxY = cardY - 22 - 250;
      const imgBoxW = colWidth - 14;
      const imgBoxH = 245;

      page.drawRectangle({
        x: imgBoxX,
        y: imgBoxY,
        width: imgBoxW,
        height: imgBoxH,
        color: rgb(0.96, 0.97, 0.98),
        borderColor: rgb(0.88, 0.9, 0.93),
        borderWidth: 0.5,
      });

      if (item.photoUrl) {
        const embeddedImg = await loadPdfImage(pdfDoc, item.photoUrl);
        if (embeddedImg) {
          const { width: origW, height: origH } = embeddedImg;
          const scale = Math.min(imgBoxW / origW, imgBoxH / origH);
          const drawW = origW * scale;
          const drawH = origH * scale;
          const drawX = imgBoxX + (imgBoxW - drawW) / 2;
          const drawY = imgBoxY + (imgBoxH - drawH) / 2;

          page.drawImage(embeddedImg, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH,
          });
        } else {
          page.drawText("Foto bukti pekerjaan", {
            x: imgBoxX + 70,
            y: imgBoxY + imgBoxH / 2,
            size: 8,
            font: regularFont,
            color: rgb(0.6, 0.6, 0.6),
          });
        }
      }

      // Metadata footer in card
      let footerY = imgBoxY - 12;
      const unitText = item.unitNumber ? `Unit: ${item.unitNumber}` : null;
      const durText =
        item.durationLabel && item.durationLabel !== "-"
          ? item.durationLabel
          : item.startLabel && item.endLabel
            ? `${item.startLabel} - ${item.endLabel}`
            : null;
      const metaLine = [unitText, durText, item.actualPoints ? `${item.actualPoints} Poin` : null]
        .filter(Boolean)
        .join("  •  ");

      if (metaLine) {
        page.drawText(metaLine, {
          x: cardX + 7,
          y: footerY,
          size: 7.5,
          font: boldFont,
          color: rgb(0.2, 0.25, 0.35),
        });
        footerY -= 12;
      }

      const remark = item.remark || item.workSummary?.match(/Remark:\s*([^,\-]+)/i)?.[1]?.trim();
      if (remark && remark !== "-") {
        const remLines = splitText(`Keterangan: ${remark}`, 48);
        for (const line of remLines.slice(0, 3)) {
          page.drawText(line, {
            x: cardX + 7,
            y: footerY,
            size: 7,
            font: regularFont,
            color: rgb(0.35, 0.35, 0.35),
          });
          footerY -= 9;
        }
      }
    }
  }
}

async function loadPdfImage(pdfDoc: PDFDocument, imageUrl: string) {
  try {
    if (!imageUrl) return null;

    let bytes: Uint8Array | ArrayBuffer | null = null;
    let isPng = true;

    if (imageUrl.startsWith("data:image/")) {
      const parts = imageUrl.split(",");
      const meta = parts[0];
      const base64Data = parts[1];
      if (!base64Data) return null;
      isPng = meta.includes("png");
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        u8[i] = binaryStr.charCodeAt(i);
      }
      bytes = u8;
    } else {
      let targetFetchUrl = imageUrl;
      if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
        const s3ReadUrl = await getS3ObjectReadUrl(imageUrl).catch(() => null);
        if (s3ReadUrl) {
          targetFetchUrl = s3ReadUrl;
        } else if (imageUrl.startsWith("/")) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          targetFetchUrl = `${appUrl}${imageUrl}`;
        }
      } else {
        const s3ReadUrl = await getS3ObjectReadUrl(imageUrl).catch(() => null);
        if (s3ReadUrl) targetFetchUrl = s3ReadUrl;
      }

      const response = await fetch(targetFetchUrl);
      if (!response.ok) return null;
      bytes = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "";
      isPng =
        contentType.includes("png") ||
        (!imageUrl.endsWith(".jpg") && !imageUrl.endsWith(".jpeg") && imageUrl.endsWith(".png"));
    }

    if (!bytes) return null;

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
    console.error("Error embedding image in PDF:", e);
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

