function registerTeacherSetRoutes(app, { readDB, writeDB, requireTeacher, examTypes, newId, applyAcademicPeriod }) {
  const owned = (db, key, teacherId) => db.sets.find(set => set.key === key && set.teacherId === teacherId);
  app.get('/api/teacher/sets', requireTeacher, (req, res) => res.json(readDB().sets.filter(set => set.teacherId === req.teacherId)));
  app.post('/api/teacher/sets', requireTeacher, async (req, res) => {
    const body = req.body; if (!body?.title || !body.sections || !['ปวช.','ปวส.'].includes(body.educationLevel)) return res.status(400).json({ error: 'invalid_payload', message: 'กรุณาเลือกระดับ ปวช. หรือ ปวส.' });
    const now = new Date().toISOString(); const db = readDB(); const key = body.key || newId('set');
    const teacher = db.teachers.find(item => item.id === req.teacherId);
    const subjectTeacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : '';
    const set = { ...body, key, educationLevel: body.educationLevel, teacherId: req.teacherId, subjectTeacherName, subjectTeacherEmail: teacher?.email || '', examType: examTypes.includes(body.examType) ? body.examType : examTypes[0], assignedClasses: Array.isArray(body.assignedClasses) ? body.assignedClasses : [], publishMode: body.publishMode === 'auto' ? 'auto' : 'manual', createdAt: now, updatedAt: now };
    applyAcademicPeriod(set, db.settings); db.sets.push(set); await writeDB(db); res.status(201).json({ key });
  });
  app.put('/api/teacher/sets/:key', requireTeacher, async (req, res) => {
    const db = readDB(); const set = owned(db, req.params.key, req.teacherId); if (!set) return res.status(404).json({ error: 'not_found' });
    if (!['ปวช.','ปวส.'].includes(req.body.educationLevel)) return res.status(400).json({ error: 'invalid_payload', message: 'กรุณาเลือกระดับ ปวช. หรือ ปวส.' });
    const teacher = db.teachers.find(item => item.id === req.teacherId);
    const subjectTeacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : set.subjectTeacherName;
    Object.assign(set, { ...req.body, key: set.key, teacherId: set.teacherId, subjectTeacherName, subjectTeacherEmail: teacher?.email || '', examType: examTypes.includes(req.body.examType) ? req.body.examType : set.examType, assignedClasses: Array.isArray(req.body.assignedClasses) ? req.body.assignedClasses : [], updatedAt: new Date().toISOString() });
    applyAcademicPeriod(set, db.settings); await writeDB(db); res.json({ ok: true });
  });
  app.post('/api/teacher/sets/:key/duplicate', requireTeacher, async (req, res) => {
    const db = readDB(); const set = owned(db, req.params.key, req.teacherId); if (!set) return res.status(404).json({ error: 'not_found' });
    const copy = JSON.parse(JSON.stringify(set)); copy.key = newId('set'); copy.title += ' (สำเนา)'; copy.archived = false; delete copy.archivedAt; copy.academicYear = null; copy.semester = null; copy.semesterLabel = null; copy.assignedClasses = []; copy.examSchedules = []; copy.availableFrom = null; copy.availableUntil = null; copy.lateAccessCode = ''; copy.resitAccesses = []; copy.createdAt = copy.updatedAt = new Date().toISOString(); db.sets.push(copy); await writeDB(db); res.status(201).json({ key: copy.key });
  });
  app.post('/api/teacher/sets/:key/archive', requireTeacher, async (req, res) => {
    const db = readDB(); const set = owned(db, req.params.key, req.teacherId); if (!set) return res.status(404).json({ error: 'not_found' });
    set.archived = true; set.archivedAt = set.updatedAt = new Date().toISOString(); await writeDB(db); res.json({ ok: true });
  });
  app.post('/api/teacher/sets/:key/restore', requireTeacher, async (req, res) => {
    const db = readDB(); const set = owned(db, req.params.key, req.teacherId); if (!set) return res.status(404).json({ error: 'not_found' });
    set.archived = false; delete set.archivedAt; set.updatedAt = new Date().toISOString(); await writeDB(db); res.json({ ok: true });
  });
  app.delete('/api/teacher/sets/:key', requireTeacher, async (req, res) => { const db = readDB(); if (!owned(db, req.params.key, req.teacherId)) return res.status(404).json({ error: 'not_found' }); db.sets = db.sets.filter(set => set.key !== req.params.key); await writeDB(db); res.json({ ok: true }); });
}
module.exports = { registerTeacherSetRoutes };
