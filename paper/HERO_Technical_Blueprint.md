PT CHITRA PARATAMA
HERO (HUMAN CAPITAL, EMPLOYEE REPORTING & OPERATIONAL HUB)
Business Blueprint Design & Technical Handover Guide

---

## DOCUMENT CONTROL

| Attribute | Detail |
| :--- | :--- |
| **Author** | Mochamad Annas Khadafi |
| **File Name** | HERO_Enterprise_System_Blueprint |
| **Created Date** | November 2026 |
| **Status / Version** | Version 2.0 (Enterprise Production Edition) |
| **Departement** | Human Capital, HSE & IT Engineering / One Chitra |

## Document Approval / Review

| Role / Title | Name | Date | Sign-Off |
| :--- | :--- | :--- | :--- |
| **Prepared by (Lead Engineer)** | Mochamad Annas Khadafi | November 2026 | Approved |
| **Reviewed by (Solution Architect)** | Arif Maulana Ghafar | November 2026 | Approved |
| **Approved by (Head of Tech / Sponsor)** | Febrian Dani | November 2026 | Approved |

---

## TABLE OF CONTENT

1. **General Information (Background, Objective, Tech Stack)**
   - 1.1 Background (Latar Belakang & Konteks Operasional)
   - 1.2 Objective (Tujuan Strategis & Sasaran Sistem)
   - 1.3 Core Tech Stack Foundation
2. **Business Requirement (HC, HSE, Operations, Attendance & MAESTRO Scope)**
3. **Project Scope & Architecture (10 Domain Modul Utama)**
4. **Solution Design & Data Architecture**
   - 4.1 Master Data / Configuration Data
   - 4.2 Transactional Data
   - 4.3 ERD & Kamus Basis Data (Tabel-tabel SSoT & Operasional)
5. **System Processes & Workflows**
   - 5.1 HC: Alur Siklus Karyawan & Review Kontrak PKWT
   - 5.2 HSE: Alur Pelaporan Bahaya & Investigasi EVHS
   - 5.3 Central Service: Alur Servis WO-24 & Reparasi Ban Tambang
   - 5.4 Kehadiran: Alur Presensi Geofencing & Biometrik Wajah
   - 5.5 Universal Multi-Tier Approval Engine
6. **Integration System**
   - 6.1 S3 Private Storage & Reverse Proxy Serving (`/api/uploads/[...path]`)
   - 6.2 Face-API Biometrics & TensorFlow.js Runtime
   - 6.3 SAP Assets & ERP Integration Bridge
   - 6.4 Email SMTP & Notification Delivery
7. **Business Users and Security**
   - 7.1 Role-Based Access Control (RBAC) Matrix & Data Scoping
   - 7.2 Session Management & Data Protection
   - 7.3 Aturan Baku Pengunggahan Berkas (Centralized Upload Rule)
   - 7.4 Kepatuhan UU PDP Biometrik Wajah (4 Pilar Non-Destruktif)
8. **Planning Development, DevOps & Error Handling Runbook**
   - 8.1 Platform Deployment Dokploy (Docker Standalone & Persistent Bind Mount)
   - 8.2 Kamus Variabel Lingkungan (.env)
   - 8.3 Perintah CLI Database & Pemeliharaan
   - 8.4 Standalone Comprehensive Error Handling & Troubleshooting Runbook
9. **Complete Module & Page Directory (Detailed Specifications)**
10. **Developer Handover Checklist & Sign-Off**

---

## 1. General Information

HERO (*Human Capital, Employee Reporting & Operational Hub*) adalah platform Enterprise terintegrasi dan Operational Hub komprehensif milik **PT Chitra Paratama** yang mengintegrasikan pengelolaan siklus hidup kepegawaian (Human Capital), kedisiplinan dan kepatuhan keselamatan tambang (HSE/EVHS), manajemen operasional workshop perbaikan ban alat berat (Central Service & WO-24), pemantauan logistik armada dan pengiriman (Deliveries & Cargo Manifest), akuntabilitas jam kerja harian (My Day & Team Board), presensi GPS dan biometrik wajah anti titip-absen, mesin persetujuan bertingkat terpadu (Universal Multi-Tier Approval Matrix), hingga portal layanan mandiri bagi pelanggan korporat tambang (*MAESTRO Customer Portal*).

### 1.1. Background (Latar Belakang & Konteks Operasional)
PT Chitra Paratama sebagai salah satu penyedia solusi ban alat berat, jasa rekondisi (retread/vulkanisir), dan manajemen keselamatan operasional tambang terkemuka di Indonesia memiliki operasional yang tersebar luas di berbagai remote mining sites (seperti Sangatta, Satui, Balikpapan, Lahat, dan site lainnya). Karakteristik lingkungan kerja tambang yang berisiko tinggi dan terpencil menghadirkan berbagai tantangan operasional nyata:
* **Fragmentasi Data Kepegawaian**: Karyawan tersebar di puluhan site penempatan tanpa satu sistem basis data terpusat, menyebabkan kesulitan rekonsiliasi status kontrak PKWT, penempatan, dan relasi atasan.
* **Risiko Pelanggaran Kontrak PKWT**: Monitoring jatuh tempo kontrak kerja karyawan yang sebelumnya bersifat semi-manual rentan menimbulkan keterlambatan evaluasi (melewati 30-60 hari jatuh tempo), berisiko menimbulkan sengketa ketenagakerjaan dan denda regulasi.
* **Kehadiran Lapangan & Anti Titip-Absen**: Diperlukan mekanisme pencatatan kehadiran yang tidak bisa dimanipulasi dengan memvalidasi radius fisik koordinat GPS resmi site dan verifikasi wajah secara lokal di browser klien yang patuh terhadap Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022).
* **Ketertelusuran Servis Ban Alat Berat (WO-24)**: Proses servis ban vulkanisir bernilai ratusan juta rupiah memerlukan pencatatan riwayat serial number fisik ban, alokasi teknisi, otorisasi tanda tangan digital Quality Control (QC), serta penerbitan Surat Jalan (Delivery Order) resmi yang dapat diaudit secara real-time.
* **Budaya K3 & Mitigasi Zero-Accident**: Pelaporan kondisi bahaya (KTA) dan tindakan tidak aman (TTA) di lapangan harus dapat dilakukan secara instan dari smartphone dengan bukti foto dan analisis akar masalah 5-Why terpadu.

HERO dibangun untuk mengintegrasikan seluruh proses bisnis kritis tersebut ke dalam satu ekosistem web modern yang tangguh, cepat, dan aman.

### 1.2. Objective (Tujuan Strategis & Sasaran Sistem)
Pembangunan dan penerapan HERO menetapkan 6 sasaran strategis perusahaan:
1. **Mewujudkan Single Source of Truth (SSoT)**: Menjadikan tabel `hero_employees` sebagai satu-satunya rujukan data kepegawaian yang terhubung langsung ke otentikasi login, departemen, seksi kerja, dan hak akses.
2. **Menjamin Kepatuhan Regulasi Ketenagakerjaan**: Mengotomatisasi sistem peringatan dini (early warning) evaluasi kontrak PKWT jatuh tempo 30, 60, dan 90 hari sebelum masa berlaku berakhir.
3. **Meningkatkan Disiplin & Akuntabilitas Jam Kerja**: Memastikan kehadiran karyawan 100% tervalidasi radius geofence GPS dan face biometrics, serta laporan jam produktif mandiri (My Day).
4. **Meningkatkan Keandalan & Standarisasi Servis Ban**: Mempercepat siklus penerbitan WO-24, pemantauan status perbaikan di workshop, dan penerbitan Surat Jalan DO standar A4 ber-QR Code.
5. **Mempercepat Pengambilan Keputusan (SLA Approval)**: Menyediakan Inbox Persetujuan Terpadu satu atap lintas hierarki jabatan (Section Head -> Dept Head -> Division Head/Direksi).
6. **Menyediakan Layanan Mandiri B2B (MAESTRO)**: Membuka transparansi progres servis ban dan inventaris scrap tire kepada pelanggan tambang eksternal secara terkontrol.

### 1.3. Core Tech Stack Foundation

