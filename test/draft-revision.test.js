const test = require('node:test');
const assert = require('node:assert/strict');
const { nextDraftRevision } = require('../src/draft-revision');

test('draft revision starts at one and advances sequentially', () => {
  assert.equal(nextDraftRevision(null, 0), 1);
  assert.equal(nextDraftRevision({ revision: 7 }, 7), 8);
});

test('draft revision rejects a stale autosave', () => {
  assert.throws(() => nextDraftRevision({ revision: 8 }, 7), error => error.code === 'DRAFT_CONFLICT' && error.currentRevision === 8);
});
