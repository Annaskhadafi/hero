'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Camera,
  Check,
  Clock,
  Cpu,
  ExternalLink,
  FileVideo,
  Loader2,
  RefreshCw,
  ScanSearch,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type VisionModelSettings,
  type VisionModelEndpointPreset,
} from '@/lib/vision-model-settings'
import { syncEndpointsFromVisionAction } from '@/app/dashboard/settings/vision-model/actions'

type PredictionResponse = { success?: boolean; result?: unknown; error?: string }
type ProcessingStage = 'idle' | 'optimizing' | 'uploading' | 'analyzing'
type DamageDetail = { label: string; confidence: number | null }
type FeedbackChoice = 'accurate' | 'inaccurate'

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,video/mp4,video/x-msvideo,video/quicktime'
const MAX_IMAGE_DIMENSION = 1920

const TIRE_DAMAGE_LABELS = [
  'cut',
  'crack',
  'sidewall separation',
  'bulging',
  'chunking',
  'chipping',
  'lifting',
  'damage',
  'cut separation',
  'iron_puncture',
  'worn in to ply',
  'worn out',
  'tread cut separation',
  'casing ply separation',
  'impact',
  'patchy wear',
  'burnt tire',
  'lug tiring/tread chunking',
  'tread lifting',
  'foreign object/puncture',
  'chafer separation',
  'accidental damage',
  'belt edge separation',
  'sidewall damage/sodewall crack',
  'shoulder separation',
  'center wear',
  'tread chipping',
  'radial crack',
  'repair failure',
  'bead damage/cracking/leaking',
  'electrical discharge',
  'liner/tube/rust band failure',
  'heat separation',
] as const

function findPredictionMetadata(value: unknown): {
  predictionId: string | null
  modelVersion: string | null
  width: number | null
  height: number | null
  sourceRecordId: string | null
} {
  if (!value || typeof value !== 'object') {
    return { predictionId: null, modelVersion: null, width: null, height: null, sourceRecordId: null }
  }
  const object = value as Record<string, unknown>
  const predictionId = [object.prediction_id, object.predictionId].find(
    (item) => typeof item === 'string'
  ) as string | undefined
  const modelVersion = [object.model_version, object.modelVersion, object.version, object.model].find(
    (item) => typeof item === 'string'
  ) as string | undefined
  const width = [object.image_width, object.width].find((item) => typeof item === 'number') as
    | number
    | undefined
  const height = [object.image_height, object.height].find((item) => typeof item === 'number') as
    | number
    | undefined
  const sourceRecordId = [object.source_record_id, object.id].find(
    (item) => typeof item === 'string'
  ) as string | undefined
  const direct = {
    predictionId: predictionId ?? null,
    modelVersion: modelVersion ?? null,
    width: width ?? null,
    height: height ?? null,
    sourceRecordId: sourceRecordId ?? null,
  }
  if (direct.predictionId || direct.modelVersion || direct.width || direct.height) return direct
  for (const nested of [object.data, object.result, object.output]) {
    const found = findPredictionMetadata(nested)
    if (found.predictionId || found.modelVersion || found.width || found.height) return found
  }
  return direct
}

function findAnnotatedUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const object = value as Record<string, unknown>
  for (const key of ['annotated_url', 'annotated_image_url', 'annotated_image', 'image_url', 'output_url']) {
    if (typeof object[key] === 'string' && object[key]) return object[key]
  }
  for (const key of ['data', 'result', 'output']) {
    const nested = findAnnotatedUrl(object[key])
    if (nested) return nested
  }
  return null
}

