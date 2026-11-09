from django.contrib.auth import authenticate
from django.http import HttpResponse
from django.db.models import Q, Sum, Count, Avg, Min, Max, F, ExpressionWrapper
from django.db import models as fields
from django.utils import timezone
from datetime import timedelta
import hashlib
import json
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response
from rest_framework import viewsets, permissions, status, serializers
from .models import (
    Hospital, User, Patient, Encounter, VitalSign, Appointment,
    LabOrder, Prescription, Message, SyncRecord, AuditLog,
    Handover, HandoverPatient, Notification, LabRequest, LabResult,
    TimelineEvent,
    InsuranceCompany, NHISRecord, PrivateInsuranceRecord, InsuranceCoverageRule,
    Bill, BillItem, Payment, StockItem, StockMovement, MonthlyStatistic, DiseaseOutbreak,
    ReportTemplate, ReportInstance, ReportSection, DataQualityAlert, PublicHealthAlert,
    PerformanceIndicator, ReportExport, ReportTemplateVersion, ReportSchedule,
    ReportDashboardPin, FormulaDefinition, ReportElement, ReportExportFormat,
    Referral, Ward, Room, Bed, Admission, InpatientNote, BedTransfer,
    MedicationAdministration, InpatientLabRequest, InpatientPrescription,
    IdempotencyKey, ClinicalProgressNote,
    AntenatalRecord, LabourRecord, Delivery, Newborn, FetalAssessment, PostnatalRecord, MaternityNote,
    Diagnosis, Medication, DiagnosisTerm,
)
from .serializers import (
    HospitalSerializer, UserSerializer, PatientSerializer, EncounterSerializer,
    VitalSignSerializer, AppointmentSerializer, LabOrderSerializer,
    PrescriptionSerializer, MessageSerializer, SyncRecordSerializer,
    AuditLogSerializer, HandoverSerializer, NotificationSerializer,
    LabRequestSerializer, LabResultSerializer, TimelineEventSerializer,
    InsuranceCompanySerializer, NHISRecordSerializer, PrivateInsuranceRecordSerializer,
    InsuranceCoverageRuleSerializer, BillSerializer, BillItemSerializer, PaymentSerializer,
    StockItemSerializer, StockMovementSerializer, MonthlyStatisticSerializer,
    DiseaseOutbreakSerializer,
    ReportTemplateSerializer, ReportInstanceSerializer, ReportSectionSerializer,
    DataQualityAlertSerializer, PublicHealthAlertSerializer, PerformanceIndicatorSerializer,
    ReportExportSerializer, ReportTemplateVersionSerializer, ReportScheduleSerializer,
    ReportDashboardPinSerializer, FormulaDefinitionSerializer, ReportElementSerializer,
    ReportExportFormatSerializer,
    ReferralSerializer, WardSerializer, RoomSerializer, BedSerializer,
    AdmissionSerializer, InpatientNoteSerializer, BedTransferSerializer,
    MedicationAdministrationSerializer, InpatientLabRequestSerializer,
    InpatientPrescriptionSerializer, ClinicalProgressNoteSerializer,
    AntenatalRecordSerializer, LabourRecordSerializer, DeliverySerializer,
    NewbornSerializer, FetalAssessmentSerializer, PostnatalRecordSerializer, MaternityNoteSerializer,
    DiagnosisSerializer, MedicationSerializer, DiagnosisTermSerializer,
)


def _hash_body(body: str | None) -> str:
    if not body:
        return ''
    return hashlib.sha256(body.encode('utf-8')).hexdigest()


def _check_idempotency(request, resource_type: str, resource_id: str):
    key = request.headers.get('Idempotency-Key')
    if not key:
        return None
    try:
        entry = IdempotencyKey.objects.get(
            key=key,
            user=request.user,
            resource_type=resource_type,
            resource_id=resource_id,
        )
        return entry
    except IdempotencyKey.DoesNotExist:
        return None


def _store_idempotency(request, resource_type: str, resource_id: str, response_status: int, response_body: dict):
    key = request.headers.get('Idempotency-Key')
    if not key:
        return
    IdempotencyKey.objects.get_or_create(
        key=key,
        user=request.user,
        resource_type=resource_type,
        resource_id=resource_id,
        defaults={
            'request_method': request.method,
            'request_path': request.path,
            'response_status': response_status,
            'response_body': response_body,
        }
    )


def home(request):
    return HttpResponse(
        """
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>MedLink Connect</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 3rem; }
              h1 { color: #22d3ee; }
              a { color: #38bdf8; }
              ul { line-height: 1.8; }
            </style>
          </head>
          <body>
            <h1>MedLink Connect</h1>
            <p>Backend API is running. The frontend is served separately by the Vite dev server.</p>
            <ul>
              <li>API root: <a href="/api/">/api/</a></li>
              <li>API schema: <a href="/api/schema/">/api/schema/</a></li>
              <li>Admin: <a href="/admin/">/admin/</a></li>
              <li>Frontend (dev): run <code>cd frontend &amp;&amp; npm run dev</code></li>
            </ul>
          </body>
        </html>
        """,
        content_type="text/html",
    )


class IsStaffOrSelf(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsDoctorOrNurseOrLabOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'doctor', 'nurse', 'lab_technician', 'administrator'
        ]


class IsDoctorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'doctor', 'administrator'
        ]


class IsLabOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'lab_technician', 'administrator'
        ]


class IsCashierOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'receptionist', 'administrator'
        ]


class IsPharmacyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'pharmacist', 'administrator'
        ]


class IsDoctorOrNurseOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'doctor', 'nurse', 'administrator'
        ]


class IsDoctorOrNurseOrAdminForRead(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in ('doctor', 'administrator'):
            return True
        if request.user.role == 'nurse':
            return request.method in ('GET', 'HEAD', 'OPTIONS')
        return False


class IsReceptionistOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'receptionist', 'administrator'
        ]


class IsDoctorOrReceptionistOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'doctor', 'receptionist', 'administrator'
        ]


class IsInpatientStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'doctor', 'nurse', 'administrator', 'lab_technician', 'pharmacist'
        ]


class IsDoctorOrPharmacistOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'doctor', 'pharmacist', 'administrator'
        ]


class IsMidwifeOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'midwife', 'administrator'
        ]


class IsClinicalStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [
            'doctor', 'nurse', 'midwife', 'lab_technician', 'pharmacist', 'administrator'
        ]


def _create_notification(recipient, title, message, priority='normal', entity_type='', entity_id=''):
    Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        priority=priority,
        related_entity_type=entity_type,
        related_entity_id=str(entity_id),
    )


def _create_timeline_event(patient, event_type, entity_type, entity_id, title, description='', user=None):
    TimelineEvent.objects.create(
        patient=patient,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        title=title,
        description=description,
        created_by=user,
    )


def _create_audit(user, action, details=''):
    AuditLog.objects.create(
        user=user,
        action=action,
        details=details,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'detail': 'Invalid username or password.'}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': {'id': user.id, 'username': user.username, 'role': user.role},
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    return Response({'id': user.id, 'username': user.username, 'role': user.role})


class HospitalViewSet(viewsets.ModelViewSet):
    queryset = Hospital.objects.all()
    serializer_class = HospitalSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]


class EncounterViewSet(viewsets.ModelViewSet):
    queryset = Encounter.objects.all()
    serializer_class = EncounterSerializer
    permission_classes = [permissions.IsAuthenticated]


class VitalSignViewSet(viewsets.ModelViewSet):
    queryset = VitalSign.objects.all()
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        vital = serializer.save(recorded_by=self.request.user)
        if vital.encounter and vital.encounter.patient_id:
            _create_timeline_event(
                vital.encounter.patient,
                'vital_sign',
                'vitals',
                vital.id,
                'Vital Signs Recorded',
                f"Temperature: {vital.temperature_c or '—'}°C, BP: {vital.blood_pressure or '—'}, Pulse: {vital.pulse_bpm or '—'} bpm",
                self.request.user,
            )
        recipient = None
        if vital.encounter and vital.encounter.doctor_id:
            recipient = vital.encounter.doctor
        elif vital.encounter and vital.encounter.nurse_id:
            recipient = vital.encounter.nurse
        if not recipient:
            recipient = self.request.user
        _create_notification(
            recipient,
            'Vital Signs Recorded',
            f"Vital signs recorded for patient.",
            priority='normal',
            entity_type='vitals',
            entity_id=vital.id,
        )


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]


class LabOrderViewSet(viewsets.ModelViewSet):
    queryset = LabOrder.objects.all()
    serializer_class = LabOrderSerializer
    permission_classes = [permissions.IsAuthenticated]


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]


class SyncRecordViewSet(viewsets.ModelViewSet):
    queryset = SyncRecord.objects.all()
    serializer_class = SyncRecordSerializer
    permission_classes = [permissions.IsAuthenticated]


class AuditLogViewSet(viewsets.ModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]


class HandoverViewSet(viewsets.ModelViewSet):
    queryset = Handover.objects.all()
    serializer_class = HandoverSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Handover.objects.all()
        return Handover.objects.filter(Q(sender=user) | Q(receiver=user))

    def perform_create(self, serializer):
        handover = serializer.save(sender=self.request.user)
        for hp in handover.patients.all():
            _create_timeline_event(
                hp.patient, 'handover', 'handover', handover.id,
                f"Handover initiated by {handover.sender.username}",
                f"Priority: {hp.priority_level}", self.request.user,
            )
        _create_notification(
            handover.receiver, 'New Handover Received',
            f"Dr. {handover.sender.get_full_name() or handover.sender.username} has initiated a handover.",
            priority='high', entity_type='handover', entity_id=handover.id,
        )

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        handover = self.get_object()
        if handover.receiver != request.user and handover.sender != request.user and request.user.role != 'administrator':
            return Response({'detail': 'Not authorized.'}, status=403)
        handover.status = 'accepted'
        handover.save()
        for hp in handover.patients.all():
            _create_timeline_event(
                hp.patient, 'handover', 'handover', handover.id,
                f"Handover accepted by {handover.receiver.username}",
                f"Priority: {hp.priority_level}", request.user,
            )
        _create_notification(
            handover.sender, 'Handover Accepted',
            f"Dr. {handover.receiver.get_full_name() or handover.receiver.username} accepted the handover.",
            priority='normal', entity_type='handover', entity_id=handover.id,
        )
        return Response({'status': 'accepted'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        handover = self.get_object()
        if handover.receiver != request.user and handover.sender != request.user and request.user.role != 'administrator':
            return Response({'detail': 'Not authorized.'}, status=403)
        handover.status = 'rejected'
        handover.save()
        _create_notification(
            handover.sender, 'Handover Rejected',
            f"Dr. {handover.receiver.get_full_name() or handover.receiver.username} rejected the handover.",
            priority='normal', entity_type='handover', entity_id=handover.id,
        )
        return Response({'status': 'rejected'})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(recipient=self.request.user)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        qs = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'read'})


