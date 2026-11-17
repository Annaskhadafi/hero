'use client'

import React, { useState, useTransition } from 'react'
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconCpu,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
} from '@/app/actions/service-desk'

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
  categories: Array<{ id: number; code: string; name: string; color: string; default_sla_hours: number }>
  employees: Array<{ id: number; name: string; employee_sn: string; role: string }>
  currentEmployee: { id: number; name: string; email: string }
  initialSelectedTicketId?: number
}

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  baru: { label: 'Baru', className: 'bg-slate-700 hover:bg-slate-800 text-white border-transparent' },
  assigned: { label: 'Assigned', className: 'bg-sky-600 hover:bg-sky-700 text-white border-transparent' },
  investigasi: { label: 'Investigasi', className: 'bg-amber-700 hover:bg-amber-800 text-white border-transparent' },
  menunggu_part: { label: 'Menunggu Part', className: 'bg-slate-600 hover:bg-slate-700 text-white border-transparent' },
  selesai: { label: 'Selesai', className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent' },
  dibatalkan: { label: 'Dibatalkan', className: 'bg-red-200 text-red-800 border-transparent' },
}

const priorityBadgeConfig: Record<string, { label: string; className: string; borderClass: string }> = {
  kritis: { label: 'Kritis', className: 'bg-red-600 hover:bg-red-700 text-white', borderClass: 'border-l-4 border-l-red-500' },
  tinggi: { label: 'Tinggi', className: 'bg-amber-600 hover:bg-amber-700 text-white', borderClass: 'border-l-4 border-l-amber-500' },
  sedang: { label: 'Sedang', className: 'bg-blue-600 hover:bg-blue-700 text-white', borderClass: 'border-l-4 border-l-blue-500' },
  rendah: { label: 'Rendah', className: 'bg-slate-500 hover:bg-slate-600 text-white', borderClass: 'border-l-4 border-l-slate-400' },
}

