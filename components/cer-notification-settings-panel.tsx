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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
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
              Pusat kendali alur persetujuan terpadu untuk kelompok Asset Management (<strong>CER</strong>, <strong>Peminjaman / Borrow</strong>, <strong>Mutasi / Transfer</strong>, dan <strong>Penghapusan / Disposal</strong>), serta pengaturan pengalihan testing approval admin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-1.5">
          <Label htmlFor="cer-active-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
            Notifikasi CER Aktif
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
        {/* SECTION 1: TESTING GUARDRAIL & APPROVAL OVERRIDE */}
        {/* ============================================================ */}
        <div className={`rounded-xl border-2 transition-all p-4.5 ${
          formData.isTestingMode
            ? "border-amber-400/90 bg-linear-to-br from-amber-50/70 via-white to-blue-50/40 shadow-xs"
            : "border-slate-200 bg-slate-50/50"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className={`grid size-8 place-items-center rounded-lg ${
                formData.isTestingMode ? "bg-amber-500 text-white shadow-xs" : "bg-slate-200 text-slate-600"
              }`}>
                <FlaskConical className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Mode Testing Approval (Admin Override Guardrail)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mengamankan proses uji coba sistem agar tidak mengirim email / notifikasi ke approver sebenarnya.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
                    ? "Perlindungan Testing Aktif: Approver asli TIDAK akan menerima email / lonceng!"
                    : "Peringatan: Mode Testing Nonaktif. Email dan penugasan approval akan dikirim langsung ke Approver asli!"}
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Ketika aktif, seluruh formulir pada Asset Management Group (<strong>CER, Asset Borrow, Asset Transfer, Asset Disposal</strong>):
                  <br />
                  1. <strong>Email Notifikasi</strong>: 100% dialihkan ke Email Admin Pengujian di bawah dengan penanda <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">[TESTING: Asli -&gt; ...]</code>.
                  <br />
                  2. <strong>Notifikasi Lonceng (Bell) & Inbox Approval</strong>: Tugas approval dan lonceng in-app ditugaskan ke Akun Approver Pengujian (Gilang). Approver asli (atasan, holder fisik aset, finance, direksi) tidak akan terganggu.
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
                Semua email pengajuan approval aset akan dialihkan ke alamat email ini.
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
                Penerima tugas persetujuan di tabel <code className="font-mono">hero_approvals</code> dan Inbox Approval.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: CER DOCUMENT RECIPIENTS & PIC DISTRIBUTION */}
        {/* ============================================================ */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Distribusi Dokumen & PIC Pengadaan Aset (CER)
            </h3>
            <p className="text-[11px] text-slate-500">
              Daftar penanggung jawab fungsional untuk distribusi PDF CER full approved, konfirmasi fisik, dan BAST.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
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
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="text-[11px] text-slate-400">
            Perubahan pengaturan testing dan email langsung berlaku secara real-time untuk seluruh form Asset Management.
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
