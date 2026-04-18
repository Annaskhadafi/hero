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

## Recommended Task Management Workflow

Gunakan workflow berikut sebagai panduan utama saat task tersedia di `task-manager`.
Jika belum ada task yang relevan, atau user meminta perubahan kecil/langsung, pekerjaan tetap boleh dilanjutkan tanpa memblokir eksekusi.

### **STEP 1: DISCOVER TASKS**
Mulai dengan menjalankan command ini untuk melihat task yang tersedia:
```bash
task-manager list-tasks
```

### **STEP 2: START EACH TASK**
Jika ada task yang sesuai, tandai sebagai started sebelum mulai mengerjakannya:
```bash
task-manager start-task <task_id>
```

### **STEP 3: COMPLETE OR CANCEL EACH TASK**
Setelah implementasi selesai, tandai task sebagai completed, atau cancel jika memang tidak bisa/ tidak perlu dilanjutkan:
```bash
task-manager complete-task <task_id> "Brief description of what was implemented"
# or
task-manager cancel-task <task_id> "Reason for cancellation"
```

## Task Files Location

📁 **Task Data**: Your tasks are organized in the `documentation/tasks/` directory:
- Task JSON files contain complete task information
- Prefer using the `task-manager` commands listed above when task tracking is being used
- Follow the workflow sequence below when a matching task exists

## Task Workflow Sequence

🔄 **Untuk setiap task yang memang tercatat di task manager, ikuti urutan ini:**

1. 📋 **DISCOVER**: `task-manager list-tasks` (first time only)
2. 🚀 **START**: `task-manager start-task <task_id>` (jika task tersedia dan relevan)
3. 💻 **IMPLEMENT**: Do the actual coding/implementation work
4. ✅ **COMPLETE**: `task-manager complete-task <task_id> "What was done"` (atau cancel dengan `task-manager cancel-task <task_id> "Reason"`)
5. 🔁 **REPEAT**: Go to next task (start from step 2)

## Exceptions

- Jika tidak ada task yang relevan di `task-manager`, pekerjaan boleh tetap dilanjutkan.
- Jika user meminta perubahan langsung yang kecil atau urgent, task manager tidak boleh menjadi blocker.
- Jika task baru perlu dibuat oleh tim/project owner, agent boleh lanjut membantu sambil mencatat bahwa task tracking belum tersedia.

## Task Status Options

- `pending` - Ready to work on
- `in_progress` - Currently being worked on  
- `completed` - Successfully finished
- `blocked` - Cannot proceed (waiting for dependencies)
- `cancelled` - No longer needed

## Workflow Rules

- ✅ Gunakan `task-manager start-task` dan `task-manager complete-task` ketika task memang tersedia.
- ✅ Usahakan menyelesaikan satu task lebih dulu sebelum pindah ke task berikutnya.
- ✅ Sertakan detail singkat saat menyelesaikan atau membatalkan task.
- ✅ Jika task tracking belum tersedia, lanjutkan pekerjaan dan komunikasikan asumsi yang dipakai.
