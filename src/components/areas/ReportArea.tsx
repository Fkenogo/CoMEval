import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Lock,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';
import { buildReportPayload, downloadCsv } from '../../lib/engine';
import { IssuedReport } from '../../types/miledge';

const ALL_SECTIONS = [
  { id: 'activities', label: 'Activity planned vs. delivered' },
  { id: 'indicators', label: 'Indicator results tracker' },
  { id: 'sites', label: 'Site breakdown' },
  { id: 'gaps', label: 'Evidence gaps & data quality' },
  { id: 'narrative', label: 'Narrative & learning summary' },
  { id: 'sources', label: 'Source references & record revisions' },
] as const;

const TEMPLATES = [
  'Standard Donor Report',
  'Programme Progress Brief',
  'Evaluation Handover Summary',
] as const;

export const ReportArea: React.FC = () => {
  const { state, activeProject, activeApprovedPlan, roleDef, issueReport, setActiveArea } = useMiledge();

  const plan = activeApprovedPlan?.plan || activeProject.draftPlan;

  const [periodId, setPeriodId] = useState<string>(plan.reportingRules.defaultPeriodId || 'all');
  const [templateName, setTemplateName] = useState<string>(plan.reportingRules.defaultTemplate);
  const [includedSections, setIncludedSections] = useState<string[]>(ALL_SECTIONS.map((s) => s.id));
  const [breakdownDimension, setBreakdownDimension] = useState<string>('Site');
  const [customNarrative, setCustomNarrative] = useState<string | undefined>(undefined);
  const [selectedIssuedId, setSelectedIssuedId] = useState<string | null>(null);

  useEffect(() => {
    setPeriodId(plan.reportingRules.defaultPeriodId || 'all');
    setTemplateName(plan.reportingRules.defaultTemplate);
    setCustomNarrative(undefined);
    setSelectedIssuedId(null);
  }, [activeProject.id, plan.reportingRules.defaultPeriodId, plan.reportingRules.defaultTemplate]);

  const projectIssuedReports = useMemo(
    () => state.issuedReports.filter((r) => r.projectId === activeProject.id),
    [state.issuedReports, activeProject.id]
  );

  // Live preview compiled strictly from highest approved revisions per recordGroupId
  const livePayload = useMemo(() => {
    if (!activeApprovedPlan) return null;
    return buildReportPayload({
      project: activeProject,
      planVersion: activeApprovedPlan,
      periodId,
      templateName,
      includedSections,
      breakdownDimension,
      allActivityRecords: state.activityRecords,
      allMeasurementRecords: state.measurementRecords,
      learningItems: state.learningItems,
      issuedBy: roleDef.actorName,
    });
  }, [
    activeProject,
    activeApprovedPlan,
    periodId,
    templateName,
    includedSections,
    breakdownDimension,
    state.activityRecords,
    state.measurementRecords,
    state.learningItems,
    roleDef.actorName,
  ]);

  const activeIssuedReport: IssuedReport | null = selectedIssuedId
    ? projectIssuedReports.find((r) => r.id === selectedIssuedId) || null
    : null;

  const viewingFrozen = Boolean(activeIssuedReport);
  const displayReport = activeIssuedReport || livePayload;

  // Detect pending/unapproved records or correction revisions for transparency
  const pendingSummary = useMemo(() => {
    const acts = state.activityRecords.filter((r) => r.projectId === activeProject.id && r.status !== 'approved');
    const meas = state.measurementRecords.filter((r) => r.projectId === activeProject.id && r.status !== 'approved');
    const correctionRevs = [...acts, ...meas].filter((r) => r.revision > 1);
    return {
      totalPending: acts.length + meas.length,
      correctionRevs: correctionRevs.length,
    };
  }, [state.activityRecords, state.measurementRecords, activeProject.id]);

  const toggleSection = (id: string) => {
    setIncludedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleIssueReport = () => {
    if (!livePayload) return;
    const issued = issueReport({
      periodId,
      templateName,
      includedSections,
      breakdownDimension,
      customNarrative,
    });
    if (issued) {
      setSelectedIssuedId(issued.id);
    }
  };

  const handleExportCsv = () => {
    if (!displayReport) return;
    const headers = [
      'Section',
      'Code',
      'Name',
      'Level/Unit',
      'Baseline',
      'Period Target',
      'Final Target',
      'Actual / Delivered',
      'Achievement %',
      'Numerator',
      'Denominator',
      'Status / Calculation Note',
      'Plan Version',
      'Sources',
    ];
    const rows: (string | number | null | undefined)[][] = [
      ...displayReport.activityRows.map((a) => [
        'Activity',
        a.code,
        a.name,
        a.unit,
        '',
        a.planned,
        a.planned,
        a.delivered,
        a.planned > 0 ? Math.round((a.delivered / a.planned) * 100) : '',
        '',
        '',
        `${a.recordCount} approved record(s)`,
        displayReport.planVersionLabel,
        '',
      ]),
      ...displayReport.indicatorRows.map((ind) => [
        'Indicator',
        ind.code,
        ind.name,
        `${ind.frameworkLevel} (${ind.unit})`,
        ind.baselineDisplay,
        ind.periodTargetDisplay,
        ind.finalTargetDisplay,
        ind.actualDisplay,
        ind.achievementPct ?? '',
        ind.numeratorSum ?? '',
        ind.denominatorSum ?? '',
        ind.statusNote,
        displayReport.planVersionLabel,
        ind.sourceRefs.join('; '),
      ]),
    ];
    const slug = `${activeProject.code.toLowerCase()}_${displayReport.periodId}_${viewingFrozen ? 'issued' : 'live'}.csv`;
    downloadCsv(slug, headers, rows);
  };

  if (!activeApprovedPlan && !activeIssuedReport) {
    return (
      <div className="bg-white border border-[#E2E6E2] rounded-xl p-8 text-center space-y-3">
        <h1 className="text-lg font-bold text-[#14191F]">Approve a Plan version to generate reports</h1>
        <p className="text-xs text-[#525D68] max-w-md mx-auto">
          Reports compile approved records against an approved Plan version so figures and labels stay auditable.
        </p>
        <button
          type="button"
          onClick={() => setActiveArea('plan')}
          className="min-h-[42px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold"
        >
          Open Plan &amp; approve v1.0
        </button>
      </div>
    );
  }

  const effectiveSections = viewingFrozen && activeIssuedReport
    ? activeIssuedReport.includedSections
    : includedSections;

  return (
    <div className="space-y-4">
      {/* Top Action Bar (hidden in print) */}
      <div className="bg-white border border-[#E2E6E2] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-[#14191F] tracking-tight">
            Report · Approved Results &amp; Frozen Report History
          </h1>
          <p className="text-xs text-[#525D68] mt-1">
            Generate a report in one click from approved records, freeze immutable issued reports, or reopen past reports with their exact original figures and Plan version.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewingFrozen && (
            <button
              type="button"
              onClick={() => setSelectedIssuedId(null)}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#14532D] bg-[#EBF7EE] text-[#14532D] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Return to Live Report
            </button>
          )}
          {!viewingFrozen && roleDef.canGenerateReport && (
            <button
              type="button"
              onClick={handleIssueReport}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22] inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Issue &amp; Freeze Report
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#C5C9C2] bg-white text-[#14191F] text-xs font-semibold hover:bg-[#F6F7F5] inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#14532D]" />
            Print-ready
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#C5C9C2] bg-white text-[#14191F] text-xs font-semibold hover:bg-[#F6F7F5] inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#14532D]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Split: Left Configuration + History Rail (no-print) | Right Printable Report Document */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Controls & Issued History */}
        <div className="xl:col-span-4 space-y-4 no-print">
          {/* Report Generator Controls */}
          <div className="bg-white border border-[#E2E6E2] rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#525D68]">
                Live Report Settings
              </h2>
              {viewingFrozen && (
                <button
                  type="button"
                  onClick={() => setSelectedIssuedId(null)}
                  className="text-[11px] font-semibold text-[#14532D] hover:underline"
                >
                  Switch to Live
                </button>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-[#14191F] mb-1">Reporting period</label>
                <select
                  value={periodId}
                  onChange={(e) => {
                    setSelectedIssuedId(null);
                    setPeriodId(e.target.value);
                  }}
                  className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                >
                  <option value="all">All reporting periods (Cumulative)</option>
                  {plan.reportingRules.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.startDate} to {p.endDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#14191F] mb-1">Report template</label>
                <select
                  value={templateName}
                  onChange={(e) => {
                    setSelectedIssuedId(null);
                    setTemplateName(e.target.value);
                  }}
                  className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#14191F] mb-1">Breakdown dimension</label>
                <select
                  value={breakdownDimension}
                  onChange={(e) => {
                    setSelectedIssuedId(null);
                    setBreakdownDimension(e.target.value);
                  }}
                  className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                >
                  <option value="Site">By Site</option>
                  <option value="Overall">Project-wide summary only</option>
                </select>
              </div>

              <div className="pt-1">
                <span className="block font-medium text-[#14191F] mb-1.5">Included sections</span>
                <div className="space-y-1.5">
                  {ALL_SECTIONS.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer text-[#14191F]">
                      <input
                        type="checkbox"
                        checked={includedSections.includes(s.id)}
                        onChange={() => {
                          setSelectedIssuedId(null);
                          toggleSection(s.id);
                        }}
                        className="rounded border-[#C5C9C2] accent-[#14532D]"
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Issued Report History (Clarification 4) */}
          <div className="bg-white border border-[#E2E6E2] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E6E2] flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#525D68] flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                Issued Report History ({projectIssuedReports.length})
              </span>
            </div>

            <div className="p-2.5 border-b border-[#E2E6E2] bg-[#F6F7F5]">
              <button
                type="button"
                onClick={() => setSelectedIssuedId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  !viewingFrozen
                    ? 'bg-[#14532D] text-white font-semibold'
                    : 'bg-white border border-[#E2E6E2] text-[#14191F] hover:bg-[#EBF7EE]'
                }`}
              >
                Live Report Preview (Latest Approved Revisions)
              </button>
            </div>

            {projectIssuedReports.length === 0 ? (
              <div className="p-4 text-xs text-[#525D68]">
                No frozen reports issued yet for {activeProject.shortName}. Click &ldquo;Issue &amp; Freeze Report&rdquo; to lock a snapshot.
              </div>
            ) : (
              <ul className="divide-y divide-[#E2E6E2]">
                {projectIssuedReports.map((rep) => {
                  const isActive = selectedIssuedId === rep.id;
                  return (
                    <li key={rep.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedIssuedId(rep.id)}
                        className={`w-full text-left px-4 py-3 text-xs space-y-1 transition-colors ${
                          isActive ? 'bg-[#EBF7EE]' : 'hover:bg-[#F6F7F5]'
                        }`}
                      >
                        <div className="font-semibold text-[#14191F] flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-[#14532D] shrink-0" />
                          <span className="truncate">{rep.title}</span>
                        </div>
                        <div className="text-[11px] text-[#525D68] font-mono">
                          Issued {rep.issuedAt} · Plan {rep.planVersionLabel}
                        </div>
                        <div className="text-[11px] text-[#525D68]">
                          By {rep.issuedBy} · {rep.recordRevisionsUsed.length} frozen record revision(s)
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right Report Document */}
        <div className="xl:col-span-8 space-y-3">
          {/* Status Banner: Frozen Issued Report vs Live Approved Report */}
          {viewingFrozen && activeIssuedReport ? (
            <div className="rounded-xl border border-[#C5E5CD] bg-[#EBF7EE] px-4 py-3 text-xs text-[#14532D] flex items-start gap-2.5">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Frozen Issued Report Snapshot:</strong> Issued on{' '}
                <span className="font-mono">{activeIssuedReport.issuedAt}</span> by{' '}
                {activeIssuedReport.issuedBy} against{' '}
                <strong className="font-mono">Plan {activeIssuedReport.planVersionLabel}</strong>. Original figures, labels, source references, and record revisions are permanently preserved regardless of later corrections or plan updates.
              </div>
            </div>
          ) : (
            pendingSummary.totalPending > 0 && (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E] flex items-start gap-2.5 no-print">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
                <div>
                  <strong>Approved Records Only:</strong> {pendingSummary.totalPending} pending record(s)
                  {pendingSummary.correctionRevs > 0
                    ? ` (including ${pendingSummary.correctionRevs} unapproved correction revision(s))`
                    : ''}{' '}
                  are excluded from live reporting. Last approved figures remain active until pending items are verified and approved in <strong>Prove</strong>.
                </div>
              </div>
            )
          )}

          {displayReport && (
            <article className="bg-white border border-[#E2E6E2] rounded-xl overflow-hidden">
              {/* Printable Report Header */}
              <div className="px-6 py-5 bg-[#14532D] text-white">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-white/80">
                  <span>{displayReport.templateName}</span>
                  <span className="font-mono">
                    Plan {displayReport.planVersionLabel} ·{' '}
                    {viewingFrozen && activeIssuedReport ? `Issued ${activeIssuedReport.issuedAt}` : 'Live Approved Preview'}
                  </span>
                </div>
                <h2 className="text-xl font-bold mt-1">{displayReport.projectNameSnapshot}</h2>
                <div className="text-xs text-white/90 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Period: {displayReport.periodLabel}</span>
                  <span>Compiled by: {displayReport.issuedBy}</span>
                  <span>Donor: {plan.donor}</span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* 1. Activity Planned vs Delivered */}
                {effectiveSections.includes('activities') && (
                  <section className="space-y-2.5">
                    <h3 className="text-sm font-bold text-[#14191F] border-b border-[#E2E6E2] pb-1.5">
                      1. Activity Progress (Planned vs. Delivered — Approved Only)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#E2E6E2] text-[#525D68]">
                            <th className="py-2 pr-3 font-semibold">Code</th>
                            <th className="py-2 pr-3 font-semibold">Activity</th>
                            <th className="py-2 px-3 font-semibold text-right">Planned</th>
                            <th className="py-2 px-3 font-semibold text-right">Delivered</th>
                            <th className="py-2 px-3 font-semibold text-right">Progress</th>
                            <th className="py-2 pl-3 font-semibold text-right">Records</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E6E2]">
                          {displayReport.activityRows.map((row) => {
                            const pct = row.planned > 0 ? Math.round((row.delivered / row.planned) * 100) : null;
                            return (
                              <tr key={row.activityId}>
                                <td className="py-2.5 pr-3 font-mono text-[#525D68]">{row.code}</td>
                                <td className="py-2.5 pr-3 font-medium text-[#14191F]">{row.name}</td>
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                  {row.planned} {row.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#14532D]">
                                  {row.delivered} {row.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                  {pct !== null ? `${pct}%` : '—'}
                                </td>
                                <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-[#525D68]">
                                  {row.recordCount}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* 2. Indicator Results Tracker */}
                {effectiveSections.includes('indicators') && (
                  <section className="space-y-2.5">
                    <h3 className="text-sm font-bold text-[#14191F] border-b border-[#E2E6E2] pb-1.5">
                      2. Indicator Results Tracker (Baseline vs. Target vs. Approved Actual)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#E2E6E2] text-[#525D68]">
                            <th className="py-2 pr-3 font-semibold">Indicator</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Baseline</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Target</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Approved Actual</th>
                            <th className="py-2 pl-2.5 font-semibold">Calculation &amp; Comparability</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E6E2]">
                          {displayReport.indicatorRows.map((ind) => (
                            <tr key={ind.indicatorId} className="align-top">
                              <td className="py-2.5 pr-3">
                                <div className="font-semibold text-[#14191F]">
                                  <span className="font-mono text-[#14532D] mr-1.5">{ind.code}</span>
                                  {ind.name}
                                </div>
                                <div className="text-[11px] text-[#525D68]">
                                  {ind.frameworkLevel} · Rule: {ind.aggregationRule.replace('_', ' ')}
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-[#525D68] whitespace-nowrap">
                                {ind.baselineDisplay}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-[#525D68] whitespace-nowrap">
                                {ind.finalTargetDisplay}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                                <span
                                  className={
                                    ind.isIncomparable
                                      ? 'text-[#B45309]'
                                      : ind.isMissing
                                      ? 'text-[#525D68]'
                                      : 'text-[#14532D]'
                                  }
                                >
                                  {ind.actualDisplay}
                                </span>
                                {ind.achievementPct !== null && (
                                  <div className="text-[11px] font-normal text-[#525D68]">
                                    {ind.achievementPct}% of target
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 pl-2.5 text-[11px] text-[#525D68] max-w-[260px]">
                                <div>{ind.statusNote}</div>
                                {ind.numeratorSum !== undefined && ind.denominatorSum !== undefined && (
                                  <div className="font-mono text-[#14532D] mt-0.5">
                                    n = {ind.numeratorSum} ÷ d = {ind.denominatorSum}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* 3. Site Breakdown */}
                {effectiveSections.includes('sites') && displayReport.breakdownDimension === 'Site' && (
                  <section className="space-y-2.5">
                    <h3 className="text-sm font-bold text-[#14191F] border-b border-[#E2E6E2] pb-1.5">
                      3. Site Coverage Breakdown
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                      {displayReport.siteBreakdownRows.map((s) => (
                        <div key={s.siteName} className="border border-[#E2E6E2] rounded-lg p-3 bg-[#F6F7F5]/60">
                          <div className="font-semibold text-[#14191F]">{s.siteName}</div>
                          <div className="mt-1 font-mono text-[11px] text-[#525D68] tabular-nums">
                            {s.activityRecords} approved activity · {s.measurementRecords} approved measurement
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 4. Evidence Gaps & Data Quality */}
                {effectiveSections.includes('gaps') && (
                  <section className="space-y-2.5">
                    <h3 className="text-sm font-bold text-[#14191F] border-b border-[#E2E6E2] pb-1.5">
                      4. Evidence Gaps &amp; Data Quality Notes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-[#E2E6E2] p-3.5 space-y-1.5">
                        <div className="font-semibold text-[#92400E]">Evidence Gaps &amp; Missing / Incomparable Data</div>
                        {displayReport.evidenceGaps.length === 0 ? (
                          <div className="text-[#15803D] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            No evidence or comparability gaps flagged.
                          </div>
                        ) : (
                          <ul className="space-y-1 text-[#525D68]">
                            {displayReport.evidenceGaps.map((g, i) => (
                              <li key={i}>• {g}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded-lg border border-[#E2E6E2] p-3.5 space-y-1.5">
                        <div className="font-semibold text-[#14191F]">Data Quality &amp; Governance Notes</div>
                        <ul className="space-y-1 text-[#525D68]">
                          {displayReport.dataQualityNotes.map((n, i) => (
                            <li key={i}>• {n}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                )}

                {/* 5. Narrative & Learning */}
                {effectiveSections.includes('narrative') && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-[#14191F] border-b border-[#E2E6E2] pb-1.5">
                      5. Narrative &amp; Learning Summary
                    </h3>
                    {!viewingFrozen && roleDef.canGenerateReport ? (
                      <textarea
                        rows={4}
                        value={customNarrative !== undefined ? customNarrative : displayReport.narrative}
                        onChange={(e) => setCustomNarrative(e.target.value)}
                        className="w-full rounded-lg border border-[#C5C9C2] p-3 text-xs text-[#14191F] leading-relaxed"
                      />
                    ) : (
                      <div className="whitespace-pre-line text-xs text-[#14191F] leading-relaxed bg-[#F6F7F5]/60 border border-[#E2E6E2] rounded-lg p-3.5">
                        {displayReport.narrative}
                      </div>
                    )}
                  </section>
                )}

                {/* 6. Source References & Exact Record Revisions Used */}
                {effectiveSections.includes('sources') && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-bold text-[#14191F] border-b border-[#E2E6E2] pb-1.5">
                      6. Source References &amp; Exact Record Revisions Used
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-semibold text-[#525D68] flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Source References ({displayReport.sourceReferences.length})
                        </div>
                        <ul className="space-y-1 text-[11px] text-[#525D68]">
                          {displayReport.sourceReferences.map((ref, idx) => (
                            <li key={idx}>• {ref}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-[#525D68]">
                          Approved Record Revisions Included ({displayReport.recordRevisionsUsed.length})
                        </div>
                        <ul className="space-y-1 text-[11px] font-mono text-[#525D68]">
                          {displayReport.recordRevisionsUsed.map((rec) => (
                            <li key={rec.recordId}>
                              • [{rec.recordType === 'activity' ? 'DO' : 'MS'}] {rec.label} — Rev {rec.revision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
};
