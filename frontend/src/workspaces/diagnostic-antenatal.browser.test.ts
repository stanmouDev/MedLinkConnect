import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('diagnostic - check antenatal button', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForSelector('input[type="text"], input:not([type])', { timeout: 10000 });
  await page.locator('input').first().fill('midwife');
  await page.locator('input[type="password"]').fill('midwife123');
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + '/', { timeout: 10000 });
  
  await page.waitForTimeout(4000);
  await page.goto(`${BASE}/patients/1`);
  await page.waitForURL(/\/patients\/\d+/, { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // Find buttons with Antenatal text
  const antenatalButtons = page.locator('button:has-text("Antenatal")');
  const count = await antenatalButtons.count();
  console.log('Antenatal buttons:', count);
  
  for (let i = 0; i < count; i++) {
    const btn = antenatalButtons.nth(i);
    const text = await btn.innerText();
    const classes = await btn.getAttribute('class');
    console.log(`Button ${i}: text="${text}", classes=${classes}`);
  }
});
