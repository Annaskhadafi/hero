import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { execFileSync } from 'node:child_process';
import { loginToHero } from './e2e-auth-helper';

function runSetup<T>(cmd: string, arg?: string | number): T {
  const args = ['tsx', 'tests/summary-apd-vale-e2e-setup.ts', cmd];
  if (arg !== undefined) args.push(String(arg));
  const out = execFileSync('npx', args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const lastLine = out.trim().split(/\r?\n/).filter(Boolean).pop() || '{}';
  return JSON.parse(lastLine) as T;
}

test('verifies Vale Service Operation Summary APD approval flow: Admin -> Junaidi -> Romy Hidayat (no Apriyanto)', async ({
  app,
  screen,
  browser,
}) => {
  let tempSummaryId: number | null = null;

  try {
    // 1. Seed & submit temporary Vale Service Operation Summary APD (sectionId = 33, targetSite = 'VALE')
    const seeded = runSetup<{
      summaryId: number;
      summaryNumber: string;
      submitRes: { success?: boolean };
      approvals: Array<{ level: number; approverEmployeeId: number; status: string }>;
    }>('seed');

    tempSummaryId = seeded.summaryId;
    expect(seeded.submitRes.success).toBe(true);

    const l1Rows = seeded.approvals.filter((a) => a.level === 1);
    const l2Rows = seeded.approvals.filter((a) => a.level === 2);
    expect(l1Rows.length).toBe(1);
    expect(l1Rows[0].approverEmployeeId).toBe(15); // Junaidi
    expect(seeded.approvals.some((a) => a.approverEmployeeId === 955)).toBe(false); // No Apriyanto
    expect(l2Rows.length).toBe(1);
    expect(l2Rows[0].approverEmployeeId).toBe(972); // Romy Hidayat

    // 2. Authenticate and verify Preview UI renders 3 signature columns (Admin -> Junaidi -> Romy Hidayat)
    await loginToHero(app, screen, browser, `/dashboard/summary?preview=${tempSummaryId}`);

    await expect(browser.locator('text=Summary Permintaan Barang Safety').first()).toBeVisible({ timeout: 30000 });
    await expect(browser.locator('text=Junaidi').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('text=Romy Hidayat').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('text=Apriyanto')).toHaveCount(0);
    await expect(browser.locator('text=Section Head Service MVC')).toHaveCount(0);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await app.screenshot('01-summary-apd-vale-preview-3-columns');

    // 3. Verify Print page renders 3 signature columns without Apriyanto
    await app.open(`/print/summary/${tempSummaryId}`);

    await expect(browser.locator('text=Summary Permintaan Barang Safety').first()).toBeVisible({ timeout: 30000 });
    await expect(browser.locator('text=Junaidi').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('text=Romy Hidayat').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('text=Apriyanto')).toHaveCount(0);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await app.screenshot('02-summary-apd-vale-print-3-columns');

    // 4. Approve Level 1 (Junaidi) -> immediately advances to Romy Hidayat (Level 2) -> completes approval
    const flowRes = runSetup<{
      l1: { level1Complete?: boolean; allApproved?: boolean };
      l2: { allApproved?: boolean };
    }>('approve-flow', tempSummaryId);
    expect(flowRes.l1.level1Complete).toBe(true);
    expect(flowRes.l1.allApproved).toBe(false);
    expect(flowRes.l2.allApproved).toBe(true);

    // Verify approved state in UI preview
    await app.open(`/dashboard/summary?preview=${tempSummaryId}`);
    await expect(browser.locator('text=Disetujui (Approved)').first()).toBeVisible({ timeout: 25000 });
    await expect(browser.locator('text=Junaidi').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('text=Romy Hidayat').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('text=Apriyanto')).toHaveCount(0);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await app.screenshot('03-summary-apd-vale-approved-3-columns');

    // 5. Regression check: Gabungan Service Operation (SUM-004, id 71) still includes Apriyanto + Junaidi + Romy Hidayat
    await app.open('/dashboard/summary?preview=71');
    await expect(browser.locator('text=Apriyanto').first()).toBeVisible({ timeout: 25000 });
    await expect(browser.locator('text=Junaidi').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('text=Romy Hidayat').first()).toBeVisible({ timeout: 15000 });
    await new Promise((resolve) => setTimeout(resolve, 500));

    await app.screenshot('04-summary-apd-gabungan-still-4-columns');
  } finally {
    if (tempSummaryId != null) {
      runSetup('cleanup', tempSummaryId);
    }
  }
});
