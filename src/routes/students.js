function registerStudentRoutes(app, { readDB, writeDB, requireAdmin }) {
  app.get('/api/students/:studentId', (req, res) => {
    const student = readDB().students.find(x => x.studentId === req.params.studentId.trim());
    if (!student) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรหัสนักเรียนนี้ในระบบ กรุณาตรวจสอบรหัส หรือติดต่อผู้ดูแลระบบ' });
    res.json(student);
  });

  app.get('/api/students/:studentId/results', (req, res) => {
    const results = readDB().results
      .filter(result => result.studentId === req.params.studentId.trim())
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .map(result => ({
        questionKey: result.questionKey, questionTitle: result.questionTitle, examType: result.examType,
        submittedAt: result.submittedAt, published: !!result.published,
        overallScore20: result.published ? result.overallScore20 : null,
        sectionScores: result.published ? result.sectionScores : null
      }));
    res.json(results);
  });

  app.get('/api/students', requireAdmin, (req, res) => {
    let students = readDB().students;
    if (req.query.classRoom) students = students.filter(student => student.classRoom === req.query.classRoom);
    res.json([...students].sort((a, b) => (a.classRoom + a.studentId).localeCompare(b.classRoom + b.studentId)));
  });

  app.post('/api/students', requireAdmin, async (req, res) => {
    const body = req.body;
    if (!body || !body.studentId || !body.firstName || !body.lastName || !body.classRoom) {
      return res.status(400).json({ error: 'invalid_payload', message: 'กรอกข้อมูลนักเรียนไม่ครบ (รหัส, ชื่อ, นามสกุล, ห้อง)' });
    }
    const db = readDB();
    if (db.students.some(student => student.studentId === body.studentId)) return res.status(409).json({ error: 'duplicate', message: 'มีรหัสนักเรียนนี้อยู่ในระบบแล้ว' });
    db.students.push({ studentId: body.studentId.trim(), firstName: body.firstName.trim(), lastName: body.lastName.trim(), classRoom: body.classRoom.trim(), createdAt: new Date().toISOString() });
    await writeDB(db);
    res.status(201).json({ ok: true });
  });

  app.post('/api/students/bulk', requireAdmin, async (req, res) => {
    const lines = ((req.body && req.body.text) || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const db = readDB();
    const byId = new Map(db.students.map(student => [student.studentId, student]));
    let imported = 0, updated = 0;
    const errors = [];
    lines.forEach((line, index) => {
      const [studentId, firstName, lastName, classRoom] = (line.includes('\t') ? line.split('\t') : line.split(',')).map(value => (value || '').trim());
      if (!studentId || !firstName || !lastName || !classRoom) { errors.push(`บรรทัดที่ ${index + 1}: ข้อมูลไม่ครบ ("${line}")`); return; }
      if (byId.has(studentId)) { Object.assign(byId.get(studentId), { firstName, lastName, classRoom }); updated++; }
      else { const student = { studentId, firstName, lastName, classRoom, createdAt: new Date().toISOString() }; byId.set(studentId, student); db.students.push(student); imported++; }
    });
    await writeDB(db);
    res.json({ imported, updated, errors });
  });

  app.put('/api/students/:studentId', requireAdmin, async (req, res) => {
    const db = readDB();
    const student = db.students.find(x => x.studentId === req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found' });
    Object.assign(student, { firstName: req.body.firstName ?? student.firstName, lastName: req.body.lastName ?? student.lastName, classRoom: req.body.classRoom ?? student.classRoom });
    await writeDB(db);
    res.json({ ok: true });
  });

  app.delete('/api/students/:studentId', requireAdmin, async (req, res) => {
    const db = readDB();
    db.students = db.students.filter(student => student.studentId !== req.params.studentId);
    await writeDB(db);
    res.json({ ok: true });
  });

  app.get('/api/classes', requireAdmin, (req, res) => {
    res.json([...new Set(readDB().students.map(student => student.classRoom))].sort());
  });
}

module.exports = { registerStudentRoutes };
