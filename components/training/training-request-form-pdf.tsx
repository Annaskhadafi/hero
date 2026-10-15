'use client'

import React from 'react'
import Image from 'next/image'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

export interface TrainingRequestPdfProps {
  request: {
    requestNumber: string
    documentCode?: string
    revision?: string
    requesterName: string
    requesterDepartment?: string
    requesterPosition?: string
    participantsType: string
    participantNames?: string
    participantDetails?: any
    jobLevel: string
    department: string
    workLocation: string
    trainingTitle: string
    trainingType?: string
    trainingCategory?: string
    trainingDate: string
    trainingVenue: string
    costAmount: string
    costCurrency?: string
    costNotes?: string
    providerName: string
    providerContact?: string
    objectives?: any
    pastTrainings?: any
    attachmentUrl?: string | null
    status: string
    createdAt?: any
  }
  approvals: Array<{
    stepOrder: number
    roleLabel: string
    approverName: string
    approverTitle?: string
    status: string
    signatureDataUrl?: string | null
    approvedAt?: any
    remarks?: string
  }>
  liveSignatureUrl?: string | null
  currentStepOrder?: number
}

export function TrainingRequestFormPdf({
  request,
  approvals = [],
  liveSignatureUrl,
  currentStepOrder,
}: TrainingRequestPdfProps) {
  const objectivesList: string[] = Array.isArray(request.objectives)
    ? request.objectives
    : []

  const pastTrainingsList: string[] = Array.isArray(request.pastTrainings)
    ? request.pastTrainings
    : []

  const participantDetailsList: any[] = Array.isArray(request.participantDetails)
    ? request.participantDetails
    : []

  const formattedCost = () => {
    const curr = request.costCurrency || 'IDR'
    const num = Number(String(request.costAmount).replace(/[^0-9.-]+/g, ''))
    if (!isNaN(num) && num > 0) {
      if (curr === 'USD') return `$ ${num.toLocaleString('en-US')}`
      return `Rp ${num.toLocaleString('id-ID')}`
    }
    return request.costAmount || '-'
  }

  // Ensure 5 standard approval tiers for layout stability
  const sortedApprovals = [...approvals].sort((a, b) => a.stepOrder - b.stepOrder)

  return (
    <div className="pdf-wrapper bg-white text-slate-900 mx-auto w-full max-w-[850px] p-6 sm:p-8 font-sans text-[11px] leading-relaxed border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          .pdf-wrapper {
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Official Header Table */}
      <table className="w-full border-collapse border border-slate-800 mb-4">
        <tbody>
          <tr>
            <td className="w-[140px] border border-slate-800 p-2 text-center align-middle bg-white">
              <div className="flex flex-col items-center justify-center">
                <span className="font-extrabold text-[15px] tracking-wider text-[#003461]">
                  CHITRA
                </span>
                <span className="text-[8px] font-semibold tracking-widest text-slate-600 uppercase">
                  PT Chitra Paratama
                </span>
              </div>
            </td>
            <td className="border border-slate-800 p-3 text-center align-middle">
              <h1 className="text-[13px] font-black uppercase tracking-wider text-slate-900 m-0">
                FORMULIR PENDAFTARAN TRAINING / SEMINAR / LOKAKARYA
              </h1>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                No. Registrasi: <strong className="text-slate-900">{request.requestNumber}</strong>
              </p>
            </td>
            <td className="w-[170px] border border-slate-800 p-1.5 align-middle text-[9.5px]">
              <table className="w-full border-none">
                <tbody>
                  <tr>
                    <td className="font-semibold text-slate-600 pr-1">No Dok</td>
                    <td>: {request.documentCode || 'F.HR.STD.011.00'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-600 pr-1">Revisi</td>
                    <td>: {request.revision || '00'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-600 pr-1">Tgl Terbit</td>
                    <td>: {request.createdAt ? new Date(request.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-600 pr-1">Halaman</td>
                    <td>: 1 dari 1</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section 1: Data Peserta */}
      <div className="mb-3">
        <div className="bg-slate-100 border border-slate-800 px-2 py-1 font-bold text-[10px] uppercase tracking-wide text-slate-800">
          I. DATA PESERTA
        </div>
        <table className="w-full border-collapse border border-slate-800 border-t-0 text-[10px]">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="w-[180px] p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Nama Peserta
              </td>
              <td className="p-2 font-bold text-slate-900">
                {request.participantsType === 'attached_list' ? (
                  <span className="italic text-blue-700">List Peserta Terlampir ({participantDetailsList.length > 0 ? `${participantDetailsList.length} orang terdaftar` : 'Lampiran Dokumen'})</span>
                ) : (
                  request.participantNames || request.requesterName || '-'
                )}
              </td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Jabatan / Level
              </td>
              <td className="p-2 text-slate-800">{request.jobLevel || '-'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Departemen
              </td>
              <td className="p-2 text-slate-800">{request.department || request.requesterDepartment || '-'}</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Lokasi Kerja (Site / Office)
              </td>
              <td className="p-2 text-slate-800">{request.workLocation || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Participant Breakdown Table if multiple */}
      {participantDetailsList.length > 0 && (
        <div className="mb-3">
          <table className="w-full border-collapse border border-slate-800 text-[9px]">
            <thead className="bg-slate-100 border-b border-slate-800">
              <tr>
                <th className="p-1 border-r border-slate-300 w-8 text-center">No</th>
                <th className="p-1 border-r border-slate-300 text-left">Nama Lengkap</th>
                <th className="p-1 border-r border-slate-300 text-left">Jabatan</th>
                <th className="p-1 border-r border-slate-300 text-left">Departemen</th>
                <th className="p-1 text-left">Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {participantDetailsList.map((p, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="p-1 border-r border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-1 border-r border-slate-300 font-semibold">{p.name || '-'}</td>
                  <td className="p-1 border-r border-slate-300">{p.position || '-'}</td>
                  <td className="p-1 border-r border-slate-300">{p.department || '-'}</td>
                  <td className="p-1">{p.location || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 2: Informasi Training */}
      <div className="mb-3">
        <div className="bg-slate-100 border border-slate-800 px-2 py-1 font-bold text-[10px] uppercase tracking-wide text-slate-800">
          II. INFORMASI TRAINING / SEMINAR / LOKAKARYA
        </div>
        <table className="w-full border-collapse border border-slate-800 border-t-0 text-[10px]">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="w-[180px] p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Judul Program
              </td>
              <td className="p-2 font-bold text-slate-900">{request.trainingTitle}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Kategori &amp; Jenis
              </td>
              <td className="p-2 text-slate-800">
                {request.trainingType || 'Training'} ({request.trainingCategory || 'External'})
              </td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Tanggal Penyelenggaraan
              </td>
              <td className="p-2 font-semibold text-slate-800">{request.trainingDate || '-'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Tempat Pelaksanaan (Venue)
              </td>
              <td className="p-2 text-slate-800">{request.trainingVenue || '-'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Lembaga Penyelenggara
              </td>
              <td className="p-2 text-slate-800">
                <strong>{request.providerName || '-'}</strong>
                {request.providerContact ? ` (Kontak: ${request.providerContact})` : ''}
              </td>
            </tr>
            <tr>
              <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r border-slate-300">
                Biaya &amp; Beban Biaya
              </td>
              <td className="p-2 text-slate-900">
                <span className="font-extrabold text-[#003461]">{formattedCost()}</span>
                {request.costNotes && (
                  <span className="text-slate-600 block text-[9.5px] mt-0.5">
                    Catatan Biaya: {request.costNotes}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 3: Tujuan Mengikuti Training */}
      <div className="mb-3">
        <div className="bg-slate-100 border border-slate-800 px-2 py-1 font-bold text-[10px] uppercase tracking-wide text-slate-800">
          III. TUJUAN MENGIKUTI TRAINING / SEMINAR / LOKAKARYA
        </div>
        <div className="border border-slate-800 border-t-0 p-2.5 text-[9.5px]">
          {objectivesList.length > 0 ? (
            <ol className="list-decimal pl-4 space-y-1">
              {objectivesList.map((obj, i) => (
                <li key={i} className="text-slate-800 leading-normal">
                  {obj}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-slate-500 italic">
              1. Meningkatkan kompetensi teknis dan manajerial sesuai kebutuhan operasional perusahaan.
            </p>
          )}
        </div>
      </div>

      {/* Section 4: Training yang Pernah Diikuti Selama 1 Tahun Terakhir */}
      <div className="mb-4">
        <div className="bg-slate-100 border border-slate-800 px-2 py-1 font-bold text-[10px] uppercase tracking-wide text-slate-800">
          IV. TRAINING / SEMINAR YANG PERNAH DIIKUTI SELAMA 1 TAHUN TERAKHIR
        </div>
        <table className="w-full border-collapse border border-slate-800 border-t-0 text-[9.5px]">
          <thead className="bg-slate-50 border-b border-slate-300">
            <tr>
              <th className="w-8 p-1.5 border-r border-slate-300 text-center font-bold">No</th>
              <th className="p-1.5 text-left font-bold">Nama Training / Seminar / Lokakarya</th>
            </tr>
          </thead>
          <tbody>
            {pastTrainingsList.length > 0 ? (
              pastTrainingsList.map((t, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="p-1.5 border-r border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-1.5 text-slate-800">{t}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="p-2 text-center text-slate-400 italic">
                  Belum ada catatan training dalam 1 tahun terakhir / Baru pertama kali mengajukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section 5: Signature Boxes (5 Column Multi-Tier Approval Grid) */}
      <div className="mt-4">
        <table className="w-full border-collapse border border-slate-800 text-center text-[9.5px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-800">
              <th className="w-1/5 p-1.5 border-r border-slate-800 font-bold uppercase">
                Diajukan Oleh,
              </th>
              <th className="w-1/5 p-1.5 border-r border-slate-800 font-bold uppercase">
                HR Verifikasi,
              </th>
              <th className="w-1/5 p-1.5 border-r border-slate-800 font-bold uppercase">
                Mengetahui,
              </th>
              <th className="w-1/5 p-1.5 border-r border-slate-800 font-bold uppercase">
                Mengetahui,
              </th>
              <th className="w-1/5 p-1.5 font-bold uppercase">
                Menyetujui,
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-800 text-[8.5px] text-slate-600">
              <th className="p-0.5 border-r border-slate-800 font-medium">Pemohon</th>
              <th className="p-0.5 border-r border-slate-800 font-medium">HR Training</th>
              <th className="p-0.5 border-r border-slate-800 font-medium">Manager</th>
              <th className="p-0.5 border-r border-slate-800 font-medium">Gen. Operation Mgr</th>
              <th className="p-0.5 font-medium">Direktur</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[1, 2, 3, 4, 5].map((stepNum) => {
                const step = sortedApprovals.find((s) => s.stepOrder === stepNum) || sortedApprovals[stepNum - 1]
                const isCurrentLive = currentStepOrder === stepNum && liveSignatureUrl
                const signatureUrl = isCurrentLive ? liveSignatureUrl : step?.signatureDataUrl
                const isApproved = step?.status === 'approved' || (isCurrentLive && Boolean(liveSignatureUrl))

                return (
                  <td
                    key={stepNum}
                    className={`h-[90px] border-r last:border-r-0 border-slate-800 p-1 align-bottom relative ${
                      step?.status === 'rejected' ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center justify-end h-full">
                      {isApproved && signatureUrl ? (
                        <div className="mb-1">
                          <img
                            src={resolveUploadUrl(signatureUrl)}
                            alt="TTD"
                            className="max-h-[50px] max-w-[110px] object-contain"
                          />
                          <span className="block text-[7.5px] text-emerald-700 font-semibold">
                            ✓ Digital Signed
                          </span>
                        </div>
                      ) : step?.status === 'rejected' ? (
                        <div className="mb-2">
                          <span className="inline-block px-1.5 py-0.5 text-[8px] font-bold text-rose-700 border border-rose-300 rounded bg-rose-100">
                            ✕ DITOLAK
                          </span>
                        </div>
                      ) : (
                        <div className="mb-4 text-slate-300 text-[9px] italic">
                          (Menunggu TTD)
                        </div>
                      )}

                      <div className="w-full border-t border-slate-400 pt-1 text-[9px] font-bold text-slate-900 truncate px-1">
                        {step?.approverName || (stepNum === 1 ? request.requesterName : '-')}
                      </div>
                      <div className="text-[8px] text-slate-500 truncate px-1">
                        {step?.approverTitle || (stepNum === 1 ? (request.requesterPosition || 'Pemohon') : step?.roleLabel || '-')}
                      </div>
                      {step?.approvedAt && (
                        <div className="text-[7.5px] text-slate-400">
                          {new Date(step.approvedAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ISO Footer Note */}
      <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-500">
        <span>One Chitra HERO &bull; Human Resources &amp; General Affairs</span>
        <span>Dokumen Internal PT Chitra Paratama &bull; Formulir Terkendali ISO</span>
      </div>
    </div>
  )
}
