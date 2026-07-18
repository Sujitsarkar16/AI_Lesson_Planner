import { createHash } from 'node:crypto';
import { ObjectId, type ClientSession, type Db } from 'mongodb';
import type { AuthenticatedUser } from '../../shared/auth.js';
import { getMongoClient } from '../../shared/database.js';
import { getServerConfiguration } from '../../shared/config.js';
import { auditRecordExpiresAt } from './contracts.js';

export const productKeys = ['lesson_plan', 'exam_paper', 'ai_chat', 'syllabus', 'surprise_test', 'mcq_paper', 'study_notes', 'concept_map', 'worksheet', 'blooms_taxonomy', 'difficulty_modifier', 'regeneration', 'pdf_export', 'docx_export'] as const;
export type ProductKey = (typeof productKeys)[number];
export type Tier = 'free' | 'pro';
type Limit = number | null;
type Flag = { key: string; enabled: boolean; percentage: number; allowlist: string[]; version: number; updatedAt: Date };

const freeCatalog: Record<ProductKey, Limit> = { lesson_plan: 1, exam_paper: 1, ai_chat: 20, syllabus: 0, surprise_test: 0, mcq_paper: 0, study_notes: 0, concept_map: 0, worksheet: 0, blooms_taxonomy: 0, difficulty_modifier: 0, regeneration: 0, pdf_export: 0, docx_export: 0 };
const proCatalog: Record<ProductKey, Limit> = { lesson_plan: 30, exam_paper: 15, ai_chat: null, syllabus: 5, surprise_test: 20, mcq_paper: 30, study_notes: 20, concept_map: 50, worksheet: 30, blooms_taxonomy: null, difficulty_modifier: null, regeneration: null, pdf_export: null, docx_export: null };
const flags = new Map<string, { value: Flag | null; expiresAt: number }>();

export const isProductKey = (value: string): value is ProductKey => (productKeys as readonly string[]).includes(value);
export const opaqueAccountRef = (auth0Id: string) => `acct_${createHash('sha256').update(auth0Id).digest('hex')}`;
export const monthWindow = (now = new Date()) => { const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)); return { key: start.toISOString().slice(0, 7), end }; };

export type Entitlement = { tier: Tier; status: string; periodKey: string; periodEnd: Date; historyStart?: Date; catalog: Record<ProductKey, Limit>; snapshot?: any };

const eligiblePro = (snapshot: any, now: Date) => {
  const configuredPrice = getServerConfiguration().stripe?.proPriceId;
  if (!snapshot || !configuredPrice || snapshot.priceId !== configuredPrice || !(snapshot.currentPeriodEnd instanceof Date) || snapshot.currentPeriodEnd <= now) return false;
  return snapshot.status === 'active' || snapshot.status === 'past_due';
};

export const resolveEntitlement = async (db: Db, userId: ObjectId, now = new Date()): Promise<Entitlement> => {
  const account = await db.collection('billing_accounts').findOne({ userId });
  const snapshot = account?.stripeCustomerId ? await db.collection('subscription_snapshots').find({ stripeCustomerId: account.stripeCustomerId }).sort({ currentPeriodEnd: -1 }).limit(1).next() : null;
  if (eligiblePro(snapshot, now)) return { tier: 'pro', status: snapshot!.status, periodKey: `${snapshot!.subscriptionId}:${snapshot!.currentPeriodEnd.getTime()}`, periodEnd: snapshot!.currentPeriodEnd, catalog: proCatalog, snapshot };
  const window = monthWindow(now);
  return { tier: 'free', status: snapshot?.status || 'free', periodKey: window.key, periodEnd: window.end, historyStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), catalog: freeCatalog, snapshot: snapshot || undefined };
};

