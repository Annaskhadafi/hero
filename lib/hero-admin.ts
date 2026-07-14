import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm'
import Fuse from 'fuse.js'
import { db } from '@/db'
import {
  activities,
  approvals,
  auditLogs,
  attendanceRecords,
  dailyReports,
  emailDeliveryLogs,
  emailSmtpSettings,
  emailTemplates,
  employees,
  hseIncidents,
  hseObservations,
  masterAttendanceShifts,
  masterDepartments,
  masterPositions,
  masterSections,
  navbarMenuItems,
  navbarGroupLabelStyles,
  navbarThemes,
  orgChartNodes,
  orgChartStructures,
  orgNodeAssignments,
  overtimeCommandLetterItems,
  overtimeCommandLetters,
  pointEvents,
  penaltyEvents,
  pointDisputes,
  levels,
  badges,
  employeeBadges,
  hrDepartments,
  hrOrgNodes,
  hrPositions,
  hrSections,
  hcNotificationConfig,
  hseSafetyNotificationConfig,
  notificationChannelRules,
  notificationChannelSettings,
  notificationDeliveries,
  notificationPushSubscriptions,
  notificationUserPreferences,
  approvalMatrices,
  approvalMatrixSteps,
  portalChitraApps,
  roleMenuPermissions,
  securityPermissions,
  securityRolePermissions,
  securityRoles,
  sites,
  timesheetEntries,
  trainingRecords,
  sioCertifications,
  wellnessRecords,
} from '@/db/schema/hero'
import { session, user as authUser } from '@/db/schema/auth'
import { getServerSession } from '@/lib/auth-session'
import {
  timesheetAttendanceImportPreviews,
  timesheetAttendanceRealOverrides,
  timesheetFieldBreakPlans,
  timesheetSchedulingConfigs,
  timesheetSchedulingPlans,
  timesheetSchedulingPlansV2,
  timesheetSchedulingStatuses,
} from '@/db/schema/timesheet'
import { ensureApprovalBlueprintSeedData } from '@/lib/approval-blueprint'
import {
  getCurrentEmployeeAccessContext,
  getCurrentMenuPermission,
  hasGlobalDataAccess,
} from '@/lib/hero-access'
import {
  ensureMasterCategoryTables,
  getActiveMasterCategoryOptionMap,
} from '@/lib/master-categories'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
import { mergeActiveSchedulePlans, type ScheduleV2Row } from '@/lib/timesheet/schedule-v2'
import { ensureDepartmentSectionSeedData } from '@/lib/org-seed-data'

let seedPromise: Promise<void> | null = null
let governanceSeedPromise: Promise<void> | null = null

export type SecurityUserRecord = {
  id: number
  siteId: number | null
  employeeSn: string
  joinYear: number
  name: string
  profileImage: string | null
  birthPlaceDate: string
  domicile: string
  directManagerId: number | null
  directManagerName: string | null
  section: string
  sectionId: number | null
  department: string
  departmentId: number | null
  jobTitle: string
  workLocation: string
  phoneNumber: string
  email: string
  status: string
  role: string
  accessRole: string
  employeeStatusType: string
  levelName: string
  fitStatus: string
  isActive: boolean
  siteName: string
  totalPoints: number
  contractEnd: string | null
  gender: string
  religion: string
  education: string
  maritalStatus: string
  pointOfHire: string
  joinDate: string | null
  contractDurationStart: string | null
  contractDurationEnd: string | null
  permanentDate: string | null
  birthDate: string | null
}

export async function getSecurityUserReferenceData() {
  const [sections, departments, positions, sitesData] = await Promise.all([
    db
      .select({
        id: hrSections.id,
        code: hrSections.code,
        name: hrSections.name,
        departmentId: hrSections.departmentId,
      })
      .from(hrSections)
      .where(eq(hrSections.isActive, true))
      .orderBy(asc(hrSections.name)),
    db
      .select({
        id: hrDepartments.id,
        code: hrDepartments.code,
        name: hrDepartments.name,
      })
      .from(hrDepartments)
      .where(eq(hrDepartments.isActive, true))
      .orderBy(asc(hrDepartments.name)),
    db
      .select({
        id: hrPositions.id,
        code: hrPositions.code,
        name: hrPositions.rankName,
        siteLocation: sql<string>`''`.as('site_location'),
        level: sql<number>`1`.as('level'),
        departmentId: sql<number | null>`null`.as('department_id'),
      })
      .from(hrPositions)
      .where(eq(hrPositions.isActive, true))
      .orderBy(asc(hrPositions.rankName), asc(hrPositions.levelName)),
    db
      .select({
        id: sites.id,
        name: sites.name,
        location: sites.name,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name)),
  ])

  return {
    sections,
    departments,
    positions,
    sites: sitesData,
  }
}

export type SecurityRoleMenuPermissionRecord = {
  id: number
  roleId: number
  menuItemId: number
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
}

function toCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function minutesToHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} jam`
}

function normalizeLookupValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

async function ensureHeroEmployeeProfileColumns() {
  await db.execute(sql`
    alter table hero_employees add column if not exists employee_sn text not null default '';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists join_year integer not null default extract(year from current_date)::int;
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists birth_place_date text not null default '';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists domicile text not null default '';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists direct_manager_id integer;
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists section text not null default '';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists job_title text not null default '';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists work_location text not null default '';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists phone_number text not null default '';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists employment_status text not null default 'active';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists employee_status_type text not null default 'Permanen | Staff';
  `)
  await db.execute(sql`
    alter table hero_employees add column if not exists access_role text not null default 'Site Admin';
  `)

  await db.execute(sql`
    update hero_employees
    set
      employee_sn = coalesce(nullif(employee_sn, ''), 'EMP-' || lpad(id::text, 4, '0')),
      join_year = coalesce(join_year, extract(year from created_at)::int, extract(year from current_date)::int),
      birth_place_date = coalesce(birth_place_date, ''),
      domicile = coalesce(nullif(domicile, ''), 'Belum diisi'),
      section = coalesce(nullif(section, ''), department),
      job_title = coalesce(nullif(job_title, ''), role),
      work_location = coalesce(work_location, ''),
      phone_number = coalesce(phone_number, ''),
      employment_status = coalesce(nullif(employment_status, ''), case when is_active then 'active' else 'inactive' end),
      access_role = coalesce(nullif(access_role, ''), 'Site Admin');
  `)
}

async function ensureHeroSiteLocationColumns() {
  await db.execute(sql`
    alter table hero_sites add column if not exists province_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists province_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists district_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists district_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists village_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists village_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists address_detail text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists geo_latitude text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists geo_longitude text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists geo_radius_meters integer not null default 500;
  `)
}

async function ensureEmergencyIncidentColumns() {
  await db.execute(sql`
    alter table hero_hse_incidents add column if not exists employee_id integer references hero_employees(id) on delete set null;
  `)

  await db.execute(sql`
    alter table hero_hse_incidents add column if not exists location text not null default '';
  `)

  await db.execute(sql`
    alter table hero_hse_incidents add column if not exists latitude text not null default '';
  `)

  await db.execute(sql`
    alter table hero_hse_incidents add column if not exists longitude text not null default '';
  `)

  await db.execute(sql`
    alter table hero_hse_incidents add column if not exists notes text not null default '';
  `)

  await db.execute(sql`
    alter table hero_hse_incidents add column if not exists photo_url text not null default '';
  `)

  await db.execute(sql`
    alter table hero_hse_incidents add column if not exists alert_status text not null default 'pending';
  `)
}

async function ensureTrainingRecordHistoryColumns() {
  await db.execute(sql`
    alter table hero_training_records add column if not exists completed_year integer;
  `)

  await db.execute(sql`
    update hero_training_records
    set completed_year = coalesce(completed_year, extract(year from coalesce(expires_at, now()))::int)
    where completed_year is null;
  `)

  await db.execute(sql`
    alter table hero_training_records alter column completed_year set default extract(year from current_date)::int;
  `)

  await db.execute(sql`
    alter table hero_training_records alter column completed_year set not null;
  `)

  await db.execute(sql`
    alter table hero_training_records alter column expires_at drop not null;
  `)
}

const GOVERNANCE_ROLE_SEEDS = [
  {
    name: 'Super Admin',
    description: 'Kontrol penuh modul HERO termasuk konfigurasi sistem.',
    scope: 'all_sites',
  },
  {
    name: 'Site Admin',
    description: 'Operasional site, approval, report, dan koordinasi manpower.',
    scope: 'site',
  },
  {
    name: 'HC Manager',
    description: 'Kontrol user, training, wellness, dan payroll support.',
    scope: 'all_sites',
  },
  {
    name: 'HSE',
    description: 'Akses penuh untuk modul HSE, safety tools, dan MCU Wellness.',
    scope: 'all_sites',
  },
]

const RAW_SIDEBAR_MENU_SEEDS = [
  // 360 Service
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Technical',
    title: 'Tire Site Inspection',
    url: '/dashboard/hse/tire-inspection',
    iconName: 'camera',
    resource: 'hse_tire_inspection',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Assets',
    title: 'Asset Management',
    url: '/dashboard/central-service/assets',
    iconName: 'database',
    resource: 'central-service-assets',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: '360 Service',
    title: 'Master Customers',
    url: '/dashboard/360-service/customers',
    iconName: 'users',
    resource: 'service360_customers',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: '360 Service',
    title: 'Master Items (Barang/Service)',
    url: '/dashboard/360-service/items',
    iconName: 'packages',
    resource: 'service360_items',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: '360 Service',
    title: 'Quotations',
    url: '/dashboard/360-service/quotations',
    iconName: 'file-text',
    resource: 'service360_quotations',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: '360 Service',
    title: 'Service Form',
    url: '/dashboard/360-service/service-form',
    iconName: 'checklist',
    resource: 'service360_service_form',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  // Portal Chitra
  {
    menuArea: 'main',
    section: 'Portal Chitra',
    title: 'Portal Chitra',
    url: '/dashboard/portal-chitra',
    iconName: 'dashboard',
    resource: 'portal_chitra',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  // Aktivitas Harian
  {
    menuArea: 'main',
    section: 'Aktivitas Harian',
    groupLabel: 'Section Head - Input Pekerjaan',
    title: 'Input Aktivitas Harian',
    url: '/dashboard/activity-hub/my-day',
    iconName: 'dashboard',
    resource: 'tire_service',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Aktivitas Harian',
    groupLabel: 'Section Head - Input Pekerjaan',
    title: 'Monitoring Tim & SPL',
    url: '/dashboard/activity-hub/team-board',
    iconName: 'list-details',
    resource: 'tire_repair',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Aktivitas Harian',
    groupLabel: 'Setup Pekerjaan & Poin',
    title: 'Kamus Aktivitas',
    url: '/dashboard/activity-hub/library',
    iconName: 'database',
    resource: 'activity_library',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Aktivitas Harian',
    groupLabel: 'Setup Pekerjaan & Poin',
    title: 'Route Template Harian',
    url: '/dashboard/activity-hub/routes',
    iconName: 'list-details',
    resource: 'activity_routes',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Aktivitas Harian',
    groupLabel: 'Setup Pekerjaan & Poin',
    title: 'Rule Aktivitas Global',
    url: '/dashboard/activity-hub/configuration',
    iconName: 'settings',
    resource: 'activity_configuration',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Aktivitas Harian',
    groupLabel: 'Lembur & Timesheet',
    title: 'Pengajuan Lembur (Request)',
    url: '/dashboard/overtime-requests',
    iconName: 'checklist',
    resource: 'overtime_requests',
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Aktivitas Harian',
    groupLabel: 'Lembur & Timesheet',
    title: 'Timesheet Realisasi',
    url: '/dashboard/timesheet',
    iconName: 'folder',
    resource: 'tire_engineer',
    sortOrder: 7,
    isVisible: true,
    openInNewTab: false,
  },
  // Roster & Timesheet
  {
    menuArea: 'main',
    section: 'Roster & Timesheet',
    title: 'Overview Roster',
    url: '/dashboard/scheduling-timesheet',
    iconName: 'clock',
    resource: 'scheduling_timesheet',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Roster & Timesheet',
    title: 'Konfigurasi Roster, OT dan Meals',
    url: '/dashboard/scheduling-timesheet/setup',
    iconName: 'settings',
    resource: 'scheduling_timesheet_setup',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Roster & Timesheet',
    title: 'Schedule v2',
    url: '/dashboard/scheduling-timesheet/schedule-v2',
    iconName: 'clock',
    resource: 'scheduling_timesheet_schedule_v2',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Roster & Timesheet',
    title: 'Field Break Schedule',
    url: '/dashboard/scheduling-timesheet/field-break',
    iconName: 'list-details',
    resource: 'scheduling_timesheet_field_break',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Roster & Timesheet',
    title: 'Payroll Timesheet',
    url: '/dashboard/scheduling-timesheet/payroll',
    iconName: 'report',
    resource: 'scheduling_timesheet_payroll',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  // Approval
  {
    menuArea: 'main',
    section: 'Approval',
    groupLabel: 'PJO / Atasan Review',
    title: 'Approval Inbox',
    url: '/dashboard/approval',
    iconName: 'mail',
    resource: 'approval_inbox',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Approval',
    groupLabel: 'PJO / Atasan Review',
    title: 'Request Center',
    url: '/dashboard/request-center',
    iconName: 'folder',
    resource: 'request_center',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Approval',
    groupLabel: 'Setup Approval',
    title: 'Approval Workflow Builder',
    url: '/dashboard/workflow-studio',
    iconName: 'list-details',
    resource: 'workflow_studio',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Approval',
    groupLabel: 'Notification & Reminder',
    title: 'Notification Center',
    url: '/dashboard/notifications',
    iconName: 'mail',
    resource: 'notification_center',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  // Data Induk
  {
    menuArea: 'secondary',
    section: 'Data Induk',
    title: 'Master Data',
    url: '/dashboard/master-data',
    iconName: 'database',
    resource: 'master_data',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Data Induk',
    title: 'Form Builder',
    url: '/dashboard/form-studio',
    iconName: 'file-word',
    resource: 'form_studio',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  // Human Capital
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Karyawan',
    title: 'Curhat Dengan HR',
    url: '/dashboard/curhat',
    iconName: 'users',
    resource: 'hr_counseling_user',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'Dashboard Curhat HR',
    url: '/dashboard/hr-counseling',
    iconName: 'users',
    resource: 'hr_counseling_admin',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'HC Overview',
    url: '/dashboard/hc',
    iconName: 'users',
    resource: 'hc_safety',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Management',
    title: 'Employee Data',
    url: '/dashboard/hc/employee',
    iconName: 'users',
    resource: 'hc_employee',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'Central Service',
    url: '/dashboard/central-service',
    iconName: 'database',
    resource: 'central_service',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },

  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'Surat',
    url: '/dashboard/hc/surat',
    iconName: 'file-word',
    resource: 'hc_surat',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'Izin Sakit & Terlambat',
    url: '/dashboard/hc/permission',
    iconName: 'shield-alert',
    resource: 'hc_attendance_permission',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'Contract Review',
    url: '/dashboard/hc/contract-review',
    iconName: 'file-signature',
    resource: 'hc_contract_review',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'Disciplinary',
    url: '/dashboard/hc/disciplinary',
    iconName: 'shield-alert',
    resource: 'hc_disciplinary',
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'Org Structure V2',
    url: '/dashboard/hc/org-chart-v2',
    iconName: 'list-details',
    resource: 'hc_org_chart_v2',
    sortOrder: 7,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'HR Operational',
    title: 'MCU Wellness',
    url: '/dashboard/hc/mcu-wellness',
    iconName: 'heart-pulse',
    resource: 'hc_mcu_wellness',
    sortOrder: 9,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Recruitment Management',
    title: 'Recruitment',
    url: '/dashboard/hc/recruitment',
    iconName: 'users',
    resource: 'hc_recruitment',
    sortOrder: 8,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Recruitment Management',
    title: 'Online Tests',
    url: '/dashboard/hc/recruitment/tests',
    iconName: 'file-text',
    resource: 'hc_recruitment_tests',
    sortOrder: 9,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Training Center',
    title: 'Training Enhancement',
    url: '/dashboard/hc/training',
    iconName: 'target',
    resource: 'hc_training_enhanced',
    sortOrder: 10,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Training Center',
    title: 'Training Records',
    url: '/dashboard/training-records',
    iconName: 'list-details',
    resource: 'training_records',
    sortOrder: 11,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'ChitraLearning LMS',
    groupLabel: 'Internal LMS Baru',
    title: 'Learning Workspace',
    url: '/dashboard/chitralearning-lms',
    iconName: 'book-open',
    resource: 'chitralearning_lms_workspace',
    sortOrder: 1,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'ChitraLearning LMS',
    groupLabel: 'Internal LMS Baru',
    title: 'Course Builder',
    url: '/dashboard/chitralearning-lms/courses/new',
    iconName: 'hammer',
    resource: 'chitralearning_lms_builder',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'ChitraLearning LMS',
    groupLabel: 'Internal LMS Baru',
    title: 'Section Management',
    url: '/dashboard/chitralearning-lms/management',
    iconName: 'settings',
    resource: 'chitralearning_lms_management',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'ChitraLearning LMS',
    groupLabel: 'Internal LMS Baru',
    title: 'Campaigns',
    url: '/dashboard/chitralearning-lms/campaigns',
    iconName: 'megaphone',
    resource: 'chitralearning_lms_campaigns',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Performance & Development',
    title: 'Performance',
    url: '/dashboard/hc/performance',
    iconName: 'trending-up',
    resource: 'hc_performance',
    sortOrder: 13,
    isVisible: true,
    openInNewTab: false,
  },

  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Performance & Development',
    title: 'Leader Performance',
    url: '/dashboard/hc/leader-performance',
    iconName: 'users',
    resource: 'hc_leader_performance',
    sortOrder: 16,
    isVisible: true,
    openInNewTab: false,
  },
  // Attendance
  {
    menuArea: 'secondary',
    section: 'Attendance',
    title: 'Live / Import',
    url: '/dashboard/attendance',
    iconName: 'clock',
    resource: 'attendance',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Attendance',
    title: 'Live Map Attendance',
    url: '/dashboard/attendance/live-map',
    iconName: 'map-2',
    resource: 'attendance_live_map',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Attendance',
    title: 'Records',
    url: '/dashboard/attendance/records',
    iconName: 'clock',
    resource: 'attendance_records',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Attendance',
    title: 'Exceptions',
    url: '/dashboard/scheduling-timesheet/permission',
    iconName: 'shield-alert',
    resource: 'attendance_exceptions',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Attendance',
    title: 'Sync Log',
    url: '/dashboard/scheduling-timesheet/attendance',
    iconName: 'checklist',
    resource: 'scheduling_timesheet_attendance',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  // HSE
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Management',
    title: 'HSE',
    url: '/dashboard/hse',
    iconName: 'shield',
    resource: 'hse',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Management',
    title: 'Safety Dashboard',
    url: '/dashboard/safety',
    iconName: 'activity',
    resource: 'safety_dashboard',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Management',
    title: 'Safety Data Management',
    url: '/dashboard/safety/data',
    iconName: 'list-details',
    resource: 'safety_data_management',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Management',
    title: 'Safety Inspections',
    url: '/dashboard/safety/inspections',
    iconName: 'checklist',
    resource: 'safety_inspections',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },

  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Tools & Compliance',
    title: 'HSE Checklists',
    url: '/dashboard/hse/checklist-generator',
    iconName: 'checklist',
    resource: 'hse_checklist_generator',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Tools & Compliance',
    title: 'HIRADC',
    url: '/dashboard/hse/hiradc',
    iconName: 'file-spreadsheet',
    resource: 'hse_hiradc',
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Tools & Compliance',
    title: 'SIA/SIO & Tools Certification',
    url: '/dashboard/hse/sia-sio-tools-certification',
    iconName: 'checklist',
    resource: 'hse_sia_sio_tools_certification',
    sortOrder: 7,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Tools & Compliance',
    title: 'Inventaris',
    url: '/dashboard/hse/inventaris',
    iconName: 'checklist',
    resource: 'hse_inventaris',
    sortOrder: 8,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Tools & Compliance',
    title: 'Izin Kerja PTW',
    url: '/dashboard/hse/izin-kerja-ptw',
    iconName: 'checklist',
    resource: 'hse_izin_kerja_ptw',
    sortOrder: 9,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Tools & Compliance',
    title: 'JSA',
    url: '/dashboard/hse/jsa',
    iconName: 'checklist',
    resource: 'hse_jsa',
    sortOrder: 10,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Safety Tools & Compliance',
    title: 'Safety Induction',
    url: '/dashboard/safety-induction',
    iconName: 'checklist',
    resource: 'safety_induction',
    sortOrder: 11,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    groupLabel: 'Incident Management',
    title: 'Incident Report',
    url: '/dashboard/hse/incident-report',
    iconName: 'alert-triangle',
    resource: 'hse_incident_report',
    sortOrder: 12,
    isVisible: true,
    openInNewTab: false,
  },
  // Central Service
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Management',
    title: 'Request APD',
    url: '/dashboard/apd',
    iconName: 'shield',
    resource: 'apd-request',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Management',
    title: 'CS Forecast',
    url: '/dashboard/central-service/forecast',
    iconName: 'trending-up',
    resource: 'cs-forecast',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Technical',
    title: 'Tire Site Inspection',
    url: '/dashboard/hse/tire-inspection',
    iconName: 'camera',
    resource: 'hse_tire_inspection',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Repair & Retread',
    title: 'WIP Repair',
    url: '/dashboard/repair-retread/wip-repair',
    iconName: 'settings',
    resource: 'wip_repair',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Repair & Retread',
    title: 'WIP Dashboard',
    url: '/dashboard/repair-retread/wip-repair/dashboard',
    iconName: 'chart-bar',
    resource: 'wip_repair_dashboard',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Repair & Retread',
    title: 'Master Barang Repair',
    url: '/dashboard/repair-retread/master-barang-repair',
    iconName: 'database',
    resource: 'master_barang_repair',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Repair & Retread',
    title: 'Stock Material SAP',
    url: '/dashboard/repair-retread/stock-material-sap',
    iconName: 'database',
    resource: 'stock_material_sap',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Repair & Retread',
    title: 'Pattern Designer',
    url: '/dashboard/repair-retread/pattern-designer',
    iconName: 'pen-tool',
    resource: 'retread_pattern_designer',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Dashboard',
    url: '/dashboard/warehouse-repair',
    iconName: 'chart-bar',
    resource: 'warehouse_repair_dashboard',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Data Barang',
    url: '/dashboard/warehouse-repair/barang',
    iconName: 'database',
    resource: 'warehouse_repair_barang',
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Jenis Barang',
    url: '/dashboard/warehouse-repair/jenis',
    iconName: 'folder',
    resource: 'warehouse_repair_jenis',
    sortOrder: 7,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Satuan',
    url: '/dashboard/warehouse-repair/satuan',
    iconName: 'folder',
    resource: 'warehouse_repair_satuan',
    sortOrder: 8,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Barang Masuk',
    url: '/dashboard/warehouse-repair/barang-masuk',
    iconName: 'checklist',
    resource: 'warehouse_repair_barang_masuk',
    sortOrder: 9,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Barang Keluar',
    url: '/dashboard/warehouse-repair/barang-keluar',
    iconName: 'list-details',
    resource: 'warehouse_repair_barang_keluar',
    sortOrder: 10,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Laporan Stok',
    url: '/dashboard/warehouse-repair/laporan-stok',
    iconName: 'report',
    resource: 'warehouse_repair_laporan_stok',
    sortOrder: 11,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Laporan Barang Masuk',
    url: '/dashboard/warehouse-repair/laporan-barang-masuk',
    iconName: 'report',
    resource: 'warehouse_repair_laporan_barang_masuk',
    sortOrder: 12,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Warehouse Repair',
    title: 'Laporan Barang Keluar',
    url: '/dashboard/warehouse-repair/laporan-barang-keluar',
    iconName: 'report',
    resource: 'warehouse_repair_laporan_barang_keluar',
    sortOrder: 13,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Logistics',
    title: 'Cargo Manifest',
    url: '/dashboard/cargo-manifest',
    iconName: 'folder',
    resource: 'cargo_manifest',
    sortOrder: 14,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Central Service',
    groupLabel: 'Field Analysis',
    title: 'Site Condition Report',
    url: '/dashboard/central-service/site-condition',
    iconName: 'report',
    resource: 'site_condition_report',
    sortOrder: 15,
    isVisible: true,
    openInNewTab: false,
  },
  // Laporan
  {
    menuArea: 'main',
    section: 'Laporan',
    title: 'Analytics',
    url: '/dashboard/analytics',
    iconName: 'chart-bar',
    resource: 'dashboard_repair',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Laporan',
    title: 'Reports',
    url: '/dashboard/reports',
    iconName: 'report',
    resource: 'repair_productivity',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Laporan',
    groupLabel: 'Field Analysis',
    title: 'Road Condition Analysis',
    url: '/dashboard/reports/road-condition',
    iconName: 'report',
    resource: 'hse_road_condition_analysis',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Human Capital',
    groupLabel: 'Point System',
    title: 'Point Dashboard',
    url: '/dashboard/leaderboard',
    iconName: 'chart-bar',
    resource: 'point_setting',
    sortOrder: 17,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Laporan',
    title: 'Security Overview',
    url: '/dashboard/security',
    iconName: 'database',
    resource: 'security_session',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Laporan',
    title: 'Audit Log',
    url: '/dashboard/security/audit-logs',
    iconName: 'report',
    resource: 'security_audit',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  // Pengaturan
  {
    menuArea: 'main',
    section: 'Pengaturan',
    title: 'Role Management',
    url: '/dashboard/security/roles',
    iconName: 'shield',
    resource: 'security_roles',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Pengaturan',
    title: 'User Management',
    url: '/dashboard/security/users',
    iconName: 'users',
    resource: 'security_users',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Pengaturan',
    title: 'Navbar Setting',
    url: '/dashboard/settings/navbar',
    iconName: 'settings',
    resource: 'settings_navbar',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Pengaturan',
    title: 'Portal Chitra Settings',
    url: '/dashboard/settings/portal-chitra',
    iconName: 'settings',
    resource: 'settings_portal_chitra',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Pengaturan',
    title: 'Email Delivery Log',
    url: '/dashboard/settings/email',
    iconName: 'mail',
    resource: 'settings_email',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Command Center',
    title: 'Command Center',
    url: '/dashboard/command-center',
    iconName: 'bell',
    resource: 'command_center',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
] as const

const SIDEBAR_MENU_SEEDS = RAW_SIDEBAR_MENU_SEEDS.filter((item, index, menuItems) => {
  const firstResourceIndex = menuItems.findIndex(
    (candidate) => candidate.resource === item.resource
  )
  const firstUrlIndex = menuItems.findIndex((candidate) => candidate.url === item.url)

  return firstResourceIndex === index && firstUrlIndex === index
}).map((item) => ({ ...item, menuArea: item.menuArea ?? 'main', section: item.section ?? 'Menu' }))

const DEPRECATED_MENU_RESOURCES = [
  'slow_moving',
  'hc_surat_keterangan',
  'hc_technical_engineer',
  'hc_certificate',
  'scheduling_timesheet_schedule',
]
const DEPRECATED_MENU_URLS = [
  '/dashboard/slow-moving',
  '/dashboard/hc/surat-keterangan',
  '/dashboard/hc/technical-engineer',
  '/dashboard/hc/certificate',
  '/dashboard/scheduling-timesheet/schedule',
]

const PORTAL_CHITRA_APP_SEEDS = [
  {
    slug: 'hcms',
    name: 'HCMS',
    category: 'Human Capital',
    description: 'Human Capital Management System terintegrasi.',
    url: 'https://hcms.chitraparatama.co.id/',
    color: '#003461',
    iconName: 'users',
    sortOrder: 1,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'chitra-tire-system',
    name: 'Chitra Tire System',
    category: 'Central Services',
    description: 'Manajemen siklus hidup ban dan pemantauan performa.',
    url: 'https://cts-chitraparatama.co.id/ChitraTireMngr/product/login.php',
    color: '#004b87',
    iconName: 'car',
    sortOrder: 2,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'integrated-chitra-system',
    name: 'Integrated Chitra System',
    category: 'General',
    description: 'Portal utama integrasi seluruh sistem operasional.',
    url: 'http://ics.chitraparatama.co.id/product/login.php',
    color: '#0f6ba8',
    iconName: 'layers',
    sortOrder: 3,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'chitra-paratama-website',
    name: 'Chitra Paratama Website',
    category: 'General',
    description: 'Profil perusahaan dan informasi publik.',
    url: 'https://chitraparatama.co.id',
    color: '#2d7c67',
    iconName: 'globe',
    sortOrder: 4,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'go-hse',
    name: 'GO HSE',
    category: 'Human Capital',
    description: 'Sistem pelaporan kesehatan dan keselamatan kerja.',
    url: 'https://gohse.id',
    color: '#9f4b18',
    iconName: 'shield',
    sortOrder: 5,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'e-purchase-request',
    name: 'E - Purchase Request',
    category: 'Supply Chain',
    description: 'Digitalisasi proses pengadaan dan approval.',
    url: 'https://proc-share.com',
    color: '#005f73',
    iconName: 'shopping-bag',
    sortOrder: 6,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'go-bpi',
    name: 'GO BPI',
    category: 'Continuous Improvement',
    description: 'Inovasi dan perbaikan proses bisnis berkelanjutan.',
    url: 'https://gobpi.id',
    color: '#7a3c12',
    iconName: 'bolt',
    sortOrder: 7,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'crm',
    name: 'CRM',
    category: 'Sales & Marketing',
    description: 'Manajemen relasi pelanggan dan pipeline penjualan.',
    url: 'https://gohse.id/crm/admin',
    color: '#005e7a',
    iconName: 'briefcase',
    sortOrder: 8,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'camos',
    name: 'CAMOS',
    category: 'Central Services',
    description: 'Aplikasi mobile untuk monitoring aset operasional.',
    url: 'https://play.google.com/store/apps/details?id=com.chitraparatama.camos',
    color: '#3c566b',
    iconName: 'smartphone',
    sortOrder: 9,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'ar-dashboard',
    name: 'AR Dashboard',
    category: 'Finance',
    description: 'Visualisasi piutang dan performa keuangan.',
    url: '#',
    color: '#0f766e',
    iconName: 'chart',
    sortOrder: 10,
    isActive: true,
    showOnMobile: false,
  },
  {
    slug: 'warehouse-repair',
    name: 'Warehouse Repair',
    category: 'Central Services',
    description: 'Pelacakan pemeliharaan dan perbaikan gudang.',
    url: 'https://rrschitra.gohse.id/login.php',
    color: '#7c3f00',
    iconName: 'warehouse',
    sortOrder: 11,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'marketing-tools',
    name: 'Marketing Tools',
    category: 'Sales & Marketing',
    description: 'Peralatan bantu analisis pasar dan kampanye.',
    url: 'https://one.chitraparatama.com',
    color: '#8b2f4d',
    iconName: 'megaphone',
    sortOrder: 12,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'lms-v2',
    name: 'LMS V2',
    category: 'Human Capital',
    description: 'Platform pelatihan dan pengembangan karyawan.',
    url: 'https://tc.chitraparatama.com',
    color: '#003f78',
    iconName: 'book-open',
    sortOrder: 13,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'supply-chain-management',
    name: 'Supply Chain Management',
    category: 'Supply Chain',
    description: 'Pemantauan rantai pasok dari hulu ke hilir.',
    url: 'https://one.chitraparatama.com',
    color: '#005f8f',
    iconName: 'truck',
    sortOrder: 14,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'chris',
    name: 'CHRIS',
    category: 'Human Capital',
    description: 'Chitra Human Resources Information System.',
    url: 'https://chris.chitraparatama.com',
    color: '#a04d16',
    iconName: 'user-cog',
    sortOrder: 15,
    isActive: true,
    showOnMobile: true,
  },
  {
    slug: 'competitor-dashboard',
    name: 'Competitor Dashboard',
    category: 'Sales & Marketing',
    description: 'Analisis perbandingan performa kompetitor.',
    url: 'https://lookerstudio.google.com/reporting/7d2e0f57-a983-42d0-977d-878b3bfeb662',
    color: '#6c1f37',
    iconName: 'radar',
    sortOrder: 16,
    isActive: true,
    showOnMobile: true,
  },
] as const

const ATTENDANCE_SHIFT_SEEDS = [
  {
    code: 'day',
    label: 'Shift Pagi',
    startTime: '07:00',
    endTime: '15:00',
    windowLabel: '07:00 - 15:00',
    helper: 'Operasional reguler site pagi.',
    sortOrder: 1,
  },
  {
    code: 'swing',
    label: 'Shift Sore',
    startTime: '15:00',
    endTime: '23:00',
    windowLabel: '15:00 - 23:00',
    helper: 'Pergantian crew dan pekerjaan lanjutan.',
    sortOrder: 2,
  },
  {
    code: 'night',
    label: 'Shift Malam',
    startTime: '23:00',
    endTime: '07:00',
    windowLabel: '23:00 - 07:00',
    helper: 'Shift lintas hari, pastikan clock out tetap dilakukan.',
    sortOrder: 3,
  },
  {
    code: 'standby',
    label: 'Standby / On-call',
    startTime: '',
    endTime: '',
    windowLabel: 'Sesuai assignment',
    helper: 'Dipakai saat hadir karena panggilan atau standby.',
    sortOrder: 4,
  },
]

const EMAIL_SMTP_SETTING_SEED = {
  profileName: 'Default SMTP',
  host: 'smtp.chitraparatama.co.id',
  port: 587,
  encryption: 'tls',
  username: 'noreply@chitraparatama.co.id',
  passwordSecret: '',
  fromEmail: 'noreply@chitraparatama.co.id',
  fromName: 'HERO Operations',
  replyToEmail: '',
  retryLimit: 3,
  timeoutSeconds: 15,
  queueEnabled: true,
  auditEnabled: true,
  isActive: true,
}

const EMAIL_TEMPLATE_SEEDS = [
  {
    name: 'ChitraLearning Enrollment Request',
    templateCode: 'chitralearning_enrollment_request',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: '',
    ccEmail: '',
    subject: 'Request enrollment {{employeeName}} - {{courseTitle}}',
    htmlContent:
      '<p>{{employeeName}} ({{employeeSn}}) dari section {{employeeSection}} meminta enrollment ke course <strong>{{courseTitle}}</strong>.</p><p><a href="{{approvalUrl}}">Review enrollment</a></p>',
    textContent:
      '{{employeeName}} ({{employeeSn}}) dari section {{employeeSection}} meminta enrollment ke course {{courseTitle}}. Review: {{approvalUrl}}',
    isActive: true,
  },
  {
    name: 'Auth Magic Link',
    templateCode: 'auth_magic_link',
    templateType: 'Magic Link',
    deliveryChannel: 'email',
    recipientScope: 'all',
    ccEmail: '',
    subject: 'Magic link masuk untuk {{userName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HERO System</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{userName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Gunakan tautan berikut untuk masuk ke akun HERO Anda. Tautan ini bersifat rahasia dan hanya dapat digunakan sekali.</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{magicLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Masuk ke HERO</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Jika Anda tidak merasa meminta tautan ini, abaikan email ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Yth. {{userName}},

Gunakan tautan berikut untuk masuk ke akun HERO Anda. Tautan ini bersifat rahasia dan hanya dapat digunakan sekali.

{{magicLink}}

Jika Anda tidak merasa meminta tautan ini, abaikan email ini.`,
    isActive: true,
  },
  {
    name: 'Approval Assignment',
    templateCode: 'approval_assignment',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'approver',
    ccEmail: '',
    subject: 'Tugas approval baru #{{requestId}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah permohonan baru memerlukan persetujuan Anda.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Permohonan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor Request</td><td style="padding:4px 0;color:#1f2937;font-size:13px">#{{requestId}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan masuk ke dashboard approval untuk meninjau dan mengambil tindakan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah permohonan baru memerlukan persetujuan Anda.

Nomor Request: #{{requestId}}

Silakan masuk ke dashboard approval untuk meninjau dan mengambil tindakan.`,
    isActive: true,
  },
  {
    name: 'Approval SLA Reminder',
    templateCode: 'approval_sla_reminder',
    templateType: 'Reminder',
    deliveryChannel: 'email,bell,pwa_push',
    recipientScope: 'approver',
    ccEmail: '',
    subject: 'Reminder SLA untuk request #{{requestId}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Permohonan berikut mendekati batas waktu SLA dan memerlukan tindakan segera.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Permohonan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor Request</td><td style="padding:4px 0;color:#1f2937;font-size:13px">#{{requestId}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap segera melakukan review sebelum batas waktu berakhir.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Permohonan berikut mendekati batas waktu SLA dan memerlukan tindakan segera.

Nomor Request: #{{requestId}}

Harap segera melakukan review sebelum batas waktu berakhir.`,
    isActive: true,
  },
  {
    name: 'Attendance Permission Reminder',
    templateCode: 'attendance_permission_reminder',
    templateType: 'Reminder',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,approver',
    ccEmail: '',
    subject: 'Reminder approval izin {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Terdapat pengajuan izin yang menunggu persetujuan HR.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Izin</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permissionType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{requestDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard untuk menyetujui atau menolak pengajuan ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Terdapat pengajuan izin yang menunggu persetujuan HR.

Detail Pengajuan:
Nama Karyawan: {{employeeName}}
Jenis Izin: {{permissionType}}
Tanggal: {{requestDate}}

Silakan login ke dashboard untuk menyetujui atau menolak pengajuan ini.`,
    isActive: true,
  },
  {
    name: 'Daily Report Delivery',
    templateCode: 'daily_report_delivery',
    templateType: 'Report',
    deliveryChannel: 'email',
    recipientScope: 'admin,pjo',
    ccEmail: '',
    subject: 'Daily Report {{siteName}} - {{reportDate}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Laporan harian berikut telah siap untuk dikirim.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Laporan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{siteName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reportDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan review laporan sebelum didistribusikan ke pihak terkait.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Laporan harian berikut telah siap untuk dikirim.

Informasi Laporan:
Site: {{siteName}}
Tanggal: {{reportDate}}

Silakan review laporan sebelum didistribusikan ke pihak terkait.`,
    isActive: true,
  },
  {
    name: 'User Invitation',
    templateCode: 'user_invitation',
    templateType: 'Invitation',
    deliveryChannel: 'email',
    recipientScope: 'employee',
    ccEmail: '',
    subject: 'Undangan akun HERO untuk {{userName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{userName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Akun HERO Anda telah berhasil dibuat. Silakan selesaikan proses aktivasi melalui tautan di bawah ini.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Aktivasi Akun</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{invitationLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Terima Undangan</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Setelah menerima undangan, verifikasi alamat email Anda melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{verificationLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Verifikasi Email</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Tautan undangan ini bersifat sementara. Segera selesaikan proses aktivasi Anda.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{userName}},

Akun HERO Anda telah berhasil dibuat. Silakan selesaikan proses aktivasi melalui tautan di bawah ini.

Aktivasi Akun:
Terima undangan: {{invitationLink}}
Verifikasi email: {{verificationLink}}

Tautan undangan ini bersifat sementara. Segera selesaikan proses aktivasi Anda.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'Onboarding Link',
    templateCode: 'onboarding_link',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate',
    ccEmail: '',
    subject: 'Link onboarding HERO untuk {{candidateName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Selamat! Data Anda telah terdaftar di sistem HERO. Silakan lengkapi proses onboarding melalui tautan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Onboarding Karyawan</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Form Onboarding</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pastikan dokumen identitas dan data rekening sudah siap sebelum mengisi formulir.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Selamat! Data Anda telah terdaftar di sistem HERO. Silakan lengkapi proses onboarding melalui tautan berikut:

{{onboardingLink}}

Pastikan dokumen identitas dan data rekening sudah siap sebelum mengisi formulir.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'Leave Request Submitted',
    templateCode: 'leave_request_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc',
    ccEmail: '',
    subject: 'Pengajuan cuti {{leaveTypeName}} dari {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Seorang karyawan telah mengirimkan pengajuan cuti baru.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan Cuti</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Cuti</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaveTypeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Selesai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{endDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Total Hari</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{totalDays}} hari</td></tr></table><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Alasan</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">{{reason}}</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard untuk memproses pengajuan ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Seorang karyawan telah mengirimkan pengajuan cuti baru.

Detail Pengajuan Cuti:
Nama Karyawan: {{employeeName}}
Jenis Cuti: {{leaveTypeName}}
Tanggal Mulai: {{startDate}}
Tanggal Selesai: {{endDate}}
Total Hari: {{totalDays}} hari

Alasan:
{{reason}}

Silakan login ke dashboard untuk memproses pengajuan ini.`,
    isActive: true,
  },
  {
    name: 'Leave Request Decision',
    templateCode: 'leave_request_decision',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee',
    ccEmail: '',
    subject: 'Pengajuan cuti Anda {{decisionLabel}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pengajuan cuti {{leaveTypeName}} Anda telah <strong>{{decisionLabel}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan Cuti</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Cuti</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaveTypeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Selesai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{endDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Diproses Oleh</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{approverName}}</td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{employeeName}},

Pengajuan cuti {{leaveTypeName}} Anda telah {{decisionLabel}}.

Detail Pengajuan Cuti:
Jenis Cuti: {{leaveTypeName}}
Tanggal Mulai: {{startDate}}
Tanggal Selesai: {{endDate}}
Diproses Oleh: {{approverName}}

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'Attendance Permission Decision',
    templateCode: 'attendance_permission_decision',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee',
    ccEmail: '',
    subject: 'Pengajuan {{permissionType}} Anda {{decisionLabel}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pengajuan {{permissionType}} Anda telah <strong>{{decisionLabel}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Izin</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permissionType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{requestDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Catatan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{approverNote}}</td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{employeeName}},

Pengajuan {{permissionType}} Anda telah {{decisionLabel}}.

Detail Pengajuan:
Jenis Izin: {{permissionType}}
Tanggal: {{requestDate}}
Catatan: {{approverNote}}

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'Overtime Assignment',
    templateCode: 'overtime_assignment',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee',
    ccEmail: '',
    subject: '{{splNumber}} siap dikerjakan',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Anda mendapatkan penugasan lembur (overtime) sebagai berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Penugasan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor SPL</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{splNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{workDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jam Mulai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{plannedStart}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jam Selesai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{plannedEnd}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap hadir tepat waktu sesuai jadwal yang telah ditentukan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{employeeName}},

Anda mendapatkan penugasan lembur (overtime) sebagai berikut.

Detail Penugasan:
Judul: {{title}}
Nomor SPL: {{splNumber}}
Tanggal: {{workDate}}
Jam Mulai: {{plannedStart}}
Jam Selesai: {{plannedEnd}}

Harap hadir tepat waktu sesuai jadwal yang telah ditentukan.`,
    isActive: true,
  },
  {
    name: 'Daily Activity Pending Approval',
    templateCode: 'daily_activity_pending_approval',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'approver',
    ccEmail: '',
    subject: 'Daily Activity menunggu approval',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Seorang anggota tim telah mengirimkan laporan aktivitas harian yang menunggu review Anda.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Aktivitas</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Aktivitas</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{activityTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{activityType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Waktu Submit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{submissionTime}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard untuk mereview dan menyetujui aktivitas ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Seorang anggota tim telah mengirimkan laporan aktivitas harian yang menunggu review Anda.

Detail Aktivitas:
Karyawan: {{employeeName}}
Aktivitas: {{activityTitle}}
Kategori: {{activityType}}
Waktu Submit: {{submissionTime}}

Silakan login ke dashboard untuk mereview dan menyetujui aktivitas ini.`,
    isActive: true,
  },
  {
    name: 'Offboarding Update',
    templateCode: 'offboarding_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee,hc',
    ccEmail: '',
    subject: '{{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">{{intro}}</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Status Offboarding</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Ringkasan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{detailsSummary}}</td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{employeeName}},

{{intro}}

Status Offboarding:
Status: {{status}}
Ringkasan: {{detailsSummary}}

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Application Received',
    templateCode: 'application_received',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Lamaran diterima untuk {{jobTitle}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Terima kasih atas ketertarikan Anda untuk bergabung dengan PT Chitra Paratama. Lamaran Anda untuk posisi <strong>{{jobTitle}}</strong> telah kami terima dengan baik.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Lamaran</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Sumber</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{source}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Waktu Submit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{submittedAt}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Tim Human Capital akan meninjau lamaran Anda dan akan menghubungi Anda jika memenuhi kualifikasi yang dibutuhkan.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Terima kasih atas ketertarikan Anda untuk bergabung dengan PT Chitra Paratama. Lamaran Anda untuk posisi {{jobTitle}} telah kami terima dengan baik.

Informasi Lamaran:
Posisi: {{jobTitle}}
Sumber: {{source}}
Waktu Submit: {{submittedAt}}

Tim Human Capital akan meninjau lamaran Anda dan akan menghubungi Anda jika memenuhi kualifikasi yang dibutuhkan.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Interview Invitation',
    templateCode: 'interview_invitation',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Undangan Interview - {{jobTitle}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Berdasarkan hasil seleksi berkas, Anda memenuhi kualifikasi untuk mengikuti tahap interview.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Interview</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Waktu</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{time}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tipe</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{interviewType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi / Link</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pewawancara</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{interviewer}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Durasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{duration}} menit</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap konfirmasi kehadiran Anda sebelum jadwal interview dimulai.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Berdasarkan hasil seleksi berkas, Anda memenuhi kualifikasi untuk mengikuti tahap interview.

Detail Interview:
Posisi: {{jobTitle}}
Tanggal: {{date}}
Waktu: {{time}}
Tipe: {{interviewType}}
Lokasi/Link: {{location}}
Pewawancara: {{interviewer}}
Durasi: {{duration}} menit

Harap konfirmasi kehadiran Anda sebelum jadwal interview dimulai.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Test Assigned',
    templateCode: 'test_assigned',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Undangan Tes Online - {{jobTitle}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Anda diundang untuk mengikuti tes online sebagai bagian dari proses seleksi untuk posisi <strong>{{jobTitle}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Tes Online</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jadwal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}} {{time}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Keterangan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Masa Aktif</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{duration}} hari</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Akses tes online melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{testLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Mulai Tes Online</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pastikan koneksi internet Anda stabil sebelum memulai tes.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Anda diundang untuk mengikuti tes online sebagai bagian dari proses seleksi untuk posisi {{jobTitle}}.

Detail Tes Online:
Posisi: {{jobTitle}}
Jadwal: {{date}} {{time}}
Keterangan: {{location}}
Masa Aktif: {{duration}} hari

Akses tes: {{testLink}}

Pastikan koneksi internet Anda stabil sebelum memulai tes.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Onboarding Link',
    templateCode: 'hc_onboarding_link',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Link onboarding HERO',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Data onboarding Anda telah siap. Silakan lengkapi data diri melalui tautan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Onboarding Karyawan</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Lengkapi Data Onboarding</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pastikan seluruh dokumen yang diperlukan telah disiapkan sebelum mengisi formulir.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Data onboarding Anda telah siap. Silakan lengkapi data diri melalui tautan berikut:

{{onboardingLink}}

Pastikan seluruh dokumen yang diperlukan telah disiapkan sebelum mengisi formulir.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Offering Letter',
    templateCode: 'offering_letter',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Surat Penawaran Kerja - {{jobTitle}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Kepada Yth. {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dengan ini kami sampaikan <strong>Surat Penawaran Kerja (Offering Letter)</strong> untuk posisi <strong>{{jobTitle}}</strong> di {{companyName}}.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Penawaran</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Perusahaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{companyName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen surat penawaran kerja terlampir pada email ini. Silakan ditinjau dan ditandatangani sebelum batas waktu yang tertera.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Kepada Yth. {{candidateName}},

Dengan ini kami sampaikan Surat Penawaran Kerja (Offering Letter) untuk posisi {{jobTitle}} di {{companyName}}.

Informasi Penawaran:
Posisi: {{jobTitle}}
Perusahaan: {{companyName}}

Dokumen surat penawaran kerja terlampir pada email ini. Silakan ditinjau dan ditandatangani sebelum batas waktu yang tertera.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HSE JSA Created',
    templateCode: 'hse_jsa_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'JSA baru: {{jsaNumber}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah dokumen Job Safety Analysis (JSA) baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi JSA</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor JSA</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jsaNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobDescription}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tim</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{teamMembers}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau dan memproses dokumen JSA.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah dokumen Job Safety Analysis (JSA) baru telah dibuat.

Informasi JSA:
Nomor JSA: {{jsaNumber}}
Pekerjaan: {{jobDescription}}
Risk Level: {{riskLevel}}
Tim: {{teamMembers}}

Silakan login ke dashboard HSE untuk meninjau dan memproses dokumen JSA.`,
    isActive: true,
  },
  {
    name: 'HSE JSA Updated',
    templateCode: 'hse_jsa_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update JSA: {{jsaNumber}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Job Safety Analysis (JSA) berikut telah diperbarui.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi JSA</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor JSA</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jsaNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobDescription}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk melihat perubahan terbaru.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Dokumen Job Safety Analysis (JSA) berikut telah diperbarui.

Informasi JSA:
Nomor JSA: {{jsaNumber}}
Pekerjaan: {{jobDescription}}
Risk Level: {{riskLevel}}

Silakan login ke dashboard HSE untuk melihat perubahan terbaru.`,
    isActive: true,
  },
  {
    name: 'HSE HIRADC Register Created',
    templateCode: 'hse_hiradc_register_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'HIRADC register baru: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah register HIRADC baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi HIRADC</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Departemen</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{department}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau register HIRADC.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah register HIRADC baru telah dibuat.

Informasi HIRADC:
Judul: {{title}}
Departemen: {{department}}
Lokasi: {{location}}
Status: {{status}}

Silakan login ke dashboard HSE untuk meninjau register HIRADC.`,
    isActive: true,
  },
  {
    name: 'HSE HIRADC Register Updated',
    templateCode: 'hse_hiradc_register_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update HIRADC register: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Register HIRADC berikut telah diperbarui.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi HIRADC</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Departemen</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{department}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk melihat perubahan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Register HIRADC berikut telah diperbarui.

Informasi HIRADC:
Judul: {{title}}
Departemen: {{department}}
Lokasi: {{location}}
Status: {{status}}

Silakan login ke dashboard HSE untuk melihat perubahan.`,
    isActive: true,
  },
  {
    name: 'HSE PTW Created',
    templateCode: 'hse_ptw_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'PTW baru: {{permitNumber}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah dokumen Permit To Work (PTW) baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi PTW</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor PTW</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{projectName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tipe</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permitType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau dokumen PTW.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah dokumen Permit To Work (PTW) baru telah dibuat.

Informasi PTW:
Nomor PTW: {{permitNumber}}
Pekerjaan: {{projectName}}
Tipe: {{permitType}}
Lokasi: {{location}}
Risk Level: {{riskLevel}}

Silakan login ke dashboard HSE untuk meninjau dokumen PTW.`,
    isActive: true,
  },
  {
    name: 'HSE PTW Updated',
    templateCode: 'hse_ptw_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update PTW: {{permitNumber}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Permit To Work (PTW) berikut telah diperbarui.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi PTW</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor PTW</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{projectName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk melihat perubahan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Dokumen Permit To Work (PTW) berikut telah diperbarui.

Informasi PTW:
Nomor PTW: {{permitNumber}}
Pekerjaan: {{projectName}}
Status: {{status}}
Risk Level: {{riskLevel}}

Silakan login ke dashboard HSE untuk melihat perubahan.`,
    isActive: true,
  },
  {
    name: 'HSE Observation Alert',
    templateCode: 'hse_observation_alert',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Observasi HSE baru: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah observasi HSE baru telah dilaporkan.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Observasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{siteName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pelapor</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reporterName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk menindaklanjuti observasi ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah observasi HSE baru telah dilaporkan.

Informasi Observasi:
Judul: {{title}}
Site: {{siteName}}
Pelapor: {{reporterName}}
Kategori: {{category}}
Severity: {{severity}}
Lokasi: {{location}}

Silakan login ke dashboard HSE untuk menindaklanjuti observasi ini.`,
    isActive: true,
  },
  {
    name: 'HSE Observation Status Update',
    templateCode: 'hse_observation_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update observasi HSE: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status observasi HSE berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Observasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Status observasi HSE berikut telah berubah.

Informasi Observasi:
Judul: {{title}}
Lokasi: {{location}}
Status: {{status}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    isActive: true,
  },
  {
    name: 'HSE Incident Alert',
    templateCode: 'hse_incident_alert',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Incident HSE baru: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah insiden HSE baru telah dilaporkan.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tipe</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{type}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Impact</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{impact}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Unit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{unitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk menindaklanjuti insiden ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah insiden HSE baru telah dilaporkan.

Informasi Insiden:
Judul: {{title}}
Tipe: {{type}}
Impact: {{impact}}
Unit: {{unitNumber}}
Status: {{status}}

Silakan login ke dashboard HSE untuk menindaklanjuti insiden ini.`,
    isActive: true,
  },
  {
    name: 'HSE Incident Status Update',
    templateCode: 'hse_incident_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update incident HSE: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status insiden HSE berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Unit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{unitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Status insiden HSE berikut telah berubah.

Informasi Insiden:
Judul: {{title}}
Unit: {{unitNumber}}
Status: {{status}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    isActive: true,
  },
  {
    name: 'HSE Incident Record Created',
    templateCode: 'hse_incident_record_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Incident report baru: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah laporan insiden HSE baru telah dicatat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Laporan Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Investigasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{investigationStatus}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau laporan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah laporan insiden HSE baru telah dicatat.

Informasi Laporan Insiden:
Judul: {{title}}
Kategori: {{category}}
Severity: {{severity}}
PIC: {{picName}}
Status Investigasi: {{investigationStatus}}

Silakan login ke dashboard HSE untuk meninjau laporan.`,
    isActive: true,
  },
  {
    name: 'HSE Incident Record Status Update',
    templateCode: 'hse_incident_record_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update incident report: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status laporan insiden HSE berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Laporan Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Sebelumnya</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{previousStatus}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Baru</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{investigationStatus}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Status laporan insiden HSE berikut telah berubah.

Informasi Laporan Insiden:
Judul: {{title}}
Severity: {{severity}}
Status Sebelumnya: {{previousStatus}}
Status Baru: {{investigationStatus}}
PIC: {{picName}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    isActive: true,
  },
  {
    name: 'HSE Safety Inspection Created',
    templateCode: 'hse_safety_inspection_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Safety inspection baru: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah safety inspection baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Inspeksi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{inspectionDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau inspeksi.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah safety inspection baru telah dibuat.

Informasi Inspeksi:
Judul: {{title}}
Tanggal: {{inspectionDate}}
Lokasi: {{location}}
Kategori: {{category}}
Status: {{status}}
PIC: {{picName}}

Silakan login ke dashboard HSE untuk meninjau inspeksi.`,
    isActive: true,
  },
  {
    name: 'HSE Safety Inspection Status Update',
    templateCode: 'hse_safety_inspection_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update safety inspection: {{title}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status safety inspection berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Inspeksi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Sebelumnya</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{previousStatus}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Baru</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Status safety inspection berikut telah berubah.

Informasi Inspeksi:
Judul: {{title}}
Lokasi: {{location}}
Status Sebelumnya: {{previousStatus}}
Status Baru: {{status}}
PIC: {{picName}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    isActive: true,
  },
  {
    name: 'HSE Safety Induction Submitted',
    templateCode: 'hse_safety_induction_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Safety induction baru: {{fullName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah formulir safety induction baru telah disubmit.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Induction</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{fullName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Instansi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{companyOrigin}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Telepon</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{phoneNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tujuan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{purpose}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk memproses induction.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah formulir safety induction baru telah disubmit.

Informasi Induction:
Nama: {{fullName}}
Instansi: {{companyOrigin}}
Telepon: {{phoneNumber}}
Tujuan: {{purpose}}

Silakan login ke dashboard HSE untuk memproses induction.`,
    isActive: true,
  },
  {
    name: 'HSE Inventory Reminder',
    templateCode: 'hse_inventory_reminder',
    templateType: 'Reminder',
    deliveryChannel: 'email',
    recipientScope: 'hse',
    ccEmail: '',
    subject: '[HERO HSE] Pengingat Kedaluwarsa Aset: {{itemName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Aset HSE berikut mendekati masa kedaluwarsa dan memerlukan perhatian segera.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Aset</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Aset</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{itemName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Beli</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{purchaseDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Masa Berlaku</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{validityMonths}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Expired</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{expirationDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Segera lakukan tindakan perpanjangan atau penggantian aset sebelum masa berlaku habis.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Aset HSE berikut mendekati masa kedaluwarsa dan memerlukan perhatian segera.

Informasi Aset:
Nama Aset: {{itemName}}
Kategori: {{category}}
Lokasi: {{location}}
Tanggal Beli: {{purchaseDate}}
Masa Berlaku: {{validityMonths}}
Tanggal Expired: {{expirationDate}}
PIC: {{picName}}

Segera lakukan tindakan perpanjangan atau penggantian aset sebelum masa berlaku habis.`,
    isActive: true,
  },
  {
    name: 'HC Employee Created',
    templateCode: 'hc_employee_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc',
    ccEmail: '',
    subject: 'Data employee baru: {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Seorang karyawan baru telah berhasil didaftarkan ke dalam sistem HERO.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Karyawan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Employee ID</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeId}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Email</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeEmail}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Akun</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{accountStatus}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk memverifikasi data.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Seorang karyawan baru telah berhasil didaftarkan ke dalam sistem HERO.

Informasi Karyawan:
Nama: {{employeeName}}
Employee ID: {{employeeId}}
Email: {{employeeEmail}}
Status Akun: {{accountStatus}}

Silakan login ke dashboard HC untuk memverifikasi data.`,
    isActive: true,
  },
  {
    name: 'HC Employee Updated',
    templateCode: 'hc_employee_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc',
    ccEmail: '',
    subject: 'Update employee: {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Data karyawan berikut telah diperbarui di dalam sistem HERO.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Karyawan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Employee ID</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeId}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Email</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeEmail}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Akun</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{accountStatus}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk melihat perubahan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Data karyawan berikut telah diperbarui di dalam sistem HERO.

Informasi Karyawan:
Nama: {{employeeName}}
Employee ID: {{employeeId}}
Email: {{employeeEmail}}
Status Akun: {{accountStatus}}

Silakan login ke dashboard HC untuk melihat perubahan.`,
    isActive: true,
  },
  {
    name: 'HC Disciplinary Created',
    templateCode: 'hc_disciplinary_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee',
    ccEmail: '',
    subject: 'Tindakan disipliner baru: {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah tindakan disipliner baru telah dicatat untuk karyawan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Disipliner</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{categoryName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Level SP</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{spLevel}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">No. Surat</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{letterNumber}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah tindakan disipliner baru telah dicatat untuk karyawan berikut.

Informasi Disipliner:
Karyawan: {{employeeName}}
Kategori: {{categoryName}}
Severity: {{severity}}
Level SP: {{spLevel}}
Status: {{status}}
No. Surat: {{letterNumber}}

Silakan login ke dashboard HC untuk detail lebih lanjut.`,
    isActive: true,
  },
  {
    name: 'HC Disciplinary Status Update',
    templateCode: 'hc_disciplinary_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee',
    ccEmail: '',
    subject: 'Update disipliner: {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status tindakan disipliner untuk karyawan berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Disipliner</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{categoryName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Level SP</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{spLevel}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Status tindakan disipliner untuk karyawan berikut telah berubah.

Informasi Disipliner:
Karyawan: {{employeeName}}
Kategori: {{categoryName}}
Level SP: {{spLevel}}
Status: {{status}}

Silakan login ke dashboard HC untuk detail lebih lanjut.`,
    isActive: true,
  },
  {
    name: 'HC Performance Review Created',
    templateCode: 'hc_performance_review_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Performance review baru: {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah performance review baru telah dibuat untuk karyawan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Performance Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{cycleName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk mengisi review.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah performance review baru telah dibuat untuk karyawan berikut.

Informasi Performance Review:
Karyawan: {{employeeName}}
Reviewer: {{reviewerName}}
Periode: {{cycleName}}
Status: {{status}}

Silakan login ke dashboard HC untuk mengisi review.`,
    isActive: true,
  },
  {
    name: 'HC Performance Review Submitted',
    templateCode: 'hc_performance_review_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Performance review disubmit: {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Performance review untuk karyawan berikut telah disubmit oleh reviewer.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Performance Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{cycleName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk meninjau hasil review.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Performance review untuk karyawan berikut telah disubmit oleh reviewer.

Informasi Performance Review:
Karyawan: {{employeeName}}
Reviewer: {{reviewerName}}
Periode: {{cycleName}}
Status: {{status}}

Silakan login ke dashboard HC untuk meninjau hasil review.`,
    isActive: true,
  },
  {
    name: 'HC Performance Review Acknowledged',
    templateCode: 'hc_performance_review_acknowledged',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Performance review diacknowledge: {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Performance review untuk karyawan berikut telah di-acknowledge oleh karyawan terkait.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Performance Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{cycleName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Rating</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{overallRating}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk melihat hasil akhir.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Performance review untuk karyawan berikut telah di-acknowledge oleh karyawan terkait.
 
Informasi Performance Review:
Karyawan: {{employeeName}}
Reviewer: {{reviewerName}}
Periode: {{cycleName}}
Status: {{status}}
Rating: {{overallRating}}
 
Silakan login ke dashboard HC untuk melihat hasil akhir.`,
    isActive: true,
  },
  {
    name: 'HC Leader Performance Submitted',
    templateCode: 'hc_leader_performance_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Evaluasi Leader Performance disubmit: {{leaderName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#0f172a,#334155);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#cbd5e1;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#94a3b8;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Evaluasi Leader Performance untuk pimpinan berikut telah disubmit.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Evaluasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Leader</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaderName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{period}}</td></tr><tr><td style="padding:4px 0;color:#1f2937;font-size:13px;width:120px;vertical-align:top">Skor Rata-rata</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{overallScore}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk meninjau hasil lengkap evaluasi pimpinan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Evaluasi Leader Performance untuk pimpinan berikut telah disubmit.
      
Informasi Evaluasi:
Leader: {{leaderName}}
Reviewer: {{reviewerName}}
Periode: {{period}}
Skor Rata-rata: {{overallScore}}

Silakan login ke dashboard HC untuk meninjau hasil lengkap evaluasi pimpinan.`,
    isActive: true,
  },
  {
    name: 'HC Leader Performance Reviewed',
    templateCode: 'hc_leader_performance_reviewed',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Evaluasi Leader Performance selesai ditinjau: {{leaderName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#0f172a,#334155);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#cbd5e1;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#94a3b8;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Evaluasi Leader Performance untuk pimpinan berikut telah selesai ditinjau oleh HC / Admin.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Evaluasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Leader</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaderName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{period}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">Reviewed</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Evaluasi Leader Performance untuk pimpinan berikut telah selesai ditinjau oleh HC / Admin.
      
Informasi Evaluasi:
Leader: {{leaderName}}
Reviewer: {{reviewerName}}
Periode: {{period}}
Status: Reviewed

Silakan login ke dashboard HC untuk detail lebih lanjut.`,
    isActive: true,
  },
  {
    name: 'HC Recruitment Hired Email',
    templateCode: 'hired_email',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Selamat! Anda diterima di PT Chitra Paratama',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Selamat! Anda dinyatakan <strong>lulus seleksi</strong> dan diterima untuk bergabung sebagai <strong>{{jobTitle}}</strong> di PT Chitra Paratama.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Penerimaan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai Kerja</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan lengkapi proses onboarding melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingUrl}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Lengkapi Onboarding</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Kami tunggu kontribusi terbaik Anda di PT Chitra Paratama!</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Selamat! Anda dinyatakan lulus seleksi dan diterima untuk bergabung sebagai {{jobTitle}} di PT Chitra Paratama.

Informasi Penerimaan:
Posisi: {{jobTitle}}
Tanggal Mulai Kerja: {{startDate}}

Silakan lengkapi proses onboarding melalui tautan berikut:
{{onboardingUrl}}

Kami tunggu kontribusi terbaik Anda di PT Chitra Paratama!

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Recruitment Start Date Email',
    templateCode: 'start_date_email',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Informasi mulai kerja {{candidateName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Selamat datang di PT Chitra Paratama! Kami sangat senang menyambut Anda sebagai bagian dari keluarga besar perusahaan kami.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Mulai Kerja</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai Kerja</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan lengkapi administrasi onboarding melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingUrl}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Lengkapi Administrasi</a></td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Selamat datang di PT Chitra Paratama! Kami sangat senang menyambut Anda sebagai bagian dari keluarga besar perusahaan kami.

Informasi Mulai Kerja:
Posisi: {{jobTitle}}
Tanggal Mulai Kerja: {{startDate}}

Silakan lengkapi administrasi onboarding melalui tautan berikut:
{{onboardingUrl}}

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Recruitment Custom Bulk Email',
    templateCode: 'custom_bulk',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Pesan dari Tim Human Capital',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">{{messageBodyHtml}}</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

{{messageBody}}

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC MCU Referral To Clinic',
    templateCode: 'mcu_pengantar',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'clinic,hc',
    ccEmail: '',
    subject: '[HERO] Surat Pengantar Medical Check Up - {{candidateName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Kepada Yth. Admin {{clinicName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Mohon bantuannya untuk melaksanakan Medical Check Up (MCU) bagi calon karyawan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Data Calon Karyawan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{candidateName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal MCU</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Paket MCU</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{paket}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Biaya MCU akan ditagihkan ke PT Chitra Paratama sesuai dengan perjanjian kerja sama yang telah disepakati.</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Atas perhatian dan bantuannya, kami ucapkan terima kasih.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Kepada Yth. Admin {{clinicName}},

Mohon bantuannya untuk melaksanakan Medical Check Up (MCU) bagi calon karyawan berikut.

Data Calon Karyawan:
Nama: {{candidateName}}
Tanggal MCU: {{date}}
Paket MCU: {{paket}}

Biaya MCU akan ditagihkan ke PT Chitra Paratama.

Atas perhatian dan bantuannya, kami ucapkan terima kasih.`,
    isActive: true,
  },
  {
    name: 'HC MCU Invitation',
    templateCode: 'mcu_invitation',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Undangan Medical Check Up - {{jobTitle}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Anda dijadwalkan untuk mengikuti Medical Check Up (MCU) sebagai bagian dari proses seleksi untuk posisi <strong>{{jobTitle}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Jadwal MCU</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Klinik</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{clinicName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Paket</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{paket}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap datang tepat waktu dan membawa identitas diri yang berlaku.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

Anda dijadwalkan untuk mengikuti Medical Check Up (MCU) sebagai bagian dari proses seleksi untuk posisi {{jobTitle}}.

Jadwal MCU:
Posisi: {{jobTitle}}
Klinik: {{clinicName}}
Tanggal: {{date}}
Paket: {{paket}}

Harap datang tepat waktu dan membawa identitas diri yang berlaku.

Salam,
Tim Human Capital`,
    isActive: true,
  },
  {
    name: 'HC Contract Review Reminder',
    templateCode: 'contract_review_reminder',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'approver,hc',
    ccEmail: '',
    subject:
      '[Contract Review] Reminder: {{employeeName}} ({{employeeSn}}) berakhir {{contractEndDate}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Yth. {{recipientName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Berikut adalah pengingat untuk dokumen Contract Review yang masih perlu ditindaklanjuti.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Contract Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">SN</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSn}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Section</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSection}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSite}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kontrak Berakhir</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{contractEndDate}}</td></tr></table><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{reviewLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Review</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Segera lakukan review sebelum masa kontrak berakhir.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Yth. {{recipientName}},

Berikut adalah pengingat untuk dokumen Contract Review yang masih perlu ditindaklanjuti.

Informasi Contract Review:
Nama Karyawan: {{employeeName}}
SN: {{employeeSn}}
Section: {{employeeSection}}
Site: {{employeeSite}}
Kontrak Berakhir: {{contractEndDate}}

Buka review: {{reviewLink}}

Segera lakukan review sebelum masa kontrak berakhir.`,
    isActive: true,
  },
  {
    name: 'HC Contract Review Approval Notification',
    templateCode: 'contract_review_approval_notification',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'approver,hc',
    ccEmail: '',
    subject: '[Contract Review] Menunggu Persetujuan Anda - {{employeeName}} ({{employeeSn}})',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Yth. {{approverName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Contract Review berikut membutuhkan persetujuan Anda.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Contract Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">SN</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSn}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Section</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSection}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSite}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tahap</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{approvalStep}}</td></tr></table><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{approvalLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Approval</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap segera memberikan keputusan persetujuan Anda.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Yth. {{approverName}},

Dokumen Contract Review berikut membutuhkan persetujuan Anda.

Informasi Contract Review:
Nama Karyawan: {{employeeName}}
SN: {{employeeSn}}
Section: {{employeeSection}}
Site: {{employeeSite}}
Tahap: {{approvalStep}}

Buka approval: {{approvalLink}}

Harap segera memberikan keputusan persetujuan Anda.`,
    isActive: true,
  },
  {
    name: 'HC Contract Review Test Notification',
    templateCode: 'contract_review_test_notification',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'approver,hc',
    ccEmail: '',
    subject: '[TEST] Contract Review - {{employeeName}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Contract Review untuk uji coba telah berhasil dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Tes</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">SN</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSn}}</td></tr></table><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{reviewLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Form Review</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Email ini adalah notifikasi uji coba (test) untuk memvalidasi workflow Contract Review.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Dokumen Contract Review untuk uji coba telah berhasil dibuat.

Informasi Tes:
Nama Karyawan: {{employeeName}}
SN: {{employeeSn}}

Buka form review: {{reviewLink}}

Email ini adalah notifikasi uji coba (test) untuk memvalidasi workflow Contract Review.`,
    isActive: true,
  },
]

const NOTIFICATION_CHANNEL_SETTING_SEEDS = [
  {
    channel: 'bell',
    isEnabled: true,
    realtimeBadge: true,
    soundEnabled: true,
    autoMarkRead: true,
    vapidPublicKey: '',
    vapidPrivateKey: '',
    pushSubject: '',
    serviceWorkerPath: '/sw.js',
  },
  {
    channel: 'pwa_push',
    isEnabled: true,
    realtimeBadge: false,
    soundEnabled: false,
    autoMarkRead: false,
    vapidPublicKey: '',
    vapidPrivateKey: '',
    pushSubject: 'mailto:noreply@chitraparatama.co.id',
    serviceWorkerPath: '/sw.js',
  },
]

const NOTIFICATION_RULE_SEEDS = [
  {
    channel: 'bell',
    label: 'Approval assignment',
    eventType: 'approval_assignment',
    targetAudience: 'Approver',
    priority: 'approval',
    triggerExpression: 'Saat request masuk ke step approval',
    templateCode: 'approval_assignment',
    isActive: true,
    sortOrder: 1,
  },
  {
    channel: 'bell',
    label: 'Delegation handover',
    eventType: 'delegation_created',
    targetAudience: 'Delegate',
    priority: 'delegation',
    triggerExpression: 'Saat tugas dialihkan ke pemeriksa lain',
    templateCode: 'approval_assignment',
    isActive: true,
    sortOrder: 2,
  },
  {
    channel: 'bell',
    label: 'Escalation alert',
    eventType: 'approval_escalation',
    targetAudience: 'Manager',
    priority: 'escalation',
    triggerExpression: 'Saat approval melewati SLA',
    templateCode: 'approval_sla_reminder',
    isActive: true,
    sortOrder: 3,
  },
  {
    channel: 'bell',
    label: 'Before due reminder',
    eventType: 'before_due',
    targetAudience: 'Requester + Approver',
    priority: 'before_due',
    triggerExpression: 'Sebelum batas waktu tiba',
    templateCode: 'approval_sla_reminder',
    isActive: true,
    sortOrder: 4,
  },
  {
    channel: 'pwa_push',
    label: 'Push approval urgent',
    eventType: 'approval_sla_reminder',
    targetAudience: 'Approver aktif',
    priority: 'urgent',
    triggerExpression: 'SLA < 2 jam',
    templateCode: 'approval_sla_reminder',
    isActive: true,
    sortOrder: 1,
  },
  {
    channel: 'pwa_push',
    label: 'Push escalation',
    eventType: 'approval_escalation',
    targetAudience: 'Manager site',
    priority: 'escalation',
    triggerExpression: 'Lewat SLA',
    templateCode: 'approval_sla_reminder',
    isActive: true,
    sortOrder: 2,
  },
  {
    channel: 'pwa_push',
    label: 'Push daily report ready',
    eventType: 'daily_report_ready',
    targetAudience: 'PJO + Admin',
    priority: 'report',
    triggerExpression: 'Report siap kirim',
    templateCode: 'daily_report_delivery',
    isActive: false,
    sortOrder: 3,
  },
]

function dedupeMenuItemsByPage<
  T extends {
    url: string
  },
>(items: T[]) {
  const seenPages = new Set<string>()

  return items.filter((item) => {
    const pageKey = item.url

    if (seenPages.has(pageKey)) {
      return false
    }

    seenPages.add(pageKey)
    return true
  })
}

const HSE_MANAGED_RESOURCES = new Set([
  'hse',
  'safety_dashboard',
  'safety_data_management',
  'safety_inspections',
  'hse_checklist_generator',
  'hse_hiradc',
  'hse_sia_sio_tools_certification',
  'hse_inventaris',
  'hse_izin_kerja_ptw',
  'hse_jsa',
  'safety_induction',
  'hse_incident_report',
  'hse_tire_inspection',
  'hse_road_condition_analysis',
])

const WELLNESS_MANAGED_RESOURCES = new Set(['hc_mcu_wellness'])

const HSE_ROLE_FULL_ACCESS_RESOURCES = new Set([
  ...HSE_MANAGED_RESOURCES,
  ...WELLNESS_MANAGED_RESOURCES,
])

const OWN_SCOPE_RESOURCES = new Set([
  'tire_service',
  'overtime_requests',
  'tire_engineer',
  'hr_counseling_user',
  'hc_attendance_permission',
  'hc_contract_review',
  'hc_disciplinary',
  'hc_certificate',
  'hc_performance',
  'hc_leader_performance',
  'approval_inbox',
  'request_center',
  'notification_center',
  'attendance',
  'attendance_records',
  'attendance_live_map',
  'attendance_exceptions',
  'scheduling_timesheet',
  ...HSE_MANAGED_RESOURCES,
  ...WELLNESS_MANAGED_RESOURCES,
])

function getDefaultMenuPermission(roleName: string, resource: string) {
  if (roleName === 'Super Admin') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canSelectAll: true,
      dataScope: 'global',
    }
  }

  if (roleName === 'HSE') {
    const allowed = HSE_ROLE_FULL_ACCESS_RESOURCES.has(resource)
    return {
      canView: allowed,
      canEdit: allowed,
      canDelete: allowed,
      canSelectAll: allowed,
      dataScope: allowed ? 'global' : 'own',
    }
  }

  if (HSE_MANAGED_RESOURCES.has(resource)) {
    const canManageOwnChecklist =
      roleName === 'User Safety' && resource === 'hse_checklist_generator'
    return {
      canView: true,
      canEdit: canManageOwnChecklist,
      canDelete: canManageOwnChecklist,
      canSelectAll: false,
      dataScope: 'own',
    }
  }

  if (roleName === 'HC Manager') {
    return {
      canView: true,
      canEdit: true,
      canDelete: [
        'security',
        'settings_navbar',
        'settings_email',
        'portal_chitra',
        'settings_portal_chitra',
        'hc_leader_performance',
      ].includes(resource),
      canSelectAll: false,
      dataScope: 'global',
    }
  }

  if (WELLNESS_MANAGED_RESOURCES.has(resource)) {
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canSelectAll: false,
      dataScope: 'own',
    }
  }

  return {
    canView: true,
    canEdit: !['settings_email', 'portal_chitra', 'settings_portal_chitra'].includes(resource),
    canDelete: false,
    canSelectAll: false,
    dataScope: OWN_SCOPE_RESOURCES.has(resource) ? 'own' : 'global',
  }
}

async function ensureHeroGovernanceTables() {
  await db.execute(sql`
    create table if not exists hero_security_roles (
      id serial primary key,
      name text not null,
      description text not null default '',
      scope text not null default 'site',
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_security_permissions (
      id serial primary key,
      code text not null,
      label text not null,
      resource text not null,
      action text not null,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_security_role_permissions (
      id serial primary key,
      role_id integer not null references hero_security_roles(id) on delete cascade,
      permission_id integer not null references hero_security_permissions(id) on delete cascade,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_email_delivery_logs (
      id serial primary key,
      employee_id integer references hero_employees(id) on delete set null,
      delivery_channel text not null default 'email',
      to_email text not null,
      cc_email text,
      from_email text,
      template_name text,
      template_code text,
      subject text not null,
      status text not null,
      error_message text,
      html_content text,
      text_content text,
      sent_at timestamp,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_hc_notification_config (
      id serial primary key,
      recipient_emails text not null default '',
      cc_emails text not null default '',
      is_active boolean not null default true,
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_hse_safety_notification_config (
      id serial primary key,
      recipient_emails text not null default '',
      cc_emails text not null default '',
      is_active boolean not null default true,
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_email_smtp_settings (
      id serial primary key,
      profile_name text not null default 'Default SMTP',
      host text not null,
      port integer not null default 587,
      encryption text not null default 'tls',
      username text not null default '',
      password_secret text not null default '',
      from_email text not null default '',
      from_name text not null default 'HERO Operations',
      reply_to_email text not null default '',
      retry_limit integer not null default 3,
      timeout_seconds integer not null default 15,
      queue_enabled boolean not null default true,
      audit_enabled boolean not null default true,
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_email_templates (
      id serial primary key,
      name text not null,
      template_code text not null unique,
      template_type text not null default 'Notification',
      delivery_channel text not null default 'email',
      recipient_scope text not null default 'all',
      cc_email text not null default '',
      subject text not null,
      html_content text not null default '',
      text_content text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_notification_channel_settings (
      id serial primary key,
      channel text not null unique,
      is_enabled boolean not null default true,
      realtime_badge boolean not null default true,
      sound_enabled boolean not null default false,
      auto_mark_read boolean not null default true,
      vapid_public_key text not null default '',
      vapid_private_key text not null default '',
      push_subject text not null default '',
      service_worker_path text not null default '/sw.js',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_notification_channel_rules (
      id serial primary key,
      channel text not null default 'bell',
      label text not null,
      event_type text not null,
      target_audience text not null default '',
      priority text not null default 'notification',
      trigger_expression text not null default '',
      template_code text not null default '',
      is_active boolean not null default true,
      sort_order integer not null default 0,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_notification_user_preferences (
      id serial primary key,
      employee_id integer not null unique references hero_employees(id) on delete cascade,
      push_enabled boolean not null default true,
      in_app_enabled boolean not null default true,
      email_enabled boolean not null default true,
      approval_requests_enabled boolean not null default true,
      shift_reminders_enabled boolean not null default true,
      hse_alerts_enabled boolean not null default true,
      points_updates_enabled boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_notification_push_subscriptions (
      id serial primary key,
      employee_id integer not null references hero_employees(id) on delete cascade,
      endpoint text not null unique,
      p256dh_key text not null,
      auth_key text not null,
      device_label text not null default 'Browser',
      user_agent text not null default '',
      is_active boolean not null default true,
      last_seen_at timestamp not null default now(),
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_audit_logs (
      id serial primary key,
      actor_employee_id integer references hero_employees(id) on delete set null,
      action text not null,
      entity_type text not null,
      entity_label text not null,
      description text not null,
      severity text not null default 'info',
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_navbar_themes (
      id serial primary key,
      theme_name text not null,
      background_style text not null,
      accent_color text not null,
      header_background_color text not null default '#FFFFFF',
      text_color text not null,
      density text not null default 'comfortable',
      logo_mode text not null default 'hero',
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_navbar_themes
    add column if not exists header_background_color text not null default '#FFFFFF';
  `)

  await db.execute(sql`
    create table if not exists hero_navbar_menu_items (
      id serial primary key,
      menu_area text not null default 'main',
      section text not null,
      title text not null,
      url text not null,
      icon_name text not null,
      resource text not null,
      sort_order integer not null default 0,
      is_visible boolean not null default true,
      open_in_new_tab boolean not null default false,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_navbar_menu_items add column if not exists menu_area text not null default 'main';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists province_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists province_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists district_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists district_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists village_id text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists village_name text not null default '';
  `)

  await db.execute(sql`
    alter table hero_sites add column if not exists address_detail text not null default '';
  `)

  await db.execute(sql`
    create table if not exists hero_role_menu_permissions (
      id serial primary key,
      role_id integer not null references hero_security_roles(id) on delete cascade,
      menu_item_id integer not null references hero_navbar_menu_items(id) on delete cascade,
      can_view boolean not null default false,
      can_edit boolean not null default false,
      can_delete boolean not null default false,
      can_select_all boolean not null default false,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE hero_role_menu_permissions ADD COLUMN IF NOT EXISTS data_scope text NOT NULL DEFAULT 'own';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `)

  await db.execute(sql`
    create table if not exists hero_portal_chitra_apps (
      id serial primary key,
      slug text not null unique,
      name text not null,
      category text not null default 'General',
      description text not null default '',
      url text not null,
      color text not null default '#003461',
      icon_name text not null default 'globe',
      sort_order integer not null default 0,
      is_active boolean not null default true,
      show_on_mobile boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_portal_chitra_role_access (
      id serial primary key,
      portal_app_id integer not null references hero_portal_chitra_apps(id) on delete cascade,
      role_id integer not null references hero_security_roles(id) on delete cascade,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_master_departments (
      id serial primary key,
      code text not null unique,
      name text not null,
      description text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_master_sections (
      id serial primary key,
      code text not null unique,
      name text not null,
      department_id integer references hero_master_departments(id) on delete set null,
      description text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE hero_master_sections ADD COLUMN IF NOT EXISTS head_employee_id integer;
      ALTER TABLE hero_master_sections ADD COLUMN IF NOT EXISTS parent_id integer references hero_master_sections(id) on delete set null;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `)

  await db.execute(sql`
    create table if not exists hero_master_positions (
      id serial primary key,
      code text not null unique,
      name text not null,
      department_id integer references hero_master_departments(id) on delete set null,
      section_id integer references hero_master_sections(id) on delete set null,
      site_location text not null default '',
      level integer not null default 1,
      description text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_master_attendance_shifts (
      id serial primary key,
      code text not null unique,
      label text not null,
      start_time text not null default '',
      end_time text not null default '',
      window_label text not null default '',
      helper text not null default '',
      sort_order integer not null default 0,
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_master_positions
    add column if not exists site_location text not null default '';
  `)

  await db.execute(sql`
    alter table hero_master_positions
    add column if not exists section_id integer references hero_master_sections(id) on delete set null;
  `)

  await db.execute(sql`
    alter table hero_employees
    add column if not exists department_id integer;
  `)

  await db.execute(sql`
    alter table hero_employees
    add column if not exists section_id integer;
  `)

  await db.execute(sql`
    alter table hero_employees
    add column if not exists position_id integer;
  `)

  await db.execute(sql`
    create table if not exists hero_org_chart_structures (
      id serial primary key,
      name text not null,
      scope_type text not null default 'custom',
      scope_value text not null default '',
      version integer not null default 1,
      effective_from timestamp not null default now(),
      effective_to timestamp,
      is_default boolean not null default false,
      description text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_org_chart_nodes (
      id serial primary key,
      structure_id integer not null references hero_org_chart_structures(id) on delete cascade,
      parent_node_id integer,
      position_id integer references hero_master_positions(id) on delete set null,
      employee_id integer references hero_employees(id) on delete set null,
      node_code text not null default '',
      node_type text not null default 'position',
      approval_role text not null default '',
      can_approve boolean not null default false,
      can_delegate boolean not null default true,
      is_escalation_target boolean not null default false,
      sla_hours integer not null default 24,
      fallback_node_id integer,
      label text not null,
      sort_order integer not null default 0,
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists version integer not null default 1;
  `)

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists effective_from timestamp not null default now();
  `)

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists effective_to timestamp;
  `)

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists is_default boolean not null default false;
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists employee_id integer references hero_employees(id) on delete set null;
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists node_code text not null default '';
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists node_type text not null default 'position';
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists approval_role text not null default '';
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists can_approve boolean not null default false;
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists can_delegate boolean not null default true;
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists is_escalation_target boolean not null default false;
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists sla_hours integer not null default 24;
  `)

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists fallback_node_id integer;
  `)

  await db.execute(sql`
    create table if not exists hero_org_node_assignments (
      id serial primary key,
      node_id integer not null references hero_org_chart_nodes(id) on delete cascade,
      employee_id integer references hero_employees(id) on delete set null,
      assignment_type text not null default 'primary',
      notes text not null default '',
      effective_from timestamp not null default now(),
      effective_to timestamp,
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_approval_matrices (
      id serial primary key,
      name text not null,
      structure_id integer references hero_org_chart_structures(id) on delete set null,
      transaction_type text not null default 'activity',
      site_id integer references hero_sites(id) on delete set null,
      department_id integer references hero_master_departments(id) on delete set null,
      section_id integer references hero_master_sections(id) on delete set null,
      requester_position_id integer references hero_master_positions(id) on delete set null,
      activity_type text not null default '',
      priority text not null default 'any',
      min_overtime_minutes integer not null default 0,
      max_overtime_minutes integer,
      description text not null default '',
      effective_from timestamp not null default now(),
      effective_to timestamp,
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_approval_matrix_steps (
      id serial primary key,
      matrix_id integer not null references hero_approval_matrices(id) on delete cascade,
      step_order integer not null,
      label text not null default '',
      node_id integer references hero_org_chart_nodes(id) on delete set null,
      fallback_node_id integer references hero_org_chart_nodes(id) on delete set null,
      escalation_node_id integer references hero_org_chart_nodes(id) on delete set null,
      approval_mode text not null default 'sequential',
      sla_hours integer not null default 24,
      can_delegate boolean not null default true,
      is_required boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_employees
    add column if not exists org_node_id integer;
  `)

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approver_employee_id integer references hero_employees(id) on delete set null;
  `)

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approver_node_id integer references hero_org_chart_nodes(id) on delete set null;
  `)

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approval_matrix_id integer references hero_approval_matrices(id) on delete set null;
  `)

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approval_step_id integer references hero_approval_matrix_steps(id) on delete set null;
  `)

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists resolution_source text not null default 'matrix';
  `)

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists route_snapshot text not null default '';
  `)

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists decision_note text not null default '';
  `)
}

export async function ensureHeroSeedData() {
  if (seedPromise) {
    return seedPromise
  }

  seedPromise = (async () => {
    await ensureHeroEmployeeProfileColumns()
    await ensureHeroSiteLocationColumns()
    await ensureEmergencyIncidentColumns()
    await ensureTrainingRecordHistoryColumns()
    await ensureApprovalBlueprintSeedData()
    await ensureDepartmentSectionSeedData()
  })().catch((error) => {
    seedPromise = null
    throw error
  })

  return seedPromise
}

export async function ensureHeroGovernanceSeedData() {
  await ensureHeroSeedData()

  if (governanceSeedPromise) {
    return governanceSeedPromise
  }

  governanceSeedPromise = (async () => {
    await ensureHeroGovernanceTables()

    const [
      permissionCount,
      rolePermissionCount,
      themeCount,
      attendanceShiftCount,
      emailSmtpSettingCount,
      notificationChannelSettingCount,
      notificationPreferenceCount,
      notificationSubscriptionCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(securityPermissions),
      db.select({ count: sql<number>`count(*)::int` }).from(securityRolePermissions),
      db.select({ count: sql<number>`count(*)::int` }).from(navbarThemes),
      db.select({ count: sql<number>`count(*)::int` }).from(masterAttendanceShifts),
      db.select({ count: sql<number>`count(*)::int` }).from(emailSmtpSettings),
      db.select({ count: sql<number>`count(*)::int` }).from(notificationChannelSettings),
      db.select({ count: sql<number>`count(*)::int` }).from(notificationUserPreferences),
      db.select({ count: sql<number>`count(*)::int` }).from(notificationPushSubscriptions),
    ])

    const currentRoles = await db.select().from(securityRoles)
    const existingRoleNames = new Set(currentRoles.map((role) => role.name))

    const missingRoles = GOVERNANCE_ROLE_SEEDS.filter((role) => !existingRoleNames.has(role.name))

    if (missingRoles.length > 0) {
      await db.insert(securityRoles).values(missingRoles)
    }

    if ((permissionCount[0]?.count ?? 0) === 0) {
      await db.insert(securityPermissions).values([
        {
          code: 'security.overview.read',
          label: 'Read security overview',
          resource: 'security',
          action: 'read',
        },
        {
          code: 'security.users.manage',
          label: 'Manage security users',
          resource: 'security_users',
          action: 'manage',
        },
        {
          code: 'security.roles.manage',
          label: 'Manage roles and permissions',
          resource: 'security_roles',
          action: 'manage',
        },
        {
          code: 'security.audit.read',
          label: 'Read audit logs',
          resource: 'security_audit',
          action: 'read',
        },
        {
          code: 'settings.navbar.manage',
          label: 'Manage navbar settings',
          resource: 'settings_navbar',
          action: 'manage',
        },
        {
          code: 'settings.email.read',
          label: 'Read email delivery logs',
          resource: 'settings_email',
          action: 'read',
        },
        {
          code: 'warehouse_repair.manage',
          label: 'Manage Warehouse Repair',
          resource: 'warehouse_repair_dashboard',
          action: 'manage',
        },
        {
          code: 'warehouse_repair.master.manage',
          label: 'Manage Warehouse Repair master data',
          resource: 'warehouse_repair_barang',
          action: 'manage',
        },
        {
          code: 'warehouse_repair.transactions.manage',
          label: 'Manage Warehouse Repair transactions',
          resource: 'warehouse_repair_barang_masuk',
          action: 'manage',
        },
        {
          code: 'warehouse_repair.reports.read',
          label: 'Read Warehouse Repair reports',
          resource: 'warehouse_repair_laporan_stok',
          action: 'read',
        },
      ])
    }

    if ((rolePermissionCount[0]?.count ?? 0) === 0) {
      const [roles, permissions] = await Promise.all([
        db.select().from(securityRoles),
        db.select().from(securityPermissions),
      ])

      const roleByName = Object.fromEntries(roles.map((role) => [role.name, role]))
      const permissionByCode = Object.fromEntries(
        permissions.map((permission) => [permission.code, permission])
      )

      await db.insert(securityRolePermissions).values([
        {
          roleId: roleByName['Super Admin'].id,
          permissionId: permissionByCode['security.overview.read'].id,
        },
        {
          roleId: roleByName['Super Admin'].id,
          permissionId: permissionByCode['security.users.manage'].id,
        },
        {
          roleId: roleByName['Super Admin'].id,
          permissionId: permissionByCode['security.roles.manage'].id,
        },
        {
          roleId: roleByName['Super Admin'].id,
          permissionId: permissionByCode['security.audit.read'].id,
        },
        {
          roleId: roleByName['Super Admin'].id,
          permissionId: permissionByCode['settings.navbar.manage'].id,
        },
        {
          roleId: roleByName['Super Admin'].id,
          permissionId: permissionByCode['settings.email.read'].id,
        },
        {
          roleId: roleByName['Site Admin'].id,
          permissionId: permissionByCode['security.overview.read'].id,
        },
        {
          roleId: roleByName['Site Admin'].id,
          permissionId: permissionByCode['security.audit.read'].id,
        },
        {
          roleId: roleByName['HC Manager'].id,
          permissionId: permissionByCode['security.users.manage'].id,
        },
        {
          roleId: roleByName['HC Manager'].id,
          permissionId: permissionByCode['settings.email.read'].id,
        },
      ])
    }

    await db
      .delete(navbarMenuItems)
      .where(
        or(
          inArray(navbarMenuItems.resource, DEPRECATED_MENU_RESOURCES),
          inArray(navbarMenuItems.url, DEPRECATED_MENU_URLS)
        )
      )

    const currentMenuItems = await db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.sortOrder, navbarMenuItems.id)

    const preferredSeedByUrl = new Map<string, (typeof SIDEBAR_MENU_SEEDS)[number]>(
      SIDEBAR_MENU_SEEDS.map((item) => [item.url, item])
    )
    const menuGroupsByUrl = currentMenuItems.reduce<Map<string, typeof currentMenuItems>>(
      (accumulator, item) => {
        const currentItems = accumulator.get(item.url) ?? []
        currentItems.push(item)
        accumulator.set(item.url, currentItems)
        return accumulator
      },
      new Map()
    )

    for (const [url, groupedItems] of menuGroupsByUrl) {
      if (groupedItems.length <= 1) {
        continue
      }

      const preferredSeed = preferredSeedByUrl.get(url)
      const keepItem = preferredSeed
        ? (groupedItems.find((item) => item.resource === preferredSeed.resource) ?? groupedItems[0])
        : groupedItems[0]

      const duplicateIds = groupedItems
        .filter((item) => item.id !== keepItem.id)
        .map((item) => item.id)

      if (duplicateIds.length > 0) {
        await db.delete(navbarMenuItems).where(inArray(navbarMenuItems.id, duplicateIds))
      }
    }

    const canonicalMenuItems = await db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.sortOrder, navbarMenuItems.id)

    const menuItemByResource = new Map(canonicalMenuItems.map((item) => [item.resource, item]))
    const menuItemByUrl = new Map(canonicalMenuItems.map((item) => [item.url, item]))

    for (const menuSeed of SIDEBAR_MENU_SEEDS) {
      const existingMenuItem =
        menuItemByResource.get(menuSeed.resource) ?? menuItemByUrl.get(menuSeed.url)

      if (!existingMenuItem) {
        continue
      }

      if (
        existingMenuItem.menuArea !== menuSeed.menuArea ||
        existingMenuItem.section !== menuSeed.section ||
        existingMenuItem.title !== menuSeed.title ||
        existingMenuItem.url !== menuSeed.url ||
        existingMenuItem.iconName !== menuSeed.iconName ||
        existingMenuItem.resource !== menuSeed.resource ||
        existingMenuItem.sortOrder !== menuSeed.sortOrder ||
        existingMenuItem.isVisible !== menuSeed.isVisible ||
        existingMenuItem.openInNewTab !== menuSeed.openInNewTab ||
        existingMenuItem.groupLabel !== (menuSeed as any).groupLabel
      ) {
        await db
          .update(navbarMenuItems)
          .set(menuSeed as any)
          .where(eq(navbarMenuItems.id, existingMenuItem.id))
      }
    }

    const refreshedMenuItems = await db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.sortOrder, navbarMenuItems.id)

    const existingMenuResources = new Set<string>(refreshedMenuItems.map((item) => item.resource))
    const missingMenuItems = SIDEBAR_MENU_SEEDS.filter(
      (item) => !existingMenuResources.has(item.resource)
    )

    if (missingMenuItems.length > 0) {
      await db.insert(navbarMenuItems).values(missingMenuItems)
    }

    const existingPortalApps = await db
      .select()
      .from(portalChitraApps)
      .orderBy(portalChitraApps.sortOrder, portalChitraApps.id)

    const portalAppBySlug = new Map(existingPortalApps.map((item) => [item.slug, item]))

    for (const portalSeed of PORTAL_CHITRA_APP_SEEDS) {
      const existingPortalApp = portalAppBySlug.get(portalSeed.slug)

      if (!existingPortalApp) {
        continue
      }

      if (
        existingPortalApp.name !== portalSeed.name ||
        existingPortalApp.category !== portalSeed.category ||
        existingPortalApp.description !== portalSeed.description ||
        existingPortalApp.url !== portalSeed.url ||
        existingPortalApp.color !== portalSeed.color ||
        existingPortalApp.iconName !== portalSeed.iconName ||
        existingPortalApp.sortOrder !== portalSeed.sortOrder ||
        existingPortalApp.isActive !== portalSeed.isActive ||
        existingPortalApp.showOnMobile !== portalSeed.showOnMobile
      ) {
        await db
          .update(portalChitraApps)
          .set({
            ...portalSeed,
            updatedAt: new Date(),
          })
          .where(eq(portalChitraApps.id, existingPortalApp.id))
      }
    }

    const missingPortalApps = PORTAL_CHITRA_APP_SEEDS.filter(
      (item) => !portalAppBySlug.has(item.slug)
    )

    if (missingPortalApps.length > 0) {
      await db.insert(portalChitraApps).values(
        missingPortalApps.map((item) => ({
          ...item,
          updatedAt: new Date(),
        }))
      )
    }

    if ((themeCount[0]?.count ?? 0) === 0) {
      await db.insert(navbarThemes).values({
        themeName: 'HERO Surface',
        backgroundStyle: 'Slate gradient',
        accentColor: '#D97706',
        headerBackgroundColor: '#FFFFFF',
        textColor: '#F8FAFC',
        density: 'comfortable',
        logoMode: 'hero-badge',
      })
    }

    if ((attendanceShiftCount[0]?.count ?? 0) === 0) {
      await db.insert(masterAttendanceShifts).values(ATTENDANCE_SHIFT_SEEDS)
    }

    if ((emailSmtpSettingCount[0]?.count ?? 0) === 0) {
      await db.insert(emailSmtpSettings).values(EMAIL_SMTP_SETTING_SEED)
    }

    const existingEmailTemplates = await db
      .select({ templateCode: emailTemplates.templateCode })
      .from(emailTemplates)
    const existingEmailTemplateCodes = new Set(
      existingEmailTemplates.map((template) => template.templateCode)
    )
    const missingEmailTemplates = EMAIL_TEMPLATE_SEEDS.filter(
      (template) => !existingEmailTemplateCodes.has(template.templateCode)
    )

    if (missingEmailTemplates.length > 0) {
      await db.insert(emailTemplates).values(missingEmailTemplates)
    }

    if ((notificationChannelSettingCount[0]?.count ?? 0) === 0) {
      await db.insert(notificationChannelSettings).values(NOTIFICATION_CHANNEL_SETTING_SEEDS)
    }

    void notificationPreferenceCount
    void notificationSubscriptionCount

    const [rolesForMenu, menuItemsForRole, existingRoleMenuPermissions] = await Promise.all([
      db.select().from(securityRoles),
      db.select().from(navbarMenuItems),
      db.select().from(roleMenuPermissions),
    ])

    const existingRoleMenuPairs = new Set(
      existingRoleMenuPermissions.map(
        (permission) => `${permission.roleId}:${permission.menuItemId}`
      )
    )

    const missingRoleMenuPermissions = rolesForMenu.flatMap((role) =>
      menuItemsForRole
        .filter((menuItem) => !existingRoleMenuPairs.has(`${role.id}:${menuItem.id}`))
        .map((menuItem) => ({
          roleId: role.id,
          menuItemId: menuItem.id,
          ...getDefaultMenuPermission(role.name, menuItem.resource),
        }))
    )

    if (missingRoleMenuPermissions.length > 0) {
      await db.insert(roleMenuPermissions).values(missingRoleMenuPermissions)
    }
  })().catch((error) => {
    governanceSeedPromise = null
    throw error
  })

  return governanceSeedPromise
}

export async function getDashboardOverview() {
  await ensureHeroSeedData()

  const [site] = await db.select().from(sites).limit(1)

  const [
    activitiesCount,
    pendingApprovals,
    overtimeMinutes,
    lastReport,
    openObservations,
    activeEmployees,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(activities),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(approvals)
      .where(eq(approvals.status, 'pending')),
    db
      .select({ total: sql<number>`coalesce(sum(${timesheetEntries.overtimeMinutes}),0)::int` })
      .from(timesheetEntries),
    db.select().from(dailyReports).orderBy(desc(dailyReports.reportDate)).limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(hseObservations)
      .where(eq(hseObservations.status, 'open')),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(eq(employees.isActive, true)),
  ])

  return {
    site,
    metrics: [
      {
        label: 'Submitted activities',
        value: `${activitiesCount[0]?.count ?? 0}`,
        meta: 'Aktivitas masuk hari ini',
      },
      {
        label: 'Pending approvals',
        value: `${pendingApprovals[0]?.count ?? 0}`,
        meta: 'Approval L1 dan L2',
      },
      {
        label: 'Overtime tracked',
        value: minutesToHours(overtimeMinutes[0]?.total ?? 0),
        meta: 'Dari timesheet aktif',
      },
      {
        label: 'Open HSE items',
        value: `${openObservations[0]?.count ?? 0}`,
        meta: 'Observation yang belum close',
      },
      {
        label: 'Active workforce',
        value: `${activeEmployees[0]?.count ?? 0}`,
        meta: 'Karyawan aktif di site',
      },
      {
        label: 'Last report',
        value:
          lastReport[0] != null
            ? `${lastReport[0].readySections}/${lastReport[0].totalSections} sections`
            : 'Belum ada',
        meta: 'Kesiapan daily report',
      },
    ],
  }
}

export async function getActivityPageData() {
  await ensureHeroSeedData()

  const rows = await db
    .select({
      id: activities.id,
      code: activities.activityCode,
      type: activities.activityType,
      title: activities.title,
      unitNumber: activities.unitNumber,
      status: activities.status,
      priority: activities.priority,
      startTime: activities.startTime,
      endTime: activities.endTime,
      employeeName: employees.name,
      siteName: sites.name,
    })
    .from(activities)
    .innerJoin(employees, eq(activities.employeeId, employees.id))
    .innerJoin(sites, eq(activities.siteId, sites.id))
    .orderBy(desc(activities.startTime))

  return rows.map((row) => ({
    ...row,
    duration: minutesToHours(
      Math.max(0, Math.round((row.endTime.getTime() - row.startTime.getTime()) / 60000))
    ),
  }))
}

export async function getActivityFormOptions() {
  await ensureHeroSeedData()

  return db
    .select({
      id: employees.id,
      name: employees.name,
      role: employees.role,
      department: employees.department,
      siteId: employees.siteId,
      siteName: sites.name,
    })
    .from(employees)
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.isActive, true))
    .orderBy(employees.name)
}

export async function getApprovalPageData() {
  await ensureHeroSeedData()

  return db
    .select({
      approvalId: approvals.id,
      activityId: activities.id,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      submittedAt: approvals.submittedAt,
      overtimeMinutes: approvals.overtimeMinutes,
      activityTitle: activities.title,
      unitNumber: activities.unitNumber,
      employeeName: employees.name,
      priority: activities.priority,
    })
    .from(approvals)
    .innerJoin(activities, eq(approvals.activityId, activities.id))
    .innerJoin(employees, eq(activities.employeeId, employees.id))
    .orderBy(desc(approvals.submittedAt))
}

export async function getTimesheetPageData() {
  await ensureHeroSeedData()

  const rows = await db
    .select({
      id: timesheetEntries.id,
      employeeId: timesheetEntries.employeeId,
      siteId: timesheetEntries.siteId,
      employeeName: employees.name,
      role: employees.role,
      periodLabel: timesheetEntries.periodLabel,
      regularMinutes: timesheetEntries.regularMinutes,
      overtimeMinutes: timesheetEntries.overtimeMinutes,
      overtimeAmount: timesheetEntries.overtimeAmount,
      status: timesheetEntries.status,
    })
    .from(timesheetEntries)
    .innerJoin(employees, eq(timesheetEntries.employeeId, employees.id))
    .orderBy(desc(timesheetEntries.updatedAt))

  return rows.map((row) => ({
    ...row,
    regularHours: minutesToHours(row.regularMinutes),
    overtimeHours: minutesToHours(row.overtimeMinutes),
    overtimeCost: toCurrency(row.overtimeAmount),
  }))
}

export async function getReportsPageData() {
  await ensureHeroSeedData()

  return db
    .select({
      id: dailyReports.id,
      siteId: dailyReports.siteId,
      reportDate: dailyReports.reportDate,
      status: dailyReports.status,
      customerName: dailyReports.customerName,
      readySections: dailyReports.readySections,
      totalSections: dailyReports.totalSections,
      jobsCompleted: dailyReports.jobsCompleted,
      manpowerPresent: dailyReports.manpowerPresent,
      hseSummary: dailyReports.hseSummary,
      siteName: sites.name,
    })
    .from(dailyReports)
    .innerJoin(sites, eq(dailyReports.siteId, sites.id))
    .orderBy(desc(dailyReports.reportDate))
}

export async function getPointsPageData() {
  await ensureHeroSeedData()

  const leaderboard = await db
    .select({
      id: employees.id,
      name: employees.name,
      role: employees.role,
      department: employees.department,
      levelName: employees.levelName,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .orderBy(desc(employees.totalPoints))

  const recentPointEvents = await db
    .select({
      id: pointEvents.id,
      employeeId: pointEvents.employeeId,
      employeeName: employees.name,
      category: pointEvents.category,
      label: pointEvents.label,
      points: pointEvents.points,
      sourceType: pointEvents.sourceType,
      createdAt: pointEvents.createdAt,
    })
    .from(pointEvents)
    .innerJoin(employees, eq(pointEvents.employeeId, employees.id))
    .orderBy(desc(pointEvents.createdAt))
    .limit(50)

  const recentPenaltyEvents = await db
    .select({
      id: penaltyEvents.id,
      employeeId: penaltyEvents.employeeId,
      employeeName: employees.name,
      penaltyCode: penaltyEvents.penaltyCode,
      penaltyType: penaltyEvents.penaltyType,
      description: penaltyEvents.description,
      pointsDeducted: penaltyEvents.pointsDeducted,
      isDisputed: penaltyEvents.isDisputed,
      createdAt: penaltyEvents.createdAt,
    })
    .from(penaltyEvents)
    .innerJoin(employees, eq(penaltyEvents.employeeId, employees.id))
    .orderBy(desc(penaltyEvents.createdAt))
    .limit(50)

  const disputesQueue = await db
    .select({
      id: pointDisputes.id,
      penaltyEventId: pointDisputes.penaltyEventId,
      employeeId: penaltyEvents.employeeId,
      employeeName: employees.name,
      reason: pointDisputes.reason,
      status: pointDisputes.status,
      resolutionNotes: pointDisputes.resolutionNotes,
      createdAt: pointDisputes.createdAt,
      penaltyCode: penaltyEvents.penaltyCode,
      pointsDeducted: penaltyEvents.pointsDeducted,
    })
    .from(pointDisputes)
    .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
    .innerJoin(employees, eq(penaltyEvents.employeeId, employees.id))
    .orderBy(desc(pointDisputes.createdAt))

  const allLevels = await db.select().from(levels).orderBy(asc(levels.minPoints))
  const allBadges = await db.select().from(badges)

  return {
    leaderboard,
    recentPointEvents,
    recentPenaltyEvents,
    disputes: disputesQueue,
    allLevels,
    allBadges,
  }
}

export async function getPointsAnalyticsPageData() {
  const base = await getPointsPageData()

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const activeEmployees = base.leaderboard.filter((employee) => employee.totalPoints > 0)
  const periodEvents = base.recentPointEvents.filter((event) => event.createdAt >= periodStart)
  const previousEvents = base.recentPointEvents.filter(
    (event) => event.createdAt >= previousPeriodStart && event.createdAt < periodStart
  )
  const periodPenalties = base.recentPenaltyEvents.filter((event) => event.createdAt >= periodStart)
  const openDisputes = base.disputes.filter((dispute) => dispute.status === 'pending')

  const sumByEmployee = (rows: typeof base.recentPointEvents) => {
    const map = new Map<number, number>()
    for (const row of rows) {
      map.set(row.employeeId, (map.get(row.employeeId) ?? 0) + row.points)
    }
    return map
  }

  const periodByEmployee = sumByEmployee(periodEvents)
  const previousByEmployee = sumByEmployee(previousEvents)
  const penaltyByEmployee = new Map<number, number>()
  for (const row of periodPenalties) {
    penaltyByEmployee.set(
      row.employeeId,
      (penaltyByEmployee.get(row.employeeId) ?? 0) + row.pointsDeducted
    )
  }

  const leaderboard = base.leaderboard.map((employee, index) => {
    const periodPoints = periodByEmployee.get(employee.id) ?? 0
    const previousPoints = previousByEmployee.get(employee.id) ?? 0
    const penaltyPoints = penaltyByEmployee.get(employee.id) ?? 0
    const trend =
      periodPoints > previousPoints ? 'Naik' : periodPoints < previousPoints ? 'Turun' : 'Stabil'

    return {
      ...employee,
      rank: index + 1,
      periodPoints,
      previousPoints,
      penaltyPoints,
      trend,
      needsReview:
        penaltyPoints > 0 ||
        periodPoints < 0 ||
        openDisputes.some((dispute) => dispute.employeeId === employee.id),
    }
  })

  const topImprover = [...leaderboard].sort((a, b) => b.periodPoints - a.periodPoints)[0]
  const biggestDrop = [...leaderboard].sort((a, b) => a.periodPoints - b.periodPoints)[0]
  const employeesWithoutActivity = base.leaderboard.filter(
    (employee) => !periodByEmployee.has(employee.id)
  ).length
  const rewardPoints = periodEvents
    .filter((event) => event.points > 0)
    .reduce((total, event) => total + event.points, 0)
  const adjustmentPoints = periodEvents
    .filter((event) => event.points < 0)
    .reduce((total, event) => total + Math.abs(event.points), 0)
  const penaltyPoints = periodPenalties.reduce((total, event) => total + event.pointsDeducted, 0)
  const averagePoints = activeEmployees.length
    ? Math.round(
        activeEmployees.reduce((total, employee) => total + employee.totalPoints, 0) /
          activeEmployees.length
      )
    : 0

  const departmentMap = new Map<
    string,
    { department: string; employees: number; points: number; penalties: number }
  >()
  for (const employee of leaderboard) {
    const key = employee.department || 'Tanpa department'
    const current = departmentMap.get(key) ?? {
      department: key,
      employees: 0,
      points: 0,
      penalties: 0,
    }
    current.employees += 1
    current.points += employee.periodPoints
    current.penalties += employee.penaltyPoints
    departmentMap.set(key, current)
  }
  const departmentPerformance = [...departmentMap.values()].sort((a, b) => b.points - a.points)

  const unifiedTimeline = [
    ...base.recentPointEvents.map((event) => ({
      id: `point-${event.id}`,
      eventId: event.id,
      employeeId: event.employeeId,
      eventType: 'point' as const,
      employeeName: event.employeeName,
      type: event.points >= 0 ? 'Reward' : 'Adjustment',
      category: event.category,
      label: event.label,
      points: event.points,
      createdAt: event.createdAt,
    })),
    ...base.recentPenaltyEvents.map((event) => ({
      id: `penalty-${event.id}`,
      eventId: event.id,
      eventType: 'penalty' as const,
      employeeName: event.employeeName,
      type: 'Penalty',
      category: event.penaltyCode,
      label: event.description || event.penaltyCode,
      points: -event.pointsDeducted,
      createdAt: event.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 80)

  const hrManualHistory = [
    ...base.recentPointEvents
      .filter((event) => event.sourceType === 'hr_adjustment')
      .map((event) => ({
        id: `point-${event.id}`,
        employeeName: event.employeeName,
        action: event.points > 0 ? 'Reward' : 'Adjustment',
        detail: `${event.label} (${event.category})`,
        points: event.points,
        createdAt: event.createdAt,
      })),
    ...base.recentPenaltyEvents
      .filter((event) => event.penaltyType === 'manual')
      .map((event) => ({
        id: `penalty-${event.id}`,
        employeeName: event.employeeName,
        action: 'Penalty',
        detail: `${event.penaltyCode}${event.description ? ` — ${event.description}` : ''}`,
        points: -event.pointsDeducted,
        createdAt: event.createdAt,
      })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 80)

  return {
    ...base,
    analytics: {
      activeEmployees: activeEmployees.length,
      averagePoints,
      rewardPoints,
      adjustmentPoints,
      penaltyPoints,
      openDisputes: openDisputes.length,
      employeesWithoutActivity,
      topImprover,
      biggestDrop,
      departmentPerformance,
      unifiedTimeline,
      hrManualHistory,
      hrWorkflow: [
        {
          title: 'Section Head',
          body: 'List pekerjaan harian, input output kerja, sistem hitung poin dasar.',
        },
        {
          title: 'PJO / Atasan',
          body: 'Review pekerjaan dan approve. Poin masuk setelah approval.',
        },
        {
          title: 'HR',
          body: 'Analisa orang, tambah poin, buat badge, kelola penalty dan dispute.',
        },
      ],
    },
    analyticsLeaderboard: leaderboard,
  }
}

export async function evaluatePointThresholdBadges(
  tx: any,
  employeeId: number,
  currentPoints: number
) {
  // Find badges with rule "points_threshold" where threshold <= currentPoints
  const eligibleBadges = await tx
    .select()
    .from(badges)
    .where(
      and(
        eq(badges.isActive, true),
        eq(badges.autoAssignRule, 'points_threshold'),
        sql`${badges.autoAssignThreshold} <= ${currentPoints}`
      )
    )

  if (eligibleBadges.length === 0) return

  // Retrieve badges already earned by the employee to avoid duplication
  const existingEmployeeBadges = await tx
    .select({ badgeId: employeeBadges.badgeId })
    .from(employeeBadges)
    .where(eq(employeeBadges.employeeId, employeeId))

  const existingBadgeIds = new Set(existingEmployeeBadges.map((e: any) => e.badgeId))

  const badgesToAssign = eligibleBadges.filter((b: any) => !existingBadgeIds.has(b.id))

  if (badgesToAssign.length > 0) {
    await tx.insert(employeeBadges).values(
      badgesToAssign.map((b: any) => ({
        employeeId,
        badgeId: b.id,
      }))
    )
  }
}

export async function getHsePageData() {
  await ensureHeroSeedData()
  const [permission, accessContext] = await Promise.all([
    getCurrentMenuPermission('hse'),
    getCurrentEmployeeAccessContext(),
  ])

  if (!permission.canView) {
    return { observations: [], incidents: [] }
  }

  const hasGlobalScope = hasGlobalDataAccess(permission)
  const ownEmployeeId = accessContext?.employeeId ?? -1

  const observations = await db
    .select({
      id: hseObservations.id,
      siteId: hseObservations.siteId,
      employeeId: hseObservations.employeeId,
      title: hseObservations.title,
      category: hseObservations.category,
      location: hseObservations.location,
      severity: hseObservations.severity,
      status: hseObservations.status,
      notes: hseObservations.notes,
      observedAt: hseObservations.observedAt,
      reporter: employees.name,
    })
    .from(hseObservations)
    .leftJoin(employees, eq(hseObservations.employeeId, employees.id))
    .where(hasGlobalScope ? undefined : eq(hseObservations.employeeId, ownEmployeeId))
    .orderBy(desc(hseObservations.observedAt))

  const incidents = await db
    .select({
      id: hseIncidents.id,
      siteId: hseIncidents.siteId,
      title: hseIncidents.title,
      type: hseIncidents.type,
      unitNumber: hseIncidents.unitNumber,
      impact: hseIncidents.impact,
      status: hseIncidents.status,
      reportedAt: hseIncidents.reportedAt,
    })
    .from(hseIncidents)
    .where(hasGlobalScope ? undefined : eq(hseIncidents.employeeId, ownEmployeeId))
    .orderBy(desc(hseIncidents.reportedAt))

  return { observations, incidents }
}

export async function getHcPageData() {
  await ensureHeroSeedData()

  const attendance = await db
    .select({
      id: attendanceRecords.id,
      employeeId: attendanceRecords.employeeId,
      siteId: attendanceRecords.siteId,
      employeeName: employees.name,
      role: employees.role,
      eventType: attendanceRecords.eventType,
      status: attendanceRecords.status,
      eventTime: attendanceRecords.eventTime,
      locationNote: attendanceRecords.locationNote,
      photoUrl: attendanceRecords.photoUrl,
      latitude: attendanceRecords.latitude,
      longitude: attendanceRecords.longitude,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .orderBy(desc(attendanceRecords.eventTime))

  const trainings = await db
    .select({
      id: trainingRecords.id,
      employeeId: trainingRecords.employeeId,
      employeeName: employees.name,
      department: employees.department,
      trainingName: trainingRecords.trainingName,
      provider: trainingRecords.provider,
      completedYear: trainingRecords.completedYear,
      expiresAt: trainingRecords.expiresAt,
      status: trainingRecords.status,
    })
    .from(trainingRecords)
    .innerJoin(employees, eq(trainingRecords.employeeId, employees.id))
    .orderBy(
      desc(trainingRecords.completedYear),
      asc(employees.name),
      asc(trainingRecords.trainingName)
    )

  const wellness = await db
    .select({
      id: wellnessRecords.id,
      employeeId: wellnessRecords.employeeId,
      employeeName: employees.name,
      metricType: wellnessRecords.metricType,
      metricValue: wellnessRecords.metricValue,
      status: wellnessRecords.status,
      notes: wellnessRecords.notes,
      recordedAt: wellnessRecords.recordedAt,
    })
    .from(wellnessRecords)
    .innerJoin(employees, eq(wellnessRecords.employeeId, employees.id))
    .orderBy(desc(wellnessRecords.recordedAt))

  return { attendance, trainings, wellness }
}

export async function getTrainingRecordPageData() {
  await ensureHeroSeedData()

  const [rows, employeeOptions] = await Promise.all([
    db
      .select({
        id: trainingRecords.id,
        employeeId: trainingRecords.employeeId,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        role: employees.jobTitle,
        department: employees.department,
        section: employees.section,
        trainingName: trainingRecords.trainingName,
        provider: trainingRecords.provider,
        completedYear: trainingRecords.completedYear,
        expiresAt: trainingRecords.expiresAt,
        status: trainingRecords.status,
      })
      .from(trainingRecords)
      .innerJoin(employees, eq(trainingRecords.employeeId, employees.id))
      .orderBy(
        desc(trainingRecords.completedYear),
        asc(employees.name),
        asc(trainingRecords.trainingName)
      ),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
  ])

  const yearOptions = Array.from(new Set(rows.map((row) => row.completedYear))).sort(
    (left, right) => right - left
  )
  const departmentOptions = Array.from(
    new Set(employeeOptions.map((employee) => employee.department).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, 'id-ID'))
  const sectionOptions = Array.from(
    new Set(employeeOptions.map((employee) => employee.section).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, 'id-ID'))

  return {
    rows,
    employeeOptions,
    departmentOptions,
    sectionOptions,
    yearOptions,
  }
}

export async function getSioCertificationPageData() {
  await ensureHeroSeedData()

  const [rows, employeeOptions] = await Promise.all([
    db
      .select({
        id: sioCertifications.id,
        employeeId: sioCertifications.employeeId,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        role: employees.jobTitle,
        department: employees.department,
        section: employees.section,
        certType: sioCertifications.certType,
        certNumber: sioCertifications.certNumber,
        certName: sioCertifications.certName,
        issuingBody: sioCertifications.issuingBody,
        certDate: sioCertifications.certDate,
        expiryDate: sioCertifications.expiryDate,
        status: sioCertifications.status,
        notes: sioCertifications.notes,
        lastSyncFrom: sioCertifications.lastSyncFrom,
      })
      .from(sioCertifications)
      .innerJoin(employees, eq(sioCertifications.employeeId, employees.id))
      .orderBy(
        asc(employees.name),
        asc(sioCertifications.certType),
        asc(sioCertifications.certName)
      ),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
  ])

  const departmentOptions = Array.from(
    new Set(employeeOptions.map((e) => e.department).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'id-ID'))
  const sectionOptions = Array.from(
    new Set(employeeOptions.map((e) => e.section).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'id-ID'))

  return { rows, employeeOptions, departmentOptions, sectionOptions }
}

export async function getOperationalCrudOptions() {
  await ensureHeroSeedData()
  await ensureMasterCategoryTables()

  const [employeeRows, siteRows, categoryOptions] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        role: employees.jobTitle,
        siteId: employees.siteId,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
    db
      .select({
        id: sites.id,
        name: sites.name,
        customerName: sites.customerName,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name)),
    getActiveMasterCategoryOptionMap(),
  ])

  return {
    employees: employeeRows,
    sites: siteRows,
    categoryOptions,
  }
}

function extractSiteNameFromLocation(loc: string | null | undefined): string {
  if (!loc) return ''
  const parts = loc.split(' - ')
  return parts.length > 1 ? parts[parts.length - 1].trim() : loc.trim()
}

export async function getSchedulingTimesheetOptions() {
  await ensureSchedulingTimesheetTables()
  const authSession = await getServerSession()
  const [
    employeeRows,
    siteRows,
    savedPlans,
    savedPlansV2,
    fieldBreakPlans,
    attendanceRows,
    attendanceOverrides,
    schedulingConfigs,
    schedulingStatuses,
    importPreviews,
    activitiesRows,
    trainingRecordsRows,
    sioCertificationsRows,
    approvedSplRows,
  ] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        manpower: employees.manpower,
        pointOfHire: employees.pointOfHire,
        workLocation: employees.workLocation,
        role: employees.role,
        jobTitle: employees.jobTitle,
        department: sql<string>`coalesce(${masterDepartments.name}, ${employees.department}, '')`,
        section: sql<string>`coalesce(${masterSections.name}, ${employees.section}, '')`,
        siteId: employees.siteId,
        siteName: sites.name,
        siteLocation: sites.location,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name))
      .catch(() => []),
    db
      .select({
        id: sites.id,
        name: sites.name,
        location: sites.location,
        customerName: sites.customerName,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name))
      .catch(() => []),
    db
      .select()
      .from(timesheetSchedulingPlans)
      .catch(() => []),
    db
      .select({
        id: timesheetSchedulingPlansV2.id,
        siteId: timesheetSchedulingPlansV2.siteId,
        period: timesheetSchedulingPlansV2.period,
        status: timesheetSchedulingPlansV2.status,
        draftSchedule: timesheetSchedulingPlansV2.draftSchedule,
        activeSchedule: timesheetSchedulingPlansV2.activeSchedule,
        createdByUserId: timesheetSchedulingPlansV2.createdByUserId,
        updatedByUserId: timesheetSchedulingPlansV2.updatedByUserId,
        creatorName: employees.name,
        activatedAt: timesheetSchedulingPlansV2.activatedAt,
        createdAt: timesheetSchedulingPlansV2.createdAt,
        updatedAt: timesheetSchedulingPlansV2.updatedAt,
      })
      .from(timesheetSchedulingPlansV2)
      .leftJoin(employees, eq(timesheetSchedulingPlansV2.createdByUserId, employees.authUserId))
      .orderBy(desc(timesheetSchedulingPlansV2.updatedAt))
      .catch(() => []),
    db
      .select()
      .from(timesheetFieldBreakPlans)
      .catch(() => []),
    db
      .select()
      .from(attendanceRecords)
      .catch(() => []),
    db
      .select()
      .from(timesheetAttendanceRealOverrides)
      .catch(() => []),
    db
      .select()
      .from(timesheetSchedulingConfigs)
      .catch(() => []),
    db
      .select()
      .from(timesheetSchedulingStatuses)
      .catch(() => []),
    db
      .select()
      .from(timesheetAttendanceImportPreviews)
      .catch(() => []),
    db
      .select({
        id: activities.id,
        employeeId: activities.employeeId,
        activityCode: activities.activityCode,
        title: activities.title,
        startTime: activities.startTime,
        endTime: activities.endTime,
        status: activities.status,
      })
      .from(activities)
      .catch(() => []),
    db
      .select({
        employeeId: trainingRecords.employeeId,
        trainingName: trainingRecords.trainingName,
        status: trainingRecords.status,
      })
      .from(trainingRecords)
      .where(inArray(sql`lower(${trainingRecords.status})`, ['valid', 'active', 'aktif']))
      .catch(() => []),
    db
      .select({
        employeeId: sioCertifications.employeeId,
        certName: sioCertifications.certName,
        certType: sioCertifications.certType,
        status: sioCertifications.status,
      })
      .from(sioCertifications)
      .where(inArray(sql`lower(${sioCertifications.status})`, ['valid', 'active', 'aktif']))
      .catch(() => []),
    db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        siteId: overtimeCommandLetters.siteId,
        employeeId: overtimeCommandLetterItems.assignedEmployeeId,
        plannedStartAt: overtimeCommandLetters.plannedStartAt,
        plannedEndAt: overtimeCommandLetters.plannedEndAt,
        status: overtimeCommandLetters.status,
      })
      .from(overtimeCommandLetters)
      .innerJoin(
        overtimeCommandLetterItems,
        eq(overtimeCommandLetterItems.overtimeCommandLetterId, overtimeCommandLetters.id)
      )
      .where(
        and(
          inArray(sql`lower(${overtimeCommandLetters.status})`, ['approved', 'closed']),
          isNotNull(overtimeCommandLetterItems.assignedEmployeeId),
          isNotNull(overtimeCommandLetters.plannedStartAt),
          isNotNull(overtimeCommandLetters.plannedEndAt)
        )
      )
      .catch(() => []),
  ])

  const kimperMap = new Map<number, { isLV: boolean; isTH: boolean; sioNames: string[] }>()

  // Set up Fuse instances for fuzzy matching TH (Heavy equipment)
  const thKeywords = [
    'forklift',
    'loader',
    'tyrehandler',
    'tyre handler',
    'heavy',
    'excavator',
    'dozer',
    'grader',
    'crane',
    'buldozer',
    'bulldozer',
    'compactor',
    'vibro',
    'roller',
  ]
  const thFuse = new Fuse(
    thKeywords.map((k) => ({ keyword: k })),
    {
      keys: ['keyword'],
      threshold: 0.4,
    }
  )

  // We can also use simple regex for LV since it's short, or a strict match
  const isLV = (name: string) => /\b(lv|light vehicle|sim a|sim b)\b/i.test(name)

  const allRecords = [
    ...sioCertificationsRows.map((r) => {
      let combinedName = r.certName || ''
      if (
        r.certType &&
        r.certType.trim().toLowerCase() !== (r.certName || '').trim().toLowerCase()
      ) {
        combinedName = combinedName ? `${combinedName} ${r.certType}` : r.certType
      }
      return {
        employeeId: r.employeeId,
        name: combinedName.trim(),
      }
    }),
  ]

  for (const record of allRecords) {
    const name = record.name.toLowerCase()
    const state = kimperMap.get(record.employeeId) || { isLV: false, isTH: false, sioNames: [] }

    if (record.name && record.name.trim() !== 'undefined') {
      state.sioNames.push(record.name)
    }

    // Check LV first
    if (isLV(name)) {
      state.isLV = true
    }

    // Also check TH using Fuse
    const words = name.split(/[\s,/-]+/)
    const thFuse = new Fuse(
      thKeywords.map((kw) => ({ kw })),
      { keys: ['kw'], threshold: 0.3 }
    )

    let matchedTH = false
    for (const w of words) {
      if (thFuse.search(w).length > 0) {
        matchedTH = true
        break
      }
    }
    // Check exact matches just in case the phrase has spaces like 'tyre handler'
    for (const kw of thKeywords) {
      if (name.includes(kw)) {
        matchedTH = true
        break
      }
    }

    if (matchedTH) {
      state.isTH = true
    }

    kimperMap.set(record.employeeId, state)
  }

  const currentEmployee = authSession?.user?.email
    ? employeeRows.find(
        (employee) => employee.email?.toLowerCase() === authSession.user.email.toLowerCase()
      )
    : null
  const schedulingAccess = await getCurrentMenuPermission('scheduling_timesheet')
  const hasGlobalSchedulingScope = hasGlobalDataAccess(schedulingAccess)
  const canSeeSchedulingSite = (siteId: number | null) =>
    hasGlobalSchedulingScope ||
    (currentEmployee?.siteId != null && siteId === currentEmployee.siteId)

  const serializedV1Plans = savedPlans.map((plan) => ({
    siteId: plan.siteId,
    period: plan.period,
    siteScheduleType: plan.siteScheduleType,
    draftSchedule: plan.draftSchedule as Array<{ employeeId: number; schedule: string[] }>,
    fixedSchedule: plan.fixedSchedule as Array<{ employeeId: number; schedule: string[] }>,
    employeeProfiles: plan.employeeProfiles as Array<{
      employeeId: number
      section: string
      positionOnSite: string
      kimperLv: boolean
      kimperTh: boolean
    }>,
    fieldBreakConfig: plan.fieldBreakConfig as { workWeeks: number; breakWeeks: number } | null,
    updatedAt: plan.updatedAt.toISOString(),
    sourceVersion: 'v1' as 'v1' | 'v2',
  }))
  const serializedV2Plans = savedPlansV2.map((plan) => ({
    ...plan,
    creatorName: plan.creatorName ?? 'User Management',
    draftSchedule: plan.draftSchedule as ScheduleV2Row[],
    activeSchedule: plan.activeSchedule as ScheduleV2Row[],
    activatedAt: plan.activatedAt?.toISOString() ?? null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }))
  const activeSavedPlans = mergeActiveSchedulePlans(
    serializedV1Plans,
    serializedV2Plans,
    (plan) => {
      const config = schedulingConfigs.find((item) => item.siteId === plan.siteId)
      const schedule = plan.activeSchedule.map((row) => ({
        employeeId: row.employeeId,
        schedule: [...row.schedule],
      }))
      return {
        siteId: plan.siteId,
        period: plan.period,
        siteScheduleType: config?.scheduleType ?? 'shift',
        draftSchedule: schedule,
        fixedSchedule: schedule,
        employeeProfiles: [],
        fieldBreakConfig: null,
        updatedAt: plan.updatedAt,
        sourceVersion: 'v2' as const,
      }
    }
  )

  return {
    currentEmployeeSiteId: currentEmployee?.siteId ?? null,
    currentEmployeeName: currentEmployee?.name ?? authSession?.user?.name ?? 'User Management',
    employees: employeeRows
      .filter((employee) => canSeeSchedulingSite(employee.siteId))
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        email: employee.email ?? '',
        employeeSn: employee.employeeSn ?? '',
        manpower: employee.manpower,
        pointOfHire: employee.pointOfHire,
        workLocation: employee.workLocation,
        siteLocation: employee.siteLocation,
        role: employee.jobTitle || employee.role || '',
        department: employee.department ?? null,
        section: employee.section ?? null,
        siteId: employee.siteId,
        locationName: extractSiteNameFromLocation(employee.siteName) || 'Belum diisi',
        kimperLv: kimperMap.get(employee.id)?.isLV ?? false,
        kimperTh: kimperMap.get(employee.id)?.isTH ?? false,
        sio: kimperMap.get(employee.id)?.sioNames
          ? Array.from(new Set(kimperMap.get(employee.id)!.sioNames)).join(', ')
          : null,
      })),
    sites: siteRows.filter((site) => canSeeSchedulingSite(site.id)),
    savedPlans: serializedV1Plans.filter((plan) => canSeeSchedulingSite(plan.siteId)),
    activeSavedPlans: activeSavedPlans.filter((plan) => canSeeSchedulingSite(plan.siteId)),
    savedPlansV2: serializedV2Plans.filter((plan) => canSeeSchedulingSite(plan.siteId)),
    fieldBreakPlans: fieldBreakPlans
      .filter((plan) => canSeeSchedulingSite(plan.siteId))
      .map((plan) => ({
        siteId: plan.siteId,
        period: plan.period,
        employeeId: plan.employeeId,
        employeeName: plan.employeeName,
        sectionName: plan.sectionName,
        rosterSection: plan.rosterSection,
        onSiteDate: plan.onSiteDate ? String(plan.onSiteDate) : '',
        dayCount: plan.dayCount ?? null,
        fieldBreakDate: plan.fieldBreakDate ? String(plan.fieldBreakDate) : '',
        fieldBreakEndDate: plan.fieldBreakEndDate ? String(plan.fieldBreakEndDate) : '',
        source: (plan.source === 'auto' ? 'auto' : 'manual') as 'auto' | 'manual',
        isLocked: Boolean(plan.isLocked),
        notes: plan.notes ?? '',
        updatedAt: plan.updatedAt.toISOString(),
      })),
    attendanceRecords: attendanceRows
      .filter((record) => canSeeSchedulingSite(record.siteId))
      .map((record) => ({
        employeeId: record.employeeId,
        siteId: record.siteId,
        eventType: record.eventType,
        eventTime: record.eventTime.toISOString(),
        status: record.status,
        locationNote: record.locationNote,
        photoUrl: record.photoUrl,
        latitude: record.latitude,
        longitude: record.longitude,
      })),
    attendanceOverrides: attendanceOverrides
      .filter((override) => canSeeSchedulingSite(override.siteId))
      .map((override) => ({
        siteId: override.siteId,
        period: override.period,
        employeeId: override.employeeId,
        day: override.day,
        status: ['present', 'empty', 'sick', 'leave', 'absent', 'off'].includes(override.status)
          ? override.status
          : 'empty',
        clockIn: override.clockIn,
        clockOut: override.clockOut,
        note: override.note,
        source: ['manual', 'excel', 'attendance'].includes(override.source)
          ? override.source
          : 'manual',
        updatedAt: override.updatedAt.toISOString(),
      })),
    approvedSplWindows: approvedSplRows
      .filter(
        (row) =>
          row.employeeId != null &&
          row.plannedStartAt != null &&
          row.plannedEndAt != null &&
          canSeeSchedulingSite(row.siteId)
      )
      .map((row) => ({
        id: row.id,
        splNumber: row.splNumber,
        siteId: row.siteId,
        employeeId: row.employeeId!,
        plannedStartAt: row.plannedStartAt!.toISOString(),
        plannedEndAt: row.plannedEndAt!.toISOString(),
        status: row.status,
      })),
    schedulingConfigs: schedulingConfigs
      .filter((config) => canSeeSchedulingSite(config.siteId))
      .map((config) => ({
        siteId: config.siteId,
        scheduleType: config.scheduleType,
        rosterType: config.rosterType,
        msaType: config.msaType,
        mealsType: config.mealsType,
        overtimeType: config.overtimeType,
        fieldBreakConfig: config.fieldBreakConfig,
        allowanceVariables: config.allowanceVariables,
        overtimeVariables: config.overtimeVariables,
        overtimeConfig: config.overtimeConfig,
        updatedAt: config.updatedAt.toISOString(),
      })),
    schedulingStatuses: schedulingStatuses
      .filter((status) => canSeeSchedulingSite(status.siteId))
      .map((status) => ({
        siteId: status.siteId,
        period: status.period,
        scheduleStatus: status.scheduleStatus,
        attendanceStatus: status.attendanceStatus,
        importStatus: status.importStatus,
        conflictCount: status.conflictCount,
        lastGeneratedAt: status.lastGeneratedAt?.toISOString() ?? null,
        lastSavedAt: status.lastSavedAt?.toISOString() ?? null,
        lastImportedAt: status.lastImportedAt?.toISOString() ?? null,
        finalizedAt: status.finalizedAt?.toISOString() ?? null,
        metadata: status.metadata,
        updatedAt: status.updatedAt.toISOString(),
      })),
    importPreviews: importPreviews
      .filter((preview) => canSeeSchedulingSite(preview.siteId))
      .map((preview) => ({
        id: preview.id,
        siteId: preview.siteId,
        period: preview.period,
        filename: preview.filename,
        status: preview.status,
        matchedCount: preview.matchedCount,
        unmatchedCount: preview.unmatchedCount,
        cellCount: preview.cellCount,
        conflictCount: preview.conflictCount,
        previewRows: preview.previewRows,
        conflicts: preview.conflicts,
        createdAt: preview.createdAt.toISOString(),
        appliedAt: preview.appliedAt?.toISOString() ?? null,
      })),
    activities: activitiesRows
      .filter((activity) => {
        const employee = employeeRows.find((row) => row.id === activity.employeeId)
        return canSeeSchedulingSite(employee?.siteId ?? null)
      })
      .map((activity) => ({
        id: activity.id,
        employeeId: activity.employeeId,
        activityCode: activity.activityCode,
        title: activity.title,
        startTime: activity.startTime.toISOString(),
        endTime: activity.endTime.toISOString(),
        status: activity.status,
      })),
  }
}

async function getSchedulingTimesheetBaseOptions() {
  await ensureSchedulingTimesheetTables()
  const [employeeRows, siteRows] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        role: employees.role,
        jobTitle: employees.jobTitle,
        department: employees.department,
        section: employees.section,
        siteId: employees.siteId,
        siteName: sites.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name))
      .catch(() => []),
    db
      .select({
        id: sites.id,
        name: sites.name,
        customerName: sites.customerName,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name))
      .catch(() => []),
  ])

  return {
    employees: employeeRows.map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email ?? '',
      employeeSn: employee.employeeSn ?? '',
      role: employee.jobTitle || employee.role || '',
      department: employee.department ?? null,
      section: employee.section ?? null,
      siteId: employee.siteId,
      locationName: extractSiteNameFromLocation(employee.siteName) || 'Belum diisi',
    })),
    sites: siteRows,
  }
}

function serializeSchedulingConfig(config: typeof timesheetSchedulingConfigs.$inferSelect) {
  return {
    siteId: config.siteId,
    scheduleType: config.scheduleType,
    rosterType: config.rosterType,
    msaType: config.msaType,
    mealsType: config.mealsType,
    overtimeType: config.overtimeType,
    fieldBreakConfig: config.fieldBreakConfig,
    allowanceVariables: config.allowanceVariables,
    overtimeVariables: config.overtimeVariables,
    overtimeConfig: config.overtimeConfig,
    updatedAt: config.updatedAt.toISOString(),
  }
}

function serializeSchedulingStatus(status: typeof timesheetSchedulingStatuses.$inferSelect) {
  return {
    siteId: status.siteId,
    period: status.period,
    scheduleStatus: status.scheduleStatus,
    attendanceStatus: status.attendanceStatus,
    importStatus: status.importStatus,
    conflictCount: status.conflictCount,
    lastGeneratedAt: status.lastGeneratedAt?.toISOString() ?? null,
    lastSavedAt: status.lastSavedAt?.toISOString() ?? null,
    lastImportedAt: status.lastImportedAt?.toISOString() ?? null,
    finalizedAt: status.finalizedAt?.toISOString() ?? null,
    metadata: status.metadata,
    updatedAt: status.updatedAt.toISOString(),
  }
}

function serializeSavedPlan(plan: typeof timesheetSchedulingPlans.$inferSelect) {
  return {
    siteId: plan.siteId,
    period: plan.period,
    siteScheduleType: plan.siteScheduleType,
    draftSchedule: plan.draftSchedule as Array<{ employeeId: number; schedule: string[] }>,
    fixedSchedule: plan.fixedSchedule as Array<{ employeeId: number; schedule: string[] }>,
    employeeProfiles: plan.employeeProfiles as Array<{
      employeeId: number
      section: string
      positionOnSite: string
      kimperLv: boolean
      kimperTh: boolean
    }>,
    fieldBreakConfig: plan.fieldBreakConfig as { workWeeks: number; breakWeeks: number } | null,
    updatedAt: plan.updatedAt.toISOString(),
  }
}

function serializeFieldBreakPlan(plan: typeof timesheetFieldBreakPlans.$inferSelect) {
  return {
    siteId: plan.siteId,
    period: plan.period,
    employeeId: plan.employeeId,
    employeeName: plan.employeeName,
    sectionName: plan.sectionName,
    rosterSection: plan.rosterSection,
    onSiteDate: plan.onSiteDate ? String(plan.onSiteDate) : '',
    dayCount: plan.dayCount ?? null,
    fieldBreakDate: plan.fieldBreakDate ? String(plan.fieldBreakDate) : '',
    fieldBreakEndDate: plan.fieldBreakEndDate ? String(plan.fieldBreakEndDate) : '',
    source: plan.source === 'auto' ? 'auto' : 'manual',
    isLocked: Boolean(plan.isLocked),
    notes: plan.notes ?? '',
    updatedAt: plan.updatedAt.toISOString(),
  }
}

function serializeAttendanceRecord(record: typeof attendanceRecords.$inferSelect) {
  return {
    employeeId: record.employeeId,
    siteId: record.siteId,
    eventType: record.eventType,
    eventTime: record.eventTime.toISOString(),
    status: record.status,
    locationNote: record.locationNote,
    photoUrl: record.photoUrl,
    latitude: record.latitude,
    longitude: record.longitude,
  }
}

function serializeAttendanceOverride(
  override: typeof timesheetAttendanceRealOverrides.$inferSelect
) {
  return {
    siteId: override.siteId,
    period: override.period,
    employeeId: override.employeeId,
    day: override.day,
    status: ['present', 'empty', 'sick', 'leave', 'absent', 'off'].includes(override.status)
      ? override.status
      : 'empty',
    clockIn: override.clockIn,
    clockOut: override.clockOut,
    note: override.note,
    source: ['manual', 'excel', 'attendance'].includes(override.source)
      ? override.source
      : 'manual',
    updatedAt: override.updatedAt.toISOString(),
  }
}

export async function getSchedulingTimesheetOverviewOptions() {
  return getSchedulingTimesheetOptions()
}

export async function getSchedulingTimesheetSetupOptions() {
  return getSchedulingTimesheetOptions()
}

export async function getSchedulingTimesheetScheduleOptions() {
  return getSchedulingTimesheetOptions()
}

export async function getSchedulingTimesheetScheduleV2Options() {
  const [options, access] = await Promise.all([
    getSchedulingTimesheetOptions(),
    getCurrentMenuPermission('scheduling_timesheet'),
  ])
  return { ...options, access }
}

export async function getSchedulingTimesheetAttendanceOptions() {
  const options = await getSchedulingTimesheetOptions()
  return { ...options, savedPlans: options.activeSavedPlans }
}

export async function getSchedulingTimesheetFieldBreakOptions() {
  const options = await getSchedulingTimesheetOptions()
  return {
    ...options,
    fieldBreakRosterPlans: [
      ...options.activeSavedPlans.filter((plan) => plan.sourceVersion !== 'v2'),
      ...options.savedPlansV2.map((plan) => ({
        siteId: plan.siteId,
        period: plan.period,
        siteScheduleType: 'shift',
        draftSchedule: plan.draftSchedule.map((row) => ({
          employeeId: row.employeeId,
          schedule: [...row.schedule],
        })),
        fixedSchedule: (plan.status === 'active' && plan.activeSchedule.length
          ? plan.activeSchedule
          : plan.draftSchedule
        ).map((row) => ({ employeeId: row.employeeId, schedule: [...row.schedule] })),
        employeeProfiles: [],
        fieldBreakConfig: null,
        updatedAt: plan.updatedAt,
        sourceVersion: 'v2' as const,
      })),
    ],
  }
}

export async function getSchedulingTimesheetPayrollOptions() {
  const options = await getSchedulingTimesheetOptions()
  return { ...options, savedPlans: options.activeSavedPlans }
}

export async function getSecurityOverviewData() {
  await ensureHeroGovernanceSeedData()

  const [userCount, activeSessionCount, roleCount, permissionCount, suspendedCount] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(employees),
      db.select({ count: sql<number>`count(*)::int` }).from(session),
      db.select({ count: sql<number>`count(*)::int` }).from(securityRoles),
      db.select({ count: sql<number>`count(*)::int` }).from(securityPermissions),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(employees)
        .where(eq(employees.isActive, false)),
    ])

  const recentLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      description: auditLogs.description,
      severity: auditLogs.severity,
      createdAt: auditLogs.createdAt,
      actorName: employees.name,
      actorEmail: employees.email,
    })
    .from(auditLogs)
    .leftJoin(employees, eq(auditLogs.actorEmployeeId, employees.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10)

  return {
    metrics: [
      {
        title: 'Total Users',
        value: `${userCount[0]?.count ?? 0}`,
        href: '/dashboard/security/users',
      },
      {
        title: 'Active Sessions',
        value: `${activeSessionCount[0]?.count ?? 0}`,
        href: '/dashboard/security',
      },
      { title: 'Roles', value: `${roleCount[0]?.count ?? 0}`, href: '/dashboard/security/roles' },
      {
        title: 'Permissions',
        value: `${permissionCount[0]?.count ?? 0}`,
        href: '/dashboard/security/roles',
      },
      {
        title: 'Suspended Users',
        value: `${suspendedCount[0]?.count ?? 0}`,
        href: '/dashboard/security/users',
      },
    ],
    recentLogs,
  }
}

export async function getSecurityUsersData() {
  const rows = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      siteId: employees.siteId,
      joinDate: employees.joinDate,
      name: employees.name,
      profileImage: authUser.image,
      birthDate: employees.birthDate,
      domicile: employees.domicile,
      directManagerId: employees.directManagerId,
      section: masterSections.name,
      sectionId: employees.sectionId,
      jobTitle: sql<string>`coalesce(${hrPositions.rankName}, ${employees.jobTitle}, '')`.as(
        'job_title'
      ),
      workLocation: sql<string>`coalesce(${hrOrgNodes.name}, ${sites.name}, '')`.as(
        'work_location'
      ),
      phoneNumber: employees.phoneNumber,
      email: employees.email,
      employmentStatus: employees.employmentStatus,
      employeeStatusType: employees.employeeStatusType,
      accessRole:
        sql<string>`coalesce(${employees.accessRole}, ${hrPositions.levelName}, 'User')`.as(
          'access_role'
        ),
      role: sql<string>`coalesce(${hrPositions.rankName}, 'Employee')`.as('role'),
      department: masterDepartments.name,
      departmentId: employees.departmentId,
      levelName: sql<string>`coalesce(${hrPositions.levelName}, ${employees.levelName}, '')`.as(
        'level_name'
      ),
      fitStatus: sql<string>`'fit'`.as('fit_status'),
      isActive: employees.isActive,
      siteName: sites.name,
      totalPoints: sql<number>`0`.as('total_points'),
      contractEnd: employees.contractDurationEnd,
      gender: employees.gender,
      religion: employees.religion,
      education: employees.education,
      maritalStatus: employees.maritalStatus,
      pointOfHire: employees.pointOfHire,
      contractDurationStart: employees.contractDurationStart,
      contractDurationEnd: employees.contractDurationEnd,
      permanentDate: employees.permanentDate,
    })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(hrOrgNodes, eq(employees.orgNodeId, hrOrgNodes.id))
    .where(eq(employees.isActive, true))
    .orderBy(employees.name)

  const uniqueRowsMap = new Map()
  for (const row of rows) {
    if (!uniqueRowsMap.has(row.id)) {
      uniqueRowsMap.set(row.id, row)
    }
  }
  const uniqueRows = Array.from(uniqueRowsMap.values())

  const employeeNameById = new Map(uniqueRows.map((row) => [row.id, row.name]))

  return uniqueRows.map<SecurityUserRecord>((row: any) => ({
    id: row.id,
    siteId: row.siteId,
    employeeSn: row.employeeSn,
    contractEnd: row.contractEnd ?? null,
    joinYear: row.joinDate ? new Date(row.joinDate).getFullYear() : new Date().getFullYear(),
    name: row.name,
    profileImage: row.profileImage,
    birthPlaceDate: row.birthDate ? new Date(row.birthDate).toISOString().slice(0, 10) : '',
    domicile: row.domicile ?? '',
    directManagerId: row.directManagerId,
    directManagerName: row.directManagerId
      ? (employeeNameById.get(row.directManagerId) ?? null)
      : null,
    section: row.section ?? '',
    sectionId: row.sectionId ?? null,
    department: row.department ?? '',
    departmentId: row.departmentId ?? null,
    jobTitle: row.jobTitle ?? '',
    workLocation: row.workLocation ?? '',
    employeeStatusType: row.employeeStatusType ?? '',
    phoneNumber: row.phoneNumber ?? '',
    email: row.email ?? '',
    status: row.isActive ? (row.employmentStatus ?? 'active') : 'inactive',
    role: row.role,
    accessRole: row.accessRole,
    levelName: row.levelName ?? '',
    fitStatus: row.fitStatus,
    isActive: row.isActive,
    siteName: row.siteName ?? row.workLocation ?? 'Belum diisi',
    totalPoints: row.totalPoints,
    gender: row.gender ?? '',
    religion: row.religion ?? '',
    education: row.education ?? '',
    maritalStatus: row.maritalStatus ?? '',
    pointOfHire: row.pointOfHire ?? '',
    joinDate: row.joinDate ?? null,
    contractDurationStart: row.contractDurationStart ?? null,
    contractDurationEnd: row.contractDurationEnd ?? null,
    permanentDate: row.permanentDate ?? null,
    birthDate: row.birthDate ?? null,
  }))
}

export async function getSecurityRolesData() {
  await ensureHeroGovernanceSeedData()

  const [roles, permissions, grants, menuItems, menuPermissions, users] = await Promise.all([
    db.select().from(securityRoles).orderBy(securityRoles.name),
    db
      .select()
      .from(securityPermissions)
      .orderBy(securityPermissions.resource, securityPermissions.action),
    db.select().from(securityRolePermissions),
    db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.menuArea, navbarMenuItems.section, navbarMenuItems.sortOrder),
    db.select().from(roleMenuPermissions),
    db
      .select({
        id: employees.id,
        accessRole: employees.accessRole,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        section: employees.section,
        isActive: employees.isActive,
      })
      .from(employees)
      .orderBy(employees.name),
  ])

  const rolePermissionMap = new Set(grants.map((grant) => `${grant.roleId}:${grant.permissionId}`))
  const userCountByRole = users.reduce<Record<string, number>>((accumulator, user) => {
    accumulator[user.accessRole] = (accumulator[user.accessRole] ?? 0) + 1
    return accumulator
  }, {})

  return {
    roles: roles.map((role) => ({
      ...role,
      assignedUsers: userCountByRole[role.name] ?? 0,
    })),
    permissions,
    matrix: roles.map((role) => ({
      role,
      permissions: permissions.map((permission) => ({
        permission,
        enabled: rolePermissionMap.has(`${role.id}:${permission.id}`),
      })),
    })),
    menuItems: dedupeMenuItemsByPage(menuItems),
    menuPermissions,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      accessRole: u.accessRole,
      jobTitle: u.jobTitle,
      section: u.section,
      isActive: u.isActive,
    })),
  }
}

export async function getAuditLogsPageData() {
  await ensureHeroGovernanceSeedData()

  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityLabel: auditLogs.entityLabel,
      description: auditLogs.description,
      severity: auditLogs.severity,
      createdAt: auditLogs.createdAt,
      actorName: employees.name,
      actorEmail: employees.email,
    })
    .from(auditLogs)
    .leftJoin(employees, eq(auditLogs.actorEmployeeId, employees.id))
    .orderBy(desc(auditLogs.createdAt))
}

