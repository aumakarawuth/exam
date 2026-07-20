const test = require('node:test');
const assert = require('node:assert/strict');
const { hasStartedExamDraft } = require('../src/routes/submissions');

test('allows an automatic submission after closing time when the same device started before the deadline', () => {
  const db = { drafts: [{ studentId: '1001', questionKey: 'exam-1', resitAccessId: null, deviceId: 'device-123456', examEndTime: '2026-07-20T08:00:00.000Z', savedAt: '2026-07-20T07:29:00.000Z' }] };
  const payload = { questionKey: 'exam-1', resitAccessId: null, deviceId: 'device-123456', autoSubmit: true };
  assert.equal(hasStartedExamDraft(db, '1001', payload, { availableUntil: '2026-07-20T07:30:00.000Z' }), true);
});

test('rejects deadline bypass without a matching started draft', () => {
  const db = { drafts: [{ studentId: '1001', questionKey: 'exam-1', deviceId: 'other-device', examEndTime: '2026-07-20T08:00:00.000Z', savedAt: '2026-07-20T07:29:00.000Z' }] };
  const payload = { questionKey: 'exam-1', deviceId: 'device-123456', autoSubmit: true };
  assert.equal(hasStartedExamDraft(db, '1001', payload, { availableUntil: '2026-07-20T07:30:00.000Z' }), false);
});
