import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface CerPdfItem {
  description: string
  qty: number
  pricePerUnit: number | string
  totalPrice: number | string
  allocation: string
  holderName: string
  estimatedLifespan: string
}

export interface CerPdfApprovalStep {
  stepOrder: number
  label: string
  approverName: string
  jobTitle?: string | null
  status: string
  reviewedAt?: Date | string | null
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
  createdAt: Date | string
  approvedAt?: Date | string | null
  items: CerPdfItem[]
  approvals: CerPdfApprovalStep[]
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

function formatRupiah(amount: number | string | null | undefined): string {
  if (amount == null) return '0'
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('id-ID').format(num)
}

export async function generateCerPdf(data: CerPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 Portrait
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const primaryNavy = rgb(0.08, 0.2, 0.38)
  const textDark = rgb(0.12, 0.14, 0.17)
  const textGray = rgb(0.4, 0.45, 0.5)
  const bgHeader = rgb(0.94, 0.96, 0.98)
  const borderGray = rgb(0.82, 0.85, 0.89)
  const successGreen = rgb(0.06, 0.53, 0.26)

  let cursorY = height - 40

  // 1. Header Box
  page.drawRectangle({
    x: 40,
    y: cursorY - 60,
    width: width - 80,
    height: 70,
    color: bgHeader,
    borderColor: borderGray,
    borderWidth: 1,
  })

  page.drawText('PT CHITRA PARATAMA', {
    x: 55,
    y: cursorY - 12,
    size: 14,
    font: helveticaBold,
    color: primaryNavy,
  })

  page.drawText('CAPITAL EXPENDITURE REQUEST (CER)', {
    x: 55,
    y: cursorY - 30,
    size: 12,
    font: helveticaBold,
    color: textDark,
  })

  page.drawText(`No. Registrasi: ${data.cerNumber}`, {
    x: 55,
    y: cursorY - 48,
    size: 9,
    font: helvetica,
    color: textGray,
  })

  // Status Badge on Top Right
  page.drawRectangle({
    x: width - 165,
    y: cursorY - 38,
    width: 110,
    height: 24,
    color: rgb(0.9, 0.97, 0.92),
    borderColor: successGreen,
    borderWidth: 1,
  })
  page.drawText('FULL APPROVED', {
    x: width - 153,
    y: cursorY - 28,
    size: 9,
    font: helveticaBold,
    color: successGreen,
  })

  cursorY -= 75

  // 2. Section: Informasi Pengajuan & Pemohon
  page.drawRectangle({
    x: 40,
    y: cursorY - 110,
    width: width - 80,
    height: 115,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 1,
  })

  // Title Bar
  page.drawRectangle({
    x: 40,
    y: cursorY - 20,
    width: width - 80,
    height: 25,
    color: rgb(0.96, 0.97, 0.98),
  })
  page.drawText('I. DETAIL PEMOHON & KLASIFIKASI PENGADAAN', {
    x: 50,
    y: cursorY - 14,
    size: 9,
    font: helveticaBold,
    color: primaryNavy,
  })

  // Row 1
  page.drawText('Perihal / Subject:', { x: 50, y: cursorY - 36, size: 8, font: helveticaBold, color: textDark })
  page.drawText(data.subject.substring(0, 75), { x: 140, y: cursorY - 36, size: 8, font: helvetica, color: textDark })

  // Row 2 (2 columns)
  page.drawText('Pemohon:', { x: 50, y: cursorY - 52, size: 8, font: helveticaBold, color: textDark })
  page.drawText(`${data.applicantName} (${data.applicantSn || '-'})`, { x: 140, y: cursorY - 52, size: 8, font: helvetica, color: textDark })
  page.drawText('Tgl Dibutuhkan:', { x: 330, y: cursorY - 52, size: 8, font: helveticaBold, color: textDark })
  page.drawText(formatIndoDate(data.dateRequired), { x: 420, y: cursorY - 52, size: 8, font: helvetica, color: textDark })

  // Row 3
  page.drawText('Departemen / Site:', { x: 50, y: cursorY - 68, size: 8, font: helveticaBold, color: textDark })
  page.drawText(`${data.departmentName} / ${data.siteName}`, { x: 140, y: cursorY - 68, size: 8, font: helvetica, color: textDark })
  page.drawText('Kategori Aset:', { x: 330, y: cursorY - 68, size: 8, font: helveticaBold, color: textDark })
  page.drawText(data.assetCategory || '-', { x: 420, y: cursorY - 68, size: 8, font: helvetica, color: textDark })

  // Row 4
  page.drawText('Jenis Pembelian:', { x: 50, y: cursorY - 84, size: 8, font: helveticaBold, color: textDark })
  page.drawText(data.purchaseType, { x: 140, y: cursorY - 84, size: 8, font: helvetica, color: textDark })
  page.drawText('Sumber Anggaran:', { x: 330, y: cursorY - 84, size: 8, font: helveticaBold, color: textDark })
  page.drawText(data.budgetSource || '-', { x: 420, y: cursorY - 84, size: 8, font: helvetica, color: textDark })

  // Row 5
  page.drawText('Pemasok / Vendor:', { x: 50, y: cursorY - 100, size: 8, font: helveticaBold, color: textDark })
  page.drawText(data.vendorName || '-', { x: 140, y: cursorY - 100, size: 8, font: helvetica, color: textDark })
  page.drawText('Alokasi CapEx:', { x: 330, y: cursorY - 100, size: 8, font: helveticaBold, color: textDark })
  page.drawText(data.budgetName || 'Anggaran Operasional CapEx', { x: 420, y: cursorY - 100, size: 8, font: helvetica, color: textDark })

  cursorY -= 125

  // 3. Section: Tujuan Pembelian
  page.drawRectangle({
    x: 40,
    y: cursorY - 50,
    width: width - 80,
    height: 55,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawRectangle({
    x: 40,
    y: cursorY - 16,
    width: width - 80,
    height: 21,
    color: rgb(0.96, 0.97, 0.98),
  })
  page.drawText('II. TUJUAN PEMBELIAN & JUSTIFIKASI KEBUTUHAN', {
    x: 50,
    y: cursorY - 11,
    size: 9,
    font: helveticaBold,
    color: primaryNavy,
  })
  page.drawText(data.purchasePurpose || 'Kebutuhan operasional aset modal PT Chitra Paratama.', {
    x: 50,
    y: cursorY - 34,
    size: 8,
    font: helvetica,
    color: textDark,
  })

  cursorY -= 65

  // 4. Section: Tabel Detail Unit Aset
  const tableStartY = cursorY
  page.drawRectangle({
    x: 40,
    y: tableStartY - 18,
    width: width - 80,
    height: 23,
    color: rgb(0.96, 0.97, 0.98),
  })
  page.drawText('III. RINCIAN BARANG / UNIT ASET', {
    x: 50,
    y: tableStartY - 13,
    size: 9,
    font: helveticaBold,
    color: primaryNavy,
  })

  cursorY -= 25

  // Table Column Headers
  const colX = {
    no: 45,
    desc: 65,
    qty: 235,
    price: 275,
    total: 355,
    alloc: 435,
    holder: 495,
  }

  page.drawRectangle({
    x: 40,
    y: cursorY - 16,
    width: width - 80,
    height: 20,
    color: rgb(0.92, 0.94, 0.96),
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawText('No', { x: colX.no, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Deskripsi Unit', { x: colX.desc, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Qty', { x: colX.qty, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Harga Satuan (Rp)', { x: colX.price, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Total (Rp)', { x: colX.total, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Alokasi', { x: colX.alloc, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Holder', { x: colX.holder, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })

  cursorY -= 20

  // Draw Table Rows
  const items = data.items && data.items.length > 0 ? data.items : []
  items.slice(0, 10).forEach((item, idx) => {
    page.drawRectangle({
      x: 40,
      y: cursorY - 16,
      width: width - 80,
      height: 20,
      color: idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.99, 1),
      borderColor: borderGray,
      borderWidth: 0.5,
    })

    page.drawText(String(idx + 1), { x: colX.no, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText(item.description.substring(0, 32), { x: colX.desc, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText(String(item.qty), { x: colX.qty + 4, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText(formatRupiah(item.pricePerUnit), { x: colX.price, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText(formatRupiah(item.totalPrice), { x: colX.total, y: cursorY - 12, size: 7.5, font: helveticaBold, color: textDark })
    page.drawText((item.allocation || '-').substring(0, 10), { x: colX.alloc, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText((item.holderName || '-').substring(0, 12), { x: colX.holder, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })

    cursorY -= 20
  })

  // Total Summary Row
  page.drawRectangle({
    x: 40,
    y: cursorY - 18,
    width: width - 80,
    height: 22,
    color: rgb(0.93, 0.95, 0.98),
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawText('TOTAL ESTIMASI BIAYA CAPEX:', {
    x: colX.desc,
    y: cursorY - 13,
    size: 8,
    font: helveticaBold,
    color: primaryNavy,
  })
  page.drawText(`Rp ${formatRupiah(data.totalEstimatedPrice)}`, {
    x: colX.total,
    y: cursorY - 13,
    size: 9,
    font: helveticaBold,
    color: primaryNavy,
  })

  cursorY -= 35

  // 5. Section: Rantai Persetujuan / Approval Matrix
  page.drawRectangle({
    x: 40,
    y: cursorY - 18,
    width: width - 80,
    height: 23,
    color: rgb(0.96, 0.97, 0.98),
  })
  page.drawText('IV. LEMBAR PERSETUJUAN BERJENJANG (APPROVAL MATRIX)', {
    x: 50,
    y: cursorY - 13,
    size: 9,
    font: helveticaBold,
    color: primaryNavy,
  })

  cursorY -= 28

  // Draw Approver Signature Grid
  const approvals = data.approvals && data.approvals.length > 0 ? data.approvals : []
  const maxBoxesPerRow = 3
  const boxWidth = (width - 80 - (maxBoxesPerRow - 1) * 8) / maxBoxesPerRow
  const boxHeight = 75

  let currentX = 40
  let currentY = cursorY - boxHeight

  approvals.slice(0, 6).forEach((app, idx) => {
    if (idx > 0 && idx % maxBoxesPerRow === 0) {
      currentX = 40
      currentY -= boxHeight + 8
    }

    page.drawRectangle({
      x: currentX,
      y: currentY,
      width: boxWidth,
      height: boxHeight,
      color: rgb(1, 1, 1),
      borderColor: borderGray,
      borderWidth: 1,
    })

    // Header label
    page.drawRectangle({
      x: currentX,
      y: currentY + boxHeight - 16,
      width: boxWidth,
      height: 16,
      color: rgb(0.95, 0.96, 0.98),
    })
    page.drawText(`${app.stepOrder}. ${app.label}`.substring(0, 26), {
      x: currentX + 6,
      y: currentY + boxHeight - 12,
      size: 7.5,
      font: helveticaBold,
      color: textDark,
    })

    // Status stamp
    page.drawText('APPROVED', {
      x: currentX + 45,
      y: currentY + 36,
      size: 10,
      font: helveticaBold,
      color: successGreen,
    })

    // Approver Name & Date
    page.drawText(app.approverName.substring(0, 24), {
      x: currentX + 6,
      y: currentY + 16,
      size: 7.5,
      font: helveticaBold,
      color: textDark,
    })
    page.drawText(formatIndoDate(app.reviewedAt || data.approvedAt), {
      x: currentX + 6,
      y: currentY + 6,
      size: 7,
      font: helvetica,
      color: textGray,
    })

    currentX += boxWidth + 8
  })

  // Footer Note
  page.drawText('Dokumen ini digenerate secara otomatis oleh HERO Asset Management System - PT Chitra Paratama.', {
    x: 40,
    y: 20,
    size: 7,
    font: helvetica,
    color: textGray,
  })

  return await pdfDoc.save()
}
