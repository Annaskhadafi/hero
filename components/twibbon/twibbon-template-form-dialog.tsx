'use client'

import * as React from 'react'
import { CheckCircle2, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import {
  createTwibbonTemplateAction,
  updateTwibbonTemplateAction,
  uploadTwibbonPngAction,
} from '@/app/actions/twibbon'
import {
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroSearchableSelect,
  HeroSwitch,
  HeroTextarea,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  TWIBBON_ASPECT_RATIOS,
  TWIBBON_CATEGORY_OPTIONS,
  TWIBBON_RATIO_ORDER,
  type TwibbonAspectRatio,
  type TwibbonTemplateDTO,
} from '@/lib/twibbon'
import { cn } from '@/lib/utils'

interface TwibbonTemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTemplate?: TwibbonTemplateDTO | null
  onSaved: (saved: TwibbonTemplateDTO) => void
}

export function TwibbonTemplateFormDialog({
  open,
  onOpenChange,
  initialTemplate,
  onSaved,
}: TwibbonTemplateFormDialogProps) {
  const isEditing = Boolean(initialTemplate?.id)

  const [title, setTitle] = React.useState('')
  const [category, setCategory] = React.useState('Campaign')
  const [description, setDescription] = React.useState('')
  const [captionText, setCaptionText] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  const [squareUrl, setSquareUrl] = React.useState<string | null>(null)
  const [portraitUrl, setPortraitUrl] = React.useState<string | null>(null)
  const [storyUrl, setStoryUrl] = React.useState<string | null>(null)

  const [uploadingRatio, setUploadingRatio] = React.useState<TwibbonAspectRatio | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (initialTemplate) {
      setTitle(initialTemplate.title || '')
      setCategory(initialTemplate.category || 'Campaign')
      setDescription(initialTemplate.description || '')
      setCaptionText(initialTemplate.captionText || '')
      setIsActive(initialTemplate.status !== 'inactive')
      setSquareUrl(initialTemplate.squareUrl || null)
      setPortraitUrl(initialTemplate.portraitUrl || null)
      setStoryUrl(initialTemplate.storyUrl || null)
    } else {
      setTitle('')
      setCategory('Campaign')
      setDescription('')
      setCaptionText('')
      setIsActive(true)
      setSquareUrl(null)
      setPortraitUrl(null)
      setStoryUrl(null)
    }
  }, [open, initialTemplate])

  const getUrlByRatio = (ratio: TwibbonAspectRatio) => {
    if (ratio === '1:1') return squareUrl
    if (ratio === '4:5') return portraitUrl
    return storyUrl
  }

  const setUrlByRatio = (ratio: TwibbonAspectRatio, url: string | null) => {
    if (ratio === '1:1') setSquareUrl(url)
    else if (ratio === '4:5') setPortraitUrl(url)
    else setStoryUrl(url)
  }

  const handlePngSelected = async (
    ratio: TwibbonAspectRatio,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') {
      toast.error('File frame Twibbon wajib berformat PNG (.png) dengan latar transparan.')
      return
    }

    setUploadingRatio(ratio)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ratio', ratio)

      const res = await uploadTwibbonPngAction(formData)
      if (!res.success || !res.url) {
        toast.error(res.error || 'Gagal mengunggah frame PNG.')
        return
      }

      setUrlByRatio(ratio, res.url)
      toast.success(`Frame ${TWIBBON_ASPECT_RATIOS[ratio].label} berhasil diunggah!`)
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat mengunggah PNG.')
    } finally {
      setUploadingRatio(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Judul campaign Twibbon wajib diisi.')
      return
    }

    if (!squareUrl && !portraitUrl && !storyUrl) {
      toast.error('Unggah minimal 1 frame PNG (1:1, 4:5, atau 9:16).')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        category,
        description: description.trim() || null,
        captionText: captionText.trim() || null,
        squareUrl,
        portraitUrl,
        storyUrl,
        status: isActive ? ('active' as const) : ('inactive' as const),
      }

      const res = isEditing && initialTemplate
        ? await updateTwibbonTemplateAction(initialTemplate.id, payload)
        : await createTwibbonTemplateAction(payload)

      if (!res.success || !res.data) {
        toast.error(res.error || 'Gagal menyimpan template Twibbon.')
        return
      }

      toast.success(
        isEditing
          ? 'Template Twibbon berhasil diperbarui.'
          : 'Template Twibbon berhasil disimpan & dipublikasikan!'
      )
      onSaved(res.data)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan template.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Template Twibbon' : 'Buat Template Twibbon Baru'}
      description="Unggah frame PNG transparan untuk ukuran Instagram (1:1 Square, 4:5 Portrait, 9:16 Story/Reels). Minimal 1 ukuran wajib diunggah."
      maxWidth="2xl"
      submitLabel={isEditing ? 'Simpan Perubahan' : 'Publikasikan Template'}
      isSubmitting={isSubmitting || uploadingRatio !== null}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HeroFormField label="Judul Campaign / Template" required>
          <HeroInput
            placeholder="Misal: HUT PT Chitra Paratama 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </HeroFormField>

        <HeroFormField label="Kategori" required>
          <HeroSearchableSelect
            value={category}
            onChange={(val: string) => setCategory(val || 'Campaign')}
            options={TWIBBON_CATEGORY_OPTIONS}
            placeholder="Pilih kategori..."
          />
        </HeroFormField>
      </div>

      <HeroFormField label="Deskripsi Singkat">
        <HeroInput
          placeholder="Instruksi singkat penggunaan twibbon untuk karyawan..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </HeroFormField>

      <HeroFormField
        label="Caption & Hashtag Instagram (Opsional)"
        helperText="Karyawan bisa langsung menyalin caption ini saat membagikan hasil twibbon."
      >
        <HeroTextarea
          rows={3}
          maxLength={600}
          showCount
          placeholder="Bangga menjadi bagian dari keluarga besar PT Chitra Paratama! #OneChitra #HERO"
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
        />
      </HeroFormField>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Frame PNG Transparan (Ukuran Instagram) <span className="text-rose-500">*</span>
          </span>
          <span className="text-[11px] text-slate-400">Otomatis dinormalisasi ke 1080px</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TWIBBON_RATIO_ORDER.map((ratio) => {
            const spec = TWIBBON_ASPECT_RATIOS[ratio]
            const currentUrl = getUrlByRatio(ratio)
            const isUploading = uploadingRatio === ratio
            const inputId = `twibbon-png-${ratio.replace(':', '-')}`

            return (
              <div
                key={ratio}
                className={cn(
                  'flex flex-col rounded-xl border p-3 transition-colors',
                  currentUrl
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50/60'
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-1">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{spec.label}</p>
                    <p className="text-[10px] text-slate-500">
                      {spec.width} × {spec.height} px
                    </p>
                  </div>
                  {currentUrl && (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  )}
                </div>

                {/* Preview box with checkerboard transparency pattern */}
                <div
                  className="relative mb-2.5 flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200/80"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1.5 text-blue-600">
                      <Loader2 className="size-6 animate-spin" />
                      <span className="text-[11px] font-semibold">Mengunggah PNG...</span>
                    </div>
                  ) : currentUrl ? (
                    <img
                      src={resolveUploadUrl(currentUrl)}
                      alt={`Preview ${spec.label}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-center text-slate-400 px-2">
                      <ImagePlus className="size-6" />
                      <span className="text-[10px] font-medium">Belum ada PNG</span>
                    </div>
                  )}
                </div>

                <input
                  id={inputId}
                  type="file"
                  accept="image/png,.png"
                  className="hidden"
                  onChange={(e) => handlePngSelected(ratio, e)}
                  disabled={uploadingRatio !== null}
                />

                <div className="mt-auto flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant={currentUrl ? 'outline' : 'default'}
                    size="dense"
                    className="h-9 flex-1 gap-1.5 text-xs"
                    disabled={uploadingRatio !== null}
                    onClick={() => document.getElementById(inputId)?.click()}
                  >
                    <Upload className="size-3.5" />
                    <span>{currentUrl ? 'Ganti PNG' : 'Upload PNG'}</span>
                  </Button>

                  {currentUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="dense"
                      className="h-9 w-9 shrink-0 px-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      disabled={uploadingRatio !== null}
                      onClick={() => setUrlByRatio(ratio, null)}
                      title="Hapus varian ini"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <HeroSwitch
        label="Status Aktif"
        description="Template aktif akan muncul di galeri Desktop dan Mobile HERO untuk digunakan semua karyawan."
        checked={isActive}
        onCheckedChange={setIsActive}
      />
    </HeroFormDialog>
  )
}
