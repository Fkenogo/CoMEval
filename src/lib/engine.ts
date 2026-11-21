import {
  ActivityDefinition,
  ActivityRecord,
  ApprovedPlanVersion,
  CollectionQuestion,
  DemoRole,
  IndicatorDefinition,
  IssuedReport,
  LearningItem,
  MeasurementRecord,
  PlanSnapshot,
  ProjectEntity,
  ProvenanceKind,
  RecordStatus,
  ReportActivityRow,
  ReportIndicatorRow,
} from '../types/miledge';

export interface RoleDefinition {
  id: DemoRole;
  label: string;
  shortLabel: string;
  actorName: string;
  description: string;
  canEditPlan: boolean;
  canApprovePlan: boolean;
  canCapture: boolean;
  canVerify: boolean;
  canApproveRecord: boolean;
  canGenerateReport: boolean;
  canManageLearn: boolean;
  approvedOnlyView: boolean;
}

export const DEMO_ROLES: Record<DemoRole, RoleDefinition> = {
  programme_manager: {
    id: 'programme_manager',
    label: 'Programme Manager',
    shortLabel: 'Manager',
    actorName: 'Grace Akello (Programme Manager)',
    description: 'Configures and approves plans, captures or approves records, issues reports, and tracks actions.',
    canEditPlan: true,
    canApprovePlan: true,
    canCapture: true,
    canVerify: true,
    canApproveRecord: true,
    canGenerateReport: true,
    canManageLearn: true,
    approvedOnlyView: false,
  },
  field_officer: {
    id: 'field_officer',
    label: 'Field Officer',
    shortLabel: 'Field Officer',
    actorName: 'Moses Etyang (Field Officer)',
    description: 'Records activities and measurements, attaches evidence, submits records, and fixes returned entries.',
    canEditPlan: false,
    canApprovePlan: false,
    canCapture: true,
    canVerify: false,
    canApproveRecord: false,
    canGenerateReport: false,
    canManageLearn: true,
    approvedOnlyView: false,
  },
  me_reviewer: {
    id: 'me_reviewer',
    label: 'M&E Reviewer',
    shortLabel: 'M&E Reviewer',
    actorName: 'David Okello (M&E Reviewer)',
    description: 'Reviews validation checks and evidence, returns incomplete entries, verifies records, and logs findings.',
    canEditPlan: true,
    canApprovePlan: false,
    canCapture: true,
    canVerify: true,
    canApproveRecord: false,
    canGenerateReport: true,
    canManageLearn: true,
    approvedOnlyView: false,
  },
  donor_readonly: {
    id: 'donor_readonly',
    label: 'Donor (Approved Only)',
    shortLabel: 'Donor',
    actorName: 'BMZ / Donor Desk Officer',
    description: 'Read-only view scoped strictly to approved records, issued reports, source references, and evidence gaps.',
    canEditPlan: false,
    canApprovePlan: false,
    canCapture: false,
    canVerify: false,
    canApproveRecord: false,
    canGenerateReport: false,
    canManageLearn: false,
    approvedOnlyView: true,
  },
};

export function getActiveApprovedPlanVersion(project: ProjectEntity): ApprovedPlanVersion | null {
  if (!project.activePlanVersionId) return null;
  return project.planVersions.find((v) => v.id === project.activePlanVersionId) || null;
}

export function getPlanByVersionId(project: ProjectEntity, versionId: string): ApprovedPlanVersion | null {
  return project.planVersions.find((v) => v.id === versionId) || null;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  validationErrors: ValidationIssue[];
  warnings: ValidationIssue[];
  missingEvidenceFlag: boolean;
  missingEvidenceMessage?: string;
  likelyDuplicateIds: string[];
  canSubmit: boolean;
  canVerify: boolean;
}

function isValidIsoDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const parsed = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
}

function validateQuestions(
  questions: CollectionQuestion[],
  answers: Record<string, string | number | boolean>
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  for (const q of questions) {
    const raw = answers[q.id];
    const isEmpty = raw === undefined || raw === null || raw === '';
    if (q.required && isEmpty) {
      errors.push({ field: q.label, message: `"${q.label}" is required.`, severity: 'error' });
      continue;
    }
    if (!isEmpty && (q.type === 'whole_number' || q.type === 'decimal')) {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        errors.push({ field: q.label, message: `"${q.label}" must be a valid number.`, severity: 'error' });
      } else {
        if (q.type === 'whole_number' && !Number.isInteger(num)) {
          errors.push({ field: q.label, message: `"${q.label}" must be a whole number.`, severity: 'error' });
        }
        if (q.min !== undefined && num < q.min) {
          errors.push({ field: q.label, message: `"${q.label}" cannot be less than ${q.min}.`, severity: 'error' });
        }
        if (q.max !== undefined && num > q.max) {
          errors.push({ field: q.label, message: `"${q.label}" cannot exceed ${q.max}.`, severity: 'error' });
        }
      }
    }
    if (!isEmpty && q.type === 'choice' && q.options && q.options.length > 0) {
      if (!q.options.includes(String(raw))) {
        errors.push({ field: q.label, message: `"${q.label}" has an unlisted choice value.`, severity: 'error' });
      }
    }
  }
  return errors;
}

