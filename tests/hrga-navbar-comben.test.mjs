import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Group 3: Compensation & Benefit defined in lib/hero-admin.ts', () => {
  const heroAdminSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8');

  // Verify Group 3 items in RAW_SIDEBAR_MENU_SEEDS
  assert.match(heroAdminSource, /groupLabel:\s*'Compensation & Benefit'/);
  assert.match(heroAdminSource, /title:\s*'Payroll'/);
  assert.match(heroAdminSource, /title:\s*'Allowance'/);
  assert.match(heroAdminSource, /resource:\s*'hrga_payroll'/);
});

test('Group 3: classifyItem maps Group 3 items to HRGA > Compensation & Benefit in modern mode', async () => {
  const sidebarModeSource = fs.readFileSync(path.join(process.cwd(), 'lib/sidebar-mode.ts'), 'utf8');

  // Verify Payroll and Allowance in classifyItem
  assert.match(sidebarModeSource, /url === "\/dashboard\/scheduling-timesheet\/payroll" && item\.section === "HRGA"/);
  assert.match(sidebarModeSource, /url === "\/dashboard\/hc\/compensation"/);
  assert.match(sidebarModeSource, /groupLabel:\s*"Compensation & Benefit"/);
});
