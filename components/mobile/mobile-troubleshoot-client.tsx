'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Image as ImageIcon,
  Info,
  Layers,
  MapPin,
  Maximize2,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createTroubleshootTicket,
  updateTicketStatusAction,
  addTicketNoteAction,
  escalateTicketAction,
  getTroubleshootDashboardData,
  getTicketActivitiesAction,
  type TroubleshootTicketItem,
  type TicketActivityItem,
  type CategoryStatItem,
  type SiteSummaryItem,
} from '@/app/actions/service-desk'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface MobileTroubleshootDashboardData {
  kanban: {
    baru: TroubleshootTicketItem[]
    assigned: TroubleshootTicketItem[]
    investigasi: TroubleshootTicketItem[]
    menunggu_part: TroubleshootTicketItem[]
    selesai: TroubleshootTicketItem[]
  }
  tickets: TroubleshootTicketItem[]
  totalTickets: number
  categoryStats: CategoryStatItem[]
  siteSummary: SiteSummaryItem[]
  sites: Array<{ id: number; name: string }>
  categories: Array<{
    id: number
    code: string
    name: string
    color: string
    default_sla_hours: number
    target_department_id?: number | null
    default_assigned_employees?: any[]
    default_priority?: string
  }>
  departments?: Array<{ id: number; name: string }>
  employees?: Array<{ id: number; name: string; employee_sn?: string; role?: string; department_id?: number | null }>
}

interface MobileTroubleshootClientProps {
  initialData: any
}