function findDamageDetails(value: unknown): DamageDetail[] {
  if (!value || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  for (const key of ['detections', 'predictions', 'damages', 'results']) {
    if (!Array.isArray(object[key])) continue
    const details = object[key]
      .map((item): DamageDetail | null => {
        if (!item || typeof item !== 'object') return null
        const detection = item as Record<string, unknown>
        const label = [detection.class_name, detection.class, detection.label, detection.name].find(
          (candidate) => typeof candidate === 'string' && candidate.trim()
        )
        if (typeof label !== 'string') return null
        const rawConfidence = [detection.confidence, detection.score, detection.conf].find(
          (candidate) => typeof candidate === 'number'
        )
        const confidence =
          typeof rawConfidence === 'number'
            ? rawConfidence > 1
              ? rawConfidence / 100
              : rawConfidence
            : null
        return { label, confidence }
      })
      .filter((detail): detail is DamageDetail => detail !== null)
    if (details.length) return details
  }
  const dataDetails = findDamageDetails(object.data)
  return dataDetails.length ? dataDetails : findDamageDetails(object.result)
}

function buildGeniusPrompt(damages: DamageDetail[]) {
  const findings = damages.length
    ? damages
        .map(
          (damage) =>
            `${damage.label}${damage.confidence === null ? '' : ` (${Math.round(damage.confidence * 100)}%)`}`
        )
        .join(', ')
    : 'tidak ada kerusakan terdeteksi secara otomatis'

  return `Hasil analisa Vision AI untuk ban tambang: ${findings}. Mohon jelaskan: 1) Kemungkinan penyebab kerusakan, 2) Risiko operasional jika tetap beroperasi, 3) Rekomendasi tindakan penanganan cepat & aman, 4) Rekomendasi apakah perlu inspeksi tyre engineer atau scraping/retread.`
}

async function optimizeImage(file: File) {
  if (!file.type.startsWith('image/') || !('createImageBitmap' in window)) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.88)
  )
  return blob
    ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
    : file
}

interface DesktopTireDamageClientProps {
  settings: VisionModelSettings
  canConfigureModel: boolean
}

