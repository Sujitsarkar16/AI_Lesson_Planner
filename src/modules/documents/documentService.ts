import { apiRequest } from '@/shared/api/apiClient';
import { LessonPlan } from '@/shared/types/document';
import { getSavedPlans, replaceSavedPlans } from './savedPlansStorage';

export const DocumentService = {
  async getDocuments(_userId: string): Promise<LessonPlan[]> {
    try {
      return await apiRequest<LessonPlan[]>('/documents');
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  },

  async createDocument(_userId: string, document: Omit<LessonPlan, 'id' | 'dateCreated'>): Promise<LessonPlan | null> {
    try {
      return await apiRequest<LessonPlan>('/documents', { method: 'POST', body: JSON.stringify(document) });
    } catch (error) {
      console.error('Error creating document:', error);
      return null;
    }
  },

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await apiRequest(`/documents/${documentId}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  },

  async migrateLocalStorageData(userId: string): Promise<{ success: boolean; count: number }> {
    try {
      const plans = getSavedPlans();
      if (!plans.length) return { success: true, count: 0 };

      const failedPlans: LessonPlan[] = [];
      let count = 0;
      for (const plan of plans) {
        const { id, dateCreated, ...document } = plan;
        if (await this.createDocument(userId, document)) count += 1;
        else failedPlans.push(plan);
      }
      replaceSavedPlans(failedPlans);
      return { success: failedPlans.length === 0, count };
    } catch (error) {
      console.error('Error migrating local storage:', error);
      return { success: false, count: 0 };
    }
  }
};
