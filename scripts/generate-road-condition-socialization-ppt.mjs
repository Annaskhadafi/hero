import fs from 'node:fs'
import path from 'node:path'
import pptxgen from 'pptxgenjs'

const root = path.resolve(process.cwd())
const outDir = path.join(root, 'outputs')
const pptxPath = path.join(outDir, 'HERO-Road-Condition-Sosialisasi.pptx')
const mdPath = path.join(outDir, 'HERO-Road-Condition-Sosialisasi.md')

fs.mkdirSync(outDir, { recursive: true })

const pptx = new pptxgen()
pptx.layout = 'LAYOUT_WIDE'
pptx.author = 'HERO'
pptx.company = 'Chitra Paratama'
pptx.subject = 'Sosialisasi Fitur Road Condition Analysis'
pptx.title = 'HERO Road Condition Analysis - Sosialisasi Fitur'
pptx.lang = 'id-ID'
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
  lang: 'id-ID',
}
pptx.defineLayout({ name: 'HERO_WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'HERO_WIDE'
pptx.margin = 0

const W = 13.333
const H = 7.5
const colors = {
  bg: 'F4F8F7',
  white: 'FFFFFF',
  navy: '0F172A',
  slate: '334155',
  muted: '64748B',
  teal: '0B4F4E',
  teal2: '2D7270',
  green: '79BF23',
  gold: '8C5818',
  line: 'D8E7E5',
  loading: '0F4C75',
  haulroad: '1A365D',
  disposal: '1A4731',
  danger: 'B91C1C',
}

const logoCandidates = [
  path.join(root, 'public', 'logo HERO.png'),
  path.join(root, 'public', 'logo-hero.png'),
  path.join(root, 'public', 'logo.png'),
]
const logoPath = logoCandidates.find((item) => fs.existsSync(item))
const coverPath = path.join(root, 'public', 'cover.png')
const backcoverPath = path.join(root, 'public', 'backcover.png')

function imageIfExists(slide, imagePath, opts) {
  if (imagePath && fs.existsSync(imagePath)) slide.addImage({ path: imagePath, ...opts })
}

function addBg(slide) {
  slide.background = { color: colors.bg }
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: colors.bg }, line: { color: colors.bg } })
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: H, fill: { color: colors.green }, line: { color: colors.green } })
}

function addHeader(slide, section = 'ROAD CONDITION ANALYSIS') {
  slide.addText(section, { x: 0.55, y: 0.35, w: 5.4, h: 0.25, fontFace: 'Aptos', fontSize: 8.5, bold: true, color: colors.teal, charSpace: 1.4 })
  slide.addText('HERO', { x: 11.65, y: 0.32, w: 1.0, h: 0.25, fontSize: 8, bold: true, color: colors.teal, align: 'right' })
  if (logoPath) imageIfExists(slide, logoPath, { x: 12.72, y: 0.22, w: 0.32, h: 0.32 })
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 0.75, w: 12.2, h: 0, line: { color: colors.line, width: 1 } })
}

function addTitle(slide, title, subtitle) {
  slide.addText(title, { x: 0.7, y: 1.05, w: 7.6, h: 0.95, fontFace: 'Aptos Display', fontSize: 30, bold: true, color: colors.navy, breakLine: false, fit: 'shrink' })
  if (subtitle) slide.addText(subtitle, { x: 0.72, y: 1.95, w: 8.6, h: 0.45, fontSize: 12.5, color: colors.slate, fit: 'shrink' })
}

function addFooter(slide, page) {
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 7.04, w: 12.2, h: 0, line: { color: colors.line, width: 1 } })
  slide.addText(`Sosialisasi Fitur HERO · Road Condition Analysis`, { x: 0.65, y: 7.13, w: 6, h: 0.18, fontSize: 7.5, color: colors.muted })
  slide.addText(String(page).padStart(2, '0'), { x: 12.28, y: 7.1, w: 0.45, h: 0.18, fontSize: 7.5, bold: true, color: colors.teal, align: 'right' })
}

