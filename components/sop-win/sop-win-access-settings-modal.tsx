"use client";

import { useState, useTransition } from "react";
import { Clock, Download, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateSopWinRequestAccessSettingsAction } from "@/app/dashboard/sop-win/actions";

interface SopWinAccessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number | string;
  requestNumber: string;
  docTitle: string;
  currentExpiryDays: number;
  currentCanDownload: boolean;
  onSuccess?: (updated: { expiryDays: number; canDownload: boolean }) => void;
}

export function SopWinAccessSettingsModal({
  isOpen,
  onClose,
  requestId,
  requestNumber,
  docTitle,
  currentExpiryDays,
  currentCanDownload,
  onSuccess,
}: SopWinAccessSettingsModalProps) {
  const [expiryDays, setExpiryDays] = useState<number>(currentExpiryDays || 3);
  const [canDownload, setCanDownload] = useState<boolean>(currentCanDownload ?? true);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await updateSopWinRequestAccessSettingsAction({
          requestId,
          expiryDays: Number(expiryDays) || 3,
          canDownload,
        });

        if (res.success) {
          toast.success("Pengaturan akses berhasil disimpan!");
          onSuccess?.({ expiryDays: Number(expiryDays) || 3, canDownload });
          onClose();
        } else {
          toast.error(res.error || "Gagal menyimpan pengaturan akses.");
        }
      } catch (err: any) {
        toast.error(err.message || "Terjadi kesalahan saat menyimpan pengaturan.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <DialogTitle>Pengaturan Akses Dokumen</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Atur masa berlaku akses dan izin pengunduhan untuk permintaan dokumen:{" "}
            <span className="font-semibold text-foreground">{requestNumber}</span> ({docTitle})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Masa Berlaku (Hari) */}
          <div className="space-y-2">
            <Label htmlFor="expiryDays" className="flex items-center gap-1.5 text-xs font-semibold">
              <Clock className="size-3.5 text-muted-foreground" />
              Masa Berlaku Akses (Hari Kerja)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="expiryDays"
                type="number"
                min={1}
                max={90}
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 1)}
                disabled={isPending}
                className="w-28 font-mono text-sm"
              />
              <span className="text-xs text-muted-foreground">Hari setelah disetujui</span>
            </div>
            <div className="flex gap-1.5 pt-1">
              {[1, 3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExpiryDays(d)}
                  className={`rounded border px-2 py-0.5 text-xs transition ${
                    expiryDays === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-slate-200 bg-muted/40 hover:bg-muted text-foreground"
                  }`}
                >
                  {d} hari
                </button>
              ))}
            </div>
          </div>

          {/* Izin Download */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="canDownload" className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <Download className="size-3.5 text-muted-foreground" />
                Izinkan Pengunduhan File Asli
              </Label>
              <p className="text-[0.7rem] text-muted-foreground">
                Jika dinonaktifkan, pemohon hanya dapat melihat dokumen secara read-only di sistem (watermarked).
              </p>
            </div>
            <Switch
              id="canDownload"
              checked={canDownload}
              onCheckedChange={setCanDownload}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-1.5">
            {isPending ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Simpan Pengaturan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
