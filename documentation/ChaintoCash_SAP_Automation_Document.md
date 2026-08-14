# Akselerasi Chain-to-Cash

## Implementasi SAP Automation Dalam Pemrosesan Billing Invoice Guna Memangkas Lead Time Antara Tim Supply Chain

**Program:** Digital Transformation — Tire Repair Operations
**Inisiator:** Tire Repair Division & IT/System Team — HERO System
**Dokumen Versi:** 1.0

---

## Executive Summary

Setiap ban yang selesai diperbaiki di workshop Tire Repair harus melewati serangkaian proses administrasi sebelum nilai pekerjaan tersebut bisa ditagihkan kepada pelanggan. Dua proses kritikal dalam rantai billing ini adalah TECO (Technical Completion Order) dan MIGO (Material Goods Movement) — keduanya harus dilakukan di sistem SAP sebelum invoice dapat diterbitkan.

Selama ini, proses ini dimulai dari job card fisik yang ditulis tangan oleh teknisi di workshop, diserahkan ke supervisor, lalu dikompilasi manual sebelum akhirnya dikirim ke tim billing untuk diinput ke SAP. Setiap titik perpindahan dokumen ini adalah potensi keterlambatan, potensi salah baca, dan potensi data yang tidak sesuai dengan pekerjaan aktual.

Dokumen ini mendeskripsikan solusi end-to-end yang sudah diimplementasikan: mengintegrasikan **CAMOS** (sistem digital job card) dengan **WIP Repair di HERO**, dilengkapi fitur **Export TECO/MIGO** dan **Copy SAP Format**, yang selanjutnya dieksekusi oleh **Microsoft Power Automate** untuk melakukan input otomatis ke SAP Billing — mengakhiri ketergantungan pada dokumen kertas dan proses rekap manual yang selama ini menjadi bottleneck utama dalam siklus chain-to-cash.

**Dampak yang ditargetkan:**
- Eliminasi lead time rekap job card manual: dari rata-rata beberapa hari menjadi near-real-time.
- Akurasi input SAP mencapai 100% karena data bersumber langsung dari sistem digital, bukan dari tulisan tangan.
- Percepatan siklus billing yang memungkinkan invoice diterbitkan lebih cepat setelah pekerjaan selesai.
- Pengurangan workload manual tim billing sebesar signifikan.

---

## 1. Latar Belakang dan Konteks Bisnis

### 1.1 Posisi Tire Repair dalam Rantai Bisnis

Tire Repair adalah salah satu layanan utama yang ditawarkan oleh HERO kepada pelanggannya — perusahaan-perusahaan tambang dan konstruksi yang mengoperasikan alat berat. Setiap ban yang rusak di lapangan dikirim ke workshop Tire Repair untuk diperbaiki, dan setelah selesai, pekerjaan tersebut ditagihkan kepada pelanggan melalui invoice resmi.

Dari sudut pandang keuangan, setiap hari keterlambatan dalam proses billing berarti satu hari lebih lama kas tertahan di piutang yang belum tertagih. Dalam skala operasional dengan ratusan work order aktif setiap bulannya, akumulasi keterlambatan ini berdampak nyata terhadap arus kas perusahaan.

Siklus lengkap dari pekerjaan selesai hingga invoice diterima pelanggan — yang disebut **Chain-to-Cash** — melibatkan beberapa tahap:

```
Pekerjaan Selesai
      ↓
Input TECO di SAP (Technical Completion)
      ↓
Input MIGO di SAP (Material Goods Movement)
      ↓
Penerbitan Invoice
      ↓
Pengiriman Invoice ke Pelanggan
      ↓
Pembayaran Diterima (CASH)
```

Setiap keterlambatan di titik awal rantai ini — yaitu proses TECO dan MIGO — menggeser seluruh rantai ke bawah dan memperlambat penerimaan kas.

### 1.2 Volume Operasional

Tire Repair HERO melayani banyak pelanggan di berbagai site, dengan volume work order aktif yang terus berfluktuasi. Setiap work order memiliki puluhan baris data pekerjaan (job detail) yang mencatat material, waktu, dan person yang bertanggung jawab di setiap tahap — dari Skiving hingga Painting.

Dengan volume data sebesar itu, metode pencatatan manual bukan lagi pilihan yang memadai. Dibutuhkan pendekatan yang sistematis, terdigitalisasi, dan terintegrasi langsung dengan SAP.

---

## 2. Pernyataan Masalah (Problem Statement)

