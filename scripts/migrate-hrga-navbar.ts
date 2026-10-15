import { db } from '@/db'
import { navbarMenuItems } from '@/db/schema/hero'
import { eq, or } from 'drizzle-orm'

async function migrate() {
  console.log('🚀 Starting HRGA Navbar Reorganization Migration...')

  const updates = [
    // 1. Data & Akses Karyawan
    {
      resource: 'security_users',
      url: '/dashboard/security/users',
      section: 'HRGA',
      groupLabel: 'Data & Akses Karyawan',
      title: 'User Management',
      sortOrder: 1,
      menuArea: 'main',
    },
    {
      resource: 'hc_employee',
      url: '/dashboard/hc/employee',
      section: 'HRGA',
      groupLabel: 'Data & Akses Karyawan',
      title: 'Data Karyawan',
      sortOrder: 2,
      menuArea: 'main',
    },
    {
      resource: 'hc_org_chart_v2',
      url: '/dashboard/hc/org-chart-v2',
      section: 'HRGA',
      groupLabel: 'Data & Akses Karyawan',
      title: 'Org Structure V2',
      sortOrder: 3,
      menuArea: 'main',
    },
    {
      resource: 'hc_contract_review',
      url: '/dashboard/hc/contract-review',
      section: 'HRGA',
      groupLabel: 'Data & Akses Karyawan',
      title: 'Contract Review',
      sortOrder: 4,
      menuArea: 'main',
    },
    {
      resource: 'hc_safety',
      url: '/dashboard/hc',
      section: 'HRGA',
      groupLabel: 'Data & Akses Karyawan',
      title: 'HC Overview',
      sortOrder: 5,
      menuArea: 'main',
    },

    // 2. Layanan & Personalia
    {
      resource: 'hr_counseling_user',
      url: '/dashboard/curhat',
      section: 'HRGA',
      groupLabel: 'Layanan & Personalia',
      title: 'Pengaduan',
      sortOrder: 6,
      menuArea: 'main',
    },
    {
      resource: 'hr_counseling_admin',
      url: '/dashboard/hr-counseling',
      section: 'HRGA',
      groupLabel: 'Layanan & Personalia',
      title: 'Dashboard Pengaduan HR',
      sortOrder: 7,
      menuArea: 'main',
    },
    {
      resource: 'hc_surat',
      url: '/dashboard/hc/surat',
      section: 'HRGA',
      groupLabel: 'Layanan & Personalia',
      title: 'Surat',
      sortOrder: 8,
      menuArea: 'main',
    },
    {
      resource: 'hc_attendance_permission',
      url: '/dashboard/hc/permission',
      section: 'HRGA',
      groupLabel: 'Layanan & Personalia',
      title: 'Izin Sakit & Terlambat',
      sortOrder: 9,
      menuArea: 'main',
    },
    {
      resource: 'hc_flight_route_change',
      url: '/dashboard/hc/flight-route-change',
      section: 'HRGA',
      groupLabel: 'Layanan & Personalia',
      title: 'Perubahan Rute',
      sortOrder: 10,
      menuArea: 'main',
    },
    {
      resource: 'hc_disciplinary',
      url: '/dashboard/hc/disciplinary',
      section: 'HRGA',
      groupLabel: 'Layanan & Personalia',
      title: 'Disciplinary',
      sortOrder: 11,
      menuArea: 'main',
    },
    {
      resource: 'hc_mcu_wellness',
      url: '/dashboard/hc/mcu-wellness',
      section: 'HRGA',
      groupLabel: 'Layanan & Personalia',
      title: 'MCU Wellness',
      sortOrder: 12,
      menuArea: 'main',
    },

    // 3. General Affairs (GA)
    {
      resource: 'central_service_marital_status',
      url: '/dashboard/central-service/marital-status',
      section: 'HRGA',
      groupLabel: 'General Affairs (GA)',
      title: 'Pergantian Status Pernikahan',
      sortOrder: 13,
      menuArea: 'main',
    },
    {
      resource: 'apd-request',
      url: '/dashboard/apd',
      section: 'HRGA',
      groupLabel: 'General Affairs (GA)',
      title: 'Request Barang / APD',
      sortOrder: 14,
      menuArea: 'main',
    },
    {
      resource: 'central_service_refueling',
      url: '/dashboard/central-service/refueling',
      section: 'HRGA',
      groupLabel: 'General Affairs (GA)',
      title: 'Re-Fueling LV',
      sortOrder: 15,
      menuArea: 'main',
    },

    // 4. Rekrutmen
    {
      resource: 'hc_rfr',
      url: '/dashboard/hc/rfr',
      section: 'HRGA',
      groupLabel: 'Rekrutmen',
      title: 'Request For Recruitment',
      sortOrder: 16,
      menuArea: 'main',
    },
    {
      resource: 'hc_recruitment',
      url: '/dashboard/hc/recruitment',
      section: 'HRGA',
      groupLabel: 'Rekrutmen',
      title: 'Recruitment',
      sortOrder: 17,
      menuArea: 'main',
    },
    {
      resource: 'hc_recruitment_tests',
      url: '/dashboard/hc/recruitment/tests',
      section: 'HRGA',
      groupLabel: 'Rekrutmen',
      title: 'Online Tests',
      sortOrder: 18,
      menuArea: 'main',
    },

    // 5. Kinerja & KPI
    {
      resource: 'hc_performance',
      url: '/dashboard/hc/performance',
      section: 'HRGA',
      groupLabel: 'Kinerja & KPI',
      title: 'Performance',
      sortOrder: 19,
      menuArea: 'main',
    },
    {
      resource: 'hc_leader_performance',
      url: '/dashboard/hc/leader-performance',
      section: 'HRGA',
      groupLabel: 'Kinerja & KPI',
      title: 'Leader Performance',
      sortOrder: 20,
      menuArea: 'main',
    },

    // 6. Poin & Hadiah
    {
      resource: 'point_setting',
      url: '/dashboard/leaderboard',
      section: 'Poin & Hadiah',
      groupLabel: 'Poin & Hadiah',
      title: 'Point Dashboard',
      sortOrder: 1,
      menuArea: 'main',
    },
    {
      resource: 'reward_store',
      url: '/dashboard/reward-store',
      section: 'Poin & Hadiah',
      groupLabel: 'Poin & Hadiah',
      title: 'Toko Hadiah Poin',
      sortOrder: 2,
      menuArea: 'main',
    },

    // 7. ChitraLearning & Training
    {
      resource: 'chitralearning_lms_workspace',
      url: '/dashboard/chitralearning-lms',
      section: 'ChitraLearning & Training',
      groupLabel: 'ChitraLearning LMS',
      title: 'Learning Workspace',
      sortOrder: 1,
      menuArea: 'main',
    },
    {
      resource: 'chitralearning_lms_builder',
      url: '/dashboard/chitralearning-lms/courses/new',
      section: 'ChitraLearning & Training',
      groupLabel: 'ChitraLearning LMS',
      title: 'Course Builder',
      sortOrder: 2,
      menuArea: 'main',
    },
    {
      resource: 'chitralearning_lms_management',
      url: '/dashboard/chitralearning-lms/management',
      section: 'ChitraLearning & Training',
      groupLabel: 'ChitraLearning LMS',
      title: 'Section Management',
      sortOrder: 3,
      menuArea: 'main',
    },
    {
      resource: 'chitralearning_lms_campaigns',
      url: '/dashboard/chitralearning-lms/campaigns',
      section: 'ChitraLearning & Training',
      groupLabel: 'ChitraLearning LMS',
      title: 'Campaigns',
      sortOrder: 4,
      menuArea: 'main',
    },
    {
      resource: 'hc_training_enhanced',
      url: '/dashboard/hc/training',
      section: 'ChitraLearning & Training',
      groupLabel: 'Training',
      title: 'Training Enhancement',
      sortOrder: 5,
      menuArea: 'main',
    },
    {
      resource: 'training_records',
      url: '/dashboard/training-records',
      section: 'ChitraLearning & Training',
      groupLabel: 'Training',
      title: 'Training Records',
      sortOrder: 6,
      menuArea: 'main',
    },
  ]

  let count = 0
  for (const item of updates) {
    const res = await db
      .update(navbarMenuItems)
      .set({
        section: item.section,
        groupLabel: item.groupLabel,
        title: item.title,
        sortOrder: item.sortOrder,
        menuArea: item.menuArea,
        isVisible: true,
      })
      .where(or(eq(navbarMenuItems.resource, item.resource), eq(navbarMenuItems.url, item.url)))
      .returning({ id: navbarMenuItems.id, title: navbarMenuItems.title, section: navbarMenuItems.section })

    if (res.length > 0) {
      count++
      console.log(`✅ [${item.section}] ${item.title} -> Updated (id: ${res[0].id})`)
    } else {
      console.log(`⚠️ [${item.section}] ${item.title} (${item.url}) -> Not found in DB, inserting...`)
      await db.insert(navbarMenuItems).values({
        section: item.section,
        groupLabel: item.groupLabel,
        title: item.title,
        url: item.url,
        sortOrder: item.sortOrder,
        menuArea: item.menuArea,
        resource: item.resource,
        iconName: 'users',
        isVisible: true,
        openInNewTab: false,
      })
      count++
    }
  }

  console.log(`\n🎉 HRGA Navbar Migration completed! Updated/ensured ${count} items.`)
  process.exit(0)
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
