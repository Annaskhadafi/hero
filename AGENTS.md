# Agent Execution & Workflow Guide

## Core Modes & Phase Separation

### 1. Communication & Planning Mode (Caveman Full)
- **Fase:** Eksplorasi, investigasi, task breakdown, dan interaksi percakapan.
- **Aturan:** Respons super ringkas, padat, tanpa filler/pleasantry.
- **Kecualian:** Saat membuat dokumen formal (ADR, Spec, GitHub Issue bodies), gunakan format Markdown standar yang lengkap dan presisi.

### 2. Engineering Architecture & Workflow (Matt Pocock Skills)
- **Fase:** Manajemen tiket, domain modeling, ADR, dan wayfinding.
- **Issue Tracker:** GitHub issues (`gh` CLI). Baca `docs/agents/issue-tracker.md`.
- **Domain Docs:** Single-context repo (`CONTEXT.md` & `docs/adr/`). Baca `docs/agents/domain.md`.
- **Glossary First:** Gunakan terminologi dari `CONTEXT.md` untuk semua nama issue, tipe data, dan fungsi.

### 3. Code Implementation Mode (Ponytail Full)
- **Fase:** Penulisan kode, edit file, dan refactoring.
- **Decision Ladder:** YAGNI → stdlib → native platform → installed dependency → one line → minimum viable.
- **Guardrails:** Jangan buat abstraksi prematur; tandai shortcut dengan komentar `ponytail: <upgrade-path>`; jangan pernah kompromi pada validasi security/RBAC dan data integrity.

### 4. Requirement Clarification & Feature Alignment (Grill-Me Mode)
- **Kondisi:** Setiap kali ada fitur baru yang spesifikasinya kurang jelas, ambigu, atau memiliki banyak percabangan keputusan desain/flow.
- **Aturan:** WAJIB gunakan mode interview `/grill-me` (tanya detail, bongkar asumsi, kunci requirements) sebelum eksekusi coding.
- **Output:** Dokumen planning/spec yang matang, komprehensif, dan presisi ("gacor") sebelum mulai penulisan kode.

### 5. Multi-Agent & Teamwork Delegation (Teamwork & Sub-agents)
- **Kondisi:** Setiap kali scope planning besar, memiliki banyak task/komponen paralel, riset mendalam, atau refactoring berskala luas.
- **Aturan:** SELALU gunakan delegasi **Sub-agent** dan manfaatkan workflow `/teamwork-preview` agar eksekusi lebih cepat, fokus, terarah, dan paralel tanpa membebani konteks utama.
- **Eksekusi:** Breakdown task menjadi modul-modul independen, delegasikan ke sub-agent (research/self/teamwork), dan verifikasi hasil secara objektif.

### Ponytail (YAGNI Minimalism) — Auto-load

- Setiap session baru, baca otomatis `D:\[01] PROJECT\ponytail\AGENTS.md` sebagai aturan YAGNI/minimalism.
- Terapkan decision ladder sebelum tulis kode: YAGNI → stdlib → native platform → installed dependency → one line → minimum viable.
- Tandai setiap shortcut dengan komentar `ponytail:` + nama upgrade path.
- Trust-boundary validation, data-loss handling, security, accessibility — jangan pernah skip.

## Documentation Available

📚 **Project Documentation**: Check the documentation files in this directory for project-specific setup instructions and guides.
**Project Tasks**: Check the tasks directory in documentation/tasks for the list of tasks to be completed. Use the CLI commands below to interact with them.

### Auto-load Design Guide

- Saat memulai thread/session baru, selalu baca `documentation/Design.md` secara otomatis bersamaan dengan `AGENTS.md`.
- Semua implementasi UI (layout, table, form, action bar, visual hierarchy) wajib mengikuti `documentation/Design.md` tanpa menunggu user memanggil manual.
- Jika ada konflik antara request user dan `documentation/Design.md`, prioritaskan request user lalu update `documentation/Design.md` agar sinkron.

### Memory Management

- Gunakan skill `memory-manager` untuk mengelola konteks project saat session baru dimulai.
- File memori yang tersedia: `CLAUDE.md` (mandatory), `MEMORY.md` (opsional), `.memory/` (opsional).
- Saat memulai session, muat semua file memori yang ada untuk konteks lengkap.
- Update file memori setelah perubahan signifikan dengan timestamp.
- Kompres file memori jika total token melebihi 4000 (gunakan skill `compress`).

### Final Database Push Check

- Di akhir setiap pekerjaan yang menyentuh database, migration, schema, seed, Prisma/Supabase config, atau data access layer, wajib cek apakah perubahan database sudah ter-push ke environment target.
- Verifikasi harus sesuai tool yang dipakai project, misalnya `prisma migrate status`, `prisma db push`, Supabase migration status, atau command deploy database lain yang tersedia.
- Jangan mengklaim database sudah ter-push jika command belum dijalankan atau bukti status belum ada.
- Jika database belum ter-push, gagal push, atau environment target tidak jelas, laporkan jelas di final response beserta command/status terakhir dan next step yang perlu dilakukan.

