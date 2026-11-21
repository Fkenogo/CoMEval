import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, ShieldAlert, X } from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';

export const WalkthroughGuide: React.FC = () => {
  const {
    state,
    simulateStorageFailure,
    hasRecoveredFromSaveFailure,
    setSimulateStorageFailure,
    setWalkthroughOpen,
    setActiveProject,
    setActiveArea,
    setAddProjectModalOpen,
  } = useMiledge();

  if (!state.walkthroughOpen) return null;

  // 1. ChildFund tightened checks (Do, Measure, Missing-Evidence fix, Approved Revision)
  const cfUniqueActGroups = new Set(
    state.activityRecords.filter((r) => r.projectId === 'childfund-livelihoods').map((r) => r.recordGroupId)
  ).size;
  const cfUniqueMeasGroups = new Set(
    state.measurementRecords.filter((r) => r.projectId === 'childfund-livelihoods').map((r) => r.recordGroupId)
  ).size;
  const hasNewCfAct = cfUniqueActGroups > 4;
  const hasNewCfMeas = cfUniqueMeasGroups > 1;
  const katakwiRec = state.activityRecords.find((r) => r.id === 'actrec-cf-3');
  const katakwiFixedAndApproved = Boolean(
    katakwiRec &&
      katakwiRec.evidence.length > 0 &&
      (katakwiRec.status === 'verified' || katakwiRec.status === 'approved')
  );
  const hasApprovedRevision =
    state.activityRecords.some((r) => r.revision > 1 && r.status === 'approved') ||
    state.measurementRecords.some((r) => r.revision > 1 && r.status === 'approved');

  // 2. Omugo tightened checks (Do, Measure, Learn action)
  const omUniqueActGroups = new Set(
    state.activityRecords.filter((r) => r.projectId === 'omugo-settlement').map((r) => r.recordGroupId)
  ).size;
  const omUniqueMeasGroups = new Set(
    state.measurementRecords.filter((r) => r.projectId === 'omugo-settlement').map((r) => r.recordGroupId)
  ).size;
  const hasNewOmAct = omUniqueActGroups > 1;
  const hasNewOmMeas = omUniqueMeasGroups > 3;
  const hasLearnAction = state.learningItems.some((l) => l.actions.length > 0);

  // 3. Third Project tightened checks (Created -> Custom Questions & Approved Plan -> Approved Do + Approved Measure -> Issued Report showing BOTH contributions)
  const thirdProject = state.projects.find(
    (p) => p.id !== 'childfund-livelihoods' && p.id !== 'omugo-settlement'
  );
  const thirdActivePlan = thirdProject?.planVersions.find(
    (v) => v.id === thirdProject.activePlanVersionId
  );
  const thirdHasCustomQuestionsAndApprovedPlan = Boolean(
    thirdActivePlan &&
      thirdActivePlan.plan.sites.length > 0 &&
      thirdActivePlan.plan.activities.some((a) => a.questions.length > 0) &&
      thirdActivePlan.plan.indicators.some((i) => i.questions.length > 0)
  );
  const thirdHasApprovedAct = Boolean(
    thirdProject &&
      state.activityRecords.some((r) => r.projectId === thirdProject.id && r.status === 'approved')
  );
  const thirdHasApprovedMeas = Boolean(
    thirdProject &&
      state.measurementRecords.some((r) => r.projectId === thirdProject.id && r.status === 'approved')
  );
  const thirdHasReportWithBoth = Boolean(
    thirdProject &&
      state.issuedReports.some(
        (rep) =>
          rep.projectId === thirdProject.id &&
          rep.activityRows.some((a) => a.recordCount > 0 && (a.delivered ?? 0) >= 0) &&
          rep.indicatorRows.some((i) => i.actualValue !== null && i.contributingCount > 0)
      )
  );

  // 4. Persisted Attachment & Save-Failure Recovery checks
  const hasPersistedDataUrlAttachment =
    state.activityRecords.some((r) => r.evidence.some((e) => Boolean(e.dataUrl))) ||
    state.measurementRecords.some((r) => r.evidence.some((e) => Boolean(e.dataUrl))) ||
    state.learningItems.some((l) => l.actions.some((a) => Boolean(a.closureEvidence?.dataUrl)));

  const jump = (projectId: string, area: typeof state.activeArea) => {
    setActiveProject(projectId);
    setActiveArea(area);
    setWalkthroughOpen(false);
  };

  const CheckItem: React.FC<{ done: boolean; label: string }> = ({ done, label }) => (
    <div className="flex items-start gap-2 text-[#14191F]">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-[#C5C9C2] shrink-0 mt-0.5" />
      )}
      <span className={done ? 'text-[#14191F]' : 'text-[#525D68]'}>{label}</span>
    </div>
  );

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
            <h2 className="text-base font-bold font-display">Founder Walkthrough Checklist</h2>
            <p className="text-xs text-white/80">
              Strict completion checks verifying approved records, reports, revisions, and save recovery.
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
              Capture an activity in Do and a survey rate in Measure, return/fix the missing-evidence Katakwi trainer record in Prove, and approve a correction revision while checking frozen Report v1.0.
            </p>
            <div className="space-y-1.5 pt-1">
              <CheckItem done={hasNewCfAct} label="Recorded a new ChildFund activity in Do" />
              <CheckItem done={hasNewCfMeas} label="Recorded a new ChildFund measurement in Measure" />
              <CheckItem
                done={katakwiFixedAndApproved}
                label="Returned Katakwi record, attached evidence & verified/approved in Prove"
              />
              <CheckItem
                done={hasApprovedRevision}
                label="Approved a correction revision (Rev 2+) while frozen report kept Rev 1"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => jump('childfund-livelihoods', 'do')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Do <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => jump('childfund-livelihoods', 'measure')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Measure <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => jump('childfund-livelihoods', 'prove')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Prove <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => jump('childfund-livelihoods', 'report')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
              >
                Report <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>

          {/* 2. Omugo */}
          <section className="space-y-2 border-b border-[#E2E6E2] pb-4">
            <h3 className="text-sm font-bold text-[#14191F]">2. Omugo Settlement (Same Shared Forms)</h3>
            <p className="text-[#525D68]">
              Use the same Do &amp; Measure screens for Omugo&apos;s choice-based water inspection and numerator/denominator Water Access rate, then turn one finding into a tracked action in Learn.
            </p>
            <div className="space-y-1.5 pt-1">
              <CheckItem done={hasNewOmAct} label="Recorded a new Omugo water-point inspection in Do" />
              <CheckItem done={hasNewOmMeas} label="Recorded a new Omugo Water access measurement in Measure" />
              <CheckItem done={hasLearnAction} label="Turned at least one finding into a tracked action in Learn" />
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
          <section className="space-y-2 border-b border-[#E2E6E2] pb-4">
            <h3 className="text-sm font-bold text-[#14191F]">3. Third Project End-to-End via Plan</h3>
            <p className="text-[#525D68]">
              Create a third project, define its own activity &amp; indicator questions in Plan, approve Plan v1.0, approve both a Do record and a Measure record, and issue a report showing both contributions.
            </p>
            <div className="space-y-1.5 pt-1">
              <CheckItem
                done={Boolean(thirdProject)}
                label={`Created third project${thirdProject ? `: ${thirdProject.shortName}` : ''}`}
              />
              <CheckItem
                done={thirdHasCustomQuestionsAndApprovedPlan}
                label="Defined custom activity & indicator questions and approved Plan v1.0"
              />
              <CheckItem
                done={thirdHasApprovedAct && thirdHasApprovedMeas}
                label="Submitted, verified & approved both an activity and a measurement"
              />
              <CheckItem
                done={thirdHasReportWithBoth}
                label="Issued a frozen report showing both activity and indicator contributions"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {!thirdProject ? (
                <button
                  type="button"
                  onClick={() => {
                    setWalkthroughOpen(false);
                    setAddProjectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#14532D] text-white font-semibold hover:bg-[#0F3F22]"
                >
                  + Add Third Project
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => jump(thirdProject.id, 'plan')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
                  >
                    {thirdProject.shortName} Plan <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => jump(thirdProject.id, 'prove')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
                  >
                    Prove <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => jump(thirdProject.id, 'report')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E6E2] font-medium text-[#14532D] hover:bg-[#F6F7F5]"
                  >
                    Report <ArrowRight className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </section>

          {/* 4. Storage Persistence & Failure Recovery Test */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold text-[#14191F]">4. Attachment Persistence &amp; Save-Failure Recovery</h3>
            <div className="space-y-1.5">
              <CheckItem
                done={hasPersistedDataUrlAttachment}
                label="Saved a file/photo attachment locally (reload page & click Open to verify)"
              />
              <CheckItem
                done={hasRecoveredFromSaveFailure}
                label="Tested browser save failure & recovered entry via top recovery bar"
              />
            </div>

            <div className="rounded-lg border border-[#E2E6E2] bg-[#F6F7F5] p-3 space-y-2">
              <div className="font-semibold text-[#14191F] flex items-center gap-1.5">
                {simulateStorageFailure ? (
                  <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                )}
                Simulate Browser Storage Failure
              </div>
              <p className="text-[11px] text-[#525D68]">
                Arm this fault, save any record or edit, observe the visible recovery bar while your entry stays intact in memory, then click <strong>Retry save</strong> to recover.
              </p>
              <button
                type="button"
                onClick={() => setSimulateStorageFailure(!simulateStorageFailure)}
                className={`w-full min-h-[38px] px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  simulateStorageFailure
                    ? 'bg-[#B91C1C] text-white hover:bg-[#991B1B]'
                    : 'border border-[#C5C9C2] bg-white text-[#14191F] hover:bg-[#EAECE8]'
                }`}
              >
                {simulateStorageFailure
                  ? 'Disarm simulated save failure & save now'
                  : 'Arm simulated browser save failure'}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
