import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('MAESTRO actual customer login', { timeout: 600000 }, async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 2240, height: 1260 });
  await app.open('/login?callbackUrl=%2Ftickets');
  await expect(screen.getByLabel('Email', { exact: true })).toBeVisible({ timeout: 120000 });
  await screen.getByLabel('Email', { exact: true }).fill(credentials.user('maestro').username);
  await screen.getByLabel('Kata Sandi', { exact: true }).fill(credentials.user('maestro').password);
  await screen.getByRole('button', { name: 'Masuk ke MAESTRO' }).click();
  await expect(screen.getByRole('heading', { name: 'Helpdesk & Problem Ticketing' })).toBeVisible({ timeout: 120000 });
});

test('MAESTRO feature screenshots for presentation', { timeout: 600000 }, async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 2240, height: 1260 });
  // Documented E2E cookie-session setup keeps screenshot pixels safe; no password field is filled in this attempt.
  await browser.setCookies([{ name: 'maestro_session_token', value: process.env.MAESTRO_CAPTURE_SESSION!, domain: 'maestro.localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  await browser.setCookies([{ name: 'sidebar_state', value: 'true', domain: 'maestro.localhost', path: '/' }]);

  const pages = [
    ['/tickets', 'Helpdesk & Problem Ticketing', '02-customer-support'],
    ['/activity', 'Monitoring Daily Activity Seluruh Karyawan', '03-daily-activity'],
    ['/safety', 'Safety Management & PTW', '04-safety-ptw'],
    ['/scrap', 'Tire Scrap Performance', '05-tire-scrap'],
    ['/tire-check', null, '06-tire-check'],
    ['/tracking', 'PO & Cargo Tracking', '07-po-cargo-tracking'],
  ] as const;
  const failures: string[] = [];
  for (const [route, heading, label] of pages) {
    try {
      console.log('Capturing route:', route);
      await app.open(route);
      if (heading) await expect(screen.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 120000 });
      else await expect(browser.locator('text=Total Tire Checked').first()).toBeVisible({ timeout: 120000 });
      await browser.evaluate(async () => {
        await document.fonts.ready;
        for (const animation of document.getAnimations()) { try { animation.finish(); } catch { /* Infinite animation stays unchanged. */ } }
      });
      if (route === '/scrap') await expect(browser.locator('.recharts-sector').first()).toBeVisible({ timeout: 30000 });
      await app.screenshot(`maestro-${label}`);
      if (route === '/tickets') {
        await screen.getByRole('button', { name: 'Buat Tiket Baru' }).click();
        await expect(screen.getByRole('dialog')).toBeVisible();
        await screen.getByPlaceholder('Misal: Kerusakan sidewall ban unit DT-014 di Pit B').fill('Contoh pengaduan pemeriksaan ban unit');
        await screen.getByPlaceholder('Tuliskan kronologi, nomor seri ban/unit, lokasi spesifik, atau informasi penting lainnya...').fill('Contoh formulir bantuan: jelaskan kendala, lokasi, serta tindak lanjut yang dibutuhkan.');
        await browser.evaluate(async () => {
          for (const animation of document.getAnimations()) { try { animation.finish(); } catch { /* Infinite animation stays unchanged. */ } }
        });
        await app.screenshot('maestro-08-ticket-form');
        await browser.keyboard.press('Escape');
      }
    } catch (error) {
      await app.screenshot(`maestro-error-${label}`);
      failures.push(`${route}: ${String(error)}`);
    }
  }
  expect(failures).toEqual([]);
});
