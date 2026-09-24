export interface DocSection {
  id: string
  title: string
  subtitle?: string
  content: string // Markdown or structured text
  badge?: string
  highlights?: Array<{ label: string; value: string; desc?: string }>
  codeSnippets?: Array<{ title: string; language: string; code: string }>
  tables?: Array<{
    title: string
    headers: string[]
    rows: string[][]
  }>
}

export interface DocChapter {
  id: string
  number: number
  title: string
  shortTitle: string
  description: string
  badge: string
  sections: DocSection[]
}

export const HERO_DOCUMENTATION_METADATA = {
  systemName: "HERO (Human Capital, Employee Reporting & Operational Hub)",
  companyName: "PT Chitra Paratama",
  version: "v2.8.4 Enterprise Edition",
  lastUpdated: "2026-09-20",
  classification: "INTERNAL CONFIDENTIAL & PROPRIETARY",
  authorRole: "Lead Fullstack & Systems Architect",
  targetAudience: "Lead Engineer, Fullstack Developers, DevOps, & HC/IT System Administrators",
}

export const HERO_DOCUMENTATION_CHAPTERS: DocChapter[] = [
  // ==========================================
  // BAB 1: PANDUAN SERAH TERIMA & ONBOARDING DEVELOPER
  // ==========================================
  {
    id: "handover-guide",
    number: 1,
    title: "Bab 1: Panduan Serah Terima Sistem & Onboarding Pengembang (Handover)",
    shortTitle: "Panduan Serah Terima",
    badge: "Handover & SOP",
    description:
      "Panduan komprehensif bagi engineer penerima tanggung jawab sistem HERO. Berisi checklist serah terima, daftar repositori, konfigurasi environment, dan tata cara setup lokal.",
    sections: [
      {
        id: "ringkasan-sistem",
        title: "1.1 Profil Sistem & Ruang Lingkup Operasional",
        badge: "Sistem Overview",
        content: `Sistem **HERO** (Human Capital, Employee Reporting & Operational Hub) adalah platform inti terintegrasi yang digunakan oleh **PT Chitra Paratama** untuk mendigitalkan seluruh siklus hidup karyawan dan operasi lapangan secara *real-time*.

Sistem ini menggabungkan modul:
1. **User Management & Kepegawaian**: Master karyawan, struktur divisi, departemen, seksi, site penempatan, dan riwayat kontrak.
2. **Operasional & Timesheet**: Daily activity submission, session document tracking, attendance roster, lembur (overtime), dan verifikasi kehadiran.
3. **Approval Engine Terpusat**: Mesin persetujuan berjenjang dinamis yang menangani ribuan transaksi harian dari berbagai modul.
4. **HSE & K3 (Safety)**: Laporan EVHS, Audit 5R dengan scoring otomatis, JSA (Job Safety Analysis), serta inspeksi ban lapangan (*Tire Site Inspection*).
5. **Central Service & Logistik**: Fleet management, Work Order (WO-24), Delivery tracking, dan verifikasi muatan.
6. **Hero Genius AI**: Asisten cerdas internal bertenaga LLM untuk konsultasi SOP, WIN, dan analisis data operasional.`,
        highlights: [
          { label: "Basis Pengguna", value: "1.000+ Karyawan", desc: "Tersebar di Head Office & Site Tambang" },
          { label: "Arsitektur Inti", value: "Next.js 15 App Router", desc: "Fullstack TypeScript & React Server Components" },
          { label: "Penyimpanan Utama", value: "PostgreSQL + Drizzle ORM", desc: "Strict schema migrations & relation queries" },
          { label: "Deployment", value: "Dokploy (Docker Compose)", desc: "Persistent Bind Mount & Automated CI/CD" },
        ],
      },
      {
        id: "checklist-serah-terima",
        title: "1.2 Checklist Serah Terima Kredensial & Infrastruktur (Handover Checklist)",
        badge: "Kredensial & Akses",
        content: `Berikut adalah daftar aset, kredensial, dan hak akses yang wajib diserahterimakan kepada engineer penerima:

1. **Akses Repositori GitHub**:
   - URL Repositori Utama: \`https://github.com/Annaskhadafi/hero\` (atau repositori resmi perusahaan).
   - Cabang Utama (\`main\`): Untuk production release.
   - Cabang Pengembangan (\`staging\` / \`dev\`): Untuk integrasi fitur baru dan QA.

2. **Akses Server Dokploy (Production & Staging)**:
   - Dashboard Dokploy: URL dan akun admin Dokploy untuk monitoring container, rebuild, dan environment variables.
   - SSH Server Access: Kredensial SSH host Linux tempat Dokploy berjalan.
   - Persistent Volume Path: \`/mnt/data/one-chitra/uploads\` (wajib di-mount ke \`/app/public/uploads\`).

3. **Database PostgreSQL**:
   - Connection string: Host, Port (5432), Database Name, User, dan Password.
   - Kredensial akun maintenance (superuser) untuk backup/restore \`pg_dump\`.

4. **Layanan Pihak Ketiga & Integrasi**:
   - **SMTP Relay**: Host SMTP, Port, Username, Password untuk pengiriman email notifikasi.
   - **Better-Auth Secret**: Kunci enkripsi sesi user (\`BETTER_AUTH_SECRET\`).
   - **Face API / AI Models**: Direktori model bobot pengenalan wajah di \`public/models\`.
   - **AI Provider Key**: API key OpenAI / Anthropic / Gemini untuk fitur Hero Genius.`,
        tables: [
          {
            title: "Daftar Variabel Lingkungan Kritis (.env)",
            headers: ["Variabel", "Tipe", "Deskripsi & Keamanan"],
            rows: [
              ["DATABASE_URL", "URL String", "Koneksi PostgreSQL (format: postgresql://user:pass@host:5432/dbname)"],
              ["BETTER_AUTH_SECRET", "String (64 hex)", "Kunci rahasia hashing token autentikasi sesi Better-Auth"],
              ["BETTER_AUTH_URL", "URL String", "Domain publik aplikasi (e.g., https://hero.chitraparatama.co.id)"],
              ["SMTP_HOST", "String", "Alamat server SMTP mail relay"],
              ["SMTP_PORT", "Integer", "Port server SMTP (umumnya 587 atau 465)"],
              ["SMTP_USER / SMTP_PASS", "Kredensial", "Akun otentikasi pengiriman email resmi"],
              ["NEXT_PUBLIC_APP_URL", "URL String", "URL frontend aplikasi untuk resolusi tautan absolut"],
            ],
          },
        ],
      },
      {
        id: "sop-onboarding-lokal",
        title: "1.3 SOP Onboarding & Setup Lingkungan Pengembangan Lokal",
        badge: "Development Setup",
        content: `Ikuti langkah-langkah terperinci berikut untuk menjalankan aplikasi HERO di komputer lokal developer baru:

### Prasyarat Sistem
- **Node.js**: Versi LTS v18.17.0 atau v20.x ke atas.
- **Package Manager**: \`npm\` atau \`pnpm\`.
- **Database**: PostgreSQL 14+ aktif secara lokal atau menggunakan Docker container.
- **Git**: Terpasang dengan SSH key terdaftar di GitHub.`,
        codeSnippets: [
          {
            title: "Langkah 1: Kloning Repositori & Instalasi Dependensi",
            language: "bash",
            code: `# 1. Clone repository
git clone https://github.com/Annaskhadafi/hero.git
cd hero

# 2. Install seluruh dependensi project
npm install`,
          },
          {
            title: "Langkah 2: Salin Environment & Konfigurasi",
            language: "bash",
            code: `# Salin template environment
cp .env.example .env.local

# Sesuaikan DATABASE_URL dengan database lokal Anda:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hero_db"
# BETTER_AUTH_SECRET="generate-rahasia-random-64-karakter"`,
          },
          {
            title: "Langkah 3: Sinkronisasi Schema Database & Menjalankan Dev Server",
            language: "bash",
            code: `# 1. Sinkronisasi struktur tabel ke PostgreSQL via Drizzle ORM
npm run db:push

# 2. (Opsional) Buka Drizzle Studio untuk memeriksa tabel via browser GUI
npm run db:studio

# 3. Jalankan server pengembangan Next.js
npm run dev
# Buka http://localhost:3000 di browser Anda`,
          },
        ],
      },
      {
        id: "aturan-emas-codebase",
        title: "1.4 Aturan Emas & Pantangan Kritis Arsitektur (Golden Rules)",
        badge: "Standar Ketat",
        content: `Terdapat beberapa aturan kritis yang **TIDAK BOLEH DILANGGAR** dalam pengembangan sistem HERO demi menjaga integritas data dan kestabilan sistem:

> [!CAUTION]
> **1. User Management Sebagai Single Source of Truth (SSoT)**:
> - Tabel \`hero_employees\` adalah **SATU-SATUNYA** sumber data karyawan untuk seluruh sistem runtime.
> - **DILARANG KERAS** menggunakan tabel \`hero_hr_employees\` (tabel staging import) untuk query data karyawan pada runtime (actions, pages, API routes, lib helpers).
> - Seluruh query karyawan wajib membaca dari \`hero_employees\` dan melakukan relasi (join) ke \`hero_master_departments\`, \`hero_master_sections\`, dan \`hero_sites\`.
> - Tabel \`hero_hr_employees\` HANYA boleh disentuh oleh script migrasi data atau tools import staging.

> [!IMPORTANT]
> **2. Next.js Root Layout Guard**:
> - Jangan pernah menaruh elemen \`<script>\` atau \`<Script>\` langsung sebagai anak (*child*) dari elemen \`<html>\` di \`app/layout.tsx\`.
> - Elemen \`<html>\` hanya boleh membungkus \`<body>\` dan metadata Next.js.
> - Script pre-hydration wajib ditaruh di dalam tag \`<head>\` atau menggunakan \`<script dangerouslySetInnerHTML>\` di dalam \`<head>\` untuk menghindari error fatal hidrasi.

> [!NOTE]
> **3. Git Commit & Push Guard**:
> - Dilarang melakukan \`git commit\` dan \`git push\` tanpa perintah eksplisit dan persetujuan user.
> - Operasi read-only seperti \`git status\`, \`git diff\`, dan \`git log\` diperbolehkan.`,
      },
    ],
  },

  // ==========================================
  // BAB 2: ARSITEKTUR SISTEM & BLUEPRINT TEKNIS
  // ==========================================
  {
    id: "system-blueprint",
    number: 2,
    title: "Bab 2: Cetak Biru Arsitektur Sistem (System Blueprint)",
    shortTitle: "Arsitektur & Blueprint",
    badge: "System Architecture",
    description:
      "Arsitektur teknologi end-to-end sistem HERO: Next.js 15 App Router, React Server Components, Drizzle ORM, sistem berkas persistent Dokploy, dan centralized notification engine.",
    sections: [
      {
        id: "arsitektur-tinggi",
        title: "2.1 Arsitektur Tingkat Tinggi (High-Level Architecture)",
        badge: "Topologi Sistem",
        content: `Sistem HERO dirancang dengan paradigma **Modern Fullstack Monolith** yang menggunakan **Next.js 15 (App Router)**. Pendekatan ini memberikan kecepatan pengembangan yang luar biasa tanpa fragmentasi API yang rumit, namun tetap mempertahankan batas (*boundary*) yang sangat jelas antara kode server dan klien.

### Diagram Alur Data Sistem
\`\`\`
[ Pengguna Desktop / Mobile ]
            │
            ▼ (HTTPS / TLS 1.3)
┌─────────────────────────────────────────────────────────────┐
│ Dokploy Host Environment (Nginx Reverse Proxy)              │
│  - SSL Termination                                          │
│  - Security Headers (HSTS, CSP, X-Frame-Options)            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js 15 Standalone Node Server Container                │
│                                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │ Client Components (CSR) │   │ Server Components (RSC) │  │
│  │ - Radix UI / Tailwind   │   │ - Direct DB Fetching    │  │
│  │ - TanStack Virtual Table│   │ - Server Actions        │  │
│  │ - Interactive Forms     │   │ - Auth Guard & RBAC     │  │
│  └────────────┬────────────┘   └────────────┬────────────┘  │
│               │                             │               │
│               ▼                             ▼               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Service & Data Access Layer                           │  │
│  │ - Drizzle ORM (Type-Safe Query Builder)               │  │
│  │ - Centralized Email Service (lib/workflow-email.ts)   │  │
│  │ - Approval Routing Resolver Engine                    │  │
│  │ - Centralized File Upload (app/actions/upload.ts)     │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│ PostgreSQL 14+ Database   │       │ Dokploy Persistent Disk   │
│ - Connection Pooling      │       │ /mnt/data/one-chitra/     │
│ - Relational Integrity    │       │ uploads                   │
│ - Strict Schema & Indexes │       │ (Foto bukti, PDF, Surat)  │
└───────────────────────────┘       └───────────────────────────┘
\`\`\``,
      },
      {
        id: "frontend-guidelines",
        title: "2.2 Standar Desain Frontend & Tabel Ter-Virtualisasi",
        badge: "UI/UX & Design",
        content: `Sesuai panduan resmi \`documentation/Design.md\` dan standar \`one-chitra\`, seluruh antarmuka desktop HERO mengusung tema **Clean Operational Workspace**:

1. **Karakter Visual**:
   - Permukaan terang (*bright surfaces*), struktur ringan, dan kontras tinggi.
   - Tidak menggunakan border gelap tebal (*No-Line Rule*). Pemisah batas dibuat melalui kontras layer: \`surface_container_lowest\` (kartu putih) di atas \`surface_container_low\` (latar abu-abu muda).
   - Tipografi: **Manrope** untuk judul halaman dan nilai KPI, **Inter** untuk teks pembacaan, dan **Geist Mono** untuk kode.

2. **Standar Tabel Operasional (TanStack Virtualization)**:
   - Setiap tabel operasional wajib dibungkus dalam kontainer \`MinimalTableShell\` atau \`AdminDataTableShell\`.
   - Menggunakan \`@tanstack/react-virtual\` untuk menangani ribuan baris data tanpa lag browser.
   - Setiap tabel memiliki **Command Bar** horizontal: Input pencarian (lebar ~220px), filter multi-select kontekstual, tombol Date Range (khusus dataset berbasis tanggal), tombol Import (dengan mapping kolom), dan tombol Export Excel.`,
        codeSnippets: [
          {
            title: "Pola Virtualisasi Tabel TanStack Standar",
            language: "tsx",
            code: `// Standar TanStack Virtualizer Table di HERO
import { useVirtualizer } from '@tanstack/react-virtual'

const parentRef = React.useRef<HTMLDivElement>(null)
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
  overscan: 10,
})

// Hitung padding virtualizer sebelum dan sesudah baris aktif
const virtualRows = rowVirtualizer.getVirtualItems()
const totalSize = rowVirtualizer.getTotalSize()
const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0) : 0`,
          },
        ],
      },
      {
        id: "penyimpanan-file",
        title: "2.3 Standar Penyimpanan Berkas & Persistent Mount Dokploy",
        badge: "File Management",
        content: `Untuk memastikan seluruh dokumen, foto bukti lapangan, dan berkas yang diunggah pengguna tidak hilang saat container dideploy ulang di Dokploy, sistem menerapkan **Aturan Terpusat**:

1. **Direktori Fisik**:
   - Di lingkungan produksi Dokploy, direktori server \`/mnt/data/one-chitra/uploads\` di-mount langsung (*Persistent Bind Mount*) ke direktori container \`/app/public/uploads\`.
2. **Server Action Terpusat**:
   - Dilarang memanggil modul \`fs\` secara langsung di komponen atau action individual.
   - Seluruh upload wajib menggunakan action \`uploadFile\` dari \`@/app/actions/upload\`.
3. **Penyajian Berkas (Serving API)**:
   - Berkas disajikan melalui rute API khusus \`GET /api/uploads/[filename]\` untuk memintas batasan file statis Next.js pada mode *standalone*.`,
        codeSnippets: [
          {
            title: "Penggunaan uploadFile Action Terpusat",
            language: "typescript",
            code: `import { uploadFile } from '@/app/actions/upload'

const formData = new FormData()
formData.append('file', fileInstance)

const result = await uploadFile(formData)
if (result.success) {
  // result.url mengembalikan URL publik: "/api/uploads/uuid-namafile.png"
  const fileUrl = result.url
}`,
          },
        ],
      },
    ],
  },

  // ==========================================
  // BAB 3: KEAMANAN, AUTENTIKASI & TATA KELOLA RBAC
  // ==========================================
  {
    id: "security-governance",
    number: 3,
    title: "Bab 3: Keamanan Sistem, Autentikasi & Tata Kelola RBAC",
    shortTitle: "Keamanan & RBAC",
    badge: "Security & RBAC",
    description:
      "Arsitektur keamanan enterprise: autentikasi Better-Auth, otorisasi berbasis Role & Permission (resource:action), data scoping, perlindungan injeksi SQL, dan audit log.",
    sections: [
      {
        id: "autentikasi-sesi",
        title: "3.1 Mekanisme Autentikasi & Manajemen Sesi",
        badge: "Autentikasi",
        content: `Sistem HERO menggunakan pustaka **Better-Auth** yang telah dikustomisasi untuk menangani sesi pengguna dengan standar keamanan tinggi:

- **Cookie Sesi Aman**: Token sesi disimpan dalam cookie bertanda \`HttpOnly\`, \`Secure\`, dan \`SameSite=Lax/Strict\`. Script sisi klien (JavaScript XSS) tidak dapat membaca token ini secara langsung.
- **Validasi Server-Side**: Setiap rute di dalam \`/dashboard\` memverifikasi sesi melalui fungsi \`getServerSession()\` di \`lib/auth-session.ts\`. Jika sesi tidak valid, pengguna langsung dialihkan ke \`/sign-in\`.
- **Deteksi Perangkat**: Header \`user-agent\` diperiksa secara otomatis. Jika pengguna mengakses dari perangkat seluler (*mobile*), sistem secara otomatis mengalihkan navigasi ke antarmuka aplikasi seluler native di rute \`/mobile\`.
- **Pengecekan Status Karyawan**: Jika akun karyawan berstatus non-aktif (\`employmentStatus === 'inactive'\` atau \`isActive === false\`), sesi langsung dihapus dan diarahkan ke \`/sign-in?error=account_deactivated\`.`,
      },
      {
        id: "rbac-arsitektur",
        title: "3.2 Arsitektur Role-Based Access Control (RBAC)",
        badge: "Otorisasi",
        content: `Tata kelola akses di HERO diatur menggunakan matriks **Resource & Action** yang sangat fleksibel:

### 1. Format Penamaan Permission
Setiap izin dinyatakan dalam format: \`resource:action\`
- **Resource**: Nama modul atau fitur (contoh: \`sales-orders\`, \`evhs\`, \`daily-activity\`, \`system_documentation\`).
- **Action**: Empat aksi standar: \`view\`, \`create\`, \`edit\`, \`delete\`.

### 2. Tingkatan Cakupan Data (Data Scope)
Setiap peran memiliki batasan cakupan data:
- \`own\`: Hanya dapat melihat dan mengelola data miliknya sendiri.
- \`site\`: Dapat melihat dan mengelola data seluruh karyawan di site penempatan yang sama.
- \`global\`: Dapat melihat dan mengelola data di seluruh cabang/site perusahaan.

### 3. Komponen Pengaman (Guards)
- **Klien**: Menggunakan hook \`usePermissions()\` untuk menyembunyikan atau menampilkan tombol aksi secara kondisional.
- **Server / Komponen**: Menggunakan \`<PermissionGuard resource="nama-modul" action="aksi">\` untuk membungkus komponen sensitif.
- **Rute Dashboard**: Fungsi \`getDashboardRoutePermission(path)\` secara otomatis memeriksa izin rute sebelum merender halaman.`,
        codeSnippets: [
          {
            title: "Penggunaan usePermissions & PermissionGuard",
            language: "tsx",
            code: `// Contoh 1: Client Hook Check
import { usePermissions } from '@/hooks/use-permissions'

const { hasResourcePermission } = usePermissions()
const canEdit = hasResourcePermission('daily-activity', 'edit')

{canEdit && <Button>Edit Laporan</Button>}

// Contoh 2: Component Wrapper Guard
import { PermissionGuard } from '@/components/permission-guard'

<PermissionGuard resource="daily-activity" action="create">
  <CreateActivityForm />
</PermissionGuard>`,
          },
        ],
      },
      {
        id: "keamanan-data",
        title: "3.3 Proteksi Data, SQL Injection & Audit Trail",
        badge: "Data Protection",
        content: `Keamanan data dipastikan melalui perlindungan berlapis (*Defense in Depth*):

1. **Pencegahan SQL Injection**:
   - Seluruh interaksi database dilakukan melalui **Drizzle ORM** yang secara otomatis menggunakan *parameterized queries* bawaan PostgreSQL driver. Tidak ada string concatenation raw query yang digunakan tanpa escape aman.
2. **Validasi Input Skema**:
   - Seluruh payload request dan server actions divalidasi ketat menggunakan pustaka **Zod**. Input yang tidak sesuai tipe data atau memiliki karakter berbahaya langsung ditolak pada layer terluar.
3. **Audit Logging (\`audit_logs\`)**:
   - Seluruh perubahan data penting (perubahan status approval, pembaruan data karyawan, penghapusan dokumen) dicatat dalam tabel \`audit_logs\` lengkap dengan ID pengguna, alamat IP, timestamp, nilai sebelum, dan nilai sesudah perubahan.`,
      },
    ],
  },

  // ==========================================
  // BAB 4: ERD, KAMUS DATA & ARSITEKTUR DATABASE
  // ==========================================
  {
    id: "database-erd",
    number: 4,
    title: "Bab 4: Diagram Relasi Entitas (ERD) & Kamus Data",
    shortTitle: "ERD & Database",
    badge: "Schema & ERD",
    description:
      "Struktur lengkap database PostgreSQL, relasi antar tabel utama, kamus data kolom kritis, dan SOP migrasi skema menggunakan Drizzle ORM.",
    sections: [
      {
        id: "single-source-of-truth",
        title: "4.1 Prinsip Tunggal: hero_employees Sebagai Single Source of Truth",
        badge: "Data Integrity",
        content: `Prinsip fundamental dari database HERO adalah bahwa **tabel \`hero_employees\` adalah satu-satunya sumber kebenaran identitas karyawan**.

### Relasi Inti Karyawan
\`\`\`
┌─────────────────────────────────┐
│     hero_master_departments     │
│   id (PK), code, name, site_id  │
└───────────────┬─────────────────┘
                │ 1
                │ N
┌───────────────▼─────────────────┐       ┌─────────────────────────────┐
│      hero_master_sections       │       │         hero_sites          │
│ id (PK), dept_id (FK), name     │       │ id (PK), code, name, address│
└───────────────┬─────────────────┘       └──────────────┬──────────────┘
                │ 1                                      │ 1
                │ N                                      │ N
                │         ┌──────────────────────┐       │
                └────────►│    hero_employees    │◄──────┘
                          │ id (PK), auth_user_id│
                          │ employee_sn (NRP)    │
                          │ name, email, phone   │
                          │ department_id (FK)   │
                          │ section_id (FK)      │
                          │ site_id (FK)         │
                          │ position_id (FK)     │
                          │ employment_status    │
                          └──────────┬───────────┘
                                     │ 1
                 ┌───────────────────┼───────────────────┐
                 │ N                 │ N                 │ N
                 ▼                   ▼                   ▼
     ┌───────────────────────┐ ┌───────────┐ ┌───────────────────────┐
     │ hero_daily_activities │ │attendance │ │hero_approval_workflows│
     └───────────────────────┘ └───────────┘ └───────────────────────┘
\`\`\``,
      },
      {
        id: "kamus-data-kritis",
        title: "4.2 Kamus Data Modul Utama (Data Dictionary)",
        badge: "Kamus Kolom",
        content: `Berikut adalah rincian kolom-kolom kritis pada modul utama sistem HERO:`,
        tables: [
          {
            title: "Tabel: hero_employees (Data Karyawan Utama)",
            headers: ["Nama Kolom", "Tipe Data", "Relasi / Keterangan", "Fungsi"],
            rows: [
              ["id", "serial (PK)", "Primary Key", "ID unik karyawan dalam sistem"],
              ["auth_user_id", "text (FK)", "user.id (Better-Auth)", "Tautan ke akun login autentikasi"],
              ["employee_sn", "text", "Unique (NRP)", "Nomor Induk Karyawan resmi (misal: CP-2024-001)"],
              ["name", "text", "Not Null", "Nama lengkap resmi karyawan"],
              ["email", "text", "Unique, Not Null", "Email resmi perusahaan untuk login & notifikasi"],
              ["site_id", "integer (FK)", "hero_sites.id", "Site penempatan operasional karyawan"],
              ["department_id", "integer (FK)", "hero_master_departments.id", "Departemen tempat karyawan bertugas"],
              ["section_id", "integer (FK)", "hero_master_sections.id", "Seksi spesifik karyawan (opsional)"],
              ["position_id", "integer (FK)", "hero_master_positions.id", "Jabatan struktural/fungsional karyawan"],
              ["access_role", "text", "Default: 'Operational Staff'", "Peran hak akses keamanan sistem (RBAC)"],
              ["employment_status", "text", "'active' | 'inactive'", "Status kepegawaian karyawan"],
              ["contract_duration_start", "date", "Nullable", "Tanggal mulai masa kontrak kerja"],
              ["contract_duration_end", "date", "Nullable", "Tanggal akhir masa kontrak kerja"],
            ],
          },
          {
            title: "Tabel: hero_approval_workflows & Steps (Engine Persetujuan)",
            headers: ["Nama Kolom", "Tipe Data", "Keterangan", "Fungsi"],
            rows: [
              ["id", "serial (PK)", "Primary Key", "ID workflow unik"],
              ["entity_type", "text", "Not Null", "Tipe dokumen (misal: 'daily_activity', 'overtime')"],
              ["entity_id", "integer", "Not Null", "ID record dokumen yang diajukan"],
              ["current_step", "integer", "Default: 1", "Tingkat persetujuan aktif saat ini"],
              ["total_steps", "integer", "Default: 1", "Total jumlah tingkatan yang diperlukan"],
              ["overall_status", "text", "'pending' | 'approved' | 'rejected'", "Status global persetujuan dokumen"],
              ["approver_employee_id", "integer (FK)", "hero_employees.id", "Karyawan yang berhak menyetujui step ini"],
              ["decision_note", "text", "Nullable", "Catatan persetujuan atau alasan penolakan"],
            ],
          },
        ],
      },
      {
        id: "sop-migrasi-database",
        title: "4.3 SOP Migrasi & Sinkronisasi Database Drizzle ORM",
        badge: "Database SOP",
        content: `Untuk mencegah terjadinya error kolom hilang (*missing column errors*) setelah penambahan fitur atau skema baru, seluruh engineer wajib mematuhi alur sinkronisasi database berikut:

### 1. Sinkronisasi Cepat untuk Pengembangan (\`db:push\`)
Gunakan perintah ini saat melakukan iterasi fitur lokal:
\`\`\`bash
npm run db:push
\`\`\`

### 2. Pembuatan Berkas Migrasi Resmi (\`db:generate\`)
Gunakan perintah ini sebelum rilis produksi untuk menghasilkan berkas riwayat \`.sql\` di direktori \`drizzle/\`:
\`\`\`bash
npm run db:generate
\`\`\`

### 3. Verifikasi Wajib (Mandatory Check)
Setelah menjalankan sinkronisasi atau migrasi, **WAJIB** memverifikasi bahwa perubahan kolom telah diterapkan pada PostgreSQL:
\`\`\`bash
npm run db:studio
\`\`\`
> [!WARNING]
> Jika setelah \`db:push\` aplikasi masih mengeluhkan missing column, lakukan **restart server Next.js** (\`npm run dev\`) untuk membersihkan cache metadata Drizzle ORM.`,
      },
    ],
  },

  // ==========================================
  // BAB 5: ALUR KERJA & MODUL OPERASIONAL
  // ==========================================
  {
    id: "business-workflows",
    number: 5,
    title: "Bab 5: Alur Kerja Operasional & Multi-Channel Engine",
    shortTitle: "Alur Bisnis & Engine",
    badge: "Operational Workflows",
    description:
      "Alur siklus hidup proses bisnis HERO: Approval Engine dinamis, real-time notification bell, email relay terpusat, dan background reminder jobs.",
    sections: [
      {
        id: "approval-engine",
        title: "5.1 Dynamic Approval Engine & Resolusi Rute",
        badge: "Approval Engine",
        content: `Sistem HERO memiliki mesin persetujuan terpusat (*Centralized Approval Engine*) yang dinamis. Setiap transaksi atau formulir baru (Daily Activity, Lembur, Cuti, dsb.) tidak boleh membuat logika approval ad-hoc, melainkan wajib terintegrasi dengan resolver terpusat:

1. **Dynamic Route Resolver**:
   - Fungsi \`resolveApprovalRouteForActivity\` menentukan urutan approver berdasarkan hierarki organisasi karyawan:
     - Level 1: Supervisor / Section Head.
     - Level 2: Department Head.
     - Level 3: General Manager / Site Manager (jika dokumen memiliki dampak biaya atau strategis).
2. **Halaman Inbox Terpadu**:
   - Seluruh pengajuan yang membutuhkan tindakan approver langsung muncul di satu tempat terpusat di rute \`/dashboard/approval\`.
3. **Status Lifecycle Dokumen**:
   - \`draft\` -> \`submitted\` -> \`pending_step_1\` -> \`pending_step_2\` -> \`approved\` (atau \`rejected\` / \`revision_requested\`).`,
      },
      {
        id: "multi-channel-notification",
        title: "5.2 Multi-Channel Notification Engine (Bell, Email & Reminders)",
        badge: "Notification Engine",
        content: `Setiap pembaruan status transaksi penting wajib disiarkan melalui tiga kanal terpadu secara simultan:

### 1. In-App Notification Bell
- Header aplikasi dilengkapi ikon lonceng notifikasi (\`SiteHeader\`) yang membaca event notifikasi aktif secara real-time untuk pengguna yang sedang login dari tabel \`notification_events\`.

### 2. Centralized Email Relay (\`lib/workflow-email.ts\`)
- Pengiriman email tidak boleh dilakukan sembarangan atau di-hardcode di server action.
- Wajib menggunakan helper \`sendWorkflowEmail\` terpusat yang:
  - Mengambil pengaturan SMTP aktif dari database.
  - Membaca template email dinamis berdasarkan \`templateCode\` dari panel admin \`Settings > Email\`.
  - Mencatat riwayat pengiriman dan status pengiriman (sukses/gagal) ke tabel \`notification_deliveries\`.

### 3. Background Reminder Jobs (\`reminderJobs\`)
- Cron jobs yang memeriksa transaksi yang belum disetujui mendekati batas SLA (Service Level Agreement) dan secara otomatis mengirimkan email pengingat kepada approver terkait.`,
        codeSnippets: [
          {
            title: "Penggunaan Pengiriman Email Terpusat",
            language: "typescript",
            code: `import { sendWorkflowEmail } from '@/lib/workflow-email'

await sendWorkflowEmail({
  templateCode: 'APPROVAL_REQUEST_ACTIVITY',
  recipientEmail: approver.email,
  recipientName: approver.name,
  variables: {
    requesterName: employee.name,
    activityDate: formattedDate,
    activityTitle: activity.title,
    approvalUrl: \`https://hero.chitraparatama.co.id/dashboard/approval?id=\${workflowId}\`,
  },
})`,
          },
        ],
      },
    ],
  },

  // ==========================================
  // BAB 6: DEPLOYMENT, DEVOPS & MAINTENANCE GUIDE
  // ==========================================
  {
    id: "deployment-devops",
    number: 6,
    title: "Bab 6: Panduan Deployment, DevOps & Pemeliharaan Server",
    shortTitle: "Deployment & DevOps",
    badge: "Dokploy & DevOps",
    description:
      "Panduan lengkap deployment di Dokploy, konfigurasi Dockerfile standalone, backup & restore database PostgreSQL, serta troubleshooting error umum.",
    sections: [
      {
        id: "dokploy-production",
        title: "6.1 Panduan Rilis Produksi di Dokploy (Docker Container)",
        badge: "Dokploy Setup",
        content: `Aplikasi HERO dideploy ke server produksi menggunakan platform **Dokploy** yang mengorkestrasi container Docker.

### Langkah-Langkah Konfigurasi Dokploy:
1. **Buat Aplikasi Baru di Dokploy**:
   - Pilih sumber dari GitHub repositori \`Annaskhadafi/hero\`.
   - Pilih branch produksi: \`main\`.
   - Build Type: **Dockerfile**.
2. **Konfigurasi Persistent Bind Mount**:
   - Buka tab **Volumes** di aplikasi Dokploy.
   - Tambahkan Volume Binding:
     - **Host Path**: \`/mnt/data/one-chitra/uploads\`
     - **Container Path**: \`/app/public/uploads\`
     - *Perhatian*: Ini krusial agar file yang diunggah pengguna tidak hilang saat container rebuild!
3. **Environment Variables**:
   - Masukkan seluruh variabel lingkungan rahasia (\`DATABASE_URL\`, \`BETTER_AUTH_SECRET\`, \`SMTP_PASS\`, dll.) di tab **Environment Variables** Dokploy.
4. **Deploy Application**:
   - Klik tombol **Deploy**. Dokploy akan menjalankan multi-stage Dockerfile yang memproduksi output Next.js standalone dengan ukuran image minimal (~200MB).`,
      },
      {
        id: "backup-restore-sop",
        title: "6.2 Prosedur Backup & Restore Database PostgreSQL",
        badge: "Backup & Recovery",
        content: `Untuk mengantisipasi keadaan darurat bencana (*disaster recovery*), lakukan pencadangan data berkala:`,
        codeSnippets: [
          {
            title: "Perintah Backup Database (pg_dump)",
            language: "bash",
            code: `# Backup database lengkap dengan format custom terkompresi
pg_dump -U postgres -h localhost -d hero_db -F c -b -v -f "/backup/hero_db_$(date +%Y%m%d_%H%M%S).dump"`,
          },
          {
            title: "Perintah Restore Database (pg_restore)",
            language: "bash",
            code: `# Restore database dari file dump
pg_restore -U postgres -h localhost -d hero_db -v -c "/backup/hero_db_20260920_120000.dump"`,
          },
        ],
      },
      {
        id: "troubleshooting-guide",
        title: "6.3 Troubleshooting Masalah Umum (FAQ Pengembang)",
        badge: "Troubleshooting",
        content: `Berikut adalah solusi atas kendala yang paling sering ditemui dalam operasional sehari-hari:

### 1. Error: "column x does not exist"
- **Penyebab**: Kode aplikasi telah memperbarui skema Drizzle ORM, namun database belum disinkronkan.
- **Solusi**: Jalankan \`npm run db:push\` pada server/lingkungan terkait, lalu restart service Next.js.

### 2. Error: "<html> cannot contain a nested <script>"
- **Penyebab**: Terjadi injeksi tag script di luar container \`<head>\` pada \`app/layout.tsx\`.
- **Solusi**: Pindahkan seluruh script inisialisasi ke dalam tag \`<head>\` menggunakan \`<script dangerouslySetInnerHTML={{ __html: ... }} />\`.

### 3. File yang diunggah menghasilkan error 404
- **Penyebab**: Persistent volume mount Dokploy belum dipasang ke \`/app/public/uploads\`.
- **Solusi**: Periksa tab Volume di Dokploy dan pastikan binding \`/mnt/data/one-chitra/uploads\` mengarah ke \`/app/public/uploads\`.`,
      },
    ],
  },

  // ==========================================
  // BAB 7: KATALOG SPESIFIKASI TEKNIS SETIAP HALAMAN (PAGE-BY-PAGE SPECS)
  // ==========================================
  {
    id: "page-specifications",
    number: 7,
    title: "Bab 7: Katalog Spesifikasi Teknis Setiap Halaman (Page-by-Page Technical Specification)",
    shortTitle: "Katalog Setiap Halaman",
    badge: "Page-by-Page Specs",
    description:
      "Spesifikasi teknis mendalam untuk setiap halaman aplikasi HERO: rute URL, sumber data tabel database (PostgreSQL/Drizzle), fitur-fitur antarmuka, dan fungsi alur operasionalnya.",
    sections: [
      {
        id: "page-specs-overview",
        title: "7.1 Ikhtisar Katalog Halaman & Standar Arsitektur Halaman",
        badge: "Standar Halaman",
        content: `Setiap halaman di dalam sistem HERO dibangun mengikuti standar arsitektur terpadu:
1. **Rute & Hak Akses**: Setiap halaman dipetakan ke rute Next.js App Router dan dilindungi oleh izin RBAC (\`resource:action\`).
2. **Sumber Data (SSoT)**: Mengambil data langsung dari PostgreSQL melalui Drizzle ORM query builder. Khusus data karyawan, wajib merujuk ke \`hero_employees\` sebagai Single Source of Truth.
3. **Pola Antarmuka**: Menggunakan TanStack Table dengan virtualisasi (\`@tanstack/react-virtual\`), command bar standar dengan pencarian, filter kontekstual, ekspor Excel, dan dialog CRUD berbasis modal.`,
      },
      {
        id: "page-specs-detail",
        title: "7.2 Matriks Lengkap Halaman, Sumber Data, Fitur & Fungsinya",
        badge: "Matriks Halaman",
        content: `Di bawah ini adalah rincian teknis lengkap setiap halaman operasional utama di dalam sistem HERO untuk mempermudah transfer pengetahuan (handover) kepada pengembang berikutnya:`,
        tables: [
          {
            title: "Katalog Halaman: Human Capital & Kepegawaian",
            headers: ["Rute Halaman", "Nama Halaman", "Tabel Sumber Data", "Fitur Utama", "Fungsi & Alur Bisnis"],
            rows: [
              [
                "/dashboard/hc/employee",
                "Master Data Karyawan",
                "hero_employees, hero_master_departments, hero_master_sections, hero_sites, hero_master_positions, user",
                "TanStack Virtual Table, Filter Site/Dept, Search NRP/Nama, Dialog Tambah/Edit Karyawan, Import CSV (field mapping), Export Excel, Reset Password, Nonaktifkan Akun",
                "Single Source of Truth (SSoT) seluruh data karyawan di perusahaan. Mengelola profil, penempatan site, departemen, seksi, jabatan struktural, dan status keaktifan akun.",
              ],
              [
                "/dashboard/master-data",
                "Master Organisasi & Site",
                "hero_master_departments, hero_master_sections, hero_sites, hero_master_positions",
                "Hierarchical Tree View, Filter Site, Form Tambah/Edit Departemen & Seksi, Export Excel, Inline validation",
                "Pengelolaan struktur organisasi perusahaan: master cabang/site operasional tambang, departemen, seksi kerja, dan daftar jabatan resmi.",
              ],
              [
                "/dashboard/hc/contract-review",
                "Review Kontrak Karyawan",
                "hero_employees, hero_hr_contract_reviews",
                "Filter Jatuh Tempo Kontrak (30/60/90 hari), Badge Status Kontrak, Dialog Evaluasi Perpanjangan, Generate Draft Surat Kontrak, Export Excel",
                "Monitoring masa berlaku kontrak kerja PKWT karyawan, evaluasi kinerja menjelang habis masa kontrak, dan rekomendasi perpanjangan/pengangkatan tetap.",
              ],
              [
                "/dashboard/hc/counseling",
                "Konseling & Surat Peringatan (SP)",
                "hero_counseling_sessions, hero_employees, hero_warning_letters",
                "Form Pencatatan Konseling, Upload Bukti Notulen/Foto, Penerbitan SP 1/2/3 dengan template resmi, Generate PDF SP, Integrasi Approval HC",
                "Pencatatan sesi bimbingan/konseling masalah disiplin karyawan dan penerbitan Surat Peringatan berjenjang sesuai regulasi ketenagakerjaan.",
              ],
            ],
          },
          {
            title: "Katalog Halaman: Timesheet, Kehadiran & Aktivitas Harian",
            headers: ["Rute Halaman", "Nama Halaman", "Tabel Sumber Data", "Fitur Utama", "Fungsi & Alur Bisnis"],
            rows: [
              [
                "/dashboard/activity-hub/my-day",
                "Aktivitas Harian Saya (My Day)",
                "hero_daily_activities, hero_daily_activity_sessions, hero_approval_workflows",
                "Input Aktivitas Interaktif, Start/Pause/Stop Session Timer, Upload Foto Bukti Lapangan, Auto-Calculate Durasi, Submit to Approval Engine",
                "Laporan kerja harian mandiri untuk setiap karyawan. Mencatat rincian tugas per sesi waktu, melampirkan dokumentasi kerja, dan mengajukan approval ke atasan.",
              ],
              [
                "/dashboard/activity-hub/team-board",
                "Papan Pantau Tim (Team Board)",
                "hero_daily_activities, hero_employees, hero_master_departments",
                "Filter Departemen/Site, Status Filter (Draft, Submitted, Approved), Timeline Progress Bar, Export Excel Rekap, Quick View Detail Aktivitas",
                "Dashboard supervisi bagi Section Head dan Dept Head untuk memantau kehadiran, jam kerja efektif, dan kemajuan aktivitas seluruh anggota tim secara real-time.",
              ],
              [
                "/dashboard/activity-hub/document/[sessionId]",
                "Detail Dokumen Sesi Aktivitas",
                "hero_daily_activity_sessions, hero_daily_activities, hero_employees",
                "Document-Style Preview Layout, Image Lightbox Foto Bukti, Log Timestamp Sesi, Tombol Edit Sesi, Cetak Lembar Aktivitas",
                "Tampilan rincian mendalam satu sesi aktivitas kerja tertentu lengkap dengan koordinat, foto dokumentasi, deskripsi pekerjaan, dan catatan reviewer.",
              ],
              [
                "/dashboard/attendance",
                "Presensi & Roster Kerja",
                "attendance, hero_employees, hero_sites",
                "Tombol Clock In / Clock Out, Deteksi Geofencing GPS Site, Rekap Kehadiran Bulanan, Kalender Shift/Roster, Export Laporan Kehadiran CSV/Excel",
                "Pencatatan presensi datang dan pulang kerja karyawan yang tervalidasi radius lokasi site kerja resmi dan jam kerja shift operasional.",
              ],
              [
                "/dashboard/attendance/live-map",
                "Peta Kehadiran GPS & Face Verification",
                "attendance, hero_employees, hero_sites",
                "Peta Interaktif Lokasi Absensi, Face Verification Camera (face-api.js), Cluster Pin Marker per Site, Log Anomali Lokasi di Luar Radius",
                "Monitoring visual lokasi presensi karyawan di lapangan dengan validasi biometrik pengenalan wajah guna mencegah titip absen atau manipulasi lokasi.",
              ],
              [
                "/dashboard/overtime-requests",
                "Pengajuan & Rekap Lembur",
                "hero_overtime_requests, hero_employees, hero_approval_workflows",
                "Form Surat Perintah Lembur (SPL), Kalkulator Otomatis Jam & Upah Lembur, Multi-Tier Approval Flow, Cetak Form Lembur PDF Resmi, Export Excel Payroll",
                "Pengelolaan otorisasi lembur karyawan sebelum dan sesudah pekerjaan dilakukan, validasi jam istirahat, serta rekapitulasi data lembur untuk proses gaji.",
              ],
            ],
          },
          {
            title: "Katalog Halaman: Centralized Approval Engine",
            headers: ["Rute Halaman", "Nama Halaman", "Tabel Sumber Data", "Fitur Utama", "Fungsi & Alur Bisnis"],
            rows: [
              [
                "/dashboard/approval",
                "Inbox Persetujuan Terpadu",
                "hero_approval_workflows, hero_approval_steps, hero_approval_logs, hero_employees, notification_events",
                "Filter Dokumen (Activity, Lembur, 5R, WO), Status Filter (Pending, Approved, Rejected), Quick Action Approve/Reject, Dialog Catatan Alasan, Document Preview Modal (max-w-5xl), Riwayat Approval Log",
                "Pintu utama persetujuan seluruh transaksi di HERO. Memungkinkan atasan meninjau, menyetujui, atau menolak pengajuan bawahan dengan satu klik dari satu halaman terpusat.",
              ],
              [
                "/dashboard/approval-engine",
                "Konfigurasi Workflow Persetujuan",
                "hero_approval_workflows, hero_approval_steps, hero_master_departments",
                "Visual Workflow Builder, Setting Tingkatan Approver (Level 1, 2, 3), Penentuan Batas Nominal/Kewenangan, Pengaturan Eskalasi Waktu (SLA)",
                "Pengaturan aturan main persetujuan dokumen perusahaan: siapa yang berhak menyetujui jenis dokumen tertentu, berapa lapis approval, dan durasi maksimal persetujuan.",
              ],
            ],
          },
          {
            title: "Katalog Halaman: HSE, K3 & 5R",
            headers: ["Rute Halaman", "Nama Halaman", "Tabel Sumber Data", "Fitur Utama", "Fungsi & Alur Bisnis"],
            rows: [
              [
                "/dashboard/hse/five-r",
                "Audit & Penilaian 5R",
                "hero_five_r_assessments, hero_five_r_findings, hero_sites, hero_approval_workflows",
                "Form Audit 5R (Ringkas, Rapi, Resik, Rawat, Rajin), Kalkulasi Indeks Skor Otomatis, Upload Foto Kondisi Temuan, Cetak Laporan Audit 5R A4 PDF Resmi, Integrasi Approval",
                "Inspeksi berkala kepatuhan budaya kerja 5R pada area kerja kantor, workshop, dan gudang dengan penilaian terstandar dan dokumentasi foto.",
              ],
              [
                "/dashboard/hse/five-r/findings",
                "Temuan & Tindakan Korektif (CAPA) 5R",
                "hero_five_r_findings, hero_five_r_assessments, hero_employees",
                "Filter Status Temuan (Open, In Progress, Closed), Upload Foto Bukti Perbaikan (Before-After), Due Date Tracker, Assign PIC Tindakan Perbaikan",
                "Tindak lanjut atas temuan audit 5R yang belum memenuhi standar agar PIC yang ditunjuk segera melakukan tindakan perbaikan dan menutup temuan.",
              ],
              [
                "/dashboard/hse/evhs",
                "Laporan K3 & Insiden (EVHS)",
                "hero_evhs_reports, hero_employees, hero_sites",
                "Form Pelaporan Insiden/Hazard/Nearmiss, Matriks Penilaian Risiko (Risk Matrix), Investigasi Penyebab (5 Why / Fishbone), Notifikasi Email Otomatis ke Tim HSE",
                "Pelaporan cepat dan investigasi mendalam setiap bahaya keselamatan, kecelakaan kerja, atau insiden lingkungan di site operasional.",
              ],
              [
                "/dashboard/hse/tire-inspection",
                "Inspeksi Ban di Site (Tire Inspection)",
                "hero_tire_inspections, hero_fleet, hero_customers",
                "Input Tekanan Angin (PSI), Kedalaman Alur (Tread Depth R1-R4), Deteksi Kerusakan Dinding/Crown Ban, Kamera Foto Ban, Rekomendasi Tindakan (Rotasi/Repair/Scrap)",
                "Inspeksi teknis ban kendaraan tambang/alat berat di lapangan untuk memperpanjang usia pakai ban dan mencegah insiden pecah ban di jalur tambang.",
              ],
              [
                "/dashboard/apd",
                "Manajemen & Distribusi APD",
                "hero_apd_distributions, hero_apd_inventory, hero_employees",
                "Katalog APD (Helm, Safety Shoes, Rompi, Kacamata), Catatan Penyerahan APD ke Karyawan, Form Tanda Tangan Penerimaan Digital, Tracker Jadwal Penggantian Rutin",
                "Pengelolaan distribusi perlengkapan keselamatan kerja perorangan kepada karyawan sesuai standar risiko jabatan masing-masing.",
              ],
            ],
          },
          {
            title: "Katalog Halaman: Central Service, Logistik & Maintenance",
            headers: ["Rute Halaman", "Nama Halaman", "Tabel Sumber Data", "Fitur Utama", "Fungsi & Alur Bisnis"],
            rows: [
              [
                "/dashboard/central-service",
                "Monitoring Operasional Central Service",
                "hero_form_wo, hero_fleet, hero_deliveries",
                "KPI Dashboard WO Masuk vs Selesai, Status Antrian Bengkel Ban, Utilisasi Teknisi, Filter Site & Periode, Export Rekap Bulanan",
                "Pusat kendali operasional workshop vulkanisir dan perbaikan ban: memantau beban kerja teknisi, produktivitas, dan ketepatan waktu servis.",
              ],
              [
                "/dashboard/central-service/service-form",
                "Form WO-24 Perbaikan Ban",
                "hero_form_wo, hero_fleet, hero_customers, hero_approval_workflows",
                "Form Surat Perintah Kerja WO-24, Input Serial Number Ban, Rincian Jenis Kerusakan & Bahan Tambal, Tanda Tangan Digital Teknisi, Cetak Form WO-24 A4 PDF",
                "Pencatatan teknis pengerjaan servis/repair ban dari saat ban diterima, proses pengerjaan, verifikasi QC, hingga ban siap diserahkan ke pelanggan.",
              ],
              [
                "/dashboard/central-service/assets",
                "Manajemen Aset Mesin & Fasilitas",
                "hero_workshop_assets, hero_sites",
                "Daftar Aset Mesin (Buffing, Curing Chamber, Spreader), Jadwal Maintenance Preventif, Riwayat Kerusakan & Suku Cadang, Status Kondisi Mesin",
                "Pengelolaan pemeliharaan mesin-mesin workshop utama agar selalu dalam kondisi prima dan meminimalkan downtime fasilitas perbaikan.",
              ],
              [
                "/dashboard/fleet",
                "Manajemen Armada Kendaraan (Fleet)",
                "hero_fleet, hero_fleet_trips, hero_employees",
                "Database Kendaraan (Nomor Polisi, Tipe, Site), Log Perjalanan (Trip Log), Pencatatan Odometer & Konsumsi BBM, Jadwal Servis & Pajak/KIR",
                "Pengawasan utilisasi kendaraan operasional perusahaan, efisiensi bahan bakar, dan kepatuhan masa berlaku surat-surat legalitas armada.",
              ],
              [
                "/dashboard/deliveries",
                "Pelacakan Pengiriman & Manifest Kargo",
                "hero_deliveries, hero_fleet, hero_customers",
                "Form Surat Jalan Pengiriman Ban/Barang, Upload Foto Bukti Serah Terima (POD - Proof of Delivery), Status Pengiriman (In Transit, Delivered), Cetak Surat Jalan Resmi",
                "Monitoring logistik pengiriman ban hasil servis atau barang baru dari workshop ke site pelanggan lengkap dengan bukti tanda terima digital.",
              ],
            ],
          },
          {
            title: "Katalog Halaman: Sistem, Keamanan, Integrasi AI & Pengaturan",
            headers: ["Rute Halaman", "Nama Halaman", "Tabel Sumber Data", "Fitur Utama", "Fungsi & Alur Bisnis"],
            rows: [
              [
                "/dashboard/security",
                "Manajemen Role, RBAC & Audit Trail",
                "hero_security_roles, hero_role_menu_permissions, hero_navbar_menu_items, audit_logs",
                "Matriks Permission resource:action (view, create, edit, delete), Penugasan Role ke Karyawan, Konfigurasi Data Scope (own, site, global), Viewer Riwayat Audit Trail Log",
                "Pusat kendali keamanan dan hak akses sistem: menentukan batasan menu dan aksi yang boleh dilakukan oleh setiap jabatan karyawan di seluruh modul.",
              ],
              [
                "/dashboard/settings/email",
                "Pengaturan Email & Template Terpusat",
                "hero_email_settings, hero_email_templates, notification_deliveries",
                "Konfigurasi Server SMTP Aktif, Editor Template Email per templateCode, Live Preview Email dengan Sample Data, Log Status Pengiriman Email (Sukses/Gagal)",
                "Pengelolaan terpusat seluruh komunikasi surat elektronik sistem (notifikasi approval, reminder SLA, notifikasi darurat insiden HSE).",
              ],
              [
                "/dashboard/hero-genius",
                "Hero Genius AI Assistant",
                "hero_genius_sessions, hero_genius_messages, hero_genius_documents",
                "Chat Interaktif AI bertenaga LLM, Konsultasi SOP & WIN Perusahaan, Generator Alur Approval Otomatis, Viewer Dokumen Markdown & PDF",
                "Asisten kecerdasan buatan terintegrasi untuk membantu karyawan mencari prosedur kerja standar (SOP), pedoman kerja (WIN), dan menganalisis data operasional.",
              ],
              [
                "/dashboard/feature-map",
                "Peta Fitur & Blueprint Interaktif",
                "hero_navbar_menu_items (dynamic routes)",
                "Canvas Peta Fitur Interaktif, Zoom In/Out Controller, Ekspor Peta resolusi tinggi ke format JPEG (HD) & PNG, Filter Fitur berdasarkan Domain",
                "Visualisasi grafis seluruh ekosistem fitur HERO yang saling terhubung untuk orientasi manajemen dan pengembang.",
              ],
              [
                "/dashboard/documentation",
                "Portal Dokumentasi & Handover Sistem",
                "HERO_DOCUMENTATION_CHAPTERS, HERO_PAGE_SPECIFICATIONS",
                "Panduan Serah Terima Lengkap, Arsitektur Sistem, Keamanan, ERD Database, Katalog Halaman Lengkap, Ekspor Cetak Blueprint PDF A4 Resmi (WYSIWYG)",
                "Pusat dokumentasi resmi dan panduan serah terima (handover) komprehensif bagi pengembang berikutnya agar memahami sistem HERO 100%.",
              ],
            ],
          },
        ],
      },
    ],
  },
]

