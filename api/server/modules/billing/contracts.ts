import { ObjectId } from 'mongodb';

export const AUDIT_RECORD_RETENTION_DAYS = 400;

export const billingCollectionNames = [
  'billing_accounts', 'subscription_snapshots', 'stripe_webhook_events', 'stripe_invoice_snapshots',
  'usage_counters', 'usage_reservations', 'request_rate_windows', 'jobs', 'notifications', 'usage_analytics_events',
  'audit_records', 'feature_flags', 'dashboard_metric_snapshots', 'export_artifacts.files', 'export_artifacts.chunks'
] as const;

export type BillingCollectionName = (typeof billingCollectionNames)[number];
export type BillingDocument = Record<string, unknown>;
export type BillingDocumentValidator = (document: BillingDocument) => boolean;

export type BillingAccount = {
  auth0Id: string;
  userId: ObjectId;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UsageCounter = {
  userId: ObjectId;
  productKey: string;
  periodKey: string;
  used: number;
  limit: number;
  updatedAt: Date;
};

export type UsageReservation = {
  userId: ObjectId;
  productKey: string;
  periodKey: string;
  idempotencyKey: string;
  outcome: string;
  createdAt: Date;
  jobId?: ObjectId;
};

export type ImmutableAuditRecord = {
  action: string;
  timestamp: Date;
  correlation: string;
  outcome: string;
  actorRef?: string;
  failureCode?: string;
  expiresAt: Date;
};

const isRecord = (value: unknown): value is BillingDocument => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
const isObjectId = (value: unknown): value is ObjectId => value instanceof ObjectId;
const isNonNegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const has = (document: BillingDocument, ...fields: string[]) => fields.every((field) => field in document);
const hasStrings = (document: BillingDocument, ...fields: string[]) => fields.every((field) => isNonEmptyString(document[field]));
const hasDates = (document: BillingDocument, ...fields: string[]) => fields.every((field) => isDate(document[field]));

const hasUsageIdentity = (document: BillingDocument) => has(document, 'userId', 'productKey', 'periodKey') && isObjectId(document.userId) && hasStrings(document, 'productKey', 'periodKey');

export const billingDocumentValidators: Record<BillingCollectionName, BillingDocumentValidator> = {
  billing_accounts: (document) => isRecord(document) && has(document, 'auth0Id', 'userId', 'createdAt', 'updatedAt') && hasStrings(document, 'auth0Id') && isObjectId(document.userId) && hasDates(document, 'createdAt', 'updatedAt') && (document.stripeCustomerId === undefined || isNonEmptyString(document.stripeCustomerId)),
  subscription_snapshots: (document) => isRecord(document) && has(document, 'subscriptionId', 'stripeCustomerId', 'priceId', 'status', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'latestEventCreated', 'updatedAt') && hasStrings(document, 'subscriptionId', 'stripeCustomerId', 'priceId', 'status') && hasDates(document, 'currentPeriodEnd', 'updatedAt') && typeof document.cancelAtPeriodEnd === 'boolean' && isNonNegativeInteger(document.latestEventCreated),
  stripe_webhook_events: (document) => isRecord(document) && has(document, 'eventId', 'type', 'receivedAt', 'outcome', 'processingState') && hasStrings(document, 'eventId', 'type', 'outcome', 'processingState') && hasDates(document, 'receivedAt'),
  stripe_invoice_snapshots: (document) => isRecord(document) && has(document, 'invoiceId', 'priceId', 'paymentSucceeded', 'amountCents', 'currency', 'periodStart', 'periodEnd', 'updatedAt') && hasStrings(document, 'invoiceId', 'priceId', 'currency') && typeof document.paymentSucceeded === 'boolean' && isNonNegativeInteger(document.amountCents) && hasDates(document, 'periodStart', 'periodEnd', 'updatedAt'),
  usage_counters: (document) => isRecord(document) && hasUsageIdentity(document) && has(document, 'used', 'limit', 'updatedAt') && isNonNegativeInteger(document.used) && isNonNegativeInteger(document.limit) && document.used <= document.limit && isDate(document.updatedAt),
  usage_reservations: (document) => isRecord(document) && hasUsageIdentity(document) && has(document, 'idempotencyKey', 'outcome', 'createdAt') && hasStrings(document, 'idempotencyKey', 'outcome') && isDate(document.createdAt) && (document.jobId === undefined || isObjectId(document.jobId)),
  request_rate_windows: (document) => isRecord(document) && has(document, 'userId', 'bucket', 'count', 'expiresAt') && isObjectId(document.userId) && isNonNegativeInteger(document.bucket) && isNonNegativeInteger(document.count) && isDate(document.expiresAt),
  jobs: (document) => isRecord(document) && has(document, 'ownerId', 'jobType', 'idempotencyKey', 'status', 'attempt', 'nextAttemptAt', 'createdAt', 'updatedAt') && isObjectId(document.ownerId) && hasStrings(document, 'jobType', 'idempotencyKey', 'status') && isNonNegativeInteger(document.attempt) && hasDates(document, 'nextAttemptAt', 'createdAt', 'updatedAt') && (document.leaseExpiresAt === undefined || isDate(document.leaseExpiresAt)),
  notifications: (document) => isRecord(document) && has(document, 'ownerId', 'jobId', 'status', 'createdAt') && isObjectId(document.ownerId) && isObjectId(document.jobId) && isNonEmptyString(document.status) && isDate(document.createdAt) && (document.artifactId === undefined || isObjectId(document.artifactId)),
  usage_analytics_events: (document) => isRecord(document) && has(document, 'eventName', 'timestamp', 'correlation') && hasStrings(document, 'eventName', 'correlation') && isDate(document.timestamp) && (document.ownerRef === undefined || isNonEmptyString(document.ownerRef)) && (document.productKey === undefined || isNonEmptyString(document.productKey)),
  audit_records: (document) => isRecord(document) && has(document, 'action', 'timestamp', 'correlation', 'outcome', 'expiresAt') && hasStrings(document, 'action', 'correlation', 'outcome') && hasDates(document, 'timestamp', 'expiresAt') && (document.actorRef === undefined || isNonEmptyString(document.actorRef)) && (document.failureCode === undefined || isNonEmptyString(document.failureCode)),
  feature_flags: (document) => isRecord(document) && has(document, 'key', 'enabled', 'percentage', 'allowlist', 'version', 'updatedAt') && hasStrings(document, 'key') && typeof document.enabled === 'boolean' && isNonNegativeInteger(document.percentage) && document.percentage <= 100 && Array.isArray(document.allowlist) && document.allowlist.every(isNonEmptyString) && isNonNegativeInteger(document.version) && isDate(document.updatedAt),
  dashboard_metric_snapshots: (document) => isRecord(document) && has(document, 'interval', 'bucket', 'aggregates', 'sourceFreshness', 'costScheduleVersion', 'updatedAt') && hasStrings(document, 'interval', 'bucket', 'costScheduleVersion') && isRecord(document.aggregates) && isDate(document.sourceFreshness) && isDate(document.updatedAt),
  'export_artifacts.files': (document) => isRecord(document) && has(document, 'filename', 'uploadDate', 'metadata') && isNonEmptyString(document.filename) && isDate(document.uploadDate) && isRecord(document.metadata) && isObjectId(document.metadata.ownerId) && isDate(document.metadata.expiresAt),
  'export_artifacts.chunks': (document) => isRecord(document) && has(document, 'files_id', 'n', 'data') && isObjectId(document.files_id) && isNonNegativeInteger(document.n) && Buffer.isBuffer(document.data)
};

export const validateBillingDocument = (collection: BillingCollectionName, document: unknown): document is BillingDocument => isRecord(document) && billingDocumentValidators[collection](document);

export const auditRecordExpiresAt = (timestamp: Date): Date => new Date(timestamp.getTime() + AUDIT_RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000);
