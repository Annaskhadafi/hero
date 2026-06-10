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

export async function generateOfferingLetterPdf(data: {
  letterNumber: string;
  candidateName: string;
  position: string;
  directSupervisor: string;
  salary: string;
  contractDurationMonths: number;
  startDate: string;
  outpatientBenefit: string;
  inpatientBenefit: string;
  maternityBenefit: string;
  accidentInsurance: string;
  bpjsEmployment: string;
  bpjsHealth: string;
  thr: string;
  otherTerms: string;
  signatoryName: string;
  signatoryTitle: string;
  signatureUrl?: string;
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
    page.drawImage(letterheadImg, { x: 0, y: 0, width, height });
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed signature
  let signatureImg: any = null;
  if (data.signatureUrl) {
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
      if (bytes) {
        signatureImg = data.signatureUrl.toLowerCase().includes(".jpg") || data.signatureUrl.toLowerCase().includes("jpeg")
          ? await pdfDoc.embedJpg(bytes)
          : await pdfDoc.embedPng(bytes);
      }
    } catch (e) {
      console.warn("Failed to embed offering signature", e);
    }
  }

  const left = mmToPt(22);
  const right = width - mmToPt(22);
  const contentWidth = right - left;
  const size = 8;
  const lineH = 14;
  let y = height - mmToPt(45);

  // Letter number
  page.drawText(`No. ${data.letterNumber}`, { x: left, y, size, font: fontBold });
  y -= lineH * 2;

  // Kepada Yth
  page.drawText("Kepada Yth.", { x: left, y, size, font: fontRegular });
  y -= lineH;
  page.drawText(data.candidateName, { x: left, y, size, font: fontBold });
  y -= lineH;
  page.drawText("Di Tempat", { x: left, y, size, font: fontRegular });
  y -= lineH;

  // Perihal
  page.drawText("Perihal : Penawaran Kerja", { x: left, y, size, font: fontBold });
  y -= lineH * 1.5;

  // Opening
  y = drawWrapped(page, "Dengan hormat,", left, y, contentWidth, fontRegular, size, lineH);
  y -= lineH;
  y = drawWrapped(page, "Bersama ini kami sampaikan penawaran kerja untuk saudara sebagai berikut :", left, y, contentWidth, fontRegular, size, lineH);
  y -= lineH;

  // Terms table
  const terms: [string, string][] = [
    ["Jabatan/Level/POH", data.position],
    ["Atasan langsung", data.directSupervisor],
    ["Gaji Pokok", data.salary],
    ["Masa kontrak", `${data.contractDurationMonths} (dua belas) bulan`],
    ["Biaya Rawat Jalan", data.outpatientBenefit],
    ["Biaya Rawat Inap", data.inpatientBenefit],
    ["Biaya Melahirkan", data.maternityBenefit],
    ["Asuransi Kecelakaan", data.accidentInsurance],
    ["BPJS Ketenagakerjaan", data.bpjsEmployment],
    ["BPJS Kesehatan", data.bpjsHealth],
    ["THR", data.thr],
    ["Ketentuan-ketentuan lain", data.otherTerms],
  ];

  for (let i = 0; i < terms.length; i++) {
    const [label, value] = terms[i];
    const num = `${i + 1}.`;
    const numX = left;
    const labelX = left + 20;
    const colonX = left + 160;
    const valueX = left + 170;

    page.drawText(num, { x: numX, y, size, font: fontBold });
    page.drawText(label, { x: labelX, y, size, font: fontBold });
    page.drawText(":", { x: colonX, y, size, font: fontRegular });
    y = drawWrapped(page, value, valueX, y, contentWidth - 170, fontRegular, size, lineH);
    y -= lineH / 2;
  }

  // Closing
  const startDateStr = data.startDate || "___";
  const closingText = `Bila saudara menyepakati penawaran tersebut diatas dan juga hasil medical check-up yang memenuhi syarat maka perusahaan akan menyiapkan perjanjian kerja untuk ditandatangani kedua pihak dan mulai bekerja tanggal ${startDateStr}`;
  y = drawWrapped(page, closingText, left, y, contentWidth, fontRegular, size, lineH);
  y -= lineH;
  y = drawWrapped(page, "Demikianlah surat penawaran kami, atas perhatian Saudara kami ucapkan terima kasih.", left, y, contentWidth, fontRegular, size, lineH);
  y -= lineH * 2;

  // Signature block (left: date + signatory, right: candidate acceptance)
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const sigBlockY = y;
  const signerX = right - 160;

  // Left side: date + signatory
  page.drawText(`Balikpapan, ${today}`, { x: left, y, size, font: fontRegular });
  y -= lineH;

  if (signatureImg) {
    const sigW = 100;
    const sigH = 36;
    page.drawImage(signatureImg, { x: left, y: y - sigH + 4, width: sigW, height: sigH });
    y -= sigH + 4;
  } else {
    y -= lineH * 2;
  }

  page.drawText(data.signatoryName, { x: left, y, size, font: fontBold });
  y -= lineH;
  page.drawText(data.signatoryTitle, { x: left, y, size, font: fontRegular });

  // Right side: candidate acceptance
  y = sigBlockY;
  page.drawText("Menerima/Menyetujui,", { x: signerX, y, size, font: fontRegular });
  y -= lineH * 2;

  page.drawText(data.candidateName, { x: signerX, y, size, font: fontRegular });
  y -= lineH;
  page.drawText("Calon Karyawan", { x: signerX, y, size, font: fontBold });

  // Footer
  const footerY = mmToPt(25);
  page.drawText("PT Chitra Paratama", { x: left, y: footerY, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  page.drawText("Jl. AMD RT. 46 No. 6 Kelurahan Graha Indah Balikpapan Utara 76126", { x: left, y: footerY - 10, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  page.drawText("P +62 542 7908100 | www.chitraparatama.co.id", { x: left, y: footerY - 20, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

  return pdfDoc.save();
}
