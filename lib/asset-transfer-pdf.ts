import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { embedChitraParatamaLogo, embedSignatureImage } from './pdf-signature-helper'

export interface AssetTransferPdfApprover {
  level: number
  label: string
  approverName: string
  approverJobTitle?: string | null
  status: string
  signedAt?: Date | string | null
  signatureUrl?: string | null
  decisionNote?: string | null
}

export interface AssetTransferPdfData {
  transferNumber: string
  requestDate: Date | string
  applicantName: string
  applicantJobTitle?: string | null
  departmentName?: string | null
  sectionName?: string | null
  applicantSignatureUrl?: string | null

  // Asset
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  assetCategory?: string | null
  equipmentText?: string | null

  // Mutation details
  currentHolderName: string
  currentLocationName: string
  targetHolderName: string
  targetLocationName: string
  reason: string
  notes?: string | null
  assetPhotos?: Array<{ fileName: string; fileUrl: string }> | null
  photoUrl?: string | null

  approvers: AssetTransferPdfApprover[]
}

function formatIndoDate(val?: string | Date | null): string {
  if (!val) return '-'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatIndoDateTime(val?: string | Date | null): string {
  if (!val) return '-'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return String(val)
  const dateStr = d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = d
    .toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(':', '.')
  return `${dateStr} • ${timeStr} WITA`
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text) return []
  const words = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export async function generateAssetTransferPdf(data: AssetTransferPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  // Work Order Reference: A4 Portrait (595.28 x 841.89 pt)
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const darkNavy = rgb(0.08, 0.15, 0.28)
  const textDark = rgb(0.1, 0.12, 0.15)
  const textGray = rgb(0.35, 0.4, 0.45)
  const borderGray = rgb(0.72, 0.77, 0.82)
  const bgLight = rgb(0.95, 0.96, 0.98)
  const goldYellow = rgb(1, 0.84, 0)
  const successGreen = rgb(0.05, 0.48, 0.24)

  const marginX = 35
  const contentW = width - marginX * 2 // 525.28 pt
  let curY = height - 36

  // 1. Header (Logo on Left, Document Title on Right)
  const logo = await embedChitraParatamaLogo(pdfDoc)
  if (logo) {
    page.drawImage(logo, {
      x: marginX,
      y: curY - 34,
      width: 90,
      height: 36,
    })
  }

  const titleX = marginX + 98
  page.drawText('PT. CHITRA PARATAMA', {
    x: titleX,
    y: curY - 12,
    size: 11,
    font: fontBold,
    color: darkNavy,
  })
  page.drawText('TOTAL TIRE SOLUTION • ASSET MUTATION & TRANSFER', {
    x: titleX,
    y: curY - 24,
    size: 7,
    font: fontRegular,
    color: textGray,
  })

  const docTitle = 'BERITA ACARA MUTASI ASET'
  const titleW = fontBold.widthOfTextAtSize(docTitle, 10.5)
  page.drawText(docTitle, {
    x: width - marginX - titleW,
    y: curY - 12,
    size: 10.5,
    font: fontBold,
    color: darkNavy,
  })

  const formNoText = `No: ${data.transferNumber}`
  const formW = fontBold.widthOfTextAtSize(formNoText, 8)
  page.drawText(formNoText, {
    x: width - marginX - formW,
    y: curY - 24,
    size: 8,
    font: fontBold,
    color: textDark,
  })

  const tglText = `Tanggal: ${formatIndoDate(data.requestDate)}`
  const tglW = fontRegular.widthOfTextAtSize(tglText, 7.5)
  page.drawText(tglText, {
    x: width - marginX - tglW,
    y: curY - 34,
    size: 7.5,
    font: fontRegular,
    color: textGray,
  })

  curY -= 44

  page.drawLine({
    start: { x: marginX, y: curY },
    end: { x: width - marginX, y: curY },
    thickness: 1.5,
    color: darkNavy,
  })

  curY -= 10

  // 2. Metadata Grid (Side-by-Side: Pihak Asal vs Pihak Penerima)
  const halfW = (contentW - 10) / 2
  const metaH = 68

  // Box 1: Pihak Asal (Holder Lama)
  page.drawRectangle({
    x: marginX,
    y: curY - metaH,
    width: halfW,
    height: metaH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawText('PIHAK ASAL (PEMEGANG LAMA)', {
    x: marginX + 10,
    y: curY - 14,
    size: 7,
    font: fontBold,
    color: darkNavy,
  })
  page.drawText(`Nama: ${data.currentHolderName}`, {
    x: marginX + 10,
    y: curY - 28,
    size: 8,
    font: fontBold,
    color: textDark,
  })
  page.drawText(`Lokasi Asal: ${data.currentLocationName}`, {
    x: marginX + 10,
    y: curY - 42,
    size: 7.5,
    font: fontRegular,
    color: textGray,
  })
  page.drawText(`Departemen: ${data.departmentName || 'General Operation'}`, {
    x: marginX + 10,
    y: curY - 56,
    size: 7.5,
    font: fontRegular,
    color: textGray,
  })

  // Box 2: Pihak Tujuan (Pemegang Baru)
  const box2X = marginX + halfW + 10
  page.drawRectangle({
    x: box2X,
    y: curY - metaH,
    width: halfW,
    height: metaH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawText('PIHAK PENERIMA (PEMEGANG BARU)', {
    x: box2X + 10,
    y: curY - 14,
    size: 7,
    font: fontBold,
    color: successGreen,
  })
  page.drawText(`Nama: ${data.targetHolderName}`, {
    x: box2X + 10,
    y: curY - 28,
    size: 8,
    font: fontBold,
    color: textDark,
  })
  page.drawText(`Lokasi Tujuan: ${data.targetLocationName}`, {
    x: box2X + 10,
    y: curY - 42,
    size: 7.5,
    font: fontRegular,
    color: textGray,
  })
  page.drawText(`Status Serah Terima: Hak Guna & Fisik Dialihkan`, {
    x: box2X + 10,
    y: curY - 56,
    size: 7.5,
    font: fontRegular,
    color: textGray,
  })

  curY -= metaH + 12

  // 3. Detail Aset
  page.drawText('DETAIL ASET YANG DIMUTASI', {
    x: marginX,
    y: curY,
    size: 8,
    font: fontBold,
    color: darkNavy,
  })

  curY -= 6

  const thH = 20
  page.drawRectangle({
    x: marginX,
    y: curY - thH,
    width: contentW,
    height: thH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 1,
  })

  const cols = [
    { label: 'NO', w: 26, align: 'center' },
    { label: 'NAMA ASET', w: 170, align: 'left' },
    { label: 'NOMOR ASET', w: 105, align: 'left' },
    { label: 'SERIAL NUMBER', w: 105, align: 'left' },
    { label: 'LOKASI ASAL -> TUJUAN', w: contentW - (26 + 170 + 105 + 105), align: 'left' },
  ]

  let curColX = marginX
  for (const c of cols) {
    const textW = fontBold.widthOfTextAtSize(c.label, 6.5)
    const textX = c.align === 'center' ? curColX + (c.w - textW) / 2 : curColX + 6
    page.drawText(c.label, {
      x: textX,
      y: curY - 13,
      size: 6.5,
      font: fontBold,
      color: textDark,
    })
    curColX += c.w
  }

  curY -= thH

  const rowH = 26
  page.drawRectangle({
    x: marginX,
    y: curY - rowH,
    width: contentW,
    height: rowH,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 0.5,
  })

  let cellX = marginX
  page.drawText('1', { x: cellX + 10, y: curY - 16, size: 7.5, font: fontRegular, color: textGray })
  cellX += cols[0].w
  page.drawText(data.assetName.substring(0, 32), { x: cellX + 6, y: curY - 16, size: 7.5, font: fontBold, color: textDark })
  cellX += cols[1].w
  page.drawText(data.assetNumber || '-', { x: cellX + 6, y: curY - 16, size: 7.5, font: fontBold, color: darkNavy })
  cellX += cols[2].w
  page.drawText(data.serialNumber || '-', { x: cellX + 6, y: curY - 16, size: 7, font: fontRegular, color: textDark })
  cellX += cols[3].w
  page.drawText(`${data.currentLocationName} -> ${data.targetLocationName}`, { x: cellX + 6, y: curY - 16, size: 7, font: fontRegular, color: textDark })

  curY -= rowH

  // Kelengkapan Aset Sub-Row
  const equipH = 34
  page.drawRectangle({
    x: marginX,
    y: curY - equipH,
    width: contentW,
    height: equipH,
    color: rgb(0.99, 0.99, 1),
    borderColor: borderGray,
    borderWidth: 0.5,
  })
  page.drawText('Kelengkapan Fisik Aset:', {
    x: marginX + 8,
    y: curY - 12,
    size: 7,
    font: fontBold,
    color: darkNavy,
  })
  const equipText = (data.equipmentText || 'Unit Lengkap beserta perlengkapan standar').substring(0, 110)
  page.drawText(equipText, {
    x: marginX + 8,
    y: curY - 24,
    size: 7.5,
    font: fontRegular,
    color: textDark,
  })

  curY -= equipH + 8

  // 4. Side-by-Side: Foto Kondisi Fisik Aset & Catatan Tambahan
  const sideBoxH = 76
  const halfBoxW = (contentW - 10) / 2

  // Box A (Left): Foto Kondisi Fisik Aset
  page.drawRectangle({
    x: marginX,
    y: curY - sideBoxH,
    width: halfBoxW,
    height: sideBoxH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 1,
  })

  page.drawText('FOTO KONDISI FISIK ASET', {
    x: marginX + 8,
    y: curY - 12,
    size: 6.8,
    font: fontBold,
    color: darkNavy,
  })

  // Embed photo
  const targetPhotoUrl =
    data.photoUrl ||
    (data.assetPhotos && data.assetPhotos.length > 0 ? data.assetPhotos[0]?.fileUrl : null)
  let embeddedAssetPhoto = null
  if (targetPhotoUrl) {
    try {
      embeddedAssetPhoto = await embedSignatureImage(pdfDoc, targetPhotoUrl)
    } catch (photoErr) {
      console.warn('[AssetTransferPdf] Embed photo error:', photoErr)
    }
  }

  const pFrameW = 85
  const pFrameH = sideBoxH - 20
  const pFrameX = marginX + 8
  const pFrameY = curY - sideBoxH + 5

  page.drawRectangle({
    x: pFrameX,
    y: pFrameY,
    width: pFrameW,
    height: pFrameH,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 0.5,
  })

  if (embeddedAssetPhoto) {
    const pAspect = embeddedAssetPhoto.width / embeddedAssetPhoto.height
    let dW = pFrameW - 4
    let dH = dW / pAspect
    if (dH > pFrameH - 4) {
      dH = pFrameH - 4
      dW = dH * pAspect
    }
    page.drawImage(embeddedAssetPhoto, {
      x: pFrameX + (pFrameW - dW) / 2,
      y: pFrameY + (pFrameH - dH) / 2,
      width: dW,
      height: dH,
    })
  } else {
    page.drawText('(Foto fisik belum terlampir)', {
      x: pFrameX + 4,
      y: pFrameY + pFrameH / 2 - 3,
      size: 5.5,
      font: fontRegular,
      color: textGray,
    })
  }

  // Label text beside photo
  const pCaptionX = pFrameX + pFrameW + 8
  page.drawText('Verifikasi Fisik Aset:', {
    x: pCaptionX,
    y: curY - 26,
    size: 6.5,
    font: fontBold,
    color: darkNavy,
  })
  page.drawText('Foto bukti kondisi', {
    x: pCaptionX,
    y: curY - 37,
    size: 6.2,
    font: fontRegular,
    color: textGray,
  })
  page.drawText('sebelum serah terima.', {
    x: pCaptionX,
    y: curY - 47,
    size: 6.2,
    font: fontRegular,
    color: textGray,
  })

  // Box B (Right): Catatan / Keterangan Tambahan
  const rightBoxX = marginX + halfBoxW + 10
  page.drawRectangle({
    x: rightBoxX,
    y: curY - sideBoxH,
    width: halfBoxW,
    height: sideBoxH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 1,
  })

  page.drawText('CATATAN / KETERANGAN TAMBAHAN', {
    x: rightBoxX + 8,
    y: curY - 12,
    size: 6.8,
    font: fontBold,
    color: darkNavy,
  })

  const notesContent = data.notes?.trim() || data.reason?.trim() || 'Tidak ada catatan atau instruksi tambahan.'
  const wrappedNotes = wrapText(notesContent, 46)
  const maxLines = Math.min(wrappedNotes.length, 4)
  for (let li = 0; li < maxLines; li++) {
    page.drawText(wrappedNotes[li], {
      x: rightBoxX + 8,
      y: curY - 26 - li * 11,
      size: 6.5,
      font: fontRegular,
      color: textDark,
    })
  }

  curY -= sideBoxH + 8

  // 5. Yellow Bar (Pernyataan & Ketentuan Mutasi Aset)
  const bannerH = 28
  page.drawRectangle({
    x: marginX,
    y: curY - bannerH,
    width: contentW,
    height: bannerH,
    color: goldYellow,
    borderColor: rgb(0.85, 0.7, 0),
    borderWidth: 1,
  })

  page.drawText('PERNYATAAN RESMI SERAH TERIMA & MUTASI ASET', {
    x: marginX + 10,
    y: curY - 11,
    size: 7,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  const disText = 'Catatan: Berita Acara ini diterbitkan sah. Hak guna dan tanggung jawab fisik resmi beralih ke Pemegang Baru.'
  page.drawText(disText, {
    x: marginX + 10,
    y: curY - 21,
    size: 6.2,
    font: fontRegular,
    color: rgb(0.15, 0.15, 0.15),
  })

  curY -= bannerH + 12

  // 5. Signature Grid (4 Columns in A4 Portrait)
  page.drawText('LEMBAR PENGESAHAN & SERAH TERIMA', {
    x: marginX,
    y: curY,
    size: 8,
    font: fontBold,
    color: darkNavy,
  })

  curY -= 6

  let sigColumns: Array<{
    header: string
    name: string
    jobTitle: string
    sigUrl: string | null
    isApproved: boolean
    date: string
    note: string | null
  }> = []

  if (data.approvers && data.approvers.length >= 4) {
    sigColumns = data.approvers.slice(0, 4).map((app) => {
      let header = 'DISETUJUI OLEH'
      if (app.level === 1) header = 'DIAJUKAN (HOLDER ASAL)'
      else if (app.level === 2) header = 'DISETUJUI (ATASAN HOLDER ASAL)'
      else if (app.level === 3) header = 'DITERIMA (HOLDER BARU)'
      else if (app.level === 4) header = 'DISETUJUI (ATASAN HOLDER BARU)'

      const isApp = app.status === 'Approved' || app.status === 'approved'
      const sig = isApp ? (app.signatureUrl || (app.level === 1 ? data.applicantSignatureUrl : null)) : null

      return {
        header,
        name: app.approverName,
        jobTitle: app.approverJobTitle || (app.level === 1 ? 'Pemegang Asal' : app.level === 3 ? 'Pemegang Baru' : 'Approver'),
        sigUrl: sig,
        isApproved: isApp || (app.level === 1 && Boolean(data.applicantSignatureUrl)),
        date: app.signedAt ? formatIndoDateTime(app.signedAt) : (app.level === 1 ? formatIndoDate(data.requestDate) : 'Pending'),
        note: app.decisionNote || null,
      }
    })
  } else {
    // 3-step or legacy fallback
    const step1App = data.approvers?.find((a) => a.level === 1)
    const step2App = data.approvers?.find((a) => a.level === 2)
    const step3App = data.approvers?.find((a) => a.level === 3)

    sigColumns = [
      {
        header: 'DIAJUKAN (HOLDER ASAL)',
        name: data.currentHolderName,
        jobTitle: (data as any).currentHolderJobTitle || 'Pemegang Asal',
        sigUrl: data.applicantSignatureUrl || null,
        isApproved: Boolean(data.applicantSignatureUrl),
        date: formatIndoDate(data.requestDate),
        note: null,
      },
      {
        header: 'DISETUJUI (ATASAN HOLDER ASAL)',
        name: step1App?.approverName || 'Atasan Langsung',
        jobTitle: step1App?.approverJobTitle || 'Atasan Langsung',
        sigUrl: (step1App?.status === 'Approved' || step1App?.status === 'approved') ? step1App.signatureUrl || null : null,
        isApproved: step1App?.status === 'Approved' || step1App?.status === 'approved',
        date: step1App?.signedAt ? formatIndoDateTime(step1App.signedAt) : 'Pending',
        note: step1App?.decisionNote || null,
      },
      {
        header: 'DITERIMA (HOLDER BARU)',
        name: step2App?.approverName || data.targetHolderName || 'Pemegang Baru',
        jobTitle: step2App?.approverJobTitle || (data as any).newHolderJobTitle || 'Pemegang Baru',
        sigUrl: (step2App?.status === 'Approved' || step2App?.status === 'approved') ? step2App.signatureUrl || null : null,
        isApproved: step2App?.status === 'Approved' || step2App?.status === 'approved',
        date: step2App?.signedAt ? formatIndoDateTime(step2App.signedAt) : 'Pending',
        note: step2App?.decisionNote || null,
      },
      {
        header: 'DISETUJUI (ATASAN HOLDER BARU)',
        name: step3App?.approverName || 'Atasan Penerima',
        jobTitle: step3App?.approverJobTitle || 'Atasan Penerima',
        sigUrl: (step3App?.status === 'Approved' || step3App?.status === 'approved') ? step3App.signatureUrl || null : null,
        isApproved: step3App?.status === 'Approved' || step3App?.status === 'approved',
        date: step3App?.signedAt ? formatIndoDateTime(step3App.signedAt) : 'Pending',
        note: step3App?.decisionNote || null,
      },
    ]
  }

  const numCols = Math.min(sigColumns.length, 4)
  const sigBoxW = contentW / numCols
  const sigHeaderH = 18
  const sigCanvasH = 68
  const sigInfoH = 38
  const totalSigH = sigHeaderH + sigCanvasH + sigInfoH

  for (let i = 0; i < numCols; i++) {
    const col = sigColumns[i]
    const boxX = marginX + i * sigBoxW

    // Header Box
    page.drawRectangle({
      x: boxX,
      y: curY - sigHeaderH,
      width: sigBoxW,
      height: sigHeaderH,
      color: bgLight,
      borderColor: borderGray,
      borderWidth: 1,
    })
    const hTextW = fontBold.widthOfTextAtSize(col.header, 5.8)
    page.drawText(col.header, {
      x: boxX + (sigBoxW - hTextW) / 2,
      y: curY - 12,
      size: 5.8,
      font: fontBold,
      color: darkNavy,
    })

    // Canvas Box (Signature Image or Waiting Badge)
    page.drawRectangle({
      x: boxX,
      y: curY - sigHeaderH - sigCanvasH,
      width: sigBoxW,
      height: sigCanvasH,
      color: rgb(1, 1, 1),
      borderColor: borderGray,
      borderWidth: 1,
    })

    let embeddedSig = null
    if (col.sigUrl) {
      try {
        embeddedSig = await embedSignatureImage(pdfDoc, col.sigUrl)
      } catch (err) {
        console.error('[asset-transfer-pdf] Failed to embed signature:', err)
      }
    }

    if (embeddedSig) {
      const sigAspect = embeddedSig.width / embeddedSig.height
      let drawW = sigBoxW - 14
      let drawH = drawW / sigAspect
      if (drawH > sigCanvasH - 8) {
        drawH = sigCanvasH - 8
        drawW = drawH * sigAspect
      }
      page.drawImage(embeddedSig, {
        x: boxX + (sigBoxW - drawW) / 2,
        y: curY - sigHeaderH - sigCanvasH + (sigCanvasH - drawH) / 2,
        width: drawW,
        height: drawH,
      })
    } else {
      const waitText = col.isApproved ? 'Disetujui' : '(Menunggu Persetujuan)'
      const waitColor = col.isApproved ? successGreen : textGray
      const waitW = fontRegular.widthOfTextAtSize(waitText, 6.2)
      page.drawText(waitText, {
        x: boxX + (sigBoxW - waitW) / 2,
        y: curY - sigHeaderH - sigCanvasH / 2 - 3,
        size: 6.2,
        font: col.isApproved ? fontBold : fontRegular,
        color: waitColor,
      })
    }

    // Name & Title Box
    page.drawRectangle({
      x: boxX,
      y: curY - totalSigH,
      width: sigBoxW,
      height: sigInfoH,
      color: rgb(0.98, 0.99, 1),
      borderColor: borderGray,
      borderWidth: 1,
    })

    const nameText = `( ${col.name} )`
    const nameSize = col.name.length > 20 ? 5.8 : 6.8
    const nameW = fontBold.widthOfTextAtSize(nameText, nameSize)
    page.drawText(nameText, {
      x: boxX + (sigBoxW - nameW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 12,
      size: nameSize,
      font: fontBold,
      color: textDark,
    })

    const titleText = (col.jobTitle || 'Approver').substring(0, 28)
    const titleSize = titleText.length > 22 ? 5 : 5.8
    const titleW = fontRegular.widthOfTextAtSize(titleText, titleSize)
    page.drawText(titleText, {
      x: boxX + (sigBoxW - titleW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 22,
      size: titleSize,
      font: fontRegular,
      color: textGray,
    })

    const dateW = fontRegular.widthOfTextAtSize(col.date, 5.2)
    page.drawText(col.date, {
      x: boxX + (sigBoxW - dateW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 31,
      size: 5.2,
      font: fontRegular,
      color: textGray,
    })
  }

  // 6. Footer Note
  page.drawText('Dokumen Berita Acara Transfer Aset ini sah dan diterbitkan secara elektronik melalui HERO Asset Management System.', {
    x: marginX,
    y: 20,
    size: 6.2,
    font: fontRegular,
    color: textGray,
  })

  return await pdfDoc.save()
}
