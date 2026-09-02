import { NextResponse } from "next/server";
import { db } from "@/db";
import { sopWinRequests, sopWinDocuments, sopWinRequestApprovals } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts, PDFName } from "pdf-lib";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { getS3ObjectForProxy, isS3UploadConfigured } from "@/lib/s3-storage";

export const runtime = "nodejs";

function formatDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const docIndexStr = searchParams.get("docIndex") || "0";
    const docIndex = parseInt(docIndexStr, 10) || 0;

    if (!token) {
      return NextResponse.json({ message: "Missing token" }, { status: 400 });
    }

    // 1. Fetch Request Details from DB
    const [reqData] = await db
      .select()
      .from(sopWinRequests)
      .where(eq(sopWinRequests.accessToken, token))
      .limit(1);

    if (!reqData) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    const isRevertedOrRejected = ["reverted", "rejected"].includes((reqData.status || "").toLowerCase());
    if (isRevertedOrRejected) {
      return NextResponse.json(
        { message: "PDF tidak tersedia. Dokumen sedang dalam status revisi atau ditolak." },
        { status: 403 }
      );
    }

    // Check expiration
    if (reqData.expiryDays) {
      const createdTime = new Date(reqData.createdAt || Date.now()).getTime();
      const expiresTime = createdTime + reqData.expiryDays * 24 * 60 * 60 * 1000;
      if (Date.now() > expiresTime) {
        return NextResponse.json({ message: "Access expired" }, { status: 403 });
      }
    }

    // Fetch Approval Steps for the Request
    const approvals = await db
      .select()
      .from(sopWinRequestApprovals)
      .where(eq(sopWinRequestApprovals.requestId, reqData.id))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    // 2. Resolve target document title & index
    const rawLines = (reqData.requestedDocTitleAndNumber || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const targetLine = rawLines[docIndex] || rawLines[0] || reqData.procedureName || "Dokumen SOP/WIN";
    const docTitle = targetLine;

    // 3. Check if explicit approval sheet is requested
    const isApprovalSheet = docIndexStr === "approval";

    let pdfDoc: PDFDocument;

    if (isApprovalSheet) {
      pdfDoc = await createApprovalSheetPdf(docTitle, reqData, approvals);
    } else {
      // Resolve PDF Document Source File
      const allDbDocs = await db.select().from(sopWinDocuments);
      const cleanTarget = targetLine.toLowerCase().replace(/[^a-z0-9]/g, "");

      let found = allDbDocs.find((d) => {
        const dbNumClean = (d.documentNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return dbNumClean.length > 3 && cleanTarget.includes(dbNumClean);
      });

      if (!found) {
        const targetTokens = targetLine
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ")
          .split(/\s+/)
          .filter((t) => t.length > 2 && !["pol", "sop", "win", "data", "teknis", "resmi", "dokumen"].includes(t));

        found = allDbDocs.find((d) => {
          const dbNum = (d.documentNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const dbTitle = (d.title || "").toLowerCase();

          if (targetTokens.length > 0) {
            const matchCount = targetTokens.filter((t) => dbTitle.includes(t) || dbNum.includes(t)).length;
            if (matchCount >= 2 || (targetTokens.length === 1 && matchCount === 1)) {
              return true;
            }
          }
          return false;
        });
      }

      let docUrl: string | null = found?.pdfFileUrl || reqData.fileAttachmentUrl || null;
      let pdfBuffer: Buffer | null = null;

      if (docUrl) {
        const cleanPath = docUrl.replace(/^\/api\/uploads\//, "").replace(/^\/uploads\//, "");
        const fileName = cleanPath.split("/").pop() || "";

        const candidatePaths = [
          join(process.cwd(), "public", "uploads", cleanPath),
          join(process.cwd(), "public", "uploads", fileName),
          join(process.cwd(), "public", cleanPath),
          join(process.cwd(), "public", fileName),
        ];

        for (const p of candidatePaths) {
          if (existsSync(p)) {
            try {
              pdfBuffer = readFileSync(p);
              break;
            } catch (e) {
              console.error("[watermarked-pdf] Local read error:", e);
            }
          }
        }

        // Fetch from S3 Object Storage proxy if configured and local file not found
        if (!pdfBuffer && isS3UploadConfigured()) {
          let s3Key = docUrl;
          if (s3Key.includes("is3.cloudhost.id/onechitra/")) {
            s3Key = s3Key.split("is3.cloudhost.id/onechitra/")[1];
          } else if (s3Key.startsWith("/api/uploads/")) {
            s3Key = s3Key.replace(/^\/api\/uploads\//, "");
          } else if (s3Key.startsWith("/uploads/")) {
            s3Key = s3Key.replace(/^\/uploads\//, "");
          }

          const candidateKeys = [
            s3Key,
            s3Key.replace(/^upload\//, ""),
            s3Key.replace(/^uploads\//, ""),
            `upload/${fileName}`,
            `uploads/${fileName}`,
            fileName,
          ].filter(Boolean);

          for (const key of candidateKeys) {
            try {
              const object = await getS3ObjectForProxy(key);
              if (object && object.body) {
                pdfBuffer = Buffer.from(object.body);
                break;
              }
            } catch (err) {
              console.warn("[watermarked-pdf] S3 object fetch error for key:", key, err);
            }
          }
        }

        if (!pdfBuffer && docUrl.startsWith("http")) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const fetchRes = await fetch(docUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (fetchRes.ok) {
              const arrBuf = await fetchRes.arrayBuffer();
              pdfBuffer = Buffer.from(arrBuf);
            }
          } catch (e) {
            console.error("[watermarked-pdf] Remote fetch error/timeout:", e);
          }
        }
      }

      if (pdfBuffer) {
        try {
          const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
          pdfDoc = await PDFDocument.create();
          const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
          const targetInstancy = reqData.isExternal
            ? [reqData.externalCompany, reqData.externalName ? `(PIC: ${reqData.externalName})` : null].filter(Boolean).join(" ").trim() || "EKSTERNAL"
            : (reqData.requesterDepartment || reqData.requesterName || "INTERNAL HERO").trim();

          const printTime = formatDateTime(new Date());
          const watermarkText = `ALLOWED TO ${targetInstancy} [${printTime}]`.toUpperCase();
          const copiedPages = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());

          for (const page of copiedPages) {
            pdfDoc.addPage(page);
            // Single Physical Watermark at Bottom-Left Corner of EVERY Page (Red, Courier New, Regular, Uppercase)
            page.drawText(watermarkText, {
              x: 25,
              y: 22,
              size: 9,
              font: fontCourier,
              color: rgb(0.88, 0.12, 0.12),
              opacity: 0.9,
            });
          }
        } catch (e) {
          console.warn("[watermarked-pdf] Copy & watermark error, serving raw pdfBuffer:", e);
          return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="preview_${docTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
            },
          });
        }
      } else {
        pdfDoc = await createProcedureDocumentPdf(docTitle, reqData);
      }
    }

    const watermarkedBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(watermarkedBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="preview_${docTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[watermarked-pdf] Unexpected error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate watermarked PDF" }, { status: 500 });
  }
}

