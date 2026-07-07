"use client";

import { useState, useEffect } from "react";
import { Clock, Mail, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sendMinePermitExpiryReminders } from "@/lib/mine-permit-reminder";

export function MinePermitReminderSettingsPanel() {
  const [config, setConfig] = useState({
    additionalRecipients: "",
    reminderDays: 30,
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState<{ count: number; samples: any[] } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchPreview(config.reminderDays);
  }, [config.reminderDays]);

  async function fetchConfig() {
    try {
      const res = await fetch('/dashboard/api/mine-permit-reminder-config');
      if (res.ok) {
        const data = await res.json();
        setConfig({
          additionalRecipients: data.additionalRecipients ?? "",
          reminderDays: data.reminderDays ?? 30,
          isActive: data.isActive ?? true,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPreview(days: number) {
    try {
      const res = await fetch(`/dashboard/api/mine-permit-reminder-preview?days=${days}`);
      if (res.ok) {
        setPreview(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData();
    fd.set("additionalRecipients", config.additionalRecipients);
    fd.set("reminderDays", String(config.reminderDays));
    fd.set("isActive", String(config.isActive));

    try {
      const res = await fetch('/dashboard/api/mine-permit-reminder-config', { method: 'POST', body: fd });
      if (res.ok) {
        toast.success("Pengaturan Mine Permit Reminder berhasil disimpan.");
      } else {
        toast.error("Gagal menyimpan pengaturan.");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendNow() {
    setIsSending(true);
    try {
      const res = await sendMinePermitExpiryReminders(config.reminderDays);
      if (res.errors > 0) {
        toast.error(`Kirim selesai dengan ${res.errors} error. Sent: ${res.sent}, Skipped: ${res.skipped}`);
      } else {
        toast.success(`Berhasil mengirim ${res.sent} reminder. Skipped: ${res.skipped}`);
      }
    } catch (e) {
      toast.error("Gagal memicu pengiriman email.");
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Memuat...</div>;

  return (
    <Card className="flex flex-col overflow-hidden border-border/50">
      <div className="bg-surface-container-low border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 text-amber-600 flex size-9 items-center justify-center rounded-lg">
            <Clock className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold leading-none tracking-tight">Mine Permit Reminder</h3>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Kirim email otomatis ke manager dan tim terkait sebelum Mine Permit karyawan expired.
            </p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 p-5">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-surface-container-lowest p-4">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Aktifkan Reminder Otomatis</Label>
              <p className="text-muted-foreground text-[13px]">
                Jika aktif, cron job akan mengirimkan peringatan kedaluwarsa Mine Permit secara otomatis.
              </p>
            </div>
            <Switch
              checked={config.isActive}
              onCheckedChange={(c) => setConfig({ ...config, isActive: c })}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">Batas Waktu Pengingat (Hari)</Label>
            <Input
              type="number"
              value={config.reminderDays}
              onChange={(e) => setConfig({ ...config, reminderDays: parseInt(e.target.value) || 30 })}
              placeholder="30"
              className="max-w-[200px]"
            />
            <p className="text-muted-foreground text-[13px]">
              Email akan mulai dikirimkan saat sisa masa berlaku Mine Permit kurang dari angka hari ini.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">Email CC Tambahan (Opsional)</Label>
            <Input
              value={config.additionalRecipients}
              onChange={(e) => setConfig({ ...config, additionalRecipients: e.target.value })}
              placeholder="admin.hc@hero.com, safety@hero.com"
            />
            <p className="text-muted-foreground text-[13px]">
              Alamat email (dipisahkan dengan koma) yang akan menerima ringkasan pengingat secara keseluruhan (CC). Email personal akan dikirim ke direct manager masing-masing karyawan.
            </p>
          </div>

          {preview && (
            <div className="mt-4 rounded-xl bg-amber-50 p-4 border border-amber-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-900">
                    Pratinjau Data ({preview.count} karyawan terdampak)
                  </h4>
                  <p className="text-[13px] text-amber-700">
                    Ada {preview.count} karyawan yang masa berlaku Mine Permit-nya tersisa ≤ {config.reminderDays} hari.
                  </p>
                  {preview.samples.length > 0 && (
                    <ul className="mt-2 text-xs text-amber-800 list-disc pl-4 space-y-1">
                      {preview.samples.map(s => (
                        <li key={s.employeeId}>{s.employeeName} (Manager: {s.managerId ? 'Ada' : 'Tidak Ada'})</li>
                      ))}
                      {preview.count > preview.samples.length && <li>...dan {preview.count - preview.samples.length} lainnya</li>}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-5">
          <Button
            type="button"
            variant="outline"
            disabled={isSending}
            onClick={handleSendNow}
            className="rounded-xl border-dashed"
          >
            {isSending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            Test Kirim Sekarang
          </Button>
          <Button type="submit" disabled={isSaving} className="rounded-xl px-6">
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </Card>
  );
}
