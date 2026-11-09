import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function loginAsMidwife(page: any) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="text"], input:not([type])', { timeout: 10000 });
  await page.locator('input').first().fill('midwife');
  await page.locator('input[type="password"]').fill('midwife123');
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + '/', { timeout: 10000 });
}

async function openFirstPatient(page: any) {
  await page.goto(`${BASE}/patients`);
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(3000);
  const rows = await page.locator('tbody tr').count();
  if (rows > 0) {
    await page.locator('tbody tr').first().locator('button').first().click();
  } else {
    await page.goto(`${BASE}/patients/1`);
  }
  await page.waitForURL(/\/patients\/\d+/, { timeout: 10000 });
}

test.describe('PatientWorkspace maternity tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMidwife(page);
    await openFirstPatient(page);
  });

  test('antenatal tab shows content', async ({ page }) => {
    await page.click('button:has-text("Antenatal")');
    await page.waitForSelector('text=Antenatal Records', { timeout: 5000 });
    await expect(page.locator('text=Antenatal Records')).toBeVisible();
  });

  test('pregnancy tab shows content', async ({ page }) => {
    await page.click('button:has-text("Pregnancy")');
    await page.waitForSelector('text=Current Pregnancy', { timeout: 5000 });
    await expect(page.locator('text=Current Pregnancy')).toBeVisible();
  });

  test('maternal vitals tab shows content', async ({ page }) => {
    await page.click('button:has-text("Maternal Vitals")');
    await page.waitForSelector('text=Maternal Vitals', { timeout: 5000 });
    await expect(page.locator('text=Maternal Vitals')).toBeVisible();
  });

  test('fetal assessment tab shows content', async ({ page }) => {
    await page.click('button:has-text("Fetal Assessment")');
    await page.waitForSelector('text=Fetal Assessments', { timeout: 5000 });
    await expect(page.locator('text=Fetal Assessments')).toBeVisible();
  });

  test('risk assessment tab shows content', async ({ page }) => {
    await page.click('button:has-text("Risk Assessment")');
    await page.waitForSelector('text=Risk Assessment', { timeout: 5000 });
    await expect(page.locator('text=Risk Assessment')).toBeVisible();
  });

  test('labour tab shows content', async ({ page }) => {
    await page.click('button:has-text("Labour")');
    await page.waitForSelector('text=Labour Record', { timeout: 5000 });
    await expect(page.locator('text=Labour Record')).toBeVisible();
  });

  test('delivery tab shows content', async ({ page }) => {
    await page.click('button:has-text("Delivery")');
    await page.waitForSelector('text=Delivery Records', { timeout: 5000 });
    await expect(page.locator('text=Delivery Records')).toBeVisible();
  });

  test('postnatal tab shows content', async ({ page }) => {
    await page.click('button:has-text("Postnatal")');
    await page.waitForSelector('text=Postnatal Records', { timeout: 5000 });
    await expect(page.locator('text=Postnatal Records')).toBeVisible();
  });

  test('newborn tab shows content', async ({ page }) => {
    await page.click('button:has-text("Newborn")');
    await page.waitForSelector('text=Newborn Records', { timeout: 5000 });
    await expect(page.locator('text=Newborn Records')).toBeVisible();
  });
});