### 2.1 Root Cause: Job Card Manual

Sebelum sistem ini diimplementasikan, seluruh pencatatan aktivitas repair dilakukan melalui **job card fisik** — selembar formulir yang diisi tangan oleh teknisi di workshop setelah selesai mengerjakan setiap tahap pekerjaan.

Job card ini mencatat:
- Nomor work order.
- Nama teknisi yang mengerjakan.
- Tahap pekerjaan yang dilakukan (Skiving, Buffing, Built Up, dll.).
- Material yang digunakan beserta jumlahnya.
- Waktu pengerjaan.

Masalah fundamental dari pendekatan ini adalah bahwa **data hanya tersedia dalam bentuk fisik** — tidak bisa diakses secara remote, tidak bisa dihitung secara otomatis, dan kualitasnya sangat bergantung pada keterbacaan tulisan tangan masing-masing teknisi.

### 2.2 Dampak Masalah di Setiap Tahap

**Tahap 1: Penulisan Job Card oleh Teknisi**

Teknisi bekerja di lingkungan workshop yang banyak kotoran, minyak, dan debu. Kondisi ini membuat proses menulis menjadi tidak nyaman, dan hasilnya sering kali:
- Tulisan sulit atau tidak bisa dibaca (illegible handwriting).
- Field yang seharusnya diisi dikosongkan karena keterbatasan waktu.
- Nomor material atau kode pekerjaan ditulis tidak lengkap atau salah.
- Data tanggal dan waktu tidak presisi.

**Tahap 2: Kompilasi oleh Supervisor**

Setelah teknisi menyerahkan job card, supervisor harus mengumpulkan semua job card dari semua teknisi, memeriksa kelengkapannya, dan mengkompilasi menjadi rekap yang bisa diserahkan ke tim billing. Proses ini memakan waktu karena:
- Supervisor harus mencari job card yang belum diserahkan.
- Beberapa job card tercecer atau hilang.
- Tulisan yang tidak terbaca harus dikonfirmasi kembali ke teknisi yang bersangkutan.
- Tidak ada sistem untuk tahu apakah job card dari semua WO sudah lengkap atau belum.

**Tahap 3: Input Manual ke SAP oleh Tim Billing**

Tim billing menerima tumpukan rekap dari supervisor dan harus menginputnya satu per satu ke SAP. Di sinilah akumulasi masalah dari tahap sebelumnya mencapai puncaknya:
- Tulisan yang tidak terbaca menyebabkan material code atau quantity diinput secara perkiraan.
- Volume dokumen yang banyak menyebabkan antrian input yang panjang.
- Input yang tidak sesuai aktual mengakibatkan nilai billing yang tidak akurat.
- TECO dan MIGO yang belum diinput membuat invoice tidak bisa diterbitkan.
- Jika ada kesalahan, harus dilakukan koreksi di SAP yang membutuhkan waktu tambahan.

### 2.3 Kuantifikasi Dampak Bisnis

| Jenis Dampak | Kondisi Lama |
|---|---|
| Lead time dari pekerjaan selesai → TECO input | Rata-rata beberapa hari (bergantung volume & keterbacaan job card) |
| Lead time TECO → Invoice terbit | Tambahan waktu akibat antrean input tim billing |
| Kesalahan input SAP | Sering terjadi, terutama pada material code dan quantity |
| Workload tim billing | Tinggi — sebagian besar waktu dihabiskan untuk input manual |
| Keterlacakan status TECO/MIGO per WO | Tidak ada sistem yang memantau secara real-time |
| Potensi billing gap (pekerjaan selesai tapi belum diinvoice) | Tidak terdeteksi secara sistematis |

### 2.4 Dampak terhadap Pelanggan

Selain dampak internal, keterlambatan proses billing juga berpengaruh pada hubungan dengan pelanggan:
- Invoice yang terlambat menyulitkan pelanggan dalam proses pembayaran.
- Ketidakakuratan data billing dapat menimbulkan dispute yang memerlukan klarifikasi tambahan.
- Kepercayaan pelanggan terhadap profesionalisme layanan berkurang jika proses administrasi tidak rapi.

---

## 3. Analisis Peluang Perbaikan (Business Case Analysis)

### 3.1 Titik Intervensi yang Tepat

Dari analisis proses, ada dua titik intervensi yang paling efektif untuk memotong lead time chain-to-cash:

