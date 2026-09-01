'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SignaturePad } from '@/components/signature-pad'
import { RfrDocumentPreview } from '@/components/rfr-document-preview'
import { approveRfrStep, rejectRfrStep, revertRfrStep, getRfrDetail } from '@/app/actions/rfr'
import { CheckCircle2, XCircle, AlertCircle, FileCheck, Loader2, PenLine, Printer } from 'lucide-react'
import { toast } from 'sonner'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type RfrInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['rfrInboxItems'][number]

interface RfrApprovalDialogProps {
  item: RfrInboxItem
}

export function RfrApprovalDialog({ item }: RfrApprovalDialogProps) {
  const router = useRouter()
  const printDocRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const handlePrint = useReactToPrint({
    contentRef: printDocRef,
    documentTitle: item.rfrNumber || 'Request_For_Recruitment',
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  })
  
  // Dynamic detail states
  const [loading, setLoading] = useState(false)
  const [rfrDetails, setRfrDetails] = useState<any>(null)
  const [approvals, setApprovals] = useState<any[]>([])

  useEffect(() => {
    if (open && item.rfrId) {
      setLoading(true)
      getRfrDetail(item.rfrId)
        .then((res) => {
          if (res) {
            setRfrDetails(res.rfr)
            setApprovals(res.approvals)
          }
        })
        .catch((err) => {
          toast.error('Gagal mengambil detail RFR.')
          console.error(err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, item.rfrId])

  function handleApprove() {
    if (!liveSignatureUrl) {
      toast.error('Tanda tangan digital wajib diisi.')
      return
    }

    startTransition(async () => {
      try {
        const token = item.url.split('/').pop() || ''
        const res = await approveRfrStep(token, {
          signatureDataUrl: liveSignatureUrl,
          remarks,
        })
        if (res.success) {
          toast.success('RFR berhasil disetujui.')
          setOpen(false)
          setRemarks('')
          router.refresh()
        } else {
          toast.error(res.error || 'Gagal menyimpan persetujuan.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses approval.')
      }
    })
  }

  function handleRevert() {
    if (!remarks.trim()) {
      toast.error('Alasan pengembalian (revert) wajib diisi pada catatan.')
      return
    }

    startTransition(async () => {
      try {
        const token = item.url.split('/').pop() || ''
        const res = await revertRfrStep(token, remarks)
        if (res.success) {
          toast.success('RFR berhasil dikembalikan ke tahap sebelumnya.')
          setOpen(false)
          setRemarks('')
          router.refresh()
        } else {
          toast.error(res.error || 'Gagal mengembalikan RFR.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses revert.')
      }
    })
  }

  function handleReject() {
    if (!remarks.trim()) {
      toast.error('Alasan penolakan wajib diisi pada catatan.')
      return
    }

    startTransition(async () => {
      try {
        const token = item.url.split('/').pop() || ''
        const res = await rejectRfrStep(token, remarks)
        if (res.success) {
          toast.success('RFR telah ditolak.')
          setOpen(false)
          setRemarks('')
          router.refresh()
        } else {
          toast.error(res.error || 'Gagal menolak permohonan.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses penolakan.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRemarks(''); setLiveSignatureUrl(null); setSignatureFile(null) } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="dense" className="gap-1.5 font-semibold text-slate-700">
          <FileCheck className="w-3.5 h-3.5 text-primary" /> Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[98vw] lg:max-w-[1400px] w-[98vw] h-[92vh] flex flex-col p-4 sm:p-6 gap-4 bg-slate-100 border border-slate-300 rounded-2xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 shrink-0 pr-6">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Review RFR — {item.rfrNumber}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {item.requestorName} • {item.sectionDepartment} • Langkah {item.stepOrder} / {item.totalSteps}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePrint()}
            className="gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Cetak / Simpan PDF
          </Button>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-slate-500">Memuat berkas RFR...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 min-h-0 overflow-hidden">
            {/* Left Column: Official Document WYSIWYG View */}
            <div className="overflow-y-auto pr-1 h-full rounded-xl bg-white border border-slate-200 shadow-sm p-4">
              <RfrDocumentPreview
                rfr={rfrDetails}
                approvals={approvals}
                containerRef={printDocRef}
                currentStepOrder={item.stepOrder}
                liveSignatureUrl={liveSignatureUrl}
              />
            </div>

            {/* Right Column: Review Action Panel */}
            <div className="flex flex-col gap-3.5 overflow-y-auto pr-1 h-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              {/* Quick Summary Card */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Informasi Tahapan Anda
                </p>
                <div className="bg-blue-900 text-white p-3 rounded-lg flex items-center justify-between text-xs font-semibold">
                  <div>
                    <div className="font-bold">{item.roleLabel}</div>
                    <div className="text-blue-200 text-[10px]">{item.approverTitle}</div>
                  </div>
                  <Badge className="bg-white text-blue-900 font-bold px-2 py-0.5 text-[10px]">
                    Langkah {item.stepOrder} / {item.totalSteps}
                  </Badge>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-1 text-slate-600 mt-2">
                  <span className="font-semibold text-slate-700">Posisi:</span>
                  <span className="text-slate-900 font-bold">{item.positionTitle}</span>
                  <span className="font-semibold text-slate-700">Jumlah:</span>
                  <span className="text-slate-900 font-bold">{item.numberOfPersons} orang</span>
                </div>
              </div>

              {/* Area Tanda Tangan Digital */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <PenLine className="h-3.5 w-3.5 text-sky-600" />
                    <span>Tanda Tangan Digital Approver</span>
                  </div>
                  {signatureFile && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Tersimpan
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Bubuhkan tanda tangan pada area bawah ini sebelum menyetujui.
                </p>
                <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                  <SignaturePad
                    onSignatureChange={setSignatureFile}
                    onDataUrlChange={setLiveSignatureUrl}
                  />
                </div>
              </div>

              {/* Catatan Keputusan Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Catatan / Remarks (Wajib untuk Revert & Reject)
                </label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  disabled={isPending}
                  placeholder="Tambahkan catatan di sini..."
                  className="resize-none text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 mt-auto border-t border-slate-200">
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full"
                  size="sm"
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  )}
                  Setujui & Tanda Tangan
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={handleRevert}
                    disabled={isPending}
                    variant="outline"
                    size="sm"
                    className="border-amber-400 text-amber-800 hover:bg-amber-50 font-semibold"
                  >
                    <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-600" />
                    Revert
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReject}
                    disabled={isPending}
                    variant="secondary"
                    size="sm"
                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
