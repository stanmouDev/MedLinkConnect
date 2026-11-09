from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('routine', 'Routine'),
    ('medium', 'Medium'),
    ('high', 'High'),
    ('urgent', 'Urgent'),
    ('critical', 'Critical'),
]

HANDOVER_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('accepted', 'Accepted'),
    ('rejected', 'Rejected'),
    ('completed', 'Completed'),
    ('cancelled', 'Cancelled'),
]

LAB_REQUEST_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('sample_collected', 'Sample Collected'),
    ('processing', 'Processing'),
    ('completed', 'Completed'),
    ('cancelled', 'Cancelled'),
]

RESULT_STATUS_CHOICES = [
    ('normal', 'Normal'),
    ('abnormal', 'Abnormal'),
    ('critical', 'Critical'),
]

INSURANCE_TYPE_CHOICES = [
    ('nhis', 'NHIS'),
    ('private', 'Private Insurance'),
    ('self_pay', 'Self-Pay'),
]

MEMBERSHIP_STATUS_CHOICES = [
    ('active', 'Active'),
    ('expired', 'Expired'),
    ('inactive', 'Inactive'),
    ('pending', 'Pending'),
]

PAYMENT_METHOD_CHOICES = [
    ('cash', 'Cash'),
    ('mobile_money', 'Mobile Money'),
    ('bank_card', 'Bank Card'),
    ('bank_transfer', 'Bank Transfer'),
    ('insurance', 'Insurance'),
    ('mixed', 'Mixed Payment'),
]

BILL_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('partial', 'Partially Paid'),
    ('paid', 'Paid'),
    ('overdue', 'Overdue'),
    ('cancelled', 'Cancelled'),
]

BILL_ITEM_TYPE_CHOICES = [
    ('consultation', 'Consultation'),
    ('laboratory', 'Laboratory'),
    ('pharmacy', 'Pharmacy'),
    ('imaging', 'Imaging'),
    ('procedure', 'Procedure'),
    ('admission', 'Admission'),
    ('surgery', 'Surgery'),
    ('emergency', 'Emergency Services'),
    ('other', 'Other'),
]

MOVEMENT_TYPE_CHOICES = [
    ('in', 'Stock In'),
    ('out', 'Stock Out'),
    ('adjustment', 'Adjustment'),
]

SCHEME_TYPE_CHOICES = [
    ('standard', 'Standard'),
    ('premium', 'Premium'),
    ('exemption', 'Exemption'),
    ('other', 'Other'),
]


class Hospital(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [
        ('administrator', 'Administrator'),
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('lab_technician', 'Laboratory Technician'),
        ('pharmacist', 'Pharmacist'),
        ('receptionist', 'Receptionist'),
        ('midwife', 'Midwife'),
        ('patient', 'Patient'),
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='patient')
    hospital = models.ForeignKey(Hospital, null=True, blank=True, on_delete=models.SET_NULL)
    mfa_enabled = models.BooleanField(default=False)
    is_offline_ready = models.BooleanField(default=True)


class Patient(models.Model):
    patient_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    insurance_type = models.CharField(max_length=20, choices=INSURANCE_TYPE_CHOICES, default='self_pay')
    next_of_kin = models.CharField(max_length=255, blank=True)
    occupation = models.CharField(max_length=100, blank=True)
    national_id = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE)

    def __str__(self):
        return self.full_name


class Encounter(models.Model):
    STATUS_CHOICES = [('scheduled', 'Scheduled'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled')]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='encounters')
    doctor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='doctor_encounters')
    nurse = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='nurse_encounters')
    encounter_type = models.CharField(max_length=50, default='consultation')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    symptoms = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    triage_level = models.CharField(max_length=20, default='routine')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


class VitalSign(models.Model):
    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name='vitals')
    encounter = models.ForeignKey(Encounter, null=True, blank=True, on_delete=models.CASCADE, related_name='vitals')
    temperature_c = models.FloatField(null=True, blank=True)
    pulse_bpm = models.IntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    oxygen_saturation = models.FloatField(null=True, blank=True)
    respiratory_rate = models.IntegerField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    blood_glucose = models.FloatField(null=True, blank=True)
    pain_score = models.IntegerField(null=True, blank=True)
    level_of_consciousness = models.CharField(max_length=50, blank=True)
    additional_notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    recorded_at = models.DateTimeField(default=timezone.now)


class Appointment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, default='scheduled')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class LabOrder(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_orders')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lab_requests')
    test_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, default='pending')
    result = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class Prescription(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='prescriptions')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions')
    medication = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)


class SyncRecord(models.Model):
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


class Handover(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='outgoing_handovers')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incoming_handovers')
    status = models.CharField(max_length=20, choices=HANDOVER_STATUS_CHOICES, default='pending')
    additional_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Handover {self.id}: {self.sender} -> {self.receiver}"


