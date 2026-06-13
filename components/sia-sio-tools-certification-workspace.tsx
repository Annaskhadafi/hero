"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  CalendarClock,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SecurityUserRecord } from "@/lib/hero-admin";

type CertificationStatus = "Active" | "Near Expiry" | "Expired" | "Pending Review" | "Missing Attachment";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";

type ReminderSettings = {
  enabled: boolean;
  recipients: string[];
  escalationRecipients: string[];
  daysBeforeExpiry: number[];
  lastSent: string;
  nextReminder: string;
};

type CertificationRecord = {
  id: string;
  assetOrOperator: string;
  certificationType: string;
  category: string;
  subcategory: string;
  area: string;
  assetTag: string;
  permitNumber: string;
  projectLocation: string;
  pic: string;
  examiner: string;
  standard: string;
  risk: RiskLevel;
  expiryDate: string;
  status: CertificationStatus;
  attachmentName: string;
  attachmentType: string;
  attachmentPreview: string;
  reminder: ReminderSettings;
};

const initialCategories = [
  "Mobile Equipment",
  "Lifting Equipment",
  "Pressure & Pneumatic",
  "Hydraulic Tools",
  "Fire & Emergency",
  "Electrical & Hot Work",
  "Personnel License",
  "Calibration & Inspection Tools",
];

const statusOptions: CertificationStatus[] = ["Active", "Near Expiry", "Expired", "Pending Review", "Missing Attachment"];
const riskOptions: RiskLevel[] = ["Low", "Medium", "High", "Critical"];

const fallbackUserOptions = [
  "HSE Superintendent",
  "Workshop Supervisor Tire Repair",
  "Workshop Supervisor Tire Service",
  "Tire Repair Planner",
  "Tire Service Lead Hand",
  "Maintenance Admin",
  "Emergency Response Team",
  "Site Manager",
];

