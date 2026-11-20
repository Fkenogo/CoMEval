import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, FilePlus2, FileText, Sparkles } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { Commitment, ProjectDocument } from '../../types/meal';
import { MetaLine, ProvenanceText, SimulatedNotice } from '../shared/StatusText';

export const DocumentsCommitmentsView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    setActiveModule,
    approveCommitmentAndCreateActivity,
    addSimulatedCommitment,
    addDocument,
  } = useMeal();

  const pid = state.activeProjectId;
  const projectDocs = state.documents.filter((d) => d.projectId === pid);
  const projectCommitments = state.commitments.filter((c) => c.projectId === pid);

  const [reviewingCommitment, setReviewingCommitment] = useState<Commitment | null>(null);
  const [actTitle, setActTitle] = useState('');
  const [actPartner, setActPartner] = useState(activeProject.partners[0]);
  const [actOwnerPerson, setActOwnerPerson] = useState('');
  const [actLocation, setActLocation] = useState(activeProject.locations[0]?.name || '');
  const [actDueDate, setActDueDate] = useState('');
  const [actExpectedOutput, setActExpectedOutput] = useState('0');
  const [actOutputUnit, setActOutputUnit] = useState('');
  const [actEvidenceReqs, setActEvidenceReqs] = useState('');

  const [showExtractForm, setShowExtractForm] = useState(false);
  const [extDocId, setExtDocId] = useState(projectDocs[0]?.id || '');
  const [extTitle, setExtTitle] = useState('');
  const [extSection, setExtSection] = useState('');
  const [extPageRow, setExtPageRow] = useState('');
  const [extSector, setExtSector] = useState(activeProject.sectors[0] || '');
  const [extOutput, setExtOutput] = useState('10');
  const [extUnit, setExtUnit] = useState('sessions');

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFile, setNewDocFile] = useState('');
  const [newDocVersion, setNewDocVersion] = useState('v1.0');
  const [newDocType, setNewDocType] = useState<ProjectDocument['docType']>('Proposal / Plan');
  const [newDocSupports, setNewDocSupports] = useState('');
  const [newDocCannot, setNewDocCannot] = useState('');

  const openApprovalForm = (c: Commitment) => {
    setReviewingCommitment(c);
    setActTitle(c.title);
    setActPartner(c.defaultOwnerPartner);
    setActOwnerPerson(
      pid === 'childfund-uganda' ? 'Beatrice Acen (LACODEF M&E Lead)' : 'Daniel Adriko (WVU WASH Officer)'
    );
    setActLocation(c.defaultLocation);
    setActDueDate(c.defaultDueDate);
    setActExpectedOutput(String(c.expectedOutput));
    setActOutputUnit(c.outputUnit);
    setActEvidenceReqs(c.evidenceRequirements.join('\n'));
  };

  const handleConfirmCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingCommitment) return;
    approveCommitmentAndCreateActivity(reviewingCommitment.id, {
      title: actTitle.trim() || reviewingCommitment.title,
      ownerPartner: actPartner,
      ownerPerson: actOwnerPerson.trim() || 'Assigned Field Lead',
      location: actLocation,
      dueDate: actDueDate || reviewingCommitment.defaultDueDate,
      plannedOutput: Number(actExpectedOutput) || reviewingCommitment.expectedOutput,
      outputUnit: actOutputUnit.trim() || reviewingCommitment.outputUnit,
      evidenceRequirements: actEvidenceReqs
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setReviewingCommitment(null);
  };

  const handleCreateSimulatedCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = projectDocs.find((d) => d.id === extDocId) || projectDocs[0];
    if (!doc || !extTitle.trim()) return;
    const count = projectCommitments.length + 1;
    const prefix = pid === 'childfund-uganda' ? 'COM-CF' : 'COM-OM';
    addSimulatedCommitment({
      projectId: pid,
      code: `${prefix}-0${count}`,
      title: extTitle.trim(),
      description: `Extracted commitment linked directly to ${doc.fileName} (${doc.version}).`,
      sector: extSector,
      frameworkNodeId: state.resultsNodes.find((n) => n.projectId === pid)?.id || '',
      sourceCitation: {
        documentId: doc.id,
        documentName: doc.fileName,
        version: doc.version,
        sectionOrTab: extSection.trim() || 'Project Plan Section',
        pageOrRow: extPageRow.trim() || 'Page 1',
        originalAvailable: doc.originalAvailable,
      },
      provenance: 'synthetic',
      extractionMethod: 'simulated_extraction',
      status: 'candidate',
      defaultOwnerPartner: activeProject.partners[0],
      defaultLocation: activeProject.locations[0]?.name || '',
      defaultDueDate: activeProject.reportingCycles[activeProject.reportingCycles.length - 1]?.dueDate || '2023-12-15',
      expectedOutput: Number(extOutput) || 1,
      outputUnit: extUnit.trim() || 'outputs',
      evidenceRequirements: ['Signed completion record', 'Supporting attendance or handover summary'],
      linkedIndicatorId: state.indicators.find((i) => i.projectId === pid)?.id,
    });
    setExtTitle('');
    setExtSection('');
    setExtPageRow('');
    setShowExtractForm(false);
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    addDocument({
      projectId: pid,
      title: newDocTitle.trim(),
      fileName: newDocFile.trim() || `${newDocTitle.trim().replace(/\s+/g, '_')}.pdf`,
      version: newDocVersion.trim() || 'v1.0',
      date: new Date().toISOString().slice(0, 10),
      docType: newDocType,
      provenance: 'synthetic',
      originalAvailable: true,
      supports: newDocSupports.trim() || 'Operational delivery record uploaded during prototype session.',
      cannotEstablish: newDocCannot.trim() || 'Does not independently verify outcome-level change without survey data.',
      summary: `Registered by ${roleMeta.actorName}.`,
      linkedIndicatorIds: [],
      linkedActivityIds: [],
      linkedQuestionIds: [],
    });
    setNewDocTitle('');
    setNewDocFile('');
    setNewDocSupports('');
    setNewDocCannot('');
    setShowAddDoc(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={[activeProject.shortName, 'Lifecycle Stage 1: Source Document → Commitment → Workplan']} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            Project Documents & Commitments
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-3xl">
            Review commitments linked to exact proposal, logframe, and interim report versions, approve them, and turn each commitment into an assigned workplan activity with evidence requirements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!roleMeta.isReadOnly && (
            <>
              <button
                type="button"
                onClick={() => setShowAddDoc((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-[#E2E4E0] rounded-md text-[#14191F] hover:bg-[#F0F1EE]"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Register Document
              </button>
              <button
                type="button"
                onClick={() => setShowExtractForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Extract Commitment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Register New Document Panel */}
      {showAddDoc && (
        <form onSubmit={handleAddDoc} className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#14191F]">Register Project Source Document</h2>
            <SimulatedNotice label="Local metadata registration" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              required
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Document title (e.g. Signed Trainer Contracts Bundle)"
              className="md:col-span-2 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <input
              value={newDocFile}
              onChange={(e) => setNewDocFile(e.target.value)}
              placeholder="File name (.pdf / .xlsx / .docx)"
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <select
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value as ProjectDocument['docType'])}
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            >
              <option>Proposal / Plan</option>
              <option>Logframe / Coverage Workbook</option>
              <option>Interim / Progress Report</option>
              <option>Baseline Report</option>
              <option>Endline & Learning Review</option>
              <option>Survey Instrument</option>
              <option>Field Observation / KII</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={newDocVersion}
              onChange={(e) => setNewDocVersion(e.target.value)}
              placeholder="Version (e.g. v1.2)"
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <input
              value={newDocSupports}
              onChange={(e) => setNewDocSupports(e.target.value)}
              placeholder="What this source supports..."
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <input
              value={newDocCannot}
              onChange={(e) => setNewDocCannot(e.target.value)}
              placeholder="What this source cannot establish..."
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddDoc(false)} className="px-3 py-1.5 text-[#525D68]">
              Cancel
            </button>
            <button type="submit" className="px-3.5 py-1.5 bg-[#1B4D3E] text-white font-medium rounded">
              Save Document
            </button>
          </div>
        </form>
      )}

      {/* Simulated Commitment Extraction Form */}
      {showExtractForm && (
        <form onSubmit={handleCreateSimulatedCommitment} className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#14191F]">Extract Candidate Commitment from Source Document</h2>
            <SimulatedNotice label="Simulated document extraction — human review required" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={extDocId}
              onChange={(e) => setExtDocId(e.target.value)}
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            >
              {projectDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.version})
                </option>
              ))}
            </select>
            <input
              value={extSection}
              onChange={(e) => setExtSection(e.target.value)}
              placeholder="Section or workbook tab (e.g. Result 2 / WASH Tab)"
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <input
              value={extPageRow}
              onChange={(e) => setExtPageRow(e.target.value)}
              placeholder="Exact page / row reference"
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              required
              value={extTitle}
              onChange={(e) => setExtTitle(e.target.value)}
              placeholder="Commitment statement..."
              className="md:col-span-2 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            />
            <select
              value={extSector}
              onChange={(e) => setExtSector(e.target.value)}
              className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
            >
              {activeProject.sectors.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                value={extOutput}
                onChange={(e) => setExtOutput(e.target.value)}
                className="w-20 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-2 font-mono"
              />
              <input
                value={extUnit}
                onChange={(e) => setExtUnit(e.target.value)}
                placeholder="unit"
                className="flex-1 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowExtractForm(false)} className="px-3 py-1.5 text-[#525D68]">
              Cancel
            </button>
            <button type="submit" className="px-3.5 py-1.5 bg-[#1B4D3E] text-white font-medium rounded">
              Add Candidate Commitment
            </button>
          </div>
        </form>
      )}

      {/* Commitment Approval → Workplan Activity Creation Panel */}
      {reviewingCommitment && (
        <form onSubmit={handleConfirmCommitment} className="bg-white border-2 border-[#1B4D3E] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <MetaLine
                items={[
                  <span key="c" className="font-mono font-semibold text-[#1B4D3E]">Approve {reviewingCommitment.code}</span>,
                  `Source: ${reviewingCommitment.sourceCitation.documentName} (${reviewingCommitment.sourceCitation.version})`,
                  reviewingCommitment.sourceCitation.pageOrRow,
                ]}
              />
              <h2 className="mt-1 text-base font-semibold text-[#14191F]">
                Approve Commitment & Assign Workplan Activity
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setReviewingCommitment(null)}
              className="text-[#525D68] hover:text-[#14191F]"
            >
              Cancel
            </button>
          </div>

          <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded p-3 text-[#525D68]">
            <strong className="text-[#14191F]">Source Excerpt: </strong>
            {reviewingCommitment.sourceCitation.quoteOrNote || reviewingCommitment.description}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Workplan Activity Title</span>
              <input
                required
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 text-[#14191F]"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Responsible Partner</span>
              <select
                value={actPartner}
                onChange={(e) => setActPartner(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 text-[#14191F]"
              >
                {activeProject.partners.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Assigned Activity Owner</span>
              <input
                required
                value={actOwnerPerson}
                onChange={(e) => setActOwnerPerson(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 text-[#14191F]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="font-medium text-[#525D68]">Location</span>
                <select
                  value={actLocation}
                  onChange={(e) => setActLocation(e.target.value)}
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 text-[#14191F]"
                >
                  {activeProject.locations.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-[#525D68]">Due Date</span>
                <input
                  type="date"
                  required
                  value={actDueDate}
                  onChange={(e) => setActDueDate(e.target.value)}
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 font-mono text-[#14191F]"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="font-medium text-[#525D68]">Expected Output</span>
                <input
                  type="number"
                  required
                  value={actExpectedOutput}
                  onChange={(e) => setActExpectedOutput(e.target.value)}
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 font-mono text-[#14191F]"
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-[#525D68]">Output Unit</span>
                <input
                  required
                  value={actOutputUnit}
                  onChange={(e) => setActOutputUnit(e.target.value)}
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 text-[#14191F]"
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="font-medium text-[#525D68]">Evidence Requirements (one per line)</span>
              <textarea
                rows={3}
                value={actEvidenceReqs}
                onChange={(e) => setActEvidenceReqs(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2 text-[#14191F]"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReviewingCommitment(null)}
              className="px-3 py-2 text-[#525D68] hover:text-[#14191F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B4D3E] text-white font-medium rounded hover:bg-[#143B2F]"
            >
              Approve Commitment & Create Activity
            </button>
          </div>
        </form>
      )}

      {/* Reviewed Commitments Register */}
      <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#14191F]">
              Commitments Extracted from Source Documents ({projectCommitments.length})
            </h2>
            <p className="text-xs text-[#525D68] mt-0.5">
              Each commitment retains its exact document version, tab/section, and page/row citation before entering the operational workplan.
            </p>
          </div>
          <SimulatedNotice label="Pre-extracted candidates from Drive files" />
        </div>

        <div className="divide-y divide-[#E2E4E0]">
          {projectCommitments.map((c) => {
            const linkedActs = state.activities.filter((a) => c.linkedActivityIds.includes(a.id));
            return (
              <div key={c.id} className="py-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <MetaLine
                    items={[
                      <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{c.code}</span>,
                      c.sector,
                      <ProvenanceText key="p" provenance={c.provenance} />,
                      <span
                        key="st"
                        className={
                          c.status === 'approved'
                            ? 'text-[#15803D] font-semibold'
                            : 'text-[#B45309] font-semibold'
                        }
                      >
                        {c.status === 'approved' ? 'Approved Commitment' : 'Candidate — Awaiting Review'}
                      </span>,
                      c.extractionMethod === 'simulated_extraction' ? 'Simulated Extraction' : 'Manual Source Verification',
                    ]}
                  />
                  <h3 className="text-sm font-semibold text-[#14191F]">{c.title}</h3>
                  <p className="text-xs text-[#525D68] leading-relaxed">{c.description}</p>
                  <div className="text-xs text-[#14191F] bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2">
                    <span className="font-medium text-[#525D68]">Exact Source: </span>
                    <button
                      type="button"
                      onClick={() => openInspector({ type: 'document', id: c.sourceCitation.documentId })}
                      className="font-mono text-[11px] text-[#1B4D3E] hover:underline"
                    >
                      {c.sourceCitation.documentName} ({c.sourceCitation.version}) · {c.sourceCitation.sectionOrTab} · {c.sourceCitation.pageOrRow}
                    </button>
                  </div>
                  <div className="text-xs text-[#525D68]">
                    Expected Output:{' '}
                    <span className="font-mono tabular-nums text-[#14191F]">
                      {c.expectedOutput} {c.outputUnit}
                    </span>{' '}
                    · Evidence Required: {c.evidenceRequirements.join(', ')}
                  </div>
                  {linkedActs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      <span className="text-[#15803D] font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Linked Workplan Activities:
                      </span>
                      {linkedActs.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => openInspector({ type: 'activity', id: a.id })}
                          className="font-mono text-[#1B4D3E] hover:underline"
                        >
                          {a.code} ({a.actualDelivered}/{a.plannedOutput})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {roleMeta.canApproveCommitments ? (
                    <button
                      type="button"
                      onClick={() => openApprovalForm(c)}
                      className="px-3.5 py-2 bg-[#1B4D3E] text-white text-xs font-medium rounded-md hover:bg-[#143B2F] whitespace-nowrap"
                    >
                      {c.status === 'approved' ? 'Create Additional Activity' : 'Approve & Create Activity'}
                    </button>
                  ) : (
                    <span className="text-xs text-[#525D68]">
                      Switch to Manager or Reviewer to approve
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveModule('workplan')}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-[#E2E4E0] rounded-md text-[#14191F] hover:bg-[#F0F1EE] whitespace-nowrap"
                  >
                    Workplan <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Versioned Source Document Repository */}
      <section className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1B4D3E]" />
          <h2 className="text-base font-semibold text-[#14191F]">
            Versioned Project Source Documents ({projectDocs.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                <th className="py-2 pr-4 font-medium">Document & Version</th>
                <th className="py-2 pr-4 font-medium">Type & Provenance</th>
                <th className="py-2 pr-4 font-medium">Availability</th>
                <th className="py-2 pr-4 font-medium">What It Supports</th>
                <th className="py-2 font-medium">What It Cannot Establish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E4E0]">
              {projectDocs.map((d) => (
                <tr key={d.id} className="hover:bg-[#F7F7F5] align-top">
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => openInspector({ type: 'document', id: d.id })}
                      className="text-left font-semibold text-[#14191F] hover:text-[#1B4D3E]"
                    >
                      {d.title}
                    </button>
                    <div className="font-mono text-[11px] text-[#525D68] mt-0.5">
                      {d.fileName} · {d.version} · {d.date}
                    </div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <div className="text-[#14191F]">{d.docType}</div>
                    <ProvenanceText provenance={d.provenance} />
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className={d.originalAvailable ? 'text-[#15803D] font-medium' : 'text-[#B91C1C] font-semibold'}>
                      {d.originalAvailable ? 'Available' : 'Missing Gap'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#14191F] max-w-xs">{d.supports}</td>
                  <td className="py-3 text-[#525D68] max-w-xs">{d.cannotEstablish}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