| Category Layer | Technology & Version | Role & Responsibility |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router, Turbopack, React 19) | Server Components, Client Components, Server Actions, Dynamic Layouts & Streaming UI |
| **Language & Runtime** | TypeScript 5.x & Node.js 22 LTS | Static type safety, modern async runtime, ESM modules, zero compilation drift |
| **Styling & UI Components** | Tailwind CSS v4, Radix UI Primitives, Lucide Icons, `@/components/templates` | Design system responsif seragam, aksesibilitas WAI-ARIA, tinggi tombol baku h-9 (36px) |
| **Database & ORM** | PostgreSQL 16+ & Drizzle ORM (`drizzle-orm`, `drizzle-kit`) | Relational database dengan schema-as-code, typed parameterized queries, migration engine |
| **State & Data Fetching** | TanStack React Query v5 & TanStack Virtual v3 | Client-side caching, optimistic updates, virtualized table rendering untuk ribuan baris data |
| **Authentication & Authorization** | Better Auth & Role-Based Access Control (RBAC) | Session cookies (HttpOnly, Secure), dynamic resource permissions (`resource:action`), site scoping |
| **Object Storage & File Upload** | IS3 CloudHost (S3 Private API) & Dokploy Persistent Mount | Sentralisasi berkas aman via proxy `/api/uploads/[...path]` dan resolver `resolveUploadUrl()` |
| **Biometrics & AI Engine** | `@vladmandic/face-api` (TensorFlow.js WebAssembly) | Deteksi wajah klien, ekstraksi 128-vektor deskriptor terenkripsi, UU PDP compliant |
| **DevOps & Deployment** | Docker Standalone, Dokploy Engine, Multi-Stage Build | Containerized deployment dengan bind mount `/mnt/data/one-chitra/uploads` dan zero data loss |

---

## 2. Business Requirement

Sistem HERO dirancang untuk menyelesaikan tantangan operasional kepegawaian, keselamatan, dan servis teknis di seluruh cabang dan site operasional tambang PT Chitra Paratama:
* **Single Source of Truth Kepegawaian**: Menstandarisasi master data karyawan ke dalam satu tabel terpusat (`hero_employees`), mengeliminasi fragmentasi data antar-cabang, dan menghubungkan identitas karyawan ke akun login, departemen, seksi kerja, dan hak akses.
* **Kepatuhan K3 & Mitigasi Risiko Tambang**: Pelaporan cepat temuan kondisi bahaya (KTA/TTA) di pit tambang melalui modul EVHS, matriks risiko standar, audit 5R berkala, dan inspeksi ban unit hauling secara presisi.
* **Akuntabilitas Jam Kerja & Presensi Biometrik**: Memastikan pencatatan kehadiran karyawan akurat berbasis GPS Geofencing radius site resmi dan verifikasi biometrik pengenalan wajah anti titip-absen, didukung pelaporan aktivitas mandiri (My Day).
* **Transparansi Perbaikan Ban (WO-24)**: Digitalisasi surat perintah kerja perbaikan ban alat berat di workshop Central Service dari penerimaan awal, penugasan teknisi, inspeksi QC, hingga penerbitan Surat Jalan pengiriman.
* **Engine Persetujuan Terpadu Multi-Tier**: Otomatisasi persetujuan dokumen transaksi perusahaan (lembur, izin kerja, evaluasi kontrak, perbaikan ban) dengan alur hierarki atasan dinamis.
* **Layanan Pelanggan Eksternal (MAESTRO)**: Memberikan akses transparan bagi pelanggan tambang untuk memantau status ban servis dan histori inspeksi tanpa membuka data internal perusahaan.

---

## 3. Project Scope & Architecture

Ruang lingkup sistem HERO mencakup 10 domain modul utama:
1. **Human Capital (HC) & Organization**: Master Karyawan SSoT, Review Kontrak PKWT (30/60/90 hari), Onboarding/Offboarding, Struktur Organisasi, E-Filing, dan MCU Wellness.
2. **Health, Safety & Environment (HSE / EVHS)**: Laporan Bahaya & Insiden EVHS, Investigasi 5-Why, Matriks Risiko, Inspeksi Ban Tambang (PSI/Tread Depth), Audit 5R/5S, Izin Kerja Berbahaya (PTW), dan JSA.
3. **Central Service & Workshop Operations**: Surat Perintah Kerja WO-24, Inspeksi Penerimaan Ban, Master Barang Repair, Kanban WIP Repair, Pattern Designer, dan Manajemen Suku Cadang Gudang Repair.
4. **Attendance, Geofencing & Biometrics**: Presensi Datang/Pulang via GPS Haversine, Face Verification Biometrik (UU PDP Compliant), Kalender Shift/Roster, Rekap Kehadiran, dan Live Map Monitor.
5. **Activity Hub (Employee Productivity)**: Laporan Aktivitas Harian (My Day), Papan Supervisi Tim (Team Board), Sesi Kerja Lapangan, dan Approval Jam Produktif.
6. **Logistics, Deliveries & Fleet**: Surat Jalan Resmi (DO) standar A4, Pelacakan Pengiriman Kargo Ban, Manifest Muatan, dan Penugasan Pengemudi/Armada.
7. **Universal Approval Engine**: Inbox Persetujuan Terpadu (`/dashboard/approval`), Dynamic Multi-Tier Approver Resolution, Dokumen Pratinjau Modal (max-w-5xl), dan Audit Trail Approval.
8. **ChitraLearning LMS**: Pelatihan Daring Korporat, Manajemen Kursus & Modul, Ujian Sertifikasi Kontrak, Quiz Builder, dan Leaderboard Prestasi.
9. **MAESTRO B2B Customer Portal**: Portal Layanan Pelanggan Tambang (`maestro.chitraparatama.com`), Pelacakan Tiket Servis Ban, Pemantauan Scrap Tire, dan Read-Only Scoped Data Access.
10. **System, Security & DevOps**: Manajemen Role & Permission RBAC (`resource:action`), S3 Proxy Serving, Persistent Dokploy Mounts, Audit Logging, dan Troubleshooting Runbook.

---

## 4. Solution Design & Data Architecture

### 4.1. Master Data / Configuration Data
Data konfigurasi dasar yang menjadi acuan seluruh transaksi di HERO:
* **Employees Master (SSoT)**: NRP/SN karyawan, nama lengkap, penempatan site tambang, departemen, seksi kerja, jabatan resmi, status kepegawaian (Permanent, PKWT, Prob), tanggal masa berlaku kontrak, dan relasi atasan langsung (`reports_to_employee_id`).
* **Organization & Sites**: Master cabang site tambang (Balikpapan, Sangatta, Satui, Lahat, dll), koordinat latitude/longitude gerbang site, radius toleransi GPS meter, master departemen, dan master seksi kerja.
* **HSE & Safety Standards**: Master parameter bahaya EVHS, matriks konsekuensi & probabilitas risiko K3, checklist standar 5R, dan master katalog Alat Pelindung Diri (APD).
* **Workshop Master**: Katalog pola kembangan ban (pattern), spesifikasi ukuran ban tambang, master part repair, dan kriteria inspeksi QC.
* **Security & Roles**: Master peran (`Super Admin`, `Site Manager`, `Section Head`, `Technician`, dll), master daftar menu, dan matriks perizinan berbutir halus.

### 4.2. Transactional Data
Data transaksi dinamis yang dihasilkan dari aktivitas operasional harian:
* **Attendance & Biometric Records**: Waktu log clock-in/out, koordinat GPS aktual, jarak Haversine ke titik site, status verifikasi biometrik wajah, kemiripan deskriptor, dan foto verifikasi.
* **Activity Hub Records**: Sesi kerja karyawan, log timeline aktivitas per jam, durasi efektif, foto bukti dokumentasi pekerjaan lapangan, dan status approval atasan.
* **EVHS Reports & Investigations**: Tiket laporan bahaya, foto KTA/TTA, skor tingkat keparahan risiko, tindakan perbaikan langsung, serta hasil analisis akar masalah 5-Why.
* **Central Service WO-24**: Nomor urut WO-24, nomor seri fisik ban, riwayat penanganan vulkanisir, tanda tangan digital teknisi & QC, serta status kelolosan inspeksi.
* **Approval Transactions**: Instance permohonan persetujuan dokumen, riwayat keputusan approver per hierarki tingkatan, stempel waktu, dan catatan alasan persetujuan/penolakan.

### 4.3. ERD & Kamus Basis Data Utama