export function validateActivityRecord(
  record: Pick<
    ActivityRecord,
    | 'id'
    | 'recordGroupId'
    | 'projectId'
    | 'activityId'
    | 'isUnplanned'
    | 'unplannedTitle'
    | 'date'
    | 'siteId'
    | 'questionSnapshot'
    | 'evidenceRequirementSnapshot'
    | 'answers'
    | 'evidence'
  >,
  allProjectActivityRecords: ActivityRecord[]
): ValidationReport {
  const validationErrors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!record.isUnplanned && !record.activityId) {
    validationErrors.push({ field: 'Activity', message: 'Select a configured activity or mark as unplanned.', severity: 'error' });
  }
  if (record.isUnplanned && !record.unplannedTitle?.trim()) {
    validationErrors.push({ field: 'Unplanned title', message: 'Provide a title for the unplanned activity.', severity: 'error' });
  }
  if (!record.date || !isValidIsoDate(record.date)) {
    validationErrors.push({ field: 'Date', message: 'Enter a valid activity date (YYYY-MM-DD).', severity: 'error' });
  } else {
    const year = Number(record.date.slice(0, 4));
    if (year < 2015 || year > 2035) {
      validationErrors.push({ field: 'Date', message: 'Date appears out of realistic project range (2015–2035).', severity: 'error' });
    }
  }
  if (!record.siteId) {
    validationErrors.push({ field: 'Site', message: 'Select a project site.', severity: 'error' });
  }

  validationErrors.push(...validateQuestions(record.questionSnapshot, record.answers));

  // Likely duplicate check (same activity, date, site, different logical group)
  const likelyDuplicateIds = allProjectActivityRecords
    .filter(
      (other) =>
        other.id !== record.id &&
        other.recordGroupId !== record.recordGroupId &&
        other.projectId === record.projectId &&
        other.activityId === record.activityId &&
        !record.isUnplanned &&
        other.date === record.date &&
        other.siteId === record.siteId
    )
    .map((o) => o.id);

  if (likelyDuplicateIds.length > 0) {
    warnings.push({
      field: 'Duplicate check',
      message: `Likely duplicate: ${likelyDuplicateIds.length} other record(s) exist for the same activity, date, and site.`,
      severity: 'warning',
    });
  }

  const missingEvidenceFlag = Boolean(record.evidenceRequirementSnapshot.required && record.evidence.length === 0);
  const missingEvidenceMessage = missingEvidenceFlag
    ? `Required evidence missing: ${record.evidenceRequirementSnapshot.label}`
    : undefined;

  // Clarification 3: Submission is allowed with missing evidence (flagged), but verification requires evidence!
  return {
    validationErrors,
    warnings,
    missingEvidenceFlag,
    missingEvidenceMessage,
    likelyDuplicateIds,
    canSubmit: validationErrors.length === 0,
    canVerify: validationErrors.length === 0 && !missingEvidenceFlag,
  };
}

export function validateMeasurementRecord(
  record: Pick<
    MeasurementRecord,
    | 'id'
    | 'recordGroupId'
    | 'projectId'
    | 'indicatorId'
    | 'observationDate'
    | 'periodId'
    | 'siteId'
    | 'questionSnapshot'
    | 'evidenceRequirementSnapshot'
    | 'answers'
    | 'numerator'
    | 'denominator'
    | 'singleValue'
    | 'evidence'
  >,
  allProjectMeasurements: MeasurementRecord[],
  indicatorDef?: IndicatorDefinition
): ValidationReport {
  const validationErrors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!record.indicatorId) {
    validationErrors.push({ field: 'Indicator', message: 'Select an indicator.', severity: 'error' });
  }
  if (!record.observationDate || !isValidIsoDate(record.observationDate)) {
    validationErrors.push({ field: 'Observation date', message: 'Enter a valid observation date (YYYY-MM-DD).', severity: 'error' });
  }
  if (!record.periodId) {
    validationErrors.push({ field: 'Reporting period', message: 'Select a reporting period.', severity: 'error' });
  }

  validationErrors.push(...validateQuestions(record.questionSnapshot, record.answers));

  // Ratio checks (numerator > denominator, denominator <= 0)
  const extracted = extractIndicatorInputsFromMeasurement(record, indicatorDef);
  if (indicatorDef?.inputMode === 'ratio_numerator_denominator') {
    if (extracted.numerator !== null && extracted.numerator < 0) {
      validationErrors.push({ field: 'Numerator', message: 'Numerator cannot be negative.', severity: 'error' });
    }
    if (extracted.denominator !== null && extracted.denominator <= 0) {
      validationErrors.push({ field: 'Denominator', message: 'Denominator must be greater than zero.', severity: 'error' });
    }
    if (
      extracted.numerator !== null &&
      extracted.denominator !== null &&
      extracted.denominator > 0 &&
      extracted.numerator > extracted.denominator
    ) {
      validationErrors.push({
        field: 'Ratio check',
        message: `Numerator (${extracted.numerator}) cannot be greater than denominator (${extracted.denominator}).`,
        severity: 'error',
      });
    }
  }

  const likelyDuplicateIds = allProjectMeasurements
    .filter(
      (other) =>
        other.id !== record.id &&
        other.recordGroupId !== record.recordGroupId &&
        other.projectId === record.projectId &&
        other.indicatorId === record.indicatorId &&
        other.periodId === record.periodId &&
        other.siteId === record.siteId &&
        other.observationDate === record.observationDate
    )
    .map((o) => o.id);

  if (likelyDuplicateIds.length > 0) {
    warnings.push({
      field: 'Duplicate check',
      message: `Likely duplicate: ${likelyDuplicateIds.length} other observation(s) share this indicator, date, period, and site.`,
      severity: 'warning',
    });
  }

  const missingEvidenceFlag = Boolean(record.evidenceRequirementSnapshot.required && record.evidence.length === 0);
  const missingEvidenceMessage = missingEvidenceFlag
    ? `Required source/evidence missing: ${record.evidenceRequirementSnapshot.label}`
    : undefined;

  return {
    validationErrors,
    warnings,
    missingEvidenceFlag,
    missingEvidenceMessage,
    likelyDuplicateIds,
    canSubmit: validationErrors.length === 0,
    canVerify: validationErrors.length === 0 && !missingEvidenceFlag,
  };
}

