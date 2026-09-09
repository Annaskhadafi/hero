'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

    if (fallbackData) {
      setData(fallbackData)
      return
    }

    if (!validSessionId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    fetch(`/api/activity-sessions/${validSessionId}/evidence`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          setError(errData?.error || 'Belum ada foto bukti yang tersimpan.')
          return null
        }
        return res.json()
      })
      .then((resData) => {
        if (resData) {
          setData(resData)
        }
      })
      .catch(() => {
        setError('Gagal memuat data foto bukti.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen, validSessionId, fallbackData])

  const evidenceList = data?.evidenceItems || []
  const sessionHeader = data?.header

  const formattedDate = sessionHeader?.workDate
    ? new Date(sessionHeader.workDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[94vw] sm:w-[88vw] max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 z-[100]">
          {/* Header Dialog */}
          <DialogHeader className="p-3.5 sm:p-5 pb-3 sm:pb-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 pr-6 sm:pr-8">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] sm:text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 sm:px-2.5 py-0.5 rounded-md">
                    {sessionHeader?.sessionCode || (validSessionId ? `Sesi #${validSessionId}` : 'Sesi Aktivitas')}
                  </span>
                  {sessionHeader?.status && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] sm:text-[10px] font-bold uppercase px-1.5 sm:px-2 py-0.5">
                      {sessionHeader.status}
                    </Badge>
                  )}
                  {sessionHeader?.shiftCode && (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] font-semibold text-slate-600 px-1.5 sm:px-2 py-0.5">
                      Shift {sessionHeader.shiftCode}
                    </Badge>
                  )}
                </div>

                <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 leading-snug truncate">
                  {sessionHeader?.employeeName ? `Bukti Pekerjaan: ${sessionHeader.employeeName}` : 'Galeri Foto Bukti Pekerjaan'}
                </DialogTitle>

                <DialogDescription className="text-[11px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-0.5 sm:gap-y-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-slate-400" /> {formattedDate}
                  </span>
                  {sessionHeader?.siteName && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-slate-400" /> {sessionHeader.siteName}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <ImageIcon className="size-3" /> {evidenceList.length} Foto
                  </span>
                </DialogDescription>
              </div>

              {validSessionId && (
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <Button asChild size="sm" variant="outline" className="h-7 sm:h-8 rounded-lg text-[11px] sm:text-xs px-2.5 gap-1 shadow-2xs font-semibold">
                    <Link prefetch={false} href={`/activity-evidence/${validSessionId}`} target="_blank">
                      <ExternalLink className="size-3 sm:size-3.5" /> Buka Web
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="h-7 sm:h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs px-2.5 gap-1 shadow-2xs font-semibold">
                    <Link prefetch={false} href={`/api/activity-sessions/${validSessionId}/pdf`} target="_blank">
                      <Download className="size-3 sm:size-3.5" /> PDF
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 sm:space-y-4">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="size-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-600">Memuat galeri foto bukti pekerjaan...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <X className="size-5" />
                </div>
                <p className="text-xs font-semibold text-rose-600">{error}</p>
                <Button size="sm" variant="outline" onClick={() => { setIsLoading(true); setError(null); }} className="text-xs">
                  Coba Lagi
                </Button>
              </div>
            ) : evidenceList.length === 0 ? (
              <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 space-y-2">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ImageIcon className="size-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Belum Ada Foto Bukti</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Item aktivitas pada laporan ini belum memiliki lampiran foto bukti pekerjaan yang tersimpan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {evidenceList.map((item, idx) => {
                  const detailText = [
                    item.unitNumber ? `Unit: ${item.unitNumber}` : null,
                    item.durationLabel !== '-' ? item.durationLabel : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')

                  return (
                    <div
                      key={item.id || idx}
                      className="group relative flex flex-col rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all hover:border-indigo-300"
                    >
                      {/* Photo Thumbnail */}
                      <div
                        className="relative h-44 w-full bg-slate-100 cursor-pointer overflow-hidden flex items-center justify-center"
                        onClick={() => {
                          if (item.photoUrl) {
                            setSelectedImage({
                              url: item.photoUrl,
                              label: item.snapshotLabel,
                              detail: [detailText, item.remark].filter(Boolean).join(' — '),
                            })
                          }
                        }}
                      >
                        {item.photoUrl ? (
                          <>
                            <img
                              src={item.photoUrl}
                              alt={item.snapshotLabel}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="bg-white/90 backdrop-blur-xs text-slate-900 rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1 shadow-md">
                                <ZoomIn className="size-3.5" /> Perbesar
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                            <ImageIcon className="size-8" />
                            <span className="text-[10px]">Foto tidak tersedia</span>
                          </div>
                        )}

                        {/* Item Index Badge */}
                        <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          #{item.itemIndex}
                        </div>
                      </div>

                      {/* Photo Info */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5 bg-white">
                        <div>
                          <p className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">
                            {item.snapshotLabel}
                          </p>
                          {detailText ? (
                            <p className="text-[11px] font-medium text-slate-500 mt-1">{detailText}</p>
                          ) : null}
                        </div>

                        {item.remark ? (
                          <p className="text-[11px] italic text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-1.5 leading-snug line-clamp-2">
                            Catatan: {item.remark}
                          </p>
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
          <DialogContent className="w-[94vw] sm:w-[90vw] max-w-4xl max-h-[95dvh] p-2 bg-black/95 text-white border-0 shadow-2xl rounded-2xl flex flex-col items-center justify-center overflow-hidden z-[120]">
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 z-20 size-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>

              <div className="max-h-[78vh] max-w-full flex items-center justify-center overflow-hidden rounded-lg my-auto">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.label}
                  className="max-h-[76vh] max-w-full object-contain rounded-md shadow-2xl"
                />
              </div>

              <div className="w-full text-center pt-2 px-4 pb-1">
                <p className="font-bold text-sm text-white">{selectedImage.label}</p>
                {selectedImage.detail && (
                  <p className="text-xs text-slate-300 mt-0.5">{selectedImage.detail}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
