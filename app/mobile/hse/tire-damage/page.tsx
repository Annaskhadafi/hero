'use client'

import { useEffect, useState } from 'react'
import { Camera, Download, FileVideo, Loader2, ScanSearch, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

type PredictionResponse = { success?: boolean; result?: unknown; error?: string }
type ProcessingStage = 'idle' | 'optimizing' | 'uploading' | 'analyzing'

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,video/mp4,video/x-msvideo,video/quicktime'
const MAX_IMAGE_DIMENSION = 1600

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
  const loading = stage !== 'idle'

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return
    if (!ACCEPTED_MEDIA.split(',').includes(nextFile.type))
      return toast.error('Gunakan JPG, PNG, WebP, MP4, AVI, atau MOV.')
    const isVideo = nextFile.type.startsWith('video/')
    if (nextFile.size > (isVideo ? 100 : 15) * 1024 * 1024)
      return toast.error(`Maksimal ${isVideo ? 'video 100MB' : 'gambar 15MB'}.`)
    setResult(null)
    setFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))
  }

  async function predict() {
    if (!file) return
    setResult(null)
    let analyzeTimer: ReturnType<typeof setTimeout> | undefined
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
      if (analyzeTimer) window.clearTimeout(analyzeTimer)
      setStage('idle')
    }
  }

  const annotatedUrl = findAnnotatedUrl(result)
  const isVideo = file?.type.startsWith('video/')
  const progress = stage === 'optimizing' ? 30 : stage === 'uploading' ? 60 : 90

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
          capture="environment"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
      </label>

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