### User Management as Single Source of Truth

- **`hero_employees` (User Management)** adalah SATU-SATUNYA sumber data karyawan untuk seluruh sistem.
- Dilarang menggunakan `hero_hr_employees` (tabel import staging) untuk query data karyawan di runtime code (actions, pages, API routes, lib helpers).
- Jika menulis kode baru yang butuh data karyawan, WAJIB query dari `hero_employees` dan join ke `hero_master_departments`, `hero_master_sections`, `hero_sites`.
- Kolom mapping jika referensi schema lama diperlukan:
  - `employeeId` → `employee_sn`
  - `fullName` → `name`
  - `contractStart` → `contract_duration_start`
  - `contractEnd` → `contract_duration_end`
  - `accountStatus` → `employment_status`
  - `workLocationId` → tidak ada di hero_employees, gunakan null
- Tabel `hero_hr_employees` HANYA boleh dipakai untuk: migration scripts, data import tools, dan audit scripts — bukan runtime application code.

### Next.js Root Layout Guard

- Jika menyentuh `app/layout.tsx`, `RootLayout`, atau document shell Next.js, wajib pertahankan struktur root valid: `<html>` hanya membungkus `<body>` (dan metadata/head yang dikelola Next), jangan menaruh `<Script>` / `<script>` langsung sebagai child dari `<html>`.
- Jangan membuat nested `<script>` atau inject script wrapper tambahan di dalam `<html>`.
- Untuk script pre-hydration / anti-extension / DOM cleanup di root layout, gunakan root `<head>` atau inline `<script dangerouslySetInnerHTML>` di `<head>`; jangan pakai `next/script strategy="beforeInteractive"` sebagai sibling `<body>` di bawah `<html>`.
- Setelah mengubah layout/root shell, wajib cek ulang agar tidak muncul error hydration/console seperti `<html> cannot contain a nested <script>` atau `Cannot render a sync or defer <script> outside the main document without knowing its order`.

### Git Commit & Push Guard

- Dilarang melakukan `git commit` dan `git push` tanpa perintah eksplisit dari user.
- Selalu minta konfirmasi sebelum setiap `git commit` atau `git push`, meskipun user pernah menyetujui di sesi/percakapan sebelumnya.
- Operasi git read-only seperti `git status`, `git diff`, `git log`, `git branch` boleh dilakukan tanpa konfirmasi.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## code-review-graph

This project also uses `code-review-graph` for token-efficient codebase navigation, change impact analysis, and safer reviews.

Rules:
- Before broad repo reading, initialize or refresh the graph with `build_or_update_graph_tool` for this repo root.
- For architecture, dependency, hotspot, impact, or review questions, prefer `code-review-graph` tools before raw file reads: `get_minimal_context_tool`, `semantic_search_nodes_tool`, `query_graph_tool`, `traverse_graph_tool`, `get_impact_radius_tool`, and `detect_changes_tool`.
- Start with `get_minimal_context_tool` for compact orientation, then drill into specific files/functions only when needed.
- Use `query_graph_tool` for callers/callees/importers/tests, `traverse_graph_tool` for local neighborhoods, and `get_impact_radius_tool` / `detect_changes_tool` for changed-code risk.
- After modifying code files, run `build_or_update_graph_tool` incrementally so future answers use current graph data.
- Prefer graph summaries and targeted snippets over opening many raw files; only fall back to `rg`/manual reads when graph output is missing, stale, or ambiguous.
- If graph stats look suspicious, verify with `list_graph_stats_tool` before relying on results.

### Approval, Reminder & Notification Standards

- **Integrasi Approval**: Semua fitur, transaksi, dan form baru (Daily Activity, Overtime, Leave/Permission, Daily Report, dll.) wajib terintegrasi dengan system Approval Engine secara terpusat, menggunakan dynamic routing resolver (`resolveApprovalRouteForActivity`), dan tampil di halaman Inbox Approval (`/dashboard/approval`).
- **Reminder & Email Delivery**: Sistem pengiriman reminder (`reminderJobs`) wajib terintegrasi dengan log pencatatan status pengiriman di halaman Email Delivery (`notificationEvents` & `notificationDeliveries`).
- **Notification Bell**: Semua fitur transaksi dan update status approval wajib terhubung secara dinamis dengan header notification bell, membaca event notifikasi aktif secara real-time dari database untuk user yang sedang login.
- **Email Settings Terpusat**: Jika fitur baru membutuhkan email notifikasi, jangan buat alur email terpisah atau hardcoded. Wajib integrasikan ke `Settings > Email` sebagai sistem terpusat: SMTP aktif, template code unik, template DB seed, preset registry, preview/edit admin, dan delivery logging harus ikut pola yang sudah ada.
- **Recipient Policy Seragam**: Setiap domain fitur baru yang punya email wajib punya strategi penerima yang konsisten. Jika penerimanya lintas-role atau bisa berubah, buat recipient settings/config terpusat seperti pola HSE Safety / Human Capital; hindari hardcoded recipient di action kecuali fallback sementara yang jelas.
- **Runtime Override Template**: Semua sender email fitur baru harus membaca template override dari registry/template settings pusat saat `templateCode` tersedia, lalu fallback ke subject/html/text bawaan hanya jika template DB belum ada. Tujuannya agar admin bisa ubah isi email tanpa ubah kode.
- **Seed, Preset, dan UAT Minimum**: Saat menambah email fitur baru, wajib sekalian tambah `templateCode` ke seed DB, preset/registry, metadata placeholder/sample values, dan source-test/smoke-test ringan agar flow baru langsung terlihat di admin dan tidak jadi template mati.

