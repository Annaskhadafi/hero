'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartHandshake,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  type KerjasamaRsItem,
  type PklStudentItem,
  createKerjasamaRs,
  createPklStudent,
  deleteKerjasamaRs,
  deletePklStudent,
  updateKerjasamaRs,
  updatePklStudent,
} from '@/app/actions/hrga-kerjasama'
import {
  HeroConfirmDialog,
  HeroDataTable,
  HeroDatePicker,
  HeroDetailModal,
  HeroFileUpload,
  HeroFormField,
  HeroFormDialog,
  HeroInput,
  HeroKpiCard,
  HeroSearchableSelect,
  HeroStatusBadge,
  HeroTextarea,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { cn } from '@/lib/utils'

interface KerjasamaClientProps {
  initialRsList: KerjasamaRsItem[]
  initialPklList: PklStudentItem[]
  initialMetrics: {
    rsMetrics: { total: number; active: number; expiringSoon: number; expired: number; noPartnership: number }
    pklMetrics: { total: number; active: number; completed: number; upcoming: number }
    rsLocations: string[]
    pklInstitutions: string[]
  }
  employees: { id: number; name: string; employeeSn: string; department: string | null; section: string | null }[]
  canManage: boolean
}

const RS_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  expiring_soon: 'Segera Berakhir',
  expired: 'Kedaluwarsa',
  no_partnership: 'Belum Ada Kerjasama',
}

const PKL_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif (Berjalan)',
  completed: 'Selesai',
  upcoming: 'Akan Datang',
}

function sortPklList(list: PklStudentItem[]): PklStudentItem[] {
  const getWeight = (status: string) => {
    if (status === 'active') return 1
    if (status === 'upcoming') return 2
    return 3 // Selesai / completed selalu di posisi paling bawah
  }
  return [...list].sort((a, b) => {
    const diff = getWeight(a.status) - getWeight(b.status)
    if (diff !== 0) return diff
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  })
}

