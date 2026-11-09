import { PDFDocument, rgb, StandardFonts, PDFString, type PDFPage, type PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'
import { type OvertimeCalculationResult, type OvertimeInterval } from '@/lib/timesheet/overtime-policy'
import {
  drawPdfSignatures,
  embedCustomLogo,
  type PdfSignatureNames,
} from '@/lib/timesheet/pdf-signatures'

export type AttendanceDayData = {
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
  splNumber?: string
  splTitle?: string
  splStatus?: string
  splDetails?: Array<{
    splNumber: string
    title?: string
    plannedStartAt?: string
    plannedEndAt?: string
    status?: string
  }>
}

type OvertimeRecordInput = {
  documentTitle?: string
  period: string
  employeeId?: number
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  signatures: PdfSignatureNames
  days: AttendanceDayData[]
  isNonStaff?: boolean
  overtimeMode?: 'template' | 'realtime' | 'spl' | string
  showTotalOvertime?: boolean
  evidenceUrl?: string
  appBaseUrl?: string
  isPjo?: boolean
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
      const effectiveFontSize = fontSize
      const lineHeight = Math.max(7, effectiveFontSize * 1.15)
      const maxLines = Math.max(1, Math.floor((h - 2) / lineHeight))
      const lines: string[] = []
      for (const paragraph of cleanText.split('\n')) {
        let line = ''
        for (const word of paragraph.split(/\s+/)) {
          const next = line ? `${line} ${word}` : word
          if (line && opts.font.widthOfTextAtSize(next, effectiveFontSize) > maxWidth) {
            lines.push(line)
            line = word
          } else {
            line = next
          }
        }
        if (line) lines.push(line)
      }
      // Pecah per karakter kata yang masih lebih lebar dari cell
      for (let i = 0; i < lines.length; i++) {
        if (opts.font.widthOfTextAtSize(lines[i], effectiveFontSize) <= maxWidth) continue
        let remainder = lines[i]
        const chunks: string[] = []
        while (remainder.length > 0) {
          let take = 1
          while (
            take < remainder.length &&
            opts.font.widthOfTextAtSize(remainder.slice(0, take + 1), effectiveFontSize) <= maxWidth
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
          opts.font.widthOfTextAtSize(`${visibleLines[last]}…`, effectiveFontSize) > maxWidth
        ) {
          visibleLines[last] = visibleLines[last].slice(0, -1)
        }
        visibleLines[last] = `${visibleLines[last]}…`
      }
      // Top-align text inside cell bounded safely between top (y + h) and bottom (y)
      const totalTextH = (visibleLines.length - 1) * lineHeight + effectiveFontSize
      const topPad = Math.max(2, (h - totalTextH) / 2)
      const firstY = y + h - topPad - effectiveFontSize
      visibleLines.forEach((line, index) => {
        const textWidth = opts.font!.widthOfTextAtSize(line, effectiveFontSize)
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
          size: effectiveFontSize,
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
    let logoBytes: Uint8Array | null = null
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const filePath = path.join(process.cwd(), 'public', 'cp_logo-removebg-preview.png')
        if (fs.existsSync(filePath)) {
          logoBytes = new Uint8Array(fs.readFileSync(filePath))
        }
      } catch {
        // Fallback to fetch
      }
    }
    if (!logoBytes) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      const timeoutId = controller ? setTimeout(() => controller.abort(), 1000) : null
      const response = await fetch('/cp_logo-removebg-preview.png', {
        signal: controller?.signal,
      })
      if (timeoutId) clearTimeout(timeoutId)
      if (!response.ok) return null
      logoBytes = new Uint8Array(await response.arrayBuffer())
    }
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

  const LM = 47
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
  const title2 = input.documentTitle || 'OVER TIME RECORD'
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
  page.drawText(input.department || input.section, { x: valX, y, font: fontBold, size: 9 })
  y -= 15
  page.drawText('Site', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  page.drawText(input.siteName, { x: valX, y, font: fontBold, size: 9 })
  y -= 15
  page.drawText('Overtime rate/hours', { x: LM, y, font, size: 9 })
  page.drawText(':', { x: colonX, y, font, size: 9 })
  y -= 22

  // === TABLE (9 Columns Authentic Overtime Record matching media_1791434007640.png) ===
  const rowH = 15
  const cols = [32, 60, 48, 48, 70, 70, 52, 40, 81]
  const totalTableW = cols.reduce((s, c) => s + c, 0)
  const tableStartX = (width - totalTableW) / 2
  const colX: number[] = []
  let cx = tableStartX
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  // Header (2 sub-rows)
  const hH = 26
  drawCell(page, colX[0], y - hH, cols[0], hH, {
    text: 'Date',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })
  drawCell(page, colX[1], y - hH, cols[1], hH, {
    text: 'Day',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })

  // Working Time Header Group
  drawCell(page, colX[2], y - 13, cols[2] + cols[3], 13, {
    text: 'Working Time',
    font: fontBold,
    fontSize: 7.5,
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

  // Overtime Header Group
  drawCell(page, colX[4], y - 13, cols[4] + cols[5], 13, {
    text: 'Overtime',
    font: fontBold,
    fontSize: 7.5,
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

  // Total Overtime, WD, Remarks
  drawCell(page, colX[6], y - hH, cols[6], hH, {
    text: 'Total Overtime',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[7], y - hH, cols[7], hH, {
    text: 'WD',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })
  drawCell(page, colX[8], y - hH, cols[8], hH, {
    text: 'Remarks',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })

  y -= hH

  // Rows
  let totalOT = 0
  const showTotal = input.showTotalOvertime ?? true

  for (const day of input.days) {
    y -= rowH
    if (y < 90) break

    const isOff =
      day.scheduleCode === 'OFF' ||
      day.scheduleCode === 'FB' ||
      day.scheduleCode === 'Libur' ||
      day.status === 'off'
    const isStatusWithoutTime = day.status === 'standby' || day.status === 'field_break'
    const isSunday = day.dayName === 'Sunday' || day.dayName === 'Saturday'
    const isAbsent =
      day.status === 'sick' ||
      day.status === 'leave' ||
      day.status === 'absent' ||
      day.status === 'empty'
    const hasManualAttendance = Boolean(
      (day.clockIn && day.clockIn.trim() !== '') ||
      (day.clockOut && day.clockOut.trim() !== '') ||
      day.status === 'present'
    )
    const hasAttendance =
      !isAbsent &&
      (hasManualAttendance || (Boolean(day.workingTimeFrom) && day.status !== 'empty' && !isOff))
    const configuredOvertimeIntervals =
      isOff && !hasManualAttendance
        ? []
        : (day.configuredOvertimeIntervals ?? day.overtime?.intervals ?? [])
    const hasOvertimeIntervals = configuredOvertimeIntervals.length > 0

    const formatOvertimeInterval = (interval: OvertimeInterval | undefined) =>
      interval ? `${String(interval.start).replace(':', '.')}` : ''
    const formatOvertimeIntervalEnd = (interval: OvertimeInterval | undefined) =>
      interval ? `${String(interval.end).replace(':', '.')}` : ''

    let otFrom = formatOvertimeInterval(configuredOvertimeIntervals[0])
    let otTo = formatOvertimeIntervalEnd(
      configuredOvertimeIntervals[configuredOvertimeIntervals.length - 1] || configuredOvertimeIntervals[0]
    )

    let ot = day.overtime?.totalHours ?? 0
    const isRealtimeMode = input.overtimeMode === 'realtime'

    // Jika mode realtime, atau hari libur/OFF: Overtime To mengikuti jam realtime pulang aktual (clockOut)
    // Khusus mode template (Wajib Lembur): Overtime To tetap mengikuti template (misal 19.00), kecuali lembur diperpanjang
    if (ot > 0 && hasManualAttendance && day.clockOut && (isRealtimeMode || isOff)) {
      otTo = day.clockOut.replace(':', '.')
    }

    if (otFrom === '00.00' && otTo === '00.00') {
      if (hasManualAttendance && day.clockIn && day.clockOut) {
        otFrom = day.clockIn.replace(':', '.')
        otTo = day.clockOut.replace(':', '.')
      } else {
        otFrom = ''
        otTo = ''
      }
    }
    if (isAbsent || isStatusWithoutTime || (isOff && !hasManualAttendance)) {
      ot = 0
    } else if (ot <= 0 && isOff && hasManualAttendance && day.clockIn && day.clockOut) {
      const [sh, sm] = day.clockIn.split(/[:.]/).map(Number)
      const [eh, em] = day.clockOut.split(/[:.]/).map(Number)
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let startMin = sh * 60 + sm
        let endMin = eh * 60 + em
        if (endMin < startMin) endMin += 1440
        ot = Math.round(((endMin - startMin) / 60) * 10) / 10
      }
    } else if (ot <= 0 && hasOvertimeIntervals && !isOff && (hasAttendance || day.isHoliday)) {
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

    if (otFrom && otTo) {
      const [sh, sm] = otFrom.split(/[:.]/).map(Number)
      const [eh, em] = otTo.split(/[:.]/).map(Number)
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let startMin = sh * 60 + sm
        let endMin = eh * 60 + em
        if (endMin < startMin) endMin += 1440
        let diffHours = Math.round(((endMin - startMin) / 60) * 10) / 10
        if (diffHours >= 12) diffHours = 11
        if (diffHours > 0) ot = diffHours
      }
    }

    if (ot > 0 && !isAbsent && !isStatusWithoutTime && (!isOff || hasManualAttendance)) {
      totalOT += ot
    }

    const bgColor = day.isHoliday
      ? rgb(1, 1, 0.75)
      : isSunday || isOff
        ? rgb(1, 0.93, 0.93)
        : undefined
    const dayColor = isSunday || day.isHoliday ? rgb(0.8, 0, 0) : rgb(0, 0, 0)

    // Col 0: Date
    drawCell(page, colX[0], y, cols[0], rowH, {
      text: String(day.day),
      font,
      fontSize: 8,
      align: 'center',
      bgColor,
      color: dayColor,
    })
    // Col 1: Day
    drawCell(page, colX[1], y, cols[1], rowH, {
      text: day.dayName,
      font,
      fontSize: 7.5,
      align: 'center',
      bgColor,
      color: dayColor,
    })

    const shouldRenderWorkTimes =
      !isAbsent &&
      (!day.isHoliday || hasManualAttendance) &&
      Boolean(day.workingTimeFrom !== undefined ? day.workingTimeFrom : day.clockIn) &&
      (!isOff || hasManualAttendance)
    const workFrom = shouldRenderWorkTimes
      ? String(day.workingTimeFrom !== undefined ? day.workingTimeFrom : day.clockIn ?? '').replace(':', '.')
      : ''
    const workTo = shouldRenderWorkTimes
      ? String(day.workingTimeTo !== undefined ? day.workingTimeTo : day.clockOut ?? '').replace(':', '.')
      : ''
    const shouldRenderOtTimes =
      hasOvertimeIntervals && !isAbsent && !isStatusWithoutTime && (!isOff || hasManualAttendance)

    // Col 2-3: Working Time From & To
    drawCell(page, colX[2], y, cols[2], rowH, {
      text: isOff && !hasManualAttendance ? 'OFF' : workFrom,
      font: isOff && !hasManualAttendance ? fontBold : font,
      fontSize: 7.5,
      align: 'center',
      bgColor,
    })
    drawCell(page, colX[3], y, cols[3], rowH, {
      text: workTo,
      font,
      fontSize: 7.5,
      align: 'center',
      bgColor,
    })

    // Col 4-5: Overtime From & To
    drawCell(page, colX[4], y, cols[4], rowH, {
      text: shouldRenderOtTimes ? otFrom : '',
      font,
      fontSize: otFrom.length > 8 ? 6 : 7.5,
      align: 'center',
      bgColor,
    })
    drawCell(page, colX[5], y, cols[5], rowH, {
      text: shouldRenderOtTimes ? otTo : '',
      font,
      fontSize: otTo.length > 8 ? 6 : 7.5,
      align: 'center',
      bgColor,
    })

    // Col 6: Total Overtime
    if (showTotal) {
      drawCell(page, colX[6], y, cols[6], rowH, {
        text: ot > 0 ? String(Math.round(ot * 10) / 10) : '',
        font: fontBold,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
    } else {
      drawCell(page, colX[6], y, cols[6], rowH, { bgColor })
    }

    // Col 7: WD
    const rawWd = day.status === 'standby' ? 'ST' : day.status === 'field_break' ? 'FB' : day.scheduleCode || ''
    const wdCode = rawWd === 'OFF' ? '' : rawWd
    drawCell(page, colX[7], y, cols[7], rowH, {
      text: wdCode,
      font,
      fontSize: 7,
      align: 'center',
      bgColor,
    })

    // Col 8: Remarks
    let remark = ''
    if (day.status === 'standby') remark = 'ST'
    else if (day.status === 'field_break') remark = 'FB'
    else if (day.isHoliday && day.holidayName) remark = day.holidayName
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
      fontSize: 6,
      align: 'center',
      color: rc,
      bgColor,
    })
  }

  // Total Row
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
      fontSize: 9.5,
      align: 'center',
      bgColor: tBg,
      color: rgb(0, 0.5, 0),
    })
  } else {
    drawCell(page, colX[6], y, cols[6], rowH, { bgColor: tBg })
  }
  drawCell(page, colX[7], y, cols[7], rowH, { bgColor: tBg })
  drawCell(page, colX[8], y, cols[8], rowH, { bgColor: tBg })

  // Signatures (4 equal columns across printable width, no QR code)
  y -= 30
  await drawOvertimeRecordSignatures(doc, page, { regular: font, italic: fontItalic, bold: fontBold }, y, input)

  return doc.save()
}

// ============================================================
// SUMMARY SPL PDF (6 Columns matching user PDF standard)
// ============================================================
// SUMMARY SPL PDF (6 Columns matching official PT Chitra Paratama standard)
// ============================================================
export async function appendSummarySplPersonPages(
  doc: PDFDocument,
  input: OvertimeRecordInput,
  sharedAssets: {
    font: PDFFont
    fontBold: PDFFont
    fontItalic: PDFFont
    logo: { image: any; width: number; height: number } | null
  }
): Promise<void> {
  const { font, fontBold, fontItalic, logo } = sharedAssets
  let page = doc.addPage([595, 842])
  const { width } = page.getSize()

  const LM = 45
  let y = 790

  // === LOGO + HEADER ===
  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 15, width: logo.width, height: logo.height })
  }
  // Customer logo on right side if provided and NOT duplicate
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
  const title2 = input.documentTitle || 'SUMMARY SPL'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 14), y, font: fontBold, size: 14 })
  y -= 18
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 35

  // === INFO ===
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
  y -= 22

  // === TABLE (6 Columns SPL Summary matching user screenshot) ===
  const rowH = 15
  // cols: Tanggal (32), Hari (60), Jam Lembur Mulai (48), Jam Lembur Selesai (48), Total Lembur (60), Yang Dikerjakan (257)
  const cols = [32, 60, 48, 48, 60, 257]
  const totalTableW = cols.reduce((s, c) => s + c, 0)
  const tableStartX = (width - totalTableW) / 2
  const colX: number[] = []
  let cx = tableStartX
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  // Header (2 sub-rows)
  const hH = 26
  drawCell(page, colX[0], y - hH, cols[0], hH, {
    text: 'Tanggal',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })
  drawCell(page, colX[1], y - hH, cols[1], hH, {
    text: 'Hari',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })

  // Jam Lembur Header Group
  drawCell(page, colX[2], y - 13, cols[2] + cols[3], 13, {
    text: 'Jam Lembur',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })
  drawCell(page, colX[2], y - hH, cols[2], 13, {
    text: 'Mulai',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })
  drawCell(page, colX[3], y - hH, cols[3], 13, {
    text: 'Selesai',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })

  // Total Lembur
  drawCell(page, colX[4], y - hH, cols[4], hH, {
    text: 'Total Lembur',
    font: fontBold,
    fontSize: 7,
    align: 'center',
  })

  // Yang Dikerjakan
  drawCell(page, colX[5], y - hH, cols[5], hH, {
    text: 'Yang Dikerjakan',
    font: fontBold,
    fontSize: 7.5,
    align: 'center',
  })

  y -= hH

  // Rows
  let totalOT = 0
  const showTotal = input.showTotalOvertime ?? true

  for (const day of input.days) {
    const isOff =
      day.scheduleCode === 'OFF' ||
      day.scheduleCode === 'FB' ||
      day.scheduleCode === 'Libur' ||
      day.status === 'off'
    const isStatusWithoutTime = day.status === 'standby' || day.status === 'field_break'
    const isSunday = day.dayName === 'Sunday' || day.dayName === 'Saturday'
    const isAbsent =
      day.status === 'sick' ||
      day.status === 'leave' ||
      day.status === 'absent' ||
      day.status === 'empty'
    const hasManualAttendance = Boolean(
      (day.clockIn && day.clockIn.trim() !== '') ||
      (day.clockOut && day.clockOut.trim() !== '') ||
      day.status === 'present'
    )
    const hasAttendance =
      !isAbsent &&
      (hasManualAttendance || (Boolean(day.workingTimeFrom) && day.status !== 'empty' && !isOff))
    const configuredOvertimeIntervals =
      isOff && !hasManualAttendance
        ? []
        : (day.configuredOvertimeIntervals ?? day.overtime?.intervals ?? [])
    const hasOvertimeIntervals = configuredOvertimeIntervals.length > 0

    const formatOvertimeInterval = (interval: OvertimeInterval | undefined) =>
      interval ? `${String(interval.start).replace(':', '.')}` : ''
    const formatOvertimeIntervalEnd = (interval: OvertimeInterval | undefined) =>
      interval ? `${String(interval.end).replace(':', '.')}` : ''

    let otFrom = formatOvertimeInterval(configuredOvertimeIntervals[0])
    let otTo = formatOvertimeIntervalEnd(
      configuredOvertimeIntervals[configuredOvertimeIntervals.length - 1] || configuredOvertimeIntervals[0]
    )

    let ot = day.overtime?.totalHours ?? 0
    const isRealtimeMode = input.overtimeMode === 'realtime'

    // Jika mode realtime, atau hari libur/OFF: Overtime To mengikuti jam realtime pulang aktual (clockOut)
    // Khusus mode template (Wajib Lembur): Overtime To tetap mengikuti template (misal 19.00), kecuali lembur diperpanjang
    if (ot > 0 && hasManualAttendance && day.clockOut && (isRealtimeMode || isOff)) {
      otTo = day.clockOut.replace(':', '.')
    }

    if (otFrom === '00.00' && otTo === '00.00') {
      if (hasManualAttendance && day.clockIn && day.clockOut) {
        otFrom = day.clockIn.replace(':', '.')
        otTo = day.clockOut.replace(':', '.')
      } else {
        otFrom = ''
        otTo = ''
      }
    }
    if (isAbsent || isStatusWithoutTime || (isOff && !hasManualAttendance)) {
      ot = 0
    } else if (ot <= 0 && isOff && hasManualAttendance && day.clockIn && day.clockOut) {
      const [sh, sm] = day.clockIn.split(/[:.]/).map(Number)
      const [eh, em] = day.clockOut.split(/[:.]/).map(Number)
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let startMin = sh * 60 + sm
        let endMin = eh * 60 + em
        if (endMin < startMin) endMin += 1440
        ot = Math.round(((endMin - startMin) / 60) * 10) / 10
      }
    } else if (ot <= 0 && hasOvertimeIntervals && !isOff && (hasAttendance || day.isHoliday)) {
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

    if (ot > 0 && otFrom && otTo) {
      const [sh, sm] = otFrom.split(/[:.]/).map(Number)
      const [eh, em] = otTo.split(/[:.]/).map(Number)
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let startMin = sh * 60 + sm
        let endMin = eh * 60 + em
        if (endMin < startMin) endMin += 1440
        const intervalHours = (endMin - startMin) / 60
        if (ot > intervalHours) {
          const expectedEndMin = startMin + Math.round(ot * 60)
          const normEnd = expectedEndMin % 1440
          const hh = String(Math.floor(normEnd / 60)).padStart(2, '0')
          const mm = String(normEnd % 60).padStart(2, '0')
          otTo = `${hh}.${mm}`
        }
      }
    }

    if (ot > 0 && !isAbsent && !isStatusWithoutTime && (!isOff || hasManualAttendance)) {
      totalOT += ot
    }

    const taskDesc = day.splTitle || (ot > 0 ? 'Penugasan Lembur' : '')

    // Hitung tinggi baris dinamis agar deskripsi pekerjaan panjang tidak pernah terpotong / bertumpuk
    const maxTextW = cols[5] - 8
    let taskLines = 1
    if (taskDesc && font) {
      let linesCount = 0
      for (const paragraph of taskDesc.split('\n')) {
        let line = ''
        for (const word of paragraph.split(/\s+/)) {
          const test = line ? `${line} ${word}` : word
          if (line && font.widthOfTextAtSize(test, 6.5) > maxTextW) {
            linesCount++
            line = word
          } else {
            line = test
          }
        }
        if (line) linesCount++
      }
      taskLines = Math.max(1, linesCount)
    }
    const dynamicRowH = Math.max(14, taskLines * 8.5 + 5)

    // Jika baris berikutnya melebihi batas bawah halaman, buat halaman baru (halaman 2, 3, dst)
    if (y - dynamicRowH < 90) {
      page = doc.addPage([595, 842])
      y = 790

      // Sub-header halaman lanjutan
      const titleCont = 'PT. CHITRA PARATAMA — SUMMARY SPL (Lanjutan)'
      page.drawText(titleCont, { x: centerX(width, titleCont, fontBold, 10), y, font: fontBold, size: 10 })
      y -= 22

      // Re-draw Table Header
      drawCell(page, colX[0], y - hH, cols[0], hH, { text: 'Tanggal', font: fontBold, fontSize: 7.5, align: 'center' })
      drawCell(page, colX[1], y - hH, cols[1], hH, { text: 'Hari', font: fontBold, fontSize: 7.5, align: 'center' })
      drawCell(page, colX[2], y - 13, cols[2] + cols[3], 13, { text: 'Jam Lembur', font: fontBold, fontSize: 7.5, align: 'center' })
      drawCell(page, colX[2], y - hH, cols[2], 13, { text: 'Mulai', font: fontBold, fontSize: 7, align: 'center' })
      drawCell(page, colX[3], y - hH, cols[3], 13, { text: 'Selesai', font: fontBold, fontSize: 7, align: 'center' })
      drawCell(page, colX[4], y - hH, cols[4], hH, { text: 'Total Lembur', font: fontBold, fontSize: 7, align: 'center' })
      drawCell(page, colX[5], y - hH, cols[5], hH, { text: 'Yang Dikerjakan', font: fontBold, fontSize: 7.5, align: 'center' })

      y -= hH
    }

    y -= dynamicRowH

    const bgColor = day.isHoliday
      ? rgb(1, 1, 0.75)
      : isSunday || isOff
        ? rgb(1, 0.93, 0.93)
        : undefined
    const dayColor = isSunday || day.isHoliday ? rgb(0.8, 0, 0) : rgb(0, 0, 0)

    // Col 0: Tanggal
    drawCell(page, colX[0], y, cols[0], dynamicRowH, {
      text: String(day.day),
      font,
      fontSize: 8,
      align: 'center',
      bgColor,
      color: dayColor,
    })
    // Col 1: Hari
    drawCell(page, colX[1], y, cols[1], dynamicRowH, {
      text: day.dayName,
      font,
      fontSize: 7.5,
      align: 'center',
      bgColor,
      color: dayColor,
    })

    const shouldRenderOtTimes =
      hasOvertimeIntervals && !isAbsent && !isStatusWithoutTime && (!isOff || hasManualAttendance)

    // Col 2-3: Overtime Mulai & Selesai
    drawCell(page, colX[2], y, cols[2], dynamicRowH, {
      text: shouldRenderOtTimes ? otFrom : '',
      font,
      fontSize: otFrom.length > 8 ? 6 : 7.5,
      align: 'center',
      bgColor,
    })
    drawCell(page, colX[3], y, cols[3], dynamicRowH, {
      text: shouldRenderOtTimes ? otTo : '',
      font,
      fontSize: otTo.length > 8 ? 6 : 7.5,
      align: 'center',
      bgColor,
    })

    // Col 4: Total Lembur
    if (showTotal) {
      drawCell(page, colX[4], y, cols[4], dynamicRowH, {
        text: ot > 0 ? String(Math.round(ot * 10) / 10) : '',
        font: fontBold,
        fontSize: 8,
        align: 'center',
        bgColor,
      })
    } else {
      drawCell(page, colX[4], y, cols[4], dynamicRowH, { bgColor })
    }

    // Col 5: Yang Dikerjakan
    drawCell(page, colX[5], y, cols[5], dynamicRowH, {
      text: taskDesc,
      font,
      fontSize: 6.5,
      align: 'left',
      wrap: true,
      bgColor,
    })
  }

  // Jika baris total & tanda tangan tidak cukup di halaman terakhir, pindahkan tanda tangan ke halaman baru
  if (y - 90 < 50) {
    page = doc.addPage([595, 842])
    y = 790
  }

  // Total Row
  y -= rowH
  const tBg = rgb(0.8, 1, 0.8)
  const tW = cols[0] + cols[1] + cols[2] + cols[3]
  drawCell(page, colX[0], y, tW, rowH, {
    text: 'TOTAL',
    font: fontBold,
    fontSize: 9,
    align: 'center',
    bgColor: tBg,
  })
  if (showTotal) {
    drawCell(page, colX[4], y, cols[4], rowH, {
      text: String(Math.round(totalOT * 10) / 10),
      font: fontBold,
      fontSize: 9.5,
      align: 'center',
      bgColor: tBg,
      color: rgb(0, 0.5, 0),
    })
  } else {
    drawCell(page, colX[4], y, cols[4], rowH, { bgColor: tBg })
  }
  drawCell(page, colX[5], y, cols[5], rowH, { bgColor: tBg })

  // Signatures (3 equal columns)
  y -= 30
  await drawSummarySplSignatures(doc, page, { regular: font, italic: fontItalic, bold: fontBold }, y, input)
}