const initialRecords: CertificationRecord[] = [
  {
    id: "CERT-FLT-001",
    assetOrOperator: "Forklift Toyota 3 Ton / Operator Suryadi",
    certificationType: "SIO (Personel) + Unit Permit",
    category: "Mobile Equipment",
    subcategory: "Forklift Workshop",
    area: "Tire Repair Bay",
    assetTag: "FLT-TRB-03",
    permitNumber: "SIO-FLT/TRB/2026/001",
    projectLocation: "Workshop Tire Mining - Main Bay",
    pic: "Workshop Supervisor Tire Repair",
    examiner: "Disnaker Vendor / HSE Superintendent",
    standard: "Disnaker + Internal HSE Workshop Permit",
    risk: "High",
    expiryDate: "2026-07-15",
    status: "Near Expiry",
    attachmentName: "SIO Forklift Suryadi - FLT-TRB-03.pdf",
    attachmentType: "PDF Certificate",
    attachmentPreview: "SIO forklift operator, unit permit, inspection checklist, and competency evidence.",
    reminder: {
      enabled: true,
      recipients: ["Workshop Supervisor Tire Repair", "HSE Superintendent", "Maintenance Admin"],
      escalationRecipients: ["Site Manager"],
      daysBeforeExpiry: [90, 60, 30, 14, 7, 1],
      lastSent: "2026-05-16",
      nextReminder: "2026-06-15",
    },
  },
  {
    id: "CERT-HYD-002",
    assetOrOperator: "Hydrant Line & Fire Pump - Tire Service Area",
    certificationType: "Inspection Certificate",
    category: "Fire & Emergency",
    subcategory: "Hydrant & Fire Pump",
    area: "Tire Service Bay",
    assetTag: "HYD-TSB-01",
    permitNumber: "HSE-FIRE/TSB/2026/014",
    projectLocation: "Workshop Tire Mining - Tire Service Bay",
    pic: "Emergency Response Team",
    examiner: "HSE Fire Inspector",
    standard: "Internal HSE Fire Protection + Vendor Flow Test",
    risk: "Critical",
    expiryDate: "2026-06-20",
    status: "Near Expiry",
    attachmentName: "Hydrant Flow Test Tire Service Bay.jpg",
    attachmentType: "Image Evidence",
    attachmentPreview: "Hydrant flow test, fire pump pressure reading, APAR readiness, and emergency response sign-off.",
    reminder: {
      enabled: true,
      recipients: ["HSE Superintendent", "Emergency Response Team", "Workshop Supervisor Tire Service"],
      escalationRecipients: ["Site Manager"],
      daysBeforeExpiry: [90, 60, 30, 14, 7, 3, 1],
      lastSent: "2026-05-21",
      nextReminder: "2026-06-06",
    },
  },
  {
    id: "CERT-TOR-003",
    assetOrOperator: "Torque Multiplier Norbar 3/4 Inch",
    certificationType: "Calibration Certificate",
    category: "Hydraulic Tools",
    subcategory: "Torque Tool Calibration",
    area: "Tire Service Bay",
    assetTag: "TORQ-TS-09",
    permitNumber: "CAL-TORQ/2026/044",
    projectLocation: "Workshop Tire Mining - Tool Store",
    pic: "Tire Service Lead Hand",
    examiner: "External Calibration Vendor",
    standard: "OEM Calibration + Internal Critical Tool Register",
    risk: "High",
    expiryDate: "2026-10-30",
    status: "Active",
    attachmentName: "Calibration Torque Multiplier TORQ-TS-09.pdf",
    attachmentType: "PDF Certificate",
    attachmentPreview: "Calibration value, tolerance result, serial number, and next due date.",
    reminder: {
      enabled: true,
      recipients: ["Tire Service Lead Hand", "Maintenance Admin"],
      escalationRecipients: ["Workshop Supervisor Tire Service"],
      daysBeforeExpiry: [60, 30, 14, 7],
      lastSent: "-",
      nextReminder: "2026-08-31",
    },
  },
  {
    id: "CERT-COM-004",
    assetOrOperator: "Air Receiver Compressor 500L",
    certificationType: "Pressure Vessel Certificate",
    category: "Pressure & Pneumatic",
    subcategory: "Air Receiver / Compressor",
    area: "Tire Repair Bay",
    assetTag: "AIR-REC-02",
    permitNumber: "-",
    projectLocation: "Workshop Tire Mining - Compressor Room",
    pic: "Workshop Supervisor Tire Repair",
    examiner: "Pending Vendor Inspection",
    standard: "Pressure Vessel Inspection + Internal HSE Checklist",
    risk: "Critical",
    expiryDate: "2026-05-26",
    status: "Missing Attachment",
    attachmentName: "Belum ada attachment",
    attachmentType: "Missing",
    attachmentPreview: "Certificate belum diunggah. Wajib attach pressure test certificate sebelum operasi penuh.",
    reminder: {
      enabled: true,
      recipients: ["Workshop Supervisor Tire Repair", "HSE Superintendent"],
      escalationRecipients: ["Site Manager"],
      daysBeforeExpiry: [90, 60, 30, 14, 7, 1],
      lastSent: "2026-05-25",
      nextReminder: "Follow up overdue",
    },
  },
];

const SIA_SIO_STORAGE_KEY = 'mobile-sia-sio-records';

const statusTone: Record<CertificationStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Near Expiry": "bg-amber-50 text-amber-700 ring-amber-200",
  Expired: "bg-rose-50 text-rose-700 ring-rose-200",
  "Pending Review": "bg-sky-50 text-sky-700 ring-sky-200",
  "Missing Attachment": "bg-orange-50 text-orange-700 ring-orange-200",
};

const riskTone: Record<RiskLevel, string> = {
  Low: "bg-slate-50 text-slate-600 ring-slate-200",
  Medium: "bg-blue-50 text-blue-700 ring-blue-200",
  High: "bg-amber-50 text-amber-700 ring-amber-200",
  Critical: "bg-rose-50 text-rose-700 ring-rose-200",
};

