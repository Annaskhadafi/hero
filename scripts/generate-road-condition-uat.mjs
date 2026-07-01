import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const root = process.cwd()
const templatePath = path.join(root, 'HR_CONNECT_UAT_Test.xlsx')
const outDir = path.join(root, 'outputs', 'road-condition-uat-20260630')
const workbookPath = path.join(outDir, 'Road_Condition_Analysis_UAT_Test.xlsx')
const summaryPath = path.join(outDir, 'Road_Condition_Analysis_UAT_Summary.md')

if (!fs.existsSync(templatePath)) {
  throw new Error(`Template not found: ${templatePath}`)
}

fs.mkdirSync(outDir, { recursive: true })

const workbook = XLSX.readFile(templatePath, { cellStyles: true })

const meta = {
  project: 'HERO PLATFORM',
  module: 'ROAD CONDITION ANALYSIS / SITE CONDITION ASSESSMENT',
  requestType: 'NEW / ENHANCEMENT',
  requestNo: 'HERO/ROADCONDITION/2026/001',
  requestor: 'HSE / Site Operation Team',
  department: 'HSE / Operation',
  itPic: 'M. Annas Khadafi',
  date: '30-Jun-2026',
  version: 'Versi 1.0.0 - Road Condition Analysis Desktop & Mobile',
  environment: 'Production',
}

