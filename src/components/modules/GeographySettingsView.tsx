import React, { useMemo, useState } from 'react';
import { ArrowRight, MapPin, Plus, Settings, Trash2 } from 'lucide-react';
import { useMeal } from '../../context/MealContext';
import { computeIndicatorState } from '../../lib/mealEngine';
import { LocationItem } from '../../types/meal';
import { MetaLine } from '../shared/StatusText';

export const GeographySettingsView: React.FC = () => {
  const {
    state,
    activeProject,
    roleMeta,
    setFilters,
    setActiveModule,
    updateProjectSettings,
  } = useMeal();

  const pid = state.activeProjectId;
  const [selectedLocId, setSelectedLocId] = useState<string>(activeProject.locations[0]?.id || '');

  const selectedLocation = useMemo(
    () => activeProject.locations.find((l) => l.id === selectedLocId) || activeProject.locations[0],
    [activeProject.locations, selectedLocId]
  );

  // Location-scoped activity & observation counts
  const locationActivities = useMemo(
    () =>
      selectedLocation
        ? state.activities.filter(
            (a) =>
              a.projectId === pid &&
              (a.location === selectedLocation.name || a.location.includes(selectedLocation.name))
          )
        : [],
    [state.activities, pid, selectedLocation]
  );

  const locationObservations = useMemo(
    () =>
      selectedLocation
        ? state.observations.filter(
            (o) =>
              o.projectId === pid &&
              (o.location === selectedLocation.name ||
                o.location.includes(selectedLocation.name) ||
                o.partner === selectedLocation.partner)
          )
        : [],
    [state.observations, pid, selectedLocation]
  );

  const projectIndicators = useMemo(
    () => state.indicators.filter((i) => i.projectId === pid),
    [state.indicators, pid]
  );

  // Settings editors
  const [newSector, setNewSector] = useState('');
  const [newPartner, setNewPartner] = useState('');
  const [newBreakdown, setNewBreakdown] = useState('');
  const [newLocName, setNewLocName] = useState('');
  const [newLocRegion, setNewLocRegion] = useState(activeProject.region);
  const [newLocPartner, setNewLocPartner] = useState(activeProject.partners[0] || '');
  const [newCycleLabel, setNewCycleLabel] = useState('');
  const [newCycleDue, setNewCycleDue] = useState('2024-06-30');

  const canEdit = roleMeta.canEditSettings;

  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSector.trim();
    if (!val || activeProject.sectors.includes(val)) return;
    updateProjectSettings(pid, { sectors: [...activeProject.sectors, val] });
    setNewSector('');
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newPartner.trim();
    if (!val || activeProject.partners.includes(val)) return;
    updateProjectSettings(pid, { partners: [...activeProject.partners, val] });
    setNewPartner('');
  };

  const handleAddBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newBreakdown.trim();
    if (!val || activeProject.breakdowns.includes(val)) return;
    updateProjectSettings(pid, { breakdowns: [...activeProject.breakdowns, val] });
    setNewBreakdown('');
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLocName.trim();
    if (!name) return;
    const item: LocationItem = {
      id: `loc-${Date.now()}`,
      name,
      region: newLocRegion.trim() || activeProject.region,
      type: pid === 'omugo-wvu' ? 'Settlement Zone' : 'District',
      svgX: pid === 'omugo-wvu' ? 115 + (activeProject.locations.length * 14) % 50 : 215 + (activeProject.locations.length * 16) % 60,
      svgY: pid === 'omugo-wvu' ? 88 + (activeProject.locations.length * 12) % 40 : 128 + (activeProject.locations.length * 14) % 50,
      partner: newLocPartner || activeProject.partners[0],
    };
    updateProjectSettings(pid, { locations: [...activeProject.locations, item] });
    setSelectedLocId(item.id);
    setNewLocName('');
  };

  const handleAddCycle = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newCycleLabel.trim();
    if (!label) return;
    updateProjectSettings(pid, {
      reportingCycles: [
        ...activeProject.reportingCycles,
        {
          id: `cyc-${Date.now()}`,
          label,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: newCycleDue,
          dueDate: newCycleDue,
          status: 'upcoming',
        },
      ],
    });
    setNewCycleLabel('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#14191F] tracking-tight font-[var(--font-display)]">
          Geography & Project Settings
        </h1>
        <p className="text-sm text-[#525D68] mt-1">
          Inspect location-level coverage across {activeProject.region} and configure sectors, partners, locations, reporting cycles, and breakdowns for {activeProject.shortName}.
        </p>
      </div>

      {/* SECTION 1: Interactive Uganda Regional Map & Structured Location Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white border border-[#E2E4E0] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#14191F] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#1B4D3E]" />
              Uganda Programme Map — {activeProject.region}
            </h2>
            <span className="font-mono text-[11px] text-[#525D68]">{activeProject.locations.length} sites</span>
          </div>

          {/* Crisp Schematic SVG Map of Uganda with West Nile & North-East Focus Zones */}
          <div className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md p-2">
            <svg
              viewBox="0 0 360 320"
              className="w-full h-auto max-h-[290px]"
              role="img"
              aria-label={`Programme coverage map for ${activeProject.shortName}`}
            >
              {/* Stylized Uganda territorial outline */}
              <path
                d="M95,46 L142,42 L188,52 L245,48 L295,78 L305,135 L292,190 L262,226 L218,246 L195,274 L145,276 L92,258 L76,225 L92,188 L72,144 L80,92 Z"
                fill="#FFFFFF"
                stroke="#C5C9C2"
                strokeWidth="1.5"
              />
              {/* Lake Victoria (SE) & Lake Kyoga (Central) subtle reference shapes */}
              <path
                d="M210,238 Q250,230 278,242 L262,276 Q224,282 198,266 Z"
                fill="#E8EFF2"
                stroke="#CBD5E1"
                strokeWidth="1"
              />
              <ellipse cx="205" cy="176" rx="28" ry="11" fill="#E8EFF2" stroke="#CBD5E1" strokeWidth="1" />

              {/* Regional focus halo */}
              {pid === 'omugo-wvu' ? (
                <circle cx="112" cy="96" r="42" fill="#1B4D3E" fillOpacity="0.09" stroke="#1B4D3E" strokeDasharray="3 3" />
              ) : (
                <circle cx="242" cy="146" r="52" fill="#1B4D3E" fillOpacity="0.09" stroke="#1B4D3E" strokeDasharray="3 3" />
              )}

              {/* Regional labels */}
              <text x="112" y="42" textAnchor="middle" fontSize="9" fill="#525D68" fontFamily="monospace">
                WEST NILE (TEREGO/ARUA)
              </text>
              <text x="242" y="88" textAnchor="middle" fontSize="9" fill="#525D68" fontFamily="monospace">
                TESO & LANGO SUB-REGIONS
              </text>

              {/* Clickable Project Location Markers */}
              {activeProject.locations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                return (
                  <g
                    key={loc.id}
                    onClick={() => setSelectedLocId(loc.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={loc.svgX}
                      cy={loc.svgY}
                      r={isSelected ? 9 : 6.5}
                      fill={isSelected ? '#1B4D3E' : '#FFFFFF'}
                      stroke="#1B4D3E"
                      strokeWidth={isSelected ? 2.5 : 1.75}
                    />
                    <text
                      x={loc.svgX + 11}
                      y={loc.svgY + 3.5}
                      fontSize="10"
                      fontWeight={isSelected ? '700' : '500'}
                      fill="#14191F"
                    >
                      {loc.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Structured Accessible Location List Fallback */}
          <div className="divide-y divide-[#E2E4E0] border border-[#E2E4E0] rounded-md">
            {activeProject.locations.map((loc) => {
              const isSelected = selectedLocation?.id === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSelectedLocId(loc.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 ${
                    isSelected ? 'bg-[#F0F7F4] font-semibold text-[#1B4D3E]' : 'hover:bg-[#F7F7F5] text-[#14191F]'
                  }`}
                >
                  <span>{loc.name}</span>
                  <span className="text-[11px] font-normal text-[#525D68]">
                    {loc.type} · {loc.partner}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Location Drill-Down Panel */}
        <div className="lg:col-span-7 bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-4">
          {selectedLocation ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E2E4E0] pb-4">
                <div>
                  <div className="text-xs font-mono text-[#1B4D3E]">{selectedLocation.type}</div>
                  <h2 className="text-lg font-bold text-[#14191F] font-[var(--font-display)]">
                    {selectedLocation.name}
                  </h2>
                  <MetaLine
                    items={[
                      selectedLocation.region,
                      `Lead partner: ${selectedLocation.partner}`,
                      `${locationActivities.length} workplan activities`,
                      `${locationObservations.length} linked results`,
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ location: selectedLocation.name });
                    setActiveModule('overview');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-md hover:bg-[#143B2F] shrink-0"
                >
                  Filter Workspace to {selectedLocation.name}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#14191F]">Workplan Activities in {selectedLocation.name}</h3>
                {locationActivities.length > 0 ? (
                  <div className="divide-y divide-[#E2E4E0] border border-[#E2E4E0] rounded-md text-xs">
                    {locationActivities.map((act) => (
                      <div key={act.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-[#14191F]">
                            {act.code} — {act.title}
                          </div>
                          <div className="text-[#525D68]">
                            {act.ownerPartner} · Due {act.currentDueDate} · {act.status.replace('_', ' ')}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-[#14191F] shrink-0">
                          {act.actualDelivered}/{act.plannedOutput} {act.outputUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#525D68]">
                    Multi-district activities under {selectedLocation.partner} cover this site.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#14191F]">
                  Location / Partner Indicator Figures ({selectedLocation.partner})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projectIndicators.slice(0, 4).map((ind) => {
                    const calc = computeIndicatorState(state, ind, { partner: selectedLocation.partner });
                    const fallbackCalc = computeIndicatorState(state, ind);
                    const val = calc.approvedValue ?? fallbackCalc.approvedValue;
                    return (
                      <div key={ind.id} className="bg-[#F7F7F5] border border-[#E2E4E0] rounded-md p-3">
                        <div className="text-[11px] font-mono text-[#525D68]">{ind.code}</div>
                        <div className="text-xs font-medium text-[#14191F] truncate">{ind.title}</div>
                        <div className="mt-1 font-mono text-base font-bold tabular-nums text-[#14191F]">
                          {val !== null ? `${val} ${ind.unit}` : 'Missing'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-[#525D68]">Select a location marker to inspect geographic coverage.</p>
          )}
        </div>
      </div>

      {/* SECTION 2: Configurable Project Settings */}
      <div className="bg-white border border-[#E2E4E0] rounded-lg p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E4E0] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#14191F] flex items-center gap-2 font-[var(--font-display)]">
              <Settings className="w-4 h-4 text-[#1B4D3E]" />
              Project Configuration — {activeProject.shortName}
            </h2>
            <p className="text-xs text-[#525D68] mt-0.5">
              Changes to sectors, partners, locations, reporting cycles, and breakdowns immediately propagate across Scope Filters, Workplan, Field Capture, and Reports.
            </p>
          </div>
          {!canEdit && (
            <span className="text-xs font-mono text-[#B45309]">
              Read-only in {roleMeta.label} role (switch to Manager or M&E Reviewer to edit)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Sectors */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-[#14191F]">Sectors ({activeProject.sectors.length})</h3>
            <ul className="divide-y divide-[#E2E4E0] border border-[#E2E4E0] rounded-md text-xs">
              {activeProject.sectors.map((s) => (
                <li key={s} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span>{s}</span>
                  {canEdit && activeProject.sectors.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove sector ${s}`}
                      onClick={() =>
                        updateProjectSettings(pid, {
                          sectors: activeProject.sectors.filter((x) => x !== s),
                        })
                      }
                      className="text-[#525D68] hover:text-[#B91C1C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <form onSubmit={handleAddSector} className="flex gap-1.5">
                <input
                  type="text"
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  placeholder="Add sector..."
                  className="flex-1 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                />
                <button type="submit" className="px-2.5 py-1.5 bg-[#1B4D3E] text-white rounded text-xs">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Partners */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-[#14191F]">Implementing Partners ({activeProject.partners.length})</h3>
            <ul className="divide-y divide-[#E2E4E0] border border-[#E2E4E0] rounded-md text-xs">
              {activeProject.partners.map((p) => (
                <li key={p} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span>{p}</span>
                  {canEdit && activeProject.partners.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove partner ${p}`}
                      onClick={() =>
                        updateProjectSettings(pid, {
                          partners: activeProject.partners.filter((x) => x !== p),
                        })
                      }
                      className="text-[#525D68] hover:text-[#B91C1C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <form onSubmit={handleAddPartner} className="flex gap-1.5">
                <input
                  type="text"
                  value={newPartner}
                  onChange={(e) => setNewPartner(e.target.value)}
                  placeholder="Add partner..."
                  className="flex-1 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                />
                <button type="submit" className="px-2.5 py-1.5 bg-[#1B4D3E] text-white rounded text-xs">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Breakdowns */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-[#14191F]">Disaggregation Breakdowns ({activeProject.breakdowns.length})</h3>
            <ul className="divide-y divide-[#E2E4E0] border border-[#E2E4E0] rounded-md text-xs">
              {activeProject.breakdowns.map((b) => (
                <li key={b} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span>{b}</span>
                  {canEdit && activeProject.breakdowns.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove breakdown ${b}`}
                      onClick={() =>
                        updateProjectSettings(pid, {
                          breakdowns: activeProject.breakdowns.filter((x) => x !== b),
                        })
                      }
                      className="text-[#525D68] hover:text-[#B91C1C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <form onSubmit={handleAddBreakdown} className="flex gap-1.5">
                <input
                  type="text"
                  value={newBreakdown}
                  onChange={(e) => setNewBreakdown(e.target.value)}
                  placeholder="Add breakdown (e.g. Disability)..."
                  className="flex-1 bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                />
                <button type="submit" className="px-2.5 py-1.5 bg-[#1B4D3E] text-white rounded text-xs">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Locations */}
          <div className="space-y-2.5 md:col-span-2 lg:col-span-1">
            <h3 className="text-xs font-semibold text-[#14191F]">Locations ({activeProject.locations.length})</h3>
            {canEdit && (
              <form onSubmit={handleAddLocation} className="space-y-1.5 bg-[#F7F7F5] p-3 rounded-md border border-[#E2E4E0]">
                <input
                  type="text"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="New district or settlement zone..."
                  className="w-full bg-white border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={newLocRegion}
                    onChange={(e) => setNewLocRegion(e.target.value)}
                    placeholder="Region"
                    className="bg-white border border-[#E2E4E0] rounded px-2 py-1 text-xs"
                  />
                  <select
                    value={newLocPartner}
                    onChange={(e) => setNewLocPartner(e.target.value)}
                    className="bg-white border border-[#E2E4E0] rounded px-2 py-1 text-xs"
                  >
                    {activeProject.partners.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded"
                >
                  Add Location
                </button>
              </form>
            )}
          </div>

          {/* Reporting Cycles */}
          <div className="space-y-2.5 md:col-span-2">
            <h3 className="text-xs font-semibold text-[#14191F]">Reporting Cycles ({activeProject.reportingCycles.length})</h3>
            <div className="border border-[#E2E4E0] rounded-md divide-y divide-[#E2E4E0] text-xs">
              {activeProject.reportingCycles.map((cyc) => (
                <div key={cyc.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-[#14191F]">{cyc.label}</span>
                    <span className="text-[#525D68] ml-2 font-mono text-[11px]">
                      {cyc.startDate} → {cyc.endDate} (Due {cyc.dueDate})
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#525D68]">{cyc.status}</span>
                </div>
              ))}
            </div>
            {canEdit && (
              <form onSubmit={handleAddCycle} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newCycleLabel}
                  onChange={(e) => setNewCycleLabel(e.target.value)}
                  placeholder="New period label (e.g. H1 2024)"
                  className="flex-1 min-w-[160px] bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs"
                />
                <input
                  type="date"
                  value={newCycleDue}
                  onChange={(e) => setNewCycleDue(e.target.value)}
                  className="bg-[#F7F7F5] border border-[#E2E4E0] rounded px-2.5 py-1.5 text-xs font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded"
                >
                  Add Cycle
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
