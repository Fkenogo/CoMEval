export type AreaId = 'plan' | 'do' | 'measure' | 'prove' | 'report' | 'learn';

export type DemoRole = 'programme_manager' | 'field_officer' | 'me_reviewer' | 'donor_readonly';

export type RecordStatus = 'draft' | 'submitted' | 'verified' | 'approved' | 'returned';

export type ProvenanceKind = 'historical_sourced' | 'reconstructed_endline' | 'synthetic_demo';

export type QuestionType =
  | 'whole_number'
  | 'decimal'
  | 'short_text'
  | 'long_text'
  | 'yes_no'
  | 'choice';

export type IndicatorInputRole = 'count' | 'value' | 'numerator' | 'denominator' | 'category';

export type AggregationRule =
  | 'sum'
  | 'cumulative'
  | 'latest'
  | 'average'
  | 'combined_rate'
  | 'unique_count';

export type FrameworkLevel = 'Input' | 'Activity' | 'Output' | 'Outcome' | 'Goal';

export interface SourceDocument {
  id: string;
  title: string;
  docType: 'Proposal' | 'Logframe' | 'Workplan' | 'Amendment' | 'Survey Instrument' | 'Report' | 'Register';
  version: string;
  reference: string;
  date: string;
  available: boolean;
  notes?: string;
}

export interface FrameworkItem {
  id: string;
  level: FrameworkLevel;
  code: string;
  title: string;
  parentId: string | null;
  assumptions: string[];
  risks: string[];
}

export interface SiteConfig {
  id: string;
  name: string;
  region: string;
  type: 'District' | 'Settlement Zone' | 'Facility' | 'Sub-county' | 'Community';
}

export interface ReportingPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
}

export interface EvidenceRequirement {
  required: boolean;
  label: string;
  acceptedTypes: ('file' | 'photo' | 'source_ref')[];
}

export interface IndicatorMapping {
  indicatorId: string;
  role: IndicatorInputRole;
}

export interface CollectionQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  min?: number;
  max?: number;
  options?: string[];
  evidenceHint?: string;
  indicatorMapping?: IndicatorMapping;
}

export interface ActivityDefinition {
  id: string;
  code: string;
  name: string;
  frameworkItemId: string;
  linkedIndicatorId?: string;
  expectedQuantity: number;
  unit: string;
  periodId: string;
  participantMode: 'none' | 'aggregate' | 'registry';
  questions: CollectionQuestion[];
  evidenceRequirement: EvidenceRequirement;
}

export type ValueStatus = 'numeric' | 'missing' | 'not_applicable';

export interface BaselineSpec {
  status: ValueStatus;
  value: number | null;
  date: string;
  scope: string;
  source: string;
}

export interface TargetSpec {
  periodId: string;
  status: ValueStatus;
  value: number | null;
}

export interface IndicatorDefinition {
  id: string;
  code: string;
  name: string;
  definition: string;
  frameworkLevel: FrameworkLevel;
  frameworkItemId: string;
  unit: string;
  dataSource: string;
  collectionMethod: string;
  frequency: string;
  responsibleRole: string;
  direction: 'increase' | 'decrease' | 'maintain';
  disaggregations: string[];
  inputMode: 'single_value' | 'category' | 'ratio_numerator_denominator' | 'calculated_from_activity';
  numeratorLabel?: string;
  denominatorLabel?: string;
  baseline: BaselineSpec;
  periodTargets: TargetSpec[];
  finalTarget: { status: ValueStatus; value: number | null; note?: string };
  aggregationRule: AggregationRule;
  comparableAcrossSites: boolean;
  comparabilityNote?: string;
  questions: CollectionQuestion[];
  evidenceRequirement: EvidenceRequirement;
}

export interface ReportingRulesConfig {
  periods: ReportingPeriod[];
  defaultPeriodId: string;
  defaultTemplate: 'Standard Donor Report' | 'Programme Progress Brief' | 'Evaluation Handover Summary';
  timeAggregationNote: string;
  siteAggregationNote: string;
  groupAggregationNote: string;
}

export interface PlanSnapshot {
  description: string;
  donor: string;
  implementingLead: string;
  timeframe: string;
  sourceDocuments: SourceDocument[];
  framework: FrameworkItem[];
  sites: SiteConfig[];
  activities: ActivityDefinition[];
  indicators: IndicatorDefinition[];
  reportingRules: ReportingRulesConfig;
}

export interface ApprovedPlanVersion {
  id: string;
  versionNumber: number;
  versionLabel: string;
  approvedAt: string;
  approvedBy: string;
  changeNote: string;
  plan: PlanSnapshot;
}

export interface ProjectEntity {
  id: string;
  name: string;
  shortName: string;
  code: string;
  activePlanVersionId: string | null;
  draftPlan: PlanSnapshot;
  planVersions: ApprovedPlanVersion[];
  createdAt: string;
}

export interface EvidenceAttachment {
  id: string;
  kind: 'file' | 'photo' | 'source_ref';
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  dataUrl?: string; // Real base64 Data URL persisted in localStorage so uploaded files reopen after reload
  sourceDocumentId?: string;
  sourceRefText?: string;
  uploadedAt: string;
  uploadedBy: string;
  simulated?: boolean;
}