export async function getEmailDeliveryLogsData() {
  await ensureHeroGovernanceSeedData()

  return db
    .select({
      id: emailDeliveryLogs.id,
      deliveryChannel: emailDeliveryLogs.deliveryChannel,
      toEmail: emailDeliveryLogs.toEmail,
      ccEmail: emailDeliveryLogs.ccEmail,
      fromEmail: emailDeliveryLogs.fromEmail,
      templateName: emailDeliveryLogs.templateName,
      templateCode: emailDeliveryLogs.templateCode,
      subject: emailDeliveryLogs.subject,
      status: emailDeliveryLogs.status,
      errorMessage: emailDeliveryLogs.errorMessage,
      htmlContent: emailDeliveryLogs.htmlContent,
      textContent: emailDeliveryLogs.textContent,
      sentAt: emailDeliveryLogs.sentAt,
      createdAt: emailDeliveryLogs.createdAt,
      employeeName: employees.name,
    })
    .from(emailDeliveryLogs)
    .leftJoin(employees, eq(emailDeliveryLogs.employeeId, employees.id))
    .orderBy(desc(emailDeliveryLogs.createdAt))
}

export async function getEmailTemplatesData() {
  await ensureHeroGovernanceSeedData()

  return db
    .select()
    .from(emailTemplates)
    .orderBy(desc(emailTemplates.isActive), asc(emailTemplates.name), asc(emailTemplates.id))
}

