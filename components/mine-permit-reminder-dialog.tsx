"use client";

import { useState, useEffect } from "react";
import { Clock, Send, Loader2, Settings2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sendMinePermitExpiryReminders } from "@/lib/mine-permit-reminder";

export function MinePermitReminderDialog() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({
    additionalRecipients: "",
    reminderDays: 30,
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) fetchConfig();
  }, [open]);

  async function fetchConfig() {
    setIsLoading(true);
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
        setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-dashed">
          <Settings2 className="mr-2 size-4" />
          Setting Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-600" />
            Setting Reminder Mine Permit
          </DialogTitle>
          <DialogDescription>
            Konfigurasi pengiriman email otomatis untuk peringatan Mine Permit yang akan expired.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat pengaturan...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            
            <div className="space-y-4 rounded-xl border border-border/50 bg-surface-container-lowest p-4">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">PJO / Site</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed">
                  Semua
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Penerima Utama (To)</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed">
                  Section Head sesuai dengan Master Data
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold">Email CC Tambahan (Opsional)</Label>
                <Input
                  value={config.additionalRecipients}
                  onChange={(e) => setConfig({ ...config, additionalRecipients: e.target.value })}
                  placeholder="admin.hc@hero.com"
                />
                <p className="text-muted-foreground text-xs mt-1">
                  Dipisahkan dengan koma jika lebih dari satu.
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border/50">
                <Label className="text-sm font-semibold">Batas Waktu Pengingat (Hari)</Label>
                <Input
                  type="number"
                  value={config.reminderDays}
                  onChange={(e) => setConfig({ ...config, reminderDays: parseInt(e.target.value) || 30 })}
                  className="max-w-[120px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={isSending}
                onClick={handleSendNow}
                className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                {isSending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Test Kirim Sekarang
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                  Simpan
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