class HandoverPatient(models.Model):
    handover = models.ForeignKey(Handover, on_delete=models.CASCADE, related_name='patients')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    patient_name = models.CharField(max_length=255)
    patient_code = models.CharField(max_length=50)
    ward = models.CharField(max_length=100, blank=True)
    bed_number = models.CharField(max_length=50, blank=True)
    diagnosis = models.TextField(blank=True)
    current_condition = models.TextField(blank=True)
    vital_signs = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    treatments_given = models.TextField(blank=True)
    procedures_performed = models.TextField(blank=True)
    pending_lab_tests = models.TextField(blank=True)
    available_lab_results = models.TextField(blank=True)
    imaging_results = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    risks_precautions = models.TextField(blank=True)
    priority_level = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='stable')

    def __str__(self):
        return f"{self.patient_name} in handover {self.handover_id}"


class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_entity_type = models.CharField(max_length=100, blank=True)
    related_entity_id = models.CharField(max_length=100, blank=True)
    is_read = models.BooleanField(default=False)
    priority = models.CharField(max_length=20, default='normal')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.title} -> {self.recipient.username}"


class LabRequest(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_requests')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lab_requests_ordered')
    department = models.CharField(max_length=100, blank=True)
    test_name = models.CharField(max_length=255)
    clinical_notes = models.TextField(blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='routine')
    status = models.CharField(max_length=20, choices=LAB_REQUEST_STATUS_CHOICES, default='pending')
    lab_number = models.CharField(max_length=100, unique=True, blank=True)
    sample_collected_at = models.DateTimeField(null=True, blank=True)
    sample_collected_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='collected_samples')
    completed_at = models.DateTimeField(null=True, blank=True)
    result = models.TextField(blank=True)
    result_files = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LabRequest {self.lab_number or self.id}: {self.test_name}"


class LabResult(models.Model):
    lab_request = models.ForeignKey(LabRequest, on_delete=models.CASCADE, related_name='detailed_results')
    test_name = models.CharField(max_length=255)
    result_value = models.CharField(max_length=255)
    units = models.CharField(max_length=50, blank=True)
    reference_range = models.CharField(max_length=255, blank=True)
    interpretation = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=RESULT_STATUS_CHOICES, default='normal')
    technician_name = models.CharField(max_length=255, blank=True)
    reviewing_officer = models.CharField(max_length=255, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)
    attachments = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.test_name}: {self.result_value}"


class TimelineEvent(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='timeline_events')
    event_type = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.event_type}: {self.title} for {self.patient.full_name}"


class AuditLog(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class InsuranceCompany(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    insurance_type = models.CharField(max_length=20, choices=INSURANCE_TYPE_CHOICES, default='private')
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class NHISRecord(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='nhis_record')
    nhis_number = models.CharField(max_length=50, unique=True)
    membership_status = models.CharField(max_length=20, choices=MEMBERSHIP_STATUS_CHOICES, default='active')
    expiry_date = models.DateField(null=True, blank=True)
    scheme_type = models.CharField(max_length=20, choices=SCHEME_TYPE_CHOICES, default='standard')
    verified = models.BooleanField(default=False)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"NHIS {self.nhis_number} - {self.patient.full_name}"


class PrivateInsuranceRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='private_insurance_records')
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE, related_name='patient_records')
    membership_number = models.CharField(max_length=100)
    policy_expiry = models.DateField(null=True, blank=True)
    employer = models.CharField(max_length=255, blank=True)
    coverage_details = models.JSONField(default=dict, blank=True)
    verified = models.BooleanField(default=False)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['patient', 'insurance_company', 'membership_number']

    def __str__(self):
        return f"{self.insurance_company.name} - {self.membership_number}"


class InsuranceCoverageRule(models.Model):
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE, related_name='coverage_rules')
    service_type = models.CharField(max_length=100)
    is_covered = models.BooleanField(default=True)
    coverage_percentage = models.FloatField(default=100.0)
    co_payment_percentage = models.FloatField(default=0.0)
    requires_pre_authorization = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['insurance_company', 'service_type']

    def __str__(self):
        return f"{self.insurance_company.name} - {self.service_type}"


class Bill(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='bills')
    encounter = models.ForeignKey(Encounter, null=True, blank=True, on_delete=models.SET_NULL, related_name='bills')
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='bills')
    bill_type = models.CharField(max_length=30, choices=BILL_ITEM_TYPE_CHOICES, default='consultation')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    covered_by_insurance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    patient_co_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=BILL_STATUS_CHOICES, default='pending')
    insurance_claim_status = models.CharField(max_length=20, default='pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Bill {self.id} - {self.patient.full_name} - {self.total_amount}"


class BillItem(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=30, choices=BILL_ITEM_TYPE_CHOICES, default='other')
    description = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_covered_by_nhis = models.BooleanField(default=False)
    is_covered_by_insurance = models.BooleanField(default=False)
    service_code = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.description} - {self.total_price}"


class Payment(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='cash')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    paid_at = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments_received')

    def __str__(self):
        return f"Payment {self.id} - {self.amount} for Bill {self.bill_id}"


class StockItem(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='stock_items')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    category = models.CharField(max_length=100, default='medicine')
    unit = models.CharField(max_length=50, default='unit')
    current_quantity = models.IntegerField(default=0)
    minimum_stock_level = models.IntegerField(default=10)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['hospital', 'code']

    def __str__(self):
        return f"{self.name} ({self.hospital.name})"


class StockMovement(models.Model):
    stock_item = models.ForeignKey(StockItem, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES, default='out')
    quantity = models.IntegerField()
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.movement_type} {self.quantity} {self.stock_item.name}"


