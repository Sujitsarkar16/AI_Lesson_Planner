import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_ADMIN_URI || process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME || 'ai_lesson_planner';
if (!uri) throw new Error('MONGODB_ADMIN_URI or MONGODB_URI is required.');

const string = { bsonType: 'string', minLength: 1 };
const date = { bsonType: 'date' };
const objectId = { bsonType: 'objectId' };
const nonNegativeInteger = { bsonType: ['int', 'long', 'double'], minimum: 0 };
const schema = (required, properties) => ({ $jsonSchema: { bsonType: 'object', required, properties } });

const billingCollectionValidators = {
  billing_accounts: schema(['auth0Id', 'userId', 'createdAt', 'updatedAt'], { auth0Id: string, userId: objectId, stripeCustomerId: string, createdAt: date, updatedAt: date }),
  subscription_snapshots: schema(['subscriptionId', 'stripeCustomerId', 'priceId', 'status', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'latestEventCreated', 'updatedAt'], { subscriptionId: string, stripeCustomerId: string, priceId: string, status: string, currentPeriodEnd: date, cancelAtPeriodEnd: { bsonType: 'bool' }, latestEventCreated: nonNegativeInteger, updatedAt: date }),
  stripe_webhook_events: schema(['eventId', 'type', 'receivedAt', 'outcome', 'processingState'], { eventId: string, type: string, receivedAt: date, outcome: string, processingState: string }),
  stripe_invoice_snapshots: schema(['invoiceId', 'priceId', 'paymentSucceeded', 'amountCents', 'currency', 'periodStart', 'periodEnd', 'updatedAt'], { invoiceId: string, priceId: string, paymentSucceeded: { bsonType: 'bool' }, amountCents: nonNegativeInteger, currency: string, periodStart: date, periodEnd: date, updatedAt: date }),
  usage_counters: schema(['userId', 'productKey', 'periodKey', 'used', 'limit', 'updatedAt'], { userId: objectId, productKey: string, periodKey: string, used: nonNegativeInteger, limit: nonNegativeInteger, updatedAt: date }),
  usage_reservations: schema(['userId', 'productKey', 'periodKey', 'idempotencyKey', 'outcome', 'createdAt'], { userId: objectId, productKey: string, periodKey: string, idempotencyKey: string, outcome: string, createdAt: date, jobId: objectId }),
  request_rate_windows: schema(['userId', 'bucket', 'count', 'expiresAt'], { userId: objectId, bucket: nonNegativeInteger, count: nonNegativeInteger, expiresAt: date }),
  jobs: schema(['ownerId', 'jobType', 'idempotencyKey', 'status', 'attempt', 'nextAttemptAt', 'createdAt', 'updatedAt'], { ownerId: objectId, jobType: string, idempotencyKey: string, status: string, attempt: nonNegativeInteger, nextAttemptAt: date, leaseExpiresAt: date, createdAt: date, updatedAt: date }),
  notifications: schema(['ownerId', 'jobId', 'status', 'createdAt'], { ownerId: objectId, jobId: objectId, status: string, artifactId: objectId, createdAt: date }),
  usage_analytics_events: schema(['eventName', 'timestamp', 'correlation'], { eventName: string, timestamp: date, ownerRef: string, correlation: string, productKey: string }),
  audit_records: schema(['action', 'timestamp', 'correlation', 'outcome', 'expiresAt'], { action: string, timestamp: date, actorRef: string, correlation: string, outcome: string, failureCode: string, expiresAt: date }),
  feature_flags: schema(['key', 'enabled', 'percentage', 'allowlist', 'version', 'updatedAt'], { key: string, enabled: { bsonType: 'bool' }, percentage: { ...nonNegativeInteger, maximum: 100 }, allowlist: { bsonType: 'array', items: string }, version: nonNegativeInteger, updatedAt: date }),
  dashboard_metric_snapshots: schema(['interval', 'bucket', 'aggregates', 'sourceFreshness', 'costScheduleVersion', 'updatedAt'], { interval: string, bucket: string, aggregates: { bsonType: 'object' }, sourceFreshness: date, costScheduleVersion: string, updatedAt: date }),
  'export_artifacts.files': schema(['filename', 'uploadDate', 'metadata'], { filename: string, uploadDate: date, metadata: { bsonType: 'object', required: ['ownerId', 'expiresAt'], properties: { ownerId: objectId, expiresAt: date } } }),
  'export_artifacts.chunks': schema(['files_id', 'n', 'data'], { files_id: objectId, n: nonNegativeInteger, data: { bsonType: 'binData' } })
};

