# Codex Task Management Guide

## Documentation Available

📚 **Project Documentation**: Check the documentation files in this directory for project-specific setup instructions and guides.
**Project Tasks**: Check the tasks directory in documentation/tasks for the list of tasks to be completed. Use the CLI commands below to interact with them.

### Auto-load Design Guide

- Saat memulai thread/session baru, selalu baca `documentation/Design.md` secara otomatis bersamaan dengan `AGENTS.md`.
- Semua implementasi UI (layout, table, form, action bar, visual hierarchy) wajib mengikuti `documentation/Design.md` tanpa menunggu user memanggil manual.
- Jika ada konflik antara request user dan `documentation/Design.md`, prioritaskan request user lalu update `documentation/Design.md` agar sinkron.

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

