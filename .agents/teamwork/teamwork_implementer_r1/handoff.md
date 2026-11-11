# Handoff Report: Auto-Generate Surat Perintah Lembur (SPL) Langsung dari Formulir Aktivitas Harian (Daily Activity Report)

## Executive Summary
Fitur otomatisasi pembuatan Surat Perintah Lembur (SPL) langsung dari formulir Aktivitas Harian (Daily Activity Report) telah selesai diimplementasikan secara menyeluruh dengan integrasi penuh ke database SPL, alur persetujuan (approval multi-tier), kalkulasi jam lembur karyawan, dan modul pengajuan/rekap lembur `/dashboard/overtime-requests`.

Pengguna kini tidak perlu lagi mengetik ulang dari awal rincian pekerjaan, unit yang dikerjakan, jam lembur, maupun data karyawan. Ketika tombol **"BUAT SPL LEMBUR"** diklik (pada Formulir Detail Aktivitas Harian, dropdown baris tabel, atau modal delayed job), sistem langsung membuka modal pre-filled pintar yang memetakan aktivitas kerja pada jam lembur ke dalam draft pengajuan SPL resmi. Begitu dikonfirmasi, SPL langsung diterbitkan dengan nomor resmi (`SPL-YYYY-XXXX`), didaftarkan ke workflow approval atasan (Leader/PJO), dan dapat langsung dibuka di modul SPL.

---

## 1. What I Changed

### A. Komponen Modal Pembuatan SPL Otomatis (`components/daily-activity-create-spl-modal.tsx`)
- Dibuat komponen modal baru `DailyActivityCreateSplModal` yang mengadopsi standar baku template Shadcn HERO (`HeroInput`, `HeroTextarea`).
- Mengimplementasikan helper `extractOvertimeInfo` yang menganalisis aktivitas lembur karyawan (hari kerja normal di atas shift, maupun hari libur / off-day).
- Menyediakan form pre-filled: Data Karyawan, Site, Tanggal Lembur, Jam Mulai, Jam Selesai, Total Estimasi Durasi Lembur, Judul Dokumen, Catatan Operasional, serta tabel interaktif Rincian Pekerjaan Lembur (Unit, Jam, Bobot/Poin, Keterangan Lapangan, dan Thumbnail Foto Bukti).
- Menyediakan status transisi sukses yang menampilkan nomor dokumen SPL resmi dan tombol shortcut **"Buka di Modul SPL"**.
- Mengatur z-index overlay (`z-[90]`) dan konten modal (`z-[95]`) sehingga tampil sempurna di atas modal detail dokumen aktivitas harian tanpa terhalang backdrop.

### B. Server Action Pembuatan SPL (`app/dashboard/daily-activity/actions.ts`)
- Ditambahkan server action `createSplFromDailyActivityAction` yang:
  1. Memvalidasi session pengguna yang login.
  2. Mengidentifikasi karyawan target (pekerja lembur) dan operator pemohon.
  3. Menghasilkan nomor registrasi SPL sekuensial (`SPL-YYYY-XXXX`).
  4. Menyimpan record utama ke `overtimeCommandLetters` dengan status `Submitted` dan origin `daily_activity`.
  5. Mendaftarkan peserta ke `overtimeCommandLetterParticipants`.
  6. Menyimpan seluruh tugas lembur ke `overtimeCommandLetterItems` lengkap dengan target unit, estimasi durasi, dan planned points.
  7. Memicu `ensureOvertimeApprovalsExist` untuk membentuk step 1 auto-approved (Pemohon) dan step 2 pending (Leader/PJO) beserta pengiriman notifikasi email.
  8. Me-revalidasi route `/dashboard/daily-activity`, `/dashboard/overtime-requests`, `/dashboard/activity-hub`, dan `/dashboard/approval`.

