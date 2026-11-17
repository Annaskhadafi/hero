import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { execFileSync } from 'node:child_process';
import { loginToHero } from './e2e-auth-helper';

function runHelper<T>(cmd: string, summaryId?: number): T {
  const args = ['tsx', 'tests/summary-apd-vale-e2e-setup.ts', cmd];
  if (summaryId !== undefined) args.push(String(summaryId));
  const out = execFileSync('npx', args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const lastLine = out.trim().split(/\r?\n/).filter(Boolean).pop() || '{}';
  return JSON.parse(lastLine) as T;
}

test('allows Admin to choose approved APD items per request in Generate Summary and Edit Summary', async ({
  app,
  screen,
  browser,
}) => {
  let createdSummaryId: number | null = null;

  try {
    // 1. Login and navigate to /dashboard/summary
    await loginToHero(app, screen, browser, '/dashboard/summary');

    // 2. Open Generate Summary modal for Service Operation (Vale) which has APD-2026-0174 (4 items)
    const buatSummaryBtn = browser
      .locator('tr:has-text("Service Operation"):has-text("Vale") button:has-text("Buat Summary")')
      .first();
    await expect(buatSummaryBtn).toBeVisible({ timeout: 30000 });
    await buatSummaryBtn.click();

    await expect(browser.locator('text=Generate Summary APD').first()).toBeVisible({ timeout: 15000 });
    const req277Row = browser.locator('tr:has-text("APD-2026-0174")').first();
    await expect(req277Row).toBeVisible({ timeout: 20000 });

    // 3. Uncheck Apron & Safety Shoes on APD-2026-0174 so only 2 of 4 items are ACC'd
    const apronCheckbox = browser
      .locator('tr:has-text("APD-2026-0174") label:has-text("Apron") input[type="checkbox"]')
      .first();
    const shoesCheckbox = browser
      .locator('tr:has-text("APD-2026-0174") label:has-text("Safety Shoes") input[type="checkbox"]')
      .first();
    await expect(apronCheckbox).toBeChecked();
    await expect(shoesCheckbox).toBeChecked();

    await apronCheckbox.click();
    await shoesCheckbox.click();

    await expect(apronCheckbox).not.toBeChecked();
    await expect(shoesCheckbox).not.toBeChecked();
    await expect(browser.locator('tr:has-text("APD-2026-0174"):has-text("2/4 item di-ACC")').first()).toBeVisible({
      timeout: 10000,
    });
    // Live breakdown card updates from 336 items -> 334 items
    await expect(browser.locator('text=Total 334 Item').first()).toBeVisible({ timeout: 10000 });

    await app.screenshot('01-generate-modal-per-item-apd-selection');

    // 4. Generate Summary -> verify redirect to preview and inspect persisted items
    await browser.locator('button:has-text("Generate Summary")').first().click();

    await expect(browser.locator('text=Summary Permintaan Barang Safety').first()).toBeVisible({ timeout: 35000 });
    await expect(browser.locator('text=Harni Hamdan').first()).toBeVisible({ timeout: 15000 });

    const latest = runHelper<{ id: number; summaryNumber: string } | null>('latest-draft');
    expect(latest?.id).toBeTruthy();
    createdSummaryId = latest!.id;

    const inspected = runHelper<{ rows: Array<{ apdRequestId: number; itemName: string; quantity: number }> }>(
      'inspect-items',
      createdSummaryId
    );
    const req277Items = inspected.rows.filter((r) => r.apdRequestId === 277).map((r) => r.itemName);
    expect(req277Items).not.toContain('Apron');
    expect(req277Items).not.toContain('Safety Shoes');
    expect(req277Items).not.toContain('Safety Shoes Size');
    expect(req277Items).toContain('Cotton Filter Respirator Honeywell');
    expect(req277Items).toContain('Tudung Kepala / Kupluk (Makatac)');

    await app.screenshot('02-preview-summary-only-acc-items');

    // 5. Return to /dashboard/summary and click Edit on the draft summary -> verify partial item selection is preserved
    await app.open('/dashboard/summary');
    const editBtn = browser
      .locator('tr:has-text("Service Operation"):has-text("Vale"):has-text("Draft") button:has-text("Edit")')
      .first();
    await expect(editBtn).toBeVisible({ timeout: 25000 });
    await editBtn.click();

    await expect(browser.locator('text=Edit Summary APD').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('tr:has-text("APD-2026-0174")').first()).toBeVisible({ timeout: 20000 });

    const editApronCb = browser
      .locator('tr:has-text("APD-2026-0174") label:has-text("Apron") input[type="checkbox"]')
      .first();
    const editShoesCb = browser
      .locator('tr:has-text("APD-2026-0174") label:has-text("Safety Shoes") input[type="checkbox"]')
      .first();
    await expect(editApronCb).not.toBeChecked();
    await expect(editShoesCb).not.toBeChecked();
    await expect(browser.locator('tr:has-text("APD-2026-0174"):has-text("2/4 item di-ACC")').first()).toBeVisible({
      timeout: 10000,
    });

    await app.screenshot('03-edit-summary-preserves-partial-apd-selection');
  } finally {
    if (createdSummaryId != null) {
      runHelper('cleanup', createdSummaryId);
    }
  }
});
