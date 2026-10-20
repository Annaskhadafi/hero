import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface CerBastPdfItem {
  assetNumber?: string | null
  serialNumber?: string | null
  description: string
  category: string
  location: string
  condition?: string | null
}

export interface CerBastPdfData {
  bastNumber: string
  cerNumber: string
  subject: string
  handoverDate: Date | string
  gaName: string
  gaJobTitle?: string | null
  gaSignedAt?: Date | string | null
  userName: string
  userJobTitle?: string | null
  userDepartment?: string | null
  userSite?: string | null
  userSignedAt?: Date | string | null
  notes?: string | null
  items: CerBastPdfItem[]
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

export async function generateCerBastPdf(data: CerBastPdfData): Promise<Uint8Array> {
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

  page.drawText('BERITA ACARA SERAH TERIMA ASET (BAST)', {
    x: 55,
    y: cursorY - 30,
    size: 12,
    font: helveticaBold,
    color: textDark,
  })

  page.drawText(`No. BAST: ${data.bastNumber}  |  Ref. CER: ${data.cerNumber}`, {
    x: 55,
    y: cursorY - 48,
    size: 9,
    font: helvetica,
    color: textGray,
  })

  // Status Badge
  page.drawRectangle({
    x: width - 155,
    y: cursorY - 38,
    width: 100,
    height: 24,
    color: rgb(0.9, 0.97, 0.92),
    borderColor: successGreen,
    borderWidth: 1,
  })
  page.drawText('COMPLETED', {
    x: width - 138,
    y: cursorY - 28,
    size: 9,
    font: helveticaBold,
    color: successGreen,
  })

  cursorY -= 80

  // Paragraph Pengantar
  page.drawText('Pada hari ini kami yang bertanda tangan di bawah ini telah melakukan serah terima fisik aset perusahaan:', {
    x: 40,
    y: cursorY,
    size: 8.5,
    font: helvetica,
    color: textDark,
  })

  cursorY -= 20

  // 2. Box Para Pihak
  page.drawRectangle({
    x: 40,
    y: cursorY - 85,
    width: width - 80,
    height: 90,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 1,
  })

  // Pihak Pertama (GA)
  page.drawText('PIHAK PERTAMA (Yang Menyerahkan):', { x: 50, y: cursorY - 15, size: 8.5, font: helveticaBold, color: primaryNavy })
  page.drawText(`Nama: ${data.gaName}`, { x: 50, y: cursorY - 32, size: 8, font: helvetica, color: textDark })
  page.drawText(`Divisi: General Affairs & Asset Management`, { x: 50, y: cursorY - 47, size: 8, font: helvetica, color: textDark })
  page.drawText(`Tanggal: ${formatIndoDate(data.handoverDate)}`, { x: 50, y: cursorY - 62, size: 8, font: helvetica, color: textDark })

  // Pihak Kedua (Penerima)
  page.drawText('PIHAK KEDUA (Yang Menerima):', { x: 320, y: cursorY - 15, size: 8.5, font: helveticaBold, color: primaryNavy })
  page.drawText(`Nama: ${data.userName}`, { x: 320, y: cursorY - 32, size: 8, font: helvetica, color: textDark })
  page.drawText(`Departemen / Site: ${data.userDepartment || '-'} / ${data.userSite || '-'}`, { x: 320, y: cursorY - 47, size: 8, font: helvetica, color: textDark })
  page.drawText(`Perihal Pengadaan: ${data.subject.substring(0, 35)}`, { x: 320, y: cursorY - 62, size: 8, font: helvetica, color: textDark })

  cursorY -= 105

  // 3. Section: Tabel Daftar Aset yang Diserahkan
  page.drawRectangle({
    x: 40,
    y: cursorY - 16,
    width: width - 80,
    height: 20,
    color: rgb(0.96, 0.97, 0.98),
  })
  page.drawText('DAFTAR ASET YANG DISERAH-TERIMAKAN', {
    x: 50,
    y: cursorY - 12,
    size: 9,
    font: helveticaBold,
    color: primaryNavy,
  })

  cursorY -= 22

  const colX = {
    no: 45,
    assetNo: 65,
    serialNo: 155,
    desc: 245,
    cat: 400,
    cond: 485,
  }

  // Header Row
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
  page.drawText('No. Aset', { x: colX.assetNo, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('No. Seri / SN', { x: colX.serialNo, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Deskripsi Barang', { x: colX.desc, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Kategori', { x: colX.cat, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })
  page.drawText('Kondisi Fisik', { x: colX.cond, y: cursorY - 12, size: 8, font: helveticaBold, color: textDark })

  cursorY -= 20

  const items = data.items && data.items.length > 0 ? data.items : []
  items.slice(0, 8).forEach((item, idx) => {
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
    page.drawText(item.assetNumber || '-', { x: colX.assetNo, y: cursorY - 12, size: 7.5, font: helveticaBold, color: textDark })
    page.drawText(item.serialNumber || '-', { x: colX.serialNo, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText(item.description.substring(0, 30), { x: colX.desc, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText(item.category.substring(0, 16), { x: colX.cat, y: cursorY - 12, size: 7.5, font: helvetica, color: textDark })
    page.drawText(item.condition || 'Baik & Normal', { x: colX.cond, y: cursorY - 12, size: 7.5, font: helvetica, color: successGreen })

    cursorY -= 20
  })

  cursorY -= 20

  // 4. Klausul Pernyataan Tanggung Jawab
  page.drawRectangle({
    x: 40,
    y: cursorY - 45,
    width: width - 80,
    height: 50,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawText('KETENTUAN PENGGUNAAN & TANGGUNG JAWAB ASET:', {
    x: 50,
    y: cursorY - 14,
    size: 8,
    font: helveticaBold,
    color: primaryNavy,
  })
  page.drawText('1. Pihak Kedua bertanggung jawab penuh atas pemeliharaan dan pengamanan fisik aset yang diserahkan.', {
    x: 50,
    y: cursorY - 26,
    size: 7.5,
    font: helvetica,
    color: textDark,
  })
  page.drawText('2. Segala bentuk mutasi, kerusakan akibat kelalaian, atau kehilangan wajib segera dilaporkan kepada General Affairs.', {
    x: 50,
    y: cursorY - 38,
    size: 7.5,
    font: helvetica,
    color: textDark,
  })

  cursorY -= 65

  // 5. Tanda Tangan Para Pihak
  const sigBoxWidth = (width - 80 - 20) / 2
  const sigBoxHeight = 100

  // Box GA
  page.drawRectangle({
    x: 40,
    y: cursorY - sigBoxHeight,
    width: sigBoxWidth,
    height: sigBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawText('Yang Menyerahkan (General Affairs):', { x: 50, y: cursorY - 16, size: 8, font: helveticaBold, color: primaryNavy })
  page.drawText('DIGITALLY SIGNED & VERIFIED', { x: 50, y: cursorY - 45, size: 9, font: helveticaBold, color: successGreen })
  page.drawText(`Nama: ${data.gaName}`, { x: 50, y: cursorY - 72, size: 8, font: helveticaBold, color: textDark })
  page.drawText(`Tanggal: ${formatIndoDate(data.gaSignedAt || data.handoverDate)}`, { x: 50, y: cursorY - 86, size: 7.5, font: helvetica, color: textGray })

  // Box User
  page.drawRectangle({
    x: 40 + sigBoxWidth + 20,
    y: cursorY - sigBoxHeight,
    width: sigBoxWidth,
    height: sigBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 1,
  })
  page.drawText('Yang Menerima (User Pemohon):', { x: 50 + sigBoxWidth + 20, y: cursorY - 16, size: 8, font: helveticaBold, color: primaryNavy })
  page.drawText('DIGITALLY SIGNED & VERIFIED', { x: 50 + sigBoxWidth + 20, y: cursorY - 45, size: 9, font: helveticaBold, color: successGreen })
  page.drawText(`Nama: ${data.userName}`, { x: 50 + sigBoxWidth + 20, y: cursorY - 72, size: 8, font: helveticaBold, color: textDark })
  page.drawText(`Tanggal: ${formatIndoDate(data.userSignedAt || data.handoverDate)}`, { x: 50 + sigBoxWidth + 20, y: cursorY - 86, size: 7.5, font: helvetica, color: textGray })

  // Footer Note
  page.drawText('Dokumen ini sah dan diterbitkan secara elektronik melalui HERO Asset Management System.', {
    x: 40,
    y: 20,
    size: 7,
    font: helvetica,
    color: textGray,
  })

  return await pdfDoc.save()
}
