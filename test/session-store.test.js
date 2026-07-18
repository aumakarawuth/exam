const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessionStore } = require('../src/session-store');

test('memory session store supports sliding expiry and subject revocation', async () => {
  let current = 1000;
  const store = createSessionStore({ now: () => current });
  await store.set('teacher', 'token-a', 'teacher-1', 100);
  assert.equal(await store.getAndTouch('teacher', 'token-a', 100), 'teacher-1');
  current = 1090;
  assert.equal(await store.getAndTouch('teacher', 'token-a', 100), 'teacher-1');
  current = 1180;
  assert.equal(await store.count('teacher'), 1);
  await store.removeBySubject('teacher', 'teacher-1');
  assert.equal(await store.getAndTouch('teacher', 'token-a', 100), null);
  assert.deepEqual(store.status(), { engine: 'Memory', configured: false, connected: true, lastError: null });
  assert.deepEqual(await store.ping(), { status: 'connected', engine: 'Memory', latencyMs: 0 });
});

test('memory session store expires inactive sessions', async () => {
  let current = 0;
  const store = createSessionStore({ now: () => current });
  await store.set('student', 'token-b', 'student-1', 50);
  current = 51;
  assert.equal(await store.getAndTouch('student', 'token-b', 50), null);
  assert.equal(await store.count('student'), 0);
});
