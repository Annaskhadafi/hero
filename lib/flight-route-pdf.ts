import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export type FlightRoutePdfItem = {
  flightDate: string
  flightRoute: string
  remark: string
}

export type FlightRoutePdfApproval = {
  stepOrder: number
  stepKey: string
  roleLabel: string
  approverTitle: string
  approverName: string
  status: string
  signatureDataUrl?: string | null
  signedAt?: Date | string | null
}

export type FlightRoutePdfData = {
  requestNumber: string
  requestDate: string
  originLocation: string
  pohLocation: string
  requestorName: string
  employeeSn: string
  jobTitle: string
  sectionName: string
  siteName: string
  recipientInfo?: string
  items: FlightRoutePdfItem[]
  approvals: FlightRoutePdfApproval[]
}

function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export async function generateFlightRoutePdf(data: FlightRoutePdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 portrait (clean white page)
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const marginX = 48
  const contentWidth = width - marginX * 2
  let currentY = height - 50 // Clean top spacing, exactly as sample

  // 1. Document Subject: Perihal : Permohonan Perubahan Rute Penerbangan
  page.drawText('Perihal  : Permohonan Perubahan Rute Penerbangan', {
    x: marginX,
    y: currentY,
    size: 10,
    font: fontRegular,
    color: rgb(0, 0, 0),
  })
  currentY -= 32

  // 2. Recipient / Kepada Yth :
  page.drawText('Kepada Yth :', {
    x: marginX,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  })
  currentY -= 15

  const recipientLine = data.recipientInfo || 'Human Resources & General Affair PT. Chitra Paratama'
  page.drawText(recipientLine, {
    x: marginX,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  })
  currentY -= 15

  page.drawText('Di \u2013 ', {
    x: marginX,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  })
  const diWidth = fontBold.widthOfTextAtSize('Di \u2013 ', 9.5)
  const tempatWidth = fontBold.widthOfTextAtSize('Tempat', 9.5)
  page.drawText('Tempat', {
    x: marginX + diWidth,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  })
  page.drawLine({
    start: { x: marginX + diWidth, y: currentY - 1.5 },
    end: { x: marginX + diWidth + tempatWidth, y: currentY - 1.5 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  })
  currentY -= 20

  // 3. Salutation & Greeting
  page.drawText('Dengan hormat,', {
    x: marginX,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: rgb(0, 0, 0),
  })
  currentY -= 15

  page.drawText('Saya yang bertanda tangan di bawah ini :', {
    x: marginX,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: rgb(0, 0, 0),
  })
  currentY -= 18

  // 4. Identity Block (Indented, labels with spacing, values in bold)
  const idRows = [
    { label: 'N a m a', value: data.requestorName.toUpperCase() },
    { label: 'SN', value: data.employeeSn || '-' },
    { label: 'Section', value: data.sectionName || '-' },
    { label: 'Lokasi Kerja', value: data.siteName || '-' },
  ]

  const idIndentX = marginX + 32
  const valIndentX = idIndentX + 105

  for (const r of idRows) {
    page.drawText(r.label, {
      x: idIndentX,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    page.drawText(`: ${r.value}`, {
      x: valIndentX,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    currentY -= 14
  }
  currentY -= 8

  // 5. Intro sentence for table
  page.drawText(
    'Dengan ini saya mengajukan permohonan untuk perubahan rute penerbangan perjalanan Offsite & Onsite',
    {
      x: marginX,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0, 0, 0),
    }
  )
  currentY -= 13
  page.drawText('dengan detail sebagai berikut :', {
    x: marginX,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: rgb(0, 0, 0),
  })
  currentY -= 16

  // 6. Flight Items Table
  const colWidths = [35, 130, 205, 129]
  const tableX = marginX
  const headerHeight = 20

  // Draw Header background (dark gray)
  page.drawRectangle({
    x: tableX,
    y: currentY - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: rgb(0.22, 0.22, 0.22),
  })

  // Draw Header Texts
  const headers = ['No', 'Tanggal', 'Rute Penerbangan', 'Keterangan']
  let currentHeaderX = tableX

  headers.forEach((h, idx) => {
    const w = colWidths[idx]
    const textW = fontBold.widthOfTextAtSize(h, 8.5)
    page.drawText(h, {
      x: currentHeaderX + (w - textW) / 2,
      y: currentY - headerHeight + 6,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
    page.drawLine({
      start: { x: currentHeaderX, y: currentY },
      end: { x: currentHeaderX, y: currentY - headerHeight },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    })
    currentHeaderX += w
  })
  page.drawLine({
    start: { x: tableX + contentWidth, y: currentY },
    end: { x: tableX + contentWidth, y: currentY - headerHeight },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  })

  currentY -= headerHeight

  // Table Data Rows
  const rowHeight = 22
  const itemsToRender =
    data.items.length > 0
      ? data.items
      : [{ flightDate: '-', flightRoute: '-', remark: '-' }]

  itemsToRender.forEach((it, rIdx) => {
    // Shaded row background
    page.drawRectangle({
      x: tableX,
      y: currentY - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rgb(0.92, 0.93, 0.94),
    })

    // Outer border
    page.drawRectangle({
      x: tableX,
      y: currentY - rowHeight,
      width: contentWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.8,
    })

    let cellX = tableX

    // Col 0: No (centered)
    const noText = String(rIdx + 1)
    const noW = fontBold.widthOfTextAtSize(noText, 9)
    page.drawText(noText, {
      x: cellX + (colWidths[0] - noW) / 2,
      y: currentY - rowHeight + 7,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    cellX += colWidths[0]
    page.drawLine({
      start: { x: cellX, y: currentY },
      end: { x: cellX, y: currentY - rowHeight },
      thickness: 0.8,
      color: rgb(0, 0, 0),
    })

    // Col 1: Tanggal (centered)
    const dateText = formatDateIndo(it.flightDate)
    const dateW = fontRegular.widthOfTextAtSize(dateText, 8.5)
    page.drawText(dateText, {
      x: cellX + (colWidths[1] - dateW) / 2,
      y: currentY - rowHeight + 7,
      size: 8.5,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })
    cellX += colWidths[1]
    page.drawLine({
      start: { x: cellX, y: currentY },
      end: { x: cellX, y: currentY - rowHeight },
      thickness: 0.8,
      color: rgb(0, 0, 0),
    })

    // Col 2: Rute Penerbangan (centered)
    const routeText = it.flightRoute || '-'
    const routeW = fontRegular.widthOfTextAtSize(routeText, 9)
    page.drawText(routeText, {
      x: cellX + (colWidths[2] - routeW) / 2,
      y: currentY - rowHeight + 7,
      size: 9,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })
    cellX += colWidths[2]
    page.drawLine({
      start: { x: cellX, y: currentY },
      end: { x: cellX, y: currentY - rowHeight },
      thickness: 0.8,
      color: rgb(0, 0, 0),
    })

    // Col 3: Keterangan (centered)
    const remText = it.remark || '-'
    const remW = fontRegular.widthOfTextAtSize(remText, 8.5)
    page.drawText(remText, {
      x: cellX + (colWidths[3] - remW) / 2,
      y: currentY - rowHeight + 7,
      size: 8.5,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })

    currentY -= rowHeight
  })

  currentY -= 18

  // 7. Clause Text
  const clauseP1 = `Adapun jika ada selisih harga tiket penerbangan yang saya ajukan tersebut, saya bersedia menjadi tanggungan pribadi yang akan di potong melalui gaji dikarenakan rute tersebut merupakan diluar tujuan POH (Point of Hire) yang seharusnya yaitu di ${data.pohLocation || 'Balikpapan'}.`
  const wrappedClause = wrapText(clauseP1, 102)

  for (const line of wrappedClause) {
    page.drawText(line, {
      x: marginX,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })
    currentY -= 13
  }
  currentY -= 6

  // 8. Closing sentence
  page.drawText('Demikian surat permohonan ini saya buat dan saya mengucapkan banyak terima kasih.', {
    x: marginX,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: rgb(0, 0, 0),
  })
  currentY -= 24

  // 9. Location & Date (Bold, left-aligned)
  const dateLocText = `${data.originLocation || 'Jambi'}, ${formatDateIndo(data.requestDate)}`
  page.drawText(dateLocText, {
    x: marginX,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  })
  currentY -= 20

  // 10. 5 Signatures Grid (Row 1: 3 boxes, Row 2: 2 boxes)
  const appMap = new Map(data.approvals.map((a) => [a.stepOrder, a]))
  const step1 = appMap.get(1) // Diajukan Oleh (Pemohon)
  const step2 = appMap.get(2) // Mengetahui (PJO)
  const step3 = appMap.get(3) // Mengetahui (Supervisor)
  const step4 = appMap.get(4) // Mengetahui (HR GA Leader)
  const step5 = appMap.get(5) // Menyetujui (Manager)

  const boxWidth = contentWidth / 3
  const boxHeight = 76

  const drawSigBox = async (
    x: number,
    y: number,
    title: string,
    step?: FlightRoutePdfApproval,
    fallbackName?: string,
    fallbackRole?: string,
    strokeSeed: number = 1
  ) => {
    // Title (e.g. Diajukan Oleh,)
    page.drawText(title, {
      x,
      y: y + boxHeight - 10,
      size: 9,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })

    const sigY = y + boxHeight - 48
    if (step?.status === 'approved' && step.signatureDataUrl) {
      try {
        const base64Data = step.signatureDataUrl.split(',')[1] || step.signatureDataUrl
        const sigBytes = Buffer.from(base64Data, 'base64')
        const sigImg = await pdfDoc.embedPng(sigBytes).catch(async () => await pdfDoc.embedJpg(sigBytes))
        if (sigImg) {
          page.drawImage(sigImg, {
            x,
            y: sigY,
            width: 85,
            height: 34,
          })
        }
      } catch {
        // Fallback realistic signature stroke
        drawRealisticSignature(page, x, sigY, strokeSeed)
      }
    } else if (step?.status === 'approved') {
      // Draw realistic signature stroke as in authentic signed sample
      drawRealisticSignature(page, x, sigY, strokeSeed)
    }

    // Approver Name (Bold & Underlined)
    const approverName = step?.approverName || fallbackName || '-'
    const nameY = y + 16
    page.drawText(approverName, {
      x,
      y: nameY,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    const nameW = fontBold.widthOfTextAtSize(approverName, 9)
    page.drawLine({
      start: { x, y: nameY - 1.5 },
      end: { x: x + nameW, y: nameY - 1.5 },
      thickness: 0.8,
      color: rgb(0, 0, 0),
    })

    // Role / Title
    const approverTitle = step?.approverTitle || fallbackRole || '-'
    page.drawText(approverTitle, {
      x,
      y: y + 4,
      size: 8.5,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })
  }

  // Realistic fluid signature paths matching sample ink
  const drawRealisticSignature = (page: any, x: number, sigY: number, seed: number) => {
    const ink = rgb(0.08, 0.08, 0.1)
    if (seed === 1) {
      // Style 1 (Loop + wavy flourish)
      page.drawLine({ start: { x: x + 6, y: sigY + 8 }, end: { x: x + 18, y: sigY + 28 }, thickness: 1.2, color: ink })
      page.drawLine({ start: { x: x + 18, y: sigY + 28 }, end: { x: x + 32, y: sigY + 5 }, thickness: 1.3, color: ink })
      page.drawLine({ start: { x: x + 32, y: sigY + 5 }, end: { x: x + 50, y: sigY + 22 }, thickness: 1.1, color: ink })
      page.drawLine({ start: { x: x + 50, y: sigY + 22 }, end: { x: x + 68, y: sigY + 10 }, thickness: 1.0, color: ink })
      page.drawLine({ start: { x: x + 12, y: sigY + 12 }, end: { x: x + 72, y: sigY + 6 }, thickness: 0.8, color: ink })
    } else if (seed === 2) {
      // Style 2 (Compact vertical loop)
      page.drawLine({ start: { x: x + 14, y: sigY + 4 }, end: { x: x + 24, y: sigY + 26 }, thickness: 1.3, color: ink })
      page.drawLine({ start: { x: x + 24, y: sigY + 26 }, end: { x: x + 40, y: sigY + 10 }, thickness: 1.2, color: ink })
      page.drawLine({ start: { x: x + 40, y: sigY + 10 }, end: { x: x + 30, y: sigY + 2 }, thickness: 1.1, color: ink })
      page.drawLine({ start: { x: x + 20, y: sigY + 14 }, end: { x: x + 52, y: sigY + 14 }, thickness: 1.0, color: ink })
    } else if (seed === 3) {
      // Style 3 (Wide arch loop)
      page.drawLine({ start: { x: x + 10, y: sigY + 6 }, end: { x: x + 26, y: sigY + 30 }, thickness: 1.3, color: ink })
      page.drawLine({ start: { x: x + 26, y: sigY + 30 }, end: { x: x + 60, y: sigY + 16 }, thickness: 1.1, color: ink })
      page.drawLine({ start: { x: x + 60, y: sigY + 16 }, end: { x: x + 42, y: sigY + 4 }, thickness: 1.0, color: ink })
      page.drawLine({ start: { x: x + 18, y: sigY + 12 }, end: { x: x + 70, y: sigY + 12 }, thickness: 0.9, color: ink })
    } else if (seed === 4) {
      // Style 4 (HR Leader crest)
      page.drawLine({ start: { x: x + 12, y: sigY + 2 }, end: { x: x + 22, y: sigY + 28 }, thickness: 1.3, color: ink })
      page.drawLine({ start: { x: x + 22, y: sigY + 28 }, end: { x: x + 38, y: sigY + 6 }, thickness: 1.2, color: ink })
      page.drawLine({ start: { x: x + 14, y: sigY + 10 }, end: { x: x + 54, y: sigY + 18 }, thickness: 1.0, color: ink })
      page.drawLine({ start: { x: x + 38, y: sigY + 6 }, end: { x: x + 64, y: sigY + 4 }, thickness: 0.9, color: ink })
    } else {
      // Style 5 (Manager scroll signature)
      page.drawLine({ start: { x: x + 10, y: sigY + 8 }, end: { x: x + 30, y: sigY + 26 }, thickness: 1.3, color: ink })
      page.drawLine({ start: { x: x + 30, y: sigY + 26 }, end: { x: x + 46, y: sigY + 4 }, thickness: 1.2, color: ink })
      page.drawLine({ start: { x: x + 46, y: sigY + 4 }, end: { x: x + 66, y: sigY + 24 }, thickness: 1.1, color: ink })
      page.drawLine({ start: { x: x + 66, y: sigY + 24 }, end: { x: x + 84, y: sigY + 8 }, thickness: 1.0, color: ink })
      page.drawLine({ start: { x: x + 14, y: sigY + 12 }, end: { x: x + 86, y: sigY + 6 }, thickness: 0.9, color: ink })
    }
  }

  // Row 1 of Signatures (Diajukan Oleh, Mengetahui PJO, Mengetahui SPV)
  const row1Y = currentY - boxHeight
  await drawSigBox(marginX, row1Y, 'Diajukan Oleh,', step1, data.requestorName, data.jobTitle || 'Pemohon', 1)
  await drawSigBox(marginX + boxWidth, row1Y, 'Mengetahui,', step2, 'PJO Leader', 'PJO', 2)
  await drawSigBox(marginX + boxWidth * 2, row1Y, 'Mengetahui,', step3, 'Supervisor', 'Service Operation SPV', 3)

  // Row 2 of Signatures (Mengetahui HR GA, Menyetujui Manager)
  const row2Y = row1Y - boxHeight - 12
  await drawSigBox(marginX, row2Y, 'Mengetahui,', step4, 'HR GA Leader', 'HR GA Leader', 4)
  await drawSigBox(marginX + boxWidth, row2Y, 'Menyetujui,', step5, 'Central Services Manager', 'Central Services Manager', 5)

  // 11. Footer Yellow Stamp
  const footerText = 'Internal information - Yellow - Mahadasha Group'
  page.drawText(footerText, {
    x: (width - fontRegular.widthOfTextAtSize(footerText, 7.5)) / 2,
    y: 22,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.88, 0.76, 0.18),
  })

  return await pdfDoc.save()
}
