"use client";

import type { jsPDFOptions } from "jspdf";

export type PdfOrientation = "portrait" | "landscape";

export type PdfOptions = {
  scale?: number;
  orientation?: PdfOrientation;
  filename?: string;
  marginMm?: number;
};

function triggerBlobDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function crc32(buf: Uint8Array): number {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

export async function generateElementAsPdfBlob(
  element: HTMLElement,
  options: PdfOptions = {}
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  let html2canvas: any;
  try {
    html2canvas = (await import("html2canvas-pro")).default;
  } catch {
    html2canvas = (await import("html2canvas")).default;
  }

  const canvas = await html2canvas(element, {
    scale: options.scale ?? 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const orientation: PdfOrientation =
    options.orientation ??
    (canvas.width > canvas.height * 1.1 ? "landscape" : "portrait");

  const pdfOptions: jsPDFOptions = {
    orientation,
    unit: "mm",
    format: "a4",
  };

  const pdf = new jsPDF(pdfOptions);
  const pageWidth = orientation === "landscape" ? 297 : 210;
  const pageHeight = orientation === "landscape" ? 210 : 297;
  const margin = options.marginMm ?? 5;

  const contentWidth = pageWidth - margin * 2;
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  let heightLeft = contentHeight;
  let position = margin;

  pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight);
  heightLeft -= (pageHeight - margin * 2);

  while (heightLeft > 0) {
    position = margin - (contentHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight);
    heightLeft -= (pageHeight - margin * 2);
  }

  return pdf.output("blob");
}

export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options: PdfOptions = {}
): Promise<void> {
  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const blob = await generateElementAsPdfBlob(element, options);
  triggerBlobDownload(blob, safeName);
}

export async function generateHtmlAsPdfBlob(
  html: string,
  options: PdfOptions = {}
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("generateHtmlAsPdfBlob can only run in a browser environment");
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = options.orientation === "landscape" ? "1122px" : "794px";
  container.style.background = "#ffffff";
  container.style.padding = "16px";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    return await generateElementAsPdfBlob(container, options);
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadHtmlAsPdf(
  html: string,
  filename: string,
  options: PdfOptions = {}
): Promise<void> {
  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const blob = await generateHtmlAsPdfBlob(html, options);
  triggerBlobDownload(blob, safeName);
}

export async function downloadFilesAsZip(
  files: Array<{ name: string; blob: Blob }>,
  zipFilename: string
): Promise<void> {
  const safeZipName = zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`;

  const processedFiles: Array<{ name: string; data: Uint8Array; crc: number }> = [];

  for (const file of files) {
    const arrayBuffer = await file.blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const crc = crc32(data);
    processedFiles.push({ name: file.name, data, crc });
  }

  const fileParts: Uint8Array[] = [];
  const centralDirParts: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (const file of processedFiles) {
    const nameBytes = encoder.encode(file.name);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true); // Version needed to extract (2.0)
    localView.setUint16(6, 0, true); // General purpose bit flag
    localView.setUint16(8, 0, true); // Compression method: Store (0)
    localView.setUint16(10, 0, true); // File last mod time
    localView.setUint16(12, 0, true); // File last mod date
    localView.setUint32(14, file.crc, true); // CRC-32
    localView.setUint32(18, file.data.length, true); // Compressed size
    localView.setUint32(22, file.data.length, true); // Uncompressed size
    localView.setUint16(26, nameBytes.length, true); // File name length
    localView.setUint16(28, 0, true); // Extra field length

    fileParts.push(localHeader, nameBytes, file.data);

    const cdHeader = new Uint8Array(46);
    const cdView = new DataView(cdHeader.buffer);

    cdView.setUint32(0, 0x02014b50, true); // Central directory header signature
    cdView.setUint16(4, 20, true); // Version made by
    cdView.setUint16(6, 20, true); // Version needed to extract
    cdView.setUint16(8, 0, true); // Flags
    cdView.setUint16(10, 0, true); // Compression: Store
    cdView.setUint16(12, 0, true); // Time
    cdView.setUint16(14, 0, true); // Date
    cdView.setUint32(16, file.crc, true); // CRC-32
    cdView.setUint32(20, file.data.length, true); // Compressed size
    cdView.setUint24 ? cdView.setUint32(24, file.data.length, true) : cdView.setUint32(24, file.data.length, true);
    cdView.setUint16(28, nameBytes.length, true); // Name length
    cdView.setUint16(30, 0, true); // Extra length
    cdView.setUint16(32, 0, true); // Comment length
    cdView.setUint16(34, 0, true); // Disk number start
    cdView.setUint16(36, 0, true); // Internal file attributes
    cdView.setUint32(38, 0, true); // External file attributes
    cdView.setUint32(42, offset, true); // Relative offset of local header

    centralDirParts.push(cdHeader, nameBytes);
    offset += 30 + nameBytes.length + file.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const part of centralDirParts) {
    cdSize += part.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk with central directory
  eocdView.setUint16(8, processedFiles.length, true); // Total entries on this disk
  eocdView.setUint16(10, processedFiles.length, true); // Total entries
  eocdView.setUint32(12, cdSize, true); // Size of central directory
  eocdView.setUint32(16, cdOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // ZIP file comment length

  const zipBlob = new Blob([...fileParts, ...centralDirParts, eocd], {
    type: "application/zip",
  });

  triggerBlobDownload(zipBlob, safeZipName);
}
