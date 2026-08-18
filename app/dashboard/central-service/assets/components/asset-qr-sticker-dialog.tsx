"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  ExternalLink,
  QrCode,
  Check,
  Loader2,
  FileArchive,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export interface AssetStickerItem {
  id: number;
  workSection?: string;
  section?: string;
  location?: string;
  description: string;
  assetNumber: string | null;
  serialNumber: string | null;
}

interface AssetQrStickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: AssetStickerItem[];
}

/**
 * Generates transparent PNG of 2x4 cm sticker (800x400 px, 2:1 ratio, high resolution for Zebra thermal printer)
 */
async function generateStickerPng(
  asset: AssetStickerItem,
  origin: string
): Promise<{ blob: Blob; dataUrl: string; fileName: string }> {
  const width = 800;
  const height = 400;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context");

  // Keep background transparent (no background color drawn)
  ctx.clearRect(0, 0, width, height);

  // Generate QR Code with transparent background
  const publicUrl = `${origin}/public/assets/${asset.id}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    margin: 0,
    width: 360,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#00000000", // Transparent background
    },
  });

  const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  // Draw Big QR Code on the left with 0 margin (fills full 400x400 box)
  ctx.drawImage(qrImg, 0, 0, 400, 400);

  // Right side text coordinate (starts right next to QR code, margin 0 on right)
  const leftTextX = 410;
  const maxTextWidth = width - leftTextX; // 390px (stretches to edge)

  // 1. PT CHITRA PARATAMA (Top margin 0)
  ctx.fillStyle = "#000000";
  ctx.font = "900 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("PT CHITRA PARATAMA", leftTextX, 36);

  // Divider Line
  ctx.beginPath();
  ctx.moveTo(leftTextX, 48);
  ctx.lineTo(width, 48);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000000";
  ctx.stroke();

  // 2. Asset Number
  ctx.font = "bold 60px 'Geist Mono', monospace, sans-serif";
  const assetNo = asset.assetNumber ? asset.assetNumber : `ID #${asset.id}`;
  ctx.fillText(assetNo, leftTextX, 118);

  // 3. Asset Description (Auto wrap across lines without clipping)
  ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const desc = asset.description || "-";
  const words = desc.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxTextWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  let descY = 175;
  const maxDescLines = 3;
  for (let i = 0; i < Math.min(lines.length, maxDescLines); i++) {
    ctx.fillText(lines[i], leftTextX, descY);
    descY += 44;
  }

  // 4. Metadata: SN / Location (Bottom margin 0)
  ctx.font = "bold 34px 'Geist Mono', monospace, sans-serif";
  ctx.fillStyle = "#000000";
  const metaText = asset.serialNumber ? `SN: ${asset.serialNumber}` : (asset.location ? `Loc: ${asset.location}` : "");
  if (metaText) {
    ctx.fillText(metaText, leftTextX, 388);
  }

  const cleanNo = (asset.assetNumber || `ID_${asset.id}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Stiker_Zebra_${cleanNo}.png`;

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });
  const dataUrl = canvas.toDataURL("image/png");

  return { blob, dataUrl, fileName };
}

/**
 * In-memory ZIP archive generator (Zero external dependency, standard PKZIP)
 */
function createZipBlob(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const fileEntries: Uint8Array[] = [];
  const centralDirectoryEntries: Uint8Array[] = [];
  let offset = 0;

  // Pre-calculated CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[i] = c;
  }

  function crc32(buf: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lhView = new DataView(localHeader.buffer);
    lhView.setUint32(0, 0x04034b50, true);
    lhView.setUint16(4, 20, true);
    lhView.setUint16(6, 0, true);
    lhView.setUint16(8, 0, true); // stored (no compression)
    lhView.setUint16(10, 0, true);
    lhView.setUint16(12, 0, true);
    lhView.setUint32(14, crc, true);
    lhView.setUint32(18, size, true);
    lhView.setUint32(22, size, true);
    lhView.setUint16(26, nameBytes.length, true);
    lhView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    fileEntries.push(localHeader);
    fileEntries.push(file.data);

    // Central directory header (46 bytes + name length)
    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(8, 0, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    cdView.setUint32(16, crc, true);
    cdView.setUint32(20, size, true);
    cdView.setUint32(24, size, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true);
    cdView.setUint32(42, offset, true);
    cdHeader.set(nameBytes, 46);

    centralDirectoryEntries.push(cdHeader);
    offset += localHeader.length + file.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cdh of centralDirectoryEntries) {
    cdSize += cdh.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdOffset, true);
  eocdView.setUint16(20, 0, true);

  return new Blob([...fileEntries, ...centralDirectoryEntries, eocd], {
    type: "application/zip",
  });
}

