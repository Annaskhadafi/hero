# Tasks

## 1. Database Schema & Storage Setup

- [x] 1.1 Buat skema Drizzle `expo_business_cards` di `db/schema/expo-business-cards.ts` dan ekspor melalui `db/schema/index.ts` — verify: jalankan `npm run db:push` dan pastikan tabel terbentuk di database
- [x] 1.2 Daftarkan prefix upload `business-cards` di `app/api/uploads/[...path]/route.ts`, `lib/resolve-upload-url.ts`, dan `lib/s3-storage.ts` — verify: verifikasi upload gambar berhasil disimpan ke S3 dan dapat diakses melalui proxy `/api/uploads/business-cards/...`

## 2. Vision AI Service & Server Action

- [x] 2.1 Implementasikan helper ekstraksi Vision AI di `lib/business-card-ai.ts` untuk mem-parsing nama, jabatan, perusahaan, nomor telepon, email, alamat, dan website dari gambar kartu nama — verify: tes parsing dengan gambar kartu nama sampel menghasilkan struktur JSON valid
- [x] 2.2 Buat Server Action `scanBusinessCardAction` dan `saveBusinessCardAction` di `app/actions/business-card.ts` — verify: panggil action dengan sampel data dan pastikan validasi Zod lolos serta data tersimpan di tabel database

## 3. User Interface & Document Preview

- [x] 3.1 Bangun formulir scan kartu nama mobile-first dengan trigger kamera langsung (`capture="environment"`), upload berkas, dan review form hasil ekstraksi AI — verify: ambil/unggah foto kartu nama, periksa form terisi otomatis dan dapat diedit manual
- [x] 3.2 Bangun halaman daftar kartu nama di `app/dashboard/business-cards/page.tsx` menggunakan `HeroDataTable` dengan pencarian real-time, filter nama expo, dan ekspor Excel/CSV — verify: tabel menampilkan daftar kartu nama tersimpan, pencarian berfungsi instan, dan ekspor file berjalan lancar
- [x] 3.3 Implementasikan pratinjau dokumen detail menggunakan `HeroDetailModal` yang menampilkan foto kartu nama asli berdampingan dengan data kontak serta tombol pintasan cepat (WhatsApp & Email) — verify: klik tombol view pada baris kontak membuka modal detail berukuran besar dengan gambar kartu nama resolusi penuh dan link WhatsApp aktif

## 4. Navigation, Permissions & Verification

- [x] 4.1 Daftarkan resource `business-cards` pada `lib/navigation.ts` dan sinkronkan permission RBAC — verify: menu Business Cards muncul di sidebar sesuai hak akses pengguna
- [x] 4.2 Buat dan jalankan skenario pengujian E2E otomatis di `tests/business-card-scanner.e2e.ts` lengkap dengan screenshot verifikasi — verify: `npx e2e run tests/business-card-scanner.e2e.ts` berhasil PASS dan menghasilkan screenshot UI

## Workflow follow-up

- Arsipkan change dengan `openspec archive business-card-scanner --yes` setelah seluruh task selesai diimplementasikan dan diverifikasi.
