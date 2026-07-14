function registerAdminResultRoutes(app, { readDB, writeDB, requireAdmin }) {
  app.get('/api/results', requireAdmin, (req, res) => {
    let rows = [...readDB().results];
    if (req.query.setKey) rows = rows.filter(row => row.questionKey === req.query.setKey);
    if (req.query.examType) rows = rows.filter(row => row.examType === req.query.examType);
    res.json(rows.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
  });

  app.delete('/api/results/:id', requireAdmin, async (req, res) => {
    const db = readDB(); db.results = db.results.filter(row => row.id !== req.params.id); await writeDB(db); res.json({ ok: true });
  });

  app.patch('/api/results/:id', requireAdmin, async (req, res) => {
    const db = readDB(); const result = db.results.find(row => row.id === req.params.id);
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
    await writeDB(db); res.json({ ok: true, published: result.published });
  });

  app.post('/api/sets/:key/publish', requireAdmin, async (req, res) => {
    const db = readDB(); let count = 0;
    db.results.forEach(row => { if (row.questionKey === req.params.key) { row.published = true; count++; } });
    await writeDB(db); res.json({ ok: true, count });
  });
}
module.exports = { registerAdminResultRoutes };
