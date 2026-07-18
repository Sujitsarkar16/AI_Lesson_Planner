import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { BillingService, type EntitlementSnapshot } from '@/modules/billing/billingService';

/** Server entitlements are display data only; protected actions are authorized by their API endpoint. */
export const useSubscription = () => {
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<EntitlementSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated) { setSubscription(null); setIsLoading(false); return; }
    setIsLoading(true);
    try { setSubscription(await BillingService.getEntitlements()); setError(null); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load billing information.'); }
    finally { setIsLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { void refreshSubscription(); }, [refreshSubscription]);
  return { subscription, entitlements: subscription?.entitlements || [], isLoading, error, isPro: () => subscription?.tier === 'pro', refreshSubscription };
};
