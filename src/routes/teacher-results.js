const { appendAuditLog, resultAuditSnapshot } = require('../audit-log');

function registerTeacherResultRoutes(app, { readDB, writeDB, requireTeacher, newId }) {
  const changeReason = req => String(req.body?.reason || '').trim();
  const ownedResult = (db, teacherId, resultId) => {
    const result = db.results.find(row => row.id === resultId);
    return result && db.sets.some(set => set.key === result.questionKey && set.teacherId === teacherId) ? result : null;
  };
  app.get('/api/teacher/results', requireTeacher, (req, res) => {
    const db = readDB(); const keys = new Set(db.sets.filter(set => set.teacherId === req.teacherId).map(set => set.key));
    let rows = db.results.filter(row => keys.has(row.questionKey));
    if (req.query.setKey) rows = rows.filter(row => row.questionKey === req.query.setKey);
    if (req.query.examType) rows = rows.filter(row => row.examType === req.query.examType);
    if (req.query.academicYear) rows = rows.filter(row => row.academicYear === req.query.academicYear);
    if (req.query.semester) rows = rows.filter(row => row.semester === req.query.semester);
    res.json(rows.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
  });
  app.patch('/api/teacher/results/:id', requireTeacher, async (req, res) => {
    const db = readDB(); const result = ownedResult(db, req.teacherId, req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    if ((Array.isArray(req.body.dfdLevelScores) || (req.body.writtenManualScores && typeof req.body.writtenManualScores === 'object')) && !changeReason(req)) return res.status(400).json({ error: 'reason_required', message: 'กรุณาระบุเหตุผลในการแก้คะแนน' });
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
      const writtenQuestions = set.sections?.written?.questions || [];
      if (!writtenQuestions.length) return res.status(400).json({ error: 'no_written_questions', message: 'ข้อสอบชุดนี้ไม่มีข้ออัตนัย' });
      const scores = {};
      for (const question of writtenQuestions) {
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
    if (JSON.stringify(before) !== JSON.stringify(after)) appendAuditLog(db, { newId, actorType: 'teacher', actorId: req.teacherId, action: 'result_updated', targetId: result.id, questionKey: result.questionKey, before, after, reason: req.body.reason });
    await writeDB(db); res.json({ ok: true, published: result.published });
  });
  app.post('/api/teacher/sets/:key/publish', requireTeacher, async (req, res) => {
    const db = readDB(); if (!db.sets.some(set => set.key === req.params.key && set.teacherId === req.teacherId)) return res.status(404).json({ error: 'not_found' });
    let count = 0; db.results.forEach(row => { if (row.questionKey === req.params.key) { row.published = true; count++; } });
    appendAuditLog(db, { newId, actorType: 'teacher', actorId: req.teacherId, action: 'set_results_published', targetType: 'exam_set', targetId: req.params.key, questionKey: req.params.key, after: { publishedCount: count }, reason: req.body?.reason });
    await writeDB(db); res.json({ ok: true, count });
  });
  app.delete('/api/teacher/results/:id', requireTeacher, async (req, res) => {
    if (!changeReason(req)) return res.status(400).json({ error: 'reason_required', message: 'กรุณาระบุเหตุผลในการลบผลสอบ' });
    const db = readDB(); const result = ownedResult(db, req.teacherId, req.params.id); if (!result) return res.status(404).json({ error: 'not_found' });
    appendAuditLog(db, { newId, actorType: 'teacher', actorId: req.teacherId, action: 'result_deleted', targetId: result.id, questionKey: result.questionKey, before: resultAuditSnapshot(result), reason: req.body?.reason });
    db.results = db.results.filter(row => row.id !== req.params.id); await writeDB(db); res.json({ ok: true });
  });
  app.get('/api/teacher/audit-logs', requireTeacher, (req, res) => {
    const db = readDB(); const keys = new Set(db.sets.filter(set => set.teacherId === req.teacherId).map(set => set.key));
    let rows = db.auditLogs.filter(row => keys.has(row.questionKey));
    if (req.query.resultId) rows = rows.filter(row => row.targetId === req.query.resultId);
    if (req.query.setKey) rows = rows.filter(row => row.questionKey === req.query.setKey);
    res.json(rows.sort((a, b) => new Date(b.eventAt) - new Date(a.eventAt)).slice(0, 500));
  });
}
module.exports = { registerTeacherResultRoutes };
