import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

function mmToPt(mm: number) {
  return mm * 72 / 25.4;
}

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrapped(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  size: number,
  lineHeight: number,
  color = rgb(0, 0, 0)
): number {
  const lines = wrapText(text, maxWidth, font, size);
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawRow(
  page: any,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number,
  gap: number,
  fontBold: any,
  fontRegular: any,
  size: number,
  lineHeight: number
): number {
  page.drawText(`${label}`, { x, y, size, font: fontRegular });
  const colonX = x + labelWidth + 4;
  page.drawText(":", { x: colonX, y, size, font: fontRegular });
  const valX = colonX + gap;
  return drawWrapped(page, value, valX, y, 380, fontRegular, size, lineHeight);
}

export async function generateMcuReferralPdf(data: {
  clinicName: string;
  clinicAddress?: string;
  clinicCity?: string;
  candidateName: string;
  candidatePhone?: string;
  scheduledDate: string;
  packageName: string;
  companyName?: string;
  letterNumber?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  signatureUrl?: string;
  picList?: { name: string; phone: string }[];
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Embed letterhead background
  const letterheadPath = path.join(process.cwd(), "public", "ChitraParatama_Stationery_Letterhead_jkt.jpg");
  let letterheadImg: any = null;
  if (fs.existsSync(letterheadPath)) {
    const imgBytes = fs.readFileSync(letterheadPath);
    letterheadImg = await pdfDoc.embedJpg(imgBytes);
  }

  if (letterheadImg) {
    page.drawImage(letterheadImg, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const embedSignature = async () => {
    if (!data.signatureUrl) return null;
    try {
      let bytes: Buffer | null = null;
      if (data.signatureUrl.startsWith("data:image/")) {
        bytes = Buffer.from(data.signatureUrl.split(",")[1] || "", "base64");
      } else if (data.signatureUrl.startsWith("/")) {
        const filePath = path.join(process.cwd(), "public", data.signatureUrl.replace(/^\//, ""));
        if (fs.existsSync(filePath)) bytes = fs.readFileSync(filePath);
      } else if (data.signatureUrl.startsWith("http")) {
        const response = await fetch(data.signatureUrl);
        if (response.ok) bytes = Buffer.from(await response.arrayBuffer());
      }
      if (!bytes) return null;
      return data.signatureUrl.toLowerCase().includes(".jpg") || data.signatureUrl.toLowerCase().includes("jpeg")
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);
    } catch (error) {
      console.warn("Failed to embed MCU signature", error);
      return null;
    }
  };

  const signatureImg = await embedSignature();

  const left = mmToPt(22);
  const right = width - mmToPt(22);
  const contentWidth = right - left;
  const size = 9.5;
  const lineH = 13;
  let y = height - mmToPt(72);

  // No / Perihal
  y = drawRow(page, "No", data.letterNumber || "", left, y, 30, 10, fontBold, fontRegular, size, lineH);
  y -= 4;
  y = drawRow(page, "Perihal", "Surat Pengantar Medical Check Up Karyawan", left, y, 30, 10, fontBold, fontRegular, size, lineH);
  y -= 12;

  // Kepada
  y = drawWrapped(page, `Kepada Yth.`, left, y, contentWidth, fontRegular, size, lineH);
  page.drawText(data.clinicName, { x: left, y, size, font: fontBold });
  y -= lineH;
  if (data.clinicCity) {
    page.drawText(data.clinicCity, { x: left, y, size, font: fontBold });
    y -= lineH;
  }
  y -= 4;

  // Opening
  y = drawWrapped(page, "Dengan Hormat,", left, y, contentWidth, fontRegular, size, lineH);
  y -= 4;
  y = drawWrapped(page, "Kami memberitahukan bahwa nama dibawah ini adalah karyawan dari kami :", left, y, contentWidth, fontRegular, size, lineH);
  y -= 8;

  // Employee table
  const empRows = [
    ["Nama", data.candidateName],
    ["Telepon", data.candidatePhone || "-"],
    ["Paket MCU", data.packageName],
  ];
  for (const [label, value] of empRows) {
    y = drawRow(page, label, value, left + mmToPt(6), y, 50, 10, fontBold, fontRegular, size, lineH);
    y -= 2;
  }
  y -= 6;

  // Body paragraph
  const bodyText = `Kami mohon bantuannya untuk melakukan Medical Check Up atas nama pasien diatas. Segala biaya yang timbul menjadi tanggungan ${data.companyName || "PT Chitra Paratama (a Member of Mahadasha Group)"} dengan melampirkan Surat Jaminan ini.`;
  y = drawWrapped(page, bodyText, left, y, contentWidth, fontRegular, size, lineH);
  y -= 8;

  // Billing address
  y = drawWrapped(page, "Mohon tagihan dikirimkan kepada:", left, y, contentWidth, fontRegular, size, lineH);
  page.drawText(`${data.companyName || "PT Chitra Paratama (a Member of Mahadasha Group)"}`, { x: left, y, size, font: fontBold });
  y -= lineH;
  page.drawText("Jl AMD RT 46 No 69 Kelurahan Graha Indah, Balikpapan.", { x: left, y, size, font: fontBold });
  y -= lineH;
  page.drawText("Attn : Muhammad Iqbal", { x: left, y, size, font: fontBold });
  y -= lineH + 4;

  // Closing
  y = drawWrapped(page, "Atas kerja sama yang baik kami ucapkan terima kasih.", left, y, contentWidth, fontRegular, size, lineH);
  y -= 14;

  // Signature block
  const sigX = left;
  const dateStr = data.scheduledDate;
  page.drawText(`Balikpapan, ${dateStr}`, { x: sigX, y, size, font: fontRegular });
  y -= 8;
  if (signatureImg) {
    const sigW = 120;
    const sigH = 45;
    page.drawImage(signatureImg, { x: sigX, y: y - sigH + 6, width: sigW, height: sigH });
  }
  y -= 48;
  page.drawText(data.signatoryName || "_________________________", { x: sigX, y, size, font: fontBold });
  y -= lineH;
  page.drawText(data.signatoryTitle || "HR-GA Admin", { x: sigX, y, size, font: fontBold });
  y -= 14;

  // PIC list
  const pics = data.picList || [
    { name: "Muhammad Iqbal", phone: "0812-53369994" },
    { name: "Adila Tri Arizona", phone: "0897-9767997" },
    { name: "Kesuma Bagaskara", phone: "0896-86176545" },
  ];

  page.drawText("PIC", { x: left, y, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(":", { x: left + 20, y, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
  y -= 12;

  for (const pic of pics) {
    page.drawText(`- ${pic.name} : ${pic.phone}`, { x: left + 20, y, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
    y -= 11;
  }

  return pdfDoc.save();
}
