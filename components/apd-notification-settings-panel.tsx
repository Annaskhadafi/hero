"use client";

import { useState } from "react";
import { Package, Users, ShieldAlert, Wrench, Cpu } from "lucide-react";
import { EmployeeMultiSelect } from "@/components/employee-multi-select";
import {
  saveApdNotificationConfigAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

export type ApdNotificationConfigData = {
  recipientEmails: string;
  ccEmails: string;
  serviceCcEmail?: string;
  repairCcEmail?: string;
  teCcEmail?: string;
  serviceReminderEmail?: string;
  repairReminderEmail?: string;
  teReminderEmail?: string;
  isActive: boolean;
};

export function ApdNotificationSettingsPanel({
  config,
  employees,
}: {
  config: ApdNotificationConfigData;
  employees: Array<{ id: number; name: string; email: string }>;
}) {
  const [formData, setFormData] = useState<ApdNotificationConfigData>({
    recipientEmails: config.recipientEmails || "",
    ccEmails: config.ccEmails || "",
    serviceCcEmail: config.serviceCcEmail || "",
    repairCcEmail: config.repairCcEmail || "",
    teCcEmail: config.teCcEmail || "",
    serviceReminderEmail: config.serviceReminderEmail || "",
    repairReminderEmail: config.repairReminderEmail || "",
    teReminderEmail: config.teReminderEmail || "",
    isActive: config.isActive ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const emailToEmployeeMap = new Map(
    employees.map((e) => [e.email.toLowerCase().trim(), e.name])
  );

  const getRecipientNames = (emailsStr?: string) => {
    if (!emailsStr) return [];
    return emailsStr
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .map((email) => emailToEmployeeMap.get(email) || email);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData();
    fd.set("recipientEmails", formData.recipientEmails);
    fd.set("ccEmails", formData.ccEmails);
    fd.set("serviceCcEmail", formData.serviceCcEmail || "");
    fd.set("repairCcEmail", formData.repairCcEmail || "");
    fd.set("teCcEmail", formData.teCcEmail || "");
    fd.set("serviceReminderEmail", formData.serviceReminderEmail || "");
    fd.set("repairReminderEmail", formData.repairReminderEmail || "");
    fd.set("teReminderEmail", formData.teReminderEmail || "");
    fd.set("isActive", String(formData.isActive));

    const result = await saveApdNotificationConfigAction(INITIAL_STATE, fd);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    setIsSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="rounded-lg p-5 shadow-sm border border-border">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Package className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Pengaturan Notifikasi Email APD</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pengaturan tembusan (CC) email status approval dan penerima pengingat (reminder) otomatis masa pakai APD per divisi/tim.
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stream CC Recipients */}
        <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="size-4 text-primary" />
            <div>
              <h3 className="font-display text-base font-semibold">
                Tembusan (CC) Approval Berdasarkan Divisi / Tim Pemohon
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saat pengajuan APD disetujui (approved) oleh PJO/HSE/Admin, email pemberitahuan ke pemohon otomatis di-CC kan ke penanggung jawab sesuai divisi pemohon:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Tim Service */}
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Wrench className="size-3.5 text-primary" />
                <Badge variant="secondary" className="text-[0.7rem]">Tim Service</Badge>
              </div>
              <Label htmlFor="apd-service-cc" className="text-xs font-semibold">
                CC Pemohon Tim Service
              </Label>
              <EmployeeMultiSelect
                label="PIC Service"
                selectedEmails={
                  formData.serviceCcEmail
                    ? formData.serviceCcEmail.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, serviceCcEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih PIC Service..."
              />
              <div className="mt-1 text-[0.7rem]">
                {getRecipientNames(formData.serviceCcEmail).length > 0 ? (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-400">Penerima aktif: </span>
                    <span className="font-semibold text-slate-800">{getRecipientNames(formData.serviceCcEmail).join(", ")}</span>
                  </p>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Belum ada penerima yang diatur untuk divisi ini
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima CC jika pemohon APD berasal dari tim/seksi Service.
              </p>
            </div>

            {/* Tim Repair / Retread */}
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldAlert className="size-3.5 text-amber-600" />
                <Badge variant="secondary" className="text-[0.7rem]">Repair / Retread</Badge>
              </div>
              <Label htmlFor="apd-repair-cc" className="text-xs font-semibold">
                CC Pemohon Repair / Retread
              </Label>
              <EmployeeMultiSelect
                label="PIC Repair"
                selectedEmails={
                  formData.repairCcEmail
                    ? formData.repairCcEmail.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, repairCcEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih PIC Repair..."
              />
              <div className="mt-1 text-[0.7rem]">
                {getRecipientNames(formData.repairCcEmail).length > 0 ? (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-400">Penerima aktif: </span>
                    <span className="font-semibold text-slate-800">{getRecipientNames(formData.repairCcEmail).join(", ")}</span>
                  </p>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Belum ada penerima yang diatur untuk divisi ini
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima CC jika pemohon APD berasal dari tim/seksi Repair / Retread.
              </p>
            </div>

            {/* Tim TE */}
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Cpu className="size-3.5 text-blue-600" />
                <Badge variant="secondary" className="text-[0.7rem]">Technical Operation (TE)</Badge>
              </div>
              <Label htmlFor="apd-te-cc" className="text-xs font-semibold">
                CC Pemohon Technical Operation (TE)
              </Label>
              <EmployeeMultiSelect
                label="PIC TE"
                selectedEmails={
                  formData.teCcEmail
                    ? formData.teCcEmail.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, teCcEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih PIC TE..."
              />
              <div className="mt-1 text-[0.7rem]">
                {getRecipientNames(formData.teCcEmail).length > 0 ? (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-400">Penerima aktif: </span>
                    <span className="font-semibold text-slate-800">{getRecipientNames(formData.teCcEmail).join(", ")}</span>
                  </p>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Belum ada penerima yang diatur untuk divisi ini
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima CC jika pemohon APD berasal dari tim/seksi Technical Operation.
              </p>
            </div>
          </div>
        </Card>

        {/* Reminder Recipients by Division */}
        <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="size-4 text-primary" />
            <div>
              <h3 className="font-display text-base font-semibold">
                Penerima Utama Reminder Masa Pakai APD per Divisi / Tim
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Email pengingat / reminder otomatis masa pakai APD (8 bulan) dikirimkan khusus ke penanggung jawab sesuai divisi masing-masing karyawan:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Reminder Tim Service */}
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Wrench className="size-3.5 text-primary" />
                <Badge variant="secondary" className="text-[0.7rem]">Tim Service</Badge>
              </div>
              <Label htmlFor="apd-service-reminder" className="text-xs font-semibold">
                Reminder Karyawan Tim Service
              </Label>
              <EmployeeMultiSelect
                label="PIC Reminder Service"
                selectedEmails={
                  formData.serviceReminderEmail
                    ? formData.serviceReminderEmail.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, serviceReminderEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih PIC Service..."
              />
              <div className="mt-1 text-[0.7rem]">
                {getRecipientNames(formData.serviceReminderEmail).length > 0 ? (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-400">Penerima aktif: </span>
                    <span className="font-semibold text-slate-800">{getRecipientNames(formData.serviceReminderEmail).join(", ")}</span>
                  </p>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Belum ada penerima yang diatur untuk divisi ini
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima reminder masa pakai APD untuk karyawan divisi/seksi Service.
              </p>
            </div>

            {/* Reminder Tim Repair / Retread */}
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldAlert className="size-3.5 text-amber-600" />
                <Badge variant="secondary" className="text-[0.7rem]">Repair / Retread</Badge>
              </div>
              <Label htmlFor="apd-repair-reminder" className="text-xs font-semibold">
                Reminder Karyawan Repair / Retread
              </Label>
              <EmployeeMultiSelect
                label="PIC Reminder Repair"
                selectedEmails={
                  formData.repairReminderEmail
                    ? formData.repairReminderEmail.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, repairReminderEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih PIC Repair..."
              />
              <div className="mt-1 text-[0.7rem]">
                {getRecipientNames(formData.repairReminderEmail).length > 0 ? (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-400">Penerima aktif: </span>
                    <span className="font-semibold text-slate-800">{getRecipientNames(formData.repairReminderEmail).join(", ")}</span>
                  </p>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Belum ada penerima yang diatur untuk divisi ini
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima reminder masa pakai APD untuk karyawan divisi/seksi Repair / Retread.
              </p>
            </div>

            {/* Reminder Tim TE */}
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Cpu className="size-3.5 text-blue-600" />
                <Badge variant="secondary" className="text-[0.7rem]">Technical Operation (TE)</Badge>
              </div>
              <Label htmlFor="apd-te-reminder" className="text-xs font-semibold">
                Reminder Karyawan Technical Operation (TE)
              </Label>
              <EmployeeMultiSelect
                label="PIC Reminder TE"
                selectedEmails={
                  formData.teReminderEmail
                    ? formData.teReminderEmail.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, teReminderEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih PIC TE..."
              />
              <div className="mt-1 text-[0.7rem]">
                {getRecipientNames(formData.teReminderEmail).length > 0 ? (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-400">Penerima aktif: </span>
                    <span className="font-semibold text-slate-800">{getRecipientNames(formData.teReminderEmail).join(", ")}</span>
                  </p>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Belum ada penerima yang diatur untuk divisi ini
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima reminder masa pakai APD untuk karyawan divisi/seksi Technical Operation.
              </p>
            </div>
          </div>

          <div className="grid gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="apd-cc">CC Reminder APD (Opsional)</Label>
              <EmployeeMultiSelect
                label="CC reminder"
                selectedEmails={formData.ccEmails ? formData.ccEmails.split(",").map((e: string) => e.trim()).filter(Boolean) : []}
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, ccEmails: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih penerima CC reminder..."
              />
              <p className="text-xs text-muted-foreground">
                Penerima tembusan (CC) tambahan untuk seluruh email reminder masa pakai APD.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-surface-container-low p-3">
            <label className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Aktifkan pengiriman email reminder APD</p>
                <p className="text-xs text-muted-foreground">
                  Jika nonaktif, email otomatis reminder masa pakai APD tidak akan dikirimkan ke penerima di atas.
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((current) => ({ ...current, isActive: checked }))
                }
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan APD"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
