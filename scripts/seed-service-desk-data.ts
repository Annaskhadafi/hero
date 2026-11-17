import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
const pool = new Pool({ connectionString: url, ssl: false })

async function seed() {
  const c = await pool.connect()
  try {
    console.log('--- Seeding Excellence Service Desk & Troubleshooting Data ---')

    // 1. Fetch available sites
    const sitesRes = await c.query('SELECT id, name FROM hero_sites ORDER BY id')
    const sites = sitesRes.rows
    if (sites.length === 0) {
      console.log('No sites found!')
      return
    }

    const siteMap: Record<string, number> = {}
    sites.forEach((s) => {
      siteMap[s.name] = s.id
    })

    // Helper to find best matching site
    const getSiteId = (preferredName: string) => {
      for (const s of sites) {
        if (s.name.toLowerCase().includes(preferredName.toLowerCase())) return s.id
      }
      return sites[0].id
    }

    // 2. Fetch some employees
    const empsRes = await c.query('SELECT id, name, employee_sn, role FROM hero_employees ORDER BY id LIMIT 20')
    const employees = empsRes.rows
    const defaultEmpId = employees[0]?.id || null

    // 3. Seed Categories if empty
    const catCount = await c.query('SELECT COUNT(*) FROM hero_service_desk_categories')
    if (parseInt(catCount.rows[0].count, 10) === 0) {
      const categories = [
        { code: 'TVALVE_STUCK', name: 'TValve Macet', color: '#f59e0b', icon: 'Settings', sla: 8, isSys: false },
        { code: 'SENSOR_FAULT', name: 'Sensor Tidak Respon', color: '#ef4444', icon: 'Cpu', sla: 6, isSys: false },
        { code: 'LOW_PRESSURE', name: 'Low Pressure Berulang', color: '#dc2626', icon: 'AlertTriangle', sla: 12, isSys: false },
        { code: 'UNIT_OFFLINE', name: 'Unit Offline > 24 jam', color: '#b91c1c', icon: 'Truck', sla: 24, isSys: false },
        { code: 'PRESSURE_FLAT', name: 'Pressure Flat / Stuck', color: '#ea580c', icon: 'TrendingUp', sla: 12, isSys: false },
        { code: 'SYSTEM_SYNC', name: 'Sinkronisasi Data HERO', color: '#2563eb', icon: 'RefreshCw', sla: 4, isSys: true },
        { code: 'MOBILE_DAR', name: 'Kendala Form & Absensi Mobile', color: '#0891b2', icon: 'Smartphone', sla: 6, isSys: true },
        { code: 'NETWORK_LAN', name: 'Koneksi Jaringan Site & LAN', color: '#7c3aed', icon: 'Wifi', sla: 4, isSys: true },
        { code: 'CROSS_DEPT_FACILITY', name: 'Permintaan Perbaikan Fasilitas', color: '#059669', icon: 'Building', sla: 48, isSys: false },
      ]

      for (const cat of categories) {
        await c.query(
          `INSERT INTO hero_service_desk_categories (code, name, color, icon, default_sla_hours, is_system_issue)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO NOTHING`,
          [cat.code, cat.name, cat.color, cat.icon, cat.sla, cat.isSys]
        )
      }
      console.log('Categories seeded!')
    }

    // 4. Seed Knowledge Base if empty
    const kbCount = await c.query('SELECT COUNT(*) FROM hero_service_desk_knowledge_base')
    if (parseInt(kbCount.rows[0].count, 10) === 0) {
      const kbArticles = [
        {
          title: 'Penanganan TValve Macet & Solusi Pembersihan Jalur Tekanan',
          categoryCode: 'TVALVE_STUCK',
          systemModule: 'TPMS Hardware',
          symptom: 'Posisi tekanan tidak berubah selama lebih dari 72 jam saat unit beroperasi aktif.',
          rootCause: 'Akumulasi residu kotoran dan seal klep kering pada katup TValve.',
          solutionSteps: '1. Matikan engine unit dan pastikan safety lock terpasang.\n2. Bersihkan nozzle TValve menggunakan contact cleaner.\n3. Lakukan kalibrasi ulang pressure sensor dan tes pembacaan di monitor cab.',
          tags: JSON.stringify(['tvalve', 'sensor', 'pressure', 'hardware']),
        },
        {
          title: 'Troubleshooting Unit Offline > 24 Jam pada Gateway Telematics',
          categoryCode: 'UNIT_OFFLINE',
          systemModule: 'Telematics Gateway',
          symptom: 'Status unit menunjukkan disconnected/offline lebih dari 24 jam berturut-turut.',
          rootCause: 'Fuse power supply longgar atau antena GSM/GPS terhalang pelindung besi.',
          solutionSteps: '1. Cek tegangan pin power supply (minimal 12V-24V).\n2. Periksa posisi antena tidak tertutup plat metal.\n3. Lakukan hard restart power module selama 30 detik.',
          tags: JSON.stringify(['telematics', 'gateway', 'offline', 'power']),
        },
        {
          title: 'Solusi Gagal Sinkronisasi Data Timesheet & DAR Mobile',
          categoryCode: 'SYSTEM_SYNC',
          systemModule: 'Timesheet & Mobile Sync',
          symptom: 'Data aktivitas harian tersimpan di draft lokal dan gagal terkirim ke server.',
          rootCause: 'Penyimpanan cache indexedDB penuh atau token otentikasi session expired saat offline.',
          solutionSteps: '1. Buka Menu Profil > Pengaturan Akun di aplikasi Mobile.\n2. Tekan tombol "Sinkronkan Ulang Cache Data".\n3. Pastikan sinyal internet stabil minimal 3G/4G atau WiFi Site.',
          tags: JSON.stringify(['mobile', 'sync', 'timesheet', 'dar']),
        },
      ]

      for (const kb of kbArticles) {
        await c.query(
          `INSERT INTO hero_service_desk_knowledge_base (title, category_code, system_module, symptom, root_cause, solution_steps, tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [kb.title, kb.categoryCode, kb.systemModule, kb.symptom, kb.rootCause, kb.solutionSteps, kb.tags]
        )
      }
      console.log('Knowledge Base articles seeded!')
    }

    // 5. Check tickets count and seed reference tickets if empty
    const tCount = await c.query('SELECT COUNT(*) FROM hero_service_desk_tickets')
    if (parseInt(tCount.rows[0].count, 10) === 0) {
      console.log('Seeding reference tickets exactly matching user reference...')

      const mifa2SiteId = getSiteId('MIFA')
      const kimSiteId = getSiteId('KIM')
      const bibSiteId = getSiteId('BIB')
      const bmbSiteId = getSiteId('BMB')

      const sampleTickets = [
        {
          num: 'TKT-0031',
          unit: 'C02345',
          siteId: mifa2SiteId,
          catCode: 'TVALVE_STUCK',
          catName: 'Indikasi TValve macet',
          title: 'Indikasi TValve macet Pos 2',
          finding: 'Pos 2 tekanan 118 PSI konstan 72 jam, tidak berubah saat unit beroperasi aktif di pit.',
          sourceType: 'spm_tpms',
          sourceDetail: 'SPM - tabel tpms',
          priority: 'kritis',
          status: 'investigasi',
          pic: 'Andi (Teknisi)',
          role: 'Teknisi SPM',
          detectedHoursAgo: 74,
          slaTargetHours: 8,
          slaOverdue: true,
          overdueHours: 5,
        },
        {
          num: 'TKT-0042',
          unit: 'C02081',
          siteId: kimSiteId,
          catCode: 'SENSOR_FAULT',
          catName: 'Sensor Tidak Respon',
          title: 'Sensor Pos 4 tidak respon 6 hari',
          finding: 'Sensor TPMS posisi 4 tidak mengirimkan data telemetri sejak 6 hari lalu.',
          sourceType: 'spm_tpms',
          sourceDetail: 'SPM - tabel sensor',
          priority: 'kritis',
          status: 'baru',
          pic: null,
          role: null,
          detectedHoursAgo: 144,
          slaTargetHours: 6,
          slaOverdue: true,
          overdueHours: 138,
        },
        {
          num: 'TKT-0038',
          unit: 'C04658',
          siteId: mifa2SiteId,
          catCode: 'LOW_PRESSURE',
          catName: 'Low Pressure Berulang',
          title: 'Low pressure berulang Pos 3, 6',
          finding: 'Peringatan tekanan ban di bawah batas aman terjadi lebih dari 3 kali dalam 7 hari.',
          sourceType: 'system_detection',
          sourceDetail: 'Aturan Deteksi Otomatis Tekanan',
          priority: 'kritis',
          status: 'assigned',
          pic: 'Andi',
          role: 'Teknisi SPM',
          detectedHoursAgo: 28,
          slaTargetHours: 12,
          slaOverdue: true,
          overdueHours: 16,
        },
        {
          num: 'TKT-0045',
          unit: 'C04372',
          siteId: kimSiteId,
          catCode: 'UNIT_OFFLINE',
          catName: 'Unit Offline > 24 jam',
          title: 'Unit offline 10 hari',
          finding: 'Telematics gateway unit C04372 mati total dan tidak mengirimkan sinyal telemetri.',
          sourceType: 'system_detection',
          sourceDetail: 'Server Health Monitor',
          priority: 'tinggi',
          status: 'baru',
          pic: null,
          role: null,
          detectedHoursAgo: 240,
          slaTargetHours: 24,
          slaOverdue: true,
          overdueHours: 216,
        },
        {
          num: 'TKT-0036',
          unit: 'C04575',
          siteId: bibSiteId,
          catCode: 'PRESSURE_FLAT',
          catName: 'Pressure Flat / Stuck',
          title: 'Pressure flat Pos 1-3',
          finding: 'Tekanan ban membaca nilai flat konstan tanpa fluktuasi suhu saat beroperasi.',
          sourceType: 'user_report',
          sourceDetail: 'Pelaporan Driver Pit Stop',
          priority: 'tinggi',
          status: 'assigned',
          pic: 'Rudi',
          role: 'Mekanik Ban',
          detectedHoursAgo: 11,
          slaTargetHours: 12,
          slaOverdue: false,
          hoursRemaining: 1,
        },
        {
          num: 'TKT-0029',
          unit: 'C04365',
          siteId: bmbSiteId,
          catCode: 'UNIT_OFFLINE',
          catName: 'Unit Offline > 24 jam',
          title: 'Unit offline, cek modul',
          finding: 'Modul telemetri offline sejak kemarin pagi setelah unit keluar dari workshop.',
          sourceType: 'user_report',
          sourceDetail: 'Pemeriksaan Rutin P2H',
          priority: 'tinggi',
          status: 'investigasi',
          pic: 'Dewi',
          role: 'Staff IT & Sensor',
          detectedHoursAgo: 22,
          slaTargetHours: 24,
          slaOverdue: false,
          hoursRemaining: 2,
        },
        {
          num: 'TKT-0024',
          unit: 'C02473',
          siteId: mifa2SiteId,
          catCode: 'SENSOR_FAULT',
          catName: 'Sensor Tidak Respon',
          title: 'Ganti sensor Pos 2 - PO diajukan',
          finding: 'Sensor TPMS pos 2 mengalami kerusakan fisik pada ulir dan memerlukan penggantian unit baru.',
          sourceType: 'user_report',
          sourceDetail: 'Inspeksi Workshop',
          priority: 'sedang',
          status: 'menunggu_part',
          pic: 'Andi',
          role: 'Teknisi SPM',
          detectedHoursAgo: 9,
          slaTargetHours: 12,
          slaOverdue: false,
          hoursRemaining: 3,
        },
        {
          num: 'TKT-0021',
          unit: 'C04511',
          siteId: mifa2SiteId,
          catCode: 'TVALVE_STUCK',
          catName: 'TValve Macet',
          title: 'Ganti TValve Pos 1 - stok 2 hari',
          finding: 'Katup TValve pos 1 macet dan telah dipesan dari central warehouse.',
          sourceType: 'user_report',
          sourceDetail: 'Pemeriksaan Rutin Workshop',
          priority: 'sedang',
          status: 'menunggu_part',
          pic: 'Andi',
          role: 'Teknisi SPM',
          detectedHoursAgo: 8,
          slaTargetHours: 12,
          slaOverdue: false,
          hoursRemaining: 4,
        },
        {
          num: 'TKT-0019',
          unit: 'C02302',
          siteId: mifa2SiteId,
          catCode: 'SENSOR_FAULT',
          catName: 'Sensor Tidak Respon',
          title: 'Sensor diganti, normal',
          finding: 'Sensor pos 1 telah diganti dengan part cadangan, pembacaan tekanan kembali stabil di 115 PSI.',
          sourceType: 'user_report',
          sourceDetail: 'Work Order Maintenance',
          priority: 'sedang',
          status: 'selesai',
          pic: 'Andi',
          role: 'Teknisi SPM',
          detectedHoursAgo: 48,
          slaTargetHours: 12,
          slaOverdue: false,
          resolvedHoursAgo: 44,
          mttrHours: 4.2,
        },
        {
          num: 'TKT-0017',
          unit: 'C02323',
          siteId: mifa2SiteId,
          catCode: 'UNIT_OFFLINE',
          catName: 'Unit Offline > 24 jam',
          title: 'Unit online kembali',
          finding: 'Kabel antena telematics yang terjepit telah diperbaiki, unit kembali live di monitoring map.',
          sourceType: 'system_detection',
          sourceDetail: 'Server Health Monitor',
          priority: 'tinggi',
          status: 'selesai',
          pic: 'Andi',
          role: 'Teknisi SPM',
          detectedHoursAgo: 72,
          slaTargetHours: 24,
          slaOverdue: false,
          resolvedHoursAgo: 64,
          mttrHours: 7.5,
        },
      ]

      for (const t of sampleTickets) {
        const detectedAt = new Date(Date.now() - t.detectedHoursAgo * 3600 * 1000)
        let targetSlaAt: Date
        if (t.slaOverdue) {
          targetSlaAt = new Date(Date.now() - (t.overdueHours || 2) * 3600 * 1000)
        } else {
          targetSlaAt = new Date(Date.now() + (t.hoursRemaining || 4) * 3600 * 1000)
        }
        const resolvedAt = t.status === 'selesai' ? new Date(Date.now() - (t.resolvedHoursAgo || 2) * 3600 * 1000) : null

        const res = await c.query(
          `INSERT INTO hero_service_desk_tickets 
           (ticket_number, unit_code, site_id, category_name, title, finding_description, source_type, source_detail, priority, status, assigned_employee_name, assigned_role, detected_at, target_sla_at, resolved_at, mttr_hours)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           RETURNING id`,
          [
            t.num,
            t.unit,
            t.siteId,
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

        // Seed activities
        await c.query(
          `INSERT INTO hero_service_desk_activities (ticket_id, actor_name, action_type, title, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            ticketId,
            'Sistem',
            'created',
            'Tiket dibuat oleh sistem',
            `Deteksi otomatis sumber: ${t.sourceDetail}`,
            detectedAt,
          ]
        )

        if (t.pic) {
          await c.query(
            `INSERT INTO hero_service_desk_activities (ticket_id, actor_name, action_type, title, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              ticketId,
              'Supervisor',
              'assigned',
              `Di-assign ke ${t.pic}`,
              `Penugasan otomatis berdasarkan kategori dan ketersediaan teknisi site`,
              new Date(detectedAt.getTime() + 15 * 60 * 1000),
            ]
          )
        }

        if (t.status === 'investigasi' || t.status === 'menunggu_part' || t.status === 'selesai') {
          await c.query(
            `INSERT INTO hero_service_desk_activities (ticket_id, actor_name, action_type, title, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              ticketId,
              t.pic || 'Teknisi',
              'status_changed',
              'Investigasi dimulai',
              'Pemeriksaan fisik sensor dan pembacaan parameter kabel di pit stop',
              new Date(detectedAt.getTime() + 60 * 60 * 1000),
            ]
          )
        }
      }

      console.log('Sample reference tickets seeded successfully!')
    }

    console.log('--- Seeding Done ---')
  } finally {
    c.release()
    await pool.end()
  }
}

seed().catch(console.error)
