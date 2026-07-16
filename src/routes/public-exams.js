function registerPublicExamRoutes(app, { readDB, examTypes, sanitizeSetForStudent, getExamSchedule, hasExamAccess, isPastDeadline, isBeforeStart, requireStudent }) {
  app.get('/api/exam-types', (req, res) => res.json(examTypes));

  app.get('/api/sets', requireStudent, (req, res) => {
    const db = readDB();
    const student = db.students.find(item => item.studentId === req.studentId);
    if (!student) return res.status(401).json({ error: 'unauthorized' });
    const sets = db.sets
      .filter(set => !set.delivery && hasExamAccess(set, student.classRoom) && !isBeforeStart(set, student.classRoom))
      .map(set => sanitizeSetForStudent(set, student.classRoom));
    res.json(sets);
  });

  app.post('/api/sets/:key/verify-late-code', requireStudent, (req, res) => {
    const db = readDB();
    const student = db.students.find(item => item.studentId === req.studentId);
    const set = db.sets.find(item => item.key === req.params.key);
    if (!set) return res.status(404).json({ ok: false });
    if (!student || set.delivery || !hasExamAccess(set, student.classRoom)) return res.status(403).json({ ok: false });
    if (!isPastDeadline(set, student.classRoom)) return res.json({ ok: true });
    const schedule=getExamSchedule(set, student.classRoom);
    res.json({ ok: !!schedule?.lateAccessCode && (req.body && req.body.code || '') === schedule.lateAccessCode });
  });
}

module.exports = { registerPublicExamRoutes };
