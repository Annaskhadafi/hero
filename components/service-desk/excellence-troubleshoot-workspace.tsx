'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconFlame,
  IconFolder,
  IconInfoCircle,
  IconListDetails,
  IconMessage,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconShieldExclamation,
  IconTool,
  IconTruck,
  IconUser,
  IconWifi,
  IconX,
  IconTrash,
  IconPencil,
  IconDownload,
  IconZoomIn,
  IconChevronDown,
  IconChevronUp,
  IconTable,
  IconLayoutKanban,
  IconShieldCheck,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  HeroKpiCard,
  HeroSearchableSelect,
  HeroConfirmDialog,
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroTextarea,
  type HeroSearchableSelectOption,
} from '@/components/templates'
import {
  TroubleshootTicketItem,
  TicketActivityItem,
  CategoryStatItem,
  SiteSummaryItem,
  createTroubleshootTicket,
  updateTicketStatusAction,
  assignTicketAction,
  addTicketNoteAction,
  escalateTicketAction,
  getTicketActivitiesAction,
  updateTicketAdminAction,
  deleteTicketAdminAction,
  bulkDeleteTicketsAction,
  type AdminEditTicketInput,
} from '@/app/actions/service-desk'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

interface WorkspaceProps {
  initialTickets: TroubleshootTicketItem[]
  initialKanban: {
    baru: TroubleshootTicketItem[]
    assigned: TroubleshootTicketItem[]
    investigasi: TroubleshootTicketItem[]
    menunggu_part: TroubleshootTicketItem[]
    selesai: TroubleshootTicketItem[]
  }
  categoryStats: CategoryStatItem[]
  siteSummary: SiteSummaryItem[]
  sites: Array<{ id: number; name: string }>
  categories: Array<{
    id: number
    code: string
    name: string
    color: string
    default_sla_hours: number
    default_priority?: string
    default_assigned_employees?: any[]
  }>
  templates?: Array<{
    id: number
    template_name: string
    title_template: string
    description_template: string
    priority: string
    sla_hours: number
    assigned_employees: any[]
    category_id: number
    category_name: string
  }>
  employees: Array<{ id: number; name: string; employee_sn: string; role: string }>
  currentEmployee: { id: number; name: string; email: string; role?: string }
  isAdmin?: boolean
  analytics?: {
    activeCount: number
    completedCount: number
    overdueCount: number
    criticalCount: number
    investigatingCount: number
    onTrackCount: number
    slaComplianceRate: number
  }
  initialSelectedTicketId?: number
}

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  baru: { label: 'Baru', className: 'bg-slate-700 hover:bg-slate-800 text-white border-transparent' },
  assigned: { label: 'Assigned', className: 'bg-sky-600 hover:bg-sky-700 text-white border-transparent' },
  investigasi: { label: 'Investigasi', className: 'bg-amber-700 hover:bg-amber-800 text-white border-transparent' },
  menunggu_part: { label: 'Menunggu Konfirmasi', className: 'bg-slate-600 hover:bg-slate-700 text-white border-transparent' },
  selesai: { label: 'Selesai', className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent' },
  dibatalkan: { label: 'Dibatalkan', className: 'bg-red-200 text-red-800 border-transparent' },
}

const priorityBadgeConfig: Record<string, { label: string; className: string; borderClass: string }> = {
  kritis: { label: 'Kritis', className: 'bg-red-600 hover:bg-red-700 text-white', borderClass: 'border-l-4 border-l-red-500' },
  tinggi: { label: 'Tinggi', className: 'bg-amber-600 hover:bg-amber-700 text-white', borderClass: 'border-l-4 border-l-amber-500' },
  sedang: { label: 'Sedang', className: 'bg-blue-600 hover:bg-blue-700 text-white', borderClass: 'border-l-4 border-l-blue-500' },
  rendah: { label: 'Rendah', className: 'bg-slate-500 hover:bg-slate-600 text-white', borderClass: 'border-l-4 border-l-slate-400' },
}

const SLA_CHART_COLORS = ['#10b981', '#3b82f6', '#ef4444']

