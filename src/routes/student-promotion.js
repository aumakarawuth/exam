const { enrollmentFor, setEnrollment } = require('../student-enrollments');

function registerStudentPromotionRoutes(app, { readDB, writeDB, requireAdmin }) {
  const rowsForYear = (db, academicYear) => db.students.map(student => ({ student, enrollment: enrollmentFor(student, academicYear) })).filter(item => item.enrollment);
  const roomRank = room => /\.\s*\d+\s*\//.test(String(room || '')) ? 0 : 1;
  const byRoom = (a, b) => roomRank(a.classRoom) - roomRank(b.classRoom) || String(a.classRoom).localeCompare(String(b.classRoom), 'th', { numeric: true });

  app.get('/api/admin/enrollment-years', requireAdmin, (req, res) => {
    const years = [...new Set(readDB().students.flatMap(student => (student.enrollments || []).map(item => item.academicYear)))].sort();
    res.json(years);
  });

  app.get('/api/admin/enrollment-rooms', requireAdmin, (req, res) => {
    const academicYear = String(req.query.academicYear || '').trim();
    if (!academicYear) return res.status(400).json({ error: 'invalid_payload', message: 'กรุณาระบุปีการศึกษา' });
    const rooms = new Map();
    rowsForYear(readDB(), academicYear).forEach(({ enrollment }) => rooms.set(enrollment.classRoom, (rooms.get(enrollment.classRoom) || 0) + 1));
    res.json([...rooms.entries()].map(([classRoom, count]) => ({ classRoom, count })).sort(byRoom));
  });

  const evaluatePromotion = (db, body) => {
    const sourceYear = String(body?.sourceYear || '').trim();
    const targetYear = String(body?.targetYear || '').trim();
    const mappings = Array.isArray(body?.mappings) ? body.mappings : [];
    if (!sourceYear || !targetYear || sourceYear === targetYear) throw new Error('กรุณาระบุปีการศึกษาเดิมและปีการศึกษาใหม่ให้ถูกต้อง');
    const map = new Map(mappings.map(item => [String(item?.fromRoom || '').trim(), { toRoom: String(item?.toRoom || '').trim(), examPeriod: String(item?.examPeriod || '').trim() }]).filter(([fromRoom, item]) => fromRoom && item.toRoom));
    if (!map.size) throw new Error('กรุณาจับคู่ห้องอย่างน้อย 1 ห้อง');
    const promoted = []; const skipped = [];
    rowsForYear(db, sourceYear).forEach(({ student, enrollment }) => {
      const mapping = map.get(enrollment.classRoom);
      if (!mapping) return;
      if (enrollmentFor(student, targetYear)) { skipped.push({ studentId: student.studentId, classRoom: enrollment.classRoom, reason: 'มีข้อมูลในปีใหม่แล้ว' }); return; }
      promoted.push({ student, enrollment, mapping });
    });
    return { sourceYear, targetYear, promoted, skipped };
  };

  app.post('/api/admin/student-promotion/preview', requireAdmin, (req, res) => {
    try {
      const result = evaluatePromotion(readDB(), req.body);
      res.json({ sourceYear: result.sourceYear, targetYear: result.targetYear, promoted: result.promoted.length, skipped: result.skipped, byRoom: result.promoted.reduce((rows, item) => { rows[item.enrollment.classRoom] = (rows[item.enrollment.classRoom] || 0) + 1; return rows; }, {}) });
    } catch (error) { res.status(400).json({ error: 'invalid_payload', message: error.message }); }
  });

  app.post('/api/admin/student-promotion', requireAdmin, async (req, res) => {
    const db = readDB();
    try {
      const result = evaluatePromotion(db, req.body);
      result.promoted.forEach(({ student, enrollment, mapping }) => {
        const next = setEnrollment(student, { academicYear: result.targetYear, classRoom: mapping.toRoom, examPeriod: mapping.examPeriod || enrollment.examPeriod, status: 'active' });
        student.classRoom = next.classRoom;
        student.examPeriod = next.examPeriod;
      });
      await writeDB(db);
      res.json({ ok: true, sourceYear: result.sourceYear, targetYear: result.targetYear, promoted: result.promoted.length, skipped: result.skipped });
    } catch (error) { res.status(400).json({ error: 'invalid_payload', message: error.message }); }
  });
}

module.exports = { registerStudentPromotionRoutes };
