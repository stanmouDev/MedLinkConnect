import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { query, onSyncChange, create } from '../offline/data';
import { useAuth } from '../auth';
import PatientHeader from './PatientHeader';
import { Card, EmptyBox } from '../components/ui';
import { Play, FileText, FlaskConical, ArrowRightLeft, Bed, X } from 'lucide-react';

type Patient = {
  id: number;
  patient_id: string;
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  insurance_type?: string;
  next_of_kin?: string;
  occupation?: string;
  national_id?: string;
  created_at: string;
  updated_at?: string;
};

type Encounter = {
  id: number;
  patient: number;
  doctor?: number;
  nurse?: number;
  doctor_name?: string;
  nurse_name?: string;
  encounter_type: string;
  status: string;
  symptoms?: string;
  notes?: string;
  diagnosis?: string;
  triage_level?: string;
  created_at: string;
  updated_at?: string;
};

type VitalSign = {
  id: number;
  patient: number;
  encounter?: number;
  temperature_c?: number;
  pulse_bpm?: number;
  blood_pressure?: string;
  oxygen_saturation?: number;
  respiratory_rate?: number;
  weight_kg?: number;
  height_cm?: number;
  blood_glucose?: number;
  pain_score?: number;
  level_of_consciousness?: string;
  additional_notes?: string;
  recorded_by?: number;
  recorded_by_name?: string;
  recorded_at: string;
  fundal_height_cm?: number;
  fetal_heart_rate_bpm?: number;
  presentation?: string;
};

type LabRequest = {
  id: number;
  patient: number;
  requested_by?: number;
  requester_name?: string;
  department?: string;
  test_name: string;
  clinical_notes?: string;
  priority: string;
  status: string;
  lab_number?: string;
  sample_collected_at?: string;
  sample_collected_by?: number;
  completed_at?: string;
  result?: string;
  result_files?: any[];
  created_at: string;
  updated_at?: string;
};

type LabResult = {
  id: number;
  lab_request: number;
  test_name: string;
  result_value: string;
  units?: string;
  reference_range?: string;
  interpretation?: string;
  status: string;
  technician_name?: string;
  reviewing_officer?: string;
  completed_at?: string;
  comments?: string;
  attachments?: any[];
};

type Prescription = {
  id: number;
  patient: number;
  doctor?: number;
  doctor_name?: string;
  medication: string;
  dosage: string;
  instructions?: string;
  frequency?: string;
  duration?: string;
  status: string;
  created_at: string;
};

type TimelineEvent = {
  id: number;
  patient: number;
  event_type: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description?: string;
  occurred_at: string;
  created_by?: number;
  created_by_username?: string;
};

type Handover = {
  id: number;
  sender?: number;
  sender_name?: string;
  receiver?: number;
  receiver_name?: string;
  status: string;
  additional_notes?: string;
  created_at: string;
  updated_at?: string;
  patients?: any[];
};

type Referral = {
  id: number;
  patient: number;
  encounter?: number;
  referring_doctor?: number;
  referring_doctor_name?: string;
  referring_facility?: number;
  referring_facility_name?: string;
  receiving_facility?: number;
  receiving_facility_name?: string;
  receiving_department?: string;
  referral_type: string;
  urgency_level: string;
  status: string;
  referral_date: string;
  reason: string;
  primary_diagnosis?: string;
  clinical_summary?: string;
  medical_history?: string;
  current_treatment?: string;
  current_medications?: string;
  allergies?: string;
  vital_signs?: string;
  lab_results?: string;
  imaging_results?: string;
  additional_notes?: string;
  is_emergency: boolean;
  accepted_by?: number;
  accepted_at?: string;
  rejection_reason?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
};

type Admission = {
  id: number;
  patient: number;
  encounter?: number;
  doctor?: number;
  admitting_doctor?: number;
  admission_date: string;
  admission_type: string;
  admission_reason?: string;
  primary_diagnosis: string;
  secondary_diagnoses?: any[];
  ward?: number;
  ward_name?: string;
  room?: number;
  room_number?: string;
  bed?: number;
  bed_number?: string;
  is_emergency: boolean;
  clinical_notes?: string;
  insurance_type: string;
  insurance_record?: number;
  status: string;
  discharge_date?: string;
  discharge_diagnosis?: string;
  condition_at_discharge?: string;
  treatment_provided?: string;
  procedures_performed?: string;
  discharge_medications?: string;
  follow_up_instructions?: string;
  follow_up_appointment?: string;
  discharge_notes?: string;
  discharge_status?: string;
  discharged_by?: number;
  discharged_at?: string;
  created_at: string;
  updated_at?: string;
};

type Diagnosis = {
  id: number;
  patient: number;
  encounter?: number;
  diagnosis_name: string;
  icd10_code?: string;
  diagnosis_type: string;
  status: string;
  clinical_note?: string;
  created_by?: number;
  created_by_username?: string;
  created_at: string;
  updated_at?: string;
};

type DiagnosisTerm = {
  id: number;
  name: string;
  icd10_code: string;
  description?: string;
};

type Medication = {
  id: number;
  generic_name: string;
  brand_name?: string;
  strength?: string;
  dosage_form?: string;
  route?: string;
  formulary_status: string;
  available: boolean;
  category?: string;
  indications?: string;
  contraindications?: string;
  side_effects?: string;
  interactions?: string;
  created_at: string;
  updated_at?: string;
};

type InpatientLabRequest = {
  id: number;
  patient: number;
  admission?: number;
  requested_by?: number;
  test_name: string;
  clinical_notes?: string;
  priority: string;
  status: string;
  lab_number?: string;
  sample_collected_at?: string;
  sample_collected_by?: number;
  completed_at?: string;
  result?: string;
  created_at: string;
  updated_at?: string;
};

type Bill = {
  id: number;
  patient: number;
  encounter?: number;
  hospital?: number;
  bill_type: string;
  total_amount: number | string;
  covered_by_insurance: number | string;
  patient_co_pay: number | string;
  status: string;
  insurance_claim_status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

type NHISRecord = {
  id: number;
  patient: number;
  nhis_number: string;
  membership_status: string;
  expiry_date?: string;
  scheme_type: string;
  verified: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at?: string;
};

type PrivateInsuranceRecord = {
  id: number;
  patient: number;
  insurance_company: number;
  company_name?: string;
  membership_number: string;
  policy_expiry?: string;
  employer?: string;
  coverage_details?: any;
  verified: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at?: string;
};

type ClinicalProgressNote = {
  id: number;
  patient: number;
  encounter: number | null;
  recorded_by: number;
  recorded_by_username: string;
  patient_full_name: string;
  clinical_status: string;
  response_to_treatment: string;
  chief_concern: string;
  clinical_progress: string;
  assessment: string;
  treatment_response: string;
  current_treatment: string;
  treatment_plan: string;
  medication_changes: string;
  investigation_interpretation: string;
  follow_up_instructions: string;
  next_review_date: string;
  additional_notes: string;
  is_amendment: boolean;
  amendment_reason: string;
  created_at: string;
  updated_at: string;
};

type AntenatalRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  gravida: number;
  para: number;
  edd?: string;
  lmp?: string;
  risk_classification: string;
  current_status: string;
  current_gestational_age?: number;
  previous_pregnancy_history?: string;
  created_at: string;
  updated_at: string;
};

type LabourRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  antenatal_record?: number;
  admission_time: string;
  labour_status: string;
  cervical_dilation?: string;
  contraction_frequency?: string;
  fetal_heart_rate?: number;
  maternal_observations?: string;
  clinical_notes?: string;
  assigned_midwife?: number;
  assigned_midwife_username?: string;
  created_at: string;
  updated_at: string;
};

type Delivery = {
  id: number;
  patient: number;
  patient_full_name?: string;
  antenatal_record?: number;
  labour_record?: number;
  delivery_time: string;
  delivery_type: string;
  delivery_outcome: string;
  maternal_outcome: string;
  complications?: string;
  delivered_by?: number;
  delivered_by_username?: string;
  created_at: string;
};

type Newborn = {
  id: number;
  mother: number;
  mother_name?: string;
  delivery: number;
  patient?: number;
  sex: string;
  birth_weight?: string;
  birth_length?: string;
  head_circumference?: string;
  apgar_score_1min?: number;
  apgar_score_5min?: number;
  resuscitation?: string;
  newborn_observations?: string;
  created_at: string;
};

type FetalAssessment = {
  id: number;
  patient: number;
  patient_full_name?: string;
  antenatal_record?: number;
  assessed_by?: number;
  assessed_by_username?: string;
  fetal_heart_rate?: number;
  fetal_movement: string;
  presentation?: string;
  fundal_height?: string;
  fetal_observations?: string;
  clinical_notes?: string;
  assessment_date: string;
  created_at: string;
};

type PostnatalRecord = {
  id: number;
  patient: number;
  patient_full_name?: string;
  antenatal_record?: number;
  delivery?: number;
  postnatal_status: string;
  visit_date: string;
  maternal_observations?: string;
  newborn_observations?: string;
  feeding_status?: string;
  follow_up_plan?: string;
  next_appointment?: string;
  created_at: string;
};