**Intervensi 1: Digitalisasi Job Card di Sumber (Source)**
Jika job card dibuat secara digital dari awal, masalah keterbacaan, kehilangan dokumen, dan keterlambatan kompilasi hilang sepenuhnya. Data langsung tersedia dalam format yang bisa diproses oleh sistem.

**Intervensi 2: Otomasi Input SAP**
Jika data yang sudah terdigitalisasi bisa diformat sesuai kebutuhan SAP dan dieksekusi secara otomatis tanpa keterlibatan tim billing untuk mengetik ulang, lead time proses billing berkurang drastis.

Kedua intervensi ini diimplementasikan secara bersamaan dalam solusi yang dijelaskan di dokumen ini.

### 3.2 Nilai Strategis Akselerasi Chain-to-Cash

Memangkas lead time antara pekerjaan selesai dan invoice terbayar memiliki nilai strategis yang melampaui sekadar efisiensi operasional:

- **Peningkatan Cash Flow**: setiap hari percepatan dalam siklus billing berarti satu hari lebih cepat kas diterima.
- **Akurasi Billing**: data yang bersumber dari sistem digital eliminasi potensi salah tagih.
- **Skalabilitas**: sistem yang otomatis bisa menangani volume WO yang meningkat tanpa menambah headcount tim billing.
- **Audit Trail**: setiap data yang diinput ke SAP dapat ditelusuri sumbernya hingga ke level detail job card digital.
- **Visibilitas Management**: status TECO dan MIGO setiap WO dapat dipantau secara real-time.

---

## 4. Solusi: Arsitektur Integrasi End-to-End

Solusi yang diimplementasikan terdiri dari empat komponen utama yang bekerja dalam satu rantai terintegrasi.

### 4.1 Komponen 1 — CAMOS: Digital Job Card System

**CAMOS** adalah sistem digital yang digunakan oleh teknisi Tire Repair untuk mencatat aktivitas pekerjaan mereka secara real-time langsung dari perangkat digital di workshop.

Melalui CAMOS, setiap teknisi mencatat:
- Work order yang sedang dikerjakan.
- Tahap pekerjaan yang diselesaikan (Skiving, Buffing, Built Up, dll.).
- Material yang digunakan beserta kode dan jumlahnya.
- Waktu pengerjaan per aktivitas.
- Tanggal dan identitas teknisi yang mengerjakan.

CAMOS menggantikan seluruh job card fisik. Setiap entri langsung tersimpan ke database — tidak ada lagi kertas, tidak ada lagi tulisan tangan, tidak ada lagi risiko dokumen hilang atau tidak terbaca.

**Transformasi yang terjadi:**

| Sebelum CAMOS | Dengan CAMOS |
|---|---|
| Job card ditulis tangan | Input digital langsung di perangkat |
| Risiko tulisan tidak terbaca | Data selalu terstruktur dan terbaca |
| Dokumen bisa hilang | Data tersimpan di database, tidak bisa hilang |
| Perlu kompilasi manual | Data langsung tersedia secara terstruktur |
| Delay antara kerja dan pencatatan | Pencatatan dilakukan saat atau segera setelah pekerjaan selesai |

### 4.2 Komponen 2 — WIP Repair (HERO): Central Monitoring & Data Hub

Data yang diinput melalui CAMOS masuk ke dalam **WIP Repair** di platform HERO — menjadi pusat monitoring seluruh work order aktif beserta detail pekerjaan, status, dan informasi finansial.

WIP Repair berfungsi sebagai **jembatan digital** antara data pekerjaan di workshop dan proses billing di SAP, dengan beberapa fitur kunci:

#### 4.2.1 Monitoring Status TECO & MIGO Real-Time

Setiap work order di WIP Repair menampilkan status TECO dan MIGO secara real-time:

- **TECO (Technical Completion Order)**: dideteksi dari System Status SAP. Jika status masih "REL" (Released), berarti TECO belum dilakukan (TECO Pending). Jika status sudah berubah dari REL, TECO dianggap Done.
- **MIGO (Material Goods Movement)**: dideteksi dari keberadaan Actual Total Revenue. Jika revenue sudah ada tapi cost belum ada, MIGO masih pending. Jika keduanya sudah ada, MIGO Done.

Filter khusus tersedia untuk:
- Menampilkan hanya WO yang **belum TECO** → menjadi antrian prioritas untuk eksekusi.
- Menampilkan hanya WO yang **belum MIGO** → monitoring tahap berikutnya.
- Menampilkan WO yang **sudah TECO tapi belum diinvoice** → deteksi billing gap.

