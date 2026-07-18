const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hashPassword, verifyPassword, createTeacherSession, createStudentSession,
  removeTeacherSessions, teacherSessions, studentSessions, purgeExpiredSessions
} = require('../src/auth');
const { purgeExpiredLoginFailures, LOGIN_WINDOW_MS } = require('../src/routes/accounts');

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

test('expired sessions are removed without affecting active sessions', () => {
  const expiredTeacherToken = createTeacherSession('expired-teacher');
  const activeTeacherToken = createTeacherSession('active-teacher');
  const expiredStudentToken = createStudentSession('expired-student');
  const activeStudentToken = createStudentSession('active-student');
  const now = Date.now();

  teacherSessions.get(expiredTeacherToken).expiresAt = now - 1;
  studentSessions.get(expiredStudentToken).expiresAt = now;

  assert.equal(purgeExpiredSessions(now), 2);
  assert.equal(teacherSessions.has(expiredTeacherToken), false);
  assert.equal(studentSessions.has(expiredStudentToken), false);
  assert.equal(teacherSessions.has(activeTeacherToken), true);
  assert.equal(studentSessions.has(activeStudentToken), true);

  teacherSessions.delete(activeTeacherToken);
  studentSessions.delete(activeStudentToken);
});

test('expired login failure records are removed from memory', () => {
  const now = Date.now();
  const failures = new Map([
    ['expired', { count: 5, windowStartedAt: now - LOGIN_WINDOW_MS, lockedUntil: now }],
    ['active-window', { count: 1, windowStartedAt: now - 1, lockedUntil: 0 }],
    ['active-lock', { count: 5, windowStartedAt: now - LOGIN_WINDOW_MS, lockedUntil: now + 1 }]
  ]);

  assert.equal(purgeExpiredLoginFailures(failures, now), 1);
  assert.deepEqual([...failures.keys()], ['active-window', 'active-lock']);
});
