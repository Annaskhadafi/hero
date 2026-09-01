'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { FiveRDocumentPreview } from '@/components/five-r/five-r-document-preview'
import {
  getFiveRReportDetailAction,
  approveFiveRReportAction,
  rejectFiveRReportAction,
  revertFiveRReportAction,
} from '@/app/dashboard/quality/5r/actions'
import { CheckCircle2, XCircle, AlertCircle, FileCheck, Loader2, PenLine, FileText, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { ApprovalItem, ApprovalGroup } from '@/lib/approval-workspace'

interface FiveRApprovalDialogProps {
  item: ApprovalItem
  group: ApprovalGroup
}

export function FiveRApprovalDialog({ item, group }: FiveRApprovalDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<'preview' | 'action'>('preview')
  const [isPending, startTransition] = useTransition()

  // Dynamic Detail States
  const [loading, setLoading] = useState(false)
  const [reportDetails, setReportDetails] = useState<any>(null)
  const [findings, setFindings] = useState<any[]>([])
  const [approvalLogs, setApprovalLogs] = useState<any[]>([])
  const [approvalRoute, setApprovalRoute] = useState<any[]>([])

  const matchedReportNumber = item.title?.match(/5R-\d{6}-\d{4}/)?.[0] || ''
  const reportIdentifier =
    item.fiveRReport?.id ||
    (item as any).fiveRReportId ||
    item.requestNumber ||
    item.activityCode ||
    matchedReportNumber

  useEffect(() => {
    if (open && reportIdentifier) {
      setLoading(true)
      getFiveRReportDetailAction(reportIdentifier)
        .then((res) => {
          if (res.success && res.report) {
            setReportDetails(res.report)
            setFindings(res.findings || [])
            setApprovalLogs(res.approvalLogs || [])
            setApprovalRoute(res.approvalRoute || [])
          } else {
            toast.error(res.message || 'Gagal memuat detail laporan 5R.')
          }
        })
        .catch((err) => {
          toast.error('Gagal mengambil data laporan 5R.')
          console.error(err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, reportIdentifier])

  const targetReportId = reportDetails?.id || item.fiveRReport?.id || (typeof reportIdentifier === 'number' ? reportIdentifier : 0)

  function handleApprove() {
    if (!liveSignatureUrl) {
      toast.error('Tanda tangan digital wajib dibubuhkan sebelum menyetujui.')
      setMobileTab('action')
      return
    }

    if (!targetReportId) {
      toast.error('ID Laporan tidak valid.')
      return
    }

    startTransition(async () => {
      try {
        const res = await approveFiveRReportAction(targetReportId, remarks, liveSignatureUrl)
        if (res.success) {
          toast.success(res.message || 'Laporan 5R berhasil disetujui.')
          setOpen(false)
          setRemarks('')
          setLiveSignatureUrl(null)
          setSignatureFile(null)
          router.refresh()
        } else {
          toast.error(res.message || 'Gagal menyetujui laporan.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses approval.')
      }
    })
  }

  function handleRevert() {
    if (!remarks.trim()) {
      toast.error('Alasan pengembalian (revert) wajib diisi pada kolom catatan.')
      setMobileTab('action')
      return
    }

    if (!targetReportId) {
      toast.error('ID Laporan tidak valid.')
      return
    }

    startTransition(async () => {
      try {
        const res = await revertFiveRReportAction(targetReportId, remarks)
        if (res.success) {
          toast.success(res.message || 'Laporan 5R dikembalikan untuk revisi.')
          setOpen(false)
          setRemarks('')
          setLiveSignatureUrl(null)
          setSignatureFile(null)
          router.refresh()
        } else {
          toast.error(res.message || 'Gagal mengembalikan laporan.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses revert.')
      }
    })
  }

  function handleReject() {
    if (!remarks.trim()) {
      toast.error('Alasan penolakan (reject) wajib diisi pada kolom catatan.')
      setMobileTab('action')
      return
    }

    if (!targetReportId) {
      toast.error('ID Laporan tidak valid.')
      return
    }

    startTransition(async () => {
      try {
        const res = await rejectFiveRReportAction(targetReportId, remarks)
        if (res.success) {
          toast.success(res.message || 'Laporan 5R ditolak.')
          setOpen(false)
          setRemarks('')
          setLiveSignatureUrl(null)
          setSignatureFile(null)
          router.refresh()
        } else {
          toast.error(res.message || 'Gagal menolak laporan.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses penolakan.')
      }
    })
  }

  const currentLevel = item.level || reportDetails?.currentApprovalLevel || 1

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setRemarks('')
          setLiveSignatureUrl(null)
          setSignatureFile(null)
          setMobileTab('preview')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="dense"
          className="gap-1.5 font-semibold text-slate-700 hover:text-slate-900 border-slate-300 active:scale-95 transition-transform"
        >
          <FileCheck className="size-3.5 text-emerald-600" />
          Review & Otorisasi
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[98vw] max-w-[98vw] lg:max-w-[1400px] h-[94dvh] max-h-[94dvh] flex flex-col p-3 sm:p-5 gap-3 bg-slate-100 border border-slate-300 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 pb-2.5 shrink-0">
          <div className="min-w-0 pr-6">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 truncate">
              <FileCheck className="size-4 sm:size-5 text-emerald-600 shrink-0" />
              <span>Review Laporan 5R — {reportDetails?.reportNumber || item.activityCode}</span>
            </DialogTitle>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
              Auditor: {group.requesterName} • Area: {reportDetails?.picAreaName || item.title} • {item.currentStepLabel}
            </p>
          </div>
        </DialogHeader>

        {/* Mobile View Switcher Tabs (Shown on < lg screens) */}
        <div className="flex lg:hidden items-center p-1 bg-slate-200/80 rounded-xl shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="size-3.5 text-blue-600 shrink-0" />
            <span className="truncate">1. Dokumen A4</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('action')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'action'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenLine className="size-3.5 shrink-0" />
            <span className="truncate">2. Tanda Tangan & Otorisasi</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-8 text-emerald-600 animate-spin" />
            <p className="text-xs sm:text-sm text-slate-500">Memuat berkas dokumen 5R...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3 min-h-0 overflow-hidden">
            {/* Left Column: Official A4 Document WYSIWYG View */}
            <div
              className={`overflow-y-auto pr-1 h-full rounded-xl bg-white border border-slate-200 shadow-xs p-2 sm:p-4 ${
                mobileTab === 'preview' ? 'block' : 'hidden lg:block'
              }`}
            >
              <FiveRDocumentPreview
                report={reportDetails || item.fiveRReport}
                findings={findings}
                approvalLogs={approvalLogs}
                approvalRoute={approvalRoute}
                currentStepLevel={currentLevel}
                liveSignatureUrl={liveSignatureUrl}
              />

              {/* Mobile Quick Proceed Button */}
              <div className="mt-4 p-2 lg:hidden flex justify-end">
                <Button
                  type="button"
                  onClick={() => setMobileTab('action')}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-11 rounded-xl shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <PenLine className="size-4 text-emerald-400" />
                  <span>Lanjut ke Tanda Tangan & Otorisasi</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Right Column: Review Action Panel */}
            <div
              className={`flex-col gap-3 overflow-y-auto pr-1 h-full bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs ${
                mobileTab === 'action' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              {/* Quick Summary Card */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-2 border border-slate-200">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] sm:text-[11px]">
                  Informasi Tahapan Anda
                </p>
                <div className="bg-slate-900 text-white p-3 rounded-lg flex items-center justify-between text-xs font-semibold">
                  <div>
                    <div className="font-bold">
                      {currentLevel === 1
                        ? 'Verifikator Quality Management'
                        : currentLevel === 2
                        ? 'Atasan Langsung Site (PJO)'
                        : 'Head of CPI Approval'}
                    </div>
                    <div className="text-slate-300 text-[10px]">
                      {currentLevel === 1
                        ? 'Ria Annisa Putri'
                        : currentLevel === 2
                        ? 'PJO Site / Head Lokasi'
                        : 'Bardinia Susi Ekawaty'}
                    </div>
                  </div>
                  <Badge className="bg-white text-slate-900 font-bold px-2 py-0.5 text-[10px]">
                    Langkah {currentLevel} / 3
                  </Badge>
                </div>

                <div className="grid grid-cols-[85px_1fr] gap-1 text-slate-600 pt-1 text-[11px] sm:text-xs">
                  <span className="font-semibold text-slate-700">Area PIC:</span>
                  <span className="text-slate-900 font-bold">
                    {reportDetails?.picAreaName || '-'}
                  </span>
                  <span className="font-semibold text-slate-700">Periode:</span>
                  <span className="text-slate-900 font-bold">
                    {reportDetails?.auditPeriod || '-'}
                  </span>
                  <span className="font-semibold text-slate-700">Nilai Skor:</span>
                  <span className="text-emerald-700 font-extrabold">
                    {reportDetails?.totalScore ?? '-'} / 100
                  </span>
                </div>
              </div>

              {/* Area Tanda Tangan Digital */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <PenLine className="size-3.5 text-emerald-600" />
                    <span>Tanda Tangan Digital Approver</span>
                  </div>
                  {signatureFile && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Tersimpan
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Goreskan tanda tangan di kotak berikut menggunakan jari / stylus / mouse:
                </p>
                <div className="bg-white rounded-lg overflow-hidden border border-slate-300 shadow-inner">
                  <SignaturePad
                    onSignatureChange={setSignatureFile}
                    onDataUrlChange={setLiveSignatureUrl}
                  />
                </div>
              </div>

              {/* Catatan Keputusan Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Catatan / Remarks</span>
                  <span className="text-[10px] text-slate-400 font-normal">Wajib untuk Revert / Reject</span>
                </label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Tuliskan catatan persetujuan, instruksi revisi, atau alasan penolakan..."
                  className="min-h-[75px] text-xs resize-none border-slate-300 focus:border-emerald-600 rounded-lg"
                />
              </div>

              {/* Action Buttons: Approve, Revert, Reject */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-auto">
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-11 rounded-xl shadow-xs transition-colors active:scale-98 flex items-center justify-center cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="size-4 mr-1.5" />
                  )}
                  Setujui Laporan 5R (Approve)
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRevert}
                    disabled={isPending}
                    className="border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs h-10 rounded-xl shadow-2xs active:scale-98 cursor-pointer"
                    title="Kembalikan laporan ke auditor untuk diperbaiki"
                  >
                    <AlertCircle className="size-3.5 mr-1 text-amber-600" />
                    Revert (Revisi)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReject}
                    disabled={isPending}
                    className="border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs h-10 rounded-xl shadow-2xs active:scale-98 cursor-pointer"
                    title="Tolak laporan secara permanen"
                  >
                    <XCircle className="size-3.5 mr-1 text-rose-600" />
                    Reject (Tolak)
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
