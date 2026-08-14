# Materi Presentasi Sosialisasi TIRECARE

## 1. Judul Presentasi

**TIRECARE: Platform Terintegrasi Tire Repair untuk Optimalisasi Produktivitas, Warranty Management, dan Warehouse Control – HERO System**

**Tema:** Digitalisasi seluruh ekosistem operasional Tire Repair — dari pencatatan work order, monitoring proses pengerjaan per tahap, dashboard produksi real-time, pengelolaan material dan gudang, hingga desain pola ban retread secara digital — agar setiap aktivitas repair tercatat, terukur, dan dapat dioptimalkan secara berkelanjutan.

**Audiens:** Management, Tire Repair Supervisor, Workshop Technician, Warehouse Admin, Tire Engineer, Finance/Billing, serta Customer dan Site Coordinator.

---

## 2. Latar Belakang

Operasional Tire Repair adalah salah satu proses paling kompleks dalam pengelolaan aset alat berat. Setiap ban yang masuk ke workshop harus melalui serangkaian tahapan pengerjaan yang terstruktur — mulai dari penerimaan, inspeksi, skiving, buffing, cementing, built-up, hingga curing dan finishing — sebelum bisa dikembalikan ke unit operasional.

Di lapangan, proses ini melibatkan banyak pihak: operator workshop, warehouse admin, supervisor, keuangan, dan pelanggan dari berbagai site. Setiap pihak membutuhkan informasi yang berbeda: status pengerjaan ban, pemakaian material, produktivitas tenaga kerja, hingga tagihan ke pelanggan.

Jika informasi ini masih dikelola melalui catatan manual, spreadsheet terpisah, atau laporan yang dibuat ad-hoc, maka visibilitas manajemen menjadi terbatas, efisiensi tidak bisa diukur secara akurat, dan pengambilan keputusan berbasis data tidak bisa dilakukan dengan cepat.

TIRECARE di HERO hadir untuk menyatukan seluruh proses ini dalam satu platform digital yang terhubung — dari data work order yang masuk dari sistem SAP/One Chitra, proses pengerjaan workshop, manajemen gudang material, hingga dashboard produksi yang memberikan gambaran lengkap kepada management.

---

## 3. Kondisi yang Sering Terjadi di Lapangan

### 3.1 Work Order Repair Tidak Terpantau Real-Time

Nomor work order repair yang masuk dari sistem SAP atau One Chitra sering hanya tercatat di spreadsheet atau papan kerja workshop. Tidak ada sistem yang bisa menampilkan status seluruh work order secara bersamaan.

Dampaknya:
- Supervisor harus mengecek satu per satu untuk mengetahui status pengerjaan setiap ban.
- Work order yang sudah lama tidak diproses bisa luput dari perhatian.
- Tidak ada visibilitas terhadap work order yang statusnya "Waiting WO" atau belum memiliki nomor WO resmi.
- Riwayat pengerjaan per ban tidak bisa ditelusuri dengan mudah.

### 3.2 Tahapan Pengerjaan Repair Tidak Terdokumentasi

Proses repair ban melewati banyak tahap (Skiving, Buffing, Dimensi Luka, Cementing, Buffing Innerliner, Install Patch, Built Up, Curing, Finishing, Painting). Tanpa sistem digital, setiap tahap hanya dicatat di form kertas atau spreadsheet yang tidak terintegrasi.

Dampaknya:
- Tidak ada rekam jejak pekerjaan per tahap yang bisa diaudit.
- Waktu pengerjaan per tahap tidak bisa diukur secara akurat.
- Pemakaian material per tahap dan per work order tidak tercatat rapi.
- Tenaga kerja yang mengerjakan setiap tahap tidak dapat ditelusuri.

### 3.3 Material Repair Tidak Terkontrol

Material yang digunakan dalam proses repair — compound, patch, cement, dan berbagai material lainnya — sering tidak dicatat penggunaannya secara sistematis.

Dampaknya:
- Tidak ada data akurat tentang material mana yang paling banyak digunakan.
- Kekurangan material sering baru diketahui saat stock habis, bukan sebelumnya.
- Data pemakaian material tidak bisa digunakan untuk estimasi biaya per work order.
- Material di gudang tidak tersinkron dengan pemakaian aktual di workshop.

### 3.4 Produktivitas Workshop Tidak Terukur

Tidak ada sistem yang merangkum berapa banyak ban yang diproduksi per bulan, per site, atau per orang. Laporan produktivitas dibuat secara manual dan membutuhkan waktu berhari-hari.

Dampaknya:
- Management tidak bisa melihat produktivitas workshop secara real-time.
- Perbandingan output antar site tidak bisa dilakukan dengan cepat.
- Target produksi tidak memiliki baseline data yang akurat.
- Identifikasi masalah performa workshop terlambat dilakukan.

### 3.5 Gudang Material Repair Tidak Terkelola Sistematis

Stock material di gudang repair sering tidak disinkronkan dengan pemakaian di workshop. Tidak ada sistem untuk mencatat barang masuk, barang keluar, dan stok minimum secara digital.

Dampaknya:
- Tidak ada peringatan otomatis saat stok mendekati batas minimum.
- Rekap mutasi barang harus dibuat manual dari catatan harian.
- Transfer material antar lokasi tidak terdokumentasi.
- Cargo manifest untuk pengiriman material tidak dibuat secara standar.

### 3.6 Data Tagihan Pelanggan Tidak Terhubung ke Work Order

Nomor invoice dan data tagihan kepada pelanggan sering dikelola terpisah dari data work order repair. Akibatnya, rekonsiliasi antara pekerjaan yang dilakukan dan tagihan yang diterbitkan menjadi lambat dan rawan kesalahan.

Dampaknya:
- Tagihan kepada pelanggan bisa tertunda karena data pekerjaan tidak lengkap.
- Data PO dan nomor invoice tidak bisa diverifikasi secara cepat.
- Revenue actual vs target tidak bisa dibandingkan secara otomatis.
- Tim finance harus meminta rekap manual dari tim workshop.

