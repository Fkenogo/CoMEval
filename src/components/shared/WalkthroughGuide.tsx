import React from 'react';
import { ArrowRight, CheckCircle2, Circle, X } from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';

export const WalkthroughGuide: React.FC = () => {
  const {
    state,
    setWalkthroughOpen,
    setActiveProject,
    setActiveArea,
    setAddProjectModalOpen,
  } = useMiledge();

  if (!state.walkthroughOpen) return null;

  const thirdProject = state.projects.find(
    (p) => p.id !== 'childfund-livelihoods' && p.id !== 'omugo-settlement'
  );
  const thirdProjectApproved = Boolean(thirdProject?.activePlanVersionId);
  const thirdProjectHasAct = Boolean(
    thirdProject && state.activityRecords.some((r) => r.projectId === thirdProject.id)
  );
  const thirdProjectHasMeas = Boolean(
    thirdProject && state.measurementRecords.some((r) => r.projectId === thirdProject.id)
  );
  const thirdProjectHasReport = Boolean(
    thirdProject && state.issuedReports.some((r) => r.projectId === thirdProject.id)
  );

  const hasNewCfAct = state.activityRecords.filter((r) => r.projectId === 'childfund-livelihoods').length > 4;
  const hasNewOmAct = state.activityRecords.filter((r) => r.projectId === 'omugo-settlement').length > 1;
  const hasNewOmMeas = state.measurementRecords.filter((r) => r.projectId === 'omugo-settlement').length > 3;
  const hasOmAction = state.learningItems.some(
    (l) => l.projectId === 'omugo-settlement' && l.actions.length > 0
  );
  const hasRevision =
    state.activityRecords.some((r) => r.revision > 1) ||
    state.measurementRecords.some((r) => r.revision > 1);

  const jump = (projectId: string, area: typeof state.activeArea) => {
    setActiveProject(projectId);
    setActiveArea(area);
    setWalkthroughOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 flex justify-end no-print"
      onClick={() => setWalkthroughOpen(false)}
    >
      <aside
        className="w-full max-w-md bg-white h-full border-l border-[#E2E6E2] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#14532D] text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display">Acceptance Walkthrough Guide</h2>
            <p className="text-xs text-white/80">
              Test every shared engine capability across ChildFund, Omugo, and a new third project.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWalkthroughOpen(false)}
            aria-label="Close guide"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md hover:bg-white/15"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* 1. ChildFund */}
          <section className="space-y-2 border-b border-[#E2E6E2] pb-4">
            <h3 className="text-sm font-bold text-[#14191F]">1. ChildFund Resilient Livelihoods</h3>
            <p className="text-[#525D68]">
              Inspect "Contract trainers" in Plan, capture a new count in Do, record a farming-practice adoption rate in Measure, test returning/fixing the missing-evidence Katakwi submission in Prove, and generate the report.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-[#14191F]">
                {hasNewCfAct ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Recorded a new ChildFund activity in Do</span>
              </div>
              <div className="flex items-center gap-2 text-[#14191F]">
                {hasRevision ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Created a correction revision on an approved record</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => jump('childfund-livelihoods', 'plan')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Open Plan <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => jump('childfund-livelihoods', 'do')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Open Do <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => jump('childfund-livelihoods', 'prove')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Open Prove <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>

          {/* 2. Omugo */}
          <section className="space-y-2 border-b border-[#E2E6E2] pb-4">
            <h3 className="text-sm font-bold text-[#14191F]">2. Omugo Settlement (Same Shared Forms)</h3>
            <p className="text-[#525D68]">
              Switch to Omugo. Use the exact same Do form to inspect a water point (choice field), use Measure to enter Water Access (numerator/denominator), approve, report, and turn the SPHERE finding into a tracked action in Learn.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-[#14191F]">
                {hasNewOmAct ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Recorded a water-point inspection in Do</span>
              </div>
              <div className="flex items-center gap-2 text-[#14191F]">
                {hasNewOmMeas ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Recorded a Water access observation in Measure</span>
              </div>
              <div className="flex items-center gap-2 text-[#14191F]">
                {hasOmAction ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Turned an Omugo finding into a tracked action in Learn</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => jump('omugo-settlement', 'do')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Omugo Do <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => jump('omugo-settlement', 'measure')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Omugo Measure <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => jump('omugo-settlement', 'learn')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Omugo Learn <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>

          {/* 3. Third Project */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#14191F]">3. Build a Third Project Through the UI</h3>
            <p className="text-[#525D68]">
              Create a new project via + Add project, add a site, an activity with a custom question, and an indicator, approve Plan v1.0, then capture in Do &amp; Measure, approve in Prove, and issue its report.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-[#14191F]">
                {thirdProject ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Created third project{thirdProject ? `: ${thirdProject.shortName}` : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-[#14191F]">
                {thirdProjectApproved ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Approved Plan v1.0 to activate Do &amp; Measure</span>
              </div>
              <div className="flex items-center gap-2 text-[#14191F]">
                {thirdProjectHasAct && thirdProjectHasMeas ? (
                  <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                ) : (
                  <Circle className="w-4 h-4 text-[#C5C9C2]" />
                )}
                <span>Captured both an activity and a measurement</span>
              </div>
              <div className="flex items-center gap-2 text-[#14191F]">
                {thirdProjectHasReport ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : <Circle className="w-4 h-4 text-[#C5C9C2]" />}
                <span>Generated &amp; issued report for third project</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setWalkthroughOpen(false);
                  setAddProjectModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#14532D] text-white font-semibold hover:bg-[#0F3F22]"
              >
                + Add Third Project Now
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
