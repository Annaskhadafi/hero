import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from 'pdf-lib'

type AttendanceDayData = {
  day: number
  dayName: string
  status: string
  clockIn: string
  clockOut: string
  scheduleCode: string
  isHoliday: boolean
  holidayName?: string
}

type OvertimeRecordInput = {
  period: string
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  days: AttendanceDayData[]
  isNonStaff: boolean
}

type SiteAllowanceInput = {
  period: string
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  days: AttendanceDayData[]
  lokasiKhususRate: number
  lokasiKhususRateStaff: number
  lokasiKhususRateNonStaff: number
  lokasiKhususEnabled: boolean
  msaRate: number
  mealsRate: number
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-').map(Number)
  const months = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `${months[month]}-${year}`
}

function getDayName(period: string, day: number) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
}

function calcOvertimeHours(clockIn: string, clockOut: string, baseHours = 5): number {
  if (!clockIn || !clockOut) return 0
  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)
  const inMin = inH * 60 + inM
  const outMin = outH * 60 + outM
  const worked = (outMin >= inMin ? outMin - inMin : outMin + 1440 - inMin) / 60
  return Math.max(0, Math.round((worked - baseHours) * 100) / 100)
}

function formatMoney(value: number): string {
  return value.toLocaleString('id-ID')
}

function centerX(pageWidth: number, text: string, font: PDFFont, fontSize: number): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize)
  return (pageWidth - textWidth) / 2
}

function drawCell(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: {
    text?: string
    font?: PDFFont
    fontSize?: number
    align?: 'left' | 'center' | 'right'
    color?: ReturnType<typeof rgb>
    bgColor?: ReturnType<typeof rgb>
    borderColor?: ReturnType<typeof rgb>
  }
) {
  const opts = options ?? {}
  const borderColor = opts.borderColor ?? rgb(0.3, 0.3, 0.3)

  if (opts.bgColor) {
    page.drawRectangle({ x, y, width: w, height: h, color: opts.bgColor })
  }
  page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth: 0.8 })

  if (opts.text && opts.font) {
    const fontSize = opts.fontSize ?? 8
    const textColor = opts.color ?? rgb(0, 0, 0)
    const cleanText = opts.text.replace(/[\n\r\t]/g, ' ').trim()
    if (!cleanText) return
    const textWidth = opts.font.widthOfTextAtSize(cleanText, fontSize)
    let textX = x + 4
    if (opts.align === 'center') textX = x + (w - textWidth) / 2
    else if (opts.align === 'right') textX = x + w - textWidth - 4
    const textY = y + (h - fontSize) / 2 + 1
    page.drawText(cleanText, {
      x: textX,
      y: textY,
      font: opts.font,
      size: fontSize,
      color: textColor,
    })
  }
}

async function embedLogo(doc: PDFDocument): Promise<{
  image: Awaited<ReturnType<typeof doc.embedPng>>
  width: number
  height: number
} | null> {
  try {
    const response = await fetch('/cp_logo-removebg-preview.png')
    if (!response.ok) return null
    const logoBytes = new Uint8Array(await response.arrayBuffer())
    const image = await doc.embedPng(logoBytes)
    const scale = 50 / image.height
    return { image, width: image.width * scale, height: 50 }
  } catch {
    return null
  }
}

