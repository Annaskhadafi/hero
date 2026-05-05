# 📋 SISTEM TIMESHEET — DOKUMEN DESAIN & TASK LIST
> **Dokumen ini dibuat untuk AI Developer**  
> Berisi analisis lengkap proses bisnis, struktur data, desain sistem, dan daftar task yang harus dikerjakan.  
> Perusahaan: **PT. Chitra Paratama**  
> Sistem: **Import & Auto-Generate Summary Lemburan (Overtime + Allowance)**

---

## 📌 DAFTAR ISI
1. [Latar Belakang & Proses Bisnis](#1-latar-belakang--proses-bisnis)
2. [Analisis File Excel Eksisting](#2-analisis-file-excel-eksisting)
3. [Aturan Bisnis Per Site](#3-aturan-bisnis-per-site)
4. [Logika Status Harian](#4-logika-status-harian)
5. [Desain Database](#5-desain-database)
6. [Desain API Endpoint](#6-desain-api-endpoint)
7. [Desain Import Engine](#7-desain-import-engine)
8. [Desain Output Generator](#8-desain-output-generator)
9. [Desain UI / Frontend](#9-desain-ui--frontend)
10. [Task List Lengkap untuk AI](#10-task-list-lengkap-untuk-ai)
11. [Contoh Data Referensi](#11-contoh-data-referensi)

---

## 1. LATAR BELAKANG & PROSES BISNIS

### 1.1 Kondisi Saat Ini (Manual)
- Tim di masing-masing **site** (lokasi tambang/proyek) mencatat lembur harian di form Excel per karyawan.
- Setiap bulan, tim site mengirimkan **2 file Excel** ke admin pusat:
  1. **OT Record** — rekaman jam lembur harian setiap karyawan
  2. **Form Tunjangan / SPL** — rekaman tunjangan (Mine Site Allowance, Meals, Tunjangan Lokasi Khusus) per hari per karyawan
- **Admin pusat** mengolah semua file tersebut secara manual menjadi **1 file Summary Lemburan** (multi-sheet) yang digunakan untuk proses payroll.

### 1.2 Masalah yang Ingin Diselesaikan
- Proses manual memakan waktu lama dan rawan human error.
- Setiap site mengirim format file yang sedikit berbeda.
- Setiap site memiliki rate tunjangan yang berbeda.
- Admin pusat harus melakukan mapping ulang setiap bulan dari banyak file.

### 1.3 Solusi yang Dibangun
Sistem **import Excel otomatis** yang:
1. Membaca file OT Record & Form Tunjangan yang dikirim site.
2. Memetakan data ke struktur internal berdasarkan kode site dan SN karyawan.
3. Menghitung total per hari menggunakan rate yang dikonfigurasi per site.
4. Meng-generate file **Summary Lemburan** sesuai format Excel yang sudah digunakan.
5. Memberikan antarmuka review & koreksi sebelum finalisasi.

---

## 2. ANALISIS FILE EXCEL EKSISTING

### 2.1 File A — `SUMMARY_LEMBURAN.xlsx` (Target Output)

**Deskripsi:** File hasil akhir yang dibuat admin pusat. Ini adalah **format OUTPUT** yang harus dihasilkan sistem.

**Struktur Workbook:**
- Multi-sheet, **1 sheet per site/grup**
- Nama sheet: `PPA BIB`, `AMM MIFA`, `AMM IPT`, `VALE`, `Balikpapan`, `CK BIB`, `CK BMB`, `CK DMP & MIFA`, `CK KIM`, `CK MHU`, `BHJ & GRESIK`

**Struktur Setiap Sheet:**
Setiap sheet mengandung 3–4 tabel terpisah yang disusun vertikal:

```
TABEL 1: OVERTIME SUMMARY {Bulan} {Tahun}
Header: No | Name | SN | LOC | [Tgl 1..31] | Total | Remark

TABEL 2: MSA SUMMARY {Bulan} {Tahun}
Header: No | Name | SN | LOC | [Tgl 1..31] | Total | Remark

TABEL 3: MEALS SUMMARY {Bulan} {Tahun}  (tidak semua site)
Header: No | Name | SN | LOC | [Tgl 1..31] | Total | Remark

TABEL 4: TUNJANGAN LOKASI KHUSUS SUMMARY  (hanya VALE)
Header: No | Name | SN | LOC | [Tgl 1..31] | Total | Remark
```

**Nilai dalam Grid:**
- **OT Summary:** angka jam (integer atau desimal), atau status: `OFF`, `FB`, `SICK`, `IZIN`, `ALPA`, `Libur`, kosong
- **MSA/Meals/TLK Summary:** nominal Rupiah per hari (misal: `35000`), atau status yang sama (`FB`, `SICK`, `IZIN`, `ALPA`)
- **Total:** penjumlahan nilai numerik sepanjang bulan

**Footer setiap sheet:**
```
Prepared: [Nama]   Acknowledged: [Nama]   Approved: [Nama]   Checked: [Nama]
```

---

### 2.2 File B — `OT Record Excel` (Input dari Site, per Karyawan)

**Deskripsi:** File yang dikirim tim site. **1 file bisa berisi banyak sheet**, masing-masing 1 karyawan.

**Struktur Header Sheet:**
```
PT. CHITRA PARATAMA
OVER TIME RECORD

MONTH    : [tanggal Excel serial / bulan]
Name     : [NAMA KARYAWAN]
SN       : [nomor karyawan]
Department: [nama departemen]
Over time rate/hours: [total jam OT bulan ini]
```

**Struktur Body (per baris = per hari):**
```
Kolom: Date | Day | [Shift From] [Shift To] | [OT From] [OT To] | Total Overtime | WD 1.5x | H 2x | H 2x | H 3x | H 4x | Remarks
```

**Penjelasan Kolom:**
- `Date` — serial date Excel atau kosong jika tidak ada kegiatan
- `Day` — nama hari (Sunday, Monday, dst) atau status (OFF)
- `Shift From/To` — jam kerja reguler (misal: 7–15 atau 15–23 untuk shift sore)
- `OT From/To` — jam mulai dan selesai lembur
- `Total Overtime` — total jam lembur hari itu (bisa desimal)
- `WD 1.5x` — jam lembur weekday (dihitung 1.5x)
- `H 2x/3x/4x` — jam lembur hari libur (dihitung 2x, 3x, atau 4x)
- `Remarks` — keterangan pekerjaan lembur

**Footer:**
```
TOTAL: [total jam OT bulan ini]
```

**Contoh Row Data:**
```
46082 | Sunday | OFF |   | 7 | 15 | 8 |   |   |   |   | Buat PA Report Wk10
46083 | Monday | 7   | 15 | 15 | 16 | 1 | WD |   |   |   |
46095 | Saturday | OFF |  | 7  | 23 | 16 |  |   |   | H |  Public holiday
```

---

### 2.3 File C — `Form Tunjangan / SPL` (Input dari Site, per Karyawan)

**Deskripsi:** Form allowance harian. **1 file bisa berisi banyak sheet**, masing-masing 1 karyawan.

**Struktur Header Sheet:**
```
PT. CHITRA PARATAMA
PAYABLE SITE ALLOWANCE

MONTH     : [bulan]
Name      : [NAMA KARYAWAN]   SN: [nomor karyawan]
Department: [nama departemen]
Section   : [nama seksi]
```

**Struktur Body (per baris = per hari):**
```
Kolom: Date | Day | TUNJANGAN LOKASI KHUSUS | TUNJANGAN PERTAMBANGAN (MSA) | TUNJANGAN MAKAN | Remarks
```

**Penjelasan:**
- Jika hari aktif → semua kolom terisi nominal Rupiah
- Jika `FB` (Fly Back), `CUTI`, dll → kolom kosong atau ada keterangan di Remarks

**Footer:**
```
TOTAL: [total per kolom] | [grand total]
```

---

## 3. ATURAN BISNIS PER SITE

### 3.1 Tabel Rate Tunjangan Per Site

| Kode Site | Nama Site | MSA/hari | Tunjangan Lokasi Khusus/hari | Meals/hari | OT Format | Catatan |
|-----------|-----------|----------|------------------------------|------------|-----------|---------|
| BIB       | Binuang   | 35.000   | —                            | 30.000     | Integer   | LOKAL   |
| MIFA      | MIFA Holing | 35.000 | —                            | —          | Integer   | LOCAL   |
| IPT       | AMM Tabang IPT | 40.000 | —                         | —          | Integer   | —       |
| VALE      | Vale Indonesia | 35.000 | 30.000                    | 60.000     | Desimal   | NORMAL  |
| FMI       | FMI Balikpapan | 40.000 | —                         | —          | Integer   | —       |
| CDE       | CDE        | 35.000   | —                            | —          | Integer   | —       |
| SIS       | SIS        | 30.000   | —                            | 50.000     | Integer   | —       |
| BH        | Batu Hijau | 35.000   | —                            | 50.000     | Integer   | —       |
| KIM       | KIM        | 35.000   | —                            | —          | Integer   | —       |
| MHU       | MHU        | 30.000   | —                            | 50.000     | Integer   | —       |
| NCN       | NCN        | 35.000   | —                            | —          | Integer   | —       |
| TU        | Trakindo Gresik | 30.000 | —                        | 60.000     | Integer   | —       |
| BMB-LEADER| BMB Leader | —        | 40.000                        | 50.000     | Integer   | Leader  |
| BMB-LOCAL | BMB Local  | —        | 30.000                        | 30.000     | Integer   | LOCAL   |
| BPN       | Balikpapan | —        | —                            | —          | Integer   | Office  |

> **Catatan:** Rate di atas adalah default. Sistem harus support override rate dari Form Tunjangan (karena nilai aktual sudah tercantum di form).

### 3.2 Pengelompokan Sheet Output

| Nama Sheet Output | Site yang Termasuk |
|-------------------|--------------------|
| PPA BIB           | BIB (grup PPA)     |
| AMM MIFA          | MIFA               |
| AMM IPT           | IPT                |
| VALE              | VALE               |
| Balikpapan        | BPN, FMI, CDE, SIS |
| CK BIB            | CK BIB (PIT GH + PIT KGB) |
| CK BMB            | BMB (multi-level: Leader, Local) |
| CK DMP & MIFA     | DMP, CK MIFA, Tanjung Api-Api |
| CK KIM            | KIM                |
| CK MHU            | MHU                |
| BHJ & GRESIK      | BH, TU (Trakindo Gresik), NCN |

---

## 4. LOGIKA STATUS HARIAN

### 4.1 Tabel Status dan Pengaruhnya

| Status | Kode | OT Summary | MSA | Meals | TLK | Keterangan |
|--------|------|-----------|-----|-------|-----|------------|
| Hari kerja normal (ada OT) | angka | Jam OT | Rate penuh | Rate penuh | Rate penuh | — |
| Hari kerja normal (tanpa OT) | kosong | kosong | Rate penuh | Rate penuh | Rate penuh | Masih dapat allowance |
| Hari libur (OFF) | `OFF` | `OFF` | — | — | — | Tidak masuk, tidak dapat |
| Fly Back | `FB` | `FB` | `FB` | `FB` | `FB` | Semua allowance = 0 |
| Sakit | `SICK` | `SICK` | Tergantung site | Tergantung site | Tergantung site | Umumnya masih dapat |
| Izin resmi | `IZIN` | `IZIN` | Tergantung site | Tergantung site | Tergantung site | Umumnya masih dapat |
| Alpa | `ALPA` | `ALPA` | Deduct | Deduct | Deduct | Tidak dapat |
| Cuti | `CUTI` | kosong | — | — | — | Tergantung aturan site |
| Libur nasional | `Libur` | tanda khusus | Rate penuh | Rate penuh | Rate penuh | Dihitung H (holiday rate) |
| Standby | `Standby` | 0 | Rate penuh | Rate penuh | Rate penuh | Posisi siaga |
| MCU | `MCU` | kosong | Tergantung site | Tergantung site | Tergantung site | Medical check-up |
| Training | `Training` | tanda khusus | Rate penuh | Rate penuh | Rate penuh | — |
| Pindah site | `[NAMA SITE BARU]` | — | Sesuai site baru | Sesuai site baru | Sesuai site baru | Karyawan pindah di tengah bulan |

### 4.2 Aturan Karyawan Pindah Site

Beberapa karyawan berpindah site di tengah bulan (terlihat di data aktual). Contoh: karyawan BMB pindah ke CK BIB pada tanggal tertentu — di grid tertulis `CK BIB` sebagai nilai sel pada tanggal itu dan seterusnya. Sistem harus:
- Mendeteksi nilai sel yang berisi nama site lain (bukan angka/status normal)
- Menghentikan pencatatan allowance di site asal pada tanggal tersebut
- Tidak menambahkan di site tujuan (karena sudah tercatat di sheet site tujuan)

---

## 5. DESAIN DATABASE

### 5.1 Tabel `sites` — Konfigurasi Site

```sql
CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_code       VARCHAR(20) UNIQUE NOT NULL,   -- 'BIB', 'VALE', 'MHU', dll
  site_name       VARCHAR(100) NOT NULL,          -- 'Binuang', 'Vale Indonesia'
  sheet_group     VARCHAR(100) NOT NULL,          -- nama sheet output, misal 'PPA BIB'
  msa_rate        INTEGER DEFAULT 0,              -- Mine Site Allowance per hari (Rp)
  tlk_rate        INTEGER DEFAULT 0,              -- Tunjangan Lokasi Khusus per hari (Rp)
  meals_rate      INTEGER DEFAULT 0,              -- Tunjangan Makan per hari (Rp)
  ot_format       VARCHAR(10) DEFAULT 'integer',  -- 'integer' atau 'decimal'
  has_msa         BOOLEAN DEFAULT true,
  has_tlk         BOOLEAN DEFAULT false,
  has_meals       BOOLEAN DEFAULT false,
  sick_get_allowance  BOOLEAN DEFAULT true,       -- SICK masih dapat allowance?
  izin_get_allowance  BOOLEAN DEFAULT true,       -- IZIN masih dapat allowance?
  sort_order      INTEGER DEFAULT 0,              -- urutan di file output
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Tabel `employees` — Data Karyawan

```sql
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sn              VARCHAR(20) UNIQUE NOT NULL,    -- Serial Number karyawan
  name            VARCHAR(100) NOT NULL,
  department      VARCHAR(100),
  section         VARCHAR(100),
  site_id         UUID REFERENCES sites(id),      -- site default karyawan
  remark          VARCHAR(50),                    -- 'LOKAL', 'LOCAL', 'NORMAL', 'Leader'
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 5.3 Tabel `import_jobs` — Tracking Import

```sql
CREATE TABLE import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        VARCHAR(20) NOT NULL,           -- 'ot_record' atau 'spl'
  file_name       VARCHAR(255) NOT NULL,
  period_month    INTEGER NOT NULL,               -- 1-12
  period_year     INTEGER NOT NULL,
  site_id         UUID REFERENCES sites(id),
  status          VARCHAR(20) DEFAULT 'pending',  -- 'pending','processing','done','error'
  total_employees INTEGER DEFAULT 0,
  processed       INTEGER DEFAULT 0,
  errors          JSONB,                          -- array of {employee, error}
  uploaded_by     VARCHAR(100),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 5.4 Tabel `ot_records` — Data OT Per Hari Per Karyawan

```sql
CREATE TABLE ot_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id),
  import_job_id   UUID REFERENCES import_jobs(id),
  period_month    INTEGER NOT NULL,
  period_year     INTEGER NOT NULL,
  record_date     DATE NOT NULL,
  shift_start     TIME,                           -- jam masuk shift reguler
  shift_end       TIME,                           -- jam selesai shift reguler
  ot_start        TIME,                           -- jam mulai lembur
  ot_end          TIME,                           -- jam selesai lembur
  ot_hours        DECIMAL(5,2) DEFAULT 0,         -- total jam OT hari ini
  ot_wd_1_5x     DECIMAL(5,2) DEFAULT 0,         -- jam OT weekday 1.5x
  ot_h_2x        DECIMAL(5,2) DEFAULT 0,         -- jam OT holiday 2x
  ot_h_3x        DECIMAL(5,2) DEFAULT 0,
  ot_h_4x        DECIMAL(5,2) DEFAULT 0,
  day_status      VARCHAR(20),                    -- 'OFF', 'FB', 'SICK', 'IZIN', 'ALPA', 'Libur', NULL
  remarks         TEXT,
  raw_value       VARCHAR(50),                    -- nilai asli dari Excel
  UNIQUE(employee_id, period_month, period_year, record_date)
);
```

### 5.5 Tabel `spl_records` — Data Allowance Per Hari Per Karyawan

```sql
CREATE TABLE spl_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id),
  import_job_id   UUID REFERENCES import_jobs(id),
  period_month    INTEGER NOT NULL,
  period_year     INTEGER NOT NULL,
  record_date     DATE NOT NULL,
  msa_amount      INTEGER DEFAULT 0,             -- Tunjangan Pertambangan/MSA
  tlk_amount      INTEGER DEFAULT 0,             -- Tunjangan Lokasi Khusus
  meals_amount    INTEGER DEFAULT 0,             -- Tunjangan Makan
  day_status      VARCHAR(20),                   -- 'FB', 'CUTI', 'SICK', 'IZIN', dll
  remarks         TEXT,
  raw_value       VARCHAR(50),
  UNIQUE(employee_id, period_month, period_year, record_date)
);
```

### 5.6 Tabel `summary_periods` — Lock & Approval

```sql
CREATE TABLE summary_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month    INTEGER NOT NULL,
  period_year     INTEGER NOT NULL,
  status          VARCHAR(20) DEFAULT 'draft',   -- 'draft', 'review', 'approved', 'locked'
  prepared_by     VARCHAR(100),
  acknowledged_by VARCHAR(100),
  approved_by     VARCHAR(100),
  checked_by      VARCHAR(100),
  prepared_at     TIMESTAMP,
  approved_at     TIMESTAMP,
  notes           TEXT,
  UNIQUE(period_month, period_year)
);
```

---

## 6. DESAIN API ENDPOINT

### 6.1 Site Management

```
GET    /api/sites                        → list semua site + config rate
POST   /api/sites                        → tambah site baru
PUT    /api/sites/:id                    → update rate/config site
DELETE /api/sites/:id                    → hapus site
```

### 6.2 Employee Management

```
GET    /api/employees                    → list karyawan (filter by site)
POST   /api/employees                    → tambah karyawan manual
PUT    /api/employees/:id               → update data karyawan
GET    /api/employees/search?sn=xxx     → cari karyawan by SN
POST   /api/employees/bulk-import       → import dari Excel master data
```

### 6.3 Import Management

```
POST   /api/import/ot-record            → upload file OT Record Excel
                                            Body: multipart/form-data
                                            Fields: file, site_id, period_month, period_year

POST   /api/import/spl                  → upload file Form Tunjangan Excel
                                            Body: multipart/form-data  
                                            Fields: file, site_id, period_month, period_year

GET    /api/import/jobs                 → list semua import jobs
GET    /api/import/jobs/:id             → status dan detail satu import job
GET    /api/import/jobs/:id/errors      → list error dari satu import
DELETE /api/import/jobs/:id             → rollback import (hapus records)
```

### 6.4 Records Management (Review & Koreksi)

```
GET    /api/records/ot?month=3&year=2026&site_id=xxx    → list OT records
GET    /api/records/spl?month=3&year=2026&site_id=xxx   → list SPL records
PUT    /api/records/ot/:id              → koreksi satu baris OT record
PUT    /api/records/spl/:id             → koreksi satu baris SPL record
DELETE /api/records/ot/:id              → hapus satu baris
```

### 6.5 Summary Generation

```
GET    /api/summary/preview?month=3&year=2026           → preview data summary
POST   /api/summary/generate?month=3&year=2026          → generate file Excel
GET    /api/summary/download/:period_id                  → download Excel yang sudah digenerate
PUT    /api/summary/approve/:period_id                  → approve summary
```

---

## 7. DESAIN IMPORT ENGINE

### 7.1 Algoritma Baca OT Record

```
FUNCTION importOTRecord(file, site_id, period_month, period_year):

  1. BUKA file Excel (gunakan library openpyxl / SheetJS / xlsx)
  
  2. LOOP setiap sheet dalam workbook:
     a. BACA header:
        - Cari cell yang mengandung "Name of Employee" → ambil value di sebelahnya → nama karyawan
        - Cari cell yang mengandung "SN" → ambil value → serial number
        - Cari cell yang mengandung "MONTH" → parse jadi bulan/tahun
     
     b. IDENTIFIKASI karyawan:
        - Query DB: SELECT * FROM employees WHERE sn = [SN dari header]
        - JIKA tidak ditemukan:
          - Buat employee baru dengan site_id yang dikirim
          - Log sebagai "new employee auto-created"
     
     c. CARI baris data:
        - Cari baris pertama yang kolom pertamanya adalah tanggal valid (Excel serial > 40000)
        - Loop baris sampai ditemukan baris TOTAL
     
     d. PARSE setiap baris:
        - date        = parse Excel serial date → DATE object
        - day_name    = kolom Day (string)
        - shift_start = kolom "From" pertama (shift reguler)
        - shift_end   = kolom "To" pertama
        - ot_start    = kolom "From" kedua (OT)
        - ot_end      = kolom "To" kedua
        - ot_hours    = kolom "Total Overtime"
        - day_status  = deteksi dari day_name:
            JIKA day_name IN ['OFF', 'FB', 'SICK', 'IZIN', 'ALPA'] → set day_status
            JIKA day_name mengandung 'OFF' DAN ada jam OT → day_status='OFF_OT' (hari ke-6/7)
        - remarks     = kolom Remarks
     
     e. SIMPAN ke tabel ot_records
  
  3. UPDATE import_job status = 'done'
  4. RETURN summary: {total_sheets, processed, errors[]}
```

### 7.2 Algoritma Baca Form Tunjangan (SPL)

```
FUNCTION importSPL(file, site_id, period_month, period_year):

  1. BUKA file Excel
  
  2. LOOP setiap sheet:
     a. BACA header: Name, SN, Department, Section
     
     b. IDENTIFIKASI karyawan (sama seperti OT Record)
     
     c. CARI kolom:
        - Kolom "TUNJANGAN LOKASI KHUSUS" → index kolom TLK
        - Kolom "TUNJANGAN PERTAMBANGAN" → index kolom MSA
        - Kolom "TUNJANGAN MAKAN" → index kolom Meals
     
     d. LOOP baris data:
        - date       = parse Excel serial date
        - day_status = deteksi dari nilai kolom:
            JIKA semua kolom kosong DAN remarks mengandung status → set status
            JIKA ada teks non-angka (FB, CUTI, dll) → set day_status
        - msa_amount   = nilai numerik kolom MSA (default 0 jika kosong/status)
        - tlk_amount   = nilai numerik kolom TLK
        - meals_amount = nilai numerik kolom Meals
     
     e. SIMPAN ke tabel spl_records
  
  3. RETURN summary
```

### 7.3 Deteksi Status Sel

```
FUNCTION parseStatus(cell_value):
  IF cell_value is numeric:
    RETURN {type: 'amount', value: cell_value}
  
  value_upper = UPPERCASE(TRIM(cell_value))
  
  SWITCH value_upper:
    CASE 'FB':      RETURN {type: 'status', status: 'FB'}
    CASE 'OFF':     RETURN {type: 'status', status: 'OFF'}
    CASE 'SICK':    RETURN {type: 'status', status: 'SICK'}
    CASE 'IZIN':    RETURN {type: 'status', status: 'IZIN'}
    CASE 'ALPA':    RETURN {type: 'status', status: 'ALPA'}
    CASE 'CUTI':    RETURN {type: 'status', status: 'CUTI'}
    CASE 'LIBUR':   RETURN {type: 'status', status: 'LIBUR'}
    CASE 'MCU':     RETURN {type: 'status', status: 'MCU'}
    CASE 'STANDBY': RETURN {type: 'status', status: 'STANDBY'}
    CASE 'AL':      RETURN {type: 'status', status: 'CUTI'}  -- Annual Leave
    DEFAULT:
      IF value is known site_code → RETURN {type: 'transfer', site: value}
      RETURN {type: 'unknown', raw: cell_value}
```

---

## 8. DESAIN OUTPUT GENERATOR

### 8.1 Algoritma Generate Summary Lemburan

```
FUNCTION generateSummary(period_month, period_year):

  1. AMBIL semua data:
     - sites = query semua site aktif, group by sheet_group
     - ot_records = query by period_month, period_year
     - spl_records = query by period_month, period_year

  2. BUAT workbook Excel baru

  3. LOOP setiap sheet_group:
     a. BUAT sheet baru dengan nama = sheet_group
     
     b. TULIS header sheet (baris kosong, nama perusahaan, dll)
     
     c. TULIS TABEL 1 — OVERTIME SUMMARY:
        - Header row: "OVERTIME SUMMARY {Bulan} {Tahun}"
        - Kolom header: No | Name | SN | LOC | 1 | 2 | ... | 31 | Total | Remark
        - LOOP setiap employee di site group ini:
          - BUAT row baru
          - Kolom 1-31: ambil nilai dari ot_records[employee][date]
            - JIKA ada record: tampilkan ot_hours atau day_status
            - JIKA kosong: tampilkan kosong
          - Kolom Total: SUM semua nilai numerik
     
     d. TULIS TABEL 2 — MSA SUMMARY:
        - Jika site has_msa = true
        - LOOP employee: ambil nilai dari spl_records[employee][date].msa_amount
        - Tampilkan nominal atau status
     
     e. TULIS TABEL 3 — MEALS SUMMARY:
        - Jika site has_meals = true
        - LOOP employee: ambil nilai dari spl_records[employee][date].meals_amount
     
     f. TULIS TABEL 4 — TLK SUMMARY:
        - Jika site has_tlk = true
        - LOOP employee: ambil nilai dari spl_records[employee][date].tlk_amount
     
     g. TULIS footer approval:
        "Prepared: [Nama] | Acknowledged: [Nama] | Approved: [Nama] | Checked: [Nama]"

  4. APPLY formatting:
     - Freeze pane pada baris header dan kolom Name/SN/LOC
     - Border pada seluruh tabel
     - Bold pada header rows
     - Center alignment pada kolom tanggal
     - Warna header (sesuai format asli)
     - Auto-width kolom

  5. SAVE dan RETURN file path
```

### 8.2 Aturan Tampilan Nilai di Grid

| Sumber | Nilai di OT Grid | Nilai di MSA/Meals Grid |
|--------|-----------------|------------------------|
| Ada OT, hari kerja | angka jam (misal: `4`) | nominal (misal: `35000`) |
| Ada OT, hari OFF (H-6) | angka jam | nominal |
| OFF biasa | `OFF` | kosong |
| Fly Back | `FB` | `FB` |
| Sakit | `SICK` | nominal (atau `SICK`) |
| Izin | `IZIN` | nominal (atau `IZIN`) |
| Alpa | `ALPA` | nilai deduct atau kosong |
| Libur nasional kerja | angka jam | nominal |
| Belum masuk periode | kosong | kosong |

---

## 9. DESAIN UI / FRONTEND

### 9.1 Halaman Utama (Dashboard)

```
[Dashboard]
- Summary card: Periode aktif, jumlah site, total karyawan aktif
- Status import bulan ini: OT Record (✓/✗ per site), SPL (✓/✗ per site)
- Tombol quick action: "Import File", "Generate Summary", "Download"
- Recent activity log
```

### 9.2 Halaman Import

```
[Import File]
- Step 1: Pilih tipe file (OT Record / Form Tunjangan)
- Step 2: Pilih Site & Periode (bulan/tahun)
- Step 3: Upload file (drag & drop, multiple file support)
- Step 4: Preview mapping (tampilkan: sheet ditemukan, karyawan terdeteksi, error)
- Step 5: Konfirmasi & Proses
- Status real-time: progress bar per employee
- Log error dengan detail (sheet mana, baris berapa, masalah apa)
```

### 9.3 Halaman Review Data

```
[Review Timesheet]
- Filter: Site | Periode | Karyawan
- Tabel grid kalender: mirip Summary Lemburan
- Klik sel → edit nilai langsung (inline edit)
- Highlight sel yang berbeda dari source (manual override)
- Tombol "Reset ke original" per sel
- Export preview ke Excel sebelum finalisasi
```

### 9.4 Halaman Site Config

```
[Konfigurasi Site]
- Tabel semua site dengan rate
- Tombol edit rate per site (inline edit)
- Toggle: has_msa, has_meals, has_tlk
- Pilih aturan SICK/IZIN (dapat allowance atau tidak)
- Sheet group mapping (site ini masuk ke sheet mana di output)
```

### 9.5 Halaman Generate & Download

```
[Generate Summary]
- Pilih periode
- Checklist site yang akan diinclude
- Preview rekap: total karyawan per site, total jam OT, total tunjangan
- Tombol "Generate Excel"
- Status: Generating... → Done → Download
- History generate sebelumnya
```

---

## 10. TASK LIST LENGKAP UNTUK AI

> **Instruksi untuk AI Developer:**  
> Kerjakan task di bawah ini secara berurutan. Setiap task diberi prioritas (P1=urgent, P2=important, P3=nice-to-have) dan estimasi kompleksitas (S/M/L/XL).

---

### 🏗️ FASE 1 — SETUP & FOUNDATION

- [ ] **TASK-001** `P1` `S`  
  Setup project: inisialisasi repository, struktur folder, dependency (pilih stack: Next.js + Node.js + PostgreSQL ATAU FastAPI + PostgreSQL).  
  Output: project berjalan di localhost dengan health check endpoint.

- [ ] **TASK-002** `P1` `M`  
  Buat file migrasi database untuk semua tabel yang didefinisikan di Section 5.  
  Output: semua tabel terbuat via migration, seed data awal untuk tabel `sites`.

- [ ] **TASK-003** `P1` `M`  
  Seed data `sites` dengan semua site yang sudah diidentifikasi (Section 3.1).  
  Output: 15+ site terkonfigurasi dengan rate yang benar di database.

- [ ] **TASK-004** `P1` `S`  
  Setup authentication sederhana (JWT atau session) untuk akses admin.  
  Output: login/logout endpoint, middleware auth.

---

### 📥 FASE 2 — IMPORT ENGINE

- [ ] **TASK-005** `P1` `XL`  
  Buat fungsi parser **OT Record Excel** (Section 7.1).  
  - Baca setiap sheet → deteksi header (Name, SN, Month)
  - Parse body baris per baris → ekstrak date, shift, OT hours, status
  - Handle semua edge case: tanggal Excel serial, kolom tidak standar, sheet kosong
  - Auto-create employee jika SN belum ada di DB  
  Output: fungsi `parseOTRecord(file_path, site_id, period)` yang mengembalikan array records.

- [ ] **TASK-006** `P1` `XL`  
  Buat fungsi parser **Form Tunjangan / SPL Excel** (Section 7.2).  
  - Baca setiap sheet → deteksi header (Name, SN, Department, Section)
  - Parse body → ekstrak date, TLK amount, MSA amount, Meals amount, status
  - Handle nilai teks (FB, CUTI, SICK) vs nilai numerik  
  Output: fungsi `parseSPL(file_path, site_id, period)` yang mengembalikan array records.

- [ ] **TASK-007** `P1` `M`  
  Buat fungsi `parseStatus(cell_value)` (Section 7.3).  
  - Deteksi semua status: FB, OFF, SICK, IZIN, ALPA, CUTI, Libur, MCU, Standby, AL
  - Deteksi nilai transfer/pindah site
  - Return typed result object  
  Output: unit-tested helper function.

- [ ] **TASK-008** `P1` `L`  
  Buat API endpoint `POST /api/import/ot-record` (Section 6.3).  
  - Terima multipart/form-data: file + site_id + period_month + period_year
  - Buat import_job record
  - Proses async (background job / queue)
  - Return job_id untuk polling status  
  Output: endpoint berjalan, bisa upload file dan lihat hasilnya.

- [ ] **TASK-009** `P1` `L`  
  Buat API endpoint `POST /api/import/spl` (Section 6.3).  
  Sama seperti TASK-008 tapi untuk SPL.  
  Output: endpoint berjalan.

- [ ] **TASK-010** `P1` `M`  
  Buat endpoint polling status import: `GET /api/import/jobs/:id`.  
  - Return: status, progress %, errors, detail per employee  
  Output: bisa track progress import real-time.

- [ ] **TASK-011** `P2` `M`  
  Implementasi rollback import: `DELETE /api/import/jobs/:id`.  
  - Hapus semua records yang dibuat oleh import_job tersebut  
  - Set job status = 'rolled_back'  
  Output: bisa undo import yang salah.

- [ ] **TASK-012** `P2` `M`  
  Buat validasi & conflict detection saat import:
  - Deteksi jika employee SN sama sudah punya data di periode yang sama
  - Tawarkan opsi: skip / replace / merge  
  Output: tidak ada data duplikat tanpa konfirmasi user.

---

### 📊 FASE 3 — OUTPUT GENERATOR

- [ ] **TASK-013** `P1` `XL`  
  Buat fungsi `generateSummaryExcel(period_month, period_year)` (Section 8.1).  
  - Query semua data dari DB
  - Group by sheet_group → site
  - Generate workbook Excel dengan openpyxl (Python) atau ExcelJS (Node.js)
  - Tulis semua tabel: OT Summary, MSA Summary, Meals Summary, TLK Summary
  - Kalender 31 hari, nilai per sel sesuai aturan Section 8.2  
  Output: file Excel yang identik format-nya dengan `SUMMARY_LEMBURAN.xlsx`.

- [ ] **TASK-014** `P1` `L`  
  Implementasi formatting Excel output:
  - Freeze panes (baris header + kolom Name/SN/LOC)
  - Bold pada header rows dan section title
  - Border pada seluruh tabel
  - Center alignment kolom tanggal
  - Auto-width kolom Name dan SN
  - Merge cells untuk judul tabel
  - Footer baris approval (Prepared/Acknowledged/Approved/Checked)  
  Output: file Excel yang rapi dan siap print.

- [ ] **TASK-015** `P1` `M`  
  Buat API endpoint `POST /api/summary/generate` dan `GET /api/summary/download/:id`.  
  Output: bisa generate dan download file lewat API.

- [ ] **TASK-016** `P2` `M`  
  Simpan history file yang sudah di-generate.  
  - Simpan file di storage (local / S3 / Supabase storage)
  - Catat metadata: periode, generated_at, generated_by, file_path  
  Output: bisa download ulang file lama tanpa generate ulang.

---

### 🔍 FASE 4 — REVIEW & KOREKSI

- [ ] **TASK-017** `P1` `L`  
  Buat API untuk review data: `GET /api/records/ot` dan `GET /api/records/spl`.  
  - Filter by site_id, period_month, period_year, employee_id  
  - Return data dalam format grid (per employee, per tanggal)  
  Output: data bisa ditampilkan di UI review.

- [ ] **TASK-018** `P2` `M`  
  Buat API koreksi manual: `PUT /api/records/ot/:id` dan `PUT /api/records/spl/:id`.  
  - Update nilai spesifik satu baris
  - Simpan `original_value` sebelum koreksi
  - Log siapa yang mengkoreksi dan kapan  
  Output: admin bisa perbaiki data tanpa re-import.

- [ ] **TASK-019** `P2` `M`  
  Buat API approval: `PUT /api/summary/approve/:period_id`.  
  - Update field: approved_by, approved_at
  - Lock data (tidak bisa diedit setelah approved)  
  Output: summary bisa dikunci setelah disetujui.

---

### 🖥️ FASE 5 — FRONTEND UI

- [ ] **TASK-020** `P1` `L`  
  Buat halaman **Dashboard** (Section 9.1).  
  - Status import per site per bulan (checklist)
  - Tombol quick action  
  Output: halaman utama yang informatif.

- [ ] **TASK-021** `P1` `XL`  
  Buat halaman **Import File** (Section 9.2).  
  - Wizard step-by-step: pilih tipe → pilih site & periode → upload → preview → konfirmasi
  - Drag & drop file upload
  - Preview hasil parsing sebelum simpan ke DB
  - Tampilkan error dengan detail (sheet X, baris Y, masalah Z)
  - Progress bar saat processing  
  Output: UI import yang user-friendly.

- [ ] **TASK-022** `P2` `XL`  
  Buat halaman **Review Timesheet** (Section 9.3).  
  - Tampilkan grid kalender mirip Summary Lemburan
  - Filter by site dan periode
  - Klik sel untuk edit inline
  - Highlight perubahan manual  
  Output: admin bisa review dan koreksi data.

- [ ] **TASK-023** `P2` `M`  
  Buat halaman **Site Configuration** (Section 9.4).  
  - CRUD site dengan rate
  - Toggle features (has_msa, has_meals, has_tlk)
  - Preview kalkulasi dengan rate baru  
  Output: admin bisa update konfigurasi site tanpa coding.

- [ ] **TASK-024** `P2` `L`  
  Buat halaman **Generate & Download** (Section 9.5).  
  - Pilih periode dan site
  - Preview rekap sebelum generate
  - Generate dan download Excel  
  Output: one-click generate Summary Lemburan.

---

### ⚙️ FASE 6 — FITUR TAMBAHAN

- [ ] **TASK-025** `P2` `M`  
  **Employee auto-detection improvement:**  
  Saat import dan SN tidak ditemukan, sistem harus:
  - Coba match by nama (fuzzy matching untuk typo)
  - Tampilkan daftar kandidat untuk konfirmasi user
  - Bisa assign ke employee yang sudah ada atau buat baru  
  Output: tidak ada duplicate employee karena typo nama.

- [ ] **TASK-026** `P2` `L`  
  **Validasi business rule:**  
  - Cek total OT hours di record vs total di header file (harus sama)
  - Cek tidak ada gap tanggal yang aneh
  - Warning jika karyawan tidak ada di SPL tapi ada di OT (atau sebaliknya)  
  Output: import warnings yang membantu admin mendeteksi file yang tidak lengkap.

- [ ] **TASK-027** `P2` `M`  
  **Export rekap per karyawan:**  
  Generate slip rincian per karyawan (OT hours breakdown + total allowance) dalam format PDF atau Excel.  
  Output: bisa export per karyawan untuk arsip atau konfirmasi.

- [ ] **TASK-028** `P3` `M`  
  **Dashboard analytics:**  
  - Total jam OT per site per bulan (chart)
  - Tren tunjangan per site (line chart)
  - Karyawan dengan OT tertinggi  
  Output: insight data untuk manajemen.

- [ ] **TASK-029** `P3` `L`  
  **Notifikasi & reminder:**  
  - Reminder via email/WhatsApp jika site belum submit OT Record menjelang cut-off
  - Notifikasi ke admin pusat jika ada import baru  
  Output: tidak ada site yang terlewat submit.

- [ ] **TASK-030** `P3` `S`  
  **Audit trail:**  
  - Log semua perubahan: siapa, kapan, mengubah apa, dari nilai apa ke nilai apa  
  Output: traceable untuk audit internal.

---

### 🧪 FASE 7 — TESTING

- [ ] **TASK-031** `P1` `L`  
  **Unit test parser OT Record:**  
  - Test dengan berbagai variasi format Excel yang ada (VALE decimal, BIB integer)  
  - Test semua edge case status (OFF, FB, SICK, transfer site)  
  Output: coverage >80% untuk parser functions.

- [ ] **TASK-032** `P1` `L`  
  **Unit test parser SPL:**  
  - Test nominal vs status, test kolom yang berbeda urutan  
  Output: coverage >80% untuk parser functions.

- [ ] **TASK-033** `P1` `M`  
  **Integration test generate summary:**  
  - Import sample file → generate → validasi output Excel sesuai expected  
  Output: end-to-end test passing.

- [ ] **TASK-034** `P2` `M`  
  **User acceptance test:**  
  - Gunakan file Excel bulan Maret 2026 (yang sudah ada) sebagai test case  
  - Import semua file → generate → compare dengan Summary Lemburan asli  
  - Harus identik 100%  
  Output: sistem terbukti menghasilkan output yang sama dengan proses manual.

---

## 11. CONTOH DATA REFERENSI

### 11.1 Contoh OT Record (1 Karyawan, Maret 2026)

```
Karyawan: HARNI HAMDAN | SN: 73752 | Site: VALE | Total OT: 107.5 jam

Tanggal | Hari       | Shift     | OT       | Total OT | Status
--------|------------|-----------|----------|----------|--------
1 Mar   | Sunday     | OFF       | 07:00-15 | 8 jam    | H-6 (hari libur kerja)
2 Mar   | Monday     | 07-15     | 15-16    | 1 jam    | WD 1.5x
5 Mar   | Wednesday  | 07-15     | -        | 0        | IJIN
6 Mar   | Thursday   | 07-15     | 15-19    | 4 jam    | WD 1.5x
14 Mar  | Saturday   | OFF       | 07-19:30 | 12.5 jam | H (hari libur penuh)
19 Mar  | Thursday   | 07-15     | 07-20    | 13 jam   | Public Holiday
```

### 11.2 Contoh SPL Record (1 Karyawan, Maret 2026)

```
Karyawan: ANDIKA SEPTIADI | SN: 50193 | Site: VALE

Tanggal | Hari       | TLK    | MSA    | Meals  | Status
--------|------------|--------|--------|--------|--------
1 Mar   | Sunday     | 35.000 | 40.000 | 60.000 | Aktif
2 Mar   | Monday     | 35.000 | 40.000 | 60.000 | Aktif
...
31 Mar  | Tuesday    | 35.000 | 40.000 | 60.000 | Aktif
        | TOTAL      |1.085K  |1.240K  |1.860K  |
```

### 11.3 Contoh Output Summary Grid (VALE, Maret 2026 — OT Summary)

```
No | Name            | SN    | LOC  |  1  |  2  |  3  | ... | 14   | ... | 19  | ... | Total | Remark
1  | Fadel Muhammad  | 73759 | VALE | OFF |  5  |     | ... | 16.5 | ... | 12.5| ... |  124  | NORMAL
2  | ERWIN           | 73750 | VALE |     |     |  8  | ... |      | ... |     | ... | 69.5  | NORMAL
```

### 11.4 Kode Status Standar

```javascript
const STATUS_CODES = {
  'FB'       : { label: 'Fly Back',          allowance: false, ot_display: 'FB'   },
  'OFF'      : { label: 'Hari Libur',         allowance: false, ot_display: 'OFF'  },
  'SICK'     : { label: 'Sakit',              allowance: true,  ot_display: 'SICK' },
  'IZIN'     : { label: 'Izin',               allowance: true,  ot_display: 'IZIN' },
  'ALPA'     : { label: 'Tidak Hadir',        allowance: false, ot_display: 'ALPA' },
  'CUTI'     : { label: 'Cuti',               allowance: false, ot_display: ''     },
  'AL'       : { label: 'Annual Leave',       allowance: false, ot_display: ''     },
  'LIBUR'    : { label: 'Libur Nasional',     allowance: true,  ot_display: 'Libur'},
  'MCU'      : { label: 'Medical Check-Up',   allowance: true,  ot_display: ''     },
  'STANDBY'  : { label: 'Standby',            allowance: true,  ot_display: '0'    },
  'TRAINING' : { label: 'Training',           allowance: true,  ot_display: 'Training'},
};
```

---

## 📎 CATATAN PENTING UNTUK AI DEVELOPER

1. **Prioritaskan kompatibilitas format Excel.** File input dari site mungkin tidak selalu konsisten. Parser harus robust terhadap variasi: kolom yang bergeser, baris header yang berbeda posisi, sheet kosong, dan merge cells.

2. **Gunakan SN (Serial Number) sebagai primary key identifikasi karyawan.** Nama karyawan sering ada typo atau variasi penulisan, tapi SN relatif konsisten.

3. **Jangan hardcode rate tunjangan.** Semua rate harus dari tabel `sites` di database. Admin harus bisa mengubah rate tanpa deploy ulang.

4. **Output Excel harus identik format dengan template asli.** Gunakan file `SUMMARY_LEMBURAN.xlsx` sebagai referensi visual untuk styling, layout, urutan tabel, dan footer approval.

5. **Handle karyawan yang pindah site di tengah bulan.** Nilai sel yang berisi nama site lain (bukan angka/status) berarti karyawan pindah — hentikan pencatatan di site asal mulai tanggal itu.

6. **Angka OT VALE menggunakan desimal** (4.5, 12.5, 16). Site lain menggunakan integer. Sistem harus mendukung keduanya.

7. **File yang dikirim site bisa berisi banyak karyawan dalam satu workbook (multi-sheet).** Satu upload bisa berisi 30+ sheet.

8. **Validasi selalu: total OT di footer harus sama dengan sum baris.** Jika berbeda, beri warning kepada admin.

---

*Dokumen ini di-generate dari analisis file Excel aktual PT. Chitra Paratama.*  
*Last updated: Mei 2026*