#### 4.2.2 Bulk Filter Work Order (WO Paste Filter)

Tim billing dapat melakukan paste daftar nomor WO secara sekaligus (bulk paste) ke dalam sistem — baik dipisahkan dengan enter, koma, maupun tab. Sistem langsung memfilter dan menampilkan hanya WO yang relevan, sehingga tim tidak perlu mencari satu per satu.

#### 4.2.3 Export Data TECO/MIGO

Tombol **Export** di WIP Repair menghasilkan file Excel berisi seluruh data work order yang difilter, mencakup:
- Nomor WO.
- Start Date dan Finish Date.
- Invoice Date.
- Actual Total Revenue dan Actual Total Cost.
- System Status SAP.
- PO Number dan PO Date.

File ini digunakan sebagai input untuk proses Power Automate yang akan menjalankan TECO dan MIGO di SAP.

#### 4.2.4 Copy SAP Format (Per Work Order)

Untuk setiap work order, ada tombol **Copy SAP** yang menghasilkan teks dalam format yang sudah disesuaikan dengan kebutuhan input SAP — siap untuk di-paste langsung ke transaksi SAP terkait.

Format SAP yang dikopi sudah mempertimbangkan:
- Material code yang sudah divalidasi terhadap Master Barang Repair.
- Quantity yang sudah dinormalisasi.
- Site code yang sudah disesuaikan dengan kode SAP.
- Hanya baris material yang valid (sesuai katalog) yang disertakan.
- Baris dengan data tidak lengkap diabaikan otomatis.

Fitur ini memberikan fallback yang aman: jika Power Automate karena alasan tertentu tidak bisa mengeksekusi otomatis, tim billing masih bisa menggunakan Copy SAP untuk input semi-manual yang jauh lebih cepat dan akurat daripada mengetik ulang dari rekap.

### 4.3 Komponen 3 — Power Automate: SAP Input Automation Engine

**Microsoft Power Automate** berjalan secara terpisah sebagai engine otomasi yang mengambil data dari WIP Repair (melalui Export) dan mengeksekusi input TECO serta MIGO di SAP secara otomatis — tanpa keterlibatan manual dari tim billing untuk mengetik data.

#### 4.3.1 Proses Otomasi TECO

1. Power Automate membaca file export dari WIP Repair yang berisi daftar WO yang perlu di-TECO.
2. Untuk setiap WO, Power Automate membuka transaksi TECO di SAP (IW32 atau ekuivalen).
3. Mengisi nomor WO dan melakukan Technical Completion.
4. Mencatat hasil eksekusi (sukses/gagal) untuk setiap WO.
5. Menghasilkan laporan eksekusi untuk konfirmasi tim.

#### 4.3.2 Proses Otomasi MIGO

1. Power Automate membaca data material per WO dari format SAP yang sudah disiapkan.
2. Membuka transaksi MIGO di SAP (MB01 atau transaksi goods movement terkait).
3. Mengisi material code, quantity, dan data terkait per baris.
4. Menyimpan posting MIGO.
5. Mencatat nomor dokumen MIGO yang dihasilkan.

#### 4.3.3 Keunggulan Pendekatan Power Automate

- Tidak memerlukan pengembangan konektor SAP yang kompleks — Power Automate bekerja di layer UI/API SAP yang sudah ada.
- Dapat dijadwalkan atau dipicu secara event-driven (misalnya: setiap kali ada WO baru yang statusnya menjadi "Complete").
- Mudah di-maintain dan dimodifikasi tanpa perlu pengembangan software khusus.
- Memiliki built-in error handling dan retry mechanism.
- Log eksekusi tersedia untuk audit trail.

### 4.4 Komponen 4 — Feedback Loop ke WIP Repair

Setelah Power Automate berhasil menjalankan TECO dan MIGO di SAP, data hasil eksekusi (nomor dokumen, tanggal posting, actual cost) dikembalikan ke WIP Repair melalui update data PMO Mapping dan Invoice Mapping.

Ini menutup loop informasi sehingga:
- Tim supervisor dapat melihat WO mana yang sudah selesai di-TECO dan MIGO.
- Tim finance dapat memverifikasi data invoice tanpa perlu cek ke SAP secara terpisah.
- Dashboard WIP Repair menampilkan kondisi billing yang akurat dan up-to-date.

---

## 5. Alur Lengkap End-to-End

