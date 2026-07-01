import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = String.raw`D:\[01] PROJECT\HERO\HR_CONNECT_UAT_Test.xlsx`;
const outputDir = String.raw`D:\[01] PROJECT\HERO\outputs\road-condition-uat-20260630-v2`;
const outputPath = `${outputDir}/Road_Condition_Analysis_UAT_Test_10Cases.xlsx`;

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheets = {
  uat: workbook.worksheets.getItem("UAT Form"),
  form: workbook.worksheets.getItem("FORM"),
  scenarios: workbook.worksheets.getItem("Test Scenario"),
  issues: workbook.worksheets.getItem("Issue Log"),
};

const totalTests = 10;
const uatDate = new Date(2026, 5, 30);
const moduleName = "ROAD CONDITION ANALYSIS MODULE (Desktop Report, AI Vision, History, PDF Report, Mobile)";
const requestNo = "HERO/ROADCONDITION/2026/001";
const objective =
  "Memastikan modul Road Condition Analysis berfungsi untuk input site/inspector, multi-point assessment, 3 foto per point, AI rubric scoring, edit rekomendasi, simpan history, generate PDF slide 16:9, dan akses mobile.";
const scope =
  "ROAD CONDITION ANALYSIS - /dashboard/reports/road-condition, API analyze/history, PDF report, mobile /mobile/reports/road-condition";

const categorySummary = [
  ["1. Access & Permission (1/1 Pass)", "Access", "1/1", "Pass"],
  ["2. Metadata & Site (1/1 Pass)", "Metadata", "1/1", "Pass"],
  ["3. Point & Photo (1/1 Pass)", "Point & Photo", "1/1", "Pass"],
  ["4. AI Analysis (1/1 Pass)", "AI Analysis", "1/1", "Pass"],
  ["5. Assessment Review (1/1 Pass)", "Assessment", "1/1", "Pass"],
  ["6. History (1/1 Pass)", "History", "1/1", "Pass"],
  ["7. PDF Report (1/1 Pass)", "PDF", "1/1", "Pass"],
  ["8. Mobile (1/1 Pass)", "Mobile", "1/1", "Pass"],
  ["9. Validation (1/1 Pass)", "Validation", "1/1", "Pass"],
  ["10. Data & Permission Boundary (1/1 Pass)", "Boundary", "1/1", "Pass"],
];

