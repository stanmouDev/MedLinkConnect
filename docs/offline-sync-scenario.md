# Offline Synchronization Scenario Test

**Date:** 2026-07-23  
**Tester:** [Name]  
**Environment:** MedLink Connect v0.1.0, Chrome/Firefox/Edge, DevTools Network throttling  
**Backend:** Django dev server on `localhost:8000`  
**Frontend:** Vite dev server on `localhost:5173`  
**Database:** SQLite (`db.sqlite3`)  

---

## Objective

Verify that a complete clinical workflow performed offline synchronizes correctly when connectivity is restored, with:
1. Parent records syncing before dependent records
2. No duplicate records created
3. All relationships remaining correct
4. Patient timeline intact
5. Interrupted sync resilience

---

## Prerequisites

- Backend running: `cd backend && python manage.py migrate && python manage.py seed_demo && python manage.py runserver`
- Frontend running: `cd frontend && npm run dev`
- Browser DevTools open (Network tab, Application/IndexedDB tab, Console)
- Two browser profiles or two devices (Device A = offline creator, Device B = online editor) for conflict tests
- Postman or curl for direct API inspection
- Admin credentials: `admin` / `admin123`
- Doctor credentials: `doctor` / `doctor123`
- Nurse credentials: `nurse` / `nurse123`

---

## Scenario A: Offline-First Clinical Workflow

### Step 1: Go Offline

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Open DevTools > Network tab > check "Offline" | Network requests blocked | | |
| Refresh browser | App loads (cached shell) | | |
| Log in with `doctor` / `doctor123` | Login succeeds (token cached or API available if offline after first login) | | |

**Note:** If this is the first login ever, the app needs to contact `/api/auth/login/` which will fail offline. For this scenario, **log in once while online first**, then go offline.

### Step 2: Register a Patient

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Navigate to Patients page | Form loads | | |
| Fill in all fields: `patient_id: OFFLINE-001`, `full_name: Offline Patient`, `date_of_birth: 1985-06-15`, `gender: male`, `phone: 555-0100`, `email: offline@test.com`, `address: 789 Offline St`, `emergency_contact: 555-0101`, `next_of_kin: Next Kin`, `occupation: Tester`, `national_id: NAT-OFF-001`, `insurance_type: self_pay`, `blood_group: A+`, `allergies: Penicillin`, `chronic_conditions: None`, `hospital: [first hospital]` | Form filled | | |
| Click "Register" | Success; form clears; patient appears in list | | |
| Open DevTools > Application > IndexedDB > `medlink_offline` > `records` | New record with `resource: 'patients'`, `id: 'tmp_<uuid>'`, `dirty: true` | | |
| Open DevTools > Application > IndexedDB > `medlink_offline` > `outbox` | New item with `op: 'create'`, `resource: 'patients'`, `client_ref` matches record | | |

**Validate:**
- [ ] No JavaScript errors in console
- [ ] `enc` field is present and contains non-plaintext data
- [ ] `dirty` is `true`
- [ ] Outbox item `client_ref` matches the record's temp ID prefix

### Step 3: Record Vital Signs

**Note:** The Encounters page is read-only in the current UI. Vital signs must be created via the API or console.

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Open browser console | DevTools console ready | | |
| Execute: `await create('encounters', { patient: '<tmp_id_from_step2>', doctor: <doctor_user_id>, type: 'consultation', status: 'in_progress', symptoms: 'Fever', notes: 'Temp 38.5C', triage_level: 'urgent' })` | Encounter created locally; outbox item added | | |
| Execute: `await create('vitals', { encounter: '<new_encounter_id>', temp_c: 38.5, pulse_bpm: 98, BP: '130/85', O2_sat: 95, resp_rate: 20, weight_kg: 72 })` | Vitals created locally; outbox item added | | |
| Inspect IndexedDB `records` store | `encounters` and `vitals` records present, both `dirty: true` | | |

**Validate:**
- [ ] Encounter FK references the patient temp ID
- [ ] Vital sign FK references the encounter temp ID
- [ ] Both records have `enc` blobs
- [ ] Both have outbox items

### Step 4: Create an Encounter

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Execute in console: `await create('encounters', { patient: '<patient_tmp_id>', doctor: <doctor_id>, type: 'consultation', status: 'in_progress', symptoms: 'Cough', notes: 'Dry cough 3 days', triage_level: 'routine' })` | Encounter created locally | | |
| Inspect IndexedDB | Encounter record exists with correct patient FK | | |

**Validate:**
- [ ] Encounter record linked to patient temp ID
- [ ] Outbox contains create op for encounter

