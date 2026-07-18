import Stripe from 'stripe';
import { GridFSBucket, ObjectId, type Db } from 'mongodb';
import type { AuthenticatedUser } from '../../shared/auth.js';
import { getDatabase } from '../../shared/database.js';
import { getServerConfiguration } from '../../shared/config.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { appendAnalytics, appendAudit, clearFlagCache, entitlementResponse, evaluateFlag, featureFlagInput, idempotencyKey, opaqueAccountRef, requireAdmin, resolveEntitlement } from './core.js';
import { createExportJob, jobResponse, ownedJob } from './jobs.js';

const unavailable = (res: ApiResponse) => json(res, 503, { error: 'Billing service is temporarily unavailable.', code: 'BillingUnavailable' });
const userId = (profile: any) => profile._id as ObjectId;
const configuredStripe = () => { const configuration = getServerConfiguration(); return configuration.stripe && configuration.publicAppOrigin ? configuration : undefined; };
const stripeClient = (configuration: NonNullable<ReturnType<typeof configuredStripe>>) => new Stripe(configuration.stripe!.secretKey);
const requestPath = (path: string, prefix: string) => path.startsWith(prefix) ? path.slice(prefix.length) : undefined;
const parsedObjectId = (value: string | undefined) => value && ObjectId.isValid(value) ? new ObjectId(value) : null;

const accountFor = async (db: Db, profile: any, auth: AuthenticatedUser) => {
  const now = new Date(); await db.collection('billing_accounts').updateOne({ auth0Id: auth.auth0Id }, { $setOnInsert: { auth0Id: auth.auth0Id, userId: userId(profile), createdAt: now }, $set: { updatedAt: now } }, { upsert: true });
  return db.collection('billing_accounts').findOne({ auth0Id: auth.auth0Id });
};
const customerFor = async (db: Db, profile: any, auth: AuthenticatedUser, stripe: Stripe) => {
  const account = await accountFor(db, profile, auth); if (account?.stripeCustomerId) return account.stripeCustomerId;
  const customer = await stripe.customers.create({ metadata: { auth0Id: auth.auth0Id } }, { idempotencyKey: `billing-customer-${userId(profile).toHexString()}` });
  await db.collection('billing_accounts').updateOne({ _id: account!._id, stripeCustomerId: { $exists: false } }, { $set: { stripeCustomerId: customer.id, updatedAt: new Date() } });
  return (await db.collection('billing_accounts').findOne({ _id: account!._id }))?.stripeCustomerId || customer.id;
};

const checkout = async (req: ApiRequest, res: ApiResponse, db: Db, profile: any, auth: AuthenticatedUser) => {
  await readBody(req); const key = idempotencyKey(req.headers['idempotency-key']); if (!key) return json(res, 400, { error: 'A valid Idempotency-Key header is required.' });
  const entitlement = await resolveEntitlement(db, userId(profile)); if (entitlement.tier === 'pro') return json(res, 200, { action: 'manage_billing', managementPath: '/billing/portal' });
  const configuration = configuredStripe(); if (!configuration) return unavailable(res); const stripe = stripeClient(configuration);
  try {
    const customer = await customerFor(db, profile, auth, stripe); const correlation = `checkout:${userId(profile).toHexString()}:${key}`;
    await appendAnalytics(db, 'upgrade_clicked', correlation, { ownerRef: opaqueAccountRef(auth.auth0Id) }); await appendAudit(db, 'checkout_started', correlation, 'accepted', { actorRef: opaqueAccountRef(auth.auth0Id) });
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', customer, line_items: [{ price: configuration.stripe!.proPriceId, quantity: 1 }], success_url: `${configuration.publicAppOrigin}/billing?checkout=success`, cancel_url: `${configuration.publicAppOrigin}/billing?checkout=cancelled`, metadata: { auth0Id: auth.auth0Id } }, { idempotencyKey: `checkout-${userId(profile).toHexString()}-${key}` });
    return json(res, 200, { url: session.url, synchronization: 'pending' });
  } catch (error) { console.error('Stripe checkout failed', error); return json(res, 502, { error: 'Billing checkout could not be started.', code: 'CheckoutUnavailable' }); }
};

