import React, { useState } from 'react';
import { ArrowUpRight, BookOpen, ExternalLink, FileWarning, ShieldCheck, X } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeIndicatorState, generateDeterministicCitedBrief, resolveKnowledgeGraph } from '../../lib/mealEngine';
import { VerificationStatus } from '../../types/meal';
import { ApprovalText, MetaLine, ProvenanceText, SimulatedNotice, VerificationText } from './StatusText';

export const InspectorDrawer: React.FC = () => {
  const {
    state,
    inspector,
    roleMeta,
    closeInspector,
    openInspector,
    setActiveModule,
    addIndependentNote,
  } = useMeal();

  const [evalStatus, setEvalStatus] = useState<VerificationStatus>('flagged_discrepancy');
  const [evalNote, setEvalNote] = useState('');
  const [evalFlag, setEvalFlag] = useState(true);
  const [pushQuestionId, setPushQuestionId] = useState('');
  const [showBrief, setShowBrief] = useState(false);

  if (!inspector) return null;

  const projectQuestions = state.evaluationQuestions.filter((q) => q.projectId === state.activeProjectId);

  let indicator =
    inspector.type === 'indicator'
      ? state.indicators.find((i) => i.id === inspector.id)
      : inspector.type === 'observation'
      ? state.indicators.find(
          (i) => i.id === state.observations.find((o) => o.id === inspector.id)?.indicatorId
        )
      : undefined;

  const observation =
    inspector.type === 'observation'
      ? state.observations.find((o) => o.id === inspector.id)
      : indicator
      ? state.observations
          .filter((o) => o.indicatorId === indicator!.id && o.projectId === state.activeProjectId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
      : undefined;

  const activity =
    inspector.type === 'activity'
      ? state.activities.find((a) => a.id === inspector.id)
      : undefined;

  const document =
    inspector.type === 'document'
      ? state.documents.find((d) => d.id === inspector.id)
      : observation
      ? state.documents.find((d) => d.id === observation.sourceCitation.documentId)
      : undefined;

  const calc = indicator ? computeIndicatorState(state, indicator) : null;

  const graphTargetType =
    inspector.type === 'observation' ? 'indicator' : inspector.type;
  const graphTargetId =
    inspector.type === 'observation' ? indicator?.id || inspector.id : inspector.id;
  const graph = resolveKnowledgeGraph(state, graphTargetType, graphTargetId);

  const citedBrief =
    showBrief && graphTargetType !== 'document'
      ? generateDeterministicCitedBrief(state, graphTargetType, graphTargetId)
      : null;

  const handleSaveEvaluatorNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observation || !evalNote.trim()) return;
    addIndependentNote(
      observation.id,
      evalStatus,
      evalNote.trim(),
      evalFlag,
      pushQuestionId || undefined
    );
    setEvalNote('');
    setPushQuestionId('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 no-print" onClick={closeInspector}>
      <aside
        className="w-full max-w-xl bg-white h-full border-l border-[#E2E4E0] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        aria-label="Source and Knowledge Inspector"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2E4E0] bg-[#F7F7F5]">
          <div className="min-w-0">
            <MetaLine
              items={[
                <span key="t" className="font-mono uppercase text-[11px] tracking-wide text-[#1B4D3E]">
                  {inspector.type} Inspector
                </span>,
                observation ? <ProvenanceText key="p" provenance={observation.provenance} /> : null,
                document ? (document.originalAvailable ? 'Original File Available' : 'Source File Missing') : null,
              ]}
            />
            <h2 className="mt-1 text-base font-semibold text-[#14191F] leading-snug">
              {graph.title}
            </h2>
            {graph.subtitle && <p className="text-xs text-[#525D68] mt-0.5">{graph.subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={closeInspector}
            className="p-1.5 text-[#525D68] hover:text-[#14191F] rounded hover:bg-[#E2E4E0]/50"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
          {/* Numeric Calculation & State Summary */}
          {indicator && calc && (
            <section className="space-y-3 pb-5 border-b border-[#E2E4E0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525D68]">
                Result, Calculation & Governance State
              </h3>

              <div className="grid grid-cols-3 gap-3 bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3.5">
                <div>
                  <div className="text-[11px] text-[#525D68]">Approved Figure</div>
                  <div className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-[#14191F]">
                    {calc.approvedValue !== null ? `${calc.approvedValue} ${indicator.unit}` : 'Missing'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#525D68]">Draft Preview</div>
                  <div className={`mt-0.5 text-lg font-semibold font-mono tabular-nums ${calc.hasDraftDifference ? 'text-[#B45309]' : 'text-[#525D68]'}`}>
                    {calc.draftPreviewValue !== null ? `${calc.draftPreviewValue} ${indicator.unit}` : 'Missing'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#525D68]">Baseline / Target</div>
                  <div className="mt-0.5 text-sm font-mono tabular-nums text-[#14191F]">
                    {indicator.baseline ?? '—'} → {indicator.target ?? '—'} {indicator.unit}
                  </div>
                </div>
              </div>

              {calc.hasDraftDifference && (
                <p className="text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded px-3 py-2">
                  Unapproved draft/submitted changes exist. Partner preview reflects{' '}
                  <strong className="font-mono tabular-nums">{calc.draftPreviewValue} {indicator.unit}</strong>, while donor reports retain the last approved value of{' '}
                  <strong className="font-mono tabular-nums">{calc.approvedValue ?? 'Missing'} {indicator.unit}</strong>.
                </p>
              )}

              <dl className="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <dt className="font-medium text-[#525D68]">Definition</dt>
                  <dd className="text-[#14191F] mt-0.5 leading-relaxed">{indicator.definition}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <dt className="font-medium text-[#525D68]">Calculation Method</dt>
                    <dd className="text-[#14191F] mt-0.5 font-mono">
                      {indicator.calculationMethod === 'register_aggregate'
                        ? 'Register Aggregation'
                        : indicator.calculationMethod === 'formula'
                        ? 'Formula Derived'
                        : 'Direct Period Entry'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#525D68]">Responsible Partner</dt>
                    <dd className="text-[#14191F] mt-0.5">{indicator.responsiblePartner}</dd>
                  </div>
                </div>
                {indicator.formula && (
                  <div className="bg-[#F0F1EE] rounded px-3 py-2 font-mono text-[11px] text-[#14191F]">
                    <div>Rule: {indicator.formula.expressionLabel}</div>
                    {calc.formulaInputsLabel && <div className="text-[#525D68] mt-0.5">Inputs: {calc.formulaInputsLabel}</div>}
                  </div>
                )}
                {observation && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E4E0]">
                    <div>
                      <dt className="font-medium text-[#525D68]">Internal Approval</dt>
                      <dd className="mt-0.5">
                        <ApprovalText status={observation.approvalStatus} />
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#525D68]">Independent Verification</dt>
                      <dd className="mt-0.5">
                        <VerificationText status={observation.verificationStatus} />
                      </dd>
                    </div>
                  </div>
                )}
                {observation?.breakdownSummary && (
                  <div>
                    <dt className="font-medium text-[#525D68]">Disaggregated Breakdown</dt>
                    <dd className="text-[#14191F] mt-0.5">{observation.breakdownSummary}</dd>
                  </div>
                )}
              </dl>

              {calc.warningFlags.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {calc.warningFlags.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded px-3 py-2">
                      <FileWarning className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Source Reference & What Source Establishes */}
          {(observation || document) && (
            <section className="space-y-2.5 pb-5 border-b border-[#E2E4E0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525D68]">
                Exact Source Citation & Epistemic Scope
              </h3>
              {observation && (
                <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3.5 text-xs space-y-1.5">
                  <div className="font-semibold text-[#14191F]">{observation.sourceCitation.documentName}</div>
                  <MetaLine
                    items={[
                      observation.sourceCitation.version,
                      `Tab / Section: ${observation.sourceCitation.sectionOrTab}`,
                      `Page / Row: ${observation.sourceCitation.pageOrRow}`,
                      observation.importedFromCsv
                        ? `CSV Import: ${observation.importedFromCsv.fileName} (Row ${observation.importedFromCsv.rowNumber})`
                        : null,
                    ]}
                  />
                  {observation.sourceCitation.quoteOrNote && (
                    <p className="text-[#525D68] italic pt-1">“{observation.sourceCitation.quoteOrNote}”</p>
                  )}
                  <div className="pt-1 font-medium text-[#14191F]">
                    Original Record:{' '}
                    <span className={observation.sourceCitation.originalAvailable ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                      {observation.sourceCitation.originalAvailable ? 'Available in project repository' : 'Unavailable — Source gap logged'}
                    </span>
                  </div>
                </div>
              )}
              {document && (
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-[#15803D]">What this source supports: </span>
                    <span className="text-[#14191F]">{document.supports}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#B45309]">What it cannot establish: </span>
                    <span className="text-[#14191F]">{document.cannotEstablish}</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Activity Details if inspecting an Activity */}
          {activity && (
            <section className="space-y-2 pb-5 border-b border-[#E2E4E0] text-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525D68]">
                Workplan Delivery & Change History
              </h3>
              <div className="grid grid-cols-2 gap-3 bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3">
                <div>
                  <span className="text-[#525D68]">Planned vs. Actual</span>
                  <div className="font-mono font-semibold tabular-nums text-[#14191F] mt-0.5">
                    {activity.actualDelivered} / {activity.plannedOutput} {activity.outputUnit}
                  </div>
                </div>
                <div>
                  <span className="text-[#525D68]">Due Date (Planned → Current)</span>
                  <div className="font-mono tabular-nums text-[#14191F] mt-0.5">
                    {activity.plannedDueDate} → {activity.currentDueDate}
                  </div>
                </div>
              </div>
              <div>
                <span className="font-medium text-[#525D68]">Evidence Requirements: </span>
                <span className="text-[#14191F]">{activity.evidenceRequirements.join('; ')}</span>
              </div>
              {activity.changeLog.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="font-medium text-[#525D68]">Retained Plan Change Reasons</div>
                  {activity.changeLog.map((chg) => (
                    <div key={chg.id} className="bg-[#F7F7F5] border border-[#E2E4E0] rounded p-2">
                      <div className="font-mono text-[11px] text-[#525D68]">
                        {chg.date} · {chg.field}: {chg.previousValue} → {chg.newValue} ({chg.changedBy})
                      </div>
                      <div className="text-[#14191F] mt-0.5">{chg.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Revision History */}
          {observation && observation.revisionHistory.length > 0 && (
            <section className="space-y-2 pb-5 border-b border-[#E2E4E0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525D68]">
                Approval & Correction Revision History
              </h3>
              <div className="space-y-2">
                {observation.revisionHistory.map((rev) => (
                  <div key={rev.version} className="text-xs bg-[#F7F7F5] border border-[#E2E4E0] rounded p-2.5">
                    <MetaLine
                      items={[
                        <span key="v" className="font-mono font-semibold text-[#14191F]">v{rev.version}</span>,
                        <span key="d" className="font-mono">{rev.date}</span>,
                        rev.changedBy,
                      ]}
                    />
                    <div className="mt-1 font-mono tabular-nums text-[#14191F]">
                      {rev.previousValue ?? 'Initial'} → <strong>{rev.newValue ?? 'Missing'}</strong> ({rev.previousStatus} → {rev.newStatus})
                    </div>
                    <div className="mt-0.5 text-[#525D68]">{rev.reason}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Independent Evaluator Verification Notes (Non-Mutating on Partner Record) */}
          {observation && (
            <section className="space-y-3 pb-5 border-b border-[#E2E4E0]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525D68]">
                  Independent Evaluator Notes (Read-Only on Implementation Record)
                </h3>
                <ShieldCheck className="w-4 h-4 text-[#1B4D3E]" />
              </div>

              {observation.independentNotes.length === 0 ? (
                <p className="text-xs text-[#525D68]">No independent verification notes recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {observation.independentNotes.map((n) => (
                    <div key={n.id} className="text-xs bg-[#F7F7F5] border border-[#E2E4E0] rounded p-3">
                      <MetaLine
                        items={[
                          <VerificationText key="s" status={n.status} />,
                          n.author,
                          <span key="dt" className="font-mono">{n.date}</span>,
                          n.discrepancyFlag ? <span key="f" className="text-[#B91C1C] font-semibold">Discrepancy Flagged</span> : null,
                        ]}
                      />
                      <p className="mt-1 text-[#14191F]">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}

              {roleMeta.canVerifyIndependently ? (
                <form onSubmit={handleSaveEvaluatorNote} className="space-y-2.5 bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3.5">
                  <div className="text-xs font-semibold text-[#14191F]">
                    Add Independent Note / Flag Discrepancy
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={evalStatus}
                      onChange={(e) => setEvalStatus(e.target.value as VerificationStatus)}
                      className="bg-white border border-[#E2E4E0] rounded px-2 py-1.5 text-xs"
                    >
                      <option value="verified">Independently Verified</option>
                      <option value="flagged_discrepancy">Discrepancy Flagged</option>
                      <option value="fieldwork_required">Needs New Fieldwork</option>
                    </select>
                    <select
                      value={pushQuestionId}
                      onChange={(e) => setPushQuestionId(e.target.value)}
                      className="bg-white border border-[#E2E4E0] rounded px-2 py-1.5 text-xs"
                    >
                      <option value="">Optional: Push to Evaluation Plan...</option>
                      {projectQuestions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.code}: {q.question.slice(0, 42)}...
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={evalNote}
                    onChange={(e) => setEvalNote(e.target.value)}
                    placeholder="Record independent verification note or claim discrepancy (will not alter partner figure)..."
                    className="w-full bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-1.5 text-xs text-[#525D68]">
                      <input
                        type="checkbox"
                        checked={evalFlag}
                        onChange={(e) => setEvalFlag(e.target.checked)}
                      />
                      Flag as discrepancy needing verification
                    </label>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#1B4D3E] text-white text-xs font-medium rounded hover:bg-[#143B2F] whitespace-nowrap"
                    >
                      Save Evaluator Note
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-[11px] text-[#525D68]">
                  Switch role to <strong>Independent Evaluator</strong> in the top bar to add non-mutating verification notes or flag discrepancies.
                </p>
              )}
            </section>
          )}

          {/* Cross-Entity Knowledge Base Explorer */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525D68]">
                Connected Lifecycle Trail (Knowledge Base)
              </h3>
              {graphTargetType !== 'document' && (
                <button
                  type="button"
                  onClick={() => setShowBrief((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] hover:underline"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {showBrief ? 'Hide Cited Summary' : 'Generate Cited Summary'}
                </button>
              )}
            </div>

            {citedBrief && (
              <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#14191F]">Source-Cited Lifecycle Brief</span>
                  <SimulatedNotice label="Rule-based synthesis" />
                </div>
                <div>
                  <div className="font-medium text-[#525D68]">What was committed</div>
                  {citedBrief.whatWasCommitted.map((line, i) => (
                    <p key={i} className="text-[#14191F] mt-0.5">{line}</p>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-[#525D68]">What happened</div>
                  {citedBrief.whatHappened.map((line, i) => (
                    <p key={i} className="text-[#14191F] mt-0.5">{line}</p>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-[#15803D]">What evidence supports</div>
                  {citedBrief.whatEvidenceSupports.map((line, i) => (
                    <p key={i} className="text-[#14191F] mt-0.5">{line}</p>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-[#B91C1C]">Missing or conflicting evidence</div>
                  {citedBrief.missingOrConflicting.map((line, i) => (
                    <p key={i} className="text-[#B91C1C] mt-0.5">{line}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="border border-[#E2E4E0] rounded p-2.5">
                <div className="font-medium text-[#525D68]">Commitments ({graph.commitments.length})</div>
                {graph.commitments.length === 0 ? (
                  <div className="text-[#525D68] mt-0.5">None linked</div>
                ) : (
                  graph.commitments.map((c) => (
                    <div key={c.id} className="mt-1 text-[#14191F]">
                      <span className="font-mono text-[#1B4D3E]">{c.code}</span> · {c.title}
                    </div>
                  ))
                )}
              </div>

              <div className="border border-[#E2E4E0] rounded p-2.5">
                <div className="font-medium text-[#525D68]">Workplan Activities ({graph.activities.length})</div>
                {graph.activities.length === 0 ? (
                  <div className="text-[#525D68] mt-0.5">None linked</div>
                ) : (
                  graph.activities.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => openInspector({ type: 'activity', id: a.id })}
                      className="mt-1 flex items-center justify-between w-full text-left text-[#14191F] hover:text-[#1B4D3E]"
                    >
                      <span>
                        <span className="font-mono">{a.code}</span> · {a.title} ({a.actualDelivered}/{a.plannedOutput})
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ))
                )}
              </div>

              <div className="border border-[#E2E4E0] rounded p-2.5">
                <div className="font-medium text-[#525D68]">Related Documents ({graph.documents.length})</div>
                {graph.documents.map((d) => (
                  <div key={d.id} className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[#14191F] truncate">
                      {d.title} <span className="text-[#525D68]">({d.version})</span>
                    </span>
                    <span className={d.originalAvailable ? 'text-[#15803D] shrink-0' : 'text-[#B91C1C] shrink-0'}>
                      {d.originalAvailable ? 'Available' : 'Missing'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border border-[#E2E4E0] rounded p-2.5">
                <div className="font-medium text-[#525D68]">
                  Corrective Actions ({graph.actions.length}) · Evaluation Questions ({graph.questions.length})
                </div>
                {graph.actions.map((a) => (
                  <div key={a.id} className="mt-1 text-[#14191F]">
                    Action [{a.status.replace('_', ' ')}]: {a.title}
                  </div>
                ))}
                {graph.questions.map((q) => (
                  <div key={q.id} className="mt-1 text-[#14191F]">
                    <span className="font-mono text-[#1B4D3E]">{q.code}</span>: {q.question}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveModule('knowledge');
                  closeInspector();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open full Knowledge Base
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModule('evaluation');
                  closeInspector();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Evaluation Workspace
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