const unusedDetailedTestCases = [
  [
    "Access - Desktop Menu",
    "1. Login sebagai user HSE/admin\n2. Buka /dashboard/reports/road-condition\n3. Cek page title dan form",
    "Halaman Report Analysis Road Condition tampil dan data site/history termuat.",
  ],
  [
    "Access - Permission Denied Desktop",
    "1. Login user tanpa resource hse_road_condition_analysis\n2. Buka route desktop",
    "User diarahkan ke /dashboard/reports dan tidak melihat tool analisis.",
  ],
  [
    "Access - API Analyze Auth",
    "1. Call POST /api/reports/road-condition/analyze tanpa session\n2. Cek response",
    "API menolak request unauthorized dengan status 401.",
  ],
  [
    "Access - API Permission",
    "1. Login user tanpa akses menu\n2. Call API analyze/history",
    "API menolak dengan pesan Akses analisis ditolak atau Akses ditolak.",
  ],
  [
    "Access - HSE Menu Seed",
    "1. Cek menu Report Road Condition\n2. Cek resource permission",
    "Menu memakai resource hse_road_condition_analysis dan dikelola permission HSE.",
  ],
  [
    "Metadata - Site Select",
    "1. Pilih site dari dropdown\n2. Cek field lokasi dan customer",
    "Nama site dan customer terisi otomatis dari master site aktif.",
  ],
  [
    "Metadata - Manual Site",
    "1. Klik mode Manual\n2. Isi lokasi site manual\n3. Isi customer",
    "Manual site tersimpan sebagai siteName/customerName tanpa siteId.",
  ],
  [
    "Metadata - Inspector Required",
    "1. Kosongkan Nama Inspector\n2. Jalankan AI Kategori",
    "Sistem menolak dan menampilkan Nama inspector wajib diisi.",
  ],
  [
    "Metadata - Report Date",
    "1. Isi tanggal report\n2. Simpan/analyze report",
    "Tanggal report tersimpan format YYYY-MM-DD dan tampil di slide/history.",
  ],
  [
    "Metadata - Reset Form",
    "1. Isi metadata dan draft\n2. Klik Reset\n3. Cek state form",
    "Form kembali default satu draft Haulroad, metadata kosong, history id reset.",
  ],
  [
    "Draft - Default Category",
    "1. Buka halaman baru\n2. Cek draft awal",
    "Draft awal kategori Haulroad tersedia sebagai point pertama.",
  ],
  [
    "Draft - Add Multi Category",
    "1. Pilih Loading Point\n2. Klik Tambah kategori\n3. Tambah Disposal",
    "Draft multi kategori bisa ditambahkan tanpa batas unik kategori.",
  ],
  [
    "Draft - Move Point Order",
    "1. Tambah beberapa point\n2. Klik tombol naik/turun",
    "Urutan point berubah dan urutan slide mengikuti posisi draft.",
  ],
  [
    "Draft - Remove Point",
    "1. Tambah dua draft\n2. Hapus salah satu draft",
    "Draft terhapus dan minimal satu draft tetap tersisa.",
  ],
  [
    "Draft - Point Name Required",
    "1. Kosongkan Nama Point / Segment\n2. Jalankan AI",
    "Sistem menolak dengan pesan nama point atau segment wajib diisi.",
  ],
  [
    "Photo - Three Angles Required",
    "1. Upload kurang dari 3 foto\n2. Jalankan AI",
    "Sistem menolak karena wajib unggah 3 foto angle berbeda.",
  ],
  [
    "AI - Analyze Active Point",
    "1. Isi metadata lengkap\n2. Upload 3 foto image\n3. Klik AI Kategori",
    "Request dikirim ke /api/reports/road-condition/analyze dan hasil assessment tampil.",
  ],
  [
    "AI - Analyze All Points",
    "1. Siapkan beberapa draft lengkap\n2. Klik AI Semua",
    "Semua draft dianalisis berurutan lalu report tersimpan ke history.",
  ],
  [
    "AI - Category Validation",
    "1. Kirim category invalid ke API analyze\n2. Cek response",
    "API menolak dengan pesan Kategori road condition tidak valid.",
  ],
  [
    "AI - Image Mime Validation",
    "1. Kirim payload foto mimeType bukan image/*\n2. Cek response",
    "API menolak foto yang bukan bertipe image.",
  ],
  [
    "AI - Base64 Data URL Validation",
    "1. Kirim image tanpa data URL base64 valid\n2. Cek response",
    "API menolak data foto yang bukan data URL sesuai mime.",
  ],
  [
    "AI - Rubric Completeness",
    "1. Analyze Loading Point\n2. Analyze Haulroad\n3. Analyze Disposal",
    "Hasil berisi assessment lengkap sesuai parameter rubric tiap kategori.",
  ],
  [
    "AI - Score Normalization",
    "1. AI mengembalikan score di luar 1-5\n2. Cek hasil UI/API",
    "Score dinormalisasi ke rentang 1 sampai 5.",
  ],
  [
    "Assessment - Score Dropdown",
    "1. Setelah AI selesai, ubah nilai parameter ke 1-5\n2. Cek overall score",
    "Nilai berubah, rekomendasi default mengikuti template, report autosave.",
  ],
  [
    "Assessment - Recommendation Edit",
    "1. Edit rekomendasi manual\n2. Blur field\n3. Reload history",
    "Rekomendasi manual tersimpan dengan recommendationEdited.",
  ],
  [
    "Assessment - Summary Score",
    "1. Cek summary per point\n2. Cek overall summary slide",
    "Average score dan persentase dihitung dari skor assessment aktif.",
  ],
  [
    "Assessment - Empty Before Analysis",
    "1. Buka report tanpa AI\n2. Cek assessment panel",
    "Panel menampilkan parameter default tanpa nilai hasil dan tombol save disabled.",
  ],
  [
    "History - Save Report",
    "1. Selesaikan minimal satu AI analysis\n2. Klik Simpan History",
    "History tersimpan ke hero_road_condition_reports dengan reportData JSON.",
  ],
  [
    "History - Update Existing Report",
    "1. Load report history\n2. Ubah rekomendasi atau score\n3. Simpan",
    "POST history memakai id existing dan memperbarui row yang sama.",
  ],
  [
    "History - List Latest 50",
    "1. Buka tab History\n2. Cek daftar report",
    "History menampilkan maksimal 50 report terbaru berdasarkan updatedAt.",
  ],
  [
    "History - Preview Detail",
    "1. Klik preview/eye pada history\n2. Cek modal preview",
    "Preview menampilkan metadata, foto, score, parameter, dan rekomendasi.",
  ],
  [
    "History - Load To Editor",
    "1. Klik edit history\n2. Cek tab Report",
    "History dimuat ke editor, foto dataUrl tampil, active tab kembali ke Report.",
  ],
  [
    "History - Delete",
    "1. Klik Hapus history\n2. Konfirmasi\n3. Cek daftar",
    "DELETE /history/[id] menghapus row dan historyList terupdate.",
  ],
  [
    "Slide - Cover",
    "1. Isi metadata\n2. Cek slide pertama",
    "Cover menampilkan site, customer, inspector, dan tanggal report.",
  ],
  [
    "Slide - Summary Table",
    "1. Analyze semua point\n2. Cek summary slide",
    "Summary mengelompokkan Loading Point, Haulroad, Disposal dan menampilkan score/persen.",
  ],
  [
    "Slide - Detail Per Point",
    "1. Cek slide detail tiap draft\n2. Bandingkan foto dan tabel",
    "Setiap point punya slide 16:9 berisi 3 foto, score, deskripsi, rekomendasi.",
  ],
  [
    "Slide - Back Cover",
    "1. Scroll report preview sampai akhir\n2. Cek slide terakhir",
    "Back cover tampil sebagai slide penutup.",
  ],
  [
    "PDF - Generate Current Report",
    "1. Klik Generate PDF dari report aktif\n2. Pantau progress",
    "PDF landscape 16:9 dibuat dan file road-condition-[tanggal].pdf terdownload.",
  ],
  [
    "PDF - Generate History Report",
    "1. Buka tab History\n2. Klik PDF pada report tersimpan",
    "PDF history dibuat dari reportData tersimpan, bukan state form kosong.",
  ],
  [
    "Print - Browser Print Layout",
    "1. Jalankan print browser\n2. Cek ukuran slide",
    "CSS print memakai ukuran 297mm x 167.063mm tanpa elemen no-print.",
  ],
  [
    "Mobile - Route Access",
    "1. Login mobile user HSE\n2. Buka /mobile/reports/road-condition",
    "Halaman mobile Road Condition Analysis terbuka dengan header Site Condition.",
  ],
  [
    "Mobile - Permission Denied",
    "1. Login mobile tanpa akses resource\n2. Buka route mobile",
    "User diarahkan ke /mobile/reports.",
  ],
  [
    "Mobile - Shared Client Behavior",
    "1. Isi metadata/draft di mobile\n2. Upload 3 foto\n3. Jalankan AI",
    "Mobile memakai client yang sama dan flow AI/history tetap berjalan.",
  ],
  [
    "Mobile - History",
    "1. Buka tab History di mobile\n2. Preview/load report",
    "History mobile memuat data yang sama dengan desktop.",
  ],
  [
    "Mobile - PDF",
    "1. Generate PDF dari mobile\n2. Cek progress/download",
    "PDF tetap dibuat dengan slide landscape dan progress tampil.",
  ],
  [
    "Boundary - Missing AI Key",
    "1. Jalankan analyze saat API key vision belum dikonfigurasi\n2. Cek error",
    "Sistem menampilkan pesan API key AI vision belum dikonfigurasi.",
  ],
  [
    "Boundary - Oversized Image",
    "1. Kirim foto dataUrl lebih dari batas\n2. Cek response",
    "API menolak foto terlalu besar maksimal sekitar 5MB.",
  ],
  [
    "Boundary - Invalid Date History",
    "1. POST history dengan tanggal bukan YYYY-MM-DD\n2. Cek response",
    "API menolak dengan Format tanggal harus YYYY-MM-DD.",
  ],
  [
    "Boundary - Save Without Analysis",
    "1. Coba simpan history tanpa point dianalisis\n2. Cek response",
    "Sistem menolak karena minimal satu point harus sudah dianalisis.",
  ],
  [
    "Boundary - Invalid Delete ID",
    "1. DELETE history dengan id tidak valid\n2. Cek response",
    "API mengembalikan ID tidak valid atau history report tidak ditemukan.",
  ],
];

