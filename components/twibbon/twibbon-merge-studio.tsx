'use client'

import * as React from 'react'
import {
  Check,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Move,
  RotateCcw,
  Share2,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'

import { incrementTwibbonUsageAction } from '@/app/actions/twibbon'
import { Button } from '@/components/ui/button'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  clampNumber,
  computeCoverDrawRect,
  getAvailableRatios,
  getTemplateFrameUrl,
  TWIBBON_ASPECT_RATIOS,
  TWIBBON_MAX_VIDEO_BYTES,
  TWIBBON_MAX_VIDEO_SECONDS,
  type TwibbonAspectRatio,
  type TwibbonTemplateDTO,
} from '@/lib/twibbon'
import { cn } from '@/lib/utils'

interface TwibbonMergeStudioProps {
  template: TwibbonTemplateDTO | null
  compact?: boolean
  onUsageIncremented?: (templateId: number) => void
}

type MediaKind = 'image' | 'video'

export function TwibbonMergeStudio({
  template,
  compact = false,
  onUsageIncremented,
}: TwibbonMergeStudioProps) {
  const availableRatios = React.useMemo(
    () => (template ? getAvailableRatios(template) : []),
    [template]
  )

  const [aspectRatio, setAspectRatio] = React.useState<TwibbonAspectRatio>('1:1')
  const [mediaKind, setMediaKind] = React.useState<MediaKind | null>(null)
  const [mediaFile, setMediaFile] = React.useState<File | null>(null)
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null)
  const [mediaSize, setMediaSize] = React.useState<{ width: number; height: number } | null>(null)
  const [videoDuration, setVideoDuration] = React.useState<number>(0)

  const [zoom, setZoom] = React.useState<number>(1)
  const [panX, setPanX] = React.useState<number>(0)
  const [panY, setPanY] = React.useState<number>(0)
  const [isMuted, setIsMuted] = React.useState<boolean>(true)

  const [mergedImageUrl, setMergedImageUrl] = React.useState<string | null>(null)
  const [mergedImageBlob, setMergedImageBlob] = React.useState<Blob | null>(null)
  const [isMergingImage, setIsMergingImage] = React.useState(false)

  const [mergedVideoUrl, setMergedVideoUrl] = React.useState<string | null>(null)
  const [mergedVideoBlob, setMergedVideoBlob] = React.useState<Blob | null>(null)
  const [isMergingVideo, setIsMergingVideo] = React.useState(false)

  const [copiedCaption, setCopiedCaption] = React.useState(false)
  const [copiedLink, setCopiedLink] = React.useState(false)

  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef<{
    active: boolean
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  })
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Keep selected aspect ratio valid when template changes
  React.useEffect(() => {
    if (availableRatios.length === 0) return
    if (!availableRatios.includes(aspectRatio)) {
      setAspectRatio(availableRatios[0])
    }
  }, [availableRatios, aspectRatio])

  // Cleanup object URLs on change/unmount
  React.useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl)
    }
  }, [mediaUrl])

  React.useEffect(() => {
    return () => {
      if (mergedImageUrl) URL.revokeObjectURL(mergedImageUrl)
    }
  }, [mergedImageUrl])

  React.useEffect(() => {
    return () => {
      if (mergedVideoUrl) URL.revokeObjectURL(mergedVideoUrl)
    }
  }, [mergedVideoUrl])

  const frameRawUrl = template ? getTemplateFrameUrl(template, aspectRatio) : null
  const frameUrl = frameRawUrl ? resolveUploadUrl(frameRawUrl) : null
  const ratioSpec = TWIBBON_ASPECT_RATIOS[aspectRatio]

  const clearMergedOutputs = React.useCallback(() => {
    setMergedImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setMergedImageBlob(null)
    setMergedVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setMergedVideoBlob(null)
  }, [])

  const resetPosition = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
    clearMergedOutputs()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const isVideo =
      file.type.startsWith('video/') ||
      /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(file.name)
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)

    if (!isVideo && !isImage) {
      toast.error('Format file harus berupa Foto (JPG/PNG/WebP) atau Video (MP4/MOV/WebM).')
      return
    }

    if (isVideo && file.size > TWIBBON_MAX_VIDEO_BYTES) {
      toast.error('Ukuran video maksimal 100 MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    clearMergedOutputs()
    setZoom(1)
    setPanX(0)
    setPanY(0)

    if (isImage) {
      const img = new window.Image()
      img.onload = () => {
        setMediaKind('image')
        setMediaFile(file)
        setMediaUrl(objectUrl)
        setMediaSize({ width: img.naturalWidth || 1080, height: img.naturalHeight || 1080 })
        setVideoDuration(0)
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        toast.error('Gambar tidak dapat dibaca. Coba file JPG atau PNG lain.')
      }
      img.src = objectUrl
    } else {
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.onloadedmetadata = () => {
        const dur = Number.isFinite(vid.duration) ? vid.duration : 0
        if (dur > TWIBBON_MAX_VIDEO_SECONDS + 0.5) {
          URL.revokeObjectURL(objectUrl)
          toast.error(
            `Durasi video ${Math.ceil(dur)} detik melebihi batas maksimal ${TWIBBON_MAX_VIDEO_SECONDS} detik.`
          )
          return
        }
        setMediaKind('video')
        setMediaFile(file)
        setMediaUrl(objectUrl)
        setMediaSize({
          width: vid.videoWidth || 1080,
          height: vid.videoHeight || 1080,
        })
        setVideoDuration(dur)
      }
      vid.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        toast.error('Video tidak dapat diputar oleh browser. Gunakan format MP4/MOV/WebM.')
      }
      vid.src = objectUrl
    }
  }

  // Auto-merge image onto high-resolution Canvas whenever image, frame, ratio, zoom, or pan changes
  React.useEffect(() => {
    if (mediaKind !== 'image' || !mediaUrl || !mediaSize || !frameUrl) return

    let cancelled = false
    const timer = setTimeout(async () => {
      setIsMergingImage(true)
      try {
        const [userImg, frameResp] = await Promise.all([
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = mediaUrl
          }),
          fetch(frameUrl, { credentials: 'include' }),
        ])

        if (!frameResp.ok) throw new Error('Gagal memuat frame PNG template.')
        const frameBlob = await frameResp.blob()
        const frameObjUrl = URL.createObjectURL(frameBlob)

        try {
          const frameImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = frameObjUrl
          })

          if (cancelled) return

          const canvas = document.createElement('canvas')
          canvas.width = ratioSpec.width
          canvas.height = ratioSpec.height
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Canvas 2D tidak tersedia.')

          ctx.fillStyle = '#0f172a'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          const rect = computeCoverDrawRect(
            userImg.naturalWidth || mediaSize.width,
            userImg.naturalHeight || mediaSize.height,
            canvas.width,
            canvas.height,
            zoom,
            panX,
            panY
          )

          ctx.drawImage(userImg, rect.drawX, rect.drawY, rect.drawWidth, rect.drawHeight)
          ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height)

          const outBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/png', 0.96)
          )
          if (!outBlob || cancelled) return

          const outUrl = URL.createObjectURL(outBlob)
          setMergedImageBlob(outBlob)
          setMergedImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return outUrl
          })
        } finally {
          URL.revokeObjectURL(frameObjUrl)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[TwibbonMergeStudio] Canvas merge error:', err)
        }
      } finally {
        if (!cancelled) setIsMergingImage(false)
      }
    }, 90)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mediaKind, mediaUrl, mediaSize, frameUrl, ratioSpec.width, ratioSpec.height, zoom, panX, panY])

  // Pointer drag handlers for pan adjustment
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mediaUrl || !mediaSize) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panX,
      startPanY: panY,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || !stageRef.current || !mediaSize) return
    const box = stageRef.current.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) return

    const rect = computeCoverDrawRect(
      mediaSize.width,
      mediaSize.height,
      box.width,
      box.height,
      zoom,
      0,
      0
    )

    const dx = e.clientX - dragStateRef.current.startX
    const dy = e.clientY - dragStateRef.current.startY

    if (rect.maxOffsetX > 1) {
      const nextPanX = clampNumber(
        dragStateRef.current.startPanX + dx / rect.maxOffsetX,
        -1,
        1
      )
      setPanX(nextPanX)
    }
    if (rect.maxOffsetY > 1) {
      const nextPanY = clampNumber(
        dragStateRef.current.startPanY + dy / rect.maxOffsetY,
        -1,
        1
      )
      setPanY(nextPanY)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.active) {
      dragStateRef.current.active = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const triggerDownloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  const handleDownloadImage = async () => {
    if (!mergedImageBlob || !template) return
    const ratioTag = aspectRatio.replace(':', 'x')
    triggerDownloadBlob(mergedImageBlob, `${template.slug}-${ratioTag}.png`)
    toast.success('Gambar Twibbon berhasil diunduh!')
    await incrementTwibbonUsageAction(template.id)
    onUsageIncremented?.(template.id)
  }

  const handleMergeVideo = async () => {
    if (!template || !mediaFile || mediaKind !== 'video') return
    setIsMergingVideo(true)
    try {
      const formData = new FormData()
      formData.append('video', mediaFile)
      formData.append('templateId', String(template.id))
      formData.append('aspectRatio', aspectRatio)
      formData.append('zoom', String(zoom))
      formData.append('panX', String(panX))
      formData.append('panY', String(panY))

      const response = await fetch('/api/twibbon/merge-video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody?.message || 'Gagal memproses merge video.')
      }

      const outBlob = await response.blob()
      const outUrl = URL.createObjectURL(outBlob)
      setMergedVideoBlob(outBlob)
      setMergedVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return outUrl
      })

      const ratioTag = aspectRatio.replace(':', 'x')
      triggerDownloadBlob(outBlob, `${template.slug}-${ratioTag}.mp4`)
      toast.success('Video Twibbon MP4 berhasil digabung dan diunduh!')
      onUsageIncremented?.(template.id)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menggabungkan video dengan Twibbon.')
    } finally {
      setIsMergingVideo(false)
    }
  }

  const handleShareMerged = async () => {
    if (!template) return
    const blob = mediaKind === 'image' ? mergedImageBlob : mergedVideoBlob
    if (!blob) return

    const ext = mediaKind === 'image' ? 'png' : 'mp4'
    const mime = mediaKind === 'image' ? 'image/png' : 'video/mp4'
    const ratioTag = aspectRatio.replace(':', 'x')
    const file = new File([blob], `${template.slug}-${ratioTag}.${ext}`, { type: mime })

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: template.title,
          text: template.captionText || template.title,
          files: [file],
        })
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
      }
    }

    triggerDownloadBlob(blob, `${template.slug}-${ratioTag}.${ext}`)
    toast.info('Perangkat tidak mendukung Share langsung; file langsung diunduh.')
  }

  const handleCopyCaption = async () => {
    if (!template?.captionText) return
    try {
      await navigator.clipboard.writeText(template.captionText)
      setCopiedCaption(true)
      toast.success('Caption Instagram disalin ke clipboard!')
      setTimeout(() => setCopiedCaption(false), 2000)
    } catch {
      toast.error('Gagal menyalin caption.')
    }
  }

  const handleCopyShareLink = async () => {
    if (!template) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const pathPrefix = compact ? '/mobile/twibbon' : '/dashboard/twibbon'
    const shareUrl = `${origin}${pathPrefix}?template=${encodeURIComponent(template.slug)}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      toast.success('Link template Twibbon disalin!')
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast.error('Gagal menyalin link.')
    }
  }

  // Compute CSS positioning for the live preview stage
  const stageAspectClass =
    aspectRatio === '1:1'
      ? 'aspect-square'
      : aspectRatio === '4:5'
      ? 'aspect-[4/5]'
      : 'aspect-[9/16]'

  const previewDrawStyle = React.useMemo<React.CSSProperties>(() => {
    if (!mediaSize) return {}
    const rect = computeCoverDrawRect(
      mediaSize.width,
      mediaSize.height,
      ratioSpec.width,
      ratioSpec.height,
      zoom,
      panX,
      panY
    )
    return {
      position: 'absolute',
      left: `${(rect.drawX / ratioSpec.width) * 100}%`,
      top: `${(rect.drawY / ratioSpec.height) * 100}%`,
      width: `${(rect.drawWidth / ratioSpec.width) * 100}%`,
      height: `${(rect.drawHeight / ratioSpec.height) * 100}%`,
      maxWidth: 'none',
      maxHeight: 'none',
      pointerEvents: 'none',
      userSelect: 'none',
    }
  }, [mediaSize, ratioSpec.width, ratioSpec.height, zoom, panX, panY])

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
        <Sparkles className="mb-2 size-8 text-blue-600" />
        <p className="text-sm font-bold text-slate-900">Pilih Template Twibbon</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Pilih salah satu template campaign di atas atau buat template PNG baru untuk mulai
          menggabungkan foto &amp; video.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-5',
        compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12 items-start'
      )}
    >
      {/* LEFT / TOP: Interactive Aspect-Ratio Preview Stage */}
      <div
        className={cn(
          'flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs',
          !compact && 'lg:col-span-6'
        )}
      >
        {/* Ratio Selector Pills */}
        <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {availableRatios.map((r) => {
              const spec = TWIBBON_ASPECT_RATIOS[r]
              const active = r === aspectRatio
              return (
                <Button
                  key={r}
                  type="button"
                  size="dense"
                  variant={active ? 'default' : 'outline'}
                  className={cn(
                    'h-9 px-3 text-xs font-semibold',
                    active && 'bg-[#0753e7] hover:bg-[#0645c2] text-white'
                  )}
                  onClick={() => {
                    setAspectRatio(r)
                    clearMergedOutputs()
                  }}
                >
                  {spec.label}
                </Button>
              )
            })}
          </div>

          <span className="text-[11px] font-medium text-slate-400">
            {ratioSpec.width} × {ratioSpec.height}
          </span>
        </div>

        {/* Canvas Stage */}
        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            'relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-inner select-none',
            stageAspectClass,
            aspectRatio === '9:16' ? 'max-w-[270px] sm:max-w-[300px]' : 'max-w-[380px]',
            mediaUrl ? 'cursor-grab active:cursor-grabbing touch-none' : ''
          )}
        >
          {/* Media layer (Photo or Video) */}
          {mediaUrl && mediaKind === 'image' && (
            <img
              src={mediaUrl}
              alt="Foto Pilihan"
              draggable={false}
              style={previewDrawStyle}
            />
          )}

          {mediaUrl && mediaKind === 'video' && (
            <video
              src={mergedVideoUrl || mediaUrl}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              style={mergedVideoUrl ? { width: '100%', height: '100%', objectFit: 'cover' } : previewDrawStyle}
            />
          )}

          {/* Placeholder if no media selected */}
          {!mediaUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 text-center text-white/80">
              <div className="mb-3 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <ImageIcon className="size-3.5" />
                <span>Foto</span>
                <span className="text-white/40">/</span>
                <Film className="size-3.5" />
                <span>Video</span>
              </div>
              <p className="text-xs font-medium text-slate-300">
                Upload foto atau video untuk langsung melihat hasil merge Twibbon
              </p>
            </div>
          )}

          {/* Twibbon PNG Frame Overlay (hidden when playing already-merged MP4) */}
          {frameUrl && !mergedVideoUrl && (
            <img
              src={frameUrl}
              alt={template.title}
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
            />
          )}

          {/* Video Mute/Unmute Floating Pill */}
          {mediaKind === 'video' && mediaUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsMuted((prev) => !prev)
              }}
              className="absolute right-2.5 bottom-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-black/80"
              title={isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          )}
        </div>

        {/* Pan & Zoom Controls when media is loaded */}
        {mediaUrl && (
          <div className="mt-3 w-full max-w-[380px] space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Move className="size-3.5 text-blue-600" />
                Geser foto/video langsung di frame
              </span>
              <span className="font-mono text-slate-700">{zoom.toFixed(2)}×</span>
            </div>

            <div className="flex items-center gap-2.5">
              <ZoomIn className="size-4 shrink-0 text-slate-500" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => {
                  setZoom(Number(e.target.value))
                  if (mergedVideoUrl) {
                    setMergedVideoUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev)
                      return null
                    })
                    setMergedVideoBlob(null)
                  }
                }}
                aria-label="Zoom Media"
                className="h-2 w-full cursor-pointer accent-[#0753e7]"
              />
              <Button
                type="button"
                variant="outline"
                size="dense"
                className="h-9 shrink-0 gap-1 px-2.5 text-xs"
                onClick={resetPosition}
                title="Reset Posisi & Zoom"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT / BOTTOM: Upload Media, Export Actions & Campaign Copy */}
      <div className={cn('space-y-4', !compact && 'lg:col-span-6')}>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  {template.category}
                </span>
                <h3 className="mt-1.5 text-base font-bold text-slate-900">{template.title}</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="dense"
                className="h-9 shrink-0 gap-1.5 text-xs"
                onClick={handleCopyShareLink}
              >
                {copiedLink ? <Check className="size-3.5 text-emerald-600" /> : <Link2 className="size-3.5" />}
                <span>{copiedLink ? 'Tersalin' : 'Copy Link'}</span>
              </Button>
            </div>

            {template.description && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {template.description}
              </p>
            )}
          </div>

          {/* Media Picker Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="space-y-2">
            <Button
              type="button"
              size="dense"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-full gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b]"
            >
              <Upload className="size-4" />
              <span>{mediaFile ? 'Ganti Foto / Video' : 'Pilih Foto atau Video'}</span>
            </Button>
            <p className="text-[11px] text-slate-400">
              Mendukung Foto (JPG, PNG, WebP) dan Video (MP4, MOV, WebM • maks {TWIBBON_MAX_VIDEO_SECONDS} detik / 100 MB).
            </p>
          </div>

          {/* Selected File Summary & Export CTA */}
          {mediaFile && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  {mediaKind === 'image' ? (
                    <ImageIcon className="size-4 shrink-0 text-blue-600" />
                  ) : (
                    <Film className="size-4 shrink-0 text-violet-600" />
                  )}
                  <span className="truncate font-semibold text-slate-800">{mediaFile.name}</span>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {mediaKind === 'video' && videoDuration > 0
                    ? `${Math.round(videoDuration)} dtk`
                    : `${(mediaFile.size / (1024 * 1024)).toFixed(1)} MB`}
                </span>
              </div>

              {mediaKind === 'image' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="dense"
                    disabled={isMergingImage || !mergedImageBlob}
                    onClick={handleDownloadImage}
                    className="h-9 flex-1 gap-1.5 bg-[#0753e7] text-white hover:bg-[#0645c2]"
                  >
                    {isMergingImage ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Menyiapkan Gambar...</span>
                      </>
                    ) : (
                      <>
                        <Download className="size-4" />
                        <span>Download Foto ({ratioSpec.shortLabel})</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="dense"
                    disabled={isMergingImage || !mergedImageBlob}
                    onClick={handleShareMerged}
                    className="h-9 gap-1.5 px-3"
                  >
                    <Share2 className="size-4" />
                    <span>Share</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="dense"
                      disabled={isMergingVideo}
                      onClick={handleMergeVideo}
                      className="h-9 flex-1 gap-1.5 bg-[#0753e7] text-white hover:bg-[#0645c2]"
                    >
                      {isMergingVideo ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Memproses Video MP4...</span>
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          <span>
                            {mergedVideoBlob
                              ? `Download Ulang MP4 (${ratioSpec.shortLabel})`
                              : `Merge & Download Video MP4 (${ratioSpec.shortLabel})`}
                          </span>
                        </>
                      )}
                    </Button>

                    {mergedVideoBlob && (
                      <Button
                        type="button"
                        variant="outline"
                        size="dense"
                        onClick={handleShareMerged}
                        className="h-9 gap-1.5 px-3"
                      >
                        <Share2 className="size-4" />
                        <span>Share</span>
                      </Button>
                    )}
                  </div>

                  {isMergingVideo && (
                    <p className="text-[11px] font-medium text-blue-700">
                      Server sedang menggabungkan video dengan frame PNG &amp; audio asli...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Optional IG Caption Box */}
          {template.captionText && (
            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Caption Instagram Siap Salin
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="dense"
                  className="h-9 gap-1.5 px-3 text-xs"
                  onClick={handleCopyCaption}
                >
                  {copiedCaption ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span>{copiedCaption ? 'Disalin' : 'Salin Caption'}</span>
                </Button>
              </div>
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
                {template.captionText}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