Berikut adalah gambaran lengkap alur dari pekerjaan dimulai hingga invoice diterbitkan:

```
[WORKSHOP — TEKNISI]
       │
       │ Input aktivitas pekerjaan secara digital
       │ (Tahap: Skiving → Buffing → ... → Painting)
       ▼
[CAMOS — Digital Job Card System]
       │
       │ Data tersimpan: material code, qty, waktu, person
       │
       ▼
[WIP REPAIR — HERO Platform]
       │
       ├── Monitor: Status WO (Progress / Complete)
       ├── Monitor: TECO Status (Pending / Done)
       ├── Monitor: MIGO Status (Pending / Done)
       ├── Monitor: Invoice & PO Mapping
       │
       ├── [EXPORT] → File Excel TECO/MIGO Queue
       │                   │
       │                   ▼
       │           [POWER AUTOMATE]
       │                   │
       │          ┌────────┴────────┐
       │          │                 │
       │          ▼                 ▼
       │    [SAP TECO]        [SAP MIGO]
       │    IW32 / CN20       MB01 / posting
       │          │                 │
       │          └────────┬────────┘
       │                   │
       │        Hasil eksekusi dikembalikan
       │                   │
       └───────────────────┘
                   │
                   │ Data PMO & Invoice terupdate
                   ▼
[WIP REPAIR — Status Updated]
       │
       │ TECO: Done ✓
       │ MIGO: Done ✓
       │ Actual Revenue & Cost: Terisi
       │
       ▼
[FINANCE TEAM]
       │
       │ Verifikasi data di WIP Repair
       │ (tanpa perlu buka SAP terpisah)
       │
       ▼
[INVOICE DITERBITKAN]
       │
       ▼
[PELANGGAN — PEMBAYARAN — CASH]
```

---

## 6. Value Proposition: Sebelum vs Sesudah

### 6.1 Transformasi Proses

| Dimensi | Kondisi Sebelum | Kondisi Sesudah |
|---|---|---|
| **Medium Pencatatan** | Kertas, pulpen, tulisan tangan | Digital, terstruktur, tersimpan otomatis |
| **Keterbacaan Data** | Bergantung tulisan teknisi, sering tidak terbaca | 100% terbaca, selalu terstruktur |
| **Kompilasi Data** | Manual oleh supervisor (jam hingga hari) | Otomatis, tersedia real-time |
| **Validasi Material Code** | Tidak ada, bergantung ingatan tim billing | Otomatis tervalidasi terhadap master catalog |
| **Input ke SAP** | Manual satu per satu oleh tim billing | Otomatis via Power Automate |
| **Akurasi Input SAP** | Rentan kesalahan ketik, perkiraan data | 100% sesuai data aktual dari sistem |
| **Lead Time TECO/MIGO** | Beberapa hari (kompilasi + antrean input) | Near-real-time setelah WO Complete |
| **Monitoring Status** | Tidak ada visibilitas | Real-time filter di WIP Repair |
| **Deteksi Billing Gap** | Tidak sistematis | Terdeteksi otomatis via filter "Sudah TECO belum Invoice" |
| **Workload Tim Billing** | Tinggi untuk data entry | Berkurang, fokus ke verifikasi & exception handling |
| **Audit Trail** | Dokumen fisik, rawan hilang | Digital, terlacak hingga level detail job per person |
| **Skalabilitas** | Terbatas oleh kapasitas input manual | Dapat menangani volume berapapun secara otomatis |

### 6.2 Perubahan Peran Tim

**Teknisi Workshop:**
Sebelum: menulis job card setelah selesai bekerja, sering tertunda.
Sesudah: input langsung di CAMOS saat bekerja, prosesnya lebih cepat dan terstruktur.

**Supervisor Workshop:**
Sebelum: mengumpulkan, memeriksa, dan mengkompilasi job card fisik.
Sesudah: memantau progress WO dari WIP Repair, melakukan verifikasi data digital.

**Tim Billing/Finance:**
Sebelum: input TECO dan MIGO ke SAP satu per satu dari rekap kertas.
Sesudah: memverifikasi hasil otomasi Power Automate, menangani exception dan koreksi.

**Management:**
Sebelum: laporan billing lag tersedia dengan delay.
Sesudah: status TECO, MIGO, dan invoice tersedia real-time di WIP Repair.

---

## 7. Fitur Teknis Kunci dalam Sistem

### 7.1 TECO & MIGO Status Detection (WIP Repair)