### C. Antarmuka Monitoring Aktivitas Harian (`app/dashboard/daily-activity/client-dashboard.tsx`)
- Mengintegrasikan modal `DailyActivityCreateSplModal` ke dalam halaman dashboard.
- Mengubah tombol "Buat SPL Lembur" pada Formulir Detail Aktivitas Harian (yang sebelumnya hanya link statis) menjadi pemanggil modal otomatis pre-filled.
- Mengubah dropdown menu item baris tabel "Buat SPL Lembur" menjadi pemanggil modal otomatis.
- Mengubah tombol "Buat SPL Lembur Terkait" pada item pekerjaan tertunda (delayed job) menjadi pemanggil modal otomatis.
- Menambahkan banner informatif pada Formulir Detail Dokumen Resmi Aktivitas Harian ketika karyawan telah memiliki SPL terbit lengkap dengan status dan tautan langsung ke dokumen SPL.

### D. Penyelarasan Metadata & Modul SPL
- `lib/daily-activity-dashboard.ts` & `lib/daily-activity-types.ts`: Menambahkan penarikan `splNumber` dan `splStatus` pada query SPL sehingga setiap baris aktivitas harian mengenali dokumen SPL yang berelasi dan langsung menghitung jam lembur aktual.
- `app/dashboard/overtime-requests/actions.ts`: Mengekspor helper `ensureOvertimeApprovalsExist` agar dapat dipanggil dari action modul lain.
- `app/dashboard/overtime-requests/page.tsx` & `client.tsx`: Menambahkan penanganan `initialSearchQuery` dari query params `splNumber` atau `q` sehingga pengguna yang diarahkan dari Daily Activity langsung melihat data SPL terkait pada tabel.

---

## 2. Verification Record

### Deep Verification (Ran Actual Tests)
1. **Automated Unit & Contract Test Suite**:
   ```bash
   node --test tests/daily-activity-auto-spl-generation.test.mjs tests/daily-activity-spl-integration.test.mjs tests/auto-approve-spl-daily-activity.test.mjs
   ```
   **Result**: 8 tests PASS (0 fail, duration ~95ms).
2. **Real-Browser End-to-End Test (`e2e run`)**:
   ```bash
   npx e2e run tests/daily-activity-auto-spl.e2e.ts
   ```
   **Result**: 1 passed (1 test) in 32.09s, exit code 0.
   - Test flow verified:
     1. Login menggunakan kredensial standar (`71261` / `Chitra#71261`).
     2. Membuka `/dashboard/daily-activity`.
     3. Membuka Formulir Detail Dokumen Aktivitas Harian karyawan.
     4. Mengklik tombol "BUAT SPL LEMBUR".
     5. Memastikan modal SPL terbuka dengan seluruh data terisi otomatis dari aktivitas harian (Nama, SN, Tanggal, Jam, Rincian Pekerjaan).
     6. Mengklik "Terbitkan & Simpan SPL".
     7. Memverifikasi konfirmasi sukses dan penomoran SPL resmi.
     8. Mengklik "Buka di Modul SPL" dan memastikan mendarat di `/dashboard/overtime-requests` dengan dokumen SPL terhubung.
3. **Monthly Presentation Automation**:
   ```bash
   python scripts/update-monthly-presentation.py --title "Auto-Generate SPL dari Daily Activity Report" ...
   ```
   **Result**: Slide #88 berhasil dibuat dan ditambahkan di `Monthly/MONTHLY NOVEMBER 2026 SDS.pptx`.

---

## 3. Evidence Screenshots
- `001-01-daily-activity-dashboard.png` (Dashboard monitoring aktivitas harian)
- `002-02-daily-activity-detail-modal.png` (Formulir detail aktivitas harian dengan tombol "Buat SPL Lembur")
- `003-03-spl-prefilled-modal.png` (Modal formulir SPL yang terisi otomatis dari aktivitas lembur)
- `004-04-spl-created-success.png` (Konfirmasi SPL berhasil diterbitkan dengan nomor resmi)
- `005-05-overtime-requests-spl-linked.png` (Modul pengajuan & rekap lembur menampilkan SPL yang baru dibuat)
