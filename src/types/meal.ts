export type ProjectId = 'childfund-uganda' | 'omugo-wvu';

export type UserRole =
  | 'programme_manager'
  | 'implementing_partner'
  | 'me_reviewer'
  | 'independent_evaluator'
  | 'funder';

export type NavModule =
  | 'portfolio'
  | 'role_home'
  | 'overview'
  | 'documents'
  | 'workplan'
  | 'results'
  | 'capture'
  | 'surveys'
  | 'checks'
  | 'knowledge'
  | 'evaluation'
  | 'reports'
  | 'settings';

export type ProvenanceType = 'sourced' | 'reconstructed' | 'synthetic';

export type ApprovalStatus = 'draft' | 'submitted' | 'returned' | 'approved';

export type VerificationStatus =
  | 'unverified'
  | 'verified'
  | 'flagged_discrepancy'
  | 'fieldwork_required';

export interface SourceCitation {
  documentId: string;
  documentName: string;
  version?: string;
  sectionOrTab: string;
  pageOrRow: string;
  quoteOrNote?: string;
  originalAvailable: boolean;
}

export interface LocationItem {
  id: string;
  name: string;
  region: string;
  type: 'District' | 'Settlement Zone' | 'Sub-county';
  svgX: number;
  svgY: number;
  partner: string;
}

export interface ReportingCycle {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: 'closed' | 'open' | 'upcoming' | 'overdue';
}

export interface ReportTemplateConfig {
  id: string;
  name: string;
  type: 'donor_interim' | 'programme_progress' | 'evaluator_handover';
  audience: string;
  description: string;
  defaultSections: { id: string; title: string; body: string }[];
}

export interface ProjectConfig {
  id: ProjectId;
  name: string;
  shortName: string;
  code: string;
  organisation: string;
  donor: string;
  country: string;
  region: string;
  timeframe: string;
  goal: string;
  specificObjective: string;
  sectors: string[];
  partners: string[];
  locations: LocationItem[];
  reportingCycles: ReportingCycle[];
  breakdowns: string[];
  reportTemplates: ReportTemplateConfig[];
  upcomingEvaluationDate: string;
  evaluationLead: string;
}

export interface ProjectDocument {
  id: string;
  projectId: ProjectId;
  title: string;
  fileName: string;
  version: string;
  date: string;
  docType:
    | 'Proposal / Plan'
    | 'Logframe / Coverage Workbook'
    | 'Interim / Progress Report'
    | 'Baseline Report'
    | 'Endline & Learning Review'
    | 'Survey Instrument'
    | 'Field Observation / KII';
  provenance: ProvenanceType;
  originalAvailable: boolean;
  availabilityNote?: string;
  supports: string;
  cannotEstablish: string;
  summary: string;
  linkedIndicatorIds: string[];
  linkedActivityIds: string[];
  linkedQuestionIds: string[];
}

export interface Commitment {
  id: string;
  projectId: ProjectId;
  code: string;
  title: string;
  description: string;
  sector: string;
  frameworkNodeId: string;
  sourceCitation: SourceCitation;
  provenance: ProvenanceType;
  extractionMethod: 'sourced_verified' | 'simulated_extraction';
  status: 'candidate' | 'approved' | 'deferred';
  approvedBy?: string;
  approvedAt?: string;
  defaultOwnerPartner: string;
  defaultLocation: string;
  defaultDueDate: string;
  expectedOutput: number;
  outputUnit: string;
  evidenceRequirements: string[];
  linkedIndicatorId?: string;
  linkedActivityIds: string[];
}

export interface ActivityChangeEntry {
  id: string;
  date: string;
  changedBy: string;
  field: string;
  previousValue: string;
  newValue: string;
  reason: string;
}

export interface FieldIssue {
  id: string;
  date: string;
  loggedBy: string;
  severity: 'low' | 'medium' | 'high';
  category: 'Delay' | 'Access / Logistics' | 'Evidence Gap' | 'Procurement' | 'Data Variance';
  description: string;
  resolved: boolean;
}

export interface WorkplanActivity {
  id: string;
  projectId: ProjectId;
  code: string;
  title: string;
  sector: string;
  commitmentId: string;
  frameworkNodeId: string;
  linkedIndicatorId?: string;
  linkedRegisterId?: string;
  ownerPartner: string;
  ownerPerson: string;
  location: string;
  plannedDueDate: string;
  currentDueDate: string;
  plannedOutput: number;
  actualDelivered: number;
  outputUnit: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed' | 'overdue';
  evidenceRequirements: string[];
  attachedEvidenceIds: string[];
  provenance: ProvenanceType;
  changeLog: ActivityChangeEntry[];
  issues: FieldIssue[];
}

