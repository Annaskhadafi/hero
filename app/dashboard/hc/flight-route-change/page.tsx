'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  MapPin,
  Plane,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  User,
  UserCheck,
  X,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HeroSearchableSelect, HeroKpiCard } from '@/components/templates'
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
  getFlightRouteEmployeesListAction,
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

type ApproverStepForm = {
  stepOrder: number
  stepKey: string
  roleLabel: string
  approverTitle: string
  approverName: string
  approverEmployeeId?: number | null
  approverEmail?: string
}

const DEFAULT_APPROVER_STEPS: ApproverStepForm[] = [
  { stepOrder: 1, stepKey: 'applicant', roleLabel: 'Diajukan Oleh', approverTitle: 'Pemohon', approverName: '', approverEmployeeId: null, approverEmail: '' },
  { stepOrder: 2, stepKey: 'pjo', roleLabel: 'Mengetahui', approverTitle: 'PJO', approverName: 'PJO Leader', approverEmployeeId: null, approverEmail: '' },
  { stepOrder: 3, stepKey: 'supervisor', roleLabel: 'Mengetahui', approverTitle: 'Service Operation SPV', approverName: 'Supervisor', approverEmployeeId: null, approverEmail: '' },
  { stepOrder: 4, stepKey: 'hr_ga_leader', roleLabel: 'Mengetahui', approverTitle: 'HR GA Leader', approverName: 'HR GA Leader', approverEmployeeId: null, approverEmail: '' },
  { stepOrder: 5, stepKey: 'manager', roleLabel: 'Menyetujui', approverTitle: 'Central Services Manager', approverName: 'Central Services Manager', approverEmployeeId: null, approverEmail: '' },
]