class MonthlyStatistic(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='monthly_statistics')
    year = models.IntegerField()
    month = models.IntegerField()
    total_patients = models.IntegerField(default=0)
    male_patients = models.IntegerField(default=0)
    female_patients = models.IntegerField(default=0)
    age_under_1 = models.IntegerField(default=0)
    age_1_5 = models.IntegerField(default=0)
    age_6_17 = models.IntegerField(default=0)
    age_18_35 = models.IntegerField(default=0)
    age_36_59 = models.IntegerField(default=0)
    age_60_plus = models.IntegerField(default=0)
    malaria_cases = models.IntegerField(default=0)
    typhoid_cases = models.IntegerField(default=0)
    hypertension_cases = models.IntegerField(default=0)
    diabetes_cases = models.IntegerField(default=0)
    pneumonia_cases = models.IntegerField(default=0)
    tuberculosis_cases = models.IntegerField(default=0)
    pregnancy_cases = models.IntegerField(default=0)
    other_cases = models.IntegerField(default=0)
    admissions = models.IntegerField(default=0)
    discharges = models.IntegerField(default=0)
    referrals = models.IntegerField(default=0)
    surgeries = models.IntegerField(default=0)
    deaths = models.IntegerField(default=0)
    deliveries = models.IntegerField(default=0)
    lab_tests = models.IntegerField(default=0)
    prescriptions = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    nhis_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    private_insurance_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cash_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    outstanding_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['hospital', 'year', 'month']

    def __str__(self):
        return f"{self.hospital.name} - {self.year}-{self.month:02d}"


class DiseaseOutbreak(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='disease_outbreaks')
    disease_name = models.CharField(max_length=100)
    year = models.IntegerField()
    month = models.IntegerField()
    week = models.IntegerField(null=True, blank=True)
    case_count = models.IntegerField(default=0)
    threshold = models.IntegerField(default=10)
    is_outbreak = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['hospital', 'disease_name', 'year', 'month', 'week']

    def __str__(self):
        return f"{self.disease_name} - {self.year}-{self.month:02d}"


REFERRAL_TYPE_CHOICES = [
    ('internal', 'Internal Referral'),
    ('external', 'External Referral'),
    ('emergency', 'Emergency Referral'),
    ('specialist', 'Specialist Referral'),
    ('facility_to_facility', 'Facility-to-Facility Referral'),
]

REFERRAL_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('submitted', 'Submitted'),
    ('accepted', 'Accepted'),
    ('rejected', 'Rejected'),
    ('in_transit', 'In Transit'),
    ('received', 'Received'),
    ('under_review', 'Under Review'),
    ('completed', 'Completed'),
    ('cancelled', 'Cancelled'),
]

REFERRAL_URGENCY_CHOICES = [
    ('routine', 'Routine'),
    ('urgent', 'Urgent'),
    ('emergency', 'Emergency'),
]

BED_STATUS_CHOICES = [
    ('available', 'Available'),
    ('occupied', 'Occupied'),
    ('reserved', 'Reserved'),
    ('cleaning', 'Cleaning/Maintenance'),
]

ADMISSION_TYPE_CHOICES = [
    ('emergency', 'Emergency'),
    ('elective', 'Elective'),
    ('transfer', 'Transfer'),
    ('observation', 'Observation'),
]

ADMISSION_STATUS_CHOICES = [
    ('admitted', 'Admitted'),
    ('discharged', 'Discharged'),
    ('transferred', 'Transferred'),
    ('deceased', 'Deceased'),
    ('left_ama', 'Left Against Medical Advice'),
]

DISCHARGE_STATUS_CHOICES = [
    ('planned', 'Planned'),
    ('ready', 'Ready for Discharge'),
    ('discharged', 'Discharged'),
    ('transferred', 'Transferred'),
    ('left_ama', 'Left Against Medical Advice'),
    ('deceased', 'Deceased'),
]

NOTE_TYPE_CHOICES = [
    ('clinical', 'Clinical Note'),
    ('nursing', 'Nursing Note'),
    ('observation', 'Observation'),
    ('treatment', 'Treatment Change'),
    ('diagnosis', 'New Diagnosis'),
    ('doctor_review', 'Doctor Review'),
]


class Referral(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='referrals')
    encounter = models.ForeignKey(Encounter, null=True, blank=True, on_delete=models.SET_NULL, related_name='referrals')
    referring_doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='outgoing_referrals')
    referring_facility = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='outgoing_referrals')
    receiving_facility = models.ForeignKey(Hospital, null=True, blank=True, on_delete=models.SET_NULL, related_name='incoming_referrals')
    receiving_department = models.CharField(max_length=255, blank=True)
    referral_type = models.CharField(max_length=30, choices=REFERRAL_TYPE_CHOICES, default='internal')
    urgency_level = models.CharField(max_length=20, choices=REFERRAL_URGENCY_CHOICES, default='routine')
    status = models.CharField(max_length=20, choices=REFERRAL_STATUS_CHOICES, default='draft')
    referral_date = models.DateTimeField(default=timezone.now)
    reason = models.TextField()
    primary_diagnosis = models.TextField(blank=True)
    clinical_summary = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)
    current_treatment = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    vital_signs = models.TextField(blank=True)
    lab_results = models.TextField(blank=True)
    imaging_results = models.TextField(blank=True)
    additional_notes = models.TextField(blank=True)
    is_emergency = models.BooleanField(default=False)
    accepted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='accepted_referrals')
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Referral {self.id} - {self.patient.full_name} ({self.get_status_display()})"


