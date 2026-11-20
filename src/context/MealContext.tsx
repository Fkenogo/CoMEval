import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createInitialSeedState } from '../data/seedData';
import { computeIndicatorState, ROLE_DEFINITIONS, scanRecurringChecks } from '../lib/mealEngine';
import {
  ApprovalStatus,
  Commitment,
  CorrectiveAction,
  DeliveryRecord,
  EvalReadiness,
  EvaluationQuestion,
  FilterState,
  HandoverSnapshot,
  Indicator,
  InspectorTarget,
  LearningEntry,
  MealState,
  NavModule,
  ProjectConfig,
  ProjectDocument,
  ProjectId,
  RegisterRow,
  ResultObservation,
  SurveyResultRecord,
  UserRole,
  VerificationStatus,
  WorkplanActivity,
} from '../types/meal';

const STORAGE_KEY = 'miledge_programme_intelligence_state_v1';

export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'warning';
}

interface MealContextValue {
  state: MealState;
  activeProject: ProjectConfig;
  roleMeta: (typeof ROLE_DEFINITIONS)[UserRole];
  inspector: InspectorTarget | null;
  toasts: ToastItem[];
  openInspector: (target: InspectorTarget) => void;
  closeInspector: () => void;
  notify: (message: string, tone?: ToastItem['tone']) => void;
  setActiveProject: (projectId: ProjectId) => void;
  setActiveModule: (module: NavModule) => void;
  setActiveRole: (role: UserRole, navigateToHome?: boolean) => void;
  setFilters: (patch: Partial<FilterState>) => void;
  resetFilters: () => void;
  setWalkthroughOpen: (open: boolean, tab?: MealState['activeWalkthroughTab']) => void;
  resetDemoData: () => void;

  // Lifecycle mutations
  approveCommitmentAndCreateActivity: (
    commitmentId: string,
    activityInput: {
      title: string;
      ownerPartner: string;
      ownerPerson: string;
      location: string;
      dueDate: string;
      plannedOutput: number;
      outputUnit: string;
      evidenceRequirements: string[];
    }
  ) => WorkplanActivity | null;
  addSimulatedCommitment: (commitment: Omit<Commitment, 'id' | 'linkedActivityIds'>) => void;
  updateActivityWithRationale: (
    activityId: string,
    updates: Partial<Pick<WorkplanActivity, 'currentDueDate' | 'plannedOutput' | 'ownerPartner' | 'ownerPerson' | 'status' | 'location'>>,
    reason: string
  ) => void;
  logFieldDelivery: (input: {
    activityId: string;
    period: string;
    date: string;
    location: string;
    quantityDelivered: number;
    narrative: string;
    evidenceDocId?: string;
    evidencePageOrRow?: string;
    evidenceMissing: boolean;
    issueText?: string;
    issueCategory?: 'Delay' | 'Access / Logistics' | 'Evidence Gap' | 'Procurement' | 'Data Variance';
    submitNow: boolean;
  }) => void;
  addRegisterRow: (row: Omit<RegisterRow, 'id'>) => void;
  upsertObservation: (obs: Omit<ResultObservation, 'id' | 'createdAt' | 'updatedAt' | 'reviewerComments' | 'independentNotes' | 'revisionHistory'> & { id?: string }) => void;
  importCsvObservations: (rows: Omit<ResultObservation, 'id' | 'createdAt' | 'updatedAt' | 'reviewerComments' | 'independentNotes' | 'revisionHistory'>[]) => void;
  reviewObservation: (
    obsId: string,
    decision: 'approved' | 'returned' | 'submitted',
    comment: string,
    assignFollowUpTo?: string
  ) => void;
  correctApprovedObservation: (obsId: string, newValue: number, reason: string, newSourceRef?: string) => void;
  addIndependentNote: (
    obsId: string,
    status: VerificationStatus,
    note: string,
    discrepancyFlag: boolean,
    pushToQuestionId?: string
  ) => void;
  importSurveyResult: (rec: Omit<SurveyResultRecord, 'id'>) => void;
  approveSurveyResult: (surveyResultId: string) => void;
  createCorrectiveAction: (action: Omit<CorrectiveAction, 'id' | 'createdAt' | 'status'>) => void;
  submitActionClosureEvidence: (actionId: string, evidenceRef: string, closureNote: string) => void;
  verifyAndCloseAction: (actionId: string) => void;
  addDocument: (doc: Omit<ProjectDocument, 'id'>) => void;
  addLearningEntry: (entry: Omit<LearningEntry, 'id'>) => void;
  toggleLearningInReport: (entryId: string) => void;
  updateEvaluationQuestion: (
    questionId: string,
    patch: Partial<Pick<EvaluationQuestion, 'readiness' | 'proposedMethod' | 'owner' | 'status' | 'remainingGaps' | 'assignedFollowUpNote'>>
  ) => void;
  addEvaluationQuestion: (q: Omit<EvaluationQuestion, 'id'>) => void;
  updateFindingResponse: (findingId: string, managementResponse: string, managementStatus: MealState['evaluatorFindings'][number]['managementStatus']) => void;
  createHandoverSnapshot: (label: string, notes: string) => HandoverSnapshot;
  updateReportNarrative: (templateId: string, sectionId: string, body: string) => void;
  updateIndicator: (indicatorId: string, patch: Partial<Indicator>) => void;
  updateProjectSettings: (projectId: ProjectId, patch: Partial<ProjectConfig>) => void;
}

