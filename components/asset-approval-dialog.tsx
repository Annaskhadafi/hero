'use client'

import React, { useEffect, useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/signature-pad'
import { getUserSignatureAction, saveUserSignatureAction } from '@/app/actions/user-signature'
import { getAssetManagementItemDetailAction } from '@/app/dashboard/assets/approval-actions'
import { submitFinanceCheckCerAction } from '@/app/dashboard/assets/cer/actions'
import { CerDocumentView } from '@/components/assets/cer-document-view'
import { AssetBorrowDocumentView } from '@/components/assets/asset-borrow-document-view'
import { AssetTransferDocumentView } from '@/components/assets/asset-transfer-document-view'
import { AssetDisposalDocumentView } from '@/components/assets/asset-disposal-document-view'
import {
  Printer,
  PenLine,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Download,
  Save,
  Upload,
  Image as ImageIcon,
  Trash2,
  Tag,
  Barcode,
  Sparkles,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

export interface AssetApprovalDialogTarget {
  id?: string | number
  approvalId: number
  targetId: number
  subType: 'CER' | 'ASSET_BORROW' | 'ASSET_TRANSFER' | 'ASSET_DISPOSAL'
  documentNumber?: string
  title?: string
  employeeName?: string
  siteName?: string
  totalAmount?: number
  stepLabel?: string
  rawAssetItem?: any
}

export interface AssetApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: AssetApprovalDialogTarget | null
  onApprove: (data: { decisionNote: string; signatureUrl: string }) => Promise<void>
  onReject: (data: { rejectionReason: string }) => Promise<void>
  onRevert?: (data: { revertReason: string }) => Promise<void>
  allowRevert?: boolean
  isSubmitting?: boolean
}

export function AssetApprovalDialog({
  open,
  onOpenChange,
  item,
  onApprove,
  onReject,
  onRevert,
  allowRevert,
  isSubmitting = false,
}: AssetApprovalDialogProps) {
  const router = useRouter()
  const [note, setNote] = useState<string>('')
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [profileSig, setProfileSig] = useState<string | null>(null)
  const [sigMode, setSigMode] = useState<'profile' | 'draw' | 'upload'>('profile')
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null)
  const [isSavingProfileSig, setIsSavingProfileSig] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const [docData, setDocData] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const printDocRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Asset Tagging specific state (Syamsul Bahri & Evo Dwi Yulianti)
  const [kelompokAset, setKelompokAset] = useState<string>('')
  const [taggingItems, setTaggingItems] = useState<
    Array<{
      id: number
      itemDescription: string
      quantity: number
      estimatedPrice: number
      assetNumber: string
      allocation?: string
      holderName?: string
    }>
  >([])
  const [isSubmittingTagging, setIsSubmittingTagging] = useState(false)

  // Load user profile signature & full document details on open
  useEffect(() => {
    if (!open || !item) {
      setDocData(null)
      setNote('')
      setUploadedSigUrl(null)
      return
    }

    // 1. Fetch user profile signature
    getUserSignatureAction()
      .then((res) => {
        if (res && res.success && res.signatureDataUrl) {
          setProfileSig(res.signatureDataUrl)
          setSigMode('profile')
          setLiveSignatureUrl(res.signatureDataUrl)
        } else {
          setSigMode('draw')
          setLiveSignatureUrl(null)
        }
      })
      .catch(() => {
        setSigMode('draw')
      })

    // 2. Fetch rich document model for WYSIWYG preview
    setDocLoading(true)
    getAssetManagementItemDetailAction({
      subType: item.subType,
      targetId: item.targetId,
      approvalId: item.approvalId,
    })
      .then((res) => {
        if (res && res.success) {
          setDocData(res)
        } else {
          toast.error(res?.message || 'Gagal memuat pratinjau dokumen aset.')
        }
      })
      .catch((err) => {
        console.error('[AssetApprovalDialog] fetch error:', err)
        toast.error('Gagal mengambil data lengkap dokumen aset.')
      })
      .finally(() => {
        setDocLoading(false)
      })
  }, [open, item])

  // Sync items and dynamic categories when docData is loaded
  useEffect(() => {
    if (docData?.doc?.items) {
      setTaggingItems(
        docData.doc.items.map((it: any) => ({
          id: it.id,
          itemDescription: it.itemDescription,
          quantity: it.quantity,
          estimatedPrice: it.estimatedPrice,
          assetNumber: it.assetNumber || '',
          allocation: it.allocation,
          holderName: it.holderName,
        }))
      )

      const docKelompok = (docData.doc.kelompokAset || '').trim()
      setKelompokAset(docKelompok || '')
    }
  }, [docData])

  // Detect whether current review step is Asset Tagging
  const isAssetTaggingStep =
    item?.subType === 'CER' &&
    (item?.stepLabel?.toLowerCase().includes('tagging') ||
      item?.stepLabel?.toLowerCase().includes('nomor aset') ||
      item?.title?.toLowerCase().includes('tagging') ||
      docData?.doc?.approvals?.some(
        (a: any) =>
          a.level === docData?.currentLevel &&
          (a.title?.toLowerCase().includes('tagging') ||
            a.decisionNote?.toLowerCase().includes('tagging') ||
            (a.approverName || '').toLowerCase().includes('syamsul bahri'))
      ))

  // Live preview doc data for CerDocumentView
  const displayDoc = React.useMemo(() => {
    if (!docData?.doc) return null
    if (!isAssetTaggingStep) return docData.doc
    const activeKelompok = kelompokAset.trim()
    return {
      ...docData.doc,
      kelompokAset: activeKelompok || docData.doc.kelompokAset,
      items: docData.doc.items.map((it: any) => {
        const match = taggingItems.find((t) => t.id === it.id)
        return {
          ...it,
          kelompokAset: activeKelompok || it.kelompokAset || docData.doc.kelompokAset,
          assetNumber: match?.assetNumber || it.assetNumber,
        }
      }),
    }
  }, [docData, isAssetTaggingStep, kelompokAset, taggingItems])

  const handleItemAssetNumberChange = (itemId: number, value: string) => {
    setTaggingItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, assetNumber: value } : it))
    )
  }

  const handleSubmitAssetTagging = async () => {
    const finalKelompok = kelompokAset.trim()
    if (!finalKelompok) {
      toast.error('Kategori / Kelompok Aset wajib diisi.')
      return
    }

    if (!item) return
    const missingAssetNum = taggingItems.some((it) => !it.assetNumber || it.assetNumber.trim().length === 0)
    if (missingAssetNum) {
      toast.error('Nomor Aset untuk seluruh unit barang wajib diisi lengkap.')
      return
    }

    setIsSubmittingTagging(true)
    try {
      const res = await submitFinanceCheckCerAction({
        cerId: item.targetId,
        kelompokAset: finalKelompok,
        items: taggingItems.map((it) => ({
          id: Number(it.id),
          assetNumber: it.assetNumber.trim(),
        })),
        notes: note.trim() || undefined,
      })

      if (res.success) {
        toast.success(res.message || 'Kategori Aset & Nomor Aset berhasil disimpan.')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal menyimpan data Asset Tagging.')
      }
    } catch (err: any) {
      console.error('[AssetApprovalDialog] handleSubmitAssetTagging error:', err)
      toast.error(err?.message || 'Terjadi kesalahan sistem saat menyimpan Asset Tagging.')
    } finally {
      setIsSubmittingTagging(false)
    }
  }

  const isPortrait = item?.subType === 'ASSET_TRANSFER'

  const handlePrint = useReactToPrint({
    contentRef: printDocRef,
    documentTitle: docData?.summary?.documentNumber || item?.documentNumber || 'Dokumen Aset',
    pageStyle: `
      @page { 
        size: ${isPortrait ? 'A4 portrait' : 'A4 landscape'} !important; 
        margin: 0 !important; 
      }
      @page :left {
        size: ${isPortrait ? 'A4 portrait' : 'A4 landscape'} !important;
      }
      @page :right {
        size: ${isPortrait ? 'A4 portrait' : 'A4 landscape'} !important;
      }
      html, body { 
        margin: 0 !important; 
        padding: 0 !important;
        width: ${isPortrait ? '210mm' : '297mm'} !important;
        height: ${isPortrait ? '297mm' : '210mm'} !important;
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
          padding: ${isPortrait ? '6mm 8mm' : '8mm 12mm'} !important;
          width: ${isPortrait ? '210mm' : '297mm'} !important;
          height: ${isPortrait ? '297mm' : '210mm'} !important;
          max-width: ${isPortrait ? '210mm' : '297mm'} !important;
          max-height: ${isPortrait ? '297mm' : '210mm'} !important;
          box-shadow: none !important;
          border: none !important;
          overflow: hidden !important;
        }
      }
    `,
  })

  const handleSaveToProfile = async () => {
    if (!liveSignatureUrl) {
      toast.error('Belum ada tanda tangan (coretan atau gambar) yang dipilih.')
      return
    }
    setIsSavingProfileSig(true)
    try {
      const res = await saveUserSignatureAction(liveSignatureUrl)
      if (res.success) {
        setProfileSig(liveSignatureUrl)
        setSigMode('profile')
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa berkas gambar (PNG, JPG, atau WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setUploadedSigUrl(dataUrl)
      setLiveSignatureUrl(dataUrl)
      toast.success('Gambar tanda tangan berhasil dimuat.')
    }
    reader.readAsDataURL(file)
  }

  const handleApprove = () => {
    const finalSig = liveSignatureUrl || (sigMode === 'profile' && profileSig ? profileSig : null)
    if (!finalSig) {
      toast.error('Silakan bubuhkan tanda tangan (coretan, upload gambar, atau TTD profil) sebelum menyetujui.')
      return
    }

    startTransition(async () => {
      try {
        await onApprove({
          decisionNote: note.trim() || 'Disetujui',
          signatureUrl: finalSig,
        })
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menyetujui pengajuan aset.')
      }
    })
  }

  const handleRevert = () => {
    if (!note.trim()) {
      toast.error('Catatan alasan perbaikan / revisi wajib diisi.')
      return
    }

    if (!onRevert) {
      toast.error('Aksi revert tidak didukung pada form ini.')
      return
    }

    startTransition(async () => {
      try {
        await onRevert({ revertReason: note.trim() })
      } catch (err: any) {
        toast.error(err?.message || 'Gagal merevert pengajuan aset.')
      }
    })
  }

  const handleReject = () => {
    if (!note.trim()) {
      toast.error('Catatan alasan penolakan wajib diisi.')
      return
    }

    startTransition(async () => {
      try {
        await onReject({ rejectionReason: note.trim() })
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menolak pengajuan aset.')
      }
    })
  }

  if (!item) return null

  const shouldAllowRevert = allowRevert !== undefined ? allowRevert : item?.subType !== 'ASSET_TRANSFER'
  const isUsingProfileSig = sigMode === 'profile';
  const sigToUse = isUsingProfileSig && profileSig ? profileSig : liveSignatureUrl
  const busy = isSubmitting || isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[99vw] lg:max-w-[1550px] 2xl:max-w-[1680px] w-[99vw] h-[95vh] sm:h-[94vh] flex flex-col p-3 sm:p-5 gap-3 bg-slate-100 border border-slate-300 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Review Dokumen Pengajuan Aset — {docData?.summary?.title || item.title || item.documentNumber}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {docData?.summary?.requesterName || item.employeeName || 'Pemohon'} •{' '}
              {docData?.summary?.siteName || item.siteName || '-'} •{' '}
              {item.stepLabel || docData?.summary?.categoryLabel || 'Persetujuan'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {docData?.pdfUrl || item?.subType === 'ASSET_TRANSFER' ? (
              <a
                href={docData?.pdfUrl || `/api/assets/transfer/${item.targetId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-sky-300 bg-sky-50 font-semibold text-sky-800 hover:bg-sky-100 shadow-xs text-xs"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5 text-sky-600" />
                  {isPortrait ? 'PDF Portrait' : 'PDF Lanskap'}
                </Button>
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              disabled={docLoading || !docData}
              className="h-9 border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 text-xs"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Cetak
            </Button>
          </div>
        </DialogHeader>

        {/* 2-Column Split View: Left = WYSIWYG Document, Right = Review Actions */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_390px] gap-3.5 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Official Document WYSIWYG View */}
          <div className="overflow-y-auto overflow-x-auto p-1.5 min-h-[340px] lg:h-full rounded-xl flex justify-center items-start bg-slate-200/40">
            {docLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-xs font-semibold">Menyiapkan pratinjau dokumen A4 resmi...</span>
              </div>
            ) : docData?.doc ? (
              item.subType === 'CER' ? (
                <CerDocumentView
                  doc={displayDoc}
                  containerRef={printDocRef}
                  liveSignatureUrl={sigToUse}
                  currentLevel={docData.currentLevel}
                />
              ) : item.subType === 'ASSET_BORROW' ? (
                <AssetBorrowDocumentView
                  doc={docData.doc}
                  containerRef={printDocRef}
                  liveSignatureUrl={sigToUse}
                  currentLevel={docData.currentLevel}
                />
              ) : item.subType === 'ASSET_TRANSFER' ? (
                <AssetTransferDocumentView
                  doc={docData.doc}
                  containerRef={printDocRef}
                  liveSignatureUrl={sigToUse}
                  currentLevel={docData.currentLevel}
                />
              ) : item.subType === 'ASSET_DISPOSAL' ? (
                <AssetDisposalDocumentView
                  doc={docData.doc}
                  containerRef={printDocRef}
                  liveSignatureUrl={sigToUse}
                  currentLevel={docData.currentLevel}
                />
              ) : null
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs">
                Dokumen tidak tersedia atau gagal dimuat.
              </div>
            )}
          </div>

          {/* Right Column: Review Action Panel & Signature Canvas */}
          <div className="flex flex-col gap-3.5 overflow-y-auto pr-1 h-auto lg:h-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
            {/* Quick Summary Card */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Ringkasan Pengajuan
              </p>
              <div className="grid grid-cols-[90px_1fr] gap-1 text-slate-600">
                <span className="font-semibold text-slate-700">No. Form:</span>
                <span className="font-mono text-slate-900">{docData?.summary?.documentNumber || item.documentNumber || '-'}</span>
                <span className="font-semibold text-slate-700">Jenis Form:</span>
                <span className="text-slate-900">{docData?.summary?.categoryLabel || item.subType}</span>
                <span className="font-semibold text-slate-700">Site / Lokasi:</span>
                <span className="text-slate-900">{docData?.summary?.siteName || item.siteName || '-'}</span>
                <span className="font-semibold text-slate-700">Pemohon:</span>
                <span className="text-slate-900">{docData?.summary?.requesterName || item.employeeName || '-'}</span>
                {docData?.summary?.budgetCode ? (
                  <>
                    <span className="font-semibold text-slate-700">Pagu CapEx:</span>
                    <span className="text-slate-900 font-mono text-[11px]">
                      {docData.summary.budgetCode} {docData.summary.budgetName ? `(${docData.summary.budgetName})` : ''}
                    </span>
                  </>
                ) : null}
                {docData?.summary?.totalAmount > 0 && (
                  <>
                    <span className="font-semibold text-slate-700">Total Nilai:</span>
                    <span className="font-bold text-emerald-700">
                      Rp {Number(docData.summary.totalAmount).toLocaleString('id-ID')}
                    </span>
                  </>
                )}
              </div>

              {/* Director Step Notice */}
              {(item.stepLabel?.toLowerCase().includes('director') ||
                docData?.summary?.title?.toLowerCase().includes('director') ||
                docData?.currentLevel === 6) && (
                <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-200 p-2 text-[10.5px] text-indigo-900 font-medium flex items-center gap-1.5">
                  <PenLine className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Tahap Direktur: di-CC ke <strong>Freshya Ochtovita (Board Secretary)</strong> dengan hak persetujuan.
                  </span>
                </div>
              )}
            </div>

            {/* Catatan Terakhir Approval */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
              <p className="font-bold text-slate-700">Catatan Terakhir Approval</p>
              <p className="mt-1 text-slate-500">
                {docData?.summary?.lastNote || 'Belum ada catatan approval sebelumnya.'}
              </p>
            </div>

            {/* AREA KHUSUS ASSET TAGGING vs TANDA TANGAN DIGITAL BIASA */}
            {isAssetTaggingStep ? (
              <div className="space-y-3 rounded-xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-indigo-50/20 p-3.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Tahap Asset Tagging &amp; Penomoran
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Syamsul Bahri <span className="font-semibold text-indigo-700">cc Evo Dwi Yulianti</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-indigo-100/70 p-2.5 text-[11px] text-indigo-950 border border-indigo-200 leading-relaxed">
                  <p className="font-semibold flex items-center gap-1.5 text-indigo-900">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    Verifikasi Fisik &amp; Registrasi Nomor Aset
                  </p>
                </div>

                {/* Input Kategori / Kelompok Aset (Simple Direct Text Input) */}
                <div className="space-y-1.5">
                  <label htmlFor="tagging-kelompok-aset" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Kategori / Kelompok Aset <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    id="tagging-kelompok-aset"
                    type="text"
                    value={kelompokAset}
                    onChange={(e) => setKelompokAset(e.target.value)}
                    placeholder="Ketik kategori aset (contoh: Kelompok 1, Laptop Operasional, Kendaraan, Mesin...)"
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-2xs"
                  />
                </div>

                {/* Input Nomor Aset per Unit (Custom Input Manual, Auto-Generate removed) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Barcode className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Nomor Aset per Unit Barang <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {taggingItems.length} Unit
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {taggingItems.map((unit, idx) => (
                      <div
                        key={unit.id}
                        className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 truncate">
                            {idx + 1}. {unit.itemDescription}
                          </span>
                          <span className="text-slate-600 font-semibold shrink-0 ml-1">
                            {unit.quantity} Unit
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span>Site: {unit.allocation || docData?.summary?.siteName || '-'}</span>
                          <span>•</span>
                          <span>Holder: {unit.holderName || docData?.summary?.requesterName || '-'}</span>
                        </div>
                        <input
                          type="text"
                          value={unit.assetNumber}
                          onChange={(e) => handleItemAssetNumberChange(unit.id, e.target.value)}
                          placeholder="Ketik Nomor Aset resmi..."
                          className="w-full h-8 px-2.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Area Tanda Tangan Digital untuk approver biasa */
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <PenLine className="h-3.5 w-3.5 text-sky-600" />
                    <span>Tanda Tangan Digital Approver</span>
                  </div>
                </div>

                {/* Signature Mode Switcher Tabs */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs font-semibold">
                  {profileSig && (
                    <button
                      type="button"
                      onClick={() => {
                        setSigMode('profile')
                        setLiveSignatureUrl(profileSig)
                      }}
                      className={`flex-1 py-1 px-2 rounded-md transition-all text-center text-[11px] ${
                        sigMode === 'profile'
                          ? 'bg-white text-emerald-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      TTD Profil
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSigMode('draw')
                      if (sigMode === 'profile') setLiveSignatureUrl(null)
                    }}
                    className={`flex-1 py-1 px-2 rounded-md transition-all text-center text-[11px] ${
                      sigMode === 'draw'
                        ? 'bg-white text-sky-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Coretan Tangan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSigMode('upload')
                      if (uploadedSigUrl) {
                        setLiveSignatureUrl(uploadedSigUrl)
                      } else if (sigMode === 'profile') {
                        setLiveSignatureUrl(null)
                      }
                    }}
                    className={`flex-1 py-1 px-2 rounded-md transition-all text-center text-[11px] ${
                      sigMode === 'upload'
                        ? 'bg-white text-indigo-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Upload Gambar
                  </button>
                </div>

                {/* Hidden File Input for Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                {/* Mode 1: TTD Profil */}
                {sigMode === 'profile' && profileSig && (
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
                )}

                {/* Mode 2: Coretan Tangan Canvas */}
                {sigMode === 'draw' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Bubuhkan coretan tanda tangan pada area bawah ini.
                    </p>
                    <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                      <SignaturePad
                        onDataUrlChange={setLiveSignatureUrl}
                        onSaveToProfile={(url) => {
                          setProfileSig(url)
                          setSigMode('profile')
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Mode 3: Upload Gambar TTD / Stempel */}
                {sigMode === 'upload' && (
                  <div className="space-y-2">
                    {uploadedSigUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-lg border-2 border-indigo-200 bg-indigo-50/30 p-2 flex flex-col items-center justify-center min-h-[100px]">
                          <span className="absolute top-1.5 right-2 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-300">
                            <CheckCircle2 className="h-3 w-3" />
                            File Gambar Terpasang
                          </span>
                          <img
                            src={uploadedSigUrl}
                            alt="Gambar Tanda Tangan / Stempel"
                            className="max-h-20 object-contain my-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 h-7"
                          >
                            <Upload className="mr-1.5 h-3 w-3" />
                            Ganti Gambar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedSigUrl(null)
                              setLiveSignatureUrl(null)
                            }}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-7 px-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSaveToProfile}
                          disabled={isSavingProfileSig}
                          className="w-full text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-7"
                        >
                          {isSavingProfileSig ? (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="mr-1.5 h-3 w-3" />
                          )}
                          Simpan Gambar Ini ke Profil HERO Saya
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[110px] text-center"
                      >
                        <div className="p-2 bg-indigo-50 rounded-full text-indigo-600 mb-2">
                          <Upload className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Klik untuk Unggah Gambar Tanda Tangan / Stempel
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Format PNG, JPG, JPEG, atau WebP (Maks. 5 MB)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Catatan Keputusan Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {isAssetTaggingStep ? 'Catatan Tagging (Opsional)' : 'Catatan Approval'}
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                disabled={busy || isSubmittingTagging}
                placeholder={
                  isAssetTaggingStep
                    ? 'Tambahkan catatan verifikasi tagging jika diperlukan...'
                    : shouldAllowRevert
                    ? 'Tambahkan catatan jika diperlukan (wajib diisi untuk Revert / Reject)...'
                    : 'Tambahkan catatan persetujuan atau alasan penolakan (wajib untuk Reject)...'
                }
                className="resize-none text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2 mt-auto border-t border-slate-200">
              {isAssetTaggingStep ? (
                <Button
                  type="button"
                  onClick={handleSubmitAssetTagging}
                  disabled={busy || isSubmittingTagging}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-9 shadow-xs"
                  size="sm"
                >
                  {isSubmittingTagging ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  )}
                  Simpan Nomor Aset &amp; Selesaikan
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy || !sigToUse}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-9"
                  size="sm"
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  )}
                  Setujui Pengajuan
                </Button>
              )}
              {shouldAllowRevert ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={handleRevert}
                    disabled={busy || isSubmittingTagging}
                    variant="outline"
                    size="sm"
                    className="h-9 border-amber-400 text-amber-800 hover:bg-amber-50 font-semibold"
                  >
                    <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-600" />
                    REVERT
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReject}
                    disabled={busy || isSubmittingTagging}
                    variant="secondary"
                    size="sm"
                    className="h-9 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600" />
                    REJECT
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleReject}
                  disabled={busy || isSubmittingTagging}
                  variant="secondary"
                  size="sm"
                  className="w-full h-9 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200"
                >
                  <XCircle className="mr-1.5 h-4 w-4 text-rose-600" />
                  Tolak Pengajuan (Reject)
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
