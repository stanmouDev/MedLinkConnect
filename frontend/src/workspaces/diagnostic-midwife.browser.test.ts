import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('diagnostic - midwife patient workspace tabs', async ({ page }) => {
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
    await page.locator('tbody tr').first().locator('button').first().click();
    await page.waitForURL(/\/patients\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Find all buttons
    const buttons = await page.locator('button').all();
    console.log('Button count:', buttons.length);
    
    for (let i = 0; i < Math.min(buttons.length, 30); i++) {
      const text = await buttons[i].innerText();
      if (text.trim()) {
        console.log(`Button ${i}: ${text.trim()}`);
      }
    }
  }
});