#### 1. Kepegawaian & Single Source of Truth (SSoT)
Tabel-tabel yang mengelola identitas seluruh karyawan, relasi organisasi, penempatan, dan akun login.
| Table Name | Primary Key | Description | Key Relations |
| :--- | :--- | :--- | :--- |
| `hero_employees` | id (uuid) | **Single Source of Truth** seluruh data kepegawaian perusahaan: NRP/SN, nama, site penempatan, departemen, seksi, jabatan, dan masa kontrak. | Many-to-One -> `hero_sites`; Many-to-One -> `hero_master_departments`; Many-to-One -> `hero_master_sections`; One-to-One -> `user` |
| `hero_sites` | id (uuid) | Master kantor cabang dan site tambang operasional lengkap dengan koordinat geofencing. | One-to-Many -> `hero_employees`; One-to-Many -> `attendance` |
| `hero_master_departments` | id (uuid) | Master departemen korporat (HC, HSE, Operations, Finance, IT). | One-to-Many -> `hero_employees`; One-to-Many -> `hero_master_sections` |
| `hero_master_sections` | id (uuid) | Master seksi kerja fungsional di bawah departemen. | Many-to-One -> `hero_master_departments`; One-to-Many -> `hero_employees` |
| `hero_master_positions` | id (uuid) | Katalog jabatan struktural dan fungsional di PT Chitra Paratama. | One-to-Many -> `hero_employees` |
| `hero_hr_contract_reviews`| id (uuid) | Rekaman peninjauan masa berlaku kontrak PKWT, evaluasi kinerja, dan surat rekomendasi. | Many-to-One -> `hero_employees` |

#### 2. Keamanan, Autentikasi & RBAC
Tabel yang mengatur otentikasi sesi, peran pengguna, dan jejak audit sistem.
| Table Name | Primary Key | Description | Key Relations |
| :--- | :--- | :--- | :--- |
| `user` | id (text/uuid) | Data akun pengguna login Better Auth, email, kredensial password terenkripsi, status aktif. | One-to-One -> `hero_employees`; One-to-Many -> `session` |
| `session` | id (text/uuid) | Sesi cookie aktif pengguna, token otentikasi, IP address, user agent, dan waktu kedaluwarsa. | Many-to-One -> `user` |
| `hero_security_roles` | id (uuid) | Daftar master peran dalam sistem (Super Admin, Dept Head, Section Head, Staff). | One-to-Many -> `hero_role_menu_permissions` |
| `hero_role_menu_permissions` | id (uuid) | Matriks hak akses berbutir halus format `resource:action` (view, create, edit, delete). | Many-to-One -> `hero_security_roles` |
| `audit_logs` | id (uuid) | Jejak audit permanen yang mencatat mutasi data, alamat IP, nilai sebelum vs sesudah. | Many-to-One -> `user` |

#### 3. Presensi, Biometrik & Produktivitas
Tabel pencatatan kehadiran tervalidasi lokasi, deskriptor wajah, dan aktivitas kerja.
| Table Name | Primary Key | Description | Key Relations |
| :--- | :--- | :--- | :--- |
| `attendance` | id (uuid) | Transaksi presensi clock-in/out, koordinat GPS, jarak radius, dan status verifikasi biometrik. | Many-to-One -> `hero_employees`; Many-to-One -> `hero_sites` |
| `hero_biometric_descriptors` | id (uuid) | Vektor deskriptor wajah 128 dimensi terenkripsi untuk pencocokan wajah anti-spoofing (UU PDP). | Many-to-One -> `hero_employees` |
| `hero_daily_activities` | id (uuid) | Laporan aktivitas harian mandiri (My Day), deskripsi pekerjaan, durasi jam kerja, foto bukti. | Many-to-One -> `hero_employees`; Many-to-One -> `hero_approval_workflows` |
| `hero_overtime_requests` | id (uuid) | Pengajuan surat perintah lembur (SPL), kalkulator jam lembur, dan alur approval atasan. | Many-to-One -> `hero_employees` |

#### 4. HSE, Keselamatan Kerja & Inspeksi Pit
Tabel operasional keselamatan kerja dan inspeksi fisik ban tambang.
| Table Name | Primary Key | Description | Key Relations |
| :--- | :--- | :--- | :--- |
| `hero_evhs_reports` | id (uuid) | Laporan insiden bahaya KTA/TTA, klasifikasi risiko, foto bukti lapangan, status perbaikan. | Many-to-One -> `hero_employees`; Many-to-One -> `hero_sites` |
| `hero_five_r_assessments`| id (uuid) | Lembar audit kepatuhan 5R/5S area workshop dan kantor dengan penilaian scoring otomatis. | Many-to-One -> `hero_sites`; Many-to-One -> `hero_employees` |
| `hero_tire_inspections` | id (uuid) | Pemeriksaan teknis ban unit hauling: tekanan PSI, temperatur, ketebalan tapak R1-R4, rekomendasi. | Many-to-One -> `hero_fleet`; Many-to-One -> `hero_customers` |

#### 5. Central Service, Workshop Repair & Logistik
Tabel pengelolaan surat perintah kerja servis ban, alokasi armada, dan pengiriman.
| Table Name | Primary Key | Description | Key Relations |
| :--- | :--- | :--- | :--- |
| `hero_form_wo` | id (uuid) | Surat Perintah Kerja WO-24 perbaikan ban vulkanisir, data serial number, alokasi teknisi, QC. | Many-to-One -> `hero_customers`; Many-to-One -> `hero_approval_workflows` |
| `hero_deliveries` | id (uuid) | Dokumen Surat Jalan (DO) pengiriman kargo ban servis atau ban baru standar A4. | Many-to-One -> `hero_form_wo`; Many-to-One -> `hero_fleet` |
| `hero_fleet` | id (uuid) | Master kendaraan operasional dan truk logistik pengangkut ban. | One-to-Many -> `hero_deliveries` |

#### 6. Universal Multi-Tier Approval Engine
Tabel yang mengatur konfigurasi dan instansiasi persetujuan dokumen terpadu.
| Table Name | Primary Key | Description | Key Relations |
| :--- | :--- | :--- | :--- |
| `hero_approval_workflows`| id (uuid) | Definisi alur persetujuan dokumen, batas nilai wewenang, dan urutan hierarki approver. | One-to-Many -> `hero_approval_steps` |
| `hero_approval_steps` | id (uuid) | Tahapan hierarki spesifik per dokumen (Tier 1 Section Head, Tier 2 Dept Head, dst). | Many-to-One -> `hero_approval_workflows` |
| `hero_approval_logs` | id (uuid) | Jejak riwayat keputusan persetujuan, stempel waktu, status keputusan, dan catatan alasan. | Many-to-One -> `hero_employees` |

---

## 5. System Processes & Workflows

### HC: Alur Siklus Karyawan & Review Kontrak PKWT
Proses otomatisasi pemantauan masa berlaku kontrak kerja PKWT karyawan guna mencegah pelanggaran regulasi ketenagakerjaan.
| Step | Actor | Action Description | Expected Output |
| :--- | :--- | :--- | :--- |
| **Step 1** | Background Job / System | Memindai kolom `contract_duration_end` pada `hero_employees` setiap hari dan mendeteksi kontrak yang jatuh tempo dalam 30, 60, dan 90 hari. | Notifikasi peringatan dini & badge status pada menu Review Kontrak |
| **Step 2** | Section Head / Atasan | Mengisi formulir evaluasi kinerja kompetensi dan kedisiplinan karyawan di menu Review Kontrak Form. | Rekomendasi perpanjangan kontrak atau selesai hubungan kerja |
| **Step 3** | Dept Head / HC Manager | Meninjau hasil evaluasi dan rekomendasi via Approval Inbox untuk menyetujui usulan perpanjangan. | Dokumen review berstatus 'APPROVED' |
| **Step 4** | HC Officer | Menerbitkan Surat Perjanjian Kerja Waktu Tertentu (PKWT) perpanjangan baru atau surat penyelesaian masa kontrak resmi. | Draf surat perpanjangan tercetak standar A4 dan update masa berlaku di SSoT |

### HSE: Alur Pelaporan Bahaya & Investigasi EVHS
Siklus penanganan temuan bahaya keselamatan di lapangan dari pelaporan awal hingga tindakan pencegahan permanen.
| Step | Actor | Action Description | Expected Output |
| :--- | :--- | :--- | :--- |
| **Step 1** | Karyawan / Pengawas Lapangan | Menemukan Kondisi Tidak Aman (KTA) atau Tindakan Tidak Aman (TTA), mengambil foto via kamera mobile, dan mengisi formulir EVHS. | Tiket laporan bahaya baru berstatus 'SUBMITTED' |
| **Step 2** | Safety Officer (HSE) | Memvalidasi laporan, menentukan klasifikasi risiko menggunakan Risk Matrix, dan menugaskan penanggung jawab tindakan perbaikan (PIC). | Penetapan PIC dan target waktu perbaikan (SLA) |
| **Step 3** | Penanggung Jawab (PIC) | Melakukan tindakan perbaikan fisik di lapangan dan mengunggah foto bukti perbaikan ke sistem. | Status laporan berubah menjadi 'RESOLVED' |
| **Step 4** | HSE Supervisor / Lead | Memverifikasi hasil perbaikan di lapangan dan melakukan analisis akar masalah 5-Why jika insiden berulang. | Tiket berstatus 'CLOSED' dan tercatat di statistik safety site |

