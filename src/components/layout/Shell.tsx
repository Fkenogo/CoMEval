import React, { useState } from 'react';
import {
  BarChart3,
  CheckSquare,
  ClipboardEdit,
  Compass,
  FileBarChart2,
  Lightbulb,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';
import { DEMO_ROLES } from '../../lib/engine';
import { AreaId, DemoRole } from '../../types/miledge';

const AREAS: { id: AreaId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'plan', label: 'Plan', icon: SlidersHorizontal },
  { id: 'do', label: 'Do', icon: ClipboardEdit },
  { id: 'measure', label: 'Measure', icon: BarChart3 },
  { id: 'prove', label: 'Prove', icon: CheckSquare },
  { id: 'report', label: 'Report', icon: FileBarChart2 },
  { id: 'learn', label: 'Learn', icon: Lightbulb },
];

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    activeProject,
    activeApprovedPlan,
    roleDef,
    toasts,
    setActiveProject,
    setActiveArea,
    setActiveRole,
    setWalkthroughOpen,
    setAddProjectModalOpen,
    resetDemo,
  } = useMiledge();

  const [confirmReset, setConfirmReset] = useState(false);

  const pendingProveCount =
    state.activityRecords.filter(
      (r) => r.projectId === activeProject.id && (r.status === 'submitted' || r.status === 'verified' || r.status === 'returned')
    ).length +
    state.measurementRecords.filter(
      (r) => r.projectId === activeProject.id && (r.status === 'submitted' || r.status === 'verified' || r.status === 'returned')
    ).length;

  const handleProjectChange = (val: string) => {
    if (val === '__add_new__') {
      setAddProjectModalOpen(true);
      return;
    }
    setActiveProject(val);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F5] text-[#14191F]">
      {/* Top Application Bar — single compact row */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#E2E6E2] px-3 sm:px-6 flex items-center justify-between gap-3 no-print">
        {/* Left: Brand Wordmark + Persistent Project Switcher */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <button
            type="button"
            onClick={() => setActiveArea('do')}
            className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0 font-display"
          >
            <span className="text-[#14191F]">Miledge </span>
            <span className="text-[#14532D]">M&amp;E</span>
          </button>

          <select
            aria-label="Active project switcher"
            value={activeProject.id}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="min-h-[38px] bg-[#F6F7F5] border border-[#C5C9C2] rounded-lg px-2.5 py-1 text-xs sm:text-sm font-medium text-[#14191F] max-w-[170px] sm:max-w-[260px] truncate focus:outline-none focus:border-[#14532D]"
          >
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="__add_new__">+ Add project...</option>
          </select>
        </div>

        {/* Center: 6 Connected Areas (Desktop) */}
        <nav aria-label="Six M&E areas" className="hidden lg:flex items-center gap-1">
          {AREAS.map((area) => {
            const active = state.activeArea === area.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setActiveArea(area.id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#14532D] text-white'
                    : 'text-[#14191F] hover:bg-[#F0F2EF]'
                }`}
              >
                <span>{area.label}</span>
                {area.id === 'prove' && pendingProveCount > 0 && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-white/85' : 'text-[#B45309]'
                    }`}
                  >
                    {pendingProveCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Role Switcher + Walkthrough Guide + Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            aria-label="Demo role switcher"
            value={state.activeRole}
            onChange={(e) => setActiveRole(e.target.value as DemoRole)}
            className="min-h-[36px] bg-[#F6F7F5] border border-[#C5C9C2] rounded-lg px-2 py-1 text-xs font-medium text-[#14191F] max-w-[125px] sm:max-w-[165px] truncate focus:outline-none focus:border-[#14532D]"
          >
            {Object.values(DEMO_ROLES).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setWalkthroughOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22] whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {confirmReset ? (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  resetDemo();
                  setConfirmReset(false);
                }}
                className="min-h-[36px] px-2.5 py-1 bg-[#B91C1C] text-white font-semibold rounded-lg whitespace-nowrap"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[36px] px-2 py-1 text-[#525D68] hover:text-[#14191F]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              title="Reset local demo data"
              aria-label="Reset demo data"
              className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] px-2 rounded-lg border border-[#E2E6E2] text-[#525D68] hover:text-[#14191F] hover:bg-[#F6F7F5]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Quiet contextual strip (non-sticky so mobile sticky height stays strictly <= 15%) */}
      <div className="bg-white border-b border-[#E2E6E2] px-4 sm:px-6 py-2 text-xs text-[#525D68] flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold text-[#14191F]">{activeProject.name}</span>
          <span aria-hidden="true" className="text-[#C5C9C2]">·</span>
          <span className="font-mono">{activeProject.code}</span>
          <span aria-hidden="true" className="text-[#C5C9C2]">·</span>
          <span>
            Active plan:{' '}
            <strong className={activeApprovedPlan ? 'text-[#14532D]' : 'text-[#B45309]'}>
              {activeApprovedPlan ? activeApprovedPlan.versionLabel : 'Not yet approved (Draft only)'}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>
            Role: <strong className="text-[#14191F]">{roleDef.label}</strong>
            {roleDef.approvedOnlyView ? ' (Approved records & issued reports only)' : ''}
          </span>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-3 sm:px-6 py-5 sm:py-6 pb-20 lg:pb-8">
        {children}
      </main>

      {/* Mobile Bottom 6-Area Tab Bar (compact h-14 = 56px, total sticky height well within 15% cap) */}
      <nav
        aria-label="Mobile area navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white border-t border-[#E2E6E2] grid grid-cols-6 no-print"
      >
        {AREAS.map((area) => {
          const Icon = area.icon;
          const active = state.activeArea === area.id;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => setActiveArea(area.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? 'text-[#14532D] font-semibold bg-[#EBF7EE]/60' : 'text-[#525D68]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{area.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live Feedback Toasts */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-16 lg:bottom-5 right-4 z-50 space-y-2 max-w-sm no-print"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-2.5 rounded-lg border bg-white text-xs font-medium shadow-sm ${
                t.tone === 'error'
                  ? 'border-[#B91C1C] text-[#B91C1C]'
                  : t.tone === 'warning'
                  ? 'border-[#B45309] text-[#92400E]'
                  : t.tone === 'info'
                  ? 'border-[#C5C9C2] text-[#14191F]'
                  : 'border-[#14532D] text-[#14532D]'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
