# Materi Sosialisasi Modul Training & ChitraLearning

## 1. Tujuan Sosialisasi

Materi ini menjelaskan ekosistem Training di HERO dan ChitraLearning sebagai platform LMS perusahaan. Fokus sosialisasi adalah bagaimana karyawan, HC/Admin, atasan, dan manajemen memakai fitur untuk mengelola riwayat pelatihan, memantau sertifikasi, mengikuti pembelajaran online, dan memastikan masa berlaku kompetensi tetap terkontrol.

## 2. Gambaran Besar Ekosistem Training

Ekosistem Training di HERO terdiri dari beberapa bagian utama:

- **Training Records** untuk menyimpan riwayat pelatihan karyawan.
- **Training Dashboard** untuk melihat ringkasan, cakupan, dan risiko expiry.
- **SIO/POP/POM Certification** untuk mengelola sertifikat operasional dan masa berlaku.
- **Mobile Training** untuk akses mandiri karyawan melalui tampilan mobile.
- **ChitraLearning LMS** untuk pembelajaran online, progress kursus, nilai, dan sinkronisasi hasil belajar ke HERO.

Tujuan akhirnya adalah satu data training yang rapi, mudah dicek, dan bisa dipakai untuk kebutuhan operasional, compliance, audit, dan pengembangan kompetensi karyawan.

## 3. Pengguna Utama

- **Karyawan**: melihat riwayat training, mengikuti kursus di ChitraLearning, memantau progress dan status training pribadi.
- **HC/Admin**: mengelola data training, import data, validasi sertifikat, memantau expiry, dan menjaga kelengkapan data.
- **Section Head/Atasan**: menerima reminder terkait sertifikat atau kompetensi yang akan expired.
- **Manajemen**: membaca dashboard untuk melihat coverage training, progress pembelajaran, dan risiko compliance.

## 4. Modul Training Records

Training Records adalah pusat data riwayat pelatihan karyawan. Data yang masuk dapat berasal dari input manual, import file, external training, maupun hasil pembelajaran yang selesai di ChitraLearning.

### 4.1 Fungsi Utama

- Menyimpan riwayat training per karyawan.
- Menghubungkan data training dengan master karyawan di User Management.
- Menampilkan training berdasarkan karyawan, department, section, dan tahun.
- Memantau status training: valid, akan expired, expired, atau tanpa expiry.
- Menjadi referensi untuk audit kompetensi dan compliance.
- Menjadi sumber informasi training yang dapat dilihat dari mobile.

### 4.2 Data Yang Ditampilkan

Setiap record training dapat memuat:

- Nama karyawan.
- SN/NIK karyawan.
- Department dan section.
- Nama training.
- Provider atau sumber training.
- Tahun penyelesaian.
- Tanggal expired jika ada.
- Status training.

### 4.3 Fitur Filter

Pengguna dapat memfilter data berdasarkan:

- Karyawan.
- Department.
- Section.
- Tahun.
- Preset tahun berjalan.
- Preset fokus operasi.

Filter ini membantu HC/Admin mencari data dengan cepat tanpa harus membuka semua data sekaligus.

### 4.4 Tampilan Grouped Table

Data training dikelompokkan berdasarkan karyawan agar lebih mudah dibaca.

Fitur dalam tabel:

- Baris utama menampilkan nama karyawan, SN, role, department, dan ringkasan jumlah training.
- Baris dapat dibuka untuk melihat detail training karyawan.
- Detail menampilkan nama training, provider, tahun, expiry, status, dan sisa hari.
- Status dibedakan agar risiko expiry mudah terlihat.
- Admin dapat melakukan aksi pengelolaan sesuai hak akses.

### 4.5 Manfaat Untuk Operasional

- HC/Admin tidak perlu mencari training per file terpisah.
- Atasan dapat mengetahui karyawan mana yang perlu refresh training.
- Risiko training expired bisa dipantau lebih awal.
- Riwayat training lebih siap untuk audit internal maupun eksternal.

## 5. Training Dashboard

Training Dashboard adalah tampilan ringkasan untuk membaca kondisi training secara cepat.

### 5.1 KPI Utama

Dashboard menampilkan indikator seperti:

- Total training aktif dan valid.
- Training yang akan expired.
- Training yang sudah expired.
- Total record training.
- Jumlah karyawan yang tercakup.
- Training tanpa expiry.

### 5.2 Analisa Yang Tersedia

Dashboard membantu menjawab pertanyaan:

