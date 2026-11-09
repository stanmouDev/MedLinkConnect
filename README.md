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
The frontend uses token authentication. For local development only, `seed_demo` creates demo accounts:

| Username | Password   | Role         |
|----------|------------|--------------|
| admin    | admin123   | administrator |
| doctor   | doctor123  | doctor       |
| nurse    | nurse123   | nurse        |

You can change these passwords in `backend/medlink_backend/management/commands/seed_demo.py`.
These fixed demo credentials and sample patient records are public in the source code. Never run `seed_demo` on a public deployment or use these accounts with real data.

## Free demo deployment

This repository includes a Render Blueprint for the Django API and PostgreSQL database, plus Vercel configuration for the React frontend.

1. In Render, create a new Blueprint from this repository and apply `render.yaml`. The Blueprint provisions the API and database on their Free plans.
2. In Vercel, import this repository as a project and set the Root Directory to `frontend`. If you deploy by uploading the folder, use the deployed Vercel URL shown after the upload.
3. Set `CORS_ALLOWED_ORIGINS` on the Render API to the exact Vercel deployment origin (scheme and hostname, without a path), then redeploy the API.

The frontend defaults to the Render API URL in production builds. If you use a different Render service name, set `VITE_API_BASE` in Vercel to `https://<your-render-service>.onrender.com/api` and redeploy.

**Free-tier and health-data warning:** this setup is for demos with synthetic data only, not clinical or production use. Render's free API service can sleep after 15 minutes of inactivity, and its free PostgreSQL database expires after 30 days and has no backups. Do not enter real patient or other sensitive health information. The API database starts empty; create your own account rather than running `seed_demo`.

### Create the first production administrator

The free Render web service does not provide Shell access. To create the first administrator without putting a password in source code or chat:

1. In the Render API service's **Environment** settings, add `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD`. Choose a unique password with at least 16 characters. Optionally add `BOOTSTRAP_ADMIN_EMAIL`.
2. Save the variables and redeploy the API. Its startup command creates the administrator once, with the `administrator` role.
3. After the deploy succeeds, remove all `BOOTSTRAP_ADMIN_*` variables from Render and save. The command will leave the created account unchanged on later restarts.
4. Sign in to the Vercel app with the username and password you chose. Do not use the published demo credentials on the public deployment.

## Notes
The AI assistant is optional and should be implemented as an advisory layer only. Suggestions must clearly state they are not a replacement for professional medical judgment.
