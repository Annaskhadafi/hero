'use client'

import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  QrCode,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  X,
  Paperclip,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Eye,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PtwDocumentModal } from '@/components/ptw-document-modal'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

interface PtwDocumentQrProps {
  permitId?: number | string | null
  permitNumber?: string | null
  fallbackRecord?: any | null
  attachments?: any[] | null
  size?: number
  className?: string
  imageClassName?: string
  showLabel?: boolean
  labelTitle?: string
  labelSubtitle?: string
  clickAction?: 'attachment-modal' | 'qr-modal' | 'document-modal'
}

export interface PtwAttachmentItem {
  name: string
  url: string
  rawUrl?: string
  isImg: boolean
  isPdf: boolean
  isWord: boolean
  isExcel: boolean
  isPpt: boolean
  ext: string
  mimeType?: string
}

export function parseAttachmentsList(raw: any): PtwAttachmentItem[] {
  if (!raw) return []
  let arr: any[] = []
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) arr = parsed
      else if (parsed && typeof parsed === 'object') arr = [parsed]
      else arr = [raw]
    } catch {
      arr = [raw]
    }
  }

  return arr
    .map((att, idx) => {
      let name = `Lampiran Dokumen #${idx + 1}`
      let rawUrl = ''
      if (typeof att === 'object' && att !== null) {
        name = att.name || att.fileName || name
        rawUrl = att.url || att.fileUrl || att.path || ''
      } else if (typeof att === 'string') {
        const trimmed = att.trim()
        if (trimmed.includes('||')) {
          const [n, ...rest] = trimmed.split('||')
          name = n.trim() || name
          rawUrl = rest.join('||').trim()
        } else {
          try {
            const p = JSON.parse(trimmed)
            name = p.name || p.fileName || name
            rawUrl = p.url || p.fileUrl || p.path || ''
          } catch {
            if (trimmed.startsWith('data:') || trimmed.startsWith('http') || trimmed.startsWith('/')) {
              rawUrl = trimmed
              const segment = trimmed.split('?')[0].split('/').pop() || ''
              if (segment && !trimmed.startsWith('data:')) {
                name = decodeURIComponent(segment)
              }
            } else {
              name = trimmed
              rawUrl = trimmed
            }
          }
        }
      }

      let url = rawUrl
      if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
        url = resolveUploadUrl(url)
      }

      const lowerName = (name || '').toLowerCase()
      const lowerUrl = (url || '').toLowerCase()
      const extMatch = lowerName.match(/\.([a-z0-9]+)$/) || lowerUrl.match(/\.([a-z0-9]+)(?:\?|#|$)/)
      const ext = extMatch
        ? extMatch[1]
        : lowerUrl.startsWith('data:image')
        ? 'png'
        : lowerUrl.startsWith('data:application/pdf')
        ? 'pdf'
        : ''

      const isImg = Boolean(
        lowerUrl.startsWith('data:image') ||
          ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext)
      )
      const isPdf = Boolean(lowerUrl.startsWith('data:application/pdf') || ext === 'pdf')
      const isWord =
        ['doc', 'docx'].includes(ext) ||
        lowerUrl.includes('application/msword') ||
        lowerUrl.includes('wordprocessingml')
      const isExcel =
        ['xls', 'xlsx', 'csv'].includes(ext) ||
        lowerUrl.includes('spreadsheetml') ||
        lowerUrl.includes('excel')
      const isPpt =
        ['ppt', 'pptx'].includes(ext) ||
        lowerUrl.includes('presentationml') ||
        lowerUrl.includes('powerpoint')

      return { name, url, rawUrl, isImg, isPdf, isWord, isExcel, isPpt, ext }
    })
    .filter((a) => Boolean(a.name || a.url))
}

