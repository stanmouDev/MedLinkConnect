import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('diagnostic - verify sync wait fixes patient list', async ({ page }) => {
  // STEP 1: Login
  console.log('[TRACE] Starting login...');
  await page.goto(BASE);
  await page.waitForSelector('input[type="text"], input:not([type])', { timeout: 10000 });
  await page.locator('input').first().fill('midwife');
  await page.locator('input[type="password"]').fill('midwife123');
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + '/', { timeout: 10000 });
  console.log('[TRACE] Login complete');
  
  // CRITICAL: Wait for sync
  console.log('[TRACE] Waiting 5 seconds for sync...');
  await page.waitForTimeout(5000);
  console.log('[TRACE] Wait complete');
  
  // STEP 2: Navigate to patients
  await page.goto(`${BASE}/patients`);
  console.log('[TRACE] Patients page loaded, URL:', page.url());
  
  await page.waitForSelector('table', { timeout: 10000 });
  console.log('[TRACE] Table found');
  
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
    
    if (buttons > 0) {
      console.log('[TRACE] Clicking first button...');
      await firstRow.locator('button').first().click();
      console.log('[TRACE] Click succeeded!');
      
      await page.waitForURL(/\/patients\/\d+/, { timeout: 10000 });
      console.log('[TRACE] Navigated to patient, URL:', page.url());
    }
  }
});
