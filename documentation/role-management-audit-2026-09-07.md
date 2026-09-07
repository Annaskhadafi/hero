# Audit Role Management HERO dan spesifikasi perbaikan

Tanggal: 7 September 2026. Repo: `D:\[01] PROJECT\HERO`. HEAD saat audit: `2a4b1330d`.

## Status dan batas bukti

Audit menemukan pelanggaran nyata pada alur kode otorisasi, bukan hanya tombol yang belum disembunyikan. Inisialisasi dapat mengaktifkan kembali izin yang dimatikan; beberapa halaman mengirim data tanpa pemeriksaan `canView`; beberapa query memperlakukan Own sebagai Site. Perbaikan harus mencakup pembacaan dan mutasi di server.

- Inventaris statis mencakup seluruh **178** `app/dashboard/**/page.tsx`.
- **145** tidak menyebut `getCurrentMenuPermission`; **160** tidak menyebut `canView`. Ini kandidat penelusuran, **bukan jumlah halaman terbukti bocor**: loader, layout, atau helper lain dapat memberi perlindungan.
- Delapan rute dashboard dipetakan secara mendalam, ditambah helper pusat, Role Management save, beberapa server action, embedded profile, dan API/PDF laporan mobile.
- Empat perilaku helper yang melanggar kebijakan direproduksi melalui eksekusi TypeScript aktual dengan session/DB tiruan; satu kontrol penolakan production berhasil.
- Belum ada uji HTTP dengan akun role nyata, pembacaan konfigurasi DB target, atau verifikasi deployment. Temuan source tidak membuktikan bahwa insiden tertentu telah terjadi di production.
- Audit tidak mengubah kode aplikasi, database, konfigurasi role, ataupun sesi pengguna. Artefak yang ditambahkan hanya laporan ini dan inventaris JSON.

Inventaris: [role-management-route-inventory-2026-09-07.json](./role-management-route-inventory-2026-09-07.json).

## Keputusan pengguna yang sudah dikunci

| Aspek | Aturan |
| --- | --- |
| Pengecualian role | Hanya **Super Admin** boleh melewati checklist. Role lainnya wajib mengikuti permission yang tersimpan. |
| Permission belum ada | Tolak akses; tidak memberikan izin berdasarkan nama jabatan/role. |
| Own Data | Data milik karyawan yang login. Jika admin membuat atas nama karyawan lain, pemilik tetap karyawan tersebut, bukan admin pembuat. |
| Site Data | Hanya site utama pengguna pada `hero_employees.siteId` di User Management. Assignment site tambahan tidak memperluas akses. |
| Global Data | Boleh lintas site dalam resource yang diizinkan. Global tidak menghidupkan `canView`, edit, atau delete yang dimatikan. |
| Identitas karyawan | `hero_employees` adalah sumber karyawan runtime; tidak memakai staging `hero_hr_employees`. |
| Kasus reproduksi pengguna | Pengguna tidak mengingat contoh; audit menelusuri sendiri jalur kode. |

### Keputusan yang masih menunggu jawaban interview

1. **Approver dengan Own:** rekomendasi mengizinkan hanya pengajuan yang secara eksplisit ditugaskan kepadanya melalui Inbox Approval, tanpa membuka seluruh data/profil requester. Jawaban masih pending.
2. **Data bersama per site:** rekomendasi Own hanya melihat potongan data miliknya jika tersedia; simpan/finalisasi snapshot seluruh site memerlukan Site/Global serta izin aksi. Data agregat tanpa owner tidak otomatis diberikan ke Own. Jawaban masih pending.

Kedua rekomendasi tersebut belum dianggap persetujuan. Pemetaan site historis transaksi dan data karyawan setelah perpindahan site harus dinyatakan eksplisit saat menyusun predicate tiap domain; jangan menebak owner/site dari nama atau pembuat data.

## Temuan terkonfirmasi pada source

Prioritas P1: perlu ditutup sebelum menyatakan isolasi role/data aman. P2: ketidaksesuaian tampilan atau akses yang terlalu sempit. Kondisi eksploitasi di deployment belum diuji.

### R01 — P1: Inisialisasi menimpa checklist deny pada delapan resource

**Jalur:** `app/dashboard/layout.tsx:39` → `getSidebarDataForUser` (`lib/hero-admin.ts:7675`) → `ensureHeroGovernanceSeedData` (`:5074`) → update seluruh role (`:5483-5502`). `getSecurityRolesData` juga memanggil seed (`:7298`).