---

## 4. Tujuan TIRECARE

Tujuan utama sistem ini adalah menjadikan seluruh proses Tire Repair dapat dipantau, diukur, dan dioptimalkan dari satu platform yang terintegrasi.

Tujuan detail:

- Menyediakan monitoring work order repair yang real-time dan dapat diakses dari mana saja.
- Mendokumentasikan setiap tahap pengerjaan repair beserta material, tenaga kerja, dan waktu yang digunakan.
- Menghubungkan data work order dengan data invoice dan PO pelanggan untuk rekonsiliasi yang lebih cepat.
- Menyediakan dashboard produksi yang memudahkan management memantau output workshop per site, per periode, dan per ukuran ban.
- Mengelola stok material repair secara digital dengan peringatan stok minimum otomatis.
- Mencatat seluruh mutasi barang di gudang repair (masuk, keluar, transfer) secara tertib.
- Menyediakan alat bantu desain pola ban retread secara digital untuk menggantikan proses desain manual.
- Mengurangi ketergantungan pada catatan kertas dan spreadsheet yang tersebar di berbagai pihak.

---

## 5. Gambaran Umum Alur TIRECARE

Alur utama proses dalam TIRECARE:

1. Work order repair masuk dari sistem SAP atau One Chitra dan terdaftar di WIP Repair.
2. Supervisor memantau seluruh work order beserta status, site, brand, dan tire serial number.
3. Tim workshop mengerjakan setiap tahap repair dan mencatat detail job, material, waktu, dan person yang bertugas.
4. Material yang digunakan tercatat dan mengurangi stok di gudang repair secara otomatis.
5. Warehouse admin mencatat barang masuk dan barang keluar di modul Warehouse Repair.
6. Dashboard Repair V1 menampilkan analitik mendalam untuk supervisor dan engineer.
7. Dashboard Repair V2 menampilkan KPI produksi YTD dan MTD untuk management.
8. Setelah pekerjaan selesai, data invoice dan PO dipetakan ke work order terkait.
9. Stock Material SAP diperbarui berdasarkan data plant 2002.
10. Pattern Designer digunakan untuk merancang pola ban retread bagi kebutuhan desain tread baru.

---

## 6. Modul WIP Repair (Work In Progress Repair)

Modul WIP Repair adalah inti dari sistem TIRECARE. Di sinilah seluruh work order repair dari sistem One Chitra dapat dipantau secara real-time dengan seluruh detail pengerjaan, status, dan informasi finansial.

### 6.1 Ringkasan Metrik WIP

Halaman WIP Repair menampilkan tiga metrik utama di bagian atas:

- **Total WO Repair**: jumlah seluruh work order repair yang tersedia dari data One Chitra.
- **Status Progress**: jumlah work order yang masih berjalan dan perlu dipantau.
- **Cakupan Site / Brand**: jumlah site dan brand unik yang sedang muncul dalam WIP repair aktif.

### 6.2 Tabel Work Order Repair

Tabel utama menampilkan seluruh work order repair dengan informasi lengkap.

Kolom informasi yang tersedia:
- Nomor Work Order (WO).
- ID Work Order internal.
- Tire Serial Number (SN) ban yang sedang direpair.
- Customer atau pelanggan yang memiliki ban.
- Site lokasi ban berasal.
- Brand dan pattern ban.
- Ukuran ban (Size).
- Jenis kerusakan (Injury).
- Status pengerjaan (progress, complete, dll.).
- Storage Location (S-Loc/Store Loc).
- Tanggal terima, tanggal WO, tanggal inspeksi.

Fitur filter yang tersedia:
- Filter berdasarkan Site.
- Filter berdasarkan Brand.
- Filter berdasarkan Ukuran Ban.
- Filter berdasarkan Status Pengerjaan.
- Filter berdasarkan Jenis Kerusakan (Injury).
- Filter berdasarkan Customer.
- Filter berdasarkan Material yang digunakan.
- Filter berdasarkan Store Location.
- Filter berdasarkan Bulan.
- Pencarian teks bebas (WO, Tire SN, Customer, Site, Brand, Pattern, Injury, Size, Status).

Fitur aksi yang tersedia:
- Melihat detail lengkap setiap work order.
- Melihat breakdown tahapan pekerjaan per WO (Detail Job Order).
- Menyalin data WO ke format SAP untuk keperluan input ke sistem SAP.
- Export seluruh data WIP ke Excel.
- Update nomor invoice dan tanggal invoice pada work order.
- Update data PMO (nomor PO, tanggal PO, pelanggan PO, actual revenue, actual cost, system status).
- Update status TECO (Technical Completion) dan MIGO.

### 6.3 Detail Job Order per Work Order

Setiap work order memiliki detail tahapan pengerjaan yang bisa dilihat secara expand inline.

Tahapan pengerjaan yang dicatat:
1. Skiving — proses pengikisan area luka ban.
2. Buffing — proses pengamplasan permukaan ban.
3. Dimensi Luka — pencatatan dimensi kerusakan.
4. Cementing — aplikasi cairan adhesif.
5. Buffing Innerliner — pengamplasan lapisan dalam ban.
6. Install Patch — pemasangan patch/lapisan perbaikan.
7. Built Up — pembentukan compound baru.
8. Curing — proses vulkanisasi.
9. Finishing — tahap akhir penyempurnaan.
10. Painting — pengecatan akhir.

Informasi detail per tahap:
- Nama tahap (Job).
- Material yang digunakan.
- Kategori material.
- Jumlah (Qty) dan satuan.
- Waktu pengerjaan dalam menit.
- Tanggal pengerjaan.
- Nama person yang mengerjakan.

### 6.4 SAP Copy Helper

Fitur SAP Copy membantu operator menyalin data work order repair ke dalam format yang siap dipaste ke sistem SAP.

