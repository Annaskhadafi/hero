import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';
import path from 'path';
import fs from 'fs';

test('verifies manual APD request photo upload, validation, and table indicator in Summary APD', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and navigate to /dashboard/summary
  await loginToHero(app, screen, browser, '/dashboard/summary');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await app.open('/dashboard/summary');

  // Wait for initial page loading to resolve
  const titleElem = browser.locator('h1, h2, h3:has-text("Summary")').first();
  await expect(titleElem).toBeVisible({ timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Screenshot 1: Summary APD Dashboard
  await app.screenshot('01-summary-apd-dashboard');

  // 2. Click "Buat Summary" or "Generate" button on the first available section card
  const generateBtn = browser.locator('button:has-text("Buat Summary"), button:has-text("Generate")').first();
  await expect(generateBtn).toBeVisible({ timeout: 20000 });
  await generateBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 3. Click "+ Tambah Karyawan Manual" button
  const addManualBtn = browser.locator('button:has-text("Tambah Karyawan Manual")').first();
  await expect(addManualBtn).toBeVisible({ timeout: 15000 });
  await addManualBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 4. Select an employee from the available employee list (e.g. Abd.Rajab)
  const empOption = browser.locator('text=Abd.Rajab').first();
  await expect(empOption).toBeVisible({ timeout: 10000 });
  await empOption.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify that "Foto Bukti Fisik APD" label and upload triggers are visible
  const photoSectionLabel = browser.locator('text=Foto Bukti Fisik APD').first();
  await expect(photoSectionLabel).toBeVisible({ timeout: 10000 });

  // Screenshot 2: Manual APD Form with Photo Upload Section (Kamera & Pilih File)
  await app.screenshot('02-summary-apd-manual-form-photo-upload');

  // 5. Test validation: Click "Tambahkan ke Tabel" without uploading photo
  const addToTableBtn = browser.locator('button:has-text("Tambahkan ke Tabel")').first();
  await expect(addToTableBtn).toBeEnabled({ timeout: 10000 });
  await addToTableBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Screenshot 3: Validation toast requirement
  await app.screenshot('03-summary-apd-manual-photo-validation');

  // 6. Upload a sample photo to fulfill the requirement
  const sampleImagePath = path.join(process.cwd(), 'sample-evidence.jpg');
  if (!fs.existsSync(sampleImagePath)) {
    // Minimal valid JPEG binary buffer
    const minimalJpg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
      0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
      0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
      0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x00, 0xff, 0xd9,
    ]);
    fs.writeFileSync(sampleImagePath, minimalJpg);
  }

  const fileInput = browser.locator('input[type="file"][accept*="image"]').first();
  await fileInput.setInputFiles(sampleImagePath);
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Screenshot 4: Manual Form with Photo Thumbnail and "1 Foto Terlampir"
  await app.screenshot('04-summary-apd-manual-photo-attached');

  // 7. Click "Tambahkan ke Tabel" now that photo is attached
  await addToTableBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Screenshot 5: Summary Table with Manual row and Photo Evidence indicator
  await app.screenshot('05-summary-apd-table-with-photo-badge');

  // Cleanup sample file
  if (fs.existsSync(sampleImagePath)) {
    try {
      fs.unlinkSync(sampleImagePath);
    } catch {}
  }
});
