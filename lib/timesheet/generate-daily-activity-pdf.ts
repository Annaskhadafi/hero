import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from 'pdf-lib'

import { drawPdfSignatures, type PdfSignatureNames } from '@/lib/timesheet/pdf-signatures'

type DailyActivityInput = {
  period: string
  employeeName: string
  employeeSn: string
  department: string
  section: string
  siteName: string
  signatures: PdfSignatureNames
  activities: Array<{
    id: number
    activityCode: string
    title: string
    startTime: string
    endTime: string
    status: string
  }>
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-').map(Number)
  const months = [
    '',
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
  return `${months[month]} ${year}`
}

function getDayName(dateStr: string) {
  const date = new Date(dateStr)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[date.getDay()]
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function calcDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}j ${minutes}m`
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
  }
) {
  const opts = options ?? {}
  const borderColor = rgb(0.3, 0.3, 0.3)
  if (opts.bgColor) page.drawRectangle({ x, y, width: w, height: h, color: opts.bgColor })
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
      size: fontSize,
      font: opts.font,
      color: textColor,
    })
  }
}

export async function generateDailyActivityPdf(input: DailyActivityInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pageWidth = 595
  const pageHeight = 842
  const margin = 40
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let yPos = pageHeight - margin
  const title = 'LAPORAN AKTIVITAS HARIAN'
  page.drawText(title, {
    x: centerX(pageWidth, title, fontBold, 14),
    y: yPos,
    size: 14,
    font: fontBold,
  })
  yPos -= 20
  const periodLabel = formatPeriodLabel(input.period)
  page.drawText(periodLabel, {
    x: centerX(pageWidth, periodLabel, font, 10),
    y: yPos,
    size: 10,
    font,
  })
  yPos -= 30
  const infoLines = [
    `Nama: ${input.employeeName}`,
    `SN: ${input.employeeSn}`,
    `Departemen: ${input.department}`,
    `Seksi: ${input.section}`,
    `Site: ${input.siteName}`,
  ]
  for (const line of infoLines) {
    page.drawText(line, { x: margin, y: yPos, size: 9, font })
    yPos -= 14
  }
  yPos -= 10
  const colWidths = [30, 60, 50, 200, 60, 60, 50]
  const rowHeight = 20
  const headers = ['No', 'Tanggal', 'Hari', 'Kegiatan', 'Mulai', 'Selesai', 'Durasi']
  let xPos = margin
  for (let i = 0; i < headers.length; i++) {
    drawCell(page, xPos, yPos - rowHeight, colWidths[i], rowHeight, {
      text: headers[i],
      font: fontBold,
      fontSize: 8,
      align: 'center',
      bgColor: rgb(0.9, 0.9, 0.9),
    })
    xPos += colWidths[i]
  }
  yPos -= rowHeight
  for (let i = 0; i < input.activities.length; i++) {
    const activity = input.activities[i]
    if (yPos < margin + 100) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      yPos = pageHeight - margin
    }
    xPos = margin
    const rowData = [
      String(i + 1),
      formatDate(activity.startTime),
      getDayName(activity.startTime),
      `${activity.activityCode} - ${activity.title}`,
      formatTime(activity.startTime),
      formatTime(activity.endTime),
      calcDuration(activity.startTime, activity.endTime),
    ]
    for (let j = 0; j < rowData.length; j++) {
      drawCell(page, xPos, yPos - rowHeight, colWidths[j], rowHeight, {
        text: rowData[j],
        font,
        fontSize: 7,
        align: j === 0 || j === 6 ? 'center' : 'left',
      })
      xPos += colWidths[j]
    }
    yPos -= rowHeight
  }
  yPos -= 20
  page.drawText(`Total Aktivitas: ${input.activities.length}`, {
    x: margin,
    y: yPos,
    size: 9,
    font: fontBold,
  })
  yPos -= 35
  drawPdfSignatures(page, { regular: font, italic: font }, yPos, input.signatures)
  return pdfDoc.save()
}
