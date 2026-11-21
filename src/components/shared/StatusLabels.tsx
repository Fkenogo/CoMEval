import React from 'react';
import { formatProvenanceKind, formatRecordStatus } from '../../lib/engine';
import { ProvenanceKind, RecordStatus } from '../../types/miledge';

export const StatusLabel: React.FC<{ status: RecordStatus }> = ({ status }) => {
  const color =
    status === 'approved'
      ? 'text-[#15803D]'
      : status === 'verified'
      ? 'text-[#14532D]'
      : status === 'submitted'
      ? 'text-[#B45309]'
      : status === 'returned'
      ? 'text-[#B91C1C]'
      : 'text-[#525D68]';

  return <span className={`font-semibold ${color}`}>{formatRecordStatus(status)}</span>;
};

export const ProvenanceLabel: React.FC<{ provenance: ProvenanceKind }> = ({ provenance }) => {
  const color =
    provenance === 'historical_sourced'
      ? 'text-[#14532D]'
      : provenance === 'reconstructed_endline'
      ? 'text-[#B45309]'
      : 'text-[#525D68]';

  return <span className={`font-medium ${color}`}>{formatProvenanceKind(provenance)}</span>;
};

export const MetaRow: React.FC<{ items: React.ReactNode[]; className?: string }> = ({
  items,
  className = '',
}) => {
  const clean = items.filter((item) => item !== null && item !== undefined && item !== false && item !== '');
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#525D68] ${className}`}>
      {clean.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <span aria-hidden="true" className="text-[#C5C9C2]">
              ·
            </span>
          )}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
};
