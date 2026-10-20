import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawWrapped(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  size: number,
  lineHeight: number,
  color = rgb(0.1, 0.15, 0.2)
): number {
  const lines = wrapText(text, maxWidth, font, size)
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color })
    y -= lineHeight
  }
  return y
}

function getSpFullTitle(spLevel: string): string {
  const norm = (spLevel || '').toLowerCase()
  if (norm === 'teguran' || norm.includes('lisan') || norm.includes('pembinaan')) {
    return 'SURAT TEGURAN TERTULIS / PEMBINAAN'
  }
  if (norm === 'sp1') return 'SURAT PERINGATAN PERTAMA (SP I)'
  if (norm === 'sp2') return 'SURAT PERINGATAN KEDUA (SP II)'
  if (norm === 'sp3') return 'SURAT PERINGATAN KETIGA / TERAKHIR (SP III)'
  if (norm === 'skorsing') return 'SURAT KEPUTUSAN SKORSING SEMENTARA'
  if (norm === 'termination' || norm === 'phk') {
    return 'SURAT PEMUTUSAN HUBUNGAN KERJA (PHK)'
  }
  return `SURAT TINDAKAN DISIPLIN (${(spLevel || '').toUpperCase()})`
}

function formatDateIndo(value?: Date | string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export interface DisciplinaryPdfData {
  letterNumber: string
  spLevel: string
  employeeName: string
  employeeSn: string
  position: string
  department: string
  siteName: string
  categoryName: string
  categoryCode: string
  severity: string
  violationDate: Date | string
  effectiveDate: Date | string
  expiryDate?: Date | string | null
  description: string
  actionTaken?: string
  issuedBy?: string
  issuerDepartment?: string
  issuerSignature?: string | null
  useLetterhead?: boolean
}

export async function generateDisciplinaryLetterPdf(data: DisciplinaryPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  // A4 size: 595.28 x 841.89 points
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // 1. Letterhead background if requested
  if (data.useLetterhead) {
    const letterheadPath = path.join(process.cwd(), 'public', 'ChitraParatama_Stationery_Letterhead_jkt.jpg')
    if (fs.existsSync(letterheadPath)) {
      const imgBytes = fs.readFileSync(letterheadPath)
      const letterheadImg = await pdfDoc.embedJpg(imgBytes)
      page.drawImage(letterheadImg, { x: 0, y: 0, width, height })
    }
  }

  let curY = height - 50

  // 2. Header (if no letterhead background, or standard corporate header)
  if (!data.useLetterhead) {
    const logoPath = path.join(process.cwd(), 'public', 'cp_logo-removebg-preview.png')
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath)
      const logoImg = await pdfDoc.embedPng(logoBytes)
      page.drawImage(logoImg, { x: 50, y: curY - 38, width: 140, height: 42 })
    }

    // Right-aligned corporate info
    const compText = 'PT CHITRA PARATAMA'
    page.drawText(compText, {
      x: width - 50 - fontBold.widthOfTextAtSize(compText, 11),
      y: curY,
      size: 11,
      font: fontBold,
      color: rgb(0.05, 0.1, 0.2),
    })

    const deptText = 'HUMAN CAPITAL & INDUSTRIAL RELATIONS DEPT'
    page.drawText(deptText, {
      x: width - 50 - fontBold.widthOfTextAtSize(deptText, 8.5),
      y: curY - 14,
      size: 8.5,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.3),
    })

    const addrText = 'Gedung TMT 1, Lantai 7, Jl. Cilandak KKO No. 1, Jakarta 12560'
    page.drawText(addrText, {
      x: width - 50 - fontRegular.widthOfTextAtSize(addrText, 7.5),
      y: curY - 26,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    })

    curY -= 48
    // Divider line
    page.drawLine({
      start: { x: 50, y: curY },
      end: { x: width - 50, y: curY },
      thickness: 1.5,
      color: rgb(0.1, 0.15, 0.25),
    })
    curY -= 20
  } else {
    // If letterhead background is used, leave ample breathing room below the top logo
    curY -= 115
  }

  // 3. Document Title & Number
  const title = getSpFullTitle(data.spLevel)
  const titleWidth = fontBold.widthOfTextAtSize(title, 13)
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: curY,
    size: 13,
    font: fontBold,
    color: rgb(0.05, 0.1, 0.2),
  })

  // Title Underline
  page.drawLine({
    start: { x: (width - titleWidth) / 2, y: curY - 2 },
    end: { x: (width + titleWidth) / 2, y: curY - 2 },
    thickness: 1.2,
    color: rgb(0.05, 0.1, 0.2),
  })

  curY -= 16
  const numText = `Nomor: ${data.letterNumber || '-'}`
  const numWidth = fontBold.widthOfTextAtSize(numText, 9.5)
  page.drawText(numText, {
    x: (width - numWidth) / 2,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  })

  curY -= 22

  // 4. Opening Statement
  const intro =
    'Surat ini diterbitkan oleh Manajemen Human Capital PT Chitra Paratama berdasarkan ketentuan Peraturan Perusahaan (PP) / Perjanjian Kerja Bersama (PKB) yang berlaku, ditujukan kepada karyawan:'
  curY = drawWrapped(page, intro, 50, curY, width - 100, fontRegular, 9, 12.5)
  curY -= 6

  // 5. Employee Details Box
  const boxTop = curY
  const boxHeight = 72
  page.drawRectangle({
    x: 50,
    y: boxTop - boxHeight,
    width: width - 100,
    height: boxHeight,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.82, 0.85, 0.88),
    borderWidth: 0.8,
  })

  const leftPad = 62
  const colVal = 190
  let rowY = boxTop - 15

  const rows = [
    { label: 'Nama Karyawan', val: data.employeeName || '-' },
    { label: 'Nomor Induk / SN', val: data.employeeSn || '-' },
    { label: 'Jabatan & Departemen', val: `${data.position || '-'} / ${data.department || '-'}` },
    { label: 'Lokasi Penempatan (Site)', val: data.siteName || 'Head Office' },
  ]

  for (const r of rows) {
    page.drawText(r.label, { x: leftPad, y: rowY, size: 8.5, font: fontBold, color: rgb(0.25, 0.3, 0.35) })
    page.drawText(':', { x: colVal - 10, y: rowY, size: 8.5, font: fontBold, color: rgb(0.25, 0.3, 0.35) })
    page.drawText(r.val, { x: colVal, y: rowY, size: 8.5, font: fontRegular, color: rgb(0.05, 0.1, 0.2) })
    rowY -= 14
  }

  curY = boxTop - boxHeight - 16

  // 6. MENIMBANG & MENGINGAT
  page.drawText('MENIMBANG & MENGINGAT:', {
    x: 50,
    y: curY,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  })
  curY -= 13

  const point1 = `1. Bahwa pada tanggal ${formatDateIndo(data.violationDate)}, Saudara/i telah terbukti melakukan pelanggaran tata tertib kerja dengan klasifikasi [${data.categoryCode || 'KODE'}] ${data.categoryName || 'Pelanggaran Disiplin'} (Tingkat Keparahan: ${(data.severity || 'Medium').toUpperCase()}).`
  curY = drawWrapped(page, point1, 50, curY, width - 100, fontRegular, 8.5, 11.5)
  curY -= 3

  const point2 = `2. Kronologi / Uraian Pelanggaran: "${data.description || 'Pelanggaran tata tertib kerja.'}"`
  curY = drawWrapped(page, point2, 50, curY, width - 100, fontOblique, 8.5, 11.5, rgb(0.2, 0.25, 0.3))
  curY -= 3

  if (data.actionTaken) {
    const point3 = `3. Tindakan pembinaan langsung yang telah dilakukan: ${data.actionTaken}.`
    curY = drawWrapped(page, point3, 50, curY, width - 100, fontRegular, 8.5, 11.5)
    curY -= 3
  }

  const point4 = '4. Bahwa perbuatan tersebut melanggar ketentuan tata tertib dan disiplin kerja yang berlaku di lingkungan PT Chitra Paratama.'
  curY = drawWrapped(page, point4, 50, curY, width - 100, fontRegular, 8.5, 11.5)
  curY -= 10

  // 7. MEMUTUSKAN
  page.drawText('MEMUTUSKAN:', {
    x: 50,
    y: curY,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  })
  curY -= 13

  // Decision box
  const decBoxTop = curY
  const decBoxHeight = 56
  page.drawRectangle({
    x: 50,
    y: decBoxTop - decBoxHeight,
    width: width - 100,
    height: decBoxHeight,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.75, 0.82, 0.92),
    borderWidth: 0.8,
  })

  let decY = decBoxTop - 13
  const effectiveFormatted = formatDateIndo(data.effectiveDate)
  const expiryFormatted = data.expiryDate ? formatDateIndo(data.expiryDate) : 'Selesai / Sesuai Ketentuan'

  const d1 = `1. Menjatuhkan sanksi administratif berupa ${title} kepada Saudara/i yang bersangkutan.`
  decY = drawWrapped(page, d1, 60, decY, width - 120, fontBold, 8.5, 11, rgb(0.05, 0.2, 0.45))
  decY -= 2

  const d2 = `2. Masa berlaku sanksi terhitung efektif sejak tanggal ${effectiveFormatted} sampai dengan ${expiryFormatted} (masa evaluasi).`
  decY = drawWrapped(page, d2, 60, decY, width - 120, fontRegular, 8.5, 11)
  decY -= 2

  const d3 = '3. Apabila selama masa sanksi kembali melakukan pelanggaran, akan diberikan sanksi yang lebih berat hingga PHK.'
  decY = drawWrapped(page, d3, 60, decY, width - 120, fontRegular, 8.5, 11)

  curY = decBoxTop - decBoxHeight - 14

  const closing =
    'Demikian surat sanksi disipliner ini diterbitkan untuk menjadi perhatian sungguh-sungguh dan introspeksi perbaikan kinerja, dedikasi, serta kepatuhan kerja di PT Chitra Paratama.'
  curY = drawWrapped(page, closing, 50, curY, width - 100, fontRegular, 8.5, 11.5)
  curY -= 10

  // 8. Date & Place (Tanpa kata "Diterbitkan di:")
  const datePlace = `${data.siteName || 'Jakarta'}, ${effectiveFormatted}`
  const dpWidth = fontRegular.widthOfTextAtSize(datePlace, 8.5)
  page.drawText(datePlace, {
    x: width - 50 - dpWidth,
    y: curY,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  })

  curY -= 16

  // 9. Signatures Block: HANYA Pembuat Surat di sisi kanan
  const sigBoxY = curY
  const sigX = width - 50 - 180

  page.drawText('Diterbitkan Oleh,', {
    x: sigX,
    y: sigBoxY,
    size: 8.5,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.3),
  })

  // If digital signature provided for issuer
  if (data.issuerSignature && data.issuerSignature.startsWith('data:image/')) {
    try {
      const base64Data = data.issuerSignature.split(',')[1]
      const sigBytes = Buffer.from(base64Data, 'base64')
      const sigImg = data.issuerSignature.includes('png')
        ? await pdfDoc.embedPng(sigBytes)
        : await pdfDoc.embedJpg(sigBytes)
      page.drawImage(sigImg, {
        x: sigX - 5,
        y: sigBoxY - 42,
        width: 90,
        height: 38,
      })
    } catch {
      // fallback
    }
  }

  const issuerName = data.issuedBy || 'Human Capital Dept'
  page.drawText(issuerName, {
    x: sigX,
    y: sigBoxY - 50,
    size: 8.5,
    font: fontBold,
    color: rgb(0.05, 0.1, 0.2),
  })
  page.drawLine({
    start: { x: sigX, y: sigBoxY - 52 },
    end: { x: sigX + Math.max(120, fontBold.widthOfTextAtSize(issuerName, 8.5)), y: sigBoxY - 52 },
    thickness: 0.8,
    color: rgb(0.2, 0.25, 0.3),
  })
  const deptLabel = data.issuerDepartment || 'Human Capital & Industrial Relations'
  page.drawText(deptLabel, {
    x: sigX,
    y: sigBoxY - 62,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  })

  // 10. Footer Note (Hanya cetak jika tidak pakai letterhead background agar tidak menimpa)
  if (!data.useLetterhead) {
    const footerNote = 'Dokumen ini dicetak otomatis via HERO System • PT Chitra Paratama'
    page.drawText(footerNote, {
      x: 50,
      y: 28,
      size: 7,
      font: fontRegular,
      color: rgb(0.55, 0.6, 0.65),
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
