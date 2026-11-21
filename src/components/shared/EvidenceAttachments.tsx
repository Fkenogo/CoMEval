import React, { useRef, useState } from 'react';
import { Eye, FileText, Image as ImageIcon, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { EvidenceAttachment, EvidenceRequirement, SourceDocument } from '../../types/miledge';

interface EvidenceManagerProps {
  buttonLabel?: string;
  requirement?: EvidenceRequirement;
  attachments: EvidenceAttachment[];
  sourceDocuments: SourceDocument[];
  actorName: string;
  onAdd: (att: EvidenceAttachment) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

/**
 * Generates a lightweight persisted SVG Data URL for quick sample evidence
 * when the tester does not upload a local file (explicitly marked simulated: true).
 */
function createSimulatedSampleDataUrl(title: string, subtitle: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#F6F7F5"/>
    <rect x="24" y="24" width="592" height="312" rx="12" fill="#FFFFFF" stroke="#C5E5CD" stroke-width="2"/>
    <rect x="24" y="24" width="592" height="56" rx="12" fill="#14532D"/>
    <text x="48" y="59" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">Miledge M&amp;E — Sample Persisted Evidence</text>
    <text x="48" y="128" font-family="sans-serif" font-size="16" font-weight="bold" fill="#14191F">${title.replace(/[<>&"]/g, '')}</text>
    <text x="48" y="160" font-family="monospace" font-size="13" fill="#525D68">${subtitle.replace(/[<>&"]/g, '')}</text>
    <rect x="48" y="196" width="544" height="84" rx="8" fill="#EBF7EE" stroke="#C5E5CD"/>
    <text x="68" y="232" font-family="sans-serif" font-size="13" fill="#14532D">Simulated prototype file stored as an inline Data URL in localStorage.</text>
    <text x="68" y="256" font-family="sans-serif" font-size="12" fill="#14532D">Reload the browser page and click Open to verify persistence.</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const AttachmentPreviewModal: React.FC<{
  attachment: EvidenceAttachment | null;
  onClose: () => void;
}> = ({ attachment, onClose }) => {
  if (!attachment) return null;
  const isImage =
    attachment.dataUrl?.startsWith('data:image/') ||
    attachment.mimeType?.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E2E6E2] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-[#14532D] text-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{attachment.name}</div>
            <div className="text-[11px] text-white/80">
              {attachment.kind === 'source_ref' ? 'Persisted Source Reference' : 'Persisted Local File Attachment'}
              {attachment.simulated ? ' · Simulated sample' : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close attachment preview"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md hover:bg-white/15"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#14191F]">
          {attachment.dataUrl && isImage && (
            <div className="border border-[#E2E6E2] rounded-lg overflow-hidden bg-[#F6F7F5]">
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="w-full max-h-[420px] object-contain"
              />
            </div>
          )}

          {attachment.dataUrl && !isImage && (
            <div className="p-4 rounded-lg bg-[#F6F7F5] border border-[#E2E6E2] space-y-2">
              <div className="font-medium text-[#14191F]">
                Stored file ready for download ({attachment.mimeType || 'file'},{' '}
                {attachment.sizeBytes ? `${Math.round(attachment.sizeBytes / 1024)} KB` : 'persisted locally'}).
              </div>
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#14532D] text-white font-medium"
              >
                Download file
              </a>
            </div>
          )}

          {!attachment.dataUrl && (
            <div className="p-4 rounded-lg bg-[#EBF7EE] border border-[#C5E5CD] space-y-1.5">
              <div className="font-semibold text-[#14532D]">Persisted Source Reference</div>
              <div className="text-[#14191F] font-mono text-xs">
                {attachment.sourceRefText || attachment.name}
              </div>
            </div>
          )}

          <div className="text-[11px] text-[#525D68] border-t border-[#E2E6E2] pt-3 flex flex-wrap gap-x-4 gap-y-1">
            <span>Attached by: {attachment.uploadedBy}</span>
            <span>Date: {attachment.uploadedAt}</span>
            {attachment.sourceRefText && <span>Reference: {attachment.sourceRefText}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  buttonLabel = 'Add evidence',
  requirement,
  attachments,
  sourceDocuments,
  actorName,
  onAdd,
  onRemove,
  readOnly = false,
}) => {
  const [openPicker, setOpenPicker] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>(sourceDocuments[0]?.id || '');
  const [refNote, setRefNote] = useState('');
  const [fileError, setFileError] = useState('');
  const [previewItem, setPreviewItem] = useState<EvidenceAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit base64 persistence to ~1.5 MB to keep localStorage reliable across reloads
    if (file.size > 1_500_000) {
      setFileError('File exceeds 1.5 MB browser localStorage limit. Attach a smaller image/PDF or log a source reference.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      onAdd({
        id: `ev-${Date.now()}`,
        kind: file.type.startsWith('image/') ? 'photo' : 'file',
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        dataUrl,
        sourceRefText: refNote.trim() || undefined,
        uploadedAt: stamp(),
        uploadedBy: actorName,
        simulated: false,
      });
      setRefNote('');
      setOpenPicker(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAttachSourceRef = () => {
    const doc = sourceDocuments.find((d) => d.id === selectedDocId);
    const label = doc
      ? `${doc.title}${refNote.trim() ? ` — ${refNote.trim()}` : ''}`
      : refNote.trim();
    if (!label) return;
    onAdd({
      id: `ev-ref-${Date.now()}`,
      kind: 'source_ref',
      name: label,
      sourceDocumentId: doc?.id,
      sourceRefText: doc ? `${doc.reference}${refNote.trim() ? ` · ${refNote.trim()}` : ''}` : refNote.trim(),
      uploadedAt: stamp(),
      uploadedBy: actorName,
      simulated: false,
    });
    setRefNote('');
    setOpenPicker(false);
  };

  const handleAttachSimulatedFile = () => {
    const reqName = requirement?.label || 'Field Verification Evidence';
    const fileName = `${reqName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.svg`;
    onAdd({
      id: `ev-sim-${Date.now()}`,
      kind: 'photo',
      name: `${fileName} (Simulated)`,
      mimeType: 'image/svg+xml',
      dataUrl: createSimulatedSampleDataUrl(
        reqName,
        `Ref: ${refNote.trim() || 'Generated demo attachment'} · ${stamp()}`
      ),
      sourceRefText: refNote.trim() || `Simulated sample for: ${reqName}`,
      uploadedAt: stamp(),
      uploadedBy: actorName,
      simulated: true,
    });
    setRefNote('');
    setOpenPicker(false);
  };

  return (
    <div className="space-y-2.5">
      {requirement && (
        <div className="text-xs text-[#525D68] flex flex-wrap items-center justify-between gap-1">
          <span>
            Expected evidence: <strong className="text-[#14191F]">{requirement.label}</strong>
          </span>
          <span className={requirement.required ? 'text-[#B45309] font-medium' : 'text-[#525D68]'}>
            {requirement.required ? 'Required for verification' : 'Optional'}
          </span>
        </div>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={() => setOpenPicker((v) => !v)}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-[#C5C9C2] bg-white hover:bg-[#F6F7F5] text-sm font-semibold text-[#14191F] flex items-center justify-center gap-2 transition-colors"
        >
          <Paperclip className="w-4 h-4 text-[#14532D]" />
          <span>{buttonLabel}</span>
          {attachments.length > 0 && (
            <span className="font-mono text-xs text-[#14532D]">({attachments.length})</span>
          )}
        </button>
      )}

      {openPicker && !readOnly && (
        <div className="rounded-lg border border-[#E2E6E2] bg-[#F6F7F5] p-3.5 space-y-3 text-xs">
          <div className="space-y-1.5">
            <div className="font-semibold text-[#14191F]">1. Upload a photo or file (persists across reload)</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.csv,.txt,.doc,.docx,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-md bg-[#14532D] text-white font-medium hover:bg-[#0F3F22]"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose local file / photo
              </button>
              <button
                type="button"
                onClick={handleAttachSimulatedFile}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-md border border-[#C5C9C2] bg-white text-[#14191F] font-medium hover:bg-[#F6F7F5]"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#14532D]" />
                Attach sample file (Simulated)
              </button>
            </div>
            {fileError && <p className="text-[#B91C1C] font-medium">{fileError}</p>}
          </div>

          <div className="border-t border-[#E2E6E2] pt-3 space-y-2">
            <div className="font-semibold text-[#14191F]">2. Link existing source document or reference</div>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full min-h-[40px] rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5 text-xs text-[#14191F]"
            >
              <option value="">Custom source reference (no project document selected)</option>
              {sourceDocuments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.version})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={refNote}
              onChange={(e) => setRefNote(e.target.value)}
              placeholder="Contract #, table/row, or page citation (e.g. Contract TRN-2023-11)"
              className="w-full min-h-[40px] rounded-md border border-[#C5C9C2] bg-white px-2.5 py-1.5 text-xs text-[#14191F]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAttachSourceRef}
                className="min-h-[38px] px-3 py-1.5 rounded-md bg-[#14532D] text-white font-medium hover:bg-[#0F3F22]"
              >
                Save source reference
              </button>
              <button
                type="button"
                onClick={() => setOpenPicker(false)}
                className="min-h-[38px] px-3 py-1.5 text-[#525D68] hover:text-[#14191F]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing attachments list */}
      {attachments.length > 0 && (
        <ul className="divide-y divide-[#E2E6E2] border border-[#E2E6E2] rounded-lg bg-white text-xs">
          {attachments.map((att) => (
            <li key={att.id} className="px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {att.kind === 'photo' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-medium text-[#14191F] truncate">{att.name}</div>
                  {att.sourceRefText && (
                    <div className="text-[11px] text-[#525D68] truncate">{att.sourceRefText}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewItem(att)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#14532D] hover:underline"
                >
                  <Eye className="w-3 h-3" /> Open
                </button>
                {!readOnly && onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(att.id)}
                    aria-label={`Remove ${att.name}`}
                    className="p-1 text-[#525D68] hover:text-[#B91C1C]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AttachmentPreviewModal attachment={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
};