export function ExcellenceTroubleshootWorkspace({
  initialTickets,
  initialKanban,
  categoryStats,
  siteSummary,
  sites,
  categories,
  employees,
  currentEmployee,
  initialSelectedTicketId,
}: WorkspaceProps) {
  const [isPending, startTransition] = useTransition()
  const [tickets, setTickets] = useState<TroubleshootTicketItem[]>(initialTickets)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Selected Ticket for Inspector Panel
  const defaultSelected =
    initialTickets.find((t) => t.id === initialSelectedTicketId) ||
    initialTickets.find((t) => t.ticketNumber === 'TKT-0031') ||
    initialTickets[0] ||
    null

  const [selectedTicket, setSelectedTicket] = useState<TroubleshootTicketItem | null>(defaultSelected)
  const [activities, setActivities] = useState<TicketActivityItem[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  // Form states
  const [newStatus, setNewStatus] = useState<string>('investigasi')
  const [statusNotes, setStatusNotes] = useState<string>('')
  const [newNote, setNewNote] = useState<string>('')
  const [escalateReason, setEscalateReason] = useState<string>('')
  const [selectedPicName, setSelectedPicName] = useState<string>('')
  const [selectedPicRole, setSelectedPicRole] = useState<string>('Teknisi')

  // Create ticket form states
  const [formUnitCode, setFormUnitCode] = useState('')
  const [formSiteId, setFormSiteId] = useState<string>(sites[0]?.id ? String(sites[0].id) : '1')
  const [formCategory, setFormCategory] = useState<string>(categories[0]?.name || 'TValve Macet')
  const [formPriority, setFormPriority] = useState<'kritis' | 'tinggi' | 'sedang' | 'rendah'>('tinggi')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSourceDetail, setFormSourceDetail] = useState('Pelaporan Pengguna')

  // Load activities when selected ticket changes
  React.useEffect(() => {
    if (!selectedTicket?.id) {
      setActivities([])
      return
    }
    setLoadingActivities(true)
    getTicketActivitiesAction(selectedTicket.id)
      .then((data) => setActivities(data))
      .catch((e) => console.error(e))
      .finally(() => setLoadingActivities(false))
  }, [selectedTicket?.id])

  // Filtered tickets for the table
  const filteredTickets = tickets.filter((t) => {
    // Quick filter chips
    if (activeFilter === 'kritis' && t.priority !== 'kritis') return false
    if (activeFilter === 'overdue' && !t.isOverdue) return false
    if (activeFilter !== 'all' && activeFilter !== 'kritis' && activeFilter !== 'overdue') {
      if (t.categoryName.toLowerCase() !== activeFilter.toLowerCase()) return false
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNum = t.ticketNumber.toLowerCase().includes(q)
      const matchTitle = t.title.toLowerCase().includes(q)
      const matchUnit = (t.unitCode || '').toLowerCase().includes(q)
      const matchSite = t.siteName.toLowerCase().includes(q)
      const matchPic = (t.assignedEmployeeName || '').toLowerCase().includes(q)
      if (!matchNum && !matchTitle && !matchUnit && !matchSite && !matchPic) return false
    }
    return true
  })

  // Quick filter chips list
  const filterChips = [
    { id: 'all', label: `Semua (${tickets.length})` },
    { id: 'Low Pressure Berulang', label: 'Low Pressure Berulang' },
    { id: 'Unit Offline > 24 jam', label: 'Unit Offline' },
    { id: 'Sensor Tidak Respon', label: 'Sensor Tidak Respon' },
    { id: 'TValve Macet', label: 'TValve Macet' },
    { id: 'overdue', label: 'Overdue', isAlert: true },
  ]

  // Handlers
  const handleSelectTicket = (t: TroubleshootTicketItem) => {
    setSelectedTicket(t)
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Mohon lengkapi judul dan deskripsi temuan kendala')
      return
    }

    startTransition(async () => {
      const res = await createTroubleshootTicket({
        unitCode: formUnitCode.trim() || undefined,
        siteId: parseInt(formSiteId, 10),
        categoryName: formCategory,
        priority: formPriority,
        title: formTitle,
        findingDescription: formDescription,
        sourceDetail: formSourceDetail,
      })

      if (res.success) {
        toast.success(`Tiket ${res.ticketNumber} berhasil dibuat dan tercatat di sistem!`)
        setCreateDialogOpen(false)
        // Reset form
        setFormTitle('')
        setFormDescription('')
        setFormUnitCode('')
        // Optimistic refresh
        window.location.reload()
      } else {
        toast.error(res.error || 'Gagal membuat tiket')
      }
    })
  }

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
        // Update local ticket
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null))
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus as any } : t))
        )
        // Refresh activities
        getTicketActivitiesAction(selectedTicket.id).then(setActivities)
      } else {
        toast.error(res.error || 'Gagal mengubah status tiket')
      }
    })
  }

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

  const handleAssignPic = async () => {
    if (!selectedTicket || !selectedPicName.trim()) return
    startTransition(async () => {
      const res = await assignTicketAction(selectedTicket.id, selectedPicName, selectedPicRole)
      if (res.success) {
        toast.success(`Tiket berhasil ditugaskan ke ${selectedPicName}`)
        setAssignDialogOpen(false)
        setSelectedTicket((prev) =>
          prev
            ? {
                ...prev,
                assignedEmployeeName: selectedPicName,
                assignedRole: selectedPicRole,
                status: prev.status === 'baru' ? 'assigned' : prev.status,
              }
            : null
        )
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? {
                  ...t,
                  assignedEmployeeName: selectedPicName,
                  assignedRole: selectedPicRole,
                  status: t.status === 'baru' ? 'assigned' : t.status,
                }
              : t
          )
        )
        getTicketActivitiesAction(selectedTicket.id).then(setActivities)
      } else {
        toast.error(res.error || 'Gagal menugaskan tiket')
      }
    })
  }

  // Max count for category bar chart
  const maxCategoryCount = Math.max(...categoryStats.map((c) => c.count), 1)

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 bg-slate-50/70 min-h-screen text-slate-800">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              <IconTool className="size-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Troubleshooting & Excellence Ticketing System
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat pemantauan real-time kendala operasional, telematika sensor, bug sistem HERO, dan tiket antar-departemen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs"
          >
            <IconPlus className="size-4" />
            Buat Tiket Baru
          </Button>
        </div>
      </div>

      {/* 1. Alur Tiket (Kanban Board Status Penanganan Temuan, Urut Prioritas) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-bold text-slate-900">1. Alur Tiket</h2>
            <span className="text-xs text-slate-500">status penanganan temuan, urut prioritas</span>
          </div>
          <span className="text-xs font-medium text-slate-400">Total: {tickets.length} Tiket Aktif</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Kolom 1: Baru */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Baru</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {initialKanban.baru.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[140px]">
              {initialKanban.baru.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={cn(
                    'p-2.5 rounded-lg border bg-white cursor-pointer transition-all hover:shadow-md hover:border-blue-400',
                    priorityBadgeConfig[t.priority]?.borderClass || 'border-l-4 border-l-slate-300',
                    selectedTicket?.id === t.id && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>
                      {t.ticketNumber} · {t.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium">{t.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>{t.siteName}</span>
                    <span className="text-amber-600 font-medium">belum di-assign</span>
                  </p>
                </div>
              ))}
              {initialKanban.baru.length === 0 && (
                <div className="flex items-center justify-center p-4 border border-dashed rounded-lg text-xs text-slate-400">
                  Tidak ada tiket baru
                </div>
              )}
            </div>
          </div>

          {/* Kolom 2: Assigned */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-100">
              <span className="text-xs font-semibold text-sky-800">Assigned</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-sky-200/70 text-sky-800">
                {initialKanban.assigned.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[140px]">
              {initialKanban.assigned.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={cn(
                    'p-2.5 rounded-lg border bg-white cursor-pointer transition-all hover:shadow-md hover:border-blue-400',
                    priorityBadgeConfig[t.priority]?.borderClass || 'border-l-4 border-l-slate-300',
                    selectedTicket?.id === t.id && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>
                      {t.ticketNumber} · {t.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium">{t.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>{t.siteName}</span>
                    <span className="text-slate-600 font-medium">PIC: {t.assignedEmployeeName || '-'}</span>
                  </p>
                </div>
              ))}
              {initialKanban.assigned.length === 0 && (
                <div className="flex items-center justify-center p-4 border border-dashed rounded-lg text-xs text-slate-400">
                  Kosong
                </div>
              )}
            </div>
          </div>

          {/* Kolom 3: Investigasi */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
              <span className="text-xs font-semibold text-amber-800">Investigasi</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-200/70 text-amber-800">
                {initialKanban.investigasi.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[140px]">
              {initialKanban.investigasi.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={cn(
                    'p-2.5 rounded-lg border bg-white cursor-pointer transition-all hover:shadow-md hover:border-blue-400',
                    priorityBadgeConfig[t.priority]?.borderClass || 'border-l-4 border-l-slate-300',
                    selectedTicket?.id === t.id && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>
                      {t.ticketNumber} · {t.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium">{t.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>{t.siteName}</span>
                    <span className="text-slate-600 font-medium">PIC: {t.assignedEmployeeName || '-'}</span>
                  </p>
                </div>
              ))}
              {initialKanban.investigasi.length === 0 && (
                <div className="flex items-center justify-center p-4 border border-dashed rounded-lg text-xs text-slate-400">
                  Kosong
                </div>
              )}
            </div>
          </div>

          {/* Kolom 4: Menunggu Part */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-100">
              <span className="text-xs font-semibold text-purple-800">Menunggu Part</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-purple-200/70 text-purple-800">
                {initialKanban.menunggu_part.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[140px]">
              {initialKanban.menunggu_part.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={cn(
                    'p-2.5 rounded-lg border bg-white cursor-pointer transition-all hover:shadow-md hover:border-blue-400',
                    priorityBadgeConfig[t.priority]?.borderClass || 'border-l-4 border-l-slate-300',
                    selectedTicket?.id === t.id && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>
                      {t.ticketNumber} · {t.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium">{t.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>{t.siteName}</span>
                    <span className="text-slate-600 font-medium">stok part / PO</span>
                  </p>
                </div>
              ))}
              {initialKanban.menunggu_part.length === 0 && (
                <div className="flex items-center justify-center p-4 border border-dashed rounded-lg text-xs text-slate-400">
                  Kosong
                </div>
              )}
            </div>
          </div>

          {/* Kolom 5: Selesai */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-800">Selesai (7 hari)</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800">
                {initialKanban.selesai.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[140px]">
              {initialKanban.selesai.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={cn(
                    'p-2.5 rounded-lg border bg-white cursor-pointer transition-all hover:shadow-md hover:border-blue-400',
                    priorityBadgeConfig[t.priority]?.borderClass || 'border-l-4 border-l-slate-300',
                    selectedTicket?.id === t.id && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>
                      {t.ticketNumber} · {t.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium">{t.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>{t.siteName}</span>
                    <span className="text-emerald-700 font-bold">MTTR {t.mttrHours || 4.2} jam</span>
                  </p>
                </div>
              ))}
              {initialKanban.selesai.length === 0 && (
                <div className="flex items-center justify-center p-4 border border-dashed rounded-lg text-xs text-slate-400">
                  Kosong
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Daftar Tiket Troubleshoot & Detail Tiket (Split View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sisi Kiri: Tabel Data (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h2 className="text-sm font-bold text-slate-900">2. Daftar Tiket Troubleshoot</h2>
            <div className="relative w-full sm:w-64">
              <IconSearch className="size-4 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Cari tiket, unit, PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 py-1">
            {filterChips.map((chip) => {
              const isSelected = activeFilter === chip.id
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer',
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : chip.isAlert
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* Tabel Troubleshoot */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tiket</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Prioritas</th>
                  <th className="py-2.5 px-3">PIC</th>
                  <th className="py-2.5 px-3">Umur</th>
                  <th className="py-2.5 px-3">SLA</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id
                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-slate-50/80',
                        isSelected && 'bg-blue-50/70 font-medium'
                      )}
                    >
                      <td className="py-2.5 px-3 font-semibold text-blue-700">{t.ticketNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{t.unitCode || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.siteName}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{t.categoryName}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold tracking-wide',
                            priorityBadgeConfig[t.priority]?.className || 'bg-slate-500 text-white'
                          )}
                        >
                          {priorityBadgeConfig[t.priority]?.label || t.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{t.assignedEmployeeName || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{t.ageStr}</td>
                      <td className="py-2.5 px-3">
                        {t.isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Overdue
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-medium">{t.slaLabel}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold',
                            statusBadgeConfig[t.status]?.className || 'bg-slate-500 text-white'
                          )}
                        >
                          {statusBadgeConfig[t.status]?.label || t.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Tidak ada tiket yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Menampilkan {filteredTickets.length} dari {tickets.length} tiket
            </span>
            <div className="flex items-center gap-1">
              <span className="px-2 py-1 rounded bg-slate-100 font-semibold text-slate-800">1</span>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Panel Detail Tiket (Inspector Panel lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header Detail */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-bold text-slate-800">Detail Tiket</h3>
                <span className="text-sm font-bold text-blue-600">
                  {selectedTicket ? selectedTicket.ticketNumber : '-'}
                </span>
              </div>
              {selectedTicket && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold',
                    priorityBadgeConfig[selectedTicket.priority]?.className || 'bg-slate-500 text-white'
                  )}
                >
                  {priorityBadgeConfig[selectedTicket.priority]?.label}
                </span>
              )}
            </div>

            {selectedTicket ? (
              <div className="flex flex-col gap-3 py-3 text-xs">
                {/* Field-field persis seperti referensi */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Unit / Site</span>
                  <span className="col-span-2 text-slate-800 font-semibold">
                    {selectedTicket.unitCode || '-'} · {selectedTicket.siteName}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Kategori</span>
                  <span className="col-span-2 text-slate-800 font-medium">{selectedTicket.categoryName}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Temuan</span>
                  <span className="col-span-2 text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                    {selectedTicket.findingDescription}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Sumber</span>
                  <span className="col-span-2 text-slate-700 font-mono text-[11px]">
                    {selectedTicket.sourceDetail}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Terdeteksi</span>
                  <span className="col-span-2 text-slate-700">
                    {new Date(selectedTicket.detectedAt).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">PIC</span>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-slate-800 font-medium">
                      {selectedTicket.assignedEmployeeName
                        ? `${selectedTicket.assignedEmployeeName} (${selectedTicket.assignedRole || 'Teknisi'})`
                        : 'Belum di-assign'}
                    </span>
                    <button
                      onClick={() => setAssignDialogOpen(true)}
                      className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Target SLA</span>
                  <div className="col-span-2">
                    <span className="text-slate-700">
                      {new Date(selectedTicket.targetSlaAt).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {selectedTicket.isOverdue ? (
                      <span className="block text-[11px] font-bold text-red-600 mt-0.5">
                        (lewat SLA - Segera tindak lanjuti)
                      </span>
                    ) : (
                      <span className="block text-[11px] font-medium text-emerald-600 mt-0.5">
                        ({selectedTicket.slaLabel})
                      </span>
                    )}
                  </div>
                </div>

                {/* Riwayat Aktivitas Kronologis */}
                <div className="border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                    <IconClock className="size-3.5 text-slate-400" />
                    Riwayat Aktivitas
                  </h4>

                  <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {activities.map((act) => (
                      <div key={act.id} className="text-[11px] border-l-2 border-blue-500 pl-2.5 py-0.5">
                        <p className="font-semibold text-slate-800">{act.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(act.createdAt).toLocaleString('id-ID', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · {act.actorName}
                        </p>
                        {act.description && (
                          <p className="text-[11px] text-slate-600 mt-0.5">{act.description}</p>
                        )}
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">Belum ada riwayat aktivitas.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">Pilih tiket untuk melihat detail</div>
            )}
          </div>

          {/* Action Buttons persis di bawah detail panel */}
          {selectedTicket && (
            <div className="border-t border-slate-100 pt-3 mt-2 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setNewStatus(selectedTicket.status)
                    setStatusDialogOpen(true)
                  }}
                  className="h-9 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Update Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNoteDialogOpen(true)}
                  className="h-9 text-xs font-medium border-slate-300"
                >
                  Tambah Catatan
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEscalateDialogOpen(true)}
                className="h-9 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              >
                Eskalasi
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 3 & 4: Temuan per Kategori & Ringkasan per Site (Bottom Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 3. Temuan per Kategori (Horizontal Bar Chart) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-baseline gap-2 border-b border-slate-100 pb-2.5 mb-3">
              <h3 className="text-sm font-bold text-slate-900">3. Temuan per Kategori</h3>
              <span className="text-xs text-slate-500">tiket open</span>
            </div>

            <div className="flex flex-col gap-3 py-1">
              {categoryStats.map((cat) => {
                const pct = Math.round((cat.count / maxCategoryCount) * 100)
                return (
                  <div key={cat.code} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between font-medium text-slate-700">
                      <span>{cat.name}</span>
                      <span className="font-bold text-slate-900">{cat.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(8, pct)}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
              {categoryStats.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada statistik kategori</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-3 text-[11px] text-slate-400 leading-relaxed">
            Aturan deteksi otomatis: offline &gt; 24 jam, tekanan flat &gt; 48 jam, low pressure berulang &ge; 3 kali / 7 hari.
          </div>
        </div>

        {/* 4. Ringkasan per Site */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-baseline gap-2 border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-900">4. Ringkasan per Site</h3>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3 text-center">Open</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-center">Offline &gt; 24 j</th>
                  <th className="py-2.5 px-3 text-center">MTTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {siteSummary.map((s) => (
                  <tr key={s.siteId} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{s.siteName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{s.openCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      {s.overdueCount > 0 ? (
                        <span className="font-bold text-red-600">{s.overdueCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                      {s.offlineKritisCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {s.mttrAvgHours ? `${s.mttrAvgHours} j` : '-'}
                    </td>
                  </tr>
                ))}
                {siteSummary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Belum ada data rekapitulasi site
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DIALOG 1: Buat Tiket Baru */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <IconPlus className="size-4 text-blue-600" />
              Lapor Kendala / Buat Tiket Troubleshoot Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi data temuan kendala sistem, hardware, atau permohonan layanan antar-departemen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="flex flex-col gap-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Unit / Modul</label>
                <Input
                  placeholder="Contoh: C02345 atau Timesheet"
                  value={formUnitCode}
                  onChange={(e) => setFormUnitCode(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Site / Lokasi *</label>
                <Select value={formSiteId} onValueChange={setFormSiteId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Kendala *</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prioritas *</label>
                <Select
                  value={formPriority}
                  onValueChange={(v: any) => setFormPriority(v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Prioritas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kritis">🚨 Kritis (SLA 6 jam)</SelectItem>
                    <SelectItem value="tinggi">⚡ Tinggi (SLA 12 jam)</SelectItem>
                    <SelectItem value="sedang">🟦 Sedang (SLA 24 jam)</SelectItem>
                    <SelectItem value="rendah">⚪ Rendah (SLA 48 jam)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Judul Kendala *</label>
              <Input
                placeholder="Contoh: Indikasi TValve macet Pos 2"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Deskripsi Temuan Lengkap *</label>
              <Textarea
                placeholder="Jelaskan detail gejala, indikasi tekanan/error, atau kondisi di lapangan..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sumber Deteksi / Pelaporan</label>
              <Input
                placeholder="Contoh: SPM - tabel tpms, Pelaporan Driver, dll."
                value={formSourceDetail}
                onChange={(e) => setFormSourceDetail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Smart Troubleshooting Instant Tip */}
            {formTitle.toLowerCase().includes('tvalve') && (
              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <IconInfoCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Tips Cepat TValve:</span> Bersihkan nozzle dengan contact cleaner dan
                  periksa seal sebelum melakukan penggantian part penuh.
                </div>
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? 'Menyimpan...' : 'Kirim Tiket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Update Status */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Update Status Tiket</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ubah tahapan status penanganan tiket {selectedTicket?.ticketNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pilih Status Baru</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baru">Baru</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="investigasi">Investigasi (Sedang Ditangani)</SelectItem>
                  <SelectItem value="menunggu_part">Menunggu Part / Sparepart</SelectItem>
                  <SelectItem value="selesai">Selesai (Resolved)</SelectItem>
                  <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Catatan Tindak Lanjut</label>
              <Textarea
                placeholder="Contoh: Part sensor sudah datang dan dipasang di workshop..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="text-xs min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusDialogOpen(false)}
              className="h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateStatus}
              disabled={isPending}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Tambah Catatan */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tambah Catatan Investigasi</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Catatan ini akan tersimpan permanen di riwayat aktivitas tiket {selectedTicket?.ticketNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs">
            <Textarea
              placeholder="Tuliskan catatan teknis, pengecekan tegangan, atau koordinasi..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteDialogOpen(false)}
              className="h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={isPending || !newNote.trim()}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Tambah Catatan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Eskalasi */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-1.5">
              <IconAlertTriangle className="size-4" />
              Eskalasi Tiket ke Prioritas Kritis
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tiket akan dinaikkan ke level KRITIS dan alert dikirimkan langsung ke Supervisor / Head Dept.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs">
            <label className="font-semibold text-slate-700 block mb-1">Alasan Eskalasi</label>
            <Textarea
              placeholder="Contoh: Unit beroperasi di pit utama dan downtime berdampak pada target produksi..."
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEscalateDialogOpen(false)}
              className="h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleEscalate}
              disabled={isPending}
              className="h-9 text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? 'Memproses...' : 'Konfirmasi Eskalasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Penugasan PIC */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Penugasan PIC Teknisi</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tugaskan tiket {selectedTicket?.ticketNumber} kepada teknisi atau staff terkait.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pilih PIC / Teknisi</label>
              <Select value={selectedPicName} onValueChange={setSelectedPicName}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Teknisi / Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Andi">Andi (Teknisi SPM)</SelectItem>
                  <SelectItem value="Rudi">Rudi (Mekanik Ban)</SelectItem>
                  <SelectItem value="Dewi">Dewi (Staff IT & Sensor)</SelectItem>
                  {employees.slice(0, 15).map((e) => (
                    <SelectItem key={e.id} value={e.name}>
                      {e.name} ({e.role || 'Staff'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Peran / Jabatan Penugasan</label>
              <Input
                value={selectedPicRole}
                onChange={(e) => setSelectedPicRole(e.target.value)}
                placeholder="Teknisi SPM / Mekanik"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignDialogOpen(false)}
              className="h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleAssignPic}
              disabled={isPending || !selectedPicName.trim()}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Tugaskan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
