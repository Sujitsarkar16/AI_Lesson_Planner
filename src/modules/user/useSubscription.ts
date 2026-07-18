/**
 * useSubscription Hook
 * Manages user subscription state and operations
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { UserProfileService, UserProfile } from '@/modules/user/userProfileService';
import { UserSubscription } from '@/shared/types/document';

export const useSubscription = () => {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      loadSubscription();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadSubscription = async () => {
    if (!user?.sub) return;

    try {
      setIsLoading(true);
      
      // Get or create user profile
      const profile = await UserProfileService.getOrCreateUser(
        user.sub,
        user.email || '',
        user.name
      );

      if (profile) {
        setUserProfile(profile);
        
        const usage = await UserProfileService.checkUsageLimit(user.sub);
        setSubscription({
          tier: usage.tier,
          status: profile.subscription_status || 'active',
          currentPeriodEnd: profile.subscription_current_period_end || undefined,
          usageCount: usage.current,
          usageLimit: usage.limit
        });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUsageLimit = async (): Promise<boolean> => {
    if (!user?.sub) return false;

    try {
      const result = await UserProfileService.checkUsageLimit(user.sub);
      
      // Update local state
      if (subscription) {
        setSubscription({
          ...subscription,
          usageCount: result.current
        });
      }

      return result.allowed;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return false;
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (!user?.sub) return false;

    try {
      const success = await UserProfileService.incrementUsage(user.sub);
      
      if (success && subscription) {
        setSubscription({
          ...subscription,
          usageCount: subscription.usageCount + 1
        });
      }

      return success;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  const canGenerate = (): boolean => {
    if (!subscription) return false;
    return subscription.usageCount < subscription.usageLimit;
  };

  const canExport = (): boolean => {
    if (!subscription) return false;
    return subscription.usageCount < subscription.usageLimit;
  };

  const isPro = (): boolean => {
    return subscription?.tier === 'pro' || subscription?.tier === 'school';
  };

  const isSchool = (): boolean => {
    return subscription?.tier === 'school';
  };

  const getRemainingGenerations = (): number => {
    if (!subscription) return 0;
    if (subscription.usageLimit === 999999) return 999999; // Unlimited
    return Math.max(0, subscription.usageLimit - subscription.usageCount);
  };

  const getUsagePercentage = (): number => {
    if (!subscription) return 0;
    if (subscription.usageLimit === 999999) return 0; // Unlimited
    return (subscription.usageCount / subscription.usageLimit) * 100;
  };

  return {
    subscription,
    userProfile,
    isLoading,
    checkUsageLimit,
    incrementUsage,
    canGenerate,
    canExport,
    isPro,
    isSchool,
    getRemainingGenerations,
    getUsagePercentage,
    refreshSubscription: loadSubscription
  };
};
