from rest_framework import serializers
from django.utils import timezone
from .models import (
    Hospital, User, Patient, Encounter, VitalSign, Appointment, LabOrder,
    Prescription, Message, SyncRecord, AuditLog,
    Handover, HandoverPatient, Notification, LabRequest, LabResult,
    TimelineEvent,
    InsuranceCompany, NHISRecord, PrivateInsuranceRecord, InsuranceCoverageRule,
    Bill, BillItem, Payment, StockItem, StockMovement, MonthlyStatistic, DiseaseOutbreak,
    ReportTemplate, ReportInstance, ReportSection, DataQualityAlert, PublicHealthAlert,
    PerformanceIndicator, ReportExport, ReportTemplateVersion, ReportElement,
    FormulaDefinition, ReportSchedule, ReportDashboardPin, ReportExportFormat,
    Referral, Ward, Room, Bed, Admission, InpatientNote, BedTransfer,
    MedicationAdministration, InpatientLabRequest, InpatientPrescription,
    ClinicalProgressNote,
    AntenatalRecord, LabourRecord, Delivery, Newborn, FetalAssessment, PostnatalRecord, MaternityNote,
    Diagnosis, Medication, DiagnosisTerm,
)


class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'hospital', 'mfa_enabled', 'is_offline_ready']


class PatientSerializer(serializers.ModelSerializer):
    phone_number = serializers.SerializerMethodField()
    medical_record_number = serializers.SerializerMethodField()

    def get_phone_number(self, obj):
        return obj.phone

    def get_medical_record_number(self, obj):
        return obj.patient_id

    class Meta:
        model = Patient
        fields = '__all__'