Ketika seed berjalan, kode mengatur `canView: true, canEdit: true` pada semua permission dengan resource `attendance`, `attendance_live_map`, `attendance_records`, `attendance_exceptions`, `scheduling_timesheet_attendance`, `tire_service`, `overtime_requests`, dan `approval_inbox`. Update tidak membedakan izin default dengan keputusan admin.

**Pemicu:** proses baru/global flag belum seeded, menu terkait ada, dan seed mencapai blok update. Restart/instance baru dapat menjalankan ulang jalur tersebut. Flag process-local (`:5075-5079`) bukan perlindungan atas keputusan admin di DB.

**Dampak:** izin Lihat/Ubah yang sudah dimatikan bisa kembali aktif. Scope tidak diubah oleh blok update itu, tetapi permission baru untuk sebagian resource inti memperoleh `global` dari default (`:4311-4328`, `:5469-5480`).

**Perbaikan:** hentikan overwrite permission yang sudah ada. Resource/role baru selain Super Admin mulai deny/Own; seed harus idempotent terhadap konfigurasi admin. Jangan menebak kembali deny historis yang sudah tertimpa; buat preview perbaikan konfigurasi dari sumber yang disepakati.

### R02 — P1: Identitas/role tidak ditemukan beralih ke akun lain atau Super Admin

`lib/hero-access.ts:73-84` mencari akun hardcoded saat role sesi tidak ditemukan, kemudian default ke `Super Admin`. `lib/get-current-employee.ts:30-56` memiliki fallback akun hardcoded, karyawan aktif pertama, dan role Super Admin.

**Pemicu:** session tidak ada atau tidak terhubung dengan karyawan/role valid. **Dampak:** helper dapat memberi identitas atau hak akses milik orang lain. Role resolution kosong direproduksi dengan DB/session tiruan dan menghasilkan Super Admin.

**Perbaikan:** gunakan session tervalidasi dan relasi `hero_employees`; mapping tidak valid menghasilkan unauthenticated/forbidden, tidak memilih akun pengganti. Selaraskan kedua helper agar tidak ada caller yang mempertahankan fallback lama.

### R03 — P1: Bypass role dan sidebar melampaui Super Admin

`lib/hero-access.ts:30-43,102-110` memberi hak penuh kepada `System Administrator` dan `Khusus Mas Rendi`. `:138-146` memberikan Lihat/Ubah bawaan kepada Manager/Site Admin/HC Manager ketika permission tidak ditemukan; HC Manager memperoleh Global.

Sidebar memiliki resolusi berbeda: `lib/hero-admin.ts:7687-7701` memakai pencocokan nama/email parsial, override khusus nama tertentu, dan fallback Super Admin; `:7709-7716` memilih role Super Admin ketika role tidak ditemukan.

**Dampak:** nama role atau identitas yang tidak cocok dapat membuka hak yang tidak diberikan checklist. Menu sidebar dan permission server dapat berbeda. Missing permission Manager dan bypass System Administrator direproduksi dengan DB tiruan.

**Perbaikan:** hanya role Super Admin yang kanonis menjadi bypass; resolusi identitas dan permission harus sama untuk sidebar, halaman, action, dan API. Role lain mengikuti matriks, termasuk role yang mengandung kata `admin`.

### R04 — P1: Penolakan RBAC diabaikan di non-production

`lib/rbac.ts:8-11` mengembalikan user hardcoded ketika session kosong di non-production. `:31-34` menelan error permission di environment tersebut.

**Pemicu:** `NODE_ENV !== 'production'`. **Dampak:** pengujian role lokal dapat tampak mengizinkan semuanya. Reproduksi menunjukkan `canView=false` tetap mengembalikan sesi di development; kontrol dengan input sama di production melempar `Permission denied`.

**Perbaikan:** semantik auth/RBAC sama di semua environment. Test memakai session/permission tiruan melalui harness test, bukan bypass runtime aplikasi.

### R05 — P1: Mutasi Role Management memakai gate role/nama dan resource yang berbeda

`app/dashboard/admin-actions.ts:8125-8131` memanggil `requireAdminOrHcManagerRole`. Helper `lib/get-current-employee.ts:59-70` mengizinkan HC Manager, Admin, nama yang memuat `admin`, atau flag edit/delete/select-all pada **`security_users`**.

**Pemicu:** role lolos nama/helper tersebut tetapi `security_roles` tidak mengizinkan aksi. **Dampak:** operasi membuat/mengubah role, menyimpan permission, atau mengatur user role dapat lolos tanpa izin aksi Role Management yang sesuai.

