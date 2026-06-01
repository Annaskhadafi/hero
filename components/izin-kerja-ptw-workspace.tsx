"use client";

import Image from "next/image";
import type React from "react";
import { useMemo, useState } from "react";
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
const permitTypes = ["Hot Work", "Confined Space", "Working at Height", "Lifting Operation", "Electrical Isolation", "Excavation", "Pressure Test", "Critical Tire Workshop Task"];
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
  const openPrintPage = () => {
    window.localStorage.setItem("hero-ptw-print-record", JSON.stringify(record));
    window.open("/print/izin-kerja-ptw", "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-2" data-testid={`ptw-view-${record.id}`} onClick={() => setOpen(true)}><Eye className="size-4" /> View</Button>
      <DialogContent className="ptw-print-dialog max-w-6xl bg-slate-100 p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              overflow: visible !important;
              height: auto !important;
              width: auto !important;
            }

            body * { visibility: hidden !important; }

            .ptw-print-sheet,
            .ptw-print-sheet * { visibility: visible !important; }

            [data-slot="sidebar-wrapper"],
            [data-slot="dialog-overlay"],
            [data-slot="dialog-close"],
            [role="dialog"] > button,
            .no-print { display: none !important; }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            div[data-radix-portal],
            div[data-radix-portal] > div,
            div[role="presentation"],
            [data-slot="dialog-portal"],
            [data-slot="dialog-content"],
            .ptw-print-dialog {
              position: static !important;
              left: auto !important;
              top: auto !important;
              right: auto !important;
              bottom: auto !important;
              inset: auto !important;
              transform: none !important;
              translate: none !important;
              display: block !important;
              width: auto !important;
              max-width: none !important;
              min-width: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
              overflow: visible !important;
            }

            .ptw-print-shell {
              position: static !important;
              display: block !important;
              width: 194mm !important;
              max-width: 194mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              overflow: visible !important;
              background: white !important;
            }

            .ptw-print-sheet {
              position: static !important;
              display: block !important;
              width: 194mm !important;
              max-width: 194mm !important;
              min-width: 0 !important;
              margin: 0 auto !important;
              padding: 6mm !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              overflow: visible !important;
              border-radius: 0 !important;
              transform: none !important;
            }

            .ptw-print-sheet .absolute { position: absolute !important; }
            .ptw-print-sheet .grid { gap: 4mm !important; }
            .ptw-print-sheet .rounded-2xl {
              border-radius: 10px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        ` }} />
        <DialogHeader className="border-b bg-white px-6 py-4 no-print">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle>Permit to Work Detail</DialogTitle>
              <DialogDescription>{record.projectName}</DialogDescription>
            </div>
            <div className="flex gap-2 pr-8">
              <Button size="sm" className="gap-2 bg-[#1a2332] text-white hover:bg-[#1a2332]/90" onClick={openPrintPage}><Download className="size-4" /> Download PDF</Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={openPrintPage}><Printer className="size-4" /> Cetak Dokumen</Button>
            </div>
          </div>
        </DialogHeader>
        <div className="ptw-print-shell px-6 py-6">
          <div className="ptw-print-sheet relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="pointer-events-none absolute right-12 top-12 opacity-10"><ShieldCheck className="size-48" /></div>
            <div className="flex items-center gap-6 border-b border-slate-200 pb-6">
              <Image src="/cp_logo-removebg-preview.png" alt="PT Chitra Paratama Logo" width={120} height={60} className="shrink-0 object-contain" />
              <div>
                <h1 className="font-display text-2xl font-black uppercase tracking-tight text-slate-900">PT. CHITRA PARATAMA</h1>
                <p className="text-sm font-bold tracking-wide text-blue-700">SAFETY FIRST | COLLABORATE -INNOVATE - DOMINATE</p>
                <p className="mt-1 text-[10px] font-bold text-slate-600">OFFICIAL HSE SYSTEM</p>
              </div>
              <div className="ml-auto hidden sm:block"><div className="flex size-16 rotate-12 items-center justify-center rounded-full border-2 border-slate-800 text-center text-[10px] font-bold leading-tight">VERIFIED<br />DOCUMENT</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-6 md:grid-cols-6">
              <InfoMini label="Document ID" value={record.id} />
              <InfoMini label="Classification" value="Permit to Work" />
              <InfoMini label="Location / Site" value={record.location} />
              <InfoMini label="Date / Period" value={`${formatDate(record.startDate)} ${record.startTime}`} />
              <InfoMini label="PIC / Auditor" value={record.authorizedBy} />
              <div><p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400">Doc Status</p><Pill className={statusTone[record.status]}>{record.status}</Pill></div>
            </div>
            <div className="flex flex-col gap-6 py-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-600">Permit to Work ({record.permitType})</p>
                <h2 className="mb-4 font-display text-3xl font-black uppercase leading-tight text-slate-900">{record.projectName}</h2>
                <div className="flex flex-wrap gap-2"><Badge className="rounded-md bg-slate-900 text-white">ID: {record.id}</Badge><Badge variant="outline" className="rounded-md bg-slate-50 uppercase">{record.area}</Badge><Badge variant="outline" className="rounded-md border-blue-200 bg-blue-50 text-blue-700">📍 {record.location}</Badge></div>
              </div>
              <div className={cn("rounded-xl border-2 px-6 py-4 text-center shadow-sm", record.risk === "Critical" ? "border-red-200 bg-red-50 text-red-700" : record.risk === "High" ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "border-green-200 bg-green-50 text-green-700")}><p className="text-2xl font-black leading-none">{record.risk}</p><p className="mt-1 text-xs font-bold opacity-80">RISK</p></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><h3 className="mb-5 text-sm font-bold uppercase tracking-wide text-slate-700">Work Info & Location</h3><div className="grid gap-4 text-sm md:grid-cols-2"><Info label="Project / Site" value={record.projectName} /><Info label="Specific Location" value={`${record.location} (${record.area})`} /><Info label="Valid From" value={`${formatDate(record.startDate)} ${record.startTime}`} /><Info label="Valid Until" value={`${formatDate(record.endDate)} ${record.endTime}`} /></div></section>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Detailed Description</h3><p className="text-sm font-medium leading-relaxed text-slate-700">{record.description}</p></section>
                <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"><div className="absolute left-0 top-0 h-full w-1 bg-blue-500" /><h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-blue-700"><ShieldCheck className="size-4" /> Langkah Pengendalian</h3><ul className="space-y-2 text-sm font-medium leading-relaxed text-slate-700">{splitLines(record.controlSteps).map((line) => <li key={line}>{line}</li>)}</ul></section>
              </div>
              <div className="space-y-6">
                <section className="rounded-2xl bg-[#1a2332] p-6 text-white shadow-lg"><p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">Authorization & Responsibility</p><InfoDark icon="👤" label="Applicant" value={record.applicant} /><InfoDark icon="✅" label="Authorized By" value={record.authorizedBy} /><InfoDark icon="📍" label="Field PIC" value={record.fieldPic} /></section>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Critical Checks</h3><div className="space-y-2 text-sm font-semibold text-slate-700"><p>Gas Test: {record.gasTestRequired ? "Required" : "Not Required"}</p><p>Isolation / LOTO: {record.isolationRequired ? "Required" : "Not Required"}</p><p>PPE: {record.ppe.join(", ")}</p></div></section>
                <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><FileText className="mx-auto size-10 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-900">{record.attachmentName}</p></section>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 text-center text-[10px] font-bold uppercase text-slate-500"><Signature label="Pemohon" name={record.applicant} /><Signature label="HSE Officer" name={record.authorizedBy} /><Signature label="Supervisor Lapangan" name={record.fieldPic} /></div>
          </div>
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

export function IzinKerjaPtwWorkspace({ users, hiradcSources }: { users: SecurityUserRecord[]; hiradcSources: HiradcPtwSource[] }) {
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
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="font-display text-lg font-black uppercase italic text-slate-900">Permit to Work Register</h2><p className="text-sm font-medium text-slate-500">Izin kerja aman untuk hot work, confined space, lifting, isolation, dan pekerjaan critical workshop.</p></div><PtwFormDialog userOptions={userOptions} hiradcSources={hiradcSources} onSave={saveRecord} /></div>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center"><div className="relative lg:w-[260px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-9 pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 lg:w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-500">Showing {filteredRecords.length} of {records.length} permits</div>
        <div className="overflow-x-auto"><Table><TableHeader className="bg-slate-50"><TableRow><TableHead>Permit Info</TableHead><TableHead>Type & Location</TableHead><TableHead>Duration</TableHead><TableHead>Applicant</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filteredRecords.map((record) => <TableRow key={record.id} className="hover:bg-slate-50/70"><TableCell className="min-w-[280px]"><div className="font-bold text-slate-900">{record.projectName}</div><div className="mt-1 text-xs font-medium text-blue-700">{record.id}</div></TableCell><TableCell className="min-w-[260px]"><div className="flex items-center gap-2 font-bold text-slate-900"><MapPin className="size-4 text-blue-600" /> {record.permitType}</div><div className="text-xs font-medium text-slate-500">{record.location} • {record.area}</div><Pill className={cn("mt-2", riskTone[record.risk])}>{record.risk}</Pill></TableCell><TableCell className="min-w-[150px] font-semibold text-slate-800">{formatDate(record.startDate)}<div className="text-xs text-slate-500">{record.startTime} - {record.endTime}</div></TableCell><TableCell className="min-w-[220px]"><div className="flex items-center gap-2"><div className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-bold">{record.applicant.slice(0, 2).toUpperCase()}</div><div><p className="font-semibold text-slate-900">{record.applicant}</p><p className="text-xs text-slate-500">Auth: {record.authorizedBy}</p></div></div></TableCell><TableCell><Pill className={statusTone[record.status]}>{record.status}</Pill></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><PtwDocumentDialog record={record} /><PtwFormDialog record={record} userOptions={userOptions} hiradcSources={hiradcSources} onSave={saveRecord} /><Button variant="outline" size="sm" className="h-8 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => deleteRecord(record)}><Trash2 className="size-4" /> Delete</Button></div></TableCell></TableRow>)}</TableBody></Table></div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "slate" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: "slate" | "amber" | "emerald" | "rose" }) {
  const toneMap = { slate: "border-slate-200 text-slate-700", amber: "border-amber-200 text-amber-700", emerald: "border-emerald-200 text-emerald-700", rose: "border-rose-200 text-rose-700" } as const;
  return <div className={cn("rounded-2xl border bg-white p-4 shadow-sm", toneMap[tone])}><Icon className="mb-3 size-5" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="text-2xl font-black">{value}</p></div>;
}
