# HSE Module — Presentasi Lengkap

## Slide 1 — Judul

```
╔══════════════════════════════════════════════════╗
║          HSE MANAGEMENT SYSTEM                   ║
║     Health, Safety & Environment Module          ║
║                                                  ║
║     Platform Hero — Modul K3 Terintegrasi        ║
║                                                  ║
║     Dashboard Admin + Mobile Field App           ║
╚══════════════════════════════════════════════════╝
```

---

## Slide 2 — Arsitektur Modul

```
┌─────────────────────────────────────────────────────────┐
│                  HSE MODULE MAP                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────┐   ┌─────────────────────┐    │
│   │   DASHBOARD WEB     │   │   MOBILE FIELD APP   │    │
│   │   (app/dashboard/)  │   │   (app/mobile/)      │    │
│   │   ┌───────────────┐ │   │   ┌───────────────┐  │    │
│   │   │ HSE Ops Desk  │ │   │   │ HSE Mobile Hub│  │    │
│   │   │ Safety Dash   │ │   │   │ Field Actions  │  │    │
│   │   │ HIRADC        │ │   │   │ Admin Modules  │  │    │
│   │   │ JSA           │ │   │   │ Offline Sync   │  │    │
│   │   │ PTW           │ │   │   │ GPS + Camera   │  │    │
│   │   │ Inventaris    │ │   │   │ Emergency Push │  │    │
│   │   │ Checklists    │ │   │   │                │  │    │
│   │   │ SIA/SIO Cert  │ │   │   │                │  │    │
│   │   └───────────────┘ │   │   └───────────────┘  │    │
│   └─────────────────────┘   └─────────────────────┘    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │            DATABASE LAYER (Drizzle ORM)         │   │
│   │   25+ tabel HSE — PostgreSQL / Supabase         │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │       PUSH NOTIFICATION (PWA)                   │   │
│   │       HSE Alerts — Emergency Broadcast          │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Dual Platform**: Web Dashboard (Back Office) + Mobile App (Field) + Offline Support

---

## Slide 3 — Menu Utama HSE (Dashboard Web)

| No | Menu | Route | Fungsi |
|----|------|-------|--------|
| 1 | **HSE Operations Desk** | `/dashboard/hse` | Pusat monitoring observasi & insiden |
| 2 | **Safety Dashboard** | `/dashboard/safety` | KPI, grafik, scorecard K3 |
| 3 | **Safety Data Management** | `/dashboard/safety/data` | CRUD, import/export data safety |
| 4 | **Safety Inspections** | `/dashboard/safety/inspections` | Inspeksi K3 |
| 5 | **HSE Checklists** | `/dashboard/hse/checklist-generator` | Template & daily checklist digital |
| 6 | **HIRADC** | `/dashboard/hse/hiradc` | Hazard Identification & Risk Assessment |
| 7 | **SIA/SIO & Tools Cert** | `/dashboard/hse/sia-sio-tools-certification` | Sertifikasi alat & operator |
| 8 | **Inventaris HSE** | `/dashboard/hse/inventaris` | Manajemen APD & equipment |
| 9 | **Incident Report** | `/dashboard/hse/incident-report` | Laporan insiden + RCA |
| 10 | **Izin Kerja PTW** | `/dashboard/hse/izin-kerja-ptw` | Permit to Work System |
| 11 | **JSA** | `/dashboard/hse/jsa` | Job Safety Analysis |

---

## Slide 4 — Menu HSE Mobile (Field App)

| No | Fitur | Route | Fungsi |
|----|-------|-------|--------|
| 1 | **HSE Hub** | `/mobile/hse` | Landing page mobile HSE |
| 2 | **Observasi & Emergency** | `/mobile/hse/observasi-emergency` | Catat temuan & emergency |
| 3 | **Incident Report** | `/mobile/hse/incident-report` | Investigasi & laporan |
| 4 | **Corrective Action** | `/mobile/hse/corrective-action` | Follow-up & close-out |
| 5 | **HIRADC** | `/mobile/hse/hiradc` | Risk register mobile |
| 6 | **JSA** | `/mobile/hse/jsa` | JSA mobile |
| 7 | **Izin Kerja PTW** | `/mobile/hse/ptw` | PTW mobile |
| 8 | **Inventaris HSE** | `/mobile/hse/inventaris` | APD & equipment mobile |
| 9 | **Checklist** | `/mobile/hse/checklist` | Template & daily check |
| 10 | **Safety Data** | `/mobile/hse/safety-data` | Performance dashboard |
| 11 | **SIA/SIO Tools** | `/mobile/hse/sia-sio-tools` | Sertifikasi tools |
| 12 | **Inspections** | `/mobile/hse/inspections` | Inspeksi lapangan |
| 13 | **Induction** | `/mobile/hse/induction` | Safety induction |

---

## Slide 5 — HSE Operations Desk (Dashboard Web)

### Fitur Utama

```
╔══════════════════════════════════════════════════════════╗
║                    HSE OPERATIONS DESK                    ║
║           M6 • HSE Module — Pusat Monitoring              ║
╚══════════════════════════════════════════════════════════╝
```

**Metric Cards (Top Row):**
- Total Observasi — jumlah temuan lapangan
- Item Terbuka — perlu closure action
- Total Insiden — perlu dipantau

**Tab 1 — Observasi (Field Observation):**
- Tabel unsafe act & unsafe condition
- Filter: site, kategori, status
- Preset: Terbuka / Ditangani
- Action: CRUD + row actions per item
- Date filter

**Tab 2 — Insiden (HSE Incident):**
- Antrian insiden untuk investigasi
- Kolom: Title, Type, Unit, Impact, Reported, Status
- Filter: site, tipe, status
- Preset: Ditinjau / Selesai
- Action: update status, pelaporan

---

## Slide 6 — Safety Dashboard

### KPI Scorecards & Charts

```
╔══════════════════════════════════════════════════════════╗
║                    SAFETY DASHBOARD                       ║
║    Overview KPI dan grafik K3 untuk manajemen            ║
╚══════════════════════════════════════════════════════════╝
```

**8 KPI Cards:**
1. Incident YTD — total event tahun berjalan
2. Fatality — jumlah fatality (warning jika > 0)
3. Safe Man Hours — akumulasi jam kerja aman
4. Expired Certifications — sertifikat perlu follow-up
5. Near Miss — near miss YTD
6. Property Damage — kerusakan properti YTD
7. First Aid — first aid cases YTD
8. Weekly Activity — aktivitas bulan ini

**Charts (SafetyDashboardCharts):**
- Grafik tren insiden (yearly/monthly)
- Breakdown per tipe insiden
- Visual performance metrics

**Features:**
- Filter tahun, bulan, lokasi
- Tombol "Kelola Data Safety" → Data Management page
- EnterpriseScorecards component

---

## Slide 7 — Safety Data Management

### CRUD, Import, Export

```
╔══════════════════════════════════════════════════════════╗
║              SAFETY DATA MANAGEMENT                       ║
║    CRUD — Import CSV — Export — Filter per dataset       ║
╚══════════════════════════════════════════════════════════╝
```

**Dataset yang Dikelola:**
| Dataset | Deskripsi |
|---------|-----------|
| Insiden Tahunan | Yearly summary KPI |
| Insiden Bulanan | Monthly breakdown |
| Incident Reports | Laporan detail insiden |
| Sertifikasi | Equipment/operator certs |
| Performance Metrics | Safe man-hours, thresholds |
| Man Hours | Per-location tracking |
| Monthly Man Hours | Breakdown bulanan |
| Weekly Activities | Aktivitas + evidence |

**Fitur:**
- Tambah / Edit / Hapus data
- Import dari CSV
- Export ke CSV / Excel
- Filter & search per kolom
- Role-based access control

---

## Slide 8 — Safety Inspections

```
╔══════════════════════════════════════════════════════════╗
║                  SAFETY INSPECTIONS                       ║
║    Inspeksi K3 — Scoring — Attachments                   ║
╚══════════════════════════════════════════════════════════╝
```

**Fitur:**
- Pencatatan inspeksi lapangan
- Assessment score
- Lampiran foto/dokumen
- Preview dialog inspeksi
- Status & tindak lanjut
- Filter by location & inspector
- Integrasi dengan mobile inspection

---

## Slide 9 — HIRADC (Hazard Identification, Risk Assessment & Determining Control)

```
╔══════════════════════════════════════════════════════════╗
║                        HIRADC                             ║
║    Risk Register — Before/After Control Scoring          ║
╚══════════════════════════════════════════════════════════╝
```

**Fitur Lengkap:**

**Register Management:**
- Daftar dokumen HIRADC per area/unit
- Nomor dokumen, revisi,有效期
- Status dokumen (draft/active/archived)
- Print PDF — `/print/hiradc/[id]`

**Risk Entries:**
- Identifikasi hazard & konsekuensi
- Existing risk control
- **Before Control**: likelihood × severity = risk level
- **After Control**: residual risk scoring
- Risk matrix (Low / Medium / High / Critical)
- Entry form dengan dropdown master data

**Bulk Import:**
- Import entries dari file
- Batch tracking via `hiradcImports`

---

## Slide 10 — JSA (Job Safety Analysis)

```
╔══════════════════════════════════════════════════════════╗
║                     JSA — JOB SAFETY ANALYSIS             ║
║    Step-by-step hazard — consequence — control           ║
╚══════════════════════════════════════════════════════════╝
```

**Fitur:**

**JSA Workspace:**
- Daftar JSA dengan search & filter
- Create / Edit / Delete JSA
- Copy existing JSA sebagai template
- Public link — bagikan JSA via URL `/jsa`
- Print PDF — `/print/jsa/[id]`
- Preview print sebelum cetak

**JSA Steps:**
- Step description (urutan kerja)
- Potential hazard (bahaya potensial)
- Possible consequence (akibat)
- Risk control (pengendalian)
- Dynamic step management (tambah/hapus/urutkan)

**Settings:**
- Konfigurasi default JSA
- Custom fields

---

## Slide 11 — Permit to Work (Izin Kerja PTW)

```
╔══════════════════════════════════════════════════════════╗
║              IZIN KERJA — PERMIT TO WORK                  ║
║    Hot Work — Gas Test — Isolation — APD Tracking        ║
╚══════════════════════════════════════════════════════════╝
```

**Status Workflow:**
```
Draft → Pending Approval → Approved → Active → Closed
                                                    → Rejected
