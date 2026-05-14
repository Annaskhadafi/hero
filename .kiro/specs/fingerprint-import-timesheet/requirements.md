# Requirements Document

## Introduction

Fitur ini menambahkan kemampuan import data absensi dari file Excel Finger Print (format "Lap. Detail Absensi" dari mesin fingerprint) ke halaman Schedule Timesheet pada Menu Schedule. Sistem harus tetap backward compatible dengan format import yang sudah ada sebelumnya (matrix, row-log, contractor-detail).

File contoh: "Finger Print BPP.xlsx" — format berisi blok per karyawan dengan baris ID/Nama dan baris scan time terkompresi (e.g., `07:5217:56` = masuk 07:52, pulang 17:56).

## Glossary

- **Attendance_Parser**: Modul `attendance-template-parser.ts` yang mendeteksi dan mem-parse berbagai format template Excel attendance
- **Fingerprint_Detail_Format**: Format Excel dari mesin fingerprint dengan header "Lap. Detail Absensi", baris day-number (1-30/31), dan blok per karyawan berisi baris ID + baris scan time
- **Scheduling_Timesheet_Workspace**: Komponen UI utama halaman Schedule Timesheet yang menangani import, preview, dan penyimpanan data attendance
- **Period**: Bulan aktif dalam format `yyyy-MM` (e.g., `2026-04`)
- **Compressed_Time**: Format waktu terkompresi tanpa separator antar scan, e.g., `07:5217:56` berarti clock-in 07:52 dan clock-out 17:56
- **Employee_Matcher**: Mekanisme pencocokan karyawan dari data Excel ke database menggunakan SN (exact), nama (exact), dan fuzzy matching (Fuse.js)
- **Import_Override**: Data attendance hasil import yang disimpan ke database sebagai override manual dengan source `excel`

## Requirements

### Requirement 1: Deteksi Format Fingerprint Detail

**User Story:** Sebagai admin site, saya ingin sistem otomatis mengenali file Excel Finger Print BPP saat di-import, sehingga saya tidak perlu memilih format secara manual.

#### Acceptance Criteria

1. WHEN file Excel di-upload yang mengandung teks "Lap. Detail Absensi" atau "Lap Detail Absensi" pada 8 baris pertama, THE Attendance_Parser SHALL mendeteksi file tersebut sebagai `fingerprint-detail` kind
2. WHEN file Excel memiliki baris dengan angka 1 sampai 31 berurutan (minimal 5 angka cocok dengan index+1), THE Attendance_Parser SHALL mengidentifikasi baris tersebut sebagai day-column header
3. WHEN file Excel memiliki baris dengan cell pertama "ID:" dan cell lain "Nama:", THE Attendance_Parser SHALL mengidentifikasi baris tersebut sebagai employee block header
4. THE Attendance_Parser SHALL memberikan confidence score 100 untuk deteksi fingerprint-detail yang valid

### Requirement 2: Parsing Blok Karyawan Fingerprint

**User Story:** Sebagai admin site, saya ingin data setiap karyawan dari file Finger Print ter-parse dengan benar, sehingga ID dan nama karyawan teridentifikasi untuk matching.

#### Acceptance Criteria

1. WHEN baris ID ditemukan (cell[0] = "ID:"), THE Attendance_Parser SHALL mengekstrak employee SN dari cell pertama yang berisi angka murni (regex `^\d+$`) setelah index 0
2. WHEN baris ID memiliki label "Nama:", THE Attendance_Parser SHALL mengekstrak nama karyawan dari cell pada posisi nameLabelIndex + 2, dengan fallback ke nameLabelIndex + 1
3. WHEN baris scan (baris setelah baris ID) memiliki data pada kolom day, THE Attendance_Parser SHALL mem-parse compressed time dari setiap cell yang tidak kosong
4. IF baris ID tidak memiliki cell angka murni untuk SN, THEN THE Attendance_Parser SHALL menggunakan string kosong sebagai employeeSn dan tetap melanjutkan parsing berdasarkan nama

### Requirement 3: Parsing Compressed Time

**User Story:** Sebagai admin site, saya ingin waktu scan yang terkompresi (e.g., `07:5217:56`) ter-parse menjadi clock-in dan clock-out yang benar.

#### Acceptance Criteria

1. WHEN cell scan berisi format `HH:MMHH:MM` (dua waktu tanpa separator), THE Attendance_Parser SHALL mengekstrak waktu pertama sebagai clockIn dan waktu terakhir sebagai clockOut
2. WHEN cell scan berisi satu waktu `HH:MM`, THE Attendance_Parser SHALL mengekstrak waktu tersebut sebagai clockIn dengan clockOut kosong
3. WHEN cell scan berisi lebih dari dua waktu (e.g., `07:4107:4119:0119:01`), THE Attendance_Parser SHALL menggunakan waktu pertama sebagai clockIn dan waktu terakhir sebagai clockOut
4. WHEN cell scan kosong, THE Attendance_Parser SHALL melewatkan hari tersebut tanpa menghasilkan row
5. THE Attendance_Parser SHALL memvalidasi bahwa jam 0-23 dan menit 0-59, dan mengembalikan string kosong untuk waktu yang tidak valid