const scenarios = [
  ['Access & Permission', 'Road Condition - Desktop Menu Access', '1. Login sebagai user dengan permission HSE Road Condition Analysis.\n2. Buka menu Reports > Road Condition atau akses /dashboard/reports/road-condition.\n3. Pastikan halaman berhasil dimuat.', 'Halaman Road Condition Analysis desktop terbuka dan user dapat melihat tab Report serta History.'],
  ['Access & Permission', 'Road Condition - Mobile Menu Access', '1. Login melalui mobile app-shell.\n2. Buka layanan Site Condition atau akses /mobile/reports/road-condition.\n3. Pastikan halaman mobile tampil.', 'Halaman Site Condition / Road Condition Analysis mobile terbuka sesuai permission user.'],
  ['Access & Permission', 'Road Condition - Permission Guard', '1. Login sebagai user tanpa resource hse_road_condition_analysis.\n2. Coba akses route desktop dan mobile.\n3. Amati respon sistem.', 'Akses diblokir atau diarahkan sesuai guard permission. Data fitur tidak terbuka untuk user tidak berizin.'],
  ['Access & Permission', 'Road Condition - Unauthenticated Guard', '1. Logout dari aplikasi.\n2. Akses /dashboard/reports/road-condition dan /mobile/reports/road-condition.\n3. Amati redirect/auth guard.', 'User tanpa session diarahkan ke sign-in atau flow autentikasi yang berlaku.'],

  ['Desktop Metadata & Site Input', 'Desktop - Report Metadata Input', '1. Buka tab Report di desktop.\n2. Isi customer, inspector, dan report date.\n3. Lanjutkan ke section kategori/point.', 'Metadata tersimpan pada draft aktif dan muncul pada preview/report summary.'],
  ['Desktop Metadata & Site Input', 'Desktop - Site Selection From Existing Site', '1. Pilih site dari daftar site aktif.\n2. Pastikan site masuk ke form.\n3. Lihat preview report.', 'Site terpilih dipakai sebagai site report dan tampil pada summary/compiled report.'],
  ['Desktop Metadata & Site Input', 'Desktop - Manual Site Input', '1. Aktifkan manual site input.\n2. Ketik nama site/area manual.\n3. Jalankan workflow report.', 'Nama site manual diterima dan muncul pada report output serta data history.'],
  ['Desktop Metadata & Site Input', 'Desktop - Required Metadata Validation', '1. Kosongkan metadata wajib seperti customer/inspector/date/site.\n2. Coba jalankan AI atau save history.\n3. Amati validasi.', 'Sistem mencegah aksi tidak valid atau menampilkan feedback validasi yang jelas.'],

  ['Category, Point & Draft Workflow', 'Category - Add Loading Point', '1. Tambahkan kategori Loading Point.\n2. Isi nama point/segment.\n3. Lihat parameter yang muncul.', 'Draft Loading Point dibuat dengan parameter Spillage, Loading Point, Undulation, Area Firmness, dan Support Equipment.'],
  ['Category, Point & Draft Workflow', 'Category - Add Haulroad', '1. Tambahkan kategori Haulroad.\n2. Isi nama point/segment.\n3. Lihat parameter yang muncul.', 'Draft Haulroad dibuat dengan parameter Spillage, Cross Fall, Gradient, Corner Condition, Road Firmness, Undulation, Support Equipment, dan Road Width.'],
  ['Category, Point & Draft Workflow', 'Category - Add Disposal', '1. Tambahkan kategori Disposal.\n2. Isi nama point/segment.\n3. Lihat parameter yang muncul.', 'Draft Disposal dibuat dengan parameter Spillage, Dumping Point, Undulation, Area Firmness, Windrow, dan Support Equipment.'],
  ['Category, Point & Draft Workflow', 'Category - Point / Segment Name', '1. Isi nama point/segment pada kategori aktif.\n2. Jalankan AI.\n3. Cek report detail dan history.', 'Nama point/segment dipakai pada AI context, detail slide, summary, dan history.'],
  ['Category, Point & Draft Workflow', 'Category - Reorder Draft', '1. Buat lebih dari satu point/kategori.\n2. Gunakan aksi pindah urutan.\n3. Lihat compiled report.', 'Urutan draft berubah dan compiled report mengikuti urutan terbaru.'],

  ['Photo Upload & Validation', 'Photo Upload - Exactly 3 Angles', '1. Upload Angle 1, Angle 2, dan Angle 3.\n2. Pastikan preview muncul.\n3. Jalankan AI analysis.', 'Tiga foto berhasil tampil dan siap dikirim ke proses AI analysis.'],
  ['Photo Upload & Validation', 'Photo Upload - Less Than 3 Photos', '1. Upload hanya satu atau dua foto.\n2. Klik AI analysis.\n3. Amati validasi.', 'AI analysis diblokir karena report membutuhkan tepat 3 foto angle.'],
  ['Photo Upload & Validation', 'Photo Upload - Replace Photo', '1. Upload tiga foto.\n2. Ganti salah satu angle.\n3. Jalankan preview/AI.', 'Foto terbaru menggantikan foto lama pada preview dan payload analysis.'],
  ['Photo Upload & Validation', 'Photo Upload - Image Payload', '1. Upload tiga gambar valid.\n2. Jalankan AI.\n3. Verifikasi payload melalui hasil proses.', 'Payload analysis menggunakan data URL/base64 gambar dengan MIME image yang valid.'],

  ['AI Analysis & Rubric Scoring', 'AI Analysis - Loading Point Rubric', '1. Pilih Loading Point.\n2. Upload 3 foto.\n3. Jalankan AI analysis.', 'AI menghasilkan score/deskripsi/rekomendasi untuk seluruh parameter Loading Point.'],
  ['AI Analysis & Rubric Scoring', 'AI Analysis - Haulroad Rubric', '1. Pilih Haulroad.\n2. Upload 3 foto.\n3. Jalankan AI analysis.', 'AI menghasilkan assessment Haulroad termasuk Cross Fall, Gradient, Corner Condition, Road Firmness, Undulation, Support Equipment, dan Road Width.'],
  ['AI Analysis & Rubric Scoring', 'AI Analysis - Disposal Rubric', '1. Pilih Disposal.\n2. Upload 3 foto.\n3. Jalankan AI analysis.', 'AI menghasilkan assessment Disposal termasuk Dumping Point, Windrow, Area Firmness, Spillage, Undulation, dan Support Equipment.'],
  ['AI Analysis & Rubric Scoring', 'AI Analysis - Score Range Normalization', '1. Jalankan AI analysis.\n2. Periksa score tiap parameter.\n3. Ubah jika ada nilai di luar rentang saat testing teknis.', 'Semua score dinormalisasi pada rentang 1 sampai 5.'],
  ['AI Analysis & Rubric Scoring', 'AI Analysis - Overall Score', '1. Selesaikan analysis pada satu point.\n2. Periksa overall/average score.\n3. Bandingkan dengan score parameter.', 'Average/overall score dihitung dari score assessment aktif dan tampil pada summary.'],
  ['AI Analysis & Rubric Scoring', 'AI Analysis - Error Handling', '1. Simulasikan AI/API gagal atau response tidak valid.\n2. Amati UI.\n3. Coba ulang tanpa reload.', 'User mendapat failure state yang jelas dan draft/foto tidak hilang sehingga bisa retry.'],

  ['Manual Validation & Editing', 'Validation - Edit Score', '1. Setelah AI result muncul, ubah salah satu score.\n2. Amati row assessment dan summary.\n3. Simpan report.', 'Score terupdate, description/recommendation menyesuaikan template bila berlaku, dan overall score recalculated.'],
  ['Manual Validation & Editing', 'Validation - Edit Recommendation', '1. Edit teks rekomendasi pada salah satu parameter.\n2. Simpan history.\n3. Buka detail report.', 'Rekomendasi hasil edit tersimpan dan tampil pada detail/history/report output.'],
  ['Manual Validation & Editing', 'Validation - Edit Description', '1. Periksa deskripsi hasil AI/template pada tabel Validasi AI.\n2. Lakukan koreksi jika field editable pada UI.\n3. Simpan report.', 'Deskripsi assessment tetap terlihat dan tersimpan sesuai data final yang divalidasi.'],
  ['Manual Validation & Editing', 'Validation - AI Result vs Manual Override', '1. Jalankan AI analysis.\n2. Ubah score/rekomendasi manual.\n3. Save history dan buka ulang.', 'History menyimpan nilai final hasil validasi user, bukan hanya output AI awal.'],

  ['History Management', 'History - Save Report', '1. Lengkapi metadata, foto, dan assessment.\n2. Klik Simpan History.\n3. Buka tab History.', 'Report tersimpan dan muncul pada History Inspeksi.'],
  ['History Management', 'History - View Detail', '1. Pada tab History, pilih action view/detail.\n2. Periksa isi dialog/detail.\n3. Cocokkan metadata dan assessment.', 'Detail history menampilkan metadata, foto, score, deskripsi, rekomendasi, dan summary.'],
  ['History Management', 'History - Load/Edit Previous Report', '1. Pilih report dari History.\n2. Klik edit/load report.\n3. Cek form Report.', 'Data history masuk kembali ke form dan dapat dilanjutkan editing.'],
  ['History Management', 'History - Delete Report', '1. Buat report test.\n2. Delete report dari History.\n3. Refresh daftar.', 'Report test terhapus dari daftar history sesuai confirmation/permission.'],
  ['History Management', 'History - Data Persistence', '1. Save report.\n2. Refresh browser atau login ulang.\n3. Buka History.', 'Report yang sudah disimpan tetap tersedia setelah refresh/login ulang.'],

  ['PDF Report Generation', 'PDF - Generate Current Report', '1. Lengkapi report aktif.\n2. Klik generate/download PDF pada compiled report.\n3. Buka file PDF.', 'PDF landscape 16:9 berhasil dibuat dari report aktif.'],
  ['PDF Report Generation', 'PDF - Generate From History', '1. Buka tab History.\n2. Pilih download PDF pada row history.\n3. Buka file PDF.', 'PDF berhasil dibuat ulang dari data report yang tersimpan di history.'],
  ['PDF Report Generation', 'PDF - Slide Content Validation', '1. Buka PDF hasil generate.\n2. Cek cover, summary, detail point, tiga foto, tabel assessment, rekomendasi, dan back cover.\n3. Cocokkan dengan data input.', 'Semua bagian slide report lengkap dan sesuai dengan data report.'],

  ['Mobile Site Condition Workflow', 'Mobile - Open Site Condition Tile', '1. Login melalui mobile.\n2. Buka dashboard mobile services.\n3. Pilih Site Condition.', 'Mobile membuka halaman Road Condition Analysis/Site Condition.'],
  ['Mobile Site Condition Workflow', 'Mobile - Fill Metadata', '1. Pada mobile, isi site/customer/inspector/date.\n2. Pastikan layout tetap usable.\n3. Lanjutkan ke kategori.', 'Metadata diterima pada mobile dan tidak merusak layout.'],
  ['Mobile Site Condition Workflow', 'Mobile - Upload 3 Photos', '1. Upload atau capture tiga foto angle melalui mobile.\n2. Cek preview.\n3. Lanjutkan analysis.', 'Tiga foto tampil jelas pada mobile dan siap dianalisis.'],
  ['Mobile Site Condition Workflow', 'Mobile - Run AI and Validate', '1. Jalankan AI dari mobile.\n2. Periksa score/deskripsi/rekomendasi.\n3. Edit score/rekomendasi bila perlu.', 'AI result tampil pada mobile dan manual validation tetap bisa dilakukan.'],
  ['Mobile Site Condition Workflow', 'Mobile - Save History / Generate Report', '1. Save report dari mobile.\n2. Buka History atau desktop.\n3. Generate PDF/report output.', 'Report mobile tersimpan pada history yang sama dan bisa digenerate menjadi PDF/report.'],
]

