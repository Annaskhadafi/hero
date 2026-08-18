"use client";

import { useState } from "react";
import Link from "next/link";
import { format, differenceInMonths, isAfter, isBefore, addMonths, startOfDay } from "date-fns";
import {
  Package,
  Calendar,
  MapPin,
  Tag,
  Hash,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  History,
  Printer,
  Share2,
  Building2,
  Layers,
  FileCheck2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AssetAttachment {
  id?: number;
  fileName: string;
  fileUrl: string;
  previewUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

interface AssetHistory {
  id: number;
  action: string;
  fieldName: string;
  fieldLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changeRemark: string | null;
  createdAt: Date | string;
}

interface PublicAsset {
  id: number;
  workSection: string;
  section: string;
  location: string;
  description: string;
  assetNumber: string | null;
  serialNumber: string | null;
  purchaseDate: Date | string | null;
  deliveryToSiteDate: Date | string | null;
  lastCalibrationDate: Date | string | null;
  calibrationCycleMonths: number | null;
  calibrationDueDate: Date | string | null;
  certificateDate: Date | string | null;
  certificateCycleMonths: number | null;
  certificateDueDate: Date | string | null;
  condition: string;
  qty: number;
  remarks: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments: AssetAttachment[];
  histories: AssetHistory[];
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd MMMM yyyy");
  } catch {
    return "-";
  }
}

function calcAge(purchaseDate: Date | string | null) {
  if (!purchaseDate) return "-";
  const months = differenceInMonths(new Date(), new Date(purchaseDate));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} Bulan`;
  if (rem === 0) return `${years} Tahun`;
  return `${years} Tahun ${rem} Bulan`;
}

function conditionBadge(condition: string) {
  const c = condition?.toUpperCase();
  if (c === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 className="h-3.5 w-3.5" />
        ACTIVE / BAIK
      </span>
    );
  if (c === "REPAIR")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
        <CheckCircle2 className="h-3.5 w-3.5" />
        REPAIR / PERBAIKAN
      </span>
    );
  if (c === "BAD")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-500/30">
        <AlertTriangle className="h-3.5 w-3.5" />
        BAD / RUSAK
      </span>
    );
  if (c === "SCRAP")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-500/30">
        <XCircle className="h-3.5 w-3.5" />
        SCRAP / AFKIR
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 border">
      {condition || "-"}
    </span>
  );
}

function dueStatusInfo(dueDate: Date | string | null | undefined) {
  if (!dueDate) return { label: "Tidak Ada Jadwal", status: "none", color: "text-slate-500 bg-slate-100 border-slate-200" };
  const d = startOfDay(new Date(dueDate));
  if (isNaN(d.getTime())) return { label: "Invalid Date", status: "none", color: "text-slate-500 bg-slate-100 border-slate-200" };
  const today = startOfDay(new Date());
  const oneMonthFromNow = addMonths(today, 1);

  if (isBefore(d, today)) {
    return {
      label: "Sudah Jatuh Tempo (Overdue)",
      status: "overdue",
      color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    };
  }
  if (!isAfter(d, oneMonthFromNow)) {
    return {
      label: "Mendekati Jatuh Tempo (≤ 1 Bulan)",
      status: "near",
      color: "text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    };
  }
  return {
    label: "Masih Berlaku (Valid)",
    status: "ok",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  };
}

function attachmentUrl(attachment: AssetAttachment) {
  const cleanPath = (attachment.fileUrl || "").trim().split("?")[0];
  if (cleanPath.startsWith("/api/uploads/")) return cleanPath;
  const parts = cleanPath.split("/").filter(Boolean);
  const prefixIndex = parts.findIndex((part) =>
    ["upload", "attendance-photos", "curhat", "profile-photos"].includes(decodeURIComponent(part))
  );
  if (prefixIndex >= 0) {
    return `/api/uploads/${parts.slice(prefixIndex).map((part) => encodeURIComponent(decodeURIComponent(part))).join("/")}`;
  }
  return attachment.previewUrl || attachment.fileUrl;
}

function isPdfAttachment(attachment: AssetAttachment) {
  return attachment.mimeType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf");
}

function isImageAttachment(attachment: AssetAttachment) {
  const name = attachment.fileName.toLowerCase();
  return Boolean(
    attachment.mimeType?.startsWith("image/") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".webp") ||
      name.endsWith(".gif")
  );
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function PublicAssetClient({ asset }: { asset: PublicAsset }) {
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState<number>(0);
  const attachments = asset.attachments || [];
  const selectedAttachment = attachments[selectedAttachmentIndex] || null;

  const calibDue = dueStatusInfo(asset.calibrationDueDate);
  const certDue = dueStatusInfo(asset.certificateDueDate);

  const handleShare = async () => {
    const shareData = {
      title: `Aset ${asset.assetNumber || asset.description}`,
      text: `Detail Informasi Aset: ${asset.description} (${asset.assetNumber || "-"}) - PT Chitra Paratama`,
      url: window.location.href,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Ignored
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link halaman publik berhasil disalin ke clipboard!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-3 shadow-sm print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black tracking-wider text-sm shadow-sm">
              HERO
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base leading-tight">
                PT CHITRA PARATAMA
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Central Service Asset Verification Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bagikan</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {/* Verification Banner */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-slate-900/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                Aset Terdaftar Resmi
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{asset.description}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-blue-400" />
                  No. Aset: <strong className="text-white font-mono">{asset.assetNumber || "-"}</strong>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-blue-400" />
                  SN: <strong className="text-white font-mono">{asset.serialNumber || "-"}</strong>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  Lokasi: <strong className="text-white">{asset.location || "-"}</strong>
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 sm:flex-col sm:items-end">
              {conditionBadge(asset.condition)}
              <span className="text-xs text-slate-400 mt-1">
                Qty: <strong className="text-white text-sm">{asset.qty}</strong> Unit
              </span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left 2 Columns: Core Information */}
          <div className="space-y-6 md:col-span-2">
            {/* General Specs Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Building2 className="h-4 w-4 text-blue-600" />
                Informasi & Identitas Aset
              </h3>
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Work Section</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{asset.workSection || "-"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Kategori Alat</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{asset.section || "-"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Nomor Aset</dt>
                  <dd className="mt-1 font-mono font-bold text-blue-600 dark:text-blue-400">{asset.assetNumber || "-"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Serial Number (SN)</dt>
                  <dd className="mt-1 font-mono font-medium text-slate-900 dark:text-slate-100">{asset.serialNumber || "-"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Lokasi Site</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{asset.location || "-"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Kuantitas (Qty)</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{asset.qty} Unit</dd>
                </div>
              </dl>
              {asset.remarks ? (
                <div className="mt-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-3 border border-amber-200/50 dark:border-amber-900/30">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Catatan / Remarks:</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.remarks}</p>
                </div>
              ) : null}
            </div>

            {/* Dates & Timeline Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Calendar className="h-4 w-4 text-indigo-600" />
                Tanggal & Usia Peralatan
              </h3>
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-slate-500">Tanggal Pembelian</p>
                  <p className="mt-1 font-semibold">{fmtDate(asset.purchaseDate)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-slate-500">Umur Alat</p>
                  <p className="mt-1 font-semibold text-indigo-600 dark:text-indigo-400">
                    {calcAge(asset.purchaseDate)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-slate-500">Delivery To Site</p>
                  <p className="mt-1 font-semibold">{fmtDate(asset.deliveryToSiteDate)}</p>
                </div>
              </div>
            </div>

            {/* Calibration & Certificate Status */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                Kalibrasi & Sertifikasi
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Calibration Box */}
                <div className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Status Kalibrasi</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${calibDue.color}`}>
                      {calibDue.label}
                    </span>
                  </div>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Last Calibration:</dt>
                      <dd className="font-medium">{fmtDate(asset.lastCalibrationDate)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Calibration Cycle:</dt>
                      <dd className="font-medium">
                        {asset.calibrationCycleMonths ? `${asset.calibrationCycleMonths} Bulan` : "-"}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t pt-1.5">
                      <dt className="font-semibold text-slate-700 dark:text-slate-300">Calibration Due:</dt>
                      <dd className="font-bold text-slate-900 dark:text-white font-mono">{fmtDate(asset.calibrationDueDate)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Certificate Box */}
                <div className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Status Sertifikat</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${certDue.color}`}>
                      {certDue.label}
                    </span>
                  </div>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Certificate Date:</dt>
                      <dd className="font-medium">{fmtDate(asset.certificateDate)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Certificate Cycle:</dt>
                      <dd className="font-medium">
                        {asset.certificateCycleMonths ? `${asset.certificateCycleMonths} Bulan` : "-"}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t pt-1.5">
                      <dt className="font-semibold text-slate-700 dark:text-slate-300">Certificate Due:</dt>
                      <dd className="font-bold text-slate-900 dark:text-white font-mono">{fmtDate(asset.certificateDueDate)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="mb-4 flex items-center justify-between text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-600" />
                  Dokumen & Lampiran Foto ({attachments.length})
                </span>
              </h3>

              {attachments.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-slate-50 dark:bg-slate-800/40 p-6 text-center text-xs text-slate-500">
                  Tidak ada lampiran dokumen untuk aset ini.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {attachments.map((att, idx) => {
                      const isImg = isImageAttachment(att);
                      const isPdf = isPdfAttachment(att);
                      const Icon = isPdf ? FileText : isImg ? ImageIcon : Paperclip;
                      const active = idx === selectedAttachmentIndex;
                      return (
                        <div
                          key={`${att.fileUrl}-${idx}`}
                          onClick={() => setSelectedAttachmentIndex(idx)}
                          className={`flex items-center justify-between gap-2.5 rounded-lg border p-2.5 cursor-pointer transition ${
                            active
                              ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-600"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{att.fileName}</p>
                              <p className="text-[11px] text-slate-400">{formatFileSize(att.fileSize)}</p>
                            </div>
                          </div>
                          <Button asChild size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                            <a href={attachmentUrl(att)} target="_blank" rel="noreferrer" title="Buka di tab baru">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Attachment Preview Box */}
                  {selectedAttachment ? (
                    <div className="overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-800/50 p-2 min-h-[260px] flex items-center justify-center">
                      {isImageAttachment(selectedAttachment) ? (
                        <img
                          src={attachmentUrl(selectedAttachment)}
                          alt={selectedAttachment.fileName}
                          className="max-h-96 w-full object-contain rounded-lg"
                        />
                      ) : isPdfAttachment(selectedAttachment) ? (
                        <iframe
                          title={selectedAttachment.fileName}
                          src={attachmentUrl(selectedAttachment)}
                          className="h-96 w-full rounded-lg bg-white"
                        />
                      ) : (
                        <div className="py-12 text-center">
                          <Paperclip className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-xs font-semibold mb-3">{selectedAttachment.fileName}</p>
                          <Button asChild size="sm" variant="outline">
                            <a href={attachmentUrl(selectedAttachment)} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Buka File Lampiran
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: QR Info, Company Info & History Log */}
          <div className="space-y-6">
            {/* QR Code Quick Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Validasi Keaslian Aset
              </p>
              <div className="mx-auto mb-3 flex size-36 items-center justify-center rounded-xl border-2 border-slate-900 bg-white p-2 shadow-inner">
                {/* SVG / QR Representation */}
                <div className="flex flex-col items-center justify-center text-slate-800">
                  <ShieldCheck className="h-12 w-12 text-blue-600 mb-1" />
                  <span className="text-[10px] font-bold">HERO VERIFIED</span>
                  <span className="text-[9px] font-mono text-slate-500">ID #{asset.id}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                QR ini resmi diterbitkan oleh PT Chitra Paratama
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5 text-slate-500">
                <p>• <strong>Perusahaan:</strong> PT Chitra Paratama</p>
                <p>• <strong>Sistem:</strong> HERO Asset Central Service</p>
                <p>• <strong>Last Update:</strong> {fmtDate(asset.updatedAt)}</p>
              </div>
            </div>

            {/* History Log */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-slate-600" />
                  Riwayat Mutasi ({asset.histories?.length || 0})
                </span>
              </h3>
              {(!asset.histories || asset.histories.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat perubahan.</p>
              ) : (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {asset.histories.map((h) => (
                    <div key={h.id} className="border-l-2 border-blue-500 pl-3 py-0.5 text-xs space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{fmtDate(h.createdAt)}</span>
                        <span className="font-semibold capitalize text-slate-600 dark:text-slate-300">{h.action}</span>
                      </div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{h.fieldLabel}</p>
                      {h.previousValue !== null && h.newValue !== null ? (
                        <p className="text-[11px] text-slate-500">
                          <span className="line-through text-slate-400">{h.previousValue || "(kosong)"}</span> →{" "}
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{h.newValue || "(kosong)"}</span>
                        </p>
                      ) : null}
                      {h.changeRemark ? (
                        <p className="text-[11px] italic text-slate-400">"{h.changeRemark}"</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} PT Chitra Paratama — Central Service Management System</p>
          <p className="mt-1">Hak Cipta Dilindungi Undang-Undang</p>
        </footer>
      </main>
    </div>
  );
}
