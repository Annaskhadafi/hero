import 'dotenv/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
const pool = new Pool({ connectionString: url, ssl: false })

async function reseed() {
  const c = await pool.connect()
  try {
    console.log('--- Cleaning Dummy Data & Reseeding Authentic HERO Service Desk Data ---')

    // 1. Clear old dummy data
    await c.query('TRUNCATE TABLE hero_service_desk_messages CASCADE')
    await c.query('TRUNCATE TABLE hero_service_desk_activities CASCADE')
    await c.query('TRUNCATE TABLE hero_service_desk_tickets CASCADE')
    await c.query('DELETE FROM hero_service_desk_categories')

    // 2. Insert Real HERO Cross-Department & System Issue Categories
    const categories = [
      {
        code: 'HERO_TIMESHEET',
        name: 'Timesheet & Roster Kerja',
        description: 'Kendala kalkulasi lembur SPL, roster shift, dan validasi jam kerja.',
        color: '#2563eb',
        icon: 'Clock',
        sla: 6,
        isSys: true,
      },
      {
        code: 'HERO_ATTENDANCE',
        name: 'Presensi Wajah & GPS',
        description: 'Kendala face recognition, geotagging lokasi site, dan liveness check.',
        color: '#0891b2',
        icon: 'ScanFace',
        sla: 4,
        isSys: true,
      },
      {
        code: 'HERO_MOBILE_APP',
        name: 'Aplikasi Mobile & Sync DAR',
        description: 'Kendala upload foto evidence S3, offline sync, dan crash aplikasi mobile.',
        color: '#4f46e5',
        icon: 'Smartphone',
        sla: 8,
        isSys: true,
      },
      {
        code: 'HERO_NETWORK_SERVER',
        name: 'Koneksi Jaringan & Server Site',
        description: 'Kendala koneksi VSAT/LAN site, VPN, dan latency server cloud.',
        color: '#dc2626',
        icon: 'Wifi',
        sla: 4,
        isSys: true,
      },
      {
        code: 'HERO_FORM_STUDIO',
        name: 'Form Studio & Digital Signature',
        description: 'Kendala generator form digital, tanda tangan elektronik, dan export PDF.',
        color: '#ea580c',
        icon: 'FileText',
        sla: 8,
        isSys: true,
      },
      {
        code: 'DEPT_SUPPLY_CHAIN',
        name: 'Supply Chain & Logistik (APD/Alat)',
        description: 'Permintaan dan kendala alokasi APD, tools kerja, sparepart, dan logistik.',
        color: '#d97706',
        icon: 'Package',
        sla: 24,
        isSys: false,
      },
      {
        code: 'DEPT_SUPPORT_FACILITIES',
        name: 'Fasilitas & Kendaraan Operasional',
        description: 'Permintaan perbaikan fasilitas site, mess karyawan, AC, dan maintenance kendaraan.',
        color: '#059669',
        icon: 'Building',
        sla: 24,
        isSys: false,
      },
      {
        code: 'DEPT_HC_SERVICES',
        name: 'Human Capital & Kepegawaian',
        description: 'Layanan administrasi karyawan, data personalia, surat tugas, dan konsultasi.',
        color: '#7c3aed',
        icon: 'Users',
        sla: 24,
        isSys: false,
      },
      {
        code: 'HERO_BUG_REPORT',
        name: 'Laporan Bug & Error Sistem',
        description: 'Temuan anomali data, error HTTP, atau bug alur transaksi sistem HERO.',
        color: '#b91c1c',
        icon: 'Bug',
        sla: 4,
        isSys: true,
      },
    ]

    const catMap: Record<string, number> = {}
    for (const cat of categories) {
      const res = await c.query(
        `INSERT INTO hero_service_desk_categories (code, name, description, color, icon, default_sla_hours, is_system_issue)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [cat.code, cat.name, cat.description, cat.color, cat.icon, cat.sla, cat.isSys]
      )
      catMap[cat.code] = res.rows[0].id
    }
    console.log(`Inserted ${Object.keys(catMap).length} real categories.`)

    // 3. Fetch available sites
    const sites = (await c.query('SELECT id, name FROM hero_sites ORDER BY id')).rows

    const getSiteId = (preferredSiteName: string) => {
      const match = sites.find((s) => s.name.toLowerCase().includes(preferredSiteName.toLowerCase()))
      return match ? match.id : sites[0]?.id || 1
    }

    const now = new Date()

    // 4. Authentic HERO Cross-Department & System Issues matching planning document
    const ticketsData = [
      {
        ticketNumber: 'TCK-2026-0031',
        unit: 'Timesheet V2',
        siteName: 'CK-MIFA2',
        catCode: 'HERO_TIMESHEET',
        catName: 'Timesheet & Roster Kerja',
        title: 'Timesheet V2: Gagal sinkronisasi data lembur otomatis',
        finding: 'Kalkulasi lembur otomatis pada shift malam tidak tersinkronisasi ke rekap bulanan karyawan di site CK-MIFA2. Perlu investigasi rule perhitungan.',
        sourceType: 'user_report',
        sourceDetail: 'Laporan User Operasional',
        priority: 'kritis',
        status: 'investigasi',
        pic: 'Andi Saputra',
        role: 'Fullstack Engineer',
        detectedHoursAgo: 26,
        slaTargetHours: 4,
        isOverdue: true,
        overdueHours: 22,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Dilaporkan oleh Supervisor Operasional CK-MIFA2 via Dashboard.', user: 'Ferry Hendrawan', offsetHours: 26 },
          { action: 'assigned', title: 'Penugasan PIC', note: 'Ditugaskan ke Andi Saputra (Central Services IT).', user: 'System Admin', offsetHours: 24 },
          { action: 'status_changed', title: 'Investigasi Dimulai', note: 'Memeriksa worker cron background sync dan query aggregate timesheet.', user: 'Andi Saputra', offsetHours: 18 },
        ]
      },
      {
        ticketNumber: 'TCK-2026-0042',
        unit: 'Absensi Mobile',
        siteName: 'CK-KIM',
        catCode: 'HERO_ATTENDANCE',
        catName: 'Presensi Wajah & GPS',
        title: 'Presensi Wajah: Kamera gagal deteksi liveness di area outdoor',
        finding: 'Karyawan shift 1 di pit mining CK-KIM mengalami timeout saat absensi wajah karena backlight matahari terik. Nilai confidence score liveness jatuh di bawah threshold 0.7.',
        sourceType: 'user_report',
        sourceDetail: 'Pelaporan Langsung Lapangan',
        priority: 'kritis',
        status: 'baru',
        pic: null,
        role: null,
        detectedHoursAgo: 6,
        slaTargetHours: 4,
        isOverdue: true,
        overdueHours: 2,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Laporan kendala absensi pit mining diterima.', user: 'Budi Santoso', offsetHours: 6 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0038',
        unit: 'Infrastruktur Jaringan',
        siteName: 'CK-MIFA2',
        catCode: 'HERO_NETWORK_SERVER',
        catName: 'Koneksi Jaringan & Server Site',
        title: 'Koneksi Jaringan: Link VSAT site intermiten dan latency tinggi',
        finding: 'Koneksi internet site CK-MIFA2 mengalami packet loss hingga 45%, menghambat pengiriman laporan DAR lapangan dan presensi realtime.',
        sourceType: 'system_detection',
        sourceDetail: 'Zabbix Network Monitor',
        priority: 'kritis',
        status: 'assigned',
        pic: 'Andi Saputra',
        role: 'Network Engineer',
        detectedHoursAgo: 5,
        slaTargetHours: 4,
        isOverdue: true,
        overdueHours: 1,
        activities: [
          { action: 'created', title: 'Tiket Dibuat Otomatis', note: 'Peringatan otomatis latency > 800ms terdeteksi oleh monitoring.', user: 'Sistem Telematika', offsetHours: 5 },
          { action: 'assigned', title: 'Penugasan PIC', note: 'Di-assign ke Network Engineer untuk failover ke link cadangan.', user: 'IT Helpdesk Lead', offsetHours: 4.5 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0045',
        unit: 'Master Data Reporting',
        siteName: 'CK-KIM',
        catCode: 'HERO_BUG_REPORT',
        catName: 'Laporan Bug & Error Sistem',
        title: 'Master Data: Delay export laporan bulanan ke format Excel / PDF',
        finding: 'Ekspor data histori aktivitas 10.000+ baris mengalami request timeout pada browser desktop. Perlu optimasi streaming response XLSX.',
        sourceType: 'user_report',
        sourceDetail: 'Pelaporan User Admin',
        priority: 'tinggi',
        status: 'baru',
        pic: null,
        role: null,
        detectedHoursAgo: 10,
        slaTargetHours: 8,
        isOverdue: true,
        overdueHours: 2,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Pengguna melaporkan loading spinner tidak kunjung selesai saat download.', user: 'Siti Rahma', offsetHours: 10 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0036',
        unit: 'Form Studio',
        siteName: 'CK-BIB KGB',
        catCode: 'HERO_FORM_STUDIO',
        catName: 'Form Studio & Digital Signature',
        title: 'Form Studio: Pratinjau layout PDF terpotong pada orientasi landscape',
        finding: 'Dokumen checklist inspeksi harian yang menggunakan format landscape mengalami pemotongan margin kanan saat di-render via print preview A4.',
        sourceType: 'user_report',
        sourceDetail: 'Pelaporan Tim Mutu',
        priority: 'tinggi',
        status: 'assigned',
        pic: 'Rudi Hartono',
        role: 'Frontend Developer',
        detectedHoursAgo: 3,
        slaTargetHours: 8,
        isOverdue: false,
        hoursRemaining: 5,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Dilaporkan oleh tim HSE saat mencetak form inspeksi mingguan.', user: 'Doni Pratama', offsetHours: 3 },
          { action: 'assigned', title: 'Penugasan PIC', note: 'Diteruskan ke Rudi Hartono untuk penyesuaian styling CSS @media print.', user: 'IT Helpdesk', offsetHours: 2 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0029',
        unit: 'Support Facilities',
        siteName: 'CK-BMB Sitarum',
        catCode: 'DEPT_SUPPORT_FACILITIES',
        catName: 'Fasilitas & Kendaraan Operasional',
        title: 'Fasilitas Site: Permintaan perbaikan AC server room site CK-BMB',
        finding: 'Suhu server room site CK-BMB mencapai 31°C karena unit AC split outdoor mati. Perlu tindakan darurat teknisi fasilitas demi menjaga switch & server.',
        sourceType: 'cross_dept',
        sourceDetail: 'Tiket Antar Departemen (IT -> Facilities)',
        priority: 'tinggi',
        status: 'investigasi',
        pic: 'Dewi Lestari',
        role: 'Facilities Supervisor',
        detectedHoursAgo: 2,
        slaTargetHours: 8,
        isOverdue: false,
        hoursRemaining: 6,
        activities: [
          { action: 'created', title: 'Permintaan Antar Departemen', note: 'Pengajuan perbaikan urgent dari IT Site ke Departemen Facilities.', user: 'Hendra Wijaya', offsetHours: 2 },
          { action: 'status_changed', title: 'Investigasi Dimulai', note: 'Vendor service AC lokal Sangatta telah dihubungi untuk perbaikan kompresor.', user: 'Dewi Lestari', offsetHours: 1.2 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0024',
        unit: 'Supply Chain Management',
        siteName: 'CK-MIFA2',
        catCode: 'DEPT_SUPPLY_CHAIN',
        catName: 'Supply Chain & Logistik (APD/Alat)',
        title: 'Supply Chain: Pengajuan restock safety helmet & rompi high-visibility',
        finding: 'Stok APD mandatory untuk kru mekanik baru di site CK-MIFA2 tersisa 2 unit. Membutuhkan pengiriman cepat 20 unit rompi scotchlite dan helm keselamatan.',
        sourceType: 'cross_dept',
        sourceDetail: 'Tiket Antar Departemen (Workshop -> Logistic)',
        priority: 'sedang',
        status: 'menunggu_part',
        pic: 'Andi Saputra',
        role: 'Logistics Coordinator',
        detectedHoursAgo: 4,
        slaTargetHours: 24,
        isOverdue: false,
        hoursRemaining: 20,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Pengajuan restock APD operasional workshop diajukan.', user: 'Agus Subekti', offsetHours: 4 },
          { action: 'status_changed', title: 'PO Diterbitkan', note: 'Purchase Order No. PO-2026-0418 telah diterbitkan ke distributor Balikpapan.', user: 'Andi Saputra', offsetHours: 2 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0021',
        unit: 'Mobile App Notification',
        siteName: 'CK-MIFA2',
        catCode: 'HERO_MOBILE_APP',
        catName: 'Aplikasi Mobile & Sync DAR',
        title: 'Mobile App: Push notifikasi approval SPL tidak muncul di Android 14',
        finding: 'Beberapa smartphone supervisor dengan sistem operasi Android 14 tidak menerima pop-up notifikasi saat ada approval lembur masuk karena batasan background battery optimization.',
        sourceType: 'user_report',
        sourceDetail: 'Feedback Pengguna Mobile',
        priority: 'sedang',
        status: 'menunggu_part',
        pic: 'Andi Saputra',
        role: 'Mobile Developer',
        detectedHoursAgo: 1,
        slaTargetHours: 24,
        isOverdue: false,
        hoursRemaining: 23,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Laporan diteruskan dari feedback pengguna mobile.', user: 'Yusuf Maulana', offsetHours: 1 },
          { action: 'status_changed', title: 'Menunggu Build Rilis', note: 'Patch FCM background notification handler sedang diuji coba di testing internal.', user: 'Andi Saputra', offsetHours: 0.5 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0019',
        unit: 'HC Roster Management',
        siteName: 'CK-MIFA2',
        catCode: 'DEPT_HC_SERVICES',
        catName: 'Human Capital & Kepegawaian',
        title: 'HC Services: Validasi roster kerja shift malam karyawan CK-MIFA2',
        finding: 'Penyesuaian jadwal roster rotasi 2 minggu kerja 1 minggu libur untuk regu operasional malam telah diverifikasi dan disinkronkan ke database.',
        sourceType: 'cross_dept',
        sourceDetail: 'Tiket Antar Departemen (Ops -> HC)',
        priority: 'sedang',
        status: 'selesai',
        pic: 'Andi Saputra',
        role: 'HR Specialist',
        detectedHoursAgo: 48,
        slaTargetHours: 24,
        isOverdue: false,
        resolvedHoursAgo: 43.8,
        mttrHours: 4.2,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Permintaan perubahan pola roster diajukan.', user: 'Bambang Irawan', offsetHours: 48 },
          { action: 'resolved', title: 'Selesai Dikerjakan', note: 'Perubahan roster berhasil diverifikasi dan disetujui Head HC. MTTR tercapai 4.2 jam.', user: 'Andi Saputra', offsetHours: 43.8 }
        ]
      },
      {
        ticketNumber: 'TCK-2026-0017',
        unit: 'Infrastruktur Jaringan',
        siteName: 'CK-MIFA2',
        catCode: 'HERO_NETWORK_SERVER',
        catName: 'Koneksi Jaringan & Server Site',
        title: 'Jaringan Site: Re-routing bandwidth backup link satelit CK-MIFA2',
        finding: 'Optimalisasi routing switch core dan QoS VoIP di site CK-MIFA2 telah selesai dilaksanakan, transmisi data kembali normal 100%.',
        sourceType: 'system_detection',
        sourceDetail: 'Network Operation Center',
        priority: 'kritis',
        status: 'selesai',
        pic: 'Andi Saputra',
        role: 'Network Engineer',
        detectedHoursAgo: 72,
        slaTargetHours: 4,
        isOverdue: false,
        resolvedHoursAgo: 64.5,
        mttrHours: 7.5,
        activities: [
          { action: 'created', title: 'Tiket Dibuat', note: 'Alert bandwidth spike terdeteksi.', user: 'NOC System', offsetHours: 72 },
          { action: 'resolved', title: 'Pekerjaan Selesai', note: 'Re-routing ke cadangan Starlink berhasil, stabilitas link 99.9%. MTTR tercapai 7.5 jam.', user: 'Andi Saputra', offsetHours: 64.5 }
        ]
      }
    ]

    for (const t of ticketsData) {
      const siteId = getSiteId(t.siteName)
      const detectedAt = new Date(now.getTime() - t.detectedHoursAgo * 3600 * 1000)
      let targetSlaAt: Date
      if (t.isOverdue) {
        targetSlaAt = new Date(now.getTime() - (t.overdueHours || 2) * 3600 * 1000)
      } else {
        targetSlaAt = new Date(now.getTime() + (t.hoursRemaining || 4) * 3600 * 1000)
      }
      const resolvedAt = t.status === 'selesai' ? new Date(now.getTime() - (t.resolvedHoursAgo || 2) * 3600 * 1000) : null

      const res = await c.query(
        `INSERT INTO hero_service_desk_tickets 
         (ticket_number, unit_code, site_id, category_name, title, finding_description, source_type, source_detail, priority, status, assigned_employee_name, assigned_role, detected_at, target_sla_at, resolved_at, mttr_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING id`,
        [
          t.ticketNumber,
          t.unit,
          siteId,
          t.catName,
          t.title,
          t.finding,
          t.sourceType,
          t.sourceDetail,
          t.priority,
          t.status,
          t.pic,
          t.role,
          detectedAt,
          targetSlaAt,
          resolvedAt,
          t.mttrHours || null,
        ]
      )

      const ticketId = res.rows[0].id

      for (const act of t.activities) {
        const actTime = new Date(now.getTime() - act.offsetHours * 3600 * 1000)
        await c.query(
          `INSERT INTO hero_service_desk_activities (ticket_id, actor_name, action_type, title, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            ticketId,
            act.user,
            act.action,
            act.title,
            act.note,
            actTime,
          ]
        )
      }
    }

    console.log(`Successfully seeded ${ticketsData.length} authentic HERO Cross-Department & System tickets!`)
  } finally {
    c.release()
  }
}

reseed().then(() => {
  console.log('--- Reseed Completed Successfully ---')
  process.exit(0)
}).catch((err) => {
  console.error('Error reseeding:', err)
  process.exit(1)
})