export const entitlementResponse = async (db: Db, userId: ObjectId, now = new Date()) => {
  const entitlement = await resolveEntitlement(db, userId, now);
  const counters = await db.collection('usage_counters').find({ userId, periodKey: entitlement.periodKey }).toArray();
  const used = new Map(counters.map((counter: any) => [counter.productKey, counter.used]));
  return {
    tier: entitlement.tier, status: entitlement.status, periodEnd: entitlement.periodEnd.toISOString(), cancelAtPeriodEnd: Boolean(entitlement.snapshot?.cancelAtPeriodEnd), historyDays: entitlement.tier === 'free' ? 7 : null,
    products: Object.fromEntries(productKeys.map((key) => { const limit = entitlement.catalog[key]; return [key, { allowed: limit === null || limit > 0, limit, used: limit === null ? null : (used.get(key) || 0) }]; }))
  };
};

export class RateLimitStorageError extends Error {}
export const rateLimit = async (db: Db, userId: ObjectId, now = new Date()) => {
  const bucket = Math.floor(now.getTime() / 60_000); const expiresAt = new Date((bucket + 2) * 60_000); const filter = { userId, bucket, count: { $lt: 20 } };
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt } }; let result: any;
  try { result = await db.collection('request_rate_windows').findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after' }); }
  catch (error: any) {
    if (error?.code !== 11000) throw new RateLimitStorageError();
    try { result = await db.collection('request_rate_windows').findOneAndUpdate(filter, update, { returnDocument: 'after' }); } catch { throw new RateLimitStorageError(); }
  }
  return { allowed: Boolean(result), retryAfter: Math.max(1, Math.ceil((((bucket + 1) * 60_000) - now.getTime()) / 1000)) };
};

export const idempotencyKey = (header: string | string[] | undefined) => {
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
};

const sensitive = /(?:prompt|content|email|token|secret|stripe|payment|card|cvc|authorization)/i;
const safeString = (value: unknown) => typeof value === 'string' && value.length <= 200 && !/[\r\n]/.test(value);
const safeValue = (value: unknown): boolean => value === undefined || value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) || safeString(value) || (Array.isArray(value) && value.every(safeValue)) || (typeof value === 'object' && value !== null && Object.entries(value).every(([key, nested]) => !sensitive.test(key) && safeValue(nested)));
const validCorrelation = (value: string) => /^[A-Za-z0-9:_-]{1,180}$/.test(value);
const duplicate = (error: any) => error?.code === 11000;

export const appendAnalytics = async (db: Db, eventName: string, correlation: string, fields: { ownerRef?: string; productKey?: ProductKey; attributes?: Record<string, unknown> } = {}, session?: ClientSession) => {
  if (!/^(?:lesson_plan_generated|exam_generated|failed_generations|upgrade_clicked|subscription_started|subscription_cancelled|provider_usage)$/.test(eventName) || !validCorrelation(correlation) || (fields.productKey && !isProductKey(fields.productKey)) || !safeValue(fields.attributes || {})) throw new Error('Unsafe analytics event.');
  const document = { eventName, timestamp: new Date(), correlation, ...fields };
  try { if (session) await db.collection('usage_analytics_events').insertOne(document, { session }); else await db.collection('usage_analytics_events').insertOne(document); } catch (error) { if (!duplicate(error)) throw error; }
};

export const appendAudit = async (db: Db, action: string, correlation: string, outcome: string, fields: { actorRef?: string; failureCode?: string } = {}, session?: ClientSession) => {
  if (!/^[a-z_]{2,80}$/.test(action) || !/^[a-z_]{2,80}$/.test(outcome) || !validCorrelation(correlation) || !safeValue(fields)) throw new Error('Unsafe audit record.');
  const timestamp = new Date(); const document = { action, timestamp, correlation, outcome, ...fields, expiresAt: auditRecordExpiresAt(timestamp) };
  try { if (session) await db.collection('audit_records').insertOne(document, { session }); else await db.collection('audit_records').insertOne(document); } catch (error) { if (!duplicate(error)) throw error; }
};

