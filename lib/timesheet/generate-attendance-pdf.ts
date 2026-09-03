import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from 'pdf-lib'
import { type OvertimeCalculationResult, type OvertimeInterval } from '@/lib/timesheet/overtime-policy'
import {
  drawPdfSignatures,
  embedCustomLogo,
  type PdfSignatureNames,
} from '@/lib/timesheet/pdf-signatures'

type AttendanceDayData = {
  day: number
  dayName: string
  status: string
  clockIn: string
  clockOut: string
  scheduleCode: string
  isHoliday: boolean
  holidayName?: string
  overtime?: OvertimeCalculationResult
  workingTimeFrom?: string
  workingTimeTo?: string
  configuredOvertimeIntervals?: OvertimeInterval[]
  msaAmount?: number
  mealsAmount?: number
  specialAllowanceAmount?: number
  showMsa?: boolean
  showMeals?: boolean
  showSpecialAllowance?: boolean
}

type OvertimeRecordInput = {
  period: string
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  signatures: PdfSignatureNames
  days: AttendanceDayData[]
  isNonStaff: boolean
  showTotalOvertime?: boolean
}

type SiteAllowanceInput = {
  period: string
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  signatures: PdfSignatureNames
  days: AttendanceDayData[]
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



function extractSiteName(loc: string | null | undefined): string {
  if (!loc) return ''
  const parts = loc.split(' - ')
  return parts.length > 1 ? parts[parts.length - 1].trim() : loc.trim()
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
    wrap?: boolean
    pad?: number
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
    const cleanText = opts.text.replace(/[\r\t]/g, ' ').trim()
    if (!cleanText) return
    if (opts.wrap) {
      const pad = opts.pad ?? 4
      const maxWidth = Math.max(1, w - pad * 2)
      const lineHeight = fontSize * 0.9
      const maxLines = Math.max(1, Math.floor((h - 1) / lineHeight))
      const lines: string[] = []
      for (const paragraph of cleanText.split('\n')) {
        let line = ''
        for (const word of paragraph.split(/\s+/)) {
          const next = line ? `${line} ${word}` : word
          if (line && opts.font.widthOfTextAtSize(next, fontSize) > maxWidth) {
            lines.push(line)
            line = word
          } else {
            line = next
          }
        }
        if (line) lines.push(line)
      }
      // Pecah per karakter kata yang masih lebih lebar dari cell
      // (mis. nominal angka panjang di cell hari yang sempit)
      for (let i = 0; i < lines.length; i++) {
        if (opts.font.widthOfTextAtSize(lines[i], fontSize) <= maxWidth) continue
        let remainder = lines[i]
        const chunks: string[] = []
        while (remainder.length > 0) {
          let take = 1
          while (
            take < remainder.length &&
            opts.font.widthOfTextAtSize(remainder.slice(0, take + 1), fontSize) <= maxWidth
          ) {
            take++
          }
          chunks.push(remainder.slice(0, take))
          remainder = remainder.slice(take)
        }
        lines.splice(i, 1, ...chunks)
        i += chunks.length - 1
      }
      const visibleLines = lines.slice(0, maxLines)
      if (lines.length > maxLines && visibleLines.length) {
        const last = visibleLines.length - 1
        while (
          visibleLines[last].length > 1 &&
          opts.font.widthOfTextAtSize(`${visibleLines[last]}…`, fontSize) > maxWidth
        ) {
          visibleLines[last] = visibleLines[last].slice(0, -1)
        }
        visibleLines[last] = `${visibleLines[last]}…`
      }
      const firstY = y + (h + lineHeight * (visibleLines.length - 1)) / 2 - fontSize + 1
      visibleLines.forEach((line, index) => {
        const textWidth = opts.font!.widthOfTextAtSize(line, fontSize)
        const textX =
          opts.align === 'center'
            ? x + (w - textWidth) / 2
            : opts.align === 'right'
              ? x + w - textWidth - pad
              : x + pad
        page.drawText(line, {
          x: textX,
          y: firstY - index * lineHeight,
          font: opts.font!,
          size: fontSize,
          color: textColor,
        })
      })
      return
    }
    const cleanOneLine = cleanText.replace(/\n/g, ' ')
    // Kecilkan font otomatis jika teks lebih lebar dari cell
    let fitSize = fontSize
    const pad = opts.pad ?? 4
    const maxTextWidth = Math.max(1, w - pad * 2)
    let textWidth = opts.font.widthOfTextAtSize(cleanOneLine, fitSize)
    if (textWidth > maxTextWidth) {
      fitSize = Math.max(3.5, (fitSize * maxTextWidth) / textWidth)
      textWidth = opts.font.widthOfTextAtSize(cleanOneLine, fitSize)
    }
    let textX = x + pad
    if (opts.align === 'center') textX = x + (w - textWidth) / 2
    else if (opts.align === 'right') textX = x - textWidth + w - pad
    const textY = y + (h - fitSize) / 2 + 1
    page.drawText(cleanOneLine, {
      x: textX,
      y: textY,
      font: opts.font,
      size: fitSize,
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
  // Customer logo on right side
  if (input.signatures.logoUrl) {
    const custLogo = await embedCustomLogo(doc, input.signatures.logoUrl)
    if (custLogo) {
      page.drawImage(custLogo.image, {
        x: width - LM - custLogo.width,
        y: y - 15,
        width: custLogo.width,
        height: custLogo.height,
      })
    }
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
  const showTotal = input.showTotalOvertime !== false
  const cols = showTotal
    ? [30, 60, 50, 45, 50, 50, 50, 50, 150]
    : [30, 60, 50, 45, 50, 50, 0, 50, 200]
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
  if (showTotal) {
    drawCell(page, colX[6], y - hH, cols[6], hH, {
      text: 'Total\nOvertime',
      font: fontBold,
      fontSize: 7,
      align: 'center',
    })
  }
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
    const isStatusWithoutTime = day.status === 'standby' || day.status === 'field_break'
    const isSunday = day.dayName === 'Sunday' || day.dayName === 'Saturday'
    const isAbsent =
      day.status === 'sick' ||
      day.status === 'leave' ||
      day.status === 'absent' ||
      day.status === 'empty'
    const hasAttendance = !isAbsent && Boolean(
      day.clockIn || (day.workingTimeFrom && day.status !== 'empty' && !isOff)
    )
    const configuredOvertimeIntervals =
      day.configuredOvertimeIntervals ?? day.overtime?.intervals ?? []
    const hasOvertimeIntervals = configuredOvertimeIntervals.length > 0

    const formatOvertimeInterval = (interval: OvertimeInterval | undefined) =>
      interval ? `${String(interval.start).replace(':', '.')}-${String(interval.end).replace(':', '.')}` : ''
    const otFrom = formatOvertimeInterval(configuredOvertimeIntervals[0])
    const otTo = formatOvertimeInterval(configuredOvertimeIntervals[1])

    // Compute effective overtime hours
    let ot = day.overtime?.totalHours ?? 0
    if (isAbsent || isStatusWithoutTime || (isOff && !hasAttendance)) {
      ot = 0
    } else if (ot <= 0 && hasOvertimeIntervals) {
      ot = configuredOvertimeIntervals.reduce((sum, inv) => {
        if (!inv || !inv.start || !inv.end) return sum
        const [sh, sm] = String(inv.start).split(/[:.]/).map(Number)
        const [eh, em] = String(inv.end).split(/[:.]/).map(Number)
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return sum
        let startMin = sh * 60 + sm
        let endMin = eh * 60 + em
        if (endMin < startMin) endMin += 1440
        return sum + (endMin - startMin) / 60
      }, 0)
    }

    if (ot > 0 && !isAbsent && !isStatusWithoutTime && (!isOff || hasAttendance)) {
      totalOT += ot
    }

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

    if (isStatusWithoutTime) {
      drawCell(page, colX[2], y, cols[2], rowH, { bgColor })
      drawCell(page, colX[3], y, cols[3], rowH, { bgColor })
      drawCell(page, colX[4], y, cols[4], rowH, { bgColor })
      drawCell(page, colX[5], y, cols[5], rowH, { bgColor })
    } else if (isOff && !hasAttendance && !day.isHoliday && !hasOvertimeIntervals) {
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
    } else if (hasAttendance || hasOvertimeIntervals || day.isHoliday) {
      const shouldRenderWorkTimes = !isAbsent && !day.isHoliday && (day.workingTimeFrom || day.clockIn) && !isOff
      const workFrom = shouldRenderWorkTimes ? String(day.workingTimeFrom ?? day.clockIn ?? '').replace(':', '.') : ''
      const workTo = shouldRenderWorkTimes ? String(day.workingTimeTo ?? day.clockOut ?? '').replace(':', '.') : ''
      const shouldRenderOtTimes =
        hasOvertimeIntervals && !isAbsent && !isStatusWithoutTime && (!isOff || hasAttendance)

      drawCell(page, colX[2], y, cols[2], rowH, {
        text: isOff && !hasAttendance ? 'OFF' : workFrom,
        font: isOff && !hasAttendance ? fontBold : font,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
      drawCell(page, colX[3], y, cols[3], rowH, {
        text: workTo,
        font,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
      drawCell(page, colX[4], y, cols[4], rowH, {
        text: shouldRenderOtTimes ? otFrom : '',
        font,
        fontSize: otFrom.length > 5 ? 6 : 8,
        align: 'center',
        bgColor,
      })
      drawCell(page, colX[5], y, cols[5], rowH, {
        text: shouldRenderOtTimes ? otTo : '',
        font,
        fontSize: otTo.length > 5 ? 6 : 8,
        align: 'center',
        bgColor,
      })
    } else {
      drawCell(page, colX[2], y, cols[2], rowH, { bgColor })
      drawCell(page, colX[3], y, cols[3], rowH, { bgColor })
      drawCell(page, colX[4], y, cols[4], rowH, { bgColor })
      drawCell(page, colX[5], y, cols[5], rowH, { bgColor })
    }

    if (showTotal) {
      drawCell(page, colX[6], y, cols[6], rowH, {
        text: ot > 0 ? String(Math.round(ot * 100) / 100) : '',
        font: fontBold,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
    }
    drawCell(page, colX[7], y, cols[7], rowH, { bgColor })

    let remark = ''
    if (day.overtime?.splNumbers?.length) remark = `SPL ${day.overtime.splNumbers.join(', ')}`

    if (!remark && day.status === 'standby') remark = 'ST'
    else if (!remark && day.status === 'field_break') remark = 'FB'
    else if (!remark && day.isHoliday && day.holidayName) remark = day.holidayName
    else if (!remark && day.status === 'sick') remark = 'SICK'
    else if (!remark && day.status === 'leave') remark = 'IJIN'
    else if (!remark && day.status === 'absent') remark = 'ALPA'
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
      fontSize: 6,
      align: 'left',
      wrap: true,
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
  if (showTotal) {
    drawCell(page, colX[6], y, cols[6], rowH, {
      text: String(Math.round(totalOT * 10) / 10),
      font: fontBold,
      fontSize: 10,
      align: 'center',
      bgColor: tBg,
      color: rgb(0, 0.5, 0),
    })
  }
  drawCell(page, colX[7], y, cols[7], rowH, { bgColor: tBg })
  drawCell(page, colX[8], y, cols[8], rowH, { bgColor: tBg })

  // Signatures
  y -= 30
  drawPdfSignatures(page, { regular: font, italic: fontItalic }, y, input.signatures)

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
  // Customer logo on right side
  if (input.signatures.logoUrl) {
    const custLogo = await embedCustomLogo(doc, input.signatures.logoUrl)
    if (custLogo) {
      page.drawImage(custLogo.image, {
        x: width - LM - custLogo.width,
        y: y - 15,
        width: custLogo.width,
        height: custLogo.height,
      })
    }
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
  const h2a = 'TUNJANGAN KHUSUS'
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

    const lokasiVal = day.showSpecialAllowance === false ? 0 : (day.specialAllowanceAmount ?? 0)
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

    const msaAmount = day.showMsa === false ? 0 : (day.msaAmount ?? 0)
    if (msaAmount > 0) {
      drawCell(page, colX[3], y, cols[3], rowH, {
        text: `Rp     ${formatMoney(msaAmount)}`,
        font,
        fontSize: 8,
        align: 'left',
        bgColor,
      })
      totalMsa += msaAmount
    } else {
      drawCell(page, colX[3], y, cols[3], rowH, {
        text: day.showMsa === false ? '' : day.scheduleCode === 'FB' ? 'FB' : '',
        font,
        fontSize: 7,
        align: 'center',
        bgColor: isFieldBreakDay ? rgb(0.95, 0.9, 1) : bgColor,
      })
    }

    const mealsAmount = day.showMeals === false ? 0 : (day.mealsAmount ?? 0)
    if (mealsAmount > 0) {
      drawCell(page, colX[4], y, cols[4], rowH, {
        text: `Rp     ${formatMoney(mealsAmount)}`,
        font,
        fontSize: 8,
        align: 'left',
        bgColor,
      })
      totalMeals += mealsAmount
    } else {
      drawCell(page, colX[4], y, cols[4], rowH, {
        text: day.showMeals === false ? '' : day.scheduleCode === 'FB' ? 'FB' : '',
        font,
        fontSize: 7,
        align: 'center',
        bgColor: isFieldBreakDay ? rgb(0.95, 0.9, 1) : bgColor,
      })
    }

    // Remarks
    let remark = ''
    if (day.status === 'standby') remark = 'ST'
    else if (day.status === 'field_break') remark = 'FB'
    else if (day.isHoliday && day.holidayName) remark = day.holidayName
    else if (isOff) remark = day.scheduleCode
    drawCell(page, colX[5], y, cols[5], rowH, {
      text: remark,
      font,
      fontSize: 5.5,
      align: 'left',
      wrap: true,
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
  y -= 30
  drawPdfSignatures(page, { regular: font, italic: fontItalic }, y, input.signatures)

  return doc.save()
}

// ============================================================
// PER-PERSON ALLOWANCE RECORD PDF (MSA / Meals / Tunjangan Khusus)
// ============================================================
export type AllowanceRecordView = 'msa' | 'meals' | 'lokasi'

const ALLOWANCE_RECORD_TITLES: Record<AllowanceRecordView, string> = {
  msa: 'MSA RECORD',
  meals: 'MLS RECORD',
  lokasi: 'TU RECORD',
}

const ALLOWANCE_RECORD_COLUMNS: Record<AllowanceRecordView, string> = {
  msa: 'MSA',
  meals: 'MLS',
  lokasi: 'TU',
}

export async function generateEmployeeAllowanceRecordPdf(input: {
  view: AllowanceRecordView
  period: string
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  signatures: PdfSignatureNames
  days: Array<{
    day: number
    dayName: string
    scheduleCode: string
    status: string
    isHoliday: boolean
    holidayName?: string
    msaAmount: number
    mealsAmount: number
    specialAllowanceAmount: number
  }>
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const page = doc.addPage([595, 842])
  const { width } = page.getSize()
  const logo = await embedLogo(doc)

  const LM = 45
  let y = 790

  // Logo + judul
  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 15, width: logo.width, height: logo.height })
  }
  if (input.signatures.logoUrl) {
    const custLogo = await embedCustomLogo(doc, input.signatures.logoUrl)
    if (custLogo) {
      page.drawImage(custLogo.image, {
        x: width - LM - custLogo.width,
        y: y - 15,
        width: custLogo.width,
        height: custLogo.height,
      })
    }
  }
  const title1 = 'PT. CHITRA PARATAMA'
  const title2 = ALLOWANCE_RECORD_TITLES[input.view] ?? 'ALLOWANCE RECORD'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 14), y, font: fontBold, size: 14 })
  y -= 18
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 35

  // Info
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
  page.drawText(input.department || input.section, { x: valX, y, font: fontBold, size: 9 })
  y -= 15
  page.drawText('Site', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.siteName, { x: valX, y, font: fontBold, size: 9 })
  y -= 28

  // Tabel: Date | Day | [View] | Total | Remark
  const rowH = 15
  const cols = [30, 65, 115, 75, 220]
  const totalTableW = cols.reduce((s, c) => s + c, 0)
  const tableStartX = (width - totalTableW) / 2
  const colX: number[] = []
  let cx = tableStartX
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }
  const tableBorder = rgb(0.2, 0.2, 0.2)
  const headerBg = rgb(0.95, 0.95, 0.95)
  const hH = 20
  const headers = ['Date', 'Day', ALLOWANCE_RECORD_COLUMNS[input.view], 'Total', 'Remark']
  headers.forEach((label, index) => {
    drawCell(page, colX[index], y - hH, cols[index], hH, {
      text: label,
      font: fontBold,
      fontSize: 7,
      align: index === 4 ? 'left' : 'center',
      bgColor: headerBg,
      borderColor: tableBorder,
    })
  })
  y -= hH

  let total = 0
  for (const day of input.days) {
    y -= rowH
    if (y < 100) break

    const amount =
      input.view === 'msa'
        ? day.msaAmount
        : input.view === 'meals'
          ? day.mealsAmount
          : day.specialAllowanceAmount
    total += amount

    const isFb = day.scheduleCode === 'FB' || day.status === 'field_break'
    const isOff =
      day.scheduleCode === 'OFF' || day.scheduleCode === 'FB' || day.scheduleCode === 'Libur'
    const isSunday = day.dayName === 'Sunday' || day.dayName === 'Saturday'
    const bgColor = isFb
      ? rgb(0.95, 0.9, 1)
      : day.isHoliday
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
    drawCell(page, colX[2], y, cols[2], rowH, {
      text: amount > 0 ? `Rp  ${formatMoney(amount)}` : '',
      font,
      fontSize: 8,
      align: 'left',
      bgColor,
    })
    drawCell(page, colX[3], y, cols[3], rowH, {
      text: amount > 0 ? String(Math.round(amount)) : '',
      font: fontBold,
      fontSize: 8,
      align: 'center',
      bgColor,
    })

    let remark = ''
    if (day.status === 'standby') remark = 'ST'
    else if (day.status === 'field_break' || day.scheduleCode === 'FB') remark = 'FB'
    else if (day.isHoliday && day.holidayName) remark = day.holidayName
    else if (day.status === 'sick') remark = 'SICK'
    else if (day.status === 'leave') remark = 'IJIN'
    else if (day.status === 'absent') remark = 'ALPA'
    else if (isOff) remark = day.scheduleCode
    const rc =
      day.status === 'sick'
        ? rgb(0.7, 0.5, 0)
        : day.status === 'leave'
          ? rgb(0, 0.4, 0.7)
          : day.status === 'absent'
            ? rgb(0.8, 0, 0)
            : rgb(0.3, 0.3, 0.3)
    drawCell(page, colX[4], y, cols[4], rowH, {
      text: remark,
      font,
      fontSize: 6,
      align: 'left',
      wrap: true,
      bgColor,
      color: rc,
    })
  }

  // Total
  y -= rowH
  const tBg = rgb(0.8, 1, 0.8)
  drawCell(page, colX[0], y, cols[0] + cols[1], rowH, {
    text: 'TOTAL',
    font: fontBold,
    fontSize: 9,
    align: 'center',
    bgColor: tBg,
  })
  drawCell(page, colX[2], y, cols[2], rowH, {
    text: total > 0 ? `Rp  ${formatMoney(total)}` : '',
    font: fontBold,
    fontSize: 9,
    align: 'left',
    bgColor: tBg,
    color: rgb(0, 0.5, 0),
  })
  drawCell(page, colX[3], y, cols[3], rowH, {
    text: total > 0 ? String(Math.round(total)) : '',
    font: fontBold,
    fontSize: 9,
    align: 'center',
    bgColor: tBg,
    color: rgb(0, 0.5, 0),
  })
  drawCell(page, colX[4], y, cols[4], rowH, { bgColor: tBg })

  // Tanda tangan
  y -= 30
  drawPdfSignatures(page, { regular: font, italic: fontItalic }, y, input.signatures)

  return doc.save()
}

// ============================================================
// SUMMARY TABLE PDF (OT / MSA / Meals / Tunjangan Khusus)
// ============================================================
export type SummaryTableView = 'ot' | 'msa' | 'meals' | 'lokasi'

export const SUMMARY_TABLE_TITLES: Record<SummaryTableView, string> = {
  ot: 'OVERTIME SUMMARY',
  msa: 'MSA SUMMARY',
  meals: 'MLS SUMMARY',
  lokasi: 'TU SUMMARY',
}

export type SummaryTableRow = {
  no: number
  name: string
  sn: string
  loc: string
  department: string
  section: string
  dailyValues: Array<string | number | null>
  total: string
  remark: string
}

export type SummaryTableInput = {
  view: SummaryTableView
  period: string
  siteName: string
  project?: string
  dayCount: number
  rows: SummaryTableRow[]
  signatures: PdfSignatureNames
  holidays?: Array<{ day?: number; date: string; localName?: string; name?: string }>
}

export async function generateSummaryTablePdf(
  input: SummaryTableInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await embedLogo(doc)

  // Warna mengikuti template PDF yang sudah ada:
  // libur = kuning, weekend/OFF = pink, FB = ungu, total = hijau
  const holidayDays = new Set(
    (input.holidays ?? []).map((holiday) => holiday.day ?? Number(holiday.date.slice(-2)))
  )
  const cHolidayBg = rgb(1, 1, 0.75)
  const cWeekendBg = rgb(1, 0.93, 0.93)
  const cFbBg = rgb(0.95, 0.9, 1)
  const cTotalBg = rgb(0.8, 1, 0.8)
  const cRedText = rgb(0.8, 0, 0)
  const cGreenText = rgb(0, 0.5, 0)
  const cBlueText = rgb(0, 0.4, 0.7)

  const pageWidth = 842
  const pageHeight = 595
  const LM = 30
  const tableW = pageWidth - LM * 2
  const dayW = 16

  const widths: number[] = [
    18,
    Math.max(80, tableW - 18 - 40 - 42 - dayW * input.dayCount - 40 - 34),
    40,
    42,
  ]
  for (let i = 0; i < input.dayCount; i++) widths.push(dayW)
  widths.push(40, 34)

  const colX: number[] = []
  let cx = LM
  for (const w of widths) {
    colX.push(cx)
    cx += w
  }

  const headerLabels: string[] = ['No', 'Name', 'SN', 'LOC']
  for (let i = 1; i <= input.dayCount; i++) headerLabels.push(String(i))
  headerLabels.push('Total', 'Remark')

  const headerBg = rgb(0.9, 0.9, 0.9)
  const rowH = 15
  const groupH = 12

  let page = doc.addPage([pageWidth, pageHeight])
  let y = 0

  const drawTableHeader = (top: number) => {
    headerLabels.forEach((label, index) => {
      const isDayColumn = index >= 4 && index < 4 + input.dayCount
      const isTotalColumn = index === 4 + input.dayCount
      let bgColor = headerBg
      let textColor = rgb(0, 0, 0)
      if (isDayColumn) {
        const day = index - 3
        const dayName = getDayName(input.period, day)
        const isWeekend = dayName === 'Saturday' || dayName === 'Sunday'
        const isHoliday = holidayDays.has(day)
        if (isHoliday) {
          bgColor = cHolidayBg
          textColor = cRedText
        } else if (isWeekend) {
          bgColor = cWeekendBg
          textColor = cRedText
        }
      } else if (isTotalColumn) {
        bgColor = cTotalBg
        textColor = cGreenText
      }
      drawCell(page, colX[index], top - 15, widths[index], 15, {
        text: label,
        font: fontBold,
        fontSize: 6,
        align: index === 1 ? 'left' : 'center',
        bgColor,
        color: textColor,
      })
    })
  }

  // Header halaman pertama: logo + judul (logo diposisikan agar tidak terpotong)
  if (logo) {
    page.drawImage(logo.image, {
      x: LM,
      y: pageHeight - 62,
      width: logo.width,
      height: logo.height,
    })
  }
  if (input.signatures.logoUrl) {
    const custLogo = await embedCustomLogo(doc, input.signatures.logoUrl)
    if (custLogo) {
      page.drawImage(custLogo.image, {
        x: pageWidth - LM - custLogo.width,
        y: pageHeight - 62,
        width: custLogo.width,
        height: custLogo.height,
      })
    }
  }
  const title1 = 'PT. CHITRA PARATAMA'
  const title2 = SUMMARY_TABLE_TITLES[input.view] ?? 'SUMMARY'
  page.drawText(title1, {
    x: centerX(pageWidth, title1, fontBold, 13),
    y: pageHeight - 32,
    font: fontBold,
    size: 13,
  })
  page.drawText(title2, {
    x: centerX(pageWidth, title2, fontBold, 11),
    y: pageHeight - 48,
    font: fontBold,
    size: 11,
  })
  const subtitle = [formatPeriodLabel(input.period), input.siteName, input.project]
    .filter(Boolean)
    .join('  ·  ')
  page.drawText(subtitle, {
    x: centerX(pageWidth, subtitle, font, 8),
    y: pageHeight - 62,
    font,
    size: 8,
  })

  y = pageHeight - 72
  drawTableHeader(y)
  y -= 15

  const bottomLimit = 80

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomLimit) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - 20
      drawTableHeader(y)
      y -= 15
    }
  }

  let prevDept = ''
  let prevSection = ''

  for (const row of input.rows) {
    if (row.department !== prevDept || row.section !== prevSection) {
      ensureSpace(groupH + rowH)
      const label =
        row.section && row.section !== row.department
          ? `${row.department} · ${row.section}`
          : row.department
      drawCell(page, LM, y - groupH, tableW, groupH, {
        text: label,
        font: fontBold,
        fontSize: 6.5,
        align: 'left',
        bgColor: rgb(0.96, 0.96, 0.96),
      })
      y -= groupH
      prevDept = row.department
      prevSection = row.section
    }

    ensureSpace(rowH)

    drawCell(page, colX[0], y - rowH, widths[0], rowH, {
      text: String(row.no),
      font,
      fontSize: 6,
      align: 'center',
    })
    drawCell(page, colX[1], y - rowH, widths[1], rowH, {
      text: row.name,
      font,
      fontSize: 6,
      align: 'left',
      wrap: true,
    })
    drawCell(page, colX[2], y - rowH, widths[2], rowH, {
      text: row.sn,
      font,
      fontSize: 6,
      align: 'center',
    })
    drawCell(page, colX[3], y - rowH, widths[3], rowH, {
      text: extractSiteName(row.loc),
      font,
      fontSize: 6,
      align: 'center',
    })
    row.dailyValues.forEach((value, index) => {
      const text =
        value === null || value === undefined || value === '' ? '' : String(value)
      let cellBg: ReturnType<typeof rgb> | undefined
      let cellColor: ReturnType<typeof rgb> = rgb(0, 0, 0)
      if (text === 'OFF' || text === 'Libur' || text === 'Sakit') {
        cellBg = cWeekendBg
        cellColor = cRedText
      } else if (text === 'FB') {
        cellBg = cFbBg
      } else if (text === 'ST') {
        cellColor = cBlueText
      } else if (text === 'SPL') {
        cellColor = cRedText
      } else if (text === 'Izin') {
        cellColor = cBlueText
      } else if (text === 'Alpha') {
        cellColor = cRedText
      }
      drawCell(page, colX[4 + index], y - rowH, widths[4 + index], rowH, {
        text,
        font,
        fontSize: 5,
        align: 'center',
        bgColor: cellBg,
        color: cellColor,
        pad: 1.5,
      })
    })
    drawCell(page, colX[4 + input.dayCount], y - rowH, widths[4 + input.dayCount], rowH, {
      text: row.total,
      font: fontBold,
      fontSize: 6.5,
      align: 'center',
      bgColor: cTotalBg,
      color: cGreenText,
    })
    drawCell(page, colX[5 + input.dayCount], y - rowH, widths[5 + input.dayCount], rowH, {
      text: row.remark,
      font,
      fontSize: 5.5,
      align: 'center',
    })
    y -= rowH
  }

  // Tanda tangan di halaman terakhir
  if (y < 150) {
    page = doc.addPage([pageWidth, pageHeight])
  }
  drawPdfSignatures(page, { regular: font, italic: fontItalic }, 140, input.signatures)

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
  getOvertime?: (day: number) => OvertimeCalculationResult
}): AttendanceDayData[] {
  const { period, dayCount, getCell, getScheduleCode, holidays, getOvertime } = params
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
      overtime: getOvertime?.(day),
    }
  })
}
