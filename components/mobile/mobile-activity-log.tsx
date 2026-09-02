'use client'

import { type ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Camera, CheckCircle2, Clock3, FileSignature, ImageIcon, RotateCcw, ZoomIn } from 'lucide-react'

type ActivityLogItem = {
  id: number
  activityCode?: string | null
  activityType?: string | null
  title: string
  unitNumber?: string | null
  sourceMode: string
  status: string
  statusLabel: string
  priority?: string | null
  startTime: string
  endTime: string
  submissionTime: string | null
  submissionCategory?: string | null
  pointsAwarded: number
  penaltyDeducted: number
  equipmentNo?: string | null
  materialUsed?: string | null
  gpsValid?: boolean | null
  photoCount: number
  photos: Array<{
    id: number
    url: string
    caption: string
  }>
  remarks?: string | null
  assignmentId?: number | null
  libraryName?: string | null
  durationLabel: string
  pointsNet: number
  isTeamActivity?: boolean | null
  teamNameList?: string | null
}

type MobileActivityLogProps = {
  activities: ActivityLogItem[]
}

function formatTime(value?: string | null) {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase()

  if (normalized.includes('approved')) {
    return 'border-0 bg-[#dff4e8] text-[#14532d]'
  }

  if (normalized.includes('pending')) {
    return 'border-0 bg-[#fff1cf] text-[#8a5a00]'
  }

  return 'border-0 bg-[#eaf4fb] text-[#003f78]'
}

