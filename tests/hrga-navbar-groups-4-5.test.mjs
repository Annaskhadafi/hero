import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Group 4: Industrial Relation & Group 5: Learning Development defined in lib/hero-admin.ts', () => {
  const heroAdminSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8');

  // Verify Group 4 in RAW_SIDEBAR_MENU_SEEDS
  assert.match(heroAdminSource, /groupLabel:\s*'Industrial Relation'/);
  assert.match(heroAdminSource, /title:\s*'Corporate Partnership'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/hc\/kerjasama'/);

  // Verify Group 5 in RAW_SIDEBAR_MENU_SEEDS
  assert.match(heroAdminSource, /groupLabel:\s*'Learning Development'/);
  assert.match(heroAdminSource, /title:\s*'List Sertifikasi'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/training-records\?tab=sio'/);
  assert.match(heroAdminSource, /title:\s*'List Training'/);
  assert.match(heroAdminSource, /url:\s*'\/dashboard\/training-records'/);
});

test('Group 4 & 5: classifyItem maps items to HRGA > Industrial Relation and Learning Development in modern mode', async () => {
  const sidebarModeSource = fs.readFileSync(path.join(process.cwd(), 'lib/sidebar-mode.ts'), 'utf8');

  // Verify Group 4 in classifyItem
  assert.match(sidebarModeSource, /url === "\/dashboard\/hc\/kerjasama"/);
  assert.match(sidebarModeSource, /groupLabel:\s*"Industrial Relation"/);

  // Verify Group 5 in classifyItem
  assert.match(sidebarModeSource, /url === "\/dashboard\/training-records\?tab=sio"/);
  assert.match(sidebarModeSource, /groupLabel:\s*"Learning Development"/);
});

test('Components: icon and active state handling for Group 4 and Group 5', () => {
  const appSidebarSource = fs.readFileSync(path.join(process.cwd(), 'components/app-sidebar.tsx'), 'utf8');
  const navMainSource = fs.readFileSync(path.join(process.cwd(), 'components/nav-main.tsx'), 'utf8');

  // Verify handshake icon
  assert.match(appSidebarSource, /handshake:\s*IconHeartHandshake/);

  // Verify query tab check in nav-main and app-sidebar
  assert.match(navMainSource, /url === "\/dashboard\/training-records"/);
  assert.match(navMainSource, /currentParams\.get\("tab"\) === "sio"/);
  assert.match(appSidebarSource, /url !== "\/dashboard\/training-records" \|\| \(typeof window !== "undefined" && !window\.location\.search\.includes\("tab=sio"\)\)/);
});
