const { activeResitAccess, resitScore } = require('../resit');
function registerSubmissionRoutes(app, { readDB, writeDB, newId, gradeMC, gradeMatching, gradeWritten, getExamSchedule, hasExamAccess, isPastDeadline, isBeforeStart, round2, requireStudent, applyAcademicPeriod }) {
  app.post('/api/results', requireStudent, async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.questionKey) return res.status(400).json({ error: 'invalid_payload', message: 'ข้อมูลผลสอบไม่ครบ' });
    const db = readDB();
    const student = db.students.find(item => item.studentId === req.studentId);
    if (!student) return res.status(401).json({ error: 'unauthorized' });
    const set = db.sets.find(item => item.key === payload.questionKey);
    if (!set) return res.status(404).json({ error: 'not_found', message: 'ไม่พบชุดข้อสอบนี้ในระบบ' });
    applyAcademicPeriod(set, db.settings);
    const resit = payload.resitAccessId ? activeResitAccess(set, student.studentId, payload.resitAccessId) : null;
    if (!resit && isBeforeStart(set, student.classRoom)) return res.status(403).json({ error: 'not_started', message: 'ยังไม่ถึงเวลาเริ่มสอบ' });
    if (!resit && !hasExamAccess(set, student.classRoom)) return res.status(403).json({ error: 'forbidden', message: 'ไม่มีสิทธิ์เข้าสอบชุดนี้' });
    if (payload.resitAccessId && !resit) return res.status(403).json({ error: 'resit_unavailable', message: 'สิทธิ์สอบซ่อมหมดอายุหรือถูกใช้ไปแล้ว' });
    if (db.results.some(item => item.studentId === student.studentId && item.questionKey === payload.questionKey && (resit ? item.resitAccessId === resit.id : item.attemptType !== 'resit'))) return res.status(409).json({ error: 'already_submitted', message: 'ทำข้อสอบชุดนี้ไปแล้ว' });
    const schedule=getExamSchedule(set, student.classRoom);
    if (!resit && isPastDeadline(set, student.classRoom) && (!schedule?.lateAccessCode || payload.lateCode !== schedule.lateAccessCode)) return res.status(403).json({ error: 'deadline_passed', message: 'หมดเวลาสอบแล้ว' });
    const answers = payload.answers || {};
    if (!payload.autoSubmit) {
      const incomplete = (set.sections.mc.questions || []).some(q => answers.mc?.[q.id] == null) || (set.sections.matching.left || []).some(q => !answers.matching?.[q.id]) || (set.sections.written.questions || []).some(q => !String(answers.written?.[q.id] || '').trim());
      if (incomplete) return res.status(400).json({ error: 'incomplete', message: 'ตอบคำถามยังไม่ครบทุกข้อ' });
    }
    const mc = gradeMC(set.sections.mc, answers.mc);
    const matching = gradeMatching(set.sections.matching, answers.matching);
    const written = gradeWritten(set.sections.written, answers.written);
    const integrityEvents = Array.isArray(payload.integrityEvents) ? payload.integrityEvents.filter(event => ['tab_switch','fullscreen_exit','right_click','copy','reload'].includes(event?.type) && !Number.isNaN(Date.parse(event.at))).slice(-50) : [];
    const record = {
      id: newId('result'), studentId: student.studentId, studentName: `${student.firstName} ${student.lastName}`, classRoom: student.classRoom || '',
      questionKey: payload.questionKey, questionTitle: set.title, examType: set.examType || '', subjectTeacherName: set.subjectTeacherName || '', subjectTeacherEmail: set.subjectTeacherEmail || '',
      academicYear: set.academicYear || null, semester: set.semester || null, semesterLabel: set.semesterLabel || null,
      overallScore20: round2(mc + matching + written.total), sectionScores: { mc, matching, written: written.total }, attemptType: resit ? 'resit' : 'normal', resitAccessId: resit?.id || null, sourceResultId: resit?.sourceResultId || null, resitScoreMax: resit?.scoreMax || null,
      tabSwitches: payload.tabSwitches || 0, fullscreenExitAttempts: payload.fullscreenExitAttempts || 0, reloadCount: payload.reloadCount || 0, rightClickAttempts: payload.rightClickAttempts || 0, copyAttempts: payload.copyAttempts || 0,
      integrityEvents, published: set.publishMode === 'auto', detail: { answers, writtenPerQuestion: written.perQuestion }, submittedAt: new Date().toISOString()
    };
    db.results.push(record);
    // A completed attempt makes every in-progress copy of this attempt obsolete.
    // Remove the server draft here (not only in the browser) so another device
    // cannot remain locked or restore an exam that has already been submitted.
    db.drafts = (db.drafts || []).filter(draft => !(
      draft.studentId === student.studentId &&
      draft.questionKey === payload.questionKey &&
      (resit ? draft.resitAccessId === resit.id : !draft.resitAccessId)
    ));
    if (resit) { record.convertedScore = resitScore(record.overallScore20, resit.scoreMax); resit.usedResultId = record.id; resit.usedAt = record.submittedAt; }
    await writeDB(db);
    res.status(201).json({ id: record.id, message: 'บันทึกคำตอบเรียบร้อยแล้ว' });
  });
}

module.exports = { registerSubmissionRoutes };
