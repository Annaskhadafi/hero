'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  approveFlightRouteChangeAction,
  createFlightRouteChangeAction,
  deleteFlightRouteChangeAction,
  getFlightRouteChangeDetailsAction,
  getFlightRouteChangeListAction,
  rejectFlightRouteChangeAction,
} from '@/app/actions/flight-route-change'

type FlightRouteRequest = {
  id: number
  requestNumber: string
  employeeId: number | null
  employeeSn: string
  requestorName: string
  jobTitle: string
  sectionName: string
  departmentName: string
  siteId: number | null
  siteName: string
  originLocation: string
  requestDate: string
  pohLocation: string
  clauseAccepted: boolean
  currentStepOrder: number
  status: string
  rejectionReason: string
  createdAt: Date | string
}

type FlightRouteItem = {
  id?: number
  flightDate: string
  flightRoute: string
  remark: string
}

type FlightRouteApproval = {
  id: number
  stepOrder: number
  stepKey: string
  roleLabel: string
  approverTitle: string
  approverEmployeeId: number | null
  approverName: string
  approverEmail: string
  status: string
  signatureDataUrl: string | null
  remarks: string
  signedAt: Date | string | null
}

type DetailsData = FlightRouteRequest & {
  items: FlightRouteItem[]
  approvals: FlightRouteApproval[]
}

