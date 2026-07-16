function registerResitRoutes(app, { readDB, writeDB, requireTeacher, newId }) {
  app.post('/api/teacher/results/:id/resit', requireTeacher, async (req, res) => {
    const db = readDB(); const original = db.results.find(row => row.id === req.params.id);
    const set = original && db.sets.find(item => item.key === original.questionKey && item.teacherId === req.teacherId);
    if (!original || !set || original.attemptType === 'resit') return res.status(404).json({ error: 'not_found' });
    const availableFrom = new Date(req.body?.availableFrom); const availableUntil = new Date(req.body?.availableUntil);
    const scoreMax = Number(req.body?.scoreMax);
    if (Number.isNaN(availableFrom.getTime()) || Number.isNaN(availableUntil.getTime()) || availableFrom >= availableUntil || !Number.isFinite(scoreMax) || scoreMax <= 0 || scoreMax > 100) return res.status(400).json({ error: 'invalid_payload', message: 'วันเวลา หรือคะแนนเต็มหลังแปลงไม่ถูกต้อง' });
    if ((set.resitAccesses || []).some(access => access.sourceResultId === original.id && !access.usedResultId && access.status === 'approved')) return res.status(409).json({ error: 'already_open', message: 'นักเรียนคนนี้มีสิทธิ์สอบซ่อมที่ยังใช้งานอยู่แล้ว' });
    const access = { id: newId('resit'), studentId: original.studentId, sourceResultId: original.id, availableFrom: availableFrom.toISOString(), availableUntil: availableUntil.toISOString(), scoreMax, status: 'approved', approvedByTeacherId: req.teacherId, approvedAt: new Date().toISOString() };
    set.resitAccesses = [...(set.resitAccesses || []), access]; await writeDB(db); res.status(201).json({ ok: true, access });
  });
}
module.exports = { registerResitRoutes };
