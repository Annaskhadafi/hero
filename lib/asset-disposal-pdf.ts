import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { embedChitraParatamaLogo, embedSignatureImage } from './pdf-signature-helper'

export interface DisposalPdfApprovalStep {
  level: number
  title: string
  approverName: string
  jobTitle?: string | null
  status: string
  reviewedAt?: Date | string | null
  signatureUrl?: string | null
  decisionNote?: string | null
}

export interface DisposalPdfData {
  disposalNumber: string
  disposalDate: string | Date
  disposalType?: string | null
  status: string
  applicantName: string
  applicantSn?: string | null
  applicantJobTitle?: string | null
  departmentName: string
  sectionName?: string | null
  siteName: string
  assetName: string
  assetNumber?: string | null
  purchaseYear?: string | null
  totalBookValue?: number | null
  totalEstimatedSalePrice?: number | null
  notes: string
  items?: Array<{ assetName: string; assetNumber?: string | null; purchaseYear?: string | null; bookValue?: number | null; estimatedSalePrice?: number | null; notes?: string | null }>
  attachments?: Array<{ fileName: string; fileUrl: string; fileSize?: number; mimeType?: string }>
  submittedAt?: Date | string | null
  approvedAt?: Date | string | null
  approvals: DisposalPdfApprovalStep[]
  applicantSignatureUrl?: string | null
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

export async function generateAssetDisposalPdf(data: DisposalPdfData): Promise<Uint8Array> {
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
  page.drawText('TOTAL TIRE SOLUTION • ASSET RETIREMENT & DISPOSAL', {
    x: titleX,
    y: curY - 26,
    size: 8,
    font: fontRegular,
    color: textGray,
  })

  const docTitle = 'FORMULIR PENGHENTIAN & PENGHAPUSAN ASET (DISPOSAL)'
  const titleW = fontBold.widthOfTextAtSize(docTitle, 11)
  page.drawText(docTitle, {
    x: width - marginX - titleW,
    y: curY - 14,
    size: 11,
    font: fontBold,
    color: darkNavy,
  })

  const formNoText = `No. Form: ${data.disposalNumber}`
  const formW = fontBold.widthOfTextAtSize(formNoText, 8.5)
  page.drawText(formNoText, {
    x: width - marginX - formW,
    y: curY - 26,
    size: 8.5,
    font: fontBold,
    color: textDark,
  })

  const tglText = `Tanggal: ${formatIndoDate(data.disposalDate)}`
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
  page.drawText('TANGGAL & JENIS DISPOSAL', { x: marginX + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(formatIndoDate(data.disposalDate), { x: marginX + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`Jenis: ${(data.disposalType || 'Penghapusan').toUpperCase()}`, { x: marginX + 10, y: metaRow3Y, size: 7, font: fontBold, color: rgb(0.05, 0.45, 0.25) })

  // Col 2
  page.drawText('PEMOHON (DISPOSAL APPLICANT)', { x: marginX + colW + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.applicantName, { x: marginX + colW + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(data.applicantJobTitle || 'Karyawan', { x: marginX + colW + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 3
  page.drawText('DEPARTEMEN & SECTION', { x: marginX + colW * 2 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.departmentName, { x: marginX + colW * 2 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(data.sectionName || '-', { x: marginX + colW * 2 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 4
  page.drawText('CABANG / SITE & TAHUN BELI', { x: marginX + colW * 3 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.siteName, { x: marginX + colW * 3 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`Tahun Perolehan: ${data.purchaseYear || '-'}`, { x: marginX + colW * 3 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  curY -= metaH + 10

  // 3. Detail Aset
  page.drawText('DETAIL ASET YANG DIHAPUS (DISPOSAL ASSET)', {
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

  const isSale = data.disposalType === 'Penjualan'
  const cols = isSale
    ? [
        { label: 'NO', w: 25, align: 'center' },
        { label: 'NAMA ASET', w: 155, align: 'left' },
        { label: 'NOMOR ASET', w: 95, align: 'left' },
        { label: 'THN BELI', w: 50, align: 'center' },
        { label: 'NILAI BUKU (RP)', w: 95, align: 'right' },
        { label: 'EST. PENJUALAN (RP)', w: 105, align: 'right' },
        { label: 'DEPARTEMEN / LOKASI', w: 125, align: 'left' },
        { label: 'KONDISI TEKNIS & ALASAN DISPOSAL', w: contentW - (25 + 155 + 95 + 50 + 95 + 105 + 125), align: 'left' },
      ]
    : [
        { label: 'NO', w: 28, align: 'center' },
        { label: 'NAMA ASET', w: 180, align: 'left' },
        { label: 'NOMOR ASET', w: 105, align: 'left' },
        { label: 'TAHUN BELI', w: 65, align: 'center' },
        { label: 'NILAI TERAKHIR (RP)', w: 110, align: 'right' },
        { label: 'DEPARTEMEN / LOKASI', w: 140, align: 'left' },
        { label: 'KONDISI TEKNIS & ALASAN DISPOSAL', w: contentW - (28 + 180 + 105 + 65 + 110 + 140), align: 'left' },
      ]

  let curColX = marginX
  for (const c of cols) {
    const textW = fontBold.widthOfTextAtSize(c.label, 6.5)
    const textX = c.align === 'center'
      ? curColX + (c.w - textW) / 2
      : c.align === 'right'
        ? curColX + c.w - textW - 6
        : curColX + 6
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

  const pdfItems: Array<{
    assetName: string
    assetNumber?: string | null
    purchaseYear?: string | null
    bookValue?: number | null
    estimatedSalePrice?: number | null
    notes?: string | null
  }> = data.items && data.items.length > 0
    ? data.items
    : [{ assetName: data.assetName, assetNumber: data.assetNumber, purchaseYear: data.purchaseYear, bookValue: data.totalBookValue || 0, estimatedSalePrice: data.totalEstimatedSalePrice || 0, notes: data.notes }]

  const rowH = 19
  for (let idx = 0; idx < Math.min(pdfItems.length, 5); idx++) {
    const item = pdfItems[idx]
    page.drawRectangle({
      x: marginX,
      y: curY - rowH,
      width: contentW,
      height: rowH,
      color: rgb(1, 1, 1),
      borderColor: borderGray,
      borderWidth: 0.5,
    })

    const itVal = Number(item.bookValue) || 0
    const itValFormatted = itVal > 0 ? `Rp ${new Intl.NumberFormat('id-ID').format(itVal)}` : 'Rp 0'
    const estVal = Number(item.estimatedSalePrice) || 0
    const estValFormatted = estVal > 0 ? `Rp ${new Intl.NumberFormat('id-ID').format(estVal)}` : 'Rp 0'

    let cellX = marginX
    page.drawText(String(idx + 1), { x: cellX + 8, y: curY - 12.5, size: 7, font: fontRegular, color: textGray })
    cellX += cols[0].w
    page.drawText((item.assetName || '').substring(0, isSale ? 25 : 32), { x: cellX + 5, y: curY - 12.5, size: 7.5, font: fontBold, color: textDark })
    cellX += cols[1].w
    page.drawText(item.assetNumber || '-', { x: cellX + 5, y: curY - 12.5, size: 7.5, font: fontBold, color: darkNavy })
    cellX += cols[2].w
    page.drawText(item.purchaseYear || '-', { x: cellX + (isSale ? 14 : 22), y: curY - 12.5, size: 7, font: fontRegular, color: textDark })
    cellX += cols[3].w
    const valW = fontBold.widthOfTextAtSize(itValFormatted, 7)
    page.drawText(itValFormatted, { x: cellX + cols[4].w - valW - 6, y: curY - 12.5, size: 7, font: fontBold, color: rgb(0.05, 0.45, 0.25) })
    cellX += cols[4].w

    if (isSale) {
      const estW = fontBold.widthOfTextAtSize(estValFormatted, 7)
      page.drawText(estValFormatted, { x: cellX + cols[5].w - estW - 6, y: curY - 12.5, size: 7, font: fontBold, color: darkNavy })
      cellX += cols[5].w
      page.drawText(`${data.departmentName} • ${data.siteName}`.substring(0, 24), { x: cellX + 5, y: curY - 12.5, size: 6.8, font: fontRegular, color: textDark })
      cellX += cols[6].w
      page.drawText((item.notes || data.notes || '').substring(0, 28), { x: cellX + 5, y: curY - 12.5, size: 6.5, font: fontRegular, color: rgb(0.65, 0.1, 0.1) })
    } else {
      page.drawText(`${data.departmentName} • ${data.siteName}`, { x: cellX + 5, y: curY - 12.5, size: 7, font: fontRegular, color: textDark })
      cellX += cols[5].w
      page.drawText((item.notes || data.notes || '').substring(0, 36), { x: cellX + 5, y: curY - 12.5, size: 6.5, font: fontRegular, color: rgb(0.65, 0.1, 0.1) })
    }

    curY -= rowH
  }

  // Total Row Footer in Table
  const totalVal = (data as any).totalBookValue || pdfItems.reduce((acc: number, it: any) => acc + (Number(it.bookValue) || 0), 0)
  const totalValFormatted = `Rp ${new Intl.NumberFormat('id-ID').format(totalVal)}`
  const totalEst = (data as any).totalEstimatedSalePrice || pdfItems.reduce((acc: number, it: any) => acc + (Number(it.estimatedSalePrice) || 0), 0)
  const totalEstFormatted = `Rp ${new Intl.NumberFormat('id-ID').format(totalEst)}`
  const totalRowH = 18
  page.drawRectangle({
    x: marginX,
    y: curY - totalRowH,
    width: contentW,
    height: totalRowH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 0.5,
  })

  const totalLabel = isSale ? 'TOTAL NILAI AKUMULASI:' : 'TOTAL NILAI TERAKHIR ASET:'
  const totalLabelW = fontBold.widthOfTextAtSize(totalLabel, 7)
  const first4ColsW = cols[0].w + cols[1].w + cols[2].w + cols[3].w
  page.drawText(totalLabel, {
    x: marginX + first4ColsW - totalLabelW - 8,
    y: curY - 12,
    size: 7,
    font: fontBold,
    color: textDark,
  })

  const totalValW = fontBold.widthOfTextAtSize(totalValFormatted, 7.5)
  page.drawText(totalValFormatted, {
    x: marginX + first4ColsW + cols[4].w - totalValW - 6,
    y: curY - 12,
    size: 7.5,
    font: fontBold,
    color: rgb(0.05, 0.45, 0.25),
  })

  if (isSale) {
    const totalEstW = fontBold.widthOfTextAtSize(totalEstFormatted, 7.5)
    page.drawText(totalEstFormatted, {
      x: marginX + first4ColsW + cols[4].w + cols[5].w - totalEstW - 6,
      y: curY - 12,
      size: 7.5,
      font: fontBold,
      color: darkNavy,
    })
    page.drawText(`(${pdfItems.length} Unit Aset)`, {
      x: marginX + first4ColsW + cols[4].w + cols[5].w + 6,
      y: curY - 12,
      size: 6.5,
      font: fontRegular,
      color: textGray,
    })
  } else {
    page.drawText(`(${pdfItems.length} Unit Aset)`, {
      x: marginX + first4ColsW + cols[4].w + 6,
      y: curY - 12,
      size: 6.5,
      font: fontRegular,
      color: textGray,
    })
  }

  curY -= totalRowH

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

  page.drawText('STATUS: PENGHENTIAN OPERASIONAL & PENGHAPUSAN ASET TETAP', {
    x: marginX + 12,
    y: curY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  const disText = 'Diverifikasi oleh Finance & disetujui berjenjang hingga Direksi PT Chitra Paratama.'
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
      header: 'DIAJUKAN OLEH',
      name: data.applicantName,
      jobTitle: data.applicantJobTitle || 'Pemohon Disposal',
      sigUrl: data.applicantSignatureUrl || null,
      isApproved: true,
      date: formatIndoDate(data.disposalDate),
      note: null,
    },
    ...data.approvals
      .filter(
        (app) =>
          !app.title.toLowerCase().includes('procurement') &&
          !app.approverName.toLowerCase().includes('rajab') &&
          !app.approverName.toLowerCase().includes('sofyan')
      )
      .map((app) => {
      let header = 'DISETUJUI OLEH'
      if (app.title.toLowerCase().includes('finance') || app.title.toLowerCase().includes('verifikasi')) {
        header = 'DIPERIKSA OLEH (FINANCE)'
      } else if (app.title.toLowerCase().includes('manager') || app.title.toLowerCase().includes('dept')) {
        header = 'DISETUJUI OLEH (DEPT HEAD)'
      } else if (app.title.toLowerCase().includes('general manager') || app.title.toLowerCase().includes('gm')) {
        header = 'DISETUJUI OLEH (GM)'
      } else if (app.title.toLowerCase().includes('director') || app.title.toLowerCase().includes('direktur')) {
        header = 'DISETUJUI OLEH (DIREKSI)'
      }

      return {
        header,
        name: app.approverName,
        jobTitle: app.jobTitle || app.title,
        sigUrl: app.signatureUrl || null,
        isApproved: app.status === 'Approved' || app.status === 'approved',
        date: app.reviewedAt ? formatIndoDateTime(app.reviewedAt) : 'Pending',
        note: app.decisionNote || null,
      }
    }),
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
    const hTextW = fontBold.widthOfTextAtSize(col.header, 5.8)
    page.drawText(col.header, {
      x: boxX + (sigBoxW - hTextW) / 2,
      y: curY - 11,
      size: 5.8,
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