function formatDate(value: string) {
  if (!value || value.includes("Follow") || value === "-") return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function readReminderDays(value: string) {
  const days = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

  return days.length ? days : [60, 30, 14, 7];
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", className)}>{children}</span>;
}

function UserMultiSelect({ value, onChange, options }: { value: string[]; onChange: (next: string[]) => void; options: string[] }) {
  const [selected, setSelected] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Combobox value={selected} onChange={setSelected} options={options} placeholder="Pilih user penerima" className="h-10 bg-white" allowCustom />
        <Button type="button" variant="outline" className="h-10" onClick={() => { if (selected && !value.includes(selected)) onChange([...value, selected]); setSelected(""); }}>
          <Plus className="mr-2 size-4" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <button key={item} type="button" onClick={() => onChange(value.filter((entry) => entry !== item))} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700">
            {item} ×
          </button>
        ))}
      </div>
    </div>
  );
}

function CertificationDialog({ record }: { record: CertificationRecord }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8 gap-2"><Eye className="size-4" /> View</Button></DialogTrigger>
            <DialogContent className="max-w-6xl bg-slate-100 p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden !important; }
            .sia-sio-print-sheet, .sia-sio-print-sheet * { visibility: visible !important; }
            [data-slot="sidebar-wrapper"], [data-slot="dialog-overlay"], .no-print { display: none !important; }
            body { background: white !important; overflow: visible !important; height: auto !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            div[data-radix-portal], div[data-radix-portal] > div, div[role="presentation"] { position: static !important; transform: none !important; inset: auto !important; width: auto !important; height: auto !important; display: block !important; }
            [data-slot="dialog-content"] { position: static !important; transform: none !important; inset: auto !important; width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border: none !important; padding: 0 !important; background: white !important; }
            .sia-sio-print-sheet { position: static !important; width: 100% !important; max-width: 210mm !important; margin: 0 auto !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          }
        ` }} />
        <DialogHeader className="border-b bg-white px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle>Certificate Preview</DialogTitle>
              <DialogDescription>{record.assetOrOperator}</DialogDescription>
            </div>
            <div className="flex gap-2 pr-8">
              <Button size="sm" className="gap-2 bg-[#1a2332] text-white hover:bg-[#1a2332]/90" onClick={handlePrint}><Download className="size-4" /> Download PDF</Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={handlePrint}><Printer className="size-4" /> Cetak Dokumen</Button>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-6 py-6">
          <div className="sia-sio-print-sheet relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="pointer-events-none absolute right-12 top-12 opacity-10"><ShieldCheck className="size-48" /></div>
            <div className="flex items-center gap-6 border-b border-slate-200 pb-6">
              <Image src="/cp_logo-removebg-preview.png" alt="PT Chitra Paratama Logo" width={120} height={60} className="shrink-0 object-contain" />
              <div>
                <h1 className="font-display text-2xl font-black uppercase tracking-tight text-slate-900">PT. CHITRA PARATAMA</h1>
                <p className="text-sm font-bold tracking-wide text-blue-700">SAFETY FIRST | COLLABORATE -INNOVATE - DOMINATE</p>
                <p className="mt-1 text-[10px] font-bold text-slate-600">OFFICIAL HSE SYSTEM</p>
              </div>
              <div className="ml-auto hidden sm:block">
                <div className="flex size-16 rotate-12 items-center justify-center rounded-full border-2 border-slate-800 text-center text-[10px] font-bold leading-tight">VERIFIED<br />DOCUMENT</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-6 md:grid-cols-6">
              <div>Document ID<br /><span className="text-slate-900">{record.id}</span></div>
              <div>Classification<br /><span className="text-slate-900">{record.category}</span></div>
              <div>Location / Site<br /><span className="text-slate-900">{record.area}</span></div>
              <div>Date / Period<br /><span className="text-slate-900">{formatDate(record.expiryDate)}</span></div>
              <div>PIC / Auditor<br /><span className="text-slate-900">{record.examiner}</span></div>
              <div>Status<br /><Pill className={statusTone[record.status]}>{record.status}</Pill></div>
            </div>
            <div className="flex flex-col gap-6 py-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-600">Workshop Tire Certification Control</p>
                <h2 className="mb-4 font-display text-3xl font-black uppercase leading-tight text-slate-900">{record.assetOrOperator}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-md bg-slate-900 text-white">ID: {record.id}</Badge>
                  <Badge variant="outline" className="rounded-md bg-slate-50 uppercase">{record.certificationType}</Badge>
                  <Badge variant="outline" className="rounded-md border-blue-200 bg-blue-50 text-blue-700">📍 {record.projectLocation}</Badge>
                </div>
              </div>
              <div className="text-left lg:text-right">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Risk & Expiry</p>
                <div className={cn("rounded-xl border-2 px-6 py-4 text-center shadow-sm", record.risk === "Critical" ? "border-red-200 bg-red-50 text-red-700" : record.risk === "High" ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "border-green-200 bg-green-50 text-green-700")}>
                  <p className="text-2xl font-black leading-none">{record.risk}</p>
                  <p className="mt-1 text-xs font-bold opacity-80">RISK</p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.42fr]">
              <div className="rounded-2xl bg-slate-50 p-5">
                <h5 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><ShieldCheck className="size-4" /> Identitas & Validitas Sertifikasi</h5>
                <div className="grid gap-4 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 md:grid-cols-2">
                  <div>Tipe Sertifikat<br /><span className="text-slate-900">{record.certificationType}</span></div>
                  <div>Kategori / Klasifikasi<br /><span className="text-slate-900">{record.subcategory}</span></div>
                  <div>Nomor Seri / Izin<br /><span className="text-blue-700">{record.permitNumber}</span></div>
                  <div>Proyek / Penempatan<br /><span className="text-slate-900">{record.projectLocation}</span></div>
                  <div>PIC / Owner<br /><span className="text-slate-900">{record.pic}</span></div>
                  <div>Standard<br /><span className="text-slate-900">{record.standard}</span></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Masa Berlaku Dokumen</p><p className="mt-3 text-lg font-black text-slate-900">{formatDate(record.expiryDate)}</p><p className="text-xs font-bold uppercase text-slate-500">Expiry Date</p></div>
                <div className="rounded-2xl bg-slate-900 p-4 text-white"><div className="flex items-center gap-3"><div className="grid size-16 place-items-center rounded-lg bg-white text-xs font-black text-slate-900">QR</div><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">Digital<br />Signature<br />Verified</div></div></div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500"><FileText className="size-4" /> Evidence & Certification File Preview</p><p className="mt-1 text-sm font-semibold text-slate-700">{record.attachmentName}</p></div>
                <div className="flex gap-2"><Button size="sm" className="gap-2" onClick={handlePrint}><Download className="size-4" /> Download PDF</Button><Button size="sm" variant="outline" className="gap-2" onClick={handlePrint}><Printer className="size-4" /> Cetak Dokumen</Button></div>
              </div>
              <div className="grid min-h-56 place-items-center rounded-xl bg-white p-6 text-center shadow-inner"><div><FileText className="mx-auto size-14 text-slate-300" /><p className="mt-3 text-4xl font-black tracking-widest text-slate-200">SAMPLE</p><p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">{record.attachmentPreview}</p></div></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddCertificationDialog({ categories, onAddCategory, onSave, userOptions }: { categories: string[]; onAddCategory: (category: string) => void; onSave: (record: CertificationRecord) => void; userOptions: string[] }) {
  const [assetOrOperator, setAssetOrOperator] = useState("");
  const [certificationType, setCertificationType] = useState("SIO");
  const [category, setCategory] = useState("Fire & Emergency");
  const [subcategory, setSubcategory] = useState("");
  const [area, setArea] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [risk, setRisk] = useState<RiskLevel>("High");
  const [standard, setStandard] = useState("");
  const [recipients, setRecipients] = useState<string[]>(["HSE Superintendent", "Workshop Supervisor Tire Repair"]);
  const [escalations, setEscalations] = useState<string[]>(["Site Manager"]);
  const [days, setDays] = useState("90, 60, 30, 14, 7, 1");
  const [enabled, setEnabled] = useState(true);

  return (
    <Dialog>
      <DialogTrigger asChild><Button className="h-10 gap-2 bg-blue-600 text-white hover:bg-blue-700"><Plus className="size-4" /> Tambah Sertifikasi</Button></DialogTrigger>
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader><DialogTitle>Tambah Sertifikasi SIA/SIO & Tools</DialogTitle><DialogDescription>Form untuk Tire Service, Tire Repair, forklift, hydrant, tools, dan sertifikasi workshop mining.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Nama alat / operator</Label><Input value={assetOrOperator} onChange={(event) => setAssetOrOperator(event.target.value)} placeholder="Contoh: Forklift Toyota 3 Ton / Operator Suryadi" /></div>
          <div className="space-y-2"><Label>Tipe sertifikasi</Label><Input value={certificationType} onChange={(event) => setCertificationType(event.target.value)} placeholder="SIO, SIA, Calibration, Inspection Certificate" /></div>
          <div className="space-y-2"><Label>Kategori (combobox, bisa tambah baru)</Label><Combobox value={category} onChange={(next) => { setCategory(next); onAddCategory(next); }} options={categories} placeholder="Pilih / tambah kategori" className="h-10 bg-white" allowCustom /></div>
          <div className="space-y-2"><Label>Subkategori</Label><Input value={subcategory} onChange={(event) => setSubcategory(event.target.value)} placeholder="Forklift, Hydrant, Torque Tool, Compressor" /></div>
          <div className="space-y-2"><Label>Area workshop</Label><Input value={area} onChange={(event) => setArea(event.target.value)} placeholder="Tire Repair Bay, Tire Service Bay, Tool Store" /></div>
          <div className="space-y-2"><Label>Asset tag / unit code</Label><Input value={assetTag} onChange={(event) => setAssetTag(event.target.value)} placeholder="FLT-TRB-03" /></div>
          <div className="space-y-2"><Label>Nomor seri / izin</Label><Input value={permitNumber} onChange={(event) => setPermitNumber(event.target.value)} placeholder="SIO-FLT/TRB/2026/001" /></div>
          <div className="space-y-2"><Label>Tanggal kadaluarsa</Label><Input value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} type="date" /></div>
          <div className="space-y-2"><Label>Risk level</Label><Select value={risk} onValueChange={(value) => setRisk(value as RiskLevel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Standard pemeriksaan</Label><Input value={standard} onChange={(event) => setStandard(event.target.value)} placeholder="Disnaker, OEM, Vendor Calibration, Internal HSE" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Upload lampiran certificate/dokumen</Label><div className="grid min-h-28 place-items-center rounded-xl border border-dashed bg-slate-50 text-center text-sm font-semibold text-slate-500"><UploadCloud className="mb-2 size-6" /> Pilih PDF / gambar sertifikat</div></div>
        </div>
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between"><div><h4 className="font-display font-bold">Reminder Settings</h4><p className="text-sm text-slate-500">Atur siapa yang dapat reminder dan berapa hari sebelum expired.</p></div><Switch checked={enabled} onCheckedChange={setEnabled} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Reminder ke user</Label><UserMultiSelect value={recipients} onChange={setRecipients} options={userOptions} /></div>
            <div className="space-y-2"><Label>Escalation recipient</Label><UserMultiSelect value={escalations} onChange={setEscalations} options={userOptions} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Hari sebelum expired</Label><Input value={days} onChange={(event) => setDays(event.target.value)} placeholder="90, 60, 30, 14, 7, 1" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline">Batal</Button><Button onClick={() => onSave({ id: `CERT-${Date.now()}`, assetOrOperator, certificationType, category, subcategory, area, assetTag, permitNumber, projectLocation: area, pic: recipients[0] ?? '', examiner: 'HSE Inspector', standard, risk, expiryDate: expiryDate || new Date().toISOString().slice(0, 10), status: 'Pending Review', attachmentName: 'Belum ada attachment', attachmentType: 'Missing', attachmentPreview: 'Dokumen belum diunggah.', reminder: { enabled, recipients, escalationRecipients: escalations, daysBeforeExpiry: days.split(',').map((item) => Number(item.trim())).filter(Number.isFinite), lastSent: '-', nextReminder: expiryDate || '-' } })}>Simpan Data</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCertificationDialog({
  record,
  categories,
  onAddCategory,
  onSave,
  userOptions,
}: {
  record: CertificationRecord;
  categories: string[];
  onAddCategory: (category: string) => void;
  onSave: (record: CertificationRecord) => void;
  userOptions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [assetOrOperator, setAssetOrOperator] = useState(record.assetOrOperator);
  const [certificationType, setCertificationType] = useState(record.certificationType);
  const [category, setCategory] = useState(record.category);
  const [subcategory, setSubcategory] = useState(record.subcategory);
  const [area, setArea] = useState(record.area);
  const [assetTag, setAssetTag] = useState(record.assetTag);
  const [permitNumber, setPermitNumber] = useState(record.permitNumber);
  const [expiryDate, setExpiryDate] = useState(record.expiryDate);
  const [risk, setRisk] = useState<RiskLevel>(record.risk);
  const [status, setStatus] = useState<CertificationStatus>(record.status);
  const [standard, setStandard] = useState(record.standard);
  const [recipients, setRecipients] = useState(record.reminder.recipients);
  const [escalations, setEscalations] = useState(record.reminder.escalationRecipients);
  const [days, setDays] = useState(record.reminder.daysBeforeExpiry.join(", "));
  const [enabled, setEnabled] = useState(record.reminder.enabled);

  const save = () => {
    const nextCategory = category.trim() || record.category;
    onAddCategory(nextCategory);
    onSave({
      ...record,
      assetOrOperator: assetOrOperator.trim() || record.assetOrOperator,
      certificationType: certificationType.trim() || record.certificationType,
      category: nextCategory,
      subcategory: subcategory.trim() || record.subcategory,
      area: area.trim() || record.area,
      assetTag: assetTag.trim() || record.assetTag,
      permitNumber: permitNumber.trim() || record.permitNumber,
      expiryDate,
      risk,
      status,
      standard: standard.trim() || record.standard,
      reminder: { ...record.reminder, enabled, recipients, escalationRecipients: escalations, daysBeforeExpiry: readReminderDays(days) },
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2"><Pencil className="size-4" /> Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader>
          <DialogTitle>Edit Sertifikasi</DialogTitle>
          <DialogDescription>Field edit disamakan dengan form tambah sertifikasi.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Nama alat / operator</Label><Input value={assetOrOperator} onChange={(event) => setAssetOrOperator(event.target.value)} /></div>
          <div className="space-y-2"><Label>Tipe sertifikasi</Label><Input value={certificationType} onChange={(event) => setCertificationType(event.target.value)} /></div>
          <div className="space-y-2"><Label>Kategori (combobox, bisa tambah baru)</Label><Combobox value={category} onChange={(next) => { setCategory(next); onAddCategory(next); }} options={categories} placeholder="Pilih / tambah kategori" className="h-10 bg-white" allowCustom /></div>
          <div className="space-y-2"><Label>Subkategori</Label><Input value={subcategory} onChange={(event) => setSubcategory(event.target.value)} /></div>
          <div className="space-y-2"><Label>Area workshop</Label><Input value={area} onChange={(event) => setArea(event.target.value)} /></div>
          <div className="space-y-2"><Label>Asset tag / unit code</Label><Input value={assetTag} onChange={(event) => setAssetTag(event.target.value)} /></div>
          <div className="space-y-2"><Label>Nomor seri / izin</Label><Input value={permitNumber} onChange={(event) => setPermitNumber(event.target.value)} /></div>
          <div className="space-y-2"><Label>Tanggal kadaluarsa</Label><Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></div>
          <div className="space-y-2"><Label>Risk level</Label><Select value={risk} onValueChange={(value) => setRisk(value as RiskLevel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{riskOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Status validitas</Label><Select value={status} onValueChange={(value) => setStatus(value as CertificationStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2 md:col-span-2"><Label>Standard pemeriksaan</Label><Input value={standard} onChange={(event) => setStandard(event.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Upload lampiran certificate/dokumen</Label><div className="grid min-h-28 place-items-center rounded-xl border border-dashed bg-slate-50 text-center text-sm font-semibold text-slate-500"><UploadCloud className="mb-2 size-6" /> {record.attachmentName}</div></div>
        </div>
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between"><div><h4 className="font-display font-bold">Reminder Settings</h4><p className="text-sm text-slate-500">Atur siapa yang dapat reminder dan berapa hari sebelum expired.</p></div><Switch checked={enabled} onCheckedChange={setEnabled} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Reminder ke user</Label><UserMultiSelect value={recipients} onChange={setRecipients} options={userOptions} /></div>
            <div className="space-y-2"><Label>Escalation recipient</Label><UserMultiSelect value={escalations} onChange={setEscalations} options={userOptions} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Hari sebelum expired</Label><Input value={days} onChange={(event) => setDays(event.target.value)} placeholder="90, 60, 30, 14, 7, 1" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save}>Simpan Perubahan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SiaSioToolsCertificationWorkspace({ users }: { users: SecurityUserRecord[] }) {
  const userOptions = useMemo(() => {
    const options = users
      .filter((user) => user.isActive)
      .map((user) => `${user.name}${user.jobTitle ? ` — ${user.jobTitle}` : ""}${user.email ? ` (${user.email})` : ""}`)
      .filter(Boolean);

    return options.length ? options : fallbackUserOptions;
  }, [users]);

  const [records, setRecords] = useState<CertificationRecord[]>(() => {
    if (typeof window === 'undefined') return initialRecords;
    try {
      return JSON.parse(window.localStorage.getItem(SIA_SIO_STORAGE_KEY) || 'null') ?? initialRecords;
    } catch {
      return initialRecords;
    }
  });
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    return records.filter((record) => {
      const matchQuery = [record.assetOrOperator, record.permitNumber, record.assetTag, record.pic, record.area, record.category, record.subcategory].join(" ").toLowerCase().includes(normalizedQuery);
      const matchStatus = status === "all" || record.status === status;
      const matchCategory = category === "all" || record.category === category;
      return matchQuery && matchStatus && matchCategory;
    });
  }, [category, query, records, status]);

  const kpis = useMemo(() => ({
    total: records.length,
    active: records.filter((record) => record.status === "Active").length,
    nearExpiry: records.filter((record) => record.status === "Near Expiry").length,
    expired: records.filter((record) => record.status === "Expired").length,
    missingAttachment: records.filter((record) => record.status === "Missing Attachment").length,
    criticalReminder: records.filter((record) => record.risk === "Critical" && record.reminder.enabled).length,
  }), [records]);

  const handleAddCategory = (next: string) => {
    if (next && !categories.includes(next)) setCategories((current) => [...current, next]);
  };

  const handleSaveRecord = (next: CertificationRecord) => {
    setRecords((current) => {
      const exists = current.some((record) => record.id === next.id);
      const updated = exists ? current.map((record) => (record.id === next.id ? next : record)) : [next, ...current];
      window.localStorage.setItem(SIA_SIO_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteRecord = (record: CertificationRecord) => {
    if (confirm(`Hapus sertifikasi ${record.assetOrOperator}?`)) {
      setRecords((current) => {
        const updated = current.filter((item) => item.id !== record.id);
        window.localStorage.setItem(SIA_SIO_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><BadgeCheck className="mb-3 size-5 text-slate-500" /><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Total</p><p className="text-2xl font-black">{kpis.total}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"><ShieldCheck className="mb-3 size-5 text-emerald-600" /><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Active</p><p className="text-2xl font-black text-emerald-700">{kpis.active}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm"><CalendarClock className="mb-3 size-5 text-amber-600" /><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Near Expiry</p><p className="text-2xl font-black text-amber-700">{kpis.nearExpiry}</p></div>
        <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm"><AlertTriangle className="mb-3 size-5 text-rose-600" /><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Expired</p><p className="text-2xl font-black text-rose-700">{kpis.expired}</p></div>
        <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm"><FileText className="mb-3 size-5 text-orange-600" /><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Missing Doc</p><p className="text-2xl font-black text-orange-700">{kpis.missingAttachment}</p></div>
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm"><BellRing className="mb-3 size-5 text-blue-600" /><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Critical Reminder</p><p className="text-2xl font-black text-blue-700">{kpis.criticalReminder}</p></div>
      </div>
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-slate-50 p-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="font-display text-lg font-black text-slate-900">Workshop Tire Certification Register</h2><p className="text-sm font-medium text-slate-500">Forklift, hydrant, pressure tools, hydraulic tools, lifting equipment, dan personnel license.</p></div><AddCertificationDialog categories={categories} onAddCategory={handleAddCategory} onSave={handleSaveRecord} userOptions={userOptions} /></div>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative lg:w-[260px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-9 pl-9" /></div>
          <Select value={category} onValueChange={setCategory}><SelectTrigger className="h-9 lg:w-[240px]"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All Category</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 lg:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.keys(statusTone).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" className="h-9 gap-2"><Settings2 className="size-4" /> Preset</Button><Button variant="outline" className="h-9 gap-2"><Download className="size-4" /> Excel</Button>
        </div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-500">Showing {filteredRecords.length} of {records.length} certifications</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50"><TableRow><TableHead>Nama Alat / Operator</TableHead><TableHead>Kategori</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead><TableHead>Reminder</TableHead><TableHead>Dokumen</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="min-w-[320px]"><div className="font-black text-slate-900">{record.assetOrOperator}</div><div className="mt-1 flex flex-wrap gap-1"><Badge variant="secondary">{record.certificationType}</Badge><Badge variant="outline">{record.assetTag}</Badge><Badge variant="outline">{record.area}</Badge></div><div className="mt-1 text-xs font-semibold text-slate-500">{record.permitNumber}</div></TableCell>
                  <TableCell className="min-w-[220px]"><div className="font-bold text-slate-800">{record.category}</div><div className="text-xs font-semibold text-slate-500">{record.subcategory}</div><Pill className={cn("mt-2", riskTone[record.risk])}>{record.risk}</Pill></TableCell>
                  <TableCell><Pill className={statusTone[record.status]}>{record.status}</Pill></TableCell>
                  <TableCell className="min-w-[130px] font-bold text-slate-800">{formatDate(record.expiryDate)}</TableCell>
                  <TableCell className="min-w-[240px]"><div className="flex items-center gap-2 font-bold text-slate-800"><BellRing className="size-4 text-blue-600" /> {formatDate(record.reminder.nextReminder)}</div><div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500"><Users className="size-3" /> {record.reminder.recipients.length} recipients • H-{record.reminder.daysBeforeExpiry.join("/")}</div></TableCell>
                  <TableCell className="min-w-[210px]"><div className="flex items-center gap-2 font-bold text-slate-800"><FileText className="size-4 text-slate-500" /> {record.attachmentType}</div><div className="text-xs font-semibold text-slate-500">{record.attachmentName}</div></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <CertificationDialog record={record} />
                      <EditCertificationDialog record={record} categories={categories} onAddCategory={handleAddCategory} onSave={handleSaveRecord} userOptions={userOptions} />
                      <Button variant="outline" size="sm" className="h-8 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteRecord(record)}><Trash2 className="size-4" /> Delete</Button>
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










