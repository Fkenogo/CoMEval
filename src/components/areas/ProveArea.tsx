import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileWarning,
  GitBranch,
  History,
  Lock,
  MessageSquarePlus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';
import {
  extractActivityMappedValue,
  extractIndicatorInputsFromMeasurement,
  getActiveApprovedPlanVersion,
  hasPendingCorrectionRevision,
  validateActivityRecord,
  validateMeasurementRecord,
} from '../../lib/engine';
import { ActivityRecord, EvidenceAttachment, MeasurementRecord, RecordStatus } from '../../types/miledge';
import { AttachmentPreviewModal, EvidenceManager } from '../shared/EvidenceAttachments';
import { MetaRow, ProvenanceLabel, StatusLabel } from '../shared/StatusLabels';

type QueueItem =
  | {
      kind: 'activity';
      id: string;
      record: ActivityRecord;
      title: string;
      subtitle: string;
      date: string;
      status: RecordStatus;
      missingEvidence: boolean;
      errorCount: number;
      warningCount: number;
      canVerify: boolean;
    }
  | {
      kind: 'measurement';
      id: string;
      record: MeasurementRecord;
      title: string;
      subtitle: string;
      date: string;
      status: RecordStatus;
      missingEvidence: boolean;
      errorCount: number;
      warningCount: number;
      canVerify: boolean;
    };

