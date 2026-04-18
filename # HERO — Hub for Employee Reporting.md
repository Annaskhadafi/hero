# HERO — Hub for Employee Reporting & Operations
## Product Requirements Document — Addendum
### Fitur: Daily Activity System
**Versi:** v1.0 Addendum — Mei 2026
**Status:** Draft untuk Review Internal
**Perusahaan:** PT Chitra Paratama
**Platform:** hero.chitraparatama.com


---

## 1. Executive Summary

Dokumen ini merupakan addendum spesifikasi fitur dari PRD HERO v1.0, yang secara khusus merinci desain, logika bisnis, dan persyaratan teknis untuk **Daily Activity System** — sebuah modul pencatatan aktivitas harian karyawan berbasis poin yang dirancang untuk mendorong disiplin pelaporan, transparansi operasional, dan budaya kerja berbasis data di seluruh site PT Chitra Paratama.

Daily Activity System adalah evolusi dari M1 (Activity Hub) dan M5 (HERO Points & Leveling) yang sudah didefinisikan sebelumnya. Fitur ini mengintegrasikan manajemen aktivitas, alur persetujuan atasan, dan mekanisme gamifikasi poin secara lebih granular dan fleksibel.

### 1.1 Visi Fitur

> **"Setiap hari kerja tercatat, setiap kontribusi terukur, setiap penyimpangan terdokumentasi."**
>
> Daily Activity System memastikan bahwa tidak ada satu pun hari kerja karyawan yang berlalu tanpa rekam jejak digital yang akurat, terverifikasi, dan bermakna bagi individu maupun organisasi.

### 1.2 Masalah yang Diselesaikan

| No | Masalah Saat Ini | Solusi Daily Activity System |
|----|-----------------|------------------------------|
| 1 | Karyawan tidak melapor aktivitas harian secara konsisten | Sistem poin reward & penalty yang memotivasi laporan harian |
| 2 | Atasan tidak bisa memantau kontribusi riil anggota tim per hari | Dashboard aktivitas harian per individu, real-time |
| 3 | Aktivitas yang tidak ada di master list tidak bisa dicatat | Karyawan bisa input custom activity, diapprove atasan |
| 4 | Tidak ada standar aktivitas yang terdefinisi per departemen | Section Head mengelola master library aktivitas departemen |
| 5 | Pengurangan poin karena pelanggaran tidak otomatis & tidak transparan | Sistem penalty otomatis dengan audit trail yang jelas |
| 6 | Karyawan tidak tahu kenapa poin mereka bertambah atau berkurang | Log poin detail per transaksi, real-time notifikasi WA |

---

## 2. Scope & Aktor Sistem

### 2.1 Definisi Aktor

| Aktor | Role dalam HERO | Peran dalam Daily Activity |
|-------|----------------|---------------------------|
| Karyawan / Teknisi | Technician, HSE Officer | Input aktivitas harian, lihat poin pribadi, ajukan custom activity |
| Foreman / Leader | Supervisor — site | Buat Job List harian, assign aktivitas ke anggota tim, approve aktivitas tim |
| Section Head | Admin — departemen | Kelola master library aktivitas departemen, set bobot poin, konfigurasi kategori |
| PJO | Manager — site | Approval level 2, lihat dashboard produktivitas site, override poin bila perlu |
| HC / HR Pusat | Admin — all sites | Konfigurasi global penalty & reward, laporan produktivitas bulanan |
| Super Admin | Full access | Konfigurasi seluruh sistem, audit log, override data |

### 2.2 Boundary Sistem

- **Mencakup:** input aktivitas harian, manajemen master library aktivitas, approval workflow, kalkulasi poin (reward + penalty), notifikasi, dan dashboard aktivitas.
- **Tidak mencakup:** kalkulasi timesheet/lembur (M3), pembuatan daily report ke customer (M4), atau manajemen sertifikat training (M7). Namun data Daily Activity menjadi sumber data bagi modul-modul tersebut.

---

## 3. Fitur Utama & Deskripsi Fungsional

### 3.1 Master Activity Library (Dikelola Section Head)

Section Head adalah pemilik (owner) dari daftar aktivitas resmi yang berlaku di departemennya. Setiap aktivitas dalam library memiliki atribut lengkap yang menentukan bagaimana aktivitas tersebut dinilai, divalidasi, dan ditampilkan kepada karyawan.

#### 3.1.1 Atribut Master Activity

| Field | Tipe Data | Keterangan |
|-------|-----------|-----------|
| `activity_code` | String (unik) | Kode unik per aktivitas, contoh: TS-001, HSE-003 |
| `activity_name` | String | Nama aktivitas yang tampil ke karyawan |
| `category` | Enum | Kategori: Technical, HSE, Administrative, Training, Wellness, Standby |
| `department` | FK → departments | Departemen pemilik aktivitas (CS, HSE, Training, Wellness) |
| `base_points` | Integer | Poin dasar yang diberikan saat aktivitas selesai & diapprove |
| `complexity_level` | Enum (1–5) | Level kesulitan: 1 = Mudah, 5 = Sangat Kompleks |
| `requires_photo` | Boolean | Wajib upload foto dokumentasi |
| `requires_equipment_no` | Boolean | Wajib isi nomor unit / equipment |
| `requires_duration` | Boolean | Wajib isi durasi pengerjaan (menit) |
| `requires_location_gps` | Boolean | Wajib verifikasi GPS saat submit |
| `requires_material_used` | Boolean | Wajib isi material / parts yang digunakan |
| `max_daily_count` | Integer | Batas maksimum aktivitas ini bisa diinput per hari per karyawan |
| `max_points_per_day` | Integer | Batas maksimum poin dari aktivitas ini per hari |
| `is_assignable` | Boolean | Bisa di-assign oleh atasan ke bawahan |
| `is_self_input` | Boolean | Bisa diinput sendiri oleh karyawan tanpa di-assign |
| `approval_required` | Boolean | Apakah memerlukan approval atasan sebelum poin diberikan |
| `auto_approve_if_gps_valid` | Boolean | Auto-approve jika GPS valid (tanpa review manual atasan) |
| `sla_hours` | Integer | Batas waktu input sejak aktivitas selesai (dalam jam) |
| `is_active` | Boolean | Status aktif/nonaktif aktivitas di library |
| `created_by` | FK → users | Section Head yang membuat/mengelola aktivitas ini |
| `created_at / updated_at` | Timestamp | Audit timestamp |

#### 3.1.2 Hak Akses Manajemen Library

| Aksi | Section Head Dept Sendiri | HC / Super Admin |
|------|--------------------------|-----------------|
| Tambah aktivitas baru | ✓ | ✓ |
| Edit aktivitas (nama, poin, atribut) | ✓ | ✓ |
| Nonaktifkan aktivitas | ✓ | ✓ |
| Lihat aktivitas departemen lain | ✗ (read-only) | ✓ |
| Set global default penalty rules | ✗ | ✓ |
| Override poin aktivitas individual karyawan | ✗ | ✓ (dengan alasan) |

