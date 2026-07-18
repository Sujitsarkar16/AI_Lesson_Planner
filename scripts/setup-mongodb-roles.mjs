import { MongoClient } from 'mongodb';

const adminUri = process.env.MONGODB_ADMIN_URI;
const databaseName = process.env.MONGODB_DB_NAME || 'ai_lesson_planner';
const authenticationDatabase = process.env.MONGODB_AUTH_DB || 'admin';
if (!adminUri) throw new Error('MONGODB_ADMIN_URI is required to provision least-privilege roles.');

const privilege = (collection, actions) => ({ resource: { db: databaseName, collection }, actions });
const insertOnly = ['insert'];
const read = ['find'];
const readWrite = ['find', 'insert', 'update'];
const apiCollections = [
  ['users', readWrite], ['documents', ['find', 'insert', 'update', 'remove']],
  ['curriculum_standards', read], ['coverage_tracking', readWrite],
  ['concept_map_nodes', ['find', 'insert', 'remove']], ['concept_map_edges', ['find', 'insert', 'remove']],
  ['lesson_sequences', readWrite], ['academic_calendar_plans', readWrite],
  ['academic_calendar_plan_inputs', readWrite], ['academic_calendar_plan_versions', readWrite],
  ['students', read], ['assignments', readWrite], ['submissions', readWrite],
  ['billing_accounts', readWrite], ['subscription_snapshots', readWrite],
  ['stripe_webhook_events', readWrite], ['stripe_invoice_snapshots', readWrite],
  ['usage_counters', readWrite], ['usage_reservations', readWrite],
  ['request_rate_windows', readWrite], ['jobs', readWrite], ['notifications', ['find', 'insert']],
  ['usage_analytics_events', insertOnly], ['audit_records', insertOnly],
  ['feature_flags', readWrite], ['dashboard_metric_snapshots', read],
  ['export_artifacts.files', read], ['export_artifacts.chunks', read]
];
const workerCollections = [
  ['billing_accounts', read], ['subscription_snapshots', read], ['usage_reservations', read],
  ['jobs', readWrite], ['notifications', readWrite], ['usage_analytics_events', insertOnly], ['audit_records', insertOnly],
  ['dashboard_metric_snapshots', readWrite], ['documents', read],
  ['export_artifacts.files', ['find', 'insert', 'update', 'remove']],
  ['export_artifacts.chunks', ['find', 'insert', 'remove']]
];
const roles = [
  { name: 'stripe_api_runtime', privileges: apiCollections.map(([collection, actions]) => privilege(collection, actions)) },
  { name: 'stripe_worker_runtime', privileges: workerCollections.map(([collection, actions]) => privilege(collection, actions)) },
  { name: 'stripe_audit_writer', privileges: [privilege('audit_records', insertOnly)] }
];

const credentialDefinitions = [
  ['MONGODB_API_USERNAME', 'MONGODB_API_PASSWORD', 'stripe_api_runtime'],
  ['MONGODB_WORKER_USERNAME', 'MONGODB_WORKER_PASSWORD', 'stripe_worker_runtime'],
  ['MONGODB_AUDIT_WRITER_USERNAME', 'MONGODB_AUDIT_WRITER_PASSWORD', 'stripe_audit_writer']
];

const client = new MongoClient(adminUri);

try {
  const database = client.db(databaseName);
  for (const role of roles) {
    try {
      await database.command({ createRole: role.name, privileges: role.privileges, roles: [] });
    } catch (error) {
      if (error?.codeName !== 'RoleAlreadyExists' && error?.code !== 51002) throw error;
      await database.command({ updateRole: role.name, privileges: role.privileges, roles: [] });
    }
  }

  const suppliedCredentials = credentialDefinitions.filter(([usernameKey, passwordKey]) => process.env[usernameKey] || process.env[passwordKey]);
  if (suppliedCredentials.length && suppliedCredentials.length !== credentialDefinitions.length) {
    throw new Error('Provide all API, worker, and audit-writer usernames and passwords together, or omit all credentials to provision roles only.');
  }

  if (suppliedCredentials.length) {
    const authDatabase = client.db(authenticationDatabase);
    for (const [usernameKey, passwordKey, role] of credentialDefinitions) {
      const username = process.env[usernameKey];
      const password = process.env[passwordKey];
      const rolesForUser = [{ role, db: databaseName }];
      try {
        await authDatabase.command({ createUser: username, pwd: password, roles: rolesForUser });
      } catch (error) {
        if (error?.codeName !== 'DuplicateKey' && error?.code !== 51003) throw error;
        await authDatabase.command({ updateUser: username, pwd: password, roles: rolesForUser });
      }
    }
  }

  console.log(`MongoDB runtime roles are ready in ${databaseName}.`);
} finally {
  await client.close();
}