```

**Fitur:**

**Permit Details:**
- Jenis pekerjaan (hot work, cold work, confined space, dll)
- Lokasi & area kerja
- Periode validity (start - end)
- Risk level: Low / Medium / High / Critical
- Referensi HIRADC source

**Safety Requirements:**
- Gas test results
- Isolation (LOTO) checklist
- APD requirements
- Fire prevention measures

**Approval & Tracking:**
- Multi-level approval workflow
- Status tracking dashboard
- Download / print permit
- Upload supporting documents

---

## Slide 12 — Incident Report & Corrective Action

```
╔══════════════════════════════════════════════════════════╗
║         INCIDENT REPORT + CORRECTIVE ACTION               ║
║    RCA — Investigation — Follow-up — Close-out           ║
╚══════════════════════════════════════════════════════════╝
```

**Incident Records (Dashboard Web):**
- Klasifikasi: Near miss, Property damage, First aid, Recordable, Incident
- Root Cause Analysis (RCA) — 5 Why / Fishbone
- Severity: Low / Medium / High / Critical
- Investigasi assignment
- Status: open → investigating → closed
- Unit number & impact tracking

**Corrective Actions:**
- Source-linked (dari incident atau observation)
- Priority level
- Due date & assigned PIC
- Evidence upload untuk close-out
- Delete action (mobile)

**Mobile Access:**
- Daftar insiden di lapangan
- Submit corrective action dari mobile
- Follow-up & verification

---

## Slide 13 — Observations & Emergency (Mobile-First)

```
╔══════════════════════════════════════════════════════════╗
║    OBSERVASI & EMERGENCY — MOBILE-FIRST REPORTING        ║
║    GPS — Camera — Offline Draft — Push Alert             ║
╚══════════════════════════════════════════════════════════╝
```

**Observation (Unsafe Act / Unsafe Condition):**
- Kategori: Unsafe condition, Unsafe act, Housekeeping, PPE, Observation
- Lokasi otomatis via GPS
- Foto dari kamera HP
- Notes & severity
- **Offline mode**: draft disimpan di local storage
- **Background sync**: upload otomatis saat online
- Status workflow: open → action_taken → closed

**Emergency Incident:**
- Report langsung dari lapangan
- GPS koordinat
- Foto kejadian
- **Push Notification**: alert otomatis ke supervisor & HSE team
- Emergency broadcast via PWA
- Offline draft support

**Fitur Unggulan:**
- `HSE_OBSERVATION_DRAFT_STORAGE_KEY` — offline draft
- `HSE_EMERGENCY_DRAFT_STORAGE_KEY` — emergency draft
- Sync API: `POST /api/mobile/sync/hse`
- Sync API: `POST /api/mobile/sync/emergency`
- File queue untuk upload foto saat online

---

## Slide 14 — HSE Inventory (Inventaris APD & Equipment)

```
╔══════════════════════════════════════════════════════════╗
║              HSE INVENTORY MANAGEMENT                     ║
║    APD — Safety Equipment — Expiry Tracking              ║
╚══════════════════════════════════════════════════════════╝
```

**Fitur:**

**Asset Management:**
- Daftar inventaris APD (helm, sepatu, harness, dll)
- Safety equipment (fire extinguisher, eye wash, dll)
- Kategori & tipe aset
- Quantity & location tracking

**Expiry & Reminder:**
- Tanggal kadaluarsa per item
- **Auto email reminder**: notifikasi sebelum expired
- Status: Good / Expiring Soon / Expired
- `runHseInventoryReminderCheck()` — scheduler

**Mobile Access:**
- Scan & update inventory dari lapangan
- Check stock real-time
- Request peminjaman/pengembalian

---

## Slide 15 — Digital Checklists

```
╔══════════════════════════════════════════════════════════╗
║              DIGITAL CHECKLIST SYSTEM                     ║
║    Template Builder — Daily Run — Scoring — Report       ║
╚══════════════════════════════════════════════════════════╝
```

**Template Builder:**
- Buat template checklist dengan drag & drop
- Revision control (versioned templates)
- Items: pertanyaan, tipe jawaban (yes/no/range/text)
- Kategori & area assignment

**Daily Checklist Execution:**
- Assign jadwal harian
- Run dialog — isi checklist di web atau mobile
- Scoring otomatis
- **Report PDF** — hasil checklist harian
- Audit log

**Mobile Checklist:**
- Jalankan checklist di lapangan via HP
- Evidence foto per item
- TTD digital
- Offline support

---

## Slide 16 — SIA/SIO & Tools Certification

```
╔══════════════════════════════════════════════════════════╗
║         SIA/SIO & TOOLS CERTIFICATION                    ║
║    Sertifikasi Operator — Alat — Expiry Reminder         ║
╚══════════════════════════════════════════════════════════╝
```

**Fitur:**

**Certification Tracking:**
- SIA (Surat Ijin Alat) — sertifikat kelayakan alat
- SIO (Surat Ijin Operator) — kompetensi operator
- Tools certification — kalibrasi & inspeksi alat
- No. sertifikat, penerbit, masa berlaku

**Management:**
- Upload dokumen sertifikat
- Status: Active / Expiring Soon / Expired
- Pencarian & filter
- Notifikasi kadaluarsa

**Mobile Access:**
- Cek status sertifikasi di lapangan
- Foto dokumen sertifikat
- Verifikasi operator sebelum pekerjaan

---

## Slide 17 — Safety Induction

```
╔══════════════════════════════════════════════════════════╗
║                  SAFETY INDUCTION                         ║
║    Visitor & Contractor Safety Sign-off                  ║
╚══════════════════════════════════════════════════════════╝
```

**Fitur:**
- Induction untuk visitor & contractor
- Tanda tangan digital
- Riwayat induksi per individu
- Masa berlaku induksi
- Checklist materi safety yang disampaikan
- Integrasi dengan gate access / security
- Mobile induction di lapangan

---

## Slide 18 — Push Notification & Alerts

```
╔══════════════════════════════════════════════════════════╗
║              PUSH NOTIFICATION — HSE ALERTS               ║
║    Emergency Broadcast — PWA Push — Real-time Alert      ║
╚══════════════════════════════════════════════════════════╝
```

**Channel: `hse_alerts`**

**Fitur:**
- Notifikasi push saat emergency incident dilaporkan
- Broadcast ke seluruh HSE team & management
- Configurable per user: `hseAlertsEnabled` di profil employee
- PWA push notification — tetap terima walau tidak di browser
- Test notification via `POST /api/push/test`

**Integration:**
- Employee table: `hrEmployees.hseAlertsEnabled`
- Notification channel: `lib/push-notifications.ts`
- SMS gateway (opsional)

---

## Slide 19 — Database Schema Overview

### 25+ Tabel HSE (Drizzle ORM — Supabase/PostgreSQL)

| Grup | Tabel | Fungsi |
|------|-------|--------|
| **Observations** | `hero_hse_observations` | Temuan unsafe act/condition |
| **Incidents** | `hero_hse_incidents` | Insiden + GPS + foto + alert |
| **Incident Records** | `hero_hse_incident_records` | RCA & investigasi |
| **Corrective Actions** | `hero_hse_corrective_actions` | Tindak lanjut terstruktur |
| **PTW** | `hero_hse_ptw_permits` | Permit to Work |
| **Inventory** | `hero_hse_inventories` | APD & equipment |
| **HIRADC** | `hero_hiradc_registers`, `hero_hiradc_entries`, `hero_hiradc_imports` | Risk register |
| **JSA** | `hero_jsas`, `hero_jsa_steps`, `hero_jsa_settings` | Job Safety Analysis |
| **Checklist** | `hero_checklist_templates`, `hero_daily_checklists`, `hero_daily_checklist_answers`, dll | Digital checklist |
| **Safety Dashboard** | `hero_safety_*` (8 tabel) | KPI, metrics, certifications |
| **Safety Inspections** | `hero_safety_inspections` | Inspeksi K3 |
| **Induction** | `hero_safety_inductions` | Safety induction |
| **Certifications** | `hero_safety_certifications` | SIA/SIO & tools |

---

## Slide 20 — Master Categories (Dropdown Options)

| Kategori | Opsi |
|----------|------|
| **hse_observation_category** | Unsafe condition, Unsafe act, Housekeeping, PPE, Observation |
| **hse_incident_type** | Near miss, Property damage, First aid, Recordable incident, Incident |
| **hse_severity** | Low, Medium, High, Critical |
| **hse_observation_status** | open, action_taken, closed |
| **hse_incident_status** | open, investigating, closed |

---

## Slide 21 — Role & Organization

```
╔══════════════════════════════════════════════════════════╗
║           ORGANIZATION STRUCTURE — HSE TEAM               ║
╚══════════════════════════════════════════════════════════╝
```

**Department:**
- `DEPT_QHSE` → Quality, Health, Safety & Environment
  - `SEC_HSE` → HSE Section

**Chitra Site Org:**
- Department: HC
  - Subdivision: **HSE**
    - 10+ HSE staff:
      - HSE Coordinator
      - HSE Supervisor
      - Safety Officer (multiple)
      - Environment Officer
      - HSE Admin
      - Fire Protection Specialist
      - First Aider
      - Contractor Safety Coordinator

**Permission:**
- Setiap menu HSE dilindungi oleh `resourceCode`
- Role-based access via `lib/hero-access.ts`
- Menu dikelompokkan dalam section "HSE" di navigasi admin

---

## Slide 22 — API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/api/mobile/sync/hse` | Sinkron observasi offline |
| POST | `/api/mobile/sync/emergency` | Sinkron emergency offline |
| GET | `/api/safety/attachment/*` | Serve lampiran safety |
| POST | `/api/push/test` | Test push notifikasi (termasuk hse_alerts) |

