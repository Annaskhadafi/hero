'use client'

import { useRef, useState, useTransition } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { approveRfrStep, rejectRfrStep } from '@/app/actions/rfr'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, FileCheck, Download, Printer, ExternalLink, FileText, Paperclip } from 'lucide-react'

type RfrPublicApprovalProps = {
  token: string
  approval: any
  rfr: any
  approvals: any[]
}

function hasVisibleCanvasInk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return false
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) return true
  }
  return false
}

export function RfrPublicApproval({ token, approval, rfr, approvals }: RfrPublicApprovalProps) {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [remarks, setRemarks] = useState(approval.remarks || '')
  const [error, setError] = useState('')
  const [done, setDone] = useState(approval.status === 'approved')
  const [rejected, setRejected] = useState(approval.status === 'rejected')
  const [isPending, startTransition] = useTransition()

  function getSignatureDataUrl() {
    const signature = signatureRef.current
    if (!signature) return ''
    const canvas = signature.getCanvas()
    if (!hasVisibleCanvasInk(canvas) && signature.isEmpty()) return ''
    try {
      return signature.getTrimmedCanvas().toDataURL('image/png')
    } catch {
      return signature.toDataURL('image/png')
    }
  }

  function handleClearSignature() {
    signatureRef.current?.clear()
  }

  function handleApprove() {
    setError('')
    const signatureDataUrl = getSignatureDataUrl()
    if (!signatureDataUrl) {
      setError('Tanda tangan digital wajib diisi pada kotak canvas.')
      return
    }

    startTransition(async () => {
      const res = await approveRfrStep(token, {
        signatureDataUrl,
        remarks,
      })
      if (res.success) {
        setDone(true)
      } else {
        setError(res.error || 'Gagal menyimpan persetujuan.')
      }
    })
  }

  function handleReject() {
    if (!remarks.trim()) {
      setError('Alasan penolakan wajib diisi pada catatan.')
      return
    }
    startTransition(async () => {
      const res = await rejectRfrStep(token, remarks)
      if (res.success) {
        setRejected(true)
      } else {
        setError(res.error || 'Gagal menolak permohonan.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Persetujuan Dokumen RFR</h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {rfr.rfrNumber} — {rfr.positionTitle} ({rfr.numberOfPersons} Person)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/api/hc/rfr/${rfr.id}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>

        {/* Step Banner */}
        <div className="bg-blue-900 text-white p-4 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-200">Tahap Persetujuan Anda</span>
            <div className="text-lg font-bold">
              {approval.roleLabel} — {approval.approverName}
            </div>
            <div className="text-xs text-blue-200">{approval.approverTitle}</div>
          </div>
          <Badge className="bg-white text-blue-900 font-bold px-3 py-1 text-xs">
            Langkah {approval.stepOrder} / 6
          </Badge>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        {done && (
          <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
            <div className="flex items-center gap-2 text-lg font-bold text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" /> RFR Berhasil Disetujui
            </div>
            <p className="text-sm">
              Tanda tangan digital Anda telah tersimpan. Sistem telah memproses RFR ke langkah berikutnya.
            </p>
          </div>
        )}

        {rejected && (
          <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
            <div className="flex items-center gap-2 text-lg font-bold text-rose-900">
              <XCircle className="w-6 h-6 text-rose-600" /> Permohonan Ditolak
            </div>
            <p className="text-sm">Status RFR ini telah diubah menjadi Ditolak.</p>
          </div>
        )}

        {/* Action Panel for Digital Signature */}
        {!done && !rejected && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2 text-base">
              Bubuhkan Tanda Tangan Digital
            </h3>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Canvas Tanda Tangan Digital (Gunakan Mouse / Touch Screen)
                </label>
                <Button variant="ghost" size="sm" type="button" onClick={handleClearSignature} className="text-xs text-rose-600">
                  Bersihkan Canvas
                </Button>
              </div>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 p-2">
                <SignatureCanvas
                  ref={(ref) => { signatureRef.current = ref }}
                  canvasProps={{
                    className: 'w-full h-44 bg-transparent cursor-crosshair',
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Catatan / Remarks (Opsional)
              </label>
              <Textarea
                rows={2}
                placeholder="Catatan tambahan persetujuan..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" type="button" disabled={isPending} onClick={handleReject} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                Tolak RFR
              </Button>
              <Button type="button" disabled={isPending} onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2">
                <CheckCircle2 className="w-4 h-4" /> {isPending ? 'Memproses...' : 'Setujui & Tanda Tangan'}
              </Button>
            </div>
          </div>
        )}

        {/* Full Document View (WYSIWYG A4 Layout) */}
        <div className="bg-white p-8 shadow-lg border rounded-lg text-[10pt] font-sans leading-tight text-black max-w-[800px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="font-bold text-blue-900 text-lg">Chitra Paratama</div>
            <div className="text-center font-bold text-sm tracking-wide border-b border-black pb-0.5">
              REQUEST FOR RECRUITMENT FORM
            </div>
            <div className="text-[7pt] text-amber-600 italic">Internal information</div>
          </div>

          {/* Section A */}
          <div className="mb-4">
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">A. Requestor Information</div>
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
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">B. Request Information</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
              <div><span className="w-32 inline-block font-medium">Position title</span>: <strong>{rfr.positionTitle}</strong></div>
              <div><span className="w-32 inline-block font-medium">Number</span>: <strong>{rfr.numberOfPersons} Person(s)</strong></div>
            </div>
            <div className="text-xs mb-2">
              <span className="font-bold">Brief Job Description:</span>
              <p className="p-2 bg-slate-50 border rounded mt-1 text-slate-800">{rfr.briefJobDescription || '-'}</p>
            </div>
          </div>

          {/* Section C */}
          <div className="mb-4">
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">C. Basic Requirements</div>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <div><span className="font-medium w-36 inline-block">Jenis Kelamin</span>: {rfr.sexPreference}</div>
              <div><span className="font-medium w-36 inline-block">Rentang Usia</span>: {rfr.agePreference}</div>
              <div><span className="font-medium w-36 inline-block">Pendidikan</span>: {rfr.educationDegree?.toUpperCase()}</div>
              <div><span className="font-medium w-36 inline-block">Pengalaman</span>: {rfr.yearsOfExperience}</div>
            </div>
          </div>

          {/* Section D */}
          <div className="mb-4">
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">D. Functional Competency</div>
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
              </tbody>
            </table>
          </div>

          {/* Section E */}
          <div>
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">E. Approval Matrix</div>
            <div className="grid grid-cols-6 border border-gray-400 divide-x divide-gray-400 text-center">
              {approvals.map((step: any) => (
                <div key={step.id} className="p-1.5 flex flex-col justify-between min-h-[90px]">
                  <div className="font-bold text-[7pt] border-b pb-0.5 text-gray-800">{step.roleLabel}</div>
                  <div className="my-1 flex items-center justify-center min-h-[30px]">
                    {step.status === 'approved' && step.signatureDataUrl ? (
                      <img src={step.signatureDataUrl} alt="TTD" className="max-h-8 max-w-full object-contain" />
                    ) : (
                      <span className="text-[6.5pt] italic text-gray-400">
                        {step.status === 'approved' ? '[Signed]' : 'Pending'}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[6.5pt] underline truncate">{step.approverName}</div>
                    <div className="text-[5.5pt] text-gray-600 truncate">{step.approverTitle}</div>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  )
}

