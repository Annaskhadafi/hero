'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/signature-pad'
import {
  FormWoDocumentPreviewDialog,
  FormWoDocumentView,
} from '@/components/form-wo-document-preview-dialog'
import { ApprovalRequestDetails } from '@/components/approval-request-details'
import { reviewApprovalAction } from '@/app/dashboard/admin-actions'
import { getUserSignatureAction, saveUserSignatureAction } from '@/app/actions/user-signature'
import {
  FileText,
  PenLine,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]['items'][number]

type ApprovalGroup = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]

interface ApprovalReviewDrawerFormProps {
  item: ApprovalInboxItem
  group: ApprovalGroup
}

/**
 * Komponen pembungkus dokumen Form WO yang secara otomatis mengecilkan (scale down)
 * ukuran dokumen A4 landscape (~1122px) agar pas 100% di layar mobile tanpa terpotong.
 */
function ScaledFormWoDocument({
  doc,
  liveSignatureUrl,
  currentLevel,
  onOpenFullscreen,
}: {
  doc: any
  liveSignatureUrl?: string | null
  currentLevel?: number
  onOpenFullscreen: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.32)
  const baseDocWidth = 1122 // Lebar 297mm dalam pixel standar
  const baseDocHeight = 780 // Tinggi ~210mm dalam pixel standar

  useEffect(() => {
    if (!containerRef.current) return
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        if (width > 0) {
          const calculatedScale = width / baseDocWidth
          setScale(calculatedScale)
        }
      }
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-sky-600" />
          <span>Lembar Kerja Form WO</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenFullscreen}
          className="h-7 px-2 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-100 flex items-center gap-1"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Perbesar</span>
        </Button>
      </div>

      {/* Frame Dokumen yang diperkecil (Mobile Friendly) */}
      <div
        ref={containerRef}
        onClick={onOpenFullscreen}
        className="w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-inner cursor-pointer relative group"
        title="Klik untuk melihat lembar dokumen ukuran penuh"
      >
        <div
          style={{
            height: `${Math.round(baseDocHeight * scale)}px`,
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${baseDocWidth}px`,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            className="pointer-events-none select-none"
          >
            <FormWoDocumentView
              doc={doc}
              liveSignatureUrl={liveSignatureUrl}
              currentLevel={currentLevel}
            />
          </div>
        </div>

        {/* Hover hint */}
        <div className="absolute inset-0 bg-sky-900/0 hover:bg-sky-900/10 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
            Klik untuk Memperbesar
          </span>
        </div>
      </div>
    </div>
  )
}

export function ApprovalReviewDrawerForm({ item, group }: ApprovalReviewDrawerFormProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [profileSig, setProfileSig] = useState<string | null>(null)
  const [isUsingProfileSig, setIsUsingProfileSig] = useState(false)
  const [isSavingProfileSig, setIsSavingProfileSig] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSignPadOpen, setIsSignPadOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getUserSignatureAction()
      .then((res) => {
        if (res.success && res.signatureDataUrl) {
          setProfileSig(res.signatureDataUrl)
          setIsUsingProfileSig(true)
          setLiveSignatureUrl(res.signatureDataUrl)
        }
      })
      .catch(() => {})
  }, [])

  const isFormWo = Boolean(
    item.repairFormWo ||
      item.activityType === 'Work Order' ||
      item.activityType === 'Form WO' ||
      item.activityType === 'Repair / Retread' ||
      item.activityType === 'Service WO' ||
      item.requestKindLabel?.toLowerCase().includes('work order') ||
      item.requestKindLabel?.toLowerCase().includes('wo') ||
      item.requestKindLabel?.toLowerCase().includes('repair') ||
      item.requestKindLabel?.toLowerCase().includes('retread') ||
      item.title?.toLowerCase().includes('wo') ||
      item.title?.toLowerCase().includes('frmwo')
  )

  const wo = item.repairFormWo

  const resolvedWoDoc = useMemo(() => {
    if (!wo) return null
    return {
      ...wo,
      id: wo.id,
      noPengajuan: wo.noPengajuan || (item as any).documentNumber || item.requestNumber || item.title,
      jenisPengajuan: wo.jenisPengajuan || (item.title?.toLowerCase().includes('service') ? 'service' : 'repair'),
      hari: wo.hari || '-',
      tanggal: wo.tanggal || null,
      tanggalPengajuan: wo.tanggalPengajuan || (item as any).submittedAt || item.startTime,
      pemohon: wo.pemohon || (item as any).employeeName || item.requesterName || (group as any)?.requesterName || '-',
      pemohonJobTitle: wo.pemohonJobTitle || (item as any).requesterJobTitle || (group as any)?.requesterJobTitle || 'Pemohon',
      customer: wo.customer || (item as any).customerName || item.requestKindLabel || '-',
      site: wo.site || (item as any).siteName || (group as any)?.siteName || item.siteName || '-',
      deskripsiPekerjaan: wo.deskripsiPekerjaan || 'Labour Service',
      catatanPengajuan: wo.catatanPengajuan || null,
      totalAmount: wo.totalAmount || (item as any).totalAmount || '0',
      items: wo.items || null,
      noPo: wo.noPo || null,
      tanggalPo: wo.tanggalPo || null,
      tireSn: wo.tireSn || null,
      storeLoc: wo.storeLoc || null,
      brand: wo.brand || null,
      pattern: wo.pattern || null,
      size: wo.size || null,
      jobType: wo.jobType || null,
      noWoTerbit: wo.noWoTerbit || null,
      statusPengajuan: wo.statusPengajuan || item.status || 'pending',
      submitterSignatureUrl: wo.submitterSignatureUrl || (item as any).signatureUrl || null,
      steps: wo.steps || (item as any).rawFormWo?.steps || item.steps?.map((s) => ({
        level: s.level,
        approverName: s.approverName,
        jobTitle: s.label,
        status: s.status,
        decision: s.status,
        reviewedAt: s.reviewedAt,
        signatureUrl: (s as any).signatureUrl || null,
        decisionNote: (s as any).decisionNote || null,
      })) || [],
    }
  }, [wo, item, group])

  const [pendingDecision, setPendingDecision] = useState<'approved' | 'needs_correction' | 'rejected' | null>(null)

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
    const sigToUse = isUsingProfileSig && profileSig ? profileSig : liveSignatureUrl

    if (decision === 'approved' && !signatureFile && !sigToUse) {
      toast.error('Mohon bubuhkan tanda tangan digital sebelum menyetujui.')
      setIsSignPadOpen(true)
      return
    }

    if (decision !== 'approved' && note.trim().length < 3) {
      toast.error('Catatan persetujuan wajib diisi minimal 3 karakter untuk meminta revisi atau menolak.')
      return
    }

    setPendingDecision(decision)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('approvalId', String(item.approvalId))
        formData.append('decision', decision)
        formData.append('note', note.trim())

        if (decision === 'approved') {
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
          }
        }

        await reviewApprovalAction(formData)
        toast.success(
          decision === 'approved'
            ? 'Dokumen pengajuan berhasil disetujui.'
            : decision === 'needs_correction'
              ? 'Permintaan revisi berhasil dikirimkan.'
              : 'Dokumen pengajuan telah ditolak.'
        )
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses keputusan persetujuan.')
      } finally {
        setPendingDecision(null)
      }
    })
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-3.5 sm:p-4 shadow-sm border border-slate-200">
      {/* 1. BAGIAN ATAS: LEMBAR DOKUMEN RESMI LANGSUNG DITAMPILKAN SECARA MOBILE FRIENDLY */}
      {isFormWo && resolvedWoDoc ? (
        <ScaledFormWoDocument
          doc={resolvedWoDoc}
          liveSignatureUrl={liveSignatureUrl}
          currentLevel={item.level}
          onOpenFullscreen={() => setIsPreviewOpen(true)}
        />
      ) : (
        <ApprovalRequestDetails item={item} />
      )}

      {/* 2. BAGIAN TENGAH: BUTTON BUAT ISI TANDA TANGAN */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <PenLine className="h-4 w-4 text-sky-600 shrink-0" />
            <span>Tanda Tangan Digital Pemeriksa</span>
          </div>

          <div className="flex items-center gap-1.5">
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
                    setIsSignPadOpen(true)
                  } else {
                    setIsUsingProfileSig(true)
                    setLiveSignatureUrl(profileSig)
                    setIsSignPadOpen(false)
                  }
                }}
                className="h-7 text-[11px] font-semibold text-sky-700 hover:text-sky-800 hover:bg-sky-100 px-2"
              >
                {isUsingProfileSig ? 'Gambar Manual' : 'Gunakan TTD Profil'}
              </Button>
            )}

            <Button
              type="button"
              variant={liveSignatureUrl ? 'outline' : 'default'}
              size="sm"
              onClick={() => {
                if (isUsingProfileSig) {
                  setIsUsingProfileSig(false)
                  setLiveSignatureUrl(null)
                  setSignatureFile(null)
                  setIsSignPadOpen(true)
                } else {
                  setIsSignPadOpen(!isSignPadOpen)
                }
              }}
              className={`w-full sm:w-auto h-7 rounded-lg px-2.5 text-xs font-bold transition-all justify-center ${
                liveSignatureUrl
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {liveSignatureUrl ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{isUsingProfileSig ? 'Ubah TTD' : 'Ganti TTD'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <PenLine className="h-3.5 w-3.5" />
                  <span>Tanda Tangani</span>
                </span>
              )}
              {isSignPadOpen ? (
                <ChevronUp className="ml-1 h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mode Tanda Tangan Profil Aktif */}
        {isUsingProfileSig && profileSig && !isSignPadOpen && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2 shadow-2xs">
            <div className="h-10 w-24 bg-white rounded border border-emerald-200 flex items-center justify-center p-1 shrink-0">
              <img
                src={profileSig}
                alt="Tanda Tangan Profil"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="text-xs min-w-0">
              <p className="font-bold text-emerald-800 truncate flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                TTD Profil HERO Aktif
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                Tanda tangan akun Anda otomatis tertera di dokumen saat disetujui.
              </p>
            </div>
          </div>
        )}

        {/* Preview Tanda Tangan Manual yang sudah digambar */}
        {!isUsingProfileSig && liveSignatureUrl && !isSignPadOpen && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-white p-2 shadow-2xs">
            <div className="h-10 w-24 bg-slate-50 rounded border border-slate-200 flex items-center justify-center p-1 shrink-0">
              <img
                src={liveSignatureUrl}
                alt="Tanda Tangan Digital"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="text-xs min-w-0 flex-1">
              <p className="font-bold text-emerald-800 truncate flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Tanda tangan manual siap
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                Otomatis tertera di dokumen saat disetujui.
              </p>
            </div>
          </div>
        )}

        {/* Canvas Signature Pad */}
        {isSignPadOpen && (
          <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
            <p className="text-[11px] text-slate-500">
              Goreskan tanda tangan Anda dengan jari atau stylus di bawah ini:
            </p>
            <div className="bg-white rounded-xl overflow-hidden border-2 border-dashed border-sky-300 shadow-inner">
              <SignaturePad
                onSignatureChange={(file) => setSignatureFile(file)}
                onDataUrlChange={(url) => {
                  setLiveSignatureUrl(url)
                  setIsUsingProfileSig(false)
                }}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              {liveSignatureUrl && !isUsingProfileSig ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveToProfile}
                  disabled={isSavingProfileSig}
                  className="h-7 text-xs rounded-md font-semibold border-sky-200 text-sky-700 hover:bg-sky-50"
                >
                  {isSavingProfileSig ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3 w-3" />
                  )}
                  Simpan ke Profil
                </Button>
              ) : <div />}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsSignPadOpen(false)}
                className="h-7 text-xs rounded-md font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-300"
              >
                Selesai & Simpan
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. BAGIAN BAWAH: TEMPAT CATATAN */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Catatan Persetujuan</span>
          <span className="text-[10px] font-normal text-slate-400">
            (Wajib jika revisi/tolak)
          </span>
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          disabled={isPending}
          placeholder="Tuliskan instruksi atau alasan revisi/penolakan..."
          className="resize-none text-xs rounded-xl bg-slate-50/60 border-slate-200 focus:bg-white transition-colors w-full"
        />
      </div>

      {/* 4. BAGIAN PALING BAWAH: 3 BUTTON ACTIONS (SETUJUI, REVISI, TOLAK) */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* APPROVE */}
        <Button
          type="button"
          onClick={() => handleDecision('approved')}
          disabled={isPending}
          className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-60"
        >
          {pendingDecision === 'approved' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          )}
          <span>{pendingDecision === 'approved' ? 'Menyimpan...' : 'Setujui'}</span>
        </Button>

        {/* REVERT */}
        <Button
          type="button"
          onClick={() => handleDecision('needs_correction')}
          disabled={isPending}
          variant="outline"
          className="h-10 rounded-xl border-amber-400 bg-amber-50/60 text-amber-800 hover:bg-amber-100 font-bold text-xs active:scale-95 transition-all disabled:opacity-60"
        >
          {pendingDecision === 'needs_correction' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-amber-600" />
          ) : (
            <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-600" />
          )}
          <span>{pendingDecision === 'needs_correction' ? 'Mengirim...' : 'Revisi'}</span>
        </Button>

        {/* REJECT */}
        <Button
          type="button"
          onClick={() => handleDecision('rejected')}
          disabled={isPending}
          variant="secondary"
          className="h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs active:scale-95 transition-all disabled:opacity-60"
        >
          {pendingDecision === 'rejected' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-rose-600" />
          ) : (
            <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600" />
          )}
          <span>{pendingDecision === 'rejected' ? 'Menolak...' : 'Tolak'}</span>
        </Button>
      </div>

      {/* Dialog Preview Dokumen Resmi Form WO (A4 Landscape) jika user klik Perbesar */}
      <FormWoDocumentPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        doc={resolvedWoDoc ?? null}
        liveSignatureUrl={liveSignatureUrl}
        currentLevel={item.level}
      />
    </div>
  )
}