// ==========================================
// DATA STRUKTUR PAGE SPECIFICATIONS UNTUK FILTER INTERAKTIF
// ==========================================
export interface PageSpecItem {
  id: string
  route: string
  title: string
  category: "Human Capital & Kepegawaian" | "Timesheet & Kehadiran" | "Approval Engine" | "HSE & K3" | "Central Service & Logistik" | "Sistem & Keamanan"
  purpose: string
  dataSources: {
    tablesRead: string[]
    tablesWritten?: string[]
    serverActions?: string[]
  }
  features: string[]
  workflowSummary: string
  rbacResource: string
}

export const HERO_PAGE_SPECIFICATIONS: PageSpecItem[] = [
  {
    id: "hc-employee",
    route: "/dashboard/hc/employee",
    title: "Master Data Karyawan (hero_employees SSoT)",
    category: "Human Capital & Kepegawaian",
    purpose: "Single Source of Truth seluruh data kepegawaian di perusahaan. Mengelola profil karyawan, nomor induk (NRP), penempatan site, departemen, seksi, jabatan, serta status keaktifan akun.",
    dataSources: {
      tablesRead: ["hero_employees", "hero_master_departments", "hero_master_sections", "hero_sites", "hero_master_positions", "user"],
      tablesWritten: ["hero_employees", "user"],
      serverActions: ["createEmployeeAction", "updateEmployeeAction", "importEmployeesAction", "toggleEmployeeStatusAction"],
    },
    features: [
      "TanStack Virtual Table dengan performa ribuan baris",
      "Filter multi-select Site dan Departemen",
      "Pencarian cepat NRP, Nama, dan Email",
      "Dialog Tambah & Edit Karyawan (Modal Responsive)",
      "Import data karyawan dari CSV dengan fitur field-mapping",
      "Ekspor data karyawan ke format Excel",
      "Aksi reset password dan nonaktifkan akun karyawan",
    ],
    workflowSummary: "HC Admin menambahkan/mengimpor karyawan baru -> Menghubungkan akun ke Better-Auth -> Menetapkan site dan departemen -> Karyawan dapat langsung login dan menggunakan sistem.",
    rbacResource: "hc_employees",
  },
  {
    id: "master-data",
    route: "/dashboard/master-data",
    title: "Master Organisasi & Site Penempatan",
    category: "Human Capital & Kepegawaian",
    purpose: "Pengelolaan struktur organisasi perusahaan: master cabang/site operasional tambang, master departemen, seksi kerja, dan daftar jabatan struktural.",
    dataSources: {
      tablesRead: ["hero_master_departments", "hero_master_sections", "hero_sites", "hero_master_positions"],
      tablesWritten: ["hero_master_departments", "hero_master_sections", "hero_sites", "hero_master_positions"],
    },
    features: [
      "Tab navigasi Departemen, Seksi, Site, dan Posisi",
      "Form tambah/edit entitas organisasi dalam modal dialog",
      "Validasi kode unik site dan departemen",
      "Ekspor daftar struktur organisasi ke Excel",
    ],
    workflowSummary: "Admin mengonfigurasi site tambang baru -> Menambahkan departemen dan seksi di bawah site tersebut -> Menjadi pilihan referensi saat input data karyawan.",
    rbacResource: "master_data",
  },
  {
    id: "hc-contract-review",
    route: "/dashboard/hc/contract-review",
    title: "Review Kontrak Karyawan",
    category: "Human Capital & Kepegawaian",
    purpose: "Monitoring masa berlaku kontrak kerja PKWT karyawan, evaluasi kinerja menjelang berakhirnya kontrak, dan penerbitan rekomendasi perpanjangan.",
    dataSources: {
      tablesRead: ["hero_employees", "hero_hr_contract_reviews"],
      tablesWritten: ["hero_hr_contract_reviews", "hero_employees"],
    },
    features: [
      "Filter otomatis jatuh tempo kontrak (30, 60, 90 hari ke depan)",
      "Badge indikator sisa masa kontrak (merah/kuning/hijau)",
      "Form evaluasi kinerja berkala",
      "Generate draft surat rekomendasi perpanjangan kontrak",
      "Ekspor laporan jatuh tempo ke Excel",
    ],
    workflowSummary: "HC memonitor kontrak yang akan habis -> Mengirim form evaluasi ke atasan -> Atasan memberi rekomendasi -> HC memproses perpanjangan kontrak.",
    rbacResource: "hc_contract_review",
  },
  {
    id: "activity-my-day",
    route: "/dashboard/activity-hub/my-day",
    title: "Aktivitas Harian Saya (My Day)",
    category: "Timesheet & Kehadiran",
    purpose: "Pencatatan laporan kerja harian mandiri oleh karyawan. Menghitung durasi sesi kerja, melampirkan dokumentasi foto bukti pekerjaan, dan mengajukan persetujuan ke atasan.",
    dataSources: {
      tablesRead: ["hero_daily_activities", "hero_daily_activity_sessions", "hero_approval_workflows"],
      tablesWritten: ["hero_daily_activities", "hero_daily_activity_sessions", "hero_approval_workflows", "notification_events"],
      serverActions: ["saveDailyActivityAction", "submitActivityForApprovalAction", "uploadFile"],
    },
    features: [
      "Input aktivitas harian berbasis kartu sesi",
      "Timer sesi kerja interaktif (Start, Pause, Selesai)",
      "Upload foto dokumentasi bukti pekerjaan lapangan via uploadFile",
      "Perhitungan otomatis total jam kerja efektif per hari",
      "Tombol Kirim Persetujuan (Submit to Approval Engine)",
      "Status badge (Draft, Submitted, Approved, Revision)",
    ],
    workflowSummary: "Karyawan memulai sesi kerja -> Mencatat uraian tugas dan mengunggah foto bukti -> Menyelesaikan hari kerja -> Mengirim laporan ke atasan untuk disetujui.",
    rbacResource: "daily_activity",
  },
  {
    id: "activity-team-board",
    route: "/dashboard/activity-hub/team-board",
    title: "Papan Pantau Aktivitas Tim (Team Board)",
    category: "Timesheet & Kehadiran",
    purpose: "Dashboard pengawasan bagi Section Head dan Department Head untuk memantau kehadiran, jam kerja efektif, dan kemajuan aktivitas seluruh anggota tim secara real-time.",
    dataSources: {
      tablesRead: ["hero_daily_activities", "hero_employees", "hero_master_departments"],
      tablesWritten: ["hero_daily_activities"],
    },
    features: [
      "Filter anggota tim per departemen, seksi, dan tanggal",
      "Visual timeline progres pengerjaan aktivitas harian",
      "Pengecekan status submission tim (siapa yang belum submit)",
      "Preview cepat isi laporan aktivitas tanpa meninggalkan halaman",
      "Ekspor rekap aktivitas tim ke Excel",
    ],
    workflowSummary: "Atasan membuka Team Board -> Memeriksa staf yang belum mengisi laporan -> Memberikan catatan langsung atau menyetujui pengajuan.",
    rbacResource: "team_board",
  },
  {
    id: "attendance-core",
    route: "/dashboard/attendance",
    title: "Presensi & Roster Kerja Karyawan",
    category: "Timesheet & Kehadiran",
    purpose: "Pencatatan presensi kehadiran datang dan pulang kerja karyawan yang terikat radius geofencing site operasional dan jadwal shift kerja.",
    dataSources: {
      tablesRead: ["attendance", "hero_employees", "hero_sites"],
      tablesWritten: ["attendance"],
      serverActions: ["clockInAction", "clockOutAction"],
    },
    features: [
      "Tombol Clock In & Clock Out dengan deteksi otomatis GPS",
      "Validasi geofencing radius toleransi site kerja",
      "Kalender shift dan roster kerja bulanan",
      "Rekapitulasi kehadiran (Hadir, Izin, Sakit, Alpa)",
      "Ekspor laporan presensi ke Excel & CSV",
    ],
    workflowSummary: "Karyawan membuka aplikasi di site -> Mengklik Clock In -> Sistem memvalidasi koordinat GPS -> Kehadiran tercatat resmi di database.",
    rbacResource: "attendance",
  },
  {
    id: "attendance-live-map",
    route: "/dashboard/attendance/live-map",
    title: "Peta Presensi GPS & Face Verification",
    category: "Timesheet & Kehadiran",
    purpose: "Monitoring visual sebaran lokasi absensi karyawan di lapangan yang divalidasi dengan pengenalan wajah biometrik (Face Recognition).",
    dataSources: {
      tablesRead: ["attendance", "hero_employees", "hero_sites"],
      tablesWritten: ["attendance"],
    },
    features: [
      "Peta sebaran koordinat presensi interaktif",
      "Face Verification menggunakan model face-api.js lokal",
      "Cluster pin marker per site tambang",
      "Log peringatan anomali koordinat di luar wilayah kerja",
    ],
    workflowSummary: "Karyawan mengambil foto selfie saat presensi -> Sistem mencocokkan wajah dengan foto master -> Memetakan titik koordinat pada peta live map.",
    rbacResource: "attendance_live_map",
  },
  {
    id: "overtime-requests",
    route: "/dashboard/overtime-requests",
    title: "Pengajuan & Rekap Lembur (Overtime)",
    category: "Timesheet & Kehadiran",
    purpose: "Pengelolaan otorisasi surat perintah lembur (SPL) karyawan, perhitungan otomatis jam dan nominal upah lembur, serta integrasi ke payroll.",
    dataSources: {
      tablesRead: ["hero_overtime_requests", "hero_employees", "hero_approval_workflows"],
      tablesWritten: ["hero_overtime_requests", "hero_approval_workflows", "notification_events"],
      serverActions: ["createOvertimeRequestAction", "submitOvertimeApprovalAction"],
    },
    features: [
      "Formulir pengajuan Surat Perintah Lembur (SPL)",
      "Kalkulator otomatis jam lembur berdasarkan regulasi Depnaker",
      "Multi-tier approval routing (Atasan Langsung -> Dept Head -> HC)",
      "Cetak formulir lembur resmi ke format PDF A4",
      "Ekspor rekapitulasi jam lembur ke Excel untuk payroll",
    ],
    workflowSummary: "Karyawan/Atasan mengajukan rencana lembur -> Disetujui atasan -> Karyawan menyelesaikan lembur -> Realisasi jam lembur divalidasi HC.",
    rbacResource: "overtime_requests",
  },
  {
    id: "approval-inbox",
    route: "/dashboard/approval",
    title: "Kotak Masuk Persetujuan Terpadu (Unified Approval Inbox)",
    category: "Approval Engine",
    purpose: "Pusat persetujuan satu pintu bagi atasan/approver untuk memeriksa, menyetujui, meminta revisi, atau menolak dokumen dari seluruh modul sistem HERO.",
    dataSources: {
      tablesRead: ["hero_approval_workflows", "hero_approval_steps", "hero_approval_logs", "hero_employees", "notification_events"],
      tablesWritten: ["hero_approval_workflows", "hero_approval_steps", "hero_approval_logs", "notification_events", "notification_deliveries"],
      serverActions: ["approveWorkflowStepAction", "rejectWorkflowStepAction", "requestRevisionAction"],
    },
    features: [
      "Filter dokumen berdasarkan tipe (Aktivitas Harian, Lembur, 5R, Form WO)",
      "Filter status persetujuan (Menunggu Tindakan, Disetujui, Ditolak)",
      "Aksi cepat Approve & Reject dengan dialog catatan alasan wajib",
      "Document Preview Modal ukuran lebar (sm:max-w-5xl) sebelum membuat keputusan",
      "Riwayat kronologi log persetujuan lengkap dengan timestamp",
      "Badge counter dokumen pending yang terhubung ke header notification bell",
    ],
    workflowSummary: "Dokumen masuk ke antrian approver -> Approver meninjau preview dokumen -> Klik Setujui/Tolak -> Sistem memicu notifikasi email dan bell ke pemohon.",
    rbacResource: "approval_inbox",
  },
  {
    id: "hse-five-r",
    route: "/dashboard/hse/five-r",
    title: "Audit & Penilaian 5R (Ringkas, Rapi, Resik, Rawat, Rajin)",
    category: "HSE & K3",
    purpose: "Audit kepatuhan budaya kerja 5R pada area workshop, gudang, dan kantor dengan penilaian scoring terstandar dan dokumentasi foto.",
    dataSources: {
      tablesRead: ["hero_five_r_assessments", "hero_five_r_findings", "hero_sites", "hero_approval_workflows"],
      tablesWritten: ["hero_five_r_assessments", "hero_five_r_findings", "hero_approval_workflows"],
      serverActions: ["createFiveRAssessmentAction", "uploadFile"],
    },
    features: [
      "Formulir audit scoring 5R berdasarkan checklist standar",
      "Kalkulasi indeks skor kepatuhan secara otomatis",
      "Upload foto kondisi area kerja yang diaudit",
      "Generate Laporan Audit 5R PDF A4 resmi siap cetak (WYSIWYG)",
      "Integrasi persetujuan hasil audit ke Kepala Area / HSE Officer",
    ],
    workflowSummary: "Auditor melakukan inspeksi -> Mengisi skor checklist 5R -> Mengunggah foto area -> Sistem menghitung nilai rata-rata -> Laporan PDF dicetak.",
    rbacResource: "five_r",
  },
  {
    id: "hse-evhs",
    route: "/dashboard/hse/evhs",
    title: "Laporan K3 & Insiden Bahaya (EVHS)",
    category: "HSE & K3",
    purpose: "Pelaporan cepat dan investigasi mendalam setiap bahaya keselamatan, kecelakaan kerja, atau insiden lingkungan di site operasional.",
    dataSources: {
      tablesRead: ["hero_evhs_reports", "hero_employees", "hero_sites"],
      tablesWritten: ["hero_evhs_reports", "notification_events"],
      serverActions: ["createEvhsReportAction", "uploadFile"],
    },
    features: [
      "Formulir pelaporan insiden, nearmiss, dan bahaya lingkungan",
      "Matriks penilaian risiko (Risk Matrix: Low, Medium, High, Critical)",
      "Form investigasi akar penyebab (5-Why Analysis)",
      "Notifikasi email darurat otomatis ke tim HSE Safety Officer",
      "Ekspor laporan insiden ke format Excel & PDF",
    ],
    workflowSummary: "Karyawan menemukan bahaya/insiden -> Submit laporan EVHS -> Notifikasi darurat terkirim ke HSE -> Tim HSE melakukan investigasi dan CAPA.",
    rbacResource: "evhs",
  },
  {
    id: "hse-tire-inspection",
    route: "/dashboard/hse/tire-inspection",
    title: "Inspeksi Ban di Site (Tire Site Inspection)",
    category: "HSE & K3",
    purpose: "Pemeriksaan teknis ban kendaraan tambang/alat berat di lapangan untuk memperpanjang usia pakai dan mencegah insiden pecah ban di jalur operasional.",
    dataSources: {
      tablesRead: ["hero_tire_inspections", "hero_fleet", "hero_customers"],
      tablesWritten: ["hero_tire_inspections"],
      serverActions: ["saveTireInspectionAction", "uploadFile"],
    },
    features: [
      "Pencatatan tekanan angin (PSI) dan suhu ban",
      "Pengukuran kedalaman sisa alur ban (Tread Depth R1-R4)",
      "Inspeksi visual dinding dan telapak ban dengan foto kamera",
      "Rekomendasi teknis otomatis (Rotasi, Perbaikan, Scrap)",
      "Riwayat keausan ban historis per unit kendaraan",
    ],
    workflowSummary: "Tire Inspector memeriksa ban di pit tambang -> Menginput data tekanan & alur ban -> Sistem memberikan analisis rekomendasi perawatan.",
    rbacResource: "hse_tire_inspection",
  },
  {
    id: "central-service-wo",
    route: "/dashboard/central-service/service-form",
    title: "Form WO-24 Perbaikan Ban (Work Order)",
    category: "Central Service & Logistik",
    purpose: "Pencatatan surat perintah kerja operasional perbaikan dan vulkanisir ban di workshop Central Service dari penerimaan hingga selesai QC.",
    dataSources: {
      tablesRead: ["hero_form_wo", "hero_fleet", "hero_customers", "hero_approval_workflows"],
      tablesWritten: ["hero_form_wo", "hero_approval_workflows"],
      serverActions: ["createFormWoAction", "updateFormWoAction", "uploadFile"],
    },
    features: [
      "Formulir Surat Perintah Kerja WO-24 terstandarisasi",
      "Pencatatan nomor seri ban (Tire Serial Number)",
      "Rincian kerusakan ban, material tambal, dan teknisi pelaksana",
      "Tanda tangan digital teknisi dan QC inspector",
      "Generate Form WO-24 PDF A4 resmi berstandar cetak WYSIWYG",
    ],
    workflowSummary: "Ban tiba di workshop -> WO-24 dibuat -> Teknisi melakukan reparasi -> QC memeriksa hasil perbaikan -> Form WO-24 ditandatangani dan dicetak.",
    rbacResource: "central_service_wo",
  },
  {
    id: "deliveries",
    route: "/dashboard/deliveries",
    title: "Pelacakan Pengiriman & Manifest Kargo",
    category: "Central Service & Logistik",
    purpose: "Monitoring logistik pengiriman ban hasil servis atau barang baru dari workshop ke site pelanggan lengkap dengan bukti serah terima (POD).",
    dataSources: {
      tablesRead: ["hero_deliveries", "hero_fleet", "hero_customers"],
      tablesWritten: ["hero_deliveries"],
      serverActions: ["createDeliveryAction", "confirmDeliveryPodAction", "uploadFile"],
    },
    features: [
      "Pembuatan surat jalan pengiriman barang resmi",
      "Penugasan kendaraan armada dan driver pengirim",
      "Upload foto bukti serah terima (Proof of Delivery - POD)",
      "Status pelacakan barang (Terkirim, Dalam Perjalanan, Selesai)",
      "Cetak Surat Jalan & Cargo Manifest PDF A4",
    ],
    workflowSummary: "Barang dimuat ke truk -> Surat jalan dicetak -> Driver mengantar ke site -> Pelanggan menandatangani POD -> Foto POD diunggah ke sistem.",
    rbacResource: "deliveries",
  },
  {
    id: "security-rbac",
    route: "/dashboard/security",
    title: "Manajemen Role, RBAC & Audit Trail",
    category: "Sistem & Keamanan",
    purpose: "Pusat tata kelola keamanan dan hak akses sistem: mengatur matriks izin menu (resource:action), peran pengguna, data scope, dan audit log.",
    dataSources: {
      tablesRead: ["hero_security_roles", "hero_role_menu_permissions", "hero_navbar_menu_items", "audit_logs"],
      tablesWritten: ["hero_security_roles", "hero_role_menu_permissions"],
      serverActions: ["updateRolePermissionsAction", "syncPermissionsAction"],
    },
    features: [
      "Matriks hak akses resource:action (view, create, edit, delete)",
      "Konfigurasi data scope per role (own, site, global)",
      "Penugasan role keamanan ke karyawan",
      "Tombol Sync Permissions otomatis dari konfigurasi navigasi",
      "Viewer rekaman Audit Trail Log aktivitas pengguna",
    ],
    workflowSummary: "Admin membuat role baru -> Mengatur checklist izin fitur -> Menugaskan role ke karyawan -> Izin langsung berlaku di antarmuka dan backend.",
    rbacResource: "security_roles",
  },
  {
    id: "settings-email",
    route: "/dashboard/settings/email",
    title: "Pengaturan Email & Template Terpusat",
    category: "Sistem & Keamanan",
    purpose: "Pengelolaan terpusat server SMTP pengiriman surat elektronik, kustomisasi template email dinamis, dan pemantauan riwayat pengiriman.",
    dataSources: {
      tablesRead: ["hero_email_settings", "hero_email_templates", "notification_deliveries"],
      tablesWritten: ["hero_email_settings", "hero_email_templates"],
      serverActions: ["saveEmailSettingsAction", "updateEmailTemplateAction", "sendTestEmailAction"],
    },
    features: [
      "Form konfigurasi server SMTP (Host, Port, User, Password, TLS)",
      "Editor template email dinamis per templateCode dengan variabel placeholder",
      "Live preview template email dengan data contoh realistis",
      "Tombol Kirim Email Uji Coba (Test Email Connection)",
      "Tabel log pemantauan status pengiriman email (Terkirim / Gagal)",
    ],
    workflowSummary: "Admin memasukkan kredensial SMTP -> Memilih template email yang ingin diubah -> Menguji coba pengiriman -> Sistem menggunakan template baru.",
    rbacResource: "settings_email",
  },
  {
    id: "hero-genius",
    route: "/dashboard/hero-genius",
    title: "Hero Genius AI Assistant",
    category: "Sistem & Keamanan",
    purpose: "Asisten kecerdasan buatan terintegrasi untuk membantu karyawan mencari prosedur standar (SOP), pedoman kerja (WIN), dan analisis dokumen operasional.",
    dataSources: {
      tablesRead: ["hero_genius_sessions", "hero_genius_messages", "hero_genius_documents"],
      tablesWritten: ["hero_genius_sessions", "hero_genius_messages"],
      serverActions: ["askGeniusAiAction", "uploadDocForGeniusAction"],
    },
    features: [
      "Antarmuka chat AI interaktif dengan riwayat percakapan",
      "Pencarian cerdas berbasis basis pengetahuan SOP & WIN perusahaan",
      "Generator alur approval SOP/WIN otomatis",
      "Viewer dokumen pendukung (Markdown & PDF Viewer)",
    ],
    workflowSummary: "Karyawan bertanya prosedur kerja -> Hero Genius mencari dokumen relevan -> Memberikan jawaban langkah-langkah praktis sesuai SOP resmi.",
    rbacResource: "hero-genius",
  },
  {
    id: "system-documentation",
    route: "/dashboard/documentation",
    title: "Portal Dokumentasi & Cetak Biru Handover",
    category: "Sistem & Keamanan",
    purpose: "Pusat dokumentasi resmi dan panduan serah terima (handover) komprehensif bagi pengembang baru agar memahami seluruh sistem HERO secara mendalam.",
    dataSources: {
      tablesRead: ["hero_employees", "hero_security_roles"],
    },
    features: [
      "Panduan Serah Terima & Onboarding Developer lengkap",
      "Cetak Biru Arsitektur Sistem (Next.js 15, Drizzle, Dokploy)",
      "Panduan Keamanan & Tata Kelola RBAC",
      "Diagram Relasi Entitas (ERD) & Kamus Data Kolom Kritis",
      "Alur Kerja Operasional & Multi-Channel Notification Engine",
      "Panduan Deployment Dokploy, Backup DB & Troubleshooting",
      "Katalog Spesifikasi Teknis Setiap Halaman (Page-by-Page Specs)",
      "Ekspor Dokumen Blueprint PDF A4 Resmi (WYSIWYG Standar Korporat)",
    ],
    workflowSummary: "Developer baru membuka halaman ini -> Mempelajari arsitektur dan alur sistem -> Mengunduh Blueprint PDF lengkap untuk arsip serah terima.",
    rbacResource: "system_documentation",
  },
]