Manfaat:
- Mengurangi waktu input manual ke SAP.
- Mengurangi risiko salah ketik nomor WO atau material code.
- Data yang disalin sudah dalam format yang benar sesuai kebutuhan SAP.

### 6.5 Invoice & PMO Mapping

Setiap work order repair dapat dikaitkan dengan data keuangan:

- Nomor invoice dan tanggal invoice dari tim finance.
- Nomor PO dari pelanggan, tanggal PO, dan nama pelanggan PO.
- Actual Total Revenue yang sudah terealisasi.
- Actual Total Cost pengerjaan.
- System Status pekerjaan dari sisi SAP.
- Status TECO (Technical Completion) — apakah WO sudah di-TECO di SAP.
- Status MIGO — apakah pergerakan material sudah diposting.

Manfaat:
- Rekonsiliasi antara pekerjaan dan tagihan menjadi lebih cepat.
- Tim finance dapat memverifikasi status invoice secara langsung dari sistem HERO.
- Gap antara pekerjaan yang sudah selesai dan belum diinvoice terdeteksi lebih awal.

---

## 7. Modul Dashboard Repair V1

Dashboard Repair V1 adalah dashboard analitik mendalam yang menyajikan data WIP Repair dalam bentuk grafik, ranking, dan tabel ringkasan yang bisa difilter secara interaktif.

### 7.1 Tujuan Dashboard V1

Dashboard V1 dirancang untuk supervisor, engineer, dan tim operasional yang memerlukan analisis mendalam terhadap data repair — bukan hanya melihat daftar WO, tetapi memahami pola, tren, dan anomali yang perlu ditindaklanjuti.

### 7.2 Filter Global Dashboard

Dashboard V1 dilengkapi dengan filter yang mempengaruhi seluruh tampilan:
- Filter berdasarkan Bulan.
- Filter berdasarkan Site.
- Filter berdasarkan Brand.
- Filter berdasarkan Ukuran Ban.
- Filter berdasarkan Store Location.
- Filter berdasarkan Status Pengerjaan (multi-select).
- Filter berdasarkan Jenis Kerusakan (multi-select).
- Filter berdasarkan Customer (multi-select).
- Filter berdasarkan Material (multi-select).
- Pencarian teks bebas.

### 7.3 Metrik Utama dengan Sparkline

Dashboard menampilkan kartu metrik utama dengan grafik sparkline yang menunjukkan tren per bulan:
- Total Work Order aktif.
- Work Order yang sudah berjalan (Progress).
- Work Order yang sudah selesai (Complete).
- Work Order yang ditolak atau dibatalkan (Reject/Cancel).
- Jumlah site aktif.
- Jumlah brand aktif.
- Total material yang digunakan.
- Aktivitas pengerjaan bulan berjalan.

### 7.4 Tab Overview

Menyajikan gambaran ringkas kondisi seluruh WIP Repair:
- Completion Rate: persentase WO yang sudah selesai.
- Progress Rate: persentase WO yang masih berjalan.
- Workshop Aging Analysis: pembagian WO berdasarkan berapa lama sudah berada di workshop (normal ≤7 hari, warning ≤14 hari, overdue >14 hari, no date).
- Ringkasan total material rows, total menit pengerjaan, dan hari aktif workshop.
- Aktivitas terbaru: daftar WO yang baru masuk atau baru diperbarui.

### 7.5 Tab Work Orders

Analitik khusus untuk data work order:
- Distribusi WO berdasarkan status (sudah ada WO, waiting WO, WO kosong).
- Grafik tren work order per bulan.
- Ranking site berdasarkan jumlah WO.
- Ranking customer berdasarkan jumlah WO.
- WO dengan aging terlama (potensi overdue).
- Tabel detail work order yang bisa diklik untuk filter lebih lanjut.

### 7.6 Tab Site

Analitik per lokasi repair:
- Jumlah WO per site.
- Status WO per site (progress, complete, waiting WO, empty WO).
- Jumlah customer dan brand per site.
- Pemakaian material dan total waktu pengerjaan per site.
- Distribusi jenis kerusakan per site.

### 7.7 Tab Customer

Analitik per pelanggan:
- Jumlah WO per customer.
- Distribusi status WO per customer.
- Site mana saja yang dilayani per customer.
- Material yang paling banyak digunakan per customer.

### 7.8 Tab Brand & Size

Analitik berdasarkan merek dan ukuran ban:
- Distribusi WO berdasarkan brand ban.
- Distribusi WO berdasarkan ukuran ban.
- Jenis kerusakan yang paling sering terjadi per brand atau ukuran.
- Grafik pie distribusi brand.

### 7.9 Tab Material

Analitik pemakaian material:
- Material yang paling banyak digunakan (ranking).
- Pemakaian material berdasarkan store location.
- Distribusi material per kategori.
- Detail tabel material dengan quantity dan waktu pengerjaan terkait.

### 7.10 Tab Productivity (Analitik Produktivitas Tenaga Kerja)

Analitik mendalam per individu tenaga kerja:
- Jumlah job yang diselesaikan per person.
- Total waktu pengerjaan (menit) per person.
- Rata-rata waktu per job per person.
- Jumlah WO yang ditangani per person.
- Hari aktif bekerja per person.
- Jumlah material yang digunakan per person.
- Tahap pekerjaan (job) yang paling sering dikerjakan per person.
- Ranking produktivitas tenaga kerja berdasarkan waktu pengerjaan.

### 7.11 Tab Store Location

Analitik per lokasi penyimpanan:
- WO per store location (workshop mana yang paling aktif).
- Status WO per store location.
- Material yang digunakan per store location.
- Customer dan site yang terlayani per store location.

---

## 8. Modul Dashboard Repair V2 (Production Dashboard)

Dashboard Repair V2 adalah dashboard khusus untuk monitoring produksi repair — berapa banyak ban yang berhasil selesai direpair per periode, per site, dan per ukuran ban.

### 8.1 Tujuan Dashboard V2

