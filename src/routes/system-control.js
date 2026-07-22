function isStudentExamRequest(req) {
  const path = req.path;
  if (path === '/api/exam-types') return true;
  if (path === '/api/sets' && req.method === 'GET') return true;
  if (/^\/api\/sets\/[^/]+\/verify-late-code$/.test(path)) return true;
  if (path === '/api/results' && req.method === 'POST') return true;
  if (path.startsWith('/api/exam-drafts/')) return true;
  if (path.startsWith('/api/student/')) return true;
  if (path.startsWith('/api/object-analysis')) return true;
  if (/^\/api\/students\/[^/]+(?:\/results)?$/.test(path) && req.method === 'GET') return true;
  return /^\/api\/students\/[^/]+\/(?:set-pin|verify-pin|recover-pin)$/.test(path);
}

function registerSystemControlRoutes(app, { readDB, mutateDB, requireAdmin }) {
  app.get('/api/system/exam-access', (req, res) => {
    const settings = readDB().settings || {};
    res.json({ closed: Boolean(settings.examSystemClosed), message: settings.examSystemClosedMessage || '' });
  });

  app.put('/api/admin/system/exam-access', requireAdmin, async (req, res) => {
    const closed = req.body?.closed === true;
    const message = String(req.body?.message || '').trim().slice(0, 300);
    await mutateDB(db => {
      db.settings = { ...(db.settings || {}), examSystemClosed: closed, examSystemClosedMessage: message };
    });
    res.json({ ok: true, closed, message });
  });

  app.use((req, res, next) => {
    if (!isStudentExamRequest(req) || !readDB().settings?.examSystemClosed) return next();
    res.locals ||= {};
    res.locals.runtimeMetricCategory = 'controlled_rejection';
    res.locals.runtimeMetricReason = 'exam_system_closed';
    return res.status(503).json({
      error: 'exam_system_closed',
      message: readDB().settings.examSystemClosedMessage || 'ระบบสอบปิดให้บริการชั่วคราว กรุณารอประกาศจากอาจารย์ผู้สอน'
    });
  });
}

module.exports = { registerSystemControlRoutes, isStudentExamRequest };