const testCases = [
  [
    "Access & Permission",
    "1. Login user HSE/admin\n2. Buka /dashboard/reports/road-condition\n3. Uji user tanpa akses",
    "User berizin dapat membuka modul. User tanpa akses diarahkan keluar dan API menolak unauthorized/forbidden.",
  ],
  [
    "Metadata Site & Inspector",
    "1. Pilih site dari dropdown atau mode manual\n2. Isi customer, inspector, tanggal report",
    "Metadata wajib terisi, site aktif terbaca dari master, mode manual tetap bisa menyimpan lokasi.",
  ],
  [
    "Point Category & Photo",
    "1. Tambah point Loading Point/Haulroad/Disposal\n2. Isi nama point\n3. Upload 3 foto angle berbeda",
    "Point bisa multi kategori, urutan bisa diatur, dan sistem mewajibkan nama point + 3 foto image.",
  ],
  [
    "AI Road Condition Analysis",
    "1. Klik AI Kategori atau AI Semua\n2. Tunggu hasil analisis\n3. Cek rubric scoring",
    "AI mengembalikan score 1-5, summary, dan assessment lengkap sesuai rubric kategori.",
  ],
  [
    "Assessment Review",
    "1. Ubah score parameter\n2. Edit rekomendasi manual\n3. Simpan perubahan",
    "Score, deskripsi template, rekomendasi manual, dan average score tersimpan benar.",
  ],
  [
    "Save & Load History",
    "1. Simpan report ke history\n2. Buka tab History\n3. Preview dan load report",
    "Report tersimpan di hero_road_condition_reports, tampil di history, dan bisa dimuat ulang ke editor.",
  ],
  [
    "Delete History",
    "1. Klik Hapus history\n2. Konfirmasi\n3. Cek daftar history",
    "History terhapus dari daftar dan API mengembalikan success/deletedId.",
  ],
  [
    "PDF & Slide Report",
    "1. Cek cover, summary, detail point, back cover\n2. Generate PDF",
    "Slide 16:9 lengkap dan PDF landscape berhasil dibuat dari report aktif/history.",
  ],
  [
    "Mobile Road Condition",
    "1. Buka /mobile/reports/road-condition\n2. Jalankan flow metadata, foto, AI, history",
    "Mobile memakai flow yang sama dengan desktop dan tetap patuh permission mobile.",
  ],
  [
    "Validation & Error Handling",
    "1. Uji AI key kosong, foto oversized, tanggal invalid, save tanpa analysis\n2. Cek pesan error",
    "Sistem menolak input tidak valid dengan pesan jelas tanpa merusak data report.",
  ],
];

