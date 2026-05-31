# PRD — Aplikasi Safety Dashboard
**Sistem Pelaporan & Monitoring K3 Berbasis Web**
Versi 1.0 | Mei 2026

---

## Ringkasan Eksekutif

Aplikasi Safety Dashboard adalah sistem berbasis web untuk mencatat, memonitor, dan menganalisis data keselamatan kerja (K3) secara real-time. Aplikasi ini menggantikan proses pencatatan manual berbasis spreadsheet dan menyediakan dashboard visual yang dapat diakses oleh seluruh pemangku kepentingan.

**Tujuan utama:**
- Mempercepat pelaporan insiden dan observasi keselamatan
- Menyediakan visibilitas data K3 secara real-time melalui grafik dan KPI
- Memastikan kepatuhan terhadap standar keselamatan perusahaan
- Mendukung analisis tren dan pengambilan keputusan berbasis data

---

## Modul Aplikasi

| No. | Modul | Deskripsi |
|-----|-------|-----------|
| M-01 | Form Input Data | Form pelaporan insiden, observasi, dan aktivitas K3 |
| M-02 | Manajemen Data (Tabel) | Tampilan, filter, dan kelola seluruh record K3 |
| M-03 | Dashboard & Grafik | Visualisasi KPI, tren, dan perbandingan data K3 |
| M-04 | Manajemen Pengguna | Role, akses, dan autentikasi pengguna |
| M-05 | Laporan & Ekspor | Generate laporan PDF/Excel dan ekspor data |

---

## Fitur 1 — Kolom & Struktur Data

### 1.1 Data Insiden / Incident Report

| Nama Kolom | Tipe Data | Keterangan | Validasi |
|---|---|---|---|
| ID Insiden | Auto-increment | Nomor unik insiden | System-generated |
| Tanggal Kejadian | Date | Tanggal insiden terjadi | Required, <= today |
| Jam Kejadian | Time | Waktu insiden terjadi | Required, format HH:mm |
| Lokasi / Area | Dropdown | Area/departemen kejadian | Required |
| Nama Pekerja | Text | Nama korban/terlibat | Required, max 100 char |
| NIK / ID Karyawan | Text | Nomor identitas karyawan | Format alphanumeric |
| Departemen | Dropdown | Unit kerja karyawan | Required |
| Jenis Insiden | Dropdown | Near Miss / First Aid / LTI / Fatality | Required |
| Klasifikasi Bahaya | Dropdown | Mekanik / Kimia / Ergonomi / Lainnya | Required |
| Deskripsi Kejadian | Textarea | Kronologis insiden secara detail | Required, min 50 char |
| Penyebab Langsung | Textarea | Immediate cause of incident | Optional |
| Penyebab Dasar | Textarea | Root cause analysis | Optional |
| Tindakan Perbaikan | Textarea | Corrective action plan | Optional |
| PIC Perbaikan | Dropdown / Text | Penanggung jawab tindakan | Optional |
| Target Selesai | Date | Deadline tindakan perbaikan | >= tanggal kejadian |
| Status | Dropdown | Open / In Progress / Closed | Required |
| Foto / Bukti | File Upload | Foto kejadian atau dokumen pendukung | JPEG/PNG/PDF, max 5MB |
| Dilaporkan Oleh | Text (auto-fill) | User yang membuat laporan | Auto from session |
| Tanggal Dibuat | Datetime (auto) | Timestamp pembuatan record | System-generated |

---

### 1.2 Data Observasi K3 / Safety Observation

| Nama Kolom | Tipe Data | Keterangan | Validasi |
|---|---|---|---|
| ID Observasi | Auto-increment | Nomor unik observasi | System-generated |
| Tanggal Observasi | Date | Tanggal dilakukan observasi | Required |
| Pengamat (Observer) | Text (auto-fill) | Nama orang yang melakukan observasi | Auto from session |
| Area Observasi | Dropdown | Lokasi observasi dilakukan | Required |
| Jenis Temuan | Dropdown | Unsafe Act / Unsafe Condition / Positif | Required |
| Deskripsi Temuan | Textarea | Detail temuan observasi | Required |
| Tingkat Risiko | Dropdown | Low / Medium / High / Critical | Required |
| Foto Temuan | File Upload | Bukti foto kondisi | Optional, JPEG/PNG |
| Rekomendasi | Textarea | Saran perbaikan | Optional |
| Status Tindak Lanjut | Dropdown | Open / In Progress / Closed | Default: Open |

---

