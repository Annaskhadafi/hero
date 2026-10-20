'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  User,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
  escalateMaestroTicketAction,
  getMaestroTicketDetailAction,
  sendMaestroTicketMessageAction,
} from '@/app/actions/helpdesk'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import type { TicketAttachment } from '@/db/schema/helpdesk'

interface TicketDetail {
  id: number
  ticketNumber: string
  title: string
  priority: string
  status: string
  createdAt: Date | string
  updatedAt: Date | string
  claimedAt: Date | string | null
  aiSummary: string | null
  escalationReason: string | null
  resolutionNotes: string | null
  resolvedAt: Date | string | null
  category: {
    id: number
    name: string
    color: string
    code: string
  }
  site: {
    id: number
    name: string
  }
  assignedEmployee: {
    id: number
    name: string
  } | null
  customer: {
    id: number
    name: string
  }
}

interface MessageItem {
  id: number
  senderType: string
  senderCustomerUserId: string | null
  senderEmployeeId: number | null
  message: string
  attachments: TicketAttachment[]
  createdAt: Date | string
  senderEmployee: {
    name: string
  } | null
  senderCustomerUser: {
    name: string
  } | null
}

interface Props {
  ticket: TicketDetail
  initialMessages: MessageItem[]
  customerUser: {
    id: string
    name: string
    email: string
  }
}