class Ward(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='wards')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    floor = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['hospital', 'code']

    def __str__(self):
        return f"{self.name} ({self.hospital.name})"


class Room(models.Model):
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=20)
    room_type = models.CharField(max_length=50, default='general')
    capacity = models.IntegerField(default=1)
    floor = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['ward', 'room_number']

    def __str__(self):
        return f"Room {self.room_number} - {self.ward.name}"


class Bed(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='beds')
    bed_number = models.CharField(max_length=20)
    bed_type = models.CharField(max_length=50, default='general')
    status = models.CharField(max_length=20, choices=BED_STATUS_CHOICES, default='available')
    current_patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_beds')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['room', 'bed_number']

    def __str__(self):
        return f"Bed {self.bed_number} - {self.room}"


class Admission(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='admissions')
    encounter = models.ForeignKey(Encounter, null=True, blank=True, on_delete=models.SET_NULL, related_name='admissions')
    doctor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='admitted_patients')
    admitting_doctor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='admissions_created')
    admission_date = models.DateTimeField(default=timezone.now)
    admission_type = models.CharField(max_length=20, choices=ADMISSION_TYPE_CHOICES, default='emergency')
    admission_reason = models.TextField(blank=True)
    primary_diagnosis = models.TextField()
    secondary_diagnoses = models.JSONField(default=list, blank=True)
    ward = models.ForeignKey(Ward, null=True, blank=True, on_delete=models.SET_NULL, related_name='admissions')
    room = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name='admissions')
    bed = models.ForeignKey(Bed, null=True, blank=True, on_delete=models.SET_NULL, related_name='admissions')
    is_emergency = models.BooleanField(default=True)
    clinical_notes = models.TextField(blank=True)
    insurance_type = models.CharField(max_length=20, choices=INSURANCE_TYPE_CHOICES, default='self_pay')
    insurance_record = models.ForeignKey('NHISRecord', null=True, blank=True, on_delete=models.SET_NULL, related_name='admissions')
    status = models.CharField(max_length=20, choices=ADMISSION_STATUS_CHOICES, default='admitted')
    discharge_date = models.DateTimeField(null=True, blank=True)
    discharge_diagnosis = models.TextField(blank=True)
    condition_at_discharge = models.TextField(blank=True)
    treatment_provided = models.TextField(blank=True)
    procedures_performed = models.TextField(blank=True)
    discharge_medications = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    follow_up_appointment = models.TextField(blank=True)
    discharge_notes = models.TextField(blank=True)
    discharge_status = models.CharField(max_length=20, choices=DISCHARGE_STATUS_CHOICES, default='planned')
    discharged_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='discharges_performed')
    discharged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-admission_date']

    def __str__(self):
        return f"Admission {self.id} - {self.patient.full_name} ({self.get_status_display()})"


class InpatientNote(models.Model):
    admission = models.ForeignKey(Admission, null=True, blank=True, on_delete=models.SET_NULL, related_name='notes')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='inpatient_notes')
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='clinical')
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    recorded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    recorded_at = models.DateTimeField(default=timezone.now)
    is_critical = models.BooleanField(default=False)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.get_note_type_display()} for {self.patient.full_name}"


class BedTransfer(models.Model):
    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name='bed_transfers')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='bed_transfers')
    from_ward = models.ForeignKey(Ward, null=True, blank=True, on_delete=models.SET_NULL, related_name='transfers_from')
    from_room = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name='transfers_from')
    from_bed = models.ForeignKey(Bed, null=True, blank=True, on_delete=models.SET_NULL, related_name='transfers_from')
    to_ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='transfers_to')
    to_room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='transfers_to')
    to_bed = models.ForeignKey(Bed, on_delete=models.CASCADE, related_name='transfers_to')
    reason = models.TextField(blank=True)
    transferred_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bed_transfers')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Transfer {self.id} - {self.patient.full_name}"


class MedicationAdministration(models.Model):
    admission = models.ForeignKey(Admission, null=True, blank=True, on_delete=models.SET_NULL, related_name='med_admins')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='med_admins')
    medication = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    route = models.CharField(max_length=50, blank=True)
    administered_at = models.DateTimeField(default=timezone.now)
    administered_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='med_admins')
    notes = models.TextField(blank=True)
    was_given = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.medication} for {self.patient.full_name}"


class InpatientLabRequest(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='inpatient_lab_requests')
    admission = models.ForeignKey(Admission, null=True, blank=True, on_delete=models.SET_NULL, related_name='lab_requests')
    requested_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='inpatient_lab_requests')
    test_name = models.CharField(max_length=255)
    clinical_notes = models.TextField(blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='routine')
    status = models.CharField(max_length=20, choices=LAB_REQUEST_STATUS_CHOICES, default='pending')
    lab_number = models.CharField(max_length=100, unique=True, blank=True)
    sample_collected_at = models.DateTimeField(null=True, blank=True)
    sample_collected_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='collected_inpatient_samples')
    completed_at = models.DateTimeField(null=True, blank=True)
    result = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Inpatient Lab {self.lab_number or self.id}: {self.test_name}"


