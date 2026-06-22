"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage, closeSession, getMessages } from "@/app/actions/hr-counseling";
import { uploadCurhatAttachment } from "@/app/actions/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, CheckCircle2, Paperclip, Loader2, FileText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

type Message = {
  id: number;
  senderId: number;
  senderName: string;
  message: string;
  attachmentUrl?: string | null;
  readableUrl?: string | null;
  fileName?: string | null;
  createdAt: Date;
};

type Session = {
  id: number;
  hrId: number;
  hrName: string;
  userId: number;
  userName: string;
  category: string;
  status: string;
};

export default function ChatClient({
  session,
  initialMessages,
  currentUserId,
  isHrView = false,
  backPath,
}: {
  session: Session;
  initialMessages: Message[];
  currentUserId: number;
  isHrView?: boolean;
  backPath?: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; fileName: string; readableUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const isNearBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;
    const threshold = 120;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  // Auto-scroll when own messages arrive or when user is already near bottom.
  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  // Realtime polling: fetch new messages every 3 seconds while session is open.
  useEffect(() => {
    if (session.status !== "open") return;

    const poll = async () => {
      try {
        const fresh = await getMessages(session.id);
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = fresh.filter((m) => !existingIds.has(m.id));
          if (newMessages.length === 0) return prev;
          return [...prev, ...newMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [session.id, session.status]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !pendingAttachment) || isSending || session.status === "closed") return;

    setIsSending(true);
    setInput("");

    try {
      const newMsg = await sendMessage(
        session.id,
        text,
        pendingAttachment?.url || null,
        pendingAttachment?.fileName || null
      );
      if (newMsg) {
        setMessages((prev) => [
          ...prev,
          {
            ...newMsg,
            senderName: isHrView ? session.hrName : session.userName,
            readableUrl: pendingAttachment?.readableUrl || null,
            fileName: pendingAttachment?.fileName || newMsg.attachmentFileName || null,
          },
        ]);
        setPendingAttachment(null);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim pesan");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = async () => {
    if (!confirm("Apakah Anda yakin ingin menutup sesi ini? Sesi yang ditutup tidak bisa membalas pesan lagi.")) return;
    setIsClosing(true);
    try {
      await closeSession(session.id);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsClosing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (session.status === "closed") {
      toast.error("Sesi telah ditutup, tidak bisa mengunggah file.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadCurhatAttachment(formData);
      if (!result.success || !result.url) {
        toast.error(result.error || "Gagal mengunggah file");
        return;
      }

      setPendingAttachment({
        url: result.url,
        readableUrl: result.readableUrl || result.url,
        fileName: result.fileName || file.name,
      });
      toast.success("File siap dikirim");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunggah file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const defaultBackLink = isHrView ? "/dashboard/hr-counseling" : "/dashboard/curhat";
  const backLink = backPath || defaultBackLink;
  const chatPartnerName = isHrView ? session.userName : session.hrName;

  return (
    <div className="container mx-auto p-0 md:p-4 max-w-3xl flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-100px)]">
      <div className="flex-1 flex flex-col bg-background md:border md:rounded-xl md:shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b bg-card z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="-ml-2 shrink-0" asChild>
              <Link href={backLink}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold leading-none">{chatPartnerName}</h1>
                <Badge variant={session.status === "open" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                  {session.status === "open" ? "Aktif" : "Selesai"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px] md:max-w-xs">Kategori: {session.category}</p>
            </div>
          </div>
          {session.status === "open" && (
            <Button variant="secondary" size="sm" onClick={handleClose} disabled={isClosing} className="text-xs shrink-0">
              {isClosing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1.5" />}
              <span className="hidden sm:inline">Selesaikan</span>
            </Button>
          )}
        </div>

        {/* Chat Area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-background">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Belum ada pesan. Mulai sapa {chatPartnerName}.
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 flex flex-col gap-2 ${
                      isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.message && <p className="text-sm">{msg.message}</p>}
                    {msg.readableUrl && (
                      <div className="mt-1">
                        {msg.attachmentUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <img
                            src={msg.readableUrl}
                            alt="Attachment"
                            className="max-w-full max-h-48 rounded-md object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(msg.readableUrl || null)}
                          />
                        ) : (
                          <a
                            href={msg.readableUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-xs flex items-center gap-1.5 bg-background/20 rounded px-2 py-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {msg.fileName || "Lihat Lampiran"}
                            </span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t bg-card space-y-2">
          {pendingAttachment && (
            <div className="flex items-center gap-2 text-xs bg-muted/60 rounded-full pl-3 pr-1.5 py-1.5 w-fit max-w-full">
              {pendingAttachment.readableUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <img src={pendingAttachment.readableUrl} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate max-w-[180px] md:max-w-xs">{pendingAttachment.fileName}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full ml-1"
                onClick={() => setPendingAttachment(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={session.status === "closed" || isUploading || isSending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground shrink-0 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={session.status === "closed" || isUploading || isSending}
              title="Lampirkan file / dokumen"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Paperclip className="w-5 h-5" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={session.status === "closed" ? "Sesi telah ditutup" : "Ketik pesan..."}
              disabled={session.status === "closed" || isSending || isUploading}
              className="flex-1 bg-muted/60 border-transparent focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full px-4"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 rounded-full shadow-sm"
              disabled={(!input.trim() && !pendingAttachment) || session.status === "closed" || isSending || isUploading}
            >
              <Send className="w-4 h-4 ml-0.5" />
              <span className="sr-only">Kirim</span>
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview Image"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
