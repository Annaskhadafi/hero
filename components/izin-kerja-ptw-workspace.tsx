"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Flame,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SecurityUserRecord } from "@/lib/hero-admin";

type PermitStatus = "Draft" | "Pending Approval" | "Approved" | "Active" | "Closed" | "Rejected";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type HiradcPtwSource = {
  id: number;
  label: string;
  activityName: string;
  department: string;
  location: string;
  equipment: string;
  hazardCategory: string;
  hazardDetails: string;
  riskConsequence: string;
  existingControl: string;
  additionalControl: string;
  riskLevelBefore: string;
  riskLevelAfter: string;
};

type PtwRecord = {
  id: string;
  projectName: string;
  permitType: string;
  location: string;
  area: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  applicant: string;
  fieldPic: string;
  authorizedBy: string;
  status: PermitStatus;
  risk: RiskLevel;
  description: string;
  controlSteps: string;
  ppe: string[];
  gasTestRequired: boolean;
  isolationRequired: boolean;
  attachmentName: string;
};

const fallbackUsers = ["HSE Superintendent", "Workshop Supervisor Tire Repair", "Workshop Supervisor Tire Service", "Site Manager"];
const permitTypes = ["Cold Permit", "Hot Work", "Digging Permit", "Electrical / Mechanical", "Working at Height", "Lifting Operation", "General Critical Work"];
const statusOptions: PermitStatus[] = ["Draft", "Pending Approval", "Approved", "Active", "Closed", "Rejected"];
const riskOptions: RiskLevel[] = ["Low", "Medium", "High", "Critical"];
const ppeOptions = ["Helmet", "Safety Shoes", "Gloves", "Safety Glasses", "Respirator", "Full Body Harness", "Face Shield", "Hearing Protection", "Fire Blanket"];

const initialRecords: PtwRecord[] = [
  {
    id: "PTW-TRB-2026-001",
    projectName: "Cleaning Evaporator SWD 1",
    permitType: "Confined Space",
    location: "Silo Material Kering No. 3",
    area: "Tire Repair Bay - Sector Utara",
    startDate: "2026-06-12",
    startTime: "08:00",
    endDate: "2026-06-12",
    endTime: "17:00",
    applicant: "Budi — Technician",
    fieldPic: "Workshop Supervisor Tire Repair",
    authorizedBy: "HSE Superintendent",
    status: "Pending Approval",
    risk: "Critical",
    description: "Mengeluarkan sisa material yang menggumpal di area corong silo bawah dan inspeksi manual keretakan dinding bagian dalam.",
    controlSteps: "1. Gas test O2, LEL, H2S, CO sebelum masuk.\n2. Blower aktif selama pekerjaan.\n3. Hole watcher standby.\n4. Full body harness dan rescue line wajib.\n5. LOTO area inlet dan outlet.",
    ppe: ["Helmet", "Safety Shoes", "Respirator", "Full Body Harness"],
    gasTestRequired: true,
    isolationRequired: true,
    attachmentName: "JSA Confined Space Evaporator.pdf",
  },
  {
    id: "PTW-HW-2026-014",
    projectName: "Repair Bracket Bead Breaker",
    permitType: "Hot Work",
    location: "Welding Bay",
    area: "Tire Repair Bay",
    startDate: "2026-06-15",
    startTime: "09:00",
    endDate: "2026-06-15",
    endTime: "15:00",
    applicant: "Hasan — Welder",
    fieldPic: "Workshop Supervisor Tire Repair",
    authorizedBy: "HSE Superintendent",
    status: "Approved",
    risk: "High",
    description: "Pengelasan bracket bead breaker setelah ditemukan retak rambut pada dudukan hydraulic clamp.",
    controlSteps: "1. Area dibersihkan dari material mudah terbakar.\n2. Fire watch aktif 30 menit setelah pekerjaan.\n3. APAR 9 kg dan fire blanket tersedia.\n4. Kabel welding dicek sebelum start.",
    ppe: ["Helmet", "Safety Shoes", "Gloves", "Face Shield", "Fire Blanket"],
    gasTestRequired: false,
    isolationRequired: true,
    attachmentName: "JSA Hot Work Bead Breaker.pdf",
  },
];

