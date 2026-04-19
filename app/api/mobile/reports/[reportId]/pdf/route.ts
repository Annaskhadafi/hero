import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getServerSession } from "@/lib/auth-session";
import { getMobileReports } from "@/lib/mobile-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getServerSession();
  const email = session?.user?.email?.trim();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await getMobileReports(email);
  if (!data) {
    return NextResponse.json({ message: "Report data not found" }, { status: 404 });
  }

  const { reportId } = await params;
  const report = data.reports.find((item) => `${item.id}` === reportId);

  if (!report) {
    return NextResponse.json({ message: "Report not found" }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: 742,
    width: 595,
    height: 100,
    color: rgb(0, 0.2, 0.38),
  });

  page.drawText("HERO Daily Report", {
    x: 40,
    y: 790,
    size: 24,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(data.context.site.customerName, {
    x: 40,
    y: 765,
    size: 11,
    font: regularFont,
    color: rgb(0.82, 0.91, 0.97),
  });

  const formattedDate = report.reportDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const sections = [
    ["Site", data.context.site.name],
    ["Customer", report.customerName],
    ["Report Date", formattedDate],
    ["Status", report.status],
    ["Section Readiness", `${report.readySections}/${report.totalSections}`],
    ["Jobs Completed", `${report.jobsCompleted}`],
    ["Manpower Present", `${report.manpowerPresent}`],
  ] as const;

  let y = 700;
  for (const [label, value] of sections) {
    page.drawText(label, {
      x: 40,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0.26, 0.28, 0.31),
    });
    page.drawText(value, {
      x: 220,
      y,
      size: 10,
      font: regularFont,
      color: rgb(0.03, 0.12, 0.15),
    });
    y -= 24;
  }

  page.drawText("HSE Summary", {
    x: 40,
    y: y - 12,
    size: 12,
    font: boldFont,
    color: rgb(0.35, 0.13, 0),
  });

  const summaryLines = splitText(report.hseSummary, 72);
  let summaryY = y - 38;
  for (const line of summaryLines) {
    page.drawText(line, {
      x: 40,
      y: summaryY,
      size: 10,
      font: regularFont,
      color: rgb(0.03, 0.12, 0.15),
    });
    summaryY -= 16;
  }

  page.drawText("Generated from HERO mobile export.", {
    x: 40,
    y: 40,
    size: 9,
    font: regularFont,
    color: rgb(0.37, 0.46, 0.52),
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hero-report-${report.id}.pdf"`,
    },
  });
}

function splitText(value: string, maxCharsPerLine: number) {
  const words = value.trim().split(/\s+/);
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

  return lines;
}