Sistem mendeteksi status TECO dan MIGO secara otomatis berdasarkan data yang dikembalikan dari SAP:

**Deteksi TECO:**
- Jika System Status mengandung "REL" (Released) → WO belum di-TECO (TECO Pending).
- Jika System Status tidak mengandung "REL" → WO sudah di-TECO (TECO Done).

**Deteksi MIGO:**
- Jika Actual Total Revenue sudah ada tapi Actual Total Cost belum ada → MIGO Pending.
- Jika Actual Total Revenue dan Actual Total Cost keduanya sudah ada → MIGO Done.

Filter khusus di tabel WIP Repair:
- Dropdown "Semua TECO / Sudah TECO / Belum TECO".
- Dropdown "Semua MIGO / Sudah MIGO / Belum MIGO".
- Dropdown "Semua Invoice / Sudah Invoice / Belum Invoice".

### 7.2 Copy SAP Format (Material Posting Helper)

Tombol Copy SAP tersedia di bagian detail setiap work order. Saat diklik:
1. Sistem membaca seluruh detail job order untuk WO tersebut dari CAMOS.
2. Memvalidasi setiap material terhadap master catalog (Master Barang Repair).
3. Memformat data material ke dalam struktur teks yang sesuai dengan format input SAP.
4. Menyalin teks tersebut ke clipboard.
5. Menampilkan konfirmasi: "X baris material SAP berhasil disalin".

Tim billing atau Power Automate dapat langsung menggunakan teks ini tanpa perlu ketik ulang.

### 7.3 Bulk WO Filter (WO Paste Filter)

Tim billing dapat mempaste daftar nomor WO dari email, spreadsheet, atau sistem lain ke dalam text area di WIP Repair. Sistem memfilter tabel untuk menampilkan hanya WO yang ada dalam daftar tersebut — memudahkan verifikasi batch status TECO/MIGO untuk sejumlah WO tertentu sekaligus.

### 7.4 Export Data untuk Power Automate

Export dari WIP Repair menghasilkan file Excel terstruktur dengan kolom:
- WO Number.
- Start Date dan Finish Date.
- Invoice Date.
- Actual Total Revenue.
- Actual Total Cost.
- System Status.
- PO Number dan PO Date.

Power Automate membaca file ini sebagai input queue untuk eksekusi TECO dan MIGO di SAP.

### 7.5 PMO & Invoice Mapping Update

Setelah Power Automate menyelesaikan eksekusi di SAP, data berikut diperbarui kembali di WIP Repair:
- Actual Total Revenue dari billing SAP.
- Actual Total Cost dari posting MIGO.
- System Status yang sudah terupdate.
- Nomor PO, tanggal PO, dan nama pelanggan PO.
- Nomor invoice dan tanggal invoice setelah invoice diterbitkan.

Data ini memungkinkan WIP Repair menjadi single source of truth untuk seluruh status billing setiap work order.

---

## 8. Key Performance Indicators (KPI) & Target

Keberhasilan implementasi diukur melalui indikator-indikator berikut:

### 8.1 KPI Kecepatan Proses

| KPI | Kondisi Baseline | Target |
|---|---|---|
| Lead time Job Complete → TECO Input | Beberapa hari | ≤ 1 hari kerja |
| Lead time TECO → MIGO Posting | Bergantung antrean tim billing | ≤ 1 hari kerja |
| Lead time MIGO → Invoice Terbit | Tetap (proses bisnis lain) | Tidak berubah |
| Waktu kompilasi job card per batch | Jam hingga hari | 0 (otomatis) |

### 8.2 KPI Akurasi Data

| KPI | Kondisi Baseline | Target |
|---|---|---|
| Akurasi material code dalam input MIGO | <100% (rentan salah ketik) | 100% |
| Akurasi quantity dalam input MIGO | <100% (rentan kesalahan baca) | 100% |
| Discrepancy antara job card dan billing | Ada (tidak terdeteksi sistematis) | 0 discrepancy |
| WO yang terlewat di-TECO/MIGO | Ada (tidak terpantau) | Terdeteksi dan tertangani |

### 8.3 KPI Produktivitas Tim

| KPI | Kondisi Baseline | Target |
|---|---|---|
| Waktu tim billing untuk input manual TECO/MIGO | Signifikan per periode | Berkurang ≥ 70% |
| Jumlah koreksi input SAP per bulan | Sering terjadi | Mendekati 0 |
| Persentase WO yang TECO dalam 1 hari setelah complete | Rendah | >90% |

