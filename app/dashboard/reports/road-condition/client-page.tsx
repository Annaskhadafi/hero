'use client'

import * as React from 'react'
import { ImageIcon, Loader2, Plus, Printer, RotateCcw, Trash2, Upload, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { HeroMenuPermission } from '@/lib/hero-access'
import {
  ROAD_CONDITION_CATEGORIES,
  ROAD_CONDITION_CATEGORY_OPTIONS,
  type RoadConditionCategoryKey,
} from '@/lib/road-condition-rubric'

type SiteOption = {
  id: number
  name: string
  customerName: string | null
}

type PhotoSlot = {
  angle: string
  file: File | null
  previewUrl: string
  caption: string
}

type AnalysisAssessment = {
  criterionId: string
  score: number
  description: string
  recommendation: string
}

type AnalysisResult = {
  summary: string
  overallScore: number
  assessments: AnalysisAssessment[]
  photoCaptions?: Array<{ angle: string; caption: string }>
}

type CategoryDraft = {
  id: string
  categoryKey: RoadConditionCategoryKey
  photos: PhotoSlot[]
  analysis: AnalysisResult | null
  model: string
  isAnalyzing: boolean
}

type AnalysisStatus = {
  tone: 'info' | 'success' | 'error'
  message: string
}

const PHOTO_ANGLES = ['Angle 1', 'Angle 2', 'Angle 3']
const DEFAULT_CATEGORY_KEY: RoadConditionCategoryKey = 'haulroad'

function dateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function initialPhotos(): PhotoSlot[] {
  return PHOTO_ANGLES.map((angle) => ({
    angle,
    file: null,
    previewUrl: '',
    caption: '',
  }))
}

function createDraft(categoryKey: RoadConditionCategoryKey): CategoryDraft {
  return {
    id: categoryKey,
    categoryKey,
    photos: initialPhotos(),
    analysis: null,
    model: '',
    isAnalyzing: false,
  }
}

function revokePhotos(photos: PhotoSlot[]) {
  photos.forEach((photo) => {
    if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl)
  })
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'))
    reader.readAsDataURL(file)
  })
}

function formatReportDate(value: string) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function scoreTone(score: number) {
  if (score >= 5) return 'bg-emerald-100 text-emerald-900 ring-emerald-200'
  if (score >= 4) return 'bg-sky-100 text-sky-900 ring-sky-200'
  if (score >= 3) return 'bg-amber-100 text-amber-900 ring-amber-200'
  return 'bg-rose-100 text-rose-900 ring-rose-200'
}

