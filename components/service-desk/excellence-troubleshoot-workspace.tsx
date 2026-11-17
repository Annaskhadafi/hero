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
  const [formCategory, setFormCategory] = useState<string>(categories[0]?.name || 'Timesheet & Roster Kerja')
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

  // Quick filter chips list based on real HERO categories from database
  const filterChips = [
    { id: 'all', label: `Semua (${tickets.length})` },
    ...categories.map((c) => ({ id: c.name, label: c.name })),
    { id: 'kritis', label: 'Kritis', isAlert: false },
    { id: 'overdue', label: 'Overdue SLA', isAlert: true },
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
        toast.error(res.error || 'Gagal menugaskan PIC')
      }
    })
  }

  // Calculate maximum count for horizontal bars
  const maxCategoryCount = Math.max(...categoryStats.map((c) => c.count), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <IconTool className="size-5" />
            </span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Excellence Troubleshooting & Service Desk
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pusat pemantauan kendala telematika sensor, operasional unit, pelaporan bug sistem HERO, dan tiket antar-departemen komprehensif.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <IconPlus className="size-4" />
            <span>Buat Tiket Baru</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="h-9 px-2.5 text-slate-600 hover:text-slate-900 border-slate-300 rounded-lg"
            title="Muat ulang data"
          >
            <IconRefresh className="size-4" />
          </Button>
        </div>
      </div>

      {/* 1. Alur Tiket (Kanban Board 5 Status Columns) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-baseline justify-between border-b border-slate-100 pb-2.5 mb-3.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-bold text-slate-900">1. Alur Tiket</h2>
            <span className="text-xs text-slate-500">status penanganan temuan, urut prioritas</span>
          </div>
        </div>

        {/* 5 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Column 1: Baru */}
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/70 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1.5 border-b border-slate-200">
              <span>Baru</span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                {initialKanban.baru.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {initialKanban.baru.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={cn(
                    'p-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs flex flex-col gap-1',
                    priorityBadgeConfig[ticket.priority]?.borderClass,
                    selectedTicket?.id === ticket.id && 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {ticket.ticketNumber} · {ticket.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium line-clamp-2 leading-snug">
                    {ticket.title}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                    <span>{ticket.siteName}</span>
                    <span className="italic text-slate-500">belum di-assign</span>
                  </div>
                </div>
              ))}
              {initialKanban.baru.length === 0 && (
                <p className="text-[11px] text-slate-400 py-4 text-center italic">Tidak ada tiket</p>
              )}
            </div>
          </div>

          {/* Column 2: Assigned */}
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/70 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1.5 border-b border-slate-200">
              <span>Assigned</span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                {initialKanban.assigned.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {initialKanban.assigned.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={cn(
                    'p-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs flex flex-col gap-1',
                    priorityBadgeConfig[ticket.priority]?.borderClass,
                    selectedTicket?.id === ticket.id && 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {ticket.ticketNumber} · {ticket.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium line-clamp-2 leading-snug">
                    {ticket.title}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                    <span>{ticket.siteName}</span>
                    <span className="font-semibold text-slate-600">
                      PIC: {ticket.assignedEmployeeName || '-'}
                    </span>
                  </div>
                </div>
              ))}
              {initialKanban.assigned.length === 0 && (
                <p className="text-[11px] text-slate-400 py-4 text-center italic">Tidak ada tiket</p>
              )}
            </div>
          </div>

          {/* Column 3: Investigasi */}
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/70 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1.5 border-b border-slate-200">
              <span>Investigasi</span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                {initialKanban.investigasi.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {initialKanban.investigasi.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={cn(
                    'p-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs flex flex-col gap-1',
                    priorityBadgeConfig[ticket.priority]?.borderClass,
                    selectedTicket?.id === ticket.id && 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {ticket.ticketNumber} · {ticket.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium line-clamp-2 leading-snug">
                    {ticket.title}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                    <span>{ticket.siteName}</span>
                    <span className="font-semibold text-slate-600">
                      PIC: {ticket.assignedEmployeeName || '-'}
                    </span>
                  </div>
                </div>
              ))}
              {initialKanban.investigasi.length === 0 && (
                <p className="text-[11px] text-slate-400 py-4 text-center italic">Tidak ada tiket</p>
              )}
            </div>
          </div>

          {/* Column 4: Menunggu Konfirmasi / Part */}
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/70 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1.5 border-b border-slate-200">
              <span>Menunggu Part</span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                {initialKanban.menunggu_part.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {initialKanban.menunggu_part.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={cn(
                    'p-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs flex flex-col gap-1',
                    priorityBadgeConfig[ticket.priority]?.borderClass,
                    selectedTicket?.id === ticket.id && 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {ticket.ticketNumber} · {ticket.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium line-clamp-2 leading-snug">
                    {ticket.title}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                    <span>{ticket.siteName}</span>
                    <span className="text-slate-500 font-medium">menunggu proses</span>
                  </div>
                </div>
              ))}
              {initialKanban.menunggu_part.length === 0 && (
                <p className="text-[11px] text-slate-400 py-4 text-center italic">Tidak ada tiket</p>
              )}
            </div>
          </div>

          {/* Column 5: Selesai */}
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/70 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1.5 border-b border-slate-200">
              <span>Selesai (7 hari)</span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                {initialKanban.selesai.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {initialKanban.selesai.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={cn(
                    'p-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs flex flex-col gap-1',
                    'border-l-4 border-l-emerald-500',
                    selectedTicket?.id === ticket.id && 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {ticket.ticketNumber} · {ticket.unitCode || '-'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium line-clamp-2 leading-snug">
                    {ticket.title}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                    <span>{ticket.siteName}</span>
                    <span className="font-bold text-emerald-700">
                      MTTR: {ticket.mttrHours ? `${ticket.mttrHours} j` : '-'}
                    </span>
                  </div>
                </div>
              ))}
              {initialKanban.selesai.length === 0 && (
                <p className="text-[11px] text-slate-400 py-4 text-center italic">Tidak ada tiket</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Split View Workspace: Daftar Tiket (Left) & Inspector Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Master Table + Quick Filter Chips (Span 8) */}
        <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">2. Daftar Tiket Troubleshoot</h2>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <IconSearch className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari tiket, modul, PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterChips.map((chip) => {
              const isSelected = activeFilter === chip.id
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    'h-7 px-3 rounded-full text-xs font-medium transition-all border',
                    isSelected
                      ? chip.isAlert
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : chip.isAlert
                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  )}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* Data Table */}
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tiket</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Modul / Unit</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Site</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Prioritas</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">PIC</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Umur</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">SLA</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Status</th>
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
                        'hover:bg-slate-50/80 cursor-pointer transition-colors',
                        isSelected && 'bg-blue-50/50 font-medium'
                      )}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {t.ticketNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                        {t.unitCode || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {t.siteName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {t.categoryName}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold inline-block',
                            priorityBadgeConfig[t.priority]?.className || 'bg-slate-500 text-white'
                          )}
                        >
                          {priorityBadgeConfig[t.priority]?.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {t.assignedEmployeeName || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {t.ageStr}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {t.isOverdue ? (
                          <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[11px]">
                            Overdue
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">{t.slaLabel}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold inline-block',
                            statusBadgeConfig[t.status]?.className || 'bg-slate-600 text-white'
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
                      Tidak ada tiket yang sesuai dengan filter atau kata kunci pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>
              Menampilkan {filteredTickets.length} dari {tickets.length} tiket
            </span>
          </div>
        </div>

        {/* Right Side: Inspector Detail Panel (Span 4) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header Inspector */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">Detail Tiket</h3>
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
                {/* Modul & Site */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Modul / Site</span>
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
                    <span className="text-slate-800 font-semibold">
                      {selectedTicket.assignedEmployeeName
                        ? `${selectedTicket.assignedEmployeeName} (${selectedTicket.assignedRole || 'Teknisi'})`
                        : 'Belum di-assign'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPicName(selectedTicket.assignedEmployeeName || '')
                        setSelectedPicRole(selectedTicket.assignedRole || 'Teknisi')
                        setAssignDialogOpen(true)
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      {selectedTicket.assignedEmployeeName ? 'Ganti' : 'Tugaskan'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Target SLA</span>
                  <div className="col-span-2">
                    <span
                      className={cn(
                        'font-bold text-xs',
                        selectedTicket.isOverdue ? 'text-red-600' : 'text-slate-800'
                      )}
                    >
                      {new Date(selectedTicket.targetSlaAt).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {selectedTicket.isOverdue && (
                      <span className="text-red-500 font-bold text-[11px] block mt-0.5">
                        (Overdue)
                      </span>
                    )}
                  </div>
                </div>

                {/* Riwayat Aktivitas Audit Trail */}
                <div className="border-t border-slate-100 pt-3 mt-1">
                  <span className="text-slate-900 font-bold block mb-2">Riwayat Aktivitas</span>

                  {loadingActivities ? (
                    <p className="text-slate-400 italic py-2">Memuat riwayat...</p>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {activities.map((act) => (
                        <div key={act.id} className="text-[11px] border-l-2 border-slate-200 pl-2.5 py-0.5">
                          <p className="font-bold text-slate-800 leading-tight">{act.title}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(act.createdAt).toLocaleString('id-ID', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            · {act.actorName}
                          </span>
                          {act.description && (
                            <p className="text-slate-600 mt-1 bg-slate-50 p-1.5 rounded text-[10px]">
                              {act.description}
                            </p>
                          )}
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <p className="text-slate-400 italic text-[11px]">Belum ada riwayat tercatat.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Pilih salah satu tiket di tabel sebelah kiri untuk melihat rincian temuan & riwayat aktivitas.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {selectedTicket && (
            <div className="border-t border-slate-100 pt-3.5 mt-2 grid grid-cols-3 gap-2">
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
                className="h-9 text-xs font-medium text-slate-700"
              >
                Tambah Catatan
              </Button>
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
              <h3 className="text-sm font-bold text-slate-900">3. Temuan per Kategori &amp; Modul Sistem</h3>
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
            Aturan SLA HERO: Kritis &lt; 4 jam (downtime operasional &amp; server), Tinggi &lt; 8 jam (alur kerja modul), Sedang &lt; 24 jam (permintaan fasilitas &amp; logistik).
          </div>
        </div>

        {/* 4. Ringkasan per Site & Departemen */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-baseline gap-2 border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-900">4. Ringkasan per Site &amp; Departemen</h3>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Site / Unit</th>
                  <th className="py-2.5 px-3 text-center">Open</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-center">Kritis</th>
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
                      Belum ada data ringkasan site.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: BUAT TIKET BARU */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconPlus className="size-5 text-blue-600" />
              Lapor Kendala / Buat Tiket Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Laporkan temuan kendala sistem HERO, jaringan telematika, maupun permintaan layanan antar departemen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="flex flex-col gap-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Site Operasional</label>
                <Select value={formSiteId} onValueChange={setFormSiteId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Modul / Kode Unit</label>
                <Input
                  placeholder="Contoh: Timesheet V2 / Unit C02081"
                  value={formUnitCode}
                  onChange={(e) => setFormUnitCode(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Kategori Kendala</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Prioritas / Urgensi</label>
                <Select value={formPriority} onValueChange={(val: any) => setFormPriority(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Prioritas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kritis" className="text-xs text-red-600 font-bold">
                      Kritis (SLA 4 Jam)
                    </SelectItem>
                    <SelectItem value="tinggi" className="text-xs text-amber-600 font-semibold">
                      Tinggi (SLA 8 Jam)
                    </SelectItem>
                    <SelectItem value="sedang" className="text-xs text-blue-600">
                      Sedang (SLA 24 Jam)
                    </SelectItem>
                    <SelectItem value="rendah" className="text-xs text-slate-600">
                      Rendah (SLA 48 Jam)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Judul Temuan Kendala *</label>
              <Input
                placeholder="Contoh: Gagal sinkronisasi data roster lembur / Kendala GPS presensi"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Rincian Temuan / Deskripsi *</label>
              <Textarea
                placeholder="Jelaskan kondisi aktual temuan lapangan, dampak terhadap operasional, dan tindakan awal yang sudah dilakukan..."
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Sumber Informasi</label>
              <Input
                placeholder="Contoh: Pelaporan Driver Pit Stop / Pemeriksaan P2H Workshop"
                value={formSourceDetail}
                onChange={(e) => setFormSourceDetail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
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
                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
              >
                {isPending ? 'Menyimpan...' : 'Submit Tiket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: UPDATE STATUS */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Update Status Tiket {selectedTicket?.ticketNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pembaruan status akan mencatat riwayat audit aktivitas dan menghitung MTTR secara otomatis jika status diselesaikan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Status Baru</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baru" className="text-xs">Baru</SelectItem>
                  <SelectItem value="assigned" className="text-xs">Assigned</SelectItem>
                  <SelectItem value="investigasi" className="text-xs">Investigasi</SelectItem>
                  <SelectItem value="menunggu_part" className="text-xs">Menunggu Part / Pending</SelectItem>
                  <SelectItem value="selesai" className="text-xs text-emerald-700 font-bold">
                    Selesai (Resolve)
                  </SelectItem>
                  <SelectItem value="dibatalkan" className="text-xs text-red-600">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Catatan Tindakan / Resolusi</label>
              <Textarea
                placeholder="Uraikan tindakan investigasi atau penggantian part yang dilakukan..."
                rows={3}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
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
              disabled={isPending}
              onClick={handleUpdateStatus}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: TAMBAH CATATAN */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Tambah Catatan Aktivitas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Catatan investigasi atau temuan lapangan baru akan disimpan ke dalam riwayat tiket #{selectedTicket?.ticketNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs">
            <Textarea
              placeholder="Tuliskan catatan teknis terbaru..."
              rows={4}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
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
              disabled={isPending || !newNote.trim()}
              onClick={handleAddNote}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
            >
              {isPending ? 'Menyimpan...' : 'Kirim Catatan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ESKALASI TIKET */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-1.5">
              <IconAlertTriangle className="size-5" />
              Eskalasi Prioritas Tiket
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Menaikkan prioritas tiket #{selectedTicket?.ticketNumber} menjadi KRITIS dan memberitahukan tim lead operasional.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs flex flex-col gap-2">
            <label className="font-semibold text-slate-700">Alasan Eskalasi *</label>
            <Textarea
              placeholder="Contoh: Unit beroperasi tanpa sensor tekanan valid, berisiko tinggi terhadap safety ban di jalur hauling..."
              rows={3}
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
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
              disabled={isPending}
              onClick={handleEscalate}
              className="h-9 text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-4"
            >
              {isPending ? 'Memproses...' : 'Eskalasi Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: TUGASKAN PIC */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Tugaskan PIC Tiket #{selectedTicket?.ticketNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih karyawan teknisi atau mekanik penanggung jawab penanganan temuan kendala ini.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Nama PIC</label>
              <Input
                placeholder="Ketik nama PIC penanggung jawab..."
                value={selectedPicName}
                onChange={(e) => setSelectedPicName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Peran / Jabatan</label>
              <Input
                placeholder="Contoh: Teknisi SPM / Mekanik Ban"
                value={selectedPicRole}
                onChange={(e) => setSelectedPicRole(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
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
              disabled={isPending || !selectedPicName.trim()}
              onClick={handleAssignPic}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
            >
              {isPending ? 'Menyimpan...' : 'Tugaskan PIC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