#### Checklist fitur baru yang punya email

- Tentukan domain fitur: apakah ikut policy domain yang sudah ada (`HSE Safety`, `Human Capital`, dll.) atau butuh domain recipient config baru.
- Tentukan `templateCode` yang unik, stabil, dan deskriptif sejak awal. Jangan ganti-ganti code setelah dipakai runtime kecuali ada migrasi jelas.
- Hubungkan sender runtime ke helper/pola terpusat agar subject/body membaca override template pusat lebih dulu, baru fallback bawaan.
- Pastikan email terkirim lewat jalur SMTP aktif + delivery logging, bukan helper ad-hoc yang bypass pencatatan.
- Jika domain penerima bisa berubah dari admin, tambahkan settings panel/action/getter config terpusat; jangan simpan list email tetap di action utama.
- Tambahkan seed DB untuk template baru, lalu tambah preset registry agar template langsung muncul di admin meski DB belum diubah manual.
- Tambahkan metadata placeholder dan sample values yang realistis agar preview admin langsung berguna.
- Tambahkan source-test atau smoke-test minimum untuk memastikan wiring sender, seed, preset, dan settings panel benar-benar terhubung.
- Jika fitur juga punya approval/reminder/notification bell, selesaikan seluruh integrasi itu dalam satu flow implementasi, jangan setengah terpisah.

#### Mapping file minimum

- Runtime sender / server action:
  update file action domain terkait di `app/actions/*` atau `app/dashboard/**/actions.ts`
- Transport + template override:
  ikuti helper terpusat di `lib/workflow-email.ts` dan helper domain seperti `lib/hse-safety-email.ts` / `lib/human-capital-email.ts`
- Recipient config domain:
  tambahkan schema/getter/seed di `db/schema/hero.ts` dan `lib/hero-admin.ts`
- Admin settings:
  tambahkan server action di `app/dashboard/settings/email/actions.ts`
  tambahkan panel/tab di `app/dashboard/settings/email/page.tsx`
  tambahkan panel UI di `components/*notification-settings-panel.tsx`
- Template registry:
  tambahkan preset + placeholder sample di `lib/email-template-presets.ts`
- Seed DB:
  tambahkan `templateCode` di `lib/hero-admin.ts`
- Verification:
  tambahkan source-test di `tests/*.test.mjs` atau test ringan lain yang sesuai pola repo

#### Aturan implementasi cepat

- Jangan berhenti di “email sudah terkirim”.
- Selesai itu artinya:
  runtime sender ada,
  recipient policy jelas,
  admin bisa lihat/edit template,
  seed/preset tersedia,
  delivery tercatat,
  test minimum ada.

#### Contoh pola domain

- Fitur baru domain HSE:
  ikuti pola `lib/hse-safety-email.ts` + panel recipient HSE di settings email
- Fitur baru domain HC:
  ikuti pola `lib/human-capital-email.ts` + policy CC/global recipient HC
- Fitur domain baru:
  buat helper domain sendiri dengan pola serupa, lalu expose recipient settings di `Settings > Email`

### Standar flow fitur baru

- Jika menambah fitur/transaksi/form baru, jangan implement hanya CRUD utama. Evaluasi dan selesaikan satu paket flow pendukung yang relevan:
  approval,
  reminder,
  notification bell,
  email,
  delivery log,
  dan admin settings jika penerima/template perlu dikelola.
- Jangan anggap fitur selesai kalau baru simpan data. Selesai artinya seluruh lifecycle operasional fitur sudah dipikirkan:
  submit,
  review/approval,
  status update,
  reminder,
  notifikasi real-time,
  email delivery,
  audit/log,
  dan visibilitas admin.

#### Checklist fitur baru secara umum

- Tentukan apakah fitur masuk approval flow. Jika ya, wajib integrasi ke Approval Engine terpusat dan tampil di Inbox Approval.
- Tentukan event penting yang perlu reminder otomatis. Jika ada SLA, deadline, atau pending action, hubungkan ke `reminderJobs` + log delivery.
- Tentukan event yang harus muncul di notification bell. Update status approval/transaksi tidak boleh diam di database saja.
- Tentukan apakah event yang sama juga perlu email. Jika ya, ikuti seluruh standar `Email Settings Terpusat`.
- Tentukan siapa penerima setiap channel:
  approver,
  requester,
  HC,
  HSE,
  manager,
  atau domain baru dengan recipient config terpusat.
