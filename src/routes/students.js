function registerStudentRoutes(app, { readDB, writeDB, requireAdmin, hashPassword, verifyPassword }) {
  const findStudent = (students, studentId) => students.find(student => student.studentId === studentId.trim());

  app.get('/api/students/:studentId', (req, res) => {
    const student = findStudent(readDB().students, req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรหัสนักเรียนนี้ในระบบ' });
    res.json({ studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classRoom: student.classRoom, hasPin: Boolean(student.pinHash) });
  });

  app.post('/api/students/:studentId/set-pin', async (req, res) => {
    const db = readDB();
    const student = findStudent(db.students, req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรหัสนักเรียนนี้ในระบบ' });
    if (student.pinHash) return res.status(409).json({ error: 'pin_already_set', message: 'ตั้ง PIN แล้ว กรุณาติดต่อผู้ดูแลระบบหากลืม PIN' });
    const pin = String(req.body?.pin || '').trim();
    if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'invalid_pin', message: 'PIN ต้องเป็นตัวเลข 4-6 หลัก' });
    student.pinHash = hashPassword(pin);
    student.pinFailedAttempts = 0;
    await writeDB(db);
    res.json({ ok: true });
  });

  app.post('/api/students/:studentId/verify-pin', async (req, res) => {
    const db = readDB();
    const student = findStudent(db.students, req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรหัสนักเรียนนี้ในระบบ' });
    if (!student.pinHash) return res.status(409).json({ error: 'pin_not_set', message: 'ยังไม่ได้ตั้ง PIN' });
    if ((student.pinFailedAttempts || 0) >= 5) return res.status(423).json({ error: 'pin_locked', message: 'PIN ถูกล็อก กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ต' });

    const pin = String(req.body?.pin || '').trim();
    if (verifyPassword(pin, student.pinHash)) {
      student.pinFailedAttempts = 0;
      await writeDB(db);
      return res.json({ ok: true });
    }
    student.pinFailedAttempts = (student.pinFailedAttempts || 0) + 1;
    await writeDB(db);
    const remainingAttempts = Math.max(0, 5 - student.pinFailedAttempts);
    res.json({ ok: false, remainingAttempts, locked: remainingAttempts === 0 });
  });

  app.post('/api/students/:studentId/reset-pin', requireAdmin, async (req, res) => {
    const db = readDB();
    const student = findStudent(db.students, req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found' });
    delete student.pinHash;
    student.pinFailedAttempts = 0;
    await writeDB(db);
    res.json({ ok: true });
  });

  app.get('/api/students/:studentId/results', (req, res) => {
    const results = readDB().results.filter(result => result.studentId === req.params.studentId.trim()).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map(result => ({ questionKey: result.questionKey, questionTitle: result.questionTitle, examType: result.examType, submittedAt: result.submittedAt, published: !!result.published, overallScore20: result.published ? result.overallScore20 : null, sectionScores: result.published ? result.sectionScores : null }));
    res.json(results);
  });

  app.get('/api/students', requireAdmin, (req, res) => {
    let students = readDB().students;
    if (req.query.classRoom) students = students.filter(student => student.classRoom === req.query.classRoom);
    res.json([...students].sort((a, b) => (a.classRoom + a.studentId).localeCompare(b.classRoom + b.studentId)).map(student => ({ studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classRoom: student.classRoom, hasPin: Boolean(student.pinHash) })));
  });

  app.post('/api/students', requireAdmin, async (req, res) => {
    const body = req.body;
    if (!body || !body.studentId || !body.firstName || !body.lastName || !body.classRoom) return res.status(400).json({ error: 'invalid_payload', message: 'กรอกข้อมูลนักเรียนไม่ครบ' });
    const db = readDB();
    const studentId = body.studentId.trim();
    if (db.students.some(student => student.studentId === studentId)) return res.status(409).json({ error: 'duplicate', message: 'มีรหัสนักเรียนนี้อยู่ในระบบแล้ว' });
    db.students.push({ studentId, firstName: body.firstName.trim(), lastName: body.lastName.trim(), classRoom: body.classRoom.trim(), pinFailedAttempts: 0, createdAt: new Date().toISOString() });
    await writeDB(db);
    res.status(201).json({ ok: true });
  });

  app.post('/api/students/bulk', requireAdmin, async (req, res) => {
    const lines = ((req.body && req.body.text) || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const db = readDB(); const byId = new Map(db.students.map(student => [student.studentId, student]));
    let imported = 0, updated = 0; const errors = [];
    lines.forEach((line, index) => {
      const [studentId, firstName, lastName, classRoom] = (line.includes('\t') ? line.split('\t') : line.split(',')).map(value => (value || '').trim());
      if (!studentId || !firstName || !lastName || !classRoom) { errors.push(`บรรทัดที่ ${index + 1}: ข้อมูลไม่ครบ ("${line}")`); return; }
      if (byId.has(studentId)) { Object.assign(byId.get(studentId), { firstName, lastName, classRoom }); updated++; }
      else { const student = { studentId, firstName, lastName, classRoom, pinFailedAttempts: 0, createdAt: new Date().toISOString() }; byId.set(studentId, student); db.students.push(student); imported++; }
    });
    await writeDB(db); res.json({ imported, updated, errors });
  });

  app.put('/api/students/:studentId', requireAdmin, async (req, res) => {
    const db = readDB(); const student = findStudent(db.students, req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found' });
    Object.assign(student, { firstName: req.body.firstName ?? student.firstName, lastName: req.body.lastName ?? student.lastName, classRoom: req.body.classRoom ?? student.classRoom });
    await writeDB(db); res.json({ ok: true });
  });

  app.delete('/api/students/:studentId', requireAdmin, async (req, res) => {
    const db = readDB(); db.students = db.students.filter(student => student.studentId !== req.params.studentId);
    await writeDB(db); res.json({ ok: true });
  });

  app.get('/api/classes', requireAdmin, (req, res) => res.json([...new Set(readDB().students.map(student => student.classRoom))].sort()));
}

module.exports = { registerStudentRoutes };
