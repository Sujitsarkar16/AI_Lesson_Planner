import React, { useState } from 'react';
import { ApiRequestError } from '@/shared/api/apiClient';
import { BillingService } from './billingService';
import { useSubscription } from '@/modules/user/useSubscription';

const formatPeriodEnd = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not available';

const BillingPage: React.FC = () => {
  const { subscription, entitlements, error, isLoading, refreshSubscription } = useSubscription();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const openBilling = async () => {
    setActionError(null); setIsRedirecting(true);
    try { await (subscription?.tier === 'pro' ? BillingService.openPortal() : BillingService.openCheckoutOrPortal()); }
    catch (requestError) { setActionError(requestError instanceof ApiRequestError ? requestError.message : 'Billing is temporarily unavailable. Please try again.'); setIsRedirecting(false); }
  };
  if (isLoading) return <p role="status" className="text-sm font-bold text-slate-500">Loading authoritative billing information…</p>;
  return <div className="mx-auto flex max-w-4xl flex-col gap-6"><header><p className="dashboard-kicker">Account</p><h1 className="mt-1 text-3xl font-extrabold font-display tracking-tight">Billing and access</h1><p className="mt-2 text-sm text-slate-500">Your plan and allowances are confirmed by the server.</p></header>{subscription?.pendingSynchronization && <div role="status" className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-900"><strong>Payment received — syncing access.</strong> Your prior access remains in place until Stripe verification completes. Refresh this page in a moment.</div>}{(error || actionError) && <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800">{actionError || error}</div>}<section className="dashboard-panel"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-extrabold capitalize">{subscription?.tier || 'Free'} plan</h2><p className="mt-1 text-sm text-slate-500">Status: {subscription?.status || 'unavailable'} · Renews or ends: {formatPeriodEnd(subscription?.currentPeriodEnd)}</p>{subscription?.cancelAtPeriodEnd && <p className="mt-1 text-sm font-bold text-yellow-700">Cancellation is scheduled at the period end.</p>}</div><div className="flex gap-2"><button type="button" className="dashboard-button bg-white" onClick={() => void refreshSubscription()}>Refresh</button><button type="button" disabled={isRedirecting} className="dashboard-button bg-brand-blue" onClick={() => void openBilling()}>{isRedirecting ? 'Opening secure billing…' : subscription?.tier === 'pro' ? 'Manage billing' : 'Upgrade to Pro — $5/month'}</button></div></div></section><section className="dashboard-panel"><h2 className="text-xl font-extrabold">Your entitlements</h2><ul className="mt-4 divide-y divide-slate-200">{entitlements.map((item) => <li key={item.productKey} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-bold">{item.productKey.replaceAll('_', ' ')}</span><span className={item.allowed ? 'text-green-700' : 'text-slate-500'}>{item.allowed ? item.limit == null ? 'Included' : `${item.used || 0} of ${item.limit}` : item.reason || 'Unavailable'}{item.periodEnd ? ` · renews ${formatPeriodEnd(item.periodEnd)}` : ''}</span></li>)}</ul></section></div>;
};
export default BillingPage;