- Tentukan event log/audit minimum agar admin bisa melacak:
  kapan event dibuat,
  ke siapa dikirim,
  status sukses/gagal,
  dan template/channel yang dipakai.
- Jangan pecah implementasi channel-channel ini tanpa alasan kuat. Untuk fitur baru, lebih aman kirim satu perubahan yang menyelesaikan seluruh flow terkait.

#### Mapping implementasi multi-channel

- Approval:
  gunakan resolver/engine approval terpusat dan pastikan route inbox approval ikut membaca entitas baru
- Reminder:
  sambungkan event pending/SLA ke `reminderJobs` dan log ke `notificationEvents` / `notificationDeliveries` bila relevan
- Notification bell:
  publish event aktif yang bisa dibaca header notification bell secara real-time untuk user login
- Email:
  ikuti helper runtime override + recipient policy + seed/preset/settings admin
- Admin settings:
  jika channel/penerima/template butuh dikelola, expose di halaman settings terpusat, jangan buat config tersembunyi di action
- Verification:
  minimal ada source-test/smoke-test yang membuktikan entitas baru sudah terhubung ke flow approval/reminder/bell/email yang diwajibkan

#### Done criteria fitur baru

- Data utama tersimpan benar
- Approval flow terhubung bila fitur butuh approval
- Reminder flow terhubung bila fitur punya pending/SLA/deadline

### Final Database Push Check

- Di akhir setiap pekerjaan yang menyentuh database, migration, schema, seed, Prisma/Supabase config, atau data access layer, wajib cek apakah perubahan database sudah ter-push ke environment target.
- Verifikasi harus sesuai tool yang dipakai project, misalnya `prisma migrate status`, `prisma db push`, Supabase migration status, atau command deploy database lain yang tersedia.
- Jangan mengklaim database sudah ter-push jika command belum dijalankan atau bukti status belum ada.
- Jika database belum ter-push, gagal push, atau environment target tidak jelas, laporkan jelas di final response beserta command/status terakhir dan next step yang perlu dilakukan.

### User Management as Single Source of Truth

- **`hero_employees` (User Management)** adalah SATU-SATUNYA sumber data karyawan untuk seluruh sistem.
- Dilarang menggunakan `hero_hr_employees` (tabel import staging) untuk query data karyawan di runtime code (actions, pages, API routes, lib helpers).
- Jika menulis kode baru yang butuh data karyawan, WAJIB query dari `hero_employees` dan join ke `hero_master_departments`, `hero_master_sections`, `hero_sites`.
- Kolom mapping jika referensi schema lama diperlukan:
  - `employeeId` → `employee_sn`
  - `fullName` → `name`
  - `contractStart` → `contract_duration_start`
  - `contractEnd` → `contract_duration_end`
  - `accountStatus` → `employment_status`
  - `workLocationId` → tidak ada di hero_employees, gunakan null
- Tabel `hero_hr_employees` HANYA boleh dipakai untuk: migration scripts, data import tools, dan audit scripts — bukan runtime application code.

### Next.js Root Layout Guard

- Jika menyentuh `app/layout.tsx`, `RootLayout`, atau document shell Next.js, wajib pertahankan struktur root valid: `<html>` hanya membungkus `<body>` (dan metadata/head yang dikelola Next), jangan menaruh `<Script>` / `<script>` langsung sebagai child dari `<html>`.
- Jangan membuat nested `<script>` atau inject script wrapper tambahan di dalam `<html>`.
- Untuk script pre-hydration / anti-extension / DOM cleanup di root layout, gunakan root `<head>` atau inline `<script dangerouslySetInnerHTML>` di `<head>`; jangan pakai `next/script strategy="beforeInteractive"` sebagai sibling `<body>` di bawah `<html>`.
- Setelah mengubah layout/root shell, wajib cek ulang agar tidak muncul error hydration/console seperti `<html> cannot contain a nested <script>` atau `Cannot render a sync or defer <script> outside the main document without knowing its order`.

### Git Commit & Push Guard

- Dilarang melakukan `git commit` dan `git push` tanpa perintah eksplisit dari user.
- Selalu minta konfirmasi sebelum setiap `git commit` atau `git push`, meskipun user pernah menyetujui di sesi/percakapan sebelumnya.
- Operasi git read-only seperti `git status`, `git diff`, `git log`, `git branch` boleh dilakukan tanpa konfirmasi.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## code-review-graph

This project also uses `code-review-graph` for token-efficient codebase navigation, change impact analysis, and safer reviews.

Rules:
- Before broad repo reading, initialize or refresh the graph with `build_or_update_graph_tool` for this repo root.
- For architecture, dependency, hotspot, impact, or review questions, prefer `code-review-graph` tools before raw file reads: `get_minimal_context_tool`, `semantic_search_nodes_tool`, `query_graph_tool`, `traverse_graph_tool`, `get_impact_radius_tool`, and `detect_changes_tool`.
- Start with `get_minimal_context_tool` for compact orientation, then drill into specific files/functions only when needed.
- Use `query_graph_tool` for callers/callees/importers/tests, `traverse_graph_tool` for local neighborhoods, and `get_impact_radius_tool` / `detect_changes_tool` for changed-code risk.
- After modifying code files, run `build_or_update_graph_tool` incrementally so future answers use current graph data.
- Prefer graph summaries and targeted snippets over opening many raw files; only fall back to `rg`/manual reads when graph output is missing, stale, or ambiguous.
- If graph stats look suspicious, verify with `list_graph_stats_tool` before relying on results.

