const test = require('node:test');
const assert = require('node:assert/strict');
const { changedRows, deletedIds, mergeDatabaseChanges } = require('../src/database');

test('database writes include only changed and deleted rows', () => {
  const before = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }];
  const after = [{ id: 'a', value: 1 }, { id: 'b', value: 3 }, { id: 'c', value: 4 }];
  assert.deepEqual(changedRows(before, after, 'id'), [{ id: 'b', value: 3 }, { id: 'c', value: 4 }]);
  assert.deepEqual(deletedIds(before, after, 'id'), []);
  assert.deepEqual(deletedIds(after, before, 'id'), ['c']);
});

test('row-level merge preserves changes committed by another queued request', () => {
  const base = { sets: [], results: [], students: [{ studentId: '1', firstName: 'เดิม' }], teachers: [], questionBank: [], drafts: [], auditLogs: [], settings: { academicCalendar: [] } };
  const intended = structuredClone(base);
  intended.students[0].firstName = 'แก้ไข';
  const fresh = structuredClone(base);
  fresh.results.push({ id: 'result-2', studentId: '2', questionKey: 'exam-1' });
  const merged = mergeDatabaseChanges(base, intended, fresh);
  assert.equal(merged.students[0].firstName, 'แก้ไข');
  assert.equal(merged.results[0].id, 'result-2');
});
