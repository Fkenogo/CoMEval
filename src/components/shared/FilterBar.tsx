import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useMeal } from '../../context/MealContext';

export const FilterBar: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { state, activeProject, setFilters, resetFilters } = useMeal();
  const { filters } = state;
  const hasFilter =
    filters.period !== 'all' ||
    filters.partner !== 'all' ||
    filters.location !== 'all' ||
    filters.sector !== 'all';

  return (
    <div className={`flex flex-wrap items-center gap-3 bg-white border border-[#E2E4E0] rounded-lg ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <span className="text-xs font-medium text-[#525D68] whitespace-nowrap">Scope Filters</span>

      <label className="flex items-center gap-1.5 text-xs text-[#525D68]">
        <span>Period</span>
        <select
          value={filters.period}
          onChange={(e) => setFilters({ period: e.target.value })}
          className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-1 text-xs text-[#14191F] focus:outline-none focus:border-[#1B4D3E]"
        >
          <option value="all">All periods</option>
          {activeProject.reportingCycles.map((c) => (
            <option key={c.id} value={c.label}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-[#525D68]">
        <span>Partner</span>
        <select
          value={filters.partner}
          onChange={(e) => setFilters({ partner: e.target.value })}
          className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-1 text-xs text-[#14191F] focus:outline-none focus:border-[#1B4D3E]"
        >
          <option value="all">All partners</option>
          {activeProject.partners.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-[#525D68]">
        <span>Location</span>
        <select
          value={filters.location}
          onChange={(e) => setFilters({ location: e.target.value })}
          className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-1 text-xs text-[#14191F] focus:outline-none focus:border-[#1B4D3E]"
        >
          <option value="all">All locations</option>
          {activeProject.locations.map((l) => (
            <option key={l.id} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-[#525D68]">
        <span>Sector</span>
        <select
          value={filters.sector}
          onChange={(e) => setFilters({ sector: e.target.value })}
          className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-1 text-xs text-[#14191F] focus:outline-none focus:border-[#1B4D3E]"
        >
          <option value="all">All sectors</option>
          {activeProject.sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {hasFilter && (
        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4D3E] hover:underline whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
};