/**
 * Extract mapped numeric inputs once from configured question answers.
 * Uses a count of records (1 per record) ONLY for activities explicitly configured
 * with deliveryCountingMode === 'count_events'. Returns null when a numeric quantity
 * is missing so callers can surface missing quantities separately from 0.
 */
export function extractActivityMappedValue(
  record: ActivityRecord,
  indicatorId?: string,
  activityDef?: ActivityDefinition
): number | null {
  if (activityDef?.deliveryCountingMode === 'count_events') {
    return 1;
  }

  // 1. Prefer the explicitly designated quantity question matching the activity's unit
  if (activityDef?.quantityQuestionId) {
    const raw = record.answers[activityDef.quantityQuestionId];
    if (raw !== undefined && raw !== null && raw !== '' && !Number.isNaN(Number(raw))) {
      return Number(raw);
    }
    // Quantity question was explicitly configured, so blank means missing quantity (never silently fall back to 1)
    return null;
  }

  // 2. Otherwise check numeric question explicitly mapped to an indicator
  for (const q of record.questionSnapshot) {
    if (
      q.indicatorMapping &&
      (!indicatorId || q.indicatorMapping.indicatorId === indicatorId) &&
      (q.indicatorMapping.role === 'count' || q.indicatorMapping.role === 'value') &&
      (q.type === 'whole_number' || q.type === 'decimal')
    ) {
      const raw = record.answers[q.id];
      if (raw !== undefined && raw !== null && raw !== '' && !Number.isNaN(Number(raw))) {
        return Number(raw);
      }
    }
  }

  // 3. Fallback for legacy/unlinked records without activityDef: if a single required numeric question exists, use it
  if (!activityDef && !indicatorId) {
    const numericQs = record.questionSnapshot.filter(
      (q) => q.type === 'whole_number' || q.type === 'decimal'
    );
    if (numericQs.length === 1) {
      const raw = record.answers[numericQs[0].id];
      if (raw !== undefined && raw !== null && raw !== '' && !Number.isNaN(Number(raw))) {
        return Number(raw);
      }
    }
  }

  return null;
}

export function extractIndicatorInputsFromMeasurement(
  record: Pick<MeasurementRecord, 'questionSnapshot' | 'answers' | 'singleValue' | 'categoryValue' | 'numerator' | 'denominator'>,
  indicatorDef?: IndicatorDefinition
): {
  singleValue: number | null;
  categoryValue: string | null;
  numerator: number | null;
  denominator: number | null;
  calculatedRate: number | null;
} {
  let singleValue: number | null = record.singleValue ?? null;
  let categoryValue: string | null = record.categoryValue ?? null;
  let numerator: number | null = record.numerator ?? null;
  let denominator: number | null = record.denominator ?? null;

  for (const q of record.questionSnapshot) {
    const raw = record.answers[q.id];
    if (raw === undefined || raw === null || raw === '') continue;
    const role = q.indicatorMapping?.role;
    if (role === 'numerator' && !Number.isNaN(Number(raw))) numerator = Number(raw);
    if (role === 'denominator' && !Number.isNaN(Number(raw))) denominator = Number(raw);
    if ((role === 'value' || role === 'count') && !Number.isNaN(Number(raw))) singleValue = Number(raw);
    if (role === 'category') categoryValue = String(raw);
  }

  let calculatedRate: number | null = null;
  if (
    (indicatorDef?.inputMode === 'ratio_numerator_denominator' || (numerator !== null && denominator !== null)) &&
    numerator !== null &&
    denominator !== null &&
    denominator > 0
  ) {
    calculatedRate = Number(((numerator / denominator) * 100).toFixed(1));
  }

  return { singleValue, categoryValue, numerator, denominator, calculatedRate };
}

/**
 * Revision-safe approved resolvers (Clarification 4):
 * For every logical recordGroupId, pick ONLY the highest revision whose status === 'approved'.
 * Unapproved correction revisions (draft/submitted/verified) NEVER alter live approved results.
 */