### Central Service: Alur Servis WO-24 & Reparasi Ban Tambang
Siklus penerimaan ban alat berat di workshop Central Service hingga selesai rekondisi dan dikirim kembali ke site pelanggan.
| Step | Actor | Action Description | Expected Output |
| :--- | :--- | :--- | :--- |
| **Step 1** | Receiver Workshop | Menerima fisik ban dari site pelanggan, mencatat nomor seri ban, dan melakukan inspeksi kerusakan awal. | Lembar Inspeksi Penerimaan Ban & Draf Form WO-24 |
| **Step 2** | Workshop Supervisor | Menentukan metode rekondisi (vulkanisir dingin/panas), mengalokasikan teknisi perbaikan, dan menetapkan estimasi durasi kerja. | Surat Perintah Kerja WO-24 resmi berstatus 'IN_PROGRESS' |
| **Step 3** | Teknisi Rekondisi | Melaksanakan perbaikan fisik ban (buffing, skiving, cementing, curing) dan mengupdate progres di Kanban WIP Repair. | Ban selesai dikerjakan siap masuk ruang QC |
| **Step 4** | Quality Control (QC) | Memeriksa ketebalan tapak, shearography, dan membubuhkan tanda tangan digital QC pada form WO-24. | Status WO-24 'QC_PASSED', sertifikat garansi terbit |
| **Step 5** | Logistics Dispatcher | Menerbitkan Surat Jalan (DO) resmi dan mengirimkan ban kembali ke site tambang pelanggan. | Status 'DELIVERED', arsip tersimpan di histori nomor seri ban |

### Kehadiran: Alur Presensi Geofencing & Biometrik Wajah
Validasi kehadiran datang dan pulang kerja karyawan secara presisi menggunakan sensor GPS dan pengenalan wajah.
| Step | Actor | Action Description | Expected Output |
| :--- | :--- | :--- | :--- |
| **Step 1** | Karyawan di Lapangan | Membuka menu Attendance di smartphone dan menyetujui aktivasi GPS dan kamera biometrik. | Posisi koordinat latitude/longitude dan feed kamera aktif |
| **Step 2** | Sistem (Haversine Engine) | Menghitung jarak horizontal antara posisi perangkat karyawan dengan titik pusat master site resmi (`hero_sites`). | Validasi radius (Lolos jika jarak <= radius site) |
| **Step 3** | Face-API AI Runtime | Mengekstrak deskriptor wajah karyawan secara lokal di browser dan membandingkannya dengan template biometrik terdaftar di sistem. | Skor kemiripan (Lolos jika confidence score >= 0.6) |
| **Step 4** | Server Action Presensi | Menyimpan transaksi kehadiran ke tabel `attendance`, mencatat foto bukti ke S3 proxy, dan mengupdate rekap bulanan. | Jam masuk tercatat sah 'PRESENT', tampilan kartu berhasil clock-in |

### Universal Multi-Tier Approval Engine
Alur terpadu persetujuan transaksi lintas modul di HERO.
| Step | Actor | Action Description | Expected Output |
| :--- | :--- | :--- | :--- |
| **Step 1** | Pembuat Transaksi | Mengajukan dokumen operasional (SPL Lembur, Form WO, Review Kontrak, Pengajuan Cuti). | Dokumen bertransisi dari 'DRAFT' ke 'PENDING' |
| **Step 2** | Tier 1 Approver (Section Head) | Membuka Inbox Persetujuan Terpadu (`/dashboard/approval`), memeriksa pratinjau dokumen (max-w-5xl), dan klik Approve. | Dokumen naik ke tingkat persetujuan Tier 2 |
| **Step 3** | Tier 2 Approver (Dept Head) | Meninjau pengajuan yang telah disetujui Tier 1, memberikan catatan persetujuan atau revisi. | Dokumen disetujui (atau naik ke Tier 3 jika perlu wewenang direksi) |
| **Step 4** | Sistem Eksekusi Transaksi | Jika seluruh tingkatan telah menyetujui, sistem mengeksekusi mutasi lanjutan secara otomatis. | Status dokumen 'APPROVED' final dan audit log tercatat |

---

## 6. Integration System

### 6.1. S3 Private Storage & Upload Proxy Engine
Bucket S3 CloudHost HERO berstatus **PRIVATE** untuk melindungi kerahasiaan data karyawan dan operasional perusahaan.
* **Larangan URL Langsung**: Dilarang menggunakan URL langsung S3 CloudHost (`https://is3.cloudhost.id/...`) karena akan menghasilkan error HTTP 403 Forbidden.
* **Larangan Presigned URL di Database**: Dilarang menyimpan token URL bertanda tangan (`?X-Amz-...`) karena akan kedaluwarsa dalam 1 jam (3600 detik).
* **Proxy Terpusat (`/api/uploads/[...path]`)**: Seluruh file dan gambar wajib disajikan melalui reverse proxy Next.js yang aman.
* **Dynamic URL Resolver (`resolveUploadUrl`)**: Komponen UI wajib membungkus tautan gambar dengan `resolveUploadUrl(rawUrl)` yang otomatis membersihkan query string kedaluwarsa dan menyesuaikan domain host aktif.

### 6.2. Face-API Biometrics & TensorFlow.js Runtime
Sistem verifikasi biometrik pengenalan wajah beroperasi sepenuhnya di sisi klien (*client-side execution*) menggunakan `@vladmandic/face-api`:
* Bobot model deteksi wajah (`ssd_mobilenetv1`, `face_landmark_68`, `face_recognition`) tersimpan secara lokal di folder `public/models/`.
* Ekstraksi menghasilkan vektor 128 dimensi (Float32Array) yang dienkripsi sebelum disimpan ke tabel `hero_biometric_descriptors`.

### 6.3. SAP Assets & ERP Integration Bridge
Modul aset dan inventaris workshop HERO terhubung secara berkala ke SAP korporat untuk:
* Sinkronisasi data master aset alat berat dan armada pengangkut ban.
* Pencocokan nomor Storage Location (SLoc) SAP pada gudang penampungan ban vulkanisir.

### 6.4. Email SMTP & Notification Delivery
Sistem komunikasi surat elektronik HERO dikelola terpusat via `/dashboard/settings/email`:
* Menangani pengiriman notifikasi persetujuan transaksi ke atasan, reminder SLA jatuh tempo review kontrak, dan alert darurat insiden HSE.
* Dilengkapi editor template email dinamis dan log pengiriman surat elektronik.

---

## 7. Business Users and Security

### 7.1. Role-Based Access Control (RBAC) Matrix & Data Scoping
Otorisasi berbutir halus menggunakan format standar `resource:action` didukung pemisahan data scope:
* **Super Admin**: Akses penuh ke seluruh modul, konfigurasi keamanan, audit trail log, dan sinkronisasi hak akses.
* **Department Head / Division Head**: Wewenang persetujuan Tier 2/3 di Approval Inbox, supervisi analitik, dan data scope seluruh perusahaan / site terkait.
* **Section Head / Supervisor**: Akses operasional harian, persetujuan Tier 1 anggota tim, dan pemantauan aktivitas Team Board (data scope `site`).
* **Staff / Teknisi Lapangan**: Pelaporan presensi biometrik, pengisian My Day, submit laporan bahaya EVHS, dan pengisian form teknis (data scope `own`).
* **Pelanggan Eksternal MAESTRO**: Akses portal mandiri dengan data scope terkunci pada `customerId` dan `siteId` resmi milik pelanggan.

### 7.2. Session Management & Data Protection
1. **Otentikasi & Sesi Sesuai Standar Better-Auth**:
   - Kata sandi di-hash menggunakan algoritma modern bcrypt/Argon2 dengan salt acak per akun.
   - Token sesi disimpan di dalam Cookie dengan atribut keamanan `HttpOnly`, `Secure`, dan `SameSite=Lax`.
   - Administrator memiliki wewenang untuk mencabut (*revoke*) sesi aktif pengguna secara paksa dari dashboard keamanan.
2. **Perlindungan Terhadap Serangan Siber**:
   - **Pencegahan SQL Injection**: Seluruh kueri basis data dibungkus dengan parameterized query bawaan Drizzle ORM.
   - **Validasi Skema Input**: Setiap payload Server Action divalidasi ketat menggunakan skema Zod sebelum diproses.
   - **Audit Trail Permanen**: Seluruh mutasi data tercatat di tabel `audit_logs` dan tidak dapat diubah atau dihapus.