### Approval, Reminder & Notification Standards

- **Integrasi Approval**: Semua fitur, transaksi, dan form baru (Daily Activity, Overtime, Leave/Permission, Daily Report, dll.) wajib terintegrasi dengan system Approval Engine secara terpusat, menggunakan dynamic routing resolver (`resolveApprovalRouteForActivity`), dan tampil di halaman Inbox Approval (`/dashboard/approval`).
- **Reminder & Email Delivery**: Sistem pengiriman reminder (`reminderJobs`) wajib terintegrasi dengan log pencatatan status pengiriman di halaman Email Delivery (`notificationEvents` & `notificationDeliveries`).
- **Notification Bell**: Semua fitur transaksi dan update status approval wajib terhubung secara dinamis dengan header notification bell, membaca event notifikasi aktif secara real-time dari database untuk user yang sedang login.
- **Email Settings Terpusat**: Jika fitur baru membutuhkan email notifikasi, jangan buat alur email terpisah atau hardcoded. Wajib integrasikan ke `Settings > Email` sebagai sistem terpusat: SMTP aktif, template code unik, template DB seed, preset registry, preview/edit admin, dan delivery logging harus ikut pola yang sudah ada.
- **Recipient Policy Seragam**: Setiap domain fitur baru yang punya email wajib punya strategi penerima yang konsisten. Jika penerimanya lintas-role atau bisa berubah, buat recipient settings/config terpusat seperti pola HSE Safety / Human Capital; hindari hardcoded recipient di action kecuali fallback sementara yang jelas.
- **Runtime Override Template**: Semua sender email fitur baru harus membaca template override dari registry/template settings pusat saat `templateCode` tersedia, lalu fallback ke subject/html/text bawaan hanya jika template DB belum ada. Tujuannya agar admin bisa ubah isi email tanpa ubah kode.
- **Seed, Preset, dan UAT Minimum**: Saat menambah email fitur baru, wajib sekalian tambah `templateCode` ke seed DB, preset/registry, metadata placeholder/sample values, dan source-test/smoke-test ringan agar flow baru langsung terlihat di admin dan tidak jadi template mati.

#### Checklist fitur baru yang punya email

- Tentukan domain fitur: apakah ikut policy domain yang sudah ada (`HSE Safety`, `Human Capital`, dll.) atau butuh domain recipient config baru.
- Tentukan `templateCode` yang unik, stabil, dan deskriptif sejak awal. Jangan ganti-ganti code setelah dipakai runtime kecuali ada migrasi jelas.
- Hubungkan sender runtime ke helper/pola terpusat agar subject/body membaca override template pusat lebih dulu, baru fallback bawaan.
- Pastikan email terkirim lewat jalur SMTP aktif + delivery logging, bukan helper ad-hoc yang bypass pencatatan.
- Jika domain penerima bisa berubah dari admin, tambahkan settings panel/action/getter config terpusat; jangan simpan list email tetap di action utama.
- Tambahkan seed DB untuk template baru, lalu tambah preset registry agar template langsung muncul di admin meski DB belum diubah manual.
- Tambahkan metadata placeholder dan sample values yang realistis agar preview admin langsung berguna.
- Tambahkan source-test atau smoke-test minimum untuk memastikan wiring sender, seed, preset, dan settings panel benar-benar terhubung.
- Jika fitur juga punya approval/reminder/notification bell, selesaikan seluruh integrasi itu dalam satu flow implementasi, jangan setengah terpisah.

#### Mapping file minimum

- Runtime sender / server action:
  update file action domain terkait di `app/actions/*` atau `app/dashboard/**/actions.ts`
- Transport + template override:
  ikuti helper terpusat di `lib/workflow-email.ts` dan helper domain seperti `lib/hse-safety-email.ts` / `lib/human-capital-email.ts`
- Recipient config domain:
  tambahkan schema/getter/seed di `db/schema/hero.ts` dan `lib/hero-admin.ts`
- Admin settings:
  tambahkan server action di `app/dashboard/settings/email/actions.ts`
  tambahkan panel/tab di `app/dashboard/settings/email/page.tsx`
  tambahkan panel UI di `components/*notification-settings-panel.tsx`
- Template registry:
  tambahkan preset + placeholder sample di `lib/email-template-presets.ts`
- Seed DB:
  tambahkan `templateCode` di `lib/hero-admin.ts`
- Verification:
  tambahkan source-test di `tests/*.test.mjs` atau test ringan lain yang sesuai pola repo

#### Aturan implementasi cepat

