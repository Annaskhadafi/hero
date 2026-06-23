'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  createSmartSiteConditionObservation,
  generateSmartSiteConditionAiDraft,
  uploadSmartSiteConditionPhoto,
} from '@/app/actions/smart-site-condition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type DetailProps = {
  visit: {
    id: number
    locationName: string
    weather: string
    shiftLabel: string
    notes: string
    status: string
    inspectedAt: Date
    gpsLat: number | null
    gpsLng: number | null
    siteName: string
    creatorName: string
  }
  report: {
    id: number
    status: string
    executiveSummary: string
    finalNarrative: string
    aiModel: string
    finalMatrix: Record<string, unknown> | null
  } | null
  observations: Array<{
    id: number
    aspectType: string
    title: string
    score: number
    notes: string
    soilType: string
    tireUsed: string
    gpsLat: number | null
    gpsLng: number | null
    photos: Array<{
      id: number
      photoUrl: string
      displayUrl: string
      photoName: string
      caption: string
      createdAt: Date
    }>
  }>
}

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SmartSiteConditionDetail(props: DetailProps) {
  const router = useRouter()
  const [observationOpen, setObservationOpen] = React.useState(false)
  const [uploadTargetId, setUploadTargetId] = React.useState<number | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const handleObservationSubmit = React.useCallback(
    async (formData: FormData) => {
      startTransition(async () => {
        await createSmartSiteConditionObservation(formData)
        setObservationOpen(false)
        router.refresh()
      })
    },
    [router]
  )

  const handleUploadPhoto = React.useCallback(
    async (formData: FormData) => {
      startTransition(async () => {
        await uploadSmartSiteConditionPhoto(formData)
        setUploadTargetId(null)
        router.refresh()
      })
    },
    [router]
  )

  const handleGenerate = React.useCallback(() => {
    startTransition(async () => {
      await generateSmartSiteConditionAiDraft(props.visit.id)
      router.refresh()
    })
  }, [props.visit.id, router])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-muted-foreground text-sm">
            <Link href="/dashboard/smart-site-condition" className="hover:underline">
              Smart Site Condition
            </Link>{' '}
            / Detail Visit
          </div>
          <h2 className="font-display text-2xl font-semibold">{props.visit.locationName}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{props.visit.siteName}</Badge>
          <Badge variant="outline">{props.visit.status}</Badge>
          <Button
            onClick={handleGenerate}
            disabled={isPending || props.observations.length === 0}
            className="h-9"
          >
            Generate AI Draft
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan visit</CardTitle>
          <CardDescription>Header visit yang akan menjadi konteks utama analisa AI.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div><span className="text-muted-foreground text-sm">Inspector</span><div>{props.visit.creatorName}</div></div>
          <div><span className="text-muted-foreground text-sm">Tanggal</span><div>{formatDateTime(props.visit.inspectedAt)}</div></div>
          <div><span className="text-muted-foreground text-sm">Cuaca</span><div>{props.visit.weather || '-'}</div></div>
          <div><span className="text-muted-foreground text-sm">Shift</span><div>{props.visit.shiftLabel || '-'}</div></div>
          <div className="md:col-span-2"><span className="text-muted-foreground text-sm">Catatan</span><div>{props.visit.notes || '-'}</div></div>
        </CardContent>
      </Card>

      {props.report ? (
        <Card>
          <CardHeader>
            <CardTitle>Draft report</CardTitle>
            <CardDescription>Status report terbaru untuk visit ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Report #{props.report.id}</Badge>
              <Badge variant="secondary">{props.report.status}</Badge>
              <Badge variant="outline">{props.report.aiModel || 'Belum ada model'}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-sm">Executive summary</div>
              <p className="text-sm leading-6">{props.report.executiveSummary || '-'}</p>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-sm">Narasi</div>
              <p className="text-sm leading-6 whitespace-pre-wrap">{props.report.finalNarrative || '-'}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Observations</CardTitle>
            <CardDescription>Input lapangan per titik / kondisi area.</CardDescription>
          </div>
          <Dialog open={observationOpen} onOpenChange={setObservationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9">Tambah observation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Observation baru</DialogTitle>
                <DialogDescription>Tambahkan titik analisa baru untuk visit ini.</DialogDescription>
              </DialogHeader>
              <form action={handleObservationSubmit} className="space-y-4">
                <input type="hidden" name="visitId" value={props.visit.id} />
                <div className="space-y-2">
                  <Label htmlFor="title">Judul</Label>
                  <Input id="title" name="title" placeholder="Contoh: Tikungan sharp area north pit" required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="aspectType">Aspek</Label>
                    <Input id="aspectType" name="aspectType" placeholder="curve / loading / obstacle" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score">Skor</Label>
                    <Input id="score" name="score" type="number" min="1" max="5" defaultValue="3" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="soilType">Tipe tanah</Label>
                    <Input id="soilType" name="soilType" placeholder="Soft / rocky / muddy" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tireUsed">Ban digunakan</Label>
                    <Input id="tireUsed" name="tireUsed" placeholder="27.00R49 / pattern X" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea id="notes" name="notes" rows={4} placeholder="Detail temuan lapangan" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>Simpan observation</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {props.observations.length === 0 ? (
            <div className="text-muted-foreground text-sm">Belum ada observation.</div>
          ) : (
            props.observations.map((observation) => (
              <div key={observation.id} className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{observation.title}</div>
                    <div className="text-muted-foreground text-sm">
                      {observation.aspectType} • score {observation.score} • soil {observation.soilType || '-'} • tire {observation.tireUsed || '-'}
                    </div>
                  </div>
                  <Dialog open={uploadTargetId === observation.id} onOpenChange={(open) => setUploadTargetId(open ? observation.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Upload foto</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload foto observation</DialogTitle>
                        <DialogDescription>Foto akan dipakai sebagai evidence untuk AI draft.</DialogDescription>
                      </DialogHeader>
                      <form action={handleUploadPhoto} className="space-y-4">
                        <input type="hidden" name="observationId" value={observation.id} />
                        <div className="space-y-2">
                          <Label htmlFor={`file-${observation.id}`}>File gambar</Label>
                          <Input id={`file-${observation.id}`} name="file" type="file" accept="image/*" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`caption-${observation.id}`}>Caption</Label>
                          <Textarea id={`caption-${observation.id}`} name="caption" rows={3} placeholder="Keterangan singkat foto" />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isPending}>Simpan foto</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="text-sm leading-6">{observation.notes || '-'}</div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {observation.photos.length === 0 ? (
                    <div className="text-muted-foreground text-sm">Belum ada foto.</div>
                  ) : (
                    observation.photos.map((photo) => (
                      <div key={photo.id} className="overflow-hidden rounded-xl border border-border/70 bg-slate-50">
                        {/* ponytail: use plain img first; upgrade path -> next/image signed proxy component */}
                        <img
                          src={photo.displayUrl}
                          alt={photo.caption || photo.photoName}
                          className="h-40 w-full object-cover"
                        />
                        <div className="space-y-1 p-3">
                          <div className="text-sm font-medium">{photo.photoName}</div>
                          <div className="text-muted-foreground text-xs">{photo.caption || '-'}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
