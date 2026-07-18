const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createRuntimeMetrics } = require('../src/runtime-metrics');

test('runtime metrics record API timing and safe server failure details', () => {
  let timestamp = 1_000;
  const metrics = createRuntimeMetrics({ now: () => timestamp });
  const request = { path: '/api/results', method: 'POST' };
  const response = new EventEmitter();
  response.statusCode = 500;
  metrics.middleware(request, response, () => {});
  timestamp = 1_125;
  response.emit('finish');
  const snapshot = metrics.snapshot();
  assert.equal(snapshot.totalRequests, 1);
  assert.equal(snapshot.serverErrors, 1);
  assert.equal(snapshot.averageResponseMs, 125);
  assert.deepEqual(snapshot.recentFailures[0], { occurredAt: new Date(timestamp).toISOString(), method: 'POST', path: '/api/results', status: 500, durationMs: 125 });
  assert.equal(Object.hasOwn(snapshot.recentFailures[0], 'body'), false);
});

test('runtime metrics ignore non-API requests', () => {
  const metrics = createRuntimeMetrics();
  metrics.middleware({ path: '/admin', method: 'GET' }, new EventEmitter(), () => {});
  assert.equal(metrics.snapshot().totalRequests, 0);
});
