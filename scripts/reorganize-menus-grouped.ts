import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq, sql } from "drizzle-orm";

type MenuSeed = {
  title: string;
  url: string;
  section: string;
  groupLabel?: string;
  iconName: string;
  resource: string;
  sortOrder: number;
  isVisible?: boolean;
  menuArea?: string;
};

const GROUPED_SECTIONS: Record<string, MenuSeed[]> = {
  "Portal Chitra": [
    { title: "Portal Chitra", url: "/dashboard/portal-chitra", section: "Portal Chitra", iconName: "dashboard", resource: "portal_chitra", sortOrder: 1 },
  ],
  "Aktivitas Harian": [
    { title: "Input Aktivitas Harian", url: "/dashboard/activity-hub/my-day", section: "Aktivitas Harian", iconName: "dashboard", resource: "tire_service", sortOrder: 1 },
    { title: "Monitoring Tim & SPL", url: "/dashboard/activity-hub/team-board", section: "Aktivitas Harian", iconName: "list-details", resource: "tire_repair", sortOrder: 2 },
    { title: "Kamus Aktivitas", url: "/dashboard/activity-hub/library", section: "Aktivitas Harian", iconName: "database", resource: "activity_library", sortOrder: 3 },
    { title: "Route Template Harian", url: "/dashboard/activity-hub/routes", section: "Aktivitas Harian", iconName: "list-details", resource: "activity_routes", sortOrder: 4 },
    { title: "Rule Aktivitas Global", url: "/dashboard/activity-hub/configuration", section: "Aktivitas Harian", iconName: "settings", resource: "activity_configuration", sortOrder: 5 },
    { title: "Pengajuan Lembur (Request)", url: "/dashboard/overtime-requests", section: "Aktivitas Harian", iconName: "checklist", resource: "overtime_requests", sortOrder: 6 },
    { title: "Timesheet Realisasi", url: "/dashboard/timesheet", section: "Aktivitas Harian", iconName: "folder", resource: "tire_engineer", sortOrder: 7 },
  ],
  "Roster & Timesheet": [
    { title: "Overview Roster", url: "/dashboard/scheduling-timesheet", section: "Roster & Timesheet", iconName: "clock", resource: "scheduling_timesheet", sortOrder: 1 },
    { title: "Setup Roster", url: "/dashboard/scheduling-timesheet/setup", section: "Roster & Timesheet", iconName: "settings", resource: "scheduling_timesheet_setup", sortOrder: 2 },
    { title: "Roster & Schedule", url: "/dashboard/scheduling-timesheet/schedule", section: "Roster & Timesheet", iconName: "clock", resource: "scheduling_timesheet_schedule", sortOrder: 3 },
    { title: "Field Break Schedule", url: "/dashboard/scheduling-timesheet/field-break", section: "Roster & Timesheet", iconName: "list-details", resource: "scheduling_timesheet_field_break", sortOrder: 4 },
    { title: "Payroll Timesheet", url: "/dashboard/scheduling-timesheet/payroll", section: "Roster & Timesheet", iconName: "report", resource: "scheduling_timesheet_payroll", sortOrder: 5 },
  ],
  "Approval": [
    { title: "Approval Inbox", url: "/dashboard/approval", section: "Approval", iconName: "mail", resource: "approval_inbox", sortOrder: 1 },
    { title: "Request Center", url: "/dashboard/request-center", section: "Approval", iconName: "folder", resource: "request_center", sortOrder: 2 },
    { title: "Approval Workflow Builder", url: "/dashboard/workflow-studio", section: "Approval", iconName: "list-details", resource: "workflow_studio", sortOrder: 3 },
    { title: "Notification Center", url: "/dashboard/notifications", section: "Approval", iconName: "mail", resource: "notification_center", sortOrder: 4 },
  ],
  "Data Induk": [
    { title: "Master Data", url: "/dashboard/master-data", section: "Data Induk", iconName: "database", resource: "master_data", sortOrder: 1, menuArea: "secondary" },
    { title: "Form Builder", url: "/dashboard/form-studio", section: "Data Induk", iconName: "file-word", resource: "form_studio", sortOrder: 2, menuArea: "secondary" },
  ],
  "Human Capital": [
    { title: "HC Overview", url: "/dashboard/hc", section: "Human Capital", groupLabel: "HR Operational", iconName: "users", resource: "hc_safety", sortOrder: 1 },
    { title: "Employee Data", url: "/dashboard/hc/employee", section: "Human Capital", groupLabel: "HR Operational", iconName: "users", resource: "hc_employee", sortOrder: 2 },
    { title: "Surat", url: "/dashboard/hc/surat", section: "Human Capital", groupLabel: "HR Operational", iconName: "file-word", resource: "hc_surat", sortOrder: 3 },
    { title: "Izin Sakit & Terlambat", url: "/dashboard/hc/permission", section: "Human Capital", groupLabel: "HR Operational", iconName: "shield-alert", resource: "hc_attendance_permission", sortOrder: 4 },
    { title: "Contract Review", url: "/dashboard/hc/contract-review", section: "Human Capital", groupLabel: "HR Operational", iconName: "file-signature", resource: "hc_contract_review", sortOrder: 5 },
    { title: "Disciplinary", url: "/dashboard/hc/disciplinary", section: "Human Capital", groupLabel: "HR Operational", iconName: "shield-alert", resource: "hc_disciplinary", sortOrder: 6 },
    { title: "Org Structure", url: "/dashboard/hc/org-chart", section: "Human Capital", groupLabel: "HR Operational", iconName: "git-branch", resource: "hc_org_chart", sortOrder: 7 },
    { title: "Recruitment", url: "/dashboard/hc/recruitment", section: "Human Capital", groupLabel: "Recruitment Management", iconName: "users", resource: "hc_recruitment", sortOrder: 8 },
    { title: "Online Tests", url: "/dashboard/hc/recruitment/tests", section: "Human Capital", groupLabel: "Recruitment Management", iconName: "file-text", resource: "hc_recruitment_tests", sortOrder: 9 },
    { title: "Training Enhancement", url: "/dashboard/hc/training", section: "Human Capital", groupLabel: "Training Center", iconName: "target", resource: "hc_training_enhanced", sortOrder: 10 },
    { title: "Training Records", url: "/dashboard/training-records", section: "Human Capital", groupLabel: "Training Center", iconName: "list-details", resource: "training_records", sortOrder: 11 },
    { title: "LMS Chitra Learning", url: "/dashboard/lms", section: "Human Capital", groupLabel: "Training Center", iconName: "book-open", resource: "lms_integration", sortOrder: 12 },
    { title: "Performance", url: "/dashboard/hc/performance", section: "Human Capital", groupLabel: "Performance & Development", iconName: "trending-up", resource: "hc_performance", sortOrder: 13 },
    { title: "Technical Engineer", url: "/dashboard/hc/technical-engineer", section: "Human Capital", groupLabel: "Performance & Development", iconName: "wrench", resource: "hc_technical_engineer", sortOrder: 14 },
    { title: "Certificates", url: "/dashboard/hc/certificate", section: "Human Capital", groupLabel: "Performance & Development", iconName: "address-card", resource: "hc_certificate", sortOrder: 15 },
  ],
  "Attendance": [
    { title: "Live / Import", url: "/dashboard/attendance", section: "Attendance", iconName: "clock", resource: "attendance", sortOrder: 1, menuArea: "secondary" },
    { title: "Records", url: "/dashboard/attendance/records", section: "Attendance", iconName: "clock", resource: "attendance_records", sortOrder: 2, menuArea: "secondary" },
    { title: "Exceptions", url: "/dashboard/scheduling-timesheet/permission", section: "Attendance", iconName: "shield-alert", resource: "attendance_exceptions", sortOrder: 3, menuArea: "secondary" },
    { title: "Sync Log", url: "/dashboard/scheduling-timesheet/attendance", section: "Attendance", iconName: "checklist", resource: "scheduling_timesheet_attendance", sortOrder: 4, menuArea: "secondary" },
  ],
  "HSE": [
    { title: "HSE", url: "/dashboard/hse", section: "HSE", groupLabel: "Safety Management", iconName: "shield", resource: "hse", sortOrder: 1 },
    { title: "Safety Dashboard", url: "/dashboard/safety", section: "HSE", groupLabel: "Safety Management", iconName: "activity", resource: "safety_dashboard", sortOrder: 2 },
    { title: "Safety Data Management", url: "/dashboard/safety/data", section: "HSE", groupLabel: "Safety Management", iconName: "list-details", resource: "safety_data_management", sortOrder: 3 },
    { title: "Safety Inspections", url: "/dashboard/safety/inspections", section: "HSE", groupLabel: "Safety Management", iconName: "checklist", resource: "safety_inspections", sortOrder: 4 },
    { title: "HSE Checklists", url: "/dashboard/hse/checklist-generator", section: "HSE", groupLabel: "Safety Tools & Compliance", iconName: "checklist", resource: "hse_checklist_generator", sortOrder: 5 },
    { title: "HIRADC", url: "/dashboard/hse/hiradc", section: "HSE", groupLabel: "Safety Tools & Compliance", iconName: "file-spreadsheet", resource: "hse_hiradc", sortOrder: 6 },
    { title: "SIA/SIO & Tools Certification", url: "/dashboard/hse/sia-sio-tools-certification", section: "HSE", groupLabel: "Safety Tools & Compliance", iconName: "checklist", resource: "hse_sia_sio_tools_certification", sortOrder: 7 },
    { title: "Inventaris", url: "/dashboard/hse/inventaris", section: "HSE", groupLabel: "Safety Tools & Compliance", iconName: "checklist", resource: "hse_inventaris", sortOrder: 8 },
    { title: "Izin Kerja PTW", url: "/dashboard/hse/izin-kerja-ptw", section: "HSE", groupLabel: "Safety Tools & Compliance", iconName: "checklist", resource: "hse_izin_kerja_ptw", sortOrder: 9 },
    { title: "JSA", url: "/dashboard/hse/jsa", section: "HSE", groupLabel: "Safety Tools & Compliance", iconName: "checklist", resource: "hse_jsa", sortOrder: 10 },
    { title: "Incident Report", url: "/dashboard/hse/incident-report", section: "HSE", groupLabel: "Incident Management", iconName: "alert-triangle", resource: "hse_incident_report", sortOrder: 11 },
  ],
  "Central Service": [
    { title: "WIP Repair", url: "/dashboard/repair-retread/wip-repair", section: "Central Service", groupLabel: "Repair & Retread", iconName: "settings", resource: "wip_repair", sortOrder: 1 },
    { title: "WIP Dashboard", url: "/dashboard/repair-retread/wip-repair/dashboard", section: "Central Service", groupLabel: "Repair & Retread", iconName: "chart-bar", resource: "wip_repair_dashboard", sortOrder: 2 },
    { title: "Master Barang Repair", url: "/dashboard/repair-retread/master-barang-repair", section: "Central Service", groupLabel: "Repair & Retread", iconName: "database", resource: "master_barang_repair", sortOrder: 3 },
    { title: "Stock Material SAP", url: "/dashboard/repair-retread/stock-material-sap", section: "Central Service", groupLabel: "Repair & Retread", iconName: "database", resource: "stock_material_sap", sortOrder: 4 },
    { title: "Dashboard", url: "/dashboard/warehouse-repair", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "chart-bar", resource: "warehouse_repair_dashboard", sortOrder: 5 },
    { title: "Data Barang", url: "/dashboard/warehouse-repair/barang", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "database", resource: "warehouse_repair_barang", sortOrder: 6 },
    { title: "Jenis Barang", url: "/dashboard/warehouse-repair/jenis", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "folder", resource: "warehouse_repair_jenis", sortOrder: 7 },
    { title: "Satuan", url: "/dashboard/warehouse-repair/satuan", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "folder", resource: "warehouse_repair_satuan", sortOrder: 8 },
    { title: "Barang Masuk", url: "/dashboard/warehouse-repair/barang-masuk", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "checklist", resource: "warehouse_repair_barang_masuk", sortOrder: 9 },
    { title: "Barang Keluar", url: "/dashboard/warehouse-repair/barang-keluar", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "list-details", resource: "warehouse_repair_barang_keluar", sortOrder: 10 },
    { title: "Laporan Stok", url: "/dashboard/warehouse-repair/laporan-stok", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "report", resource: "warehouse_repair_laporan_stok", sortOrder: 11 },
    { title: "Laporan Barang Masuk", url: "/dashboard/warehouse-repair/laporan-barang-masuk", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "report", resource: "warehouse_repair_laporan_barang_masuk", sortOrder: 12 },
    { title: "Laporan Barang Keluar", url: "/dashboard/warehouse-repair/laporan-barang-keluar", section: "Central Service", groupLabel: "Warehouse Repair", iconName: "report", resource: "warehouse_repair_laporan_barang_keluar", sortOrder: 13 },
    { title: "Cargo Manifest", url: "/dashboard/cargo-manifest", section: "Central Service", groupLabel: "Logistics", iconName: "folder", resource: "cargo_manifest", sortOrder: 14 },
  ],
  "Laporan": [
    { title: "Analytics", url: "/dashboard/analytics", section: "Laporan", iconName: "chart-bar", resource: "dashboard_repair", sortOrder: 1 },
    { title: "Reports", url: "/dashboard/reports", section: "Laporan", iconName: "report", resource: "repair_productivity", sortOrder: 2 },
    { title: "Points Overview", url: "/dashboard/leaderboard", section: "Laporan", iconName: "settings", resource: "point_setting", sortOrder: 3 },
    { title: "Security Overview", url: "/dashboard/security", section: "Laporan", iconName: "database", resource: "security_session", sortOrder: 4 },
    { title: "Audit Log", url: "/dashboard/security/audit-logs", section: "Laporan", iconName: "report", resource: "security_audit", sortOrder: 5 },
  ],
  "Pengaturan": [
    { title: "Role Management", url: "/dashboard/security/roles", section: "Pengaturan", iconName: "shield", resource: "security_roles", sortOrder: 1 },
    { title: "User Management", url: "/dashboard/security/users", section: "Pengaturan", iconName: "users", resource: "security_users", sortOrder: 2, menuArea: "secondary" },
    { title: "Navbar Setting", url: "/dashboard/settings/navbar", section: "Pengaturan", iconName: "settings", resource: "settings_navbar", sortOrder: 3, menuArea: "secondary" },
    { title: "Portal Chitra Settings", url: "/dashboard/settings/portal-chitra", section: "Pengaturan", iconName: "settings", resource: "settings_portal_chitra", sortOrder: 4, menuArea: "secondary" },
    { title: "Email Delivery Log", url: "/dashboard/settings/email", section: "Pengaturan", iconName: "mail", resource: "settings_email", sortOrder: 5, menuArea: "secondary" },
  ],
};

async function reorganizeMenus() {
  console.log("Clearing existing menu items...");
  await db.delete(navbarMenuItems);

  let totalInserted = 0;

  for (const [sectionName, items] of Object.entries(GROUPED_SECTIONS)) {
    for (const item of items) {
      await db.insert(navbarMenuItems).values({
        menuArea: (item as any).menuArea ?? "main",
        section: item.section,
        title: item.title,
        url: item.url,
        iconName: item.iconName,
        resource: item.resource,
        sortOrder: item.sortOrder,
        isVisible: item.isVisible ?? true,
        openInNewTab: false,
        itemType: "menu",
        parentId: null,
        groupLabel: item.groupLabel ?? null,
      });
      totalInserted++;
    }
    console.log(`  [${sectionName}] ${items.length} items`);
  }

  console.log(`\nTotal: ${totalInserted} menu items inserted`);
}

reorganizeMenus()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