export function getEffectiveApprovedActivityRecords(records: ActivityRecord[], projectId: string): ActivityRecord[] {
  const byGroup = new Map<string, ActivityRecord>();
  for (const r of records) {
    if (r.projectId !== projectId || r.status !== 'approved') continue;
    const prev = byGroup.get(r.recordGroupId);
    if (!prev || r.revision > prev.revision) {
      byGroup.set(r.recordGroupId, r);
    }
  }
  return Array.from(byGroup.values());
}

export function getEffectiveApprovedMeasurementRecords(records: MeasurementRecord[], projectId: string): MeasurementRecord[] {
  const byGroup = new Map<string, MeasurementRecord>();
  for (const r of records) {
    if (r.projectId !== projectId || r.status !== 'approved') continue;
    const prev = byGroup.get(r.recordGroupId);
    if (!prev || r.revision > prev.revision) {
      byGroup.set(r.recordGroupId, r);
    }
  }
  return Array.from(byGroup.values());
}

export function hasPendingCorrectionRevision(
  records: (ActivityRecord | MeasurementRecord)[],
  recordGroupId: string
): boolean {
  const group = records.filter((r) => r.recordGroupId === recordGroupId);
  const maxApproved = Math.max(0, ...group.filter((r) => r.status === 'approved').map((r) => r.revision));
  return group.some((r) => r.revision > maxApproved && r.status !== 'approved');
}

export interface CalculatedIndicatorResult {
  indicator: IndicatorDefinition;
  approvedValue: number | null;
  approvedDisplay: string;
  draftOrPendingValue: number | null;
  hasPendingDifference: boolean;
  isMissing: boolean;
  isIncomparable: boolean;
  statusNote: string;
  numeratorSum?: number;
  denominatorSum?: number;
  uniqueParticipantCount?: number;
  contributingActivityRecords: ActivityRecord[];
  contributingMeasurementRecords: MeasurementRecord[];
  sourceRefs: string[];
  periodTargetDisplay: string;
  periodTargetNumeric: number | null;
  finalTargetDisplay: string;
  achievementPct: number | null;
}

