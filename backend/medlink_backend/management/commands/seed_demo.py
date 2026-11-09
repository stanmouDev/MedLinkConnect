from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from medlink_backend.models import (
    Hospital, User, Patient, Encounter, VitalSign, Appointment,
    LabOrder, Prescription, Message, Diagnosis, Medication,
)
from datetime import timedelta
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo data for MedLink Connect'

    def handle(self, *args, **options):
        hospital, _ = Hospital.objects.get_or_create(
            code='MHC',
            defaults={'name': 'MedLink Community Hospital', 'location': 'Rural District'},
        )

        credentials = {
            'admin': ('administrator', 'admin123'),
            'doctor': ('doctor', 'doctor123'),
            'nurse': ('nurse', 'nurse123'),
            'midwife': ('midwife', 'midwife123'),
        }
        for username, (role, password) in credentials.items():
            user, created = User.objects.get_or_create(
                username=username,
                defaults={'role': role, 'hospital': hospital},
            )
            user.set_password(password)
            user.role = role
            user.hospital = hospital
            if role == 'administrator':
                user.is_staff = True
                user.is_superuser = True
            user.save()
            self.stdout.write(f'  user {username} / {password}')

        demo_patients = [
            ('P1001', 'Amina Hassan', '+254700000001', 'Female', '1990-04-12', '123 Mombasa Road, Nairobi'),
            ('P1002', 'John Omondi', '+254700000002', 'Male', '1982-11-03', '45 Kisumu Street, Kisumu'),
            ('P1003', 'Grace Wanjiru', '+254700000003', 'Female', '1975-07-21', '78 Nakuru Avenue, Nakuru'),
            ('P1004', 'Kelvin Mutua', '+254700000004', 'Male', '2001-01-30', '12 Eldoret Lane, Eldoret'),
        ]
        patients = []
        for pid, name, phone, gender, dob, address in demo_patients:
            patient, _ = Patient.objects.get_or_create(
                patient_id=pid,
                defaults={
                    'full_name': name,
                    'hospital': hospital,
                    'phone': phone,
                    'gender': gender,
                    'date_of_birth': dob,
                    'address': address,
                    'emergency_contact': 'Next of kin',
                    'blood_group': 'O+',
                },
            )
            patients.append(patient)

        doctor = User.objects.get(username='doctor')
        nurse = User.objects.get(username='nurse')

        demo_medications = [
            ('Paracetamol', 'Panadol', '500mg', 'tablet', 'oral', 'formulary'),
            ('Amoxicillin', 'Amoxil', '250mg', 'capsule', 'oral', 'formulary'),
            ('Ibuprofen', 'Brufen', '400mg', 'tablet', 'oral', 'formulary'),
            ('Omeprazole', 'Losec', '20mg', 'capsule', 'oral', 'formulary'),
            ('Metformin', 'Glucophage', '500mg', 'tablet', 'oral', 'formulary'),
            ('Amlodipine', 'Norvasc', '5mg', 'tablet', 'oral', 'formulary'),
            ('Ciprofloxacin', 'Cipro', '500mg', 'tablet', 'oral', 'restricted'),
            ('Artemisinin-based Combination Therapy', 'Coartem', '80/480mg', 'tablet', 'oral', 'formulary'),
        ]
        for generic, brand, strength, form, route, status in demo_medications:
            Medication.objects.get_or_create(
                generic_name=generic,
                defaults={
                    'brand_name': brand,
                    'strength': strength,
                    'dosage_form': form,
                    'route': route,
                    'formulary_status': status,
                    'available': True,
                },
            )

        demo_diagnoses = [
            ('Essential hypertension', 'I10'),
            ('Type 2 diabetes mellitus', 'E11'),
            ('Acute upper respiratory infection', 'J00'),
            ('Low back pain', 'M54.5'),
            ('Migraine', 'G43.9'),
            ('Gastro-oesophageal reflux disease', 'K21.9'),
            ('Urinary tract infection', 'N39.0'),
            ('Pneumonia', 'J18.9'),
        ]

        for patient in patients:
            encounter, _ = Encounter.objects.get_or_create(
                patient=patient,
                status='in_progress',
                defaults={
                    'doctor': doctor,
                    'nurse': nurse,
                    'encounter_type': 'consultation',
                    'symptoms': 'Routine review',
                    'triage_level': 'routine',
                },
            )
            VitalSign.objects.get_or_create(
                encounter=encounter,
                defaults={
                    'temperature_c': 36.8,
                    'pulse_bpm': 78,
                    'blood_pressure': '120/80',
                    'oxygen_saturation': 98.0,
                    'respiratory_rate': 16,
                },
            )
            Appointment.objects.get_or_create(
                patient=patient,
                doctor=doctor,
                scheduled_at=timezone.now() + timedelta(days=patients.index(patient) + 1),
                defaults={'status': 'scheduled', 'notes': 'Follow-up visit'},
            )
            LabOrder.objects.get_or_create(
                patient=patient,
                requested_by=doctor,
                test_name='Complete Blood Count',
                defaults={'status': 'pending'},
            )
            Prescription.objects.get_or_create(
                patient=patient,
                doctor=doctor,
                medication='Paracetamol',
                defaults={'dosage': '500mg', 'instructions': 'As needed for fever'},
            )
            Diagnosis.objects.get_or_create(
                patient=patient,
                diagnosis_name=demo_diagnoses[patients.index(patient) % len(demo_diagnoses)][0],
                defaults={
                    'icd10_code': demo_diagnoses[patients.index(patient) % len(demo_diagnoses)][1],
                    'diagnosis_type': 'working',
                    'status': 'active',
                    'created_by': doctor,
                },
            )
            Message.objects.get_or_create(
                sender=doctor,
                recipient=nurse,
                body=f'Please review {patient.full_name} vitals.',
            )

        self.stdout.write(self.style.SUCCESS('Demo data seeded'))
