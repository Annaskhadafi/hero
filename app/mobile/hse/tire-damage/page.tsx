'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  Camera,
  Check,
  Download,
  FileVideo,
  Loader2,
  ScanSearch,
  Sparkles,
  Timer,
  ThumbsDown,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type PredictionResponse = { success?: boolean; result?: unknown; error?: string }
type ProcessingStage = 'idle' | 'optimizing' | 'uploading' | 'analyzing'
type DamageDetail = { label: string; confidence: number | null }
type FeedbackChoice = 'accurate' | 'inaccurate'
type FeedbackAnnotation = { shape: 'rectangle'; label: string; x: number; y: number; width: number; height: number }

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,video/mp4,video/x-msvideo,video/quicktime'
const MAX_IMAGE_DIMENSION = 1600
const TIRE_DAMAGE_LABELS = [
  'cut', 'crack', 'sidewall separation', 'bulging', 'chunking', 'chipping', 'lifting', 'damage',
  'cut separation', 'iron_puncture', 'worn in to ply', 'worn out', 'tread cut separation',
  'casing ply separation', 'impact', 'patchy wear', 'burnt tire', 'lug tiring/tread chunking',
  'tread lifting', 'foreign object/puncture', 'chafer separation', 'accidental damage',
  'belt edge separation', 'sidewall damage/sodewall crack', 'shoulder separation', 'center wear',
  'tread chipping', 'radial crack', 'repair failure', 'bead damage/cracking/leaking',
  'electrical discharge', 'liner/tube/rust band failure', 'heat separation',
] as const

function findPredictionMetadata(value: unknown): { predictionId: string | null; modelVersion: string | null; width: number | null; height: number | null; sourceRecordId: string | null } {
  if (!value || typeof value !== 'object') return { predictionId: null, modelVersion: null, width: null, height: null, sourceRecordId: null }
  const object = value as Record<string, unknown>
  const predictionId = [object.prediction_id, object.predictionId].find((item) => typeof item === 'string') as string | undefined
  const modelVersion = [object.model_version, object.modelVersion, object.version, object.model].find((item) => typeof item === 'string') as string | undefined
  const width = [object.image_width, object.width].find((item) => typeof item === 'number') as number | undefined
  const height = [object.image_height, object.height].find((item) => typeof item === 'number') as number | undefined
  const sourceRecordId = [object.source_record_id, object.id].find((item) => typeof item === 'string') as string | undefined
  const direct = { predictionId: predictionId ?? null, modelVersion: modelVersion ?? null, width: width ?? null, height: height ?? null, sourceRecordId: sourceRecordId ?? null }
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
  for (const key of [
    'annotated_url',
    'annotated_image_url',
    'annotated_image',
    'image_url',
    'output_url',
  ]) {
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
    : 'tidak ada detail kerusakan terstruktur dari Vision AI'

  return `Saya baru selesai deteksi kerusakan ban. Hasil Vision AI: ${findings}. Jelaskan kemungkinan penyebab, risiko operasional, langkah penanganan aman segera, solusi perbaikan, dan pencegahannya. Tandai bila perlu inspeksi teknisi. Hasil deteksi bukan diagnosis final.`
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
    canvas.toBlob(resolve, 'image/jpeg', 0.82)
  )
  return blob
    ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
    : file
}

