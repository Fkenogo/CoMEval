import React from 'react';
import { ArrowRight, Compass, FileWarning, ShieldCheck } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeIndicatorState, scanRecurringChecks } from '../../lib/mealEngine';
import { ProjectId } from '../../types/meal';
import { MetaLine } from '../shared/StatusText';

export const PortfolioView: React.FC = () => {
  const { state, roleMeta, setActiveProject, setActiveModule, setWalkthroughOpen } = useMeal();
  const projectList = Object.values(state.projects);

  const openProject = (pid: ProjectId, module: 'overview' | 'role_home' | 'checks' | 'evaluation' | 'reports' = 'overview') => {
    setActiveProject(pid);
    setActiveModule(module);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={['Multi-Programme Oversight', `${projectList.length} Active Programmes`, `Viewing as ${roleMeta.label}`]} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            Portfolio Overview
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-2xl">
            Compare reporting readiness, evidence gaps, open checks, and evaluation timelines across both Uganda programmes without pooling incomparable indicator definitions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModule('role_home')}
            className="px-3.5 py-2 text-xs font-medium text-[#14191F] bg-white border border-[#E2E4E0] rounded-md hover:bg-[#F0F1EE] whitespace-nowrap"
          >
            Open {roleMeta.shortLabel} Work Queue
          </button>
          <button
            type="button"
            onClick={() => setWalkthroughOpen(true, 'childfund')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1B4D3E] rounded-md hover:bg-[#143B2F] whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5" />
            Launch Guided Walkthroughs
          </button>
        </div>
      </div>

      {/* Side-by-Side Programme Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {projectList.map((proj) => {
          const inds = state.indicators.filter((i) => i.projectId === proj.id);
          const obs = state.observations.filter((o) => o.projectId === proj.id);
          const acts = state.activities.filter((a) => a.projectId === proj.id);
          const checks = scanRecurringChecks(state, proj.id);
          const openActions = state.correctiveActions.filter((a) => a.projectId === proj.id && a.status !== 'closed');
          const missingDocs = state.documents.filter((d) => d.projectId === proj.id && !d.originalAvailable);
          const pendingCommitments = state.commitments.filter((c) => c.projectId === proj.id && c.status === 'candidate');
          const snapshots = state.handoverSnapshots.filter((s) => s.projectId === proj.id);
          const approvedCount = obs.filter((o) => o.approvalStatus === 'approved').length;
          const verifiedCount = obs.filter((o) => o.verificationStatus === 'verified').length;
          const openCycle = proj.reportingCycles.find((c) => c.status === 'open') || proj.reportingCycles[proj.reportingCycles.length - 1];

          const headlineInds = inds.slice(0, 3).map((ind) => computeIndicatorState(state, ind));

          return (
            <section key={proj.id} className="bg-white border border-[#E2E4E0] rounded-lg flex flex-col justify-between">
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <MetaLine items={[<span key="c" className="font-mono">{proj.code}</span>, proj.timeframe, proj.region]} />
                    <h2 className="mt-1 text-lg font-semibold text-[#14191F]">{proj.name}</h2>
                    <p className="mt-1 text-xs text-[#525D68] leading-relaxed">{proj.specificObjective}</p>
                  </div>
                </div>

                {/* Operational Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E2E4E0]">
                  <div>
                    <div className="text-[11px] text-[#525D68]">Reporting Cycle</div>
                    <div className="mt-0.5 text-sm font-semibold text-[#14191F]">{openCycle.label}</div>
                    <div className="text-[11px] font-mono text-[#525D68]">Due {openCycle.dueDate}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#525D68]">Approved / Verified</div>
                    <div className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-[#14191F]">
                      {approvedCount} / {obs.length} <span className="text-[#525D68] font-normal">({verifiedCount} ver.)</span>
                    </div>
                    <div className="text-[11px] text-[#525D68]">Observations</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#525D68]">Checks & Actions</div>
                    <div className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-[#B45309]">
                      {checks.length} checks · {openActions.length} open
                    </div>
                    <div className="text-[11px] text-[#525D68]">{pendingCommitments.length} pending commit.</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#525D68]">Evaluation / Handover</div>
                    <div className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-[#14191F]">
                      {snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'}
                    </div>
                    <div className="text-[11px] font-mono text-[#525D68]">{proj.upcomingEvaluationDate}</div>
                  </div>
                </div>

                {/* Project-Scoped Headline Indicators */}
                <div className="space-y-2 pt-4 border-t border-[#E2E4E0]">
                  <div className="text-xs font-medium text-[#525D68]">Project-Scoped Key Figures (Not Pooled)</div>
                  <div className="divide-y divide-[#E2E4E0]">
                    {headlineInds.map((calc) => (
                      <div key={calc.indicator.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <span className="font-mono text-[#1B4D3E] mr-1.5">{calc.indicator.code}</span>
                          <span className="text-[#14191F]">{calc.indicator.title}</span>
                        </div>
                        <div className="font-mono tabular-nums text-right shrink-0">
                          <span className="font-semibold text-[#14191F]">
                            {calc.approvedValue !== null ? `${calc.approvedValue} ${calc.indicator.unit}` : 'Missing'}
                          </span>
                          {calc.indicator.target !== null && (
                            <span className="text-[#525D68]"> / {calc.indicator.target}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Evidence Gaps & Upcoming Actions */}
                <div className="space-y-1.5 pt-4 border-t border-[#E2E4E0] text-xs">
                  <div className="font-medium text-[#525D68] flex items-center gap-1.5">
                    <FileWarning className="w-3.5 h-3.5 text-[#B45309]" />
                    Priority Evidence Gaps & Attention Items
                  </div>
                  <ul className="space-y-1 text-[#525D68]">
                    {missingDocs.map((d) => (
                      <li key={d.id} className="text-[#B91C1C]">
                        Source missing: {d.title}
                      </li>
                    ))}
                    {acts
                      .filter((a) => a.status === 'overdue' || a.status === 'delayed')
                      .slice(0, 2)
                      .map((a) => (
                        <li key={a.id}>
                          Workplan {a.status}: <span className="font-mono text-[#14191F]">{a.code}</span> — {a.actualDelivered}/{a.plannedOutput} {a.outputUnit}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-[#F7F7F5] border-t border-[#E2E4E0] rounded-b-lg flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => openProject(proj.id, 'checks')}
                    className="text-[#525D68] hover:text-[#14191F] hover:underline"
                  >
                    Checks ({checks.length})
                  </button>
                  <span className="text-[#C5C9C2]">·</span>
                  <button
                    type="button"
                    onClick={() => openProject(proj.id, 'evaluation')}
                    className="text-[#525D68] hover:text-[#14191F] hover:underline"
                  >
                    Evaluation
                  </button>
                  <span className="text-[#C5C9C2]">·</span>
                  <button
                    type="button"
                    onClick={() => openProject(proj.id, 'reports')}
                    className="text-[#525D68] hover:text-[#14191F] hover:underline"
                  >
                    Reports
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openProject(proj.id, 'overview')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1B4D3E] text-white text-xs font-medium rounded-md hover:bg-[#143B2F] whitespace-nowrap"
                >
                  Open {proj.shortName}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {/* Cross-Project Oversight & Comparability Guardrail */}
      <section className="bg-white border border-[#E2E4E0] rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#14191F]">
              Cross-Project Comparability & Portfolio Governance
            </h2>
            <p className="text-xs text-[#525D68] mt-0.5">
              Miledge combines portfolio indicators only when unit, definition, population, reporting period, and aggregation method match. Non-comparable programme metrics stay explicitly separated.
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-[#1B4D3E] shrink-0" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                <th className="py-2.5 pr-4 font-medium">Dimension</th>
                <th className="py-2.5 pr-4 font-medium">ChildFund Uganda (BMZ P5320)</th>
                <th className="py-2.5 pr-4 font-medium">Omugo Settlement (WVU)</th>
                <th className="py-2.5 font-medium">Portfolio Pooling Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E4E0]">
              <tr>
                <td className="py-3 pr-4 font-medium text-[#14191F]">Operational Governance Metrics</td>
                <td className="py-3 pr-4 font-mono tabular-nums">
                  {state.correctiveActions.filter((a) => a.projectId === 'childfund-uganda' && a.status !== 'closed').length} open actions · {state.documents.filter((d) => d.projectId === 'childfund-uganda' && !d.originalAvailable).length} missing source
                </td>
                <td className="py-3 pr-4 font-mono tabular-nums">
                  {state.correctiveActions.filter((a) => a.projectId === 'omugo-wvu' && a.status !== 'closed').length} open actions · {state.documents.filter((d) => d.projectId === 'omugo-wvu' && !d.originalAvailable).length} missing source
                </td>
                <td className="py-3 text-[#15803D] font-medium">
                  Comparable — Combined portfolio total: {state.correctiveActions.filter((a) => a.status !== 'closed').length} open corrective actions
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-[#14191F]">Farmer Groups Trained</td>
                <td className="py-3 pr-4 font-mono tabular-nums">36 groups (800 DEV households · 2021–2023)</td>
                <td className="py-3 pr-4 font-mono tabular-nums">25 Farmer Field Schools (20/group · 2017–2018)</td>
                <td className="py-3 text-[#B45309] font-medium">
                  Not pooled — Incompatible reporting periods (2018 vs. 2023) & population definitions (emergency refugee/host vs. multi-year rural Teso/Lango)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-[#14191F]">Primary Sector Focus</td>
                <td className="py-3 pr-4">Climate-Smart Agriculture, Youth Skilling, DRM</td>
                <td className="py-3 pr-4">WASH at CFS, Child Protection, Emergency Livelihoods</td>
                <td className="py-3 text-[#525D68]">
                  Kept scoped to each project’s logframe & donor rules
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