- Training apa yang paling banyak dimiliki karyawan?
- Department mana yang coverage training-nya tinggi atau rendah?
- Training mana yang paling banyak akan expired?
- Berapa banyak training yang berasal dari ChitraLearning dibanding external training?
- Karyawan mana yang butuh perhatian karena expiry dekat?

### 5.3 Kegunaan Manajemen

Untuk manajemen, dashboard dapat dipakai sebagai bahan:

- Review kesiapan kompetensi.
- Monitoring compliance operasional.
- Perencanaan refresh training.
- Evaluasi program pengembangan karyawan.

## 6. Import dan Export Data Training

Fitur import/export membantu HC/Admin memasukkan data training dalam jumlah besar.

### 6.1 Format Import

Import mendukung file:

- CSV.
- XLSX.
- XLS.

Kolom yang umum digunakan:

- SN/NIK.
- Nama karyawan.
- Email.
- Department.
- Nama training.
- Provider.
- Tahun.
- Expired At.
- Status.

### 6.2 Alur Import

Alur import:

1. Download contoh template.
2. Isi data training sesuai kolom.
3. Upload file atau paste data.
4. Preview data sebelum diproses.
5. Sistem mencocokkan karyawan berdasarkan SN, email, atau nama.
6. Sistem memvalidasi tahun, expiry, dan status.
7. Sistem menampilkan hasil: data baru, data update, dan data skip.

### 6.3 Best Practice Import

- Gunakan SN/NIK sebagai identitas utama.
- Pastikan email sesuai dengan User Management.
- Hindari nama training yang berbeda-beda untuk training yang sama.
- Isi expiry date jika training memiliki masa berlaku.
- Review data skip setelah import.

## 7. Sinkronisasi ChitraLearning ke Training Records

HERO memiliki sinkronisasi antara ChitraLearning dan Training Records.

### 7.1 Cara Kerja Sinkronisasi

Ketika karyawan menyelesaikan kursus di ChitraLearning, data kursus yang selesai dapat masuk ke Training Records sebagai riwayat training.

Data yang tersinkron:

- Nama kursus.
- Karyawan pemilik progress.
- Provider sebagai Chitra Learning LMS.
- Tahun penyelesaian.
- Status valid.

### 7.2 Syarat Kursus Masuk Training Records

Kursus dianggap selesai jika:

- Progress sudah 100%, atau
- Status kursus selesai, atau
- Status kursus lulus.

### 7.3 Manfaat Sinkronisasi

- Karyawan tidak perlu melaporkan manual setiap kursus yang selesai.
- HC/Admin tidak perlu input ulang data dari LMS.
- Riwayat pembelajaran online langsung menjadi bagian dari data training.
- Dashboard training dapat membaca kontribusi learning online.

## 8. Modul SIO/POP/POM Certification

Modul SIO/POP/POM digunakan untuk mengelola sertifikasi operasional yang memiliki masa berlaku.

### 8.1 Jenis Sertifikasi

Data sertifikasi dapat mencakup:

- SIO.
- POP.
- POM.
- Sertifikasi lain yang relevan dengan operasional.

### 8.2 Fitur Workspace Sertifikasi

Fitur yang tersedia:

- Tambah sertifikat baru.
- Edit data sertifikat.
- Hapus data sertifikat jika diperlukan.
- Import data sertifikat.
- Filter berdasarkan tipe sertifikat.
- Kelompokkan data berdasarkan karyawan.
- Lihat status aktif, akan expired, dan expired.

### 8.3 Data Sertifikat

Data yang dapat dikelola:

- Karyawan pemilik sertifikat.
- Tipe sertifikat.
- Nama sertifikat.
- Nomor sertifikat jika tersedia.
- Tanggal terbit.
- Tanggal expired.
- Status.
- Keterangan pendukung.

### 8.4 Dashboard SIO/POP/POM

Dashboard sertifikasi menampilkan:

- Total sertifikat.
- Sertifikat aktif.
- Sertifikat akan expired.
- Sertifikat expired.
- Distribusi berdasarkan tipe sertifikat.
- Coverage berdasarkan department.
- Daftar sertifikat yang perlu ditindaklanjuti.

### 8.5 Reminder Expiry Sertifikasi

Sistem menyediakan reminder untuk sertifikat yang akan expired.

Fitur reminder:

- Reminder 60 hari sebelum expired.
- Reminder 30 hari sebelum expired.
- Preview penerima sebelum dikirim.
- Penerima utama Section Head.
- CC dapat dikonfigurasi.
- Validasi jika atasan atau email belum lengkap.
- Template email dapat dipreview.

