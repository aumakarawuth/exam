function registerAccountRoutes(app, dependencies) {
  const {
    ADMIN_KEY, readDB, writeDB, hashPassword, verifyPassword, requireAdmin,
    requireTeacher, createTeacherSession, removeTeacherSessions, teacherSessions, newId
  } = dependencies;

  app.post('/api/admin/verify', (req, res) => {
    if (req.get('x-admin-key') === ADMIN_KEY) return res.json({ ok: true });
    return res.status(401).json({ ok: false });
  });

  app.get('/api/teachers', requireAdmin, (req, res) => {
    const db = readDB();
    res.json(db.teachers.map(t => ({ id: t.id, firstName: t.firstName, lastName: t.lastName, username: t.username, createdAt: t.createdAt })));
  });

  app.post('/api/teachers', requireAdmin, async (req, res) => {
    const body = req.body;
    if (!body || !body.firstName || !body.lastName || !body.username || !body.password) {
      return res.status(400).json({ error: 'invalid_payload', message: 'กรอกข้อมูลอาจารย์ไม่ครบ (ชื่อ, นามสกุล, username, password)' });
    }
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

  app.delete('/api/teachers/:id', requireAdmin, async (req, res) => {
    const db = readDB();
    db.teachers = db.teachers.filter(t => t.id !== req.params.id);
    db.sets.forEach(set => { if (set.teacherId === req.params.id) set.teacherId = null; });
    await writeDB(db);
    removeTeacherSessions(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/teacher/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'invalid_payload', message: 'กรุณากรอก username และ password' });
    const teacher = readDB().teachers.find(t => t.username === username.trim());
    if (!teacher || !verifyPassword(password, teacher.passwordHash)) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'username หรือ password ไม่ถูกต้อง' });
    }
    const token = createTeacherSession(teacher.id);
    res.json({ token, teacherId: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName });
  });

  app.post('/api/teacher/logout', requireTeacher, (req, res) => {
    teacherSessions.delete(req.get('x-teacher-token'));
    res.json({ ok: true });
  });
}

module.exports = { registerAccountRoutes };