Dashboard V2 dirancang untuk management yang membutuhkan gambaran cepat tentang output produksi workshop dalam format yang bersih, terukur, dan mudah dibandingkan.

Fokus Dashboard V2 adalah output tahap **Finishing dan Painting** yang merepresentasikan ban yang benar-benar selesai diproses.

### 8.2 Filter Periode

Dashboard V2 dilengkapi selector periode yang memungkinkan pengguna memilih bulan yang ingin ditampilkan sebagai basis MTD (Month to Date).

### 8.3 KPI Produksi Utama

Empat metrik utama di bagian atas:
- **YTD Produksi**: total ban yang selesai dari Januari hingga bulan berjalan (Year to Date).
- **MTD Produksi**: total ban yang selesai pada bulan yang dipilih.
- **Site Berproduksi**: jumlah site yang aktif menghasilkan output pada periode YTD.
- **Top Site YTD**: site dengan output produksi tertinggi sepanjang tahun berjalan.

### 8.4 Grafik YTD Production All Site

Grafik batang yang menampilkan output produksi seluruh site per bulan dari Januari hingga bulan berjalan. Dilengkapi data strip tabel numerik di bawah grafik untuk referensi angka yang akurat.

### 8.5 Grafik Average YTD Production All Site

Grafik komposit yang menampilkan:
- Batang output (Out) per site selama YTD.
- Garis average (Output ÷ jumlah bulan YTD) per site.

Membantu management melihat site mana yang konsisten berproduksi di atas rata-rata dan mana yang fluktuatif.

### 8.6 Grafik MTD Production Per Size

Grafik batang yang menampilkan output bulan berjalan dikelompokkan berdasarkan ukuran ban (tyre size). Membantu analisis apakah ada ukuran ban tertentu yang dominan dalam repair bulan ini.

### 8.7 Grafik Masing-Masing Site

Bagian ini menampilkan grafik individual per site yang menunjukkan:
- Output bulanan (batang) per site.
- Garis running average per site.

Setiap site memiliki kartu grafik tersendiri, sehingga tren produksi per site bisa dilihat dengan jelas tanpa tercampur dengan data site lain.

---

## 9. Modul Master Barang Repair

Modul Master Barang Repair adalah pusat data katalog material yang digunakan dalam proses repair dan daftar site repair yang terdaftar di sistem.

### 9.1 Katalog Material Repair

Daftar semua material yang bisa digunakan dalam proses repair dan retread, beserta informasi detailnya.

Informasi material yang dikelola:
- Kode material (material code).
- Nama material.
- UOM (Unit of Measure) atau satuan.
- Deskripsi material.

Fitur yang tersedia:
- Menambahkan material baru ke katalog.
- Mengubah informasi material.
- Menghapus material yang tidak lagi digunakan.
- Mencari material berdasarkan kode atau nama.

Manfaat:
- Setiap input material di WIP Repair bisa diverifikasi terhadap katalog yang terdaftar.
- Kode material konsisten antara sistem HERO dan SAP.
- Tidak ada material yang dicatat dengan nama berbeda-beda oleh operator yang berbeda.

### 9.2 Daftar Site Repair

Daftar semua site yang terdaftar sebagai lokasi repair aktif.

Informasi site yang dikelola:
- Kode site.
- Nama site.

Manfaat:
- Site yang terdeteksi di WIP Repair bisa diverifikasi terhadap daftar resmi.
- Normalisasi nama site memastikan data antar modul konsisten.
- Dashboard dapat mengategorikan data dengan benar berdasarkan daftar site yang valid.

---

## 10. Modul Stock Material SAP

Modul Stock Material SAP menampilkan data stok material dari sistem SAP, khusus untuk plant 2002 (Repair Warehouse).

### 10.1 Tujuan Stock Material SAP

Menyediakan visibilitas stok material repair yang bersumber dari sistem SAP secara langsung, tanpa perlu membuka SAP secara terpisah.

### 10.2 Informasi Stok yang Ditampilkan

- Material code dari SAP.
- Deskripsi material.
- Stok tersedia (unrestricted stock).
- Satuan (UOM).
- Plant dan storage location.
- Nilai material berdasarkan harga satuan yang bisa dikonfigurasi.

### 10.3 Fitur Kalkulasi Nilai Stok

Pengguna dapat mengatur harga per unit (default rate) untuk menghitung total nilai stok material. Fitur ini membantu tim keuangan mengestimasi nilai inventaris gudang repair tanpa perlu keluar dari sistem HERO.

Manfaat:
- Tim tidak perlu login ke SAP hanya untuk mengecek stok material repair.
- Nilai inventaris dapat dikalkukasi secara cepat dengan harga yang bisa disesuaikan.
- Data stok SAP tersedia berdampingan dengan data WIP Repair untuk analisis kebutuhan material.

---

## 11. Modul Pattern Designer (Retread Pattern Designer)

Pattern Designer adalah alat bantu digital untuk merancang pola ban retread secara visual, menggantikan proses desain manual yang selama ini bergantung pada gambar kerja fisik.

### 11.1 Tujuan Pattern Designer

Memberikan kemampuan kepada Tire Engineer untuk merancang, menyimpan, dan mencetak pola ban retread secara digital dengan akurasi yang lebih tinggi dibanding metode manual.

### 11.2 Fitur Pattern Designer

- **Preset Ukuran Ban**: pilih ukuran ban dari daftar preset yang sudah terdaftar, sehingga dimensi dasar otomatis terisi.
- **Desain Pola 2D Seamless**: rancang pola alur (groove) ban secara interaktif di kanvas digital.
- **Preview 3D**: lihat tampilan 3D ban dengan pola yang sudah dirancang untuk verifikasi visual sebelum dicetak.
- **Cetak Gambar Kerja A2**: hasilkan gambar kerja dalam format A2 yang bisa langsung digunakan di workshop.
- **Library Pola**: simpan pola yang sudah dibuat ke dalam library untuk digunakan kembali.
- **Load Pola Tersimpan**: buka kembali desain yang pernah disimpan untuk dimodifikasi atau dicetak ulang.

