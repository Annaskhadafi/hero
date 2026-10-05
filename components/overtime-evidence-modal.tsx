'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { OvertimeEvidenceViewer } from '@/components/overtime-evidence-viewer'
import { getOvertimeEvidenceDataAction } from '@/app/dashboard/overtime-requests/actions'
import type { OvertimeEvidenceData } from '@/lib/overtime-evidence-data'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OvertimeEvidenceModal({
  isOpen,
  onClose,
  splId,
  fallbackData = null,
}: {
  isOpen: boolean
  onClose: () => void
  splId?: number | string | null
  fallbackData?: OvertimeEvidenceData | null
}) {
  const [data, setData] = useState<OvertimeEvidenceData | null>(fallbackData || null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !splId) return
    if (fallbackData && (fallbackData.header.id === splId || fallbackData.header.splNumber === String(splId))) {
      setData(fallbackData)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError(null)

    getOvertimeEvidenceDataAction(splId)
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.data) {
          setData(res.data)
        } else {
          setError(res.error || 'Dokumen bukti SPL tidak ditemukan.')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err?.message || 'Gagal memuat galeri bukti SPL.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, splId, fallbackData])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        overlayClassName="z-[110]"
        showCloseButton={false}
        className="w-[96vw] max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 shadow-2xl overflow-x-hidden z-[120]"
      >
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Loader2 className="size-10 animate-spin text-[#003f78] mb-3" />
            <p className="text-sm font-bold text-slate-700">Memuat Galeri &amp; Bukti Foto SPL...</p>
            <p className="text-xs text-slate-400 mt-1">Mengambil lampiran dokumen digital</p>
          </div>
        ) : error ? (
          <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
            <div className="size-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Gagal Memuat Bukti</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="mt-4 rounded-xl text-xs font-bold"
            >
              Tutup
            </Button>
          </div>
        ) : data ? (
          <OvertimeEvidenceViewer data={data} isModal={true} onClose={onClose} />
        ) : (
          <div className="py-16 text-center text-xs text-slate-400">
            Tidak ada data bukti yang tersedia.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
