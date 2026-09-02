import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPaths = [
    "d:/[01] PROJECT/HERO/.env.local",
    "d:/[01] PROJECT/HERO/.env",
  ];
  for (const fullPath of envPaths) {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const firstEqual = trimmed.indexOf("=");
          if (firstEqual !== -1) {
            const key = trimmed.substring(0, firstEqual).trim();
            const value = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, "");
            process.env[key] = value;
          }
        }
      }
      console.log(`Loaded environment from ${fullPath}`);
      return;
    }
  }
}

function hasMobileCounterpart(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/mobile")) return true;
  const cleanUrl = url.split("?")[0];
  if (cleanUrl === "/dashboard/activity-hub/my-day") return true;
  if (cleanUrl.startsWith("/dashboard/activity-hub")) return true;
  if (cleanUrl === "/dashboard/overtime-requests" || cleanUrl.startsWith("/dashboard/overtime")) return true;
  if (cleanUrl === "/dashboard/timesheet" || cleanUrl.startsWith("/dashboard/scheduling-timesheet")) return true;
  if (cleanUrl === "/dashboard/approval") return true;
  if (cleanUrl === "/dashboard/curhat") return true;
  if (cleanUrl === "/dashboard/hr-counseling") return true;
  if (cleanUrl === "/dashboard/hse" || cleanUrl.startsWith("/dashboard/hse/")) return true;
  if (cleanUrl === "/dashboard/gamification") return true;
  if (cleanUrl === "/dashboard/wellness") return true;
  if (cleanUrl === "/dashboard/executive") return true;
  if (cleanUrl === "/dashboard/cargo-manifest") return true;
  if (cleanUrl === "/dashboard/security/roles") return true;
  if (cleanUrl === "/dashboard/reports") return true;
  if (cleanUrl === "/dashboard/training") return true;
  if (cleanUrl === "/dashboard/attendance" || cleanUrl.startsWith("/dashboard/attendance/")) return true;

  const segments = cleanUrl.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const knownMobilePages = [
    "activity", "approval", "attendance", "cargo-manifest", "curhat",
    "executive", "gamification", "hr-counseling", "hse", "lms",
    "notifications", "overtime", "profile", "reports", "timesheet",
    "training", "wellness"
  ];
  return knownMobilePages.includes(lastSegment);
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set in env");
  }

  const client = new Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL?.toLowerCase() === "false" ? false : undefined,
  });

  await client.connect();
  console.log("Connected to database.");

  // 1. Seed Roles
  const rolesToSeed = [
    { name: "Super Admin", description: "Kontrol penuh modul HERO termasuk konfigurasi sistem.", scope: "all_sites" },
    { name: "Site Admin", description: "Operasional site, approval, report, dan koordinasi manpower.", scope: "site" },
    { name: "HC Manager", description: "Kontrol user, training, wellness, dan payroll support.", scope: "all_sites" },
    { name: "Manager", description: "Akses operasional department manager (monitoring, approval).", scope: "site" },
    { name: "Staff", description: "Akses staff kantor (daily activity, timesheet, request).", scope: "site" },
    { name: "Field Team", description: "Akses terbatas lapangan/mobile (absen, hse, activity).", scope: "site" },
  ];

  for (const role of rolesToSeed) {
    const checkRole = await client.query("select id from hero_security_roles where name = $1", [role.name]);
    if (checkRole.rows.length === 0) {
      await client.query(
        "insert into hero_security_roles (name, description, scope, created_at) values ($1, $2, $3, now())",
        [role.name, role.description, role.scope]
      );
      console.log(`Seeded role: ${role.name}`);
    } else {
      await client.query(
        "update hero_security_roles set description = $2, scope = $3 where name = $1",
        [role.name, role.description, role.scope]
      );
      console.log(`Updated role info: ${role.name}`);
    }
  }

  // Fetch all roles with IDs
  const dbRoles = await client.query("select id, name from hero_security_roles");
  const roleMap = new Map(dbRoles.rows.map((r) => [r.name, r.id]));

  // 2. Clear & Seed Role Menu Permissions based on analyzed restrictions
  const menuItems = await client.query("select id, resource, url from hero_navbar_menu_items");
  console.log(`Found ${menuItems.rows.length} menu items in database.`);

  for (const roleName of roleMap.keys()) {
    const roleId = roleMap.get(roleName)!;
    
    // Clear existing permissions for this role to rebuild cleanly
    await client.query("delete from hero_role_menu_permissions where role_id = $1", [roleId]);
    console.log(`Rebuilding permissions for role: ${roleName}`);

    const permissions = [];
    for (const menu of menuItems.rows) {
      let canView = false;
      let canEdit = false;
      let canDelete = false;
      let canSelectAll = false;

      if (roleName === "Super Admin") {
        canView = true;
        canEdit = true;
        canDelete = true;
        canSelectAll = true;
      } else if (roleName === "HC Manager") {
        // Can access everything except core system settings
        const isSystem = ["security", "settings_navbar", "settings_email", "portal_chitra", "settings_portal_chitra"].includes(menu.resource);
        canView = true;
        canEdit = !isSystem;
        canDelete = !isSystem;
      } else if (roleName === "Manager" || roleName === "Site Admin") {
        // Operational leaders
        const isSystem = ["security", "settings_navbar", "settings_email", "portal_chitra", "settings_portal_chitra", "activity_configuration"].includes(menu.resource);
        canView = !isSystem;
        canEdit = !isSystem;
        canDelete = false;
      } else if (roleName === "Staff") {
        // Office Staff - View most general dashboard operations, edit only submissions
        const allowedViews = [
          "portal_chitra", "tire_service", "overtime_requests", "tire_engineer",
          "scheduling_timesheet", "approval_inbox", "request_center", "wellness", "gamification", "hse"
        ];
        canView = allowedViews.includes(menu.resource) || hasMobileCounterpart(menu.url);
        canEdit = ["tire_service", "overtime_requests", "hse"].includes(menu.resource);
      } else if (roleName === "Field Team") {
        // Restricted field team - Mobile features only!
        canView = hasMobileCounterpart(menu.url);
        canEdit = ["tire_service", "overtime_requests", "hse"].includes(menu.resource);
      }

      let dataScope = 'site';
      if (roleName === "Super Admin" || roleName === "HC Manager") {
        dataScope = 'global';
      } else if (roleName === "Field Team") {
        dataScope = 'own';
      }

      permissions.push(`(${roleId}, ${menu.id}, ${canView}, ${canEdit}, ${canDelete}, ${canSelectAll}, '${dataScope}')`);
    }

    if (permissions.length > 0) {
      const query = `insert into hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope) values ${permissions.join(", ")}`;
      await client.query(query);
    }
  }

  // 3. Map Users to access_role
  console.log("Mapping users based on Department and Job Title...");
  const employees = await client.query("select id, name, email, job_title, department, section from hero_employees");
  console.log(`Found ${employees.rows.length} employees to evaluate.`);

  let updatedCount = 0;
  for (const emp of employees.rows) {
    const jobTitle = (emp.job_title || "").toLowerCase();
    const dept = (emp.department || "").toLowerCase();
    const sec = (emp.section || "").toLowerCase();
    const email = (emp.email || "").toLowerCase();

    let targetRole = "Staff"; // Default fallback

    // Super Admin checks (IT, HSE Admins, specific emails)
    if (
      jobTitle.includes("it") ||
      jobTitle.includes("programmer") ||
      jobTitle.includes("developer") ||
      jobTitle.includes("sysadmin") ||
      jobTitle.includes("hse admin") ||
      email.includes("admin") ||
      email.includes("it.support")
    ) {
      targetRole = "Super Admin";
    }
    // HC Manager checks
    else if (
      dept.includes("hc") ||
      dept.includes("human capital") ||
      sec.includes("hr-ga") ||
      sec.includes("counseling") ||
      sec.includes("training")
    ) {
      targetRole = "HC Manager";
    }
    // Manager/Site Admin (Department Head, Manager, Supervisors, Coordinators, Leaders)
    else if (
      jobTitle.includes("manager") ||
      jobTitle.includes("director") ||
      jobTitle.includes("vp") ||
      jobTitle.includes("chief") ||
      jobTitle.includes("head")
    ) {
      targetRole = "Manager";
    }
    else if (
      jobTitle.includes("supervisor") ||
      jobTitle.includes("coordinator") ||
      jobTitle.includes("leader") ||
      jobTitle.includes("foreman") ||
      jobTitle.includes("superintendent")
    ) {
      targetRole = "Site Admin";
    }
    // Field Team (Fitter, Mechanic, Operator, Driver, Helper, Tyreman, Welder, Technician, Lapang)
    else if (
      jobTitle.includes("fitter") ||
      jobTitle.includes("mechanic") ||
      jobTitle.includes("operator") ||
      jobTitle.includes("driver") ||
      jobTitle.includes("helper") ||
      jobTitle.includes("tyreman") ||
      jobTitle.includes("welder") ||
      jobTitle.includes("technician") ||
      jobTitle.includes("field") ||
      jobTitle.includes("lapang")
    ) {
      targetRole = "Field Team";
    }

    // Apply the update
    await client.query("update hero_employees set access_role = $1 where id = $2", [targetRole, emp.id]);
    updatedCount++;
  }

  console.log(`Completed mapping. Updated ${updatedCount} employees.`);

  await client.end();
  console.log("Database update done.");
}

main().catch(console.error).finally(() => process.exit(0));