export type Reservation = { accepted: true; reservation: any; entitlement: Entitlement } | { accepted: false; status: 403 | 429; reason: 'EntitlementDenied' | 'UsageExhausted'; productKey: ProductKey; used: number; limit: number; periodEnd: Date };
export const reserveUsage = async (db: Db, userId: ObjectId, auth0Id: string, productKey: ProductKey, key: string, now = new Date()): Promise<Reservation> => {
  const client = await getMongoClient(); const session = client.startSession();
  try { return await session.withTransaction(async () => {
    const existing = await db.collection('usage_reservations').findOne({ userId, idempotencyKey: key }, { session });
    const entitlement = await resolveEntitlement(db, userId, now);
    if (existing) return { accepted: existing.outcome === 'accepted', reservation: existing, entitlement } as Reservation;
    const limit = entitlement.catalog[productKey];
    if (limit === 0) return { accepted: false, status: 403, reason: 'EntitlementDenied', productKey, used: 0, limit, periodEnd: entitlement.periodEnd };
    let used = 0;
    if (limit !== null) {
      const counters = db.collection('usage_counters'); const current = await counters.findOne({ userId, productKey, periodKey: entitlement.periodKey }, { session });
      used = current?.used || 0;
      if (used >= limit) return { accepted: false, status: 429, reason: 'UsageExhausted', productKey, used, limit, periodEnd: entitlement.periodEnd };
      if (current) await counters.updateOne({ _id: current._id, used }, { $inc: { used: 1 }, $set: { updatedAt: now } }, { session });
      else await counters.insertOne({ userId, productKey, periodKey: entitlement.periodKey, used: 1, limit, updatedAt: now }, { session });
    }
    const reservation = { userId, productKey, periodKey: entitlement.periodKey, idempotencyKey: key, outcome: 'accepted', createdAt: now };
    const inserted = await db.collection('usage_reservations').insertOne(reservation, { session }); const durable = { ...reservation, _id: inserted.insertedId };
    await appendAudit(db, 'usage_consumed', `usage:${inserted.insertedId.toHexString()}`, 'accepted', { actorRef: opaqueAccountRef(auth0Id) }, session);
    return { accepted: true, reservation: durable, entitlement };
  }); } finally { await session.endSession(); }
};

const validFlag = (value: any): value is Flag => value && typeof value.key === 'string' && typeof value.enabled === 'boolean' && Number.isInteger(value.percentage) && value.percentage >= 0 && value.percentage <= 100 && Array.isArray(value.allowlist) && value.allowlist.every((entry: unknown) => typeof entry === 'string') && Number.isInteger(value.version) && value.updatedAt instanceof Date;
export const evaluateFlag = async (db: Db, key: string, auth0Id: string) => {
  const now = Date.now(); let cached = flags.get(key);
  if (!cached || cached.expiresAt <= now) { const value = await db.collection('feature_flags').findOne({ key }); cached = { value: validFlag(value) ? value : null, expiresAt: now + 60_000 }; flags.set(key, cached); }
  const flag = cached.value;
  if (!flag || !flag.enabled) { await appendAudit(db, 'flag_configuration', `flag:${key}:${flag?.version || 'missing'}`, 'denied', { failureCode: flag ? 'disabled' : 'missing_or_malformed' }); return false; }
  if (flag.allowlist.includes(auth0Id)) return true;
  if (flag.percentage === 0) return false; if (flag.percentage === 100) return true;
  return createHash('sha256').update(`${key}:${flag.version}:${auth0Id}`).digest().readUInt32BE(0) % 100 < flag.percentage;
};

export const clearFlagCache = (key: string) => flags.delete(key);
export const requireAdmin = (auth: AuthenticatedUser) => { const admin = getServerConfiguration().admin; return Boolean(admin && auth.claims[admin.claim] === admin.value); };
export const featureFlagInput = (value: any) => value && typeof value.enabled === 'boolean' && Number.isInteger(value.percentage) && value.percentage >= 0 && value.percentage <= 100 && Array.isArray(value.allowlist) && value.allowlist.length <= 500 && value.allowlist.every((entry: unknown) => typeof entry === 'string' && entry.length > 0 && entry.length <= 256);
