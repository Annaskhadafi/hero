import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm'
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
  navbarThemes,
  orgChartNodes,
  orgChartStructures,
  orgNodeAssignments,
  pointEvents,
  penaltyEvents,
  pointDisputes,
  levels,
  badges,
  employeeBadges,
  hrDepartments,
  hrEmployeeStatuses,
  hrEmployees,
  hrOrgNodes,
  hrPositions,
  hrSections,
  hrSites,
  hrWorkLocations,
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
  timesheetSchedulingStatuses,
} from '@/db/schema/timesheet'
import { ensureApprovalBlueprintSeedData } from '@/lib/approval-blueprint'
import {
  ensureMasterCategoryTables,
  getActiveMasterCategoryOptionMap,
} from '@/lib/master-categories'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
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
  department: string
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
        id: hrSites.id,
        name: hrSites.name,
        location: hrSites.name,
      })
      .from(hrSites)
      .where(eq(hrSites.isActive, true))
      .orderBy(asc(hrSites.name)),
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
]

const RAW_SIDEBAR_MENU_SEEDS = [
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
  // Daily Activity
  {
    menuArea: 'main',
    section: 'Daily Activity',
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
    section: 'Daily Activity',
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
    section: 'Daily Activity',
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
    section: 'Daily Activity',
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
    section: 'Daily Activity',
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
    section: 'Daily Activity',
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
    section: 'Daily Activity',
    title: 'Timesheet Realisasi',
    url: '/dashboard/timesheet',
    iconName: 'folder',
    resource: 'tire_engineer',
    sortOrder: 7,
    isVisible: true,
    openInNewTab: false,
  },
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
    title: 'Setup Roster',
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
    title: 'Roster & Schedule',
    url: '/dashboard/scheduling-timesheet/schedule',
    iconName: 'clock',
    resource: 'scheduling_timesheet_schedule',
    sortOrder: 3,
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
    sortOrder: 4,
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
    sortOrder: 5,
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
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  // Approval
  {
    menuArea: 'main',
    section: 'Approval',
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
    title: 'Approval Blueprint',
    url: '/dashboard/activity-hub/blueprint',
    iconName: 'file-word',
    resource: 'activity_blueprint',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Approval',
    title: 'Notification Center',
    url: '/dashboard/notifications',
    iconName: 'mail',
    resource: 'notification_center',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  // Master Data
  {
    menuArea: 'secondary',
    section: 'Master Data',
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
    section: 'Master Data',
    title: 'Form Builder',
    url: '/dashboard/form-studio',
    iconName: 'file-word',
    resource: 'form_studio',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  // HR
  {
    menuArea: 'main',
    section: 'HR',
    title: 'HC Overview',
    url: '/dashboard/hc',
    iconName: 'users',
    resource: 'hc_safety',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
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
    section: 'HR',
    title: 'Recruitment',
    url: '/dashboard/hc/recruitment',
    iconName: 'user-plus',
    resource: 'hc_recruitment',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Online Tests',
    url: '/dashboard/hc/recruitment/tests',
    iconName: 'file-text',
    resource: 'hc_recruitment_tests',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Certificates',
    url: '/dashboard/hc/certificate',
    iconName: 'address-card',
    resource: 'hc_certificate',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Technical Engineer',
    url: '/dashboard/hc/technical-engineer',
    iconName: 'wrench',
    resource: 'hc_technical_engineer',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Surat',
    url: '/dashboard/hc/surat',
    iconName: 'file-word',
    resource: 'hc_surat',
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Surat Tugas',
    url: '/dashboard/hc/surat-tugas',
    iconName: 'envelope-open',
    resource: 'hc_st',
    sortOrder: 7,
    isVisible: false,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Surat Archive',
    url: '/dashboard/hc/surat/archive',
    iconName: 'archive',
    resource: 'hc_surat_archive',
    sortOrder: 11,
    isVisible: false,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Training Enhancement',
    url: '/dashboard/hc/training',
    iconName: 'target',
    resource: 'hc_training_enhanced',
    sortOrder: 12,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
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
    section: 'HR',
    title: 'Disciplinary',
    url: '/dashboard/hc/disciplinary',
    iconName: 'shield-alert',
    resource: 'hc_disciplinary',
    sortOrder: 14,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Contract Review',
    url: '/dashboard/hc/contract-review',
    iconName: 'file-signature',
    resource: 'hc_contract_review',
    sortOrder: 14, // sort order can be overlapping, it's just an int
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Org Structure',
    url: '/dashboard/hc/org-chart',
    iconName: 'git-branch',
    resource: 'hc_org_chart',
    sortOrder: 15,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
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
    title: 'Records',
    url: '/dashboard/attendance/records',
    iconName: 'clock',
    resource: 'attendance_records',
    sortOrder: 2,
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
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HR',
    title: 'Training Records',
    url: '/dashboard/training-records',
    iconName: 'list-details',
    resource: 'training_records',
    sortOrder: 16,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'HR',
    title: 'User Management',
    url: '/dashboard/security/users',
    iconName: 'users',
    resource: 'security_users',
    sortOrder: 17,
    isVisible: true,
    openInNewTab: false,
  },
  // HSE
  {
    menuArea: 'main',
    section: 'HSE',
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
    title: 'Incident Report',
    url: '/dashboard/hse/incident-report',
    iconName: 'alert-triangle',
    resource: 'hse_incident_report',
    sortOrder: 9,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    title: 'Izin Kerja PTW',
    url: '/dashboard/hse/izin-kerja-ptw',
    iconName: 'checklist',
    resource: 'hse_izin_kerja_ptw',
    sortOrder: 10,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'HSE',
    title: 'JSA',
    url: '/dashboard/hse/jsa',
    iconName: 'checklist',
    resource: 'hse_jsa',
    sortOrder: 11,
    isVisible: true,
    openInNewTab: false,
  },
  // Repair & Retread Operation
  {
    menuArea: 'main',
    section: 'Repair & Retread Operation',
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
    section: 'Repair & Retread Operation',
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
    section: 'Repair & Retread Operation',
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
    section: 'Repair & Retread Operation',
    title: 'Stock Material SAP',
    url: '/dashboard/repair-retread/stock-material-sap',
    iconName: 'database',
    resource: 'stock_material_sap',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  // Warehouse Repair
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Dashboard',
    url: '/dashboard/warehouse-repair',
    iconName: 'chart-bar',
    resource: 'warehouse_repair_dashboard',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Data Barang',
    url: '/dashboard/warehouse-repair/barang',
    iconName: 'database',
    resource: 'warehouse_repair_barang',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Jenis Barang',
    url: '/dashboard/warehouse-repair/jenis',
    iconName: 'folder',
    resource: 'warehouse_repair_jenis',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Satuan',
    url: '/dashboard/warehouse-repair/satuan',
    iconName: 'folder',
    resource: 'warehouse_repair_satuan',
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Barang Masuk',
    url: '/dashboard/warehouse-repair/barang-masuk',
    iconName: 'checklist',
    resource: 'warehouse_repair_barang_masuk',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Barang Keluar',
    url: '/dashboard/warehouse-repair/barang-keluar',
    iconName: 'list-details',
    resource: 'warehouse_repair_barang_keluar',
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Laporan Stok',
    url: '/dashboard/warehouse-repair/laporan-stok',
    iconName: 'report',
    resource: 'warehouse_repair_laporan_stok',
    sortOrder: 7,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Laporan Barang Masuk',
    url: '/dashboard/warehouse-repair/laporan-barang-masuk',
    iconName: 'report',
    resource: 'warehouse_repair_laporan_barang_masuk',
    sortOrder: 8,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Warehouse Repair',
    title: 'Laporan Barang Keluar',
    url: '/dashboard/warehouse-repair/laporan-barang-keluar',
    iconName: 'report',
    resource: 'warehouse_repair_laporan_barang_keluar',
    sortOrder: 9,
    isVisible: true,
    openInNewTab: false,
  },
  // Logistik
  {
    menuArea: 'main',
    section: 'Logistik',
    title: 'Cargo Manifest',
    url: '/dashboard/cargo-manifest',
    iconName: 'folder',
    resource: 'cargo_manifest',
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  // Report
  {
    menuArea: 'main',
    section: 'Report',
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
    section: 'Report',
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
    section: 'Report',
    title: 'Points Overview',
    url: '/dashboard/leaderboard',
    iconName: 'settings',
    resource: 'point_setting',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'main',
    section: 'Report',
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
    section: 'Report',
    title: 'Audit Log',
    url: '/dashboard/security/audit-logs',
    iconName: 'report',
    resource: 'security_audit',
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  // Settings
  {
    menuArea: 'main',
    section: 'Setting',
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
    section: 'Setting',
    title: 'Navbar Setting',
    url: '/dashboard/settings/navbar',
    iconName: 'settings',
    resource: 'settings_navbar',
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Setting',
    title: 'Portal Chitra Settings',
    url: '/dashboard/settings/portal-chitra',
    iconName: 'settings',
    resource: 'settings_portal_chitra',
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: 'secondary',
    section: 'Setting',
    title: 'Email Delivery Log',
    url: '/dashboard/settings/email',
    iconName: 'mail',
    resource: 'settings_email',
    sortOrder: 4,
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
}).map((item) =>
  item.resource === 'activity_blueprint'
    ? { ...item, menuArea: 'secondary', section: 'Setting', isVisible: false }
    : item
)

const DEPRECATED_MENU_RESOURCES = ['slow_moving', 'hc_surat_keterangan']
const DEPRECATED_MENU_URLS = ['/dashboard/slow-moving', '/dashboard/hc/surat-keterangan']

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
    name: 'Auth Magic Link',
    templateCode: 'auth_magic_link',
    templateType: 'Magic Link',
    deliveryChannel: 'email',
    recipientScope: 'all',
    ccEmail: '',
    subject: 'Magic link masuk untuk {{userName}}',
    htmlContent: '<p>Gunakan link berikut untuk masuk ke HERO: {{magicLink}}</p>',
    textContent: 'Gunakan link berikut untuk masuk ke HERO: {{magicLink}}',
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
    htmlContent: '<p>Request #{{requestId}} menunggu approval Anda.</p>',
    textContent: 'Request #{{requestId}} menunggu approval Anda.',
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
    htmlContent: '<p>SLA request #{{requestId}} hampir jatuh tempo.</p>',
    textContent: 'SLA request #{{requestId}} hampir jatuh tempo.',
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
    htmlContent: '<p>Daily report {{siteName}} tanggal {{reportDate}} siap dikirim.</p>',
    textContent: 'Daily report {{siteName}} tanggal {{reportDate}} siap dikirim.',
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

function getDefaultMenuPermission(roleName: string, resource: string) {
  if (roleName === 'Super Admin') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canSelectAll: true,
    }
  }

  if (resource === 'hse_checklist_generator') {
    const allowed = roleName === 'User Safety'
    return {
      canView: allowed,
      canEdit: allowed,
      canDelete: allowed,
      canSelectAll: false,
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
      ].includes(resource),
      canSelectAll: false,
    }
  }

  return {
    canView: true,
    canEdit: !['settings_email', 'portal_chitra', 'settings_portal_chitra'].includes(resource),
    canDelete: false,
    canSelectAll: false,
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
      emailTemplateCount,
      notificationChannelSettingCount,
      notificationPreferenceCount,
      notificationSubscriptionCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(securityPermissions),
      db.select({ count: sql<number>`count(*)::int` }).from(securityRolePermissions),
      db.select({ count: sql<number>`count(*)::int` }).from(navbarThemes),
      db.select({ count: sql<number>`count(*)::int` }).from(masterAttendanceShifts),
      db.select({ count: sql<number>`count(*)::int` }).from(emailSmtpSettings),
      db.select({ count: sql<number>`count(*)::int` }).from(emailTemplates),
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
        existingMenuItem.openInNewTab !== menuSeed.openInNewTab
      ) {
        await db
          .update(navbarMenuItems)
          .set(menuSeed)
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

    if ((emailTemplateCount[0]?.count ?? 0) === 0) {
      await db.insert(emailTemplates).values(EMAIL_TEMPLATE_SEEDS)
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
        role: employees.role,
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
      ),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
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

  return {
    rows,
    employeeOptions,
    departmentOptions,
    yearOptions,
  }
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
        role: employees.role,
        siteId: employees.siteId,
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
    fieldBreakPlans,
    attendanceRows,
    attendanceOverrides,
    schedulingConfigs,
    schedulingStatuses,
    importPreviews,
    activitiesRows,
  ] = await Promise.all([
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
    db
      .select()
      .from(timesheetSchedulingPlans)
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
  ])

  const currentEmployee = authSession?.user?.email
    ? employeeRows.find(
        (employee) => employee.email?.toLowerCase() === authSession.user.email.toLowerCase()
      )
    : null

  return {
    currentEmployeeSiteId: currentEmployee?.siteId ?? null,
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
    savedPlans: savedPlans.map((plan) => ({
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
    })),
    fieldBreakPlans: fieldBreakPlans.map((plan) => ({
      siteId: plan.siteId,
      period: plan.period,
      employeeId: plan.employeeId,
      employeeName: plan.employeeName,
      sectionName: plan.sectionName,
      rosterSection: plan.rosterSection,
      onSiteDate: plan.onSiteDate ? String(plan.onSiteDate) : '',
      dayCount: plan.dayCount ?? null,
      fieldBreakDate: plan.fieldBreakDate ? String(plan.fieldBreakDate) : '',
      updatedAt: plan.updatedAt.toISOString(),
    })),
    attendanceRecords: attendanceRows.map((record) => ({
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
    attendanceOverrides: attendanceOverrides.map((override) => ({
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
    schedulingConfigs: schedulingConfigs.map((config) => ({
      siteId: config.siteId,
      scheduleType: config.scheduleType,
      rosterType: config.rosterType,
      msaType: config.msaType,
      mealsType: config.mealsType,
      overtimeType: config.overtimeType,
      fieldBreakConfig: config.fieldBreakConfig,
      allowanceVariables: config.allowanceVariables,
      overtimeVariables: config.overtimeVariables,
      updatedAt: config.updatedAt.toISOString(),
    })),
    schedulingStatuses: schedulingStatuses.map((status) => ({
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
    importPreviews: importPreviews.map((preview) => ({
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
    activities: activitiesRows.map((activity) => ({
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

export async function getSchedulingTimesheetAttendanceOptions() {
  return getSchedulingTimesheetOptions()
}

export async function getSchedulingTimesheetFieldBreakOptions() {
  return getSchedulingTimesheetOptions()
}

export async function getSchedulingTimesheetPayrollOptions() {
  return getSchedulingTimesheetOptions()
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
      id: hrEmployees.id,
      employeeSn: hrEmployees.employeeId,
      siteId: hrEmployees.siteId,
      joinDate: hrEmployees.joinDate,
      name: hrEmployees.fullName,
      profileImage: authUser.image,
      birthDate: hrEmployees.birthDate,
      domicile: employees.domicile,
      directManagerId: employees.directManagerId,
      section: hrSections.name,
      jobTitle: hrPositions.rankName,
      workLocation:
        sql<string>`coalesce(${hrWorkLocations.name}, ${hrOrgNodes.name}, ${hrSites.name}, '')`.as(
          'work_location'
        ),
      phoneNumber: employees.phoneNumber,
      email: hrEmployees.email,
      employmentStatus: hrEmployeeStatuses.name,
      employeeStatusType: hrEmployeeStatuses.name,
      accessRole:
        sql<string>`coalesce(${employees.accessRole}, ${hrPositions.levelName}, 'User')`.as(
          'access_role'
        ),
      role: sql<string>`coalesce(${hrPositions.rankName}, 'Employee')`.as('role'),
      department: hrDepartments.name,
      levelName: hrPositions.levelName,
      fitStatus: sql<string>`'fit'`.as('fit_status'),
      isActive: hrEmployees.isActive,
      siteName: hrSites.name,
      totalPoints: sql<number>`0`.as('total_points'),
      contractEnd: hrEmployees.contractEnd,
    })
    .from(hrEmployees)
    .leftJoin(
      employees,
      or(eq(employees.employeeSn, hrEmployees.employeeId), eq(employees.email, hrEmployees.email))
    )
    .leftJoin(authUser, eq(hrEmployees.authUserId, authUser.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .leftJoin(hrSites, eq(hrEmployees.siteId, hrSites.id))
    .leftJoin(hrWorkLocations, eq(hrEmployees.workLocationId, hrWorkLocations.id))
    .leftJoin(hrOrgNodes, eq(hrEmployees.orgNodeId, hrOrgNodes.id))
    .leftJoin(
      hrEmployeeStatuses,
      eq(hrEmployees.demographicEmployeeStatusCode, hrEmployeeStatuses.code)
    )
    .orderBy(hrEmployees.fullName)

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
    department: row.department ?? '',
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
    .where(eq(employees.email, email))
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
    .where(eq(employees.email, email))
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
