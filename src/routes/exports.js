const { buildExamPdf } = require('../exam-pdf');

function sameGradebookCourse(left, right) {
  return String(left.courseName || left.title || '').trim() === String(right.courseName || right.title || '').trim() && String(left.academicYear || '') === String(right.academicYear || '') && String(left.semester || '') === String(right.semester || '') && String(left.teacherId || '') === String(right.teacherId || '');
}

function gradebookContext(db, setKey, teacherId) {
  const anchor = db.sets.find(set => set.key === setKey && (teacherId === undefined || set.teacherId === teacherId));
  if (!anchor) return null;
  const sets = db.sets.filter(set => sameGradebookCourse(set, anchor) && (teacherId === undefined || set.teacherId === teacherId));
  const keys = new Set(sets.map(set => set.key));
  const results = db.results.filter(result => keys.has(result.questionKey) && ['กลางภาค', 'ปลายภาค'].includes(result.examType));
  return { anchor, sets, results, ready: results.length > 0 };
}

function gradebookOptions(db, teacherId) {
  return db.sets.filter(set => teacherId === undefined || set.teacherId === teacherId).filter(set => gradebookContext(db, set.key, teacherId)?.ready).map(set => set.key);
}

function registerExportRoutes(app, { readDB, requireAdmin, requireTeacher, buildResultsWorkbook, buildGradebookWorkbook }) {
  const filter = (rows, query) => rows.filter(row => !query.setKey || row.questionKey === query.setKey).filter(row => !query.examType || row.examType === query.examType).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const send = (res, rows, filename) => { res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(buildResultsWorkbook(rows)); };
  const examPdfFilename = set => {
    const name = String(set?.courseName || set?.title || 'exam-paper')
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
    return `${name || 'exam-paper'}.pdf`;
  };
  app.get('/api/export/results.xlsx', requireAdmin, (req, res) => send(res, filter(readDB().results, req.query), 'ผลสอบ.xlsx'));
  app.get('/api/teacher/export/results.xlsx', requireTeacher, (req, res) => { const db = readDB(); const keys = new Set(db.sets.filter(set => set.teacherId === req.teacherId).map(set => set.key)); send(res, filter(db.results.filter(row => keys.has(row.questionKey)), req.query), 'ผลสอบของฉัน.xlsx'); });
  app.get('/api/gradebook/options', requireAdmin, (req, res) => res.json({ setKeys: gradebookOptions(readDB()) }));
  app.get('/api/teacher/gradebook/options', requireTeacher, (req, res) => res.json({ setKeys: gradebookOptions(readDB(), req.teacherId) }));
  const sendGradebook = (req, res, teacherId) => {
    const db = readDB(); const context = gradebookContext(db, String(req.query.setKey || ''), teacherId);
    if (!context) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรายวิชา' });
    if (!context.ready) return res.status(409).json({ error: 'gradebook_not_ready', message: 'ต้องมีผลสอบกลางภาคหรือปลายภาคอย่างน้อยหนึ่งรายการก่อนส่งออกรวมคะแนน' });
    const courseName = context.anchor.courseName || context.anchor.title || 'รวมคะแนน';
    const buffer = buildGradebookWorkbook({ results: context.results, students: db.students, courseName });
    res.setHeader('Content-Disposition', `attachment; filename="gradebook.xlsx"; filename*=UTF-8''${encodeURIComponent(`รวมคะแนน-${courseName}.xlsx`)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  };
  app.get('/api/export/gradebook.xlsx', requireAdmin, (req, res) => sendGradebook(req, res));
  app.get('/api/teacher/export/gradebook.xlsx', requireTeacher, (req, res) => sendGradebook(req, res, req.teacherId));
  const sendExamPdf = (res, set) => {
    if (!set) return res.status(404).json({ error: 'not_found', message: 'ไม่พบชุดข้อสอบ' });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = examPdfFilename(set);
    res.setHeader('Content-Disposition', `attachment; filename="exam-paper.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    const pdf = buildExamPdf(set);
    pdf.pipe(res);
    pdf.end();
  };
  app.get('/api/export/exam.pdf', requireAdmin, (req, res) => sendExamPdf(res, readDB().sets.find(set => set.key === req.query.setKey)));
  app.get('/api/teacher/export/exam.pdf', requireTeacher, (req, res) => {
    const set = readDB().sets.find(item => item.key === req.query.setKey && item.teacherId === req.teacherId);
    sendExamPdf(res, set);
  });
}
module.exports = { registerExportRoutes, sameGradebookCourse, gradebookContext, gradebookOptions };
