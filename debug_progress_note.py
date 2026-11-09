import requests
import json

# Login
resp = requests.post('http://localhost:8000/api/auth/login/', json={'username':'doctor','password':'doctor123'})
token = resp.json()['token']

headers = {
    'Authorization': f'Token {token}',
    'Content-Type': 'application/json',
    'Idempotency-Key': 'debug-001'
}

# Try creating progress note
payload = {
    'patient': 17,
    'clinical_status': 'improving',
    'response_to_treatment': 'good_response',
    'chief_concern': 'Headache and mild fever',
    'clinical_progress': 'Patient responding well to treatment. Fever resolved.',
    'assessment': 'Vitals stable. No red flags.',
    'treatment_response': 'improving',
    'current_treatment': 'Paracetamol 500mg TDS',
    'treatment_plan': 'Continue current treatment. Review in 3 days.',
    'follow_up_instructions': 'Return if symptoms worsen or persist beyond 5 days.',
    'next_review_date': '2026-09-08',
}

resp = requests.post('http://localhost:8000/api/clinical-progress-notes/', headers=headers, json=payload)
print('Status:', resp.status_code)
print('Body:', json.dumps(resp.json(), indent=2))
