import React, { useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Plus, Upload, AlertTriangle } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeIndicatorState, parseCsvText } from '../../lib/mealEngine';
import { ApprovalStatus, ResultObservation } from '../../types/meal';
import { ApprovalText, MetaLine, ProvenanceText } from '../shared/StatusText';

export const FieldCaptureReportingView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    openInspector,
    logFieldDelivery,
    addRegisterRow,
    upsertObservation,
    importCsvObservations,
  } = useMeal();

  const pid = state.activeProjectId;
  const projectActivities = state.activities.filter((a) => a.projectId === pid);
  const projectIndicators = state.indicators.filter((i) => i.projectId === pid);
  const projectDocs = state.documents.filter((d) => d.projectId === pid);
  const projectRegisters = state.registers.filter((r) => r.projectId === pid);
  const projectObservations = state.observations.filter((o) => o.projectId === pid);

  const [activeTab, setActiveTab] = useState<'field' | 'inbox' | 'register' | 'csv'>('field');

  // Field capture state
  const [selectedActId, setSelectedActId] = useState(projectActivities[0]?.id || '');
  const activeAct = projectActivities.find((a) => a.id === selectedActId) || projectActivities[0];
  const [fldQty, setFldQty] = useState('2');
  const [fldPeriod, setFldPeriod] = useState(
    activeProject.reportingCycles.find((c) => c.status === 'open')?.label ||
      activeProject.reportingCycles[0]?.label ||
      ''
  );
  const [fldLocation, setFldLocation] = useState(activeAct?.location || activeProject.locations[0]?.name || '');
  const [fldDate, setFldDate] = useState(new Date().toISOString().slice(0, 10));
  const [fldNarrative, setFldNarrative] = useState('');
  const [fldDocId, setFldDocId] = useState(projectDocs[0]?.id || '');
  const [fldPageRow, setFldPageRow] = useState('Field Log Sheet · Row 12');
  const [fldEvidenceMissing, setFldEvidenceMissing] = useState(false);
  const [fldIssueText, setFldIssueText] = useState('');
  const [fldIssueCat, setFldIssueCat] = useState<'Delay' | 'Access / Logistics' | 'Evidence Gap' | 'Procurement' | 'Data Variance'>('Evidence Gap');

  // Direct Partner Reporting Form
  const [repIndId, setRepIndId] = useState(projectIndicators[0]?.id || '');
  const [repPeriod, setRepPeriod] = useState(fldPeriod);
  const [repPartner, setRepPartner] = useState(activeProject.partners[0] || '');
  const [repLocation, setRepLocation] = useState(activeProject.locations[0]?.name || '');
  const [repValue, setRepValue] = useState('');
  const [repDenom, setRepDenom] = useState('');
  const [repNarrative, setRepNarrative] = useState('');
  const [repDocId, setRepDocId] = useState(projectDocs[0]?.id || '');
  const [repSection, setRepSection] = useState('Partner Quarterly Return');
  const [repPageRow, setRepPageRow] = useState('Row 18');

  // Register row quick add
  const activeReg = projectRegisters[0];
  const regRows = state.registerRows.filter((r) => r.registerId === activeReg?.id);
  const [regValues, setRegValues] = useState<Record<string, string>>({});
  const [regPartner, setRegPartner] = useState(activeProject.partners[0] || '');
  const [regLocation, setRegLocation] = useState(activeProject.locations[0]?.name || '');
  const [regSourceRef, setRegSourceRef] = useState('Partner Routine Register Entry');

  // 4-Step CSV Import state
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMap, setCsvMap] = useState({
    indicatorCode: 0,
    period: 1,
    partner: 2,
    location: 3,
    value: 4,
    denominator: 5,
    sourceRef: 6,
  });
  const [csvCommitted, setCsvCommitted] = useState(false);

  const linkedInd = activeAct?.linkedIndicatorId
    ? state.indicators.find((i) => i.id === activeAct.linkedIndicatorId)
    : undefined;
  const linkedCalc = linkedInd ? computeIndicatorState(state, linkedInd) : undefined;
  const formulaDependent = linkedInd
    ? state.indicators.find(
        (i) => i.calculationMethod === 'formula' && i.formula?.numeratorIndicatorId === linkedInd.id
      )
    : undefined;
  const formulaCalc = formulaDependent ? computeIndicatorState(state, formulaDependent) : undefined;

  const projectedDraftValue =
    linkedInd && linkedCalc
      ? linkedInd.permitsCumulative
        ? (linkedCalc.draftPreviewValue ?? linkedCalc.approvedValue ?? 0) + (Number(fldQty) || 0)
        : Number(fldQty) || 0
      : null;

  const handleSubmitFieldDelivery = (submitNow: boolean) => {
    if (!activeAct) return;
    logFieldDelivery({
      activityId: activeAct.id,
      period: fldPeriod,
      date: fldDate,
      location: fldLocation || activeAct.location,
      quantityDelivered: Number(fldQty) || 0,
      narrative:
        fldNarrative.trim() ||
        `Field delivery logged for ${activeAct.code} (+${fldQty} ${activeAct.outputUnit}).`,
      evidenceDocId: fldEvidenceMissing ? undefined : fldDocId,
      evidencePageOrRow: fldPageRow,
      evidenceMissing: fldEvidenceMissing,
      issueText: fldIssueText.trim() || undefined,
      issueCategory: fldIssueCat,
      submitNow,
    });
    setFldNarrative('');
    setFldIssueText('');
  };

  const handleSaveDirectReport = (status: ApprovalStatus) => {
    const ind = projectIndicators.find((i) => i.id === repIndId);
    const doc = projectDocs.find((d) => d.id === repDocId) || projectDocs[0];
    if (!ind || !doc) return;
    upsertObservation({
      projectId: pid,
      indicatorId: ind.id,
      period: repPeriod,
      partner: repPartner,
      location: repLocation,
      sector: ind.sector,
      reportedValue: repValue === '' ? null : Number(repValue),
      denominator: repDenom === '' ? null : Number(repDenom),
      unit: ind.unit,
      narrative: repNarrative.trim() || `Partner submission for ${ind.code} (${repPeriod}).`,
      provenance: 'synthetic',
      sourceCitation: {
        documentId: doc.id,
        documentName: doc.fileName,
        version: doc.version,
        sectionOrTab: repSection,
        pageOrRow: repPageRow,
        originalAvailable: doc.originalAvailable,
      },
      approvalStatus: status,
      verificationStatus: 'unverified',
    });
    setRepValue('');
    setRepNarrative('');
  };

  const handleAddRegisterEntry = (status: ApprovalStatus) => {
    if (!activeReg) return;
    const cleaned: Record<string, string | number> = {};
    for (const col of activeReg.columns) {
      const raw = regValues[col.key] ?? (col.type === 'select' ? col.options?.[0] || '' : col.type === 'number' ? '1' : '');
      cleaned[col.key] = col.type === 'number' ? Number(raw) || 0 : raw;
    }
    addRegisterRow({
      projectId: pid,
      registerId: activeReg.id,
      period: fldPeriod,
      partner: regPartner,
      location: regLocation,
      approvalStatus: status,
      provenance: 'synthetic',
      values: cleaned,
      sourceRef: regSourceRef,
    });
    setRegValues({});
  };

  const loadSampleCsv = () => {
    const sample =
      pid === 'childfund-uganda'
        ? `indicator_code,period,partner,location,value,denominator,source_reference\nCF-OP1.3,H1 2023 (Interim),PfCW (Soroti / Teso),Serere,12,12,PfCW_Q2_Trainers_Updated.csv Row 2\nCF-OP2.4,H1 2023 (Interim),LACODEF (Lango / Dokolo),Dokolo,340,400,LACODEF_YouthKits_Jul2023.csv Row 3\nUNKNOWN-99,H1 2023 (Interim),PfCW (Soroti / Teso),Katakwi,abc,,Bad_Row_Example`
        : `indicator_code,period,partner,location,value,denominator,source_reference\nOM-3.2.2,Endline Aug 2018,World Vision Uganda Field Team,Omugo CFS (Zone 1–3),81,185,Omugo_CFS_Followup_Check.csv Row 2\nOM-2.1.0,Endline Aug 2018,World Vision Uganda Field Team,Omugo Refugee Villages,210,400,Omugo_Cash_Topup.csv Row 3\nINVALID-CODE,Endline Aug 2018,World Vision Uganda Field Team,Omugo CFS (Zone 1–3),not_a_number,,Invalid_Row`;
    const parsed = parseCsvText(sample);
    setCsvFileName(pid === 'childfund-uganda' ? 'PfCW_LACODEF_H1_2023_Upload.csv' : 'Omugo_WASH_Verification_Upload.csv');
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    setCsvMap({ indicatorCode: 0, period: 1, partner: 2, location: 3, value: 4, denominator: 5, sourceRef: 6 });
    setCsvCommitted(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCsvText(text);
      setCsvFileName(file.name);
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      setCsvCommitted(false);
    };
    reader.readAsText(file);
  };

  const validatedCsvRows = csvRows.map((row, idx) => {
    const code = row[csvMap.indicatorCode]?.trim() || '';
    const period = row[csvMap.period]?.trim() || fldPeriod;
    const partner = row[csvMap.partner]?.trim() || activeProject.partners[0];
    const location = row[csvMap.location]?.trim() || activeProject.locations[0]?.name || '';
    const rawVal = row[csvMap.value]?.trim() || '';
    const numVal = Number(rawVal);
    const rawDen = row[csvMap.denominator]?.trim() || '';
    const numDen = rawDen === '' ? null : Number(rawDen);
    const sourceRef = row[csvMap.sourceRef]?.trim() || '';

    const matchedInd = projectIndicators.find((i) => i.code.toLowerCase() === code.toLowerCase());
    const errors: string[] = [];
    if (!matchedInd) errors.push(`Unknown indicator code "${code}" for ${activeProject.shortName}`);
    if (rawVal === '' || Number.isNaN(numVal)) errors.push(`Non-numeric value "${rawVal}"`);
    if (matchedInd?.unit === '%' && (numDen === null || Number.isNaN(numDen))) {
      errors.push('Missing denominator for percentage indicator');
    }
    return {
      rowNumber: idx + 2,
      code,
      matchedInd,
      period,
      partner,
      location,
      numVal,
      numDen,
      sourceRef,
      errors,
      valid: errors.length === 0,
    };
  });

  const handleCommitCsv = () => {
    const valid = validatedCsvRows.filter((r) => r.valid && r.matchedInd);
    if (valid.length === 0) return;
    importCsvObservations(
      valid.map((r) => ({
        projectId: pid,
        indicatorId: r.matchedInd!.id,
        period: r.period,
        partner: r.partner,
        location: r.location,
        sector: r.matchedInd!.sector,
        reportedValue: r.numVal,
        denominator: r.numDen,
        unit: r.matchedInd!.unit,
        narrative: `Imported via CSV (${csvFileName}, Row ${r.rowNumber}).`,
        provenance: 'synthetic',
        sourceCitation: {
          documentId: projectDocs[0]?.id || 'csv-import',
          documentName: csvFileName,
          sectionOrTab: 'CSV Batch Upload',
          pageOrRow: `Row ${r.rowNumber} (${r.sourceRef || 'Partner CSV'})`,
          originalAvailable: true,
        },
        approvalStatus: 'submitted',
        verificationStatus: 'unverified',
        importedFromCsv: { fileName: csvFileName, rowNumber: r.rowNumber },
      }))
    );
    setCsvCommitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <MetaLine items={[activeProject.shortName, 'Lifecycle Stage 3: Field Delivery, Routine Registers & CSV Reporting']} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#14191F]">
            Field Capture & Partner Reporting
          </h1>
          <p className="mt-1 text-sm text-[#525D68] max-w-3xl">
            Record field activity delivery, log delays or missing evidence, maintain routine registers, or import validated CSV batches. Draft changes update calculation previews immediately while keeping issued donor reports anchored to the last approved value.
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F0F1EE] rounded-lg w-fit">
        {(
          [
            { id: 'field', label: 'Field Activity Capture' },
            { id: 'inbox', label: 'Partner Reporting Inbox' },
            { id: 'register', label: activeReg ? activeReg.name.split('(')[0].trim() : 'Routine Register' },
            { id: 'csv', label: 'CSV Import Wizard' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === t.id ? 'bg-white text-[#14191F] shadow-sm' : 'text-[#525D68] hover:text-[#14191F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!roleMeta.canSubmitData && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 text-xs text-[#92400E]">
          You are viewing as <strong>{roleMeta.label}</strong> (read-only for partner data entry). Switch to <strong>Implementing Partner</strong> or <strong>Programme Manager</strong> in the top bar to save drafts or submit records.
        </div>
      )}

      {/* TAB 1: FIELD-FRIENDLY ACTIVITY CAPTURE + LIVE CALCULATION PREVIEW */}
      {activeTab === 'field' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#14191F]">Field-Friendly Activity Delivery Log</h2>
              <span className="text-[#525D68]">Mobile & desktop capture</span>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="font-medium text-[#525D68]">Assigned Workplan Activity</span>
                <select
                  value={activeAct?.id || ''}
                  onChange={(e) => {
                    setSelectedActId(e.target.value);
                    const found = projectActivities.find((a) => a.id === e.target.value);
                    if (found) setFldLocation(found.location);
                  }}
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-3 py-2.5 text-sm text-[#14191F]"
                >
                  {projectActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.title} ({a.actualDelivered}/{a.plannedOutput} {a.outputUnit})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Quantity Delivered ({activeAct?.outputUnit})</span>
                  <input
                    type="number"
                    min="0"
                    value={fldQty}
                    onChange={(e) => setFldQty(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-3 py-2.5 text-sm font-mono tabular-nums"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Reporting Period</span>
                  <select
                    value={fldPeriod}
                    onChange={(e) => setFldPeriod(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-3 py-2.5 text-xs"
                  >
                    {activeProject.reportingCycles.map((c) => (
                      <option key={c.id} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Location</span>
                  <select
                    value={fldLocation}
                    onChange={(e) => setFldLocation(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-3 py-2.5 text-xs"
                  >
                    {activeProject.locations.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-medium text-[#525D68]">Delivery Notes & Field Context</span>
                <textarea
                  rows={2}
                  value={fldNarrative}
                  onChange={(e) => setFldNarrative(e.target.value)}
                  placeholder="Summarize what was delivered, attendance breakdown (aggregate only), or community feedback..."
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded-md px-3 py-2"
                />
              </label>

              {/* Supporting Evidence Link or Missing Evidence Flag */}
              <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#14191F]">Supporting Evidence Link</span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#B91C1C]">
                    <input
                      type="checkbox"
                      checked={fldEvidenceMissing}
                      onChange={(e) => setFldEvidenceMissing(e.target.checked)}
                    />
                    Primary evidence not yet attached (flags Missing Evidence check)
                  </label>
                </div>
                {!fldEvidenceMissing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={fldDocId}
                      onChange={(e) => setFldDocId(e.target.value)}
                      className="bg-white border border-[#E2E4E0] rounded px-2.5 py-2"
                    >
                      {projectDocs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.version})
                        </option>
                      ))}
                    </select>
                    <input
                      value={fldPageRow}
                      onChange={(e) => setFldPageRow(e.target.value)}
                      placeholder="Exact tab / row / page reference"
                      className="bg-white border border-[#E2E4E0] rounded px-2.5 py-2 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Optional Delay / Field Issue Logger */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={fldIssueCat}
                  onChange={(e) => setFldIssueCat(e.target.value as typeof fldIssueCat)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
                >
                  <option>Evidence Gap</option>
                  <option>Delay</option>
                  <option>Access / Logistics</option>
                  <option>Procurement</option>
                  <option>Data Variance</option>
                </select>
                <input
                  value={fldIssueText}
                  onChange={(e) => setFldIssueText(e.target.value)}
                  placeholder="Optional: Log a field delay or issue (feeds Checks & Actions)..."
                  className="sm:col-span-2 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <span className="font-mono text-[11px] text-[#525D68]">Date: {fldDate}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!roleMeta.canSubmitData}
                    onClick={() => handleSubmitFieldDelivery(false)}
                    className="px-3.5 py-2 bg-white border border-[#1B4D3E] text-[#1B4D3E] font-medium rounded-md hover:bg-[#F0F1EE] disabled:opacity-40"
                  >
                    Save Draft (Preview Only)
                  </button>
                  <button
                    type="button"
                    disabled={!roleMeta.canSubmitData}
                    onClick={() => handleSubmitFieldDelivery(true)}
                    className="px-4 py-2 bg-[#1B4D3E] text-white font-medium rounded-md hover:bg-[#143B2F] disabled:opacity-40"
                  >
                    Submit Delivery for Review
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: LIVE INDICATOR CONTRIBUTION & DRAFT VS APPROVED PREVIEW */}
          <aside className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-3 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#525D68]">
                Live Calculation Contribution Preview
              </div>
              {linkedInd && linkedCalc ? (
                <>
                  <button
                    type="button"
                    onClick={() => openInspector({ type: 'indicator', id: linkedInd.id })}
                    className="text-left font-semibold text-sm text-[#14191F] hover:text-[#1B4D3E]"
                  >
                    <span className="font-mono text-[#1B4D3E] mr-1.5">{linkedInd.code}</span>
                    {linkedInd.title}
                  </button>

                  <div className="grid grid-cols-2 gap-3 bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-3.5">
                    <div>
                      <div className="text-[11px] text-[#525D68]">Approved Donor Figure</div>
                      <div className="text-lg font-semibold font-mono tabular-nums text-[#14191F] mt-0.5">
                        {linkedCalc.approvedValue ?? 'Missing'} {linkedInd.unit}
                      </div>
                      <div className="text-[10px] text-[#15803D]">Locked in Donor Reports</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#525D68]">With This Draft (+{fldQty || 0})</div>
                      <div className="text-lg font-semibold font-mono tabular-nums text-[#B45309] mt-0.5">
                        {projectedDraftValue ?? '—'} {linkedInd.unit}
                      </div>
                      <div className="text-[10px] text-[#B45309]">Partner Preview Until Approved</div>
                    </div>
                  </div>

                  <div className="text-[#525D68] space-y-1">
                    <div>
                      <strong className="text-[#14191F]">Calculation Rule:</strong>{' '}
                      {linkedInd.calculationMethod === 'register_aggregate'
                        ? `Aggregates rows from linked register (${linkedCalc.registerApprovedCount} approved rows; ${linkedCalc.registerDraftCount} including drafts).`
                        : `Direct period roll-up against target of ${linkedInd.target ?? '—'} ${linkedInd.unit}.`}
                    </div>
                    {formulaDependent && formulaCalc && (
                      <div className="bg-[#F0F1EE] rounded p-2.5 font-mono text-[11px] text-[#14191F]">
                        <div>Downstream Formula ({formulaDependent.code}): {formulaDependent.formula?.expressionLabel}</div>
                        <div className="text-[#525D68] mt-0.5">
                          Approved: {formulaCalc.approvedValue ?? '—'}% · With draft:{' '}
                          {formulaDependent.formula?.denominatorConstant && projectedDraftValue !== null
                            ? `${((projectedDraftValue / formulaDependent.formula.denominatorConstant) * 100).toFixed(1)}%`
                            : '—'}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[#525D68]">Select an activity linked to an indicator to inspect live calculation impact.</p>
              )}
            </div>

            {/* Structured Delivery Log */}
            <div className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-[#14191F]">
                Recent Activity Delivery Records ({state.deliveryRecords.filter((d) => d.projectId === pid).length})
              </h3>
              <div className="divide-y divide-[#E2E4E0]">
                {state.deliveryRecords
                  .filter((d) => d.projectId === pid)
                  .slice(0, 5)
                  .map((del) => {
                    const a = state.activities.find((x) => x.id === del.activityId);
                    return (
                      <div key={del.id} className="py-2.5 space-y-0.5">
                        <MetaLine
                          items={[
                            <span key="c" className="font-mono text-[#1B4D3E]">{a?.code}</span>,
                            <span key="q" className="font-mono font-semibold text-[#14191F]">+{del.quantityDelivered} {del.unit}</span>,
                            <ApprovalText key="s" status={del.approvalStatus} />,
                            del.evidenceMissing ? <span key="m" className="text-[#B91C1C] font-semibold">Evidence Missing</span> : null,
                          ]}
                        />
                        <div className="text-[#525D68]">{del.narrative}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* TAB 2: PARTNER REPORTING INBOX */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
            <h2 className="text-base font-semibold text-[#14191F]">Enter Period Result & Source Reference</h2>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="font-medium text-[#525D68]">Indicator</span>
                <select
                  value={repIndId}
                  onChange={(e) => setRepIndId(e.target.value)}
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
                >
                  {projectIndicators.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} — {i.title} ({i.unit})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Period</span>
                  <select
                    value={repPeriod}
                    onChange={(e) => setRepPeriod(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
                  >
                    {activeProject.reportingCycles.map((c) => (
                      <option key={c.id} value={c.label}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Partner</span>
                  <select
                    value={repPartner}
                    onChange={(e) => setRepPartner(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
                  >
                    {activeProject.partners.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Reported Value</span>
                  <input
                    type="number"
                    step="any"
                    value={repValue}
                    onChange={(e) => setRepValue(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2 font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Denominator (n)</span>
                  <input
                    type="number"
                    step="any"
                    value={repDenom}
                    onChange={(e) => setRepDenom(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2 font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Location</span>
                  <select
                    value={repLocation}
                    onChange={(e) => setRepLocation(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
                  >
                    {activeProject.locations.map((l) => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Source Document</span>
                  <select
                    value={repDocId}
                    onChange={(e) => setRepDocId(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2"
                  >
                    {projectDocs.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-[#525D68]">Page / Tab / Row</span>
                  <input
                    value={repPageRow}
                    onChange={(e) => setRepPageRow(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-2 font-mono"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="font-medium text-[#525D68]">Narrative Explanation</span>
                <textarea
                  rows={2}
                  value={repNarrative}
                  onChange={(e) => setRepNarrative(e.target.value)}
                  placeholder="Context, disaggregation, or clarification note..."
                  className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={!roleMeta.canSubmitData}
                  onClick={() => handleSaveDirectReport('draft')}
                  className="px-3 py-2 bg-white border border-[#1B4D3E] text-[#1B4D3E] font-medium rounded disabled:opacity-40"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={!roleMeta.canSubmitData}
                  onClick={() => handleSaveDirectReport('submitted')}
                  className="px-4 py-2 bg-[#1B4D3E] text-white font-medium rounded disabled:opacity-40"
                >
                  Submit Period
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
            <h2 className="text-base font-semibold text-[#14191F]">
              Reporting Inbox — Active Submissions & Clarification Requests
            </h2>
            <div className="divide-y divide-[#E2E4E0]">
              {projectObservations.map((obs) => {
                const ind = state.indicators.find((i) => i.id === obs.indicatorId);
                return (
                  <div key={obs.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <MetaLine
                        items={[
                          <span key="c" className="font-mono font-semibold text-[#1B4D3E]">{ind?.code}</span>,
                          obs.period,
                          obs.partner,
                          <ApprovalText key="a" status={obs.approvalStatus} />,
                          <ProvenanceText key="p" provenance={obs.provenance} />,
                        ]}
                      />
                      <button
                        type="button"
                        onClick={() => openInspector({ type: 'observation', id: obs.id })}
                        className="text-left font-medium text-[#14191F] hover:text-[#1B4D3E]"
                      >
                        {ind?.title}
                      </button>
                      <div className="text-[#525D68]">
                        Source: {obs.sourceCitation.documentName} · {obs.sourceCitation.pageOrRow}
                      </div>
                      {obs.approvalStatus === 'returned' && obs.reviewerComments.length > 0 && (
                        <div className="text-[#B91C1C] font-medium">
                          Clarification requested: {obs.reviewerComments[obs.reviewerComments.length - 1].text}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="font-semibold text-[#14191F]">
                        {obs.reportedValue ?? 'Missing'} {obs.unit}
                      </div>
                      {obs.approvalStatus === 'draft' && roleMeta.canSubmitData && (
                        <button
                          type="button"
                          onClick={() =>
                            upsertObservation({ ...obs, approvalStatus: 'submitted' } as ResultObservation)
                          }
                          className="mt-1 text-[11px] font-sans text-[#1B4D3E] font-medium hover:underline"
                        >
                          Submit now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURABLE ROUTINE REGISTER */}
      {activeTab === 'register' && activeReg && (
        <div className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#14191F]">{activeReg.name}</h2>
              <p className="text-[#525D68] mt-0.5">{activeReg.description}</p>
            </div>
            {(() => {
              const regInd = state.indicators.find((i) => i.id === activeReg.linkedIndicatorId);
              const regCalc = regInd ? computeIndicatorState(state, regInd) : null;
              return regInd && regCalc ? (
                <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3.5 py-2 font-mono tabular-nums shrink-0">
                  <div className="text-[11px] text-[#525D68]">Linked Indicator {regInd.code}</div>
                  <div className="font-semibold text-[#14191F]">
                    Approved: {regCalc.approvedValue} {regInd.unit}{' '}
                    {regCalc.hasDraftDifference && (
                      <span className="text-[#B45309]">· Draft Preview: {regCalc.draftPreviewValue}</span>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* Add Register Row Form */}
          {roleMeta.canSubmitData && (
            <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-lg p-4 space-y-3">
              <div className="font-semibold text-[#14191F] inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Routine Register Record (De-identified)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {activeReg.columns.map((col) => (
                  <label key={col.key} className="space-y-1">
                    <span className="text-[11px] text-[#525D68]">{col.label}</span>
                    {col.type === 'select' ? (
                      <select
                        value={regValues[col.key] ?? col.options?.[0] ?? ''}
                        onChange={(e) => setRegValues((p) => ({ ...p, [col.key]: e.target.value }))}
                        className="w-full bg-white border border-[#E2E4E0] rounded px-2 py-1.5"
                      >
                        {col.options?.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={col.type}
                        value={regValues[col.key] ?? ''}
                        onChange={(e) => setRegValues((p) => ({ ...p, [col.key]: e.target.value }))}
                        placeholder={col.label}
                        className="w-full bg-white border border-[#E2E4E0] rounded px-2 py-1.5"
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                <select
                  value={regPartner}
                  onChange={(e) => setRegPartner(e.target.value)}
                  className="bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5"
                >
                  {activeProject.partners.map((p) => <option key={p}>{p}</option>)}
                </select>
                <select
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  className="bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5"
                >
                  {activeProject.locations.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
                <input
                  value={regSourceRef}
                  onChange={(e) => setRegSourceRef(e.target.value)}
                  placeholder="Source reference"
                  className="bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 font-mono"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleAddRegisterEntry('draft')}
                    className="px-3 py-1.5 bg-white border border-[#1B4D3E] text-[#1B4D3E] font-medium rounded whitespace-nowrap"
                  >
                    Save Draft Row
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRegisterEntry('submitted')}
                    className="px-3 py-1.5 bg-[#1B4D3E] text-white font-medium rounded whitespace-nowrap"
                  >
                    Submit Row
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Register Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                  {activeReg.columns.map((c) => (
                    <th key={c.key} className="py-2 pr-3 font-medium">{c.label}</th>
                  ))}
                  <th className="py-2 pr-3 font-medium">Partner / Location</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Source Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E4E0]">
                {regRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F7F7F5]">
                    {activeReg.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`py-2.5 pr-3 ${c.type === 'number' || c.key.includes('Code') ? 'font-mono tabular-nums' : ''} ${
                          row.values[c.key] === 'Missing' ? 'text-[#B91C1C] font-semibold' : 'text-[#14191F]'
                        }`}
                      >
                        {String(row.values[c.key] ?? '—')}
                      </td>
                    ))}
                    <td className="py-2.5 pr-3 text-[#525D68]">
                      {row.partner} · {row.location}
                    </td>
                    <td className="py-2.5 pr-3">
                      <ApprovalText status={row.approvalStatus} />
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-[#525D68]">{row.sourceRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 4-STEP CSV IMPORT WITH PREVIEW, MAPPING & VALIDATION */}
      {activeTab === 'csv' && (
        <div className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#14191F]">
                CSV Partner Data Importer (Preview → Map → Validate → Commit)
              </h2>
              <p className="text-[#525D68] mt-0.5">
                Preserves exact uploaded filename and row numbers on every accepted observation. Invalid rows are blocked with clear explanations.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadSampleCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#F7F7F5] border border-[#E2E4E0] rounded-md font-medium text-[#14191F] hover:bg-[#F0F1EE]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Load Sample CSV
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B4D3E] text-white rounded-md font-medium cursor-pointer hover:bg-[#143B2F]">
                <Upload className="w-3.5 h-3.5" />
                Upload .csv File
                <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {csvHeaders.length === 0 ? (
            <div className="border border-dashed border-[#CBD5E1] rounded-lg p-8 text-center text-[#525D68]">
              Upload a CSV file or click <strong>Load Sample CSV</strong> above to preview column mapping and row-level validation.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-3.5 py-2">
                <span className="font-mono font-semibold text-[#14191F]">{csvFileName}</span>
                <MetaLine
                  items={[
                    `${csvRows.length} data rows`,
                    <span key="ok" className="text-[#15803D] font-semibold">
                      {validatedCsvRows.filter((r) => r.valid).length} valid
                    </span>,
                    <span key="err" className="text-[#B91C1C] font-semibold">
                      {validatedCsvRows.filter((r) => !r.valid).length} error(s)
                    </span>,
                  ]}
                />
              </div>

              {/* Column Mapping */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {(
                  [
                    ['indicatorCode', 'Indicator Code'],
                    ['period', 'Period'],
                    ['partner', 'Partner'],
                    ['location', 'Location'],
                    ['value', 'Reported Value'],
                    ['denominator', 'Denominator'],
                    ['sourceRef', 'Source Ref'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="space-y-1">
                    <span className="text-[11px] font-medium text-[#525D68]">{label}</span>
                    <select
                      value={csvMap[key]}
                      onChange={(e) => setCsvMap((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2 py-1.5 text-xs"
                    >
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              {/* Row Validation Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E4E0] text-[#525D68]">
                      <th className="py-2 pr-3 font-medium">Row</th>
                      <th className="py-2 pr-3 font-medium">Indicator</th>
                      <th className="py-2 pr-3 font-medium">Period / Partner</th>
                      <th className="py-2 pr-3 font-medium text-right">Value (n)</th>
                      <th className="py-2 pr-3 font-medium">Source Ref</th>
                      <th className="py-2 font-medium">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E4E0]">
                    {validatedCsvRows.map((r) => (
                      <tr key={r.rowNumber} className={r.valid ? '' : 'bg-[#FEF2F2]'}>
                        <td className="py-2.5 pr-3 font-mono text-[#525D68]">Row {r.rowNumber}</td>
                        <td className="py-2.5 pr-3 font-mono">{r.code}</td>
                        <td className="py-2.5 pr-3 text-[#525D68]">
                          {r.period} · {r.partner} ({r.location})
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                          {Number.isNaN(r.numVal) ? 'Invalid' : r.numVal} {r.numDen !== null ? `(n=${r.numDen})` : ''}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-[#525D68]">{r.sourceRef || '—'}</td>
                        <td className="py-2.5">
                          {r.valid ? (
                            <span className="inline-flex items-center gap-1 text-[#15803D] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready to import
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#B91C1C] font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" /> {r.errors.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                {csvCommitted ? (
                  <span className="text-[#15803D] font-medium">
                    Accepted rows imported into Partner Submissions with preserved file & row references.
                  </span>
                ) : (
                  <span className="text-[#525D68]">
                    Error rows are skipped automatically; only validated rows will be committed.
                  </span>
                )}
                <button
                  type="button"
                  disabled={!roleMeta.canSubmitData || validatedCsvRows.filter((r) => r.valid).length === 0 || csvCommitted}
                  onClick={handleCommitCsv}
                  className="px-4 py-2 bg-[#1B4D3E] text-white font-medium rounded-md hover:bg-[#143B2F] disabled:opacity-40"
                >
                  Confirm Import ({validatedCsvRows.filter((r) => r.valid).length} Valid Rows)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
