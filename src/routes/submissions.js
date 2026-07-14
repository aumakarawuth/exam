function registerSubmissionRoutes(app, { readDB, writeDB, newId, gradeMC, gradeMatching, gradeWritten, isPastDeadline, round2 }) {
  app.post('/api/results', async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.studentId || !payload.questionKey) return res.status(400).json({ error: 'invalid_payload', message: 'ข้อมูลผลสอบไม่ครบ' });
    const db = readDB();
    const set = db.sets.find(item => item.key === payload.questionKey);
    if (!set) return res.status(404).json({ error: 'not_found', message: 'ไม่พบชุดข้อสอบนี้ในระบบ' });
    if (db.results.some(item => item.studentId === payload.studentId && item.questionKey === payload.questionKey)) return res.status(409).json({ error: 'already_submitted', message: 'ทำข้อสอบชุดนี้ไปแล้ว' });
    if (isPastDeadline(set) && (!set.lateAccessCode || payload.lateCode !== set.lateAccessCode)) return res.status(403).json({ error: 'deadline_passed', message: 'หมดเวลาสอบแล้ว' });
    const answers = payload.answers || {};
    if (!payload.autoSubmit) {
      const incomplete = (set.sections.mc.questions || []).some(q => answers.mc?.[q.id] == null) || (set.sections.matching.left || []).some(q => !answers.matching?.[q.id]) || (set.sections.written.questions || []).some(q => !String(answers.written?.[q.id] || '').trim());
      if (incomplete) return res.status(400).json({ error: 'incomplete', message: 'ตอบคำถามยังไม่ครบทุกข้อ' });
    }
    const mc = gradeMC(set.sections.mc, answers.mc); const matching = gradeMatching(set.sections.matching, answers.matching); const written = gradeWritten(set.sections.written, answers.written);
    const record = { id: newId('result'), studentId: payload.studentId, studentName: payload.studentName, classRoom: payload.classRoom || '', questionKey: payload.questionKey, questionTitle: set.title, examType: set.examType || '', subjectTeacherName: set.subjectTeacherName || '', subjectTeacherEmail: set.subjectTeacherEmail || '', overallScore20: round2(mc + matching + written.total), sectionScores: { mc, matching, written: written.total }, tabSwitches: payload.tabSwitches || 0, reloadCount: payload.reloadCount || 0, rightClickAttempts: payload.rightClickAttempts || 0, copyAttempts: payload.copyAttempts || 0, published: set.publishMode === 'auto', detail: { answers, writtenPerQuestion: written.perQuestion }, submittedAt: new Date().toISOString() };
    db.results.push(record); await writeDB(db); res.status(201).json({ id: record.id, message: 'บันทึกคำตอบเรียบร้อยแล้ว' });
  });
}
module.exports = { registerSubmissionRoutes };
