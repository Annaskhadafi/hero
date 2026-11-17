import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Group 6: Wellbeing & Engagement, Group 7: Performance Management, and Group 8: General Affair defined in lib/hero-admin.ts', () => {
  const heroAdminSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8');

  // Verify Group 6 in RAW_SIDEBAR_MENU_SEEDS
  assert.match(heroAdminSource, /groupLabel:\s*'Wellbeing & Engagement'/);
  assert.match(heroAdminSource, /title:\s*'MCU'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/hc\/mcu-wellness'/);
  assert.match(heroAdminSource, /title:\s*'Hero Point'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/leaderboard'/);
  assert.match(heroAdminSource, /title:\s*'List Kegiatan Olahraga'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/hc\/olahraga'/);
  assert.match(heroAdminSource, /title:\s*'Pengaduan'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/curhat'/);

  // Verify Group 7 in RAW_SIDEBAR_MENU_SEEDS
  assert.match(heroAdminSource, /groupLabel:\s*'Performance Management'/);
  assert.match(heroAdminSource, /title:\s*'Employee Performance'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/hc\/performance'/);
  assert.match(heroAdminSource, /title:\s*'Leader Performance'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/hc\/leader-performance'/);

  // Verify Group 8 in RAW_SIDEBAR_MENU_SEEDS
  assert.match(heroAdminSource, /groupLabel:\s*'General Affair'/);
  assert.match(heroAdminSource, /title:\s*'Vehicle Management'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/ga\/vehicles'/);
  assert.match(heroAdminSource, /title:\s*'ATK'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/ga\/atk'/);
  assert.match(heroAdminSource, /title:\s*'Rental House'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/ga\/house-rental'/);
});

test('classifyItem maps items to HRGA Groups 6, 7, and 8 in modern mode', async () => {
  const sidebarModeSource = fs.readFileSync(path.join(process.cwd(), 'lib/sidebar-mode.ts'), 'utf8');

  // Verify Group 6 in classifyItem
  assert.match(sidebarModeSource, /groupLabel:\s*"Wellbeing & Engagement"/);
  assert.match(sidebarModeSource, /url === "\/dashboard\/hc\/mcu-wellness"/);
  assert.match(sidebarModeSource, /url === "\/dashboard\/hc\/olahraga"/);
  assert.match(sidebarModeSource, /url === "\/dashboard\/curhat"/);

  // Verify Group 7 in classifyItem
  assert.match(sidebarModeSource, /groupLabel:\s*"Performance Management"/);
  assert.match(sidebarModeSource, /url\.startsWith\("\/dashboard\/hc\/performance"\)/);
  assert.match(sidebarModeSource, /url\.startsWith\("\/dashboard\/hc\/leader-performance"\)/);

  // Verify Group 8 in classifyItem
  assert.match(sidebarModeSource, /groupLabel:\s*"General Affair"/);
  assert.match(sidebarModeSource, /url\.startsWith\("\/dashboard\/ga\/vehicles"\)/);
  assert.match(sidebarModeSource, /url\.startsWith\("\/dashboard\/ga\/atk"\)/);
  assert.match(sidebarModeSource, /url\.startsWith\("\/dashboard\/ga\/house-rental"\)/);
});

test('Components: verify app-sidebar icons for groups 6, 7, and 8', () => {
  const appSidebarSource = fs.readFileSync(path.join(process.cwd(), 'components/app-sidebar.tsx'), 'utf8');

  // Verify icon mappings
  assert.match(appSidebarSource, /"heart-pulse":\s*IconHeartRateMonitor/);
  assert.match(appSidebarSource, /"message-square":\s*IconMessage/);
  assert.match(appSidebarSource, /pencil:\s*IconPencil/);
  assert.match(appSidebarSource, /home:\s*IconHome/);
});

test('New page: List Kegiatan Olahraga page exists with Hero components', () => {
  const pagePath = path.join(process.cwd(), 'app/dashboard/hc/olahraga/page.tsx');
  const clientPagePath = path.join(process.cwd(), 'app/dashboard/hc/olahraga/client-page.tsx');

  assert.ok(fs.existsSync(pagePath), 'app/dashboard/hc/olahraga/page.tsx exists');
  assert.ok(fs.existsSync(clientPagePath), 'app/dashboard/hc/olahraga/client-page.tsx exists');

  const clientPageSource = fs.readFileSync(clientPagePath, 'utf8');
  assert.match(clientPageSource, /HeroDataTable/);
  assert.match(clientPageSource, /HeroKpiCard/);
  assert.match(clientPageSource, /HeroStatusBadge/);
  assert.match(clientPageSource, /HeroFormDialog/);
});

test('Legacy groups purged: No Data & Akses Karyawan, Layanan & Personalia, General Affairs (GA), or Kinerja & KPI in HRGA seeds', () => {
  const heroAdminSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8');
  const sidebarModeSource = fs.readFileSync(path.join(process.cwd(), 'lib/sidebar-mode.ts'), 'utf8');

  // Verify User Management moved to Pengaturan
  assert.match(heroAdminSource, /section:\s*'Pengaturan'[\s\S]*?title:\s*'User Management'/);

  // In sidebarMode classifyItem, legacy groups are NOT present under HRGA
  assert.doesNotMatch(sidebarModeSource, /groupLabel:\s*"Data & Akses Karyawan"/);
  assert.doesNotMatch(sidebarModeSource, /groupLabel:\s*"Layanan & Personalia"/);
  assert.doesNotMatch(sidebarModeSource, /groupLabel:\s*"General Affairs \(GA\)"/);
  assert.doesNotMatch(sidebarModeSource, /groupLabel:\s*"Kinerja & KPI"/);
});