function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not recorded';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'antenatal', label: 'Antenatal' },
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'maternal-vitals', label: 'Maternal Vitals' },
  { key: 'fetal-assessment', label: 'Fetal Assessment' },
  { key: 'risk-assessment', label: 'Risk Assessment' },
  { key: 'labour', label: 'Labour' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'postnatal', label: 'Postnatal' },
  { key: 'newborn', label: 'Newborn' },
  { key: 'encounters', label: 'EMR' },
  { key: 'diagnoses', label: 'Diagnoses' },
  { key: 'vitals', label: 'Vitals' },
  { key: 'labs', label: 'Laboratory' },
  { key: 'medications', label: 'Medications' },
  { key: 'treatment', label: 'Treatment' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'handovers', label: 'Handovers' },
  { key: 'inpatient', label: 'Inpatient' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'billing', label: 'Billing' },
  { key: 'clinical-progress', label: 'Clinical Notes' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ROLE_TAB_ACCESS: Record<string, TabKey[]> = {
  administrator: ['overview', 'antenatal', 'pregnancy', 'maternal-vitals', 'fetal-assessment', 'risk-assessment', 'labour', 'delivery', 'postnatal', 'newborn', 'encounters', 'diagnoses', 'vitals', 'labs', 'medications', 'treatment', 'prescriptions', 'referrals', 'handovers', 'inpatient', 'timeline', 'insurance', 'billing', 'clinical-progress'],
  doctor: ['overview', 'antenatal', 'pregnancy', 'maternal-vitals', 'fetal-assessment', 'risk-assessment', 'labour', 'delivery', 'postnatal', 'newborn', 'encounters', 'diagnoses', 'vitals', 'labs', 'medications', 'treatment', 'prescriptions', 'referrals', 'handovers', 'inpatient', 'timeline', 'insurance', 'billing', 'clinical-progress'],
  midwife: ['overview', 'antenatal', 'pregnancy', 'maternal-vitals', 'fetal-assessment', 'risk-assessment', 'labour', 'delivery', 'postnatal', 'newborn', 'encounters', 'vitals', 'labs', 'medications', 'treatment', 'referrals', 'handovers', 'timeline', 'clinical-progress'],
  nurse: ['overview', 'vitals', 'labs', 'medications', 'treatment', 'clinical-progress', 'inpatient', 'timeline', 'diagnoses', 'handovers'],
  lab_technician: ['overview', 'labs', 'timeline'],
  pharmacist: ['overview', 'medications', 'prescriptions', 'inpatient'],
  receptionist: ['overview', 'encounters', 'billing', 'diagnoses'],
  patient: ['overview', 'encounters', 'vitals', 'labs', 'medications', 'prescriptions', 'timeline', 'treatment', 'clinical-progress'],
  default: ['overview', 'encounters', 'timeline'],
};

export default function PatientWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const patientId = Number(id);
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [inpatientLabs, setInpatientLabs] = useState<InpatientLabRequest[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [nhisRecord, setNHISRecord] = useState<NHISRecord | null>(null);
  const [privateInsurance, setPrivateInsurance] = useState<PrivateInsuranceRecord[]>([]);
  const [progressNotes, setProgressNotes] = useState<ClinicalProgressNote[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [antenatalRecords, setAntenatalRecords] = useState<AntenatalRecord[]>([]);
  const [labourRecords, setLabourRecords] = useState<LabourRecord[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [newborns, setNewborns] = useState<Newborn[]>([]);
  const [fetalAssessments, setFetalAssessments] = useState<FetalAssessment[]>([]);
  const [postnatalRecords, setPostnatalRecords] = useState<PostnatalRecord[]>([]);
  const [allowedTabs] = useState(ROLE_TAB_ACCESS[user?.role || 'default'] || ROLE_TAB_ACCESS.default);

  const [showConsultation, setShowConsultation] = useState(false);
  const [consultationForm, setConsultationForm] = useState({
    encounter_type: 'consultation',
    symptoms: '',
    notes: '',
    triage_level: 'routine',
  });
  const [savingConsultation, setSavingConsultation] = useState(false);

  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisTerm[]>([]);
  const [searchingDiagnoses, setSearchingDiagnoses] = useState(false);
  const [diagnosisType, setDiagnosisType] = useState('working');
  const [diagnosisNote, setDiagnosisNote] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');

  const [showPrescribe, setShowPrescribe] = useState(false);
  const [prescribeQuery, setPrescribeQuery] = useState('');
  const [medicationResults, setMedicationResults] = useState<Medication[]>([]);
  const [searchingMedications, setSearchingMedications] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medication: '',
    dosage: '',
    frequency: '',
    instructions: '',
    duration: '',
  });
  const [savingPrescription, setSavingPrescription] = useState(false);

  const [showLabOrder, setShowLabOrder] = useState(false);
  const [labOrderForm, setLabOrderForm] = useState({
    test_name: '',
    clinical_notes: '',
    priority: 'routine',
  });
  const [savingLabOrder, setSavingLabOrder] = useState(false);

  const [showReferral, setShowReferral] = useState(false);
  const [referralForm, setReferralForm] = useState({
    referral_type: 'internal',
    urgency_level: 'routine',
    reason: '',
    primary_diagnosis: '',
    clinical_summary: '',
    current_treatment: '',
    additional_notes: '',
  });
  const [savingReferral, setSavingReferral] = useState(false);

  const [showAdmission, setShowAdmission] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    admission_type: 'elective',
    admission_reason: '',
    primary_diagnosis: '',
    clinical_notes: '',
  });
  const [savingAdmission, setSavingAdmission] = useState(false);
  const [hospitals, setHospitals] = useState<{ id: number; name: string }[]>([]);

  const [showProgressNote, setShowProgressNote] = useState(false);
  const [progressNoteForm, setProgressNoteForm] = useState({
    clinical_status: 'stable',
    response_to_treatment: '',
    chief_concern: '',
    clinical_progress: '',
    assessment: '',
    treatment_response: '',
    current_treatment: '',
    treatment_plan: '',
    medication_changes: '',
    investigation_interpretation: '',
    follow_up_instructions: '',
    next_review_date: '',
    additional_notes: '',
  });
  const [savingProgressNote, setSavingProgressNote] = useState(false);

  const visibleTabs = TABS.filter((t) => allowedTabs.includes(t.key));
  const referringFacilityId = user?.hospital || hospitals[0]?.id;

  function load() {
    if (!patientId) return;
    setLoading(true);
    setError('');
    Promise.all([
      query('patients'),
      query('encounters'),
      query('vitals'),
      query('lab-requests'),
      query('lab-results'),
      query('prescriptions'),
      query('timeline'),
      query('handovers'),
      query('referrals'),
      query('admissions'),
      query('inpatient-notes'),
      query('bed-transfers'),
      query('med-admins'),
      query('inpatient-lab-requests'),
      query('inpatient-prescriptions'),
      query('clinical-progress-notes'),
      query('diagnoses'),
      query('diagnosis-terms'),
      query('medications'),
      query('bills'),
      query('nhis-records'),
      query('private-insurance-records'),
      query('antenatal-records'),
      query('labour-records'),
      query('deliveries'),
      query('newborns'),
      query('fetal-assessments'),
      query('postnatal-records'),
      query('maternity-notes'),
      query('hospitals'),
    ])
      .then(([
        p, enc, vit, labReq, labRes, rx, tl, hand, ref, adm,
        _inNotes, _bedTrans, _medAdm, inLabs, _inRx, progressNotesData, diagnosesData, diagnosisTermsData, medicationsData, b, nhis, privIns,
        antData, labourData, delData, nbData, faData, pnData, _mnData, hospitalsData,
      ]) => {
        const allPatients = Array.isArray(p) ? p : [];
        const found = allPatients.find((pt: Patient) => pt.id === patientId);
        setPatient(found || null);

        const encList = Array.isArray(enc) ? enc : [];
        setEncounters(encList.filter((e: Encounter) => e.patient === patientId));

        const vitList = Array.isArray(vit) ? vit : [];
        setVitals(vitList.filter((v: VitalSign) => v.patient === patientId));

        const labReqList = Array.isArray(labReq) ? labReq : [];
        setLabRequests(labReqList.filter((l: LabRequest) => l.patient === patientId));

        const labResList = Array.isArray(labRes) ? labRes : [];
        const patientLabReqIds = new Set(labReqList.filter((l) => l.patient === patientId).map((l) => l.id));
        setLabResults(labResList.filter((lr: LabResult) => patientLabReqIds.has(lr.lab_request as number)));

        const rxList = Array.isArray(rx) ? rx : [];
        setPrescriptions(rxList.filter((r: Prescription) => r.patient === patientId));

        const tlList = Array.isArray(tl) ? tl : [];
        setTimeline(tlList.filter((t: TimelineEvent) => t.patient === patientId));

        const handList = Array.isArray(hand) ? hand : [];
        setHandovers(handList.filter((h: Handover) => h.patients && h.patients.some((hp: any) => hp.patient === patientId)));

        const refList = Array.isArray(ref) ? ref : [];
        setReferrals(refList.filter((r: Referral) => r.patient === patientId));

        const admList = Array.isArray(adm) ? adm : [];
        setAdmissions(admList.filter((a: Admission) => a.patient === patientId));

        const inLabList = Array.isArray(inLabs) ? inLabs : [];
        setInpatientLabs(inLabList.filter((il: InpatientLabRequest) => il.patient === patientId));

        const billList = Array.isArray(b) ? b : [];
        setBills(billList.filter((bi: Bill) => bi.patient === patientId));

        const nhisList = Array.isArray(nhis) ? nhis : [];
        setNHISRecord(nhisList.find((n: NHISRecord) => n.patient === patientId) || null);

        const privList = Array.isArray(privIns) ? privIns : [];
        setPrivateInsurance(privList.filter((pi: PrivateInsuranceRecord) => pi.patient === patientId));

        const progressNotesList = Array.isArray(progressNotesData) ? progressNotesData : [];
        setProgressNotes(progressNotesList.filter((n: ClinicalProgressNote) => n.patient === patientId));

        const diagnosesList = Array.isArray(diagnosesData) ? diagnosesData : [];
        setDiagnoses(diagnosesList.filter((d: Diagnosis) => d.patient === patientId));

        setDiagnosisResults(Array.isArray(diagnosisTermsData) ? diagnosisTermsData.slice(0, 10) : []);

        const medicationsList = Array.isArray(medicationsData) ? medicationsData : [];
        setMedications(medicationsList);

        const antList = Array.isArray(antData) ? antData : [];
        setAntenatalRecords(antList.filter((r: AntenatalRecord) => r.patient === patientId));

        const labourList = Array.isArray(labourData) ? labourData : [];
        setLabourRecords(labourList.filter((r: LabourRecord) => r.patient === patientId));

        const delList = Array.isArray(delData) ? delData : [];
        setDeliveries(delList.filter((d: Delivery) => d.patient === patientId));

        const nbList = Array.isArray(nbData) ? nbData : [];
        setNewborns(nbList.filter((n: Newborn) => n.mother === patientId));

        const faList = Array.isArray(faData) ? faData : [];
        setFetalAssessments(faList.filter((r: FetalAssessment) => r.patient === patientId));

        const pnList = Array.isArray(pnData) ? pnData : [];
        setPostnatalRecords(pnList.filter((r: PostnatalRecord) => r.patient === patientId));

        setHospitals(Array.isArray(hospitalsData) ? hospitalsData : []);
      })
      .catch((e) => setError(e.message || 'Failed to load patient data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    console.log('[PatientWorkspace] load effect running, patientId:', patientId);
    load();
    const off = onSyncChange(load);
    return off;
  }, [patientId]);

  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      console.log('[PatientWorkspace] Resetting tab from', tab, 'to', allowedTabs[0]);
      setTab(allowedTabs[0]);
    }
  }, [user?.role, tab, allowedTabs]);

  const activeAdmission = admissions.find((a) => a.status === 'admitted' || a.status === 'transferred');
  const currentLocation = activeAdmission
    ? [activeAdmission.ward_name, activeAdmission.room_number, activeAdmission.bed_number].filter(Boolean).join(' / ') || undefined
    : undefined;
  const currentEncounter = encounters.find((e) => e.status === 'in_progress');

  const alerts: string[] = [];
  if (activeAdmission) alerts.push(`Inpatient: ${activeAdmission.ward_name || 'ward'}`);
  const criticalLabs = [...labRequests, ...inpatientLabs].filter((l) => l.priority === 'emergency');
  if (criticalLabs.length > 0) alerts.push('Critical lab results');
  if (patient?.allergies) alerts.push(`Allergy: ${patient.allergies}`);

  const sortedEncounters = useMemo(() =>
    [...encounters].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [encounters]
  );

  const sortedVitals = useMemo(() =>
    [...vitals].sort((a, b) => (b.recorded_at || '').localeCompare(a.recorded_at || '')),
    [vitals]
  );

  if (!patientId) {
    return <div className="text-red-400">Invalid patient ID.</div>;
  }
  if (loading) {
    return <EmptyBox message="Loading patient..." />;
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }
  if (!patient) {
    return <EmptyBox message="Patient not found." />;
  }

  const latestVitals = sortedVitals[0];

  console.log('[PatientWorkspace] ABOUT TO RETURN, tab:', tab, 'patient:', patient?.full_name, 'loading:', loading, 'error:', error);

  return (
    <div>
      <PatientHeader
        patient={patient}
        currentLocation={currentLocation}
        currentEncounter={currentEncounter?.encounter_type}
        currentStatus={activeAdmission ? activeAdmission.status : progressNotes[0]?.clinical_status || currentEncounter?.status}
        lastConsultation={sortedEncounters[0]?.created_at?.slice(0, 10)}
        alerts={alerts.length > 0 ? alerts : undefined}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setShowConsultation(true)}
          className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
        >
          <Play size={14} />
          Start Consultation
        </button>
        <button
          onClick={() => setShowProgressNote(true)}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          <FileText size={14} />
          New Progress Note
        </button>
        <button
          onClick={() => setShowDiagnosis(true)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Diagnosis
        </button>
        <button
          onClick={() => setShowPrescribe(true)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Prescribe
        </button>
        <button
          onClick={() => setShowLabOrder(true)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <FlaskConical size={14} />
          Order Lab
        </button>
        <button
          onClick={() => setShowReferral(true)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <ArrowRightLeft size={14} />
          Refer
        </button>
        <button
          onClick={() => setShowAdmission(true)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <Bed size={14} />
          Admit
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      
      {tab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Current Visit</h3>
            {currentEncounter ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Encounter Type</p>
                  <p className="text-slate-100 font-medium">{currentEncounter.encounter_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${currentEncounter.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{currentEncounter.status.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Clinician</p>
                  <p className="text-slate-100">{currentEncounter.doctor_name || currentEncounter.nurse_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Started</p>
                  <p className="text-slate-100">{(currentEncounter.created_at || '').slice(0, 16)}</p>
                </div>
                {currentEncounter.symptoms && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-slate-400">Symptoms / Reason for Visit</p>
                    <p className="text-slate-100">{currentEncounter.symptoms}</p>
                  </div>
                )}
                {currentEncounter.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-slate-400">Clinical Notes</p>
                    <p className="text-slate-100">{currentEncounter.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyBox message="No active encounter." />
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-slate-100">Latest Vitals</h3>
              {latestVitals ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {latestVitals.temperature_c != null && (
                    <div>
                      <p className="text-xs text-slate-400">Temperature</p>
                      <p className={`text-lg font-semibold ${latestVitals.temperature_c >= 38 ? 'text-red-400' : 'text-slate-100'}`}>{latestVitals.temperature_c}°C</p>
                    </div>
                  )}
                  {latestVitals.blood_pressure && (
                    <div>
                      <p className="text-xs text-slate-400">Blood Pressure</p>
                      <p className="text-lg font-semibold text-slate-100">{latestVitals.blood_pressure}</p>
                    </div>
                  )}
                  {latestVitals.pulse_bpm != null && (
                    <div>
                      <p className="text-xs text-slate-400">Pulse</p>
                      <p className={`text-lg font-semibold ${latestVitals.pulse_bpm > 100 || latestVitals.pulse_bpm < 60 ? 'text-red-400' : 'text-slate-100'}`}>{latestVitals.pulse_bpm} bpm</p>
                    </div>
                  )}
                  {latestVitals.oxygen_saturation != null && (
                    <div>
                      <p className="text-xs text-slate-400">SpO2</p>
                      <p className={`text-lg font-semibold ${latestVitals.oxygen_saturation < 95 ? 'text-red-400' : 'text-slate-100'}`}>{latestVitals.oxygen_saturation}%</p>
                    </div>
                  )}
                  {latestVitals.respiratory_rate != null && (
                    <div>
                      <p className="text-xs text-slate-400">Respiratory Rate</p>
                      <p className={`text-lg font-semibold ${latestVitals.respiratory_rate != null ? 'text-slate-100' : 'text-slate-100'}`}>{latestVitals.respiratory_rate} /min</p>
                    </div>
                  )}
                  {latestVitals.weight_kg != null && (
                    <div>
                      <p className="text-xs text-slate-400">Weight</p>
                      <p className="text-lg font-semibold text-slate-100">{latestVitals.weight_kg} kg</p>
                    </div>
                  )}
                  {latestVitals.height_cm != null && (
                    <div>
                      <p className="text-xs text-slate-400">Height</p>
                      <p className="text-lg font-semibold text-slate-100">{latestVitals.height_cm} cm</p>
                    </div>
                  )}
                  {latestVitals.blood_glucose != null && (
                    <div>
                      <p className="text-xs text-slate-400">Blood Glucose</p>
                      <p className="text-lg font-semibold text-slate-100">{latestVitals.blood_glucose} mmol/L</p>
                    </div>
                  )}
                  {latestVitals.pain_score != null && (
                    <div>
                      <p className="text-xs text-slate-400">Pain Score</p>
                      <p className="text-lg font-semibold text-slate-100">{latestVitals.pain_score}/10</p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400">Recorded</p>
                    <p className="text-sm text-slate-300">{(latestVitals.recorded_at || '').slice(0, 16)} by {latestVitals.recorded_by_name || '—'}</p>
                  </div>
                </div>
              ) : (
                <EmptyBox message="No vitals recorded." />
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-lg font-semibold text-slate-100">Recent Lab Results</h3>
              {labResults.length === 0 ? (
                <EmptyBox message="No lab results." />
              ) : (
                <div className="space-y-2">
                  {labResults.slice(0, 5).map((lr) => (
                    <div key={lr.id} className={`flex items-center justify-between rounded-lg border p-3 ${lr.status === 'critical' ? 'border-red-500/30 bg-red-500/10' : lr.status === 'abnormal' ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
                      <div>
                        <p className="text-sm font-medium text-slate-100">{lr.test_name}</p>
                        <p className="text-xs text-slate-400">{lr.result_value} {lr.units || ''}</p>
                        <p className="text-xs text-slate-500">{(lr.completed_at || '').slice(0, 16)}</p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${lr.status === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' : lr.status === 'abnormal' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{lr.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Current Medications</h3>
            {prescriptions.length === 0 ? (
              <EmptyBox message="No active prescriptions." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Medication</th>
                      <th className="px-4 py-3 font-medium">Dosage</th>
                      <th className="px-4 py-3 font-medium">Frequency</th>
                      <th className="px-4 py-3 font-medium">Instructions</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {prescriptions.slice(0, 10).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-100">{p.medication}</td>
                        <td className="px-4 py-3 text-slate-300">{p.dosage}</td>
                        <td className="px-4 py-3 text-slate-300">{p.frequency || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{p.instructions || '—'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${p.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{p.status}</span></td>
                        <td className="px-4 py-3 text-slate-400">{(p.created_at || '').slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Outstanding Items</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Pending Lab Results</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{labRequests.filter((l) => l.status !== 'completed' && l.status !== 'cancelled').length}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Pending Referrals</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{referrals.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Pending Handovers</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{handovers.filter((h) => h.status === 'pending').length}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Active Admissions</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{admissions.filter((a) => a.status === 'admitted' || a.status === 'transferred').length}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'encounters' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Encounters / EMR</h3>
          </div>
          {sortedEncounters.length === 0 ? (
            <EmptyBox message="No encounters." />
          ) : (
            <div className="space-y-4">
              {sortedEncounters.map((e) => (
                <div key={e.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">{e.encounter_type}</p>
                      <p className="text-xs text-slate-400">{(e.created_at || '').slice(0, 16)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${e.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : e.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{e.status.replace(/_/g, ' ')}</span>
                  </div>
                  {e.symptoms && <p className="mt-2 text-sm text-slate-300"><strong>Symptoms:</strong> {e.symptoms}</p>}
                  {e.notes && <p className="mt-1 text-sm text-slate-300"><strong>Notes:</strong> {e.notes}</p>}
                  <p className="mt-1 text-xs text-slate-500">Clinician: {e.doctor_name || e.nurse_name || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'vitals' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Vital Signs History</h3>
          {sortedVitals.length === 0 ? (
            <EmptyBox message="No vitals recorded." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">BP</th>
                    <th className="px-4 py-3 font-medium">Pulse</th>
                    <th className="px-4 py-3 font-medium">Temp</th>
                    <th className="px-4 py-3 font-medium">SpO2</th>
                    <th className="px-4 py-3 font-medium">Weight</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sortedVitals.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-400">{(v.recorded_at || '').slice(0, 16)}</td>
                      <td className="px-4 py-3 text-slate-100">{v.blood_pressure || '—'}</td>
                      <td className="px-4 py-3 text-slate-100">{v.pulse_bpm || '—'}</td>
                      <td className="px-4 py-3 text-slate-100">{v.temperature_c != null ? `${v.temperature_c}°C` : '—'}</td>
                      <td className="px-4 py-3 text-slate-100">{v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—'}</td>
                      <td className="px-4 py-3 text-slate-100">{v.weight_kg != null ? `${v.weight_kg} kg` : '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{v.recorded_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'labs' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Laboratory Requests</h3>
            {labRequests.length === 0 ? (
              <EmptyBox message="No lab requests." />
            ) : (
              <div className="space-y-4">
                {labRequests.slice(0, 10).map((lr) => (
                  <div key={lr.id} className={`flex items-center justify-between rounded-lg border p-3 ${lr.priority === 'emergency' ? 'border-red-500/30 bg-red-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{lr.test_name}</p>
                      <p className="text-xs text-slate-400">Requested: {(lr.created_at || '').slice(0, 16)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${lr.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : lr.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{lr.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'medications' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Medication Catalog</h3>
          {medications.length === 0 ? (
            <EmptyBox message="No medications in catalog." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Generic Name</th>
                    <th className="px-4 py-3 font-medium">Brand Name</th>
                    <th className="px-4 py-3 font-medium">Strength</th>
                    <th className="px-4 py-3 font-medium">Form</th>
                    <th className="px-4 py-3 font-medium">Route</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {medications.slice(0, 20).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{m.generic_name}</td>
                      <td className="px-4 py-3 text-slate-300">{m.brand_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{m.strength || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{m.dosage_form || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{m.route || '—'}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${m.available ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{m.formulary_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'prescriptions' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Prescriptions</h3>
          {prescriptions.length === 0 ? (
            <EmptyBox message="No prescriptions." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Medication</th>
                    <th className="px-4 py-3 font-medium">Dosage</th>
                    <th className="px-4 py-3 font-medium">Frequency</th>
                    <th className="px-4 py-3 font-medium">Instructions</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {prescriptions.slice(0, 10).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{p.medication}</td>
                      <td className="px-4 py-3 text-slate-300">{p.dosage}</td>
                      <td className="px-4 py-3 text-slate-300">{p.frequency || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{p.instructions || '—'}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${p.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{p.status}</span></td>
                      <td className="px-4 py-3 text-slate-400">{(p.created_at || '').slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'treatment' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Treatment Plan</h3>
          {progressNotes.length === 0 ? (
            <EmptyBox message="No treatment plan." />
          ) : (
            <div className="space-y-4">
              {progressNotes.slice(0, 10).map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-sm text-slate-300">{n.clinical_progress}</p>
                  <p className="mt-1 text-xs text-slate-500">{(n.created_at || '').slice(0, 16)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'referrals' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Referrals</h3>
          {referrals.length === 0 ? (
            <EmptyBox message="No referrals." />
          ) : (
            <div className="space-y-4">
              {referrals.slice(0, 10).map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="font-medium text-slate-100">{r.reason}</p>
                  <p className="text-xs text-slate-400">To: {r.receiving_facility_name || '—'} | {(r.created_at || '').slice(0, 16)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'handovers' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Handovers</h3>
          {handovers.length === 0 ? (
            <EmptyBox message="No handovers." />
          ) : (
            <div className="space-y-4">
              {handovers.slice(0, 10).map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-sm text-slate-300">{h.additional_notes || 'No summary'}</p>
                  <p className="text-xs text-slate-500">{(h.created_at || '').slice(0, 16)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'inpatient' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Inpatient</h3>
          {admissions.length === 0 ? (
            <EmptyBox message="No admissions." />
          ) : (
            <div className="space-y-4">
              {admissions.slice(0, 10).map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="font-medium text-slate-100">{a.ward_name} - {a.room_number} - {a.bed_number}</p>
                  <p className="text-xs text-slate-400">Admitted: {(a.admission_date || '').slice(0, 16)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'timeline' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Timeline</h3>
            {timeline.length === 0 ? (
              <EmptyBox message="No timeline events." />
            ) : (
              <div className="space-y-4">
                {timeline.slice(0, 20).map((t) => (
                  <div key={t.id} className="flex gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <div className="text-xs text-slate-500">{(t.occurred_at || '').slice(0, 16)}</div>
                    <div className="text-sm text-slate-300">{t.description}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'insurance' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Insurance Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-400">Primary Insurance Type</p>
                <p className="text-slate-100 font-medium">{patient.insurance_type === 'nhis' ? 'NHIS' : patient.insurance_type === 'private' ? 'Private Insurance' : patient.insurance_type === 'self_pay' ? 'Self-Pay' : patient.insurance_type || '—'}</p>
              </div>
              {nhisRecord && (
                <>
                  <div>
                    <p className="text-sm text-slate-400">NHIS Number</p>
                    <p className="text-slate-100">{nhisRecord.nhis_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Membership Status</p>
                    <p className="text-slate-100">{nhisRecord.membership_status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Expiry Date</p>
                    <p className="text-slate-100">{nhisRecord.expiry_date || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Scheme Type</p>
                    <p className="text-slate-100">{nhisRecord.scheme_type}</p>
                  </div>
                </>
              )}
            </div>
          </Card>

          {privateInsurance.length > 0 && (
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-slate-100">Private Insurance Records</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">Membership No.</th>
                      <th className="px-4 py-3 font-medium">Employer</th>
                      <th className="px-4 py-3 font-medium">Expiry</th>
                      <th className="px-4 py-3 font-medium">Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {privateInsurance.map((pi) => (
                      <tr key={pi.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-100">{pi.company_name || `#${pi.insurance_company}`}</td>
                        <td className="px-4 py-3 text-slate-300">{pi.membership_number}</td>
                        <td className="px-4 py-3 text-slate-300">{pi.employer || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{pi.policy_expiry || '—'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${pi.verified ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{pi.verified ? 'Verified' : 'Unverified'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      
      {(() => { document.body.setAttribute('data-tab', tab); return null; })()}
      
      {tab === 'antenatal' && (
        <div className="space-y-6">
          <div data-testid="antenatal-section">
            <h3>Antenatal Records</h3>
          </div>
        </div>
      )}

      {tab === 'pregnancy' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Current Pregnancy</h3>
            {antenatalRecords.length === 0 ? (
              <EmptyBox message="No pregnancy record." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(() => {
                  const current = [...antenatalRecords].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
                  return (
                    <>
                      <div>
                        <p className="text-sm text-slate-400">Current Pregnancy</p>
                        <p className="text-slate-100 font-medium">Active</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Gestational Age</p>
                        <p className="text-slate-100">{current.current_gestational_age ? `${current.current_gestational_age} weeks` : 'Not recorded'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">EDD</p>
                        <p className="text-slate-100">{current.edd ? formatDate(current.edd) : 'Not recorded'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">LMP</p>
                        <p className="text-slate-100">{current.lmp ? formatDate(current.lmp) : 'Not recorded'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Gravida</p>
                        <p className="text-slate-100">{current.gravida}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Para</p>
                        <p className="text-slate-100">{current.para}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Risk Classification</p>
                        <p className="text-slate-100">{current.risk_classification.replace('_', ' ')}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'maternal-vitals' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Maternal Vitals</h3>
            {sortedVitals.length === 0 ? (
              <EmptyBox message="No maternal vitals recorded." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">BP</th>
                      <th className="px-4 py-3 font-medium">Pulse</th>
                      <th className="px-4 py-3 font-medium">Temp</th>
                      <th className="px-4 py-3 font-medium">SpO2</th>
                      <th className="px-4 py-3 font-medium">Weight</th>
                      <th className="px-4 py-3 font-medium">Fundal Height</th>
                      <th className="px-4 py-3 font-medium">Fetal Heart Rate</th>
                      <th className="px-4 py-3 font-medium">Presentation</th>
                      <th className="px-4 py-3 font-medium">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedVitals.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-400">{(v.recorded_at || '').slice(0, 16)}</td>
                        <td className="px-4 py-3 text-slate-100">{v.blood_pressure || '—'}</td>
                        <td className="px-4 py-3 text-slate-100">{v.pulse_bpm || '—'}</td>
                        <td className="px-4 py-3 text-slate-100">{v.temperature_c != null ? `${v.temperature_c}°C` : '—'}</td>
                        <td className="px-4 py-3 text-slate-100">{v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—'}</td>
                        <td className="px-4 py-3 text-slate-100">{v.weight_kg != null ? `${v.weight_kg} kg` : '—'}</td>
                        <td className="px-4 py-3 text-slate-100">{v.fundal_height_cm != null ? `${v.fundal_height_cm} cm` : '—'}</td>
                        <td className="px-4 py-3 text-slate-100">{v.fetal_heart_rate_bpm != null ? `${v.fetal_heart_rate_bpm} bpm` : '—'}</td>
                        <td className="px-4 py-3 text-slate-100">{v.presentation || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{v.recorded_by_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'fetal-assessment' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Fetal Assessment</h3>
            {fetalAssessments.length === 0 ? (
              <EmptyBox message="No fetal assessments." />
            ) : (
              <div className="space-y-4">
                {fetalAssessments.slice(0, 10).map((f) => (
                  <div key={f.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <p className="font-medium text-slate-100">{f.fetal_heart_rate} bpm</p>
                    <p className="text-xs text-slate-400">{(f.created_at || '').slice(0, 16)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'risk-assessment' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Risk Assessment</h3>
            {antenatalRecords.length === 0 ? (
              <EmptyBox message="No risk assessments." />
            ) : (
              <div className="space-y-4">
                {antenatalRecords.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <p className="font-medium text-slate-100">{r.risk_classification.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-400">{(r.created_at || '').slice(0, 16)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'labour' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Labour</h3>
            {labourRecords.length === 0 ? (
              <EmptyBox message="No labour records." />
            ) : (
              <div className="space-y-4">
                {labourRecords.slice(0, 10).map((l) => (
                  <div key={l.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <p className="font-medium text-slate-100">{l.labour_status || 'In progress'}</p>
                    <p className="text-xs text-slate-400">{(l.created_at || '').slice(0, 16)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'delivery' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Delivery</h3>
            {deliveries.length === 0 ? (
              <EmptyBox message="No deliveries." />
            ) : (
              <div className="space-y-4">
                {deliveries.slice(0, 10).map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <p className="font-medium text-slate-100">{d.delivery_type || '—'}</p>
                    <p className="text-xs text-slate-400">{(d.delivery_time || '').slice(0, 16)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'postnatal' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Postnatal</h3>
            {postnatalRecords.length === 0 ? (
              <EmptyBox message="No postnatal records." />
            ) : (
              <div className="space-y-4">
                {postnatalRecords.slice(0, 10).map((p) => (
                  <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <p className="font-medium text-slate-100">{p.postnatal_status || '—'}</p>
                    <p className="text-xs text-slate-400">{(p.created_at || '').slice(0, 16)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'newborn' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Newborn</h3>
            {newborns.length === 0 ? (
              <EmptyBox message="No newborns." />
            ) : (
              <div className="space-y-4">
                {newborns.slice(0, 10).map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <p className="font-medium text-slate-100">{`Baby ${n.id}`}</p>
                    <p className="text-xs text-slate-400">{(n.created_at || '').slice(0, 16)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'clinical-progress' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Clinical Notes</h3>
          {progressNotes.length === 0 ? (
            <EmptyBox message="No clinical notes." />
          ) : (
            <div className="space-y-4">
              {progressNotes.slice(0, 10).map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-sm text-slate-300">{n.clinical_progress}</p>
                  <p className="mt-1 text-xs text-slate-500">{(n.created_at || '').slice(0, 16)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'diagnoses' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Diagnoses</h3>
          {diagnoses.length === 0 ? (
            <EmptyBox message="No diagnoses." />
          ) : (
            <div className="space-y-4">
              {diagnoses.slice(0, 10).map((d) => (
                <div key={d.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-100">{d.diagnosis_name}</p>
                    {d.icd10_code && <span className="text-xs text-slate-500">({d.icd10_code})</span>}
                  </div>
                  <p className="text-xs text-slate-400 capitalize">{d.diagnosis_type} · {d.status}</p>
                  {d.clinical_note && <p className="mt-1 text-sm text-slate-300">{d.clinical_note}</p>}
                  <p className="mt-1 text-xs text-slate-500">{(d.created_at || '').slice(0, 16)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'billing' && (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Billing</h3>
            {bills.length === 0 ? (
              <EmptyBox message="No billing records." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Insurance</th>
                      <th className="px-4 py-3 font-medium">Co-pay</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-100">{b.bill_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-slate-100">GHS {Number(b.total_amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-300">GHS {Number(b.covered_by_insurance).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-300">GHS {Number(b.patient_co_pay).toFixed(2)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${b.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : b.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{b.status}</span></td>
                        <td className="px-4 py-3 text-slate-400">{(b.created_at || '').slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {showConsultation && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Start Consultation</h3>
            <button onClick={() => setShowConsultation(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Chief Complaint</label>
              <textarea
                value={consultationForm.symptoms}
                onChange={(e) => setConsultationForm({ ...consultationForm, symptoms: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Clinical Notes</label>
              <textarea
                value={consultationForm.notes}
                onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Triage Level</label>
              <select
                value={consultationForm.triage_level}
                onChange={(e) => setConsultationForm({ ...consultationForm, triage_level: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConsultation(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSavingConsultation(true);
                  try {
                    await create('encounters', {
                      patient: patientId,
                      ...consultationForm,
                      status: 'in_progress',
                    });
                    setShowConsultation(false);
                    setConsultationForm({ encounter_type: 'consultation', symptoms: '', notes: '', triage_level: 'routine' });
                    load();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSavingConsultation(false);
                  }
                }}
                disabled={savingConsultation}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingConsultation ? 'Saving...' : 'Save Consultation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showDiagnosis && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Add Diagnosis</h3>
            <button onClick={() => { setShowDiagnosis(false); setDiagnosisQuery(''); }} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Search Diagnosis</label>
              <input
                value={diagnosisQuery}
                onChange={async (e) => {
                  const q = e.target.value;
                  setDiagnosisQuery(q);
                  if (q.length > 1) {
                    setSearchingDiagnoses(true);
                    try {
                      const res = await query('diagnosis-terms');
                      const filtered = (Array.isArray(res) ? res : []).filter((d: DiagnosisTerm) =>
                        d.name.toLowerCase().includes(q.toLowerCase()) ||
                        d.icd10_code.toLowerCase().includes(q.toLowerCase())
                      );
                      setDiagnosisResults(filtered.slice(0, 10));
                    } catch {
                      setDiagnosisResults([]);
                    } finally {
                      setSearchingDiagnoses(false);
                    }
                  } else {
                    setDiagnosisResults([]);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Search diagnosis catalog..."
              />
              {searchingDiagnoses && <p className="mt-1 text-xs text-slate-400">Searching...</p>}
              {diagnosisResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                  {diagnosisResults.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDiagnosisQuery(d.name);
                        setDiagnosisCode(d.icd10_code);
                        setDiagnosisResults([]);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
                    >
                      {d.name} ({d.icd10_code})
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Diagnosis Type</label>
                <select value={diagnosisType} onChange={(e) => setDiagnosisType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                <option value="working">Working</option>
                <option value="provisional">Provisional</option>
                <option value="confirmed">Confirmed</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Clinical Note</label>
              <textarea value={diagnosisNote} onChange={(e) => setDiagnosisNote(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowDiagnosis(false); setDiagnosisQuery(''); }} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!diagnosisQuery) return;
                  await create('diagnoses', {
                    patient: patientId,
                    encounter: currentEncounter?.id,
                    diagnosis_name: diagnosisQuery,
                    diagnosis_type: diagnosisType,
                    status: 'active',
                    clinical_note: diagnosisNote,
                    icd10_code: diagnosisCode,
                  });
                  setShowDiagnosis(false);
                  setDiagnosisQuery('');
                  setDiagnosisType('working');
                  setDiagnosisNote('');
                  setDiagnosisCode('');
                  load();
                }}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Save Diagnosis
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showPrescribe && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Prescribe Medication</h3>
            <button onClick={() => { setShowPrescribe(false); setPrescribeQuery(''); }} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Search Medication</label>
              <input
                value={prescribeQuery}
                onChange={async (e) => {
                  const q = e.target.value;
                  setPrescribeQuery(q);
                  if (q.length > 1) {
                    setSearchingMedications(true);
                    try {
                      const res = await query('medications');
                      const filtered = (Array.isArray(res) ? res : []).filter((m: Medication) =>
                        m.generic_name.toLowerCase().includes(q.toLowerCase()) ||
                        (m.brand_name || '').toLowerCase().includes(q.toLowerCase())
                      );
                      setMedicationResults(filtered.slice(0, 10));
                    } catch {
                      setMedicationResults([]);
                    } finally {
                      setSearchingMedications(false);
                    }
                  } else {
                    setMedicationResults([]);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Search medication catalog..."
              />
              {searchingMedications && <p className="mt-1 text-xs text-slate-400">Searching...</p>}
              {medicationResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                  {medicationResults.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setPrescriptionForm({ ...prescriptionForm, medication: m.generic_name });
                        setPrescribeQuery(m.generic_name);
                        setMedicationResults([]);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
                    >
                      {m.generic_name} {m.strength ? `(${m.strength})` : ''} {m.dosage_form ? `- ${m.dosage_form}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Dosage</label>
                <input
                  value={prescriptionForm.dosage}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. 500mg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Frequency</label>
                <input
                  value={prescriptionForm.frequency}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. TDS"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Duration</label>
                <input
                  value={prescriptionForm.duration}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. 5 days"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Status</label>
                <select className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                  <option value="draft">Draft</option>
                  <option value="signed">Signed</option>
                  <option value="sent_to_pharmacy">Sent to Pharmacy</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Instructions</label>
              <textarea
                value={prescriptionForm.instructions}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowPrescribe(false); setPrescribeQuery(''); }} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSavingPrescription(true);
                  try {
                    await create('prescriptions', {
                      patient: patientId,
                      doctor: user?.id,
                      medication: prescriptionForm.medication,
                      dosage: prescriptionForm.dosage,
                      instructions: [
                        prescriptionForm.frequency && `Frequency: ${prescriptionForm.frequency}`,
                        prescriptionForm.duration && `Duration: ${prescriptionForm.duration}`,
                        prescriptionForm.instructions,
                      ].filter(Boolean).join(' | '),
                    });
                    setShowPrescribe(false);
                    setPrescribeQuery('');
                    setPrescriptionForm({ medication: '', dosage: '', frequency: '', instructions: '', duration: '' });
                    load();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSavingPrescription(false);
                  }
                }}
                disabled={savingPrescription}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingPrescription ? 'Saving...' : 'Prescribe Medication'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showLabOrder && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Order Lab / Diagnostic</h3>
            <button onClick={() => setShowLabOrder(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Test Name</label>
              <input
                value={labOrderForm.test_name}
                onChange={(e) => setLabOrderForm({ ...labOrderForm, test_name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Complete Blood Count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Clinical Indication</label>
              <textarea
                value={labOrderForm.clinical_notes}
                onChange={(e) => setLabOrderForm({ ...labOrderForm, clinical_notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Priority</label>
              <select
                value={labOrderForm.priority}
                onChange={(e) => setLabOrderForm({ ...labOrderForm, priority: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLabOrder(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSavingLabOrder(true);
                  try {
                    await create('lab-requests', {
                      patient: patientId,
                      ...labOrderForm,
                      status: 'pending',
                    });
                    setShowLabOrder(false);
                    setLabOrderForm({ test_name: '', clinical_notes: '', priority: 'routine' });
                    load();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSavingLabOrder(false);
                  }
                }}
                disabled={savingLabOrder}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingLabOrder ? 'Ordering...' : 'Order Lab'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showReferral && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Create Referral</h3>
            <button onClick={() => setShowReferral(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Referral Type</label>
                <select
                  value={referralForm.referral_type}
                  onChange={(e) => setReferralForm({ ...referralForm, referral_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                  <option value="specialist">Specialist</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Urgency</label>
                <select
                  value={referralForm.urgency_level}
                  onChange={(e) => setReferralForm({ ...referralForm, urgency_level: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Reason</label>
              <textarea
                value={referralForm.reason}
                onChange={(e) => setReferralForm({ ...referralForm, reason: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Primary Diagnosis</label>
              <input
                value={referralForm.primary_diagnosis}
                onChange={(e) => setReferralForm({ ...referralForm, primary_diagnosis: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Clinical Summary</label>
              <textarea
                value={referralForm.clinical_summary}
                onChange={(e) => setReferralForm({ ...referralForm, clinical_summary: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReferral(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSavingReferral(true);
                  try {
                    await create('referrals', {
                      patient: patientId,
                      ...referralForm,
                      referring_facility: referringFacilityId,
                      status: 'draft',
                    });
                    setShowReferral(false);
                    setReferralForm({ referral_type: 'internal', urgency_level: 'routine', reason: '', primary_diagnosis: '', clinical_summary: '', current_treatment: '', additional_notes: '' });
                    load();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSavingReferral(false);
                  }
                }}
                disabled={savingReferral}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingReferral ? 'Creating...' : 'Create Referral'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showAdmission && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Admit Patient</h3>
            <button onClick={() => setShowAdmission(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Admission Type</label>
                <select
                  value={admissionForm.admission_type}
                  onChange={(e) => setAdmissionForm({ ...admissionForm, admission_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="elective">Elective</option>
                  <option value="emergency">Emergency</option>
                  <option value="transfer">Transfer</option>
                  <option value="observation">Observation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Primary Diagnosis</label>
                <input
                  value={admissionForm.primary_diagnosis}
                  onChange={(e) => setAdmissionForm({ ...admissionForm, primary_diagnosis: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Admission Reason</label>
              <textarea
                value={admissionForm.admission_reason}
                onChange={(e) => setAdmissionForm({ ...admissionForm, admission_reason: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Clinical Notes</label>
              <textarea
                value={admissionForm.clinical_notes}
                onChange={(e) => setAdmissionForm({ ...admissionForm, clinical_notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdmission(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSavingAdmission(true);
                  try {
                    await create('admissions', {
                      patient: patientId,
                      ...admissionForm,
                      status: 'admitted',
                      insurance_type: patient?.insurance_type || 'self_pay',
                    });
                    setShowAdmission(false);
                    setAdmissionForm({ admission_type: 'elective', admission_reason: '', primary_diagnosis: '', clinical_notes: '' });
                    load();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSavingAdmission(false);
                  }
                }}
                disabled={savingAdmission}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingAdmission ? 'Admitting...' : 'Admit Patient'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showProgressNote && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Add Clinical Progress Note</h3>
            <button onClick={() => setShowProgressNote(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Clinical Status</label>
              <select
                value={progressNoteForm.clinical_status}
                onChange={(e) => setProgressNoteForm({ ...progressNoteForm, clinical_status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="stable">Stable</option>
                <option value="improving">Improving</option>
                <option value="deteriorating">Deteriorating</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Response to Treatment</label>
              <select
                value={progressNoteForm.response_to_treatment}
                onChange={(e) => setProgressNoteForm({ ...progressNoteForm, response_to_treatment: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select...</option>
                <option value="improving">Improving</option>
                <option value="no_change">No Change</option>
                <option value="worsening">Worsening</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Chief Concern</label>
              <textarea
                value={progressNoteForm.chief_concern}
                onChange={(e) => setProgressNoteForm({ ...progressNoteForm, chief_concern: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Clinical Progress</label>
              <textarea
                value={progressNoteForm.clinical_progress}
                onChange={(e) => setProgressNoteForm({ ...progressNoteForm, clinical_progress: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Assessment</label>
              <textarea
                value={progressNoteForm.assessment}
                onChange={(e) => setProgressNoteForm({ ...progressNoteForm, assessment: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Treatment Plan</label>
              <textarea
                value={progressNoteForm.treatment_plan}
                onChange={(e) => setProgressNoteForm({ ...progressNoteForm, treatment_plan: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Follow-up Instructions</label>
              <textarea
                value={progressNoteForm.follow_up_instructions}
                onChange={(e) => setProgressNoteForm({ ...progressNoteForm, follow_up_instructions: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowProgressNote(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSavingProgressNote(true);
                  try {
                    await create('clinical-progress-notes', {
                      patient: patientId,
                      ...progressNoteForm,
                    });
                    setShowProgressNote(false);
                    setProgressNoteForm({
                      clinical_status: 'stable',
                      response_to_treatment: '',
                      chief_concern: '',
                      clinical_progress: '',
                      assessment: '',
                      treatment_response: '',
                      current_treatment: '',
                      treatment_plan: '',
                      medication_changes: '',
                      investigation_interpretation: '',
                      follow_up_instructions: '',
                      next_review_date: '',
                      additional_notes: '',
                    });
                    load();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSavingProgressNote(false);
                  }
                }}
                disabled={savingProgressNote}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingProgressNote ? 'Saving...' : 'Save Progress Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}


