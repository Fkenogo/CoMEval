import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, Search } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeIndicatorState } from '../../lib/mealEngine';
import { Indicator } from '../../types/meal';
import { FilterBar } from '../shared/FilterBar';
import { ApprovalText, MetaLine, ProvenanceText, VerificationText } from '../shared/StatusText';

export const ResultsFrameworkView: React.FC = () => {
  const { state, activeProject, roleMeta, openInspector, updateIndicator } = useMeal();
  const pid = state.activeProjectId;
  const { filters } = state;

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | Indicator['calculationMethod']>('all');
  const [cumulativeMode, setCumulativeMode] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [editingInd, setEditingInd] = useState<Indicator | null>(null);
  const [editDef, setEditDef] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editBaseline, setEditBaseline] = useState('');
  const [editPartner, setEditPartner] = useState('');

  const nodes = state.resultsNodes.filter((n) => n.projectId === pid);
  const indicators = state.indicators.filter((i) => {
    if (i.projectId !== pid) return false;
    if (filters.sector !== 'all' && i.sector !== filters.sector) return false;
    if (filters.partner !== 'all' && i.responsiblePartner !== filters.partner) return false;
    if (methodFilter !== 'all' && i.calculationMethod !== methodFilter) return false;
    if (
      search.trim() &&
      !`${i.code} ${i.title} ${i.definition} ${i.sector}`.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const toggleNode = (id: string) =>
    setExpandedNodes((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));

  const renderTree = (parentId: string | null, depth = 0): React.ReactNode => {
    const children = nodes.filter((n) => n.parentId === parentId);
    if (children.length === 0) return null;
    return children.map((node) => {
      const hasChildren = nodes.some((n) => n.parentId === node.id);
      const isOpen = expandedNodes[node.id] !== false;
      const nodeInds = state.indicators.filter((i) => i.frameworkNodeId === node.id);
      const nodeActs = state.activities.filter((a) => a.frameworkNodeId === node.id);

      return (
        <div key={node.id} style={{ paddingLeft: depth > 0 ? 18 : 0 }} className="space-y-1.5">
          <div className="border border-[#E2E4E0] rounded-md px-3.5 py-2.5 bg-white">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => hasChildren && toggleNode(node.id)}
                className="flex items-start gap-2 text-left"
              >
                {hasChildren ? (
                  isOpen ? (
                    <ChevronDown className="w-4 h-4 text-[#525D68] shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#525D68] shrink-0 mt-0.5" />
                  )
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <div>
                  <MetaLine
                    items={[
                      <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{node.code}</span>,
                      node.sector,
                      `${nodeInds.length} indicator${nodeInds.length === 1 ? '' : 's'}`,
                      `${nodeActs.length} workplan activit${nodeActs.length === 1 ? 'y' : 'ies'}`,
                    ]}
                  />
                  <div className="text-xs font-medium text-[#14191F] mt-0.5">{node.title}</div>
                </div>
              </button>
            </div>

            {nodeInds.length > 0 && (
              <div className="mt-2 pl-6 space-y-1 border-t border-[#E2E4E0] pt-2">
                {nodeInds.map((ind) => {
                  const calc = computeIndicatorState(state, ind, filters, cumulativeMode);
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => openInspector({ type: 'indicator', id: ind.id })}
                      className="w-full flex items-center justify-between gap-2 text-xs text-left hover:text-[#1B4D3E] py-0.5"
                    >
                      <span className="truncate">
                        <span className="font-mono text-[#525D68] mr-1.5">{ind.code}</span>
                        {ind.title}
                      </span>
                      <span className="font-mono tabular-nums shrink-0 text-[#14191F]">
                        {calc.approvedValue !== null ? `${calc.approvedValue} ${ind.unit}` : 'Missing'}
                        {calc.hasDraftDifference && (
                          <span className="text-[#B45309] ml-1.5">(Draft: {calc.draftPreviewValue})</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {isOpen && renderTree(node.id, depth + 1)}
        </div>
      );
    });
  };

  const openEditInd = (ind: Indicator) => {
    setEditingInd(ind);
    setEditDef(ind.definition);
    setEditTarget(ind.target !== null ? String(ind.target) : '');
    setEditBaseline(ind.baseline !== null ? String(ind.baseline) : '');
    setEditPartner(ind.responsiblePartner);
  };

  const saveEditInd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInd) return;
    updateIndicator(editingInd.id, {
      definition: editDef.trim(),
      target: editTarget === '' ? null : Number(editTarget),
      baseline: editBaseline === '' ? null : Number(editBaseline),
      responsiblePartner: editPartner,
    });
    setEditingInd(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={[activeProject.shortName, 'Goal → Outcome → Output → Activity & 3-Method Calculation Engine']} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            Results Framework & Indicator Register
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-3xl">
            Distinguishes activity/output delivery from outcome change, demonstrates direct entry, register aggregation, and formula calculations side by side, and enforces cumulative aggregation rules.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F0F1EE] rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setCumulativeMode(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              !cumulativeMode ? 'bg-white text-[#14191F] shadow-sm' : 'text-[#525D68]'
            }`}
          >
            Latest Period View
          </button>
          <button
            type="button"
            onClick={() => setCumulativeMode(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              cumulativeMode ? 'bg-white text-[#14191F] shadow-sm' : 'text-[#525D68]'
            }`}
          >
            Cumulative View
          </button>
        </div>
      </div>

      <FilterBar />

      {/* Hierarchy Tree */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#14191F]">Results Hierarchy</h2>
        <div className="space-y-2">{renderTree(null)}</div>
      </section>

      {/* Editable Indicator Detail Panel */}
      {editingInd && (
        <form onSubmit={saveEditInd} className="bg-white border-2 border-[#1B4D3E] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#14191F]">
              Edit Indicator Definition — {editingInd.code}
            </h2>
            <button type="button" onClick={() => setEditingInd(null)} className="text-[#525D68]">
              Cancel
            </button>
          </div>
          <label className="block space-y-1">
            <span className="font-medium text-[#525D68]">Definition & Measurement Protocol</span>
            <textarea
              rows={2}
              value={editDef}
              onChange={(e) => setEditDef(e.target.value)}
              className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Baseline ({editingInd.unit})</span>
              <input
                type="number"
                step="any"
                value={editBaseline}
                onChange={(e) => setEditBaseline(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-1.5 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Target ({editingInd.unit})</span>
              <input
                type="number"
                step="any"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-1.5 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Responsible Partner</span>
              <select
                value={editPartner}
                onChange={(e) => setEditPartner(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-1.5"
              >
                {activeProject.partners.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingInd(null)} className="px-3 py-1.5 text-[#525D68]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-[#1B4D3E] text-white font-medium rounded">
              Save Indicator
            </button>
          </div>
        </form>
      )}

      {/* Searchable Indicator Register */}
      <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#14191F]">
            Indicator Register ({indicators.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#525D68] absolute left-2.5 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search indicator code or title..."
                className="pl-8 pr-3 py-1.5 bg-[#F7F7F5] border border-[#E2E4E0] rounded-md text-xs w-56 focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F0F1EE] rounded-md text-xs">
              {(
                [
                  { id: 'all', label: 'All Methods' },
                  { id: 'direct', label: 'Direct Entry' },
                  { id: 'register_aggregate', label: 'Register Roll-up' },
                  { id: 'formula', label: 'Formula' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethodFilter(m.id)}
                  className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
                    methodFilter === m.id ? 'bg-white text-[#14191F] shadow-sm' : 'text-[#525D68]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                <th className="py-2.5 pr-4 font-medium">Code & Indicator</th>
                <th className="py-2.5 pr-4 font-medium">Method & Rule</th>
                <th className="py-2.5 pr-4 font-medium text-right">Baseline / Target</th>
                <th className="py-2.5 pr-4 font-medium text-right">Approved (Draft)</th>
                <th className="py-2.5 pr-4 font-medium">Governance State</th>
                <th className="py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E4E0]">
              {indicators.map((ind) => {
                const calc = computeIndicatorState(state, ind, filters, cumulativeMode);
                const dispObs = calc.latestApprovedObs || calc.latestAnyObs;
                return (
                  <tr key={ind.id} className="hover:bg-[#F7F7F5] align-top">
                    <td className="py-3 pr-4 max-w-sm">
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'indicator', id: ind.id })}
                        className="text-left hover:text-[#1B4D3E]"
                      >
                        <MetaLine
                          items={[
                            <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{ind.code}</span>,
                            ind.reportingLevel,
                            ind.sector,
                          ]}
                        />
                        <div className="font-medium text-[#14191F] mt-0.5">{ind.title}</div>
                      </button>
                      {cumulativeMode && !ind.permitsCumulative && (
                        <div className="text-[11px] text-[#B45309] mt-1">
                          Period-only indicator (cannot be summed cumulatively — showing latest period).
                        </div>
                      )}
                      {calc.warningFlags.length > 0 && (
                        <div className="text-[11px] text-[#B91C1C] mt-1">{calc.warningFlags[0]}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 max-w-xs">
                      <div className="font-mono text-[11px] text-[#14191F]">
                        {ind.calculationMethod === 'register_aggregate'
                          ? 'Register Roll-up'
                          : ind.calculationMethod === 'formula'
                          ? 'Formula Derived'
                          : 'Direct Period Entry'}
                      </div>
                      {ind.formula && (
                        <div className="text-[11px] text-[#525D68] mt-0.5">{ind.formula.expressionLabel}</div>
                      )}
                      {ind.linkedRegisterId && (
                        <div className="text-[11px] text-[#525D68] mt-0.5">
                          Approved rows: {calc.registerApprovedCount} · Total incl. draft: {calc.registerDraftCount}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap text-[#525D68]">
                      <div>BL: {ind.baseline ?? '—'}</div>
                      <div>Tgt: {ind.target ?? '—'} {ind.unit}</div>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'indicator', id: ind.id })}
                        className="font-semibold text-[#14191F] hover:text-[#1B4D3E]"
                      >
                        {calc.approvedValue !== null ? `${calc.approvedValue} ${ind.unit}` : 'Missing'}
                      </button>
                      {calc.hasDraftDifference && (
                        <div className="text-[11px] text-[#B45309]">
                          Draft preview: {calc.draftPreviewValue} {ind.unit}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div>
                        <ProvenanceText provenance={dispObs?.provenance || ind.provenance} />
                      </div>
                      <MetaLine
                        className="text-[11px] mt-0.5"
                        items={[
                          dispObs ? <ApprovalText key="a" status={dispObs.approvalStatus} /> : 'No entry',
                          dispObs ? <VerificationText key="v" status={dispObs.verificationStatus} /> : null,
                        ]}
                      />
                    </td>
                    <td className="py-3 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'indicator', id: ind.id })}
                        className="text-[#1B4D3E] font-medium hover:underline"
                      >
                        Inspect
                      </button>
                      {roleMeta.canEditWorkplan && (
                        <button
                          type="button"
                          onClick={() => openEditInd(ind)}
                          className="inline-flex items-center gap-1 text-[#525D68] hover:text-[#14191F]"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
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
