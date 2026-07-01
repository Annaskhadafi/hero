# Materi Sosialisasi Fitur Road Condition Analysis

## 1. Latar Belakang

Inspeksi kondisi jalan dan area kerja di site sering berbasis foto dan catatan manual. Kondisi ini membuat standar penilaian antar inspector atau antar site bisa berbeda, proses penyusunan report menjadi lebih lama, dan manajemen sulit mendapatkan ringkasan cepat yang memiliki evidence visual serta rekomendasi tindakan.

Fitur Road Condition Analysis dibuat untuk membantu proses inspeksi menjadi lebih standar, cepat, dan traceable. Foto lapangan dianalisis dengan bantuan AI berdasarkan rubric operasional, lalu hasilnya divalidasi oleh user sebelum disimpan dan dijadikan report.

## 2. Tujuan Fitur

- Menstandarkan penilaian kondisi Loading Point, Haulroad, dan Disposal.
- Membantu inspector mengubah foto lapangan menjadi score, deskripsi, dan rekomendasi.
- Mempercepat pembuatan laporan slide/PDF.
- Menyediakan history inspeksi agar report mudah ditelusuri ulang.
- Mendukung penggunaan desktop untuk review detail dan mobile untuk akses lapangan.

## 3. Akses Fitur

- Desktop: `/dashboard/reports/road-condition`
- Mobile: `/mobile/reports/road-condition`
- Mobile service tile: `Site Condition`
- Resource permission: `hse_road_condition_analysis`

## 4. Alur Kerja

1. User memilih atau mengisi site.
2. User mengisi customer, inspector, dan tanggal report.
3. User memilih kategori/point inspeksi.
4. User upload tepat 3 foto dari angle berbeda.
5. AI menganalisis foto menggunakan rubric kategori.
6. User memvalidasi score, deskripsi, dan rekomendasi.
7. User menyimpan report ke history.
8. User generate PDF slide report.

## 5. Desktop Version

Desktop dipakai untuk review lengkap, validasi detail, dan pengelolaan history. Tab Report berisi Form Report, Upload 3 Angle, Validasi AI, dan Compiled Report Slide. Tab History menampilkan report tersimpan dan menyediakan aksi view detail, edit/load ulang, download PDF, dan delete.

## 6. Mobile Version

Mobile version tersedia melalui `/mobile/reports/road-condition` dan menu `Site Condition`. Versi mobile membantu inspector mengakses fitur dari lapangan dengan workflow yang sama: isi metadata, upload foto, jalankan AI, validasi hasil, lalu simpan report.

## 7. Kategori Penilaian

### Loading Point
- Spillage
- Loading Point
- Undulation
- Area Firmness
- Support Equipment

### Haulroad
- Spillage
- Cross Fall
- Gradient
- Corner Condition
- Road Firmness
- Undulation
- Support Equipment
- Road Width

### Disposal
- Spillage
- Dumping Point
- Undulation
- Area Firmness
- Windrow
- Support Equipment

## 8. Sistem Scoring

Score memakai skala 1 sampai 5. Score 1 menunjukkan kondisi buruk atau risiko tinggi. Score 5 menunjukkan kondisi ideal atau risiko rendah. Average score dipakai sebagai ringkasan kondisi report. User tetap bisa mengoreksi score dan rekomendasi sebelum report disimpan.

## 9. Output Report dan History

Output report berbentuk PDF slide landscape 16:9 dengan cover, summary, detail per point, foto evidence, tabel assessment, rekomendasi, dan back cover. History menyimpan report sehingga user dapat melihat ulang, download ulang, atau melanjutkan edit dari report sebelumnya.

## 10. Pesan Kunci Sosialisasi

- Report lebih cepat dibuat.
- Scoring lebih standar karena memakai rubric yang sama.
- Foto evidence lebih terstruktur karena wajib 3 angle.
- AI membantu analisis awal, tetapi validasi akhir tetap di user.
- Desktop cocok untuk review detail; mobile cocok untuk akses lapangan.
