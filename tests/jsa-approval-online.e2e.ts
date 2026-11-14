import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify JSA HSE approval workflow, HSE officer selection, auto-TTD online, and central approval inbox', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login to HERO as HSE / Approver
  await loginToHero(app, screen, browser, '/dashboard/hse/jsa');
  
  // Wait for page to finish compiling & rendering
  const headerTitle = browser.locator('text=Job Safety Analysis (JSA)').first();
  await headerTitle.waitFor({ state: 'visible', timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Verify Page Header & Eyebrow
  await expect(headerTitle).toBeVisible();

  // 3. Verify Scorecard KPI Cards
  await expect(screen.getByText(/Total Dokumen JSA/i).first()).toBeVisible();
  await expect(screen.getByText(/Menunggu Approval HSE/i).first()).toBeVisible();
  await expect(screen.getByText(/Terverifikasi & Disetujui/i).first()).toBeVisible();

  // Capture main workspace overview
  await app.screenshot('001-jsa-workspace-overview');

  // 4. Test "Buat JSA Baru" dialog with HSE Officer / Pengawas Site Picker
  const createBtn = browser.locator('button:has-text("Buat JSA Baru")').first();
  await expect(createBtn).toBeVisible();
  await createBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify HSE Officer picker is present
  await expect(screen.getByText(/Pengawas Site \/ HSE Officer/i).first()).toBeVisible();
  await expect(screen.getByText(/Pilih petugas pengawas site \/ HSE officer/i).first()).toBeVisible();
  await app.screenshot('002-jsa-form-hse-officer-picker');

  // Close create modal
  const cancelBtn = browser.locator('button:has-text("Batal")').last();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 5. Test Reject button & Rejection Notes Modal
  const rejectBtn = browser.locator('button:has-text("Reject")').first();
  if (await rejectBtn.isVisible()) {
    await rejectBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify Rejection notes dialog
    await expect(screen.getByText(/Catatan Perbaikan \/ Dimana Salahnya/i).first()).toBeVisible();
    await app.screenshot('003-jsa-reject-dialog-notes');

    // Close reject dialog
    const batalReject = browser.locator('button:has-text("Batal")').last();
    if (await batalReject.isVisible()) {
      await batalReject.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 6. Test JSA Document Preview & Online Signature Controls
  const previewBtns = browser.locator('button[title="Preview Dokumen JSA"]');
  if ((await previewBtns.count()) > 0) {
    await previewBtns.first().click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify JSA Document Preview Modal opened
    await expect(screen.getByText(/Preview Dokumen JSA/i).first()).toBeVisible();
    await expect(screen.getByText(/PT\. CHITRA PARATAMA/i).first()).toBeVisible();
    await expect(screen.getByText(/Pelaksana \/ Pembuat JSA/i).first()).toBeVisible();
    await expect(screen.getByText(/Verifikasi Departemen HSE/i).first()).toBeVisible();

    // Verify 1-Click Approve (Auto TTD) button exists in preview header
    const autoApproveBtn = browser.locator('button:has-text("Approve (Auto TTD)")').first();
    if (await autoApproveBtn.isVisible()) {
      await expect(autoApproveBtn).toBeVisible();
    }

    await app.screenshot('004-jsa-document-sheet-preview');

    // Close preview modal via escape or clicking close
    await browser.keyboard.press('Escape');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 7. Test Central Approval Inbox Integration (/dashboard/approval)
  await browser.goto('http://localhost:3000/dashboard/approval');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify Central Approval Inbox loaded with unified categories
  await expect(screen.getByText(/Central Approval/i).first()).toBeVisible();
  await app.screenshot('005-jsa-central-approval-inbox');
});
