import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileCheck2,
  Printer,
  Plus,
} from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import {
  computeIndicatorState,
  formatApproval,
  formatProvenance,
  formatVerification,
  triggerCsvDownload,
} from '../../lib/mealEngine';
import {
  ApprovalText,
  MetaLine,
  ProvenanceText,
  VerificationText,
} from '../shared/StatusText';

export const ReportsExportsView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    updateReportNarrative,
    setActiveModule,
  } = useMeal();

  const pid = state.activeProjectId;
  const templates = activeProject.reportTemplates;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId]
  );

  const projectIndicators = useMemo(
    () => state.indicators.filter((i) => i.projectId === pid),
    [state.indicators, pid]
  );

  const calculatedRows = useMemo(
    () =>
      projectIndicators.map((ind) =>
        computeIndicatorState(state, ind, periodFilter === 'all' ? undefined : { period: periodFilter })
      ),
    [state, projectIndicators, periodFilter]
  );

  const draftDeltas = useMemo(
    () => calculatedRows.filter((r) => r.hasDraftDifference),
    [calculatedRows]
  );

  const projectDocs = useMemo(
    () => state.documents.filter((d) => d.projectId === pid),
    [state.documents, pid]
  );

  const reportLearningEntries = useMemo(
    () => state.learningEntries.filter((l) => l.projectId === pid && l.usedInReport),
    [state.learningEntries, pid]
  );

  const narrativeStoreKey = `${pid}::${activeTemplate?.id || ''}`;
  const savedNarratives = state.reportNarratives[narrativeStoreKey] || {};

  const getSectionBody = (secId: string, fallback: string) =>
    savedNarratives[secId] !== undefined ? savedNarratives[secId] : fallback;

  const handleInsertLearning = (secId: string, currentBody: string, entryTitle: string, entrySummary: string, sourceRef: string) => {
    const addition = `\n\n• ${entryTitle}: ${entrySummary} [${sourceRef}]`;
    updateReportNarrative(activeTemplate.id, secId, `${currentBody}${addition}`);
  };

  const handleExportCsv = () => {
    const headers = [
      'Project',
      'Project Code',
      'Report Template',
      'Period Filter',
      'Indicator Code',
      'Indicator Title',
      'Sector',
      'Level',
      'Unit',
      'Baseline',
      'Target',
      'Approved Result (Donor Report)',
      'Unapproved Draft Preview (Excluded from Report)',
      'Provenance',
      'Internal Approval Status',
      'Independent Verification Status',
      'Source Document',
      'Section / Tab',
      'Page / Row',
      'Original File Available',
      'Warnings / Evidence Gaps',
    ];

    const rows = calculatedRows.map((c) => {
      const obs = c.latestApprovedObs || c.latestAnyObs;
      return [
        activeProject.name,
        activeProject.code,
        activeTemplate?.name || 'Report',
        periodFilter === 'all' ? 'All Approved Periods' : periodFilter,
        c.indicator.code,
        c.indicator.title,
        c.indicator.sector,
        c.indicator.reportingLevel,
        c.indicator.unit,
        c.indicator.baseline ?? 'Missing',
        c.indicator.target ?? 'Not set',
        c.approvedValue !== null ? c.approvedValue : 'Missing / Unapproved',
        c.hasDraftDifference ? c.draftPreviewValue : '',
        obs ? formatProvenance(obs.provenance) : formatProvenance(c.indicator.provenance),
        obs ? formatApproval(obs.approvalStatus) : 'Unreported',
        obs ? formatVerification(obs.verificationStatus) : 'Unverified',
        obs?.sourceCitation.documentName || 'No approved source attached',
        obs?.sourceCitation.sectionOrTab || '',
        obs?.sourceCitation.pageOrRow || '',
        obs ? (obs.sourceCitation.originalAvailable ? 'Yes' : 'No — Gap') : 'No',
        c.warningFlags.join(' | '),
      ];
    });

    const slug = `${activeProject.id}_${activeTemplate?.type || 'report'}_${new Date().toISOString().slice(0, 10)}.csv`;
    triggerCsvDownload(slug, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-[#14191F] tracking-tight font-[var(--font-display)]">
            Donor Reports, Handover Packages & Exports
          </h1>
          <p className="text-sm text-[#525D68] mt-1">
            Official outputs display strictly <strong className="text-[#14191F]">internally approved figures</strong> with linked source appendices and explicit evidence gaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Report template"
            value={activeTemplate?.id || ''}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="bg-white border border-[#E2E4E0] rounded-md px-3 py-1.5 text-xs font-medium text-[#14191F]"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Report period"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="bg-white border border-[#E2E4E0] rounded-md px-3 py-1.5 text-xs text-[#14191F]"
          >
            <option value="all">All reporting periods</option>
            {activeProject.reportingCycles.map((c) => (
              <option key={c.id} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E2E4E0] bg-white rounded-md text-[#14191F] hover:bg-[#F7F7F5]"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F]"
          >
            <Printer className="w-3.5 h-3.5" />
            Print-Ready Report
          </button>
        </div>
      </div>

      {/* Explicit Draft Isolation Notice (Acceptance Check 3!) */}
      {draftDeltas.length > 0 && (
        <div className="bg-[#FEF3C7]/45 border border-[#F59E0B]/50 rounded-lg p-4 space-y-2 no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Unapproved Draft / Submitted Partner Figures Held Out of This Report ({draftDeltas.length})
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('checks')}
              className="text-xs font-medium text-[#92400E] underline"
            >
              Review pending submissions in Checks & Actions →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {draftDeltas.map((d) => (
              <div key={d.indicator.id} className="bg-white/80 border border-[#F59E0B]/30 rounded px-3 py-2 flex items-center justify-between gap-2">
                <span className="font-medium text-[#14191F]">
                  {d.indicator.code} — {d.indicator.title}
                </span>
                <span className="font-mono tabular-nums text-[11px] shrink-0">
                  <span className="text-[#15803D] font-semibold">
                    Approved: {d.approvedValue ?? 'Missing'}
                  </span>
                  {' · '}
                  <span className="text-[#B45309]">
                    Draft preview: {d.draftPreviewValue ?? '—'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable Report Surface */}
      <article className="bg-white border border-[#E2E4E0] rounded-lg p-6 lg:p-8 space-y-8">
        {/* Report Title Block */}
        <header className="border-b border-[#E2E4E0] pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-[#1B4D3E] font-medium">
              {activeProject.organisation} · {activeProject.code}
            </div>
            <h2 className="text-2xl font-bold text-[#14191F] tracking-tight font-[var(--font-display)]">
              {activeTemplate?.name}
            </h2>
            <p className="text-sm text-[#525D68]">{activeProject.name}</p>
            <MetaLine
              items={[
                `Audience: ${activeTemplate?.audience}`,
                `Donor: ${activeProject.donor}`,
                `Period Scope: ${periodFilter === 'all' ? 'Latest Approved Results' : periodFilter}`,
                `Timeframe: ${activeProject.timeframe}`,
              ]}
            />
          </div>
          <div className="text-xs text-[#525D68] font-mono sm:text-right space-y-1 shrink-0">
            <div className="inline-flex items-center gap-1.5 text-[#15803D] font-semibold">
              <FileCheck2 className="w-4 h-4" />
              Approved Figures Only
            </div>
            <div>Generated {new Date().toISOString().slice(0, 10)}</div>
            <div>Prepared via Miledge Programme Intelligence</div>
          </div>
        </header>

        {/* Approved Results Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#14191F] font-[var(--font-display)]">
              1. Approved Indicator Performance Table
            </h3>
            <span className="text-xs text-[#525D68] font-mono tabular-nums">
              {calculatedRows.filter((r) => r.approvedValue !== null).length} of {calculatedRows.length} indicators with approved values
            </span>
          </div>

          <div className="border border-[#E2E4E0] rounded-md overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F7F5] border-b border-[#E2E4E0] text-[#525D68]">
                  <th className="py-2.5 px-3 font-medium">Indicator</th>
                  <th className="py-2.5 px-3 font-medium text-right">Baseline</th>
                  <th className="py-2.5 px-3 font-medium text-right">Target</th>
                  <th className="py-2.5 px-3 font-medium text-right">Approved Result</th>
                  <th className="py-2.5 px-3 font-medium">Approval & Verification</th>
                  <th className="py-2.5 px-3 font-medium">Source Citation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E4E0]">
                {calculatedRows.map((row) => {
                  const obs = row.latestApprovedObs;
                  return (
                    <tr key={row.indicator.id} className="align-top">
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => openInspector({ type: 'indicator', id: row.indicator.id })}
                          className="font-semibold text-[#14191F] hover:text-[#1B4D3E] hover:underline text-left"
                        >
                          {row.indicator.code} — {row.indicator.title}
                        </button>
                        <div className="text-[11px] text-[#525D68] mt-0.5">
                          {row.indicator.sector} · {row.indicator.reportingLevel} · {row.indicator.calculationMethod.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525D68]">
                        {row.indicator.baseline !== null ? `${row.indicator.baseline} ${row.indicator.unit}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525D68]">
                        {row.indicator.target !== null ? `${row.indicator.target} ${row.indicator.unit}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {row.approvedValue !== null ? (
                          <div>
                            <span className="font-bold text-[#14191F]">
                              {row.approvedValue} {row.indicator.unit}
                            </span>
                            {row.progressPct !== null && (
                              <div className="text-[11px] text-[#1B4D3E]">{row.progressPct}% of target</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#B45309] font-medium">Missing / Pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 space-y-0.5">
                        {obs ? (
                          <>
                            <div>
                              <ApprovalText status={obs.approvalStatus} />
                            </div>
                            <div>
                              <VerificationText status={obs.verificationStatus} />
                            </div>
                            <div className="text-[11px]">
                              <ProvenanceText provenance={obs.provenance} />
                            </div>
                          </>
                        ) : (
                          <span className="text-[#525D68]">No approved period record</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#525D68]">
                        {obs ? (
                          <div className="space-y-0.5">
                            <div className="text-[#14191F] font-medium">{obs.sourceCitation.documentName}</div>
                            <div className="font-mono text-[11px]">
                              {obs.sourceCitation.sectionOrTab} · {obs.sourceCitation.pageOrRow}
                            </div>
                            {!obs.sourceCitation.originalAvailable && (
                              <div className="text-[11px] text-[#B91C1C] font-medium">Original source unavailable</div>
                            )}
                          </div>
                        ) : (
                          <span>Awaiting approved evidence</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Editable Narrative Sections */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#14191F] font-[var(--font-display)]">
              2. Structured Report Narrative
            </h3>
            {reportLearningEntries.length > 0 && !roleMeta.isReadOnly && (
              <span className="text-xs text-[#525D68] no-print">
                {reportLearningEntries.length} qualitative learning item(s) ready to insert below
              </span>
            )}
          </div>

          {activeTemplate?.defaultSections.map((sec) => {
            const body = getSectionBody(sec.id, sec.body);
            return (
              <div key={sec.id} className="space-y-2 border-t border-[#E2E4E0] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#14191F]">{sec.title}</h4>
                  {!roleMeta.isReadOnly && reportLearningEntries.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 no-print">
                      {reportLearningEntries.slice(0, 2).map((lrn) => (
                        <button
                          key={lrn.id}
                          type="button"
                          onClick={() =>
                            handleInsertLearning(
                              sec.id,
                              body,
                              lrn.title,
                              lrn.summary,
                              `${lrn.sourceCitation.documentName} · ${lrn.sourceCitation.pageOrRow}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-[#E2E4E0] rounded text-[#1B4D3E] hover:bg-[#F7F7F5]"
                        >
                          <Plus className="w-3 h-3" />
                          Insert "{lrn.title.slice(0, 28)}..."
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {roleMeta.isReadOnly ? (
                  <p className="text-xs text-[#14191F] whitespace-pre-line leading-relaxed">{body}</p>
                ) : (
                  <>
                    <textarea
                      rows={4}
                      value={body}
                      onChange={(e) => updateReportNarrative(activeTemplate.id, sec.id, e.target.value)}
                      className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md p-3 text-xs text-[#14191F] leading-relaxed focus:outline-none focus:border-[#1B4D3E] no-print"
                    />
                    <p className="hidden print:block text-xs text-[#14191F] whitespace-pre-line leading-relaxed">
                      {body}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </section>

        {/* Automatic Source Reference & Evidence Gap Appendix */}
        <section className="space-y-3 border-t border-[#E2E4E0] pt-5">
          <h3 className="text-base font-bold text-[#14191F] font-[var(--font-display)]">
            3. Source Reference & Evidence Availability Appendix
          </h3>
          <div className="divide-y divide-[#E2E4E0] border border-[#E2E4E0] rounded-md text-xs">
            {projectDocs.map((d) => (
              <div key={d.id} className="p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#14191F]">
                    {d.title} <span className="font-mono font-normal text-[#525D68]">({d.fileName} · {d.version})</span>
                  </div>
                  <div className="text-[#525D68]">Establishes: {d.supports}</div>
                  {!d.originalAvailable && (
                    <div className="text-[#B91C1C] font-medium">
                      Missing Source Gap: {d.availabilityNote || d.cannotEstablish}
                    </div>
                  )}
                </div>
                <div className="shrink-0 font-mono text-[11px] sm:text-right">
                  <ProvenanceText provenance={d.provenance} />
                  <div className={d.originalAvailable ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                    {d.originalAvailable ? 'Original supplied' : 'Not supplied'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
};
