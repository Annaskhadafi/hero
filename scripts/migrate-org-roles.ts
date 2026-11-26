import { db } from '../db'
import {
  securityRoles,
  navbarMenuItems,
  roleMenuPermissions,
  masterDepartments,
  masterSections,
} from '../db/schema/hero'
import { eq, asc, inArray } from 'drizzle-orm'

export const ORGANIZATIONAL_ROLE_SEEDS = [
  // 1. Level Eksekutif & Manajemen Puncak
  {
    name: 'Super Admin',
    description: 'Kontrol penuh modul HERO termasuk konfigurasi sistem.',
    scope: 'all_sites',
    deptFocus: ['ALL'],
  },
  {
    name: 'Executive / BoD',
    description: 'Akses eksekutif seluruh site untuk monitoring kinerja korporat, ringkasan KPI eksekutif, dan laporan finansial.',
    scope: 'all_sites',
    deptFocus: ['EXECUTIVE', 'DASHBOARD', 'REPORT'],
  },
  {
    name: 'General Manager',
    description: 'Monitoring dan supervisi operasional lintas departemen, approval operasional tingkat tinggi, dan koordinasi site.',
    scope: 'all_sites',
    deptFocus: ['EXECUTIVE', 'DASHBOARD', 'OPERATION', 'REPORT'],
  },

  // 2. Operasional Site & Central Services
  {
    name: 'PJO SITE',
    description: 'Penanggung Jawab Operasional site, approval SPL, timesheet, dan operasional lapangan.',
    scope: 'site',
    deptFocus: ['SITE', 'TIMESHEET', 'DAILY_ACTIVITY', 'SAFETY', 'APPROVAL'],
  },
  {
    name: 'Site Admin',
    description: 'Operasional site, approval, report, dan koordinasi manpower.',
    scope: 'site',
    deptFocus: ['SITE', 'TIMESHEET', 'DAILY_ACTIVITY', 'GENERAL'],
  },
  {
    name: 'Central Services Manager',
    description: 'Kontrol operasional workshop, perbaikan dan vulkanisir ban (retread), manajemen aset CS, dan technical field support.',
    scope: 'all_sites',
    deptFocus: ['CENTRAL_SERVICE', 'TIRE', 'WORKSHOP', 'ASSET'],
  },
  {
    name: 'Tyre Technician / Field Service',
    description: 'Teknisi lapangan untuk inspeksi ban, pencatatan daily activity, jobcard perbaikan, dan timesheet operasional.',
    scope: 'site',
    deptFocus: ['TIRE', 'DAILY_ACTIVITY', 'TIMESHEET'],
  },

  // 3. Human Capital & General Affair
  {
    name: 'HC Manager',
    description: 'Kontrol user, training, wellness, dan payroll support.',
    scope: 'all_sites',
    deptFocus: ['HRGA', 'USER', 'TRAINING', 'WELLNESS'],
  },
  {
    name: 'HR-GA Officer',
    description: 'Pengelolaan administrasi karyawan, presensi, cuti/izin, kendaraan operasional, ATK, dan fasilitas rental site.',
    scope: 'all_sites',
    deptFocus: ['HRGA', 'GA', 'VEHICLE', 'ATK', 'ATTENDANCE'],
  },
  {
    name: 'Training Specialist',
    description: 'Pengelolaan program pelatihan, kurikulum Chitra Learning LMS, sertifikasi, dan evaluasi kompetensi.',
    scope: 'all_sites',
    deptFocus: ['TRAINING', 'LMS', 'CERTIFICATION'],
  },
  {
    name: 'Wellness Specialist',
    description: 'Pengelolaan program kesehatan kerja karyawan, fit to work, MCU wellness, dan konseling karyawan.',
    scope: 'all_sites',
    deptFocus: ['WELLNESS', 'MCU', 'COUNSELING'],
  },

  // 4. HSE (Health, Safety & Environment)
  {
    name: 'HSE',
    description: 'Akses penuh untuk modul HSE, safety tools, dan MCU Wellness.',
    scope: 'all_sites',
    deptFocus: ['HSE', 'SAFETY', 'WELLNESS'],
  },
  {
    name: 'HSE Manager',
    description: 'Pengawasan kepatuhan K3, persetujuan investigasi insiden, izin kerja risiko tinggi (PTW), dan HIRADC lintas site.',
    scope: 'all_sites',
    deptFocus: ['HSE', 'SAFETY', 'PTW', 'HIRADC', 'INCIDENT'],
  },
  {
    name: 'HSE Officer',
    description: 'Inspeksi keselamatan kerja lapangan, pelaporan bahaya (road hazard/OSM), observasi emergency, dan audit APD.',
    scope: 'all_sites',
    deptFocus: ['HSE', 'SAFETY', 'APD', 'INSPECTION'],
  },

  // 5. Quality & Continuous Improvement (CPI)
  {
    name: 'Quality & CPI Manager',
    description: 'Kontrol penuh modul Quality & CPI, audit 5R, Continuous Improvement, dan master area.',
    scope: 'all_sites',
    deptFocus: ['QUALITY', 'CPI', '5R', 'SOP_WIN'],
  },
  {
    name: 'Quality Auditor',
    description: 'Pelaksanaan audit 5R lapangan, input temuan, dan monitoring perbaikan.',
    scope: 'site',
    deptFocus: ['QUALITY', '5R'],
  },
  {
    name: 'Internal Audit Representative',
    description: 'Pemeriksaan kepatuhan prosedur, evaluasi proses bisnis, dan audit kepatuhan tata kelola perusahaan.',
    scope: 'all_sites',
    deptFocus: ['QUALITY', 'AUDIT', 'SOP_WIN', 'PROCEDURE'],
  },

  // 6. Finance & Accounting
  {
    name: 'Finance & Accounting',
    description: 'Akses modul keuangan, CER, dan Budget Controller.',
    scope: 'all_sites',
    deptFocus: ['FINANCE', 'CER', 'BUDGET'],
  },
  {
    name: 'Finance & Accounting Manager',
    description: 'Otorisasi anggaran, review laporan keuangan, approval CER, dan perencanaan finansial korporat.',
    scope: 'all_sites',
    deptFocus: ['FINANCE', 'CER', 'BUDGET', 'REPORT'],
  },
  {
    name: 'Accounting & Asset Officer',
    description: 'Pengelolaan pembukuan, pencatatan aset tetap, verifikasi faktur tagihan, dan rekonsiliasi keuangan.',
    scope: 'all_sites',
    deptFocus: ['FINANCE', 'ACCOUNTING', 'ASSET'],
  },
  {
    name: 'Treasury & Billing Officer',
    description: 'Pengelolaan arus kas, penagihan invoice pelanggan, pembayaran vendor operasional, dan pengelolaan kas kecil.',
    scope: 'all_sites',
    deptFocus: ['FINANCE', 'TREASURY', 'BILLING', 'INVOICE'],
  },

  // 7. Supply Chain & Logistik
  {
    name: 'Supply Chain Manager',
    description: 'Supervisi rantai pasok terpadu, perencanaan kebutuhan material, manajemen logistik, dan kepatuhan pengadaan.',
    scope: 'all_sites',
    deptFocus: ['SUPPLY_CHAIN', 'PROCUREMENT', 'WAREHOUSE', 'LOGISTIC'],
  },
  {
    name: 'Procurement Officer',
    description: 'Pengadaan barang/jasa, pengajuan PO/RFR, pembelian ATK & APD, dan evaluasi vendor.',
    scope: 'all_sites',
    deptFocus: ['PROCUREMENT', 'RFR', 'ATK', 'APD'],
  },
  {
    name: 'Warehouse & Inventory Officer',
    description: 'Pengelolaan gudang, stock opname material, pencatatan mutasi barang masuk/keluar, dan cargo manifest.',
    scope: 'all_sites',
    deptFocus: ['WAREHOUSE', 'INVENTORY', 'LOGISTIC', 'CARGO'],
  },

  // 8. Sales Operation
  {
    name: 'Sales Operation Manager',
    description: 'Monitoring pergerakan sales nasional/regional, persetujuan penawaran harga, dan supervisi kuotasi MAESTRO.',
    scope: 'all_sites',
    deptFocus: ['SALES', 'MAESTRO', 'CUSTOMER'],
  },
  {
    name: 'Sales Specialist',
    description: 'Manajemen relasi pelanggan, monitoring order, penawaran harga, dan pencarian prospek pasar.',
    scope: 'all_sites',
    deptFocus: ['SALES', 'MAESTRO', 'CUSTOMER'],
  },

  // 9. Operasional Umum & Penugasan
  {
    name: 'Manager',
    description: 'Akses operasional department manager (monitoring, approval).',
    scope: 'site',
    deptFocus: ['GENERAL', 'APPROVAL', 'MONITORING'],
  },
  {
    name: 'Khusus Mas Rendi',
    description: 'Role spesial untuk Mas Rendi dengan akses ke inventory asset dan fitur kustom.',
    scope: 'all_sites',
    deptFocus: ['ALL'],
  },
]