### 7.3. Aturan Baku Pengunggahan Berkas (Centralized Upload Rule)
1. **Penyimpanan Persisten**: File disimpan di `public/uploads` yang di-mount ke host `/mnt/data/one-chitra/uploads` pada platform Dokploy.
2. **Aksi Sentral**: Wajib menggunakan `uploadFile(formData)` dari `@/app/actions/upload`. Dilarang keras memakai modul `fs` langsung.
3. **Penyajian Aman**: Berkas dilayani melalui endpoint reverse proxy `GET /api/uploads/[...path]`.
4. **Penamaan Acak UUID**: Setiap file otomatis diganti namanya menggunakan UUID v4 acak untuk mencegah penimpaan file dan eksploitasi Path Traversal.

### 7.4. Kepatuhan UU PDP Biometrik Wajah (4 Pilar Non-Destruktif)
Implementasi pengenalan wajah di HERO tunduk 100% pada **Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022)**:
1. **Persetujuan Eksplisit (Informed Consent)**: Pengguna wajib menyetujui dialog persetujuan sebelum sensor kamera biometrik diaktifkan.
2. **Enkripsi Deskriptor Vektor (Non-Destructive)**: Citra mentah wajah resolusi penuh tidak disimpan untuk pencocokan. Yang disimpan hanyalah matriks 128-vektor terenkripsi (Float32Array).
3. **Audit Trail Akses Biometrik**: Setiap aktivitas verifikasi dicatat lengkap mencakup waktu, ID perangkat, dan skor kemiripan.
4. **Hak Hapus Data Mandiri (Right to Erasure)**: Pengguna memiliki hak melalui menu profil untuk mencabut persetujuan dan menghapus data biometrik mereka sewaktu-waktu.

---

## 8. Planning Development, DevOps & Error Handling Runbook

### 8.1. Platform Deployment Dokploy
Aplikasi dideploy menggunakan platform Dokploy (Docker Standalone Engine) dengan konfigurasi multi-stage build yang memproduksi output Next.js standalone.
* **Volume Persisten (Host Bind Mount)**:
  `/mnt/data/one-chitra/uploads` <-> `/app/public/uploads`

### 8.2. Kamus Variabel Lingkungan (.env)

| Variable Name | Requirement | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Wajib | URL koneksi PostgreSQL lengkap ke database HERO. | `postgresql://postgres:password@localhost:5432/hero_db?sslmode=prefer` |
| `BETTER_AUTH_SECRET` | Wajib | Kunci enkripsi rahasia 32+ karakter untuk menandatangani token sesi cookie. | `a8f9c1e74b28d4e92a83c74921b38f90c8e21a47d6e5c9b2` |
| `BETTER_AUTH_URL` | Wajib | Alamat URL domain publik aplikasi HERO. | `https://hero.chitraparatama.com` |
| `S3_ENDPOINT` | Wajib | Endpoint Object Storage IS3 CloudHost. | `https://is3.cloudhost.id` |
| `S3_BUCKET` | Wajib | Nama bucket penyimpanan pribadi S3. | `onechitra` |
| `S3_ACCESS_KEY` | Wajib | Access Key ID untuk otentikasi S3. | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_KEY` | Wajib | Secret Access Key untuk otentikasi S3. | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `NODE_ENV` | Wajib | Lingkungan eksekusi aplikasi (production / development). | `production` |

### 8.3. Perintah CLI Database & Pemeliharaan

| Command Script | Purpose & Execution |
| :--- | :--- |
| `npm run db:push` | Sinkronisasi langsung skema TypeScript di `db/schema/` ke basis data PostgreSQL target. |
| `npm run db:generate` | Menghasilkan berkas migrasi SQL baru di direktori `drizzle/` sebelum rilis ke production. |
| `npm run db:migrate` | Mengeksekusi berkas migrasi SQL tertunda pada database production. |
| `npm run test:e2e` | Menjalankan seluruh rangkaian tes otomatis browser (E2E) dengan kredensial baku `71261`. |
| `npm run check-types` | Memvalidasi integritas tipe data TypeScript pada seluruh proyek sebelum commit. |

---

### 8.4. Standalone Comprehensive Error Handling & Troubleshooting Runbook

#### Layer 1: S3 Private Storage & File Upload Proxy
* **Insiden 1: HTTP 403 Forbidden pada Foto / Dokumen**
  * *Symptom*: Foto bukti presensi atau dokumen PDF tidak tampil dan memunculkan error 403 Forbidden.
  * *Root Cause*: Kode merender URL langsung S3 CloudHost (`https://is3.cloudhost.id/...`) pada private bucket.
  * *Direct Fix*: Bungkus URL dengan `resolveUploadUrl(rawUrl)` dari `lib/resolve-upload-url.ts` agar dialihkan ke `/api/uploads/[...path]`.
* **Insiden 2: Tautan Berkas Rusak Setelah 1 Jam (Expired Token)**
  * *Symptom*: Berkas baru diunggah bisa dibuka, namun setelah 60 menit rusak (`Request has expired`).
  * *Root Cause*: URL bertanda tangan presigned S3 (`?X-Amz-Expires=3600...`) disimpan langsung ke database.
  * *Direct Fix*: Database hanya boleh menyimpan key bersih atau path proxy `/api/uploads/${key}` tanpa token presigned.
* **Insiden 3: Upload Berkas Menghasilkan HTTP 404 pada Proxy**
  * *Symptom*: Berkas berhasil di-upload ke S3 tetapi saat dibuka lewat `/api/uploads/...` memunculkan 404.
  * *Root Cause*: Modul baru menggunakan folder/prefix upload baru yang belum terdaftar di whitelist proxy.
  * *Direct Fix*: Daftarkan prefix baru di `ALLOWED_UPLOAD_PREFIXES` pada `app/api/uploads/[...path]/route.ts`.

#### Layer 2: Database PostgreSQL & Drizzle ORM Schema Desync
* **Insiden 1: `PostgresError: column "xyz" does not exist`**
  * *Symptom*: Server Action crash sesaat setelah update fitur baru yang mengubah skema tabel.
  * *Root Cause*: Skema TypeScript di `db/schema/` telah ditambah kolom baru tetapi database fisik belum disinkronkan, atau metadata cache Drizzle masih menyimpan skema lama.
  * *Runbook Fix*: 1) Jalankan `npm run db:push`; 2) Restart server dev (`npm run dev`) atau restart container Docker (`docker restart one-chitra-hero`) untuk membersihkan metadata cache.
* **Insiden 2: Database Connection Pool Exhaustion (`too many clients already`)**
  * *Symptom*: Respon aplikasi melambat drastis saat jam presensi sibuk (06:30 - 07:30).
  * *Root Cause*: Instansiasi koneksi pool Drizzle dibuat baru berulang kali di dalam server action tanpa singleton.
  * *Direct Fix*: Gunakan `globalThis.postgresPool` singleton di `db/index.ts` dengan batas maksimal koneksi pool = 20.

#### Layer 3: Otentikasi Sesi, RBAC & Data Scoping
* **Insiden 1: Redirect Loop atau HTTP 403 pada Menu Resmi Karyawan**
  * *Symptom*: Karyawan memiliki role aktif namun ditolak saat membuka halaman dashboard.
  * *Root Cause*: Modul baru di `lib/navigation.ts` belum disinkronkan ke tabel permission database.
  * *Direct Fix*: Buka `/dashboard/security` sebagai Super Admin dan klik tombol **"Sync Permissions"**.
* **Insiden 2: Kebocoran Data Antar-Site Tambang (Cross-Site Contamination)**
  * *Symptom*: Pengawas di Site Sangatta dapat melihat pengajuan lembur dari Site Satui.
  * *Root Cause*: Query database mengabaikan filter data scoping berdasarkan `roleScope` pengguna.
  * *Direct Fix*: Wajib menyertakan kondisi `eq(table.siteId, employee.siteId)` jika `session.user.roleScope === 'site'`.

#### Layer 4: Biometrik Pengenalan Wajah & Geofencing GPS
* **Insiden 1: Penolakan Presensi `Di Luar Radius Site Kerja` Padahal Karyawan di Lokasi**
  * *Symptom*: Karyawan gagal clock-in dengan pesan radius GPS terlampaui.
  * *Root Cause*: Akurasi horizontal GPS smartphone rendah (>100m) akibat kanopi workshop tambang atau cuaca.
  * *Direct Fix*: Gunakan rumus jarak efektif: `Jarak Efektif = Jarak Haversine - (Akurasi GPS / 2)`. Jika tetap di luar batas, sistem mencatat ke `attendance_exceptions` untuk approval Section Head.