> **Catatan Penting — Perubahan Library Aktivitas**
> - Setiap perubahan pada master activity library dicatat dalam audit log lengkap (siapa, kapan, field apa yang diubah, nilai lama vs baru).
> - Jika `base_points` sebuah aktivitas diubah, poin aktivitas yang sudah diapprove sebelumnya **TIDAK berubah retroaktif**.
> - Aktivitas yang dinonaktifkan masih tetap tampil di histori karyawan yang sudah pernah menginputnya.

---

### 3.2 Input Aktivitas oleh Karyawan

Karyawan mengakses Daily Activity melalui HP Android mereka via browser (PWA). Antarmuka dirancang untuk bisa dioperasikan dengan satu tangan dalam kondisi lapangan.

#### 3.2.1 Dua Mode Input Aktivitas

| Mode | Deskripsi | Siapa yang Memulai | Perlu Approval |
|------|-----------|--------------------|----------------|
| **Assigned Activity** | Aktivitas yang di-assign oleh Foreman/Section Head ke karyawan. Sudah muncul di Job List karyawan sejak pagi. | Foreman / Section Head | Ya — Level 1 wajib |
| **Self-Input Activity** | Karyawan memilih sendiri dari master library aktivitas yang berlabel `is_self_input = true`. | Karyawan sendiri | Ya — Level 1 wajib |
| **Custom Activity** | Karyawan membuat aktivitas yang tidak ada di library, isi nama & deskripsi bebas. | Karyawan sendiri | Ya — Level 1 + Section Head verifikasi |

#### 3.2.2 Alur Input Aktivitas — Detail Step by Step

| Step | Aksi Karyawan | Sistem | Keterangan |
|------|--------------|--------|-----------|
| 1 | Buka app HERO → tab Daily Activity | Tampilkan Job List hari ini + tombol '+ Tambah Aktivitas' | Job List terisi dari assignment atasan sejak pagi |
| 2a (Assigned) | Tap aktivitas yang ada di Job List → 'Mulai Kerjakan' | Catat `start_time` otomatis, status = IN_PROGRESS | GPS langsung divalidasi saat mulai |
| 2b (Self-input) | Tap '+ Tambah Aktivitas' → pilih dari library departemen | Filter library sesuai role & departemen karyawan | Hanya tampilkan aktivitas `is_self_input = true` |
| 2c (Custom) | Tap '+ Tambah Aktivitas' → pilih 'Aktivitas Lainnya' | Buka form custom: nama aktivitas, deskripsi, estimasi waktu | Wajib isi deskripsi minimal 50 karakter |
| 3 | Kerjakan tugas, lalu tap 'Selesai' | Catat `end_time` otomatis, hitung durasi | Durasi minimum 5 menit untuk aktivitas teknis |
| 4 | Isi form kelengkapan (foto, nomor unit, material, catatan) | Validasi field wajib sesuai atribut master activity | Upload foto otomatis di-compress ke max 500KB |
| 5 | Tap 'Submit Aktivitas' | Simpan ke DB, status = PENDING_APPROVAL, kirim notif WA ke Foreman | Karyawan bisa submit hingga pukul 23.59 hari yang sama |
| 6 | Terima notifikasi WA hasil approval | Kirim notif WA: approved/rejected + poin yang diberikan | Jika approved, poin langsung masuk ke saldo karyawan |

#### 3.2.3 Batas Waktu & SLA Input

| Rentang Waktu Submit | Status | Dampak Poin | Keterangan |
|---------------------|--------|------------|-----------|
| Sebelum 12.00 (tengah hari) | On-time (pagi) | +5 poin bonus disiplin pagi | Berlaku untuk aktivitas yang selesai shift pagi |
| 12.00 – 17.00 | On-time (normal) | Tidak ada bonus/penalty | Window utama pengisian aktivitas |
| 17.01 – 20.00 | Late — Minor | -2 poin per aktivitas yang terlambat | Masih bisa submit, poin sedikit berkurang |
| 20.01 – 23.59 | Late — Major | -5 poin per aktivitas yang terlambat | Submit masih diterima sistem |
| Tidak ada input sama sekali (H+1 jam 00.00) | No Report | -15 poin/hari (penalty No Daily Report) | Sistem otomatis catat sebagai hari tanpa laporan |
| Input di H+1 atau lebih (late submission) | Backdated | Tidak mendapat poin aktivitas + -10 poin penalty | Hanya untuk keperluan dokumentasi, tanpa reward |

---

### 3.3 Assignment Aktivitas oleh Atasan

Foreman dan Section Head memiliki kemampuan untuk membuat dan mendistribusikan Job List kepada anggota tim mereka. Ini adalah mekanisme utama perencanaan kerja harian di site.

#### 3.3.1 Fitur Pembuatan Job List oleh Foreman

- Foreman bisa membuat Job List untuk hari berjalan (H) atau hari berikutnya (H+1)
- Job List bisa dibuat secara template dari hari sebelumnya (copy & modifikasi)
- Setiap job dalam Job List wajib memilih aktivitas dari master library (atau buat custom job khusus)
- Foreman bisa assign satu aktivitas ke satu atau beberapa karyawan sekaligus
- Foreman bisa set estimasi durasi, prioritas (Normal / High / Emergency), dan catatan khusus per job
- Job List yang sudah dibuat langsung muncul di HP masing-masing karyawan yang di-assign
- Foreman mendapat notifikasi WA saat karyawan mulai mengerjakan (check-in) atau menyelesaikan job yang di-assign

#### 3.3.2 Fitur Assignment oleh Section Head

Section Head memiliki scope yang lebih luas dari Foreman — bisa assign aktivitas ke seluruh karyawan di departemen/sitenya, tidak terbatas pada tim langsung.

- Assign aktivitas khusus yang membutuhkan kualifikasi tertentu (misal: hanya untuk karyawan level Expert ke atas)
- Buat **recurring assignment**: aktivitas rutin yang otomatis muncul di Job List setiap hari / minggu / bulan
- Set **mandatory activity**: aktivitas yang WAJIB dikerjakan hari itu, jika tidak dikerjakan maka penalty berlaku
- **Broadcast assignment**: kirim job yang sama ke semua karyawan di suatu site/departemen

| Tipe Assignment | Dibuat oleh | Scope | Notifikasi ke Karyawan |
|----------------|------------|-------|----------------------|
| Individual | Foreman / Section Head | 1 karyawan spesifik | WA personal + in-app |
| Tim / Group | Foreman | Semua anggota tim Foreman tersebut | WA broadcast grup + in-app masing-masing |
| Departemen | Section Head | Semua karyawan satu departemen di site | WA broadcast + in-app |
| Recurring | Section Head | Terjadwal otomatis per periode | WA reminder H-1 sebelum jatuh tempo |
| Mandatory | Section Head / HC | Target tertentu, wajib dikerjakan | WA urgent + in-app alert merah |