// ============================================================
// OVERTIME RECORD PDF
// ============================================================
export async function generateOvertimeRecordPdf(input: OvertimeRecordInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const page = doc.addPage([595, 842])
  const { width } = page.getSize()
  const logo = await embedLogo(doc)

  const LM = 45
  let y = 790

  // === LOGO + HEADER ===
  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 15, width: logo.width, height: logo.height })
  }
  const title1 = 'PT. CHITRA PARATAMA'
  const title2 = 'OVER TIME RECORD'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 14), y, font: fontBold, size: 14 })
  y -= 18
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 35

  // === INFO (titik dua sejajar) ===
  const colonX = LM + 110
  const valX = colonX + 15
  page.drawText('MONTH', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(formatPeriodLabel(input.period), { x: valX, y, font: fontBold, size: 9 })
  page.drawText(`SN  ${input.employeeSn}`, { x: width - 140, y, font, size: 9 })
  y -= 15
  page.drawText('Name of Employee', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.employeeName, { x: valX, y, font: fontBold, size: 9 })
  y -= 15
  page.drawText('Department', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.department || input.section, { x: valX, y, font, size: 9 })
  y -= 15
  page.drawText('Site', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.siteName, { x: valX, y, font, size: 9 })
  y -= 15
  page.drawText('Overtime rate/hours', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  y -= 22

  // === TABLE ===
  const rowH = 15
  const cols = [30, 60, 50, 45, 50, 50, 50, 50, 150]
  const totalTableW = cols.reduce((s, c) => s + c, 0)
  const tableStartX = (width - totalTableW) / 2
  const colX: number[] = []
  let cx = tableStartX
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  // Header
  const hH = 26
  drawCell(page, colX[0], y - hH, cols[0], hH, {
    text: 'Date',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[1], y - hH, cols[1], hH, {
    text: 'Day',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  // Working Time
  drawCell(page, colX[2], y - 13, cols[2] + cols[3], 13, {
    text: 'Working Time',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[2], y - hH, cols[2], 13, {
    text: 'From',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[3], y - hH, cols[3], 13, {
    text: 'To',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  // OT
  drawCell(page, colX[4], y - 13, cols[4] + cols[5], 13, {
    text: 'Overtime',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[4], y - hH, cols[4], 13, {
    text: 'From',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[5], y - hH, cols[5], 13, {
    text: 'To',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[6], y - hH, cols[6], hH, {
    text: 'Total\nOvertime',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[7], y - hH, cols[7], hH, {
    text: 'WD',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[8], y - hH, cols[8], hH, {
    text: 'Remarks',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  y -= hH

  // Rows
  let totalOT = 0
  for (const day of input.days) {
    y -= rowH
    if (y < 90) break

    const isOff =
      day.scheduleCode === 'OFF' || day.scheduleCode === 'FB' || day.scheduleCode === 'Libur'
    const isSunday = day.dayName === 'Sunday' || day.dayName === 'Saturday'
    const ot = input.isNonStaff ? calcOvertimeHours(day.clockIn, day.clockOut) : 0
    totalOT += ot

    const bgColor = day.isHoliday
      ? rgb(1, 1, 0.75)
      : isSunday || isOff
        ? rgb(1, 0.93, 0.93)
        : undefined
    const dayColor = isSunday || day.isHoliday ? rgb(0.8, 0, 0) : rgb(0, 0, 0)

    drawCell(page, colX[0], y, cols[0], rowH, {
      text: String(day.day),
      font,
      fontSize: 8,
      align: 'center',
      bgColor,
      color: dayColor,
    })
    drawCell(page, colX[1], y, cols[1], rowH, {
      text: day.dayName,
      font,
      fontSize: 7,
      align: 'center',
      bgColor,
      color: dayColor,
    })

    if (isOff && !day.clockIn) {
      drawCell(page, colX[2], y, cols[2], rowH, {
        text: 'OFF',
        font: fontBold,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
      drawCell(page, colX[3], y, cols[3], rowH, { bgColor })
      drawCell(page, colX[4], y, cols[4], rowH, { bgColor })
      drawCell(page, colX[5], y, cols[5], rowH, { bgColor })
    } else if (day.clockIn) {
      drawCell(page, colX[2], y, cols[2], rowH, {
        text: day.clockIn.replace(':', '.'),
        font,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
      drawCell(page, colX[3], y, cols[3], rowH, {
        text: '15.00',
        font,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
      if (day.clockOut && ot > 0) {
        drawCell(page, colX[4], y, cols[4], rowH, {
          text: '15.00',
          font,
          fontSize: 8,
          align: 'center',
          bgColor,
        })
        drawCell(page, colX[5], y, cols[5], rowH, {
          text: day.clockOut.replace(':', '.'),
          font,
          fontSize: 8,
          align: 'center',
          bgColor,
        })
      } else {
        drawCell(page, colX[4], y, cols[4], rowH, { bgColor })
        drawCell(page, colX[5], y, cols[5], rowH, { bgColor })
      }
    } else {
      drawCell(page, colX[2], y, cols[2], rowH, { bgColor })
      drawCell(page, colX[3], y, cols[3], rowH, { bgColor })
      drawCell(page, colX[4], y, cols[4], rowH, { bgColor })
      drawCell(page, colX[5], y, cols[5], rowH, { bgColor })
    }

    drawCell(page, colX[6], y, cols[6], rowH, {
      text: ot > 0 ? String(Math.round(ot * 100) / 100) : '',
      font: fontBold,
      fontSize: 8,
      align: 'center',
      bgColor,
    })
    drawCell(page, colX[7], y, cols[7], rowH, { bgColor })

    let remark = ''
    if (day.isHoliday && day.holidayName) remark = day.holidayName
    else if (day.status === 'sick') remark = 'SICK'
    else if (day.status === 'leave') remark = 'IJIN'
    else if (day.status === 'absent') remark = 'ALPA'
    const rc =
      day.status === 'sick'
        ? rgb(0.7, 0.5, 0)
        : day.status === 'leave'
          ? rgb(0, 0.4, 0.7)
          : day.status === 'absent'
            ? rgb(0.8, 0, 0)
            : rgb(0.3, 0.3, 0.3)
    drawCell(page, colX[8], y, cols[8], rowH, {
      text: remark,
      font,
      fontSize: 7,
      align: 'left',
      bgColor,
      color: rc,
    })
  }

  // Total
  y -= rowH
  const tBg = rgb(0.8, 1, 0.8)
  const tW = cols[0] + cols[1] + cols[2] + cols[3] + cols[4] + cols[5]
  drawCell(page, colX[0], y, tW, rowH, {
    text: 'TOTAL',
    font: fontBold,
    fontSize: 9,
    align: 'center',
    bgColor: tBg,
  })
  drawCell(page, colX[6], y, cols[6], rowH, {
    text: String(Math.round(totalOT * 10) / 10),
    font: fontBold,
    fontSize: 10,
    align: 'center',
    bgColor: tBg,
    color: rgb(0, 0.5, 0),
  })
  drawCell(page, colX[7], y, cols[7], rowH, { bgColor: tBg })
  drawCell(page, colX[8], y, cols[8], rowH, { bgColor: tBg })

  // Signatures
  y -= 70
  const sigLabels = ['Dibuat Oleh,', 'Mengetahui,', 'Mengetahui,', 'Menyetujui,']
  const sigSpacing = (width - 100) / 4
  for (let i = 0; i < 4; i++) {
    const sx = 50 + i * sigSpacing
    page.drawText(sigLabels[i], { x: sx, y, font: fontItalic, size: 8, color: rgb(0.3, 0.3, 0.3) })
    page.drawLine({
      start: { x: sx - 5, y: y - 55 },
      end: { x: sx + 95, y: y - 55 },
      color: rgb(0.5, 0.5, 0.5),
      thickness: 0.5,
    })
  }

  return doc.save()
}

// ============================================================
// PAYABLE SITE ALLOWANCE PDF
// ============================================================
export async function generateSiteAllowancePdf(input: SiteAllowanceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const page = doc.addPage([595, 842])
  const { width } = page.getSize()
  const logo = await embedLogo(doc)

  const LM = 45
  let y = 790

  // === LOGO (with padding from edge) + HEADER (centered) ===
  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 15, width: logo.width, height: logo.height })
  }
  const title1 = 'PT. CHITRA PARATAMA'
  const title2 = 'PAYABLE SITE ALLOWANCE'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 14), y, font: fontBold, size: 14 })
  y -= 18
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 35

  // === INFO (titik dua sejajar) ===
  const colonX = LM + 110 // posisi titik dua sejajar
  const valX = colonX + 15 // posisi value setelah titik dua
  page.drawText('MONTH', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(formatPeriodLabel(input.period), { x: valX, y, font: fontBold, size: 9 })
  page.drawText(`SN: ${input.employeeSn}`, { x: width - 140, y, font, size: 9 })
  y -= 15
  page.drawText('Name of Employee', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.employeeName, { x: valX, y, font: fontBold, size: 9 })
  y -= 15
  page.drawText('Department', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.department, { x: valX, y, font, size: 9 })
  y -= 15
  page.drawText('Section', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.section, { x: valX, y, font, size: 9 })
  y -= 15
  page.drawText('Site', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.siteName, { x: valX, y, font, size: 9 })
  y -= 28

  // === TABLE TITLE (centered) ===
  const tableTitle = 'PAYABLE SITE ALLOWANCE'
  page.drawText(tableTitle, {
    x: centerX(width, tableTitle, fontBold, 11),
    y,
    font: fontBold,
    size: 11,
  })
  y -= 22

  // === TABLE ===
  const rowH = 13
  const cols = [30, 65, 105, 105, 95, 100]
  const totalTableW = cols.reduce((s, c) => s + c, 0)
  const tableX = (width - totalTableW) / 2 // center table
  const colX: number[] = []
  let cx = tableX
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }
  const tableBorder = rgb(0.2, 0.2, 0.2) // darker border
  const headerBg = rgb(0.95, 0.95, 0.95)

  // Header row — centered text using drawCell
  const hH = 26
  drawCell(page, colX[0], y - hH, cols[0], hH, {
    text: 'Date',
    font: fontBold,
    fontSize: 8,
    align: 'center',
    bgColor: headerBg,
    borderColor: tableBorder,
  })
  drawCell(page, colX[1], y - hH, cols[1], hH, {
    text: 'Day',
    font: fontBold,
    fontSize: 8,
    align: 'center',
    bgColor: headerBg,
    borderColor: tableBorder,
  })

  // Multi-line centered headers
  drawCell(page, colX[2], y - hH, cols[2], hH, { bgColor: headerBg, borderColor: tableBorder })
  const h2a = 'TUNJANGAN LOKASI'
  const h2b = 'KHUSUS'
  page.drawText(h2a, {
    x: colX[2] + (cols[2] - fontBold.widthOfTextAtSize(h2a, 7)) / 2,
    y: y - 9,
    font: fontBold,
    size: 7,
  })
  page.drawText(h2b, {
    x: colX[2] + (cols[2] - fontBold.widthOfTextAtSize(h2b, 7)) / 2,
    y: y - 18,
    font: fontBold,
    size: 7,
  })

  drawCell(page, colX[3], y - hH, cols[3], hH, { bgColor: headerBg, borderColor: tableBorder })
  const h3a = 'TUNJANGAN'
  const h3b = 'PERTAMBANGAN'
  page.drawText(h3a, {
    x: colX[3] + (cols[3] - fontBold.widthOfTextAtSize(h3a, 7)) / 2,
    y: y - 9,
    font: fontBold,
    size: 7,
  })
  page.drawText(h3b, {
    x: colX[3] + (cols[3] - fontBold.widthOfTextAtSize(h3b, 7)) / 2,
    y: y - 18,
    font: fontBold,
    size: 7,
  })

  drawCell(page, colX[4], y - hH, cols[4], hH, { bgColor: headerBg, borderColor: tableBorder })
  const h4a = 'TUNJANGAN'
  const h4b = 'MAKAN'
  page.drawText(h4a, {
    x: colX[4] + (cols[4] - fontBold.widthOfTextAtSize(h4a, 7)) / 2,
    y: y - 9,
    font: fontBold,
    size: 7,
  })
  page.drawText(h4b, {
    x: colX[4] + (cols[4] - fontBold.widthOfTextAtSize(h4b, 7)) / 2,
    y: y - 18,
    font: fontBold,
    size: 7,
  })

  drawCell(page, colX[5], y - hH, cols[5], hH, {
    text: 'Remarks',
    font: fontBold,
    fontSize: 8,
    align: 'center',
    bgColor: headerBg,
    borderColor: tableBorder,
  })
  y -= hH

  // Detect Field Break: 14+ consecutive days without attendance
  const FB_THRESHOLD = 14
  const fieldBreakDays = new Set<number>()
  let gapStart = -1
  let gapLen = 0
  for (const d of input.days) {
    const hasAttendance = d.status === 'present' || d.clockIn || d.clockOut
    if (!hasAttendance) {
      if (gapStart === -1) gapStart = d.day
      gapLen++
    } else {
      if (gapLen >= FB_THRESHOLD) {
        for (let g = gapStart; g < gapStart + gapLen; g++) fieldBreakDays.add(g)
      }
      gapStart = -1
      gapLen = 0
    }
  }
  if (gapLen >= FB_THRESHOLD && gapStart > 0) {
    for (let g = gapStart; g <= input.days.length; g++) fieldBreakDays.add(g)
  }

  // Rows
  let totalLokasi = 0
  let totalMsa = 0
  let totalMeals = 0

  for (const day of input.days) {
    y -= rowH
    if (y < 100) break
    const isFieldBreakDay = fieldBreakDays.has(day.day)

    const isOff =
      day.scheduleCode === 'OFF' || day.scheduleCode === 'Libur' || day.scheduleCode === 'Sakit'
    const isSunday = day.dayName === 'Sunday' || day.dayName === 'Saturday'
    const bgColor = day.isHoliday
      ? rgb(1, 1, 0.8)
      : isSunday && !day.clockIn
        ? rgb(1, 0.95, 0.95)
        : undefined
    const dayColor = isSunday || day.isHoliday ? rgb(0.8, 0, 0) : rgb(0, 0, 0)

    drawCell(page, colX[0], y, cols[0], rowH, {
      text: String(day.day),
      font,
      fontSize: 8,
      align: 'center',
      bgColor,
      color: dayColor,
    })
    drawCell(page, colX[1], y, cols[1], rowH, {
      text: day.dayName,
      font,
      fontSize: 7,
      align: 'center',
      bgColor,
      color: dayColor,
    })

    // Tunjangan Lokasi Khusus — semua hari
    const lokasiVal = input.lokasiKhususEnabled ? input.lokasiKhususRate : 0
    if (lokasiVal > 0) {
      drawCell(page, colX[2], y, cols[2], rowH, {
        text: `Rp     ${formatMoney(lokasiVal)}`,
        font,
        fontSize: 8,
        align: 'left',
        bgColor,
      })
      totalLokasi += lokasiVal
    } else {
      drawCell(page, colX[2], y, cols[2], rowH, { bgColor })
    }

    // MSA — semua hari dapat kecuali Field Break
    if (!isFieldBreakDay) {
      drawCell(page, colX[3], y, cols[3], rowH, {
        text: `Rp     ${formatMoney(input.msaRate)}`,
        font,
        fontSize: 8,
        align: 'left',
        bgColor,
      })
      totalMsa += input.msaRate
    } else {
      drawCell(page, colX[3], y, cols[3], rowH, {
        text: 'FB',
        font,
        fontSize: 7,
        align: 'center',
        bgColor: rgb(0.95, 0.9, 1),
      })
    }

    // Meals — semua hari dapat kecuali Field Break
    if (!isFieldBreakDay) {
      drawCell(page, colX[4], y, cols[4], rowH, {
        text: `Rp     ${formatMoney(input.mealsRate)}`,
        font,
        fontSize: 8,
        align: 'left',
        bgColor,
      })
      totalMeals += input.mealsRate
    } else {
      drawCell(page, colX[4], y, cols[4], rowH, {
        text: 'FB',
        font,
        fontSize: 7,
        align: 'center',
        bgColor: rgb(0.95, 0.9, 1),
      })
    }

    // Remarks
    let remark = ''
    if (day.isHoliday && day.holidayName) remark = day.holidayName
    else if (isOff) remark = day.scheduleCode
    drawCell(page, colX[5], y, cols[5], rowH, {
      text: remark,
      font,
      fontSize: 7,
      align: 'left',
      bgColor,
    })
  }

  // Total row
  y -= rowH
  const tBg = rgb(0.8, 1, 0.8)
  drawCell(page, colX[0], y, cols[0] + cols[1], rowH, {
    text: 'Total Amount Rupiah',
    font: fontBold,
    fontSize: 8,
    align: 'center',
    bgColor: tBg,
  })
  drawCell(page, colX[2], y, cols[2], rowH, {
    text: totalLokasi > 0 ? `Rp  ${formatMoney(totalLokasi)}` : '',
    font: fontBold,
    fontSize: 8,
    align: 'left',
    bgColor: tBg,
    color: rgb(0, 0.4, 0),
  })
  drawCell(page, colX[3], y, cols[3], rowH, {
    text: `Rp  ${formatMoney(totalMsa)}`,
    font: fontBold,
    fontSize: 8,
    align: 'left',
    bgColor: tBg,
    color: rgb(0, 0.4, 0),
  })
  drawCell(page, colX[4], y, cols[4], rowH, {
    text: `Rp  ${formatMoney(totalMeals)}`,
    font: fontBold,
    fontSize: 8,
    align: 'left',
    bgColor: tBg,
    color: rgb(0, 0.4, 0),
  })
  drawCell(page, colX[5], y, cols[5], rowH, { bgColor: tBg })

  // Signatures — proper spacing
  y -= 70
  const sigLabels2 = ['Dibuat Oleh,', 'Mengetahui,', 'Mengetahui,', 'Menyetujui,']
  const sigSpacing2 = (width - 100) / 4
  for (let i = 0; i < 4; i++) {
    const sx = 50 + i * sigSpacing2
    page.drawText(sigLabels2[i], { x: sx, y, font: fontItalic, size: 8, color: rgb(0.3, 0.3, 0.3) })
    page.drawLine({
      start: { x: sx - 5, y: y - 55 },
      end: { x: sx + 95, y: y - 55 },
      color: rgb(0.5, 0.5, 0.5),
      thickness: 0.5,
    })
  }

  return doc.save()
}

// ============================================================
// HELPER
// ============================================================
export function buildAttendanceDayData(params: {
  period: string
  dayCount: number
  getCell: (day: number) => { status: string; clockIn: string; clockOut: string }
  getScheduleCode: (day: number) => string
  holidays: Array<{ day?: number; date: string; localName?: string; name?: string }>
}): AttendanceDayData[] {
  const { period, dayCount, getCell, getScheduleCode, holidays } = params
  const holidayByDay = new Map(holidays.map((h) => [h.day ?? Number(h.date.slice(-2)), h]))

  return Array.from({ length: dayCount }, (_, i) => {
    const day = i + 1
    const cell = getCell(day)
    const holiday = holidayByDay.get(day)
    return {
      day,
      dayName: getDayName(period, day),
      status: cell.status,
      clockIn: cell.clockIn,
      clockOut: cell.clockOut,
      scheduleCode: getScheduleCode(day),
      isHoliday: Boolean(holiday),
      holidayName: holiday?.localName ?? holiday?.name,
    }
  })
}
