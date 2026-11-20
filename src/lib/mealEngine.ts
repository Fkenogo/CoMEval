import {
  ApprovalStatus,
  CorrectiveAction,
  EvaluationQuestion,
  FilterState,
  HandoverSnapshot,
  Indicator,
  MealState,
  ProjectDocument,
  ProjectId,
  ResultObservation,
  UserRole,
  WorkplanActivity,
} from '../types/meal';

export interface RoleMeta {
  id: UserRole;
  label: string;
  shortLabel: string;
  actorName: string;
  summary: string;
  canApproveCommitments: boolean;
  canEditWorkplan: boolean;
  canSubmitData: boolean;
  canApproveResults: boolean;
  canVerifyIndependently: boolean;
  canEditSettings: boolean;
  isReadOnly: boolean;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleMeta> = {
  programme_manager: {
    id: 'programme_manager',
    label: 'Programme Manager',
    shortLabel: 'Manager',
    actorName: 'Grace Akello (Programme Manager)',
    summary: 'Approves commitments, manages workplan departures, oversees deadlines, and issues reports & handovers.',
    canApproveCommitments: true,
    canEditWorkplan: true,
    canSubmitData: true,
    canApproveResults: false,
    canVerifyIndependently: false,
    canEditSettings: true,
    isReadOnly: false,
  },
  implementing_partner: {
    id: 'implementing_partner',
    label: 'Implementing Partner',
    shortLabel: 'Partner',
    actorName: 'Moses Etyang (Implementing Partner)',
    summary: 'Captures field delivery, logs issues, updates registers, imports CSVs, submits periods, and provides closure evidence.',
    canApproveCommitments: false,
    canEditWorkplan: false,
    canSubmitData: true,
    canApproveResults: false,
    canVerifyIndependently: false,
    canEditSettings: false,
    isReadOnly: false,
  },
  me_reviewer: {
    id: 'me_reviewer',
    label: 'M&E Reviewer',
    shortLabel: 'M&E Reviewer',
    actorName: 'David Okello (M&E Reviewer)',
    summary: 'Runs recurring data-quality checks, returns or approves submissions, verifies corrective actions, and logs post-approval corrections.',
    canApproveCommitments: true,
    canEditWorkplan: true,
    canSubmitData: false,
    canApproveResults: true,
    canVerifyIndependently: false,
    canEditSettings: true,
    isReadOnly: false,
  },
  independent_evaluator: {
    id: 'independent_evaluator',
    label: 'Independent Evaluator',
    shortLabel: 'Evaluator',
    actorName: 'Dr. Miriam Nansubuga (Independent Evaluator)',
    summary: 'Traces claims to source files, adds independent notes & discrepancy flags without mutating partner records, and manages the Evaluation Plan.',
    canApproveCommitments: false,
    canEditWorkplan: false,
    canSubmitData: false,
    canApproveResults: false,
    canVerifyIndependently: true,
    canEditSettings: false,
    isReadOnly: false,
  },
  funder: {
    id: 'funder',
    label: 'Funder',
    shortLabel: 'Funder',
    actorName: 'BMZ / Donor Desk Officer',
    summary: 'Read-only oversight of approved results, source citations, evidence confidence, and exportable donor reports.',
    canApproveCommitments: false,
    canEditWorkplan: false,
    canSubmitData: false,
    canApproveResults: false,
    canVerifyIndependently: false,
    canEditSettings: false,
    isReadOnly: true,
  },
};

export interface CalculatedIndicatorState {
  indicator: Indicator;
  approvedValue: number | null;
  draftPreviewValue: number | null;
  hasDraftDifference: boolean;
  latestApprovedObs?: ResultObservation;
  latestAnyObs?: ResultObservation;
  registerApprovedCount?: number;
  registerDraftCount?: number;
  formulaInputsLabel?: string;
  progressPct: number | null;
  warningFlags: string[];
}

export function computeIndicatorState(
  state: MealState,
  indicator: Indicator,
  filters?: Partial<FilterState>,
  cumulativeMode = false
): CalculatedIndicatorState {
  const obsList = state.observations.filter((o) => {
    if (o.projectId !== indicator.projectId || o.indicatorId !== indicator.id) return false;
    if (filters?.period && filters.period !== 'all' && o.period !== filters.period) return false;
    if (filters?.partner && filters.partner !== 'all' && o.partner !== filters.partner) return false;
    if (filters?.location && filters.location !== 'all' && o.location !== filters.location) return false;
    if (filters?.sector && filters.sector !== 'all' && o.sector !== filters.sector) return false;
    return true;
  });

  const sortedObs = [...obsList].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const approvedObs = sortedObs.filter((o) => o.approvalStatus === 'approved' && o.reportedValue !== null);
  const latestApprovedObs = approvedObs[0];
  const latestAnyObs = sortedObs[0];
  const warningFlags: string[] = [];

  for (const o of sortedObs) {
    if (o.conflictWarning) warningFlags.push(o.conflictWarning);
    if (o.periodMismatchWarning) warningFlags.push(o.periodMismatchWarning);
    if (!o.sourceCitation.originalAvailable) warningFlags.push(`Original source unavailable: ${o.sourceCitation.documentName}`);
    if (indicator.unit === '%' && (o.denominator === null || o.denominator === undefined) && o.reportedValue !== null) {
      warningFlags.push(`Missing denominator (n) for percentage observation in ${o.period}.`);
    }
  }

  let approvedValue: number | null = null;
  let draftPreviewValue: number | null = null;
  let registerApprovedCount: number | undefined;
  let registerDraftCount: number | undefined;
  let formulaInputsLabel: string | undefined;

  if (indicator.calculationMethod === 'register_aggregate' && indicator.linkedRegisterId) {
    const regDef = state.registers.find((r) => r.id === indicator.linkedRegisterId);
    const matchingRows = state.registerRows.filter((r) => {
      if (r.registerId !== indicator.linkedRegisterId) return false;
      if (filters?.period && filters.period !== 'all' && r.period !== filters.period) return false;
      if (filters?.partner && filters.partner !== 'all' && r.partner !== filters.partner) return false;
      if (filters?.location && filters.location !== 'all' && r.location !== filters.location) return false;
      return true;
    });

    const sumRows = (rows: typeof matchingRows) => {
      if (!regDef || regDef.aggregationRule === 'count_rows') return rows.length;
      return rows.reduce((acc, row) => acc + Number(row.values[regDef.sumField || ''] || 0), 0);
    };

    const approvedRows = matchingRows.filter((r) => r.approvalStatus === 'approved');
    registerApprovedCount = sumRows(approvedRows);
    registerDraftCount = sumRows(matchingRows);

    // Preserve reported observation value if approved directly (e.g. post-approval correction), else roll-up from approved register rows
    if (latestApprovedObs && latestApprovedObs.reportedValue !== null && (!filters || (filters.partner === 'all' && filters.location === 'all'))) {
      approvedValue = latestApprovedObs.reportedValue;
    } else {
      approvedValue = registerApprovedCount;
    }

    // Draft preview includes draft/submitted register rows + any draft/submitted observation
    const pendingDraftRows = matchingRows.filter((r) => r.approvalStatus !== 'approved');
    if (pendingDraftRows.length > 0) {
      draftPreviewValue = (approvedValue ?? 0) + sumRows(pendingDraftRows);
    } else if (latestAnyObs && latestAnyObs.approvalStatus !== 'approved' && latestAnyObs.reportedValue !== null) {
      draftPreviewValue = latestAnyObs.reportedValue;
    } else {
      draftPreviewValue = approvedValue;
    }

    const missingContracts = matchingRows.filter((r) => r.values.contractOnFile === 'Missing').length;
    if (missingContracts > 0) {
      warningFlags.push(`${missingContracts} register row(s) missing signed primary contract on file.`);
    }
  } else if (indicator.calculationMethod === 'formula' && indicator.formula) {
    const numInd = state.indicators.find((i) => i.id === indicator.formula!.numeratorIndicatorId);
    if (numInd) {
      const numCalc = computeIndicatorState(state, numInd, filters, cumulativeMode);
      const denomConst = indicator.formula.denominatorConstant;
      const denomInd = indicator.formula.denominatorIndicatorId
        ? state.indicators.find((i) => i.id === indicator.formula!.denominatorIndicatorId)
        : undefined;
      const denomCalc = denomInd ? computeIndicatorState(state, denomInd, filters, cumulativeMode) : undefined;
      const denomVal = denomConst ?? denomCalc?.approvedValue ?? null;

      if (!denomVal || denomVal === 0) {
        warningFlags.push('Formula denominator is missing or zero.');
      } else {
        if (numCalc.approvedValue !== null) {
          approvedValue = Number(((numCalc.approvedValue / denomVal) * 100).toFixed(1));
        }
        if (numCalc.draftPreviewValue !== null) {
          draftPreviewValue = Number(((numCalc.draftPreviewValue / denomVal) * 100).toFixed(1));
        }
        formulaInputsLabel = `${numCalc.approvedValue ?? '—'} ÷ ${denomVal} × 100 (Draft preview: ${numCalc.draftPreviewValue ?? '—'} ÷ ${denomVal})`;
      }
    }
  } else {
    // Direct entry
    if (cumulativeMode && indicator.permitsCumulative) {
      approvedValue = approvedObs.length > 0 ? approvedObs.reduce((s, o) => s + (o.reportedValue ?? 0), 0) : null;
      const allWithVal = sortedObs.filter((o) => o.reportedValue !== null);
      draftPreviewValue = allWithVal.length > 0 ? allWithVal.reduce((s, o) => s + (o.reportedValue ?? 0), 0) : null;
    } else {
      approvedValue = latestApprovedObs?.reportedValue ?? null;
      draftPreviewValue = latestAnyObs?.reportedValue ?? approvedValue;
    }
  }

  const hasDraftDifference =
    draftPreviewValue !== null && approvedValue !== null
      ? Math.abs(draftPreviewValue - approvedValue) > 0.001
      : draftPreviewValue !== approvedValue;

  let progressPct: number | null = null;
  if (approvedValue !== null && indicator.target && indicator.target > 0) {
    progressPct = Math.min(150, Math.round((approvedValue / indicator.target) * 100));
  }

  return {
    indicator,
    approvedValue,
    draftPreviewValue,
    hasDraftDifference,
    latestApprovedObs,
    latestAnyObs,
    registerApprovedCount,
    registerDraftCount,
    formulaInputsLabel,
    progressPct,
    warningFlags: Array.from(new Set(warningFlags)),
  };
}

export interface AutoQualityCheck {
  id: string;
  projectId: ProjectId;
  category:
    | 'Overdue Activity'
    | 'Missing Evidence'
    | 'Conflicting Figures'
    | 'Plan Departure'
    | 'Denominator / Period Issue'
    | 'Pending Submission';
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  linkedActivityId?: string;
  linkedIndicatorId?: string;
  linkedObservationId?: string;
  hasLinkedAction: boolean;
}

export function scanRecurringChecks(state: MealState, projectId: ProjectId): AutoQualityCheck[] {
  const checks: AutoQualityCheck[] = [];
  const actions = state.correctiveActions.filter((a) => a.projectId === projectId);

  // 1. Overdue & Plan Departure activities
  for (const act of state.activities.filter((a) => a.projectId === projectId)) {
    if (act.status === 'overdue') {
      checks.push({
        id: `chk-ovd-${act.id}`,
        projectId,
        category: 'Overdue Activity',
        severity: 'high',
        title: `${act.code} overdue (${act.actualDelivered}/${act.plannedOutput} ${act.outputUnit})`,
        detail: `${act.title} — Current due date ${act.currentDueDate} (${act.ownerPartner}).`,
        linkedActivityId: act.id,
        linkedIndicatorId: act.linkedIndicatorId,
        hasLinkedAction: actions.some((a) => a.linkedActivityId === act.id && a.status !== 'closed'),
      });
    }
    if (act.plannedDueDate !== act.currentDueDate || act.changeLog.length > 0) {
      checks.push({
        id: `chk-dep-${act.id}`,
        projectId,
        category: 'Plan Departure',
        severity: 'medium',
        title: `Schedule/plan departure on ${act.code}`,
        detail: `Planned ${act.plannedDueDate} → Revised ${act.currentDueDate}. Latest reason: ${act.changeLog[act.changeLog.length - 1]?.reason || 'Schedule updated'}`,
        linkedActivityId: act.id,
        linkedIndicatorId: act.linkedIndicatorId,
        hasLinkedAction: actions.some((a) => a.linkedActivityId === act.id && a.status !== 'closed'),
      });
    }
    const missingReqEvidence = act.evidenceRequirements.length > act.attachedEvidenceIds.length;
    const unresolvedEvidenceIssue = act.issues.some((i) => !i.resolved && i.category === 'Evidence Gap');
    if (missingReqEvidence || unresolvedEvidenceIssue) {
      checks.push({
        id: `chk-ev-${act.id}`,
        projectId,
        category: 'Missing Evidence',
        severity: 'high',
        title: `Missing required evidence on ${act.code}`,
        detail: `${act.attachedEvidenceIds.length} of ${act.evidenceRequirements.length} required evidence items linked (${act.evidenceRequirements.join(', ')}).`,
        linkedActivityId: act.id,
        linkedIndicatorId: act.linkedIndicatorId,
        hasLinkedAction: actions.some((a) => a.linkedActivityId === act.id && a.category === 'Missing Evidence' && a.status !== 'closed'),
      });
    }
  }

  // 2. Delivery records missing evidence
  for (const del of state.deliveryRecords.filter((d) => d.projectId === projectId && d.evidenceMissing)) {
    const act = state.activities.find((a) => a.id === del.activityId);
    checks.push({
      id: `chk-del-${del.id}`,
      projectId,
      category: 'Missing Evidence',
      severity: 'high',
      title: `Delivery log missing source proof (${act?.code || del.activityId})`,
      detail: `${del.partner} logged ${del.quantityDelivered} ${del.unit} on ${del.date} without primary contract/evidence attachment.`,
      linkedActivityId: del.activityId,
      linkedIndicatorId: del.indicatorId,
      hasLinkedAction: actions.some((a) => a.linkedActivityId === del.activityId && a.status !== 'closed'),
    });
  }

  // 3. Observation quality checks (pending submissions, conflicts, period/denominator issues, duplicates)
  const obsList = state.observations.filter((o) => o.projectId === projectId);
  const seenKeys = new Map<string, number>();
  for (const obs of obsList) {
    const ind = state.indicators.find((i) => i.id === obs.indicatorId);
    const dupKey = `${obs.indicatorId}::${obs.period}::${obs.partner}::${obs.location}`;
    seenKeys.set(dupKey, (seenKeys.get(dupKey) || 0) + 1);

    if (obs.approvalStatus === 'submitted') {
      checks.push({
        id: `chk-sub-${obs.id}`,
        projectId,
        category: 'Pending Submission',
        severity: 'medium',
        title: `Submitted figure awaiting review: ${ind?.code || obs.indicatorId} (${obs.period})`,
        detail: `Reported ${obs.reportedValue ?? 'Missing'} ${obs.unit || ind?.unit || ''} by ${obs.partner} — source: ${obs.sourceCitation.documentName}.`,
        linkedIndicatorId: obs.indicatorId,
        linkedObservationId: obs.id,
        hasLinkedAction: actions.some((a) => a.linkedObservationId === obs.id && a.status !== 'closed'),
      });
    }

    if (obs.conflictWarning) {
      checks.push({
        id: `chk-conf-${obs.id}`,
        projectId,
        category: 'Conflicting Figures',
        severity: 'high',
        title: `Conflicting figure flagged on ${ind?.code || obs.indicatorId}`,
        detail: obs.conflictWarning,
        linkedIndicatorId: obs.indicatorId,
        linkedObservationId: obs.id,
        hasLinkedAction: actions.some((a) => a.linkedObservationId === obs.id && a.status !== 'closed'),
      });
    }

    if (obs.periodMismatchWarning || (ind?.unit === '%' && obs.reportedValue !== null && !obs.denominator)) {
      checks.push({
        id: `chk-den-${obs.id}`,
        projectId,
        category: 'Denominator / Period Issue',
        severity: 'medium',
        title: `Period or denominator warning on ${ind?.code || obs.indicatorId}`,
        detail:
          obs.periodMismatchWarning ||
          `Percentage observation (${obs.reportedValue}%) in ${obs.period} is missing a verified denominator (n).`,
        linkedIndicatorId: obs.indicatorId,
        linkedObservationId: obs.id,
        hasLinkedAction: actions.some((a) => a.linkedObservationId === obs.id && a.status !== 'closed'),
      });
    }
  }

  for (const [k, count] of seenKeys.entries()) {
    if (count > 1) {
      const [indId, period] = k.split('::');
      const ind = state.indicators.find((i) => i.id === indId);
      checks.push({
        id: `chk-dup-${k}`,
        projectId,
        category: 'Conflicting Figures',
        severity: 'high',
        title: `Duplicate records detected for ${ind?.code || indId} (${period})`,
        detail: `${count} observations share the same indicator, period, partner, and location.`,
        linkedIndicatorId: indId,
        hasLinkedAction: false,
      });
    }
  }

  return checks;
}

export interface HandoverDiffItem {
  indicatorId: string;
  code: string;
  title: string;
  unit: string;
  period: string;
  frozenValue: number | null;
  liveApprovedValue: number | null;
  changed: boolean;
  latestCorrectionReason?: string;
  correctedBy?: string;
  correctedAt?: string;
  snapshotSourceRef: string;
}

export function computeHandoverDiff(state: MealState, snapshot: HandoverSnapshot): HandoverDiffItem[] {
  return snapshot.approvedIndicators.map((snapInd) => {
    const liveObs = state.observations.find((o) => o.id === snapInd.observationId);
    const liveInd = state.indicators.find((i) => i.id === snapInd.indicatorId);
    const liveCalc = liveInd ? computeIndicatorState(state, liveInd) : null;
    const liveVal = liveObs?.approvalStatus === 'approved' ? liveObs.reportedValue : liveCalc?.approvedValue ?? null;
    const changed = snapInd.approvedValue !== liveVal;
    const lastRev = liveObs?.revisionHistory?.[liveObs.revisionHistory.length - 1];
    return {
      indicatorId: snapInd.indicatorId,
      code: snapInd.code,
      title: snapInd.title,
      unit: snapInd.unit,
      period: snapInd.period,
      frozenValue: snapInd.approvedValue,
      liveApprovedValue: liveVal,
      changed,
      latestCorrectionReason: changed ? lastRev?.reason : undefined,
      correctedBy: changed ? lastRev?.changedBy : undefined,
      correctedAt: changed ? lastRev?.date : undefined,
      snapshotSourceRef: snapInd.sourceRef,
    };
  });
}

export interface KnowledgeGraphResult {
  title: string;
  subtitle: string;
  documents: ProjectDocument[];
  commitments: MealState['commitments'];
  activities: WorkplanActivity[];
  observations: ResultObservation[];
  surveyResults: MealState['surveyResults'];
  learningEntries: MealState['learningEntries'];
  actions: CorrectiveAction[];
  questions: EvaluationQuestion[];
}

export function resolveKnowledgeGraph(
  state: MealState,
  targetType: 'indicator' | 'activity' | 'question' | 'document',
  targetId: string
): KnowledgeGraphResult {
  const pid = state.activeProjectId;
  const indIds = new Set<string>();
  const actIds = new Set<string>();
  const docIds = new Set<string>();
  const qIds = new Set<string>();
  let title = '';
  let subtitle = '';

  if (targetType === 'indicator') {
    const ind = state.indicators.find((i) => i.id === targetId);
    title = ind ? `${ind.code} — ${ind.title}` : targetId;
    subtitle = ind ? `${ind.sector} · ${ind.reportingLevel} · ${ind.calculationMethod}` : '';
    indIds.add(targetId);
  } else if (targetType === 'activity') {
    const act = state.activities.find((a) => a.id === targetId);
    title = act ? `${act.code} — ${act.title}` : targetId;
    subtitle = act ? `${act.sector} · ${act.ownerPartner} · Due ${act.currentDueDate}` : '';
    actIds.add(targetId);
    if (act?.linkedIndicatorId) indIds.add(act.linkedIndicatorId);
    act?.attachedEvidenceIds.forEach((d) => docIds.add(d));
  } else if (targetType === 'question') {
    const q = state.evaluationQuestions.find((x) => x.id === targetId);
    title = q ? `${q.code} — ${q.question}` : targetId;
    subtitle = q ? `${q.criterion} · ${q.sector} · ${q.readiness.replace(/_/g, ' ')}` : '';
    qIds.add(targetId);
    q?.linkedIndicatorIds.forEach((i) => indIds.add(i));
    q?.linkedDocumentIds.forEach((d) => docIds.add(d));
  } else if (targetType === 'document') {
    const d = state.documents.find((x) => x.id === targetId);
    title = d ? d.title : targetId;
    subtitle = d ? `${d.fileName} · ${d.version}` : '';
    docIds.add(targetId);
    d?.linkedIndicatorIds.forEach((i) => indIds.add(i));
    d?.linkedActivityIds.forEach((a) => actIds.add(a));
    d?.linkedQuestionIds.forEach((q) => qIds.add(q));
  }

  // Expand 1 hop across commitments, activities, observations, docs
  const activities = state.activities.filter(
    (a) =>
      a.projectId === pid &&
      (actIds.has(a.id) || (a.linkedIndicatorId && indIds.has(a.linkedIndicatorId)))
  );
  activities.forEach((a) => {
    actIds.add(a.id);
    if (a.linkedIndicatorId) indIds.add(a.linkedIndicatorId);
    a.attachedEvidenceIds.forEach((d) => docIds.add(d));
  });

  const commitments = state.commitments.filter(
    (c) =>
      c.projectId === pid &&
      (activities.some((a) => a.commitmentId === c.id) ||
        (c.linkedIndicatorId && indIds.has(c.linkedIndicatorId)) ||
        docIds.has(c.sourceCitation.documentId))
  );
  commitments.forEach((c) => docIds.add(c.sourceCitation.documentId));

  const observations = state.observations.filter(
    (o) => o.projectId === pid && (indIds.has(o.indicatorId) || docIds.has(o.sourceCitation.documentId))
  );
  observations.forEach((o) => {
    docIds.add(o.sourceCitation.documentId);
    indIds.add(o.indicatorId);
  });

  const surveyResults = state.surveyResults.filter(
    (s) => s.projectId === pid && indIds.has(s.indicatorId)
  );
  surveyResults.forEach((s) => docIds.add(s.sourceCitation.documentId));

  const documents = state.documents.filter(
    (d) =>
      d.projectId === pid &&
      (docIds.has(d.id) ||
        d.linkedIndicatorIds.some((i) => indIds.has(i)) ||
        d.linkedActivityIds.some((a) => actIds.has(a)) ||
        d.linkedQuestionIds.some((q) => qIds.has(q)))
  );

  const learningEntries = state.learningEntries.filter(
    (l) =>
      l.projectId === pid &&
      (l.linkedIndicatorIds.some((i) => indIds.has(i)) || l.linkedActivityIds.some((a) => actIds.has(a)))
  );

  const actions = state.correctiveActions.filter(
    (a) =>
      a.projectId === pid &&
      ((a.linkedActivityId && actIds.has(a.linkedActivityId)) ||
        (a.linkedIndicatorId && indIds.has(a.linkedIndicatorId)) ||
        (a.linkedQuestionId && qIds.has(a.linkedQuestionId)))
  );

  const questions = state.evaluationQuestions.filter(
    (q) =>
      q.projectId === pid &&
      (qIds.has(q.id) ||
        q.linkedIndicatorIds.some((i) => indIds.has(i)) ||
        q.linkedDocumentIds.some((d) => docIds.has(d)))
  );

  return {
    title,
    subtitle,
    documents,
    commitments,
    activities,
    observations,
    surveyResults,
    learningEntries,
    actions,
    questions,
  };
}

export interface CitedBrief {
  heading: string;
  whatWasCommitted: string[];
  whatHappened: string[];
  whatEvidenceSupports: string[];
  missingOrConflicting: string[];
  citations: string[];
}

export function generateDeterministicCitedBrief(
  state: MealState,
  targetType: 'indicator' | 'activity' | 'question',
  targetId: string
): CitedBrief {
  const graph = resolveKnowledgeGraph(state, targetType, targetId);
  const citations = new Set<string>();

  const whatWasCommitted = graph.commitments.map((c) => {
    const cit = `[${c.sourceCitation.documentName} · ${c.sourceCitation.sectionOrTab} · ${c.sourceCitation.pageOrRow}]`;
    citations.add(cit);
    return `${c.code} (${c.status}): ${c.title} — Expected: ${c.expectedOutput} ${c.outputUnit}. ${cit}`;
  });

  const whatHappened = graph.activities.map((a) => {
    const pct = a.plannedOutput > 0 ? Math.round((a.actualDelivered / a.plannedOutput) * 100) : 0;
    const departure = a.plannedDueDate !== a.currentDueDate ? ` (Revised due ${a.currentDueDate} from ${a.plannedDueDate})` : '';
    return `${a.code} (${a.status.replace('_', ' ')}): ${a.actualDelivered}/${a.plannedOutput} ${a.outputUnit} (${pct}%) under ${a.ownerPartner}${departure}.`;
  });

  const whatEvidenceSupports: string[] = [];
  const missingOrConflicting: string[] = [];

  for (const o of graph.observations) {
    const ind = state.indicators.find((i) => i.id === o.indicatorId);
    const cit = `[${o.sourceCitation.documentName} · ${o.sourceCitation.sectionOrTab} · ${o.sourceCitation.pageOrRow}]`;
    citations.add(cit);
    if (o.reportedValue !== null) {
      whatEvidenceSupports.push(
        `${ind?.code || o.indicatorId} (${o.period}, ${o.provenance}, ${o.approvalStatus} / ${o.verificationStatus.replace('_', ' ')}): ${o.reportedValue} ${o.unit || ind?.unit || ''}. ${o.narrative} ${cit}`
      );
    } else {
      missingOrConflicting.push(
        `Missing measurement for ${ind?.code || o.indicatorId} in ${o.period}: ${o.narrative} ${cit}`
      );
    }
    if (o.conflictWarning) missingOrConflicting.push(`Conflict (${ind?.code}): ${o.conflictWarning}`);
    if (o.periodMismatchWarning) missingOrConflicting.push(`Period warning (${ind?.code}): ${o.periodMismatchWarning}`);
    if (!o.sourceCitation.originalAvailable) {
      missingOrConflicting.push(`Unavailable primary source: ${o.sourceCitation.documentName}`);
    }
  }

  for (const d of graph.documents) {
    if (!d.originalAvailable) {
      missingOrConflicting.push(`Source gap — ${d.title}: ${d.availabilityNote || d.cannotEstablish}`);
    }
  }

  for (const act of graph.actions.filter((x) => x.status !== 'closed')) {
    missingOrConflicting.push(`Open corrective action (${act.category}, due ${act.dueDate}): ${act.title} [Owner: ${act.owner}]`);
  }

  for (const l of graph.learningEntries) {
    const cit = `[${l.sourceCitation.documentName} · ${l.sourceCitation.pageOrRow}]`;
    citations.add(cit);
    whatEvidenceSupports.push(`Qualitative learning (${l.category}): ${l.title} — ${l.summary} ${cit}`);
  }

  return {
    heading: graph.title,
    whatWasCommitted: whatWasCommitted.length ? whatWasCommitted : ['No formally linked proposal/logframe commitment recorded yet.'],
    whatHappened: whatHappened.length ? whatHappened : ['No linked workplan delivery records logged yet.'],
    whatEvidenceSupports: whatEvidenceSupports.length ? whatEvidenceSupports : ['No approved monitoring or survey observations linked yet.'],
    missingOrConflicting: missingOrConflicting.length ? missingOrConflicting : ['No open evidence gaps, conflicts, or unresolved actions detected.'],
    citations: Array.from(citations),
  };
}

export function parseCsvText(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export function triggerCsvDownload(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escapeCell = (val: string | number | null | undefined) => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatProvenance(p: 'sourced' | 'reconstructed' | 'synthetic'): string {
  if (p === 'sourced') return 'Sourced';
  if (p === 'reconstructed') return 'Reconstructed (Endline)';
  return 'Synthetic (Demo)';
}

export function formatApproval(s: ApprovalStatus): string {
  if (s === 'approved') return 'Approved';
  if (s === 'submitted') return 'Submitted';
  if (s === 'returned') return 'Returned';
  return 'Draft';
}

export function formatVerification(v: ResultObservation['verificationStatus']): string {
  if (v === 'verified') return 'Independently Verified';
  if (v === 'flagged_discrepancy') return 'Discrepancy Flagged';
  if (v === 'fieldwork_required') return 'Fieldwork Needed';
  return 'Unverified';
}
