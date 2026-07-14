function registerPublicExamRoutes(app, { readDB, examTypes, sanitizeSetForStudent, isPastDeadline }) {
  app.get('/api/exam-types', (req, res) => res.json(examTypes));

  app.get('/api/sets', (req, res) => {
    let sets = readDB().sets.map(sanitizeSetForStudent);
    if (req.query.classRoom) {
      sets = sets.filter(set => !set.assignedClasses.length || set.assignedClasses.includes(req.query.classRoom));
    }
    res.json(sets);
  });

  app.post('/api/sets/:key/verify-late-code', (req, res) => {
    const set = readDB().sets.find(item => item.key === req.params.key);
    if (!set) return res.status(404).json({ ok: false });
    if (!isPastDeadline(set)) return res.json({ ok: true });
    res.json({ ok: !!set.lateAccessCode && (req.body && req.body.code || '') === set.lateAccessCode });
  });
}

module.exports = { registerPublicExamRoutes };
