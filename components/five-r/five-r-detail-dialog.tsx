'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  Send,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  getFiveRReportDetailAction,
  resubmitFiveRReportAction,
} from '@/app/dashboard/quality/5r/actions'
import { FiveRDocumentPreview } from './five-r-document-preview'

export function FiveRDetailDialog({
  reportId,
  onClose,
  onActionComplete,
}: {
  reportId: number
  onClose: () => void
  onActionComplete?: () => void
}) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'document' | 'summary'>('document')

  useEffect(() => {
    setIsLoading(true)
    getFiveRReportDetailAction(reportId)
      .then((res) => {
        if (res.success) {
          setData(res)
        } else {
          toast.error(res.message)
        }
      })
      .finally(() => setIsLoading(false))
  }, [reportId])

  async function handleResubmit() {
    setIsProcessing(true)
    try {
      const res = await resubmitFiveRReportAction(reportId)
      if (res.success) {
        toast.success(res.message)
        onActionComplete?.()
        onClose()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Gagal mengajukan ulang laporan.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintInPlace = () => {
    const existing = document.getElementById('five-r-print-iframe')
    if (existing) {
      existing.remove()
    }

    const iframe = document.createElement('iframe')
    iframe.id = 'five-r-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    iframe.src = `/print/five-r/${reportId}`

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (err) {
          console.error('Failed to print iframe:', err)
        }
      }, 500)
    }

    document.body.appendChild(iframe)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white p-6 shadow-xl">
          <Loader2 className="size-5 animate-spin text-slate-700" />
          <span className="text-sm font-medium text-slate-700">Memuat detail laporan...</span>
        </div>
      </div>
    )
  }

  if (!data || !data.report) return null

  const { report, findings, approvalLogs, approvalRoute } = data

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-4 sm:px-6 py-3 gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 leading-tight">
                  {report.reportNumber}
                </h2>
                <div className="text-[11px] text-slate-500">
                  Periode {report.auditPeriod} &bull; {report.auditDate}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="sm:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Tab Switcher: Dokumen A4 vs Rincian */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('document')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-colors ${
                  activeTab === 'document'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="size-3.5 text-blue-600" />
                Dokumen A4
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-colors ${
                  activeTab === 'summary'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="size-3.5 text-emerald-600" />
                Rincian Mobile
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintInPlace}
                className="h-8 text-xs border-slate-300 cursor-pointer"
              >
                <Printer className="mr-1.5 size-3.5" />
                Cetak PDF
              </Button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-50">
          {activeTab === 'document' ? (
            <div className="space-y-2">
              <div className="sm:hidden flex items-center justify-between bg-blue-50/80 border border-blue-200/60 px-3 py-1.5 rounded-xl text-[11px] text-blue-900">
                <span>Dokumen A4 standar (geser ke samping untuk melihat penuh).</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePrintInPlace}
                  className="h-6 text-[11px] text-[#003461] font-bold p-0 hover:bg-transparent"
                >
                  <Printer className="mr-1 size-3" /> Cetak
                </Button>
              </div>
              <div className="overflow-x-auto flex justify-center pb-4">
                <div className="min-w-[700px] max-w-[850px] shadow-sm rounded-xl bg-white border border-slate-200">
                  <FiveRDocumentPreview
                    report={report}
                    findings={findings}
                    approvalLogs={approvalLogs}
                    approvalRoute={approvalRoute}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
          {/* Header Info Grid */}
          <div className="grid gap-4 sm:grid-cols-3 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">PIC / Area 5R:</span>
              <div className="font-semibold text-slate-900 text-sm mt-0.5">
                {report.picAreaName}
              </div>
              <div className="text-slate-400 text-[11px]">{report.siteName ?? 'Global'}</div>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Auditor:</span>
              <div className="font-semibold text-slate-900 text-sm mt-0.5">
                {report.auditorName}
              </div>
              <div className="text-slate-400 text-[11px]">{report.auditorEmail}</div>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Tipe Laporan:</span>
              <div className="mt-0.5">
                <span className="inline-flex rounded px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {report.reportType === 'ada_temuan'
                    ? 'Ada Temuan'
                    : report.reportType === 'after_temuan_sebelumnya'
                    ? 'After (Temuan Sebelumnya)'
                    : 'Tidak Ada Temuan'}
                </span>
              </div>
            </div>
          </div>

          {/* 5 Pillars Score Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Evaluasi 5 Pilar 5R
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Nilai Akhir:</span>
                <span className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-black text-white">
                  {report.totalScore}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <div className="text-slate-500 text-[10px]">Rapi</div>
                <div className="font-bold text-slate-900 mt-0.5">{report.scoreRapi}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <div className="text-slate-500 text-[10px]">Ringkas</div>
                <div className="font-bold text-slate-900 mt-0.5">{report.scoreRingkas}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <div className="text-slate-500 text-[10px]">Resik</div>
                <div className="font-bold text-slate-900 mt-0.5">{report.scoreResik}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <div className="text-slate-500 text-[10px]">Rawat</div>
                <div className="font-bold text-slate-900 mt-0.5">{report.scoreRawat}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <div className="text-slate-500 text-[10px]">Rajin</div>
                <div className="font-bold text-slate-900 mt-0.5">{report.scoreRajin}</div>
              </div>
            </div>
          </div>

          {/* 3-Step Approval Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
              Tahapan Approval (3 Level)
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {approvalRoute.map((step: any) => {
                const isPassed =
                  report.status === 'approved' || report.currentApprovalLevel > step.level
                const isCurrent =
                  report.status === 'pending_approval' &&
                  report.currentApprovalLevel === step.level
                const isRejected =
                  report.status === 'rejected' && report.currentApprovalLevel === step.level

                const log = approvalLogs.find((l: any) => l.level === step.level)

                return (
                  <div
                    key={step.level}
                    className={`rounded-lg border p-3 text-xs transition-all ${
                      isPassed
                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                        : isCurrent
                        ? 'border-amber-400 bg-amber-50/80 text-amber-950 shadow-sm ring-1 ring-amber-400'
                        : isRejected
                        ? 'border-rose-300 bg-rose-50 text-rose-950'
                        : 'border-slate-200 bg-slate-50 text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>Level {step.level}</span>
                      {isPassed ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <Clock className="size-4 text-amber-600 animate-pulse" />
                      ) : isRejected ? (
                        <XCircle className="size-4 text-rose-600" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <div className="mt-1 font-bold text-slate-900">{step.roleLabel}</div>
                    <div className="text-slate-600 text-[11px] mt-0.5">{step.approverName}</div>
                    {log && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                        Disetujui: {new Date(log.actedAt).toLocaleString('id-ID')}
                        {log.notes && <div className="italic">Note: &quot;{log.notes}&quot;</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Findings Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Dokumentasi & Temuan Lapangan ({findings.length} Baris)
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Area</th>
                    <th className="py-2.5 px-3">Temuan</th>
                    <th className="py-2.5 px-3">Foto Temuan</th>
                    <th className="py-2.5 px-3">Tindakan</th>
                    <th className="py-2.5 px-3">Foto Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {findings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">
                        Tidak ada entri temuan pada laporan ini.
                      </td>
                    </tr>
                  ) : (
                    findings.map((f: any, idx: number) => (
                      <tr key={f.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {f.category5r}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{f.area}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {f.findingDescription || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.findingPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(f.findingPhotoUrl)}
                              className="size-10 rounded border border-slate-300 overflow-hidden bg-slate-100 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={f.findingPhotoUrl}
                                alt="Foto Temuan"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {f.actionDescription || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.actionPhotoUrl || f.noFindingPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto(f.actionPhotoUrl || f.noFindingPhotoUrl)
                              }
                              className="size-10 rounded border border-slate-300 overflow-hidden bg-slate-100 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={f.actionPhotoUrl || f.noFindingPhotoUrl}
                                alt="Foto Tindakan"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Approval Actions */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-600"
          >
            Tutup
          </Button>

          {report.status === 'pending_approval' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                <Clock className="size-3.5 text-amber-600 animate-pulse" />
                Menunggu Verifikasi Tahap {report.currentApprovalLevel}: {approvalRoute?.find((s: any) => s.level === report.currentApprovalLevel)?.approverName || 'Approver'}
              </span>
            </div>
          )}

          {report.status === 'approved' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Laporan Selesai & Disetujui Penuh
            </span>
          )}

          {report.status === 'rejected' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
              <XCircle className="size-3.5 text-rose-600" />
              Laporan Ditolak
            </span>
          )}

          {report.status === 'needs_revision' && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 max-w-md truncate">
                Catatan Revisi: {report.approvalNotes || 'Perlu perbaikan'}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleResubmit}
                disabled={isProcessing}
                className="h-9 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 shadow-sm"
              >
                {isProcessing ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3.5" />
                )}
                Ajukan Ulang Langsung ke Tahap {report.revertedFromLevel || report.currentApprovalLevel}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Large Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-h-[85vh] max-w-[85vw] overflow-hidden rounded-xl bg-black">
            <img src={previewPhoto} alt="Foto Preview" className="max-h-[85vh] object-contain" />
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
