import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Plus } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { ApprovalText, MetaLine, ProvenanceText, SimulatedNotice } from '../shared/StatusText';

export const SurveysView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    importSurveyResult,
    approveSurveyResult,
  } = useMeal();

  const pid = state.activeProjectId;
  const instruments = state.surveyInstruments.filter((s) => s.projectId === pid);
  const results = state.surveyResults.filter((r) => r.projectId === pid);
  const projectIndicators = state.indicators.filter((i) => i.projectId === pid);

  const [showImport, setShowImport] = useState(false);
  const [instId, setInstId] = useState(instruments[0]?.id || '');
  const [indId, setIndId] = useState(instruments[0]?.linkedIndicatorIds[0] || projectIndicators[0]?.id || '');
  const [period, setPeriod] = useState(instruments[0]?.period || activeProject.reportingCycles[activeProject.reportingCycles.length - 1]?.label || '');
  const [location, setLocation] = useState(activeProject.locations[0]?.name || '');
  const [popGroup, setPopGroup] = useState(pid === 'childfund-uganda' ? 'Endline Sampled Farming Households (All 4 Districts)' : 'Omugo CFS Children Sample');
  const [val, setVal] = useState(pid === 'childfund-uganda' ? '68.5' : '82');
  const [denom, setDenom] = useState(pid === 'childfund-uganda' ? '267' : '185');
  const [tableRef, setTableRef] = useState(pid === 'childfund-uganda' ? 'Endline Household Survey Table 4.2 (Simulated)' : 'Endline Table 3.18 Spot-Check');

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const inst = instruments.find((i) => i.id === instId) || instruments[0];
    const ind = projectIndicators.find((i) => i.id === indId);
    if (!inst || !ind) return;

    const numDenom = denom.trim() === '' ? null : Number(denom);
    const periodMatch = inst.period === period;
    const denomStatus: 'valid' | 'missing' | 'mismatch_warning' =
      numDenom === null || Number.isNaN(numDenom)
        ? 'missing'
        : inst.plannedSampleSize > 0 && Math.abs(numDenom - inst.plannedSampleSize) > inst.plannedSampleSize * 0.25
        ? 'mismatch_warning'
        : 'valid';

    importSurveyResult({
      projectId: pid,
      instrumentId: inst.id,
      indicatorId: ind.id,
      period,
      location,
      populationGroup: popGroup.trim(),
      value: val.trim() === '' ? null : Number(val),
      unit: ind.unit,
      denominator: numDenom,
      expectedDenominator: inst.plannedSampleSize,
      periodCheckStatus: periodMatch ? 'valid' : 'mismatch_warning',
      denominatorCheckStatus: denomStatus,
      checkNote:
        denomStatus === 'missing'
          ? 'Denominator (n) missing — verify sample size before approval.'
          : denomStatus === 'mismatch_warning'
          ? `Imported n=${numDenom} diverges >25% from planned instrument sample (n=${inst.plannedSampleSize}).`
          : !periodMatch
          ? `Selected period (${period}) differs from instrument window (${inst.period}).`
          : 'Period and sample denominator match instrument design.',
      approvalStatus: 'submitted',
      provenance: 'synthetic',
      sourceCitation: {
        documentId: inst.sourceCitation.documentId,
        documentName: inst.fileName,
        sectionOrTab: 'Aggregate Survey Result Import (De-identified)',
        pageOrRow: tableRef.trim() || 'Summary Table',
        originalAvailable: inst.sourceCitation.originalAvailable,
      },
    });
    setShowImport(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={[activeProject.shortName, 'Baseline & Endline Instruments · Aggregate De-Identified Results Only']} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            Surveys & Assessments
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-3xl">
            Link baseline and endline questionnaires directly to indicators and evaluation questions, import aggregate results with automated period and denominator checks, and approve validated findings back to their exact source.
          </p>
        </div>
        {!roleMeta.isReadOnly && (
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B4D3E] text-white text-xs font-medium rounded-md hover:bg-[#143B2F] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Import Aggregate Survey Result
          </button>
        )}
      </div>

      {/* Aggregate Survey Import Form */}
      {showImport && (
        <form onSubmit={handleImport} className="bg-white border-2 border-[#1B4D3E] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#14191F]">
              Import De-Identified Aggregate Survey Result (Runs Period & Denominator Checks)
            </h2>
            <SimulatedNotice label="Aggregate survey entry (no participant PII)" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Survey Instrument</span>
              <select
                value={instId}
                onChange={(e) => setInstId(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
              >
                {instruments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Target Indicator</span>
              <select
                value={indId}
                onChange={(e) => setIndId(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
              >
                {projectIndicators.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Reporting Period</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
              >
                {activeProject.reportingCycles.map((c) => (
                  <option key={c.id} value={c.label}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Aggregate Value</span>
              <input
                type="number"
                step="any"
                required
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Sample Denominator (n) — leave blank to test warning</span>
              <input
                type="number"
                value={denom}
                onChange={(e) => setDenom(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Location</span>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
              >
                {activeProject.locations.map((l) => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Source Table / Page Ref</span>
              <input
                value={tableRef}
                onChange={(e) => setTableRef(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2 font-mono"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowImport(false)} className="px-3 py-1.5 text-[#525D68]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-[#1B4D3E] text-white font-medium rounded">
              Run Checks & Import Aggregate Result
            </button>
          </div>
        </form>
      )}

      {/* Survey Instruments Linked to Questions & Indicators */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {instruments.map((inst) => {
          const linkedInds = state.indicators.filter((i) => inst.linkedIndicatorIds.includes(i.id));
          const linkedQs = state.evaluationQuestions.filter((q) => inst.linkedQuestionIds.includes(q.id));
          return (
            <div key={inst.id} className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <MetaLine
                    items={[
                      <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{inst.code}</span>,
                      inst.type,
                      inst.period,
                      <ProvenanceText key="p" provenance={inst.provenance} />,
                    ]}
                  />
                  <h2 className="mt-1 text-sm font-semibold text-[#14191F]">{inst.title}</h2>
                </div>
                <ClipboardCheck className="w-4 h-4 text-[#1B4D3E] shrink-0" />
              </div>

              <div className="font-mono text-[11px] text-[#525D68]">{inst.fileName}</div>
              <p className="text-[#525D68] leading-relaxed">{inst.notes}</p>

              <div className="grid grid-cols-2 gap-3 bg-[#F7F7F5] border border-[#E2E4E0] rounded p-3">
                <div>
                  <div className="text-[11px] text-[#525D68]">Population (Aggregate Only)</div>
                  <div className="font-medium text-[#14191F] mt-0.5">{inst.population}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#525D68]">Planned / Achieved Sample (n)</div>
                  <div className="font-mono tabular-nums font-semibold text-[#14191F] mt-0.5">
                    Planned n={inst.plannedSampleSize} · Achieved{' '}
                    {inst.achievedSampleSize !== null ? `n=${inst.achievedSampleSize}` : 'Pending'}
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-[#525D68]">
                  Measures Indicators:{' '}
                  {linkedInds.map((i, idx) => (
                    <React.Fragment key={i.id}>
                      {idx > 0 && ', '}
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'indicator', id: i.id })}
                        className="font-mono text-[#1B4D3E] hover:underline"
                      >
                        {i.code}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <div className="text-[#525D68]">
                  Answers Evaluation Questions:{' '}
                  {linkedQs.map((q, idx) => (
                    <React.Fragment key={q.id}>
                      {idx > 0 && ', '}
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'question', id: q.id })}
                        className="font-mono text-[#1B4D3E] hover:underline"
                      >
                        {q.code}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Aggregate Survey Results Table with Period & Denominator Validation */}
      <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
        <div>
          <h2 className="text-base font-semibold text-[#14191F]">
            Imported Aggregate Survey Findings & Validation Checks ({results.length})
          </h2>
          <p className="text-[#525D68] mt-0.5">
            Approving a validated survey result links the finding back to its exact report table/page and updates the indicator’s approved record.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                <th className="py-2.5 pr-3 font-medium">Indicator & Population</th>
                <th className="py-2.5 pr-3 font-medium">Period</th>
                <th className="py-2.5 pr-3 font-medium text-right">Value (n)</th>
                <th className="py-2.5 pr-3 font-medium">Period & Denominator Checks</th>
                <th className="py-2.5 pr-3 font-medium">Source & Status</th>
                <th className="py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E4E0]">
              {results.map((r) => {
                const ind = state.indicators.find((i) => i.id === r.indicatorId);
                return (
                  <tr key={r.id} className="hover:bg-[#F7F7F5] align-top">
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'indicator', id: r.indicatorId })}
                        className="text-left font-medium text-[#14191F] hover:text-[#1B4D3E]"
                      >
                        <span className="font-mono text-[#1B4D3E] mr-1.5">{ind?.code}</span>
                        {ind?.title}
                      </button>
                      <div className="text-[#525D68] mt-0.5">{r.populationGroup}</div>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap font-mono">{r.period}</td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-[#14191F]">
                        {r.value !== null ? `${r.value} ${r.unit}` : 'Missing'}
                      </div>
                      <div className="text-[#525D68]">
                        n = {r.denominator !== null ? r.denominator : 'Missing'}
                      </div>
                    </td>
                    <td className="py-3 pr-3 max-w-xs">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={
                            r.periodCheckStatus === 'valid'
                              ? 'text-[#15803D] inline-flex items-center gap-1'
                              : 'text-[#B45309] font-medium inline-flex items-center gap-1'
                          }
                        >
                          {r.periodCheckStatus === 'valid' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          Period: {r.periodCheckStatus === 'valid' ? 'Aligned' : 'Window Mismatch'}
                        </span>
                        <span
                          className={
                            r.denominatorCheckStatus === 'valid'
                              ? 'text-[#15803D] inline-flex items-center gap-1'
                              : 'text-[#B91C1C] font-medium inline-flex items-center gap-1'
                          }
                        >
                          {r.denominatorCheckStatus === 'valid' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          Denominator: {r.denominatorCheckStatus.replace('_', ' ')}
                        </span>
                        {r.checkNote && <span className="text-[11px] text-[#525D68]">{r.checkNote}</span>}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <MetaLine
                        items={[
                          <ProvenanceText key="p" provenance={r.provenance} />,
                          <ApprovalText key="a" status={r.approvalStatus} />,
                        ]}
                      />
                      <div className="font-mono text-[11px] text-[#525D68] mt-0.5">
                        {r.sourceCitation.documentName} · {r.sourceCitation.pageOrRow}
                      </div>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {r.approvalStatus !== 'approved' && roleMeta.canApproveResults ? (
                        <button
                          type="button"
                          onClick={() => approveSurveyResult(r.id)}
                          className="px-3 py-1.5 bg-[#1B4D3E] text-white font-medium rounded hover:bg-[#143B2F]"
                        >
                          Approve & Link
                        </button>
                      ) : r.linkedObservationId ? (
                        <button
                          type="button"
                          onClick={() => openInspector({ type: 'observation', id: r.linkedObservationId! })}
                          className="text-[#1B4D3E] font-medium hover:underline"
                        >
                          Inspect Linked
                        </button>
                      ) : (
                        <span className="text-[#525D68]">M&E Reviewer approves</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
