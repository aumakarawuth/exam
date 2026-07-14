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

function createTeacherSession(teacherId) {
  const token = crypto.randomBytes(24).toString('hex');
  teacherSessions.set(token, { teacherId, expiresAt: Date.now() + TEACHER_SESSION_TTL_MS });
  return token;
}

function removeTeacherSessions(teacherId) {
  for (const [token, session] of teacherSessions) {
    if (session.teacherId === teacherId) teacherSessions.delete(token);
  }
}

module.exports = {
  hashPassword, verifyPassword, requireTeacher, requireAdmin,
  createTeacherSession, removeTeacherSessions, teacherSessions, TEACHER_SESSION_TTL_MS
};
