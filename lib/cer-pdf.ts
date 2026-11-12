import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { embedChitraParatamaLogo, embedSignatureImage } from './pdf-signature-helper'

export interface CerPdfItem {
  description: string
  qty: number
  pricePerUnit: number | string
  totalPrice: number | string
  allocation?: string
  holderName?: string
  estimatedLifespan?: string
  assetNumber?: string | null
  kelompokAset?: string | null
}

export interface CerPdfApprovalStep {
  stepOrder: number
  label: string
  approverName: string
  jobTitle?: string | null
  status: string
  reviewedAt?: Date | string | null
  signatureUrl?: string | null
  decisionNote?: string | null
}

export interface CerPdfData {
  cerNumber: string
  subject: string
  applicantName: string
  applicantSn?: string | null
  applicantJobTitle?: string | null
  siteName: string
  departmentName: string
  sectionName?: string | null
  level?: string | null
  purchaseType: string
  budgetSource: string
  assetCategory: string
  purchasePurpose: string
  vendorName: string
  budgetName?: string | null
  budgetCode?: string | null
  totalEstimatedPrice: number | string
  dateRequired?: string | null
  kelompokAset?: string | null
  financeCheckedAt?: Date | string | null
  financeCheckedByName?: string | null
  createdAt: Date | string
  approvedAt?: Date | string | null
  items: CerPdfItem[]
  approvals: CerPdfApprovalStep[]
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

function formatRupiah(amount: number | string | null | undefined): string {
  if (amount == null) return 'Rp 0'
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  if (isNaN(num)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export async function generateCerPdf(data: CerPdfData): Promise<Uint8Array> {
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

  // 1. Header (Logo on Left, Document Title on Right)
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
  page.drawText('TOTAL TIRE SOLUTION • CAPITAL EXPENDITURE REQUEST', {
    x: titleX,
    y: curY - 26,
    size: 8,
    font: fontRegular,
    color: textGray,
  })

  const docTitle = 'FORM CAPITAL EXPENDITURE REQUEST (CER)'
  const titleW = fontBold.widthOfTextAtSize(docTitle, 12)
  page.drawText(docTitle, {
    x: width - marginX - titleW,
    y: curY - 14,
    size: 12,
    font: fontBold,
    color: darkNavy,
  })

  const cerNoText = `No. CER: ${data.cerNumber}`
  const cerW = fontBold.widthOfTextAtSize(cerNoText, 8.5)
  page.drawText(cerNoText, {
    x: width - marginX - cerW,
    y: curY - 26,
    size: 8.5,
    font: fontBold,
    color: textDark,
  })

  const statusText = `Kategori: ${data.assetCategory || 'IT Device'}`
  const statusW = fontRegular.widthOfTextAtSize(statusText, 8)
  page.drawText(statusText, {
    x: width - marginX - statusW,
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
  page.drawText(formatIndoDate(data.createdAt || data.dateRequired), { x: marginX + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`Diperlukan: ${formatIndoDate(data.dateRequired)}`, { x: marginX + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 2
  page.drawText('PEMOHON CAPEX', { x: marginX + colW + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.applicantName, { x: marginX + colW + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(data.applicantJobTitle || 'Pemohon', { x: marginX + colW + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 3
  page.drawText('DEPARTEMEN & CABANG/SITE', { x: marginX + colW * 2 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.departmentName, { x: marginX + colW * 2 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`${data.siteName} • ${data.sectionName || '-'}`, { x: marginX + colW * 2 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 4
  page.drawText('SUMBER ANGGARAN & VENDOR', { x: marginX + colW * 3 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  const budgetLine = data.budgetCode ? `${data.budgetCode} • ${data.budgetSource || 'Anggaran'}` : `${data.budgetSource || 'Anggaran'} (${data.purchaseType || 'Baru'})`
  page.drawText(budgetLine.substring(0, 32), { x: marginX + colW * 3 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  const vendorLine = `Vendor: ${data.vendorName || '-'}${data.budgetName ? ` • ${data.budgetName}` : ''}`
  page.drawText(vendorLine.substring(0, 36), { x: marginX + colW * 3 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  curY -= metaH + 8

  // 2b. Purchase Purpose / Justification Callout
  if (data.purchasePurpose && data.purchasePurpose.trim().length > 0) {
    const purposeText = `Tujuan / Justifikasi: ${data.purchasePurpose.trim().replace(/[\r\n]+/g, ' ')}`
    page.drawText(purposeText.substring(0, 140), {
      x: marginX,
      y: curY - 2,
      size: 7,
      font: fontRegular,
      color: textDark,
    })
    curY -= 12
  }

  // 3. Capex Items Table
  page.drawText('RINCIAN UNIT PERMINTAAN PENGADAAN (CAPEX ITEMS)', {
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
    { label: 'DESKRIPSI BARANG', w: 230, align: 'left' },
    { label: 'KELOMPOK ASET', w: 120, align: 'left' },
    { label: 'NOMOR ASET', w: 110, align: 'left' },
    { label: 'QTY', w: 45, align: 'center' },
    { label: 'ESTIMASI HARGA', w: 110, align: 'right' },
    { label: 'TOTAL HARGA', w: 125, align: 'right' },
  ]

  let curColX = marginX
  for (const c of cols) {
    const textW = fontBold.widthOfTextAtSize(c.label, 6.5)
    const textX = c.align === 'center' ? curColX + (c.w - textW) / 2 : c.align === 'right' ? curColX + c.w - textW - 6 : curColX + 6
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

  const renderItems = data.items && data.items.length > 0 ? data.items : [
    {
      description: data.subject,
      kelompokAset: data.kelompokAset || '-',
      assetNumber: '-',
      qty: 1,
      pricePerUnit: data.totalEstimatedPrice,
      totalPrice: data.totalEstimatedPrice,
    }
  ]

  const rowH = 18
  for (let idx = 0; idx < Math.min(renderItems.length, 5); idx++) {
    const it = renderItems[idx]
    page.drawRectangle({
      x: marginX,
      y: curY - rowH,
      width: contentW,
      height: rowH,
      color: idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.99, 1),
      borderColor: borderGray,
      borderWidth: 0.5,
    })

    let cellX = marginX
    // 0: No
    page.drawText(String(idx + 1), { x: cellX + 12, y: curY - 12, size: 7, font: fontRegular, color: textGray })
    cellX += cols[0].w
    // 1: Deskripsi
    const descText = (it.description || '').substring(0, 36)
    const allocHolder = [
      it.allocation ? `Site: ${it.allocation}` : null,
      it.holderName ? `Holder: ${it.holderName}` : null,
    ].filter(Boolean).join(' | ')
    if (allocHolder) {
      page.drawText(descText, { x: cellX + 6, y: curY - 9, size: 7, font: fontBold, color: textDark })
      page.drawText(allocHolder.substring(0, 48), { x: cellX + 6, y: curY - 16, size: 5.5, font: fontRegular, color: textGray })
    } else {
      page.drawText(descText, { x: cellX + 6, y: curY - 12, size: 7.5, font: fontBold, color: textDark })
    }
    cellX += cols[1].w
    // 2: Kelompok Aset
    page.drawText((it.kelompokAset || data.kelompokAset || '-').substring(0, 20), { x: cellX + 6, y: curY - 12, size: 7, font: fontRegular, color: textDark })
    cellX += cols[2].w
    // 3: Nomor Aset
    page.drawText((it.assetNumber || '-').substring(0, 18), { x: cellX + 6, y: curY - 12, size: 7.5, font: fontBold, color: darkNavy })
    cellX += cols[3].w
    // 4: Qty
    page.drawText(`${it.qty || 1} Unit`, { x: cellX + 8, y: curY - 12, size: 7, font: fontRegular, color: textDark })
    cellX += cols[4].w
    // 5: Estimasi Harga
    const pText = formatRupiah(it.pricePerUnit)
    const pW = fontRegular.widthOfTextAtSize(pText, 7)
    page.drawText(pText, { x: cellX + cols[5].w - pW - 6, y: curY - 12, size: 7, font: fontRegular, color: textDark })
    cellX += cols[5].w
    // 6: Total Harga
    const tText = formatRupiah(it.totalPrice)
    const tW = fontBold.widthOfTextAtSize(tText, 7.5)
    page.drawText(tText, { x: cellX + cols[6].w - tW - 6, y: curY - 12, size: 7.5, font: fontBold, color: darkNavy })

    curY -= rowH
  }

  // 4. Yellow Bar Total Amount (Work Order Style)
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

  page.drawText('TOTAL ESTIMASI NILAI INVESTASI (CAPEX)', {
    x: marginX + 12,
    y: curY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  const totalText = formatRupiah(data.totalEstimatedPrice)
  const totalW = fontBold.widthOfTextAtSize(totalText, 9)
  page.drawText(totalText, {
    x: width - marginX - totalW - 12,
    y: curY - 14,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  curY -= bannerH + 12

  // 5. Signature Grid (Work Order Style Horizontal Multi-Column)
  const sigColumns = [
    {
      header: 'DIAJUKAN OLEH',
      name: data.applicantName,
      jobTitle: data.applicantJobTitle || 'Pemohon Capex',
      sigUrl: data.applicantSignatureUrl || null,
      isApproved: true,
      date: formatIndoDate(data.createdAt),
      note: null,
    },
    ...data.approvals.map((app) => {
      let header = 'DISETUJUI OLEH'
      if ((app.label || '').toLowerCase().includes('bima') || (app.label || '').toLowerCase().includes('acknowledge')) {
        header = 'DIKETAHUI OLEH'
      } else if ((app.label || '').toLowerCase().includes('finance') || (app.label || '').toLowerCase().includes('checked')) {
        header = 'DIPERIKSA OLEH'
      }

      return {
        header,
        name: app.approverName || 'Approver',
        jobTitle: app.jobTitle || app.label,
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