function addBullets(slide, items, x, y, w, opts = {}) {
  const runs = items.map((text) => ({ text, options: { bullet: { indent: 12 }, hanging: 4, breakLine: true } }))
  slide.addText(runs, { x, y, w, h: opts.h ?? 3.8, fontSize: opts.fontSize ?? 14, color: opts.color ?? colors.slate, breakLine: false, paraSpaceAfterPt: opts.gap ?? 8, fit: 'shrink' })
}

function addCard(slide, x, y, w, h, title, body, accent = colors.teal) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: colors.white }, line: { color: colors.line, width: 1 } })
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.08, h, fill: { color: accent }, line: { color: accent } })
  slide.addText(title, { x: x + 0.25, y: y + 0.2, w: w - 0.45, h: 0.28, fontSize: 13.5, bold: true, color: colors.navy, fit: 'shrink' })
  slide.addText(body, { x: x + 0.25, y: y + 0.58, w: w - 0.45, h: h - 0.75, fontSize: 10.5, color: colors.slate, valign: 'top', fit: 'shrink', breakLine: false })
}

function addMetric(slide, x, y, label, value, accent = colors.teal) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.25, h: 1.05, rectRadius: 0.08, fill: { color: colors.white }, line: { color: colors.line } })
  slide.addText(value, { x: x + 0.15, y: y + 0.16, w: 1.95, h: 0.32, fontSize: 18, bold: true, color: accent, align: 'center' })
  slide.addText(label, { x: x + 0.15, y: y + 0.58, w: 1.95, h: 0.24, fontSize: 8.5, bold: true, color: colors.slate, align: 'center', fit: 'shrink' })
}

function textSlide(page, title, subtitle, bullets, sideTitle, sideBody) {
  const slide = pptx.addSlide()
  addBg(slide)
  addHeader(slide)
  addTitle(slide, title, subtitle)
  addBullets(slide, bullets, 0.9, 2.75, 6.7, { h: 3.45 })
  addCard(slide, 8.25, 2.55, 4.25, 2.95, sideTitle, sideBody, colors.green)
  addFooter(slide, page)
  return slide
}

// 1 Cover
{
  const slide = pptx.addSlide()
  if (fs.existsSync(coverPath)) {
    slide.addImage({ path: coverPath, x: 0, y: 0, w: W, h: H })
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: '061826', transparency: 18 }, line: { transparency: 100 } })
  } else addBg(slide)
  slide.addText('SOSIALISASI FITUR HERO', { x: 0.78, y: 0.72, w: 4.6, h: 0.28, fontSize: 9, bold: true, color: colors.green, charSpace: 1.5 })
  slide.addText('Road Condition\nAnalysis', { x: 0.75, y: 1.35, w: 7.25, h: 1.55, fontFace: 'Aptos Display', fontSize: 38, bold: true, color: colors.white, breakLine: false, fit: 'shrink' })
  slide.addText('Panduan sosialisasi fitur untuk desktop dan mobile version', { x: 0.8, y: 3.25, w: 6.7, h: 0.38, fontSize: 14, color: 'E2F1EF' })
  slide.addText('Dashboard: /dashboard/reports/road-condition\nMobile: /mobile/reports/road-condition', { x: 0.82, y: 4.05, w: 5.8, h: 0.68, fontSize: 12, color: 'D8E7E5', breakLine: false })
  slide.addShape(pptx.ShapeType.line, { x: 0.82, y: 5.25, w: 2.7, h: 0, line: { color: colors.green, width: 4 } })
  slide.addText('HSE · Operational Report · AI Assisted Inspection', { x: 0.82, y: 5.48, w: 6.5, h: 0.28, fontSize: 9.5, bold: true, color: 'EAF3F2', charSpace: 0.6 })
  if (logoPath) imageIfExists(slide, logoPath, { x: 11.35, y: 0.55, w: 1.25, h: 0.55 })
}

// 2-3
textSlide(2, 'Latar Belakang', 'Kenapa fitur ini dibutuhkan di operasional site', [
  'Inspeksi kondisi jalan/site sering bergantung pada foto dan catatan manual.',
  'Standar penilaian antar inspector bisa berbeda jika tidak memakai rubric yang sama.',
  'Pembuatan report membutuhkan waktu karena foto, skor, dan rekomendasi disusun terpisah.',
  'Manajemen membutuhkan ringkasan cepat dengan evidence foto dan rekomendasi tindakan yang jelas.',
], 'Masalah utama', 'Data lapangan ada, tetapi belum selalu berubah menjadi laporan yang konsisten, cepat, dan mudah dibandingkan antar area/site.')