### 8.4 KPI Finansial

| KPI | Metrik | Target |
|---|---|---|
| Days Sales Outstanding (DSO) improvement | Hari | Berkurang signifikan |
| Billing gap (WO complete belum invoice) | Jumlah WO & nilai | Mendekati 0 setiap akhir periode |
| Exception rate Power Automate | % WO gagal dieksekusi otomatis | <5% |

---

## 9. Manajemen Risiko & Mitigasi

### 9.1 Risiko Teknis

**Risiko: Power Automate gagal eksekusi (exception)**

Kemungkinan terjadi saat:
- Koneksi ke SAP terputus sementara.
- Format data SAP berubah karena update sistem.
- WO memiliki kondisi khusus yang tidak diantisipasi.

Mitigasi:
- Power Automate dilengkapi error handling dan notifikasi otomatis saat terjadi exception.
- Untuk WO yang gagal dieksekusi otomatis, tim billing menggunakan fitur **Copy SAP** di WIP Repair sebagai fallback semi-manual.
- Log eksekusi Power Automate dicatat untuk analisis pola kegagalan dan perbaikan berkala.

**Risiko: Data dari CAMOS tidak lengkap atau tidak akurat**

Mitigasi:
- Validasi material code dilakukan secara otomatis terhadap Master Barang Repair sebelum data diproses.
- WO dengan data material yang tidak valid diberi tanda khusus di WIP Repair.
- Supervisor menerima notifikasi untuk WO dengan data tidak lengkap.

### 9.2 Risiko Operasional

**Risiko: Teknisi tidak konsisten input di CAMOS**

Mitigasi:
- Supervisor memantau completeness data melalui WIP Repair secara harian.
- WO dengan nol detail pekerjaan teridentifikasi dari tombol expand yang disabled.
- SOP penggunaan CAMOS menjadi bagian dari standar kerja workshop.

**Risiko: Perubahan proses SAP (update versi atau kebijakan baru)**

Mitigasi:
- Power Automate didesain modular sehingga komponen SAP-specific bisa diupdate tanpa mengubah seluruh flow.
- Dilakukan pengujian berkala setelah setiap update SAP.

### 9.3 Risiko Bisnis

**Risiko: Resistensi pengguna terhadap perubahan workflow**

Mitigasi:
- Sosialisasi manfaat konkret bagi setiap peran (teknisi, supervisor, tim billing).
- Pendampingan intensif pada periode awal implementasi.
- Proses lama (job card kertas) dihentikan secara bertahap, bukan sekaligus, untuk masa transisi.

---

## 10. Rencana Implementasi

### Fase 1: Digitalisasi Job Card (CAMOS)

- Pelatihan teknisi menggunakan CAMOS di setiap workshop.
- Pengujian paralel: job card digital + job card kertas (untuk validasi data).
- Verifikasi bahwa data dari CAMOS masuk dengan benar ke WIP Repair.
- Penghapusan bertahap job card kertas setelah kualitas data digital terkonfirmasi.

### Fase 2: WIP Repair Monitoring & Preparation

- Konfigurasi filter TECO, MIGO, dan Invoice di WIP Repair.
- Validasi Master Barang Repair dan Master Site agar Copy SAP menghasilkan data yang benar.
- Pelatihan tim billing menggunakan filter dan fitur Export di WIP Repair.
- Pengujian Copy SAP untuk beberapa WO secara manual.

### Fase 3: Power Automate Integration

- Pengembangan dan pengujian flow Power Automate untuk TECO.
- Pengembangan dan pengujian flow Power Automate untuk MIGO.
- Pengujian end-to-end dengan data aktual (sandbox SAP dulu sebelum production).
- Go-live bertahap: mulai dengan subset WO kecil, kemudian skala penuh.

### Fase 4: Monitoring & Optimization

- Pemantauan KPI selama 3 bulan pertama post go-live.
- Analisis exception rate dan penyempurnaan flow Power Automate.
- Update Master Barang Repair secara berkala untuk menjaga akurasi validasi.
- Review proses dengan tim billing untuk identifikasi area optimasi lanjutan.

---

## 11. Stakeholder & Peran dalam Program