### 1.3 Data Inspeksi & Patrol

| Nama Kolom | Tipe Data | Keterangan | Validasi |
|---|---|---|---|
| ID Inspeksi | Auto-increment | Nomor unik inspeksi | System-generated |
| Tanggal Inspeksi | Date | Tanggal pelaksanaan | Required |
| Jenis Inspeksi | Dropdown | Rutin / Khusus / Patrol | Required |
| PIC Inspeksi | Text | Pelaksana inspeksi | Required |
| Area / Objek | Dropdown | Lokasi/objek yang diinspeksi | Required |
| Checklist Item | Multi-checkbox | Poin-poin pemeriksaan | Min 1 item checked |
| Skor Kepatuhan (%) | Number (auto) | Persentase kepatuhan checklist | 0–100, auto-calc |
| Temuan | Textarea | Catatan temuan inspeksi | Optional |
| Tindakan Korektif | Textarea | Rencana perbaikan temuan | Optional |

---

### 1.4 Data Pelatihan K3 / Safety Training

| Nama Kolom | Tipe Data | Keterangan | Validasi |
|---|---|---|---|
| ID Pelatihan | Auto-increment | Nomor unik pelatihan | System-generated |
| Nama Pelatihan | Text | Judul/nama program pelatihan | Required, max 200 char |
| Tanggal Pelatihan | Date | Tanggal pelaksanaan | Required |
| Instruktur | Text | Nama trainer/fasilitator | Required |
| Peserta (Jumlah) | Number | Total peserta hadir | Required, > 0 |
| Departemen Peserta | Multi-select | Unit kerja peserta pelatihan | Required |
| Durasi (Jam) | Number | Lama waktu pelatihan | Required, > 0 |
| Total Manhours | Number (auto) | Peserta × Durasi | Auto-calculated |
| Dokumen/Materi | File Upload | Modul / sertifikat pelatihan | PDF/DOCX, max 10MB |

---

## Fitur 2 — Form Input

### 2.1 Form Laporan Insiden

**Tujuan:** Mencatat insiden kecelakaan kerja secara cepat dan terstruktur.

**Komponen Form:**
- **Section 1 — Informasi Dasar:** tanggal, jam, lokasi, nama pekerja, NIK, departemen
- **Section 2 — Detail Insiden:** jenis insiden, klasifikasi bahaya, deskripsi kronologis
- **Section 3 — Analisis Penyebab:** penyebab langsung, penyebab dasar (root cause)
- **Section 4 — Tindakan Perbaikan:** deskripsi corrective action, PIC, target tanggal selesai
- **Section 5 — Lampiran:** upload foto atau dokumen pendukung (max 5 file)

**Aturan Bisnis:**
- Semua field required di Section 1–2 harus terisi sebelum submit
- Tombol simpan muncul hanya setelah validasi lolos
- Setelah submit, sistem mengirim notifikasi ke Supervisor terkait
- User dapat menyimpan sebagai draft dan melanjutkan nanti

---

### 2.2 Form Observasi K3

**Tujuan:** Merekam temuan unsafe act dan unsafe condition dari lapangan.

**Komponen Form:**
- Tanggal, area observasi, jenis temuan (Unsafe Act / Unsafe Condition / Positif)
- Deskripsi temuan dengan field teks bebas
- Tingkat risiko: Low / Medium / High / Critical
- Upload foto (opsional)
- Rekomendasi tindak lanjut

**Fitur Khusus:**
- Tombol **Quick Capture** untuk pelaporan cepat dari mobile (minimal field)
- Geolocation otomatis untuk mengisi field area jika diakses via mobile

---

### 2.3 Form Inspeksi & Checklist

**Tujuan:** Memandu petugas inspeksi melalui checklist terstruktur di lapangan.

**Komponen Form:**
- Header inspeksi: tanggal, jenis, PIC, area
- Checklist dinamis: daftar item pemeriksaan per kategori (APD, Mesin, Lingkungan, dll.)
  - Setiap item: pilihan OK / Not OK / N/A
  - Catatan untuk item Not OK wajib diisi
- Skor kepatuhan dihitung otomatis: `(jumlah OK / total applicable) × 100%`
- Field temuan dan tindakan korektif di bagian bawah

**Fitur Khusus:**
- Template checklist dapat dikonfigurasi per area/jenis inspeksi oleh Admin
- Mendukung mode offline: data tersimpan lokal lalu sync saat terhubung internet

---

### 2.4 Form Pelatihan K3

