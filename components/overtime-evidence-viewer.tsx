'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
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
  Users,
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  Camera,
  Tag,
  Wrench,
  Disc,
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
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { cn } from '@/lib/utils'
import type { OvertimeEvidenceData } from '@/lib/overtime-evidence-data'

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

function formatTimeOnly(val: Date | string | null | undefined) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(val)
  }
}

export function OvertimeEvidenceViewer({
  data,
  isModal = false,
  onClose,
}: {
  data: OvertimeEvidenceData
  isModal?: boolean
  onClose?: () => void
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<OvertimeEvidenceData['evidencePhotos'][0] | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'photos' | 'activities' | 'workers' | 'approvals'>('photos')

  const openLightbox = (photo: OvertimeEvidenceData['evidencePhotos'][0]) => {
    setSelectedPhoto(photo)
    setZoomLevel(1)
    setRotation(0)
  }

  const closeLightbox = () => {
    setSelectedPhoto(null)
    setZoomLevel(1)
    setRotation(0)
  }

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bukti Lembur ${data.header.splNumber} - ${data.header.title}`,
          text: `Bukti Foto & Dokumen Surat Perintah Lembur ${data.header.splNumber} (${data.header.requesterName})`,
          url,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(url)
    toast.success('Tautan bukti lembur berhasil disalin ke clipboard!')
  }

  const isApproved =
    data.header.status.toLowerCase() === 'approved' ||
    data.header.status.toLowerCase() === 'completed'

  return (
    <div className={cn(
      "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/70 via-slate-50 to-white text-slate-800 antialiased",
      isModal ? "w-full pb-10" : "min-h-screen pb-16"
    )}>
      {/* ── TOP HEADER / BRAND BAR ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[#003f78] text-white flex items-center justify-center font-black text-sm shadow-xs tracking-wider">
              SPL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-[#003f78] tracking-wider">
                  {data.header.splNumber}
                </span>
                <Badge
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 ${
                    isApproved
                      ? 'bg-emerald-100 text-emerald-800'
                      : data.header.status.toLowerCase() === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {data.header.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[220px] sm:max-w-md">
                {data.header.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Share2 className="size-3.5 text-slate-500" />
              <span className="hidden sm:inline">Bagikan</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') window.print()
              }}
              className="h-8 text-xs font-semibold gap-1.5 rounded-xl bg-[#003f78] hover:bg-[#002f5a] text-white shadow-xs"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Cetak / PDF</span>
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="size-8 p-0 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                title="Tutup Modal Bukti"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ── HERO BANNER / DOCUMENT OVERVIEW ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-md p-6 sm:p-7 shadow-xs">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 size-48 rounded-full bg-blue-100/50 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 size-48 rounded-full bg-teal-50/60 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#003f78] uppercase tracking-wider">
                  SURAT PERINTAH LEMBUR (SPL) • PT CHITRA PARATAMA
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {data.header.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  <MapPin className="size-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{data.header.siteName}</span>
                  {data.header.customerName && (
                    <>
                      <span>•</span>
                      <span>{data.header.customerName}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pekerja</span>
                  <span className="text-sm font-black text-slate-800">{data.header.workerCount} Orang</span>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Foto Bukti</span>
                  <span className="text-sm font-black text-[#003f78]">{data.evidencePhotos.length} Lampiran</span>
                </div>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Pelaksanaan</span>
                <p className="font-bold text-slate-800">{formatDate(data.header.workDate)}</p>
                <p className="text-[11px] text-slate-500">
                  {formatTimeOnly(data.header.plannedStartAt)} s.d. {formatTimeOnly(data.header.plannedEndAt)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pemohon (Requester)</span>
                <p className="font-bold text-slate-800">{data.header.requesterName}</p>
                <p className="text-[11px] text-slate-500">
                  {data.header.requesterDepartment || 'Central Services'} {data.header.requesterSn ? `(${data.header.requesterSn})` : ''}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Aktivitas</span>
                <p className="font-bold text-slate-800">{data.lineItems.length} Item Tugas</p>
                <p className="text-[11px] text-slate-500">
                  {data.lineItems.reduce((acc, i) => acc + (i.plannedPoints || 0), 0)} Total Poin
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Validasi Digital</span>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <ShieldCheck className="size-4" />
                  <span>{isApproved ? 'Tervalidasi Sah' : 'Menunggu Approval'}</span>
                </div>
                <p className="text-[10px] text-slate-400">QR Code Verification Active</p>
              </div>
            </div>

            {/* Request Notes if any */}
            {data.header.requestNotes && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-xs text-slate-700 space-y-0.5">
                <span className="font-bold text-blue-900 text-[11px]">Catatan / Instruksi Lembur:</span>
                <p className="text-slate-600 leading-relaxed">{data.header.requestNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── TABS NAVIGATION BAR ── */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'photos'
                ? 'bg-[#003f78] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Camera className="size-3.5" />
            Galeri Bukti Foto ({data.evidencePhotos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'activities'
                ? 'bg-[#003f78] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Layers className="size-3.5" />
            Rincian Tugas ({data.lineItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workers'
                ? 'bg-[#003f78] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Users className="size-3.5" />
            Daftar Pekerja ({data.participants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'approvals'
                ? 'bg-[#003f78] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <FileCheck className="size-3.5" />
            Persetujuan & TTD ({data.approvals.length})
          </button>
        </div>

        {/* ── TAB 1: GALERI FOTO BUKTI LEMBUR ── */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {data.evidencePhotos.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
                <div className="size-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Camera className="size-6" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">Belum Ada Foto Bukti Terlampir</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Seluruh lampiran foto bukti pekerjaan lembur yang diunggah saat input form SPL akan tampil otomatis di galeri ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.evidencePhotos.map((photo, pIdx) => {
                  return (
                    <div
                      key={photo.id}
                      onClick={() => openLightbox(photo)}
                      className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all hover:border-blue-300 flex flex-col"
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center">
                        <img
                          src={photo.photoUrl}
                          alt={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <Maximize2 className="size-3.5" /> Klik untuk perbesar
                          </span>
                        </div>
                        <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
                          #{pIdx + 1}
                        </span>
                      </div>

                      {/* Photo Metadata Details */}
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          {photo.subtitle && (
                            <span className="text-[10px] font-bold text-[#003f78] uppercase tracking-wider block">
                              {photo.subtitle}
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                            {photo.title}
                          </h4>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          {photo.unitNumber && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <Tag className="size-3 text-slate-400" />
                              <span>Unit: <strong>{photo.unitNumber}</strong></span>
                            </div>
                          )}
                          {photo.tireCount != null && Number(photo.tireCount) > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <Disc className="size-3 text-slate-400" />
                              <span>Jumlah Pcs / Qty: <strong>{photo.tireCount}</strong></span>
                            </div>
                          )}
                          {photo.materialUsed && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <Wrench className="size-3 text-slate-400" />
                              <span>Mat: <strong>{photo.materialUsed}</strong></span>
                            </div>
                          )}
                          {photo.timeRange && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <Clock className="size-3 text-slate-400" />
                              <span>{photo.timeRange}</span>
                            </div>
                          )}
                          {photo.remark && (
                            <p className="text-[11px] text-slate-500 italic line-clamp-2 pt-0.5">
                              &ldquo;{photo.remark}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: RINCIAN TUGAS / LINE ITEMS ── */}
        {activeTab === 'activities' && (
          <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
            <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                SELECTED LIBRARY CHECKLIST ({data.lineItems.length} Aktivitas)
              </h3>
              <Badge variant="outline" className="text-xs font-semibold bg-white">
                Total {data.lineItems.reduce((acc, i) => acc + (i.plannedPoints || 0), 0)} Poin
              </Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {data.lineItems.map((item, idx) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <span className="size-7 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.code && (
                          <span className="font-mono text-xs font-black text-[#003f78] bg-[#eaf4fb] px-2 py-0.5 rounded-md">
                            {item.code}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-slate-900">{item.name || item.lineLabel}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                        {item.unitNumber && <span>Unit: <strong className="text-slate-700">{item.unitNumber}</strong></span>}
                        {item.tireCount != null && Number(item.tireCount) > 0 && <span>Tire: <strong className="text-slate-700">{item.tireCount}</strong></span>}
                        {item.materialUsed && <span>Material: <strong className="text-slate-700">{item.materialUsed}</strong></span>}
                        {item.startTime && item.endTime && (
                          <span>Waktu: <strong className="text-slate-700">{item.startTime} - {item.endTime}</strong></span>
                        )}
                        <span>Target: <strong className="text-slate-700">{item.targetUnit || '1 Job'}</strong></span>
                      </div>

                      {item.remark && (
                        <p className="text-[11px] text-slate-500 italic pt-0.5">
                          Catatan: &ldquo;{item.remark}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {item.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const matched = data.evidencePhotos.find((p) => p.photoUrl === item.photoUrl)
                          if (matched) openLightbox(matched)
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#003f78] hover:underline bg-[#eaf4fb] px-2.5 py-1.5 rounded-lg transition"
                      >
                        <Camera className="size-3.5" />
                        <span>Lihat Foto</span>
                      </button>
                    )}
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold px-2.5 py-1">
                      {item.plannedPoints || 10} Pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: DAFTAR PEKERJA ── */}
        {activeTab === 'workers' && (
          <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
            <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                DAFTAR PESERTA LEMBUR ({data.participants.length} Orang)
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.participants.map((p, idx) => (
                <div key={p.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="size-7 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.employeeName}</h4>
                      <p className="text-[11px] text-slate-400">
                        {p.department || 'Serviceman / Teknisi'} {p.employeeSn ? `• SN: ${p.employeeSn}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      Shift {p.shiftCode} ({p.rosterType})
                    </Badge>
                    <Badge className="bg-blue-50 text-[#003f78] border-0 text-[10px] font-bold capitalize">
                      {p.category.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: PERSETUJUAN & TTD ── */}
        {activeTab === 'approvals' && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                MATRIKS PERSETUJUAN & TANDA TANGAN ELEKTRONIK
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Riwayat penandatanganan digital berjenjang untuk dokumen Surat Perintah Lembur #{data.header.splNumber}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.approvals.map((step) => {
                const isStepApproved =
                  step.status.toLowerCase() === 'approved' ||
                  step.status.toLowerCase() === 'signed' ||
                  Boolean(step.signatureDataUrl)

                return (
                  <div
                    key={step.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 ${
                      isStepApproved
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Tahap #{step.stepOrder} • {step.stepLabel}
                      </span>
                      <Badge
                        className={`text-[10px] font-bold border-0 ${
                          isStepApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isStepApproved ? 'APPROVED' : step.status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Signature Box */}
                    <div className="h-20 w-full rounded-lg border border-dashed border-slate-200 bg-white flex items-center justify-center p-2">
                      {step.signatureDataUrl ? (
                        <img
                          src={resolveUploadUrl(step.signatureDataUrl)}
                          alt={`TTD ${step.approverName}`}
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : isStepApproved ? (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Digitally Approved
                        </span>
                      ) : (
                        <span className="text-[10px] italic text-slate-400">Belum Ditandatangani</span>
                      )}
                    </div>

                    <div className="border-t border-slate-200/60 pt-2 space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{step.approverName}</p>
                      <p className="text-[10px] text-slate-400">
                        {step.signedAt ? `Ditandatangani: ${formatDateTime(step.signedAt)}` : 'Menunggu persetujuan'}
                      </p>
                      {step.remarks && (
                        <p className="text-[10px] text-slate-500 italic pt-1">
                          Catatan: &ldquo;{step.remarks}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── INTERACTIVE LIGHTBOX DIALOG ── */}
      <Dialog open={Boolean(selectedPhoto)} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-slate-950/95 border-slate-800 text-white shadow-2xl flex flex-col rounded-2xl">
          {/* Header Lightbox */}
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <DialogTitle className="text-sm font-bold text-white truncate">
                {selectedPhoto?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5 truncate">
                {selectedPhoto?.subtitle || data.header.splNumber} • {data.header.siteName}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Perbesar"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Perkecil"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Putar Foto"
              >
                <RotateCw className="size-4" />
              </button>
              <a
                href={selectedPhoto?.photoUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Buka / Unduh Asli"
              >
                <Download className="size-4" />
              </a>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/80 text-rose-300 transition ml-2"
                title="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Image Display Area */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[360px] max-h-[65vh] bg-black/40">
            {selectedPhoto && (
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.title}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>

          {/* Footer Metadata */}
          {selectedPhoto && (
            <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {selectedPhoto.unitNumber && (
                  <span className="bg-slate-800 px-2 py-1 rounded-md">
                    Unit: <strong>{selectedPhoto.unitNumber}</strong>
                  </span>
                )}
                {selectedPhoto.tireCount != null && (
                  <span className="bg-slate-800 px-2 py-1 rounded-md">
                    Jumlah Pcs / Qty: <strong>{selectedPhoto.tireCount}</strong>
                  </span>
                )}
                {selectedPhoto.materialUsed && (
                  <span className="bg-slate-800 px-2 py-1 rounded-md">
                    Material: <strong>{selectedPhoto.materialUsed}</strong>
                  </span>
                )}
                {selectedPhoto.timeRange && (
                  <span className="bg-slate-800 px-2 py-1 rounded-md">
                    Waktu: <strong>{selectedPhoto.timeRange}</strong>
                  </span>
                )}
              </div>
              {selectedPhoto.remark && (
                <p className="text-[11px] text-slate-400 italic">
                  &ldquo;{selectedPhoto.remark}&rdquo;
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
