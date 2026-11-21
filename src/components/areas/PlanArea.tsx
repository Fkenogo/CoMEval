import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  History,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';
import {
  ActivityDefinition,
  ActivityDeliveryCountingMode,
  AggregationRule,
  CollectionQuestion,
  FrameworkLevel,
  IndicatorDefinition,
  IndicatorInputRole,
  QuestionType,
  SiteConfig,
  SourceDocument,
  ValueStatus,
} from '../../types/miledge';
import { DynamicQuestionBlock } from '../shared/DynamicQuestionField';
import { MetaRow } from '../shared/StatusLabels';

type PlanTab =
  | 'details'
  | 'framework'
  | 'activities_sites'
  | 'indicators'
  | 'baselines_targets'
  | 'questions'
  | 'reporting';

export const PlanArea: React.FC = () => {
  const {
    activeProject,
    activeApprovedPlan,
    roleDef,
    updateDraftPlan,
    approveDraftPlan,
    setActiveArea,
    notify,
  } = useMiledge();

  const draft = activeProject.draftPlan;
  const canEdit = roleDef.canEditPlan;

  const [tab, setTab] = useState<PlanTab>('questions');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  // Quick-add forms for each section
  // 1. Source document
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<SourceDocument['docType']>('Proposal');
  const [docVer, setDocVer] = useState('v1.0');
  const [docRef, setDocRef] = useState('');

  // 2. Framework item
  const [fwLevel, setFwLevel] = useState<FrameworkLevel>('Output');
  const [fwCode, setFwCode] = useState('');
  const [fwTitle, setFwTitle] = useState('');
  const [fwAssumption, setFwAssumption] = useState('');
  const [fwRisk, setFwRisk] = useState('');

  // 3. Site & Activity
  const [siteName, setSiteName] = useState('');
  const [siteRegion, setSiteRegion] = useState('');
  const [siteType, setSiteType] = useState<SiteConfig['type']>('District');

  const [actName, setActName] = useState('');
  const [actQty, setActQty] = useState('10');
  const [actUnit, setActUnit] = useState('sessions');
  const [actPeriodId, setActPeriodId] = useState('');
  const [actCountingMode, setActCountingMode] = useState<ActivityDeliveryCountingMode>('sum_question');
  const [actPartMode, setActPartMode] = useState<'none' | 'aggregate' | 'registry'>('none');
  const [actEvLabel, setActEvLabel] = useState('Signed attendance or site photo');
  const [actEvReq, setActEvReq] = useState(true);

  // 4. Indicator
  const [indCode, setIndCode] = useState('');
  const [indName, setIndName] = useState('');
  const [indDef, setIndDef] = useState('');
  const [indLevel, setIndLevel] = useState<FrameworkLevel>('Output');
  const [indUnit, setIndUnit] = useState('%');
  const [indInputMode, setIndInputMode] = useState<IndicatorDefinition['inputMode']>('ratio_numerator_denominator');
  const [indAggRule, setIndAggRule] = useState<AggregationRule>('combined_rate');
  const [indMethod, setIndMethod] = useState('Household survey');

  // 6. Collection Questions target selector & editor
  const [qTargetKind, setQTargetKind] = useState<'activity' | 'indicator'>('activity');
  const [qTargetId, setQTargetId] = useState<string>(draft.activities[0]?.id || '');
  const [newQLabel, setNewQLabel] = useState('');
  const [newQType, setNewQType] = useState<QuestionType>('whole_number');
  const [newQRequired, setNewQRequired] = useState(true);
  const [newQMin, setNewQMin] = useState('0');
  const [newQMax, setNewQMax] = useState('1000');
  const [newQOptions, setNewQOptions] = useState('Functional, Needs repair, Non-functional');
  const [newQMapIndId, setNewQMapIndId] = useState('');
  const [newQMapRole, setNewQMapRole] = useState<IndicatorInputRole>('count');
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string | number | boolean>>({});

  // 7. Reporting period add
  const [newPeriodLabel, setNewPeriodLabel] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('2025-04-01');
  const [newPeriodEnd, setNewPeriodEnd] = useState('2025-06-30');
  const [newPeriodDue, setNewPeriodDue] = useState('2025-07-15');

  const resolvedQTargetId = useMemo(() => {
    if (qTargetKind === 'activity') {
      return draft.activities.some((a) => a.id === qTargetId) ? qTargetId : draft.activities[0]?.id || '';
    }
    return draft.indicators.some((i) => i.id === qTargetId) ? qTargetId : draft.indicators[0]?.id || '';
  }, [qTargetKind, qTargetId, draft.activities, draft.indicators]);

  const activeQTargetActivity =
    qTargetKind === 'activity' ? draft.activities.find((a) => a.id === resolvedQTargetId) || null : null;
  const activeQTargetIndicator =
    qTargetKind === 'indicator' ? draft.indicators.find((i) => i.id === resolvedQTargetId) || null : null;
  const currentQuestions: CollectionQuestion[] =
    qTargetKind === 'activity'
      ? activeQTargetActivity?.questions || []
      : activeQTargetIndicator?.questions || [];

  const handleAddSourceDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    updateDraftPlan(activeProject.id, (p) => ({
      ...p,
      sourceDocuments: [
        ...p.sourceDocuments,
        {
          id: `doc-${Date.now()}`,
          title: docTitle.trim(),
          docType,
          version: docVer.trim() || 'v1.0',
          reference: docRef.trim() || docTitle.trim(),
          date: new Date().toISOString().slice(0, 10),
          available: true,
        },
      ],
    }));
    setDocTitle('');
    setDocRef('');
    notify('Added source document to draft plan.', 'info');
  };

  const handleAddFramework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fwTitle.trim()) return;
    updateDraftPlan(activeProject.id, (p) => ({
      ...p,
      framework: [
        ...p.framework,
        {
          id: `fw-${Date.now()}`,
          level: fwLevel,
          code: fwCode.trim() || `${fwLevel.slice(0, 2).toUpperCase()}${p.framework.length + 1}`,
          title: fwTitle.trim(),
          parentId: null,
          assumptions: fwAssumption.trim() ? [fwAssumption.trim()] : [],
          risks: fwRisk.trim() ? [fwRisk.trim()] : [],
        },
      ],
    }));
    setFwCode('');
    setFwTitle('');
    setFwAssumption('');
    setFwRisk('');
    notify('Added results framework item to draft plan.', 'info');
  };

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;
    updateDraftPlan(activeProject.id, (p) => ({
      ...p,
      sites: [
        ...p.sites,
        {
          id: `site-${Date.now()}`,
          name: siteName.trim(),
          region: siteRegion.trim() || 'Project Area',
          type: siteType,
        },
      ],
    }));
    setSiteName('');
    setSiteRegion('');
    notify('Site added to draft plan.', 'info');
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim()) return;
    const chosenPeriod =
      actPeriodId && draft.reportingRules.periods.some((p) => p.id === actPeriodId)
        ? actPeriodId
        : draft.reportingRules.defaultPeriodId;
    const newAct: ActivityDefinition = {
      id: `act-${Date.now()}`,
      code: `ACT-${draft.activities.length + 1}`,
      name: actName.trim(),
      frameworkItemId: draft.framework[draft.framework.length - 1]?.id || '',
      expectedQuantity: Math.max(1, Number(actQty) || 1),
      unit: actUnit.trim() || (actCountingMode === 'count_events' ? 'events' : 'units'),
      periodId: chosenPeriod,
      deliveryCountingMode: actCountingMode,
      participantMode: actPartMode,
      questions: [],
      evidenceRequirement: {
        required: actEvReq,
        label: actEvLabel.trim() || 'Supporting field evidence',
        acceptedTypes: ['file', 'photo', 'source_ref'],
      },
    };
    updateDraftPlan(activeProject.id, (p) => ({
      ...p,
      activities: [...p.activities, newAct],
    }));
    setQTargetKind('activity');
    setQTargetId(newAct.id);
    setActName('');
    notify(
      `Activity "${newAct.name}" added (${actCountingMode === 'count_events' ? 'counts events' : `sums numeric quantity in ${newAct.unit}`}). Configure its questions in Tab 6.`,
      'info'
    );
  };

  const handleAddIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indName.trim()) return;
    const newId = `ind-${Date.now()}`;
    const defaultQuestions: CollectionQuestion[] =
      indInputMode === 'ratio_numerator_denominator'
        ? [
            {
              id: `q-num-${Date.now()}`,
              label: `${indName.trim()} — Numerator count`,
              type: 'whole_number',
              required: true,
              min: 0,
              max: 100000,
              indicatorMapping: { indicatorId: newId, role: 'numerator' },
            },
            {
              id: `q-den-${Date.now() + 1}`,
              label: `${indName.trim()} — Denominator assessed`,
              type: 'whole_number',
              required: true,
              min: 1,
              max: 100000,
              indicatorMapping: { indicatorId: newId, role: 'denominator' },
            },
          ]
        : indInputMode === 'single_value'
        ? [
            {
              id: `q-val-${Date.now()}`,
              label: `Measured value (${indUnit || 'units'})`,
              type: 'decimal',
              required: true,
              min: 0,
              indicatorMapping: { indicatorId: newId, role: 'value' },
            },
          ]
        : [];

    const created: IndicatorDefinition = {
      id: newId,
      code: indCode.trim() || `IND-${draft.indicators.length + 1}`,
      name: indName.trim(),
      definition: indDef.trim() || `Configured indicator tracking ${indName.trim()}.`,
      frameworkLevel: indLevel,
      frameworkItemId: draft.framework[0]?.id || '',
      unit: indUnit.trim() || (indInputMode === 'ratio_numerator_denominator' ? '%' : 'count'),
      dataSource: 'Project monitoring / survey records',
      collectionMethod: indMethod.trim() || 'Routine monitoring',
      frequency: 'Per reporting period',
      responsibleRole: 'M&E Reviewer',
      direction: 'increase',
      disaggregations: ['Site'],
      inputMode: indInputMode,
      baseline: {
        status: 'numeric',
        value: 0,
        date: new Date().toISOString().slice(0, 10),
        scope: 'Project baseline',
        source: 'Initial setup',
      },
      periodTargets: draft.reportingRules.periods.map((p) => ({
        periodId: p.id,
        status: 'numeric' as ValueStatus,
        value: indInputMode === 'ratio_numerator_denominator' ? 80 : 10,
      })),
      finalTarget: {
        status: 'numeric',
        value: indInputMode === 'ratio_numerator_denominator' ? 80 : 10,
      },
      aggregationRule: indAggRule,
      comparableAcrossSites: true,
      questions: defaultQuestions,
      evidenceRequirement: {
        required: true,
        label: 'Source register or survey summary',
        acceptedTypes: ['file', 'source_ref'],
      },
    };

    updateDraftPlan(activeProject.id, (p) => ({
      ...p,
      indicators: [...p.indicators, created],
    }));
    setIndCode('');
    setIndName('');
    setIndDef('');
    notify(`Indicator "${created.code} — ${created.name}" added to draft plan.`, 'info');
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQLabel.trim() || !resolvedQTargetId) return;
    const q: CollectionQuestion = {
      id: `q-${Date.now()}`,
      label: newQLabel.trim(),
      type: newQType,
      required: newQRequired,
      min: newQType === 'whole_number' || newQType === 'decimal' ? Number(newQMin) : undefined,
      max: newQType === 'whole_number' || newQType === 'decimal' ? Number(newQMax) : undefined,
      options:
        newQType === 'choice'
          ? newQOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      indicatorMapping:
        qTargetKind === 'activity' && newQMapIndId
          ? { indicatorId: newQMapIndId, role: newQMapRole }
          : qTargetKind === 'indicator'
          ? { indicatorId: resolvedQTargetId, role: newQMapRole }
          : undefined,
    };

    updateDraftPlan(activeProject.id, (p) => {
      if (qTargetKind === 'activity') {
        return {
          ...p,
          activities: p.activities.map((a) => {
            if (a.id !== resolvedQTargetId) return a;
            const isNumeric = q.type === 'whole_number' || q.type === 'decimal';
            const autoSetQuantityQ =
              a.deliveryCountingMode !== 'count_events' && !a.quantityQuestionId && isNumeric
                ? q.id
                : a.quantityQuestionId;
            return {
              ...a,
              linkedIndicatorId: newQMapIndId || a.linkedIndicatorId,
              quantityQuestionId: autoSetQuantityQ,
              questions: [...a.questions, q],
            };
          }),
        };
      }
      return {
        ...p,
        indicators: p.indicators.map((i) =>
          i.id === resolvedQTargetId ? { ...i, questions: [...i.questions, q] } : i
        ),
      };
    });
    setNewQLabel('');
    notify('Added question to draft collection form. Approve Plan to activate for new records.', 'info');
  };

  const moveQuestion = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= currentQuestions.length) return;
    const reordered = [...currentQuestions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    updateDraftPlan(activeProject.id, (p) => {
      if (qTargetKind === 'activity') {
        return {
          ...p,
          activities: p.activities.map((a) =>
            a.id === resolvedQTargetId ? { ...a, questions: reordered } : a
          ),
        };
      }
      return {
        ...p,
        indicators: p.indicators.map((i) =>
          i.id === resolvedQTargetId ? { ...i, questions: reordered } : i
        ),
      };
    });
  };

  const deleteQuestion = (qId: string) => {
    updateDraftPlan(activeProject.id, (p) => {
      if (qTargetKind === 'activity') {
        return {
          ...p,
          activities: p.activities.map((a) =>
            a.id === resolvedQTargetId
              ? { ...a, questions: a.questions.filter((q) => q.id !== qId) }
              : a
          ),
        };
      }
      return {
        ...p,
        indicators: p.indicators.map((i) =>
          i.id === resolvedQTargetId
            ? { ...i, questions: i.questions.filter((q) => q.id !== qId) }
            : i
        ),
      };
    });
  };

  const handleApprovePlan = () => {
    if (draft.sites.length === 0) {
      notify('Add at least one site in Activities & Sites before approving the Plan.', 'warning');
      setTab('activities_sites');
      return;
    }
    const ver = approveDraftPlan(activeProject.id, approvalNote);
    if (ver) {
      setApprovalNote('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + Plan Version Approval Bar */}
      <div className="bg-white border border-[#E2E6E2] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[#14191F] tracking-tight font-display">
            Plan — Configure {activeProject.name}
          </h1>
          <MetaRow
            items={[
              `Active approved version: ${activeApprovedPlan ? activeApprovedPlan.versionLabel : 'None yet (Draft)'}`,
              `${draft.sites.length} sites`,
              `${draft.activities.length} activities`,
              `${draft.indicators.length} indicators`,
              `${activeProject.planVersions.length} saved plan version(s)`,
            ]}
          />
          <p className="text-xs text-[#525D68]">
            Edits save to your Draft Plan automatically and can be previewed live below. Approving a Plan version activates it for new Do and Measure records while preserving existing records&apos; original questions and issued reports.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {activeProject.planVersions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowVersionHistory((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg border border-[#C5C9C2] text-xs font-semibold text-[#14191F] hover:bg-[#F6F7F5]"
            >
              <History className="w-3.5 h-3.5 text-[#14532D]" />
              Plan Versions ({activeProject.planVersions.length})
            </button>
          )}
          {roleDef.canApprovePlan && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Version note (e.g. Revised H2 target)"
                className="min-h-[40px] bg-[#F6F7F5] border border-[#C5C9C2] rounded-lg px-2.5 py-1.5 text-xs w-48"
              />
              <button
                type="button"
                onClick={handleApprovePlan}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22] whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Plan v{activeProject.planVersions.length + 1}.0
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Plan Version History Drawer */}
      {showVersionHistory && (
        <div className="bg-white border border-[#E2E6E2] rounded-xl p-4 space-y-2.5 text-xs">
          <div className="font-bold text-[#14191F]">Approved Plan Version History</div>
          <div className="divide-y divide-[#E2E6E2]">
            {[...activeProject.planVersions].reverse().map((v) => (
              <div key={v.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-[#14532D]">{v.versionLabel}</span>
                  {v.id === activeProject.activePlanVersionId && (
                    <span className="ml-2 text-[#15803D] font-semibold">Active for new capture</span>
                  )}
                  <div className="text-[#14191F] mt-0.5">{v.changeNote}</div>
                  <div className="text-[#525D68]">
                    Approved {v.approvedAt} by {v.approvedBy} · {v.plan.activities.length} activities · {v.plan.indicators.length} indicators
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7 Guided Setup Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E6E2] pb-2.5">
        {(
          [
            { id: 'details', label: '1. Project & Sources' },
            { id: 'framework', label: '2. Results Framework' },
            { id: 'activities_sites', label: '3. Activities & Sites' },
            { id: 'indicators', label: '4. Indicators' },
            { id: 'baselines_targets', label: '5. Baselines & Targets' },
            { id: 'questions', label: '6. Collection Questions' },
            { id: 'reporting', label: '7. Reporting Rules' },
          ] as { id: PlanTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-[#14532D] text-white'
                : 'text-[#525D68] hover:bg-[#EAECE8] hover:text-[#14191F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Project Details & Source Documents */}
      {tab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-[#14191F]">Project Overview</h2>
            <div className="space-y-1">
              <label className="font-semibold text-[#525D68]">Donor / Funder</label>
              <input
                type="text"
                disabled={!canEdit}
                value={draft.donor}
                onChange={(e) => updateDraftPlan(activeProject.id, (p) => ({ ...p, donor: e.target.value }))}
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] px-3 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#525D68]">Implementing Lead</label>
              <input
                type="text"
                disabled={!canEdit}
                value={draft.implementingLead}
                onChange={(e) =>
                  updateDraftPlan(activeProject.id, (p) => ({ ...p, implementingLead: e.target.value }))
                }
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] px-3 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#525D68]">Timeframe</label>
              <input
                type="text"
                disabled={!canEdit}
                value={draft.timeframe}
                onChange={(e) => updateDraftPlan(activeProject.id, (p) => ({ ...p, timeframe: e.target.value }))}
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] px-3 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#525D68]">Summary</label>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={draft.description}
                onChange={(e) =>
                  updateDraftPlan(activeProject.id, (p) => ({ ...p, description: e.target.value }))
                }
                className="w-full rounded-lg border border-[#C5C9C2] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-[#14191F]">
              Source Documents ({draft.sourceDocuments.length})
            </h2>
            <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
              {draft.sourceDocuments.map((d) => (
                <div key={d.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-[#14191F]">{d.title}</div>
                    <MetaRow
                      items={[
                        d.docType,
                        d.version,
                        d.date,
                        <span key="av" className={d.available ? 'text-[#15803D]' : 'text-[#B91C1C] font-semibold'}>
                          {d.available ? 'Supplied' : 'Missing / Gap'}
                        </span>,
                      ]}
                    />
                    <div className="font-mono text-[11px] text-[#525D68]">{d.reference}</div>
                  </div>
                </div>
              ))}
            </div>

            {canEdit && (
              <form onSubmit={handleAddSourceDoc} className="bg-[#F6F7F5] rounded-lg p-3.5 space-y-2.5">
                <div className="font-semibold text-[#14191F]">Add Source Document Reference</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Document title"
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  />
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as SourceDocument['docType'])}
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  >
                    {['Proposal', 'Logframe', 'Workplan', 'Amendment', 'Survey Instrument', 'Report', 'Register'].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    type="text"
                    value={docVer}
                    onChange={(e) => setDocVer(e.target.value)}
                    placeholder="Version (e.g. v1.0)"
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={docRef}
                    onChange={(e) => setDocRef(e.target.value)}
                    placeholder="Exact file name, tab, or page citation"
                    className="flex-1 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#14532D] text-white font-semibold rounded-md"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Results Framework (Inputs -> Activities -> Outputs -> Outcomes -> Goal + Assumptions & Risks) */}
      {tab === 'framework' && (
        <div className="bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-[#14191F]">
              Results Chain (Inputs → Activities → Outputs → Outcomes → Goal)
            </h2>
            <p className="text-[#525D68] mt-0.5">
              Each level holds linked assumptions and risks that inform reporting and learning.
            </p>
          </div>

          <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
            {draft.framework.map((item) => (
              <div key={item.id} className="p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#14532D]">{item.level} · {item.code}</span>
                  <span className="text-sm font-semibold text-[#14191F]">{item.title}</span>
                </div>
                {item.assumptions.length > 0 && (
                  <div className="text-[#525D68]">
                    <strong className="text-[#14191F]">Assumptions:</strong> {item.assumptions.join(' · ')}
                  </div>
                )}
                {item.risks.length > 0 && (
                  <div className="text-[#B45309]">
                    <strong>Risks:</strong> {item.risks.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <form onSubmit={handleAddFramework} className="bg-[#F6F7F5] rounded-lg p-3.5 space-y-2.5">
              <div className="font-semibold text-[#14191F]">Add Results Framework Level</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={fwLevel}
                  onChange={(e) => setFwLevel(e.target.value as FrameworkLevel)}
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                >
                  {['Input', 'Activity', 'Output', 'Outcome', 'Goal'].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={fwCode}
                  onChange={(e) => setFwCode(e.target.value)}
                  placeholder="Code (e.g. OP2)"
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 font-mono"
                />
                <input
                  type="text"
                  required
                  value={fwTitle}
                  onChange={(e) => setFwTitle(e.target.value)}
                  placeholder="Statement..."
                  className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={fwAssumption}
                  onChange={(e) => setFwAssumption(e.target.value)}
                  placeholder="Linked assumption (optional)"
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                />
                <input
                  type="text"
                  value={fwRisk}
                  onChange={(e) => setFwRisk(e.target.value)}
                  placeholder="Linked risk (optional)"
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                />
              </div>
              <button type="submit" className="px-3.5 py-1.5 bg-[#14532D] text-white font-semibold rounded-md">
                Add Framework Item
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: Activities & Sites */}
      {tab === 'activities_sites' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          {/* Sites */}
          <div className="lg:col-span-5 bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#14191F]">Project Sites ({draft.sites.length})</h2>
            <ul className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
              {draft.sites.map((s) => (
                <li key={s.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[#14191F]">{s.name}</div>
                    <div className="text-[#525D68]">
                      {s.type} · {s.region}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        updateDraftPlan(activeProject.id, (p) => ({
                          ...p,
                          sites: p.sites.filter((x) => x.id !== s.id),
                        }))
                      }
                      aria-label={`Remove ${s.name}`}
                      className="text-[#525D68] hover:text-[#B91C1C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {draft.sites.length === 0 && (
                <li className="p-3 text-[#B45309]">Add at least one site so Do and Measure can select where work happens.</li>
              )}
            </ul>

            {canEdit && (
              <form onSubmit={handleAddSite} className="bg-[#F6F7F5] rounded-lg p-3 space-y-2">
                <div className="font-semibold text-[#14191F]">Add Project Site</div>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Site name (e.g., Moroto Town Council)"
                  className="w-full bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={siteRegion}
                    onChange={(e) => setSiteRegion(e.target.value)}
                    placeholder="Region / Zone"
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  />
                  <select
                    value={siteType}
                    onChange={(e) => setSiteType(e.target.value as SiteConfig['type'])}
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  >
                    {['District', 'Settlement Zone', 'Facility', 'Sub-county', 'Community'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-2 bg-[#14532D] text-white font-semibold rounded-md">
                  Add Site
                </button>
              </form>
            )}
          </div>

          {/* Planned Activities */}
          <div className="lg:col-span-7 bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#14191F]">Planned Activities ({draft.activities.length})</h2>
            <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
              {draft.activities.map((a) => {
                const perLabel =
                  draft.reportingRules.periods.find((p) => p.id === a.periodId)?.label || a.periodId;
                return (
                  <div key={a.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#14191F]">
                        {a.code} — {a.name}
                      </div>
                      <MetaRow
                        items={[
                          `Planned: ${a.expectedQuantity} ${a.unit} (${perLabel})`,
                          a.deliveryCountingMode === 'count_events'
                            ? 'Counting rule: Count approved events'
                            : `Counting rule: Sum quantity in ${a.unit}`,
                          `${a.questions.length} question(s)`,
                          `Evidence: ${a.evidenceRequirement.label}${a.evidenceRequirement.required ? ' (Required)' : ''}`,
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQTargetKind('activity');
                        setQTargetId(a.id);
                        setTab('questions');
                      }}
                      className="shrink-0 px-2.5 py-1.5 rounded-md border border-[#14532D] text-[#14532D] font-semibold hover:bg-[#EBF7EE]"
                    >
                      Edit Questions
                    </button>
                  </div>
                );
              })}
              {draft.activities.length === 0 && (
                <div className="p-4 text-[#525D68]">No planned activities yet. Add your first activity below.</div>
              )}
            </div>

            {canEdit && (
              <form onSubmit={handleAddActivity} className="bg-[#F6F7F5] rounded-lg p-3.5 space-y-2.5">
                <div className="font-semibold text-[#14191F]">Add Planned Activity</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={actName}
                    onChange={(e) => setActName(e.target.value)}
                    placeholder="Activity name (e.g., Screen children for MUAC)"
                    className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  />
                  <select
                    value={actPartMode}
                    onChange={(e) => setActPartMode(e.target.value as typeof actPartMode)}
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  >
                    <option value="none">No participant tracking</option>
                    <option value="aggregate">Aggregate count</option>
                    <option value="registry">Synthetic participant IDs</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={actPeriodId || draft.reportingRules.defaultPeriodId}
                    onChange={(e) => setActPeriodId(e.target.value)}
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  >
                    {draft.reportingRules.periods.map((per) => (
                      <option key={per.id} value={per.id}>
                        Period: {per.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={actCountingMode}
                    onChange={(e) => setActCountingMode(e.target.value as ActivityDeliveryCountingMode)}
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  >
                    <option value="sum_question">Delivery rule: Sum numeric quantity question</option>
                    <option value="count_events">Delivery rule: Count each approved record as 1 event</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={actQty}
                    onChange={(e) => setActQty(e.target.value)}
                    placeholder="Planned quantity"
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 font-mono"
                  />
                  <input
                    type="text"
                    value={actUnit}
                    onChange={(e) => setActUnit(e.target.value)}
                    placeholder="Unit (e.g., sessions, kits)"
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={actEvLabel}
                    onChange={(e) => setActEvLabel(e.target.value)}
                    placeholder="Expected evidence"
                    className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={actEvReq}
                      onChange={(e) => setActEvReq(e.target.checked)}
                      className="accent-[#14532D]"
                    />
                    Evidence required for verification
                  </label>
                  <button type="submit" className="px-4 py-1.5 bg-[#14532D] text-white font-semibold rounded-md">
                    Add Activity
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Indicators */}
      {tab === 'indicators' && (
        <div className="bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-[#14191F]">Configured Indicators ({draft.indicators.length})</h2>
          <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
            {draft.indicators.map((ind) => (
              <div key={ind.id} className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-[#14191F]">
                    <span className="font-mono text-[#14532D] mr-2">{ind.code}</span>
                    {ind.name}
                  </div>
                  <p className="text-[#525D68]">{ind.definition}</p>
                  <MetaRow
                    items={[
                      ind.frameworkLevel,
                      `Unit: ${ind.unit}`,
                      `Input: ${ind.inputMode.replace(/_/g, ' ')}`,
                      `Aggregation: ${ind.aggregationRule.replace(/_/g, ' ')}`,
                      `Method: ${ind.collectionMethod}`,
                      `Owner: ${ind.responsibleRole}`,
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQTargetKind('indicator');
                    setQTargetId(ind.id);
                    setTab('questions');
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-md border border-[#14532D] text-[#14532D] font-semibold hover:bg-[#EBF7EE]"
                >
                  Configure Fields ({ind.questions.length})
                </button>
              </div>
            ))}
          </div>

          {canEdit && (
            <form onSubmit={handleAddIndicator} className="bg-[#F6F7F5] rounded-lg p-4 space-y-3">
              <div className="font-semibold text-[#14191F]">Add Indicator</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={indCode}
                  onChange={(e) => setIndCode(e.target.value)}
                  placeholder="Code (e.g., IND-1)"
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 font-mono"
                />
                <input
                  type="text"
                  required
                  value={indName}
                  onChange={(e) => setIndName(e.target.value)}
                  placeholder="Indicator name"
                  className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                />
                <select
                  value={indLevel}
                  onChange={(e) => setIndLevel(e.target.value as FrameworkLevel)}
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                >
                  {['Output', 'Outcome', 'Goal', 'Activity'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={indInputMode}
                  onChange={(e) => {
                    const m = e.target.value as IndicatorDefinition['inputMode'];
                    setIndInputMode(m);
                    if (m === 'ratio_numerator_denominator') {
                      setIndUnit('%');
                      setIndAggRule('combined_rate');
                    } else if (m === 'calculated_from_activity') {
                      setIndUnit('count');
                      setIndAggRule('sum');
                    } else {
                      setIndAggRule('latest');
                    }
                  }}
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                >
                  <option value="ratio_numerator_denominator">Numerator / Denominator rate (%)</option>
                  <option value="single_value">Single numeric value</option>
                  <option value="calculated_from_activity">Calculated from Do activity</option>
                  <option value="category">Category observation</option>
                </select>

                <select
                  value={indAggRule}
                  onChange={(e) => setIndAggRule(e.target.value as AggregationRule)}
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                >
                  <option value="combined_rate">Combined rate (sum num ÷ sum den)</option>
                  <option value="sum">Sum across records</option>
                  <option value="cumulative">Cumulative across periods</option>
                  <option value="latest">Latest approved value</option>
                  <option value="average">Average</option>
                  <option value="unique_count">Unique participant count</option>
                </select>

                <input
                  type="text"
                  value={indUnit}
                  onChange={(e) => setIndUnit(e.target.value)}
                  placeholder="Unit (%, children, kits)"
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                />

                <input
                  type="text"
                  value={indMethod}
                  onChange={(e) => setIndMethod(e.target.value)}
                  placeholder="Collection method"
                  className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                />
              </div>

              <input
                type="text"
                value={indDef}
                onChange={(e) => setIndDef(e.target.value)}
                placeholder="Indicator definition..."
                className="w-full bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
              />

              <button type="submit" className="px-4 py-1.5 bg-[#14532D] text-white font-semibold rounded-md">
                Add Indicator
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 5: Baselines & Targets (Supports Missing / N/A + Target Revision Demo!) */}
      {tab === 'baselines_targets' && (
        <div className="bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-[#14191F]">Baselines, Period Targets &amp; Final Targets</h2>
            <p className="text-[#525D68] mt-0.5">
              Edit a target below and click <strong>Approve Plan v{activeProject.planVersions.length + 1}.0</strong> above to demonstrate revising a target while preserving prior plan versions and earlier issued reports.
            </p>
          </div>

          <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
            {draft.indicators.map((ind) => (
              <div key={ind.id} className="p-4 space-y-3">
                <div className="font-bold text-[#14191F]">
                  <span className="font-mono text-[#14532D] mr-2">{ind.code}</span>
                  {ind.name} ({ind.unit})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Baseline */}
                  <div className="bg-[#F6F7F5] rounded-lg p-3 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">Baseline</div>
                    <div className="flex gap-1.5">
                      <select
                        disabled={!canEdit}
                        value={ind.baseline.status}
                        onChange={(e) =>
                          updateDraftPlan(activeProject.id, (p) => ({
                            ...p,
                            indicators: p.indicators.map((x) =>
                              x.id === ind.id
                                ? { ...x, baseline: { ...x.baseline, status: e.target.value as ValueStatus } }
                                : x
                            ),
                          }))
                        }
                        className="bg-white border border-[#C5C9C2] rounded px-2 py-1"
                      >
                        <option value="numeric">Numeric</option>
                        <option value="missing">Missing</option>
                        <option value="not_applicable">N/A</option>
                      </select>
                      {ind.baseline.status === 'numeric' && (
                        <input
                          type="number"
                          step="any"
                          disabled={!canEdit}
                          value={ind.baseline.value ?? ''}
                          onChange={(e) =>
                            updateDraftPlan(activeProject.id, (p) => ({
                              ...p,
                              indicators: p.indicators.map((x) =>
                                x.id === ind.id
                                  ? {
                                      ...x,
                                      baseline: {
                                        ...x.baseline,
                                        value: e.target.value === '' ? null : Number(e.target.value),
                                      },
                                    }
                                  : x
                              ),
                            }))
                          }
                          className="w-24 bg-white border border-[#C5C9C2] rounded px-2 py-1 font-mono"
                        />
                      )}
                    </div>
                    <div className="text-[11px] text-[#525D68]">Source: {ind.baseline.source}</div>
                  </div>

                  {/* Period Target */}
                  <div className="bg-[#F6F7F5] rounded-lg p-3 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">Period Targets</div>
                    {draft.reportingRules.periods.map((per) => {
                      const pt = ind.periodTargets.find((t) => t.periodId === per.id) || {
                        periodId: per.id,
                        status: 'numeric' as ValueStatus,
                        value: null,
                      };
                      return (
                        <div key={per.id} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[#525D68]">{per.label}</span>
                          <div className="flex items-center gap-1">
                            <select
                              disabled={!canEdit}
                              value={pt.status}
                              onChange={(e) =>
                                updateDraftPlan(activeProject.id, (p) => ({
                                  ...p,
                                  indicators: p.indicators.map((x) => {
                                    if (x.id !== ind.id) return x;
                                    const others = x.periodTargets.filter((t) => t.periodId !== per.id);
                                    return {
                                      ...x,
                                      periodTargets: [
                                        ...others,
                                        { ...pt, status: e.target.value as ValueStatus },
                                      ],
                                    };
                                  }),
                                }))
                              }
                              className="bg-white border border-[#C5C9C2] rounded px-1.5 py-0.5 text-[11px]"
                            >
                              <option value="numeric">Val</option>
                              <option value="missing">Missing</option>
                              <option value="not_applicable">N/A</option>
                            </select>
                            {pt.status === 'numeric' && (
                              <input
                                type="number"
                                step="any"
                                disabled={!canEdit}
                                value={pt.value ?? ''}
                                onChange={(e) =>
                                  updateDraftPlan(activeProject.id, (p) => ({
                                    ...p,
                                    indicators: p.indicators.map((x) => {
                                      if (x.id !== ind.id) return x;
                                      const others = x.periodTargets.filter((t) => t.periodId !== per.id);
                                      return {
                                        ...x,
                                        periodTargets: [
                                          ...others,
                                          {
                                            ...pt,
                                            value: e.target.value === '' ? null : Number(e.target.value),
                                          },
                                        ],
                                      };
                                    }),
                                  }))
                                }
                                className="w-20 bg-white border border-[#C5C9C2] rounded px-2 py-0.5 font-mono"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Final Target */}
                  <div className="bg-[#F6F7F5] rounded-lg p-3 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">Final Target</div>
                    <div className="flex gap-1.5">
                      <select
                        disabled={!canEdit}
                        value={ind.finalTarget.status}
                        onChange={(e) =>
                          updateDraftPlan(activeProject.id, (p) => ({
                            ...p,
                            indicators: p.indicators.map((x) =>
                              x.id === ind.id
                                ? { ...x, finalTarget: { ...x.finalTarget, status: e.target.value as ValueStatus } }
                                : x
                            ),
                          }))
                        }
                        className="bg-white border border-[#C5C9C2] rounded px-2 py-1"
                      >
                        <option value="numeric">Numeric</option>
                        <option value="missing">Missing</option>
                        <option value="not_applicable">N/A</option>
                      </select>
                      {ind.finalTarget.status === 'numeric' && (
                        <input
                          type="number"
                          step="any"
                          disabled={!canEdit}
                          value={ind.finalTarget.value ?? ''}
                          onChange={(e) =>
                            updateDraftPlan(activeProject.id, (p) => ({
                              ...p,
                              indicators: p.indicators.map((x) =>
                                x.id === ind.id
                                  ? {
                                      ...x,
                                      finalTarget: {
                                        ...x.finalTarget,
                                        value: e.target.value === '' ? null : Number(e.target.value),
                                      },
                                    }
                                  : x
                              ),
                            }))
                          }
                          className="w-24 bg-white border border-[#C5C9C2] rounded px-2 py-1 font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Collection Questions + Live Draft Form Preview (Matching Visual Guide 1!) */}
      {tab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Question Configurator */}
          <div className="lg:col-span-7 bg-white border border-[#E2E6E2] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#14532D] text-white">
              <div className="text-base font-bold font-display">Plan · Configure collection</div>
              <div className="text-[11px] text-white/80">
                Add, edit, reorder, and map questions to indicators. Preview updates live on the right.
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#14191F]">Configure questions for</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#F0F2EF] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQTargetKind('activity')}
                      className={`py-1.5 rounded-md font-semibold ${
                        qTargetKind === 'activity' ? 'bg-white text-[#14532D] shadow-xs' : 'text-[#525D68]'
                      }`}
                    >
                      Activity (Do)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQTargetKind('indicator')}
                      className={`py-1.5 rounded-md font-semibold ${
                        qTargetKind === 'indicator' ? 'bg-white text-[#14532D] shadow-xs' : 'text-[#525D68]'
                      }`}
                    >
                      Indicator (Measure)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#14191F]">
                    Select {qTargetKind === 'activity' ? 'Activity' : 'Indicator'}
                  </label>
                  <select
                    value={resolvedQTargetId}
                    onChange={(e) => {
                      setQTargetId(e.target.value);
                      setPreviewAnswers({});
                    }}
                    className="w-full min-h-[38px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5 text-xs"
                  >
                    {qTargetKind === 'activity'
                      ? draft.activities.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))
                      : draft.indicators.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.code} — {i.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {/* Existing Questions List with Reorder Controls */}
              <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
                {currentQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[#14191F]">
                        {idx + 1}. {q.label}
                        {q.required && <span className="text-[#B91C1C] ml-1">*</span>}
                      </div>
                      <MetaRow
                        items={[
                          `Type: ${q.type.replace('_', ' ')}`,
                          q.min !== undefined ? `Min ${q.min}` : null,
                          q.max !== undefined ? `Max ${q.max}` : null,
                          q.options ? `Options: ${q.options.join(' / ')}` : null,
                          qTargetKind === 'activity' && activeQTargetActivity?.quantityQuestionId === q.id
                            ? `Delivered quantity field (${activeQTargetActivity.unit})`
                            : null,
                          q.indicatorMapping
                            ? `Feeds indicator (${q.indicatorMapping.role})`
                            : null,
                        ]}
                      />
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        {qTargetKind === 'activity' &&
                          activeQTargetActivity &&
                          activeQTargetActivity.deliveryCountingMode !== 'count_events' &&
                          (q.type === 'whole_number' || q.type === 'decimal') &&
                          activeQTargetActivity.quantityQuestionId !== q.id && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDraftPlan(activeProject.id, (p) => ({
                                  ...p,
                                  activities: p.activities.map((a) =>
                                    a.id === activeQTargetActivity.id ? { ...a, quantityQuestionId: q.id } : a
                                  ),
                                }))
                              }
                              className="px-2 py-1 rounded border border-[#C5E5CD] bg-[#EBF7EE] text-[#14532D] text-[11px] font-semibold"
                            >
                              Use as qty
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Move up"
                          className="p-1.5 rounded border border-[#E2E6E2] disabled:opacity-35"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, 1)}
                          disabled={idx === currentQuestions.length - 1}
                          aria-label="Move down"
                          className="p-1.5 rounded border border-[#E2E6E2] disabled:opacity-35"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.id)}
                          aria-label="Delete question"
                          className="p-1.5 rounded border border-[#E2E6E2] text-[#525D68] hover:text-[#B91C1C]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {currentQuestions.length === 0 && (
                  <div className="p-4 text-[#525D68]">No questions configured on this item yet. Add one below.</div>
                )}
              </div>

              {/* Add Question Form */}
              {canEdit && resolvedQTargetId && (
                <form onSubmit={handleAddQuestion} className="bg-[#F6F7F5] rounded-lg p-4 space-y-3">
                  <div className="font-semibold text-[#14191F]">Add Configurable Question</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={newQLabel}
                      onChange={(e) => setNewQLabel(e.target.value)}
                      placeholder="Question label (e.g., How many kits were issued?)"
                      className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-2"
                    />
                    <select
                      value={newQType}
                      onChange={(e) => setNewQType(e.target.value as QuestionType)}
                      className="bg-white border border-[#C5C9C2] rounded px-2.5 py-2"
                    >
                      <option value="whole_number">Whole number</option>
                      <option value="decimal">Decimal</option>
                      <option value="short_text">Short text</option>
                      <option value="long_text">Long text</option>
                      <option value="yes_no">Yes / No</option>
                      <option value="choice">Choice</option>
                    </select>
                  </div>

                  {(newQType === 'whole_number' || newQType === 'decimal') && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="number"
                        value={newQMin}
                        onChange={(e) => setNewQMin(e.target.value)}
                        placeholder="Min"
                        className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 font-mono"
                      />
                      <input
                        type="number"
                        value={newQMax}
                        onChange={(e) => setNewQMax(e.target.value)}
                        placeholder="Max"
                        className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 font-mono"
                      />
                      {qTargetKind === 'activity' ? (
                        <select
                          value={newQMapIndId}
                          onChange={(e) => setNewQMapIndId(e.target.value)}
                          className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                        >
                          <option value="">Optional: feed calculated indicator...</option>
                          {draft.indicators.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              Feed {ind.code} — {ind.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={newQMapRole}
                          onChange={(e) => setNewQMapRole(e.target.value as IndicatorInputRole)}
                          className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                        >
                          <option value="value">Indicator role: Single value</option>
                          <option value="numerator">Indicator role: Numerator</option>
                          <option value="denominator">Indicator role: Denominator</option>
                          <option value="count">Indicator role: Count</option>
                        </select>
                      )}
                    </div>
                  )}

                  {newQType === 'choice' && (
                    <input
                      type="text"
                      value={newQOptions}
                      onChange={(e) => setNewQOptions(e.target.value)}
                      placeholder="Comma-separated choices (e.g., Functional, Needs repair, Non-functional)"
                      className="w-full bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
                    />
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQRequired}
                        onChange={(e) => setNewQRequired(e.target.checked)}
                        className="accent-[#14532D]"
                      />
                      Required question
                    </label>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-4 py-2 bg-[#14532D] text-white font-semibold rounded-md hover:bg-[#0F3F22]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Draft Configuration
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right: Live Draft Preview (Clarification 1: Preview draft before Plan approval!) */}
          <div className="lg:col-span-5 bg-white border border-[#E2E6E2] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#14532D] text-white flex items-center justify-between">
              <div>
                <div className="text-sm font-bold font-display">
                  Draft Preview · {qTargetKind === 'activity' ? 'Do Form' : 'Measure Form'}
                </div>
                <div className="text-[11px] text-white/80">
                  Interactive preview of how these questions will appear once Plan is approved
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1 text-xs text-[#525D68]">
                <div className="font-semibold text-[#14191F]">
                  {qTargetKind === 'activity'
                    ? activeQTargetActivity?.name || 'No activity selected'
                    : activeQTargetIndicator
                    ? `${activeQTargetIndicator.code} — ${activeQTargetIndicator.name}`
                    : 'No indicator selected'}
                </div>
                <div>Standard Date, Site, and Evidence controls sit around this light-green question block.</div>
              </div>

              <DynamicQuestionBlock
                questions={currentQuestions}
                answers={previewAnswers}
                onChange={(qid, val) => setPreviewAnswers((prev) => ({ ...prev, [qid]: val }))}
                headerNote="Live Draft Preview (approve Plan to activate for new capture)"
              />

              <div className="pt-1 flex items-center justify-between text-xs text-[#525D68]">
                <span>Expected evidence:</span>
                <strong className="text-[#14191F]">
                  {qTargetKind === 'activity'
                    ? activeQTargetActivity?.evidenceRequirement.label || '—'
                    : activeQTargetIndicator?.evidenceRequirement.label || '—'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Reporting Rules */}
      {tab === 'reporting' && (
        <div className="bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-[#14191F]">Reporting Periods, Default Template &amp; Aggregation Rules</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-[#525D68]">Default Report Template</label>
              <select
                disabled={!canEdit}
                value={draft.reportingRules.defaultTemplate}
                onChange={(e) =>
                  updateDraftPlan(activeProject.id, (p) => ({
                    ...p,
                    reportingRules: {
                      ...p.reportingRules,
                      defaultTemplate: e.target.value as typeof p.reportingRules.defaultTemplate,
                    },
                  }))
                }
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-3 py-1.5"
              >
                <option value="Standard Donor Report">Standard Donor Report</option>
                <option value="Programme Progress Brief">Programme Progress Brief</option>
                <option value="Evaluation Handover Summary">Evaluation Handover Summary</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#525D68]">Default Reporting Period</label>
              <select
                disabled={!canEdit}
                value={draft.reportingRules.defaultPeriodId}
                onChange={(e) =>
                  updateDraftPlan(activeProject.id, (p) => ({
                    ...p,
                    reportingRules: { ...p.reportingRules, defaultPeriodId: e.target.value },
                  }))
                }
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-3 py-1.5"
              >
                {draft.reportingRules.periods.map((per) => (
                  <option key={per.id} value={per.id}>
                    {per.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
            {draft.reportingRules.periods.map((per) => (
              <div key={per.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-[#14191F]">{per.label}</span>
                  <span className="ml-2 font-mono text-[#525D68]">
                    {per.startDate} → {per.endDate} (Due {per.dueDate})
                  </span>
                </div>
              </div>
            ))}
          </div>

          {canEdit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPeriodLabel.trim()) return;
                updateDraftPlan(activeProject.id, (p) => ({
                  ...p,
                  reportingRules: {
                    ...p.reportingRules,
                    periods: [
                      ...p.reportingRules.periods,
                      {
                        id: `per-${Date.now()}`,
                        label: newPeriodLabel.trim(),
                        startDate: newPeriodStart,
                        endDate: newPeriodEnd,
                        dueDate: newPeriodDue,
                      },
                    ],
                  },
                }));
                setNewPeriodLabel('');
                notify('Added reporting period to draft plan.', 'info');
              }}
              className="bg-[#F6F7F5] rounded-lg p-3.5 grid grid-cols-1 sm:grid-cols-5 gap-2"
            >
              <input
                type="text"
                required
                value={newPeriodLabel}
                onChange={(e) => setNewPeriodLabel(e.target.value)}
                placeholder="Period label (e.g., Q2 2025)"
                className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5"
              />
              <input
                type="date"
                value={newPeriodStart}
                onChange={(e) => setNewPeriodStart(e.target.value)}
                className="bg-white border border-[#C5C9C2] rounded px-2 py-1.5 font-mono"
              />
              <input
                type="date"
                value={newPeriodEnd}
                onChange={(e) => setNewPeriodEnd(e.target.value)}
                className="bg-white border border-[#C5C9C2] rounded px-2 py-1.5 font-mono"
              />
              <button type="submit" className="bg-[#14532D] text-white font-semibold rounded-md py-1.5">
                Add Period
              </button>
            </form>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveArea('report')}
              className="text-xs font-semibold text-[#14532D] hover:underline"
            >
              Open Report Area →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
