import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('app/dashboard/quality/5r/actions.ts exports getFiveRAnalyticsAction with full metric computations', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/quality/5r/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(content.includes('export async function getFiveRAnalyticsAction'), 'Must export getFiveRAnalyticsAction');
  assert.ok(content.includes('scoreRapi'), 'Must calculate Rapi score');
  assert.ok(content.includes('scoreRingkas'), 'Must calculate Ringkas score');
  assert.ok(content.includes('scoreResik'), 'Must calculate Resik score');
  assert.ok(content.includes('scoreRawat'), 'Must calculate Rawat score');
  assert.ok(content.includes('scoreRajin'), 'Must calculate Rajin score');
  assert.ok(content.includes('areaMatrix'), 'Must generate Area Matrix');
  assert.ok(content.includes('topAreas'), 'Must calculate Top Areas');
  assert.ok(content.includes('needsAttention'), 'Must calculate areas needing attention');
  assert.ok(content.includes('complianceRate'), 'Must compute compliance rate');
});

test('components/five-r/five-r-analytics-dashboard.tsx contains full executive dashboard, matrix components, and Pie Charts', () => {
  const dashboardPath = path.join(process.cwd(), 'components/five-r/five-r-analytics-dashboard.tsx');
  assert.ok(fs.existsSync(dashboardPath), 'Dashboard component must exist');

  const content = fs.readFileSync(dashboardPath, 'utf8');
  assert.ok(content.includes('getFiveRAnalyticsAction'), 'Must call getFiveRAnalyticsAction');
  assert.ok(content.includes('Matriks Skor Bulanan Area 5R'), 'Must render matrix table header');
  assert.ok(content.includes('XLSX.writeFile'), 'Must have Excel export');
  assert.ok(content.includes('FiveRDetailDialog'), 'Must allow drill-down dialog on clicking matrix cells');
  assert.ok(content.includes('Ringkas'), 'Must render 5 pilar breakdown');
  assert.ok(content.includes('Top 5 Area Berkinerja Terbaik'), 'Must render top areas leaderboard');
  assert.ok(content.includes('Area Perlu Perhatian'), 'Must render attention areas list');
  assert.ok(content.includes('Proporsi Skor Kategori 5R'), 'Must render 5 Pillars Pie Chart');
  assert.ok(content.includes('Proporsi Grade Mutu Audit'), 'Must render Grade Distribution Pie Chart');
  assert.ok(content.includes('Tahun Berjalan'), 'Must label current year as Tahun Berjalan');
});

test('components/five-r/five-r-list.tsx integrates Tabs switcher for Reports and Analytics', () => {
  const listPath = path.join(process.cwd(), 'components/five-r/five-r-list.tsx');
  const content = fs.readFileSync(listPath, 'utf8');

  assert.ok(content.includes('FiveRAnalyticsDashboard'), 'Must import FiveRAnalyticsDashboard');
  assert.ok(content.includes("activeTab === 'analytics'"), 'Must have activeTab condition');
  assert.ok(content.includes('Dashboard Analitik & Matriks'), 'Must render tab label');
});

test('components/mobile/mobile-five-r-client.tsx integrates Segmented Tab for Mobile Analytics', () => {
  const mobilePath = path.join(process.cwd(), 'components/mobile/mobile-five-r-client.tsx');
  const content = fs.readFileSync(mobilePath, 'utf8');

  assert.ok(content.includes('FiveRAnalyticsDashboard'), 'Must import FiveRAnalyticsDashboard');
  assert.ok(content.includes("activeTab === 'analytics'"), 'Must have activeTab condition');
  assert.ok(content.includes('Dashboard & Matriks'), 'Must render mobile tab label');
});
