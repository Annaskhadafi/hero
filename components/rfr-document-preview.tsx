'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Paperclip,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'

export function RfrAttachmentItem({ rawUrl, index }: { rawUrl: string; index: number }) {
  const cleanUrl = (rawUrl || '').trim()
  const resolvedUrl = resolveClientUploadUrl(cleanUrl)
  const filename = cleanUrl.split('/').pop()?.split('?')[0] || `Lampiran_${index + 1}`
  const lowerUrl = cleanUrl.toLowerCase().split('?')[0]
  const isPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf')
  const isImage =
    /\.(jpe?g|png|webp|gif|svg)($|\?)/i.test(cleanUrl) || cleanUrl.startsWith('data:image')
  const isWord = /\.(docx?|rtf)($|\?)/i.test(cleanUrl)
  const isExcel = /\.(xlsx?|csv)($|\?)/i.test(cleanUrl)

  const [isLoading, setIsLoading] = useState(isPdf || isImage)
  const [loadError, setLoadError] = useState(false)

  // Safety timer: stop spinner after 6 seconds so user is never stuck in endless loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined') {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <span className="flex max-w-md items-center gap-2 truncate">
          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="truncate">
            Lampiran {index + 1}: {filename}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-xs transition-colors hover:bg-blue-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Buka di Tab Baru
          </button>
          <a
            href={resolvedUrl}
            download={filename}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            <Download className="h-3.5 w-3.5" /> Unduh
          </a>
        </div>
      </div>

      {/* Image Preview with Loading Spinner */}
      {isImage && (
        <div className="relative flex max-h-[500px] min-h-[140px] justify-center overflow-hidden rounded border bg-black/5 p-2">
          {isLoading && !loadError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-xs">
              <Loader2 className="mb-1 h-6 w-6 animate-spin text-blue-600" />
              <span className="text-[11px] font-medium text-slate-500">Memuat gambar...</span>
            </div>
          )}
          {loadError ? (
            <div className="space-y-2 p-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
              <p className="text-xs text-slate-600">
                Pratinjau gambar tidak dapat dimuat langsung.
              </p>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Buka Gambar di Tab Baru
              </button>
            </div>
          ) : (
            <img
              src={resolvedUrl}
              alt={filename}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setLoadError(true)
              }}
              className="max-h-[480px] max-w-full rounded object-contain shadow-xs"
            />
          )}
        </div>
      )}

      {/* PDF Embedded View with Clean Iframe & Real Loading State */}
      {isPdf && (
        <div className="space-y-2">
          <div className="relative h-[520px] overflow-hidden rounded border bg-white shadow-inner">
            {isLoading && !loadError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-2 bg-slate-50/90">
                <Loader2 className="h-8 w-8 animate-spin text-[#003461]" />
                <p className="text-xs font-medium text-slate-700">
                  Memuat pratinjau dokumen PDF...
                </p>
                <p className="text-[11px] text-slate-500">Mohon tunggu sebentar</p>
              </div>
            )}
            {loadError ? (
              <div className="flex h-full flex-col items-center justify-center space-y-3 bg-slate-50 p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                <p className="max-w-sm text-xs text-slate-600">
                  Pratinjau PDF tidak didukung otomatis oleh browser pada perangkat ini. Silakan
                  buka dokumen di tab baru atau unduh langsung.
                </p>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Buka Dokumen PDF
                </button>
              </div>
            ) : (
              <iframe
                src={`${resolvedUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="h-full w-full border-0 bg-white"
                title={`Preview ${filename}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setLoadError(true)
                }}
              />
            )}
          </div>
          <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-[11px] text-slate-500">
            <span>Dokumen PDF: {filename}</span>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex cursor-pointer items-center gap-1 font-semibold text-blue-600 underline hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" /> Jika pratinjau tidak muncul atau lambat, klik di
              sini untuk membuka PDF
            </button>
          </div>
        </div>
      )}

      {/* Office Document Preview Card (Word / Excel) */}
      {(isWord || isExcel) && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2.5 ${isWord ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}
            >
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="max-w-xs truncate text-xs font-bold text-slate-800 sm:max-w-md">
                {filename}
              </p>
              <p className="text-[11px] text-slate-500">
                {isWord ? 'Dokumen Microsoft Word' : 'Dokumen Spreadsheet Excel'} · Unduh untuk
                melihat dokumen secara lengkap
              </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Buka
            </button>
            <a
              href={resolvedUrl}
              download={filename}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" /> Unduh Berkas
            </a>
          </div>
        </div>
      )}

      {/* General / Other File Fallback */}
      {!isImage && !isPdf && !isWord && !isExcel && (
        <div className="flex items-center justify-between rounded border bg-white p-3">
          <span className="truncate text-xs text-slate-700">{filename}</span>
          <a
            href={resolvedUrl}
            download={filename}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Download className="h-3.5 w-3.5" /> Download File
          </a>
        </div>
      )}
    </div>
  )
}

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
      className="mx-auto w-full max-w-[800px] rounded-lg border bg-white p-8 font-sans text-[10pt] leading-tight text-black shadow-lg"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <div className="text-lg font-bold text-blue-900">
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-8 w-auto" />
        </div>
        <div className="border-b border-black pb-0.5 text-center text-sm font-bold tracking-wide">
          REQUEST FOR RECRUITMENT FORM
        </div>
        <div className="text-[7pt] text-amber-600 italic">Internal information</div>
      </div>

      {/* Section A */}
      <div className="mb-4">
        <div className="mb-2 border-b border-gray-400 pb-1 text-xs font-bold text-slate-800">
          A. Requestor Information
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div>
            <span className="inline-block w-32 font-medium">Request Date</span>: {rfr.requestDate}
          </div>
          <div>
            <span className="inline-block w-32 font-medium">Join Date Estimation</span>:{' '}
            {rfr.joinDateEstimation}
          </div>
          <div>
            <span className="inline-block w-32 font-medium">Requestor Name</span>:{' '}
            {rfr.requestorName}
          </div>
          <div>
            <span className="inline-block w-32 font-medium">Received by HR</span>:{' '}
            {rfr.receivedByHr || '-'}
          </div>
          <div className="col-span-2">
            <span className="inline-block w-32 font-medium">Section/ Dept</span>:{' '}
            {rfr.sectionDepartment}
          </div>
        </div>
      </div>

      {/* Section B */}
      <div className="mb-4">
        <div className="mb-2 border-b border-gray-400 pb-1 text-xs font-bold text-slate-800">
          B. Request Information
        </div>
        <div className="mb-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div>
            <span className="inline-block w-32 font-medium">Position title</span>:{' '}
            <strong>{rfr.positionTitle}</strong>
          </div>
          <div>
            <span className="inline-block w-32 font-medium">Number</span>:{' '}
            <strong>{rfr.numberOfPersons} Person(s)</strong>
          </div>
        </div>
        <div className="mb-2 text-xs">
          <span className="font-bold">Brief Job Description:</span>
          <p className="mt-1 rounded border bg-slate-50 p-2 whitespace-pre-wrap text-slate-800">
            {rfr.briefJobDescription || '-'}
          </p>
        </div>
      </div>

      {/* Section C */}
      <div className="mb-4">
        <div className="mb-2 border-b border-gray-400 pb-1 text-xs font-bold text-slate-800">
          C. Basic Requirements
        </div>
        <div className="grid grid-cols-2 gap-y-1 text-xs">
          <div>
            <span className="inline-block w-36 font-medium">Jenis Kelamin</span>:{' '}
            {rfr.sexPreference}
          </div>
          <div>
            <span className="inline-block w-36 font-medium">Rentang Usia</span>: {rfr.agePreference}
          </div>
          <div>
            <span className="inline-block w-36 font-medium">Tingkat Pendidikan</span>:{' '}
            {rfr.educationDegree}
          </div>
          <div>
            <span className="inline-block w-36 font-medium">Pengalaman Kerja</span>:{' '}
            {rfr.yearsOfExperience}
          </div>
        </div>
      </div>

      {/* Section D: Functional Competencies */}
      {rfr.functionalCompetencies && rfr.functionalCompetencies.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 border-b border-gray-400 pb-1 text-xs font-bold text-slate-800">
            D. Functional Competencies
          </div>
          <table className="w-full border border-gray-300 text-xs">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-left">
                <th className="w-10 border-r border-gray-300 p-1 text-center">No</th>
                <th className="border-r border-gray-300 p-1">Skill / Competency</th>
                <th className="w-28 border-r border-gray-300 p-1 text-center">Tingkat</th>
                <th className="p-1">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {rfr.functionalCompetencies.map((comp: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="border-r border-gray-300 p-1 text-center">{idx + 1}</td>
                  <td className="border-r border-gray-300 p-1">{comp.skillName}</td>
                  <td className="border-r border-gray-300 p-1 text-center capitalize">
                    {comp.level}
                  </td>
                  <td className="p-1">{comp.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section E: Matrix Approval Signatures */}
      <div className="mt-6 border-t border-gray-300 pt-4">
        <div className="mb-4 border-b border-gray-400 pb-1 text-xs font-bold text-gray-800">
          E. Approval Workflow & Signatures
        </div>
        <div className="grid grid-cols-6 gap-2 text-center text-[8pt]">
          {approvals.map((app, idx) => {
            const isFirst = idx === 0
            const sigUrl = isFirst && liveSignatureUrl ? liveSignatureUrl : app.signatureDataUrl

            return (
              <div
                key={idx}
                className="flex h-36 flex-col justify-between rounded border border-gray-300 bg-gray-50/50 p-1"
              >
                <div
                  className="truncate border-b pb-1 text-[7.5pt] font-semibold text-gray-700"
                  title={app.roleLabel}
                >
                  {app.roleLabel}
                </div>

                <div className="my-auto flex min-h-[50px] flex-col items-center justify-center p-1">
                  {sigUrl ? (
                    <img
                      src={sigUrl}
                      alt="Signature"
                      className="max-h-12 max-w-full object-contain"
                    />
                  ) : app.status === 'approved' ? (
                    <span className="rounded border border-emerald-200 bg-emerald-50 px-1 py-0.5 text-[7pt] font-bold text-emerald-700">
                      Approved
                    </span>
                  ) : app.status === 'rejected' ? (
                    <span className="rounded border border-rose-200 bg-rose-50 px-1 py-0.5 text-[7pt] font-bold text-rose-700">
                      Rejected
                    </span>
                  ) : (
                    <span className="text-[7pt] text-gray-400 italic">Pending</span>
                  )}
                </div>

                <div className="border-t pt-1">
                  <div className="truncate text-[7pt] font-bold" title={app.approverName}>
                    {app.approverName}
                  </div>
                  <div className="truncate text-[6.5pt] text-gray-500" title={app.approverTitle}>
                    {app.approverTitle || '-'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section F: Lampiran & Dokumen Pendukung */}
      {((rfr.uploadedAttachmentUrls && rfr.uploadedAttachmentUrls.length > 0) ||
        rfr.attachmentMpp ||
        rfr.attachmentJd) && (
        <div className="mt-6 border-t border-gray-300 pt-4">
          <div className="mb-3 flex items-center justify-between border-b border-gray-400 pb-1 text-xs font-bold text-gray-900">
            <span className="flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-blue-600" />
              F. Lampiran & Dokumen Pendukung
            </span>
            {rfr.uploadedAttachmentUrls?.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-normal text-blue-800">
                {rfr.uploadedAttachmentUrls.length} Berkas
              </span>
            )}
          </div>

          {/* Status checklist of required attachments */}
          <div className="mb-4 flex flex-wrap gap-4 rounded border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Lampiran MPP:</span>
              {rfr.attachmentMpp ? (
                <span className="flex items-center gap-0.5 font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Melampirkan MPP
                </span>
              ) : (
                <span className="text-slate-400">Tidak ada</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Lampiran Job Description (JD):</span>
              {rfr.attachmentJd ? (
                <span className="flex items-center gap-0.5 font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Melampirkan JD
                </span>
              ) : (
                <span className="text-slate-400">Tidak ada</span>
              )}
            </div>
          </div>

          {/* Uploaded File Previews (Images, PDFs, Documents) */}
          {Array.isArray(rfr.uploadedAttachmentUrls) && rfr.uploadedAttachmentUrls.length > 0 ? (
            <div className="space-y-4">
              {rfr.uploadedAttachmentUrls.map((rawUrl: string, idx: number) => (
                <RfrAttachmentItem key={idx} rawUrl={rawUrl} index={idx} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
