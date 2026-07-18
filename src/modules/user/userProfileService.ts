import { apiRequest } from '@/shared/api/apiClient';

export interface UserProfile {
  id: string;
  auth0_id: string;
  email: string;
  name: string | null;
  subscription_tier: 'free' | 'pro' | 'school';
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  usage_count: number;
  usage_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface UsageLimit {
  allowed: boolean;
  current: number;
  limit: number;
  tier: 'free' | 'pro' | 'school';
  reason?: string;
}

export const UserProfileService = {
  async getOrCreateUser(_auth0Id: string, email: string, name?: string): Promise<UserProfile | null> {
    try {
      return await apiRequest<UserProfile>('/profile', { method: 'POST', body: JSON.stringify({ email, name }) });
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  },

  async getUserByAuth0Id(_auth0Id: string): Promise<UserProfile | null> {
    try {
      return await apiRequest<UserProfile>('/profile');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  async checkUsageLimit(_auth0Id: string): Promise<UsageLimit> {
    try {
      return await apiRequest<UsageLimit>('/usage/check', { method: 'POST' });
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return { allowed: false, current: 0, limit: 5, tier: 'free', reason: 'Error checking limit' };
    }
  },

  async incrementUsage(_auth0Id: string): Promise<boolean> {
    try {
      await apiRequest('/usage/increment', { method: 'POST' });
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }
};
