import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardList,
  Flag,
  GitCompare,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeHandoverDiff } from '../../lib/mealEngine';
import { EvalReadiness, EvaluationQuestion, VerificationStatus } from '../../types/meal';
import {
  ApprovalText,
  MetaLine,
  ProvenanceText,
  VerificationText,
} from '../shared/StatusText';

type EvalTab = 'plan' | 'verification' | 'handover' | 'findings';

const READINESS_LABELS: Record<EvalReadiness, string> = {
  answerable_from_records: 'Answerable from existing records',
  needs_clarification: 'Needs partner clarification',
  needs_independent_validation: 'Needs independent validation',
  needs_new_fieldwork: 'Needs new primary fieldwork',
};

export const EvaluationWorkspaceView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    setActiveRole,
    updateEvaluationQuestion,
    addEvaluationQuestion,
    addIndependentNote,
    createHandoverSnapshot,
    updateFindingResponse,
  } = useMeal();

  const pid = state.activeProjectId;
  const [tab, setTab] = useState<EvalTab>('plan');

  const questions = useMemo(() => state.evaluationQuestions.filter((q) => q.projectId === pid), [state.evaluationQuestions, pid]);
  const observations = useMemo(() => state.observations.filter((o) => o.projectId === pid), [state.observations, pid]);
  const indicators = useMemo(() => state.indicators.filter((i) => i.projectId === pid), [state.indicators, pid]);
  const snapshots = useMemo(() => state.handoverSnapshots.filter((s) => s.projectId === pid), [state.handoverSnapshots, pid]);
  const findings = useMemo(() => state.evaluatorFindings.filter((f) => f.projectId === pid), [state.evaluatorFindings, pid]);

  // Add Evaluation Question state
  const [showAddQ, setShowAddQ] = useState(false);
  const [qCriterion, setQCriterion] = useState<EvaluationQuestion['criterion']>('Effectiveness');
  const [qSector, setQSector] = useState(activeProject.sectors[0] || '');
  const [qText, setQText] = useState('');
  const [qReadiness, setQReadiness] = useState<EvalReadiness>('needs_independent_validation');
  const [qMethod, setQMethod] = useState('');
  const [qOwner, setQOwner] = useState(activeProject.evaluationLead);
  const [qGap, setQGap] = useState('');

  // Inline follow-up assignment state on an existing question
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [followUpOwner, setFollowUpOwner] = useState('');
  const [followUpMethod, setFollowUpMethod] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  // Independent Verification quick-form state
  const [selectedObsId, setSelectedObsId] = useState<string | null>(null);
  const [verStatus, setVerStatus] = useState<VerificationStatus>('flagged_discrepancy');
  const [verNote, setVerNote] = useState('');
  const [verDiscrepancy, setVerDiscrepancy] = useState(true);
  const [verPushQId, setVerPushQId] = useState('');

  // Handover Snapshot creation & selection
  const [snapLabel, setSnapLabel] = useState('');
  const [snapNotes, setSnapNotes] = useState('');
  const [selectedSnapId, setSelectedSnapId] = useState<string>('');

  const activeSnap = useMemo(
    () => snapshots.find((s) => s.id === selectedSnapId) || snapshots[0] || null,
    [snapshots, selectedSnapId]
  );

  const handoverDiff = useMemo(
    () => (activeSnap ? computeHandoverDiff(state, activeSnap) : []),
    [state, activeSnap]
  );

  // Management Response editing
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [respText, setRespText] = useState('');
  const [respStatus, setRespStatus] = useState<'Pending' | 'Accepted' | 'In Progress' | 'Completed'>('Accepted');

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) return;
    const prefix = pid === 'omugo-wvu' ? 'EQ-OM' : 'EQ-CF';
    addEvaluationQuestion({
      projectId: pid,
      code: `${prefix}-${questions.length + 1}`,
      criterion: qCriterion,
      question: qText.trim(),
      sector: qSector || activeProject.sectors[0],
      linkedIndicatorIds: [],
      linkedDocumentIds: [],
      availableEvidenceSummary: 'Added from Evaluation Workspace during review.',
      evidenceQuality: 'Low / Partial',
      remainingGaps: qGap.trim() || 'Independent verification required before closeout.',
      readiness: qReadiness,
      proposedMethod: qMethod.trim() || 'Primary source audit & targeted KII',
      owner: qOwner.trim() || activeProject.evaluationLead,
      status: 'Fieldwork Planned',
      assignedFollowUpNote: `Assigned follow-up (${new Date().toISOString().slice(0, 10)})`,
    });
    setQText('');
    setQMethod('');
    setQGap('');
    setShowAddQ(false);
  };

  const handleSaveIndependentNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObsId || !verNote.trim()) return;
    addIndependentNote(selectedObsId, verStatus, verNote.trim(), verDiscrepancy, verPushQId || undefined);
    setSelectedObsId(null);
    setVerNote('');
    setVerPushQId('');
  };

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapLabel.trim()) return;
    const created = createHandoverSnapshot(
      snapLabel.trim(),
      snapNotes.trim() || 'Dated evaluator handover package capturing currently approved figures and open verification plan.'
    );
    setSelectedSnapId(created.id);
    setSnapLabel('');
    setSnapNotes('');
  };

  const changedCount = handoverDiff.filter((d) => d.changed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14191F] tracking-tight font-[var(--font-display)]">
            Independent Evaluation & Handover Workspace
          </h1>
          <p className="text-sm text-[#525D68] mt-1">
            Evaluation Lead: {activeProject.evaluationLead} · Target Evaluation: {activeProject.upcomingEvaluationDate}. Internal approval and independent verification remain strictly separate.
          </p>
        </div>
        {!roleMeta.canVerifyIndependently && (
          <button
            type="button"
            onClick={() => setActiveRole('independent_evaluator', false)}
            className="text-xs font-medium text-[#1B4D3E] border border-[#1B4D3E] rounded-md px-3 py-1.5 hover:bg-white self-start sm:self-auto"
          >
            Switch to Independent Evaluator Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E4E0] pb-2">
        {(
          [
            { id: 'plan', label: `Evaluation Plan (${questions.length})` },
            { id: 'verification', label: `Evidence Verification (${observations.length})` },
            {
              id: 'handover',
              label: `Handover Snapshots (${snapshots.length})${changedCount > 0 ? ` · ${changedCount} live diff` : ''}`,
            },
            { id: 'findings', label: `Evaluator Findings (${findings.length})` },
          ] as { id: EvalTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.id
                ? 'bg-[#1B4D3E] text-white'
                : 'text-[#525D68] hover:bg-[#F0F1EE] hover:text-[#14191F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Evaluation Plan & Questions */}
      {tab === 'plan' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#525D68] font-mono tabular-nums">
              <span>
                Answerable: {questions.filter((q) => q.readiness === 'answerable_from_records').length}
              </span>
              <span>
                Clarification: {questions.filter((q) => q.readiness === 'needs_clarification').length}
              </span>
              <span className="text-[#B45309]">
                Independent validation: {questions.filter((q) => q.readiness === 'needs_independent_validation').length}
              </span>
              <span className="text-[#B91C1C]">
                New fieldwork: {questions.filter((q) => q.readiness === 'needs_new_fieldwork').length}
              </span>
            </div>

            {!roleMeta.isReadOnly && (
              <button
                type="button"
                onClick={() => setShowAddQ((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Evaluation Question
              </button>
            )}
          </div>

          {showAddQ && (
            <form onSubmit={handleAddQuestion} className="bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-[#14191F]">Add Assigned Verification Question to Evaluation Plan</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={qCriterion}
                  onChange={(e) => setQCriterion(e.target.value as EvaluationQuestion['criterion'])}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs"
                >
                  {['Relevance', 'Effectiveness', 'Efficiency', 'Impact', 'Sustainability', 'Equity'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={qSector}
                  onChange={(e) => setQSector(e.target.value)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs"
                >
                  {activeProject.sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={qReadiness}
                  onChange={(e) => setQReadiness(e.target.value as EvalReadiness)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs"
                >
                  {Object.entries(READINESS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                required
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Evaluation or verification question..."
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={qGap}
                  onChange={(e) => setQGap(e.target.value)}
                  placeholder="Remaining evidence gap..."
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={qMethod}
                  onChange={(e) => setQMethod(e.target.value)}
                  placeholder="Proposed fieldwork / audit method..."
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={qOwner}
                  onChange={(e) => setQOwner(e.target.value)}
                  placeholder="Assigned owner..."
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md">
                  Add to Evaluation Plan
                </button>
                <button type="button" onClick={() => setShowAddQ(false)} className="px-3 py-1.5 text-xs text-[#525D68]">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#E2E4E0] rounded-lg divide-y divide-[#E2E4E0]">
            {questions.map((q) => {
              const isEditing = editingFollowUpId === q.id;
              return (
                <div key={q.id} className="p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#1B4D3E]">{q.code}</span>
                        <span className="text-sm font-semibold text-[#14191F]">{q.question}</span>
                      </div>
                      <MetaLine
                        items={[
                          q.criterion,
                          q.sector,
                          `Evidence quality: ${q.evidenceQuality}`,
                          `Owner: ${q.owner}`,
                          <span key="st" className="font-medium text-[#14191F]">Status: {q.status}</span>,
                        ]}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'question', id: q.id })}
                        className="px-2.5 py-1.5 text-xs font-medium border border-[#E2E4E0] rounded-md text-[#1B4D3E] hover:bg-[#F7F7F5]"
                      >
                        Trace Trail
                      </button>
                      {!roleMeta.isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingFollowUpId(null);
                            } else {
                              setEditingFollowUpId(q.id);
                              setFollowUpOwner(q.owner);
                              setFollowUpMethod(q.proposedMethod);
                              setFollowUpNote(q.assignedFollowUpNote || '');
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F]"
                        >
                          {isEditing ? 'Close' : 'Assign Follow-Up'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-[#F7F7F5] rounded p-2.5">
                      <div className="font-medium text-[#14191F] mb-0.5">Available Evidence</div>
                      <p className="text-[#525D68]">{q.availableEvidenceSummary}</p>
                    </div>
                    <div className="bg-[#F7F7F5] rounded p-2.5">
                      <div className="font-medium text-[#B45309] mb-0.5">Remaining Gaps</div>
                      <p className="text-[#525D68]">{q.remainingGaps}</p>
                    </div>
                    <div className="bg-[#F7F7F5] rounded p-2.5 space-y-1">
                      <div className="font-medium text-[#14191F]">Readiness & Method</div>
                      <select
                        aria-label={`Readiness for ${q.code}`}
                        value={q.readiness}
                        disabled={roleMeta.isReadOnly}
                        onChange={(e) =>
                          updateEvaluationQuestion(q.id, { readiness: e.target.value as EvalReadiness })
                        }
                        className="w-full bg-white border border-[#E2E4E0] rounded px-2 py-1 text-xs text-[#14191F]"
                      >
                        {Object.entries(READINESS_LABELS).map(([val, lbl]) => (
                          <option key={val} value={val}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                      <p className="text-[#525D68]">{q.proposedMethod}</p>
                    </div>
                  </div>

                  {q.assignedFollowUpNote && (
                    <div className="text-xs text-[#1B4D3E] bg-[#F0F7F4] border border-[#1B4D3E]/20 rounded px-3 py-2 flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        <span className="font-semibold">Assigned Follow-Up:</span> {q.assignedFollowUpNote}
                      </span>
                    </div>
                  )}

                  {isEditing && (
                    <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md p-3 space-y-2.5">
                      <div className="text-xs font-semibold text-[#14191F]">
                        Assign Verification Follow-Up in Evaluation Plan
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={followUpOwner}
                          onChange={(e) => setFollowUpOwner(e.target.value)}
                          placeholder="Assigned owner"
                          className="bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          value={followUpMethod}
                          onChange={(e) => setFollowUpMethod(e.target.value)}
                          placeholder="Verification / fieldwork method"
                          className="bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <input
                        type="text"
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        placeholder="Specific follow-up directive (e.g. Inspect CFS water refill logs & verify latrine peak queue ratio)..."
                        className="w-full bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            updateEvaluationQuestion(q.id, {
                              owner: followUpOwner.trim() || q.owner,
                              proposedMethod: followUpMethod.trim() || q.proposedMethod,
                              assignedFollowUpNote:
                                followUpNote.trim() || `Assigned follow-up to ${followUpOwner || q.owner}`,
                              status: 'Fieldwork Planned',
                            });
                            setEditingFollowUpId(null);
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md"
                        >
                          Save Assigned Follow-Up
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Non-Mutating Independent Evidence Verification */}
      {tab === 'verification' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E4E0] rounded-lg p-3.5 text-xs text-[#525D68] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Independent Evaluators review reported figures in <strong className="text-[#14191F]">read-only mode</strong>: adding verification notes or discrepancy flags never overwrites implementing partner records or internal approvals.
            </span>
            <span className="font-mono text-[#1B4D3E] shrink-0">
              {observations.filter((o) => o.verificationStatus === 'flagged_discrepancy').length} flagged ·{' '}
              {observations.filter((o) => o.verificationStatus === 'verified').length} verified
            </span>
          </div>

          <div className="bg-white border border-[#E2E4E0] rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E4E0] bg-[#F7F7F5] text-[#525D68]">
                  <th className="py-2.5 px-3 font-medium">Indicator & Period</th>
                  <th className="py-2.5 px-3 font-medium text-right">Reported Value</th>
                  <th className="py-2.5 px-3 font-medium">Source & Provenance</th>
                  <th className="py-2.5 px-3 font-medium">Internal Approval</th>
                  <th className="py-2.5 px-3 font-medium">Independent Verification</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E4E0]">
                {observations.map((obs) => {
                  const ind = indicators.find((i) => i.id === obs.indicatorId);
                  return (
                    <React.Fragment key={obs.id}>
                      <tr className="hover:bg-[#F7F7F5]/60">
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => openInspector({ type: 'observation', id: obs.id })}
                            className="font-semibold text-[#1B4D3E] hover:underline text-left"
                          >
                            {ind?.code || obs.indicatorId}
                          </button>
                          <div className="text-[#525D68]">{obs.period} · {obs.partner}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#14191F]">
                          {obs.reportedValue !== null ? `${obs.reportedValue} ${ind?.unit || ''}` : 'Missing'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[#14191F]">{obs.sourceCitation.documentName}</div>
                          <MetaLine
                            items={[
                              obs.sourceCitation.sectionOrTab,
                              obs.sourceCitation.pageOrRow,
                              <ProvenanceText key="p" provenance={obs.provenance} />,
                            ]}
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <ApprovalText status={obs.approvalStatus} />
                        </td>
                        <td className="py-2.5 px-3">
                          <VerificationText status={obs.verificationStatus} />
                          {obs.independentNotes.length > 0 && (
                            <div className="text-[11px] text-[#525D68] mt-0.5">
                              {obs.independentNotes.length} evaluator note(s)
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {roleMeta.canVerifyIndependently ? (
                            <button
                              type="button"
                              onClick={() => setSelectedObsId(selectedObsId === obs.id ? null : obs.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#1B4D3E] text-[#1B4D3E] rounded font-medium hover:bg-[#F7F7F5]"
                            >
                              <Flag className="w-3 h-3" />
                              {selectedObsId === obs.id ? 'Close' : 'Add Note / Flag'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openInspector({ type: 'observation', id: obs.id })}
                              className="text-[#1B4D3E] hover:underline font-medium"
                            >
                              Inspect
                            </button>
                          )}
                        </td>
                      </tr>

                      {selectedObsId === obs.id && (
                        <tr className="bg-[#F7F7F5]">
                          <td colSpan={6} className="p-4">
                            <form onSubmit={handleSaveIndependentNote} className="space-y-3">
                              <div className="text-xs font-semibold text-[#14191F]">
                                Log Independent Verification Note (Read-Only on Partner Data)
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <select
                                  value={verStatus}
                                  onChange={(e) => setVerStatus(e.target.value as VerificationStatus)}
                                  className="bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                                >
                                  <option value="verified">Independently Verified</option>
                                  <option value="flagged_discrepancy">Discrepancy Flagged</option>
                                  <option value="fieldwork_required">Fieldwork Needed</option>
                                  <option value="unverified">Unverified</option>
                                </select>

                                <select
                                  value={verPushQId}
                                  onChange={(e) => setVerPushQId(e.target.value)}
                                  className="bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                                >
                                  <option value="">Optional: push follow-up to Evaluation Plan...</option>
                                  {questions.map((q) => (
                                    <option key={q.id} value={q.id}>
                                      {q.code} — {q.question.slice(0, 60)}...
                                    </option>
                                  ))}
                                </select>

                                <label className="flex items-center gap-2 text-xs text-[#14191F]">
                                  <input
                                    type="checkbox"
                                    checked={verDiscrepancy}
                                    onChange={(e) => setVerDiscrepancy(e.target.checked)}
                                    className="accent-[#B91C1C]"
                                  />
                                  Flag formal discrepancy
                                </label>
                              </div>
                              <textarea
                                required
                                rows={2}
                                value={verNote}
                                onChange={(e) => setVerNote(e.target.value)}
                                placeholder="Document independent audit observation, source gap, or triangulation note..."
                                className="w-full bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md"
                                >
                                  Save Independent Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedObsId(null)}
                                  className="px-3 py-1.5 text-xs text-[#525D68]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Immutable Handover Snapshots & Post-Handover Correction Diff */}
      {tab === 'handover' && (
        <div className="space-y-5">
          {/* Snapshot Selector + Create New */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-[#14191F] flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-[#1B4D3E]" />
                Issued Handover Snapshots
              </div>
              <div className="space-y-2">
                {snapshots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSnapId(s.id)}
                    className={`w-full text-left p-3 rounded-md border text-xs transition-colors ${
                      activeSnap?.id === s.id
                        ? 'border-[#1B4D3E] bg-[#F0F7F4]'
                        : 'border-[#E2E4E0] hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="font-semibold text-[#14191F]">{s.label}</div>
                    <div className="text-[#525D68] font-mono text-[11px] mt-0.5">
                      Frozen {s.createdAt} · {s.approvedIndicators.length} approved figures
                    </div>
                  </button>
                ))}
              </div>

              {!roleMeta.isReadOnly && (
                <form onSubmit={handleCreateSnapshot} className="pt-3 border-t border-[#E2E4E0] space-y-2">
                  <div className="text-xs font-semibold text-[#14191F]">Issue New Dated Handover Package</div>
                  <input
                    type="text"
                    required
                    value={snapLabel}
                    onChange={(e) => setSnapLabel(e.target.value)}
                    placeholder="e.g. Updated Closeout Handover (v2)"
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={snapNotes}
                    onChange={(e) => setSnapNotes(e.target.value)}
                    placeholder="Handover note for independent evaluator..."
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F]"
                  >
                    Freeze Current Approved Figures
                  </button>
                </form>
              )}
            </div>

            {/* Active Snapshot Diff & Contents */}
            {activeSnap && (
              <div className="lg:col-span-2 bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[#14191F]">{activeSnap.label}</h2>
                    <MetaLine
                      items={[
                        `Issued ${activeSnap.createdAt}`,
                        `By ${activeSnap.createdBy}`,
                        `${activeSnap.approvedIndicators.length} frozen figures`,
                      ]}
                    />
                    <p className="text-xs text-[#525D68] mt-1.5">{activeSnap.notes}</p>
                  </div>
                  <div className="shrink-0 font-mono text-xs tabular-nums">
                    {changedCount > 0 ? (
                      <span className="text-[#B45309] font-semibold">
                        {changedCount} post-handover correction(s) detected
                      </span>
                    ) : (
                      <span className="text-[#15803D]">Matches live approved state</span>
                    )}
                  </div>
                </div>

                {/* Frozen vs Live Diff Table */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#14191F] flex items-center gap-1.5">
                    <GitCompare className="w-3.5 h-3.5 text-[#1B4D3E]" />
                    Frozen Handover Figure vs. Live Approved Result
                  </div>
                  <div className="border border-[#E2E4E0] rounded-md overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F7F7F5] border-b border-[#E2E4E0] text-[#525D68]">
                          <th className="py-2 px-3 font-medium">Indicator</th>
                          <th className="py-2 px-3 font-medium text-right">Frozen Snapshot</th>
                          <th className="py-2 px-3 font-medium text-right">Current Live Approved</th>
                          <th className="py-2 px-3 font-medium">Correction Audit / Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E4E0]">
                        {handoverDiff.map((row) => (
                          <tr key={row.indicatorId} className={row.changed ? 'bg-[#FEF3C7]/35' : ''}>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-[#14191F]">
                                {row.code} — {row.title}
                              </div>
                              <div className="text-[11px] font-mono text-[#525D68]">
                                {row.period} · {row.snapshotSourceRef}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525D68]">
                              {row.frozenValue !== null ? `${row.frozenValue} ${row.unit}` : 'Missing'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#14191F]">
                              {row.liveApprovedValue !== null ? `${row.liveApprovedValue} ${row.unit}` : 'Missing'}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.changed ? (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-[#B45309]">
                                    Corrected post-handover ({row.frozenValue} → {row.liveApprovedValue})
                                  </div>
                                  <div className="text-[#14191F]">
                                    Reason: {row.latestCorrectionReason || 'Post-approval revision logged'}
                                  </div>
                                  {row.correctedBy && (
                                    <div className="text-[11px] text-[#525D68]">
                                      {row.correctedBy} · {row.correctedAt}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#15803D]">Unchanged since handover</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Unresolved issues & fieldwork captured in snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded p-3 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">Unresolved Issues Frozen at Handover</div>
                    <ul className="list-disc pl-4 space-y-1 text-[#525D68]">
                      {activeSnap.unresolvedIssues.map((iss, idx) => (
                        <li key={idx}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded p-3 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">Suggested Fieldwork at Handover</div>
                    <ul className="list-disc pl-4 space-y-1 text-[#525D68]">
                      {activeSnap.suggestedFieldwork.map((fw, idx) => (
                        <li key={idx}>{fw}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Evaluator Findings & Management Response */}
      {tab === 'findings' && (
        <div className="space-y-4">
          {findings.map((f) => {
            const isEditing = editingFindingId === f.id;
            return (
              <div key={f.id} className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#1B4D3E] shrink-0" />
                      <h3 className="text-sm font-bold text-[#14191F]">
                        {f.code} — {f.title}
                      </h3>
                    </div>
                    <MetaLine
                      className="mt-1"
                      items={[
                        f.sector,
                        <ProvenanceText key="p" provenance={f.provenance} />,
                        `${f.sourceCitation.documentName} · ${f.sourceCitation.sectionOrTab} · ${f.sourceCitation.pageOrRow}`,
                      ]}
                    />
                  </div>
                  <span
                    className={`font-mono text-xs font-semibold shrink-0 ${
                      f.managementStatus === 'Completed'
                        ? 'text-[#15803D]'
                        : f.managementStatus === 'Pending'
                        ? 'text-[#B45309]'
                        : 'text-[#1B4D3E]'
                    }`}
                  >
                    Management Response: {f.managementStatus}
                  </span>
                </div>

                <p className="text-xs text-[#14191F] leading-relaxed">{f.findingText}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F7F7F5] rounded p-3">
                    <div className="font-semibold text-[#B45309] mb-1">Methodological & Evidence Limitations</div>
                    <p className="text-[#525D68]">{f.limitations}</p>
                  </div>
                  <div className="bg-[#F7F7F5] rounded p-3">
                    <div className="font-semibold text-[#14191F] mb-1">Evaluator Recommendation</div>
                    <p className="text-[#525D68]">{f.recommendation}</p>
                  </div>
                </div>

                <div className="border-t border-[#E2E4E0] pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="text-xs space-y-1 flex-1">
                    <div className="font-semibold text-[#14191F]">
                      Management Response ({f.managementOwner})
                    </div>
                    {!isEditing ? (
                      <p className="text-[#525D68]">{f.managementResponse}</p>
                    ) : (
                      <div className="space-y-2 mt-1">
                        <textarea
                          rows={2}
                          value={respText}
                          onChange={(e) => setRespText(e.target.value)}
                          className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded p-2 text-xs text-[#14191F]"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={respStatus}
                            onChange={(e) => setRespStatus(e.target.value as typeof respStatus)}
                            className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-1 text-xs"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Accepted">Accepted</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              updateFindingResponse(f.id, respText.trim() || f.managementResponse, respStatus);
                              setEditingFindingId(null);
                            }}
                            className="px-3 py-1 text-xs font-medium bg-[#1B4D3E] text-white rounded"
                          >
                            Save Response
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFindingId(null)}
                            className="px-2 py-1 text-xs text-[#525D68]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && !roleMeta.isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFindingId(f.id);
                        setRespText(f.managementResponse);
                        setRespStatus(f.managementStatus);
                      }}
                      className="shrink-0 px-2.5 py-1.5 text-xs font-medium border border-[#E2E4E0] rounded-md text-[#1B4D3E] hover:bg-[#F7F7F5]"
                    >
                      Update Response
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {findings.length === 0 && (
            <div className="bg-white border border-[#E2E4E0] rounded-lg p-6 text-xs text-[#525D68] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1B4D3E]" />
              No independent evaluator findings recorded yet for this project.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
