import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  approvals,
  auditLogs,
  attendanceRecords,
  dailyReports,
  emailDeliveryLogs,
  employees,
  hseIncidents,
  hseObservations,
  navbarMenuItems,
  navbarThemes,
  pointEvents,
  roleMenuPermissions,
  securityPermissions,
  securityRolePermissions,
  securityRoles,
  sites,
  timesheetEntries,
  trainingRecords,
  wellnessRecords,
} from "@/db/schema/hero";
import { session, user as authUser } from "@/db/schema/auth";

let seedPromise: Promise<void> | null = null;
let governanceSeedPromise: Promise<void> | null = null;

export type SecurityUserRecord = {
  id: number;
  employeeSn: string;
  joinYear: number;
  name: string;
  profileImage: string | null;
  birthPlaceDate: string;
  domicile: string;
  directManagerId: number | null;
  directManagerName: string | null;
  section: string;
  department: string;
  jobTitle: string;
  workLocation: string;
  phoneNumber: string;
  email: string;
  status: string;
  role: string;
  accessRole: string;
  employeeStatusType: string;
  levelName: string;
  fitStatus: string;
  isActive: boolean;
  siteName: string;
  totalPoints: number;
};

export type SecurityRoleMenuPermissionRecord = {
  id: number;
  roleId: number;
  menuItemId: number;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSelectAll: boolean;
};

function toCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function minutesToHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} jam`;
}

async function ensureHeroEmployeeProfileColumns() {
  await db.execute(sql`
    alter table hero_employees add column if not exists employee_sn text not null default '';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists join_year integer not null default extract(year from current_date)::int;
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists birth_place_date text not null default '';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists domicile text not null default '';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists direct_manager_id integer;
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists section text not null default '';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists job_title text not null default '';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists work_location text not null default '';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists phone_number text not null default '';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists employment_status text not null default 'active';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists employee_status_type text not null default 'Permanen | Staff';
  `);
  await db.execute(sql`
    alter table hero_employees add column if not exists access_role text not null default 'Site Admin';
  `);

  await db.execute(sql`
    update hero_employees
    set
      employee_sn = coalesce(nullif(employee_sn, ''), 'EMP-' || lpad(id::text, 4, '0')),
      join_year = coalesce(join_year, extract(year from created_at)::int, extract(year from current_date)::int),
      birth_place_date = coalesce(birth_place_date, ''),
      domicile = coalesce(nullif(domicile, ''), 'Belum diisi'),
      section = coalesce(nullif(section, ''), department),
      job_title = coalesce(nullif(job_title, ''), role),
      work_location = coalesce(nullif(work_location, ''), 'Bengalon Pit North'),
      phone_number = coalesce(phone_number, ''),
      employment_status = coalesce(nullif(employment_status, ''), case when is_active then 'active' else 'inactive' end),
      access_role = coalesce(nullif(access_role, ''), 'Site Admin');
  `);
}

async function seedSecurityUserProfiles() {
  const currentEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      directManagerId: employees.directManagerId,
    })
    .from(employees);

  if (currentEmployees.length === 0) {
    return;
  }

  const employeeByName = Object.fromEntries(
    currentEmployees.map((employee) => [employee.name, employee]),
  );

  const profileSeeds = [
    {
      name: "Rian Kurniawan",
      values: {
        employeeSn: "HC-001",
        joinYear: 2018,
        birthPlaceDate: "Samarinda, 12 Januari 1989",
        domicile: "Sangatta",
        section: "Field Operations",
        department: "Central Service",
        jobTitle: "Foreman",
        workLocation: "Bengalon Pit North",
        phoneNumber: "0812-8800-1101",
        employmentStatus: "active",
        accessRole: "Super Admin",
        role: "Foreman",
      },
    },
    {
      name: "Arman Saputra",
      values: {
        employeeSn: "HC-002",
        joinYear: 2020,
        birthPlaceDate: "Bontang, 04 Mei 1994",
        domicile: "Sangatta Utara",
        section: "Tyre Operations",
        department: "Central Service",
        jobTitle: "Technician",
        workLocation: "Bengalon Pit North",
        phoneNumber: "0812-8800-1102",
        employmentStatus: "active",
        accessRole: "Site Admin",
        role: "Technician",
      },
    },
    {
      name: "Soni Darmawan",
      values: {
        employeeSn: "HC-003",
        joinYear: 2019,
        birthPlaceDate: "Balikpapan, 28 September 1991",
        domicile: "Sangatta Selatan",
        section: "Governance",
        department: "HSE",
        jobTitle: "HSE Officer",
        workLocation: "Bengalon Pit North",
        phoneNumber: "0812-8800-1103",
        employmentStatus: "active",
        accessRole: "Site Admin",
        role: "HSE Officer",
      },
    },
    {
      name: "Mira Andini",
      values: {
        employeeSn: "HC-004",
        joinYear: 2023,
        birthPlaceDate: "Makassar, 16 Februari 1998",
        domicile: "Sangatta Baru",
        section: "People Operations",
        department: "HC",
        jobTitle: "Admin Site",
        workLocation: "Bengalon Pit North",
        phoneNumber: "0812-8800-1104",
        employmentStatus: "probation",
        accessRole: "HC Manager",
        role: "Admin Site",
      },
    },
  ] as const;

  for (const profileSeed of profileSeeds) {
    await db
      .update(employees)
      .set(profileSeed.values)
      .where(eq(employees.name, profileSeed.name));
  }

  const manager = employeeByName["Rian Kurniawan"];

  if (manager) {
    for (const reportName of ["Arman Saputra", "Soni Darmawan", "Mira Andini"]) {
      const report = employeeByName[reportName];

      if (!report || report.directManagerId === manager.id) {
        continue;
      }

      await db
        .update(employees)
        .set({ directManagerId: manager.id })
        .where(eq(employees.id, report.id));
    }
  }
}

const GOVERNANCE_ROLE_SEEDS = [
  {
    name: "Super Admin",
    description: "Kontrol penuh modul HERO termasuk konfigurasi sistem.",
    scope: "all_sites",
  },
  {
    name: "Site Admin",
    description: "Operasional site, approval, report, dan koordinasi manpower.",
    scope: "site",
  },
  {
    name: "HC Manager",
    description: "Kontrol user, training, wellness, dan payroll support.",
    scope: "all_sites",
  },
] as const;

const SIDEBAR_MENU_SEEDS = [
  // Central Service Section
  {
    menuArea: "main",
    section: "Central Service",
    title: "My Day",
    url: "/dashboard/activity-hub/my-day",
    iconName: "dashboard",
    resource: "tire_service",
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Central Service",
    title: "Team Board",
    url: "/dashboard/activity-hub/team-board",
    iconName: "list-details",
    resource: "tire_repair",
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Central Service",
    title: "Analytics",
    url: "/dashboard/analytics",
    iconName: "chart-bar",
    resource: "dashboard_repair",
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Central Service",
    title: "Reports",
    url: "/dashboard/reports",
    iconName: "report",
    resource: "repair_productivity",
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Central Service",
    title: "Timesheet",
    url: "/dashboard/timesheet",
    iconName: "folder",
    resource: "tire_engineer",
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Central Service",
    title: "HSE",
    url: "/dashboard/hse",
    iconName: "shield",
    resource: "hse",
    sortOrder: 6,
    isVisible: true,
    openInNewTab: false,
  },
  // Approval Section
  {
    menuArea: "main",
    section: "Approval",
    title: "Approval",
    url: "/dashboard/approval",
    iconName: "mail",
    resource: "approval_inbox",
    sortOrder: 7,
    isVisible: true,
    openInNewTab: false,
  },
  // Hero Point Management Section
  {
    menuArea: "main",
    section: "Performance",
    title: "Hero Points",
    url: "/dashboard/leaderboard",
    iconName: "settings",
    resource: "point_setting",
    sortOrder: 8,
    isVisible: true,
    openInNewTab: false,
  },
  // HC Management Section
  {
    menuArea: "main",
    section: "Performance",
    title: "HC",
    url: "/dashboard/hc",
    iconName: "users",
    resource: "hc_safety",
    sortOrder: 9,
    isVisible: true,
    openInNewTab: false,
  },
  // Security Section
  {
    menuArea: "main",
    section: "Security",
    title: "Security Overview",
    url: "/dashboard/security",
    iconName: "database",
    resource: "security_session",
    sortOrder: 10,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Security",
    title: "Role management",
    url: "/dashboard/security/roles",
    iconName: "shield",
    resource: "security_roles",
    sortOrder: 11,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Security",
    title: "Audit log",
    url: "/dashboard/security/audit-logs",
    iconName: "report",
    resource: "security_audit",
    sortOrder: 12,
    isVisible: true,
    openInNewTab: false,
  },
  // Administrator Section
  {
    menuArea: "secondary",
    section: "Administrator",
    title: "User management",
    url: "/dashboard/security/users",
    iconName: "users",
    resource: "security_users",
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "secondary",
    section: "Administrator",
    title: "Email delivery log",
    url: "/dashboard/settings/email",
    iconName: "mail",
    resource: "settings_email",
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "secondary",
    section: "Administrator",
    title: "Master Data",
    url: "/dashboard/master-data",
    iconName: "database",
    resource: "master_data",
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
] as const;

function dedupeMenuItemsByPage<
  T extends {
    url: string;
  },
>(items: T[]) {
  const seenPages = new Set<string>();

  return items.filter((item) => {
    const pageKey = item.url;

    if (seenPages.has(pageKey)) {
      return false;
    }

    seenPages.add(pageKey);
    return true;
  });
}

function getDefaultMenuPermission(roleName: string, resource: string) {
  if (roleName === "Super Admin") {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canSelectAll: true,
    };
  }

  if (roleName === "HC Manager") {
    return {
      canView: true,
      canEdit: true,
      canDelete: ["security", "settings_navbar", "settings_email"].includes(resource),
      canSelectAll: false,
    };
  }

  return {
    canView: true,
    canEdit: !["settings_email"].includes(resource),
    canDelete: false,
    canSelectAll: false,
  };
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
  `);

  await db.execute(sql`
    create table if not exists hero_security_permissions (
      id serial primary key,
      code text not null,
      label text not null,
      resource text not null,
      action text not null,
      created_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_security_role_permissions (
      id serial primary key,
      role_id integer not null references hero_security_roles(id) on delete cascade,
      permission_id integer not null references hero_security_permissions(id) on delete cascade,
      created_at timestamp not null default now()
    );
  `);

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
  `);

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
  `);

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
  `);

  await db.execute(sql`
    alter table hero_navbar_themes
    add column if not exists header_background_color text not null default '#FFFFFF';
  `);

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
  `);

  await db.execute(sql`
    alter table hero_navbar_menu_items add column if not exists menu_area text not null default 'main';
  `);

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
  `);
}

export async function ensureHeroSeedData() {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    await ensureHeroEmployeeProfileColumns();

    const existingSites = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sites);

    if ((existingSites[0]?.count ?? 0) > 0) {
      await seedSecurityUserProfiles();
      return;
    }

    const [site] = await db
      .insert(sites)
      .values({
        name: "Bengalon Pit North",
        location: "Kutai Timur, Kalimantan Timur",
        customerName: "PT Kaltim Prima Energi",
        contractNumber: "CP-CS-2026-014",
      })
      .returning();

    const insertedEmployees = await db
      .insert(employees)
      .values([
        {
          siteId: site.id,
          name: "Rian Kurniawan",
          email: "rian.kurniawan@hero.local",
          role: "Foreman",
          department: "Central Service",
          jobTitle: "Foreman",
          section: "Field Operations",
          workLocation: "Bengalon Pit North",
          employmentStatus: "active",
          accessRole: "Super Admin",
          levelName: "Pro",
          totalPoints: 1480,
          fitStatus: "fit",
        },
        {
          siteId: site.id,
          name: "Arman Saputra",
          email: "arman.saputra@hero.local",
          role: "Technician",
          department: "Central Service",
          jobTitle: "Technician",
          section: "Tyre Operations",
          workLocation: "Bengalon Pit North",
          employmentStatus: "active",
          accessRole: "Site Admin",
          levelName: "Skilled",
          totalPoints: 1245,
          fitStatus: "fit",
        },
        {
          siteId: site.id,
          name: "Soni Darmawan",
          email: "soni.darmawan@hero.local",
          role: "HSE Officer",
          department: "HSE",
          jobTitle: "HSE Officer",
          section: "Governance",
          workLocation: "Bengalon Pit North",
          employmentStatus: "active",
          accessRole: "Site Admin",
          levelName: "Skilled",
          totalPoints: 1170,
          fitStatus: "fit",
        },
        {
          siteId: site.id,
          name: "Mira Andini",
          email: "mira.andini@hero.local",
          role: "Admin Site",
          department: "HC",
          jobTitle: "Admin Site",
          section: "People Operations",
          workLocation: "Bengalon Pit North",
          employmentStatus: "probation",
          accessRole: "HC Manager",
          levelName: "Rookie",
          totalPoints: 1040,
          fitStatus: "follow-up",
        },
      ])
      .returning();

    await seedSecurityUserProfiles();

    const employeeByName = Object.fromEntries(
      insertedEmployees.map((employee) => [employee.name, employee]),
    );

    const [activity1, activity2, activity3, activity4] = await db
      .insert(activities)
      .values([
        {
          siteId: site.id,
          employeeId: employeeByName["Arman Saputra"].id,
          activityCode: "TS",
          activityType: "Tire Service",
          title: "Pemasangan ban OTR unit HD785",
          unitNumber: "HD785-17",
          startTime: new Date("2026-04-13T08:05:00+08:00"),
          endTime: new Date("2026-04-13T13:55:00+08:00"),
          status: "Submitted",
          priority: "Emergency",
          remarks: "Ban sisi kanan belakang selesai dipasang, foto lengkap.",
          pointsAwarded: 20,
        },
        {
          siteId: site.id,
          employeeId: employeeByName["Arman Saputra"].id,
          activityCode: "TI",
          activityType: "Tire Inspection",
          title: "Inspeksi dump truck DT-23 sampai DT-28",
          unitNumber: "DT-23 s/d DT-28",
          startTime: new Date("2026-04-13T09:10:00+08:00"),
          endTime: new Date("2026-04-13T11:42:00+08:00"),
          status: "Approved",
          priority: "Normal",
          remarks: "Satu unit tekanan di bawah standar sudah diberi catatan.",
          pointsAwarded: 10,
        },
        {
          siteId: site.id,
          employeeId: employeeByName["Soni Darmawan"].id,
          activityCode: "HS",
          activityType: "HSE Patrol",
          title: "Safety patrol area pit north",
          unitNumber: "Ramp B7",
          startTime: new Date("2026-04-13T11:05:00+08:00"),
          endTime: new Date("2026-04-13T14:10:00+08:00"),
          status: "Submitted",
          priority: "Safety",
          remarks: "Blind spot haul road dan APD vendor jadi temuan utama.",
          pointsAwarded: 5,
        },
        {
          siteId: site.id,
          employeeId: employeeByName["Mira Andini"].id,
          activityCode: "AD",
          activityType: "Daily Recap",
          title: "Rekap manpower dan absensi shift pagi",
          unitNumber: "Site manpower",
          startTime: new Date("2026-04-13T12:30:00+08:00"),
          endTime: new Date("2026-04-13T14:03:00+08:00"),
          status: "Pending L2",
          priority: "Normal",
          remarks: "Siap masuk daily report setelah PJO approve.",
          pointsAwarded: 2,
        },
      ])
      .returning();

    await db.insert(approvals).values([
      {
        activityId: activity1.id,
        level: 1,
        approverName: "Rian Kurniawan",
        status: "pending",
        submittedAt: new Date("2026-04-13T13:55:00+08:00"),
        overtimeMinutes: 90,
      },
      {
        activityId: activity2.id,
        level: 1,
        approverName: "Rian Kurniawan",
        status: "approved",
        submittedAt: new Date("2026-04-13T11:42:00+08:00"),
        reviewedAt: new Date("2026-04-13T12:05:00+08:00"),
        overtimeMinutes: 0,
      },
      {
        activityId: activity3.id,
        level: 1,
        approverName: "Rian Kurniawan",
        status: "pending",
        submittedAt: new Date("2026-04-13T14:10:00+08:00"),
        overtimeMinutes: 0,
      },
      {
        activityId: activity4.id,
        level: 1,
        approverName: "Rian Kurniawan",
        status: "approved",
        submittedAt: new Date("2026-04-13T14:03:00+08:00"),
        reviewedAt: new Date("2026-04-13T14:18:00+08:00"),
        overtimeMinutes: 0,
      },
      {
        activityId: activity4.id,
        level: 2,
        approverName: "Dedi Pranata",
        status: "pending",
        submittedAt: new Date("2026-04-13T14:18:00+08:00"),
        overtimeMinutes: 0,
      },
    ]);

    await db.insert(timesheetEntries).values([
      {
        employeeId: employeeByName["Arman Saputra"].id,
        siteId: site.id,
        periodLabel: "April 2026 • Week 2",
        regularMinutes: 2640,
        overtimeMinutes: 510,
        overtimeAmount: 1245000,
        status: "ready_for_payroll",
      },
      {
        employeeId: employeeByName["Soni Darmawan"].id,
        siteId: site.id,
        periodLabel: "April 2026 • Week 2",
        regularMinutes: 2700,
        overtimeMinutes: 0,
        overtimeAmount: 0,
        status: "ready_for_payroll",
      },
      {
        employeeId: employeeByName["Mira Andini"].id,
        siteId: site.id,
        periodLabel: "April 2026 • Week 2",
        regularMinutes: 2400,
        overtimeMinutes: 90,
        overtimeAmount: 210000,
        status: "needs_correction",
      },
    ]);

    await db.insert(dailyReports).values([
      {
        siteId: site.id,
        reportDate: new Date("2026-04-13T17:30:00+08:00"),
        customerName: site.customerName,
        totalSections: 4,
        readySections: 3,
        jobsCompleted: 12,
        manpowerPresent: 18,
        hseSummary: "Zero incident • 3 patrol completed",
        status: "draft_ready",
      },
    ]);

    await db.insert(pointEvents).values([
      {
        employeeId: employeeByName["Arman Saputra"].id,
        category: "Disiplin",
        label: "Submit aktivitas sebelum 17.00",
        points: 5,
      },
      {
        employeeId: employeeByName["Arman Saputra"].id,
        category: "Volume Kerja",
        label: "Pekerjaan emergency selesai",
        points: 20,
      },
      {
        employeeId: employeeByName["Soni Darmawan"].id,
        category: "HSE",
        label: "Toolbox meeting siang",
        points: 5,
      },
    ]);

    await db.insert(hseObservations).values([
      {
        siteId: site.id,
        employeeId: employeeByName["Soni Darmawan"].id,
        category: "Unsafe Condition",
        title: "Blind spot haul road pit north",
        location: "Ramp B7",
        severity: "medium",
        status: "open",
        notes: "Butuh rambu tambahan dan pembersihan debu.",
        observedAt: new Date("2026-04-13T11:40:00+08:00"),
      },
      {
        siteId: site.id,
        employeeId: employeeByName["Arman Saputra"].id,
        category: "Unsafe Act",
        title: "Vendor tanpa sarung tangan kerja",
        location: "Tyre Bay 2",
        severity: "low",
        status: "action_taken",
        notes: "Sudah ditegur dan APD lengkap dipakai ulang.",
        observedAt: new Date("2026-04-13T12:12:00+08:00"),
      },
    ]);

    await db.insert(hseIncidents).values([
      {
        siteId: site.id,
        type: "near_miss",
        title: "Near miss saat manuver unit HD785-17",
        unitNumber: "HD785-17",
        impact: "No injury",
        status: "investigating",
        reportedAt: new Date("2026-04-13T09:12:00+08:00"),
      },
    ]);

    await db.insert(attendanceRecords).values([
      {
        employeeId: employeeByName["Arman Saputra"].id,
        siteId: site.id,
        eventType: "clock_in",
        eventTime: new Date("2026-04-13T06:48:00+08:00"),
        status: "verified",
        locationNote: "GPS valid • selfie attendance berhasil",
      },
      {
        employeeId: employeeByName["Mira Andini"].id,
        siteId: site.id,
        eventType: "clock_in",
        eventTime: new Date("2026-04-13T06:59:00+08:00"),
        status: "needs_review",
        locationNote: "Wajah tertutup masker sebagian",
      },
      {
        employeeId: employeeByName["Rian Kurniawan"].id,
        siteId: site.id,
        eventType: "clock_out",
        eventTime: new Date("2026-04-13T17:18:00+08:00"),
        status: "overtime",
        locationNote: "Kandidat lembur 1.5 jam",
      },
    ]);

    await db.insert(trainingRecords).values([
      {
        employeeId: employeeByName["Soni Darmawan"].id,
        trainingName: "HSE Patrol Refresher",
        provider: "Training Center HERO",
        expiresAt: new Date("2026-05-13T00:00:00+08:00"),
        status: "expiring_soon",
      },
      {
        employeeId: employeeByName["Arman Saputra"].id,
        trainingName: "Tire Management Level 2",
        provider: "Training Center HERO",
        expiresAt: new Date("2027-01-17T00:00:00+08:00"),
        status: "active",
      },
      {
        employeeId: employeeByName["Mira Andini"].id,
        trainingName: "Admin Reporting Workflow",
        provider: "Training Center HERO",
        expiresAt: new Date("2026-04-20T00:00:00+08:00"),
        status: "urgent",
      },
    ]);

    await db.insert(wellnessRecords).values([
      {
        employeeId: employeeByName["Arman Saputra"].id,
        metricType: "BMI",
        metricValue: "23.1",
        status: "healthy",
        notes: "Dalam range sehat bulan ini",
        recordedAt: new Date("2026-04-01T09:00:00+08:00"),
      },
      {
        employeeId: employeeByName["Mira Andini"].id,
        metricType: "MCU",
        metricValue: "Due in 18 days",
        status: "follow_up",
        notes: "Perlu reminder H-14 dan H-7",
        recordedAt: new Date("2026-04-13T09:30:00+08:00"),
      },
      {
        employeeId: employeeByName["Rian Kurniawan"].id,
        metricType: "Fit For Work",
        metricValue: "Pending",
        status: "attention",
        notes: "Butuh update kondisi pasca lembur panjang",
        recordedAt: new Date("2026-04-13T18:00:00+08:00"),
      },
    ]);
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });

  return seedPromise;
}

export async function ensureHeroGovernanceSeedData() {
  await ensureHeroSeedData();

  if (governanceSeedPromise) {
    return governanceSeedPromise;
  }

  governanceSeedPromise = (async () => {
    await ensureHeroGovernanceTables();

    const [site] = await db.select().from(sites).limit(1);
    const currentEmployees = await db.select().from(employees).orderBy(employees.name);
    const employeeByName = Object.fromEntries(
      currentEmployees.map((employee) => [employee.name, employee]),
    );

    const [permissionCount, rolePermissionCount, emailLogCount, auditLogCount, themeCount] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(securityPermissions),
        db.select({ count: sql<number>`count(*)::int` }).from(securityRolePermissions),
        db.select({ count: sql<number>`count(*)::int` }).from(emailDeliveryLogs),
        db.select({ count: sql<number>`count(*)::int` }).from(auditLogs),
        db.select({ count: sql<number>`count(*)::int` }).from(navbarThemes),
      ]);

    const currentRoles = await db.select().from(securityRoles);
    const existingRoleNames = new Set(currentRoles.map((role) => role.name));

    const missingRoles = GOVERNANCE_ROLE_SEEDS.filter(
      (role) => !existingRoleNames.has(role.name),
    );

    if (missingRoles.length > 0) {
      await db.insert(securityRoles).values(missingRoles);
    }

    if ((permissionCount[0]?.count ?? 0) === 0) {
      await db.insert(securityPermissions).values([
        { code: "security.overview.read", label: "Read security overview", resource: "security", action: "read" },
        { code: "security.users.manage", label: "Manage security users", resource: "security_users", action: "manage" },
        { code: "security.roles.manage", label: "Manage roles and permissions", resource: "security_roles", action: "manage" },
        { code: "security.audit.read", label: "Read audit logs", resource: "security_audit", action: "read" },
        { code: "settings.navbar.manage", label: "Manage navbar settings", resource: "settings_navbar", action: "manage" },
        { code: "settings.email.read", label: "Read email delivery logs", resource: "settings_email", action: "read" },
      ]);
    }

    if ((rolePermissionCount[0]?.count ?? 0) === 0) {
      const [roles, permissions] = await Promise.all([
        db.select().from(securityRoles),
        db.select().from(securityPermissions),
      ]);

      const roleByName = Object.fromEntries(roles.map((role) => [role.name, role]));
      const permissionByCode = Object.fromEntries(
        permissions.map((permission) => [permission.code, permission]),
      );

      await db.insert(securityRolePermissions).values([
        {
          roleId: roleByName["Super Admin"].id,
          permissionId: permissionByCode["security.overview.read"].id,
        },
        {
          roleId: roleByName["Super Admin"].id,
          permissionId: permissionByCode["security.users.manage"].id,
        },
        {
          roleId: roleByName["Super Admin"].id,
          permissionId: permissionByCode["security.roles.manage"].id,
        },
        {
          roleId: roleByName["Super Admin"].id,
          permissionId: permissionByCode["security.audit.read"].id,
        },
        {
          roleId: roleByName["Super Admin"].id,
          permissionId: permissionByCode["settings.navbar.manage"].id,
        },
        {
          roleId: roleByName["Super Admin"].id,
          permissionId: permissionByCode["settings.email.read"].id,
        },
        {
          roleId: roleByName["Site Admin"].id,
          permissionId: permissionByCode["security.overview.read"].id,
        },
        {
          roleId: roleByName["Site Admin"].id,
          permissionId: permissionByCode["security.audit.read"].id,
        },
        {
          roleId: roleByName["HC Manager"].id,
          permissionId: permissionByCode["security.users.manage"].id,
        },
        {
          roleId: roleByName["HC Manager"].id,
          permissionId: permissionByCode["settings.email.read"].id,
        },
      ]);
    }

    const existingMenuItems = await db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.sortOrder, navbarMenuItems.id);

    const preferredSeedByUrl = new Map<string, (typeof SIDEBAR_MENU_SEEDS)[number]>(
      SIDEBAR_MENU_SEEDS.map((item) => [item.url, item]),
    );
    const menuGroupsByUrl = existingMenuItems.reduce<
      Map<string, typeof existingMenuItems>
    >((accumulator, item) => {
      const currentItems = accumulator.get(item.url) ?? [];
      currentItems.push(item);
      accumulator.set(item.url, currentItems);
      return accumulator;
    }, new Map());

    for (const [url, groupedItems] of menuGroupsByUrl) {
      if (groupedItems.length <= 1) {
        continue;
      }

      const preferredSeed = preferredSeedByUrl.get(url);
      const keepItem =
        preferredSeed
          ? groupedItems.find((item) => item.resource === preferredSeed.resource) ??
            groupedItems[0]
          : groupedItems[0];

      const duplicateIds = groupedItems
        .filter((item) => item.id !== keepItem.id)
        .map((item) => item.id);

      if (duplicateIds.length > 0) {
        await db
          .delete(navbarMenuItems)
          .where(inArray(navbarMenuItems.id, duplicateIds));
      }
    }

    const canonicalMenuItems = await db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.sortOrder, navbarMenuItems.id);

    const menuItemByResource = new Map(
      canonicalMenuItems.map((item) => [item.resource, item]),
    );
    const menuItemByUrl = new Map(
      canonicalMenuItems.map((item) => [item.url, item]),
    );

    for (const menuSeed of SIDEBAR_MENU_SEEDS) {
      const existingMenuItem =
        menuItemByResource.get(menuSeed.resource) ??
        menuItemByUrl.get(menuSeed.url);

      if (!existingMenuItem) {
        continue;
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
          .where(eq(navbarMenuItems.id, existingMenuItem.id));
      }
    }

    const refreshedMenuItems = await db
      .select()
      .from(navbarMenuItems)
      .orderBy(navbarMenuItems.sortOrder, navbarMenuItems.id);

    const existingMenuResources = new Set<string>(
      refreshedMenuItems.map((item) => item.resource),
    );
    const missingMenuItems = SIDEBAR_MENU_SEEDS.filter(
      (item) => !existingMenuResources.has(item.resource),
    );

    if (missingMenuItems.length > 0) {
      await db.insert(navbarMenuItems).values(missingMenuItems);
    }

    if ((emailLogCount[0]?.count ?? 0) === 0) {
      await db.insert(emailDeliveryLogs).values([
        {
          employeeId: employeeByName["Mira Andini"]?.id,
          deliveryChannel: "email",
          toEmail: "site.customer@kpe.example",
          ccEmail: "pjo.bengalon@hero.local",
          fromEmail: "noreply@hero.chitraparatama.com",
          templateName: "Daily Report Delivery",
          templateCode: "hero-daily-report",
          subject: "Daily Report Bengalon Pit North - 13 April 2026",
          status: "sent",
          htmlContent: "<h1>Daily Report HERO</h1><p>Report Bengalon Pit North sudah siap.</p>",
          textContent: "Daily Report HERO - Report Bengalon Pit North sudah siap.",
          sentAt: new Date("2026-04-13T18:05:00+08:00"),
        },
        {
          employeeId: employeeByName["Rian Kurniawan"]?.id,
          deliveryChannel: "email",
          toEmail: "hc.pusat@chitraparatama.com",
          ccEmail: "mira.andini@hero.local",
          fromEmail: "noreply@hero.chitraparatama.com",
          templateName: "Approval Reminder",
          templateCode: "hero-approval-reminder",
          subject: "Pending approval shift sore - Bengalon",
          status: "pending",
          htmlContent: "<p>Ada approval activity yang menunggu review.</p>",
          textContent: "Ada approval activity yang menunggu review.",
        },
        {
          employeeId: employeeByName["Soni Darmawan"]?.id,
          deliveryChannel: "email",
          toEmail: "hse.pusat@chitraparatama.com",
          fromEmail: "noreply@hero.chitraparatama.com",
          templateName: "HSE Escalation",
          templateCode: "hero-hse-escalation",
          subject: "Near miss HD785-17 membutuhkan tindak lanjut",
          status: "failed",
          errorMessage: "SMTP timeout after 15s",
          htmlContent: "<p>Near miss HD785-17 membutuhkan review pusat.</p>",
          textContent: "Near miss HD785-17 membutuhkan review pusat.",
          sentAt: new Date("2026-04-13T15:20:00+08:00"),
        },
      ]);
    }

    if ((auditLogCount[0]?.count ?? 0) === 0) {
      await db.insert(auditLogs).values([
        {
          actorEmployeeId: employeeByName["Mira Andini"]?.id,
          action: "NAVBAR_THEME_UPDATED",
          entityType: "navbar",
          entityLabel: "Admin navigation",
          description: "Theme navbar diganti ke HERO Surface dengan warna aksen amber.",
          severity: "info",
          createdAt: new Date("2026-04-13T09:05:00+08:00"),
        },
        {
          actorEmployeeId: employeeByName["Rian Kurniawan"]?.id,
          action: "ROLE_REVIEWED",
          entityType: "security_role",
          entityLabel: "Site Admin",
          description: "Role Site Admin direview untuk akses approval dan report.",
          severity: "medium",
          createdAt: new Date("2026-04-13T10:18:00+08:00"),
        },
        {
          actorEmployeeId: employeeByName["Soni Darmawan"]?.id,
          action: "SECURITY_ALERT",
          entityType: "security",
          entityLabel: "Unusual login monitor",
          description: "Percobaan login dari device baru terdeteksi dan dimonitor.",
          severity: "high",
          createdAt: new Date("2026-04-13T12:42:00+08:00"),
        },
      ]);
    }

    if ((themeCount[0]?.count ?? 0) === 0) {
      await db.insert(navbarThemes).values({
        themeName: "HERO Surface",
        backgroundStyle: "Slate gradient",
        accentColor: "#D97706",
        headerBackgroundColor: "#FFFFFF",
        textColor: "#F8FAFC",
        density: "comfortable",
        logoMode: "hero-badge",
      });
    }

    const [rolesForMenu, menuItemsForRole, existingRoleMenuPermissions] = await Promise.all([
      db.select().from(securityRoles),
      db.select().from(navbarMenuItems),
      db.select().from(roleMenuPermissions),
    ]);

    const existingRoleMenuPairs = new Set(
      existingRoleMenuPermissions.map(
        (permission) => `${permission.roleId}:${permission.menuItemId}`,
      ),
    );

    const missingRoleMenuPermissions = rolesForMenu.flatMap((role) =>
      menuItemsForRole
        .filter(
          (menuItem) =>
            !existingRoleMenuPairs.has(`${role.id}:${menuItem.id}`),
        )
        .map((menuItem) => ({
          roleId: role.id,
          menuItemId: menuItem.id,
          ...getDefaultMenuPermission(role.name, menuItem.resource),
        })),
    );

    if (missingRoleMenuPermissions.length > 0) {
      await db.insert(roleMenuPermissions).values(missingRoleMenuPermissions);
    }

    if (!site || currentEmployees.length === 0) {
      throw new Error("Hero governance seed requires base site and employees.");
    }
  })().catch((error) => {
    governanceSeedPromise = null;
    throw error;
  });

  return governanceSeedPromise;
}

export async function getDashboardOverview() {
  await ensureHeroSeedData();

  const [site] = await db.select().from(sites).limit(1);

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
      .where(eq(approvals.status, "pending")),
    db.select({ total: sql<number>`coalesce(sum(${timesheetEntries.overtimeMinutes}),0)::int` }).from(timesheetEntries),
    db.select().from(dailyReports).orderBy(desc(dailyReports.reportDate)).limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(hseObservations)
      .where(eq(hseObservations.status, "open")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(eq(employees.isActive, true)),
  ]);

  return {
    site,
    metrics: [
      {
        label: "Submitted activities",
        value: `${activitiesCount[0]?.count ?? 0}`,
        meta: "Aktivitas masuk hari ini",
      },
      {
        label: "Pending approvals",
        value: `${pendingApprovals[0]?.count ?? 0}`,
        meta: "Approval L1 dan L2",
      },
      {
        label: "Overtime tracked",
        value: minutesToHours(overtimeMinutes[0]?.total ?? 0),
        meta: "Dari timesheet aktif",
      },
      {
        label: "Open HSE items",
        value: `${openObservations[0]?.count ?? 0}`,
        meta: "Observation yang belum close",
      },
      {
        label: "Active workforce",
        value: `${activeEmployees[0]?.count ?? 0}`,
        meta: "Karyawan aktif di site",
      },
      {
        label: "Last report",
        value:
          lastReport[0] != null
            ? `${lastReport[0].readySections}/${lastReport[0].totalSections} sections`
            : "Belum ada",
        meta: "Kesiapan daily report",
      },
    ],
  };
}

export async function getActivityPageData() {
  await ensureHeroSeedData();

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
    .orderBy(desc(activities.startTime));

  return rows.map((row) => ({
    ...row,
    duration: minutesToHours(
      Math.max(
        0,
        Math.round((row.endTime.getTime() - row.startTime.getTime()) / 60000),
      ),
    ),
  }));
}

export async function getActivityFormOptions() {
  await ensureHeroSeedData();

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
    .orderBy(employees.name);
}

export async function getApprovalPageData() {
  await ensureHeroSeedData();

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
    .orderBy(desc(approvals.submittedAt));
}

export async function getTimesheetPageData() {
  await ensureHeroSeedData();

  const rows = await db
    .select({
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
    .orderBy(desc(timesheetEntries.updatedAt));

  return rows.map((row) => ({
    ...row,
    regularHours: minutesToHours(row.regularMinutes),
    overtimeHours: minutesToHours(row.overtimeMinutes),
    overtimeCost: toCurrency(row.overtimeAmount),
  }));
}

export async function getReportsPageData() {
  await ensureHeroSeedData();

  return db
    .select({
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
    .orderBy(desc(dailyReports.reportDate));
}

export async function getPointsPageData() {
  await ensureHeroSeedData();

  const leaderboard = await db
    .select({
      name: employees.name,
      role: employees.role,
      department: employees.department,
      levelName: employees.levelName,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .orderBy(desc(employees.totalPoints));

  const recentPointEvents = await db
    .select({
      employeeName: employees.name,
      category: pointEvents.category,
      label: pointEvents.label,
      points: pointEvents.points,
      createdAt: pointEvents.createdAt,
    })
    .from(pointEvents)
    .innerJoin(employees, eq(pointEvents.employeeId, employees.id))
    .orderBy(desc(pointEvents.createdAt));

  return { leaderboard, recentPointEvents };
}

export async function getHsePageData() {
  await ensureHeroSeedData();

  const observations = await db
    .select({
      title: hseObservations.title,
      category: hseObservations.category,
      location: hseObservations.location,
      severity: hseObservations.severity,
      status: hseObservations.status,
      observedAt: hseObservations.observedAt,
      reporter: employees.name,
    })
    .from(hseObservations)
    .leftJoin(employees, eq(hseObservations.employeeId, employees.id))
    .orderBy(desc(hseObservations.observedAt));

  const incidents = await db
    .select({
      title: hseIncidents.title,
      type: hseIncidents.type,
      unitNumber: hseIncidents.unitNumber,
      impact: hseIncidents.impact,
      status: hseIncidents.status,
      reportedAt: hseIncidents.reportedAt,
    })
    .from(hseIncidents)
    .orderBy(desc(hseIncidents.reportedAt));

  return { observations, incidents };
}

export async function getHcPageData() {
  await ensureHeroSeedData();

  const attendance = await db
    .select({
      employeeName: employees.name,
      role: employees.role,
      eventType: attendanceRecords.eventType,
      status: attendanceRecords.status,
      eventTime: attendanceRecords.eventTime,
      locationNote: attendanceRecords.locationNote,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .orderBy(desc(attendanceRecords.eventTime));

  const trainings = await db
    .select({
      employeeName: employees.name,
      trainingName: trainingRecords.trainingName,
      provider: trainingRecords.provider,
      expiresAt: trainingRecords.expiresAt,
      status: trainingRecords.status,
    })
    .from(trainingRecords)
    .innerJoin(employees, eq(trainingRecords.employeeId, employees.id))
    .orderBy(trainingRecords.expiresAt);

  const wellness = await db
    .select({
      employeeName: employees.name,
      metricType: wellnessRecords.metricType,
      metricValue: wellnessRecords.metricValue,
      status: wellnessRecords.status,
      notes: wellnessRecords.notes,
      recordedAt: wellnessRecords.recordedAt,
    })
    .from(wellnessRecords)
    .innerJoin(employees, eq(wellnessRecords.employeeId, employees.id))
    .orderBy(desc(wellnessRecords.recordedAt));

  return { attendance, trainings, wellness };
}

export async function getSecurityOverviewData() {
  await ensureHeroGovernanceSeedData();

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
    ]);

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
    .limit(10);

  return {
    metrics: [
      { title: "Total Users", value: `${userCount[0]?.count ?? 0}`, href: "/dashboard/security/users" },
      { title: "Active Sessions", value: `${activeSessionCount[0]?.count ?? 0}`, href: "/dashboard/security" },
      { title: "Roles", value: `${roleCount[0]?.count ?? 0}`, href: "/dashboard/security/roles" },
      { title: "Permissions", value: `${permissionCount[0]?.count ?? 0}`, href: "/dashboard/security/roles" },
      { title: "Suspended Users", value: `${suspendedCount[0]?.count ?? 0}`, href: "/dashboard/security/users" },
    ],
    recentLogs,
  };
}

export async function getSecurityUsersData() {
  await ensureHeroGovernanceSeedData();

  const rows = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      joinYear: employees.joinYear,
      name: employees.name,
      profileImage: authUser.image,
      birthPlaceDate: employees.birthPlaceDate,
      domicile: employees.domicile,
      directManagerId: employees.directManagerId,
      section: employees.section,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      phoneNumber: employees.phoneNumber,
      email: employees.email,
      employmentStatus: employees.employmentStatus,
      employeeStatusType: employees.employeeStatusType,
      accessRole: employees.accessRole,
      role: employees.role,
      department: employees.department,
      levelName: employees.levelName,
      fitStatus: employees.fitStatus,
      isActive: employees.isActive,
      siteName: sites.name,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .orderBy(employees.name);

  const employeeNameById = new Map(rows.map((row) => [row.id, row.name]));

  return rows.map<SecurityUserRecord>((row: any) => ({
    id: row.id,
    employeeSn: row.employeeSn,
    joinYear: row.joinYear,
    name: row.name,
    profileImage: row.profileImage,
    birthPlaceDate: row.birthPlaceDate,
    domicile: row.domicile,
    directManagerId: row.directManagerId,
    directManagerName: row.directManagerId
      ? employeeNameById.get(row.directManagerId) ?? null
      : null,
    section: row.section,
    department: row.department,
    jobTitle: row.jobTitle,
    workLocation: row.workLocation,
    employeeStatusType: row.employeeStatusType,
    phoneNumber: row.phoneNumber,
    email: row.email,
    status: row.isActive ? row.employmentStatus : "inactive",
    role: row.role,
    accessRole: row.accessRole,
    levelName: row.levelName,
    fitStatus: row.fitStatus,
    isActive: row.isActive,
    siteName: row.siteName,
    totalPoints: row.totalPoints,
  }));
}

export async function getSecurityRolesData() {
  await ensureHeroGovernanceSeedData();

  const [roles, permissions, grants, menuItems, menuPermissions, users] =
    await Promise.all([
      db.select().from(securityRoles).orderBy(securityRoles.name),
      db
        .select()
        .from(securityPermissions)
        .orderBy(securityPermissions.resource, securityPermissions.action),
      db.select().from(securityRolePermissions),
      db
        .select()
        .from(navbarMenuItems)
        .orderBy(
          navbarMenuItems.menuArea,
          navbarMenuItems.section,
          navbarMenuItems.sortOrder,
        ),
      db.select().from(roleMenuPermissions),
      db
        .select({
          id: employees.id,
          accessRole: employees.accessRole,
          name: employees.name,
        })
        .from(employees)
        .orderBy(employees.name),
    ]);

  const rolePermissionMap = new Set(
    grants.map((grant) => `${grant.roleId}:${grant.permissionId}`),
  );
  const userCountByRole = users.reduce<Record<string, number>>((accumulator, user) => {
    accumulator[user.accessRole] = (accumulator[user.accessRole] ?? 0) + 1;
    return accumulator;
  }, {});

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
  };
}

export async function getAuditLogsPageData() {
  await ensureHeroGovernanceSeedData();

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
    .orderBy(desc(auditLogs.createdAt));
}

export async function getEmailDeliveryLogsData() {
  await ensureHeroGovernanceSeedData();

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
    .orderBy(desc(emailDeliveryLogs.createdAt));
}

export async function getNavbarSettingsData() {
  await ensureHeroGovernanceSeedData();

  const [theme] = await db.select().from(navbarThemes).orderBy(desc(navbarThemes.createdAt)).limit(1);
  const menuItems = await db
    .select()
    .from(navbarMenuItems)
    .orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder);

  return { theme, menuItems: dedupeMenuItemsByPage(menuItems) };
}

export async function getSecurityRoleOptions() {
  await ensureHeroGovernanceSeedData();

  return db.select().from(securityRoles).orderBy(securityRoles.name);
}

export async function getSidebarDataForUser(email: string) {
  await ensureHeroGovernanceSeedData();

  const [employee] = await db
    .select({
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);

  const roleName = employee?.accessRole ?? "Super Admin";
  const [role] = await db
    .select()
    .from(securityRoles)
    .where(eq(securityRoles.name, roleName))
    .limit(1);

  if (!role) {
    return {
      navMain: [] as Array<{
        id?: number;
        menuArea: string;
        section: string;
        title: string;
        url: string;
        iconName: string;
        resource?: string;
        sortOrder?: number;
        isVisible?: boolean;
        openInNewTab?: boolean;
      }>,
      navSecondary: [] as Array<{
        id?: number;
        menuArea: string;
        section: string;
        title: string;
        url: string;
        iconName: string;
        resource?: string;
        sortOrder?: number;
        isVisible?: boolean;
        openInNewTab?: boolean;
      }>,
      documents: [] as Array<{
        id?: number;
        menuArea: string;
        section: string;
        title: string;
        url: string;
        iconName: string;
        resource?: string;
        sortOrder?: number;
        isVisible?: boolean;
        openInNewTab?: boolean;
      }>,
    };
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
    .orderBy(
      navbarMenuItems.menuArea,
      navbarMenuItems.section,
      navbarMenuItems.sortOrder,
    );

  const visibleItems = dedupeMenuItemsByPage(
    permittedMenuItems.filter(
    (item) => item.isVisible && item.canView,
    ),
  );

  return {
    navMain: visibleItems.filter((item) => item.menuArea === "main"),
    navSecondary: visibleItems.filter((item) => item.menuArea === "secondary"),
    documents: visibleItems.filter((item) => item.menuArea === "document"),
  };
}

export async function getExecutiveHighlights() {
  await ensureHeroSeedData();

  const site = await db.select().from(sites).limit(1);
  const [report] = await db.select().from(dailyReports).orderBy(desc(dailyReports.reportDate)).limit(1);
  const [topPerformer] = await db
    .select({
      name: employees.name,
      role: employees.role,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .orderBy(desc(employees.totalPoints))
    .limit(1);

  return {
    site: site[0],
    report,
    topPerformer,
  };
}
