import { PDFDocument, PDFImage } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

/**
 * Reusable helper to safely embed digital signatures (data URL or local upload file)
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
    if (trimmed.startsWith('data:image/png;base64,')) {
      const base64Data = trimmed.replace(/^data:image\/png;base64,/, '')
      const buf = Buffer.from(base64Data, 'base64')
      return await pdfDoc.embedPng(buf)
    }
    if (trimmed.startsWith('data:image/jpeg;base64,') || trimmed.startsWith('data:image/jpg;base64,')) {
      const base64Data = trimmed.replace(/^data:image\/jpe?g;base64,/, '')
      const buf = Buffer.from(base64Data, 'base64')
      return await pdfDoc.embedJpg(buf)
    }

    // If starts with any other data:image, try embedPng
    if (trimmed.startsWith('data:image/')) {
      const base64Data = trimmed.split(',')[1]
      if (base64Data) {
        const buf = Buffer.from(base64Data, 'base64')
        try {
          return await pdfDoc.embedPng(buf)
        } catch {
          return await pdfDoc.embedJpg(buf)
        }
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
        try {
          if (p.toLowerCase().endsWith('.png')) {
            return await pdfDoc.embedPng(buf)
          } else {
            return await pdfDoc.embedJpg(buf)
          }
        } catch {
          try {
            return await pdfDoc.embedPng(buf)
          } catch {
            return await pdfDoc.embedJpg(buf)
          }
        }
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
