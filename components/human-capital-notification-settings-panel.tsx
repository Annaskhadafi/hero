"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { EmployeeMultiSelect } from "@/components/employee-multi-select";
import {
  saveHumanCapitalNotificationConfigAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { toast } from "sonner";

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

export function HumanCapitalNotificationSettingsPanel({
  config,
  employees,
}: {
  config: {
    recipientEmails: string;
    ccEmails: string;
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
    fd.set("recipientEmails", formData.recipientEmails);
    fd.set("ccEmails", formData.ccEmails);
    fd.set("isActive", String(formData.isActive));

    const result = await saveHumanCapitalNotificationConfigAction(INITIAL_STATE, fd);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    setIsSaving(false);
  }

  return (
    <Card className="rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <Users className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">Human Capital Recipients</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dipakai untuk email employee master, disciplinary, performance review, dan workflow HC umum.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hc-to">Primary recipients</Label>
            <EmployeeMultiSelect
              label="penerima"
              selectedEmails={formData.recipientEmails ? formData.recipientEmails.split(",").map((e: string) => e.trim()).filter(Boolean) : []}
              onChange={(emails: string[]) =>
                setFormData((current) => ({ ...current, recipientEmails: emails.join(", ") }))
              }
              employees={employees}
              placeholder="Pilih penerima utama..."
            />
            <p className="text-xs text-muted-foreground">
              Pilih karyawan yang akan menerima notifikasi Human Capital.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hc-cc">CC recipients</Label>
            <EmployeeMultiSelect
              label="CC"
              selectedEmails={formData.ccEmails ? formData.ccEmails.split(",").map((e: string) => e.trim()).filter(Boolean) : []}
              onChange={(emails: string[]) =>
                setFormData((current) => ({ ...current, ccEmails: emails.join(", ") }))
              }
              employees={employees}
              placeholder="Pilih penerima CC..."
            />
            <p className="text-xs text-muted-foreground">
              Pilih karyawan yang akan di-CC pada notifikasi Human Capital.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-surface-container-low p-3">
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Aktifkan notifikasi email Human Capital</p>
              <p className="text-xs text-muted-foreground">
                Jika nonaktif, transaksi HC tetap tersimpan namun email global HC tidak dikirim.
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

        <div className="rounded-lg bg-surface-container-low p-3 text-sm text-muted-foreground">
          Covered events: `employee created`, `employee updated`, `disciplinary created`,
          `disciplinary status update`, `performance review created`, `performance review submitted`,
          `performance review acknowledged`.
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan Human Capital"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

