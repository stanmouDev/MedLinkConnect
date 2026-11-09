-- MedLink Connect relational schema foundations
CREATE TABLE hospital (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TEXT
);

CREATE TABLE patient (
  id INTEGER PRIMARY KEY,
  patient_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  blood_group TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  created_at TEXT,
  updated_at TEXT,
  hospital_id INTEGER NOT NULL
);

CREATE TABLE encounter (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER,
  nurse_id INTEGER,
  encounter_type TEXT,
  status TEXT,
  symptoms TEXT,
  notes TEXT,
  triage_level TEXT,
  created_at TEXT,
  updated_at TEXT
);
