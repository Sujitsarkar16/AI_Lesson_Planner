import React, { useState } from 'react';
import { ApiRequestError } from '@/shared/api/apiClient';
import { LessonPlan } from '@/shared/types/document';
import { DocumentService, type ExportJob } from './documentService';

interface ExportModalProps { isOpen: boolean; onClose: () => void; document: LessonPlan; }
const statusMessage: Record<ExportJob['status'], string> = { queued: 'Queued for secure export…', retrying: 'Retrying export…', completed: 'Export ready.', failed: 'Export failed.' };

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, document: exportDocument }) => {
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [status, setStatus] = useState<ExportJob['status'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;
  const handleExport = async () => {
    setError(null);
    try {
      const completed = await DocumentService.pollExportJob(await DocumentService.requestExport(exportDocument.id, format), setStatus);
      if (completed.status === 'failed') throw new Error(completed.error || 'The server could not create this export.');
      if (!completed.artifactId) throw new Error('The export completed without a download artifact.');
      const { blob, filename } = await DocumentService.downloadExport(completed.artifactId);
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename || `${exportDocument.title}.${format}`; link.click(); URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : requestError instanceof Error ? requestError.message : 'Could not request an export.');
      setStatus(null);
    }
  };
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="export-title" className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-black bg-white shadow-neo-lg dark:bg-slate-800"><header className="flex items-center justify-between border-b-2 border-black bg-brand-blue px-6 py-4 text-white"><div><h2 id="export-title" className="text-2xl font-black font-display">Export document</h2><p className="mt-1 text-sm text-white/80">{exportDocument.title}</p></div><button type="button" aria-label="Close export dialog" onClick={onClose}><span className="material-symbols-outlined text-3xl">close</span></button></header><div className="space-y-4 p-6"><p className="text-sm text-slate-600 dark:text-slate-300">PDF and DOCX exports are created by the server. Availability is checked against your current plan when you request the export.</p><fieldset disabled={status === 'queued' || status === 'retrying'}><legend className="mb-3 text-sm font-bold">Export format</legend><div className="grid grid-cols-2 gap-3">{(['pdf', 'docx'] as const).map((value) => <label key={value} className={`cursor-pointer rounded-xl border-2 border-black p-4 text-center font-bold ${format === value ? 'bg-brand-blue text-white' : 'bg-slate-50 dark:bg-slate-700'}`}><input className="sr-only" type="radio" name="export-format" value={value} checked={format === value} onChange={() => setFormat(value)} />{value.toUpperCase()}</label>)}</div></fieldset>{status && <p role="status" aria-live="polite" className="rounded-lg bg-blue-50 p-3 text-sm font-bold text-blue-800">{statusMessage[status]}</p>}{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}</div><footer className="flex gap-3 border-t-2 border-black bg-slate-50 px-6 py-4 dark:bg-slate-900"><button type="button" onClick={onClose} className="flex-1 rounded-xl border-2 border-black bg-white px-4 py-3 font-bold text-slate-900">Cancel</button><button type="button" disabled={status === 'queued' || status === 'retrying'} onClick={() => void handleExport()} className="flex-1 rounded-xl border-2 border-black bg-brand-blue px-4 py-3 font-bold text-white disabled:opacity-50">{status ? statusMessage[status] : `Request ${format.toUpperCase()} export`}</button></footer></div></div>;
};
export default ExportModal;