export async function getHseSafetyNotificationConfigData() {
  await ensureHeroGovernanceSeedData()

  const [config] = await db
    .select()
    .from(hseSafetyNotificationConfig)
    .orderBy(desc(hseSafetyNotificationConfig.updatedAt))
    .limit(1)

  return (
    config ?? {
      id: 0,
      recipientEmails: '',
      ccEmails: '',
      isActive: true,
      updatedAt: new Date(),
    }
  )
}

export async function getHumanCapitalNotificationConfigData() {
  await ensureHeroGovernanceSeedData()

  const [config] = await db
    .select()
    .from(hcNotificationConfig)
    .orderBy(desc(hcNotificationConfig.updatedAt))
    .limit(1)

  return (
    config ?? {
      id: 0,
      recipientEmails: '',
      ccEmails: '',
      isActive: true,
      updatedAt: new Date(),
    }
  )
}

export async function getActiveEmployeesForSelect() {
  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name))

  return rows
}
export async function getEmailSmtpSettingsData() {
  await ensureHeroGovernanceSeedData()

  const [settings] = await db
    .select()
    .from(emailSmtpSettings)
    .orderBy(
      desc(emailSmtpSettings.isActive),
      desc(emailSmtpSettings.updatedAt),
      desc(emailSmtpSettings.id)
    )
    .limit(1)

  if (!settings) {
    const [created] = await db.insert(emailSmtpSettings).values(EMAIL_SMTP_SETTING_SEED).returning()

    return {
      ...created,
      hasPassword: Boolean(created.passwordSecret),
    }
  }

  return {
    ...settings,
    hasPassword: Boolean(settings.passwordSecret),
  }
}

