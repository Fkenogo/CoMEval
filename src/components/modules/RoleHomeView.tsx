import React from 'react';
import { ArrowRight, CheckSquare, ClipboardCheck, FileText, FolderKanban, ShieldAlert } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeHandoverDiff, computeIndicatorState, scanRecurringChecks } from '../../lib/mealEngine';
import { ApprovalText, MetaLine, ProvenanceText, VerificationText } from '../shared/StatusText';

export const RoleHomeView: React.FC = () => {
  const { state, activeProject, roleMeta, setActiveModule, openInspector, setWalkthroughOpen } = useMeal();
  const pid = state.activeProjectId;

  const projectCommitments = state.commitments.filter((c) => c.projectId === pid);
  const candidateCommitments = projectCommitments.filter((c) => c.status === 'candidate');
  const projectActivities = state.activities.filter((a) => a.projectId === pid);
  const dueOrDelayedActivities = projectActivities.filter((a) => a.status !== 'completed');
  const projectObs = state.observations.filter((o) => o.projectId === pid);
  const returnedOrDraftObs = projectObs.filter((o) => o.approvalStatus === 'returned' || o.approvalStatus === 'draft');
  const submittedObs = projectObs.filter((o) => o.approvalStatus === 'submitted');
  const approvedObs = projectObs.filter((o) => o.approvalStatus === 'approved');
  const checks = scanRecurringChecks(state, pid);
  const openActions = state.correctiveActions.filter((a) => a.projectId === pid && a.status !== 'closed');
  const evalQuestions = state.evaluationQuestions.filter((q) => q.projectId === pid);
  const snapshots = state.handoverSnapshots.filter((s) => s.projectId === pid);
  const latestSnapshot = snapshots[0];
  const snapshotDiffs = latestSnapshot ? computeHandoverDiff(state, latestSnapshot).filter((d) => d.changed) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={[activeProject.shortName, activeProject.code, `Role Working Home`]} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            {roleMeta.label} Workspace
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-2xl">{roleMeta.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModule('overview')}
            className="px-3.5 py-2 text-xs font-medium text-[#14191F] bg-white border border-[#E2E4E0] rounded-md hover:bg-[#F0F1EE] whitespace-nowrap"
          >
            Programme Overview
          </button>
          <button
            type="button"
            onClick={() => setWalkthroughOpen(true, pid === 'childfund-uganda' ? 'childfund' : 'omugo')}
            className="px-3.5 py-2 text-xs font-medium text-white bg-[#1B4D3E] rounded-md hover:bg-[#143B2F] whitespace-nowrap"
          >
            Open Walkthrough Guide
          </button>
        </div>
      </div>

      {/* PROGRAMME MANAGER HOME */}
      {state.activeRole === 'programme_manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1B4D3E]" />
                <h2 className="text-sm font-semibold text-[#14191F]">
                  Decisions Needed — Commitments & Plan Departures
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('documents')}
                className="text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                All Commitments →
              </button>
            </div>
            {candidateCommitments.length === 0 ? (
              <p className="text-xs text-[#525D68]">All extracted commitments have been reviewed and assigned.</p>
            ) : (
              <div className="divide-y divide-[#E2E4E0]">
                {candidateCommitments.map((c) => (
                  <div key={c.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="text-xs">
                      <MetaLine items={[<span key="c" className="font-mono text-[#1B4D3E]">{c.code}</span>, c.sector, <ProvenanceText key="p" provenance={c.provenance} />]} />
                      <div className="font-medium text-[#14191F] mt-0.5">{c.title}</div>
                      <div className="text-[#525D68] mt-0.5">
                        Source: {c.sourceCitation.documentName} · {c.sourceCitation.pageOrRow}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule('documents')}
                      className="px-2.5 py-1.5 bg-[#1B4D3E] text-white text-xs font-medium rounded whitespace-nowrap shrink-0"
                    >
                      Review & Assign
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#E2E4E0] space-y-2">
              <div className="text-xs font-medium text-[#525D68]">Plan Departures & Overdue Workplan Items</div>
              {projectActivities
                .filter((a) => a.status === 'overdue' || a.status === 'delayed' || a.changeLog.length > 0)
                .map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-xs py-1.5">
                    <button
                      type="button"
                      onClick={() => openInspector({ type: 'activity', id: a.id })}
                      className="text-left hover:text-[#1B4D3E]"
                    >
                      <span className="font-mono font-medium">{a.code}</span> · {a.title}{' '}
                      <span className="text-[#B45309]">({a.status})</span>
                    </button>
                    <span className="font-mono tabular-nums text-[#525D68] shrink-0">Due {a.currentDueDate}</span>
                  </div>
                ))}
            </div>
          </section>

          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#1B4D3E]" />
                <h2 className="text-sm font-semibold text-[#14191F]">Upcoming Deadlines & Reporting Readiness</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('reports')}
                className="text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                Open Reports →
              </button>
            </div>
            <div className="divide-y divide-[#E2E4E0] text-xs">
              {activeProject.reportingCycles.map((rc) => (
                <div key={rc.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-[#14191F]">{rc.label}</div>
                    <div className="text-[#525D68] font-mono">
                      {rc.startDate} → {rc.endDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular-nums text-[#14191F]">Due {rc.dueDate}</div>
                    <div className={rc.status === 'open' ? 'text-[#1B4D3E] font-medium' : 'text-[#525D68]'}>
                      {rc.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[#E2E4E0] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveModule('workplan')}
                className="px-3 py-1.5 bg-[#F7F7F5] border border-[#E2E4E0] rounded text-xs font-medium text-[#14191F] hover:bg-[#F0F1EE]"
              >
                Manage Workplan ({projectActivities.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('evaluation')}
                className="px-3 py-1.5 bg-[#F7F7F5] border border-[#E2E4E0] rounded text-xs font-medium text-[#14191F] hover:bg-[#F0F1EE]"
              >
                Issue Handover Snapshot ({snapshots.length})
              </button>
            </div>
          </section>
        </div>
      )}

      {/* IMPLEMENTING PARTNER HOME */}
      {state.activeRole === 'implementing_partner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#14191F]">My Assigned Workplan Activities</h2>
              <button
                type="button"
                onClick={() => setActiveModule('capture')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                Log Field Delivery <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-[#E2E4E0]">
              {dueOrDelayedActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <MetaLine items={[<span key="c" className="font-mono text-[#1B4D3E]">{act.code}</span>, act.ownerPartner, act.location, `Due ${act.currentDueDate}`]} />
                    <div className="font-medium text-[#14191F] mt-0.5">{act.title}</div>
                    <div className="text-[#525D68] font-mono tabular-nums mt-0.5">
                      Delivered {act.actualDelivered} / {act.plannedOutput} {act.outputUnit}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModule('capture')}
                    className="px-2.5 py-1.5 bg-[#1B4D3E] text-white font-medium rounded whitespace-nowrap shrink-0"
                  >
                    Record Delivery
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#14191F]">
              Returned Clarifications, Drafts & Assigned Corrective Actions
            </h2>
            {returnedOrDraftObs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#525D68]">Returned / Draft Submissions</div>
                {returnedOrDraftObs.map((obs) => {
                  const ind = state.indicators.find((i) => i.id === obs.indicatorId);
                  return (
                    <div key={obs.id} className="border border-[#E2E4E0] rounded p-3 text-xs flex items-start justify-between gap-3">
                      <div>
                        <MetaLine items={[<span key="c" className="font-mono">{ind?.code}</span>, obs.period, <ApprovalText key="a" status={obs.approvalStatus} />]} />
                        <div className="font-medium text-[#14191F] mt-0.5">{ind?.title}</div>
                        {obs.reviewerComments.length > 0 && (
                          <div className="text-[#B91C1C] mt-1">
                            Reviewer: {obs.reviewerComments[obs.reviewerComments.length - 1].text}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveModule('capture')}
                        className="text-[#1B4D3E] font-medium hover:underline whitespace-nowrap shrink-0"
                      >
                        Fix & Submit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[#E2E4E0]">
              <div className="text-xs font-medium text-[#525D68]">Open Corrective Actions Assigned to Partners</div>
              {openActions.length === 0 ? (
                <p className="text-xs text-[#525D68]">No open corrective actions.</p>
              ) : (
                openActions.map((act) => (
                  <div key={act.id} className="border border-[#E2E4E0] rounded p-3 text-xs flex items-start justify-between gap-3">
                    <div>
                      <MetaLine items={[act.category, `Due ${act.dueDate}`, act.status.replace('_', ' ')]} />
                      <div className="font-medium text-[#14191F] mt-0.5">{act.title}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule('checks')}
                      className="text-[#1B4D3E] font-medium hover:underline whitespace-nowrap shrink-0"
                    >
                      Submit Proof
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* M&E REVIEWER HOME */}
      {state.activeRole === 'me_reviewer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#1B4D3E]" />
                <h2 className="text-sm font-semibold text-[#14191F]">
                  Recurring Quality Checks ({checks.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('checks')}
                className="text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                Open Full Checks Desk →
              </button>
            </div>
            <div className="divide-y divide-[#E2E4E0]">
              {checks.slice(0, 6).map((chk) => (
                <div key={chk.id} className="py-2.5 text-xs flex items-start justify-between gap-3">
                  <div>
                    <MetaLine
                      items={[
                        <span key="c" className={chk.severity === 'high' ? 'text-[#B91C1C] font-semibold' : 'text-[#B45309] font-medium'}>
                          {chk.category}
                        </span>,
                        chk.hasLinkedAction ? 'Action Assigned' : 'Needs Action',
                      ]}
                    />
                    <div className="font-medium text-[#14191F] mt-0.5">{chk.title}</div>
                    <div className="text-[#525D68] mt-0.5">{chk.detail}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModule('checks')}
                    className="text-[#1B4D3E] font-medium hover:underline shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#1B4D3E]" />
                <h2 className="text-sm font-semibold text-[#14191F]">
                  Submissions & Corrective Actions Queue
                </h2>
              </div>
              <span className="font-mono text-xs text-[#525D68]">
                {submittedObs.length} submitted · {openActions.length} open actions
              </span>
            </div>
            <div className="space-y-2.5 text-xs">
              {submittedObs.map((obs) => {
                const ind = state.indicators.find((i) => i.id === obs.indicatorId);
                return (
                  <div key={obs.id} className="border border-[#E2E4E0] rounded p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[#14191F]">
                        <span className="font-mono text-[#1B4D3E]">{ind?.code}</span> · {obs.reportedValue ?? 'Missing'} {obs.unit} ({obs.period})
                      </div>
                      <div className="text-[#525D68] mt-0.5">{obs.partner} · {obs.sourceCitation.documentName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule('checks')}
                      className="px-2.5 py-1 bg-[#1B4D3E] text-white font-medium rounded shrink-0"
                    >
                      Approve / Return
                    </button>
                  </div>
                );
              })}
              {openActions.map((act) => (
                <div key={act.id} className="border border-[#E2E4E0] rounded p-3 flex items-center justify-between gap-3">
                  <div>
                    <MetaLine items={[act.category, act.owner, act.status === 'evidence_submitted' ? 'Closure proof ready' : 'Open']} />
                    <div className="font-medium text-[#14191F] mt-0.5">{act.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModule('checks')}
                    className="text-[#1B4D3E] font-medium hover:underline shrink-0"
                  >
                    {act.status === 'evidence_submitted' ? 'Verify & Close' : 'Track'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* INDEPENDENT EVALUATOR HOME */}
      {state.activeRole === 'independent_evaluator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#1B4D3E]" />
                <h2 className="text-sm font-semibold text-[#14191F]">
                  Unresolved Evaluation Questions ({evalQuestions.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('evaluation')}
                className="text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                Evaluation Workspace →
              </button>
            </div>
            <div className="divide-y divide-[#E2E4E0]">
              {evalQuestions.map((q) => (
                <div key={q.id} className="py-3 text-xs space-y-1">
                  <MetaLine
                    items={[
                      <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{q.code}</span>,
                      q.criterion,
                      q.sector,
                      <span key="r" className="text-[#B45309] font-medium">{q.readiness.replace(/_/g, ' ')}</span>,
                    ]}
                  />
                  <div className="font-medium text-[#14191F]">{q.question}</div>
                  <div className="text-[#525D68]">Gap: {q.remainingGaps}</div>
                  <div className="pt-1 flex gap-3">
                    <button
                      type="button"
                      onClick={() => openInspector({ type: 'question', id: q.id })}
                      className="text-[#1B4D3E] font-medium hover:underline"
                    >
                      Trace Evidence Trail
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModule('evaluation')}
                      className="text-[#525D68] hover:text-[#14191F] hover:underline"
                    >
                      Update Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#14191F]">
              Issued Handover Snapshot & Flagged Claims
            </h2>
            {latestSnapshot && (
              <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3.5 text-xs space-y-1.5">
                <div className="font-semibold text-[#14191F]">{latestSnapshot.label}</div>
                <MetaLine items={[`Issued ${latestSnapshot.createdAt}`, latestSnapshot.createdBy, `${latestSnapshot.approvedIndicators.length} frozen figures`]} />
                {snapshotDiffs.length > 0 ? (
                  <div className="text-[#B45309] font-medium pt-1">
                    {snapshotDiffs.length} post-handover live correction(s) detected — frozen snapshot remains preserved.
                  </div>
                ) : (
                  <div className="text-[#15803D] pt-1">Live approved figures match issued snapshot.</div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[#E2E4E0] text-xs">
              <div className="font-medium text-[#525D68]">Observations Flagged or Requiring Fieldwork</div>
              {projectObs
                .filter((o) => o.verificationStatus !== 'verified')
                .slice(0, 5)
                .map((obs) => {
                  const ind = state.indicators.find((i) => i.id === obs.indicatorId);
                  return (
                    <button
                      key={obs.id}
                      type="button"
                      onClick={() => openInspector({ type: 'observation', id: obs.id })}
                      className="w-full text-left border border-[#E2E4E0] rounded p-2.5 hover:border-[#1B4D3E] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#14191F] truncate">
                          <span className="font-mono text-[#1B4D3E] mr-1">{ind?.code}</span>
                          {obs.reportedValue ?? 'Missing'} {obs.unit} ({obs.period})
                        </div>
                        <div className="text-[#525D68] truncate">{obs.sourceCitation.documentName}</div>
                      </div>
                      <VerificationText status={obs.verificationStatus} />
                    </button>
                  );
                })}
            </div>
          </section>
        </div>
      )}

      {/* FUNDER HOME */}
      {state.activeRole === 'funder' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[#14191F]">
                  Approved Headline Progress (Read-Only Funder View)
                </h2>
                <p className="text-xs text-[#525D68] mt-0.5">
                  Displays strictly approved figures with transparent provenance and independent verification state. Unapproved partner drafts are excluded.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('reports')}
                className="px-3.5 py-2 bg-[#1B4D3E] text-white text-xs font-medium rounded-md hover:bg-[#143B2F] whitespace-nowrap"
              >
                Open Donor Report & Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                    <th className="py-2 pr-3 font-medium">Indicator</th>
                    <th className="py-2 pr-3 font-medium text-right">Baseline</th>
                    <th className="py-2 pr-3 font-medium text-right">Approved</th>
                    <th className="py-2 pr-3 font-medium text-right">Target</th>
                    <th className="py-2 pr-3 font-medium">Provenance</th>
                    <th className="py-2 font-medium">Independent Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E4E0]">
                  {state.indicators
                    .filter((i) => i.projectId === pid)
                    .map((ind) => {
                      const calc = computeIndicatorState(state, ind);
                      return (
                        <tr key={ind.id} className="hover:bg-[#F7F7F5]">
                          <td className="py-2.5 pr-3">
                            <button
                              type="button"
                              onClick={() => openInspector({ type: 'indicator', id: ind.id })}
                              className="text-left hover:text-[#1B4D3E]"
                            >
                              <span className="font-mono text-[#1B4D3E] mr-1.5">{ind.code}</span>
                              <span className="font-medium text-[#14191F]">{ind.title}</span>
                            </button>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-[#525D68]">
                            {ind.baseline ?? '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold text-[#14191F]">
                            {calc.approvedValue !== null ? `${calc.approvedValue} ${ind.unit}` : 'Missing'}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-[#525D68]">
                            {ind.target ?? '—'}
                          </td>
                          <td className="py-2.5 pr-3">
                            <ProvenanceText provenance={calc.latestApprovedObs?.provenance || ind.provenance} />
                          </td>
                          <td className="py-2.5">
                            <VerificationText status={calc.latestApprovedObs?.verificationStatus || 'unverified'} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-[#525D68]">
              {approvedObs.length} approved observation(s) available for export · Click any row to verify its source page/tab citation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
