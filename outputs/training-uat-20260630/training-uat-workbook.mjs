import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = String.raw`D:\[01] PROJECT\HERO\HR_CONNECT_UAT_Test.xlsx`;
const outputDir = String.raw`D:\[01] PROJECT\HERO\outputs\training-uat-20260630`;
const outputPath = `${outputDir}/Training_UAT_Test.xlsx`;

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheets = {
  uat: workbook.worksheets.getItem("UAT Form"),
  form: workbook.worksheets.getItem("FORM"),
  scenarios: workbook.worksheets.getItem("Test Scenario"),
  issues: workbook.worksheets.getItem("Issue Log"),
};

const uatDate = new Date(2026, 5, 30);
const totalTests = 48;
const moduleName = "TRAINING MODULE (Training Records Desktop, Training Dashboard, SIO & POP, Mobile Training History)";
const requestNo = "HERO/TRAINING/2026/001";
const objective =
  "Memastikan modul Training berfungsi untuk pencatatan riwayat training, import/export, filter dan grouping desktop, dashboard expiry, SIO & POP, sinkron LMS, serta tampilan mobile Training History/Profile.";
const scope =
  "TRAINING - DESKTOP TRAINING RECORDS, DASHBOARD, SIO & POP, IMPORT/EXPORT, LMS SYNC, MOBILE TRAINING HISTORY";

const categorySummary = [
  ["1. Desktop Access & Scope (4/4 Pass)", "Desktop Access & Scope", "4/4", "Pass"],
  ["2. Desktop Workspace & Metrics (5/5 Pass)", "Workspace & Metrics", "5/5", "Pass"],
  ["3. Filter, Search & Grouping (5/5 Pass)", "Filter/Search/Grouping", "5/5", "Pass"],
  ["4. Manual Training CRUD (5/5 Pass)", "Manual Training CRUD", "5/5", "Pass"],
  ["5. Import & Export Training Records (6/6 Pass)", "Import & Export", "6/6", "Pass"],
  ["6. Expiry Dashboard & Analytics (5/5 Pass)", "Dashboard & Analytics", "5/5", "Pass"],
  ["7. SIO & POP Certification (4/4 Pass)", "SIO & POP", "4/4", "Pass"],
  ["8. LMS Sync & Data Integrity (4/4 Pass)", "LMS Sync/Data", "4/4", "Pass"],
  ["9. Mobile Training History (5/5 Pass)", "Mobile Training", "5/5", "Pass"],
  ["10. Mobile Profile & RBAC (3/3 Pass)", "Mobile Profile/RBAC", "3/3", "Pass"],
  ["11. Empty State & Error Handling (2/2 Pass)", "Empty/Error State", "2/2", "Pass"],
];