### 11.3 Manfaat Pattern Designer

- Desain pola ban tidak lagi bergantung pada gambar tangan atau software CAD yang terpisah.
- Konsistensi pola terjaga karena tersimpan secara digital dan bisa direproduksi kapan saja.
- Proses review dan approval desain lebih cepat karena engineer bisa menampilkan preview langsung.
- Gambar kerja A2 yang dihasilkan memiliki format standar yang mudah dipahami oleh teknisi workshop.

---

## 12. Modul Warehouse Repair

Modul Warehouse Repair adalah sistem manajemen gudang material repair yang lengkap — mencakup master data, pencatatan transaksi masuk dan keluar, transfer stok, laporan mutasi, hingga cargo manifest.

### 12.1 Tujuan Warehouse Repair

Menggantikan pencatatan manual di gudang repair dengan sistem digital yang memastikan setiap pergerakan material tercatat, stok selalu akurat, dan laporan tersedia secara instan.

### 12.2 Dashboard Overview Warehouse

Halaman utama Warehouse Repair menampilkan ringkasan kondisi gudang secara sekilas:
- Total item barang yang terdaftar.
- Total stok keseluruhan.
- Jumlah barang dengan stok di bawah minimum (Low Stock Alert).
- Jumlah barang aktif.

### 12.3 Master Data Barang

Daftar lengkap semua material/barang yang ada di gudang repair.

Informasi barang yang dikelola:
- Kode barang (material number).
- Material Description dari SAP.
- Nama barang.
- Category / Jenis barang.
- Satuan (UOM).
- Storage Location (S-Loc) dan deskripsinya.
- Stok aktual (Qty).
- Stok minimum.
- Status aktif/nonaktif.
- Foto produk (bisa diunggah untuk identifikasi visual).

Fitur yang tersedia:
- Menambahkan barang baru.
- Mengubah data barang.
- Menghapus barang.
- Melihat detail barang termasuk foto produk.
- Transfer stok antara storage location.
- Import barang dalam jumlah banyak dari CSV/Excel.
- Export daftar barang ke Excel.
- Filter berdasarkan jenis, satuan, dan status stok (low stock / stok aman).
- Scorecard: jumlah barang, total stok, low stock count, dan barang aktif.

### 12.4 Master Data Jenis Barang

Daftar kategori atau jenis barang yang ada di gudang repair.

Fitur yang tersedia:
- Menambahkan jenis baru.
- Mengubah nama jenis.
- Menonaktifkan jenis yang tidak lagi digunakan.
- Menghapus jenis barang.

Manfaat:
- Kategorisasi barang menjadi konsisten.
- Filter berdasarkan jenis bisa digunakan di tabel barang dan transaksi.

### 12.5 Master Data Satuan

Daftar satuan yang digunakan untuk barang di gudang (KG, Ltr, Pcs, Roll, dan lainnya).

Fitur yang tersedia:
- Menambahkan satuan baru.
- Mengubah nama satuan.
- Menonaktifkan satuan yang tidak lagi digunakan.

### 12.6 Barang Masuk (Inbound)

Modul pencatatan penerimaan material ke gudang repair.

Informasi yang dicatat per transaksi masuk:
- Nomor transaksi (auto-generated).
- Tanggal penerimaan.
- Kode dan nama barang.
- Jumlah (Qty) yang diterima.
- Keterangan tambahan.

Fitur yang tersedia:
- Mencatat penerimaan barang baru.
- Mengubah transaksi masuk yang salah input.
- Menghapus transaksi masuk.
- Melihat detail transaksi.
- Filter berdasarkan tanggal, barang, atau keterangan.
- Export laporan barang masuk.

Manfaat:
- Setiap penerimaan barang terdokumentasi dengan nomor transaksi yang unik.
- Stok otomatis bertambah setelah transaksi masuk disimpan.
- Riwayat penerimaan bisa ditelusuri kapan saja.

### 12.7 Barang Keluar (Outbound)

Modul pencatatan pengeluaran atau pemakaian material dari gudang repair.

Informasi yang dicatat per transaksi keluar:
- Nomor transaksi (auto-generated).
- Tanggal pengeluaran.
- Kode dan nama barang.
- Jumlah (Qty) yang dikeluarkan.
- Keterangan atau alasan pengeluaran.
- Bukti foto atau dokumen pendukung.

Fitur yang tersedia:
- Mencatat pengeluaran barang.
- Mengubah transaksi keluar.
- Menghapus transaksi keluar.
- Melihat detail transaksi.
- Membuat Cargo Manifest dari satu transaksi keluar.
- Membuat Cargo Manifest dari beberapa transaksi keluar sekaligus (multi-outbound).
- Export laporan barang keluar.
- Filter dan pencarian transaksi.

### 12.8 Transfer Stok

Fitur transfer memungkinkan pemindahan stok barang dari satu storage location ke storage location lain dalam sistem.

Manfaat:
- Redistribusi material antar lokasi gudang terdokumentasi.
- Tidak ada perbedaan antara stok fisik dan stok di sistem karena transfer tercatat.

### 12.9 Cargo Manifest

Fitur Cargo Manifest memungkinkan pembuatan dokumen manifest pengiriman material dari gudang repair ke site atau workshop.

Fitur yang tersedia:
- Membuat cargo manifest dari satu transaksi keluar.
- Membuat cargo manifest dari beberapa transaksi keluar sekaligus.
- Menampilkan manifest dalam format dokumen PDF yang bisa dicetak.
- Menyimpan riwayat cargo manifest yang pernah dibuat.

Manfaat:
- Pengiriman material ke site memiliki dokumen resmi yang terstandar.
- Driver dan penerima memiliki referensi yang jelas tentang apa yang dikirim.
- Riwayat pengiriman tersimpan dan bisa diaudit.

### 12.10 Laporan Stok