export function KerjasamaClient({
  initialRsList,
  initialPklList,
  initialMetrics,
  employees,
  canManage,
}: KerjasamaClientProps) {
  const [activeTab, setActiveTab] = React.useState<'rs' | 'pkl'>('rs')
  const [rsList, setRsList] = React.useState<KerjasamaRsItem[]>(initialRsList)
  const [pklList, setPklList] = React.useState<PklStudentItem[]>(() => sortPklList(initialPklList))
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // ─── RS State & Modals ────────────────────────────────────────────────────────
  const [rsDialogOpen, setRsDialogOpen] = React.useState(false)
  const [rsEditingItem, setRsEditingItem] = React.useState<KerjasamaRsItem | null>(null)
  const [rsDetailItem, setRsDetailItem] = React.useState<KerjasamaRsItem | null>(null)
  const [rsDeletingItem, setRsDeletingItem] = React.useState<KerjasamaRsItem | null>(null)

  // RS Form State
  const [rsForm, setRsForm] = React.useState({
    name: '',
    location: '',
    address: '',
    startDate: '',
    endDate: '',
    status: 'active',
    contactPerson: '',
    contactPhone: '',
    contractDocumentUrl: '',
    contractDocumentName: '',
    notes: '',
  })

  // ─── PKL State & Modals ───────────────────────────────────────────────────────
  const [pklDialogOpen, setPklDialogOpen] = React.useState(false)
  const [pklEditingItem, setPklEditingItem] = React.useState<PklStudentItem | null>(null)
  const [pklDetailItem, setPklDetailItem] = React.useState<PklStudentItem | null>(null)
  const [pklDeletingItem, setPklDeletingItem] = React.useState<PklStudentItem | null>(null)

  // PKL Form State
  const [pklForm, setPklForm] = React.useState({
    name: '',
    institution: '',
    major: '',
    startDate: '',
    endDate: '',
    mentorName: '',
    mentorEmployeeIds: [] as number[],
    status: 'active',
    notes: '',
  })

  // Mentor options
  const mentorSelectOptions = React.useMemo(() => {
    return employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.name} (${emp.employeeSn})`,
      description: emp.department ? `${emp.department}${emp.section ? ` - ${emp.section}` : ''}` : undefined,
    }))
  }, [employees])

  // RS Location Options
  const rsLocationOptions = React.useMemo(() => {
    const locs = Array.from(new Set(rsList.map((r) => r.location).filter(Boolean))).sort()
    return locs.map((loc) => ({ value: loc, label: loc }))
  }, [rsList])

  // PKL Institution Options
  const pklInstitutionOptions = React.useMemo(() => {
    const insts = Array.from(new Set(pklList.map((p) => p.institution).filter(Boolean))).sort()
    return insts.map((inst) => ({ value: inst, label: inst }))
  }, [pklList])

  // KPIs
  const rsKpi = React.useMemo(() => {
    return {
      total: rsList.length,
      active: rsList.filter((r) => r.status === 'active').length,
      expiringSoon: rsList.filter((r) => r.status === 'expiring_soon').length,
      expired: rsList.filter((r) => r.status === 'expired').length,
      noPartnership: rsList.filter((r) => r.status === 'no_partnership').length,
    }
  }, [rsList])

  const pklKpi = React.useMemo(() => {
    return {
      total: pklList.length,
      active: pklList.filter((p) => p.status === 'active').length,
      completed: pklList.filter((p) => p.status === 'completed').length,
      upcoming: pklList.filter((p) => p.status === 'upcoming').length,
    }
  }, [pklList])

  // ─── RS Handlers ─────────────────────────────────────────────────────────────

  const handleOpenRsDialog = (item?: KerjasamaRsItem) => {
    if (item) {
      setRsEditingItem(item)
      setRsForm({
        name: item.name,
        location: item.location,
        address: item.address || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        status: item.status,
        contactPerson: item.contactPerson || '',
        contactPhone: item.contactPhone || '',
        contractDocumentUrl: item.contractDocumentUrl || '',
        contractDocumentName: item.contractDocumentName || '',
        notes: item.notes || '',
      })
    } else {
      setRsEditingItem(null)
      setRsForm({
        name: '',
        location: '',
        address: '',
        startDate: '',
        endDate: '',
        status: 'active',
        contactPerson: '',
        contactPhone: '',
        contractDocumentUrl: '',
        contractDocumentName: '',
        notes: '',
      })
    }
    setRsDialogOpen(true)
  }

  const handleSaveRs = async () => {
    if (!rsForm.name.trim()) {
      toast.error('Nama Rumah Sakit / Klinik wajib diisi')
      return
    }
    if (!rsForm.location.trim()) {
      toast.error('Lokasi kota wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      if (rsEditingItem) {
        const res = await updateKerjasamaRs(rsEditingItem.id, {
          name: rsForm.name,
          location: rsForm.location,
          address: rsForm.address,
          startDate: rsForm.startDate || null,
          endDate: rsForm.endDate || null,
          status: rsForm.status,
          contactPerson: rsForm.contactPerson,
          contactPhone: rsForm.contactPhone,
          contractDocumentUrl: rsForm.contractDocumentUrl || null,
          contractDocumentName: rsForm.contractDocumentName || null,
          notes: rsForm.notes,
        })
        if (res.success && res.data) {
          setRsList((prev) => prev.map((item) => (item.id === rsEditingItem.id ? res.data! : item)))
          toast.success('Data Kerjasama Rumah Sakit berhasil diperbarui')
          setRsDialogOpen(false)
        } else {
          toast.error(res.error || 'Gagal memperbarui data')
        }
      } else {
        const res = await createKerjasamaRs({
          name: rsForm.name,
          location: rsForm.location,
          address: rsForm.address,
          startDate: rsForm.startDate || null,
          endDate: rsForm.endDate || null,
          status: rsForm.status,
          contactPerson: rsForm.contactPerson,
          contactPhone: rsForm.contactPhone,
          contractDocumentUrl: rsForm.contractDocumentUrl || null,
          contractDocumentName: rsForm.contractDocumentName || null,
          notes: rsForm.notes,
        })
        if (res.success && res.data) {
          setRsList((prev) => [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name)))
          toast.success('Data Kerjasama Rumah Sakit berhasil ditambahkan')
          setRsDialogOpen(false)
        } else {
          toast.error(res.error || 'Gagal menambahkan data')
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRs = async () => {
    if (!rsDeletingItem) return
    setIsSubmitting(true)
    try {
      const res = await deleteKerjasamaRs(rsDeletingItem.id)
      if (res.success) {
        setRsList((prev) => prev.filter((item) => item.id !== rsDeletingItem.id))
        toast.success(`Data ${rsDeletingItem.name} berhasil dihapus`)
        setRsDeletingItem(null)
      } else {
        toast.error(res.error || 'Gagal menghapus data')
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── PKL Handlers ────────────────────────────────────────────────────────────

  const handleOpenPklDialog = (item?: PklStudentItem) => {
    if (item) {
      setPklEditingItem(item)
      const mentorParts = item.mentorName.split('/').map((s) => s.trim().toLowerCase())
      const matchedIds = employees
        .filter((emp) =>
          mentorParts.some(
            (part) =>
              emp.name.toLowerCase().includes(part) ||
              part.includes(emp.name.toLowerCase()) ||
              emp.employeeSn.includes(part)
          )
        )
        .map((emp) => emp.id)

      if (item.mentorEmployeeId && !matchedIds.includes(item.mentorEmployeeId)) {
        matchedIds.push(item.mentorEmployeeId)
      }

      setPklForm({
        name: item.name,
        institution: item.institution,
        major: item.major,
        startDate: item.startDate,
        endDate: item.endDate,
        mentorName: item.mentorName,
        mentorEmployeeIds: matchedIds,
        status: item.status,
        notes: item.notes || '',
      })
    } else {
      setPklEditingItem(null)
      setPklForm({
        name: '',
        institution: '',
        major: '',
        startDate: '',
        endDate: '',
        mentorName: '',
        mentorEmployeeIds: [],
        status: 'active',
        notes: '',
      })
    }
    setPklDialogOpen(true)
  }

  const handleSavePkl = async () => {
    if (!pklForm.name.trim()) {
      toast.error('Nama Siswa / Mahasiswa wajib diisi')
      return
    }
    if (!pklForm.institution.trim()) {
      toast.error('Asal Sekolah / Kampus wajib diisi')
      return
    }
    if (!pklForm.major.trim()) {
      toast.error('Jurusan wajib diisi')
      return
    }
    if (!pklForm.startDate || !pklForm.endDate) {
      toast.error('Periode tanggal mulai dan selesai wajib diisi')
      return
    }
    if (!pklForm.mentorName.trim()) {
      toast.error('Pembimbing Industri wajib dipilih')
      return
    }

    setIsSubmitting(true)
    try {
      if (pklEditingItem) {
        const res = await updatePklStudent(pklEditingItem.id, {
          name: pklForm.name,
          institution: pklForm.institution,
          major: pklForm.major,
          startDate: pklForm.startDate,
          endDate: pklForm.endDate,
          mentorName: pklForm.mentorName,
          mentorEmployeeId: pklForm.mentorEmployeeIds[0] || null,
          status: pklForm.status,
          notes: pklForm.notes,
        })
        if (res.success && res.data) {
          setPklList((prev) => sortPklList(prev.map((item) => (item.id === pklEditingItem.id ? res.data! : item))))
          toast.success('Data Siswa PKL berhasil diperbarui')
          setPklDialogOpen(false)
        } else {
          toast.error(res.error || 'Gagal memperbarui data')
        }
      } else {
        const res = await createPklStudent({
          name: pklForm.name,
          institution: pklForm.institution,
          major: pklForm.major,
          startDate: pklForm.startDate,
          endDate: pklForm.endDate,
          mentorName: pklForm.mentorName,
          mentorEmployeeId: pklForm.mentorEmployeeIds[0] || null,
          status: pklForm.status,
          notes: pklForm.notes,
        })
        if (res.success && res.data) {
          setPklList((prev) => sortPklList([res.data!, ...prev]))
          toast.success('Data Siswa PKL berhasil ditambahkan')
          setPklDialogOpen(false)
        } else {
          toast.error(res.error || 'Gagal menambahkan data')
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePkl = async () => {
    if (!pklDeletingItem) return
    setIsSubmitting(true)
    try {
      const res = await deletePklStudent(pklDeletingItem.id)
      if (res.success) {
        setPklList((prev) => prev.filter((item) => item.id !== pklDeletingItem.id))
        toast.success(`Data ${pklDeletingItem.name} berhasil dihapus`)
        setPklDeletingItem(null)
      } else {
        toast.error(res.error || 'Gagal menghapus data')
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Columns Def: Rumah Sakit ────────────────────────────────────────────────

  const rsColumns: HeroColumnDef<KerjasamaRsItem>[] = [
    {
      key: 'index',
      header: 'No',
      width: '50px',
      align: 'center',
      render: (_, idx) => <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>,
    },
    {
      key: 'name',
      header: 'Nama Rumah Sakit / Klinik',
      sortable: true,
      searchable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-foreground hover:underline cursor-pointer" onClick={() => setRsDetailItem(row)}>
            {row.name}
          </span>
          {row.address && <span className="text-xs text-muted-foreground line-clamp-1">{row.address}</span>}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Lokasi',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <MapPin className="size-3.5 text-slate-400 shrink-0" />
          <span>{row.location}</span>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Periode Kontrak',
      render: (row) => {
        if (!row.startDate && !row.endDate) {
          return <span className="text-xs text-muted-foreground italic">-</span>
        }
        return (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">
              {row.startDate ? new Date(row.startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
              {' s/d '}
              {row.endDate ? new Date(row.endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status Kontrak',
      sortable: true,
      align: 'center',
      render: (row) => {
        let badgeTone = 'bg-slate-100 text-slate-800'
        let label = RS_STATUS_LABELS[row.status] || row.status

        if (row.status === 'active') {
          badgeTone = 'bg-emerald-100 text-emerald-900 border-emerald-200'
        } else if (row.status === 'expiring_soon') {
          badgeTone = 'bg-amber-100 text-amber-900 border-amber-200'
        } else if (row.status === 'expired') {
          badgeTone = 'bg-rose-100 text-rose-900 border-rose-200'
        }

        return <Badge className={cn('text-xs font-medium border px-2 py-0.5', badgeTone)}>{label}</Badge>
      },
    },
    {
      key: 'contact',
      header: 'Kontak PIC',
      render: (row) => {
        if (!row.contactPerson && !row.contactPhone) {
          return <span className="text-xs text-muted-foreground italic">-</span>
        }
        return (
          <div className="flex flex-col text-xs">
            {row.contactPerson && <span className="font-medium text-foreground">{row.contactPerson}</span>}
            {row.contactPhone && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="size-3 text-slate-400" /> {row.contactPhone}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'document',
      header: 'PKS / Dokumen',
      align: 'center',
      render: (row) => {
        if (!row.contractDocumentUrl) {
          return <span className="text-xs text-muted-foreground italic">-</span>
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={resolveUploadUrl(row.contractDocumentUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium border border-blue-200 transition-colors"
                >
                  <FileText className="size-3.5" />
                  Lihat Berkas
                </a>
              </TooltipTrigger>
              <TooltipContent>Buka berkas PKS {row.contractDocumentName || row.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      key: 'notes',
      header: 'Keterangan',
      render: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]" title={row.notes}>
          {row.notes || '-'}
        </span>
      ),
    },
  ]

  const rsFilters: HeroTableFilter[] = [
    {
      key: 'location',
      label: 'Lokasi Kota',
      options: [{ value: 'ALL', label: 'Semua Lokasi' }, ...rsLocationOptions],
    },
    {
      key: 'status',
      label: 'Status Kontrak',
      options: [
        { value: 'ALL', label: 'Semua Status' },
        { value: 'active', label: 'Aktif' },
        { value: 'expiring_soon', label: 'Segera Berakhir' },
        { value: 'expired', label: 'Kedaluwarsa' },
        { value: 'no_partnership', label: 'Belum Ada Kerjasama' },
      ],
    },
  ]

  // ─── Columns Def: Siswa PKL ──────────────────────────────────────────────────

  const pklColumns: HeroColumnDef<PklStudentItem>[] = [
    {
      key: 'index',
      header: 'No',
      width: '50px',
      align: 'center',
      render: (_, idx) => <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>,
    },
    {
      key: 'name',
      header: 'Nama Siswa / Mahasiswa',
      sortable: true,
      searchable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-foreground hover:underline cursor-pointer" onClick={() => setPklDetailItem(row)}>
            {row.name}
          </span>
          <span className="text-xs text-muted-foreground">{row.major}</span>
        </div>
      ),
    },
    {
      key: 'institution',
      header: 'Asal Sekolah / Kampus',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
          <GraduationCap className="size-3.5 text-blue-600 shrink-0" />
          <span>{row.institution}</span>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Periode PKL',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">
            {new Date(row.startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            {' s/d '}
            {new Date(row.endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Durasi PKL',
      align: 'center',
      render: (row) => (
        <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200">
          {row.durationDisplay || `${row.durationMonths} Bulan ${row.durationDays} Hari`}
        </Badge>
      ),
    },
    {
      key: 'mentor',
      header: 'Pembimbing Industri',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <User className="size-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-foreground">{row.mentorName}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (row) => {
        let badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-200'
        let label = 'Aktif (Berjalan)'

        if (row.status === 'completed') {
          badgeClass = 'bg-rose-100 text-rose-900 border-rose-200'
          label = 'Selesai'
        } else if (row.status === 'upcoming') {
          badgeClass = 'bg-amber-100 text-amber-900 border-amber-200'
          label = 'Akan Datang'
        }

        return <Badge className={cn('text-xs font-medium border px-2 py-0.5', badgeClass)}>{label}</Badge>
      },
    },
    {
      key: 'notes',
      header: 'Keterangan',
      render: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]" title={row.notes}>
          {row.notes || '-'}
        </span>
      ),
    },
  ]

  const pklFilters: HeroTableFilter[] = [
    {
      key: 'institution',
      label: 'Asal Sekolah / Kampus',
      options: [{ value: 'ALL', label: 'Semua Sekolah' }, ...pklInstitutionOptions],
    },
    {
      key: 'status',
      label: 'Status PKL',
      options: [
        { value: 'ALL', label: 'Semua Status' },
        { value: 'active', label: 'Aktif (Berjalan)' },
        { value: 'completed', label: 'Selesai' },
        { value: 'upcoming', label: 'Akan Datang' },
      ],
    },
  ]

  return (
    <div className="flex-1 w-full space-y-6">
      {/* ─── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <HeartHandshake className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Menu Kerjasama HRGA</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Kemitraan Rumah Sakit & Faskes serta pembinaan Siswa/Mahasiswa PKL & Magang
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {activeTab === 'rs' ? (
              <Button
                size="sm"
                onClick={() => handleOpenRsDialog()}
                className="h-9 gap-1.5 bg-[#0753e7] hover:bg-[#0644bd] text-white shadow-sm"
              >
                <Plus className="size-4" />
                Tambah Rumah Sakit
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleOpenPklDialog()}
                className="h-9 gap-1.5 bg-[#0753e7] hover:bg-[#0644bd] text-white shadow-sm"
              >
                <Plus className="size-4" />
                Tambah Siswa PKL
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Tabs Switcher ────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'rs' | 'pkl')} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border">
          <TabsTrigger value="rs" className="gap-2 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building2 className="size-4 text-blue-600" />
            <span>Kerjasama Rumah Sakit</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 bg-blue-100 text-blue-800">
              {rsList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pkl" className="gap-2 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <GraduationCap className="size-4 text-emerald-600" />
            <span>Siswa PKL & Magang</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800">
              {pklList.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: RUMAH SAKIT ────────────────────────────────────────────── */}
        <TabsContent value="rs" className="space-y-6 mt-0">
          {/* RS KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HeroKpiCard
              title="Total Provider RS / Lab"
              value={rsKpi.total}
              icon={<Building2 className="size-5" />}
              tone="blue"
              description="Tersebar di 7 kota/kabupaten"
            />
            <HeroKpiCard
              title="Kontrak Aktif"
              value={rsKpi.active}
              icon={<CheckCircle2 className="size-5" />}
              tone="emerald"
              description="Masa berlaku PKS valid"
            />
            <HeroKpiCard
              title="Segera Berakhir"
              value={rsKpi.expiringSoon}
              icon={<Clock className="size-5" />}
              tone="amber"
              description="Jatuh tempo < 60 hari"
            />
            <HeroKpiCard
              title="Belum Ada Kerjasama"
              value={rsKpi.noPartnership}
              icon={<HeartHandshake className="size-5" />}
              tone="purple"
              description="Tahap penjajakan / prospek"
            />
          </div>

          {/* RS Data Table */}
          <HeroDataTable
            data={rsList}
            columns={rsColumns}
            idField="id"
            title="Daftar Kerjasama Fasilitas Kesehatan & Rumah Sakit"
            description="Informasi masa berlaku PKS, kontak faskes, serta berkas kontrak"
            searchPlaceholder="Cari nama RS, lokasi kota, atau kontak..."
            searchKeys={['name', 'location', 'contactPerson', 'notes']}
            filters={rsFilters}
            exportFileName="Kerjasama_Rumah_Sakit_HERO"
            pdfTitle="Daftar Kerjasama Rumah Sakit & Faskes PT Chitra Paratama"
            renderRowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => setRsDetailItem(row)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Detail RS</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {canManage && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => handleOpenRsDialog(row)}
                          >
                            <Edit className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Data</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => setRsDeletingItem(row)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Hapus</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            )}
          />
        </TabsContent>

        {/* ─── TAB 2: SISWA PKL ──────────────────────────────────────────────── */}
        <TabsContent value="pkl" className="space-y-6 mt-0">
          {/* PKL KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HeroKpiCard
              title="Total Siswa / Mahasiswa"
              value={pklKpi.total}
              icon={<Users className="size-5" />}
              tone="blue"
              description="Dari 7 instansi pendidikan"
            />
            <HeroKpiCard
              title="Sedang Berjalan (Aktif)"
              value={pklKpi.active}
              icon={<CheckCircle2 className="size-5" />}
              tone="emerald"
              description="Menjalani program PKL di HERO"
            />
            <HeroKpiCard
              title="Telah Selesai"
              value={pklKpi.completed}
              icon={<FileCheck2 className="size-5" />}
              tone="rose"
              description="Periode magang rampung"
            />
            <HeroKpiCard
              title="Akan Datang (Upcoming)"
              value={pklKpi.upcoming}
              icon={<Calendar className="size-5" />}
              tone="cyan"
              description="Menunggu jadwal mulai"
            />
          </div>

          {/* PKL Data Table */}
          <HeroDataTable
            data={pklList}
            columns={pklColumns}
            idField="id"
            title="Daftar Siswa & Mahasiswa Praktik Kerja Lapangan (PKL)"
            description="Monitoring durasi magang, pembimbing industri, dan status penyelesaian"
            searchPlaceholder="Cari siswa, asal sekolah, jurusan, atau pembimbing..."
            searchKeys={['name', 'institution', 'major', 'mentorName', 'notes']}
            filters={pklFilters}
            exportFileName="Data_Siswa_PKL_HERO"
            pdfTitle="Daftar Siswa & Mahasiswa PKL PT Chitra Paratama"
            renderRowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => setPklDetailItem(row)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Detail Siswa</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {canManage && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => handleOpenPklDialog(row)}
                          >
                            <Edit className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Data</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => setPklDeletingItem(row)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Hapus</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: FORM RUMAH SAKIT ────────────────────────────────────────── */}
      <HeroFormDialog
        open={rsDialogOpen}
        onOpenChange={setRsDialogOpen}
        title={rsEditingItem ? 'Edit Kerjasama Rumah Sakit' : 'Tambah Kerjasama Rumah Sakit'}
        description="Lengkapi detail faskes mitra, masa berlaku PKS, dan kontak PIC"
        onSubmit={handleSaveRs}
        isSubmitting={isSubmitting}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <HeroFormField label="Nama Rumah Sakit / Klinik" required>
            <HeroInput
              placeholder="Nama Rumah Sakit / Klinik"
              value={rsForm.name}
              onChange={(e) => setRsForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </HeroFormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroFormField label="Lokasi Kota / Kabupaten" required>
              <HeroInput
                placeholder="Kota atau Kabupaten"
                value={rsForm.location}
                onChange={(e) => setRsForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </HeroFormField>

            <HeroFormField label="Status Kerjasama">
              <HeroSearchableSelect
                value={rsForm.status}
                onChange={(val) => setRsForm((prev) => ({ ...prev, status: val }))}
                options={[
                  { value: 'active', label: 'Aktif (Otomatis berdasarkan tanggal)' },
                  { value: 'no_partnership', label: 'Belum Ada Kerjasama (Tahap Prospek)' },
                  { value: 'expiring_soon', label: 'Segera Berakhir' },
                  { value: 'expired', label: 'Kedaluwarsa' },
                ]}
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Alamat Lengkap Faskes (Opsional)">
            <HeroInput
              placeholder="Jalan, kelurahan, atau kecamatan"
              value={rsForm.address}
              onChange={(e) => setRsForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </HeroFormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroFormField label="Tanggal Mulai Kontrak (Start Date)">
              <HeroDatePicker
                value={rsForm.startDate}
                onChange={(d) => setRsForm((prev) => ({ ...prev, startDate: d ? format(d, "yyyy-MM-dd") : "" }))}
                placeholder="Pilih tanggal mulai"
              />
            </HeroFormField>

            <HeroFormField label="Tanggal Berakhir Kontrak (End Date)">
              <HeroDatePicker
                value={rsForm.endDate}
                onChange={(d) => setRsForm((prev) => ({ ...prev, endDate: d ? format(d, "yyyy-MM-dd") : "" }))}
                placeholder="Pilih tanggal berakhir"
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroFormField label="Nama PIC / Kontak RS">
              <HeroInput
                placeholder="Nama PIC"
                value={rsForm.contactPerson}
                onChange={(e) => setRsForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
              />
            </HeroFormField>

            <HeroFormField label="Nomor Telepon / WhatsApp">
              <HeroInput
                placeholder="Nomor Telepon / WhatsApp"
                value={rsForm.contactPhone}
                onChange={(e) => setRsForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Berkas Dokumen PKS / MOU (PDF)">
            <HeroFileUpload
              value={rsForm.contractDocumentUrl}
              accept=".pdf,.doc,.docx"
              maxSizeMb={10}
              onChange={(url) =>
                setRsForm((prev) => ({
                  ...prev,
                  contractDocumentUrl: url || '',
                }))
              }
            />
          </HeroFormField>

          <HeroFormField label="Catatan / Keterangan Khusus">
            <HeroTextarea
              placeholder="Catatan tambahan atau keterangan"
              value={rsForm.notes}
              onChange={(e) => setRsForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* ─── MODAL: FORM SISWA PKL ──────────────────────────────────────────── */}
      <HeroFormDialog
        open={pklDialogOpen}
        onOpenChange={setPklDialogOpen}
        title={pklEditingItem ? 'Edit Data Siswa PKL' : 'Tambah Siswa PKL & Magang'}
        description="Masukkan biodata siswa, asal sekolah, periode praktik, dan pembimbing industri"
        onSubmit={handleSavePkl}
        isSubmitting={isSubmitting}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <HeroFormField label="Nama Lengkap Siswa / Mahasiswa" required>
            <HeroInput
              placeholder="Nama lengkap siswa atau mahasiswa"
              value={pklForm.name}
              onChange={(e) => setPklForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </HeroFormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroFormField label="Asal Sekolah / Kampus" required>
              <HeroInput
                placeholder="Nama sekolah atau perguruan tinggi"
                value={pklForm.institution}
                onChange={(e) => setPklForm((prev) => ({ ...prev, institution: e.target.value }))}
              />
            </HeroFormField>

            <HeroFormField label="Jurusan / Program Studi" required>
              <HeroInput
                placeholder="Nama jurusan atau program studi"
                value={pklForm.major}
                onChange={(e) => setPklForm((prev) => ({ ...prev, major: e.target.value }))}
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroFormField label="Tanggal Mulai PKL" required>
              <HeroDatePicker
                value={pklForm.startDate}
                onChange={(d) => setPklForm((prev) => ({ ...prev, startDate: d ? format(d, "yyyy-MM-dd") : "" }))}
                placeholder="Tanggal mulai"
              />
            </HeroFormField>

            <HeroFormField label="Tanggal Berakhir PKL" required>
              <HeroDatePicker
                value={pklForm.endDate}
                onChange={(d) => setPklForm((prev) => ({ ...prev, endDate: d ? format(d, "yyyy-MM-dd") : "" }))}
                placeholder="Tanggal berakhir"
              />
            </HeroFormField>
          </div>

          <HeroFormField
            label="Pembimbing Industri"
            required
          >
            <HeroSearchableSelect
              isMulti
              value={pklForm.mentorEmployeeIds.map(String)}
              onChange={(vals: string[]) => {
                const selectedIds = (vals || []).map(Number)
                const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id))
                const combinedNames = selectedEmployees.map((e) => e.name).join(' / ')
                setPklForm((prev) => ({
                  ...prev,
                  mentorEmployeeIds: selectedIds,
                  mentorName: combinedNames,
                }))
              }}
              options={mentorSelectOptions}
              placeholder="Pilih pembimbing dari daftar karyawan..."
            />
          </HeroFormField>

          <HeroFormField label="Catatan / Keterangan Khusus">
            <HeroTextarea
              placeholder="Catatan atau keterangan penempatan"
              value={pklForm.notes}
              onChange={(e) => setPklForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* ─── MODAL: DETAIL RUMAH SAKIT ──────────────────────────────────────── */}
      {rsDetailItem && (
        <HeroDetailModal
          open={!!rsDetailItem}
          onOpenChange={(open) => !open && setRsDetailItem(null)}
          title={rsDetailItem.name}
          subtitle={`Fasilitas Kesehatan Mitra - ${rsDetailItem.location}`}
          statusBadge={
            <Badge
              className={cn(
                'text-xs font-semibold px-2.5 py-0.5',
                rsDetailItem.status === 'active'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : rsDetailItem.status === 'expiring_soon'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : rsDetailItem.status === 'expired'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              )}
            >
              {RS_STATUS_LABELS[rsDetailItem.status] || rsDetailItem.status}
            </Badge>
          }
          onEdit={() => {
            const item = rsDetailItem
            setRsDetailItem(null)
            handleOpenRsDialog(item)
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Kota / Lokasi</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{rsDetailItem.location}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Alamat</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{rsDetailItem.address || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Periode PKS</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {rsDetailItem.startDate
                  ? `${new Date(rsDetailItem.startDate).toLocaleDateString('id-ID')} s/d ${new Date(rsDetailItem.endDate!).toLocaleDateString('id-ID')}`
                  : 'Belum ada masa kontrak'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Kontak PIC / Telepon</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {rsDetailItem.contactPerson || '-'} {rsDetailItem.contactPhone ? `(${rsDetailItem.contactPhone})` : ''}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground font-medium">Keterangan Tambahan</p>
              <p className="text-sm text-foreground mt-0.5 bg-muted/30 p-2.5 rounded border">
                {rsDetailItem.notes || 'Tidak ada catatan tambahan.'}
              </p>
            </div>
            {rsDetailItem.contractDocumentUrl && (
              <div className="md:col-span-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Berkas Kontrak PKS</p>
                <a
                  href={resolveUploadUrl(rsDetailItem.contractDocumentUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors"
                >
                  <FileText className="size-4" />
                  Unduh / Lihat Dokumen ({rsDetailItem.contractDocumentName || 'PKS.pdf'})
                </a>
              </div>
            )}
          </div>
        </HeroDetailModal>
      )}

      {/* ─── MODAL: DETAIL SISWA PKL ────────────────────────────────────────── */}
      {pklDetailItem && (
        <HeroDetailModal
          open={!!pklDetailItem}
          onOpenChange={(open) => !open && setPklDetailItem(null)}
          title={pklDetailItem.name}
          subtitle={`${pklDetailItem.institution} • ${pklDetailItem.major}`}
          statusBadge={
            <Badge
              className={cn(
                'text-xs font-semibold px-2.5 py-0.5',
                pklDetailItem.status === 'active'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : pklDetailItem.status === 'completed'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              )}
            >
              {PKL_STATUS_LABELS[pklDetailItem.status] || pklDetailItem.status}
            </Badge>
          }
          onEdit={() => {
            const item = pklDetailItem
            setPklDetailItem(null)
            handleOpenPklDialog(item)
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Asal Sekolah / Kampus</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{pklDetailItem.institution}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Jurusan</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{pklDetailItem.major}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Periode PKL</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {new Date(pklDetailItem.startDate).toLocaleDateString('id-ID')} s/d{' '}
                {new Date(pklDetailItem.endDate).toLocaleDateString('id-ID')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Durasi Praktik</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {pklDetailItem.durationDisplay || `${pklDetailItem.durationMonths} Bulan ${pklDetailItem.durationDays} Hari`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pembimbing Industri</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{pklDetailItem.mentorName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Status Penyelesaian</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {PKL_STATUS_LABELS[pklDetailItem.status] || pklDetailItem.status}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground font-medium">Catatan Pembimbing / Tugas</p>
              <p className="text-sm text-foreground mt-0.5 bg-muted/30 p-2.5 rounded border">
                {pklDetailItem.notes || 'Tidak ada catatan.'}
              </p>
            </div>
          </div>
        </HeroDetailModal>
      )}

      {/* ─── MODAL: CONFIRM DELETE RS ───────────────────────────────────────── */}
      <HeroConfirmDialog
        open={!!rsDeletingItem}
        onOpenChange={(open) => !open && setRsDeletingItem(null)}
        title="Hapus Data Kerjasama Rumah Sakit"
        description={`Apakah Anda yakin ingin menghapus data "${rsDeletingItem?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Data"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isSubmitting}
        onConfirm={handleDeleteRs}
      />

      {/* ─── MODAL: CONFIRM DELETE PKL ──────────────────────────────────────── */}
      <HeroConfirmDialog
        open={!!pklDeletingItem}
        onOpenChange={(open) => !open && setPklDeletingItem(null)}
        title="Hapus Data Siswa PKL"
        description={`Apakah Anda yakin ingin menghapus data siswa "${pklDeletingItem?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Data"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isSubmitting}
        onConfirm={handleDeletePkl}
      />
    </div>
  )
}