**Tujuan:** Mencatat realisasi pelatihan K3 beserta peserta dan jam pelatihan.

**Komponen Form:**
- Nama pelatihan, tanggal, instruktur, lokasi pelatihan
- Input peserta: manual entry atau import dari file Excel
- Durasi pelatihan (jam) — manhours dihitung otomatis
- Upload dokumen materi atau daftar hadir

**Fitur Khusus:**
- Auto-kalkulasi Safety Training Manhours (`Peserta × Durasi`)
- Rekap peserta per departemen ditampilkan real-time saat input

---

## Fitur 3 — Dashboard & Grafik

### 3.1 KPI Cards (Summary Metrics)

Ditampilkan di bagian atas dashboard sebagai ringkasan angka kunci.

| KPI | Definisi | Target / Acuan |
|-----|----------|----------------|
| LTIFR | Lost Time Injury Frequency Rate | < 0.5 per juta manhours |
| TRIFR | Total Recordable Injury Frequency Rate | < 2.0 per juta manhours |
| Near Miss | Total near miss dilaporkan bulan ini | Semakin tinggi = lebih baik (proaktif) |
| Safe Man Hours | Jam kerja tanpa LTI | Kumulatif YTD |
| Training Manhours | Total jam pelatihan K3 | Target per bulan |
| Kepatuhan Inspeksi | % skor rata-rata hasil inspeksi | >= 85% |
| Open Action Items | Jumlah corrective action belum selesai | 0 (target selesai semua) |

---

### 3.2 Grafik Tren Insiden

#### Line Chart — Tren Insiden Bulanan
- Sumbu X: Bulan (Jan–Des)
- Sumbu Y: Jumlah insiden
- Multiple series: Near Miss, First Aid, LTI — masing-masing warna berbeda
- Tooltip interaktif: klik titik data untuk melihat daftar insiden pada bulan tersebut
- Filter: Year (dropdown), Area (multi-select)

#### Bar Chart — Insiden per Departemen
- Sumbu X: Nama departemen
- Sumbu Y: Jumlah insiden
- Grouped atau stacked berdasarkan jenis insiden
- Mendukung perbandingan periode (bulan ini vs bulan lalu)

#### Pie / Donut Chart — Distribusi Jenis Insiden
- Segmen: Near Miss, First Aid, Medical Treatment, LTI, Fatality
- Label persentase di setiap segmen
- Klik segmen untuk drill-down ke tabel data terkait

---

### 3.3 Grafik Observasi K3

#### Bar Chart — Observasi per Bulan per Jenis Temuan
- Menampilkan volume Unsafe Act vs Unsafe Condition vs Temuan Positif
- Target bulanan ditampilkan sebagai garis horizontal (reference line)

#### Heatmap — Distribusi Risiko per Area
- Matrix: baris = area/lokasi, kolom = tingkat risiko (Low/Medium/High/Critical)
- Warna sel: hijau (Low) hingga merah (Critical)
- Memudahkan identifikasi area dengan risiko tertinggi

---

### 3.4 Grafik Inspeksi

#### Line Chart — Tren Skor Kepatuhan Inspeksi
- Rata-rata skor kepatuhan per bulan dari semua inspeksi
- Garis target (misal: 85%) ditampilkan sebagai referensi
- Filter per area dan jenis inspeksi

#### Gauge Chart — Skor Kepatuhan Bulan Ini
- Visual gauge (speedometer) dengan zona: Merah <60%, Kuning 60–84%, Hijau ≥85%
- Angka besar di tengah: skor rata-rata bulan ini

---

### 3.5 Grafik Pelatihan K3

#### Bar Chart — Realisasi vs Target Training Manhours
- Grouped bar per bulan: Realisasi (biru) vs Target (abu-abu)
- Persentase pencapaian di atas masing-masing bar

#### Horizontal Bar — Training Manhours per Departemen
- Ranking departemen berdasarkan total manhours pelatihan
- Highlight warna untuk departemen di bawah target

---

### 3.6 Grafik Action Item & Follow-up

#### Stacked Bar — Status Action Items per Bulan
- Stack: Open (merah), In Progress (kuning), Closed (hijau)
- Tren penyelesaian action items dari waktu ke waktu

#### Tabel Action Items Overdue
- Daftar corrective actions yang melewati target tanggal selesai
- Kolom: ID, Insiden terkait, Deskripsi, PIC, Target, Hari Keterlambatan
- Sort by: paling lama overdue di atas
- Tombol: kirim reminder ke PIC via email/notifikasi

---