async function createApprovalSheetPdf(
  title: string,
  reqData: any,
  approvals: any[]
): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 Size (595.28 x 841.89)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.0, 0.2, 0.38); // #003461
  const darkColor = rgb(0.06, 0.09, 0.16);
  const grayColor = rgb(0.35, 0.4, 0.45);
  const lightBgColor = rgb(0.94, 0.96, 0.98);
  const borderColor = rgb(0.75, 0.8, 0.85);

  let y = 800;

  // 1. Header Title
  page.drawText("PT. CHITRA PARATAMA", {
    x: 40,
    y,
    size: 13,
    font: fontBold,
    color: primaryColor,
  });

  y -= 18;
  page.drawText("PERMOHONAN AKSES DOKUMEN SOP / WIN / POL", {
    x: 40,
    y,
    size: 14,
    font: fontBold,
    color: darkColor,
  });

  y -= 10;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1.5,
    color: primaryColor,
  });

  // 2. Section 1 Box: INFORMASI PEMOHON DOKUMEN
  y -= 22;
  page.drawRectangle({
    x: 40,
    y: y - 14,
    width: 515,
    height: 18,
    color: lightBgColor,
    borderColor,
    borderWidth: 0.5,
  });

  page.drawText(`1. INFORMASI PEMOHON DOKUMEN (${reqData.isExternal ? "PIHAK EKSTERNAL" : "PIHAK INTERNAL"})`, {
    x: 46,
    y: y - 10,
    size: 9,
    font: fontBold,
    color: darkColor,
  });

  y -= 30;

  const infoRows = [
    [
      `Nama Pemohon: ${reqData.requesterName || "—"}`,
      `No. Registrasi: ${reqData.requestNumber || "—"}`,
    ],
    [
      `Departemen / Section: ${reqData.requesterDepartment || "—"}`,
      `Tanggal Pengajuan: ${formatDateTime(reqData.requestDate || reqData.createdAt)}`,
    ],
    [
      `Prosedur Yang Diminta: ${reqData.procedureName || "—"}`,
      `Masa Berlaku Akses: ${reqData.expiryDays || 3} Hari Kerja`,
    ],
    [
      `Jenis Dokumen: [${reqData.requestedDocType || "SOP"}]`,
      `Jenis Akses: ${
        reqData.requestType === "softcopy"
          ? "Soft Copy (PDF Watermark)"
          : "Hard Copy (Cetak Fisik)"
      }`,
    ],
  ];

  if (reqData.isExternal) {
    infoRows.push([
      `Instansi / Perusahaan: ${reqData.externalCompany || "—"}`,
      `Nama Contact Person: ${reqData.externalName || "—"}`,
    ]);
  }

  for (const row of infoRows) {
    page.drawText(row[0], {
      x: 46,
      y,
      size: 8.5,
      font: fontRegular,
      color: darkColor,
    });
    page.drawText(row[1], {
      x: 300,
      y,
      size: 8.5,
      font: fontRegular,
      color: darkColor,
    });
    y -= 16;
  }

  // 3. Section 2 Box: RINCIAN DOKUMEN DAN CATATAN APPROVAL
  y -= 10;
  page.drawRectangle({
    x: 40,
    y: y - 14,
    width: 515,
    height: 18,
    color: lightBgColor,
    borderColor,
    borderWidth: 0.5,
  });

  page.drawText("2. RINCIAN DOKUMEN DAN CATATAN APPROVAL", {
    x: 46,
    y: y - 10,
    size: 9,
    font: fontBold,
    color: darkColor,
  });

  y -= 28;

  page.drawText("Judul & Nomor Prosedur / Dokumen:", {
    x: 46,
    y,
    size: 8.5,
    font: fontBold,
    color: darkColor,
  });

  y -= 14;

  const docTitles = (reqData.requestedDocTitleAndNumber || title || "—")
    .split("\n")
    .map((l: string) => l.trim())
    .filter(Boolean);

  for (const docLine of docTitles) {
    page.drawText(docLine.slice(0, 85), {
      x: 52,
      y,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    y -= 14;
  }

  if (reqData.requestReason) {
    y -= 4;
    page.drawText(`Alasan Permintaan: "${reqData.requestReason.slice(0, 90)}"`, {
      x: 46,
      y,
      size: 8,
      font: fontOblique,
      color: grayColor,
    });
    y -= 16;
  }

  // 4. Embedded Catatan Approval Table
  y -= 10;
  page.drawText("Catatan Approval:", {
    x: 46,
    y,
    size: 8.5,
    font: fontBold,
    color: darkColor,
  });

  y -= 16;

  // Table Header
  page.drawRectangle({
    x: 40,
    y: y - 12,
    width: 515,
    height: 16,
    color: lightBgColor,
    borderColor,
    borderWidth: 0.5,
  });

  page.drawText("#", { x: 46, y: y - 8, size: 8, font: fontBold, color: darkColor });
  page.drawText("Tahap / Role", { x: 75, y: y - 8, size: 8, font: fontBold, color: darkColor });
  page.drawText("Nama Approver", { x: 220, y: y - 8, size: 8, font: fontBold, color: darkColor });
  page.drawText("Status", { x: 370, y: y - 8, size: 8, font: fontBold, color: darkColor });
  page.drawText("Waktu", { x: 460, y: y - 8, size: 8, font: fontBold, color: darkColor });

  y -= 18;

  for (const app of approvals) {
    page.drawText(String(app.stepOrder), { x: 46, y, size: 8, font: fontRegular, color: darkColor });
    page.drawText((app.stepLabel || `Step ${app.stepOrder}`).slice(0, 26), {
      x: 75,
      y,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    page.drawText((app.approverName || "—").slice(0, 26), {
      x: 220,
      y,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });

    const isApp = app.status === "approved";
    page.drawText(isApp ? "APPROVED" : (app.status || "PENDING").toUpperCase(), {
      x: 370,
      y,
      size: 8,
      font: fontBold,
      color: isApp ? rgb(0.05, 0.55, 0.25) : rgb(0.75, 0.45, 0.05),
    });

    const dateStr = formatDateTime(app.signedAt || app.updatedAt);
    page.drawText(dateStr, { x: 460, y, size: 8, font: fontRegular, color: grayColor });

    y -= 16;
  }

  // 5. Signatories Box Grid
  y -= 15;
  page.drawText("SIGNATORIES / PENANDATANGAN", {
    x: 46,
    y,
    size: 9,
    font: fontBold,
    color: darkColor,
  });

  y -= 20;

  const colWidth = Math.floor(515 / Math.max(approvals.length, 1));

  for (let i = 0; i < approvals.length; i++) {
    const app = approvals[i];
    const colX = 40 + i * colWidth + 10;

    page.drawText((app.stepLabel || `Step ${app.stepOrder}`).slice(0, 20), {
      x: colX,
      y,
      size: 7.5,
      font: fontRegular,
      color: grayColor,
    });

    let sigEmbedDone = false;
    const isStepApproved = app.status === "approved" || Boolean(app.signedAt);
    let sigDataUrl = isStepApproved ? app.signatureDataUrl : null;

    if (sigDataUrl && sigDataUrl.startsWith("data:image/")) {
      try {
        const base64Data = sigDataUrl.split(",")[1];
        if (base64Data) {
          const imageBytes = Buffer.from(base64Data, "base64");
          const img = sigDataUrl.includes("image/png")
            ? await doc.embedPng(imageBytes)
            : await doc.embedJpg(imageBytes);
          page.drawImage(img, {
            x: colX,
            y: y - 35,
            width: 70,
            height: 28,
          });
          sigEmbedDone = true;
        }
      } catch (err) {
        console.error("Signature embed error:", err);
      }
    } else if (sigDataUrl && sigDataUrl.startsWith("/")) {
      try {
        const localSigPath = join(process.cwd(), "public", sigDataUrl.replace(/^\//, ""));
        if (existsSync(localSigPath)) {
          const imageBytes = readFileSync(localSigPath);
          const img = sigDataUrl.endsWith(".png")
            ? await doc.embedPng(imageBytes)
            : await doc.embedJpg(imageBytes);
          page.drawImage(img, {
            x: colX,
            y: y - 35,
            width: 70,
            height: 28,
          });
          sigEmbedDone = true;
        }
      } catch (err) {
        console.error("Signature local file embed error:", err);
      }
    }

    if (!sigEmbedDone) {
      if (isStepApproved) {
        page.drawText("✓ Disetujui", {
          x: colX,
          y: y - 25,
          size: 9,
          font: fontBold,
          color: rgb(0.05, 0.55, 0.25),
        });
      } else {
        page.drawText("(Belum Disetujui)", {
          x: colX,
          y: y - 25,
          size: 7.5,
          font: fontRegular,
          color: grayColor,
        });
      }
    }

    page.drawText((app.approverName || "—").slice(0, 22), {
      x: colX,
      y: y - 48,
      size: 8,
      font: fontBold,
      color: darkColor,
    });
  }

  return doc;
}

async function createProcedureDocumentPdf(
  title: string,
  reqData: any
): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 Size
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.0, 0.2, 0.38); // #003461
  const darkColor = rgb(0.06, 0.09, 0.16);
  const grayColor = rgb(0.35, 0.4, 0.45);
  const lightBgColor = rgb(0.95, 0.97, 0.99);
  const borderColor = rgb(0.8, 0.85, 0.9);

  let y = 800;

  // 1. Company & Header Bar
  page.drawText("PT. CHITRA PARATAMA", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText("DOCUMENT CONTROL CENTER", {
    x: 390,
    y,
    size: 9,
    font: fontBold,
    color: grayColor,
  });

  y -= 18;
  page.drawText("DOKUMEN PROSEDUR RESMI (CONTROLLED DOCUMENT)", {
    x: 40,
    y,
    size: 13,
    font: fontBold,
    color: darkColor,
  });

  y -= 10;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1.5,
    color: primaryColor,
  });

  // 2. Metadata Box
  y -= 22;
  page.drawRectangle({
    x: 40,
    y: y - 55,
    width: 515,
    height: 65,
    color: lightBgColor,
    borderColor,
    borderWidth: 0.5,
  });

  page.drawText("Judul Dokumen:", { x: 46, y: y - 10, size: 8.5, font: fontBold, color: darkColor });
  page.drawText(title.slice(0, 75), { x: 130, y: y - 10, size: 8.5, font: fontBold, color: primaryColor });

  page.drawText("Jenis Dokumen:", { x: 46, y: y - 26, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`[${reqData.requestedDocType || "SOP/WIN"}] ${reqData.procedureName || title}`, {
    x: 130,
    y: y - 26,
    size: 8.5,
    font: fontRegular,
    color: darkColor,
  });

  page.drawText("Process Owner:", { x: 46, y: y - 42, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`${reqData.requesterDepartment || "Operations & Technical TC"}`, {
    x: 130,
    y: y - 42,
    size: 8.5,
    font: fontRegular,
    color: darkColor,
  });

  page.drawText("Status Akses:", { x: 370, y: y - 42, size: 8.5, font: fontBold, color: darkColor });
  page.drawText("DISERTAKAN (APPROVED)", { x: 440, y: y - 42, size: 8.5, font: fontBold, color: rgb(0.05, 0.55, 0.25) });

  y -= 75;

  // 3. Section 1: TUJUAN & RUANG LINGKUP
  page.drawRectangle({
    x: 40,
    y: y - 14,
    width: 515,
    height: 18,
    color: lightBgColor,
    borderColor,
    borderWidth: 0.5,
  });

  page.drawText("1. TUJUAN DAN RUANG LINGKUP (PURPOSE & SCOPE)", {
    x: 46,
    y: y - 10,
    size: 9,
    font: fontBold,
    color: darkColor,
  });

  y -= 28;
  page.drawText("Tujuan:", { x: 46, y, size: 8.5, font: fontBold, color: darkColor });
  y -= 14;
  page.drawText(
    "Menetapkan panduan teknis dan standar operasional untuk memastikan pelaksanaan pekerjaan berjalan aman,",
    { x: 52, y, size: 8, font: fontRegular, color: darkColor }
  );
  y -= 12;
  page.drawText(
    "efisien, serta memenuhi standar kualitas kerja di seluruh lokasi operasional PT Chitra Paratama.",
    { x: 52, y, size: 8, font: fontRegular, color: darkColor }
  );

  y -= 18;
  page.drawText("Ruang Lingkup:", { x: 46, y, size: 8.5, font: fontBold, color: darkColor });
  y -= 14;
  page.drawText(
    "Prosedur ini berlaku untuk seluruh teknisi, pengawas lapangan, serta Pihak Eksternal/Mitra Kerja yang telah",
    { x: 52, y, size: 8, font: fontRegular, color: darkColor }
  );
  y -= 12;
  page.drawText(
    `mendapatkan izin resmi permohonan akses dokumen (No. Reg: ${reqData.requestNumber || "—"}).`,
    { x: 52, y, size: 8, font: fontRegular, color: darkColor }
  );

  // 4. Section 2: PANDUAN KERJA DAN INSTRUKSI OPERASIONAL
  y -= 22;
  page.drawRectangle({
    x: 40,
    y: y - 14,
    width: 515,
    height: 18,
    color: lightBgColor,
    borderColor,
    borderWidth: 0.5,
  });

  page.drawText("2. PANDUAN KERJA DAN INSTRUKSI OPERASIONAL", {
    x: 46,
    y: y - 10,
    size: 9,
    font: fontBold,
    color: darkColor,
  });

  y -= 28;

  const steps = [
    "1. Persiapan Keselamatan Kerja (HSE & JSA): Wajib menggunakan Alat Pelindung Diri (APD) sesuai standar lokasi.",
    "2. Inspeksi Awal & Verifikasi Spesifikasi: Lakukan pemeriksaan awal kondisi peralatan dan unit kerja.",
    "3. Pelaksanaan Prosedur Utama: Jalankan tahapan teknis sesuai dengan petunjuk resmi manufaktur dan spesifikasi unit.",
    "4. Pengujian & Quality Check: Pastikan hasil pengujian teknis memenuhi kriteria toleransi keselamatan dan operasi.",
    "5. Pelaporan & Pencatatan: Catat seluruh hasil pengukuran dan pemeriksaan pada Log Book / Form Inspeksi.",
  ];

  for (const stepText of steps) {
    page.drawText(stepText, { x: 46, y, size: 8, font: fontRegular, color: darkColor });
    y -= 16;
  }

  // 5. Section 3: KETENTUAN HAK CIPTA & KERAHASIAAN
  y -= 15;
  page.drawRectangle({
    x: 40,
    y: y - 14,
    width: 515,
    height: 18,
    color: lightBgColor,
    borderColor,
    borderWidth: 0.5,
  });

  page.drawText("3. KETENTUAN KERAHASIAAN DOKUMEN (CONFIDENTIALITY NOTICE)", {
    x: 46,
    y: y - 10,
    size: 9,
    font: fontBold,
    color: darkColor,
  });

  y -= 28;
  page.drawText(
    "Dokumen ini bersifat rahasia dan merupakan hak milik PT Chitra Paratama. Dilarang menggandakan, menyebarluaskan,",
    { x: 46, y, size: 8, font: fontOblique, color: grayColor }
  );
  y -= 12;
  page.drawText(
    "atau mengubah isi dokumen tanpa izin tertulis dari Quality Management / Management Representative PT Chitra Paratama.",
    { x: 46, y, size: 8, font: fontOblique, color: grayColor }
  );

  return doc;
}