### 8.6 Manfaat Modul Sertifikasi

- Mengurangi risiko sertifikasi operasional terlewat expired.
- Membantu atasan menyiapkan refresh atau perpanjangan lebih awal.
- Menjaga kesiapan compliance di site dan department.
- Memudahkan audit sertifikasi.

## 9. Mobile Training

Mobile Training dibuat agar karyawan dapat mengecek riwayat training dari perangkat mobile.

### 9.1 Fitur Mobile Training

- Melihat total record training.
- Melihat jumlah tahun training.
- Melihat training yang akan segera expired.
- Riwayat training dikelompokkan berdasarkan tahun.
- Setiap record menampilkan nama training, provider, status, expiry, dan sisa hari.
- Data dari ChitraLearning yang sudah selesai dapat terlihat sebagai bagian dari riwayat training.

### 9.2 Manfaat Untuk Karyawan

- Karyawan dapat mengecek training pribadi tanpa menghubungi admin.
- Karyawan tahu training mana yang masih valid dan mana yang perlu diperbarui.
- Riwayat pelatihan lebih mudah ditunjukkan saat dibutuhkan.

## 10. ChitraLearning LMS

ChitraLearning adalah platform LMS perusahaan untuk pembelajaran online, sertifikasi, dan pengembangan kompetensi karyawan. Di HERO, ChitraLearning terhubung dengan modul Training agar progress belajar dan hasil penyelesaian kursus dapat dipantau secara terpusat.

### 10.1 Posisi ChitraLearning Dalam HERO

ChitraLearning berperan sebagai:

- Portal pembelajaran mandiri karyawan.
- Tempat karyawan mengakses kursus dan modul online.
- Sumber progress belajar, status kursus, dan nilai.
- Sumber data training otomatis ketika kursus selesai.
- Pendukung dashboard learning dan training di HERO.

### 10.2 Akses Instan ke LMS

Pengguna dapat membuka ChitraLearning dari HERO melalui tombol:

- **Mulai Belajar di LMS**.
- **Sync & Buka LMS**.

Manfaat akses instan:

- Karyawan dapat langsung masuk ke portal pembelajaran.
- Proses belajar lebih cepat karena akses tersedia dari HERO.
- Pengalaman pengguna lebih sederhana karena tidak perlu berpindah alur manual.

### 10.3 Dashboard ChitraLearning di HERO

Dashboard ChitraLearning menampilkan ringkasan pembelajaran seluruh karyawan.

KPI yang tersedia:

- Total kursus terdaftar.
- Jumlah karyawan yang belajar.
- Jumlah modul yang terselesaikan.

Dashboard ini membantu HC/Admin dan manajemen melihat aktivitas learning secara menyeluruh.

### 10.4 Workspace Progress Kursus

Workspace progress kursus menampilkan data pembelajaran karyawan berdasarkan kursus.

Fitur utama:

- Kursus dikelompokkan sebagai baris utama.
- Setiap kursus dapat dibuka untuk melihat daftar karyawan yang mengikuti.
- Setiap karyawan menampilkan SN, department, tanggal mulai, tanggal selesai, progress, status, dan nilai akhir.
- Progress ditampilkan dalam persentase.
- Rata-rata progress kursus ditampilkan per kursus.
- Jumlah karyawan yang sudah selesai ditampilkan per kursus.

### 10.5 Status Pembelajaran

Status pembelajaran membantu membaca posisi karyawan dalam kursus.

Contoh status:

- **Selesai**: kursus sudah completed atau passed.
- **Sedang Belajar**: kursus sedang berjalan atau karyawan sudah enrolled.
- **Gagal**: kursus atau evaluasi belum memenuhi syarat.
- **Status lain**: mengikuti status yang tersedia dari progress kursus.

### 10.6 Nilai Akhir dan Progress

Setiap kursus dapat menampilkan:

- Progress dalam persen.
- Nilai akhir jika tersedia.
- Tanggal mulai.
- Tanggal selesai.

Informasi ini membantu HC/Admin melihat bukan hanya siapa yang sudah ikut, tetapi juga seberapa jauh pembelajaran berjalan.

### 10.7 Detail Kurikulum dan Progress Belajar

Pengguna dengan akses dashboard dapat membuka detail progress kursus.

Detail yang ditampilkan:

- Section atau bagian kursus.
- Jumlah materi dalam setiap section.
- Materi pembelajaran.
- Quiz atau evaluasi.
- Status materi: belum mulai, sedang berjalan, selesai, atau lulus.
- Score untuk quiz jika tersedia.

