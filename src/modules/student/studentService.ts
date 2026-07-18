import { apiRequest } from '@/shared/api/apiClient';

export const StudentService = {
  async verifyStudentCode(code: string): Promise<{ id: string; name: string; grade: string } | null> {
    try {
      return await apiRequest('/student/login', { method: 'POST', body: JSON.stringify({ code }) });
    } catch (error) {
      console.error('Error verifying student code:', error);
      return null;
    }
  },

  async logoutStudent(): Promise<void> {
    try {
      await apiRequest('/student/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error ending student session:', error);
    }
  },

  async getStudentAssignments(_studentId: string): Promise<any[]> {
    try {
      return await apiRequest<any[]>('/student/assignments');
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  },

  async submitAssignment(submission: { assignmentId: string; answers: any; score: number; feedback?: any }): Promise<boolean> {
    try {
      await apiRequest(`/student/assignments/${submission.assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify(submission)
      });
      return true;
    } catch (error) {
      console.error('Error submitting assignment:', error);
      return false;
    }
  }
};
