"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  HardHat,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  Plus,
  Printer,
  ShieldCheck,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveClientUploadUrl } from "@/lib/client-upload-url";
import { HSE_OSM_RISK_CONFIG, HSE_OSM_STATUS_CONFIG, type HseOsmFindingStatus, type HseOsmRiskLevel } from "@/lib/hse-osm-constants";
import { OsmActionModal } from "./osm-action-modal";
import { OsmFindingModal } from "./osm-finding-modal";

type OsmDetailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionData: any;
  onRefresh: () => void;
};

export function OsmDetailDialog({
  isOpen,
  onClose,
  sessionData,
  onRefresh,
}: OsmDetailDialogProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [actionFinding, setActionFinding] = useState<any>(null);
  const [actionModalMode, setActionModalMode] = useState<"submit_action" | "verify_close" | "verify_reject">("submit_action");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isAddFindingOpen, setIsAddFindingOpen] = useState(false);

  if (!sessionData) return null;

  const {
    id,
    sessionNumber,
    siteName,
    inspectionDate,
    inspectionTime,
    locationArea,
    latitude,
    longitude,
    gpsAccuracy,
    focusItemName,
    leadEmployeeName,
    leadBadgeNumber,
    leadDepartment,
    leadCompany,
    notes,
    status,
    teamMembers = [],
    findings = [],
  } = sessionData;

  function openActionModal(finding: any, mode: "submit_action" | "verify_close" | "verify_reject") {
    setActionFinding(finding);
    setActionModalMode(mode);
    setIsActionModalOpen(true);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          {/* Header Bar */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                  <HardHat className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight">
                      Laporan On the Spot Monitoring (OSM)
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-mono">
                      {sessionNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    QHSE Department — PT Chitra Paratama • Standar Pemantauan KPC
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-8 gap-1.5"
                >
                  <Link href={`/print/hse/osm/${id}`} target="_blank">
                    <Printer className="size-3.5" />
                    Cetak PDF Resmi
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddFindingOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Tambah Temuan
                </Button>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border text-xs">
              <div>
                <span className="text-muted-foreground font-medium block">Tanggal & Waktu</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {inspectionDate} • {inspectionTime}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block">Site Operasional</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {siteName || "Head Office / Central"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block">Area Lokasi Kerja</span>
                <span className="font-semibold text-foreground mt-0.5 block">{locationArea}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block">Fokus Area</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5 block">
                  {focusItemName}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground font-medium block">Koordinat Geotagging GPS</span>
                <span className="font-mono text-muted-foreground mt-0.5 block">
                  {latitude && longitude ? `${latitude}, ${longitude} (${gpsAccuracy || "GPS"})` : "Tidak terekam"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground font-medium block">Inisiator Pemantauan</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {leadEmployeeName} ({leadBadgeNumber}) — {leadDepartment}
                </span>
              </div>
            </div>

            {/* Team Members Section */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Users className="size-4 text-emerald-600" />
                Daftar Tim Inspeksi ({teamMembers.length} Personil)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {teamMembers.map((member: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card text-xs shadow-xs"
                  >
                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                        <span className="truncate">{member.name}</span>
                        {member.isTeamLeader && (
                          <span className="shrink-0 text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 rounded-full border border-amber-300">
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {member.badgeNumber} • {member.department}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Findings Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Daftar Temuan Lapangan ({findings.length} Tiket)
                </div>
              </div>

              {findings.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed text-muted-foreground text-xs">
                  Belum ada tiket temuan lapangan yang dicatat pada sesi ini.
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddFindingOpen(true)}
                      className="text-xs"
                    >
                      <Plus className="size-3.5 mr-1" />
                      Tambah Temuan Pertama
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {findings.map((f: any, idx: number) => {
                    const statusCfg = HSE_OSM_STATUS_CONFIG[f.status as HseOsmFindingStatus] || HSE_OSM_STATUS_CONFIG.OPEN;
                    const riskCfg = HSE_OSM_RISK_CONFIG[f.riskLevel as HseOsmRiskLevel] || HSE_OSM_RISK_CONFIG.MEDIUM;

                    return (
                      <div
                        key={f.id || idx}
                        className="rounded-xl border bg-card p-4 space-y-3.5 shadow-xs transition-shadow hover:shadow-md"
                      >
                        {/* Finding Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {f.findingNumber}
                            </span>
                            <span className="font-semibold text-xs text-foreground">
                              {f.classificationName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${riskCfg.badgeClass}`}>
                              {riskCfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusCfg.badgeClass}`}>
                              <span className={`size-1.5 rounded-full ${statusCfg.dotClass}`} />
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>

                        {/* Finding Body: Problem Description & Photos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="md:col-span-2 space-y-2">
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Deskripsi Temuan Lapangan:
                              </span>
                              <p className="text-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-3 rounded-lg border">
                                {f.description}
                              </p>
                            </div>

                            {f.actionRequired && (
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Rekomendasi Tindakan:
                                </span>
                                <p className="text-muted-foreground bg-muted/20 p-2 rounded border text-xs">
                                  {f.actionRequired}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Photos Gallery */}
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block">
                              Foto Temuan:
                            </span>
                            {f.photoUrls && f.photoUrls.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {f.photoUrls.map((pUrl: string, pIdx: number) => (
                                  <div
                                    key={pIdx}
                                    onClick={() => setSelectedPhoto(resolveClientUploadUrl(pUrl))}
                                    className="relative aspect-video rounded-md border overflow-hidden cursor-pointer group bg-slate-950"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={resolveClientUploadUrl(pUrl)}
                                      alt={`Foto temuan ${pIdx + 1}`}
                                      className="size-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                      <Maximize2 className="size-4" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 rounded-md border border-dashed text-center text-muted-foreground text-[11px]">
                                Tidak ada foto temuan
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Corrective Action Section */}
                        {f.actionTaken && (
                          <div className="rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                <CheckCircle2 className="size-3.5 text-amber-600" />
                                Tindakan Korektif Telah Dilakukan:
                              </span>
                              {f.actionSubmittedBy && (
                                <span className="text-[11px] text-amber-800 dark:text-amber-400">
                                  Oleh: {f.actionSubmittedBy}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                              {f.actionTaken}
                            </p>

                            {/* Action Photos */}
                            {f.actionPhotoUrls && f.actionPhotoUrls.length > 0 && (
                              <div className="pt-1">
                                <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 block mb-1">
                                  Foto Bukti Selesai Perbaikan:
                                </span>
                                <div className="flex gap-2">
                                  {f.actionPhotoUrls.map((apUrl: string, apIdx: number) => (
                                    <div
                                      key={apIdx}
                                      onClick={() => setSelectedPhoto(resolveClientUploadUrl(apUrl))}
                                      className="relative size-16 rounded-md border overflow-hidden cursor-pointer group bg-slate-950"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={resolveClientUploadUrl(apUrl)}
                                        alt={`Bukti perbaikan ${apIdx + 1}`}
                                        className="size-full object-cover transition-transform group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                        <Maximize2 className="size-3.5" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rejection Note */}
                        {f.status === "REJECTED" && f.rejectionReason && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:bg-red-950/30 dark:text-red-300">
                            <span className="font-bold block mb-0.5">Catatan Penolakan / Revisi:</span>
                            {f.rejectionReason}
                          </div>
                        )}

                        {/* Action Buttons for this finding */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t">
                          {f.status === "OPEN" && (
                            <Button
                              size="sm"
                              onClick={() => openActionModal(f, "submit_action")}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7.5 px-3 gap-1"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Tindak Lanjuti Perbaikan
                            </Button>
                          )}

                          {f.status === "PROCESSED" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionModal(f, "verify_reject")}
                                className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-7.5 px-3 gap-1"
                              >
                                <XCircle className="size-3.5" />
                                Tolak / Minta Revisi
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openActionModal(f, "verify_close")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7.5 px-3 gap-1"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Verifikasi Selesai (Close)
                              </Button>
                            </>
                          )}

                          {f.status === "CLOSED" && (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="size-3.5" />
                              Telah diverifikasi tuntas {f.verifiedBy ? `oleh ${f.verifiedBy}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Modal (Submit / Close / Reject) */}
      <OsmActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        finding={actionFinding}
        mode={actionModalMode}
        onSuccess={onRefresh}
      />

      {/* Add Finding Modal */}
      <OsmFindingModal
        isOpen={isAddFindingOpen}
        onClose={() => setIsAddFindingOpen(false)}
        sessionId={id}
        sessionNumber={sessionNumber}
        onSuccess={onRefresh}
      />

      {/* Photo Lightbox Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="sm:max-w-4xl p-1 bg-black/95 border-0">
            <div className="relative flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto}
                alt="Foto Pembesaran"
                className="max-h-[85vh] max-w-full rounded object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
              >
                <X className="size-4" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
