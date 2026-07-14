const path = require('path');

function registerPages(app, publicDir, express) {
  app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
  app.get('/teacher', (req, res) => res.sendFile(path.join(publicDir, 'teacher.html')));
  app.get('/object-analysis-design', (req, res) => res.sendFile(path.join(publicDir, 'object-analysis-design.html')));
  app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'student.html')));
  app.use(express.static(publicDir));
}

function registerFallback(app, publicDir) {
  app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'student.html')));
}

module.exports = { registerPages, registerFallback };