class InpatientPrescription(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='inpatient_prescriptions')
    admission = models.ForeignKey(Admission, null=True, blank=True, on_delete=models.SET_NULL, related_name='prescriptions')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inpatient_prescribed')
    medication = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    frequency = models.CharField(max_length=50, blank=True)
    duration = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medication} for {self.patient.full_name} (Admission {self.admission.id})"


REPORT_FREQUENCY_CHOICES = [
    ('daily', 'Daily'),
    ('weekly', 'Weekly'),
    ('monthly', 'Monthly'),
    ('quarterly', 'Quarterly'),
    ('annual', 'Annual'),
    ('custom', 'Custom'),
]

REPORT_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('pending_review', 'Pending Review'),
    ('approved', 'Approved'),
    ('submitted', 'Submitted'),
    ('rejected', 'Rejected'),
    ('published', 'Published'),
]

ALERT_SEVERITY_CHOICES = [
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
    ('critical', 'Critical'),
]

ALERT_STATUS_CHOICES = [
    ('open', 'Open'),
    ('investigating', 'Investigating'),
    ('resolved', 'Resolved'),
    ('false_positive', 'False Positive'),
]

INDICATOR_TYPE_CHOICES = [
    ('waiting_time', 'Average Waiting Time'),
    ('consultation_time', 'Average Consultation Time'),
    ('bed_occupancy', 'Bed Occupancy Rate'),
    ('length_of_stay', 'Average Length of Stay'),
    ('readmission_rate', 'Readmission Rate'),
    ('appointment_attendance', 'Appointment Attendance Rate'),
    ('lab_turnaround', 'Laboratory Turnaround Time'),
    ('patient_satisfaction', 'Patient Satisfaction'),
]


class ReportTemplate(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    frequency = models.CharField(max_length=20, choices=REPORT_FREQUENCY_CHOICES, default='monthly')
    category = models.CharField(max_length=100, default='general')
    configuration = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    is_mandatory = models.BooleanField(default=False)
    submission_deadline_days = models.IntegerField(default=15)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_templates')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ReportInstance(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='report_instances')
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='instances')
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, default='monthly')
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, choices=REPORT_STATUS_CHOICES, default='draft')
    data = models.JSONField(default=dict, blank=True)
    summary = models.TextField(blank=True)
    submitted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='submitted_reports')
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_reports')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submission_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_reports')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.period_start} to {self.period_end}"


class ReportSection(models.Model):
    report = models.ForeignKey(ReportInstance, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    data = models.JSONField(default=dict, blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.report.title} - {self.title}"


class DataQualityAlert(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='data_quality_alerts')
    alert_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, choices=ALERT_SEVERITY_CHOICES, default='medium')
    title = models.CharField(max_length=255)
    description = models.TextField()
    affected_records = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=ALERT_STATUS_CHOICES, default='open')
    resolved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='resolved_data_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.alert_type} - {self.hospital.name}"


class PublicHealthAlert(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='public_health_alerts')
    disease_name = models.CharField(max_length=100)
    alert_type = models.CharField(max_length=50, default='unusual_increase')
    severity = models.CharField(max_length=20, choices=ALERT_SEVERITY_CHOICES, default='medium')
    current_count = models.IntegerField(default=0)
    expected_count = models.IntegerField(default=0)
    threshold_count = models.IntegerField(default=10)
    period_start = models.DateField()
    period_end = models.DateField()
    description = models.TextField(blank=True)
    action_taken = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=ALERT_STATUS_CHOICES, default='open')
    notified_users = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.disease_name} alert - {self.hospital.name}"


class PerformanceIndicator(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='performance_indicators')
    indicator_type = models.CharField(max_length=50, choices=INDICATOR_TYPE_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()
    value = models.FloatField(default=0)
    unit = models.CharField(max_length=50, default='')
    target = models.FloatField(default=0)
    notes = models.TextField(blank=True)
    calculated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['hospital', 'indicator_type', 'period_start', 'period_end']

    def __str__(self):
        return f"{self.indicator_type} - {self.hospital.name}"


class ReportExport(models.Model):
    report = models.ForeignKey(ReportInstance, on_delete=models.CASCADE, related_name='exports')
    export_format = models.CharField(max_length=20, default='pdf')
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.IntegerField(default=0)
    exported_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_exports')
    exported_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.report.title} - {self.export_format.upper()}"


TEMPLATE_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('published', 'Published'),
    ('archived', 'Archived'),
]

CHART_TYPE_CHOICES = [
    ('bar', 'Bar Chart'),
    ('line', 'Line Chart'),
    ('pie', 'Pie Chart'),
    ('doughnut', 'Doughnut Chart'),
    ('area', 'Area Chart'),
    ('scatter', 'Scatter Chart'),
    ('table', 'Table'),
    ('card', 'Summary Card'),
    ('pivot', 'Pivot Table'),
]