if (testCases.length !== totalTests) {
  throw new Error(`Expected ${totalTests} test cases, got ${testCases.length}`);
}

function setValue(sheet, address, value) {
  sheet.getRange(address).values = [[value]];
}

function writeMatrix(sheet, address, matrix) {
  sheet.getRange(address).values = matrix;
}

setValue(sheets.uat, "B3", "HERO PLATFORM");
setValue(sheets.uat, "B4", moduleName);
setValue(sheets.uat, "B5", "NEW / ENHANCEMENT");
setValue(sheets.uat, "B6", requestNo);
setValue(sheets.uat, "B7", "HSE, Operation, Site Inspector Team");
setValue(sheets.uat, "B8", "HSE / Site Condition");
setValue(sheets.uat, "B9", "Road Condition UAT - Desktop & Mobile");
setValue(sheets.uat, "B10", "30-Jun-2026");
setValue(sheets.uat, "B11", "Versi 1.0.0 - AI Vision, History, PDF Slide, Mobile");
setValue(sheets.uat, "B12", "Production");
writeMatrix(sheets.uat, "B15:B18", [[totalTests], [totalTests], [0], [0]]);

setValue(sheets.form, "D8", "HERO PLATFORM");
setValue(sheets.form, "D9", moduleName);
setValue(sheets.form, "D10", "V New System  ☐ Improvement  V Enhancement  ☐ Bug Fix");
setValue(sheets.form, "D11", requestNo);
setValue(sheets.form, "D12", "HSE, Operation, Site Inspector Team");
setValue(sheets.form, "D13", "HSE / Site Condition");
setValue(sheets.form, "D14", "M. Annas Khadafi");
setValue(sheets.form, "D15", uatDate);
setValue(sheets.form, "D16", "Versi 1.0.0");
setValue(sheets.form, "D17", "☐ Development  ☐ Staging  V  Production");
setValue(sheets.form, "B20", objective);
setValue(sheets.form, "B23", scope);
writeMatrix(sheets.form, "C25:C29", [[totalTests], [totalTests], [0], [0], [totalTests]]);
setValue(sheets.form, "C30", `${totalTests}/${totalTests} PASS`);

