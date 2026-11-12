import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { twibbonTemplates } from '@/db/schema'
import { getServerSession } from '@/lib/auth-session'
import { getS3ObjectForProxy } from '@/lib/s3-storage'
import {
  clampNumber,
  TWIBBON_ASPECT_RATIOS,
  TWIBBON_MAX_VIDEO_BYTES,
  TWIBBON_MAX_VIDEO_SECONDS,
  type TwibbonAspectRatio,
} from '@/lib/twibbon'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const execFileAsync = promisify(execFile)
const JOB_TTL_MS = 15 * 60 * 1000

interface TwibbonVideoJob {
  jobId: string
  ownerKey: string
  templateId: number
  downloadFilename: string
  tempDir: string
  outputPath: string
  status: 'processing' | 'ready' | 'error'
  error?: string
  usageCounted: boolean
  createdAt: number
}

declare global {
  var heroTwibbonVideoJobs: Map<string, TwibbonVideoJob> | undefined
}

function getJobStore(): Map<string, TwibbonVideoJob> {
  if (!globalThis.heroTwibbonVideoJobs) {
    globalThis.heroTwibbonVideoJobs = new Map()
  }
  return globalThis.heroTwibbonVideoJobs
}

function pruneExpiredJobs() {
  const store = getJobStore()
  const now = Date.now()
  for (const [id, job] of store.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) {
      store.delete(id)
      rm(job.tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

function getSessionOwnerKey(session: { user?: { id?: string; email?: string | null } } | null) {
  return (session?.user?.id || session?.user?.email || '').trim().toLowerCase()
}

function sanitizeExtension(fileName: string, mimeType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && ['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi'].includes(ext)) {
    return ext
  }
  if (mimeType.includes('quicktime')) return 'mov'
  if (mimeType.includes('webm')) return 'webm'
  return 'mp4'
}

function parseFrameRate(rawRate: string | undefined): number {
  if (!rawRate || !rawRate.includes('/')) return 30
  const [numStr, denStr] = rawRate.split('/')
  const num = Number(numStr)
  const den = Number(denStr)
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 30
  return num / den
}

async function probeVideoMeta(videoPath: string): Promise<{
  duration: number
  hasVideo: boolean
  fps: number
  audioCodec: string | null
}> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=codec_type,codec_name,avg_frame_rate',
        '-of',
        'json',
        videoPath,
      ],
      { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 }
    )

    const parsed = JSON.parse(stdout || '{}')
    const streams = Array.isArray(parsed?.streams) ? parsed.streams : []
    const videoStream = streams.find((s: any) => s?.codec_type === 'video')
    const audioStream = streams.find((s: any) => s?.codec_type === 'audio')
    const rawDuration = Number(parsed?.format?.duration)
    const duration = Number.isFinite(rawDuration) ? rawDuration : 0

    return {
      duration,
      hasVideo: Boolean(videoStream),
      fps: parseFrameRate(videoStream?.avg_frame_rate),
      audioCodec: audioStream?.codec_name ? String(audioStream.codec_name).toLowerCase() : null,
    }
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error('FFmpeg/FFprobe belum terpasang di server.')
    }
    throw new Error('Video tidak dapat dibaca. Pastikan format video valid (MP4/MOV/WebM).')
  }
}

