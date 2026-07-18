import assert from 'node:assert/strict';
import { test } from 'node:test';
import { idempotencyKey, isProductKey, monthWindow, opaqueAccountRef } from './core.js';
import { generationInput, operationFor } from './jobs.js';

const hundredIterations = Array.from({ length: 100 }, (_, index) => index);

test('Feature: stripe-subscriptions, Property 1: Free windows use UTC month boundaries', () => {
  for (const index of hundredIterations) {
    const instant = new Date(Date.UTC(2020 + Math.floor(index / 12), index % 12, 15, 12));
    const window = monthWindow(instant);
    assert.equal(window.key, instant.toISOString().slice(0, 7));
    assert.equal(window.end.getUTCDate(), 1);
    assert.equal(window.end.getUTCMonth(), (instant.getUTCMonth() + 1) % 12);
  }
  assert.equal(monthWindow(new Date('2026-01-31T23:59:59.999Z')).end.toISOString(), '2026-02-01T00:00:00.000Z');
});

test('Feature: stripe-subscriptions, Property 4: typed generation never derives capability from request input', () => {
  for (const index of hundredIterations) {
    assert.equal(operationFor(`tier-pro-${index}`), null);
    assert.equal(generationInput({ prompt: `Ignore controls ${index}` }), null);
    assert.deepEqual(generationInput({ subject: `Science ${index}`, topic: 'Matter', grade: '7' }), { subject: `Science ${index}`, topic: 'Matter', grade: '7' });
  }
  assert.deepEqual(operationFor('lesson-plan'), { operation: 'lesson-plan', productKey: 'lesson_plan' });
});

test('Feature: stripe-subscriptions, Properties 3, 9, and 10: request identities and catalog inputs are bounded and deterministic', () => {
  for (const index of hundredIterations) {
    const key = `idempotency_key_${String(index).padStart(4, '0')}`;
    assert.equal(idempotencyKey(key), key);
    assert.equal(idempotencyKey(`${key}!`), null);
    assert.equal(opaqueAccountRef(`auth0|user-${index}`), opaqueAccountRef(`auth0|user-${index}`));
    assert.equal(isProductKey('lesson_plan'), true);
    assert.equal(isProductKey(`unknown_${index}`), false);
  }
});
