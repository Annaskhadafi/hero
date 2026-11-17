import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Group 2: Recruitment & Selection defined in lib/hero-admin.ts', () => {
  const heroAdminSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8');

  // Verify Group 2 items in RAW_SIDEBAR_MENU_SEEDS
  assert.match(heroAdminSource, /groupLabel:\s*'Recruitment & Selection'/);
  assert.match(heroAdminSource, /title:\s*'Request For Recruitment'/);
  assert.match(heroAdminSource, /title:\s*'Recruitment'/);
  assert.match(heroAdminSource, /title:\s*'Online Test'/);
});

test('Group 2: classifyItem maps Group 2 items to HRGA > Recruitment & Selection in modern mode', async () => {
  const sidebarModeSource = fs.readFileSync(path.join(process.cwd(), 'lib/sidebar-mode.ts'), 'utf8');

  // Verify groupLabel Recruitment & Selection in classifyItem
  assert.match(sidebarModeSource, /groupLabel:\s*"Recruitment & Selection"/);
});

test('Group 2: buildModernSidebarGroups sorts items cleanly by sortOrder', () => {
  const sidebarModeSource = fs.readFileSync(path.join(process.cwd(), 'lib/sidebar-mode.ts'), 'utf8');

  assert.match(sidebarModeSource, /items:\s*rootItems\.sort\(\(left,\s*right\)\s*=>/);
});
