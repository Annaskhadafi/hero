"use client";

import { useState } from "react";
import { FileText, Save, CheckCircle2, ShieldCheck, Mail, Users, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  };
  employees: Array<{ id: number; name: string; email: string }>;
}

export function CerNotificationSettingsPanel({
  config,
  employees,
}: CerNotificationConfigProps) {
  const [formData, setFormData] = useState(config);
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

    const result = await saveCerNotificationConfigAction(INITIAL_STATE, fd);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    setIsSaving(false);
  }

  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
              Pengadaan Aset (CER) — Recipients & Workflow Policy
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Konfigurasi email terpusat untuk distribusi dokumen pengadaan aset (CER PDF full approved, konfirmasi penerimaan fisik, dan berita acara serah terima BAST).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="cer-active-toggle" className="text-xs font-semibold text-slate-600">
            Notifikasi Aktif
          </Label>
          <Switch
            id="cer-active-toggle"
            checked={formData.isActive}
            onCheckedChange={(val) => setFormData((curr) => ({ ...curr, isActive: val }))}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
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
              className="mt-1 h-9 text-xs"
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
              className="mt-1 h-9 text-xs"
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
              className="mt-1 h-9 text-xs"
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
              className="mt-1 h-9 text-xs"
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
              className="mt-1 h-9 text-xs"
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
              className="mt-1 h-9 text-xs"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-[11px] text-slate-400">
            Perubahan email langsung berlaku untuk siklus approval pengadaan berikutnya.
          </span>
          <Button
            type="submit"
            disabled={isSaving}
            className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <Save className="size-3.5" />
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan CER"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
