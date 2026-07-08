"use client"

import { useRef, useState, useTransition } from "react"
import { Upload, FileText, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { uploadFile } from "@/app/actions/upload"
import { uploadQuotationPoFile } from "@/app/actions/service360"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function QuotationPoUpload({ quotationId, poFileUrl }: { quotationId: number; poFileUrl: string }) {
  const [isPending, startTransition] = useTransition()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [currentUrl, setCurrentUrl] = useState(poFileUrl)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF and image files are allowed")
      return
    }

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("file", file)
        toast.info("Uploading PO file...")
        const res = await uploadFile(formData)
        if (res.success) {
          await uploadQuotationPoFile(quotationId, res.url)
          setCurrentUrl(res.url)
          toast.success("PO uploaded — status changed to PO Release")
          router.refresh()
        } else {
          toast.error("Upload failed")
        }
      } catch {
        toast.error("Error uploading PO file")
      }
    })

    if (inputRef.current) inputRef.current.value = ""
  }

  const isPdf = currentUrl?.toLowerCase().includes('.pdf')

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={currentUrl ? "ghost" : "outline"}
        size="icon"
        className={`h-7 w-7 shrink-0 ${currentUrl ? 'text-emerald-600 hover:text-emerald-700' : 'text-muted-foreground hover:text-primary'}`}
        title={currentUrl ? "Re-upload PO" : "Upload PO"}
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
      </Button>

      {currentUrl && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-blue-600 hover:text-blue-700"
              title="Preview PO"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                PO Document Preview
              </DialogTitle>
            </DialogHeader>
            <div className="w-full h-full rounded-lg overflow-hidden border bg-muted/30">
              {isPdf ? (
                <iframe
                  src={currentUrl}
                  className="w-full h-[75vh]"
                  title="PO Document"
                />
              ) : (
                <div className="flex items-center justify-center h-[75vh] p-4">
                  <img
                    src={currentUrl}
                    alt="PO Document"
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}