**Perbaikan:** tiap intent memeriksa resource dan aksi yang benar. Jangan menyamakan delete/select-all dengan edit/create. Lindungi pemberian role Super Admin dan perubahan privilege agar user yang berwenang mengelola akun tidak otomatis bisa menaikkan hak sendiri.

### R06 — P1: Role Management dapat dibuka lewat URL meski Lihat mati

`app/dashboard/security/roles/page.tsx:4-20` langsung memanggil `getSecurityRolesData` dan meneruskan seluruh role, menu, permission, serta user ke client. Getter `lib/hero-admin.ts:7297-7323` tidak memfilter requester/scope. Parent dashboard (`app/dashboard/layout.tsx:25-55`) hanya mengecek session/akun aktif; parent security (`app/dashboard/security/layout.tsx:27-40`) merupakan layout tab client, bukan gate menu.

**Pemicu:** user login aktif membuka `/dashboard/security/roles` dengan `security_roles.canView=false`. **Dampak:** konfigurasi role dan direktori user dikirim ke browser.

**Perbaikan:** tolak di server sebelum getter mengambil data; action pengelolaan role harus terlindungi terpisah sebagaimana R05.

### R07 — P1: User Management mengirim semua karyawan tanpa scope

`app/dashboard/security/users/page.tsx:9-25` memuat data dan permission paralel, kemudian hanya meneruskan `canEdit`/`canDelete`. Tidak ada penolakan `canView` atau pembatasan scope. `lib/hero-admin.ts:7182-7241` mengambil semua `hero_employees` tanpa predicate requester/site; data personal diteruskan di `:7274-7293`.

**Pemicu:** buka URL dengan Lihat mati, Own, atau Site. **Dampak:** direktori dan data personal karyawan lintas scope telah dikirim ke browser, terlepas dari filter tabel. Shared getter juga dipakai `app/dashboard/hse/sia-sio-tools-certification/page.tsx:7-22`.

**Perbaikan:** guard sebelum fetch, batasi query sesuai resource pemanggil, dan kembalikan field minimum untuk dropdown/reference. Filter client tidak menyelesaikan kebocoran payload server.

### R08 — P1: Profil karyawan dapat diakses melalui ID orang lain

Listing HC memeriksa `canView`, tetapi `app/dashboard/hc/employee/[id]/page.tsx:14-29` hanya memvalidasi ID numerik. `app/actions/employee-profile.ts:81-116` mengambil employee berdasarkan ID tanpa session/menu/owner/site. Hasil mencakup data kontrak, disiplin, MCU, dan metrik (`:204-230,430-458`).

Caller embedded `app/embedded/hc/employee/[id]/page.tsx:17-25` juga meneruskan ID untuk sesi login; pemeriksaan token hanya berlaku saat tidak ada session.

**Pemicu:** user login membuka ID karyawan valid di luar scope atau saat resource tidak diizinkan. **Perbaikan:** otorisasi di shared action sebelum query dan sebelum seluruh join data sensitif; validasi jalur embedded secara terpisah sesuai kontrak aksesnya.

### R09 — P1: Disciplinary read/detail/update/delete tidak menegakkan RBAC

`app/dashboard/hc/disciplinary/page.tsx:15-27` mengambil list, stats, dan karyawan tanpa gate menu. `app/actions/disciplinary.ts:140-188` hanya memberi filter pencarian/status/kategori; `:194-200` membaca ID langsung. Update/status/delete (`:250-264,306-307`) tidak memeriksa session, izin aksi, atau scope pemilik.

**Pemicu:** user login membuka halaman atau memanggil server action dengan ID valid. **Dampak:** baca dan perubahan data SP orang lain dapat melalui jalur kode tersebut. Audit tidak mengeksekusi mutasi.

**Perbaikan:** cek permission resource, row owner/site, dan jenis aksi pada setiap read/write; gunakan filter yang sama untuk stats, detail, dan export.

### R10 — P1: Own pada Scheduling/Attendance/Payroll berubah menjadi Site

Halaman attendance/payroll → loader khusus (`lib/hero-admin.ts:7087-7089,7119-7121`) → `getSchedulingTimesheetOptions`. `canSeeSchedulingSite` (`:6592-6596`) memperlakukan Own dan Site sama.

**Pemicu:** Own dengan rekan lain pada site yang diizinkan. **Dampak:** output employee (`:6724-6747`), roster (`:6750-6752`), attendance termasuk foto/koordinat (`:6771-6783`), override dan SPL (`:6784-6831`) hanya dibatasi site.

