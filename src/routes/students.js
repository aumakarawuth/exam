const express = require('express');
const XLSX = require('xlsx');

function registerStudentRoutes(app, { readDB, writeDB, requireAdmin, requireStudent, hashPassword, verifyPassword, createStudentSession }) {
  const findStudent = (students, studentId) => students.find(student => student.studentId === studentId.trim());
  const publicStudent = student => ({ studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classRoom: student.classRoom, examPeriod: student.examPeriod || '' });

  app.get('/api/students/export.xlsx', requireAdmin, (req, res) => {
    const rows = readDB().students
      .sort((a, b) => (a.classRoom + a.studentId).localeCompare(b.classRoom + b.studentId))
      .map(student => ({ 'รหัสนักเรียน': student.studentId, 'ชื่อ': student.firstName, 'นามสกุล': student.lastName, 'ห้อง': student.classRoom, 'รอบเรียน': student.examPeriod || '', 'ตั้ง PIN แล้ว': student.pinHash ? 'ใช่' : 'ไม่' }));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: ['รหัสนักเรียน', 'ชื่อ', 'นามสกุล', 'ห้อง', 'รอบเรียน', 'ตั้ง PIN แล้ว'] });
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'รายชื่อนักเรียน');
    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="students.xlsx"');
    res.send(output);
  });

  app.get('/api/students/:studentId', (req, res) => {
    const student = findStudent(readDB().students, req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรหัสนักเรียนนี้ในระบบ' });
    res.json({ studentId: student.studentId, hasPin: Boolean(student.pinHash) });
  });

  app.get('/api/student/session', requireStudent, (req, res) => {
    const student = findStudent(readDB().students, req.studentId);
    if (!student) return res.status(401).json({ error: 'unauthorized' });
    res.json({ student: publicStudent(student) });
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
    res.json({ ok: true, token: createStudentSession(student.studentId), student: publicStudent(student) });
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
      return res.json({ ok: true, token: createStudentSession(student.studentId), student: publicStudent(student) });
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

  app.get('/api/students/:studentId/results', requireStudent, (req, res) => {
    if (req.studentId !== req.params.studentId.trim()) return res.status(403).json({ error: 'forbidden', message: 'No access to this student result.' });
    const results = readDB().results.filter(result => result.studentId === req.params.studentId.trim()).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map(result => ({ questionKey: result.questionKey, questionTitle: result.questionTitle, examType: result.examType, submittedAt: result.submittedAt, published: !!result.published, overallScore20: result.published ? result.overallScore20 : null, sectionScores: result.published ? result.sectionScores : null }));
    res.json(results);
  });

  app.get('/api/students', requireAdmin, (req, res) => {
    let students = readDB().students;
    if (req.query.classRoom) students = students.filter(student => student.classRoom === req.query.classRoom);
    res.json([...students].sort((a, b) => (a.classRoom + a.studentId).localeCompare(b.classRoom + b.studentId)).map(student => ({ studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classRoom: student.classRoom, examPeriod: student.examPeriod || '', hasPin: Boolean(student.pinHash) })));
  });

  app.post('/api/students', requireAdmin, async (req, res) => {
    const body = req.body;
    if (!body || !body.studentId || !body.firstName || !body.lastName || !body.classRoom) return res.status(400).json({ error: 'invalid_payload', message: 'กรอกข้อมูลนักเรียนไม่ครบ' });
    const db = readDB();
    const studentId = body.studentId.trim();
    if (db.students.some(student => student.studentId === studentId)) return res.status(409).json({ error: 'duplicate', message: 'มีรหัสนักเรียนนี้อยู่ในระบบแล้ว' });
    db.students.push({ studentId, firstName: body.firstName.trim(), lastName: body.lastName.trim(), classRoom: body.classRoom.trim(), examPeriod: ['เช้า','บ่าย'].includes(body.examPeriod) ? body.examPeriod : '', pinFailedAttempts: 0, createdAt: new Date().toISOString() });
    await writeDB(db);
    res.status(201).json({ ok: true });
  });

  app.post('/api/students/bulk', requireAdmin, async (req, res) => {
    const lines = ((req.body && req.body.text) || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const db = readDB(); const byId = new Map(db.students.map(student => [student.studentId, student]));
    let imported = 0, updated = 0; const errors = [];
    lines.forEach((line, index) => {
      const [studentId, firstName, lastName, classRoom, examPeriod] = (line.includes('\t') ? line.split('\t') : line.split(',')).map(value => (value || '').trim());
      if (!studentId || !firstName || !lastName || !classRoom) { errors.push(`บรรทัดที่ ${index + 1}: ข้อมูลไม่ครบ ("${line}")`); return; }
      if (byId.has(studentId)) { Object.assign(byId.get(studentId), { firstName, lastName, classRoom, examPeriod: ['เช้า','บ่าย'].includes(examPeriod) ? examPeriod : '' }); updated++; }
      else { const student = { studentId, firstName, lastName, classRoom, examPeriod: ['เช้า','บ่าย'].includes(examPeriod) ? examPeriod : '', pinFailedAttempts: 0, createdAt: new Date().toISOString() }; byId.set(studentId, student); db.students.push(student); imported++; }
    });
    await writeDB(db); res.json({ imported, updated, errors });
  });

  app.post('/api/students/import-xlsx', requireAdmin, express.raw({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'], limit: '2mb' }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'invalid_file', message: 'กรุณาเลือกไฟล์ Excel' });
    let rows;
    try {
      const workbook = XLSX.read(req.body, { type: 'buffer' });
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    } catch { return res.status(400).json({ error: 'invalid_file', message: 'ไม่สามารถอ่านไฟล์ Excel นี้ได้' }); }
    const valueOf = (row, names) => {
      const key = Object.keys(row).find(column => names.includes(String(column).trim().toLowerCase()));
      return key === undefined ? '' : String(row[key] ?? '').trim();
    };
    const db = readDB(); const byId = new Map(db.students.map(student => [student.studentId, student]));
    let imported = 0, updated = 0; const errors = [];
    rows.forEach((row, index) => {
      const studentId = valueOf(row, ['รหัสนักเรียน', 'studentid', 'student_id', 'id']);
      const firstName = valueOf(row, ['ชื่อ', 'firstname', 'first_name']);
      const lastName = valueOf(row, ['นามสกุล', 'lastname', 'last_name']);
      const classRoom = valueOf(row, ['ห้อง', 'classroom', 'class_room', 'class']); const examPeriod = valueOf(row, ['รอบเรียน', 'รอบ', 'period', 'examperiod']);
      if (!studentId || !firstName || !lastName || !classRoom) { errors.push(`แถว ${index + 2}: ข้อมูลไม่ครบ`); return; }
      if (byId.has(studentId)) { Object.assign(byId.get(studentId), { firstName, lastName, classRoom, examPeriod: ['เช้า','บ่าย'].includes(examPeriod) ? examPeriod : '' }); updated += 1; }
      else { const student = { studentId, firstName, lastName, classRoom, examPeriod: ['เช้า','บ่าย'].includes(examPeriod) ? examPeriod : '', pinFailedAttempts: 0, createdAt: new Date().toISOString() }; byId.set(studentId, student); db.students.push(student); imported += 1; }
    });
    await writeDB(db); res.json({ imported, updated, errors });
  });

  app.put('/api/students/:studentId', requireAdmin, async (req, res) => {
    const db = readDB(); const student = findStudent(db.students, req.params.studentId);
    if (!student) return res.status(404).json({ error: 'not_found' });
    Object.assign(student, { firstName: req.body.firstName ?? student.firstName, lastName: req.body.lastName ?? student.lastName, classRoom: req.body.classRoom ?? student.classRoom, examPeriod: req.body.examPeriod === '' ? '' : (['เช้า','บ่าย'].includes(req.body.examPeriod) ? req.body.examPeriod : student.examPeriod) });
    await writeDB(db); res.json({ ok: true });
  });

  app.delete('/api/students/:studentId', requireAdmin, async (req, res) => {
    const db = readDB(); db.students = db.students.filter(student => student.studentId !== req.params.studentId);
    await writeDB(db); res.json({ ok: true });
  });

  app.get('/api/classes', requireAdmin, (req, res) => { const period=String(req.query.period||''); res.json([...new Set(readDB().students.filter(student=>!period||student.examPeriod===period).map(student => student.classRoom))].sort()); });
}

module.exports = { registerStudentRoutes };
