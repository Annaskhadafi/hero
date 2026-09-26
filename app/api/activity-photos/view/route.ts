import { NextResponse } from 'next/server'
import heicDecode from 'heic-decode'
import sharp from 'sharp'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getS3ObjectForProxy, isS3UploadConfigured } from '@/lib/s3-storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isHeicBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false
  const ftyp = buf.toString('ascii', 4, 8)
  if (ftyp !== 'ftyp') return false
  const brand = buf.toString('ascii', 8, 12).toLowerCase()
  if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)) return true
  const checkLimit = Math.min(buf.length, 36)
  for (let i = 12; i < checkLimit; i += 4) {
    const b = buf.toString('ascii', i, i + 4).toLowerCase()
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(b)) return true
  }
  return false
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get('url')
    const widthParam = searchParams.get('w')

    if (!targetUrl || targetUrl.trim() === '') {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    const trimmedUrl = targetUrl.trim()

    // Security check: disallow dangerous protocols or metadata services
    if (
      trimmedUrl.startsWith('file:') ||
      trimmedUrl.startsWith('ftp:') ||
      trimmedUrl.startsWith('javascript:') ||
      trimmedUrl.includes('169.254.169.254')
    ) {
      return NextResponse.json({ error: 'Invalid URL protocol or host' }, { status: 400 })
    }

    const targetWidth = widthParam && !isNaN(Number(widthParam)) ? Math.min(Number(widthParam), 2560) : null
    const urlHash = crypto.createHash('md5').update(trimmedUrl).digest('hex')
    const cacheDir = path.join(process.cwd(), 'public', 'uploads', 'cache', 'heic-converted')

    if (!fs.existsSync(cacheDir)) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true })
      } catch (err) {
        console.warn('Could not create cache directory:', err)
      }
    }

    const masterCachePath = path.join(cacheDir, `${urlHash}_master.jpg`)
    const targetCachePath = targetWidth
      ? path.join(cacheDir, `${urlHash}_w${targetWidth}.jpg`)
      : masterCachePath

    // 1. Direct hit on requested width
    if (fs.existsSync(targetCachePath)) {
      try {
        const cached = fs.readFileSync(targetCachePath)
        return new NextResponse(new Uint8Array(cached), {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': 'inline',
          },
        })
      } catch (e) {
        console.warn('Error reading cached file:', e)
      }
    }

    // 2. Hit on master converted JPEG (resizing takes only ~15-30ms with sharp native C++)
    if (fs.existsSync(masterCachePath) && targetWidth) {
      try {
        const masterBuf = fs.readFileSync(masterCachePath)
        const resized = await sharp(masterBuf)
          .resize({ width: targetWidth, withoutEnlargement: true })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer()

        try {
          fs.writeFileSync(targetCachePath, resized)
        } catch {}

        return new NextResponse(new Uint8Array(resized), {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': 'inline',
          },
        })
      } catch (e) {
        console.warn('Error resizing from master cache:', e)
      }
    }

    // 3. Cache Miss: Fetch original file
    let inputBuffer: Buffer | null = null
    const lowerUrl = trimmedUrl.toLowerCase().split('?')[0]

    // Step A: If S3 is configured, fetch object via S3 SDK proxy getter (handles private bucket, CloudHost S3 URLs, /api/uploads/ URLs, etc.)
    if (isS3UploadConfigured()) {
      try {
        const s3Obj = await getS3ObjectForProxy(trimmedUrl)
        if (s3Obj?.body) {
          inputBuffer = Buffer.from(s3Obj.body)
        }
      } catch (err) {
        console.warn('S3 proxy fetch error in activity-photos/view:', err)
      }
    }

    // Step B: Check local disk candidate paths
    if (!inputBuffer) {
      const cleanRel = trimmedUrl
        .split('?')[0]
        .replace(/^https?:\/\/[^\/]+/, '')
        .replace(/^\/+/, '')
        .replace(/^api\/uploads\//, '')
        .replace(/^uploads\//, '')
      const fileName = path.basename(cleanRel)

      const candidatePaths = [
        path.join(process.cwd(), 'public', 'uploads', cleanRel),
        path.join(process.cwd(), 'public', 'uploads', 'activity-photos', fileName),
        path.join(process.cwd(), 'public', 'uploads', fileName),
        path.join(process.cwd(), 'public', cleanRel),
        path.join(process.cwd(), 'public', fileName),
      ]

      for (const cp of candidatePaths) {
        if (fs.existsSync(cp)) {
          try {
            inputBuffer = fs.readFileSync(cp)
            break
          } catch {}
        }
      }
    }

    // Step C: Fallback to remote HTTP/HTTPS fetch if not private S3
    if (!inputBuffer && (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://'))) {
      try {
        const fetchRes = await fetch(trimmedUrl, {
          signal: AbortSignal.timeout(25000),
        })
        if (fetchRes.ok) {
          inputBuffer = Buffer.from(await fetchRes.arrayBuffer())
        }
      } catch (err) {
        console.warn('Remote fetch error in activity-photos/view:', err)
      }
    }

    if (!inputBuffer) {
      return NextResponse.json({ error: 'Original file not found' }, { status: 404 })
    }

    // Detect if buffer is HEIC format
    const isHeic = lowerUrl.endsWith('.heic') || lowerUrl.endsWith('.heif') || isHeicBuffer(inputBuffer)

    let masterBuffer: Buffer

    if (isHeic) {
      // Use heic-decode (WASM) to extract RGBA, then sharp (C++ native) to encode JPEG
      const { width, height, data } = await heicDecode({ buffer: inputBuffer })
      masterBuffer = await sharp(Buffer.from(data), {
        raw: { width, height, channels: 4 },
      })
        .resize({ width: 1800, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer()
    } else {
      masterBuffer = await sharp(inputBuffer)
        .resize({ width: 1800, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer()
    }

    // Save master JPEG cache
    try {
      fs.writeFileSync(masterCachePath, masterBuffer)
    } catch (err) {
      console.warn('Could not write master cache:', err)
    }

    // Generate requested target width if smaller than master
    let responseBuffer = masterBuffer
    if (targetWidth && targetWidth < 1800) {
      responseBuffer = await sharp(masterBuffer)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer()

      try {
        fs.writeFileSync(targetCachePath, responseBuffer)
      } catch {}
    }

    return new NextResponse(new Uint8Array(responseBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error: any) {
    console.error('Error in activity-photos/view API:', error)
    return NextResponse.json(
      { error: 'Failed to process image', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