export function DesktopTireDamageClient({
  settings,
  canConfigureModel,
}: DesktopTireDamageClientProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    settings.primaryEndpoint || 'tire-demage-onnx'
  )
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(
    settings.defaultConfidence ?? 0.25
  )
  const [iouThreshold, setIouThreshold] = useState<number>(
    settings.defaultIou ?? 0.45
  )
  const [endpointsList, setEndpointsList] = useState<VisionModelEndpointPreset[]>(
    settings.customEndpoints || []
  )
  const [syncingModels, setSyncingModels] = useState(false)

  async function handleQuickSync() {
    setSyncingModels(true)
    try {
      const res = await syncEndpointsFromVisionAction({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
      })
      if (!res.success || !res.endpoints) {
        toast.error(res.message || 'Gagal menyinkronkan model.')
        return
      }

      if (res.endpoints.length === 0) {
        toast.info('Tidak ada endpoint aktif ditemukan di Vision API.')
        return
      }

      const synced: VisionModelEndpointPreset[] = res.endpoints.map((ep) => ({
        id: `rv-${ep.id}-${ep.slug}`,
        name: ep.name || ep.slug,
        endpoint: ep.slug,
        description: ep.description || (ep.model_name ? `Model: ${ep.model_name} (${ep.model_version || 'v1'})` : undefined),
        isDefault: ep.slug === settings.primaryEndpoint,
      }))

      setEndpointsList(synced)
      toast.success(`Berhasil menyinkronkan ${synced.length} model dari Raray Vision!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyinkronkan model.')
    } finally {
      setSyncingModels(false)
    }
  }

  // Media state
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null)

  // Camera Webcam State
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Feedback State
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 })
  const [feedbackChoice, setFeedbackChoice] = useState<FeedbackChoice | null>(null)
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [feedbackLabel, setFeedbackLabel] = useState<(typeof TIRE_DAMAGE_LABELS)[number]>('crack')
  const [feedbackBox, setFeedbackBox] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackDragStart, setFeedbackDragStart] = useState<{ x: number; y: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const loading = stage !== 'idle'

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (cameraRef.current && cameraStream) {
      cameraRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraStream(null)
    setCameraOpen(false)
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Webcam tidak didukung di peramban ini.')
      return
    }
    try {
      closeCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraStream(stream)
      setCameraOpen(true)
    } catch {
      toast.error('Tidak dapat mengakses webcam. Pastikan izin kamera sudah diberikan.')
    }
  }

  function captureWebcamPhoto() {
    const video = cameraRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      toast.error('Kamera belum siap.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Gagal mengambil foto.')
          return
        }
        handleFileSelect(new File([blob], `capture-tire-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        closeCamera()
      },
      'image/jpeg',
      0.92
    )
  }

  function handleFileSelect(nextFile: File | undefined) {
    if (!nextFile) return
    if (!ACCEPTED_MEDIA.split(',').includes(nextFile.type)) {
      toast.error('Format tidak didukung. Gunakan JPG, PNG, WebP, MP4, AVI, atau MOV.')
      return
    }
    const isVideo = nextFile.type.startsWith('video/')
    if (nextFile.size > (isVideo ? 100 : 25) * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${isVideo ? '100MB (video)' : '25MB (gambar)'}.`)
      return
    }

    setResult(null)
    setFeedbackChoice(null)
    setFeedbackSent(false)
    setFeedbackNotes('')
    setFeedbackBox({ x: 0, y: 0, width: 0, height: 0 })
    setFeedbackDragStart(null)
    setFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))

    if (nextFile.type.startsWith('image/')) {
      void createImageBitmap(nextFile)
        .then((bitmap) => {
          setImageDimensions({ width: bitmap.width, height: bitmap.height })
          bitmap.close()
        })
        .catch(() => undefined)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  async function runPrediction() {
    if (!file) {
      toast.error('Pilih file gambar atau video terlebih dahulu.')
      return
    }

    setResult(null)
    setFeedbackChoice(null)
    setFeedbackSent(false)
    setFeedbackNotes('')
    setFeedbackBox({ x: 0, y: 0, width: 0, height: 0 })
    setFeedbackDragStart(null)
    setElapsedSeconds(0)

    const startedAt = performance.now()
    const timer = window.setInterval(
      () => setElapsedSeconds(Math.ceil((performance.now() - startedAt) / 1000)),
      250
    )

    let analyzeTimer: any
    try {
      setStage(file.type.startsWith('image/') ? 'optimizing' : 'uploading')
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const optimizedFile = await optimizeImage(file)
      const formData = new FormData()
      formData.append('file', optimizedFile)
      formData.append('conf_threshold', String(confidenceThreshold))
      formData.append('iou_threshold', String(iouThreshold))
      if (selectedEndpoint) {
        formData.append('endpoint', selectedEndpoint)
      }

      setStage('uploading')
      analyzeTimer = window.setTimeout(() => setStage('analyzing'), 600)

      const response = await fetch('/api/tire-damage/predict', {
        method: 'POST',
        body: formData,
      })

      window.clearTimeout(analyzeTimer)
      const payload = (await response.json()) as PredictionResponse

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Analisis kerusakan ban gagal.')
      }

      setResult(payload.result)
      toast.success('Analisis kerusakan ban selesai.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analisis kerusakan gagal.')
    } finally {
      window.clearInterval(timer)
      setElapsedSeconds(Math.max(1, Math.ceil((performance.now() - startedAt) / 1000)))
      if (analyzeTimer) window.clearTimeout(analyzeTimer)
      setStage('idle')
    }
  }

  const annotatedUrl = findAnnotatedUrl(result)
  const damageDetails = findDamageDetails(result)
  const predictionMetadata = findPredictionMetadata(result)
  const geniusPrompt = buildGeniusPrompt(damageDetails)
  const isVideo = file?.type.startsWith('video/')

  async function submitFeedback(choice: FeedbackChoice) {
    if (!predictionMetadata.predictionId || feedbackSending) {
      toast.error('ID prediksi tidak tersedia.')
      return
    }
    if (choice === 'inaccurate' && (feedbackBox.width <= 0 || feedbackBox.height <= 0)) {
      toast.error('Tarik kotak seleksi pada gambar untuk menandai area kerusakan yang terlewat/salah.')
      return
    }

    setFeedbackChoice(choice)
    setFeedbackSending(true)

    try {
      const response = await fetch('/api/tire-damage/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_id: predictionMetadata.predictionId,
          feedback: choice,
          notes: feedbackNotes || null,
          model_version: predictionMetadata.modelVersion || selectedEndpoint,
          source_record_id: predictionMetadata.sourceRecordId,
          image_width: predictionMetadata.width || imageDimensions.width,
          image_height: predictionMetadata.height || imageDimensions.height,
          annotations:
            choice === 'inaccurate' && feedbackBox.width > 0 && feedbackBox.height > 0
              ? [
                  {
                    shape: 'rectangle',
                    label: feedbackLabel,
                    x: feedbackBox.x,
                    y: feedbackBox.y,
                    width: feedbackBox.width,
                    height: feedbackBox.height,
                  },
                ]
              : [],
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Gagal mengirimkan feedback.')
      }

      setFeedbackSent(true)
      toast.success('Feedback berhasil dikirim untuk peningkatan akurasi model!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim feedback.')
    } finally {
      setFeedbackSending(false)
    }
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (feedbackChoice !== 'inaccurate' || feedbackSent || isVideo) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setFeedbackDragStart({ x, y })
    setFeedbackBox({ x, y, width: 0, height: 0 })
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!feedbackDragStart) return
    const rect = e.currentTarget.getBoundingClientRect()
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const x = Math.min(feedbackDragStart.x, currentX)
    const y = Math.min(feedbackDragStart.y, currentY)
    const width = Math.abs(currentX - feedbackDragStart.x)
    const height = Math.abs(currentY - feedbackDragStart.y)
    setFeedbackBox({ x, y, width, height })
  }

  function handlePointerUp() {
    setFeedbackDragStart(null)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-sm">
              <ScanSearch className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Deteksi Kerusakan Ban (AI)</h1>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium text-[11px]">
                  Vision Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Sistem computer vision cerdas untuk identifikasi otomatis 30+ jenis kerusakan ban tambang (OTR).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canConfigureModel && (
            <Link href="/dashboard/settings/vision-model">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Settings className="size-3.5" />
                Pengaturan Model
              </Button>
            </Link>
          )}
          <Link href="/dashboard/hero-genius">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[#003461] dark:text-blue-400">
              <Sparkles className="size-3.5" />
              Buka Hero Genius
            </Button>
          </Link>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ================= LEFT COLUMN: INPUT & PARAMETERS (5 COLS) ================= */}
        <div className="space-y-5 lg:col-span-5">
          {/* Card: Model Selection & Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Cpu className="size-4 text-primary" />
                  Pilihan Model Serving & Threshold
                </CardTitle>
                {canConfigureModel && (
                  <Link
                    href="/dashboard/settings/vision-model"
                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Edit URL <ExternalLink className="size-2.5" />
                  </Link>
                )}
              </div>
              <CardDescription className="text-xs">
                Ubah model inferensi atau sesuaikan ambang batas deteksi secara dinamis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropdown Model Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Model Endpoint</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleQuickSync}
                    disabled={syncingModels}
                    className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10"
                    title="Ambil daftar model terbaru langsung dari Vision API"
                  >
                    {syncingModels ? (
                      <Loader2 className="size-2.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-2.5" />
                    )}
                    <span>Sync dari Raray Vision</span>
                  </Button>
                </div>
                <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih model..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {endpointsList.map((preset) => (
                      <SelectItem key={preset.id} value={preset.endpoint} className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">{preset.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {preset.endpoint}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {!endpointsList.some((p) => p.endpoint === selectedEndpoint) && (
                      <SelectItem value={selectedEndpoint} className="text-xs font-mono">
                        {selectedEndpoint} (Kustom)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>Host: {new URL(settings.baseUrl).hostname}</span>
                  <span className="font-mono">{selectedEndpoint}</span>
                </div>
              </div>

              {/* Threshold Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confidence Threshold:</span>
                    <span className="font-mono font-semibold text-primary">
                      {confidenceThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    disabled={loading}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">IoU Overlap Threshold:</span>
                    <span className="font-mono font-semibold text-primary">
                      {iouThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={iouThreshold}
                    onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                    disabled={loading}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Media Upload & Webcam */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Upload className="size-4 text-primary" />
                  Foto atau Video Ban
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openCamera}
                  disabled={loading}
                  className="h-7 text-xs gap-1"
                >
                  <Camera className="size-3 text-primary" />
                  Gunakan Webcam
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-primary bg-primary/5 scale-[0.99]'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_MEDIA}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <ScanSearch className="size-6" />
                </div>
                <p className="text-xs font-semibold">Tarik & Letakkan berkas foto / video ban di sini</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  atau klik untuk memilih dari komputer Anda (JPG, PNG, WebP, MP4, AVI, MOV)
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                  Maksimal foto 25MB • video 100MB
                </p>
              </div>

              {/* Selected File Card Preview */}
              {file && (
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <div className="relative size-12 rounded overflow-hidden shrink-0 bg-slate-900">
                        {previewUrl && (
                          <img
                            src={previewUrl}
                            alt="Preview ban"
                            className="size-full object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded bg-slate-800 text-white shrink-0">
                        <FileVideo className="size-6" />
                      </div>
                    )}
                    <div className="truncate text-left">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setPreviewUrl(null)
                      setResult(null)
                    }}
                    disabled={loading}
                    className="size-8 p-0 text-muted-foreground hover:text-red-500"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}

              {/* Submit Button & Progress Indicator */}
              <div className="pt-2">
                <Button
                  onClick={runPrediction}
                  disabled={!file || loading}
                  className="w-full gap-2 bg-[#003461] hover:bg-[#002647] text-white py-5 font-semibold text-sm shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>
                        {stage === 'optimizing'
                          ? 'Mengoptimalkan Resolusi...'
                          : stage === 'uploading'
                          ? 'Mengunggah Media...'
                          : 'Menganalisis dengan Vision AI...'}
                      </span>
                      {elapsedSeconds !== null && (
                        <span className="font-mono text-xs opacity-80">({elapsedSeconds}s)</span>
                      )}
                    </>
                  ) : (
                    <>
                      <Zap className="size-4" />
                      <span>Analisis Kerusakan Ban Sekarang</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: RESULTS, ANNOTATIONS & GENIUS (7 COLS) ================= */}
        <div className="space-y-5 lg:col-span-7">
          <Card className="min-h-[520px] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    Hasil Visual Inspeksi AI
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bounding boxes dan label kerusakan hasil deteksi model.
                  </CardDescription>
                </div>
                {result ? (
                  <Badge
                    className={
                      damageDetails.length > 0
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }
                  >
                    {damageDetails.length > 0
                      ? `${damageDetails.length} Kerusakan Teridentifikasi`
                      : 'Kondisi Ban Normal'}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-5 flex flex-col justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="relative">
                    <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <ScanSearch className="size-7 text-primary absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Memproses Inspeksi Ban...</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Model sedang memindai pola tapak (tread), sidewall, dan bead untuk mendeteksi potensi
                      kerusakan.
                    </p>
                  </div>
                  {elapsedSeconds !== null && (
                    <Badge variant="outline" className="font-mono text-xs gap-1">
                      <Clock className="size-3" /> {elapsedSeconds} detik
                    </Badge>
                  )}
                </div>
              ) : result ? (
                <div className="space-y-5">
                  {/* Visual Image / Video Container */}
                  <div className="relative rounded-xl overflow-hidden border bg-slate-950 shadow-inner flex items-center justify-center max-h-[500px]">
                    {annotatedUrl ? (
                      <div
                        className="relative size-full flex items-center justify-center cursor-crosshair select-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                      >
                        <img
                          src={annotatedUrl}
                          alt="Hasil deteksi ban beranotasi"
                          className="max-h-[460px] w-auto object-contain"
                        />

                        {feedbackChoice === 'inaccurate' && feedbackBox.width > 0 && feedbackBox.height > 0 && (
                          <div
                            className="absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none rounded-sm transition-all"
                            style={{
                              left: `${feedbackBox.x * 100}%`,
                              top: `${feedbackBox.y * 100}%`,
                              width: `${feedbackBox.width * 100}%`,
                              height: `${feedbackBox.height * 100}%`,
                            }}
                          >
                            <span className="absolute -top-5 left-0 bg-amber-500 text-black text-[10px] px-1 font-bold rounded">
                              {feedbackLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : previewUrl && !isVideo ? (
                      <img
                        src={previewUrl}
                        alt="Foto ban terpilih"
                        className="max-h-[460px] w-auto object-contain"
                      />
                    ) : previewUrl && isVideo ? (
                      <video src={previewUrl} controls className="max-h-[460px] w-full" />
                    ) : null}
                  </div>

                  {/* Detections Breakdown Chips */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rincian Temuan Kerusakan:
                    </Label>
                    {damageDetails.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {damageDetails.map((detail, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/30"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex size-2 rounded-full bg-red-500" />
                              <span className="text-xs font-semibold capitalize">{detail.label}</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs font-bold text-red-600">
                              {detail.confidence !== null
                                ? `${Math.round(detail.confidence * 100)}%`
                                : 'Terdeteksi'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                        Tidak ada kerusakan terdeteksi pada ambang kepastian saat ini.
                      </div>
                    )}
                  </div>

                  {/* Hero Genius AI Insights */}
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-4 dark:border-blue-900/50 dark:from-blue-950/30 dark:to-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#003461] dark:text-blue-300">
                        <Sparkles className="size-4.5" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                          Hero Genius AI Insight & Solusi
                        </h4>
                      </div>
                      <Link
                        href={`/dashboard/hero-genius?q=${encodeURIComponent(geniusPrompt)}`}
                        target="_blank"
                      >
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-white dark:bg-slate-900">
                          Buka di Hero Genius <ArrowRight className="size-3" />
                        </Button>
                      </Link>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {damageDetails.length > 0 ? (
                        <>
                          Terdeteksi indikasi kerusakan <strong>{damageDetails.map((d) => d.label).join(', ')}</strong>. 
                          Disarankan segera jadwalkan inspeksi fisik sebelum melanjutkan operasional pada unit hauling.
                        </>
                      ) : (
                        'Permukaan ban terlihat dalam kondisi baik tanpa retak atau separasi yang melampaui ambang kritis.'
                      )}
                    </p>
                  </div>

                  {/* Feedback Loop Panel */}
                  <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Apakah hasil deteksi ini akurat?</span>
                      {feedbackSent && (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] gap-1">
                          <Check className="size-3" /> Feedback Tersimpan
                        </Badge>
                      )}
                    </div>

                    {!feedbackSent ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={feedbackChoice === 'accurate' ? 'default' : 'outline'}
                            onClick={() => submitFeedback('accurate')}
                            disabled={feedbackSending}
                            className="gap-1.5 text-xs h-8"
                          >
                            <ThumbsUp className="size-3.5 text-emerald-500" />
                            Akurat (Sesuai)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={feedbackChoice === 'inaccurate' ? 'default' : 'outline'}
                            onClick={() => setFeedbackChoice('inaccurate')}
                            disabled={feedbackSending}
                            className="gap-1.5 text-xs h-8"
                          >
                            <ThumbsDown className="size-3.5 text-red-500" />
                            Kurang Akurat (Koreksi)
                          </Button>
                        </div>

                        {feedbackChoice === 'inaccurate' && (
                          <div className="rounded-lg border p-3 bg-background space-y-3 pt-3">
                            <p className="text-[11px] text-muted-foreground">
                              Tarik kotak seleksi langsung di atas gambar ban untuk menandai letak kerusakan yang
                              sebenarnya.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Label Kerusakan Sebenarnya</Label>
                                <Select
                                  value={feedbackLabel}
                                  onValueChange={(val) =>
                                    setFeedbackLabel(val as (typeof TIRE_DAMAGE_LABELS)[number])
                                  }
                                >
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {TIRE_DAMAGE_LABELS.map((lbl) => (
                                      <SelectItem key={lbl} value={lbl} className="text-xs capitalize">
                                        {lbl}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Catatan Tambahan (Opsional)</Label>
                                <Input
                                  value={feedbackNotes}
                                  onChange={(e) => setFeedbackNotes(e.target.value)}
                                  placeholder="Contoh: crack halus di ply..."
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => submitFeedback('inaccurate')}
                              disabled={feedbackSending || feedbackBox.width <= 0}
                              className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              {feedbackSending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              Kirim Koreksi ke Model
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 text-muted-foreground">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                    <ScanSearch className="size-7 opacity-50" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Belum Ada Hasil Inspeksi</h4>
                    <p className="text-xs mt-1 max-w-sm">
                      Pilih foto atau video ban tambang di kolom sebelah kiri, lalu tekan tombol "Analisis Kerusakan
                      Ban Sekarang".
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Webcam Dialog Modal */}
      <Dialog open={cameraOpen} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="size-4" />
              Ambil Foto Melalui Webcam
            </DialogTitle>
            <DialogDescription className="text-xs">
              Arahkan kamera ke permukaan ban yang ingin dianalisis, lalu klik "Ambil Foto".
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
            <video ref={cameraRef} autoPlay playsInline muted className="size-full object-cover" />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closeCamera} className="text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={captureWebcamPhoto}
              className="text-xs gap-1.5 bg-[#003461] hover:bg-[#002647] text-white"
            >
              <Camera className="size-3.5" />
              Ambil Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
