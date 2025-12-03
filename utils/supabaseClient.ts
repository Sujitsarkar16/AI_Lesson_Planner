/**
 * Supabase Client Configuration
 * Provides a configured Supabase client for database operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'ai-lesson-planner'
    }
  }
});

/**
 * Database Types
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
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
        };
        Insert: {
          id?: string;
          auth0_id: string;
          email: string;
          name?: string | null;
          subscription_tier?: 'free' | 'pro' | 'school';
          subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          usage_count?: number;
          usage_reset_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth0_id?: string;
          email?: string;
          name?: string | null;
          subscription_tier?: 'free' | 'pro' | 'school';
          subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          usage_count?: number;
          usage_reset_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          type: 'lesson-plan' | 'syllabus' | 'paper' | 'quiz' | 'study-notes' | 'concept-map' | 'other';
          title: string;
          subject: string;
          grade: string;
          content: string;
          metadata: any;
          template_id: string | null;
          image_url: string | null;
          duration: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'lesson-plan' | 'syllabus' | 'paper' | 'quiz' | 'study-notes' | 'concept-map' | 'other';
          title: string;
          subject: string;
          grade: string;
          content: string;
          metadata?: any;
          template_id?: string | null;
          image_url?: string | null;
          duration?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'lesson-plan' | 'syllabus' | 'paper' | 'quiz' | 'study-notes' | 'concept-map' | 'other';
          title?: string;
          subject?: string;
          grade?: string;
          content?: string;
          metadata?: any;
          template_id?: string | null;
          image_url?: string | null;
          duration?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status: string;
          plan: 'pro' | 'school';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status: string;
          plan: 'pro' | 'school';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string;
          stripe_customer_id?: string;
          status?: string;
          plan?: 'pro' | 'school';
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          document_type: string | null;
          tokens_used: number | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          document_type?: string | null;
          tokens_used?: number | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          document_type?: string | null;
          tokens_used?: number | null;
          metadata?: any;
          created_at?: string;
        };
      };
    };
  };
}
