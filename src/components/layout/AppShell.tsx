import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  Compass,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  GitBranch,
  Home,
  LayoutGrid,
  MapPin,
  Menu,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { ROLE_DEFINITIONS, scanRecurringChecks } from '../../lib/mealEngine';
import { NavModule, ProjectId, UserRole } from '../../types/meal';

interface NavGroup {
  label: string;
  items: { id: NavModule; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[];
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    activeProject,
    roleMeta,
    toasts,
    setActiveProject,
    setActiveModule,
    setActiveRole,
    setWalkthroughOpen,
    resetDemoData,
  } = useMeal();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const openChecksCount = scanRecurringChecks(state, state.activeProjectId).length;
  const openActionsCount = state.correctiveActions.filter(
    (a) => a.projectId === state.activeProjectId && a.status !== 'closed'
  ).length;

  const navGroups: NavGroup[] = [
    {
      label: 'Oversight',
      items: [
        { id: 'portfolio', label: 'Portfolio Overview', icon: LayoutGrid },
        { id: 'role_home', label: `${roleMeta.shortLabel} Home`, icon: Home },
        { id: 'overview', label: 'Programme Overview', icon: BarChart3 },
      ],
    },
    {
      label: 'Design & Planning',
      items: [
        { id: 'documents', label: 'Documents & Commitments', icon: FileText },
        { id: 'workplan', label: 'Workplan & Activities', icon: FolderKanban },
        { id: 'results', label: 'Results & Indicators', icon: GitBranch },
      ],
    },
    {
      label: 'Delivery & Data',
      items: [
        { id: 'capture', label: 'Field Capture & Reporting', icon: FileSpreadsheet },
        { id: 'surveys', label: 'Surveys & Assessments', icon: ClipboardCheck },
      ],
    },
    {
      label: 'Quality & Learning',
      items: [
        { id: 'checks', label: 'Checks & Actions', icon: CheckSquare, count: openChecksCount + openActionsCount },
        { id: 'knowledge', label: 'Evidence Knowledge Base', icon: BookOpen },
      ],
    },
    {
      label: 'Evaluation & Output',
      items: [
        { id: 'evaluation', label: 'Evaluation Workspace', icon: ShieldAlert },
        { id: 'reports', label: 'Reports & Exports', icon: Briefcase },
        { id: 'settings', label: 'Geography & Settings', icon: MapPin },
      ],
    },
  ];

  const handleProjectSelect = (val: string) => {
    if (val === 'portfolio') {
      setActiveModule('portfolio');
    } else {
      setActiveProject(val as ProjectId);
      if (state.activeModule === 'portfolio') {
        setActiveModule('overview');
      }
    }
  };

  const renderNav = (onSelect?: () => void) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Workspace navigation">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="px-3 mb-1.5 text-[11px] font-medium text-[#525D68] tracking-wide">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = state.activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.id);
                    onSelect?.();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1B4D3E] text-white font-medium'
                      : 'text-[#14191F] hover:bg-[#F0F1EE]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#525D68]'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`font-mono text-[11px] tabular-nums shrink-0 ${
                        isActive ? 'text-white/85' : 'text-[#B45309]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#14191F]">
      {/* Top Workspace Bar */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#E2E4E0] px-4 lg:px-6 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 rounded text-[#525D68] hover:bg-[#F0F1EE]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('portfolio')}
            className="text-base font-bold tracking-tight text-[#14191F] whitespace-nowrap shrink-0 font-[var(--font-display)]"
          >
            Miledge Programme Intelligence
          </button>
        </div>

        {/* Center / Right Controls: Project Switcher + Role Switcher + Walkthroughs + Reset */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <label className="flex items-center gap-1.5 text-xs text-[#525D68] min-w-0">
            <span className="hidden xl:inline whitespace-nowrap">Project</span>
            <select
              aria-label="Active project switcher"
              value={state.activeModule === 'portfolio' ? 'portfolio' : state.activeProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs font-medium text-[#14191F] max-w-[180px] sm:max-w-[260px] truncate focus:outline-none focus:border-[#1B4D3E]"
            >
              <option value="portfolio">Portfolio Overview (Both Projects)</option>
              <option value="childfund-uganda">Resilient Livelihoods — ChildFund Uganda</option>
              <option value="omugo-wvu">Omugo Settlement — World Vision Uganda</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-[#525D68] min-w-0">
            <span className="hidden xl:inline whitespace-nowrap">Demo Role</span>
            <select
              aria-label="Demo role switcher"
              value={state.activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole, false)}
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs font-medium text-[#14191F] max-w-[130px] sm:max-w-[170px] truncate focus:outline-none focus:border-[#1B4D3E]"
            >
              {Object.values(ROLE_DEFINITIONS).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setWalkthroughOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B4D3E] rounded-md hover:bg-[#143B2F] transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Walkthroughs</span>
          </button>

          {confirmReset ? (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setConfirmReset(false);
                }}
                className="px-2.5 py-1.5 bg-[#B91C1C] text-white font-medium rounded-md whitespace-nowrap"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1.5 text-[#525D68] hover:text-[#14191F] whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              title="Reset local prototype data"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#525D68] border border-[#E2E4E0] rounded-md hover:text-[#14191F] hover:bg-[#F7F7F5] whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-[#E2E4E0] no-print">
          <div className="px-4 py-3 border-b border-[#E2E4E0] bg-[#F7F7F5]">
            <div className="text-xs font-semibold text-[#14191F] truncate">{activeProject.shortName}</div>
            <div className="text-[11px] text-[#525D68] font-mono truncate mt-0.5">
              {activeProject.code} · {activeProject.timeframe}
            </div>
          </div>
          {renderNav()}
          <div className="p-3.5 border-t border-[#E2E4E0] bg-[#F7F7F5] text-[11px] text-[#525D68] space-y-1">
            <div className="font-medium text-[#14191F]">Active Role: {roleMeta.label}</div>
            <button
              type="button"
              onClick={() => setActiveModule('role_home')}
              className="text-[#1B4D3E] font-medium hover:underline"
            >
              Return to {roleMeta.shortLabel} work queue →
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex bg-black/30 no-print" onClick={() => setMobileMenuOpen(false)}>
            <aside className="w-72 max-w-[85vw] bg-white h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E4E0]">
                <span className="text-sm font-bold text-[#14191F]">Miledge Navigation</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 text-[#525D68]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderNav(() => setMobileMenuOpen(false))}
            </aside>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Feedback Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm no-print" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-2.5 rounded-lg border text-xs font-medium shadow-sm bg-white ${
                t.tone === 'warning'
                  ? 'border-[#F59E0B] text-[#92400E]'
                  : t.tone === 'info'
                  ? 'border-[#CBD5E1] text-[#14191F]'
                  : 'border-[#1B4D3E] text-[#1B4D3E]'
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