textSlide(3, 'Tujuan Fitur', 'Membuat inspeksi road condition lebih standar, cepat, dan traceable', [
  'Membantu inspector menilai kondisi Loading Point, Haulroad, dan Disposal dengan rubric tetap.',
  'Menggunakan AI vision sebagai asisten awal untuk membaca foto dan memberi rekomendasi.',
  'Memberikan ruang validasi manual agar keputusan akhir tetap di user operasional.',
  'Menyediakan output slide/PDF dan history agar report mudah dibagikan serta ditelusuri ulang.',
], 'Prinsip fitur', 'AI membantu analisis, tetapi user tetap pemilik validasi akhir. Fitur mempercepat kerja tanpa menghilangkan kontrol lapangan.')

// 4 Access
{
  const slide = pptx.addSlide()
  addBg(slide); addHeader(slide); addTitle(slide, 'Akses Fitur', 'Satu fitur, dua jalur penggunaan: kantor dan lapangan')
  addCard(slide, 0.85, 2.55, 5.55, 2.1, 'Desktop Version', '/dashboard/reports/road-condition\n\nDipakai untuk review lengkap, validasi detail, melihat history, dan download report.', colors.teal)
  addCard(slide, 6.95, 2.55, 5.55, 2.1, 'Mobile Version', '/mobile/reports/road-condition\n\nTampil sebagai Site Condition pada mobile app-shell. Cocok untuk akses lapangan dan input foto.', colors.green)
  addMetric(slide, 1.0, 5.25, 'Resource Permission', 'HSE', colors.teal)
  addMetric(slide, 3.55, 5.25, 'Photo Angle', '3', colors.green)
  addMetric(slide, 6.1, 5.25, 'Score Scale', '1–5', colors.gold)
  addMetric(slide, 8.65, 5.25, 'Report Output', 'PDF', colors.loading)
  addMetric(slide, 11.2, 5.25, 'History', '50', colors.disposal)
  addFooter(slide, 4)
}

// 5 workflow
{
  const slide = pptx.addSlide()
  addBg(slide); addHeader(slide); addTitle(slide, 'Alur Kerja End-to-End', 'Dari foto lapangan menjadi report yang siap dibagikan')
  const steps = [
    ['01', 'Isi Metadata', 'Site, customer, inspector, tanggal report.'],
    ['02', 'Pilih Kategori', 'Loading Point, Haulroad, atau Disposal.'],
    ['03', 'Upload 3 Foto', 'Tiga angle berbeda untuk satu point inspeksi.'],
    ['04', 'AI Analysis', 'AI membaca foto dan rubric parameter.'],
    ['05', 'Validasi User', 'Score dan rekomendasi bisa dikoreksi.'],
    ['06', 'Save & Export', 'Simpan history, download PDF slide report.'],
  ]
  steps.forEach(([num, title, body], i) => {
    const x = 0.85 + (i % 3) * 4.05
    const y = 2.35 + Math.floor(i / 3) * 1.65
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.55, h: 1.18, rectRadius: 0.07, fill: { color: colors.white }, line: { color: colors.line } })
    slide.addText(num, { x: x + 0.2, y: y + 0.18, w: 0.42, h: 0.25, fontSize: 10, bold: true, color: colors.green })
    slide.addText(title, { x: x + 0.72, y: y + 0.16, w: 2.55, h: 0.25, fontSize: 12.5, bold: true, color: colors.navy })
    slide.addText(body, { x: x + 0.72, y: y + 0.52, w: 2.55, h: 0.35, fontSize: 9.5, color: colors.slate, fit: 'shrink' })
  })
  addFooter(slide, 5)
}

// 6 desktop
textSlide(6, 'Desktop Version', 'Untuk review komprehensif, validasi detail, dan pengelolaan history', [
  'Tab Report berisi Form Report, Upload 3 Angle, Validasi AI, dan Compiled Report Slide.',
  'Tab History menampilkan report tersimpan: view detail, edit/load ulang, download PDF, dan delete.',
  'Desktop cocok untuk supervisor/admin yang perlu membaca tabel, membandingkan point, dan finalisasi report.',
  'Preview report membantu user melihat bentuk slide sebelum PDF didownload.',
], 'Kapan dipakai?', 'Gunakan desktop saat butuh layar luas: review parameter, koreksi rekomendasi, cek history, dan download report final.')

