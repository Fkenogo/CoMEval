import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createInitialMiledgeState, createNewProjectScaffold } from '../data/seedProjects';
import {
  buildReportPayload,
  DEMO_ROLES,
  getActiveApprovedPlanVersion,
  validateActivityRecord,
  validateMeasurementRecord,
} from '../lib/engine';
import {
  ActivityRecord,
  ApprovedPlanVersion,
  AreaId,
  DemoRole,
  EvidenceAttachment,
  IssuedReport,
  LearningItem,
  MeasurementRecord,
  MiledgeState,
  PlanSnapshot,
  ProjectEntity,
  RecordStatus,
  TrackedAction,
} from '../types/miledge';

const STORAGE_KEY = 'miledge_me_shared_engine_v2';

export interface ToastNotice {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'warning' | 'error';
}

export interface PersistenceFailureNotice {
  message: string;
  occurredAt: string;
  simulated: boolean;
}

interface MiledgeContextValue {
  state: MiledgeState;
  activeProject: ProjectEntity;
  activeApprovedPlan: ApprovedPlanVersion | null;
  roleDef: (typeof DEMO_ROLES)[DemoRole];
  toasts: ToastNotice[];
  notify: (message: string, tone?: ToastNotice['tone']) => void;

  // Browser storage resilience & recovery
  persistenceError: PersistenceFailureNotice | null;
  simulateStorageFailure: boolean;
  hasRecoveredFromSaveFailure: boolean;
  setSimulateStorageFailure: (enabled: boolean) => void;
  retrySaveState: () => boolean;
  stripLargeAttachmentsAndSave: () => number;
  exportStateBackupJson: () => void;

  // Navigation & shell controls
  setActiveProject: (projectId: string) => void;
  setActiveArea: (area: AreaId) => void;
  setActiveRole: (role: DemoRole) => void;
  setWalkthroughOpen: (open: boolean) => void;
  setAddProjectModalOpen: (open: boolean) => void;
  resetDemo: () => void;

  // Plan layer mutations
  createProject: (input: {
    name: string;
    shortName: string;
    code: string;
    donor: string;
    implementingLead: string;
    timeframe: string;
    description: string;
  }) => ProjectEntity;
  updateDraftPlan: (projectId: string, updater: (draft: PlanSnapshot) => PlanSnapshot) => void;
  approveDraftPlan: (projectId: string, changeNote: string) => ApprovedPlanVersion | null;

  // Do layer mutations (Activity records)
  saveActivityRecord: (input: {
    existingId?: string;
    activityId: string | null;
    isUnplanned: boolean;
    unplannedTitle?: string;
    date: string;
    periodId: string;
    siteId: string;
    answers: Record<string, string | number | boolean>;
    participantModeUsed: 'none' | 'aggregate' | 'registry';
    participantCount?: number;
    participantIds?: string[];
    notes: string;
    evidence: EvidenceAttachment[];
    submitNow: boolean;
  }) => { ok: boolean; record?: ActivityRecord; error?: string };

  createActivityRevision: (approvedRecordId: string) => ActivityRecord | null;

  // Measure layer mutations (Measurement records)
  saveMeasurementRecord: (input: {
    existingId?: string;
    indicatorId: string;
    observationDate: string;
    periodId: string;
    siteId: string;
    breakdowns: Record<string, string>;
    collectionMethod: string;
    studyMetadata?: MeasurementRecord['studyMetadata'];
    answers: Record<string, string | number | boolean>;
    singleValue?: number | null;
    categoryValue?: string;
    numerator?: number | null;
    denominator?: number | null;
    notes: string;
    evidence: EvidenceAttachment[];
    csvImportRef?: { fileName: string; rowNumber: number };
    submitNow: boolean;
  }) => { ok: boolean; record?: MeasurementRecord; error?: string };

  createMeasurementRevision: (approvedRecordId: string) => MeasurementRecord | null;
  importCsvMeasurements: (
    records: Omit<
      MeasurementRecord,
      'id' | 'recordGroupId' | 'revision' | 'createdAt' | 'updatedAt' | 'decisionHistory'
    >[]
  ) => number;

  // Prove layer mutations (Workflow & evidence attachment on returned records)
  transitionRecordStatus: (
    recordType: 'activity' | 'measurement',
    recordId: string,
    nextStatus: RecordStatus,
    note: string
  ) => { ok: boolean; error?: string };

  attachEvidenceToRecord: (
    recordType: 'activity' | 'measurement',
    recordId: string,
    attachment: EvidenceAttachment
  ) => { ok: boolean; error?: string };

