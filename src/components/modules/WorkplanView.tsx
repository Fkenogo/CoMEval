import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Edit3, History } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { WorkplanActivity } from '../../types/meal';
import { FilterBar } from '../shared/FilterBar';
import { MetaLine, ProvenanceText } from '../shared/StatusText';

export const WorkplanView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    setActiveModule,
    updateActivityWithRationale,
  } = useMeal();

  const pid = state.activeProjectId;
  const { filters } = state;

  const projectActivities = state.activities.filter((a) => {
    if (a.projectId !== pid) return false;
    if (filters.sector !== 'all' && a.sector !== filters.sector) return false;
    if (filters.partner !== 'all' && a.ownerPartner !== filters.partner) return false;
    if (filters.location !== 'all' && a.location !== filters.location) return false;
    return true;
  });

  const [editing, setEditing] = useState<WorkplanActivity | null>(null);
  const [editDue, setEditDue] = useState('');
  const [editPlanned, setEditPlanned] = useState('');
  const [editPartner, setEditPartner] = useState('');
  const [editStatus, setEditStatus] = useState<WorkplanActivity['status']>('in_progress');
  const [editReason, setEditReason] = useState('');

  const startEdit = (act: WorkplanActivity) => {
    setEditing(act);
    setEditDue(act.currentDueDate);
    setEditPlanned(String(act.plannedOutput));
    setEditPartner(act.ownerPartner);
    setEditStatus(act.status);
    setEditReason('');
  };

  const handleSaveChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editReason.trim()) return;
    updateActivityWithRationale(
      editing.id,
      {
        currentDueDate: editDue,
        plannedOutput: Number(editPlanned) || editing.plannedOutput,
        ownerPartner: editPartner,
        status: editStatus,
      },
      editReason.trim()
    );
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={[activeProject.shortName, 'Lifecycle Stage 2: Assigned Workplan & Planned vs. Actual Delivery']} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            Workplan & Activities
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-3xl">
            Every workplan activity links back to an approved commitment, assigns owner, location, due date, expected output, and evidence requirements, and retains a mandatory reason whenever the plan changes.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveModule('documents')}
            className="px-3 py-2 bg-white border border-[#E2E4E0] rounded-md font-medium text-[#14191F] hover:bg-[#F0F1EE]"
          >
            + From Commitment
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('capture')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B4D3E] text-white rounded-md font-medium hover:bg-[#143B2F]"
          >
            Log Field Delivery <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <FilterBar />

      {/* Edit Activity With Mandatory Change Reason */}
      {editing && (
        <form onSubmit={handleSaveChange} className="bg-white border-2 border-[#1B4D3E] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono font-semibold text-[#1B4D3E]">{editing.code}</span>
              <h2 className="text-sm font-semibold text-[#14191F] mt-0.5">
                Revise Plan & Retain Change Reason — {editing.title}
              </h2>
            </div>
            <button type="button" onClick={() => setEditing(null)} className="text-[#525D68]">
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Current Due Date</span>
              <input
                type="date"
                value={editDue}
                onChange={(e) => setEditDue(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Planned Output ({editing.outputUnit})</span>
              <input
                type="number"
                value={editPlanned}
                onChange={(e) => setEditPlanned(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Responsible Partner</span>
              <select
                value={editPartner}
                onChange={(e) => setEditPartner(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5"
              >
                {activeProject.partners.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Status</span>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as WorkplanActivity['status'])}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-medium text-[#525D68]">Mandatory Reason for Plan Change (retained in audit trail)</span>
            <input
              required
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Explain why schedule, target, owner, or status changed (e.g., PDM district conflict, procurement delay)..."
              className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-[#525D68]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-[#1B4D3E] text-white font-medium rounded">
              Save Revision & Log Reason
            </button>
          </div>
        </form>
      )}

      {/* Activity List */}
      <div className="space-y-4">
        {projectActivities.length === 0 ? (
          <div className="bg-white border border-[#E2E4E0] rounded-lg p-8 text-center text-xs text-[#525D68]">
            No workplan activities match the active filters.
          </div>
        ) : (
          projectActivities.map((act) => {
            const commitment = state.commitments.find((c) => c.id === act.commitmentId);
            const linkedInd = state.indicators.find((i) => i.id === act.linkedIndicatorId);
            const pct = act.plannedOutput > 0 ? Math.min(100, Math.round((act.actualDelivered / act.plannedOutput) * 100)) : 0;
            const hasDeparture = act.plannedDueDate !== act.currentDueDate || act.changeLog.length > 0;
            const statusColor =
              act.status === 'completed'
                ? 'text-[#15803D]'
                : act.status === 'overdue'
                ? 'text-[#B91C1C]'
                : act.status === 'delayed'
                ? 'text-[#B45309]'
                : 'text-[#1B4D3E]';

            return (
              <article key={act.id} className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <MetaLine
                      items={[
                        <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{act.code}</span>,
                        act.sector,
                        <span key="st" className={`font-semibold uppercase ${statusColor}`}>{act.status.replace('_', ' ')}</span>,
                        <ProvenanceText key="p" provenance={act.provenance} />,
                        hasDeparture ? <span key="d" className="text-[#B45309] font-medium">Plan Departure Recorded</span> : null,
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => openInspector({ type: 'activity', id: act.id })}
                      className="text-left text-base font-semibold text-[#14191F] hover:text-[#1B4D3E]"
                    >
                      {act.title}
                    </button>
                    <MetaLine
                      items={[
                        `Owner: ${act.ownerPerson} (${act.ownerPartner})`,
                        `Location: ${act.location}`,
                        <span key="due" className="font-mono">
                          Planned {act.plannedDueDate} → Current {act.currentDueDate}
                        </span>,
                      ]}
                    />
                    {commitment && (
                      <div className="text-xs text-[#525D68]">
                        Source Commitment:{' '}
                        <span className="font-mono text-[#14191F]">{commitment.code}</span> (
                        {commitment.sourceCitation.documentName} · {commitment.sourceCitation.pageOrRow})
                      </div>
                    )}
                  </div>

                  <div className="lg:w-64 shrink-0 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#525D68]">Planned vs. Actual</span>
                      <span className="font-mono tabular-nums font-semibold text-[#14191F]">
                        {act.actualDelivered} / {act.plannedOutput} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[#F0F1EE] rounded overflow-hidden">
                      <div
                        className={`h-full ${act.status === 'overdue' ? 'bg-[#B91C1C]' : 'bg-[#1B4D3E]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#525D68]">{act.outputUnit}</div>
                    <div className="flex items-center gap-2 pt-1">
                      {roleMeta.canEditWorkplan && (
                        <button
                          type="button"
                          onClick={() => startEdit(act)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#14191F] border border-[#E2E4E0] rounded px-2.5 py-1 hover:bg-[#F7F7F5]"
                        >
                          <Edit3 className="w-3 h-3" />
                          Revise Plan
                        </button>
                      )}
                      {roleMeta.canSubmitData && (
                        <button
                          type="button"
                          onClick={() => setActiveModule('capture')}
                          className="text-xs font-medium text-[#1B4D3E] hover:underline"
                        >
                          Log Delivery →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidence Requirements, Linked Indicator & Retained Change Log */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-[#E2E4E0] text-xs">
                  <div className="space-y-1.5">
                    <div className="font-medium text-[#525D68]">
                      Evidence Requirements ({act.attachedEvidenceIds.length}/{act.evidenceRequirements.length} linked)
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#14191F]">
                      {act.evidenceRequirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                    {linkedInd && (
                      <div className="pt-1">
                        Contributes to Indicator:{' '}
                        <button
                          type="button"
                          onClick={() => openInspector({ type: 'indicator', id: linkedInd.id })}
                          className="font-mono text-[#1B4D3E] font-medium hover:underline"
                        >
                          {linkedInd.code} — {linkedInd.title}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {act.changeLog.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-medium text-[#525D68] inline-flex items-center gap-1">
                          <History className="w-3.5 h-3.5" />
                          Retained Plan Change Rationale ({act.changeLog.length})
                        </div>
                        {act.changeLog.map((chg) => (
                          <div key={chg.id} className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2">
                            <div className="font-mono text-[11px] text-[#525D68]">
                              {chg.date} · {chg.field}: {chg.previousValue} → {chg.newValue}
                            </div>
                            <div className="text-[#14191F] mt-0.5">{chg.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {act.issues.filter((i) => !i.resolved).length > 0 && (
                      <div className="space-y-1">
                        {act.issues
                          .filter((i) => !i.resolved)
                          .map((iss) => (
                            <div key={iss.id} className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded px-3 py-2 text-[#991B1B]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">{iss.category}:</span> {iss.description}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
