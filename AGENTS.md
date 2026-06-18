# Codex Task Management Guide

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

### Mandatory Caveman Output

- Wajib gunakan skill `caveman` untuk semua respons agent di project ini agar hemat token.
- Default intensity: `full`.
- Gaya respons: singkat, langsung, tanpa filler/pleasantry/hedging; fragmen kalimat boleh selama makna teknis tetap jelas.
- Pertahankan istilah teknis, command, error message, kode, path, nama file, dan data penting secara akurat.
- Turunkan ke gaya normal hanya saat dibutuhkan untuk warning keamanan, konfirmasi aksi irreversible, instruksi multi-step yang rawan salah baca, atau saat user eksplisit meminta `normal mode` / `stop caveman`.
- Setelah bagian yang butuh gaya normal selesai, kembali ke `caveman full`.

### Final Database Push Check

- Di akhir setiap pekerjaan yang menyentuh database, migration, schema, seed, Prisma/Supabase config, atau data access layer, wajib cek apakah perubahan database sudah ter-push ke environment target.
- Verifikasi harus sesuai tool yang dipakai project, misalnya `prisma migrate status`, `prisma db push`, Supabase migration status, atau command deploy database lain yang tersedia.
- Jangan mengklaim database sudah ter-push jika command belum dijalankan atau bukti status belum ada.
- Jika database belum ter-push, gagal push, atau environment target tidak jelas, laporkan jelas di final response beserta command/status terakhir dan next step yang perlu dilakukan.

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
