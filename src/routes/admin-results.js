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
    await writeDB(db); res.json({ ok: true, published: result.published });
  });

  app.post('/api/sets/:key/publish', requireAdmin, async (req, res) => {
    const db = readDB(); let count = 0;
    db.results.forEach(row => { if (row.questionKey === req.params.key) { row.published = true; count++; } });
    await writeDB(db); res.json({ ok: true, count });
  });
}
module.exports = { registerAdminResultRoutes };