- Jangan berhenti di “email sudah terkirim”.
- Selesai itu artinya:
  runtime sender ada,
  recipient policy jelas,
  admin bisa lihat/edit template,
  seed/preset tersedia,
  delivery tercatat,
  test minimum ada.

#### Contoh pola domain

- Fitur baru domain HSE:
  ikuti pola `lib/hse-safety-email.ts` + panel recipient HSE di settings email
- Fitur baru domain HC:
  ikuti pola `lib/human-capital-email.ts` + policy CC/global recipient HC
- Fitur domain baru:
  buat helper domain sendiri dengan pola serupa, lalu expose recipient settings di `Settings > Email`

### Standar flow fitur baru

- Jika menambah fitur/transaksi/form baru, jangan implement hanya CRUD utama. Evaluasi dan selesaikan satu paket flow pendukung yang relevan:
  approval,
  reminder,
  notification bell,
  email,
  delivery log,
  dan admin settings jika penerima/template perlu dikelola.
- Jangan anggap fitur selesai kalau baru simpan data. Selesai artinya seluruh lifecycle operasional fitur sudah dipikirkan:
  submit,
  review/approval,
  status update,
  reminder,
  notifikasi real-time,
  email delivery,
  audit/log,
  dan visibilitas admin.

#### Checklist fitur baru secara umum

- Tentukan apakah fitur masuk approval flow. Jika ya, wajib integrasi ke Approval Engine terpusat dan tampil di Inbox Approval.
- Tentukan event penting yang perlu reminder otomatis. Jika ada SLA, deadline, atau pending action, hubungkan ke `reminderJobs` + log delivery.
- Tentukan event yang harus muncul di notification bell. Update status approval/transaksi tidak boleh diam di database saja.
- Tentukan apakah event yang sama juga perlu email. Jika ya, ikuti seluruh standar `Email Settings Terpusat`.
- Tentukan siapa penerima setiap channel:
  approver,
  requester,
  HC,
  HSE,
  manager,
  atau domain baru dengan recipient config terpusat.
- Tentukan event log/audit minimum agar admin bisa melacak:
  kapan event dibuat,
  ke siapa dikirim,
  status sukses/gagal,
  dan template/channel yang dipakai.
- Jangan pecah implementasi channel-channel ini tanpa alasan kuat. Untuk fitur baru, lebih aman kirim satu perubahan yang menyelesaikan seluruh flow terkait.

#### Mapping implementasi multi-channel

- Approval:
  gunakan resolver/engine approval terpusat dan pastikan route inbox approval ikut membaca entitas baru
- Reminder:
  sambungkan event pending/SLA ke `reminderJobs` dan log ke `notificationEvents` / `notificationDeliveries` bila relevan
- Notification bell:
  publish event aktif yang bisa dibaca header notification bell secara real-time untuk user login
- Email:
  ikuti helper runtime override + recipient policy + seed/preset/settings admin
- Admin settings:
  jika channel/penerima/template butuh dikelola, expose di halaman settings terpusat, jangan buat config tersembunyi di action
- Verification:
  minimal ada source-test/smoke-test yang membuktikan entitas baru sudah terhubung ke flow approval/reminder/bell/email yang diwajibkan

#### Done criteria fitur baru

- Data utama tersimpan benar
- Approval flow terhubung bila fitur butuh approval
- Reminder flow terhubung bila fitur punya pending/SLA/deadline
- Notification bell menerima event status yang relevan
- Email runtime, recipient policy, template seed, preset registry, dan logging sudah aktif bila fitur butuh email
- Admin bisa mengelola setting penting tanpa edit kode
- Ada test minimum untuk wiring utama

#### Larangan implementasi parsial

- Jangan tambah fitur baru yang hanya:
  simpan data + toast sukses
- Jangan tambah approval baru tanpa inbox approval
- Jangan tambah reminder tanpa log delivery
- Jangan tambah email baru tanpa seed/preset/settings admin
- Jangan tambah notifikasi status tanpa integrasi notification bell

### Role Management & Granular RBAC Standards (Wajib)

- **Konsistensi UI Checklist RBAC**: Setiap halaman dashboard WAJIB terintegrasi dengan Role Management (`hero_role_menu_permissions` via `navbarMenuItems.resource`).
- **Server Component Loader**: Setiap `page.tsx` wajib memanggil `getCurrentMenuPermission(resource)` dari `@/lib/hero-access` dan meneruskan status permission (`canEdit`, `canDelete`, `canCreate`, `dataScope`) ke komponen client.
- **Dynamic Action Rendering**:
  - Tombol **Tambah/Create** atau modal tambah WAJIB dibungkus kondisi `{canEdit && ...}` (atau `{canCreate && ...}`).
  - Icon/tombol **Ubah/Edit** (pencil icon, dropdown edit, modal edit) WAJIB dibungkus kondisi `{canEdit && ...}`.
  - Icon/tombol **Hapus/Delete** (trash icon, bulk delete, confirm delete dialog) WAJIB dibungkus kondisi `{canDelete && ...}`.
  - Jika checklist Ubah atau Hapus di Role Management TIDAK dicentang, maka icon/tombol/teks tersebut **HARUS OTOMATIS HILANG** dari UI.
