import { db } from "@/db";
import { navbarMenuItems, securityRoles, roleMenuPermissions } from "@/db/schema/hero";
import { eq, sql, inArray } from "drizzle-orm";
import { syncMenuPermissionsMatrix } from "@/lib/hero-admin";

const COMPLETE_MENU_DEFINITIONS = [
  // 1. Portal Chitra
  { section: "Portal Chitra", title: "Portal Chitra", url: "/dashboard/portal-chitra", iconName: "dashboard", resource: "portal_chitra", sortOrder: 1, menuArea: "main" },

  // 2. Aktivitas Harian
  { section: "Aktivitas Harian", title: "Daily Activity", url: "/dashboard/daily-activity", iconName: "checklist", resource: "daily_activity", sortOrder: 0, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Input Aktivitas Harian", url: "/dashboard/activity-hub/my-day", iconName: "dashboard", resource: "tire_service", sortOrder: 1, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Dashboard Utilities", url: "/dashboard/utilities", iconName: "chart", resource: "activity_utilities", sortOrder: 2, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Monitoring Tim & SPL", url: "/dashboard/activity-hub/team-board", iconName: "list-details", resource: "tire_repair", sortOrder: 3, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Approval Workflow", url: "/dashboard/activity-hub/approval", iconName: "check-circle", resource: "activity_approval_workflow", sortOrder: 4, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Kamus Aktivitas", url: "/dashboard/activity-hub/library", iconName: "database", resource: "activity_library", sortOrder: 5, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Route Template Harian", url: "/dashboard/activity-hub/routes", iconName: "list-details", resource: "activity_routes", sortOrder: 6, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Rule Aktivitas Global", url: "/dashboard/activity-hub/configuration", iconName: "settings", resource: "activity_configuration", sortOrder: 7, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Pengajuan Lembur (Request)", url: "/dashboard/overtime-requests", iconName: "checklist", resource: "overtime_requests", sortOrder: 8, menuArea: "main" },
  { section: "Aktivitas Harian", title: "Timesheet Realisasi", url: "/dashboard/timesheet", iconName: "folder", resource: "tire_engineer", sortOrder: 9, menuArea: "main" },

  // 3. Roster & Timesheet
  { section: "Roster & Timesheet", title: "Overview Roster", url: "/dashboard/scheduling-timesheet", iconName: "clock", resource: "scheduling_timesheet", sortOrder: 1, menuArea: "main" },
  { section: "Roster & Timesheet", title: "Setup Roster", url: "/dashboard/scheduling-timesheet/setup", iconName: "settings", resource: "scheduling_timesheet_setup", sortOrder: 2, menuArea: "main" },
  { section: "Roster & Timesheet", title: "Schedule v2", url: "/dashboard/scheduling-timesheet/schedule-v2", iconName: "clock", resource: "scheduling_timesheet_schedule_v2", sortOrder: 3, menuArea: "main" },
  { section: "Roster & Timesheet", title: "Field Break Schedule", url: "/dashboard/scheduling-timesheet/field-break", iconName: "list-details", resource: "scheduling_timesheet_field_break", sortOrder: 4, menuArea: "main" },
  { section: "Roster & Timesheet", title: "Payroll Timesheet", url: "/dashboard/scheduling-timesheet/payroll", iconName: "report", resource: "scheduling_timesheet_payroll", sortOrder: 5, menuArea: "main" },
  { section: "Roster & Timesheet", title: "Attendance Real", url: "/dashboard/scheduling-timesheet/attendance", iconName: "checklist", resource: "scheduling_timesheet_attendance", sortOrder: 6, menuArea: "main" },
  { section: "Roster & Timesheet", title: "Izin & Exception", url: "/dashboard/scheduling-timesheet/permission", iconName: "shield-alert", resource: "scheduling_timesheet_permission", sortOrder: 7, menuArea: "main" },
  { section: "Roster & Timesheet", title: "EWH Dashboard", url: "/dashboard/ewh", iconName: "clock", resource: "ewh_dashboard", sortOrder: 8, menuArea: "main" },
  { section: "Roster & Timesheet", title: "Unit Utility", url: "/dashboard/unit-utility", iconName: "settings", resource: "unit_utility_timesheet", sortOrder: 9, menuArea: "main" },

  // 4. Approval
  { section: "Approval", title: "Approval Inbox", url: "/dashboard/approval", iconName: "mail", resource: "approval_inbox", sortOrder: 1, menuArea: "main" },
  { section: "Approval", title: "Request Center", url: "/dashboard/request-center", iconName: "folder", resource: "request_center", sortOrder: 2, menuArea: "main" },
  { section: "Approval", title: "Approval Workflow Builder", url: "/dashboard/workflow-studio", iconName: "list-details", resource: "workflow_studio", sortOrder: 3, menuArea: "main" },
  { section: "Approval", title: "Notification Center", url: "/dashboard/notifications", iconName: "mail", resource: "notification_center", sortOrder: 4, menuArea: "main" },

  // 5. Data Induk
  { section: "Data Induk", title: "Master Data", url: "/dashboard/master-data", iconName: "database", resource: "master_data", sortOrder: 1, menuArea: "secondary" },
  { section: "Data Induk", title: "Form Builder", url: "/dashboard/form-studio", iconName: "file-word", resource: "form_studio", sortOrder: 2, menuArea: "secondary" },
  { section: "Data Induk", title: "Customer Management", url: "/dashboard/customers", iconName: "users", resource: "customers", sortOrder: 3, menuArea: "secondary" },

  // 6. Human Capital
  { section: "Human Capital", title: "HC Overview", url: "/dashboard/hc", iconName: "users", resource: "hc_safety", sortOrder: 1, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Dashboard Pengaduan HR", url: "/dashboard/hr-counseling", iconName: "users", resource: "hr_counseling_admin", sortOrder: 2, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Pengaduan", url: "/dashboard/curhat", iconName: "users", resource: "hr_counseling_user", sortOrder: 3, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Employee Data", url: "/dashboard/hc/employee", iconName: "users", resource: "hc_employee", sortOrder: 4, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Surat", url: "/dashboard/hc/surat", iconName: "file-word", resource: "hc_surat", sortOrder: 5, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Izin Sakit & Terlambat", url: "/dashboard/hc/permission", iconName: "shield-alert", resource: "hc_attendance_permission", sortOrder: 6, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Contract Review", url: "/dashboard/hc/contract-review", iconName: "file-signature", resource: "hc_contract_review", sortOrder: 7, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Disciplinary", url: "/dashboard/hc/disciplinary", iconName: "shield-alert", resource: "hc_disciplinary", sortOrder: 8, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Org Structure V2", url: "/dashboard/hc/org-chart-v2", iconName: "list-details", resource: "hc_org_chart_v2", sortOrder: 9, menuArea: "main", groupLabel: "HR Operational" },
  { section: "Human Capital", title: "Recruitment", url: "/dashboard/hc/recruitment", iconName: "users", resource: "hc_recruitment", sortOrder: 10, menuArea: "main", groupLabel: "Recruitment Management" },
  { section: "Human Capital", title: "RFR (Permohonan Rekrutmen)", url: "/dashboard/hc/rfr", iconName: "file-check", resource: "rfr", sortOrder: 11, menuArea: "main", groupLabel: "Recruitment Management" },
  { section: "Human Capital", title: "Online Tests", url: "/dashboard/hc/recruitment/tests", iconName: "file-text", resource: "hc_recruitment_tests", sortOrder: 12, menuArea: "main", groupLabel: "Recruitment Management" },
  { section: "Human Capital", title: "MCU Wellness", url: "/dashboard/hc/mcu-wellness", iconName: "heart-pulse", resource: "hc_mcu_wellness", sortOrder: 13, menuArea: "main", groupLabel: "Recruitment Management" },
  { section: "Human Capital", title: "Training Enhancement", url: "/dashboard/hc/training", iconName: "target", resource: "hc_training_enhanced", sortOrder: 14, menuArea: "main", groupLabel: "Training Center" },
  { section: "Human Capital", title: "Training Records", url: "/dashboard/training-records", iconName: "list-details", resource: "training_records", sortOrder: 15, menuArea: "main", groupLabel: "Training Center" },
  { section: "Human Capital", title: "Performance", url: "/dashboard/hc/performance", iconName: "trending-up", resource: "hc_performance", sortOrder: 16, menuArea: "main", groupLabel: "Performance & Development" },
  { section: "Human Capital", title: "Leader Performance", url: "/dashboard/hc/leader-performance", iconName: "users", resource: "hc_leader_performance", sortOrder: 17, menuArea: "main", groupLabel: "Performance & Development" },

  // 7. ChitraLearning LMS
  { section: "ChitraLearning LMS", title: "Learning Workspace", url: "/dashboard/chitralearning-lms", iconName: "book-open", resource: "chitralearning_lms_workspace", sortOrder: 1, menuArea: "main" },
  { section: "ChitraLearning LMS", title: "Course Builder", url: "/dashboard/chitralearning-lms/courses/new", iconName: "hammer", resource: "chitralearning_lms_builder", sortOrder: 2, menuArea: "main" },
  { section: "ChitraLearning LMS", title: "Section Management", url: "/dashboard/chitralearning-lms/management", iconName: "settings", resource: "chitralearning_lms_management", sortOrder: 3, menuArea: "main" },
  { section: "ChitraLearning LMS", title: "Campaigns", url: "/dashboard/chitralearning-lms/campaigns", iconName: "megaphone", resource: "chitralearning_lms_campaigns", sortOrder: 4, menuArea: "main" },

  // 8. Attendance
  { section: "Attendance", title: "Live / Import", url: "/dashboard/attendance", iconName: "clock", resource: "attendance", sortOrder: 1, menuArea: "secondary" },
  { section: "Attendance", title: "Live Map Attendance", url: "/dashboard/attendance/live-map", iconName: "map-2", resource: "attendance_live_map", sortOrder: 2, menuArea: "secondary" },
  { section: "Attendance", title: "Records", url: "/dashboard/attendance/records", iconName: "clock", resource: "attendance_records", sortOrder: 3, menuArea: "secondary" },

  // 9. HSE
  { section: "HSE", title: "HSE Overview", url: "/dashboard/hse", iconName: "shield", resource: "hse", sortOrder: 1, menuArea: "main", groupLabel: "Safety Management" },
  { section: "HSE", title: "Safety Dashboard", url: "/dashboard/safety", iconName: "activity", resource: "safety_dashboard", sortOrder: 2, menuArea: "main", groupLabel: "Safety Management" },
  { section: "HSE", title: "Safety Data Management", url: "/dashboard/safety/data", iconName: "list-details", resource: "safety_data_management", sortOrder: 3, menuArea: "main", groupLabel: "Safety Management" },
  { section: "HSE", title: "Safety Inspections", url: "/dashboard/safety/inspections", iconName: "checklist", resource: "safety_inspections", sortOrder: 4, menuArea: "main", groupLabel: "Safety Management" },
  { section: "HSE", title: "HSE Checklists", url: "/dashboard/hse/checklist-generator", iconName: "checklist", resource: "hse_checklist_generator", sortOrder: 5, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "HIRADC", url: "/dashboard/hse/hiradc", iconName: "file-spreadsheet", resource: "hse_hiradc", sortOrder: 6, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "SIA/SIO & Tools Certification", url: "/dashboard/hse/sia-sio-tools-certification", iconName: "checklist", resource: "hse_sia_sio_tools_certification", sortOrder: 7, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "Inventaris", url: "/dashboard/hse/inventaris", iconName: "checklist", resource: "hse_inventaris", sortOrder: 8, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "Izin Kerja PTW", url: "/dashboard/hse/izin-kerja-ptw", iconName: "checklist", resource: "hse_izin_kerja_ptw", sortOrder: 9, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "JSA", url: "/dashboard/hse/jsa", iconName: "checklist", resource: "hse_jsa", sortOrder: 10, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "Safety Induction", url: "/dashboard/safety-induction", iconName: "checklist", resource: "safety_induction", sortOrder: 11, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "Summary APD", url: "/dashboard/summary", iconName: "file-text", resource: "hse_summary_apd", sortOrder: 12, menuArea: "main", groupLabel: "Safety Tools & Compliance" },
  { section: "HSE", title: "Incident Report", url: "/dashboard/hse/incident-report", iconName: "alert-triangle", resource: "hse_incident_report", sortOrder: 13, menuArea: "main", groupLabel: "Incident Management" },

  // 10. Quality & CPI
  { section: "Quality & CPI", title: "Audit 5R", url: "/dashboard/quality/5r", iconName: "sparkles", resource: "five_r_report", sortOrder: 1, menuArea: "main", groupLabel: "Quality & Continuous Improvement" },
  { section: "Quality & CPI", title: "SOP/WIN", url: "/dashboard/sop-win", iconName: "files", resource: "sop-win", sortOrder: 2, menuArea: "main", groupLabel: "Quality & Continuous Improvement" },

  // 11. Central Service
  { section: "Central Service", title: "Central Service Overview", url: "/dashboard/central-service", iconName: "database", resource: "central_service", sortOrder: 1, menuArea: "main", groupLabel: "Management" },
  { section: "Central Service", title: "Request Barang", url: "/dashboard/apd", iconName: "shield", resource: "apd-request", sortOrder: 2, menuArea: "main", groupLabel: "Management" },
  { section: "Central Service", title: "Pergantian Status Pernikahan", url: "/dashboard/central-service/marital-status", iconName: "heart", resource: "central_service_marital_status", sortOrder: 3, menuArea: "main", groupLabel: "Management" },
  { section: "Central Service", title: "CS Forecast", url: "/dashboard/central-service/forecast", iconName: "trending-up", resource: "cs-forecast", sortOrder: 4, menuArea: "main", groupLabel: "Management" },
  { section: "Central Service", title: "Re-Fueling LV", url: "/dashboard/central-service/refueling", iconName: "truck", resource: "central_service_refueling", sortOrder: 4, menuArea: "main", groupLabel: "Management" },
  { section: "Central Service", title: "Tire Site Inspection", url: "/dashboard/hse/tire-inspection", iconName: "camera", resource: "hse_tire_inspection", sortOrder: 5, menuArea: "main", groupLabel: "Technical" },
  { section: "Central Service", title: "Master Data APD", url: "/dashboard/central-service/master-apd", iconName: "database", resource: "central_service_master_apd", sortOrder: 6, menuArea: "main", groupLabel: "Technical" },
  { section: "Central Service", title: "Asset Management", url: "/dashboard/central-service/assets", iconName: "database", resource: "central_service_assets", sortOrder: 7, menuArea: "main", groupLabel: "Technical" },
  { section: "Central Service", title: "SAP Asset Inventory", url: "/dashboard/central-service/sap-assets", iconName: "database", resource: "central_service_sap_assets", sortOrder: 8, menuArea: "main", groupLabel: "Technical" },
  { section: "Central Service", title: "WIP Repair", url: "/dashboard/repair-retread/wip-repair", iconName: "settings", resource: "wip_repair", sortOrder: 9, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "WIP Dashboard", url: "/dashboard/repair-retread/wip-repair/dashboard", iconName: "chart-bar", resource: "wip_repair_dashboard", sortOrder: 10, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "WIP Dashboard V2", url: "/dashboard/repair-retread/wip-repair/dashboard-v2", iconName: "chart-bar", resource: "wip_repair_dashboard_v2", sortOrder: 11, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "Master Barang Repair", url: "/dashboard/repair-retread/master-barang-repair", iconName: "database", resource: "master_barang_repair", sortOrder: 12, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "Stock Material SAP", url: "/dashboard/repair-retread/stock-material-sap", iconName: "database", resource: "stock_material_sap", sortOrder: 13, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "Pattern Designer", url: "/dashboard/repair-retread/pattern-designer", iconName: "pen-tool", resource: "retread_pattern_designer", sortOrder: 14, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "Form WO", url: "/dashboard/repair-retread/form-wo", iconName: "file-plus", resource: "repair_form_wo", sortOrder: 15, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "Tire Inspection Report", url: "/dashboard/repair-retread/inspection", iconName: "file-check", resource: "repair_retread_inspection", sortOrder: 16, menuArea: "main", groupLabel: "Repair & Retread" },
  { section: "Central Service", title: "Repair Job Card", url: "/dashboard/repair-retread/jobcard", iconName: "file-text", resource: "repair_jobcard", sortOrder: 17, menuArea: "main", groupLabel: "Repair & Retread", isVisible: false },
  { section: "Central Service", title: "Warehouse Dashboard", url: "/dashboard/warehouse-repair", iconName: "chart-bar", resource: "warehouse_repair_dashboard", sortOrder: 18, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Data Barang", url: "/dashboard/warehouse-repair/barang", iconName: "database", resource: "warehouse_repair_barang", sortOrder: 19, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Jenis Barang", url: "/dashboard/warehouse-repair/jenis", iconName: "folder", resource: "warehouse_repair_jenis", sortOrder: 20, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Satuan", url: "/dashboard/warehouse-repair/satuan", iconName: "folder", resource: "warehouse_repair_satuan", sortOrder: 21, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Barang Masuk", url: "/dashboard/warehouse-repair/barang-masuk", iconName: "checklist", resource: "warehouse_repair_barang_masuk", sortOrder: 22, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Barang Keluar", url: "/dashboard/warehouse-repair/barang-keluar", iconName: "list-details", resource: "warehouse_repair_barang_keluar", sortOrder: 23, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Laporan Stok", url: "/dashboard/warehouse-repair/laporan-stok", iconName: "report", resource: "warehouse_repair_laporan_stok", sortOrder: 24, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Laporan Barang Masuk", url: "/dashboard/warehouse-repair/laporan-barang-masuk", iconName: "report", resource: "warehouse_repair_laporan_barang_masuk", sortOrder: 25, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Laporan Barang Keluar", url: "/dashboard/warehouse-repair/laporan-barang-keluar", iconName: "report", resource: "warehouse_repair_laporan_barang_keluar", sortOrder: 26, menuArea: "main", groupLabel: "Warehouse Repair" },
  { section: "Central Service", title: "Cargo Manifest", url: "/dashboard/cargo-manifest", iconName: "folder", resource: "cargo_manifest", sortOrder: 27, menuArea: "main", groupLabel: "Logistics" },
  { section: "Central Service", title: "Site Condition Report", url: "/dashboard/central-service/site-condition", iconName: "report", resource: "central_service_site_condition", sortOrder: 28, menuArea: "main", groupLabel: "Logistics" },

  // 12. Laporan
  { section: "Laporan", title: "Analytics", url: "/dashboard/analytics", iconName: "chart-bar", resource: "dashboard_repair", sortOrder: 1, menuArea: "main" },
  { section: "Laporan", title: "Reports", url: "/dashboard/reports", iconName: "report", resource: "repair_productivity", sortOrder: 2, menuArea: "main" },
  { section: "Laporan", title: "Road Condition Analysis", url: "/dashboard/reports/road-condition", iconName: "report", resource: "hse_road_condition_analysis", sortOrder: 3, menuArea: "main", groupLabel: "Field Analysis" },
  { section: "Laporan", title: "Points Overview", url: "/dashboard/leaderboard", iconName: "settings", resource: "point_setting", sortOrder: 4, menuArea: "main" },
  { section: "Laporan", title: "Security Overview", url: "/dashboard/security", iconName: "database", resource: "security_session", sortOrder: 5, menuArea: "main" },
  { section: "Laporan", title: "Audit Log", url: "/dashboard/security/audit-logs", iconName: "report", resource: "security_audit", sortOrder: 6, menuArea: "main" },

  // 13. Pengaturan
  { section: "Pengaturan", title: "Role Management", url: "/dashboard/security/roles", iconName: "shield", resource: "security_roles", sortOrder: 1, menuArea: "main" },
  { section: "Pengaturan", title: "User Management", url: "/dashboard/security/users", iconName: "users", resource: "security_users", sortOrder: 2, menuArea: "secondary" },
  { section: "Pengaturan", title: "Quick Action Admin", url: "/dashboard/security/quick-actions", iconName: "bolt", resource: "security_quick_actions", sortOrder: 3, menuArea: "secondary" },
  { section: "Pengaturan", title: "Navbar Setting", url: "/dashboard/settings/navbar", iconName: "settings", resource: "settings_navbar", sortOrder: 4, menuArea: "secondary" },
  { section: "Pengaturan", title: "Portal Chitra Settings", url: "/dashboard/settings/portal-chitra", iconName: "settings", resource: "settings_portal_chitra", sortOrder: 5, menuArea: "secondary" },
  { section: "Pengaturan", title: "Email Delivery Log", url: "/dashboard/settings/email", iconName: "mail", resource: "settings_email", sortOrder: 6, menuArea: "secondary" },
  { section: "Pengaturan", title: "Backup & Restore", url: "/dashboard/settings/system-backup", iconName: "database", resource: "settings_system_backup", sortOrder: 7, menuArea: "secondary" },

  // 14. 360 Service
  { section: "360 Service", title: "Master Customers", url: "/dashboard/360-service/customers", iconName: "users", resource: "service_360_customers", sortOrder: 1, menuArea: "main" },
  { section: "360 Service", title: "Master Items (Barang/Service)", url: "/dashboard/360-service/items", iconName: "packages", resource: "service_360_items", sortOrder: 2, menuArea: "main" },
  { section: "360 Service", title: "Quotations", url: "/dashboard/360-service/quotations", iconName: "file-text", resource: "service_360_quotations", sortOrder: 3, menuArea: "main" },
  { section: "360 Service", title: "Service Form", url: "/dashboard/360-service/service-form", iconName: "checklist", resource: "service_360_form", sortOrder: 4, menuArea: "main" },

  // 15. MAESTRO
  { section: "MAESTRO", title: "MAESTRO Overview", url: "/dashboard/settings/maestro", iconName: "layers", resource: "maestro_settings", sortOrder: 1, menuArea: "main" },
  { section: "MAESTRO", title: "Customer User Management", url: "/dashboard/settings/maestro/users", iconName: "users", resource: "maestro_users", sortOrder: 2, menuArea: "main" },
];

async function main() {
  console.log("=== PERMANENTLY FIXING SIDEBAR MENUS ===");
  
  // 1. Clear and re-populate navbarMenuItems
  await db.delete(navbarMenuItems);
  console.log("Deleted old navbarMenuItems");

  const inserted = await db.insert(navbarMenuItems).values(
    COMPLETE_MENU_DEFINITIONS.map(m => ({
      section: m.section,
      title: m.title,
      url: m.url,
      iconName: m.iconName,
      resource: m.resource,
      sortOrder: m.sortOrder,
      menuArea: m.menuArea,
      groupLabel: (m as any).groupLabel ?? null,
      isVisible: true,
      openInNewTab: false,
      itemType: "menu",
      parentId: null,
    }))
  ).returning();

  console.log(`Inserted ${inserted.length} menu items cleanly.`);

  // 2. Grant permissions for all roles
  await syncMenuPermissionsMatrix();
  console.log("Synced role menu permissions matrix.");

  // 3. Verify
  const all = await db.select().from(navbarMenuItems).orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder);
  console.log(`\nVerified ${all.length} total menu items in database!`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