export async function generateSummarySplPdf(input: OvertimeRecordInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await embedLogo(doc)

  await appendSummarySplPersonPages(doc, input, { font, fontBold, fontItalic, logo })
  return doc.save()
}


async function drawSummarySplSignatures(
  doc: PDFDocument,
  page: PDFPage,
  fonts: { regular: PDFFont; italic: PDFFont; bold: PDFFont },
  y: number,
  input: OvertimeRecordInput
) {
  const { width } = page.getSize()
  const names = input.signatures
  const isPjo = Boolean(input.isPjo || names.isPjo)

  const labels: [string, string][] = isPjo
    ? [
        ['Dibuat oleh :', names.preparedBy?.trim() || input.employeeName || 'PJO'],
        ['Approved by :', names.approvedBy?.trim() || names.pjoLeader?.trim() || 'Leader'],
      ]
    : [
        ['Dibuat oleh :', names.preparedBy?.trim() || input.employeeName || 'Pengaju'],
        ['Approved by :', names.pjoLeader?.trim() || 'PJO'],
        ['Approved by :', names.approvedBy?.trim() || 'Leader'],
      ]

  const LM = 45
  const printableWidth = width - LM * 2
  const columnCount = labels.length
  const columnWidth = printableWidth / columnCount
  const lineWidth = columnWidth - 25

  labels.forEach(([label, name], index) => {
    const x = LM + index * columnWidth
    page.drawText(label, { x, y, font: fonts.italic, size: 8, color: rgb(0.3, 0.3, 0.3) })
    page.drawLine({
      start: { x, y: y - 42 },
      end: { x: x + lineWidth, y: y - 42 },
      color: rgb(0.5, 0.5, 0.5),
      thickness: 0.5,
    })
    page.drawText(name || '-', {
      x,
      y: y - 54,
      font: fonts.regular,
      size: 7,
      maxWidth: lineWidth,
    })
  })
}

