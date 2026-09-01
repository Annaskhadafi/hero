'use client'

import { useEffect } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FiveRPdfPreview({ data }: { data: any }) {
  const { report, findings = [], approvalLogs = [], approvalRoute = [] } = data

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', label: 'Sangat Baik (Sesuai Standar)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
    if (score >= 80) return { grade: 'B', label: 'Baik (Memerlukan Pemeliharaan)', color: 'text-blue-700 bg-blue-50 border-blue-300' }
    if (score >= 70) return { grade: 'C', label: 'Cukup (Perlu Peningkatan)', color: 'text-amber-700 bg-amber-50 border-amber-300' }
    return { grade: 'D', label: 'Kurang (Tindakan Segera Diperlukan)', color: 'text-rose-700 bg-rose-50 border-rose-300' }
  }

  const scoreInfo = getScoreGrade(Number(report?.totalScore) || 0)

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

  if (!report) return null

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          header, nav, aside, .app-header {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
      {/* Print Control Toolbar */}
      <div className="mx-auto max-w-4xl px-4 mb-4 print:hidden flex items-center justify-between">
        <div className="text-xs text-slate-600">
          Format Dokumen Cetak / PDF Laporan Audit 5R PT Chitra Paratama
        </div>
        <Button
          type="button"
          onClick={() => window.print()}
          className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold"
        >
          <Printer className="mr-1.5 size-3.5" />
          Cetak Dokumen / Simpan PDF
        </Button>
      </div>

      {/* Printable Sheet (A4 size) */}
      <div 
        className="pdf-wrapper relative mx-auto w-[210mm] max-w-full min-h-[297mm] bg-white p-8 shadow-md print:shadow-none print:p-6 border border-slate-300 print:border-none text-slate-900 rounded-md font-sans text-xs flex flex-col justify-between box-border overflow-hidden"
        style={{
          backgroundImage: 'url(/chitra-letterhead-bg.png)',
          backgroundSize: '210mm 297mm',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div>
          {/* Corporate Header with Chitra Paratama Logo */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/cp_logo-removebg-preview.png"
              alt="PT Chitra Paratama"
              className="h-12 w-auto object-contain"
            />
            <div className="border-l-2 border-slate-300 pl-3">
              <div className="text-sm font-black uppercase tracking-wider text-slate-900">
                PT CHITRA PARATAMA
              </div>
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                Continuous Process Improvement (CPI) & Quality Management
              </div>
              <div className="text-[9px] text-slate-500 font-medium italic">
                Sistem Tata Graha & Standarisasi Kerja 5R / 5S
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
              LAPORAN AUDIT 5R
            </div>
            <div className="text-xs font-bold text-emerald-800 font-mono tracking-tight">
              {report.reportNumber}
            </div>
            <div className="text-[9px] text-slate-500 font-medium mt-0.5">
              Ref Doc: CP/QMS/5R/F-01
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="mt-4 rounded-md border border-slate-300 bg-slate-50/70 p-3.5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
            <div className="space-y-1.5">
              <div className="grid grid-cols-[110px_1fr]">
                <span className="font-semibold text-slate-600">Area / Lokasi Audit</span>
                <span className="font-bold text-slate-900">: {report.picAreaName}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="font-semibold text-slate-600">Lokasi Penempatan</span>
                <span className="text-slate-800 font-medium">: {report.siteName || 'Balikpapan Head Office'}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="font-semibold text-slate-600">Klasifikasi Audit</span>
                <span className="font-semibold text-emerald-800">
                  : {report.reportType === 'ada_temuan'
                    ? 'Audit Temuan 5R'
                    : report.reportType === 'after_temuan_sebelumnya'
                    ? 'Verifikasi Tindak Lanjut (After Temuan)'
                    : 'Audit Area Terstandar (Bebas Temuan)'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[110px_1fr]">
                <span className="font-semibold text-slate-600">Auditor Pelaksana</span>
                <span className="font-bold text-slate-900">: {report.auditorName}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="font-semibold text-slate-600">Periode Pelaksanaan</span>
                <span className="text-slate-800 font-medium">
                  : {report.auditPeriod} (Tgl: {report.auditDate})
                </span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="font-semibold text-slate-600">Status Dokumen</span>
                <span className="font-bold text-slate-900">
                  : <span className="text-emerald-700">{formatDocStatus(report.status)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Pillars Summary Score Table */}
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center justify-between">
            <span>I. Evaluasi Penilaian 5 Pilar (Ringkas, Rapi, Resik, Rawat, Rajin)</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${scoreInfo.color}`}>
              Grade {scoreInfo.grade} — {scoreInfo.label}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-center text-[11px]">
            <thead className="bg-slate-100 font-semibold text-slate-800">
              <tr>
                <th className="border border-slate-300 py-1.5 px-2">1. Ringkas (Sort)</th>
                <th className="border border-slate-300 py-1.5 px-2">2. Rapi (Set)</th>
                <th className="border border-slate-300 py-1.5 px-2">3. Resik (Shine)</th>
                <th className="border border-slate-300 py-1.5 px-2">4. Rawat (Standard)</th>
                <th className="border border-slate-300 py-1.5 px-2">5. Rajin (Sustain)</th>
                <th className="border border-slate-300 py-1.5 px-2 bg-emerald-100/70 text-emerald-950 font-bold">
                  Skor Akhir Audit
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-semibold">
                <td className="border border-slate-300 py-2">{report.scoreRingkas}</td>
                <td className="border border-slate-300 py-2">{report.scoreRapi}</td>
                <td className="border border-slate-300 py-2">{report.scoreResik}</td>
                <td className="border border-slate-300 py-2">{report.scoreRawat}</td>
                <td className="border border-slate-300 py-2">{report.scoreRajin}</td>
                <td className="border border-slate-300 py-2 font-extrabold text-emerald-800 text-sm bg-emerald-50">
                  {report.totalScore} / 100
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Findings Table with Photos */}
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center justify-between">
            <span>II. Rincian Bukti Temuan, Tindakan Perbaikan & Dokumentasi Foto</span>
            <span className="text-[10px] text-slate-500 font-medium">
              Total {findings?.length || 0} Dokumentasi
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-100 text-slate-800 font-semibold text-center">
                <tr>
                  <th className="border border-slate-300 py-1.5 px-1.5 w-8">No</th>
                  <th className="border border-slate-300 py-1.5 px-2 w-20">Pilar</th>
                  <th className="border border-slate-300 py-1.5 px-2.5">Titik / Area Temuan</th>
                  {report.reportType !== 'tidak_ada_temuan' ? (
                    <>
                      <th className="border border-slate-300 py-1.5 px-2.5">Uraian Temuan / Ketidaksesuaian</th>
                      <th className="border border-slate-300 py-1.5 px-1.5 w-28">Foto Temuan</th>
                      <th className="border border-slate-300 py-1.5 px-2.5">Tindakan Korektif</th>
                      <th className="border border-slate-300 py-1.5 px-1.5 w-28">Foto Perbaikan</th>
                    </>
                  ) : (
                    <th className="border border-slate-300 py-1.5 px-2 w-40">Foto Bukti Kebersihan Area</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!findings || findings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400 text-[11px]">
                      Tidak ada catatan temuan untuk laporan ini.
                    </td>
                  </tr>
                ) : (
                  findings.map((f: any, idx: number) => (
                    <tr key={f.id || idx}>
                      <td className="border border-slate-300 py-2 px-1 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-semibold text-slate-700">
                        {f.category5r || '5R'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2.5 font-medium text-slate-900">
                        {f.area}
                      </td>

                      {report.reportType !== 'tidak_ada_temuan' ? (
                        <>
                          <td className="border border-slate-300 py-2 px-2.5 text-slate-700 leading-snug">
                            {f.findingDescription || '-'}
                          </td>
                          <td className="border border-slate-300 py-2 px-1 text-center">
                            {f.findingPhotoUrl ? (
                              <img
                                src={f.findingPhotoUrl}
                                alt="Foto Temuan"
                                className="h-16 w-auto max-w-[100px] object-cover rounded border border-slate-300 mx-auto"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="border border-slate-300 py-2 px-2.5 text-slate-700 leading-snug">
                            {f.actionDescription || '-'}
                          </td>
                          <td className="border border-slate-300 py-2 px-1 text-center">
                            {f.actionPhotoUrl ? (
                              <img
                                src={f.actionPhotoUrl}
                                alt="Foto Tindakan"
                                className="h-16 w-auto max-w-[100px] object-cover rounded border border-slate-300 mx-auto"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="border border-slate-300 py-2 px-1 text-center">
                          {f.noFindingPhotoUrl ? (
                            <img
                              src={f.noFindingPhotoUrl}
                              alt="Foto Area Standar"
                              className="h-16 w-auto max-w-[120px] object-cover rounded border border-slate-300 mx-auto"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
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

        {/* 3-Level Approval Sign-off Matrices */}
        <div className="mt-8 pt-4 border-t-2 border-slate-800">
          <div className="grid grid-cols-3 gap-3.5 text-center text-[11px]">
            {/* Level 1: Diajukan Oleh */}
            <div className="rounded border border-slate-300 p-2.5 flex flex-col justify-between h-40 bg-slate-50/60">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                Diajukan Oleh,
              </div>

              <div className="my-auto py-1 flex flex-col items-center justify-center min-h-[50px]">
                {report.currentApprovalLevel > 1 || report.status === 'approved' ? (
                  <>
                    <div className="font-bold text-slate-900">Ria Annisa Putri</div>
                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="size-3" /> Terverifikasi
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 italic text-[10px]">Menunggu Verifikasi Mutu</div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-1 text-[10px]">
                <div className="font-bold text-slate-900">Ria Annisa Putri</div>
                <div className="text-[9px] text-slate-500">Quality Management Officer</div>
              </div>
            </div>

            {/* Level 2: Diperiksa Oleh */}
            <div className="rounded border border-slate-300 p-2.5 flex flex-col justify-between h-40 bg-slate-50/60">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                Diperiksa Oleh,
              </div>

              <div className="my-auto py-1 flex flex-col items-center justify-center min-h-[50px]">
                {report.currentApprovalLevel > 2 || report.status === 'approved' ? (
                  <>
                    <div className="font-bold text-slate-900">
                      {approvalRoute[1]?.approverName || 'PJO Site'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="size-3" /> Disetujui
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 italic text-[10px]">Menunggu Persetujuan Site</div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-1 text-[10px]">
                <div className="font-bold text-slate-900">
                  {approvalRoute[1]?.approverName || 'PJO Site'}
                </div>
                <div className="text-[9px] text-slate-500">Kepala Teknik / PJO Site</div>
              </div>
            </div>

            {/* Level 3: Disetujui Oleh */}
            <div className="rounded border border-slate-300 p-2.5 flex flex-col justify-between h-40 bg-slate-50/60">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                Disetujui Oleh,
              </div>

              <div className="my-auto py-1 flex flex-col items-center justify-center min-h-[50px]">
                {report.status === 'approved' ? (
                  <>
                    <div className="font-bold text-slate-900">Bardinia Susi Ekawaty</div>
                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="size-3" /> Disetujui
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 italic text-[10px]">Menunggu Otorisasi Final</div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-1 text-[10px]">
                <div className="font-bold text-slate-900">Bardinia Susi Ekawaty</div>
                <div className="text-[9px] text-slate-500">Head of CPI Department</div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Formal Footer Disclaimer at Bottom of Page */}
        <div className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
          <div>
            Dicetak secara elektronik melalui <strong className="text-slate-700">HERO Enterprise Platform</strong>
          </div>
          <div>
            PT Chitra Paratama • Quality & Operational Excellence
          </div>
        </div>
      </div>
    </div>
  )
}