export interface DeliveryRecord {
  id: string;
  projectId: ProjectId;
  activityId: string;
  indicatorId?: string;
  period: string;
  date: string;
  partner: string;
  location: string;
  quantityDelivered: number;
  unit: string;
  narrative: string;
  sourceCitation?: SourceCitation;
  evidenceMissing: boolean;
  approvalStatus: ApprovalStatus;
  provenance: ProvenanceType;
  createdBy: string;
}

export interface RegisterColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}

export interface RegisterRow {
  id: string;
  projectId: ProjectId;
  registerId: string;
  period: string;
  partner: string;
  location: string;
  approvalStatus: ApprovalStatus;
  provenance: ProvenanceType;
  values: Record<string, string | number>;
  sourceRef: string;
  importedFromCsv?: { fileName: string; rowNumber: number };
}

export interface RegisterDefinition {
  id: string;
  projectId: ProjectId;
  name: string;
  description: string;
  linkedIndicatorId: string;
  linkedActivityId?: string;
  aggregationRule: 'count_rows' | 'sum_field';
  sumField?: string;
  columns: RegisterColumn[];
}

export interface ResultsNode {
  id: string;
  projectId: ProjectId;
  parentId: string | null;
  level: 'goal' | 'outcome' | 'output' | 'activity';
  code: string;
  title: string;
  sector: string;
}

export type CalculationMethod = 'direct' | 'register_aggregate' | 'formula';

export interface IndicatorFormula {
  type: 'ratio_of_target' | 'ratio_indicators' | 'pct_change_from_baseline';
  numeratorIndicatorId: string;
  denominatorIndicatorId?: string;
  denominatorConstant?: number;
  expressionLabel: string;
}

export interface Indicator {
  id: string;
  projectId: ProjectId;
  code: string;
  title: string;
  definition: string;
  sector: string;
  reportingLevel: 'Impact' | 'Outcome' | 'Output' | 'Activity';
  frameworkNodeId: string;
  unit: string;
  calculationMethod: CalculationMethod;
  linkedRegisterId?: string;
  formula?: IndicatorFormula;
  baseline: number | null;
  baselinePeriod?: string;
  target: number | null;
  frequency: string;
  responsiblePartner: string;
  permitsCumulative: boolean;
  comparabilityKey?: string;
  comparabilityNote?: string;
  breakdowns: string[];
  provenance: ProvenanceType;
}

export interface ReviewComment {
  id: string;
  date: string;
  author: string;
  role: UserRole;
  action: 'comment' | 'returned' | 'approved' | 'corrected' | 'submitted';
  text: string;
  assignedTo?: string;
}

export interface IndependentNote {
  id: string;
  date: string;
  author: string;
  status: VerificationStatus;
  note: string;
  discrepancyFlag: boolean;
  pushedToEvalPlanQuestionId?: string;
}

export interface RevisionEntry {
  version: number;
  date: string;
  changedBy: string;
  previousValue: number | null;
  newValue: number | null;
  previousStatus: ApprovalStatus;
  newStatus: ApprovalStatus;
  reason: string;
}

export interface ResultObservation {
  id: string;
  projectId: ProjectId;
  indicatorId: string;
  period: string;
  partner: string;
  location: string;
  sector: string;
  reportedValue: number | null;
  unit?: string;
  denominator?: number | null;
  denominatorLabel?: string;
  breakdownSummary?: string;
  narrative: string;
  provenance: ProvenanceType;
  sourceCitation: SourceCitation;
  approvalStatus: ApprovalStatus;
  verificationStatus: VerificationStatus;
  reviewerComments: ReviewComment[];
  independentNotes: IndependentNote[];
  revisionHistory: RevisionEntry[];
  createdAt: string;
  updatedAt: string;
  importedFromCsv?: { fileName: string; rowNumber: number };
  periodMismatchWarning?: string;
  conflictWarning?: string;
}

export interface SurveyInstrument {
  id: string;
  projectId: ProjectId;
  code: string;
  title: string;
  type: 'Baseline Survey' | 'Endline Survey' | 'PDM / Follow-up Assessment' | 'Facility & KII Tool';
  fileName: string;
  period: string;
  population: string;
  plannedSampleSize: number;
  achievedSampleSize: number | null;
  linkedIndicatorIds: string[];
  linkedQuestionIds: string[];
  provenance: ProvenanceType;
  sourceCitation: SourceCitation;
  notes: string;
}

export interface SurveyResultRecord {
  id: string;
  projectId: ProjectId;
  instrumentId: string;
  indicatorId: string;
  period: string;
  location: string;
  populationGroup: string;
  value: number | null;
  unit: string;
  denominator: number | null;
  expectedDenominator?: number;
  periodCheckStatus: 'valid' | 'mismatch_warning';
  denominatorCheckStatus: 'valid' | 'missing' | 'mismatch_warning';
  checkNote?: string;
  approvalStatus: ApprovalStatus;
  provenance: ProvenanceType;
  sourceCitation: SourceCitation;
  linkedObservationId?: string;
}

