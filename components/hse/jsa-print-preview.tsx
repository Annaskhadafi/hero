'use client'

import * as React from 'react'
import {
  Check,
  Clock,
  PenTool,
  Printer,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  HeroConfirmDialog,
  HeroFormDialog,
  HeroFormField,
  HeroTextarea,
} from '@/components/templates'
import { JsaDocumentSheet, type JsaDocumentData } from './jsa-document-sheet'
import { JsaApprovalDialog } from './jsa-approval-dialog'
import {
  quickApproveJsaAction,
  quickRejectJsaAction,
  revertJsaAction,
} from '@/app/dashboard/hse/jsa/actions'

interface JsaPrintPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: JsaDocumentData | null | undefined
  onApproved?: () => void
}

export function JsaPrintPreview({ open, onOpenChange, data, onApproved }: JsaPrintPreviewProps) {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait')
  const [approvalOpen, setApprovalOpen] = React.useState(false)
  const [isApproving, setIsApproving] = React.useState(false)
  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const [isRejecting, setIsRejecting] = React.useState(false)
  const [revertOpen, setRevertOpen] = React.useState(false)
  const [isReverting, setIsReverting] = React.useState(false)
  const printRef = React.useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (data?.id) {
      window.open(`/print/jsa/${data.id}?orientation=${orientation}`, '_blank')
    }
  }

  const handleQuickApprove = async () => {
    if (!data?.id) return
    setIsApproving(true)
    try {
      const res = await quickApproveJsaAction(data.id)
      if (res.success) {
        toast.success(res.message || 'JSA berhasil disetujui dengan TTD online!')
        onApproved?.()
        onOpenChange(false)
      } else {
        toast.error(res.error || 'Gagal menyetujui JSA')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsApproving(false)
    }
  }

  const handleConfirmReject = async () => {
    if (!data?.id) return
    if (!rejectReason.trim()) {
      toast.error('Mohon isi catatan alasan penolakan/revisi')
      return
    }
    setIsRejecting(true)
    try {
      const res = await quickRejectJsaAction(data.id, rejectReason.trim())
      if (res.success) {
        toast.success(res.message || 'JSA berhasil ditolak dengan catatan')
        setRejectOpen(false)
        setRejectReason('')
        onApproved?.()
        onOpenChange(false)
      } else {
        toast.error(res.error || 'Gagal menolak JSA')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleConfirmRevert = async () => {
    if (!data?.id) return
    setIsReverting(true)
    try {
      const res = await revertJsaAction(data.id)
      if (res.success) {
        toast.success(res.message || 'Status JSA berhasil dikembalikan ke Pending')
        setRevertOpen(false)
        onApproved?.()
        onOpenChange(false)
      } else {
        toast.error(res.error || 'Gagal merevert JSA')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setIsReverting(false)
    }
  }

  if (!data) return null

  const isApproved = data.status === 'approved' || Boolean(data.signatures?.verifierUrl)
  const isRejected = data.status === 'rejected'
  const isPending = !isApproved && !isRejected

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col gap-0 p-0 overflow-hidden bg-slate-100 transition-all duration-200 ${
          orientation === 'landscape'
            ? 'max-w-[96vw] w-[1320px] h-[94vh]'
            : 'max-w-5xl h-[92vh]'
        }`}
      >
        <DialogHeader className="px-6 py-3.5 border-b bg-white flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900">Preview Dokumen JSA</DialogTitle>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{data.jsaNumber || 'Dokumen JSA'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format Tegak (Portrait A4)"
              >
                <RectangleVertical className="w-3.5 h-3.5" />
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format Mendatar (Landscape A4)"
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                <span>Landscape</span>
              </button>
            </div>

            {/* Approval Online Buttons (Kayak SPL & Daily Activity) */}
            {isPending && (
              <>
                <Button
                  type="button"
                  onClick={handleQuickApprove}
                  disabled={isApproving}
                  className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
                >
                  {isApproving ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Approve (Auto TTD)</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  disabled={isApproving}
                  className="gap-1.5 h-9 border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Reject</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setApprovalOpen(true)}
                  className="gap-1.5 h-9 text-xs text-slate-600 cursor-pointer"
                  title="Opsi untuk gambar tanda tangan manual di canvas"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>TTD Manual</span>
                </Button>
              </>
            )}

            {(isApproved || isRejected) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setRevertOpen(true)}
                className="gap-1.5 h-9 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold text-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Revert ke Pending</span>
              </Button>
            )}

            <Button onClick={handlePrint} className="gap-2 h-9 cursor-pointer">
              <Printer className="w-4 h-4" />
              Cetak PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-100">
          <div id="jsa-print-section" ref={printRef}>
            <JsaDocumentSheet data={data} orientation={orientation} />
          </div>
        </div>
      </DialogContent>

      <JsaApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        jsa={data}
        onSuccess={() => {
          onApproved?.()
          onOpenChange(false)
        }}
      />

      {/* REJECT DIALOG */}
      <HeroFormDialog
        open={rejectOpen}
        onOpenChange={(op) => {
          if (!op) {
            setRejectOpen(false)
            setRejectReason('')
          }
        }}
        title={`Tolak / Minta Revisi JSA: ${data.jsaNumber || ''}`}
        description="Berikan catatan perbaikan mengenai aspek keselamatan kerja yang perlu disesuaikan sebelum dokumen dapat disahkan."
        submitLabel="Tolak & Kirim Catatan"
        cancelLabel="Batal"
        isSubmitting={isRejecting}
        onSubmit={(e) => {
          e.preventDefault()
          handleConfirmReject()
        }}
      >
        <div className="space-y-4">
          <HeroFormField
            label="Catatan Perbaikan / Dimana Salahnya"
            required
            info="Jelaskan secara spesifik langkah atau potensi bahaya mana yang belum sesuai."
          >
            <HeroTextarea
              rows={4}
              placeholder="Contoh: Pada langkah 3 mohon tambahkan proteksi helm dan sarung tangan..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* REVERT DIALOG */}
      <HeroConfirmDialog
        open={revertOpen}
        onOpenChange={(op) => {
          if (!op) setRevertOpen(false)
        }}
        title={`Revert Status JSA: ${data.jsaNumber || ''}`}
        description="Apakah Anda yakin ingin mengembalikan status dokumen JSA ini ke 'Pending'? Tanda tangan verifikator atau catatan penolakan akan dibersihkan."
        confirmLabel="Ya, Revert ke Pending"
        cancelLabel="Batal"
        tone="warning"
        isProcessing={isReverting}
        onConfirm={handleConfirmRevert}
      />
    </Dialog>
  )
}
