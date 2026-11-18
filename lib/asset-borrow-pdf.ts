import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { embedChitraParatamaLogo, embedSignatureImage } from './pdf-signature-helper'

export interface AssetBorrowPdfData {
  borrowNumber: string
  borrowDate: Date | string
  expectedReturnDate?: Date | string | null
  actualReturnDate?: Date | string | null
  status: string
  
  // Peminjam
  borrowerName: string
  borrowerJobTitle?: string | null
  borrowerDepartment?: string | null
  borrowerSection?: string | null
  borrowerSignatureUrl?: string | null
  
  // Aset
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  equipmentNotes?: string | null
  
  // Pemegang / Holder
  holderName: string
  holderJobTitle?: string | null
  holderSignatureUrl?: string | null
  holderSignedAt?: Date | string | null
  
  // Keperluan
  purpose: string
  approvalNote?: string | null
  returnNotes?: string | null
  returnConditionNotes?: string | null
  assetCondition?: string | null
  returnPhotoUrls?: string[] | string | null
  holderReturnSignatureUrl?: string | null
  holderReturnSignedAt?: Date | string | null
  approvals?: Array<{
    level: number
    title: string
    approverName: string
    jobTitle?: string | null
    status: string
    reviewedAt?: Date | string | null
    signatureUrl?: string | null
    decisionNote?: string | null
  }>
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

export async function generateAssetBorrowPdf(data: AssetBorrowPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  
  // Standard A4 Portrait: 595.28 x 841.89 pt
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Corporate Palettes
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

  // 1. Header (Logo on Left, Title on Right)
  const logo = await embedChitraParatamaLogo(pdfDoc)
  if (logo) {
    page.drawImage(logo, {
      x: marginX,
      y: curY - 36,
      width: 90,
      height: 36,
    })
  }

  const titleX = marginX + 100
  page.drawText('PT. CHITRA PARATAMA', {
    x: titleX,
    y: curY - 12,
    size: 11,
    font: fontBold,
    color: darkNavy,
  })
  page.drawText('TOTAL TIRE SOLUTION • ASSET MANAGEMENT SYSTEM', {
    x: titleX,
    y: curY - 24,
    size: 7,
    font: fontRegular,
    color: textGray,
  })

  const docTitle = 'FORMULIR PEMINJAMAN ASET'
  const titleW = fontBold.widthOfTextAtSize(docTitle, 10.5)
  page.drawText(docTitle, {
    x: width - marginX - titleW,
    y: curY - 12,
    size: 10.5,
    font: fontBold,
    color: darkNavy,
  })

  const formNoText = `No: ${data.borrowNumber}`
  const formW = fontBold.widthOfTextAtSize(formNoText, 8)
  page.drawText(formNoText, {
    x: width - marginX - formW,
    y: curY - 24,
    size: 8,
    font: fontBold,
    color: textDark,
  })

  const statusText = `Status: ${data.status.toUpperCase()}`
  const statusW = fontRegular.widthOfTextAtSize(statusText, 7.5)
  page.drawText(statusText, {
    x: width - marginX - statusW,
    y: curY - 34,
    size: 7.5,
    font: fontRegular,
    color: data.status === 'borrowed' ? darkNavy : data.status === 'returned' ? successGreen : textGray,
  })

  curY -= 44

  page.drawLine({
    start: { x: marginX, y: curY },
    end: { x: width - marginX, y: curY },
    thickness: 1.5,
    color: darkNavy,
  })

  curY -= 10

  // 2. Metadata Grid (Box Style)
  const metaH = 50
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
  const metaRow1Y = curY - 13
  const metaRow2Y = curY - 25
  const metaRow3Y = curY - 39

  // Col 1: Tanggal Pinjam
  page.drawText('TANGGAL PINJAM', { x: marginX + 8, y: metaRow1Y, size: 6, font: fontBold, color: textGray })
  page.drawText(formatIndoDate(data.borrowDate), { x: marginX + 8, y: metaRow2Y, size: 7.5, font: fontBold, color: textDark })
  page.drawText(`Est: ${formatIndoDate(data.expectedReturnDate)}`, { x: marginX + 8, y: metaRow3Y, size: 6.5, font: fontRegular, color: textGray })

  // Col 2: Peminjam
  page.drawText('PEMINJAM (BORROWER)', { x: marginX + colW + 8, y: metaRow1Y, size: 6, font: fontBold, color: textGray })
  page.drawText(data.borrowerName.substring(0, 22), { x: marginX + colW + 8, y: metaRow2Y, size: 7.5, font: fontBold, color: textDark })
  page.drawText((data.borrowerJobTitle || 'Karyawan').substring(0, 24), { x: marginX + colW + 8, y: metaRow3Y, size: 6.5, font: fontRegular, color: textGray })

  // Col 3: Holder
  page.drawText('PEMEGANG ASAL (HOLDER)', { x: marginX + colW * 2 + 8, y: metaRow1Y, size: 6, font: fontBold, color: textGray })
  page.drawText(data.holderName.substring(0, 22), { x: marginX + colW * 2 + 8, y: metaRow2Y, size: 7.5, font: fontBold, color: textDark })
  page.drawText((data.holderJobTitle || 'Pemegang Aset').substring(0, 24), { x: marginX + colW * 2 + 8, y: metaRow3Y, size: 6.5, font: fontRegular, color: textGray })

  // Col 4: Status Kembali
  page.drawText('STATUS KEMBALI', { x: marginX + colW * 3 + 8, y: metaRow1Y, size: 6, font: fontBold, color: textGray })
  page.drawText(data.actualReturnDate ? 'Sudah Kembali' : 'Sedang Dipinjam', { x: marginX + colW * 3 + 8, y: metaRow2Y, size: 7.5, font: fontBold, color: data.actualReturnDate ? successGreen : textDark })
  page.drawText(data.actualReturnDate ? formatIndoDate(data.actualReturnDate) : 'Aktif Digunakan', { x: marginX + colW * 3 + 8, y: metaRow3Y, size: 6.5, font: fontRegular, color: textGray })

  curY -= metaH + 12

  // 3. Table Detail Aset
  page.drawText('RINCIAN ASET YANG DIPINJAM', {
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
    { label: 'NO', w: 25, align: 'center' },
    { label: 'NAMA ASET', w: 165, align: 'left' },
    { label: 'NOMOR ASET', w: 85, align: 'left' },
    { label: 'SERIAL NUMBER', w: 80, align: 'left' },
    { label: 'KELENGKAPAN', w: 110, align: 'left' },
    { label: 'STATUS', w: 60, align: 'center' },
  ]

  let curColX = marginX
  for (const c of cols) {
    const textW = fontBold.widthOfTextAtSize(c.label, 6)
    const textX = c.align === 'center' ? curColX + (c.w - textW) / 2 : curColX + 5
    page.drawText(c.label, {
      x: textX,
      y: curY - 12,
      size: 6,
      font: fontBold,
      color: textDark,
    })
    curColX += c.w
  }

  curY -= thH

  const rowH = 24
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
  page.drawText('1', { x: cellX + 10, y: curY - 15, size: 7, font: fontRegular, color: textGray })
  cellX += cols[0].w
  page.drawText(data.assetName.substring(0, 32), { x: cellX + 5, y: curY - 15, size: 7, font: fontBold, color: textDark })
  cellX += cols[1].w
  page.drawText(data.assetNumber || '-', { x: cellX + 5, y: curY - 15, size: 7, font: fontBold, color: darkNavy })
  cellX += cols[2].w
  page.drawText(data.serialNumber || '-', { x: cellX + 5, y: curY - 15, size: 6.5, font: fontRegular, color: textDark })
  cellX += cols[3].w
  page.drawText((data.equipmentNotes || 'Lengkap').substring(0, 22), { x: cellX + 5, y: curY - 15, size: 6.5, font: fontRegular, color: textGray })
  cellX += cols[4].w
  page.drawText(data.status.toUpperCase(), { x: cellX + 14, y: curY - 15, size: 6.5, font: fontBold, color: successGreen })

  curY -= rowH + 10

  // 4. Tujuan Peminjaman & Ketentuan Banner
  const bannerH = 34
  page.drawRectangle({
    x: marginX,
    y: curY - bannerH,
    width: contentW,
    height: bannerH,
    color: rgb(0.99, 0.98, 0.92),
    borderColor: rgb(0.9, 0.8, 0.5),
    borderWidth: 1,
  })

  page.drawText('TUJUAN PEMINJAMAN:', {
    x: marginX + 10,
    y: curY - 12,
    size: 6.5,
    font: fontBold,
    color: rgb(0.2, 0.18, 0.1),
  })
  page.drawText(data.purpose.substring(0, 80), {
    x: marginX + 105,
    y: curY - 12,
    size: 6.5,
    font: fontRegular,
    color: textDark,
  })
  page.drawText('* Peminjam bertanggung jawab penuh atas pemeliharaan fisik dan pengembalian unit tepat waktu.', {
    x: marginX + 10,
    y: curY - 25,
    size: 5.8,
    font: fontRegular,
    color: rgb(0.4, 0.35, 0.2),
  })

  curY -= bannerH + 10

  // Parse Return Photos (URL array / JSON string / single string)
  let returnPhotos: string[] = []
  if (Array.isArray(data.returnPhotoUrls)) {
    returnPhotos = data.returnPhotoUrls.filter(Boolean)
  } else if (typeof data.returnPhotoUrls === 'string') {
    try {
      const parsed = JSON.parse(data.returnPhotoUrls)
      if (Array.isArray(parsed)) {
        returnPhotos = parsed.filter(Boolean)
      } else if (typeof parsed === 'string' && parsed.trim()) {
        returnPhotos = [parsed.trim()]
      }
    } catch {
      if (data.returnPhotoUrls.trim()) {
        returnPhotos = [data.returnPhotoUrls.trim()]
      }
    }
  }

  // 5. Seksi Pengembalian Fisik & Foto Terpadu (Jika sudah ada data pengembalian)
  if (data.actualReturnDate || data.returnNotes || data.returnConditionNotes) {
    const hasPhotos = returnPhotos.length > 0
    const returnBoxH = hasPhotos ? 212 : 52

    page.drawRectangle({
      x: marginX,
      y: curY - returnBoxH,
      width: contentW,
      height: returnBoxH,
      color: rgb(0.95, 0.98, 0.96),
      borderColor: rgb(0.7, 0.85, 0.75),
      borderWidth: 1,
    })

    const condLabel = data.assetCondition === 'DAMAGED'
      ? 'Rusak (DAMAGED)'
      : data.assetCondition === 'NEEDS_REPAIR'
      ? 'Perlu Servis / Perbaikan (NEEDS_REPAIR)'
      : 'Normal & Berfungsi Baik (ACTIVE)'
    const condColor = data.assetCondition === 'DAMAGED'
      ? rgb(0.8, 0.15, 0.15)
      : data.assetCondition === 'NEEDS_REPAIR'
      ? rgb(0.85, 0.5, 0.05)
      : successGreen

    page.drawText('KONFIRMASI SERAH TERIMA & PEMERIKSAAN FISIK PENGEMBALIAN ASET', {
      x: marginX + 10,
      y: curY - 12,
      size: 7,
      font: fontBold,
      color: darkNavy,
    })

    page.drawText(`Waktu Pengembalian: ${formatIndoDateTime(data.actualReturnDate)}`, {
      x: marginX + 10,
      y: curY - 23,
      size: 6.2,
      font: fontRegular,
      color: textDark,
    })

    page.drawText(`Kondisi Akhir Unit: ${condLabel}`, {
      x: marginX + 270,
      y: curY - 23,
      size: 6.2,
      font: fontBold,
      color: condColor,
    })

    const pNote = data.returnNotes ? `Catatan Peminjam: "${data.returnNotes.substring(0, 68)}"` : 'Catatan Peminjam: -'
    page.drawText(pNote, {
      x: marginX + 10,
      y: curY - 33,
      size: 5.8,
      font: fontRegular,
      color: textDark,
    })

    const hNote = data.returnConditionNotes ? `Pemeriksaan Holder: "${data.returnConditionNotes.substring(0, 68)}"` : 'Pemeriksaan Holder: -'
    page.drawText(hNote, {
      x: marginX + 10,
      y: curY - 43,
      size: 5.8,
      font: fontRegular,
      color: textGray,
    })

    // Foto Bukti Fisik Terpadu dalam Seksi Serah Terima (Proporsional & Jelas)
    if (hasPhotos) {
      page.drawLine({
        start: { x: marginX + 8, y: curY - 48 },
        end: { x: marginX + contentW - 8, y: curY - 48 },
        thickness: 0.5,
        color: rgb(0.8, 0.88, 0.82),
      })

      page.drawText(`DOKUMENTASI FOTO FISIK UNIT SAAT PENGEMBALIAN (${returnPhotos.length} FOTO):`, {
        x: marginX + 10,
        y: curY - 57,
        size: 5.8,
        font: fontBold,
        color: darkNavy,
      })

      const maxPhotos = Math.min(returnPhotos.length, 4)
      const photoCardH = 145
      let photoCardW = 245
      let gapX = 14
      let startX = marginX + 10

      if (maxPhotos === 1) {
        photoCardW = 260
        startX = marginX + (contentW - photoCardW) / 2
      } else if (maxPhotos === 2) {
        photoCardW = 245
        gapX = 14
        const totalW = 2 * photoCardW + gapX
        startX = marginX + (contentW - totalW) / 2
      } else if (maxPhotos === 3) {
        photoCardW = 162
        gapX = 9
        const totalW = 3 * photoCardW + 2 * gapX
        startX = marginX + (contentW - totalW) / 2
      } else {
        photoCardW = 122
        gapX = 6
        const totalW = 4 * photoCardW + 3 * gapX
        startX = marginX + (contentW - totalW) / 2
      }

      for (let i = 0; i < maxPhotos; i++) {
        const pX = startX + i * (photoCardW + gapX)
        const pY = curY - 61 - photoCardH

        // Frame Box Foto
        page.drawRectangle({
          x: pX,
          y: pY,
          width: photoCardW,
          height: photoCardH,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.78, 0.85, 0.8),
          borderWidth: 0.75,
        })

        const pImg = await embedSignatureImage(pdfDoc, returnPhotos[i])
        if (pImg) {
          const pAspect = pImg.width / pImg.height
          const imgMaxW = photoCardW - 8
          const imgMaxH = photoCardH - 18
          let drawW = imgMaxW
          let drawH = drawW / pAspect
          if (drawH > imgMaxH) {
            drawH = imgMaxH
            drawW = drawH * pAspect
          }
          page.drawImage(pImg, {
            x: pX + (photoCardW - drawW) / 2,
            y: pY + 15 + (imgMaxH - drawH) / 2,
            width: drawW,
            height: drawH,
          })
        } else {
          page.drawText('[ Foto Fisik Tidak Dapat Dimuat ]', {
            x: pX + (photoCardW - 110) / 2,
            y: pY + photoCardH / 2,
            size: 6.5,
            font: fontRegular,
            color: textGray,
          })
        }

        // Caption Bar
        page.drawRectangle({
          x: pX,
          y: pY,
          width: photoCardW,
          height: 14,
          color: rgb(0.93, 0.96, 0.94),
          borderColor: rgb(0.78, 0.85, 0.8),
          borderWidth: 0.5,
        })

        const capText = `Foto #${i + 1}: Dokumentasi Fisik Unit Saat Kembali`
        const capFontSize = photoCardW < 130 ? 5 : 5.8
        const capW = fontBold.widthOfTextAtSize(capText, capFontSize)
        page.drawText(capText, {
          x: pX + (photoCardW - capW) / 2,
          y: pY + 4,
          size: capFontSize,
          font: fontBold,
          color: textDark,
        })
      }
    }

    curY -= returnBoxH + 12
  }

  // 6. Signature Grid (Portrait Standard)
  const approvalCols = data.approvals && data.approvals.length > 0
    ? data.approvals.map((app) => ({
        header: 'DISETUJUI OLEH',
        name: app.approverName,
        jobTitle: app.jobTitle || app.title,
        sigUrl: app.signatureUrl || null,
        isApproved: app.status === 'Approved' || app.status === 'approved',
        date: app.reviewedAt ? formatIndoDateTime(app.reviewedAt) : 'Pending',
        note: app.decisionNote || null,
      }))
    : [
        {
          header: 'DISETUJUI OLEH (PEMEGANG ASAL)',
          name: data.holderName,
          jobTitle: data.holderJobTitle || 'Pemegang Aset',
          sigUrl: data.holderSignatureUrl || null,
          isApproved: Boolean(data.holderSignedAt || data.holderSignatureUrl),
          date: data.holderSignedAt ? formatIndoDateTime(data.holderSignedAt) : 'Disetujui',
          note: data.approvalNote || null,
        },
      ]

  const sigColumns = [
    {
      header: 'DIAJUKAN OLEH (PEMINJAM)',
      name: data.borrowerName,
      jobTitle: data.borrowerJobTitle || 'Peminjam Aset',
      sigUrl: data.borrowerSignatureUrl || null,
      isApproved: true,
      date: formatIndoDate(data.borrowDate),
      note: null,
    },
    ...approvalCols,
  ]

  const numCols = sigColumns.length
  const sigBoxW = contentW / numCols
  const sigHeaderH = 18
  const sigCanvasH = 55
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
      y: curY - 12,
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
      const waitText = col.isApproved ? 'Disetujui Secara Digital' : '(Menunggu Persetujuan)'
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
    const nameSize = col.name.length > 25 ? 5.5 : 6.5
    const nameW = fontBold.widthOfTextAtSize(nameText, nameSize)
    page.drawText(nameText, {
      x: boxX + (sigBoxW - nameW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 11,
      size: nameSize,
      font: fontBold,
      color: textDark,
    })

    const titleText = col.jobTitle || 'Approver'
    const titleSize = titleText.length > 28 ? 4.8 : 5.5
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
    y: 20,
    size: 6.5,
    font: fontRegular,
    color: textGray,
  })

  return await pdfDoc.save()
}
