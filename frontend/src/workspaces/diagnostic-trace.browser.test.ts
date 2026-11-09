import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('diagnostic - trace existing test flow', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForSelector('input[type="text"], input:not([type])', { timeout: 10000 });
  await page.locator('input').first().fill('midwife');
  await page.locator('input[type="password"]').fill('midwife123');
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + '/', { timeout: 10000 });
  
  await page.waitForTimeout(4000);
  await page.goto(`${BASE}/patients`);
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(3000);
  
  const rows = await page.locator('tbody tr').count();
  console.log('Table rows:', rows);
  
  if (rows > 0) {
    const firstRow = page.locator('tbody tr').first();
    const buttons = await firstRow.locator('button').count();
    console.log('Buttons in first row:', buttons);
    
    for (let i = 0; i < buttons; i++) {
      const btn = firstRow.locator('button').nth(i);
      const text = await btn.innerText();
      console.log(`Button ${i}: ${text.trim()}`);
    }
    
    // Click the first button
    console.log('Clicking first button...');
    await firstRow.locator('button').first().click();
    console.log('Clicked. Current URL:', page.url());
    
    await page.waitForURL(/\/patients\/\d+/, { timeout: 10000 });
    console.log('Navigated to patient page');
    
    await page.waitForTimeout(2000);
    
    // Try clicking Antenatal tab
    const antenatalBtn = page.locator('button:has-text("Antenatal")');
    const count = await antenatalBtn.count();
    console.log('Antenatal buttons found:', count);
    
    if (count > 0) {
      await antenatalBtn.first().click();
      console.log('Clicked Antenatal tab');
      await page.waitForTimeout(1000);
      console.log('URL after click:', page.url());
    }
  }
});
