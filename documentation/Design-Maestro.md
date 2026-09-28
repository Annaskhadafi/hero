# MAESTRO™ Design System & Guidelines

> **Dokumen Panduan Visual & Arsitektur Antarmuka Portal MAESTRO (`maestro.chitraparatama.com`)**  
> *Versi 2.0 — Accessible Glassmorphism & High-Legibility Enterprise Customer Portal for Senior Stakeholders*

---

## 1. Filosofi & Karakter Visual: Accessible Glassmorphism for Seniors

MAESTRO dirancang sebagai portal operasional, pelacakan, dan safety eksklusif untuk pelanggan korporat PT Chitra Paratama. Sebagian besar pemangku kepentingan, pimpinan site, dan manajer operasional pelanggan berasal dari **demografi senior (orang tua)** yang memerlukan antarmuka dengan tingkat keterbacaan (*legibility*), kontras visual, dan kenyamanan interaksi yang sangat tinggi tanpa mengorbankan estetika modern.

Prinsip desain utama mengadopsi **Accessible Glassmorphism & High-Contrast Senior Ergonomics**:

1. **Frosted Glass Berkepadatan Tinggi (*High-Opacity Frosted Glass*)**:
   - Lapisan kaca menggunakan opasitas tinggi **`bg-white/85` hingga `bg-white/90`** yang dipadukan dengan **`backdrop-blur-xl` / `backdrop-blur-2xl`** dan border kaca halus **`border-white/80`**.
   - Menghasilkan efek kaca buram modern yang tetap padat, solid, dan memastikan teks di atasnya memiliki kontras tajam (tidak tembus pandang berlebihan yang membuat mata lelah).
2. **Latar Belakang Ambient Mesh Luminous**:
   - Di balik permukaan kaca, kanvas portal dilengkapi dengan *ambient fixed blurred gradient mesh orbs* (`bg-amber-300/25`, `bg-sky-300/20`, `bg-emerald-300/15` dengan `blur-3xl`) yang menghasilkan pembiasan cahaya lembut dan kedalaman dimensi yang elegan.
3. **Kontras Teks Tajam & Tanpa Teks Samar (*Deep High-Contrast Typography*)**:
   - Judul dan angka utama wajib menggunakan **`text-slate-950`** atau **`text-slate-900`** (*ultra-dark*).
   - Teks bodi dan deskripsi wajib menggunakan **`text-slate-700`** atau **`text-slate-600`**.
   - **DILARANG** menggunakan teks abu-abu terang (`text-slate-400` / `text-slate-300`) untuk isi bodi informasi penting agar tidak menyulitkan mata pengguna senior.
4. **Ergonomi Sentuhan & Target Klik Luas (*Senior-Friendly Click/Touch Targets*)**:
   - Seluruh input formulir, select dropdown, tombol aksi, filter bar, dan tab switcher wajib memiliki tinggi minimal **`h-11` (44px)** hingga **`h-12` (48px)** dengan radius **`rounded-2xl`** atau **`rounded-full`**.
   - Ukuran font pada tombol, filter, dan baris tabel diperbesar menjadi minimal **`text-sm font-semibold`** hingga **`text-sm font-bold`**.
5. **Badge Status Sangat Jelas (*High-Visibility Saturated Badges*)**:
   - Badge status tidak lagi menggunakan warna pastel pudar. Wajib menggunakan kombinasi warna pekat berbobot tinggi dengan border kontras (misal: `bg-emerald-100 text-emerald-950 border-emerald-300`, `bg-amber-100 text-amber-950 border-amber-300`, `bg-rose-100 text-rose-950 border-rose-300`).
6. **Kebijakan Bebas Distraksi (*Zero Clutter & Clean Interface*)**:
   - **DILARANG KERAS** menampilkan teks disclaimer atau badge teknis yang berlebihan seperti `(Customer Portal)`, `(customer page)`, `View Only`, atau `Read Only`.
   - Tampilan portal harus terasa seperti *executive enterprise suite* yang bersih, intuitif, dan profesional.

---

## 2. Palet Warna & Token Semantik Glassmorphic

MAESTRO menggunakan palet warna standar berbasis Slate dengan aksen emas Amber khas Chitra Paratama serta warna fungsional berdaya kontras tinggi:

| Peran / Token | Nilai Tailwind Glassmorphic | Penggunaan & Penerapan |
| :--- | :--- | :--- |
| **Canvas Background** | `bg-[#f8f9fa]` + ambient gradient orbs | Latar belakang global seluruh halaman portal |
| **Glass Surface (Primary)** | `bg-white/90 backdrop-blur-2xl border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)]` | Kartu utama, container filter, tabel data, modal dialog |
| **Glass Surface (Banner)** | `bg-white/85 backdrop-blur-2xl border-white/80` | Banner sambutan, header kartu modul, panel ringkasan |
| **Primary Text / Heading** | `text-slate-950` / `text-slate-900` | Judul halaman, nama dokumen, angka metrik KPI |
| **Body Text (Senior-Friendly)** | `text-slate-700` / `text-slate-800` | Deskripsi modul, isi tabel, status label, informasi detail |
| **Muted Metadata** | `text-slate-500` / `text-slate-600` | Timestamp tanggal/jam, kode referensi kecil, subteks |
| **Brand Gold / Amber** | `bg-amber-100 text-amber-950 border-amber-300` | Aksen merek MAESTRO™, supply chain, status proses / pending |
| **Emerald (Safe / Approved)** | `bg-emerald-100 text-emerald-950 border-emerald-300` | Status selesai, izin PTW disetujui, kehadiran, safe record |
| **Sky / Blue (Active / Transit)** | `bg-sky-100 text-sky-950 border-sky-300` | Daily activity, DO dalam perjalanan (*in transit*), order aktif |
| **Rose (Urgent / Incident)** | `bg-rose-100 text-rose-950 border-rose-300` | Tingkat risiko tinggi (*High Risk*), tiket urgent, bahaya K3 |
| **Indigo (AI / Helpdesk)** | `bg-indigo-100 text-indigo-950 border-indigo-300` | Asisten cerdas (*Chitra AI*), modul tiket & pengaduan |

---

## 3. Tipografi & Hierarki Senior-Ready

- **Display Font (Judul & Angka KPI)**: `font-display` dengan bobot `font-bold` hingga `font-black` (`tracking-tight`).
- **Body & Teks Operasional**: `Inter` dengan rendering anti-aliased kontras tinggi (`text-slate-800` / `text-slate-700`), ukuran standar `text-sm` (bukan `text-xs` kecil).
- **Monospace Font (Kode Dokumen & Serial)**: `font-mono` (`Geist Mono`) dengan background pill kontras untuk nomor PO (`PO-xxx`), nomor DO SAP, nomor PTW, tiket helpdesk, dan *Serial Number (SN)* ban.

### Panduan Skala Tipografi:
- **Angka Metrik KPI**: `text-3xl sm:text-4xl font-black tracking-tight text-slate-950`
- **Judul Halaman / Banner**: `text-2xl sm:text-3xl font-black tracking-tight text-slate-950`
- **Judul Bagian / Kartu Modul**: `text-lg sm:text-xl font-black text-slate-950`
- **Header Kolom Tabel**: `text-xs font-black uppercase tracking-wider text-slate-800`
- **Teks Baris Tabel**: `text-sm font-semibold text-slate-900`
- **Badge Status / Filter Chip**: `text-xs sm:text-sm font-bold tracking-wide`

---

## 4. Struktur Komponen Standar

### 4.1. Top Navigation Bar (Frosted Glass Header)
- Bersifat sticky dengan backdrop blur tinggi: `sticky top-0 z-40 border-b border-white/80 bg-white/85 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]`.
- Memuat logo MAESTRO™ dengan ikon emas, nama perusahaan pelanggan (`customer.name`) dalam badge kapsul kontras `bg-amber-100/80 text-amber-950 border-amber-200`, informasi user login, dan tombol **Keluar** kapsul `rounded-2xl` setinggi `h-10 sm:h-11`.

### 4.2. Kartu Ringkasan Eksekutif (Glass KPI Cards)
- Grid responsif: `grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5`.
- Struktur kartu:
  - Kontainer: `rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col justify-between`.
  - Icon badge: `rounded-2xl bg-<color>-100 text-<color>-950 border border-<color>-200 p-2.5`.
  - Nilai Metrik: `text-3xl sm:text-4xl font-black font-display text-slate-950`.
  - Label atas: `text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700`.

### 4.3. Tab Switcher Kapsul Ergonomis
- Kontainer tab berupa pill memanjang dengan tinggi nyaman: `inline-flex rounded-full bg-slate-200/80 p-1.5 shadow-inner backdrop-blur-md`.
- Tombol tab aktif: `rounded-full bg-white text-slate-950 shadow-sm px-5 py-2.5 text-xs sm:text-sm font-extrabold`.
- Tombol tab inaktif: `rounded-full text-slate-700 hover:text-slate-950 px-5 py-2.5 text-xs sm:text-sm font-bold`.
- Counter count: `rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-900 border border-slate-200`.

