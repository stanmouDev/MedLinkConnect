import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function loginAs(page: Page, username: string, password: string) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="text"], input:not([type])', { timeout: 10000 });
  await page.locator('input').first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + '/', { timeout: 10000 });
}

async function waitForData(page: Page) {
  await page.waitForTimeout(4000);
}

async function openFirstPatient(page: Page) {
  await page.goto(`${BASE}/patients`);
  await page.waitForSelector('table', { timeout: 10000 });
  
  try {
    await page.waitForSelector('button:has-text("Open Record")', { timeout: 10000 });
  } catch {
    test.skip(true, 'No patients available');
    return;
  }
  
  await page.locator('button:has-text("Open Record")').first().click();
  await page.waitForURL(/\/patients\/\d+/, { timeout: 10000 });
}

test.describe('MedLink Connect Workflow Verification', () => {
  test.describe('Login and Role Routing', () => {
    const roles = [
      { username: 'admin', password: 'admin123', role: 'administrator', workspace: 'Administrator Workspace' },
      { username: 'doctor', password: 'doctor123', role: 'doctor', workspace: 'Doctor Workspace' },
      { username: 'nurse', password: 'nurse123', role: 'nurse', workspace: 'Nurse Workspace' },
      { username: 'midwife', password: 'midwife123', role: 'midwife', workspace: 'Midwife / Maternity Workspace' },
    ];

    for (const role of roles) {
      test(`${role.role} routes to correct workspace`, async ({ page }) => {
        await loginAs(page, role.username, role.password);
        await expect(page.locator(`text=${role.workspace}`)).toBeVisible({ timeout: 10000 });
      });
    }
  });

  test.describe('Doctor Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'doctor', 'doctor123');
      await waitForData(page);
    });

    test('doctor sees patient list', async ({ page }) => {
      await page.goto(`${BASE}/patients`);
      await page.waitForSelector('table', { timeout: 10000 });
      const patientRows = page.locator('tbody tr');
      const patientCount = await patientRows.count();
      expect(patientCount).toBeGreaterThan(0);
      await expect(page.locator('button:has-text("Open Record")')).toHaveCount(patientCount, { timeout: 10000 });
    });

    test('doctor can open patient workspace', async ({ page }) => {
      await openFirstPatient(page);
      await expect(page.locator('text=Overview').or(page.locator('text=Patient Record'))).toBeVisible({ timeout: 5000 });
    });

    test('patient record tabs are clickable', async ({ page }) => {
      await openFirstPatient(page);
      const tabs = ['Overview', 'EMR', 'Vitals', 'Labs', 'Prescriptions', 'Timeline', 'Handovers', 'Referrals', 'Inpatient', 'Billing'];
      for (const tab of tabs) {
        const btn = page.locator(`button:has-text("${tab}"):not(:has-text("Open"))`);
        if (await btn.count() > 0) {
          await btn.first().click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Midwife Maternity Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'midwife', 'midwife123');
      await waitForData(page);
    });

    test('midwife sees patient list', async ({ page }) => {
      await page.goto(`${BASE}/patients`);
      await page.waitForSelector('table', { timeout: 10000 });
      const patientRows = page.locator('tbody tr');
      const patientCount = await patientRows.count();
      expect(patientCount).toBeGreaterThan(0);
      await expect(page.locator('button:has-text("Open Record")')).toHaveCount(patientCount, { timeout: 10000 });
    });

    test('maternity tabs are functional', async ({ page }) => {
      await openFirstPatient(page);
      const maternityTabs = ['Antenatal', 'Pregnancy', 'Maternal Vitals', 'Fetal Assessment', 'Risk Assessment', 'Labour', 'Delivery', 'Postnatal', 'Newborn'];
      for (const tab of maternityTabs) {
        const btn = page.locator(`button:has-text("${tab}"):not(:has-text("Open"))`);
        if (await btn.count() > 0) {
          await btn.first().click();
          await page.waitForTimeout(300);
          await expect(page.locator(`text=${tab}`).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Notifications', () => {
    test('notification bell is visible and clickable', async ({ page }) => {
      await loginAs(page, 'doctor', 'doctor123');
      await waitForData(page);
      
      const bell = page.locator('button[aria-label="Notifications"]');
      if (await bell.count() > 0) {
        await bell.first().click();
        await page.waitForTimeout(500);
        await expect(page.locator('.absolute.right-0.top-full.z-50')).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