const portal = async (req: ApiRequest, res: ApiResponse, db: Db, profile: any, auth: AuthenticatedUser) => {
  await readBody(req); if (!idempotencyKey(req.headers['idempotency-key'])) return json(res, 400, { error: 'A valid Idempotency-Key header is required.' }); const configuration = configuredStripe(); if (!configuration) return unavailable(res); const account = await accountFor(db, profile, auth); if (!account?.stripeCustomerId) return json(res, 409, { error: 'No billing customer is available.', code: 'BillingCustomerMissing' });
  try { const session = await stripeClient(configuration).billingPortal.sessions.create({ customer: account.stripeCustomerId, return_url: `${configuration.publicAppOrigin}/billing` }); return json(res, 200, { url: session.url }); }
  catch (error) { console.error('Stripe portal failed', error); return json(res, 502, { error: 'Billing management is temporarily unavailable.', code: 'PortalUnavailable' }); }
};

const subscriptionFields = (object: any, eventCreated: number) => {
  const item = object.items?.data?.[0]; const priceId = item?.price?.id; const periodEnd = Number(object.current_period_end); const periodStart = Number(object.current_period_start);
  return typeof object.id === 'string' && typeof object.customer === 'string' && typeof priceId === 'string' && Number.isFinite(periodEnd) ? { subscriptionId: object.id, stripeCustomerId: object.customer, priceId, status: String(object.status || 'unknown'), currentPeriodEnd: new Date(periodEnd * 1000), currentPeriodStart: Number.isFinite(periodStart) ? new Date(periodStart * 1000) : undefined, cancelAtPeriodEnd: Boolean(object.cancel_at_period_end), latestEventCreated: eventCreated, updatedAt: new Date() } : null;
};
const proStatus = (snapshot: any) => snapshot?.status === 'active' || snapshot?.status === 'past_due';

const applyWebhook = async (db: Db, event: any) => {
  const configuration = getServerConfiguration(); const type = String(event.type); const receivedAt = new Date(); const existing = await db.collection('stripe_webhook_events').findOne({ eventId: event.id }); if (existing) return 'duplicate';
  let outcome = 'ignored'; let actorRef: string | undefined;
  if (type.startsWith('customer.subscription.')) {
    const fields = subscriptionFields(event.data.object, Number(event.created || 0));
    if (fields && fields.priceId === configuration.stripe?.proPriceId) {
      const account = await db.collection('billing_accounts').findOne({ stripeCustomerId: fields.stripeCustomerId });
      if (account) {
        actorRef = opaqueAccountRef(account.auth0Id); const prior = await db.collection('subscription_snapshots').findOne({ subscriptionId: fields.subscriptionId });
        if (!prior || Number(prior.latestEventCreated || 0) < fields.latestEventCreated) {
          await db.collection('subscription_snapshots').updateOne({ subscriptionId: fields.subscriptionId }, { $set: fields }, { upsert: true }); outcome = 'applied';
          if (!proStatus(prior) && proStatus(fields)) await appendAnalytics(db, 'subscription_started', `subscription:${fields.subscriptionId}:${fields.latestEventCreated}`, { ownerRef: actorRef });
          if (type === 'customer.subscription.deleted' || fields.cancelAtPeriodEnd) await appendAnalytics(db, 'subscription_cancelled', `subscription-cancelled:${fields.subscriptionId}:${fields.latestEventCreated}`, { ownerRef: actorRef });
        } else outcome = 'older';
      } else outcome = 'unknown_customer';
    } else outcome = 'unrecognized_price';
  } else if (type === 'invoice.payment_succeeded' || type === 'invoice.payment_failed') {
    const invoice = event.data.object; const priceId = invoice.lines?.data?.[0]?.price?.id;
    if (typeof invoice.id === 'string' && priceId === configuration.stripe?.proPriceId) { await db.collection('stripe_invoice_snapshots').updateOne({ invoiceId: invoice.id }, { $set: { invoiceId: invoice.id, priceId, paymentSucceeded: type === 'invoice.payment_succeeded', amountCents: Math.max(0, Number(invoice.amount_paid || 0)), currency: String(invoice.currency || 'usd'), periodStart: new Date(Number(invoice.period_start || event.created || 0) * 1000), periodEnd: new Date(Number(invoice.period_end || event.created || 0) * 1000), updatedAt: receivedAt } }, { upsert: true }); outcome = 'applied'; }
  } else if (type === 'checkout.session.completed') {
    const session = event.data.object; if (typeof session.customer === 'string' && typeof session.metadata?.auth0Id === 'string') { await db.collection('billing_accounts').updateOne({ auth0Id: session.metadata.auth0Id }, { $set: { stripeCustomerId: session.customer, updatedAt: receivedAt } }); outcome = 'applied'; }
  }
  await db.collection('stripe_webhook_events').insertOne({ eventId: event.id, type, receivedAt, outcome, processingState: 'completed' });
  await appendAudit(db, 'webhook_processed', `webhook:${event.id}`, outcome === 'applied' ? 'verified' : outcome, { actorRef });
  return outcome;
};