DATA_SOURCE_CHOICES = [
    ('patients', 'Patients'),
    ('appointments', 'Appointments'),
    ('encounters', 'EMR / Encounters'),
    ('vitals', 'Vital Signs'),
    ('diagnoses', 'Diagnoses'),
    ('lab_requests', 'Laboratory'),
    ('lab_results', 'Lab Results'),
    ('prescriptions', 'Prescriptions'),
    ('pharmacy', 'Pharmacy / Stock'),
    ('billing', 'Billing / Payments'),
    ('nhis', 'NHIS'),
    ('insurance', 'Private Insurance'),
    ('admissions', 'Admissions'),
    ('discharges', 'Discharges'),
    ('referrals', 'Referrals'),
    ('handovers', 'Handovers'),
    ('audit_logs', 'Audit Logs'),
    ('inventory', 'Inventory'),
    ('users', 'Doctors / Nurses / Users'),
    ('hospitals', 'Hospitals / Departments'),
    ('beds', 'Beds'),
    ('timeline', 'Timeline Events'),
    ('monthly_statistics', 'Monthly Statistics'),
    ('disease_outbreaks', 'Disease Outbreaks'),
]


class ReportTemplateVersion(models.Model):
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='versions')
    version_number = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    configuration = models.JSONField(default=dict, blank=True)
    changelog = models.TextField(blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['template', 'version_number']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"


class ReportSchedule(models.Model):
    report = models.ForeignKey(ReportInstance, on_delete=models.CASCADE, related_name='schedules')
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='schedules')
    frequency = models.CharField(max_length=20, choices=REPORT_FREQUENCY_CHOICES, default='monthly')
    cron_expression = models.CharField(max_length=100, blank=True)
    recipients = models.JSONField(default=list, blank=True)
    email_subject = models.CharField(max_length=255, blank=True)
    email_body = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_schedules')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Schedule for {self.report.title} ({self.frequency})"


class ReportDashboardPin(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pinned_reports')
    report = models.ForeignKey(ReportInstance, on_delete=models.CASCADE, related_name='pins')
    position = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['user', 'report']

    def __str__(self):
        return f"{self.user.username} pinned {self.report.title}"


class FormulaDefinition(models.Model):
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='formulas')
    name = models.CharField(max_length=255)
    formula_type = models.CharField(max_length=50, default='aggregation')
    expression = models.JSONField(default=dict, blank=True)
    data_source = models.CharField(max_length=50, choices=DATA_SOURCE_CHOICES, default='patients')
    field = models.CharField(max_length=100, blank=True)
    aggregation = models.CharField(max_length=50, blank=True)
    filters = models.JSONField(default=dict, blank=True)
    group_by = models.JSONField(default=list, blank=True)
    order_by = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.template.name})"


class ReportElement(models.Model):
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='elements')
    element_type = models.CharField(max_length=50, choices=CHART_TYPE_CHOICES, default='table')
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    data_source = models.CharField(max_length=50, choices=DATA_SOURCE_CHOICES, default='patients')
    columns = models.JSONField(default=list, blank=True)
    filters = models.JSONField(default=list, blank=True)
    sorting = models.JSONField(default=list, blank=True)
    grouping = models.JSONField(default=list, blank=True)
    chart_config = models.JSONField(default=dict, blank=True)
    style = models.JSONField(default=dict, blank=True)
    order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.element_type} - {self.title or self.template.name}"


class ReportExportFormat(models.Model):
    name = models.CharField(max_length=100)
    format_type = models.CharField(max_length=20, default='pdf')
    configuration = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class ClinicalProgressNote(models.Model):
    STATUS_CHOICES = [
        ('improving', 'Improving'),
        ('stable', 'Stable'),
        ('worsening', 'Worsening'),
        ('critical', 'Critical'),
        ('no_significant_change', 'No Significant Change'),
    ]

    RESPONSE_TO_TREATMENT_CHOICES = [
        ('good_response', 'Good Response'),
        ('partial_response', 'Partial Response'),
        ('no_response', 'No Response'),
        ('worsening', 'Worsening'),
        ('not_started', 'Treatment Not Yet Started'),
        ('unable_to_assess', 'Unable to Assess'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='clinical_progress_notes')
    encounter = models.ForeignKey(Encounter, null=True, blank=True, on_delete=models.SET_NULL, related_name='clinical_progress_notes')
    recorded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clinical_progress_notes')
    clinical_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='stable')
    response_to_treatment = models.CharField(max_length=30, choices=RESPONSE_TO_TREATMENT_CHOICES, blank=True)
    chief_concern = models.TextField(blank=True)
    clinical_progress = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    treatment_response = models.TextField(blank=True)
    current_treatment = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    medication_changes = models.TextField(blank=True)
    investigation_interpretation = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    next_review_date = models.DateTimeField(null=True, blank=True)
    additional_notes = models.TextField(blank=True)
    is_amendment = models.BooleanField(default=False)
    amendment_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Clinical Progress Note {self.id} - {self.patient.full_name} ({self.get_clinical_status_display()})"


