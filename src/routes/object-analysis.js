const OBJECT_ANALYSIS_SET_KEY = 'object_analysis_design_dfd';

function objectAnalysisSet(now = new Date().toISOString()) {
  return {
    key: OBJECT_ANALYSIS_SET_KEY, title: 'การวิเคราะห์และออกแบบเชิงวัตถุ: Data Flow Diagram', courseName: 'การวิเคราะห์และออกแบบเชิงวัตถุ',
    tagline: 'DFD Drawing Examination', desc: 'ข้อสอบวาด Data Flow Diagram', examType: 'ปลายภาค', assignedClasses: [], publishMode: 'manual', delivery: 'object-analysis-design',
    sections: { mc: { title: '', desc: '', questions: [] }, matching: { title: '', desc: '', left: [], right: [], correctMap: {}, pointsEach: 0 }, written: { title: '', desc: '', questions: [] } },
    createdAt: now, updatedAt: now
  };
}

function ensureObjectAnalysisSet(db) {
  if (!db.sets.some(set => set.key === OBJECT_ANALYSIS_SET_KEY)) db.sets.push(objectAnalysisSet());
  return db.sets.find(set => set.key === OBJECT_ANALYSIS_SET_KEY);
}

function registerObjectAnalysisRoutes(app, { readDB, writeDB, newId, isPastDeadline, isBeforeStart, requireStudent }) {
  app.get('/api/object-analysis/access', requireStudent, async (req, res) => {
    const db = readDB();
    const student = db.students.find(item => item.studentId === req.studentId);
    const hadSet = db.sets.some(item => item.key === OBJECT_ANALYSIS_SET_KEY);
    const set = ensureObjectAnalysisSet(db);
    if (!hadSet) await writeDB(db);
    if (!student) return res.status(404).json({ error: 'not_found' });
    if (isBeforeStart(set)) return res.status(403).json({ error: 'not_started', message: 'ยังไม่ถึงเวลาเริ่มสอบ' });
    if (set.assignedClasses.length && !set.assignedClasses.includes(student.classRoom)) return res.status(403).json({ error: 'forbidden', message: 'ไม่มีสิทธิ์เข้าสอบชุดนี้' });
    if (db.results.some(row => row.studentId === student.studentId && row.questionKey === set.key)) return res.status(409).json({ error: 'already_submitted', message: 'ส่งข้อสอบวิชานี้แล้ว' });
    res.json({ ok: true });
  });

  app.post('/api/object-analysis-results', requireStudent, async (req, res) => {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.levels)) return res.status(400).json({ error: 'invalid_payload', message: 'ข้อมูลการส่งข้อสอบไม่ครบ' });
    const db = readDB();
    const student = db.students.find(item => item.studentId === req.studentId);
    if (!student) return res.status(401).json({ error: 'unauthorized' });
    const set = ensureObjectAnalysisSet(db);
    if (isBeforeStart(set)) return res.status(403).json({ error: 'not_started', message: 'ยังไม่ถึงเวลาเริ่มสอบ' });
    if (set.assignedClasses.length && !set.assignedClasses.includes(student.classRoom)) return res.status(403).json({ error: 'forbidden', message: 'ไม่มีสิทธิ์เข้าสอบชุดนี้' });
    if (db.results.some(row => row.studentId === student.studentId && row.questionKey === set.key)) return res.status(409).json({ error: 'already_submitted', message: 'ส่งข้อสอบวิชานี้แล้ว' });
    if (isPastDeadline(set) && (!set.lateAccessCode || payload.lateCode !== set.lateAccessCode)) return res.status(403).json({ error: 'deadline_passed', message: 'หมดเวลาสอบแล้ว' });
    const levelScores = [0, 1, 2].map(level => {
      const score = Number(payload.levels.find(item => Number(item.level) === level)?.score);
      return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
    });
    const rawScore = levelScores.reduce((sum, score) => sum + score, 0);
    const overallScore20 = Math.round((rawScore / 300 * 20 + Number.EPSILON) * 100) / 100;
    const record = {
      id: newId('result'), studentId: student.studentId, studentName: `${student.firstName} ${student.lastName}`, classRoom: student.classRoom || '',
      questionKey: set.key, questionTitle: set.title, examType: set.examType, subjectTeacherName: set.subjectTeacherName || '', subjectTeacherEmail: set.subjectTeacherEmail || '',
      overallScore20, sectionScores: { mc: levelScores[0], matching: levelScores[1], written: levelScores[2] }, published: false,
      tabSwitches: payload.tabSwitches || 0, fullscreenExitAttempts: payload.fullscreenExitAttempts || 0, reloadCount: payload.reloadCount || 0, rightClickAttempts: 0, copyAttempts: 0,
      integrityEvents: Array.isArray(payload.integrityEvents) ? payload.integrityEvents.filter(event => ['tab_switch','fullscreen_exit','reload'].includes(event?.type) && !Number.isNaN(Date.parse(event.at))).slice(-50) : [],
      detail: { type: 'dfd', levels: payload.levels, levelScores, rawScore }, submittedAt: new Date().toISOString()
    };
    db.results.push(record);
    await writeDB(db);
    res.status(201).json({ id: record.id, message: 'บันทึกคำตอบเรียบร้อยแล้ว' });
  });
}

module.exports = { registerObjectAnalysisRoutes, ensureObjectAnalysisSet, OBJECT_ANALYSIS_SET_KEY };
