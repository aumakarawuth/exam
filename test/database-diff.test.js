const test = require('node:test');
const assert = require('node:assert/strict');
const { changedRows, deletedIds } = require('../src/database');

test('database writes include only changed and deleted rows', () => {
  const before = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }];
  const after = [{ id: 'a', value: 1 }, { id: 'b', value: 3 }, { id: 'c', value: 4 }];
  assert.deepEqual(changedRows(before, after, 'id'), [{ id: 'b', value: 3 }, { id: 'c', value: 4 }]);
  assert.deepEqual(deletedIds(before, after, 'id'), []);
  assert.deepEqual(deletedIds(after, before, 'id'), ['c']);
});
