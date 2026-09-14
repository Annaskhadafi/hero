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
    serviceCcEmail: config.serviceCcEmail || "otoleeh123@gmail.com",
    repairCcEmail: config.repairCcEmail || "zahiriarjun@gmail.com",
    teCcEmail: config.teCcEmail || "abian.husain@chitraparatama.co.id",
    isActive: config.isActive ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData();
    fd.set("recipientEmails", formData.recipientEmails);
    fd.set("ccEmails", formData.ccEmails);
    fd.set("serviceCcEmail", formData.serviceCcEmail || "");
    fd.set("repairCcEmail", formData.repairCcEmail || "");
    fd.set("teCcEmail", formData.teCcEmail || "");
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
              Pengaturan tembusan (CC) email status approval dan penerima pengingat (reminder) otomatis masa pakai APD.
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
                Tembusan (CC) Berdasarkan Divisi / Tim Pemohon
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
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima CC jika pemohon APD berasal dari tim/seksi Technical Operation.
              </p>
            </div>
          </div>
        </Card>

        {/* Reminder Recipients */}
        <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="apd-to">Penerima Utama Reminder Masa Pakai APD</Label>
              <EmployeeMultiSelect
                label="penerima reminder"
                selectedEmails={formData.recipientEmails ? formData.recipientEmails.split(",").map((e: string) => e.trim()).filter(Boolean) : []}
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, recipientEmails: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih penerima reminder..."
              />
              <p className="text-xs text-muted-foreground">
                Menerima email pengingat / reminder otomatis masa pakai APD (8 bulan).
              </p>
            </div>

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
                Penerima tembusan (CC) tambahan untuk email reminder masa pakai APD.
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
