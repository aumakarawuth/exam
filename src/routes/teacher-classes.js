function registerTeacherClassRoutes(app, { readDB, requireTeacher }) {
  app.get('/api/teacher/classes', requireTeacher, (req, res) => {
    const classes = [...new Set(readDB().students.map(student => student.classRoom))].sort();
    res.json(classes);
  });
}

module.exports = { registerTeacherClassRoutes };
