"use client";

import { useState } from "react";
import {
  Save,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Users,
  HardDrive,
  Layers,
  FlaskConical,
  AlertTriangle,
  UserCheck,
  ArrowLeftRight,
  Trash2,
  PackageCheck,
  FileText,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import {
  saveCerNotificationConfigAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

export interface CerNotificationConfigProps {
  config: {
    procurementEmail: string;
    evoDwiEmail: string;
    gaAdilaEmail: string;
    gaBagasEmail: string;
    itBimaEmail: string;
    budgetValidatorEmail: string;
    isActive: boolean;
    isTestingMode?: boolean;
    testingRecipientEmail?: string;
    testingApproverEmployeeId?: number | null;
  };
  employees: Array<{ id: number; name: string; email: string }>;
}

export function CerNotificationSettingsPanel({
  config,
  employees,
}: CerNotificationConfigProps) {
  const [formData, setFormData] = useState({
    procurementEmail: config.procurementEmail,
    evoDwiEmail: config.evoDwiEmail,
    gaAdilaEmail: config.gaAdilaEmail,
    gaBagasEmail: config.gaBagasEmail,
    itBimaEmail: config.itBimaEmail,
    budgetValidatorEmail: config.budgetValidatorEmail,
    isActive: config.isActive,
    isTestingMode: config.isTestingMode ?? true,
    testingRecipientEmail: config.testingRecipientEmail || "gilang.suryo@chitraparatama.co.id",
    testingApproverEmployeeId: config.testingApproverEmployeeId ?? 1255,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("overview");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData();
    fd.set("procurementEmail", formData.procurementEmail);
    fd.set("evoDwiEmail", formData.evoDwiEmail);
    fd.set("gaAdilaEmail", formData.gaAdilaEmail);
    fd.set("gaBagasEmail", formData.gaBagasEmail);
    fd.set("itBimaEmail", formData.itBimaEmail);
    fd.set("budgetValidatorEmail", formData.budgetValidatorEmail);
    fd.set("isActive", String(formData.isActive));
    fd.set("isTestingMode", String(formData.isTestingMode));
    fd.set("testingRecipientEmail", formData.testingRecipientEmail);
    fd.set("testingApproverEmployeeId", String(formData.testingApproverEmployeeId || 1255));

    const result = await saveCerNotificationConfigAction(INITIAL_STATE, fd);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    setIsSaving(false);
  }

  // Selected approver employee name
  const selectedApprover = employees.find(
    (e) => e.id === Number(formData.testingApproverEmployeeId || 1255)
  );

  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <Layers className="size-5.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                Asset Management Workflow
              </h2>
              {formData.isTestingMode ? (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 font-bold text-[11px] gap-1">
                  <FlaskConical className="size-3" />
                  TESTING MODE AKTIF
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 font-bold text-[11px] gap-1">
                  <CheckCircle2 className="size-3" />
                  LIVE PRODUCTION
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Pusat kendali alur persetujuan terpadu untuk 4 formulir kelompok Asset Management:{" "}
              <strong className="text-slate-700">CER (Pengadaan)</strong>,{" "}
              <strong className="text-slate-700">Asset Borrow (Peminjaman)</strong>,{" "}
              <strong className="text-slate-700">Asset Transfer (Mutasi)</strong>, dan{" "}
              <strong className="text-slate-700">Asset Disposal (Penghapusan)</strong>.
            </p>
            {/* 4 Form Quick Pills */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/70 rounded-md px-2 py-0.5">
                <FileText className="size-3" /> CER (Pengadaan)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-md px-2 py-0.5">
                <PackageCheck className="size-3" /> Asset Borrow (Peminjaman)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70 rounded-md px-2 py-0.5">
                <ArrowLeftRight className="size-3" /> Asset Transfer (Mutasi)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/70 rounded-md px-2 py-0.5">
                <Trash2 className="size-3" /> Asset Disposal (Penghapusan)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-1.5 shrink-0">
          <Label htmlFor="cer-active-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
            Notifikasi Sistem Aktif
          </Label>
          <Switch
            id="cer-active-toggle"
            checked={formData.isActive}
            onCheckedChange={(val) => setFormData((curr) => ({ ...curr, isActive: val }))}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {/* ============================================================ */}
        {/* SECTION 1: CENTRALIZED TESTING APPROVAL GUARDRAIL */}
        {/* ============================================================ */}
        <div className={`rounded-xl border-2 transition-all p-4.5 ${
          formData.isTestingMode
            ? "border-amber-400/90 bg-linear-to-br from-amber-50/70 via-white to-blue-50/40 shadow-xs"
            : "border-slate-200 bg-slate-50/50"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className={`grid size-9 place-items-center rounded-lg ${
                formData.isTestingMode ? "bg-amber-500 text-white shadow-xs" : "bg-slate-200 text-slate-600"
              }`}>
                <FlaskConical className="size-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Mode Testing Approval (Admin Override Guardrail)
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-300 bg-amber-50 text-amber-800">
                    Semua 4 Form Aset
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mengamankan proses uji coba simulasi agar penugasan approval dan email notifikasi TIDAK dikirimkan ke atasan / approver aktual.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Label htmlFor="testing-mode-toggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                {formData.isTestingMode ? "Testing Aktif (Aman)" : "Nonaktifkan Testing"}
              </Label>
              <Switch
                id="testing-mode-toggle"
                checked={formData.isTestingMode}
                onCheckedChange={(val) => setFormData((curr) => ({ ...curr, isTestingMode: val }))}
              />
            </div>
          </div>

          {/* Explanation Alert Box */}
          <div className="mt-3.5 rounded-lg border border-amber-300/80 bg-amber-50/80 p-3 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {formData.isTestingMode
                    ? "Perlindungan Testing Aktif: Approver asli TIDAK akan menerima email maupun penugasan approval!"
                    : "Peringatan: Mode Testing Nonaktif. Seluruh penugasan approval dan email akan dikirim langsung ke Approver aktual di lapangan!"}
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Ketika mode ini aktif, seluruh 4 formulir pada Asset Management Group (<strong>CER, Asset Borrow, Asset Transfer, Asset Disposal</strong>):
                  <br />
                  1. <strong>Email Notifikasi</strong>: 100% dialihkan ke Email Admin Pengujian di bawah dengan penanda subjek <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">[TESTING: Asli -&gt; ...]</code>.
                  <br />
                  2. <strong>Tugas Approval & Lonceng In-App</strong>: Ditugaskan ke Akun Approver Pengujian (<strong>{selectedApprover?.name || "Gilang Suryo Wirawan"}</strong>). Approver asli (atasan, pemegang fisik, finance, GM, direksi) tidak akan menerima gangguan.
                </p>
              </div>
            </div>
          </div>

          {/* Testing Inputs */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="testingRecipientEmail" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="size-3.5 text-amber-600" />
                Email Admin Pengujian (Email Override)
              </Label>
              <Input
                id="testingRecipientEmail"
                type="email"
                value={formData.testingRecipientEmail}
                onChange={(e) => setFormData((curr) => ({ ...curr, testingRecipientEmail: e.target.value }))}
                placeholder="gilang.suryo@chitraparatama.co.id"
                className="h-9 text-xs font-mono bg-white"
                required
              />
              <p className="text-[10px] text-slate-500">
                Semua email pengajuan approval aset (CER, Borrow, Transfer, Disposal) akan dialihkan ke alamat email ini.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="testingApproverEmployeeId" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-blue-600" />
                Akun Approver Pengujian (In-App Inbox Approver)
              </Label>
              <select
                id="testingApproverEmployeeId"
                value={String(formData.testingApproverEmployeeId || 1255)}
                onChange={(e) => setFormData((curr) => ({ ...curr, testingApproverEmployeeId: Number(e.target.value) }))}
                className="h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.email}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Penerima tugas persetujuan di tabel <code className="font-mono">hero_approvals</code> dan Inbox Approval saat testing.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: 4-FORM INTEGRATION MATRIX & SUB-TABS */}
        {/* ============================================================ */}
        <div className="space-y-4">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-slate-100 rounded-lg">
              <TabsTrigger value="overview" className="text-xs py-2 gap-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs">
                <Layers className="size-3.5" />
                Matriks 4 Form Aset
              </TabsTrigger>
              <TabsTrigger value="cer" className="text-xs py-2 gap-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs">
                <FileText className="size-3.5" />
                CER (Pengadaan)
              </TabsTrigger>
              <TabsTrigger value="borrow-transfer" className="text-xs py-2 gap-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs">
                <PackageCheck className="size-3.5" />
                Borrow & Transfer
              </TabsTrigger>
              <TabsTrigger value="disposal" className="text-xs py-2 gap-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs">
                <Trash2 className="size-3.5" />
                Disposal (Penghapusan)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW MATRIX OF ALL 4 FORMS */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs text-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-blue-600 shrink-0" />
                  <span>
                    Berikut adalah status perlindungan testing approval pada masing-masing formulir di kelompok <strong>Asset Management</strong>:
                  </span>
                </div>
                <Badge variant="outline" className="shrink-0 bg-white border-slate-300 font-semibold text-[11px]">
                  4 Modul Terintegrasi
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* 1. CER */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                        <FileText className="size-4.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">CER (Pengadaan Aset)</h4>
                        <span className="text-[10px] text-slate-400">Capital Expenditure Request</span>
                      </div>
                    </div>
                    {formData.isTestingMode ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Testing Aktif</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Live Approver</Badge>
                    )}
                  </div>
                  <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
                    Pengajuan pembelian unit & belanja modal baru dengan evaluasi anggaran, verifikasi PIC distribusi, dan BAST.
                  </p>
                  <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-[10px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alur Standar:</span>
                      <span className="font-semibold text-slate-700">Line Mgr &rarr; Dept Head &rarr; Budget &rarr; Direksi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status Testing:</span>
                      <span className="font-semibold text-amber-700">Dialihkan ke Admin (Gilang)</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Kode: <code className="font-mono text-[10px]">CER-REQ</code></span>
                    <Link href="/dashboard/assets/cer" target="_blank" className="text-blue-600 hover:underline flex items-center gap-1 font-semibold">
                      Buka Form CER <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>

                {/* 2. ASSET BORROW */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <PackageCheck className="size-4.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Asset Borrow (Peminjaman)</h4>
                        <span className="text-[10px] text-slate-400">Peminjaman & Serah Terima Alat</span>
                      </div>
                    </div>
                    {formData.isTestingMode ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Testing Aktif</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Live Approver</Badge>
                    )}
                  </div>
                  <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
                    Pengajuan pinjam pakai aset/peralatan kerja antar karyawan lengkap dengan checklist kondisi fisik unit dan batas waktu.
                  </p>
                  <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-[10px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alur Standar:</span>
                      <span className="font-semibold text-slate-700">Pemegang Aset (Asset Holder)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status Testing:</span>
                      <span className="font-semibold text-amber-700">Dialihkan ke Admin (Gilang)</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Kode: <code className="font-mono text-[10px]">BRW-REQ</code></span>
                    <Link href="/dashboard/assets/borrow" target="_blank" className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold">
                      Buka Form Borrow <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>

                {/* 3. ASSET TRANSFER */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                        <ArrowLeftRight className="size-4.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Asset Transfer (Mutasi)</h4>
                        <span className="text-[10px] text-slate-400">Mutasi Antar Site & Departemen</span>
                      </div>
                    </div>
                    {formData.isTestingMode ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Testing Aktif</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Live Approver</Badge>
                    )}
                  </div>
                  <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
                    Pemindahan hak pakai dan lokasi unit kerja antar site dengan 4 tahap persetujuan berjenjang.
                  </p>
                  <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-[10px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alur Standar:</span>
                      <span className="font-semibold text-slate-700">Holder Asal &rarr; Atasan &rarr; Dept Head &rarr; Penerima</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status Testing:</span>
                      <span className="font-semibold text-amber-700">Dialihkan ke Admin (Gilang)</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Kode: <code className="font-mono text-[10px]">TRF-REQ</code></span>
                    <Link href="/dashboard/assets/transfer" target="_blank" className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold">
                      Buka Form Transfer <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>

                {/* 4. ASSET DISPOSAL */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-rose-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                        <Trash2 className="size-4.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Asset Disposal (Penghapusan)</h4>
                        <span className="text-[10px] text-slate-400">Penghapusan Unit Rusak / Afkir</span>
                      </div>
                    </div>
                    {formData.isTestingMode ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Testing Aktif</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Live Approver</Badge>
                    )}
                  </div>
                  <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
                    Penghapusan aset afkir/rusak dari neraca dengan verifikasi nilai buku Finance (Amama Ira), GM, dan Direktur.
                  </p>
                  <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-[10px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alur Standar:</span>
                      <span className="font-semibold text-slate-700">Atasan &rarr; Finance (Amama) &rarr; GM &rarr; Direktur</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status Testing:</span>
                      <span className="font-semibold text-amber-700">Dialihkan ke Admin (Gilang)</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Kode: <code className="font-mono text-[10px]">DSP-REQ</code></span>
                    <Link href="/dashboard/assets/disposal" target="_blank" className="text-rose-600 hover:underline flex items-center gap-1 font-semibold">
                      Buka Form Disposal <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CER PIC DISTRIBUTION SETTINGS */}
            <TabsContent value="cer" className="mt-4 space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Distribusi Dokumen & PIC Pengadaan Aset (CER)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Daftar penanggung jawab fungsional untuk distribusi PDF CER full approved, konfirmasi fisik, dan BAST.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* PROCUREMENT */}
                <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-blue-600" />
                    <Label htmlFor="procurementEmail" className="text-xs font-bold text-slate-800">
                      Procurement / Purchasing Team
                    </Label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menerima PDF CER lengkap setelah status Full Approved untuk proses pembelian aset.
                  </p>
                  <Input
                    id="procurementEmail"
                    type="email"
                    value={formData.procurementEmail}
                    onChange={(e) => setFormData((curr) => ({ ...curr, procurementEmail: e.target.value }))}
                    placeholder="procurement@chitraparatama.com"
                    className="mt-1 h-9 text-xs bg-white"
                    required
                  />
                </div>

                {/* EVO DWI (ACCOUNTING & ASSET) */}
                <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-purple-600" />
                    <Label htmlFor="evoDwiEmail" className="text-xs font-bold text-slate-800">
                      Accounting & Asset Management (CC Evo Dwi)
                    </Label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menerima tembusan PDF CER full approved dan notifikasi saat barang fisik telah tiba di site.
                  </p>
                  <Input
                    id="evoDwiEmail"
                    type="email"
                    value={formData.evoDwiEmail}
                    onChange={(e) => setFormData((curr) => ({ ...curr, evoDwiEmail: e.target.value }))}
                    placeholder="evo.dwi@chitraparatama.com"
                    className="mt-1 h-9 text-xs bg-white"
                    required
                  />
                </div>

                {/* GA ADILA */}
                <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-emerald-600" />
                    <Label htmlFor="gaAdilaEmail" className="text-xs font-bold text-slate-800">
                      General Affairs (Adila Tri Arizona)
                    </Label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menerima tembusan BAST dan bertanggung jawab atas penomoran & pencatatan register inventaris GA.
                  </p>
                  <Input
                    id="gaAdilaEmail"
                    type="email"
                    value={formData.gaAdilaEmail}
                    onChange={(e) => setFormData((curr) => ({ ...curr, gaAdilaEmail: e.target.value }))}
                    placeholder="adila@chitraparatama.com"
                    className="mt-1 h-9 text-xs bg-white"
                    required
                  />
                </div>

                {/* GA BAGAS */}
                <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-emerald-600" />
                    <Label htmlFor="gaBagasEmail" className="text-xs font-bold text-slate-800">
                      General Affairs Leader (Kesuma Bagaskara)
                    </Label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menerima tembusan Berita Acara Serah Terima (BAST) untuk pengawasan fisik aset.
                  </p>
                  <Input
                    id="gaBagasEmail"
                    type="email"
                    value={formData.gaBagasEmail}
                    onChange={(e) => setFormData((curr) => ({ ...curr, gaBagasEmail: e.target.value }))}
                    placeholder="bagas@chitraparatama.com"
                    className="mt-1 h-9 text-xs bg-white"
                    required
                  />
                </div>

                {/* IT BIMA */}
                <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <HardDrive className="size-4 text-amber-600" />
                    <Label htmlFor="itBimaEmail" className="text-xs font-bold text-slate-800">
                      IT Technical Validator (Bima - SPV IT)
                    </Label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menerima penugasan approval review teknis untuk seluruh pengajuan kategori IT Device.
                  </p>
                  <Input
                    id="itBimaEmail"
                    type="email"
                    value={formData.itBimaEmail}
                    onChange={(e) => setFormData((curr) => ({ ...curr, itBimaEmail: e.target.value }))}
                    placeholder="bima@chitraparatama.com"
                    className="mt-1 h-9 text-xs bg-white"
                    required
                  />
                </div>

                {/* BUDGET VALIDATOR */}
                <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-indigo-600" />
                    <Label htmlFor="budgetValidatorEmail" className="text-xs font-bold text-slate-800">
                      Finance & Budget Controller (Amama Ira Amalia Priyono)
                    </Label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Memvalidasi ketersediaan pos anggaran CapEx sebelum diteruskan ke General Manager & Direktur.
                  </p>
                  <Input
                    id="budgetValidatorEmail"
                    type="email"
                    value={formData.budgetValidatorEmail}
                    onChange={(e) => setFormData((curr) => ({ ...curr, budgetValidatorEmail: e.target.value }))}
                    placeholder="budget.controller@chitraparatama.com"
                    className="mt-1 h-9 text-xs bg-white"
                    required
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: BORROW & TRANSFER WORKFLOW DETAILS */}
            <TabsContent value="borrow-transfer" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* BORROW DETAIL */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="size-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900">Alur Approval Asset Borrow</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Setiap peminjaman aset operasional mewajibkan persetujuan dari <strong>Pemegang Aset (Current Holder)</strong> sebelum fisik unit diserahkan.
                  </p>
                  <div className="rounded-lg bg-white border border-slate-200/80 p-3 text-[11px] space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-700">1. Pengajuan:</span>
                      <span className="text-slate-500">Peminjam mengisi unit, tanggal peminjaman, estimasi pengembalian & checklist.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-700">2. Approval:</span>
                      <span className="text-slate-500">Pemegang aset memeriksa kelayakan dan menandatangani persetujuan secara digital.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-700">3. Pengembalian:</span>
                      <span className="text-slate-500">Peminjam mengajukan return request & holder mengonfirmasi penerimaan fisik.</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[10px] text-amber-900">
                    <strong>Guardrail Testing:</strong> Persetujuan Holder dialihkan ke Admin ({selectedApprover?.name || "Gilang"}).
                  </div>
                </div>

                {/* TRANSFER DETAIL */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="size-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-900">Alur 4 Tahap Approval Asset Transfer</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Mutasi aset antar site atau departemen memerlukan rantai persetujuan 4 tingkat berurutan:
                  </p>
                  <div className="rounded-lg bg-white border border-slate-200/80 p-3 text-[11px] space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-700">Level 1:</span>
                      <span className="text-slate-500">Persetujuan Pemegang Aset Asal (Current Holder).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-700">Level 2:</span>
                      <span className="text-slate-500">Persetujuan Atasan Langsung Lokasi Asal (Supervisor / Section Head).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-700">Level 3:</span>
                      <span className="text-slate-500">Persetujuan Kepala Departemen Asal (Department Head Asal).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-700">Level 4:</span>
                      <span className="text-slate-500">Konfirmasi Penerimaan oleh Pemegang Aset Baru (Destination Holder).</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[10px] text-amber-900">
                    <strong>Guardrail Testing:</strong> Seluruh 4 tahap dialihkan ke Admin ({selectedApprover?.name || "Gilang"}).
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: DISPOSAL WORKFLOW DETAILS */}
            <TabsContent value="disposal" className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="size-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-slate-900">Alur Approval Asset Disposal (Penghapusan Aset)</h4>
                  </div>
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                    Validasi Nilai Buku & Akuntansi
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Penghapusan aset afkir atau rusak dari daftar inventaris perusahaan wajib melalui rantai verifikasi ketat untuk memastikan nilai buku dan kondisi fisik telah diaudit sebelum dihapus dari sistem:
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 mt-2">
                  <div className="rounded-lg bg-white border border-slate-200 p-3 text-[11px]">
                    <div className="font-bold text-slate-800 mb-1">Tahap 1: Atasan</div>
                    <p className="text-[10px] text-slate-500">Verifikasi kondisi fisik unit di lapangan oleh Atasan Pemohon (Section / Dept Head).</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3 text-[11px]">
                    <div className="font-bold text-purple-800 mb-1">Tahap 2: Finance & F&A</div>
                    <p className="text-[10px] text-slate-500">Audit nilai buku (book value) dan sisa depresiasi oleh Finance (Amama Ira).</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3 text-[11px]">
                    <div className="font-bold text-blue-800 mb-1">Tahap 3: GM</div>
                    <p className="text-[10px] text-slate-500">Review operasional & rekomendasi afkir oleh General Manager.</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3 text-[11px]">
                    <div className="font-bold text-emerald-800 mb-1">Tahap 4: Direktur</div>
                    <p className="text-[10px] text-slate-500">Persetujuan final Direksi & otomatis mengubah status aset menjadi DISPOSED.</p>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 mt-3 flex items-start gap-2">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Perlindungan Guardrail Testing Aktif:</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Saat sakelar testing aktif, seluruh 4 tahapan persetujuan (termasuk verifikasi Finance Amama Ira dan Direktur) dapat diuji coba dan disetujui langsung oleh Admin (<strong>{selectedApprover?.name || "Gilang"}</strong>) tanpa mengirim email atau notifikasi ke Finance/Direktur asli.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="text-[11px] text-slate-400">
            Perubahan pengaturan testing dan email langsung berlaku secara real-time untuk seluruh form Asset Management (CER, Borrow, Transfer, Disposal).
          </span>
          <Button
            type="submit"
            disabled={isSaving}
            className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 w-full sm:w-auto"
          >
            <Save className="size-3.5" />
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan Workflow Aset"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export const AssetManagementWorkflowSettingsPanel = CerNotificationSettingsPanel;
