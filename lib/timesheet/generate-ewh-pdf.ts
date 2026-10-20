import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from 'pdf-lib'
import {
  drawPdfSignatures,
  embedCustomLogo,
  type PdfSignatureNames,
} from '@/lib/timesheet/pdf-signatures'

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
  return `${months[month] || ''}-${year}`
}

function getDayName(period: string, day: number) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
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
      const pad = opts.pad ?? 3
      const maxWidth = Math.max(1, w - pad * 2)
      const lineHeight = fontSize * 0.95
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
      const visibleLines = lines.slice(0, maxLines)
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
    let fitSize = fontSize
    const pad = opts.pad ?? 3
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

// =========================================================================
// 1. EWH DAILY MATRIX PDF (Landscape A4)
// =========================================================================
export type EwhDailyMatrixRow = {
  day: number
  dateStr: string
  p5m: number
  checkPressure: number
  adjustPressure: number
  reseal: number
  assembly: number
  disassembly: number
  mounting: number
  dismounting: number
  pmCheck: number
  cleanUp: number
  maintenanceRim: number
  retorque: number
  durasiKerjaHours: number
  ewhHoursPerPerson: number
  ewhRatioPercent: number
  workerCount: number
}

export type EwhDailyMatrixInput = {
  period: string
  siteName: string
  departmentName?: string
  powerman: number
  matrix: EwhDailyMatrixRow[]
  sumRow: {
    p5m: number
    checkPressure: number
    adjustPressure: number
    reseal: number
    assembly: number
    disassembly: number
    mounting: number
    dismounting: number
    pmCheck: number
    cleanUp: number
    maintenanceRim: number
    retorque: number
    totalDurasiKerjaHours: number
    monthlyEfficiencyPercent: number
  }
  liveEwhAverage: number
  signatures?: PdfSignatureNames
  showSignatures?: boolean
}

