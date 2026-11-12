'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Camera,
  UploadCloud,
  Loader2,
  CheckCircle,
  PackageCheck,
  PenLine,
  CheckCircle2,
  Printer,
  Download,
  Save,
  FileCheck2,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import { getUserSignatureAction, saveUserSignatureAction } from '@/app/actions/user-signature'
import { SignaturePad } from '@/components/signature-pad'
import { CerBastDocumentView, type CerBastDocumentData } from '@/components/assets/cer-bast-document-view'
import { confirmAssetReceivedAction } from '../actions'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

export interface CerReceiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cer: any | null
  onSuccess?: () => void
}

export function CerReceiveDialog({
  open,
  onOpenChange,
  cer,
  onSuccess,
}: CerReceiveDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [receiverNotes, setReceiverNotes] = useState<string>(
    'Barang diterima lengkap, segel utuh, dan berfungsi normal sesuai spesifikasi.'
  )
  const [goodsPhotoUrl, setGoodsPhotoUrl] = useState<string>('')
  const [deliveryNoteUrl, setDeliveryNoteUrl] = useState<string>('')
  
  // Signature management (matches Work Order approval dialog)
  const [profileSig, setProfileSig] = useState<string | null>(null)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [isUsingProfileSig, setIsUsingProfileSig] = useState<boolean>(true)
  const [isSavingProfileSig, setIsSavingProfileSig] = useState<boolean>(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false)
  const [isUploadingSuratJalan, setIsUploadingSuratJalan] = useState<boolean>(false)
  
  const printDocRef = useRef<HTMLDivElement>(null)

  // Auto-load signature from employee profile
  useEffect(() => {
    if (open) {
      getUserSignatureAction()
        .then((res) => {
          if (res && res.success && res.signatureDataUrl) {
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

  // Hook print BAST landscape (called unconditionally to satisfy React Rules of Hooks)
  const handlePrint = useReactToPrint({
    contentRef: printDocRef,
    documentTitle: `BAST_${cer?.cerNumber ? cer.cerNumber.replace(/[\/\\]/g, '_') : 'CER'}`,
    pageStyle: `
      @page { 
        size: A4 landscape !important; 
        margin: 0 !important; 
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
          padding: 8mm 12mm !important;
          width: 297mm !important;
          height: 210mm !important;
          box-shadow: none !important;
          border: none !important;
        }
      }
    `,
  })

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

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'suratJalan') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const isPhoto = type === 'photo'
    if (isPhoto) setIsUploadingPhoto(true)
    else setIsUploadingSuratJalan(true)

    try {
      const fd = new FormData()
      fd.append('file', files[0])
      fd.append('prefix', 'cer-attachments')

      const res = await uploadFile(fd)
      if (res && res.success && res.url) {
        if (isPhoto) {
          setGoodsPhotoUrl(res.url)
          toast.success('Foto kondisi fisik berhasil diunggah.')
        } else {
          setDeliveryNoteUrl(res.url)
          toast.success('Foto surat jalan / invoice berhasil diunggah.')
        }
      } else {
        toast.error('Gagal mengunggah berkas: ' + (res?.message || 'Error tidak diketahui'))
      }
    } catch (err: any) {
      toast.error('Gagal mengunggah berkas: ' + (err?.message || ''))
    } finally {
      if (isPhoto) setIsUploadingPhoto(false)
      else setIsUploadingSuratJalan(false)
    }
  }

  const handleConfirmSubmit = () => {
    if (!cer) return

    const effectiveSig = isUsingProfileSig && profileSig ? profileSig : liveSignatureUrl
    if (!effectiveSig) {
      toast.error('Tanda tangan digital penerima wajib dibubuhkan sebelum menerbitkan BAST.')
      return
    }

    startTransition(async () => {
      try {
        const res = await confirmAssetReceivedAction({
          cerRequestId: cer.id,
          receivedDate,
          receiverNotes,
          goodsPhotoUrl: goodsPhotoUrl || undefined,
          deliveryNoteUrl: deliveryNoteUrl || undefined,
          receiverSignatureUrl: effectiveSig,
        })

        if (res.success) {
          toast.success('Penerimaan fisik aset berhasil dikonfirmasi dan BAST resmi telah diterbitkan!')
          onOpenChange(false)
          if (onSuccess) onSuccess()
          router.refresh()
        } else {
          toast.error(res.message || 'Gagal mengonfirmasi penerimaan aset.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Terjadi kesalahan sistem saat konfirmasi BAST.')
      }
    })
  }

  if (!cer) return null

  // Format data for CerBastDocumentView
  const bastDocData: CerBastDocumentData = {
    cerNumber: cer.cerNumber,
    bastNumber: cer.bastNumber || `BAST-${cer.cerNumber.replace(/^CER\//, '')}`,
    dateRequired: cer.dateRequired,
    receivedAt: receivedDate ? new Date(receivedDate) : new Date(),
    applicantName: cer.applicantName || 'Pemohon',
    applicantSn: cer.applicantSn || null,
    applicantJobTitle: cer.applicantJobTitle || 'PIC Lokasi',
    departmentName: cer.departmentName,
    sectionName: cer.sectionName,
    siteName: cer.siteName,
    assetCategory: cer.assetCategory,
    subject: cer.subject,
    vendorName: cer.vendorName,
    totalEstimatedPrice: cer.totalEstimatedPrice,
    kelompokAset: cer.kelompokAset,
    receiverNotes,
    receiverSignatureUrl: isUsingProfileSig && profileSig ? profileSig : liveSignatureUrl,
    items: cer.items?.map((it: any) => ({
      itemDescription: it.itemDescription || it.description || '',
      quantity: it.quantity || it.qty || 1,
      estimatedPrice: Number(it.estimatedPrice || it.pricePerUnit || 0),
      currency: it.currency || 'IDR',
      allocation: it.allocation || '',
      holderName: it.holderName || '',
      notes: it.notes || '',
      assetNumber: it.assetNumber || cer.assetNumber || null,
      kelompokAset: it.kelompokAset || cer.kelompokAset || null,
    })) || [],
    approvals: cer.approvals || [],
    financeCheckerName: cer.financeCheckedByName || 'Syamsul Bahri / Evo Dwi',
    financeCheckedAt: cer.financeCheckedAt || null,
  }

  const effectiveSigUrl = isUsingProfileSig && profileSig ? profileSig : liveSignatureUrl

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[99vw] lg:max-w-[1550px] 2xl:max-w-[1680px] w-[99vw] h-[95vh] sm:h-[94vh] flex flex-col p-3 sm:p-5 gap-3 bg-slate-100 border border-slate-300 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Modal (Matches Work Order Approval Dialog) */}
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              Konfirmasi Penerimaan Aset Fisik &amp; Terbitkan BAST — {cer.cerNumber}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {cer.applicantName} • {cer.siteName} • {cer.subject}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(cer.status === 'full_approved' || cer.status === 'received' || cer.status === 'completed' || cer.pdfUrl) ? (
              <a href={cer.pdfUrl ? resolveUploadUrl(cer.pdfUrl) : `/api/assets/cer/${cer.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-sky-300 bg-sky-50 font-semibold text-sky-800 hover:bg-sky-100 shadow-xs text-xs h-9"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5 text-sky-600" />
                  Unduh Dokumen CER (PDF)
                </Button>
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 text-xs h-9"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Cetak BAST
            </Button>
          </div>
        </DialogHeader>

        {/* 2-Column Split View: Left = WYSIWYG BAST Preview, Right = Input & Signature Panel */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_390px] gap-3.5 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Official BAST Document WYSIWYG View */}
          <div className="overflow-y-auto overflow-x-auto p-1.5 min-h-[340px] lg:h-full rounded-xl flex justify-center items-start bg-slate-200/40">
            <CerBastDocumentView
              data={bastDocData}
              containerRef={printDocRef}
              liveSignatureUrl={effectiveSigUrl}
            />
          </div>

          {/* Right Column: Physical Confirmation Controls & Signature */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 h-auto lg:h-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
            {/* Quick Summary Card */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Ringkasan Pengajuan CER
              </p>
              <div className="grid grid-cols-[90px_1fr] gap-1 text-slate-600">
                <span className="font-semibold text-slate-700">No. CER:</span>
                <span className="font-mono text-slate-900 font-bold">{cer.cerNumber}</span>
                <span className="font-semibold text-slate-700">Kategori:</span>
                <span className="text-slate-900">{cer.assetCategory}</span>
                <span className="font-semibold text-slate-700">Site / Lokasi:</span>
                <span className="text-slate-900">{cer.siteName}</span>
                <span className="font-semibold text-slate-700">Pemohon:</span>
                <span className="text-slate-900">{cer.applicantName}</span>
                <span className="font-semibold text-slate-700">Total Capex:</span>
                <span className="font-bold text-emerald-700">
                  {cer.totalEstimatedPrice
                    ? `Rp ${Number(cer.totalEstimatedPrice).toLocaleString('id-ID')}`
                    : '-'}
                </span>
              </div>
            </div>

            {/* Area Tanda Tangan Digital Penerima */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <PenLine className="h-3.5 w-3.5 text-sky-600" />
                  <span>Tanda Tangan Penerima (PIC Lokasi) *</span>
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
                  <div className="relative rounded-lg border-2 border-emerald-200 bg-emerald-50/30 p-2 flex flex-col items-center justify-center min-h-[90px]">
                    <span className="absolute top-1.5 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      TTD Profil HERO Aktif
                    </span>
                    <img
                      src={profileSig}
                      alt="Tanda Tangan Profil"
                      className="max-h-16 object-contain my-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">
                    Tanda tangan dari profil akun Anda akan otomatis tersemat pada BAST fisik.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Goreskan tanda tangan Anda pada kanvas di bawah ini:
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

            {/* Form Informasi Penerimaan Fisik */}
            <div className="space-y-2.5">
              <div>
                <Label className="text-xs font-bold text-slate-700">Tanggal Penerimaan Fisik *</Label>
                <Input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>

              {/* Upload Foto Fisik Barang & Surat Jalan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">Foto Fisik Barang</Label>
                  <label className="mt-1 flex flex-col items-center justify-center h-16 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer p-1 text-center">
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : goodsPhotoUrl ? (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Foto Terunggah
                      </span>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 text-slate-400 mb-0.5" />
                        <span className="text-[10px] text-slate-600">Ambil / Upload</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleUploadPhoto(e, 'photo')}
                    />
                  </label>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">Surat Jalan / Inv</Label>
                  <label className="mt-1 flex flex-col items-center justify-center h-16 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer p-1 text-center">
                    {isUploadingSuratJalan ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : deliveryNoteUrl ? (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> SJ Terunggah
                      </span>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4 text-slate-400 mb-0.5" />
                        <span className="text-[10px] text-slate-600">Upload Dokumen</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleUploadPhoto(e, 'suratJalan')}
                    />
                  </label>
                </div>
              </div>

              {/* Catatan Penerimaan */}
              <div>
                <Label className="text-xs font-bold text-slate-700">Catatan Penerimaan / BAST</Label>
                <Textarea
                  value={receiverNotes}
                  onChange={(e) => setReceiverNotes(e.target.value)}
                  rows={2}
                  placeholder="Kondisi barang, kelengkapan aksesoris, dll..."
                  className="resize-none text-xs mt-1"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2 mt-auto border-t border-slate-200">
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isPending || !effectiveSigUrl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full h-10 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Konfirmasi Aset Diterima &amp; Terbitkan BAST
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full text-xs text-slate-500 h-8"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
