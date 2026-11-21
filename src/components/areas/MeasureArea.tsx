import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  GitBranch,
  Upload,
} from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';
import {
  calculateIndicatorSummary,
  extractActivityMappedValue,
  extractIndicatorInputsFromMeasurement,
  parseCsv,
} from '../../lib/engine';
import { EvidenceAttachment, MeasurementRecord } from '../../types/miledge';
import { DynamicQuestionBlock } from '../shared/DynamicQuestionField';
import { EvidenceManager } from '../shared/EvidenceAttachments';
import { MetaRow, ProvenanceLabel, StatusLabel } from '../shared/StatusLabels';

const SAMPLE_CSV_CHILDFUND = `indicator_code,observation_date,site_name,numerator,denominator,source_reference,notes
CF-1.1,2023-06-24,Serere District,64,120,Midline_Survey_Serere_2023.csv,PfCW Serere farmer sample
CF-1.1,2023-06-25,Dokolo District,38,80,Midline_Survey_Dokolo_2023.csv,LACODEF Dokolo farmer sample`;

const SAMPLE_CSV_OMUGO = `indicator_code,observation_date,site_name,numerator,denominator,source_reference,notes
OM-3.1,2018-08-26,Host Community Parish,74,95,Endline_Host_WASH_2018.csv,Host community water access sample`;