export default function MobileTireDamagePage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 })
  const [feedbackChoice, setFeedbackChoice] = useState<FeedbackChoice | null>(null)
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [feedbackLabel, setFeedbackLabel] = useState<(typeof TIRE_DAMAGE_LABELS)[number]>('crack')
  const [feedbackBox, setFeedbackBox] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [canProvideFeedback, setCanProvideFeedback] = useState(false)
  const [feedbackDragStart, setFeedbackDragStart] = useState<{ x: number; y: number } | null>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loading = stage !== 'idle'

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])
  useEffect(() => {
    void fetch('/api/mobile/tire-damage/feedback', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<{ canEdit?: boolean }> : null)
      .then((payload) => setCanProvideFeedback(payload?.canEdit === true))
      .catch(() => setCanProvideFeedback(false))
  }, [])

  useEffect(() => {
    if (cameraRef.current && cameraStream) cameraRef.current.srcObject = cameraStream
  }, [cameraStream])
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraStream(null)
    setCameraOpen(false)
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia)
      return toast.error('Kamera tidak didukung di perangkat ini.')
    try {
      closeCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setCameraStream(stream)
      setCameraOpen(true)
    } catch {
      toast.error('Kamera tidak dapat dibuka. Izinkan akses kamera lalu coba lagi.')
    }
  }

  function capturePhoto() {
    const video = cameraRef.current
    if (!video?.videoWidth || !video.videoHeight) return toast.error('Kamera belum siap.')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return toast.error('Gagal mengambil foto.')
        chooseFile(new File([blob], `foto-ban-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        closeCamera()
      },
      'image/jpeg',
      0.9
    )
  }

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return
    if (!ACCEPTED_MEDIA.split(',').includes(nextFile.type))
      return toast.error('Gunakan JPG, PNG, WebP, MP4, AVI, atau MOV.')
    const isVideo = nextFile.type.startsWith('video/')
    if (nextFile.size > (isVideo ? 100 : 15) * 1024 * 1024)
      return toast.error(`Maksimal ${isVideo ? 'video 100MB' : 'gambar 15MB'}.`)
    setResult(null)
    setFeedbackChoice(null)
    setFeedbackSent(false)
    setFeedbackNotes('')
    setFeedbackBox({ x: 0, y: 0, width: 0, height: 0 })
    setFeedbackDragStart(null)
    setFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))
    if (nextFile.type.startsWith('image/')) {
      void createImageBitmap(nextFile).then((bitmap) => {
        setImageDimensions({ width: bitmap.width, height: bitmap.height })
        bitmap.close()
      }).catch(() => undefined)
    }
  }

  async function predict() {
    if (!file) return
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
      formData.append('conf_threshold', '0.25')
      formData.append('iou_threshold', '0.45')
      setStage('uploading')
      analyzeTimer = window.setTimeout(() => setStage('analyzing'), 700)
      const response = await fetch('/api/mobile/tire-damage/predict', {
        method: 'POST',
        body: formData,
      })
      window.clearTimeout(analyzeTimer)
      const payload = (await response.json()) as PredictionResponse
      if (!response.ok || !payload.success)
        throw new Error(payload.error || 'Deteksi kerusakan gagal.')
      setResult(payload.result)
      toast.success('Deteksi selesai.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Deteksi kerusakan gagal.')
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
  const progress = stage === 'optimizing' ? 30 : stage === 'uploading' ? 60 : 90

  async function submitFeedback(choice: FeedbackChoice) {
    if (!predictionMetadata.predictionId || feedbackSending) return toast.error('ID prediksi tidak tersedia.')
    if (choice === 'inaccurate' && (feedbackBox.width <= 0 || feedbackBox.height <= 0)) {
      return toast.error('Tarik kotak pada area kerusakan terlebih dahulu.')
    }
    setFeedbackChoice(choice)
    setFeedbackSending(true)
    try {
      const response = await fetch('/api/mobile/tire-damage/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_id: predictionMetadata.predictionId,
          feedback: choice,
          notes: feedbackNotes,
          model_version: predictionMetadata.modelVersion,
          source_record_id: predictionMetadata.sourceRecordId,
          idempotency_key: `tire-feedback-${predictionMetadata.predictionId}`,
          image_width: predictionMetadata.width ?? imageDimensions.width,
          image_height: predictionMetadata.height ?? imageDimensions.height,
          annotations: choice === 'inaccurate' ? [{ shape: 'rectangle', label: feedbackLabel, ...feedbackBox } satisfies FeedbackAnnotation] : [],
        }),
      })
      const payload = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Feedback gagal dikirim.')
      setFeedbackSent(true)
      toast.success('Feedback tersimpan.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Feedback gagal dikirim.')
    } finally {
      setFeedbackSending(false)
    }
  }

  function feedbackPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    }
  }

  function startFeedbackBox(event: ReactPointerEvent<HTMLDivElement>) {
    const point = feedbackPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    setFeedbackDragStart(point)
    setFeedbackBox({ x: point.x, y: point.y, width: 0.01, height: 0.01 })
  }

  function moveFeedbackBox(event: ReactPointerEvent<HTMLDivElement>) {
    if (!feedbackDragStart) return
    const point = feedbackPoint(event)
    setFeedbackBox({
      x: Math.min(feedbackDragStart.x, point.x),
      y: Math.min(feedbackDragStart.y, point.y),
      width: Math.max(0.01, Math.abs(point.x - feedbackDragStart.x)),
      height: Math.max(0.01, Math.abs(point.y - feedbackDragStart.y)),
    })
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="px-1 pt-1">
        <h1 className="text-xl leading-tight font-black text-[#082033]">
          Pendeteksi Kerusakan Ban
        </h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Unggah satu foto atau video ban untuk analisis AI.
        </p>
      </div>

      <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#bcd6e7] bg-white p-5 text-center shadow-[0_8px_24px_rgba(8,32,51,0.06)]">
        {previewUrl ? (
          isVideo ? (
            <video
              src={previewUrl}
              className="max-h-64 w-full rounded-xl object-contain"
              controls
            />
          ) : (
            <img
              src={previewUrl}
              alt="Pratinjau ban"
              className="max-h-64 w-full rounded-xl object-contain"
            />
          )
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#eaf4fb] text-[#003f78]">
              <Camera className="size-6" />
            </span>
            <span className="mt-3 text-sm font-black text-[#082033]">
              Ambil foto atau pilih file
            </span>
            <span className="mt-1 text-xs font-semibold text-[#486275]">
              JPG, PNG, WebP, MP4, AVI, MOV
            </span>
          </>
        )}
        <input
          className="hidden"
          type="file"
          accept={ACCEPTED_MEDIA}
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
      </label>

      <button
        type="button"
        onClick={() => void openCamera()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#eaf4fb] px-4 text-sm font-black text-[#003f78]"
      >
        <Camera className="size-4" /> Gunakan Kamera
      </button>

      {cameraOpen ? (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(8,32,51,0.06)]">
          <video
            ref={cameraRef}
            autoPlay
            playsInline
            muted
            className="max-h-80 w-full rounded-xl bg-slate-950 object-cover"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeCamera}
              className="min-h-12 rounded-xl bg-slate-100 text-sm font-black text-[#486275]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="min-h-12 rounded-xl bg-[#003f78] text-sm font-black text-white"
            >
              Ambil Foto
            </button>
          </div>
        </section>
      ) : null}

      {file ? (
        <div className="flex items-center justify-between rounded-xl bg-[#eaf4fb] px-3 py-2.5 text-xs font-bold text-[#153249]">
          <span className="flex min-w-0 items-center gap-2 truncate">
            {isVideo ? (
              <FileVideo className="size-4 shrink-0" />
            ) : (
              <Upload className="size-4 shrink-0" />
            )}
            {file.name}
          </span>
          <button
            type="button"
            onClick={() => {
              setFile(null)
              setPreviewUrl(null)
              setResult(null)
            }}
            aria-label="Hapus file"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!file || loading}
        onClick={() => void predict()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003f78] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(0,63,120,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
        {loading ? 'Proses deteksi berjalan...' : 'Deteksi Kerusakan'}
      </button>

      {loading ? (
        <div className="rounded-xl bg-[#eaf4fb] p-3" role="status">
          <p className="text-xs font-black text-[#082033]">
            {stage === 'optimizing'
              ? 'Menyiapkan foto agar unggah lebih cepat'
              : stage === 'uploading'
                ? 'Mengirim file dengan aman ke Vision AI'
                : 'Vision AI sedang mencari kerusakan ban'}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[9px] font-bold text-[#486275]">
            <span className={stage === 'optimizing' ? 'text-[#003f78]' : ''}>1. Siapkan</span>
            <span className={stage === 'uploading' ? 'text-[#003f78]' : ''}>2. Kirim</span>
            <span className={stage === 'analyzing' ? 'text-[#003f78]' : ''}>3. Analisis</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#c9dfed]">
            <div
              className="h-full rounded-full bg-[#003f78] transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 animate-pulse space-y-2" aria-hidden="true">
            <div className="h-3 w-2/5 rounded bg-white/80" />
            <div className="h-28 rounded-xl bg-white/65" />
            <div className="h-3 w-3/4 rounded bg-white/80" />
          </div>
        </div>
      ) : null}

      {result ? (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(8,32,51,0.06)]">
          <h2 className="text-sm font-black text-[#082033]">Hasil Deteksi</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#eaf4fb] px-3 py-2.5">
              <span className="flex items-center gap-1 text-[10px] font-black tracking-wide text-[#486275] uppercase">
                <Timer className="size-3" /> Waktu
              </span>
              <p className="mt-1 text-sm font-black text-[#082033]">
                {elapsedSeconds ? `${elapsedSeconds} dtk` : '-'}
              </p>
            </div>
            <div className="rounded-xl bg-[#eaf4fb] px-3 py-2.5">
              <span className="text-[10px] font-black tracking-wide text-[#486275] uppercase">
                Luka terdeteksi
              </span>
              <p className="mt-1 text-sm font-black text-[#082033]">{damageDetails.length}</p>
            </div>
          </div>
          {damageDetails.length ? (
            <div className="space-y-2">
              <p className="text-[10px] font-black tracking-wide text-[#486275] uppercase">
                Detail luka
              </p>
              {damageDetails.map((damage, index) => (
                <div
                  key={`${damage.label}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-[#f5f7fb] px-3 py-2.5 text-sm"
                >
                  <span className="font-bold text-[#082033]">{damage.label}</span>
                  <span className="font-black text-[#003f78]">
                    {damage.confidence === null ? '-' : `${Math.round(damage.confidence * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold text-[#486275]">
              Model tidak mengirim detail luka terstruktur.
            </p>
          )}
          <a
            href={`/mobile/hero-genius?mode=tire-specialist&q=${encodeURIComponent(geniusPrompt)}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#eef2ff] px-4 text-sm font-black text-[#3730a3]"
          >
            <Sparkles className="size-4" /> Tanya HERO Genius
          </a>
          {canProvideFeedback ? <div className="space-y-2 rounded-xl bg-[#f5f7fb] p-3">
            <p className="text-xs font-black text-[#082033]">Apakah hasil ini akurat?</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={feedbackSending || feedbackSent} onClick={() => void submitFeedback('accurate')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-xs font-black text-emerald-700 disabled:opacity-50"><Check className="size-4" /> Akurat</button>
              <button type="button" disabled={feedbackSending || feedbackSent} onClick={() => setFeedbackChoice('inaccurate')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-50 text-xs font-black text-amber-700 disabled:opacity-50"><ThumbsDown className="size-4" /> Tidak akurat</button>
            </div>
            {feedbackChoice === 'inaccurate' && !feedbackSent ? (
              <div className="space-y-2 pt-1">
                <select value={feedbackLabel} onChange={(event) => setFeedbackLabel(event.target.value as (typeof TIRE_DAMAGE_LABELS)[number])} className="min-h-11 w-full rounded-xl bg-white px-3 text-xs font-bold text-[#082033]">
                  {TIRE_DAMAGE_LABELS.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
                {previewUrl && !isVideo ? (
                  <div className="relative mx-auto inline-block max-w-full touch-none overflow-hidden rounded-xl bg-slate-100" onPointerDown={startFeedbackBox} onPointerMove={moveFeedbackBox} onPointerUp={() => setFeedbackDragStart(null)}>
                    <img src={previewUrl} alt="Area koreksi anotasi" className="block max-h-64 max-w-full object-contain" />
                    <div className="pointer-events-none absolute border-2 border-amber-500 bg-amber-300/20" style={{ left: `${feedbackBox.x * 100}%`, top: `${feedbackBox.y * 100}%`, width: `${feedbackBox.width * 100}%`, height: `${feedbackBox.height * 100}%` }} />
                    <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-white">Tarik kotak pada area kerusakan</span>
                  </div>
                ) : null}
                <div className="grid grid-cols-4 gap-1">
                  {(['x', 'y', 'width', 'height'] as const).map((key) => <input key={key} type="number" min="0" max="1" step="0.01" aria-label={key} value={feedbackBox[key]} onChange={(event) => setFeedbackBox((box) => ({ ...box, [key]: Number(event.target.value) }))} className="min-h-10 w-full rounded-lg bg-white px-2 text-xs" />)}
                </div>
                <textarea value={feedbackNotes} onChange={(event) => setFeedbackNotes(event.target.value)} maxLength={2000} placeholder="Catatan koreksi (opsional)" className="min-h-16 w-full rounded-xl bg-white px-3 py-2 text-xs" />
                <button type="button" disabled={feedbackSending} onClick={() => void submitFeedback('inaccurate')} className="min-h-11 w-full rounded-xl bg-[#003f78] text-xs font-black text-white disabled:opacity-50">{feedbackSending ? 'Mengirim...' : 'Kirim koreksi'}</button>
              </div>
            ) : null}
            {feedbackSent ? <p className="text-xs font-bold text-emerald-700">Terima kasih, feedback sudah dikirim.</p> : null}
          </div> : null}
          {annotatedUrl ? (
            <>
              <img
                src={annotatedUrl}
                alt="Hasil anotasi kerusakan ban"
                className="w-full rounded-xl"
              />
              <a
                href={`/api/mobile/tire-damage/download?url=${encodeURIComponent(annotatedUrl)}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#eaf4fb] px-4 text-sm font-black text-[#003f78]"
              >
                <Download className="size-4" /> Unduh Gambar
              </a>
            </>
          ) : (
            <p className="text-sm font-semibold text-[#486275]">
              Gambar hasil anotasi tidak tersedia.
            </p>
          )}
        </section>
      ) : null}
    </div>
  )
}