### 3.7 Filter & Interaksi Dashboard

| Filter | Opsi | Berlaku Pada |
|--------|------|--------------|
| Periode Waktu | Minggu ini / Bulan ini / Kuartal / Custom range | Semua grafik |
| Tahun | Dropdown (2022 – sekarang) | Semua grafik |
| Area / Lokasi | Multi-select dropdown | Insiden, Observasi, Inspeksi |
| Departemen | Multi-select dropdown | Insiden, Pelatihan |
| Jenis Insiden | Checkbox: Near Miss, FA, LTI, dll. | Grafik insiden |
| Status Action Item | Open / In Progress / Closed / All | Action item widget |

**Fitur interaksi tambahan:**
- Drill-down: klik grafik untuk melihat data detail di tabel bawahnya
- Export grafik: tombol unduh grafik sebagai PNG atau PDF
- Refresh data: tombol manual refresh + auto-refresh setiap 5 menit
- Fullscreen mode: tampilkan grafik secara penuh layar untuk presentasi

---

## Fitur 4 — Manajemen Pengguna & Role

| Role | Level Akses | Hak Akses |
|------|-------------|-----------|
| Super Admin | Full Access | CRUD semua data, konfigurasi sistem, manajemen user, semua laporan |
| Safety Officer | Manage | CRUD insiden, observasi, inspeksi, pelatihan; lihat semua dashboard |
| Supervisor | Approve + View | Lihat laporan departemennya, approve/reject corrective action, view dashboard |
| Karyawan / User | Submit Only | Submit form observasi dan near miss; lihat status laporan sendiri |
| Viewer / Manajemen | Read Only | Lihat seluruh dashboard dan laporan, tidak bisa edit data |

---

## Fitur 5 — Laporan & Ekspor

### 5.1 Generate Laporan
- **Laporan Bulanan K3:** rangkuman semua insiden, observasi, inspeksi, dan pelatihan dalam satu bulan
- **Laporan Insiden Individual:** detail satu insiden lengkap dengan analisis dan action plan
- **Laporan Tren Tahunan:** perbandingan statistik YoY per kategori
- **Laporan Kepatuhan Inspeksi:** rekap skor semua inspeksi per area dalam periode tertentu

### 5.2 Format Ekspor
- **PDF:** laporan formal siap cetak dengan logo perusahaan dan format resmi
- **Excel (.xlsx):** data mentah untuk analisis lebih lanjut, termasuk semua kolom
- **CSV:** ekspor data untuk integrasi dengan sistem lain

### 5.3 Jadwal Laporan Otomatis
- Konfigurasi pengiriman laporan otomatis via email ke penerima yang ditentukan
- Frekuensi: harian / mingguan / bulanan
- Format laporan yang dikirim dapat dikustomisasi per penerima

---

## Non-Functional Requirements

| Aspek | Requirement |
|-------|-------------|
| Performance | Halaman dashboard load <= 3 detik; API response <= 1 detik untuk query standar |
| Responsive Design | Mendukung desktop (1920×1080), tablet (768px), dan mobile (375px) |
| Security | HTTPS, JWT authentication, role-based access control, audit log semua perubahan data |
| Availability | Uptime target 99.5%; maintenance window di luar jam kerja |
| Backup Data | Backup otomatis harian; retensi 1 tahun |
| Browser Support | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ |
| Aksesibilitas | Mendukung keyboard navigation dan kontras warna WCAG AA |

---

## Prioritas & Roadmap

| Fase | Fitur | Prioritas | Estimasi |
|------|-------|-----------|----------|
| Fase 1 (MVP) | Form Insiden + Tabel Data + KPI Cards | P0 — Critical | 6 minggu |
| Fase 1 (MVP) | Autentikasi & Role Management | P0 — Critical | 2 minggu |
| Fase 2 | Form Observasi + Dashboard Grafik Lengkap | P1 — High | 4 minggu |
| Fase 2 | Form Inspeksi + Checklist Dinamis | P1 — High | 3 minggu |
| Fase 3 | Form Pelatihan + Training Dashboard | P2 — Medium | 3 minggu |
| Fase 3 | Laporan & Ekspor PDF/Excel | P2 — Medium | 2 minggu |
| Fase 4 | Notifikasi Email + Jadwal Laporan Otomatis | P3 — Nice-to-have | 2 minggu |
| Fase 4 | Mode Offline (PWA) untuk Form | P3 — Nice-to-have | 3 minggu |

---

*PRD Safety Dashboard v1.0 — PT Chitra Paratama*
