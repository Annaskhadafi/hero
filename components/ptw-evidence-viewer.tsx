'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  HardHat,
  Image as ImageIcon,
  Layers,
  MapPin,
  Maximize2,
  Printer,
  RefreshCw,
  RotateCw,
  Share2,
  ShieldCheck,
  UserCheck,
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { parseAttachmentsList, type PtwAttachmentItem } from '@/components/ptw-document-qr'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

interface PtwEvidenceData {
  permitId: number
  permitNumber: string
  projectName: string
  permitType: string
  location: string
  area?: string | null
  startAt: Date | string | null
  endAt: Date | string | null
  applicantName?: string | null
  fieldPicName?: string | null
  authorizedByName?: string | null
  status: string
  riskLevel?: string | null
  description?: string | null
  controlSteps?: string | null
  ppe?: string[] | null
  subTypes?: Record<string, string[]> | string[] | null
  additionalNotes?: string | null
  checkedEquipment?: string[] | null
  attachments?: any
  approvals?: Array<{
    id: number
    stepOrder: number
    role: string
    approverName?: string | null
    approverEmail?: string | null
    status: string
    remarks?: string | null
    signatureDataUrl?: string | null
    signedAt?: Date | string | null
  }>
}

function formatDate(val: Date | string | null | undefined) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return String(val)
  }
}

function formatDateTime(val: Date | string | null | undefined) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(val)
  }
}

