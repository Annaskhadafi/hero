import sharp from 'sharp'

import { isS3UploadConfigured, uploadAnyFileToS3 } from '@/lib/s3-storage'
import {
  TWIBBON_ASPECT_RATIOS,
  TWIBBON_MAX_PNG_BYTES,
  type TwibbonAspectRatio,
} from '@/lib/twibbon'

export interface NormalizedTwibbonPngResult {
  url: string
  readableUrl: string
  width: number
  height: number
}

/**
 * Validates and normalizes an uploaded transparent Twibbon frame to exact
 * Instagram pixel dimensions, optimizing large PNG payloads with palette
 * quantization (preserving full 8-bit alpha) so S3 upload finishes quickly.
 */
export async function normalizeAndUploadTwibbonPng(
  file: File,
  ratio: TwibbonAspectRatio,
  options?: { allowClientNormalizedWebp?: boolean }
): Promise<NormalizedTwibbonPngResult> {
  if (!isS3UploadConfigured()) {
    throw new Error('S3 Cloud Storage belum dikonfigurasi. Upload template dibatalkan.')
  }

  const spec = TWIBBON_ASPECT_RATIOS[ratio]
  if (!spec) {
    throw new Error('Rasio ukuran Twibbon tidak valid.')
  }

  if (file.size > TWIBBON_MAX_PNG_BYTES) {
    throw new Error('Ukuran file frame terlalu besar (maksimal 15 MB).')
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer())
  let metadata: {
    format?: string
    width?: number
    height?: number
    hasAlpha?: boolean
    orientation?: number
  }
  try {
    metadata = await sharp(rawBuffer).metadata()
  } catch {
    throw new Error('File tidak terbaca sebagai gambar PNG yang valid.')
  }

  const isAllowedWebpTransport =
    Boolean(options?.allowClientNormalizedWebp) &&
    metadata.format === 'webp' &&
    Boolean(metadata.hasAlpha)

  if (metadata.format !== 'png' && !isAllowedWebpTransport) {
    throw new Error('Template Twibbon wajib berformat PNG (.png) dengan area transparan.')
  }

  const exactDimensionsAndAlpha =
    metadata.format === 'png' &&
    metadata.width === spec.width &&
    metadata.height === spec.height &&
    Boolean(metadata.hasAlpha) &&
    !metadata.orientation

  // Keep tiny exact PNGs untouched; otherwise normalize & optimize with alpha-preserving palette PNG
  let finalBuffer: Buffer
  if (exactDimensionsAndAlpha && rawBuffer.length <= 700 * 1024) {
    finalBuffer = rawBuffer
  } else {
    const pipeline = exactDimensionsAndAlpha
      ? sharp(rawBuffer)
      : sharp(rawBuffer)
          .rotate()
          .resize(spec.width, spec.height, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .ensureAlpha()

    const optimized = await pipeline
      .png({
        palette: true,
        quality: 92,
        effort: 2,
        compressionLevel: 6,
        adaptiveFiltering: false,
      })
      .toBuffer()

    // Use whichever exact-dimension RGBA buffer is smaller when input was already PNG
    finalBuffer =
      exactDimensionsAndAlpha && rawBuffer.length < optimized.length ? rawBuffer : optimized
  }

  const safeFileName = `twibbon-${ratio.replace(':', 'x')}-${Date.now()}.png`
  const normalizedFile = new File([new Uint8Array(finalBuffer)], safeFileName, {
    type: 'image/png',
  })

  const s3Abort =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(55_000)
      : undefined
  const uploaded = await uploadAnyFileToS3(normalizedFile, 'twibbon-templates', s3Abort)
  const proxyUrl = `/api/uploads/${uploaded.key}`

  return {
    url: proxyUrl,
    readableUrl: proxyUrl,
    width: spec.width,
    height: spec.height,
  }
}