async function run() {
  console.log('--- 1. Syncing Roles into securityRoles ---')
  const currentRoles = await db.select().from(securityRoles)
  const roleMapByName = new Map(currentRoles.map((r) => [r.name.trim().toLowerCase(), r]))

  let insertedCount = 0
  for (const seed of ORGANIZATIONAL_ROLE_SEEDS) {
    const key = seed.name.trim().toLowerCase()
    if (!roleMapByName.has(key)) {
      const [inserted] = await db
        .insert(securityRoles)
        .values({
          name: seed.name,
          description: seed.description,
          scope: seed.scope,
        })
        .returning()
      console.log(`+ Created role: "${seed.name}" (ID: ${inserted.id})`)
      roleMapByName.set(key, inserted)
      insertedCount++
    } else {
      // Update description / scope if needed
      const existing = roleMapByName.get(key)!
      await db
        .update(securityRoles)
        .set({
          description: seed.description,
          scope: seed.scope,
        })
        .where(eq(securityRoles.id, existing.id))
    }
  }
  console.log(`Total new roles created: ${insertedCount}`)

  console.log('\n--- 2. Fetching all Navbar Menu Items ---')
  const allMenuItems = await db.select().from(navbarMenuItems).orderBy(asc(navbarMenuItems.id))
  console.log(`Found ${allMenuItems.length} navbar menu items.`)

  console.log('\n--- 3. Ensuring roleMenuPermissions for every role ---')
  const allRoles = await db.select().from(securityRoles).orderBy(asc(securityRoles.name))
  const existingPermissions = await db.select().from(roleMenuPermissions)
  const permSet = new Set(existingPermissions.map((p) => `${p.roleId}-${p.menuItemId}`))

  let newPermsCount = 0
  const permsToInsert: Array<{
    roleId: number
    menuItemId: number
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canSelectAll: boolean
    dataScope: string
  }> = []

  for (const role of allRoles) {
    const roleLower = role.name.toLowerCase()
    const isSuperAdmin = roleLower.includes('super admin') || roleLower.includes('khusus mas rendi')
    const isExec = roleLower.includes('executive') || roleLower.includes('general manager')
    const isHse = roleLower.includes('hse')
    const isHc = roleLower.includes('hc') || roleLower.includes('hr') || roleLower.includes('training') || roleLower.includes('wellness')
    const isFinance = roleLower.includes('finance') || roleLower.includes('accounting') || roleLower.includes('treasury')
    const isSupply = roleLower.includes('supply') || roleLower.includes('procurement') || roleLower.includes('warehouse')
    const isQuality = roleLower.includes('quality') || roleLower.includes('audit')
    const isSales = roleLower.includes('sales')
    const isSiteOrField = roleLower.includes('site') || roleLower.includes('field') || roleLower.includes('tyre') || roleLower.includes('pjo') || roleLower.includes('central services')

    for (const item of allMenuItems) {
      const key = `${role.id}-${item.id}`
      if (permSet.has(key)) continue

      const sectionLower = (item.section || '').toLowerCase()
      const titleLower = (item.title || '').toLowerCase()
      const urlLower = (item.url || '').toLowerCase()

      let canView = false
      let canEdit = false

      if (isSuperAdmin) {
        canView = true
        canEdit = true
      } else if (isExec) {
        // Executives can view almost everything, edit selective
        canView = !sectionLower.includes('pengaturan') && !sectionLower.includes('security')
        canEdit = sectionLower.includes('approval') || sectionLower.includes('executive')
      } else if (isHse && (sectionLower.includes('hse') || titleLower.includes('safety') || titleLower.includes('apd') || titleLower.includes('wellness') || titleLower.includes('hazard') || titleLower.includes('ptw'))) {
        canView = true
        canEdit = true
      } else if (isHc && (sectionLower.includes('hrga') || sectionLower.includes('hc') || titleLower.includes('karyawan') || titleLower.includes('lms') || titleLower.includes('wellness') || titleLower.includes('curhat') || titleLower.includes('training') || titleLower.includes('attendance'))) {
        canView = true
        canEdit = true
      } else if (isFinance && (sectionLower.includes('finance') || sectionLower.includes('accounting') || titleLower.includes('faktur') || titleLower.includes('invoice') || titleLower.includes('budget') || titleLower.includes('cer'))) {
        canView = true
        canEdit = true
      } else if (isSupply && (sectionLower.includes('supply') || sectionLower.includes('warehouse') || titleLower.includes('atk') || titleLower.includes('inventory') || titleLower.includes('manifest') || titleLower.includes('material') || titleLower.includes('procurement') || titleLower.includes('rfr'))) {
        canView = true
        canEdit = true
      } else if (isQuality && (sectionLower.includes('quality') || titleLower.includes('5r') || titleLower.includes('sop') || titleLower.includes('win') || titleLower.includes('cpi'))) {
        canView = true
        canEdit = true
      } else if (isSales && (sectionLower.includes('sales') || titleLower.includes('customer') || titleLower.includes('maestro') || titleLower.includes('quotation'))) {
        canView = true
        canEdit = true
      } else if (isSiteOrField && (sectionLower.includes('central service') || titleLower.includes('timesheet') || titleLower.includes('daily activity') || titleLower.includes('presensi') || titleLower.includes('tire') || titleLower.includes('jobcard') || titleLower.includes('my day'))) {
        canView = true
        canEdit = true
      }

      // Universal items (Helpdesk, Profil, Dashboard utama)
      if (titleLower.includes('dashboard') || titleLower.includes('profil') || titleLower.includes('helpdesk') || titleLower.includes('my day') || urlLower === '/dashboard') {
        canView = true
      }

      permsToInsert.push({
        roleId: role.id,
        menuItemId: item.id,
        canView,
        canEdit,
        canDelete: isSuperAdmin,
        canSelectAll: isSuperAdmin,
        dataScope: role.scope === 'site' ? 'site' : 'all',
      })
      permSet.add(key)
      newPermsCount++
    }
  }

  if (permsToInsert.length > 0) {
    // Chunk insert by 500 rows
    const chunkSize = 400
    for (let i = 0; i < permsToInsert.length; i += chunkSize) {
      const chunk = permsToInsert.slice(i, i + chunkSize)
      await db.insert(roleMenuPermissions).values(chunk)
    }
  }

  console.log(`Inserted ${newPermsCount} new roleMenuPermissions records.`)
  console.log('\n--- 4. Summary of All Active Roles in HERO ---')
  const finalRoles = await db.select().from(securityRoles).orderBy(asc(securityRoles.name))
  for (const r of finalRoles) {
    console.log(`• [${r.scope}] ${r.name}: ${r.description}`)
  }

  process.exit(0)
}

run().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})
