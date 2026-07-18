import { apiDownload, apiRequest } from '@/shared/api/apiClient';
import { LessonPlan } from '@/shared/types/document';
import { getSavedPlans, replaceSavedPlans } from './savedPlansStorage';

export type ExportJob = { id: string; status: 'queued' | 'retrying' | 'completed' | 'failed'; artifactId?: string; error?: string; job?: ExportJob };
const exportJob = (value: ExportJob) => value.job || value;
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export const DocumentService = {
  async getDocuments(_userId: string): Promise<LessonPlan[]> {
    try {
      const documents = await apiRequest<unknown>('/documents');
      if (Array.isArray(documents)) return documents as LessonPlan[];
      console.error('Documents API returned an unexpected response shape.');
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
    return [];
  },
  async createDocument(_userId: string, document: Omit<LessonPlan, 'id' | 'dateCreated'>): Promise<LessonPlan | null> {
    try { return await apiRequest<LessonPlan>('/documents', { method: 'POST', body: JSON.stringify(document) }); }
    catch (error) { console.error('Error creating document:', error); return null; }
  },
  async deleteDocument(documentId: string): Promise<boolean> {
    try { await apiRequest(`/documents/${documentId}`, { method: 'DELETE' }); return true; }
    catch (error) { console.error('Error deleting document:', error); return false; }
  },
  requestExport(documentId: string, format: 'pdf' | 'docx') { return apiRequest<ExportJob>(`/documents/${encodeURIComponent(documentId)}/exports/${format}`, { method: 'POST', headers: { 'Idempotency-Key': globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}` }, body: JSON.stringify({}) }).then(exportJob); },
  async pollExportJob(job: ExportJob, onStatus: (status: ExportJob['status']) => void) {
    let current = job;
    while (true) {
      onStatus(current.status);
      if (current.status === 'completed' || current.status === 'failed') return current;
      await wait(1000);
      current = exportJob(await apiRequest<ExportJob>(`/export-jobs/${encodeURIComponent(current.id)}`));
    }
  },
  downloadExport: (artifactId: string) => apiDownload(`/exports/${encodeURIComponent(artifactId)}`),
  async migrateLocalStorageData(userId: string): Promise<{ success: boolean; count: number }> {
    try { const plans = getSavedPlans(); if (!plans.length) return { success: true, count: 0 }; const failedPlans: LessonPlan[] = []; let count = 0; for (const plan of plans) { const { id, dateCreated, ...document } = plan; if (await this.createDocument(userId, document)) count += 1; else failedPlans.push(plan); } replaceSavedPlans(failedPlans); return { success: failedPlans.length === 0, count }; }
    catch (error) { console.error('Error migrating local storage:', error); return { success: false, count: 0 }; }
  }
};
