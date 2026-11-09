import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('diagnostic - exact test flow trace', async ({ page }) => {
  // STEP 1: Login
  console.log('[TRACE] Starting login...');
  await page.goto(BASE);
  console.log('[TRACE] page.goto done, URL:', page.url());
  
  await page.waitForSelector('input[type="text"], input:not([type])', { timeout: 10000 });
  console.log('[TRACE] Username input found');
  
  await page.locator('input').first().fill('midwife');
  console.log('[TRACE] Username filled');
  
  await page.locator('input[type="password"]').fill('midwife123');
  console.log('[TRACE] Password filled');
  
  await page.click('button[type="submit"]');
  console.log('[TRACE] Submit clicked');
  
  await page.waitForURL(BASE + '/', { timeout: 10000 });
  console.log('[TRACE] Navigated to home, URL:', page.url());
  
  // STEP 2: Navigate to patients
  console.log('[TRACE] Navigating to patients...');
  await page.goto(`${BASE}/patients`);
  console.log('[TRACE] Patients page loaded, URL:', page.url());
  
  await page.waitForSelector('table', { timeout: 10000 });
  console.log('[TRACE] Table found');
  
  await page.waitForTimeout(3000);
  console.log('[TRACE] Waited 3 seconds');
  
  const rows = await page.locator('tbody tr').count();
  console.log('[TRACE] Row count:', rows);
  
  if (rows > 0) {
    const firstRow = page.locator('tbody tr').first();
    const buttons = await firstRow.locator('button').count();
    console.log('[TRACE] Buttons in first row:', buttons);
    
    for (let i = 0; i < buttons; i++) {
      const btn = firstRow.locator('button').nth(i);
      const text = await btn.innerText();
      console.log(`[TRACE] Button ${i}: ${text.trim()}`);
    }
    
    console.log('[TRACE] About to click first button...');
    const btn = firstRow.locator('button').first();
    console.log('[TRACE] Button visible:', await btn.isVisible());
    console.log('[TRACE] Button enabled:', await btn.isEnabled());
    
    await btn.click();
    console.log('[TRACE] Click succeeded!');
    
    await page.waitForURL(/\/patients\/\d+/, { timeout: 10000 });
    console.log('[TRACE] Navigated to patient, URL:', page.url());
  }
});