const statusTone: Record<PermitStatus, string> = {
  Draft: "bg-slate-50 text-slate-700 ring-slate-200",
  "Pending Approval": "bg-amber-50 text-amber-700 ring-amber-200",
  Approved: "bg-blue-50 text-blue-700 ring-blue-200",
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Closed: "bg-slate-100 text-slate-700 ring-slate-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

const riskTone: Record<RiskLevel, string> = {
  Low: "bg-slate-50 text-slate-600 ring-slate-200",
  Medium: "bg-blue-50 text-blue-700 ring-blue-200",
  High: "bg-amber-50 text-amber-700 ring-amber-200",
  Critical: "bg-rose-50 text-rose-700 ring-rose-200",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold ring-1", className)}>{children}</span>;
}

function splitLines(text: string) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

function PtwDocumentDialog({ record }: { record: PtwRecord }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<string>("");

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const openPrintPage = () => {
    window.localStorage.setItem("hero-ptw-print-record", JSON.stringify(record));
    window.open("/print/izin-kerja-ptw", "_blank", "noopener,noreferrer");
  };

  const ppeList = Array.isArray(record.ppe) ? record.ppe : [];
  const activePermitType = (record.permitType || "").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-2" data-testid={`ptw-view-${record.id}`} onClick={() => setOpen(true)}><Eye className="size-4" /> View</Button>
      <DialogContent className="ptw-print-dialog max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-100 p-0 rounded-2xl">
        <DialogHeader className="border-b bg-white px-6 py-4 no-print">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">IJIN KERJA BERBAHAYA (Work Permit) — Official Landscape</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">{record.projectName}</DialogDescription>
            </div>
            <div className="flex gap-2 pr-8">
              <Button size="sm" className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b]" onClick={openPrintPage}><Download className="size-4" /> Download Landscape PDF</Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={openPrintPage}><Printer className="size-4" /> Cetak Dokumen</Button>
            </div>
          </div>
        </DialogHeader>
        <div className="ptw-print-shell p-4 overflow-x-auto">
          <article className="ptw-landscape-sheet w-full max-w-[1122px] min-h-[793px] mx-auto bg-white p-6 shadow-xl border-2 border-slate-900 text-slate-900 font-sans text-[8.5pt] flex flex-col justify-between">
            {/* ── HEADER TABLE ── */}
            <div className="grid grid-cols-[180px_1fr] border-b-2 border-slate-900">
              <div className="flex items-center justify-center p-2 border-r-2 border-slate-900 bg-white">
                <Image src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" width={150} height={50} className="object-contain" />
              </div>
              <div className="bg-[#bfe6ff] flex items-center justify-center font-bold text-base tracking-wider uppercase py-2.5 text-slate-900">
                IJIN KERJA BERBAHAYA ( Work Permit )
              </div>
            </div>

            {/* ── FORM META FIELDS ── */}
            <div className="grid grid-cols-12 border-b-2 border-slate-900 text-[8pt]">
              <div className="col-span-4 border-r border-slate-900 p-1.5 bg-slate-50">
                <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{record.id}</span>
              </div>
              <div className="col-span-8 p-1.5 bg-slate-50">
                <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{record.id}</span>
              </div>

              <div className="col-span-4 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                <span className="font-bold block text-[7.5pt] text-slate-500">Nama Pekerja :</span>
                <span className="font-semibold text-slate-900">{record.applicant || "-"}</span>
              </div>
              <div className="col-span-3 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                <span className="font-bold block text-[7.5pt] text-slate-500">Lokasi :</span>
                <span className="font-semibold text-slate-900">{record.location} ({record.area})</span>
              </div>
              <div className="col-span-5 border-t border-slate-900 p-1.5 min-h-[44px]">
                <span className="font-bold block text-[7.5pt] text-slate-500">Uraian Pekerjaan :</span>
                <span className="font-semibold text-slate-900">{record.projectName || record.description || "-"}</span>
              </div>

              <div className="col-span-6 border-r border-slate-900 border-t border-slate-900 p-1.5 bg-blue-50/50">
                <span className="font-bold text-slate-800">Referensi HIRADC :</span>{" "}
                <span className="font-semibold text-blue-900">
                  {(record as any).hiradcReference || (record.description?.match(/\[Referensi HIRADC:\s*(.*?)\]/)?.[1]) || "—"}
                </span>
              </div>
              <div className="col-span-6 border-t border-slate-900 p-1.5 bg-blue-50/50">
                <span className="font-bold text-slate-800">Tipe Izin Kerja Terpilih :</span>{" "}
                <span className="font-semibold uppercase text-slate-900">{record.permitType || "Cold Permit"}</span>
              </div>
            </div>

            {/* ── TABLE TITLE: JENIS PEKERJAAN ── */}
            <div className="bg-[#e2e8f0] text-center font-bold uppercase text-[8.5pt] py-1 border-b-2 border-slate-900">
              JENIS PEKERJAAN
            </div>

            {/* ── DYNAMIC COLUMNS FOR SELECTED PERMIT TYPES ONLY ── */}
            {(() => {
              const activeUpper = (record.permitType || "").toUpperCase()
              const activeTypes: string[] = []
              if (activeUpper.includes("HOT")) activeTypes.push("HOT")
              if (activeUpper.includes("CONFINED")) activeTypes.push("CONFINED")
              if (activeUpper.includes("DIGGING")) activeTypes.push("DIGGING")
              if (activeUpper.includes("COLD")) activeTypes.push("COLD")
              if (activeUpper.includes("ELECTRICAL") || activeUpper.includes("MECHANICAL")) activeTypes.push("ELECTRICAL")

              const columnsToShow = activeTypes.length > 0 ? activeTypes : ["HOT", "CONFINED", "DIGGING", "COLD", "ELECTRICAL"]
              const gridColsClass =
                columnsToShow.length === 1
                  ? "grid-cols-1"
                  : columnsToShow.length === 2
                  ? "grid-cols-2"
                  : columnsToShow.length === 3
                  ? "grid-cols-3"
                  : columnsToShow.length === 4
                  ? "grid-cols-4"
                  : "grid-cols-5"

              return (
                <div className={`grid ${gridColsClass} border-b-2 border-slate-900 divide-x-2 divide-slate-900 text-[7.5pt]`}>
                  {/* Column 1: Hot Work Permit (Red Header) */}
                  {columnsToShow.includes("HOT") && (
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="bg-[#ef4444] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                          Hot Work Permit
                        </div>
                        <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                          <div>- Welding</div>
                          <div>- Cutting torch</div>
                          <div>- Grinding</div>
                          <div>- Brazing</div>
                        </div>
                        <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                          Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                        </div>
                        <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                          <thead>
                            <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                              <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr><td>1 Daerah kerja bebas dari bahan terbakar</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>2 Tersedia APAR</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>3 Apakah daerah kerja dilokalisir?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>4 Welding Glove</td><td className="text-center">{ppeList.includes("Welding Gloves") ? "☑" : "☐"}</td><td className="text-center">{!ppeList.includes("Welding Gloves") ? "☑" : "☐"}</td></tr>
                            <tr><td>5 Welding Cloth/Appron</td><td className="text-center">{ppeList.includes("Welding Gloves") ? "☑" : "☐"}</td><td className="text-center">{!ppeList.includes("Welding Gloves") ? "☑" : "☐"}</td></tr>
                            <tr><td>6 Face Shield</td><td className="text-center">{ppeList.includes("Face Shield") ? "☑" : "☐"}</td><td className="text-center">{!ppeList.includes("Face Shield") ? "☑" : "☐"}</td></tr>
                            <tr><td>7 Respirator</td><td className="text-center">{ppeList.includes("Respirator") ? "☑" : "☐"}</td><td className="text-center">{!ppeList.includes("Respirator") ? "☑" : "☐"}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Column 2: Confined Space Permit (Yellow Header) */}
                  {columnsToShow.includes("CONFINED") && (
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="bg-[#eab308] text-slate-900 text-center font-bold py-1 uppercase border-b border-slate-900">
                          Confined Space Permit
                        </div>
                        <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                          <div>- Pekerjaan Tangki</div>
                          <div>- Chute</div>
                          <div>- Sewer / Saluran air</div>
                        </div>
                        <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                          Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                        </div>
                        <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                          <thead>
                            <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                              <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr><td>1 Breathing Set diperlukan?</td><td className="text-center">{record.gasTestRequired ? "☑" : "☐"}</td><td className="text-center">{!record.gasTestRequired ? "☑" : "☐"}</td></tr>
                            <tr><td>2 Disposal Respirator</td><td className="text-center">{ppeList.includes("Respirator") ? "☑" : "☐"}</td><td className="text-center">{!ppeList.includes("Respirator") ? "☑" : "☐"}</td></tr>
                            <tr><td>3 Peralatan bebas percikan api</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>4 Safety harness & lifeline diperlukan?</td><td className="text-center">{ppeList.includes("Full Body Harness") ? "☑" : "☐"}</td><td className="text-center">{!ppeList.includes("Full Body Harness") ? "☑" : "☐"}</td></tr>
                            <tr><td>5 Ventilasi telah memadai?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>6 Pemeriksaan O2 dilakukan?</td><td className="text-center">{record.gasTestRequired ? "☑" : "☐"}</td><td className="text-center">{!record.gasTestRequired ? "☑" : "☐"}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Column 3: Digging Permit (Green Header) */}
                  {columnsToShow.includes("DIGGING") && (
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="bg-[#84cc16] text-slate-900 text-center font-bold py-1 uppercase border-b border-slate-900">
                          Digging Permit
                        </div>
                        <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                          <div>- Penggalian parit</div>
                          <div>- Pembuatan pondasi</div>
                          <div>- Penggalian jalur kabel listrik/telepon</div>
                          <div>- Penggalian jalur pipa air</div>
                        </div>
                        <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                          Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                        </div>
                        <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                          <thead>
                            <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                              <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr><td>1 Peta / gambar tersedia?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>2 Penggalian dilakukan dengan Alat?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>3 Penggalian dilakukan dengan manual?</td><td className="text-center">☐</td><td className="text-center">☑</td></tr>
                            <tr><td>4 Tanda / barricade telah tersedia?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>5 Hand glove</td><td className="text-center">{ppeList.some(p => p.toLowerCase().includes("glove")) ? "☑" : "☐"}</td><td className="text-center">{!ppeList.some(p => p.toLowerCase().includes("glove")) ? "☑" : "☐"}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Column 4: Cold Work Permit (Cyan Header) */}
                  {columnsToShow.includes("COLD") && (
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="bg-[#06b6d4] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                          Cold Work Permit
                        </div>
                        <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                          <div>- Pekerjaan Perbaikan Sipil</div>
                          <div>- Inspeksi & Maintenance Umum</div>
                          <div>- Penataan & Kebersihan Area</div>
                        </div>
                        <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                          Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                        </div>
                        <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                          <thead>
                            <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                              <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr><td>1 Peralatan kerja layak pakai?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>2 APD sesuai standar K3?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>3 Penerangan area memadai?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>4 Pengamanan area kerja?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>5 Housekeeping / Kebersihan?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Column 5: Electrical / Mechanical Permit (Blue Header) */}
                  {columnsToShow.includes("ELECTRICAL") && (
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="bg-[#3b82f6] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                          Electrical / Mechanical Permit
                        </div>
                        <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                          <div>- Perbaikan Drainase & Kabel</div>
                          <div>- Pembuatan pondasi & Pompa</div>
                          <div>- Maintenance / LOTO Boiler</div>
                        </div>
                        <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                          Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                        </div>
                        <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                          <thead>
                            <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                              <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                              <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr><td>1 Body Harness untuk Ketinggian?</td><td className="text-center">{ppeList.includes("Full Body Harness") ? "☑" : "☐"}</td><td className="text-center">{!ppeList.includes("Full Body Harness") ? "☑" : "☐"}</td></tr>
                            <tr><td>2 Alat potong kupas kabel layak?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>3 Isolasi / LOTO layak?</td><td className="text-center">{record.isolationRequired ? "☑" : "☐"}</td><td className="text-center">{!record.isolationRequired ? "☑" : "☐"}</td></tr>
                            <tr><td>4 APAR tersedia di area kerja?</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                            <tr><td>5 APD yang sesuai pekerjaan</td><td className="text-center">☑</td><td className="text-center">☐</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── ALAT PELINDUNG DIRI (APD) WAJIB ── */}
            <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80">
              <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
              <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
                {ppeList.length > 0 ? (
                  ppeList.map((apd) => (
                    <span key={apd} className="inline-block bg-white border border-slate-400 rounded px-2 py-0.5 text-[7.5pt] shadow-2xs">
                      ☑ {apd}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">Standard K3 APD (Helmet, Safety Shoes, Glasses)</span>
                )}
              </div>
            </div>

            {/* ── LAMPIRAN DOKUMEN PENDUKUNG & QR CODE ── */}
            <div className="p-2.5 border-b-2 border-slate-900 text-[8pt] bg-slate-50/90 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-9 space-y-1">
                <span className="font-bold text-[8.5pt] text-slate-900 block uppercase tracking-wide">
                  LAMPIRAN DOKUMEN PENDUKUNG (JSA / WORK PLAN)
                </span>
                <p className="text-[7.5pt] text-slate-700 leading-snug">
                  Dokumen JSA & Prosedur Keselamatan Kerja K3 terintegrasi secara digital. Scan QR Code di samping atau buka tautan publik di bawah ini untuk mengunduh/melihat berkas lampiran.
                </p>
                <div className="text-[6.5pt] font-mono text-slate-600 pt-0.5 break-all" suppressHydrationWarning>
                  URL Publik: {origin ? `${origin}/review/ptw/${record.id}` : `/review/ptw/${record.id}`}
                </div>
              </div>
              <div className="col-span-3 flex flex-col items-center justify-center border-l border-slate-900 pl-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    origin ? `${origin}/review/ptw/${record.id}` : `https://hero.chitraparatama.com/review/ptw/${record.id}`
                  )}`}
                  alt="QR Code Lampiran PTW"
                  className="size-14 object-contain border border-slate-900 p-0.5 bg-white rounded"
                />
                <span className="text-[6pt] font-bold text-slate-900 mt-1 uppercase text-center">Scan QR Lampiran</span>
              </div>
            </div>

            {/* ── MASA BERLAKU IKB ── */}
            <div className="border-b-2 border-slate-900 text-[8pt]">
              <div className="bg-slate-100 text-center font-bold uppercase py-0.5 border-b border-slate-900 text-[8pt]">
                MASA BERLAKU IKB (IJIN KERJA BERBAHAYA)
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-900">
                <div className="grid grid-cols-2 divide-x divide-slate-900 border-r border-slate-900">
                  <div className="p-1 text-center">
                    <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL MULAI</span>
                    <span className="font-semibold">{formatDate(record.startDate)}</span>
                  </div>
                  <div className="p-1 text-center">
                    <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU MULAI</span>
                    <span className="font-semibold">{record.startTime || "08:00"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-900">
                  <div className="p-1 text-center">
                    <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL BERAKHIR</span>
                    <span className="font-semibold">{formatDate(record.endDate)}</span>
                  </div>
                  <div className="p-1 text-center">
                    <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU BERAKHIR</span>
                    <span className="font-semibold">{record.endTime || "17:00"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── VERIFIKASI & TANDA TANGAN (3 COLUMNS) ── */}
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 border-b-2 border-slate-900 text-[8pt]">
              <div className="p-1.5 text-center flex flex-col justify-between">
                <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PEMBERI KERJA</div>
                <div className="h-14 flex items-center justify-center my-1 text-[7pt] text-slate-400 italic">
                  Ditandatangani Digital
                </div>
                <div className="border-t border-slate-900 pt-1 font-bold">{record.applicant || "NAMA & TANDA TANGAN"}</div>
              </div>

              <div className="p-1.5 text-center flex flex-col justify-between">
                <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PELAKSANA PEKERJAAN</div>
                <div className="h-14 flex items-center justify-center my-1 text-[7pt] text-slate-400 italic">
                  Ditandatangani Digital
                </div>
                <div className="border-t border-slate-900 pt-1 font-bold">{record.fieldPic || "NAMA & TANDA TANGAN"}</div>
              </div>

              <div className="p-1.5 text-center flex flex-col justify-between">
                <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">VERIFIKASI (SAFETY DEPT)</div>
                <div className="h-14 flex items-center justify-center my-1 text-[7pt] text-slate-400 italic">
                  Ditandatangani Digital
                </div>
                <div className="border-t border-slate-900 pt-1 font-bold">{record.authorizedBy || "NAMA & TANDA TANGAN"}</div>
              </div>
            </div>

            {/* ── CATATAN FOOTER ── */}
            <div className="p-2 text-[7pt] space-y-0.5 bg-slate-50 flex items-start justify-between">
              <div>
                <span className="font-bold block text-slate-900">CATATAN :</span>
                <div>1. Ijin kerja ini hanya berlaku untuk satu area kerja saja.</div>
                <div>2. Ijin kerja ini selalu berada ditempat kerja</div>
                <div>3. Dilarang melakukan pekerjaan sebelum ada ijin kerja</div>
              </div>
              <div className="text-right text-slate-500 font-mono text-[6.5pt] pt-1 shrink-0">
                No. Form: CP-F-SHE-026 / P-HSE-SOP-031.00
              </div>
            </div>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return <div><p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="break-words text-[11px] font-bold leading-tight text-slate-900">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="font-bold leading-relaxed text-slate-900">{value}</p></div>;
}

function InfoDark({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="mb-4 flex items-center gap-4"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-800">{icon}</div><div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="text-sm font-bold text-slate-100">{value}</p></div></div>;
}

function Signature({ label, name }: { label: string; name: string }) {
  return <div><div className="mb-2 border-b border-slate-300 pb-8 text-slate-300">Ditandatangani Digital</div><p className="text-slate-900">{name}</p><p>{label}</p></div>;
}


function mapHiradcRiskLevel(value: string): RiskLevel {
  const normalized = value.trim().toUpperCase();
  if (normalized === "EXTREME") return "Critical";
  if (normalized === "HIGH") return "High";
  if (normalized === "MODERATE" || normalized === "MEDIUM") return "Medium";
  return "Low";
}

function toBulletLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `  • ${line}`);
}

function buildSection(title: string, lines: string[]) {
  const cleanLines = lines.map((line) => line.trim()).filter(Boolean);
  if (cleanLines.length === 0) return "";
  return [`${title}:`, ...cleanLines].join("\n");
}

function buildHiradcDescription(source: HiradcPtwSource) {
  return [
    buildSection("1. Aktivitas HIRADC", [`  • ${source.activityName || "-"}`]),
    buildSection("2. Identifikasi Bahaya", [
      source.hazardCategory ? `  • Kategori: ${source.hazardCategory}` : "",
      ...toBulletLines(source.hazardDetails),
    ]),
    buildSection("3. Konsekuensi Risiko", toBulletLines(source.riskConsequence)),
    buildSection("4. Equipment / Area Terkait", toBulletLines(source.equipment)),
  ].filter(Boolean).join("\n\n");
}

function buildHiradcControls(source: HiradcPtwSource) {
  return [
    buildSection("1. Existing Control", toBulletLines(source.existingControl)),
    buildSection("2. Additional Control", toBulletLines(source.additionalControl)),
    buildSection("3. Risk Rating", [
      source.riskLevelBefore ? `  • Before: ${source.riskLevelBefore}` : "",
      source.riskLevelAfter ? `  • After: ${source.riskLevelAfter}` : "",
    ]),
  ].filter(Boolean).join("\n\n");
}
function PpeMultiSelect({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [selected, setSelected] = useState("");
  return <div className="space-y-2"><div className="flex gap-2"><Combobox value={selected} onChange={setSelected} options={ppeOptions} placeholder="Pilih APD" className="h-10 bg-white" allowCustom /><Button type="button" variant="outline" className="h-10" onClick={() => { if (selected && !value.includes(selected)) onChange([...value, selected]); setSelected(""); }}><Plus className="mr-2 size-4" /> Add</Button></div><div className="flex flex-wrap gap-2">{value.map((item) => <button key={item} type="button" onClick={() => onChange(value.filter((entry) => entry !== item))} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700">{item} ×</button>)}</div></div>;
}

function PtwFormDialog({ record, userOptions, hiradcSources, onSave }: { record?: PtwRecord; userOptions: string[]; hiradcSources: HiradcPtwSource[]; onSave: (record: PtwRecord) => void }) {
  const isEdit = Boolean(record);
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState(record?.projectName ?? "");
  const [permitType, setPermitType] = useState(record?.permitType ?? "Hot Work");
  const [location, setLocation] = useState(record?.location ?? "");
  const [area, setArea] = useState(record?.area ?? "Tire Repair Bay");
  const [startDate, setStartDate] = useState(record?.startDate ?? "");
  const [startTime, setStartTime] = useState(record?.startTime ?? "08:00");
  const [endDate, setEndDate] = useState(record?.endDate ?? "");
  const [endTime, setEndTime] = useState(record?.endTime ?? "17:00");
  const [description, setDescription] = useState(record?.description ?? "");
  const [controlSteps, setControlSteps] = useState(record?.controlSteps ?? "");
  const [applicant, setApplicant] = useState(record?.applicant ?? userOptions[0] ?? "");
  const [fieldPic, setFieldPic] = useState(record?.fieldPic ?? userOptions[1] ?? "");
  const [authorizedBy, setAuthorizedBy] = useState(record?.authorizedBy ?? userOptions[2] ?? "");
  const [status, setStatus] = useState<PermitStatus>(record?.status ?? "Pending Approval");
  const [risk, setRisk] = useState<RiskLevel>(record?.risk ?? "High");
  const [ppe, setPpe] = useState(record?.ppe ?? ["Helmet", "Safety Shoes"]);
  const [hiradcReference, setHiradcReference] = useState("");
  const hiradcOptions = useMemo(() => Array.from(new Set(hiradcSources.map((source) => source.label))), [hiradcSources]);

  const applyHiradcReference = (label: string) => {
    setHiradcReference(label);
    const source = hiradcSources.find((item) => item.label === label);
    if (!source) return;

    if (!projectName.trim()) setProjectName(source.activityName || "Permit dari HIRADC");
    if (source.location) setLocation(source.location);
    if (source.department) setArea(source.department);
    setDescription(buildHiradcDescription(source));
    setControlSteps(buildHiradcControls(source));
    setRisk(mapHiradcRiskLevel(source.riskLevelBefore));
  };
  const save = () => {
    onSave({ id: record?.id ?? `PTW-${Date.now().toString().slice(-6)}`, projectName: projectName || "New Permit to Work", permitType, location: location || "Workshop Tire Mining", area, startDate: startDate || new Date().toISOString().slice(0, 10), startTime, endDate: endDate || startDate || new Date().toISOString().slice(0, 10), endTime, applicant, fieldPic, authorizedBy, status, risk, description: description || "Deskripsi pekerjaan belum diisi.", controlSteps: controlSteps || "Checklist kontrol risiko belum diisi.", ppe, gasTestRequired: permitType === "Confined Space", isolationRequired: ["Electrical Isolation", "Hot Work", "Confined Space"].includes(permitType), attachmentName: record?.attachmentName ?? "JSA / Work Plan Attachment.pdf" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? <Button type="button" variant="outline" size="sm" className="h-8 gap-2" data-testid={`ptw-edit-${record?.id}`} onClick={() => setOpen(true)}><Pencil className="size-4" /> Edit</Button> : <Button type="button" className="h-10 gap-2 bg-blue-600 text-white hover:bg-blue-700" data-testid="ptw-add" onClick={() => setOpen(true)}><Plus className="size-4" /> Pengajuan Izin Baru</Button>}
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Izin Kerja Aman (PTW)" : "Pengajuan Izin Kerja Aman (PTW)"}</DialogTitle><DialogDescription>Field PTW dibuat lebih lengkap untuk kontrol pekerjaan berisiko di workshop mining.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Nama proyek / kontrak</Label><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ketik nama proyek / kontrak" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Referensi HIRADC</Label><Combobox value={hiradcReference} onChange={applyHiradcReference} options={hiradcOptions} placeholder="Pilih HIRADC / ketik custom" className="h-10 bg-white" allowCustom /><p className="text-xs font-medium text-slate-500">Pilih aktivitas HIRADC untuk autofill, atau ketik custom dan isi manual deskripsi pekerjaan serta kontrol risiko.</p></div>
          <div className="space-y-2"><Label>Tipe izin kerja</Label><Combobox value={permitType} onChange={setPermitType} options={permitTypes} placeholder="Pilih / tambah tipe PTW" className="h-10 bg-white" allowCustom /></div>
          <div className="space-y-2"><Label>Lokasi spesifik</Label><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Contoh: Area Tangki T-102" /></div>
          <div className="space-y-2"><Label>Area kerja</Label><Input value={area} onChange={(event) => setArea(event.target.value)} /></div>
          <div className="space-y-2"><Label>Tgl mulai</Label><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          <div className="space-y-2"><Label>Jam mulai</Label><Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></div>
          <div className="space-y-2"><Label>Tgl selesai</Label><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
          <div className="space-y-2"><Label>Jam selesai</Label><Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Deskripsi pekerjaan</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Jelaskan detail pekerjaan yang akan dilakukan" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Kontrol risiko / checklist keamanan</Label><Textarea value={controlSteps} onChange={(event) => setControlSteps(event.target.value)} placeholder="Sebutkan langkah pencegahan, isolasi, gas test, APD" /></div>
          <div className="space-y-2"><Label>Nama pemohon</Label><Combobox value={applicant} onChange={setApplicant} options={userOptions} placeholder="Pilih user pemohon" className="h-10 bg-white" allowCustom={false} /></div>
          <div className="space-y-2"><Label>Nama PIC lapangan</Label><Combobox value={fieldPic} onChange={setFieldPic} options={userOptions} placeholder="Pilih PIC lapangan" className="h-10 bg-white" allowCustom={false} /></div>
          <div className="space-y-2"><Label>Status persetujuan</Label><Select value={status} onValueChange={(value) => setStatus(value as PermitStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Disetujui oleh</Label><Combobox value={authorizedBy} onChange={setAuthorizedBy} options={userOptions} placeholder="Pilih HSE Manager / Supervisor" className="h-10 bg-white" allowCustom={false} /></div>
          <div className="space-y-2"><Label>Risk level</Label><Select value={risk} onValueChange={(value) => setRisk(value as RiskLevel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{riskOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>APD wajib</Label><PpeMultiSelect value={ppe} onChange={setPpe} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Lampiran JSA / Work Plan</Label><div className="grid min-h-24 place-items-center rounded-xl border border-dashed bg-slate-50 text-center text-sm font-semibold text-slate-500"><UploadCloud className="mb-2 size-6" /> Pilih dokumen pendukung</div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save}>{isEdit ? "Simpan Perubahan" : "Kirim Pengajuan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IzinKerjaPtwWorkspace({
  users,
  hiradcSources,
  canEdit = true,
  canDelete = true,
}: {
  users: SecurityUserRecord[];
  hiradcSources: HiradcPtwSource[];
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const userOptions = useMemo(() => {
    const options = users.filter((user) => user.isActive).map((user) => `${user.name}${user.jobTitle ? ` — ${user.jobTitle}` : ""}${user.email ? ` (${user.email})` : ""}`).filter(Boolean);
    const uniqueOptions = Array.from(new Set(options));
    return uniqueOptions.length ? uniqueOptions : fallbackUsers;
  }, [users]);
  const [records, setRecords] = useState(initialRecords);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filteredRecords = useMemo(() => records.filter((record) => {
    const matchQuery = [record.projectName, record.permitType, record.location, record.applicant, record.status].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchQuery && (status === "all" || record.status === status);
  }), [query, records, status]);

  const saveRecord = (next: PtwRecord) => setRecords((current) => current.some((record) => record.id === next.id) ? current.map((record) => record.id === next.id ? next : record) : [next, ...current]);
  const deleteRecord = (record: PtwRecord) => { if (confirm(`Hapus PTW ${record.projectName}?`)) setRecords((current) => current.filter((item) => item.id !== record.id)); };
  const kpis = { total: records.length, pending: records.filter((record) => record.status === "Pending Approval").length, approved: records.filter((record) => record.status === "Approved" || record.status === "Active").length, critical: records.filter((record) => record.risk === "Critical").length };

  return (
    <div className="space-y-5 text-slate-900">
      <div className="grid gap-3 md:grid-cols-4"><Metric icon={FileText} label="Total PTW" value={kpis.total} /><Metric icon={CalendarClock} label="Pending" value={kpis.pending} tone="amber" /><Metric icon={CheckCircle2} label="Approved / Active" value={kpis.approved} tone="emerald" /><Metric icon={Flame} label="Critical Risk" value={kpis.critical} tone="rose" /></div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-display text-lg font-black uppercase italic text-slate-900">Permit to Work Register</h2>
            <p className="text-sm font-medium text-slate-500">Izin kerja aman untuk hot work, confined space, lifting, isolation, dan pekerjaan critical workshop.</p>
          </div>
          {canEdit && <PtwFormDialog userOptions={userOptions} hiradcSources={hiradcSources} onSave={saveRecord} />}
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center"><div className="relative lg:w-[260px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-9 pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 lg:w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-500">Showing {filteredRecords.length} of {records.length} permits</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Permit Info</TableHead>
                <TableHead>Type & Location</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-slate-50/70">
                  <TableCell className="min-w-[280px]">
                    <div className="font-bold text-slate-900">{record.projectName}</div>
                    <div className="mt-1 text-xs font-medium text-blue-700">{record.id}</div>
                  </TableCell>
                  <TableCell className="min-w-[260px]">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <MapPin className="size-4 text-blue-600" /> {record.permitType}
                    </div>
                    <div className="text-xs font-medium text-slate-500">{record.location} • {record.area}</div>
                    <Pill className={cn("mt-2", riskTone[record.risk])}>{record.risk}</Pill>
                  </TableCell>
                  <TableCell className="min-w-[150px] font-semibold text-slate-800">
                    {formatDate(record.startDate)}
                    <div className="text-xs text-slate-500">{record.startTime} - {record.endTime}</div>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <div className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-bold">
                        {record.applicant.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{record.applicant}</p>
                        <p className="text-xs text-slate-500">Auth: {record.authorizedBy}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Pill className={statusTone[record.status]}>{record.status}</Pill>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <PtwDocumentDialog record={record} />
                      {canEdit && (
                        <PtwFormDialog
                          record={record}
                          userOptions={userOptions}
                          hiradcSources={hiradcSources}
                          onSave={saveRecord}
                        />
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => deleteRecord(record)}
                        >
                          <Trash2 className="size-4" /> Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "slate" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: "slate" | "amber" | "emerald" | "rose" }) {
  const toneMap = { slate: "border-slate-200 text-slate-700", amber: "border-amber-200 text-amber-700", emerald: "border-emerald-200 text-emerald-700", rose: "border-rose-200 text-rose-700" } as const;
  return <div className={cn("rounded-2xl border bg-white p-4 shadow-sm", toneMap[tone])}><Icon className="mb-3 size-5" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="text-2xl font-black">{value}</p></div>;
}