export const handleStripeWebhook = async (req: ApiRequest, res: ApiResponse, rawBody: Buffer) => {
  const configuration = getServerConfiguration(); const signature = Array.isArray(req.headers['stripe-signature']) ? req.headers['stripe-signature'][0] : req.headers['stripe-signature'];
  if (!signature) { try { await appendAudit(await getDatabase(), 'webhook_processed', `webhook-rejected:${Date.now()}`, 'rejected', { failureCode: 'signature_missing' }); } catch { /* rejection still must not mutate billing */ } return json(res, 400, { error: 'Webhook signature is required.' }); }
  if (!configuration.stripe) { try { await appendAudit(await getDatabase(), 'webhook_processed', `webhook-rejected:${Date.now()}`, 'rejected', { failureCode: 'webhook_unconfigured' }); } catch { /* rejection still must not mutate billing */ } return json(res, 503, { error: 'Webhook processing is unavailable.' }); }
  let event: Stripe.Event; try { event = new Stripe(configuration.stripe.secretKey).webhooks.constructEvent(rawBody, signature, configuration.stripe.webhookSecret); }
  catch { try { await appendAudit(await getDatabase(), 'webhook_processed', `webhook-rejected:${Date.now()}`, 'rejected', { failureCode: 'signature_invalid' }); } catch { /* no state mutation */ } return json(res, 400, { error: 'Webhook signature is invalid.' }); }
  try { await applyWebhook(await getDatabase(), event); return json(res, 200, { received: true }); } catch (error) { console.error('Stripe webhook processing failed', error); return json(res, 503, { error: 'Webhook processing is temporarily unavailable.' }); }
};

