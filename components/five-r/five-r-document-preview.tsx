'use client'

// FiveRDocumentPreview: Standard A4 & Embedded View for 5R Audit Reports
import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, Download, Eye, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useReactToPrint } from 'react-to-print'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { downloadElementAsPdf } from '@/lib/pdf-download'

function formatDateTimeLabel(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return '-'
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return String(dateVal)
  const dateStr = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${dateStr}, ${timeStr}`
}

interface FiveRDocumentPreviewProps {
  report: any
  findings: any[]
  approvalLogs?: any[]
  approvalRoute?: any[]
  currentStepLevel?: number
  liveSignatureUrl?: string | null
  isEmbedded?: boolean
  hideToolbar?: boolean
}

export function FiveRDocumentPreview({
  report,
  findings,
  approvalLogs = [],
  approvalRoute = [],
  currentStepLevel = 1,
  liveSignatureUrl,
  isEmbedded = false,
  hideToolbar = false,
}: FiveRDocumentPreviewProps) {
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const printableSheetRef = React.useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printableSheetRef,
    documentTitle: `Laporan-Audit-5R-${report?.reportNumber || 'Doc'}`,
    pageStyle: `
      @page {
        size: A4 portrait !important;
        margin: 0 !important;
      }
      @page :left {
        size: A4 portrait !important;
        margin: 0 !important;
      }
      @page :right {
        size: A4 portrait !important;
        margin: 0 !important;
      }
      html, body {
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        .pdf-wrapper, .pdf-wrapper * {
          visibility: visible;
        }
        .pdf-wrapper {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          border: none !important;
          background: #ffffff !important;
          padding-top: 42mm !important;
          padding-bottom: 20mm !important;
          padding-left: 14mm !important;
          padding-right: 14mm !important;
          box-sizing: border-box !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          overflow: hidden !important;
        }
      }
    `,
  })

  const handleDownloadPdf = async () => {
    if (!printableSheetRef.current) return
    setIsDownloading(true)
    try {
      await downloadElementAsPdf(
        printableSheetRef.current,
        `Laporan-Audit-5R-${report?.reportNumber || 'Doc'}.pdf`,
        { orientation: 'portrait' }
      )
      toast.success('File PDF berhasil didownload!')
    } catch (err: any) {
      console.error('Download PDF error:', err)
      toast.error(err?.message || 'Gagal mendownload PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!report) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-xs text-slate-400">
        Memuat dokumen resmi laporan 5R...
      </div>
    )
  }

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', label: 'Sangat Baik (Sesuai Standar)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
    if (score >= 80) return { grade: 'B', label: 'Baik (Memerlukan Pemeliharaan)', color: 'text-blue-700 bg-blue-50 border-blue-300' }
    if (score >= 70) return { grade: 'C', label: 'Cukup (Perlu Peningkatan)', color: 'text-amber-700 bg-amber-50 border-amber-300' }
    return { grade: 'D', label: 'Kurang (Tindakan Segera Diperlukan)', color: 'text-rose-700 bg-rose-50 border-rose-300' }
  }

  const scoreInfo = getScoreGrade(Number(report.totalScore) || 0)

  const formatDocStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'DISETUJUI (FINAL)'
      case 'needs_revision':
        return 'PERLU REVISI'
      case 'rejected':
        return 'DITOLAK'
      case 'pending_approval':
      case 'pending':
        return 'DALAM PROSES VERIFIKASI & APPROVAL'
      default:
        return (status || 'DRAFT').toUpperCase()
    }
  }

  const documentContent = (
    <div
      ref={printableSheetRef}
      style={{
        backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        paddingTop: '42mm',
        paddingBottom: '20mm',
        paddingLeft: '14mm',
        paddingRight: '14mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
      }}
      className={cn(
        "pdf-wrapper relative w-full text-slate-900 font-sans text-xs flex flex-col justify-between overflow-hidden bg-white box-border",
        isEmbedded
          ? "border-0 shadow-none"
          : "min-w-[600px] sm:min-w-0 mx-auto w-[210mm] max-w-[800px] shadow-md border border-slate-300 rounded-md"
      )}
    >
      <div className="relative z-10 flex flex-col justify-between h-full min-h-[235mm]">
        <div>
          {/* Corporate Header (Harmonized with top letterhead logo) */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2">
            <div>
              <div className="text-[12px] font-black uppercase tracking-wider text-slate-900 leading-none">
                PT CHITRA PARATAMA
              </div>
              <div className="text-[9.5px] font-bold text-slate-700 uppercase tracking-wide mt-0.5">
                Continuous Process Improvement (CPI) &amp; Quality Management
              </div>
              <div className="text-[8.5px] text-slate-500 font-medium italic">
                Sistem Tata Graha &amp; Standarisasi Kerja 5R / 5S
              </div>
            </div>

            <div className="text-right">
              <div className="text-[12px] font-extrabold uppercase tracking-tight text-slate-900 leading-none">
                LAPORAN AUDIT 5R
              </div>
              <div className="text-[10.5px] font-bold text-emerald-800 font-mono tracking-tight mt-0.5">
                {report.reportNumber}
              </div>
              <div className="text-[8.5px] text-slate-500 font-medium">
                Ref Doc: CP/QMS/5R/F-01
              </div>
            </div>
          </div>

        {/* Metadata Grid (Informasi Audit & Lokasi) */}
        <div className="mt-2 rounded border border-slate-300 bg-slate-50/70 p-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            {/* Left Column */}
            <div className="space-y-0.5">
              <div className="grid grid-cols-[100px_1fr]">
                <span className="font-semibold text-slate-600">Area / Lokasi Audit</span>
                <span className="font-bold text-slate-900">: {report.picAreaName}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="font-semibold text-slate-600">Lokasi Penempatan</span>
                <span className="text-slate-800 font-medium">: {report.siteName || 'Balikpapan Head Office'}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="font-semibold text-slate-600">Klasifikasi Audit</span>
                <span className="font-semibold text-emerald-800">
                  : {report.reportType === 'ada_temuan'
                    ? 'Audit Temuan 5R'
                    : report.reportType === 'after_temuan_sebelumnya'
                    ? 'Verifikasi Tindak Lanjut (After)'
                    : 'Audit Terstandar (Bebas Temuan)'}
                </span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-0.5">
              <div className="grid grid-cols-[100px_1fr]">
                <span className="font-semibold text-slate-600">Auditor Pelaksana</span>
                <span className="font-bold text-slate-900">: {report.auditorName}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="font-semibold text-slate-600">Periode Pelaksanaan</span>
                <span className="text-slate-800 font-medium">
                  : {report.auditPeriod} ({report.auditDate})
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="font-semibold text-slate-600">Status Dokumen</span>
                <span className="font-bold text-slate-900">
                  : <span className="text-emerald-700">{formatDocStatus(report.status)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Pillars Evaluation Scoreboard */}
        <div className="mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center justify-between">
            <span>I. Evaluasi Penilaian 5 Pilar (Ringkas, Rapi, Resik, Rawat, Rajin)</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${scoreInfo.color}`}>
              Grade {scoreInfo.grade} — {scoreInfo.label}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-center text-[10px]">
            <thead className="bg-slate-100 font-semibold text-slate-800">
              <tr>
                <th className="border border-slate-300 py-1 px-1.5">1. Ringkas (Sort)</th>
                <th className="border border-slate-300 py-1 px-1.5">2. Rapi (Set)</th>
                <th className="border border-slate-300 py-1 px-1.5">3. Resik (Shine)</th>
                <th className="border border-slate-300 py-1 px-1.5">4. Rawat (Standard)</th>
                <th className="border border-slate-300 py-1 px-1.5">5. Rajin (Sustain)</th>
                <th className="border border-slate-300 py-1 px-1.5 bg-emerald-100/70 text-emerald-950 font-bold">
                  Skor Akhir Audit
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-semibold">
                <td className="border border-slate-300 py-1">{report.scoreRingkas}</td>
                <td className="border border-slate-300 py-1">{report.scoreRapi}</td>
                <td className="border border-slate-300 py-1">{report.scoreResik}</td>
                <td className="border border-slate-300 py-1">{report.scoreRawat}</td>
                <td className="border border-slate-300 py-1">{report.scoreRajin}</td>
                <td className="border border-slate-300 py-1 font-extrabold text-emerald-800 text-xs bg-emerald-50">
                  {report.totalScore} / 100
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Findings & Photographic Evidence Table */}
        <div className="mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center justify-between">
            <span>II. Rincian Bukti Temuan, Tindakan Perbaikan & Dokumentasi Foto</span>
            <span className="text-[9px] text-slate-500 font-medium">
              Total {findings?.length || 0} Dokumentasi
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full border-collapse text-[10px]">
              <thead className="bg-slate-100 text-slate-800 font-semibold text-center">
                <tr>
                  <th className="border border-slate-300 py-1 px-1 w-7">No</th>
                  <th className="border border-slate-300 py-1 px-1.5 w-18">Pilar</th>
                  <th className="border border-slate-300 py-1 px-2">Titik / Area Temuan</th>
                  {report.reportType !== 'tidak_ada_temuan' ? (
                    <>
                      <th className="border border-slate-300 py-1 px-2">Uraian Temuan</th>
                      <th className="border border-slate-300 py-1 px-1 w-20">Foto Temuan</th>
                      <th className="border border-slate-300 py-1 px-2">Tindakan Korektif</th>
                      <th className="border border-slate-300 py-1 px-1 w-20">Foto Perbaikan</th>
                    </>
                  ) : (
                    <th className="border border-slate-300 py-1 px-2 w-32">Foto Bukti Kebersihan Area</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!findings || findings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-2 text-center text-slate-400 text-[10px]">
                      Tidak ada catatan temuan untuk laporan ini.
                    </td>
                  </tr>
                ) : (
                  findings.map((f: any, idx: number) => (
                    <tr key={f.id || idx} className="hover:bg-slate-50/70">
                      <td className="border border-slate-300 py-1 px-1 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center font-semibold text-slate-700">
                        {f.category5r || '5R'}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-medium text-slate-900">
                        {f.area}
                      </td>

                      {report.reportType !== 'tidak_ada_temuan' ? (
                        <>
                          <td className="border border-slate-300 py-1 px-2 text-slate-700 leading-tight">
                            {f.findingDescription || '-'}
                          </td>
                          <td className="border border-slate-300 py-1 px-1 text-center">
                            {f.findingPhotoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomPhoto({
                                    url: f.findingPhotoUrl,
                                    title: `Dokumentasi Temuan (Item ${idx + 1} - ${f.area})`,
                                  })
                                }
                                className="group relative inline-block size-10 rounded border border-slate-300 overflow-hidden shadow-xs hover:ring-2 hover:ring-emerald-500 cursor-pointer bg-slate-100"
                                title="Klik untuk memperbesar foto"
                              >
                                <img
                                  src={f.findingPhotoUrl}
                                  alt="Foto Temuan"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="size-3" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="border border-slate-300 py-1 px-2 text-slate-700 leading-tight">
                            {f.actionDescription || '-'}
                          </td>
                          <td className="border border-slate-300 py-1 px-1 text-center">
                            {f.actionPhotoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomPhoto({
                                    url: f.actionPhotoUrl,
                                    title: `Dokumentasi Tindakan Perbaikan (Item ${idx + 1} - ${f.area})`,
                                  })
                                }
                                className="group relative inline-block size-10 rounded border border-slate-300 overflow-hidden shadow-xs hover:ring-2 hover:ring-emerald-500 cursor-pointer bg-slate-100"
                                title="Klik untuk memperbesar foto"
                              >
                                <img
                                  src={f.actionPhotoUrl}
                                  alt="Foto Tindakan"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="size-3" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-400">-</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="border border-slate-300 py-1 px-1 text-center">
                          {f.noFindingPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomPhoto({
                                  url: f.noFindingPhotoUrl,
                                  title: `Dokumentasi Kondisi Area (Item ${idx + 1} - ${f.area})`,
                                })
                              }
                              className="group relative inline-block size-10 rounded border border-slate-300 overflow-hidden shadow-xs hover:ring-2 hover:ring-emerald-500 cursor-pointer bg-slate-100"
                              title="Klik untuk memperbesar foto"
                            >
                              <img
                                src={f.noFindingPhotoUrl}
                                alt="Foto Area Standar"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Eye className="size-3" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Authorization & 3-Step Approval Sign-off Matrices */}
        <div className="mt-3 pt-2 border-t-2 border-slate-800">
          <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
            {/* Step 1: Diajukan Oleh (Auditor Pembuat Laporan) */}
            <div className="rounded border border-slate-300/80 p-2.5 flex flex-col justify-between h-36 bg-white/80 backdrop-blur-xs shadow-xs">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                Diajukan Oleh,
              </div>

              <div className="my-auto py-1 flex items-center justify-center h-14">
                {report.auditorSignatureUrl ? (
                  <img
                    src={report.auditorSignatureUrl}
                    alt="Tanda Tangan Auditor"
                    className="max-h-14 w-auto object-contain max-w-[140px]"
                  />
                ) : (
                  <div className="font-bold text-slate-900 text-[10px]">
                    {report.auditorName || 'Mochamad Annas Khadafi'}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-1 text-[9.5px]">
                <div className="font-bold text-slate-900 leading-tight">{report.auditorName || 'Mochamad Annas Khadafi'}</div>
                <div className="text-[8.5px] text-slate-500">Quality Management Officer</div>
                <div className="text-[8px] text-slate-500 font-mono">
                  {formatDateTimeLabel(report.createdAt || report.auditDate)}
                </div>
              </div>
            </div>

            {/* Step 2: Diperiksa Oleh (PJO Site / Atasan Langsung) */}
            {(() => {
              const step1 = approvalRoute?.find((s: any) => s.level === 1) || approvalRoute?.[0]
              const step2 = approvalRoute?.find((s: any) => s.level === 2) || approvalRoute?.[1]
              const isStep1Approved =
                step1?.status === 'approved' ||
                approvalLogs?.some((l: any) => l.level === 1 && (l.action === 'approved' || l.status === 'approved')) ||
                report.currentApprovalLevel > 1 ||
                report.revertedFromLevel === 2 ||
                report.status === 'approved'
              const step1Signature =
                step1?.signatureUrl ||
                approvalLogs?.find((l: any) => l.level === 1 && l.signatureUrl)?.signatureUrl
              const step1ApprovedAt =
                step1?.reviewedAt ||
                approvalLogs?.find((l: any) => l.level === 1 && (l.action === 'approved' || l.status === 'approved'))?.actedAt

              const isStep2Approved =
                step2?.status === 'approved' ||
                approvalLogs?.some((l: any) => l.level === 2 && (l.action === 'approved' || l.status === 'approved')) ||
                report.status === 'approved'
              const step2Signature =
                step2?.signatureUrl ||
                approvalLogs?.find((l: any) => l.level === 2 && l.signatureUrl)?.signatureUrl
              const step2ApprovedAt =
                step2?.reviewedAt ||
                approvalLogs?.find((l: any) => l.level === 2 && (l.action === 'approved' || l.status === 'approved'))?.actedAt

              return (
                <>
                  <div className="rounded border border-slate-300/80 p-2.5 flex flex-col justify-between h-36 bg-white/80 backdrop-blur-xs shadow-xs">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                      Diperiksa Oleh,
                    </div>

                    <div className="my-auto py-1 flex items-center justify-center h-14">
                      {currentStepLevel === 1 && liveSignatureUrl ? (
                        <img
                          src={liveSignatureUrl}
                          alt="Signature"
                          className="max-h-14 w-auto object-contain max-w-[140px]"
                        />
                      ) : isStep1Approved ? (
                        step1Signature ? (
                          <img
                            src={step1Signature}
                            alt="Signature"
                            className="max-h-14 w-auto object-contain max-w-[140px]"
                          />
                        ) : (
                          <div className="font-bold text-slate-900 text-[10px]">
                            {step1?.approverName || 'PJO Site'}
                          </div>
                        )
                      ) : (
                        <div className="text-slate-400 italic text-[9.5px]">Menunggu Persetujuan Site</div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-1 text-[9.5px]">
                      <div className="font-bold text-slate-900 leading-tight">
                        {step1?.approverName || 'PJO Site'}
                      </div>
                      <div className="text-[8.5px] text-slate-500">PJO Site / Atasan Langsung</div>
                      {isStep1Approved && step1ApprovedAt ? (
                        <div className="text-[8px] text-slate-500 font-mono">
                          {formatDateTimeLabel(step1ApprovedAt)}
                        </div>
                      ) : currentStepLevel === 1 && liveSignatureUrl ? (
                        <div className="text-[8px] text-slate-500 font-mono">
                          {formatDateTimeLabel(new Date())}
                        </div>
                      ) : (
                        <div className="text-[8px] text-slate-400 italic">-</div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Disetujui Oleh (Head of CPI) */}
                  <div className="rounded border border-slate-300/80 p-2.5 flex flex-col justify-between h-36 bg-white/80 backdrop-blur-xs shadow-xs">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                      Disetujui Oleh,
                    </div>

                    <div className="my-auto py-1 flex items-center justify-center h-14">
                      {currentStepLevel === 2 && liveSignatureUrl ? (
                        <img
                          src={liveSignatureUrl}
                          alt="Signature"
                          className="max-h-14 w-auto object-contain max-w-[140px]"
                        />
                      ) : isStep2Approved ? (
                        step2Signature ? (
                          <img
                            src={step2Signature}
                            alt="Signature"
                            className="max-h-14 w-auto object-contain max-w-[140px]"
                          />
                        ) : (
                          <div className="font-bold text-slate-900 text-[10px]">
                            {step2?.approverName || 'Bardinia Susi Ekawaty'}
                          </div>
                        )
                      ) : report.status === 'needs_revision' ? (
                        <div className="text-amber-700 font-semibold text-[9.5px]">Perlu Revisi</div>
                      ) : (
                        <div className="text-slate-400 italic text-[9.5px]">Menunggu Otorisasi Final</div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-1 text-[9.5px]">
                      <div className="font-bold text-slate-900 leading-tight">
                        {step2?.approverName || 'Bardinia Susi Ekawaty'}
                      </div>
                      <div className="text-[8.5px] text-slate-500">Head of CPI Department</div>
                      {isStep2Approved && step2ApprovedAt ? (
                        <div className="text-[8px] text-slate-500 font-mono">
                          {formatDateTimeLabel(step2ApprovedAt)}
                        </div>
                      ) : currentStepLevel === 2 && liveSignatureUrl ? (
                        <div className="text-[8px] text-slate-500 font-mono">
                          {formatDateTimeLabel(new Date())}
                        </div>
                      ) : (
                        <div className="text-[8px] text-slate-400 italic">-</div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Formal Footer Disclaimer at Bottom of Page */}
        <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
          <div>
            Dicetak secara elektronik melalui <strong className="text-slate-700">HERO Enterprise Platform</strong>
          </div>
          <div>
            PT Chitra Paratama • Quality & Operational Excellence
          </div>
        </div>
      </div>
    </div>
    </div>
  )

  const printStyleTag = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @page {
            size: A4 portrait !important;
            margin: 0 !important;
          }
          @page :left {
            size: A4 portrait !important;
            margin: 0 !important;
          }
          @page :right {
            size: A4 portrait !important;
            margin: 0 !important;
          }
          @media print {
            body * {
              visibility: hidden !important;
            }
            .pdf-wrapper, .pdf-wrapper * {
              visibility: visible !important;
            }
            .pdf-wrapper {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 210mm !important;
              max-width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding-top: 42mm !important;
              padding-bottom: 20mm !important;
              padding-left: 14mm !important;
              padding-right: 14mm !important;
              box-sizing: border-box !important;
              background-image: url(/ChitraParatama_Stationery_Letterhead_jkt.jpg) !important;
              background-size: 210mm 297mm !important;
              background-repeat: no-repeat !important;
              background-position: top center !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `,
      }}
    />
  )

  if (isEmbedded) {
    return (
      <>
        {printStyleTag}
        {documentContent}
        {/* Lightbox / Zoom Dialog for Full Image Inspection */}
        <Dialog open={Boolean(zoomPhoto)} onOpenChange={(v) => !v && setZoomPhoto(null)}>
          <DialogContent className="max-w-3xl bg-slate-950/95 border-slate-800 p-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold">
              <span>{zoomPhoto?.title || 'Preview Bukti Dokumentasi 5R'}</span>
            </div>
            <div className="flex items-center justify-center p-2 max-h-[70vh] overflow-hidden">
              {zoomPhoto?.url && (
                <img
                  src={zoomPhoto.url}
                  alt="Zoom"
                  className="max-h-[65vh] w-auto max-w-full rounded object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="w-full bg-slate-100/60 p-1.5 sm:p-4 rounded-lg overflow-x-auto">
      {/* Top Action Toolbar */}
      {!hideToolbar && (
        <div className="min-w-[600px] sm:min-w-0 mx-auto max-w-[800px] mb-3 flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-slate-500">
            Format Dokumen Cetak Standar A4 (1 Halaman Pas)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isDownloading}
              onClick={handleDownloadPdf}
              className="h-7.5 px-3 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 text-[11px] font-bold tracking-wide uppercase shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Download file PDF langsung ke komputer / perangkat"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  MENGUNDUH...
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  DOWNLOAD PDF
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handlePrint()}
              className="h-7.5 px-3 bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-bold tracking-wide uppercase shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Cetak langsung atau simpan sebagai PDF tanpa pindah halaman"
            >
              <Printer className="size-3.5" />
              CETAK PDF
            </Button>
          </div>
        </div>
      )}

      {printStyleTag}
      {documentContent}
    </div>
  )
}