- **Data Scope Enforcement**: Jika `dataScope === 'own'` dan `canSelectAll` false, data query / tabel client WAJIB dibatasi hanya untuk data milik employee/user yang sedang login.
- **Server Action Protection**: Setiap Server Action yang melakukan operasi mutasi (insert, update, delete) WAJIB memvalidasi permission menggunakan `getAuthenticatedSession(resource, 'create' | 'edit' | 'delete')` atau `checkPermission`.

#### Canonical RBAC Enforcement Contract (Wajib untuk setiap perubahan)

Aturan di bawah ini adalah sumber kebenaran implementasi RBAC HERO. Jika aturan lama di bagian lain file ini lebih longgar, aturan canonical ini yang berlaku.

##### 1. Identity dan role resolution

- Runtime employee hanya boleh dicari dari session tervalidasi dan `hero_employees`, memakai `authUserId` atau email yang cocok secara exact/normalized.
- Jika session, employee, atau `accessRole` tidak ditemukan, hasilnya **unauthenticated/forbidden**. Jangan memilih akun hardcoded, employee aktif pertama, employee berdasarkan nama parsial, atau role default.
- Jangan pernah fallback ke `Super Admin` ketika mapping gagal. Fallback hanya boleh menghasilkan deny.
- `hero_hr_employees` tetap dilarang untuk runtime access; gunakan `hero_employees` dan join master department, section, dan site bila diperlukan.
- Hanya role canonical **`Super Admin`** yang boleh bypass matriks permission. Nama seperti `System Administrator`, `Administrator`, `HC Manager`, `Site Admin`, `Manager`, nama orang, substring `admin`, atau role khusus lain **tidak** boleh menjadi bypass.
- Resolver sidebar, page loader, server action, API, export, mobile, dan embedded page wajib memakai sumber role/permission yang sama. Jangan buat pemetaan nama/email khusus per caller.

##### 2. Permission lookup dan default deny

- Permission selalu dicari berdasarkan pasangan `(role, navbarMenuItems.resource)` yang dipakai route/action tersebut.
- Permission record yang hilang, resource tidak dikenal, role tidak dikenal, atau `dataScope` invalid berarti semua flag false dan akses ditolak.
- Jangan memberi akses bawaan berdasarkan nama role ketika `roleMenuPermissions` belum memiliki record.
- `canView`, `canEdit`, `canDelete`, dan `canSelectAll` adalah flag terpisah. `canDelete` atau `canSelectAll` tidak boleh menggantikan `canEdit`; `canEdit` tidak boleh menggantikan `canDelete`.
- Kontrak create yang belum memiliki flag terpisah memakai `canEdit`, dan harus diterapkan sama di UI serta server.
- `canSelectAll` tidak pernah mengubah `own`/`site` menjadi `global`. Scope dan aksi adalah dua keputusan berbeda.
- Permission seed harus idempotent: seed boleh membuat record yang belum ada, tetapi **dilarang meng-update record permission yang sudah ada** hanya untuk memaksa akses core menu atau mengembalikan checklist yang sudah dimatikan.

##### 3. Page, layout, direct URL, API, export

- Setiap `page.tsx` server component wajib memanggil `getCurrentMenuPermission(resource)` sebelum fetch data domain. Jika `canView` false, redirect/forbidden sebelum data dikirim ke client.
- Parent layout yang hanya memeriksa login atau status aktif tidak dianggap sebagai RBAC guard.
- Menyembunyikan menu/sidebar atau tombol client tidak cukup. Direct URL, nested route, detail ID, server action, route handler, API JSON, CSV/Excel export, PDF, refresh client, dan mobile endpoint wajib memeriksa permission sendiri.
- Jangan fetch seluruh dataset lalu menyembunyikan baris di client. Predicate scope harus diterapkan di query/server sebelum serialization.
- Detail berdasarkan ID harus memeriksa resource dan scope terhadap row yang dibaca; mengganti ID di URL tidak boleh membuka data orang lain.
- Semua `stats`, `count`, search, dropdown/reference, nested array, export, dan PDF harus memakai predicate scope yang sama dengan tabel utama.

##### 4. Definisi scope data

- **Own:** hanya row yang dimiliki karyawan login. Owner adalah employee pemilik/requester/PIC yang tersimpan pada row sesuai domain, bukan user/admin yang membuat atau mengubah row atas nama orang lain.
- **Site:** hanya row pada `hero_employees.siteId` utama karyawan login di User Management. `employeeSiteAssignments` aktif tidak memperluas scope Site kecuali ada aturan domain tertulis dan terpisah yang disetujui.
- **Global:** boleh lintas site, tetapi hanya untuk resource yang `canView`-nya aktif dan tetap tunduk pada `canEdit`/`canDelete` masing-masing.
- Jangan menerima `employeeId`, `siteId`, owner, atau scope dari FormData/query/body sebagai bukti otorisasi. Baca owner/site authoritative dari database lalu bandingkan dengan context session.
- Jika employee target tidak ditemukan, site utama tidak ada, atau context tidak valid, tolak akses. Jangan memilih site/employee pengganti.
- Untuk data historis, gunakan owner/site yang tersimpan pada transaksi bila tersedia. Jangan otomatis memakai site terkini karyawan tanpa aturan domain yang jelas.