* **Insiden 2: Model face-api Gagal Dimuat (`Failed to load weight files`)**
  * *Symptom*: Kotak deteksi wajah tidak muncul dan browser console menampilkan error file model `.bin`.
  * *Direct Fix*: Pastikan seluruh file bobot model tersimpan lokal di `public/models/` dan Service Worker aktif untuk offline caching.

#### Layer 5: Multi-Tier Approval Engine Deadlocks
* **Insiden 1: Dokumen Menggantung (*Stuck in Review*) Karena Atasan Kosong**
  * *Symptom*: Pengajuan lembur/WO berstatus `PENDING` tetapi tidak muncul di inbox siapapun.
  * *Root Cause*: Karyawan belum memiliki data atasan (`reports_to_employee_id`) di `hero_employees`.
  * *Direct Fix*: Engine approval memiliki logika self-healing otomatis: Atasan Langsung -> Dept Head -> Site Manager -> System Admin, disertai log peringatan audit.

#### Layer 6: Dokploy Deployment & Runtime Container Issues
* **Insiden 1: File Upload Hilang Setelah Container Rebuild di Dokploy**
  * *Symptom*: Pasca redeploy versi baru, seluruh foto dan dokumen lama menghasilkan error 404.
  * *Root Cause*: Folder `/app/public/uploads` di container bersifat ephemeral dan belum dipetakan ke host volume.
  * *Direct Fix*: Pasang Persistent Bind Mount di Dokploy: Host Path `/mnt/data/one-chitra/uploads` dipetakan ke Container Path `/app/public/uploads`.
* **Insiden 2: Next.js SSR Hydration Error**
  * *Symptom*: Tampilan berkedip putih saat dibuka pertama kali dan memunculkan error hydration mismatch.
  * *Direct Fix*: Gunakan component wrapper dengan state `useEffect` mounted atau formatter tanggal aman.

---

## 9. Complete Module & Page Directory (HERO System Detailed Specifications)

Berikut adalah lembar spesifikasi teknis lengkap dari rute-rute halaman utama di dalam sistem HERO Enterprise. Setiap halaman mencakup Kategori & Resource, File Sumber & Action, Hak Akses Role, Fungsi & Peran Bisnis, Sumber Data (Tabel SSoT/API), serta Fitur-Fitur Utama:

### 1. Executive Dashboard (`/dashboard`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Main & Portal \| Resource: `dashboard` |
| **Source File** | `app/dashboard/page.tsx` \| Action: `app/actions/dashboard.ts` |
| **Allowed Roles** | All Logged-in Users (Scoped by Site & Role) |
| **1. Fungsi & Peran Bisnis** | Menyajikan ringkasan eksekutif secara real-time mengenai produktivitas karyawan hari ini, status keselamatan (EVHS zero-accident), progres WO workshop, kehadiran tim, dan pintasan aksi cepat operasional. |
| **2. Sumber Data** | Tabel `attendance`, `hero_daily_activities`, `hero_evhs_reports`, `hero_form_wo`, `hero_employees` |
| **3. Fitur-Fitur Utama** | Scorecard KPI performa cerah (`HeroKpiCard`), grafik tren jam kerja produktif, widget status presensi hari ini, daftar notifikasi persetujuan tertunda, tombol pintas navigasi cepat. |

### 2. Master Data Karyawan (SSoT) (`/dashboard/hc/employee`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Human Capital (HC) \| Resource: `hc-employees` |
| **Source File** | `app/dashboard/hc/employee/page.tsx` \| Action: `app/actions/employee.ts` |
| **Allowed Roles** | Super Admin, HC Manager, HC Site Officer |
| **1. Fungsi & Peran Bisnis** | Menjadi **Single Source of Truth (SSoT)** seluruh data kepegawaian perusahaan: NRP/SN, nama, penempatan site, departemen, seksi kerja, jabatan resmi, status PKWT/Permanen, dan tanggal kontrak. |
| **2. Sumber Data** | Tabel `hero_employees`, `hero_master_departments`, `hero_master_sections`, `hero_sites`, `hero_master_positions`, `user` |
| **3. Fitur-Fitur Utama** | Tabel tervirtualisasi `HeroDataTable`, filter multi-select site tambang dan departemen, dialog modal Create/Edit `HeroFormDialog`, import CSV data karyawan, export Excel `.xlsx`, tombol reset kredensial login. |

### 3. Detail Profil Karyawan (`/dashboard/hc/employee/[id]`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Human Capital (HC) \| Resource: `hc-employees` |
| **Source File** | `app/dashboard/hc/employee/[id]/page.tsx` \| Action: `app/actions/employee.ts` |
| **Allowed Roles** | Super Admin, HC Staff, Atasan Langsung, Karyawan Bersangkutan |
| **1. Fungsi & Peran Bisnis** | Menampilkan profil 360 derajat karyawan secara mendalam: riwayat penempatan site, histori perpanjangan kontrak, rekap absensi, sertifikasi keahlian, dan dokumen arsip digital (E-Filing). |
| **2. Sumber Data** | Tabel `hero_employees`, `hero_hr_contract_reviews`, `attendance`, `hero_biometric_descriptors` |
| **3. Fitur-Fitur Utama** | Dokumen pratinjau resmi `HeroDetailModal`, badge status hubungan kerja, tombol shortcut edit data, tabulasi riwayat kontrak, kartu identitas karyawan digital. |

### 4. Review Kontrak PKWT Karyawan (`/dashboard/hc/contract-review`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Human Capital (HC) \| Resource: `contract-review` |
| **Source File** | `app/dashboard/hc/contract-review/page.tsx` \| Action: `app/actions/contract-review.ts` |
| **Allowed Roles** | Super Admin, HC Corporate, Site Manager, Section Head |
| **1. Fungsi & Peran Bisnis** | Sistem peringatan dini (*early warning system*) masa berlaku kontrak kerja PKWT yang jatuh tempo dalam 30, 60, dan 90 hari guna menjamin kepatuhan regulasi ketenagakerjaan. |
| **2. Sumber Data** | Tabel `hero_employees`, `hero_hr_contract_reviews`, `hero_sites` |
| **3. Fitur-Fitur Utama** | Filter cepat status jatuh tempo (30/60/90 hari), badge sisa hari masa kontrak, shortcut formulir evaluasi kinerja, penerbitan draf surat perpanjangan PKWT, ekspor rekap Excel. |

### 5. Formulir Evaluasi Review Kontrak (`/dashboard/hc/contract-review/form/[id]`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Human Capital (HC) \| Resource: `contract-review` |
| **Source File** | `app/dashboard/hc/contract-review/form/[id]/page.tsx` \| Action: `app/actions/contract-review.ts` |
| **Allowed Roles** | Section Head, Dept Head, HC Manager |
| **1. Fungsi & Peran Bisnis** | Tempat atasan mengisi penilaian kinerja kompetensi teknis, kedisiplinan, dan kepatuhan safety karyawan untuk menentukan rekomendasi perpanjangan kontrak. |
| **2. Sumber Data** | Tabel `hero_hr_contract_reviews`, `hero_employees`, `hero_approval_workflows` |
| **3. Fitur-Fitur Utama** | Form penilaian kompetensi bertingkat, kalkulasi otomatis skor evaluasi akhir, unggah lampiran pendukung via S3 proxy, integrasi pengajuan persetujuan ke Dept Head. |

### 6. Master Struktur Organisasi & Site (`/dashboard/master-data`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | System & Master Data \| Resource: `master-data` |
| **Source File** | `app/dashboard/master-data/page.tsx` \| Action: `app/actions/master-data.ts` |
| **Allowed Roles** | Super Admin, HC Corporate |
| **1. Fungsi & Peran Bisnis** | Mengelola entitas dasar organisasi perusahaan: master cabang site tambang operasional, koordinat geofencing, radius toleransi GPS meter, departemen, dan seksi kerja. |
| **2. Sumber Data** | Tabel `hero_sites`, `hero_master_departments`, `hero_master_sections`, `hero_master_positions` |
| **3. Fitur-Fitur Utama** | Peta hierarki organisasi (Tree View), peta picker koordinat latitude/longitude site, dialog modal Create/Edit `HeroFormDialog`, ekspor data master ke Excel. |