---

## Slide 23 — Print / Export Features

| Fitur | Route | Format |
|-------|-------|--------|
| Print JSA | `/print/jsa/[id]` | PDF |
| Print HIRADC Register | `/print/hiradc/[id]` | PDF |
| Print HIRADC Entry | `/print/hiradc-entry/[id]` | PDF |
| Checklist Report | Internal dialog | PDF |
| Safety Data Export | `/dashboard/safety/data` | CSV / Excel |
| JSA Public Link | `/jsa` | Web view |

---

## Slide 24 — Key Technical Highlights

### Offline-First Mobile Architecture

```
┌────────────┐     ┌──────────────┐     ┌──────────┐
│ Mobile App │────▶│ Offline Draft │────▶│ API Sync │
│ (PWA)      │     │ (localStorage)│     │ (on conn)│
└────────────┘     └──────────────┘     └──────────┘
```

- Draft disimpan di `localStorage` saat offline
- Queue file (foto) di-upload saat koneksi kembali
- Background sync tanpa loading screen
- Resilient terhadap jaringan lapangan yang tidak stabil

### Integrasi & Ekstensibilitas
- PWA Ready — install sebagai app di HP
- Push notification — emergency broadcast
- Print PDF — laporan siap cetak
- Email reminder — notifikasi expired inventory
- Role-based access — aman & terstruktur

