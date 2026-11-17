'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, ShieldCheck, AlertTriangle, Loader2, User, FileText, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeroFormField, HeroInput, HeroTextarea, HeroConfirmDialog, HeroStatusBadge } from '@/components/templates'
import { SignaturePad } from '@/components/signature-pad'
import { verifyJsaAction, type JsaSettings } from '@/app/dashboard/hse/jsa/actions'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

interface JsaApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jsa: any
  defaultSigner?: Partial<JsaSettings>
  onSuccess?: () => void
}

export function JsaApprovalDialog({
  open,
  onOpenChange,
  jsa,
  defaultSigner,
  onSuccess,
}: JsaApprovalDialogProps) {
  const [verifierName, setVerifierName] = React.useState('')
  const [verifierTitle, setVerifierTitle] = React.useState('')
  const [verifierNotes, setVerifierNotes] = React.useState('')
  const [rejectionReason, setRejectionReason] = React.useState('')
  const [signatureUrl, setSignatureUrl] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = React.useState(false)

  // Load user profile name and title when dialog opens
  React.useEffect(() => {
    if (open) {
      getUserSignatureAction().then((res) => {
        if (res.success) {
          setVerifierName(res.employeeName || defaultSigner?.defaultSignerName || '')
          setVerifierTitle(
            res.departmentName
              ? `${res.departmentName} Specialist`
              : defaultSigner?.defaultSignerTitle || 'HSE Officer / Pengawas Site'
          )
        } else {
          setVerifierName(defaultSigner?.defaultSignerName || '')
          setVerifierTitle(defaultSigner?.defaultSignerTitle || 'HSE Officer / Pengawas Site')
        }
      }).catch(() => {
        setVerifierName(defaultSigner?.defaultSignerName || '')
        setVerifierTitle(defaultSigner?.defaultSignerTitle || 'HSE Officer / Pengawas Site')
      })
      setVerifierNotes('')
      setRejectionReason('')
    }
  }, [open, defaultSigner])

  if (!jsa) return null

  const signatures = (jsa.signatures || {}) as Record<string, any>
  const creatorName = signatures.creatorName || (jsa.teamMembers ? jsa.teamMembers.split(',')[0] : 'Pelaksana')
  const executorSignatureUrl = signatures.executorUrl ? resolveUploadUrl(signatures.executorUrl) : null

  const riskBadgeVariant =
    jsa.riskLevel === 'H' ? 'destructive' : jsa.riskLevel === 'M' ? 'default' : 'secondary'
  const riskLabel =
    jsa.riskLevel === 'H' ? 'Tinggi (H)' : jsa.riskLevel === 'M' ? 'Menengah (M)' : 'Rendah (L)'

  const handleApprove = async () => {
    if (!verifierName.trim()) {
      toast.error('Nama verifikator wajib diisi.')
      return
    }
    if (!signatureUrl) {
      toast.error('Tanda tangan online verifikator HSE wajib diberikan.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await verifyJsaAction({
        id: jsa.id,
        decision: 'approved',
        verifierName,
        verifierTitle,
        verifierSignatureUrl: signatureUrl,
        verifierNotes,
      })

      if (res.success) {
        toast.success(`JSA ${jsa.jsaNumber} berhasil diverifikasi & ditandatangani online!`)
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses verifikasi JSA')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Alasan penolakan / revisi wajib diisi.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await verifyJsaAction({
        id: jsa.id,
        decision: 'rejected',
        verifierName: verifierName || 'HSE Dept',
        verifierTitle,
        rejectionReason,
        verifierNotes,
      })

      if (res.success) {
        toast.success(`JSA ${jsa.jsaNumber} ditolak / diminta revisi.`)
        setRejectConfirmOpen(false)
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak JSA')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] lg:max-w-4xl h-[92vh] flex flex-col gap-0 p-0 overflow-hidden bg-white">
          <DialogHeader className="px-6 py-4 border-b bg-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Verifikasi & TTD Online JSA
                </DialogTitle>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {jsa.jsaNumber} • Pengesahan Departemen HSE / Pengawas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={riskBadgeVariant} className="text-xs px-2.5 py-0.5">
                Risiko: {riskLabel}
              </Badge>
              <HeroStatusBadge
                status={jsa.status || 'pending'}
                label={jsa.status === 'approved' ? 'Disetujui' : jsa.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'}
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {/* Ringkasan Dokumen JSA */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Detail Pekerjaan & Pembuat
                </h4>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(jsa.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Pekerjaan:</span>
                  <span className="font-semibold text-slate-900">{jsa.jobDescription}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">No. Unit / Alat:</span>
                  <span className="font-medium text-slate-800">{jsa.equipmentNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Pembuat / Pelaksana:</span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    {creatorName}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Anggota Tim JSA:</span>
                  <span className="font-medium text-slate-800">{jsa.teamMembers || '—'}</span>
                </div>
              </div>

              {/* TTD Pembuat / Pelaksana */}
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="text-xs text-slate-500">Tanda Tangan Pelaksana:</span>
                {executorSignatureUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={executorSignatureUrl}
                      alt="TTD Pelaksana"
                      className="h-9 max-w-[120px] object-contain border border-slate-200 rounded-md bg-white p-1"
                    />
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Sudah TTD
                    </Badge>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs">
                    Belum ada TTD pelaksana
                  </Badge>
                )}
              </div>
            </div>

            {/* Langkah Pekerjaan & Potensi Bahaya */}
            {jsa.steps && jsa.steps.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Rincian Langkah & Pengendalian Risiko ({jsa.steps.length} Langkah)
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2 w-8">No</th>
                        <th className="p-2">Urutan Pekerjaan</th>
                        <th className="p-2">Potensi Bahaya</th>
                        <th className="p-2">Tindakan Kontrol</th>
                        <th className="p-2 text-center w-14">Risiko</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jsa.steps.map((step: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="p-2 font-medium text-slate-600">{index + 1}</td>
                          <td className="p-2 font-medium text-slate-900">{step.workStep}</td>
                          <td className="p-2 text-slate-700">{step.hazard}</td>
                          <td className="p-2 text-slate-700">{step.control}</td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">
                              {step.residualRisk || 'L'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Form Verifikasi & TTD Online HSE */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-200 pb-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Form Pengesahan Departemen HSE / Pengawas Site
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HeroFormField label="Nama Verifikator HSE" required>
                  <HeroInput
                    placeholder="Nama lengkap verifikator"
                    value={verifierName}
                    onChange={(e) => setVerifierName(e.target.value)}
                  />
                </HeroFormField>

                <HeroFormField label="Jabatan / Role" required>
                  <HeroInput
                    placeholder="Contoh: HSE Officer / Site Safety Supervisor"
                    value={verifierTitle}
                    onChange={(e) => setVerifierTitle(e.target.value)}
                  />
                </HeroFormField>
              </div>

              {/* Tanda Tangan Online */}
              <div className="space-y-2">
                <HeroFormField label="Tanda Tangan Online Verifikator HSE" required info="Dapat menggunakan tanda tangan terdaftar di akun HERO Anda atau digores langsung.">
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <SignaturePad
                      label=""
                      onDataUrlChange={setSignatureUrl}
                      autoUseProfileSignature={true}
                      allowSaveToProfile={true}
                      height={150}
                    />
                  </div>
                </HeroFormField>
              </div>

              <HeroFormField label="Catatan Verifikasi HSE (Opsional)">
                <HeroTextarea
                  placeholder="Tambahkan catatan khusus, instruksi keselamatan tambahan, atau rekomendasi alat..."
                  rows={2}
                  value={verifierNotes}
                  onChange={(e) => setVerifierNotes(e.target.value)}
                />
              </HeroFormField>
            </div>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t bg-slate-50 flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-9"
              onClick={() => setRejectConfirmOpen(true)}
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Tolak / Minta Revisi
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 shadow-sm"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Setujui & TTD Dokumen JSA
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Tolak / Minta Revisi */}
      <HeroConfirmDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        title="Tolak / Minta Revisi Dokumen JSA"
        description="Berikan alasan mengapa dokumen JSA ini perlu ditolak atau direvisi oleh pelaksana."
        confirmLabel="Ya, Tolak JSA"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isSubmitting}
        onConfirm={handleReject}
      >
        <div className="mt-3 space-y-2">
          <HeroFormField label="Alasan Penolakan / Revisi" required>
            <HeroTextarea
              placeholder="Contoh: Pengendalian risiko langkah ke-2 belum memadai, mohon lengkapi PPE goggle..."
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>
    </>
  )
}
