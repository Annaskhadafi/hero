'use client'

import * as React from 'react'
import { ArrowDownToLine, Download, Eye, ImageIcon, Loader2, MapPin, PenSquare, Plus, RotateCcw, Save, Truck, Trash2, Upload, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
  dataUrl: string
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

type PdfProgressState = {
  mode: 'report' | 'history'
  label: string
  current: number
  total: number
}

type PdfReportSource = {
  siteName: string
  customerName: string
  inspectorName: string
  reportDate: string
  drafts: CategoryDraft[]
}

export type SavedRoadConditionReportData = {
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
    photos?: Array<{ angle: string; caption: string; dataUrl?: string }>
    analysis: AnalysisResult | null
  }>
}

export type HistoryRow = {
  id: number
  siteId: number | null
  siteName: string
  customerName: string
  inspectorName: string
  reportDate: string
  averageScore: number
  pointCount: number
  reportData: SavedRoadConditionReportData | null
  createdAt: string
  updatedAt: string
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
    dataUrl: '',
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
    if (photo.previewUrl.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl)
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

function isImageDataUrl(value: string) {
  return value.startsWith('data:image/')
}

function getDataUrlMimeType(value: string) {
  return value.match(/^data:([^;]+);base64,/)?.[1] || 'image/png'
}

function getPhotoImageUrl(photo: Pick<PhotoSlot, 'previewUrl' | 'dataUrl'>) {
  if (isImageDataUrl(photo.dataUrl)) return photo.dataUrl
  if (isImageDataUrl(photo.previewUrl)) return photo.previewUrl
  return ''
}

async function serializeDraftForSave(draft: CategoryDraft) {
  const photos = await Promise.all(
    draft.photos.map(async (photo) => {
      const dataUrl = isImageDataUrl(photo.dataUrl)
        ? photo.dataUrl
        : photo.file
          ? await fileToDataUrl(photo.file)
          : isImageDataUrl(photo.previewUrl)
            ? photo.previewUrl
            : ''

      return {
        angle: photo.angle,
        caption: photo.caption,
        dataUrl,
      }
    })
  )
  return {
    id: draft.id,
    categoryKey: draft.categoryKey,
    pointName: draft.pointName.trim(),
    model: draft.model,
    photos,
    analysis: draft.analysis,
  }
}

function createDraftsFromHistoryData(data: SavedRoadConditionReportData) {
  return data.drafts.map((draft, draftIndex) => {
    const savedPhotos = Array.isArray(draft.photos) ? draft.photos : []
    const photos: PhotoSlot[] = initialPhotos().map((photo, photoIndex) => {
      const savedPhoto = savedPhotos[photoIndex] ?? savedPhotos.find((item) => item.angle === photo.angle)
      const dataUrl = savedPhoto?.dataUrl && isImageDataUrl(savedPhoto.dataUrl) ? savedPhoto.dataUrl : ''

      return {
        angle: savedPhoto?.angle || photo.angle,
        file: null,
        previewUrl: dataUrl,
        dataUrl,
        caption: savedPhoto?.caption || '',
      }
    })

    return {
      id: draft.id || `${draft.categoryKey}-${draftIndex + 1}`,
      categoryKey: ROAD_CONDITION_CATEGORIES[draft.categoryKey] ? draft.categoryKey : DEFAULT_CATEGORY_KEY,
      pointName: draft.pointName,
      photos,
      analysis: draft.analysis,
      model: draft.model || '',
      isAnalyzing: false,
    } satisfies CategoryDraft
  })
}

export function RoadConditionAnalysisClient({
  access,
  sites,
  historyRows,
}: {
  access: HeroMenuPermission
  sites: SiteOption[]
  historyRows: HistoryRow[]
}) {
  const [activeTab, setActiveTab] = React.useState('report')
  const [siteId, setSiteId] = React.useState('')
  const [siteName, setSiteName] = React.useState('')
  const [siteInputMode, setSiteInputMode] = React.useState<'select' | 'manual'>('select')
  const [customerName, setCustomerName] = React.useState('')
  const [inspectorName, setInspectorName] = React.useState('')
  const [reportDate, setReportDate] = React.useState(dateInputValue())
  const [categoryToAdd, setCategoryToAdd] = React.useState<RoadConditionCategoryKey>(DEFAULT_CATEGORY_KEY)
  const [drafts, setDrafts] = React.useState<CategoryDraft[]>(() => [createDraft(DEFAULT_CATEGORY_KEY, 1)])
  const [activeDraftId, setActiveDraftId] = React.useState(() => drafts[0]?.id ?? '')
  const [analysisStatus, setAnalysisStatus] = React.useState<AnalysisStatus | null>(null)
  const [saveStatus, setSaveStatus] = React.useState<AnalysisStatus | null>(null)
  const [savedReportId, setSavedReportId] = React.useState<number | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false)
  const [deletingHistoryId, setDeletingHistoryId] = React.useState<number | null>(null)
  const [previewHistory, setPreviewHistory] = React.useState<HistoryRow | null>(null)
  const [historyList, setHistoryList] = React.useState<HistoryRow[]>(historyRows)
  const [pdfProgress, setPdfProgress] = React.useState<PdfProgressState | null>(null)
  const draftsRef = React.useRef(drafts)
  const draftSequenceRef = React.useRef(1)
  const pdfAssetCacheRef = React.useRef(new Map<string, string>())

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

  const moveDraft = (draftId: string, direction: -1 | 1) => {
    const currentIndex = draftsRef.current.findIndex((draft) => draft.id === draftId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= draftsRef.current.length) return

    const nextDrafts = [...draftsRef.current]
    const [draft] = nextDrafts.splice(currentIndex, 1)
    nextDrafts.splice(nextIndex, 0, draft)
    draftsRef.current = nextDrafts
    setDrafts(nextDrafts)
  }

  const movePhoto = (draftId: string, index: number, direction: -1 | 1) => {
    const draft = draftsRef.current.find((item) => item.id === draftId)
    const nextIndex = index + direction
    if (!draft || nextIndex < 0 || nextIndex >= draft.photos.length) return

    const photos = [...draft.photos]
    const [photo] = photos.splice(index, 1)
    photos.splice(nextIndex, 0, photo)
    patchDraftPhotos(draftId, photos)
  }

  const handleSiteChange = (value: string) => {
    const site = sites.find((item) => String(item.id) === value)
    setSiteInputMode('select')
    setSiteId(value)
    setSiteName(site?.name ?? '')
    setCustomerName(site?.customerName ?? '')
    setAnalysisStatus(null)
    clearAnalysis()
  }

  const handleManualSiteChange = (value: string) => {
    setSiteInputMode('manual')
    setSiteId('')
    setSiteName(value)
    setAnalysisStatus(null)
    clearAnalysis()
  }

  const handleFileChange = async (draftId: string, index: number, file: File | null) => {
    const draft = drafts.find((item) => item.id === draftId)
    const currentUrl = draft?.photos[index]?.previewUrl
    if (currentUrl?.startsWith('blob:')) URL.revokeObjectURL(currentUrl)

    if (!file) {
      updatePhoto(draftId, index, { file: null, previewUrl: '', dataUrl: '' })
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

    try {
      const dataUrl = await fileToDataUrl(file)
      updatePhoto(draftId, index, { file, previewUrl: dataUrl, dataUrl })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membaca file foto.')
    }
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
    setSiteInputMode('select')
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
    if (draft.photos.some((photo) => !photo.file && !getPhotoImageUrl(photo))) {
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

      const serializedDrafts = await Promise.all(sourceDrafts.map(serializeDraftForSave))

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
          drafts: serializedDrafts,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.success) {
        const message = payload.error || `Gagal menyimpan history. Status ${response.status}.`
        setSaveStatus({ tone: 'error', message })
        throw new Error(message)
      }

      const report = payload.report as HistoryRow
      setSavedReportId(report.id)
      setHistoryList((current) => [report, ...current.filter((row) => row.id !== report.id)].slice(0, 50))
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
        draft.photos.map(async (photo) => {
          const dataUrl = photo.file ? await fileToDataUrl(photo.file) : getPhotoImageUrl(photo)
          return {
            angle: photo.angle,
            caption: photo.caption,
            mimeType: photo.file?.type || getDataUrlMimeType(dataUrl),
            dataUrl,
          }
        })
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
        photos: draft.photos.map((photo, index) => ({
          ...photo,
          previewUrl: photoPayload[index]?.dataUrl || getPhotoImageUrl(photo),
          dataUrl: photoPayload[index]?.dataUrl || getPhotoImageUrl(photo),
        })),
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

  const loadHistoryRow = (row: HistoryRow) => {
    const data = row.reportData
    if (!data?.drafts?.length) {
      toast.error('Data report history tidak lengkap.')
      return
    }

    setActiveTab('report')
    setSiteId(data.siteId ? String(data.siteId) : '')
    setSiteName(data.siteName)
    setSiteInputMode(data.siteId ? 'select' : 'manual')
    setCustomerName(data.customerName)
    setInspectorName(data.inspectorName)
    setReportDate(data.reportDate)
    setSavedReportId(row.id)
    setAnalysisStatus(null)
    setSaveStatus(null)

    const loadedDrafts = createDraftsFromHistoryData(data)

    draftSequenceRef.current = loadedDrafts.length
    draftsRef.current = loadedDrafts
    setDrafts(loadedDrafts)
    setActiveDraftId(loadedDrafts[0]?.id ?? '')
    toast.success(`Report #${row.id} dimuat ke form.`)
  }

  const deleteHistoryRow = async (row: HistoryRow) => {
    if (!confirm(`Hapus history report #${row.id}? Aksi ini tidak bisa dibatalkan.`)) return

    setDeletingHistoryId(row.id)
    try {
      const response = await fetch(`/api/reports/road-condition/history/${row.id}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Gagal menghapus history.')
      }

      setHistoryList((current) => current.filter((item) => item.id !== row.id))
      if (previewHistory?.id === row.id) setPreviewHistory(null)
      if (savedReportId === row.id) setSavedReportId(null)
      toast.success(`History report #${row.id} dihapus.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus history.')
    } finally {
      setDeletingHistoryId(null)
    }
  }

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Gagal membaca asset PDF.'))
      reader.readAsDataURL(blob)
    })

  const loadPdfAsset = async (path: string) => {
    const cached = pdfAssetCacheRef.current.get(path)
    if (cached) return cached

    const response = await fetch(path)
    if (!response.ok) return ''

    const dataUrl = await blobToDataUrl(await response.blob())
    pdfAssetCacheRef.current.set(path, dataUrl)
    return dataUrl
  }

  const addImageSafe = (pdf: any, dataUrl: string, x: number, y: number, width: number, height: number) => {
    if (!dataUrl) return false
    const mimeType = getDataUrlMimeType(dataUrl)
    const format = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'JPEG' : 'PNG'
    try {
      pdf.addImage(dataUrl, format, x, y, width, height)
      return true
    } catch {
      return false
    }
  }

  const setPdfFill = (pdf: any, color: string) => {
    const value = color.replace('#', '')
    const r = Number.parseInt(value.slice(0, 2), 16)
    const g = Number.parseInt(value.slice(2, 4), 16)
    const b = Number.parseInt(value.slice(4, 6), 16)
    pdf.setFillColor(r, g, b)
  }

  const buildCurrentPdfSource = (): PdfReportSource => ({
    siteName: siteName || '-',
    customerName: customerName || '-',
    inspectorName: inspectorName || '-',
    reportDate,
    drafts: draftsRef.current,
  })

  const buildHistoryPdfSource = (row: HistoryRow): PdfReportSource | null => {
    const data = row.reportData
    if (!data?.drafts?.length) return null

    return {
      siteName: data.siteName || row.siteName || '-',
      customerName: data.customerName || row.customerName || '-',
      inspectorName: data.inspectorName || row.inspectorName || '-',
      reportDate: data.reportDate || row.reportDate,
      drafts: createDraftsFromHistoryData(data),
    }
  }

  const drawPdfCover = (pdf: any, source: PdfReportSource, coverImage: string, pageWidth: number, pageHeight: number) => {
    if (!addImageSafe(pdf, coverImage, 0, 0, pageWidth, pageHeight)) {
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(10, 49, 95)
    pdf.setFontSize(30)
    pdf.text('Road Condition', 22, 58)
    pdf.setTextColor(121, 191, 35)
    pdf.text('Analysis Report', 22, 72)
    pdf.setDrawColor(121, 191, 35)
    pdf.setLineWidth(1.2)
    pdf.line(22, 79, 62, 79)

    pdf.setFontSize(9)
    pdf.setTextColor(21, 59, 99)
    pdf.text(`Site: ${source.siteName}`, 22, 93)
    pdf.text(`Customer: ${source.customerName}`, 22, 101)
    pdf.text(`Inspector: ${source.inspectorName}`, 22, 109)
    pdf.text(`Date: ${formatReportDate(source.reportDate)}`, 22, 117)
  }

  const drawPdfSummary = (pdf: any, source: PdfReportSource, pageWidth: number) => {
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0, pageWidth, 167.06, 'F')
    pdf.setFillColor(246, 248, 252)
    pdf.rect(0, 0, pageWidth, 167.06, 'F')

    const rows = source.drafts.map((draft, index) => ({
      draft,
      pointLabel: getDraftPointLabel(draft, index),
      score: getDraftAverageScore(draft),
    }))
    const overallScore = rows.length && rows.every((row) => row.score != null)
      ? rows.reduce((total, row) => total + (row.score ?? 0), 0) / rows.length
      : null

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(22)
    pdf.text('Report Summary', 12, 18)
    pdf.setFontSize(9)
    pdf.setTextColor(71, 85, 105)
    pdf.text(`${source.siteName} | ${source.customerName} | ${formatReportDate(source.reportDate)}`, 12, 26)

    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(224, 12, 58, 28, 2, 2, 'F')
    pdf.setTextColor(100, 116, 139)
    pdf.setFontSize(7)
    pdf.text('AVERAGE SCORE', 230, 22)
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(18)
    pdf.text(`${overallScore?.toFixed(2) ?? '-'}/5`, 230, 34)

    const tableY = 50
    pdf.setFillColor(15, 23, 42)
    pdf.rect(12, tableY, 270, 9, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text('CATEGORY', 16, tableY + 6)
    pdf.text('POINT', 78, tableY + 6)
    pdf.text('SCORE', 224, tableY + 6)
    pdf.text('STATUS', 250, tableY + 6)

    rows.forEach((row, index) => {
      const y = tableY + 9 + index * 12
      const category = ROAD_CONDITION_CATEGORIES[row.draft.categoryKey]
      pdf.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252)
      pdf.rect(12, y, 270, 12, 'F')
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.text(category.reportLabel, 16, y + 7)
      pdf.setFont('helvetica', 'normal')
      pdf.text(row.pointLabel, 78, y + 7, { maxWidth: 136 })
      pdf.setFont('helvetica', 'bold')
      pdf.text(row.score == null ? '-' : row.score.toFixed(2), 224, y + 7)
      pdf.text(row.score == null ? '-' : `${Math.round((row.score / 5) * 100)}%`, 250, y + 7)
    })
  }

  const drawPdfDetail = (pdf: any, source: PdfReportSource, draft: CategoryDraft, index: number, total: number, pageWidth: number) => {
    const category = ROAD_CONDITION_CATEGORIES[draft.categoryKey]
    const assessmentRows = getActiveAssessmentRows(draft)
    const pointLabel = getDraftPointLabel(draft, index)
    const score = getDraftAverageScore(draft)

    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0, pageWidth, 167.06, 'F')
    setPdfFill(pdf, category.color)
    pdf.rect(0, 0, pageWidth, 32, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text(category.reportLabel, 12, 15)
    pdf.setFontSize(9)
    pdf.text(pointLabel, 12, 24)
    pdf.setFontSize(8)
    pdf.text(`Site: ${source.siteName}`, 220, 11)
    pdf.text(`Inspector: ${source.inspectorName}`, 220, 18)
    pdf.text(`Score: ${score?.toFixed(2) ?? '-'}/5`, 220, 25)

    const imageY = 38
    const imageWidth = 86
    const imageHeight = 53
    draft.photos.forEach((photo, photoIndex) => {
      const x = 12 + photoIndex * 92
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(x, imageY, imageWidth, imageHeight, 2, 2, 'F')
      addImageSafe(pdf, getPhotoImageUrl(photo), x + 2, imageY + 2, imageWidth - 4, imageHeight - 4)
    })

    const tableY = 98
    const rowHeight = Math.min(10, 58 / Math.max(assessmentRows.length, 1))
    pdf.setFillColor(15, 23, 42)
    pdf.rect(12, tableY, 270, 8, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.text('NILAI', 15, tableY + 5.5)
    pdf.text('DESKRIPSI', 37, tableY + 5.5)
    pdf.text('REKOMENDASI', 158, tableY + 5.5)

    assessmentRows.forEach((row, rowIndex) => {
      const y = tableY + 8 + rowIndex * rowHeight
      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 248, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 252)
      pdf.rect(12, y, 270, rowHeight, 'F')
      pdf.setTextColor(15, 23, 42)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.text(String(row.score || '-'), 18, y + 5.5)
      pdf.text(row.criterion.title, 37, y + 4.3, { maxWidth: 112 })
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(5.5)
      pdf.text(pdf.splitTextToSize(row.description, 112).slice(0, 2), 37, y + 7)
      pdf.text(pdf.splitTextToSize(row.recommendation, 116).slice(0, 3), 158, y + 4.5)
    })

    pdf.setTextColor(100, 116, 139)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6)
    pdf.text(`Slide ${index + 3}/${total}`, 266, 162)
  }

  const savePdfBlob = (pdf: any, filename: string) => {
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    let openedWindow: Window | null = null

    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    openedWindow = window.open(url, '_blank', 'noopener,noreferrer')

    if (!openedWindow) {
      toast.info('PDF sudah dibuat. Jika download tidak muncul, izinkan pop-up atau cek tab download browser.')
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  const downloadReportPdf = async (source: PdfReportSource, mode: PdfProgressState['mode'], filename: string) => {
    const total = source.drafts.length + 3
    setIsGeneratingPdf(true)
    setPdfProgress({ mode, label: 'Menyiapkan PDF', current: 0.2, total })

    try {
      const { jsPDF } = await import('jspdf')
      const pageWidth = 297
      const pageHeight = pageWidth * 9 / 16
      const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, pageHeight], orientation: 'landscape' })
      const coverImage = await loadPdfAsset('/cover.png')
      const backCoverImage = await loadPdfAsset('/backcover.png')

      setPdfProgress({ mode, label: 'Membuat cover', current: 0.5, total })
      drawPdfCover(pdf, source, coverImage, pageWidth, pageHeight)
      setPdfProgress({ mode, label: 'Cover siap', current: 1, total })

      pdf.addPage()
      setPdfProgress({ mode, label: 'Membuat summary', current: 1.5, total })
      drawPdfSummary(pdf, source, pageWidth)
      setPdfProgress({ mode, label: 'Summary siap', current: 2, total })

      source.drafts.forEach((draft, index) => {
        pdf.addPage()
        setPdfProgress({ mode, label: `Membuat slide ${index + 1} dari ${source.drafts.length}`, current: index + 2, total })
        drawPdfDetail(pdf, source, draft, index, total, pageWidth)
        setPdfProgress({ mode, label: `Slide ${index + 1} siap`, current: index + 3, total })
      })

      pdf.addPage()
      setPdfProgress({ mode, label: 'Membuat back cover', current: total - 0.5, total })
      if (!addImageSafe(pdf, backCoverImage, 0, 0, pageWidth, pageHeight)) {
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      }
      setPdfProgress({ mode, label: 'PDF siap didownload', current: total, total })
      savePdfBlob(pdf, filename)
      toast.success('PDF berhasil didownload.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal generate PDF.'
      toast.error(message)
    } finally {
      setIsGeneratingPdf(false)
      setPdfProgress(null)
    }
  }

  const generateReportPdf = async () => {
    await downloadReportPdf(buildCurrentPdfSource(), 'report', `road-condition-${reportDate}.pdf`)
  }

  const generateHistoryPdf = async (row: HistoryRow) => {
    const source = buildHistoryPdfSource(row)
    if (!source?.drafts.length) {
      toast.error('Data report history belum siap untuk PDF.')
      return
    }
    await downloadReportPdf(source, 'history', `road-condition-history-${row.id}.pdf`)
  }

  const activeAssessmentRows = getActiveAssessmentRows(activeDraft)
  const activeOverallScore = activeDraft.analysis
    ? getRoadConditionOverallScore(activeDraft.analysis.assessments)
    : null

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5 pb-10">
      <TabsList>
        <TabsTrigger value="report">Report</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="report" className="space-y-5 outline-none">
    <div className="space-y-5">
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
            <div className="flex items-center justify-between gap-2">
              <Label>Lokasi Site</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  setSiteInputMode((current) => {
                    const nextMode = current === 'select' ? 'manual' : 'select'
                    if (nextMode === 'select') {
                      const currentSite = sites.find((item) => String(item.id) === siteId)
                      if (currentSite) {
                        setSiteName(currentSite.name)
                        setCustomerName(currentSite.customerName ?? '')
                      }
                    } else {
                      setSiteId('')
                    }
                    setAnalysisStatus(null)
                    clearAnalysis()
                    return nextMode
                  })
                }}
              >
                {siteInputMode === 'select' ? 'Manual' : 'Pilih site'}
              </Button>
            </div>
            {siteInputMode === 'select' ? (
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
            ) : (
              <Input
                value={siteName}
                onChange={(event) => handleManualSiteChange(event.target.value)}
                placeholder="Tulis lokasi site manual"
              />
            )}
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
                  <div key={draft.id} className="grid grid-cols-[1fr_auto] gap-2">
                    <button
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
                    <div className="flex gap-1">
                      <Button type="button" variant="outline" size="icon" onClick={() => moveDraft(draft.id, -1)} disabled={draftIndex === 0}>
                        ↑
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => moveDraft(draft.id, 1)} disabled={draftIndex === drafts.length - 1}>
                        ↓
                      </Button>
                    </div>
                  </div>
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

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {activeDraft.photos.map((photo, index) => (
              <div key={index} className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Foto {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" onClick={() => movePhoto(activeDraft.id, index, -1)} disabled={index === 0}>
                      ↑
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => movePhoto(activeDraft.id, index, 1)} disabled={index === activeDraft.photos.length - 1}>
                      ↓
                    </Button>
                    <Badge variant="secondary">{index + 1}/3</Badge>
                  </div>
                </div>

                <label className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                  {photo.previewUrl ? (
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || photo.angle}
                      className="h-full w-full object-contain"
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
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full border-collapse text-left text-sm min-w-[500px]">
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
        <Button type="button" onClick={generateReportPdf} disabled={!allAnalyzed || isGeneratingPdf}>
          {isGeneratingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Generate PDF
        </Button>
        {pdfProgress?.mode === 'report' ? (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
              <span>{pdfProgress.label}</span>
              <span>{pdfProgress.total ? Math.round((pdfProgress.current / pdfProgress.total) * 100) : 0}%</span>
            </div>
            <Progress
              value={pdfProgress.total ? (pdfProgress.current / pdfProgress.total) * 100 : 0}
              className="h-2 bg-slate-100 [&>div]:bg-slate-950"
            />
          </div>
        ) : null}
      </section>

      <div id="road-condition-print-root" className="mx-auto grid max-w-7xl gap-5 overflow-x-auto pb-2 min-w-[640px] sm:min-w-0">
        <article
          className="road-condition-slide aspect-video overflow-hidden rounded-[1.1rem] bg-white bg-cover bg-center shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200"
          style={{ backgroundImage: "url('/cover.png')" }}
        >
          <div className="absolute left-[8%] top-[36%] w-[48%] text-slate-950">
            <p className="text-[7px] sm:text-[8px] lg:text-[10px] font-black uppercase tracking-[0.24em] text-[#0b6f9f]">
              Site Condition Assessment
            </p>
            <h1 className="mt-2 sm:mt-3 font-display text-xl sm:text-2xl lg:text-[44px] font-black leading-[0.98] text-[#0a315f]">
              Road Condition
              <span className="block text-[#79bf23]">Analysis Report</span>
            </h1>
            <div className="mt-3 sm:mt-5 h-1 sm:h-1.5 w-20 sm:w-28 lg:w-36 rounded-full bg-[#79bf23]" />

            <div className="mt-4 sm:mt-6 grid gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] lg:text-[13px] font-bold text-[#153b63]">
              <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[70px_1fr] lg:grid-cols-[92px_1fr] gap-1.5 sm:gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Site</span>
                <span>{siteName || '-'}</span>
              </div>
              <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[70px_1fr] lg:grid-cols-[92px_1fr] gap-1.5 sm:gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Customer</span>
                <span>{customerName || '-'}</span>
              </div>
              <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[70px_1fr] lg:grid-cols-[92px_1fr] gap-1.5 sm:gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Inspector</span>
                <span>{inspectorName || '-'}</span>
              </div>
              <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[70px_1fr] lg:grid-cols-[92px_1fr] gap-1.5 sm:gap-2">
                <span className="uppercase tracking-[0.12em] text-[#0b6f9f]">Date</span>
                <span>{formatReportDate(reportDate)}</span>
              </div>
            </div>
          </div>

          <footer className="absolute bottom-[5%] left-[8%] text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-[0.18em] text-[#153b63]/60">
            Slide 1/{totalSlides}
          </footer>
        </article>

        <article className="road-condition-slide aspect-video overflow-hidden rounded-[1.1rem] bg-white shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200">
          <div className="flex h-full flex-col">
            <header className="border-b border-slate-900 bg-[#1a365d] px-3 sm:px-5 py-1.5 sm:py-2 text-center text-white">
              <h2 className="font-display text-sm sm:text-lg lg:text-2xl font-black">Site Condition Assessment</h2>
            </header>

            <div className="grid grid-rows-[50px_1fr] sm:grid-rows-[70px_1fr] gap-2 sm:gap-3 p-2.5 sm:p-4">
              <table className="w-full border-collapse text-center text-[7px] sm:text-[8px] lg:text-[9px] font-semibold text-slate-950">
                <thead>
                  <tr className="bg-[#e2e8f0]">
                    <th className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">DATE</th>
                    <th className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">LOADING AREA</th>
                    <th className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">HAULING ROAD</th>
                    <th className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">DUMPING AREA</th>
                    <th className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">AVERAGE</th>
                    <th className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">STAR RATING</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1 font-black">{formatReportDate(reportDate)}</td>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">{formatSummaryPercent(categorySummaryScores.loading_point)}</td>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">{formatSummaryPercent(categorySummaryScores.haulroad)}</td>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1">{formatSummaryPercent(categorySummaryScores.disposal)}</td>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1 font-black">{formatSummaryPercent(overallSummaryScore)}</td>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1 font-black">{formatSummaryScore(overallSummaryScore)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1 text-left text-[10px] sm:text-sm lg:text-lg font-black text-red-600">{siteName || '-'}</td>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1 text-[7px] sm:text-[8px] lg:text-xs" colSpan={4}>
                      Inspector: {inspectorName || '-'} · Customer: {customerName || '-'}
                    </td>
                    <td className="border border-slate-900 px-1 sm:px-2 py-0.5 sm:py-1 text-sm sm:text-lg lg:text-xl font-black text-red-600">
                      {formatStars(overallSummaryScore)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="min-h-0 overflow-hidden">
                <table className="w-full border-collapse text-left text-[6px] sm:text-[7px] lg:text-[8px] text-slate-950">
                  <thead>
                    <tr className="bg-[#e2e8f0] text-center font-black">
                      <th className="w-[15%] border border-slate-900 px-1 sm:px-1.5 py-0.5 sm:py-1">AREA</th>
                      <th className="border border-slate-900 px-1 sm:px-1.5 py-0.5 sm:py-1">POINT / SEGMENT</th>
                      <th className="w-[11%] border border-slate-900 px-1 sm:px-1.5 py-0.5 sm:py-1">AVG</th>
                      <th className="w-[18%] border border-slate-900 px-1 sm:px-1.5 py-0.5 sm:py-1">STAR RATING</th>
                      <th className="w-[12%] border border-slate-900 px-1 sm:px-1.5 py-0.5 sm:py-1">POINT*</th>
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

            <footer className="absolute bottom-1.5 sm:bottom-2 right-2 sm:right-4 text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
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
            alt: photo.angle || 'Foto road condition',
            imageUrl: photo.previewUrl,
          }))

          return (
            <article
              key={draft.id}
              className="road-condition-slide grid aspect-video grid-rows-[22%_42%_1fr] overflow-hidden rounded-[1.1rem] bg-white shadow-[0_18px_48px_rgba(8,32,51,0.12)] ring-1 ring-slate-200"
            >
              <header
                className="grid min-h-0 gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 text-white md:grid-cols-[1fr_auto]"
                style={{ background: CATEGORY_GRADIENTS[draft.categoryKey] }}
              >
                <div className="min-w-0">
                  <div className="mb-0.5 sm:mb-1 flex items-center gap-1.5 sm:gap-2">
                    {React.createElement(CATEGORY_ICONS[draft.categoryKey], { className: 'size-3 sm:size-4 opacity-80' })}
                    <p className="text-[7px] sm:text-[8px] lg:text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                      Report Analysis Road Condition
                    </p>
                  </div>
                  <h2 className="mt-0.5 sm:mt-1 truncate font-display text-lg sm:text-2xl lg:text-3xl font-semibold leading-tight">
                    {category.reportLabel}
                  </h2>
                  <p className="text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-[0.14em] text-white/80">{pointLabel}</p>
                  {analysis ? <p className="mt-0.5 sm:mt-1 line-clamp-2 max-w-3xl text-[8px] sm:text-[9px] lg:text-xs font-semibold text-white/75">{analysis.summary}</p> : null}
                </div>
                <div className="grid min-w-0 sm:min-w-[180px] lg:min-w-[250px] gap-0.5 sm:gap-1 rounded-lg bg-white/15 p-1.5 sm:p-2 text-[8px] sm:text-[9px] lg:text-xs font-semibold ring-1 ring-white/20 backdrop-blur-sm">
                  <span>Site: {siteName || '-'}</span>
                  <span>Customer: {customerName || '-'}</span>
                  <span>Inspector: {inspectorName || '-'}</span>
                  <span>Point: {pointLabel}</span>
                  <span>Tanggal: {formatReportDate(reportDate)}</span>
                  <span>Nilai Akhir: {overallScore ?? '-'}/5</span>
                </div>
              </header>

              <section className="grid min-h-0 grid-cols-3 gap-2 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-3">
                {reportPhotos.map((photo, photoIndex) => (
                  <figure key={photoIndex} className="min-h-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                    {photo.imageUrl ? (
                      <img src={photo.imageUrl} alt={photo.alt} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-1 text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500">
                        No Photo
                      </div>
                    )}
                  </figure>
                ))}
              </section>

              <section className="min-h-0 overflow-hidden px-2.5 sm:px-4 pb-4 sm:pb-7">
                <div className="h-full min-h-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
                <table className="h-full w-full border-collapse text-left text-[8px] sm:text-[9px] lg:text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-[6px] sm:text-[7px] lg:text-[8px] uppercase tracking-[0.12em] text-slate-600">
                      <th className="w-[7%] px-1 sm:px-2 py-0.5 sm:py-1">Nilai</th>
                      <th className="w-[46%] px-1 sm:px-2 py-0.5 sm:py-1">Deskripsi</th>
                      <th className="px-1 sm:px-2 py-0.5 sm:py-1">Rekomendasi</th>
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
                          <td className="px-1 sm:px-2 py-0.5 sm:py-1">
                            <span
                              className={`inline-flex min-w-6 sm:min-w-8 items-center justify-center rounded-full px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] lg:text-[10px] font-black ring-1 ${
                                row.score ? scoreTone(row.score) : 'bg-slate-100 text-slate-500 ring-slate-200'
                              }`}
                            >
                              {row.score || '-'}
                            </span>
                          </td>
                          <td className="px-1 sm:px-2 py-0.5 sm:py-1 leading-tight text-slate-800">
                            <span className="block font-black text-slate-950">{row.criterion.title}</span>
                            <span className="mt-0.5 block">{row.description}</span>
                          </td>
                          <td className="px-1 sm:px-2 py-0.5 sm:py-1 leading-tight text-slate-800">{row.recommendation}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </section>

              <footer className="absolute bottom-1.5 sm:bottom-2 right-2 sm:right-4 text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
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
      </TabsContent>

      <TabsContent value="history" className="space-y-5 outline-none">
        <section className="space-y-4 rounded-[1.1rem] bg-white p-5 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">History Inspeksi</h2>
              <p className="text-xs font-semibold text-slate-500">50 report terakhir.</p>
            </div>
            <Badge variant="outline">{historyList.length} report</Badge>
          </div>
          {pdfProgress?.mode === 'history' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                <span>{pdfProgress.label}</span>
                <span>{pdfProgress.total ? Math.round((pdfProgress.current / pdfProgress.total) * 100) : 0}%</span>
              </div>
              <Progress
                value={pdfProgress.total ? (pdfProgress.current / pdfProgress.total) * 100 : 0}
                className="h-2 bg-slate-100 [&>div]:bg-slate-950"
              />
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Site</th>
                  <th className="px-3 py-2">Inspector</th>
                  <th className="px-3 py-2">Point</th>
                  <th className="px-3 py-2">Avg</th>
                  <th className="px-3 py-2">Update</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {historyList.length > 0 ? (
                  historyList.map((row) => {
                    const reportData = row.reportData
                    const pointCount = Array.isArray(reportData?.drafts) ? reportData.drafts.length : 0
                    const averageScore = Number(row.averageScore ?? 0)

                    return (
                      <tr key={row.id} className="border-t border-slate-200 align-top">
                        <td className="px-3 py-3 font-semibold text-slate-950">{formatReportDate(String(row.reportDate))}</td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-950">{row.siteName}</div>
                          <div className="text-xs text-slate-500">{row.customerName}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{row.inspectorName}</td>
                        <td className="px-3 py-3 text-slate-700">{pointCount}</td>
                        <td className="px-3 py-3">
                          <Badge className={scoreTone(normalizeRoadConditionScore(averageScore))}>
                            {averageScore.toFixed(2)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-500">
                          {new Date(row.updatedAt).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="outline" size="icon" title="Lihat detail" onClick={() => setPreviewHistory(row)}>
                              <Eye className="size-3.5" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" title="Download PDF" onClick={() => generateHistoryPdf(row)} disabled={isGeneratingPdf}>
                              {isGeneratingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                            </Button>
                            <Button type="button" variant="outline" size="icon" title="Edit report" onClick={() => loadHistoryRow(row)}>
                              <PenSquare className="size-3.5" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" title="Hapus history" onClick={() => deleteHistoryRow(row)} disabled={deletingHistoryId === row.id || isGeneratingPdf}>
                              {deletingHistoryId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                      Belum ada history inspeksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </TabsContent>

      <Dialog open={previewHistory !== null} onOpenChange={(open) => { if (!open) setPreviewHistory(null) }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Detail History Report #{previewHistory?.id}</DialogTitle>
          </DialogHeader>
          {previewHistory?.reportData && (() => {
            const d = previewHistory.reportData
            const pDrafts = d.drafts ?? []
            const previewTotalSlides = pDrafts.length + 2
            const previewSummaryRows = pDrafts.map((draft, i) => ({
              draft,
              pointLabel: draft.pointName.trim() || `${ROAD_CONDITION_CATEGORIES[draft.categoryKey].label} ${i + 1}`,
              score: draft.analysis ? draft.analysis.assessments.reduce((s, a) => s + normalizeRoadConditionScore(a.score), 0) / draft.analysis.assessments.length : null,
            }))
            const previewOverallScore = previewSummaryRows.length && previewSummaryRows.every(r => r.score != null)
              ? previewSummaryRows.reduce((t, r) => t + (r.score ?? 0), 0) / previewSummaryRows.length
              : null

            return (
              <div className="space-y-5 py-4">
                <div className="grid gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                  <div className="grid grid-cols-[100px_1fr] gap-2"><span className="font-bold text-slate-600">Site:</span><span>{d.siteName}</span></div>
                  <div className="grid grid-cols-[100px_1fr] gap-2"><span className="font-bold text-slate-600">Customer:</span><span>{d.customerName}</span></div>
                  <div className="grid grid-cols-[100px_1fr] gap-2"><span className="font-bold text-slate-600">Inspector:</span><span>{d.inspectorName}</span></div>
                  <div className="grid grid-cols-[100px_1fr] gap-2"><span className="font-bold text-slate-600">Tanggal:</span><span>{formatReportDate(d.reportDate)}</span></div>
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-bold text-slate-600">Nilai Akhir:</span>
                    <Badge className={scoreTone(normalizeRoadConditionScore(previewOverallScore ?? 0))}>
                      {previewOverallScore?.toFixed(2) ?? '-'}/5
                    </Badge>
                  </div>
                </div>

                <h3 className="font-display text-base font-semibold text-slate-950">Draft Point ({pDrafts.length})</h3>
                <div className="space-y-4">
                  {pDrafts.map((draft) => {
                    const category = ROAD_CONDITION_CATEGORIES[draft.categoryKey]
                    const draftScore = draft.analysis
                      ? draft.analysis.assessments.reduce((s, a) => s + normalizeRoadConditionScore(a.score), 0) / draft.analysis.assessments.length
                      : null
                    const pointLabel = draft.pointName.trim() || category.label

                    return (
                      <div key={draft.id} className="rounded-xl ring-1 ring-slate-200">
                        <header className="rounded-t-xl px-4 py-2 text-white" style={{ background: CATEGORY_GRADIENTS[draft.categoryKey] }}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black">{category.reportLabel} · {pointLabel}</span>
                            <Badge variant="secondary">{draftScore?.toFixed(2) ?? '-'}/5</Badge>
                          </div>
                        </header>
                        <div className="p-3">
                          <div className="mb-3 grid grid-cols-3 gap-2">
                            {(draft.photos ?? []).map((photo, pi) => (
                              <figure key={pi} className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                                <div className="flex aspect-video items-center justify-center overflow-hidden rounded bg-white text-xs text-slate-400">
                                  {photo.dataUrl && isImageDataUrl(photo.dataUrl) ? (
                                    <img
                                      src={photo.dataUrl}
                                      alt={photo.caption || photo.angle || `Foto ${pi + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>{photo.caption || photo.angle || `Foto ${pi + 1}`}</span>
                                  )}
                                </div>
                                <figcaption className="mt-1 text-[10px] font-semibold text-slate-600">
                                  {photo.angle || `Angle ${pi + 1}`} · {photo.caption || '-'}
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                          {draft.analysis ? (
                            <table className="w-full border-collapse text-left text-[10px]">
                              <thead>
                                <tr className="bg-slate-100 text-[8px] uppercase tracking-[0.12em] text-slate-600">
                                  <th className="w-[10%] px-2 py-1">Nilai</th>
                                  <th className="w-[40%] px-2 py-1">Deskripsi</th>
                                  <th className="px-2 py-1">Rekomendasi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {category.criteria.map((criterion) => {
                                  const a = draft.analysis!.assessments.find((x) => x.criterionId === criterion.id)
                                  return (
                                    <tr key={criterion.id} className="border-t border-slate-200 align-top">
                                      <td className="px-2 py-1">
                                        <span className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${a ? scoreTone(normalizeRoadConditionScore(a.score)) : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                                          {a ? normalizeRoadConditionScore(a.score) : '-'}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1 leading-tight text-slate-800">
                                        <span className="block font-black text-slate-950">{criterion.title}</span>
                                        <span className="mt-0.5 block">{a?.description || '-'}</span>
                                      </td>
                                      <td className="px-2 py-1 leading-tight text-slate-800">{a?.recommendation || '-'}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs text-slate-500">Belum ada analisis.</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
