const path = require('path');

function registerPages(app, publicDir, express) {
  app.get('/service-worker.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(publicDir, 'service-worker.js'));
  });
  app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
  app.get('/teacher', (req, res) => res.sendFile(path.join(publicDir, 'teacher.html')));
  app.get('/object-analysis-design', (req, res) => res.sendFile(path.join(publicDir, 'object-analysis-design.html')));
  app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'student.html')));
  app.use(express.static(publicDir));
}

function registerFallback(app, publicDir) {
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
  });
  app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'student.html')));
}

function registerErrorHandler(app) {
  app.use((error, req, res, next) => {
    console.error(`${req.method} ${req.originalUrl} failed.`, error);
    if (res.headersSent) return next(error);
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
    res.status(status).json({
      error: status === 500 ? 'internal_server_error' : 'request_failed',
      message: status === 500 ? 'เกิดข้อผิดพลาดภายในระบบ' : error.message
    });
  });
}

module.exports = { registerPages, registerFallback, registerErrorHandler };
