import json
import os
from io import StringIO
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase, Client
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.management import call_command, CommandError
from rest_framework.authtoken.models import Token
from rest_framework import status
from .models import (
    Hospital, Patient, Encounter, VitalSign, Appointment,
    LabOrder, Prescription, Message, Handover, HandoverPatient,
    Notification, LabRequest, LabResult, TimelineEvent,
    InsuranceCompany, NHISRecord, PrivateInsuranceRecord,
    InsuranceCoverageRule, Bill, BillItem, Payment,
    StockItem, StockMovement, MonthlyStatistic, DiseaseOutbreak,
    ReportTemplate, ReportInstance, ReportSection, DataQualityAlert,
    PublicHealthAlert, PerformanceIndicator, ReportExport,
    ReportTemplateVersion, ReportElement, FormulaDefinition,
    ReportSchedule, ReportDashboardPin, ReportExportFormat,
    Referral, Ward, Room, Bed, Admission, InpatientNote, BedTransfer,
    MedicationAdministration, InpatientLabRequest, InpatientPrescription,
    AuditLog, IdempotencyKey,
    AntenatalRecord, LabourRecord, Delivery, Newborn, FetalAssessment, PostnatalRecord, MaternityNote,
)

User = get_user_model()


def _auth_headers(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {'HTTP_AUTHORIZATION': f'Token {token.key}'}


class BootstrapAdminCommandTests(TestCase):
    def test_creates_administrator_with_environment_credentials(self):
        with patch.dict(os.environ, {
            'BOOTSTRAP_ADMIN_USERNAME': 'initial-admin',
            'BOOTSTRAP_ADMIN_PASSWORD': 'a-unique-password-with-16-chars',
            'BOOTSTRAP_ADMIN_EMAIL': 'admin@example.com',
        }):
            call_command('bootstrap_admin', stdout=StringIO())

        user = User.objects.get(username='initial-admin')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertEqual(user.role, 'administrator')
        self.assertEqual(user.email, 'admin@example.com')

    def test_skips_when_bootstrap_credentials_are_not_set(self):
        with patch.dict(os.environ, {}, clear=True):
            output = StringIO()
            call_command('bootstrap_admin', stdout=output)

        self.assertIn('skipped', output.getvalue())
        self.assertFalse(User.objects.exists())

    def test_rejects_short_password(self):
        with patch.dict(os.environ, {
            'BOOTSTRAP_ADMIN_USERNAME': 'initial-admin',
            'BOOTSTRAP_ADMIN_PASSWORD': 'too-short',
        }):
            with self.assertRaises(CommandError):
                call_command('bootstrap_admin', stdout=StringIO())

        self.assertFalse(User.objects.exists())

    def test_does_not_change_existing_administrator(self):
        original = User.objects.create_superuser(
            username='initial-admin',
            password='original-password',
            role='administrator',
        )
        with patch.dict(os.environ, {
            'BOOTSTRAP_ADMIN_USERNAME': 'initial-admin',
            'BOOTSTRAP_ADMIN_PASSWORD': 'a-different-password-with-16-chars',
        }):
            output = StringIO()
            call_command('bootstrap_admin', stdout=output)

        original.refresh_from_db()
        self.assertTrue(original.check_password('original-password'))
        self.assertIn('no changes made', output.getvalue())


class APIAuthTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.admin = User.objects.create_user(
            username='admin', password='admin123', role='administrator',
            hospital=self.hospital, is_staff=True, is_superuser=True,
        )
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.nurse = User.objects.create_user(
            username='nurse', password='nurse123', role='nurse',
            hospital=self.hospital,
        )
        self.lab = User.objects.create_user(
            username='lab', password='lab123', role='lab_technician',
            hospital=self.hospital,
        )
        self.client = Client()

    def test_login_returns_token(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'admin', 'password': 'admin123'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('token', res.json())

    def test_login_bad_credentials(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'admin', 'password': 'wrong'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_returns_user_info(self):
        res = self.client.get('/api/auth/me/', **_auth_headers(self.admin))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['username'], 'admin')
        self.assertEqual(data['role'], 'administrator')


class PatientTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.client = Client()

    def test_create_patient(self):
        res = self.client.post(
            '/api/patients/',
            {
                'patient_id': 'P001',
                'full_name': 'John Doe',
                'date_of_birth': '1990-01-01',
                'gender': 'male',
                'phone': '555-0001',
                'email': 'john@example.com',
                'address': '123 Main St',
                'emergency_contact': '555-0002',
                'next_of_kin': 'Jane Doe',
                'occupation': 'Engineer',
                'national_id': 'NAT001',
                'insurance_type': 'self_pay',
                'blood_group': 'O+',
                'allergies': 'None',
                'chronic_conditions': 'None',
                'hospital': self.hospital.id,
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.count(), 1)
        self.assertEqual(Patient.objects.first().full_name, 'John Doe')

    def test_patient_unique_patient_id(self):
        Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        res = self.client.post(
            '/api/patients/',
            {
                'patient_id': 'P001',
                'full_name': 'Jane Doe',
                'date_of_birth': '1992-02-02',
                'gender': 'female',
                'hospital': self.hospital.id,
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_patients(self):
        Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        res = self.client.get('/api/patients/', **_auth_headers(self.doctor))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(len(data), 1)


class EncounterTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.client = Client()

    def test_create_encounter(self):
        res = self.client.post(
            '/api/encounters/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'encounter_type': 'consultation',
                'status': 'in_progress',
                'symptoms': 'Headache',
                'notes': 'Patient reports throbbing pain.',
                'triage_level': 'urgent',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Encounter.objects.count(), 1)

    def test_encounter_with_vitals(self):
        enc = Encounter.objects.create(
            patient=self.patient, doctor=self.doctor, encounter_type='consultation',
            status='in_progress',
        )
        VitalSign.objects.create(
            encounter=enc, temperature_c=37.5, pulse_bpm=72, blood_pressure='120/80',
            oxygen_saturation=98, respiratory_rate=16, weight_kg=70,
        )
        res = self.client.get('/api/encounters/', **_auth_headers(self.doctor))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(len(data[0].get('vitals', [])), 1)


class LabRequestTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.lab = User.objects.create_user(
            username='lab', password='lab123', role='lab_technician',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.client = Client()

    def test_create_lab_request(self):
        res = self.client.post(
            '/api/lab-requests/',
            {
                'patient': self.patient.id,
                'requested_by': self.doctor.id,
                'department': 'hematology',
                'test_name': 'Complete Blood Count',
                'clinical_notes': 'Check for anemia.',
                'priority': 'medium',
                'status': 'pending',
            },
            **_auth_headers(self.doctor),
        )
        if res.status_code != status.HTTP_201_CREATED:
            print(f"LAB REQUEST CREATE FAILED: {res.status_code} {res.content}")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LabRequest.objects.count(), 1)
        self.assertIsNotNone(LabRequest.objects.first().lab_number)

    def test_collect_sample(self):
        req = LabRequest.objects.create(
            patient=self.patient, requested_by=self.doctor, department='hematology',
            test_name='CBC', priority='medium', status='pending',
        )
        res = self.client.post(
            f'/api/lab-requests/{req.id}/collect_sample/',
            {'sample_collected_by': self.doctor.id},
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, 'sample_collected')

    def test_complete_lab_request(self):
        req = LabRequest.objects.create(
            patient=self.patient, requested_by=self.doctor, department='hematology',
            test_name='CBC', priority='medium', status='processing',
        )
        res = self.client.post(
            f'/api/lab-requests/{req.id}/complete/',
            {
                'result': 'Normal',
                'result_files': [],
                'completed': True,
            },
            **_auth_headers(self.lab),
        )
        if res.status_code != status.HTTP_200_OK:
            print(f"LAB REQUEST COMPLETE FAILED: {res.status_code} {res.content}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, 'completed')


class HandoverTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.sender = User.objects.create_user(
            username='sender', password='pass123', role='doctor',
            hospital=self.hospital,
        )
        self.receiver = User.objects.create_user(
            username='receiver', password='pass123', role='doctor',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.client = Client()

    def test_create_handover(self):
        res = self.client.post(
            '/api/handovers/',
            {
                'sender': self.sender.id,
                'receiver': self.receiver.id,
                'status': 'pending',
                'notes': 'Shift handover',
                'patient_ids': [self.patient.id],
            },
            **_auth_headers(self.sender),
        )
        if res.status_code != status.HTTP_201_CREATED:
            print(f"HANDOVER CREATE FAILED: {res.status_code} {res.content}")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Handover.objects.count(), 1)
        self.assertEqual(HandoverPatient.objects.count(), 1)

    def test_accept_handover(self):
        handover = Handover.objects.create(
            sender=self.sender, receiver=self.receiver, status='pending',
        )
        HandoverPatient.objects.create(
            handover=handover, patient=self.patient,
            patient_name='John Doe', patient_code='P001',
        )
        res = self.client.post(
            f'/api/handovers/{handover.id}/accept/',
            **_auth_headers(self.receiver),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        handover.refresh_from_db()
        self.assertEqual(handover.status, 'accepted')


class InsuranceTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.admin = User.objects.create_user(
            username='admin', password='admin123', role='administrator',
            hospital=self.hospital, is_staff=True,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.client = Client()

    def test_create_insurance_company(self):
        res = self.client.post(
            '/api/insurance-companies/',
            {
                'name': 'Test Insurance',
                'code': 'TI001',
                'insurance_type': 'private',
                'contact': 'contact@test.com',
                'phone': '555-0001',
                'email': 'info@test.com',
                'address': '456 Oak Ave',
                'is_active': True,
            },
            **_auth_headers(self.admin),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InsuranceCompany.objects.count(), 1)

    def test_create_nhis_record(self):
        res = self.client.post(
            '/api/nhis-records/',
            {
                'patient': self.patient.id,
                'nhis_number': 'NHIS001',
                'membership_status': 'active',
                'expiry_date': '2026-12-31',
                'scheme_type': 'standard',
                'verified': False,
            },
            **_auth_headers(self.admin),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(NHISRecord.objects.count(), 1)


class BillingTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient, doctor=self.doctor, encounter_type='consultation',
            status='completed',
        )
        self.client = Client()

    def test_create_bill(self):
        res = self.client.post(
            '/api/bills/',
            {
                'patient': self.patient.id,
                'encounter': self.encounter.id,
                'hospital': self.hospital.id,
                'bill_type': 'consultation',
                'total_amount': '100.00',
                'covered_by_insurance': '0.00',
                'patient_co_pay': '100.00',
                'status': 'pending',
                'notes': 'Consultation fee',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bill.objects.count(), 1)


class StockTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.admin = User.objects.create_user(
            username='admin', password='admin123', role='administrator',
            hospital=self.hospital, is_staff=True,
        )
        self.client = Client()

    def test_create_stock_item(self):
        res = self.client.post(
            '/api/stock-items/',
            {
                'hospital': self.hospital.id,
                'name': 'Paracetamol',
                'code': 'MED001',
                'category': 'Medicine',
                'unit': 'tablet',
                'current_quantity': 100,
                'minimum_stock_level': 20,
                'unit_cost': '0.50',
                'expiry_date': '2027-12-31',
                'supplier': 'PharmaCo',
                'is_active': True,
            },
            **_auth_headers(self.admin),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StockItem.objects.count(), 1)

    def test_stock_movement_updates_quantity(self):
        item = StockItem.objects.create(
            hospital=self.hospital, name='Paracetamol', code='MED001',
            category='Medicine', unit='tablet', current_quantity=100,
            minimum_stock_level=20, unit_cost='0.50', is_active=True,
        )
        res = self.client.post(
            '/api/stock-movements/',
            {
                'stock_item': item.id,
                'movement_type': 'out',
                'quantity': 10,
                'reference': 'RX001',
                'notes': 'Dispensed',
            },
            **_auth_headers(self.admin),
        )
        if res.status_code != status.HTTP_201_CREATED:
            print(f"STOCK MOVEMENT FAILED: {res.status_code} {res.content}")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        item.refresh_from_db()
        self.assertEqual(item.current_quantity, 90)


class VitalSignTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.nurse = User.objects.create_user(
            username='nurse', password='nurse123', role='nurse',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient, doctor=self.doctor, encounter_type='consultation',
            status='in_progress',
        )
        self.client = Client()

    def test_create_vital_sign(self):
        res = self.client.post(
            '/api/vitals/',
            {
                'encounter': self.encounter.id,
                'temperature_c': 37.5,
                'pulse_bpm': 72,
                'blood_pressure': '120/80',
                'oxygen_saturation': 98,
                'respiratory_rate': 16,
                'weight_kg': 70,
                'height_cm': 175,
                'blood_glucose': 5.5,
                'pain_score': 2,
                'level_of_consciousness': 'Alert',
                'additional_notes': 'Stable',
            },
            **_auth_headers(self.nurse),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VitalSign.objects.count(), 1)
        v = VitalSign.objects.first()
        self.assertEqual(v.temperature_c, 37.5)
        self.assertEqual(v.recorded_by, self.nurse)

    def test_create_vital_sign_without_encounter(self):
        res = self.client.post(
            '/api/vitals/',
            {
                'patient': self.patient.id,
                'temperature_c': 38.0,
                'pulse_bpm': 88,
                'blood_pressure': '130/85',
                'oxygen_saturation': 96,
                'respiratory_rate': 18,
                'weight_kg': 75,
            },
            **_auth_headers(self.nurse),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VitalSign.objects.count(), 1)


class SyncPullTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.client = Client()

    def test_sync_pull_returns_items(self):
        res = self.client.get('/api/sync/pull/', **_auth_headers(self.doctor))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('items', data)
        self.assertIn('server_time', data)
        self.assertTrue(len(data['items']) > 0)

    def test_sync_pull_since_filter(self):
        from django.utils import timezone
        old = timezone.now() - timedelta(days=1)
        Patient.objects.filter(id=self.patient.id).update(created_at=old)
        res = self.client.get(
            '/api/sync/pull/?since=2020-01-01T00:00:00Z',
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        entity_types = [i['entity_type'] for i in data['items']]
        self.assertIn('patients', entity_types)


class RolePermissionTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.admin = User.objects.create_user(
            username='admin', password='admin123', role='administrator',
            hospital=self.hospital, is_staff=True, is_superuser=True,
        )
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.nurse = User.objects.create_user(
            username='nurse', password='nurse123', role='nurse',
            hospital=self.hospital,
        )
        self.receptionist = User.objects.create_user(
            username='receptionist', password='rec123', role='receptionist',
            hospital=self.hospital,
        )
        self.client = Client()

    def test_admin_can_access_all(self):
        res = self.client.get('/api/patients/', **_auth_headers(self.admin))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_doctor_can_create_lab_request(self):
        patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        res = self.client.post(
            '/api/lab-requests/',
            {
                'patient': patient.id,
                'requested_by': self.doctor.id,
                'department': 'hematology',
                'test_name': 'CBC',
                'priority': 'medium',
                'status': 'pending',
            },
            **_auth_headers(self.doctor),
        )
        if res.status_code != status.HTTP_201_CREATED:
            print(f"DOCTOR LAB REQUEST FAILED: {res.status_code} {res.content}")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_nurse_can_create_lab_request(self):
        patient = Patient.objects.create(
            patient_id='P002', full_name='Jane Doe', hospital=self.hospital,
        )
        res = self.client.post(
            '/api/lab-requests/',
            {
                'patient': patient.id,
                'requested_by': self.nurse.id,
                'department': 'chemistry',
                'test_name': 'Glucose',
                'priority': 'medium',
                'status': 'pending',
            },
            **_auth_headers(self.nurse),
        )
        if res.status_code != status.HTTP_201_CREATED:
            print(f"NURSE LAB REQUEST FAILED: {res.status_code} {res.content}")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_denied(self):
        res = self.client.get('/api/patients/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ReferralTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.other_hospital = Hospital.objects.create(name='Other Hospital', code='OH')
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.nurse = User.objects.create_user(
            username='nurse', password='nurse123', role='nurse',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient, doctor=self.doctor, encounter_type='consultation',
            status='in_progress',
        )
        self.client = Client()

    def test_referral_creation(self):
        res = self.client.post(
            '/api/referrals/',
            {
                'patient': self.patient.id,
                'referring_doctor': self.doctor.id,
                'referring_facility': self.hospital.id,
                'receiving_department': 'Cardiology',
                'referral_type': 'specialist',
                'urgency_level': 'urgent',
                'reason': 'Specialist consultation needed',
                'primary_diagnosis': 'Hypertension',
                'clinical_summary': 'Patient has high blood pressure',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Referral.objects.count(), 1)
        referral = Referral.objects.first()
        self.assertEqual(referral.status, 'draft')

    def test_referral_submission(self):
        referral = Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_department='Cardiology',
            reason='Consultation needed',
            status='draft',
        )
        res = self.client.post(
            f'/api/referrals/{referral.id}/submit/',
            {},
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        referral.refresh_from_db()
        self.assertEqual(referral.status, 'submitted')

    def test_referral_acceptance(self):
        receiving_doctor = User.objects.create_user(
            username='recv_doctor', password='password123', role='doctor',
            hospital=self.other_hospital,
        )
        referral = Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_facility=self.other_hospital,
            receiving_department='Cardiology',
            reason='Consultation needed',
            status='submitted',
        )
        res = self.client.post(
            f'/api/referrals/{referral.id}/accept/',
            {},
            **_auth_headers(receiving_doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        referral.refresh_from_db()
        self.assertEqual(referral.status, 'accepted')
        self.assertEqual(referral.accepted_by, receiving_doctor)

    def test_referral_rejection(self):
        receiving_doctor = User.objects.create_user(
            username='recv_doctor2', password='password123', role='doctor',
            hospital=self.other_hospital,
        )
        referral = Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_facility=self.other_hospital,
            receiving_department='Cardiology',
            reason='Consultation needed',
            status='submitted',
        )
        res = self.client.post(
            f'/api/referrals/{referral.id}/reject/',
            {'reason': 'Patient not suitable'},
            **_auth_headers(receiving_doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        referral.refresh_from_db()
        self.assertEqual(referral.status, 'rejected')
        self.assertEqual(referral.rejection_reason, 'Patient not suitable')

    def test_referral_completion(self):
        referral = Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_department='Cardiology',
            reason='Consultation needed',
            status='accepted',
        )
        res = self.client.post(
            f'/api/referrals/{referral.id}/complete/',
            {},
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        referral.refresh_from_db()
        self.assertEqual(referral.status, 'completed')
        self.assertIsNotNone(referral.completed_at)

    def test_referral_timeline_integration(self):
        referral = Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_department='Cardiology',
            reason='Consultation needed',
            status='draft',
        )
        self.client.post(
            f'/api/referrals/{referral.id}/submit/',
            {},
            **_auth_headers(self.doctor),
        )
        self.client.post(
            f'/api/referrals/{referral.id}/submit/',
            {},
            **_auth_headers(self.doctor),
        )
        timeline_events = TimelineEvent.objects.filter(patient=self.patient, event_type='referral')
        self.assertTrue(timeline_events.exists())

    def test_referral_role_permissions(self):
        referral = Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_department='Cardiology',
            reason='Consultation needed',
            status='draft',
        )
        res = self.client.post(
            f'/api/referrals/{referral.id}/submit/',
            {},
            **_auth_headers(self.nurse),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class InpatientTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='TH')
        self.admin = User.objects.create_user(
            username='admin', password='admin123', role='administrator',
            hospital=self.hospital, is_staff=True, is_superuser=True,
        )
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor',
            hospital=self.hospital,
        )
        self.nurse = User.objects.create_user(
            username='nurse', password='nurse123', role='nurse',
            hospital=self.hospital,
        )
        self.pharmacist = User.objects.create_user(
            username='pharmacist', password='pharm123', role='pharmacist',
            hospital=self.hospital,
        )
        self.lab_tech = User.objects.create_user(
            username='labtech', password='lab123', role='lab_technician',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P001', full_name='John Doe', hospital=self.hospital,
        )
        self.ward = Ward.objects.create(hospital=self.hospital, name='Ward A', code='WA', department='General Medicine')
        self.room = Room.objects.create(ward=self.ward, room_number='101', capacity=4)
        self.bed1 = Bed.objects.create(room=self.room, bed_number='B1', bed_type='general')
        self.bed2 = Bed.objects.create(room=self.room, bed_number='B2', bed_type='general')
        self.client_obj = Client()

    def test_inpatient_admission(self):
        res = self.client_obj.post(
            '/api/admissions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'admission_type': 'emergency',
                'admission_reason': 'Severe hypertension',
                'primary_diagnosis': 'Hypertensive crisis',
                'ward': self.ward.id,
                'room': self.room.id,
                'bed': self.bed1.id,
                'insurance_type': 'self_pay',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Admission.objects.count(), 1)
        admission = Admission.objects.first()
        self.assertEqual(admission.status, 'admitted')
        self.bed1.refresh_from_db()
        self.assertEqual(self.bed1.status, 'occupied')
        self.assertEqual(self.bed1.current_patient, self.patient)

    def test_bed_assignment(self):
        res = self.client_obj.post(
            '/api/admissions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'admission_type': 'emergency',
                'primary_diagnosis': 'Hypertensive crisis',
                'ward': self.ward.id,
                'room': self.room.id,
                'bed': self.bed1.id,
                'insurance_type': 'self_pay',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.bed1.refresh_from_db()
        self.assertEqual(self.bed1.status, 'occupied')

    def test_duplicate_bed_prevention(self):
        other_patient = Patient.objects.create(
            patient_id='P002', full_name='Jane Smith', hospital=self.hospital,
        )
        Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
        )
        self.bed1.status = 'occupied'
        self.bed1.current_patient = self.patient
        self.bed1.save()
        res = self.client_obj.post(
            '/api/admissions/',
            {
                'patient': other_patient.id,
                'doctor': self.doctor.id,
                'admission_type': 'elective',
                'primary_diagnosis': 'Test2',
                'ward': self.ward.id,
                'room': self.room.id,
                'bed': self.bed1.id,
                'insurance_type': 'self_pay',
            },
            **_auth_headers(self.doctor),
        )
        self.assertNotEqual(res.status_code, status.HTTP_201_CREATED)

    def test_ward_transfer(self):
        other_ward = Ward.objects.create(hospital=self.hospital, name='Ward B', code='WB', department='ICU')
        other_room = Room.objects.create(ward=other_ward, room_number='201', capacity=2)
        other_bed = Bed.objects.create(room=other_room, bed_number='C1', bed_type='icu')
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        self.bed1.status = 'occupied'
        self.bed1.current_patient = self.patient
        self.bed1.save()

        res = self.client_obj.post(
            f'/api/admissions/{admission.id}/transfer/',
            {
                'to_ward': other_ward.id,
                'to_room': other_room.id,
                'to_bed': other_bed.id,
                'reason': 'ICU transfer needed',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        admission.refresh_from_db()
        self.assertEqual(admission.ward, other_ward)
        self.bed1.refresh_from_db()
        self.assertEqual(self.bed1.status, 'available')
        self.assertIsNone(self.bed1.current_patient)
        other_bed.refresh_from_db()
        self.assertEqual(other_bed.status, 'occupied')

    def test_inpatient_vital_signs(self):
        res = self.client_obj.post(
            '/api/vitals/',
            {
                'patient': self.patient.id,
                'temperature_c': 38.5,
                'pulse_bpm': 90,
                'blood_pressure': '140/90',
            },
            **_auth_headers(self.nurse),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VitalSign.objects.count(), 1)

    def test_inpatient_handover(self):
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        res = self.client_obj.post(
            '/api/handovers/',
            {
                'sender': self.doctor.id,
                'receiver': self.nurse.id,
                'patient_ids': [self.patient.id],
                'patient_notes': [{'id': self.patient.id, 'diagnosis': 'Hypertension', 'current_condition': 'Stable'}],
                'additional_notes': 'Handing over inpatient care',
            },
            content_type='application/json',
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Handover.objects.count(), 1)

    def test_inpatient_lab_workflow(self):
        lab_res = self.client_obj.post(
            '/api/inpatient-lab-requests/',
            {
                'patient': self.patient.id,
                'requested_by': self.doctor.id,
                'test_name': 'CBC',
                'priority': 'routine',
                'clinical_notes': 'Routine checkup',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(lab_res.status_code, status.HTTP_201_CREATED)
        lab_req = InpatientLabRequest.objects.first()
        self.assertEqual(lab_req.status, 'pending')

        collect_res = self.client_obj.post(
            f'/api/inpatient-lab-requests/{lab_req.id}/collect_sample/',
            {},
            **_auth_headers(self.lab_tech),
        )
        self.assertEqual(collect_res.status_code, status.HTTP_200_OK)
        lab_req.refresh_from_db()
        self.assertEqual(lab_req.status, 'sample_collected')
        self.assertEqual(lab_req.sample_collected_by, self.lab_tech)

        complete_res = self.client_obj.post(
            f'/api/inpatient-lab-requests/{lab_req.id}/complete/',
            {'result': 'Normal'},
            **_auth_headers(self.lab_tech),
        )
        self.assertEqual(complete_res.status_code, status.HTTP_200_OK)
        lab_req.refresh_from_db()
        self.assertEqual(lab_req.status, 'completed')

    def test_inpatient_prescription(self):
        res = self.client_obj.post(
            '/api/inpatient-prescriptions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'medication': 'Lisinopril',
                'dosage': '10mg',
                'instructions': 'Once daily',
                'frequency': 'daily',
                'duration': '30 days',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InpatientPrescription.objects.count(), 1)

    def test_inpatient_pharmacy(self):
        stock_item = StockItem.objects.create(
            hospital=self.hospital, name='Aspirin', code='ASP001',
            current_quantity=100, minimum_stock_level=10,
        )
        res = self.client_obj.post(
            '/api/stock-movements/',
            {
                'stock_item': stock_item.id,
                'movement_type': 'out',
                'quantity': 5,
                'reference': 'Inpatient prescription',
            },
            **_auth_headers(self.pharmacist),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        stock_item.refresh_from_db()
        self.assertEqual(stock_item.current_quantity, 95)

    def test_inpatient_billing(self):
        bill_res = self.client_obj.post(
            '/api/bills/',
            {
                'patient': self.patient.id,
                'hospital': self.hospital.id,
                'bill_type': 'admission',
                'total_amount': '5000.00',
                'covered_by_insurance': '0.00',
                'patient_co_pay': '5000.00',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(bill_res.status_code, status.HTTP_201_CREATED)

        item_res = self.client_obj.post(
            '/api/bill-items/',
            {
                'bill': bill_res.json()['id'],
                'item_type': 'admission',
                'description': 'Ward fee',
                'quantity': 3,
                'unit_price': '100.00',
                'total_price': '300.00',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(item_res.status_code, status.HTTP_201_CREATED)

    def test_nhis_billing(self):
        nhis_res = self.client_obj.post(
            '/api/nhis-records/',
            {
                'patient': self.patient.id,
                'nhis_number': 'NHIS001',
                'membership_status': 'active',
                'scheme_type': 'standard',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(nhis_res.status_code, status.HTTP_201_CREATED)

        bill_res = self.client_obj.post(
            '/api/bills/',
            {
                'patient': self.patient.id,
                'hospital': self.hospital.id,
                'bill_type': 'admission',
                'total_amount': '10000.00',
                'covered_by_insurance': '8000.00',
                'patient_co_pay': '2000.00',
                'insurance_claim_status': 'submitted',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(bill_res.status_code, status.HTTP_201_CREATED)

    def test_private_insurance_billing(self):
        ic = InsuranceCompany.objects.create(name='Private Ins', code='PI', insurance_type='private')
        self.client_obj.post(
            '/api/private-insurance-records/',
            {
                'patient': self.patient.id,
                'insurance_company': ic.id,
                'membership_number': 'PRIV001',
            },
            **_auth_headers(self.doctor),
        )
        bill_res = self.client_obj.post(
            '/api/bills/',
            {
                'patient': self.patient.id,
                'hospital': self.hospital.id,
                'bill_type': 'procedure',
                'total_amount': '3000.00',
                'covered_by_insurance': '2500.00',
                'patient_co_pay': '500.00',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(bill_res.status_code, status.HTTP_201_CREATED)

    def test_discharge(self):
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Hypertensive crisis',
            insurance_type='self_pay',
            status='admitted',
            discharge_diagnosis='Resolved',
            condition_at_discharge='Stable',
        )
        self.bed1.status = 'occupied'
        self.bed1.current_patient = self.patient
        self.bed1.save()

        res = self.client_obj.patch(
            f'/api/admissions/{admission.id}/',
            {
                'status': 'discharged',
                'discharge_status': 'discharged',
                'discharge_date': timezone.now().isoformat(),
                'discharge_diagnosis': 'Hypertensive crisis - resolved',
                'condition_at_discharge': 'Stable',
                'treatment_provided': 'IV medication',
                'discharge_medications': 'Lisinopril 10mg',
                'follow_up_instructions': 'Follow up in 2 weeks',
            },
            content_type='application/json',
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        admission.refresh_from_db()
        self.assertEqual(admission.status, 'discharged')

    def test_bed_release_after_discharge(self):
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        self.bed1.status = 'occupied'
        self.bed1.current_patient = self.patient
        self.bed1.save()

        self.client_obj.patch(
            f'/api/admissions/{admission.id}/',
            {'status': 'discharged', 'discharge_status': 'discharged', 'discharge_date': timezone.now().isoformat()},
            content_type='application/json',
            **_auth_headers(self.doctor),
        )
        self.bed1.refresh_from_db()
        self.assertEqual(self.bed1.status, 'available')
        self.assertIsNone(self.bed1.current_patient)

    def test_inpatient_audit_logging(self):
        self.client_obj.post(
            '/api/admissions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'admission_type': 'emergency',
                'primary_diagnosis': 'Test diagnosis',
                'ward': self.ward.id,
                'bed': self.bed1.id,
                'insurance_type': 'self_pay',
            },
            **_auth_headers(self.doctor),
        )
        audit_logs = AuditLog.objects.filter(action='admission_created')
        self.assertTrue(audit_logs.exists())

    def test_inpatient_permissions(self):
        res = self.client_obj.post(
            '/api/admissions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'admission_type': 'emergency',
                'primary_diagnosis': 'Test',
                'insurance_type': 'self_pay',
            },
            **_auth_headers(self.nurse),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_nurse_can_view_admissions(self):
        Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        res = self.client_obj.get('/api/admissions/', **_auth_headers(self.nurse))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(len(data) >= 1)

    def test_referral_sync_pull(self):
        Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_department='Cardiology',
            reason='Consultation needed',
            status='draft',
        )
        res = self.client_obj.get('/api/sync/pull/', **_auth_headers(self.doctor))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        referral_items = [i for i in data['items'] if i['entity_type'] == 'referrals']
        self.assertTrue(len(referral_items) > 0)

    def test_inpatient_sync_pull(self):
        Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        res = self.client_obj.get('/api/sync/pull/', **_auth_headers(self.doctor))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        admission_items = [i for i in data['items'] if i['entity_type'] == 'admissions']
        self.assertTrue(len(admission_items) > 0)

    def test_referral_reporting(self):
        Referral.objects.create(
            patient=self.patient,
            referring_doctor=self.doctor,
            referring_facility=self.hospital,
            receiving_department='Cardiology',
            reason='Consultation',
            urgency_level='urgent',
            is_emergency=True,
            status='submitted',
        )
        res = self.client_obj.get('/api/reports/referral-stats/', **_auth_headers(self.doctor))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('total_referrals', data)
        self.assertGreaterEqual(data['total_referrals'], 1)
        self.assertGreaterEqual(data['emergency_referrals'], 1)

    def test_inpatient_reporting(self):
        Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='discharged',
            discharge_date=timezone.now(),
            discharge_status='discharged',
        )
        res = self.client_obj.get('/api/reports/inpatient-stats/', **_auth_headers(self.doctor))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('total_admissions', data)
        self.assertGreaterEqual(data['total_admissions'], 1)

    def test_inpatient_clinical_note(self):
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        res = self.client_obj.post(
            '/api/inpatient-notes/',
            {
                'admission': admission.id,
                'patient': self.patient.id,
                'note_type': 'clinical',
                'title': 'Daily Rounds',
                'content': 'Patient is stable, BP 130/80',
                'is_critical': False,
            },
            **_auth_headers(self.nurse),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InpatientNote.objects.count(), 1)
        notes = InpatientNote.objects.filter(patient=self.patient)
        self.assertEqual(notes.count(), 1)

    def test_medication_administration(self):
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=self.ward,
            room=self.room,
            bed=self.bed1,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        res = self.client_obj.post(
            '/api/med-admins/',
            {
                'admission': admission.id,
                'patient': self.patient.id,
                'medication': 'Paracetamol',
                'dosage': '500mg',
                'route': 'oral',
                'was_given': True,
            },
            **_auth_headers(self.nurse),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_admission_requires_patient(self):
        res = self.client_obj.post(
            '/api/admissions/',
            {
                'doctor': self.doctor.id,
                'admission_type': 'emergency',
                'primary_diagnosis': 'Test',
                'insurance_type': 'self_pay',
            },
            **_auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class IdempotencyTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital', code='ITH')
        self.doctor = User.objects.create_user(
            username='idoc', password='idoc123', role='doctor',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P200', full_name='Idem Patient', hospital=self.hospital,
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient, doctor=self.doctor, encounter_type='consultation',
            status='completed',
        )
        self.bill = Bill.objects.create(
            patient=self.patient,
            encounter=self.encounter,
            hospital=self.hospital,
            bill_type='consultation',
            total_amount='200.00',
            status='pending',
        )
        self.client = Client()

    def _idem_headers(self, key: str):
        return {**_auth_headers(self.doctor), 'HTTP_IDEMPOTENCY_KEY': key}

    def test_first_payment_succeeds(self):
        res = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers('key-first-ok'),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(IdempotencyKey.objects.count(), 1)
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, 'paid')

    def test_duplicate_payment_with_same_idempotency_key(self):
        res1 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers('key-dup-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)

        res2 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers('key-dup-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_different_idempotency_keys_create_separate_payments(self):
        res1 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '100.00',
            },
            **self._idem_headers('key-diff-a'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '100.00',
            },
            **self._idem_headers('key-diff-b'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 2)
        self.assertNotEqual(res1.data['id'], res2.data['id'])

    def test_retry_after_simulated_lost_response(self):
        key = 'key-retry-lost'
        res1 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers(key),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)

        res2 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers(key),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_concurrent_duplicate_requests(self):
        key = 'key-rapid'
        res1 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers(key),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        res2 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers(key),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_different_users_same_key_do_not_collide(self):
        other_user = User.objects.create_user(
            username='other', password='other123', role='doctor',
            hospital=self.hospital,
        )
        res1 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **self._idem_headers('key-cross-user'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '200.00',
            },
            **{**_auth_headers(other_user), 'HTTP_IDEMPOTENCY_KEY': 'key-cross-user'},
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 2)
        self.assertNotEqual(res1.data['id'], res2.data['id'])

    def test_bill_create_idempotency(self):
        initial_count = Bill.objects.count()
        res1 = self.client.post(
            '/api/bills/',
            {
                'patient': self.patient.id,
                'encounter': self.encounter.id,
                'hospital': self.hospital.id,
                'bill_type': 'consultation',
                'total_amount': '100.00',
                'status': 'pending',
            },
            **self._idem_headers('key-bill-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bill.objects.count(), initial_count + 1)

        res2 = self.client.post(
            '/api/bills/',
            {
                'patient': self.patient.id,
                'encounter': self.encounter.id,
                'hospital': self.hospital.id,
                'bill_type': 'consultation',
                'total_amount': '100.00',
                'status': 'pending',
            },
            **self._idem_headers('key-bill-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bill.objects.count(), initial_count + 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_mark_paid_idempotency(self):
        res1 = self.client.post(
            f'/api/bills/{self.bill.id}/mark_paid/',
            {},
            **self._idem_headers('key-mark-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, 'partial')

        res2 = self.client.post(
            f'/api/bills/{self.bill.id}/mark_paid/',
            {},
            **self._idem_headers('key-mark-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['status'], 'partial')


class ExtendedIdempotencyTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Test Hospital 2', code='TH2')
        self.doctor = User.objects.create_user(
            username='edoc', password='edoc123', role='doctor',
            hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='P300', full_name='Idem Patient 2', hospital=self.hospital,
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient, doctor=self.doctor, encounter_type='consultation',
            status='completed',
        )
        self.bill = Bill.objects.create(
            patient=self.patient,
            encounter=self.encounter,
            hospital=self.hospital,
            bill_type='consultation',
            total_amount='300.00',
            status='pending',
        )
        self.client = Client()

    def _idem_headers(self, key: str):
        return {**_auth_headers(self.doctor), 'HTTP_IDEMPOTENCY_KEY': key}

    def test_billitem_create_idempotency(self):
        res1 = self.client.post(
            '/api/bill-items/',
            {
                'bill': self.bill.id,
                'item_type': 'consultation',
                'description': 'Consultation',
                'quantity': 1,
                'unit_price': '100.00',
                'total_price': '100.00',
            },
            **self._idem_headers('key-bi-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BillItem.objects.count(), 1)

        res2 = self.client.post(
            '/api/bill-items/',
            {
                'bill': self.bill.id,
                'item_type': 'consultation',
                'description': 'Consultation',
                'quantity': 1,
                'unit_price': '100.00',
                'total_price': '100.00',
            },
            **self._idem_headers('key-bi-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BillItem.objects.count(), 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_payment_update_idempotency(self):
        payment = Payment.objects.create(
            bill=self.bill,
            payment_method='cash',
            amount='100.00',
        )
        res1 = self.client.put(
            f'/api/payments/{payment.id}/',
            {'bill': self.bill.id, 'payment_method': 'mobile_money', 'amount': '100.00'},
            **self._idem_headers('key-pay-upd-1'),
            content_type='application/json',
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        res2 = self.client.put(
            f'/api/payments/{payment.id}/',
            {'bill': self.bill.id, 'payment_method': 'mobile_money', 'amount': '100.00'},
            **self._idem_headers('key-pay-upd-1'),
            content_type='application/json',
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['id'], payment.id)

    def test_payment_delete_idempotency(self):
        payment = Payment.objects.create(
            bill=self.bill,
            payment_method='cash',
            amount='100.00',
        )
        res1 = self.client.delete(
            f'/api/payments/{payment.id}/',
            **self._idem_headers('key-pay-del-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Payment.objects.count(), 0)

        res2 = self.client.delete(
            f'/api/payments/{payment.id}/',
            **self._idem_headers('key-pay-del-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Payment.objects.count(), 0)

    def test_stock_movement_create_idempotency(self):
        stock = StockItem.objects.create(
            hospital=self.hospital,
            name='Paracetamol',
            code='MED001',
            category='Medicine',
            unit='tablet',
            current_quantity=100,
            minimum_stock_level=20,
            unit_cost='0.50',
            is_active=True,
        )
        res1 = self.client.post(
            '/api/stock-movements/',
            {
                'stock_item': stock.id,
                'movement_type': 'out',
                'quantity': 10,
                'notes': 'Dispensed',
            },
            **self._idem_headers('key-move-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StockMovement.objects.count(), 1)

        res2 = self.client.post(
            '/api/stock-movements/',
            {
                'stock_item': stock.id,
                'movement_type': 'out',
                'quantity': 10,
                'notes': 'Dispensed',
            },
            **self._idem_headers('key-move-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StockMovement.objects.count(), 1)

    def test_stock_item_create_idempotency(self):
        res1 = self.client.post(
            '/api/stock-items/',
            {
                'hospital': self.hospital.id,
                'name': 'Aspirin',
                'code': 'MED002',
                'category': 'Medicine',
                'unit': 'tablet',
                'current_quantity': 50,
                'minimum_stock_level': 10,
                'unit_cost': '0.30',
                'is_active': True,
            },
            **self._idem_headers('key-stock-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StockItem.objects.count(), 1)

        res2 = self.client.post(
            '/api/stock-items/',
            {
                'hospital': self.hospital.id,
                'name': 'Aspirin',
                'code': 'MED002',
                'category': 'Medicine',
                'unit': 'tablet',
                'current_quantity': 50,
                'minimum_stock_level': 10,
                'unit_cost': '0.30',
                'is_active': True,
            },
            **self._idem_headers('key-stock-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StockItem.objects.count(), 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_admission_create_idempotency(self):
        ward = Ward.objects.create(
            hospital=self.hospital,
            name='General',
            code='GEN',
            department='General',
        )
        res1 = self.client.post(
            '/api/admissions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'admission_type': 'emergency',
                'primary_diagnosis': 'Test',
                'insurance_type': 'self_pay',
                'ward': ward.id,
            },
            **self._idem_headers('key-adm-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Admission.objects.count(), 1)

        res2 = self.client.post(
            '/api/admissions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'admission_type': 'emergency',
                'primary_diagnosis': 'Test',
                'insurance_type': 'self_pay',
                'ward': ward.id,
            },
            **self._idem_headers('key-adm-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Admission.objects.count(), 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_admission_discharge_idempotency(self):
        ward = Ward.objects.create(
            hospital=self.hospital,
            name='General 2',
            code='GEN2',
            department='General',
        )
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=ward,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        res1 = self.client.post(
            f'/api/admissions/{admission.id}/discharge/',
            {'discharge_diagnosis': 'Stable'},
            **self._idem_headers('key-dis-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        admission.refresh_from_db()
        self.assertEqual(admission.status, 'discharged')

        res2 = self.client.post(
            f'/api/admissions/{admission.id}/discharge/',
            {'discharge_diagnosis': 'Stable'},
            **self._idem_headers('key-dis-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['status'], 'discharged')

    def test_inpatient_prescription_create_idempotency(self):
        res1 = self.client.post(
            '/api/inpatient-prescriptions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'medication': 'Paracetamol',
                'dosage': '500mg',
                'frequency': 'TDS',
                'duration': '5 days',
            },
            **self._idem_headers('key-rx-1'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InpatientPrescription.objects.count(), 1)

        res2 = self.client.post(
            '/api/inpatient-prescriptions/',
            {
                'patient': self.patient.id,
                'doctor': self.doctor.id,
                'medication': 'Paracetamol',
                'dosage': '500mg',
                'frequency': 'TDS',
                'duration': '5 days',
            },
            **self._idem_headers('key-rx-1'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InpatientPrescription.objects.count(), 1)
        self.assertEqual(res2.data['id'], res1.data['id'])

    def test_delete_retry_returns_cached_response(self):
        payment = Payment.objects.create(
            bill=self.bill,
            payment_method='cash',
            amount='100.00',
        )
        res1 = self.client.delete(
            f'/api/payments/{payment.id}/',
            **self._idem_headers('key-del-retry'),
        )
        self.assertEqual(res1.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Payment.objects.count(), 0)

        res2 = self.client.delete(
            f'/api/payments/{payment.id}/',
            **self._idem_headers('key-del-retry'),
        )
        self.assertEqual(res2.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Payment.objects.count(), 0)

    def test_put_retry_returns_cached_response(self):
        payment = Payment.objects.create(
            bill=self.bill,
            payment_method='cash',
            amount='100.00',
        )
        res1 = self.client.put(
            f'/api/payments/{payment.id}/',
            {'bill': self.bill.id, 'payment_method': 'mobile_money', 'amount': '100.00'},
            **self._idem_headers('key-upd-retry'),
            content_type='application/json',
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['payment_method'], 'mobile_money')

        res2 = self.client.put(
            f'/api/payments/{payment.id}/',
            {'bill': self.bill.id, 'payment_method': 'mobile_money', 'amount': '100.00'},
            **self._idem_headers('key-upd-retry'),
            content_type='application/json',
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['payment_method'], 'mobile_money')
        self.assertEqual(res2.data['id'], payment.id)

    def test_discharge_retry_returns_cached_response(self):
        ward = Ward.objects.create(
            hospital=self.hospital,
            name='General 3',
            code='GEN3',
            department='General',
        )
        admission = Admission.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ward=ward,
            admission_type='emergency',
            primary_diagnosis='Test',
            insurance_type='self_pay',
            status='admitted',
        )
        res1 = self.client.post(
            f'/api/admissions/{admission.id}/discharge/',
            {'discharge_diagnosis': 'Stable'},
            **self._idem_headers('key-dis-retry'),
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        admission.refresh_from_db()
        self.assertEqual(admission.status, 'discharged')

        res2 = self.client.post(
            f'/api/admissions/{admission.id}/discharge/',
            {'discharge_diagnosis': 'Stable'},
            **self._idem_headers('key-dis-retry'),
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['status'], 'discharged')

    def test_same_key_different_resource_type_is_isolated(self):
        stock = StockItem.objects.create(
            hospital=self.hospital,
            name='Isolated Stock',
            code='ISO001',
            category='Medicine',
            unit='tablet',
            current_quantity=50,
            minimum_stock_level=10,
            unit_cost='0.50',
            is_active=True,
        )
        res1 = self.client.post(
            '/api/payments/',
            {
                'bill': self.bill.id,
                'payment_method': 'cash',
                'amount': '100.00',
            },
            **self._idem_headers('key-cross-type'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post(
            '/api/stock-movements/',
            {
                'stock_item': stock.id,
                'movement_type': 'out',
                'quantity': 5,
                'notes': 'Dispensed',
            },
            **self._idem_headers('key-cross-type'),
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(StockMovement.objects.count(), 1)
        self.assertIn('payment_method', res1.data)
        self.assertIn('movement_type', res2.data)

    def test_create_then_update_same_key_does_not_collide(self):
        res1 = self.client.post(
            '/api/stock-items/',
            {
                'hospital': self.hospital.id,
                'name': 'CreateUpdate',
                'code': 'CU001',
                'category': 'Medicine',
                'unit': 'tablet',
                'current_quantity': 100,
                'minimum_stock_level': 10,
                'unit_cost': '0.50',
                'is_active': True,
            },
            **self._idem_headers('key-create-upd'),
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        stock_id = res1.data['id']

        res2 = self.client.put(
            f'/api/stock-items/{stock_id}/',
            {
                'hospital': self.hospital.id,
                'name': 'CreateUpdated',
                'code': 'CU001',
                'category': 'Medicine',
                'unit': 'tablet',
                'current_quantity': 200,
                'minimum_stock_level': 10,
                'unit_cost': '0.50',
                'is_active': True,
            },
            **self._idem_headers('key-create-upd'),
            content_type='application/json',
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['name'], 'CreateUpdated')
        self.assertEqual(res2.data['current_quantity'], 200)


class MaternityTests(TestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name='Maternity Hospital', code='MH')
        self.midwife = User.objects.create_user(
            username='midwife', password='midwife123', role='midwife', hospital=self.hospital,
        )
        self.doctor = User.objects.create_user(
            username='doctor', password='doctor123', role='doctor', hospital=self.hospital,
        )
        self.admin = User.objects.create_user(
            username='admin', password='admin123', role='administrator', hospital=self.hospital,
        )
        self.patient = Patient.objects.create(
            patient_id='M001', full_name='Maria Santos', hospital=self.hospital,
            date_of_birth='1994-06-15', gender='Female', blood_group='O+',
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient, doctor=self.doctor, encounter_type='antenatal', status='in_progress',
        )
        self.client = Client()

    def _auth_headers(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        return {'HTTP_AUTHORIZATION': f'Token {token.key}'}

    def test_midwife_can_create_antenatal_record(self):
        res = self.client.post(
            '/api/antenatal-records/',
            {'patient': self.patient.id, 'gravida': 2, 'para': 1, 'risk_classification': 'low_risk'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AntenatalRecord.objects.count(), 1)

    def test_doctor_cannot_create_antenatal_record(self):
        res = self.client.post(
            '/api/antenatal-records/',
            {'patient': self.patient.id, 'gravida': 2, 'para': 1},
            **self._auth_headers(self.doctor),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_antenatal_record(self):
        res = self.client.post(
            '/api/antenatal-records/',
            {'patient': self.patient.id, 'gravida': 2, 'para': 1},
            **self._auth_headers(self.admin),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_antenatal_record_timeline_created(self):
        self.client.post(
            '/api/antenatal-records/',
            {'patient': self.patient.id, 'gravida': 2, 'para': 1},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(TimelineEvent.objects.filter(event_type='antenatal').count(), 1)

    def test_midwife_can_create_labour_record(self):
        res = self.client.post(
            '/api/labour-records/',
            {'patient': self.patient.id, 'labour_status': 'active', 'cervical_dilation': '4cm'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LabourRecord.objects.count(), 1)

    def test_midwife_can_record_delivery(self):
        res = self.client.post(
            '/api/deliveries/',
            {'patient': self.patient.id, 'delivery_type': 'vaginal', 'delivery_outcome': 'live_birth', 'maternal_outcome': 'stable'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Delivery.objects.count(), 1)

    def test_delivery_creates_timeline_event(self):
        res = self.client.post(
            '/api/deliveries/',
            {'patient': self.patient.id, 'delivery_type': 'vaginal', 'delivery_outcome': 'live_birth'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TimelineEvent.objects.filter(event_type='delivery').count(), 1)

    def test_midwife_can_create_fetal_assessment(self):
        res = self.client.post(
            '/api/fetal-assessments/',
            {'patient': self.patient.id, 'fetal_heart_rate': 140, 'fetal_movement': 'normal'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FetalAssessment.objects.count(), 1)

    def test_midwife_can_create_postnatal_record(self):
        res = self.client.post(
            '/api/postnatal-records/',
            {'patient': self.patient.id, 'postnatal_status': 'stable', 'feeding_status': 'breastfeeding'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PostnatalRecord.objects.count(), 1)

    def test_midwife_can_create_maternity_note(self):
        res = self.client.post(
            '/api/maternity-notes/',
            {'patient': self.patient.id, 'maternity_status': 'antenatal', 'progress': 'Doing well'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MaternityNote.objects.count(), 1)

    def test_maternity_note_timeline_created(self):
        res = self.client.post(
            '/api/maternity-notes/',
            {'patient': self.patient.id, 'maternity_status': 'antenatal', 'progress': 'Doing well'},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TimelineEvent.objects.filter(event_type='maternity_note').count(), 1)

    def test_midwife_can_create_newborn_record(self):
        delivery = Delivery.objects.create(
            patient=self.patient, delivery_type='vaginal', delivery_outcome='live_birth',
        )
        res = self.client.post(
            '/api/newborns/',
            {'mother': self.patient.id, 'delivery': delivery.id, 'sex': 'female', 'birth_weight': 3.2},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Newborn.objects.count(), 1)

    def test_newborn_creates_timeline_event(self):
        delivery = Delivery.objects.create(
            patient=self.patient, delivery_type='vaginal', delivery_outcome='live_birth',
        )
        res = self.client.post(
            '/api/newborns/',
            {'mother': self.patient.id, 'delivery': delivery.id, 'sex': 'male', 'birth_weight': 3.5},
            **self._auth_headers(self.midwife),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TimelineEvent.objects.filter(event_type='newborn').count(), 1)

    def test_midwife_can_list_antenatal_records(self):
        AntenatalRecord.objects.create(patient=self.patient, gravida=2, para=1)
        res = self.client.get('/api/antenatal-records/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results'] if 'results' in res.data else res.data), 1)

    def test_midwife_can_list_labour_records(self):
        LabourRecord.objects.create(patient=self.patient, labour_status='active')
        res = self.client.get('/api/labour-records/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results'] if 'results' in res.data else res.data), 1)

    def test_midwife_can_list_deliveries(self):
        Delivery.objects.create(patient=self.patient, delivery_type='vaginal', delivery_outcome='live_birth')
        res = self.client.get('/api/deliveries/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results'] if 'results' in res.data else res.data), 1)

    def test_midwife_can_list_fetal_assessments(self):
        FetalAssessment.objects.create(patient=self.patient, fetal_heart_rate=140)
        res = self.client.get('/api/fetal-assessments/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results'] if 'results' in res.data else res.data), 1)

    def test_midwife_can_list_postnatal_records(self):
        PostnatalRecord.objects.create(patient=self.patient, postnatal_status='stable')
        res = self.client.get('/api/postnatal-records/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results'] if 'results' in res.data else res.data), 1)

    def test_midwife_can_list_maternity_notes(self):
        MaternityNote.objects.create(patient=self.patient, maternity_status='antenatal')
        res = self.client.get('/api/maternity-notes/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results'] if 'results' in res.data else res.data), 1)

    def test_midwife_can_list_newborns(self):
        delivery = Delivery.objects.create(
            patient=self.patient, delivery_type='vaginal', delivery_outcome='live_birth',
        )
        Newborn.objects.create(mother=self.patient, delivery=delivery, sex='female')
        res = self.client.get('/api/newborns/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results'] if 'results' in res.data else res.data), 1)

    def test_sync_pull_includes_maternity_resources(self):
        AntenatalRecord.objects.create(patient=self.patient, gravida=2, para=1)
        res = self.client.get('/api/sync/pull/', **self._auth_headers(self.midwife))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        entity_types = [item['entity_type'] for item in res.data['items']]
        self.assertIn('antenatal-records', entity_types)