export async function POST(request: Request) {
  let tempDir: string | null = null

  try {
    pruneExpiredJobs()

    const session = await getServerSession()
    const ownerKey = getSessionOwnerKey(session)
    if (!ownerKey) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null
    const templateId = Number(formData.get('templateId'))
    const rawRatio = String(formData.get('aspectRatio') || '1:1') as TwibbonAspectRatio
    const zoom = clampNumber(Number(formData.get('zoom') ?? 1), 1, 3)
    const panX = clampNumber(Number(formData.get('panX') ?? 0), -1, 1)
    const panY = clampNumber(Number(formData.get('panY') ?? 0), -1, 1)

    const spec = TWIBBON_ASPECT_RATIOS[rawRatio]
    if (!spec) {
      return NextResponse.json({ message: 'Ukuran rasio tidak valid.' }, { status: 400 })
    }
    if (!Number.isFinite(templateId) || templateId <= 0) {
      return NextResponse.json({ message: 'Template Twibbon tidak valid.' }, { status: 400 })
    }
    if (!videoFile) {
      return NextResponse.json({ message: 'File video wajib diunggah.' }, { status: 400 })
    }

    const isVideoMime =
      videoFile.type.startsWith('video/') ||
      /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(videoFile.name)
    if (!isVideoMime) {
      return NextResponse.json(
        { message: 'Format file harus berupa video (MP4, MOV, atau WebM).' },
        { status: 400 }
      )
    }

    if (videoFile.size > TWIBBON_MAX_VIDEO_BYTES) {
      return NextResponse.json({ message: 'Ukuran video maksimal 100 MB.' }, { status: 400 })
    }

    const [template] = await db
      .select()
      .from(twibbonTemplates)
      .where(eq(twibbonTemplates.id, templateId))
      .limit(1)

    if (!template) {
      return NextResponse.json({ message: 'Template Twibbon tidak ditemukan.' }, { status: 404 })
    }

    const frameUrl = template[spec.field]
    if (!frameUrl) {
      return NextResponse.json(
        { message: `Template ini belum memiliki frame PNG untuk ukuran ${spec.label}.` },
        { status: 400 }
      )
    }

    const s3Frame = await getS3ObjectForProxy(frameUrl)
    if (!s3Frame?.body) {
      return NextResponse.json(
        { message: 'Berkas frame PNG template tidak ditemukan di S3 storage.' },
        { status: 404 }
      )
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), 'hero-twibbon-'))
    const inputExt = sanitizeExtension(videoFile.name, videoFile.type)
    const inputVideoPath = path.join(tempDir, `input.${inputExt}`)
    const overlayPngPath = path.join(tempDir, 'overlay.png')
    const outputVideoPath = path.join(tempDir, 'output.mp4')

    const videoBytes = Buffer.from(await videoFile.arrayBuffer())
    await Promise.all([
      writeFile(inputVideoPath, videoBytes),
      writeFile(overlayPngPath, Buffer.from(s3Frame.body)),
    ])

    const meta = await probeVideoMeta(inputVideoPath)
    if (!meta.hasVideo) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      return NextResponse.json(
        { message: 'File tidak memiliki stream video yang valid.' },
        { status: 400 }
      )
    }
    if (meta.duration > TWIBBON_MAX_VIDEO_SECONDS + 0.5) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      return NextResponse.json(
        {
          message: `Durasi video (${Math.ceil(meta.duration)} detik) melebihi batas maksimal ${TWIBBON_MAX_VIDEO_SECONDS} detik.`,
        },
        { status: 400 }
      )
    }

    const safeFileSlug = (template.slug || 'twibbon').replace(/[^a-z0-9-_]/gi, '-')
    const ratioTag = rawRatio.replace(':', 'x')
    const jobId = randomUUID()
    const job: TwibbonVideoJob = {
      jobId,
      ownerKey,
      templateId,
      downloadFilename: `${safeFileSlug}-${ratioTag}.mp4`,
      tempDir,
      outputPath: outputVideoPath,
      status: 'processing',
      usageCounted: false,
      createdAt: Date.now(),
    }
    getJobStore().set(jobId, job)

    // Keep tempDir alive while background FFmpeg encodes
    const activeTempDir = tempDir
    tempDir = null

    const W = spec.width
    const H = spec.height
    const fpsPrefix = meta.fps > 32 ? 'fps=30,' : ''
    const filterComplex =
      `[0:v]${fpsPrefix}scale=w='ceil(iw*max(${W}/iw\\,${H}/ih)*${zoom}/2)*2':h='ceil(ih*max(${W}/iw\\,${H}/ih)*${zoom}/2)*2':flags=fast_bilinear,` +
      `crop=w=${W}:h=${H}:x='(iw-${W})/2-(${panX})*(iw-${W})/2':y='(ih-${H})/2-(${panY})*(ih-${H})/2',` +
      `setsar=1[bg];[1:v]scale=${W}:${H}:flags=fast_bilinear,format=rgba[ovr];[bg][ovr]overlay=0:0:format=auto,format=yuv420p[vout]`

    const audioArgs =
      meta.audioCodec === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '128k']

    void execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i',
        inputVideoPath,
        '-i',
        overlayPngPath,
        '-t',
        String(TWIBBON_MAX_VIDEO_SECONDS),
        '-filter_complex',
        filterComplex,
        '-map',
        '[vout]',
        '-map',
        '0:a?',
        '-c:v',
        'libx264',
        '-preset',
        'superfast',
        '-crf',
        '24',
        '-threads',
        '0',
        ...audioArgs,
        '-movflags',
        '+faststart',
        outputVideoPath,
      ],
      { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 }
    )
      .then(() => {
        job.status = 'ready'
      })
      .catch(async (err: any) => {
        console.error('[api/twibbon/merge-video] FFmpeg job failed:', err)
        job.status = 'error'
        job.error = err?.message || 'Gagal menggabungkan video dengan frame Twibbon.'
        await rm(activeTempDir, { recursive: true, force: true }).catch(() => {})
      })

    return NextResponse.json(
      {
        jobId,
        status: 'processing',
      },
      { status: 202 }
    )
  } catch (error: any) {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
    console.error('[api/twibbon/merge-video] Error:', error)
    const msg = error?.message || 'Gagal menggabungkan video dengan frame Twibbon.'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    pruneExpiredJobs()

    const session = await getServerSession()
    const ownerKey = getSessionOwnerKey(session)
    if (!ownerKey) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')?.trim()
    const shouldDownload = searchParams.get('download') === '1'

    if (!jobId) {
      return NextResponse.json({ message: 'Parameter jobId wajib diisi.' }, { status: 400 })
    }

    const job = getJobStore().get(jobId)
    if (!job || job.ownerKey !== ownerKey) {
      return NextResponse.json({ message: 'Job merge video tidak ditemukan.' }, { status: 404 })
    }

    if (!shouldDownload) {
      return NextResponse.json(
        {
          jobId: job.jobId,
          status: job.status,
          error: job.error ?? null,
        },
        { status: 200 }
      )
    }

    if (job.status === 'error') {
      return NextResponse.json(
        { message: job.error || 'Gagal menggabungkan video dengan frame Twibbon.' },
        { status: 500 }
      )
    }

    if (job.status !== 'ready') {
      return NextResponse.json({ message: 'Video masih sedang diproses.' }, { status: 409 })
    }

    const mergedBuffer = await readFile(job.outputPath)

    if (!job.usageCounted) {
      job.usageCounted = true
      await db
        .update(twibbonTemplates)
        .set({
          usageCount: sql`${twibbonTemplates.usageCount} + 1`,
        })
        .where(eq(twibbonTemplates.id, job.templateId))
    }

    getJobStore().delete(jobId)
    await rm(job.tempDir, { recursive: true, force: true }).catch(() => {})

    return new NextResponse(new Uint8Array(mergedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': mergedBuffer.byteLength.toString(),
        'Content-Disposition': `attachment; filename="${job.downloadFilename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[api/twibbon/merge-video GET] Error:', error)
    return NextResponse.json(
      { message: error?.message || 'Gagal mengambil hasil video Twibbon.' },
      { status: 500 }
    )
  }
}
