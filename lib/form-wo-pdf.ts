import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { getS3ObjectForProxy, isS3UploadConfigured, extractS3ObjectKeyFromUrl } from '@/lib/s3-storage'

export interface FormWoPdfStep {
  level: number
  approverName?: string | null
  jobTitle?: string | null
  signatureUrl?: string | null
  status?: string | null
  reviewedAt?: Date | string | null
  decisionNote?: string | null
}

export interface FormWoPdfData {
  id?: number
  noPengajuan: string
  jenisPengajuan: string
  noWoTerbit?: string | null
  noPo?: string | null
  tanggalPo?: string | null
  hari?: string | null
  tanggal?: string | null
  tanggalPengajuan?: Date | string | null
  customer?: string | null
  site?: string | null
  pemohon?: string | null
  pemohonJobTitle?: string | null
  submitterSignatureUrl?: string | null
  catatanPengajuan?: string | null
  totalAmount?: string | number | null
  items?: any[] | string | null
  steps?: FormWoPdfStep[]
}

function formatIndoDate(val?: string | Date | null): string {
  if (!val) return '-'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return String(val)
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatIndoDay(val?: string | Date | null): string {
  if (!val) return '-'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return '-'
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[d.getDay()] || '-'
}

function formatCurrency(val?: string | number | null): string {
  if (!val) return 'Rp 0'
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0
  return `Rp ${num.toLocaleString('id-ID')}`
}

function fitText(text: string, maxWidth: number, font: any, fontSize: number): string {
  if (!text || text === '-') return '-'
  let str = text.trim()
  if (font.widthOfTextAtSize(str, fontSize) <= maxWidth) {
    return str
  }
  while (str.length > 1 && font.widthOfTextAtSize(str + '..', fontSize) > maxWidth) {
    str = str.slice(0, -1)
  }
  return str + '..'
}

async function loadSignatureImageBytes(sigUrl: string | null | undefined): Promise<{ bytes: Uint8Array | Buffer; format: 'png' | 'jpg' } | null> {
  if (!sigUrl) return null
  try {
    const trimmed = sigUrl.trim()
    if (trimmed.startsWith('data:image/png;base64,')) {
      return { bytes: Buffer.from(trimmed.replace('data:image/png;base64,', ''), 'base64'), format: 'png' }
    }
    if (trimmed.startsWith('data:image/jpeg;base64,') || trimmed.startsWith('data:image/jpg;base64,')) {
      return { bytes: Buffer.from(trimmed.replace(/^data:image\/\w+;base64,/, ''), 'base64'), format: 'jpg' }
    }
    if (trimmed.startsWith('data:image/')) {
      const b64 = trimmed.split(',')[1]
      if (b64) return { bytes: Buffer.from(b64, 'base64'), format: 'png' }
    }

    const s3Key = extractS3ObjectKeyFromUrl(trimmed) || trimmed.replace(/^\/api\/uploads\//, '').replace(/^\/uploads\//, '')
    if (isS3UploadConfigured() && s3Key) {
      const s3Obj = await getS3ObjectForProxy(s3Key).catch(() => null)
      if (s3Obj?.body) {
        const format = s3Obj.contentType?.includes('jpeg') || s3Key.endsWith('.jpg') || s3Key.endsWith('.jpeg') ? 'jpg' : 'png'
        return { bytes: s3Obj.body, format }
      }
    }

    const candidates = [
      path.join(process.cwd(), 'public', 'uploads', s3Key || ''),
      path.join(process.cwd(), 'public', s3Key || ''),
      path.join(process.cwd(), 'public', trimmed.replace(/^\//, '')),
      path.join(process.cwd(), 'public', 'uploads', trimmed.replace(/^\//, '')),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p)
        const format = p.endsWith('.jpg') || p.endsWith('.jpeg') ? 'jpg' : 'png'
        return { bytes: buf, format }
      }
    }
  } catch (err) {
    console.error('Error loading signature image:', err)
  }
  return null
}

export async function generateFormWoPdf(data: FormWoPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 Portrait
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

  // Top Title Bar: Only the clean Logo on left
  const logoPath = path.join(process.cwd(), 'public', 'cp_logo-removebg-preview.png')
  let logoImg: any = null
  if (fs.existsSync(logoPath)) {
    try {
      const imgBytes = fs.readFileSync(logoPath)
      logoImg = await pdfDoc.embedPng(imgBytes)
    } catch {}
  }

  let curY = height - 40

  if (logoImg) {
    page.drawImage(logoImg, {
      x: 36,
      y: curY - 30,
      width: 95,
      height: 44,
    })
  }

  // Right-aligned Document Title
  const docTitle = 'FORM PERMINTAAN WORK ORDER'
  const titleWidth = fontBold.widthOfTextAtSize(docTitle, 13)
  page.drawText(docTitle, {
    x: width - 36 - titleWidth,
    y: curY - 8,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  })

  const noPengajuanText = `No. Pengajuan: ${data.noPengajuan || '-'}`
  const noPengajuanWidth = fontRegular.widthOfTextAtSize(noPengajuanText, 9)
  page.drawText(noPengajuanText, {
    x: width - 36 - noPengajuanWidth,
    y: curY - 22,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  })

  curY -= 45

  // Divider line
  page.drawLine({
    start: { x: 36, y: curY },
    end: { x: width - 36, y: curY },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.9),
  })

  curY -= 14

  // Subheader Info Grid Box (Hari, Tanggal, Jenis Form, Pemohon)
  const rawDate = data.tanggal || data.tanggalPengajuan
  const displayDay = data.hari && data.hari !== '-' ? data.hari : formatIndoDay(rawDate)
  const displayDate = formatIndoDate(rawDate)
  const jenisForm = (data.jenisPengajuan || 'WORK ORDER').toUpperCase()

  const boxX = 36
  const boxW = width - 72
  const boxH = 46
  page.drawRectangle({
    x: boxX,
    y: curY - boxH,
    width: boxW,
    height: boxH,
    color: rgb(0.96, 0.97, 0.98),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  })

  const colW = boxW / 4
  const row1Y = curY - 16
  const row2Y = curY - 32

  // Col 1: Hari
  page.drawText('HARI', { x: boxX + 10, y: row1Y, size: 7, font: fontBold, color: rgb(0.4, 0.45, 0.5) })
  page.drawText(displayDay, { x: boxX + 10, y: row2Y, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) })

  // Vertical Divider 1
  page.drawLine({
    start: { x: boxX + colW, y: curY },
    end: { x: boxX + colW, y: curY - boxH },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  })

  // Col 2: Tanggal
  page.drawText('TANGGAL', { x: boxX + colW + 10, y: row1Y, size: 7, font: fontBold, color: rgb(0.4, 0.45, 0.5) })
  page.drawText(displayDate, { x: boxX + colW + 10, y: row2Y, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) })

  // Vertical Divider 2
  page.drawLine({
    start: { x: boxX + colW * 2, y: curY },
    end: { x: boxX + colW * 2, y: curY - boxH },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  })

  // Col 3: Jenis Form
  page.drawText('JENIS FORM', { x: boxX + colW * 2 + 10, y: row1Y, size: 7, font: fontBold, color: rgb(0.4, 0.45, 0.5) })
  page.drawText(jenisForm, { x: boxX + colW * 2 + 10, y: row2Y, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) })

  // Vertical Divider 3
  page.drawLine({
    start: { x: boxX + colW * 3, y: curY },
    end: { x: boxX + colW * 3, y: curY - boxH },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  })

  // Col 4: Pemohon
  page.drawText('PEMOHON', { x: boxX + colW * 3 + 10, y: row1Y, size: 7, font: fontBold, color: rgb(0.4, 0.45, 0.5) })
  const pemohonDisplay = (data.pemohon || 'Admin CP Site').length > 22 ? (data.pemohon || 'Admin CP Site').substring(0, 20) + '..' : (data.pemohon || 'Admin CP Site')
  page.drawText(pemohonDisplay, { x: boxX + colW * 3 + 10, y: row2Y, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) })

  curY -= (boxH + 10)

  // Customer & Site Box Only (with vertical divider line to prevent collision)
  const metaBoxH = 26
  page.drawRectangle({
    x: boxX,
    y: curY - metaBoxH,
    width: boxW,
    height: metaBoxH,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  })

  const custColW = boxW * 0.6
  const custLabel = 'Customer: '
  const custLabelW = fontBold.widthOfTextAtSize(custLabel, 8)
  page.drawText(custLabel, { x: boxX + 10, y: curY - 17, size: 8, font: fontBold, color: rgb(0.25, 0.3, 0.38) })
  
  const rawCustomer = data.customer || '-'
  const fittedCustomer = fitText(rawCustomer, custColW - custLabelW - 16, fontRegular, 8)
  page.drawText(fittedCustomer, {
    x: boxX + 10 + custLabelW,
    y: curY - 17,
    size: 8,
    font: fontRegular,
    color: rgb(0.1, 0.15, 0.25),
  })

  // Vertical dividing line between Customer and Site
  page.drawLine({
    start: { x: boxX + custColW, y: curY },
    end: { x: boxX + custColW, y: curY - metaBoxH },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  })

  const siteLabel = 'Site: '
  const siteLabelW = fontBold.widthOfTextAtSize(siteLabel, 8)
  page.drawText(siteLabel, { x: boxX + custColW + 10, y: curY - 17, size: 8, font: fontBold, color: rgb(0.25, 0.3, 0.38) })

  const rawSite = data.site || '-'
  const fittedSite = fitText(rawSite, (boxW - custColW) - siteLabelW - 16, fontRegular, 8)
  page.drawText(fittedSite, {
    x: boxX + custColW + 10 + siteLabelW,
    y: curY - 17,
    size: 8,
    font: fontRegular,
    color: rgb(0.1, 0.15, 0.25),
  })

  curY -= (metaBoxH + 16)

  // Section: Rincian Permintaan Pekerjaan (Items Table)
  page.drawText('RINCIAN PERMINTAAN PEKERJAAN (ITEMS)', {
    x: 36,
    y: curY,
    size: 8,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.4),
  })
  curY -= 12

  // Parse items
  let itemsList: any[] = []
  if (Array.isArray(data.items)) {
    itemsList = data.items
  } else if (typeof data.items === 'string' && data.items.trim()) {
    try {
      itemsList = JSON.parse(data.items)
    } catch {}
  }

  // Table Headers
  const tableX = 36
  const tableW = width - 72
  const thH = 20

  page.drawRectangle({
    x: tableX,
    y: curY - thH,
    width: tableW,
    height: thH,
    color: rgb(0.93, 0.95, 0.97),
    borderColor: rgb(0.75, 0.8, 0.85),
    borderWidth: 1,
  })

  // Column definitions matching UI table with crisp boundaries:
  // No | Customer | Site | Tire Size | SN Tire | Brand | Cat. Injury | Price | WO CP | Number PO | Date PO | POS
  const columns = [
    { label: 'NO', w: 18, align: 'center' },
    { label: 'CUSTOMER', w: 70 },
    { label: 'SITE', w: 42 },
    { label: 'TIRE SIZE', w: 42 },
    { label: 'SN TIRE', w: 54 },
    { label: 'BRAND', w: 42 },
    { label: 'CAT. INJURY', w: 50 },
    { label: 'PRICE', w: 50, align: 'right' },
    { label: 'WO CP', w: 48 },
    { label: 'NUMBER PO', w: 48 },
    { label: 'DATE PO', w: 38 },
    { label: 'POS', w: 21.28, align: 'center' },
  ]

  let curColX = tableX
  for (let cIdx = 0; cIdx < columns.length; cIdx++) {
    const col = columns[cIdx]
    const textX = col.align === 'right' ? curColX + col.w - 3 - fontBold.widthOfTextAtSize(col.label, 6) : col.align === 'center' ? curColX + (col.w - fontBold.widthOfTextAtSize(col.label, 6)) / 2 : curColX + 3
    page.drawText(col.label, {
      x: textX,
      y: curY - 13,
      size: 6,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.3),
    })

    // Vertical border line between header columns
    if (cIdx > 0) {
      page.drawLine({
        start: { x: curColX, y: curY },
        end: { x: curColX, y: curY - thH },
        thickness: 1,
        color: rgb(0.75, 0.8, 0.85),
      })
    }

    curColX += col.w
  }

  curY -= thH

  // Render Table Rows (up to 8 rows max per page)
  let totalAmountCalculated = 0
  const renderRows = itemsList.length > 0 ? itemsList.slice(0, 8) : [{
    customer: data.customer || '-',
    site: data.site || '-',
    size: '-',
    description: '-',
    brand: '-',
    category: data.jenisPengajuan === 'service' ? 'Service' : 'R1',
    price: data.totalAmount || 0,
    noWoCp: data.noWoTerbit || '-',
    noPo: data.noPo || '-',
    tanggalPo: data.tanggalPo || '-',
    pos: '-',
  }]

  for (let idx = 0; idx < renderRows.length; idx++) {
    const row = renderRows[idx]
    const rowH = 18
    const priceNum = typeof row.price === 'number' ? row.price : parseFloat(String(row.price || '').replace(/[^0-9.-]+/g, '')) || 0
    totalAmountCalculated += priceNum

    page.drawRectangle({
      x: tableX,
      y: curY - rowH,
      width: tableW,
      height: rowH,
      color: idx % 2 === 1 ? rgb(0.98, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.88, 0.9, 0.93),
      borderWidth: 1,
    })

    const rowValues = [
      String(idx + 1),
      row.customer || data.customer || '-',
      row.site || data.site || '-',
      row.size || '-',
      row.description || row.tireSn || '-',
      row.brand || '-',
      row.category || (data.jenisPengajuan === 'service' ? 'Service' : 'R1'),
      priceNum > 0 ? formatCurrency(priceNum) : '-',
      row.noWoCp || data.noWoTerbit || '-',
      row.noPo || data.noPo || '-',
      row.tanggalPo ? (String(row.tanggalPo).length > 10 ? formatIndoDate(row.tanggalPo) : String(row.tanggalPo)) : '-',
      row.pos || '-',
    ]

    let rowColX = tableX
    for (let cIdx = 0; cIdx < columns.length; cIdx++) {
      const col = columns[cIdx]
      const rawVal = rowValues[cIdx] || '-'
      const displayVal = fitText(rawVal, col.w - 6, fontRegular, 6)
      const textW = fontRegular.widthOfTextAtSize(displayVal, 6)
      const textX = col.align === 'right' ? rowColX + col.w - 3 - textW : col.align === 'center' ? rowColX + (col.w - textW) / 2 : rowColX + 3

      page.drawText(displayVal, {
        x: textX,
        y: curY - 12,
        size: 6,
        font: fontRegular,
        color: rgb(0.15, 0.2, 0.25),
      })

      // Vertical border line between data cells
      if (cIdx > 0) {
        page.drawLine({
          start: { x: rowColX, y: curY },
          end: { x: rowColX, y: curY - rowH },
          thickness: 1,
          color: rgb(0.88, 0.9, 0.93),
        })
      }

      rowColX += col.w
    }

    curY -= rowH
  }

  // Total Amount Row (Yellow Highlight)
  const totalRowH = 20
  page.drawRectangle({
    x: tableX,
    y: curY - totalRowH,
    width: tableW,
    height: totalRowH,
    color: rgb(1, 0.85, 0.15),
    borderColor: rgb(0.75, 0.8, 0.85),
    borderWidth: 1,
  })

  page.drawText('TOTAL AMOUNT', {
    x: tableX + 10,
    y: curY - 14,
    size: 8,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  // Vertical border line before price in total row
  const priceColX = tableX + columns.slice(0, 7).reduce((sum, c) => sum + c.w, 0)
  page.drawLine({
    start: { x: priceColX, y: curY },
    end: { x: priceColX, y: curY - totalRowH },
    thickness: 1,
    color: rgb(0.75, 0.8, 0.85),
  })

  const finalTotalText = formatCurrency(totalAmountCalculated > 0 ? totalAmountCalculated : data.totalAmount)
  const totalTextW = fontBold.widthOfTextAtSize(finalTotalText, 8.5)
  page.drawText(finalTotalText, {
    x: priceColX + columns[7].w - 3 - totalTextW,
    y: curY - 14,
    size: 8.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  curY -= (totalRowH + 20)

  // 5 Signature Boxes Table
  const steps = data.steps || []
  const step1 = steps.find((s) => s.level === 1)
  const step2 = steps.find((s) => s.level === 2)
  const step3 = steps.find((s) => s.level === 3)
  const step4 = steps.find((s) => s.level === 4)
  const step5 = steps.find((s) => s.level === 5)

  const sigCols = [
    {
      header: 'DIAJUKAN OLEH',
      name: data.pemohon || step1?.approverName || 'Admin CP Site',
      jobTitle: step1?.jobTitle || data.pemohonJobTitle || 'Admin CP Site',
      sigUrl: data.submitterSignatureUrl || step1?.signatureUrl || null,
      date: formatIndoDate(data.tanggalPengajuan || data.tanggal),
      note: data.catatanPengajuan || step1?.decisionNote || null,
    },
    {
      header: 'DISETUJUI OLEH',
      name: step2?.approverName || 'QC / Leader',
      jobTitle: step2?.jobTitle || 'QC / Leader',
      sigUrl: step2?.signatureUrl || null,
      date: step2?.reviewedAt ? formatIndoDate(step2.reviewedAt) : '-',
      note: step2?.decisionNote || null,
    },
    {
      header: 'DISETUJUI OLEH',
      name: step3?.approverName || 'Repair / Retread Operation SPV',
      jobTitle: step3?.jobTitle || 'Repair / Retread Operation SPV',
      sigUrl: step3?.signatureUrl || null,
      date: step3?.reviewedAt ? formatIndoDate(step3.reviewedAt) : '-',
      note: step3?.decisionNote || null,
    },
    {
      header: 'DIPERIKSA OLEH',
      name: step4?.approverName || 'Team Billing',
      jobTitle: step4?.jobTitle || 'Team Billing',
      sigUrl: step4?.signatureUrl || null,
      date: step4?.reviewedAt ? formatIndoDate(step4.reviewedAt) : '-',
      note: step4?.decisionNote || null,
    },
    {
      header: 'MENGETAHUI',
      name: step5?.approverName || 'Inventory & Warehouse Management SPV',
      jobTitle: step5?.jobTitle || 'Inventory & Warehouse Management SPV',
      sigUrl: step5?.signatureUrl || null,
      date: step5?.reviewedAt ? formatIndoDate(step5.reviewedAt) : '-',
      note: step5?.decisionNote || null,
    },
  ]

  const sigTableW = width - 72
  const sigBoxW = sigTableW / 5
  const sigHeaderH = 18
  const sigCanvasH = 65
  const sigInfoH = 45
  const totalSigH = sigHeaderH + sigCanvasH + sigInfoH

  // Embed signature images
  for (let i = 0; i < sigCols.length; i++) {
    const col = sigCols[i]
    const x = tableX + i * sigBoxW

    // Header box
    page.drawRectangle({
      x,
      y: curY - sigHeaderH,
      width: sigBoxW,
      height: sigHeaderH,
      color: rgb(0.94, 0.96, 0.98),
      borderColor: rgb(0.75, 0.8, 0.85),
      borderWidth: 1,
    })
    const hTextW = fontBold.widthOfTextAtSize(col.header, 6.5)
    page.drawText(col.header, {
      x: x + (sigBoxW - hTextW) / 2,
      y: curY - 12,
      size: 6.5,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    })

    // Canvas box
    page.drawRectangle({
      x,
      y: curY - sigHeaderH - sigCanvasH,
      width: sigBoxW,
      height: sigCanvasH,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.75, 0.8, 0.85),
      borderWidth: 1,
    })

    // Load and embed signature image
    let embeddedSig: any = null
    if (col.sigUrl) {
      const sigData = await loadSignatureImageBytes(col.sigUrl)
      if (sigData) {
        try {
          embeddedSig = sigData.format === 'jpg'
            ? await pdfDoc.embedJpg(sigData.bytes)
            : await pdfDoc.embedPng(sigData.bytes)
        } catch (embedErr) {
          console.error('Failed to embed signature into PDF:', embedErr)
        }
      }
    }

    if (embeddedSig) {
      const sigAspect = embeddedSig.width / embeddedSig.height
      let drawW = sigBoxW - 10
      let drawH = drawW / sigAspect
      if (drawH > sigCanvasH - 8) {
        drawH = sigCanvasH - 8
        drawW = drawH * sigAspect
      }

      page.drawImage(embeddedSig, {
        x: x + (sigBoxW - drawW) / 2,
        y: curY - sigHeaderH - sigCanvasH + (sigCanvasH - drawH) / 2,
        width: drawW,
        height: drawH,
      })
    } else {
      const waitText = i === 0 ? '(Disetujui)' : '(Menunggu persetujuan)'
      const waitW = fontRegular.widthOfTextAtSize(waitText, 6.5)
      page.drawText(waitText, {
        x: x + (sigBoxW - waitW) / 2,
        y: curY - sigHeaderH - (sigCanvasH / 2) - 3,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.6, 0.65, 0.7),
      })
    }

    // Name & Title box
    page.drawRectangle({
      x,
      y: curY - totalSigH,
      width: sigBoxW,
      height: sigInfoH,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.75, 0.8, 0.85),
      borderWidth: 1,
    })

    const nameText = `( ${col.name} )`
    const nameSize = col.name.length > 22 ? 5.5 : col.name.length > 16 ? 6 : 6.5
    const nameW = fontBold.widthOfTextAtSize(nameText, nameSize)
    page.drawText(nameText, {
      x: x + (sigBoxW - nameW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 12,
      size: nameSize,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    })

    const titleText = col.jobTitle
    const titleSize = col.jobTitle.length > 25 ? 4.8 : col.jobTitle.length > 18 ? 5.2 : 6
    const titleW = fontRegular.widthOfTextAtSize(titleText, titleSize)
    page.drawText(titleText, {
      x: x + (sigBoxW - titleW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 22,
      size: titleSize,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    })

    const dateText = col.date || '-'
    const dateW = fontMono.widthOfTextAtSize(dateText, 6)
    page.drawText(dateText, {
      x: x + (sigBoxW - dateW) / 2,
      y: curY - sigHeaderH - sigCanvasH - 34,
      size: 6,
      font: fontMono,
      color: rgb(0.5, 0.55, 0.6),
    })
  }

  // Bottom Footer / Timestamp
  page.drawText(`Dokumen resmi PT Chitra Paratama dicetak otomatis melalui HERO System pada ${new Date().toLocaleString('id-ID')}`, {
    x: 36,
    y: 20,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