Fitur ini berguna saat perlu mengecek progress detail, bukan hanya status akhir kursus.

### 10.8 ChitraLearning di Mobile

Mobile LMS memungkinkan karyawan melihat progress belajar pribadi dari perangkat mobile.

Fitur mobile:

- Profil belajar karyawan.
- Total kursus.
- Jumlah kursus selesai.
- Rata-rata progress.
- Tombol Mulai Belajar di LMS.
- Daftar kursus yang diikuti.
- Progress per kursus.
- Nilai per kursus.
- Status belajar.
- Detail kurikulum per kursus.

Untuk akses tertentu, Super Admin dapat memilih karyawan lain untuk melihat progress LMS dari mobile.

### 10.9 Sinkronisasi LMS ke Riwayat Training

Saat kursus selesai di ChitraLearning, HERO dapat menyimpan hasilnya sebagai Training Record.

Dampak untuk karyawan:

- Riwayat kursus online masuk ke histori training.
- Training yang selesai lebih mudah dibuktikan.
- Data pembelajaran bisa dilihat dari mobile Training.

Dampak untuk HC/Admin:

- Tidak perlu input ulang semua kursus online.
- Dashboard training lebih lengkap.
- Data LMS dan training menjadi satu ekosistem.

### 10.10 Kondisi Koneksi Terbatas

Jika koneksi ke ChitraLearning sedang terbatas, HERO tetap menyediakan akses untuk membuka portal LMS. Namun progress real-time dapat belum tampil atau belum diperbarui sampai koneksi kembali normal.

Yang perlu disampaikan ke user:

- Karyawan tetap bisa mencoba membuka LMS dari tombol yang tersedia.
- Jika progress belum muncul, cek kembali setelah koneksi normal.
- Untuk kebutuhan data resmi, HC/Admin dapat melakukan pengecekan ulang setelah sinkronisasi berjalan.

## 11. Alur Operasional Yang Disarankan

### 11.1 Untuk Karyawan

1. Buka HERO mobile.
2. Masuk ke menu LMS Chitra Learning.
3. Tekan Mulai Belajar di LMS.
4. Ikuti kursus yang tersedia.
5. Cek progress, nilai, dan status kursus.
6. Setelah kursus selesai, cek riwayat di Mobile Training.

### 11.2 Untuk HC/Admin

1. Buka Training Records.
2. Review data berdasarkan department, section, atau tahun.
3. Import external training jika ada data massal.
4. Cek dashboard untuk melihat coverage dan expiry.
5. Buka ChitraLearning dashboard untuk melihat progress kursus online.
6. Review SIO/POP/POM untuk sertifikasi operasional.
7. Kirim reminder untuk sertifikat yang akan expired.

### 11.3 Untuk Section Head/Atasan

1. Pantau reminder sertifikasi yang diterima.
2. Tindak lanjuti sertifikat yang akan expired.
3. Koordinasikan refresh training atau perpanjangan sertifikat.
4. Pastikan karyawan terkait menyelesaikan pembelajaran yang wajib.

### 11.4 Untuk Manajemen

1. Baca Training Dashboard secara berkala.
2. Review department dengan coverage rendah.
3. Review risiko training dan sertifikasi expired.
4. Gunakan data untuk menentukan prioritas program training.

## 12. Script Demo Sosialisasi

Gunakan urutan demo berikut agar peserta memahami alur end-to-end.

### 12.1 Pembukaan

Sampaikan bahwa HERO Training dan ChitraLearning saling terhubung. HERO menjadi pusat data dan monitoring, sementara ChitraLearning menjadi tempat pembelajaran online.

### 12.2 Demo Training Records

Langkah demo:

1. Buka halaman Training Records.
2. Tunjukkan filter employee, department, section, dan year.
3. Pilih satu karyawan.
4. Expand data training karyawan.
5. Jelaskan status valid, soon expired, expired, dan tanpa expiry.
6. Tunjukkan bagaimana data dapat dikelola oleh HC/Admin.

### 12.3 Demo Training Dashboard

Langkah demo:

1. Buka tab Dashboard.
2. Jelaskan KPI utama.
3. Tunjukkan distribusi sumber training.
4. Tunjukkan top training.
5. Tunjukkan department coverage.
6. Tunjukkan daftar warning expiry.

### 12.4 Demo Import Training

Langkah demo:

1. Buka fitur import.
2. Tunjukkan template import.
3. Jelaskan kolom wajib.
4. Tunjukkan preview import.
5. Jelaskan hasil imported, updated, dan skipped.

