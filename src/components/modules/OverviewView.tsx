import React from 'react';
import { ArrowUpRight, Calendar, FileWarning } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeIndicatorState, scanRecurringChecks } from '../../lib/mealEngine';
import { FilterBar } from '../shared/FilterBar';
import { ApprovalText, MetaLine, ProvenanceText, VerificationText } from '../shared/StatusText';

export const OverviewView: React.FC = () => {
  const { state, activeProject, openInspector, setActiveModule } = useMeal();
  const pid = state.activeProjectId;
  const { filters } = state;

  const projectIndicators = state.indicators.filter((i) => {
    if (i.projectId !== pid) return false;
    if (filters.sector !== 'all' && i.sector !== filters.sector) return false;
    if (filters.partner !== 'all' && i.responsiblePartner !== filters.partner) return false;
    return true;
  });

  const calculated = projectIndicators.map((ind) => computeIndicatorState(state, ind, filters));

  const projectActivities = state.activities.filter((a) => {
    if (a.projectId !== pid) return false;
    if (filters.sector !== 'all' && a.sector !== filters.sector) return false;
    if (filters.partner !== 'all' && a.ownerPartner !== filters.partner) return false;
    if (filters.location !== 'all' && a.location !== filters.location) return false;
    return true;
  });

  const checks = scanRecurringChecks(state, pid);
  const missingDocs = state.documents.filter((d) => d.projectId === pid && !d.originalAvailable);

  // Identify any indicator that genuinely has >= 2 comparable periods for trend display
  const trendCandidates = projectIndicators
    .map((ind) => {
      const obs = state.observations.filter(
        (o) => o.projectId === pid && o.indicatorId === ind.id && o.reportedValue !== null
      );
      return { ind, obs };
    })
    .filter((x) => x.obs.length >= 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <MetaLine items={[<span key="c" className="font-mono">{activeProject.code}</span>, activeProject.organisation, activeProject.timeframe, activeProject.region]} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            {activeProject.name}
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-3xl">{activeProject.goal}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveModule('documents')}
            className="px-3 py-1.5 bg-white border border-[#E2E4E0] rounded-md font-medium text-[#14191F] hover:bg-[#F0F1EE]"
          >
            Documents & Commitments
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('reports')}
            className="px-3 py-1.5 bg-[#1B4D3E] text-white rounded-md font-medium hover:bg-[#143B2F]"
          >
            Generate Report
          </button>
        </div>
      </div>

      <FilterBar />

      {/* Headline Metrics Grid — Every Figure Clickable for Source Drill-Down */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#14191F]">
            Headline Results & Baseline-to-Target Comparisons
          </h2>
          <span className="text-xs text-[#525D68]">Click any figure to inspect source, calculation & review trail</span>
        </div>

        {calculated.length === 0 ? (
          <div className="bg-white border border-[#E2E4E0] rounded-lg p-8 text-center text-xs text-[#525D68]">
            No indicators match the active filters. Adjust or clear the scope filters above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {calculated.map((calc) => {
              const { indicator, approvedValue, draftPreviewValue, hasDraftDifference, latestApprovedObs, latestAnyObs, progressPct } = calc;
              const displayObs = latestApprovedObs || latestAnyObs;
              const barPct = progressPct !== null ? Math.min(100, Math.max(0, progressPct)) : 0;

              return (
                <button
                  key={indicator.id}
                  type="button"
                  onClick={() => openInspector({ type: 'indicator', id: indicator.id })}
                  className="text-left bg-white border border-[#E2E4E0] rounded-lg p-4 hover:border-[#1B4D3E] transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <MetaLine
                        items={[
                          <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{indicator.code}</span>,
                          indicator.reportingLevel,
                          indicator.sector,
                        ]}
                      />
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#525D68] shrink-0" />
                    </div>
                    <div className="text-sm font-medium text-[#14191F] leading-snug">
                      {indicator.title}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-xl font-semibold font-mono tabular-nums text-[#14191F]">
                          {approvedValue !== null ? `${approvedValue.toLocaleString()} ${indicator.unit}` : 'Missing'}
                        </span>
                        {hasDraftDifference && (
                          <span className="ml-2 text-xs font-mono tabular-nums text-[#B45309]">
                            (Draft: {draftPreviewValue})
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#525D68]">
                        BL {indicator.baseline ?? '—'} → Tgt {indicator.target ?? '—'}
                      </span>
                    </div>

                    {/* Visual: Single observation comparison bar */}
                    <div className="h-1.5 w-full bg-[#F0F1EE] rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          calc.warningFlags.length > 0 ? 'bg-[#D97706]' : 'bg-[#1B4D3E]'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>

                    <MetaLine
                      className="text-[11px]"
                      items={[
                        <ProvenanceText key="p" provenance={displayObs?.provenance || indicator.provenance} />,
                        displayObs ? <ApprovalText key="a" status={displayObs.approvalStatus} /> : 'No entry',
                        displayObs ? <VerificationText key="v" status={displayObs.verificationStatus} /> : null,
                      ]}
                    />

                    {calc.warningFlags.length > 0 && (
                      <div className="text-[11px] text-[#B91C1C] truncate">
                        Flag: {calc.warningFlags[0]}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Comparable Multi-Period Trend Section (Only rendered when >= 2 comparable periods exist) */}
      {trendCandidates.length > 0 && (
        <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#14191F]">
              Multi-Period Comparable Trends
            </h2>
            <p className="text-xs text-[#525D68] mt-0.5">
              Plotted only for indicators with two or more comparable reporting periods; single-observation indicators remain above as baseline-vs-target comparisons.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trendCandidates.slice(0, 2).map(({ ind, obs }) => {
              const ordered = [...obs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
              const maxVal = Math.max(ind.target || 1, ...ordered.map((o) => o.reportedValue || 0));
              return (
                <div key={ind.id} className="border border-[#E2E4E0] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openInspector({ type: 'indicator', id: ind.id })}
                      className="text-xs font-semibold text-[#14191F] hover:text-[#1B4D3E] text-left"
                    >
                      <span className="font-mono text-[#1B4D3E] mr-1.5">{ind.code}</span>
                      {ind.title}
                    </button>
                    <span className="font-mono text-[11px] text-[#525D68] shrink-0">Target: {ind.target} {ind.unit}</span>
                  </div>
                  <div className="space-y-2">
                    {ordered.map((o) => {
                      const w = Math.min(100, Math.round(((o.reportedValue || 0) / maxVal) * 100));
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => openInspector({ type: 'observation', id: o.id })}
                          className="w-full text-left group"
                        >
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[#525D68] group-hover:text-[#14191F]">{o.period}</span>
                            <span className="font-mono tabular-nums font-medium text-[#14191F]">
                              {o.reportedValue} {o.unit}
                            </span>
                          </div>
                          <div className="h-2 bg-[#F0F1EE] rounded overflow-hidden">
                            <div className="h-full bg-[#1B4D3E]" style={{ width: `${w}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottom 2-Column Operational Split: Reporting Calendar + Evidence Gaps & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1B4D3E]" />
              <h2 className="text-sm font-semibold text-[#14191F]">Reporting Calendar & Project Scope</h2>
            </div>
            <span className="text-xs text-[#525D68]">{activeProject.partners.length} partners · {activeProject.locations.length} locations</span>
          </div>
          <div className="divide-y divide-[#E2E4E0] text-xs">
            {activeProject.reportingCycles.map((rc) => (
              <div key={rc.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#14191F]">{rc.label}</div>
                  <div className="font-mono text-[11px] text-[#525D68]">{rc.startDate} to {rc.endDate}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums text-[#14191F]">Due {rc.dueDate}</div>
                  <div className={rc.status === 'open' ? 'text-[#1B4D3E] font-medium' : 'text-[#525D68]'}>{rc.status}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E2E4E0] text-xs space-y-1">
            <div className="text-[#525D68]">Sectors: <span className="text-[#14191F]">{activeProject.sectors.join(' · ')}</span></div>
            <div className="text-[#525D68]">Partners: <span className="text-[#14191F]">{activeProject.partners.join(' · ')}</span></div>
            <div className="text-[#525D68]">Locations: <span className="text-[#14191F]">{activeProject.locations.map((l) => l.name).join(' · ')}</span></div>
          </div>
        </section>

        <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-[#B45309]" />
              <h2 className="text-sm font-semibold text-[#14191F]">Priority Evidence Gaps & Workplan Pulse</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('checks')}
              className="text-xs font-medium text-[#1B4D3E] hover:underline"
            >
              View {checks.length} checks →
            </button>
          </div>
          <div className="space-y-2.5 text-xs">
            {missingDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => openInspector({ type: 'document', id: doc.id })}
                className="w-full text-left border border-[#FECACA] bg-[#FEF2F2] rounded p-3"
              >
                <div className="font-semibold text-[#B91C1C]">Missing Source File: {doc.title}</div>
                <div className="text-[#7F1D1D] mt-0.5">{doc.availabilityNote}</div>
              </button>
            ))}
            {projectActivities.slice(0, 4).map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => openInspector({ type: 'activity', id: act.id })}
                className="w-full text-left border border-[#E2E4E0] rounded p-3 hover:border-[#1B4D3E] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <MetaLine items={[<span key="c" className="font-mono text-[#1B4D3E]">{act.code}</span>, act.ownerPartner, act.status]} />
                  <div className="font-medium text-[#14191F] truncate mt-0.5">{act.title}</div>
                </div>
                <span className="font-mono tabular-nums text-[#14191F] shrink-0">
                  {act.actualDelivered}/{act.plannedOutput}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