const MealContext = createContext<MealContextValue | null>(null);

function hydrateObservationUnits(state: MealState): MealState {
  const unitByInd = new Map(state.indicators.map((i) => [i.id, i.unit]));
  return {
    ...state,
    observations: state.observations.map((o) => (o.unit ? o : { ...o, unit: unitByInd.get(o.indicatorId) || '' })),
  };
}

function loadInitialState(): MealState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MealState;
      if (parsed && parsed.projects && parsed.projects['childfund-uganda'] && parsed.projects['omugo-wvu']) {
        return hydrateObservationUnits(parsed);
      }
    }
  } catch {
    // Fallback cleanly to fresh seed state
  }
  return hydrateObservationUnits(createInitialSeedState());
}

export const MealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MealState>(loadInitialState);
  const [inspector, setInspector] = useState<InspectorTarget | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted sandboxes
    }
  }, [state]);

  const notify = (message: string, tone: ToastItem['tone'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const today = () => new Date().toISOString().slice(0, 10);
  const nowStamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

  const activeProject = state.projects[state.activeProjectId];
  const roleMeta = ROLE_DEFINITIONS[state.activeRole];

  const value = useMemo<MealContextValue>(
    () => ({
      state,
      activeProject,
      roleMeta,
      inspector,
      toasts,
      openInspector: (target) => setInspector(target),
      closeInspector: () => setInspector(null),
      notify,
      setActiveProject: (projectId) => {
        setState((prev) => ({
          ...prev,
          activeProjectId: projectId,
          filters: { period: 'all', partner: 'all', location: 'all', sector: 'all' },
        }));
        setInspector(null);
      },
      setActiveModule: (module) => setState((prev) => ({ ...prev, activeModule: module })),
      setActiveRole: (role, navigateToHome = false) => {
        setState((prev) => ({
          ...prev,
          activeRole: role,
          activeModule: navigateToHome ? 'role_home' : prev.activeModule,
        }));
        notify(`Switched demo role to ${ROLE_DEFINITIONS[role].label}`, 'info');
      },
      setFilters: (patch) =>
        setState((prev) => ({ ...prev, filters: { ...prev.filters, ...patch } })),
      resetFilters: () =>
        setState((prev) => ({
          ...prev,
          filters: { period: 'all', partner: 'all', location: 'all', sector: 'all' },
        })),
      setWalkthroughOpen: (open, tab) =>
        setState((prev) => ({
          ...prev,
          walkthroughOpen: open,
          activeWalkthroughTab: tab ?? prev.activeWalkthroughTab,
        })),
      resetDemoData: () => {
        const fresh = hydrateObservationUnits(createInitialSeedState());
        setState(fresh);
        setInspector(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        notify('Demo workspace reset to verified seed data.', 'info');
      },

      approveCommitmentAndCreateActivity: (commitmentId, activityInput) => {
        const commitment = state.commitments.find((c) => c.id === commitmentId);
        if (!commitment) return null;
        const newActId = `act-${Date.now()}`;
        const countForProj = state.activities.filter((a) => a.projectId === commitment.projectId).length + 1;
        const prefix = commitment.projectId === 'childfund-uganda' ? 'WP-CF' : 'WP-OM';
        const newAct: WorkplanActivity = {
          id: newActId,
          projectId: commitment.projectId,
          code: `${prefix}-${countForProj}.0`,
          title: activityInput.title,
          sector: commitment.sector,
          commitmentId: commitment.id,
          frameworkNodeId: commitment.frameworkNodeId,
          linkedIndicatorId: commitment.linkedIndicatorId,
          ownerPartner: activityInput.ownerPartner,
          ownerPerson: activityInput.ownerPerson,
          location: activityInput.location,
          plannedDueDate: activityInput.dueDate,
          currentDueDate: activityInput.dueDate,
          plannedOutput: activityInput.plannedOutput,
          actualDelivered: 0,
          outputUnit: activityInput.outputUnit,
          status: 'planned',
          evidenceRequirements: activityInput.evidenceRequirements,
          attachedEvidenceIds: [commitment.sourceCitation.documentId],
          provenance: commitment.provenance,
          changeLog: [],
          issues: [],
        };

        setState((prev) => ({
          ...prev,
          commitments: prev.commitments.map((c) =>
            c.id === commitmentId
              ? {
                  ...c,
                  status: 'approved',
                  approvedBy: ROLE_DEFINITIONS[prev.activeRole].actorName,
                  approvedAt: today(),
                  linkedActivityIds: [...c.linkedActivityIds, newActId],
                }
              : c
          ),
          activities: [newAct, ...prev.activities],
        }));
        notify(`Commitment ${commitment.code} approved and workplan activity ${newAct.code} assigned.`);
        return newAct;
      },

      addSimulatedCommitment: (commitment) => {
        const newCom: Commitment = {
          ...commitment,
          id: `com-${Date.now()}`,
          linkedActivityIds: [],
        };
        setState((prev) => ({ ...prev, commitments: [newCom, ...prev.commitments] }));
        notify(`Extracted candidate commitment ${newCom.code} for review.`, 'info');
      },

      updateActivityWithRationale: (activityId, updates, reason) => {
        setState((prev) => ({
          ...prev,
          activities: prev.activities.map((act) => {
            if (act.id !== activityId) return act;
            const entries = [...act.changeLog];
            const actor = ROLE_DEFINITIONS[prev.activeRole].actorName;
            if (updates.currentDueDate && updates.currentDueDate !== act.currentDueDate) {
              entries.push({
                id: `chg-${Date.now()}-d`,
                date: today(),
                changedBy: actor,
                field: 'Due Date',
                previousValue: act.currentDueDate,
                newValue: updates.currentDueDate,
                reason,
              });
            }
            if (updates.plannedOutput !== undefined && updates.plannedOutput !== act.plannedOutput) {
              entries.push({
                id: `chg-${Date.now()}-p`,
                date: today(),
                changedBy: actor,
                field: 'Planned Output',
                previousValue: String(act.plannedOutput),
                newValue: String(updates.plannedOutput),
                reason,
              });
            }
            if (updates.ownerPartner && updates.ownerPartner !== act.ownerPartner) {
              entries.push({
                id: `chg-${Date.now()}-o`,
                date: today(),
                changedBy: actor,
                field: 'Owner Partner',
                previousValue: act.ownerPartner,
                newValue: updates.ownerPartner,
                reason,
              });
            }
            if (updates.status && updates.status !== act.status && entries.length === act.changeLog.length) {
              entries.push({
                id: `chg-${Date.now()}-s`,
                date: today(),
                changedBy: actor,
                field: 'Status',
                previousValue: act.status,
                newValue: updates.status,
                reason,
              });
            }
            return { ...act, ...updates, changeLog: entries };
          }),
        }));
        notify('Workplan activity updated with recorded change rationale.');
      },

      logFieldDelivery: (input) => {
        const act = state.activities.find((a) => a.id === input.activityId);
        if (!act) return;
        const doc = input.evidenceDocId
          ? state.documents.find((d) => d.id === input.evidenceDocId)
          : undefined;
        const status: ApprovalStatus = input.submitNow ? 'submitted' : 'draft';
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;

        const newDelivery: DeliveryRecord = {
          id: `del-${Date.now()}`,
          projectId: act.projectId,
          activityId: act.id,
          indicatorId: act.linkedIndicatorId,
          period: input.period,
          date: input.date,
          partner: act.ownerPartner,
          location: input.location,
          quantityDelivered: input.quantityDelivered,
          unit: act.outputUnit,
          narrative: input.narrative,
          sourceCitation: doc
            ? {
                documentId: doc.id,
                documentName: doc.fileName,
                version: doc.version,
                sectionOrTab: 'Partner Field Delivery Attachment',
                pageOrRow: input.evidencePageOrRow || 'Logged Reference',
                originalAvailable: doc.originalAvailable,
              }
            : undefined,
          evidenceMissing: input.evidenceMissing,
          approvalStatus: status,
          provenance: 'synthetic',
          createdBy: actor,
        };

        setState((prev) => {
          const nextActivities = prev.activities.map((a) => {
            if (a.id !== act.id) return a;
            const nextDelivered = a.actualDelivered + input.quantityDelivered;
            const nextIssues = input.issueText
              ? [
                  {
                    id: `iss-${Date.now()}`,
                    date: input.date,
                    loggedBy: actor,
                    severity: input.evidenceMissing ? ('high' as const) : ('medium' as const),
                    category: input.issueCategory || 'Delay',
                    description: input.issueText,
                    resolved: false,
                  },
                  ...a.issues,
                ]
              : a.issues;
            const nextAttached =
              doc && !a.attachedEvidenceIds.includes(doc.id)
                ? [...a.attachedEvidenceIds, doc.id]
                : a.attachedEvidenceIds;
            return {
              ...a,
              actualDelivered: nextDelivered,
              status: nextDelivered >= a.plannedOutput ? ('completed' as const) : ('in_progress' as const),
              attachedEvidenceIds: nextAttached,
              issues: nextIssues,
            };
          });

          // If activity links to a register (like Trainer Contracting), add draft/submitted rows so draft preview updates immediately!
          let nextRegisterRows = prev.registerRows;
          if (act.linkedRegisterId && input.quantityDelivered > 0) {
            const reg = prev.registers.find((r) => r.id === act.linkedRegisterId);
            if (reg && reg.aggregationRule === 'count_rows') {
              const countToAdd = Math.min(input.quantityDelivered, 5);
              const added: RegisterRow[] = Array.from({ length: countToAdd }).map((_, idx) => ({
                id: `rr-fld-${Date.now()}-${idx}`,
                projectId: act.projectId,
                registerId: reg.id,
                period: input.period,
                partner: act.ownerPartner,
                location: input.location,
                approvalStatus: status,
                provenance: 'synthetic',
                values: {
                  trainerCode: `TRN-NEW-${String(prev.registerRows.length + idx + 1).padStart(2, '0')}`,
                  originType: 'Target District',
                  sex: idx % 2 === 0 ? 'Female' : 'Male',
                  contractDate: input.date,
                  contractOnFile: input.evidenceMissing ? 'Missing' : 'Yes',
                },
                sourceRef: doc
                  ? `${doc.fileName} · ${input.evidencePageOrRow || 'Partner Delivery Log'}`
                  : 'Pending Primary Source Attachment (Field Draft)',
              }));
              nextRegisterRows = [...added, ...prev.registerRows];
            }
          }

          // Also create a draft/submitted ResultObservation so reviewer inbox & calculation preview distinguish draft vs approved!
          let nextObservations = prev.observations;
          if (act.linkedIndicatorId) {
            const ind = prev.indicators.find((i) => i.id === act.linkedIndicatorId);
            if (ind) {
              const currentCalc = computeIndicatorState(prev, ind);
              const baseVal = currentCalc.approvedValue ?? 0;
              const projectedVal = ind.permitsCumulative ? baseVal + input.quantityDelivered : input.quantityDelivered;
              const newObs: ResultObservation = {
                id: `obs-fld-${Date.now()}`,
                projectId: act.projectId,
                indicatorId: ind.id,
                period: input.period,
                partner: act.ownerPartner,
                location: input.location,
                sector: act.sector,
                reportedValue: projectedVal,
                unit: ind.unit,
                denominator: ind.target,
                denominatorLabel: `Target (${ind.target ?? 'N/A'} ${ind.unit})`,
                breakdownSummary: `Added +${input.quantityDelivered} ${act.outputUnit} via field delivery log`,
                narrative: input.narrative,
                provenance: 'synthetic',
                sourceCitation: doc
                  ? {
                      documentId: doc.id,
                      documentName: doc.fileName,
                      version: doc.version,
                      sectionOrTab: 'Partner Field Delivery Log',
                      pageOrRow: input.evidencePageOrRow || `Delivery ${input.date}`,
                      originalAvailable: doc.originalAvailable,
                    }
                  : {
                      documentId: 'missing-source',
                      documentName: 'MISSING_SOURCE — Pending Partner Attachment',
                      sectionOrTab: 'Field Delivery Entry',
                      pageOrRow: `Logged ${input.date}`,
                      originalAvailable: false,
                    },
                approvalStatus: status,
                verificationStatus: 'unverified',
                reviewerComments: [
                  {
                    id: `rc-${Date.now()}`,
                    date: today(),
                    author: actor,
                    role: prev.activeRole,
                    action: input.submitNow ? 'submitted' : 'comment',
                    text: input.submitNow
                      ? `Submitted partner delivery (+${input.quantityDelivered} ${act.outputUnit}) for M&E review.`
                      : `Saved field draft (+${input.quantityDelivered} ${act.outputUnit}). Donor reports retain last approved figure until approved.`,
                  },
                ],
                independentNotes: [],
                revisionHistory: [],
                createdAt: today(),
                updatedAt: today(),
              };
              nextObservations = [newObs, ...prev.observations];
            }
          }

          return {
            ...prev,
            activities: nextActivities,
            deliveryRecords: [newDelivery, ...prev.deliveryRecords],
            registerRows: nextRegisterRows,
            observations: nextObservations,
          };
        });

        notify(
          input.submitNow
            ? `Delivery submitted for M&E review (+${input.quantityDelivered} ${act.outputUnit}).`
            : `Draft saved (+${input.quantityDelivered} ${act.outputUnit}). Calculation preview updated while donor report holds last approved figure.`,
          input.evidenceMissing ? 'warning' : 'success'
        );
      },

      addRegisterRow: (row) => {
        const newRow: RegisterRow = { ...row, id: `rr-${Date.now()}` };
        setState((prev) => ({ ...prev, registerRows: [newRow, ...prev.registerRows] }));
        notify(
          row.approvalStatus === 'draft'
            ? 'Draft register row saved — draft calculation preview updated without altering approved donor figures.'
            : 'Register row submitted for review.'
        );
      },

      upsertObservation: (obsInput) => {
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;
        setState((prev) => {
          if (obsInput.id) {
            return {
              ...prev,
              observations: prev.observations.map((o) =>
                o.id === obsInput.id
                  ? {
                      ...o,
                      ...obsInput,
                      updatedAt: today(),
                      reviewerComments: [
                        ...o.reviewerComments,
                        {
                          id: `rc-${Date.now()}`,
                          date: today(),
                          author: actor,
                          role: prev.activeRole,
                          action: obsInput.approvalStatus === 'submitted' ? 'submitted' : 'comment',
                          text: `Updated reported figure to ${obsInput.reportedValue ?? 'Missing'} ${obsInput.unit || ''}`.trim() + ` (${obsInput.approvalStatus}).`,
                        },
                      ],
                    }
                  : o
              ),
            };
          }
          const created: ResultObservation = {
            ...obsInput,
            id: `obs-${Date.now()}`,
            createdAt: today(),
            updatedAt: today(),
            reviewerComments: [
              {
                id: `rc-${Date.now()}`,
                date: today(),
                author: actor,
                role: prev.activeRole,
                action: obsInput.approvalStatus === 'submitted' ? 'submitted' : 'comment',
                text: `Created ${obsInput.approvalStatus} entry (${obsInput.reportedValue ?? 'Missing'} ${obsInput.unit || ''})`.replace(' )', ')') + '.',
              },
            ],
            independentNotes: [],
            revisionHistory: [],
          };
          return { ...prev, observations: [created, ...prev.observations] };
        });
        notify(
          obsInput.approvalStatus === 'submitted'
            ? 'Reporting period figure submitted for M&E review.'
            : 'Draft figure saved locally (excluded from approved donor reports until approved).'
        );
      },

      importCsvObservations: (rows) => {
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;
        const created: ResultObservation[] = rows.map((r, idx) => ({
          ...r,
          id: `obs-csv-${Date.now()}-${idx}`,
          createdAt: today(),
          updatedAt: today(),
          reviewerComments: [
            {
              id: `rc-csv-${Date.now()}-${idx}`,
              date: today(),
              author: actor,
              role: state.activeRole,
              action: 'submitted',
              text: `Imported from CSV ${r.importedFromCsv?.fileName || 'upload'} (Row ${r.importedFromCsv?.rowNumber || idx + 2}).`,
            },
          ],
          independentNotes: [],
          revisionHistory: [],
        }));
        setState((prev) => ({ ...prev, observations: [...created, ...prev.observations] }));
        notify(`Imported ${created.length} validated CSV row(s) with preserved file & row provenance.`);
      },

      reviewObservation: (obsId, decision, comment, assignFollowUpTo) => {
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;
        setState((prev) => {
          const target = prev.observations.find((o) => o.id === obsId);
          if (!target) return prev;
          const nextObs = prev.observations.map((o) => {
            if (o.id !== obsId) return o;
            const nextRev =
              decision === 'approved'
                ? [
                    ...o.revisionHistory,
                    {
                      version: o.revisionHistory.length + 1,
                      date: today(),
                      changedBy: actor,
                      previousValue: o.revisionHistory.length ? o.revisionHistory[o.revisionHistory.length - 1].newValue : null,
                      newValue: o.reportedValue,
                      previousStatus: o.approvalStatus,
                      newStatus: 'approved' as const,
                      reason: comment || 'Approved after M&E quality review.',
                    },
                  ]
                : o.revisionHistory;
            return {
              ...o,
              approvalStatus: decision,
              updatedAt: today(),
              reviewerComments: [
                ...o.reviewerComments,
                {
                  id: `rc-${Date.now()}`,
                  date: today(),
                  author: actor,
                  role: prev.activeRole,
                  action: decision,
                  text: comment || `Marked as ${decision}.`,
                  assignedTo: assignFollowUpTo,
                },
              ],
              revisionHistory: nextRev,
            };
          });

          // If approving an observation linked to a register, also promote pending rows in that register to approved
          const ind = prev.indicators.find((i) => i.id === target.indicatorId);
          let nextRegisterRows = prev.registerRows;
          if (decision === 'approved' && ind?.linkedRegisterId) {
            nextRegisterRows = prev.registerRows.map((r) =>
              r.registerId === ind.linkedRegisterId && r.approvalStatus !== 'approved'
                ? { ...r, approvalStatus: 'approved' }
                : r
            );
          }

          return { ...prev, observations: nextObs, registerRows: nextRegisterRows };
        });
        notify(
          decision === 'approved'
            ? 'Result approved internally and promoted to live donor reports.'
            : decision === 'returned'
            ? 'Submission returned to partner for clarification.'
            : 'Submission re-submitted for review.',
          decision === 'returned' ? 'warning' : 'success'
        );
      },

      correctApprovedObservation: (obsId, newValue, reason, newSourceRef) => {
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;
        setState((prev) => ({
          ...prev,
          observations: prev.observations.map((o) => {
            if (o.id !== obsId) return o;
            const rev = {
              version: o.revisionHistory.length + 1,
              date: nowStamp(),
              changedBy: actor,
              previousValue: o.reportedValue,
              newValue,
              previousStatus: o.approvalStatus,
              newStatus: 'approved' as const,
              reason,
            };
            return {
              ...o,
              reportedValue: newValue,
              updatedAt: today(),
              sourceCitation: newSourceRef
                ? { ...o.sourceCitation, pageOrRow: newSourceRef, originalAvailable: true }
                : o.sourceCitation,
              revisionHistory: [...o.revisionHistory, rev],
              reviewerComments: [
                ...o.reviewerComments,
                {
                  id: `rc-corr-${Date.now()}`,
                  date: today(),
                  author: actor,
                  role: prev.activeRole,
                  action: 'corrected',
                  text: `Post-approval correction (${o.reportedValue} → ${newValue}): ${reason}`,
                },
              ],
            };
          }),
        }));
        notify('Approved result corrected. Previous version preserved in revision history and frozen handovers remain unchanged.');
      },

      addIndependentNote: (obsId, status, note, discrepancyFlag, pushToQuestionId) => {
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;
        setState((prev) => {
          const obs = prev.observations.find((o) => o.id === obsId);
          const ind = prev.indicators.find((i) => i.id === obs?.indicatorId);
          const nextObs = prev.observations.map((o) =>
            o.id === obsId
              ? {
                  ...o,
                  verificationStatus: status,
                  independentNotes: [
                    {
                      id: `in-${Date.now()}`,
                      date: today(),
                      author: actor,
                      status,
                      note,
                      discrepancyFlag,
                      pushedToEvalPlanQuestionId: pushToQuestionId,
                    },
                    ...o.independentNotes,
                  ],
                }
              : o
          );

          let nextQuestions = prev.evaluationQuestions;
          if (pushToQuestionId) {
            nextQuestions = prev.evaluationQuestions.map((q) =>
              q.id === pushToQuestionId
                ? {
                    ...q,
                    readiness: discrepancyFlag ? ('needs_independent_validation' as EvalReadiness) : q.readiness,
                    status: 'Fieldwork Planned' as const,
                    owner: actor,
                    remainingGaps: `${q.remainingGaps} | Evaluator Flag (${ind?.code || obsId}): ${note}`,
                    assignedFollowUpNote: `Flagged ${today()} by ${actor}: ${note}`,
                  }
                : q
            );
          }

          return { ...prev, observations: nextObs, evaluationQuestions: nextQuestions };
        });
        notify(
          pushToQuestionId
            ? 'Independent verification note logged (implementation record untouched) and follow-up pushed to Evaluation Plan.'
            : 'Independent verification note logged without modifying implementation record.'
        );
      },

      importSurveyResult: (rec) => {
        const created: SurveyResultRecord = { ...rec, id: `sres-${Date.now()}` };
        setState((prev) => ({ ...prev, surveyResults: [created, ...prev.surveyResults] }));
        notify(
          rec.denominatorCheckStatus !== 'valid' || rec.periodCheckStatus !== 'valid'
            ? 'Aggregate survey result imported with period/denominator check warning.'
            : 'Aggregate survey result imported and queued for approval.',
          rec.denominatorCheckStatus !== 'valid' ? 'warning' : 'success'
        );
      },

      approveSurveyResult: (surveyResultId) => {
        const sr = state.surveyResults.find((s) => s.id === surveyResultId);
        if (!sr) return;
        const ind = state.indicators.find((i) => i.id === sr.indicatorId);
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;
        const newObsId = sr.linkedObservationId || `obs-srv-${Date.now()}`;

        setState((prev) => {
          const exists = prev.observations.some((o) => o.id === newObsId);
          const nextObs = exists
            ? prev.observations.map((o) =>
                o.id === newObsId
                  ? {
                      ...o,
                      reportedValue: sr.value,
                      denominator: sr.denominator,
                      approvalStatus: 'approved' as const,
                      updatedAt: today(),
                    }
                  : o
              )
            : [
                {
                  id: newObsId,
                  projectId: sr.projectId,
                  indicatorId: sr.indicatorId,
                  period: sr.period,
                  partner: prev.projects[sr.projectId].partners[0],
                  location: sr.location,
                  sector: ind?.sector || prev.projects[sr.projectId].sectors[0],
                  reportedValue: sr.value,
                  unit: ind?.unit || sr.unit,
                  denominator: sr.denominator,
                  denominatorLabel: `Survey aggregate sample (${sr.populationGroup})`,
                  breakdownSummary: sr.populationGroup,
                  narrative: `Approved from Surveys & Assessments (${sr.sourceCitation.documentName} · ${sr.sourceCitation.sectionOrTab}).`,
                  provenance: sr.provenance,
                  sourceCitation: sr.sourceCitation,
                  approvalStatus: 'approved' as const,
                  verificationStatus: 'unverified' as const,
                  reviewerComments: [
                    {
                      id: `rc-sr-${Date.now()}`,
                      date: today(),
                      author: actor,
                      role: prev.activeRole,
                      action: 'approved' as const,
                      text: `Approved aggregate survey result (${sr.value}${sr.unit}, n=${sr.denominator ?? 'missing'}) and linked to source.`,
                    },
                  ],
                  independentNotes: [],
                  revisionHistory: [
                    {
                      version: 1,
                      date: today(),
                      changedBy: actor,
                      previousValue: null,
                      newValue: sr.value,
                      previousStatus: 'submitted' as const,
                      newStatus: 'approved' as const,
                      reason: 'Approved from Surveys & Assessments module.',
                    },
                  ],
                  createdAt: today(),
                  updatedAt: today(),
                },
                ...prev.observations,
              ];

          return {
            ...prev,
            surveyResults: prev.surveyResults.map((x) =>
              x.id === surveyResultId
                ? { ...x, approvalStatus: 'approved', linkedObservationId: newObsId }
                : x
            ),
            observations: nextObs,
          };
        });
        notify('Survey finding approved and linked directly to indicator & source citation.');
      },

      createCorrectiveAction: (action) => {
        const created: CorrectiveAction = {
          ...action,
          id: `ca-${Date.now()}`,
          status: 'open',
          createdAt: today(),
        };
        setState((prev) => ({ ...prev, correctiveActions: [created, ...prev.correctiveActions] }));
        notify(`Corrective action assigned to ${action.owner} (Due ${action.dueDate}).`);
      },

      submitActionClosureEvidence: (actionId, evidenceRef, closureNote) => {
        setState((prev) => ({
          ...prev,
          correctiveActions: prev.correctiveActions.map((a) =>
            a.id === actionId
              ? { ...a, status: 'evidence_submitted', closureEvidenceRef: evidenceRef, closureNote }
              : a
          ),
        }));
        notify('Closure evidence submitted — awaiting M&E Reviewer verification.');
      },

      verifyAndCloseAction: (actionId) => {
        const actor = ROLE_DEFINITIONS[state.activeRole].actorName;
        setState((prev) => {
          const target = prev.correctiveActions.find((a) => a.id === actionId);
          const nextActions = prev.correctiveActions.map((a) =>
            a.id === actionId
              ? { ...a, status: 'closed' as const, verifiedBy: actor, verifiedAt: today() }
              : a
          );
          // If action resolved missing evidence on an activity, mark evidence issue resolved & register contracts on file
          let nextActivities = prev.activities;
          let nextRegisterRows = prev.registerRows;
          if (target?.linkedActivityId && target.category === 'Missing Evidence') {
            nextActivities = prev.activities.map((act) =>
              act.id === target.linkedActivityId
                ? {
                    ...act,
                    issues: act.issues.map((iss) =>
                      iss.category === 'Evidence Gap' ? { ...iss, resolved: true } : iss
                    ),
                    attachedEvidenceIds:
                      act.attachedEvidenceIds.length < act.evidenceRequirements.length
                        ? [...act.attachedEvidenceIds, `verified-${actionId}`]
                        : act.attachedEvidenceIds,
                  }
                : act
            );
            nextRegisterRows = prev.registerRows.map((r) =>
              r.projectId === target.projectId && r.values.contractOnFile === 'Missing'
                ? { ...r, values: { ...r.values, contractOnFile: 'Yes' }, sourceRef: target.closureEvidenceRef || r.sourceRef }
                : r
            );
          }
          // Also clear evidenceMissing flag on linked delivery records
          let nextDeliveries = prev.deliveryRecords;
          if (target?.linkedActivityId && target.category === 'Missing Evidence') {
            nextDeliveries = prev.deliveryRecords.map((d) =>
              d.activityId === target.linkedActivityId ? { ...d, evidenceMissing: false } : d
            );
          }

          return {
            ...prev,
            correctiveActions: nextActions,
            activities: nextActivities,
            registerRows: nextRegisterRows,
            deliveryRecords: nextDeliveries,
          };
        });
        notify('Corrective action verified with evidence and closed.');
      },

      addDocument: (doc) => {
        const created: ProjectDocument = { ...doc, id: `doc-${Date.now()}` };
        setState((prev) => ({ ...prev, documents: [created, ...prev.documents] }));
        notify(`Added "${created.title}" to the Project Evidence Knowledge Base.`);
      },

      addLearningEntry: (entry) => {
        const created: LearningEntry = { ...entry, id: `lrn-${Date.now()}` };
        setState((prev) => ({ ...prev, learningEntries: [created, ...prev.learningEntries] }));
        notify('Qualitative learning entry added to the Knowledge Base.');
      },

      toggleLearningInReport: (entryId) => {
        setState((prev) => ({
          ...prev,
          learningEntries: prev.learningEntries.map((l) =>
            l.id === entryId ? { ...l, usedInReport: !l.usedInReport } : l
          ),
        }));
      },

      updateEvaluationQuestion: (questionId, patch) => {
        setState((prev) => ({
          ...prev,
          evaluationQuestions: prev.evaluationQuestions.map((q) =>
            q.id === questionId ? { ...q, ...patch } : q
          ),
        }));
        notify('Evaluation plan question updated.');
      },

      addEvaluationQuestion: (q) => {
        const created: EvaluationQuestion = { ...q, id: `eq-${Date.now()}` };
        setState((prev) => ({ ...prev, evaluationQuestions: [...prev.evaluationQuestions, created] }));
        notify(`Added ${created.code} to the Evaluation Plan.`);
      },

      updateFindingResponse: (findingId, managementResponse, managementStatus) => {
        setState((prev) => ({
          ...prev,
          evaluatorFindings: prev.evaluatorFindings.map((f) =>
            f.id === findingId ? { ...f, managementResponse, managementStatus } : f
          ),
        }));
        notify('Management response saved.');
      },

      createHandoverSnapshot: (label, notes) => {
        const pid = state.activeProjectId;
        const projIndicators = state.indicators.filter((i) => i.projectId === pid);
        const approvedIndicators: HandoverSnapshot['approvedIndicators'] = [];

        for (const ind of projIndicators) {
          const calc = computeIndicatorState(state, ind);
          if (calc.latestApprovedObs && calc.approvedValue !== null) {
            approvedIndicators.push({
              indicatorId: ind.id,
              code: ind.code,
              title: ind.title,
              unit: ind.unit,
              period: calc.latestApprovedObs.period,
              approvedValue: calc.approvedValue,
              observationId: calc.latestApprovedObs.id,
              sourceRef: `${calc.latestApprovedObs.sourceCitation.documentName} · ${calc.latestApprovedObs.sourceCitation.sectionOrTab} · ${calc.latestApprovedObs.sourceCitation.pageOrRow}`,
              provenance: calc.latestApprovedObs.provenance,
              verificationStatus: calc.latestApprovedObs.verificationStatus,
            });
          }
        }

        const checks = scanRecurringChecks(state, pid);
        const questions = state.evaluationQuestions.filter((q) => q.projectId === pid);

        const snap: HandoverSnapshot = {
          id: `snap-${Date.now()}`,
          projectId: pid,
          label,
          createdAt: nowStamp(),
          createdBy: ROLE_DEFINITIONS[state.activeRole].actorName,
          notes,
          frameworkCount: state.resultsNodes.filter((n) => n.projectId === pid).length,
          approvedIndicators,
          unresolvedIssues: checks.slice(0, 6).map((c) => `${c.category}: ${c.title}`),
          evaluationQuestions: questions.map((q) => ({
            code: q.code,
            question: q.question,
            readiness: q.readiness,
            proposedMethod: q.proposedMethod,
          })),
          suggestedFieldwork: questions
            .filter((q) => q.readiness === 'needs_new_fieldwork' || q.readiness === 'needs_independent_validation')
            .map((q) => `${q.code}: ${q.proposedMethod}`),
        };

        setState((prev) => ({
          ...prev,
          handoverSnapshots: [snap, ...prev.handoverSnapshots],
        }));
        notify(`Issued dated Evaluator Handover Snapshot "${snap.label}". Future corrections will not overwrite this snapshot.`);
        return snap;
      },

      updateReportNarrative: (templateId, sectionId, body) => {
        const key = `${state.activeProjectId}::${templateId}`;
        setState((prev) => ({
          ...prev,
          reportNarratives: {
            ...prev.reportNarratives,
            [key]: {
              ...(prev.reportNarratives[key] || {}),
              [sectionId]: body,
            },
          },
        }));
      },

      updateIndicator: (indicatorId, patch) => {
        setState((prev) => ({
          ...prev,
          indicators: prev.indicators.map((i) => (i.id === indicatorId ? { ...i, ...patch } : i)),
        }));
        notify('Indicator specification updated.');
      },

      updateProjectSettings: (projectId, patch) => {
        setState((prev) => ({
          ...prev,
          projects: {
            ...prev.projects,
            [projectId]: {
              ...prev.projects[projectId],
              ...patch,
            },
          },
        }));
        notify('Project configuration updated and propagated across filters, forms, and reports.');
      },
    }),
    [state, activeProject, roleMeta, inspector, toasts]
  );

  return <MealContext.Provider value={value}>{children}</MealContext.Provider>;
};

export function useMeal() {
  const ctx = useContext(MealContext);
  if (!ctx) throw new Error('useMeal must be used within MealProvider');
  return ctx;
}
