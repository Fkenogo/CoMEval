import React from 'react';
import { CollectionQuestion } from '../../types/miledge';

interface DynamicQuestionBlockProps {
  questions: CollectionQuestion[];
  answers: Record<string, string | number | boolean>;
  onChange?: (questionId: string, value: string | number | boolean) => void;
  readOnly?: boolean;
  emptyLabel?: string;
  calculatedPreview?: string | null;
  headerNote?: string;
}

/**
 * Shared light-green (#EBF7EE) configuration-loaded question block.
 * Visual convention from the Miledge M&E guides: light-green surface signals
 * fields loaded dynamically from saved project configuration.
 */
export const DynamicQuestionBlock: React.FC<DynamicQuestionBlockProps> = ({
  questions,
  answers,
  onChange,
  readOnly = false,
  emptyLabel = 'No custom questions configured for this item.',
  calculatedPreview,
  headerNote,
}) => {
  if (questions.length === 0) {
    return (
      <div className="rounded-xl bg-[#EBF7EE] border border-[#C5E5CD] p-4 text-xs text-[#14532D] animate-config-reveal">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#EBF7EE] border border-[#C5E5CD] p-4 space-y-4 animate-config-reveal">
      {headerNote && (
        <div className="text-[11px] font-medium text-[#14532D]/85">{headerNote}</div>
      )}

      {questions.map((q) => {
        const val = answers[q.id];
        const fieldId = `cfg-q-${q.id}`;
        const inputBase =
          'w-full min-h-[44px] rounded-lg border border-[#B8D4BE] bg-white px-3 py-2 text-sm text-[#14191F] focus:outline-none focus:border-[#14532D] disabled:bg-[#F6F7F5] disabled:text-[#525D68]';

        return (
          <div key={q.id} className="space-y-1.5">
            <label htmlFor={fieldId} className="block text-sm font-semibold text-[#14191F]">
              {q.label}
              {q.required && <span className="text-[#B91C1C] ml-1" aria-label="Required">*</span>}
            </label>

            {q.type === 'whole_number' && (
              <input
                id={fieldId}
                type="number"
                step={1}
                min={q.min}
                max={q.max}
                disabled={readOnly}
                value={val === undefined || val === null ? '' : String(val)}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange?.(q.id, raw === '' ? '' : Number(raw));
                }}
                placeholder={q.min !== undefined && q.max !== undefined ? `${q.min}–${q.max}` : 'Enter whole number'}
                className={`${inputBase} font-mono tabular-nums`}
              />
            )}

            {q.type === 'decimal' && (
              <input
                id={fieldId}
                type="number"
                step="any"
                min={q.min}
                max={q.max}
                disabled={readOnly}
                value={val === undefined || val === null ? '' : String(val)}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange?.(q.id, raw === '' ? '' : Number(raw));
                }}
                placeholder="Enter decimal value"
                className={`${inputBase} font-mono tabular-nums`}
              />
            )}

            {q.type === 'short_text' && (
              <input
                id={fieldId}
                type="text"
                disabled={readOnly}
                value={val === undefined || val === null ? '' : String(val)}
                onChange={(e) => onChange?.(q.id, e.target.value)}
                placeholder="Enter short text"
                className={inputBase}
              />
            )}

            {q.type === 'long_text' && (
              <textarea
                id={fieldId}
                rows={3}
                disabled={readOnly}
                value={val === undefined || val === null ? '' : String(val)}
                onChange={(e) => onChange?.(q.id, e.target.value)}
                placeholder="Enter detailed observation"
                className={`${inputBase} min-h-[84px]`}
              />
            )}

            {q.type === 'yes_no' && (
              <div className="flex items-center gap-2">
                {(['Yes', 'No'] as const).map((opt) => {
                  const active = val === opt || (opt === 'Yes' && val === true) || (opt === 'No' && val === false);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={readOnly}
                      onClick={() => onChange?.(q.id, opt)}
                      className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#14532D] border-[#14532D] text-white'
                          : 'bg-white border-[#B8D4BE] text-[#14191F] hover:bg-[#F6F7F5]'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'choice' && (
              <select
                id={fieldId}
                disabled={readOnly}
                value={val === undefined || val === null ? '' : String(val)}
                onChange={(e) => onChange?.(q.id, e.target.value)}
                className={inputBase}
              >
                <option value="">Select an option</option>
                {(q.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {(q.helpText || q.indicatorMapping) && (
              <div className="text-[11px] text-[#14532D]/80 flex flex-wrap items-center gap-x-2">
                {q.helpText && <span>{q.helpText}</span>}
                {q.indicatorMapping && (
                  <span className="font-mono">
                    Maps to indicator input ({q.indicatorMapping.role})
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {calculatedPreview && (
        <div className="pt-2 border-t border-[#C5E5CD] flex items-center justify-between text-xs text-[#14532D]">
          <span className="font-medium">Calculated result preview</span>
          <span className="font-mono font-semibold text-sm tabular-nums">{calculatedPreview}</span>
        </div>
      )}
    </div>
  );
};
