function registerExportRoutes(app, { readDB, requireAdmin, requireTeacher, buildResultsWorkbook }) {
  const filter = (rows, query) => rows.filter(row => !query.setKey || row.questionKey === query.setKey).filter(row => !query.examType || row.examType === query.examType).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const send = (res, rows, filename) => { res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(buildResultsWorkbook(rows)); };
  app.get('/api/export/results.xlsx', requireAdmin, (req, res) => send(res, filter(readDB().results, req.query), 'ผลสอบ.xlsx'));
  app.get('/api/teacher/export/results.xlsx', requireTeacher, (req, res) => { const db = readDB(); const keys = new Set(db.sets.filter(set => set.teacherId === req.teacherId).map(set => set.key)); send(res, filter(db.results.filter(row => keys.has(row.questionKey)), req.query), 'ผลสอบของฉัน.xlsx'); });
}
module.exports = { registerExportRoutes };
