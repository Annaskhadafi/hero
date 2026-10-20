# MAESTRO™ Design System & UI/UX Guidelines: Antigravity Glassmorphism

> **Dokumen Panduan Visual & Arsitektur Desain Eksklusif Portal MAESTRO (`maestro.chitraparatama.com`)**  
> *Versi 3.0 — Antigravity Glassmorphism & Neo-Minimalist High-End Architecture*

---

## 1. Filosofi & Konsep Utama: Antigravity Glassmorphism

MAESTRO™ adalah portal enterprise eksekutif untuk pelanggan korporat PT Chitra Paratama. Desain antarmuka MAESTRO menerapkan sistem visual **"Antigravity Glassmorphism"**, terinspirasi dari aplikasi iOS neo-minimalis modern kelas atas yang memadukan efek kaca transparan (*frosted glass*), tata letak lapang (*breathable whitespace*), aksen warna *electric blue*, serta interaksi melayang (*antigravity floating feel*).

### 6 Pilar Desain Antigravity:

1. **Global Canvas & Ambient Mesh (Latar Udara & Bernapas)**:
   - Kanvas utama menggunakan gradien radial halus:  
     `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/60 via-sky-50/30 to-white` atau `#F0F9FF` hingga putih murni.
   - Dilengkapi *ambient fixed luminous orbs* (`bg-blue-400/15`, `bg-indigo-300/15`, `bg-sky-300/15` dengan `blur-3xl`) yang menghasilkan pembiasan cahaya lembut dan kedalaman dimensi.
2. **Glassmorphic Floating Panels (Kaca Melayang Berlapis)**:
   - Semua kontainer, kartu metrik, panel filter, dan modal dialog menggunakan efek kaca buram:  
     `bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem]`.
   - UI tampak seperti lempengan kaca murni yang melayang berlapis di atas kanvas bercahaya.
3. **Palet Warna Listrik & Kontras Seimbang**:
   - **Primary Color (Aksi Aktif / Highlight)**: Electric Blue cerah (`bg-blue-600`, `#2563eb` atau `#3b82f6`).
   - **Secondary / Inactive**: Translucent white atau pale blue (`bg-blue-50/50`, `bg-white/80`).
   - **Primary Text**: Dark slate / navy (`text-slate-800` / `text-slate-900`) untuk ketajaman visual maksimal.
   - **Secondary Text**: Soft muted gray (`text-slate-400` / `text-slate-500`) untuk metadata dan sub-informasi.
4. **Pill-Shaped Buttons & Micro-Motion Melayang**:
   - Semua tombol dan kontrol aksi berbentuk kapsul penuh (`rounded-full`).
   - Tombol aktif: Electric blue solid dengan pendaran lembut (`bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30`).
   - Tombol sekunder: Translucent glassy surface (`bg-white/80 text-slate-700 hover:bg-white border border-white/80 shadow-xs`).
   - Efek transisi antigravitasi saat hover: `transition-all duration-300 ease-in-out hover:-translate-y-1`.
5. **Layout Lapang & Radius Geometris**:
   - Spasi longgar dan tidak padat (`gap-6`, `p-6` hingga `p-10`, `space-y-8`).
   - Sudut melengkung lembut (`rounded-[2rem]` atau `rounded-3xl` untuk kontainer utama, `rounded-2xl` untuk elemen internal).
6. **Ikon & Citra 3D Floating Aesthetic**:
   - Ikon dan thumbnail dibungkus dalam wadah 3D melayang dengan bayangan lembut dan efek pembesaran halus saat disentuh (`hover:scale-105 transition-transform`).

---

## 2. Token Tailwind Standar Antigravity Glassmorphism

| Elemen / Komponen | Kelas Tailwind Standar | Deskripsi & Tujuan |
| :--- | :--- | :--- |
| **Global Page Wrapper** | `relative min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/70 via-sky-50/30 to-white text-slate-800 antialiased selection:bg-blue-500 selection:text-white` | Kanvas dasar portal |
| **Glass Card Container** | `bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem]` | Panel utama, kartu modul, widget |
| **Floating Glass Bar** | `sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]` | Top navigation header |
| **Active Pill Button** | `rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition-all duration-300 ease-in-out hover:-translate-y-1` | Tombol submit, CTA utama |
| **Inactive / Ghost Pill** | `rounded-full bg-white/80 hover:bg-white text-slate-700 font-semibold text-xs sm:text-sm border border-white/80 shadow-xs transition-all duration-300 ease-in-out hover:-translate-y-0.5` | Tombol navigasi, reset, kembali |
| **Floating 3D Icon Box** | `flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-200/50 shadow-sm transition-transform duration-300 group-hover:scale-110` | Wadah ikon metrik & fitur |
| **Pill Status Badge (Active)** | `rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 px-3.5 py-1 text-xs font-bold` | Status berjalan, aktif, DO transit |
| **Pill Status Badge (Success)** | `rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3.5 py-1 text-xs font-bold` | Status selesai, terverifikasi, aman |
| **Pill Status Badge (Warning)** | `rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 px-3.5 py-1 text-xs font-bold` | Status menunggu, perhatian |
| **Pill Status Badge (Danger)** | `rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 px-3.5 py-1 text-xs font-bold` | Status insiden, terlambat |
| **Glass Input Field** | `h-11 rounded-2xl border-white/60 bg-white/80 backdrop-blur-sm px-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all` | Input teks, search, tanggal |
| **Glass Table Wrapper** | `rounded-[2rem] border border-white/50 bg-white/60 backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]` | Tabel data operasional |

---

## 3. Syarat & Ketentuan (S&K) Implementasi Khusus MAESTRO

1. **Eksklusivitas Ruang Lingkup**:
   - Sistem desain ini **HANYA** berlaku untuk direktori `app/maestro/*` (portal pelanggan MAESTRO).
   - **DILARANG** mengubah gaya internal HERO (`app/dashboard/*`, `app/review/*`, dsb.) agar arsitektur visual internal HERO tetap stabil dan konsisten dengan sistem internalnya.
2. **Integritas Logika & State (*Zero Business Logic Regression*)**:
   - Refactoring UI dilarang keras mengubah state (`useState`, `useReducer`), parameter URL, action call (`loginMaestroAction`, `logoutMaestroAction`, `exportXlsx`, dsb.), hook React, dan otentikasi session.
3. **Pemberian Identitas MAESTRO**:
   - Logo MAESTRO™ dan nama pelanggan (`customer.name`) wajib ditampilkan dengan jelas pada header dan welcome banner.
4. **Aksesibilitas & Keterbacaan**:
   - Seluruh teks utama harus menggunakan kontras tajam (`text-slate-800` / `text-slate-900`) di atas permukaan kaca buram `bg-white/60` hingga `bg-white/80`.
5. **Micro-Interactions**:
   - Efek hover `hover:-translate-y-1` memberikan umpan balik taktil dan kesan futuristik tanpa memberatkan rendering browser.
