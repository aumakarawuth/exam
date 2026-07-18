const test = require('node:test');
const assert = require('node:assert/strict');
const { appendAuditLog, resultAuditSnapshot } = require('../src/audit-log');

test('audit log captures actor, reason, and score snapshots', () => {
  const db = { auditLogs: [] };
  const before = resultAuditSnapshot({ id: 'r1', studentId: '10001', questionKey: 'set1', published: false, overallScore20: 12, sectionScores: { mc: 12 } });
  const event = appendAuditLog(db, { newId: prefix => `${prefix}_1`, actorType: 'teacher', actorId: 't1', action: 'result_updated', targetId: 'r1', questionKey: 'set1', before, after: { ...before, overallScore: 15 }, reason: 'ตรวจคะแนนอัตนัยใหม่' });
  assert.equal(event.id, 'audit_1');
  assert.equal(event.actorId, 't1');
  assert.equal(event.reason, 'ตรวจคะแนนอัตนัยใหม่');
  assert.equal(event.before.overallScore, 12);
  assert.equal(event.after.overallScore, 15);
  assert.equal(db.auditLogs.length, 1);
});

test('audit reason is trimmed and bounded', () => {
  const db = {};
  const event = appendAuditLog(db, { newId: () => 'a1', actorType: 'admin', action: 'result_deleted', reason: `  ${'x'.repeat(600)}  ` });
  assert.equal(event.reason.length, 500);
});
