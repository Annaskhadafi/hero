import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('lib/hero-admin.ts restores Request Barang (/dashboard/apd) inside Central Service and keeps it out of obsolete purge lists', () => {
  const heroAdmin = fs.readFileSync(path.resolve('lib/hero-admin.ts'), 'utf8');

  assert.ok(
    heroAdmin.includes("const HERO_GOVERNANCE_SEED_VERSION = 'central-service-apd-request-v1'"),
    'Must bump HERO_GOVERNANCE_SEED_VERSION so existing deployments re-run navbar menu sync'
  );
  assert.ok(
    heroAdmin.includes("title: 'Request Barang'") &&
      heroAdmin.includes("url: '/dashboard/apd'") &&
      heroAdmin.includes("resource: 'apd-request'") &&
      heroAdmin.includes("section: 'Central Service'"),
    'Must register Request Barang (/dashboard/apd, resource apd-request) in Central Service sidebar seeds and upserts'
  );

  const obsoleteBlockMatch = heroAdmin.match(/const obsoleteHrgaResources = \[([\s\S]*?)\]/);
  assert.ok(obsoleteBlockMatch, 'obsoleteHrgaResources block must exist');
  assert.ok(
    !obsoleteBlockMatch[1].includes('apd-request'),
    'obsoleteHrgaResources must NOT delete apd-request'
  );
});

test('lib/sidebar-mode.ts maps /dashboard/apd under Central Service in modern sidebar mode', async () => {
  const { buildModernSidebarGroups } = await import('../lib/sidebar-mode.ts');
  const groups = buildModernSidebarGroups([
    {
      id: 999,
      menuArea: 'main',
      section: 'Central Service',
      groupLabel: 'Management',
      title: 'Request Barang',
      url: '/dashboard/apd',
      iconName: 'shield',
      resource: 'apd-request',
      sortOrder: 2,
      isVisible: true,
    },
  ]);

  const csGroup = groups.find((g) => g.title === 'Central Service');
  assert.ok(csGroup, 'Modern sidebar must include Central Service section');
  assert.equal(csGroup.category, 'DEPARTEMEN');
  assert.ok(
    csGroup.items.some((item) => item.url === '/dashboard/apd' && item.title === 'Request Barang'),
    'Central Service modern group must contain Request Barang (/dashboard/apd)'
  );
});