export function PtwDocumentQr({
  permitId,
  permitNumber,
  fallbackRecord,
  attachments: propAttachments,
  size,
  className = '',
  imageClassName = '',
  showLabel = true,
  labelTitle = 'Scan / Klik PTW',
  labelSubtitle = 'Dokumen Pendukung',
  clickAction = 'attachment-modal',
}: PtwDocumentQrProps) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [targetVerifyUrl, setTargetVerifyUrl] = useState<string>('')
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)

  // Zoom Lightbox State
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)

  // Generic Document Preview Modal (PDF / Office / Text)
  const [previewDoc, setPreviewDoc] = useState<{
    url: string
    name: string
    ext: string
    isPdf: boolean
    isWord: boolean
    isExcel: boolean
    isPpt: boolean
  } | null>(null)

  const cleanPermitId = typeof permitId === 'string' ? permitId.replace(/^ptw-/i, '') : permitId
  const displayNo =
    permitNumber ||
    fallbackRecord?.permitNumber ||
    (cleanPermitId
      ? String(cleanPermitId).startsWith('PTW')
        ? String(cleanPermitId)
        : `PTW-${cleanPermitId}`
      : 'PTW')

  const parsedAttachments = React.useMemo(() => {
    const raw =
      propAttachments ||
      fallbackRecord?.attachments ||
      fallbackRecord?.supportingDocuments ||
      fallbackRecord?.rawPtw?.attachments ||
      []
    return parseAttachmentsList(raw)
  }, [propAttachments, fallbackRecord])

  useEffect(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://hero.chitraparatama.com'
    const targetUrl = `${origin}/ptw-evidence/${encodeURIComponent(displayNo)}`
    setTargetVerifyUrl(targetUrl)

    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
    })
      .then(setQrUrl)
      .catch((err) => console.error('Failed to generate PTW QR code:', err))
  }, [displayNo])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (clickAction === 'qr-modal') {
      setIsQrModalOpen(true)
    } else if (clickAction === 'document-modal') {
      setIsDocModalOpen(true)
    } else {
      setIsAttachmentModalOpen(true)
    }
  }

  const handleCopyLink = () => {
    if (!targetVerifyUrl) return
    navigator.clipboard
      .writeText(targetVerifyUrl)
      .then(() => {
        setHasCopied(true)
        toast.success('Tautan verifikasi digital berhasil disalin!')
        setTimeout(() => setHasCopied(false), 2000)
      })
      .catch(() => {
        toast.error('Gagal menyalin tautan.')
      })
  }

  const handleDownloadQr = () => {
    if (!qrUrl) return
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `QR-${displayNo}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('QR Code berhasil diunduh!')
  }

  const handleOpenDocPreview = (att: PtwAttachmentItem) => {
    if (att.isImg && att.url) {
      setZoomImage({ url: att.url, title: att.name })
      setImageScale(1)
      setImageRotation(0)
    } else {
      setPreviewDoc({
        url: att.url,
        name: att.name,
        ext: att.ext,
        isPdf: att.isPdf,
        isWord: att.isWord,
        isExcel: att.isExcel,
        isPpt: att.isPpt,
      })
    }
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={`flex flex-col items-center justify-center cursor-pointer group hover:opacity-90 transition-all select-none ${className}`}
        title="Klik untuk membuka lampiran dokumen pendukung PTW"
      >
        <div className="relative">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt={`QR ${displayNo}`}
              className={`object-contain bg-white rounded border border-slate-300 p-0.5 shadow-2xs group-hover:border-teal-500 transition-colors ${
                imageClassName || 'size-10'
              }`}
              style={size ? { width: size, height: size } : undefined}
            />
          ) : (
            <div
              className={`bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-[7pt] text-slate-400 ${
                imageClassName || 'size-10'
              }`}
              style={size ? { width: size, height: size } : undefined}
            >
              QR
            </div>
          )}
        </div>

        {showLabel && (
          <>
            <div className="text-[7pt] font-bold text-slate-800 leading-tight mt-0.5 text-center group-hover:text-teal-700">
              {labelTitle}
            </div>
            {labelSubtitle && (
              <div className="text-[6.5pt] text-slate-500 leading-tight">
                {labelSubtitle}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FLOATING WINDOW: LAMPIRAN DOKUMEN PENDUKUNG PTW ── */}
      <Dialog open={isAttachmentModalOpen} onOpenChange={setIsAttachmentModalOpen}>
        <DialogContent
          showCloseButton={true}
          className="max-w-2xl w-[94vw] bg-white max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 shadow-2xl z-[120]"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="size-5 text-teal-600" />
              Lampiran Dokumen Pendukung PTW
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              No. Izin Kerja: <span className="font-semibold text-slate-700">{displayNo}</span> •{' '}
              {fallbackRecord?.projectName || fallbackRecord?.description || 'Izin Kerja Aman'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {parsedAttachments.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="size-3.5 text-teal-600" />
                    <span>File Terlampir ({parsedAttachments.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">PDF, Gambar, Word, Excel, dll.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parsedAttachments.map((att, idx) => {
                    const icon = att.isImg ? (
                      <ImageIcon className="size-5 text-purple-600" />
                    ) : att.isPdf ? (
                      <FileText className="size-5 text-rose-600" />
                    ) : att.isWord ? (
                      <FileText className="size-5 text-blue-600" />
                    ) : att.isExcel ? (
                      <FileSpreadsheet className="size-5 text-emerald-600" />
                    ) : att.isPpt ? (
                      <Presentation className="size-5 text-amber-600" />
                    ) : (
                      <FileText className="size-5 text-teal-600" />
                    )

                    const badgeLabel = att.isImg
                      ? 'GAMBAR'
                      : att.isPdf
                      ? 'PDF'
                      : att.isWord
                      ? 'WORD'
                      : att.isExcel
                      ? 'EXCEL'
                      : att.isPpt
                      ? 'PPT'
                      : att.ext ? att.ext.toUpperCase() : 'BERKAS'

                    const badgeColor = att.isImg
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : att.isPdf
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : att.isWord
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : att.isExcel
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : att.isPpt
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'

                    return (
                      <div
                        key={idx}
                        className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors gap-2.5 shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0 shadow-2xs">
                            {icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.25 rounded border ${badgeColor}`}>
                                {badgeLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">#{idx + 1}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                              {att.name}
                            </p>
                          </div>
                        </div>

                        {/* Image Thumbnail Preview */}
                        {att.isImg && att.url ? (
                          <div
                            className="group relative rounded-lg overflow-hidden border border-slate-200 bg-white max-h-40 flex items-center justify-center p-1 cursor-pointer"
                            onClick={() => handleOpenDocPreview(att)}
                            title="Klik untuk memperbesar gambar"
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              className="max-h-36 w-full object-contain rounded transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px] rounded-lg">
                              <ZoomIn className="size-4" />
                              <span>Klik untuk Zoom</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-200/60">
                          {att.url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDocPreview(att)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer h-8"
                            >
                              <Eye className="size-3.5 text-teal-600" />
                              <span>Lihat</span>
                            </Button>
                          )}
                          {att.url ? (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              download={att.name}
                              className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors h-8"
                            >
                              <Download className="size-3.5" />
                              <span>Unduh</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">File tersimpan di sistem</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center bg-slate-50/50 space-y-2">
                <FileText className="size-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Belum ada lampiran dokumen pendukung</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Izin kerja ini belum memiliki berkas dokumen pendukung (JSA, HIRADC, foto izin kerja lapangan, PDF, Excel, Word) yang diunggah.
                </p>
              </div>
            )}

            {/* Quick Digital Verification Link Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <QrCode className="size-4 text-slate-500 shrink-0" />
                <span className="font-mono text-[11px] font-semibold text-slate-800">{displayNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                >
                  {hasCopied ? <Check className="size-3 text-emerald-600 mr-1" /> : <Copy className="size-3 mr-1" />}
                  {hasCopied ? 'Tersalin' : 'Salin Tautan'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQrModalOpen(true)}
                  className="h-7 px-2.5 text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 cursor-pointer"
                >
                  <QrCode className="size-3 mr-1" /> Lihat QR
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAttachmentModalOpen(false)}
              className="text-xs font-bold px-5 h-8.5 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              TUTUP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INTERACTIVE DOCUMENT VIEWER MODAL (PDF / Office / Text) ── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl w-[96vw] h-[92vh] p-0 overflow-hidden flex flex-col bg-slate-900 text-white border-slate-800 z-[130] rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-md bg-slate-800 border border-slate-700 shrink-0">
                {previewDoc?.isPdf ? (
                  <FileText className="size-4 text-rose-400" />
                ) : previewDoc?.isWord ? (
                  <FileText className="size-4 text-blue-400" />
                ) : previewDoc?.isExcel ? (
                  <FileSpreadsheet className="size-4 text-emerald-400" />
                ) : previewDoc?.isPpt ? (
                  <Presentation className="size-4 text-amber-400" />
                ) : (
                  <FileText className="size-4 text-teal-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-100 truncate max-w-md" title={previewDoc?.name}>
                  {previewDoc?.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {previewDoc?.isPdf
                    ? 'Dokumen PDF'
                    : previewDoc?.isWord
                    ? 'Dokumen Microsoft Word'
                    : previewDoc?.isExcel
                    ? 'Lembar Kerja Excel'
                    : previewDoc?.isPpt
                    ? 'Presentasi PowerPoint'
                    : 'Pratinjau Berkas Dokumen'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {previewDoc?.url && (
                <>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    title="Buka di Tab Baru"
                  >
                    <ExternalLink className="size-3.5" />
                    <span className="hidden sm:inline">Tab Baru</span>
                  </a>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                    title="Unduh Berkas Asli"
                  >
                    <Download className="size-3.5" />
                    <span>Unduh</span>
                  </a>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDoc(null)}
                className="size-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer ml-1"
                title="Tutup"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-slate-950 flex flex-col items-center justify-center relative">
            {previewDoc?.isPdf ? (
              <iframe
                src={previewDoc.url}
                title={previewDoc.name}
                className="w-full h-full border-0 bg-slate-900"
              />
            ) : (previewDoc?.isWord || previewDoc?.isExcel || previewDoc?.isPpt) &&
              previewDoc.url.startsWith('http') ? (
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                  previewDoc.url
                )}`}
                title={previewDoc.name}
                className="w-full h-full border-0 bg-white"
              />
            ) : (
              <div className="p-8 text-center max-w-md space-y-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <div className="size-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-teal-400">
                  <FileCheck className="size-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-100">{previewDoc?.name}</h4>
                  <p className="text-xs text-slate-400">
                    Berkas ini siap diunduh atau dibuka menggunakan aplikasi pembaca dokumen di perangkat Anda.
                  </p>
                </div>
                {previewDoc?.url && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      download={previewDoc.name}
                      className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-lg"
                    >
                      <Download className="size-4" />
                      <span>Unduh Berkas</span>
                    </a>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                      <span>Buka Langsung</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── IMAGE ZOOM LIGHTBOX MODAL ── */}
      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-950 text-white border-slate-800 z-[130]">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon className="size-4 text-teal-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200 truncate">{zoomImage?.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageScale((s) => Math.min(s + 0.25, 4))}
                className="size-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Perbesar"
              >
                <ZoomIn className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageScale((s) => Math.max(s - 0.25, 0.5))}
                className="size-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Perkecil"
              >
                <ZoomOut className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageRotation((r) => (r + 90) % 360)}
                className="size-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Putar 90°"
              >
                <RotateCw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImageScale(1)
                  setImageRotation(0)
                }}
                className="size-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Reset Posisi"
              >
                <RotateCcw className="size-4" />
              </Button>
              {zoomImage?.url && (
                <a
                  href={zoomImage.url}
                  download={zoomImage.title}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-8 items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                  title="Unduh Gambar Asli"
                >
                  <Download className="size-4" />
                </a>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZoomImage(null)}
                className="size-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer ml-1"
                title="Tutup"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950 select-none">
            {zoomImage?.url ? (
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-full max-w-full object-contain rounded shadow-2xl"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── FLOATING QR PREVIEW MODAL ── */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent
          showCloseButton={true}
          className="max-w-sm w-[92vw] p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 flex flex-col items-center text-center z-[125]"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#003461] mb-2">
            <QrCode className="size-6 text-[#003461]" />
          </div>

          <DialogTitle className="text-base font-bold text-slate-900">
            Validasi Dokumen Digital
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 mt-0.5 font-mono font-semibold">
            {displayNo}
          </DialogDescription>

          <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col items-center justify-center">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code PTW Large"
                className="w-48 h-48 object-contain bg-white p-2 rounded-lg border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                Memuat QR Code...
              </div>
            )}
            <span className="text-[11px] text-slate-600 font-medium mt-3">
              Pindai dengan kamera smartphone untuk memverifikasi keabsahan izin kerja ini secara online.
            </span>
          </div>

          <div className="mt-4 w-full flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="w-full text-xs font-semibold flex items-center justify-center gap-2 h-9 border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {hasCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {hasCopied ? 'Tautan Disalin!' : 'Salin Tautan Verifikasi'}
            </Button>

            {qrUrl && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleDownloadQr}
                className="w-full text-xs font-bold flex items-center justify-center gap-2 h-9 bg-[#003461] hover:bg-[#00274a] text-white cursor-pointer"
              >
                <Download className="size-3.5" />
                Unduh Gambar QR Code
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── FULL PTW DOCUMENT MODAL ── */}
      <PtwDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        permitId={permitId || displayNo}
        fallbackRecord={fallbackRecord}
      />
    </>
  )
}
