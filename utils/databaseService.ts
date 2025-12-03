/**
 * Database Service
 * Handles all database operations with Supabase
 */

import { supabase } from './supabaseClient';
import { LessonPlan } from '../types';

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

/**
 * User Management
 */
export const DatabaseService = {
  /**
   * Get or create user profile
   */
  async getOrCreateUser(auth0Id: string, email: string, name?: string): Promise<UserProfile | null> {
    try {
      // Try to get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth0_id', auth0Id)
        .single();

      if (existingUser && !fetchError) {
        return existingUser;
      }

      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          auth0_id: auth0Id,
          email,
          name,
          subscription_tier: 'free',
          usage_count: 0,
          usage_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return null;
      }

      return newUser;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      return null;
    }
  },

  /**
   * Get user profile by Auth0 ID
   */
  async getUserByAuth0Id(auth0Id: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth0_id', auth0Id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserByAuth0Id:', error);
      return null;
    }
  },

  /**
   * Update user subscription
   */
  async updateUserSubscription(
    userId: string,
    tier: 'free' | 'pro' | 'school',
    subscriptionId?: string,
    status?: string,
    periodEnd?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          subscription_tier: tier,
          subscription_id: subscriptionId || null,
          subscription_status: status || null,
          subscription_current_period_end: periodEnd || null
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserSubscription:', error);
      return false;
    }
  },

  /**
   * Check usage limit for user
   */
  async checkUsageLimit(auth0Id: string): Promise<UsageLimit> {
    try {
      const { data, error } = await supabase.rpc('check_usage_limit', {
        user_auth0_id: auth0Id
      });

      if (error) {
        console.error('Error checking usage limit:', error);
        return {
          allowed: false,
          current: 0,
          limit: 5,
          tier: 'free',
          reason: 'Error checking limit'
        };
      }

      return data as UsageLimit;
    } catch (error) {
      console.error('Error in checkUsageLimit:', error);
      return {
        allowed: false,
        current: 0,
        limit: 5,
        tier: 'free',
        reason: 'Error checking limit'
      };
    }
  },

  /**
   * Increment usage count
   */
  async incrementUsage(auth0Id: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('increment_usage', {
        user_auth0_id: auth0Id
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in incrementUsage:', error);
      return false;
    }
  },

  /**
   * Document Management
   */

  /**
   * Get all documents for user
   */
  async getDocuments(userId: string): Promise<LessonPlan[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return [];
      }

      // Transform to LessonPlan format
      return data.map(doc => ({
        id: doc.id,
        title: doc.title,
        subject: doc.subject,
        grade: doc.grade,
        dateCreated: doc.created_at.split('T')[0],
        content: doc.content,
        duration: doc.duration || undefined,
        type: doc.type,
        templateId: doc.template_id || undefined,
        imageUrl: doc.image_url || undefined,
        metadata: doc.metadata
      }));
    } catch (error) {
      console.error('Error in getDocuments:', error);
      return [];
    }
  },

  /**
   * Get single document
   */
  async getDocument(documentId: string): Promise<LessonPlan | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        console.error('Error fetching document:', error);
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        dateCreated: data.created_at.split('T')[0],
        content: data.content,
        duration: data.duration || undefined,
        type: data.type,
        templateId: data.template_id || undefined,
        imageUrl: data.image_url || undefined,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error in getDocument:', error);
      return null;
    }
  },

  /**
   * Create new document
   */
  async createDocument(userId: string, document: Omit<LessonPlan, 'id' | 'dateCreated'>): Promise<LessonPlan | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          type: document.type || 'lesson-plan',
          title: document.title,
          subject: document.subject,
          grade: document.grade,
          content: document.content || '',
          metadata: document.metadata || {},
          template_id: document.templateId || null,
          image_url: document.imageUrl || null,
          duration: document.duration || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating document:', error);
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        dateCreated: data.created_at.split('T')[0],
        content: data.content,
        duration: data.duration || undefined,
        type: data.type,
        templateId: data.template_id || undefined,
        imageUrl: data.image_url || undefined,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error in createDocument:', error);
      return null;
    }
  },

  /**
   * Update document
   */
  async updateDocument(documentId: string, updates: Partial<LessonPlan>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.subject) updateData.subject = updates.subject;
      if (updates.grade) updateData.grade = updates.grade;
      if (updates.content) updateData.content = updates.content;
      if (updates.metadata) updateData.metadata = updates.metadata;
      if (updates.templateId) updateData.template_id = updates.templateId;
      if (updates.imageUrl) updateData.image_url = updates.imageUrl;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.type) updateData.type = updates.type;

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) {
        console.error('Error updating document:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateDocument:', error);
      return false;
    }
  },

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error deleting document:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      return false;
    }
  },

  /**
   * Subscription Management
   */

  /**
   * Create subscription record
   */
  async createSubscription(subscription: {
    userId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    status: string;
    plan: 'pro' | 'school';
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: subscription.userId,
          stripe_subscription_id: subscription.stripeSubscriptionId,
          stripe_customer_id: subscription.stripeCustomerId,
          status: subscription.status,
          plan: subscription.plan,
          current_period_start: subscription.currentPeriodStart,
          current_period_end: subscription.currentPeriodEnd
        });

      if (error) {
        console.error('Error creating subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createSubscription:', error);
      return false;
    }
  },

  /**
   * Update subscription
   */
  async updateSubscription(
    stripeSubscriptionId: string,
    updates: {
      status?: string;
      plan?: 'pro' | 'school';
      currentPeriodEnd?: string;
      cancelAtPeriodEnd?: boolean;
    }
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.plan) updateData.plan = updates.plan;
      if (updates.currentPeriodEnd) updateData.current_period_end = updates.currentPeriodEnd;
      if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Error updating subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSubscription:', error);
      return false;
    }
  },

  /**
   * Usage Logging
   */

  /**
   * Log usage event
   */
  async logUsage(
    userId: string,
    actionType: string,
    documentType?: string,
    tokensUsed?: number,
    metadata?: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('usage_logs')
        .insert({
          user_id: userId,
          action_type: actionType,
          document_type: documentType || null,
          tokens_used: tokensUsed || null,
          metadata: metadata || {}
        });

      if (error) {
        console.error('Error logging usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in logUsage:', error);
      return false;
    }
  },

  /**
   * Get usage stats
   */
  async getUsageStats(userId: string, days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching usage stats:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error in getUsageStats:', error);
      return [];
    }
  },

  /**
   * Migration Utilities
   */

  /**
   * Migrate localStorage data to database
   */
  async migrateLocalStorageData(userId: string): Promise<{ success: boolean; count: number }> {
    try {
      const savedPlans = localStorage.getItem('savedPlans');
      if (!savedPlans) {
        return { success: true, count: 0 };
      }

      const plans: LessonPlan[] = JSON.parse(savedPlans);
      let successCount = 0;

      for (const plan of plans) {
        const { id, dateCreated, ...planData } = plan;
        const result = await this.createDocument(userId, planData);
        if (result) {
          successCount++;
        }
      }

      // Clear localStorage after successful migration
      if (successCount > 0) {
        localStorage.removeItem('savedPlans');
      }

      return { success: true, count: successCount };
    } catch (error) {
      console.error('Error migrating localStorage data:', error);
      return { success: false, count: 0 };
    }
  }
};