export function AssetQrStickerDialog({
  open,
  onOpenChange,
  assets,
}: AssetQrStickerDialogProps) {
  const [renderedMap, setRenderedMap] = useState<
    Record<number, { blob: Blob; dataUrl: string; fileName: string }>
  >({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Generate transparent PNGs for all assets
  useEffect(() => {
    if (!open || assets.length === 0) return;

    let isMounted = true;
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    async function renderAll() {
      setIsGenerating(true);
      const results: Record<number, { blob: Blob; dataUrl: string; fileName: string }> = {};

      for (const asset of assets) {
        try {
          const res = await generateStickerPng(asset, origin);
          results[asset.id] = res;
        } catch (err) {
          console.error(`Failed to generate transparent PNG for #${asset.id}`, err);
        }
      }

      if (isMounted) {
        setRenderedMap(results);
        setIsGenerating(false);
      }
    }

    renderAll();

    return () => {
      isMounted = false;
    };
  }, [open, assets]);

  const handleDownloadSingle = (asset: AssetStickerItem) => {
    const item = renderedMap[asset.id];
    if (!item) return;

    const link = document.createElement("a");
    link.download = item.fileName;
    link.href = item.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Stiker PNG ${asset.assetNumber || asset.description} berhasil didownload`);
  };

  const handleBulkExportZip = async () => {
    if (assets.length === 0) return;
    setIsExportingZip(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const zipFiles: Array<{ name: string; data: Uint8Array }> = [];

      for (const asset of assets) {
        let item = renderedMap[asset.id];
        if (!item) {
          item = await generateStickerPng(asset, origin);
        }
        const arrayBuffer = await item.blob.arrayBuffer();
        zipFiles.push({
          name: item.fileName,
          data: new Uint8Array(arrayBuffer),
        });
      }

      const zipBlob = createZipBlob(zipFiles);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.download = `Stiker_QR_Zebra_Bulk_${assets.length}_Aset.zip`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Berhasil mengunduh ${assets.length} stiker PNG dalam file ZIP!`);
    } catch (err) {
      console.error("Failed to export bulk ZIP:", err);
      toast.error("Gagal membuat file ZIP");
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyLink = async (asset: AssetStickerItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/public/assets/${asset.id}`;
    await navigator.clipboard.writeText(publicUrl);
    setCopiedId(asset.id);
    toast.success(`Link publik aset disalin!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <QrCode className="h-5 w-5 text-blue-600" />
                Export Stiker PNG (Zebra Thermal Printer)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Stiker label 2x4 cm (rasio 2:1, resolusi tinggi) dengan <strong>background transparan</strong> untuk software Zebra.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkExportZip}
                disabled={isGenerating || isExportingZip || assets.length === 0}
                size="sm"
                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm"
              >
                {isExportingZip ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Membuat ZIP ({assets.length})...
                  </>
                ) : (
                  <>
                    <FileArchive className="h-3.5 w-3.5" />
                    Download Bulk PNG (ZIP {assets.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body Preview with Checkerboard Background for Transparency Clarity */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/60 dark:bg-slate-900/60">
          <div className="mx-auto max-w-3xl">
            {/* Notice */}
            <div className="mb-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>
                Total <strong>{assets.length}</strong> stiker transparan siap di-export:
              </span>
              <span className="text-[11px] bg-slate-300/70 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                PNG Transparan • 2×4 cm (800×400 px)
              </span>
            </div>

            {/* Grid of Transparent Sticker Cards */}
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {assets.map((asset) => {
                const item = renderedMap[asset.id];
                return (
                  <div
                    key={asset.id}
                    className="group relative flex flex-col rounded-xl border border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 p-2.5 shadow-sm hover:shadow-md transition"
                    style={{
                      width: "220px",
                    }}
                  >
                    {/* Image Preview with checkered background to highlight transparency */}
                    <div
                      className="relative flex h-[100px] w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-1 overflow-hidden"
                      style={{
                        backgroundImage: `
                          linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
                          linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
                          linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
                          linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)
                        `,
                        backgroundSize: "12px 12px",
                        backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                      }}
                    >
                      {item ? (
                        <img
                          src={item.dataUrl}
                          alt={asset.description}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering...
                        </div>
                      )}
                    </div>

                    {/* Metadata & Quick Action */}
                    <div className="mt-2 flex items-center justify-between gap-1 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-xs text-slate-900 dark:text-slate-100">
                          {asset.assetNumber || `ID #${asset.id}`}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{asset.description}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        title="Download PNG Transparan"
                        onClick={() => handleDownloadSingle(asset)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Quick Hover Actions Overlay */}
                    <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-slate-950/75 rounded-xl backdrop-blur-[2px] text-white p-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                        onClick={() => handleDownloadSingle(asset)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download PNG
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-white border-white/40 bg-white/10 hover:bg-white/20"
                        title="Salin Link Publik"
                        onClick={() => handleCopyLink(asset)}
                      >
                        {copiedId === asset.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        asChild
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-white border-white/40 bg-white/10 hover:bg-white/20"
                        title="Buka Halaman Publik"
                      >
                        <a
                          href={`/public/assets/${asset.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Format PNG Transparan siap diimpor ke Zebra Designer / Thermal Printer
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Ukuran teks PT Chitra Paratama proporsional</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