export function calculateIndicatorSummary(
  plan: PlanSnapshot,
  indicator: IndicatorDefinition,
  projectId: string,
  allActivityRecords: ActivityRecord[],
  allMeasurementRecords: MeasurementRecord[],
  periodId: string = 'all',
  siteId: string = 'all'
): CalculatedIndicatorResult {
  const approvedActs = getEffectiveApprovedActivityRecords(allActivityRecords, projectId).filter((r) => {
    if (periodId !== 'all' && r.periodId !== periodId) return false;
    if (siteId !== 'all' && r.siteId !== siteId) return false;
    return true;
  });

  const approvedMeas = getEffectiveApprovedMeasurementRecords(allMeasurementRecords, projectId).filter((r) => {
    if (periodId !== 'all' && r.periodId !== periodId) return false;
    if (siteId !== 'all' && r.siteId !== siteId && r.siteId !== 'all_sites') return false;
    return r.indicatorId === indicator.id;
  });

  // Also check latest revision (including pending/draft) for draft preview delta
  const latestAnyMeasByGroup = new Map<string, MeasurementRecord>();
  for (const r of allMeasurementRecords) {
    if (r.projectId !== projectId || r.indicatorId !== indicator.id) continue;
    if (periodId !== 'all' && r.periodId !== periodId) continue;
    if (siteId !== 'all' && r.siteId !== siteId && r.siteId !== 'all_sites') continue;
    const prev = latestAnyMeasByGroup.get(r.recordGroupId);
    if (!prev || r.revision > prev.revision) latestAnyMeasByGroup.set(r.recordGroupId, r);
  }
  const latestAnyActsByGroup = new Map<string, ActivityRecord>();
  for (const r of allActivityRecords) {
    if (r.projectId !== projectId) continue;
    if (periodId !== 'all' && r.periodId !== periodId) continue;
    if (siteId !== 'all' && r.siteId !== siteId) continue;
    const prev = latestAnyActsByGroup.get(r.recordGroupId);
    if (!prev || r.revision > prev.revision) latestAnyActsByGroup.set(r.recordGroupId, r);
  }

  const linkedActivities = plan.activities.filter(
    (a) => a.linkedIndicatorId === indicator.id || a.questions.some((q) => q.indicatorMapping?.indicatorId === indicator.id)
  );
  const linkedActIds = new Set(linkedActivities.map((a) => a.id));

  const contributingActivityRecords = approvedActs.filter(
    (r) =>
      (r.activityId && linkedActIds.has(r.activityId)) ||
      r.questionSnapshot.some((q) => q.indicatorMapping?.indicatorId === indicator.id)
  );
  const allCandidateActivityRecords = Array.from(latestAnyActsByGroup.values()).filter(
    (r) =>
      (r.activityId && linkedActIds.has(r.activityId)) ||
      r.questionSnapshot.some((q) => q.indicatorMapping?.indicatorId === indicator.id)
  );

  const sourceSet = new Set<string>();
  contributingActivityRecords.forEach((r) =>
    r.evidence.forEach((e) => sourceSet.add(e.sourceRefText || e.name))
  );
  approvedMeas.forEach((r) => {
    if (r.studyMetadata?.sourceCitation) sourceSet.add(r.studyMetadata.sourceCitation);
    r.evidence.forEach((e) => sourceSet.add(e.sourceRefText || e.name));
  });

  // Target lookup
  const targetObj =
    periodId !== 'all'
      ? indicator.periodTargets.find((t) => t.periodId === periodId)
      : indicator.periodTargets[indicator.periodTargets.length - 1];
  const periodTargetNumeric = targetObj && targetObj.status === 'numeric' ? targetObj.value : null;
  const periodTargetDisplay = !targetObj
    ? 'Not set'
    : targetObj.status === 'missing'
    ? 'Missing'
    : targetObj.status === 'not_applicable'
    ? 'N/A'
    : `${targetObj.value} ${indicator.unit}`;
  const finalTargetDisplay =
    indicator.finalTarget.status === 'missing'
      ? 'Missing'
      : indicator.finalTarget.status === 'not_applicable'
      ? 'N/A'
      : `${indicator.finalTarget.value} ${indicator.unit}`;

  let approvedValue: number | null = null;
  let draftOrPendingValue: number | null = null;
  let numeratorSum: number | undefined;
  let denominatorSum: number | undefined;
  let uniqueParticipantCount: number | undefined;
  let isMissing = false;
  let isIncomparable = false;
  let statusNote = '';

  const computeFromSets = (acts: ActivityRecord[], meas: MeasurementRecord[]) => {
    // 1. Unique participant reach (only where deduplicatable synthetic participant IDs exist)
    if (indicator.aggregationRule === 'unique_count') {
      const idSet = new Set<string>();
      let hasOnlyAggregate = false;
      for (const a of acts) {
        if (a.participantIds && a.participantIds.length > 0) {
          a.participantIds.forEach((pid) => idSet.add(pid));
        } else if (a.participantCount && a.participantCount > 0) {
          hasOnlyAggregate = true;
        }
      }
      if (idSet.size > 0) {
        return {
          val: idSet.size,
          note: hasOnlyAggregate
            ? `Deduplicated from ${idSet.size} synthetic participant IDs (aggregate-only records excluded from unique count).`
            : `Deduplicated across ${idSet.size} unique synthetic participant IDs.`,
          unique: idSet.size,
        };
      }
      if (hasOnlyAggregate) {
        return {
          val: null,
          incomparable: true,
          note: 'Incomparable for unique count: records contain aggregate counts without deduplicatable participant IDs.',
        };
      }
      return { val: null, missing: true, note: 'No approved participant records yet.' };
    }

    // 2. Calculated from Do activity records
    if (indicator.inputMode === 'calculated_from_activity') {
      if (acts.length === 0) {
        return { val: null, missing: true, note: 'No approved activity records linked yet.' };
      }
      const extractedPairs = acts.map((a) => {
        const def = plan.activities.find((x) => x.id === a.activityId);
        return { rec: a, val: extractActivityMappedValue(a, indicator.id, def), def };
      });
      const vals = extractedPairs.map((p) => p.val).filter((v): v is number => v !== null);
      const missingCount = extractedPairs.length - vals.length;
      if (vals.length === 0) {
        return {
          val: null,
          missing: true,
          note: `${missingCount} approved activity record(s) missing numeric quantity (distinct from 0).`,
        };
      }
      const sum = vals.reduce((acc, v) => acc + v, 0);
      const allEvents = extractedPairs.every((p) => p.def?.deliveryCountingMode === 'count_events');
      return {
        val: Number(sum.toFixed(2)),
        note: allEvents
          ? `Event count: ${vals.length} approved record(s) explicitly configured to count events.`
          : missingCount > 0
          ? `Sum of ${vals.length} approved record(s) (${vals.join(' + ')} = ${sum}); ${missingCount} record(s) missing quantity excluded.`
          : `Sum of ${vals.length} approved activity record(s) (${vals.join(' + ')} = ${sum}).`,
      };
    }

    // 3. Combined Rate strictly from eligible numerators & denominators
    if (indicator.inputMode === 'ratio_numerator_denominator' || indicator.aggregationRule === 'combined_rate') {
      if (meas.length === 0) {
        return { val: null, missing: true, note: 'No approved survey or monitoring observations yet.' };
      }
      let nSum = 0;
      let dSum = 0;
      let missingDenom = 0;
      for (const m of meas) {
        const ext = extractIndicatorInputsFromMeasurement(m, indicator);
        if (ext.numerator !== null && ext.denominator !== null && ext.denominator > 0) {
          nSum += ext.numerator;
          dSum += ext.denominator;
        } else {
          missingDenom += 1;
        }
      }
      if (dSum === 0) {
        return {
          val: null,
          incomparable: missingDenom > 0,
          missing: missingDenom === 0,
          note:
            missingDenom > 0
              ? `Incomparable / cannot compute rate: ${missingDenom} observation(s) missing valid denominator (n).`
              : 'No approved numerator/denominator inputs yet.',
        };
      }
      const rate = Number(((nSum / dSum) * 100).toFixed(1));
      return {
        val: rate,
        nSum,
        dSum,
        note:
          missingDenom > 0
            ? `Combined rate from eligible records: ${nSum} ÷ ${dSum} = ${rate}% (${missingDenom} record excluded due to missing denominator).`
            : `Combined rate: ${nSum} ÷ ${dSum} = ${rate}% across ${meas.length} approved observation(s).`,
      };
    }

    // 4. Single value direct measurements
    if (meas.length === 0) {
      return { val: null, missing: true, note: 'Missing — no approved measurement recorded for this scope.' };
    }
    if (!indicator.comparableAcrossSites && siteId === 'all' && new Set(meas.map((m) => m.siteId)).size > 1) {
      return {
        val: null,
        incomparable: true,
        note: indicator.comparabilityNote || 'Incomparable across sites — filter to a single site to view.',
      };
    }

    const sorted = [...meas].sort((a, b) => b.observationDate.localeCompare(a.observationDate));
    const nums = sorted
      .map((m) => extractIndicatorInputsFromMeasurement(m, indicator).singleValue)
      .filter((v): v is number => v !== null);
    if (nums.length === 0) {
      return { val: null, missing: true, note: 'Approved record contains no numeric value.' };
    }

    if (indicator.aggregationRule === 'latest') {
      return { val: nums[0], note: `Latest approved observation (${sorted[0].observationDate}).` };
    }
    if (indicator.aggregationRule === 'average') {
      const avg = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
      return { val: avg, note: `Average across ${nums.length} approved observation(s).` };
    }
    // sum / cumulative
    const sum = Number(nums.reduce((a, b) => a + b, 0).toFixed(2));
    return { val: sum, note: `Cumulative sum across ${nums.length} approved observation(s).` };
  };

  const approvedRes = computeFromSets(contributingActivityRecords, approvedMeas);
  approvedValue = approvedRes.val;
  numeratorSum = approvedRes.nSum;
  denominatorSum = approvedRes.dSum;
  uniqueParticipantCount = approvedRes.unique;
  isMissing = Boolean(approvedRes.missing);
  isIncomparable = Boolean(approvedRes.incomparable);
  statusNote = approvedRes.note;

  const pendingRes = computeFromSets(allCandidateActivityRecords, Array.from(latestAnyMeasByGroup.values()));
  draftOrPendingValue = pendingRes.val;

  const hasPendingDifference =
    draftOrPendingValue !== approvedValue &&
    !(draftOrPendingValue === null && approvedValue === null);

  let achievementPct: number | null = null;
  const denomTarget =
    periodTargetNumeric && periodTargetNumeric > 0
      ? periodTargetNumeric
      : indicator.finalTarget.status === 'numeric' && indicator.finalTarget.value && indicator.finalTarget.value > 0
      ? indicator.finalTarget.value
      : null;

  if (approvedValue !== null && denomTarget !== null && !isIncomparable) {
    achievementPct = Math.round((approvedValue / denomTarget) * 100);
  }

  const approvedDisplay = isIncomparable
    ? 'Incomparable'
    : approvedValue === null
    ? 'Missing'
    : `${approvedValue}${indicator.unit === '%' ? '%' : ` ${indicator.unit}`}`;

  return {
    indicator,
    approvedValue,
    approvedDisplay,
    draftOrPendingValue,
    hasPendingDifference,
    isMissing,
    isIncomparable,
    statusNote,
    numeratorSum,
    denominatorSum,
    uniqueParticipantCount,
    contributingActivityRecords,
    contributingMeasurementRecords: approvedMeas,
    sourceRefs: Array.from(sourceSet),
    periodTargetDisplay,
    periodTargetNumeric,
    finalTargetDisplay,
    achievementPct,
  };
}

