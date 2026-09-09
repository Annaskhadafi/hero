'use client'

import React, { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/signature-pad'
import { FormWoDocumentView } from '@/components/form-wo-document-preview-dialog'
import { reviewApprovalAction } from '@/app/dashboard/admin-actions'
import { getUserSignatureAction, saveUserSignatureAction } from '@/app/actions/user-signature'
import { Printer, PenLine, CheckCircle2, AlertCircle, XCircle, Loader2, Download, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]['items'][number]

type ApprovalGroup = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]

interface FormWoApprovalDialogProps {
  item: ApprovalInboxItem
  group: ApprovalGroup
}

export function FormWoApprovalDialog({ item, group }: FormWoApprovalDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [profileSig, setProfileSig] = useState<string | null>(null)
  const [isUsingProfileSig, setIsUsingProfileSig] = useState(true)
  const [isSavingProfileSig, setIsSavingProfileSig] = useState(false)
  const [isPending, startTransition] = useTransition()
  const printDocRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      getUserSignatureAction()
        .then((res) => {
          if (res.success && res.signatureDataUrl) {
            setProfileSig(res.signatureDataUrl)
            setIsUsingProfileSig(true)
            setLiveSignatureUrl(res.signatureDataUrl)
          } else {
            setIsUsingProfileSig(false)
          }
        })
        .catch(() => {})
    }
  }, [open])

  const rawWo =
    item.repairFormWo ||
    (item as any).rawFormWo ||
    (item as any).rawGeneralGroup?.items?.find((i: any) => i.repairFormWo)?.repairFormWo ||
    (group as any)?.items?.find((i: any) => i.repairFormWo)?.repairFormWo ||
    null

  const resolvedApprovalId =
    item.approvalId ||
    (item as any).rawGeneralGroup?.items?.find((i: any) => i.repairFormWo)?.approvalId ||
    (item as any).rawGeneralGroup?.items?.[0]?.approvalId ||
    (group as any)?.items?.find((i: any) => i.repairFormWo)?.approvalId ||
    (group as any)?.items?.[0]?.approvalId

  const doc = {
    ...(rawWo || {}),
    id: rawWo?.id,
    noPengajuan: rawWo?.noPengajuan || (item as any).documentNumber || item.requestNumber || item.title,
    jenisPengajuan: rawWo?.jenisPengajuan || (item.title?.toLowerCase().includes('service') ? 'service' : 'repair'),
    hari: rawWo?.hari || '-',
    tanggal: rawWo?.tanggal || null,
    tanggalPengajuan: rawWo?.tanggalPengajuan || (item as any).submittedAt || item.startTime,
    pemohon: rawWo?.pemohon || (item as any).employeeName || item.requesterName || (group as any)?.requesterName || '-',
    pemohonJobTitle: rawWo?.pemohonJobTitle || (item as any).requesterJobTitle || (group as any)?.requesterJobTitle || 'Pemohon',
    customer: rawWo?.customer || (item as any).customerName || item.requestKindLabel || '-',
    site: rawWo?.site || (item as any).siteName || (group as any)?.siteName || item.siteName || '-',
    deskripsiPekerjaan: rawWo?.deskripsiPekerjaan || 'Labour Service',
    catatanPengajuan: rawWo?.catatanPengajuan || null,
    totalAmount: rawWo?.totalAmount || (item as any).totalAmount || '0',
    items: rawWo?.items || null,
    noPo: rawWo?.noPo || null,
    tanggalPo: rawWo?.tanggalPo || null,
    submitterSignatureUrl: rawWo?.submitterSignatureUrl || (item as any).signatureUrl || null,
    steps: rawWo?.steps || (item as any).rawFormWo?.steps || item.steps?.map((s) => ({
      level: s.level,
      approverName: s.approverName,
      jobTitle: s.label,
      status: s.status,
      decision: s.status,
      reviewedAt: s.reviewedAt,
      signatureUrl: (s as any).signatureUrl || null,
    })) || [],
  }

  const pendingStep = doc.steps?.find((s: any) => s.status === 'pending')
  const resolvedCurrentLevel =
    item.level ||
    (item as any).rawGeneralGroup?.items?.find((i: any) => i.repairFormWo)?.level ||
    (item as any).rawGeneralGroup?.items?.[0]?.level ||
    pendingStep?.level ||
    1

  const handleSaveToProfile = async () => {
    if (!liveSignatureUrl) {
      toast.error('Belum ada tanda tangan yang digambar.')
      return
    }
    setIsSavingProfileSig(true)
    try {
      const res = await saveUserSignatureAction(liveSignatureUrl)
      if (res.success) {
        setProfileSig(liveSignatureUrl)
        setIsUsingProfileSig(true)
        toast.success('Tanda tangan berhasil disimpan ke profil HERO.')
      } else {
        toast.error(res.error || 'Gagal menyimpan tanda tangan ke profil.')
      }
    } catch {
      toast.error('Gagal menyimpan tanda tangan ke profil.')
    } finally {
      setIsSavingProfileSig(false)
    }
  }

  const handleDecision = (decision: 'approved' | 'needs_correction' | 'rejected') => {
    startTransition(async () => {
      try {
        if (!resolvedApprovalId) {
          throw new Error('ID Approval tidak valid atau tidak ditemukan.')
        }
        const formData = new FormData()
        formData.append('approvalId', String(resolvedApprovalId))
        formData.append('decision', decision)
        formData.append('note', note.trim())

        if (decision === 'approved') {
          const sigToUse = isUsingProfileSig && profileSig ? profileSig : liveSignatureUrl
          if (sigToUse) {
            formData.append('signatureDataUrl', sigToUse)
            try {
              const res = await fetch(sigToUse)
              const blob = await res.blob()
              formData.append('signatureFile', blob, 'approver_signature.png')
            } catch {
              if (signatureFile) {
                formData.append('signatureFile', signatureFile)
              }
            }
          } else if (signatureFile) {
            formData.append('signatureFile', signatureFile)
          } else {
            toast.error('Silakan bubuhkan atau pilih tanda tangan sebelum menyetujui.')
            return
          }
        }

        await reviewApprovalAction(formData)
        toast.success(
          decision === 'approved'
            ? 'Pengajuan Work Order berhasil disetujui.'
            : decision === 'needs_correction'
              ? 'Pengajuan Work Order berhasil di-Revert.'
              : 'Pengajuan Work Order telah di-Reject.'
        )
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses approval.')
      }
    })
  }

  const handlePrint = useReactToPrint({
    contentRef: printDocRef,
    documentTitle: doc?.noPengajuan || 'Form WO',
    pageStyle: `
      @page { 
        size: A4 landscape !important; 
        margin: 0 !important; 
      }
      @page :left {
        size: A4 landscape !important;
      }
      @page :right {
        size: A4 landscape !important;
      }
      html, body { 
        margin: 0 !important; 
        padding: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
      @media print {
        body * {
          visibility: hidden;
        }
        .print-area, .print-area * {
          visibility: visible;
        }
        .print-area {
          position: fixed !important;
          inset: 0 !important;
          margin: 0 !important;
          padding: 8mm 12mm 8mm 12mm !important;
          width: 297mm !important;
          height: 210mm !important;
          max-width: 297mm !important;
          max-height: 210mm !important;
          box-shadow: none !important;
          border: none !important;
          overflow: hidden !important;
        }
      }
    `
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="dense">
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[99vw] lg:max-w-[1550px] 2xl:max-w-[1680px] w-[99vw] h-[95vh] sm:h-[94vh] flex flex-col p-3 sm:p-5 gap-3 bg-slate-100 border border-slate-300 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Review Dokumen Form Work Order — {item.title}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {group.requesterName} • {group.siteName} • {item.currentStepLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {doc?.id ? (
              <a
                href={`/api/form-wo/${doc.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-sky-300 bg-sky-50 font-semibold text-sky-800 hover:bg-sky-100 shadow-xs text-xs"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5 text-sky-600" />
                  PDF Lanskap
                </Button>
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 text-xs"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Cetak
            </Button>
          </div>
        </DialogHeader>

        {/* 2-Column Split View: Left = Document WYSIWYG Preview, Right = Review Action Form */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_390px] gap-3.5 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Official Document WYSIWYG View */}
          <div className="overflow-y-auto overflow-x-auto p-1.5 min-h-[340px] lg:h-full rounded-xl flex justify-center items-start bg-slate-200/40">
            <FormWoDocumentView
              doc={doc}
              containerRef={printDocRef}
              liveSignatureUrl={liveSignatureUrl}
              currentLevel={resolvedCurrentLevel}
            />
          </div>

          {/* Right Column: Review Action Panel & Signature Canvas */}
          <div className="flex flex-col gap-3.5 overflow-y-auto pr-1 h-auto lg:h-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
            {/* Quick Summary Card */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Ringkasan Pengajuan
              </p>
              <div className="grid grid-cols-[80px_1fr] gap-1 text-slate-600">
                <span className="font-semibold text-slate-700">No. WO:</span>
                <span className="font-mono text-slate-900">{doc.noPengajuan || '-'}</span>
                <span className="font-semibold text-slate-700">Customer:</span>
                <span className="text-slate-900">{doc.customer || '-'}</span>
                <span className="font-semibold text-slate-700">Site:</span>
                <span className="text-slate-900">{doc.site || item.siteName || '-'}</span>
                <span className="font-semibold text-slate-700">Pemohon:</span>
                <span className="text-slate-900">{doc.pemohon || item.requesterName || '-'}</span>
                <span className="font-semibold text-slate-700">Total:</span>
                <span className="font-bold text-emerald-700">
                  {doc.totalAmount
                    ? `Rp ${Number(doc.totalAmount).toLocaleString('id-ID')}`
                    : '-'}
                </span>
              </div>
            </div>

            {/* Catatan Terakhir */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
              <p className="font-bold text-slate-700">Catatan Terakhir Approval</p>
              <p className="mt-1 text-slate-500">
                {item.lastNote ? item.lastNote.message : 'Belum ada catatan approval sebelumnya.'}
              </p>
            </div>

            {/* Area Tanda Tangan Digital */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <PenLine className="h-3.5 w-3.5 text-sky-600" />
                  <span>Tanda Tangan Digital Approver</span>
                </div>
                {profileSig && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isUsingProfileSig) {
                        setIsUsingProfileSig(false)
                        setLiveSignatureUrl(null)
                        setSignatureFile(null)
                      } else {
                        setIsUsingProfileSig(true)
                        setLiveSignatureUrl(profileSig)
                      }
                    }}
                    className="h-6 text-[10px] font-semibold text-sky-700 hover:text-sky-800 hover:bg-sky-50 px-2"
                  >
                    {isUsingProfileSig ? 'Ubah / Gambar Manual' : 'Gunakan TTD Profil'}
                  </Button>
                )}
              </div>

              {isUsingProfileSig && profileSig ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg border-2 border-emerald-200 bg-emerald-50/30 p-2 flex flex-col items-center justify-center min-h-[100px]">
                    <span className="absolute top-1.5 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      TTD Profil HERO Aktif
                    </span>
                    <img
                      src={profileSig}
                      alt="Tanda Tangan Profil"
                      className="max-h-20 object-contain my-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">
                    Tanda tangan dari profil akun Anda akan otomatis dibubuhkan pada dokumen.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Bubuhkan tanda tangan pada area bawah ini sebelum menyetujui.
                  </p>
                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                    <SignaturePad
                      onSignatureChange={setSignatureFile}
                      onDataUrlChange={setLiveSignatureUrl}
                    />
                  </div>
                  {liveSignatureUrl && !isUsingProfileSig && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveToProfile}
                      disabled={isSavingProfileSig}
                      className="w-full text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50 h-7"
                    >
                      {isSavingProfileSig ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 h-3 w-3" />
                      )}
                      Simpan TTD Ini ke Profil HERO Saya
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Catatan Keputusan Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Catatan Approval</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                disabled={isPending}
                placeholder="Tambahkan catatan jika diperlukan..."
                className="resize-none text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2 mt-auto border-t border-slate-200">
              <Button
                type="button"
                onClick={() => handleDecision('approved')}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full"
                size="sm"
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                )}
                Setujui Pengajuan
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => handleDecision('needs_correction')}
                  disabled={isPending}
                  variant="outline"
                  size="sm"
                  className="border-amber-400 text-amber-800 hover:bg-amber-50 font-semibold"
                >
                  <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-600" />
                  REVERT
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDecision('rejected')}
                  disabled={isPending}
                  variant="secondary"
                  size="sm"
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200"
                >
                  <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600" />
                  REJECT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
