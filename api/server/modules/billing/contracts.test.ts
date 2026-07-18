import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';
import { AUDIT_RECORD_RETENTION_DAYS, auditRecordExpiresAt, validateBillingDocument } from './contracts.js';

const userId = new ObjectId();

test('accepts the durable usage and audit document contracts', () => {
  assert.equal(validateBillingDocument('usage_counters', {
    userId, productKey: 'lesson_plan', periodKey: '2026-04', used: 1, limit: 30, updatedAt: new Date()
  }), true);
  assert.equal(validateBillingDocument('audit_records', {
    action: 'usage_consumed', timestamp: new Date(), correlation: 'reservation-1', outcome: 'accepted', expiresAt: new Date()
  }), true);
  assert.equal(validateBillingDocument('notifications', {
    ownerId: userId, jobId: new ObjectId(), status: 'queued', createdAt: new Date()
  }), true);
});

test('rejects counter documents outside their bounded count contract', () => {
  assert.equal(validateBillingDocument('usage_counters', {
    userId, productKey: 'lesson_plan', periodKey: '2026-04', used: 31, limit: 30, updatedAt: new Date()
  }), false);
});

test('calculates audit expiry at exactly 400 days', () => {
  const timestamp = new Date('2026-01-15T12:00:00.000Z');
  const expiresAt = auditRecordExpiresAt(timestamp);
  assert.equal(expiresAt.getTime() - timestamp.getTime(), AUDIT_RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000);
});
