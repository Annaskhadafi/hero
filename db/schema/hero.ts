import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

export const sites = pgTable("hero_sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  customerName: text("customer_name").notNull(),
  contractNumber: text("contract_number").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const employees = pgTable("hero_employees", {
  id: serial("id").primaryKey(),
  authUserId: text("auth_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  employeeSn: text("employee_sn").notNull().default(""),
  joinYear: integer("join_year").notNull().default(new Date().getFullYear()),
  birthPlaceDate: text("birth_place_date").notNull().default(""),
  domicile: text("domicile").notNull().default(""),
  directManagerId: integer("direct_manager_id"),
  section: text("section").notNull().default(""),
  role: text("role").notNull(),
  department: text("department").notNull(),
  jobTitle: text("job_title").notNull().default(""),
  workLocation: text("work_location").notNull().default(""),
  phoneNumber: text("phone_number").notNull().default(""),
  employmentStatus: text("employment_status").notNull().default("active"),
  accessRole: text("access_role").notNull().default("Site Admin"),
  levelName: text("level_name").notNull().default("Rookie"),
  totalPoints: integer("total_points").notNull().default(0),
  fitStatus: text("fit_status").notNull().default("fit"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activities = pgTable("hero_activities", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  activityCode: text("activity_code").notNull(),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  unitNumber: text("unit_number").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull().default("normal"),
  remarks: text("remarks").notNull().default(""),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const approvals = pgTable("hero_approvals", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  approverName: text("approver_name").notNull(),
  status: text("status").notNull(),
  submittedAt: timestamp("submitted_at").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
});

export const timesheetEntries = pgTable("hero_timesheet_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  periodLabel: text("period_label").notNull(),
  regularMinutes: integer("regular_minutes").notNull().default(0),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
  overtimeAmount: integer("overtime_amount").notNull().default(0),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyReports = pgTable("hero_daily_reports", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  reportDate: timestamp("report_date").notNull(),
  customerName: text("customer_name").notNull(),
  totalSections: integer("total_sections").notNull().default(4),
  readySections: integer("ready_sections").notNull().default(0),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  manpowerPresent: integer("manpower_present").notNull().default(0),
  hseSummary: text("hse_summary").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pointEvents = pgTable("hero_point_events", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const hseObservations = pgTable("hero_hse_observations", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  notes: text("notes").notNull(),
  observedAt: timestamp("observed_at").notNull(),
});

export const hseIncidents = pgTable("hero_hse_incidents", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  unitNumber: text("unit_number").notNull(),
  impact: text("impact").notNull(),
  status: text("status").notNull(),
  reportedAt: timestamp("reported_at").notNull(),
});

export const attendanceRecords = pgTable("hero_attendance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  eventTime: timestamp("event_time").notNull(),
  status: text("status").notNull(),
  locationNote: text("location_note").notNull(),
});

export const trainingRecords = pgTable("hero_training_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  trainingName: text("training_name").notNull(),
  provider: text("provider").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull(),
});

export const wellnessRecords = pgTable("hero_wellness_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  metricType: text("metric_type").notNull(),
  metricValue: text("metric_value").notNull(),
  status: text("status").notNull(),
  notes: text("notes").notNull(),
  recordedAt: timestamp("recorded_at").notNull(),
});

export const securityRoles = pgTable("hero_security_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  scope: text("scope").notNull().default("site"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const securityPermissions = pgTable("hero_security_permissions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  label: text("label").notNull(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const securityRolePermissions = pgTable("hero_security_role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id")
    .notNull()
    .references(() => securityRoles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id")
    .notNull()
    .references(() => securityPermissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailDeliveryLogs = pgTable("hero_email_delivery_logs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  deliveryChannel: text("delivery_channel").notNull().default("email"),
  toEmail: text("to_email").notNull(),
  ccEmail: text("cc_email"),
  fromEmail: text("from_email"),
  templateName: text("template_name"),
  templateCode: text("template_code"),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  htmlContent: text("html_content"),
  textContent: text("text_content"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("hero_audit_logs", {
  id: serial("id").primaryKey(),
  actorEmployeeId: integer("actor_employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityLabel: text("entity_label").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const navbarThemes = pgTable("hero_navbar_themes", {
  id: serial("id").primaryKey(),
  themeName: text("theme_name").notNull(),
  backgroundStyle: text("background_style").notNull(),
  accentColor: text("accent_color").notNull(),
  textColor: text("text_color").notNull(),
  density: text("density").notNull().default("comfortable"),
  logoMode: text("logo_mode").notNull().default("hero"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const navbarMenuItems = pgTable("hero_navbar_menu_items", {
  id: serial("id").primaryKey(),
  menuArea: text("menu_area").notNull().default("main"),
  section: text("section").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  iconName: text("icon_name").notNull(),
  resource: text("resource").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  openInNewTab: boolean("open_in_new_tab").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roleMenuPermissions = pgTable("hero_role_menu_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id")
    .notNull()
    .references(() => securityRoles.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => navbarMenuItems.id, { onDelete: "cascade" }),
  canView: boolean("can_view").notNull().default(false),
  canEdit: boolean("can_edit").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
  canSelectAll: boolean("can_select_all").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Master Data Tables
// Department is the parent entity
export const masterDepartments = pgTable("hero_master_departments", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Section belongs to a Department (Department is parent)
export const masterSections = pgTable("hero_master_sections", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => masterDepartments.id, { onDelete: "set null" }),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Position (Jabatan) belongs to a Department
export const masterPositions = pgTable("hero_master_positions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => masterDepartments.id, { onDelete: "set null" }),
  level: integer("level").notNull().default(1),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Organizational Structure - For Approval Engine
export const orgStructures = pgTable("hero_org_structures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobType: text("job_type").notNull().default("default"), // e.g., "office", "field", "contractor"
  positionId: integer("position_id")
    .notNull()
    .references(() => masterPositions.id, { onDelete: "cascade" }),
  managerPositionId: integer("manager_position_id").references(() => masterPositions.id, { onDelete: "set null" }),
  approvalLevel: integer("approval_level").notNull().default(1), // Level 1, 2, 3, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