const ensureCollection = async (db, name, validator) => {
  try {
    await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
  } catch (error) {
    if (error?.codeName !== 'NamespaceExists' && error?.code !== 48) throw error;
  }
  await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
};

const client = new MongoClient(uri);
try {
  const db = client.db(databaseName);
  await Promise.all(Object.entries(billingCollectionValidators).map(([name, validator]) => ensureCollection(db, name, validator)));
  await Promise.all([
    db.collection('users').createIndex({ auth0Id: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('documents').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('curriculum_standards').createIndex({ board: 1, grade: 1, subject: 1, standard_code: 1 }, { unique: true }),
    db.collection('coverage_tracking').createIndex({ userId: 1, board: 1, grade: 1, subject: 1, standardId: 1 }, { unique: true }),
    db.collection('concept_map_nodes').createIndex({ userId: 1, mapId: 1, node_key: 1 }, { unique: true }),
    db.collection('concept_map_edges').createIndex({ userId: 1, mapId: 1, edge_key: 1 }, { unique: true }),
    db.collection('students').createIndex({ accessCode: 1 }, { unique: true }),
    db.collection('assignments').createIndex({ studentId: 1, dueDate: 1 }),
    db.collection('submissions').createIndex({ assignmentId: 1, studentId: 1 }, { unique: true }),
    db.collection('academic_calendar_plans').createIndex({ userId: 1, _id: 1 }, { unique: true }),
    db.collection('academic_calendar_plan_inputs').createIndex({ userId: 1, planId: 1, revision: 1 }, { unique: true }),
    db.collection('academic_calendar_plan_versions').createIndex({ userId: 1, planId: 1, version: 1 }, { unique: true }),
    db.collection('billing_accounts').createIndex({ auth0Id: 1 }, { unique: true, name: 'billing_account_auth0_id_unique' }),
    db.collection('billing_accounts').createIndex({ userId: 1 }, { unique: true, name: 'billing_account_user_id_unique' }),
    db.collection('billing_accounts').createIndex({ stripeCustomerId: 1 }, { unique: true, sparse: true, name: 'billing_account_customer_id_unique' }),
    db.collection('subscription_snapshots').createIndex({ subscriptionId: 1 }, { unique: true, name: 'subscription_id_unique' }),
    db.collection('stripe_webhook_events').createIndex({ eventId: 1 }, { unique: true, name: 'stripe_event_id_unique' }),
    db.collection('stripe_invoice_snapshots').createIndex({ invoiceId: 1 }, { unique: true, name: 'stripe_invoice_id_unique' }),
    db.collection('usage_counters').createIndex({ userId: 1, productKey: 1, periodKey: 1 }, { unique: true, name: 'usage_counter_window_unique' }),
    db.collection('usage_reservations').createIndex({ userId: 1, idempotencyKey: 1 }, { unique: true, name: 'usage_reservation_idempotency_unique' }),
    db.collection('request_rate_windows').createIndex({ userId: 1, bucket: 1 }, { unique: true, name: 'request_rate_window_unique' }),
    db.collection('request_rate_windows').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'request_rate_window_expiry_ttl' }),
    db.collection('jobs').createIndex({ ownerId: 1, jobType: 1, idempotencyKey: 1 }, { unique: true, name: 'job_idempotency_unique' }),
    db.collection('jobs').createIndex({ status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 }, { name: 'job_due_lease_lookup' }),
    db.collection('notifications').createIndex({ ownerId: 1, createdAt: -1 }, { name: 'notification_owner_created_lookup' }),
    db.collection('usage_analytics_events').createIndex({ eventName: 1, correlation: 1 }, { unique: true, name: 'analytics_event_correlation_unique' }),
    db.collection('audit_records').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'audit_record_expiry_ttl' }),
    db.collection('audit_records').createIndex({ action: 1, timestamp: -1 }, { name: 'audit_action_timestamp_lookup' }),
    db.collection('feature_flags').createIndex({ key: 1 }, { unique: true, name: 'feature_flag_key_unique' }),
    db.collection('dashboard_metric_snapshots').createIndex({ interval: 1, bucket: 1 }, { unique: true, name: 'dashboard_metric_interval_bucket_unique' }),
    db.collection('export_artifacts.files').createIndex({ 'metadata.ownerId': 1, 'metadata.expiresAt': 1 }, { name: 'export_artifact_owner_expiry_lookup' }),
    db.collection('export_artifacts.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true, name: 'export_artifact_chunk_unique' })
  ]);
  console.log(`MongoDB billing collections, validators, and indexes are ready in ${databaseName}.`);
} finally {
  await client.close();
}