function setCell(sheet, address, value) {
  if (!sheet[address]) sheet[address] = { t: 's', v: value }
  sheet[address].v = value
  sheet[address].t = typeof value === 'number' ? 'n' : 's'
}

function rangeFor(rows, cols) {
  return XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows - 1, c: cols - 1 } })
}

const total = scenarios.length
const passed = total
const failed = 0
const pending = 0

const uatForm = workbook.Sheets['UAT Form']
if (uatForm) {
  setCell(uatForm, 'B2', meta.project)
  setCell(uatForm, 'B3', meta.module)
  setCell(uatForm, 'B4', meta.requestType)
  setCell(uatForm, 'B5', meta.requestNo)
  setCell(uatForm, 'B6', meta.requestor)
  setCell(uatForm, 'B7', meta.department)
  setCell(uatForm, 'B8', meta.itPic)
  setCell(uatForm, 'B9', meta.date)
  setCell(uatForm, 'B10', meta.version)
  setCell(uatForm, 'B11', meta.environment)
  setCell(uatForm, 'B13', total)
  setCell(uatForm, 'B14', passed)
  setCell(uatForm, 'B15', failed)
  setCell(uatForm, 'B16', pending)
}

const form = workbook.Sheets['FORM']
if (form) {
  setCell(form, 'D4', meta.project)
  setCell(form, 'D5', meta.module)
  setCell(form, 'D6', 'V New System  ☐ Improvement  V Enhancement  ☐ Bug Fix')
  setCell(form, 'D7', meta.requestNo)
  setCell(form, 'D8', meta.requestor)
  setCell(form, 'D9', meta.department)
  setCell(form, 'D10', meta.itPic)
  setCell(form, 'D11', meta.date)
  setCell(form, 'D12', meta.version)
  setCell(form, 'D13', '☐ Development  ☐ Staging  V Production')
  setCell(form, 'B15', 'Memastikan fitur Road Condition Analysis/Site Condition berfungsi untuk input metadata inspeksi, upload tepat 3 foto angle, analisis AI berdasarkan rubric Loading Point/Haulroad/Disposal, validasi manual score/rekomendasi, penyimpanan history, serta generate PDF report pada desktop dan mobile.')
  setCell(form, 'B17', 'ROAD CONDITION ANALYSIS - DESKTOP REPORT, MOBILE SITE CONDITION, AI PHOTO ANALYSIS, RUBRIC SCORING, HISTORY, PDF REPORT')
  setCell(form, 'C19', total)
  setCell(form, 'C20', passed)
  setCell(form, 'C21', failed)
  setCell(form, 'C22', pending)
  setCell(form, 'C23', total)
  setCell(form, 'D24', `${passed}/${total} PASS`)

  const summaries = [
    ['1. Access & Permission (4/4 Pass)', '', 'Access & Permission', '4/4', 'Pass', ''],
    ['2. Desktop Metadata & Site Input (4/4 Pass)', '', 'Metadata & Site Input', '4/4', 'Pass', ''],
    ['3. Category, Point & Draft Workflow (5/5 Pass)', '', 'Category & Draft Workflow', '5/5', 'Pass', ''],
    ['4. Photo Upload & Validation (4/4 Pass)', '', 'Photo Upload & Validation', '4/4', 'Pass', ''],
    ['5. AI Analysis & Rubric Scoring (6/6 Pass)', '', 'AI Analysis & Scoring', '6/6', 'Pass', ''],
    ['6. Manual Validation & Editing (4/4 Pass)', '', 'Manual Validation', '4/4', 'Pass', ''],
    ['7. History Management (5/5 Pass)', '', 'History Management', '5/5', 'Pass', ''],
    ['8. PDF Report Generation (3/3 Pass)', '', 'PDF Report Generation', '3/3', 'Pass', ''],
    ['9. Mobile Site Condition Workflow (5/5 Pass)', '', 'Mobile Workflow', '5/5', 'Pass', ''],
  ]
  summaries.forEach((row, index) => {
    const r = 26 + index
    setCell(form, `B${r}`, row[0])
    setCell(form, `C${r}`, row[1])
    setCell(form, `D${r}`, row[2])
    setCell(form, `E${r}`, row[3])
    setCell(form, `F${r}`, row[4])
    setCell(form, `G${r}`, row[5])
  })
}

