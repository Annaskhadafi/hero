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

test('verifies Revisi Summary APD can be edited directly via Edit button and resubmitted without deleting', async ({
  app,
  screen,
  browser,
}) => {
  let summaryId: number | null = null;

  try {
    // 1. Seed a real Summary APD and send it to 'revisi'
    const seeded = runHelper<{ summaryId: number; summaryNumber: string }>('seed-revisi');
    summaryId = seeded.summaryId;
    const summaryNum = seeded.summaryNumber;

    // 2. Login and verify List view shows Perlu Revisi + Edit button
    await loginToHero(app, screen, browser, '/dashboard/summary');
    const revisiListRow = browser.locator(`tr:has-text("${summaryNum}")`).first();
    await expect(revisiListRow).toBeVisible({ timeout: 30000 });
    await expect(browser.locator(`tr:has-text("${summaryNum}"):has-text("Perlu Revisi")`).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(browser.locator(`tr:has-text("${summaryNum}") button:has-text("Edit")`).first()).toBeVisible({
      timeout: 15000,
    });

    await app.screenshot('01-revisi-summary-list-edit-button');

    // 3. Open Preview page -> verify Revision banner, Edit button, and Tanda Tangan & Submit Ulang button
    await app.open(`/dashboard/summary?preview=${summaryId}`);
    await expect(browser.locator('text=Dokumen Summary Memerlukan Revisi').first()).toBeVisible({ timeout: 25000 });
    await expect(browser.locator('text=Mohon hapus Apron dan perbaiki Remarks').first()).toBeVisible({
      timeout: 15000,
    });

    const previewEditBtn = browser.locator('button:has-text("Edit")').first();
    const resubmitBtn = browser.locator('button:has-text("Tanda Tangan & Submit Ulang")').first();
    await expect(previewEditBtn).toBeVisible({ timeout: 15000 });
    await expect(resubmitBtn).toBeVisible({ timeout: 15000 });

    await app.screenshot('02-revisi-preview-edit-and-resubmit-buttons');

    // 4. Click Edit directly from Preview -> uncheck Apron & update Remarks -> Simpan Perubahan
    await previewEditBtn.click();
    await expect(browser.locator('text=Edit Summary APD').first()).toBeVisible({ timeout: 15000 });
    await expect(browser.locator('tr:has-text("APD-2026-0174")').first()).toBeVisible({ timeout: 20000 });

    const apronCb = browser
      .locator('tr:has-text("APD-2026-0174") label:has-text("Apron") input[type="checkbox"]')
      .first();
    await expect(apronCb).toBeChecked();
    await apronCb.click();
    await expect(apronCb).not.toBeChecked();

    const remarksInput = browser
      .locator('tr:has-text("APD-2026-0174") input[placeholder*="Tulis keterangan"]')
      .first();
    await remarksInput.fill('Revisi selesai: tanpa Apron');

    await browser.locator('button:has-text("Simpan Perubahan")').first().click();

    // 5. Verify Preview updates in-place (same summaryNumber, still Perlu Revisi with banner + Tanda Tangan & Submit Ulang)
    await expect(browser.locator('text=Edit Summary APD')).toHaveCount(0, { timeout: 25000 });
    await expect(browser.locator('text=Revisi selesai: tanpa Apron').first()).toBeVisible({ timeout: 20000 });
    await expect(browser.locator('text=Dokumen Summary Memerlukan Revisi').first()).toBeVisible({ timeout: 15000 });
    await expect(resubmitBtn).toBeVisible({ timeout: 15000 });

    const inspected = runHelper<{ rows: Array<{ apdRequestId: number; itemName: string }> }>(
      'inspect-items',
      summaryId
    );
    const itemNames = inspected.rows.filter((r) => r.apdRequestId === 277).map((r) => r.itemName);
    expect(itemNames).not.toContain('Apron');
    expect(itemNames).toContain('Safety Shoes');

    await app.screenshot('03-revisi-preview-updated-after-edit');

    // 6. Click Tanda Tangan & Submit Ulang -> sign & submit -> verify status transitions to Menunggu Approval
    await resubmitBtn.click();
    await expect(browser.locator('h3:has-text("Tanda Tangan & Submit")').first()).toBeVisible({ timeout: 15000 });

    const submitDocBtn = browser.locator('button:has-text("Submit Dokumen")').first();
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (await submitDocBtn.isDisabled()) {
      const canvas = browser.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 10000 });
      const box = await canvas.boundingBox();
      if (box) {
        await browser.mouse.move(box.x + 30, box.y + box.height / 2);
        await browser.mouse.down();
        await browser.mouse.move(box.x + 140, box.y + box.height / 2 + 12);
        await browser.mouse.up();
      }
    }

    await expect(submitDocBtn).toBeEnabled({ timeout: 10000 });
    await submitDocBtn.click();

    // Verify back on list and same summaryNumber is now Menunggu Approval
    await expect(browser.locator(`tr:has-text("${summaryNum}"):has-text("Menunggu Approval")`).first()).toBeVisible({
      timeout: 30000,
    });

    await app.screenshot('04-revisi-resubmitted-to-pending');
  } finally {
    if (summaryId != null) {
      runHelper('cleanup', summaryId);
    }
  }
});

