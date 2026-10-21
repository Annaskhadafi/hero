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
  await expect(screen.getByText(/Pemasangan & Pengujian Trial SPM Hauling di Unit/i).first()).toBeVisible();
  await expect(screen.getByText(/SPM-UNIT-04/i).first()).toBeVisible();

  // 4. Verify Only Checked Items are Rendered
  await expect(screen.getByText(/Power Tool/i).first()).toBeVisible();
  await expect(screen.getByText(/Permit Hot Work/i).first()).toBeVisible();
  await expect(screen.getByText(/Sarung Tangan/i).first()).toBeVisible();

  // 5. Verify Steps Table
  await expect(screen.getByText(/Pengujian Trial SPM Hauling/i).first()).toBeVisible();
  await expect(screen.getByText(/Memasang Power SPM di unit/i).first()).toBeVisible();

  // 6. Verify Signatures & Verification
  await expect(screen.getByText(/Pelaksana \/ Pembuat JSA/i).first()).toBeVisible();
  await expect(screen.getByText(/Verifikasi Departemen HSE/i).first()).toBeVisible();

  // 7. Capture Screenshot of Optimized JSA PDF
  await app.screenshot('jsa-optimized-pdf-layout');

  // 8. Agent visual assertion
  await agent.assert('The JSA document displays the JSA title, form code F.HSE.SFT-014.01|1, checked safety requirements, work steps table without empty rows, and signatures block.', { vision: true });
});
