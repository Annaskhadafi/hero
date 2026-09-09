'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Download,
  FileCheck,
  Image as ImageIcon,
  Layers,
  MapPin,
  Maximize2,
  Share2,
  X,
  ZoomIn,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

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

export function ActivityEvidenceViewer({ data }: { data: EvidenceData }) {
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    label: string
    detail: string
  } | null>(null)
  const [showAllItems, setShowAllItems] = useState(false)

  const workDateObj = new Date(data.header.workDate)
  const formattedDate = workDateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Evidence - ${data.header.sessionCode}`,
          text: `Bukti Foto Aktivitas Harian ${data.header.employeeName} (${data.header.sessionCode})`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link bukti berhasil disalin ke clipboard')
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link bukti berhasil disalin ke clipboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#0f172a] pb-16">
      {/* Top Banner / Navbar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-sm">
              CP
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                  Dokumen Evidence
                </span>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 shrink-0">
                  {data.header.sessionCode}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 truncate">PT Chitra Paratama • Daily Activity & SPL</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9 rounded-full px-3 text-xs gap-1.5"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Bagikan</span>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-3.5 text-xs gap-1.5 shadow-sm"
            >
              <Link prefetch={false} href={`/api/activity-sessions/${data.header.sessionId}/pdf`} target="_blank">
                <Download className="size-3.5" />
                <span>PDF Laporan</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header Information Card */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                  Daily Activity Evidence Gallery
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                  {data.header.employeeName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {data.header.employeeJobTitle || 'Staff'} • {data.header.employeeDepartment || 'Operation'}
                  {data.header.employeeSn ? ` (NRP: ${data.header.employeeSn})` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1 font-semibold">
                  {data.header.status.toUpperCase()}
                </Badge>
                {data.header.shiftCode ? (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs px-3 py-1">
                    Shift {data.header.shiftCode}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50">
            <div className="flex items-start gap-2.5">
              <Calendar className="size-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tanggal</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="size-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Site / Lokasi</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">{data.header.siteName}</p>
                <p className="text-[11px] text-slate-500">{data.header.customerName || 'PT Chitra Paratama'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ImageIcon className="size-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Foto Bukti</p>
                <p className="text-xs sm:text-sm font-semibold text-emerald-600 mt-0.5">
                  {data.evidenceItems.length} Evidence Tersimpan
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FileCheck className="size-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Item Checklist</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                  {data.allItems.filter((i) => i.isChecked).length} dari {data.allItems.length} Selesai
                </p>
              </div>
            </div>
          </CardContent>

          {data.header.summaryRemark ? (
            <div className="px-6 py-3 bg-white border-t border-slate-100 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-semibold text-slate-700 shrink-0">Catatan Session:</span>
              <span className="truncate">{data.header.summaryRemark}</span>
            </div>
          ) : null}
        </Card>

        {/* Evidence Photos Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="size-5 text-slate-700" />
              Semua Foto Bukti Pekerjaan ({data.evidenceItems.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh lampiran foto hasil kerja lapangan yang terhubung ke dokumen PDF ini.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllItems(!showAllItems)}
            className="rounded-full text-xs"
          >
            <Layers className="size-3.5 mr-1.5" />
            {showAllItems ? 'Sembunyikan Semua Checklist' : 'Lihat Ringkasan Checklist'}
          </Button>
        </div>

        {/* Evidence Grid */}
        {data.evidenceItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.evidenceItems.map((item) => (
              <Card
                key={item.id}
                className="group rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
              >
                {/* Photo Thumbnail */}
                <div
                  className="relative aspect-4/3 w-full bg-slate-900 cursor-pointer overflow-hidden"
                  onClick={() =>
                    setSelectedImage({
                      url: item.photoUrl!,
                      label: item.snapshotLabel,
                      detail: `${item.startLabel} - ${item.endLabel} • ${item.unitNumber || 'No Unit'} ${item.remark ? `• ${item.remark}` : ''}`,
                    })
                  }
                >
                  <img
                    src={item.photoUrl!}
                    alt={item.snapshotLabel}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-white">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <ZoomIn className="size-3.5" /> Perbesar Foto
                    </span>
                    <span className="text-[11px] bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md">
                      #{item.itemIndex}
                    </span>
                  </div>
                  <div className="absolute top-2.5 left-2.5">
                    <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] font-bold px-2 py-0.5">
                      Row {item.itemIndex}
                    </Badge>
                  </div>
                </div>

                {/* Card Content & Details */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {item.snapshotGroupName ? (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {item.snapshotGroupName}
                      </p>
                    ) : null}
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {item.snapshotLabel}
                    </h3>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="size-3" /> Jam Kerja
                      </span>
                      <span className="font-semibold text-slate-700">
                        {item.startLabel} - {item.endLabel} ({item.durationLabel})
                      </span>
                    </div>

                    {item.unitNumber ? (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Unit / Alat</span>
                        <span className="font-semibold text-slate-700">{item.unitNumber}</span>
                      </div>
                    ) : null}

                    {item.remark ? (
                      <div className="text-[11px] bg-slate-50 p-2 rounded-lg text-slate-600 border border-slate-100 mt-1">
                        <span className="font-semibold text-slate-700">Ket: </span>
                        {item.remark}
                      </div>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-slate-600 hover:text-slate-900 h-8 rounded-xl justify-center gap-1.5"
                    onClick={() =>
                      setSelectedImage({
                        url: item.photoUrl!,
                        label: item.snapshotLabel,
                        detail: `${item.startLabel} - ${item.endLabel} • ${item.unitNumber || 'No Unit'} ${item.remark ? `• ${item.remark}` : ''}`,
                      })
                    }
                  >
                    <Maximize2 className="size-3.5" />
                    Lihat Ukuran Penuh
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-white">
            <ImageIcon className="size-10 text-slate-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700">Belum Ada Foto Bukti</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tidak ada foto bukti yang diunggah untuk sesi aktivitas ini.
            </p>
          </Card>
        )}

        {/* All Checklist Summary Table (Collapsible) */}
        {showAllItems ? (
          <Card className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold">Seluruh Baris Checklist Aktivitas</CardTitle>
              <CardDescription className="text-xs">
                Rincian seluruh checklist dan aktivitas harian pada sesi ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {data.allItems.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="font-bold text-slate-400 shrink-0 w-6">#{item.itemIndex}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.snapshotLabel}</p>
                        <p className="text-slate-500 text-[11px]">
                          {item.startLabel} - {item.endLabel} • {item.durationLabel}
                          {item.unitNumber ? ` • Unit: ${item.unitNumber}` : ''}
                          {item.remark ? ` • ${item.remark}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {item.photoUrl ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Ada Foto
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Approvals Signatures Status */}
        {data.approvals && data.approvals.length > 0 ? (
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Status Tanda Tangan & Approval Dokumen
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1"
                >
                  <p className="font-bold text-slate-800">{approval.stepLabel}</p>
                  <p className="text-slate-600 font-medium">{approval.approverName}</p>
                  <div className="flex items-center justify-between pt-1">
                    <Badge
                      variant={approval.status === 'approved' ? 'default' : 'outline'}
                      className={`text-[10px] px-2 py-0.5 ${
                        approval.status === 'approved'
                          ? 'bg-emerald-600 text-white'
                          : 'text-amber-600 border-amber-300'
                      }`}
                    >
                      {approval.status.toUpperCase()}
                    </Badge>
                    {approval.signedAt ? (
                      <span className="text-[10px] text-slate-400">
                        {new Date(approval.signedAt).toLocaleDateString('id-ID')}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {/* Lightbox / Fullscreen Image Zoom Modal */}
      {selectedImage ? (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white border-0 size-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="size-5" />
            </Button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.label}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
            <div className="text-center text-white px-4">
              <p className="font-bold text-sm sm:text-base">{selectedImage.label}</p>
              <p className="text-xs text-slate-300 mt-0.5">{selectedImage.detail}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
