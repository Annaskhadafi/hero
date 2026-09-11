'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Maximize2,
  X,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type EvidenceItem = {
  id: number
  itemIndex: number
  snapshotLabel: string
  snapshotGroupName: string | null
  unitNumber: string | null
  remark: string | null
  actualPoints: number
  isChecked: boolean
  startedAt: Date | string | null
  endedAt: Date | string | null
  startLabel: string
  endLabel: string
  durationLabel: string
  photoUrl: string | null
}

type EvidenceData = {
  header: {
    sessionId: number
    sessionCode: string
    workDate: Date | string
    shiftCode: string | null
    status: string
    summaryRemark: string | null
    submittedAt: Date | string | null
    employeeId: number
    employeeName: string
    employeeSn: string | null
    employeeDepartment: string | null
    employeeSection: string | null
    employeeJobTitle: string | null
    siteId: number
    siteName: string
    customerName: string | null
    contractNumber: string | null
    splId: number | null
    splNumber: string | null
    splTitle: string | null
  }
  allItems: EvidenceItem[]
  evidenceItems: EvidenceItem[]
  approvals: Array<{
    id: number
    stepOrder: number
    stepLabel: string
    status: string
    approverName: string
    approverRole: string
    signedAt: Date | string | null
  }>
}

interface DailyActivityEvidenceModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId?: number | string | null
  fallbackData?: EvidenceData | null
}

