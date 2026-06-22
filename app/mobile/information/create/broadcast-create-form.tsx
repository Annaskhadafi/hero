"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ImageIcon, Video, FileText, Upload, Loader2, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { uploadFile } from "@/app/actions/upload"
import { createBroadcast } from "@/app/actions/broadcast"
import { toast } from "sonner"

type Category = { id: number; name: string; isActive: boolean }

export function BroadcastCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("image")
  const [imageUrl, setImageUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadFile(formData)
      if (res.url) {
        setImageUrl(res.url)
        toast.success("Gambar berhasil diunggah")
      } else {
        toast.error(res.error || "Gagal mengunggah gambar")
      }
    } catch {
      toast.error("Gagal mengunggah gambar")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Judul wajib diisi")
      return
    }
    if (mediaType !== "text" && !imageUrl && !videoUrl) {
      toast.error(mediaType === "image" ? "Gambar wajib diunggah" : "Link video wajib diisi")
      return
    }

    setSaving(true)
    try {
      await createBroadcast({
        title: title.trim(),
        content: content.trim() || undefined,
        imageUrl: mediaType === "image" ? imageUrl : mediaType === "video" ? videoUrl : undefined,
        linkUrl: linkUrl.trim() || undefined,
        mediaType,
        targetType: "all",
        categoryId: categoryId ? parseInt(categoryId) : undefined,
      })
      toast.success("Informasi berhasil dikirim")
      router.push("/mobile/information")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim informasi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full bg-white/50 shadow-sm">
          <Link href="/mobile/information">
            <ArrowLeft className="size-5 text-[#003461]" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Informasi HO</p>
          <h1 className="truncate text-xl font-black tracking-tight text-[#003461]">Buat Informasi Baru</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 rounded-[1.5rem] bg-white p-5 shadow-sm border">
        {/* Media Type */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-[#486275]">Tipe Media</Label>
          <div className="grid grid-cols-3 gap-2">
            {([["image", "Gambar", ImageIcon], ["video", "Video", Video], ["text", "Teks", FileText]] as const).map(([val, label, Icon]) => (
              <button
                key={val}
                type="button"
                onClick={() => { setMediaType(val); setImageUrl(""); setVideoUrl("") }}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] font-bold transition active:scale-95 ${
                  mediaType === val
                    ? "bg-[#003f78] text-white shadow"
                    : "bg-slate-50 text-[#486275] border border-slate-100"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-bold text-[#486275]">Judul <span className="text-rose-500">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul informasi..."
            className="h-12 rounded-xl border-slate-200"
            required
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm font-bold text-[#486275]">Deskripsi</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Isi informasi..."
            className="min-h-24 rounded-xl border-slate-200 resize-none"
            rows={4}
          />
        </div>

        {/* Image Upload / Video URL */}
        {mediaType === "image" && (
          <div className="space-y-2">
            <Label className="text-sm font-bold text-[#486275]">Upload Gambar <span className="text-rose-500">*</span></Label>
            <div className="flex items-center gap-3">
              <label className={`flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-[#486275] transition hover:border-[#003f78] hover:text-[#003f78] ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="size-4" />
                {uploading ? "Mengunggah..." : "Pilih Gambar"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadFile} disabled={uploading} />
              </label>
              {uploading && <Loader2 className="size-5 animate-spin text-[#003f78]" />}
            </div>
            {imageUrl && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <ImageIcon className="size-4 shrink-0" />
                <span className="truncate">Gambar terunggah</span>
              </div>
            )}
          </div>
        )}

        {mediaType === "video" && (
          <div className="space-y-2">
            <Label htmlFor="videoUrl" className="text-sm font-bold text-[#486275]">Link Video (MP4 / YouTube) <span className="text-rose-500">*</span></Label>
            <Input
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="h-12 rounded-xl border-slate-200"
            />
          </div>
        )}

        {/* Link URL */}
        <div className="space-y-2">
          <Label htmlFor="linkUrl" className="text-sm font-bold text-[#486275]">Tautan / Link</Label>
          <Input
            id="linkUrl"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="h-12 rounded-xl border-slate-200"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-bold text-[#486275]">Kategori</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-12 rounded-xl border-slate-200">
              <SelectValue placeholder="Pilih kategori (opsional)" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target - always all for mobile */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-[#486275]">Target</Label>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-[#486275] border border-slate-100">
            <Globe className="size-4" />
            Semua Karyawan
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-lg"
          size="lg"
        >
          {saving ? (
            <><Loader2 className="mr-2 size-4 animate-spin" />Mengirim...</>
          ) : (
            "Kirim Informasi"
          )}
        </Button>
      </form>
    </>
  )
}
