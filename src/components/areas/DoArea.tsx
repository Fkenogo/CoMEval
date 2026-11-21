import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardPlus,
  Edit3,
  FileCheck2,
  GitBranch,
  Plus,
} from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';
import {
  extractActivityMappedValue,
  validateActivityRecord,
} from '../../lib/engine';
import { ActivityRecord, EvidenceAttachment } from '../../types/miledge';
import { DynamicQuestionBlock } from '../shared/DynamicQuestionField';
import { EvidenceManager } from '../shared/EvidenceAttachments';
import { MetaRow, ProvenanceLabel, StatusLabel } from '../shared/StatusLabels';

export const DoArea: React.FC = () => {
  const {
    state,
    activeProject,
    activeApprovedPlan,
    roleDef,
    setActiveArea,
    saveActivityRecord,
    createActivityRevision,
  } = useMiledge();

  const plan = activeApprovedPlan?.plan || null;

  // Records scoped to active project (Donor sees approved only)
  const projectRecords = useMemo(
    () =>
      state.activityRecords.filter(
        (r) =>
          r.projectId === activeProject.id &&
          (!roleDef.approvedOnlyView || r.status === 'approved')
      ),
    [state.activityRecords, activeProject.id, roleDef.approvedOnlyView]
  );

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'returned'>('all');

  // Shared single-column capture form state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [isUnplanned, setIsUnplanned] = useState(false);
  const [unplannedTitle, setUnplannedTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodId, setPeriodId] = useState<string>(plan?.reportingRules.defaultPeriodId || '');
  const [siteId, setSiteId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [participantModeUsed, setParticipantModeUsed] = useState<'none' | 'aggregate' | 'registry'>('none');
  const [participantCount, setParticipantCount] = useState<string>('');
  const [participantIdsText, setParticipantIdsText] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState<EvidenceAttachment[]>([]);
  const [lastSavedFeedback, setLastSavedFeedback] = useState<{
    title: string;
    status: string;
    missingEvidence: boolean;
  } | null>(null);

  // Reset form when switching projects
  useEffect(() => {
    setEditingRecordId(null);
    setSelectedActivityId('');
    setIsUnplanned(false);
    setUnplannedTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setPeriodId(activeApprovedPlan?.plan.reportingRules.defaultPeriodId || '');
    setSiteId('');
    setAnswers({});
    setParticipantModeUsed('none');
    setParticipantCount('');
    setParticipantIdsText('');
    setNotes('');
    setEvidence([]);
    setLastSavedFeedback(null);
  }, [activeProject.id, activeApprovedPlan?.id]);

  const editingRecord = useMemo(
    () => (editingRecordId ? state.activityRecords.find((r) => r.id === editingRecordId) || null : null),
    [editingRecordId, state.activityRecords]
  );

  const selectedActivityDef = useMemo(
    () => (plan && selectedActivityId ? plan.activities.find((a) => a.id === selectedActivityId) || null : null),
    [plan, selectedActivityId]
  );

  // Existing records ALWAYS use their preserved questionSnapshot (Clarification 1)
  const activeQuestions = editingRecord
    ? editingRecord.questionSnapshot
    : selectedActivityDef?.questions || [];

  const activeEvidenceReq = editingRecord
    ? editingRecord.evidenceRequirementSnapshot
    : selectedActivityDef?.evidenceRequirement;

  const handleSelectActivity = (nextId: string) => {
    setSelectedActivityId(nextId);
    setAnswers({});
    const def = plan?.activities.find((a) => a.id === nextId);
    if (def) {
      setParticipantModeUsed(def.participantMode);
      setPeriodId(def.periodId || plan?.reportingRules.defaultPeriodId || '');
    } else {
      setParticipantModeUsed('none');
    }
  };

  const resetForm = () => {
    setEditingRecordId(null);
    setSelectedActivityId('');
    setIsUnplanned(false);
    setUnplannedTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setPeriodId(plan?.reportingRules.defaultPeriodId || '');
    setSiteId('');
    setAnswers({});
    setParticipantModeUsed('none');
    setParticipantCount('');
    setParticipantIdsText('');
    setNotes('');
    setEvidence([]);
  };

  const loadRecordIntoForm = (rec: ActivityRecord) => {
    setEditingRecordId(rec.id);
    setSelectedActivityId(rec.activityId || '');
    setIsUnplanned(rec.isUnplanned);
    setUnplannedTitle(rec.unplannedTitle || '');
    setDate(rec.date);
    setPeriodId(rec.periodId);
    setSiteId(rec.siteId);
    setAnswers({ ...rec.answers });
    setParticipantModeUsed(rec.participantModeUsed);
    setParticipantCount(rec.participantCount !== undefined ? String(rec.participantCount) : '');
    setParticipantIdsText((rec.participantIds || []).join(', '));
    setNotes(rec.notes);
    setEvidence([...rec.evidence]);
    setLastSavedFeedback(null);
  };

  const handleSave = (submitNow: boolean) => {
    const parsedIds = participantIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = saveActivityRecord({
      existingId: editingRecordId || undefined,
      activityId: isUnplanned ? null : selectedActivityId || null,
      isUnplanned,
      unplannedTitle,
      date,
      periodId,
      siteId,
      answers,
      participantModeUsed,
      participantCount:
        participantModeUsed === 'aggregate' && participantCount !== ''
          ? Number(participantCount)
          : participantModeUsed === 'registry'
          ? parsedIds.length
          : undefined,
      participantIds: participantModeUsed === 'registry' ? parsedIds : undefined,
      notes,
      evidence,
      submitNow,
    });
    if (res.ok && res.record) {
      const missingEv = Boolean(
        res.record.evidenceRequirementSnapshot.required && res.record.evidence.length === 0
      );
      setLastSavedFeedback({
        title: res.record.activityNameSnapshot,
        status: res.record.status,
        missingEvidence: missingEv,
      });
      resetForm();
    }
  };

  const filteredRecords = useMemo(() => {
    return projectRecords.filter((r) => {
      if (statusFilter === 'approved') return r.status === 'approved';
      if (statusFilter === 'returned') return r.status === 'returned';
      if (statusFilter === 'pending') return r.status === 'draft' || r.status === 'submitted' || r.status === 'verified';
      return true;
    });
  }, [projectRecords, statusFilter]);

  const generateSyntheticIds = () => {
    const prefix = activeProject.code.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase() || 'PRJ';
    const base = 100 + Math.floor(Math.random() * 800);
    const ids = [`P-${prefix}-${base}`, `P-${prefix}-${base + 1}`, `P-${prefix}-${base + 2}`];
    setParticipantIdsText(ids.join(', '));
  };

  return (
    <div className="space-y-5">
      {/* Area Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#14191F] tracking-tight font-display">
            Do — Record Activity
          </h1>
          <p className="text-sm text-[#525D68] mt-0.5">
            Capture delivery continuously using the shared activity form. Light-green fields load directly from {activeProject.shortName}&apos;s approved plan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveArea('measure')}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-[#C5C9C2] bg-white text-xs font-semibold text-[#14191F] hover:bg-[#F6F7F5]"
          >
            Record measurement (Measure)
            <ArrowRight className="w-3.5 h-3.5 text-[#14532D]" />
          </button>
          {roleDef.canCapture && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22]"
            >
              <ClipboardPlus className="w-4 h-4" />
              Record activity
            </button>
          )}
        </div>
      </div>

      {/* Unapproved Plan Guard (Clarification 1) */}
      {!plan && (
        <div className="rounded-xl bg-white border border-[#B45309]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-[#92400E]">
              Approve Plan configuration before recording activities
            </div>
            <p className="text-xs text-[#525D68]">
              {activeProject.name} currently has a draft configuration only. Add at least one site and activity in Plan, then approve Plan v1.0 to activate Do and Measure.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveArea('plan')}
            className="shrink-0 min-h-[42px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22]"
          >
            Open Plan Setup →
          </button>
        </div>
      )}

      {/* Split Workspace: Recent Activity Records (Left) + Shared Single-Column Capture Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Recent Activity Records */}
        <section className="lg:col-span-7 space-y-3 order-2 lg:order-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#14191F]">
              Recent Activity Records ({filteredRecords.length})
            </h2>
            <div className="flex items-center gap-1 p-0.5 bg-[#EAECE8] rounded-lg text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'In progress' },
                  { id: 'returned', label: 'Returned' },
                  { id: 'approved', label: 'Approved' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === f.id
                      ? 'bg-white text-[#14191F] shadow-xs'
                      : 'text-[#525D68] hover:text-[#14191F]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="bg-white border border-[#E2E6E2] rounded-xl p-8 text-center space-y-2">
              <div className="text-sm font-semibold text-[#14191F]">No activity records in this view yet</div>
              <p className="text-xs text-[#525D68]">
                {plan
                  ? 'Select an activity in the capture form to log delivery and attach evidence.'
                  : 'Approve your Plan configuration first to start recording activities.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E6E2] rounded-xl divide-y divide-[#E2E6E2]">
              {filteredRecords.map((rec) => {
                const val = validateActivityRecord(rec, state.activityRecords);
                const mappedVal = extractActivityMappedValue(rec);
                const answerSummary = rec.questionSnapshot
                  .map((q) => {
                    const a = rec.answers[q.id];
                    if (a === undefined || a === '') return null;
                    return `${q.label}: ${a}`;
                  })
                  .filter(Boolean);

                return (
                  <div key={rec.id} className="p-4 space-y-2.5 hover:bg-[#F6F7F5]/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-bold text-[#14191F]">
                            {rec.isUnplanned ? `[Unplanned] ${rec.activityNameSnapshot}` : rec.activityNameSnapshot}
                          </span>
                          <span className="font-mono text-[11px] text-[#525D68]">
                            Rev {rec.revision} · Plan {rec.planVersionLabel}
                          </span>
                        </div>
                        <MetaRow
                          items={[
                            <span key="dt" className="font-mono">{rec.date}</span>,
                            rec.siteNameSnapshot,
                            <StatusLabel key="st" status={rec.status} />,
                            <ProvenanceLabel key="pr" provenance={rec.provenance} />,
                            `${rec.evidence.length} evidence item(s)`,
                          ]}
                        />
                      </div>

                      {mappedVal !== null && (
                        <div className="shrink-0 text-right font-mono tabular-nums">
                          <div className="text-base font-bold text-[#14532D]">{mappedVal}</div>
                          <div className="text-[11px] text-[#525D68]">mapped count</div>
                        </div>
                      )}
                    </div>

                    {/* Preserved Original Question Answers */}
                    {answerSummary.length > 0 && (
                      <div className="rounded-lg bg-[#EBF7EE]/65 border border-[#C5E5CD]/70 px-3 py-2 text-xs text-[#14191F] space-y-0.5">
                        {answerSummary.map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    )}

                    {rec.participantIds && rec.participantIds.length > 0 && (
                      <div className="text-[11px] font-mono text-[#525D68]">
                        Synthetic participant IDs ({rec.participantIds.length}): {rec.participantIds.join(', ')}
                      </div>
                    )}

                    {val.missingEvidenceFlag && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{val.missingEvidenceMessage}</span>
                      </div>
                    )}

                    {rec.status === 'returned' && rec.decisionHistory.length > 0 && (
                      <div className="text-xs text-[#B91C1C]">
                        Returned reason: {rec.decisionHistory[rec.decisionHistory.length - 1].note}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      {roleDef.canCapture && (rec.status === 'draft' || rec.status === 'returned') && (
                        <button
                          type="button"
                          onClick={() => loadRecordIntoForm(rec)}
                          className="inline-flex items-center gap-1 font-semibold text-[#14532D] hover:underline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {rec.status === 'returned' ? 'Fix & Resubmit' : 'Edit Draft'}
                        </button>
                      )}
                      {roleDef.canCapture && rec.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => {
                            const rev = createActivityRevision(rec.id);
                            if (rev) loadRecordIntoForm(rev);
                          }}
                          className="inline-flex items-center gap-1 font-medium text-[#525D68] hover:text-[#14532D] hover:underline"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          Create correction revision
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveArea('prove')}
                        className="inline-flex items-center gap-1 font-medium text-[#525D68] hover:text-[#14191F] hover:underline"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        Review in Prove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT: Shared Single-Column Activity Capture Form (Matching Visual Guides) */}
        <section className="lg:col-span-5 order-1 lg:order-2">
          <div className="bg-white border border-[#E2E6E2] rounded-2xl overflow-hidden">
            {/* Deep forest-green card header matching guides */}
            <div className="px-5 py-3.5 bg-[#14532D] text-white flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-base font-bold font-display truncate">
                  Do · {activeProject.shortName}
                </div>
                <div className="text-[11px] text-white/80">
                  {editingRecord
                    ? `Editing ${editingRecord.activityNameSnapshot} (Rev ${editingRecord.revision})`
                    : selectedActivityDef
                    ? 'After selection — configured questions loaded'
                    : 'Before selection — choose an activity'}
                </div>
              </div>
              {activeApprovedPlan && (
                <span className="font-mono text-[11px] text-white/90 shrink-0">
                  Plan {activeApprovedPlan.versionLabel}
                </span>
              )}
            </div>

            {roleDef.approvedOnlyView ? (
              <div className="p-5 text-xs text-[#525D68] space-y-2">
                <div className="font-semibold text-[#14191F]">Read-only Donor view</div>
                <p>
                  The Donor role views approved records and issued reports only. Switch to Programme Manager or Field Officer in the top bar to record activities.
                </p>
              </div>
            ) : !plan ? (
              <div className="p-5 text-xs text-[#525D68]">
                Approve Plan v1.0 in Plan to unlock activity capture for {activeProject.shortName}.
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {lastSavedFeedback && (
                  <div
                    className={`rounded-lg border p-3 text-xs space-y-1 ${
                      lastSavedFeedback.missingEvidence
                        ? 'bg-[#FEF3C7]/40 border-[#F59E0B]/50 text-[#92400E]'
                        : 'bg-[#EBF7EE] border-[#C5E5CD] text-[#14532D]'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Saved: {lastSavedFeedback.title} ({lastSavedFeedback.status})
                    </div>
                    {lastSavedFeedback.missingEvidence && (
                      <div>
                        Flagged for missing required evidence — attach evidence before verification in Prove.
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Top Controls (Always Shown Before & After Selection) */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="do-activity-select" className="text-sm font-semibold text-[#14191F]">
                      Activity
                    </label>
                    {!editingRecord && (
                      <label className="inline-flex items-center gap-1.5 text-xs text-[#525D68] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isUnplanned}
                          onChange={(e) => {
                            setIsUnplanned(e.target.checked);
                            if (e.target.checked) setSelectedActivityId('');
                          }}
                          className="accent-[#14532D]"
                        />
                        Unplanned activity
                      </label>
                    )}
                  </div>

                  {isUnplanned ? (
                    <input
                      type="text"
                      value={unplannedTitle}
                      onChange={(e) => setUnplannedTitle(e.target.value)}
                      placeholder="Describe unplanned activity delivered..."
                      className="w-full min-h-[44px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm text-[#14191F] focus:outline-none focus:border-[#14532D]"
                    />
                  ) : (
                    <select
                      id="do-activity-select"
                      disabled={Boolean(editingRecord)}
                      value={selectedActivityId}
                      onChange={(e) => handleSelectActivity(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-[#C5C9C2] bg-white px-3 py-2 text-sm text-[#14191F] focus:outline-none focus:border-[#14532D] disabled:bg-[#F6F7F5]"
                    >
                      <option value="">Select activity</option>
                      {plan.activities.map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="do-date" className="block text-sm font-semibold text-[#14191F]">
                      Date
                    </label>
                    <input
                      id="do-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm font-mono text-[#14191F] focus:outline-none focus:border-[#14532D]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="do-site" className="block text-sm font-semibold text-[#14191F]">
                      Site
                    </label>
                    <select
                      id="do-site"
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-[#C5C9C2] bg-white px-3 py-2 text-sm text-[#14191F] focus:outline-none focus:border-[#14532D]"
                    >
                      <option value="">Select site</option>
                      {plan.sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="do-period" className="block text-xs font-semibold text-[#525D68]">
                      Reporting period
                    </label>
                    <select
                      id="do-period"
                      value={periodId}
                      onChange={(e) => setPeriodId(e.target.value)}
                      className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-3 py-1.5 text-xs text-[#14191F] focus:outline-none focus:border-[#14532D]"
                    >
                      {plan.reportingRules.periods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* AFTER SELECTION: Light-green configuration-loaded question panel */}
                {(selectedActivityDef || editingRecord) && (
                  <DynamicQuestionBlock
                    questions={activeQuestions}
                    answers={answers}
                    onChange={(qid, val) => setAnswers((prev) => ({ ...prev, [qid]: val }))}
                    headerNote={
                      editingRecord
                        ? `Original Plan ${editingRecord.planVersionLabel} question definitions preserved`
                        : `Loaded from ${activeProject.shortName} Plan ${activeApprovedPlan?.versionLabel}`
                    }
                  />
                )}

                {/* Participation tracking (aggregate or synthetic registry IDs) when applicable */}
                {(selectedActivityDef?.participantMode !== 'none' && (selectedActivityDef || isUnplanned)) && (
                  <div className="rounded-lg border border-[#E2E6E2] bg-[#F6F7F5] p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#14191F]">Participation tracking</span>
                      <select
                        aria-label="Participation mode"
                        value={participantModeUsed}
                        onChange={(e) => setParticipantModeUsed(e.target.value as typeof participantModeUsed)}
                        className="bg-white border border-[#C5C9C2] rounded px-2 py-1 text-xs"
                      >
                        <option value="none">Not applicable</option>
                        <option value="aggregate">Aggregate count</option>
                        <option value="registry">Synthetic participant IDs</option>
                      </select>
                    </div>

                    {participantModeUsed === 'aggregate' && (
                      <input
                        type="number"
                        min={0}
                        value={participantCount}
                        onChange={(e) => setParticipantCount(e.target.value)}
                        placeholder="Total participants reached (aggregate count)"
                        className="w-full min-h-[40px] rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5 font-mono text-xs"
                      />
                    )}

                    {participantModeUsed === 'registry' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#525D68]">
                            Enter comma-separated synthetic IDs (zero real PII) for deduplicated unique reach:
                          </span>
                          <button
                            type="button"
                            onClick={generateSyntheticIds}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#14532D] hover:underline shrink-0"
                          >
                            <Plus className="w-3 h-3" /> Generate IDs
                          </button>
                        </div>
                        <input
                          type="text"
                          value={participantIdsText}
                          onChange={(e) => setParticipantIdsText(e.target.value)}
                          placeholder="e.g., P-TRN-012, P-TRN-013"
                          className="w-full min-h-[40px] rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Field Notes */}
                {(selectedActivityDef || isUnplanned || editingRecord) && (
                  <div className="space-y-1">
                    <label htmlFor="do-notes" className="block text-xs font-semibold text-[#525D68]">
                      Observation or context note (optional)
                    </label>
                    <textarea
                      id="do-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add implementation context, partner note, or field observation..."
                      className="w-full rounded-lg border border-[#C5C9C2] px-3 py-2 text-xs text-[#14191F] focus:outline-none focus:border-[#14532D]"
                    />
                  </div>
                )}

                {/* Shared Evidence Attachment Bar */}
                <EvidenceManager
                  buttonLabel="Add evidence"
                  requirement={activeEvidenceReq}
                  attachments={evidence}
                  sourceDocuments={plan.sourceDocuments}
                  actorName={roleDef.actorName}
                  onAdd={(att) => setEvidence((prev) => [...prev, att])}
                  onRemove={(id) => setEvidence((prev) => prev.filter((a) => a.id !== id))}
                />

                {/* Visible Save draft / Submit Footer */}
                {(selectedActivityDef || isUnplanned || editingRecord) && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSave(false)}
                      className="min-h-[46px] rounded-lg border border-[#C5C9C2] bg-white hover:bg-[#F6F7F5] text-sm font-semibold text-[#14191F] transition-colors"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(true)}
                      className="min-h-[46px] rounded-lg bg-[#14532D] hover:bg-[#0F3F22] text-sm font-semibold text-white transition-colors"
                    >
                      {editingRecord?.status === 'returned' ? 'Resubmit' : 'Submit'}
                    </button>
                  </div>
                )}

                {editingRecord && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full text-xs text-[#525D68] hover:text-[#14191F] py-1"
                  >
                    Cancel editing &amp; start new record
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
