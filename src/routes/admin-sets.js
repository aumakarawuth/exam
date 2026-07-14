function registerAdminSetRoutes(app, { readDB, writeDB, requireAdmin, examTypes, newId }) {
  app.get('/api/admin/sets', requireAdmin, (req, res) => res.json(readDB().sets));

  app.post('/api/sets', requireAdmin, async (req, res) => {
    const body = req.body;
    if (!body || !body.title || !body.sections) return res.status(400).json({ error: 'invalid_payload', message: 'ข้อมูลชุดข้อสอบไม่ครบ' });
    const db = readDB(); const key = body.key || newId('set'); const now = new Date().toISOString();
    db.sets.push({ key, title: body.title, courseName: body.courseName || body.title, tagline: body.tagline || '', desc: body.desc || '', examType: examTypes.includes(body.examType) ? body.examType : examTypes[0], teacherId: body.teacherId || null, assignedClasses: Array.isArray(body.assignedClasses) ? body.assignedClasses : [], subjectTeacherName: body.subjectTeacherName || '', subjectTeacherEmail: body.subjectTeacherEmail || '', shuffleQuestions: !!body.shuffleQuestions, shuffleChoices: !!body.shuffleChoices, publishMode: body.publishMode === 'auto' ? 'auto' : 'manual', availableUntil: body.availableUntil || null, lateAccessCode: body.lateAccessCode || '', sections: body.sections, createdAt: now, updatedAt: now });
    await writeDB(db); res.status(201).json({ key });
  });

  app.put('/api/sets/:key', requireAdmin, async (req, res) => {
    const db = readDB(); const index = db.sets.findIndex(set => set.key === req.params.key);
    if (index === -1) return res.status(404).json({ error: 'not_found' });
    const body = req.body; const old = db.sets[index];
    db.sets[index] = Object.assign({}, old, { title: body.title, courseName: body.courseName || body.title, tagline: body.tagline || '', desc: body.desc || '', examType: examTypes.includes(body.examType) ? body.examType : (old.examType || examTypes[0]), teacherId: body.teacherId !== undefined ? body.teacherId : old.teacherId, assignedClasses: Array.isArray(body.assignedClasses) ? body.assignedClasses : [], subjectTeacherName: body.subjectTeacherName || '', subjectTeacherEmail: body.subjectTeacherEmail || '', shuffleQuestions: !!body.shuffleQuestions, shuffleChoices: !!body.shuffleChoices, publishMode: body.publishMode === 'auto' ? 'auto' : 'manual', availableUntil: body.availableUntil || null, lateAccessCode: body.lateAccessCode || '', sections: body.sections, updatedAt: new Date().toISOString() });
    await writeDB(db); res.json({ ok: true });
  });

  app.post('/api/sets/:key/duplicate', requireAdmin, async (req, res) => {
    const db = readDB(); const original = db.sets.find(set => set.key === req.params.key);
    if (!original) return res.status(404).json({ error: 'not_found' });
    const copy = JSON.parse(JSON.stringify(original)); copy.key = newId('set'); copy.title = `${original.title} (สำเนา)`; copy.createdAt = new Date().toISOString(); copy.updatedAt = copy.createdAt;
    db.sets.push(copy); await writeDB(db); res.status(201).json({ key: copy.key });
  });

  app.delete('/api/sets/:key', requireAdmin, async (req, res) => {
    const db = readDB(); db.sets = db.sets.filter(set => set.key !== req.params.key); await writeDB(db); res.json({ ok: true });
  });
}
module.exports = { registerAdminSetRoutes };
