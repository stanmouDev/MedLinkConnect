PLAYWRIGHT TEST:
Test name: antenatal tab shows content

TIMED OUT AT:
File: src/workspaces/patient-workspace.browser.test.ts
Line: 20
Operation: await page.locator('tbody tr').first().locator('button').first().click();

LAST SUCCESSFUL STEP:
Login completed and navigated to /patients
Table element was found
Wait of 3 seconds completed

SERVER:
Frontend reachable: YES (http://localhost:5173 returns 200)
Backend reachable: YES (login API responds correctly)

LOGIN:
Login page loaded: YES
Authentication completed: YES (midwife/midwife123)

PATIENT:
Patient list loaded: NO - shows "No patients match your search" (empty state)
Patient selected: NO - could not select patient because list is empty
PatientWorkspace loaded: NO - never reached

ANTENATAL:
Tab clicked: NO
Antenatal content rendered: NO

ROOT CAUSE:
The test times out in beforeEach at openFirstPatient() because the patient list table contains only the empty-state row ("No patients match your search") with 0 clickable buttons. 

ROOT CAUSE DETAIL:
1. loginAsMidwife() completes successfully
2. openFirstPatient() navigates to /patients
3. page.waitForSelector('table') succeeds (the empty state row is inside the table)
4. page.waitForTimeout(3000) completes
5. page.locator('tbody tr').count() returns 1 (the empty state row)
6. page.locator('tbody tr').first().locator('button').count() returns 0
7. page.locator('tbody tr').first().locator('button').first().click() times out waiting for a button that doesn't exist

WHY THE PATIENT LIST IS EMPTY:
The test does not wait for the offline-first sync to complete after login. The Patients page reads from IndexedDB. When the page loads immediately after login, the local cache is still empty because sync hasn't finished populating it. The application correctly shows the empty state.

CONFIRMATION:
When a 5-second wait is added after login (allowing sync to complete), the patient list loads with 8 rows and 2 buttons per row, and the test proceeds successfully.

CLASSIFICATION:
TEST BUG - Missing sync wait in test fixture

FIX:
The test's openFirstPatient() helper needs to wait for patient data to be available before attempting to click. Options:
1. Wait for the "Open Record" button to appear before clicking
2. Wait for sync completion indicator before navigating to /patients
3. Use direct API calls to set up test fixtures rather than relying on sync timing

The application itself is working correctly. The test is simply too fast for the offline-first data loading pattern.

TEST RESULT:
FAIL (test environment/setup issue, not application bug)