class LabRequestViewSet(viewsets.ModelViewSet):
    queryset = LabRequest.objects.all()
    serializer_class = LabRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return LabRequest.objects.all()
        if user.role == 'lab_technician':
            return LabRequest.objects.all()
        if user.role == 'doctor':
            return LabRequest.objects.filter(requested_by=user)
        if user.role == 'nurse':
            return LabRequest.objects.all()
        return LabRequest.objects.filter(requested_by=user)

    def perform_create(self, serializer):
        lab_request = serializer.save(requested_by=self.request.user)
        lab_request.lab_number = f"LR-{lab_request.id:06d}"
        lab_request.save()
        patient = lab_request.patient
        _create_timeline_event(
            patient, 'lab_request', 'lab_request', lab_request.id,
            f"Lab request: {lab_request.test_name}",
            f"Priority: {lab_request.priority}", self.request.user,
        )
        _create_notification(
            lab_request.requested_by, 'Lab Request Submitted',
            f"Lab request {lab_request.lab_number} for {patient.full_name} has been submitted.",
            priority=lab_request.priority, entity_type='lab_request', entity_id=lab_request.id,
        )
        encounter = Encounter.objects.filter(patient=patient, status='in_progress').first()
        if encounter and encounter.nurse:
            _create_notification(
                encounter.nurse, 'Lab Request for Your Patient',
                f"Lab request {lab_request.lab_number} for {patient.full_name}.",
                priority='normal', entity_type='lab_request', entity_id=lab_request.id,
            )

    @action(detail=True, methods=['post'])
    def collect_sample(self, request, pk=None):
        lab_request = self.get_object()
        if request.user.role not in ('lab_technician', 'nurse', 'administrator', 'doctor'):
            return Response({'detail': 'Not authorized.'}, status=403)
        lab_request.status = 'sample_collected'
        lab_request.sample_collected_by = request.user
        lab_request.sample_collected_at = timezone.now()
        lab_request.save()
        _create_notification(
            lab_request.requested_by, 'Sample Collected',
            f"Sample for lab request {lab_request.lab_number} has been collected.",
            priority='normal', entity_type='lab_request', entity_id=lab_request.id,
        )
        return Response({'status': 'sample_collected'})

    @action(detail=True, methods=['post'])
    def start_processing(self, request, pk=None):
        lab_request = self.get_object()
        if request.user.role not in ('lab_technician', 'administrator'):
            return Response({'detail': 'Not authorized.'}, status=403)
        lab_request.status = 'processing'
        lab_request.save()
        return Response({'status': 'processing'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        lab_request = self.get_object()
        if request.user.role not in ('lab_technician', 'administrator'):
            return Response({'detail': 'Not authorized.'}, status=403)
        lab_request.status = 'completed'
        lab_request.completed_at = timezone.now()
        lab_request.save()
        patient = lab_request.patient
        _create_timeline_event(
            patient, 'lab_result', 'lab_request', lab_request.id,
            f"Lab result ready: {lab_request.test_name}",
            f"Result: {lab_request.result}", self.request.user,
        )
        has_critical = lab_request.detailed_results.filter(status='critical').exists()
        priority = 'critical' if has_critical else 'normal'
        _create_notification(
            lab_request.requested_by, 'Lab Result Ready',
            f"Results for {lab_request.lab_number} are available. {'CRITICAL VALUE DETECTED.' if has_critical else ''}",
            priority=priority, entity_type='lab_request', entity_id=lab_request.id,
        )
        if has_critical:
            _create_notification(
                lab_request.requested_by, 'CRITICAL LAB VALUE',
                f"Critical value detected in {lab_request.lab_number}. Immediate attention required.",
                priority='critical', entity_type='lab_request', entity_id=lab_request.id,
            )
        return Response({'status': 'completed'})


class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        result = serializer.save()
        lab_request = result.lab_request
        lab_request.status = 'processing'
        lab_request.save()
        _create_timeline_event(
            lab_request.patient, 'lab_result_entry', 'lab_result', result.id,
            f"Result entered for {result.test_name}",
            f"Value: {result.result_value}", self.request.user,
        )


class TimelineEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TimelineEvent.objects.all()
    serializer_class = TimelineEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return TimelineEvent.objects.all().order_by('-occurred_at')
        return TimelineEvent.objects.filter(patient__hospital=user.hospital).order_by('-occurred_at')


class InsuranceCompanyViewSet(viewsets.ModelViewSet):
    queryset = InsuranceCompany.objects.all()
    serializer_class = InsuranceCompanySerializer
    permission_classes = [permissions.IsAuthenticated]


class NHISRecordViewSet(viewsets.ModelViewSet):
    queryset = NHISRecord.objects.all()
    serializer_class = NHISRecordSerializer
    permission_classes = [permissions.IsAuthenticated]


class PrivateInsuranceRecordViewSet(viewsets.ModelViewSet):
    queryset = PrivateInsuranceRecord.objects.all()
    serializer_class = PrivateInsuranceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]


class InsuranceCoverageRuleViewSet(viewsets.ModelViewSet):
    queryset = InsuranceCoverageRule.objects.all()
    serializer_class = InsuranceCoverageRuleSerializer
    permission_classes = [permissions.IsAuthenticated]


class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        cached = _check_idempotency(request, 'bill', '')
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            _store_idempotency(request, 'bill', '', response.status_code, response.data)
        return response

    def perform_create(self, serializer):
        bill = serializer.save()
        patient = bill.patient
        _create_timeline_event(
            patient, 'billing', 'bill', bill.id,
            f"Bill created: {bill.bill_type}",
            f"Total: {bill.total_amount}", self.request.user,
        )

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        cached = _check_idempotency(request, 'bill_mark_paid', str(pk))
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        bill = self.get_object()
        total_paid = sum(p.amount for p in bill.payments.all())
        if total_paid >= float(bill.total_amount):
            bill.status = 'paid'
        else:
            bill.status = 'partial'
        bill.save()
        response = Response({'status': bill.status})
        _store_idempotency(request, 'bill_mark_paid', str(pk), response.status_code, response.data)
        return response


class BillItemViewSet(viewsets.ModelViewSet):
    queryset = BillItem.objects.all()
    serializer_class = BillItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        cached = _check_idempotency(request, 'bill-item', '')
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            _store_idempotency(request, 'bill-item', '', response.status_code, response.data)
        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        cached = _check_idempotency(request, 'bill-item', str(instance.id))
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            _store_idempotency(request, 'bill-item', str(instance.id), response.status_code, response.data)
        return response

    def destroy(self, request, *args, **kwargs):
        pk = str(kwargs.get('pk', ''))
        cached = _check_idempotency(request, 'bill-item-delete', pk)
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().destroy(request, *args, **kwargs)
        _store_idempotency(request, 'bill-item-delete', pk, response.status_code, response.data or {})
        return response


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        cached = _check_idempotency(request, 'payment', '')
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            _store_idempotency(request, 'payment', '', response.status_code, response.data)
        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        cached = _check_idempotency(request, 'payment', str(instance.id))
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            _store_idempotency(request, 'payment', str(instance.id), response.status_code, response.data)
        return response

    def destroy(self, request, *args, **kwargs):
        pk = str(kwargs.get('pk', ''))
        cached = _check_idempotency(request, 'payment-delete', pk)
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().destroy(request, *args, **kwargs)
        _store_idempotency(request, 'payment-delete', pk, response.status_code, response.data or {})
        return response

    def perform_create(self, serializer):
        payment = serializer.save(received_by=self.request.user)
        bill = payment.bill
        total_paid = sum(p.amount for p in bill.payments.all())
        if total_paid >= float(bill.total_amount):
            bill.status = 'paid'
        elif total_paid > 0:
            bill.status = 'partial'
        bill.save()


class StockItemViewSet(viewsets.ModelViewSet):
    queryset = StockItem.objects.all()
    serializer_class = StockItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        cached = _check_idempotency(request, 'stock-item', '')
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            _store_idempotency(request, 'stock-item', '', response.status_code, response.data)
        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        cached = _check_idempotency(request, 'stock-item', str(instance.id))
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            _store_idempotency(request, 'stock-item', str(instance.id), response.status_code, response.data)
        return response

    def perform_create(self, serializer):
        item = serializer.save()
        StockMovement.objects.create(
            stock_item=item,
            movement_type='in',
            quantity=item.current_quantity,
            notes='Initial stock',
            created_by=self.request.user,
        )


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        cached = _check_idempotency(request, 'stock-movement', '')
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            _store_idempotency(request, 'stock-movement', '', response.status_code, response.data)
        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        cached = _check_idempotency(request, 'stock-movement', str(instance.id))
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            _store_idempotency(request, 'stock-movement', str(instance.id), response.status_code, response.data)
        return response

    def destroy(self, request, *args, **kwargs):
        pk = str(kwargs.get('pk', ''))
        cached = _check_idempotency(request, 'stock-movement-delete', pk)
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().destroy(request, *args, **kwargs)
        _store_idempotency(request, 'stock-movement-delete', pk, response.status_code, response.data or {})
        return response

    def perform_create(self, serializer):
        movement = serializer.save(created_by=self.request.user)
        item = movement.stock_item
        if movement.movement_type == 'in':
            item.current_quantity += movement.quantity
        elif movement.movement_type == 'out':
            item.current_quantity -= movement.quantity
        elif movement.movement_type == 'adjustment':
            item.current_quantity = movement.quantity
        item.save()


class MonthlyStatisticViewSet(viewsets.ModelViewSet):
    queryset = MonthlyStatistic.objects.all()
    serializer_class = MonthlyStatisticSerializer
    permission_classes = [permissions.IsAuthenticated]


class DiseaseOutbreakViewSet(viewsets.ModelViewSet):
    queryset = DiseaseOutbreak.objects.all()
    serializer_class = DiseaseOutbreakSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportTemplateViewSet(viewsets.ModelViewSet):
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportInstanceViewSet(viewsets.ModelViewSet):
    queryset = ReportInstance.objects.all()
    serializer_class = ReportInstanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        report = serializer.save(created_by=self.request.user)
        _create_audit(self.request.user, 'report_created', f"Report created: {report.title}")
        _create_notification(
            self.request.user, 'Report Created',
            f"Report '{report.title}' has been created and is in {report.status} status.",
            priority='normal', entity_type='report', entity_id=report.id,
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        report = self.get_object()
        report.status = 'submitted'
        report.submitted_by = request.user
        report.submitted_at = timezone.now()
        report.save()
        _create_audit(request.user, 'report_submitted', f"Report submitted: {report.title}")
        return Response({'status': 'submitted'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        report = self.get_object()
        report.status = 'approved'
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save()
        _create_audit(request.user, 'report_approved', f"Report approved: {report.title}")
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        report = self.get_object()
        report.status = 'rejected'
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.submission_notes = request.data.get('notes', '')
        report.save()
        _create_audit(request.user, 'report_rejected', f"Report rejected: {report.title}")
        return Response({'status': 'rejected'})


class ReportSectionViewSet(viewsets.ModelViewSet):
    queryset = ReportSection.objects.all()
    serializer_class = ReportSectionSerializer
    permission_classes = [permissions.IsAuthenticated]


class DataQualityAlertViewSet(viewsets.ModelViewSet):
    queryset = DataQualityAlert.objects.all()
    serializer_class = DataQualityAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_by = request.user
        alert.resolved_at = timezone.now()
        alert.resolution_notes = request.data.get('notes', '')
        alert.save()
        return Response({'status': 'resolved'})


class PublicHealthAlertViewSet(viewsets.ModelViewSet):
    queryset = PublicHealthAlert.objects.all()
    serializer_class = PublicHealthAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'investigating'
        alert.save()
        _create_audit(request.user, 'public_health_alert_ack', f"Acknowledged alert: {alert.disease_name}")
        return Response({'status': 'investigating'})

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.action_taken = request.data.get('action_taken', '')
        alert.save()
        _create_audit(request.user, 'public_health_alert_resolved', f"Resolved alert: {alert.disease_name}")
        return Response({'status': 'resolved'})


class PerformanceIndicatorViewSet(viewsets.ModelViewSet):
    queryset = PerformanceIndicator.objects.all()
    serializer_class = PerformanceIndicatorSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportExportViewSet(viewsets.ModelViewSet):
    queryset = ReportExport.objects.all()
    serializer_class = ReportExportSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportTemplateVersionViewSet(viewsets.ModelViewSet):
    queryset = ReportTemplateVersion.objects.all()
    serializer_class = ReportTemplateVersionSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportElementViewSet(viewsets.ModelViewSet):
    queryset = ReportElement.objects.all()
    serializer_class = ReportElementSerializer
    permission_classes = [permissions.IsAuthenticated]


class FormulaDefinitionViewSet(viewsets.ModelViewSet):
    queryset = FormulaDefinition.objects.all()
    serializer_class = FormulaDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportScheduleViewSet(viewsets.ModelViewSet):
    queryset = ReportSchedule.objects.all()
    serializer_class = ReportScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportDashboardPinViewSet(viewsets.ModelViewSet):
    queryset = ReportDashboardPin.objects.all()
    serializer_class = ReportDashboardPinSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReportExportFormatViewSet(viewsets.ModelViewSet):
    queryset = ReportExportFormat.objects.all()
    serializer_class = ReportExportFormatSerializer
    permission_classes = [permissions.IsAuthenticated]


# ---------------------------------------------------------------------------
# Dynamic Reporting Engine endpoints
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def duplicate_template(request, pk=None):
    template = ReportTemplate.objects.get(pk=pk)
    new_template = ReportTemplate.objects.create(
        name=f"{template.name} (Copy)",
        code=f"{template.code}_copy_{timezone.now().strftime('%Y%m%d%H%M%S')}",
        description=template.description,
        frequency=template.frequency,
        category=template.category,
        configuration=template.configuration,
        is_active=False,
        is_mandatory=template.is_mandatory,
        submission_deadline_days=template.submission_deadline_days,
        created_by=request.user,
    )
    for element in template.elements.all():
        ReportElement.objects.create(
            template=new_template,
            element_type=element.element_type,
            title=element.title,
            description=element.description,
            data_source=element.data_source,
            columns=element.columns,
            filters=element.filters,
            sorting=element.sorting,
            grouping=element.grouping,
            chart_config=element.chart_config,
            style=element.style,
            order=element.order,
            is_visible=element.is_visible,
        )
    for formula in template.formulas.all():
        FormulaDefinition.objects.create(
            template=new_template,
            name=formula.name,
            formula_type=formula.formula_type,
            expression=formula.expression,
            data_source=formula.data_source,
            field=formula.field,
            aggregation=formula.aggregation,
            filters=formula.filters,
            group_by=formula.group_by,
            order_by=formula.order_by,
            is_active=formula.is_active,
        )
    _create_audit(request.user, 'template_duplicated', f"Duplicated template: {template.name}")
    return Response(ReportTemplateSerializer(new_template).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_template(request, pk=None):
    template = ReportTemplate.objects.get(pk=pk)
    data = {
        'template': ReportTemplateSerializer(template).data,
        'elements': ReportElementSerializer(template.elements.all(), many=True).data,
        'formulas': FormulaDefinitionSerializer(template.formulas.all(), many=True).data,
        'sample_data': {},
    }
    for element in template.elements.all():
        model_class = _get_model_for_data_source(element.data_source)
        if model_class:
            qs = model_class.objects.all()[:10]
            serializer_class = _get_serializer_for_model(model_class)
            if serializer_class:
                data['sample_data'][element.title or element.element_type] = serializer_class(qs, many=True).data
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def evaluate_formula(request):
    formula_id = request.data.get('formula_id')
    hospital_id = request.data.get('hospital')
    start = request.data.get('start')
    end = request.data.get('end')

    try:
        formula = FormulaDefinition.objects.get(id=formula_id)
    except FormulaDefinition.DoesNotExist:
        return Response({'detail': 'Formula not found.'}, status=404)

    model_class = _get_model_for_data_source(formula.data_source)
    if not model_class:
        return Response({'detail': 'Invalid data source.'}, status=400)

    qs = model_class.objects.all()
    if hospital_id and hasattr(model_class, 'hospital'):
        qs = qs.filter(hospital_id=hospital_id)
    if start and hasattr(model_class, 'created_at'):
        qs = qs.filter(created_at__gte=start)
    if end and hasattr(model_class, 'created_at'):
        qs = qs.filter(created_at__lte=end)

    if formula.filters:
        for key, value in formula.filters.items():
            qs = qs.filter(**{key: value})

    aggregation_map = {
        'count': qs.count(),
        'sum': qs.aggregate(total=Sum(formula.field or 'id'))['total'] or 0,
        'avg': qs.aggregate(avg=Avg(formula.field or 'id'))['avg'] or 0,
        'min': qs.aggregate(min=Min(formula.field or 'id'))['min'] or 0,
        'max': qs.aggregate(max=Max(formula.field or 'id'))['max'] or 0,
    }

    result = aggregation_map.get(formula.aggregation, qs.count())
    return Response({'formula': formula.name, 'result': result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_report(request, pk):
    report = ReportInstance.objects.get(pk=pk)
    export_format = request.query_params.get('format', 'pdf')

    try:
        export_format_obj = ReportExportFormat.objects.get(format_type=export_format, is_active=True)
    except ReportExportFormat.DoesNotExist:
        export_format_obj = ReportExportFormat.objects.filter(format_type=export_format).first()

    ReportExport.objects.create(
        report=report,
        export_format=export_format,
        exported_by=request.user,
    )
    _create_audit(request.user, 'report_exported', f"Exported report: {report.title} as {export_format}")
    return Response({
        'detail': 'Export initiated',
        'format': export_format,
        'report': report.title,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pin_report_to_dashboard(request):
    report_id = request.data.get('report_id')
    position = request.data.get('position', 0)
    try:
        report = ReportInstance.objects.get(id=report_id)
    except ReportInstance.DoesNotExist:
        return Response({'detail': 'Report not found.'}, status=404)

    pin, created = ReportDashboardPin.objects.get_or_create(
        user=request.user,
        report=report,
        defaults={'position': position, 'is_visible': True},
    )
    if not created:
        pin.position = position
        pin.is_visible = True
        pin.save()

    return Response(ReportDashboardPinSerializer(pin).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unpin_report_from_dashboard(request, report_id):
    ReportDashboardPin.objects.filter(user=request.user, report_id=report_id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Referral Management
# ---------------------------------------------------------------------------

class ReferralViewSet(viewsets.ModelViewSet):
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Referral.objects.all()
        if user.role == 'doctor':
            return Referral.objects.filter(
                Q(referring_doctor=user) | Q(receiving_facility=user.hospital) |
                Q(accepted_by=user)
            )
        if user.role == 'nurse':
            return Referral.objects.filter(patient__hospital=user.hospital)
        return Referral.objects.filter(referring_doctor=user)

    def perform_create(self, serializer):
        referral = serializer.save(referring_doctor=self.request.user)
        if referral.patient_id:
            _create_timeline_event(
                referral.patient, 'referral', 'referrals', referral.id,
                f"Referral created ({referral.get_referral_type_display()})",
                f"Urgency: {referral.urgency_level}, Status: {referral.status}", self.request.user,
            )
        _create_audit(self.request.user, 'referral_created', f"Referral created for {referral.patient.full_name if referral.patient else 'unknown'}")

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        referral = serializer.save()
        if old_status != referral.status:
            self._handle_status_change(referral, old_status, referral.status, self.request.user)

    def _handle_status_change(self, referral, old_status, new_status, user):
        if old_status == new_status:
            return
        _create_audit(user, 'referral_status_change', f"Referral for {referral.patient.full_name}: {old_status} -> {new_status}")
        if referral.patient_id:
            _create_timeline_event(
                referral.patient, 'referral', 'referrals', referral.id,
                f"Referral status: {old_status} -> {new_status}", "", user,
            )
        if new_status == 'submitted' and referral.receiving_facility:
            receiving_users = User.objects.filter(hospital=referral.receiving_facility, role='doctor')
            for recv in receiving_users:
                _create_notification(
                    recv, 'New Referral Received',
                    f"New referral for {referral.patient.full_name} from {referral.referring_facility.name}.",
                    priority='high' if referral.is_emergency else 'normal',
                    entity_type='referral', entity_id=referral.id,
                )
        if new_status == 'accepted' and hasattr(referral, 'accepted_by') and not referral.accepted_by:
            referral.accepted_by = user
            referral.accepted_at = timezone.now()
            referral.save()
        if new_status == 'accepted':
            _create_notification(
                referral.referring_doctor, 'Referral Accepted',
                f"Dr. {user.username} accepted referral for {referral.patient.full_name}.",
                priority='normal', entity_type='referral', entity_id=referral.id,
            )
        if new_status == 'rejected':
            _create_notification(
                referral.referring_doctor, 'Referral Rejected',
                f"Referral for {referral.patient.full_name} was rejected. Reason: {referral.rejection_reason}",
                priority='normal', entity_type='referral', entity_id=referral.id,
            )
        if new_status == 'completed':
            _create_audit(user, 'referral_completed', f"Referral completed for {referral.patient.full_name}")
            referral.completed_at = timezone.now()
            referral.save()
            _create_notification(
                referral.referring_doctor, 'Referral Completed',
                f"Referral for {referral.patient.full_name} has been completed.",
                priority='normal', entity_type='referral', entity_id=referral.id,
            )
        if new_status == 'cancelled':
            _create_audit(user, 'referral_cancelled', f"Referral cancelled for {referral.patient.full_name}")

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        referral = self.get_object()
        if referral.referring_doctor != request.user and request.user.role != 'administrator':
            return Response({'detail': 'Not authorized.'}, status=403)
        if referral.status != 'draft':
            return Response({'detail': 'Only draft referrals can be submitted.'}, status=400)
        referral.status = 'submitted'
        referral.referral_date = timezone.now()
        referral.save()
        _create_audit(request.user, 'referral_submitted', f"Referral submitted for {referral.patient.full_name}")
        if referral.receiving_facility:
            receiving_users = User.objects.filter(hospital=referral.receiving_facility, role='doctor')
            for recv in receiving_users:
                _create_notification(
                    recv, 'New Referral Received',
                    f"New referral for {referral.patient.full_name} from {referral.referring_facility.name}.",
                    priority='high' if referral.is_emergency else 'normal',
                    entity_type='referral', entity_id=referral.id,
                )
        if referral.patient_id:
            _create_timeline_event(
                referral.patient, 'referral', 'referrals', referral.id,
                "Referral submitted", f"To: {referral.receiving_facility.name if referral.receiving_facility else 'N/A'}", request.user,
            )
        return Response({'status': 'submitted'})

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        referral = self.get_object()
        if referral.receiving_facility and referral.receiving_facility != request.user.hospital and request.user.role != 'administrator':
            return Response({'detail': 'Not authorized.'}, status=403)
        if referral.status not in ('submitted', 'received', 'under_review'):
            return Response({'detail': 'Referral must be submitted first.'}, status=400)
        referral.status = 'accepted'
        referral.accepted_by = request.user
        referral.accepted_at = timezone.now()
        referral.save()
        _create_audit(request.user, 'referral_accepted', f"Referral accepted for {referral.patient.full_name}")
        _create_notification(
            referral.referring_doctor, 'Referral Accepted',
            f"Dr. {request.user.username} accepted referral for {referral.patient.full_name}.",
            priority='normal', entity_type='referral', entity_id=referral.id,
        )
        if referral.patient_id:
            _create_timeline_event(
                referral.patient, 'referral', 'referrals', referral.id,
                "Referral accepted", f"By: {request.user.username}", request.user,
            )
        return Response({'status': 'accepted'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        referral = self.get_object()
        if referral.receiving_facility and referral.receiving_facility != request.user.hospital and request.user.role != 'administrator':
            return Response({'detail': 'Not authorized.'}, status=403)
        if referral.status not in ('submitted', 'received', 'under_review'):
            return Response({'detail': 'Referral must be submitted first.'}, status=400)
        referral.status = 'rejected'
        referral.rejection_reason = request.data.get('reason', '')
        referral.save()
        _create_audit(request.user, 'referral_rejected', f"Referral rejected for {referral.patient.full_name}")
        _create_notification(
            referral.referring_doctor, 'Referral Rejected',
            f"Referral for {referral.patient.full_name} was rejected. Reason: {referral.rejection_reason}",
            priority='normal', entity_type='referral', entity_id=referral.id,
        )
        if referral.patient_id:
            _create_timeline_event(
                referral.patient, 'referral', 'referrals', referral.id,
                "Referral rejected", f"Reason: {referral.rejection_reason}", request.user,
            )
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        referral = self.get_object()
        if referral.status != 'accepted':
            return Response({'detail': 'Only accepted referrals can be completed.'}, status=400)
        referral.status = 'completed'
        referral.completed_at = timezone.now()
        referral.save()
        _create_audit(request.user, 'referral_completed', f"Referral completed for {referral.patient.full_name}")
        _create_notification(
            referral.referring_doctor, 'Referral Completed',
            f"Referral for {referral.patient.full_name} has been completed.",
            priority='normal', entity_type='referral', entity_id=referral.id,
        )
        if referral.patient_id:
            _create_timeline_event(
                referral.patient, 'referral', 'referrals', referral.id,
                "Referral completed", "", request.user,
            )
        return Response({'status': 'completed'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        referral = self.get_object()
        if referral.referring_doctor != request.user and request.user.role != 'administrator':
            return Response({'detail': 'Not authorized.'}, status=403)
        if referral.status in ('completed', 'cancelled'):
            return Response({'detail': 'Cannot cancel this referral.'}, status=400)
        referral.status = 'cancelled'
        referral.save()
        _create_audit(request.user, 'referral_cancelled', f"Referral cancelled for {referral.patient.full_name}")
        if referral.patient_id:
            _create_timeline_event(
                referral.patient, 'referral', 'referrals', referral.id,
                "Referral cancelled", "", request.user,
            )
        return Response({'status': 'cancelled'})


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Ward.objects.all()
        if user.hospital:
            return Ward.objects.filter(hospital=user.hospital)
        return Ward.objects.none()


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Room.objects.all()
        if user.hospital:
            return Room.objects.filter(ward__hospital=user.hospital)
        return Room.objects.none()


class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Bed.objects.all()
        if user.hospital:
            return Bed.objects.filter(room__ward__hospital=user.hospital)
        return Bed.objects.none()


class AdmissionViewSet(viewsets.ModelViewSet):
    queryset = Admission.objects.all()
    serializer_class = AdmissionSerializer
    permission_classes = [IsDoctorOrNurseOrAdminForRead]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Admission.objects.all()
        if user.role == 'doctor':
            return Admission.objects.filter(
                Q(doctor=user) | Q(admitting_doctor=user) | Q(patient__hospital=user.hospital)
            )
        if user.role == 'nurse':
            return Admission.objects.filter(patient__hospital=user.hospital)
        return Admission.objects.filter(patient__hospital=user.hospital) if user.hospital else Admission.objects.none()

    def create(self, request, *args, **kwargs):
        cached = _check_idempotency(request, 'admission', '')
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            _store_idempotency(request, 'admission', '', response.status_code, response.data)
        return response

    def perform_create(self, serializer):
        bed = serializer.validated_data.get('bed')
        if bed and bed.status == 'occupied' and bed.current_patient_id != serializer.validated_data.get('patient').id:
            raise serializers.ValidationError({'bed': 'This bed is already occupied by another patient.'})
        admission = serializer.save(
            admitting_doctor=self.request.user,
            doctor=self.request.user if self.request.user.role == 'doctor' else None,
        )

        encounter = Encounter.objects.create(
            patient=admission.patient,
            doctor=admission.doctor,
            encounter_type='admission',
            status='in_progress',
            notes=f"Inpatient admission to {admission.ward.name if admission.ward else 'unknown ward'}.",
        )
        admission.encounter = encounter
        admission.save()

        if admission.bed:
            admission.bed.status = 'occupied'
            admission.bed.current_patient = admission.patient
            admission.bed.save()

        if admission.patient_id:
            _create_timeline_event(
                admission.patient, 'admission', 'admissions', admission.id,
                f"Admitted to {admission.ward.name if admission.ward else 'ward'}",
                f"Admission type: {admission.get_admission_type_display()}", self.request.user,
            )
        _create_audit(self.request.user, 'admission_created', f"Admission created for {admission.patient.full_name}")
        if admission.doctor:
            _create_notification(
                admission.doctor, 'New Inpatient Admission',
                f"{admission.patient.full_name} has been admitted to {admission.ward.name if admission.ward else 'ward'}.",
                priority='normal', entity_type='admission', entity_id=admission.id,
            )

    @action(detail=True, methods=['post'])
    def discharge(self, request, pk=None):
        cached = _check_idempotency(request, 'admission-discharge', str(pk))
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        admission = self.get_object()
        if request.user.role not in ('doctor', 'administrator'):
            return Response({'detail': 'Only doctors can discharge patients.'}, status=403)
        if admission.status == 'discharged':
            return Response({'detail': 'Patient already discharged.'}, status=400)

        admission.discharge_date = timezone.now()
        admission.discharge_diagnosis = request.data.get('discharge_diagnosis', admission.discharge_diagnosis)
        admission.condition_at_discharge = request.data.get('condition_at_discharge', '')
        admission.treatment_provided = request.data.get('treatment_provided', '')
        admission.procedures_performed = request.data.get('procedures_performed', '')
        admission.discharge_medications = request.data.get('discharge_medications', '')
        admission.follow_up_instructions = request.data.get('follow_up_instructions', '')
        admission.follow_up_appointment = request.data.get('follow_up_appointment', '')
        admission.discharge_notes = request.data.get('discharge_notes', '')
        admission.discharge_status = request.data.get('discharge_status', 'discharged')
        admission.status = 'discharged'
        admission.discharged_by = request.user
        admission.discharged_at = timezone.now()
        admission.save()

        if admission.encounter:
            admission.encounter.status = 'completed'
            admission.encounter.save()

        if admission.bed:
            admission.bed.status = 'available'
            admission.bed.current_patient = None
            admission.bed.save()

        if admission.patient_id:
            _create_timeline_event(
                admission.patient, 'discharge', 'admissions', admission.id,
                f"Patient discharged - {admission.discharge_status}",
                f"Condition at discharge: {admission.condition_at_discharge}", request.user,
            )
        _create_audit(request.user, 'admission_discharged', f"Discharge for {admission.patient.full_name}: {admission.discharge_status}")

        total_billed = sum(float(bi.total_price) for bi in BillItem.objects.filter(bill__patient=admission.patient))
        if total_billed > 0:
            _create_notification(
                request.user, 'Inpatient Billing Complete',
                f"Billing finalized for {admission.patient.full_name}. Total: {total_billed}",
                priority='normal', entity_type='bill', entity_id=admission.patient.bills.first().id if admission.patient.bills.first() else '',
            )

        response = Response({'status': 'discharged'})
        _store_idempotency(request, 'admission-discharge', str(pk), response.status_code, response.data)
        return response

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        admission = self.get_object()
        if request.user.role not in ('doctor', 'administrator', 'nurse'):
            return Response({'detail': 'Not authorized.'}, status=403)

        to_ward_id = request.data.get('to_ward')
        to_room_id = request.data.get('to_room')
        to_bed_id = request.data.get('to_bed')
        reason = request.data.get('reason', '')

        try:
            to_ward = Ward.objects.get(id=to_ward_id)
        except (Ward.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid destination ward.'}, status=400)
        try:
            to_room = Room.objects.get(id=to_room_id, ward=to_ward)
        except (Room.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid destination room.'}, status=400)
        try:
            to_bed = Bed.objects.get(id=to_bed_id, room=to_room)
        except (Bed.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid destination bed.'}, status=400)

        if to_bed.status == 'occupied':
            return Response({'detail': 'Selected bed is already occupied.'}, status=400)

        from_ward = admission.ward
        from_room = admission.room
        from_bed = admission.bed

        if from_bed:
            from_bed.status = 'available'
            from_bed.current_patient = None
            from_bed.save()

        to_bed.status = 'occupied'
        to_bed.current_patient = admission.patient
        to_bed.save()

        BedTransfer.objects.create(
            admission=admission,
            patient=admission.patient,
            from_ward=from_ward,
            from_room=from_room,
            from_bed=from_bed,
            to_ward=to_ward,
            to_room=to_room,
            to_bed=to_bed,
            reason=reason,
            transferred_by=request.user,
        )

        admission.ward = to_ward
        admission.room = to_room
        admission.bed = to_bed
        admission.save()

        _create_audit(request.user, 'bed_transfer', f"Transferred {admission.patient.full_name} to {to_ward.name} / {to_room.room_number} / {to_bed.bed_number}")
        if admission.patient_id:
            _create_timeline_event(
                admission.patient, 'transfer', 'bed_transfers', admission.id,
                f"Transferred to {to_ward.name}", reason, request.user,
            )
        if admission.doctor:
            _create_notification(
                admission.doctor, 'Patient Transferred',
                f"{admission.patient.full_name} transferred to {to_ward.name}.",
                priority='normal', entity_type='admission', entity_id=admission.id,
            )

        return Response(AdmissionSerializer(admission).data)

    @action(detail=True, methods=['post'])
    def assign_bed(self, request, pk=None):
        admission = self.get_object()
        bed_id = request.data.get('bed_id')
        try:
            bed = Bed.objects.get(id=bed_id)
            if bed.status != 'available':
                return Response({'detail': 'Selected bed is not available.'}, status=400)
            if admission.bed:
                admission.bed.status = 'available'
                admission.bed.current_patient = None
                admission.bed.save()
            bed.status = 'occupied'
            bed.current_patient = admission.patient
            bed.save()
            admission.bed = bed
            admission.room = bed.room
            admission.ward = bed.room.ward
            admission.save()
            _create_audit(request.user, 'bed_assigned', f"Bed {bed.bed_number} assigned to {admission.patient.full_name}")
            return Response(BedSerializer(bed).data)
        except (Bed.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid bed.'}, status=400)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        admission = serializer.save()
        if old_status == 'admitted' and admission.status == 'discharged':
            self._do_discharge(admission, self.request.user)
        elif old_status == 'admitted' and admission.status == 'transferred':
            pass

    def _do_discharge(self, admission, user):
        if admission.encounter:
            admission.encounter.status = 'completed'
            admission.encounter.save()
        if admission.bed:
            admission.bed.status = 'available'
            admission.bed.current_patient = None
            admission.bed.save()
        _create_audit(user, 'admission_discharged', f"Discharge for {admission.patient.full_name}: {admission.discharge_status}")
        if admission.patient_id:
            _create_timeline_event(
                admission.patient, 'discharge', 'admissions', admission.id,
                f"Patient discharged - {admission.discharge_status}",
                f"Condition at discharge: {admission.condition_at_discharge}", user,
            )
        total_billed = sum(float(bi.total_price) for bi in BillItem.objects.filter(bill__patient=admission.patient))
        if total_billed > 0 and admission.doctor_id:
            _create_notification(
                admission.doctor, 'Inpatient Billing Complete',
                f"Billing finalized for {admission.patient.full_name}. Total: {total_billed}",
                priority='normal', entity_type='bill', entity_id='',
            )


class InpatientNoteViewSet(viewsets.ModelViewSet):
    queryset = InpatientNote.objects.all()
    serializer_class = InpatientNoteSerializer
    permission_classes = [IsInpatientStaffOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return InpatientNote.objects.all()
        if user.hospital:
            return InpatientNote.objects.filter(patient__hospital=user.hospital)
        return InpatientNote.objects.none()

    def perform_create(self, serializer):
        note = serializer.save(recorded_by=self.request.user)
        if note.patient_id:
            _create_timeline_event(
                note.patient, 'note', 'inpatient_notes', note.id,
                note.title or note.get_note_type_display(),
                note.content[:200] if note.content else '', self.request.user,
            )
        if note.is_critical and note.admission and note.admission.doctor_id:
                _create_notification(
                    note.admission.doctor, 'Critical Inpatient Note',
                    f"Critical note recorded for {note.patient.full_name}.",
                    priority='critical', entity_type='inpatient_note', entity_id=note.id,
                )


class BedTransferViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BedTransfer.objects.all()
    serializer_class = BedTransferSerializer
    permission_classes = [IsInpatientStaffOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return BedTransfer.objects.all()
        if user.hospital:
            return BedTransfer.objects.filter(patient__hospital=user.hospital)
        return BedTransfer.objects.none()


class MedicationAdministrationViewSet(viewsets.ModelViewSet):
    queryset = MedicationAdministration.objects.all()
    serializer_class = MedicationAdministrationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return MedicationAdministration.objects.all()
        if user.hospital:
            return MedicationAdministration.objects.filter(patient__hospital=user.hospital)
        return MedicationAdministration.objects.none()

    def perform_create(self, serializer):
        med = serializer.save(administered_by=self.request.user)
        if med.patient_id:
            _create_timeline_event(
                med.patient, 'medication', 'med_admins', med.id,
                f"Medication: {med.medication} {med.dosage}",
                f"Route: {med.route or ''}", self.request.user,
            )


class InpatientLabRequestViewSet(viewsets.ModelViewSet):
    queryset = InpatientLabRequest.objects.all()
    serializer_class = InpatientLabRequestSerializer
    permission_classes = [IsInpatientStaffOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return InpatientLabRequest.objects.all()
        if user.role == 'lab_technician':
            return InpatientLabRequest.objects.all()
        if user.hospital:
            return InpatientLabRequest.objects.filter(patient__hospital=user.hospital)
        return InpatientLabRequest.objects.none()

    def perform_create(self, serializer):
        lab_req = serializer.save(requested_by=self.request.user)
        lab_req.lab_number = f"ILR-{lab_req.id:06d}"
        lab_req.save()
        if lab_req.patient_id:
            _create_timeline_event(
                lab_req.patient, 'lab_request', 'inpatient_lab_requests', lab_req.id,
                f"Lab request: {lab_req.test_name}", f"Priority: {lab_req.priority}", self.request.user,
            )
        if lab_req.admission and lab_req.admission.doctor_id:
            _create_notification(
                lab_req.admission.doctor, 'Inpatient Lab Request',
                f"Lab request {lab_req.lab_number} created for {lab_req.patient.full_name}.",
                priority=lab_req.priority, entity_type='inpatient_lab_request', entity_id=lab_req.id,
            )

    @action(detail=True, methods=['post'])
    def collect_sample(self, request, pk=None):
        lab_req = self.get_object()
        if request.user.role not in ('lab_technician', 'nurse', 'administrator', 'doctor'):
            return Response({'detail': 'Not authorized.'}, status=403)
        lab_req.status = 'sample_collected'
        lab_req.sample_collected_at = timezone.now()
        lab_req.sample_collected_by = request.user
        lab_req.save()
        return Response({'status': 'sample_collected'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        lab_req = self.get_object()
        if request.user.role not in ('lab_technician', 'administrator'):
            return Response({'detail': 'Not authorized.'}, status=403)
        lab_req.status = 'completed'
        lab_req.completed_at = timezone.now()
        lab_req.result = request.data.get('result', lab_req.result)
        lab_req.save()
        if lab_req.patient_id:
            _create_timeline_event(
                lab_req.patient, 'lab_result', 'inpatient_lab_requests', lab_req.id,
                f"Lab result ready: {lab_req.test_name}", f"Result: {lab_req.result}", request.user,
            )
        if lab_req.admission and lab_req.admission.doctor_id:
            _create_notification(
                lab_req.admission.doctor, 'Inpatient Lab Result Ready',
                f"Results for {lab_req.lab_number} are available.",
                priority='normal', entity_type='inpatient_lab_request', entity_id=lab_req.id,
            )
        return Response({'status': 'completed'})


class InpatientPrescriptionViewSet(viewsets.ModelViewSet):
    queryset = InpatientPrescription.objects.all()
    serializer_class = InpatientPrescriptionSerializer
    permission_classes = [IsDoctorOrPharmacistOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return InpatientPrescription.objects.all()
        if user.hospital:
            return InpatientPrescription.objects.filter(patient__hospital=user.hospital)
        return InpatientPrescription.objects.none()

    def create(self, request, *args, **kwargs):
        cached = _check_idempotency(request, 'inpatient-prescription', '')
        if cached is not None:
            return Response(cached.response_body, status=cached.response_status)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            _store_idempotency(request, 'inpatient-prescription', '', response.status_code, response.data)
        return response

    def perform_create(self, serializer):
        prescription = serializer.save(doctor=self.request.user if self.request.user.role == 'doctor' else None)
        if prescription.patient_id:
            _create_timeline_event(
                prescription.patient, 'prescription', 'inpatient_prescriptions', prescription.id,
                f"Prescription: {prescription.medication} {prescription.dosage}",
                f"Frequency: {prescription.frequency or ''}", self.request.user,
            )
# ---------------------------------------------------------------------------
class ClinicalProgressNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalProgressNote.objects.all()
    serializer_class = ClinicalProgressNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return ClinicalProgressNote.objects.all()
        if user.hospital:
            return ClinicalProgressNote.objects.filter(patient__hospital=user.hospital)
        return ClinicalProgressNote.objects.none()

    def perform_create(self, serializer):
        note = serializer.save(recorded_by=self.request.user)
        if note.patient_id:
            _create_timeline_event(
                note.patient, 'clinical_progress', 'clinical_progress_notes', note.id,
                f"Clinical progress note: {note.get_clinical_status_display()}",
                f"Response to treatment: {note.get_response_to_treatment_display() or 'N/A'}", self.request.user,
            )
        _create_audit(self.request.user, 'clinical_progress_note_created', f"Clinical progress note created for {note.patient.full_name}")

    def perform_update(self, serializer):
        note = serializer.save()
        if note.is_amendment:
            _create_audit(self.request.user, 'clinical_progress_note_amended', f"Clinical progress note {note.id} amended for {note.patient.full_name}")
# ---------------------------------------------------------------------------

class AntenatalRecordViewSet(viewsets.ModelViewSet):
    queryset = AntenatalRecord.objects.all()
    serializer_class = AntenatalRecordSerializer
    permission_classes = [IsMidwifeOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return AntenatalRecord.objects.all()
        if user.hospital:
            return AntenatalRecord.objects.filter(patient__hospital=user.hospital)
        return AntenatalRecord.objects.none()

    def perform_create(self, serializer):
        record = serializer.save()
        if record.patient_id:
            _create_timeline_event(
                record.patient, 'antenatal', 'antenatal-records', record.id,
                f"Antenatal record created (GA: {record.current_gestational_age or '?'}w, Risk: {record.get_risk_classification_display()})",
                f"Gravida: {record.gravida}, Para: {record.para}", self.request.user,
            )
        _create_audit(self.request.user, 'antenatal_record_created', f"Antenatal record created for {record.patient.full_name}")


class LabourRecordViewSet(viewsets.ModelViewSet):
    queryset = LabourRecord.objects.all()
    serializer_class = LabourRecordSerializer
    permission_classes = [IsMidwifeOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return LabourRecord.objects.all()
        if user.hospital:
            return LabourRecord.objects.filter(patient__hospital=user.hospital)
        return LabourRecord.objects.none()

    def perform_create(self, serializer):
        record = serializer.save()
        if record.patient_id:
            _create_timeline_event(
                record.patient, 'labour', 'labour-records', record.id,
                f"Labour record created ({record.get_labour_status_display()})",
                f"Cervical dilation: {record.cervical_dilation or 'N/A'}", self.request.user,
            )
        _create_audit(self.request.user, 'labour_record_created', f"Labour record created for {record.patient.full_name}")


class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [IsMidwifeOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Delivery.objects.all()
        if user.hospital:
            return Delivery.objects.filter(patient__hospital=user.hospital)
        return Delivery.objects.none()

    def perform_create(self, serializer):
        delivery = serializer.save()
        if delivery.patient_id:
            _create_timeline_event(
                delivery.patient, 'delivery', 'deliveries', delivery.id,
                f"Delivery recorded ({delivery.get_delivery_type_display()}, {delivery.get_delivery_outcome_display()})",
                f"Maternal outcome: {delivery.get_maternal_outcome_display()}", self.request.user,
            )
        _create_audit(self.request.user, 'delivery_recorded', f"Delivery recorded for {delivery.patient.full_name}")


class NewbornViewSet(viewsets.ModelViewSet):
    queryset = Newborn.objects.all()
    serializer_class = NewbornSerializer
    permission_classes = [IsMidwifeOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Newborn.objects.all()
        if user.hospital:
            return Newborn.objects.filter(mother__hospital=user.hospital)
        return Newborn.objects.none()

    def perform_create(self, serializer):
        newborn = serializer.save()
        if newborn.mother_id:
            _create_timeline_event(
                newborn.mother, 'newborn', 'newborns', newborn.id,
                f"Newborn record created ({newborn.get_sex_display()})",
                f"Birth weight: {newborn.birth_weight or 'N/A'} kg", self.request.user,
            )
        _create_audit(self.request.user, 'newborn_recorded', f"Newborn record created for mother {newborn.mother.full_name}")


class FetalAssessmentViewSet(viewsets.ModelViewSet):
    queryset = FetalAssessment.objects.all()
    serializer_class = FetalAssessmentSerializer
    permission_classes = [IsMidwifeOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return FetalAssessment.objects.all()
        if user.hospital:
            return FetalAssessment.objects.filter(patient__hospital=user.hospital)
        return FetalAssessment.objects.none()

    def perform_create(self, serializer):
        assessment = serializer.save()
        if assessment.patient_id:
            _create_timeline_event(
                assessment.patient, 'fetal_assessment', 'fetal-assessments', assessment.id,
                f"Fetal assessment recorded (FHR: {assessment.fetal_heart_rate or 'N/A'} bpm)",
                f"Movement: {assessment.get_fetal_movement_display() or 'N/A'}", self.request.user,
            )
        _create_audit(self.request.user, 'fetal_assessment_created', f"Fetal assessment created for {assessment.patient.full_name}")


class PostnatalRecordViewSet(viewsets.ModelViewSet):
    queryset = PostnatalRecord.objects.all()
    serializer_class = PostnatalRecordSerializer
    permission_classes = [IsMidwifeOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return PostnatalRecord.objects.all()
        if user.hospital:
            return PostnatalRecord.objects.filter(patient__hospital=user.hospital)
        return PostnatalRecord.objects.none()

    def perform_create(self, serializer):
        record = serializer.save()
        if record.patient_id:
            _create_timeline_event(
                record.patient, 'postnatal', 'postnatal-records', record.id,
                f"Postnatal record created ({record.get_postnatal_status_display()})",
                f"Feeding: {record.feeding_status or 'N/A'}", self.request.user,
            )
        _create_audit(self.request.user, 'postnatal_record_created', f"Postnatal record created for {record.patient.full_name}")


class MaternityNoteViewSet(viewsets.ModelViewSet):
    queryset = MaternityNote.objects.all()
    serializer_class = MaternityNoteSerializer
    permission_classes = [IsMidwifeOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return MaternityNote.objects.all()
        if user.hospital:
            return MaternityNote.objects.filter(patient__hospital=user.hospital)
        return MaternityNote.objects.none()

    def perform_create(self, serializer):
        note = serializer.save(created_by=self.request.user)
        if note.patient_id:
            _create_timeline_event(
                note.patient, 'maternity_note', 'maternity-notes', note.id,
                f"Maternity note: {note.get_maternity_status_display()}",
                note.progress[:200] if note.progress else '', self.request.user,
            )
        _create_audit(self.request.user, 'maternity_note_created', f"Maternity note created for {note.patient.full_name}")
PULL_REGISTRY = {
    'hospitals': (Hospital, HospitalSerializer, 'created_at'),
    'users': (User, UserSerializer, 'date_joined'),
    'patients': (Patient, PatientSerializer, 'updated_at'),
    'encounters': (Encounter, EncounterSerializer, 'updated_at'),
    'vitals': (VitalSign, VitalSignSerializer, 'recorded_at'),
    'appointments': (Appointment, AppointmentSerializer, 'created_at'),
    'lab-orders': (LabOrder, LabOrderSerializer, 'created_at'),
    'prescriptions': (Prescription, PrescriptionSerializer, 'created_at'),
    'messages': (Message, MessageSerializer, 'created_at'),
    'handovers': (Handover, HandoverSerializer, 'updated_at'),
    'notifications': (Notification, NotificationSerializer, 'created_at'),
    'lab-requests': (LabRequest, LabRequestSerializer, 'updated_at'),
    'lab-results': (LabResult, LabResultSerializer, 'completed_at'),
    'timeline': (TimelineEvent, TimelineEventSerializer, 'occurred_at'),
    'insurance-companies': (InsuranceCompany, InsuranceCompanySerializer, 'created_at'),
    'nhis-records': (NHISRecord, NHISRecordSerializer, 'updated_at'),
    'private-insurance-records': (PrivateInsuranceRecord, PrivateInsuranceRecordSerializer, 'updated_at'),
    'insurance-coverage-rules': (InsuranceCoverageRule, InsuranceCoverageRuleSerializer, 'created_at'),
    'bills': (Bill, BillSerializer, 'updated_at'),
    'bill-items': (BillItem, BillItemSerializer, 'created_at'),
    'payments': (Payment, PaymentSerializer, 'paid_at'),
    'stock-items': (StockItem, StockItemSerializer, 'updated_at'),
    'stock-movements': (StockMovement, StockMovementSerializer, 'created_at'),
    'monthly-statistics': (MonthlyStatistic, MonthlyStatisticSerializer, 'created_at'),
    'disease-outbreaks': (DiseaseOutbreak, DiseaseOutbreakSerializer, 'created_at'),
    'report-templates': (ReportTemplate, ReportTemplateSerializer, 'created_at'),
    'report-instances': (ReportInstance, ReportInstanceSerializer, 'updated_at'),
    'report-sections': (ReportSection, ReportSectionSerializer, 'created_at'),
    'data-quality-alerts': (DataQualityAlert, DataQualityAlertSerializer, 'created_at'),
    'public-health-alerts': (PublicHealthAlert, PublicHealthAlertSerializer, 'created_at'),
    'performance-indicators': (PerformanceIndicator, PerformanceIndicatorSerializer, 'calculated_at'),
    'report-exports': (ReportExport, ReportExportSerializer, 'exported_at'),
    'report-template-versions': (ReportTemplateVersion, ReportTemplateVersionSerializer, 'created_at'),
    'report-elements': (ReportElement, ReportElementSerializer, 'created_at'),
    'formula-definitions': (FormulaDefinition, FormulaDefinitionSerializer, 'created_at'),
    'report-schedules': (ReportSchedule, ReportScheduleSerializer, 'created_at'),
    'report-dashboard-pins': (ReportDashboardPin, ReportDashboardPinSerializer, 'created_at'),
    'report-export-formats': (ReportExportFormat, ReportExportFormatSerializer, 'created_at'),
    'referrals': (Referral, ReferralSerializer, 'updated_at'),
    'wards': (Ward, WardSerializer, 'created_at'),
    'rooms': (Room, RoomSerializer, 'created_at'),
    'beds': (Bed, BedSerializer, 'updated_at'),
    'admissions': (Admission, AdmissionSerializer, 'updated_at'),
    'inpatient-notes': (InpatientNote, InpatientNoteSerializer, 'recorded_at'),
    'bed-transfers': (BedTransfer, BedTransferSerializer, 'created_at'),
    'med-admins': (MedicationAdministration, MedicationAdministrationSerializer, 'administered_at'),
    'inpatient-lab-requests': (InpatientLabRequest, InpatientLabRequestSerializer, 'updated_at'),
    'inpatient-prescriptions': (InpatientPrescription, InpatientPrescriptionSerializer, 'created_at'),
    'clinical-progress-notes': (ClinicalProgressNote, ClinicalProgressNoteSerializer, 'created_at'),
    'diagnosis-terms': (DiagnosisTerm, DiagnosisTermSerializer, 'updated_at'),
    'antenatal-records': (AntenatalRecord, AntenatalRecordSerializer, 'updated_at'),
    'labour-records': (LabourRecord, LabourRecordSerializer, 'updated_at'),
    'deliveries': (Delivery, DeliverySerializer, 'created_at'),
    'newborns': (Newborn, NewbornSerializer, 'created_at'),
    'fetal-assessments': (FetalAssessment, FetalAssessmentSerializer, 'created_at'),
    'postnatal-records': (PostnatalRecord, PostnatalRecordSerializer, 'created_at'),
    'maternity-notes': (MaternityNote, MaternityNoteSerializer, 'created_at'),
}


def _get_model_for_data_source(data_source):
    mapping = {
        'patients': Patient,
        'appointments': Appointment,
        'encounters': Encounter,
        'vitals': VitalSign,
        'diagnoses': Encounter,
        'lab_requests': LabRequest,
        'lab_results': LabResult,
        'prescriptions': Prescription,
        'pharmacy': StockItem,
        'billing': Bill,
        'nhis': NHISRecord,
        'insurance': PrivateInsuranceRecord,
        'admissions': Encounter,
        'discharges': Encounter,
         'referrals': Referral,
        'handovers': Handover,
        'audit_logs': AuditLog,
        'inventory': StockItem,
        'users': User,
        'hospitals': Hospital,
        'beds': Hospital,
        'timeline': TimelineEvent,
        'monthly_statistics': MonthlyStatistic,
        'disease_outbreaks': DiseaseOutbreak,
    }
    return mapping.get(data_source)


def _get_serializer_for_model(model_class):
    mapping = {
        Patient: PatientSerializer,
        Appointment: AppointmentSerializer,
        Encounter: EncounterSerializer,
        VitalSign: VitalSignSerializer,
        LabRequest: LabRequestSerializer,
        LabResult: LabResultSerializer,
        Prescription: PrescriptionSerializer,
        StockItem: StockItemSerializer,
        Bill: BillSerializer,
        NHISRecord: NHISRecordSerializer,
        PrivateInsuranceRecord: PrivateInsuranceRecordSerializer,
        Handover: HandoverSerializer,
        AuditLog: AuditLogSerializer,
        User: UserSerializer,
        Hospital: HospitalSerializer,
        TimelineEvent: TimelineEventSerializer,
        MonthlyStatistic: MonthlyStatisticSerializer,
        DiseaseOutbreak: DiseaseOutbreakSerializer,
        Referral: ReferralSerializer,
        Admission: AdmissionSerializer,
        Ward: WardSerializer,
        Room: RoomSerializer,
        Bed: BedSerializer,
        InpatientNote: InpatientNoteSerializer,
    }
    return mapping.get(model_class)


def _pull_queryset(entity_type, user):
    if entity_type == 'handovers':
        if user.role == 'administrator':
            return Handover.objects.all()
        return Handover.objects.filter(Q(sender=user) | Q(receiver=user))
    if entity_type == 'notifications':
        return Notification.objects.filter(recipient=user)
    if entity_type == 'lab-requests':
        if user.role in ('administrator', 'lab_technician', 'nurse'):
            return LabRequest.objects.all()
        if user.role == 'doctor':
            return LabRequest.objects.filter(requested_by=user)
        return LabRequest.objects.filter(requested_by=user)
    if entity_type == 'timeline':
        if user.role == 'administrator':
            return TimelineEvent.objects.all()
        return TimelineEvent.objects.filter(patient__hospital=user.hospital)
    if entity_type in ('antenatal-records',):
        if user.role == 'administrator':
            return AntenatalRecord.objects.all()
        return AntenatalRecord.objects.filter(patient__hospital=user.hospital) if user.hospital else AntenatalRecord.objects.none()
    if entity_type in ('labour-records',):
        if user.role == 'administrator':
            return LabourRecord.objects.all()
        return LabourRecord.objects.filter(patient__hospital=user.hospital) if user.hospital else LabourRecord.objects.none()
    if entity_type in ('deliveries',):
        if user.role == 'administrator':
            return Delivery.objects.all()
        return Delivery.objects.filter(patient__hospital=user.hospital) if user.hospital else Delivery.objects.none()
    if entity_type in ('newborns',):
        if user.role == 'administrator':
            return Newborn.objects.all()
        return Newborn.objects.filter(mother__hospital=user.hospital) if user.hospital else Newborn.objects.none()
    if entity_type in ('fetal-assessments',):
        if user.role == 'administrator':
            return FetalAssessment.objects.all()
        return FetalAssessment.objects.filter(patient__hospital=user.hospital) if user.hospital else FetalAssessment.objects.none()
    if entity_type in ('postnatal-records',):
        if user.role == 'administrator':
            return PostnatalRecord.objects.all()
        return PostnatalRecord.objects.filter(patient__hospital=user.hospital) if user.hospital else PostnatalRecord.objects.none()
    if entity_type in ('maternity-notes',):
        if user.role == 'administrator':
            return MaternityNote.objects.all()
        return MaternityNote.objects.filter(patient__hospital=user.hospital) if user.hospital else MaternityNote.objects.none()
    model, _, _ = PULL_REGISTRY[entity_type]
    return model.objects.all()


# ---------------------------------------------------------------------------
# GHS / MoH Reporting endpoints
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_patient_stats(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')
    department = request.query_params.get('department')

    qs = Patient.objects.all()
    if hospital_id:
        qs = qs.filter(hospital_id=hospital_id)

    encounters = Encounter.objects.filter(patient__in=qs)
    if start:
        encounters = encounters.filter(created_at__gte=start)
    if end:
        encounters = encounters.filter(created_at__lte=end)
    if department:
        encounters = encounters.filter(doctor__hospital__name=department)

    total_patients = qs.count()
    new_patients = qs.filter(created_at__gte=(start or '1900-01-01')).count()
    returning = total_patients - new_patients

    outpatients = encounters.filter(encounter_type='consultation').count()
    inpatients = encounters.filter(encounter_type='admission').count()
    admissions = encounters.filter(encounter_type='admission', status='in_progress').count()
    discharges = encounters.filter(encounter_type='admission', status='completed').count()
    referrals = encounters.filter(notes__icontains='referral').count()
    deaths = encounters.filter(status='cancelled', notes__icontains='deceased').count()

    gender_dist = qs.values('gender').annotate(count=Count('id'))
    age_groups = {
        'under_1': qs.filter(date_of_birth__gte=timezone.now() - timedelta(days=365)).count(),
        '1_5': qs.filter(date_of_birth__lt=timezone.now() - timedelta(days=365), date_of_birth__gte=timezone.now() - timedelta(days=5*365)).count(),
        '6_17': qs.filter(date_of_birth__lt=timezone.now() - timedelta(days=5*365), date_of_birth__gte=timezone.now() - timedelta(days=17*365)).count(),
        '18_35': qs.filter(date_of_birth__lt=timezone.now() - timedelta(days=17*365), date_of_birth__gte=timezone.now() - timedelta(days=35*365)).count(),
        '36_59': qs.filter(date_of_birth__lt=timezone.now() - timedelta(days=35*365), date_of_birth__gte=timezone.now() - timedelta(days=59*365)).count(),
        '60_plus': qs.filter(date_of_birth__lt=timezone.now() - timedelta(days=59*365)).count(),
    }

    return Response({
        'total_patients': total_patients,
        'new_patients': new_patients,
        'returning_patients': returning,
        'outpatients': outpatients,
        'inpatients': inpatients,
        'admissions': admissions,
        'discharges': discharges,
        'referrals': referrals,
        'deaths': deaths,
        'gender_distribution': list(gender_dist),
        'age_groups': age_groups,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_disease_stats(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = Encounter.objects.all()
    if hospital_id:
        qs = qs.filter(patient__hospital_id=hospital_id)
    if start:
        qs = qs.filter(created_at__gte=start)
    if end:
        qs = qs.filter(created_at__lte=end)

    diseases = {
        'malaria': qs.filter(symptoms__icontains='malaria').count(),
        'typhoid': qs.filter(symptoms__icontains='typhoid').count(),
        'hypertension': qs.filter(symptoms__icontains='hypertension').count(),
        'diabetes': qs.filter(symptoms__icontains='diabetes').count(),
        'pneumonia': qs.filter(symptoms__icontains='pneumonia').count(),
        'tuberculosis': qs.filter(symptoms__icontains='tuberculosis').count(),
        'hiv_aids': qs.filter(symptoms__icontains='hiv').count(),
        'asthma': qs.filter(symptoms__icontains='asthma').count(),
        'pregnancy': qs.filter(symptoms__icontains='pregnancy').count(),
        'childhood_illnesses': qs.filter(patient__date_of_birth__gte=timezone.now() - timedelta(days=18*365), symptoms__icontains='fever').count(),
        'other': qs.exclude(symptoms__icontains='malaria').exclude(symptoms__icontains='typhoid').exclude(symptoms__icontains='hypertension').exclude(symptoms__icontains='diabetes').exclude(symptoms__icontains='pneumonia').exclude(symptoms__icontains='tuberculosis').exclude(symptoms__icontains='hiv').exclude(symptoms__icontains='asthma').exclude(symptoms__icontains='pregnancy').count(),
    }

    return Response({'diseases': diseases, 'total_cases': sum(diseases.values())})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_maternal_child_health(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = Encounter.objects.all()
    if hospital_id:
        qs = qs.filter(patient__hospital_id=hospital_id)
    if start:
        qs = qs.filter(created_at__gte=start)
    if end:
        qs = qs.filter(created_at__lte=end)

    antenatal = qs.filter(encounter_type='antenatal').count()
    deliveries = qs.filter(encounter_type='delivery').count()
    c_sections = qs.filter(encounter_type='delivery', notes__icontains='caesarean').count()
    postnatal = qs.filter(encounter_type='postnatal').count()
    family_planning = qs.filter(encounter_type='family_planning').count()
    immunizations = qs.filter(encounter_type='immunization').count()
    child_welfare = qs.filter(encounter_type='child_welfare').count()
    maternal_deaths = qs.filter(encounter_type='delivery', notes__icontains='maternal_death').count()
    neonatal_deaths = qs.filter(encounter_type='delivery', notes__icontains='neonatal_death').count()

    return Response({
        'antenatal_visits': antenatal,
        'deliveries': deliveries,
        'caesarean_sections': c_sections,
        'postnatal_care': postnatal,
        'family_planning': family_planning,
        'immunizations': immunizations,
        'child_welfare_attendance': child_welfare,
        'maternal_deaths': maternal_deaths,
        'neonatal_deaths': neonatal_deaths,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_lab_stats(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = LabRequest.objects.all()
    if hospital_id:
        qs = qs.filter(patient__hospital_id=hospital_id)
    if start:
        qs = qs.filter(created_at__gte=start)
    if end:
        qs = qs.filter(created_at__lte=end)

    total_requests = qs.count()
    completed = qs.filter(status='completed').count()
    pending = qs.filter(status='pending').count()
    processing = qs.filter(status='processing').count()

    avg_turnaround = qs.filter(status='completed', completed_at__isnull=False).annotate(
        turnaround=ExpressionWrapper(F('completed_at') - F('created_at'), output_field=fields.DurationField())
    ).aggregate(avg=Avg('turnaround'))['avg']

    return Response({
        'total_requests': total_requests,
        'completed': completed,
        'pending': pending,
        'processing': processing,
        'avg_turnaround_hours': round(avg_turnaround.total_seconds() / 3600, 2) if avg_turnaround else 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_pharmacy_stats(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = StockMovement.objects.filter(movement_type='out')
    if hospital_id:
        qs = qs.filter(stock_item__hospital_id=hospital_id)
    if start:
        qs = qs.filter(created_at__gte=start)
    if end:
        qs = qs.filter(created_at__lte=end)

    medicines_dispensed = qs.count()
    low_stock = StockItem.objects.filter(current_quantity__lt=F('minimum_stock_level')).count()
    expired = StockItem.objects.filter(expiry_date__lt=timezone.now().date()).count()

    return Response({
        'medicines_dispensed': medicines_dispensed,
        'low_stock_items': low_stock,
        'expired_medicines': expired,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_financial_stats(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = Payment.objects.all()
    if hospital_id:
        qs = qs.filter(bill__hospital_id=hospital_id)
    if start:
        qs = qs.filter(paid_at__gte=start)
    if end:
        qs = qs.filter(paid_at__lte=end)

    cash = qs.filter(payment_method='cash').aggregate(total=Sum('amount'))['total'] or 0
    nhis = qs.filter(payment_method='insurance', bill__patient__insurance_type='nhis').aggregate(total=Sum('amount'))['total'] or 0
    private = qs.filter(payment_method='insurance', bill__patient__insurance_type='private').aggregate(total=Sum('amount'))['total'] or 0
    mobile = qs.filter(payment_method='mobile_money').aggregate(total=Sum('amount'))['total'] or 0
    card = qs.filter(payment_method='bank_card').aggregate(total=Sum('amount'))['total'] or 0

    outstanding = Bill.objects.filter(status__in=['pending', 'partial']).aggregate(total=Sum('total_amount'))['total'] or 0

    return Response({
        'cash': cash,
        'nhis': nhis,
        'private_insurance': private,
        'mobile_money': mobile,
        'bank_card': card,
        'outstanding_balances': outstanding,
        'total_revenue': cash + nhis + private + mobile + card,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_performance_indicators(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = PerformanceIndicator.objects.all()
    if hospital_id:
        qs = qs.filter(hospital_id=hospital_id)
    if start:
        qs = qs.filter(period_start__gte=start)
    if end:
        qs = qs.filter(period_end__lte=end)

    serializer = PerformanceIndicatorSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_data_quality(request):
    hospital_id = request.query_params.get('hospital')
    qs = DataQualityAlert.objects.all()
    if hospital_id:
        qs = qs.filter(hospital_id=hospital_id)
    serializer = DataQualityAlertSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_public_health_alerts(request):
    hospital_id = request.query_params.get('hospital')
    qs = PublicHealthAlert.objects.all()
    if hospital_id:
        qs = qs.filter(hospital_id=hospital_id)
    serializer = PublicHealthAlertSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_referral_stats(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = Referral.objects.all()
    if hospital_id:
        qs = qs.filter(
            Q(referring_facility_id=hospital_id) | Q(receiving_facility_id=hospital_id)
        )
    if start:
        qs = qs.filter(referral_date__gte=start)
    if end:
        qs = qs.filter(referral_date__lte=end)

    total = qs.count()
    pending = qs.filter(status__in=['submitted', 'received', 'under_review', 'accepted', 'in_transit']).count()
    accepted = qs.filter(status='accepted').count()
    rejected = qs.filter(status='rejected').count()
    completed = qs.filter(status='completed').count()
    emergency = qs.filter(is_emergency=True).count()

    by_department = qs.values_list('receiving_department', flat=True).annotate(count=Count('id')).order_by('-count')[:10]
    by_diagnosis = qs.exclude(primary_diagnosis='').values_list('primary_diagnosis', flat=True).annotate(count=Count('id')).order_by('-count')[:10]
    by_facility = qs.exclude(receiving_facility__isnull=True).values_list('receiving_facility__name', flat=True).annotate(count=Count('id')).order_by('-count')[:10]

    return Response({
        'total_referrals': total,
        'pending_referrals': pending,
        'accepted_referrals': accepted,
        'rejected_referrals': rejected,
        'completed_referrals': completed,
        'emergency_referrals': emergency,
        'referrals_by_department': list(by_department),
        'referrals_by_diagnosis': list(by_diagnosis),
        'referrals_by_destination_facility': list(by_facility),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_inpatient_stats(request):
    hospital_id = request.query_params.get('hospital')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    qs = Admission.objects.all()
    if hospital_id:
        qs = qs.filter(patient__hospital_id=hospital_id)
    if start:
        qs = qs.filter(admission_date__gte=start)
    if end:
        qs = qs.filter(admission_date__lte=end)

    total = qs.count()
    currently_admitted = qs.filter(status='admitted').count()
    discharged = qs.filter(status='discharged').count()
    transfers = qs.filter(status='transferred').count()
    emergency = qs.filter(admission_type='emergency').count()
    elective = qs.filter(admission_type='elective').count()

    avg_los = None
    discharged_qs = qs.filter(status='discharged', discharge_date__isnull=False)
    if discharged_qs.exists():
        avg_delta = discharged_qs.annotate(
            stay=ExpressionWrapper(F('discharge_date') - F('admission_date'), output_field=fields.DurationField())
        ).aggregate(avg=Avg('stay'))['avg']
        if avg_delta:
            avg_los = round(avg_delta.total_seconds() / 86400, 1)

    bed_usage = []
    for ward in Ward.objects.all():
        total_beds = Bed.objects.filter(room__ward=ward, is_active=True).count()
        occupied = Bed.objects.filter(room__ward=ward, status='occupied').count()
        availability = round((occupied / total_beds * 100) if total_beds > 0 else 0, 1)
        bed_usage.append({'ward': ward.name, 'total_beds': total_beds, 'occupied': occupied, 'availability_percent': availability})

    return Response({
        'total_admissions': total,
        'currently_admitted': currently_admitted,
        'discharged': discharged,
        'transferred': transfers,
        'emergency_admissions': emergency,
        'elective_admissions': elective,
        'average_length_of_stay_days': avg_los or 0,
        'bed_usage_by_ward': bed_usage,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inpatient_dashboard(request):
    hospital_id = request.query_params.get('hospital')
    user = request.user
    if user.role == 'administrator':
        if hospital_id:
            qs = Admission.objects.filter(patient__hospital_id=hospital_id, status='admitted')
        else:
            qs = Admission.objects.filter(status='admitted')
    else:
        qs = Admission.objects.filter(patient__hospital=user.hospital, status='admitted') if user.hospital else Admission.objects.none()
    serializer = AdmissionSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_report(request):
    template_id = request.data.get('template_id')
    hospital_id = request.data.get('hospital')
    period_start = request.data.get('period_start')
    period_end = request.data.get('period_end')
    report_type = request.data.get('report_type', 'monthly')

    try:
        template = ReportTemplate.objects.get(id=template_id)
    except ReportTemplate.DoesNotExist:
        return Response({'detail': 'Report template not found.'}, status=404)

    try:
        hospital = Hospital.objects.get(id=hospital_id)
    except Hospital.DoesNotExist:
        return Response({'detail': 'Hospital not found.'}, status=404)

    report = ReportInstance.objects.create(
        hospital=hospital,
        template=template,
        title=f"{template.name} - {period_start} to {period_end}",
        report_type=report_type,
        period_start=period_start,
        period_end=period_end,
        status='draft',
        created_by=request.user,
    )

    sections = []
    if 'patient_statistics' in template.configuration.get('sections', []):
        sections.append(ReportSection.objects.create(
            report=report,
            section_type='patient_statistics',
            title='Patient Statistics',
            order=1,
        ))
    if 'disease_statistics' in template.configuration.get('sections', []):
        sections.append(ReportSection.objects.create(
            report=report,
            section_type='disease_statistics',
            title='Disease Statistics',
            order=2,
        ))
    if 'maternal_child_health' in template.configuration.get('sections', []):
        sections.append(ReportSection.objects.create(
            report=report,
            section_type='maternal_child_health',
            title='Maternal and Child Health',
            order=3,
        ))
    if 'laboratory_statistics' in template.configuration.get('sections', []):
        sections.append(ReportSection.objects.create(
            report=report,
            section_type='laboratory_statistics',
            title='Laboratory Statistics',
            order=4,
        ))
    if 'pharmacy_statistics' in template.configuration.get('sections', []):
        sections.append(ReportSection.objects.create(
            report=report,
            section_type='pharmacy_statistics',
            title='Pharmacy Statistics',
            order=5,
        ))
    if 'financial_statistics' in template.configuration.get('sections', []):
        sections.append(ReportSection.objects.create(
            report=report,
            section_type='financial_statistics',
            title='Financial Statistics',
            order=6,
        ))

    _create_audit(request.user, 'report_generated', f"Generated report: {report.title}")
    return Response(ReportInstanceSerializer(report).data, status=status.HTTP_201_CREATED)


def _pull_queryset(entity_type, user):
    if entity_type == 'handovers':
        if user.role == 'administrator':
            return Handover.objects.all()
        return Handover.objects.filter(Q(sender=user) | Q(receiver=user))
    if entity_type == 'notifications':
        return Notification.objects.filter(recipient=user)
    if entity_type == 'lab-requests':
        if user.role in ('administrator', 'lab_technician', 'nurse'):
            return LabRequest.objects.all()
        if user.role == 'doctor':
            return LabRequest.objects.filter(requested_by=user)
        return LabRequest.objects.filter(requested_by=user)
    if entity_type == 'timeline':
        if user.role == 'administrator':
            return TimelineEvent.objects.all()
        return TimelineEvent.objects.filter(patient__hospital=user.hospital)
    if entity_type in ('referrals',):
        if user.role == 'administrator':
            return Referral.objects.all()
        return Referral.objects.filter(
            Q(referring_doctor=user) | Q(receiving_facility=user.hospital) |
            Q(accepted_by=user) | Q(patient__hospital=user.hospital)
        )
    if entity_type in ('wards',):
        if user.role == 'administrator':
            return Ward.objects.all()
        return Ward.objects.filter(hospital=user.hospital) if user.hospital else Ward.objects.none()
    if entity_type in ('rooms',):
        if user.role == 'administrator':
            return Room.objects.all()
        return Room.objects.filter(ward__hospital=user.hospital) if user.hospital else Room.objects.none()
    if entity_type in ('beds',):
        if user.role == 'administrator':
            return Bed.objects.all()
        return Bed.objects.filter(room__ward__hospital=user.hospital) if user.hospital else Bed.objects.none()
    if entity_type in ('admissions',):
        if user.role == 'administrator':
            return Admission.objects.all()
        return Admission.objects.filter(patient__hospital=user.hospital) if user.hospital else Admission.objects.none()
    if entity_type in ('inpatient-notes',):
        if user.role == 'administrator':
            return InpatientNote.objects.all()
        return InpatientNote.objects.filter(patient__hospital=user.hospital) if user.hospital else InpatientNote.objects.none()
    if entity_type in ('bed-transfers',):
        if user.role == 'administrator':
            return BedTransfer.objects.all()
        return BedTransfer.objects.filter(patient__hospital=user.hospital) if user.hospital else BedTransfer.objects.none()
    if entity_type in ('med-admins',):
        if user.role == 'administrator':
            return MedicationAdministration.objects.all()
        return MedicationAdministration.objects.filter(patient__hospital=user.hospital) if user.hospital else MedicationAdministration.objects.none()
    if entity_type in ('inpatient-lab-requests',):
        if user.role in ('administrator', 'lab_technician'):
            return InpatientLabRequest.objects.all()
        if user.hospital:
            return InpatientLabRequest.objects.filter(patient__hospital=user.hospital)
        return InpatientLabRequest.objects.none()
    if entity_type in ('inpatient-prescriptions',):
        if user.role == 'administrator':
            return InpatientPrescription.objects.all()
        return InpatientPrescription.objects.filter(patient__hospital=user.hospital) if user.hospital else InpatientPrescription.objects.none()
    if entity_type in ('antenatal-records',):
        if user.role == 'administrator':
            return AntenatalRecord.objects.all()
        return AntenatalRecord.objects.filter(patient__hospital=user.hospital) if user.hospital else AntenatalRecord.objects.none()
    if entity_type in ('labour-records',):
        if user.role == 'administrator':
            return LabourRecord.objects.all()
        return LabourRecord.objects.filter(patient__hospital=user.hospital) if user.hospital else LabourRecord.objects.none()
    if entity_type in ('deliveries',):
        if user.role == 'administrator':
            return Delivery.objects.all()
        return Delivery.objects.filter(patient__hospital=user.hospital) if user.hospital else Delivery.objects.none()
    if entity_type in ('newborns',):
        if user.role == 'administrator':
            return Newborn.objects.all()
        return Newborn.objects.filter(mother__hospital=user.hospital) if user.hospital else Newborn.objects.none()
    if entity_type in ('fetal-assessments',):
        if user.role == 'administrator':
            return FetalAssessment.objects.all()
        return FetalAssessment.objects.filter(patient__hospital=user.hospital) if user.hospital else FetalAssessment.objects.none()
    if entity_type in ('postnatal-records',):
        if user.role == 'administrator':
            return PostnatalRecord.objects.all()
        return PostnatalRecord.objects.filter(patient__hospital=user.hospital) if user.hospital else PostnatalRecord.objects.none()
    if entity_type in ('maternity-notes',):
        if user.role == 'administrator':
            return MaternityNote.objects.all()
        return MaternityNote.objects.filter(patient__hospital=user.hospital) if user.hospital else MaternityNote.objects.none()
    if entity_type in ('diagnoses',):
        if user.role == 'administrator':
            return Diagnosis.objects.all()
        return Diagnosis.objects.filter(patient__hospital=user.hospital) if user.hospital else Diagnosis.objects.none()
    if entity_type in ('medications',):
        if user.role == 'administrator':
            return Medication.objects.all()
        return Medication.objects.filter(available=True) if user.hospital else Medication.objects.none()
    if entity_type in ('diagnosis-terms',):
        return DiagnosisTerm.objects.filter(active=True)
    model, _, _ = PULL_REGISTRY[entity_type]
    return model.objects.all()


class DiagnosisViewSet(viewsets.ModelViewSet):
    queryset = Diagnosis.objects.all()
    serializer_class = DiagnosisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Diagnosis.objects.all()
        if user.hospital:
            return Diagnosis.objects.filter(patient__hospital=user.hospital)
        return Diagnosis.objects.none()

    def perform_create(self, serializer):
        diagnosis = serializer.save(created_by=self.request.user)
        _create_timeline_event(
            diagnosis.patient, 'diagnosis', 'diagnoses', diagnosis.id,
            f"Diagnosis: {diagnosis.diagnosis_name}",
            f"Type: {diagnosis.get_diagnosis_type_display()}", self.request.user,
        )
        _create_audit(self.request.user, 'diagnosis_created', f"Diagnosis created for {diagnosis.patient.full_name}: {diagnosis.diagnosis_name}")


class MedicationViewSet(viewsets.ModelViewSet):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Medication.objects.all()
        return Medication.objects.filter(available=True)


class DiagnosisTermViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DiagnosisTerm.objects.filter(active=True)
    serializer_class = DiagnosisTermSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = DiagnosisTerm.objects.filter(active=True)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(icd10_code__icontains=search))
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sync_pull(request):
    """Return all records changed since `since` (ISO timestamp) for the caller."""
    since_raw = request.query_params.get('since')
    since = None
    if since_raw:
        try:
            since = timezone.datetime.fromisoformat(since_raw.replace('Z', '+00:00'))
        except ValueError:
            since = None

    items = []
    for entity_type, (model, serializer, ts_field) in PULL_REGISTRY.items():
        try:
            qs = _pull_queryset(entity_type, request.user)
        except KeyError:
            continue
        if since is not None:
            qs = qs.filter(**{f'{ts_field}__gt': since})
        for obj in qs:
            try:
                ts = getattr(obj, ts_field)
                ts_iso = ts.isoformat() if ts else None
            except AttributeError:
                ts_iso = None
            items.append({
                'entity_type': entity_type,
                'entity_id': obj.id,
                'payload': serializer(obj).data,
                'updated_at': ts_iso or '',
                'version': 1,
            })

    return Response({
        'items': items,
        'server_time': timezone.now().isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    return Response({'id': user.id, 'username': user.username, 'role': user.role})