// ============================================================
async function drawOvertimeRecordSignatures(
  doc: PDFDocument,
  page: PDFPage,
  fonts: { regular: PDFFont; italic: PDFFont; bold: PDFFont },
  y: number,
  input: OvertimeRecordInput
) {
  const { width } = page.getSize()
  const names = input.signatures
  const isPjo = Boolean(input.isPjo || names.isPjo)

  let labels: [string, string][] = []
  if (names.useExternalOnly) {
    const count = names.externalSignatureCount ?? 2
    labels = [
      ['Dibuat oleh :', names.externalPreparedBy?.trim() || names.preparedBy || input.employeeName || '-'],
      ['Approved by:', names.externalApprovedBy?.trim() || names.approvedBy || '-'],
    ]
    if (count === 3) {
      const thirdSigner = names.customSigners?.[0]
      labels.push([thirdSigner?.label || 'Approved by:', thirdSigner?.name || names.pjoLeader || '-'])
    } else if (count >= 4) {
      const thirdSigner = names.customSigners?.[0]
      const fourthSigner = names.customSigners?.[1]
      labels.push([thirdSigner?.label || 'Approved by:', thirdSigner?.name || names.pjoLeader || '-'])
      labels.push([fourthSigner?.label || 'Diketahui oleh:', fourthSigner?.name || names.hrName || '-'])
    }
  } else {
    labels = [
      ['Dibuat oleh :', names.preparedBy?.trim() || input.employeeName || '-'],
      ['Approved by:', names.pjoLeader?.trim() || 'Supervisor / Leader'],
      ['Approved by:', names.approvedBy?.trim() || 'PJO / Manager'],
      ['Diketahui oleh:', names.hrName?.trim() || 'HC / Admin'],
    ]
  }

  const LM = 45
  const printableWidth = width - LM * 2
  const columnCount = labels.length
  const isTwoSigners = columnCount === 2
  const columnWidth = isTwoSigners ? 220 : printableWidth / columnCount
  const lineWidth = isTwoSigners ? 180 : columnWidth - 18

  // Draw Signature Columns across page width
  labels.forEach(([label, name], index) => {
    const x = isTwoSigners
      ? index === 0
        ? LM
        : width - LM - lineWidth
      : LM + index * columnWidth
    page.drawText(label, { x, y, font: fonts.italic, size: 8, color: rgb(0.3, 0.3, 0.3) })
    page.drawLine({
      start: { x, y: y - 42 },
      end: { x: x + lineWidth, y: y - 42 },
      color: rgb(0.5, 0.5, 0.5),
      thickness: 0.5,
    })
    page.drawText(name || '-', {
      x,
      y: y - 54,
      font: fonts.regular,
      size: 7,
      maxWidth: lineWidth,
    })
  })
}