export function ExcellenceTroubleshootWorkspace({
  initialTickets,
  initialKanban,
  categoryStats,
  siteSummary,
  sites,
  categories,
  templates = [],
  employees,
  currentEmployee,
  isAdmin = false,
  analytics,
  initialSelectedTicketId,
}: WorkspaceProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tickets, setTickets] = useState<TroubleshootTicketItem[]>(initialTickets)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedPicFilterIds, setSelectedPicFilterIds] = useState<string[]>([])
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table')
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom')

  // Selected Ticket for Inspector Panel
  const defaultSelected =
    initialTickets.find((t) => t.id === initialSelectedTicketId) ||
    initialTickets[0] ||
    null

  const [selectedTicket, setSelectedTicket] = useState<TroubleshootTicketItem | null>(defaultSelected)
  const [activities, setActivities] = useState<TicketActivityItem[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Table batch selection for bulk delete
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([])

  // Modal Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  // Admin Modals
  const [adminEditOpen, setAdminEditOpen] = useState(false)
  const [singleDeleteConfirmOpen, setSingleDeleteConfirmOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<TroubleshootTicketItem | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)

  // Lightbox Preview Image
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Quick action form states
  const [newStatus, setNewStatus] = useState<string>('investigasi')
  const [statusNotes, setStatusNotes] = useState<string>('')
  const [newNote, setNewNote] = useState<string>('')
  const [escalateReason, setEscalateReason] = useState<string>('')
  const [selectedPicIdsForAssign, setSelectedPicIdsForAssign] = useState<string[]>([])

  // Create Ticket Form States
  const [formUnitCode, setFormUnitCode] = useState('')
  const [formSiteId, setFormSiteId] = useState<string>(sites[0]?.id ? String(sites[0].id) : '1')
  const [formCategory, setFormCategory] = useState<string>(categories[0]?.name || 'Timesheet & Roster Kerja')
  const [formPriority, setFormPriority] = useState<'kritis' | 'tinggi' | 'sedang' | 'rendah'>('tinggi')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSourceDetail, setFormSourceDetail] = useState('Pelaporan Pengguna HERO')
  const [formAssignedPicIds, setFormAssignedPicIds] = useState<string[]>([])
  const [formAttachments, setFormAttachments] = useState<Array<{ url: string; name: string; size: number; type: string }>>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Created Ticket Success Modal with Queue Number & Estimation
  const [createdTicketModalOpen, setCreatedTicketModalOpen] = useState(false)
  const [createdTicketInfo, setCreatedTicketInfo] = useState<{
    ticketNumber: string
    ticketId: number
    queuePosition: number
    totalQueueForPic: number
    estimatedWaitHours: number
    estimatedStartAt?: string
    estimatedResolutionAt?: string
    assignedPicName: string
    priority: string
    categoryName: string
    title: string
    slaHours: number
  } | null>(null)

  // Admin Edit Form States
  const [editTicketId, setEditTicketId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPriority, setEditPriority] = useState<'kritis' | 'tinggi' | 'sedang' | 'rendah'>('sedang')
  const [editStatus, setEditStatus] = useState<'baru' | 'assigned' | 'investigasi' | 'menunggu_part' | 'selesai' | 'dibatalkan'>('baru')
  const [editSiteId, setEditSiteId] = useState<string>('1')
  const [editUnitCode, setEditUnitCode] = useState('')
  const [editPicIds, setEditPicIds] = useState<string[]>([])
  const [editTargetSla, setEditTargetSla] = useState('')

  // Map employees to HeroSearchableSelect options (Prioritize Admin Mochamad Annas Khadafi)
  const employeeOptions: HeroSearchableSelectOption[] = useMemo(() => {
    const sorted = [...employees].sort((a, b) => {
      const aIsKhadafi = a.id === 5 || a.employee_sn === '71261' || a.name.toLowerCase().includes('khadafi')
      const bIsKhadafi = b.id === 5 || b.employee_sn === '71261' || b.name.toLowerCase().includes('khadafi')
      if (aIsKhadafi && !bIsKhadafi) return -1
      if (!aIsKhadafi && bIsKhadafi) return 1
      return a.name.localeCompare(b.name)
    })

    return sorted.map((emp) => {
      const isKhadafi = emp.id === 5 || emp.employee_sn === '71261' || emp.name.toLowerCase().includes('khadafi')
      return {
        value: String(emp.id),
        label: isKhadafi ? `⭐ ${emp.name} (Admin HERO / SDS)` : `${emp.name} (${emp.employee_sn || 'SN'})`,
        description: isKhadafi
          ? 'Default Admin HERO (mochamad.khadafi@chitraparatama.co.id)'
          : (emp.role || 'Staff HERO'),
        badge: isKhadafi ? 'Admin SDS' : emp.role,
      }
    })
  }, [employees])

  // Load ticket activities
  React.useEffect(() => {
    if (!selectedTicket) return
    setLoadingActivities(true)
    getTicketActivitiesAction(selectedTicket.id)
      .then((data) => setActivities(data))
      .catch((e) => console.error(e))
      .finally(() => setLoadingActivities(false))
  }, [selectedTicket?.id])

  // Computed analytics
  const kpiStats = useMemo(() => {
    const total = tickets.length
    const active = tickets.filter((t) => t.status !== 'selesai' && t.status !== 'dibatalkan').length
    const criticalOverdue = tickets.filter(
      (t) => (t.priority === 'kritis' || t.isOverdue) && t.status !== 'selesai'
    ).length
    const investigating = tickets.filter((t) => t.status === 'investigasi').length
    const completed = tickets.filter((t) => t.status === 'selesai').length
    const onTrack = tickets.filter((t) => !t.isOverdue && t.status !== 'selesai').length
    const complianceRate =
      total > 0
        ? Math.round(
            ((total - tickets.filter((t) => t.isOverdue && t.status !== 'selesai').length) / total) *
              100
          )
        : 100

    return {
      total,
      active: analytics?.activeCount ?? active,
      criticalOverdue: analytics?.criticalCount ?? criticalOverdue,
      investigating: analytics?.investigatingCount ?? investigating,
      completed: analytics?.completedCount ?? completed,
      onTrack: analytics?.onTrackCount ?? onTrack,
      complianceRate: analytics?.slaComplianceRate ?? complianceRate,
    }
  }, [tickets, analytics])

  // Donut chart SLA data
  const slaChartData = useMemo(() => {
    return [
      { name: 'Selesai Tepat Waktu', value: kpiStats.completed },
      { name: 'Dalam Batas SLA', value: kpiStats.onTrack },
      { name: 'Overdue / Kritis', value: kpiStats.criticalOverdue },
    ]
  }, [kpiStats])

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Quick filter chips
      if (activeFilter === 'kritis' && t.priority !== 'kritis') return false
      if (activeFilter === 'overdue' && !t.isOverdue) return false
      if (activeFilter !== 'all' && activeFilter !== 'kritis' && activeFilter !== 'overdue') {
        if (t.categoryName.toLowerCase() !== activeFilter.toLowerCase()) return false
      }

      // 2. Site filter
      if (selectedSiteFilter !== 'all' && String(t.siteId) !== selectedSiteFilter) {
        return false
      }

      // 3. Multi-user PIC filter
      if (selectedPicFilterIds.length > 0) {
        const assignedIds = (t.assignedEmployees || []).map((e) => String(e.id))
        if (t.assignedEmployeeId) assignedIds.push(String(t.assignedEmployeeId))
        const hasMatch = selectedPicFilterIds.some((id) => assignedIds.includes(id))
        if (!hasMatch) return false
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNum = t.ticketNumber.toLowerCase().includes(q)
        const matchTitle = t.title.toLowerCase().includes(q)
        const matchUnit = (t.unitCode || '').toLowerCase().includes(q)
        const matchSite = t.siteName.toLowerCase().includes(q)
        const matchPic = (t.assignedEmployeeName || '').toLowerCase().includes(q)
        const matchDesc = t.findingDescription.toLowerCase().includes(q)
        const matchMultiPic = (t.assignedEmployees || []).some((emp) =>
          emp.name.toLowerCase().includes(q)
        )
        if (!matchNum && !matchTitle && !matchUnit && !matchSite && !matchPic && !matchDesc && !matchMultiPic) {
          return false
        }
      }

      return true
    })
  }, [tickets, activeFilter, selectedSiteFilter, selectedPicFilterIds, searchQuery])

  // Quick filter chips
  const filterChips = [
    { id: 'all', label: `Semua (${tickets.length})` },
    ...categories.map((c) => ({ id: c.name, label: c.name })),
    { id: 'kritis', label: 'Kritis', isAlert: false },
    { id: 'overdue', label: 'Overdue SLA', isAlert: true },
  ]

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setFormAttachments((prev) => [
          ...prev,
          { url: res.url, name: file.name, size: file.size, type: file.type },
        ])
        toast.success(`Foto ${file.name} berhasil diunggah!`)
      } else {
        toast.error(res.error || 'Gagal mengunggah foto.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saat upload foto.')
    } finally {
      setIsUploadingPhoto(false)
      if (e.target) e.target.value = ''
    }
  }

  // Quick template selection handler
  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId)
    if (tplId === 'custom') return
    const tpl = templates.find((t) => String(t.id) === tplId)
    if (!tpl) return
    setFormTitle(tpl.title_template)
    setFormDescription(tpl.description_template || '')
    setFormCategory(tpl.category_name)
    setFormPriority((tpl.priority as any) || 'sedang')
    const assignedIds = (tpl.assigned_employees || []).map((e: any) => String(e.id))
    if (assignedIds.length > 0) {
      setFormAssignedPicIds(assignedIds)
    }
    toast.info(`Template "${tpl.template_name}" diterapkan: teknisi & judul otomatis terisi!`)
  }

  // Category change handler with auto-fill routing & Admin Khadafi matching for HERO issues
  const handleCategoryChange = (catName: string) => {
    setFormCategory(catName)
    const cat = categories.find((c) => c.name === catName)
    const isHeroRelated =
      cat?.code?.startsWith('HERO_') ||
      (cat as any)?.is_system_issue === true ||
      catName.toLowerCase().includes('hero') ||
      catName.toLowerCase().includes('aplikasi') ||
      catName.toLowerCase().includes('bug') ||
      catName.toLowerCase().includes('presensi') ||
      catName.toLowerCase().includes('timesheet') ||
      catName.toLowerCase().includes('server')

    if (cat) {
      if (cat.default_priority) {
        setFormPriority(cat.default_priority as any)
      }
      const defaultPics = cat.default_assigned_employees || []
      let picIds = Array.isArray(defaultPics) ? defaultPics.map((e: any) => String(e.id)) : []

      // If HERO related, ensure Admin Mochamad Annas Khadafi (ID 5) is defaulted
      if (isHeroRelated && !picIds.includes('5')) {
        picIds = ['5', ...picIds]
      }

      if (picIds.length > 0) {
        setFormAssignedPicIds(picIds)
        if (isHeroRelated) {
          toast.info(`Kendala HERO terdeteksi: PIC otomatis dialihkan ke Admin Mochamad Annas Khadafi.`)
        } else {
          toast.info(`Kategori ${catName}: ${picIds.length} teknisi PIC otomatis terpilih.`)
        }
      }
    } else if (isHeroRelated) {
      setFormAssignedPicIds(['5'])
      toast.info(`Kendala HERO terdeteksi: PIC default ke Admin Mochamad Annas Khadafi.`)
    }
  }

  // Open create dialog with smart HERO default PIC
  const handleOpenCreateDialog = () => {
    const initialCat = categories[0]
    if (initialCat) {
      setFormCategory(initialCat.name)
      if (initialCat.default_priority) {
        setFormPriority(initialCat.default_priority as any)
      }
      const defaultPics = initialCat.default_assigned_employees || []
      let picIds = Array.isArray(defaultPics) ? defaultPics.map((e: any) => String(e.id)) : []
      const isHeroRelated =
        initialCat.code?.startsWith('HERO_') ||
        (initialCat as any)?.is_system_issue === true ||
        initialCat.name.toLowerCase().includes('hero')

      if (isHeroRelated && !picIds.includes('5')) {
        picIds = ['5', ...picIds]
      }
      setFormAssignedPicIds(picIds)
    }
    setCreateDialogOpen(true)
  }

  // Create ticket handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Mohon lengkapi judul dan deskripsi temuan kendala')
      return
    }

    const assignedObjs = formAssignedPicIds
      .map((id) => {
        const emp = employees.find((e) => String(e.id) === id)
        return emp ? { id: emp.id, name: emp.name, employeeSn: emp.employee_sn, role: emp.role } : null
      })
      .filter(Boolean) as Array<{ id: number; name: string; employeeSn?: string; role?: string }>

    startTransition(async () => {
      const res = await createTroubleshootTicket({
        unitCode: formUnitCode.trim() || undefined,
        siteId: parseInt(formSiteId, 10),
        categoryName: formCategory,
        priority: formPriority,
        title: formTitle,
        findingDescription: formDescription,
        sourceDetail: formSourceDetail,
        assignedEmployees: assignedObjs,
        attachments: formAttachments,
      })

      if (res.success) {
        toast.success(`Tiket ${res.ticketNumber} berhasil didaftarkan! Masuk Antrian #${res.queuePosition || 1}`)
        setCreateDialogOpen(false)
        setFormTitle('')
        setFormDescription('')
        setFormUnitCode('')
        setFormAssignedPicIds([])
        setFormAttachments([])

        const newTicketItem: TroubleshootTicketItem = {
          id: res.ticketId || Date.now(),
          ticketNumber: res.ticketNumber || 'TKT-NEW',
          unitCode: formUnitCode.trim() || null,
          systemModule: 'General',
          siteId: parseInt(formSiteId, 10),
          siteName: sites.find((s) => String(s.id) === formSiteId)?.name || 'Central',
          categoryId: null,
          categoryName: formCategory,
          reporterEmployeeId: currentEmployee.id,
          reporterName: currentEmployee.name,
          priority: formPriority,
          status: assignedObjs.length > 0 ? 'assigned' : 'baru',
          assignedEmployeeId: assignedObjs[0]?.id || null,
          assignedEmployeeName: res.assignedPicName || assignedObjs[0]?.name || null,
          assignedRole: assignedObjs[0]?.role || null,
          assignedEmployees: assignedObjs,
          title: formTitle,
          findingDescription: formDescription,
          sourceType: 'user_report',
          sourceDetail: formSourceDetail,
          detectedAt: new Date().toISOString(),
          targetSlaAt: new Date(Date.now() + (res.slaHours || 24) * 3600 * 1000).toISOString(),
          resolvedAt: null,
          ageStr: 'Baru saja',
          slaLabel: 'Dalam Batas SLA',
          isOverdue: false,
          mttrHours: null,
          attachments: formAttachments,
          queuePosition: res.queuePosition || 1,
          totalActiveQueueForPic: res.totalQueueForPic || 1,
          estimatedWaitHours: res.estimatedWaitHours || 0,
          estimatedStartAt: res.estimatedStartAt,
          estimatedResolutionAt: res.estimatedResolutionAt,
        }

        setCreatedTicketInfo({
          ticketNumber: res.ticketNumber || 'TKT-NEW',
          ticketId: res.ticketId || newTicketItem.id,
          queuePosition: res.queuePosition || 1,
          totalQueueForPic: res.totalQueueForPic || 1,
          estimatedWaitHours: res.estimatedWaitHours || 0,
          estimatedStartAt: res.estimatedStartAt,
          estimatedResolutionAt: res.estimatedResolutionAt,
          assignedPicName: res.assignedPicName || assignedObjs[0]?.name || 'Admin HERO',
          priority: formPriority,
          categoryName: formCategory,
          title: formTitle,
          slaHours: res.slaHours || 24,
        })
        setCreatedTicketModalOpen(true)

        setTickets((prev) => [newTicketItem, ...prev])
        setSelectedTicket(newTicketItem)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal membuat tiket')
      }
    })
  }

  // Open Admin Edit Modal
  const handleOpenAdminEdit = (t: TroubleshootTicketItem) => {
    setEditTicketId(t.id)
    setEditTitle(t.title)
    setEditDescription(t.findingDescription)
    setEditCategory(t.categoryName)
    setEditPriority(t.priority)
    setEditStatus(t.status)
    setEditSiteId(String(t.siteId))
    setEditUnitCode(t.unitCode || '')
    const picIds = (t.assignedEmployees || []).map((e) => String(e.id))
    if (picIds.length === 0 && t.assignedEmployeeId) {
      picIds.push(String(t.assignedEmployeeId))
    }
    setEditPicIds(picIds)
    setEditTargetSla(t.targetSlaAt ? t.targetSlaAt.substring(0, 16) : '')
    setAdminEditOpen(true)
  }

  // Admin Save Edit Handler
  const handleAdminSaveEdit = async () => {
    if (!editTicketId) return
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error('Judul dan deskripsi tidak boleh kosong.')
      return
    }

    const assignedObjs = editPicIds
      .map((id) => {
        const emp = employees.find((e) => String(e.id) === id)
        return emp ? { id: emp.id, name: emp.name, employeeSn: emp.employee_sn, role: emp.role } : null
      })
      .filter(Boolean) as Array<{ id: number; name: string; employeeSn?: string; role?: string }>

    const payload: AdminEditTicketInput = {
      title: editTitle.trim(),
      findingDescription: editDescription.trim(),
      categoryName: editCategory,
      priority: editPriority,
      status: editStatus,
      siteId: parseInt(editSiteId, 10),
      unitCode: editUnitCode.trim() || undefined,
      targetSlaAt: editTargetSla || undefined,
      assignedEmployees: assignedObjs,
    }

    startTransition(async () => {
      const res = await updateTicketAdminAction(editTicketId, payload)
      if (res.success) {
        toast.success(res.message || 'Tiket berhasil diperbarui oleh Admin.')
        setAdminEditOpen(false)
        setTickets((prev) =>
          prev.map((t) =>
            t.id === editTicketId
              ? {
                  ...t,
                  title: payload.title,
                  findingDescription: payload.findingDescription,
                  categoryName: payload.categoryName,
                  priority: payload.priority,
                  status: payload.status,
                  siteId: payload.siteId || t.siteId,
                  unitCode: payload.unitCode || null,
                  assignedEmployees: assignedObjs,
                  assignedEmployeeId: assignedObjs[0]?.id || null,
                  assignedEmployeeName: assignedObjs[0]?.name || null,
                }
              : t
          )
        )
        if (selectedTicket?.id === editTicketId) {
          setSelectedTicket((prev) =>
            prev
              ? {
                  ...prev,
                  title: payload.title,
                  findingDescription: payload.findingDescription,
                  categoryName: payload.categoryName,
                  priority: payload.priority,
                  status: payload.status,
                  siteId: payload.siteId || prev.siteId,
                  unitCode: payload.unitCode || null,
                  assignedEmployees: assignedObjs,
                  assignedEmployeeId: assignedObjs[0]?.id || null,
                  assignedEmployeeName: assignedObjs[0]?.name || null,
                }
              : null
          )
          getTicketActivitiesAction(editTicketId).then(setActivities)
        }
      } else {
        toast.error(res.error || 'Gagal memperbarui tiket.')
      }
    })
  }

  // Admin Single Delete Handler
  const handleConfirmSingleDelete = async () => {
    if (!ticketToDelete) return
    setIsProcessingDelete(true)
    try {
      const res = await deleteTicketAdminAction(ticketToDelete.id)
      if (res.success) {
        toast.success(`Tiket ${ticketToDelete.ticketNumber} berhasil dihapus permanen.`)
        setTickets((prev) => prev.filter((t) => t.id !== ticketToDelete.id))
        setSelectedTicketIds((prev) => prev.filter((id) => id !== ticketToDelete.id))
        if (selectedTicket?.id === ticketToDelete.id) {
          setSelectedTicket(tickets.find((t) => t.id !== ticketToDelete.id) || null)
        }
        setSingleDeleteConfirmOpen(false)
        setTicketToDelete(null)
      } else {
        toast.error(res.error || 'Gagal menghapus tiket.')
      }
    } finally {
      setIsProcessingDelete(false)
    }
  }

  // Admin Bulk Delete Handler
  const handleConfirmBulkDelete = async () => {
    if (selectedTicketIds.length === 0) return
    setIsProcessingDelete(true)
    try {
      const res = await bulkDeleteTicketsAction(selectedTicketIds)
      if (res.success) {
        toast.success(`${res.deletedCount} tiket terpilih berhasil dihapus permanen.`)
        setTickets((prev) => prev.filter((t) => !selectedTicketIds.includes(t.id)))
        if (selectedTicket && selectedTicketIds.includes(selectedTicket.id)) {
          setSelectedTicket(tickets.find((t) => !selectedTicketIds.includes(t.id)) || null)
        }
        setSelectedTicketIds([])
        setBulkDeleteConfirmOpen(false)
      } else {
        toast.error(res.error || 'Gagal menghapus tiket secara massal.')
      }
    } finally {
      setIsProcessingDelete(false)
    }
  }

  // Bulk selection toggles
  const handleToggleSelectAll = () => {
    if (selectedTicketIds.length === filteredTickets.length) {
      setSelectedTicketIds([])
    } else {
      setSelectedTicketIds(filteredTickets.map((t) => t.id))
    }
  }

  const handleToggleSelectRow = (ticketId: number) => {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    )
  }

  // Quick Status change
  const handleUpdateStatus = async () => {
    if (!selectedTicket) return
    startTransition(async () => {
      const res = await updateTicketStatusAction(
        selectedTicket.id,
        newStatus as any,
        statusNotes.trim() || undefined
      )
      if (res.success) {
        toast.success(`Status tiket ${selectedTicket.ticketNumber} diubah ke ${newStatus.toUpperCase()}`)
        setStatusDialogOpen(false)
        setStatusNotes('')
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null))
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus as any } : t))
        )
        getTicketActivitiesAction(selectedTicket.id).then(setActivities)
      } else {
        toast.error(res.error || 'Gagal mengubah status tiket')
      }
    })
  }

  // Add Note
  const handleAddNote = async () => {
    if (!selectedTicket || !newNote.trim()) return
    startTransition(async () => {
      const res = await addTicketNoteAction(selectedTicket.id, newNote.trim())
      if (res.success) {
        toast.success('Catatan berhasil ditambahkan ke riwayat aktivitas')
        setNoteDialogOpen(false)
        setNewNote('')
        getTicketActivitiesAction(selectedTicket.id).then(setActivities)
      } else {
        toast.error(res.error || 'Gagal menambahkan catatan')
      }
    })
  }

  // Escalate
  const handleEscalate = async () => {
    if (!selectedTicket) return
    startTransition(async () => {
      const res = await escalateTicketAction(
        selectedTicket.id,
        escalateReason.trim() || 'Eskalasi prioritas KRITIS'
      )
      if (res.success) {
        toast.success(`Tiket ${selectedTicket.ticketNumber} berhasil dieskalasi ke status Kritis!`)
        setEscalateDialogOpen(false)
        setEscalateReason('')
        setSelectedTicket((prev) => (prev ? { ...prev, priority: 'kritis' } : null))
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, priority: 'kritis' } : t))
        )
        getTicketActivitiesAction(selectedTicket.id).then(setActivities)
      } else {
        toast.error(res.error || 'Gagal melakukan eskalasi')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-[1700px] mx-auto w-full">
      {/* ─── Top Header & Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Troubleshoot &amp; Service Desk Command Center
            </h1>
            {isAdmin && (
              <Badge className="bg-amber-600 text-white font-semibold text-xs px-2.5 py-0.5 gap-1 shadow-xs">
                <IconShieldCheck className="size-3.5" />
                Mode Admin Aktif
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemantauan real-time kendala telematika sensor, bug sistem HERO, dan penugasan multi-teknisi antar-departemen.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
          >
            <Link href="/dashboard/helpdesk/settings">
              <IconSettings className="size-4 text-slate-500" />
              Pengaturan Routing &amp; Template
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="h-9 gap-1.5 text-xs font-semibold text-slate-700 bg-white"
          >
            {showAnalytics ? <IconChevronUp className="size-4" /> : <IconChevronDown className="size-4" />}
            {showAnalytics ? 'Tutup Grafik' : 'Buka Grafik Analisis'}
          </Button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <IconTable className="size-3.5" />
              Tabel Rinci
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                viewMode === 'kanban'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <IconLayoutKanban className="size-3.5" />
              Kanban
            </button>
          </div>

          <Button
            onClick={handleOpenCreateDialog}
            size="sm"
            className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <IconPlus className="size-4" />
            + Buat Tiket
          </Button>
        </div>
      </div>

      {/* ─── 4 Maestro-Grade KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Tiket Aktif"
          value={kpiStats.active}
          theme="blue"
          icon={IconListDetails}
          description="Tiket berjalan & butuh penanganan"
          trend={{ value: `${kpiStats.total} total sistem`, isPositive: true }}
        />
        <HeroKpiCard
          title="Kritis & Overdue"
          value={kpiStats.criticalOverdue}
          theme="rose"
          icon={IconAlertTriangle}
          description="Melewati batas SLA / Kritis"
          trend={{ value: `${tickets.filter((t) => t.isOverdue).length} SLA overdue`, isPositive: false }}
        />
        <HeroKpiCard
          title="Dalam Investigasi"
          value={kpiStats.investigating}
          theme="amber"
          icon={IconClock}
          description="Teknisi sedang menganalisis akar masalah"
          trend={{ value: `${tickets.filter((t) => t.status === 'assigned').length} ditugaskan`, isPositive: true }}
        />
        <HeroKpiCard
          title="SLA Compliance Rate"
          value={`${kpiStats.complianceRate}%`}
          theme="emerald"
          icon={IconCheck}
          description="Kepatuhan resolusi tepat waktu"
          trend={{ value: `${kpiStats.completed} tiket selesai`, isPositive: true }}
        />
      </div>

      {/* ─── Interactive Maestro-Grade Recharts Analytics ─────────────────── */}
      {showAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          {/* 1. SLA Performance Donut Chart */}
          <div className="flex flex-col p-4 rounded-lg bg-slate-50/70 border border-slate-200/60">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Kepatuhan SLA &amp; Resolusi
              </span>
              <span className="text-xs font-bold text-emerald-600">{kpiStats.complianceRate}% On-Track</span>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slaChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {slaChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SLA_CHART_COLORS[index % SLA_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-around text-xs text-slate-600 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span>Selesai ({kpiStats.completed})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-blue-500" />
                <span>On-Track ({kpiStats.onTrack})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500" />
                <span>Kritis ({kpiStats.criticalOverdue})</span>
              </div>
            </div>
          </div>

          {/* 2. Top Finding Categories Horizontal Bar Chart */}
          <div className="flex flex-col p-4 rounded-lg bg-slate-50/70 border border-slate-200/60 lg:col-span-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Distribusi Temuan per Kategori / Modul
              </span>
              <span className="text-xs text-slate-500 font-medium">Berdasarkan data riil tiket</span>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats} layout="vertical" margin={{ left: 40, right: 20, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Advanced Multi-User Filter Toolbar ──────────────────── */}
      <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <IconSearch className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. tiket, judul kendala, kode unit, site, atau nama teknisi..."
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <IconX className="size-4" />
              </button>
            )}
          </div>

          {/* Multi-User Filter & Site Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-User PIC Filter */}
            <div className="min-w-[280px]">
              <HeroSearchableSelect
                options={employeeOptions}
                value={selectedPicFilterIds}
                onChange={(val) => setSelectedPicFilterIds(val)}
                isMulti={true}
                placeholder="Filter PIC Multi-User..."
                width="w-full"
              />
            </div>

            {/* Site Filter */}
            <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Pilih Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Site</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || selectedPicFilterIds.length > 0 || selectedSiteFilter !== 'all' || activeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedPicFilterIds([])
                  setSelectedSiteFilter('all')
                  setActiveFilter('all')
                }}
                className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {filterChips.map((chip) => {
            const isSelected = activeFilter === chip.id
            return (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5',
                  isSelected
                    ? chip.isAlert
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Bulk Action Bar for Admin ────────────────────────────────────── */}
      {isAdmin && selectedTicketIds.length > 0 && (
        <div className="flex items-center justify-between p-3 px-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider bg-amber-200 px-2 py-0.5 rounded">
              {selectedTicketIds.length} Terpilih
            </span>
            <span className="text-xs">Tiket siap dihapus secara massal oleh Admin.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTicketIds([])}
              className="h-8 text-xs bg-white"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="h-8 text-xs gap-1 font-semibold shadow-xs"
            >
              <IconTrash className="size-3.5" />
              Hapus ({selectedTicketIds.length}) Tiket Terpilih
            </Button>
          </div>
        </div>
      )}

      {/* ─── Main Content: Kanban or Table + Selected Inspector ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Tickets (Table or Kanban) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {viewMode === 'table' ? (
            /* ─── Data Table View ────────────────────────────────────────── */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Daftar Tiket Kendala ({filteredTickets.length})
                  </span>
                </div>
                <div className="text-xs text-slate-500">Klik baris tiket untuk melihat rincian di panel kanan</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredTickets.length > 0 &&
                            selectedTicketIds.length === filteredTickets.length
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                        />
                      </th>
                      <th className="py-2.5 px-3">Tiket</th>
                      <th className="py-2.5 px-3">Unit &amp; Site</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Prioritas</th>
                      <th className="py-2.5 px-3">PIC Multi-User</th>
                      <th className="py-2.5 px-3">SLA Status</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-500">
                          <IconListDetails className="size-8 mx-auto text-slate-300 mb-2" />
                          Tidak ada tiket yang cocok dengan filter atau pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((t) => {
                        const isSelected = selectedTicket?.id === t.id
                        const isChecked = selectedTicketIds.includes(t.id)
                        const pConfig = priorityBadgeConfig[t.priority] || priorityBadgeConfig.sedang
                        const sConfig = statusBadgeConfig[t.status] || statusBadgeConfig.baru

                        const multiPics =
                          t.assignedEmployees && t.assignedEmployees.length > 0
                            ? t.assignedEmployees
                            : t.assignedEmployeeName
                              ? [{ id: t.assignedEmployeeId || 0, name: t.assignedEmployeeName }]
                              : []

                        return (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTicket(t)}
                            className={cn(
                              'cursor-pointer transition-colors hover:bg-blue-50/40',
                              isSelected && 'bg-blue-50/80 font-medium',
                              isChecked && 'bg-amber-50/60'
                            )}
                          >
                            <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectRow(t.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-700">{t.ticketNumber}</span>
                                {t.queuePosition && ['baru', 'assigned', 'investigasi', 'menunggu_part'].includes(t.status) && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] px-1.5 py-0 font-bold',
                                      t.queuePosition === 1
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : t.queuePosition <= 3
                                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                                          : 'bg-amber-50 text-amber-800 border-amber-300'
                                    )}
                                  >
                                    Q#{t.queuePosition}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{t.unitCode || '-'}</div>
                              <div className="text-[11px] text-slate-500">{t.siteName}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-slate-800 line-clamp-1">{t.categoryName}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge className={cn('text-[10px] px-2 py-0.5', pConfig.className)}>
                                {pConfig.label}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              {multiPics.length === 0 ? (
                                <span className="text-slate-400 italic">Belum di-assign</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {multiPics.slice(0, 2).map((pic, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200"
                                    >
                                      <IconUser className="size-2.5 text-slate-500" />
                                      {pic.name.split(' ')[0]}
                                    </span>
                                  ))}
                                  {multiPics.length > 2 && (
                                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      +{multiPics.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={cn(
                                  'text-[11px] font-semibold',
                                  t.isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'
                                )}
                              >
                                {t.slaLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge className={cn('text-[10px] px-2 py-0.5', sConfig.className)}>
                                {sConfig.label}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenAdminEdit(t)}
                                  title="Edit Rincian Tiket"
                                  className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <IconPencil className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setTicketToDelete(t)
                                    setSingleDeleteConfirmOpen(true)
                                  }}
                                  title="Hapus Tiket"
                                  className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <IconTrash className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ─── Kanban Pipeline View ───────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {(['baru', 'assigned', 'investigasi', 'menunggu_part', 'selesai'] as const).map((colKey) => {
                const colTickets = filteredTickets.filter((t) => t.status === colKey)
                const colTitle: Record<string, string> = {
                  baru: 'Baru',
                  assigned: 'Assigned',
                  investigasi: 'Investigasi',
                  menunggu_part: 'Menunggu Part',
                  selesai: 'Selesai',
                }

                return (
                  <div
                    key={colKey}
                    className="flex flex-col rounded-xl bg-slate-100/90 border border-slate-200/80 p-2.5 min-h-[500px]"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 px-1">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                        {colTitle[colKey]}
                      </span>
                      <span className="bg-white text-slate-800 font-bold text-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        {colTickets.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[680px]">
                      {colTickets.map((t) => {
                        const isSelected = selectedTicket?.id === t.id
                        const pConfig = priorityBadgeConfig[t.priority] || priorityBadgeConfig.sedang
                        const multiPics =
                          t.assignedEmployees && t.assignedEmployees.length > 0
                            ? t.assignedEmployees
                            : t.assignedEmployeeName
                              ? [{ id: t.assignedEmployeeId || 0, name: t.assignedEmployeeName }]
                              : []

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTicket(t)}
                            className={cn(
                              'cursor-pointer p-3 bg-white rounded-lg border border-slate-200 shadow-2xs transition-all hover:shadow-xs hover:border-blue-400 flex flex-col gap-1.5',
                              isSelected && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20',
                              pConfig.borderClass
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-blue-700">{t.ticketNumber}</span>
                                {t.queuePosition && ['baru', 'assigned', 'investigasi', 'menunggu_part'].includes(t.status) && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[9px] px-1 py-0 font-bold',
                                      t.queuePosition === 1
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : t.queuePosition <= 3
                                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                                          : 'bg-amber-50 text-amber-800 border-amber-300'
                                    )}
                                  >
                                    Q#{t.queuePosition}
                                  </Badge>
                                )}
                              </div>
                              <Badge className={cn('text-[9px] px-1.5 py-0', pConfig.className)}>
                                {pConfig.label}
                              </Badge>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                              {t.title}
                            </h4>
                            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                              <span>{t.unitCode || t.siteName}</span>
                              <span className={cn(t.isOverdue && 'text-red-600 font-semibold')}>
                                {t.slaLabel}
                              </span>
                            </div>

                            {/* Multi-PIC Badges in card */}
                            {multiPics.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {multiPics.map((pic, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-medium border border-slate-200"
                                  >
                                    <IconUser className="size-2 text-slate-400" />
                                    {pic.name.split(' ')[0]}
                                  </span>
                                ))}
                              </div>
                            )}

                            {isAdmin && (
                              <div
                                className="flex items-center justify-end gap-1 pt-1.5 border-t border-slate-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleOpenAdminEdit(t)}
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  <IconPencil className="size-3" /> Edit
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  onClick={() => {
                                    setTicketToDelete(t)
                                    setSingleDeleteConfirmOpen(true)
                                  }}
                                  className="text-[10px] text-rose-600 hover:underline flex items-center gap-0.5"
                                >
                                  <IconTrash className="size-3" /> Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Ticket Inspector Panel */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-4 sticky top-6">
          {selectedTicket ? (
            <div className="flex flex-col gap-4">
              {/* Header Inspector */}
              <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-700">
                      {selectedTicket.ticketNumber}
                    </span>
                    <Badge
                      className={cn(
                        'text-[10px] px-2 py-0.5',
                        statusBadgeConfig[selectedTicket.status]?.className
                      )}
                    >
                      {statusBadgeConfig[selectedTicket.status]?.label}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">
                    {selectedTicket.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAdminEdit(selectedTicket)}
                    className="h-8 px-2.5 text-xs font-semibold text-blue-700 bg-blue-50/80 border-blue-200 hover:bg-blue-100 gap-1.5 shadow-2xs"
                    title="Edit rincian tiket ini"
                  >
                    <IconPencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTicketToDelete(selectedTicket)
                      setSingleDeleteConfirmOpen(true)
                    }}
                    className="h-8 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50/80 border-rose-200 hover:bg-rose-100 gap-1.5 shadow-2xs"
                    title="Hapus tiket ini secara permanen"
                  >
                    <IconTrash className="size-3.5" />
                    Hapus
                  </Button>
                </div>
              </div>

              {/* Dynamic Queue Position & Estimated Time Card */}
              {['baru', 'assigned', 'investigasi', 'menunggu_part'].includes(selectedTicket.status) && (
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-500/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                      <IconClock className="size-4 text-amber-600" />
                      Status Antrian Pengerjaan
                    </div>
                    <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-0.5 shadow-2xs">
                      Antrian #{selectedTicket.queuePosition || 1}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-amber-900/90 leading-relaxed">
                    Tiket ini berada pada <span className="font-bold">Antrian ke-{selectedTicket.queuePosition || 1}</span> dari total <span className="font-bold">{selectedTicket.totalActiveQueueForPic || 1} tiket aktif</span> yang ditangani oleh PIC <span className="font-bold">{selectedTicket.assignedEmployeeName || 'Admin HERO'}</span>.
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/80 text-[11px]">
                    <div>
                      <span className="text-amber-800/70 block text-[10px] font-semibold uppercase">Est. Mulai Ditangani</span>
                      <span className="font-bold text-amber-950">
                        {(selectedTicket.estimatedWaitHours || 0) === 0 ? 'Segera / Prioritas Aktif' : `~${selectedTicket.estimatedWaitHours} Jam lagi`}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-800/70 block text-[10px] font-semibold uppercase">Target Estimasi Selesai</span>
                      <span className="font-bold text-amber-950">
                        {new Date(selectedTicket.targetSlaAt).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })} WIB
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Core Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unit / Site</span>
                  <span className="font-bold text-slate-900">{selectedTicket.unitCode || '-'}</span>
                  <span className="text-slate-500 block text-[11px]">{selectedTicket.siteName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Prioritas &amp; SLA</span>
                  <span
                    className={cn(
                      'font-bold capitalize',
                      selectedTicket.priority === 'kritis' ? 'text-red-600' : 'text-slate-900'
                    )}
                  >
                    {selectedTicket.priority}
                  </span>
                  <span className={cn('block text-[11px]', selectedTicket.isOverdue && 'text-red-600 font-bold')}>
                    {selectedTicket.slaLabel}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kategori Temuan</span>
                  <span className="font-medium text-slate-800">{selectedTicket.categoryName}</span>
                </div>
              </div>

              {/* Multi-PIC Assigned Section */}
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">
                  Teknisi / PIC Penanggungjawab
                </span>
                {selectedTicket.assignedEmployees && selectedTicket.assignedEmployees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedTicket.assignedEmployees.map((pic, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-white text-slate-800 px-2.5 py-1 rounded-md text-xs font-semibold border border-blue-200 shadow-2xs"
                      >
                        <IconUser className="size-3 text-blue-600" />
                        {pic.name} {pic.role && <span className="text-[10px] text-slate-400">({pic.role})</span>}
                      </span>
                    ))}
                  </div>
                ) : selectedTicket.assignedEmployeeName ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <IconUser className="size-3.5 text-blue-600" />
                    {selectedTicket.assignedEmployeeName}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Belum ada teknisi ditugaskan</span>
                )}
              </div>

              {/* Finding Description */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Deskripsi &amp; Detail Temuan:
                </span>
                <p className="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedTicket.findingDescription}
                </p>
              </div>

              {/* Attachments & Photos with Lightbox Popup */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Lampiran Foto &amp; Dokumen ({selectedTicket.attachments.length}):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTicket.attachments.map((att, idx) => {
                      const resolved = resolveUploadUrl(att.url)
                      const isImg = att.type?.startsWith('image') || /\.(png|jpe?g|webp|gif)$/i.test(att.url)
                      return (
                        <div
                          key={idx}
                          onClick={() => isImg && setPreviewImage(resolved)}
                          className={cn(
                            'group relative rounded-lg border border-slate-200 bg-slate-50 p-2 overflow-hidden flex flex-col gap-1',
                            isImg && 'cursor-pointer hover:border-blue-400'
                          )}
                        >
                          {isImg ? (
                            <div className="relative aspect-video w-full rounded overflow-hidden bg-slate-200">
                              <img src={resolved} alt={att.name} className="size-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <IconZoomIn className="size-5" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <IconFolder className="size-4 text-blue-600" />
                              <span className="text-xs font-medium truncate">{att.name}</span>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-500 truncate">{att.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setNewStatus(selectedTicket.status)
                    setStatusDialogOpen(true)
                  }}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                >
                  Update Status
                </Button>
                <Button
                  onClick={() => setNoteDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                >
                  Tambah Catatan
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPicIdsForAssign(
                      (selectedTicket.assignedEmployees || []).map((e) => String(e.id))
                    )
                    setAssignDialogOpen(true)
                  }}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                >
                  Tugaskan PIC
                </Button>
                <Button
                  onClick={() => setEscalateDialogOpen(true)}
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs font-semibold"
                >
                  Eskalasi
                </Button>
              </div>

              {/* Edit & Delete Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <Button
                  onClick={() => handleOpenAdminEdit(selectedTicket)}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 text-blue-700 bg-blue-50/70 border-blue-200 hover:bg-blue-100"
                >
                  <IconPencil className="size-3.5" />
                  Edit Rincian Tiket
                </Button>
                <Button
                  onClick={() => {
                    setTicketToDelete(selectedTicket)
                    setSingleDeleteConfirmOpen(true)
                  }}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 text-rose-700 bg-rose-50/70 border-rose-200 hover:bg-rose-100"
                >
                  <IconTrash className="size-3.5" />
                  Hapus Tiket
                </Button>
              </div>

              {/* Activity Audit Trail */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Riwayat Aktivitas &amp; Log
                </span>
                {loadingActivities ? (
                  <div className="text-xs text-slate-400 py-3 text-center">Memuat aktivitas...</div>
                ) : activities.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2 text-center">Belum ada riwayat aktivitas.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {activities.map((act) => (
                      <div key={act.id} className="p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>{act.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {act.description && <p className="text-slate-600 mt-0.5">{act.description}</p>}
                        <span className="text-[10px] text-slate-400 mt-1 block">Oleh: {act.actorName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              Pilih salah satu tiket dari tabel atau kanban untuk melihat detail rincian.
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL: CREATE TICKET (With Multi-User PIC & Upload) ──────────── */}
      <HeroFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Buat Tiket Kendala Baru"
        description="Laporkan temuan operasional, telematika sensor, atau kendala sistem HERO."
        submitLabel="Simpan & Buat Tiket"
        onSubmit={handleCreateTicket}
        isSubmitting={isPending}
        maxWidth="lg"
      >
        <div className="flex flex-col gap-3 py-2 text-xs">
          {/* Quick Problem Template Selector */}
          {templates.length > 0 && (
            <HeroFormField
              label="Pilih Template Cepat (Opsional)"
              description="Pilih template kendala untuk otomatis mengisi judul, prioritas, deskripsi, dan teknisi PIC"
            >
              <Select value={selectedTemplateId} onValueChange={(tplId) => handleSelectTemplate(tplId)}>
                <SelectTrigger className="h-9 text-xs bg-blue-50/40 border-blue-200">
                  <SelectValue placeholder="Pilih Template Kendala Siap Pakai..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">-- Tanpa Template (Isi Manual) --</SelectItem>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={String(tpl.id)}>
                      {tpl.template_name} ({tpl.category_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HeroFormField>
          )}

          <HeroFormField label="Judul Kendala *" description="Deskripsi singkat masalah yang ditemukan">
            <HeroInput
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Contoh: Gagal sinkronisasi data roster lembur / Kendala GPS presensi"
              required
            />
          </HeroFormField>

          <div className="grid grid-cols-2 gap-3">
            <HeroFormField label="Kategori Temuan *">
              <Select value={formCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HeroFormField>

            <HeroFormField label="Prioritas & Target SLA *">
              <Select value={formPriority} onValueChange={(v: any) => setFormPriority(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kritis">Kritis (SLA 6 Jam)</SelectItem>
                  <SelectItem value="tinggi">Tinggi (SLA 12 Jam)</SelectItem>
                  <SelectItem value="sedang">Sedang (SLA 24 Jam)</SelectItem>
                  <SelectItem value="rendah">Rendah (SLA 48 Jam)</SelectItem>
                </SelectContent>
              </Select>
            </HeroFormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroFormField label="Lokasi Site *">
              <Select value={formSiteId} onValueChange={setFormSiteId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HeroFormField>

            <HeroFormField label="Kode Unit / Modul (Opsional)">
              <HeroInput
                value={formUnitCode}
                onChange={(e) => setFormUnitCode(e.target.value)}
                placeholder="Contoh: C02345 / Timesheet"
              />
            </HeroFormField>
          </div>

          {/* Multi-User PIC Select in Creation Form */}
          <HeroFormField
            label="Tugaskan Teknisi / PIC (Multi-User Select)"
            description="Pilih satu atau lebih teknisi penanggungjawab tiket ini"
          >
            <HeroSearchableSelect
              options={employeeOptions}
              value={formAssignedPicIds}
              onChange={(val) => setFormAssignedPicIds(val)}
              isMulti={true}
              placeholder="Pilih beberapa teknisi penanggungjawab..."
              width="w-full"
            />
          </HeroFormField>

          <HeroFormField label="Rincian Deskripsi Temuan *">
            <HeroTextarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Jelaskan secara rinci kondisi kendala, dampak pada operasional, dan lokasi temuan..."
              rows={3}
              required
            />
          </HeroFormField>

          {/* Upload Attachments */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-semibold text-slate-800 text-xs">Lampiran Foto / Bukti Temuan (S3 Persisten)</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handlePhotoUpload}
              disabled={isUploadingPhoto}
              className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {isUploadingPhoto && <span className="text-xs text-blue-600 font-medium">Mengunggah berkas ke S3...</span>}

            {formAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 text-xs"
                  >
                    <span className="truncate max-w-[150px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => setFormAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <IconX className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </HeroFormDialog>

      {/* ─── MODAL: ADMIN EDIT TICKET (FULL CONTROLS) ────────────────────── */}
      <HeroFormDialog
        open={adminEditOpen}
        onOpenChange={setAdminEditOpen}
        title="Admin: Edit Rincian Tiket Menyeluruh"
        description="Hak akses khusus Admin untuk memperbarui status, multi-PIC, prioritas, kategori, dan SLA."
        submitLabel="Simpan Perubahan Admin"
        onSubmit={(e) => {
          e.preventDefault()
          handleAdminSaveEdit()
        }}
        isSubmitting={isPending}
        maxWidth="lg"
      >
        <div className="flex flex-col gap-3 py-2 text-xs">
          <HeroFormField label="Judul Kendala *">
            <HeroInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
          </HeroFormField>

          <div className="grid grid-cols-2 gap-3">
            <HeroFormField label="Kategori *">
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HeroFormField>

            <HeroFormField label="Prioritas *">
              <Select value={editPriority} onValueChange={(v: any) => setEditPriority(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kritis">Kritis</SelectItem>
                  <SelectItem value="tinggi">Tinggi</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="rendah">Rendah</SelectItem>
                </SelectContent>
              </Select>
            </HeroFormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroFormField label="Status Tiket *">
              <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baru">Baru</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="investigasi">Investigasi</SelectItem>
                  <SelectItem value="menunggu_part">Menunggu Part</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </HeroFormField>

            <HeroFormField label="Lokasi Site *">
              <Select value={editSiteId} onValueChange={setEditSiteId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HeroFormField>
          </div>

          {/* Admin Multi-User PIC Select */}
          <HeroFormField
            label="Tugaskan Teknisi / PIC (Multi-User Select)"
            description="Tambahkan atau ubah PIC yang bertanggungjawab"
          >
            <HeroSearchableSelect
              options={employeeOptions}
              value={editPicIds}
              onChange={(val) => setEditPicIds(val)}
              isMulti={true}
              placeholder="Pilih teknisi penanggungjawab..."
              width="w-full"
            />
          </HeroFormField>

          <HeroFormField label="Deskripsi Temuan *">
            <HeroTextarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              required
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* ─── MODAL: ADMIN SINGLE DELETE CONFIRM ───────────────────────────── */}
      <HeroConfirmDialog
        open={singleDeleteConfirmOpen}
        onOpenChange={setSingleDeleteConfirmOpen}
        title="Hapus Tiket Secara Permanen?"
        description={
          <span>
            Tindakan ini tidak dapat dibatalkan. Tiket{' '}
            <strong className="text-slate-900">{ticketToDelete?.ticketNumber}</strong> ({ticketToDelete?.title}) beserta
            seluruh riwayat aktivitasnya akan dihapus permanen dari database HERO.
          </span>
        }
        confirmLabel="Ya, Hapus Tiket"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isProcessingDelete}
        onConfirm={handleConfirmSingleDelete}
      />

      {/* ─── MODAL: ADMIN BULK DELETE CONFIRM ─────────────────────────────── */}
      <HeroConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title={`Hapus ${selectedTicketIds.length} Tiket Terpilih?`}
        description={
          <span>
            Apakah Anda yakin ingin menghapus <strong className="text-rose-700">{selectedTicketIds.length} tiket</strong>{' '}
            secara permanen? Seluruh riwayat aktivitas terkait juga akan dibersihkan. Tindakan ini tidak dapat
            dibatalkan.
          </span>
        }
        confirmLabel={`Hapus ${selectedTicketIds.length} Tiket`}
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isProcessingDelete}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* ─── MODAL: QUICK UPDATE STATUS ──────────────────────────────────── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Update Status Tiket</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah tahapan penanganan tiket {selectedTicket?.ticketNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-xs">
            <HeroFormField label="Status Baru">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baru">Baru</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="investigasi">Investigasi</SelectItem>
                  <SelectItem value="menunggu_part">Menunggu Part</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </HeroFormField>
            <HeroFormField label="Catatan Perubahan (Opsional)">
              <HeroTextarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Alasan perubahan atau ringkasan solusi..."
                rows={2}
              />
            </HeroFormField>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(false)} className="h-9">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateStatus}
              disabled={isPending}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Simpan Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ADD NOTE ─────────────────────────────────────────────── */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tambah Catatan Penanganan</DialogTitle>
            <DialogDescription className="text-xs">
              Catatan akan tercatat secara resmi pada log aktivitas tiket.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs">
            <HeroTextarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Tuliskan catatan teknis atau hasil pengecekan..."
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(false)} className="h-9">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={isPending || !newNote.trim()}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Simpan Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ESCALATE ─────────────────────────────────────────────── */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <IconAlertTriangle className="size-5" />
              Eskalasi Tiket ke Kritis
            </DialogTitle>
            <DialogDescription className="text-xs">
              Meningkatkan prioritas tiket menjadi Kritis dan mempercepat batas SLA menjadi 6 jam.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs">
            <HeroFormField label="Alasan Eskalasi">
              <HeroTextarea
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Contoh: Unit breakdown operasional kritis / Sensor tidak merespons > 48 jam"
                rows={3}
                required
              />
            </HeroFormField>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEscalateDialogOpen(false)} className="h-9">
              Batal
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEscalate}
              disabled={isPending}
              className="h-9"
            >
              Eskalasi Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ASSIGN PIC (MULTI-USER) ──────────────────────────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tugaskan PIC / Teknisi</DialogTitle>
            <DialogDescription className="text-xs">
              Tugaskan tiket {selectedTicket?.ticketNumber} kepada satu atau beberapa staf teknis.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs">
            <HeroFormField label="Pilih Teknisi (Multi-User Select)">
              <HeroSearchableSelect
                options={employeeOptions}
                value={selectedPicIdsForAssign}
                onChange={(val) => setSelectedPicIdsForAssign(val)}
                isMulti={true}
                placeholder="Pilih teknisi..."
                width="w-full"
              />
            </HeroFormField>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(false)} className="h-9">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!selectedTicket) return
                const assignedObjs = selectedPicIdsForAssign
                  .map((id) => {
                    const emp = employees.find((e) => String(e.id) === id)
                    return emp ? { id: emp.id, name: emp.name, employeeSn: emp.employee_sn, role: emp.role } : null
                  })
                  .filter(Boolean) as Array<{ id: number; name: string; employeeSn?: string; role?: string }>

                if (assignedObjs.length === 0) {
                  toast.error('Pilih minimal satu teknisi.')
                  return
                }

                startTransition(async () => {
                  const res = await updateTicketAdminAction(selectedTicket.id, {
                    title: selectedTicket.title,
                    findingDescription: selectedTicket.findingDescription,
                    categoryName: selectedTicket.categoryName,
                    priority: selectedTicket.priority,
                    status: selectedTicket.status === 'baru' ? 'assigned' : selectedTicket.status,
                    assignedEmployees: assignedObjs,
                  })
                  if (res.success) {
                    toast.success('Penugasan teknisi berhasil disimpan.')
                    setAssignDialogOpen(false)
                    setSelectedTicket((prev) =>
                      prev
                        ? {
                            ...prev,
                            assignedEmployees: assignedObjs,
                            assignedEmployeeId: assignedObjs[0]?.id || null,
                            assignedEmployeeName: assignedObjs[0]?.name || null,
                            status: prev.status === 'baru' ? 'assigned' : prev.status,
                          }
                        : null
                    )
                    setTickets((prev) =>
                      prev.map((t) =>
                        t.id === selectedTicket.id
                          ? {
                              ...t,
                              assignedEmployees: assignedObjs,
                              assignedEmployeeId: assignedObjs[0]?.id || null,
                              assignedEmployeeName: assignedObjs[0]?.name || null,
                              status: t.status === 'baru' ? 'assigned' : t.status,
                            }
                          : t
                      )
                    )
                    getTicketActivitiesAction(selectedTicket.id).then(setActivities)
                  } else {
                    toast.error(res.error || 'Gagal menugaskan teknisi.')
                  }
                })
              }}
              disabled={isPending}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Simpan Penugasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: LIGHTBOX IMAGE PREVIEW POPUP ─────────────────────────── */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-slate-950/95 border-slate-800 text-white">
          <DialogHeader className="p-3 border-b border-slate-800 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-slate-200">Pratinjau Foto Lampiran</DialogTitle>
            <div className="flex items-center gap-2">
              {previewImage && (
                <a
                  href={previewImage}
                  download="lampiran-kendala"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                >
                  <IconDownload className="size-3.5" /> Unduh Asli
                </a>
              )}
            </div>
          </DialogHeader>
          <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-hidden">
            {previewImage && (
              <img
                src={previewImage}
                alt="Pratinjau foto kendala"
                className="max-h-[70vh] max-w-full object-contain rounded shadow-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ─── MODAL: SUKSES PENDAFTARAN TIKET DENGAN NOMOR ANTRIAN & ESTIMASI ─── */}
      <Dialog open={createdTicketModalOpen} onOpenChange={setCreatedTicketModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-white border-slate-200">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-white/20 backdrop-blur-xs mb-3 ring-4 ring-white/10 mx-auto">
              <IconCheck className="size-6 text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Tiket Berhasil Didaftarkan!</h2>
            <p className="text-xs text-blue-100 mt-1 max-w-sm mx-auto">
              Laporan temuan kendala telah diterima dan dialokasikan ke teknisi PIC penanggungjawab.
            </p>

            {createdTicketInfo && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/25">
                <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Posisi Antrian:</span>
                <span className="font-extrabold text-sm text-amber-300">
                  ANTRIAN #{createdTicketInfo.queuePosition}
                </span>
              </div>
            )}
          </div>

          {createdTicketInfo && (
            <div className="p-6 flex flex-col gap-4 text-xs">
              {/* Card Estimasi & Beban Antrian */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <IconClock className="size-4 text-blue-600" />
                    Perkiraan Estimasi Penanganan
                  </span>
                  <Badge className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5">
                    {createdTicketInfo.queuePosition === 1 ? 'Diproses Segera' : `Antrian ke-${createdTicketInfo.queuePosition}`}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-blue-200/70">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Estimasi Mulai Dikerjakan</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {createdTicketInfo.estimatedWaitHours === 0
                        ? 'Segera / Prioritas Pertama'
                        : `~${createdTicketInfo.estimatedWaitHours} Jam lagi`}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {createdTicketInfo.queuePosition > 1
                        ? `(${createdTicketInfo.queuePosition - 1} tiket sedang antri di depan)`
                        : '(Tidak ada antrian di depan)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Target Estimasi Selesai</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {new Date(createdTicketInfo.estimatedResolutionAt || Date.now()).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} WIB
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Target SLA {createdTicketInfo.slaHours} Jam
                    </span>
                  </div>
                </div>
              </div>

              {/* Rincian Tiket & PIC */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nomor Tiket</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">{createdTicketInfo.ticketNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Teknisi PIC Ditugaskan</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <IconUser className="size-3.5 text-blue-600" />
                    {createdTicketInfo.assignedPicName}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Judul Kendala</span>
                  <span className="font-semibold text-slate-900 line-clamp-1">{createdTicketInfo.title}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCreatedTicketModalOpen(false)}
                  className="h-9 px-4 text-xs"
                >
                  Tutup
                </Button>
                <Button
                  onClick={() => {
                    setCreatedTicketModalOpen(false)
                    const found = tickets.find((t) => t.id === createdTicketInfo.ticketId || t.ticketNumber === createdTicketInfo.ticketNumber)
                    if (found) setSelectedTicket(found)
                  }}
                  className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <IconListDetails className="size-3.5" />
                  Buka Detail Tiket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
