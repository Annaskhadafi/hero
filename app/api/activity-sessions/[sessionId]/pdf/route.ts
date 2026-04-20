import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivitySessionDocumentData } from "@/lib/daily-activity-documents";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const ROWS_PER_PAGE = 8;

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

    drawDocumentHeader(page, data, boldFont, regularFont, pageIndex + 1, rowPages.length);
    drawWorkTable(page, pageRows, boldFont, regularFont);

    if (pageIndex === rowPages.length - 1) {
      await drawSignatureArea(page, pdfDoc, data, boldFont, regularFont);
    }
  }

  const pdfBytes = await pdfDoc.save();
  const safeEmployeeName = data.employee.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="spl-user-${safeEmployeeName || "employee"}-${data.sessionId}.pdf"`,
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
) {
  if (!data) {
    return;
  }

  page.drawText("PT. CHITRA PARATAMA", {
    x: 210,
    y: 793,
    size: 12,
    font: boldFont,
    color: rgb(0.22, 0.24, 0.27),
  });
  page.drawText("SURAT PERINTAH LEMBUR", {
    x: 204,
    y: 776,
    size: 14,
    font: boldFont,
    color: rgb(0.08, 0.16, 0.22),
  });
  page.drawText(`SN : ${data.sessionCode}`, {
    x: 470,
    y: 776,
    size: 9,
    font: boldFont,
    color: rgb(0.22, 0.24, 0.27),
  });
  page.drawText(`Page ${pageNumber}/${totalPages}`, {
    x: 500,
    y: 760,
    size: 8,
    font: regularFont,
    color: rgb(0.37, 0.46, 0.52),
  });

  const metaRows = [
    ["Bulan", data.monthLabel],
    ["Nama Karyawan", data.employee.name],
    ["Department", data.employee.department || "-"],
    ["Section / Jabatan", `${data.employee.section || "-"} / ${data.employee.jobTitle || "-"}`],
    ["Site / Customer", `${data.site.name} / ${data.site.customerName}`],
    ["No Kontrak", data.site.contractNumber || "-"],
    ["SPL", data.spl ? `${data.spl.splNumber} - ${data.spl.title}` : "Daily Checklist Session"],
  ] as const;

  let metaY = 736;
  for (const [label, value] of metaRows) {
    page.drawText(`${label}`, {
      x: 42,
      y: metaY,
      size: 9,
      font: boldFont,
      color: rgb(0.25, 0.28, 0.31),
    });
    page.drawText(`: ${value}`, {
      x: 138,
      y: metaY,
      size: 9,
      font: regularFont,
      color: rgb(0.06, 0.11, 0.16),
    });
    metaY -= 14;
  }

  if (data.summaryRemark) {
    page.drawText("Keterangan:", {
      x: 42,
      y: 632,
      size: 9,
      font: boldFont,
      color: rgb(0.25, 0.28, 0.31),
    });

    const summaryLines = splitText(data.summaryRemark, 96).slice(0, 2);
    let summaryY = 619;
    for (const line of summaryLines) {
      page.drawText(line, {
        x: 42,
        y: summaryY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.12, 0.18, 0.23),
      });
      summaryY -= 11;
    }
  }
}

function drawWorkTable(
  page: PDFPage,
  rows: Array<{
    id: number;
    dateLabel: string;
    dayLabel: string;
    startLabel: string;
    endLabel: string;
    durationLabel: string;
    workSummary: string;
    actualPoints: number;
  }>,
  boldFont: PDFFont,
  regularFont: PDFFont,
) {
  const startX = 36;
  const startY = 578;
  const headerHeight = 24;
  const rowHeight = 42;
  const columns = [
    { label: "Tanggal", width: 55 },
    { label: "Hari", width: 55 },
    { label: "Mulai", width: 38 },
    { label: "Selesai", width: 38 },
    { label: "Total", width: 48 },
    { label: "Yang Dikerjakan", width: 235 },
    { label: "Pts", width: 28 },
    { label: "Paraf", width: 44 },
  ];

  let xCursor = startX;
  page.drawRectangle({
    x: startX,
    y: startY,
    width: columns.reduce((total, column) => total + column.width, 0),
    height: headerHeight,
    color: rgb(0.91, 0.96, 0.99),
    borderColor: rgb(0.45, 0.52, 0.58),
    borderWidth: 0.8,
  });

  for (const column of columns) {
    page.drawLine({
      start: { x: xCursor, y: startY },
      end: { x: xCursor, y: startY - headerHeight - rowHeight * rows.length },
      thickness: 0.8,
      color: rgb(0.45, 0.52, 0.58),
    });
    page.drawText(column.label, {
      x: xCursor + 4,
      y: startY + 8,
      size: 7.5,
      font: boldFont,
      color: rgb(0.18, 0.22, 0.25),
    });
    xCursor += column.width;
  }

  page.drawLine({
    start: { x: xCursor, y: startY },
    end: { x: xCursor, y: startY - headerHeight - rowHeight * rows.length },
    thickness: 0.8,
    color: rgb(0.45, 0.52, 0.58),
  });

  let rowTopY = startY - headerHeight;
  for (const row of rows) {
    page.drawRectangle({
      x: startX,
      y: rowTopY - rowHeight,
      width: columns.reduce((total, column) => total + column.width, 0),
      height: rowHeight,
      borderColor: rgb(0.45, 0.52, 0.58),
      borderWidth: 0.5,
      color: rgb(1, 1, 1),
    });

    const workLines = splitText(row.workSummary, 44).slice(0, 3);
    const values = [
      row.dateLabel,
      row.dayLabel,
      row.startLabel,
      row.endLabel,
      row.durationLabel,
      workLines.join("\n"),
      row.actualPoints > 0 ? `${row.actualPoints}` : "-",
      row.id === 0 ? "-" : "",
    ];

    let valueX = startX;
    values.forEach((value, index) => {
      const lines = `${value}`.split("\n");
      let lineY = rowTopY - 12;
      for (const line of lines) {
        page.drawText(line, {
          x: valueX + 4,
          y: lineY,
          size: index === 5 ? 7.6 : 7.8,
          font: regularFont,
          color: rgb(0.08, 0.12, 0.16),
        });
        lineY -= 9;
      }
      valueX += columns[index].width;
    });

    rowTopY -= rowHeight;
  }

  page.drawText("Generated from HERO Daily Activity System.", {
    x: 36,
    y: 58,
    size: 8,
    font: regularFont,
    color: rgb(0.37, 0.46, 0.52),
  });
}

async function drawSignatureArea(
  page: PDFPage,
  pdfDoc: PDFDocument,
  data: NonNullable<Awaited<ReturnType<typeof getDailyActivitySessionDocumentData>>>,
  boldFont: PDFFont,
  regularFont: PDFFont,
) {
  const blocks = [
    {
      title: "TTD Karyawan",
      signerName: data.signoff.employeeSignerName || data.employee.name,
      signedAt: data.signoff.employeeSignedAt,
      signatureUrl: data.signoff.employeeSignatureUrl,
      footer: data.employee.name,
      note: data.employee.jobTitle || "Karyawan",
    },
    {
      title: "TTD Customer",
      signerName: data.signoff.customerSignerName || data.site.customerName,
      signedAt: null,
      signatureUrl: "",
      footer: data.signoff.customerSignerName || "Nama dan tanda tangan",
      note: `${data.site.customerName} - TTD manual saat print`,
    },
    {
      title: "Checklist HR",
      signerName: data.signoff.hrCheckerName || "HR Checker",
      signedAt: data.signoff.hrCheckedAt,
      signatureUrl: data.signoff.hrSignatureUrl,
      footer: data.signoff.hrCheckerName || "Belum diisi",
      note: `Status: ${data.signoff.hrChecklistStatus}${data.signoff.hrChecklistNote ? ` • ${data.signoff.hrChecklistNote}` : ""}`,
    },
  ];

  const blockWidth = 160;
  const blockHeight = 96;
  const startX = 36;
  const startY = 78;

  for (const [index, block] of blocks.entries()) {
    const x = startX + index * 176;
    page.drawRectangle({
      x,
      y: startY,
      width: blockWidth,
      height: blockHeight,
      borderColor: rgb(0.47, 0.53, 0.58),
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });

    page.drawText(block.title, {
      x: x + 10,
      y: startY + blockHeight - 16,
      size: 9,
      font: boldFont,
      color: rgb(0.12, 0.18, 0.23),
    });

    if (block.signatureUrl) {
      const image = await loadSignatureImage(pdfDoc, block.signatureUrl);
      if (image) {
        page.drawImage(image, {
          x: x + 18,
          y: startY + 28,
          width: 92,
          height: 34,
        });
      }
    }

    page.drawLine({
      start: { x: x + 10, y: startY + 24 },
      end: { x: x + blockWidth - 10, y: startY + 24 },
      thickness: 0.7,
      color: rgb(0.47, 0.53, 0.58),
    });

    page.drawText(block.footer, {
      x: x + 10,
      y: startY + 10,
      size: 8.5,
      font: boldFont,
      color: rgb(0.12, 0.18, 0.23),
    });

    const metaLine = block.signedAt
      ? `${block.signerName} • ${block.signedAt.toLocaleDateString("id-ID")}`
      : block.signerName;
    page.drawText(metaLine.slice(0, 34), {
      x: x + 10,
      y: startY + blockHeight - 29,
      size: 7.5,
      font: regularFont,
      color: rgb(0.36, 0.44, 0.49),
    });

    const noteLines = splitText(block.note || "-", 28).slice(0, 2);
    let noteY = startY + 36;
    for (const line of noteLines) {
      page.drawText(line, {
        x: x + 10,
        y: noteY,
        size: 7,
        font: regularFont,
        color: rgb(0.36, 0.44, 0.49),
      });
      noteY -= 8;
    }
  }
}

async function loadSignatureImage(pdfDoc: PDFDocument, imageUrl: string) {
  try {
    const readableUrl = await getS3ObjectReadUrl(imageUrl);
    if (!readableUrl) {
      return null;
    }

    const response = await fetch(readableUrl);
    if (!response.ok) {
      return null;
    }

    const bytes = await response.arrayBuffer();

    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      return await pdfDoc.embedJpg(bytes);
    }
  } catch {
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
