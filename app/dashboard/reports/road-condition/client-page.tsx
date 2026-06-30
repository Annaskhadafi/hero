'use client'

import * as React from 'react'
import { ArrowDownToLine, ImageIcon, Loader2, MapPin, Plus, Printer, RotateCcw, Save, Truck, Trash2, Upload, Wand2 } from 'lucide-react'
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
  getRoadConditionAssessmentTemplate,
  getRoadConditionOverallScore,
  normalizeRoadConditionScore,
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
  recommendationEdited?: boolean
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
  pointName: string
  photos: PhotoSlot[]
  analysis: AnalysisResult | null
  model: string
  isAnalyzing: boolean
}

type AnalysisStatus = {
  tone: 'info' | 'success' | 'error'
  message: string
}

type SavedRoadConditionReportData = {
  siteId?: number | null
  siteName: string
  customerName: string
  inspectorName: string
  reportDate: string
  drafts: Array<{
    id: string
    categoryKey: RoadConditionCategoryKey
    pointName: string
    model?: string
    photos?: Array<{ angle: string; caption: string }>
    analysis: AnalysisResult | null
  }>
}

type RoadConditionHistoryRow = {
  id: number
}

const PHOTO_ANGLES = ['Angle 1', 'Angle 2', 'Angle 3']
const ROAD_CONDITION_SCORE_OPTIONS = [1, 2, 3, 4, 5] as const
const DEFAULT_CATEGORY_KEY: RoadConditionCategoryKey = 'haulroad'
const SUMMARY_CATEGORY_ORDER: RoadConditionCategoryKey[] = ['loading_point', 'haulroad', 'disposal']
const SUMMARY_CATEGORY_LABELS: Record<RoadConditionCategoryKey, string> = {
  loading_point: 'LOADING AREA',
  haulroad: 'HAULING ROAD',
  disposal: 'DUMPING AREA',
}
const POINT_PLACEHOLDERS: Record<RoadConditionCategoryKey, string> = {
  loading_point: 'Contoh: Front CE 5256',
  haulroad: 'Contoh: Jalan Balangan',
  disposal: 'Contoh: Inpit Nila',
}
const CATEGORY_GRADIENTS: Record<RoadConditionCategoryKey, string> = {
  loading_point: 'linear-gradient(135deg, #0f4c75 0%, #1b6ca8 100%)',
  haulroad: 'linear-gradient(135deg, #1a365d 0%, #2a5298 100%)',
  disposal: 'linear-gradient(135deg, #1a4731 0%, #2d6a4f 100%)',
}
const CATEGORY_ICONS: Record<RoadConditionCategoryKey, React.ElementType> = {
  loading_point: MapPin,
  haulroad: Truck,
  disposal: ArrowDownToLine,
}

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

