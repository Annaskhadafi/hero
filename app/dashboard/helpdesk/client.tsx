'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Headphones,
  Image as ImageIcon,
  Inbox,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  assignHeroTicketAction,
  claimHeroTicketAction,
  closeHeroTicketAction,
  getHeroTicketDetailAction,
  getHeroTicketsAction,
  resolveHeroTicketAction,
  sendHeroTicketMessageAction,
} from '@/app/actions/helpdesk'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import type { TicketAttachment } from '@/db/schema/helpdesk'

interface TicketListItem {
  id: number
  ticketNumber: string
  title: string
  priority: string
  status: string
  aiSummary: string | null
  escalationReason: string | null
  claimedAt: Date | string | null
  resolvedAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  customer: {
    id: number
    name: string
  }
  site: {
    id: number
    name: string
  }
  category: {
    id: number
    name: string
    color: string
    code: string
  }
  assignedEmployee: {
    id: number
    name: string
    email: string | null
  } | null
  customerUser: {
    id: string
    name: string
    email: string
  }
}

interface MessageItem {
  id: number
  senderType: string
  senderCustomerUserId: string | null
  senderEmployeeId: number | null
  message: string
  attachments: TicketAttachment[]
  isInternalNote: boolean
  aiTokens: number | null
  createdAt: Date | string
  senderEmployee: {
    name: string
  } | null
  senderCustomerUser: {
    name: string
  } | null
}

interface Props {
  initialTickets: TicketListItem[]
  currentEmployee: {
    id: number
    name: string
    email: string | null
  }
  categories: Array<{ id: number; name: string; color: string; code: string }>
  sites: Array<{ id: number; name: string; code: string | null }>
  employees: Array<{ id: number; name: string; email: string | null; department: string | null }>
  initialSelectedTicketId?: number
}