// 7 mobile
textSlide(7, 'Mobile Version', 'Untuk akses lapangan melalui menu Site Condition', [
  'Mobile route tersedia di `/mobile/reports/road-condition`.',
  'Menu mobile menampilkan layanan `Site Condition` untuk masuk ke fitur ini.',
  'Workflow inti sama: isi metadata, pilih point, upload 3 foto, jalankan AI, validasi hasil.',
  'Mobile membantu inspector memulai proses lebih dekat dengan kondisi aktual di lapangan.',
], 'Catatan UX', 'Mobile memakai app-shell khusus, tetapi tetap membawa logic fitur yang sama agar hasil desktop dan mobile konsisten.')

// 8 categories
{
  const slide = pptx.addSlide()
  addBg(slide); addHeader(slide); addTitle(slide, 'Kategori Penilaian', 'Rubric disesuaikan dengan area operasional')
  addCard(slide, 0.85, 2.5, 3.85, 2.65, 'Loading Point', 'Parameter:\n• Spillage\n• Loading Point\n• Undulation\n• Area Firmness\n• Support Equipment', colors.loading)
  addCard(slide, 4.75, 2.5, 3.85, 2.65, 'Haulroad', 'Parameter:\n• Spillage\n• Cross Fall\n• Gradient\n• Corner Condition\n• Road Firmness\n• Undulation\n• Support Equipment\n• Road Width', colors.haulroad)
  addCard(slide, 8.65, 2.5, 3.85, 2.65, 'Disposal', 'Parameter:\n• Spillage\n• Dumping Point\n• Undulation\n• Area Firmness\n• Windrow\n• Support Equipment', colors.disposal)
  slide.addText('Semua kategori memakai score 1–5 dan rekomendasi tindakan berdasarkan kondisi visual serta rubric operasional.', { x: 1.0, y: 5.75, w: 11.0, h: 0.45, fontSize: 13, color: colors.slate, align: 'center' })
  addFooter(slide, 8)
}

// 9 scoring
{
  const slide = pptx.addSlide()
  addBg(slide); addHeader(slide); addTitle(slide, 'Sistem Scoring', 'Skor sederhana agar mudah dibaca lintas site dan manajemen')
  const scoreData = [
    ['1', 'Kritis', 'Kondisi buruk / risiko tinggi. Perlu perbaikan prioritas.'],
    ['2', 'Buruk', 'Tindakan korektif tinggi dan segera.'],
    ['3', 'Cukup', 'Masuk perbaikan terjadwal dan perlu monitoring.'],
    ['4', 'Baik', 'Pertahankan kondisi, monitoring rutin.'],
    ['5', 'Ideal', 'Kondisi baik sebagai standar operasi.'],
  ]
  scoreData.forEach(([score, label, body], i) => {
    const x = 0.95 + i * 2.45
    const accent = i < 2 ? colors.danger : i === 2 ? colors.gold : colors.green
    slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.55, w: 2.05, h: 2.3, rectRadius: 0.08, fill: { color: colors.white }, line: { color: colors.line } })
    slide.addText(score, { x: x + 0.15, y: 2.78, w: 1.75, h: 0.45, fontSize: 28, bold: true, color: accent, align: 'center' })
    slide.addText(label, { x: x + 0.18, y: 3.42, w: 1.7, h: 0.26, fontSize: 11, bold: true, color: colors.navy, align: 'center' })
    slide.addText(body, { x: x + 0.2, y: 3.88, w: 1.62, h: 0.62, fontSize: 8.5, color: colors.slate, align: 'center', fit: 'shrink' })
  })
  addCard(slide, 1.15, 5.42, 10.9, 0.78, 'Average Score', 'Nilai rata-rata semua parameter menjadi ringkasan kondisi per point/report dan dipakai untuk summary laporan.', colors.teal)
  addFooter(slide, 9)
}