### 4.4. Filter & Toolbar Kontrol
- Dibungkus dalam kontainer kaca `rounded-3xl border border-white/80 bg-white/90 p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl`.
- Input pencarian: `h-11 pl-11 text-sm font-semibold bg-white/80 border-slate-300/80 rounded-2xl placeholder:text-slate-400 text-slate-900`.
- Dropdown select: `h-11 text-sm font-bold bg-white/80 border-slate-300/80 rounded-2xl text-slate-900`.

### 4.5. Tabel Data Operasional
- Kontainer tabel: `rounded-3xl border border-white/80 bg-white/90 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl`.
- Baris header: `bg-slate-100/80 text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200/80 py-4 px-6`.
- Baris data: `hover:bg-amber-50/40 transition-colors py-4 px-6 divide-y divide-slate-100 text-sm font-semibold text-slate-900`.
- Tombol aksi rincian: `h-9 rounded-2xl border border-slate-300 bg-white px-4 text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-100 shadow-sm`.

### 4.6. Dialog & Modal Rincian
- Dialog shell: `rounded-3xl p-6 sm:p-8 border border-white/80 bg-white/95 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto`.
- Bagian atribut data di dalam modal dikelompokkan dalam kartu latar bersih `rounded-2xl bg-slate-50 border border-slate-200 p-5`.
- Foto lampiran atau scan dokumen wajib menggunakan `resolveUploadUrl(rawUrl)` dan ditampilkan dalam lightbox beranimasi halus.

---

## 5. Modul-Modul Aktif MAESTRO

1. **Dashboard Operasional (`/dashboard`)**:
   - Banner sambutan pelanggan dengan jumlah site aktif yang diotorisasi.
   - 4 Kartu Modul Glassmorphic interaktif: *Daily Activity & Servis, Safety & PTW, PO & Delivery Tracking, Helpdesk & Tiket*.
2. **Daily Activity & Manpower (`/activity`)**:
   - Pemantauan live aktivitas teknisi per shift (*Pagi, Siang, Malam*).
   - Rekonsiliasi manpower hadir vs unsubmitted log.
   - Modal rincian pengerjaan unit/ban dan preview foto inspeksi resolusi S3.
3. **Safety Management & PTW (`/safety`)**:
   - Metrik K3 (*Incident YTD, Safe Man Hours, Expired Certification, Near Miss*).
   - Grafik analitik tren K3 dari sistem HERO.
   - Pelacakan Izin Kerja (*Permit to Work*) dengan riwayat tanda tangan *Approval Workflow*.
   - Pustaka *Job Safety Analysis (JSA)* dan laporan observasi bahaya.
4. **Cargo & Delivery Tracking (`/tracking` & `/orders`)**:
   - Pelacakan dokumen *Cargo Manifest* pengiriman barang & ban antar-site dengan fitur *expandable items*.
   - Status *Purchase Order (PO)* pelanggan dan kuantitas pemenuhan.
   - Pelacakan *Surat Jalan (DO SAP)* beserta bukti scan surat jalan.
   - Catatan pemakaian konsinyasi *eVHS*.
5. **Helpdesk & Tiket (`/tickets` & `/tickets/[id]`)**:
   - Tiket kendala operasional dengan asisten *Chitra Smart Ticketing AI*.
   - Live stream percakapan pelanggan dan staf HERO dengan bubble chat glassmorphic.
   - Dialog pembuatan tiket baru dengan dropzone lampiran foto/dokumen.

---

## 6. Aturan Akses & Keamanan Data (Security Guardrails)

1. **Session & Scope Terisolasi**:
   - Setiap query server action wajib memvalidasi sesi melalui `getMaestroServerSession()`.
   - Data dibatasi secara ketat berdasarkan `customer.id` dan array `access.siteIds`.
   - Dilarang mempercayai parameter ID dari klien tanpa verifikasi konteks sesi pelanggan.
2. **Karakteristik Read-Only**:
   - Seluruh halaman pelanggan bersifat *read-only view* secara default, kecuali formulir pembuatan tiket helpdesk dan pengiriman pesan chat tiket.
3. **Resolusi Media & Foto S3**:
   - Seluruh preview gambar, avatar teknisi, foto kerja, scan DO, dan tanda tangan digital **WAJIB** dibungkus dengan `resolveUploadUrl(rawUrl)`.
   - Dilarang menggunakan URL langsung S3 CloudHost atau URL presigned sementara.