---

## Slide 25 — Ringkasan (Summary)

```
╔══════════════════════════════════════════════════════════╗
║                    HSE MODULE SUMMARY                     ║
╚══════════════════════════════════════════════════════════╝
```

| Aspek | Jumlah |
|-------|--------|
| **Menu Dashboard Web** | 11 menu |
| **Menu Mobile** | 13 fitur |
| **Database Tables** | 25+ tabel |
| **Server Actions** | 11+ file action |
| **Components** | 28+ komponen |
| **API Routes** | 4 endpoints |
| **Print PDF Routes** | 3 routes |

**3 Pilar Utama:**
1. 🛡️ **Prevention** — HIRADC, JSA, Checklist, Inspections, PTW
2. 📋 **Monitoring** — Safety Dashboard, Observations, Inventory, Certifications
3. 🚨 **Response** — Incident Report, Emergency Alert, Corrective Action, RCA

---

## Slide 26 — Demo Suggestion / Next Steps

### Skenario Demo yang Disarankan

1. **End-to-End Incident**: Observasi (mobile) → Alert → Incident Report (web) → RCA → Corrective Action → Close-out
2. **Risk Assessment Flow**: HIRADC register → Risk entry → Control → JSA → PTW → Work execution
3. **Daily Operations**: Checklist template → Daily run → Scoring → Safety dashboard update
4. **Emergency Response**: Emergency report (offline) → Sync → Push notification → Investigation
5. **Inventory Lifecycle**: Add APD → Track expiry → Reminder email → Replacement

### Next Steps / Pengembangan

- [ ] Integrasi dengan CCTV / IoT sensors
- [ ] Automated risk matrix heatmap
- [ ] Safety meeting & toolbox talk module
- [ ] Contractor management portal
- [ ] Advanced analytics & AI risk prediction
- [ ] Wearable device integration (smart helmet, smartwatch)
- [ ] Regulatory compliance reporting (Otlook, Kemnaker)

---

> **Dokumen ini disusun untuk keperluan presentasi.**
> Platform Hero — HSE Module v1.0
> Next.js + Drizzle ORM + PostgreSQL + PWA
