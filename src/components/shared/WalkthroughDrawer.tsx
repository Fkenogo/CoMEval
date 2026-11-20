import React from 'react';
import { ArrowRight, CheckCircle2, Circle, Compass, X } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeHandoverDiff } from '../../lib/mealEngine';
import { NavModule, ProjectId, UserRole } from '../../types/meal';

interface WalkthroughStep {
  id: string;
  title: string;
  detail: string;
  role: UserRole;
  project: ProjectId;
  module: NavModule;
  done: boolean;
  provenanceNote: string;
}

export const WalkthroughDrawer: React.FC = () => {
  const { state, setWalkthroughOpen, setActiveProject, setActiveRole, setActiveModule } = useMeal();

  if (!state.walkthroughOpen) return null;

  const cfCom2Approved = state.commitments.some((c) => c.id === 'com-cf-2' && c.status === 'approved');
  const cfNewDelivery = state.deliveryRecords.some((d) => d.projectId === 'childfund-uganda' && d.provenance === 'synthetic');
  const cfClosedAction = state.correctiveActions.some((a) => a.projectId === 'childfund-uganda' && a.status === 'closed');
  const cfHasExtraSnapshot = state.handoverSnapshots.filter((s) => s.projectId === 'childfund-uganda').length > 1;
  const cfTrainerSnapDiff = state.handoverSnapshots
    .filter((s) => s.projectId === 'childfund-uganda')
    .some((s) => computeHandoverDiff(state, s).some((d) => d.changed));

  const omSanFlagged = state.observations.some(
    (o) => o.id === 'obs-om-san-el' && o.independentNotes.length > 1
  );
  const omEvalUpdated = state.evaluationQuestions.some(
    (q) => q.projectId === 'omugo-wvu' && Boolean(q.assignedFollowUpNote)
  );

  const childFundSteps: WalkthroughStep[] = [
    {
      id: 'cf-1',
      title: '1. Approve commitment & create workplan activity',
      detail: 'Open Project Documents & Commitments, review COM-CF-02 (106 youth startup kits from Interim Report Para 89) or COM-CF-01 (12 trainers), approve it, and assign a linked Workplan Activity.',
      role: 'programme_manager',
      project: 'childfund-uganda',
      module: 'documents',
      done: cfCom2Approved,
      provenanceNote: 'Sourced document + simulated extraction',
    },
    {
      id: 'cf-2',
      title: '2. Log field delivery & see live draft preview',
      detail: 'Switch to Implementing Partner in Field Capture. Log trainer delivery (or save a draft row in the Trainer Contracting Register). Watch the draft preview change while Donor Reports retain the last approved figure (10).',
      role: 'implementing_partner',
      project: 'childfund-uganda',
      module: 'capture',
      done: cfNewDelivery,
      provenanceNote: 'Synthetic demo capture',
    },
    {
      id: 'cf-3',
      title: '3. Review check, return/fix & close corrective action with evidence',
      detail: 'Open Checks & Corrective Actions as M&E Reviewer. Inspect the missing trainer-contract check, assign or submit closure evidence, verify closure, and approve the submitted figure.',
      role: 'me_reviewer',
      project: 'childfund-uganda',
      module: 'checks',
      done: cfClosedAction,
      provenanceNote: 'Operational workflow demo',
    },
    {
      id: 'cf-4',
      title: '4. Generate BMZ Donor Report & dated Evaluator Handover',
      detail: 'Preview the BMZ Interim Donor Report with approved figures + qualitative learning, export CSV/Print, then issue a dated Handover Snapshot in Evaluation Workspace.',
      role: 'programme_manager',
      project: 'childfund-uganda',
      module: 'reports',
      done: cfHasExtraSnapshot,
      provenanceNote: 'Live records + source appendix',
    },
  ];

  const omugoSteps: WalkthroughStep[] = [
    {
      id: 'om-1',
      title: '1. Inspect WASH commitment & Q3 delivery outputs',
      detail: 'Review COM-OM-01 & COM-OM-02 from Logframe Omugo.xlsx (SPHERE 3L/day water & 1:40 latrine standard) and trace them to Workplan Activities WP-OM-7.1 & 7.2 (3 tanks installed, 10 VIP stances built).',
      role: 'programme_manager',
      project: 'omugo-wvu',
      module: 'workplan',
      done: state.activeProjectId === 'omugo-wvu',
      provenanceNote: 'Sourced (Logframe & Q3 LEAP)',
    },
    {
      id: 'om-2',
      title: '2. Open reconstructed endline WASH findings & compare',
      detail: 'Open Programme Overview or Surveys & Assessments to compare Q3 physical tanks (11,500L) against Endline findings: 0 children meeting 3L/day (0.3L actual) and 1,055 sanitation claim vs. 167:1 peak crowding.',
      role: 'independent_evaluator',
      project: 'omugo-wvu',
      module: 'surveys',
      done: state.activeProjectId === 'omugo-wvu' && state.activeModule === 'surveys',
      provenanceNote: 'Reconstructed (Aug 2018 Endline)',
    },
    {
      id: 'om-3',
      title: '3. Flag discrepancy & push verification follow-up to Evaluation Plan',
      detail: 'Click the 1,055 sanitation figure (OM-3.1.2) to open the Source Inspector, add an Independent Evaluator note flagging the SPHERE 1:40 conflict without editing the implementation record, and push it to EQ-OM-01.',
      role: 'independent_evaluator',
      project: 'omugo-wvu',
      module: 'evaluation',
      done: omSanFlagged || omEvalUpdated,
      provenanceNote: 'Independent verification demo',
    },
    {
      id: 'om-4',
      title: '4. Trace the entire trail in the Project Knowledge Base',
      detail: 'Open Evidence Knowledge Base, select WASH Indicator OM-3.1.2 or EQ-OM-01, and generate a Source-Cited Brief surfacing what each document establishes and what remains missing.',
      role: 'independent_evaluator',
      project: 'omugo-wvu',
      module: 'knowledge',
      done: state.activeProjectId === 'omugo-wvu' && state.activeModule === 'knowledge',
      provenanceNote: 'Deterministic citation synthesis',
    },
  ];

  const correctionSteps: WalkthroughStep[] = [
    {
      id: 'cor-1',
      title: '1. Verify existing dated handover snapshot (v1.0 = 10 trainers)',
      detail: 'In ChildFund Evaluation Workspace, confirm the pre-seeded H1 2023 Handover Snapshot froze CF-OP1.3 (Trainers Contracted) at 10 trainers.',
      role: 'independent_evaluator',
      project: 'childfund-uganda',
      module: 'evaluation',
      done: true,
      provenanceNote: 'Frozen snapshot baseline',
    },
    {
      id: 'cor-2',
      title: '2. Approve a post-handover correction as M&E Reviewer',
      detail: 'In Checks & Corrective Actions, click "Correct Approved Figure" on CF-OP1.3 (e.g., update 10 → 12 after verifying final 2 PfCW female trainer contracts) with a mandatory audit reason.',
      role: 'me_reviewer',
      project: 'childfund-uganda',
      module: 'checks',
      done: cfTrainerSnapDiff,
      provenanceNote: 'Immutable revision history',
    },
    {
      id: 'cor-3',
      title: '3. Inspect frozen snapshot vs. updated live figure',
      detail: 'Return to Evaluation Workspace → Handover Snapshots. The original handover still displays 10, right beside the live corrected figure (12), reviewer attribution, and correction rationale.',
      role: 'independent_evaluator',
      project: 'childfund-uganda',
      module: 'evaluation',
      done: cfTrainerSnapDiff,
      provenanceNote: 'Post-handover audit diff',
    },
  ];

  const activeSteps =
    state.activeWalkthroughTab === 'childfund'
      ? childFundSteps
      : state.activeWalkthroughTab === 'omugo'
      ? omugoSteps
      : correctionSteps;

  const jumpTo = (step: WalkthroughStep) => {
    setActiveProject(step.project);
    setActiveRole(step.role, false);
    setActiveModule(step.module);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20 no-print" onClick={() => setWalkthroughOpen(false)}>
      <aside
        className="w-full max-w-md bg-white h-full border-l border-[#E2E4E0] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-label="Guided Walkthroughs"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E4E0] bg-[#F7F7F5]">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#1B4D3E]" />
            <h2 className="text-sm font-semibold text-[#14191F]">Guided Lifecycle Walkthroughs</h2>
          </div>
          <button
            type="button"
            onClick={() => setWalkthroughOpen(false)}
            className="p-1 text-[#525D68] hover:text-[#14191F] rounded"
            aria-label="Close walkthroughs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-[#E2E4E0]">
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#F0F1EE] rounded-lg">
            {(
              [
                { id: 'childfund', label: 'A. ChildFund' },
                { id: 'omugo', label: 'B. Omugo WASH' },
                { id: 'correction', label: 'C. Post-Handover' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWalkthroughOpen(true, tab.id)}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  state.activeWalkthroughTab === tab.id
                    ? 'bg-white text-[#14191F] shadow-sm'
                    : 'text-[#525D68] hover:text-[#14191F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeSteps.map((step) => (
            <div key={step.id} className="border border-[#E2E4E0] rounded-lg p-4 bg-white space-y-2">
              <div className="flex items-start gap-2.5">
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#14191F]">{step.title}</div>
                  <div className="text-[11px] text-[#525D68] mt-0.5">{step.provenanceNote}</div>
                </div>
              </div>
              <p className="text-xs text-[#525D68] leading-relaxed pl-6">{step.detail}</p>
              <div className="pl-6 pt-1">
                <button
                  type="button"
                  onClick={() => jumpTo(step)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4D3E] hover:underline"
                >
                  Open screen as {step.role.replace('_', ' ')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