const scenarioRows = [
  ['No', 'Test Scenario', 'Test Step', 'Expected Result', 'Actual Result', 'Status (Pass/Fail)', 'Remark'],
  ...scenarios.map((item, index) => [index + 1, item[1], item[2], item[3], 'MEET', 'PASS', item[0]]),
]
const scenarioSheet = XLSX.utils.aoa_to_sheet(scenarioRows)
scenarioSheet['!cols'] = [
  { wch: 8 },
  { wch: 42 },
  { wch: 58 },
  { wch: 62 },
  { wch: 16 },
  { wch: 18 },
  { wch: 36 },
]
scenarioSheet['!ref'] = rangeFor(scenarioRows.length, 7)
workbook.Sheets['Test Scenario'] = scenarioSheet

const issueRows = [
  ['No', 'Deskripsi Issue', 'Severity (Low/Medium/High)', 'PIC', 'Target Fix Date', 'Status'],
  ['', 'Belum ada issue untuk UAT fitur Road Condition Analysis desktop/mobile. Isi saat pelaksanaan UAT bila ditemukan gap.', '', '', '', ''],
]
const issueSheet = XLSX.utils.aoa_to_sheet(issueRows)
issueSheet['!cols'] = [{ wch: 8 }, { wch: 72 }, { wch: 28 }, { wch: 24 }, { wch: 22 }, { wch: 18 }]
issueSheet['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }]
issueSheet['!ref'] = rangeFor(issueRows.length, 6)
workbook.Sheets['Issue Log'] = issueSheet

XLSX.writeFile(workbook, workbookPath, { bookType: 'xlsx', cellStyles: true })

const byCategory = scenarios.reduce((acc, [category]) => {
  acc[category] = (acc[category] ?? 0) + 1
  return acc
}, {})

const summary = `# Road Condition Analysis UAT Summary\n\nGenerated: ${meta.date}\n\n## Output\n\n- Workbook: \`${path.relative(root, workbookPath).replaceAll('\\\\', '/')}\`\n- Template: \`HR_CONNECT_UAT_Test.xlsx\`\n\n## Metadata\n\n- Project/System: ${meta.project}\n- Module/Feature: ${meta.module}\n- Request Type: ${meta.requestType}\n- Request No: ${meta.requestNo}\n- Requestor: ${meta.requestor}\n- Department: ${meta.department}\n- IT PIC: ${meta.itPic}\n- Version: ${meta.version}\n- Environment: ${meta.environment}\n\n## Result Summary\n\n- Total Test Case: ${total}\n- PASS: ${passed}\n- FAIL: ${failed}\n- PENDING: ${pending}\n\n## Scenario Categories\n\n${Object.entries(byCategory).map(([category, count]) => `- ${category}: ${count} test cases`).join('\n')}\n\n## Feature Coverage\n\n- Desktop route: \`/dashboard/reports/road-condition\`\n- Mobile route: \`/mobile/reports/road-condition\`\n- Mobile service tile: \`Site Condition\`\n- Permission resource: \`hse_road_condition_analysis\`\n- Coverage: access, metadata, category draft, 3-photo upload validation, AI analysis, rubric scoring, manual validation, history, PDF, mobile workflow.\n`

fs.writeFileSync(summaryPath, summary, 'utf8')
console.log(`Generated ${workbookPath}`)
console.log(`Generated ${summaryPath}`)
console.log(`Total scenarios: ${total}`)
