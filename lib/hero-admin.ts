import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
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
  notificationChannelRules,
  notificationChannelSettings,
  notificationDeliveries,
  approvalMatrices,
  approvalMatrixSteps,
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
import { ensureApprovalBlueprintSeedData } from "@/lib/approval-blueprint";

let seedPromise: Promise<void> | null = null;
let governanceSeedPromise: Promise<void> | null = null;

export type SecurityUserRecord = {
  id: number;
  siteId: number;
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

function normalizeLookupValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
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
      work_location = coalesce(work_location, ''),
      phone_number = coalesce(phone_number, ''),
      employment_status = coalesce(nullif(employment_status, ''), case when is_active then 'active' else 'inactive' end),
      access_role = coalesce(nullif(access_role, ''), 'Site Admin');
  `);
}

async function ensureHeroSiteLocationColumns() {
  await db.execute(sql`
    alter table hero_sites add column if not exists province_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists province_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists district_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists district_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists village_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists village_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists address_detail text not null default '';
  `);
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
];

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
    title: "Approval Inbox",
    url: "/dashboard/approval",
    iconName: "mail",
    resource: "approval_inbox",
    sortOrder: 1,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Approval",
    title: "Request Center",
    url: "/dashboard/request-center",
    iconName: "folder",
    resource: "request_center",
    sortOrder: 2,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Approval",
    title: "Workflow Studio",
    url: "/dashboard/workflow-studio",
    iconName: "list-details",
    resource: "workflow_studio",
    sortOrder: 3,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "main",
    section: "Approval",
    title: "Notifications",
    url: "/dashboard/notifications",
    iconName: "mail",
    resource: "notification_center",
    sortOrder: 4,
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
  {
    menuArea: "main",
    section: "Performance",
    title: "Attendance",
    url: "/dashboard/attendance",
    iconName: "clock",
    resource: "attendance",
    sortOrder: 10,
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
    sortOrder: 11,
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
    title: "Attendance Records",
    url: "/dashboard/attendance/records",
    iconName: "clock",
    resource: "attendance_records",
    sortOrder: 3,
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
    sortOrder: 4,
    isVisible: true,
    openInNewTab: false,
  },
  {
    menuArea: "secondary",
    section: "Administrator",
    title: "Form Studio",
    url: "/dashboard/form-studio",
    iconName: "file-word",
    resource: "form_studio",
    sortOrder: 5,
    isVisible: true,
    openInNewTab: false,
  },
] as const;

const ATTENDANCE_SHIFT_SEEDS = [
  {
    code: "day",
    label: "Shift Pagi",
    startTime: "07:00",
    endTime: "15:00",
    windowLabel: "07:00 - 15:00",
    helper: "Operasional reguler site pagi.",
    sortOrder: 1,
  },
  {
    code: "swing",
    label: "Shift Sore",
    startTime: "15:00",
    endTime: "23:00",
    windowLabel: "15:00 - 23:00",
    helper: "Pergantian crew dan pekerjaan lanjutan.",
    sortOrder: 2,
  },
  {
    code: "night",
    label: "Shift Malam",
    startTime: "23:00",
    endTime: "07:00",
    windowLabel: "23:00 - 07:00",
    helper: "Shift lintas hari, pastikan clock out tetap dilakukan.",
    sortOrder: 3,
  },
  {
    code: "standby",
    label: "Standby / On-call",
    startTime: "",
    endTime: "",
    windowLabel: "Sesuai assignment",
    helper: "Dipakai saat hadir karena panggilan atau standby.",
    sortOrder: 4,
  },
];

const EMAIL_SMTP_SETTING_SEED = {
  profileName: "Default SMTP",
  host: "smtp.chitraparatama.co.id",
  port: 587,
  encryption: "tls",
  username: "noreply@chitraparatama.co.id",
  passwordSecret: "",
  fromEmail: "noreply@chitraparatama.co.id",
  fromName: "HERO Operations",
  replyToEmail: "",
  retryLimit: 3,
  timeoutSeconds: 15,
  queueEnabled: true,
  auditEnabled: true,
  isActive: true,
};

const EMAIL_TEMPLATE_SEEDS = [
  {
    name: "Auth Magic Link",
    templateCode: "auth_magic_link",
    templateType: "Magic Link",
    deliveryChannel: "email",
    recipientScope: "all",
    ccEmail: "",
    subject: "Magic link masuk untuk {{userName}}",
    htmlContent: "<p>Gunakan link berikut untuk masuk ke HERO: {{magicLink}}</p>",
    textContent: "Gunakan link berikut untuk masuk ke HERO: {{magicLink}}",
    isActive: true,
  },
  {
    name: "Approval Assignment",
    templateCode: "approval_assignment",
    templateType: "Notification",
    deliveryChannel: "email,bell",
    recipientScope: "approver",
    ccEmail: "",
    subject: "Tugas approval baru #{{requestId}}",
    htmlContent: "<p>Request #{{requestId}} menunggu approval Anda.</p>",
    textContent: "Request #{{requestId}} menunggu approval Anda.",
    isActive: true,
  },
  {
    name: "Approval SLA Reminder",
    templateCode: "approval_sla_reminder",
    templateType: "Reminder",
    deliveryChannel: "email,bell,pwa_push",
    recipientScope: "approver",
    ccEmail: "",
    subject: "Reminder SLA untuk request #{{requestId}}",
    htmlContent: "<p>SLA request #{{requestId}} hampir jatuh tempo.</p>",
    textContent: "SLA request #{{requestId}} hampir jatuh tempo.",
    isActive: true,
  },
  {
    name: "Daily Report Delivery",
    templateCode: "daily_report_delivery",
    templateType: "Report",
    deliveryChannel: "email",
    recipientScope: "admin,pjo",
    ccEmail: "",
    subject: "Daily Report {{siteName}} - {{reportDate}}",
    htmlContent: "<p>Daily report {{siteName}} tanggal {{reportDate}} siap dikirim.</p>",
    textContent: "Daily report {{siteName}} tanggal {{reportDate}} siap dikirim.",
    isActive: true,
  },
];

const NOTIFICATION_CHANNEL_SETTING_SEEDS = [
  {
    channel: "bell",
    isEnabled: true,
    realtimeBadge: true,
    soundEnabled: true,
    autoMarkRead: true,
    vapidPublicKey: "",
    vapidPrivateKey: "",
    pushSubject: "",
    serviceWorkerPath: "/sw.js",
  },
  {
    channel: "pwa_push",
    isEnabled: true,
    realtimeBadge: false,
    soundEnabled: false,
    autoMarkRead: false,
    vapidPublicKey: "",
    vapidPrivateKey: "",
    pushSubject: "mailto:noreply@chitraparatama.co.id",
    serviceWorkerPath: "/sw.js",
  },
];

const NOTIFICATION_RULE_SEEDS = [
  {
    channel: "bell",
    label: "Approval assignment",
    eventType: "approval_assignment",
    targetAudience: "Approver",
    priority: "approval",
    triggerExpression: "Saat request masuk ke step approval",
    templateCode: "approval_assignment",
    isActive: true,
    sortOrder: 1,
  },
  {
    channel: "bell",
    label: "Delegation handover",
    eventType: "delegation_created",
    targetAudience: "Delegate",
    priority: "delegation",
    triggerExpression: "Saat tugas dialihkan ke pemeriksa lain",
    templateCode: "approval_assignment",
    isActive: true,
    sortOrder: 2,
  },
  {
    channel: "bell",
    label: "Escalation alert",
    eventType: "approval_escalation",
    targetAudience: "Manager",
    priority: "escalation",
    triggerExpression: "Saat approval melewati SLA",
    templateCode: "approval_sla_reminder",
    isActive: true,
    sortOrder: 3,
  },
  {
    channel: "bell",
    label: "Before due reminder",
    eventType: "before_due",
    targetAudience: "Requester + Approver",
    priority: "before_due",
    triggerExpression: "Sebelum batas waktu tiba",
    templateCode: "approval_sla_reminder",
    isActive: true,
    sortOrder: 4,
  },
  {
    channel: "pwa_push",
    label: "Push approval urgent",
    eventType: "approval_sla_reminder",
    targetAudience: "Approver aktif",
    priority: "urgent",
    triggerExpression: "SLA < 2 jam",
    templateCode: "approval_sla_reminder",
    isActive: true,
    sortOrder: 1,
  },
  {
    channel: "pwa_push",
    label: "Push escalation",
    eventType: "approval_escalation",
    targetAudience: "Manager site",
    priority: "escalation",
    triggerExpression: "Lewat SLA",
    templateCode: "approval_sla_reminder",
    isActive: true,
    sortOrder: 2,
  },
  {
    channel: "pwa_push",
    label: "Push daily report ready",
    eventType: "daily_report_ready",
    targetAudience: "PJO + Admin",
    priority: "report",
    triggerExpression: "Report siap kirim",
    templateCode: "daily_report_delivery",
    isActive: false,
    sortOrder: 3,
  },
];

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
  `);

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
  `);

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
  `);

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
    alter table hero_sites add column if not exists province_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists province_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists regency_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists district_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists district_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists village_id text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists village_name text not null default '';
  `);

  await db.execute(sql`
    alter table hero_sites add column if not exists address_detail text not null default '';
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
  `);

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
  `);

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
  `);

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
  `);

  await db.execute(sql`
    alter table hero_master_positions
    add column if not exists site_location text not null default '';
  `);

  await db.execute(sql`
    alter table hero_master_positions
    add column if not exists section_id integer references hero_master_sections(id) on delete set null;
  `);

  await db.execute(sql`
    alter table hero_employees
    add column if not exists department_id integer;
  `);

  await db.execute(sql`
    alter table hero_employees
    add column if not exists section_id integer;
  `);

  await db.execute(sql`
    alter table hero_employees
    add column if not exists position_id integer;
  `);

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
  `);

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
  `);

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists version integer not null default 1;
  `);

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists effective_from timestamp not null default now();
  `);

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists effective_to timestamp;
  `);

  await db.execute(sql`
    alter table hero_org_chart_structures
    add column if not exists is_default boolean not null default false;
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists employee_id integer references hero_employees(id) on delete set null;
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists node_code text not null default '';
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists node_type text not null default 'position';
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists approval_role text not null default '';
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists can_approve boolean not null default false;
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists can_delegate boolean not null default true;
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists is_escalation_target boolean not null default false;
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists sla_hours integer not null default 24;
  `);

  await db.execute(sql`
    alter table hero_org_chart_nodes
    add column if not exists fallback_node_id integer;
  `);

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
  `);

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
  `);

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
  `);

  await db.execute(sql`
    alter table hero_employees
    add column if not exists org_node_id integer;
  `);

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approver_employee_id integer references hero_employees(id) on delete set null;
  `);

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approver_node_id integer references hero_org_chart_nodes(id) on delete set null;
  `);

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approval_matrix_id integer references hero_approval_matrices(id) on delete set null;
  `);

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists approval_step_id integer references hero_approval_matrix_steps(id) on delete set null;
  `);

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists resolution_source text not null default 'matrix';
  `);

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists route_snapshot text not null default '';
  `);

  await db.execute(sql`
    alter table hero_approvals
    add column if not exists decision_note text not null default '';
  `);
  }