#### 3.3.3 Status Job dalam Job List

| Status | Kode | Deskripsi | Warna UI |
|--------|------|-----------|---------|
| Not Started | `NOT_STARTED` | Job belum disentuh oleh karyawan | Abu-abu |
| In Progress | `IN_PROGRESS` | Karyawan sudah check-in / sedang mengerjakan | Biru |
| Submitted | `SUBMITTED` | Karyawan sudah submit, menunggu approval | Kuning |
| Approved | `APPROVED` | Disetujui atasan, poin sudah diberikan | Hijau |
| Rejected | `REJECTED` | Ditolak atasan, butuh revisi atau resubmit | Merah |
| Expired | `EXPIRED` | Melewati batas waktu tanpa disubmit | Merah gelap |
| Cancelled | `CANCELLED` | Dibatalkan oleh atasan (tidak jadi dikerjakan) | Abu-abu gelap |

---

### 3.4 Custom Activity (Input Bebas oleh Karyawan)

Karyawan kadang mengerjakan pekerjaan yang tidak tercantum dalam master library. Custom Activity memberikan fleksibilitas bagi karyawan untuk tetap mendokumentasikan pekerjaan tersebut, sambil melalui validasi atasan.

#### 3.4.1 Alur Custom Activity

1. Karyawan tap 'Tambah Aktivitas' → pilih **'Aktivitas Lainnya / Custom'**
2. Karyawan mengisi form: nama aktivitas (wajib), deskripsi detail (min. 80 karakter, wajib), kategori (pilih dari enum), foto dokumentasi (min. 1 foto, wajib), durasi pengerjaan, catatan tambahan
3. Submit → status: `PENDING_APPROVAL (custom)`
4. Notifikasi WA dikirim ke Foreman: *"[Nama Karyawan] mengajukan custom activity: [Nama Aktivitas]. Mohon review dan tentukan poin."*
5. Foreman membuka detail custom activity di app → memilih tindakan:
   - **APPROVE** dengan poin yang ditentukan Foreman (rentang 1–100 poin)
   - **APPROVE dan tagging** ke aktivitas library yang paling sesuai (aktivitas dijadikan referensi untuk masa depan)
   - **REJECT** dengan komentar alasan (karyawan terima notif WA alasan penolakan)
   - **ESCALATE** ke Section Head (untuk custom activity yang berulang atau perlu dijadikan standar)
6. Jika diapprove: poin masuk ke saldo karyawan sesuai nilai yang ditentukan Foreman
7. Jika ada 3+ custom activity yang sama dari karyawan berbeda dalam satu bulan: sistem otomatis alert Section Head untuk mempertimbangkan menambahkan aktivitas tersebut ke master library

> **Kebijakan Poin Custom Activity**
> - Poin custom activity ditentukan oleh Foreman saat approval, dalam rentang yang dikonfigurasi HR (default: 5–100 poin).
> - Custom activity yang di-approve tidak otomatis masuk ke master library.
> - Karyawan dibatasi maksimum **3 custom activity per hari** untuk mencegah penyalahgunaan.
> - Section Head bisa mengonversi custom activity yang sering diajukan menjadi aktivitas resmi di master library.

---

## 4. Approval Workflow

### 4.1 Alur Approval Multi-Level

| Level | Approver | Scope | SLA | Aksi yang Tersedia |
|-------|---------|-------|-----|-------------------|
| Level 1 | Foreman / Leader | Approve aktivitas anggota tim langsung | Maksimal 24 jam sejak submit | Approve, Reject, Request Revisi, Eskalasi ke PJO |
| Level 2 | PJO (opsional, per config site) | Re-confirm timesheet & lembur dari aktivitas approved | 48 jam sejak Level 1 approve | Confirm, Override poin (dengan alasan), Flag untuk HC |
| Level 3 (Custom Activity) | Section Head | Verifikasi custom activity yang di-eskalasi | 24 jam sejak eskalasi | Approve dengan kategori resmi, Reject, Jadikan template library |

### 4.2 Aturan Auto-Approval

Untuk mengurangi beban approval manual, sistem mendukung auto-approval berdasarkan kondisi berikut:

| Kondisi | Aturan | Aktif Default |
|---------|--------|---------------|
| GPS valid dalam radius site + foto terupload + durasi wajar | Auto-approve tanpa review Foreman (jika atribut `auto_approve_if_gps_valid = true` pada aktivitas) | Tidak (perlu diaktifkan per site oleh Section Head) |
| Aktivitas assigned yang selesai sebelum jam 12.00 + GPS valid | Auto-approve Level 1, Foreman dapat notif review H+1 | Tidak |
| Karyawan level Expert/Elite dengan track record 0 rejection dalam 30 hari | Auto-approve aktivitas dengan `complexity_level` 1–2 | Tidak (diaktifkan HR) |

### 4.3 Eskalasi & Overdue

- Jika Foreman tidak melakukan approval dalam **24 jam**: sistem kirim reminder WA ke Foreman
- Jika dalam **36 jam** masih belum diapprove: sistem eskalasi otomatis ke PJO, Foreman mendapat notif peringatan
- Jika dalam **48 jam** PJO juga tidak mengambil tindakan: HC Pusat mendapat alert, aktivitas masuk antrian HC untuk review
- Semua aktivitas yang melewati batas SLA dicatat dalam laporan performa approver bulanan yang dilihat oleh HC

---

## 5. Sistem Poin — Reward & Penalty

### 5.1 Prinsip Dasar Sistem Poin

> Sistem poin HERO dirancang untuk bersifat **ADIL, TRANSPARAN, dan DAPAT DIPREDIKSI.**
> - Setiap karyawan bisa melihat secara real-time berapa poin yang mereka miliki dan mengapa.
> - Setiap penambahan dan pengurangan poin memiliki log yang jelas: sumber, waktu, dan alasan.
> - Karyawan tidak pernah kehilangan poin tanpa pemberitahuan — semua perubahan dikirim via WA.
> - Total poin tidak bisa negatif — minimum saldo poin adalah **0**.

---

### 5.2 Sumber Poin Positif (Reward)

