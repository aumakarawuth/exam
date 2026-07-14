function registerTeacherResultRoutes(app, { readDB, writeDB, requireTeacher }) {
  const ownedResult = (db, teacherId, resultId) => {
    const result = db.results.find(row => row.id === resultId);
    return result && db.sets.some(set => set.key === result.questionKey && set.teacherId === teacherId) ? result : null;
  };
  app.get('/api/teacher/results', requireTeacher, (req, res) => {
    const db = readDB(); const keys = new Set(db.sets.filter(set => set.teacherId === req.teacherId).map(set => set.key));
    let rows = db.results.filter(row => keys.has(row.questionKey));
    if (req.query.setKey) rows = rows.filter(row => row.questionKey === req.query.setKey);
    if (req.query.examType) rows = rows.filter(row => row.examType === req.query.examType);
    res.json(rows.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
  });
  app.patch('/api/teacher/results/:id', requireTeacher, async (req, res) => {
    const db = readDB(); const result = ownedResult(db, req.teacherId, req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    if (typeof req.body.published === 'boolean') result.published = req.body.published;
    await writeDB(db); res.json({ ok: true, published: result.published });
  });
  app.post('/api/teacher/sets/:key/publish', requireTeacher, async (req, res) => {
    const db = readDB(); if (!db.sets.some(set => set.key === req.params.key && set.teacherId === req.teacherId)) return res.status(404).json({ error: 'not_found' });
    let count = 0; db.results.forEach(row => { if (row.questionKey === req.params.key) { row.published = true; count++; } });
    await writeDB(db); res.json({ ok: true, count });
  });
  app.delete('/api/teacher/results/:id', requireTeacher, async (req, res) => {
    const db = readDB(); if (!ownedResult(db, req.teacherId, req.params.id)) return res.status(404).json({ error: 'not_found' });
    db.results = db.results.filter(row => row.id !== req.params.id); await writeDB(db); res.json({ ok: true });
  });
}
module.exports = { registerTeacherResultRoutes };
