# Proposal

## Why

Saat menghadiri expo atau pameran industri (seperti pameran pertambangan, alat berat, atau seminar bisnis), tim HERO sering menerima puluhan hingga ratusan kartu nama fisik. Pencatatan manual memakan waktu, rawan terselip, dan memperlambat tindak lanjut bisnis (follow-up). Fitur Business Card Scanner menyediakan alur cepat berbasis kamera perangkat/upload, ekstraksi otomatis menggunakan Vision AI, penyimpanan persisten berkas kartu nama ke S3, serta visualisasi preview kartu nama asli dan data kontak terstruktur secara instan.

## What Changes

- **Penyimpanan Berkas Kartu Nama**: Integrasi upload foto kartu nama ke S3 persisten via proxy `/api/uploads/business-cards/*` dengan resolusi URL aman `resolveUploadUrl`.
- **Ekstraksi Vision AI**: Layanan ekstraksi terstruktur menggunakan model Vision untuk membaca Nama, Jabatan, Perusahaan, Nomor HP/WhatsApp, Email, Alamat, Website, serta catatan tambahan.
- **Formulir Cepat & Penyesuaian**: Antarmuka review hasil scan yang memungkinkan pengguna memverifikasi data, memilih/mengisi nama acara expo, serta menambahkan catatan peluang kerja sama.
- **Daftar & Pratinjau Dokumen**: Halaman manajemen kartu nama menggunakan `HeroDataTable` dilengkapi pencarian instan, filter expo/perusahaan, tombol shortcut WhatsApp/Email, serta pratinjau dokumen detail (`HeroDetailModal`) yang menampilkan foto kartu nama asli berdampingan dengan data kontak terstruktur.
- **Ekspor Data**: Dukungan ekspor daftar kontak expo ke format Excel (`.xlsx`) dan CSV untuk kemudahan integrasi tim penjualan atau CRM.

## Capabilities

### New Capabilities
- `business-card-scanner`: Menyediakan fungsionalitas pemindaian kartu nama via kamera/unggah foto, ekstraksi Vision AI, penyimpanan database kontak expo, manajemen daftar kontak dengan tabel terstandarisasi, dan modal pratinjau kartu nama.

### Modified Capabilities
<!-- None: No existing specs are modified since this is a new capability in the initial specification set. -->

## Impact

- **Database**: Penambahan tabel baru `expo_business_cards` di schema database Drizzle (`db/schema/`) untuk menyimpan data kontak, metadata event expo, dan URL gambar kartu nama.
- **API & Upload**: Penambahan prefix `business-cards` pada upload proxy di `app/api/uploads/[...path]/route.ts` dan helper terkait.
- **AI Service**: Pembuatan helper ekstraksi Vision AI di `lib/business-card-ai.ts` yang terintegrasi dengan konfigurasi AI lingkungan aktif.
- **UI / Frontend**: Penambahan halaman baru di bawah `/dashboard/business-cards` atau `/dashboard/expo-contacts` menggunakan reusable components baku HERO (`HeroDataTable`, `HeroDetailModal`, `HeroInput`, `HeroSearchableSelect`, dsb.).
- **RBAC**: Pendaftaran resource permission di `lib/navigation.ts` untuk kontrol akses menu dan hak akses read/create/edit/delete.