export function PtwEvidenceViewer({ data }: { data: PtwEvidenceData }) {
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents'>('all')
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    title: string
  } | null>(null)
  const [imageScale, setImageScale] = useState<number>(1)
  const [imageRotation, setImageRotation] = useState<number>(0)
  const [previewDoc, setPreviewDoc] = useState<{
    url: string
    name: string
    isPdf: boolean
    isOffice: boolean
  } | null>(null)

  const parsedAttachments = React.useMemo(() => {
    return parseAttachmentsList(data.attachments)
  }, [data.attachments])

  const imageAttachments = React.useMemo(() => {
    return parsedAttachments.filter((a) => a.isImg)
  }, [parsedAttachments])

  const documentAttachments = React.useMemo(() => {
    return parsedAttachments.filter((a) => !a.isImg)
  }, [parsedAttachments])

  const displayedAttachments = React.useMemo(() => {
    if (filterType === 'images') return imageAttachments
    if (filterType === 'documents') return documentAttachments
    return parsedAttachments
  }, [filterType, parsedAttachments, imageAttachments, documentAttachments])

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Lampiran PTW - ${data.permitNumber}`,
          text: `Dokumen & Lampiran Izin Kerja Aman (PTW) ${data.permitNumber} - ${data.projectName}`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link dokumen lampiran berhasil disalin ke clipboard')
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link dokumen lampiran berhasil disalin ke clipboard')
    }
  }

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s.includes('APPROVED')) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1 font-semibold">
          APPROVED / DISETUJUI
        </Badge>
      )
    }
    if (s.includes('REJECT')) {
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs px-3 py-1 font-semibold">
          REJECTED / DITOLAK
        </Badge>
      )
    }
    if (s.includes('REVERT')) {
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-3 py-1 font-semibold">
          REVISION / PERLU REVISI
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs px-3 py-1 font-semibold">
        {s || 'SUBMITTED'}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#0f172a] pb-16">
      {/* Top Banner / Sticky Navigation */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-sm">
              PTW
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                  Dokumen Lampiran Izin Kerja
                </span>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 shrink-0">
                  {data.permitNumber}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                PT Chitra Paratama • HSE Permit to Work Evidence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9 rounded-full px-3 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Bagikan Link</span>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9 rounded-full bg-teal-800 hover:bg-teal-900 text-white px-3.5 text-xs gap-1.5 shadow-sm"
            >
              <Link prefetch={false} href={`/print/izin-kerja-ptw?id=${data.permitId}`} target="_blank">
                <Printer className="size-3.5" />
                <span>Cetak Dokumen</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header Information Card */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" /> Permit to Work Supporting Documents
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                  {data.projectName || 'Izin Kerja Aman (PTW)'}
                </h1>
                <p className="text-xs sm:text-sm text-teal-100/80 mt-1">
                  Jenis Izin: <span className="font-semibold text-white">{data.permitType || 'Umum'}</span>
                  {data.applicantName ? ` • Pemohon: ${data.applicantName}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(data.status)}
                {data.riskLevel ? (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs px-3 py-1">
                    Risk: {data.riskLevel}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50">
            <div className="flex items-start gap-2.5">
              <Calendar className="size-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Masa Berlaku</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                  {formatDate(data.startAt)}
                </p>
                {data.endAt && (
                  <p className="text-[11px] text-slate-500">s/d {formatDate(data.endAt)}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="size-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lokasi / Area</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">{data.location || '-'}</p>
                {data.area && <p className="text-[11px] text-slate-500">Area: {data.area}</p>}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ImageIcon className="size-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Lampiran</p>
                <p className="text-xs sm:text-sm font-semibold text-teal-700 mt-0.5">
                  {parsedAttachments.length} Dokumen Tersedia
                </p>
                <p className="text-[11px] text-slate-500">
                  {imageAttachments.length} Gambar • {documentAttachments.length} Berkas
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <UserCheck className="size-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Penanggung Jawab</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                  {data.fieldPicName || data.authorizedByName || data.applicantName || '-'}
                </p>
                <p className="text-[11px] text-slate-500">PIC / Authorized Inspector</p>
              </div>
            </div>
          </CardContent>

          {data.description && (
            <div className="px-6 py-3 bg-white border-t border-slate-100 text-xs text-slate-600 flex items-start gap-2">
              <span className="font-semibold text-slate-700 shrink-0">Uraian Pekerjaan:</span>
              <span>{data.description}</span>
            </div>
          )}
        </Card>

        {/* Attachments Section Header & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="size-5 text-teal-700" />
              Lampiran & Bukti Dokumen Pendukung ({displayedAttachments.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh lampiran foto area kerja, sertifikat keahlian, JSA, dan dokumen pendukung resmi.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({parsedAttachments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('images')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'images'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gambar ({imageAttachments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('documents')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'documents'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Berkas / PDF ({documentAttachments.length})
            </button>
          </div>
        </div>

        {/* Attachments Grid */}
        {displayedAttachments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAttachments.map((item, idx) => {
              if (item.isImg && item.url) {
                return (
                  <Card
                    key={idx}
                    className="group rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div
                      className="relative bg-slate-900/90 aspect-4/3 overflow-hidden cursor-pointer flex items-center justify-center"
                      onClick={() => {
                        setSelectedImage({ url: item.url, title: item.name })
                        setImageScale(1)
                        setImageRotation(0)
                      }}
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs backdrop-blur-[2px]">
                        <ZoomIn className="size-4" />
                        <span>Klik untuk Memperbesar</span>
                      </div>
                      <Badge className="absolute top-2 left-2 bg-amber-500/90 text-white border-none text-[10px] px-2 py-0.5">
                        Foto / Gambar
                      </Badge>
                    </div>

                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-500">Lampiran #{idx + 1}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedImage({ url: item.url, title: item.name })
                            setImageScale(1)
                            setImageRotation(0)
                          }}
                          className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 bg-white border-slate-200"
                        >
                          <ZoomIn className="size-3.5 mr-1" /> Zoom
                        </Button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          download={item.name}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
                        >
                          <Download className="size-3.5" /> Unduh
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              // Document card (PDF / Word / Excel / Generic)
              return (
                <Card
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                      {item.isPdf ? (
                        <FileText className="size-6 text-red-600" />
                      ) : item.isExcel ? (
                        <FileSpreadsheet className="size-6 text-emerald-600" />
                      ) : item.isWord ? (
                        <FileText className="size-6 text-blue-600" />
                      ) : (
                        <File className="size-6 text-teal-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-bold ${
                            item.isPdf
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : item.isExcel
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.isWord
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.ext ? item.ext.toUpperCase() : 'DOC'}
                        </Badge>
                        <span className="text-[10px] text-slate-400">Lampiran #{idx + 1}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-2" title={item.name}>
                        {item.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {item.url ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPreviewDoc({
                              url: item.url,
                              name: item.name,
                              isPdf: item.isPdf,
                              isOffice: item.isWord || item.isExcel || item.isPpt,
                            })
                          }}
                          className="h-8 px-2.5 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-50 border-teal-200"
                        >
                          <Eye className="size-3.5 mr-1" /> Pratinjau
                        </Button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          download={item.name}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
                        >
                          <Download className="size-3.5" /> Unduh
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">File tersimpan aman</span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50 space-y-3">
            <FileText className="size-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-800">Belum Ada Dokumen Lampiran</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Tidak ada dokumen lampiran yang terunggah untuk izin kerja ini pada kategori yang dipilih.
              </p>
            </div>
          </Card>
        )}

        {/* Approval History / Sign-off Verification Section */}
        {data.approvals && data.approvals.length > 0 && (
          <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-200/60 p-4 sm:p-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-600" />
                Status Otorisasi & Tanda Tangan Izin Kerja
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Riwayat verifikasi dan persetujuan resmi dokumen izin kerja di lapangan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.approvals.map((step, idx) => {
                  const isApproved = step.status === 'approved'
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Step {step.stepOrder}: {step.role}
                          </span>
                          <Badge
                            variant={isApproved ? 'default' : 'outline'}
                            className={`text-[10px] px-1.5 py-0 ${
                              isApproved
                                ? 'bg-emerald-600 text-white'
                                : step.status === 'rejected'
                                ? 'bg-red-600 text-white'
                                : 'text-slate-600'
                            }`}
                          >
                            {step.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {step.approverName || 'Menunggu Penugasan'}
                        </p>
                        {step.approverEmail && (
                          <p className="text-[11px] text-slate-500 truncate">{step.approverEmail}</p>
                        )}
                      </div>

                      {step.signatureDataUrl && (
                        <div className="mt-1 p-1 bg-white rounded-lg border border-slate-200 flex items-center justify-center max-h-16">
                          <img
                            src={step.signatureDataUrl}
                            alt="Signature"
                            className="max-h-14 object-contain"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Waktu:</span>
                        <span className="font-medium text-slate-700">{formatDateTime(step.signedAt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Document Viewer Modal (PDF / Office Live / Generic) ── */}
      <Dialog
        open={Boolean(previewDoc)}
        onOpenChange={(v) => {
          if (!v) setPreviewDoc(null)
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
          <DialogHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-4">
              <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 shrink-0">
                {previewDoc?.isPdf ? (
                  <FileText className="size-5 text-red-600" />
                ) : (
                  <FileSpreadsheet className="size-5 text-teal-600" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-slate-900 truncate">
                  {previewDoc?.name || 'Preview Dokumen'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 truncate">
                  {previewDoc?.isPdf
                    ? 'Dokumen PDF terintegrasi'
                    : previewDoc?.isOffice
                    ? 'Office Online Viewer'
                    : 'Dokumen Lampiran PTW'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {previewDoc?.url && (
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  download={previewDoc.name}
                  className="inline-flex items-center gap-1 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                >
                  <Download className="size-3.5" /> Unduh Dokumen
                </a>
              )}
              {previewDoc?.url && (
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ExternalLink className="size-3.5" /> Tab Baru
                </a>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 w-full bg-slate-100 relative overflow-hidden">
            {previewDoc?.isPdf ? (
              <iframe
                src={`${previewDoc.url}#toolbar=1&navpanes=1`}
                className="w-full h-full border-none"
                title={previewDoc.name}
              />
            ) : previewDoc?.isOffice && previewDoc.url.startsWith('http') ? (
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                  previewDoc.url
                )}`}
                className="w-full h-full border-none"
                title={previewDoc.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
                <FileText className="size-12 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{previewDoc?.name}</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Pratinjau langsung di dalam browser mungkin tidak didukung untuk tipe file ini, silakan klik tombol unduh atau buka tab baru.
                  </p>
                </div>
                {previewDoc?.url && (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    download={previewDoc.name}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-lg"
                  >
                    <Download className="size-4" /> Unduh Dokumen Sekarang
                  </a>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox / Zoom Image Modal ── */}
      <Dialog
        open={Boolean(selectedImage)}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedImage(null)
            setImageScale(1)
            setImageRotation(0)
          }
        }}
      >
        <DialogContent className="max-w-4xl sm:max-w-5xl bg-slate-950/95 border-slate-800 p-4 text-white rounded-2xl shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800 text-left">
            <div className="min-w-0 flex-1 pr-4">
              <DialogTitle className="text-sm font-bold text-white truncate">
                {selectedImage?.title || 'Preview Foto Lampiran'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Gunakan kontrol di atas untuk perbesar, putar, atau unduh gambar
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageScale((s) => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
                className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="text-xs font-mono text-slate-300 w-12 text-center select-none">
                {Math.round(imageScale * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageScale((s) => Math.min(4, Number((s + 0.25).toFixed(2))))}
                className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageRotation((r) => (r + 90) % 360)}
                className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                title="Putar / Rotate"
              >
                <RotateCw className="size-3.5" />
              </Button>
              {(imageScale !== 1 || imageRotation !== 0) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageScale(1)
                    setImageRotation(0)
                  }}
                  className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                  title="Reset Zoom & Rotasi"
                >
                  <RefreshCw className="size-3.5" /> Reset
                </Button>
              )}
              {selectedImage?.url && (
                <a
                  href={selectedImage.url}
                  download={selectedImage.title}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-8 px-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-semibold gap-1 transition"
                  title="Unduh Gambar Asli"
                >
                  <Download className="size-3.5" />
                </a>
              )}
            </div>
          </DialogHeader>
          <div
            className="flex items-center justify-center p-2 min-h-[50vh] max-h-[72vh] overflow-auto bg-slate-900/90 rounded-xl border border-slate-800/80 cursor-grab active:cursor-grabbing select-none"
            onWheel={(e) => {
              e.preventDefault()
              if (e.deltaY < 0) {
                setImageScale((s) => Math.min(4, Number((s + 0.15).toFixed(2))))
              } else {
                setImageScale((s) => Math.max(0.5, Number((s - 0.15).toFixed(2))))
              }
            }}
            onDoubleClick={() => setImageScale((s) => (s === 1 ? 2 : 1))}
          >
            {selectedImage?.url && (
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[68vh] w-auto max-w-full rounded object-contain"
                draggable={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
