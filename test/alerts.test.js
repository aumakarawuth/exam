const test = require('node:test');
const assert = require('node:assert/strict');
const { createAlertManager } = require('../src/alerts');

test('alert webhook sends a minimal payload and applies cooldown', async () => {
  const calls = [];
  const manager = createAlertManager({ webhookUrl: 'https://monitor.invalid/hook', cooldownMs: 1000, now: () => 100, fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: true }; } });
  assert.equal((await manager.send({ type: 'database_down', message: 'Database failed.', details: { latencyMs: 20 } })).sent, true);
  assert.equal((await manager.send({ type: 'database_down', message: 'Database failed.' })).reason, 'cooldown');
  assert.equal(calls.length, 1);
  const payload = JSON.parse(calls[0].options.body);
  assert.deepEqual(payload.details, { latencyMs: 20 });
  assert.equal('students' in payload, false);
  assert.equal(manager.status().lastSuccessAt !== null, true);
});
