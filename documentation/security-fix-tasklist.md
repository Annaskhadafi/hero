# Security Fix Tasklist

Last updated: 2026-06-26

## Tahap 1 - Tutup Upload Endpoint Tanpa Auth

- [x] `app/api/timesheet/upload/route.ts`: wajib session + role timesheet sebelum baca file, tulis file, parse Excel, dan insert DB.
- [x] `app/api/uploads/profile-photo/route.ts`: wajib session sebelum upload ke S3.
- [x] `app/api/uploads/[...path]/route.ts`: wajib session sebelum proxy file lokal/S3.
- [x] `app/actions/upload.ts`: wajib session untuk helper upload server action.
- [x] Verifikasi minimal: type-check atau lint scoped bila tersedia.

## Tahap 2 - Hardening File Handling

- [x] Sanitasi nama file timesheet upload agar tidak membawa separator/path karakter aneh.
- [x] Batasi generic upload proxy ke prefix eksplisit dan hapus fallback broad `upload/<filename>`.
- [x] Ubah response proxy upload dari cache publik panjang ke cache private pendek.
- [ ] Tambah policy object upload: owner/module/sensitivity sebelum file bisa dibaca.
- [ ] Ubah file sensitif ke signed URL pendek setelah authorization check.
- [x] Tambah source-test untuk auth/proxy hardening upload.

## Tahap 3 - SSRF Follow-Up

- [ ] Validasi reachability `uploadImageFromUrl`.
- [ ] Tambah allowlist/blocklist URL server-side: hanya `http/https`, blok localhost/private/link-local/metadata IP, validasi redirect final.
- [ ] Tambah test URL private network ditolak.

## Tahap 4 - Deferred Scan

- [ ] Focus scan `app/api/mobile/sync/**` dan `app/api/mobile/face-*`.
- [ ] Focus scan `app/api/menu/**`.
- [ ] Focus scan `lib/approval-engine.ts`, `lib/approval-blueprint.ts`, `lib/legacy-approval-engine.ts`.
- [ ] Focus scan `lib/email-delivery.ts`, `lib/workflow-email.ts`, `lib/push-notifications.ts`.
- [ ] Focus scan recruitment/candidate flows.