// ============================================================
// SITE SUMMARY SPL PDF (Consolidated All-Employee Overtime by Site)
// ============================================================
export type SiteSummarySplRow = {
  dateStr: string
  dayName: string
  splNumber: string
  employeeName: string
  employeeSn?: string
  department?: string
  startTime: string
  endTime: string
  durationHours: number
  taskSummary: string
  isWeekend?: boolean
}

export type SiteSummaryEmployeeStat = {
  employeeName: string
  employeeSn?: string
  department?: string
  splCount: number
  totalHours: number
}

export type SiteSummarySplInput = {
  documentTitle?: string
  period: string
  siteName: string
  totalSplCount: number
  totalHours: number
  totalEmployees: number
  rows: SiteSummarySplRow[]
  employeeStats: SiteSummaryEmployeeStat[]
  signatures: {
    preparedBy?: string
    pjoLeader?: string
    approvedBy?: string
    isPjo?: boolean
    logoUrl?: string
  }
}

export async function generateSiteSummarySplPdf(
  inputOrInputs: SiteSummarySplInput | OvertimeRecordInput[]
): Promise<Uint8Array> {
  if (Array.isArray(inputOrInputs)) {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
    const logo = await embedLogo(doc)

    for (const input of inputOrInputs) {
      await appendSummarySplPersonPages(doc, input, { font, fontBold, fontItalic, logo })
    }
    return doc.save()
  }

  const input = inputOrInputs
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  let page = doc.addPage([595, 842])
  const { width } = page.getSize()
  const logo = await embedLogo(doc)

  const LM = 45
  let y = 790

  // === LOGO + HEADER ===
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
  const title2 = input.documentTitle || 'SUMMARY SPL PER SITE'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 13), y, font: fontBold, size: 13 })
  y -= 16
  page.drawText(title2, { x: centerX(width, title2, fontBold, 10.5), y, font: fontBold, size: 10.5 })
  y -= 13
  const subTitle = 'HUMAN CAPITAL • REKAPITULASI LEMBUR KARYAWAN SITE'
  page.drawText(subTitle, { x: centerX(width, subTitle, font, 7.5), y, font, size: 7.5, color: rgb(0.2, 0.25, 0.3) })
  y -= 25

  // === INFO / METADATA ===
  const colonX = LM + 110
  const valX = colonX + 15
  page.drawText('MONTH / BULAN', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX, y, font, size: 8.5 })
  page.drawText(formatPeriodLabel(input.period), { x: valX, y, font: fontBold, size: 8.5 })
  page.drawText(`TOTAL SPL: ${input.totalSplCount} Dokumen`, { x: width - 180, y, font: fontBold, size: 8.5 })
  y -= 14

  page.drawText('SITE / LOKASI', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX, y, font, size: 8.5 })
  page.drawText(input.siteName.toUpperCase(), { x: valX, y, font: fontBold, size: 8.5 })
  page.drawText(`TOTAL PEKERJA: ${input.totalEmployees} Orang`, { x: width - 180, y, font: fontBold, size: 8.5 })
  y -= 14

  page.drawText('TOTAL JAM LEMBUR', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX, y, font, size: 8.5 })
  page.drawText(`${input.totalHours} Jam`, { x: valX, y, font: fontBold, size: 8.5, color: rgb(0, 0.45, 0.7) })
  y -= 20

  // === TABLE HEADER ===
  // cols: Tgl (28), Hari (42), Karyawan (85), Dept (60), Mulai (35), Selesai (35), Total Jam (40), Pekerjaan (180) = 505
  const cols = [28, 42, 85, 60, 35, 35, 40, 180]
  const tableStartX = LM
  const colX: number[] = []
  let cx = tableStartX
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  const hH = 22
  const drawTableHeader = (pg: PDFPage, curY: number) => {
    drawCell(pg, colX[0], curY - hH, cols[0], hH, { text: 'Tgl', font: fontBold, fontSize: 7.5, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[1], curY - hH, cols[1], hH, { text: 'Hari', font: fontBold, fontSize: 7.5, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[2], curY - hH, cols[2], hH, { text: 'Nama Karyawan', font: fontBold, fontSize: 7.5, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[3], curY - hH, cols[3], hH, { text: 'Departemen', font: fontBold, fontSize: 7.5, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[4], curY - 11, cols[4] + cols[5], 11, { text: 'Jam Lembur', font: fontBold, fontSize: 7, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[4], curY - hH, cols[4], 11, { text: 'Mulai', font: fontBold, fontSize: 6.5, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[5], curY - hH, cols[5], 11, { text: 'Selesai', font: fontBold, fontSize: 6.5, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[6], curY - hH, cols[6], hH, { text: 'Total Jam', font: fontBold, fontSize: 7, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
    drawCell(pg, colX[7], curY - hH, cols[7], hH, { text: 'Yang Dikerjakan / No. SPL', font: fontBold, fontSize: 7.5, align: 'center', bgColor: rgb(0.95, 0.96, 0.98) })
  }

  drawTableHeader(page, y)
  y -= hH

  // === TABLE ROWS ===
  let pageNum = 1
  for (const row of input.rows) {
    const isWeekend = row.isWeekend || row.dayName === 'Minggu' || row.dayName === 'Sabtu'
    const bgColor = isWeekend ? rgb(1, 0.95, 0.95) : undefined
    const textRedColor = isWeekend ? rgb(0.8, 0, 0) : rgb(0, 0, 0)

    // Dynamic row height
    const maxTextW = cols[7] - 8
    let taskLines = 1
    if (row.taskSummary && font) {
      let linesCount = 0
      for (const paragraph of row.taskSummary.split('\n')) {
        let line = ''
        for (const word of paragraph.split(/\s+/)) {
          const test = line ? `${line} ${word}` : word
          if (line && font.widthOfTextAtSize(test, 6.5) > maxTextW) {
            linesCount++
            line = word
          } else {
            line = test
          }
        }
        if (line) linesCount++
      }
      taskLines = Math.max(1, linesCount)
    }
    const dynamicRowH = Math.max(15, taskLines * 8 + 6)

    // Page break check
    if (y - dynamicRowH < 85) {
      page = doc.addPage([595, 842])
      pageNum++
      y = 790

      const subTitleCont = `PT. CHITRA PARATAMA — SUMMARY SPL PER SITE (Halaman ${pageNum})`
      page.drawText(subTitleCont, { x: centerX(width, subTitleCont, fontBold, 9.5), y, font: fontBold, size: 9.5 })
      y -= 18
      drawTableHeader(page, y)
      y -= hH
    }

    y -= dynamicRowH

    const tglOnly = row.dateStr.split(' ')[0] || row.dateStr
    drawCell(page, colX[0], y, cols[0], dynamicRowH, { text: tglOnly, font, fontSize: 7, align: 'center', bgColor, color: textRedColor })
    drawCell(page, colX[1], y, cols[1], dynamicRowH, { text: row.dayName, font, fontSize: 7, align: 'center', bgColor, color: textRedColor })
    drawCell(page, colX[2], y, cols[2], dynamicRowH, { text: row.employeeName, font: fontBold, fontSize: 7, align: 'left', wrap: true, bgColor })
    drawCell(page, colX[3], y, cols[3], dynamicRowH, { text: row.department || '-', font, fontSize: 6.5, align: 'left', wrap: true, bgColor })
    drawCell(page, colX[4], y, cols[4], dynamicRowH, { text: row.startTime, font, fontSize: 6.5, align: 'center', bgColor })
    drawCell(page, colX[5], y, cols[5], dynamicRowH, { text: row.endTime, font, fontSize: 6.5, align: 'center', bgColor })
    drawCell(page, colX[6], y, cols[6], dynamicRowH, { text: `${row.durationHours} Jam`, font: fontBold, fontSize: 7, align: 'center', color: rgb(0, 0.4, 0.7), bgColor })
    const cleanTask = (row.taskSummary || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[•]/g, '*').replace(/[^\x00-\xFF]/g, ' '); drawCell(page, colX[7], y, cols[7], dynamicRowH, { text: cleanTask, font, fontSize: 6.5, align: 'left', wrap: true, bgColor })
  }

  // Check room for Total Row + Employee Recap + Signatures
  if (y - 140 < 50) {
    page = doc.addPage([595, 842])
    pageNum++
    y = 790
  }

  // === TOTAL ROW ===
  const rowH = 16
  y -= rowH
  const tBg = rgb(0.85, 0.98, 0.88)
  const tMergeW = cols[0] + cols[1] + cols[2] + cols[3] + cols[4] + cols[5]
  drawCell(page, colX[0], y, tMergeW, rowH, { text: 'TOTAL JAM LEMBUR SITE:', font: fontBold, fontSize: 8, align: 'center', bgColor: tBg, color: rgb(0.1, 0.5, 0.2) })
  drawCell(page, colX[6], y, cols[6], rowH, { text: `${input.totalHours} Jam`, font: fontBold, fontSize: 8.5, align: 'center', bgColor: tBg, color: rgb(0, 0.5, 0) })
  drawCell(page, colX[7], y, cols[7], rowH, { text: `(${input.totalSplCount} SPL • ${input.totalEmployees} Karyawan)`, font: fontBold, fontSize: 7, align: 'left', bgColor: tBg, color: rgb(0.1, 0.5, 0.2) })

  // === REKAPITULASI PER KARYAWAN TABLE ===
  if (input.employeeStats && input.employeeStats.length > 0) {
    if (y - (input.employeeStats.length * 14 + 40) < 70) {
      page = doc.addPage([595, 842])
      pageNum++
      y = 790
    }

    y -= 18
    const recapTitle = `REKAPITULASI TOTAL LEMBUR PER KARYAWAN (SITE: ${input.siteName.toUpperCase()})`
    page.drawText(recapTitle, { x: LM, y, font: fontBold, size: 8, color: rgb(0, 0.2, 0.45) })
    y -= 6

    const rCols = [25, 180, 120, 80, 100]
    const rColX: number[] = []
    let rcx = LM
    for (const w of rCols) {
      rColX.push(rcx)
      rcx += w
    }

    const rHH = 14
    y -= rHH
    drawCell(page, rColX[0], y, rCols[0], rHH, { text: 'No', font: fontBold, fontSize: 7, align: 'center', bgColor: rgb(0.9, 0.93, 0.96) })
    drawCell(page, rColX[1], y, rCols[1], rHH, { text: 'Nama Karyawan', font: fontBold, fontSize: 7, align: 'left', bgColor: rgb(0.9, 0.93, 0.96) })
    drawCell(page, rColX[2], y, rCols[2], rHH, { text: 'Departemen', font: fontBold, fontSize: 7, align: 'left', bgColor: rgb(0.9, 0.93, 0.96) })
    drawCell(page, rColX[3], y, rCols[3], rHH, { text: 'Jumlah SPL', font: fontBold, fontSize: 7, align: 'center', bgColor: rgb(0.9, 0.93, 0.96) })
    drawCell(page, rColX[4], y, rCols[4], rHH, { text: 'Total Jam Lembur', font: fontBold, fontSize: 7, align: 'center', bgColor: rgb(0.9, 0.93, 0.96) })

    input.employeeStats.forEach((st, idx) => {
      const rH = 13
      if (y - rH < 75) {
        page = doc.addPage([595, 842])
        pageNum++
        y = 790
      }
      y -= rH
      const rBg = idx % 2 === 1 ? rgb(0.98, 0.98, 0.99) : undefined
      drawCell(page, rColX[0], y, rCols[0], rH, { text: String(idx + 1), font, fontSize: 7, align: 'center', bgColor: rBg })
      drawCell(page, rColX[1], y, rCols[1], rH, { text: `${st.employeeName}${st.employeeSn && st.employeeSn !== '-' && st.employeeSn !== '—' ? ` (${st.employeeSn})` : ''}`, font: fontBold, fontSize: 7, align: 'left', bgColor: rBg })
      drawCell(page, rColX[2], y, rCols[2], rH, { text: st.department || '-', font, fontSize: 7, align: 'left', bgColor: rBg })
      drawCell(page, rColX[3], y, rCols[3], rH, { text: `${st.splCount} SPL`, font, fontSize: 7, align: 'center', bgColor: rBg })
      drawCell(page, rColX[4], y, rCols[4], rH, { text: `${st.totalHours} Jam`, font: fontBold, fontSize: 7, align: 'center', color: rgb(0, 0.4, 0.7), bgColor: rBg })
    })
  }

  // === SIGNATURES ===
  if (y - 75 < 45) {
    page = doc.addPage([595, 842])
    pageNum++
    y = 790
  }
  y -= 25

  const sigCols = 3
  const sigW = (width - LM * 2) / sigCols
  const sigData = [
    { label: 'Dibuat oleh :', name: input.signatures.preparedBy || 'Admin Site' },
    { label: 'Diketahui oleh :', name: input.signatures.pjoLeader || 'PJO Site' },
    { label: 'Approved by :', name: input.signatures.approvedBy || 'Site Leader' },
  ]

  sigData.forEach((sig, idx) => {
    const sx = LM + idx * sigW
    page.drawText(sig.label, { x: sx, y, font: fontItalic, size: 7.5, color: rgb(0.3, 0.3, 0.3) })
    page.drawLine({
      start: { x: sx, y: y - 38 },
      end: { x: sx + sigW - 20, y: y - 38 },
      color: rgb(0.4, 0.4, 0.4),
      thickness: 0.5,
    })
    page.drawText(sig.name, {
      x: sx,
      y: y - 48,
      font: fontBold,
      size: 7.5,
      maxWidth: sigW - 20,
    })
  })

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
      day.scheduleCode === 'OFF' ||
      day.scheduleCode === 'Libur' ||
      day.scheduleCode === 'Sakit' ||
      day.status === 'off' ||
      day.status === 'sick'
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
      day.scheduleCode === 'OFF' ||
      day.scheduleCode === 'FB' ||
      day.scheduleCode === 'Libur' ||
      day.status === 'off'
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
// SUMMARY TABLE PDF (OT / SPL / MSA / Meals / Tunjangan Khusus)
// ============================================================
export type SummaryTableView = 'ot' | 'spl' | 'msa' | 'meals' | 'lokasi' | 'attendance'

export const SUMMARY_TABLE_TITLES: Record<SummaryTableView, string> = {
  ot: 'OVERTIME SUMMARY',
  spl: 'OVERTIME SPL SUMMARY',
  msa: 'MSA SUMMARY',
  meals: 'MLS SUMMARY',
  lokasi: 'TU SUMMARY',
  attendance: 'ATTENDANCE SUMMARY',
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
      } else if (text === 'AL') {
        cellBg = rgb(0.82, 0.98, 0.90)
        cellColor = rgb(0.02, 0.37, 0.27)
      } else if (text === 'ST' || text === 'GD') {
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