export async function ensureHeroSeedData() {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    await ensureHeroEmployeeProfileColumns();
    await ensureHeroSiteLocationColumns();
    await ensureApprovalBlueprintSeedData();
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

    const [
      permissionCount,
      rolePermissionCount,
      themeCount,
      attendanceShiftCount,
      emailSmtpSettingCount,
      emailTemplateCount,
      notificationChannelSettingCount,
    ] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(securityPermissions),
        db.select({ count: sql<number>`count(*)::int` }).from(securityRolePermissions),
        db.select({ count: sql<number>`count(*)::int` }).from(navbarThemes),
        db.select({ count: sql<number>`count(*)::int` }).from(masterAttendanceShifts),
        db.select({ count: sql<number>`count(*)::int` }).from(emailSmtpSettings),
        db.select({ count: sql<number>`count(*)::int` }).from(emailTemplates),
        db.select({ count: sql<number>`count(*)::int` }).from(notificationChannelSettings),
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

    if ((attendanceShiftCount[0]?.count ?? 0) === 0) {
      await db.insert(masterAttendanceShifts).values(ATTENDANCE_SHIFT_SEEDS);
    }

    if ((emailSmtpSettingCount[0]?.count ?? 0) === 0) {
      await db.insert(emailSmtpSettings).values(EMAIL_SMTP_SETTING_SEED);
    }

    if ((emailTemplateCount[0]?.count ?? 0) === 0) {
      await db.insert(emailTemplates).values(EMAIL_TEMPLATE_SEEDS);
    }

    if ((notificationChannelSettingCount[0]?.count ?? 0) === 0) {
      await db.insert(notificationChannelSettings).values(NOTIFICATION_CHANNEL_SETTING_SEEDS);
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
    .orderBy(desc(dailyReports.reportDate));
}

export async function getPointsPageData() {
  await ensureHeroSeedData();

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
    .orderBy(desc(employees.totalPoints));

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
    .orderBy(desc(pointEvents.createdAt));

  return { leaderboard, recentPointEvents };
}

export async function getHsePageData() {
  await ensureHeroSeedData();

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
    .orderBy(desc(hseObservations.observedAt));

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
    .orderBy(desc(hseIncidents.reportedAt));

  return { observations, incidents };
}

export async function getHcPageData() {
  await ensureHeroSeedData();

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
    .orderBy(desc(attendanceRecords.eventTime));

  const trainings = await db
    .select({
      id: trainingRecords.id,
      employeeId: trainingRecords.employeeId,
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
    .orderBy(desc(wellnessRecords.recordedAt));

  return { attendance, trainings, wellness };
}

export async function getOperationalCrudOptions() {
  await ensureHeroSeedData();

  const [employeeRows, siteRows] = await Promise.all([
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
  ]);

  return {
    employees: employeeRows,
    sites: siteRows,
  };
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
      siteId: employees.siteId,
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
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .orderBy(employees.name);

  const employeeNameById = new Map(rows.map((row) => [row.id, row.name]));

  return rows.map<SecurityUserRecord>((row: any) => ({
    id: row.id,
    siteId: row.siteId,
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
    siteName: row.siteName ?? row.workLocation ?? "Belum diisi",
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

export async function getEmailTemplatesData() {
  await ensureHeroGovernanceSeedData();

  return db
    .select()
    .from(emailTemplates)
    .orderBy(desc(emailTemplates.isActive), asc(emailTemplates.name), asc(emailTemplates.id));
}

export async function getEmailSmtpSettingsData() {
  await ensureHeroGovernanceSeedData();

  const [settings] = await db
    .select()
    .from(emailSmtpSettings)
    .orderBy(desc(emailSmtpSettings.isActive), desc(emailSmtpSettings.updatedAt), desc(emailSmtpSettings.id))
    .limit(1);

  if (!settings) {
    const [created] = await db
      .insert(emailSmtpSettings)
      .values(EMAIL_SMTP_SETTING_SEED)
      .returning();

    return {
      ...created,
      hasPassword: Boolean(created.passwordSecret),
    };
  }

  return {
    ...settings,
    hasPassword: Boolean(settings.passwordSecret),
  };
}

export async function getPwaPushSettingsData() {
  await ensureHeroGovernanceSeedData();

  const [settings] = await db
    .select()
    .from(notificationChannelSettings)
    .where(eq(notificationChannelSettings.channel, "pwa_push"))
    .limit(1);

  if (!settings) {
    const fallback = NOTIFICATION_CHANNEL_SETTING_SEEDS.find((item) => item.channel === "pwa_push") ?? {
      channel: "pwa_push",
      isEnabled: true,
      realtimeBadge: false,
      soundEnabled: false,
      autoMarkRead: false,
      vapidPublicKey: "",
      vapidPrivateKey: "",
      pushSubject: "mailto:noreply@chitraparatama.co.id",
      serviceWorkerPath: "/sw.js",
    };

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
      .returning();

    return created;
  }

  return settings;
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

export async function getEmployeeDisplayDataByEmail(email: string) {
  await ensureHeroGovernanceSeedData();

  const [employee] = await db
    .select({
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
    })
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);

  return employee ?? null;
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