### Requirement 4: Auto-Deteksi Period dari File Fingerprint

**User Story:** Sebagai admin site, saya ingin sistem otomatis mendeteksi bulan/period dari file Finger Print, sehingga saya tidak perlu mengatur period secara manual jika berbeda.

#### Acceptance Criteria

1. WHEN file fingerprint memiliki baris "Waktu Absen" dengan format tanggal `yyyy-MM-dd ~ yyyy-MM-dd`, THE Scheduling_Timesheet_Workspace SHALL mengekstrak period dari tanggal awal tersebut
2. WHEN period yang terdeteksi berbeda dari period aktif di UI, THE Scheduling_Timesheet_Workspace SHALL mengupdate period UI dan menampilkan notifikasi info kepada user
3. WHEN period terdeteksi dan data di-parse ulang dengan period baru, THE Scheduling_Timesheet_Workspace SHALL menggunakan period baru untuk filtering hari yang valid (1 sampai jumlah hari dalam bulan)
4. IF format tanggal pada baris "Waktu Absen" tidak dikenali, THEN THE Scheduling_Timesheet_Workspace SHALL tetap menggunakan period aktif di UI

### Requirement 5: Employee Matching untuk Fingerprint Import

**User Story:** Sebagai admin site, saya ingin karyawan dari file Finger Print dicocokkan dengan data HERO secara akurat, sehingga data attendance masuk ke karyawan yang benar.

#### Acceptance Criteria

1. THE Employee_Matcher SHALL mencoba pencocokan SN exact terlebih dahulu (employeeSn dari file vs employeeSn di database)
2. WHEN SN exact match tidak ditemukan, THE Employee_Matcher SHALL mencoba pencocokan nama exact (case-insensitive)
3. WHEN nama exact match tidak ditemukan, THE Employee_Matcher SHALL mencoba fuzzy matching menggunakan Fuse.js dengan threshold 0.35
4. WHEN tidak ada match ditemukan, THE Scheduling_Timesheet_Workspace SHALL menghitung karyawan tersebut sebagai unmatched dan menampilkan nama asli di summary
5. THE Scheduling_Timesheet_Workspace SHALL menampilkan jumlah matched dan unmatched setelah import selesai

### Requirement 6: Backward Compatibility Import

**User Story:** Sebagai admin site, saya ingin format import yang sudah ada (matrix, row-log, contractor-detail) tetap berfungsi normal setelah penambahan support fingerprint.

#### Acceptance Criteria

1. THE Attendance_Parser SHALL mempertahankan urutan deteksi: contractor-detail → row-log → matrix → fingerprint-detail, dengan confidence score menentukan prioritas
2. WHEN file Excel bukan format fingerprint, THE Attendance_Parser SHALL tetap mendeteksi dan mem-parse sesuai format yang sesuai (matrix, row-log, atau contractor-detail)
3. THE Scheduling_Timesheet_Workspace SHALL menggunakan fungsi `parseAttendanceWorkbook` yang sama untuk semua format tanpa perubahan interface
4. WHEN import berhasil dari format apapun, THE Scheduling_Timesheet_Workspace SHALL menyimpan data ke database dengan source `excel` dan menampilkan hasil yang konsisten

### Requirement 7: Penyimpanan Hasil Import ke Database

**User Story:** Sebagai admin site, saya ingin data attendance dari file Finger Print tersimpan ke database secara otomatis setelah import, sehingga data tidak hilang saat reload halaman.

#### Acceptance Criteria

1. WHEN import fingerprint berhasil mem-parse dan match karyawan, THE Scheduling_Timesheet_Workspace SHALL menyimpan setiap cell attendance sebagai override dengan source `excel`
2. WHEN penyimpanan ke database berhasil, THE Scheduling_Timesheet_Workspace SHALL menampilkan toast success dan mengupdate timestamp `attendanceSavedAt`
3. IF penyimpanan ke database gagal, THEN THE Scheduling_Timesheet_Workspace SHALL menampilkan toast error dengan durasi 10 detik dan instruksi untuk retry manual
4. THE Scheduling_Timesheet_Workspace SHALL menampilkan data import di cell UI secara langsung sebelum menunggu konfirmasi database

### Requirement 8: Handling File Fingerprint Tanpa Data Valid

**User Story:** Sebagai admin site, saya ingin mendapat pesan error yang jelas jika file Finger Print tidak mengandung data yang bisa di-parse untuk period aktif.

#### Acceptance Criteria

1. WHEN file fingerprint terdeteksi tapi tidak menghasilkan row data untuk period aktif, THE Scheduling_Timesheet_Workspace SHALL menampilkan pesan error yang menyebutkan period aktif
2. WHEN semua karyawan dari file tidak cocok dengan data HERO, THE Scheduling_Timesheet_Workspace SHALL menampilkan pesan error dengan jumlah nama yang tidak cocok
3. IF file Excel tidak dikenali sebagai format apapun, THEN THE Attendance_Parser SHALL melempar error dengan pesan "Template attendance tidak dikenali"
