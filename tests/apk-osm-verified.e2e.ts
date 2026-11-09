import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('capture updated APK OSM mobile screenshots', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser, {
    targetUrl: '/mobile/hse/osm',
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open /mobile/hse/osm directly
  await app.open('/mobile/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Screenshot 1: Mobile APK OSM Home / Dashboard
  await app.screenshot('01-apk-osm-mobile-dashboard');

  // 3. Click Mulai OSM Baru / Plus button to enter Wizard
  const startBtn = browser.locator('button:has-text("Mulai OSM Baru"), button:has-text("New"), button:has(svg.lucide-plus)').first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Next from Step 1 (Team)
  const nextBtn1 = browser.locator('button:has-text("Next"), button:has-text("Lanjut")').first();
  if (await nextBtn1.isVisible()) {
    await nextBtn1.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Next from Step 2 (Location)
  const nextBtn2 = browser.locator('button:has-text("Next"), button:has-text("Lanjut")').first();
  if (await nextBtn2.isVisible()) {
    await nextBtn2.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Screenshot 2: Step 3 Temuan & Photo Upload Area
  await app.screenshot('02-apk-osm-photo-upload-form');
});
