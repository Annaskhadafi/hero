import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { embedChitraParatamaLogo, embedSignatureImage } from './pdf-signature-helper'

export interface CerBastPdfItem {
  assetNumber?: string | null
  serialNumber?: string | null
  description: string
  category?: string
  location?: string
  holderName?: string
  condition?: string | null
  notes?: string | null
  quantity?: number
  kelompokAset?: string | null
}

export interface CerBastPdfData {
  bastNumber: string
  cerNumber: string
  subject: string
  handoverDate: Date | string
  gaName: string
  gaJobTitle?: string | null
  gaSignedAt?: Date | string | null
  gaSignatureUrl?: string | null
  userName: string
  userJobTitle?: string | null
  userDepartment?: string | null
  userSite?: string | null
  userSignedAt?: Date | string | null
  userSignatureUrl?: string | null
  applicantName?: string | null
  applicantJobTitle?: string | null
  departmentName?: string | null
  siteName?: string | null
  assetCategory?: string | null
  dateRequired?: string | null
  receivedAt?: Date | string | null
  receiverNotes?: string | null
  receiverSignatureUrl?: string | null
  notes?: string | null
  vendorName?: string | null
  kelompokAset?: string | null
  goodsPhotoUrl?: string | null
  items: CerBastPdfItem[]
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

export async function generateCerBastPdf(data: CerBastPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  // Work Order Reference: A4 Landscape (841.89 x 595.28 pt)
  const page = pdfDoc.addPage([841.89, 595.28])
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Work Order Colors
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
  page.drawText('TOTAL TIRE SOLUTION • ASSET MANAGEMENT SYSTEM', {
    x: titleX,
    y: curY - 26,
    size: 8,
    font: fontRegular,
    color: textGray,
  })

  const docTitle = 'BERITA ACARA SERAH TERIMA (BAST) ASET'
  const titleW = fontBold.widthOfTextAtSize(docTitle, 12)
  page.drawText(docTitle, {
    x: width - marginX - titleW,
    y: curY - 14,
    size: 12,
    font: fontBold,
    color: darkNavy,
  })

  const bastNoText = `No. BAST: ${data.bastNumber}`
  const bastW = fontBold.widthOfTextAtSize(bastNoText, 8.5)
  page.drawText(bastNoText, {
    x: width - marginX - bastW,
    y: curY - 26,
    size: 8.5,
    font: fontBold,
    color: textDark,
  })

  const refCerText = `Ref. No. CER: ${data.cerNumber}`
  const refCerW = fontRegular.widthOfTextAtSize(refCerText, 8)
  page.drawText(refCerText, {
    x: width - marginX - refCerW,
    y: curY - 37,
    size: 8,
    font: fontRegular,
    color: textGray,
  })

  curY -= 48

  // Horizontal divider
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
  page.drawText('TANGGAL SERAH TERIMA', { x: marginX + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(formatIndoDate(data.handoverDate), { x: marginX + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })

  // Col 2
  page.drawText('PENERIMA (PIC LOKASI)', { x: marginX + colW + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.userName || data.userName || 'Penerima Aset', { x: marginX + colW + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(data.userJobTitle || data.applicantJobTitle || 'Karyawan', { x: marginX + colW + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 3
  page.drawText('DEPARTEMEN & SITE', { x: marginX + colW * 2 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.userDepartment || data.departmentName || '-', { x: marginX + colW * 2 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  page.drawText(`Site: `, { x: marginX + colW * 2 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: textGray })

  // Col 4
  page.drawText('VENDOR / PENYERAH BARANG', { x: marginX + colW * 3 + 10, y: metaRow1Y, size: 6.5, font: fontBold, color: textGray })
  page.drawText(data.vendorName || data.gaName || 'Supplier / Rekanan', { x: marginX + colW * 3 + 10, y: metaRow2Y, size: 8, font: fontBold, color: textDark })
  if (data.kelompokAset) {
    page.drawText(`Kelompok: ${data.kelompokAset}`, { x: marginX + colW * 3 + 10, y: metaRow3Y, size: 7, font: fontRegular, color: darkNavy })
  }

  curY -= metaH + 10

  // 3. Table Items Header
  page.drawText('RINCIAN UNIT ASET YANG DISERAHTERIMAKAN', {
    x: marginX,
    y: curY,
    size: 7.5,
    font: fontBold,
    color: darkNavy,
  })

  curY -= 6

  // Table Column Specifications
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
    { label: 'DESKRIPSI BARANG / ASET', w: 250, align: 'left' },
    { label: 'KELOMPOK ASET', w: 130, align: 'left' },
    { label: 'NOMOR ASET', w: 130, align: 'left' },
    { label: 'QTY', w: 50, align: 'center' },
    { label: 'CATATAN PENERIMAAN / BAST', w: contentW - (32 + 250 + 130 + 130 + 50), align: 'left' },
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

  // Table Rows
  const renderItems = data.items && data.items.length > 0 ? data.items : [
    {
      description: data.subject || 'Pengadaan Capex Unit',
      kelompokAset: data.kelompokAset || '-',
      assetNumber: '-',
      quantity: 1,
      notes: data.receiverNotes || data.notes || 'Sesuai pesanan & berfungsi normal',
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
    const descText = (it.description || '').substring(0, 42)
    const locHolder = [
      it.location ? `Site: ${it.location}` : null,
      it.holderName ? `Holder: ${it.holderName}` : null,
    ].filter(Boolean).join(' | ')
    if (locHolder) {
      page.drawText(descText, { x: cellX + 6, y: curY - 9, size: 7, font: fontBold, color: textDark })
      page.drawText(locHolder.substring(0, 50), { x: cellX + 6, y: curY - 16, size: 5.5, font: fontRegular, color: textGray })
    } else {
      page.drawText(descText, { x: cellX + 6, y: curY - 12, size: 7.5, font: fontBold, color: textDark })
    }
    cellX += cols[1].w
    // 2: Kelompok Aset
    page.drawText((it.kelompokAset || data.kelompokAset || '-').substring(0, 24), { x: cellX + 6, y: curY - 12, size: 7, font: fontRegular, color: textDark })
    cellX += cols[2].w
    // 3: Nomor Aset
    page.drawText((it.assetNumber || '-').substring(0, 22), { x: cellX + 6, y: curY - 12, size: 7.5, font: fontBold, color: darkNavy })
    cellX += cols[3].w
    // 4: Qty
    page.drawText(`${it.quantity || 1} Unit`, { x: cellX + 12, y: curY - 12, size: 7, font: fontRegular, color: textDark })
    cellX += cols[4].w
    // 5: Catatan Penerimaan / BAST
    page.drawText((data.receiverNotes || it.notes || data.notes || 'Sesuai pesanan & berfungsi normal').substring(0, 36), { x: cellX + 6, y: curY - 12, size: 6.5, font: fontRegular, color: textGray })

    curY -= rowH
  }

  // 3.5. Lampiran Dokumentasi Fisik Aset (Foto Penerimaan)
  curY -= 6
  const photoSectionH = 145
  page.drawRectangle({
    x: marginX,
    y: curY - photoSectionH,
    width: contentW,
    height: photoSectionH,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: borderGray,
    borderWidth: 0.8,
  })

  // Header of photo section
  const photoHeaderH = 14
  page.drawRectangle({
    x: marginX,
    y: curY - photoHeaderH,
    width: contentW,
    height: photoHeaderH,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 0.8,
  })

  page.drawText('LAMPIRAN DOKUMENTASI FISIK ASET (FOTO PENERIMAAN)', {
    x: marginX + 8,
    y: curY - 10,
    size: 6.5,
    font: fontBold,
    color: darkNavy,
  })

  const photoSubText = 'Bukti visual kondisi fisik saat serah terima di lokasi site'
  const photoSubW = fontRegular.widthOfTextAtSize(photoSubText, 6)
  page.drawText(photoSubText, {
    x: width - marginX - photoSubW - 8,
    y: curY - 10,
    size: 6,
    font: fontRegular,
    color: textGray,
  })

  // Body of photo section
  let embeddedGoodsPhoto = null
  if (data.goodsPhotoUrl) {
    embeddedGoodsPhoto = await embedSignatureImage(pdfDoc, data.goodsPhotoUrl)
  }

  const photoFrameW = 240
  const photoFrameH = photoSectionH - photoHeaderH - 8
  const photoFrameX = marginX + 8
  const photoFrameY = curY - photoSectionH + 4

  page.drawRectangle({
    x: photoFrameX,
    y: photoFrameY,
    width: photoFrameW,
    height: photoFrameH,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 0.5,
  })

  if (embeddedGoodsPhoto) {
    const pAspect = embeddedGoodsPhoto.width / embeddedGoodsPhoto.height
    let dW = photoFrameW - 4
    let dH = dW / pAspect
    if (dH > photoFrameH - 4) {
      dH = photoFrameH - 4
      dW = dH * pAspect
    }
    page.drawImage(embeddedGoodsPhoto, {
      x: photoFrameX + (photoFrameW - dW) / 2,
      y: photoFrameY + (photoFrameH - dH) / 2,
      width: dW,
      height: dH,
    })
  } else {
    page.drawText('(Foto fisik belum terlampir)', {
      x: photoFrameX + 40,
      y: photoFrameY + photoFrameH / 2 - 3,
      size: 6.5,
      font: fontRegular,
      color: textGray,
    })
  }

  // Info beside photo
  const infoX = photoFrameX + photoFrameW + 14
  page.drawText('Verifikasi Visual Kondisi Fisik Barang:', {
    x: infoX,
    y: curY - photoHeaderH - 18,
    size: 7.5,
    font: fontBold,
    color: textDark,
  })

  const cleanNote = (data.receiverNotes || 'Barang telah diterima lengkap, segel utuh, dan berfungsi normal sesuai spesifikasi.').substring(0, 110)
  page.drawText(`"${cleanNote}"`, {
    x: infoX,
    y: curY - photoHeaderH - 34,
    size: 6.5,
    font: fontRegular,
    color: textGray,
  })

  const verifyTime = `Status: Terverifikasi PIC Lokasi • ${formatIndoDateTime(data.receivedAt || data.handoverDate || new Date())}`
  page.drawText(verifyTime, {
    x: infoX,
    y: curY - photoHeaderH - 54,
    size: 6.5,
    font: fontBold,
    color: successGreen,
  })

  curY -= photoSectionH

  // 4. Yellow Bar / Pernyataan Tanggung Jawab (Work Order Style)
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

  page.drawText('STATUS FISIK: TELAH DITERIMA LENGKAP & BERFUNGSI BAIK', {
    x: marginX + 12,
    y: curY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  const disclaimerText = 'Dokumen ini merupakan bukti sah serah terima inventaris aset PT Chitra Paratama.'
  const disW = fontRegular.widthOfTextAtSize(disclaimerText, 7)
  page.drawText(disclaimerText, {
    x: width - marginX - disW - 12,
    y: curY - 13,
    size: 7,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  })

  curY -= bannerH + 12

  // 5. Signature Grid (Work Order Style Horizontal 2-Columns)
  const sigColumns = [
    {
      header: 'YANG MENYERAHKAN',
      name: data.vendorName || data.gaName || 'Vendor / Ekspedisi',
      jobTitle: 'Supplier / Penyerah Barang',
      sigUrl: null,
      isApproved: true,
      date: formatIndoDate(data.handoverDate || data.receivedAt),
    },
    {
      header: 'YANG MENERIMA',
      name: data.applicantName || data.userName,
      jobTitle: data.applicantJobTitle || data.userJobTitle || 'Pemohon Pengadaan',
      sigUrl: data.receiverSignatureUrl || data.userSignatureUrl || null,
      isApproved: Boolean(data.receiverSignatureUrl || data.userSignatureUrl),
      date: formatIndoDateTime(data.receivedAt || data.userSignedAt || data.handoverDate),
    },
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
      color: i === numCols - 1 ? rgb(0.92, 0.98, 0.94) : bgLight,
      borderColor: borderGray,
      borderWidth: 1,
    })
    const hTextW = fontBold.widthOfTextAtSize(col.header, 6.5)
    page.drawText(col.header, {
      x: boxX + (sigBoxW - hTextW) / 2,
      y: curY - 11,
      size: 6.5,
      font: fontBold,
      color: i === numCols - 1 ? rgb(0.05, 0.4, 0.18) : darkNavy,
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

    // Embed signature
    let embeddedSig = null
    if (col.sigUrl) {
      embeddedSig = await embedSignatureImage(pdfDoc, col.sigUrl)
    }

    if (embeddedSig) {
      const sigAspect = embeddedSig.width / embeddedSig.height
      let drawW = sigBoxW - 16
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
      const waitText = col.isApproved ? 'Disetujui' : '(Menunggu tanda tangan)'
      const waitColor = col.isApproved ? successGreen : textGray
      const waitW = fontRegular.widthOfTextAtSize(waitText, 7)
      page.drawText(waitText, {
        x: boxX + (sigBoxW - waitW) / 2,
        y: curY - sigHeaderH - sigCanvasH / 2 - 3,
        size: 7,
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
      color: i === numCols - 1 ? rgb(0.96, 0.99, 0.97) : rgb(0.98, 0.99, 1),
      borderColor: borderGray,
      borderWidth: 1,
    })

    const nameText = `( ${col.name} )`
    const nameW = fontBold.widthOfTextAtSize(nameText, 7)
    page.drawText(nameText, {
      x: boxX + (sigBoxW - nameW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 11,
      size: 7,
      font: fontBold,
      color: textDark,
    })

    const titleText = col.jobTitle
    const titleW = fontRegular.widthOfTextAtSize(titleText, 6)
    page.drawText(titleText, {
      x: boxX + (sigBoxW - titleW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 20,
      size: 6,
      font: fontRegular,
      color: textGray,
    })

    const dateW = fontRegular.widthOfTextAtSize(col.date, 5.5)
    page.drawText(col.date, {
      x: boxX + (sigBoxW - dateW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 28,
      size: 5.5,
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