// 10 AI validation
textSlide(10, 'Validasi AI + Kontrol User', 'AI mempercepat analisis, user tetap menentukan final assessment', [
  'AI menerima metadata, kategori, rubric, dan tepat 3 foto angle.',
  'Output AI berupa summary, overall score, score per parameter, deskripsi, rekomendasi, dan caption foto bila tersedia.',
  'User dapat mengubah skor 1–5; deskripsi dan rekomendasi mengikuti template rubric.',
  'Rekomendasi tetap bisa diedit manual agar sesuai kondisi lapangan dan keputusan operasional.',
], 'Governance', 'Fitur ini bukan autopilot keputusan. AI adalah co-pilot analisis; inspector/supervisor tetap memvalidasi final report.')

// 11 output/history
textSlide(11, 'Output Report & History', 'Report siap dibagikan dan bisa ditelusuri ulang', [
  'Compiled Report Slide menampilkan cover, summary, detail point, foto, tabel assessment, dan back cover.',
  'Download PDF menghasilkan report landscape 16:9 yang siap dikirim ke stakeholder.',
  'History menyimpan report terakhir, average score, model used, dan full report data.',
  'Dari history user bisa view detail, download ulang, edit/load report, atau delete sesuai hak akses.',
], 'Traceability', 'Setiap inspeksi tidak berhenti sebagai file lokal. Report tersimpan sebagai history sehingga mudah dicek kembali saat review atau audit.')

// 12 socialization
{
  const slide = pptx.addSlide()
  addBg(slide); addHeader(slide); addTitle(slide, 'Rencana Sosialisasi', 'Materi singkat untuk mempercepat adopsi desktop dan mobile')
  addCard(slide, 0.85, 2.45, 3.7, 2.75, 'Agenda 15–30 Menit', '1. Jelaskan latar belakang\n2. Demo akses desktop\n3. Demo akses mobile\n4. Simulasi upload 3 foto\n5. Validasi score AI\n6. Generate PDF report', colors.teal)
  addCard(slide, 4.8, 2.45, 3.7, 2.75, 'Yang Perlu Disiapkan', '• Akun dengan akses fitur\n• 3 foto sample per point\n• Nama site/customer\n• Nama inspector\n• Contoh kondisi baik dan buruk', colors.green)
  addCard(slide, 8.75, 2.45, 3.7, 2.75, 'Pesan Kunci', 'Report lebih cepat.\nScoring lebih standar.\nFoto lebih terstruktur.\nHistory lebih mudah dicari.\nKeputusan tetap divalidasi user.', colors.gold)
  slide.addText('Target akhir: inspector dan supervisor mampu membuat satu report dari awal sampai PDF dalam satu sesi simulasi.', { x: 1.15, y: 5.78, w: 10.95, h: 0.42, fontSize: 13, bold: true, color: colors.navy, align: 'center' })
  addFooter(slide, 12)
}

// 13 Close
{
  const slide = pptx.addSlide()
  if (fs.existsSync(backcoverPath)) {
    slide.addImage({ path: backcoverPath, x: 0, y: 0, w: W, h: H })
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: '061826', transparency: 12 }, line: { transparency: 100 } })
  } else addBg(slide)
  slide.addText('Road Condition Analysis', { x: 0.85, y: 1.35, w: 6.8, h: 0.6, fontSize: 30, bold: true, color: colors.white })
  slide.addText('Standar inspeksi lebih jelas. Report lebih cepat. Evidence lebih kuat.', { x: 0.88, y: 2.18, w: 6.5, h: 0.38, fontSize: 13.5, color: 'EAF3F2' })
  slide.addShape(pptx.ShapeType.line, { x: 0.9, y: 3.1, w: 2.55, h: 0, line: { color: colors.green, width: 4 } })
  slide.addText('Desktop + Mobile Version\nHERO Operational Report', { x: 0.9, y: 3.45, w: 4.85, h: 0.72, fontSize: 15, bold: true, color: 'FFFFFF', breakLine: false })
  if (logoPath) imageIfExists(slide, logoPath, { x: 10.85, y: 6.45, w: 1.65, h: 0.6 })
}