### Step 5: Create a Laboratory Request

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Navigate to Labs page | Page loads (offline) | | |
| Fill request form: `dept: chemistry`, `test_name: Basic Metabolic Panel`, `clinical_notes: 'Check electrolytes'`, `priority: routine` | Form filled | | |
| Click "Request Lab" | Request saved locally; outbox queued | | |
| Inspect IndexedDB `records` for `lab-requests` | Record present, `dirty: true`, `status: 'pending'` | | |
| Inspect IndexedDB `outbox` | Item with `op: 'create'`, `resource: 'lab-requests'` | | |

**Validate:**
- [ ] Lab request linked to patient
- [ ] Lab number may be null offline (generated server-side)
- [ ] No API call attempted (verify in Network tab)

### Step 6: Create a Prescription

**Note:** No dedicated prescription page exists. Create via console.

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Execute in console: `await create('prescriptions', { patient: '<patient_tmp_id>', doctor: <doctor_id>, medication: 'Amoxicillin', dosage: '500mg 3x daily', instructions: 'Take with food' })` | Prescription created locally | | |
| Inspect IndexedDB `records` for `prescriptions` | Record present, `dirty: true` | | |
| Inspect IndexedDB `outbox` | Item with `op: 'create'`, `resource: 'prescriptions'` | | |

**Validate:**
- [ ] Prescription linked to patient temp ID
- [ ] Outbox item present

### Step 7: Create a Doctor Handover

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Navigate to Handovers page | Page loads | | |
| Click "New Handover" | Create form appears | | |
| Select receiver: `nurse` / `nurse123` (or another doctor) | Receiver selected | | |
| Add patient: select the offline patient from dropdown | Patient added to handover | | |
| Fill patient clinical fields (ward, bed, diagnosis, condition, vitals, allergies, meds, treatments, pending_tests, risks, priority) | Fields filled | | |
| Add notes: "Night shift handover - offline created" | Notes added | | |
| Click "Create Handover" | Handover saved locally; outbox queued | | |
| Inspect IndexedDB `records` for `handovers` | Record present, `dirty: true` | | |
| Inspect IndexedDB `records` for `handover-patients` (if separate resource) | Patient data present | | |

**Validate:**
- [ ] Handover status is `pending`
- [ ] HandoverPatient data includes all clinical fields
- [ ] Outbox contains create op for handover

### Step 8: Reconnect to the Internet

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Open DevTools > Network tab > uncheck "Offline" | Network requests allowed | | |
| Observe SyncStatusBar | Status changes to "Online" within 2 seconds | | |
| Wait up to 10 seconds | Auto-sync triggers (`fullSync` called) | | |

### Step 9: Synchronize All Records

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Observe SyncStatusBar | Shows "Syncing..." then "Synced" or "X pending" | | |
| Open Network tab | POST/PUT/DELETE requests visible for each outbox item | | |
| Count outbox items before sync | Should be 5-6 items (patient, encounter, vitals, lab-request, prescription, handover) | | |
| Wait for sync to complete | Outbox empty; all records `dirty: false` | | |

**Validate:**
- [ ] Each outbox item results in exactly one API call
- [ ] No 4xx/5xx errors in Network tab
- [ ] `pending` count in SyncStatusBar reaches 0

### Step 10: Verify Parent Records Sync Before Dependent Records

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Inspect Network tab request order | Patient POST → Encounter POST → Vitals POST → Lab Request POST → Prescription POST → Handover POST | | |
| Query backend database directly | Patient exists with server-assigned numeric ID | | |
| Query encounter in DB | Encounter `patient_id` matches server patient ID (not temp ID) | | |
| Query vitals in DB | Vitals `encounter_id` matches server encounter ID | | |
| Query lab request in DB | Lab request `patient_id` matches server patient ID | | |
| Query prescription in DB | Prescription `patient_id` matches server patient ID | | |
| Query handover in DB | Handover exists; HandoverPatient records exist with correct FKs | | |

**Validate:**
- [ ] Parent IDs are remapped from temp IDs to server IDs
- [ ] No FK constraint violations in database
- [ ] Order of API calls respects dependency chain

### Step 11: Verify No Duplicate Records

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Count patients in DB with `patient_id = 'OFFLINE-001'` | Exactly 1 | | |
| Count encounters for that patient | Exactly 1 (or expected count) | | |
| Count prescriptions for that patient | Exactly 1 | | |
| Count lab requests for that patient | Exactly 1 | | |
| Count handovers involving that patient | Exactly 1 | | |

**Validate:**
- [ ] No duplicate patients
- [ ] No duplicate encounters
- [ ] No duplicate prescriptions
- [ ] No duplicate lab requests
- [ ] No duplicate handovers

