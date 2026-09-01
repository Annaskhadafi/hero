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
    await drawWorkTable(page, pdfDoc, pageRows, boldFont, regularFont);

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
  const docTitle = data.spl ? "SURAT PERINTAH LEMBUR" : "DAILY ACTIVITY REPORT";
  const titleX = data.spl ? 204 : 195;
  page.drawText(docTitle, {
    x: titleX,
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

  const leftFields = [
    { label: "Tanggal", value: data.workDate.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) },
    { label: "Hari / Shift", value: `${data.workDate.toLocaleDateString("id-ID", { weekday: "long" })} / ${data.shiftCode ? `Shift ${data.shiftCode}` : "Daily"}` },
    { label: "Site / Lokasi", value: data.site.name || "-" },
    { label: "Perusahaan", value: data.site.customerName || "PT Chitra Paratama" },
  ];

  const rightFields = [
    { label: "Nama Karyawan", value: data.employee.name || "-" },
    { label: "NRP / SN", value: data.employee.employeeSn || "-" },
    { label: "Departemen", value: data.employee.department || "-" },
    { label: "Jabatan", value: data.employee.jobTitle || "-" },
  ];

  let leftY = 744;
  for (const field of leftFields) {
    page.drawText(`${field.label}:`, {
      x: 36,
      y: leftY,
      size: 8.5,
      font: boldFont,
      color: rgb(0.18, 0.24, 0.29),
    });
    page.drawText(field.value.slice(0, 36), {
      x: 108,
      y: leftY,
      size: 8.5,
      font: regularFont,
      color: rgb(0.08, 0.12, 0.16),
    });
    leftY -= 12;
  }

  let rightY = 744;
  for (const field of rightFields) {
    page.drawText(`${field.label}:`, {
      x: 320,
      y: rightY,
      size: 8.5,
      font: boldFont,
      color: rgb(0.18, 0.24, 0.29),
    });
    page.drawText(field.value.slice(0, 36), {
      x: 396,
      y: rightY,
      size: 8.5,
      font: regularFont,
      color: rgb(0.08, 0.12, 0.16),
    });
    rightY -= 12;
  }
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
  boldFont: PDFFont,
  regularFont: PDFFont,
) {
  const startX = 36;
  const startY = 688;
  const tableWidth = 523.28;
  const headerHeight = 22;

  const columns = [
    { title: "No", width: 24, align: "center" as const },
    { title: "Hari / Tgl", width: 68, align: "center" as const },
    { title: "Jam", width: 64, align: "center" as const },
    { title: "Durasi", width: 42, align: "center" as const },
    { title: "Poin", width: 32, align: "center" as const },
    { title: "Foto", width: 48, align: "center" as const },
    { title: "Uraian Pekerjaan / Unit / Remark", width: 245.28, align: "left" as const },
  ];

  page.drawRectangle({
    x: startX,
    y: startY - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: rgb(0.92, 0.94, 0.96),
    borderColor: rgb(0.47, 0.53, 0.58),
    borderWidth: 0.8,
  });

  let colX = startX;
  for (const col of columns) {
    const textX =
      col.align === "center"
        ? colX + (col.width - boldFont.widthOfTextAtSize(col.title, 8)) / 2
        : colX + 4;

    page.drawText(col.title, {
      x: textX,
      y: startY - 14,
      size: 8,
      font: boldFont,
      color: rgb(0.12, 0.18, 0.23),
    });
    colX += col.width;
  }

  let rowTopY = startY - headerHeight;
  const rowHeight = 44;

  for (const [rowIndex, item] of rows.entries()) {
    page.drawRectangle({
      x: startX,
      y: rowTopY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0.78, 0.82, 0.85),
      borderWidth: 0.5,
      color: rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.99, 1),
    });

    const values = [
      String(rowIndex + 1),
      `${item.dayLabel}\n${item.dateLabel}`,
      `${item.startLabel} -\n${item.endLabel}`,
      item.durationLabel,
      String(item.actualPoints || 0),
      item.photoUrl ? "[Foto]" : "-",
      item.workSummary || "-",
    ];

    let valueX = startX;
    for (const [index, value] of values.entries()) {
      const col = columns[index];
      
      if (index === 5 && item.photoUrl) {
        const photoImg = await loadSignatureImage(pdfDoc, item.photoUrl);
        if (photoImg) {
          page.drawImage(photoImg, {
            x: valueX + 4,
            y: rowTopY - rowHeight + 4,
            width: 40,
            height: 36,
          });
        } else {
          page.drawText("-", {
            x: valueX + 20,
            y: rowTopY - 24,
            size: 7.8,
            font: regularFont,
            color: rgb(0.36, 0.44, 0.49),
          });
        }
      } else {
        const lines = splitText(value, index === 6 ? 48 : 12);
        let lineY = rowTopY - 14;

        for (const line of lines.slice(0, 3)) {
          const textX =
            col.align === "center"
              ? valueX + (col.width - regularFont.widthOfTextAtSize(line, 7.8)) / 2
              : valueX + 4;

          page.drawText(line, {
            x: textX,
            y: lineY,
            size: index === 6 ? 7.6 : 7.8,
            font: regularFont,
            color: rgb(0.08, 0.12, 0.16),
          });
          lineY -= 9;
        }
      }
      valueX += col.width;
    }

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
  const approvals = data.approvals || [];
  const employeeStep = approvals.find((a) => a.stepOrder === 1);
  const leaderStep = approvals.find((a) => a.stepOrder === 2 || a.approverRole === 'leader');
  const sectionHeadStep = approvals.find((a) => a.stepOrder === 3 || a.approverRole === 'section_head' || a.approverRole === 'superior');

  const isEmployeeApproved = employeeStep ? employeeStep.status === 'approved' : Boolean(data.signoff.employeeSignedAt);
  const isLeaderApproved = leaderStep?.status === 'approved';
  const isSectionHeadApproved = sectionHeadStep?.status === 'approved';

  const blocks = [
    {
      title: "1. Employee Signature",
      signerName: employeeStep?.approverName || data.employee.name,
      signedAt: isEmployeeApproved ? (employeeStep?.signedAt ? new Date(employeeStep.signedAt) : data.signoff.employeeSignedAt) : null,
      signatureUrl: isEmployeeApproved ? (employeeStep?.signatureDataUrl || data.signoff.employeeSignatureUrl || "") : "",
      footer: data.employee.name,
      note: data.employee.jobTitle || "Staff",
      status: employeeStep?.status || (data.signoff.employeeSignedAt ? "approved" : "pending"),
    },
    {
      title: "2. Leader / PJO Signature",
      signerName: leaderStep?.approverName || "Leader Lapangan / PJO",
      signedAt: isLeaderApproved && leaderStep?.signedAt ? new Date(leaderStep.signedAt) : null,
      signatureUrl: isLeaderApproved ? (leaderStep?.signatureDataUrl || "") : "",
      footer: leaderStep?.approverName || "Leader Lapangan",
      note: "Leader / PJO",
      status: leaderStep?.status || "pending",
    },
    {
      title: "3. Section Head Signature",
      signerName: sectionHeadStep?.approverName || "Section Head",
      signedAt: isSectionHeadApproved && sectionHeadStep?.signedAt ? new Date(sectionHeadStep.signedAt) : null,
      signatureUrl: isSectionHeadApproved ? (sectionHeadStep?.signatureDataUrl || "") : "",
      footer: sectionHeadStep?.approverName || "Kepala Seksi",
      note: "Section Head",
      status: sectionHeadStep?.status || "pending",
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
      : `${block.signerName} • [${block.status.toUpperCase()}]`;
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
    console.error('Error embedding signature in PDF:', e);
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
