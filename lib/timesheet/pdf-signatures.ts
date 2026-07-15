import { rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type PdfSignatureNames = {
  preparedBy: string
  pjoLeader: string
  approvedBy: string
}

export function drawPdfSignatures(
  page: PDFPage,
  fonts: { regular: PDFFont; italic: PDFFont },
  y: number,
  names: PdfSignatureNames
) {
  const labels = [
    ['Dibuat oleh :', names.preparedBy],
    ['PJO/ Leader :', names.pjoLeader],
    ['Approved by:', names.approvedBy],
  ]
  const { width } = page.getSize()
  const columnWidth = (width - 80) / labels.length

  labels.forEach(([label, name], index) => {
    const x = 40 + index * columnWidth
    page.drawText(label, { x, y, font: fonts.italic, size: 8, color: rgb(0.3, 0.3, 0.3) })
    page.drawLine({
      start: { x, y: y - 55 },
      end: { x: x + columnWidth - 20, y: y - 55 },
      color: rgb(0.5, 0.5, 0.5),
      thickness: 0.5,
    })
    page.drawText(name || '-', {
      x,
      y: y - 70,
      font: fonts.regular,
      size: 7,
      maxWidth: columnWidth - 20,
    })
  })
}
