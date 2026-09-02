'use client'

import React from 'react'
import { CheckCircle2, Paperclip, FileText, Download, ExternalLink } from 'lucide-react'

type RfrDocumentPreviewProps = {
  rfr: any
  approvals: any[]
  containerRef?: React.RefObject<HTMLDivElement | null>
  liveSignatureUrl?: string | null
  currentStepOrder?: number | null
}

export function RfrDocumentPreview({
  rfr,
  approvals,
  containerRef,
  liveSignatureUrl,
  currentStepOrder,
}: RfrDocumentPreviewProps) {
  if (!rfr) return null

  return (
    <div 
      ref={containerRef as any}
      className="bg-white p-8 shadow-lg border rounded-lg text-[10pt] font-sans leading-tight text-black max-w-[800px] mx-auto w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <div className="font-bold text-blue-900 text-lg">
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-8 w-auto" />
        </div>
        <div className="text-center font-bold text-sm tracking-wide border-b border-black pb-0.5">
          REQUEST FOR RECRUITMENT FORM
        </div>
        <div className="text-[7pt] text-amber-600 italic">Internal information</div>
      </div>

      {/* Section A */}
      <div className="mb-4">
        <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs text-slate-800">A. Requestor Information</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div><span className="w-32 inline-block font-medium">Request Date</span>: {rfr.requestDate}</div>
          <div><span className="w-32 inline-block font-medium">Join Date Estimation</span>: {rfr.joinDateEstimation}</div>
          <div><span className="w-32 inline-block font-medium">Requestor Name</span>: {rfr.requestorName}</div>
          <div><span className="w-32 inline-block font-medium">Received by HR</span>: {rfr.receivedByHr || '-'}</div>
          <div className="col-span-2"><span className="w-32 inline-block font-medium">Section/ Dept</span>: {rfr.sectionDepartment}</div>
        </div>
      </div>

      {/* Section B */}
      <div className="mb-4">
        <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs text-slate-800">B. Request Information</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
          <div><span className="w-32 inline-block font-medium">Position title</span>: <strong>{rfr.positionTitle}</strong></div>
          <div><span className="w-32 inline-block font-medium">Number</span>: <strong>{rfr.numberOfPersons} Person(s)</strong></div>
        </div>
        <div className="text-xs mb-2">
          <span className="font-bold">Brief Job Description:</span>
          <p className="p-2 bg-slate-50 border rounded mt-1 text-slate-800 whitespace-pre-wrap">{rfr.briefJobDescription || '-'}</p>
        </div>
      </div>

      {/* Section C */}
      <div className="mb-4">
        <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs text-slate-800">C. Basic Requirements</div>
        <div className="grid grid-cols-2 gap-y-1 text-xs">
          <div><span className="font-medium w-36 inline-block">Jenis Kelamin</span>: {rfr.sexPreference}</div>
          <div><span className="font-medium w-36 inline-block">Rentang Usia</span>: {rfr.agePreference}</div>
          <div><span className="font-medium w-36 inline-block">Pendidikan</span>: {rfr.educationDegree?.toUpperCase()}</div>
          <div><span className="font-medium w-36 inline-block">Pengalaman</span>: {rfr.yearsOfExperience}</div>
        </div>
      </div>

      {/* Section D */}
      <div className="mb-4">
        <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs text-slate-800">D. Functional Competency</div>
        <table className="w-full border-collapse border border-gray-300 text-xs text-left">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="p-1 border-r w-6">No</th>
              <th className="p-1 border-r">Skill / Competency</th>
              <th className="p-1 border-r w-24 text-center">Level</th>
              <th className="p-1">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(rfr.functionalCompetencies || []).map((comp: any, idx: number) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="p-1 border-r text-center">{idx + 1}</td>
                <td className="p-1 border-r">{comp.skillName}</td>
                <td className="p-1 border-r text-center font-medium capitalize">{comp.level}</td>
                <td className="p-1">{comp.remarks || '-'}</td>
              </tr>
            ))}
            {(rfr.functionalCompetencies || []).length === 0 && (
              <tr>
                <td colSpan={4} className="p-2 text-center text-slate-400">Tidak ada kompetensi fungsional yang ditambahkan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section E: Approval Matrix */}
      <div className="mb-4">
        <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs text-slate-800">E. Approval Matrix</div>
        <div
          className="grid border border-gray-400 divide-x divide-gray-400 text-center bg-white"
          style={{ gridTemplateColumns: `repeat(${approvals.length}, minmax(0, 1fr))` }}
        >
          {approvals.map((step: any, idx: number) => {
            const effectiveCurrentStep = currentStepOrder || rfr?.currentStepOrder || 1
            const isActiveStep = step.stepOrder === effectiveCurrentStep
            const isFirstStep = step.stepOrder === 1 || idx === 0
            const hasSig = Boolean(step.signatureDataUrl)
            const isApproved = step.status === 'approved' || (isFirstStep && hasSig)
            const cleanRemark =
              step.remarks &&
              !['Resubmitted after revision', 'Submitted', 'Reverted', 'Approved', 'approved'].includes(step.remarks.trim())
                ? step.remarks.trim()
                : ''

            return (
              <div key={step.id || step.stepOrder} className="flex flex-col justify-between p-1 bg-white">
                {/* 1. Header Role (No cutoff, word wrap cleanly) */}
                <div className="h-[28px] border-b border-gray-300 pb-0.5 flex items-center justify-center text-center font-bold text-[6.5pt] leading-[1.1] text-gray-800 px-0.5 break-words w-full">
                  {step.roleLabel}
                </div>

                {/* 2. Signature Box (Strictly Aligned Height & Centered) */}
                <div className="flex items-center justify-center h-[46px] w-full px-0.5 my-1">
                  {isActiveStep && liveSignatureUrl ? (
                    <img src={liveSignatureUrl} alt="Live TTD" className="max-h-[42px] max-w-full object-contain" />
                  ) : hasSig ? (
                    <img src={step.signatureDataUrl} alt="TTD" className="max-h-[42px] max-w-full object-contain" />
                  ) : (
                    <span className="text-[6.5pt] italic text-gray-400">
                      {isApproved ? '[Signed]' : 'Pending TTD'}
                    </span>
                  )}
                </div>

                {/* 3. Bottom Info Section (Grounded snugly to bottom border) */}
                <div className="w-full pb-0.5 space-y-0.5">
                  {/* Nama */}
                  <div className="font-bold text-[6.5pt] underline text-gray-900 leading-tight text-center truncate px-0.5">
                    {step.approverName || '-'}
                  </div>

                  {/* Jabatan */}
                  <div className="text-[5.5pt] text-gray-600 leading-tight text-center truncate px-0.5">
                    {step.approverTitle || '-'}
                  </div>

                  {/* Jam - Tanggal */}
                  <div className="text-[5pt] text-gray-500 font-medium leading-tight text-center truncate px-0.5">
                    {step.signedAt ? (
                      <span>
                        {new Date(step.signedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} —{' '}
                        {new Date(step.signedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </div>

                  {/* Catatan Approver */}
                  <div className="text-[5pt] text-gray-500 leading-tight text-center truncate px-0.5 min-h-[11px] flex items-center justify-center">
                    {cleanRemark ? (
                      <span className="truncate max-w-full" title={cleanRemark}>
                        Catatan: {cleanRemark}
                      </span>
                    ) : (
                      <span className="text-transparent">-</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section F: Lampiran & Dokumen Pendukung */}
      {((rfr.uploadedAttachmentUrls && rfr.uploadedAttachmentUrls.length > 0) || rfr.attachmentMpp || rfr.attachmentJd) && (
        <div className="mt-6 pt-4 border-t border-gray-300">
          <div className="font-bold border-b border-gray-400 pb-1 mb-3 text-xs flex items-center justify-between text-gray-900">
            <span className="flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-blue-600" />
              F. Lampiran & Dokumen Pendukung
            </span>
            {rfr.uploadedAttachmentUrls?.length > 0 && (
              <span className="text-[10px] font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {rfr.uploadedAttachmentUrls.length} Berkas
              </span>
            )}
          </div>

          {/* Status checklist of required attachments */}
          <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Lampiran MPP:</span>
              {rfr.attachmentMpp ? (
                <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Melampirkan MPP
                </span>
              ) : (
                <span className="text-slate-400">Tidak ada</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Lampiran Job Description (JD):</span>
              {rfr.attachmentJd ? (
                <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Melampirkan JD
                </span>
              ) : (
                <span className="text-slate-400">Tidak ada</span>
              )}
            </div>
          </div>

          {/* Uploaded File Previews (Images, PDFs, Documents) */}
          {Array.isArray(rfr.uploadedAttachmentUrls) && rfr.uploadedAttachmentUrls.length > 0 ? (
            <div className="space-y-4">
              {rfr.uploadedAttachmentUrls.map((url: string, idx: number) => {
                const cleanUrl = url.trim()
                const filename = cleanUrl.split('/').pop() || `Lampiran_${idx + 1}`
                const isPdf = cleanUrl.toLowerCase().endsWith('.pdf') || cleanUrl.toLowerCase().includes('.pdf')
                const isImage = /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(cleanUrl) || cleanUrl.startsWith('data:image')

                return (
                  <div key={idx} className="border border-slate-300 rounded-lg p-3 bg-slate-50 text-slate-900 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold border-b pb-2 border-slate-200">
                      <span className="flex items-center gap-2 truncate max-w-lg">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        Lampiran {idx + 1}: {filename}
                      </span>
                      <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Buka Fullscreen
                      </a>
                    </div>

                    {/* Image Preview */}
                    {isImage && (
                      <div className="rounded border bg-black/5 p-2 flex justify-center max-h-[500px] overflow-hidden">
                        <img
                          src={cleanUrl}
                          alt={filename}
                          className="max-h-[480px] max-w-full object-contain rounded shadow-sm"
                        />
                      </div>
                    )}

                    {/* PDF Embedded View */}
                    {isPdf && (
                      <div className="rounded border bg-white h-[500px] overflow-hidden shadow-inner">
                        <iframe
                          src={cleanUrl}
                          className="w-full h-full border-0"
                          title={`Preview ${filename}`}
                        />
                      </div>
                    )}

                    {/* General / Other File Fallback */}
                    {!isImage && !isPdf && (
                      <div className="p-3 bg-white rounded border flex items-center justify-between">
                        <span className="text-xs text-slate-700 truncate">{filename}</span>
                        <a
                          href={cleanUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download File
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