### 7. Presensi Geofencing & Biometrik Wajah (`/dashboard/attendance`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Attendance & Operations \| Resource: `attendance` |
| **Source File** | `app/dashboard/attendance/page.tsx` \| Action: `app/actions/attendance.ts` |
| **Allowed Roles** | All Logged-in Employees |
| **1. Fungsi & Peran Bisnis** | Pencatatan kehadiran datang dan pulang kerja mandiri tervalidasi radius lokasi GPS site resmi dan verifikasi biometrik pengenalan wajah anti titip-absen. |
| **2. Sumber Data** | Tabel `attendance`, `hero_sites`, `hero_biometric_descriptors`, `hero_employees` |
| **3. Fitur-Fitur Utama** | Kalkulasi jarak Haversine real-time, kamera verifikasi biometrik wajah `face-api.js`, deteksi liveness anti spoofing, rekaman waktu clock-in/out akurat, kartu status kehadiran hari ini. |

### 8. Peta Presensi GPS & Face Live Map (`/dashboard/attendance/live-map`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Attendance & Operations \| Resource: `attendance-live-map` |
| **Source File** | `app/dashboard/attendance/live-map/page.tsx` \| Action: `app/actions/attendance.ts` |
| **Allowed Roles** | Super Admin, Site Manager, Section Head |
| **1. Fungsi & Peran Bisnis** | Monitoring visual posisi sebaran presensi karyawan di lapangan tambang pada peta digital secara real-time untuk mendeteksi kecurangan lokasi. |
| **2. Sumber Data** | Tabel `attendance`, `hero_sites`, `hero_employees` |
| **3. Fitur-Fitur Utama** | Peta interaktif Leaflet/Mapbox, cluster pin marker karyawan per site tambang, lingkaran geofence radius site resmi, popup detail foto dan jam clock-in. |

### 9. Laporan Aktivitas Harian Saya (My Day) (`/dashboard/activity-hub/my-day`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Activity Hub \| Resource: `activity-hub` |
| **Source File** | `app/dashboard/activity-hub/my-day/page.tsx` \| Action: `app/actions/daily-activity.ts` |
| **Allowed Roles** | All Logged-in Employees |
| **1. Fungsi & Peran Bisnis** | Pencatatan laporan aktivitas kerja harian mandiri oleh karyawan: mendokumentasikan pekerjaan per jam, durasi efektif, dan foto bukti lapangan sebelum diajukan ke atasan. |
| **2. Sumber Data** | Tabel `hero_daily_activities`, `hero_daily_activity_sessions`, `hero_employees` |
| **3. Fitur-Fitur Utama** | Timer sesi interaktif, timeline aktivitas harian terstruktur, upload foto dokumentasi lapangan via S3 proxy, kalkulasi jam kerja efektif, tombol submit ke atasan. |

### 10. Papan Pantau Tim (Team Board) (`/dashboard/activity-hub/team-board`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Activity Hub \| Resource: `team-board` |
| **Source File** | `app/dashboard/activity-hub/team-board/page.tsx` \| Action: `app/actions/daily-activity.ts` |
| **Allowed Roles** | Section Head, Dept Head, Site Manager |
| **1. Fungsi & Peran Bisnis** | Dashboard supervisi atasan untuk memantau progres aktivitas kerja harian seluruh anggota tim dalam satu seksi/site, melihat siapa yang belum submit, dan menyetujui laporan tim. |
| **2. Sumber Data** | Tabel `hero_daily_activities`, `hero_employees`, `hero_master_sections` |
| **3. Fitur-Fitur Utama** | Filter tim per seksi kerja dan site, timeline progres pekerjaan anggota tim, indikator belum submit laporan, modal pratinjau foto bukti kerja, ekspor rekap harian ke Excel. |

### 11. Pengajuan & Rekap Lembur (SPL) (`/dashboard/overtime-requests`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Attendance & Operations \| Resource: `overtime-requests` |
| **Source File** | `app/dashboard/overtime-requests/page.tsx` \| Action: `app/actions/overtime.ts` |
| **Allowed Roles** | All Logged-in Employees & Supervisors |
| **1. Fungsi & Peran Bisnis** | Pengelolaan pengajuan Surat Perintah Lembur (SPL) karyawan sebelum/sesudah pekerjaan, kalkulasi otomatis upah lembur regulasi Depnaker, dan integrasi persetujuan atasan. |
| **2. Sumber Data** | Tabel `hero_overtime_requests`, `hero_employees`, `hero_approval_workflows` |
| **3. Fitur-Fitur Utama** | Formulir pengajuan jam lembur, kalkulator otomatis upah lembur, alur persetujuan bertingkat Section Head & Dept Head, cetak form SPL standar A4, ekspor ke payroll. |

### 12. Inbox Persetujuan Terpadu (`/dashboard/approval`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Approval Engine \| Resource: `approvals` |
| **Source File** | `app/dashboard/approval/page.tsx` \| Action: `app/actions/approval.ts` |
| **Allowed Roles** | Section Head, Dept Head, Site Manager, Division Head |
| **1. Fungsi & Peran Bisnis** | Pintu gerbang persetujuan satu atap untuk seluruh dokumen transaksi perusahaan (Lembur, RFR, Form WO-24, Evaluasi Kontrak, Audit 5R) tanpa berpindah modul. |
| **2. Sumber Data** | Tabel `hero_approval_workflows`, `hero_approval_steps`, `hero_approval_logs`, `hero_employees` |
| **3. Fitur-Fitur Utama** | Filter jenis dokumen transaksi, tombol cepat Approve & Reject berikon, dialog alasan penolakan, Official Document Preview Modal (`sm:max-w-5xl`), jejak hierarki approver. |

### 13. Pelaporan Bahaya & Insiden EVHS (`/dashboard/hse/evhs`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | HSE & Keselamatan Kerja \| Resource: `evhs` |
| **Source File** | `app/dashboard/hse/evhs/page.tsx` \| Action: `app/actions/evhs.ts` |
| **Allowed Roles** | All Employees & HSE Officers |
| **1. Fungsi & Peran Bisnis** | Pelaporan cepat temuan Kondisi Tidak Aman (KTA) atau Tindakan Tidak Aman (TTA) di lingkungan kerja pit tambang dan workshop untuk mewujudkan target zero accident. |
| **2. Sumber Data** | Tabel `hero_evhs_reports`, `hero_employees`, `hero_sites` |
| **3. Fitur-Fitur Utama** | Form pelaporan bahaya dengan upload foto bukti, Risk Matrix interaktif (Likelihood x Consequence), penetapan PIC perbaikan, investigasi 5-Why, notifikasi email darurat. |

### 14. Audit & Penilaian 5R / 5S (`/dashboard/quality/5r`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Quality & HSE \| Resource: `five-r` |
| **Source File** | `app/dashboard/quality/5r/page.tsx` \| Action: `app/actions/five-r.ts` |
| **Allowed Roles** | HSE Officer, Quality Auditor, Workshop Lead |
| **1. Fungsi & Peran Bisnis** | Pelaksanaan audit berkala kepatuhan budaya kerja Ringkas, Rapi, Resik, Rawat, Rajin di workshop servis, gudang logistik, dan area kantor. |
| **2. Sumber Data** | Tabel `hero_five_r_assessments`, `hero_sites`, `hero_employees` |
| **3. Fitur-Fitur Utama** | Checklist penilaian kriteria 5R, kalkulasi scoring persentase otomatis, dokumentasi foto temuan audit, penerbitan laporan hasil audit PDF resmi standar A4. |

### 15. Inspeksi Ban di Pit Tambang (`/dashboard/hse/tire-inspection`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | HSE & Operations \| Resource: `tire-inspection` |
| **Source File** | `app/dashboard/hse/tire-inspection/page.tsx` \| Action: `app/actions/tire-inspection.ts` |
| **Allowed Roles** | Tire Inspector, HSE Officer, Site Engineer |
| **1. Fungsi & Peran Bisnis** | Pemeriksaan teknis lapangan ban unit hauling di area tambang: mengukur tekanan angin (PSI), temperatur ban, ketebalan tapak R1-R4, dan deteksi keretakan dini. |
| **2. Sumber Data** | Tabel `hero_tire_inspections`, `hero_fleet`, `hero_customers` |
| **3. Fitur-Fitur Utama** | Input multi-titik tapak ban (R1-R4), foto kerusakan fisik ban pit, rekomendasi teknis otomatis (lanjut pakai / rekondisi / scrap), ekspor laporan inspeksi PDF. |

