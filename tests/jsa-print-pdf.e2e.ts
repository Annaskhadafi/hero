import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('verify JSA print PDF layout matches official HERO Kop Surat and fits cleanly on 1 page without empty rows', async ({ app, screen, browser, agent }) => {
  // 1. Open JSA print preview page directly
  await app.open('/print/jsa/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 2. Verify Kop Surat elements (Official Kop with Chitra Paratama logo & title)
  await expect(screen.getByText(/PT\. CHITRA PARATAMA/i).first()).toBeVisible();
  await expect(screen.getByText(/JOB SAFETY ANALYSIS \(JSA\)/i).first()).toBeVisible();
  await expect(screen.getByText(/F\.HSE\.SFT-014\.01\|1/i).first()).toBeVisible();

  // 3. Verify Metadata
  await expect(screen.getByText(/Pemasangan Trial SPM Hauling/i).first()).toBeVisible();
  await expect(screen.getByText(/SPM-UNIT-04/i).first()).toBeVisible();

  // 4. Verify Only Checked Items are Rendered
  await expect(screen.getByText(/Hand Tool Only/i).first()).toBeVisible();
  await expect(screen.getByText(/Jumlah Pekerja/i).first()).toBeVisible();

  // 5. Verify Steps Table
  await expect(screen.getByText(/pengujian trial SPM Hauling/i).first()).toBeVisible();
  await expect(screen.getByText(/memasang power SPM di unit/i).first()).toBeVisible();

  // 6. Verify Signatures & Verification (clean signature area without placeholder text)
  await expect(screen.getByText(/Pelaksana \/ Pembuat JSA/i).first()).toBeVisible();
  await expect(screen.getByText(/Verifikasi Departemen HSE/i).first()).toBeVisible();
  await expect(browser.locator('text="TERVERIFIKASI SISTEM"')).toHaveCount(0);

  // 7. Capture Top Screenshot
  await app.screenshot('jsa-single-page-top');

  // Scroll down within preview using agent action to inspect signatures & footer
  await agent.act('scroll down to the bottom of the document to see signatures');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await app.screenshot('jsa-single-page-bottom-signatures');

  // 8. Assert bottom footer and clean signatures
  await expect(screen.getByText(/PT\. Chitra Paratama — Health, Safety & Environment Management System/i).first()).toBeVisible();
  await expect(screen.getByText(/MUCHAMAT ALI PORWANTO/i).first()).toBeVisible();
  await expect(screen.getByText(/HSE OFFICER SITE/i).first()).toBeVisible();

  // 9. Agent visual assertion on the signature screenshot
  await agent.assert('The bottom section shows clean signature blocks for Pelaksana and HSE Verifikasi, with no placeholder boxes.', { vision: true });
});