| Stakeholder | Peran dalam Implementasi |
|---|---|
| Tire Repair Supervisor | Champion di workshop; memastikan teknisi input CAMOS konsisten; monitoring WIP Repair harian |
| Workshop Technician | Pengguna CAMOS; input job detail setiap selesai mengerjakan tahap pekerjaan |
| Billing Team / Finance | Pengguna filter WIP Repair; verifikasi hasil Power Automate; handling exception |
| IT / System Team | Administrasi HERO platform; maintenance Power Automate flow; update Master Data |
| SAP Admin | Validasi mapping data SAP; support saat terjadi exception di transaksi SAP |
| Management | Monitor KPI melalui Dashboard WIP Repair; approval budget & resource |

---

## 12. Narasi untuk Pembuka Presentasi

Bayangkan seorang teknisi selesai mengerjakan tahap Buffing pada sebuah ban berukuran 27.00R49 milik salah satu pelanggan tambang kita. Di tangannya ada selembar kertas — job card — dengan beberapa baris yang perlu dia isi: nomor WO, material yang dia pakai, berapa kilogram compound yang digunakan, berapa menit dia mengerjakannya.

Masalahnya: tangannya berlumuran debu vulkanisir. Tulisannya, dengan hormat, hanya dia sendiri yang bisa membaca. Dan besok malam, ketika job card itu sampai ke meja tim billing, ada lima tumpukan job card serupa yang menunggu untuk diinput satu per satu ke SAP — dengan tekanan waktu dan kelelahan, dan tidak semua tulisannya bisa dibaca dengan jelas.

Inilah titik di mana potensi kesalahan billing, potensi lead time yang panjang, dan potensi friction dengan pelanggan bermula. Bukan karena siapa pun tidak bekerja keras. Tapi karena prosesnya dirancang di era kertas, sementara volume dan kompleksitas operasional kita sudah jauh melampaui era itu.

Akselerasi Chain-to-Cash adalah respons kita terhadap realitas itu. Dengan mengintegrasikan CAMOS, WIP Repair di HERO, dan Power Automate, kita memindahkan seluruh rantai proses ini dari kertas ke digital — dan dari manual ke otomatis.

---

## 13. Narasi untuk Penutup Presentasi

Program ini bukan hanya tentang mempersingkat waktu atau mengurangi pekerjaan tim billing. Ini tentang membangun fondasi operasional yang benar: data yang akurat, proses yang terukur, dan siklus bisnis yang bisa dipercepat secara sistemik.

Ketika setiap job card yang diinput di CAMOS langsung terefleksi di WIP Repair, ketika Power Automate menjalankan TECO dan MIGO di SAP tanpa perlu satu pun ketikan manual dari tim billing, ketika management bisa melihat status billing real-time di dashboard — itulah kondisi operasional yang kita tuju.

Chain-to-Cash yang lebih cepat bukan hanya tentang kas yang lebih cepat masuk. Ini tentang kepercayaan — kepercayaan pelanggan bahwa kita profesional dalam administrasi, kepercayaan tim bahwa data yang mereka input benar-benar digunakan, dan kepercayaan management bahwa sistem yang mendukung bisnis ini bisa diandalkan.

Itulah nilai sesungguhnya dari transformasi digital yang kita bangun bersama.

---

## 14. Ringkasan Eksekutif (One-Pager)

**Program:** Akselerasi Chain-to-Cash — SAP Billing Automation

**Masalah:** Job card manual menyebabkan keterlambatan input TECO/MIGO di SAP, kesalahan data billing, dan lead time panjang antara pekerjaan selesai dan invoice diterbitkan.

**Solusi:** Rantai integrasi empat komponen:
1. **CAMOS** → Digitalisasi job card di sumber, eliminasi kertas.
2. **WIP Repair (HERO)** → Central monitoring status TECO/MIGO/Invoice, filter real-time, Copy SAP Format.
3. **Export TECO/MIGO** → Data terstruktur siap sebagai input Power Automate.
4. **Power Automate** → Eksekusi otomatis TECO dan MIGO di SAP tanpa keterlibatan manual tim billing.

**Dampak:**
- Lead time input TECO/MIGO: dari beberapa hari → ≤ 1 hari kerja.
- Akurasi data billing: mendekati 100%.
- Workload tim billing: berkurang ≥ 70% untuk kegiatan data entry.
- Deteksi billing gap: otomatis melalui filter di WIP Repair.
- Cash flow: percepatan DSO yang berdampak langsung pada likuiditas.

**Stakeholder Utama:** Tire Repair Supervisor, Workshop Technician, Billing Team, IT Team, SAP Admin.

**Status:** Dalam proses implementasi bertahap.
