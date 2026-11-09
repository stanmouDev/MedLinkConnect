#!/usr/bin/env python3
import requests

BASE_URL = "http://localhost:8000/api"
resp = requests.post(f"{BASE_URL}/auth/login/", json={"username": "doctor", "password": "doctor123"})
token = resp.json()["token"]
headers = {"Authorization": f"Token {token}"}

# Check diagnosis terms
terms = requests.get(f"{BASE_URL}/diagnosis-terms/", headers=headers).json()
print(f"Diagnosis terms: {len(terms) if isinstance(terms, list) else 0}")
if isinstance(terms, list):
    for t in terms[:10]:
        print(f"  {t.get('name')} ({t.get('icd10_code')})")

# Check medications
meds = requests.get(f"{BASE_URL}/medications/", headers=headers).json()
print(f"\nMedications: {len(meds) if isinstance(meds, list) else 0}")
if isinstance(meds, list):
    for m in meds[:10]:
        print(f"  {m.get('generic_name')} - {m.get('dosage_form')} - available={m.get('available')}")

# Test diagnosis search
print("\n--- Diagnosis search test: 'headache' ---")
search_resp = requests.get(f"{BASE_URL}/diagnosis-terms/?search=headache", headers=headers)
print(f"Status: {search_resp.status_code}")
if search_resp.status_code == 200:
    results = search_resp.json()
    print(f"Results: {len(results) if isinstance(results, list) else 0}")
    if isinstance(results, list):
        for r in results[:5]:
            print(f"  {r.get('name')} ({r.get('icd10_code')})")

# Test medication search
print("\n--- Medication search test: 'paracetamol' ---")
med_search = requests.get(f"{BASE_URL}/medications/?search=paracetamol", headers=headers)
print(f"Status: {med_search.status_code}")
if med_search.status_code == 200:
    results = med_search.json()
    print(f"Results: {len(results) if isinstance(results, list) else 0}")
    if isinstance(results, list):
        for r in results[:5]:
            print(f"  {r.get('generic_name')} - available={r.get('available')}")
