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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Ticket Status Bar & Handover Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.style}`}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </span>

          {ticket.priority === 'urgent' && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
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
            className="h-8 gap-1.5 rounded-lg bg-amber-500 text-xs font-semibold text-slate-950 hover:bg-amber-600"
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>Minta Bantuan Tim HERO</span>
          </Button>
        )}
      </div>

      {/* Resolution Note Alert if Resolved */}
      {ticket.resolutionNotes && (
        <div className="border-b border-emerald-100 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-800">
          <strong>Catatan Penyelesaian:</strong> {ticket.resolutionNotes}
        </div>
      )}

      {/* Chat Messages Stream */}
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
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isBot
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm'
                      : 'bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-sm'
                  }`}
                >
                  {isBot ? <Bot className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Header label above bubble */}
                <div
                  className={`flex items-center gap-1.5 text-[11px] ${
                    isMe ? 'justify-end text-slate-500' : 'text-slate-600'
                  }`}
                >
                  {isBot ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
                      <Sparkles className="h-3 w-3" />
                      Chitra Smart Ticketing
                    </span>
                  ) : isAgent ? (
                    <span className="font-semibold text-sky-800">
                      {msg.senderEmployee?.name || 'Staf Spesialis HERO'}
                      <span className="ml-1 text-[10px] font-normal text-slate-400">(HERO)</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-700">Anda</span>
                  )}

                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Bubble Container */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : isBot
                      ? 'bg-indigo-50/70 text-slate-900 border border-indigo-100/80 rounded-tl-none'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>

                  {/* Attachments if any */}
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
                              isMe
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
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

        {/* AI Typing Indicator */}
        {isSending && (
          <div className="flex gap-3 items-center text-xs text-indigo-600">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-indigo-50 px-4 py-2 border border-indigo-100">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Chitra Smart Ticketing sedang memproses tanggapan...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="border-t border-slate-200/80 bg-white p-3 sm:p-4">
        {isClosed ? (
          <div className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">
            Tiket ini telah ditutup. Jika Anda memiliki kendala baru, silakan buat tiket baru.
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {/* Attachment preview tags */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
                  >
                    <Paperclip className="h-3 w-3 text-indigo-600" />
                    <span className="max-w-[140px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <label
                className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
                title="Lampirkan foto atau dokumen"
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
                className="min-h-[40px] max-h-32 flex-1 resize-none text-xs leading-normal py-2.5"
              />

              <Button
                type="submit"
                disabled={isSending || isUploading || (!inputMessage.trim() && attachments.length === 0)}
                className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 p-0 text-white hover:bg-indigo-700"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Alihkan ke Staf Operasional HERO?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tiket ini akan dialihkan dari AI Assistant langsung ke antrean tim penanggung jawab HERO
              sesuai site dan kategori ({ticket.category.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-semibold text-slate-700">
              Alasan Pengalihan (Opsional)
            </label>
            <Textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="Contoh: Butuh verifikasi fisik teknisi di lokasi, kendala mendesak..."
              rows={3}
              className="mt-1 text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEscalateModalOpen(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEscalate}
              disabled={isEscalating}
              className="h-8 gap-1.5 bg-amber-500 text-xs font-semibold text-slate-950 hover:bg-amber-600"
            >
              {isEscalating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Mengalihkan...</span>
                </>
              ) : (
                <>
                  <Headphones className="h-3.5 w-3.5" />
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
        label: 'Chitra Smart Ticketing Aktif',
        style: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
        icon: <Bot className="h-3.5 w-3.5 animate-pulse text-indigo-600" />,
      }
    case 'escalated':
      return {
        label: 'Dialihkan — Menunggu Konfirmasi Staf HERO',
        style: 'bg-amber-50 text-amber-700 border border-amber-200/80',
        icon: <Clock className="h-3.5 w-3.5" />,
      }
    case 'assigned':
    case 'in_progress':
      return {
        label: picName ? `Ditangani oleh ${picName}` : 'Sedang Ditangani Staf HERO',
        style: 'bg-sky-50 text-sky-700 border border-sky-200/80',
        icon: <UserCheck className="h-3.5 w-3.5" />,
      }
    case 'resolved':
      return {
        label: 'Tiket Selesai (Resolved)',
        style: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      }
    case 'closed':
      return {
        label: 'Tiket Telah Ditutup',
        style: 'bg-slate-100 text-slate-600 border border-slate-200',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      }
    default:
      return {
        label: status,
        style: 'bg-slate-100 text-slate-700',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
      }
  }
}