export function MobileTroubleshootClient({ initialData }: MobileTroubleshootClientProps) {
  const router = useRouter()
  const [data, setData] = useState<MobileTroubleshootDashboardData>({
    kanban: initialData?.kanban || { baru: [], assigned: [], investigasi: [], menunggu_part: [], selesai: [] },
    tickets: initialData?.tickets || [],
    totalTickets: initialData?.totalTickets || (initialData?.tickets ? initialData.tickets.length : 0),
    categoryStats: initialData?.categoryStats || [],
    siteSummary: initialData?.siteSummary || [],
    sites: initialData?.sites || [],
    categories: initialData?.categories || [],
    departments: initialData?.departments || [],
    employees: initialData?.employees || [],
  })

  const [activeTab, setActiveTab] = useState<'tickets' | 'categories' | 'sites'>('tickets')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [quickFilter, setQuickFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Selected ticket for bottom sheet inspector
  const [selectedTicket, setSelectedTicket] = useState<TroubleshootTicketItem | null>(
    data.tickets && data.tickets.length > 0 ? data.tickets[0] : null
  )
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [activities, setActivities] = useState<TicketActivityItem[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false)

  // Form states
  const [statusUpdateVal, setStatusUpdateVal] = useState<'baru' | 'assigned' | 'investigasi' | 'menunggu_part' | 'selesai'>('investigasi')
  const [statusNotesVal, setStatusNotesVal] = useState('')
  const [noteContentVal, setNoteContentVal] = useState('')
  const [escalateReasonVal, setEscalateReasonVal] = useState('')

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    unitCode: '',
    siteId: data.sites[0]?.id ? String(data.sites[0].id) : '1',
    priority: 'tinggi' as 'kritis' | 'tinggi' | 'sedang' | 'rendah',
    categoryName: data.categories[0]?.name || 'Timesheet & Roster Kerja',
    sourceDetail: 'Pelaporan Pengguna Mobile',
    targetDepartmentId: '',
    assignedEmployeeId: '',
    isCustomCategory: false,
    customCategoryName: '',
  })
  const [formAttachments, setFormAttachments] = useState<Array<{ url: string; name: string; size: number; type: string }>>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null)

  // Auto-fill target department and assigned PIC when category changes
  const handleCategoryChange = (val: string) => {
    if (val === '__custom__') {
      setCreateForm((prev) => ({
        ...prev,
        categoryName: '__custom__',
        isCustomCategory: true,
      }))
      return
    }
    const match = (data.categories || []).find((c) => c.name === val)
    setCreateForm((prev) => ({
      ...prev,
      categoryName: val,
      isCustomCategory: false,
      targetDepartmentId: match?.target_department_id ? String(match.target_department_id) : prev.targetDepartmentId,
      assignedEmployeeId: (Array.isArray(match?.default_assigned_employees) && match?.default_assigned_employees.length > 0)
        ? String(match.default_assigned_employees[0].id)
        : prev.assignedEmployeeId,
      priority: (match?.default_priority as any) || prev.priority,
    }))
  }

  const filteredEmployees = useMemo(() => {
    const list = data.employees || []
    if (!createForm.targetDepartmentId) return list
    const deptId = parseInt(createForm.targetDepartmentId, 10)
    const inDept = list.filter((e) => e.department_id === deptId)
    return inDept.length > 0 ? inDept : list
  }, [data.employees, createForm.targetDepartmentId])

  // Load activities when selected ticket changes
  useEffect(() => {
    if (!selectedTicket?.id) {
      setActivities([])
      return
    }
    setLoadingActivities(true)
    getTicketActivitiesAction(selectedTicket.id)
      .then((acts) => setActivities(acts || []))
      .catch((e) => console.error(e))
      .finally(() => setLoadingActivities(false))
  }, [selectedTicket?.id])

  // Quick refresh
  const refreshData = async () => {
    startTransition(async () => {
      try {
        const fresh = await getTroubleshootDashboardData()
        setData({
          kanban: fresh.kanban,
          tickets: fresh.tickets,
          totalTickets: fresh.totalTickets,
          categoryStats: fresh.categoryStats,
          siteSummary: fresh.siteSummary,
          sites: fresh.sites,
          categories: fresh.categories,
        })
        if (selectedTicket) {
          const updated = fresh.tickets.find((t) => t.id === selectedTicket.id)
          if (updated) setSelectedTicket(updated)
        }
        toast.success('Data tiket diperbarui')
      } catch (err: any) {
        toast.error('Gagal memuat data terbaru')
      }
    })
  }

  // Filtered tickets
  const filteredTickets = (data.tickets || []).filter((ticket) => {
    // Status filter from horizontal tabs
    if (statusFilter !== 'all' && ticket.status !== statusFilter) {
      return false
    }

    // Quick filter chips
    if (quickFilter === 'overdue' && !ticket.isOverdue) return false
    if (quickFilter === 'timesheet' && !ticket.title.toLowerCase().includes('timesheet') && !ticket.categoryName.toLowerCase().includes('timesheet')) return false
    if (quickFilter === 'attendance' && !ticket.title.toLowerCase().includes('presensi') && !ticket.categoryName.toLowerCase().includes('presensi')) return false
    if (quickFilter === 'network' && !ticket.title.toLowerCase().includes('jaringan') && !ticket.categoryName.toLowerCase().includes('jaringan')) return false
    if (quickFilter === 'cross_dept' && !ticket.categoryName.toLowerCase().includes('supply') && !ticket.categoryName.toLowerCase().includes('fasilitas') && !ticket.categoryName.toLowerCase().includes('human')) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNumber = ticket.ticketNumber.toLowerCase().includes(q)
      const matchUnit = (ticket.unitCode || '').toLowerCase().includes(q)
      const matchSite = (ticket.siteName || '').toLowerCase().includes(q)
      const matchTitle = ticket.title.toLowerCase().includes(q)
      const matchCategory = ticket.categoryName.toLowerCase().includes(q)
      if (!matchNumber && !matchUnit && !matchSite && !matchTitle && !matchCategory) {
        return false
      }
    }

    return true
  })

  // Count summaries
  const criticalCount = (data.tickets || []).filter((t) => t.priority === 'kritis' && t.status !== 'selesai').length
  const overdueCount = (data.tickets || []).filter((t) => t.isOverdue && t.status !== 'selesai').length
  const networkCount = (data.tickets || []).filter(
    (t) => (t.title.toLowerCase().includes('jaringan') || t.categoryName.toLowerCase().includes('jaringan')) && t.status !== 'selesai'
  ).length
  const openCount = (data.tickets || []).filter((t) => t.status !== 'selesai').length

  // Handlers
  const handleSelectTicket = (ticket: TroubleshootTicketItem) => {
    setSelectedTicket(ticket)
    setIsInspectorOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 15MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadTarget', 'troubleshooting-attachments')

      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setFormAttachments((prev) => [
          ...prev,
          {
            url: res.url,
            name: file.name,
            size: file.size,
            type: file.type,
          },
        ])
        toast.success(`Foto ${file.name} berhasil diunggah!`)
      } else {
        toast.error(res.error || 'Gagal mengunggah file')
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error('Gagal mengunggah berkas')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (idx: number) => {
    setFormAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.title.trim() || !createForm.description.trim()) {
      toast.error('Judul dan deskripsi temuan wajib diisi')
      return
    }

    const finalCat = createForm.isCustomCategory ? createForm.customCategoryName.trim() : createForm.categoryName
    if (!finalCat) {
      toast.error('Kategori kendala wajib diisi')
      return
    }

    const selectedEmp = (data.employees || []).find((e) => String(e.id) === createForm.assignedEmployeeId)

    startTransition(async () => {
      try {
        const res = await createTroubleshootTicket({
          title: createForm.title.trim(),
          findingDescription: createForm.description.trim(),
          unitCode: createForm.unitCode.trim() || undefined,
          siteId: parseInt(createForm.siteId, 10),
          categoryName: finalCat,
          targetDepartmentId: createForm.targetDepartmentId ? parseInt(createForm.targetDepartmentId, 10) : undefined,
          assignedEmployeeId: createForm.assignedEmployeeId ? parseInt(createForm.assignedEmployeeId, 10) : undefined,
          assignedEmployeeName: selectedEmp?.name,
          assignedRole: selectedEmp?.role,
          priority: createForm.priority,
          attachments: formAttachments,
          sourceDetail: createForm.sourceDetail,
        })

        if (res.success) {
          toast.success(`Tiket ${res.ticketNumber} berhasil dilaporkan!`)
          setIsCreateOpen(false)
          setFormAttachments([])
          setCreateForm({
            title: '',
            description: '',
            unitCode: '',
            siteId: data.sites[0]?.id ? String(data.sites[0].id) : '1',
            priority: 'tinggi',
            categoryName: data.categories[0]?.name || 'Timesheet & Roster Kerja',
            sourceDetail: 'Pelaporan Pengguna Mobile',
            targetDepartmentId: '',
            assignedEmployeeId: '',
            isCustomCategory: false,
            customCategoryName: '',
          })
          await refreshData()
        } else {
          toast.error(res.error || 'Gagal membuat tiket')
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal membuat tiket')
      }
    })
  }

  const handleUpdateStatusSubmit = async () => {
    if (!selectedTicket) return
    startTransition(async () => {
      try {
        const res = await updateTicketStatusAction(
          selectedTicket.id,
          statusUpdateVal,
          statusNotesVal.trim() || undefined
        )
        if (res.success) {
          toast.success(`Status tiket ${selectedTicket.ticketNumber} diperbarui`)
          setIsStatusDialogOpen(false)
          setStatusNotesVal('')
          await refreshData()
        } else {
          toast.error(res.error || 'Gagal update status')
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal update status')
      }
    })
  }

  const handleAddNoteSubmit = async () => {
    if (!selectedTicket || !noteContentVal.trim()) return
    startTransition(async () => {
      try {
        const res = await addTicketNoteAction(selectedTicket.id, noteContentVal.trim())
        if (res.success) {
          toast.success('Catatan berhasil ditambahkan')
          setIsNoteDialogOpen(false)
          setNoteContentVal('')
          getTicketActivitiesAction(selectedTicket.id).then((acts) => setActivities(acts || []))
        } else {
          toast.error(res.error || 'Gagal menambahkan catatan')
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal menambahkan catatan')
      }
    })
  }

  const handleEscalateSubmit = async () => {
    if (!selectedTicket || !escalateReasonVal.trim()) return
    startTransition(async () => {
      try {
        const res = await escalateTicketAction(selectedTicket.id, escalateReasonVal.trim())
        if (res.success) {
          toast.success(`Tiket ${selectedTicket.ticketNumber} berhasil dieskalasi ke prioritas KRITIS`)
          setIsEscalateDialogOpen(false)
          setEscalateReasonVal('')
          await refreshData()
        } else {
          toast.error(res.error || 'Gagal eskalasi')
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal eskalasi')
      }
    })
  }

  // Priority color helper
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'kritis':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white border-0 font-medium text-[10px] px-2 py-0.5">Kritis</Badge>
      case 'tinggi':
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-0 font-medium text-[10px] px-2 py-0.5">Tinggi</Badge>
      case 'sedang':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium text-[10px] px-2 py-0.5">Sedang</Badge>
      default:
        return <Badge variant="secondary" className="font-medium text-[10px] px-2 py-0.5">Rendah</Badge>
    }
  }

  // Status badge helper
  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'baru':
        return <Badge variant="outline" className="border-sky-500/50 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 text-[11px]">Baru</Badge>
      case 'assigned':
        return <Badge variant="outline" className="border-indigo-500/50 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[11px]">Assigned</Badge>
      case 'investigasi':
        return <Badge variant="outline" className="border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[11px]">Investigasi</Badge>
      case 'menunggu_part':
        return <Badge variant="outline" className="border-purple-500/50 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[11px]">Menunggu Konfirmasi</Badge>
      case 'selesai':
        return <Badge variant="outline" className="border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]">Selesai</Badge>
      default:
        return <Badge variant="outline">{s}</Badge>
    }
  }

  const maxCategoryCount = Math.max(...(data.categoryStats || []).map((c) => c.count), 1)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* 1. Mobile Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border/80 px-4 pt-3 pb-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Wrench className="size-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                Troubleshoot & Tiket
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Service Desk &amp; Kendala Sistem HERO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8.5 rounded-lg border-border/70"
              onClick={refreshData}
              disabled={isPending}
            >
              <RefreshCw className={cn('size-4 text-slate-600 dark:text-slate-300', isPending && 'animate-spin')} />
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm flex items-center gap-1"
            >
              <Plus className="size-3.5" />
              <span>Buat Tiket</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari kode tiket, modul, site, temuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Quick Mobile KPI Cards Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div
            onClick={() => { setQuickFilter('all'); setStatusFilter('all'); }}
            className={cn(
              'p-2.5 rounded-xl border bg-card transition-all cursor-pointer text-center',
              quickFilter === 'all' && statusFilter === 'all'
                ? 'border-blue-500 ring-1 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-border/60 hover:border-border'
            )}
          >
            <div className="text-[10px] text-muted-foreground font-medium truncate">Total Open</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{openCount}</div>
          </div>

          <div
            onClick={() => { setQuickFilter('all'); setStatusFilter('all'); }}
            className={cn(
              'p-2.5 rounded-xl border bg-card transition-all cursor-pointer text-center',
              criticalCount > 0
                ? 'border-red-500/50 bg-red-50/40 dark:bg-red-950/20'
                : 'border-border/60 hover:border-border'
            )}
          >
            <div className="text-[10px] text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-0.5 truncate">
              <Flame className="size-2.5" /> Kritis
            </div>
            <div className="text-base font-bold text-red-600 dark:text-red-400 mt-0.5">{criticalCount}</div>
          </div>

          <div
            onClick={() => { setQuickFilter('overdue'); setStatusFilter('all'); }}
            className={cn(
              'p-2.5 rounded-xl border bg-card transition-all cursor-pointer text-center',
              quickFilter === 'overdue'
                ? 'border-rose-500 ring-1 ring-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
                : 'border-border/60 hover:border-border'
            )}
          >
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium flex items-center justify-center gap-0.5 truncate">
              <Clock className="size-2.5" /> Overdue
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">{overdueCount}</div>
          </div>

          <div
            onClick={() => { setQuickFilter('network'); setStatusFilter('all'); }}
            className={cn(
              'p-2.5 rounded-xl border bg-card transition-all cursor-pointer text-center',
              quickFilter === 'network'
                ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-border/60 hover:border-border'
            )}
          >
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-0.5 truncate">
              <Radio className="size-2.5" /> Jaringan
            </div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{networkCount}</div>
          </div>
        </div>

        {/* 3. Main Section Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-800/70 p-1 text-xs">
          <button
            onClick={() => setActiveTab('tickets')}
            className={cn(
              'flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5',
              activeTab === 'tickets'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Layers className="size-3.5" />
            <span>Alur Tiket ({data.tickets?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              'flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5',
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TrendingUp className="size-3.5" />
            <span>Kategori ({data.categoryStats?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('sites')}
            className={cn(
              'flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5',
              activeTab === 'sites'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MapPin className="size-3.5" />
            <span>Site MTTR ({data.siteSummary?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: ALUR TIKET (MOBILE KANBAN / LIST) */}
        {activeTab === 'tickets' && (
          <div className="space-y-3">
            {/* Horizontal Kanban Status Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-3 py-1.2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-border/80'
                )}
              >
                Semua ({data.tickets?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('baru')}
                className={cn(
                  'px-3 py-1.2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  statusFilter === 'baru'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-border/80'
                )}
              >
                Baru ({data.kanban?.baru?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('assigned')}
                className={cn(
                  'px-3 py-1.2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  statusFilter === 'assigned'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-border/80'
                )}
              >
                Assigned ({data.kanban?.assigned?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('investigasi')}
                className={cn(
                  'px-3 py-1.2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  statusFilter === 'investigasi'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-border/80'
                )}
              >
                Investigasi ({data.kanban?.investigasi?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('menunggu_part')}
                className={cn(
                  'px-3 py-1.2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  statusFilter === 'menunggu_part'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-border/80'
                )}
              >
                Menunggu Part ({data.kanban?.menunggu_part?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('selesai')}
                className={cn(
                  'px-3 py-1.2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  statusFilter === 'selesai'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-border/80'
                )}
              >
                Selesai ({data.kanban?.selesai?.length || 0})
              </button>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setQuickFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                  quickFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                )}
              >
                Filter: Semua
              </button>
              <button
                onClick={() => setQuickFilter('timesheet')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                  quickFilter === 'timesheet'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                )}
              >
                Timesheet
              </button>
              <button
                onClick={() => setQuickFilter('attendance')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                  quickFilter === 'attendance'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                )}
              >
                Presensi &amp; GPS
              </button>
              <button
                onClick={() => setQuickFilter('network')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                  quickFilter === 'network'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                )}
              >
                Jaringan &amp; Server
              </button>
              <button
                onClick={() => setQuickFilter('cross_dept')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                  quickFilter === 'cross_dept'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                )}
              >
                Antar Departemen
              </button>
              <button
                onClick={() => setQuickFilter('overdue')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                  quickFilter === 'overdue'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                )}
              >
                Lewat SLA
              </button>
            </div>

            {/* Ticket Cards List */}
            <div className="space-y-2.5 pt-1">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-white dark:bg-slate-900">
                  <div className="size-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-muted-foreground mb-3">
                    <Search className="size-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tidak ada tiket ditemukan</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Coba sesuaikan kata kunci pencarian atau ganti filter kategori di atas.
                  </p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const borderPriorityClass =
                    ticket.priority === 'kritis'
                      ? 'border-l-4 border-l-red-500'
                      : ticket.priority === 'tinggi'
                      ? 'border-l-4 border-l-amber-500'
                      : ticket.priority === 'sedang'
                      ? 'border-l-4 border-l-blue-500'
                      : 'border-l-4 border-l-slate-400'

                  return (
                    <div
                      key={ticket.id}
                      data-testid={`mobile-ticket-card-${ticket.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectTicket(ticket)}
                      className={cn(
                        'p-3.5 rounded-xl border bg-card transition-all active:scale-[0.99] cursor-pointer shadow-2xs hover:shadow-sm space-y-2.5',
                        borderPriorityClass,
                        selectedTicket?.id === ticket.id
                          ? 'border-blue-400 dark:border-blue-700 ring-1 ring-blue-500/20'
                          : 'border-border/70'
                      )}
                    >
                      {/* Top metadata */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                            {ticket.ticketNumber}
                          </span>
                          {ticket.unitCode && (
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {ticket.unitCode}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="size-3" />
                            {ticket.siteName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>

                      {/* Title / Finding */}
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                        {ticket.title}
                      </p>

                      {/* Bottom Footer Info */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <User className="size-3 text-muted-foreground" />
                            {ticket.assignedEmployeeName || 'Belum di-assign'}
                          </span>
                          <span>•</span>
                          <span>Umur: {ticket.ageStr}</span>
                        </div>
                        <div>
                          {ticket.isOverdue ? (
                            <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded text-[10px]">
                              {ticket.slaLabel}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">
                              SLA: {ticket.slaLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TEMUAN PER KATEGORI */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="size-4 text-blue-600" />
                  Temuan per Kategori
                </h3>
                <span className="text-[11px] text-muted-foreground">Tiket Open</span>
              </div>

              <div className="space-y-3 pt-1">
                {(data.categoryStats || []).map((cat, idx) => {
                  const percentage = Math.round((cat.count / maxCategoryCount) * 100)

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {cat.name}
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded text-[11px]">
                          {cat.count} tiket
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 8)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Threshold Rule Guide */}
              <div className="mt-4 pt-3 border-t border-border/60 bg-slate-50 dark:bg-slate-900/50 -mx-3.5 -mb-3.5 p-3 rounded-b-xl space-y-1 text-[11px] text-muted-foreground">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Info className="size-3.5 text-blue-500" />
                  Aturan Standar SLA HERO:
                </div>
                <p>• <strong>Kritis</strong>: Penanganan &lt; 4 jam (downtime operasional &amp; server)</p>
                <p>• <strong>Tinggi</strong>: Penanganan &lt; 8 jam (kendala alur kerja modul sistem)</p>
                <p>• <strong>Sedang / Rutin</strong>: Penanganan &lt; 24 jam (layanan fasilitas &amp; logistik)</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RINGKASAN PER SITE & MTTR */}
        {activeTab === 'sites' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">
                <MapPin className="size-4 text-blue-600" />
                Performa &amp; MTTR per Site
              </h3>

              <div className="space-y-2.5">
                {(data.siteSummary || []).map((site, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/60 bg-slate-50/70 dark:bg-slate-900/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <MapPin className="size-3.5 text-blue-500" />
                        {site.siteName}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-800 font-medium">
                        MTTR: {site.mttrAvgHours ? `${site.mttrAvgHours} j` : '-'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-border/50">
                      <div>
                        <div className="text-muted-foreground text-[10px]">Open</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{site.openCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px]">Overdue</div>
                        <div className={cn('font-bold mt-0.5', site.overdueCount > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300')}>
                          {site.overdueCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px]">Kritis</div>
                        <div className={cn('font-bold mt-0.5', site.offlineKritisCount > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300')}>
                          {site.offlineKritisCount}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Mobile Bottom Sheet: TICKET INSPECTOR */}
      <Sheet open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl p-0 overflow-hidden flex flex-col">
          {selectedTicket && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Sheet Header */}
              <div className="p-4 border-b border-border bg-slate-50 dark:bg-slate-900 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
                      {selectedTicket.ticketNumber}
                    </span>
                    {getPriorityBadge(selectedTicket.priority)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {selectedTicket.unitCode ? `Modul ${selectedTicket.unitCode} • ` : ''}{selectedTicket.siteName}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full"
                  aria-label="Tutup Detail Tiket"
                  onClick={() => setIsInspectorOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Sheet Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Finding Details */}
                <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Kategori: <strong>{selectedTicket.categoryName}</strong></span>
                    <span>Sumber: <strong>{selectedTicket.sourceDetail || 'Pelaporan Pengguna'}</strong></span>
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    {selectedTicket.findingDescription || selectedTicket.title}
                  </div>
                </div>

                {/* Key Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-muted-foreground block text-[10px]">PIC Ditugaskan</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                      <User className="size-3 text-blue-500" />
                      {selectedTicket.assignedEmployeeName
                        ? `${selectedTicket.assignedEmployeeName} (${selectedTicket.assignedRole || 'Teknisi'})`
                        : 'Belum di-assign'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-muted-foreground block text-[10px]">Target SLA</span>
                    <span className={cn('font-semibold flex items-center gap-1 mt-0.5', selectedTicket.isOverdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                      <Clock className="size-3" />
                      {selectedTicket.slaLabel}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-muted-foreground block text-[10px]">Terdeteksi Sejak</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {new Date(selectedTicket.detectedAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-muted-foreground block text-[10px]">Umur Kendala</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {selectedTicket.ageStr}
                    </span>
                  </div>
                </div>

                {/* GALERI LAMPIRAN / FOTO BUKTI (DENGAN POPUP LIGHTBOX) */}
                {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-blue-500" />
                        Foto Bukti / Lampiran ({selectedTicket.attachments.length})
                      </h4>
                      <span className="text-[10px] text-muted-foreground">Klik foto untuk popup besar</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedTicket.attachments.map((att: any, idx: number) => {
                        const resolvedUrl = resolveUploadUrl(att.url)
                        const isImg = att.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)

                        return (
                          <div
                            key={idx}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (isImg) setLightboxImage({ url: resolvedUrl, name: att.name })
                              else window.open(resolvedUrl, '_blank')
                            }}
                            className="group relative rounded-xl border border-border/90 overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-2xs hover:shadow-xs transition-transform active:scale-95"
                          >
                            {isImg ? (
                              <div className="relative aspect-video w-full overflow-hidden bg-slate-950/5">
                                <img
                                  src={resolvedUrl}
                                  alt={att.name}
                                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="size-5" />
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video w-full flex flex-col items-center justify-center p-2 text-center">
                                <FileText className="size-6 text-slate-500 mb-1" />
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-full">
                                  {att.name}
                                </span>
                              </div>
                            )}
                            <div className="p-1.5 bg-white dark:bg-slate-900 border-t border-border/60 flex items-center justify-between text-[10px]">
                              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                                {att.name}
                              </span>
                              <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Riwayat Aktivitas Audit Trail */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Clock className="size-3.5 text-blue-500" />
                    Riwayat Aktivitas &amp; Log Penanganan
                  </h4>

                  {loadingActivities ? (
                    <p className="text-[11px] text-muted-foreground italic py-2">Memuat riwayat...</p>
                  ) : (
                    <div className="space-y-2 border-l-2 border-blue-200 dark:border-blue-900 ml-2 pl-3">
                      {activities.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">Belum ada riwayat aktivitas.</p>
                      ) : (
                        activities.map((act) => (
                          <div key={act.id} className="relative pb-2 last:pb-0 text-[11px]">
                            <div className="size-2 rounded-full bg-blue-500 absolute -left-[17px] top-1" />
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {act.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(act.createdAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              • oleh {act.actorName || 'Sistem'}
                            </div>
                            {act.description && (
                              <div className="mt-1 p-2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300">
                                {act.description}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sheet Footer Action Buttons */}
              <div className="p-3 border-t border-border bg-white dark:bg-slate-900 grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsStatusDialogOpen(true)}
                  className="h-9 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Update Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNoteDialogOpen(true)}
                  className="h-9 text-xs font-medium rounded-lg"
                >
                  Catatan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEscalateDialogOpen(true)}
                  className="h-9 text-xs font-medium text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40 rounded-lg"
                >
                  Eskalasi
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. Dialog: BUAT TIKET / LAPOR KENDALA BARU */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="size-4 text-blue-600" />
              Lapor Kendala / Buat Tiket Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Formulir pelaporan kendala sistem HERO, jaringan telematika, maupun layanan antar departemen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicketSubmit} className="space-y-3.5 text-xs py-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Judul Temuan / Kendala <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Contoh: Gagal sinkronisasi data lembur otomatis"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Modul / Unit Terdampak
                </label>
                <Input
                  placeholder="Contoh: Timesheet V2"
                  value={createForm.unitCode}
                  onChange={(e) => setCreateForm({ ...createForm, unitCode: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Site Operasional
                </label>
                <select
                  value={createForm.siteId}
                  onChange={(e) => setCreateForm({ ...createForm, siteId: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  {(data.sites || []).map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Kategori Kendala
                </label>
                <select
                  value={createForm.categoryName}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  {(data.categories || []).map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__custom__">✨ + Kategori Kustom / Lainnya...</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Prioritas Urgensi
                </label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="kritis">Kritis (SLA 4 Jam)</option>
                  <option value="tinggi">Tinggi (SLA 8 Jam)</option>
                  <option value="sedang">Sedang (SLA 24 Jam)</option>
                  <option value="rendah">Rendah (SLA 48 Jam)</option>
                </select>
              </div>
            </div>

            {/* Custom Category Input */}
            {createForm.isCustomCategory && (
              <div className="p-2 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
                <label className="font-semibold block mb-1 text-blue-800 dark:text-blue-300 text-xs">
                  Nama Kategori Kustom <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Contoh: Kerusakan AC Kantor / Kabel Jaringan Terputus"
                  value={createForm.customCategoryName}
                  onChange={(e) => setCreateForm({ ...createForm, customCategoryName: e.target.value })}
                  className="h-9 text-xs bg-white dark:bg-slate-900"
                  required
                />
              </div>
            )}

            {/* Departemen Tujuan & Ditujukan Kepada (PIC) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Departemen Tujuan <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.targetDepartmentId}
                  onChange={(e) => setCreateForm({ ...createForm, targetDepartmentId: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                  required
                >
                  <option value="">-- Pilih Departemen --</option>
                  {(data.departments || []).map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Ditujukan Kepada (PIC)
                </label>
                <select
                  value={createForm.assignedEmployeeId}
                  onChange={(e) => setCreateForm({ ...createForm, assignedEmployeeId: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="">-- Otomatis / Antrean Dept --</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.name} {emp.role ? `(${emp.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Deskripsi Kendala &amp; Catatan Awal <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Rincian kendala yang terjadi, dampak ke pengguna, atau langkah yang telah dilakukan..."
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="text-xs resize-none"
                required
              />
            </div>

            {/* Upload Attachment / Foto */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Foto Bukti / Dokumen Lampiran</span>
                <span className="text-[10px] text-muted-foreground font-normal">Maks 15MB</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-8 text-xs flex items-center gap-1.5 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700"
                >
                  <Camera className="size-3.5" />
                  <span>{isUploading ? 'Mengunggah...' : 'Pilih Foto / Dokumen'}</span>
                </Button>
              </div>

              {formAttachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {formAttachments.map((att, idx) => {
                    const resolved = resolveUploadUrl(att.url)
                    const isImg = att.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)

                    return (
                      <div
                        key={idx}
                        className="relative p-1.5 rounded-lg border border-border/80 bg-slate-50 dark:bg-slate-950 flex items-center gap-2 group"
                      >
                        {isImg ? (
                          <img
                            src={resolved}
                            alt={att.name}
                            className="size-10 object-cover rounded border border-border/60 shrink-0"
                          />
                        ) : (
                          <div className="size-10 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <FileText className="size-5 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium truncate text-slate-800 dark:text-slate-200">
                            {att.name}
                          </p>
                          <span className="text-[9px] text-muted-foreground block">
                            {Math.round(att.size / 1024)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="size-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setIsCreateOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isPending ? 'Menyimpan...' : 'Kirim Laporan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog: UPDATE STATUS */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Update Status Tiket</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah tahapan penanganan untuk tiket #{selectedTicket?.ticketNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Status Baru</label>
              <select
                value={statusUpdateVal}
                onChange={(e) => setStatusUpdateVal(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="baru">Baru</option>
                <option value="assigned">Assigned</option>
                <option value="investigasi">Investigasi</option>
                <option value="menunggu_part">Menunggu Konfirmasi / Part</option>
                <option value="selesai">Selesai (Resolve)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Catatan Tambahan</label>
              <Textarea
                placeholder="Penjelasan tindakan yang dilakukan..."
                rows={2}
                value={statusNotesVal}
                onChange={(e) => setStatusNotesVal(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleUpdateStatusSubmit}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Dialog: TAMBAH CATATAN */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Tambah Catatan Investigasi</DialogTitle>
            <DialogDescription className="text-xs">
              Catatan akan tercatat ke dalam audit trail riwayat aktivitas tiket.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Textarea
              placeholder="Tuliskan catatan teknis atau temuan baru..."
              rows={3}
              value={noteContentVal}
              onChange={(e) => setNoteContentVal(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setIsNoteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isPending || !noteContentVal.trim()}
              onClick={handleAddNoteSubmit}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isPending ? 'Menyimpan...' : 'Kirim Catatan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Dialog: ESKALASI TIKET */}
      <Dialog open={isEscalateDialogOpen} onOpenChange={setIsEscalateDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              Eskalasi Tiket Kritis
            </DialogTitle>
            <DialogDescription className="text-xs">
              Eskalasikan kendala ini ke level supervisor/manajemen dan naikkan prioritas ke Kritis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Alasan Eskalasi</label>
              <Textarea
                placeholder="Contoh: Kendala menghentikan alur operasional site lebih dari 24 jam..."
                rows={3}
                value={escalateReasonVal}
                onChange={(e) => setEscalateReasonVal(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setIsEscalateDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isPending || !escalateReasonVal.trim()}
              onClick={handleEscalateSubmit}
              className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              {isPending ? 'Mengirim...' : 'Eskalasi Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Dialog: LIGHTBOX / IMAGE PREVIEW POPUP */}
      {lightboxImage && (
        <Dialog open={Boolean(lightboxImage)} onOpenChange={(open) => !open && setLightboxImage(null)}>
          <DialogContent className="max-w-xl w-[95vw] p-2 rounded-2xl bg-black/95 text-white border-slate-800">
            <div className="flex items-center justify-between p-2 border-b border-slate-800 text-xs">
              <span className="font-semibold truncate max-w-[70%]">{lightboxImage.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 text-[11px]"
                >
                  <Download className="size-3.5" />
                  <span>Unduh</span>
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="p-2 flex items-center justify-center min-h-[50vh] max-h-[75vh] overflow-hidden">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