export function buildReportPayload(params: {
  project: ProjectEntity;
  planVersion: ApprovedPlanVersion;
  periodId: string;
  templateName: string;
  includedSections: string[];
  breakdownDimension: string;
  allActivityRecords: ActivityRecord[];
  allMeasurementRecords: MeasurementRecord[];
  learningItems: LearningItem[];
  issuedBy: string;
}): Omit<IssuedReport, 'id' | 'issuedAt'> {
  const {
    project,
    planVersion,
    periodId,
    templateName,
    includedSections,
    breakdownDimension,
    allActivityRecords,
    allMeasurementRecords,
    learningItems,
    issuedBy,
  } = params;
  const plan = planVersion.plan;
  const periodObj = plan.reportingRules.periods.find((p) => p.id === periodId);
  const periodLabel = periodId === 'all' ? 'All Reporting Periods (Cumulative)' : periodObj?.label || periodId;

  const approvedActs = getEffectiveApprovedActivityRecords(allActivityRecords, project.id).filter(
    (r) => periodId === 'all' || r.periodId === periodId
  );
  const approvedMeas = getEffectiveApprovedMeasurementRecords(allMeasurementRecords, project.id).filter(
    (r) => periodId === 'all' || r.periodId === periodId
  );

  // Activity planned vs delivered (strictly period-consistent, unit-consistent, and explicit missing-vs-zero)
  const activityRows: ReportActivityRow[] = plan.activities.map((act: ActivityDefinition) => {
    const matching = approvedActs.filter((r) => r.activityId === act.id);
    const countingMode = act.deliveryCountingMode || 'sum_question';

    // Period-consistent planned quantity
    let planned: number | null = null;
    if (periodId === 'all') {
      if (act.periodPlannedQuantities && Object.keys(act.periodPlannedQuantities).length > 0) {
        planned = Object.values(act.periodPlannedQuantities).reduce((s, n) => s + n, 0);
      } else {
        planned = act.expectedQuantity;
      }
    } else if (act.periodPlannedQuantities) {
      planned =
        act.periodPlannedQuantities[periodId] !== undefined
          ? act.periodPlannedQuantities[periodId]
          : null;
    } else {
      planned = act.periodId === periodId ? act.expectedQuantity : null;
    }

    const plannedPeriodLabel =
      plan.reportingRules.periods.find((p) => p.id === act.periodId)?.label || act.periodId;
    const plannedDisplay =
      planned !== null ? `${planned} ${act.unit}` : 'Not planned in period';

    let delivered: number | null = null;
    let deliveredDisplay = 'Missing quantity';
    let missingQuantityRecordCount = 0;
    let statusNote = '';

    if (countingMode === 'count_events') {
      delivered = matching.length;
      deliveredDisplay = `${delivered} ${act.unit}`;
      statusNote =
        planned === null
          ? `Event count (${matching.length} approved record(s)); activity scheduled for ${plannedPeriodLabel}.`
          : `Event count: ${matching.length} approved record(s) (explicitly configured to count events).`;
    } else {
      const extractedVals = matching.map((r) => extractActivityMappedValue(r, act.linkedIndicatorId, act));
      const numericVals = extractedVals.filter((v): v is number => v !== null);
      missingQuantityRecordCount = extractedVals.length - numericVals.length;

      if (matching.length === 0) {
        delivered = null;
        deliveredDisplay = 'Missing quantity';
        statusNote =
          planned === null
            ? `Not planned in this period (scheduled for ${plannedPeriodLabel}); no approved records.`
            : `No approved records in this period yet (missing quantity, distinct from 0 ${act.unit}).`;
      } else if (numericVals.length === 0) {
        delivered = null;
        deliveredDisplay = 'Missing quantity';
        statusNote = `${missingQuantityRecordCount} approved record(s) missing numeric quantity in ${act.unit} (not counted as 0 or 1).`;
      } else {
        delivered = Number(numericVals.reduce((acc, v) => acc + v, 0).toFixed(2));
        deliveredDisplay = `${delivered} ${act.unit}`;
        statusNote =
          missingQuantityRecordCount > 0
            ? `Summed ${numericVals.length} record(s) in ${act.unit}; ${missingQuantityRecordCount} approved record(s) missing quantity excluded.`
            : `Sum of ${numericVals.length} approved record(s) in ${act.unit}.`;
      }
    }

    const missingEvidenceCount = matching.filter(
      (r) => r.evidenceRequirementSnapshot.required && r.evidence.length === 0
    ).length;

    return {
      activityId: act.id,
      code: act.code,
      name: act.name,
      planned,
      plannedDisplay,
      delivered,
      deliveredDisplay,
      unit: act.unit,
      deliveryCountingMode: countingMode,
      recordCount: matching.length,
      missingQuantityRecordCount,
      missingEvidenceCount,
      statusNote,
    };
  });

  // Indicator tracker
  const indicatorRows: ReportIndicatorRow[] = plan.indicators.map((ind) => {
    const calc = calculateIndicatorSummary(
      plan,
      ind,
      project.id,
      allActivityRecords,
      allMeasurementRecords,
      periodId,
      'all'
    );
    const baselineDisplay =
      ind.baseline.status === 'missing'
        ? 'Missing'
        : ind.baseline.status === 'not_applicable'
        ? 'N/A'
        : `${ind.baseline.value}${ind.unit === '%' ? '%' : ` ${ind.unit}`}`;

    return {
      indicatorId: ind.id,
      code: ind.code,
      name: ind.name,
      unit: ind.unit,
      frameworkLevel: ind.frameworkLevel,
      aggregationRule: ind.aggregationRule,
      baselineDisplay,
      periodTargetDisplay: calc.periodTargetDisplay,
      finalTargetDisplay: calc.finalTargetDisplay,
      actualValue: calc.approvedValue,
      actualDisplay: calc.approvedDisplay,
      achievementPct: calc.achievementPct,
      statusNote: calc.statusNote,
      isMissing: calc.isMissing,
      isIncomparable: calc.isIncomparable,
      contributingCount: calc.contributingActivityRecords.length + calc.contributingMeasurementRecords.length,
      numeratorSum: calc.numeratorSum,
      denominatorSum: calc.denominatorSum,
      sourceRefs: calc.sourceRefs,
    };
  });

  // Site breakdowns
  const siteBreakdownRows = plan.sites.map((site) => ({
    siteName: site.name,
    activityRecords: approvedActs.filter((r) => r.siteId === site.id).length,
    measurementRecords: approvedMeas.filter((r) => r.siteId === site.id).length,
  }));

  // Evidence gaps & quality notes
  const evidenceGaps: string[] = [];
  plan.sourceDocuments
    .filter((d) => !d.available)
    .forEach((d) => evidenceGaps.push(`Unavailable source document: ${d.title} (${d.reference})`));

  const projectUnapprovedMissingEv = [
    ...allActivityRecords.filter((r) => r.projectId === project.id && r.status !== 'approved' && r.evidenceRequirementSnapshot.required && r.evidence.length === 0),
    ...allMeasurementRecords.filter((r) => r.projectId === project.id && r.status !== 'approved' && r.evidenceRequirementSnapshot.required && r.evidence.length === 0),
  ];
  if (projectUnapprovedMissingEv.length > 0) {
    evidenceGaps.push(
      `${projectUnapprovedMissingEv.length} pending/unapproved record(s) are currently flagged for missing required evidence and excluded from this report.`
    );
  }
  indicatorRows
    .filter((r) => r.isMissing || r.isIncomparable)
    .forEach((r) => evidenceGaps.push(`${r.code} (${r.name}): ${r.statusNote}`));

  const dataQualityNotes: string[] = [];
  const pendingRevs =
    allActivityRecords.filter((r) => r.projectId === project.id && r.status !== 'approved').length +
    allMeasurementRecords.filter((r) => r.projectId === project.id && r.status !== 'approved').length;
  if (pendingRevs > 0) {
    dataQualityNotes.push(
      `${pendingRevs} draft, submitted, returned, or verified record(s) were intentionally excluded; this report uses Approved revisions only.`
    );
  }
  dataQualityNotes.push(`Plan version applied: ${planVersion.versionLabel} (${planVersion.changeNote}).`);

  const sourceRefSet = new Set<string>();
  plan.sourceDocuments.forEach((d) =>
    sourceRefSet.add(`${d.title} [${d.version}] — ${d.reference}${d.available ? '' : ' (Not supplied)'}`)
  );
  approvedActs.forEach((r) =>
    r.evidence.forEach((e) => sourceRefSet.add(e.sourceRefText || e.name))
  );
  approvedMeas.forEach((r) => {
    if (r.studyMetadata?.sourceCitation) sourceRefSet.add(r.studyMetadata.sourceCitation);
    r.evidence.forEach((e) => sourceRefSet.add(e.sourceRefText || e.name));
  });
  indicatorRows.forEach((r) => r.sourceRefs.forEach((s) => sourceRefSet.add(s)));

  const projectLearn = learningItems.filter((l) => l.projectId === project.id);
  const narrative =
    projectLearn.length > 0
      ? projectLearn
          .map(
            (l) =>
              `• ${l.title} (${l.isIndependentEvaluation ? 'Independent Evaluation' : l.kind}): ${l.summary}${
                l.recommendation ? ` Recommendation: ${l.recommendation}` : ''
              }`
          )
          .join('\n')
      : `Approved activities and indicators for ${project.name} (${periodLabel}) have been compiled from ${approvedActs.length} approved activity record(s) and ${approvedMeas.length} approved measurement record(s).`;

  const recordRevisionsUsed = [
    ...approvedActs.map((r) => ({
      recordId: r.id,
      recordType: 'activity' as const,
      label: `${r.activityNameSnapshot} (${r.date}, ${r.siteNameSnapshot})`,
      revision: r.revision,
      evidenceRefs: r.evidence.map((e) => e.sourceRefText || e.name),
    })),
    ...approvedMeas.map((r) => ({
      recordId: r.id,
      recordType: 'measurement' as const,
      label: `${r.indicatorCodeSnapshot} (${r.observationDate}, ${r.siteNameSnapshot})`,
      revision: r.revision,
      evidenceRefs: r.evidence.map((e) => e.sourceRefText || e.name),
    })),
  ];

  return {
    projectId: project.id,
    projectNameSnapshot: project.name,
    title: `${project.shortName} — ${templateName} (${periodLabel})`,
    templateName,
    periodId,
    periodLabel,
    issuedBy,
    planVersionId: planVersion.id,
    planVersionLabel: planVersion.versionLabel,
    includedSections,
    breakdownDimension,
    activityRows,
    indicatorRows,
    siteBreakdownRows,
    evidenceGaps,
    dataQualityNotes,
    sourceReferences: Array.from(sourceRefSet),
    narrative,
    recordRevisionsUsed,
  };
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  return { headers: splitLine(lines[0]), rows: lines.slice(1).map(splitLine) };
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatRecordStatus(status: RecordStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'verified':
      return 'Verified';
    case 'approved':
      return 'Approved';
    case 'returned':
      return 'Returned for correction';
  }
}

export function formatProvenanceKind(kind: ProvenanceKind): string {
  switch (kind) {
    case 'historical_sourced':
      return 'Historical (Sourced)';
    case 'reconstructed_endline':
      return 'Reconstructed (Endline)';
    case 'synthetic_demo':
      return 'Synthetic (Demo)';
  }
}
