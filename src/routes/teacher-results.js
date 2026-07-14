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
    if (Array.isArray(req.body.dfdLevelScores)) {
      if (result.detail?.type !== 'dfd' || req.body.dfdLevelScores.length !== 3) return res.status(400).json({ error: 'invalid_dfd_scores', message: 'คะแนน DFD ไม่ถูกต้อง' });
      const scores = req.body.dfdLevelScores.map(score => Number(score));
      if (scores.some(score => !Number.isFinite(score) || score < 0 || score > 100)) return res.status(400).json({ error: 'invalid_dfd_scores', message: 'แต่ละ Level ต้องมีคะแนน 0–100' });
      result.detail.levelScores = scores;
      result.detail.rawScore = scores.reduce((sum, score) => sum + score, 0);
      result.detail.levels = (result.detail.levels || []).map(level => ({ ...level, score: scores[Number(level.level)] ?? level.score }));
      result.sectionScores = { mc: scores[0], matching: scores[1], written: scores[2] };
      result.overallScore20 = Math.round((result.detail.rawScore / 300 * 20 + Number.EPSILON) * 100) / 100;
      result.scoreAdjustedAt = new Date().toISOString();
    }
    if (req.body.writtenManualScores && typeof req.body.writtenManualScores === 'object') {
      const set = db.sets.find(item => item.key === result.questionKey);
      if (!set) return res.status(404).json({ error: 'not_found' });
      const scores = {};
      for (const question of set.sections.written.questions || []) {
        const score = Number(req.body.writtenManualScores[question.id]);
        if (!Number.isFinite(score) || score < 0 || score > Number(question.maxPoints || 0)) return res.status(400).json({ error: 'invalid_written_scores', message: 'คะแนนอัตนัยไม่ถูกต้อง' });
        scores[question.id] = score;
      }
      result.detail.writtenManualScores = scores;
      result.sectionScores.written = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) * 100) / 100;
      result.overallScore20 = Math.round((result.sectionScores.mc + result.sectionScores.matching + result.sectionScores.written) * 100) / 100;
      result.scoreAdjustedAt = new Date().toISOString();
    }
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