export function DailyActivityEvidenceModal({
  isOpen,
  onClose,
  sessionId,
  fallbackData,
}: DailyActivityEvidenceModalProps) {
  const [data, setData] = useState<EvidenceData | null>(fallbackData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    label: string
    detail: string
  } | null>(null)

  const cleanId = typeof sessionId === 'string' ? sessionId.replace(/^daily-activity-/, '') : sessionId
  const numId = cleanId ? Number(cleanId) : NaN
  const validSessionId = !Number.isNaN(numId) && numId > 0 ? numId : null

  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null)
      return
    }

    if (validSessionId) {
      setIsLoading(true)
      setError(null)

      fetch(`/api/activity-sessions/${validSessionId}/evidence`)
        .then(async (res) => {
          if (!res.ok) {
            if (fallbackData) {
              setData(fallbackData)
              return null
            }
            const errData = await res.json().catch(() => null)
            setError(errData?.error || 'Belum ada foto bukti yang tersimpan.')
            return null
          }
          return res.json()
        })
        .then((resData) => {
          if (resData) {
            setData(resData)
          } else if (fallbackData) {
            setData(fallbackData)
          }
        })
        .catch(() => {
          if (fallbackData) {
            setData(fallbackData)
          } else {
            setError('Gagal memuat data foto bukti.')
          }
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else if (fallbackData) {
      setData(fallbackData)
      setIsLoading(false)
    } else {
      setData(null)
      setIsLoading(false)
    }
  }, [isOpen, validSessionId, fallbackData])

  const evidenceList =
    (data?.evidenceItems && data.evidenceItems.length > 0)
      ? data.evidenceItems
      : (data?.allItems || (data as any)?.items || [])
          .map((item: any, idx: number) => {
            const rawPhoto =
              item.photoUrl ||
              (typeof item.photo === 'string' ? item.photo : item.photo?.url) ||
              (Array.isArray(item.photos)
                ? (typeof item.photos[0] === 'string' ? item.photos[0] : item.photos[0]?.url)
                : null) ||
              (Array.isArray(item.photoUrls)
                ? (typeof item.photoUrls[0] === 'string' ? item.photoUrls[0] : item.photoUrls[0]?.url)
                : null) ||
              null
            return {
              ...item,
              id: item.id || idx + 1,
              itemIndex: item.itemIndex || idx + 1,
              photoUrl: rawPhoto,
            }
          })
          .filter((item: any) => Boolean(item.photoUrl))

  const sessionHeader = data?.header

  const formattedDate = sessionHeader?.workDate
    ? new Date(sessionHeader.workDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    const toastId = toast.loading('Menyiapkan berkas unduhan...')

    try {
      const code = sessionHeader?.sessionCode || (validSessionId ? `DAR-${validSessionId}` : 'DAR-EVIDENCE')
      const safeEmployee = (sessionHeader?.employeeName || 'karyawan').toLowerCase().replace(/[^a-z0-9]+/g, '-')

      const fetchImageBlob = async (url: string) => {
        try {
          const res = await fetch(url)
          if (!res.ok) return null
          return await res.blob()
        } catch {
          return null
        }
      }

      // 1. Single Photo / No Photo (<= 1 photo) -> Download as direct PDF
      if (evidenceList.length <= 1) {
        toast.loading('Mengunduh berkas PDF...', { id: toastId })
        let downloaded = false

        if (validSessionId) {
          try {
            const res = await fetch(`/api/activity-sessions/${validSessionId}/pdf`)
            if (res.ok) {
              const blob = await res.blob()
              const downloadUrl = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = downloadUrl
              a.download = `laporan-aktivitas-${safeEmployee}-${code}.pdf`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(downloadUrl)
              downloaded = true
            }
          } catch (e) {
            console.warn('Direct PDF endpoint error, fallback to direct download:', e)
          }
        }

        if (!downloaded && evidenceList.length === 1 && evidenceList[0].photoUrl) {
          const photoBlob = await fetchImageBlob(evidenceList[0].photoUrl)
          if (photoBlob) {
            const ext = photoBlob.type.includes('png') ? 'png' : photoBlob.type.includes('pdf') ? 'pdf' : 'jpg'
            const downloadUrl = window.URL.createObjectURL(photoBlob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = `bukti-aktivitas-${safeEmployee}-${code}.${ext}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(downloadUrl)
            downloaded = true
          }
        }

        if (downloaded) {
          toast.success('Dokumen berhasil diunduh.', { id: toastId })
        } else {
          toast.error('Gagal mengunduh berkas. Silakan coba lagi.', { id: toastId })
        }
        return
      }

      // 2. Multiple Photos (> 1 photos) -> Package into ZIP
      toast.loading(`Mengemas ${evidenceList.length} foto bukti ke dalam ZIP...`, { id: toastId })
      const { default: JSZipModule } = await import('jszip')
      const zip = new JSZipModule()

      // Include official document PDF in the zip if available
      if (validSessionId) {
        try {
          const res = await fetch(`/api/activity-sessions/${validSessionId}/pdf`)
          if (res.ok) {
            const pdfBlob = await res.blob()
            zip.file(`00_Laporan_Aktivitas_${code}.pdf`, pdfBlob)
          }
        } catch (e) {
          console.warn('Could not include PDF in ZIP:', e)
        }
      }

      // Add each evidence photo to the ZIP
      let photoCount = 0
      for (const [idx, item] of evidenceList.entries()) {
        if (!item.photoUrl) continue
        const blob = await fetchImageBlob(item.photoUrl)
        if (blob) {
          const ext = blob.type.includes('png') ? 'png' : blob.type.includes('pdf') ? 'pdf' : 'jpg'
          const safeLabel = (item.snapshotLabel || `item-${idx + 1}`).slice(0, 30).replace(/[^a-zA-Z0-9_-]+/g, '_')
          const unitTag = item.unitNumber ? `_Unit-${item.unitNumber.replace(/[^a-zA-Z0-9_-]+/g, '_')}` : ''
          const filename = `Foto_${idx + 1}_${safeLabel}${unitTag}.${ext}`
          zip.file(filename, blob)
          photoCount++
        }
      }

      if (photoCount === 0 && !zip.file(`00_Laporan_Aktivitas_${code}.pdf`)) {
        toast.error('Tidak ada foto bukti yang dapat dikemas ke ZIP.', { id: toastId })
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const downloadUrl = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `bukti-aktivitas-${safeEmployee}-${code}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success(`Berhasil mengunduh ZIP berisi ${photoCount} foto bukti & PDF.`, { id: toastId })
    } catch (err: any) {
      console.error('Evidence download error:', err)
      toast.error(err?.message || 'Gagal mengunduh berkas.', { id: toastId })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="w-[94vw] max-w-lg md:max-w-xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-slate-50 shadow-2xl border border-slate-200 z-[100]"
        >
          {/* Header Dialog */}
          <DialogHeader className="p-3.5 sm:p-4 bg-[linear-gradient(135deg,#003461,#004b87)] text-white border-b border-blue-900 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-white/10 text-sky-200 shrink-0">
                  <ImageIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-extrabold text-white truncate leading-tight">
                    {sessionHeader?.employeeName ? `Bukti: ${sessionHeader.employeeName}` : 'Galeri Foto Bukti Pekerjaan'}
                  </DialogTitle>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownload}
                  className="h-7 sm:h-7.5 px-2.5 rounded-lg bg-white text-[#003461] hover:bg-sky-50 text-[10px] sm:text-xs font-bold gap-1 shadow-2xs cursor-pointer border-0 transition-all active:scale-95"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="size-3 animate-spin text-[#003461]" />
                      <span>Mengunduh...</span>
                    </>
                  ) : evidenceList.length > 1 ? (
                    <>
                      <Download className="size-3" />
                      <span>UNDUH ZIP ({evidenceList.length})</span>
                    </>
                  ) : (
                    <>
                      <Download className="size-3" />
                      <span>UNDUH PDF</span>
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Info Badges & Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-white/10 text-[10.5px] text-sky-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono font-bold text-[10px] bg-white/15 px-2 py-0.5 rounded-md text-white border border-white/20">
                  {sessionHeader?.sessionCode || (validSessionId ? `Sesi #${validSessionId}` : 'Sesi Aktivitas')}
                </span>
                {sessionHeader?.status && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[9px] font-bold uppercase px-1.5 py-0.5">
                    {sessionHeader.status}
                  </Badge>
                )}
                {sessionHeader?.shiftCode && (
                  <span className="text-[10px] font-semibold text-sky-200 bg-white/10 px-1.5 py-0.5 rounded">
                    Shift {sessionHeader.shiftCode}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-sky-200">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3 text-sky-300" /> {formattedDate}
                </span>
                {sessionHeader?.siteName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-sky-300" /> {sessionHeader.siteName}
                  </span>
                )}
                <span className="font-bold text-white bg-emerald-600/70 px-1.5 py-0.5 rounded text-[9.5px]">
                  {evidenceList.length} Foto
                </span>
              </div>
            </div>
            <DialogDescription className="sr-only">Galeri foto bukti pekerjaan aktivitas harian</DialogDescription>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-100/70">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <Loader2 className="size-7 text-[#003461] animate-spin" />
                <p className="text-xs font-semibold text-slate-600">Memuat galeri foto bukti...</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center space-y-2">
                <div className="mx-auto flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <X className="size-4" />
                </div>
                <p className="text-xs font-semibold text-rose-600">{error}</p>
                <Button size="sm" variant="outline" onClick={() => { setIsLoading(true); setError(null); }} className="text-xs">
                  Coba Lagi
                </Button>
              </div>
            ) : evidenceList.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-4 space-y-2">
                <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ImageIcon className="size-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Belum Ada Foto Bukti</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Item aktivitas pada laporan ini belum memiliki lampiran foto bukti pekerjaan yang tersimpan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {evidenceList.map((item, idx) => {
                  return (
                    <div
                      key={item.id || idx}
                      className="group relative flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all hover:border-sky-400"
                    >
                      {/* Photo Card Top Bar */}
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs">
                        <span className="font-bold font-mono text-[10px] text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
                          #{item.itemIndex}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          {item.unitNumber && (
                            <span className="font-semibold text-slate-700 bg-sky-50 text-sky-800 border border-sky-100 px-1.5 py-0.5 rounded">
                              Unit: {item.unitNumber}
                            </span>
                          )}
                          {item.durationLabel && item.durationLabel !== '-' && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="size-2.5" /> {item.durationLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Photo Thumbnail */}
                      <div
                        className="relative aspect-4/3 w-full bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center select-none"
                        onClick={() => {
                          if (item.photoUrl) {
                            setSelectedImage({
                              url: item.photoUrl,
                              label: item.snapshotLabel,
                              detail: [
                                item.unitNumber ? `Unit: ${item.unitNumber}` : null,
                                item.durationLabel !== '-' ? item.durationLabel : null,
                                item.remark,
                              ].filter(Boolean).join(' • '),
                            })
                          }
                        }}
                      >
                        {item.photoUrl ? (
                          <>
                            <img
                              src={item.photoUrl}
                              alt={item.snapshotLabel}
                              className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="bg-white/90 backdrop-blur-xs text-slate-900 rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1 shadow-md">
                                <ZoomIn className="size-3.5" /> Perbesar
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1 py-8">
                            <ImageIcon className="size-8" />
                            <span className="text-[10px]">Foto tidak tersedia</span>
                          </div>
                        )}
                      </div>

                      {/* Photo Info */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-white">
                        <div>
                          <p className="font-bold text-xs text-slate-900 leading-snug">
                            {item.snapshotLabel}
                          </p>
                        </div>

                        {item.remark ? (
                          <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2 leading-relaxed">
                            <span className="font-semibold text-slate-500 block text-[9.5px] uppercase tracking-wider mb-0.5">Catatan:</span>
                            {item.remark}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal for Zoomed Image */}
      {selectedImage && (
        <Dialog open={Boolean(selectedImage)} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent
            showCloseButton={false}
            className="w-[94vw] sm:w-[90vw] max-w-3xl max-h-[92dvh] p-0 !bg-white !text-slate-900 border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden z-[120]"
          >
            <div className="p-3 px-4 bg-[linear-gradient(135deg,#003461,#004b87)] text-white flex items-center justify-between shrink-0">
              <p className="font-bold text-xs sm:text-sm text-white truncate pr-2">
                {selectedImage.label}
              </p>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 max-h-[68vh] min-h-[220px] bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
              <img
                src={selectedImage.url}
                alt={selectedImage.label}
                className="max-h-[65vh] max-w-full object-contain rounded shadow-lg"
              />
            </div>

            {selectedImage.detail ? (
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {selectedImage.detail}
                </p>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