const md = `# Materi Sosialisasi Fitur Road Condition Analysis\n\n## 1. Latar Belakang\n\nInspeksi kondisi jalan dan area kerja di site sering berbasis foto dan catatan manual. Kondisi ini membuat standar penilaian antar inspector atau antar site bisa berbeda, proses penyusunan report menjadi lebih lama, dan manajemen sulit mendapatkan ringkasan cepat yang memiliki evidence visual serta rekomendasi tindakan.\n\nFitur Road Condition Analysis dibuat untuk membantu proses inspeksi menjadi lebih standar, cepat, dan traceable. Foto lapangan dianalisis dengan bantuan AI berdasarkan rubric operasional, lalu hasilnya divalidasi oleh user sebelum disimpan dan dijadikan report.\n\n## 2. Tujuan Fitur\n\n- Menstandarkan penilaian kondisi Loading Point, Haulroad, dan Disposal.\n- Membantu inspector mengubah foto lapangan menjadi score, deskripsi, dan rekomendasi.\n- Mempercepat pembuatan laporan slide/PDF.\n- Menyediakan history inspeksi agar report mudah ditelusuri ulang.\n- Mendukung penggunaan desktop untuk review detail dan mobile untuk akses lapangan.\n\n## 3. Akses Fitur\n\n- Desktop: \`/dashboard/reports/road-condition\`\n- Mobile: \`/mobile/reports/road-condition\`\n- Mobile service tile: \`Site Condition\`\n- Resource permission: \`hse_road_condition_analysis\`\n\n## 4. Alur Kerja\n\n1. User memilih atau mengisi site.\n2. User mengisi customer, inspector, dan tanggal report.\n3. User memilih kategori/point inspeksi.\n4. User upload tepat 3 foto dari angle berbeda.\n5. AI menganalisis foto menggunakan rubric kategori.\n6. User memvalidasi score, deskripsi, dan rekomendasi.\n7. User menyimpan report ke history.\n8. User generate PDF slide report.\n\n## 5. Desktop Version\n\nDesktop dipakai untuk review lengkap, validasi detail, dan pengelolaan history. Tab Report berisi Form Report, Upload 3 Angle, Validasi AI, dan Compiled Report Slide. Tab History menampilkan report tersimpan dan menyediakan aksi view detail, edit/load ulang, download PDF, dan delete.\n\n## 6. Mobile Version\n\nMobile version tersedia melalui \`/mobile/reports/road-condition\` dan menu \`Site Condition\`. Versi mobile membantu inspector mengakses fitur dari lapangan dengan workflow yang sama: isi metadata, upload foto, jalankan AI, validasi hasil, lalu simpan report.\n\n## 7. Kategori Penilaian\n\n### Loading Point\n- Spillage\n- Loading Point\n- Undulation\n- Area Firmness\n- Support Equipment\n\n### Haulroad\n- Spillage\n- Cross Fall\n- Gradient\n- Corner Condition\n- Road Firmness\n- Undulation\n- Support Equipment\n- Road Width\n\n### Disposal\n- Spillage\n- Dumping Point\n- Undulation\n- Area Firmness\n- Windrow\n- Support Equipment\n\n## 8. Sistem Scoring\n\nScore memakai skala 1 sampai 5. Score 1 menunjukkan kondisi buruk atau risiko tinggi. Score 5 menunjukkan kondisi ideal atau risiko rendah. Average score dipakai sebagai ringkasan kondisi report. User tetap bisa mengoreksi score dan rekomendasi sebelum report disimpan.\n\n## 9. Output Report dan History\n\nOutput report berbentuk PDF slide landscape 16:9 dengan cover, summary, detail per point, foto evidence, tabel assessment, rekomendasi, dan back cover. History menyimpan report sehingga user dapat melihat ulang, download ulang, atau melanjutkan edit dari report sebelumnya.\n\n## 10. Pesan Kunci Sosialisasi\n\n- Report lebih cepat dibuat.\n- Scoring lebih standar karena memakai rubric yang sama.\n- Foto evidence lebih terstruktur karena wajib 3 angle.\n- AI membantu analisis awal, tetapi validasi akhir tetap di user.\n- Desktop cocok untuk review detail; mobile cocok untuk akses lapangan.\n`;

fs.writeFileSync(mdPath, md, 'utf8')
await pptx.writeFile({ fileName: pptxPath })
console.log(`Generated ${pptxPath}`)
console.log(`Generated ${mdPath}`)
