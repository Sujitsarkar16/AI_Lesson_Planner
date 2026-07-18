import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getServerConfiguration, normalizePublicAppOrigin } from './config.js';

test('normalizes the configured application URL to an origin', () => {
  assert.equal(normalizePublicAppOrigin('https://app.example.test:443/billing?source=test'), 'https://app.example.test');
  assert.equal(normalizePublicAppOrigin('ftp://app.example.test'), undefined);
});

test('accepts complete server-only billing configuration without public Stripe fields', () => {
  const configuration = getServerConfiguration({
    VITE_APP_URL: 'https://app.example.test/path',
    STRIPE_SECRET_KEY: 'sk_test_config',
    STRIPE_WEBHOOK_SECRET: 'whsec_config',
    STRIPE_PRO_PRICE_ID: 'price_config',
    AUTH0_ADMIN_CLAIM: 'https://app.example.test/roles',
    AUTH0_ADMIN_VALUE: 'administrator',
    WORKER_MONGODB_URI: 'mongodb+srv://worker@example.test/app',
    AUDIT_WRITER_MONGODB_URI: 'mongodb+srv://audit-writer@example.test/app'
  });

  assert.equal(configuration.publicAppOrigin, 'https://app.example.test');
  assert.deepEqual(configuration.stripe, { secretKey: 'sk_test_config', webhookSecret: 'whsec_config', proPriceId: 'price_config' });
  assert.deepEqual(configuration.admin, { claim: 'https://app.example.test/roles', value: 'administrator' });
  assert.equal(configuration.workerMongoUri, 'mongodb+srv://worker@example.test/app');
  assert.equal(configuration.auditWriterMongoUri, 'mongodb+srv://audit-writer@example.test/app');
});

test('omits incomplete or malformed server configuration', () => {
  const configuration = getServerConfiguration({
    STRIPE_SECRET_KEY: 'sk_test_config',
    WORKER_MONGODB_URI: 'https://not-mongo.example.test',
    AUDIT_WRITER_MONGODB_URI: 'https://not-mongo.example.test'
  });
  assert.equal(configuration.stripe, undefined);
  assert.equal(configuration.workerMongoUri, undefined);
  assert.equal(configuration.auditWriterMongoUri, undefined);
});
