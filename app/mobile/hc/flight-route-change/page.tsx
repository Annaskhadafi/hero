'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Printer,
  RefreshCw,
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
  siteName: string
  originLocation: string
  requestDate: string
  pohLocation: string
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
  roleLabel: string
  approverTitle: string
  approverName: string
  status: string
  remarks: string
  signedAt: Date | string | null
}

type DetailsData = FlightRouteRequest & {
  items: FlightRouteItem[]
  approvals: FlightRouteApproval[]
}

export default function MobileFlightRouteChangePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [requests, setRequests] = useState<FlightRouteRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('all')

  // Form sheet
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [originLocation, setOriginLocation] = useState('Jambi')
  const [pohLocation, setPohLocation] = useState('Balikpapan')
  const [clauseAccepted, setClauseAccepted] = useState(true)
  const [items, setItems] = useState<FlightRouteItem[]>([
    { flightDate: new Date().toISOString().slice(0, 10), flightRoute: 'Padang - Makassar', remark: 'Offsite/ FB' },
    { flightDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), flightRoute: 'Makassar - Padang', remark: 'Onsite' },
  ])

  // Review sheet
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<DetailsData | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')

  const loadData = () => {
    startTransition(async () => {
      const res = await getFlightRouteChangeListAction({ status: statusFilter })
      if (res.ok && res.data) {
        setRequests(res.data as FlightRouteRequest[])
      } else {
        toast.error(res.error || 'Gagal memuat permohonan.')
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadDetails = async (id: number) => {
    setSelectedId(id)
    setDetailsLoading(true)
    const res = await getFlightRouteChangeDetailsAction(id)
    setDetailsLoading(false)
    if (res.ok && res.data) {
      setDetails(res.data as DetailsData)
    } else {
      toast.error(res.error || 'Gagal memuat detail.')
    }
  }

  const handleCreateSubmit = async () => {
    if (items.some((it) => !it.flightRoute.trim())) {
      toast.error('Isi semua rute penerbangan.')
      return
    }
    if (!clauseAccepted) {
      toast.error('Setujui surat pernyataan potong gaji selisih POH.')
      return
    }

    startTransition(async () => {
      const res = await createFlightRouteChangeAction({
        originLocation,
        pohLocation,
        clauseAccepted,
        items,
      })

      if (res.ok) {
        toast.success(`Surat Permohonan (${res.requestNumber}) berhasil diajukan!`)
        setCreateSheetOpen(false)
        loadData()
      } else {
        toast.error(res.error || 'Gagal mengajukan permohonan.')
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
        toast.success(`Approval Step ${stepOrder} berhasil!`)
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
      toast.error('Isi catatan penolakan.')
      return
    }
    startTransition(async () => {
      const res = await rejectFlightRouteChangeAction({
        requestId: selectedId,
        stepOrder,
        remarks: approvalNotes,
      })
      if (res.ok) {
        toast.success('Permohonan ditolak.')
        setApprovalNotes('')
        loadDetails(selectedId)
        loadData()
      } else {
        toast.error(res.error || 'Gagal menolak permohonan.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Mobile Top App Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="font-bold text-sm text-foreground">Perubahan Rute Penerbangan</h1>
            <p className="text-[10px] text-muted-foreground">Human Capital — 5-Step Approval</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={loadData} disabled={isPending} className="size-8">
          <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-3 bg-white border-b border-slate-100">
        {[
          { key: 'all', label: 'Semua' },
          { key: 'in_progress', label: 'Proses' },
          { key: 'approved', label: 'Disetujui' },
          { key: 'rejected', label: 'Ditolak' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
              statusFilter === tab.key
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Request Cards List */}
      <div className="p-3 space-y-3">
        {requests.length > 0 ? (
          requests.map((r) => (
            <div
              key={r.id}
              onClick={() => loadDetails(r.id)}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm active:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-xs text-sky-700">{r.requestNumber}</span>
                <Badge
                  variant={
                    r.status === 'approved'
                      ? 'default'
                      : r.status === 'rejected'
                      ? 'destructive'
                      : 'outline'
                  }
                  className="text-[10px]"
                >
                  {r.status === 'approved'
                    ? 'Disetujui'
                    : r.status === 'rejected'
                    ? 'Ditolak'
                    : `Step ${r.currentStepOrder}/5`}
                </Badge>
              </div>

              <div className="pt-2 text-xs space-y-1">
                <div className="font-semibold text-slate-800">{r.requestorName}</div>
                <div className="text-muted-foreground text-[11px]">
                  {r.sectionName} — {r.siteName}
                </div>
                <div className="text-muted-foreground text-[11px] flex justify-between pt-1">
                  <span>Asal: {r.originLocation}</span>
                  <span>{r.requestDate}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground">
            {isPending ? 'Memuat permohonan...' : 'Belum ada permohonan.'}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setCreateSheetOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex size-12 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="size-6" />
      </button>

      {/* Create Form Sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm">Pengajuan Perubahan Rute Penerbangan</SheetTitle>
            <SheetDescription className="text-xs">
              Isi rute penerbangan dan pernyataan potong gaji selisih POH.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Kota Asal Surat</Label>
                <Input value={originLocation} onChange={(e) => setOriginLocation(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[11px]">Tujuan POH</Label>
                <Input value={pohLocation} onChange={(e) => setPohLocation(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            {/* Rute Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Detail Rute Penerbangan</Label>
                <Button size="sm" variant="outline" onClick={() => setItems([...items, { flightDate: new Date().toISOString().slice(0, 10), flightRoute: '', remark: 'Onsite' }])} className="h-7 text-[10px]">
                  + Tambah Rute
                </Button>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="rounded-lg border p-2 text-xs space-y-1.5 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px]">Rute #{idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-rose-600 text-[10px]">
                        Hapus
                      </button>
                    )}
                  </div>
                  <Input type="date" value={it.flightDate} onChange={(e) => { const n = [...items]; n[idx].flightDate = e.target.value; setItems(n) }} className="h-7 text-xs" />
                  <Input placeholder="Rute (e.g. Padang - Makassar)" value={it.flightRoute} onChange={(e) => { const n = [...items]; n[idx].flightRoute = e.target.value; setItems(n) }} className="h-7 text-xs" />
                  <Input placeholder="Keterangan (Offsite/ FB, Onsite)" value={it.remark} onChange={(e) => { const n = [...items]; n[idx].remark = e.target.value; setItems(n) }} className="h-7 text-xs" />
                </div>
              ))}
            </div>

            {/* Statement Box */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-950 space-y-1.5">
              <p className="font-semibold">Pernyataan Potong Gaji POH:</p>
              <p className="italic leading-tight text-[10px]">
                "Adapun jika ada selisih harga tiket penerbangan yang saya ajukan tersebut, saya bersedia menjadi tanggungan pribadi yang akan di potong melalui gaji dikarenakan rute tersebut merupakan diluar tujuan POH yaitu di {pohLocation}."
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="m-clause" checked={clauseAccepted} onChange={(e) => setClauseAccepted(e.target.checked)} />
                <label htmlFor="m-clause" className="font-bold text-[11px]">Saya menyetujui ketentuan pemotongan gaji</label>
              </div>
            </div>

            <Button onClick={handleCreateSubmit} disabled={isPending} className="w-full bg-sky-600 text-white">
              Kirim Surat Permohonan
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Review Sheet */}
      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm">Detail & Approval Surat</SheetTitle>
            <SheetDescription className="text-xs">
              {details?.requestNumber} — {details?.status.toUpperCase()}
            </SheetDescription>
          </SheetHeader>

          {detailsLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Memuat detail...</div>
          ) : details ? (
            <div className="space-y-4 py-3 text-xs">
              {/* Info Box */}
              <div className="rounded-lg border p-3 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900">{details.requestorName} ({details.employeeSn})</div>
                <div className="text-[11px] text-slate-600">{details.jobTitle} — {details.sectionName} ({details.siteName})</div>
                <div className="text-[11px] text-slate-500 pt-1">POH: {details.pohLocation} | Date: {details.requestDate}</div>
              </div>

              {/* Rute Items */}
              <div>
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Rute Penerbangan</h4>
                <div className="space-y-1.5">
                  {details.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-md border p-2 bg-white">
                      <div>
                        <div className="font-bold text-sky-800">#{idx + 1} {it.flightRoute}</div>
                        <div className="text-[10px] text-slate-500">{it.remark}</div>
                      </div>
                      <div className="text-right text-[11px] text-slate-600">{it.flightDate}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5-Step Status */}
              <div>
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Progress 5 Approval Step</h4>
                <div className="space-y-1.5">
                  {details.approvals.map((step) => (
                    <div key={step.id} className="flex items-center justify-between rounded-md border p-2 bg-white text-[11px]">
                      <div>
                        <div className="font-semibold">Step {step.stepOrder}: {step.roleLabel}</div>
                        <div className="text-[10px] text-slate-500">{step.approverName || step.approverTitle}</div>
                      </div>
                      <Badge variant={step.status === 'approved' ? 'default' : step.status === 'rejected' ? 'destructive' : 'outline'} className="text-[9px]">
                        {step.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Actions */}
              {details.status === 'in_progress' && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                  <div className="font-bold text-[11px] text-amber-950">Aksi Approval Step {details.currentStepOrder}/5</div>
                  <Textarea placeholder="Catatan approval / revisi..." value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={2} className="text-xs bg-white" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApproveStep(details.currentStepOrder)} disabled={isPending} className="flex-1 bg-emerald-600 text-white text-xs">
                      Setujui Step {details.currentStepOrder}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRejectStep(details.currentStepOrder)} disabled={isPending} className="text-xs">
                      Tolak
                    </Button>
                  </div>
                </div>
              )}

              <a href={`/api/hc/flight-route-change/${details.id}/pdf`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full gap-2 text-xs mt-2">
                  <Printer className="size-4" />
                  Cetak PDF Dokumen Resmi
                </Button>
              </a>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
