const test = require('node:test');
const assert = require('node:assert/strict');
const { createJobQueue } = require('../src/job-queue');

test('job queue retries failed work and records only safe metadata', async () => {
  let attempts = 0;
  const queue = createJobQueue({ concurrency: 1, baseRetryMs: 1, logger: { error() {} } });
  queue.register('backup', async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary failure');
  });
  const accepted = queue.enqueue('backup', { maxAttempts: 2, dedupeKey: 'daily-backup' });
  assert.equal(accepted.accepted, true);
  assert.equal(queue.enqueue('backup', { dedupeKey: 'daily-backup' }).reason, 'duplicate');
  await queue.onIdle();
  const status = queue.snapshot();
  assert.equal(attempts, 2);
  assert.equal(status.completed, 1);
  assert.equal(status.retried, 1);
  assert.equal(status.failed, 0);
  assert.equal('payload' in status.recentJobs[0], false);
});

test('job queue enforces its pending capacity', () => {
  const queue = createJobQueue({ concurrency: 1, maxPending: 1 });
  queue.register('slow', () => new Promise(() => {}));
  assert.equal(queue.enqueue('slow').accepted, true);
  assert.equal(queue.enqueue('slow').reason, 'queue_full');
  void queue.stop({ drain: false });
});

test('job queue passes private payload to its handler', async () => {
  const queue = createJobQueue();
  let received;
  queue.register('payload', ({ payload }) => { received = payload; });
  queue.enqueue('payload', { payload: { teacherId: 't1' } });
  await queue.onIdle();
  assert.deepEqual(received, { teacherId: 't1' });
  assert.equal('payload' in queue.snapshot().recentJobs[0], false);
});