| Kategori | Trigger | Poin | Catatan |
|----------|---------|------|---------|
| Kehadiran — Tepat Waktu | Clock-in sebelum jam mulai shift | +10 poin/hari | Max 220 poin/bulan dari kehadiran |
| Kehadiran — Tidak Terlambat | Clock-in dalam 15 menit pertama shift (grace period) | +5 poin/hari | Lebih rendah dari tepat waktu |
| Disiplin Input — Pagi | Submit aktivitas sebelum jam 12.00 | +5 poin/aktivitas | Bonus disiplin pelaporan cepat |
| Disiplin Input — Normal | Submit aktivitas sebelum jam 17.00 | +2 poin/aktivitas | Standar on-time |
| Volume Kerja — Aktivitas Selesai | Aktivitas diapprove oleh Foreman | `base_points` × multiplier complexity | Dikonfigurasi per aktivitas di library |
| Complexity Bonus | Kompleksitas aktivitas (level 3–5) | +10% hingga +50% dari base_points | Level 3: +10%, Level 4: +30%, Level 5: +50% |
| Emergency Response | Aktivitas bertipe Emergency diapprove | +25 poin tambahan dari poin normal | Bonus respons cepat situasi darurat |
| HSE Compliance — Zero Incident | Site tidak ada incident satu bulan penuh | +50 poin/bulan | Berlaku semua karyawan di site tersebut |
| HSE — Toolbox Meeting | Hadir dan ter-record di toolbox meeting | +5 poin/meeting | Maks 1x per hari |
| Training — Sertifikat Baru | Sertifikat training baru masuk dari LMS | +50 hingga +200 poin | Tergantung level training |
| Wellness — Update BMI Normal | BMI dalam range sehat saat update bulanan | +20 poin/bulan | Self-input, diverifikasi sistem |
| Wellness — MCU Selesai | MCU tahunan selesai & hasilnya FIT | +100 poin/tahun | Hanya berlaku jika hasil FIT |
| Penilaian Atasan | Rating bintang 4–5 dari Foreman/PJO bulanan | +10 hingga +50 poin/bulan | Dikonfigurasi HR, subjektif |
| Streak Bonus | Lapor aktivitas 7 hari berturut-turut tanpa absen | +30 poin/streak | Berlipat jika berlanjut: 14hr = +70, 30hr = +150 |
| Loyalitas / Anniversary | Anniversary kerja tahunan | +100 poin/tahun | Otomatis dari data kontrak HC |
| Leaderboard Top 3 | Masuk peringkat top 3 site di akhir bulan | +100 / +70 / +50 poin | Berturut-turut: rank 1, 2, 3 |
| Referral Kolega | Menginspirasi kolega baru untuk input pertama kali | +20 poin | Hanya berlaku bulan pertama kolega bergabung |

---

### 5.3 Sumber Pengurangan Poin (Penalty)

> **Tentang Sistem Penalty**
> Penalty dirancang sebagai konsekuensi yang proporsional, bukan hukuman yang merusak motivasi. Setiap penalty dikirimkan notifikasi WA ke karyawan secara real-time dengan penjelasan alasan. Karyawan bisa mengajukan keberatan (dispute) atas penalty dalam 48 jam — diproses oleh Section Head / HC.

| Kategori Penalty | Trigger | Pengurangan Poin | Catatan |
|-----------------|---------|-----------------|---------|
| Keterlambatan Input — Minor | Submit aktivitas pukul 17.01 – 20.00 | -2 poin/aktivitas | Per aktivitas yang terlambat |
| Keterlambatan Input — Major | Submit aktivitas pukul 20.01 – 23.59 | -5 poin/aktivitas | Per aktivitas yang terlambat |
| Tidak Lapor Harian (No Daily Report) | Tidak ada satu pun aktivitas tersubmit dalam satu hari kerja | -15 poin/hari | Otomatis terhitung H+1 pukul 00.00 |
| Tidak Lapor — Berulang (3+ hari/bulan) | Tidak lapor 3 hari atau lebih dalam satu bulan | -30 poin tambahan (akumulatif) | Di samping penalty harian yang sudah berlaku |
| Keterlambatan Clock-in — Minor | Clock-in terlambat 16–30 menit dari jam mulai shift | -3 poin/kejadian | Grace period 15 menit tidak dikenakan penalty |
| Keterlambatan Clock-in — Major | Clock-in terlambat lebih dari 30 menit | -7 poin/kejadian | Per kejadian keterlambatan |
| Tidak Hadir Tanpa Keterangan (Alpha) | Tidak clock-in dan tidak ada izin tercatat | -20 poin/hari | Terpisah dari penalty no daily report |
| MCU Tidak Fit (Unfit) | Hasil MCU tahunan: UNFIT | -50 poin (satu kali) | Sampai karyawan menyerahkan MCU ulang yang FIT |
| MCU Tidak Fit — Berlanjut | Status UNFIT melewati 30 hari tanpa update MCU ulang | -10 poin/bulan | Selama status masih UNFIT |
| MCU Terlewat (Tidak Ikut MCU) | MCU tahunan melewati jadwal lebih dari 30 hari | -50 poin + warning HC | Berlaku sampai MCU selesai |
| Aktivitas Ditolak (Rejected) | Foreman/PJO menolak aktivitas yang disubmit | -5 poin/penolakan | Plus poin aktivitas tidak diberikan |
| Penolakan Berulang | Aktivitas yang sama ditolak 3+ kali dalam satu bulan | -10 poin tambahan + flag HC | Potensi coaching dari Foreman |
| Foto Palsu / GPS Fraud Terdeteksi | Sistem atau atasan mendeteksi manipulasi data aktivitas | -100 poin + notifikasi HC + suspend akun 24 jam | Tindakan keras untuk mencegah fraud |
| SLA Submission Terlewat (Assigned Activity) | Aktivitas yang di-assign atasan tidak disubmit dalam SLA | -10 poin/aktivitas + notif Foreman | Berlaku untuk assigned activity, bukan self-input |
| Tidak Ikut Toolbox Meeting (Wajib) | Absen dari toolbox meeting yang marked mandatory | -10 poin/meeting wajib yang dilewatkan | Hanya untuk meeting yang ditandai wajib oleh HSE |
| APD Non-Compliance | Tercatat tidak menggunakan APD saat HSE patrol | -15 poin/kejadian | Input oleh HSE Officer, tervalidasi foto |
| Status Unfit Harian Tidak Diupdate | Karyawan tidak update status fit/unfit selama 3 hari berturut-turut | -5 poin/hari (setelah hari ke-3) | Berlaku setelah 3 hari tidak update |

---

### 5.4 Multiplier & Modifier Poin

Poin dari aktivitas bisa dimodifikasi berdasarkan kondisi-kondisi berikut yang berlaku secara kumulatif:

| Modifier | Kondisi | Efek pada Poin Aktivitas |
|----------|---------|--------------------------|
| Streak Active | Karyawan sedang dalam streak laporan berturut-turut ≥7 hari | ×1.1 (bonus 10% per aktivitas) |
| Emergency Mode | Aktivitas dicatat sebagai status Emergency | ×1.5 dari base_points + bonus Emergency +25 |
| First Activity of Day | Aktivitas pertama yang disubmit hari itu | +5 poin bonus flat (satu kali per hari) |
| Site Competition Month | Bulan sedang dalam periode kompetisi antar site | ×1.2 untuk semua aktivitas selama periode berlangsung |
| Double Point Event | HR mengaktifkan event double point (configurable) | ×2.0 untuk semua aktivitas selama event |
| Peer Review Bonus | Aktivitas mendapat komentar positif dari ≥2 rekan satu tim | +10 poin tambahan (satu kali per aktivitas) |

