function registerTeacherClassRoutes(app, { readDB, requireTeacher }) {
  app.get('/api/teacher/classes', requireTeacher, (req, res) => {
    const period=String(req.query.period||''); const classes = [...new Set(readDB().students.filter(student=>!period||(period==='unset'?!student.examPeriod:student.examPeriod===period)).map(student => student.classRoom))].sort();
    res.json(classes);
  });
}

module.exports = { registerTeacherClassRoutes };