### 16. Surat Perintah Kerja WO-24 Servis Ban (`/dashboard/repair-retread/form-wo`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Central Service & Repair \| Resource: `service-form` |
| **Source File** | `app/dashboard/repair-retread/form-wo/page.tsx` \| Action: `app/actions/wo.ts` |
| **Allowed Roles** | Workshop Receiver, Technician, QC Inspector |
| **1. Fungsi & Peran Bisnis** | Dokumen operasional utama perbaikan ban vulkanisir di workshop Central Service dari penerimaan awal, penugasan teknisi, inspeksi kelolosan QC, hingga siap kirim. |
| **2. Sumber Data** | Tabel `hero_form_wo`, `hero_customers`, `hero_approval_workflows` |
| **3. Fitur-Fitur Utama** | Pencatatan serial number unik ban, alokasi teknisi rekondisi, pembubuhan tanda tangan digital teknisi & QC, cetak formulir resmi WO-24 standar A4 dengan logo perusahaan. |

### 17. Pengiriman & Surat Jalan DO (`/dashboard/deliveries`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Logistics & Deliveries \| Resource: `deliveries` |
| **Source File** | `app/dashboard/deliveries/page.tsx` \| Action: `app/actions/deliveries.ts` |
| **Allowed Roles** | Logistics Dispatcher, Warehouse Staff, Supir |
| **1. Fungsi & Peran Bisnis** | Penerbitan Surat Jalan (Delivery Order) resmi standar A4 untuk pengiriman ban servis atau ban baru dari workshop ke site tambang pelanggan, disertai bukti tanda terima digital. |
| **2. Sumber Data** | Tabel `hero_deliveries`, `hero_fleet`, `hero_customers`, `hero_form_wo` |
| **3. Fitur-Fitur Utama** | Pembuatan DO dari WO yang lolos QC, penugasan armada truk dan supir, pelacakan status ekspedisi pengiriman, upload foto bukti serah terima (POD), cetak DO standar A4. |

### 18. Manajemen Role, Hak Akses & Audit Trail (`/dashboard/security`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | System & Security Management \| Resource: `security` |
| **Source File** | `app/dashboard/security/page.tsx` \| Action: `app/actions/users.ts` |
| **Allowed Roles** | Super Admin |
| **1. Fungsi & Peran Bisnis** | Pusat kendali keamanan sistem: mengatur hak menu, matriks perizinan `resource:action` (view, create, edit, delete), data scope (`own`, `site`, `global`), dan inspeksi jejak audit permanen. |
| **2. Sumber Data** | Tabel `hero_security_roles`, `hero_role_menu_permissions`, `audit_logs`, `session` |
| **3. Fitur-Fitur Utama** | Matriks hak akses visual, tombol aksi "Sync Permissions", monitor sesi aktif real-time dengan tombol Revoke paksa, penampil log mutasi data audit trail. |

### 19. Pengaturan Email & Template Notifikasi (`/dashboard/settings/email`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | System Settings \| Resource: `settings` |
| **Source File** | `app/dashboard/settings/email/page.tsx` \| Action: `app/actions/email-settings.ts` |
| **Allowed Roles** | Super Admin |
| **1. Fungsi & Peran Bisnis** | Mengelola kredensial server SMTP korporat dan kustomisasi template email untuk notifikasi approval, reminder jatuh tempo kontrak, dan peringatan darurat HSE. |
| **2. Sumber Data** | Tabel `hero_email_settings`, `hero_email_templates` |
| **3. Fitur-Fitur Utama** | Konfigurasi host/port/auth SMTP, editor template surat elektronik, pratinjau data sampel variabel dinamis, pengujian kirim email live test. |

### 20. Portal Layanan Pelanggan MAESTRO (`/maestro/dashboard`)
| Specification Field | Technical & Business Detail |
| :--- | :--- |
| **Category & Resource** | Customer Portal MAESTRO \| Resource: `maestro-portal` |
| **Source File** | `app/maestro/dashboard/page.tsx` \| Action: `app/actions/maestro.ts` |
| **Allowed Roles** | B2B Customer Users (Scoped strictly by Customer ID & Site ID) |
| **1. Fungsi & Peran Bisnis** | Menyediakan portal layanan mandiri bagi manajemen pelanggan tambang (`maestro.chitraparatama.com`) untuk melihat status perbaikan ban, data inventaris di site mereka, dan pelaporan berkala secara aman. |
| **2. Sumber Data** | Tabel `hero_form_wo`, `hero_deliveries`, `hero_customers`, `hero_sites` |
| **3. Fitur-Fitur Utama** | Pelacakan status tiket servis ban, pemantauan ban afkir (scrap tire), scorecard KPI armada tambang, data access scope terisolasi read-only. |

---

## 10. Developer Handover Checklist & Sign-Off

### Langkah 1: Setup Lingkungan Lokal (Local Environment)
* [X] Pastikan Node.js terpasang dengan versi 22 LTS (`node -v`).
* [X] Pastikan Docker & Docker Compose aktif di komputer pengembang.
* [X] Kloning repository: `git clone <repo-url>` dan masuk ke direktori proyek HERO.
* [X] Jalankan `npm install` untuk mengunduh seluruh dependensi.
* [X] Salin berkas konfigurasi: `cp .env.example .env` dan sesuaikan `DATABASE_URL` ke PostgreSQL lokal atau container.
* [X] Jalankan migrasi dan sinkronisasi awal: `npm run db:push`.
* [X] Nyalakan server development: `npm run dev` dan buka `http://localhost:3000` di browser.

### Langkah 2: Standar Pengkodean Wajib (Golden Rules)
* [X] **Single Source of Truth Rule**: Seluruh query data kepegawaian WAJIB ke tabel `hero_employees`. DILARANG KERAS melakukan query runtime ke tabel staging `hero_hr_employees`!
* [X] **S3 Storage & Proxy Rule**: Seluruh file dan gambar WAJIB disajikan melalui proxy `/api/uploads/[...path]` dan dibungkus `resolveUploadUrl(rawUrl)`. DILARANG menyimpan URL bertanda tangan presigned S3 ke database!
* [X] **RBAC & Navigation Rule**: Setiap penambahan rute/modul baru WAJIB didaftarkan resource-nya di `lib/navigation.ts`, lalu jalankan aksi **"Sync Permissions"** pada menu Admin Roles.
* [X] **Reusable Templates Rule**: Seluruh tabel, form, dan modal WAJIB mengimpor modul baku dari `@/components/templates` (`HeroDataTable`, `HeroSearchableSelect`, `HeroFormField`, dll) dengan tinggi tombol seragam `h-9` (36px). DILARANG menggunakan raw `<table>` atau `<select>` manual.
* [X] **Database Push Rule**: Setelah memodifikasi skema di `db/schema/`, WAJIB jalankan `npm run db:push` dan restart server untuk membersihkan in-memory metadata cache Drizzle.
* [X] **E2E Testing Rule**: Setiap penambahan fitur atau perbaikan bug WAJIB diverifikasi menggunakan pengujian otomatis browser `npm run test:e2e` dengan kredensial baku `71261` / `Chitra#71261`.

### Langkah 3: Panduan Deployment & Verifikasi (Production Release)
* [X] Jalankan pemeriksaan integritas tipe data TypeScript sebelum rilis: `npm run check-types`.
* [X] Buat berkas migrasi fisik permanen: `npm run db:generate`.
* [X] Pastikan Host Bind Mount `/mnt/data/one-chitra/uploads` <-> `/app/public/uploads` terpasang di platform Dokploy host server.
* [X] Buka menu Admin > Roles (`/dashboard/security`) dan klik **"Sync Permissions"** untuk memastikan seluruh hak akses baru tercatat di database.
* [X] Ambil tangkapan layar verifikasi E2E (`await app.screenshot()`) sebagai bukti antarmuka berfungsi tanpa cela.

### Langkah 4: Troubleshooting Umum (Common Gotchas)
* [X] **Error `column "xyz" does not exist` saat query Drizzle**: Jalankan `npm run db:push` lalu restart dev server atau container produksi (`docker restart one-chitra-hero`).
* [X] **Foto/Berkas menghasilkan HTTP 403 Forbidden**: Bungkus URL dengan `resolveUploadUrl(photoUrl)` dan periksa apakah prefix folder sudah didaftarkan pada `ALLOWED_UPLOAD_PREFIXES` di `app/api/uploads/[...path]/route.ts`.
* [X] **File unggahan hilang setelah container Dokploy di-rebuild**: Periksa apakah Persistent Bind Mount `/mnt/data/one-chitra/uploads` sudah aktif pada dashboard Dokploy.
* [X] **Menu sidebar tidak muncul setelah rute baru dibuat**: Pastikan resource sudah didaftarkan di `lib/navigation.ts` dan klik tombol **"Sync Permissions"** di Admin Roles.