---

### 5.5 Batas Poin Harian

Untuk mencegah penyalahgunaan sistem, sistem menerapkan batas poin harian per karyawan:

| Sumber Poin | Batas Maksimum per Hari |
|-------------|------------------------|
| Poin dari aktivitas teknis (base_points) | Max 200 poin/hari |
| Poin bonus disiplin input | Max 30 poin/hari |
| Poin kehadiran | Max 10 poin/hari |
| Poin HSE (toolbox, observasi) | Max 30 poin/hari |
| Poin custom activity | Max 50 poin/hari |
| **Total poin harian (semua sumber)** | **Max 300 poin/hari** |

> - Batas poin harian dikonfigurasi oleh HC/Super Admin dan dapat disesuaikan per site atau per role karyawan.
> - Poin yang melampaui batas tidak dibawa ke hari berikutnya (tidak ada carry-over).
> - Penalty tidak terbatas oleh cap harian — pengurangan tetap berlaku meski melebihi batas.

---

## 6. Mekanisme Dispute & Keberatan Poin

### 6.1 Proses Pengajuan Dispute

1. Karyawan melihat notifikasi penalty di Log Poin → tap **'Ajukan Keberatan'**
2. Karyawan mengisi form dispute: alasan keberatan (min. 50 karakter) + bukti pendukung (foto, screenshot, catatan)
3. Sistem mengirim notif WA ke Section Head: *"Ada pengajuan keberatan dari [Nama] untuk: [jenis penalty]"*
4. Section Head memiliki **48 jam** untuk memproses: Diterima (poin dikembalikan) atau Ditolak (dengan alasan)
5. Jika karyawan tidak puas dengan keputusan Section Head: bisa eskalasi ke HC Pusat (satu kali per kasus)
6. Keputusan HC Pusat bersifat **final**

| Jenis Penalty yang Bisa Didisputasi | Tidak Bisa Didisputasi |
|-------------------------------------|------------------------|
| Penalty keterlambatan input (jika ada bukti sistem down/masalah jaringan) | Penalty GPS Fraud / manipulasi data (keputusan final oleh HC) |
| Penalty no daily report (jika karyawan bisa tunjukkan pekerjaan aktual) | Penalty MCU unfit (berbasis hasil klinik resmi) |
| Penalty APD non-compliance (jika ada foto counter-evidence) | Poin aktivitas yang sudah expired SLA |
| Poin aktivitas yang ditolak tanpa alasan jelas dari Foreman | Keputusan HR tentang rating bulanan atasan |

---

## 7. Sistem Notifikasi WhatsApp

### 7.1 Notifikasi ke Karyawan

| Trigger | Isi Pesan WA | Waktu Kirim |
|---------|-------------|------------|
| Aktivitas diapprove | ✅ Aktivitas '[nama]' Anda diapprove! +[poin] poin. Total poin: [total]. Keep it up! | Segera setelah approval |
| Aktivitas ditolak | ❌ Aktivitas '[nama]' ditolak oleh [Foreman]. Alasan: [alasan]. Silakan cek app. | Segera setelah rejection |
| Custom activity diapprove | ✅ Custom activity Anda '[nama]' diapprove dengan [poin] poin! | Segera |
| Penalty no daily report | ⚠️ Anda belum melapor aktivitas hari ini. -15 poin dikurangkan. Total poin: [total]. | H+1 pukul 00.05 |
| Penalty terlambat input | ⚠️ Aktivitas '[nama]' disubmit terlambat. -[poin] poin. Coba submit lebih awal besok! | Segera setelah submit terlambat |
| Naik level | 🎉 Selamat! Anda naik ke level [nama level]! Lihat keuntungan baru Anda di app HERO. | Segera saat threshold tercapai |
| Masuk leaderboard top 3 | 🏆 Luar biasa! Anda masuk Top 3 leaderboard site bulan ini! Posisi: #[rank]. | Saat kondisi terpenuhi |
| Streak bonus aktif | 🔥 Streak 7 hari! Anda mendapat bonus +30 poin dan bonus 10% per aktivitas selama streak berlanjut! | Saat streak tercapai |
| Reminder job assigned | 📋 Anda punya [N] job assigned untuk hari ini yang belum dikerjakan. Deadline: 17.00. | Pukul 13.00 jika belum start |
| Sertifikat hampir expired | ⚠️ Sertifikat '[nama sertifikat]' Anda akan expired dalam [N] hari. Segera perbarui! | H-30, H-7, H-1 |
| MCU reminder | 📋 Jadwal MCU tahunan Anda: [tanggal]. Harap hadir sesuai jadwal. | H-7 dan H-1 sebelum MCU |
| Keberatan diproses | ℹ️ Keberatan Anda atas penalty [jenis] telah [diterima/ditolak]. Cek detail di app. | Setelah Section Head memproses |

### 7.2 Notifikasi ke Atasan (Foreman / Section Head)

| Trigger | Isi Pesan WA | Waktu Kirim |
|---------|-------------|------------|
| Aktivitas pending approval (baru masuk) | [Nama] mengajukan aktivitas '[nama]'. Harap review dalam 24 jam. | Segera setelah submit |
| Approval overdue 24 jam | ⚠️ Ada [N] aktivitas pending approval dari tim Anda yang sudah melewati 24 jam. Segera review! | Tepat di jam ke-24 |
| Custom activity perlu review | [Nama] mengajukan custom activity: '[nama]'. Mohon tentukan kategori & poin. | Segera setelah submit |
| Alert fraud GPS | 🚨 Terdeteksi potensi GPS fraud pada aktivitas [Nama] — [waktu]. Harap investigasi. | Segera saat sistem deteksi |
| Karyawan No Report 2 hari berturut-turut | ⚠️ [Nama] tidak melapor aktivitas selama 2 hari berturut-turut. Perlu tindak lanjut. | Pukul 08.00 H+2 |
| Laporan performa mingguan | 📊 Ringkasan performa tim Anda minggu ini. [N] aktivitas, [N] approval pending, rata-rata poin [X]. | Setiap Senin pukul 08.00 |

---

## 8. Dashboard & Analytics

### 8.1 My Activity Dashboard (Tampilan Karyawan)

Setiap karyawan memiliki dashboard pribadi yang menampilkan seluruh rekam jejak aktivitas dan poin mereka. Dirancang untuk mobile, informasi yang paling penting tampil di bagian atas.

