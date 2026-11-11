import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { classifyItem, buildModernSidebarGroups } from "../lib/sidebar-mode.ts";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("Group 1: HR Operations & Administration defined in lib/hero-admin.ts", () => {
  const heroAdmin = read("lib/hero-admin.ts");

  // Verify groupLabel exists
  assert.match(heroAdmin, /groupLabel: 'HR Operations & Administration'/);

  // Verify 8 items in exact order and exact titles
  const expectedGroup1 = [
    { title: "Data Karyawan", url: "/dashboard/hc/employee", sortOrder: 1, resource: "hc_employee" },
    { title: "Attendance", url: "/dashboard/scheduling-timesheet/attendance", sortOrder: 2, resource: "hrga_attendance" },
    { title: "Sakit & Terlambat", url: "/dashboard/hc/permission", sortOrder: 3, resource: "hc_attendance_permission" },
    { title: "Employee Contract Review", url: "/dashboard/hc/contract-review", sortOrder: 4, resource: "hc_contract_review" },
    { title: "Composition Manpower", url: "/dashboard/central-service?tab=composition", sortOrder: 5, resource: "hc_manpower_composition" },
    { title: "Online Letter", url: "/dashboard/hc/surat", sortOrder: 6, resource: "hc_surat" },
    { title: "Marrital Change Status", url: "/dashboard/central-service/marital-status", sortOrder: 7, resource: "central_service_marital_status" },
    { title: "Labour Turn over", url: "/dashboard/hc/turnover", sortOrder: 8, resource: "hc_labour_turnover" },
  ];

  for (const item of expectedGroup1) {
    const itemRegex = new RegExp(
      `section: 'HRGA',\\s*groupLabel: 'HR Operations & Administration',\\s*title: '${item.title}',\\s*url: '${item.url.replace('?', '\\?')}',[\\s\\S]*?resource: '${item.resource}',\\s*sortOrder: ${item.sortOrder}`
    );
    assert.match(heroAdmin, itemRegex, `Expected item ${item.title} to match in lib/hero-admin.ts`);
  }

  // Verify Roster & Timesheet still has Attendance
  assert.match(
    heroAdmin,
    /section: 'Roster & Timesheet',[\s\S]*?title: 'Attendance',[\s\S]*?url: '\/dashboard\/scheduling-timesheet\/attendance',[\s\S]*?resource: 'scheduling_timesheet_attendance'/
  );

  // Verify hrga_attendance is in core permissions
  assert.match(
    heroAdmin,
    /'scheduling_timesheet_attendance',\s*'hrga_attendance'/
  );
});

test("Group 1: classifyItem maps Group 1 items to HRGA > HR Operations & Administration in modern mode", () => {
  const items = [
    { url: "/dashboard/hc/employee", title: "Data Karyawan" },
    { url: "/dashboard/scheduling-timesheet/attendance", title: "Attendance" },
    { url: "/dashboard/hc/permission", title: "Sakit & Terlambat" },
    { url: "/dashboard/hc/contract-review", title: "Employee Contract Review" },
    { url: "/dashboard/central-service?tab=composition", title: "Composition Manpower" },
    { url: "/dashboard/hc/surat", title: "Online Letter" },
    { url: "/dashboard/central-service/marital-status", title: "Marrital Change Status" },
    { url: "/dashboard/hc/turnover", title: "Labour Turn over" },
  ];

  for (const item of items) {
    const res = classifyItem(item);
    assert.equal(res.section, "HRGA");
    assert.equal(res.category, "HUMAN CAPITAL");
    assert.equal(res.groupLabel, "HR Operations & Administration");
  }

  // Other scheduling routes must stay in Operasional > Roster & Timesheet
  const rosterOverview = classifyItem({ url: "/dashboard/scheduling-timesheet", title: "Overview Roster" });
  assert.equal(rosterOverview.section, "Operasional");
  assert.equal(rosterOverview.groupLabel, "Roster & Timesheet");

  // Base central service must stay in Central Service > Logistik & Fleet
  const baseCs = classifyItem({ url: "/dashboard/central-service", title: "Central Service" });
  assert.equal(baseCs.section, "Central Service");
  assert.equal(baseCs.groupLabel, "Logistik & Fleet");
});

test("Group 1: buildModernSidebarGroups deduplicates items with same URL (e.g. Attendance)", () => {
  const sampleDesktopItems = [
    {
      id: 1542,
      section: "Roster & Timesheet",
      title: "Attendance",
      url: "/dashboard/scheduling-timesheet/attendance",
      sortOrder: 6,
      groupLabel: null,
    },
    {
      id: 2034,
      section: "HRGA",
      title: "Attendance",
      url: "/dashboard/scheduling-timesheet/attendance",
      sortOrder: 2,
      groupLabel: "HR Operations & Administration",
    },
    {
      id: 1525,
      section: "HRGA",
      title: "Data Karyawan",
      url: "/dashboard/hc/employee",
      sortOrder: 1,
      groupLabel: "HR Operations & Administration",
    },
  ];

  const groups = buildModernSidebarGroups(sampleDesktopItems);
  const hrgaGroup = groups.find((g) => g.rawTitle === "HRGA");
  assert.ok(hrgaGroup, "HRGA group should exist");

  const attendanceItems = hrgaGroup.items.filter((it) => it.url === "/dashboard/scheduling-timesheet/attendance");
  assert.equal(attendanceItems.length, 1, "Attendance should be deduplicated in modern mode");
  assert.equal(attendanceItems[0].sortOrder, 2, "Preferred Attendance should be the HRGA entry with sortOrder 2");
});

test("Group 1: central-service page.tsx supports tab=composition via useSearchParams", () => {
  const pageSource = read("app/dashboard/central-service/page.tsx");

  assert.match(pageSource, /useSearchParams/);
  assert.match(pageSource, /searchParams\.get\('tab'\)/);
  assert.match(pageSource, /tabParam === 'composition'/);
  assert.match(pageSource, /router\.replace\('\/dashboard\/central-service\?tab=composition'/);
});

test("Group 1: nav-main.tsx supports query param matching for tabs", () => {
  const navMainSource = read("components/nav-main.tsx");

  assert.match(navMainSource, /function isMenuItemActive\(pathname: string, url: string, searchParamsStr/);
  assert.match(navMainSource, /url\.includes\("\?"\)/);
  assert.match(navMainSource, /currentParams\.get\("tab"\) === "composition"/);
});
