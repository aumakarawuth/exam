const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, createTeacherSession, removeTeacherSessions, teacherSessions } = require('../src/auth');

test('password hashes verify only the original password', () => {
  const hash = hashPassword('correct-password');
  assert.notEqual(hash, 'correct-password');
  assert.equal(verifyPassword('correct-password', hash), true);
  assert.equal(verifyPassword('wrong-password', hash), false);
});

test('teacher sessions have an expiration and can be revoked', () => {
  const teacherId = 'teacher-test';
  const token = createTeacherSession(teacherId);
  const session = teacherSessions.get(token);
  assert.equal(session.teacherId, teacherId);
  assert.ok(session.expiresAt > Date.now());
  removeTeacherSessions(teacherId);
  assert.equal(teacherSessions.has(token), false);
});
