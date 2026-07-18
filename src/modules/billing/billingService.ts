import { apiRequest } from '@/shared/api/apiClient';

export type BillingTier = 'free' | 'pro';
export type Entitlement = { productKey: string; allowed: boolean; used?: number; limit?: number | null; periodEnd?: string; reason?: string };
export type EntitlementSnapshot = { tier: BillingTier; status: string; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean; pendingSynchronization?: boolean; entitlements: Entitlement[] };
type EntitlementResponse = { tier: BillingTier; status: string; periodEnd: string; cancelAtPeriodEnd: boolean; products: Record<string, { allowed: boolean; limit: number | null; used: number | null }> };
type BillingSession = { url?: string; redirectUrl?: string; action?: 'manage_billing' };

const idempotencyKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const protectedPost = <T>(path: string) => apiRequest<T>(path, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: '{}' });
const sessionUrl = (session: BillingSession) => session.url || session.redirectUrl;

export const BillingService = {
  async getEntitlements(): Promise<EntitlementSnapshot> {
    const response = await apiRequest<EntitlementResponse>('/entitlements');
    return {
      tier: response.tier,
      status: response.status,
      currentPeriodEnd: response.periodEnd,
      cancelAtPeriodEnd: response.cancelAtPeriodEnd,
      pendingSynchronization: new URLSearchParams(window.location.search).get('checkout') === 'success' && response.tier !== 'pro',
      entitlements: Object.entries(response.products).map(([productKey, product]) => ({ productKey, ...product, periodEnd: response.periodEnd, reason: product.allowed ? undefined : 'Unavailable on your current plan' }))
    };
  },
  async openCheckoutOrPortal() {
    const session = await protectedPost<BillingSession>('/billing/checkout');
    if (session.action === 'manage_billing') return this.openPortal();
    const url = sessionUrl(session);
    if (!url) throw new Error('The billing service did not return a secure checkout link.');
    window.location.assign(url);
  },
  async openPortal() {
    const session = await protectedPost<BillingSession>('/billing/portal');
    const url = sessionUrl(session);
    if (!url) throw new Error('The billing service did not return a secure management link.');
    window.location.assign(url);
  }
};
