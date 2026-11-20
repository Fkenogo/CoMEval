import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Edit3, Plus, ShieldCheck } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { AutoQualityCheck, scanRecurringChecks } from '../../lib/mealEngine';
import { CorrectiveAction, ResultObservation } from '../../types/meal';
import { ApprovalText, MetaLine, ProvenanceText, VerificationText } from '../shared/StatusText';

export const ChecksActionsView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    reviewObservation,
    correctApprovedObservation,
    createCorrectiveAction,
    submitActionClosureEvidence,
    verifyAndCloseAction,
  } = useMeal();

  const pid = state.activeProjectId;
  const projectObs = state.observations.filter((o) => o.projectId === pid);
  const checks = scanRecurringChecks(state, pid);
  const actions = state.correctiveActions.filter((a) => a.projectId === pid);

  const [tab, setTab] = useState<'checks' | 'submissions' | 'actions'>('checks');
  const [reviewingObs, setReviewingObs] = useState<ResultObservation | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFollowUp, setReviewFollowUp] = useState('');

  // Post-approval correction state
  const [correctingObs, setCorrectingObs] = useState<ResultObservation | null>(null);
  const [corrVal, setCorrVal] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [corrSource, setCorrSource] = useState('');

  // Action creation & closure state
  const [creatingFromCheck, setCreatingFromCheck] = useState<AutoQualityCheck | null>(null);
  const [actTitle, setActTitle] = useState('');
  const [actOwner, setActOwner] = useState(
    pid === 'childfund-uganda' ? 'Moses Etyang (PfCW Field Coordinator)' : 'Daniel Adriko (WVU WASH Officer)'
  );
  const [actDue, setActDue] = useState(new Date().toISOString().slice(0, 10));
  const [actDesc, setActDesc] = useState('');

  const [closingAction, setClosingAction] = useState<CorrectiveAction | null>(null);
  const [closureRef, setClosureRef] = useState('');
  const [closureNote, setClosureNote] = useState('');

  const handleDecision = (decision: 'approved' | 'returned') => {
    if (!reviewingObs) return;
    reviewObservation(
      reviewingObs.id,
      decision,
      reviewComment.trim() ||
        (decision === 'approved'
          ? 'Approved after checking source reference and breakdowns.'
          : 'Returned for clarification on source documentation and totals.'),
      reviewFollowUp.trim() || undefined
    );
    setReviewingObs(null);
    setReviewComment('');
    setReviewFollowUp('');
  };

  const handleConfirmCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingObs || corrVal.trim() === '' || !corrReason.trim()) return;
    correctApprovedObservation(
      correctingObs.id,
      Number(corrVal),
      corrReason.trim(),
      corrSource.trim() || undefined
    );
    setCorrectingObs(null);
    setCorrVal('');
    setCorrReason('');
    setCorrSource('');
  };

  const startActionFromCheck = (chk: AutoQualityCheck) => {
    setCreatingFromCheck(chk);
    setActTitle(chk.title);
    setActDesc(chk.detail);
    setActDue(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  };

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;
    const catMap: Record<AutoQualityCheck['category'], CorrectiveAction['category']> = {
      'Missing Evidence': 'Missing Evidence',
      'Overdue Activity': 'Overdue Activity',
      'Conflicting Figures': 'Conflicting Figures',
      'Plan Departure': 'Plan Departure',
      'Denominator / Period Issue': 'Denominator / Period Issue',
      'Pending Submission': 'Missing Evidence',
    };
    createCorrectiveAction({
      projectId: pid,
      title: actTitle.trim(),
      category: creatingFromCheck ? catMap[creatingFromCheck.category] : 'Missing Evidence',
      description: actDesc.trim() || actTitle.trim(),
      owner: actOwner.trim(),
      ownerRole: 'implementing_partner',
      dueDate: actDue,
      linkedActivityId: creatingFromCheck?.linkedActivityId,
      linkedIndicatorId: creatingFromCheck?.linkedIndicatorId,
      linkedObservationId: creatingFromCheck?.linkedObservationId,
    });
    setCreatingFromCheck(null);
    setTab('actions');
  };

  const handleSubmitClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingAction || !closureRef.trim()) return;
    submitActionClosureEvidence(
      closingAction.id,
      closureRef.trim(),
      closureNote.trim() || 'Supporting source documentation attached for M&E verification.'
    );
    setClosingAction(null);
    setClosureRef('');
    setClosureNote('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={[activeProject.shortName, 'Lifecycle Stage 4: Recurring Quality Checks, Approvals & Corrective Actions']} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            Review, Checks & Corrective Actions
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-3xl">
            Monitors overdue activities, missing evidence, conflicting totals, missing denominators, and plan departures. Internal approval remains strictly separate from independent verification, and post-approval corrections preserve prior approved versions.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F0F1EE] rounded-lg w-fit">
        {(
          [
            { id: 'checks', label: `Recurring Checks (${checks.length})` },
            { id: 'submissions', label: `Submissions & Corrections (${projectObs.length})` },
            { id: 'actions', label: `Corrective Actions (${actions.filter((a) => a.status !== 'closed').length} open)` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-[#14191F] shadow-sm' : 'text-[#525D68] hover:text-[#14191F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Assign Corrective Action Modal Panel */}
      {creatingFromCheck && (
        <form onSubmit={handleCreateAction} className="bg-white border-2 border-[#1B4D3E] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#14191F]">
              Assign Corrective Action from Check ({creatingFromCheck.category})
            </h2>
            <button type="button" onClick={() => setCreatingFromCheck(null)} className="text-[#525D68]">
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              required
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              placeholder="Corrective action title"
              className="md:col-span-2 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <input
              type="date"
              required
              value={actDue}
              onChange={(e) => setActDue(e.target.value)}
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 font-mono"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              value={actOwner}
              onChange={(e) => setActOwner(e.target.value)}
              placeholder="Assigned owner"
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <input
              value={actDesc}
              onChange={(e) => setActDesc(e.target.value)}
              placeholder="Required remediation & evidence needed to close"
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreatingFromCheck(null)} className="px-3 py-1.5 text-[#525D68]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-[#1B4D3E] text-white font-medium rounded">
              Assign Action
            </button>
          </div>
        </form>
      )}

      {/* Review Decision Form */}
      {reviewingObs && (
        <div className="bg-white border-2 border-[#1B4D3E] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#14191F]">
              Internal M&E Review — {state.indicators.find((i) => i.id === reviewingObs.indicatorId)?.code} ({reviewingObs.period})
            </h2>
            <button type="button" onClick={() => setReviewingObs(null)} className="text-[#525D68]">
              Cancel
            </button>
          </div>
          <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded p-3">
            Reported: <strong className="font-mono">{reviewingObs.reportedValue ?? 'Missing'} {reviewingObs.unit}</strong> · Source:{' '}
            <span className="font-mono">{reviewingObs.sourceCitation.documentName} ({reviewingObs.sourceCitation.pageOrRow})</span>
          </div>
          <textarea
            rows={2}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Record mandatory review rationale (why accepted or what must be clarified)..."
            className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
          />
          <input
            value={reviewFollowUp}
            onChange={(e) => setReviewFollowUp(e.target.value)}
            placeholder="Optional follow-up assignee (e.g. Beatrice Acen — LACODEF)"
            className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleDecision('returned')}
              className="px-3.5 py-2 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] font-medium rounded"
            >
              Return for Correction
            </button>
            <button
              type="button"
              onClick={() => handleDecision('approved')}
              className="px-4 py-2 bg-[#1B4D3E] text-white font-medium rounded"
            >
              Approve Internally
            </button>
          </div>
        </div>
      )}

      {/* Post-Approval Correction Form (Preserves Prior Approved Version & Frozen Handovers) */}
      {correctingObs && (
        <form onSubmit={handleConfirmCorrection} className="bg-white border-2 border-[#B45309] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#B45309] font-semibold uppercase text-[11px]">Post-Approval Correction Audit</span>
              <h2 className="text-sm font-semibold text-[#14191F]">
                Correct Approved Result — {state.indicators.find((i) => i.id === correctingObs.indicatorId)?.code} ({correctingObs.period})
              </h2>
            </div>
            <button type="button" onClick={() => setCorrectingObs(null)} className="text-[#525D68]">
              Cancel
            </button>
          </div>
          <p className="text-[#525D68]">
            Current approved figure: <strong className="font-mono text-[#14191F]">{correctingObs.reportedValue} {correctingObs.unit}</strong>. Recording a correction preserves v{correctingObs.revisionHistory.length || 1} in revision history and leaves any previously issued Evaluator Handover Snapshots intact.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Corrected Value ({correctingObs.unit})</span>
              <input
                type="number"
                step="any"
                required
                value={corrVal}
                onChange={(e) => setCorrVal(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 font-mono"
              />
            </label>
            <label className="sm:col-span-2 space-y-1">
              <span className="font-medium text-[#525D68]">Updated Source Reference (Optional)</span>
              <input
                value={corrSource}
                onChange={(e) => setCorrSource(e.target.value)}
                placeholder="e.g. Signed_Trainer_Contracts_Bundle.pdf (Verified 12 contracts)"
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 font-mono"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-medium text-[#525D68]">Mandatory Audit Reason for Correction</span>
            <input
              required
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="e.g. Verified 2 newly signed female trainer contracts from PfCW Soroti office post-handover..."
              className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCorrectingObs(null)} className="px-3 py-1.5 text-[#525D68]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-[#B45309] text-white font-medium rounded">
              Confirm Audited Correction
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: RECURRING QUALITY CHECKS */}
      {tab === 'checks' && (
        <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#14191F]">
              Automated Recurring Quality Checks ({checks.length})
            </h2>
            <span className="text-[#525D68]">Live scan across activities, delivery logs, registers & observations</span>
          </div>

          {checks.length === 0 ? (
            <div className="p-8 text-center text-[#15803D] font-medium">
              All recurring quality checks are currently clear for {activeProject.shortName}.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E4E0]">
              {checks.map((chk) => (
                <div key={chk.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <MetaLine
                      items={[
                        <span
                          key="cat"
                          className={chk.severity === 'high' ? 'text-[#B91C1C] font-semibold' : 'text-[#B45309] font-medium'}
                        >
                          {chk.category}
                        </span>,
                        chk.hasLinkedAction ? (
                          <span key="act" className="text-[#15803D] font-medium">Corrective Action Linked</span>
                        ) : (
                          'No Action Assigned Yet'
                        ),
                      ]}
                    />
                    <div className="font-semibold text-[#14191F] flex items-center gap-1.5">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${chk.severity === 'high' ? 'text-[#B91C1C]' : 'text-[#B45309]'}`} />
                      {chk.title}
                    </div>
                    <p className="text-[#525D68]">{chk.detail}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {chk.linkedIndicatorId && (
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'indicator', id: chk.linkedIndicatorId! })}
                        className="px-2.5 py-1.5 border border-[#E2E4E0] rounded text-[#14191F] hover:bg-[#F7F7F5]"
                      >
                        Inspect Source
                      </button>
                    )}
                    {(roleMeta.canApproveResults || roleMeta.canEditWorkplan) && (
                      <button
                        type="button"
                        onClick={() => startActionFromCheck(chk)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1B4D3E] text-white font-medium rounded hover:bg-[#143B2F] whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Assign Action
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: SUBMISSIONS, APPROVALS & POST-APPROVAL CORRECTIONS */}
      {tab === 'submissions' && (
        <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#14191F]">
                Result Submissions, Internal Approval & Independent Verification
              </h2>
              <p className="text-[#525D68] mt-0.5">
                Internal Approval (M&E Reviewer) and Independent Verification (Evaluator) are tracked in separate columns.
              </p>
            </div>
            {!roleMeta.canApproveResults && (
              <span className="text-[#B45309]">Switch role to <strong>M&E Reviewer</strong> to approve, return, or correct figures.</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                  <th className="py-2.5 pr-3 font-medium">Indicator & Period</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Reported Value</th>
                  <th className="py-2.5 pr-3 font-medium">Source & Provenance</th>
                  <th className="py-2.5 pr-3 font-medium">Internal Approval</th>
                  <th className="py-2.5 pr-3 font-medium">Independent Verification</th>
                  <th className="py-2.5 font-medium text-right">Reviewer Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E4E0]">
                {projectObs.map((obs) => {
                  const ind = state.indicators.find((i) => i.id === obs.indicatorId);
                  return (
                    <tr key={obs.id} className="hover:bg-[#F7F7F5] align-top">
                      <td className="py-3 pr-3 max-w-xs">
                        <button
                          type="button"
                          onClick={() => openInspector({ type: 'observation', id: obs.id })}
                          className="text-left hover:text-[#1B4D3E]"
                        >
                          <div className="font-mono font-semibold text-[#1B4D3E]">{ind?.code} · {obs.period}</div>
                          <div className="font-medium text-[#14191F] mt-0.5">{ind?.title}</div>
                        </button>
                        <div className="text-[#525D68] mt-0.5">{obs.partner} · {obs.location}</div>
                        {obs.revisionHistory.length > 1 && (
                          <div className="text-[11px] text-[#B45309] mt-0.5 font-mono">
                            {obs.revisionHistory.length} revisions preserved
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-[#14191F]">
                          {obs.reportedValue !== null ? `${obs.reportedValue} ${obs.unit}` : 'Missing'}
                        </div>
                        {obs.denominator !== null && obs.denominator !== undefined && (
                          <div className="text-[#525D68]">n = {obs.denominator}</div>
                        )}
                      </td>
                      <td className="py-3 pr-3 max-w-xs">
                        <ProvenanceText provenance={obs.provenance} />
                        <div className="font-mono text-[11px] text-[#525D68] mt-0.5">
                          {obs.sourceCitation.documentName} · {obs.sourceCitation.pageOrRow}
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <ApprovalText status={obs.approvalStatus} />
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <VerificationText status={obs.verificationStatus} />
                      </td>
                      <td className="py-3 text-right whitespace-nowrap space-x-2">
                        {roleMeta.canApproveResults && obs.approvalStatus !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => setReviewingObs(obs)}
                            className="px-2.5 py-1.5 bg-[#1B4D3E] text-white font-medium rounded"
                          >
                            Review
                          </button>
                        )}
                        {roleMeta.canApproveResults && obs.approvalStatus === 'approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectingObs(obs);
                              setCorrVal(String(obs.reportedValue ?? ''));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#B45309] text-[#B45309] font-medium rounded hover:bg-[#FFFBEB]"
                          >
                            <Edit3 className="w-3 h-3" />
                            Correct Approved
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openInspector({ type: 'observation', id: obs.id })}
                          className="text-[#1B4D3E] font-medium hover:underline"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: CORRECTIVE ACTIONS TRACKER (CLOSE WITH EVIDENCE) */}
      {tab === 'actions' && (
        <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#1B4D3E]" />
              <h2 className="text-base font-semibold text-[#14191F]">
                Corrective Actions Tracker ({actions.length})
              </h2>
            </div>
            <span className="text-[#525D68]">Actions require supporting closure evidence & reviewer sign-off</span>
          </div>

          {/* Submit Closure Evidence Form */}
          {closingAction && (
            <form onSubmit={handleSubmitClosure} className="bg-[#F7F7F5] border-2 border-[#1B4D3E] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#14191F]">
                  Submit Closure Evidence for: {closingAction.title}
                </div>
                <button type="button" onClick={() => setClosingAction(null)} className="text-[#525D68]">
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  required
                  value={closureRef}
                  onChange={(e) => setClosureRef(e.target.value)}
                  placeholder="Supporting source / file reference (e.g. Signed_Trainer_Contracts_PfCW_LACODEF_2023.pdf)"
                  className="bg-white border border-[#E2E4E0] rounded px-3 py-2 font-mono"
                />
                <input
                  value={closureNote}
                  onChange={(e) => setClosureNote(e.target.value)}
                  placeholder="Closure summary explaining how check was resolved..."
                  className="bg-white border border-[#E2E4E0] rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="submit" className="px-4 py-1.5 bg-[#1B4D3E] text-white font-medium rounded">
                  Submit Evidence for Verification
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-[#E2E4E0]">
            {actions.map((act) => (
              <div key={act.id} className="py-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <MetaLine
                    items={[
                      <span key="c" className="font-medium text-[#14191F]">{act.category}</span>,
                      `Owner: ${act.owner}`,
                      <span key="d" className="font-mono">Due {act.dueDate}</span>,
                      <span
                        key="s"
                        className={
                          act.status === 'closed'
                            ? 'text-[#15803D] font-semibold'
                            : act.status === 'evidence_submitted'
                            ? 'text-[#1B4D3E] font-semibold'
                            : 'text-[#B45309] font-semibold'
                        }
                      >
                        {act.status === 'closed'
                          ? 'Closed & Verified'
                          : act.status === 'evidence_submitted'
                          ? 'Evidence Submitted — Awaiting Reviewer'
                          : 'Open'}
                      </span>,
                    ]}
                  />
                  <div className="text-sm font-semibold text-[#14191F]">{act.title}</div>
                  <p className="text-[#525D68]">{act.description}</p>
                  {act.closureEvidenceRef && (
                    <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 mt-1.5">
                      <div className="font-medium text-[#14191F]">
                        Closure Evidence: <span className="font-mono text-[#1B4D3E]">{act.closureEvidenceRef}</span>
                      </div>
                      {act.closureNote && <div className="text-[#525D68] mt-0.5">{act.closureNote}</div>}
                      {act.verifiedBy && (
                        <div className="text-[#15803D] mt-0.5 inline-flex items-center gap-1 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified & closed by {act.verifiedBy} on {act.verifiedAt}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {act.status === 'open' && !roleMeta.isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setClosingAction(act);
                        setClosureRef(
                          pid === 'childfund-uganda'
                            ? 'Signed_Trainer_Contracts_2023_Verified.pdf · Pages 1–10'
                            : 'Omugo_CFS_WASH_Reconciliation_Memo_2018.pdf'
                        );
                      }}
                      className="px-3 py-1.5 bg-white border border-[#1B4D3E] text-[#1B4D3E] font-medium rounded hover:bg-[#F0F1EE] whitespace-nowrap"
                    >
                      Submit Closure Evidence
                    </button>
                  )}
                  {act.status === 'evidence_submitted' && roleMeta.canApproveResults && (
                    <button
                      type="button"
                      onClick={() => verifyAndCloseAction(act.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1B4D3E] text-white font-medium rounded hover:bg-[#143B2F] whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verify & Close Action
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
