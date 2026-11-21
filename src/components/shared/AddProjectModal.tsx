import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMiledge } from '../../context/MiledgeContext';

export const AddProjectModal: React.FC = () => {
  const { state, setAddProjectModalOpen, createProject } = useMiledge();
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [code, setCode] = useState('');
  const [donor, setDonor] = useState('');
  const [implementingLead, setImplementingLead] = useState('');
  const [timeframe, setTimeframe] = useState('2025 – 2026');
  const [description, setDescription] = useState('');

  if (!state.addProjectModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProject({
      name: name.trim(),
      shortName: shortName.trim() || name.trim().slice(0, 18),
      code: code.trim() || `PRJ-${String(Date.now()).slice(-4)}`,
      donor: donor.trim() || 'Programme Funder',
      implementingLead: implementingLead.trim() || 'Implementing Team',
      timeframe: timeframe.trim() || '2025 – 2026',
      description: description.trim(),
    });
    setName('');
    setShortName('');
    setCode('');
    setDonor('');
    setImplementingLead('');
    setDescription('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 no-print"
      onClick={() => setAddProjectModalOpen(false)}
    >
      <div
        className="bg-white border border-[#E2E6E2] rounded-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-[#14532D] text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display">Add New Project</h2>
            <p className="text-xs text-white/80">
              Creates a fresh project on the shared Miledge M&amp;E engine and opens Plan setup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddProjectModalOpen(false)}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md hover:bg-white/15"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-sm">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#14191F]">
              Project Name <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Karamoja Youth Nutrition & Water Pilot"
              className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm focus:outline-none focus:border-[#14532D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#14191F]">Short Name</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g., Karamoja Pilot"
                className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#14191F]">Project Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., KYN-2025"
                className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#14191F]">Funder / Donor</label>
              <input
                type="text"
                value={donor}
                onChange={(e) => setDonor(e.target.value)}
                placeholder="e.g., East Africa Resilience Fund"
                className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#14191F]">Timeframe</label>
              <input
                type="text"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="e.g., 2025 – 2026"
                className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm focus:outline-none focus:border-[#14532D]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#14191F]">Implementing Lead</label>
            <input
              type="text"
              value={implementingLead}
              onChange={(e) => setImplementingLead(e.target.value)}
              placeholder="e.g., Local Partner Consortium"
              className="w-full min-h-[42px] rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm focus:outline-none focus:border-[#14532D]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#14191F]">Brief Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objective and geographic scope..."
              className="w-full rounded-lg border border-[#C5C9C2] px-3 py-2 text-sm focus:outline-none focus:border-[#14532D]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddProjectModalOpen(false)}
              className="min-h-[42px] px-4 py-2 text-xs font-medium text-[#525D68] hover:text-[#14191F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F22]"
            >
              Create Project &amp; Open Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