class VitalSignSerializer(serializers.ModelSerializer):
    recorded_by_username = serializers.CharField(source='recorded_by.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = VitalSign
        fields = '__all__'


class EncounterSerializer(serializers.ModelSerializer):
    vitals = VitalSignSerializer(many=True, read_only=True)

    class Meta:
        model = Encounter
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'


class LabOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabOrder
        fields = '__all__'


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = '__all__'


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = '__all__'


class SyncRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncRecord
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'


class HandoverPatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = HandoverPatient
        fields = '__all__'


class HandoverSerializer(serializers.ModelSerializer):
    patients = HandoverPatientSerializer(many=True, read_only=True)
    patient_ids = serializers.ListField(write_only=True, child=serializers.IntegerField(), required=False)
    patient_notes = serializers.ListField(write_only=True, child=serializers.DictField(), required=False)

    class Meta:
        model = Handover
        fields = '__all__'

    def create(self, validated_data):
        patient_ids = validated_data.pop('patient_ids', [])
        patient_notes = validated_data.pop('patient_notes', [])
        handover = Handover.objects.create(**validated_data)
        for pid in patient_ids:
            patient = Patient.objects.get(id=pid)
            notes = next((n for n in patient_notes if str(n.get('id')) == str(pid)), {})
            notes.pop('id', None)
            HandoverPatient.objects.create(
                handover=handover,
                patient=patient,
                patient_name=patient.full_name,
                patient_code=patient.patient_id,
                **notes,
            )
        return handover


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = '__all__'


class LabRequestSerializer(serializers.ModelSerializer):
    detailed_results = LabResultSerializer(many=True, read_only=True)
    results = LabResultSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = LabRequest
        fields = '__all__'

    def create(self, validated_data):
        results_data = validated_data.pop('results', [])
        lab_request = LabRequest.objects.create(**validated_data)
        for result_data in results_data:
            LabResult.objects.create(lab_request=lab_request, **result_data)
        return lab_request


class TimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineEvent
        fields = '__all__'


class InsuranceCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCompany
        fields = '__all__'


class NHISRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = NHISRecord
        fields = '__all__'


class PrivateInsuranceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivateInsuranceRecord
        fields = '__all__'


class InsuranceCoverageRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCoverageRule
        fields = '__all__'


class BillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillItem
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class BillSerializer(serializers.ModelSerializer):
    items = BillItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Bill
        fields = '__all__'


class StockItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockItem
        fields = '__all__'


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = '__all__'


class MonthlyStatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyStatistic
        fields = '__all__'


class DiseaseOutbreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiseaseOutbreak
        fields = '__all__'


class ReportSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportSection
        fields = '__all__'


class ReportExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportExport
        fields = '__all__'


class ReportTemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplateVersion
        fields = '__all__'


class ReportElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportElement
        fields = '__all__'


class FormulaDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormulaDefinition
        fields = '__all__'


class ReportInstanceSerializer(serializers.ModelSerializer):
    sections = ReportSectionSerializer(many=True, read_only=True)
    exports = ReportExportSerializer(many=True, read_only=True)

    class Meta:
        model = ReportInstance
        fields = '__all__'


class ReportTemplateSerializer(serializers.ModelSerializer):
    versions = ReportTemplateVersionSerializer(many=True, read_only=True)
    elements = ReportElementSerializer(many=True, read_only=True)
    formulas = FormulaDefinitionSerializer(many=True, read_only=True)

    class Meta:
        model = ReportTemplate
        fields = '__all__'


class ReportScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportSchedule
        fields = '__all__'


class ReportDashboardPinSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportDashboardPin
        fields = '__all__'


class ReportExportFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportExportFormat
        fields = '__all__'


class DataQualityAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataQualityAlert
        fields = '__all__'


class PublicHealthAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicHealthAlert
        fields = '__all__'


class PerformanceIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceIndicator
        fields = '__all__'


class ReferralSerializer(serializers.ModelSerializer):
    referring_doctor_name = serializers.CharField(source='referring_doctor.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    receiving_facility_name = serializers.CharField(source='receiving_facility.name', read_only=True)
    referring_facility_name = serializers.CharField(source='referring_facility.name', read_only=True)

    class Meta:
        model = Referral
        fields = '__all__'


class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = '__all__'


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class BedSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    ward_name = serializers.CharField(source='room.ward.name', read_only=True)
    patient_full_name = serializers.CharField(source='current_patient.full_name', read_only=True)

    class Meta:
        model = Bed
        fields = '__all__'


class AdmissionSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.username', read_only=True)
    ward_name = serializers.CharField(source='ward.name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    bed_number = serializers.CharField(source='bed.bed_number', read_only=True)
    length_of_stay = serializers.SerializerMethodField()

    def get_length_of_stay(self, obj):
        if obj.discharge_date:
            delta = obj.discharge_date - obj.admission_date
            return delta.days
        from datetime import datetime
        now = timezone.now() if hasattr(timezone, 'now') else datetime.now()
        delta = now - obj.admission_date
        return max(0, delta.days)

    class Meta:
        model = Admission
        fields = '__all__'


class InpatientNoteSerializer(serializers.ModelSerializer):
    recorded_by_username = serializers.CharField(source='recorded_by.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = InpatientNote
        fields = '__all__'


class BedTransferSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    transferred_by_username = serializers.CharField(source='transferred_by.username', read_only=True)
    from_ward_name = serializers.CharField(source='from_ward.name', read_only=True)
    to_ward_name = serializers.CharField(source='to_ward.name', read_only=True)
    from_bed_label = serializers.CharField(source='from_bed.bed_number', read_only=True)
    to_bed_label = serializers.CharField(source='to_bed.bed_number', read_only=True)

    class Meta:
        model = BedTransfer
        fields = '__all__'


class MedicationAdministrationSerializer(serializers.ModelSerializer):
    administered_by_username = serializers.CharField(source='administered_by.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = MedicationAdministration
        fields = '__all__'


class InpatientLabRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = InpatientLabRequest
        fields = '__all__'


class InpatientPrescriptionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = InpatientPrescription
        fields = '__all__'


class ClinicalProgressNoteSerializer(serializers.ModelSerializer):
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    recorded_by_username = serializers.CharField(source='recorded_by.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    encounter_type = serializers.CharField(source='encounter.encounter_type', read_only=True)

    class Meta:
        model = ClinicalProgressNote
        fields = '__all__'


class DiagnosisSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = Diagnosis
        fields = '__all__'


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = '__all__'


class DiagnosisTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosisTerm
        fields = '__all__'


class AntenatalRecordSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = AntenatalRecord
        fields = '__all__'


class LabourRecordSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    assigned_midwife_username = serializers.CharField(source='assigned_midwife.username', read_only=True)

    class Meta:
        model = LabourRecord
        fields = '__all__'


class DeliverySerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    delivered_by_username = serializers.CharField(source='delivered_by.username', read_only=True)

    class Meta:
        model = Delivery
        fields = '__all__'


class NewbornSerializer(serializers.ModelSerializer):
    mother_name = serializers.CharField(source='mother.full_name', read_only=True)

    class Meta:
        model = Newborn
        fields = '__all__'


class FetalAssessmentSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    assessed_by_username = serializers.CharField(source='assessed_by.username', read_only=True)

    class Meta:
        model = FetalAssessment
        fields = '__all__'


class PostnatalRecordSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = PostnatalRecord
        fields = '__all__'


class MaternityNoteSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.CharField(source='patient.full_name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = MaternityNote
        fields = '__all__'
