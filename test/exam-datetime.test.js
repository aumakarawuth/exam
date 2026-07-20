const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeExamDateTime, getExamSchedule } = require('../src/grading');

test('normalizes a legacy Buddhist year stored as a Gregorian year', () => {
  assert.equal(normalizeExamDateTime('2569-07-21T05:00:00.000Z'), '2026-07-21T05:00:00.000Z');
});

test('leaves a correctly stored Gregorian date unchanged', () => {
  assert.equal(normalizeExamDateTime('2026-07-21T05:00:00.000Z'), '2026-07-21T05:00:00.000Z');
});

test('returns normalized dates from the class schedule', () => {
  const set = { examSchedules: [{ classes: ['CIT.2/5'], availableFrom: '2569-07-21T05:00:00.000Z', availableUntil: '2569-07-21T07:30:00.000Z' }] };
  assert.deepEqual(getExamSchedule(set, 'CIT.2/5'), {
    classes: ['CIT.2/5'],
    availableFrom: '2026-07-21T05:00:00.000Z',
    availableUntil: '2026-07-21T07:30:00.000Z'
  });
});
