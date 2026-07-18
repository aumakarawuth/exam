const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createSubmissionGate } = require('../src/submission-gate');

function response() {
  const res = new EventEmitter();
  res.setHeader = () => {};
  res.status = status => { res.statusCode = status; return res; };
  res.json = body => { res.body = body; return res; };
  return res;
}

test('submission gate queues requests and never exceeds its concurrency limit', () => {
  const gate = createSubmissionGate({ maxConcurrent: 2, maxPending: 3 });
  const requests = Array.from({ length: 5 }, () => new EventEmitter());
  const responses = requests.map(() => response());
  let started = 0;
  requests.forEach((req, index) => gate.middleware(req, responses[index], () => { started += 1; }));
  assert.equal(started, 2);
  assert.deepEqual(gate.snapshot(), { active: 2, pending: 3, maxConcurrent: 2, maxPending: 3, peakActive: 2, completed: 0, overloaded: 0 });
  responses[0].emit('finish');
  assert.equal(started, 3);
  assert.equal(gate.snapshot().active, 2);
});

test('submission gate returns retryable 503 when its bounded queue is full', () => {
  const gate = createSubmissionGate({ maxConcurrent: 1, maxPending: 1 });
  gate.middleware(new EventEmitter(), response(), () => {});
  gate.middleware(new EventEmitter(), response(), () => {});
  const rejected = response();
  gate.middleware(new EventEmitter(), rejected, () => assert.fail('overloaded request must not start'));
  assert.equal(rejected.statusCode, 503);
  assert.equal(rejected.body.error, 'submission_busy');
  assert.equal(gate.snapshot().overloaded, 1);
});