export default function FlightRouteChangePage() {
  const [isPending, startTransition] = useTransition()
  const [requests, setRequests] = useState<FlightRouteRequest[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Table sorting state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else {
        setSortField(null)
        setSortDir('asc')
      }
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedRequests = useMemo(() => {
    if (!sortField) return requests
    return [...requests].sort((a, b) => {
      let aVal = (a as any)[sortField] ?? ''
      let bVal = (b as any)[sortField] ?? ''
      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [requests, sortField, sortDir])

  // Master Employees List for Selectors
  const [employeesList, setEmployeesList] = useState<any[]>([])
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')

  // Create Modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [requestorName, setRequestorName] = useState('')
  const [employeeSn, setEmployeeSn] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [sectionName, setSectionName] = useState('Service Operation')
  const [departmentName, setDepartmentName] = useState('Service Operation')
  const [siteName, setSiteName] = useState('CK-KIM')
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10))
  const [originLocation, setOriginLocation] = useState('Jambi')
  const [pohLocation, setPohLocation] = useState('Balikpapan')
  const [recipientInfo, setRecipientInfo] = useState('Human Resources & General Affair PT. Chitra Paratama')
  const [clauseAccepted, setClauseAccepted] = useState(true)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FlightRouteItem[]>([
    { flightDate: new Date().toISOString().slice(0, 10), flightRoute: 'Padang - Makassar', remark: 'Offsite/ FB' },
    { flightDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), flightRoute: 'Makassar - Padang', remark: 'Onsite' },
  ])

  // 5 Step Approver Form state
  const [approverSteps, setApproverSteps] = useState<ApproverStepForm[]>(DEFAULT_APPROVER_STEPS)

  // Details & Approval Drawer state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<DetailsData | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [reviewActiveTab, setReviewActiveTab] = useState<'detail' | 'preview'>('detail')

  // Dedicated PDF Preview Modal state
  const [previewPdfItem, setPreviewPdfItem] = useState<{
    id: number
    requestNumber: string
    requestorName?: string
    status?: string
  } | null>(null)
  const [iframeLoading, setIframeLoading] = useState(true)

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

  // Load employees list when modal opens
  useEffect(() => {
    if (createDialogOpen && employeesList.length === 0) {
      getFlightRouteEmployeesListAction().then((res) => {
        if (res.ok && res.data) {
          setEmployeesList(res.data)
          if (res.actorEmployeeId && !selectedEmpId) {
            const actorEmp = res.data.find((e: any) => e.id === res.actorEmployeeId)
            if (actorEmp) {
              handleSelectApplicant(actorEmp, res.data)
            }
          }
        }
      })
    }
  }, [createDialogOpen])

  const handleSelectApplicant = (emp: any, list = employeesList) => {
    setSelectedEmpId(String(emp.id))
    setRequestorName(emp.name || '')
    setEmployeeSn(emp.employeeSn || '')
    setJobTitle(emp.jobTitle || 'Serviceman')
    setSectionName(emp.sectionName || 'Service Operation')
    setDepartmentName(emp.departmentName || 'Service Operation')
    setSiteName(emp.siteName || 'CK-KIM')
    if (emp.siteName) setOriginLocation(emp.siteName)

    // Sync Step 1 Applicant
    setApproverSteps((prev) => {
      const next = [...prev]
      next[0] = {
        ...next[0],
        approverName: emp.name || '',
        approverTitle: emp.jobTitle || 'Pemohon',
        approverEmployeeId: emp.id,
        approverEmail: emp.email || '',
      }
      // If directManager exists in list, auto-fill Step 3 Supervisor
      if (emp.directManagerId && list.length > 0) {
        const mgr = list.find((e: any) => e.id === emp.directManagerId)
        if (mgr) {
          next[2] = {
            ...next[2],
            approverName: mgr.name || 'Supervisor',
            approverTitle: mgr.jobTitle || 'Service Operation SPV',
            approverEmployeeId: mgr.id,
            approverEmail: mgr.email || '',
          }
        }
      }
      return next
    })
  }

  const handleUpdateStepApprover = (
    stepOrder: number,
    field: 'approverName' | 'approverTitle' | 'employeeId',
    val: any
  ) => {
    setApproverSteps((prev) => {
      const next = [...prev]
      const idx = next.findIndex((s) => s.stepOrder === stepOrder)
      if (idx !== -1) {
        if (field === 'employeeId') {
          const emp = employeesList.find((e: any) => e.id === Number(val))
          if (emp) {
            next[idx] = {
              ...next[idx],
              approverEmployeeId: emp.id,
              approverName: emp.name,
              approverTitle: emp.jobTitle || next[idx].approverTitle,
              approverEmail: emp.email || '',
            }
          }
        } else {
          next[idx] = { ...next[idx], [field]: val }
        }
      }
      return next
    })
  }

  const handleResetApproversToDefault = () => {
    setApproverSteps([
      { stepOrder: 1, stepKey: 'applicant', roleLabel: 'Diajukan Oleh', approverTitle: jobTitle || 'Pemohon', approverName: requestorName || 'Pemohon', approverEmployeeId: selectedEmpId ? Number(selectedEmpId) : null, approverEmail: '' },
      { stepOrder: 2, stepKey: 'pjo', roleLabel: 'Mengetahui', approverTitle: 'PJO', approverName: 'PJO Leader', approverEmployeeId: null, approverEmail: '' },
      { stepOrder: 3, stepKey: 'supervisor', roleLabel: 'Mengetahui', approverTitle: 'Service Operation SPV', approverName: 'Supervisor', approverEmployeeId: null, approverEmail: '' },
      { stepOrder: 4, stepKey: 'hr_ga_leader', roleLabel: 'Mengetahui', approverTitle: 'HR GA Leader', approverName: 'HR GA Leader', approverEmployeeId: null, approverEmail: '' },
      { stepOrder: 5, stepKey: 'manager', roleLabel: 'Menyetujui', approverTitle: 'Central Services Manager', approverName: 'Central Services Manager', approverEmployeeId: null, approverEmail: '' },
    ])
    toast.info('Alur persetujuan dikembalikan ke default 5 langkah standar.')
  }

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

  const handleAddItem = (preset?: { route: string; remark: string }) => {
    setItems([
      ...items,
      {
        flightDate: new Date(Date.now() + items.length * 7 * 86400000).toISOString().slice(0, 10),
        flightRoute: preset?.route || '',
        remark: preset?.remark || (items.length % 2 === 0 ? 'Offsite/ FB' : 'Onsite'),
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.warning('Minimal 1 baris rute penerbangan wajib diisi.')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, key: keyof FlightRouteItem, value: string) => {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    setItems(next)
  }

  // Automatic Immediate PDF Download
  const handleDownloadPdf = (id: number, requestNumber: string) => {
    toast.info('Mengunduh dokumen PDF...', { id: 'pdf-dl' })
    const link = document.createElement('a')
    link.href = `/api/hc/flight-route-change/${id}/pdf?download=1`
    link.download = `Permohonan_Perubahan_Rute_Penerbangan_${requestNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => {
      toast.success('File PDF berhasil diunduh!', { id: 'pdf-dl' })
    }, 600)
  }

  const handleCreateSubmit = async () => {
    if (!requestorName.trim()) {
      toast.error('Nama pemohon wajib diisi.')
      return
    }
    if (items.some((it) => !it.flightRoute.trim())) {
      toast.error('Seluruh rute penerbangan wajib diisi.')
      return
    }
    if (!clauseAccepted) {
      toast.error('Anda wajib menyetujui klausul pemotongan gaji selisih tiket POH.')
      return
    }

    startTransition(async () => {
      const res = await createFlightRouteChangeAction({
        employeeId: selectedEmpId ? Number(selectedEmpId) : undefined,
        employeeSn,
        requestorName,
        jobTitle,
        sectionName,
        departmentName,
        siteName,
        requestDate,
        originLocation,
        pohLocation,
        clauseAccepted,
        notes,
        items,
        approverSteps,
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
        loadData()
      } else {
        toast.error(res.error || 'Gagal menghapus.')
      }
    })
  }

  // Statistics
  const stats = useMemo(() => {
    return {
      total: requests.length,
      inProgress: requests.filter((r) => r.status === 'in_progress').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }
  }, [requests])

  const getStatusBadge = (status: string, currentStep: number) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 font-semibold text-xs py-0.5">
            <CheckCircle2 className="size-3.5" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1 font-semibold text-xs py-0.5">
            <XCircle className="size-3.5" />
            Rejected
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 font-semibold text-xs py-0.5">
            <Clock className="size-3.5" />
            Step {currentStep}/5
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 text-xs py-0.5">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Plane className="size-5 text-sky-600" />
            Permohonan Perubahan Rute Penerbangan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pengajuan izin perubahan rute penerbangan perjalanan Offsite & Onsite karyawan PT Chitra Paratama dengan 5 langkah alur persetujuan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setCreateDialogOpen(true)
            }}
            className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs h-9 shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            Buat Permohonan Baru
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Permohonan"
          value={stats.total}
          description="Seluruh pengajuan rute"
          tone="blue"
          icon={<Plane className="size-5 text-blue-600" />}
        />
        <HeroKpiCard
          title="Dalam Proses (Step 1-5)"
          value={stats.inProgress}
          description="Menunggu tanda tangan approver"
          tone="amber"
          icon={<Clock className="size-5 text-amber-600" />}
        />
        <HeroKpiCard
          title="Disetujui (Approved)"
          value={stats.approved}
          description="Selesai 5 tingkat approval"
          tone="emerald"
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
        />
        <HeroKpiCard
          title="Ditolak (Rejected)"
          value={stats.rejected}
          description="Permohonan dibatalkan"
          tone="rose"
          icon={<XCircle className="size-5 text-rose-600" />}
        />
      </div>

      {/* Filters and Search Toolbar */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari No Surat, Nama, SN, atau Site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
              Cari
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium focus:ring-1 focus:ring-ring"
            >
              <option value="all">Semua Status</option>
              <option value="in_progress">Dalam Proses (Step 1-5)</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="rejected">Ditolak (Rejected)</option>
            </select>

            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              className="h-9 w-9"
              title="Refresh Data"
            >
              <RefreshCw className={`size-3.5 ${isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('requestNumber')}
                    className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                  >
                    <span>No. Permohonan</span>
                    {sortField === 'requestNumber' ? (
                      sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('requestDate')}
                    className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                  >
                    <span>Tanggal Surat</span>
                    {sortField === 'requestDate' ? (
                      sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('requestorName')}
                    className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                  >
                    <span>Pemohon / SN</span>
                    {sortField === 'requestorName' ? (
                      sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('sectionName')}
                    className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                  >
                    <span>Section & Site</span>
                    {sortField === 'sectionName' ? (
                      sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('originLocation')}
                    className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                  >
                    <span>Asal → Tujuan POH</span>
                    {sortField === 'originLocation' ? (
                      sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                  >
                    <span>Status Approval</span>
                    {sortField === 'status' ? (
                      sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/30">
              {sortedRequests.length > 0 ? (
                sortedRequests.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="px-4 py-3 font-semibold text-sky-700">{row.requestNumber}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{row.requestDate}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-medium text-foreground">{row.requestorName}</div>
                      <div className="text-[11px] text-muted-foreground">SN: {row.employeeSn || '-'} • {row.jobTitle}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-medium">{row.sectionName}</div>
                      <div className="text-[11px] text-muted-foreground">{row.siteName}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      <span className="font-semibold text-foreground">{row.originLocation}</span> → {row.pohLocation}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {getStatusBadge(row.status, row.currentStepOrder)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            loadDetails(row.id)
                            setReviewActiveTab('detail')
                          }}
                          className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                          title="Review Permohonan & 5-Step Approval"
                        >
                          <UserCheck className="size-3.5 text-blue-600" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPreviewPdfItem({
                              id: row.id,
                              requestNumber: row.requestNumber,
                              requestorName: row.requestorName,
                              status: row.status,
                            })
                            setIframeLoading(true)
                          }}
                          className="h-8 gap-1.5 text-xs font-semibold cursor-pointer bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 shadow-2xs"
                          title="Pratinjau Dokumen PDF"
                        >
                          <FileText className="size-3.5 text-sky-600" />
                          PDF Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPdf(row.id, row.requestNumber)}
                          className="h-8 size-8 p-0 text-slate-600 hover:text-sky-700 hover:bg-sky-50 border-slate-300"
                          title="Unduh File PDF Otomatis"
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(row.id)}
                          className="h-8 size-8 p-0 text-rose-600 hover:bg-rose-50"
                          title="Hapus Permohonan"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {isPending ? 'Memuat data permohonan...' : 'Belum ada permohonan perubahan rute penerbangan.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Comprehensive Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white border border-slate-200 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                <Plane className="size-5 text-sky-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Formulir Permohonan Perubahan Rute Penerbangan
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Lengkapi seluruh data pemohon, detail rute, klausul pemotongan gaji POH, dan konfigurasi 5 langkah alur persetujuan.
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => setCreateDialogOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Card 1: Data Identitas Pemohon & Surat */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                  <User className="size-4 text-sky-600" />
                  <span>1. Identitas Pemohon & Detail Surat</span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-slate-50">
                  Kop & Identitas Dokumen Resmi
                </Badge>
              </div>

              {/* Employee Selector Dropdown */}
              <div className="bg-sky-50/60 border border-sky-200/70 rounded-lg p-3">
                <Label className="text-xs font-bold text-sky-950 flex items-center gap-1.5 mb-1.5">
                  <User className="size-3.5 text-sky-700" />
                  Pilih Karyawan Pemohon (Otomatis Isi Data)
                </Label>
                <HeroSearchableSelect
                  options={employeesList.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.name} (${emp.employeeSn || '-'}) — ${emp.jobTitle || 'Karyawan'} • ${emp.siteName || '-'}`,
                  }))}
                  value={selectedEmpId}
                  onChange={(val) => {
                    const emp = employeesList.find((e) => String(e.id) === val)
                    if (emp) handleSelectApplicant(emp)
                  }}
                  placeholder="Ketik nama karyawan atau SN untuk memilih..."
                  className="bg-white text-xs"
                />
                <p className="text-[11px] text-sky-800/80 mt-1">
                  Pilih karyawan untuk mengisi otomatis Nama, SN, Jabatan, Section, Departemen, dan Lokasi Kerja.
                </p>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Nama Lengkap Pemohon *</Label>
                  <Input
                    value={requestorName}
                    onChange={(e) => {
                      setRequestorName(e.target.value)
                      // sync step 1
                      setApproverSteps((prev) => {
                        const next = [...prev]
                        next[0] = { ...next[0], approverName: e.target.value }
                        return next
                      })
                    }}
                    placeholder="Nama lengkap pemohon"
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">SN / NIK Karyawan</Label>
                  <Input
                    value={employeeSn}
                    onChange={(e) => setEmployeeSn(e.target.value)}
                    placeholder="e.g. 71261"
                    className="text-xs h-9 mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Jabatan (Job Title)</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => {
                      setJobTitle(e.target.value)
                      setApproverSteps((prev) => {
                        const next = [...prev]
                        next[0] = { ...next[0], approverTitle: e.target.value }
                        return next
                      })
                    }}
                    placeholder="e.g. Service Operation Coordinator"
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Section</Label>
                  <Input
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="e.g. Service Operation Other"
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Departemen</Label>
                  <Input
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="e.g. Service Operation"
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Lokasi Kerja (Site)</Label>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. CK-KIM"
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tanggal Pengajuan Surat</Label>
                  <Input
                    type="date"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Kota / Lokasi Asal Surat</Label>
                  <Input
                    value={originLocation}
                    onChange={(e) => setOriginLocation(e.target.value)}
                    placeholder="e.g. Jambi / Balikpapan"
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tujuan POH (Point of Hire) *</Label>
                  <Input
                    value={pohLocation}
                    onChange={(e) => setPohLocation(e.target.value)}
                    placeholder="e.g. Balikpapan"
                    className="text-xs h-9 mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Kepada Yth (Tujuan Surat)</Label>
                <Input
                  value={recipientInfo}
                  onChange={(e) => setRecipientInfo(e.target.value)}
                  placeholder="e.g. Human Resources & General Affair PT. Chitra Paratama"
                  className="text-xs h-9 mt-1"
                />
              </div>
            </div>

            {/* Card 2: Detail Rute Penerbangan Dinamis */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                  <Plane className="size-4 text-sky-600" />
                  <span>2. Detail Rute Penerbangan Perjalanan</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">Preset Cepat:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddItem({ route: 'Padang - Makassar', remark: 'Offsite/ FB' })}
                    className="h-7 text-[11px] px-2 py-0"
                  >
                    + Padang - Makassar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddItem({ route: 'Makassar - Padang', remark: 'Onsite' })}
                    className="h-7 text-[11px] px-2 py-0"
                  >
                    + Makassar - Padang
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleAddItem()}
                    className="h-7 text-[11px] bg-sky-600 hover:bg-sky-700 text-white gap-1 px-2.5 py-0"
                  >
                    <Plus className="size-3" />
                    Tambah Baris
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-1 text-center">No</div>
                  <div className="col-span-3">Tanggal Penerbangan</div>
                  <div className="col-span-4">Rute Penerbangan</div>
                  <div className="col-span-3">Keterangan</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 p-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="col-span-1 flex items-center sm:justify-center font-bold text-xs text-sky-700">
                      <span className="sm:hidden text-slate-500 mr-2 font-normal">No:</span>
                      #{idx + 1}
                    </div>

                    <div className="col-span-3">
                      <Input
                        type="date"
                        value={item.flightDate}
                        onChange={(e) => handleItemChange(idx, 'flightDate', e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>

                    <div className="col-span-4">
                      <Input
                        placeholder="e.g. Padang - Makassar"
                        value={item.flightRoute}
                        onChange={(e) => handleItemChange(idx, 'flightRoute', e.target.value)}
                        className="text-xs h-8 bg-white font-medium"
                      />
                    </div>

                    <div className="col-span-3">
                      <Input
                        placeholder="Offsite/ FB, Onsite, Cuti..."
                        value={item.remark}
                        onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="size-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                        title="Hapus baris rute"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Matriks Alur Persetujuan (5 Langkah Standar & Kustom) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                    <UserCheck className="size-4 text-emerald-600" />
                    <span>3. Matriks 5 Langkah Alur Persetujuan (Approval Matrix)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Format resmi dokumen mencakup 5 tanda tangan: Pemohon → PJO → SPV → HR GA → Manager.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetApproversToDefault}
                  className="h-7 text-[11px] gap-1 px-2.5 py-0 text-slate-600 hover:text-slate-900 border-slate-300"
                >
                  <RotateCcw className="size-3 text-slate-500" />
                  Reset ke Default Standar
                </Button>
              </div>

              {/* Informational Alert */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Hierarki Default Standar:</strong> Sistem telah mengatur alur persetujuan default sesuai ketentuan surat dinas PT Chitra Paratama. Bila ada pergantian approver atau PJO khusus, Anda dapat memilih karyawan dari dropdown atau menyunting Nama & Jabatan secara langsung di bawah ini.
                </span>
              </div>

              {/* 5 Step Approver Form Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {approverSteps.map((step) => {
                  const isStep1 = step.stepOrder === 1
                  return (
                    <div
                      key={step.stepOrder}
                      className={`rounded-xl border p-3 space-y-2.5 ${
                        isStep1
                          ? 'bg-sky-50/40 border-sky-200'
                          : step.stepOrder === 5
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                            {step.stepOrder}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {step.roleLabel}
                          </span>
                        </div>
                        <Badge
                          variant={isStep1 ? 'default' : step.stepOrder === 5 ? 'secondary' : 'outline'}
                          className={`text-[10px] ${
                            isStep1
                              ? 'bg-sky-600 text-white'
                              : step.stepOrder === 5
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-white text-slate-700'
                          }`}
                        >
                          {isStep1 ? 'Auto-Signed' : `Approver ${step.stepOrder}`}
                        </Badge>
                      </div>

                      {/* Dropdown Employee Selector (Step 2..5) */}
                      {!isStep1 && (
                        <div>
                          <Label className="text-[11px] font-medium text-slate-600">
                            Pilih Karyawan (Opsional - Auto Isi):
                          </Label>
                          <HeroSearchableSelect
                            options={employeesList.map((e) => ({
                              value: String(e.id),
                              label: `${e.name} — ${e.jobTitle || 'Staff'}`,
                            }))}
                            value={step.approverEmployeeId ? String(step.approverEmployeeId) : ''}
                            onChange={(val) => handleUpdateStepApprover(step.stepOrder, 'employeeId', val)}
                            placeholder="Pilih dari master karyawan..."
                            className="bg-white text-xs h-8 mt-1"
                          />
                        </div>
                      )}

                      {/* Manual Name & Title Inputs */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <Label className="text-[11px] font-medium text-slate-600">Nama Approver:</Label>
                          <Input
                            value={step.approverName}
                            onChange={(e) => handleUpdateStepApprover(step.stepOrder, 'approverName', e.target.value)}
                            disabled={isStep1}
                            placeholder="Nama approver"
                            className="text-xs h-8 bg-white mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-medium text-slate-600">Jabatan Approver:</Label>
                          <Input
                            value={step.approverTitle}
                            onChange={(e) => handleUpdateStepApprover(step.stepOrder, 'approverTitle', e.target.value)}
                            disabled={isStep1}
                            placeholder="Jabatan approver"
                            className="text-xs h-8 bg-white mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Card 4: Catatan & Pernyataan Pemotongan Gaji POH */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                <FileText className="size-4 text-sky-600" />
                <span>4. Catatan & Surat Pernyataan Tanggungan Tiket POH</span>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Catatan / Alasan Permohonan Tambahan</Label>
                <Textarea
                  placeholder="e.g. Keluarga berdomisili di Padang selama periode cuti, pengajuan perubahan rute telah dikoordinasikan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs mt-1"
                />
              </div>

              {/* Clause Alert & Mandatory Acceptance */}
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider">
                  <ShieldAlert className="size-4 text-amber-700" />
                  <span>Klausul Pemotongan Gaji Selisih Tiket POH:</span>
                </div>
                <p className="text-xs text-amber-950 italic leading-relaxed bg-white/70 p-3 rounded-lg border border-amber-200/80">
                  "Adapun jika ada selisih harga tiket penerbangan yang saya ajukan tersebut, saya bersedia menjadi tanggungan pribadi yang akan di potong melalui gaji dikarenakan rute tersebut merupakan diluar tujuan POH (Point of Hire) yang seharusnya yaitu di <strong>{pohLocation || 'Balikpapan'}</strong>."
                </p>
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="clause-accept-modal"
                    checked={clauseAccepted}
                    onChange={(e) => setClauseAccepted(e.target.checked)}
                    className="size-4 rounded border-amber-400 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <label htmlFor="clause-accept-modal" className="text-xs font-bold text-amber-950 cursor-pointer">
                    Saya menyetujui ketentuan pemotongan gaji selisih harga tiket di atas secara sadar dan sukarela. *
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="h-9 text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              id="submit-flight-route-btn"
              onClick={handleCreateSubmit}
              disabled={isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Plane className="size-3.5" />
                  Ajukan Permohonan Rute
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review & 5-Step Approval Drawer */}
      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="sm:max-w-2xl md:max-w-3xl overflow-y-auto">
          <SheetHeader className="border-b border-border/50 pb-3">
            <div className="flex items-center justify-between pr-6">
              <div>
                <SheetTitle className="text-base font-bold text-slate-900">
                  Detail & 5-Step Approval Permohonan
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 font-mono">
                  {details?.requestNumber} — Status: {details?.status.toUpperCase()}
                </SheetDescription>
              </div>
              {details && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadPdf(details.id, details.requestNumber)}
                  className="h-8 gap-1.5 text-xs font-medium cursor-pointer text-sky-700 hover:bg-sky-50 border-sky-300"
                  title="Unduh File PDF Resmi Otomatis"
                >
                  <Download className="size-3.5" />
                  Unduh PDF
                </Button>
              )}
            </div>

            {/* Navigation Tabs between Detail & PDF Preview */}
            <div className="flex items-center gap-2 pt-3">
              <Button
                variant={reviewActiveTab === 'detail' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReviewActiveTab('detail')}
                className={`h-8 text-xs font-semibold gap-1.5 cursor-pointer ${
                  reviewActiveTab === 'detail'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="size-3.5" />
                Data & Progress Approval
              </Button>
              <Button
                variant={reviewActiveTab === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReviewActiveTab('preview')}
                className={`h-8 text-xs font-semibold gap-1.5 cursor-pointer ${
                  reviewActiveTab === 'preview'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="size-3.5" />
                Pratinjau Dokumen PDF
              </Button>
            </div>
          </SheetHeader>

          {detailsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <span>Memuat rincian permohonan...</span>
            </div>
          ) : details ? (
            reviewActiveTab === 'preview' ? (
              /* TAB 2: Embedded PDF Preview */
              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                    <FileText className="size-4 text-sky-600" />
                    <span>Pratinjau Dokumen Surat Resmi Permohonan Perubahan Rute</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDownloadPdf(details.id, details.requestNumber)}
                      className="h-7 text-xs font-semibold gap-1 bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                    >
                      <Download className="size-3" />
                      Cetak / Unduh PDF
                    </Button>
                    <a
                      href={`/api/hc/flight-route-change/${details.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button size="sm" variant="outline" className="h-7 text-xs font-medium gap-1 text-slate-600 border-slate-300">
                        <ExternalLink className="size-3" />
                        Tab Baru
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="h-[68vh] rounded-xl border border-slate-300 overflow-hidden shadow-xs bg-slate-100 flex items-center justify-center">
                  <iframe
                    src={`/api/hc/flight-route-change/${details.id}/pdf`}
                    className="w-full h-full border-none bg-white"
                    title={`PDF Preview ${details.requestNumber}`}
                  />
                </div>
              </div>
            ) : (
              /* TAB 1: Data Details & Approval Workflow */
              <div className="space-y-5 py-4 text-xs">
                {/* Requestor Info Box */}
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Data Identitas Pemohon
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Nama:</span>{' '}
                      <strong className="text-foreground">{details.requestorName}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SN:</span>{' '}
                      <strong className="text-foreground">{details.employeeSn || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Section:</span>{' '}
                      <span>{details.sectionName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Site:</span>{' '}
                      <span>{details.siteName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Kota Asal Surat:</span>{' '}
                      <span>{details.originLocation}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tujuan POH:</span>{' '}
                      <strong className="text-sky-700">{details.pohLocation}</strong>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Rute Penerbangan Yang Diajukan
                  </h4>
                  <Table className="text-xs border rounded-md">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Rute Penerbangan</TableHead>
                        <TableHead>Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-bold">{idx + 1}</TableCell>
                          <TableCell>{it.flightDate}</TableCell>
                          <TableCell className="font-semibold text-sky-800">{it.flightRoute}</TableCell>
                          <TableCell>{it.remark}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 5-Step Approval Timeline */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Alur 5-Step Persetujuan Dokumen
                  </h4>
                  <div className="space-y-2">
                    {details.approvals.map((step) => {
                      const isCurrent = details.status === 'in_progress' && details.currentStepOrder === step.stepOrder
                      return (
                        <div
                          key={step.id}
                          className={`rounded-lg border p-3 text-xs transition-all ${
                            isCurrent
                              ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                              : 'border-border/60 bg-card'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">
                                Step {step.stepOrder}: {step.roleLabel} ({step.approverTitle})
                              </span>
                              {isCurrent && (
                                <Badge className="bg-sky-600 text-white text-[10px] animate-pulse">
                                  Menunggu Persetujuan
                                </Badge>
                              )}
                            </div>
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

                {/* Bottom Action Bar */}
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    variant="default"
                    onClick={() => setReviewActiveTab('preview')}
                    className="flex-1 gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs h-9 cursor-pointer"
                  >
                    <FileText className="size-4" />
                    Buka Pratinjau Dokumen PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPdf(details.id, details.requestNumber)}
                    className="gap-1.5 text-xs font-medium h-9 text-slate-700 hover:text-sky-700 border-slate-300"
                  >
                    <Download className="size-3.5" />
                    Cetak / Unduh PDF
                  </Button>
                </div>
              </div>
            )
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Dedicated Fullscreen PDF Preview Modal Dialog */}
      <Dialog open={Boolean(previewPdfItem)} onOpenChange={(open) => !open && setPreviewPdfItem(null)}>
        <DialogContent showCloseButton={false} className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 flex flex-col shadow-2xl">
          {/* Modal Header */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                <FileText className="size-5 text-sky-600" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Pratinjau Dokumen Resmi Permohonan Perubahan Rute Penerbangan
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-mono">
                  {previewPdfItem?.requestNumber} • Pemohon: {previewPdfItem?.requestorName || 'Karyawan'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (previewPdfItem) {
                    handleDownloadPdf(previewPdfItem.id, previewPdfItem.requestNumber)
                  }
                }}
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300"
                title="Unduh File PDF Secara Otomatis"
              >
                <Download className="size-3.5 text-sky-600" />
                <span>Cetak / Unduh PDF</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
              >
                <a
                  href={`/api/hc/flight-route-change/${previewPdfItem?.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-3.5 text-slate-500" />
                  <span>Buka Tab Baru</span>
                </a>
              </Button>

              <button
                onClick={() => setPreviewPdfItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Modal Body - Embedded Print Document */}
          <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 gap-2">
                <RefreshCw className="size-7 animate-spin text-sky-600" />
                <p className="text-xs text-slate-600 font-medium">Memuat pratinjau dokumen surat...</p>
              </div>
            )}
            {previewPdfItem && (
              <iframe
                id="flight-route-pdf-iframe"
                key={previewPdfItem.id}
                src={`/api/hc/flight-route-change/${previewPdfItem.id}/pdf`}
                className="w-full h-full rounded-xl border border-slate-300 shadow-md bg-white"
                onLoad={() => setIframeLoading(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
