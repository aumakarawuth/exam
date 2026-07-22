const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const { validateTeacherPayload, sendValidationError } = require('../validation');

function purgeExpiredLoginFailures(store, now = Date.now()) {
  let removed = 0;
  for (const [key, entry] of store) {
    const expiresAt = Math.max(entry.windowStartedAt + LOGIN_WINDOW_MS, entry.lockedUntil || 0);
    if (expiresAt <= now) { store.delete(key); removed += 1; }
  }
  return removed;
}

function clientKey(req) { return req.ip || req.socket?.remoteAddress || 'unknown'; }
function canAttempt(store, key) {
  const entry = store.get(key);
  if (!entry) return true;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return false;
  if (entry.windowStartedAt + LOGIN_WINDOW_MS <= Date.now()) store.delete(key);
  return true;
}
function registerFailure(store, key) {
  const now = Date.now();
  const entry = store.get(key);
  const current = entry && entry.windowStartedAt + LOGIN_WINDOW_MS > now ? entry : { count: 0, windowStartedAt: now, lockedUntil: 0 };
  current.count += 1;
  if (current.count >= MAX_LOGIN_FAILURES) current.lockedUntil = now + LOGIN_WINDOW_MS;
  store.set(key, current);
  return !!current.lockedUntil;
}

function registerAccountRoutes(app, dependencies) {
  const {
    ADMIN_KEY, readDB, writeDB, hashPassword, verifyPassword, requireAdmin,
    requireTeacher, createTeacherSession, removeTeacherSessions, sessionStore, newId
  } = dependencies;
  const adminLoginFailures = new Map();
  const teacherLoginFailures = new Map();
  const cleanupTimer = setInterval(() => {
    purgeExpiredLoginFailures(adminLoginFailures);
    purgeExpiredLoginFailures(teacherLoginFailures);
  }, LOGIN_WINDOW_MS);
  cleanupTimer.unref();

  app.post('/api/admin/verify', (req, res) => {
    const key = clientKey(req);
    if (!canAttempt(adminLoginFailures, key)) return res.status(429).json({ ok: false, error: 'rate_limited', message: 'ลองรหัสผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่' });
    if (req.get('x-admin-key') === ADMIN_KEY) { adminLoginFailures.delete(key); return res.json({ ok: true }); }
    const locked = registerFailure(adminLoginFailures, key);
    return res.status(locked ? 429 : 401).json({ ok: false, error: locked ? 'rate_limited' : 'invalid_credentials', message: locked ? 'ลองรหัสผิดครบ 5 ครั้ง กรุณารอ 15 นาทีแล้วลองใหม่' : 'รหัสผู้ดูแลระบบไม่ถูกต้อง' });
  });

  app.get('/api/admin/backup.json', requireAdmin, (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="exam-system-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({ version: 1, exportedAt: new Date().toISOString(), database: readDB() });
  });

  app.get('/api/teachers', requireAdmin, (req, res) => {
    const db = readDB();
    res.json(db.teachers.map(t => ({ id: t.id, firstName: t.firstName, lastName: t.lastName, username: t.username, createdAt: t.createdAt })));
  });

  app.post('/api/teachers', requireAdmin, async (req, res) => {
    const body = req.body;
    const errors = validateTeacherPayload(body);
    if (errors.length) return sendValidationError(res, errors);
    const db = readDB();
    if (db.teachers.some(t => t.username === body.username)) {
      return res.status(409).json({ error: 'duplicate', message: 'มี username นี้อยู่ในระบบแล้ว' });
    }
    const teacher = {
      id: newId('teacher'), firstName: body.firstName.trim(), lastName: body.lastName.trim(),
      username: body.username.trim(), passwordHash: hashPassword(body.password), createdAt: new Date().toISOString()
    };
    db.teachers.push(teacher);
    await writeDB(db);
    res.status(201).json({ id: teacher.id });
  });

  app.patch('/api/teachers/:id/password', requireAdmin, async (req, res) => {
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'weak_password', message: 'รหัสผ่านใหม่ต้องมี 8-128 ตัวอักษร' });
    }
    const db = readDB();
    const teacher = db.teachers.find(item => item.id === req.params.id);
    if (!teacher) return res.status(404).json({ error: 'not_found', message: 'ไม่พบบัญชีอาจารย์นี้' });
    teacher.passwordHash = hashPassword(password);
    teacher.passwordChangedAt = new Date().toISOString();
    await writeDB(db);
    await removeTeacherSessions(teacher.id);
    res.json({ ok: true });
  });

  app.delete('/api/teachers/:id', requireAdmin, async (req, res) => {
    const db = readDB();
    db.teachers = db.teachers.filter(t => t.id !== req.params.id);
    db.sets.forEach(set => { if (set.teacherId === req.params.id) set.teacherId = null; });
    await writeDB(db);
    await removeTeacherSessions(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/teacher/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'invalid_payload', message: 'กรุณากรอก username และ password' });
    const key = clientKey(req);
    if (!canAttempt(teacherLoginFailures, key)) return res.status(429).json({ error: 'rate_limited', message: 'ลองรหัสผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่' });
    const teacher = readDB().teachers.find(t => t.username === username.trim());
    if (!teacher || !verifyPassword(password, teacher.passwordHash)) {
      const locked = registerFailure(teacherLoginFailures, key);
      return res.status(locked ? 429 : 401).json({ error: locked ? 'rate_limited' : 'invalid_credentials', message: locked ? 'ลองรหัสผิดครบ 5 ครั้ง กรุณารอ 15 นาทีแล้วลองใหม่' : 'username หรือ password ไม่ถูกต้อง' });
    }
    teacherLoginFailures.delete(key);
    const token = await createTeacherSession(teacher.id);
    res.json({ token, teacherId: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName });
  });

  app.post('/api/teacher/change-password', requireTeacher, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'invalid_payload', message: 'กรุณากรอกรหัสผ่านให้ครบ' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'weak_password', message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'same_password', message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' });
    }

    const db = readDB();
    const teacher = db.teachers.find(item => item.id === req.teacherId);
    if (!teacher || !verifyPassword(currentPassword, teacher.passwordHash)) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }

    teacher.passwordHash = hashPassword(newPassword);
    teacher.passwordChangedAt = new Date().toISOString();
    await writeDB(db);
    await removeTeacherSessions(teacher.id);
    const token = await createTeacherSession(teacher.id);
    res.json({ ok: true, token });
  });

  app.post('/api/teacher/logout', requireTeacher, async (req, res) => {
    await sessionStore.remove('teacher', req.get('x-teacher-token'));
    res.json({ ok: true });
  });
}

module.exports = { registerAccountRoutes, purgeExpiredLoginFailures, LOGIN_WINDOW_MS };
