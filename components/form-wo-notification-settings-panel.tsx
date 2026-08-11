"use client";

import { useState } from "react";
import { Wrench, ShieldCheck, ArrowRight, Layers } from "lucide-react";
import { EmployeeMultiSelect } from "@/components/employee-multi-select";
import {
  saveFormWoNotificationConfigAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

export function FormWoNotificationSettingsPanel({
  config,
  employees,
}: {
  config: {
    tier1ApproverEmails: string;
    tier2ApproverEmails: string;
    tier3ApproverEmails: string;
    ccEmails: string;
    tier3ThresholdAmount: string;
    isActive: boolean;
  };
  employees: Array<{ id: number; name: string; email: string }>;
}) {
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData();
    fd.set("tier1ApproverEmails", formData.tier1ApproverEmails);
    fd.set("tier2ApproverEmails", formData.tier2ApproverEmails);
    fd.set("tier3ApproverEmails", formData.tier3ApproverEmails);
    fd.set("ccEmails", formData.ccEmails);
    fd.set("tier3ThresholdAmount", formData.tier3ThresholdAmount);
    fd.set("isActive", String(formData.isActive));

    const result = await saveFormWoNotificationConfigAction(INITIAL_STATE, fd);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    setIsSaving(false);
  }

  function parseEmails(emailString: string): string[] {
    if (!emailString) return [];
    return emailString.split(",").map((e) => e.trim()).filter(Boolean);
  }

  return (
    <Card className="rounded-lg p-5 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Wrench className="size-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">Form WO Approval Berjenjang (Multi-Tier Settings)</h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                <Layers className="size-3" /> 3 Tiers Routing
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Konfigurasi penerima persetujuan Work Order (Form WO) berjenjang berdasarkan hirarki struktur dan ambang batas nilai pengajuan (*Threshold Amount*).
            </p>
          </div>
        </div>
      </div>

      {/* Visual Workflow Steps Guidance */}
      <div className="grid gap-3 sm:grid-cols-3 rounded-xl bg-muted/40 p-4 border border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">1</span>
            Tier 1: Foreman / Supervisor
          </div>
          <p className="text-xs text-muted-foreground">Pemeriksaan teknis awal kondisi ban & estimasi perbaikan site.</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">2</span>
            Tier 2: PJO / Project Manager
          </div>
          <p className="text-xs text-muted-foreground">Otorisasi operasional site & persetujuan anggaran lapangan.</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <span className="flex size-5 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">3</span>
            Tier 3: HO / Central Manager
          </div>
          <p className="text-xs text-muted-foreground">Otorisasi akhir Head Office jika nilai WO melebihi ambang batas (*Threshold*).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Tier 1 */}
          <div className="space-y-2.5 rounded-lg border border-border/80 p-4 bg-card">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-sm text-foreground">Tier 1 Approver</Label>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">Site Level</span>
            </div>
            <EmployeeMultiSelect
              label="Tier 1 Approver"
              selectedEmails={parseEmails(formData.tier1ApproverEmails)}
              onChange={(emails: string[]) =>
                setFormData((curr) => ({ ...curr, tier1ApproverEmails: emails.join(", ") }))
              }
              employees={employees}
              placeholder="Pilih Foreman / Supervisor..."
            />
            <p className="text-xs text-muted-foreground">
              Menerima email notifikasi pengajuan WO pertama kali untuk verifikasi teknis.
            </p>
          </div>

          {/* Tier 2 */}
          <div className="space-y-2.5 rounded-lg border border-border/80 p-4 bg-card">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-sm text-foreground">Tier 2 Approver</Label>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">PJO / Manager</span>
            </div>
            <EmployeeMultiSelect
              label="Tier 2 Approver"
              selectedEmails={parseEmails(formData.tier2ApproverEmails)}
              onChange={(emails: string[]) =>
                setFormData((curr) => ({ ...curr, tier2ApproverEmails: emails.join(", ") }))
              }
              employees={employees}
              placeholder="Pilih PJO / Site Manager..."
            />
            <p className="text-xs text-muted-foreground">
              Menerima email setelah Tier 1 menyetujui, atau untuk pengesahan PJO.
            </p>
          </div>

          {/* Tier 3 */}
          <div className="space-y-2.5 rounded-lg border border-border/80 p-4 bg-card">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-sm text-foreground">Tier 3 Approver (HO)</Label>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">Head Office</span>
            </div>
            <EmployeeMultiSelect
              label="Tier 3 Approver"
              selectedEmails={parseEmails(formData.tier3ApproverEmails)}
              onChange={(emails: string[]) =>
                setFormData((curr) => ({ ...curr, tier3ApproverEmails: emails.join(", ") }))
              }
              employees={employees}
              placeholder="Pilih Manager HO / Central Service..."
            />
            <p className="text-xs text-muted-foreground">
              Wajib menyetujui jika estimasi biaya WO melebihi nilai ambang batas (*Threshold*).
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* CC Emails */}
          <div className="space-y-2">
            <Label htmlFor="wo-cc" className="font-semibold">CC Recipients (Tembusan)</Label>
            <EmployeeMultiSelect
              label="Tembusan CC"
              selectedEmails={parseEmails(formData.ccEmails)}
              onChange={(emails: string[]) =>
                setFormData((curr) => ({ ...curr, ccEmails: emails.join(", ") }))
              }
              employees={employees}
              placeholder="Pilih Admin Workshop / SAP Admin..."
            />
            <p className="text-xs text-muted-foreground">
              Alamat email yang selalu di-CC pada setiap pembaruan status Form WO.
            </p>
          </div>

          {/* Threshold Amount */}
          <div className="space-y-2">
            <Label htmlFor="wo-threshold" className="font-semibold">Tier 3 Threshold Amount (Rp)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">Rp</span>
              <Input
                id="wo-threshold"
                type="text"
                className="pl-9 font-mono"
                value={formData.tier3ThresholdAmount}
                onChange={(e) => setFormData((curr) => ({ ...curr, tier3ThresholdAmount: e.target.value }))}
                placeholder="20000000"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Nominal ambang batas perbaikan (misal `20000000` untuk WO &gt; Rp 20.000.000) yang mewajibkan persetujuan Tier 3 Head Office.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4">
          <div className="flex items-center gap-3">
            <Switch
              id="wo-active-toggle"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData((curr) => ({ ...curr, isActive: checked }))}
            />
            <Label htmlFor="wo-active-toggle" className="cursor-pointer text-sm font-semibold">
              Aktifkan sistem notifikasi & approval berjenjang Form WO
            </Label>
          </div>

          <Button type="submit" disabled={isSaving} className="min-w-[140px]">
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