export interface CorrectiveAction {
  id: string;
  projectId: ProjectId;
  title: string;
  category:
    | 'Missing Evidence'
    | 'Overdue Activity'
    | 'Conflicting Figures'
    | 'Plan Departure'
    | 'Denominator / Period Issue'
    | 'Learning Follow-Up';
  description: string;
  owner: string;
  ownerRole: UserRole;
  dueDate: string;
  status: 'open' | 'evidence_submitted' | 'closed';
  linkedActivityId?: string;
  linkedIndicatorId?: string;
  linkedObservationId?: string;
  linkedQuestionId?: string;
  closureEvidenceRef?: string;
  closureNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface LearningEntry {
  id: string;
  projectId: ProjectId;
  date: string;
  category: 'Qualitative Finding' | 'Lesson Learned' | 'Community Feedback' | 'Adaptation';
  sector: string;
  title: string;
  summary: string;
  sourceCitation: SourceCitation;
  provenance: ProvenanceType;
  linkedIndicatorIds: string[];
  linkedActivityIds: string[];
  usedInReport: boolean;
  agreedActionId?: string;
}

export type EvalReadiness =
  | 'answerable_from_records'
  | 'needs_clarification'
  | 'needs_independent_validation'
  | 'needs_new_fieldwork';

export interface EvaluationQuestion {
  id: string;
  projectId: ProjectId;
  code: string;
  criterion: 'Relevance' | 'Effectiveness' | 'Efficiency' | 'Impact' | 'Sustainability' | 'Equity';
  question: string;
  sector: string;
  linkedIndicatorIds: string[];
  linkedDocumentIds: string[];
  availableEvidenceSummary: string;
  evidenceQuality: 'High' | 'Moderate' | 'Low / Partial' | 'Missing';
  remainingGaps: string;
  readiness: EvalReadiness;
  proposedMethod: string;
  owner: string;
  status: 'Open' | 'In Review' | 'Fieldwork Planned' | 'Answered';
  assignedFollowUpNote?: string;
}

export interface EvaluatorFinding {
  id: string;
  projectId: ProjectId;
  code: string;
  title: string;
  sector: string;
  findingText: string;
  linkedIndicatorIds: string[];
  linkedDocumentIds: string[];
  sourceCitation: SourceCitation;
  limitations: string;
  recommendation: string;
  managementResponse: string;
  managementOwner: string;
  managementStatus: 'Pending' | 'Accepted' | 'In Progress' | 'Completed';
  provenance: ProvenanceType;
}

export interface HandoverSnapshotIndicator {
  indicatorId: string;
  code: string;
  title: string;
  unit: string;
  period: string;
  approvedValue: number | null;
  observationId: string;
  sourceRef: string;
  provenance: ProvenanceType;
  verificationStatus: VerificationStatus;
}

export interface HandoverSnapshot {
  id: string;
  projectId: ProjectId;
  label: string;
  createdAt: string;
  createdBy: string;
  notes: string;
  frameworkCount: number;
  approvedIndicators: HandoverSnapshotIndicator[];
  unresolvedIssues: string[];
  evaluationQuestions: {
    code: string;
    question: string;
    readiness: EvalReadiness;
    proposedMethod: string;
  }[];
  suggestedFieldwork: string[];
}

export interface FilterState {
  period: string;
  partner: string;
  location: string;
  sector: string;
}

export interface InspectorTarget {
  type: 'indicator' | 'observation' | 'activity' | 'document' | 'question';
  id: string;
}

export interface MealState {
  activeProjectId: ProjectId;
  activeModule: NavModule;
  activeRole: UserRole;
  filters: FilterState;
  projects: Record<ProjectId, ProjectConfig>;
  documents: ProjectDocument[];
  commitments: Commitment[];
  activities: WorkplanActivity[];
  deliveryRecords: DeliveryRecord[];
  registers: RegisterDefinition[];
  registerRows: RegisterRow[];
  resultsNodes: ResultsNode[];
  indicators: Indicator[];
  observations: ResultObservation[];
  surveyInstruments: SurveyInstrument[];
  surveyResults: SurveyResultRecord[];
  correctiveActions: CorrectiveAction[];
  learningEntries: LearningEntry[];
  evaluationQuestions: EvaluationQuestion[];
  evaluatorFindings: EvaluatorFinding[];
  handoverSnapshots: HandoverSnapshot[];
  reportNarratives: Record<string, Record<string, string>>;
  walkthroughOpen: boolean;
  activeWalkthroughTab: 'childfund' | 'omugo' | 'correction';
}
