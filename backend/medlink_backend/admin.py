from django.contrib import admin
from .models import (
    Hospital, User, Patient, Encounter, VitalSign, Appointment,
    LabOrder, Prescription, Message, SyncRecord, AuditLog,
    Handover, HandoverPatient, Notification, LabRequest, LabResult,
    TimelineEvent,
    InsuranceCompany, NHISRecord, PrivateInsuranceRecord, InsuranceCoverageRule,
    Bill, BillItem, Payment, StockItem, StockMovement, MonthlyStatistic, DiseaseOutbreak,
    ReportTemplate, ReportInstance, ReportSection, DataQualityAlert, PublicHealthAlert,
    PerformanceIndicator, ReportExport, ReportTemplateVersion, ReportElement,
    FormulaDefinition, ReportSchedule, ReportDashboardPin, ReportExportFormat,
)

admin.site.register(Hospital)
admin.site.register(User)
admin.site.register(Patient)
admin.site.register(Encounter)
admin.site.register(VitalSign)
admin.site.register(Appointment)
admin.site.register(LabOrder)
admin.site.register(Prescription)
admin.site.register(Message)
admin.site.register(SyncRecord)
admin.site.register(AuditLog)
admin.site.register(Handover)
admin.site.register(HandoverPatient)
admin.site.register(Notification)
admin.site.register(LabRequest)
admin.site.register(LabResult)
admin.site.register(TimelineEvent)
admin.site.register(InsuranceCompany)
admin.site.register(NHISRecord)
admin.site.register(PrivateInsuranceRecord)
admin.site.register(InsuranceCoverageRule)
admin.site.register(Bill)
admin.site.register(BillItem)
admin.site.register(Payment)
admin.site.register(StockItem)
admin.site.register(StockMovement)
admin.site.register(MonthlyStatistic)
admin.site.register(DiseaseOutbreak)
admin.site.register(ReportTemplate)
admin.site.register(ReportInstance)
admin.site.register(ReportSection)
admin.site.register(DataQualityAlert)
admin.site.register(PublicHealthAlert)
admin.site.register(PerformanceIndicator)
admin.site.register(ReportExport)
admin.site.register(ReportTemplateVersion)
admin.site.register(ReportElement)
admin.site.register(FormulaDefinition)
admin.site.register(ReportSchedule)
admin.site.register(ReportDashboardPin)
admin.site.register(ReportExportFormat)