function createDraft(categoryKey: RoadConditionCategoryKey, sequence: number): CategoryDraft {
  return {
    id: `${categoryKey}-${sequence}`,
    categoryKey,
    pointName: '',
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

function getActiveAssessmentRows(draft: CategoryDraft) {
  return ROAD_CONDITION_CATEGORIES[draft.categoryKey].criteria.map((criterion) => {
    const assessment = draft.analysis?.assessments.find((item) => item.criterionId === criterion.id) ?? null
    const score = assessment ? normalizeRoadConditionScore(assessment.score) : null
    const template = score ? getRoadConditionAssessmentTemplate(draft.categoryKey, criterion.id, score) : null

    return {
      criterion,
      score,
      template,
      description: template?.description ?? assessment?.description ?? '-',
      recommendation: assessment?.recommendation?.trim() || template?.recommendation || '-',
    }
  })
}

function getDraftAverageScore(draft: CategoryDraft) {
  const scores = draft.analysis?.assessments.map((item) => normalizeRoadConditionScore(item.score)) ?? []
  if (!scores.length) return null
  return scores.reduce((total, score) => total + score, 0) / scores.length
}

function formatSummaryScore(score: number | null) {
  return score == null ? '-' : score.toFixed(2)
}

function formatSummaryPercent(score: number | null) {
  return score == null ? '-' : `${((score / 5) * 100).toFixed(2)}%`
}

function formatStars(score: number | null) {
  return score == null ? '-' : '★'.repeat(normalizeRoadConditionScore(score))
}

function getDraftPointLabel(draft: CategoryDraft, fallbackIndex: number) {
  return draft.pointName.trim() || `${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label} ${fallbackIndex + 1}`
}

function serializeDraftForSave(draft: CategoryDraft) {
  return {
    id: draft.id,
    categoryKey: draft.categoryKey,
    pointName: draft.pointName.trim(),
    model: draft.model,
    photos: draft.photos.map((photo) => ({
      angle: photo.angle,
      caption: photo.caption,
    })),
    analysis: draft.analysis,
  }
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
  const [inspectorName, setInspectorName] = React.useState('')
  const [reportDate, setReportDate] = React.useState(dateInputValue())
  const [categoryToAdd, setCategoryToAdd] = React.useState<RoadConditionCategoryKey>(DEFAULT_CATEGORY_KEY)
  const [drafts, setDrafts] = React.useState<CategoryDraft[]>(() => [createDraft(DEFAULT_CATEGORY_KEY, 1)])
  const [activeDraftId, setActiveDraftId] = React.useState(() => drafts[0]?.id ?? '')
  const [analysisStatus, setAnalysisStatus] = React.useState<AnalysisStatus | null>(null)
  const [saveStatus, setSaveStatus] = React.useState<AnalysisStatus | null>(null)
  const [savedReportId, setSavedReportId] = React.useState<number | null>(null)
  const draftsRef = React.useRef(drafts)
  const draftSequenceRef = React.useRef(1)

  const canAnalyze = access.canView
  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) ?? drafts[0]
  const activeCategory = ROAD_CONDITION_CATEGORIES[activeDraft.categoryKey]
  const allAnalyzed = drafts.length > 0 && drafts.every((draft) => draft.analysis)
  const totalSlides = drafts.length + 3
  const summaryRows = drafts.map((draft, index) => ({
    draft,
    pointLabel: getDraftPointLabel(draft, index),
    score: getDraftAverageScore(draft),
  }))
  const categorySummaryScores = SUMMARY_CATEGORY_ORDER.reduce(
    (result, categoryKey) => {
      const rows = summaryRows.filter((row) => row.draft.categoryKey === categoryKey)
      const scores = rows.map((row) => row.score).filter((score): score is number => score != null)
      result[categoryKey] =
        rows.length > 0 && scores.length === rows.length
          ? scores.reduce((total, score) => total + score, 0) / scores.length
          : null
      return result
    },
    {} as Record<RoadConditionCategoryKey, number | null>
  )
  const overallSummaryScore =
    summaryRows.every((row) => row.score != null) && summaryRows.length > 0
      ? summaryRows.reduce((total, row) => total + (row.score ?? 0), 0) / summaryRows.length
      : null

  React.useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  React.useEffect(() => {
    return () => {
      draftsRef.current.forEach((draft) => revokePhotos(draft.photos))
    }
  }, [])

  const clearAnalysis = React.useCallback(() => {
    const nextDrafts = draftsRef.current.map((draft) => ({ ...draft, analysis: null, model: '' }))
    draftsRef.current = nextDrafts
    setDrafts(nextDrafts)
    setSavedReportId(null)
  }, [])

  const patchDraft = React.useCallback((draftId: string, patch: Partial<CategoryDraft>) => {
    const nextDrafts = draftsRef.current.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft))
    draftsRef.current = nextDrafts
    setDrafts(nextDrafts)
  }, [])

  const patchDraftPhotos = React.useCallback((draftId: string, photos: PhotoSlot[]) => {
    const nextDrafts = draftsRef.current.map((draft) =>
      draft.id === draftId ? { ...draft, photos, analysis: null, model: '' } : draft
    )
    draftsRef.current = nextDrafts
    setDrafts(nextDrafts)
    setSavedReportId(null)
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
    draftSequenceRef.current += 1
    const draft = createDraft(categoryKey, draftSequenceRef.current)
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
    draftSequenceRef.current = 1
    const draft = createDraft(DEFAULT_CATEGORY_KEY, 1)
    setSiteId('')
    setSiteName('')
    setCustomerName('')
    setInspectorName('')
    setReportDate(dateInputValue())
    setDrafts([draft])
    setActiveDraftId(draft.id)
    setAnalysisStatus(null)
    setSaveStatus(null)
    setSavedReportId(null)
  }

  const validateDraft = (draft: CategoryDraft) => {
    if (!canAnalyze) throw new Error('Akses analisis ditolak.')
    if (!siteName || !customerName || !reportDate || !inspectorName.trim()) {
      throw new Error('Site, customer, tanggal, dan nama inspector wajib diisi.')
    }
    if (!draft.pointName.trim()) {
      throw new Error(`${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label}: nama point atau segment wajib diisi.`)
    }
    if (draft.photos.some((photo) => !photo.file)) {
      throw new Error(`${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label}: wajib unggah 3 foto angle berbeda.`)
    }
  }

  const saveReport = React.useCallback(
    async (sourceDrafts = draftsRef.current, quiet = false) => {
      if (!sourceDrafts.some((draft) => draft.analysis)) {
        if (!quiet) toast.error('Minimal satu point harus sudah dianalisis.')
        return
      }
      if (!siteName || !customerName || !reportDate || !inspectorName.trim()) {
        if (!quiet) toast.error('Site, customer, tanggal, dan nama inspector wajib diisi.')
        return
      }

      setSaveStatus({ tone: 'info', message: 'Menyimpan history inspeksi...' })

      const response = await fetch('/api/reports/road-condition/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: savedReportId,
          siteId: siteId ? Number(siteId) : null,
          siteName,
          customerName,
          inspectorName: inspectorName.trim(),
          reportDate,
          drafts: sourceDrafts.map(serializeDraftForSave),
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.success) {
        const message = payload.error || `Gagal menyimpan history. Status ${response.status}.`
        setSaveStatus({ tone: 'error', message })
        throw new Error(message)
      }

      const report = payload.report as RoadConditionHistoryRow
      setSavedReportId(report.id)
      setSaveStatus({ tone: 'success', message: `History inspeksi #${report.id} tersimpan.` })
      if (!quiet) toast.success('History inspeksi tersimpan.')
    },
    [customerName, inspectorName, reportDate, savedReportId, siteId, siteName]
  )

  const analyzeDraft = async (draft: CategoryDraft, quiet = false, autoSave = true) => {
    validateDraft(draft)
    patchDraft(draft.id, { isAnalyzing: true })
    setAnalysisStatus({
      tone: 'info',
      message: `Menganalisis ${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label} - ${draft.pointName.trim()}...`,
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

      const response = await fetch('/api/reports/road-condition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          customerName,
          inspectorName: inspectorName.trim(),
          reportDate,
          pointName: draft.pointName.trim(),
          category: draft.categoryKey,
          photos: photoPayload,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Gagal menjalankan AI analisis. Status ${response.status}.`)
      }

      const normalizedAnalysis = {
        ...payload.result,
        assessments: Array.isArray(payload.result?.assessments)
          ? payload.result.assessments.map((item: AnalysisAssessment) => ({
              ...item,
              score: normalizeRoadConditionScore(item.score),
              recommendationEdited: Boolean(item.recommendationEdited),
            }))
          : [],
      }
      normalizedAnalysis.overallScore = getRoadConditionOverallScore(normalizedAnalysis.assessments)

      const nextDraft = {
        ...draft,
        photos: draft.photos,
        analysis: normalizedAnalysis,
        model: payload.model || '',
        isAnalyzing: false,
      }
      const nextDrafts = draftsRef.current.map((item) => (item.id === draft.id ? nextDraft : item))
      draftsRef.current = nextDrafts
      setDrafts(nextDrafts)
      if (autoSave) await saveReport(nextDrafts, true)

      if (!quiet) {
        const message = `${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label} - ${draft.pointName.trim()} selesai dianalisis dan tersimpan.`
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
        await analyzeDraft(draft, true, false)
      }
      await saveReport(draftsRef.current, true)
      setAnalysisStatus({ tone: 'success', message: 'Semua kategori selesai dianalisis dan tersimpan.' })
      toast.success('Semua kategori selesai dianalisis dan tersimpan.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menjalankan AI analisis.'
      setAnalysisStatus({ tone: 'error', message })
      toast.error(message)
    }
  }

  const updateAssessmentScore = (draftId: string, criterionId: string, value: string) => {
    const nextScore = Number(value)
    if (!Number.isFinite(nextScore)) {
      toast.error('Skor harus angka 1-5.')
      return
    }

    const score = normalizeRoadConditionScore(nextScore)
    const nextDrafts = draftsRef.current.map((draft) => {
      if (draft.id !== draftId || !draft.analysis) return draft

      const nextAssessments = draft.analysis.assessments.map((assessment) => {
        if (assessment.criterionId !== criterionId) return assessment
        const template = getRoadConditionAssessmentTemplate(draft.categoryKey, criterionId, score)

        return {
          ...assessment,
          score,
          description: template.description,
          recommendation: assessment.recommendationEdited ? assessment.recommendation : template.recommendation,
        }
      })

      return {
        ...draft,
        analysis: {
          ...draft.analysis,
          assessments: nextAssessments,
          overallScore: getRoadConditionOverallScore(nextAssessments),
        },
      }
    })

    draftsRef.current = nextDrafts
    setDrafts(nextDrafts)
    void saveReport(nextDrafts, true).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan validasi.')
    })
    setAnalysisStatus({
      tone: 'info',
      message: 'Skor parameter divalidasi dan template report ikut diperbarui.',
    })
  }

  const updateAssessmentRecommendation = (draftId: string, criterionId: string, recommendation: string) => {
    const nextDrafts = draftsRef.current.map((draft) => {
      if (draft.id !== draftId || !draft.analysis) return draft

      return {
        ...draft,
        analysis: {
          ...draft.analysis,
          assessments: draft.analysis.assessments.map((assessment) =>
            assessment.criterionId === criterionId
              ? { ...assessment, recommendation, recommendationEdited: true }
              : assessment
          ),
        },
      }
    })

    draftsRef.current = nextDrafts
    setDrafts(nextDrafts)
  }

  const activeAssessmentRows = getActiveAssessmentRows(activeDraft)
  const activeOverallScore = activeDraft.analysis
    ? getRoadConditionOverallScore(activeDraft.analysis.assessments)
    : null

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
              #road-condition-print-root { position: absolute !important; inset: 0 !important; display: block !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; gap: 0 !important; background: #fff !important; }
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
            <Label>Nama Inspector</Label>
            <Input
              value={inspectorName}
              onChange={(event) => {
                setInspectorName(event.target.value)
                clearAnalysis()
              }}
              placeholder="Nama inspector"
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
              {drafts.map((draft, draftIndex) => {
                const category = ROAD_CONDITION_CATEGORIES[draft.categoryKey]
                return (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => setActiveDraftId(draft.id)}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold ring-1 transition ${
                      activeDraftId === draft.id
                        ? 'bg-slate-950 text-white ring-slate-950'
                        : 'bg-slate-50 text-slate-700 ring-slate-100 hover:bg-white'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block">{category.label}</span>
                      <span className="block truncate text-xs font-medium opacity-70">
                        {getDraftPointLabel(draft, draftIndex)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {draft.analysis ? <Badge variant="secondary">Done</Badge> : null}
                      {draft.isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select value={categoryToAdd} onValueChange={(value) => setCategoryToAdd(value as RoadConditionCategoryKey)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tambah kategori" />
              </SelectTrigger>
              <SelectContent>
                {ROAD_CONDITION_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => addCategory(categoryToAdd)}>
              <Plus className="size-4" />
              Tambah
            </Button>
          </div>

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
              <p className="text-xs font-semibold text-slate-500">
                {activeCategory.reportLabel} · {activeDraft.pointName.trim() || 'Nama point belum diisi'}
              </p>
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

          <div className="mb-4 grid max-w-xl gap-2">
            <Label>Nama Point / Segment</Label>
            <Input
              value={activeDraft.pointName}
              onChange={(event) =>
                patchDraft(activeDraft.id, {
                  pointName: event.target.value,
                  analysis: null,
                  model: '',
                })
              }
              placeholder={POINT_PLACEHOLDERS[activeDraft.categoryKey]}
            />
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

      <section className="road-condition-no-print space-y-4 rounded-[1.1rem] bg-white p-5 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Validasi AI</h2>
            <p className="text-xs font-semibold text-slate-500">
              Ubah skor untuk mengikuti template. Rekomendasi bisa diedit manual dan disimpan ke history.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              Nilai Akhir {activeOverallScore ?? '-'}
              /5
            </Badge>
            <Button type="button" variant="outline" onClick={() => void saveReport(draftsRef.current)} disabled={!drafts.some((draft) => draft.analysis)}>
              <Save className="size-4" />
              Simpan History
            </Button>
          </div>
        </div>

        {saveStatus ? (
          <div
            className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${
              saveStatus.tone === 'error'
                ? 'bg-rose-50 text-rose-900 ring-rose-200'
                : saveStatus.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                  : 'bg-sky-50 text-sky-900 ring-sky-200'
            }`}
          >
            {saveStatus.message}
          </div>
        ) : null}

        {activeDraft.analysis ? (
          <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                  <th className="w-[30%] px-3 py-2">Parameter</th>
                  <th className="w-[10%] px-3 py-2">Nilai</th>
                  <th className="w-[35%] px-3 py-2">Deskripsi</th>
                  <th className="px-3 py-2">Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {activeAssessmentRows.map((row) => (
                  <tr key={row.criterion.id} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-950">{row.criterion.title}</div>
                      <div className="text-xs text-slate-500">{row.criterion.prompt}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={row.score ? String(row.score) : '3'}
                        onValueChange={(value) => updateAssessmentScore(activeDraft.id, row.criterion.id, value)}
                      >
                        <SelectTrigger className="h-9 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROAD_CONDITION_SCORE_OPTIONS.map((score) => (
                            <SelectItem key={score} value={String(score)}>
                              {score}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-3 text-sm leading-snug text-slate-700">
                      <span className="block font-medium text-slate-950">{row.description}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Textarea
                        value={row.recommendation}
                        onChange={(event) =>
                          updateAssessmentRecommendation(activeDraft.id, row.criterion.id, event.target.value)
                        }
                        onBlur={() =>
                          saveReport(draftsRef.current, true).catch((error) => {
                            toast.error(error instanceof Error ? error.message : 'Gagal menyimpan rekomendasi.')
                          })
                        }
                        className="min-h-20 resize-none bg-white text-sm leading-snug"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600">
            Jalankan AI pada kategori aktif dulu untuk membuka validasi skor.
          </div>
        )}
      </section>

      <section className="road-condition-no-print flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-slate-950">Compiled Report Slide</h2>
          <p className="text-xs font-semibold text-slate-500">
            {drafts.length} point · {drafts.filter((draft) => draft.analysis).length} sudah dianalisis
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} disabled={!allAnalyzed}>
          <Printer className="size-4" />
          Cetak PDF Gabungan
        </Button>
      </section>

      <div id="road-condition-print-root" className="mx-auto grid max-w-7xl gap-5">
        <article
          className="road-condition-slide aspect-video overflow-hidden rounded-[1.1rem] bg-white bg-cover bg-center shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200"
          style={{ backgroundImage: "url('/cover.png')" }}
        >
          <div className="absolute left-[74px] top-[185px] w-[440px] text-slate-950">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0b6f9f]">
              Site Condition Assessment
            </p>
            <h1 className="mt-3 font-display text-[44px] font-black leading-[0.98] text-[#0a315f]">
              Road Condition
              <span className="block text-[#79bf23]">Analysis Report</span>
            </h1>
            <div className="mt-5 h-1.5 w-36 rounded-full bg-[#79bf23]" />

            <div className="mt-6 grid gap-2 text-[13px] font-bold text-[#153b63]">
              <div className="grid grid-cols-[92px_1fr] gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Site</span>
                <span>{siteName || '-'}</span>
              </div>
              <div className="grid grid-cols-[92px_1fr] gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Customer</span>
                <span>{customerName || '-'}</span>
              </div>
              <div className="grid grid-cols-[92px_1fr] gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Inspector</span>
                <span>{inspectorName || '-'}</span>
              </div>
              <div className="grid grid-cols-[92px_1fr] gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Date</span>
                <span>{formatReportDate(reportDate)}</span>
              </div>
            </div>
          </div>

          <footer className="absolute bottom-[150px] left-[74px] text-[9px] font-black uppercase tracking-[0.18em] text-[#153b63]/60">
            Slide 1/{totalSlides}
          </footer>
        </article>

        <article className="road-condition-slide aspect-video overflow-hidden rounded-[1.1rem] bg-white shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200">
          <div className="flex h-full flex-col">
            <header className="border-b border-slate-900 bg-[#1a365d] px-5 py-2 text-center text-white">
              <h2 className="font-display text-2xl font-black">Site Condition Assessment</h2>
            </header>

            <div className="grid grid-rows-[70px_1fr] gap-3 p-4">
              <table className="w-full border-collapse text-center text-[9px] font-semibold text-slate-950">
                <thead>
                  <tr className="bg-[#e2e8f0]">
                    <th className="border border-slate-900 px-2 py-1">DATE</th>
                    <th className="border border-slate-900 px-2 py-1">LOADING AREA</th>
                    <th className="border border-slate-900 px-2 py-1">HAULING ROAD</th>
                    <th className="border border-slate-900 px-2 py-1">DUMPING AREA</th>
                    <th className="border border-slate-900 px-2 py-1">AVERAGE</th>
                    <th className="border border-slate-900 px-2 py-1">STAR RATING</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1 font-black">{formatReportDate(reportDate)}</td>
                    <td className="border border-slate-900 px-2 py-1">{formatSummaryPercent(categorySummaryScores.loading_point)}</td>
                    <td className="border border-slate-900 px-2 py-1">{formatSummaryPercent(categorySummaryScores.haulroad)}</td>
                    <td className="border border-slate-900 px-2 py-1">{formatSummaryPercent(categorySummaryScores.disposal)}</td>
                    <td className="border border-slate-900 px-2 py-1 font-black">{formatSummaryPercent(overallSummaryScore)}</td>
                    <td className="border border-slate-900 px-2 py-1 font-black">{formatSummaryScore(overallSummaryScore)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1 text-left text-lg font-black text-red-600">{siteName || '-'}</td>
                    <td className="border border-slate-900 px-2 py-1 text-xs" colSpan={4}>
                      Inspector: {inspectorName || '-'} · Customer: {customerName || '-'}
                    </td>
                    <td className="border border-slate-900 px-2 py-1 text-xl font-black text-red-600">
                      {formatStars(overallSummaryScore)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="min-h-0 overflow-hidden">
                <table className="w-full border-collapse text-left text-[8px] text-slate-950">
                  <thead>
                    <tr className="bg-[#e2e8f0] text-center font-black">
                      <th className="w-[15%] border border-slate-900 px-1.5 py-1">AREA</th>
                      <th className="border border-slate-900 px-1.5 py-1">POINT / SEGMENT</th>
                      <th className="w-[11%] border border-slate-900 px-1.5 py-1">AVG</th>
                      <th className="w-[18%] border border-slate-900 px-1.5 py-1">STAR RATING</th>
                      <th className="w-[12%] border border-slate-900 px-1.5 py-1">POINT*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUMMARY_CATEGORY_ORDER.map((categoryKey) => {
                      const category = ROAD_CONDITION_CATEGORIES[categoryKey]
                      const rows = summaryRows.filter((row) => row.draft.categoryKey === categoryKey)
                      if (!rows.length) return null

                      return (
                        <React.Fragment key={categoryKey}>
                          <tr style={{ backgroundColor: category.color }} className="font-black">
                            <td className="border border-slate-900 px-1.5 py-1" colSpan={5}>
                              {SUMMARY_CATEGORY_LABELS[categoryKey]}
                            </td>
                          </tr>
                          {rows.map((row) => (
                            <tr key={row.draft.id}>
                              <td className="border border-slate-900 px-1.5 py-1">{category.label}</td>
                              <td className="border border-slate-900 px-1.5 py-1 font-semibold">{row.pointLabel}</td>
                              <td className="border border-slate-900 px-1.5 py-1 text-center">{formatSummaryScore(row.score)}</td>
                              <td className="border border-slate-900 px-1.5 py-1 text-center text-sm font-black text-red-600">
                                {formatStars(row.score)}
                              </td>
                              <td className="border border-slate-900 px-1.5 py-1 text-center font-black">
                                {formatSummaryPercent(row.score)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-200 font-black">
                            <td className="border border-slate-900 px-1.5 py-1" colSpan={2}>
                              Star Rating
                            </td>
                            <td className="border border-slate-900 px-1.5 py-1 text-center">
                              {formatSummaryScore(categorySummaryScores[categoryKey])}
                            </td>
                            <td className="border border-slate-900 px-1.5 py-1 text-center text-sm text-red-600">
                              {formatStars(categorySummaryScores[categoryKey])}
                            </td>
                            <td className="border border-slate-900 px-1.5 py-1 text-center">
                              {formatSummaryPercent(categorySummaryScores[categoryKey])}
                            </td>
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <footer className="absolute bottom-2 right-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
              Slide 2/{totalSlides}
            </footer>
          </div>
        </article>

        {drafts.map((draft, slideIndex) => {
          const category = ROAD_CONDITION_CATEGORIES[draft.categoryKey]
          const analysis = draft.analysis
          const assessmentRows = analysis ? getActiveAssessmentRows(draft) : []
          const overallScore = analysis ? getRoadConditionOverallScore(analysis.assessments) : null
          const pointLabel = getDraftPointLabel(draft, slideIndex)
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
              className="road-condition-slide grid aspect-video grid-rows-[22%_34%_1fr] overflow-hidden rounded-[1.1rem] bg-white shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200"
            >
              <header
                className="grid min-h-0 gap-3 px-5 py-3 text-white md:grid-cols-[1fr_auto]"
                style={{ background: CATEGORY_GRADIENTS[draft.categoryKey] }}
              >
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    {React.createElement(CATEGORY_ICONS[draft.categoryKey], { className: 'size-4 opacity-80' })}
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                      Report Analysis Road Condition
                    </p>
                  </div>
                  <h2 className="mt-1 truncate font-display text-3xl font-semibold leading-tight">
                    {category.reportLabel}
                  </h2>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-white/80">{pointLabel}</p>
                  {analysis ? <p className="mt-1 line-clamp-2 max-w-3xl text-xs font-semibold text-white/75">{analysis.summary}</p> : null}
                </div>
                <div className="grid min-w-[250px] gap-1 rounded-lg bg-white/15 p-2 text-xs font-semibold ring-1 ring-white/20 backdrop-blur-sm">
                  <span>Site: {siteName || '-'}</span>
                  <span>Customer: {customerName || '-'}</span>
                  <span>Inspector: {inspectorName || '-'}</span>
                  <span>Point: {pointLabel}</span>
                  <span>Tanggal: {formatReportDate(reportDate)}</span>
                  <span>Nilai Akhir: {overallScore ?? '-'}/5</span>
                </div>
              </header>

              <section className="grid min-h-0 grid-cols-3 gap-3 px-4 py-3">
                {reportPhotos.map((photo) => (
                  <figure key={photo.angle} className="min-h-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                    {photo.imageUrl ? (
                      <img src={photo.imageUrl} alt={photo.caption} className="h-[72%] w-full object-cover" />
                    ) : (
                      <div className="flex h-[72%] items-center justify-center text-sm font-semibold text-slate-500">
                        Belum ada foto
                      </div>
                    )}
                    <figcaption className="h-[28%] overflow-hidden p-2 text-[10px] font-semibold leading-tight text-slate-700">
                      <span className="block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                        {photo.angle}
                      </span>
                      {photo.caption}
                    </figcaption>
                  </figure>
                ))}
              </section>

              <section className="min-h-0 overflow-hidden px-4 pb-7">
                <div className="h-full min-h-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
                <table className="h-full w-full border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-[8px] uppercase tracking-[0.12em] text-slate-600">
                      <th className="w-[7%] px-2 py-1">Nilai</th>
                      <th className="w-[46%] px-2 py-1">Deskripsi</th>
                      <th className="px-2 py-1">Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(assessmentRows.length > 0
                      ? assessmentRows
                      : category.criteria.map((criterion) => ({
                          criterion,
                          score: null,
                          template: null,
                          description: `${criterion.title}: -`,
                          recommendation: '-',
                        }))).map((row) => {
                      return (
                        <tr key={row.criterion.id} className="border-t border-slate-200 align-top">
                          <td className="px-2 py-1">
                            <span
                              className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
                                row.score ? scoreTone(row.score) : 'bg-slate-100 text-slate-500 ring-slate-200'
                              }`}
                            >
                              {row.score || '-'}
                            </span>
                          </td>
                          <td className="px-2 py-1 leading-tight text-slate-800">
                            <span className="block font-black text-slate-950">{row.criterion.title}</span>
                            <span className="mt-0.5 block">{row.description}</span>
                          </td>
                          <td className="px-2 py-1 leading-tight text-slate-800">{row.recommendation}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </section>

              <footer className="absolute bottom-2 right-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Slide {slideIndex + 3}/{totalSlides}
              </footer>
            </article>
          )
        })}

        <article
          className="road-condition-slide aspect-video overflow-hidden rounded-[1.1rem] bg-white bg-cover bg-center shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200"
          style={{ backgroundImage: "url('/backcover.png')" }}
        />
      </div>
    </div>
  )
}
