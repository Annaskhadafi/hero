"use client";

import { useState } from "react";
import { Wrench, Users, CheckCircle2 } from "lucide-react";
import { EmployeeMultiSelect } from "@/components/employee-multi-select";
import {
  saveMaterialToolsNotificationConfigAction,
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

export type MaterialToolsNotificationConfigData = {
  recipientEmails: string;
  ccEmails: string;
  isActive: boolean;
};

export function MaterialToolsNotificationSettingsPanel({
  config,
  employees,
}: {
  config: MaterialToolsNotificationConfigData;
  employees: Array<{ id: number; name: string; email: string }>;
}) {
  const [formData, setFormData] = useState<MaterialToolsNotificationConfigData>({
    recipientEmails: config.recipientEmails || "",
    ccEmails: config.ccEmails || "muhammad.akbar@chitraparatama.co.id",
    isActive: config.isActive ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData();
    fd.set("recipientEmails", formData.recipientEmails);
    fd.set("ccEmails", formData.ccEmails);
    fd.set("isActive", String(formData.isActive));

    const result = await saveMaterialToolsNotificationConfigAction(INITIAL_STATE, fd);

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
            <Wrench className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Pengaturan Notifikasi Email Material & Tools</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pengaturan tembusan (CC) email saat permohonan Material dan Tools telah disetujui hingga tahap akhir.
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CC Approval Section */}
        <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="size-4 text-primary" />
            <div>
              <h3 className="font-display text-base font-semibold">
                Tembusan (CC) Approval Final Permohonan
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saat pengajuan Material atau Tools telah disetujui sampai tahap akhir, email notifikasi persetujuan yang dikirim ke pemohon otomatis di-CC kan ke penanggung jawab yang dipilih:
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <Badge variant="secondary" className="text-[0.7rem]">PIC Material & Tools</Badge>
              </div>
              <Label htmlFor="mat-tools-cc" className="text-xs font-semibold">
                CC Pemohon Saat Disetujui (Final Approval)
              </Label>
              <EmployeeMultiSelect
                label="PIC Material & Tools"
                selectedEmails={
                  formData.ccEmails
                    ? formData.ccEmails.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, ccEmails: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih PIC Material & Tools..."
              />
              <p className="text-[0.7rem] text-muted-foreground">
                Menerima tembusan (CC) otomatis ketika pengajuan Material / Tools selesai disetujui oleh Section Head / Approver akhir.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border bg-surface-container-low p-4">
              <Label htmlFor="mat-tools-to" className="text-xs font-semibold">
                Penerima Tambahan / Global (Opsional)
              </Label>
              <EmployeeMultiSelect
                label="Penerima Tambahan"
                selectedEmails={
                  formData.recipientEmails
                    ? formData.recipientEmails.split(",").map((e: string) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, recipientEmails: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih penerima tambahan..."
              />
              <p className="text-[0.7rem] text-muted-foreground">
                Penerima tambahan yang juga akan menerima salinan notifikasi email persetujuan Material & Tools.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-surface-container-low p-3">
            <label className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Aktifkan notifikasi email Material & Tools</p>
                <p className="text-xs text-muted-foreground">
                  Jika nonaktif, email tembusan (CC) saat permohonan disetujui tidak akan dikirimkan.
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
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan Material & Tools"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
