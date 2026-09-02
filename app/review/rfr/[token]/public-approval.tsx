'use client'

import { useRef, useState, useTransition } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { approveRfrStep, rejectRfrStep } from '@/app/actions/rfr'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, FileCheck, Download, Printer } from 'lucide-react'
import { RfrDocumentPreview } from '@/components/rfr-document-preview'

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
            <div className="text-xs text-blue-300 mt-1">
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WITA — {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <Badge className="bg-white text-blue-900 font-bold px-3 py-1 text-xs">
            Langkah {approval.stepOrder} / {approvals.length}
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

        {/* Main Content: Left Document Preview, Right Action Panel on Desktop */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px] gap-6 items-start">
          {/* Left: Full Document View (WYSIWYG A4 Layout) */}
          <div className="w-full order-2 lg:order-1 bg-white dark:bg-slate-800 rounded-xl shadow-md border overflow-hidden p-2">
            <RfrDocumentPreview
              rfr={rfr}
              approvals={approvals}
              currentStepOrder={approval.stepOrder}
              liveSignatureUrl={liveSignatureUrl}
            />
          </div>

          {/* Right: Action Panel for Digital Signature & Remarks */}
          <div className="w-full order-1 lg:order-2 space-y-4 lg:sticky lg:top-8">
            {!done && !rejected ? (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2 text-base">
                  Bubuhkan Tanda Tangan Digital
                </h3>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Canvas Tanda Tangan Digital
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
                    rows={3}
                    placeholder="Catatan tambahan persetujuan..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="button" disabled={isPending} onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 w-full gap-2 rounded-xl shadow-xs cursor-pointer">
                    <CheckCircle2 className="w-4 h-4" /> {isPending ? 'Memproses...' : 'Setujui & Tanda Tangan'}
                  </Button>
                  <Button variant="outline" type="button" disabled={isPending} onClick={handleReject} className="text-rose-600 border-rose-200 hover:bg-rose-50 h-9 w-full rounded-xl cursor-pointer">
                    Tolak RFR
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