| Komponen UI | Informasi yang Ditampilkan |
|-------------|--------------------------|
| Poin & Level Card | Total poin saat ini, level saat ini, progress bar ke level berikutnya, estimasi poin yang dibutuhkan |
| Streak Counter | Jumlah hari berturut-turut laporan aktif, status streak bonus aktif/tidak |
| Today's Job List | List aktivitas yang di-assign untuk hari ini, status masing-masing (Not Started / In Progress / Done) |
| Log Poin Harian | Rincian semua penambahan dan pengurangan poin hari ini beserta alasannya |
| Riwayat Aktivitas 7 Hari | Summary jumlah aktivitas, total poin, dan status submission 7 hari terakhir |
| Pending Submission | Aktivitas yang sudah dikerjakan tapi belum disubmit (reminder visual) |
| Leaderboard Snapshot | Posisi karyawan di leaderboard site bulan berjalan |
| Badge Terbaru | Badge/achievement terbaru yang diperoleh |
| Alert & Reminder | Sertifikat hampir expired, MCU belum selesai, penalty baru, dll. |

### 8.2 Team Activity Dashboard (Foreman / Section Head)

| Komponen | Informasi |
|----------|-----------|
| Job List Status Harian | Status per karyawan: berapa job done, in progress, not started, expired |
| Approval Queue | Antrian aktivitas yang menunggu approval, filter by: urgency, submission time, type |
| Tim Performance Summary | Rata-rata poin tim, jumlah aktivitas selesai, persentase on-time submission hari ini |
| No-Report Alert List | Daftar karyawan yang belum submit satu pun aktivitas hari ini |
| Custom Activity Queue | Custom activity yang menunggu keputusan poin dari Foreman |
| Weekly Trend Chart | Grafik tren jumlah aktivitas dan poin tim per hari dalam seminggu terakhir |
| Leaderboard Tim | Ranking individu dalam tim berdasarkan poin bulan berjalan |

### 8.3 Executive & HC Dashboard

| Komponen | Informasi |
|----------|-----------|
| Site Activity Overview | Perbandingan jumlah aktivitas, poin rata-rata, dan no-report rate antar site |
| Department Productivity | Produktivitas per departemen: aktivitas selesai vs target |
| Penalty Analytics | Distribusi jenis penalty terbanyak — identifikasi area masalah |
| Engagement Rate | Persentase karyawan yang submit aktivitas setiap hari (daily active users) |
| Level Distribution | Distribusi karyawan per level — tracking perkembangan SDM |
| Monthly Report Export | Export rekap aktivitas + poin per karyawan ke Excel untuk payroll support |
| Fraud Alert Log | Log semua deteksi potensi fraud GPS atau manipulasi data |

---

## 9. Skema Database (Detail Fitur Daily Activity)

### 9.1 Tabel Utama

| Tabel | Kolom Kunci | Relasi |
|-------|------------|--------|
| `activity_library` | id, code, name, category, department_id, base_points, complexity_level, requires_photo, requires_equipment_no, requires_duration, requires_gps, requires_material, max_daily_count, max_points_per_day, is_assignable, is_self_input, approval_required, auto_approve_if_gps_valid, sla_hours, is_active, created_by, created_at, updated_at | belongs to department; created_by → users |
| `daily_activities` | id, user_id, site_id, library_activity_id (nullable), custom_activity_name, custom_activity_description, assignment_id (nullable), status (enum), start_time, end_time, duration_minutes, equipment_no, material_used, notes, gps_lat, gps_lng, gps_valid, submission_time, submission_category (on_time/late_minor/late_major/backdated), points_earned, penalty_deducted, created_at, updated_at | belongs to user, site, library_activity, job_assignment |
| `activity_photos` | id, activity_id, s3_key, caption, uploaded_at | belongs to daily_activities |
| `job_assignments` | id, assigned_by, assigned_to, site_id, library_activity_id, custom_job_name, priority (enum), estimated_duration, notes, assigned_date, deadline, status, is_mandatory, is_recurring, recurrence_rule, created_at | assigned_by → users; assigned_to → users; belongs to site |
| `activity_approvals` | id, activity_id, approver_id, level (1/2/3), status (enum), points_awarded, points_override_reason, rejection_reason, reviewed_at, created_at | belongs to daily_activities; approver → users |
| `points_log` | id, user_id, transaction_type (reward/penalty), source_type (activity/penalty/bonus/admin), source_id, points_delta, balance_after, description, created_at, metadata (JSON) | belongs to users |
| `penalty_events` | id, user_id, site_id, penalty_type (enum), reference_date, points_deducted, description, is_disputed, dispute_status, resolved_at, created_at | belongs to users, sites |
| `point_disputes` | id, penalty_event_id, user_id, reason, evidence_urls (JSON), status (pending/accepted/rejected), resolved_by, resolution_notes, created_at, resolved_at | belongs to penalty_events; resolved_by → users |
| `streak_records` | id, user_id, streak_start_date, current_streak_days, longest_streak_days, last_activity_date, streak_bonus_active, updated_at | belongs to users |
| `activity_modifiers` | id, site_id (nullable), event_name, multiplier, start_date, end_date, is_active, created_by, created_at | belongs to sites; created_by → users |

---

## 10. User Stories Prioritas

### 10.1 Epic: Input & Manajemen Aktivitas

| ID | Sebagai... | Saya ingin... | Sehingga... | Prioritas |
|----|-----------|--------------|------------|----------|
| DA-US01 | Karyawan | Input aktivitas dari HP dalam kurang dari 2 menit | Tidak terganggu pelaporan saat di lapangan | P0 |
| DA-US02 | Karyawan | Lihat Job List hari ini langsung saat buka app | Tahu pekerjaan apa yang harus saya kerjakan hari ini | P0 |
| DA-US03 | Karyawan | Input custom activity jika pekerjaan tidak ada di list | Semua pekerjaan saya tetap terdokumentasi | P0 |
| DA-US04 | Karyawan | Terima notif WA saat aktivitas diapprove/ditolak | Tahu status laporan saya tanpa harus buka app terus | P0 |
| DA-US05 | Foreman | Lihat semua aktivitas tim saya dalam satu layar | Bisa approve dengan cepat sebelum akhir shift | P0 |
| DA-US06 | Foreman | Buat Job List untuk tim saya setiap pagi | Tim tahu tugas mereka tanpa perlu briefing verbal | P0 |
| DA-US07 | Section Head | Tambah dan edit aktivitas di master library departemen saya | Daftar aktivitas selalu relevan dengan pekerjaan aktual | P0 |
| DA-US08 | Section Head | Buat recurring assignment untuk aktivitas rutin | Tidak perlu assign ulang setiap hari untuk tugas berulang | P1 |
| DA-US09 | Karyawan | Lihat log poin detail saya — kapan bertambah dan berkurang | Saya transparan tentang skor saya dan bisa belajar dari sana | P0 |
| DA-US10 | Karyawan | Ajukan keberatan atas penalty yang tidak tepat | Ada mekanisme adil jika sistem salah menghitung | P1 |

### 10.2 Epic: Sistem Poin & Gamifikasi