class IdempotencyKey(models.Model):
    key = models.CharField(max_length=255)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='idempotency_keys')
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100)
    request_method = models.CharField(max_length=10)
    request_path = models.CharField(max_length=255)
    request_body_hash = models.CharField(max_length=64, blank=True)
    response_status = models.IntegerField()
    response_body = models.JSONField()
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['key', 'user', 'resource_type', 'resource_id', 'request_method']
        indexes = [
            models.Index(fields=['key', 'user', 'resource_type', 'resource_id']),
            models.Index(fields=['user', 'resource_type', 'created_at']),
        ]

    def __str__(self):
        return f"IdempotencyKey {self.key} by {self.user.username}"


# ---------------------------------------------------------------------------
# Maternity / Midwifery Models
# ---------------------------------------------------------------------------

MATERNITY_RISK_CHOICES = [
    ('low_risk', 'Low Risk'),
    ('medium_risk', 'Medium Risk'),
    ('high_risk', 'High Risk'),
]

LABOUR_STATUS_CHOICES = [
    ('early', 'Early Labour'),
    ('active', 'Active Labour'),
    ('transition', 'Transition'),
    ('second_stage', 'Second Stage'),
    ('delivered', 'Delivered'),
    ('scheduled_csection', 'Scheduled Caesarean'),
]

DELIVERY_TYPE_CHOICES = [
    ('vaginal', 'Vaginal'),
    ('caesarean', 'Caesarean'),
    ('assisted', 'Assisted'),
    ('other', 'Other'),
]

DELIVERY_OUTCOME_CHOICES = [
    ('live_birth', 'Live Birth'),
    ('stillbirth', 'Stillbirth'),
    ('miscarriage', 'Miscarriage'),
]

MATERNAL_OUTCOME_CHOICES = [
    ('stable', 'Stable'),
    ('complicated', 'Complicated'),
    ('icu', 'ICU'),
    ('death', 'Death'),
]

POSTNATAL_STATUS_CHOICES = [
    ('stable', 'Stable'),
    ('observation', 'Under Observation'),
    ('complicated', 'Complicated'),
]

FETAL_MOVEMENT_CHOICES = [
    ('normal', 'Normal'),
    ('reduced', 'Reduced'),
    ('absent', 'Absent'),
]

NEWBORN_SEX_CHOICES = [
    ('male', 'Male'),
    ('female', 'Female'),
    ('unknown', 'Unknown'),
]


class AntenatalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='antenatal_records')
    gravida = models.PositiveIntegerField(default=0)
    para = models.PositiveIntegerField(default=0)
    edd = models.DateField(null=True, blank=True)
    lmp = models.DateField(null=True, blank=True)
    risk_classification = models.CharField(max_length=20, choices=MATERNITY_RISK_CHOICES, default='low_risk')
    current_status = models.CharField(max_length=20, default='active')
    current_gestational_age = models.PositiveIntegerField(null=True, blank=True)
    previous_pregnancy_history = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"AntenatalRecord {self.id} - {self.patient.full_name} (GA: {self.current_gestational_age or '?'}w)"


class LabourRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='labour_records')
    antenatal_record = models.ForeignKey(AntenatalRecord, null=True, blank=True, on_delete=models.SET_NULL)
    admission_time = models.DateTimeField(default=timezone.now)
    labour_status = models.CharField(max_length=20, choices=LABOUR_STATUS_CHOICES)
    cervical_dilation = models.CharField(max_length=20, blank=True)
    contraction_frequency = models.CharField(max_length=20, blank=True)
    fetal_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    maternal_observations = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    assigned_midwife = models.ForeignKey('User', null=True, blank=True, on_delete=models.SET_NULL, related_name='labour_records')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"LabourRecord {self.id} - {self.patient.full_name} ({self.labour_status})"


class Delivery(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='deliveries')
    antenatal_record = models.ForeignKey(AntenatalRecord, null=True, blank=True, on_delete=models.SET_NULL)
    labour_record = models.ForeignKey(LabourRecord, null=True, blank=True, on_delete=models.SET_NULL)
    delivery_time = models.DateTimeField(default=timezone.now)
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES)
    delivery_outcome = models.CharField(max_length=20, choices=DELIVERY_OUTCOME_CHOICES)
    maternal_outcome = models.CharField(max_length=20, choices=MATERNAL_OUTCOME_CHOICES, default='stable')
    complications = models.TextField(blank=True)
    delivered_by = models.ForeignKey('User', null=True, blank=True, on_delete=models.SET_NULL, related_name='deliveries')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Delivery {self.id} - {self.patient.full_name} ({self.delivery_type})"


class Newborn(models.Model):
    mother = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='newborns')
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='newborns')
    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name='born_as_newborn')
    sex = models.CharField(max_length=10, choices=NEWBORN_SEX_CHOICES)
    birth_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    birth_length = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    head_circumference = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    apgar_score_1min = models.PositiveSmallIntegerField(null=True, blank=True)
    apgar_score_5min = models.PositiveSmallIntegerField(null=True, blank=True)
    resuscitation = models.CharField(max_length=20, blank=True)
    newborn_observations = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Newborn {self.id} - {self.mother.full_name} ({self.sex})"