Laporan stok menampilkan kondisi stok seluruh barang di gudang pada saat laporan diakses.

Informasi yang tersedia:
- Daftar lengkap semua barang dengan stok saat ini.
- Highlight barang yang stoknya di bawah minimum.
- Stok berdasarkan storage location.
- Export laporan ke Excel.

### 12.11 Laporan Barang Masuk & Keluar

Laporan historis mutasi barang masuk dan keluar dalam rentang waktu tertentu.

Informasi yang tersedia:
- Daftar transaksi masuk atau keluar dengan detail lengkap.
- Filter berdasarkan periode, barang, atau kategori.
- Export ke Excel untuk keperluan rekonsiliasi atau audit.

---

## 13. Integrasi Antar Modul TIRECARE

TIRECARE bukan kumpulan modul yang berdiri sendiri. Setiap bagian terhubung satu sama lain untuk menciptakan ekosistem data yang konsisten.

Contoh integrasi:

- Data WO dari One Chitra/SAP masuk ke WIP Repair dan menjadi sumber data Dashboard V1 dan V2.
- Detail job order per WO mencatat pemakaian material yang bereferensi ke Master Barang Repair.
- Master site di Master Barang Repair digunakan untuk normalisasi nama site di Dashboard V1 dan V2.
- Data invoice dan PO yang dipetakan ke WO di WIP Repair langsung dapat dikroscek oleh tim finance.
- Barang keluar di Warehouse Repair dapat dikaitkan dengan nomor WO untuk traceability material.
- Cargo Manifest dibuat berdasarkan transaksi barang keluar dari Warehouse Repair.
- Stok material di Warehouse Repair dapat dibandingkan dengan data Stock Material SAP untuk rekonsiliasi.
- Pattern yang dirancang di Pattern Designer disimpan di library dan bisa dikaitkan dengan jenis repair tertentu.

Manfaat integrasi:

- Data material konsisten antara workshop, gudang, dan SAP.
- Supervisor dan management mendapatkan informasi dari satu sumber kebenaran yang sama.
- Rekonsiliasi antara pekerjaan, material, dan tagihan menjadi lebih cepat.

---

## 14. Peran Pengguna dalam Sistem

### 14.1 Tire Repair Supervisor / Engineer

Peran utama:
- Memantau seluruh WIP Repair dari halaman utama dan Dashboard V1.
- Menganalisis produktivitas tenaga kerja melalui Tab Productivity.
- Mengidentifikasi work order yang overdue atau berpotensi masalah.
- Memperbarui status TECO dan MIGO pada work order yang sudah selesai.
- Merancang pola ban baru menggunakan Pattern Designer.

### 14.2 Workshop Operator / Teknisi

Peran utama:
- Mengisi detail tahapan pekerjaan pada setiap work order.
- Mencatat material yang digunakan per tahap.
- Mencatat waktu pengerjaan per tahap.
- Memperbarui status work order sesuai perkembangan aktual.

### 14.3 Warehouse Admin

Peran utama:
- Mengelola master data barang, jenis, dan satuan di Warehouse Repair.
- Mencatat setiap penerimaan barang (Barang Masuk).
- Mencatat setiap pengeluaran barang (Barang Keluar).
- Membuat Cargo Manifest untuk pengiriman material ke site.
- Memantau stok minimum dan melaporkan kebutuhan reorder.
- Melakukan sinkronisasi data antara Warehouse Repair dan Stock Material SAP.

### 14.4 Finance / Billing

Peran utama:
- Memverifikasi data invoice yang terpetakan ke work order repair.
- Memantau status TECO dan MIGO sebagai syarat penerbitan invoice.
- Melihat data actual revenue dan actual cost per work order.
- Mencocokkan nomor PO dari pelanggan dengan data di sistem.
- Menggunakan laporan WIP Repair sebagai dasar rekonsiliasi tagihan.

### 14.5 Management

Peran utama:
- Memantau KPI produksi melalui Dashboard V2 (YTD, MTD, top site, per size).
- Menggunakan Dashboard V1 untuk analisis mendalam bila diperlukan.
- Memantau aging workshop dan identifikasi bottleneck.
- Membuat keputusan terkait kapasitas site, penambahan tenaga, atau pengadaan material berdasarkan data.

---

## 15. Manfaat Utama untuk Perusahaan

### 15.1 Visibilitas Penuh atas Proses Repair

Setiap work order, setiap tahap pengerjaan, dan setiap pemakaian material terdokumentasi di satu sistem yang bisa diakses oleh semua pihak terkait.

### 15.2 Pengukuran Produktivitas yang Akurat

Dashboard produksi menampilkan berapa banyak ban yang selesai direpair per site, per bulan, dan per ukuran — tanpa perlu laporan manual dari workshop.

### 15.3 Kontrol Material yang Lebih Ketat

Warehouse Repair memastikan setiap pergerakan material tercatat dengan nomor transaksi, stok minimum terpantau, dan laporan mutasi tersedia secara instan.

### 15.4 Rekonsiliasi Tagihan yang Lebih Cepat

Data work order, invoice, dan PO tersimpan dalam satu ekosistem sehingga tim finance dapat mencocokkan pekerjaan dengan tagihan tanpa meminta rekap manual dari workshop.

### 15.5 Analisis Tenaga Kerja Berbasis Data

Tab Productivity di Dashboard V1 memberikan data kuantitatif tentang kontribusi setiap individu — berapa job yang diselesaikan, berapa waktu yang digunakan, dan tahap apa yang paling banyak dikerjakan.

### 15.6 Identifikasi Masalah Lebih Awal

Fitur aging analysis membantu tim mengidentifikasi work order yang sudah terlalu lama di workshop sebelum menjadi masalah yang lebih besar.

### 15.7 Standarisasi Desain Pola Ban

Pattern Designer memastikan desain pola ban retread tersimpan secara digital dan bisa diproduksi ulang dengan konsistensi yang lebih tinggi dibanding metode manual.