### Step 12: Verify All Relationships Remain Correct

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Query patient in DB | `full_name = 'Offline Patient'` | | |
| Query patient's encounters | Linked to correct patient | | |
| Query encounter's vitals | Linked to correct encounter | | |
| Query patient's prescriptions | Linked to correct patient | | |
| Query patient's lab requests | Linked to correct patient | | |
| Query handover's patients | HandoverPatient records linked to correct handover and patient | | |

**Validate:**
- [ ] All FK relationships intact
- [ ] No orphaned records
- [ ] HandoverPatient data matches original clinical fields

### Step 13: Verify Patient Timeline Is Intact

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Navigate to Timeline page | Page loads | | |
| Filter by patient (if filtering works) | Only this patient's events shown | | |
| Count timeline events | Should include: registration, encounter, vitals, prescription, lab request, handover (at minimum) | | |
| Verify chronological order | Events sorted by `occurred_at` ascending | | |
| Verify event types | Event types match the actions taken | | |

**Validate:**
- [ ] At least 6 timeline events for this patient
- [ ] Events are in correct chronological order
- [ ] All event types are represented

---

## Scenario B: Interrupted Synchronization

### Setup

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Log in while online | Session active | | |
| Create 5 records online (patient, encounter, vitals, prescription, lab request) | All records synced to server | | |
| Verify outbox is empty | `pending: 0` in SyncStatusBar | | |
| Go offline | Status shows "Offline" | | |

### Step B1: Create Records Offline

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Create 3 new patients offline | All saved locally; outbox has 3 items | | |
| Update 1 existing patient offline (change phone number) | Local record updated; outbox has 1 update item | | |
| Delete 1 existing patient offline | Local record soft-deleted; outbox has 1 delete item | | |
| Total outbox items | 5 items (3 creates + 1 update + 1 delete) | | |

### Step B2: Start Sync and Interrupt

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Reconnect to internet | Status changes to "Online" | | |
| Wait for auto-sync | Sync starts automatically | | |
| Immediately go offline AGAIN (during sync) | Sync interrupted mid-way | | |
| Inspect Network tab | Some API calls completed, some pending/failed | | |
| Inspect outbox | Remaining items still present (not yet processed) | | |

### Step B3: Reconnect and Complete Sync

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Reconnect to internet again | Auto-sync triggers | | |
| Wait for sync to complete | All remaining outbox items processed | | |
| Verify outbox is empty | `pending: 0` | | |

### Step B4: Verify Integrity After Interrupted Sync

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Count patients created offline | Exactly 3 new patients on server | | |
| Verify updated patient phone | Matches offline update | | |
| Verify deleted patient | Soft-deleted or removed per business logic | | |
| Check for duplicates | No duplicate records | | |
| Verify all FKs | All relationships intact | | |

**Validate:**
- [ ] No partial sync left server in inconsistent state
- [ ] All offline changes eventually applied
- [ ] No duplicate records from partial sync
- [ ] Retry does not re-create already-synced records

---

## Scenario C: Conflict Detection and Resolution

### Setup

| Action | Expected | Actual | Pass/Fail |
|--------|----------|----------|-----------|
| Device A: Log in as doctor | Session active | | |
| Device B: Log in as doctor (different browser/profile) | Session active | | |
| Device A: Go offline | Status "Offline" | | |
| Device B: Stay online | Status "Online" | | |

### Step C1: Create Concurrent Edit

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Device A: Edit patient "Offline Patient" phone to `555-9999` offline | Local record updated; outbox queued | | |
| Device B: Edit same patient phone to `555-8888` online | Server record updated | | |
| Device A: Go online and sync | Conflict detected | | |

### Step C2: Verify Conflict

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Device A: Observe SyncStatusBar | Conflict count = 1; conflict listed | | |
| Device A: Expand conflict panel | Shows patient name and conflicting fields | | |
| Device A: Query local record | Still shows Device A's version (`555-9999`) | | |

### Step C3: Resolve Conflict

| Action | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| Device A: Click "Keep server version" | Conflict resolved | | |
| Device A: Query local record | Now shows Device B's version (`555-8888`) | | |
| Device A: Verify conflict removed from panel | Conflict count = 0 | | |

**Validate:**
- [ ] Conflict detected automatically during pull
- [ ] Local edit preserved until user resolves
- [ ] "Keep server version" overwrites local with server data
- [ ] No data loss

---

## Test Summary

| Scenario | Total Steps | Passed | Failed | Blocked |
|----------|-------------|--------|--------|---------|
| A: Offline-First Clinical Workflow | 13 | | | |
| B: Interrupted Synchronization | 4 | | | |
| C: Conflict Detection and Resolution | 3 | | | |

**Overall Result:** [ ] PASS [ ] PASS WITH WARNINGS [ ] FAIL

**Notes:**