| ID | Sebagai... | Saya ingin... | Sehingga... | Prioritas |
|----|-----------|--------------|------------|----------|
| DA-US11 | Karyawan | Lihat poin saya berubah secara real-time setelah aktivitas diapprove | Ada kepuasan instan yang mendorong saya terus input | P0 |
| DA-US12 | Karyawan | Terima notif WA saat penalty terjadi beserta alasannya | Saya tahu dan bisa perbaiki perilaku yang menyebabkan penalty | P0 |
| DA-US13 | Karyawan | Lihat streak saya aktif atau tidak | Saya termotivasi untuk tidak memutus streak laporan harian | P1 |
| DA-US14 | HR / HC | Konfigurasi nilai penalty dan reward dari dashboard tanpa coding | Saya bisa sesuaikan sistem poin dengan kebijakan HR terbaru | P1 |
| DA-US15 | HR / HC | Aktifkan event double point atau site competition dari dashboard | Saya bisa buat momen khusus yang meningkatkan engagement | P2 |
| DA-US16 | Section Head | Lihat distribusi poin karyawan departemen saya | Saya bisa identifikasi karyawan yang butuh support atau coaching | P1 |

---

## 11. Business Rules & Edge Cases

| Rule ID | Kondisi / Skenario | Perilaku Sistem |
|---------|--------------------|----------------|
| BR-01 | Karyawan submit aktivitas tapi GPS di luar radius site (>500m) | Sistem flag sebagai `GPS_MISMATCH`, aktivitas masih bisa submit tapi Foreman mendapat alert. Poin pending sampai Foreman review manual. |
| BR-02 | Karyawan submit dua aktivitas dengan waktu yang overlap (start/end time bertabrakan) | Sistem menolak submission kedua dengan pesan error: *"Waktu bertabrakan dengan aktivitas [nama]. Harap koreksi waktu."* |
| BR-03 | Karyawan input aktivitas di hari libur nasional | Sistem menerima input, poin berlaku normal. Jika aktivitas tersebut menunjukkan lembur, auto-flag ke M3 (Timesheet) untuk kalkulasi lembur hari libur nasional. |
| BR-04 | Foreman menjadi karyawan yang di-approve oleh PJO (bukan Foreman lain) | Sistem mencegah self-approval — Foreman tidak bisa approve aktivitas miliknya sendiri. Eskalasi otomatis ke PJO. |
| BR-05 | Karyawan resign / tidak aktif di tengah bulan | Akun dinonaktifkan oleh HC, poin tersimpan di histori. Aktivitas yang sudah pending approval tetap bisa diproses Foreman. Leaderboard tidak menampilkan karyawan tidak aktif. |
| BR-06 | Custom activity yang sama diajukan oleh ≥3 karyawan berbeda dalam satu bulan | Alert dikirim ke Section Head: *"Aktivitas [nama] diajukan 3+ kali bulan ini. Pertimbangkan untuk menambahkan ke master library."* |
| BR-07 | Koneksi internet terputus saat karyawan sedang mengisi form aktivitas | Sistem menyimpan draft lokal (service worker cache). Saat koneksi kembali, draft otomatis disubmit. Karyawan melihat notif: *"Draft aktivitas berhasil dikirim."* |
| BR-08 | Penalty no daily report di hari karyawan izin sakit resmi | Sistem mengecek status absensi — jika izin sakit tervalidasi di M7 (Wellness/HC), penalty no daily report **TIDAK berlaku** untuk hari tersebut. |
| BR-09 | Foreman menolak aktivitas tapi tidak mengisi alasan | Form rejection wajib isi kolom alasan (minimal 20 karakter). Tombol 'Tolak' tidak bisa diklik tanpa alasan. |
| BR-10 | Poin karyawan akan negatif karena penalty | Saldo poin minimum adalah **0**. Jika penalty melebihi saldo, poin menjadi 0 (tidak negatif). Namun total penalty yang 'terlewat' dicatat di log untuk pelaporan HC. |
| BR-11 | Section Head mengubah `base_points` suatu aktivitas di library | Aktivitas yang sudah diapprove sebelum perubahan tidak terpengaruh (tidak retroaktif). Perubahan berlaku untuk aktivitas yang disubmit setelah tanggal perubahan. |
| BR-12 | Karyawan pindah site di tengah bulan | Poin dari site lama tetap di histori. Mulai tanggal pindah, karyawan masuk leaderboard site baru. Laporan bulanan HC menampilkan breakdown per site. |

---

## 12. Non-Functional Requirements

| Aspek | Requirement | Target Metrik |
|-------|------------|--------------|
| Performa | Page load form input aktivitas di koneksi 4G | < 2 detik |
| Performa | Response API submit aktivitas | < 500ms untuk 95% request |
| Performa | Kalkulasi poin dan update log setelah approval | < 1 detik |
| Performa | Dashboard karyawan (load semua widget) | < 3 detik |
| Offline | Form input aktivitas tersedia saat offline (draft mode) | 100% form fields bisa diisi offline |
| Offline | Sync otomatis saat koneksi kembali | < 30 detik setelah koneksi tersedia |
| Skalabilitas | Concurrent users submit aktivitas bersamaan (shift change jam 17.00) | Mampu handle 500+ concurrent submissions |
| Keamanan | GPS tidak bisa dipalsukan dari app lain | Deteksi mock GPS, flag otomatis |
| Keamanan | Foto tidak bisa disubmit tanpa metadata EXIF timestamp | Validasi EXIF timestamp saat upload |
| Keamanan | Akses data aktivitas antar site | Strict isolation — karyawan hanya lihat data site sendiri |
| Audit | Semua perubahan data (poin, aktivitas, approval) | 100% tercatat di audit log dengan user, timestamp, dan nilai lama/baru |
| Notifikasi WA | Delay notifikasi WhatsApp setelah trigger | < 30 detik dari event |

---

## 13. Integrasi dengan Modul HERO Lainnya

| Modul HERO | Integrasi dengan Daily Activity | Arah Data |
|-----------|--------------------------------|-----------|
| M2 — Approval Engine | Approval workflow daily activity menggunakan engine yang sama dengan M2, dengan konfigurasi level yang dapat dikustomisasi per site | Dua arah |
| M3 — Timesheet & Payroll Support | Aktivitas yang diapprove menjadi sumber data jam kerja di M3. Duration dari setiap aktivitas diakumulasi untuk timesheet harian. | Daily Activity → M3 |
| M5 — HERO Points & Leveling | Poin dari Daily Activity adalah sumber utama poin M5. Level karyawan berubah berdasarkan total poin dari semua sumber termasuk Daily Activity. | Daily Activity → M5 |
| M6 — HSE Module | Aktivitas kategori HSE yang dicatat di Daily Activity juga tercatat di M6. Status fit/unfit harian dari M6 mempengaruhi penalty poin di Daily Activity. | Dua arah |
| M7 — HC Suite (Absensi) | Status kehadiran (hadir/izin/sakit/alpha) dari M7 menentukan apakah penalty no-daily-report berlaku atau tidak. | M7 → Daily Activity |
| M7 — Training Center | Poin training dari LMS masuk ke `points_log` yang sama dengan Daily Activity, tapi dikategorikan sebagai `source_type = training`. | Training Center → points_log |
| M7 — Wellness | Hasil MCU (fit/unfit) dan BMI update dari M7 Wellness menjadi trigger penalty atau reward poin di Daily Activity. | M7 Wellness → Daily Activity |
| M8 — Dashboard & Analytics | Daily Activity adalah primary data source untuk semua dashboard operasional di M8. | Daily Activity → M8 |

