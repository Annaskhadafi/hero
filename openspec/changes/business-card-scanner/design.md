# Design

## Context

Fitur ini diimplementasikan di atas arsitektur standar HERO (Next.js App Router, TypeScript, Drizzle ORM dengan PostgreSQL, penyimpanan privat S3 CloudHost via upload proxy terpusat, dan Reusable Templates `@/components/templates`). Lihat `proposal.md` untuk latar belakang dan `specs/business-card-scanner/spec.md` untuk spesifikasi fungsional.

## Goals / Non-Goals

**Goals:**
- Menyediakan tabel database `expo_business_cards` untuk menyimpan detail kontak terstruktur, nama expo, catatan obrolan, dan referensi foto kartu nama.
- Mengintegrasikan Vision AI (`lib/business-card-ai.ts`) untuk ekstraksi otomatis teks dan entitas kartu nama menjadi JSON valid.
- Mendaftarkan prefix upload `business-cards` pada proxy S3 terpusat `/api/uploads/[...path]` dan memastikan URL disimpan secara persisten sesuai aturan HERO (`resolveUploadUrl`).
- Membangun antarmuka mobile-friendly dengan akses kamera langsung (`capture="environment"`) dan desktop file upload.
- Membangun antarmuka pratinjau dokumen resmi (`HeroDetailModal`) berdampingan dengan foto kartu nama asli dan pintasan aksi cepat (WhatsApp, Email).

**Non-Goals:**
- Integrasi ke mesin scanner fisik kabel (hanya menggunakan kamera smartphone atau upload file gambar).
- Pipeline CRM penjualan penuh (tahap awal difokuskan pada penangkapan kontak, katalogisasi expo, dan ekspor data).

## Decisions

### Decision 1: Database Schema `expo_business_cards`
- **Pilihan**: Membuat berkas skema baru `db/schema/expo-business-cards.ts` yang diekspor melalui `db/schema/index.ts`.
- **Kolom Utama**: `id` (uuid), `expoName` (varchar), `contactName` (varchar), `companyName` (varchar), `jobTitle` (varchar), `phoneNumber` (varchar), `email` (varchar), `address` (text), `website` (varchar), `cardImageUrl` (text), `notes` (text), `category` (enum: hot, warm, cold, partner, vendor), `createdBy` (varchar/foreign key), timestamps.
- **Rasional**: Struktur terisolasi dan modular, tidak mengganggu tabel inti HERO lainnya.

### Decision 2: Upload Persisten S3 & Proxy Terpusat
- **Pilihan**: Menggunakan `uploadFile` baku dari `app/actions/upload.ts` dengan folder tujuan `business-cards/`.
- **Rasional**: Menjaga integritas arsitektur HERO tanpa hardcoded presigned URL 1 jam, sehingga tautan foto persisten di semua environment.

### Decision 3: Vision AI Extraction Pipeline
- Gunakan `OPENAI_BASE_URL`, `OPENAI_API_KEY`, dan `OPENAI_MODEL` sebagai satu konfigurasi server-side. Jangan fallback ke kredensial domain lain atau membuat kontak dummy pada kegagalan.
- Dialog bersama mobile dan desktop memotong gambar di browser sebelum mengirim `File` hasil crop untuk S3 dan OpenAI. Nama acara opsional. Tambahkan kolom nullable untuk kategori usaha dan produk/layanan tanpa menebak nilai kartu lama.
- Gunakan permission `business_cards` dan pemilik dari session pada list, perubahan, penghapusan, dan proxy foto. Ekspor memakai data dari list terotorisasi. Foto lama hanya dapat dibaca jika terhubung ke kartu pemilik; preview pra-simpan memakai URL lokal browser.

### Decision 4: Antarmuka UI Baku `@/components/templates`
- **Pilihan**: Menggunakan `HeroDataTable` untuk listing data (mendukung instant search, filter expo, ekspor Excel/PDF) dan `HeroDetailModal` untuk document preview berdampingan (gambar kartu nama + data kontak).
- **Rasional**: Menjamin 100% konsistensi tema HERO dan mematuhi aturan repository.

## Risks / Trade-offs

- **[Risk]** Kualitas foto kartu nama buram atau pencahayaan minim di aula expo.
  - **Mitigasi**: Form hasil ekstraksi selalu dapat disunting (editable) oleh pengguna sebelum disimpan, dengan fallback input manual.
- **[Risk]** Latensi Vision AI saat koneksi internet seluler di expo lambat.
  - **Mitigasi**: Memberikan indikator progress loading interaktif saat memproses gambar dan opsi simpan foto terlebih dahulu untuk diproses kemudian.
- **[Risk]** Format nomor telepon beragam (lokal 0812 vs internasional +62).
  - **Mitigasi**: Helper normalisasi otomatis nomor telepon untuk tautan WhatsApp `https://wa.me/62...`.
