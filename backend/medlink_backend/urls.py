from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    home,
    login_view,
    me_view,
    sync_pull,
    report_patient_stats,
    report_disease_stats,
    report_maternal_child_health,
    report_lab_stats,
    report_pharmacy_stats,
    report_financial_stats,
    report_performance_indicators,
    report_data_quality,
    report_public_health_alerts,
    report_referral_stats,
    report_inpatient_stats,
    inpatient_dashboard,
    generate_report,
    duplicate_template,
    preview_template,
    evaluate_formula,
    export_report,
    pin_report_to_dashboard,
    unpin_report_from_dashboard,
    HospitalViewSet, UserViewSet, PatientViewSet, EncounterViewSet,
    VitalSignViewSet, AppointmentViewSet, LabOrderViewSet, PrescriptionViewSet,
    MessageViewSet, SyncRecordViewSet, AuditLogViewSet,
    HandoverViewSet, NotificationViewSet, LabRequestViewSet, LabResultViewSet,
    TimelineEventViewSet,
    InsuranceCompanyViewSet, NHISRecordViewSet, PrivateInsuranceRecordViewSet,
    InsuranceCoverageRuleViewSet, BillViewSet, BillItemViewSet, PaymentViewSet,
    StockItemViewSet, StockMovementViewSet, MonthlyStatisticViewSet, DiseaseOutbreakViewSet,
    ReportTemplateViewSet, ReportInstanceViewSet, ReportSectionViewSet,
    DataQualityAlertViewSet, PublicHealthAlertViewSet, PerformanceIndicatorViewSet,
    ReportExportViewSet, ReportTemplateVersionViewSet, ReportElementViewSet,
    FormulaDefinitionViewSet, ReportScheduleViewSet, ReportDashboardPinViewSet,
    ReportExportFormatViewSet,
    ReferralViewSet, WardViewSet, RoomViewSet, BedViewSet,
    AdmissionViewSet, InpatientNoteViewSet, BedTransferViewSet,
    MedicationAdministrationViewSet, InpatientLabRequestViewSet,
    InpatientPrescriptionViewSet, ClinicalProgressNoteViewSet,
    AntenatalRecordViewSet, LabourRecordViewSet, DeliveryViewSet,
    NewbornViewSet, FetalAssessmentViewSet, PostnatalRecordViewSet, MaternityNoteViewSet,
    DiagnosisViewSet, MedicationViewSet, DiagnosisTermViewSet,
)

router = DefaultRouter()
router.register(r'hospitals', HospitalViewSet)
router.register(r'users', UserViewSet)
router.register(r'patients', PatientViewSet)
router.register(r'encounters', EncounterViewSet)
router.register(r'vitals', VitalSignViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'lab-orders', LabOrderViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'messages', MessageViewSet)
router.register(r'sync-records', SyncRecordViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'handovers', HandoverViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'lab-requests', LabRequestViewSet)
router.register(r'lab-results', LabResultViewSet)
router.register(r'timeline', TimelineEventViewSet)
router.register(r'insurance-companies', InsuranceCompanyViewSet)
router.register(r'nhis-records', NHISRecordViewSet)
router.register(r'private-insurance-records', PrivateInsuranceRecordViewSet)
router.register(r'insurance-coverage-rules', InsuranceCoverageRuleViewSet)
router.register(r'bills', BillViewSet)
router.register(r'bill-items', BillItemViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'stock-items', StockItemViewSet)
router.register(r'stock-movements', StockMovementViewSet)
router.register(r'monthly-statistics', MonthlyStatisticViewSet)
router.register(r'disease-outbreaks', DiseaseOutbreakViewSet)
router.register(r'report-templates', ReportTemplateViewSet)
router.register(r'report-instances', ReportInstanceViewSet)
router.register(r'report-sections', ReportSectionViewSet)
router.register(r'data-quality-alerts', DataQualityAlertViewSet)
router.register(r'public-health-alerts', PublicHealthAlertViewSet)
router.register(r'performance-indicators', PerformanceIndicatorViewSet)
router.register(r'report-exports', ReportExportViewSet)
router.register(r'report-template-versions', ReportTemplateVersionViewSet)
router.register(r'report-elements', ReportElementViewSet)
router.register(r'formula-definitions', FormulaDefinitionViewSet)
router.register(r'report-schedules', ReportScheduleViewSet)
router.register(r'report-dashboard-pins', ReportDashboardPinViewSet)
router.register(r'report-export-formats', ReportExportFormatViewSet)
router.register(r'referrals', ReferralViewSet)
router.register(r'wards', WardViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'beds', BedViewSet)
router.register(r'admissions', AdmissionViewSet)
router.register(r'inpatient-notes', InpatientNoteViewSet)
router.register(r'bed-transfers', BedTransferViewSet)
router.register(r'med-admins', MedicationAdministrationViewSet)
router.register(r'inpatient-lab-requests', InpatientLabRequestViewSet)
router.register(r'inpatient-prescriptions', InpatientPrescriptionViewSet)
router.register(r'clinical-progress-notes', ClinicalProgressNoteViewSet)
router.register(r'diagnoses', DiagnosisViewSet)
router.register(r'medications', MedicationViewSet)
router.register(r'diagnosis-terms', DiagnosisTermViewSet, basename='diagnosis-term')
router.register(r'antenatal-records', AntenatalRecordViewSet)
router.register(r'labour-records', LabourRecordViewSet)
router.register(r'deliveries', DeliveryViewSet)
router.register(r'newborns', NewbornViewSet)
router.register(r'fetal-assessments', FetalAssessmentViewSet)
router.register(r'postnatal-records', PostnatalRecordViewSet)
router.register(r'maternity-notes', MaternityNoteViewSet)

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('api/auth/login/', login_view, name='api-login'),
    path('api/auth/me/', me_view, name='api-me'),
    path('api/sync/pull/', sync_pull, name='api-sync-pull'),
    path('api/reports/patient-stats/', report_patient_stats, name='report-patient-stats'),
    path('api/reports/disease-stats/', report_disease_stats, name='report-disease-stats'),
    path('api/reports/maternal-child/', report_maternal_child_health, name='report-maternal-child'),
    path('api/reports/lab-stats/', report_lab_stats, name='report-lab-stats'),
    path('api/reports/pharmacy-stats/', report_pharmacy_stats, name='report-pharmacy-stats'),
    path('api/reports/financial-stats/', report_financial_stats, name='report-financial-stats'),
    path('api/reports/performance/', report_performance_indicators, name='report-performance'),
    path('api/reports/data-quality/', report_data_quality, name='report-data-quality'),
    path('api/reports/public-health-alerts/', report_public_health_alerts, name='report-public-health-alerts'),
    path('api/reports/referral-stats/', report_referral_stats, name='report-referral-stats'),
    path('api/reports/inpatient-stats/', report_inpatient_stats, name='report-inpatient-stats'),
    path('api/reports/inpatient-dashboard/', inpatient_dashboard, name='inpatient-dashboard'),
    path('api/reports/generate/', generate_report, name='generate-report'),
    path('api/reports/templates/<int:pk>/duplicate/', duplicate_template, name='duplicate-template'),
    path('api/reports/templates/<int:pk>/preview/', preview_template, name='preview-template'),
    path('api/reports/formulas/evaluate/', evaluate_formula, name='evaluate-formula'),
    path('api/reports/export/<int:pk>/', export_report, name='export-report'),
    path('api/reports/pin/', pin_report_to_dashboard, name='pin-report'),
    path('api/reports/unpin/<int:report_id>/', unpin_report_from_dashboard, name='unpin-report'),
    path('api/', include(router.urls)),
]
