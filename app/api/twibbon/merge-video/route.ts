import { execFile } from 'node:child_process'
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

function sanitizeExtension(fileName: string, mimeType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && ['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi'].includes(ext)) {
    return ext
  }
  if (mimeType.includes('quicktime')) return 'mov'
  if (mimeType.includes('webm')) return 'webm'
  return 'mp4'
}

async function probeVideoMeta(videoPath: string): Promise<{ duration: number; hasVideo: boolean }> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=codec_type',
        '-of',
        'json',
        videoPath,
      ],
      { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 }
    )

    const parsed = JSON.parse(stdout || '{}')
    const streams = Array.isArray(parsed?.streams) ? parsed.streams : []
    const hasVideo = streams.some((s: any) => s?.codec_type === 'video')
    const rawDuration = Number(parsed?.format?.duration)
    const duration = Number.isFinite(rawDuration) ? rawDuration : 0

    return { duration, hasVideo }
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
    const session = await getServerSession()
    if (!session?.user?.id && !session?.user?.email) {
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
      return NextResponse.json(
        { message: 'Ukuran video maksimal 100 MB.' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { message: 'File tidak memiliki stream video yang valid.' },
        { status: 400 }
      )
    }
    if (meta.duration > TWIBBON_MAX_VIDEO_SECONDS + 0.5) {
      return NextResponse.json(
        {
          message: `Durasi video (${Math.ceil(meta.duration)} detik) melebihi batas maksimal ${TWIBBON_MAX_VIDEO_SECONDS} detik.`,
        },
        { status: 400 }
      )
    }

    const W = spec.width
    const H = spec.height
    const filterComplex = [
      `[0:v]scale=w='ceil(iw*max(${W}/iw\\,${H}/ih)*${zoom}/2)*2':h='ceil(ih*max(${W}/iw\\,${H}/ih)*${zoom}/2)*2'`,
      `crop=w=${W}:h=${H}:x='(iw-${W})/2-(${panX})*(iw-${W})/2':y='(ih-${H})/2-(${panY})*(ih-${H})/2'`,
      `setsar=1[bg]`,
    ].join(',') + `;[1:v]scale=${W}:${H},format=rgba[ovr];[bg][ovr]overlay=0:0:format=auto,format=yuv420p[vout]`

    await execFileAsync(
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
        'veryfast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        outputVideoPath,
      ],
      { timeout: 110_000, maxBuffer: 10 * 1024 * 1024 }
    )

    const mergedBuffer = await readFile(outputVideoPath)

    await db
      .update(twibbonTemplates)
      .set({
        usageCount: sql`${twibbonTemplates.usageCount} + 1`,
      })
      .where(eq(twibbonTemplates.id, templateId))

    const safeFileSlug = (template.slug || 'twibbon').replace(/[^a-z0-9-_]/gi, '-')
    const ratioTag = rawRatio.replace(':', 'x')

    return new NextResponse(new Uint8Array(mergedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': mergedBuffer.byteLength.toString(),
        'Content-Disposition': `attachment; filename="${safeFileSlug}-${ratioTag}.mp4"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[api/twibbon/merge-video] Error:', error)
    const msg = error?.message || 'Gagal menggabungkan video dengan frame Twibbon.'
    return NextResponse.json({ message: msg }, { status: 500 })
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}
