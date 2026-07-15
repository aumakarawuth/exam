function registerPublicExamRoutes(app, { readDB, examTypes, sanitizeSetForStudent, isPastDeadline, isBeforeStart, requireStudent }) {
  app.get('/api/exam-types', (req, res) => res.json(examTypes));

  app.get('/api/sets', requireStudent, (req, res) => {
    const db = readDB();
    const student = db.students.find(item => item.studentId === req.studentId);
    if (!student) return res.status(401).json({ error: 'unauthorized' });
    const sets = db.sets
      .filter(set => !set.delivery && !isBeforeStart(set) && (!set.assignedClasses.length || set.assignedClasses.includes(student.classRoom)))
      .map(sanitizeSetForStudent);
    res.json(sets);
  });

  app.post('/api/sets/:key/verify-late-code', requireStudent, (req, res) => {
    const db = readDB();
    const student = db.students.find(item => item.studentId === req.studentId);
    const set = db.sets.find(item => item.key === req.params.key);
    if (!set) return res.status(404).json({ ok: false });
    if (!student || set.delivery || (set.assignedClasses.length && !set.assignedClasses.includes(student.classRoom))) return res.status(403).json({ ok: false });
    if (!isPastDeadline(set)) return res.json({ ok: true });
    res.json({ ok: !!set.lateAccessCode && (req.body && req.body.code || '') === set.lateAccessCode });
  });
}

module.exports = { registerPublicExamRoutes };