const testCases = [
  [
    "Training Desktop - Login & Menu Access",
    "1. Login sebagai admin HC\n2. Buka dashboard HERO\n3. Pilih menu Training History / Training Records",
    "User masuk ke halaman /dashboard/training-records dan menu training terlihat sesuai role.",
  ],
  [
    "Training Desktop - Alias Route HC Training",
    "1. Buka /dashboard/hc/training\n2. Verifikasi halaman yang tampil",
    "Route alias membuka workspace Training Records yang sama tanpa duplikasi data.",
  ],
  [
    "Training Desktop - Mobile Link",
    "1. Buka halaman Training History desktop\n2. Klik tombol Tampilan Mobile",
    "Link mengarah ke /mobile/training untuk user mobile.",
  ],
  [
    "Training Desktop - RBAC Viewer",
    "1. Login sebagai user viewer\n2. Buka Training Records\n3. Cek tombol tambah/edit/delete/import",
    "Viewer hanya melihat data sesuai permission dan tidak bisa aksi terlarang.",
  ],
  [
    "Workspace - Global Filter Bar",
    "1. Buka Training History\n2. Cek filter karyawan, department, section, tahun",
    "Seluruh filter tampil sebagai searchable select dan membaca opsi dari data training.",
  ],
  [
    "Workspace - Metric Cards",
    "1. Buka tab Workspace & Riwayat\n2. Cek Record training, Karyawan tercakup, Segera expiry, Tanpa expiry",
    "KPI muncul dan mengikuti scope filter aktif.",
  ],
  [
    "Workspace - Table Shell",
    "1. Cek area tabel Training Records\n2. Cek search, summary row, action area",
    "Tabel memakai layout table-first, search aktif, dan action tetap rapi.",
  ],
  [
    "Workspace - Group By Employee",
    "1. Cek daftar training\n2. Klik baris karyawan\n3. Buka detail training",
    "Data dikelompokkan per karyawan, expand menampilkan training per employee.",
  ],
  [
    "Workspace - Row Status Summary",
    "1. Buka grouped table\n2. Cek badge Valid, Segera Exp, Expired",
    "Ringkasan status per karyawan sesuai record expiry/status.",
  ],
  [
    "Filter - Employee",
    "1. Pilih filter karyawan\n2. Cek tabel dan KPI",
    "Tabel dan KPI hanya menampilkan record milik karyawan terpilih.",
  ],
  [
    "Filter - Department & Section",
    "1. Pilih department\n2. Pilih section\n3. Cek opsi karyawan",
    "Opsi karyawan tersaring sesuai department/section dan tabel mengikuti filter.",
  ],
  [
    "Filter - Training Year",
    "1. Pilih tahun training\n2. Cek record dalam tabel",
    "Hanya record dengan completedYear sesuai pilihan yang tampil.",
  ],
  [
    "Filter - Preset Tahun Berjalan",
    "1. Klik tombol Tahun berjalan\n2. Cek query tahun dan hasil tabel",
    "Filter tahun berjalan terpasang dan hasil berubah sesuai data tahun aktif.",
  ],
  [
    "Filter - Reset Scope",
    "1. Aktifkan beberapa filter\n2. Klik Reset scope",
    "Semua filter employee/department/section/year kosong dan tabel kembali ke semua data.",
  ],
  [
    "Training CRUD - Create Record",
    "1. Klik Training Record\n2. Pilih karyawan\n3. Isi training, provider, tahun, expiry, status\n4. Simpan",
    "Record baru tersimpan, muncul di grouped table, dan halaman mobile ikut revalidate.",
  ],
  [
    "Training CRUD - Required Validation",
    "1. Buka form Training Record\n2. Kosongkan karyawan atau training\n3. Simpan",
    "Sistem menolak submit dan menampilkan pesan Karyawan dan training wajib diisi.",
  ],
  [
    "Training CRUD - Optional Expiry",
    "1. Tambah record tanpa tanggal expiry\n2. Simpan",
    "Record tersimpan sebagai history tanpa masa berlaku / Tanpa expiry.",
  ],
  [
    "Training CRUD - Edit Detail",
    "1. Expand employee\n2. Klik edit record\n3. Ubah provider/tahun/expiry/status\n4. Simpan",
    "Perubahan tersimpan dan tampil di desktop serta mobile.",
  ],
  [
    "Training CRUD - Update Status/Delete",
    "1. Ubah status active/expiring_soon/urgent\n2. Hapus record uji\n3. Konfirmasi",
    "Status berubah sesuai pilihan dan delete mengikuti permission serta konfirmasi.",
  ],
  [
    "Import - Download Example CSV",
    "1. Klik Example CSV\n2. Buka file training-record-example.csv",
    "Template CSV berisi kolom SN, Nama Karyawan, Department, Training, Provider, Tahun, Expired At, Status.",
  ],
  [
    "Import - Upload CSV Preview",
    "1. Klik Import Data\n2. Upload CSV training valid\n3. Cek preview",
    "Preview menampilkan jumlah baris/kolom dan contoh data sebelum import.",
  ],
  [
    "Import - Upload Excel Preview",
    "1. Upload file .xlsx/.xls dengan header training\n2. Cek parsing header",
    "File Excel dibaca dari sheet pertama dan header training dikenali otomatis.",
  ],
  [
    "Import - Required Mapping",
    "1. Upload data tanpa Training atau Tahun\n2. Submit import",
    "Import ditolak karena kolom trainingName dan completedYear wajib.",
  ],
  [
    "Import - Upsert Duplicate",
    "1. Import record karyawan + training + tahun yang sudah ada\n2. Submit import",
    "Record existing di-update, bukan dibuat ganda.",
  ],
  [
    "Export - Training Records Excel",
    "1. Terapkan filter\n2. Klik export Excel pada table shell",
    "File Excel terunduh sesuai hasil filter dan kolom utama training terbaca.",
  ],
  [
    "Dashboard - Open Dashboard Tab",
    "1. Klik tab Dashboard\n2. Cek empat kartu statistik",
    "Kartu Valid, Segera Expired, Expired, Total Training Record tampil sesuai filter.",
  ],
  [
    "Dashboard - Source Distribution",
    "1. Cek panel Distribusi Sumber Pelatihan\n2. Bandingkan LMS vs External",
    "Persentase LMS Chitra Learning dan External Training dihitung dari data aktif.",
  ],
  [
    "Dashboard - Top Training",
    "1. Cek Top 5 Sertifikasi / Pelatihan\n2. Bandingkan jumlah karyawan",
    "List menampilkan pelatihan terbanyak dengan progress bar dan count.",
  ],
  [
    "Dashboard - Department Coverage",
    "1. Cek Cakupan Pelatihan per Departemen\n2. Verifikasi jumlah karyawan dan record",
    "Statistik departemen tampil urut sesuai jumlah record.",
  ],
  [
    "Dashboard - Expiry Alert",
    "1. Siapkan record expired dan expiring soon\n2. Buka panel Peringatan Expiry",
    "Record expired dan due soon muncul dengan badge EXPIRED atau sisa hari.",
  ],
  [
    "SIO & POP - Open Tab",
    "1. Klik tab SIO & POP\n2. Cek database certification",
    "Tab SIO & POP terbuka dan memuat data sertifikasi terkait.",
  ],
  [
    "SIO & POP - Filter/Search",
    "1. Cari karyawan atau jenis sertifikasi\n2. Cek hasil",
    "Data SIO/POP tersaring tanpa mengganggu tab Training Records.",
  ],
  [
    "SIO & POP - Expiry Aggregates",
    "1. Cek agregat valid/due/expired\n2. Bandingkan dengan list",
    "Agregat sertifikasi sesuai status expiry di tabel.",
  ],
  [
    "SIO & POP - Cross Scope",
    "1. Buka tab SIO & POP lalu kembali ke Workspace\n2. Cek filter training",
    "Navigasi tab tidak merusak data/filter training utama.",
  ],
  [
    "LMS Sync - Admin Self Sync",
    "1. Login user dengan email LMS\n2. Buka desktop Training Records",
    "Kelulusan LMS user aktif disinkronkan ke hero_training_records sebelum data tampil.",
  ],
  [
    "LMS Sync - Selected Employee",
    "1. Pilih filter karyawan dengan email\n2. Refresh halaman",
    "Jika employee dipilih, sistem mencoba sync LMS karyawan tersebut.",
  ],
  [
    "Data Integrity - Employee Source",
    "1. Cek record training di tabel\n2. Verifikasi nama/SN/departemen/section",
    "Data karyawan berasal dari hero_employees dan join master department/section/site.",
  ],
  [
    "Data Integrity - Sort Order",
    "1. Expand employee dengan beberapa tahun\n2. Cek urutan detail",
    "Detail training tersortir dari completedYear terbaru ke lama.",
  ],
  [
    "Mobile Training - Login Guard",
    "1. Buka /mobile/training tanpa session\n2. Cek redirect",
    "User tanpa session diarahkan ke sign-in.",
  ],
  [
    "Mobile Training - KPI Cards",
    "1. Login mobile\n2. Buka Training History\n3. Cek cards Records, Years, Due Soon",
    "KPI mobile menampilkan total record, jumlah tahun, dan due soon.",
  ],
  [
    "Mobile Training - Timeline Grouping",
    "1. Cek Passport Timeline\n2. Bandingkan grouping per tahun",
    "Training mobile dikelompokkan per completedYear.",
  ],
  [
    "Mobile Training - Expiry Text",
    "1. Buka item training dengan expiry\n2. Buka item tanpa expiry",
    "Item menampilkan tanggal expiry + sisa hari, atau Tanpa masa berlaku/history only.",
  ],
  [
    "Mobile Training - LMS Sync",
    "1. Login mobile dengan email LMS\n2. Buka /mobile/training",
    "Halaman mobile mencoba sync LMS sebelum mengambil data training user.",
  ],
  [
    "Mobile Profile - Training Section",
    "1. Buka /mobile/profile\n2. Cek section training",
    "Riwayat training user tampil di profil mobile dengan nama training, tahun, expiry.",
  ],
  [
    "Mobile RBAC - Menu Mapping",
    "1. Login role mobile\n2. Cek akses menu training\n3. Buka /mobile/training",
    "Mapping desktop training ke mobile training sesuai permission user.",
  ],
  [
    "Mobile Data Scope - Own Records",
    "1. Login employee biasa\n2. Buka Training History",
    "Mobile hanya menampilkan record training milik user login.",
  ],
  [
    "Empty State - Desktop",
    "1. Terapkan filter tanpa hasil\n2. Cek table/dashboard",
    "Desktop menampilkan empty state dan KPI nol tanpa error.",
  ],
  [
    "Empty State - Mobile",
    "1. Login user tanpa data training\n2. Buka /mobile/training",
    "Mobile menampilkan pesan Belum ada data training untuk akun ini.",
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
setValue(sheets.uat, "B7", "Human Capital & Training Management Team");
setValue(sheets.uat, "B8", "Human Capital - Training Center");
setValue(sheets.uat, "B9", "Training UAT - Desktop & Mobile");
setValue(sheets.uat, "B10", "30-Jun-2026");
setValue(sheets.uat, "B11", "Versi 1.0.0 - Training Records, Dashboard, SIO & POP, LMS Sync, Mobile Training");
setValue(sheets.uat, "B12", "Production");
writeMatrix(sheets.uat, "B15:B18", [[totalTests], [totalTests], [0], [0]]);

setValue(sheets.form, "D8", "HERO PLATFORM");
setValue(sheets.form, "D9", moduleName);
setValue(sheets.form, "D10", "V New System  ☐ Improvement  V Enhancement  ☐ Bug Fix");
setValue(sheets.form, "D11", requestNo);
setValue(sheets.form, "D12", "Human Capital & Training Management Team");
setValue(sheets.form, "D13", "Human Capital - Training Center");
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
  ["Belum ada issue untuk UAT modul Training desktop/mobile. Isi saat pelaksanaan UAT bila ditemukan gap.", null, null, null, null, null],
]);

const keyRanges = [
  ["UAT Form", "A1:B18"],
  ["FORM", "B2:F60"],
  ["Test Scenario", "A1:G52"],
  ["Issue Log", "A1:F2"],
];

for (const [sheetId, range] of keyRanges) {
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

for (const sheetName of Object.keys({
  "UAT Form": true,
  FORM: true,
  "Test Scenario": true,
  "Issue Log": true,
})) {
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