const reportingRange = (req: ApiRequest) => { const url = new URL(req.url || '/', 'http://localhost'); const now = new Date(); const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : now; return !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to && to.getTime() - from.getTime() <= 366 * 24 * 60 * 60 * 1000 ? { from, to } : null; };
export const dashboardAggregate = async (db: Db, from: Date, to: Date) => {
  const configuredPrice = getServerConfiguration().stripe?.proPriceId; const invoices = configuredPrice ? await db.collection('stripe_invoice_snapshots').find({ priceId: configuredPrice, paymentSucceeded: true, updatedAt: { $gte: from, $lte: to } }).toArray() : [];
  const activeSubscriptions = configuredPrice ? await db.collection('subscription_snapshots').countDocuments({ priceId: configuredPrice, status: { $in: ['active', 'past_due'] }, currentPeriodEnd: { $gt: new Date() } }) : 0;
  const analytics = await db.collection('usage_analytics_events').find({ timestamp: { $gte: from, $lte: to } }).toArray(); const usage: Record<string, number> = {}; let tokens = 0; let costMicros = 0;
  for (const event of analytics as any[]) { if (event.productKey) usage[event.productKey] = (usage[event.productKey] || 0) + 1; if (event.eventName === 'provider_usage') { tokens += Number(event.attributes?.tokens || 0); costMicros += Number(event.attributes?.costMicros || 0); } }
  const webhookFailures = await db.collection('stripe_webhook_events').countDocuments({ receivedAt: { $gte: from, $lte: to }, outcome: { $in: ['rejected', 'failed'] } }); const stripeProviderFailures = await db.collection('stripe_webhook_events').countDocuments({ receivedAt: { $gte: from, $lte: to }, outcome: 'failed' });
  return { revenueCents: invoices.reduce((sum: number, invoice: any) => sum + invoice.amountCents, 0), mrrCents: activeSubscriptions * 500, activeSubscriptions, stripeProviderFailures, webhookFailures, topProductUsage: Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([productKey, count]) => ({ productKey, count })), geminiTokenConsumption: tokens, geminiCostMicros: costMicros, totalLlmCostMicros: costMicros, costScheduleVersion: 'v1' };
};
export const refreshDashboardMetrics = async (db: Db, now = new Date()) => { const from = new Date(now.getTime() - 5 * 60_000); const bucket = new Date(Math.floor(now.getTime() / 300_000) * 300_000).toISOString(); const aggregates = await dashboardAggregate(db, from, now); await db.collection('dashboard_metric_snapshots').updateOne({ interval: 'five_minutes', bucket }, { $set: { interval: 'five_minutes', bucket, aggregates, sourceFreshness: now, costScheduleVersion: 'v1', updatedAt: now } }, { upsert: true }); };

const adminDashboard = async (req: ApiRequest, res: ApiResponse, db: Db) => { const range = reportingRange(req); if (!range) return json(res, 400, { error: 'Reporting interval is invalid.' }); res.setHeader('Cache-Control', 'no-store'); return json(res, 200, { reportingFrom: range.from.toISOString(), reportingTo: range.to.toISOString(), sourceFreshness: new Date().toISOString(), aggregates: await dashboardAggregate(db, range.from, range.to) }); };
const adminAudit = async (req: ApiRequest, res: ApiResponse, db: Db) => { const url = new URL(req.url || '/', 'http://localhost'); const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50))); const before = url.searchParams.get('before'); const action = url.searchParams.get('action'); if (!Number.isInteger(limit) || (before && Number.isNaN(new Date(before).getTime())) || (action && !/^[a-z_]{2,80}$/.test(action))) return json(res, 400, { error: 'Audit query is invalid.' }); const filter: any = {}; if (before) filter.timestamp = { $lt: new Date(before) }; if (action) filter.action = action; const records = await db.collection('audit_records').find(filter, { projection: { action: 1, timestamp: 1, correlation: 1, outcome: 1, failureCode: 1 } }).sort({ timestamp: -1 }).limit(limit).toArray(); res.setHeader('Cache-Control', 'no-store'); return json(res, 200, { records: records.map(({ _id, ...record }) => ({ id: _id.toHexString(), ...record })), nextBefore: records.at(-1)?.timestamp?.toISOString() || null }); };

