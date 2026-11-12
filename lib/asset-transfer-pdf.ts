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
  
  // Mutation details
  currentHolderName: string
  currentLocationName: string
  targetHolderName: string
  targetLocationName: string
  reason: string
  notes?: string | null
  
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

export async function generateAssetTransferPdf(data: AssetTransferPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  // Work Order Reference: A4 Landscape (841.89 x 595.28 pt)
  const page = pdfDoc.addPage([841.89, 595.28])
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
  const contentW = width - marginX * 2
  let curY = height - 32

  // 1. Header (Logo on Left, Title on Right)
  const logo = await embedChitraParatamaLogo(pdfDoc)
  if (logo) {
    page.drawImage(logo, {
      x: marginX,
      y: curY - 38,
      width: 100,
      height: 40,
    })
  }

  const titleX = marginX + 110
  page.drawText('PT. CHITRA PARATAMA', {
    x: titleX,
    y: curY - 14,
    size: 13,
    font: fontBold,
    color: darkNavy,
  })
  page.drawText('TOTAL TIRE SOLUTION • ASSET MUTATION & TRANSFER', {
    x: titleX,
    y: curY - 26,
    size: 8,
    font: fontRegular,
    color: textGray,
  })

  const docTitle = 'BERITA ACARA MUTASI / TRANSFER ASET'
  const titleW = fontBold.widthOfTextAtSize(docTitle, 12)
  page.drawText(docTitle, {
    x: width - marginX - titleW,
    y: curY - 14,
    size: 12,
    font: fontBold,
    color: darkNavy,
  })

  const formNoText = `No. Mutasi: ${data.transferNumber}`
  const formW = fontBold.widthOfTextAtSize(formNoText, 8.5)
  page.drawText(formNoText, {
    x: width - marginX - formW,
    y: curY - 26,
    size: 8.5,
    font: fontBold,
    color: textDark,
  })

  const tglText = `Tanggal: ${formatIndoDate(data.requestDate)}`
  const tglW = fontRegular.widthOfTextAtSize(tglText, 8)
  page.drawText(tglText, {
    x: width - marginX - tglW,
    y: curY - 37,
    size: 8,
    font: fontRegular,
    color: textGray,
  })

  curY -= 48

  page.drawLine({
    start: { x: marginX, y: curY },
    end: { x: width - marginX, y: curY },
    thickness: 1.5,
    color: darkNavy,
  })

  curY -= 8

  // 2. Metadata Grid (Work Order Box Style)
  const metaH = 46
  page.drawRectangle({
    x: marginX,
    y: curY - metaH,
    width: contentW,
    height: metaH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 1,
  })

  const colW = contentW / 4
  const metaRow1Y = curY - 14
  const metaRow2Y = curY - 24
  const metaRow3Y = curY - 38

  // Col 1
  page.drawText('TANGGAL PENGAJUAN', { x: marginX + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(formatIndoDate(data.requestDate), { x: marginX + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })

  // Col 2
  page.drawText('PEMEGANG ASAL (LOKASI ASAL)', { x: marginX + colW + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.currentHolderName, { x: marginX + colW + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`Lokasi: ${data.currentLocationName}`, { x: marginX + colW + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 3
  page.drawText('PEMEGANG BARU (LOKASI TUJUAN)', { x: marginX + colW * 2 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.targetHolderName, { x: marginX + colW * 2 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`Tujuan: ${data.targetLocationName}`, { x: marginX + colW * 2 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 4
  page.drawText('DEPARTEMEN & KATEGORI', { x: marginX + colW * 3 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.departmentName || 'General', { x: marginX + colW * 3 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`Kategori: ${data.assetCategory || 'Fixed Asset'}`, { x: marginX + colW * 3 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  curY -= metaH + 10

  // 3. Detail Aset
  page.drawText('DETAIL ASET YANG DIMUTASI', {
    x: marginX,
    y: curY,
    size: 7.5,
    font: fontBold,
    color: darkNavy,
  })

  curY -= 6

  const thH = 18
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
    { label: 'NO', w: 32, align: 'center' },
    { label: 'NAMA ASET', w: 220, align: 'left' },
    { label: 'NOMOR ASET', w: 120, align: 'left' },
    { label: 'SERIAL NUMBER', w: 120, align: 'left' },
    { label: 'LOKASI ASAL &rarr; TUJUAN', w: 180, align: 'left' },
    { label: 'KELENGKAPAN', w: contentW - (32 + 220 + 120 + 120 + 180), align: 'center' },
  ]

  let curColX = marginX
  for (const c of cols) {
    const textW = fontBold.widthOfTextAtSize(c.label, 6.5)
    const textX = c.align === 'center' ? curColX + (c.w - textW) / 2 : curColX + 6
    page.drawText(c.label, {
      x: textX,
      y: curY - 12,
      size: 6.5,
      font: fontBold,
      color: textDark,
    })
    curColX += c.w
  }

  curY -= thH

  const rowH = 22
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
  page.drawText('1', { x: cellX + 12, y: curY - 14, size: 7, font: fontRegular, color: textGray })
  cellX += cols[0].w
  page.drawText(data.assetName.substring(0, 36), { x: cellX + 6, y: curY - 14, size: 7.5, font: fontBold, color: textDark })
  cellX += cols[1].w
  page.drawText(data.assetNumber || '-', { x: cellX + 6, y: curY - 14, size: 7.5, font: fontBold, color: darkNavy })
  cellX += cols[2].w
  page.drawText(data.serialNumber || '-', { x: cellX + 6, y: curY - 14, size: 7, font: fontRegular, color: textDark })
  cellX += cols[3].w
  page.drawText(`${data.currentLocationName} -> ${data.targetLocationName}`, { x: cellX + 6, y: curY - 14, size: 7, font: fontRegular, color: textDark })
  cellX += cols[4].w
  page.drawText('Lengkap & Terverifikasi', { x: cellX + 10, y: curY - 14, size: 7, font: fontBold, color: successGreen })

  curY -= rowH

  // 4. Yellow Bar
  curY -= 6
  const bannerH = 20
  page.drawRectangle({
    x: marginX,
    y: curY - bannerH,
    width: contentW,
    height: bannerH,
    color: goldYellow,
    borderColor: rgb(0.85, 0.7, 0),
    borderWidth: 1,
  })

  page.drawText('ALASAN MUTASI: ' + (data.reason || data.notes || 'Pemindahan operasional aset').substring(0, 60), {
    x: marginX + 12,
    y: curY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  const disText = 'Hak guna dan tanggung jawab fisik resmi beralih ke Pemegang Baru.'
  const disW = fontRegular.widthOfTextAtSize(disText, 7)
  page.drawText(disText, {
    x: width - marginX - disW - 12,
    y: curY - 13,
    size: 7,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  })

  curY -= bannerH + 12

  // 5. Signature Grid (Work Order Style Horizontal)
  const sigColumns = [
    {
      header: 'DIAJUKAN OLEH (HOLDER ASAL)',
      name: data.currentHolderName,
      jobTitle: 'Pemegang Asal',
      sigUrl: data.applicantSignatureUrl || null,
      isApproved: true,
      date: formatIndoDate(data.requestDate),
      note: null,
    },
    ...data.approvers.map((app) => ({
      header: app.label.toLowerCase().includes('holder') ? 'DITERIMA OLEH (HOLDER BARU)' : 'DISETUJUI OLEH',
      name: app.approverName,
      jobTitle: app.approverJobTitle || app.label,
      sigUrl: app.signatureUrl || null,
      isApproved: app.status === 'Approved' || app.status === 'approved',
      date: app.signedAt ? formatIndoDateTime(app.signedAt) : 'Pending',
      note: app.decisionNote || null,
    })),
  ]

  const numCols = sigColumns.length
  const sigBoxW = contentW / numCols
  const sigHeaderH = 16
  const sigCanvasH = 50
  const sigInfoH = 34
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
    const hTextW = fontBold.widthOfTextAtSize(col.header, 6)
    page.drawText(col.header, {
      x: boxX + (sigBoxW - hTextW) / 2,
      y: curY - 11,
      size: 6,
      font: fontBold,
      color: darkNavy,
    })

    // Canvas Box
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
      embeddedSig = await embedSignatureImage(pdfDoc, col.sigUrl)
    }

    if (embeddedSig) {
      const sigAspect = embeddedSig.width / embeddedSig.height
      let drawW = sigBoxW - 14
      let drawH = drawW / sigAspect
      if (drawH > sigCanvasH - 6) {
        drawH = sigCanvasH - 6
        drawW = drawH * sigAspect
      }
      page.drawImage(embeddedSig, {
        x: boxX + (sigBoxW - drawW) / 2,
        y: curY - sigHeaderH - sigCanvasH + (sigCanvasH - drawH) / 2,
        width: drawW,
        height: drawH,
      })
    } else {
      const waitText = col.isApproved ? 'Disetujui' : '(Menunggu)'
      const waitColor = col.isApproved ? successGreen : textGray
      const waitW = fontRegular.widthOfTextAtSize(waitText, 6.5)
      page.drawText(waitText, {
        x: boxX + (sigBoxW - waitW) / 2,
        y: curY - sigHeaderH - sigCanvasH / 2 - 3,
        size: 6.5,
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
    const nameSize = col.name.length > 22 ? 5.5 : 6.5
    const nameW = fontBold.widthOfTextAtSize(nameText, nameSize)
    page.drawText(nameText, {
      x: boxX + (sigBoxW - nameW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 11,
      size: nameSize,
      font: fontBold,
      color: textDark,
    })

    const titleText = col.jobTitle || 'Approver'
    const titleSize = titleText.length > 25 ? 4.8 : 5.5
    const titleW = fontRegular.widthOfTextAtSize(titleText, titleSize)
    page.drawText(titleText, {
      x: boxX + (sigBoxW - titleW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 20,
      size: titleSize,
      font: fontRegular,
      color: textGray,
    })

    const dateW = fontRegular.widthOfTextAtSize(col.date, 5.2)
    page.drawText(col.date, {
      x: boxX + (sigBoxW - dateW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 28,
      size: 5.2,
      font: fontRegular,
      color: textGray,
    })
  }

  // Footer Note
  page.drawText('Dokumen ini sah dan diterbitkan secara elektronik melalui HERO Asset Management System.', {
    x: marginX,
    y: 12,
    size: 6.5,
    font: fontRegular,
    color: textGray,
  })

  return await pdfDoc.save()
}
