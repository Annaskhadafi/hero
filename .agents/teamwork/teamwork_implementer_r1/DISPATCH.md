<original_task>
This is a single self-contained fix; keep it small and focused. Otomatisasi pembuatan Surat Perintah Lembur (SPL) langsung dari formulir Aktivitas Harian (Daily Activity Report) saat tombol "BUAT SPL LEMBUR" diklik sehingga pengguna tidak perlu mengisi ulang aktivitas kerja lembur, dengan integrasi penuh ke seluruh modul/bagian yang berhubungan dengan SPL.

Integrity mode: development

## Requirements

### R1. Auto-generate SPL dari Aktivitas Harian
Ketika pengguna menekan tombol "BUAT SPL LEMBUR" pada formulir Aktivitas Harian (Daily Activity Report), sistem secara otomatis meng-generate data pengajuan SPL yang terisi sesuai aktivitas kerja pada jam lembur yang tercatat di laporan aktivitas harian tersebut tanpa mengharuskan pengguna mengetik ulang dari awal.

### R2. Integrasi Penuh dengan Modul & Data Terkait SPL
Pastikan terintegrasi penuh ke semua bagian dan modul yang berhubungan dengan SPL, termasuk daftar/tabel data SPL, alur approval/status, serta keterkaitan data lembur karyawan di sistem.

### R3. Integritas Data & Alur Interaksi
Data karyawan, tanggal, jam lembur, dan deskripsi kegiatan pada SPL harus konsisten dan akurat sesuai data aktivitas harian yang menjadi sumbernya. Tim menentukan alur interaksi terbaik (apakah langsung tersimpan ke sistem atau menampilkan formulir SPL yang sudah terisi otomatis / pre-filled) sesuai pola antarmuka dan alur kerja standar HERO.

## Acceptance Criteria

### Fungsionalitas SPL dari Daily Activity
- [ ] Tombol "BUAT SPL LEMBUR" pada formulir Aktivitas Harian menginisiasi pembuatan SPL dengan rincian kegiatan, tanggal, karyawan, dan jam lembur yang terisi otomatis dari data aktivitas harian terkait.
- [ ] Pengguna tidak perlu mengisi ulang secara manual data pekerjaan dan jam lembur yang telah tercatat pada Daily Activity saat membuat SPL.
- [ ] SPL yang dihasilkan berhasil tersimpan dan terintegrasi penuh ke seluruh bagian yang berhubungan dengan SPL (dapat dilihat pada tabel/daftar SPL dan dapat diproses pada alur approval/status lembur selanjutnya).

### Pengujian Otomatis (E2E)
- [ ] Pengujian E2E otomatis berhasil memverifikasi alur: membuka Daily Activity yang memiliki aktivitas lembur, mengklik "BUAT SPL LEMBUR", memastikan data pada SPL terisi otomatis, dan memverifikasi keterhubungan SPL tersebut pada modul SPL sistem.
</original_task>