**Perbaikan:** Own memakai employee pemilik yang login; Site memakai site utama; Global lintas site. Terapkan sebelum serialization/query sesuai domain, termasuk nested employee arrays pada roster/snapshot.

### R11 — P1: Scope submenu memakai resource Overview

`app/dashboard/scheduling-timesheet/attendance/page.tsx:9` dan `payroll/page.tsx:9` membaca permission submenu masing-masing. Loader bersama justru membaca `scheduling_timesheet` (`lib/hero-admin.ts:6584`).

**Pemicu:** Overview Global, Attendance/Payroll Own atau Site. **Dampak:** data mengikuti scope Overview yang lebih luas. Kombinasi sebaliknya terlalu membatasi akses yang seharusnya diberikan.

**Perbaikan:** loader menerima konteks permission resource yang benar dari server; input resource dari browser tidak boleh menjadi jalan memilih hak yang lebih luas. Audit semua caller shared loader.

### R12 — P1: Scope Site memasukkan assignment site tambahan

`lib/hero-access.ts:193-221` menggabungkan site utama dan `employeeSiteAssignments` aktif. Dipakai loader scheduling (`lib/hero-admin.ts:6587-6596`) dan mutasi (`app/dashboard/admin-actions.ts:242-256`).

**Pemicu:** pengguna memiliki assignment aktif di site tambahan. **Dampak:** Own/Site dapat meluas ke site tersebut, bertentangan dengan keputusan pengguna.

**Perbaikan:** batas otorisasi Site hanya `hero_employees.siteId`. Jangan menghapus penugasan operasional yang mungkin digunakan fitur lain; pisahkan penggunaan penugasan dari hak membaca/mengubah data.

### R13 — P1: Mutasi attendance/payroll salah resource, salah flag, dan tidak memvalidasi owner ID

`saveAttendanceRealOverridesAction` (`app/dashboard/admin-actions.ts:1493-1497`) dan `saveTimesheetPayrollSnapshotAction` (`:1358-1362`) menuju guard Overview `:232-238`. Edit dibolehkan jika `canEdit OR canDelete OR canSelectAll`, tanpa pemeriksaan izin submenu atau `canView`.

Guard hanya memvalidasi `payload.siteId`. Attendance memeriksa employee ada (`:1545-1552`) lalu upsert (`:1563-1598`) tanpa membandingkan pemilik/site employee. Payroll menerima ID employee positif lalu mengganti item snapshot (`:1404-1425`) tanpa validasi scope employee.

**Pemicu:** lolos guard Overview/site dan periode terbuka; payload berisi employee orang lain atau lintas site. **Dampak:** user dapat mengubah data di luar owner/site yang sah menurut kebijakan. Audit tidak menjalankan write.

**Perbaikan:** validasi resource, aksi, owner setiap employee ID, site authoritative, dan periode di server. Seluruh batch harus ditolak jika satu item di luar scope. Jangan menyimpan subset Own dengan operasi replace snapshot seluruh site karena dapat menghapus data rekan kerja. Kebijakan operasi agregat masih menunggu jawaban interview.

### R14 — P1: Live Attendance Map menampilkan rekan satu site untuk Own

`app/actions/attendance.ts:1116-1122` mengecek `attendance_live_map.canView`, tetapi `:1138-1139` membatasi semua non-global hanya berdasarkan `attendanceRecords.siteId`. Query `:1165` mencakup lokasi rekan satu site; return scope (`:1231`) hanya membedakan Global/Site.

**Pemicu:** Lihat aktif, Own, dan ada absensi rekan satu site. **Perbaikan:** Own memfilter `attendanceRecords.employeeId` terhadap pemilik yang login, dan refresh client menggunakan helper yang sama.

### R15 — P1: API dan PDF laporan mobile melewati checklist dan selalu memakai Site

`app/api/mobile/reports/route.ts:6-13` dan `app/api/mobile/reports/[reportId]/pdf/route.ts:10-23` hanya memeriksa session. `lib/mobile-data.ts:225-236` mengambil laporan site tanpa permission menu/dataScope.

**Pemicu:** session terhubung employee, laporan site ada, dan role Own atau Lihat mati. **Dampak:** data/unduhan laporan masih tersedia. PDF memeriksa ID terhadap hasil list sehingga ini **bukan bukti akses lintas site melalui reportId**.