export function HeroHelpdeskClient({
  initialTickets,
  currentEmployee,
  categories,
  sites,
  employees,
  initialSelectedTicketId,
}: Props) {
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets)
  const [activeTab, setActiveTab] = useState<'all' | 'escalated' | 'my' | 'resolved'>('escalated')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [siteFilter, setSiteFilter] = useState('all')

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(
    initialSelectedTicketId || initialTickets[0]?.id || null,
  )
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<any | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Reply Form State
  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Modals State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignTargetId, setAssignTargetId] = useState('')
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch ticket detail whenever selectedTicketId changes
  useEffect(() => {
    if (!selectedTicketId) return

    let isMounted = true
    setIsLoadingDetail(true)

    getHeroTicketDetailAction(selectedTicketId)
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.ticket) {
          setSelectedTicketDetail(res.ticket)
          setMessages(res.messages || [])
        } else {
          toast.error(res.error || 'Gagal memuat detail tiket.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedTicketId])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Periodic polling for new messages & ticket updates
  useEffect(() => {
    const interval = setInterval(async () => {
      // 1. Refresh tickets list in background
      const resTickets = await getHeroTicketsAction()
      if (resTickets.success && resTickets.data) {
        setTickets(resTickets.data)
      }

      // 2. Refresh active ticket thread if open
      if (selectedTicketId) {
        const resDetail = await getHeroTicketDetailAction(selectedTicketId)
        if (resDetail.success && resDetail.ticket) {
          setSelectedTicketDetail(resDetail.ticket)
          if (resDetail.messages && resDetail.messages.length > messages.length) {
            setMessages(resDetail.messages)
          }
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedTicketId, messages.length])

  // Filter tickets according to tabs and search
  const filteredTickets = tickets.filter((t) => {
    if (activeTab === 'escalated' && !['escalated', 'bot_active'].includes(t.status)) {
      return false
    }
    if (activeTab === 'my' && t.assignedEmployee?.id !== currentEmployee.id) {
      return false
    }
    if (activeTab === 'resolved' && !['resolved', 'closed'].includes(t.status)) {
      return false
    }
    if (categoryFilter !== 'all' && String(t.category.id) !== categoryFilter) {
      return false
    }
    if (siteFilter !== 'all' && String(t.site.id) !== siteFilter) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNum = t.ticketNumber.toLowerCase().includes(q)
      const matchTitle = t.title.toLowerCase().includes(q)
      const matchCust = t.customer.name.toLowerCase().includes(q)
      const matchSite = t.site.name.toLowerCase().includes(q)
      if (!matchNum && !matchTitle && !matchCust && !matchSite) return false
    }
    return true
  })

  // Tab counters
  const countEscalated = tickets.filter((t) => ['escalated', 'bot_active'].includes(t.status)).length
  const countMy = tickets.filter((t) => t.assignedEmployee?.id === currentEmployee.id).length
  const countResolved = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadTarget', 'helpdesk')

        const res = await uploadFile(formData)
        if (res.success && res.url) {
          setAttachments((prev) => [
            ...prev,
            {
              url: res.url,
              name: file.name,
              size: file.size,
              type: file.type,
            },
          ])
        } else {
          toast.error(`Gagal mengunggah file: ${res.error || 'Terjadi kesalahan'}`)
        }
      }
    } catch {
      toast.error('Gagal mengunggah berkas lampiran.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  async function handleSendReply(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!selectedTicketId) return
    if (!replyText.trim() && attachments.length === 0) return
    if (isSending) return

    setIsSending(true)
    try {
      const res = await sendHeroTicketMessageAction({
        ticketId: selectedTicketId,
        message: replyText.trim(),
        isInternalNote,
        attachments,
      })

      if (res.success) {
        setReplyText('')
        setAttachments([])
        // Refresh detail
        const updated = await getHeroTicketDetailAction(selectedTicketId)
        if (updated.success && updated.ticket) {
          setSelectedTicketDetail(updated.ticket)
          setMessages(updated.messages || [])
        }
        // Refresh ticket list
        const resList = await getHeroTicketsAction()
        if (resList.success && resList.data) setTickets(resList.data)
      } else {
        toast.error(res.error || 'Gagal mengirim pesan.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengirim pesan.')
    } finally {
      setIsSending(false)
    }
  }

  async function handleClaimTicket() {
    if (!selectedTicketId) return
    setIsActionLoading(true)
    try {
      const res = await claimHeroTicketAction(selectedTicketId)
      if (res.success) {
        toast.success('Tiket berhasil diklaim dan masuk ke antrean Anda!')
        const updated = await getHeroTicketDetailAction(selectedTicketId)
        if (updated.success && updated.ticket) {
          setSelectedTicketDetail(updated.ticket)
          setMessages(updated.messages || [])
        }
        const resList = await getHeroTicketsAction()
        if (resList.success && resList.data) setTickets(resList.data)
      } else {
        toast.error(res.error || 'Gagal mengklaim tiket.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsActionLoading(false)
    }
  }

  async function handleAssignTicket() {
    if (!selectedTicketId || !assignTargetId) return
    setIsActionLoading(true)
    try {
      const res = await assignHeroTicketAction(selectedTicketId, Number(assignTargetId))
      if (res.success) {
        toast.success('Tiket berhasil ditugaskan!')
        setIsAssignModalOpen(false)
        const updated = await getHeroTicketDetailAction(selectedTicketId)
        if (updated.success && updated.ticket) {
          setSelectedTicketDetail(updated.ticket)
          setMessages(updated.messages || [])
        }
        const resList = await getHeroTicketsAction()
        if (resList.success && resList.data) setTickets(resList.data)
      } else {
        toast.error(res.error || 'Gagal menugaskan tiket.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsActionLoading(false)
    }
  }

  async function handleResolveTicket() {
    if (!selectedTicketId || !resolutionNotes.trim()) {
      toast.error('Catatan penyelesaian wajib diisi.')
      return
    }

    setIsActionLoading(true)
    try {
      const res = await resolveHeroTicketAction({
        ticketId: selectedTicketId,
        resolutionNotes: resolutionNotes.trim(),
      })
      if (res.success) {
        toast.success('Tiket berhasil diselesaikan!')
        setIsResolveModalOpen(false)
        setResolutionNotes('')
        const updated = await getHeroTicketDetailAction(selectedTicketId)
        if (updated.success && updated.ticket) {
          setSelectedTicketDetail(updated.ticket)
          setMessages(updated.messages || [])
        }
        const resList = await getHeroTicketsAction()
        if (resList.success && resList.data) setTickets(resList.data)
      } else {
        toast.error(res.error || 'Gagal menyelesaikan tiket.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsActionLoading(false)
    }
  }

  async function handleCloseTicket() {
    if (!selectedTicketId) return
    if (!confirm('Apakah Anda yakin ingin menutup tiket ini secara permanen?')) return

    setIsActionLoading(true)
    try {
      const res = await closeHeroTicketAction(selectedTicketId)
      if (res.success) {
        toast.success('Tiket telah ditutup.')
        const updated = await getHeroTicketDetailAction(selectedTicketId)
        if (updated.success && updated.ticket) {
          setSelectedTicketDetail(updated.ticket)
          setMessages(updated.messages || [])
        }
        const resList = await getHeroTicketsAction()
        if (resList.success && resList.data) setTickets(resList.data)
      } else {
        toast.error(res.error || 'Gagal menutup tiket.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Top Action & Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-sm">
            <Headphones className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              HERO Helpdesk &amp; Problem Center
            </h1>
            <p className="text-[10px] text-slate-500">
              Antrean &amp; Triage Keluhan Customer Maestro
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1 text-xs">
          <button
            onClick={() => setActiveTab('escalated')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
              activeTab === 'escalated'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Perlu Ditangani</span>
            {countEscalated > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {countEscalated}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
              activeTab === 'my'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tiket Saya</span>
            {countMy > 0 && (
              <span className="rounded-full bg-sky-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {countMy}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              activeTab === 'all'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({tickets.length})
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              activeTab === 'resolved'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Selesai ({countResolved})
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Queue, Right Operator Thread */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: Queue / Tickets List */}
        <div className="w-full sm:w-80 md:w-96 flex flex-col border-r border-slate-200/80 bg-white shrink-0">
          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor, judul, customer..."
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-7 text-[11px] flex-1">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="h-7 text-[11px] flex-1">
                  <SelectValue placeholder="Site" />
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
            </div>
          </div>

          {/* Ticket Queue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Inbox className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                Tidak ada tiket pada antrean ini.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId
                const statusCfg = getStatusConfig(t.status)
                const priorityBadge = getPriorityBadge(t.priority)

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-3.5 transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusCfg.style}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.category.color }}
                      />
                      <h4 className="text-xs font-semibold text-slate-900 truncate flex-1">
                        {t.title}
                      </h4>
                      <span className={`text-[9px] font-semibold px-1 rounded ${priorityBadge.badge}`}>
                        {priorityBadge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span className="truncate max-w-[140px] font-medium text-slate-700">
                        {t.customer.name}
                      </span>
                      <span>{t.site.name}</span>
                    </div>

                    {t.assignedEmployee ? (
                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                        <UserCheck className="h-3 w-3 text-emerald-600" />
                        <span>PIC: {t.assignedEmployee.name}</span>
                      </div>
                    ) : t.status === 'bot_active' ? (
                      <div className="flex items-center gap-1 text-[10px] text-indigo-600">
                        <Bot className="h-3 w-3" />
                        <span>AI Triage Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Belum Ada PIC (Unassigned)</span>
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Operator Workspace / Chat Thread */}
        <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
          {isLoadingDetail && !selectedTicketDetail ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : !selectedTicketDetail ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
              <Headphones className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Pilih Tiket dari Antrean</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Klik salah satu tiket di kolom kiri untuk melihat ringkasan AI, riwayat percakapan,
                dan mengambil alih respon ke customer.
              </p>
            </div>
          ) : (
            <>
              {/* Workspace Header Bar */}
              <div className="border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {selectedTicketDetail.ticketNumber}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: `${selectedTicketDetail.category.color}15`,
                        color: selectedTicketDetail.category.color,
                      }}
                    >
                      {selectedTicketDetail.category.name}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      Site: {selectedTicketDetail.site.name}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedTicketDetail.title}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Pelapor: <strong>{selectedTicketDetail.customerUser.name}</strong> ({selectedTicketDetail.customer.name}) &bull;{' '}
                    {selectedTicketDetail.customerUser.email}
                  </p>
                </div>

                {/* Operator Actions Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Claim Button */}
                  {!selectedTicketDetail.assignedEmployee ||
                  selectedTicketDetail.assignedEmployee.id !== currentEmployee.id ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleClaimTicket}
                      disabled={isActionLoading}
                      className="h-8 gap-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Claim Tiket Ini</span>
                    </Button>
                  ) : null}

                  {/* Assign to other PIC */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Tugaskan</span>
                  </Button>

                  {/* Resolve Button */}
                  {selectedTicketDetail.status !== 'resolved' &&
                    selectedTicketDetail.status !== 'closed' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsResolveModalOpen(true)}
                        className="h-8 gap-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Selesaikan</span>
                      </Button>
                    )}

                  {/* Close Ticket */}
                  {selectedTicketDetail.status !== 'closed' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCloseTicket}
                      className="h-8 text-xs text-slate-500 hover:text-red-600"
                    >
                      Tutup
                    </Button>
                  )}
                </div>
              </div>

              {/* AI Triage Summary Banner if present */}
              {selectedTicketDetail.aiSummary && (
                <div className="border-b border-indigo-100 bg-indigo-50/60 px-4 py-2 sm:px-6 flex items-start gap-2.5 text-xs text-indigo-900 shrink-0">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-indigo-800">AI Triage Summary: </span>
                    <span className="text-slate-700">{selectedTicketDetail.aiSummary}</span>
                    {selectedTicketDetail.escalationReason && (
                      <p className="mt-0.5 text-[11px] text-amber-800 font-medium">
                        Catatan Eskalasi: {selectedTicketDetail.escalationReason}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Messages Thread Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.map((msg) => {
                  if (msg.senderType === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600 border border-slate-200">
                          <AlertCircle className="h-3 w-3 text-slate-500" />
                          {msg.message}
                        </span>
                      </div>
                    )
                  }

                  const isInternal = msg.isInternalNote
                  const isAgent = msg.senderType === 'hero_agent'
                  const isBot = msg.senderType === 'bot'
                  const isCustomer = msg.senderType === 'customer'

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        isInternal
                          ? 'justify-center'
                          : isAgent
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      {/* Avatar */}
                      {!isAgent && !isInternal && (
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isBot
                              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white'
                              : 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950'
                          }`}
                        >
                          {isBot ? <Bot className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        </div>
                      )}

                      <div
                        className={`space-y-1 ${
                          isInternal
                            ? 'w-full max-w-xl'
                            : 'max-w-[85%] sm:max-w-[75%]'
                        } ${isAgent && !isInternal ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label */}
                        <div
                          className={`flex items-center gap-1.5 text-[11px] ${
                            isInternal
                              ? 'justify-center text-amber-700 font-bold'
                              : isAgent
                              ? 'justify-end text-slate-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {isInternal ? (
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Internal Note &bull; {msg.senderEmployee?.name || 'Staf HERO'}
                            </span>
                          ) : isAgent ? (
                            <span className="font-semibold text-indigo-700">
                              {msg.senderEmployee?.name || 'Staf HERO'} (Anda/Tim)
                            </span>
                          ) : isBot ? (
                            <span className="font-semibold text-indigo-700 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Chitra Smart Ticketing
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {msg.senderCustomerUser?.name || 'Customer'} (Pelanggan)
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Bubble Content */}
                        <div
                          className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                            isInternal
                              ? 'bg-amber-50/90 border border-amber-200/90 text-amber-950 font-medium'
                              : isAgent
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : isBot
                              ? 'bg-indigo-50/80 text-slate-900 border border-indigo-100 rounded-tl-none'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-200/40">
                              {msg.attachments.map((att, attIdx) => {
                                const fileUrl = resolveUploadUrl(att.url)
                                const isImg = att.type?.startsWith('image/')

                                return (
                                  <a
                                    key={attIdx}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                                      isAgent && !isInternal
                                        ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                                    }`}
                                  >
                                    {isImg ? (
                                      <ImageIcon className="h-3.5 w-3.5" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5" />
                                    )}
                                    <span className="max-w-[120px] truncate">{att.name}</span>
                                    <Download className="h-3 w-3 opacity-60" />
                                  </a>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Operator Reply & Internal Note Bar */}
              <div className="border-t border-slate-200/80 bg-white p-3 sm:p-4 shrink-0">
                <form onSubmit={handleSendReply} className="space-y-2.5">
                  {/* Internal Note Toggle & Attachments display */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={isInternalNote}
                        onCheckedChange={setIsInternalNote}
                      />
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        {isInternalNote ? (
                          <>
                            <Lock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-amber-700">
                              Internal Note (Hanya terlihat oleh tim internal HERO)
                            </span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Balas langsung ke Customer</span>
                          </>
                        )}
                      </span>
                    </label>

                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                          >
                            <Paperclip className="h-3 w-3 text-indigo-600" />
                            <span className="max-w-[100px] truncate">{att.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setAttachments((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-end gap-2">
                    <label
                      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition ${
                        isUploading ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      title="Lampirkan berkas"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>

                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleSendReply()
                        }
                      }}
                      placeholder={
                        isInternalNote
                          ? 'Tulis catatan rahasia antar staf HERO... (Ctrl+Enter untuk simpan)'
                          : 'Tulis balasan resmi untuk customer... (Ctrl+Enter untuk kirim)'
                      }
                      rows={2}
                      className={`min-h-[50px] max-h-36 flex-1 text-xs py-2 resize-none ${
                        isInternalNote
                          ? 'border-amber-300 bg-amber-50/40 focus-visible:ring-amber-400'
                          : ''
                      }`}
                    />

                    <Button
                      type="submit"
                      disabled={isSending || isUploading || (!replyText.trim() && attachments.length === 0)}
                      className={`h-10 px-4 text-xs font-semibold gap-1.5 text-white ${
                        isInternalNote
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>{isInternalNote ? 'Simpan Note' : 'Kirim'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assign Modal Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Tugaskan Tiket ke Karyawan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih karyawan HERO yang akan bertanggung jawab menangani tiket ini.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <label className="text-xs font-semibold text-slate-700">Pilih Staf PIC *</label>
            <Select value={assignTargetId} onValueChange={setAssignTargetId}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Pilih Karyawan" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.name} {emp.department ? `(${emp.department})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleAssignTicket}
              disabled={isActionLoading || !assignTargetId}
              className="h-8 gap-1.5 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              <span>Simpan Penugasan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Modal Dialog */}
      <Dialog open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Tandai Tiket Selesai (Resolve)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tuliskan ringkasan solusi atau tindakan yang telah diambil untuk menyelesaikan keluhan.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-semibold text-slate-700">Catatan Penyelesaian *</label>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Contoh: Telah dilakukan pergantian ban baru unit DT-014 di Pit B, teknisi site telah konfirmasi selesai."
              rows={4}
              className="mt-1 text-xs"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResolveModalOpen(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleResolveTicket}
              disabled={isActionLoading || !resolutionNotes.trim()}
              className="h-8 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              <span>Konfirmasi Selesai</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'bot_active':
      return {
        label: 'AI Bot',
        style: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      }
    case 'escalated':
      return {
        label: 'Eskalasi',
        style: 'bg-amber-500 text-white font-bold animate-pulse',
      }
    case 'assigned':
    case 'in_progress':
      return {
        label: 'Diproses',
        style: 'bg-sky-50 text-sky-700 border border-sky-200',
      }
    case 'resolved':
      return {
        label: 'Selesai',
        style: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      }
    case 'closed':
      return {
        label: 'Ditutup',
        style: 'bg-slate-100 text-slate-600 border border-slate-200',
      }
    default:
      return {
        label: status,
        style: 'bg-slate-100 text-slate-700',
      }
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return { label: 'URGENT', badge: 'bg-red-100 text-red-700 font-bold' }
    case 'high':
      return { label: 'High', badge: 'bg-orange-100 text-orange-700' }
    case 'low':
      return { label: 'Low', badge: 'bg-slate-100 text-slate-600' }
    default:
      return { label: 'Medium', badge: 'bg-blue-100 text-blue-700' }
  }
}
