#!/usr/bin/env python3
"""
Phase 2 Extended Testing - Diagnose endpoint issues
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

# Login first
login_resp = requests.post(
    f"{BASE_URL}/auth/login/",
    json={"username": "doctor", "password": "doctor123"}
)
token = login_resp.json()["token"]
headers = {"Authorization": f"Token {token}"}

print("="*70)
print("ENDPOINT AVAILABILITY CHECK")
print("="*70)

# Check available endpoints
endpoints_to_check = [
    ("/", "Root API"),
    ("/prescriptions/", "Prescriptions"),
    ("/referrals/", "Referrals"),
    ("/admissions/", "Admissions"),
    ("/diagnosis/", "Diagnosis"),
    ("/labrequests/", "Lab Requests"),
    ("/vitalsigns/", "Vital Signs"),
    ("/inpatient-prescriptions/", "Inpatient Prescriptions"),
]

for endpoint, name in endpoints_to_check:
    try:
        resp = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=5)
        print(f"\n✓ {name} ({endpoint})")
        print(f"  Status: {resp.status_code}")
        if resp.status_code in [200, 404]:
            data = resp.json()
            if isinstance(data, list):
                print(f"  Records: {len(data)}")
            elif isinstance(data, dict) and isinstance(data.get("results"), list):
                print(f"  Records (paginated): {len(data['results'])}")
                print(f"  Available fields: {list(data['results'][0].keys())[:5] if data['results'] else 'N/A'}")
    except requests.exceptions.RequestException as e:
        print(f"\n✗ {name} ({endpoint})")
        print(f"  Error: {e}")

# Test prescription creation with detailed error
print("\n" + "="*70)
print("PRESCRIPTION CREATION - DETAILED DIAGNOSTICS")
print("="*70)

prescription_data = {
    "patient": 1,
    "medication": "Paracetamol",
    "dosage": "500mg",
    "route": "oral",
    "frequency": "Three times daily",
    "duration_days": 7,
    "prescriber_notes": "For pain management"
}

resp = requests.post(
    f"{BASE_URL}/prescriptions/",
    headers=headers,
    json=prescription_data
)

print(f"\nRequest Data: {json.dumps(prescription_data, indent=2)}")
print(f"Status Code: {resp.status_code}")
print(f"Response Headers: {dict(resp.headers)}")
print(f"Response Body:")
try:
    print(json.dumps(resp.json(), indent=2))
except:
    print(resp.text)

# Test referral creation with detailed error
print("\n" + "="*70)
print("REFERRAL CREATION - DETAILED DIAGNOSTICS")
print("="*70)

referral_data = {
    "patient": 1,
    "receiving_unit": "Cardiology",
    "reason": "Hypertension management",
    "priority": "normal",
    "referring_unit": "General Medicine"
}

resp = requests.post(
    f"{BASE_URL}/referrals/",
    headers=headers,
    json=referral_data
)

print(f"\nRequest Data: {json.dumps(referral_data, indent=2)}")
print(f"Status Code: {resp.status_code}")
print(f"Response Body:")
try:
    print(json.dumps(resp.json(), indent=2))
except:
    print(resp.text)

# Test admission creation with detailed error
print("\n" + "="*70)
print("ADMISSION CREATION - DETAILED DIAGNOSTICS")
print("="*70)

admission_data = {
    "patient": 1,
    "admission_type": "planned",
    "admission_reason": "Validation testing",
    "primary_diagnosis": "I10",
    "admitted_by": 1
}

resp = requests.post(
    f"{BASE_URL}/admissions/",
    headers=headers,
    json=admission_data
)

print(f"\nRequest Data: {json.dumps(admission_data, indent=2)}")
print(f"Status Code: {resp.status_code}")
print(f"Response Body:")
try:
    print(json.dumps(resp.json(), indent=2))
except:
    print(resp.text)

# Check what fields are actually needed for prescription
print("\n" + "="*70)
print("PRESCRIPTION MODEL SCHEMA CHECK")
print("="*70)

# Try to get existing prescription to see schema
resp = requests.get(f"{BASE_URL}/prescriptions/", headers=headers)
if resp.status_code == 200:
    data = resp.json()
    if isinstance(data, list) and len(data) > 0:
        print("Sample Prescription Record:")
        print(json.dumps(data[0], indent=2))
    else:
        print(f"Response: {data}")

# Check route and referral schemas
print("\n" + "="*70)
print("CHECKING AVAILABLE WRITE-ENABLED ENDPOINTS")
print("="*70)

# Get API root to see all available endpoints
resp = requests.get(f"{BASE_URL}/", headers=headers)
if resp.status_code == 200:
    try:
        api_endpoints = resp.json()
        print("Available endpoints from API root:")
        for key in sorted(api_endpoints.keys())[:20]:  # Show first 20
            print(f"  - {key}")
    except:
        print(f"API root response: {resp.text[:500]}")
