import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FilePlus2,
  FileText,
  Link2,
  MessageSquarePlus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import {
  CitedBrief,
  generateDeterministicCitedBrief,
  resolveKnowledgeGraph,
} from '../../lib/mealEngine';
import { ProjectDocument, ProvenanceType } from '../../types/meal';
import {
  ApprovalText,
  MetaLine,
  ProvenanceText,
  SimulatedNotice,
  VerificationText,
} from '../shared/StatusText';

type KnowledgeTab = 'search' | 'trail' | 'library' | 'learning';

export const KnowledgeLearningView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    setActiveModule,
    addDocument,
    addLearningEntry,
    toggleLearningInReport,
  } = useMeal();

  const pid = state.activeProjectId;

  const projectDocs = useMemo(() => state.documents.filter((d) => d.projectId === pid), [state.documents, pid]);
  const projectCommitments = useMemo(() => state.commitments.filter((c) => c.projectId === pid), [state.commitments, pid]);
  const projectActivities = useMemo(() => state.activities.filter((a) => a.projectId === pid), [state.activities, pid]);
  const projectIndicators = useMemo(() => state.indicators.filter((i) => i.projectId === pid), [state.indicators, pid]);
  const projectObservations = useMemo(() => state.observations.filter((o) => o.projectId === pid), [state.observations, pid]);
  const projectQuestions = useMemo(() => state.evaluationQuestions.filter((q) => q.projectId === pid), [state.evaluationQuestions, pid]);
  const projectActions = useMemo(() => state.correctiveActions.filter((a) => a.projectId === pid), [state.correctiveActions, pid]);
  const projectFindings = useMemo(() => state.evaluatorFindings.filter((f) => f.projectId === pid), [state.evaluatorFindings, pid]);
  const projectLearning = useMemo(() => state.learningEntries.filter((l) => l.projectId === pid), [state.learningEntries, pid]);

  const [tab, setTab] = useState<KnowledgeTab>('trail');
  const [query, setQuery] = useState('');

  // Cross-entity trail target state
  const defaultTargetId =
    pid === 'omugo-wvu'
      ? projectIndicators.find((i) => i.code === 'OM-3.1.1')?.id || projectIndicators[0]?.id || ''
      : projectIndicators.find((i) => i.code === 'CF-2.1.1')?.id || projectIndicators[0]?.id || '';

  const [trailTargetType, setTrailTargetType] = useState<'indicator' | 'activity' | 'question' | 'document'>('indicator');
  const [trailTargetId, setTrailTargetId] = useState<string>(defaultTargetId);
  const [generatedBrief, setGeneratedBrief] = useState<CitedBrief | null>(null);

  // Sync default trail target if project switched and current id isn't in active project
  const validTargetId = useMemo(() => {
    if (trailTargetType === 'indicator' && projectIndicators.some((i) => i.id === trailTargetId)) return trailTargetId;
    if (trailTargetType === 'activity' && projectActivities.some((a) => a.id === trailTargetId)) return trailTargetId;
    if (trailTargetType === 'question' && projectQuestions.some((q) => q.id === trailTargetId)) return trailTargetId;
    if (trailTargetType === 'document' && projectDocs.some((d) => d.id === trailTargetId)) return trailTargetId;
    if (trailTargetType === 'indicator') return defaultTargetId;
    if (trailTargetType === 'activity') return projectActivities[0]?.id || '';
    if (trailTargetType === 'question') return projectQuestions[0]?.id || '';
    return projectDocs[0]?.id || '';
  }, [trailTargetType, trailTargetId, projectIndicators, projectActivities, projectQuestions, projectDocs, defaultTargetId]);

  const graph = useMemo(
    () => (validTargetId ? resolveKnowledgeGraph(state, trailTargetType, validTargetId) : null),
    [state, trailTargetType, validTargetId]
  );

  // Add Document form state (local metadata registration)
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docType, setDocType] = useState<ProjectDocument['docType']>('Field Observation / KII');
  const [docSupports, setDocSupports] = useState('');
  const [docCannot, setDocCannot] = useState('');
  const [docLinkedInd, setDocLinkedInd] = useState('');

  // Add Learning Entry form state
  const [showLearningForm, setShowLearningForm] = useState(false);
  const [lrnTitle, setLrnTitle] = useState('');
  const [lrnCategory, setLrnCategory] = useState<'Qualitative Finding' | 'Lesson Learned' | 'Community Feedback' | 'Adaptation'>('Lesson Learned');
  const [lrnSector, setLrnSector] = useState(activeProject.sectors[0] || '');
  const [lrnSummary, setLrnSummary] = useState('');
  const [lrnDocId, setLrnDocId] = useState('');
  const [lrnIndId, setLrnIndId] = useState('');

  // Unified search index across project knowledge base
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: {
      kind: string;
      id: string;
      title: string;
      meta: string;
      snippet: string;
      onOpen: () => void;
    }[] = [];

    projectDocs.forEach((d) => {
      if (`${d.title} ${d.fileName} ${d.summary} ${d.supports} ${d.cannotEstablish}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Document',
          id: d.id,
          title: d.title,
          meta: `${d.fileName} · ${d.version} · ${d.originalAvailable ? 'Original supplied' : 'Source gap'}`,
          snippet: d.summary,
          onOpen: () => openInspector({ type: 'document', id: d.id }),
        });
      }
    });

    projectCommitments.forEach((c) => {
      if (`${c.code} ${c.title} ${c.description} ${c.sector} ${c.sourceCitation.documentName}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Commitment',
          id: c.id,
          title: `${c.code} — ${c.title}`,
          meta: `${c.sector} · ${c.status} · ${c.sourceCitation.documentName}`,
          snippet: c.description,
          onOpen: () => setActiveModule('documents'),
        });
      }
    });

    projectActivities.forEach((a) => {
      if (`${a.code} ${a.title} ${a.ownerPartner} ${a.location} ${a.sector}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Workplan Activity',
          id: a.id,
          title: `${a.code} — ${a.title}`,
          meta: `${a.ownerPartner} · ${a.location} · ${a.actualDelivered}/${a.plannedOutput} ${a.outputUnit}`,
          snippet: `Status: ${a.status.replace('_', ' ')} · Due ${a.currentDueDate}`,
          onOpen: () => openInspector({ type: 'activity', id: a.id }),
        });
      }
    });

    projectObservations.forEach((o) => {
      const ind = projectIndicators.find((i) => i.id === o.indicatorId);
      if (`${ind?.code || ''} ${ind?.title || ''} ${o.narrative} ${o.period} ${o.partner} ${o.sourceCitation.documentName}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Result Observation',
          id: o.id,
          title: `${ind?.code || o.indicatorId} (${o.period}) — ${o.reportedValue ?? 'Missing'} ${ind?.unit || ''}`,
          meta: `${o.partner} · ${o.approvalStatus} · ${o.sourceCitation.documentName}`,
          snippet: o.narrative,
          onOpen: () => openInspector({ type: 'observation', id: o.id }),
        });
      }
    });

    projectFindings.forEach((f) => {
      if (`${f.code} ${f.title} ${f.findingText} ${f.recommendation} ${f.sector}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Evaluator Finding',
          id: f.id,
          title: `${f.code} — ${f.title}`,
          meta: `${f.sector} · ${f.sourceCitation.documentName} · ${f.managementStatus}`,
          snippet: f.findingText,
          onOpen: () => setActiveModule('evaluation'),
        });
      }
    });

    projectQuestions.forEach((eq) => {
      if (`${eq.code} ${eq.question} ${eq.remainingGaps} ${eq.sector}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Evaluation Question',
          id: eq.id,
          title: `${eq.code} — ${eq.question}`,
          meta: `${eq.criterion} · ${eq.sector} · ${eq.readiness.replace(/_/g, ' ')}`,
          snippet: eq.remainingGaps,
          onOpen: () => openInspector({ type: 'question', id: eq.id }),
        });
      }
    });

    projectActions.forEach((act) => {
      if (`${act.title} ${act.description} ${act.category} ${act.owner}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Corrective Action',
          id: act.id,
          title: act.title,
          meta: `${act.category} · ${act.status} · Owner: ${act.owner}`,
          snippet: act.description,
          onOpen: () => setActiveModule('checks'),
        });
      }
    });

    projectLearning.forEach((l) => {
      if (`${l.title} ${l.summary} ${l.category} ${l.sector}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'Learning Entry',
          id: l.id,
          title: l.title,
          meta: `${l.category} · ${l.sector} · ${l.date}`,
          snippet: l.summary,
          onOpen: () => setTab('learning'),
        });
      }
    });

    return hits;
  }, [
    query,
    projectDocs,
    projectCommitments,
    projectActivities,
    projectObservations,
    projectIndicators,
    projectFindings,
    projectQuestions,
    projectActions,
    projectLearning,
    openInspector,
    setActiveModule,
  ]);

  const handleGenerateBrief = () => {
    if (!validTargetId) return;
    const briefTargetType = trailTargetType === 'document' ? 'indicator' : trailTargetType;
    const briefTargetId =
      trailTargetType === 'document'
        ? projectDocs.find((d) => d.id === validTargetId)?.linkedIndicatorIds[0] || defaultTargetId
        : validTargetId;
    if (!briefTargetId) return;
    setGeneratedBrief(generateDeterministicCitedBrief(state, briefTargetType, briefTargetId));
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFileName.trim()) return;
    addDocument({
      projectId: pid,
      title: docTitle.trim(),
      fileName: docFileName.trim(),
      version: 'v1.0 (Local Demo)',
      date: new Date().toISOString().slice(0, 10),
      docType,
      provenance: 'synthetic' as ProvenanceType,
      originalAvailable: true,
      supports: docSupports.trim() || 'Supporting evidence registered during prototype session.',
      cannotEstablish: docCannot.trim() || 'Requires independent primary file verification.',
      summary: docSupports.trim() || 'Local metadata attachment registered in session.',
      linkedIndicatorIds: docLinkedInd ? [docLinkedInd] : [],
      linkedActivityIds: [],
      linkedQuestionIds: [],
    });
    setDocTitle('');
    setDocFileName('');
    setDocSupports('');
    setDocCannot('');
    setShowDocForm(false);
  };

  const handleAddLearning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lrnTitle.trim() || !lrnSummary.trim()) return;
    const doc = projectDocs.find((d) => d.id === lrnDocId) || projectDocs[0];
    addLearningEntry({
      projectId: pid,
      date: new Date().toISOString().slice(0, 10),
      category: lrnCategory,
      sector: lrnSector || activeProject.sectors[0],
      title: lrnTitle.trim(),
      summary: lrnSummary.trim(),
      provenance: 'synthetic',
      sourceCitation: doc
        ? {
            documentId: doc.id,
            documentName: doc.fileName,
            version: doc.version,
            sectionOrTab: 'Knowledge Base Learning Log',
            pageOrRow: 'Team Entry',
            originalAvailable: doc.originalAvailable,
          }
        : {
            documentId: 'session-note',
            documentName: 'Programme Learning Session',
            sectionOrTab: 'Team Reflection',
            pageOrRow: 'Logged Entry',
            originalAvailable: false,
          },
      linkedIndicatorIds: lrnIndId ? [lrnIndId] : [],
      linkedActivityIds: [],
      usedInReport: true,
    });
    setLrnTitle('');
    setLrnSummary('');
    setShowLearningForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14191F] tracking-tight font-[var(--font-display)]">
            Project Evidence Knowledge Base & Learning
          </h1>
          <p className="text-sm text-[#525D68] mt-1">
            Search across commitments, workplan delivery, source documents, surveys, evaluator findings, corrective actions, and qualitative learning for {activeProject.shortName}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#525D68] tabular-nums">
          <span>{projectDocs.length} sources</span>
          <span className="text-[#C5C9C2]">·</span>
          <span>{projectDocs.filter((d) => !d.originalAvailable).length} missing file gaps</span>
          <span className="text-[#C5C9C2]">·</span>
          <span>{projectLearning.length} learning entries</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="bg-white border border-[#E2E4E0] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#525D68] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setTab('search');
            }}
            placeholder={
              pid === 'omugo-wvu'
                ? 'Search knowledge base (try: "WASH", "SPHERE", "latrine", "0.3L", "MDD", "reunification")...'
                : 'Search knowledge base (try: "trainer", "contract", "LACODEF", "startup", "adoption", "endline")...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F7F5] border border-[#E2E4E0] rounded-md text-[#14191F] focus:outline-none focus:border-[#1B4D3E]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(pid === 'omugo-wvu'
            ? ['WASH', 'SPHERE', 'latrine', 'MDD']
            : ['trainer', 'contract', 'startup', 'endline']
          ).map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setQuery(chip);
                setTab('search');
              }}
              className="px-2.5 py-1.5 border border-[#E2E4E0] rounded-md text-[#525D68] hover:text-[#14191F] hover:bg-[#F7F7F5]"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E4E0] pb-2">
        {(
          [
            { id: 'trail', label: 'Cross-Entity Trail & Cited Brief' },
            { id: 'search', label: `Search Results${query.trim() ? ` (${searchResults.length})` : ''}` },
            { id: 'library', label: `Evidence Library (${projectDocs.length})` },
            { id: 'learning', label: `Qualitative Learning (${projectLearning.length})` },
          ] as { id: KnowledgeTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.id
                ? 'bg-[#1B4D3E] text-white'
                : 'text-[#525D68] hover:bg-[#F0F1EE] hover:text-[#14191F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Cross-Entity Trail & Cited Brief */}
      {tab === 'trail' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <label className="text-xs text-[#525D68] space-y-1">
                  <span className="font-medium text-[#14191F]">Trace Starting Entity Type</span>
                  <select
                    value={trailTargetType}
                    onChange={(e) => {
                      const nextType = e.target.value as typeof trailTargetType;
                      setTrailTargetType(nextType);
                      setGeneratedBrief(null);
                    }}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-2 text-xs text-[#14191F]"
                  >
                    <option value="indicator">Indicator</option>
                    <option value="activity">Workplan Activity</option>
                    <option value="question">Evaluation Question</option>
                    <option value="document">Source Document</option>
                  </select>
                </label>

                <label className="text-xs text-[#525D68] space-y-1">
                  <span className="font-medium text-[#14191F]">Select Record to Trace</span>
                  <select
                    value={validTargetId}
                    onChange={(e) => {
                      setTrailTargetId(e.target.value);
                      setGeneratedBrief(null);
                    }}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-2 text-xs text-[#14191F]"
                  >
                    {trailTargetType === 'indicator' &&
                      projectIndicators.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.code} — {i.title}
                        </option>
                      ))}
                    {trailTargetType === 'activity' &&
                      projectActivities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.title}
                        </option>
                      ))}
                    {trailTargetType === 'question' &&
                      projectQuestions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.code} — {q.question}
                        </option>
                      ))}
                    {trailTargetType === 'document' &&
                      projectDocs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.version})
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pid === 'omugo-wvu' && (
                  <button
                    type="button"
                    onClick={() => {
                      const washInd = projectIndicators.find((i) => i.code === 'OM-3.1.1');
                      if (washInd) {
                        setTrailTargetType('indicator');
                        setTrailTargetId(washInd.id);
                        setGeneratedBrief(generateDeterministicCitedBrief(state, 'indicator', washInd.id));
                      }
                    }}
                    className="px-3 py-2 text-xs font-medium border border-[#1B4D3E] text-[#1B4D3E] rounded-md hover:bg-[#F7F7F5]"
                  >
                    Open Omugo WASH Trail
                  </button>
                )}
                {pid === 'childfund-uganda' && (
                  <button
                    type="button"
                    onClick={() => {
                      const trnInd = projectIndicators.find((i) => i.code === 'CF-2.1.1');
                      if (trnInd) {
                        setTrailTargetType('indicator');
                        setTrailTargetId(trnInd.id);
                        setGeneratedBrief(generateDeterministicCitedBrief(state, 'indicator', trnInd.id));
                      }
                    }}
                    className="px-3 py-2 text-xs font-medium border border-[#1B4D3E] text-[#1B4D3E] rounded-md hover:bg-[#F7F7F5]"
                  >
                    Open Trainer Contracting Trail
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGenerateBrief}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Cited Brief
                </button>
              </div>
            </div>

            {generatedBrief && (
              <div className="border-t border-[#E2E4E0] pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#14191F]">
                    Cited Evidence Brief — {generatedBrief.heading}
                  </h3>
                  <SimulatedNotice label="Deterministic rule-based brief synthesis (no external LLM)" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md p-3.5 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">1. What Was Committed</div>
                    <ul className="space-y-1 text-[#525D68] list-disc pl-4">
                      {generatedBrief.whatWasCommitted.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md p-3.5 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">2. What Happened (Workplan Delivery)</div>
                    <ul className="space-y-1 text-[#525D68] list-disc pl-4">
                      {generatedBrief.whatHappened.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md p-3.5 space-y-1.5">
                    <div className="font-semibold text-[#14191F]">3. What Supporting Evidence Establishes</div>
                    <ul className="space-y-1 text-[#525D68] list-disc pl-4">
                      {generatedBrief.whatEvidenceSupports.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#FEF3C7]/40 border border-[#F59E0B]/40 rounded-md p-3.5 space-y-1.5">
                    <div className="font-semibold text-[#92400E]">4. Missing, Conflicting, or Open Items</div>
                    <ul className="space-y-1 text-[#78350F] list-disc pl-4">
                      {generatedBrief.missingOrConflicting.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {generatedBrief.citations.length > 0 && (
                  <div className="text-[11px] font-mono text-[#525D68] pt-1">
                    Cited sources: {generatedBrief.citations.join(' · ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {graph && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Linked Commitments & Activities */}
              <div className="bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#14191F]">
                    Commitments & Workplan Delivery ({graph.commitments.length} commitments · {graph.activities.length} activities)
                  </h2>
                  <p className="text-xs text-[#525D68] mt-0.5">
                    Linked plan version, approved commitments, and assigned field delivery.
                  </p>
                </div>

                <div className="divide-y divide-[#E2E4E0]">
                  {graph.commitments.map((c) => (
                    <div key={c.id} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#14191F]">{c.code} — {c.title}</span>
                        <span className="font-mono text-[11px] text-[#1B4D3E]">{c.status}</span>
                      </div>
                      <MetaLine
                        items={[
                          <ProvenanceText key="p" provenance={c.provenance} />,
                          `${c.sourceCitation.documentName} (${c.sourceCitation.sectionOrTab}, ${c.sourceCitation.pageOrRow})`,
                          `Target: ${c.expectedOutput} ${c.outputUnit}`,
                        ]}
                      />
                    </div>
                  ))}
                  {graph.activities.map((a) => (
                    <div key={a.id} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openInspector({ type: 'activity', id: a.id })}
                          className="font-semibold text-[#1B4D3E] hover:underline text-left"
                        >
                          {a.code} — {a.title}
                        </button>
                        <span className="font-mono text-[11px] tabular-nums text-[#14191F]">
                          {a.actualDelivered}/{a.plannedOutput} {a.outputUnit}
                        </span>
                      </div>
                      <MetaLine
                        items={[
                          a.ownerPartner,
                          a.location,
                          `Due ${a.currentDueDate}`,
                          a.changeLog.length > 0 ? `${a.changeLog.length} plan change(s)` : null,
                        ]}
                      />
                    </div>
                  ))}
                  {graph.commitments.length === 0 && graph.activities.length === 0 && (
                    <p className="py-3 text-xs text-[#525D68]">No commitments or workplan activities linked yet.</p>
                  )}
                </div>
              </div>

              {/* Linked Observations, Surveys & Sources */}
              <div className="bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#14191F]">
                    Monitoring, Endline Findings & Source Files ({graph.observations.length} observations · {graph.documents.length} sources)
                  </h2>
                  <p className="text-xs text-[#525D68] mt-0.5">
                    Every figure links to exact source tabs/pages and flags unavailable records.
                  </p>
                </div>

                <div className="divide-y divide-[#E2E4E0]">
                  {graph.observations.map((o) => {
                    const ind = projectIndicators.find((i) => i.id === o.indicatorId);
                    return (
                      <div key={o.id} className="py-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => openInspector({ type: 'observation', id: o.id })}
                            className="font-semibold text-[#1B4D3E] hover:underline text-left"
                          >
                            {ind?.code || o.indicatorId} ({o.period}):{' '}
                            <span className="font-mono tabular-nums text-[#14191F]">
                              {o.reportedValue !== null ? `${o.reportedValue} ${ind?.unit || ''}` : 'Missing'}
                            </span>
                          </button>
                          <ApprovalText status={o.approvalStatus} />
                        </div>
                        <MetaLine
                          items={[
                            <ProvenanceText key="p" provenance={o.provenance} />,
                            <VerificationText key="v" status={o.verificationStatus} />,
                            `${o.sourceCitation.documentName} · ${o.sourceCitation.pageOrRow}`,
                          ]}
                        />
                      </div>
                    );
                  })}

                  {graph.documents.map((d) => (
                    <div key={d.id} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openInspector({ type: 'document', id: d.id })}
                          className="font-medium text-[#14191F] hover:text-[#1B4D3E] hover:underline text-left flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0 text-[#525D68]" />
                          {d.title}
                        </button>
                        <span className={`font-mono text-[11px] ${d.originalAvailable ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                          {d.originalAvailable ? 'Supplied' : 'Missing source'}
                        </span>
                      </div>
                      <p className="text-xs text-[#525D68]">
                        <span className="font-medium text-[#14191F]">Establishes:</span> {d.supports}
                      </p>
                      <p className="text-xs text-[#525D68]">
                        <span className="font-medium text-[#B45309]">Cannot establish:</span> {d.cannotEstablish}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Evaluation Questions & Corrective Actions */}
              <div className="lg:col-span-2 bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[#14191F]">
                    Linked Evaluation Questions ({graph.questions.length}) & Corrective Actions ({graph.actions.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveModule('evaluation')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] hover:underline"
                  >
                    Open Evaluation Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {graph.questions.map((q) => (
                      <div key={q.id} className="p-3 bg-[#F7F7F5] border border-[#E2E4E0] rounded-md space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => openInspector({ type: 'question', id: q.id })}
                            className="font-semibold text-[#1B4D3E] hover:underline text-left"
                          >
                            {q.code} ({q.criterion})
                          </button>
                          <span className="font-mono text-[11px] text-[#B45309]">{q.status}</span>
                        </div>
                        <p className="text-xs text-[#14191F]">{q.question}</p>
                        <p className="text-xs text-[#525D68]">Gap: {q.remainingGaps}</p>
                        {q.assignedFollowUpNote && (
                          <p className="text-xs text-[#1B4D3E] font-medium">Assigned follow-up: {q.assignedFollowUpNote}</p>
                        )}
                      </div>
                    ))}
                    {graph.questions.length === 0 && (
                      <p className="text-xs text-[#525D68]">No evaluation questions directly linked to this record.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {graph.actions.map((a) => (
                      <div key={a.id} className="p-3 bg-[#F7F7F5] border border-[#E2E4E0] rounded-md space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#14191F]">{a.title}</span>
                          <span
                            className={`font-mono text-[11px] ${
                              a.status === 'closed' ? 'text-[#15803D]' : 'text-[#B45309]'
                            }`}
                          >
                            {a.status.replace('_', ' ')}
                          </span>
                        </div>
                        <MetaLine items={[a.category, `Owner: ${a.owner}`, `Due ${a.dueDate}`]} />
                        {a.closureEvidenceRef && (
                          <p className="text-xs text-[#15803D]">Closure evidence: {a.closureEvidenceRef}</p>
                        )}
                      </div>
                    ))}
                    {graph.actions.length === 0 && (
                      <p className="text-xs text-[#525D68]">No corrective actions linked to this trail.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Unified Search Results */}
      {tab === 'search' && (
        <div className="bg-white border border-[#E2E4E0] rounded-lg divide-y divide-[#E2E4E0]">
          {!query.trim() ? (
            <div className="p-8 text-center text-sm text-[#525D68]">
              Enter a keyword above (such as an indicator code, partner name, sector, or source filename) to search across the entire project knowledge base.
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#525D68]">
              No matching records found in {activeProject.shortName} for "{query}".
            </div>
          ) : (
            searchResults.map((hit) => (
              <div key={`${hit.kind}-${hit.id}`} className="p-4 flex items-start justify-between gap-4 hover:bg-[#F7F7F5]/60">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[11px] text-[#1B4D3E] font-medium">{hit.kind}</span>
                    <span className="text-[#C5C9C2]">·</span>
                    <span className="text-[#525D68]">{hit.meta}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#14191F]">{hit.title}</div>
                  <p className="text-xs text-[#525D68] line-clamp-2">{hit.snippet}</p>
                </div>
                <button
                  type="button"
                  onClick={hit.onOpen}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1B4D3E] border border-[#E2E4E0] rounded-md bg-white hover:bg-[#F7F7F5]"
                >
                  Inspect <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Evidence Library */}
      {tab === 'library' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SimulatedNotice label="File upload registers metadata locally for prototype traceability" />
            {!roleMeta.isReadOnly && (
              <button
                type="button"
                onClick={() => setShowDocForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F]"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Register Evidence Source
              </button>
            )}
          </div>

          {showDocForm && (
            <form onSubmit={handleAddDocument} className="bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-[#14191F]">Register New Project Source (Metadata Only)</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document title (e.g. Signed Trainer Contracts Bundle)"
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                />
                <input
                  type="text"
                  required
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  placeholder="File name (e.g. Trainer_Contracts_2023.pdf)"
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#14191F]"
                />
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as ProjectDocument['docType'])}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                >
                  <option value="Proposal / Plan">Proposal / Plan</option>
                  <option value="Logframe / Coverage Workbook">Logframe / Coverage Workbook</option>
                  <option value="Interim / Progress Report">Interim / Progress Report</option>
                  <option value="Baseline Report">Baseline Report</option>
                  <option value="Endline & Learning Review">Endline & Learning Review</option>
                  <option value="Survey Instrument">Survey Instrument</option>
                  <option value="Field Observation / KII">Field Observation / KII</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={docSupports}
                  onChange={(e) => setDocSupports(e.target.value)}
                  placeholder="What this source establishes..."
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                />
                <input
                  type="text"
                  value={docCannot}
                  onChange={(e) => setDocCannot(e.target.value)}
                  placeholder="What this source cannot establish..."
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                />
                <select
                  value={docLinkedInd}
                  onChange={(e) => setDocLinkedInd(e.target.value)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                >
                  <option value="">Link to indicator (optional)</option>
                  {projectIndicators.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} — {i.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md">
                  Save to Library
                </button>
                <button
                  type="button"
                  onClick={() => setShowDocForm(false)}
                  className="px-3 py-1.5 text-xs text-[#525D68] hover:text-[#14191F]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#E2E4E0] rounded-lg divide-y divide-[#E2E4E0]">
            {projectDocs.map((doc) => (
              <div key={doc.id} className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {doc.originalAvailable ? (
                        <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-[#14191F]">{doc.title}</h3>
                    </div>
                    <MetaLine
                      className="mt-1"
                      items={[
                        <span key="fn" className="font-mono">{doc.fileName}</span>,
                        doc.version,
                        doc.date,
                        doc.docType,
                        <ProvenanceText key="p" provenance={doc.provenance} />,
                        <span key="av" className={doc.originalAvailable ? 'text-[#15803D] font-medium' : 'text-[#B91C1C] font-semibold'}>
                          {doc.originalAvailable ? 'Original supplied' : 'Unavailable / Source Gap'}
                        </span>,
                      ]}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openInspector({ type: 'document', id: doc.id })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#E2E4E0] rounded-md text-[#1B4D3E] hover:bg-[#F7F7F5]"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Inspect & Trail
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-[#F7F7F5] rounded p-2.5">
                    <span className="font-semibold text-[#14191F]">What it establishes: </span>
                    <span className="text-[#525D68]">{doc.supports}</span>
                  </div>
                  <div className="bg-[#F7F7F5] rounded p-2.5">
                    <span className="font-semibold text-[#B45309]">What it cannot establish: </span>
                    <span className="text-[#525D68]">{doc.cannotEstablish}</span>
                  </div>
                </div>

                {doc.availabilityNote && (
                  <p className="text-xs text-[#B91C1C] font-medium">
                    Gap note: {doc.availabilityNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Qualitative Learning Log */}
      {tab === 'learning' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#525D68]">
              Qualitative findings, lessons learned, community feedback, and adaptations. Entries marked "Included in reports" appear ready to insert in Reports & Exports.
            </p>
            {!roleMeta.isReadOnly && (
              <button
                type="button"
                onClick={() => setShowLearningForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F] shrink-0"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Add Learning Entry
              </button>
            )}
          </div>

          {showLearningForm && (
            <form onSubmit={handleAddLearning} className="bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={lrnTitle}
                  onChange={(e) => setLrnTitle(e.target.value)}
                  placeholder="Learning title"
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                />
                <select
                  value={lrnCategory}
                  onChange={(e) => setLrnCategory(e.target.value as typeof lrnCategory)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                >
                  <option value="Qualitative Finding">Qualitative Finding</option>
                  <option value="Lesson Learned">Lesson Learned</option>
                  <option value="Community Feedback">Community Feedback</option>
                  <option value="Adaptation">Adaptation</option>
                </select>
                <select
                  value={lrnSector}
                  onChange={(e) => setLrnSector(e.target.value)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                >
                  {activeProject.sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                required
                rows={2}
                value={lrnSummary}
                onChange={(e) => setLrnSummary(e.target.value)}
                placeholder="Summarize qualitative evidence, community feedback, or programme adaptation (zero participant PII)..."
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={lrnDocId}
                  onChange={(e) => setLrnDocId(e.target.value)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                >
                  <option value="">Link to source document...</option>
                  {projectDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
                <select
                  value={lrnIndId}
                  onChange={(e) => setLrnIndId(e.target.value)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-2.5 py-1.5 text-xs text-[#14191F]"
                >
                  <option value="">Link to indicator (optional)...</option>
                  {projectIndicators.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} — {i.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md">
                  Save Entry
                </button>
                <button type="button" onClick={() => setShowLearningForm(false)} className="px-3 py-1.5 text-xs text-[#525D68]">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#E2E4E0] rounded-lg divide-y divide-[#E2E4E0]">
            {projectLearning.map((entry) => (
              <div key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#1B4D3E] shrink-0" />
                    <h3 className="text-sm font-semibold text-[#14191F]">{entry.title}</h3>
                  </div>
                  <MetaLine
                    items={[
                      entry.category,
                      entry.sector,
                      entry.date,
                      <ProvenanceText key="p" provenance={entry.provenance} />,
                      `${entry.sourceCitation.documentName} · ${entry.sourceCitation.pageOrRow}`,
                    ]}
                  />
                  <p className="text-xs text-[#525D68] leading-relaxed">{entry.summary}</p>
                </div>

                <label className="shrink-0 flex items-center gap-2 text-xs text-[#14191F] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={entry.usedInReport}
                    onChange={() => toggleLearningInReport(entry.id)}
                    disabled={roleMeta.isReadOnly}
                    className="accent-[#1B4D3E]"
                  />
                  Include in reports
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