export const MeasureArea: React.FC = () => {
  const {
    state,
    activeProject,
    activeApprovedPlan,
    roleDef,
    setActiveArea,
    saveMeasurementRecord,
    createMeasurementRevision,
    importCsvMeasurements,
    notify,
  } = useMiledge();

  const plan = activeApprovedPlan?.plan || null;
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Shared single-column measurement form state
  const [observationDate, setObservationDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodId, setPeriodId] = useState(plan?.reportingRules.defaultPeriodId || '');
  const [siteId, setSiteId] = useState('all_sites');
  const [breakdownText, setBreakdownText] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('');
  const [isStudy, setIsStudy] = useState(false);
  const [studyRound, setStudyRound] = useState('');
  const [studyMethod, setStudyMethod] = useState('');
  const [studyPop, setStudyPop] = useState('');
  const [studyDates, setStudyDates] = useState('');
  const [studySource, setStudySource] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState<EvidenceAttachment[]>([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // CSV Import Wizard state
  const [showImport, setShowImport] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvText, setCsvText] = useState('');

  useEffect(() => {
    setSelectedIndicatorId('');
    setEditingRecordId(null);
    setPeriodId(activeApprovedPlan?.plan.reportingRules.defaultPeriodId || '');
    setSiteId('all_sites');
    setAnswers({});
    setEvidence([]);
    setNotes('');
    setSavedNotice(null);
    setShowImport(false);
  }, [activeProject.id, activeApprovedPlan?.id]);

  const selectedIndicator = useMemo(
    () => (plan && selectedIndicatorId ? plan.indicators.find((i) => i.id === selectedIndicatorId) || null : null),
    [plan, selectedIndicatorId]
  );

  const editingRecord = useMemo(
    () => (editingRecordId ? state.measurementRecords.find((r) => r.id === editingRecordId) || null : null),
    [editingRecordId, state.measurementRecords]
  );

  const indicatorSummaries = useMemo(() => {
    if (!plan) return [];
    return plan.indicators.map((ind) =>
      calculateIndicatorSummary(
        plan,
        ind,
        activeProject.id,
        state.activityRecords,
        state.measurementRecords,
        'all',
        'all'
      )
    );
  }, [plan, activeProject.id, state.activityRecords, state.measurementRecords]);

  const selectedSummary = useMemo(
    () => indicatorSummaries.find((s) => s.indicator.id === selectedIndicatorId) || null,
    [indicatorSummaries, selectedIndicatorId]
  );

  const projectMeasurements = useMemo(
    () =>
      state.measurementRecords.filter(
        (r) =>
          r.projectId === activeProject.id &&
          (!roleDef.approvedOnlyView || r.status === 'approved') &&
          (!selectedIndicatorId || r.indicatorId === selectedIndicatorId)
      ),
    [state.measurementRecords, activeProject.id, roleDef.approvedOnlyView, selectedIndicatorId]
  );

  const activeQuestions = editingRecord
    ? editingRecord.questionSnapshot
    : selectedIndicator?.questions || [];

  const activeEvidenceReq = editingRecord
    ? editingRecord.evidenceRequirementSnapshot
    : selectedIndicator?.evidenceRequirement;

  // Live rate calculation preview while typing
  const liveCalculatedPreview = useMemo(() => {
    if (!selectedIndicator) return null;
    if (selectedIndicator.inputMode !== 'ratio_numerator_denominator') return null;
    const ext = extractIndicatorInputsFromMeasurement(
      {
        questionSnapshot: activeQuestions,
        answers,
        singleValue: null,
        categoryValue: undefined,
        numerator: null,
        denominator: null,
      },
      selectedIndicator
    );
    if (ext.numerator !== null && ext.denominator !== null) {
      if (ext.denominator <= 0) return 'Denominator must be > 0';
      if (ext.numerator > ext.denominator) return `Invalid: ${ext.numerator} > ${ext.denominator}`;
      return `${ext.numerator} ÷ ${ext.denominator} = ${ext.calculatedRate}%`;
    }
    return null;
  }, [selectedIndicator, activeQuestions, answers]);

  const handleSelectIndicator = (indId: string) => {
    setEditingRecordId(null);
    setSelectedIndicatorId(indId);
    setAnswers({});
    setSavedNotice(null);
    const ind = plan?.indicators.find((i) => i.id === indId);
    if (ind) {
      setCollectionMethod(ind.collectionMethod);
      setIsStudy(ind.collectionMethod.toLowerCase().includes('survey') || ind.collectionMethod.toLowerCase().includes('endline'));
    }
  };

  const loadMeasurementIntoForm = (rec: MeasurementRecord) => {
    setEditingRecordId(rec.id);
    setSelectedIndicatorId(rec.indicatorId);
    setObservationDate(rec.observationDate);
    setPeriodId(rec.periodId);
    setSiteId(rec.siteId);
    setBreakdownText(Object.entries(rec.breakdowns).map(([k, v]) => `${k}: ${v}`).join('; '));
    setCollectionMethod(rec.collectionMethod);
    setIsStudy(Boolean(rec.studyMetadata?.isStudyOrSurvey));
    setStudyRound(rec.studyMetadata?.studyRound || '');
    setStudyMethod(rec.studyMetadata?.method || '');
    setStudyPop(rec.studyMetadata?.population || '');
    setStudyDates(rec.studyMetadata?.fieldworkDates || '');
    setStudySource(rec.studyMetadata?.sourceCitation || '');
    setAnswers({ ...rec.answers });
    setNotes(rec.notes);
    setEvidence([...rec.evidence]);
    setSavedNotice(null);
  };

  const resetForm = () => {
    setEditingRecordId(null);
    setObservationDate(new Date().toISOString().slice(0, 10));
    setPeriodId(plan?.reportingRules.defaultPeriodId || '');
    setSiteId('all_sites');
    setBreakdownText('');
    setAnswers({});
    setNotes('');
    setEvidence([]);
  };

  const handleSave = (submitNow: boolean) => {
    if (!selectedIndicator) return;
    const ext = extractIndicatorInputsFromMeasurement(
      { questionSnapshot: activeQuestions, answers },
      selectedIndicator
    );
    const breakdowns: Record<string, string> = {};
    if (breakdownText.trim()) breakdowns['Group / Breakdown'] = breakdownText.trim();

    const res = saveMeasurementRecord({
      existingId: editingRecordId || undefined,
      indicatorId: selectedIndicator.id,
      observationDate,
      periodId,
      siteId,
      breakdowns,
      collectionMethod,
      studyMetadata: isStudy
        ? {
            isStudyOrSurvey: true,
            studyRound: studyRound.trim() || 'Survey Round',
            method: studyMethod.trim() || collectionMethod,
            population: studyPop.trim() || 'Target households',
            fieldworkDates: studyDates.trim() || observationDate,
            sourceCitation: studySource.trim() || evidence[0]?.name || 'Survey reference',
          }
        : undefined,
      answers,
      singleValue: ext.singleValue,
      categoryValue: ext.categoryValue || undefined,
      numerator: ext.numerator,
      denominator: ext.denominator,
      notes,
      evidence,
      submitNow,
    });

    if (res.ok && res.record) {
      setSavedNotice(`Saved ${res.record.indicatorCodeSnapshot} (${res.record.status})`);
      resetForm();
    }
  };

  // CSV Import parsing & validation preview
  const parsedCsv = useMemo(() => (csvText.trim() ? parseCsv(csvText) : null), [csvText]);
  const csvPreviewRows = useMemo(() => {
    if (!parsedCsv || !plan) return [];
    const idx = (name: string) => parsedCsv.headers.findIndex((h) => h.toLowerCase().trim() === name);
    const iCode = idx('indicator_code');
    const iDate = idx('observation_date');
    const iSite = idx('site_name');
    const iNum = idx('numerator');
    const iDen = idx('denominator');
    const iVal = idx('value');
    const iRef = idx('source_reference');
    const iNotes = idx('notes');

    return parsedCsv.rows.map((row, rowIndex) => {
      const code = iCode >= 0 ? row[iCode] : '';
      const ind = plan.indicators.find((x) => x.code.toLowerCase() === code.toLowerCase());
      const dateStr = iDate >= 0 ? row[iDate] : new Date().toISOString().slice(0, 10);
      const siteName = iSite >= 0 ? row[iSite] : 'All project sites';
      const siteObj = plan.sites.find((s) => s.name.toLowerCase() === siteName.toLowerCase());
      const num = iNum >= 0 && row[iNum] !== '' ? Number(row[iNum]) : null;
      const den = iDen >= 0 && row[iDen] !== '' ? Number(row[iDen]) : null;
      const single = iVal >= 0 && row[iVal] !== '' ? Number(row[iVal]) : null;
      const sourceRef = iRef >= 0 ? row[iRef] : '';
      const note = iNotes >= 0 ? row[iNotes] : '';

      const errors: string[] = [];
      if (!ind) errors.push(`Unknown indicator code "${code}"`);
      if (num !== null && den !== null && num > den) errors.push(`Numerator (${num}) > Denominator (${den})`);
      if (den !== null && den <= 0) errors.push('Denominator must be > 0');

      return {
        rowNumber: rowIndex + 2,
        code,
        ind,
        dateStr,
        siteId: siteObj?.id || 'all_sites',
        siteName: siteObj?.name || 'All project sites',
        num,
        den,
        single,
        sourceRef,
        note,
        errors,
      };
    });
  }, [parsedCsv, plan]);

  const handleConfirmCsvImport = () => {
    if (!activeApprovedPlan || !plan) return;
    const validRows = csvPreviewRows.filter((r) => r.errors.length === 0 && r.ind);
    if (validRows.length === 0) {
      notify('No valid rows to import.', 'error');
      return;
    }
    const payload = validRows.map((r) => {
      const ind = r.ind!;
      const ans: Record<string, string | number | boolean> = {};
      ind.questions.forEach((q) => {
        if (q.indicatorMapping?.role === 'numerator' && r.num !== null) ans[q.id] = r.num;
        if (q.indicatorMapping?.role === 'denominator' && r.den !== null) ans[q.id] = r.den;
        if (q.indicatorMapping?.role === 'value' && r.single !== null) ans[q.id] = r.single;
      });
      return {
        projectId: activeProject.id,
        planVersionId: activeApprovedPlan.id,
        planVersionLabel: activeApprovedPlan.versionLabel,
        indicatorId: ind.id,
        indicatorCodeSnapshot: ind.code,
        indicatorNameSnapshot: ind.name,
        indicatorUnitSnapshot: ind.unit,
        observationDate: r.dateStr,
        periodId: plan.reportingRules.defaultPeriodId,
        siteId: r.siteId,
        siteNameSnapshot: r.siteName,
        breakdowns: {},
        collectionMethod: 'CSV Batch Import',
        questionSnapshot: structuredClone(ind.questions),
        evidenceRequirementSnapshot: structuredClone(ind.evidenceRequirement),
        answers: ans,
        singleValue: r.single,
        numerator: r.num,
        denominator: r.den,
        notes: r.note || `Imported from ${csvFileName || 'CSV upload'}`,
        evidence: r.sourceRef
          ? [
              {
                id: `ev-csv-${Date.now()}-${r.rowNumber}`,
                kind: 'source_ref' as const,
                name: `${r.sourceRef} (Row ${r.rowNumber})`,
                sourceRefText: `CSV ${csvFileName || 'upload'} · Row ${r.rowNumber} · ${r.sourceRef}`,
                uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
                uploadedBy: roleDef.actorName,
              },
            ]
          : [],
        csvImportRef: { fileName: csvFileName || 'imported_results.csv', rowNumber: r.rowNumber },
        status: 'submitted' as const,
        provenance: 'synthetic_demo' as const,
        createdBy: roleDef.actorName,
      };
    });
    importCsvMeasurements(payload);
    setCsvText('');
    setCsvFileName('');
    setShowImport(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#14191F] tracking-tight font-display">
            Measure — Record Measurement
          </h1>
          <p className="text-sm text-[#525D68] mt-0.5">
            Track indicators, inspect activity-calculated roll-ups, record routine or survey observations, and import CSV results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {roleDef.canCapture && plan && (
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-[#C5C9C2] bg-white text-xs font-semibold text-[#14191F] hover:bg-[#F6F7F5]"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#14532D]" />
              {showImport ? 'Close Import' : 'Import results (CSV)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveArea('do')}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-[#C5C9C2] bg-white text-xs font-semibold text-[#14191F] hover:bg-[#F6F7F5]"
          >
            Record activity (Do)
            <ArrowRight className="w-3.5 h-3.5 text-[#14532D]" />
          </button>
        </div>
      </div>

      {!plan && (
        <div className="rounded-xl bg-white border border-[#B45309]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-[#92400E]">Approve Plan configuration before measuring</div>
            <p className="text-xs text-[#525D68] mt-0.5">
              Configure your indicators and approve Plan v1.0 in Plan to activate measurement capture.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveArea('plan')}
            className="shrink-0 min-h-[42px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold"
          >
            Open Plan Setup →
          </button>
        </div>
      )}

      {/* CSV Import Panel */}
      {showImport && plan && (
        <div className="bg-white border border-[#E2E6E2] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#14191F]">CSV Results Import (Preview &amp; Validation)</h2>
              <p className="text-xs text-[#525D68]">
                Preserves file name, row number, and source reference on every imported observation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCsvFileName(
                    activeProject.id === 'omugo-settlement' ? 'omugo_host_wash_sample.csv' : 'childfund_midline_sample.csv'
                  );
                  setCsvText(
                    activeProject.id === 'omugo-settlement' ? SAMPLE_CSV_OMUGO : SAMPLE_CSV_CHILDFUND
                  );
                }}
                className="px-3 py-1.5 rounded-md border border-[#14532D] text-[#14532D] font-semibold hover:bg-[#EBF7EE]"
              >
                Load sample CSV for {activeProject.shortName}
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#C5C9C2] cursor-pointer hover:bg-[#F6F7F5] font-medium">
                <Upload className="w-3.5 h-3.5" />
                Upload .csv file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCsvFileName(f.name);
                    const reader = new FileReader();
                    reader.onload = () => setCsvText(String(reader.result || ''));
                    reader.readAsText(f);
                  }}
                />
              </label>
            </div>
          </div>

          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="indicator_code,observation_date,site_name,numerator,denominator,source_reference,notes"
            className="w-full font-mono text-xs bg-[#F6F7F5] border border-[#C5C9C2] rounded-lg p-3"
          />

          {csvPreviewRows.length > 0 && (
            <div className="space-y-3">
              <div className="border border-[#E2E6E2] rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F6F7F5] border-b border-[#E2E6E2] text-[#525D68]">
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Indicator</th>
                      <th className="py-2 px-3">Date &amp; Site</th>
                      <th className="py-2 px-3">Inputs</th>
                      <th className="py-2 px-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6E2]">
                    {csvPreviewRows.map((r) => (
                      <tr key={r.rowNumber}>
                        <td className="py-2 px-3 font-mono">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-medium">{r.ind ? `${r.ind.code} — ${r.ind.name}` : r.code}</td>
                        <td className="py-2 px-3">{r.dateStr} · {r.siteName}</td>
                        <td className="py-2 px-3 font-mono tabular-nums">
                          {r.num !== null && r.den !== null
                            ? `${r.num} / ${r.den}`
                            : r.single !== null
                            ? r.single
                            : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {r.errors.length === 0 ? (
                            <span className="text-[#15803D] font-semibold">Valid</span>
                          ) : (
                            <span className="text-[#B91C1C] font-semibold">{r.errors.join('; ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={handleConfirmCsvImport}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22]"
              >
                Import {csvPreviewRows.filter((r) => r.errors.length === 0).length} valid row(s) as Submitted
              </button>
            </div>
          )}
        </div>
      )}

      {/* Split Workspace: Indicators & Recorded Observations (Left) + Shared Measurement Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Indicators List + Recent Observations */}
        <section className="lg:col-span-7 space-y-5 order-2 lg:order-1">
          <div className="space-y-2.5">
            <h2 className="text-sm font-bold text-[#14191F]">
              Project Indicators ({indicatorSummaries.length})
            </h2>
            <div className="bg-white border border-[#E2E6E2] rounded-xl divide-y divide-[#E2E6E2]">
              {indicatorSummaries.map((sum) => {
                const isSelected = sum.indicator.id === selectedIndicatorId;
                return (
                  <button
                    key={sum.indicator.id}
                    type="button"
                    onClick={() => handleSelectIndicator(sum.indicator.id)}
                    className={`w-full text-left p-4 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                      isSelected ? 'bg-[#EBF7EE]/70' : 'hover:bg-[#F6F7F5]/70'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-mono text-xs font-semibold text-[#14532D]">
                          {sum.indicator.code}
                        </span>
                        <span className="text-sm font-bold text-[#14191F]">{sum.indicator.name}</span>
                      </div>
                      <MetaRow
                        items={[
                          sum.indicator.frameworkLevel,
                          sum.indicator.inputMode === 'calculated_from_activity'
                            ? 'Calculated from Do activities'
                            : sum.indicator.inputMode === 'ratio_numerator_denominator'
                            ? 'Numerator / Denominator rate'
                            : 'Direct observation',
                          `Target: ${sum.finalTargetDisplay}`,
                        ]}
                      />
                      <div className="text-xs text-[#525D68]">{sum.statusNote}</div>
                    </div>

                    <div className="shrink-0 sm:text-right font-mono tabular-nums">
                      <div
                        className={`text-base font-bold ${
                          sum.isIncomparable
                            ? 'text-[#B91C1C]'
                            : sum.isMissing
                            ? 'text-[#B45309]'
                            : 'text-[#14191F]'
                        }`}
                      >
                        {sum.approvedDisplay}
                      </div>
                      {sum.achievementPct !== null && (
                        <div className="text-[11px] text-[#14532D]">{sum.achievementPct}% of target</div>
                      )}
                      {sum.hasPendingDifference && (
                        <div className="text-[11px] text-[#B45309]">
                          Pending/draft: {sum.draftOrPendingValue}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {indicatorSummaries.length === 0 && (
                <div className="p-6 text-center text-xs text-[#525D68]">
                  No indicators configured yet. Add indicators in Plan and approve Plan v1.0.
                </div>
              )}
            </div>
          </div>

          {/* Recorded Measurements Table / List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#14191F]">
                {selectedIndicator
                  ? `Observations for ${selectedIndicator.code}`
                  : 'Recent Measurement Observations'}{' '}
                ({projectMeasurements.length})
              </h2>
              {selectedIndicatorId && (
                <button
                  type="button"
                  onClick={() => setSelectedIndicatorId('')}
                  className="text-xs font-medium text-[#14532D] hover:underline"
                >
                  Show all indicators
                </button>
              )}
            </div>

            <div className="bg-white border border-[#E2E6E2] rounded-xl divide-y divide-[#E2E6E2]">
              {projectMeasurements.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#525D68]">
                  No direct measurement observations recorded for this selection yet.
                </div>
              ) : (
                projectMeasurements.map((rec) => {
                  const ind = plan?.indicators.find((i) => i.id === rec.indicatorId);
                  const ext = extractIndicatorInputsFromMeasurement(rec, ind);
                  return (
                    <div key={rec.id} className="p-4 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="font-mono font-semibold text-[#14532D]">
                              {rec.indicatorCodeSnapshot}
                            </span>
                            <span className="text-sm font-bold text-[#14191F]">
                              {rec.indicatorNameSnapshot}
                            </span>
                            <span className="font-mono text-[11px] text-[#525D68]">
                              Rev {rec.revision} · Plan {rec.planVersionLabel}
                            </span>
                          </div>
                          <MetaRow
                            items={[
                              <span key="d" className="font-mono">{rec.observationDate}</span>,
                              rec.siteNameSnapshot,
                              <StatusLabel key="s" status={rec.status} />,
                              <ProvenanceLabel key="p" provenance={rec.provenance} />,
                              rec.csvImportRef ? `CSV ${rec.csvImportRef.fileName} Row ${rec.csvImportRef.rowNumber}` : null,
                            ]}
                          />
                        </div>

                        <div className="shrink-0 sm:text-right font-mono tabular-nums">
                          {ext.calculatedRate !== null ? (
                            <>
                              <div className="text-base font-bold text-[#14191F]">{ext.calculatedRate}%</div>
                              <div className="text-[11px] text-[#525D68]">
                                {ext.numerator} / {ext.denominator}
                              </div>
                            </>
                          ) : ext.singleValue !== null ? (
                            <div className="text-base font-bold text-[#14191F]">
                              {ext.singleValue} {rec.indicatorUnitSnapshot}
                            </div>
                          ) : (
                            <div className="text-sm font-semibold text-[#B91C1C]">Missing denominator</div>
                          )}
                        </div>
                      </div>

                      {rec.studyMetadata?.isStudyOrSurvey && (
                        <div className="text-[11px] text-[#525D68] bg-[#F6F7F5] rounded px-2.5 py-1.5">
                          <strong className="text-[#14191F]">{rec.studyMetadata.studyRound}</strong> ·{' '}
                          {rec.studyMetadata.method} · {rec.studyMetadata.population} ({rec.studyMetadata.fieldworkDates}) ·{' '}
                          {rec.studyMetadata.sourceCitation}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {roleDef.canCapture && (rec.status === 'draft' || rec.status === 'returned') && (
                          <button
                            type="button"
                            onClick={() => loadMeasurementIntoForm(rec)}
                            className="inline-flex items-center gap-1 font-semibold text-[#14532D] hover:underline"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {rec.status === 'returned' ? 'Fix & Resubmit' : 'Edit Draft'}
                          </button>
                        )}
                        {roleDef.canCapture && rec.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              const rev = createMeasurementRevision(rec.id);
                              if (rev) loadMeasurementIntoForm(rev);
                            }}
                            className="inline-flex items-center gap-1 font-medium text-[#525D68] hover:text-[#14532D] hover:underline"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            Create correction revision
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: Shared Single-Column Measurement Form (Matching Visual Guides) */}
        <section className="lg:col-span-5 order-1 lg:order-2">
          <div className="bg-white border border-[#E2E6E2] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#14532D] text-white flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-base font-bold font-display truncate">
                  Measure · {activeProject.shortName}
                </div>
                <div className="text-[11px] text-white/80">
                  {selectedIndicator
                    ? `${selectedIndicator.code} — ${selectedIndicator.name}`
                    : 'Select an indicator to load its fields'}
                </div>
              </div>
              {activeApprovedPlan && (
                <span className="font-mono text-[11px] text-white/90 shrink-0">
                  Plan {activeApprovedPlan.versionLabel}
                </span>
              )}
            </div>

            {roleDef.approvedOnlyView ? (
              <div className="p-5 text-xs text-[#525D68]">
                Donor view is read-only. Switch to Programme Manager, M&amp;E Reviewer, or Field Officer to record measurements.
              </div>
            ) : !plan ? (
              <div className="p-5 text-xs text-[#525D68]">
                Approve Plan v1.0 in Plan to unlock measurement capture.
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {savedNotice && (
                  <div className="rounded-lg bg-[#EBF7EE] border border-[#C5E5CD] p-3 text-xs text-[#14532D] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {savedNotice}
                  </div>
                )}

                {/* Indicator Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="meas-indicator" className="block text-sm font-semibold text-[#14191F]">
                    Indicator
                  </label>
                  <select
                    id="meas-indicator"
                    disabled={Boolean(editingRecord)}
                    value={selectedIndicatorId}
                    onChange={(e) => handleSelectIndicator(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-[#C5C9C2] bg-white px-3 py-2 text-sm text-[#14191F] focus:outline-none focus:border-[#14532D] disabled:bg-[#F6F7F5]"
                  >
                    <option value="">Select indicator</option>
                    {plan.indicators.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.code} — {ind.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Indicator Context Strip */}
                {selectedIndicator && (
                  <div className="rounded-lg bg-[#F6F7F5] border border-[#E2E6E2] p-3 text-xs space-y-1.5">
                    <div className="text-[#14191F] leading-relaxed">{selectedIndicator.definition}</div>
                    <MetaRow
                      items={[
                        `Baseline: ${
                          selectedIndicator.baseline.status === 'numeric'
                            ? `${selectedIndicator.baseline.value}${selectedIndicator.unit === '%' ? '%' : ` ${selectedIndicator.unit}`}`
                            : selectedIndicator.baseline.status.replace('_', ' ')
                        }`,
                        `Final target: ${selectedSummary?.finalTargetDisplay || '—'}`,
                        `Rule: ${selectedIndicator.aggregationRule.replace('_', ' ')}`,
                      ]}
                    />
                  </div>
                )}

                {/* Case A: Indicator Calculated Directly From Do Activities (Enter Once!) */}
                {selectedIndicator && selectedIndicator.inputMode === 'calculated_from_activity' && selectedSummary && (
                  <div className="rounded-xl bg-[#EBF7EE] border border-[#C5E5CD] p-4 space-y-3 animate-config-reveal">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#14532D]">
                        <Calculator className="w-4 h-4" />
                        Calculated automatically from Do records
                      </div>
                      <span className="font-mono text-base font-bold text-[#14532D] tabular-nums">
                        {selectedSummary.approvedDisplay}
                      </span>
                    </div>
                    <p className="text-xs text-[#14191F]">{selectedSummary.statusNote}</p>

                    {selectedSummary.contributingActivityRecords.length > 0 ? (
                      <div className="bg-white rounded-lg border border-[#C5E5CD] divide-y divide-[#E2E6E2] text-xs">
                        {selectedSummary.contributingActivityRecords.map((act) => (
                          <div key={act.id} className="px-3 py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-[#14191F] truncate">
                                {act.activityNameSnapshot} · {act.siteNameSnapshot}
                              </div>
                              <div className="text-[11px] font-mono text-[#525D68]">
                                {act.date} · Rev {act.revision} · Approved
                              </div>
                            </div>
                            <span className="font-mono font-bold text-[#14532D] tabular-nums shrink-0">
                              +{extractActivityMappedValue(act, selectedIndicator.id) ?? 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#B45309] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No approved contributing activity records yet.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveArea('do')}
                      className="w-full min-h-[42px] rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22]"
                    >
                      Record contributing activity in Do →
                    </button>
                  </div>
                )}

                {/* Case B: Direct / Survey / Ratio Measurement Form */}
                {selectedIndicator && selectedIndicator.inputMode !== 'calculated_from_activity' && (
                  <>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label htmlFor="meas-date" className="block text-sm font-semibold text-[#14191F]">
                          Date or period
                        </label>
                        <input
                          id="meas-date"
                          type="date"
                          value={observationDate}
                          onChange={(e) => setObservationDate(e.target.value)}
                          className="w-full min-h-[44px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm font-mono text-[#14191F] focus:outline-none focus:border-[#14532D]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="meas-period" className="block text-xs font-semibold text-[#525D68]">
                            Reporting period
                          </label>
                          <select
                            id="meas-period"
                            value={periodId}
                            onChange={(e) => setPeriodId(e.target.value)}
                            className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5 text-xs text-[#14191F]"
                          >
                            {plan.reportingRules.periods.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="meas-site" className="block text-xs font-semibold text-[#525D68]">
                            Site or scope
                          </label>
                          <select
                            id="meas-site"
                            value={siteId}
                            onChange={(e) => setSiteId(e.target.value)}
                            className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] bg-white px-2.5 py-1.5 text-xs text-[#14191F]"
                          >
                            <option value="all_sites">All project sites</option>
                            {plan.sites.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Light-green configured fields loaded from indicator setup */}
                    <DynamicQuestionBlock
                      questions={activeQuestions}
                      answers={answers}
                      onChange={(qid, val) => setAnswers((prev) => ({ ...prev, [qid]: val }))}
                      calculatedPreview={liveCalculatedPreview}
                      headerNote={
                        editingRecord
                          ? `Original Plan ${editingRecord.planVersionLabel} fields preserved`
                          : `Configured fields for ${selectedIndicator.code}`
                      }
                    />

                    {/* Study / Survey Round Metadata Toggle */}
                    <div className="rounded-lg border border-[#E2E6E2] bg-[#F6F7F5] p-3 space-y-2.5 text-xs">
                      <label className="flex items-center gap-2 font-semibold text-[#14191F] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isStudy}
                          onChange={(e) => setIsStudy(e.target.checked)}
                          className="accent-[#14532D]"
                        />
                        Survey or Evaluation Study observation (capture round, method &amp; population)
                      </label>

                      {isStudy && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <input
                            type="text"
                            value={studyRound}
                            onChange={(e) => setStudyRound(e.target.value)}
                            placeholder="Study round (e.g., Endline 2018)"
                            className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            value={studyMethod}
                            onChange={(e) => setStudyMethod(e.target.value)}
                            placeholder="Method (e.g., Household survey)"
                            className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            value={studyPop}
                            onChange={(e) => setStudyPop(e.target.value)}
                            placeholder="Population (e.g., Target farming HHs)"
                            className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            value={studyDates}
                            onChange={(e) => setStudyDates(e.target.value)}
                            placeholder="Fieldwork dates"
                            className="bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            value={studySource}
                            onChange={(e) => setStudySource(e.target.value)}
                            placeholder="Survey table or report source citation"
                            className="sm:col-span-2 bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      )}

                      <input
                        type="text"
                        value={breakdownText}
                        onChange={(e) => setBreakdownText(e.target.value)}
                        placeholder={`Optional breakdown (${selectedIndicator.disaggregations.join(', ') || 'Group'})`}
                        className="w-full bg-white border border-[#C5C9C2] rounded px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observation notes or data quality context (optional)..."
                      className="w-full rounded-lg border border-[#C5C9C2] px-3 py-2 text-xs text-[#14191F]"
                    />

                    {/* Shared Add source button */}
                    <EvidenceManager
                      buttonLabel="Add source"
                      requirement={activeEvidenceReq}
                      attachments={evidence}
                      sourceDocuments={plan.sourceDocuments}
                      actorName={roleDef.actorName}
                      onAdd={(att) => setEvidence((prev) => [...prev, att])}
                      onRemove={(id) => setEvidence((prev) => prev.filter((a) => a.id !== id))}
                    />

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSave(false)}
                        className="min-h-[46px] rounded-lg border border-[#C5C9C2] bg-white hover:bg-[#F6F7F5] text-sm font-semibold text-[#14191F]"
                      >
                        Save draft
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(true)}
                        className="min-h-[46px] rounded-lg bg-[#14532D] hover:bg-[#0F3F22] text-sm font-semibold text-white"
                      >
                        {editingRecord?.status === 'returned' ? 'Resubmit' : 'Submit'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