export async function getPwaPushSettingsData() {
  await ensureHeroGovernanceSeedData()

  const [settings] = await db
    .select()
    .from(notificationChannelSettings)
    .where(eq(notificationChannelSettings.channel, 'pwa_push'))
    .limit(1)

  if (!settings) {
    const fallback = NOTIFICATION_CHANNEL_SETTING_SEEDS.find(
      (item) => item.channel === 'pwa_push'
    ) ?? {
      channel: 'pwa_push',
      isEnabled: true,
      realtimeBadge: false,
      soundEnabled: false,
      autoMarkRead: false,
      vapidPublicKey: '',
      vapidPrivateKey: '',
      pushSubject: 'mailto:noreply@chitraparatama.co.id',
      serviceWorkerPath: '/sw.js',
    }

    const [created] = await db
      .insert(notificationChannelSettings)
      .values({
        channel: fallback.channel,
        isEnabled: fallback.isEnabled,
        realtimeBadge: fallback.realtimeBadge,
        soundEnabled: fallback.soundEnabled,
        autoMarkRead: fallback.autoMarkRead,
        vapidPublicKey: fallback.vapidPublicKey,
        vapidPrivateKey: fallback.vapidPrivateKey,
        pushSubject: fallback.pushSubject,
        serviceWorkerPath: fallback.serviceWorkerPath,
      })
      .returning()

    return created
  }

  return settings
}

