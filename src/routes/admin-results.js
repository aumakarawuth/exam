const { appendAuditLog, resultAuditSnapshot } = require('../audit-log');

function registerAdminResultRoutes(app, { readDB, writeDB, requireAdmin, newId }) {
  app.get('/api/results', requireAdmin, (req, res) => {
    let rows = [...readDB().results];
    if (req.query.setKey) rows = rows.filter(row => row.questionKey === req.query.setKey);
    if (req.query.examType) rows = rows.filter(row => row.examType === req.query.examType);
    if (req.query.academicYear) rows = rows.filter(row => row.academicYear === req.query.academicYear);
    if (req.query.semester) rows = rows.filter(row => row.semester === req.query.semester);
    res.json(rows.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
  });

  app.delete('/api/results/:id', requireAdmin, async (req, res) => {
    const db = readDB(); const result = db.results.find(row => row.id === req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    appendAuditLog(db, { newId, actorType: 'admin', action: 'result_deleted', targetId: result.id, questionKey: result.questionKey, before: resultAuditSnapshot(result), reason: req.body?.reason });
    db.results = db.results.filter(row => row.id !== req.params.id); await writeDB(db); res.json({ ok: true });
  });

  app.patch('/api/results/:id', requireAdmin, async (req, res) => {
    const db = readDB(); const result = db.results.find(row => row.id === req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    const before = resultAuditSnapshot(result);
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
    const after = resultAuditSnapshot(result);
    if (JSON.stringify(before) !== JSON.stringify(after)) appendAuditLog(db, { newId, actorType: 'admin', action: 'result_updated', targetId: result.id, questionKey: result.questionKey, before, after, reason: req.body.reason });
    await writeDB(db); res.json({ ok: true, published: result.published });
  });

  app.post('/api/sets/:key/publish', requireAdmin, async (req, res) => {
    const db = readDB(); let count = 0;
    db.results.forEach(row => { if (row.questionKey === req.params.key) { row.published = true; count++; } });
    appendAuditLog(db, { newId, actorType: 'admin', action: 'set_results_published', targetType: 'exam_set', targetId: req.params.key, questionKey: req.params.key, after: { publishedCount: count }, reason: req.body?.reason });
    await writeDB(db); res.json({ ok: true, count });
  });
  app.get('/api/audit-logs', requireAdmin, (req, res) => {
    let rows = [...readDB().auditLogs];
    if (req.query.resultId) rows = rows.filter(row => row.targetId === req.query.resultId);
    if (req.query.setKey) rows = rows.filter(row => row.questionKey === req.query.setKey);
    res.json(rows.sort((a, b) => new Date(b.eventAt) - new Date(a.eventAt)).slice(0, 500));
  });
}
module.exports = { registerAdminResultRoutes };
