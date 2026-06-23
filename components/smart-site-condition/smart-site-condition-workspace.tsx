'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconSparkles, IconTemplate, IconMapPin, IconFileText } from '@tabler/icons-react'
import {
  bootstrapSmartSiteConditionReport,
  createSmartSiteConditionTemplate,
  createSmartSiteConditionVisit,
} from '@/app/actions/smart-site-condition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type WorkspaceProps = {
  stats: {
    totalVisits: number
    readyVisits: number
    totalReports: number
    totalTemplates: number
  }
  visits: Array<{
    id: number
    locationName: string
    inspectedAt: Date
    status: string
    weather: string
    siteName: string
    creatorName: string
  }>
  reports: Array<{
    id: number
    visitId: number
    status: string
    aiModel: string
    updatedAt: Date
  }>
  templates: Array<{
    id: number
    name: string
    isShared: boolean
    updatedAt: Date
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

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  const variant =
    normalized === 'approved'
      ? 'default'
      : normalized === 'submitted'
        ? 'secondary'
        : normalized === 'ready'
          ? 'secondary'
          : 'outline'

  return <Badge variant={variant}>{value}</Badge>
}

export function SmartSiteConditionWorkspace(props: WorkspaceProps) {
  const router = useRouter()
  const [visitOpen, setVisitOpen] = React.useState(false)
  const [templateOpen, setTemplateOpen] = React.useState(false)
  const [busyVisitId, setBusyVisitId] = React.useState<number | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const handleVisitSubmit = React.useCallback(
    async (formData: FormData) => {
      startTransition(async () => {
        await createSmartSiteConditionVisit(formData)
        setVisitOpen(false)
        router.refresh()
      })
    },
    [router]
  )

  const handleTemplateSubmit = React.useCallback(
    async (formData: FormData) => {
      startTransition(async () => {
        await createSmartSiteConditionTemplate(formData)
        setTemplateOpen(false)
        router.refresh()
      })
    },
    [router]
  )

  const handleBootstrapReport = React.useCallback(
    (visitId: number) => {
      setBusyVisitId(visitId)
      startTransition(async () => {
        try {
          await bootstrapSmartSiteConditionReport(visitId)
          router.refresh()
        } finally {
          setBusyVisitId(null)
        }
      })
    },
    [router]
  )

  const scorecards = [
    {
      label: 'Total Visit',
      value: props.stats.totalVisits,
      description: 'Visit site condition milik user aktif',
      icon: <IconMapPin className="size-4" />,
      tone: 'default' as const,
    },
    {
      label: 'Ready / Submitted',
      value: props.stats.readyVisits,
      description: 'Visit yang sudah siap jadi report / approval',
      icon: <IconSparkles className="size-4" />,
      tone: 'info' as const,
    },
    {
      label: 'Draft Report',
      value: props.stats.totalReports,
      description: 'Report yang sudah dibootstrap di tahap awal',
      icon: <IconFileText className="size-4" />,
      tone: 'success' as const,
    },
    {
      label: 'Template',
      value: props.stats.totalTemplates,
      description: 'Template matrix milik user',
      icon: <IconTemplate className="size-4" />,
      tone: 'warning' as const,
    },
  ]

  return (
    <Tabs defaultValue="visits" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="h-auto rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-2">
          <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
            <DialogTrigger asChild>
              <Button className="h-9">Visit Baru</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat visit Smart Site Condition</DialogTitle>
                <DialogDescription>
                  Tahap skeleton: simpan header visit dulu. Observation, foto, GPS detail menyusul di phase berikutnya.
                </DialogDescription>
              </DialogHeader>
              <form action={handleVisitSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locationName">Nama lokasi</Label>
                  <Input id="locationName" name="locationName" placeholder="Contoh: Tikungan Haul Road KM 3" required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="weather">Cuaca</Label>
                    <Input id="weather" name="weather" placeholder="Cerah / Hujan / Berawan" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shiftLabel">Shift</Label>
                    <Input id="shiftLabel" name="shiftLabel" placeholder="Shift pagi / malam" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gpsLat">GPS Latitude</Label>
                    <Input id="gpsLat" name="gpsLat" placeholder="-1.23456" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gpsLng">GPS Longitude</Label>
                    <Input id="gpsLng" name="gpsLng" placeholder="116.12345" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan awal</Label>
                  <Textarea id="notes" name="notes" placeholder="Ringkasan kondisi lapangan awal" rows={4} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>Simpan visit</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9">Template Baru</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat template matrix</DialogTitle>
                <DialogDescription>
                  Template baru langsung memakai struktur default agar bisa dipakai AI dan dirender ke slide.
                </DialogDescription>
              </DialogHeader>
              <form action={handleTemplateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama template</Label>
                  <Input id="name" name="name" placeholder="Smart Site Matrix - Pit A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea id="description" name="description" placeholder="Tujuan atau gaya analisa template ini" rows={4} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>Simpan template</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TabsContent value="visits" className="space-y-4">
        <MinimalTableShell
          label="Smart Site Condition Visits"
          title="Visits"
          fileName="smart-site-condition-visits"
          searchPlaceholder="Cari lokasi / site / creator"
          scorecards={scorecards}
          showImport={false}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lokasi</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cuaca</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    Belum ada visit Smart Site Condition.
                  </TableCell>
                </TableRow>
              ) : (
                props.visits.map((visit) => (
                  <TableRow
                    key={visit.id}
                    data-filter-status={visit.status}
                    data-filter-site={visit.siteName}
                    data-date-value={new Date(visit.inspectedAt).toISOString()}
                  >
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{visit.locationName}</div>
                      <div className="text-muted-foreground text-xs">{visit.creatorName}</div>
                    </TableCell>
                    <TableCell>{visit.siteName}</TableCell>
                    <TableCell><StatusBadge value={visit.status} /></TableCell>
                    <TableCell>{visit.weather || '-'}</TableCell>
                    <TableCell>{formatDateTime(visit.inspectedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/smart-site-condition/${visit.id}`}>Detail</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending && busyVisitId === visit.id}
                          onClick={() => handleBootstrapReport(visit.id)}
                        >
                          Draft report
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </TabsContent>

      <TabsContent value="reports" className="space-y-4">
        <MinimalTableShell
          label="Smart Site Condition Reports"
          title="Reports"
          fileName="smart-site-condition-reports"
          searchPlaceholder="Cari model / status / visit id"
          showImport={false}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Visit ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Model AI</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    Belum ada report.
                  </TableCell>
                </TableRow>
              ) : (
                props.reports.map((report) => (
                  <TableRow key={report.id} data-filter-status={report.status} data-date-value={new Date(report.updatedAt).toISOString()}>
                    <TableCell>#{report.id}</TableCell>
                    <TableCell>#{report.visitId}</TableCell>
                    <TableCell><StatusBadge value={report.status} /></TableCell>
                    <TableCell>{report.aiModel || '-'}</TableCell>
                    <TableCell>{formatDateTime(report.updatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </TabsContent>

      <TabsContent value="templates" className="space-y-4">
        <MinimalTableShell
          label="Smart Site Condition Templates"
          title="Templates"
          fileName="smart-site-condition-templates"
          searchPlaceholder="Cari nama template"
          showImport={false}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-center">
                    Belum ada template.
                  </TableCell>
                </TableRow>
              ) : (
                props.templates.map((template) => (
                  <TableRow key={template.id} data-date-value={new Date(template.updatedAt).toISOString()}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.isShared ? 'Shared' : 'Private'}</TableCell>
                    <TableCell>{formatDateTime(template.updatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </TabsContent>
    </Tabs>
  )
}