  removeEvidenceFromRecord: (
    recordType: 'activity' | 'measurement',
    recordId: string,
    attachmentId: string
  ) => { ok: boolean; error?: string };

  // Report layer mutations
  issueReport: (params: {
    periodId: string;
    templateName: string;
    includedSections: string[];
    breakdownDimension: string;
    customNarrative?: string;
  }) => IssuedReport | null;

  // Learn layer mutations
  addLearningItem: (item: Omit<LearningItem, 'id' | 'createdAt' | 'createdBy' | 'actions'>) => void;
  updateLearningRecommendation: (itemId: string, recommendation: string) => void;
  addTrackedAction: (itemId: string, action: Omit<TrackedAction, 'id' | 'status'>) => void;
  closeTrackedAction: (
    itemId: string,
    actionId: string,
    closureNote: string,
    closureEvidence?: EvidenceAttachment,
    linkedPlanVersionId?: string
  ) => void;
}

const MiledgeContext = createContext<MiledgeContextValue | null>(null);

function loadState(): MiledgeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MiledgeState;
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length >= 2) {
        return parsed;
      }
    }
  } catch {
    // Fallback cleanly to fresh seed
  }
  return createInitialMiledgeState();
}

export const MiledgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MiledgeState>(loadState);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [persistenceError, setPersistenceError] = useState<PersistenceFailureNotice | null>(null);
  const [simulateStorageFailure, setSimulateStorageFailureState] = useState(false);
  const [hasRecoveredFromSaveFailure, setHasRecoveredFromSaveFailure] = useState(false);

  const nowDate = () => new Date().toISOString().slice(0, 10);
  const nowStamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

  const notify = (message: string, tone: ToastNotice['tone'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const persistSnapshot = (nextState: MiledgeState, forceFail: boolean): boolean => {
    try {
      if (forceFail) {
        throw new DOMException(
          'Simulated browser storage quota exceeded (QuotaExceededError).',
          'QuotaExceededError'
        );
      }
      const serialized = JSON.stringify(nextState);
      localStorage.setItem(STORAGE_KEY, serialized);
      // Verify read-back succeeded
      const verify = localStorage.getItem(STORAGE_KEY);
      if (!verify) {
        throw new Error('Browser storage write could not be read back.');
      }
      setPersistenceError((prev) => {
        if (prev) setHasRecoveredFromSaveFailure(true);
        return null;
      });
      return true;
    } catch (err) {
      const reason =
        err instanceof Error ? `${err.name}: ${err.message}` : 'Browser storage write failed.';
      setPersistenceError({
        message: `${reason} Your latest entry is still preserved in memory — retry saving, strip oversized file blobs, or download a JSON backup before reloading.`,
        occurredAt: nowStamp(),
        simulated: forceFail,
      });
      return false;
    }
  };

  useEffect(() => {
    const ok = persistSnapshot(state, simulateStorageFailure);
    if (!ok) {
      notify(
        'Browser storage save failed — your entry is preserved in memory. Use the recovery bar at the top to retry or export.',
        'error'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const setSimulateStorageFailure = (enabled: boolean) => {
    setSimulateStorageFailureState(enabled);
    if (enabled) {
      notify(
        'Simulated browser storage failure enabled. Next save will fail visibly while keeping your entry recoverable in memory.',
        'warning'
      );
    } else {
      const ok = persistSnapshot(state, false);
      if (ok) {
        notify('Simulated storage failure cleared and current workspace saved to browser storage.', 'success');
      }
    }
  };

  const retrySaveState = (): boolean => {
    if (simulateStorageFailure) {
      setSimulateStorageFailureState(false);
    }
    const ok = persistSnapshot(state, false);
    if (ok) {
      setHasRecoveredFromSaveFailure(true);
      notify('Recovered and saved all in-memory changes to browser storage.', 'success');
    } else {
      notify('Browser storage still cannot save. Try stripping large attachments or downloading a JSON backup.', 'error');
    }
    return ok;
  };

  const stripLargeAttachmentsAndSave = (): number => {
    let stripped = 0;
    const stripList = (list: EvidenceAttachment[]): EvidenceAttachment[] =>
      list.map((att) => {
        if (att.dataUrl && att.dataUrl.length > 80_000) {
          stripped += 1;
          return {
            ...att,
            dataUrl: undefined,
            sourceRefText: `${att.sourceRefText ? `${att.sourceRefText} · ` : ''}File payload trimmed to recover storage quota (${att.name})`,
          };
        }
        return att;
      });

    const trimmed: MiledgeState = {
      ...state,
      activityRecords: state.activityRecords.map((r) => ({ ...r, evidence: stripList(r.evidence) })),
      measurementRecords: state.measurementRecords.map((r) => ({ ...r, evidence: stripList(r.evidence) })),
      learningItems: state.learningItems.map((l) => ({
        ...l,
        actions: l.actions.map((a) =>
          a.closureEvidence?.dataUrl && a.closureEvidence.dataUrl.length > 80_000
            ? {
                ...a,
                closureEvidence: stripList([a.closureEvidence])[0],
              }
            : a
        ),
      })),
    };
    setSimulateStorageFailureState(false);
    setState(trimmed);
    const ok = persistSnapshot(trimmed, false);
    if (ok) {
      setHasRecoveredFromSaveFailure(true);
      notify(
        stripped > 0
          ? `Preserved all records & source references while stripping ${stripped} large file blob(s). Workspace saved.`
          : 'Workspace saved to browser storage.',
        'success'
      );
    }
    return stripped;
  };

  const exportStateBackupJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miledge_me_backup_${nowDate()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Downloaded JSON backup of your current in-memory workspace.', 'info');
  };

  const activeProject =
    state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0];
  const activeApprovedPlan = getActiveApprovedPlanVersion(activeProject);
  const roleDef = DEMO_ROLES[state.activeRole];

  const value = useMemo<MiledgeContextValue>(
    () => ({
      state,
      activeProject,
      activeApprovedPlan,
      roleDef,
      toasts,
      notify,
      persistenceError,
      simulateStorageFailure,
      hasRecoveredFromSaveFailure,
      setSimulateStorageFailure,
      retrySaveState,
      stripLargeAttachmentsAndSave,
      exportStateBackupJson,

      setActiveProject: (projectId) => {
        setState((prev) => ({ ...prev, activeProjectId: projectId }));
      },
      setActiveArea: (area) => {
        setState((prev) => ({ ...prev, activeArea: area }));
      },
      setActiveRole: (role) => {
        setState((prev) => ({ ...prev, activeRole: role }));
        notify(`Switched demo role to ${DEMO_ROLES[role].label}`, 'info');
      },
      setWalkthroughOpen: (open) => {
        setState((prev) => ({ ...prev, walkthroughOpen: open }));
      },
      setAddProjectModalOpen: (open) => {
        setState((prev) => ({ ...prev, addProjectModalOpen: open }));
      },
      resetDemo: () => {
        const fresh = createInitialMiledgeState();
        setState(fresh);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        notify('Demo workspace reset to seeded ChildFund and Omugo data.', 'info');
      },

      createProject: (input) => {
        const created = createNewProjectScaffold(input);
        setState((prev) => ({
          ...prev,
          projects: [...prev.projects, created],
          activeProjectId: created.id,
          activeArea: 'plan',
          addProjectModalOpen: false,
        }));
        notify(`Created "${created.name}". Add sites, activities, questions, and indicators, then approve Plan v1.0.`);
        return created;
      },

      updateDraftPlan: (projectId, updater) => {
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((p) =>
            p.id === projectId ? { ...p, draftPlan: updater(structuredClone(p.draftPlan)) } : p
          ),
        }));
      },

      approveDraftPlan: (projectId, changeNote) => {
        const targetProj = state.projects.find((p) => p.id === projectId);
        if (!targetProj) return null;
        const nextNum = targetProj.planVersions.length + 1;
        const newVersion: ApprovedPlanVersion = {
          id: `${projectId}-plan-v${nextNum}-${Date.now()}`,
          versionNumber: nextNum,
          versionLabel: `v${nextNum}.0`,
          approvedAt: nowStamp(),
          approvedBy: DEMO_ROLES[state.activeRole].actorName,
          changeNote: changeNote.trim() || `Approved plan configuration v${nextNum}.0`,
          plan: structuredClone(targetProj.draftPlan),
        };
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  activePlanVersionId: newVersion.id,
                  planVersions: [...p.planVersions, newVersion],
                }
              : p
          ),
        }));
        notify(`Approved Plan ${newVersion.versionLabel} for ${targetProj.shortName}. New Do and Measure records will now use it.`);
        return newVersion;
      },

      saveActivityRecord: (input) => {
        const approvedPlan = getActiveApprovedPlanVersion(activeProject);
        if (!approvedPlan) {
          notify('Approve a Plan version in Plan before recording activities.', 'warning');
          return { ok: false, error: 'No approved plan version active.' };
        }
        const plan = approvedPlan.plan;
        const actDef = input.activityId
          ? plan.activities.find((a) => a.id === input.activityId)
          : undefined;
        const siteObj = plan.sites.find((s) => s.id === input.siteId);
        const existing = input.existingId
          ? state.activityRecords.find((r) => r.id === input.existingId)
          : undefined;

        if (existing && existing.status === 'approved') {
          const err = `Approved revision Rev ${existing.revision} is locked. Create a correction revision (Rev ${existing.revision + 1}) to change answers or supporting evidence.`;
          notify(err, 'warning');
          return { ok: false, error: err };
        }

        const actor = DEMO_ROLES[state.activeRole].actorName;

        // Preserve original questionSnapshot if editing an existing record (Clarification 1!)
        const questionSnapshot = existing
          ? existing.questionSnapshot
          : actDef
          ? structuredClone(actDef.questions)
          : [];
        const evidenceRequirementSnapshot = existing
          ? existing.evidenceRequirementSnapshot
          : actDef
          ? structuredClone(actDef.evidenceRequirement)
          : { required: false, label: 'Supporting evidence (optional for unplanned activity)', acceptedTypes: ['file' as const, 'photo' as const, 'source_ref' as const] };

        const draftCandidate: ActivityRecord = {
          id: existing?.id || `actrec-${Date.now()}`,
          recordGroupId: existing?.recordGroupId || `grp-act-${Date.now()}`,
          revision: existing?.revision || 1,
          supersedesRecordId: existing?.supersedesRecordId,
          projectId: activeProject.id,
          planVersionId: existing?.planVersionId || approvedPlan.id,
          planVersionLabel: existing?.planVersionLabel || approvedPlan.versionLabel,
          activityId: input.isUnplanned ? null : input.activityId,
          activityNameSnapshot: input.isUnplanned
            ? input.unplannedTitle?.trim() || 'Unplanned field activity'
            : existing?.activityNameSnapshot || actDef?.name || 'Activity',
          isUnplanned: input.isUnplanned,
          unplannedTitle: input.isUnplanned ? input.unplannedTitle : undefined,
          date: input.date,
          periodId: input.periodId || plan.reportingRules.defaultPeriodId,
          siteId: input.siteId,
          siteNameSnapshot: siteObj?.name || existing?.siteNameSnapshot || 'Unassigned site',
          questionSnapshot,
          evidenceRequirementSnapshot,
          answers: input.answers,
          participantModeUsed: input.participantModeUsed,
          participantCount: input.participantCount,
          participantIds: input.participantIds,
          notes: input.notes,
          evidence: input.evidence,
          status: input.submitNow ? 'submitted' : 'draft',
          provenance: existing?.provenance || 'synthetic_demo',
          createdAt: existing?.createdAt || nowDate(),
          updatedAt: nowDate(),
          createdBy: existing?.createdBy || actor,
          decisionHistory: [
            ...(existing?.decisionHistory || []),
            {
              id: `dec-${Date.now()}`,
              at: nowStamp(),
              actor,
              role: state.activeRole,
              action: input.submitNow ? 'submitted' : 'saved_draft',
              note: input.submitNow
                ? existing?.status === 'returned'
                  ? 'Updated and resubmitted after correction.'
                  : 'Submitted for verification.'
                : 'Saved as draft.',
            },
          ],
        };

        if (input.submitNow) {
          const val = validateActivityRecord(draftCandidate, state.activityRecords);
          if (!val.canSubmit) {
            const msg = val.validationErrors.map((e) => e.message).join(' ');
            notify(msg, 'error');
            return { ok: false, error: msg };
          }
          setState((prev) => ({
            ...prev,
            activityRecords: existing
              ? prev.activityRecords.map((r) => (r.id === existing.id ? draftCandidate : r))
              : [draftCandidate, ...prev.activityRecords],
          }));
          notify(
            val.missingEvidenceFlag
              ? `Submitted "${draftCandidate.activityNameSnapshot}" with Missing Evidence flag (required before verification in Prove).`
              : `Submitted "${draftCandidate.activityNameSnapshot}" for verification in Prove.`,
            val.missingEvidenceFlag ? 'warning' : 'success'
          );
          return { ok: true, record: draftCandidate };
        }

        // Save draft
        setState((prev) => ({
          ...prev,
          activityRecords: existing
            ? prev.activityRecords.map((r) => (r.id === existing.id ? draftCandidate : r))
            : [draftCandidate, ...prev.activityRecords],
        }));
        notify(`Saved draft for "${draftCandidate.activityNameSnapshot}".`, 'info');
        return { ok: true, record: draftCandidate };
      },

      createActivityRevision: (approvedRecordId) => {
        const orig = state.activityRecords.find((r) => r.id === approvedRecordId);
        if (!orig) return null;
        const actor = DEMO_ROLES[state.activeRole].actorName;
        const highestRev = Math.max(
          ...state.activityRecords.filter((r) => r.recordGroupId === orig.recordGroupId).map((r) => r.revision)
        );
        const revRec: ActivityRecord = {
          ...structuredClone(orig),
          id: `actrec-rev-${Date.now()}`,
          revision: highestRev + 1,
          supersedesRecordId: orig.id,
          status: 'draft',
          updatedAt: nowDate(),
          decisionHistory: [
            ...orig.decisionHistory,
            {
              id: `dec-rev-${Date.now()}`,
              at: nowStamp(),
              actor,
              role: state.activeRole,
              action: 'revision_created',
              note: `Created correction revision v${highestRev + 1}. Live reports retain v${orig.revision} until this revision is approved.`,
            },
          ],
        };
        setState((prev) => ({
          ...prev,
          activityRecords: [revRec, ...prev.activityRecords],
        }));
        notify(
          `Created correction revision Rev ${revRec.revision}. Live reports continue using approved Rev ${orig.revision} until Rev ${revRec.revision} is approved.`,
          'info'
        );
        return revRec;
      },

      saveMeasurementRecord: (input) => {
        const approvedPlan = getActiveApprovedPlanVersion(activeProject);
        if (!approvedPlan) {
          notify('Approve a Plan version in Plan before recording measurements.', 'warning');
          return { ok: false, error: 'No approved plan version active.' };
        }
        const plan = approvedPlan.plan;
        const indDef = plan.indicators.find((i) => i.id === input.indicatorId);
        const siteObj = plan.sites.find((s) => s.id === input.siteId);
        const existing = input.existingId
          ? state.measurementRecords.find((r) => r.id === input.existingId)
          : undefined;

        if (existing && existing.status === 'approved') {
          const err = `Approved revision Rev ${existing.revision} is locked. Create a correction revision (Rev ${existing.revision + 1}) to change answers or supporting evidence.`;
          notify(err, 'warning');
          return { ok: false, error: err };
        }
        const actor = DEMO_ROLES[state.activeRole].actorName;

        const questionSnapshot = existing
          ? existing.questionSnapshot
          : indDef
          ? structuredClone(indDef.questions)
          : [];
        const evidenceRequirementSnapshot = existing
          ? existing.evidenceRequirementSnapshot
          : indDef
          ? structuredClone(indDef.evidenceRequirement)
          : { required: true, label: 'Source reference', acceptedTypes: ['file' as const, 'source_ref' as const] };

        const draftCandidate: MeasurementRecord = {
          id: existing?.id || `meas-${Date.now()}`,
          recordGroupId: existing?.recordGroupId || `grp-meas-${Date.now()}`,
          revision: existing?.revision || 1,
          supersedesRecordId: existing?.supersedesRecordId,
          projectId: activeProject.id,
          planVersionId: existing?.planVersionId || approvedPlan.id,
          planVersionLabel: existing?.planVersionLabel || approvedPlan.versionLabel,
          indicatorId: input.indicatorId,
          indicatorCodeSnapshot: existing?.indicatorCodeSnapshot || indDef?.code || 'IND',
          indicatorNameSnapshot: existing?.indicatorNameSnapshot || indDef?.name || 'Indicator',
          indicatorUnitSnapshot: existing?.indicatorUnitSnapshot || indDef?.unit || '',
          observationDate: input.observationDate,
          periodId: input.periodId || plan.reportingRules.defaultPeriodId,
          siteId: input.siteId || 'all_sites',
          siteNameSnapshot:
            input.siteId === 'all_sites'
              ? 'All project sites'
              : siteObj?.name || existing?.siteNameSnapshot || 'Project-wide',
          breakdowns: input.breakdowns,
          collectionMethod: input.collectionMethod || indDef?.collectionMethod || 'Routine monitoring',
          studyMetadata: input.studyMetadata,
          questionSnapshot,
          evidenceRequirementSnapshot,
          answers: input.answers,
          singleValue: input.singleValue,
          categoryValue: input.categoryValue,
          numerator: input.numerator,
          denominator: input.denominator,
          notes: input.notes,
          evidence: input.evidence,
          csvImportRef: input.csvImportRef || existing?.csvImportRef,
          status: input.submitNow ? 'submitted' : 'draft',
          provenance: existing?.provenance || 'synthetic_demo',
          createdAt: existing?.createdAt || nowDate(),
          updatedAt: nowDate(),
          createdBy: existing?.createdBy || actor,
          decisionHistory: [
            ...(existing?.decisionHistory || []),
            {
              id: `dec-m-${Date.now()}`,
              at: nowStamp(),
              actor,
              role: state.activeRole,
              action: input.submitNow ? 'submitted' : 'saved_draft',
              note: input.submitNow
                ? existing?.status === 'returned'
                  ? 'Updated and resubmitted after correction.'
                  : 'Submitted measurement for verification.'
                : 'Saved measurement draft.',
            },
          ],
        };

        if (input.submitNow) {
          const val = validateMeasurementRecord(draftCandidate, state.measurementRecords, indDef);
          if (!val.canSubmit) {
            const msg = val.validationErrors.map((e) => e.message).join(' ');
            notify(msg, 'error');
            return { ok: false, error: msg };
          }
          setState((prev) => ({
            ...prev,
            measurementRecords: existing
              ? prev.measurementRecords.map((r) => (r.id === existing.id ? draftCandidate : r))
              : [draftCandidate, ...prev.measurementRecords],
          }));
          notify(
            val.missingEvidenceFlag
              ? `Submitted "${draftCandidate.indicatorNameSnapshot}" with Missing Source/Evidence flag (required before verification).`
              : `Submitted "${draftCandidate.indicatorNameSnapshot}" for verification in Prove.`,
            val.missingEvidenceFlag ? 'warning' : 'success'
          );
          return { ok: true, record: draftCandidate };
        }

        setState((prev) => ({
          ...prev,
          measurementRecords: existing
            ? prev.measurementRecords.map((r) => (r.id === existing.id ? draftCandidate : r))
            : [draftCandidate, ...prev.measurementRecords],
        }));
        notify(`Saved measurement draft for "${draftCandidate.indicatorNameSnapshot}".`, 'info');
        return { ok: true, record: draftCandidate };
      },

      createMeasurementRevision: (approvedRecordId) => {
        const orig = state.measurementRecords.find((r) => r.id === approvedRecordId);
        if (!orig) return null;
        const actor = DEMO_ROLES[state.activeRole].actorName;
        const highestRev = Math.max(
          ...state.measurementRecords.filter((r) => r.recordGroupId === orig.recordGroupId).map((r) => r.revision)
        );
        const revRec: MeasurementRecord = {
          ...structuredClone(orig),
          id: `meas-rev-${Date.now()}`,
          revision: highestRev + 1,
          supersedesRecordId: orig.id,
          status: 'draft',
          updatedAt: nowDate(),
          decisionHistory: [
            ...orig.decisionHistory,
            {
              id: `dec-mrev-${Date.now()}`,
              at: nowStamp(),
              actor,
              role: state.activeRole,
              action: 'revision_created',
              note: `Created correction revision Rev ${highestRev + 1}. Live reports retain approved Rev ${orig.revision} until approved.`,
            },
          ],
        };
        setState((prev) => ({
          ...prev,
          measurementRecords: [revRec, ...prev.measurementRecords],
        }));
        notify(
          `Created correction revision Rev ${revRec.revision}. Live reports retain approved Rev ${orig.revision} until Rev ${revRec.revision} is approved.`,
          'info'
        );
        return revRec;
      },

      importCsvMeasurements: (records) => {
        const actor = DEMO_ROLES[state.activeRole].actorName;
        const created: MeasurementRecord[] = records.map((r, idx) => ({
          ...r,
          id: `meas-csv-${Date.now()}-${idx}`,
          recordGroupId: `grp-csv-${Date.now()}-${idx}`,
          revision: 1,
          createdAt: nowDate(),
          updatedAt: nowDate(),
          decisionHistory: [
            {
              id: `dec-csv-${Date.now()}-${idx}`,
              at: nowStamp(),
              actor,
              role: state.activeRole,
              action: 'submitted',
              note: `Imported from CSV ${r.csvImportRef?.fileName || 'upload'} (Row ${r.csvImportRef?.rowNumber || idx + 2}).`,
            },
          ],
        }));
        setState((prev) => ({
          ...prev,
          measurementRecords: [...created, ...prev.measurementRecords],
        }));
        notify(`Imported ${created.length} CSV measurement record(s) with preserved file & row references.`);
        return created.length;
      },

      transitionRecordStatus: (recordType, recordId, nextStatus, note) => {
        const actor = DEMO_ROLES[state.activeRole].actorName;
        const plan = activeApprovedPlan?.plan;

        if (recordType === 'activity') {
          const rec = state.activityRecords.find((r) => r.id === recordId);
          if (!rec) return { ok: false, error: 'Record not found.' };
          const val = validateActivityRecord(rec, state.activityRecords);
          if (nextStatus === 'verified' && !val.canVerify) {
            const err = val.missingEvidenceFlag
              ? 'Verification blocked: required evidence must be attached before verifying. Return the record to attach evidence.'
              : val.validationErrors.map((e) => e.message).join(' ');
            notify(err, 'error');
            return { ok: false, error: err };
          }
          if (nextStatus === 'returned' && !note.trim()) {
            notify('Please enter a reason when returning a record for correction.', 'warning');
            return { ok: false, error: 'Return reason required.' };
          }
          setState((prev) => ({
            ...prev,
            activityRecords: prev.activityRecords.map((r) =>
              r.id === recordId
                ? {
                    ...r,
                    status: nextStatus,
                    updatedAt: nowDate(),
                    decisionHistory: [
                      ...r.decisionHistory,
                      {
                        id: `dec-${Date.now()}`,
                        at: nowStamp(),
                        actor,
                        role: prev.activeRole,
                        action: nextStatus === 'draft' ? 'saved_draft' : nextStatus,
                        note: note.trim() || `Marked as ${nextStatus}.`,
                      },
                    ],
                  }
                : r
            ),
          }));
        } else {
          const rec = state.measurementRecords.find((r) => r.id === recordId);
          if (!rec) return { ok: false, error: 'Record not found.' };
          const indDef = plan?.indicators.find((i) => i.id === rec.indicatorId);
          const val = validateMeasurementRecord(rec, state.measurementRecords, indDef);
          if (nextStatus === 'verified' && !val.canVerify) {
            const err = val.missingEvidenceFlag
              ? 'Verification blocked: required source/evidence must be attached before verifying. Return the record to attach evidence.'
              : val.validationErrors.map((e) => e.message).join(' ');
            notify(err, 'error');
            return { ok: false, error: err };
          }
          if (nextStatus === 'returned' && !note.trim()) {
            notify('Please enter a reason when returning a record for correction.', 'warning');
            return { ok: false, error: 'Return reason required.' };
          }
          setState((prev) => ({
            ...prev,
            measurementRecords: prev.measurementRecords.map((r) =>
              r.id === recordId
                ? {
                    ...r,
                    status: nextStatus,
                    updatedAt: nowDate(),
                    decisionHistory: [
                      ...r.decisionHistory,
                      {
                        id: `dec-${Date.now()}`,
                        at: nowStamp(),
                        actor,
                        role: prev.activeRole,
                        action: nextStatus === 'draft' ? 'saved_draft' : nextStatus,
                        note: note.trim() || `Marked as ${nextStatus}.`,
                      },
                    ],
                  }
                : r
            ),
          }));
        }

        notify(
          nextStatus === 'approved'
            ? 'Record approved and included in live reporting.'
            : nextStatus === 'verified'
            ? 'Record internally verified and ready for Programme Manager approval.'
            : nextStatus === 'returned'
            ? 'Record returned for correction with reason logged.'
            : 'Record resubmitted for verification.',
          nextStatus === 'returned' ? 'warning' : 'success'
        );
        return { ok: true };
      },

      attachEvidenceToRecord: (recordType, recordId, attachment) => {
        const target =
          recordType === 'activity'
            ? state.activityRecords.find((r) => r.id === recordId)
            : state.measurementRecords.find((r) => r.id === recordId);

        if (!target) return { ok: false, error: 'Record not found.' };
        if (target.status === 'approved') {
          const err = `Evidence on approved Rev ${target.revision} is locked. Create a correction revision (Rev ${target.revision + 1}) to add or replace supporting evidence.`;
          notify(err, 'warning');
          return { ok: false, error: err };
        }

        if (recordType === 'activity') {
          setState((prev) => ({
            ...prev,
            activityRecords: prev.activityRecords.map((r) =>
              r.id === recordId ? { ...r, evidence: [...r.evidence, attachment], updatedAt: nowDate() } : r
            ),
          }));
        } else {
          setState((prev) => ({
            ...prev,
            measurementRecords: prev.measurementRecords.map((r) =>
              r.id === recordId ? { ...r, evidence: [...r.evidence, attachment], updatedAt: nowDate() } : r
            ),
          }));
        }
        notify(`Attached "${attachment.name}" to Rev ${target.revision}.`);
        return { ok: true };
      },

      removeEvidenceFromRecord: (recordType, recordId, attachmentId) => {
        const target =
          recordType === 'activity'
            ? state.activityRecords.find((r) => r.id === recordId)
            : state.measurementRecords.find((r) => r.id === recordId);

        if (!target) return { ok: false, error: 'Record not found.' };
        if (target.status === 'approved') {
          const err = `Evidence on approved Rev ${target.revision} is locked. Create a correction revision (Rev ${target.revision + 1}) to modify supporting evidence.`;
          notify(err, 'warning');
          return { ok: false, error: err };
        }

        if (recordType === 'activity') {
          setState((prev) => ({
            ...prev,
            activityRecords: prev.activityRecords.map((r) =>
              r.id === recordId
                ? { ...r, evidence: r.evidence.filter((e) => e.id !== attachmentId), updatedAt: nowDate() }
                : r
            ),
          }));
        } else {
          setState((prev) => ({
            ...prev,
            measurementRecords: prev.measurementRecords.map((r) =>
              r.id === recordId
                ? { ...r, evidence: r.evidence.filter((e) => e.id !== attachmentId), updatedAt: nowDate() }
                : r
            ),
          }));
        }
        notify(`Removed attachment from Rev ${target.revision}.`, 'info');
        return { ok: true };
      },

      issueReport: (params) => {
        const planVer = getActiveApprovedPlanVersion(activeProject);
        if (!planVer) {
          notify('Approve a Plan version before issuing a report.', 'warning');
          return null;
        }
        const base = buildReportPayload({
          project: activeProject,
          planVersion: planVer,
          periodId: params.periodId,
          templateName: params.templateName,
          includedSections: params.includedSections,
          breakdownDimension: params.breakdownDimension,
          allActivityRecords: state.activityRecords,
          allMeasurementRecords: state.measurementRecords,
          learningItems: state.learningItems,
          issuedBy: DEMO_ROLES[state.activeRole].actorName,
        });
        const issued: IssuedReport = {
          ...base,
          narrative: params.customNarrative !== undefined ? params.customNarrative : base.narrative,
          id: `rep-${Date.now()}`,
          issuedAt: nowStamp(),
        };
        setState((prev) => ({
          ...prev,
          issuedReports: [issued, ...prev.issuedReports],
        }));
        notify(`Issued and frozen "${issued.title}" against Plan ${planVer.versionLabel}.`);
        return issued;
      },

      addLearningItem: (item) => {
        const created: LearningItem = {
          ...item,
          id: `lrn-${Date.now()}`,
          createdAt: nowDate(),
          createdBy: DEMO_ROLES[state.activeRole].actorName,
          actions: [],
        };
        setState((prev) => ({ ...prev, learningItems: [created, ...prev.learningItems] }));
        notify(`Logged "${created.title}" in Learn.`);
      },

      updateLearningRecommendation: (itemId, recommendation) => {
        setState((prev) => ({
          ...prev,
          learningItems: prev.learningItems.map((l) =>
            l.id === itemId ? { ...l, recommendation } : l
          ),
        }));
        notify('Recommendation updated.');
      },

      addTrackedAction: (itemId, action) => {
        const created: TrackedAction = {
          ...action,
          id: `trk-${Date.now()}`,
          status: 'open',
        };
        setState((prev) => ({
          ...prev,
          learningItems: prev.learningItems.map((l) =>
            l.id === itemId ? { ...l, actions: [created, ...l.actions] } : l
          ),
        }));
        notify(`Assigned tracked action to ${action.owner} (Due ${action.dueDate}).`);
      },

      closeTrackedAction: (itemId, actionId, closureNote, closureEvidence, linkedPlanVersionId) => {
        const linkedVer = linkedPlanVersionId
          ? activeProject.planVersions.find((v) => v.id === linkedPlanVersionId)
          : undefined;
        setState((prev) => ({
          ...prev,
          learningItems: prev.learningItems.map((l) =>
            l.id === itemId
              ? {
                  ...l,
                  actions: l.actions.map((a) =>
                    a.id === actionId
                      ? {
                          ...a,
                          status: 'closed' as const,
                          closureNote,
                          closureEvidence,
                          closedAt: nowDate(),
                          linkedPlanVersionId: linkedVer?.id,
                          linkedPlanVersionLabel: linkedVer?.versionLabel,
                        }
                      : a
                  ),
                }
              : l
          ),
        }));
        notify('Tracked action closed with recorded closure evidence.');
      },
    }),
    [
      state,
      activeProject,
      activeApprovedPlan,
      roleDef,
      toasts,
      persistenceError,
      simulateStorageFailure,
      hasRecoveredFromSaveFailure,
    ]
  );

  return <MiledgeContext.Provider value={value}>{children}</MiledgeContext.Provider>;
};

export function useMiledge(): MiledgeContextValue {
  const ctx = useContext(MiledgeContext);
  if (!ctx) throw new Error('useMiledge must be used within MiledgeProvider');
  return ctx;
}
