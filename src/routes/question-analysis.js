function registerQuestionAnalysisRoutes(app, { readDB, requireAdmin, requireTeacher, buildQuestionAnalysis, buildQuestionAnalysisWorkbook }) {
  const sendJson = (req, res, allowedKeys) => {
    const set = readDB().sets.find(item => item.key === req.query.setKey && allowedKeys.has(item.key));
    if (!set) return res.status(404).json({ error: 'not_found', message: 'ไม่พบชุดข้อสอบ หรือไม่มีสิทธิ์เข้าถึง' });
    res.json(buildQuestionAnalysis(set, readDB().results.filter(row => row.questionKey === set.key)));
  };
  const sendWorkbook = (req, res, allowedKeys) => {
    const db = readDB(); const set = db.sets.find(item => item.key === req.query.setKey && allowedKeys.has(item.key));
    if (!set) return res.status(404).json({ error: 'not_found', message: 'ไม่พบชุดข้อสอบ หรือไม่มีสิทธิ์เข้าถึง' });
    const file = buildQuestionAnalysisWorkbook(buildQuestionAnalysis(set, db.results.filter(row => row.questionKey === set.key)));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="question-analysis.xlsx"');
    res.send(file);
  };
  app.get('/api/question-analysis', requireAdmin, (req, res) => sendJson(req, res, new Set(readDB().sets.map(set => set.key))));
  app.get('/api/export/question-analysis.xlsx', requireAdmin, (req, res) => sendWorkbook(req, res, new Set(readDB().sets.map(set => set.key))));
  app.get('/api/teacher/question-analysis', requireTeacher, (req, res) => { const db = readDB(); sendJson(req, res, new Set(db.sets.filter(set => set.teacherId === req.teacherId).map(set => set.key))); });
  app.get('/api/teacher/export/question-analysis.xlsx', requireTeacher, (req, res) => { const db = readDB(); sendWorkbook(req, res, new Set(db.sets.filter(set => set.teacherId === req.teacherId).map(set => set.key))); });
}
module.exports = { registerQuestionAnalysisRoutes };