### 12.5 Demo SIO/POP/POM

Langkah demo:

1. Buka tab SIO & POP.
2. Tunjukkan filter tipe sertifikat.
3. Expand data per karyawan.
4. Tunjukkan status expiry.
5. Buka reminder panel.
6. Jelaskan penerima Section Head dan CC.
7. Tunjukkan preview reminder.

### 12.6 Demo Mobile Training

Langkah demo:

1. Buka Mobile Training.
2. Tunjukkan card Records, Years, dan Due Soon.
3. Tunjukkan riwayat per tahun.
4. Tunjukkan detail training dan expiry.

### 12.7 Demo ChitraLearning LMS

Langkah demo:

1. Buka menu LMS Chitra Learning.
2. Tunjukkan KPI total kursus, kursus selesai, dan progress.
3. Tekan Mulai Belajar di LMS.
4. Tunjukkan daftar kursus.
5. Buka detail kursus.
6. Jelaskan progress, nilai, status, kurikulum, materi, dan quiz.
7. Jelaskan bahwa kursus yang selesai dapat masuk ke Training Records.

## 13. Poin Penting Untuk Disampaikan

- HERO adalah pusat monitoring training dan sertifikasi.
- ChitraLearning adalah platform pembelajaran online karyawan.
- Training Records menampung data manual, import, external training, dan hasil LMS.
- Course yang selesai di ChitraLearning dapat menjadi riwayat training.
- Mobile memudahkan karyawan mengecek progress dan riwayat pribadi.
- Dashboard membantu HC/Admin dan manajemen melihat risiko expiry dan coverage.
- SIO/POP/POM wajib dipantau karena berhubungan dengan compliance operasional.

## 14. FAQ Sosialisasi

### 14.1 Apakah semua training harus diinput manual?

Tidak. Training external dapat diinput manual atau import file. Kursus yang selesai di ChitraLearning dapat tersinkron otomatis ke Training Records.

### 14.2 Mengapa kursus LMS saya belum muncul di Training Records?

Kemungkinan penyebab:

- Kursus belum selesai.
- Progress belum 100%.
- Status belum completed atau passed.
- Data email atau SN belum cocok dengan User Management.
- Sinkronisasi belum berjalan setelah kursus selesai.

### 14.3 Apakah karyawan bisa melihat training sendiri?

Bisa. Karyawan dapat melihat riwayat training melalui Mobile Training dan progress kursus melalui Mobile LMS.

### 14.4 Apakah data training bisa difilter per department?

Bisa. Training Records dan dashboard mendukung filter department, section, karyawan, dan tahun.

### 14.5 Siapa yang menerima reminder SIO/POP/POM expired?

Reminder dapat dikirim ke Section Head terkait dan CC yang dikonfigurasi oleh admin.

### 14.6 Bagaimana jika status training salah?

HC/Admin dapat melakukan koreksi melalui pengelolaan Training Records atau sertifikasi sesuai hak akses.

### 14.7 Apakah ChitraLearning hanya untuk melihat materi?

Tidak. ChitraLearning juga menampilkan progress belajar, status kursus, nilai, detail kurikulum, materi, dan quiz. Hasil kursus yang selesai juga mendukung riwayat training di HERO.

### 14.8 Apakah dashboard LMS hanya untuk karyawan pribadi?

Tidak. Karyawan melihat progress pribadi, sedangkan HC/Admin atau user berwenang dapat melihat progress kursus karyawan secara lebih luas.

## 15. Checklist Kesiapan Sebelum Sosialisasi

- Pastikan contoh data Training Records tersedia.
- Pastikan ada contoh karyawan dengan beberapa training.
- Pastikan ada contoh training valid, soon expired, expired, dan tanpa expiry.
- Pastikan ada contoh data SIO/POP/POM.
- Pastikan ada contoh kursus ChitraLearning dengan progress dan nilai.
- Pastikan tombol Mulai Belajar di LMS dapat dibuka.
- Pastikan akun demo memiliki akses yang sesuai.
- Siapkan contoh file import jika ingin mendemokan import.

## 16. Penutup

Dengan HERO Training dan ChitraLearning, perusahaan memiliki satu ekosistem untuk mencatat, memantau, dan mengembangkan kompetensi karyawan. Karyawan dapat belajar dan memantau progress secara mandiri, HC/Admin dapat mengelola data training lebih rapi, atasan dapat menindaklanjuti expiry lebih cepat, dan manajemen dapat mengambil keputusan berdasarkan dashboard yang lebih lengkap.
