import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type PdfSigner = {
  label: string
  name: string
}

export type PdfSignatureNames = {
  preparedBy: string
  pjoLeader: string
  approvedBy: string
  hrName?: string
  externalPreparedBy?: string
  externalApprovedBy?: string
  customSigners?: PdfSigner[]
  logoUrl?: string
  useExternalOnly?: boolean
  omitExternal?: boolean
}

export async function embedCustomLogo(
  doc: PDFDocument,
  logoUrl?: string
): Promise<{
  image: Awaited<ReturnType<typeof doc.embedPng>> | Awaited<ReturnType<typeof doc.embedJpg>>
  width: number
  height: number
} | null> {
  try {
    if (!logoUrl) return null
    let bytes: Uint8Array
    let isPng = true
    if (logoUrl.startsWith('data:')) {
      const base64 = logoUrl.split(',')[1]
      bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      isPng = logoUrl.startsWith('data:image/png')
    } else {
      const response = await fetch(logoUrl)
      if (!response.ok) return null
      bytes = new Uint8Array(await response.arrayBuffer())
      isPng = logoUrl.toLowerCase().includes('.png')
    }
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
    const scale = 50 / image.height
    return { image, width: image.width * scale, height: 50 }
  } catch {
    return null
  }
}

export function drawPdfSignatures(
  page: PDFPage,
  fonts: { regular: PDFFont; italic: PDFFont },
  y: number,
  names: PdfSignatureNames
) {
  let labels: [string, string][] = []

  if (names.useExternalOnly) {
    labels = [
      ['Dibuat oleh :', names.externalPreparedBy?.trim() || names.preparedBy || '-'],
      ['Approved by:', names.externalApprovedBy?.trim() || names.approvedBy || '-'],
    ]
  } else {
    labels = [
      ['Dibuat oleh :', names.preparedBy || '-'],
      ['Approved by:', names.pjoLeader || '-'],
      ['Approved by:', names.approvedBy || '-'],
      ['Diketahui oleh:', names.hrName || ''],
    ]

    if (!names.omitExternal) {
      if (names.externalPreparedBy?.trim()) {
        labels.push(['Dibuat oleh (Eksternal):', names.externalPreparedBy.trim()])
      }
      if (names.externalApprovedBy?.trim()) {
        labels.push(['Approved by (SPV Eksternal):', names.externalApprovedBy.trim()])
      }
      if (names.customSigners && names.customSigners.length > 0) {
        names.customSigners
          .filter((s) => s.label.trim() && s.name.trim())
          .forEach((s) => labels.push([s.label.trim(), s.name.trim()]))
      }
    }
  }

  const { width } = page.getSize()
  const isTwoSigners = labels.length === 2
  const columnWidth = isTwoSigners ? 220 : (width - 80) / labels.length
  const lineWidth = isTwoSigners ? 180 : columnWidth - 20

  labels.forEach(([label, name], index) => {
    const x = isTwoSigners
      ? index === 0
        ? 60
        : width - 60 - lineWidth
      : 40 + index * columnWidth

    page.drawText(label, { x, y, font: fonts.italic, size: 8, color: rgb(0.3, 0.3, 0.3) })
    page.drawLine({
      start: { x, y: y - 55 },
      end: { x: x + lineWidth, y: y - 55 },
      color: rgb(0.5, 0.5, 0.5),
      thickness: 0.5,
    })
    page.drawText(name || '-', {
      x,
      y: y - 70,
      font: fonts.regular,
      size: 7,
      maxWidth: lineWidth,
    })
  })
}