export async function generateEwhDailyMatrixPdf(input: EwhDailyMatrixInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await embedLogo(doc)

  const pageWidth = 842
  const pageHeight = 595
  const LM = 30
  const page = doc.addPage([pageWidth, pageHeight])
  const { width } = page.getSize()

  let y = pageHeight - 35

  // Header Logo & Titles
  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 18, width: logo.width, height: logo.height })
  }
  if (input.signatures?.logoUrl) {
    const custLogo = await embedCustomLogo(doc, input.signatures.logoUrl)
    if (custLogo) {
      page.drawImage(custLogo.image, {
        x: width - LM - custLogo.width,
        y: y - 18,
        width: custLogo.width,
        height: custLogo.height,
      })
    }
  }

  const title1 = 'PT. CHITRA PARATAMA'
  const title2 = 'INTERNAL INFORMATION - UTILITIES & EWH HARIAN'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 13), y, font: fontBold, size: 13 })
  y -= 16
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 28

  // Info Block (titik dua sejajar)
  const colonX1 = LM + 65
  const valX1 = colonX1 + 10
  const col2X = LM + 400
  const colonX2 = col2X + 65
  const valX2 = colonX2 + 10

  page.drawText('MONTH', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX1, y, font, size: 8.5 })
  page.drawText(formatPeriodLabel(input.period), { x: valX1, y, font: fontBold, size: 8.5 })

  page.drawText('SITE', { x: col2X, y, font, size: 8.5 })
  page.drawText(':', { x: colonX2, y, font, size: 8.5 })
  page.drawText(input.siteName, { x: valX2, y, font: fontBold, size: 8.5 })
  y -= 13

  page.drawText('DEPT', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX1, y, font, size: 8.5 })
  page.drawText(input.departmentName || 'Operations', { x: valX1, y, font, size: 8.5 })

  page.drawText('POWERMAN', { x: col2X, y, font, size: 8.5 })
  page.drawText(':', { x: colonX2, y, font, size: 8.5 })
  page.drawText(`${input.powerman} Orang (Standar 2-Shift 22 Jam/Hari)`, { x: valX2, y, font, size: 8.5 })
  y -= 18

  // Table Columns
  // Total Width = 782 (PageWidth 842 - 2 * 30)
  const cols = [
    26,  // Tgl
    44,  // P5M
    49,  // Check Press
    48,  // Adj Press
    43,  // Reseal
    47,  // Assembly
    45,  // Disass
    48,  // Mounting
    48,  // Dismount
    46,  // PM Check
    45,  // Clean Up
    47,  // Maint Rim
    46,  // Retorque
    66,  // Durasi Kerja (Jam)
    66,  // EWH (Jam/Orang)
    68,  // Efisiensi %
  ]
  const colX: number[] = []
  let cx = LM
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  const headerBg = rgb(0.92, 0.92, 0.92)
  const tableBorder = rgb(0.25, 0.25, 0.25)
  const hH = 22

  const headers = [
    'Tgl',
    'P5M',
    'Check\nPress',
    'Adjust\nPress',
    'Reseal\nTire',
    'Assembly\nTire',
    'Disass\nTire',
    'Mounting\nTire',
    'Dismount\nTire',
    'PM\nCheck',
    'Clean\nUp',
    'Maint\nRim',
    'Retorque\nTire',
    'Durasi Kerja\n(Hours)',
    'EWH\n(Jam/Org)',
    'Efisiensi\n(%)',
  ]

  headers.forEach((h, idx) => {
    drawCell(page, colX[idx], y - hH, cols[idx], hH, {
      text: h,
      font: fontBold,
      fontSize: 6.5,
      align: 'center',
      bgColor: headerBg,
      borderColor: tableBorder,
      wrap: true,
    })
  })
  y -= hH

  const rowH = 10.5
  const cWeekendBg = rgb(1, 0.93, 0.93)
  const cTotalBg = rgb(0.8, 1, 0.8)

  input.matrix.forEach((r) => {
    const dayName = getDayName(input.period, r.day)
    const isWeekend = dayName === 'Sunday' || dayName === 'Saturday'
    const bgColor = isWeekend ? cWeekendBg : undefined

    drawCell(page, colX[0], y - rowH, cols[0], rowH, { text: String(r.day), font: fontBold, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[1], y - rowH, cols[1], rowH, { text: r.p5m ? String(r.p5m) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[2], y - rowH, cols[2], rowH, { text: r.checkPressure ? String(r.checkPressure) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[3], y - rowH, cols[3], rowH, { text: r.adjustPressure ? String(r.adjustPressure) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[4], y - rowH, cols[4], rowH, { text: r.reseal ? String(r.reseal) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[5], y - rowH, cols[5], rowH, { text: r.assembly ? String(r.assembly) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[6], y - rowH, cols[6], rowH, { text: r.disassembly ? String(r.disassembly) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[7], y - rowH, cols[7], rowH, { text: r.mounting ? String(r.mounting) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[8], y - rowH, cols[8], rowH, { text: r.dismounting ? String(r.dismounting) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[9], y - rowH, cols[9], rowH, { text: r.pmCheck ? String(r.pmCheck) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[10], y - rowH, cols[10], rowH, { text: r.cleanUp ? String(r.cleanUp) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[11], y - rowH, cols[11], rowH, { text: r.maintenanceRim ? String(r.maintenanceRim) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[12], y - rowH, cols[12], rowH, { text: r.retorque ? String(r.retorque) : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[13], y - rowH, cols[13], rowH, { text: r.durasiKerjaHours ? r.durasiKerjaHours.toFixed(2) : '', font, fontSize: 6.5, align: 'right', bgColor, borderColor: tableBorder })
    drawCell(page, colX[14], y - rowH, cols[14], rowH, { text: r.ewhHoursPerPerson ? r.ewhHoursPerPerson.toFixed(2) : '', font: fontBold, fontSize: 6.5, align: 'right', color: rgb(0, 0.2, 0.4), bgColor, borderColor: tableBorder })
    drawCell(page, colX[15], y - rowH, cols[15], rowH, { text: r.ewhRatioPercent ? `${r.ewhRatioPercent.toFixed(1)}%` : '', font, fontSize: 6.5, align: 'center', bgColor, borderColor: tableBorder })
    y -= rowH
  })

  // SUM Row
  const sum = input.sumRow
  drawCell(page, colX[0], y - rowH, cols[0], rowH, { text: 'SUM', font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[1], y - rowH, cols[1], rowH, { text: String(sum.p5m), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[2], y - rowH, cols[2], rowH, { text: String(sum.checkPressure), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[3], y - rowH, cols[3], rowH, { text: String(sum.adjustPressure), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[4], y - rowH, cols[4], rowH, { text: String(sum.reseal), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[5], y - rowH, cols[5], rowH, { text: String(sum.assembly), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[6], y - rowH, cols[6], rowH, { text: String(sum.disassembly), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[7], y - rowH, cols[7], rowH, { text: String(sum.mounting), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[8], y - rowH, cols[8], rowH, { text: String(sum.dismounting), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[9], y - rowH, cols[9], rowH, { text: String(sum.pmCheck), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[10], y - rowH, cols[10], rowH, { text: String(sum.cleanUp), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[11], y - rowH, cols[11], rowH, { text: String(sum.maintenanceRim), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[12], y - rowH, cols[12], rowH, { text: String(sum.retorque), font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[13], y - rowH, cols[13], rowH, { text: sum.totalDurasiKerjaHours.toFixed(2), font: fontBold, fontSize: 6.5, align: 'right', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[14], y - rowH, cols[14], rowH, { text: input.liveEwhAverage.toFixed(1), font: fontBold, fontSize: 7, align: 'right', color: rgb(0, 0.4, 0), bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[15], y - rowH, cols[15], rowH, { text: `${sum.monthlyEfficiencyPercent}%`, font: fontBold, fontSize: 6.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  y -= rowH + 20

  // Signatures (hidden by default / optional)
  if (input.showSignatures && input.signatures) {
    drawPdfSignatures(page, { regular: font, italic: fontItalic }, Math.max(50, y), input.signatures)
  }

  return doc.save()
}

// =========================================================================
// 2. EWH WEEKLY BREAKDOWN PDF (Landscape A4)
// =========================================================================
export type EwhWeeklyRow = {
  weekNumber: number
  label: string
  rangeStr: string
  p5m: number
  checkPressure: number
  adjustPressure: number
  reseal: number
  assembly: number
  disassembly: number
  mounting: number
  dismounting: number
  pmCheck: number
  cleanUp: number
  maintenanceRim: number
  retorque: number
  totalHours: number
  ewhHoursPerPerson: number
  ewhRatioPercent: number
}

export async function generateEwhWeeklyPdf(input: {
  period: string
  siteName: string
  departmentName?: string
  powerman: number
  weeklyData: EwhWeeklyRow[]
  signatures?: PdfSignatureNames
  showSignatures?: boolean
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await embedLogo(doc)

  const pageWidth = 842
  const pageHeight = 595
  const LM = 30
  const page = doc.addPage([pageWidth, pageHeight])
  const { width } = page.getSize()

  let y = pageHeight - 40

  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 15, width: logo.width, height: logo.height })
  }
  const title1 = 'PT. CHITRA PARATAMA'
  const title2 = 'REKAPITULASI EWH MINGGUAN (WEEKLY BREAKDOWN)'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 13), y, font: fontBold, size: 13 })
  y -= 16
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 30

  // Info Block
  const colonX1 = LM + 65
  const valX1 = colonX1 + 10
  const col2X = LM + 400
  const colonX2 = col2X + 65
  const valX2 = colonX2 + 10

  page.drawText('MONTH', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX1, y, font, size: 8.5 })
  page.drawText(formatPeriodLabel(input.period), { x: valX1, y, font: fontBold, size: 8.5 })

  page.drawText('SITE', { x: col2X, y, font, size: 8.5 })
  page.drawText(':', { x: colonX2, y, font, size: 8.5 })
  page.drawText(input.siteName, { x: valX2, y, font: fontBold, size: 8.5 })
  y -= 13

  page.drawText('DEPT', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX1, y, font, size: 8.5 })
  page.drawText(input.departmentName || 'Operations', { x: valX1, y, font, size: 8.5 })

  page.drawText('POWERMAN', { x: col2X, y, font, size: 8.5 })
  page.drawText(':', { x: colonX2, y, font, size: 8.5 })
  page.drawText(`${input.powerman} Orang`, { x: valX2, y, font, size: 8.5 })
  y -= 22

  const cols = [50, 75, 38, 44, 44, 40, 44, 42, 44, 44, 44, 40, 44, 42, 65, 65, 57]
  const colX: number[] = []
  let cx = LM
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  const headerBg = rgb(0.92, 0.92, 0.92)
  const tableBorder = rgb(0.25, 0.25, 0.25)
  const hH = 22

  const headers = [
    'Minggu',
    'Rentang\nTanggal',
    'P5M',
    'Check\nPress',
    'Adj\nPress',
    'Reseal',
    'Assembly',
    'Disass',
    'Mounting',
    'Dismount',
    'PM\nCheck',
    'Clean\nUp',
    'Maint\nRim',
    'Retorque',
    'Total Jam\nKerja',
    'EWH\n(Jam/Org)',
    'Efisiensi\n(%)',
  ]

  headers.forEach((h, idx) => {
    drawCell(page, colX[idx], y - hH, cols[idx], hH, {
      text: h,
      font: fontBold,
      fontSize: 6.5,
      align: 'center',
      bgColor: headerBg,
      borderColor: tableBorder,
      wrap: true,
    })
  })
  y -= hH

  const rowH = 16
  input.weeklyData.forEach((w) => {
    drawCell(page, colX[0], y - rowH, cols[0], rowH, { text: w.label, font: fontBold, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[1], y - rowH, cols[1], rowH, { text: w.rangeStr, font, fontSize: 6.5, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[2], y - rowH, cols[2], rowH, { text: String(w.p5m), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[3], y - rowH, cols[3], rowH, { text: String(w.checkPressure), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[4], y - rowH, cols[4], rowH, { text: String(w.adjustPressure), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[5], y - rowH, cols[5], rowH, { text: String(w.reseal), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[6], y - rowH, cols[6], rowH, { text: String(w.assembly), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[7], y - rowH, cols[7], rowH, { text: String(w.disassembly), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[8], y - rowH, cols[8], rowH, { text: String(w.mounting), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[9], y - rowH, cols[9], rowH, { text: String(w.dismounting), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[10], y - rowH, cols[10], rowH, { text: String(w.pmCheck), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[11], y - rowH, cols[11], rowH, { text: String(w.cleanUp), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[12], y - rowH, cols[12], rowH, { text: String(w.maintenanceRim), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[13], y - rowH, cols[13], rowH, { text: String(w.retorque), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[14], y - rowH, cols[14], rowH, { text: w.totalHours.toFixed(2), font, fontSize: 7, align: 'right', borderColor: tableBorder })
    drawCell(page, colX[15], y - rowH, cols[15], rowH, { text: w.ewhHoursPerPerson.toFixed(2), font: fontBold, fontSize: 7, align: 'right', color: rgb(0, 0.2, 0.5), borderColor: tableBorder })
    drawCell(page, colX[16], y - rowH, cols[16], rowH, { text: `${w.ewhRatioPercent.toFixed(1)}%`, font, fontSize: 7, align: 'center', borderColor: tableBorder })
    y -= rowH
  })

  y -= 40
  // Signatures (hidden by default / optional)
  if (input.showSignatures && input.signatures) {
    drawPdfSignatures(page, { regular: font, italic: fontItalic }, Math.max(50, y), input.signatures)
  }

  return doc.save()
}

// =========================================================================
// 3. EWH INDIVIDUAL SUMMARY TABLE PDF (Landscape A4)
// =========================================================================
export type EwhIndividualSummaryRow = {
  no: number
  employeeName: string
  employeeSn: string
  section: string
  department: string
  workDays: number
  regularHours: number
  overtimeHours: number
  effectiveHours: number
  avgEwh: number
  ewhClassLabel: string
}

export async function generateEwhIndividualSummaryPdf(input: {
  period: string
  siteName: string
  departmentName?: string
  powerman: number
  employees: EwhIndividualSummaryRow[]
  signatures?: PdfSignatureNames
  showSignatures?: boolean
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await embedLogo(doc)

  const pageWidth = 842
  const pageHeight = 595
  const LM = 30
  let page = doc.addPage([pageWidth, pageHeight])
  const { width } = page.getSize()

  const cols = [24, 150, 65, 80, 80, 50, 65, 60, 70, 68, 70]
  const colX: number[] = []
  let cx = LM
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  const headerBg = rgb(0.92, 0.92, 0.92)
  const tableBorder = rgb(0.25, 0.25, 0.25)
  const hH = 20

  const drawHeaderBlock = (pg: PDFPage, topY: number) => {
    if (logo) {
      pg.drawImage(logo.image, { x: LM, y: topY - 15, width: logo.width, height: logo.height })
    }
    const title1 = 'PT. CHITRA PARATAMA'
    const title2 = 'REKAPITULASI EWH INDIVIDU KARYAWAN'
    pg.drawText(title1, { x: centerX(width, title1, fontBold, 13), y: topY, font: fontBold, size: 13 })
    pg.drawText(title2, { x: centerX(width, title2, fontBold, 11), y: topY - 16, font: fontBold, size: 11 })

    const colonX1 = LM + 65
    const valX1 = colonX1 + 10
    const col2X = LM + 400
    const colonX2 = col2X + 65
    const valX2 = colonX2 + 10
    const infY = topY - 38

    pg.drawText('MONTH', { x: LM, y: infY, font, size: 8.5 })
    pg.drawText(':', { x: colonX1, y: infY, font, size: 8.5 })
    pg.drawText(formatPeriodLabel(input.period), { x: valX1, y: infY, font: fontBold, size: 8.5 })

    pg.drawText('SITE', { x: col2X, y: infY, font, size: 8.5 })
    pg.drawText(':', { x: colonX2, y: infY, font, size: 8.5 })
    pg.drawText(input.siteName, { x: valX2, y: infY, font: fontBold, size: 8.5 })

    pg.drawText('DEPT', { x: LM, y: infY - 12, font, size: 8.5 })
    pg.drawText(':', { x: colonX1, y: infY - 12, font, size: 8.5 })
    pg.drawText(input.departmentName || 'Operations', { x: valX1, y: infY - 12, font, size: 8.5 })

    pg.drawText('TOTAL EMP', { x: col2X, y: infY - 12, font, size: 8.5 })
    pg.drawText(':', { x: colonX2, y: infY - 12, font, size: 8.5 })
    pg.drawText(`${input.employees.length} Orang`, { x: valX2, y: infY - 12, font, size: 8.5 })

    return infY - 26
  }

  const drawTableHeader = (pg: PDFPage, topY: number) => {
    const headers = [
      'No',
      'Nama Karyawan',
      'SN',
      'Section',
      'Departemen',
      'Hari Kerja',
      'Jam Reguler',
      'Jam Lembur',
      'Total EWH (Jam)',
      'Score EWH (%)',
      'Status EWH',
    ]
    headers.forEach((h, idx) => {
      drawCell(pg, colX[idx], topY - hH, cols[idx], hH, {
        text: h,
        font: fontBold,
        fontSize: 7,
        align: idx === 1 ? 'left' : idx >= 5 && idx <= 8 ? 'right' : 'center',
        bgColor: headerBg,
        borderColor: tableBorder,
      })
    })
    return topY - hH
  }

  let y = drawHeaderBlock(page, pageHeight - 35)
  y = drawTableHeader(page, y)

  const rowH = 13
  const bottomLimit = 75

  input.employees.forEach((e, idx) => {
    if (y - rowH < bottomLimit) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - 35
      y = drawTableHeader(page, y)
    }

    drawCell(page, colX[0], y - rowH, cols[0], rowH, { text: String(idx + 1), font, fontSize: 6.5, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[1], y - rowH, cols[1], rowH, { text: e.employeeName, font: fontBold, fontSize: 6.5, align: 'left', borderColor: tableBorder })
    drawCell(page, colX[2], y - rowH, cols[2], rowH, { text: e.employeeSn, font, fontSize: 6.5, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[3], y - rowH, cols[3], rowH, { text: e.section || '-', font, fontSize: 6.5, align: 'left', borderColor: tableBorder })
    drawCell(page, colX[4], y - rowH, cols[4], rowH, { text: e.department || '-', font, fontSize: 6.5, align: 'left', borderColor: tableBorder })
    drawCell(page, colX[5], y - rowH, cols[5], rowH, { text: String(e.workDays), font, fontSize: 6.5, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[6], y - rowH, cols[6], rowH, { text: e.regularHours.toFixed(2), font, fontSize: 6.5, align: 'right', borderColor: tableBorder })
    drawCell(page, colX[7], y - rowH, cols[7], rowH, { text: e.overtimeHours.toFixed(2), font, fontSize: 6.5, align: 'right', borderColor: tableBorder })
    drawCell(page, colX[8], y - rowH, cols[8], rowH, { text: e.effectiveHours.toFixed(2), font: fontBold, fontSize: 6.5, align: 'right', borderColor: tableBorder })
    drawCell(page, colX[9], y - rowH, cols[9], rowH, { text: `${e.avgEwh.toFixed(1)}%`, font: fontBold, fontSize: 7, align: 'right', color: rgb(0, 0.2, 0.4), borderColor: tableBorder })
    drawCell(page, colX[10], y - rowH, cols[10], rowH, { text: e.ewhClassLabel, font, fontSize: 6.5, align: 'center', borderColor: tableBorder })
    y -= rowH
  })

  // Signatures on last page (hidden by default / optional)
  if (input.showSignatures && input.signatures) {
    if (y < 120) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - 40
    }
    drawPdfSignatures(page, { regular: font, italic: fontItalic }, Math.max(50, y - 25), input.signatures)
  }

  return doc.save()
}

// =========================================================================
// 4. EWH TEAM SUMMARY TABLE PDF (Landscape A4)
// =========================================================================
export type EwhTeamSummaryRow = {
  no: number
  name: string
  section: string
  memberCount: number
  avgWorkDays: number
  totalClockHours: number
  totalEffectiveHours: number
  avgEwh: number
  ewhClassLabel: string
}

export async function generateEwhTeamSummaryPdf(input: {
  period: string
  siteName: string
  departmentName?: string
  teams: EwhTeamSummaryRow[]
  signatures?: PdfSignatureNames
  showSignatures?: boolean
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await embedLogo(doc)

  const pageWidth = 842
  const pageHeight = 595
  const LM = 30
  const page = doc.addPage([pageWidth, pageHeight])
  const { width } = page.getSize()

  let y = pageHeight - 35

  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 15, width: logo.width, height: logo.height })
  }
  const title1 = 'PT. CHITRA PARATAMA'
  const title2 = 'REKAPITULASI EWH PER TEAM'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 13), y, font: fontBold, size: 13 })
  y -= 16
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 30

  const colonX1 = LM + 65
  const valX1 = colonX1 + 10
  const col2X = LM + 400
  const colonX2 = col2X + 65
  const valX2 = colonX2 + 10

  page.drawText('MONTH', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX1, y, font, size: 8.5 })
  page.drawText(formatPeriodLabel(input.period), { x: valX1, y, font: fontBold, size: 8.5 })

  page.drawText('SITE', { x: col2X, y, font, size: 8.5 })
  page.drawText(':', { x: colonX2, y, font, size: 8.5 })
  page.drawText(input.siteName, { x: valX2, y, font: fontBold, size: 8.5 })
  y -= 13

  page.drawText('DEPT', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX1, y, font, size: 8.5 })
  page.drawText(input.departmentName || 'Operations', { x: valX1, y, font, size: 8.5 })

  page.drawText('TOTAL TEAM', { x: col2X, y, font, size: 8.5 })
  page.drawText(':', { x: colonX2, y, font, size: 8.5 })
  page.drawText(`${input.teams.length} Team`, { x: valX2, y, font, size: 8.5 })
  y -= 22

  const cols = [30, 160, 110, 60, 75, 85, 85, 85, 92]
  const colX: number[] = []
  let cx = LM
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  const headerBg = rgb(0.92, 0.92, 0.92)
  const tableBorder = rgb(0.25, 0.25, 0.25)
  const hH = 22

  const headers = [
    'No',
    'Nama Team',
    'Section',
    'Anggota',
    'Rata-rata\nHari Kerja',
    'Total Jam\nKerja (Jam)',
    'Total Jam\nEWH (Jam)',
    'Rata-rata\nEWH (%)',
    'Status Efektivitas',
  ]

  headers.forEach((h, idx) => {
    drawCell(page, colX[idx], y - hH, cols[idx], hH, {
      text: h,
      font: fontBold,
      fontSize: 7,
      align: idx === 1 ? 'left' : idx >= 4 && idx <= 6 ? 'right' : 'center',
      bgColor: headerBg,
      borderColor: tableBorder,
      wrap: true,
    })
  })
  y -= hH

  const rowH = 16
  input.teams.forEach((t, idx) => {
    drawCell(page, colX[0], y - rowH, cols[0], rowH, { text: String(idx + 1), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[1], y - rowH, cols[1], rowH, { text: t.name, font: fontBold, fontSize: 7, align: 'left', borderColor: tableBorder })
    drawCell(page, colX[2], y - rowH, cols[2], rowH, { text: t.section || 'General', font, fontSize: 7, align: 'left', borderColor: tableBorder })
    drawCell(page, colX[3], y - rowH, cols[3], rowH, { text: `${t.memberCount} Org`, font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[4], y - rowH, cols[4], rowH, { text: String(t.avgWorkDays), font, fontSize: 7, align: 'center', borderColor: tableBorder })
    drawCell(page, colX[5], y - rowH, cols[5], rowH, { text: t.totalClockHours.toFixed(2), font, fontSize: 7, align: 'right', borderColor: tableBorder })
    drawCell(page, colX[6], y - rowH, cols[6], rowH, { text: t.totalEffectiveHours.toFixed(2), font: fontBold, fontSize: 7, align: 'right', borderColor: tableBorder })
    drawCell(page, colX[7], y - rowH, cols[7], rowH, { text: `${t.avgEwh.toFixed(1)}%`, font: fontBold, fontSize: 7.5, align: 'right', color: rgb(0, 0.2, 0.5), borderColor: tableBorder })
    drawCell(page, colX[8], y - rowH, cols[8], rowH, { text: t.ewhClassLabel, font, fontSize: 7, align: 'center', borderColor: tableBorder })
    y -= rowH
  })

  y -= 40
  // Signatures (hidden by default / optional)
  if (input.showSignatures && input.signatures) {
    drawPdfSignatures(page, { regular: font, italic: fontItalic }, Math.max(50, y), input.signatures)
  }

  return doc.save()
}

// =========================================================================
// 5. INDIVIDUAL EMPLOYEE DETAIL EWH RECORD PDF (Portrait A4 - Matches Attendance Form)
// =========================================================================
export type EwhEmployeeDetailDayData = {
  day: number
  dayName: string
  dateStr: string
  clockIn: string
  clockOut: string
  durationHours: number
  effectiveHours: number
  overtimeHours: number
  ewhPercent: number
  isHoliday: boolean
  holidayName?: string
  status: string
  remark?: string
}

export type EwhEmployeeDetailPdfInput = {
  period: string
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  jobTitle?: string
  days: EwhEmployeeDetailDayData[]
  totals: {
    presentDays: number
    totalDurationHours: number
    totalEffectiveHours: number
    totalOvertimeHours: number
    avgEwhPercent: number
  }
  signatures?: PdfSignatureNames
  showSignatures?: boolean
}

export async function generateEwhEmployeeDetailPdf(input: EwhEmployeeDetailPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await embedLogo(doc)

  const pageWidth = 595
  const pageHeight = 842
  const LM = 40
  const page = doc.addPage([pageWidth, pageHeight])
  const { width } = page.getSize()

  let y = pageHeight - 40

  // Header Logo & Titles (Format Standar Attendance)
  if (logo) {
    page.drawImage(logo.image, { x: LM, y: y - 15, width: logo.width, height: logo.height })
  }
  if (input.signatures?.logoUrl) {
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
  const title2 = 'INDIVIDUAL EWH RECORD'
  page.drawText(title1, { x: centerX(width, title1, fontBold, 14), y, font: fontBold, size: 14 })
  y -= 18
  page.drawText(title2, { x: centerX(width, title2, fontBold, 11), y, font: fontBold, size: 11 })
  y -= 30

  // Info Section (Titik dua sejajar)
  const colonX = LM + 105
  const valX = colonX + 12

  page.drawText('MONTH', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX, y, font, size: 8.5 })
  page.drawText(formatPeriodLabel(input.period), { x: valX, y, font: fontBold, size: 8.5 })
  page.drawText(`SN: ${input.employeeSn}`, { x: width - 140, y, font: fontBold, size: 8.5 })
  y -= 14

  page.drawText('Name of Employee', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX, y, font, size: 8.5 })
  page.drawText(input.employeeName, { x: valX, y, font: fontBold, size: 8.5 })
  y -= 14

  page.drawText('Department / Section', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX, y, font, size: 8.5 })
  page.drawText(`${input.department || '-'} / ${input.section || '-'}`, { x: valX, y, font, size: 8.5 })
  y -= 14

  page.drawText('Site', { x: LM, y, font, size: 8.5 })
  page.drawText(':', { x: colonX, y, font, size: 8.5 })
  page.drawText(input.siteName, { x: valX, y, font, size: 8.5 })
  y -= 20

  // Table
  // Total Table Width: 515 (595 - 2*40)
  const cols = [
    26,  // Date
    46,  // Day
    90,  // Working Hours (From - To)
    60,  // Durasi (Jam)
    66,  // Jam Efektif
    55,  // Lembur (Jam)
    62,  // Score EWH
    110, // Remarks
  ]
  const colX: number[] = []
  let cx = LM
  for (const w of cols) {
    colX.push(cx)
    cx += w
  }

  const headerBg = rgb(0.92, 0.92, 0.92)
  const tableBorder = rgb(0.25, 0.25, 0.25)
  const hH = 22

  const headers = [
    'Date',
    'Day',
    'Working Hours\n(In - Out)',
    'Durasi\n(Hours)',
    'Jam Efektif\n(EWH)',
    'Lembur\n(Hours)',
    'Score EWH\n(%)',
    'Remarks / Status',
  ]

  headers.forEach((h, idx) => {
    drawCell(page, colX[idx], y - hH, cols[idx], hH, {
      text: h,
      font: fontBold,
      fontSize: 7,
      align: 'center',
      bgColor: headerBg,
      borderColor: tableBorder,
      wrap: true,
    })
  })
  y -= hH

  const rowH = 13.5
  const cWeekendBg = rgb(1, 0.93, 0.93)
  const cHolidayBg = rgb(1, 1, 0.75)
  const cTotalBg = rgb(0.8, 1, 0.8)

  input.days.forEach((day) => {
    const isSunday = day.dayName === 'Sunday' || day.dayName === 'Saturday'
    const isOff = !day.clockIn && !day.clockOut
    const bgColor = day.isHoliday ? cHolidayBg : isSunday ? cWeekendBg : undefined
    const dayColor = isSunday || day.isHoliday ? rgb(0.8, 0, 0) : rgb(0, 0, 0)

    const workTimes = day.clockIn ? `${day.clockIn} - ${day.clockOut || '-'}` : isOff ? 'OFF' : '-'

    drawCell(page, colX[0], y - rowH, cols[0], rowH, { text: String(day.day), font, fontSize: 7, align: 'center', bgColor, color: dayColor, borderColor: tableBorder })
    drawCell(page, colX[1], y - rowH, cols[1], rowH, { text: day.dayName, font, fontSize: 6.5, align: 'center', bgColor, color: dayColor, borderColor: tableBorder })
    drawCell(page, colX[2], y - rowH, cols[2], rowH, { text: workTimes, font: isOff ? fontBold : font, fontSize: 7, align: 'center', bgColor, borderColor: tableBorder })
    drawCell(page, colX[3], y - rowH, cols[3], rowH, { text: day.durationHours > 0 ? day.durationHours.toFixed(2) : '', font, fontSize: 7, align: 'right', bgColor, borderColor: tableBorder })
    drawCell(page, colX[4], y - rowH, cols[4], rowH, { text: day.effectiveHours > 0 ? day.effectiveHours.toFixed(2) : '', font: fontBold, fontSize: 7, align: 'right', color: rgb(0, 0.3, 0), bgColor, borderColor: tableBorder })
    drawCell(page, colX[5], y - rowH, cols[5], rowH, { text: day.overtimeHours > 0 ? day.overtimeHours.toFixed(2) : '', font, fontSize: 7, align: 'right', bgColor, borderColor: tableBorder })
    drawCell(page, colX[6], y - rowH, cols[6], rowH, { text: day.ewhPercent > 0 ? `${day.ewhPercent.toFixed(1)}%` : '', font: fontBold, fontSize: 7, align: 'right', color: rgb(0, 0.2, 0.5), bgColor, borderColor: tableBorder })
    drawCell(page, colX[7], y - rowH, cols[7], rowH, { text: day.remark || '', font, fontSize: 6, align: 'left', wrap: true, bgColor, borderColor: tableBorder })
    y -= rowH
  })

  // TOTAL Row
  drawCell(page, colX[0], y - rowH, cols[0] + cols[1] + cols[2], rowH, { text: 'TOTAL / AVERAGE', font: fontBold, fontSize: 7.5, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[3], y - rowH, cols[3], rowH, { text: input.totals.totalDurationHours.toFixed(2), font: fontBold, fontSize: 7.5, align: 'right', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[4], y - rowH, cols[4], rowH, { text: input.totals.totalEffectiveHours.toFixed(2), font: fontBold, fontSize: 7.5, align: 'right', color: rgb(0, 0.4, 0), bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[5], y - rowH, cols[5], rowH, { text: input.totals.totalOvertimeHours.toFixed(2), font: fontBold, fontSize: 7.5, align: 'right', bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[6], y - rowH, cols[6], rowH, { text: `${input.totals.avgEwhPercent.toFixed(1)}%`, font: fontBold, fontSize: 8, align: 'right', color: rgb(0, 0.2, 0.6), bgColor: cTotalBg, borderColor: tableBorder })
  drawCell(page, colX[7], y - rowH, cols[7], rowH, { text: `Hadir: ${input.totals.presentDays} Hari`, font: fontBold, fontSize: 7, align: 'center', bgColor: cTotalBg, borderColor: tableBorder })
  y -= rowH + 28

  // Signatures (hidden by default / optional)
  if (input.showSignatures && input.signatures) {
    drawPdfSignatures(page, { regular: font, italic: fontItalic }, Math.max(50, y), input.signatures)
  }

  return doc.save()
}
