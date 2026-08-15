"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  HeartPulse,
  Stethoscope,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MCU_CATEGORY_LABELS,
  MCU_METRIC_CATEGORIES,
  MCU_METRIC_KEYS,
  MCU_METRIC_LABELS,
} from "@/lib/mcu-wellness-ai";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
import { cn } from "@/lib/utils";

type MobileHcData = {
  context: {
    employee: {
      fitStatus: string;
      name: string;
      email: string;
    };
  };
  wellness: Array<{
    id: number;
    metricType: string;
    metricValue: string;
    status: string;
    notes: string | null;
    recordedAt: Date | string;
  }>;
  mcuHistory: Array<{
    id: number;
    clinicName: string | null;
    paketMcu: string | null;
    mcuDate: Date | string | null;
    resultDate: Date | string | null;
    status: string;
    aiKategori: string | null;
    aiKesimpulan: string | null;
    aiSaran: string | null;
    resultFileUrl: string | null;
    resultFileName: string | null;
    nextMcuDue: Date | string | null;
    metrics: Array<{
      id: number;
      metricKey: string;
      metricValue: string | null;
      metricUnit: string | null;
      category: string;
      flag: string | null;
    }>;
  }>;
};

function formatDate(val: Date | string | null | undefined): string {
  if (!val) return "-";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function McuProgress({ nextDue }: { nextDue: Date | string }) {
  const d = typeof nextDue === "string" ? new Date(nextDue) : nextDue;
  const now = new Date();
  const diffDays = Math.ceil(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let progress = 100;
  let statusText = "Jadwal Aman";
  let statusColor = "bg-emerald-500";

  if (diffDays < 0) {
    progress = 100;
    statusText = `Terlewat ${Math.abs(diffDays)} hari`;
    statusColor = "bg-rose-500";
  } else if (diffDays <= 30) {
    progress = Math.max(10, Math.round(((30 - diffDays) / 30) * 100));
    statusText = `Jatuh tempo dalam ${diffDays} hari`;
    statusColor = "bg-amber-500";
  } else {
    progress = Math.min(100, Math.max(5, Math.round((diffDays / 365) * 100)));
    statusText = `${diffDays} hari lagi`;
    statusColor = "bg-sky-500";
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-[#486275]">
        <span>Status Jatuh Tempo</span>
        <span className="font-bold text-[#082033]">{statusText}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#eaf4fb]">
        <div
          className={cn("h-full transition-all duration-300", statusColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-[#486275]">
        {diffDays < 0
          ? "Jadwal MCU sudah terlewat. Segera lakukan pemeriksaan."
          : diffDays === 0
          ? "MCU jatuh tempo hari ini"
          : "Disarankan untuk melakukan MCU tahunan tepat waktu"}
      </p>
    </div>
  );
}

function McuPdfViewer({
  url,
  fileName,
  open,
  onOpenChange,
}: {
  url: string;
  fileName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const displayName = fileName || "Dokumen MCU";
  const resolvedUrl = resolveUploadUrl(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-black text-[#082033] truncate pr-2">
            {displayName}
          </DialogTitle>
          <div className="flex items-center gap-1.5 pr-6">
            <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs">
              <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5 mr-1" /> Tab Baru
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="relative h-[70vh] bg-[#f5f7fb]">
          <iframe src={resolvedUrl} title={displayName} className="w-full h-full border-0" />
        </div>
        <div className="flex items-center justify-end gap-2 p-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="size-3.5 mr-1.5" /> Tutup
          </Button>
          <Button size="sm" asChild>
            <a href={resolvedUrl} download={fileName || true}>
              <Download className="size-3.5 mr-1.5" /> Download PDF
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function McuCard({
  mcu,
  defaultOpen = false,
  onViewPdf,
}: {
  mcu: MobileHcData["mcuHistory"][number];
  defaultOpen?: boolean;
  onViewPdf: (url: string, fileName: string | null) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rawUrl = mcu.resultFileUrl?.trim();
  const pdfUrl = rawUrl ? resolveUploadUrl(rawUrl) : "";

  return (
    <article className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2"
      >
        <div className="flex items-start gap-2 text-left min-w-0 flex-1">
          <Stethoscope className="size-4 text-[#003f78] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-[#082033]">
              MCU {formatDate(mcu.mcuDate)}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#486275] truncate">
              {mcu.clinicName || "Klinik"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {pdfUrl && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPdf(pdfUrl, mcu.resultFileName);
                }}
                className="inline-flex items-center justify-center rounded-md bg-[#eaf4fb] p-1.5 text-[#003f78]"
                title="Lihat PDF"
              >
                <Eye className="size-4" />
              </button>
              <a
                href={pdfUrl}
                download={mcu.resultFileName || true}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center rounded-md bg-[#eaf4fb] p-1.5 text-[#003f78]"
                title="Download PDF"
              >
                <Download className="size-4" />
              </a>
            </>
          )}
          <Badge
            className={cn(
              "border-0 text-[10px] px-1.5 py-0.5",
              mcu.status === "fit"
                ? "bg-emerald-50 text-emerald-700"
                : mcu.status === "unfit"
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700"
            )}
          >
            {mcu.aiKategori || mcu.status}
          </Badge>
          <ChevronDown
            className={cn(
              "size-5 text-[#486275] transition-transform duration-200",
              !open && "-rotate-90"
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden space-y-3">
          {mcu.aiKesimpulan && (
            <p className="text-xs font-semibold leading-5 text-[#082033]">
              <span className="text-[#486275]">Kesimpulan: </span>
              {mcu.aiKesimpulan}
            </p>
          )}
          {mcu.aiSaran && (
            <p className="text-xs font-semibold leading-5 text-[#486275]">
              <span className="text-[#082033]">Saran: </span>
              {mcu.aiSaran}
            </p>
          )}

          {mcu.metrics.length > 0 && (
            <div className="space-y-2">
              {MCU_METRIC_CATEGORIES.map((cat) => {
                const catMetrics = mcu.metrics.filter((m) => m.category === cat);
                if (catMetrics.length === 0) return null;
                return (
                  <div key={cat} className="rounded-lg bg-[#f5f7fb] p-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#486275]">
                      {MCU_CATEGORY_LABELS[cat]}
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {MCU_METRIC_KEYS[cat].map((key) => {
                        const metric = catMetrics.find((x) => x.metricKey === key);
                        if (!metric || !metric.metricValue) return null;
                        return (
                          <div key={key} className="flex items-baseline justify-between gap-1">
                            <span className="text-[10px] font-semibold text-[#486275]">
                              {MCU_METRIC_LABELS[key] ?? key}
                            </span>
                            <span className="text-[11px] font-black text-[#082033]">
                              {metric.metricValue}
                              {metric.metricUnit ? ` ${metric.metricUnit}` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mcu.nextMcuDue && (
            <p className="pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
              MCU berikutnya: {formatDate(mcu.nextMcuDue)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function WellnessLogCard({
  item,
}: {
  item: MobileHcData["wellness"][number];
}) {
  return (
    <article className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-[#082033]">{item.metricType}</h2>
          <p className="mt-1 text-xs font-semibold text-[#486275]">{item.metricValue}</p>
        </div>
        <Badge className="border-0 bg-[#eaf4fb] text-[#003f78]">{item.status}</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">
        {item.notes}
      </p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
        {formatDate(item.recordedAt)}
      </p>
    </article>
  );
}

export default function MobileWellnessClient({ data }: { data: MobileHcData }) {
  const latest = data.wellness[0];
  const latestMcu = data.mcuHistory[0];
  const [pdfViewer, setPdfViewer] = useState<{ url: string; fileName: string | null } | null>(null);

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Wellness</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Health Tracking</h1>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b9dff6]">Fit Status</p>
            <p className="mt-2 text-4xl font-black leading-none">{data.context.employee.fitStatus.toUpperCase()}</p>
          </div>
          <HeartPulse className="size-9 text-[#f4a78d]" />
        </div>
        <p className="mt-5 text-sm font-semibold text-[#d9effc]">
          Latest metric: {latest ? `${latest.metricType} · ${latest.metricValue}` : "Belum ada record"}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <Stethoscope className="size-5 text-[#003f78]" />
          <p className="mt-3 text-3xl font-black text-[#082033]">{data.mcuHistory.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">MCU Records</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <HeartPulse className={cn("size-5", latestMcu?.status === "fit" ? "text-emerald-600" : latestMcu?.status === "unfit" ? "text-rose-600" : "text-amber-600")} />
          <p className="mt-3 text-xl font-black text-[#082033]">{latestMcu?.aiKategori || latestMcu?.status || "-"}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">MCU Status</p>
        </div>
      </section>

      {/* MCU Progress */}
      {latestMcu?.nextMcuDue && (
        <section className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Progress Menuju MCU Berikutnya</p>
            <span className="text-xs font-black text-[#082033]">{formatDate(latestMcu.nextMcuDue)}</span>
          </div>
          <McuProgress nextDue={latestMcu.nextMcuDue} />
        </section>
      )}

      {/* MCU Annual Section */}
      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">
          MCU Tahunan ({data.mcuHistory.length})
        </p>
        {data.mcuHistory.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada data MCU.
          </div>
        ) : (
          data.mcuHistory.map((mcu, index) => (
            <McuCard
              key={mcu.id}
              mcu={mcu}
              defaultOpen={false}
              onViewPdf={(url, fileName) => setPdfViewer({ url, fileName })}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Wellness Log</p>
        {data.wellness.map((item) => (
          <WellnessLogCard key={item.id} item={item} />
        ))}
        {data.wellness.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada data wellness untuk akun ini.
          </div>
        ) : null}
      </section>

      {pdfViewer && (
        <McuPdfViewer
          url={pdfViewer.url}
          fileName={pdfViewer.fileName}
          open={!!pdfViewer}
          onOpenChange={(open) => !open && setPdfViewer(null)}
        />
      )}
    </div>
  );
}
