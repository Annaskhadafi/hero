'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, FileSignature, CheckCircle2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { getCerItemsAction, submitFinanceCheckCerAction } from '../actions'
import type { CerItem } from '@/db/schema/cer'

interface CerFinanceCheckModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cer: {
    id: number
    cerNumber: string
    subject: string
    applicantName: string
    siteName: string
    totalEstimatedPrice: string | number
  } | null
  onSuccess?: () => void
}

export function CerFinanceCheckModal({
  open,
  onOpenChange,
  cer,
  onSuccess,
}: CerFinanceCheckModalProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingItems, setLoadingItems] = useState(false)
  const [items, setItems] = useState<Array<{ id: number; description: string; qty: number; assetNumber: string; allocation?: string; holderName?: string }>>([])
  const [kelompokAset, setKelompokAset] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open && cer?.id) {
      setLoadingItems(true)

      getCerItemsAction(cer.id)
        .then((data: CerItem[]) => {
          setItems(
            data.map((item) => ({
              id: item.id,
              description: item.description,
              qty: item.qty,
              allocation: item.allocation || '',
              holderName: item.holderName || '',
              assetNumber: item.assetNumber || '',
            }))
          )
          if (data[0]?.assetGroup) {
            setKelompokAset(data[0].assetGroup)
          } else {
            setKelompokAset('')
          }
        })
        .catch((err) => {
          console.error('[cer-finance-check] Failed to load items:', err)
          toast.error('Gagal memuat rincian barang untuk penomoran aset.')
        })
        .finally(() => setLoadingItems(false))
    }
  }, [open, cer?.id])

  const handleAssetNumberChange = (id: number, val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, assetNumber: val } : item))
    )
  }

  const handleSubmit = () => {
    if (!cer?.id) return

    const trimmedCat = kelompokAset.trim()
    if (!trimmedCat) {
      toast.error('Ketik Kelompok / Kategori Aset.')
      return
    }

    const emptyNumber = items.some((it) => !it.assetNumber.trim())
    if (emptyNumber) {
      toast.error('Nomor Aset untuk setiap unit wajib diisi lengkap.')
      return
    }

    startTransition(async () => {
      const res = await submitFinanceCheckCerAction({
        cerId: cer.id,
        kelompokAset: trimmedCat,
        items: items.map((it) => ({ id: it.id, assetNumber: it.assetNumber.trim() })),
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        toast.success(res.message)
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
              <FileSignature className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Checked by Finance (Input Kelompok &amp; Nomor Aset)
              </DialogTitle>
              <DialogDescription className="text-xs">
                {cer?.cerNumber} &bull; {cer?.subject}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Summary Box */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-indigo-950">
            <p className="font-semibold">Pemeriksaan &amp; Registrasi Nomor Aset</p>
            <p className="mt-0.5 text-[11px] text-indigo-900/80">
              Pengajuan CER ini telah disetujui penuh oleh Direksi. Sebagai tahap Checked by Finance (Syamsul Bahri &amp; Evo Dwi), silakan tentukan <strong>Kelompok Aset</strong> dan input <strong>Nomor Aset</strong> resmi untuk setiap unit sebelum dokumen final diterbitkan.
            </p>
          </div>

          {/* Form Kelompok Aset (Simple Direct Text Input) */}
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <Label htmlFor="kelompok-aset" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-indigo-600" />
              Kelompok / Kategori Aset <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="kelompok-aset"
              value={kelompokAset}
              onChange={(e) => setKelompokAset(e.target.value)}
              placeholder="Ketik kategori / kelompok aset (misal: Kelompok 1 (Masa Manfaat 4 Tahun), IT Device, dll)..."
              className="h-9 text-xs bg-white border-slate-300 focus-visible:ring-indigo-500 font-medium"
              autoFocus
            />
          </div>

          {/* Form Nomor Aset Per Unit */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Nomor Aset per Unit Barang <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">
                {items.length} item pengadaan
              </span>
            </Label>

            {loadingItems ? (
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Memuat item...</span>
              </div>
            ) : items.length === 0 ? (
              <p className="py-4 text-center text-slate-400">Tidak ada item pengadaan ditemukan.</p>
            ) : (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md bg-white p-2.5 shadow-sm border border-slate-100"
                  >
                    <div className="flex items-start gap-2">
                      <span className="grid size-5 shrink-0 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{it.description}</p>
                        <p className="text-[10px] text-slate-500">
                          Qty: {it.qty} unit
                          {it.allocation && ` • Site: ${it.allocation}`}
                          {it.holderName && ` • Holder: ${it.holderName}`}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-64">
                      <Input
                        value={it.assetNumber}
                        onChange={(e) => handleAssetNumberChange(it.id, e.target.value)}
                        placeholder="Ketik Nomor Aset resmi..."
                        className="h-8 text-xs font-mono font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catatan Finance */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">Catatan Finance (Opsional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan verifikasi akun aset, depresiasi, atau nomor registrasi..."
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-9"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || loadingItems}
            className="h-9 bg-emerald-600 font-bold text-white hover:bg-emerald-700 text-xs gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Simpan &amp; Terbitkan Dokumen Resmi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