export interface DecisionEntry {
  id: string;
  at: string;
  actor: string;
  role: DemoRole;
  action: 'saved_draft' | 'submitted' | 'returned' | 'verified' | 'approved' | 'revision_created';
  note: string;
}

export interface ActivityRecord {
  id: string;
  recordGroupId: string;
  revision: number;
  supersedesRecordId?: string;
  projectId: string;
  planVersionId: string;
  planVersionLabel: string;
  activityId: string | null;
  activityNameSnapshot: string;
  isUnplanned: boolean;
  unplannedTitle?: string;
  date: string;
  periodId: string;
  siteId: string;
  siteNameSnapshot: string;
  questionSnapshot: CollectionQuestion[];
  evidenceRequirementSnapshot: EvidenceRequirement;
  answers: Record<string, string | number | boolean>;
  participantModeUsed: 'none' | 'aggregate' | 'registry';
  participantCount?: number;
  participantIds?: string[]; // Synthetic IDs only (e.g. P-CF-001)
  notes: string;
  evidence: EvidenceAttachment[];
  status: RecordStatus;
  provenance: ProvenanceKind;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  decisionHistory: DecisionEntry[];
}

export interface StudyMetadata {
  isStudyOrSurvey: boolean;
  studyRound: string;
  method: string;
  population: string;
  fieldworkDates: string;
  sourceCitation: string;
}

export interface MeasurementRecord {
  id: string;
  recordGroupId: string;
  revision: number;
  supersedesRecordId?: string;
  projectId: string;
  planVersionId: string;
  planVersionLabel: string;
  indicatorId: string;
  indicatorCodeSnapshot: string;
  indicatorNameSnapshot: string;
  indicatorUnitSnapshot: string;
  observationDate: string;
  periodId: string;
  siteId: string; // siteId or 'all_sites'
  siteNameSnapshot: string;
  breakdowns: Record<string, string>;
  collectionMethod: string;
  studyMetadata?: StudyMetadata;
  questionSnapshot: CollectionQuestion[];
  evidenceRequirementSnapshot: EvidenceRequirement;
  answers: Record<string, string | number | boolean>;
  singleValue?: number | null;
  categoryValue?: string;
  numerator?: number | null;
  denominator?: number | null;
  notes: string;
  evidence: EvidenceAttachment[];
  csvImportRef?: { fileName: string; rowNumber: number };
  status: RecordStatus;
  provenance: ProvenanceKind;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  decisionHistory: DecisionEntry[];
}

export interface ReportActivityRow {
  activityId: string;
  code: string;
  name: string;
  planned: number;
  delivered: number;
  unit: string;
  recordCount: number;
  missingEvidenceCount: number;
}

export interface ReportIndicatorRow {
  indicatorId: string;
  code: string;
  name: string;
  unit: string;
  frameworkLevel: FrameworkLevel;
  aggregationRule: AggregationRule;
  baselineDisplay: string;
  periodTargetDisplay: string;
  finalTargetDisplay: string;
  actualValue: number | null;
  actualDisplay: string;
  achievementPct: number | null;
  statusNote: string;
  isMissing: boolean;
  isIncomparable: boolean;
  contributingCount: number;
  numeratorSum?: number;
  denominatorSum?: number;
  sourceRefs: string[];
}

export interface IssuedReport {
  id: string;
  projectId: string;
  projectNameSnapshot: string;
  title: string;
  templateName: string;
  periodId: string;
  periodLabel: string;
  issuedAt: string;
  issuedBy: string;
  planVersionId: string;
  planVersionLabel: string;
  includedSections: string[];
  breakdownDimension: string;
  activityRows: ReportActivityRow[];
  indicatorRows: ReportIndicatorRow[];
  siteBreakdownRows: { siteName: string; activityRecords: number; measurementRecords: number }[];
  evidenceGaps: string[];
  dataQualityNotes: string[];
  sourceReferences: string[];
  narrative: string;
  recordRevisionsUsed: { recordId: string; recordType: 'activity' | 'measurement'; label: string; revision: number }[];
}

export interface TrackedAction {
  id: string;
  owner: string;
  dueDate: string;
  description: string;
  status: 'open' | 'closed';
  closureEvidence?: EvidenceAttachment;
  closureNote?: string;
  closedAt?: string;
  linkedPlanVersionId?: string;
  linkedPlanVersionLabel?: string;
}

export interface LearningItem {
  id: string;
  projectId: string;
  kind: 'evaluation_finding' | 'lesson' | 'issue' | 'risk' | 'assumption';
  title: string;
  summary: string;
  isIndependentEvaluation: boolean;
  linkedRecordType?: 'activity' | 'measurement';
  linkedRecordId?: string;
  linkedIndicatorId?: string;
  sourceReference: string;
  provenance: ProvenanceKind;
  recommendation: string;
  createdAt: string;
  createdBy: string;
  actions: TrackedAction[];
}

export interface MiledgeState {
  activeProjectId: string;
  activeArea: AreaId;
  activeRole: DemoRole;
  projects: ProjectEntity[];
  activityRecords: ActivityRecord[];
  measurementRecords: MeasurementRecord[];
  issuedReports: IssuedReport[];
  learningItems: LearningItem[];
  walkthroughOpen: boolean;
  addProjectModalOpen: boolean;
}
