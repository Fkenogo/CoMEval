import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  GitCommitHorizontal,
  Lightbulb,
  Link2,
  Plus,
} from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';
import { EvidenceAttachment, LearningItem } from '../../types/miledge';
import { AttachmentPreviewModal, EvidenceManager } from '../shared/EvidenceAttachments';
import { MetaRow, ProvenanceLabel } from '../shared/StatusLabels';

const KIND_LABELS: Record<LearningItem['kind'], string> = {
  evaluation_finding: 'Evaluation Finding',
  issue: 'Issue',
  risk: 'Risk',
  lesson: 'Lesson',
  assumption: 'Assumption',
};

export const LearnArea: React.FC = () => {
  const {
    state,
    activeProject,
    activeApprovedPlan,
    roleDef,
    addLearningItem,
    updateLearningRecommendation,
    addTrackedAction,
    closeTrackedAction,
  } = useMiledge();

  const plan = activeApprovedPlan?.plan || activeProject.draftPlan;

  const [kindFilter, setKindFilter] = useState<'all' | LearningItem['kind']>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<EvidenceAttachment | null>(null);

  // New learning item state
  const [newKind, setNewKind] = useState<LearningItem['kind']>('evaluation_finding');
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newSourceRef, setNewSourceRef] = useState('');
  const [newRec, setNewRec] = useState('');
  const [newIndependent, setNewIndependent] = useState(true);
  const [newLinkedKey, setNewLinkedKey] = useState(''); // "activity:id" | "measurement:id"

  // Per-item editing states
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [recDraft, setRecDraft] = useState('');

  const [addingActionItemId, setAddingActionItemId] = useState<string | null>(null);
  const [actionOwner, setActionOwner] = useState('');
  const [actionDue, setActionDue] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [actionDesc, setActionDesc] = useState('');

  const [closingActionKey, setClosingActionKey] = useState<string | null>(null); // "itemId:actionId"
  const [closureNote, setClosureNote] = useState('');
  const [closureEvidence, setClosureEvidence] = useState<EvidenceAttachment[]>([]);
  const [closurePlanVerId, setClosurePlanVerId] = useState('');

  const projectItems = useMemo(
    () =>
      state.learningItems
        .filter((l) => l.projectId === activeProject.id)
        .filter((l) => (kindFilter === 'all' ? true : l.kind === kindFilter)),
    [state.learningItems, activeProject.id, kindFilter]
  );

  const projectActs = useMemo(
    () => state.activityRecords.filter((r) => r.projectId === activeProject.id),
    [state.activityRecords, activeProject.id]
  );
  const projectMeas = useMemo(
    () => state.measurementRecords.filter((r) => r.projectId === activeProject.id),
    [state.measurementRecords, activeProject.id]
  );

  const openActionsCount = useMemo(
    () =>
      state.learningItems
        .filter((l) => l.projectId === activeProject.id)
        .reduce((acc, item) => acc + item.actions.filter((a) => a.status === 'open').length, 0),
    [state.learningItems, activeProject.id]
  );
  const closedActionsCount = useMemo(
    () =>
      state.learningItems
        .filter((l) => l.projectId === activeProject.id)
        .reduce((acc, item) => acc + item.actions.filter((a) => a.status === 'closed').length, 0),
    [state.learningItems, activeProject.id]
  );

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;
    let linkedRecordType: 'activity' | 'measurement' | undefined;
    let linkedRecordId: string | undefined;
    let linkedIndicatorId: string | undefined;

    if (newLinkedKey) {
      const [t, id] = newLinkedKey.split(':');
      if (t === 'activity' || t === 'measurement') {
        linkedRecordType = t;
        linkedRecordId = id;
        if (t === 'measurement') {
          const m = projectMeas.find((x) => x.id === id);
          linkedIndicatorId = m?.indicatorId;
        }
      }
    }

    addLearningItem({
      projectId: activeProject.id,
      kind: newKind,
      title: newTitle.trim(),
      summary: newSummary.trim(),
      isIndependentEvaluation: newKind === 'evaluation_finding' ? newIndependent : false,
      linkedRecordType,
      linkedRecordId,
      linkedIndicatorId,
      sourceReference: newSourceRef.trim() || 'Programme review / field follow-up',
      provenance: 'synthetic_demo',
      recommendation: newRec.trim(),
    });

    setNewTitle('');
    setNewSummary('');
    setNewSourceRef('');
    setNewRec('');
    setNewLinkedKey('');
    setShowNewForm(false);
  };

  const handleAddAction = (itemId: string) => {
    if (!actionOwner.trim() || !actionDesc.trim()) return;
    addTrackedAction(itemId, {
      owner: actionOwner.trim(),
      dueDate: actionDue,
      description: actionDesc.trim(),
    });
    setActionOwner('');
    setActionDesc('');
    setAddingActionItemId(null);
  };

  const handleCloseAction = (itemId: string, actionId: string) => {
    if (!closureNote.trim()) return;
    closeTrackedAction(
      itemId,
      actionId,
      closureNote.trim(),
      closureEvidence[0],
      closurePlanVerId || undefined
    );
    setClosureNote('');
    setClosureEvidence([]);
    setClosurePlanVerId('');
    setClosingActionKey(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#E2E6E2] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#14191F] tracking-tight">
            Learn · Findings, Risks &amp; Tracked Actions
          </h1>
          <p className="text-xs text-[#525D68] mt-1">
            Connect independent evaluation findings, risks, assumptions, and lessons directly to Do/Measure records and original evidence, then track corrective actions through closure and plan updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-[#525D68]">Open actions: </span>
            <strong className="font-mono tabular-nums text-[#B45309]">{openActionsCount}</strong>
          </div>
          <div>
            <span className="text-[#525D68]">Closed actions: </span>
            <strong className="font-mono tabular-nums text-[#15803D]">{closedActionsCount}</strong>
          </div>
          {roleDef.canManageLearn && (
            <button
              type="button"
              onClick={() => setShowNewForm((v) => !v)}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#14532D] text-white font-semibold hover:bg-[#0F3F22] inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Log finding / risk / lesson
            </button>
          )}
        </div>
      </div>

      {/* New Finding / Risk / Lesson Form */}
      {showNewForm && roleDef.canManageLearn && (
        <form
          onSubmit={handleCreateItem}
          className="bg-white border border-[#C5E5CD] rounded-xl p-5 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-2.5">
            <h2 className="text-sm font-bold text-[#14532D]">
              New Learning Entry · {activeProject.shortName}
            </h2>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="text-[#525D68] hover:text-[#14191F]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#14191F] mb-1">Entry type</label>
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as LearningItem['kind'])}
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5"
              >
                <option value="evaluation_finding">Evaluation Finding / Question to Investigate</option>
                <option value="issue">Implementation Issue</option>
                <option value="risk">Programme Risk</option>
                <option value="lesson">Lesson Learned</option>
                <option value="assumption">Framework Assumption Check</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#14191F] mb-1">
                Link to existing Do or Measure record (optional)
              </label>
              <select
                value={newLinkedKey}
                onChange={(e) => setNewLinkedKey(e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5"
              >
                <option value="">No specific record linked</option>
                <optgroup label="Activities (Do)">
                  {projectActs.map((a) => (
                    <option key={a.id} value={`activity:${a.id}`}>
                      [DO] {a.activityNameSnapshot} ({a.date}, {a.siteNameSnapshot}, Rev {a.revision})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Measurements (Measure)">
                  {projectMeas.map((m) => (
                    <option key={m.id} value={`measurement:${m.id}`}>
                      [MS] {m.indicatorCodeSnapshot} — {m.indicatorNameSnapshot} ({m.observationDate}, Rev {m.revision})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#14191F] mb-1">Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Dry-season water queue increase at Zone 4 handpump"
              className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium text-[#14191F] mb-1">Finding / observation summary</label>
            <textarea
              rows={3}
              required
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Describe what the evidence shows and what needs follow-up..."
              className="w-full rounded-lg border border-[#C5C9C2] px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#14191F] mb-1">Recommendation</label>
              <input
                type="text"
                value={newRec}
                onChange={(e) => setNewRec(e.target.value)}
                placeholder="Recommended operational or plan adjustment"
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#14191F] mb-1">Source citation</label>
              <input
                type="text"
                value={newSourceRef}
                onChange={(e) => setNewSourceRef(e.target.value)}
                placeholder="e.g. Endline Evaluation Section 4.2 or Field review note"
                className="w-full min-h-[40px] rounded-lg border border-[#C5C9C2] px-3 py-2"
              />
            </div>
          </div>

          {newKind === 'evaluation_finding' && (
            <label className="flex items-center gap-2 cursor-pointer text-[#14191F]">
              <input
                type="checkbox"
                checked={newIndependent}
                onChange={(e) => setNewIndependent(e.target.checked)}
                className="rounded border-[#C5C9C2] accent-[#14532D]"
              />
              <span>Mark as Independent Evaluation Finding (distinct from internal verification)</span>
            </label>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#14532D] text-white font-semibold hover:bg-[#0F3F22]"
            >
              Save learning entry
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="min-h-[40px] px-3 py-2 text-[#525D68]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E6E2] rounded-xl p-2.5 flex flex-wrap items-center gap-1.5 text-xs">
        {(
          [
            { id: 'all', label: 'All entries' },
            { id: 'evaluation_finding', label: 'Evaluation Findings' },
            { id: 'issue', label: 'Issues' },
            { id: 'risk', label: 'Risks' },
            { id: 'lesson', label: 'Lessons' },
            { id: 'assumption', label: 'Assumptions' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setKindFilter(tab.id)}
            className={`min-h-[34px] px-3 py-1 rounded-md font-medium transition-colors ${
              kindFilter === tab.id
                ? 'bg-[#14532D] text-white'
                : 'text-[#525D68] hover:bg-[#F6F7F5] hover:text-[#14191F]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Learning Items List */}
      {projectItems.length === 0 ? (
        <div className="bg-white border border-[#E2E6E2] rounded-xl p-8 text-center text-xs text-[#525D68]">
          No learning entries recorded under this filter for {activeProject.shortName}. Click &ldquo;Log finding / risk / lesson&rdquo; above to add one and assign a tracked action.
        </div>
      ) : (
        <div className="space-y-4">
          {projectItems.map((item) => {
            const linkedAct =
              item.linkedRecordType === 'activity' && item.linkedRecordId
                ? state.activityRecords.find((r) => r.id === item.linkedRecordId)
                : undefined;
            const linkedMeas =
              item.linkedRecordType === 'measurement' && item.linkedRecordId
                ? state.measurementRecords.find((r) => r.id === item.linkedRecordId)
                : undefined;
            const linkedEvidence: EvidenceAttachment[] = linkedAct?.evidence || linkedMeas?.evidence || [];

            return (
              <section
                key={item.id}
                className="bg-white border border-[#E2E6E2] rounded-xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[#E2E6E2] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1">
                    <MetaRow
                      items={[
                        <span key="k" className="font-semibold text-[#14532D]">
                          {KIND_LABELS[item.kind]}
                        </span>,
                        item.isIndependentEvaluation ? (
                          <span key="ind" className="font-semibold text-[#B45309]">
                            Independent Evaluation
                          </span>
                        ) : null,
                        <ProvenanceLabel key="p" provenance={item.provenance} />,
                        `Logged ${item.createdAt} by ${item.createdBy}`,
                      ]}
                    />
                    <h2 className="text-base font-bold text-[#14191F]">{item.title}</h2>
                  </div>
                  <div className="text-xs font-mono text-[#525D68] shrink-0">
                    {item.actions.filter((a) => a.status === 'open').length} open ·{' '}
                    {item.actions.filter((a) => a.status === 'closed').length} closed
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <p className="text-[#14191F] leading-relaxed">{item.summary}</p>
                  <div className="text-[11px] text-[#525D68]">
                    Source reference: <span className="font-mono text-[#14191F]">{item.sourceReference}</span>
                  </div>

                  {/* Linked Record & Original Evidence Trail */}
                  {(linkedAct || linkedMeas) && (
                    <div className="rounded-lg border border-[#C5E5CD] bg-[#EBF7EE] p-3.5 space-y-2">
                      <div className="font-semibold text-[#14532D] flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5" />
                        Linked Original Record &amp; Evidence
                      </div>
                      <div className="text-[#14191F]">
                        {linkedAct && (
                          <span>
                            <strong>[Do] {linkedAct.activityNameSnapshot}</strong> · {linkedAct.date} ·{' '}
                            {linkedAct.siteNameSnapshot} · Plan {linkedAct.planVersionLabel} · Rev {linkedAct.revision}
                          </span>
                        )}
                        {linkedMeas && (
                          <span>
                            <strong>
                              [Measure] {linkedMeas.indicatorCodeSnapshot} {linkedMeas.indicatorNameSnapshot}
                            </strong>{' '}
                            · {linkedMeas.observationDate} · {linkedMeas.siteNameSnapshot} · Plan{' '}
                            {linkedMeas.planVersionLabel} · Rev {linkedMeas.revision}
                          </span>
                        )}
                      </div>
                      {linkedEvidence.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {linkedEvidence.map((att) => (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => setPreviewAtt(att)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-[#C5E5CD] text-[#14532D] font-medium hover:bg-[#F6F7F5]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Open evidence: {att.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#525D68]">
                          Linked record currently has no attached evidence files.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="rounded-lg border border-[#E2E6E2] bg-[#F6F7F5] p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#14191F] flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-[#14532D]" />
                        Recommendation
                      </span>
                      {roleDef.canManageLearn && editingRecId !== item.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecId(item.id);
                            setRecDraft(item.recommendation);
                          }}
                          className="text-[11px] font-semibold text-[#14532D] hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {editingRecId === item.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={recDraft}
                          onChange={(e) => setRecDraft(e.target.value)}
                          className="w-full rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateLearningRecommendation(item.id, recDraft);
                              setEditingRecId(null);
                            }}
                            className="px-3 py-1.5 rounded-md bg-[#14532D] text-white font-semibold"
                          >
                            Save recommendation
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRecId(null)}
                            className="px-2.5 py-1.5 text-[#525D68]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#525D68]">
                        {item.recommendation || 'No recommendation recorded yet.'}
                      </p>
                    )}
                  </div>

                  {/* Tracked Actions */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold uppercase tracking-wide text-[#525D68] flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Tracked Actions ({item.actions.length})
                      </span>
                      {roleDef.canManageLearn && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingActionItemId(addingActionItemId === item.id ? null : item.id);
                            setActionOwner(roleDef.actorName);
                          }}
                          className="inline-flex items-center gap-1 text-[#14532D] font-semibold hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create tracked action
                        </button>
                      )}
                    </div>

                    {addingActionItemId === item.id && (
                      <div className="rounded-lg border border-[#C5E5CD] bg-[#EBF7EE] p-3.5 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-medium text-[#14191F] mb-1">Action owner</label>
                            <input
                              type="text"
                              value={actionOwner}
                              onChange={(e) => setActionOwner(e.target.value)}
                              placeholder="Name or role"
                              className="w-full min-h-[38px] rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-[#14191F] mb-1">Due date</label>
                            <input
                              type="date"
                              value={actionDue}
                              onChange={(e) => setActionDue(e.target.value)}
                              className="w-full min-h-[38px] rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-medium text-[#14191F] mb-1">Action description</label>
                          <textarea
                            rows={2}
                            value={actionDesc}
                            onChange={(e) => setActionDesc(e.target.value)}
                            placeholder="What concrete corrective action or plan update will be delivered?"
                            className="w-full rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddAction(item.id)}
                            className="min-h-[36px] px-3.5 py-1.5 rounded-md bg-[#14532D] text-white font-semibold"
                          >
                            Assign action
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingActionItemId(null)}
                            className="min-h-[36px] px-3 py-1.5 text-[#525D68]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {item.actions.length === 0 ? (
                      <div className="text-[#525D68] text-xs">
                        No tracked actions created from this finding yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg">
                        {item.actions.map((act) => {
                          const closeKey = `${item.id}:${act.id}`;
                          const isClosing = closingActionKey === closeKey;
                          return (
                            <div key={act.id} className="p-3.5 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="font-semibold text-[#14191F]">{act.description}</div>
                                  <MetaRow
                                    items={[
                                      <span
                                        key="st"
                                        className={
                                          act.status === 'closed'
                                            ? 'font-semibold text-[#15803D]'
                                            : 'font-semibold text-[#B45309]'
                                        }
                                      >
                                        {act.status === 'closed' ? 'Closed' : 'Open'}
                                      </span>,
                                      `Owner: ${act.owner}`,
                                      `Due: ${act.dueDate}`,
                                      act.closedAt ? `Closed: ${act.closedAt}` : null,
                                    ]}
                                  />
                                </div>
                                {act.status === 'open' && roleDef.canManageLearn && !isClosing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setClosingActionKey(closeKey);
                                      setClosureNote('');
                                      setClosureEvidence([]);
                                      setClosurePlanVerId('');
                                    }}
                                    className="min-h-[36px] px-3 py-1.5 rounded-md border border-[#14532D] text-[#14532D] font-semibold hover:bg-[#EBF7EE] shrink-0"
                                  >
                                    Record closure
                                  </button>
                                )}
                              </div>

                              {/* Closed details */}
                              {act.status === 'closed' && (
                                <div className="rounded-md bg-[#F6F7F5] border border-[#E2E6E2] p-2.5 space-y-1.5 text-[11px]">
                                  <div className="flex items-center gap-1.5 text-[#15803D] font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Closure recorded: {act.closureNote}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    {act.closureEvidence && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewAtt(act.closureEvidence!)}
                                        className="inline-flex items-center gap-1 text-[#14532D] font-semibold hover:underline"
                                      >
                                        <Eye className="w-3 h-3" />
                                        Open closure evidence: {act.closureEvidence.name}
                                      </button>
                                    )}
                                    {act.linkedPlanVersionLabel && (
                                      <span className="inline-flex items-center gap-1 font-mono text-[#14532D]">
                                        <GitCommitHorizontal className="w-3.5 h-3.5" />
                                        Resulting Plan change: {act.linkedPlanVersionLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Inline Close Action form */}
                              {isClosing && (
                                <div className="rounded-lg border border-[#C5E5CD] bg-[#EBF7EE] p-3.5 space-y-3">
                                  <div className="font-semibold text-[#14532D]">
                                    Close Tracked Action with Evidence &amp; Optional Plan Change
                                  </div>
                                  <div>
                                    <label className="block font-medium text-[#14191F] mb-1">Closure note</label>
                                    <textarea
                                      rows={2}
                                      value={closureNote}
                                      onChange={(e) => setClosureNote(e.target.value)}
                                      placeholder="Describe what was completed to close this action..."
                                      className="w-full rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                                    />
                                  </div>

                                  <EvidenceManager
                                    buttonLabel="Attach closure evidence (file or source ref)"
                                    attachments={closureEvidence}
                                    sourceDocuments={plan.sourceDocuments}
                                    actorName={roleDef.actorName}
                                    onAdd={(att) => setClosureEvidence([att])}
                                    onRemove={() => setClosureEvidence([])}
                                  />

                                  <div>
                                    <label className="block font-medium text-[#14191F] mb-1">
                                      Link resulting Plan version change (optional)
                                    </label>
                                    <select
                                      value={closurePlanVerId}
                                      onChange={(e) => setClosurePlanVerId(e.target.value)}
                                      className="w-full min-h-[38px] rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5"
                                    >
                                      <option value="">No plan version change linked</option>
                                      {activeProject.planVersions.map((v) => (
                                        <option key={v.id} value={v.id}>
                                          Plan {v.versionLabel} — {v.changeNote}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleCloseAction(item.id, act.id)}
                                      disabled={!closureNote.trim()}
                                      className="min-h-[36px] px-3.5 py-1.5 rounded-md bg-[#14532D] text-white font-semibold disabled:opacity-45"
                                    >
                                      Confirm closure
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setClosingActionKey(null)}
                                      className="min-h-[36px] px-3 py-1.5 text-[#525D68]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </div>
  );
};