---

## 16. Perbandingan Sebelum dan Sesudah TIRECARE

| Aspek | Sebelum TIRECARE | Dengan TIRECARE |
| --- | --- | --- |
| Monitoring WO Repair | Dicek satu per satu di SAP atau spreadsheet | Dashboard real-time dengan filter multi-dimensi |
| Detail tahap pengerjaan | Form kertas, tidak terintegrasi | Dicatat per WO dengan material, waktu, dan person |
| Tracking Tire SN | Manual di buku atau Excel | Terintegrasi dengan WO dan bisa dicari secara instan |
| Invoice & PO mapping | Rekonsiliasi manual antara tim workshop dan finance | Dipetakan langsung ke WO di sistem |
| Produktivitas workshop | Laporan manual, dibuat akhir bulan | Dashboard V1 & V2 menampilkan data real-time |
| KPI produksi per site | Dikumpulkan dari tiap site secara terpisah | Dashboard V2 menampilkan YTD/MTD semua site sekaligus |
| Stok material gudang | Buku stok manual atau spreadsheet terpisah | Sistem digital dengan alert stok minimum |
| Barang masuk/keluar | Dicatat di catatan atau Excel | Transaksi bernomor dengan riwayat yang bisa ditelusuri |
| Cargo manifest | Dibuat manual, tidak standar | Dihasilkan otomatis dari transaksi barang keluar |
| Desain pola ban | Gambar tangan atau CAD terpisah | Pattern Designer digital dengan library dan preview 3D |
| Data SAP material | Harus login ke SAP untuk cek stok | Tersedia di HERO dengan kalkulasi nilai stok |
| Laporan management | Dikumpulkan dan disusun manual | Tersedia di dashboard secara real-time |

---

## 17. Contoh Skenario Penggunaan

### 17.1 Supervisor Memantau WO Overdue

1. Supervisor membuka halaman WIP Repair.
2. Memilih filter Status = "Progress" dan bulan berjalan.
3. Membuka Dashboard V1, Tab Work Orders.
4. Melihat bagian Workshop Aging: ada beberapa WO dengan aging > 14 hari (overdue).
5. Mengklik WO tersebut untuk melihat detail dan melakukan tindak lanjut.

### 17.2 Operator Mencatat Progress Pengerjaan Ban

1. Operator membuka WO yang ditugaskan di halaman WIP Repair.
2. Memperluas detail WO untuk melihat tahapan yang sudah dan belum dikerjakan.
3. Menginput detail job: nama tahap, material yang digunakan, qty, waktu, dan tanggal.
4. Menyimpan data; supervisor bisa langsung melihat progress di dashboard.

### 17.3 Finance Melakukan Rekonsiliasi Invoice

1. Finance membuka WIP Repair dan memfilter WO yang status TECO = Done.
2. Memeriksa apakah nomor invoice sudah diisi untuk setiap WO yang sudah TECO.
3. Mengisi nomor invoice dan tanggal invoice untuk WO yang belum tercatat.
4. Memverifikasi actual revenue vs PO yang diterima dari pelanggan.

### 17.4 Management Melihat KPI Produksi Bulanan

1. Management membuka Dashboard Repair V2.
2. Memilih periode bulan yang ingin dilihat.
3. Melihat KPI YTD dan MTD di bagian atas.
4. Melihat grafik output per site untuk identifikasi site yang under-performing.
5. Membandingkan output per site dengan average untuk mengidentifikasi gap.

### 17.5 Warehouse Admin Mencatat Barang Masuk

1. Admin membuka modul Warehouse Repair, halaman Barang Masuk.
2. Membuat transaksi masuk baru.
3. Memilih kode barang dari daftar master.
4. Mengisi tanggal penerimaan, jumlah, dan keterangan.
5. Menyimpan transaksi; stok barang otomatis bertambah.
6. Export laporan barang masuk untuk rekonsiliasi dengan tagihan supplier.

### 17.6 Warehouse Admin Membuat Cargo Manifest

1. Admin membuka halaman Barang Keluar dan membuat transaksi pengeluaran untuk material yang akan dikirim ke site.
2. Setelah transaksi tersimpan, mengklik opsi "Buat Cargo Manifest".
3. Sistem menampilkan preview cargo manifest dalam format dokumen.
4. Admin mencetak manifest untuk diberikan kepada driver dan penerima di site.

---

## 18. Poin Sosialisasi untuk Pengguna

Hal penting yang perlu disampaikan saat sosialisasi:

- Setiap work order repair yang datang dari SAP harus dipantau statusnya di WIP Repair HERO.
- Detail tahap pengerjaan harus diinput secara lengkap agar dashboard produktivitas dapat memberikan data yang akurat.
- Material yang digunakan di setiap tahap wajib dicatat agar pemakaian material terukur.
- Status TECO dan MIGO harus diperbarui sesuai kondisi aktual di SAP agar rekonsiliasi finance bisa dilakukan.
- Setiap penerimaan dan pengeluaran barang di gudang repair wajib dicatat melalui sistem, bukan di buku manual.
- Stok minimum untuk setiap barang harus ditetapkan agar sistem bisa memberikan peringatan tepat waktu.
- Cargo manifest untuk pengiriman material harus dibuat dari sistem, bukan dari template Word.
- Laporan produksi yang akurat hanya bisa dihasilkan jika data work order dan detail job diinput dengan disiplin.

---

## 19. Indikator Keberhasilan Implementasi

Implementasi TIRECARE dapat dianggap berhasil jika:

- Seluruh work order repair aktif sudah terdaftar dan terpantau di WIP Repair.
- Detail tahap pengerjaan (Skiving hingga Painting) diinput untuk setiap WO.
- Data invoice dan PO terpetakan ke setiap WO yang sudah selesai.
- Status TECO dan MIGO mencerminkan kondisi aktual di SAP.
- Semua barang gudang repair terdaftar di master data Warehouse Repair.
- Transaksi barang masuk dan keluar dicatat secara real-time, bukan direkap akhir bulan.
- Cargo manifest untuk pengiriman ke site dibuat dari sistem.
- Management menggunakan Dashboard V2 untuk monitoring produksi bulanan.
- Supervisor menggunakan Dashboard V1 untuk analisis operasional mingguan.
- Stok material di sistem konsisten dengan stok fisik di gudang.