const adminFlag = async (req: ApiRequest, res: ApiResponse, db: Db, path: string, auth: AuthenticatedUser) => {
  const key = requestPath(path, '/admin/feature-flags/'); if (!key || !/^[a-z][a-z0-9_.-]{1,63}$/.test(key)) return json(res, 404, { error: 'Feature flag not found.' }); const body = await readBody(req); const requestKey = idempotencyKey(req.headers['idempotency-key']); if (!requestKey) return json(res, 400, { error: 'A valid Idempotency-Key header is required.' }); if (!featureFlagInput(body)) return json(res, 400, { error: 'Feature flag is invalid.' });
  const correlation = `flag-update:${key}:${requestKey}`; const prior = await db.collection('audit_records').findOne({ action: 'feature_flag_updated', correlation }); if (prior) { const current = await db.collection('feature_flags').findOne({ key }); if (current) return json(res, 200, { key: current.key, enabled: current.enabled, percentage: current.percentage, allowlistCount: current.allowlist.length, version: current.version, updatedAt: current.updatedAt.toISOString() }); }
  const now = new Date(); const result = await db.collection('feature_flags').findOneAndUpdate({ key }, { $set: { enabled: body.enabled, percentage: body.percentage, allowlist: body.allowlist, updatedAt: now }, $setOnInsert: { key, version: 0 }, $inc: { version: 1 } }, { upsert: true, returnDocument: 'after' }); clearFlagCache(key); await appendAudit(db, 'feature_flag_updated', correlation, 'accepted', { actorRef: opaqueAccountRef(auth.auth0Id) }); return json(res, 200, { key: result.key, enabled: result.enabled, percentage: result.percentage, allowlistCount: result.allowlist.length, version: result.version, updatedAt: result.updatedAt.toISOString() });
};

export async function handleBilling(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser, profile: any) {
  const db = await getDatabase();
  if (path === '/entitlements' && req.method === 'GET') return json(res, 200, await entitlementResponse(db, userId(profile)));
  if (path === '/billing/checkout' && req.method === 'POST') return checkout(req, res, db, profile, auth);
  if (path === '/billing/portal' && req.method === 'POST') return portal(req, res, db, profile, auth);
  if (path.startsWith('/generation-jobs/') && req.method === 'GET') { const parsed = parsedObjectId(requestPath(path, '/generation-jobs/')); const job = parsed ? await ownedJob(db, userId(profile), parsed, 'generation') : null; return json(res, job ? 200 : 404, job ? jobResponse(job) : { error: 'Generation job not found.' }); }
  if (path.startsWith('/export-jobs/') && req.method === 'GET') { const parsed = parsedObjectId(requestPath(path, '/export-jobs/')); const job = parsed ? await ownedJob(db, userId(profile), parsed, 'export') : null; return json(res, job ? 200 : 404, job ? jobResponse(job) : { error: 'Export job not found.' }); }
  if (path === '/notifications' && req.method === 'GET') { const notifications = await db.collection('notifications').find({ ownerId: userId(profile) }).sort({ createdAt: -1 }).limit(100).toArray(); return json(res, 200, notifications.map(({ _id, ownerId: _, ...notice }) => ({ id: _id.toHexString(), ...notice }))); }
  if (path.startsWith('/exports/') && req.method === 'GET') { const artifactId = requestPath(path, '/exports/'); if (!artifactId || !ObjectId.isValid(artifactId)) return json(res, 404, { error: 'Export artifact not found.' }); const file = await db.collection('export_artifacts.files').findOne({ _id: new ObjectId(artifactId), 'metadata.ownerId': userId(profile), 'metadata.expiresAt': { $gt: new Date() } }); if (!file) return json(res, 404, { error: 'Export artifact not found.' }); res.statusCode = 200; res.setHeader('Content-Type', file.metadata?.contentType || 'application/octet-stream'); res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`); new GridFSBucket(db, { bucketName: 'export_artifacts' }).openDownloadStream(file._id).on('error', () => { if (!res.headersSent) json(res, 404, { error: 'Export artifact not found.' }); else res.destroy(); }).pipe(res); return true; }
  if (path.startsWith('/admin/')) { if (!requireAdmin(auth)) return json(res, 403, { error: 'Administrator access is required.' }); if (path === '/admin/dashboard' && req.method === 'GET') return adminDashboard(req, res, db); if (path === '/admin/audit' && req.method === 'GET') return adminAudit(req, res, db); if (path.startsWith('/admin/feature-flags/') && req.method === 'PUT') return adminFlag(req, res, db, path, auth); }
  return false;
}

export const queueExport = async (db: Db, ownerId: ObjectId, documentId: ObjectId, format: 'pdf' | 'docx', key: string) => createExportJob(db, ownerId, documentId, format, key);