export function MaestroTicketChatClient({ ticket, initialMessages, customerUser }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages)
  const [ticketStatus, setTicketStatus] = useState(ticket.status)
  const [assignedPic, setAssignedPic] = useState(ticket.assignedEmployee)
  const [inputMessage, setInputMessage] = useState('')
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isEscalating, setIsEscalating] = useState(false)
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  // Polling for updates every 4 seconds if ticket is not closed
  useEffect(() => {
    if (ticketStatus === 'closed') return

    const interval = setInterval(async () => {
      try {
        const res = await getMaestroTicketDetailAction(ticket.id)
        if (res.success && res.ticket) {
          setTicketStatus(res.ticket.status)
          setAssignedPic(res.ticket.assignedEmployee)
          if (res.messages && res.messages.length > messages.length) {
            setMessages(res.messages)
          }
        }
      } catch {
        // Silent background polling catch
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [ticket.id, ticketStatus, messages.length])

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

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!inputMessage.trim() && attachments.length === 0) return
    if (isSending) return

    const userText = inputMessage.trim()
    const currentAttachments = [...attachments]

    // Optimistic UI insert for customer message
    const tempId = Date.now()
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderType: 'customer',
      senderCustomerUserId: customerUser.id,
      senderEmployeeId: null,
      message: userText,
      attachments: currentAttachments,
      createdAt: new Date(),
      senderEmployee: null,
      senderCustomerUser: { name: customerUser.name },
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setInputMessage('')
    setAttachments([])
    setIsSending(true)

    try {
      const res = await sendMaestroTicketMessageAction({
        ticketId: ticket.id,
        message: userText,
        attachments: currentAttachments,
      })

      if (res.success) {
        // Refetch latest thread (including AI reply)
        const updated = await getMaestroTicketDetailAction(ticket.id)
        if (updated.success && updated.messages) {
          setMessages(updated.messages)
          if (updated.ticket) {
            setTicketStatus(updated.ticket.status)
            setAssignedPic(updated.ticket.assignedEmployee)
          }
        }
      } else {
        toast.error(res.error || 'Gagal mengirim pesan.')
        // Rollback optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengirim pesan.')
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  async function handleConfirmEscalate() {
    setIsEscalating(true)
    try {
      const res = await escalateMaestroTicketAction(
        ticket.id,
        escalateReason.trim() || 'Permintaan eskalasi manual oleh pelanggan',
      )

      if (res.success) {
        toast.success('Tiket berhasil dialihkan ke tim spesialis HERO!')
        setIsEscalateModalOpen(false)
        setTicketStatus('escalated')
        // Refetch thread
        const updated = await getMaestroTicketDetailAction(ticket.id)
        if (updated.success && updated.messages) {
          setMessages(updated.messages)
        }
      } else {
        toast.error(res.error || 'Gagal mengalihkan tiket.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengalihkan tiket.')
    } finally {
      setIsEscalating(false)
    }
  }

  const isClosed = ticketStatus === 'closed'
  const isResolved = ticketStatus === 'resolved'
  const statusCfg = getStatusBanner(ticketStatus, assignedPic?.name)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
      {/* Ticket Status Bar & Handover Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-300 bg-slate-100/90 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black border ${statusCfg.style}`}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </span>

          {ticket.priority === 'urgent' && (
            <span className="rounded-full bg-rose-100 border border-rose-400 px-2.5 py-0.5 text-xs font-black text-rose-950">
              URGENT
            </span>
          )}
        </div>

        {/* Escalation button to human agent */}
        {ticketStatus === 'bot_active' && (
          <Button
            type="button"
            size="sm"
            onClick={() => setIsEscalateModalOpen(true)}
            className="h-9 gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white px-4 shadow-sm transition-colors cursor-pointer"
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>Minta Bantuan Tim HERO</span>
          </Button>
        )}
      </div>

      {/* Resolution Note Alert if Resolved */}
      {ticket.resolutionNotes && (
        <div className="mx-4 sm:mx-6 my-3 rounded-xl border-2 border-emerald-400 bg-emerald-100/90 p-3.5 text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed shadow-sm">
          <strong className="font-black text-emerald-950">Catatan Penyelesaian:</strong> {ticket.resolutionNotes}
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          if (msg.senderType === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3.5 py-1 text-xs font-bold text-slate-900 border border-slate-300">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-700" />
                  {msg.message}
                </span>
              </div>
            )
          }

          const isMe = msg.senderType === 'customer'
          const isBot = msg.senderType === 'bot'
          const isAgent = msg.senderType === 'hero_agent'

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar for non-me */}
              {!isMe && (
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                    isBot
                      ? 'bg-blue-100 border border-blue-300 text-blue-900'
                      : 'bg-indigo-100 border border-indigo-300 text-indigo-900'
                  }`}
                >
                  {isBot ? <Bot className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Header label above bubble */}
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    isMe ? 'justify-end text-slate-700 font-bold' : 'text-slate-800 font-bold'
                  }`}
                >
                  {isBot ? (
                    <span className="inline-flex items-center gap-1 font-black text-blue-800">
                      <Sparkles className="h-3.5 w-3.5" />
                      Chitra AI
                    </span>
                  ) : isAgent ? (
                    <span className="font-black text-indigo-800">
                      {msg.senderEmployee?.name || 'Staf Spesialis HERO'}
                      <span className="ml-1 text-[11px] font-bold text-slate-600">(HERO)</span>
                    </span>
                  ) : (
                    <span className="font-black text-slate-900">Anda</span>
                  )}

                  <span className="text-[11px] text-slate-600 font-bold">
                    {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Bubble Container */}
                <div
                  className={`px-4.5 py-3 text-xs sm:text-sm leading-relaxed transition-all ${
                    isMe
                      ? 'bg-blue-700 text-white rounded-2xl rounded-tr-xs shadow-sm font-medium'
                      : isBot
                      ? 'bg-slate-100 text-slate-950 border-2 border-slate-300 rounded-2xl rounded-tl-xs shadow-sm font-semibold'
                      : 'bg-sky-100/90 text-slate-950 border-2 border-sky-300 rounded-2xl rounded-tl-xs shadow-sm font-semibold'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>

                  {/* Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={`mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t ${isMe ? 'border-white/30' : 'border-slate-300'}`}>
                      {msg.attachments.map((att, attIdx) => {
                        const fileUrl = resolveUploadUrl(att.url)
                        const isImg = att.type?.startsWith('image/')

                        return (
                          <a
                            key={attIdx}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              isMe
                                ? 'bg-white/25 hover:bg-white/35 text-white'
                                : 'bg-white hover:bg-slate-100 text-slate-950 border border-slate-300 shadow-sm'
                            }`}
                          >
                            {isImg ? (
                              <ImageIcon className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            <span className="max-w-[120px] truncate">{att.name}</span>
                            <Download className="h-3 w-3 opacity-80 ml-0.5" />
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

        {/* AI Typing Indicator */}
        {isSending && (
          <div className="flex gap-2.5 items-center text-xs text-blue-700">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 border border-blue-300 text-blue-800 animate-pulse">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 border-2 border-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
              <span className="text-xs font-bold text-slate-800">Chitra AI sedang memproses tanggapan...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="border-t-2 border-slate-300 bg-white p-3 sm:p-4 rounded-b-2xl">
        {isClosed ? (
          <div className="rounded-xl bg-slate-100 border-2 border-slate-300 p-3 text-center text-xs sm:text-sm text-slate-700 font-bold">
            Tiket ini telah ditutup. Jika Anda memiliki kendala baru, silakan buat tiket baru.
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {/* Attachment preview tags */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-950"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-blue-700" />
                    <span className="max-w-[140px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-500 hover:text-rose-700 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <label
                className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 transition shadow-sm ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
                title="Lampirkan foto atau dokumen"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
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
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Tulis pesan atau pertanyaan... (Tekan Enter untuk kirim)"
                rows={1}
                className="min-h-[44px] max-h-32 flex-1 resize-none text-xs sm:text-sm font-bold leading-normal py-2.5 px-3.5 rounded-xl bg-white border-2 border-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-950 shadow-sm"
              />

              <Button
                type="submit"
                disabled={isSending || isUploading || (!inputMessage.trim() && attachments.length === 0)}
                className="h-11 w-11 shrink-0 rounded-xl bg-blue-700 hover:bg-blue-800 p-0 text-white shadow-sm transition-colors cursor-pointer"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Escalation Confirmation Dialog */}
      <Dialog open={isEscalateModalOpen} onOpenChange={setIsEscalateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950 tracking-tight font-display">
              Alihkan ke Staf Operasional HERO?
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-700 font-semibold mt-1">
              Tiket ini akan dialihkan dari AI Assistant langsung ke antrean tim penanggung jawab HERO
              sesuai site dan kategori ({ticket.category.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-black text-slate-900">
              Alasan Pengalihan (Opsional)
            </label>
            <Textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="Contoh: Butuh verifikasi fisik teknisi di lokasi, kendala mendesak..."
              rows={3}
              className="mt-1.5 text-xs sm:text-sm font-bold rounded-xl bg-white border-2 border-slate-300 text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2.5 pt-3 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEscalateModalOpen(false)}
              className="h-10 rounded-xl px-4 text-xs font-bold border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-900 shadow-sm transition-colors cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEscalate}
              disabled={isEscalating}
              className="h-10 gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              {isEscalating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengalihkan...</span>
                </>
              ) : (
                <>
                  <Headphones className="h-4 w-4" />
                  <span>Ya, Alihkan ke Staf HERO</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStatusBanner(status: string, picName?: string) {
  switch (status) {
    case 'bot_active':
      return {
        label: 'Chitra AI Aktif',
        style: 'bg-indigo-100 text-indigo-950 border border-indigo-400',
        icon: <Bot className="h-3.5 w-3.5 text-indigo-700" />,
      }
    case 'escalated':
      return {
        label: 'Dialihkan — Menunggu Staf HERO',
        style: 'bg-amber-100 text-amber-950 border border-amber-400',
        icon: <Clock className="h-3.5 w-3.5 text-amber-700" />,
      }
    case 'assigned':
    case 'in_progress':
      return {
        label: picName ? `Ditangani oleh ${picName}` : 'Sedang Ditangani Staf HERO',
        style: 'bg-sky-100 text-sky-950 border border-sky-400',
        icon: <UserCheck className="h-3.5 w-3.5 text-sky-700" />,
      }
    case 'resolved':
      return {
        label: 'Tiket Selesai (Resolved)',
        style: 'bg-emerald-100 text-emerald-950 border border-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />,
      }
    case 'closed':
      return {
        label: 'Tiket Telah Ditutup',
        style: 'bg-slate-200 text-slate-950 border border-slate-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-slate-700" />,
      }
    default:
      return {
        label: status,
        style: 'bg-slate-200 text-slate-950 border border-slate-400',
        icon: <AlertCircle className="h-3.5 w-3.5 text-slate-700" />,
      }
  }
}