export function RoadConditionAnalysisClient({
  access,
  sites,
}: {
  access: HeroMenuPermission
  sites: SiteOption[]
}) {
  const [siteId, setSiteId] = React.useState('')
  const [siteName, setSiteName] = React.useState('')
  const [customerName, setCustomerName] = React.useState('')
  const [reportDate, setReportDate] = React.useState(dateInputValue())
  const [drafts, setDrafts] = React.useState<CategoryDraft[]>(() => [createDraft(DEFAULT_CATEGORY_KEY)])
  const [activeDraftId, setActiveDraftId] = React.useState(() => drafts[0]?.id ?? '')
  const [analysisStatus, setAnalysisStatus] = React.useState<AnalysisStatus | null>(null)
  const draftsRef = React.useRef(drafts)

  const canAnalyze = access.canView
  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) ?? drafts[0]
  const activeCategory = ROAD_CONDITION_CATEGORIES[activeDraft.categoryKey]
  const usedCategoryKeys = new Set(drafts.map((draft) => draft.categoryKey))
  const availableCategoryOptions = ROAD_CONDITION_CATEGORY_OPTIONS.filter(
    (option) => !usedCategoryKeys.has(option.value as RoadConditionCategoryKey)
  )
  const allAnalyzed = drafts.length > 0 && drafts.every((draft) => draft.analysis)

  React.useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  React.useEffect(() => {
    return () => {
      draftsRef.current.forEach((draft) => revokePhotos(draft.photos))
    }
  }, [])

  const clearAnalysis = React.useCallback(() => {
    setDrafts((current) => current.map((draft) => ({ ...draft, analysis: null, model: '' })))
  }, [])

  const patchDraft = React.useCallback((draftId: string, patch: Partial<CategoryDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft))
    )
  }, [])

  const patchDraftPhotos = React.useCallback((draftId: string, photos: PhotoSlot[]) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId ? { ...draft, photos, analysis: null, model: '' } : draft
      )
    )
  }, [])

  const updatePhoto = (draftId: string, index: number, next: Partial<PhotoSlot>) => {
    const draft = drafts.find((item) => item.id === draftId)
    if (!draft) return

    patchDraftPhotos(
      draftId,
      draft.photos.map((photo, photoIndex) => (photoIndex === index ? { ...photo, ...next } : photo))
    )
  }

  const handleSiteChange = (value: string) => {
    const site = sites.find((item) => String(item.id) === value)
    setSiteId(value)
    setSiteName(site?.name ?? '')
    setCustomerName(site?.customerName ?? '')
    setAnalysisStatus(null)
    clearAnalysis()
  }

  const handleFileChange = (draftId: string, index: number, file: File | null) => {
    const draft = drafts.find((item) => item.id === draftId)
    const currentUrl = draft?.photos[index]?.previewUrl
    if (currentUrl) URL.revokeObjectURL(currentUrl)

    if (!file) {
      updatePhoto(draftId, index, { file: null, previewUrl: '' })
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5MB.')
      return
    }

    updatePhoto(draftId, index, { file, previewUrl: URL.createObjectURL(file) })
  }

  const addCategory = (categoryKey: RoadConditionCategoryKey) => {
    if (usedCategoryKeys.has(categoryKey)) return

    const draft = createDraft(categoryKey)
    setDrafts((current) => [...current, draft])
    setActiveDraftId(draft.id)
  }

  const removeCategory = (draftId: string) => {
    const draft = drafts.find((item) => item.id === draftId)
    if (!draft || drafts.length === 1) return

    revokePhotos(draft.photos)
    const nextDrafts = drafts.filter((item) => item.id !== draftId)
    setDrafts(nextDrafts)
    if (activeDraftId === draftId) {
      setActiveDraftId(nextDrafts[0]?.id ?? '')
    }
  }

  const resetForm = () => {
    drafts.forEach((draft) => revokePhotos(draft.photos))
    const draft = createDraft(DEFAULT_CATEGORY_KEY)
    setSiteId('')
    setSiteName('')
    setCustomerName('')
    setReportDate(dateInputValue())
    setDrafts([draft])
    setActiveDraftId(draft.id)
  }

  const validateDraft = (draft: CategoryDraft) => {
    if (!canAnalyze) throw new Error('Akses analisis ditolak.')
    if (!siteName || !customerName || !reportDate) {
      throw new Error('Site, customer, dan tanggal wajib diisi.')
    }
    if (draft.photos.some((photo) => !photo.file)) {
      throw new Error(`${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label}: wajib unggah 3 foto angle berbeda.`)
    }
  }

  const analyzeDraft = async (draft: CategoryDraft, quiet = false) => {
    validateDraft(draft)
    patchDraft(draft.id, { isAnalyzing: true })
    setAnalysisStatus({
      tone: 'info',
      message: `Menganalisis ${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label}...`,
    })

    try {
      const photoPayload = await Promise.all(
        draft.photos.map(async (photo) => ({
          angle: photo.angle,
          caption: photo.caption,
          mimeType: photo.file!.type,
          dataUrl: await fileToDataUrl(photo.file!),
        }))
      )

      // ponytail: browser-only draft; persist reports when audit/history is required.
      const response = await fetch('/api/reports/road-condition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          customerName,
          reportDate,
          category: draft.categoryKey,
          photos: photoPayload,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Gagal menjalankan AI analisis. Status ${response.status}.`)
      }

      patchDraft(draft.id, {
        photos: draft.photos,
        analysis: payload.result,
        model: payload.model || '',
        isAnalyzing: false,
      })
      if (!quiet) {
        const message = `${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label} selesai dianalisis.`
        setAnalysisStatus({ tone: 'success', message })
        toast.success(message)
      }
    } catch (error) {
      patchDraft(draft.id, { isAnalyzing: false })
      throw error
    }
  }

  const runActiveAnalysis = async () => {
    try {
      await analyzeDraft(activeDraft)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menjalankan AI analisis.'
      setAnalysisStatus({ tone: 'error', message })
      toast.error(message)
    }
  }

  const analyzeActive = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await runActiveAnalysis()
  }

  const analyzeAll = async () => {
    try {
      for (const draft of draftsRef.current) {
        await analyzeDraft(draft, true)
      }
      setAnalysisStatus({ tone: 'success', message: 'Semua kategori selesai dianalisis.' })
      toast.success('Semua kategori selesai dianalisis.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menjalankan AI analisis.'
      setAnalysisStatus({ tone: 'error', message })
      toast.error(message)
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <style
            dangerouslySetInnerHTML={{
              __html: `
                .road-condition-slide { position: relative; }
                @page { size: 297mm 167.063mm; margin: 0; }
                @media print {
              body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              body * { visibility: hidden !important; }
              #road-condition-print-root, #road-condition-print-root * { visibility: visible !important; }
              #road-condition-print-root { position: absolute !important; inset: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
              .road-condition-no-print { display: none !important; }
              .road-condition-slide { width: 297mm !important; height: 167.063mm !important; page-break-after: always !important; break-after: page !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
              .road-condition-slide:last-child { page-break-after: auto !important; break-after: auto !important; }
            }
          `,
        }}
      />

      <form onSubmit={analyzeActive} className="road-condition-no-print grid gap-5 xl:grid-cols-[390px_1fr]">
        <section className="space-y-4 rounded-[1.1rem] bg-white p-5 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-950">Form Report</h2>
            <div className="h-1 w-14 rounded-full" style={{ backgroundColor: activeCategory.color }} />
          </div>

          <div className="space-y-2">
            <Label>Lokasi Site</Label>
            <Select value={siteId} onValueChange={handleSiteChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={String(site.id)}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Customer</Label>
            <Input
              value={customerName}
              onChange={(event) => {
                setCustomerName(event.target.value)
                clearAnalysis()
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={reportDate}
              onChange={(event) => {
                setReportDate(event.target.value)
                clearAnalysis()
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori Dalam Report</Label>
            <div className="grid gap-2">
              {drafts.map((draft) => {
                const category = ROAD_CONDITION_CATEGORIES[draft.categoryKey]
                return (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => setActiveDraftId(draft.id)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ring-1 transition ${
                      activeDraftId === draft.id
                        ? 'bg-slate-950 text-white ring-slate-950'
                        : 'bg-slate-50 text-slate-700 ring-slate-100 hover:bg-white'
                    }`}
                  >
                    <span>{category.label}</span>
                    <span className="flex items-center gap-2">
                      {draft.analysis ? <Badge variant="secondary">Done</Badge> : null}
                      {draft.isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {availableCategoryOptions.length > 0 ? (
            <Select onValueChange={(value) => addCategory(value as RoadConditionCategoryKey)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tambah kategori" />
              </SelectTrigger>
              <SelectContent>
                {availableCategoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={runActiveAnalysis} disabled={activeDraft.isAnalyzing || !canAnalyze}>
              {activeDraft.isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              AI Kategori
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={analyzeAll}
              disabled={!canAnalyze || drafts.some((draft) => draft.isAnalyzing)}
            >
              <Wand2 className="size-4" />
              AI Semua
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} disabled={drafts.some((draft) => draft.isAnalyzing)}>
              <RotateCcw className="size-4" />
              Reset
                </Button>
              </div>

              {analysisStatus ? (
                <div
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${
                    analysisStatus.tone === 'error'
                      ? 'bg-rose-50 text-rose-900 ring-rose-200'
                      : analysisStatus.tone === 'success'
                        ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                        : 'bg-sky-50 text-sky-900 ring-sky-200'
                  }`}
                >
                  {analysisStatus.message}
                </div>
              ) : null}
            </section>

        <section className="rounded-[1.1rem] bg-white p-5 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Upload 3 Angle</h2>
              <p className="text-xs font-semibold text-slate-500">{activeCategory.reportLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{activeCategory.label}</Badge>
              {drafts.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeCategory(activeDraft.id)}
                  disabled={activeDraft.isAnalyzing}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {activeDraft.photos.map((photo, index) => (
              <div key={photo.angle} className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <Label>{photo.angle}</Label>
                  <Badge variant="secondary">{index + 1}/3</Badge>
                </div>

                <label className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                  {photo.previewUrl ? (
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || photo.angle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-sm font-semibold text-slate-500">
                      <ImageIcon className="size-8" />
                      Foto
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange(activeDraft.id, index, event.target.files?.[0] ?? null)}
                  />
                </label>

                <Textarea
                  value={photo.caption}
                  onChange={(event) => updatePhoto(activeDraft.id, index, { caption: event.target.value })}
                  placeholder="Keterangan foto"
                  className="min-h-20 resize-none bg-white"
                />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = () => handleFileChange(activeDraft.id, index, input.files?.[0] ?? null)
                    input.click()
                  }}
                >
                  <Upload className="size-4" />
                  Upload
                </Button>
              </div>
            ))}
          </div>
        </section>
      </form>

      <section className="road-condition-no-print flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-slate-950">Compiled Report Slide</h2>
          <p className="text-xs font-semibold text-slate-500">
            {drafts.length} kategori · {drafts.filter((draft) => draft.analysis).length} sudah dianalisis
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} disabled={!allAnalyzed}>
          <Printer className="size-4" />
          Cetak PDF Gabungan
        </Button>
      </section>

      <div id="road-condition-print-root" className="mx-auto grid max-w-7xl gap-5">
        {drafts.map((draft, slideIndex) => {
          const category = ROAD_CONDITION_CATEGORIES[draft.categoryKey]
          const analysis = draft.analysis
          const reportPhotos = draft.photos.map((photo) => ({
            ...photo,
            caption:
              analysis?.photoCaptions?.find((item) => item.angle === photo.angle)?.caption ||
              photo.caption ||
              photo.angle,
            imageUrl: photo.previewUrl,
          }))

          return (
            <article
              key={draft.id}
              className="road-condition-slide aspect-video overflow-hidden rounded-[1.1rem] bg-white shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200"
            >
              <header
                className="grid h-[18%] gap-3 px-5 py-4 text-slate-950 md:grid-cols-[1fr_auto]"
                style={{ backgroundColor: category.color }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-900/70">
                    Report Analysis Road Condition
                  </p>
                  <h2 className="mt-1 truncate font-display text-3xl font-semibold leading-tight">
                    {category.reportLabel}
                  </h2>
                  {analysis ? <p className="mt-1 line-clamp-2 max-w-3xl text-xs font-semibold">{analysis.summary}</p> : null}
                </div>
                <div className="grid min-w-[250px] gap-1 rounded-lg bg-white/75 p-2 text-xs font-semibold ring-1 ring-white/60">
                  <span>Site: {siteName || '-'}</span>
                  <span>Customer: {customerName || '-'}</span>
                  <span>Tanggal: {formatReportDate(reportDate)}</span>
                  <span>Nilai Akhir: {analysis?.overallScore ?? '-'}/5</span>
                </div>
              </header>

              <div className="grid h-[82%] grid-rows-[35%_1fr] gap-3 p-4">
                <div className="grid min-h-0 gap-3 md:grid-cols-3">
                  {reportPhotos.map((photo) => (
                    <figure key={photo.angle} className="min-h-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                      {photo.imageUrl ? (
                        <img src={photo.imageUrl} alt={photo.caption} className="h-[68%] w-full object-cover" />
                      ) : (
                        <div className="flex h-[68%] items-center justify-center text-sm font-semibold text-slate-500">
                          Belum ada foto
                        </div>
                      )}
                      <figcaption className="h-[32%] overflow-hidden p-2 text-[10px] font-semibold leading-tight text-slate-700">
                        <span className="block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                          {photo.angle}
                        </span>
                        {photo.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>

                <div className="min-h-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
                  <table className="h-full w-full border-collapse text-left text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-[8px] uppercase tracking-[0.12em] text-slate-600">
                        <th className="w-[7%] px-2 py-1">Nilai</th>
                        <th className="w-[46%] px-2 py-1">Deskripsi</th>
                        <th className="px-2 py-1">Rekomendasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analysis?.assessments ?? category.criteria.map((criterion) => ({
                        criterionId: criterion.id,
                        score: 0,
                        description: `${criterion.title}: -`,
                        recommendation: '-',
                      }))).map((item) => {
                        const criterion = category.criteria.find((row) => row.id === item.criterionId)
                        return (
                          <tr key={item.criterionId} className="border-t border-slate-200 align-top">
                            <td className="px-2 py-1">
                              <span
                                className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
                                  item.score ? scoreTone(item.score) : 'bg-slate-100 text-slate-500 ring-slate-200'
                                }`}
                              >
                                {item.score || '-'}
                              </span>
                            </td>
                            <td className="px-2 py-1 leading-tight text-slate-800">
                              <span className="block font-black text-slate-950">{criterion?.title ?? item.criterionId}</span>
                              <span className="mt-0.5 block">{item.description}</span>
                            </td>
                            <td className="px-2 py-1 leading-tight text-slate-800">{item.recommendation}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <footer className="absolute bottom-2 right-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Slide {slideIndex + 1}/{drafts.length}
              </footer>
            </article>
          )
        })}
      </div>
    </div>
  )
}