`hero_daily_reports` (`db/schema/hero.ts:645-659`) tidak memiliki owner employee; hanya site. **Perbaikan:** cek menu di API/loader/PDF; untuk Own jangan mengarang owner berdasarkan login atau pembuat. Kebijakan agregat masih pending. Schema baru tidak otomatis diperlukan jika diputuskan agregat hanya untuk Site/Global.

### R16 — P2: HSE Incident tetap merender halaman terlarang dan Site terlalu sempit

`app/dashboard/hse/incident-report/page.tsx:16-29` tidak menolak `canView=false`, tetapi loader `actions.ts:60` memeriksa view dan mengembalikan error/empty hasil saat ditolak (`:94-96`). Dengan demikian yang terbukti adalah **halaman tetap terlihat**, bukan kebocoran incident saat view ditolak.

Untuk Lihat aktif, `actions.ts:62-63` menyamakan semua non-global dengan Own (`picEmployeeId` login), sehingga Site tidak mendapat data site yang diizinkan.

**Perbaikan:** page menolak akses sebelum render; predicate data membedakan Own, Site, dan Global. Kasus ini menunjukkan menghilangkan semua data bukan implementasi scope yang benar.

## Verifikasi yang benar-benar dijalankan

1. Inventaris 178 page membaca source aktual dan menghasilkan JSON; tidak menjalankan aplikasi atau seed.
2. Penelusuran source rute → parent layout → loader/action → query/serialization, termasuk caller alternatif yang disebut di temuan.
3. Transpile `lib/hero-access.ts` dan `lib/rbac.ts` menggunakan TypeScript terpasang; eksekusi dalam Node VM dengan semua import DB/session diganti mock. Hasil:

| Kasus | Hasil aktual | Penilaian |
| --- | --- | --- |
| Session/mapping role kosong, mock DB kosong | `Super Admin` | Pelanggaran direproduksi |
| Manager tanpa record permission | Lihat/Ubah aktif, Site | Pelanggaran direproduksi |
| System Administrator tanpa record permission | Semua flag aktif, Global | Pelanggaran direproduksi |
| Development dengan `canView=false` | Session tetap dikembalikan | Pelanggaran direproduksi |
| Production dengan `canView=false`, helper yang sama | Error Permission denied | Kontrol pembanding berhasil |

Exit code harness: **0**, berarti assertion reproduksi cocok dengan perilaku source, **bukan** berarti sistem lolos audit. Tidak ada call DB/network pada harness.

Test lama `tests/hse-role-management-source.test.mjs` memeriksa pola teks tertentu agar seed tidak overwrite. Pola tersebut tidak membuktikan seluruh update permission aman; R01 memakai update eksplisit yang perlu behavioral regression test. Test sumber lama tidak dijalankan ulang untuk menyatakan keamanan runtime.

Tool code-review-graph tidak tersedia pada inventory tool sesi. Graphify report telah dibaca; source langsung dipakai untuk verifikasi karena report tidak cukup membuktikan predicate/caller saat ini. Tidak ada perubahan kode sehingga graph update tidak diperlukan pada audit ini.

## Spesifikasi implementasi yang direkomendasikan

### Urutan pekerjaan

1. **Tutup akar masalah pusat:** hapus fallback identitas/role, bypass nama, default izin missing, bypass development, dan overwrite seed. Satukan keputusan permission yang dipakai sidebar/server dengan helper existing.
2. **Kunci titik baca dan mutasi sensitif:** Role Management, User Management, profil HC, disciplinary, live map, scheduling/attendance/payroll, mobile report/PDF.
3. **Terapkan scope eksplisit per domain:** owner employee untuk Own; site utama untuk Site; Global tetap memerlukan permission resource. Client tidak menentukan employee/site authoritative.
4. **Selaraskan halaman, tombol, refresh, dropdown, detail, export/PDF, stats, API, server action.** Page ditolak sebelum fetch; guard action/query tetap independen dari UI. Tidak ada dataset terlarang yang diserialisasi lebih dulu lalu disembunyikan.
5. **Selesaikan inventaris yang belum ditelusuri:** setiap rute dinilai melalui seluruh loader/action, bukan hanya menambah token `getCurrentMenuPermission`. Role Management menampilkan resource nyata yang mengatur rute tersebut.
6. **UAT terkontrol setelah perbaikan:** akun fixture dengan role/owner/site berbeda; jangan memakai mutation production untuk membuktikan exploit.

### Kontrak otorisasi minimum