---

## 20. Risiko Jika Sistem Tidak Digunakan Konsisten

Jika penggunaan TIRECARE tidak konsisten, risiko berikut tetap ada:

- Work order yang tidak diupdate menyebabkan dashboard menampilkan data yang tidak akurat.
- Tahap pengerjaan yang tidak dicatat membuat analisis produktivitas tidak bisa dilakukan.
- Pemakaian material yang tidak dicatat menyebabkan ketidaksesuaian antara stok sistem dan stok fisik.
- Invoice yang tidak dipetakan ke WO memperlambat proses rekonsiliasi tagihan.
- Transaksi barang masuk/keluar yang tidak diinput menyebabkan stok sistem tidak akurat.
- Cargo manifest yang tidak dibuat dari sistem menyebabkan pengiriman tidak terdokumentasi standar.
- Dashboard tidak bisa diandalkan jika data dari workshop tidak diinput dengan disiplin.

Oleh karena itu, komitmen seluruh pengguna untuk menginput data secara real-time dan lengkap adalah kunci agar TIRECARE memberikan manfaat maksimal.

---

## 21. Rekomendasi Cara Sosialisasi

Agenda sosialisasi yang disarankan:

1. Pembukaan: latar belakang dan tujuan digitalisasi Tire Repair melalui TIRECARE.
2. Penjelasan kondisi yang sering terjadi di lapangan dan dampaknya terhadap efisiensi.
3. Gambaran umum alur TIRECARE dari WO masuk hingga dashboard produksi.
4. Demo Modul WIP Repair: tampilan WO, filter, detail job, dan SAP copy.
5. Demo Update Invoice dan PMO Mapping pada WO.
6. Demo Dashboard Repair V1: overview, tabs, dan cara membaca analytics.
7. Demo Dashboard Repair V2: KPI produksi, grafik per site, dan filter periode.
8. Demo Master Barang Repair dan Stock Material SAP.
9. Demo Pattern Designer: cara membuat dan menyimpan desain pola.
10. Demo Warehouse Repair: barang masuk, barang keluar, dan cargo manifest.
11. Penjelasan peran masing-masing pengguna dan tanggung jawabnya.
12. Tanya jawab dan diskusi kendala yang mungkin dihadapi.
13. Kesepakatan SOP penggunaan sistem yang akan diterapkan setelah sosialisasi.

---

## 22. Narasi Singkat untuk Pembuka Presentasi

Tire Repair adalah salah satu proses paling teknis dan padat data dalam operasional pemeliharaan ban. Setiap ban yang masuk ke workshop membawa riwayatnya sendiri — dari siapa pelanggannya, di site mana ban itu berasal, jenis kerusakannya, berapa lama sudah di workshop, material apa saja yang sudah dipakai, dan kapan ban itu bisa dikembalikan ke lapangan.

Jika informasi ini tersebar di catatan workshop, spreadsheet terpisah, dan pesan WhatsApp, maka tidak ada yang bisa melihat gambaran utuh dengan cepat. Supervisor harus bertanya ke operator. Operator harus mencari catatan harian. Management harus menunggu laporan akhir bulan.

TIRECARE di HERO hadir untuk mengakhiri fragmentasi informasi ini. Dengan satu platform yang mengintegrasikan WIP Repair, Dashboard Produksi, Manajemen Gudang, dan Pattern Designer, setiap pihak — dari teknisi di workshop hingga management di kantor — bisa mengakses informasi yang mereka butuhkan kapan pun dan dari mana pun.

---

## 23. Narasi Singkat untuk Penutup Presentasi

TIRECARE adalah sistem, dan seperti semua sistem, manfaatnya hanya bisa dirasakan jika digunakan dengan disiplin.

Setiap tahap pengerjaan yang dicatat, setiap material yang dicatat, setiap barang masuk dan keluar yang diinput — semua itu adalah kontribusi nyata kepada data yang lebih akurat, dashboard yang lebih tepercaya, dan keputusan yang lebih baik.

Workshop yang disiplin dalam input data akan segera merasakan manfaatnya: tidak ada lagi permintaan rekap mendadak dari management, tidak ada lagi perbedaan antara stok fisik dan stok sistem, tidak ada lagi work order yang terlupakan karena tidak terpantau.

Mari jadikan TIRECARE sebagai cara kerja baru — bukan beban tambahan, tetapi alat yang membantu kita bekerja lebih cerdas dan lebih terukur setiap harinya.

---

## 24. Ringkasan Pesan Utama

- TIRECARE menyatukan seluruh ekosistem Tire Repair dalam satu platform digital yang terintegrasi.
- Tujuh modul utama: **WIP Repair**, **Dashboard Repair V1**, **Dashboard Repair V2**, **Master Barang Repair**, **Stock Material SAP**, **Pattern Designer**, dan **Warehouse Repair**.
- Masalah utama proses manual adalah data tersebar, produktivitas tidak terukur, stok tidak terkontrol, dan rekonsiliasi tagihan lambat.
- WIP Repair memastikan setiap work order terpantau dari masuk hingga selesai, lengkap dengan detail tahap dan informasi finansial.
- Dashboard V1 memberikan analitik mendalam untuk supervisor; Dashboard V2 memberikan KPI produksi yang bersih untuk management.
- Warehouse Repair mendigitalisasi seluruh operasional gudang material repair secara lengkap.
- Pattern Designer memungkinkan desain pola ban retread dilakukan secara digital dan konsisten.
- Kunci keberhasilan adalah disiplin input data oleh seluruh pengguna di setiap level operasional.
