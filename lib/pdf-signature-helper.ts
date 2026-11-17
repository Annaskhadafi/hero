import { PDFDocument, PDFImage } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

/**
 * Convert any supported image buffer (PNG, JPEG, WebP, SVG, etc.) to a pdf-lib compatible PDFImage
 */
async function embedImageBuffer(
  pdfDoc: PDFDocument,
  rawBuf: Buffer,
  ext?: string
): Promise<PDFImage | null> {
  const cleanExt = (ext || '').toLowerCase()

  // 1. Direct embed if extension is explicitly PNG or JPG
  if (cleanExt === '.png') {
    try {
      return await pdfDoc.embedPng(rawBuf)
    } catch {}
  } else if (cleanExt === '.jpg' || cleanExt === '.jpeg') {
    try {
      return await pdfDoc.embedJpg(rawBuf)
    } catch {}
  }

  // 2. Transcode via sharp to standard PNG (handles WebP, TIFF, SVG, and corrupted headers)
  try {
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default || sharpModule
    const pngBuf = await sharp(rawBuf).png().toBuffer()
    return await pdfDoc.embedPng(pngBuf)
  } catch (sharpErr) {
    // 3. Fallback: direct embedPng then embedJpg
    try {
      return await pdfDoc.embedPng(rawBuf)
    } catch {
      try {
        return await pdfDoc.embedJpg(rawBuf)
      } catch {
        return null
      }
    }
  }
}

/**
 * Reusable helper to safely embed digital signatures or physical asset photos (data URL or local upload file)
 * into a pdf-lib PDFDocument instance.
 */
export async function embedSignatureImage(
  pdfDoc: PDFDocument,
  signatureUrl?: string | null
): Promise<PDFImage | null> {
  if (!signatureUrl || typeof signatureUrl !== 'string') return null
  const trimmed = signatureUrl.trim()
  if (!trimmed) return null

  try {
    if (trimmed.startsWith('data:image/')) {
      const base64Data = trimmed.split(',')[1]
      if (base64Data) {
        const buf = Buffer.from(base64Data, 'base64')
        const mime = trimmed.split(';')[0]?.replace('data:', '') || ''
        const ext = mime.includes('png')
          ? '.png'
          : mime.includes('jpeg') || mime.includes('jpg')
          ? '.jpg'
          : '.webp'
        return await embedImageBuffer(pdfDoc, buf, ext)
      }
    }

    // Local file path candidate in public/uploads
    const cleanPath = trimmed.replace(/^\/api\/uploads\//, '').replace(/^\/uploads\//, '')
    const localCandidates = [
      path.join(process.cwd(), 'public', 'uploads', cleanPath),
      path.join(process.cwd(), 'public', cleanPath),
    ]

    for (const p of localCandidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p)
        const ext = path.extname(p)
        const img = await embedImageBuffer(pdfDoc, buf, ext)
        if (img) return img
      }
    }

    // Remote HTTP / HTTPS URL fallback (e.g. S3 object or proxy endpoint)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 6000)
        const res = await fetch(trimmed, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (res.ok) {
          const ab = await res.arrayBuffer()
          const buf = Buffer.from(ab)
          const img = await embedImageBuffer(pdfDoc, buf)
          if (img) return img
        }
      } catch (remoteErr) {
        console.warn('[embedSignatureImage] Remote fetch failed:', remoteErr)
      }
    }
  } catch (err) {
    console.warn('[embedSignatureImage] Could not embed signature:', err)
  }

  return null
}

/**
 * Reusable helper to safely embed the official PT Chitra Paratama Logo
 */
export async function embedChitraParatamaLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  const logoCandidatePaths = [
    path.join(process.cwd(), 'public', 'cp_logo-removebg-preview.png'),
    path.join(process.cwd(), 'public', 'brand', 'Chitra-Paratama.png'),
    path.join(process.cwd(), 'public', 'images', 'logo-cp.png'),
  ]

  for (const lp of logoCandidatePaths) {
    try {
      if (fs.existsSync(lp)) {
        const bytes = fs.readFileSync(lp)
        return await pdfDoc.embedPng(bytes)
      }
    } catch {}
  }
  return null
}
