import React from 'react';
import { formatApproval, formatProvenance, formatVerification } from '../../lib/mealEngine';
import { ApprovalStatus, ProvenanceType, VerificationStatus } from '../../types/meal';

export const ProvenanceText: React.FC<{ provenance: ProvenanceType }> = ({ provenance }) => {
  const color =
    provenance === 'sourced'
      ? 'text-[#1B4D3E]'
      : provenance === 'reconstructed'
      ? 'text-[#B45309]'
      : 'text-[#475569]';
  return <span className={`font-medium ${color}`}>{formatProvenance(provenance)}</span>;
};

export const ApprovalText: React.FC<{ status: ApprovalStatus }> = ({ status }) => {
  const color =
    status === 'approved'
      ? 'text-[#15803D]'
      : status === 'submitted'
      ? 'text-[#B45309]'
      : status === 'returned'
      ? 'text-[#B91C1C]'
      : 'text-[#525D68]';
  return <span className={`font-semibold ${color}`}>{formatApproval(status)}</span>;
};

export const VerificationText: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  const color =
    status === 'verified'
      ? 'text-[#15803D]'
      : status === 'flagged_discrepancy'
      ? 'text-[#B91C1C]'
      : status === 'fieldwork_required'
      ? 'text-[#B45309]'
      : 'text-[#525D68]';
  return <span className={`font-medium ${color}`}>{formatVerification(status)}</span>;
};

export const MetaLine: React.FC<{ items: React.ReactNode[]; className?: string }> = ({ items, className = '' }) => {
  const filtered = items.filter((item) => item !== null && item !== undefined && item !== false && item !== '');
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#525D68] ${className}`}>
      {filtered.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span aria-hidden="true" className="text-[#C5C9C2]">·</span>}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

export const SimulatedNotice: React.FC<{ label: string }> = ({ label }) => (
  <span className="font-mono text-[11px] text-[#525D68] bg-[#F0F1EE] px-2 py-0.5 rounded border border-[#E2E4E0]">
    Preview Simulation: {label}
  </span>
);