class FetalAssessment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='fetal_assessments')
    antenatal_record = models.ForeignKey(AntenatalRecord, null=True, blank=True, on_delete=models.SET_NULL)
    assessed_by = models.ForeignKey('User', null=True, blank=True, on_delete=models.SET_NULL)
    fetal_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    fetal_movement = models.CharField(max_length=20, choices=FETAL_MOVEMENT_CHOICES, blank=True)
    presentation = models.CharField(max_length=20, blank=True)
    fundal_height = models.CharField(max_length=20, blank=True)
    fetal_observations = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    assessment_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"FetalAssessment {self.id} - {self.patient.full_name}"


class PostnatalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='postnatal_records')
    antenatal_record = models.ForeignKey(AntenatalRecord, null=True, blank=True, on_delete=models.SET_NULL)
    delivery = models.ForeignKey(Delivery, null=True, blank=True, on_delete=models.SET_NULL)
    postnatal_status = models.CharField(max_length=20, choices=POSTNATAL_STATUS_CHOICES, default='stable')
    visit_date = models.DateTimeField(default=timezone.now)
    maternal_observations = models.TextField(blank=True)
    newborn_observations = models.TextField(blank=True)
    feeding_status = models.CharField(max_length=20, blank=True)
    follow_up_plan = models.TextField(blank=True)
    next_appointment = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PostnatalRecord {self.id} - {self.patient.full_name}"


class MaternityNote(models.Model):
    MATERNITY_STATUS_CHOICES = [
        ('antenatal', 'Antenatal'),
        ('labour', 'In Labour'),
        ('delivery', 'Delivery'),
        ('postnatal', 'Postnatal'),
        ('follow_up', 'Follow-up'),
    ]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='maternity_notes')
    encounter = models.ForeignKey(Encounter, null=True, blank=True, on_delete=models.SET_NULL, related_name='maternity_notes')
    maternity_status = models.CharField(max_length=20, choices=MATERNITY_STATUS_CHOICES)
    clinical_observations = models.TextField(blank=True)
    progress = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    treatment_interventions = models.TextField(blank=True)
    follow_up = models.TextField(blank=True)
    additional_notes = models.TextField(blank=True)
    created_by = models.ForeignKey('User', null=True, blank=True, on_delete=models.SET_NULL, related_name='maternity_notes')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"MaternityNote {self.id} - {self.patient.full_name} ({self.maternity_status})"


class Diagnosis(models.Model):
    DIAGNOSIS_TYPE_CHOICES = [
        ('primary', 'Primary'),
        ('secondary', 'Secondary'),
        ('provisional', 'Provisional'),
        ('confirmed', 'Confirmed'),
        ('working', 'Working'),
        ('differential', 'Differential'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('ruled_out', 'Ruled Out'),
        ('chronic', 'Chronic'),
    ]
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='diagnoses')
    encounter = models.ForeignKey('Encounter', null=True, blank=True, on_delete=models.SET_NULL, related_name='diagnoses')
    diagnosis_name = models.CharField(max_length=255)
    icd10_code = models.CharField(max_length=20, blank=True)
    diagnosis_type = models.CharField(max_length=20, choices=DIAGNOSIS_TYPE_CHOICES, default='working')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    clinical_note = models.TextField(blank=True)
    created_by = models.ForeignKey('User', null=True, blank=True, on_delete=models.SET_NULL, related_name='diagnoses')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Diagnosis {self.id} - {self.diagnosis_name} ({self.patient.full_name})"


class Medication(models.Model):
    FORM_CHOICES = [
        ('tablet', 'Tablet'),
        ('capsule', 'Capsule'),
        ('syrup', 'Syrup'),
        ('injection', 'Injection'),
        ('cream', 'Cream'),
        ('ointment', 'Ointment'),
        ('drops', 'Drops'),
        ('inhaler', 'Inhaler'),
        ('patch', 'Patch'),
        ('suspension', 'Suspension'),
    ]
    ROUTE_CHOICES = [
        ('oral', 'Oral'),
        ('iv', 'Intravenous'),
        ('im', 'Intramuscular'),
        ('sc', 'Subcutaneous'),
        ('topical', 'Topical'),
        ('inhaled', 'Inhaled'),
        ('sublingual', 'Sublingual'),
        ('rectal', 'Rectal'),
        ('ophthalmic', 'Ophthalmic'),
        ('otic', 'Otic'),
    ]
    FORMULARY_STATUS_CHOICES = [
        ('formulary', 'Formulary'),
        ('non_formulary', 'Non-Formulary'),
        ('restricted', 'Restricted'),
    ]
    generic_name = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255, blank=True)
    strength = models.CharField(max_length=100, blank=True)
    dosage_form = models.CharField(max_length=20, choices=FORM_CHOICES, blank=True)
    route = models.CharField(max_length=20, choices=ROUTE_CHOICES, blank=True)
    formulary_status = models.CharField(max_length=20, choices=FORMULARY_STATUS_CHOICES, default='formulary')
    available = models.BooleanField(default=True)
    category = models.CharField(max_length=100, blank=True)
    indications = models.TextField(blank=True)
    contraindications = models.TextField(blank=True)
    side_effects = models.TextField(blank=True)
    interactions = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['generic_name']

    def __str__(self):
        return f"{self.generic_name} {self.strength} {self.get_dosage_form_display()}"


class DiagnosisTerm(models.Model):
    name = models.CharField(max_length=255)
    icd10_code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.icd10_code})"