export default function FlightRouteChangePage() {
  const [isPending, startTransition] = useTransition()
  const [requests, setRequests] = useState<FlightRouteRequest[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create Modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [originLocation, setOriginLocation] = useState('Jambi')
  const [pohLocation, setPohLocation] = useState('Balikpapan')
  const [clauseAccepted, setClauseAccepted] = useState(true)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FlightRouteItem[]>([
    { flightDate: new Date().toISOString().slice(0, 10), flightRoute: 'Padang - Makassar', remark: 'Offsite/ FB' },
    { flightDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), flightRoute: 'Makassar - Padang', remark: 'Onsite' },
  ])

  // Details & Approval Drawer state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<DetailsData | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')

  const loadData = () => {
    startTransition(async () => {
      const res = await getFlightRouteChangeListAction({
        status: statusFilter,
        search,
      })
      if (res.ok && res.data) {
        setRequests(res.data as FlightRouteRequest[])
      } else {
        toast.error(res.error || 'Gagal memuat data.')
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const loadDetails = async (id: number) => {
    setSelectedId(id)
    setDetailsLoading(true)
    const res = await getFlightRouteChangeDetailsAction(id)
    setDetailsLoading(false)
    if (res.ok && res.data) {
      setDetails(res.data as DetailsData)
    } else {
      toast.error(res.error || 'Gagal mengambil detail.')
    }
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      { flightDate: new Date().toISOString().slice(0, 10), flightRoute: '', remark: 'Onsite' },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, key: keyof FlightRouteItem, value: string) => {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    setItems(next)
  }

  const handleCreateSubmit = async () => {
    if (items.some((it) => !it.flightRoute.trim())) {
      toast.error('Seluruh rute penerbangan wajib diisi.')
      return
    }
    if (!clauseAccepted) {
      toast.error('Anda wajib menyetujui pernyataan persetujuan pemotongan gaji.')
      return
    }

    startTransition(async () => {
      const res = await createFlightRouteChangeAction({
        originLocation,
        pohLocation,
        clauseAccepted,
        notes,
        items,
      })

      if (res.ok) {
        toast.success(`Surat Permohonan (${res.requestNumber}) berhasil diajukan!`)
        setCreateDialogOpen(false)
        loadData()
      } else {
        toast.error(res.error || 'Gagal membuat permohonan.')
      }
    })
  }

  const handleApproveStep = async (stepOrder: number) => {
    if (!selectedId) return
    startTransition(async () => {
      const res = await approveFlightRouteChangeAction({
        requestId: selectedId,
        stepOrder,
        remarks: approvalNotes || 'Disetujui',
      })
      if (res.ok) {
        toast.success(`Langkah ${stepOrder} berhasil disetujui!`)
        setApprovalNotes('')
        loadDetails(selectedId)
        loadData()
      } else {
        toast.error(res.error || 'Gagal memproses approval.')
      }
    })
  }

  const handleRejectStep = async (stepOrder: number) => {
    if (!selectedId || !approvalNotes.trim()) {
      toast.error('Catatan alasan penolakan wajib diisi.')
      return
    }
    startTransition(async () => {
      const res = await rejectFlightRouteChangeAction({
        requestId: selectedId,
        stepOrder,
        remarks: approvalNotes,
      })
      if (res.ok) {
        toast.success(`Permohonan telah ditolak.`)
        setApprovalNotes('')
        loadDetails(selectedId)
        loadData()
      } else {
        toast.error(res.error || 'Gagal menolak permohonan.')
      }
    })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus permohonan ini?')) return
    startTransition(async () => {
      const res = await deleteFlightRouteChangeAction(id)
      if (res.ok) {
        toast.success('Permohonan berhasil dihapus.')
        if (selectedId === id) setSelectedId(null)
        loadData()
      } else {
        toast.error(res.error || 'Gagal menghapus permohonan.')
      }
    })
  }

  const totalCount = requests.length
  const pendingCount = requests.filter((r) => r.status === 'in_progress').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  const getStatusBadge = (status: string, currentStepOrder: number) => {
    if (status === 'approved') {
      return <Badge className="bg-emerald-600 text-white">Disetujui Penuh</Badge>
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">Ditolak</Badge>
    }
    const stepLabels: Record<number, string> = {
      1: 'Pemohon',
      2: 'PJO Leader',
      3: 'Supervisor SPV',
      4: 'HR GA Leader',
      5: 'Central Services Manager',
    }
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
        Step {currentStepOrder}/5 - {stepLabels[currentStepOrder] || 'Approver'}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Permohonan Perubahan Rute Penerbangan
          </h1>
          <p className="text-sm text-muted-foreground">
            Human Capital & General Affair — Pengajuan & 5-Step Approval Perubahan Rute Penerbangan Perjalanan Dinas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white">
            <Plus className="size-4" />
            Buat Permohonan Baru
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="surface-module-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Permohonan
            </CardTitle>
            <FileText className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Dokumen terdaftar</p>
          </CardContent>
        </Card>

        <Card className="surface-module-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proses Approval
            </CardTitle>
            <Clock className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Menunggu verifikasi 5-step</p>
          </CardContent>
        </Card>

        <Card className="surface-module-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Disetujui Penuh
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Selesai 5/5 approval</p>
          </CardContent>
        </Card>

        <Card className="surface-module-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ditolak
            </CardTitle>
            <XCircle className="size-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Membutuhkan revisi</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Action Toolbar */}
      <Card className="surface-module-card border-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari No. Surat, Nama Pemohon, SN, Site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
              Cari
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="in_progress">Proses Approval</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>
            <Button variant="outline" size="icon" onClick={loadData} disabled={isPending}>
              <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="surface-module-card overflow-hidden border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <tr>
                <th className="px-4 py-3">No. Permohonan</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Pemohon (SN)</th>
                <th className="px-4 py-3">Section / Site</th>
                <th className="px-4 py-3">Lokasi Origin</th>
                <th className="px-4 py-3">Status Approval</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {requests.length > 0 ? (
                requests.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-sky-700">{row.requestNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.requestDate}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.requestorName}</div>
                      <div className="text-xs text-muted-foreground">SN: {row.employeeSn || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.sectionName}</div>
                      <div className="text-xs text-muted-foreground">{row.siteName}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.originLocation}</td>
                    <td className="px-4 py-3">
                      {getStatusBadge(row.status, row.currentStepOrder)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadDetails(row.id)}
                          className="gap-1 text-xs"
                        >
                          <UserCheck className="size-3.5" />
                          Review
                        </Button>
                        <a
                          href={`/api/hc/flight-route-change/${row.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="secondary" className="gap-1 text-xs">
                            <Printer className="size-3.5" />
                            PDF
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(row.id)}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {isPending ? 'Memuat data permohonan...' : 'Belum ada permohonan perubahan rute penerbangan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permohonan Perubahan Rute Penerbangan</DialogTitle>
            <DialogDescription>
              Isi rute penerbangan perjalanan Offsite & Onsite dan persetujuan tanggungan selisih harga tiket POH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Kota / Lokasi Asal Surat</Label>
                <Input
                  value={originLocation}
                  onChange={(e) => setOriginLocation(e.target.value)}
                  placeholder="e.g. Jambi"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Tujuan POH (Point of Hire)</Label>
                <Input
                  value={pohLocation}
                  onChange={(e) => setPohLocation(e.target.value)}
                  placeholder="e.g. Balikpapan"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detail Rute Penerbangan
                </Label>
                <Button size="sm" variant="outline" onClick={handleAddItem} className="gap-1 text-xs">
                  <Plus className="size-3.5" />
                  Tambah Baris Rute
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-md border p-2 bg-muted/20">
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>
                    <Input
                      type="date"
                      value={item.flightDate}
                      onChange={(e) => handleItemChange(idx, 'flightDate', e.target.value)}
                      className="w-36 text-xs"
                    />
                    <Input
                      placeholder="Rute Penerbangan (e.g. Padang - Makassar)"
                      value={item.flightRoute}
                      onChange={(e) => handleItemChange(idx, 'flightRoute', e.target.value)}
                      className="flex-1 text-xs"
                    />
                    <Input
                      placeholder="Keterangan (Offsite/ FB, Onsite)"
                      value={item.remark}
                      onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                      className="w-36 text-xs"
                    />
                    {items.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-600 hover:bg-rose-50 size-8"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-semibold">Catatan / Alasan Tambahan</Label>
              <Textarea
                placeholder="Catatan tambahan permohonan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Clause Checkbox */}
            <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-2">
              <p className="font-semibold">Surat Pernyataan Pemotongan Gaji Selisih Tiket POH:</p>
              <p className="italic leading-relaxed">
                "Adapun jika ada selisih harga tiket penerbangan yang saya ajukan tersebut, saya bersedia menjadi tanggungan pribadi yang akan di potong melalui gaji dikarenakan rute tersebut merupakan diluar tujuan POH (Point of Hire) yang seharusnya yaitu di {pohLocation}."
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="clause-check"
                  checked={clauseAccepted}
                  onChange={(e) => setClauseAccepted(e.target.checked)}
                  className="rounded border-amber-400 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="clause-check" className="font-bold text-amber-950 cursor-pointer">
                  Saya menyetujui ketentuan pemotongan gaji selisih harga tiket di atas.
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isPending} className="bg-sky-600 text-white hover:bg-sky-700">
              Ajukan Permohonan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & 5-Step Approval Drawer */}
      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detail & 5-Step Approval Permohonan</SheetTitle>
            <SheetDescription>
              {details?.requestNumber} — Status: {details?.status.toUpperCase()}
            </SheetDescription>
          </SheetHeader>

          {detailsLoading ? (
            <div className="py-12 text-center text-muted-foreground">Memuat detail permohonan...</div>
          ) : details ? (
            <div className="space-y-6 py-4">
              {/* Applicant Identity Card */}
              <Card className="surface-module-card border-0 p-4 space-y-2 bg-surface-container-low">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="font-semibold text-sm">{details.requestorName}</span>
                  <span className="text-xs text-muted-foreground">SN: {details.employeeSn || '-'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Jabatan:</span> {details.jobTitle}</div>
                  <div><span className="text-muted-foreground">Section:</span> {details.sectionName}</div>
                  <div><span className="text-muted-foreground">Lokasi Kerja:</span> {details.siteName}</div>
                  <div><span className="text-muted-foreground">Tanggal Surat:</span> {details.requestDate}</div>
                </div>
              </Card>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Rute Penerbangan
                </h4>
                <div className="space-y-2">
                  {details.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-md border p-2 text-xs">
                      <div>
                        <span className="font-bold mr-2">#{idx + 1}</span>
                        <span className="font-semibold text-sky-800">{it.flightRoute}</span>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <div>{it.flightDate}</div>
                        <div className="font-medium text-foreground">{it.remark}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5-Step Approval Timeline */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Progress 5-Step Digital Approval
                </h4>
                <div className="space-y-3">
                  {details.approvals.map((step) => {
                    const isCurrentActive = details.status === 'in_progress' && details.currentStepOrder === step.stepOrder
                    return (
                      <div
                        key={step.id}
                        className={`rounded-lg border p-3 text-xs transition-all ${
                          step.status === 'approved'
                            ? 'border-emerald-300 bg-emerald-50/50'
                            : step.status === 'rejected'
                            ? 'border-rose-300 bg-rose-50/50'
                            : isCurrentActive
                            ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20'
                            : 'border-border/40 bg-muted/20 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>
                            Step {step.stepOrder}: {step.roleLabel} ({step.approverTitle})
                          </span>
                          <Badge
                            variant={
                              step.status === 'approved'
                                ? 'default'
                                : step.status === 'rejected'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {step.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-muted-foreground">
                          <span>Approver: {step.approverName || '-'}</span>
                          {step.signedAt && <span>{new Date(step.signedAt).toLocaleDateString('id-ID')}</span>}
                        </div>
                        {step.remarks && (
                          <div className="mt-2 text-muted-foreground italic border-t border-border/20 pt-1">
                            Catatan: "{step.remarks}"
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Approval Actions Panel */}
              {details.status === 'in_progress' && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-4 space-y-3">
                  <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                    Panel Persetujuan (Step {details.currentStepOrder}/5)
                  </h4>
                  <Textarea
                    placeholder="Masukkan catatan persetujuan / revisi penolakan..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={2}
                    className="text-xs bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveStep(details.currentStepOrder)}
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 text-xs"
                    >
                      Setujui Step {details.currentStepOrder}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectStep(details.currentStepOrder)}
                      disabled={isPending}
                      className="text-xs"
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              )}

              {/* PDF Preview Button */}
              <div className="pt-2">
                <a href={`/api/hc/flight-route-change/${details.id}/pdf`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full gap-2">
                    <Printer className="size-4" />
                    Cetak Dokumen Resmi / Print PDF
                  </Button>
                </a>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
