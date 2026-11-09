# MedLink Connect

MedLink Connect is a production-ready hospital telemedicine and offline EMR platform for clinics and hospitals facing intermittent connectivity and clinician shortages. The first version focuses on a responsive PWA experience, offline-first data capture, encrypted local storage, automatic synchronization, and a secure backend API.

## Included
- Django REST backend with PostgreSQL-ready schema
- React + TypeScript + Tailwind PWA frontend
- Offline-first architecture and sync API foundation
- Clinical modules for patient registration, EMR, triage, labs, pharmacy, scheduling, and messaging
- Architecture, API, and deployment documentation

## Run the backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

The backend serves the REST API at `http://localhost:8000/api/`.

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend is a Vite + React + TypeScript PWA served at `http://localhost:5173/`.
It talks to the backend over the REST API, so **the backend must be running** for the app to work.

## Sign in
The frontend uses token authentication. After `seed_demo` you can sign in with:

| Username | Password   | Role         |
|----------|------------|--------------|
| admin    | admin123   | administrator |
| doctor   | doctor123  | doctor       |
| nurse    | nurse123   | nurse        |

You can change these passwords in `backend/medlink_backend/management/commands/seed_demo.py`.

## Notes
The AI assistant is optional and should be implemented as an advisory layer only. Suggestions must clearly state they are not a replacement for professional medical judgment.