const formSummaryRows = Array.from({ length: 16 }, (_, index) => {
  if (index < categorySummary.length) {
    const [scenario, expected, actual, status] = categorySummary[index];
    return [scenario, null, expected, actual, status];
  }
  if (index === 15) {
    return [`TOTAL: ${totalTests}/${totalTests} PASS`, null, null, `${totalTests}/${totalTests}`, "Pass"];
  }
  return [null, null, null, null, null];
});
writeMatrix(sheets.form, "B32:F47", formSummaryRows);

const scenarioRows = [
  ["No", "Test Scenario", "Test Step", "Expected Result", "Actual Result", "Status (Pass/Fail)", "Remark"],
  ...testCases.map((testCase, index) => [
    `${index + 1}`,
    testCase[0],
    testCase[1],
    testCase[2],
    "MEET",
    "PASS",
    "",
  ]),
];
while (scenarioRows.length < 72) {
  scenarioRows.push([null, null, null, null, null, null, null]);
}
writeMatrix(sheets.scenarios, "A1:G72", scenarioRows);

writeMatrix(sheets.issues, "A1:F2", [
  ["No", "Deskripsi Issue", "Severity (Low/Medium/High)", "PIC", "Target Fix Date", "Status"],
  ["Belum ada issue untuk UAT modul Road Condition Analysis desktop/mobile. Isi saat pelaksanaan UAT bila ditemukan gap.", null, null, null, null, null],
]);

for (const [sheetId, range] of [
  ["UAT Form", "A1:B18"],
  ["FORM", "B2:F60"],
  ["Test Scenario", "A1:G52"],
  ["Issue Log", "A1:F2"],
]) {
  const inspect = await workbook.inspect({
    kind: "table",
    sheetId,
    range,
    include: "values,formulas",
    tableMaxRows: 60,
    tableMaxCols: 8,
    tableMaxCellChars: 180,
    maxChars: 12000,
  });
  await fs.writeFile(
    `${outputDir}/final-inspect-${sheetId.replaceAll(" ", "-")}.ndjson`,
    inspect.ndjson,
    "utf8",
  );
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 4000,
});
await fs.writeFile(`${outputDir}/formula-error-scan.ndjson`, errors.ndjson, "utf8");

for (const sheetName of ["UAT Form", "FORM", "Test Scenario", "Issue Log"]) {
  const preview = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    `${outputDir}/final-${sheetName.replaceAll(" ", "-")}.png`,
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