function DetailField({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-black tracking-[0.12em] text-[#607789] uppercase">{label}</p>
      <div className="mt-1 text-sm font-semibold break-words text-[#082033]">{children}</div>
    </div>
  )
}

export function MobileActivityLog({ activities }: MobileActivityLogProps) {
  const [selected, setSelected] = useState<ActivityLogItem | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<ActivityLogItem['photos'][number] | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(Math.max(activities.length, 1) / pageSize))
  const paginatedActivities = activities.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages, pageSize])

  return (
    <>
      {activities.length > 0 ? (
        <div className="space-y-3">
          {paginatedActivities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setSelected(activity)}
              className="w-full rounded-[1.25rem] bg-white p-4 text-left shadow-[0_14px_32px_rgba(8,32,51,0.08)] transition hover:shadow-[0_18px_36px_rgba(8,32,51,0.12)]"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
                  {activity.photoCount > 0 ? (
                    <Camera className="size-4" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[#082033]">{activity.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-[#486275]">
                        {activity.activityCode ?? '-'} • {activity.sourceMode} •{' '}
                        {activity.unitNumber ?? '-'}
                      </p>
                    </div>
                    <Badge className={statusBadgeClass(activity.statusLabel)}>
                      {activity.statusLabel}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-[#486275]">
                    <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                      <p className="text-[10px] font-black tracking-[0.12em] text-[#486275] uppercase">
                        Waktu
                      </p>
                      <p className="mt-1 text-sm text-[#082033]">
                        {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                      </p>
                    </div>
                    <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                      <p className="text-[10px] font-black tracking-[0.12em] text-[#486275] uppercase">
                        Net Point
                      </p>
                      <p className="mt-1 text-sm text-[#082033]">
                        {activity.pointsNet >= 0 ? '+' : ''}
                        {activity.pointsNet}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#486275]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef6fb] px-3 py-1.5">
                      <Clock3 className="size-3.5" />
                      {activity.durationLabel}
                    </span>
                    {activity.photoCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef6fb] px-3 py-1.5">
                        <Camera className="size-3.5" />
                        {activity.photoCount} foto
                      </span>
                    ) : null}
                    {activity.isTeamActivity ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5">
                        Tim
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="flex items-center justify-between rounded-[1rem] bg-white px-4 py-3 text-xs font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <span>
              {Math.min((page - 1) * pageSize + 1, activities.length)}-
              {Math.min(page * pageSize, activities.length)} / {activities.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-8 rounded-xl px-3 text-[11px] font-black text-[#003f78]"
              >
                Prev
              </Button>
              <span className="text-[11px] font-black tracking-[0.12em] text-[#486275] uppercase">
                Page {page}/{totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="h-8 rounded-xl px-3 text-[11px] font-black text-[#003f78]"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.25rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          Belum ada activity yang disubmit hari ini.
        </div>
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setPreviewPhoto(null)
          }
        }}
      >
        <DialogContent className="grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[1.5rem] p-0 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-10 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center">
          <DialogHeader className="border-b border-[#dbe8f0] px-5 py-4 pr-14 text-left">
            <DialogTitle className="text-lg text-[#064f50]">Detail Activity</DialogTitle>
            <DialogDescription className="line-clamp-2 font-medium text-[#486275]">
              {selected ? selected.title : ''}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <div className="space-y-4">
                <section className="rounded-[1.25rem] bg-[#f3f9fd] p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-white text-[#003f78] ring-1 ring-black/10">
                      {selected.photos.length > 0 ? (
                        <Camera className="size-5" />
                      ) : (
                        <CheckCircle2 className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-black text-[#082033]">
                        {selected.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#607789]">
                        {selected.activityCode ?? '-'} · {selected.sourceMode}
                      </p>
                      <Badge className={`mt-2 ${statusBadgeClass(selected.statusLabel)}`}>
                        {selected.statusLabel}
                      </Badge>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-black tracking-[0.12em] text-[#607789] uppercase">
                        Net Point
                      </p>
                      <p className="mt-1 text-lg font-black text-[#082033] tabular-nums">
                        {selected.pointsNet >= 0 ? '+' : ''}
                        {selected.pointsNet}
                      </p>
                    </div>
                  </div>
                </section>

                <section aria-labelledby="activity-evidence-title">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3
                      id="activity-evidence-title"
                      className="text-xs font-black tracking-[0.12em] text-[#486275] uppercase"
                    >
                      Evidence
                    </h3>
                    <span className="text-xs font-semibold text-[#607789] tabular-nums">
                      {selected.photos.length} foto
                    </span>
                  </div>
                  {selected.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selected.photos.map((photo, index) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
                          className="group relative min-h-40 overflow-hidden rounded-[1rem] bg-[#eef6fb] text-left ring-1 ring-black/10 focus-visible:ring-2 focus-visible:ring-[#0b6bcb] focus-visible:outline-none"
                          aria-label={`Preview evidence ${index + 1}`}
                        >
                          {/* ponytail: native img keeps the authenticated upload proxy compatible; upgrade to a custom Next image loader if optimization becomes necessary. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.caption || `Evidence activity ${index + 1}`}
                            className="h-40 w-full object-cover"
                          />
                          <span className="absolute right-2 bottom-2 flex size-10 items-center justify-center rounded-full bg-[#082033]/80 text-white ring-1 ring-white/30">
                            <ZoomIn className="size-4" />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-24 items-center justify-center gap-2 rounded-[1rem] bg-[#f3f7fa] px-4 text-sm font-semibold text-[#607789] ring-1 ring-black/5">
                      <ImageIcon className="size-5" /> Belum ada foto evidence
                    </div>
                  )}
                </section>

                <section className="rounded-[1.25rem] bg-white p-4 ring-1 ring-[#dbe8f0]">
                  <h3 className="mb-3 text-xs font-black tracking-[0.12em] text-[#486275] uppercase">
                    Informasi Activity
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <DetailField label="Activity Code">{selected.activityCode ?? '-'}</DetailField>
                    <DetailField label="Source">{selected.sourceMode}</DetailField>
                    <DetailField label="Unit">{selected.unitNumber ?? '-'}</DetailField>
                    <DetailField label="Priority">{selected.priority ?? '-'}</DetailField>
                    <DetailField label="Library" className="col-span-2">
                      {selected.libraryName ?? '-'}
                    </DetailField>
                  </div>
                </section>

                {selected.isTeamActivity ? (
                  <section className="rounded-[1.25rem] bg-white p-4 ring-1 ring-[#dbe8f0]">
                    <h3 className="mb-3 text-xs font-black tracking-[0.12em] text-[#486275] uppercase">
                      Aktivitas Bersama Tim
                    </h3>
                    <div className="space-y-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase">
                        Team Activity
                      </span>
                      <DetailField label="Anggota Tim" className="col-span-2">
                        <p className="text-sm font-semibold text-[#082033] leading-relaxed">
                          {selected.teamNameList || '-'}
                        </p>
                      </DetailField>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-[1.25rem] bg-[#fff8e8] p-4 ring-1 ring-[#f4e4bd]">
                  <h3 className="mb-3 text-xs font-black tracking-[0.12em] text-[#8a5a00] uppercase">
                    Waktu & Point
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4 tabular-nums">
                    <DetailField label="Mulai">{formatTime(selected.startTime)}</DetailField>
                    <DetailField label="Selesai">{formatTime(selected.endTime)}</DetailField>
                    <DetailField label="Durasi">{selected.durationLabel}</DetailField>
                    <DetailField label="Point / Penalty">
                      {selected.pointsAwarded} / -{selected.penaltyDeducted}
                    </DetailField>
                  </div>
                </section>

                <section className="rounded-[1.25rem] bg-white p-4 ring-1 ring-[#dbe8f0]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <DetailField label="GPS">
                      {selected.gpsValid === false
                        ? 'Tidak valid'
                        : selected.gpsValid === true
                          ? 'Valid'
                          : '-'}
                    </DetailField>
                    <DetailField label="Kategori Submit">
                      {selected.submissionCategory ?? '-'}
                    </DetailField>
                    {selected.equipmentNo ? (
                      <DetailField label="Equipment">{selected.equipmentNo}</DetailField>
                    ) : null}
                    {selected.materialUsed ? (
                      <DetailField label="Material">{selected.materialUsed}</DetailField>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-[1.25rem] bg-white p-4 ring-1 ring-[#dbe8f0] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black tracking-[0.12em] text-[#486275] uppercase">
                      Status Approval (3 Tahap)
                    </p>
                    <Badge className="border-0 bg-[#eaf4fb] text-[#003f78] text-[9px] font-bold">
                      {selected.statusLabel}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                    <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                      <p className="font-bold text-emerald-800">1. Karyawan</p>
                      <p className="text-emerald-600 text-[9px]">Signed</p>
                    </div>
                    <div className={selected.statusLabel.includes('L2') || selected.statusLabel.toLowerCase().includes('approved') ? "rounded-lg bg-emerald-50 p-2 border border-emerald-100" : "rounded-lg bg-amber-50 p-2 border border-amber-100"}>
                      <p className={selected.statusLabel.includes('L2') || selected.statusLabel.toLowerCase().includes('approved') ? "font-bold text-emerald-800" : "font-bold text-amber-800"}>2. Leader</p>
                      <p className={selected.statusLabel.includes('L2') || selected.statusLabel.toLowerCase().includes('approved') ? "text-emerald-600 text-[9px]" : "text-amber-600 text-[9px]"}>
                        {selected.statusLabel.includes('L1') ? 'Pending' : 'Approved'}
                      </p>
                    </div>
                    <div className={selected.statusLabel.toLowerCase().includes('approved') ? "rounded-lg bg-emerald-50 p-2 border border-emerald-100" : "rounded-lg bg-slate-50 p-2 border border-slate-200"}>
                      <p className={selected.statusLabel.toLowerCase().includes('approved') ? "font-bold text-emerald-800" : "font-bold text-slate-700"}>3. Section Head</p>
                      <p className={selected.statusLabel.toLowerCase().includes('approved') ? "text-emerald-600 text-[9px]" : "text-slate-500 text-[9px]"}>
                        {selected.statusLabel.toLowerCase().includes('approved') ? 'Approved' : 'Waiting'}
                      </p>
                    </div>
                  </div>
                </section>

                {selected.remarks ? (
                  <section className="rounded-[1.25rem] bg-[#f3f9fd] p-4">
                    <p className="text-[10px] font-black tracking-[0.12em] text-[#486275] uppercase">
                      Remarks
                    </p>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-[#082033]">
                      {selected.remarks}
                    </p>
                  </section>
                ) : null}

                <div className="sticky bottom-0 -mx-4 flex flex-col sm:flex-row gap-2 bg-white/95 px-4 pt-2 pb-1 backdrop-blur-sm sm:-mx-5 sm:px-5">
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 flex-1 rounded-xl border-[#003f78]/30 bg-[#eaf4fb] text-[#003f78] font-bold text-xs shadow-xs"
                  >
                    <Link href={`/mobile/activity/document/${selected.id}`}>
                      <FileSignature className="size-4 mr-1.5" /> Buka Laporan Approval
                    </Link>
                  </Button>
                  {['rejected', 'returned', 'reverted'].some((st) => selected.status.toLowerCase().includes(st) || selected.statusLabel.toLowerCase().includes(st)) ? (
                    <Button
                      asChild
                      className="h-11 flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                    >
                      <Link href={`/mobile/activity/document/${selected.id}/approval`}>
                        <RotateCcw className="size-4 mr-1.5" /> Revisi Dokumen Aktivitas
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelected(null)}
                    className="h-11 rounded-xl text-slate-500 font-semibold"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewPhoto)} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent
          className="w-[calc(100vw-1rem)] max-w-3xl gap-3 rounded-[1.25rem] bg-[#071b27] p-3 text-white [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-10 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:text-white"
          showCloseButton={true}
        >
          <DialogHeader className="pr-12 text-left">
            <DialogTitle className="text-base text-white">Preview Evidence</DialogTitle>
            <DialogDescription className="text-white/70">
              {previewPhoto?.caption || 'Foto activity'}
            </DialogDescription>
          </DialogHeader>
          {previewPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewPhoto.url}
              alt={previewPhoto.caption || 'Preview evidence activity'}
              className="max-h-[75dvh] w-full rounded-[0.9rem] bg-black/20 object-contain ring-1 ring-white/15"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