##### 5. Data agregat dan operasi batch

- Data bersama/agregat per site yang tidak memiliki `employeeId`/owner tidak boleh diberikan ke Own. Own hanya boleh menerima potongan miliknya jika schema memang menyimpan owner; jika tidak, batasi ke Site/Global.
- Operasi save/finalize/replace snapshot yang memengaruhi seluruh site wajib memerlukan scope Site/Global. Own tidak boleh mengirim subset lalu menimpa atau menghapus data karyawan lain.
- Batch insert/update/delete wajib memvalidasi semua row/employee ID/site sebelum write. Jika satu item di luar scope, tolak seluruh batch dan jangan melakukan partial write.
- Gunakan transaksi untuk perubahan multi-row yang harus atomik. Validasi aksi (`canEdit`/`canDelete`) dan scope dilakukan server-side sebelum transaksi.

##### 6. Approval exception

- Own tetap boleh membaca pengajuan orang lain hanya jika row tersebut secara eksplisit ditugaskan kepada employee login sebagai approver melalui Inbox Approval.
- Exception ini terbatas pada row/step approval yang ditugaskan dan field minimum yang diperlukan untuk keputusan. Jangan membuka seluruh profil requester, dataset requester, atau data lintas site lain.
- Semua aksi approve/reject/delegate tetap memeriksa resource approval, status step, approver assignment, dan scope transaksi.

##### 7. Mutation, cache, dan invalidation

- Setiap mutation harus memakai resource yang tepat untuk menu/action tersebut; jangan memakai permission Overview sebagai pengganti permission Attendance, Payroll, Detail, atau submenu lain.
- UI boleh menyembunyikan action tanpa mengandalkan UI sebagai security boundary. Server action harus menolak request langsung dengan flag yang salah.
- Setelah role/permission berubah, cache sidebar, permission, page, dan session yang relevan harus di-revalidate/invalidate. Request berikutnya wajib membaca konfigurasi terbaru.
- Perubahan Role Management tidak boleh memberi caller jalur privilege escalation: izin mengelola user tidak otomatis memberi izin mengubah role/permission atau menetapkan Super Admin.

##### 9. Strict Enforcement: Tidak Ada Bypasses, Hardcoded Fallbacks, atau Hardcoded Filters

- **Dilarang Keras Hardcoded Fallback Actor:** Tidak boleh menggunakan fallback statis ke ID karyawan manapun (misal ID 5 atau karyawan aktif pertama). Jika session/context null, wajib tolak dengan `Unauthorized`.
- **Dilarang Keras Hardcoded Filter Departemen/Scope:** Halaman data umum (seperti Master Employee) dilarang memfilter secara hardcoded ke satu departemen saja (misal `e.departmentName === 'Central Services'`) tanpa alasan bisnis yang disetujui. Super Admin & role Global wajib dapat melihat seluruh departemen.
- **Wajib Guard di Setiap Page:** Setiap file `page.tsx` wajib memiliki blok penolakan dini sebelum me-render UI atau melakukan query berat:
  ```typescript
  const access = await getCurrentMenuPermission('<resource_name>')
  if (!access.canView) redirect('/dashboard')
  ```
- **Wajib Proteksi Mutasi:** Setiap server action mutasi (create/update/delete) wajib memeriksa session dan permission (`canEdit` atau `canDelete`) sebelum mengeksekusi operasi database.
- **Konsistensi Scope Data:** Setiap query yang menampilkan data transaksi wajib menyaring berdasarkan context session jika `dataScope` bukan global (`own` -> `employeeId`, `site` -> `siteId`).

##### 10. Regression check wajib

Untuk setiap perubahan RBAC, tambahkan atau jalankan smoke/regression check minimum yang membuktikan:

- permission hilang dan `canView=false` menolak direct URL, API, detail, export, dan action;
- Own hanya melihat/mengubah owner sendiri;
- Site hanya memakai `hero_employees.siteId` utama dan tidak membuka assignment tambahan;
- Global tetap gagal jika `canView` false;
- edit/delete mengikuti flag masing-masing;
- payload employee/site palsu ditolak server-side;
- seed/restart tidak menghidupkan kembali permission deny;
- development dan production memiliki hasil authorization yang sama;
- approval exception hanya membuka assignment yang ditujukan ke approver;
- perubahan tidak mengakses `hero_hr_employees` pada runtime.

Static token inventory (`page.tsx` memiliki atau tidak memiliki helper permission) hanya alat triage. Status aman harus dibuktikan dengan penelusuran route → loader/action → query → serialization dan, bila relevan, test runtime dengan fixture role/employee/site.

## Agent skills

### Issue tracker

GitHub issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context repo. See `docs/agents/domain.md`.