export const ProveArea: React.FC = () => {
  const {
    state,
    activeProject,
    activeApprovedPlan,
    roleDef,
    transitionRecordStatus,
    attachEvidenceToRecord,
    removeEvidenceFromRecord,
    createActivityRevision,
    createMeasurementRevision,
    addLearningItem,
    setActiveArea,
  } = useMiledge();

  const plan = activeApprovedPlan?.plan || activeProject.draftPlan;

  const [statusFilter, setStatusFilter] = useState<'all' | 'attention' | RecordStatus>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'activity' | 'measurement'>('all');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [reviewNote, setReviewNote] = useState('');
  const [previewAtt, setPreviewAtt] = useState<EvidenceAttachment | null>(null);

  // Separate Independent Evaluation Finding composer (distinct from internal verification)
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [evalTitle, setEvalTitle] = useState('');
  const [evalSummary, setEvalSummary] = useState('');
  const [evalRec, setEvalRec] = useState('');

  const allQueueItems = useMemo<QueueItem[]>(() => {
    const projActs = state.activityRecords.filter((r) => r.projectId === activeProject.id);
    const projMeas = state.measurementRecords.filter((r) => r.projectId === activeProject.id);

    const actItems: QueueItem[] = projActs.map((r) => {
      const val = validateActivityRecord(r, projActs);
      return {
        kind: 'activity',
        id: r.id,
        record: r,
        title: r.activityNameSnapshot,
        subtitle: `${r.siteNameSnapshot} · Plan ${r.planVersionLabel} · Rev ${r.revision}`,
        date: r.date,
        status: r.status,
        missingEvidence: val.missingEvidenceFlag,
        errorCount: val.validationErrors.length,
        warningCount: val.warnings.length,
        canVerify: val.canVerify,
      };
    });

    const measItems: QueueItem[] = projMeas.map((r) => {
      const indDef = plan.indicators.find((i) => i.id === r.indicatorId);
      const val = validateMeasurementRecord(r, projMeas, indDef);
      return {
        kind: 'measurement',
        id: r.id,
        record: r,
        title: `${r.indicatorCodeSnapshot} · ${r.indicatorNameSnapshot}`,
        subtitle: `${r.siteNameSnapshot} · Plan ${r.planVersionLabel} · Rev ${r.revision}`,
        date: r.observationDate,
        status: r.status,
        missingEvidence: val.missingEvidenceFlag,
        errorCount: val.validationErrors.length,
        warningCount: val.warnings.length,
        canVerify: val.canVerify,
      };
    });

    const merged = [...actItems, ...measItems].filter((item) =>
      roleDef.approvedOnlyView ? item.status === 'approved' : true
    );

    const statusPriority: Record<RecordStatus, number> = {
      submitted: 0,
      returned: 1,
      verified: 2,
      draft: 3,
      approved: 4,
    };

    return merged.sort((a, b) => {
      if (a.missingEvidence !== b.missingEvidence) return a.missingEvidence ? -1 : 1;
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      return b.date.localeCompare(a.date);
    });
  }, [state.activityRecords, state.measurementRecords, activeProject.id, plan.indicators, roleDef.approvedOnlyView]);

  const filteredItems = useMemo(() => {
    return allQueueItems.filter((item) => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
      if (statusFilter === 'attention') {
        return item.status === 'submitted' || item.status === 'returned' || item.missingEvidence;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [allQueueItems, kindFilter, statusFilter]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedKey('');
      return;
    }
    const stillExists = filteredItems.some((i) => `${i.kind}:${i.id}` === selectedKey);
    if (!stillExists) {
      setSelectedKey(`${filteredItems[0].kind}:${filteredItems[0].id}`);
    }
  }, [filteredItems, selectedKey]);

  const selectedItem = filteredItems.find((i) => `${i.kind}:${i.id}` === selectedKey) || null;

  const selectedValidation = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.kind === 'activity') {
      return validateActivityRecord(
        selectedItem.record,
        state.activityRecords.filter((r) => r.projectId === activeProject.id)
      );
    }
    const indDef = plan.indicators.find((i) => i.id === selectedItem.record.indicatorId);
    return validateMeasurementRecord(
      selectedItem.record,
      state.measurementRecords.filter((r) => r.projectId === activeProject.id),
      indDef
    );
  }, [selectedItem, state.activityRecords, state.measurementRecords, activeProject.id, plan.indicators]);

  const counts = useMemo(() => {
    return {
      total: allQueueItems.length,
      submitted: allQueueItems.filter((i) => i.status === 'submitted').length,
      returned: allQueueItems.filter((i) => i.status === 'returned').length,
      missingEv: allQueueItems.filter((i) => i.missingEvidence).length,
      verified: allQueueItems.filter((i) => i.status === 'verified').length,
      approved: allQueueItems.filter((i) => i.status === 'approved').length,
    };
  }, [allQueueItems]);

  const handleTransition = (nextStatus: RecordStatus) => {
    if (!selectedItem) return;
    const res = transitionRecordStatus(selectedItem.kind, selectedItem.id, nextStatus, reviewNote);
    if (res.ok) {
      setReviewNote('');
    }
  };

  const handleCreateCorrection = () => {
    if (!selectedItem) return;
    if (selectedItem.kind === 'activity') {
      const created = createActivityRevision(selectedItem.id);
      if (created) setActiveArea('do');
    } else {
      const created = createMeasurementRevision(selectedItem.id);
      if (created) setActiveArea('measure');
    }
  };

  const handleLogIndependentFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !evalTitle.trim() || !evalSummary.trim()) return;
    addLearningItem({
      projectId: activeProject.id,
      kind: 'evaluation_finding',
      title: evalTitle.trim(),
      summary: evalSummary.trim(),
      isIndependentEvaluation: true,
      linkedRecordType: selectedItem.kind,
      linkedRecordId: selectedItem.id,
      linkedIndicatorId: selectedItem.kind === 'measurement' ? selectedItem.record.indicatorId : undefined,
      sourceReference: `Independent evaluation review of ${selectedItem.title} (${selectedItem.date}, Rev ${selectedItem.record.revision})`,
      provenance: 'synthetic_demo',
      recommendation: evalRec.trim(),
    });
    setEvalTitle('');
    setEvalSummary('');
    setEvalRec('');
    setShowEvalForm(false);
  };

  const activeApproved = getActiveApprovedPlanVersion(activeProject);

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="bg-white border border-[#E2E6E2] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#14191F] tracking-tight">
            Prove · Evidence &amp; Verification Queue
          </h1>
          <p className="text-xs text-[#525D68] mt-1">
            Inspect records alongside supporting evidence, enforce evidence requirements before verification, and keep internal approval distinct from independent evaluation findings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div>
            <span className="text-[#525D68]">Submitted: </span>
            <strong className="font-mono tabular-nums text-[#B45309]">{counts.submitted}</strong>
          </div>
          <div>
            <span className="text-[#525D68]">Missing evidence: </span>
            <strong className="font-mono tabular-nums text-[#B91C1C]">{counts.missingEv}</strong>
          </div>
          <div>
            <span className="text-[#525D68]">Returned: </span>
            <strong className="font-mono tabular-nums text-[#B91C1C]">{counts.returned}</strong>
          </div>
          <div>
            <span className="text-[#525D68]">Verified: </span>
            <strong className="font-mono tabular-nums text-[#14532D]">{counts.verified}</strong>
          </div>
          <div>
            <span className="text-[#525D68]">Approved: </span>
            <strong className="font-mono tabular-nums text-[#15803D]">{counts.approved}</strong>
          </div>
        </div>
      </div>

      {roleDef.approvedOnlyView && (
        <div className="rounded-lg border border-[#C5E5CD] bg-[#EBF7EE] px-4 py-2.5 text-xs text-[#14532D]">
          <strong>Donor (Approved Only) view:</strong> Only approved records and their linked evidence are visible. Drafts, returns, and pending revisions are hidden.
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border border-[#E2E6E2] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { id: 'all', label: `All (${counts.total})` },
              { id: 'attention', label: `Needs attention (${counts.submitted + counts.returned})` },
              { id: 'submitted', label: 'Submitted' },
              { id: 'returned', label: 'Returned' },
              { id: 'verified', label: 'Verified' },
              { id: 'approved', label: 'Approved' },
              { id: 'draft', label: 'Draft' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`min-h-[34px] px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === f.id
                  ? 'bg-[#14532D] text-white'
                  : 'text-[#525D68] hover:bg-[#F6F7F5] hover:text-[#14191F]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {(
            [
              { id: 'all', label: 'All types' },
              { id: 'activity', label: 'Activities (Do)' },
              { id: 'measurement', label: 'Measurements (Measure)' },
            ] as const
          ).map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKindFilter(k.id)}
              className={`min-h-[34px] px-2.5 py-1 rounded-md font-medium border transition-colors ${
                kindFilter === k.id
                  ? 'border-[#14532D] bg-[#EBF7EE] text-[#14532D]'
                  : 'border-[#E2E6E2] bg-white text-[#525D68] hover:text-[#14191F]'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main split: Queue list (left) + Side-by-side Record & Evidence Inspector (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Queue */}
        <div className="xl:col-span-4 bg-white border border-[#E2E6E2] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E6E2] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#525D68]">
              Review Queue ({filteredItems.length})
            </span>
            {activeApproved && (
              <span className="text-[11px] font-mono text-[#525D68]">
                Active Plan {activeApproved.versionLabel}
              </span>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-6 text-xs text-[#525D68] text-center">
              No records match the current filter for {activeProject.shortName}.
            </div>
          ) : (
            <ul className="divide-y divide-[#E2E6E2] max-h-[700px] overflow-y-auto">
              {filteredItems.map((item) => {
                const key = `${item.kind}:${item.id}`;
                const isSelected = key === selectedKey;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKey(key);
                        setReviewNote('');
                        setShowEvalForm(false);
                      }}
                      className={`w-full text-left px-4 py-3 transition-colors space-y-1 ${
                        isSelected ? 'bg-[#EBF7EE]' : 'hover:bg-[#F6F7F5]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-[#14191F] leading-snug">
                          {item.title}
                        </span>
                        <span className="text-[11px] font-mono text-[#525D68] shrink-0">
                          {item.date}
                        </span>
                      </div>
                      <MetaRow
                        items={[
                          item.kind === 'activity' ? 'Activity' : 'Measurement',
                          <StatusLabel key="st" status={item.status} />,
                          `Rev ${item.record.revision}`,
                          item.record.siteNameSnapshot,
                        ]}
                      />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                        <ProvenanceLabel provenance={item.record.provenance} />
                        {item.missingEvidence && (
                          <span className="font-semibold text-[#B91C1C]">
                            Missing required evidence
                          </span>
                        )}
                        {item.errorCount > 0 && (
                          <span className="font-semibold text-[#B91C1C]">
                            {item.errorCount} validation error(s)
                          </span>
                        )}
                        {item.warningCount > 0 && (
                          <span className="font-medium text-[#B45309]">Duplicate check</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right Side-by-Side Record + Evidence Inspector */}
        <div className="xl:col-span-8">
          {!selectedItem || !selectedValidation ? (
            <div className="bg-white border border-[#E2E6E2] rounded-xl p-8 text-center text-sm text-[#525D68]">
              Select a record from the queue to inspect its answers, validation checks, and supporting evidence.
            </div>
          ) : (
            <div className="bg-white border border-[#E2E6E2] rounded-xl overflow-hidden">
              {/* Inspector Header */}
              <div className="px-5 py-4 bg-[#14532D] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/80 font-medium">
                    {selectedItem.kind === 'activity' ? 'Activity Record (Do)' : 'Measurement Record (Measure)'} · Plan{' '}
                    {selectedItem.record.planVersionLabel} · Revision {selectedItem.record.revision}
                  </div>
                  <h2 className="text-base font-bold mt-0.5">{selectedItem.title}</h2>
                </div>
                <div className="text-xs text-right">
                  <div className="font-mono">{selectedItem.date}</div>
                  <div className="text-white/85">{selectedItem.record.siteNameSnapshot}</div>
                </div>
              </div>

              {/* Pending correction revision notice on an approved record */}
              {selectedItem.status === 'approved' &&
                hasPendingCorrectionRevision(
                  selectedItem.kind === 'activity' ? state.activityRecords : state.measurementRecords,
                  selectedItem.record.recordGroupId
                ) && (
                  <div className="px-5 py-2.5 bg-[#FEF3C7] border-b border-[#E2E6E2] text-xs text-[#92400E]">
                    A newer unapproved correction revision exists for this record group. Live reports continue using this approved Rev {selectedItem.record.revision} and its locked evidence until the replacement revision is approved.
                  </div>
                )}

              {/* Supersedes comparison callout when inspecting a correction revision (Rev > 1) */}
              {selectedItem.record.revision > 1 && selectedItem.status !== 'approved' && (
                <div className="px-5 py-2.5 bg-[#EBF7EE] border-b border-[#C5E5CD] text-xs text-[#14532D]">
                  <strong>Correction Revision Rev {selectedItem.record.revision}:</strong> Changes to answers or supporting evidence happen here while the previously approved revision remains live in Report until Rev {selectedItem.record.revision} is approved. Already issued reports retain their frozen original snapshot permanently.
                </div>
              )}

              {/* Two-column body: Record Data (left) + Supporting Evidence (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E6E2]">
                {/* Left Column: Record Data & Validation */}
                <div className="lg:col-span-7 p-5 space-y-5">
                  {/* Status & Provenance Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E6E2]">
                    <MetaRow
                      items={[
                        <span key="s">
                          Status: <StatusLabel status={selectedItem.status} />
                        </span>,
                        <ProvenanceLabel key="p" provenance={selectedItem.record.provenance} />,
                        `Captured by ${selectedItem.record.createdBy}`,
                      ]}
                    />
                  </div>

                  {/* Separated Validation Checks vs Missing Evidence */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#525D68]">
                      Automated Checks
                    </div>

                    {/* Data validation errors */}
                    {selectedValidation.validationErrors.length > 0 ? (
                      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 space-y-1 text-xs text-[#B91C1C]">
                        <div className="font-semibold flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          Data Validation Errors ({selectedValidation.validationErrors.length})
                        </div>
                        {selectedValidation.validationErrors.map((err, idx) => (
                          <div key={idx}>• {err.message}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[#15803D]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Data fields pass required, range, date, and ratio validation checks.</span>
                      </div>
                    )}

                    {/* Missing Evidence (Explicitly separated from validation errors per Clarification 3) */}
                    {selectedValidation.missingEvidenceFlag ? (
                      <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <FileWarning className="w-4 h-4 shrink-0 text-[#B45309]" />
                          Missing Required Evidence — Verification Blocked
                        </div>
                        <p>{selectedValidation.missingEvidenceMessage}</p>
                        <p className="text-[11px] text-[#78350F]">
                          Policy: Records may be submitted without evidence so field teams are not blocked, but evidence must be attached before Verification. Return the record to attach evidence and resubmit.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[#15803D]">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>
                          Evidence check satisfied ({selectedItem.record.evidence.length} attachment/reference(s)).
                        </span>
                      </div>
                    )}

                    {/* Warnings / likely duplicate */}
                    {selectedValidation.warnings.length > 0 && (
                      <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          Review Warnings
                        </div>
                        {selectedValidation.warnings.map((w, idx) => (
                          <div key={idx}>• {w.message}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preserved Question Snapshot Answers (Clarification 1) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#525D68]">
                        Recorded Answers (Snapshot from Plan {selectedItem.record.planVersionLabel})
                      </span>
                    </div>
                    <div className="rounded-lg border border-[#C5E5CD] bg-[#EBF7EE] p-3.5 space-y-2.5">
                      {selectedItem.record.questionSnapshot.length === 0 ? (
                        <div className="text-xs text-[#525D68]">No configured questions on this record.</div>
                      ) : (
                        selectedItem.record.questionSnapshot.map((q) => {
                          const ans = selectedItem.record.answers[q.id];
                          const display =
                            ans === undefined || ans === ''
                              ? '—'
                              : typeof ans === 'boolean'
                              ? ans
                                ? 'Yes'
                                : 'No'
                              : String(ans);
                          return (
                            <div
                              key={q.id}
                              className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-[#C5E5CD]/70 last:border-b-0 pb-2 last:pb-0 text-xs"
                            >
                              <div className="text-[#14191F] font-medium">
                                {q.label}
                                {q.indicatorMapping && (
                                  <span className="ml-1.5 text-[11px] font-mono text-[#14532D]">
                                    [{q.indicatorMapping.role}]
                                  </span>
                                )}
                              </div>
                              <div className="font-mono font-semibold text-[#14532D] tabular-nums">
                                {display}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Computed summary inside snapshot box */}
                      {selectedItem.kind === 'activity' && (() => {
                        const actDef = plan.activities.find((a) => a.id === selectedItem.record.activityId);
                        const mapped = extractActivityMappedValue(selectedItem.record, undefined, actDef);
                        return (
                          <div className="pt-2 border-t border-[#C5E5CD] text-xs flex flex-wrap items-center justify-between gap-2 text-[#14532D]">
                            <span>
                              {actDef?.deliveryCountingMode === 'count_events'
                                ? 'Event-count contribution:'
                                : `Delivered quantity (${actDef?.unit || 'mapped'}):`}
                            </span>
                            <strong className="font-mono tabular-nums">
                              {mapped !== null
                                ? `${mapped}${actDef ? ` ${actDef.unit}` : ''}`
                                : 'Missing quantity'}
                            </strong>
                          </div>
                        );
                      })()}

                      {selectedItem.kind === 'measurement' && (() => {
                        const indDef = plan.indicators.find((i) => i.id === selectedItem.record.indicatorId);
                        const ext = extractIndicatorInputsFromMeasurement(selectedItem.record, indDef);
                        return (
                          <div className="pt-2 border-t border-[#C5E5CD] text-xs flex flex-wrap items-center justify-between gap-2 text-[#14532D]">
                            <span>Extracted indicator result:</span>
                            <strong className="font-mono tabular-nums">
                              {ext.calculatedRate !== null
                                ? `${ext.numerator} ÷ ${ext.denominator} = ${ext.calculatedRate}%`
                                : ext.singleValue !== null
                                ? `${ext.singleValue} ${selectedItem.record.indicatorUnitSnapshot}`
                                : ext.categoryValue || 'Missing / Incomplete denominator'}
                            </strong>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Participation details for activities */}
                    {selectedItem.kind === 'activity' && selectedItem.record.participantModeUsed !== 'none' && (
                      <div className="text-xs text-[#525D68] bg-[#F6F7F5] border border-[#E2E6E2] rounded-lg p-3 space-y-1">
                        <div className="font-semibold text-[#14191F]">
                          Participation ({selectedItem.record.participantModeUsed === 'registry' ? 'Synthetic ID Registry' : 'Aggregate Count'})
                        </div>
                        {selectedItem.record.participantModeUsed === 'registry' && selectedItem.record.participantIds ? (
                          <div className="font-mono text-[11px] break-all">
                            {selectedItem.record.participantIds.length} synthetic IDs: {selectedItem.record.participantIds.join(', ')}
                          </div>
                        ) : (
                          <div className="font-mono">
                            Aggregate count: {selectedItem.record.participantCount ?? 0}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Study metadata & CSV provenance for measurements */}
                    {selectedItem.kind === 'measurement' && selectedItem.record.studyMetadata?.isStudyOrSurvey && (
                      <div className="text-xs text-[#525D68] bg-[#F6F7F5] border border-[#E2E6E2] rounded-lg p-3 space-y-1">
                        <div className="font-semibold text-[#14191F]">
                          Survey / Study Round: {selectedItem.record.studyMetadata.studyRound}
                        </div>
                        <div>Method: {selectedItem.record.studyMetadata.method}</div>
                        <div>Population: {selectedItem.record.studyMetadata.population}</div>
                        <div>Fieldwork: {selectedItem.record.studyMetadata.fieldworkDates}</div>
                        <div className="font-mono text-[11px]">Source: {selectedItem.record.studyMetadata.sourceCitation}</div>
                      </div>
                    )}

                    {selectedItem.kind === 'measurement' && selectedItem.record.csvImportRef && (
                      <div className="text-xs text-[#525D68] font-mono bg-[#F6F7F5] border border-[#E2E6E2] rounded-lg px-3 py-2">
                        CSV Import Provenance: {selectedItem.record.csvImportRef.fileName} (Row {selectedItem.record.csvImportRef.rowNumber})
                      </div>
                    )}

                    {selectedItem.record.notes && (
                      <div className="text-xs text-[#14191F] bg-[#F6F7F5] border border-[#E2E6E2] rounded-lg p-3">
                        <span className="font-semibold text-[#525D68] block mb-0.5">Field / Technical Notes</span>
                        {selectedItem.record.notes}
                      </div>
                    )}
                  </div>

                  {/* Decision History */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#525D68] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Audit &amp; Decision History ({selectedItem.record.decisionHistory.length})
                    </div>
                    <ol className="space-y-2 border-l border-[#E2E6E2] ml-1.5 pl-3.5 text-xs">
                      {selectedItem.record.decisionHistory.map((d) => (
                        <li key={d.id} className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <strong className="text-[#14191F] capitalize">{d.action.replace('_', ' ')}</strong>
                            <span className="text-[#525D68]">{d.actor}</span>
                            <span className="font-mono text-[11px] text-[#525D68]">{d.at}</span>
                          </div>
                          <div className="text-[#525D68]">{d.note}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Right Column: Supporting Evidence & Verification Actions */}
                <div className="lg:col-span-5 p-5 space-y-5 bg-[#F6F7F5]/50">
                  {/* Evidence List */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#525D68]">
                      Supporting Evidence ({selectedItem.record.evidence.length})
                    </div>
                    <div className="text-xs text-[#525D68]">
                      Requirement:{' '}
                      <strong className="text-[#14191F]">
                        {selectedItem.record.evidenceRequirementSnapshot.label}
                      </strong>{' '}
                      ({selectedItem.record.evidenceRequirementSnapshot.required ? 'Required' : 'Optional'})
                    </div>

                    {selectedItem.status === 'approved' && (
                      <div className="rounded-lg border border-[#C5E5CD] bg-[#EBF7EE] px-3 py-2 text-[11px] text-[#14532D] flex items-start gap-2">
                        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Approved Rev {selectedItem.record.revision} evidence locked:</strong> Supporting evidence and answers on approved revisions are preserved permanently. Use <strong>Create correction revision</strong> below to add or replace evidence.
                        </span>
                      </div>
                    )}

                    {selectedItem.record.evidence.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#C5C9C2] bg-white p-4 text-xs text-[#525D68] text-center">
                        No evidence attached to this record yet.
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg bg-white text-xs">
                        {selectedItem.record.evidence.map((att) => (
                          <li key={att.id} className="p-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-medium text-[#14191F] break-words">{att.name}</div>
                              {att.sourceRefText && (
                                <div className="text-[11px] text-[#525D68]">{att.sourceRefText}</div>
                              )}
                              <div className="text-[11px] text-[#525D68]">
                                {att.uploadedBy} · {att.uploadedAt}
                                {att.dataUrl && !att.simulated ? ' · Persisted locally' : ''}
                                {att.simulated ? ' · Simulated sample' : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewAtt(att)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#C5E5CD] bg-[#EBF7EE] text-[#14532D] font-semibold hover:bg-[#D9F0DF]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Open
                              </button>
                              {(selectedItem.status === 'returned' || selectedItem.status === 'draft') &&
                                roleDef.canCapture && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeEvidenceFromRecord(selectedItem.kind, selectedItem.id, att.id)
                                    }
                                    aria-label={`Remove ${att.name} from Rev ${selectedItem.record.revision}`}
                                    className="p-1.5 rounded-md text-[#525D68] hover:text-[#B91C1C] hover:bg-[#FEF2F2]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Allow attaching evidence directly here ONLY when record is returned or draft (never on approved) */}
                    {(selectedItem.status === 'returned' || selectedItem.status === 'draft') && roleDef.canCapture && (
                      <div className="pt-2 space-y-2">
                        <div className="text-xs font-semibold text-[#14532D]">
                          {selectedItem.record.revision > 1
                            ? `Update evidence on Correction Rev ${selectedItem.record.revision}`
                            : 'Attach missing evidence & resubmit'}
                        </div>
                        <EvidenceManager
                          buttonLabel={
                            selectedItem.record.revision > 1
                              ? `Add evidence to Rev ${selectedItem.record.revision}`
                              : 'Attach missing evidence'
                          }
                          attachments={[]}
                          sourceDocuments={plan.sourceDocuments}
                          actorName={roleDef.actorName}
                          onAdd={(att) => attachEvidenceToRecord(selectedItem.kind, selectedItem.id, att)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Internal Verification & Approval Controls */}
                  {!roleDef.approvedOnlyView && (
                    <div className="border-t border-[#E2E6E2] pt-4 space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#525D68] flex items-center gap-1.5">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Internal Verification &amp; Approval
                      </div>

                      {(selectedItem.status === 'submitted' ||
                        selectedItem.status === 'verified' ||
                        selectedItem.status === 'returned' ||
                        selectedItem.status === 'draft') && (
                        <div>
                          <label className="block text-xs font-medium text-[#14191F] mb-1">
                            Review / return / resubmission note
                          </label>
                          <textarea
                            rows={2}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder={
                              selectedItem.status === 'returned'
                                ? 'Note what evidence or correction was added before resubmitting...'
                                : 'Required if returning for correction; optional for verify/approve...'
                            }
                            className="w-full rounded-lg border border-[#C5C9C2] bg-white px-3 py-2 text-xs text-[#14191F]"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {/* Resubmit button for returned or draft records */}
                        {(selectedItem.status === 'returned' || selectedItem.status === 'draft') && roleDef.canCapture && (
                          <button
                            type="button"
                            onClick={() => handleTransition('submitted')}
                            disabled={!selectedValidation.canSubmit}
                            className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22] disabled:opacity-45"
                          >
                            Resubmit for verification
                          </button>
                        )}

                        {/* Verify button (blocked when missing evidence!) */}
                        {selectedItem.status === 'submitted' && roleDef.canVerify && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTransition('verified')}
                              disabled={!selectedValidation.canVerify}
                              className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22] disabled:opacity-45 disabled:cursor-not-allowed"
                            >
                              Verify record
                            </button>
                            {!selectedValidation.canVerify && selectedValidation.missingEvidenceFlag && (
                              <p className="text-[11px] text-[#B91C1C]">
                                Verify is disabled until required evidence is attached. Return this record first.
                              </p>
                            )}
                          </>
                        )}

                        {/* Approve button */}
                        {selectedItem.status === 'verified' && roleDef.canApproveRecord && (
                          <button
                            type="button"
                            onClick={() => handleTransition('approved')}
                            className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold hover:bg-[#14532D]"
                          >
                            Approve for live reporting
                          </button>
                        )}

                        {/* Return for correction button */}
                        {(selectedItem.status === 'submitted' || selectedItem.status === 'verified') &&
                          (roleDef.canVerify || roleDef.canApproveRecord) && (
                            <button
                              type="button"
                              onClick={() => handleTransition('returned')}
                              className="w-full min-h-[40px] px-4 py-2 rounded-lg border border-[#FECACA] bg-white text-[#B91C1C] text-xs font-semibold hover:bg-[#FEF2F2] inline-flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Return for correction
                            </button>
                          )}

                        {/* Create correction revision on approved records (Clarification 4) */}
                        {selectedItem.status === 'approved' && roleDef.canCapture && (
                          <button
                            type="button"
                            onClick={handleCreateCorrection}
                            className="w-full min-h-[40px] px-4 py-2 rounded-lg border border-[#14532D] bg-white text-[#14532D] text-xs font-semibold hover:bg-[#EBF7EE] inline-flex items-center justify-center gap-1.5"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            Create correction revision (Rev {selectedItem.record.revision + 1})
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Distinct Independent Evaluation Finding Action */}
                  {roleDef.canManageLearn && (
                    <div className="border-t border-[#E2E6E2] pt-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#525D68]">
                          Independent Evaluation (Separate from Approval)
                        </span>
                      </div>
                      {!showEvalForm ? (
                        <button
                          type="button"
                          onClick={() => setShowEvalForm(true)}
                          className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-[#C5C9C2] bg-white text-xs font-semibold text-[#14191F] hover:bg-[#F6F7F5] inline-flex items-center justify-center gap-1.5"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5 text-[#14532D]" />
                          Log independent evaluation finding
                        </button>
                      ) : (
                        <form
                          onSubmit={handleLogIndependentFinding}
                          className="rounded-lg border border-[#E2E6E2] bg-white p-3 space-y-2.5 text-xs"
                        >
                          <div className="text-[11px] text-[#525D68]">
                            Logs a finding in <strong>Learn</strong> linked to this record &amp; evidence without altering internal approval status.
                          </div>
                          <input
                            type="text"
                            required
                            value={evalTitle}
                            onChange={(e) => setEvalTitle(e.target.value)}
                            placeholder="Finding title (e.g. Borehole yield seasonal drop)"
                            className="w-full rounded-md border border-[#C5C9C2] px-2.5 py-1.5"
                          />
                          <textarea
                            rows={2}
                            required
                            value={evalSummary}
                            onChange={(e) => setEvalSummary(e.target.value)}
                            placeholder="What did the independent review find?"
                            className="w-full rounded-md border border-[#C5C9C2] px-2.5 py-1.5"
                          />
                          <input
                            type="text"
                            value={evalRec}
                            onChange={(e) => setEvalRec(e.target.value)}
                            placeholder="Recommended follow-up action (optional)"
                            className="w-full rounded-md border border-[#C5C9C2] px-2.5 py-1.5"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="min-h-[36px] px-3 py-1.5 rounded-md bg-[#14532D] text-white font-semibold"
                            >
                              Save to Learn
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowEvalForm(false)}
                              className="min-h-[36px] px-3 py-1.5 text-[#525D68]"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </div>
  );
};
