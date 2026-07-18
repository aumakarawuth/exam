const crypto = require('crypto');
const { ADMIN_KEY } = require('./config');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex')); }
  catch { return false; }
}

const teacherSessions = new Map();
const TEACHER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const studentSessions = new Map();
const STUDENT_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const SESSION_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function purgeExpiredSessions(now = Date.now()) {
  let removed = 0;
  for (const store of [teacherSessions, studentSessions]) {
    for (const [token, session] of store) {
      if (session.expiresAt <= now) {
        store.delete(token);
        removed += 1;
      }
    }
  }
  return removed;
}

const sessionCleanupTimer = setInterval(purgeExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
sessionCleanupTimer.unref();

function requireTeacher(req, res, next) {
  const token = req.get('x-teacher-token');
  const session = token && teacherSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) teacherSessions.delete(token);
    return res.status(401).json({ error: 'unauthorized', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอาจารย์ใหม่อีกครั้ง' });
  }
  session.expiresAt = Date.now() + TEACHER_SESSION_TTL_MS;
  req.teacherId = session.teacherId;
  next();
}

function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key');
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized', message: 'ต้องระบุรหัสผู้ดูแลระบบที่ถูกต้อง' });
  }
  next();
}

function requireStudent(req, res, next) {
  const token = req.get('x-student-token');
  const session = token && studentSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) studentSessions.delete(token);
    return res.status(401).json({ error: 'unauthorized', message: 'Student session expired. Please sign in again.' });
  }
  session.expiresAt = Date.now() + STUDENT_SESSION_TTL_MS;
  req.studentId = session.studentId;
  next();
}

function createTeacherSession(teacherId) {
  const token = crypto.randomBytes(24).toString('hex');
  teacherSessions.set(token, { teacherId, expiresAt: Date.now() + TEACHER_SESSION_TTL_MS });
  return token;
}

function createStudentSession(studentId) {
  const token = crypto.randomBytes(24).toString('hex');
  studentSessions.set(token, { studentId, expiresAt: Date.now() + STUDENT_SESSION_TTL_MS });
  return token;
}

function removeTeacherSessions(teacherId) {
  for (const [token, session] of teacherSessions) {
    if (session.teacherId === teacherId) teacherSessions.delete(token);
  }
}

module.exports = {
  hashPassword, verifyPassword, requireTeacher, requireAdmin, requireStudent,
  createTeacherSession, createStudentSession, removeTeacherSessions,
  teacherSessions, studentSessions, purgeExpiredSessions
};
