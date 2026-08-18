'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateAssetSize, updateAssetAttachment } from './actions'
import { toast } from 'sonner'
import { Loader2, Upload, Paperclip, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { format } from 'date-fns'

export function SizeInputCell({ assetId, initialSize }: { assetId: number; initialSize: string }) {
  const [size, setSize] = useState(initialSize || '')
  const [isSaving, setIsSaving] = useState(false)

  async function handleBlur() {
    if (size === initialSize) return
    setIsSaving(true)
    try {
      await updateAssetSize(assetId, size)
      toast.success('Ukuran sepatu berhasil disimpan')
    } catch (err) {
      toast.error('Gagal menyimpan ukuran sepatu')
      setSize(initialSize || '')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="relative w-20">
      <Input
        value={size}
        onChange={(e) => setSize(e.target.value)}
        onBlur={handleBlur}
        disabled={isSaving}
        placeholder="Size"
        className="h-8 px-2 text-center"
      />
      {isSaving && (
        <Loader2 className="text-muted-foreground absolute top-2 right-2 h-4 w-4 animate-spin" />
      )}
    </div>
  )
}

export interface AttachmentItem {
  url: string
  date: string
}

export function AttachmentCell({
  assetId,
  initialUrl,
}: {
  assetId: number
  initialUrl: string | null
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const getParsedAttachments = (urlStr: string | null): AttachmentItem[] => {
    if (!urlStr) return []
    try {
      const parsed = JSON.parse(urlStr)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch (e) {
      // Not JSON, fallback to legacy
    }
    return [{ url: urlStr, date: new Date().toISOString() }]
  }

  const [attachments, setAttachments] = useState<AttachmentItem[]>(() =>
    getParsedAttachments(initialUrl)
  )

  useEffect(() => {
    setAttachments(getParsedAttachments(initialUrl))
  }, [initialUrl])

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/uploads/activity-presign', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Gagal mengupload file')
      }

      const data = await res.json()

      if (data.url) {
        const newItem: AttachmentItem = { url: data.url, date: new Date().toISOString() }
        const newAttachments = [newItem, ...attachments]

        await updateAssetAttachment(assetId, JSON.stringify(newAttachments))

        setAttachments(newAttachments)
        toast.success('Bukti penerimaan berhasil diupload')
      } else {
        throw new Error('URL file tidak ditemukan')
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengupload file')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDelete(indexToDelete: number) {
    if (!confirm('Yakin ingin menghapus foto ini?')) return

    try {
      const newAttachments = attachments.filter((_, idx) => idx !== indexToDelete)

      const payload = newAttachments.length > 0 ? JSON.stringify(newAttachments) : null
      await updateAssetAttachment(assetId, payload)

      setAttachments(newAttachments)
      toast.success('Foto berhasil dihapus')
      if (newAttachments.length === 0) {
        setIsOpen(false)
      }
    } catch (err) {
      toast.error('Gagal menghapus foto')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf"
      />
      {attachments.length > 0 ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Paperclip className="mr-2 h-4 w-4" />
              Lihat ({attachments.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Galeri Bukti Pengambilan</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Foto Tambahan
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {attachments.map((item, idx) => (
                  <div
                    key={idx}
                    className="group bg-muted/30 relative flex flex-col overflow-hidden rounded-lg border"
                  >
                    <div className="bg-muted/50 text-muted-foreground flex items-center justify-between border-b p-2 text-xs">
                      <span>{format(new Date(item.date), 'dd MMM yyyy, HH:mm')}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDelete(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="bg-background flex min-h-[150px] flex-1 items-center justify-center p-2">
                      {item.url.toLowerCase().includes('.pdf') ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                          <Paperclip className="h-10 w-10" />
                          <span className="text-sm font-medium">Dokumen PDF</span>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={`Attachment ${idx + 1}`}
                          className="max-h-[150px] rounded-md object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'https://placehold.co/400x300?text=File'
                          }}
                        />
                      )}
                    </div>
                    <div className="bg-muted/30 border-t p-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button variant="secondary" size="sm" className="h-8 w-full">
                          Lihat Penuh
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="h-8"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      )}
    </div>
  )
}