---

## 14. Panel Konfigurasi Admin

### 14.1 Konfigurasi yang Tersedia per Level Admin

| Konfigurasi | Section Head | HC / HR Pusat | Super Admin |
|------------|:------------:|:-------------:|:-----------:|
| Tambah/edit aktivitas di library departemen | ✓ | ✓ | ✓ |
| Set `base_points` per aktivitas | ✓ | ✓ | ✓ |
| Set batas waktu submission (SLA hours) | ✗ | ✓ | ✓ |
| Konfigurasi nilai penalty (jumlah poin per jenis penalty) | ✗ | ✓ | ✓ |
| Konfigurasi batas poin harian per karyawan | ✗ | ✓ | ✓ |
| Aktifkan/nonaktifkan auto-approval per site | ✓ | ✓ | ✓ |
| Aktifkan event double point / site competition | ✗ | ✓ | ✓ |
| Konfigurasi level & threshold poin (dari M5) | ✗ | ✓ | ✓ |
| Override poin aktivitas individual karyawan | ✗ | ✓ (dengan log) | ✓ |
| Akses audit log lengkap | ✗ | ✓ (dept sendiri) | ✓ |
| Konfigurasi radius GPS site (meter) | ✗ | ✗ | ✓ |
| Suspend akun karyawan karena fraud | ✗ | ✓ | ✓ |

### 14.2 Konfigurasi Nilai Penalty (Default)

Nilai berikut adalah default yang dapat diubah oleh HC / Super Admin melalui panel admin HERO tanpa coding:

| Kode Penalty | Nama Penalty | Nilai Default | Range Konfigurasi |
|-------------|-------------|:-------------:|:----------------:|
| PEN-01 | No Daily Report | -15 poin/hari | -5 s/d -50 poin |
| PEN-02 | Terlambat Input Minor (17.01–20.00) | -2 poin/aktivitas | -1 s/d -10 poin |
| PEN-03 | Terlambat Input Major (20.01–23.59) | -5 poin/aktivitas | -3 s/d -20 poin |
| PEN-04 | Terlambat Clock-in Minor (16–30 menit) | -3 poin/kejadian | -1 s/d -10 poin |
| PEN-05 | Terlambat Clock-in Major (>30 menit) | -7 poin/kejadian | -5 s/d -20 poin |
| PEN-06 | Alpha (tidak hadir tanpa keterangan) | -20 poin/hari | -10 s/d -50 poin |
| PEN-07 | MCU Unfit (satu kali) | -50 poin | -20 s/d -100 poin |
| PEN-08 | MCU Terlewat (>30 hari dari jadwal) | -50 poin + warning | -30 s/d -100 poin |
| PEN-09 | Aktivitas Ditolak Foreman | -5 poin/penolakan | -2 s/d -15 poin |
| PEN-10 | GPS Fraud Terdeteksi | -100 poin + suspend 24 jam | Min. -50 poin |
| PEN-11 | APD Non-Compliance | -15 poin/kejadian | -10 s/d -30 poin |
| PEN-12 | SLA Assigned Activity Terlewat | -10 poin/aktivitas | -5 s/d -25 poin |
| PEN-13 | No Report Berulang (≥3 hari/bulan) | -30 poin tambahan | -15 s/d -50 poin |

---

## 15. Glossary

| Istilah | Definisi |
|---------|---------|
| Daily Activity | Pencatatan satu unit pekerjaan atau kegiatan yang dilakukan karyawan dalam satu hari kerja |
| Activity Library / Master Library | Daftar aktivitas resmi yang dikonfigurasi Section Head per departemen, menjadi referensi input karyawan |
| Custom Activity | Aktivitas yang tidak ada di master library, diinput bebas oleh karyawan dan memerlukan approval poin dari Foreman |
| Job List | Daftar pekerjaan yang di-assign oleh Foreman/Section Head kepada karyawan untuk dikerjakan pada hari tertentu |
| Assigned Activity | Aktivitas yang sudah masuk di Job List karyawan karena di-assign oleh atasan |
| Self-Input Activity | Aktivitas yang dipilih sendiri oleh karyawan dari master library tanpa assignment dari atasan |
| Base Points | Nilai poin dasar yang diberikan untuk suatu aktivitas setelah diapprove, sebelum modifier diterapkan |
| Complexity Level | Tingkat kesulitan aktivitas (1–5) yang menentukan multiplier tambahan di atas base_points |
| Penalty | Pengurangan poin otomatis yang diterapkan sistem sebagai konsekuensi pelanggaran disiplin |
| Reward | Penambahan poin yang diberikan sistem sebagai apresiasi atas perilaku positif karyawan |
| Streak | Rangkaian hari berturut-turut di mana karyawan berhasil mensubmit minimal satu aktivitas |
| Streak Bonus | Poin tambahan dan multiplier yang diberikan kepada karyawan yang memiliki streak aktif |
| Modifier | Faktor yang mengubah nilai poin dasar suatu aktivitas (streak, emergency, event, dll.) |
| Dispute | Pengajuan keberatan resmi oleh karyawan atas penalty yang dianggap tidak tepat |
| Auto-Approve | Mekanisme persetujuan otomatis tanpa review manual Foreman, berlaku jika kondisi tertentu terpenuhi |
| Mandatory Activity | Aktivitas yang wajib dikerjakan; jika dilewatkan, penalty berlaku tanpa bisa didisputasi |
| Recurring Assignment | Assignment yang otomatis muncul ulang sesuai jadwal (harian, mingguan, bulanan) |
| GPS Validation | Proses verifikasi bahwa lokasi karyawan saat submit berada dalam radius resmi site |
| SLA | Batas waktu yang ditetapkan untuk penyelesaian suatu proses (submission atau approval) |
| Points Log | Catatan lengkap setiap transaksi poin (tambah/kurang) seorang karyawan beserta alasan dan timestamp |

---

*HERO — hero.chitraparatama.com*
*"Every Job Recorded. Every Achievement Rewarded. Every Decision Data-Driven."*
*PT Chitra Paratama — Dokumen Confidential — PRD Addendum Daily Activity v1.0 — Mei 2026*