export async function getNavbarSettingsData() {
  await ensureHeroGovernanceSeedData()

  const [theme] = await db
    .select()
    .from(navbarThemes)
    .orderBy(desc(navbarThemes.createdAt))
    .limit(1)
  const menuItems = await db
    .select()
    .from(navbarMenuItems)
    .orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder)

  return { theme, menuItems: dedupeMenuItemsByPage(menuItems) }
}

export async function getGroupLabelStyles() {
  await ensureHeroGovernanceSeedData()
  const [style] = await db
    .select()
    .from(navbarGroupLabelStyles)
    .where(eq(navbarGroupLabelStyles.section, '__global__'))
    .limit(1)
  return style?.textColor ?? '#6B7280'
}

export async function getSecurityRoleOptions() {
  await ensureHeroGovernanceSeedData()

  return db.select().from(securityRoles).orderBy(securityRoles.name)
}

export async function getSidebarDataForUser(email: string) {
  await ensureHeroGovernanceSeedData()

  const [employee] = await db
    .select({
      accessRole: employees.accessRole,
    })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(or(eq(employees.email, email), eq(authUser.email, email)))
    .limit(1)

  const roleName = employee?.accessRole ?? 'Super Admin'
  const [role] = await db
    .select()
    .from(securityRoles)
    .where(eq(securityRoles.name, roleName))
    .limit(1)

  if (!role) {
    return {
      navMain: [] as Array<{
        id?: number
        menuArea: string
        section: string
        title: string
        url: string
        iconName: string
        resource?: string
        sortOrder?: number
        isVisible?: boolean
        openInNewTab?: boolean
        groupLabel?: string | null
      }>,
      navSecondary: [] as Array<{
        id?: number
        menuArea: string
        section: string
        title: string
        url: string
        iconName: string
        resource?: string
        sortOrder?: number
        isVisible?: boolean
        openInNewTab?: boolean
        groupLabel?: string | null
      }>,
      documents: [] as Array<{
        id?: number
        menuArea: string
        section: string
        title: string
        url: string
        iconName: string
        resource?: string
        sortOrder?: number
        isVisible?: boolean
        openInNewTab?: boolean
        groupLabel?: string | null
      }>,
    }
  }

  const permittedMenuItems = await db
    .select({
      id: navbarMenuItems.id,
      canView: roleMenuPermissions.canView,
      menuArea: navbarMenuItems.menuArea,
      section: navbarMenuItems.section,
      title: navbarMenuItems.title,
      url: navbarMenuItems.url,
      iconName: navbarMenuItems.iconName,
      resource: navbarMenuItems.resource,
      sortOrder: navbarMenuItems.sortOrder,
      isVisible: navbarMenuItems.isVisible,
      openInNewTab: navbarMenuItems.openInNewTab,
      groupLabel: navbarMenuItems.groupLabel,
    })
    .from(roleMenuPermissions)
    .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
    .where(eq(roleMenuPermissions.roleId, role.id))
    .orderBy(navbarMenuItems.menuArea, navbarMenuItems.section, navbarMenuItems.sortOrder)

  const visibleItems = dedupeMenuItemsByPage(
    permittedMenuItems.filter((item) => item.isVisible && item.canView)
  )

  return {
    navMain: visibleItems.filter((item) => item.menuArea === 'main'),
    navSecondary: visibleItems.filter((item) => item.menuArea === 'secondary'),
    documents: visibleItems.filter((item) => item.menuArea === 'document'),
  }
}

export async function getEmployeeDisplayDataByEmail(email: string) {
  await ensureHeroGovernanceSeedData()

  const [employee] = await db
    .select({
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
    })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(or(eq(employees.email, email), eq(authUser.email, email)))
    .limit(1)

  return employee ?? null
}

export async function getExecutiveHighlights() {
  await ensureHeroSeedData()

  const site = await db.select().from(sites).limit(1)
  const [report] = await db
    .select()
    .from(dailyReports)
    .orderBy(desc(dailyReports.reportDate))
    .limit(1)
  const [topPerformer] = await db
    .select({
      name: employees.name,
      role: employees.role,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .orderBy(desc(employees.totalPoints))
    .limit(1)

  return {
    site: site[0],
    report,
    topPerformer,
  }
}