- Session valid → karyawan valid → resource permission → aksi → row scope. Gagal satu tahap menghasilkan deny.
- Permission tidak ditemukan atau scope tidak valid menghasilkan deny; tidak berubah ke Site/Global.
- `canView=false` menolak halaman/detail/API/export, bukan hanya menu sidebar.
- Edit dan delete mengikuti checkbox masing-masing; Global dan `canSelectAll` tidak memperlebar Own/Site atau menggantikan izin aksi yang dimatikan. Label UI `Akses penuh` pada `canSelectAll` perlu diselaraskan agar tidak memberi ekspektasi bertentangan dengan scope.
- Kontrak create saat ini memakai `canEdit` di helper. Jangan menambah field/migration `canCreate` tanpa kebutuhan terpisah; tampilkan dan tegakkan kontrak yang sama di UI/server.
- Operasi terhadap ID harus membaca owner/site dari DB, bukan menerima klaim owner/site dari FormData/query parameter.
- Batch memvalidasi seluruh ID sebelum write dan memakai transaksi agar tidak menyisakan perubahan parsial saat satu item ditolak.
- Persistensi matriks Role Management memvalidasi enum scope, boolean, ID resource, dan seluruh matrix sebelum write atomik. Parsing JSON dengan TypeScript cast (`admin-actions.ts:8314-8321`) bukan validasi runtime; loop per-row saat ini (`:8323-8357`) harus ditinjau untuk atomicity.
- Hak mengelola Role Management tidak boleh menjadi jalur kenaikan privilege sendiri; aturan pemberian role/permission harus ditegakkan server-side.
- Scope tidak otomatis memperluas field sensitif: dropdown referensi hanya mengembalikan ID/label yang diperlukan dalam scope.
- Seed tidak mengubah keputusan admin setelah save, restart, atau instance baru. Perubahan role/permission harus terlihat pada request berikutnya; uji invalidasi cache/session sesuai mekanisme nyata.

### Matriks penerimaan

Fixture minimum: A dan B di site utama X, C di site utama Y; A punya assignment tambahan Y; D tidak memiliki mapping karyawan/role; satu Super Admin; satu role bernama Administrator yang bukan Super Admin.

| Skenario | Hasil wajib |
| --- | --- |
| Semua checkbox resource mati | Menu hilang; direct URL/API/detail/export ditolak; action tidak mengubah DB |
| Own untuk A | Hanya data dengan owner A; B/C tidak muncul di rows, counts, search, dropdown, nested payload, PDF |
| Admin membuat data atas nama B | Own A tidak melihatnya; Own B boleh melihat sesuai izin resource |
| Site untuk A | Hanya data site utama X; assignment Y tidak membuka Y |
| Global untuk A + Lihat aktif | Data lintas site dalam resource tersebut dapat dibaca |
| Global + Lihat mati | Tetap ditolak |
| Overview Global + Attendance Own | Attendance tetap hanya A |
| Overview boleh edit + Payroll edit mati | Action Payroll ditolak |
| Edit mati, delete/select-all aktif | Edit tetap ditolak |
| Payload site X tetapi employee C/site Y | Seluruh mutation/batch ditolak tanpa partial write |
| Resource permission hilang | Ditolak untuk non-Super Admin |
| Mapping employee/role D hilang | Ditolak; tidak memilih karyawan/role lain |
| Role Administrator non-Super Admin | Mengikuti checklist; tanpa bypass nama |
| Save deny, lalu restart/seed | Permission deny tetap tersimpan |
| Development vs production | Keputusan izin identik untuk input identik |
| User mengganti ID detail/PDF | Tetap dibatasi permission dan owner/site |
| Site pada HSE Incident | Seluruh data site yang sesuai owner/site mapping, bukan Own saja |
| Own approver atau snapshot site | Ekspektasi final mengikuti dua keputusan interview yang masih pending |

## Database, deployment, dan sisa pekerjaan

Audit tidak melakukan perubahan database/schema/seed/data-access implementation, sehingga tidak menjalankan `db:push` atau migration. Tidak ada klaim database sudah ter-push. Repo menggunakan Drizzle dan menyediakan `npm run db:push` serta `npm run db:migrate`; pemilihan environment dan command verifikasi menjadi bagian pekerjaan implementasi jika ada perubahan DB.

Sisa pekerjaan: jawab dua keputusan interview, implementasi perbaikan, penelusuran mendalam sisa rute/API, UAT role nyata pada environment target, dan verifikasi deployment. Tidak ada commit/push dilakukan dalam audit ini.
