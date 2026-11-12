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
 * Validates and normalizes an uploaded transparent PNG Twibbon frame to the
 * target Instagram pixel dimensions, skipping heavy server re-compression when
 * the uploaded PNG already matches exact dimensions and alpha channel.
 */
export async function normalizeAndUploadTwibbonPng(
  file: File,
  ratio: TwibbonAspectRatio
): Promise<NormalizedTwibbonPngResult> {
  if (!isS3UploadConfigured()) {
    throw new Error('S3 Cloud Storage belum dikonfigurasi. Upload template dibatalkan.')
  }

  const spec = TWIBBON_ASPECT_RATIOS[ratio]
  if (!spec) {
    throw new Error('Rasio ukuran Twibbon tidak valid.')
  }

  if (file.size > TWIBBON_MAX_PNG_BYTES) {
    throw new Error('Ukuran file PNG maksimal 15 MB.')
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

  if (metadata.format !== 'png') {
    throw new Error('Template Twibbon wajib berformat PNG (.png) dengan area transparan.')
  }

  const alreadyNormalized =
    metadata.width === spec.width &&
    metadata.height === spec.height &&
    Boolean(metadata.hasAlpha) &&
    !metadata.orientation

  const finalBuffer = alreadyNormalized
    ? rawBuffer
    : await sharp(rawBuffer)
        .rotate()
        .resize(spec.width, spec.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha()
        .png({ compressionLevel: 4, adaptiveFiltering: false })
        .toBuffer()

  const safeFileName = `twibbon-${ratio.replace(':', 'x')}-${Date.now()}.png`
  const normalizedFile = new File([new Uint8Array(finalBuffer)], safeFileName, {
    type: 'image/png',
  })

  const uploaded = await uploadAnyFileToS3(normalizedFile, 'twibbon-templates')
  const proxyUrl = `/api/uploads/${uploaded.key}`

  return {
    url: proxyUrl,
    readableUrl: proxyUrl,
    width: spec.width,
    height: spec.height,
  }
}
