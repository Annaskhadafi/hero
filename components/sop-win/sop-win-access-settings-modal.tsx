"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, ShieldCheck, Clock, Download, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateSopWinAccessSettingsAction } from "@/app/dashboard/sop-win/actions"

export type SopWinAccessSettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  requestId: number
  requestNumber: string
  docTitle: string
  currentExpiryDays: number
  currentCanDownload: boolean
  onUpdated?: () => void
}

export function SopWinAccessSettingsModal({
  isOpen,
  onClose,
  requestId,
  requestNumber,
  docTitle,
  currentExpiryDays,
  currentCanDownload,
  onUpdated,
}: SopWinAccessSettingsModalProps) {
  const [expiryDays, setExpiryDays] = useState<number>(currentExpiryDays || 3)
  const [canDownload, setCanDownload] = useState<boolean>(currentCanDownload ?? true)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleSave = async () => {
    try {
      setIsLoading(true)
      const res = await updateSopWinAccessSettingsAction({
        requestId,
        expiryDays,
        canDownload,
      })

      if (!res.success) {
        throw new Error(res.error || "Gagal memperbarui pengaturan akses.")
      }

      toast.success(res.message || "Pengaturan akses dokumen berhasil diperbarui.")
      if (onUpdated) onUpdated()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
        <DialogHeader className="space-y-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-[#003461]">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
              <Settings className="size-5 text-[#003461]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Pengaturan Akses Dokumen
              </DialogTitle>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Konfigurasi izin unduh & masa berlaku untuk #{requestNumber}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Info Dokumen */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Judul Dokumen</p>
            <p className="font-semibold text-slate-900 line-clamp-2">{docTitle || "Dokumen SOP/WIN"}</p>
          </div>

          {/* Setting 1: Masa Berlaku (Hari) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="size-4 text-blue-600" /> Masa Berlaku Akses (Hari)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 1)}
                className="w-24 h-10 text-center font-bold text-sm border-slate-300 rounded-xl"
              />
              <div className="flex gap-1">
                {[1, 3, 7, 14, 30].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={expiryDays === d ? "default" : "outline"}
                    onClick={() => setExpiryDays(d)}
                    className={`h-9 text-xs px-2.5 rounded-xl font-bold ${
                      expiryDays === d ? "bg-[#003461] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {d} Hari
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Link akses pemohon akan kedaluwarsa setelah <strong className="text-slate-900">{expiryDays} hari</strong> sejak tanggal pembuatan.
            </p>
          </div>

          {/* Setting 2: Izin Unduh */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" /> Hak Akses File (Download vs View Only)
            </Label>
            <Select
              value={canDownload ? "allow" : "deny"}
              onValueChange={(val) => setCanDownload(val === "allow")}
            >
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-slate-300">
                <SelectValue placeholder="Pilih hak akses..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allow" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Download className="size-3.5 text-emerald-600" />
                    <span>Boleh Unduh (PDF Terstempel Watermarked)</span>
                  </div>
                </SelectItem>
                <SelectItem value="deny" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Eye className="size-3.5 text-amber-600" />
                    <span>Hanya Lihat (View Only - Sembunyikan Tombol Download)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">
              {canDownload
                ? "Pemohon diizinkan mengunduh file PDF terstempel watermark resmi."
                : "Pemohon hanya bisa membaca dokumen melalui browser viewer tanpa tombol unduh."}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t border-slate-100 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 text-xs rounded-xl border-slate-200 font-bold"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="h-10 text-xs rounded-xl bg-[#003461] hover:bg-[#00284d] text-white font-bold gap-2 px-5"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}
            Simpan Pengaturan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
